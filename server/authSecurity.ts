import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import type { Request, Response, NextFunction } from 'express';
import {
  TERMS_VERSION,
  isValidEmailAddress,
  normalizeEmailAddress,
  normalizePhoneRdc,
  normalizeAccountRole,
  validatePasswordPolicy,
} from '../src/utils/authValidation';

export const BCRYPT_COST = 12;
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60; // 14 jours
export const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
export const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 heure strictement

export const ACCESS_COOKIE_NAME = 'kinimmo_access';
export const REFRESH_COOKIE_NAME = 'kinimmo_refresh';
export const CSRF_COOKIE_NAME = 'kinimmo_csrf';

// Secret de signature en mémoire si non défini dans process.env
const EPHEMERAL_SIGNING_SECRET = crypto.randomBytes(32).toString('hex');

function getJwtSecret(): string {
  return process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || EPHEMERAL_SIGNING_SECRET;
}

export interface StoredAccountRecord {
  id: string;
  name: string;
  email: string; // '' si inscrit uniquement avec téléphone +243
  pendingEmail?: string;
  password?: string; // uniquement héritage avant migration bcrypt
  passwordHash?: string;
  phone?: string;
  whatsapp?: string;
  role: 'admin' | 'agent' | 'agency' | 'user' | 'owner';
  agencyId?: string;
  agencyName?: string;
  rccmOrNif?: string;
  avatar?: string;
  planId?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string;
  billingCycle?: 'monthly' | 'yearly';
  trialEndsAt?: string;
  includedBoostsRemaining?: number;
  isVerified?: boolean;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  phoneVerified?: boolean;
  termsAcceptedVersion?: string;
  termsAcceptedAt?: string;
  passwordUpdatedAt?: string;
  kinshasaBadgeVerified?: boolean;
  createdAt: string;
}

export interface SessionFamilyRecord {
  id: string;
  userId: string;
  currentTokenHash: string;
  previousTokenHash?: string | null;
  rotationCount: number;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  revokedAt?: string | null;
  revokedReason?: string | null;
}

export interface OneTimeActionToken {
  id: string;
  tokenHash: string;
  purpose: 'verify_email' | 'reset_password' | 'change_email';
  userId: string;
  targetEmail: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string | null;
}

export function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function hashPasswordBcrypt(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPasswordBcrypt(
  plain: string,
  user: StoredAccountRecord
): Promise<boolean> {
  if (user.passwordHash) {
    const normalizedHash = user.passwordHash.trim().replace(/^\$2y\$/, '$2b$');
    return bcrypt.compare(plain, normalizedHash);
  }
  // Rétrocompatibilité ultra-courte si un enregistrement hérité n'avait pas encore été migré
  if (user.password && timingSafeEqualStr(plain, user.password)) {
    user.passwordHash = await hashPasswordBcrypt(plain);
    delete user.password;
    return true;
  }
  return false;
}

export async function migrateUsersToBcrypt(
  users: StoredAccountRecord[],
  saveFn: (list: StoredAccountRecord[]) => void
): Promise<boolean> {
  let dirty = false;
  for (const u of users) {
    if (!u.passwordHash && u.password) {
      u.passwordHash = await hashPasswordBcrypt(u.password);
      delete u.password;
      dirty = true;
    } else if (u.password !== undefined) {
      delete u.password;
      dirty = true;
    }
    // Comptes pré-existants avec e-mail valide : conserver l'accès sans régression
    if (u.email && isValidEmailAddress(u.email) && u.emailVerified === undefined) {
      u.emailVerified = true;
      u.emailVerifiedAt = u.emailVerifiedAt || u.createdAt || new Date().toISOString();
      dirty = true;
    }
    if (!u.email && u.emailVerified === undefined) {
      u.emailVerified = false;
      dirty = true;
    }
  }
  if (dirty) {
    saveFn(users);
  }
  return dirty;
}

export function sanitizePublicUser(u: StoredAccountRecord) {
  const {
    password: _pwd,
    passwordHash: _hash,
    ...safe
  } = u;
  return {
    ...safe,
    emailVerified: Boolean(safe.email && safe.emailVerified),
  };
}

// ------------------------------------------------------------
// Gestion fichiers de persistance sessions & jetons à usage unique
// ------------------------------------------------------------
const ROOT_DIR = path.resolve(process.cwd());
const SESSIONS_FILE = path.join(ROOT_DIR, 'auth_sessions_store.json');
const ACTION_TOKENS_FILE = path.join(ROOT_DIR, 'auth_tokens_store.json');

function loadJsonArray<T>(filePath: string): T[] {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn(`[AuthSecurity] Lecture impossible ${path.basename(filePath)}:`, err);
  }
  return [];
}

