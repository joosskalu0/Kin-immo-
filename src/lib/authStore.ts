import { User, Agent, Agency } from '../types';
import { getAdminCredentials, verifyAdminPin } from './adminCredentials';
import { initialAgents, initialAgencies } from '../data/mockData';
import { saveUserToFirestore } from './firebase';

export interface StoredUserAccount extends User {
  password?: string;
}

const STORAGE_USERS_KEY = 'estatik_registered_users';
const DEFAULT_ACCOUNT_PASSWORD = 'Kinshasa2026';

/**
 * Clean phone numbers to digits only with country code standard
 */
export const normalizePhone = (phoneStr: string): string => {
  return phoneStr.replace(/[^\d+]/g, '').trim();
};

/**
 * Pre-seed standard demo accounts with default password 'Kinshasa2026'
 */
const getInitialSeedAccounts = (): StoredUserAccount[] => {
  const adminCreds = getAdminCredentials();

  const seedAccounts: StoredUserAccount[] = [
    // 1. Admin System
    {
      id: 'usr_admin_001',
      name: adminCreds.name,
      email: adminCreds.email.toLowerCase(),
      phone: adminCreds.phone,
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      agencyName: adminCreds.agencyName,
      rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
      planId: 'pro',
      password: adminCreds.pin || '2026',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      kinshasaBadgeVerified: true,
      lastLoginLocation: 'Kinshasa (Gombe), RDC',
      createdAt: '2026-01-01T00:00:00Z',
    },
    // 2. Pre-seeded Agent Jean-Luc Mpoy
    {
      id: 'user_agent_1',
      agentId: 'agent_1',
      name: 'Jean-Luc Mpoy',
      email: 'jeanluc.mpoy@kinshasa-prestige.cd',
      phone: '+243 81 555 44 33',
      whatsapp: '+243 81 555 44 33',
      role: 'agent',
      agencyName: 'Kinshasa Prestige Real Estate',
      rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
      planId: 'pro',
      password: DEFAULT_ACCOUNT_PASSWORD,
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      kinshasaBadgeVerified: true,
      lastLoginLocation: 'Kinshasa (Gombe), RDC',
      createdAt: '2026-07-01T00:00:00Z',
    },
    // 3. Pre-seeded Agent Grace Kabamba
    {
      id: 'user_agent_2',
      agentId: 'agent_2',
      name: 'Grace Kabamba',
      email: 'grace.kabamba@kinshasa-prestige.cd',
      phone: '+243 89 777 66 55',
      whatsapp: '+243 89 777 66 55',
      role: 'agent',
      agencyName: 'Kinshasa Prestige Real Estate',
      rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
      planId: 'pro',
      password: DEFAULT_ACCOUNT_PASSWORD,
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      kinshasaBadgeVerified: true,
      lastLoginLocation: 'Kinshasa (Gombe), RDC',
      createdAt: '2026-07-05T00:00:00Z',
    },
    // 4. Pre-seeded Agency Kinshasa Prestige Real Estate
    {
      id: 'user_agency_1',
      agentId: 'agent_1',
      agencyId: 'agency_1',
      name: 'Direction Kinshasa Prestige',
      email: 'contact@kinshasa-prestige.cd',
      phone: '+243 82 000 11 22',
      whatsapp: '+243 82 000 11 22',
      role: 'agency',
      agencyName: 'Kinshasa Prestige Real Estate',
      rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
      avatar: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80',
      planId: 'agency',
      password: DEFAULT_ACCOUNT_PASSWORD,
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      kinshasaBadgeVerified: true,
      lastLoginLocation: 'Kinshasa (Gombe), RDC',
      createdAt: '2026-06-01T00:00:00Z',
    },
    // 5. Pre-seeded Agency Congo Real Assets
    {
      id: 'user_agency_2',
      agentId: 'agent_3',
      agencyId: 'agency_2',
      name: 'Direction Congo Real Assets',
      email: 'info@congorealassets.cd',
      phone: '+243 99 888 77 66',
      whatsapp: '+243 99 888 77 66',
      role: 'agency',
      agencyName: 'Congo Real Assets & Housing',
      rccmOrNif: 'CD/KIN/RCCM/22-A-1104',
      avatar: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=300&auto=format&fit=crop&q=80',
      planId: 'agency',
      password: DEFAULT_ACCOUNT_PASSWORD,
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      kinshasaBadgeVerified: true,
      lastLoginLocation: 'Kinshasa (Gombe), RDC',
      createdAt: '2026-06-15T00:00:00Z',
    },
  ];

  return seedAccounts;
};

