import mysql from 'mysql2/promise';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import type { StoredAccountRecord } from './authSecurity';
import { normalizeEmailAddress, normalizePhoneRdc } from '../src/utils/authValidation';

let cachedPool: Pool | null = null;

export function isMysqlConfigured(): boolean {
  const dbName = String(process.env.DB_NAME || '').trim();
  const dbUser = String(process.env.DB_USER || '').trim();
  return Boolean(dbName && dbUser);
}

export function getMysqlPool(): Pool | null {
  if (!isMysqlConfigured()) return null;
  if (cachedPool) return cachedPool;

  const rawHost = String(process.env.DB_HOST || '').trim();
  const dbHost = rawHost && rawHost !== 'localhost' ? rawHost : '127.0.0.1';

  cachedPool = mysql.createPool({
    host: dbHost,
    port: Number(process.env.DB_PORT) || 3306,
    user: String(process.env.DB_USER || '').trim(),
    password: String(process.env.DB_PASSWORD || ''),
    database: String(process.env.DB_NAME || '').trim(),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 5000,
    enableKeepAlive: true,
    timezone: '+00:00',
  });

  return cachedPool;
}

function normalizeRole(rawRole: unknown): StoredAccountRecord['role'] {
  const clean = String(rawRole || 'user').trim().toLowerCase();
  if (clean === 'admin' || clean === 'agent' || clean === 'agency' || clean === 'owner' || clean === 'user') {
    return clean;
  }
  return 'user';
}

export function normalizeBcryptPrefix(hash?: string | null): string | undefined {
  if (!hash || typeof hash !== 'string') return undefined;
  const trimmed = hash.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/^\$2y\$/, '$2b$');
}

export function isMysqlRowSuspended(row: Record<string, any>): boolean {
  const st = String(row?.status || '').trim().toLowerCase();
  return st === 'suspended' || st === 'inactive';
}

export function mapMysqlRowToAccountRecord(row: Record<string, any>): StoredAccountRecord {
  const cleanEmail = row.email ? normalizeEmailAddress(String(row.email)) : '';
  const createdAt = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
  const role = normalizeRole(row.role);
  const agencyId = row.agency_id ? String(row.agency_id) : role === 'agency' ? String(row.id) : undefined;

  return {
    id: String(row.id),
    name: String(row.name || cleanEmail || 'Utilisateur Kinimmo').trim(),
    email: cleanEmail,
    passwordHash: normalizeBcryptPrefix(row.password_hash || row.passwordHash),
    phone: row.phone ? String(row.phone).trim() : '',
    whatsapp: row.whatsapp ? String(row.whatsapp).trim() : row.phone ? String(row.phone).trim() : '',
    role,
    agencyId,
    agencyName: row.agency_name ? String(row.agency_name) : undefined,
    rccmOrNif: row.rccm_or_nif ? String(row.rccm_or_nif) : undefined,
    avatar: row.avatar ? String(row.avatar) : undefined,
    planId: row.plan_id ? String(row.plan_id) : role === 'agency' ? 'agency' : role === 'agent' ? 'pro' : 'starter',
    subscriptionPlan: row.plan_id ? String(row.plan_id) : undefined,
    subscriptionStatus: row.subscription_status ? String(row.subscription_status) : undefined,
    subscriptionExpiresAt: row.subscription_expires_at
      ? new Date(row.subscription_expires_at).toISOString().split('T')[0]
      : undefined,
    billingCycle:
      row.billing_cycle === 'yearly' || row.billing_cycle === 'monthly' ? row.billing_cycle : undefined,
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at).toISOString().split('T')[0] : undefined,
    includedBoostsRemaining:
      row.included_boosts_remaining !== undefined && row.included_boosts_remaining !== null
        ? Number(row.included_boosts_remaining)
        : undefined,
    isVerified: Boolean(row.is_verified),
    emailVerified:
      row.email_verified !== undefined && row.email_verified !== null
        ? Boolean(row.email_verified)
        : Boolean(cleanEmail),
    emailVerifiedAt: row.email_verified_at
      ? new Date(row.email_verified_at).toISOString()
      : cleanEmail
        ? createdAt
        : undefined,
    phoneVerified: row.phone_verified !== undefined ? Boolean(row.phone_verified) : undefined,
    kinshasaBadgeVerified: Boolean(row.kinshasa_badge_verified),
    createdAt,
  };
}