function saveJsonArray<T>(filePath: string, data: T[]): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[AuthSecurity] Écriture impossible ${path.basename(filePath)}:`, err);
  }
}

let inMemorySessions: SessionFamilyRecord[] = loadJsonArray<SessionFamilyRecord>(SESSIONS_FILE);
let inMemoryActionTokens: OneTimeActionToken[] = loadJsonArray<OneTimeActionToken>(ACTION_TOKENS_FILE);

function pruneExpiredAuthData() {
  const now = Date.now();
  const prevSessionsLen = inMemorySessions.length;
  inMemorySessions = inMemorySessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  if (inMemorySessions.length !== prevSessionsLen) {
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
  }

  const prevTokensLen = inMemoryActionTokens.length;
  inMemoryActionTokens = inMemoryActionTokens.filter(
    (t) => new Date(t.expiresAt).getTime() > now - 24 * 60 * 60 * 1000
  );
  if (inMemoryActionTokens.length !== prevTokensLen) {
    saveJsonArray(ACTION_TOKENS_FILE, inMemoryActionTokens);
  }
}

// ------------------------------------------------------------
// Cookies HttpOnly, Secure, SameSite=Lax (+ compatibilité aperçu iFrame HTTPS)
// ------------------------------------------------------------
export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const out: Record<string, string> = {};
  if (!header || typeof header !== 'string') return out;
  const parts = header.split(';');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

export function isHttpsRequest(req: Request): boolean {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return Boolean(req.secure || forwardedProto === 'https');
}

function buildCookieHeader(
  req: Request,
  name: string,
  value: string,
  maxAgeSeconds: number,
  options: { httpOnly?: boolean } = { httpOnly: true }
): string {
  const hostHeader = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const isLocalHttp = !isHttpsRequest(req) && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostHeader);
  const secure = isHttpsRequest(req) || (process.env.NODE_ENV === 'production' && !isLocalHttp);
  const isEmbedded = req.headers['x-kinimmo-embedded'] === '1';
  const segments = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
  ];
  if (options.httpOnly !== false) {
    segments.push('HttpOnly');
  }
  if (secure) {
    segments.push('Secure');
  }
  if (isEmbedded && secure) {
    // Indispensable uniquement dans une iFrame tiers HTTPS (aperçu intégré)
    segments.push('SameSite=None');
    segments.push('Partitioned');
  } else {
    segments.push('SameSite=Lax');
  }
  return segments.join('; ');
}

export function appendAuthCookies(
  req: Request,
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  res.append(
    'Set-Cookie',
    buildCookieHeader(req, ACCESS_COOKIE_NAME, accessToken, ACCESS_TOKEN_TTL_SECONDS, { httpOnly: true })
  );
  res.append(
    'Set-Cookie',
    buildCookieHeader(req, REFRESH_COOKIE_NAME, refreshToken, REFRESH_TOKEN_TTL_SECONDS, { httpOnly: true })
  );
}

export function clearAuthCookies(req: Request, res: Response): void {
  res.append(
    'Set-Cookie',
    buildCookieHeader(req, ACCESS_COOKIE_NAME, '', 0, { httpOnly: true })
  );
  res.append(
    'Set-Cookie',
    buildCookieHeader(req, REFRESH_COOKIE_NAME, '', 0, { httpOnly: true })
  );
}

// ------------------------------------------------------------
// Jeton CSRF (HMAC-lié en cookie HttpOnly + double soumission en-tête X-CSRF-Token)
// ------------------------------------------------------------
function signCsrfRaw(raw: string): string {
  const sig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`csrf:${raw}`)
    .digest('hex');
  return `${raw}.${sig}`;
}

function verifyCsrfCookieValue(cookieVal: string): string | null {
  const dotIdx = cookieVal.indexOf('.');
  if (dotIdx <= 0) return null;
  const raw = cookieVal.slice(0, dotIdx);
  const sig = cookieVal.slice(dotIdx + 1);
  if (!raw || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(`csrf:${raw}`)
    .digest('hex');
  if (!timingSafeEqualStr(sig, expectedSig)) return null;
  return raw;
}

export function issueCsrfToken(req: Request, res: Response): string {
  const cookies = parseCookies(req);
  const existingCookie = cookies[CSRF_COOKIE_NAME];
  if (existingCookie) {
    const existingRaw = verifyCsrfCookieValue(existingCookie);
    if (existingRaw) {
      return existingRaw;
    }
  }
  const raw = crypto.randomBytes(32).toString('hex');
  const signed = signCsrfRaw(raw);
  res.append(
    'Set-Cookie',
    buildCookieHeader(req, CSRF_COOKIE_NAME, signed, 24 * 60 * 60, { httpOnly: true })
  );
  return raw;
}

export function csrfProtectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }

  // Vérification stricte de l'origine lorsque l'en-tête Origin est présent
  const originHeader = req.headers.origin;
  if (originHeader && typeof originHeader === 'string') {
    try {
      const originHost = new URL(originHeader).host.toLowerCase();
      const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
      const appUrlHost = process.env.APP_URL ? new URL(process.env.APP_URL).host.toLowerCase() : '';
      let frontendHost = '';
      if (process.env.FRONTEND_URL) {
        try {
          frontendHost = new URL(process.env.FRONTEND_URL).host.toLowerCase();
        } catch {}
      }
      const allowedHosts = new Set([requestHost, appUrlHost, frontendHost].filter(Boolean));
      if (allowedHosts.size > 0 && !allowedHosts.has(originHost)) {
        return res.status(403).json({
          success: false,
          code: 'ORIGIN_MISMATCH',
          message: 'Requête refusée : origine non autorisée.',
        });
      }
    } catch {
      return res.status(403).json({
        success: false,
        code: 'ORIGIN_INVALID',
        message: 'En-tête Origin invalide.',
      });
    }
  }

  // Vérification du jeton CSRF sur toutes les écritures
  const cookies = parseCookies(req);
  const cookieVal = cookies[CSRF_COOKIE_NAME];
  const headerToken = String(req.headers['x-csrf-token'] || '').trim();

  if (!cookieVal || !headerToken) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'Protection CSRF : jeton de sécurité manquant. Rechargez le formulaire et réessayez.',
    });
  }

  const cookieRaw = verifyCsrfCookieValue(cookieVal);
  if (!cookieRaw || !timingSafeEqualStr(cookieRaw, headerToken)) {
    return res.status(403).json({
      success: false,
      code: 'CSRF_INVALID',
      message: 'Protection CSRF : jeton invalide ou expiré. Réessayez l\'opération.',
    });
  }

  return next();
}

// ------------------------------------------------------------
// Création, vérification et rotation des sessions
// ------------------------------------------------------------
interface AccessTokenPayload {
  sub: string;
  role: string;
  sid: string;
  type: 'access';
}

export function signAccessJwt(user: StoredAccountRecord, sessionId: string): string {
  const payload: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    sid: sessionId,
    type: 'access',
  };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: 'kinimmo-auth',
  });
}

export function createNewSessionPair(
  req: Request,
  user: StoredAccountRecord
): { accessToken: string; refreshToken: string; session: SessionFamilyRecord } {
  pruneExpiredAuthData();
  const sessionId = `sess_${crypto.randomBytes(12).toString('hex')}`;
  const rawSecret = crypto.randomBytes(32).toString('hex');
  const refreshToken = `${sessionId}.${rawSecret}`;
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();

  const session: SessionFamilyRecord = {
    id: sessionId,
    userId: user.id,
    currentTokenHash: sha256Hex(refreshToken),
    previousTokenHash: null,
    rotationCount: 0,
    userAgent: String(req.headers['user-agent'] || 'Navigateur Web').slice(0, 180),
    ip: String(req.headers['x-forwarded-for'] || req.ip || '127.0.0.1').split(',')[0].trim(),
    createdAt: nowIso,
    lastActiveAt: nowIso,
    expiresAt,
    revokedAt: null,
    revokedReason: null,
  };

  inMemorySessions.unshift(session);
  saveJsonArray(SESSIONS_FILE, inMemorySessions);

  const accessToken = signAccessJwt(user, sessionId);
  return { accessToken, refreshToken, session };
}

export function rotateRefreshSession(
  req: Request,
  users: StoredAccountRecord[]
): {
  ok: boolean;
  user?: StoredAccountRecord;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
} {
  pruneExpiredAuthData();
  const cookies = parseCookies(req);
  const rawRefresh = cookies[REFRESH_COOKIE_NAME];
  if (!rawRefresh || !rawRefresh.includes('.')) {
    return { ok: false, error: 'Session absente ou expirée.' };
  }

  const sessionId = rawRefresh.split('.')[0];
  const sessionIdx = inMemorySessions.findIndex((s) => s.id === sessionId);
  if (sessionIdx === -1) {
    return { ok: false, error: 'Session introuvable.' };
  }

  const session = inMemorySessions[sessionIdx];
  if (session.revokedAt) {
    return { ok: false, error: 'Cette session a été révoquée. Veuillez vous reconnecter.' };
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    session.revokedAt = new Date().toISOString();
    session.revokedReason = 'expired';
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
    return { ok: false, error: 'Session expirée. Veuillez vous reconnecter.' };
  }

  const presentedHash = sha256Hex(rawRefresh);

  // Détection de réutilisation d'un ancien refresh token -> révocation immédiate de toute la famille
  if (session.previousTokenHash && timingSafeEqualStr(presentedHash, session.previousTokenHash)) {
    session.revokedAt = new Date().toISOString();
    session.revokedReason = 'refresh_token_reuse_detected';
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
    return {
      ok: false,
      error: 'Activité suspecte détectée (jeton déjà utilisé). Votre session a été fermée par sécurité.',
    };
  }

  if (!timingSafeEqualStr(presentedHash, session.currentTokenHash)) {
    return { ok: false, error: 'Jeton de session invalide.' };
  }

  const user = users.find((u) => u.id === session.userId);
  if (!user) {
    session.revokedAt = new Date().toISOString();
    session.revokedReason = 'user_deleted';
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
    return { ok: false, error: 'Compte utilisateur introuvable.' };
  }

  // Rotation atomique
  const nextSecret = crypto.randomBytes(32).toString('hex');
  const nextRefreshToken = `${session.id}.${nextSecret}`;
  session.previousTokenHash = session.currentTokenHash;
  session.currentTokenHash = sha256Hex(nextRefreshToken);
  session.rotationCount += 1;
  session.lastActiveAt = new Date().toISOString();
  session.expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();
  session.userAgent = String(req.headers['user-agent'] || session.userAgent).slice(0, 180);
  saveJsonArray(SESSIONS_FILE, inMemorySessions);

  const accessToken = signAccessJwt(user, session.id);
  return { ok: true, user, accessToken, refreshToken: nextRefreshToken };
}

export function getAuthenticatedUserFromCookies(
  req: Request,
  users: StoredAccountRecord[]
): { user: StoredAccountRecord; sessionId: string } | null {
  const cookies = parseCookies(req);
  const accessToken = cookies[ACCESS_COOKIE_NAME];
  if (!accessToken) return null;

  try {
    const decoded = jwt.verify(accessToken, getJwtSecret(), {
      issuer: 'kinimmo-auth',
    }) as AccessTokenPayload;
    if (!decoded || decoded.type !== 'access' || !decoded.sub || !decoded.sid) {
      return null;
    }

    const session = inMemorySessions.find((s) => s.id === decoded.sid);
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    const user = users.find((u) => u.id === decoded.sub);
    if (!user) return null;

    return { user, sessionId: session.id };
  } catch {
    return null;
  }
}

export function revokeSessionById(sessionId: string, userId: string, reason = 'user_logout'): boolean {
  const session = inMemorySessions.find((s) => s.id === sessionId && s.userId === userId);
  if (!session) return false;
  session.revokedAt = new Date().toISOString();
  session.revokedReason = reason;
  saveJsonArray(SESSIONS_FILE, inMemorySessions);
  return true;
}

export function revokeCurrentRequestSession(req: Request): void {
  const cookies = parseCookies(req);
  const access = cookies[ACCESS_COOKIE_NAME];
  const refresh = cookies[REFRESH_COOKIE_NAME];

  let sid: string | null = null;
  if (refresh && refresh.includes('.')) {
    sid = refresh.split('.')[0];
  } else if (access) {
    try {
      const decoded = jwt.verify(access, getJwtSecret(), { ignoreExpiration: true }) as AccessTokenPayload;
      sid = decoded?.sid || null;
    } catch {}
  }
  if (!sid) return;
  const session = inMemorySessions.find((s) => s.id === sid);
  if (session && !session.revokedAt) {
    session.revokedAt = new Date().toISOString();
    session.revokedReason = 'logout';
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
  }
}

export function revokeAllUserSessions(userId: string, reason = 'security_reset', exceptSessionId?: string): number {
  const nowIso = new Date().toISOString();
  let count = 0;
  for (const s of inMemorySessions) {
    if (s.userId === userId && !s.revokedAt && s.id !== exceptSessionId) {
      s.revokedAt = nowIso;
      s.revokedReason = reason;
      count++;
    }
  }
  if (count > 0) saveJsonArray(SESSIONS_FILE, inMemorySessions);
  return count;
}

export function listActiveSessionsForUser(userId: string, currentSessionId?: string) {
  pruneExpiredAuthData();
  return inMemorySessions
    .filter((s) => s.userId === userId && !s.revokedAt)
    .map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      ip: s.ip,
      createdAt: s.createdAt,
      lastActiveAt: s.lastActiveAt,
      expiresAt: s.expiresAt,
      isCurrent: Boolean(currentSessionId && s.id === currentSessionId),
    }));
}

// ------------------------------------------------------------
// Jetons à usage unique (Confirmation e-mail 24h, Mot de passe oublié 1h, Changement e-mail 24h)
// ------------------------------------------------------------
export function createOneTimeActionToken(params: {
  purpose: OneTimeActionToken['purpose'];
  userId: string;
  targetEmail: string;
  ttlMs: number;
}): { rawToken: string; record: OneTimeActionToken } {
  pruneExpiredAuthData();
  const now = Date.now();
  // Invalider les anciens jetons non utilisés pour le même (userId, purpose)
  for (const t of inMemoryActionTokens) {
    if (t.userId === params.userId && t.purpose === params.purpose && !t.usedAt) {
      t.usedAt = new Date(now).toISOString();
    }
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const record: OneTimeActionToken = {
    id: `tok_${crypto.randomBytes(8).toString('hex')}`,
    tokenHash: sha256Hex(rawToken),
    purpose: params.purpose,
    userId: params.userId,
    targetEmail: normalizeEmailAddress(params.targetEmail),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + params.ttlMs).toISOString(),
    usedAt: null,
  };

  inMemoryActionTokens.unshift(record);
  saveJsonArray(ACTION_TOKENS_FILE, inMemoryActionTokens);
  return { rawToken, record };
}

export function peekOneTimeActionToken(
  rawToken: string,
  expectedPurpose?: OneTimeActionToken['purpose'] | OneTimeActionToken['purpose'][]
): {
  ok: boolean;
  record?: OneTimeActionToken;
  error?: string;
  code?: 'TOKEN_INVALID' | 'TOKEN_USED' | 'TOKEN_EXPIRED';
} {
  const clean = String(rawToken || '').trim();
  if (!clean || clean.length < 32) {
    return { ok: false, code: 'TOKEN_INVALID', error: 'Lien de vérification invalide.' };
  }

  const hash = sha256Hex(clean);
  const found = inMemoryActionTokens.find((t) => timingSafeEqualStr(t.tokenHash, hash));
  if (!found) {
    return { ok: false, code: 'TOKEN_INVALID', error: 'Ce lien est invalide ou introuvable.' };
  }

  if (expectedPurpose) {
    const allowed = Array.isArray(expectedPurpose) ? expectedPurpose : [expectedPurpose];
    if (!allowed.includes(found.purpose)) {
      return { ok: false, code: 'TOKEN_INVALID', error: 'Ce lien ne correspond pas à cette action.' };
    }
  }

  if (found.usedAt) {
    return { ok: false, code: 'TOKEN_USED', error: 'Ce lien a déjà été utilisé. Demandez un nouveau lien si nécessaire.' };
  }

  if (new Date(found.expiresAt).getTime() <= Date.now()) {
    return { ok: false, code: 'TOKEN_EXPIRED', error: 'Ce lien a expiré. Demandez un nouvel envoi.' };
  }

  return { ok: true, record: found };
}

export function markOneTimeActionTokenUsed(record: OneTimeActionToken): void {
  record.usedAt = new Date().toISOString();
  saveJsonArray(ACTION_TOKENS_FILE, inMemoryActionTokens);
}

export function consumeOneTimeActionToken(
  rawToken: string,
  expectedPurpose?: OneTimeActionToken['purpose'] | OneTimeActionToken['purpose'][]
): {
  ok: boolean;
  record?: OneTimeActionToken;
  error?: string;
  code?: 'TOKEN_INVALID' | 'TOKEN_USED' | 'TOKEN_EXPIRED';
} {
  const check = peekOneTimeActionToken(rawToken, expectedPurpose);
  if (!check.ok || !check.record) {
    return check;
  }
  markOneTimeActionTokenUsed(check.record);
  return { ok: true, record: check.record };
}

// ------------------------------------------------------------
// Envoi des e-mails transactionnels (SMTP, Resend ou aperçu sécurisé en dev)
// ------------------------------------------------------------
export function resolveSiteOrigin(req: Request): string {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000')
    .split(',')[0]
    .trim();
  const proto = isHttpsRequest(req) ? 'https' : 'http';
  if (process.env.APP_URL && /^https?:\/\//i.test(process.env.APP_URL)) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  return `${proto}://${host}`;
}

