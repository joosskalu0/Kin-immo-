import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';

const ROOT_DIR = process.cwd();
const BACKUP_EXT = '.testbak';

const TRACKED_STORE_FILES = [
  'users_store.json',
  'auth_sessions_store.json',
  'properties_store.json',
  'invoices_store.json',
  'visibility_options.json',
  'site_settings_store.json',
  'notifications.json',
  'analytics_store.json',
  'hero_slides.json',
  'concierge_requests.json',
  'conciergerie_requests.json',
  'property_visits.json',
  'advertisements.json',
  'pricing_plans.json',
  'payment_methods_store.json',
  'property_videos.json',
  'cloudinary_config.json',
  'agency_collaborators.json',
  'agency_transactions.json',
  'trust_store.json',
  'custom_fields_store.json',
  'favorites_store.json',
  'messages_store.json',
  'crm_leads_store.json',
  'agencies_store.json',
  'agents_store.json',
  'video_reports_store.json',
  'blog_articles_store.json',
  'legal_documents_store.json',
  'property_user_reports.json',
];

export class ApiTestClient {
  public cookies = new Map<string, string>();
  public csrfToken = '';
  public user: any = null;

  constructor(public readonly baseUrl: string) {}

  async initCsrf(): Promise<string> {
    const res = await this.request('/api/auth/csrf');
    if (res.data?.csrfToken) {
      this.csrfToken = String(res.data.csrfToken);
    }
    return this.csrfToken;
  }

  async request(
    reqPath: string,
    opts: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      rawFormData?: FormData;
      skipJsonParse?: boolean;
    } = {}
  ): Promise<{ status: number; headers: Headers; data: any; rawText: string }> {
    const method = (opts.method || 'GET').toUpperCase();
    const headers = new Headers(opts.headers || {});
    if (this.cookies.size > 0) {
      const cookieStr = Array.from(this.cookies.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      headers.set('Cookie', cookieStr);
    }
    if (this.csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      headers.set('x-csrf-token', this.csrfToken);
    }

    let body: any = undefined;
    if (opts.rawFormData) {
      body = opts.rawFormData;
    } else if (opts.body !== undefined) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    }

    const res = await fetch(`${this.baseUrl}${reqPath}`, {
      method,
      headers,
      body,
    });

    const setCookies: string[] =
      typeof (res.headers as any).getSetCookie === 'function'
        ? (res.headers as any).getSetCookie()
        : [];
    for (const sc of setCookies) {
      const [pair] = sc.split(';');
      const eq = pair.indexOf('=');
      if (eq > 0) {
        const k = pair.slice(0, eq).trim();
        const v = pair.slice(eq + 1).trim();
        if (v) {
          this.cookies.set(k, v);
        } else {
          this.cookies.delete(k);
        }
        if (k === 'kinimmo_csrf' && v) {
          this.csrfToken = decodeURIComponent(v);
        }
      }
    }

    const rawText = await res.text();
    let data: any = {};
    if (!opts.skipJsonParse) {
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = {};
      }
    }
    if (data?.csrfToken) {
      this.csrfToken = String(data.csrfToken);
    }
    return { status: res.status, headers: res.headers, data, rawText };
  }

  async login(identifier: string, password: string) {
    await this.initCsrf();
    const res = await this.request('/api/auth/login', {
      method: 'POST',
      body: { identifier, password },
    });
    if (res.data?.user) this.user = res.data.user;
    return res;
  }

  async register(payload: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    role?: string;
    agencyName?: string;
  }) {
    await this.initCsrf();
    const res = await this.request('/api/auth/register', {
      method: 'POST',
      body: {
        ...payload,
        termsAccepted: true,
      },
    });
    if (res.data?.user) this.user = res.data.user;
    return res;
  }
}

export interface IsolatedServerHandle {
  baseUrl: string;
  port: number;
  adminCredentials: { email: string; password: string; id: string };
  stop: () => Promise<void>;
}

function backupStores(): string[] {
  const existingAtStart: string[] = [];
  for (const file of TRACKED_STORE_FILES) {
    const abs = path.join(ROOT_DIR, file);
    const bak = path.join(ROOT_DIR, `${file}${BACKUP_EXT}`);
    if (fs.existsSync(abs)) {
      fs.copyFileSync(abs, bak);
      existingAtStart.push(file);
    }
  }
  return existingAtStart;
}