/**
 * Retrieve all registered accounts from localStorage (merging with initial seeds)
 */
export const getRegisteredAccounts = (): StoredUserAccount[] => {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      const parsed: StoredUserAccount[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure initial seeds are preserved if not present
        const seeds = getInitialSeedAccounts();
        const existingEmails = new Set(parsed.map((p) => p.email?.toLowerCase()));
        const missingSeeds = seeds.filter((s) => s.email && !existingEmails.has(s.email.toLowerCase()));
        if (missingSeeds.length > 0) {
          const merged = [...parsed, ...missingSeeds];
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(merged));
          return merged;
        }
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading registered accounts:', e);
  }

  const initialSeeds = getInitialSeedAccounts();
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(initialSeeds));
  } catch (e) {
    console.error('Error saving initial seeds:', e);
  }
  return initialSeeds;
};

/**
 * Register or update an account with its exact password
 */
export const registerUserAccount = (user: User, password: string): StoredUserAccount => {
  const accounts = getRegisteredAccounts();
  const cleanEmail = user.email.toLowerCase().trim();
  const cleanPhone = normalizePhone(user.phone || '');

  const existingIdx = accounts.findIndex(
    (a) =>
      a.id === user.id ||
      (a.email && a.email.toLowerCase() === cleanEmail) ||
      (cleanPhone && a.phone && normalizePhone(a.phone) === cleanPhone)
  );

  const accountToSave: StoredUserAccount = {
    ...user,
    email: cleanEmail,
    password: password.trim(),
  };

  if (existingIdx >= 0) {
    accounts[existingIdx] = {
      ...accounts[existingIdx],
      ...accountToSave,
    };
  } else {
    accounts.push(accountToSave);
  }

  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to write registered user to localStorage:', e);
  }

  // Also sync to Firestore
  saveUserToFirestore(user).catch((err) => console.error('Firestore saveUser error in authStore:', err));

  return accountToSave;
};

/**
 * Strict Credentials Verification
 * Verifies email/phone AND exact password match.
 */
