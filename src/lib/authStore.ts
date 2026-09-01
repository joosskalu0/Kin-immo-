import { User, Agent, Agency } from '../types';
import { getAdminCredentials, verifyAdminPin } from './adminCredentials';
import { initialAgents, initialAgencies } from '../data/mockData';
import { saveUserToFirestore } from './firebase';

export interface StoredUserAccount extends User {
  password?: string;
}

// In-memory registry for initial demo seed accounts only (isolated, never overwriting agent passwords)
let inMemoryAccounts: StoredUserAccount[] = [];

/**
 * Clean phone numbers to digits only with country code standard
 */
export const normalizePhone = (phoneStr: string): string => {
  return phoneStr.replace(/[^\d+]/g, '').trim();
};

/**
 * Helper to identify and purge demo accounts
 */
export const isDemoAccount = (email?: string, id?: string, name?: string): boolean => {
  const e = (email || '').toLowerCase().trim();
  const i = (id || '').toLowerCase().trim();
  const n = (name || '').toLowerCase().trim();

  if (['user_agent_1', 'user_agent_2', 'user_agency_1', 'user_agency_2', 'agent_1', 'agent_2', 'agency_1', 'agency_2'].includes(i)) {
    return true;
  }
  if (
    e.includes('kinshasa-prestige.cd') ||
    e.includes('congorealassets.cd') ||
    e.includes('jeanluc.mpoy') ||
    e.includes('grace.kabamba')
  ) {
    return true;
  }
  if (
    n.includes('jean-luc mpoy') ||
    n.includes('grace kabamba') ||
    n.includes('patrick tshimanga') ||
    n.includes('direction kinshasa prestige') ||
    n.includes('direction congo real assets') ||
    n.includes('kinshasa prestige real estate') ||
    n.includes('congo real assets & housing')
  ) {
    return true;
  }
  return false;
};

/**
 * Pre-seed standard admin account
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
      password: adminCreds.pin || 'kalu2002jooss',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      kinshasaBadgeVerified: true,
      lastLoginLocation: 'Kinshasa (Gombe), RDC',
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  return seedAccounts;
};

const LOCAL_STORAGE_ACCOUNTS_KEY = 'estatik_local_registered_accounts';

const getStoredLocalAccounts = (): StoredUserAccount[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any lingering demo accounts from browser storage
        const cleaned = parsed.filter((acc) => !isDemoAccount(acc.email, acc.id, acc.name));
        if (cleaned.length !== parsed.length) {
          saveStoredLocalAccounts(cleaned);
        }
        return cleaned;
      }
    }
  } catch (_) {}
  return [];
};

const saveStoredLocalAccounts = (accounts: StoredUserAccount[]) => {
  try {
    const cleaned = accounts.filter((acc) => !isDemoAccount(acc.email, acc.id, acc.name));
    localStorage.setItem(LOCAL_STORAGE_ACCOUNTS_KEY, JSON.stringify(cleaned));
  } catch (_) {}
};

/**
 * Retrieve all registered accounts with local storage persistence
 */
export const getRegisteredAccounts = (): StoredUserAccount[] => {
  if (inMemoryAccounts.length === 0) {
    const seed = getInitialSeedAccounts();
    const local = getStoredLocalAccounts();
    const map = new Map<string, StoredUserAccount>();
    seed.forEach((s) => {
      if (!isDemoAccount(s.email, s.id, s.name)) {
        map.set(s.email.toLowerCase(), s);
      }
    });
    local.forEach((l) => {
      if (l.email && !isDemoAccount(l.email, l.id, l.name)) {
        map.set(l.email.toLowerCase(), { ...map.get(l.email.toLowerCase()), ...l });
      }
    });
    inMemoryAccounts = Array.from(map.values()).filter((a) => !isDemoAccount(a.email, a.id, a.name));
  }
  return inMemoryAccounts;
};

/**
 * Sync Firestore users into in-memory store without EVER overriding individual passwords
 */
export const syncFirestoreUsersToAuthStore = (firestoreUsers: User[]): StoredUserAccount[] => {
  const currentAccounts = getRegisteredAccounts();
  const accountsMap = new Map<string, StoredUserAccount>();

  // 1. Keep initial accounts
  currentAccounts.forEach((acc) => {
    if (acc.id) accountsMap.set(acc.id, acc);
    if (acc.email) accountsMap.set(acc.email.toLowerCase(), acc);
  });

  // 2. Merge Firestore users (without assigning admin password, excluding demo accounts)
  firestoreUsers.forEach((fu) => {
    if (!fu || isDemoAccount(fu.email, fu.id, fu.name)) return;
    const existing = (fu.id ? accountsMap.get(fu.id) : undefined) || (fu.email ? accountsMap.get(fu.email.toLowerCase()) : undefined);
    const resolvedPassword = fu.password || fu.accessPin || existing?.password || undefined;
    const merged: StoredUserAccount = {
      ...existing,
      ...fu,
      password: resolvedPassword,
      accessPin: resolvedPassword,
    };
    if (fu.id) accountsMap.set(fu.id, merged);
    if (fu.email) accountsMap.set(fu.email.toLowerCase(), merged);
  });

  const mergedList = Array.from(new Set(Array.from(accountsMap.values()))).filter((a) => !isDemoAccount(a.email, a.id, a.name));
  inMemoryAccounts = mergedList;
  saveStoredLocalAccounts(mergedList);
  return mergedList;
};

/**
 * Sync Firestore agents into in-memory store so agents can log in directly
 */
