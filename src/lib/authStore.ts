import { User, Agent } from '../types';
import { purgeLegacyAuthStorage } from '../services/secureFetch';

export interface StoredUserAccount extends User {
  password?: string;
}

// Registre uniquement en mémoire vive : aucun mot de passe ni jeton n'est jamais écrit dans localStorage
let inMemoryAccounts: StoredUserAccount[] = [];

// Purger immédiatement d'éventuelles anciennes clés d'authentification locales
purgeLegacyAuthStorage();

export const normalizePhone = (phoneStr: string): string => {
  return phoneStr.replace(/[^\d+]/g, '').trim();
};

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

function stripSensitiveFields(user: User): StoredUserAccount {
  const { password: _p, accessPin: _ap, ...safe } = user as any;
  return safe;
}

export const getRegisteredAccounts = (): StoredUserAccount[] => {
  return inMemoryAccounts;
};

export const syncFirestoreUsersToAuthStore = (users: User[]): StoredUserAccount[] => {
  const accountsMap = new Map<string, StoredUserAccount>();
  users.forEach((u) => {
    if (!u || isDemoAccount(u.email, u.id, u.name)) return;
    const safe = stripSensitiveFields(u);
    if (safe.id) accountsMap.set(safe.id, safe);
  });
  inMemoryAccounts = Array.from(accountsMap.values());
  return inMemoryAccounts;
};

export const syncFirestoreAgentsToAuthStore = (agents: Agent[]): StoredUserAccount[] => {
  const accountsMap = new Map<string, StoredUserAccount>();
  inMemoryAccounts.forEach((acc) => {
    if (acc.id) accountsMap.set(acc.id, acc);
  });

  agents.forEach((agt) => {
    if (!agt || isDemoAccount(agt.email, agt.id, agt.name)) return;
    const merged: StoredUserAccount = {
      id: agt.id,
      name: agt.name,
      email: (agt.email || '').toLowerCase().trim(),
      phone: agt.phone || '',
      whatsapp: agt.whatsapp || agt.phone || '',
      role: 'agent',
      avatar: agt.avatar || '',
      agentId: agt.id,
      agencyId: agt.agencyId,
      agencyName: agt.agencyName || 'Kinshasa Immobilier',
      planId: 'pro',
      subscriptionStatus: 'Active',
      isVerified: agt.isVerified !== false,
      verificationStatus: agt.verificationStatus || 'verified',
      emailVerified: Boolean(agt.email),
      createdAt: new Date().toISOString(),
    };
    accountsMap.set(agt.id, merged);
  });

  inMemoryAccounts = Array.from(accountsMap.values());
  return inMemoryAccounts;
};

export const registerUserAccount = (user: User, _password?: string): StoredUserAccount => {
  const safe = stripSensitiveFields(user);
  const idx = inMemoryAccounts.findIndex((a) => a.id === safe.id);
  if (idx >= 0) {
    inMemoryAccounts[idx] = { ...inMemoryAccounts[idx], ...safe };
  } else {
    inMemoryAccounts.push(safe);
  }
  return safe;
};

export const authenticateUser = (): { success: boolean; user?: StoredUserAccount; error?: string } => {
  return {
    success: false,
    error: 'Authentification locale désactivée : utilisez la connexion sécurisée du serveur.',
  };
};

export const authenticateOrRegisterGoogleUser = (): StoredUserAccount => {
  throw new Error('Connexion locale désactivée pour des raisons de sécurité.');
};

export const updateAccountPassword = (): { success: boolean; error?: string } => {
  return {
    success: false,
    error: 'Utilisez /compte/securite pour modifier votre mot de passe sur le serveur.',
  };
};

export const adminResetUserPassword = async (): Promise<{ success: boolean; error?: string }> => {
  return {
    success: false,
    error: 'Utilisez la console d’administration sécurisée pour réinitialiser un mot de passe.',
  };
};

export const adminCreateOrUpdateUserAccount = async (user: User): Promise<StoredUserAccount> => {
  return registerUserAccount(user);
};