export function mergeAccountIntoMemory(
  list: StoredAccountRecord[],
  record: StoredAccountRecord
): StoredAccountRecord {
  const idx = list.findIndex(
    (u) =>
      u.id === record.id ||
      (record.email && u.email && normalizeEmailAddress(u.email) === normalizeEmailAddress(record.email))
  );

  if (idx !== -1) {
    const merged: StoredAccountRecord = {
      ...list[idx],
      ...record,
      passwordHash: record.passwordHash || list[idx].passwordHash,
    };
    list[idx] = merged;
    return merged;
  }

  list.unshift(record);
  return record;
}

export async function loadAllMysqlUsers(): Promise<StoredAccountRecord[]> {
  const pool = getMysqlPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM users ORDER BY created_at DESC LIMIT 1000');
    return (rows || [])
      .filter((row) => !isMysqlRowSuspended(row))
      .map((row) => mapMysqlRowToAccountRecord(row));
  } catch (err: any) {
    console.warn('[MySQL Auth Bridge] Chargement initial des utilisateurs impossible:', err?.message || err);
    return [];
  }
}

export async function findMysqlUserByIdentifier(
  identifier: string
): Promise<{ record: StoredAccountRecord | null; suspended: boolean }> {
  const pool = getMysqlPool();
  if (!pool) return { record: null, suspended: false };

  const trimmed = String(identifier || '').trim();
  if (!trimmed) return { record: null, suspended: false };

  try {
    if (trimmed.includes('@')) {
      const cleanEmail = normalizeEmailAddress(trimmed);
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(?) LIMIT 1',
        [cleanEmail]
      );
      if (!rows || rows.length === 0) return { record: null, suspended: false };
      if (isMysqlRowSuspended(rows[0])) return { record: null, suspended: true };
      return { record: mapMysqlRowToAccountRecord(rows[0]), suspended: false };
    }

    const phoneCheck = normalizePhoneRdc(trimmed);
    const normalized = phoneCheck.valid ? phoneCheck.normalized : trimmed.replace(/[\s().-]/g, '');
    const digitsOnly = normalized.replace(/\D/g, '');
    const last9 = digitsOnly.length >= 6 ? digitsOnly.slice(-9) : '';

    const conditions = ['phone = ?', 'whatsapp = ?'];
    const params: string[] = [trimmed, trimmed];

    if (normalized && normalized !== trimmed) {
      conditions.push('phone = ?', 'whatsapp = ?');
      params.push(normalized, normalized);
    }

    if (last9) {
      conditions.push(
        "(phone IS NOT NULL AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '.', ''), 9) = ?)",
        "(whatsapp IS NOT NULL AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '+', ''), '.', ''), 9) = ?)"
      );
      params.push(last9, last9);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM users WHERE ${conditions.join(' OR ')} LIMIT 1`,
      params
    );
    if (!rows || rows.length === 0) return { record: null, suspended: false };
    if (isMysqlRowSuspended(rows[0])) return { record: null, suspended: true };
    return { record: mapMysqlRowToAccountRecord(rows[0]), suspended: false };
  } catch (err: any) {
    console.warn('[MySQL Auth Bridge] Recherche utilisateur MySQL échouée:', err?.message || err);
    return { record: null, suspended: false };
  }
}

export async function findMysqlUserById(id: string): Promise<StoredAccountRecord | null> {
  const pool = getMysqlPool();
  if (!pool || !id) return null;
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [id]
    );
    if (!rows || rows.length === 0 || isMysqlRowSuspended(rows[0])) return null;
    return mapMysqlRowToAccountRecord(rows[0]);
  } catch (err: any) {
    console.warn('[MySQL Auth Bridge] Lecture utilisateur par ID échouée:', err?.message || err);
    return null;
  }
}

export async function insertMysqlUser(record: StoredAccountRecord): Promise<void> {
  const pool = getMysqlPool();
  if (!pool) return;
  try {
    const emailVal = record.email || `${record.id}@phone.kinimmo.cd`;
    await pool.execute(
      `INSERT IGNORE INTO users (
        id, name, email, password_hash, phone, whatsapp, role,
        agency_id, agency_name, avatar, is_verified, kinshasa_badge_verified,
        rccm_or_nif, plan_id, subscription_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.name,
        emailVal,
        record.passwordHash || '',
        record.phone || null,
        record.whatsapp || record.phone || null,
        record.role === 'owner' ? 'user' : record.role,
        record.agencyId || null,
        record.agencyName || null,
        record.avatar || null,
        record.isVerified ? 1 : 0,
        record.kinshasaBadgeVerified ? 1 : 0,
        record.rccmOrNif || null,
        record.planId || 'starter',
        record.subscriptionStatus || 'Active',
      ]
    );

    if (record.role === 'agent') {
      await pool.execute(
        `INSERT IGNORE INTO agents (id, user_id, name, email, phone, whatsapp, title)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `agent_${Date.now()}`,
          record.id,
          record.name,
          emailVal,
          record.phone || '',
          record.whatsapp || record.phone || '',
          'Courtier Immobilier Kinshasa',
        ]
      );
    } else if (record.role === 'agency') {
      const agencyId = record.agencyId || record.id;
      await pool.execute(
        `INSERT IGNORE INTO agencies (id, name, email, phone, whatsapp, owner_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          agencyId,
          record.agencyName || record.name,
          emailVal,
          record.phone || '',
          record.whatsapp || record.phone || '',
          record.id,
        ]
      );
    }
  } catch (err: any) {
    console.warn('[MySQL Auth Bridge] Synchronisation INSERT users échouée:', err?.message || err);
  }
}

