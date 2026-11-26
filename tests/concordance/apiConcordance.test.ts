import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

interface RouteDef {
  method: string;
  path: string;
}

interface FrontendCall {
  file: string;
  method: string;
  path: string;
  raw: string;
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsFiles(fullPath, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      acc.push(fullPath);
    }
  }
  return acc;
}

function extractServerRoutes(serverCode: string): RouteDef[] {
  const routes: RouteDef[] = [];
  for (const match of serverCode.matchAll(/app\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)['"]/g)) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
    });
  }
  return routes;
}

function normalizeTemplateUrl(rawTemplate: string): string {
  // Retirer les segments query dynamiques (ex: ?..., ${queryString}, ${qs ? ...})
  let clean = rawTemplate
    .replace(/\$\{(?:queryString|queryStr|query|qs|q)\b.*$/g, '')
    .replace(/\?.*$/, '')
    .replace(/\$\{[^}]+\}/g, ':param');
  if (!clean.startsWith('/api')) {
    clean = `/api${clean}`;
  }
  return clean;
}

function extractFrontendCalls(srcRoot: string): FrontendCall[] {
  const calls: FrontendCall[] = [];
  const files = walkTsFiles(srcRoot);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');

    // Appels apiRequest / secureFetch (gère aussi les backticks imbriqués dans ${qs ? `?${qs}` : ''})
    const reApi = /(?:apiRequest|secureFetch)\(\s*(?:'(\/[^']+)'|"(\/[^"]+)"|`(\/(?:[^`\\$]|\\.|(?:\$\{(?:[^{}]|\{[^}]*\})*\}))*)`)(?:\s*,\s*\{([\s\S]{0,350}?)\})?/g;
    for (const m of content.matchAll(reApi)) {
      const rawUrl = m[1] || m[2] || m[3] || '';
      const opts = m[4] || '';
      const methodMatch = opts.match(/method:\s*['"]([A-Z]+)['"]/);
      const method = methodMatch ? methodMatch[1] : 'GET';
      const normalized = normalizeTemplateUrl(rawUrl);
      calls.push({
        file: path.relative(process.cwd(), file),
        method,
        path: normalized,
        raw: rawUrl,
      });
    }

    // Appels fetch(`${getApiBaseUrl()}/...`)
    const reBase = /fetch\(\s*`\$\{getApiBaseUrl\(\)\}(\/[^`]+)`(?:\s*,\s*\{([\s\S]{0,200}?)\})?/g;
    for (const m of content.matchAll(reBase)) {
      const opts = m[2] || '';
      const methodMatch = opts.match(/method:\s*['"]([A-Z]+)['"]/);
      const method = methodMatch ? methodMatch[1] : 'GET';
      const normalized = normalizeTemplateUrl(m[1]);
      calls.push({
        file: path.relative(process.cwd(), file),
        method,
        path: normalized,
        raw: m[1],
      });
    }
  }

  return calls;
}

function matchesServerRoute(call: FrontendCall, routes: RouteDef[]): boolean {
  const cleanCallPath = call.path.split('?')[0].split('#')[0];
  return routes.some((r) => {
    if (r.method !== call.method) return false;
    if (r.path === '*') return false;
    const regexPattern = `^${r.path.replace(/:[^/]+/g, '[^/]+').replace(/\*/g, '.*')}$`;
    return new RegExp(regexPattern).test(cleanCallPath);
  });
}

describe('Concordance des appels frontend et des routes serveur', () => {
  it('chaque appel API dans src/ correspond à une route Express déclarée dans server.ts', () => {
    const serverCode = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    const serverRoutes = extractServerRoutes(serverCode);
    const frontendCalls = extractFrontendCalls(path.join(process.cwd(), 'src'));

    assert.ok(serverRoutes.length >= 150, `Attendu >= 150 routes serveur, trouvé ${serverRoutes.length}`);
    assert.ok(frontendCalls.length >= 120, `Attendu >= 120 appels frontend, trouvé ${frontendCalls.length}`);

    const mismatches = frontendCalls.filter((c) => !matchesServerRoute(c, serverRoutes));
    assert.deepEqual(
      mismatches,
      [],
      `Appels frontend sans route serveur correspondante :\n${mismatches
        .map((m) => `  ${m.method} ${m.path} (${m.file})`)
        .join('\n')}`
    );
  });

  it('vérifie la concordance des routes critiques avec ou sans préfixe /api dans secureFetch', () => {
    const serverCode = fs.readFileSync(path.join(process.cwd(), 'server.ts'), 'utf8');
    const serverRoutes = extractServerRoutes(serverCode);
    const criticalPairs: FrontendCall[] = [
      { file: 'auth', method: 'GET', path: '/api/auth/csrf', raw: '/auth/csrf' },
      { file: 'auth', method: 'POST', path: '/api/auth/login', raw: '/auth/login' },
      { file: 'auth', method: 'POST', path: '/api/auth/register', raw: '/auth/register' },
      { file: 'boost', method: 'POST', path: '/api/billing/boost-order', raw: '/billing/boost-order' },
      { file: 'boost', method: 'GET', path: '/api/billing/my-boosts', raw: '/billing/my-boosts' },
      { file: 'boost', method: 'GET', path: '/api/billing/admin/boost-requests', raw: '/billing/admin/boost-requests' },
      { file: 'videos', method: 'POST', path: '/api/videos/reports', raw: '/videos/reports' },
      { file: 'trust', method: 'POST', path: '/api/trust/apply', raw: '/trust/apply' },
      { file: 'agency', method: 'POST', path: '/api/agency/collaborators/invite', raw: '/agency/collaborators/invite' },
      { file: 'agency', method: 'GET', path: '/api/agency/transactions', raw: '/agency/transactions' },
    ];
    for (const pair of criticalPairs) {
      assert.equal(
        matchesServerRoute(pair, serverRoutes),
        true,
        `Route critique absente côté serveur : ${pair.method} ${pair.path}`
      );
    }
  });
});