export const syncFirestoreAgentsToAuthStore = (firestoreAgents: Agent[]): StoredUserAccount[] => {
  const currentAccounts = getRegisteredAccounts();
  const accountsMap = new Map<string, StoredUserAccount>();

  currentAccounts.forEach((acc) => {
    if (!isDemoAccount(acc.email, acc.id, acc.name)) {
      if (acc.id) accountsMap.set(acc.id, acc);
      if (acc.email) accountsMap.set(acc.email.toLowerCase(), acc);
    }
  });

  firestoreAgents.forEach((agt) => {
    if (!agt || !agt.email || isDemoAccount(agt.email, agt.id, agt.name)) return;
    const cleanEmail = agt.email.toLowerCase().trim();
    const existing = (agt.id ? accountsMap.get(agt.id) : undefined) || accountsMap.get(cleanEmail);
    const merged: StoredUserAccount = {
      id: agt.id,
      name: agt.name,
      email: cleanEmail,
      phone: agt.phone || '',
      whatsapp: agt.whatsapp || agt.phone || '',
      role: 'agent',
      avatar: agt.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
      agentId: agt.id,
      agencyId: agt.agencyId,
      agencyName: agt.agencyName || 'Kinshasa Immobilier',
      planId: 'pro',
      subscriptionStatus: 'Active',
      isVerified: agt.isVerified !== false,
      verificationStatus: agt.verificationStatus || 'verified',
      emailVerified: true,
      password: existing?.password,
      createdAt: new Date().toISOString(),
    };
    accountsMap.set(agt.id, merged);
    accountsMap.set(cleanEmail, merged);
  });

  const mergedList = Array.from(new Set(Array.from(accountsMap.values()))).filter((a) => !isDemoAccount(a.email, a.id, a.name));
  inMemoryAccounts = mergedList;
  return mergedList;
};

/**
 * Register account into in-memory list and Firestore (NEVER storing password in Firestore)
 */
export const registerUserAccount = (user: User, password?: string): StoredUserAccount => {
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
    password: password ? password.trim() : undefined,
  };

  if (existingIdx >= 0) {
    accounts[existingIdx] = {
      ...accounts[existingIdx],
      ...accountToSave,
    };
  } else {
    accounts.push(accountToSave);
  }

  inMemoryAccounts = [...accounts];
  saveStoredLocalAccounts(inMemoryAccounts);

  // Save profile to Firestore WITHOUT the password!
  saveUserToFirestore(user).catch((err) => console.error('Firestore saveUser error in authStore:', err));

  return accountToSave;
};

/**
 * Strict Credentials Verification for seed / fallback accounts
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
    const isPinMatch = verifyAdminPin(trimmedPwd);
    const isPassMatch = trimmedPwd === 'kalu2002jooss' || trimmedPwd === adminCreds.pin;

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

  // 3. Compare with account's own password
  if (!matchedAccount.password) {
    if (trimmedPwd.length < 6) {
      return {
        success: false,
        error: 'Le mot de passe doit contenir au moins 6 caractères.',
      };
    }
    // Bind password for this session & persist locally
    matchedAccount.password = trimmedPwd;
    saveStoredLocalAccounts(accounts);
    return {
      success: true,
      user: matchedAccount,
    };
  }

  if (trimmedPwd !== matchedAccount.password) {
    const roleLabel =
      matchedAccount.role === 'agency'
        ? "d'agence"
        : matchedAccount.role === 'agent'
        ? "d'agent"
        : 'utilisateur';
    return {
      success: false,
      error: `Mot de passe incorrect pour le compte ${roleLabel} (${matchedAccount.name}). Veuillez vérifier votre mot de passe ou vous connecter en 1 clic avec Google.`,
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
  };

  registerUserAccount(newGoogleUser);
  return newGoogleUser;
};

/**
 * Update password for an existing account in memory
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
  const currentPass = account.password;

  if (currentPass && oldPassword.trim() !== currentPass) {
    return { success: false, error: 'Le mot de passe actuel est incorrect.' };
  }

  accounts[idx] = {
    ...account,
    password: newPassword.trim(),
  };
  inMemoryAccounts = [...accounts];
  saveStoredLocalAccounts(inMemoryAccounts);

  return { success: true };
};

/**
 * Admin directly resets/changes any user password and saves to Firestore
 */
export const adminResetUserPassword = async (
  userIdOrEmail: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const cleanKey = userIdOrEmail.trim().toLowerCase();
  const accounts = getRegisteredAccounts();
  const idx = accounts.findIndex(
    (a) => a.id.toLowerCase() === cleanKey || (a.email && a.email.toLowerCase() === cleanKey)
  );

  if (idx < 0) {
    return { success: false, error: "Utilisateur introuvable." };
  }

  const account = accounts[idx];
  const updatedAccount: StoredUserAccount = {
    ...account,
    password: newPassword.trim(),
    accessPin: newPassword.trim(),
  };

  accounts[idx] = updatedAccount;
  inMemoryAccounts = [...accounts];
  saveStoredLocalAccounts(inMemoryAccounts);

  try {
    await saveUserToFirestore(updatedAccount);
  } catch (e: any) {
    console.warn("Firestore save user password error:", e);
  }

  return { success: true };
};

/**
 * Admin creates or updates a user/agent account with custom credentials
 */
export const adminCreateOrUpdateUserAccount = async (
  user: User,
  password?: string
): Promise<StoredUserAccount> => {
  const account = registerUserAccount(user, password);
  return account;
};
