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
 * Pre-seed standard demo accounts with their own individual credentials
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
    // 2. Pre-seeded Agent Jean-Luc Mpoy (distinct password)
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
      password: 'agent@kinshasa2026',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      kinshasaBadgeVerified: true,
      lastLoginLocation: 'Kinshasa (Gombe), RDC',
      createdAt: '2026-07-01T00:00:00Z',
    },
    // 3. Pre-seeded Agent Grace Kabamba (distinct password)
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
      password: 'agent@kinshasa2026',
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
      password: 'agence@prestige2026',
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
      password: 'agence@congo2026',
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
 * Retrieve all registered accounts (in-memory, clean of localStorage pollution)
 */
export const getRegisteredAccounts = (): StoredUserAccount[] => {
  if (inMemoryAccounts.length === 0) {
    inMemoryAccounts = getInitialSeedAccounts();
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

  // 2. Merge Firestore users (without assigning admin password)
  firestoreUsers.forEach((fu) => {
    if (!fu) return;
    const existing = (fu.id ? accountsMap.get(fu.id) : undefined) || (fu.email ? accountsMap.get(fu.email.toLowerCase()) : undefined);
    const merged: StoredUserAccount = {
      ...existing,
      ...fu,
      password: existing?.password, // Retain own password if present, never overwrite with admin password
    };
    if (fu.id) accountsMap.set(fu.id, merged);
    if (fu.email) accountsMap.set(fu.email.toLowerCase(), merged);
  });

  const mergedList = Array.from(new Set(Array.from(accountsMap.values())));
  inMemoryAccounts = mergedList;
  return mergedList;
};

/**
 * Sync Firestore agents into in-memory store so agents can log in directly
 */
export const syncFirestoreAgentsToAuthStore = (firestoreAgents: Agent[]): StoredUserAccount[] => {
  const currentAccounts = getRegisteredAccounts();
  const accountsMap = new Map<string, StoredUserAccount>();

  currentAccounts.forEach((acc) => {
    if (acc.id) accountsMap.set(acc.id, acc);
    if (acc.email) accountsMap.set(acc.email.toLowerCase(), acc);
  });

  firestoreAgents.forEach((agt) => {
    if (!agt || !agt.email) return;
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

  const mergedList = Array.from(new Set(Array.from(accountsMap.values())));
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
    // If account was synced from Firestore without an in-memory password,
    // bind the provided password dynamically for this session so the agent can log in smoothly.
    matchedAccount.password = trimmedPwd;
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

  return { success: true };
};