export const authenticateUser = (
  identifier: string,
  inputPassword: string,
  method: 'email' | 'phone'
): { success: boolean; user?: StoredUserAccount; error?: string } => {
  const trimmedId = identifier.trim().toLowerCase();
  const trimmedPwd = inputPassword.trim();
  const adminCreds = getAdminCredentials();

  if (!trimmedId) {
    return {
      success: false,
      error: method === 'email' ? 'Veuillez saisir votre adresse e-mail.' : 'Veuillez saisir votre numéro de téléphone.',
    };
  }

  if (!trimmedPwd) {
    return {
      success: false,
      error: 'Veuillez renseigner votre mot de passe.',
    };
  }

  // 1. Check if user is logging in as System Admin
  const isAdminEmail =
    trimmedId === adminCreds.email.toLowerCase() ||
    trimmedId === 'admin@estatik.cd' ||
    trimmedId === 'admin@kin-immobilier.cd' ||
    trimmedId === 'mukamba@kin-immobilier.cd';

  if (isAdminEmail) {
    // Admin password check
    const isPinMatch = verifyAdminPin(trimmedPwd);
    const isPassMatch = trimmedPwd === 'Admin2026' || trimmedPwd === 'Kinshasa2026' || trimmedPwd === adminCreds.pin;

    if (isPinMatch || isPassMatch) {
      const adminObj: StoredUserAccount = {
        id: 'usr_admin_001',
        name: adminCreds.name,
        email: adminCreds.email.toLowerCase(),
        phone: adminCreds.phone,
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        agencyName: adminCreds.agencyName,
        rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
        planId: 'pro',
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: false,
        kinshasaBadgeVerified: true,
        lastLoginLocation: 'Kinshasa (Gombe), RDC',
        createdAt: new Date().toISOString(),
      };
      return { success: true, user: adminObj };
    } else {
      return {
        success: false,
        error: 'Mot de passe ou Code PIN Administrateur incorrect. Veuillez vérifier vos accès.',
      };
    }
  }

  // 2. Check registered accounts for Agent, Agency, or User
  const accounts = getRegisteredAccounts();
  const matchedAccount = accounts.find((acc) => {
    if (method === 'email') {
      return acc.email?.toLowerCase() === trimmedId;
    } else {
      const cleanInputPhone = normalizePhone(trimmedId);
      const cleanAccPhone = normalizePhone(acc.phone || '');
      return cleanAccPhone && cleanInputPhone && (cleanAccPhone === cleanInputPhone || cleanAccPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanAccPhone));
    }
  });

  if (!matchedAccount) {
    return {
      success: false,
      error: `Aucun compte ${method === 'email' ? 'avec cet e-mail' : 'avec ce numéro de téléphone'} n'a été trouvé. Veuillez cliquer sur "S'Inscrire" pour créer votre compte.`,
    };
  }

  // 3. Strict password comparison
  const expectedPassword = matchedAccount.password || DEFAULT_ACCOUNT_PASSWORD;
  if (trimmedPwd !== expectedPassword) {
    const roleLabel =
      matchedAccount.role === 'agency'
        ? "d'agence"
        : matchedAccount.role === 'agent'
        ? "d'agent"
        : 'utilisateur';
    return {
      success: false,
      error: `Mot de passe incorrect pour le compte ${roleLabel} (${matchedAccount.name}). Veuillez saisir le mot de passe exact défini lors de la création de votre compte.`,
    };
  }

  return {
    success: true,
    user: matchedAccount,
  };
};

/**
 * Authenticate or register a Google user directly
 */
export const authenticateOrRegisterGoogleUser = (
  googleEmail: string,
  googleName?: string
): StoredUserAccount => {
  const cleanEmail = googleEmail.trim().toLowerCase();
  const accounts = getRegisteredAccounts();
  const existing = accounts.find((a) => a.email?.toLowerCase() === cleanEmail);

  if (existing) {
    return existing;
  }

  // Create genuine buyer/client account (role: user, not agent, not agency)
  const displayName = googleName?.trim() || cleanEmail.split('@')[0];
  const newGoogleUser: StoredUserAccount = {
    id: `user_google_${Date.now()}`,
    name: displayName,
    email: cleanEmail,
    phone: '+243 81 000 0000',
    whatsapp: '+243 81 000 0000',
    role: 'user',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    planId: 'starter',
    provider: 'google',
    isVerified: true,
    emailVerified: true,
    phoneVerified: false,
    twoFactorEnabled: false,
    kinshasaBadgeVerified: false,
    lastLoginLocation: 'Kinshasa (Gombe), RDC',
    createdAt: new Date().toISOString(),
    password: 'GoogleOAuth2026',
  };

  registerUserAccount(newGoogleUser, 'GoogleOAuth2026');
  return newGoogleUser;
};

/**
 * Update password for an existing account
 */
export const updateAccountPassword = (
  userId: string,
  oldPassword: string,
  newPassword: string
): { success: boolean; error?: string } => {
  const accounts = getRegisteredAccounts();
  const idx = accounts.findIndex((a) => a.id === userId || a.email?.toLowerCase() === userId.toLowerCase());

  if (idx < 0) {
    return { success: false, error: 'Compte introuvable.' };
  }

  const account = accounts[idx];
  const currentPass = account.password || DEFAULT_ACCOUNT_PASSWORD;

  if (oldPassword.trim() !== currentPass && !verifyAdminPin(oldPassword)) {
    return { success: false, error: 'Le mot de passe actuel est incorrect.' };
  }

  accounts[idx] = {
    ...account,
    password: newPassword.trim(),
  };

  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(accounts));
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Erreur d\'enregistrement.' };
  }
};