export async function dispatchAuthEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  actionUrl: string;
}): Promise<{ delivered: boolean; channel: 'smtp' | 'resend' | 'preview'; previewUrl?: string }> {
  const { to, subject, text, html, actionUrl } = params;

  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpFrom = process.env.SMTP_FROM?.trim() || smtpUser || 'no-reply@kinimmo.cd';

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text,
        html,
      });
      return { delivered: true, channel: 'smtp' };
    } catch (err) {
      console.error('[AuthEmail] Erreur envoi SMTP:', err);
    }
  }

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.SMTP_FROM?.trim() || 'Kinimmo <no-reply@kinimmo.cd>',
          to: [to],
          subject,
          text,
          html,
        }),
      });
      if (resp.ok) {
        return { delivered: true, channel: 'resend' };
      }
    } catch (err) {
      console.error('[AuthEmail] Erreur envoi Resend:', err);
    }
  }

  // En mode développement / aperçu sans fournisseur mail configuré : retourner le lien de test au client
  return {
    delivered: false,
    channel: 'preview',
    previewUrl: actionUrl,
  };
}

export function canUserPublishListings(user: StoredAccountRecord | null): {
  allowed: boolean;
  reason?: string;
} {
  if (!user) {
    return {
      allowed: false,
      reason: 'Vous devez être connecté pour publier une annonce.',
    };
  }
  return { allowed: true };
}

export {
  TERMS_VERSION,
  isValidEmailAddress,
  normalizeEmailAddress,
  normalizePhoneRdc,
  normalizeAccountRole,
  validatePasswordPolicy,
};