function restoreStores(existingAtStart: string[]): void {
  for (const file of TRACKED_STORE_FILES) {
    const abs = path.join(ROOT_DIR, file);
    const bak = path.join(ROOT_DIR, `${file}${BACKUP_EXT}`);
    if (existingAtStart.includes(file) && fs.existsSync(bak)) {
      fs.copyFileSync(bak, abs);
      fs.unlinkSync(bak);
    } else if (!existingAtStart.includes(file) && fs.existsSync(abs)) {
      try {
        fs.unlinkSync(abs);
      } catch {}
    }
  }
}

export async function startIsolatedTestServer(options: {
  port?: number;
  loginRateLimit?: number;
  sensitiveRateLimit?: number;
  publicRateLimit?: number;
} = {}): Promise<IsolatedServerHandle> {
  const port = options.port || 3190 + Math.floor(Math.random() * 200);
  const existingAtStart = backupStores();

  const adminId = 'test_admin_suite';
  const adminEmail = 'suite.admin@kinimmo.cd';
  const adminPassword = 'KinimmoSuiteAdmin#2026!';

  // Inject ephemeral test admin in users_store.json before booting server
  const usersPath = path.join(ROOT_DIR, 'users_store.json');
  const currentUsers = fs.existsSync(usersPath)
    ? JSON.parse(fs.readFileSync(usersPath, 'utf8'))
    : [];
  const filtered = currentUsers.filter((u: any) => u.id !== adminId && u.email !== adminEmail);
  filtered.push({
    id: adminId,
    name: 'Admin Suite Kinimmo',
    email: adminEmail,
    phone: '+243819000999',
    role: 'admin',
    passwordHash: bcrypt.hashSync(adminPassword, 8),
    isVerified: true,
    emailVerified: true,
    termsAcceptedVersion: '2026-04-01',
    createdAt: new Date().toISOString(),
  });
  fs.writeFileSync(usersPath, JSON.stringify(filtered, null, 2), 'utf8');

  const tsxBin = path.join(ROOT_DIR, 'node_modules', '.bin', 'tsx');
  const serverProc: ChildProcess = spawn(tsxBin, ['server.ts'], {
    cwd: ROOT_DIR,
    detached: true,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      KINIMMO_LOGIN_RATE_LIMIT: String(options.loginRateLimit ?? 60),
      KINIMMO_AUTH_SENSITIVE_RATE_LIMIT: String(options.sensitiveRateLimit ?? 40),
      KINIMMO_PUBLIC_SUBMISSION_RATE_LIMIT: String(options.publicRateLimit ?? 40),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const killTree = (sig: NodeJS.Signals) => {
    if (serverProc.pid && serverProc.exitCode === null) {
      try {
        process.kill(-serverProc.pid, sig);
      } catch {
        try {
          serverProc.kill(sig);
        } catch {}
      }
    }
  };

  let stopped = false;
  const emergencyExitHandler = () => {
    if (!stopped) {
      killTree('SIGKILL');
      restoreStores(existingAtStart);
    }
  };
  process.once('exit', emergencyExitHandler);

  const baseUrl = `http://127.0.0.1:${port}`;
  let logs = '';
  serverProc.stdout?.on('data', (d) => {
    logs += d.toString();
  });
  serverProc.stderr?.on('data', (d) => {
    logs += d.toString();
  });

  // Poll /api/health until ready
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (serverProc.exitCode !== null) {
      stopped = true;
      process.removeListener('exit', emergencyExitHandler);
      restoreStores(existingAtStart);
      throw new Error(`Test server exited early (${serverProc.exitCode}): ${logs}`);
    }
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }

  if (!ready) {
    stopped = true;
    process.removeListener('exit', emergencyExitHandler);
    killTree('SIGKILL');
    restoreStores(existingAtStart);
    throw new Error(`Test server failed to start on ${baseUrl}: ${logs}`);
  }

  return {
    baseUrl,
    port,
    adminCredentials: { email: adminEmail, password: adminPassword, id: adminId },
    stop: async () => {
      if (stopped) return;
      stopped = true;
      process.removeListener('exit', emergencyExitHandler);
      if (serverProc.exitCode === null) {
        killTree('SIGTERM');
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            killTree('SIGKILL');
            resolve();
          }, 1500);
          serverProc.once('exit', () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
      restoreStores(existingAtStart);
    },
  };
}