export async function updateMysqlUserPassword(id: string, passwordHash: string): Promise<void> {
  const pool = getMysqlPool();
  if (!pool || !id || !passwordHash) return;
  try {
    await pool.execute('UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?', [
      passwordHash,
      id,
    ]);
  } catch (err: any) {
    console.warn('[MySQL Auth Bridge] Mise à jour mot de passe MySQL échouée:', err?.message || err);
  }
}

export async function updateMysqlUserProfile(
  id: string,
  updates: Partial<StoredAccountRecord>
): Promise<void> {
  const pool = getMysqlPool();
  if (!pool || !id) return;
  try {
    await pool.execute(
      `UPDATE users
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           whatsapp = COALESCE(?, whatsapp),
           avatar = COALESCE(?, avatar),
           rccm_or_nif = COALESCE(?, rccm_or_nif),
           agency_name = COALESCE(?, agency_name),
           updated_at = NOW()
       WHERE id = ?`,
      [
        updates.name ?? null,
        updates.phone ?? null,
        updates.whatsapp ?? null,
        updates.avatar ?? null,
        updates.rccmOrNif ?? null,
        updates.agencyName ?? null,
        id,
      ]
    );
  } catch (err: any) {
    console.warn('[MySQL Auth Bridge] Mise à jour profil MySQL échouée:', err?.message || err);
  }
}

export async function updateMysqlUserEmail(id: string, email: string): Promise<void> {
  const pool = getMysqlPool();
  if (!pool || !id || !email) return;
  try {
    await pool.execute('UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?', [
      normalizeEmailAddress(email),
      id,
    ]);
  } catch (err: any) {
    console.warn('[MySQL Auth Bridge] Mise à jour e-mail MySQL échouée:', err?.message || err);
  }
}
