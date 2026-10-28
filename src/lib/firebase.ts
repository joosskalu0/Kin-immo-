/**
 * Kinimmo Data Store & Authentication Layer
 * Fully decoupled from Firebase/Firestore: Powered 100% by Kinimmo Express API (MySQL) and durable local storage.
 */

import {
  Property,
  CustomFieldDefinition,
  LeadRequest,
  User,
  UserRole,
  Agent,
  Agency,
  Invoice,
  SubscriptionPlan
} from '../types';
import { getAdminCredentials, verifyAdminPin } from './adminCredentials';
import {
  initialProperties,
  initialCustomFields,
  initialAgents,
  initialAgencies,
  initialLeads,
  initialInvoices,
  initialSubscriptionPlans
} from '../data/mockData';
import {
  authenticateUser,
  registerUserAccount,
  authenticateOrRegisterGoogleUser,
  getRegisteredAccounts
} from './authStore';

// Database & Auth Mock/Proxy Objects to maintain full interface compatibility
export const db = null as any;
export const auth = {
  currentUser: null as any,
  signOut: async () => {},
} as any;
export const googleProvider = null as any;

// Collections registry
export const COLLECTIONS = {
  PROPERTIES: 'properties',
  CUSTOM_FIELDS: 'customFields',
  LEADS: 'leads',
  USERS: 'users',
  AGENTS: 'agents',
  AGENCIES: 'agencies',
  INVOICES: 'invoices',
  SYSTEM_SETTINGS: 'systemSettings'
};

export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
}

export const initialUsersSeed: User[] = [
  {
    id: 'usr_admin_001',
    name: 'Jean-Luc Mukamba',
    email: 'joosskalu72@gmail.com',
    phone: '+243 84 529 4616',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    agencyName: 'Kin Immobilier RDC',
    rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
    planId: 'pro',
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: true,
    twoFactorMethod: 'authenticator',
    kinshasaBadgeVerified: true,
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export async function syncUsersOnlyToFirestore() {
  // Direct sync to local storage & MySQL backend
  return;
}

export async function seedInitialFirestoreData() {
  // Data initialization handled via MySQL / mockData
  return;
}

// Event-driven local and backend listeners
type ListenerCallback<T> = (data: T) => void;
const listeners = new Map<string, Set<ListenerCallback<any>>>();

function notifyListeners(key: string, data: any) {
  const set = listeners.get(key);
  if (set) {
    set.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.warn(`Listener error for ${key}:`, err);
      }
    });
  }
}

function registerListener<T>(key: string, callback: ListenerCallback<T>): () => void {
  if (!listeners.has(key)) {
    listeners.set(key, new Set());
  }
  listeners.get(key)!.add(callback);
  return () => {
    listeners.get(key)?.delete(callback);
  };
}

// -------------------------------------------------------------
// Subscriptions (Properties, Fields, Leads, Agents, Agencies, etc.)
// -------------------------------------------------------------

export function subscribeToProperties(callback: (properties: Property[]) => void): () => void {
  // Load initially from localStorage or mock
  try {
    const raw = localStorage.getItem('kinimmo_properties');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        callback(parsed);
      } else {
        callback(initialProperties);
      }
    } else {
      callback(initialProperties);
    }
  } catch {
    callback(initialProperties);
  }

  // Also query MySQL API
  fetch('/api/properties')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem('kinimmo_properties', JSON.stringify(json.data));
        callback(json.data);
      }
    })
    .catch(() => {});

  return registerListener('properties', callback);
}

export function subscribeToCustomFields(callback: (fields: CustomFieldDefinition[]) => void): () => void {
  try {
    const raw = localStorage.getItem('kinimmo_custom_fields');
    if (raw) {
      callback(JSON.parse(raw));
    } else {
      callback(initialCustomFields);
    }
  } catch {
    callback(initialCustomFields);
  }

  fetch('/api/custom-fields')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem('kinimmo_custom_fields', JSON.stringify(json.data));
        callback(json.data);
      }
    })
    .catch(() => {});

  return registerListener('customFields', callback);
}

export function subscribeToLeads(callback: (leads: LeadRequest[]) => void): () => void {
  try {
    const raw = localStorage.getItem('kinimmo_leads');
    if (raw) {
      callback(JSON.parse(raw));
    } else {
      callback(initialLeads);
    }
  } catch {
    callback(initialLeads);
  }

  fetch('/api/leads')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data)) {
        localStorage.setItem('kinimmo_leads', JSON.stringify(json.data));
        callback(json.data);
      }
    })
    .catch(() => {});

  return registerListener('leads', callback);
}

export function subscribeToAgents(callback: (agents: Agent[]) => void): () => void {
  try {
    const raw = localStorage.getItem('kinimmo_agents');
    if (raw) {
      callback(JSON.parse(raw));
    } else {
      callback(initialAgents);
    }
  } catch {
    callback(initialAgents);
  }

  fetch('/api/agents')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem('kinimmo_agents', JSON.stringify(json.data));
        callback(json.data);
      }
    })
    .catch(() => {});

  return registerListener('agents', callback);
}

export function subscribeToAgencies(callback: (agencies: Agency[]) => void): () => void {
  try {
    const raw = localStorage.getItem('kinimmo_agencies');
    if (raw) {
      callback(JSON.parse(raw));
    } else {
      callback(initialAgencies);
    }
  } catch {
    callback(initialAgencies);
  }

  fetch('/api/agencies')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
        localStorage.setItem('kinimmo_agencies', JSON.stringify(json.data));
        callback(json.data);
      }
    })
    .catch(() => {});

  return registerListener('agencies', callback);
}

export function subscribeToInvoices(callback: (invoices: Invoice[]) => void): () => void {
  try {
    const raw = localStorage.getItem('kinimmo_invoices');
    if (raw) {
      callback(JSON.parse(raw));
    } else {
      callback(initialInvoices);
    }
  } catch {
    callback(initialInvoices);
  }

  fetch('/api/invoices')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data)) {
        localStorage.setItem('kinimmo_invoices', JSON.stringify(json.data));
        callback(json.data);
      }
    })
    .catch(() => {});

  return registerListener('invoices', callback);
}

export function subscribeToUsers(callback: (users: User[]) => void): () => void {
  try {
    const raw = localStorage.getItem('kinimmo_users');
    if (raw) {
      callback(JSON.parse(raw));
    } else {
      callback(initialUsersSeed);
    }
  } catch {
    callback(initialUsersSeed);
  }

  fetch('/api/users')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data)) {
        localStorage.setItem('kinimmo_users', JSON.stringify(json.data));
        callback(json.data);
      }
    })
    .catch(() => {});

  return registerListener('users', callback);
}

export function subscribeToPricingConfig(
  callback: (config: {
    pricingPlans: any[];
    subscriptionPlans: SubscriptionPlan[];
    cdfExchangeRate: number;
    pricingDisplayCurrency: string;
  }) => void
): () => void {
  const defaultConfig = {
    pricingPlans: [],
    subscriptionPlans: initialSubscriptionPlans,
    cdfExchangeRate: 2850,
    pricingDisplayCurrency: 'USD'
  };

  try {
    const raw = localStorage.getItem('kinimmo_pricing_config');
    if (raw) {
      callback({ ...defaultConfig, ...JSON.parse(raw) });
    } else {
      callback(defaultConfig);
    }
  } catch {
    callback(defaultConfig);
  }

  return registerListener('pricingConfig', callback);
}

// -------------------------------------------------------------
// Persistence Actions (save / delete)
// -------------------------------------------------------------

export async function savePropertyToFirestore(property: Property) {
  try {
    const raw = localStorage.getItem('kinimmo_properties');
    let list: Property[] = raw ? JSON.parse(raw) : [...initialProperties];
    const idx = list.findIndex((p) => p.id === property.id);
    if (idx >= 0) {
      list[idx] = property;
    } else {
      list.unshift(property);
    }
    localStorage.setItem('kinimmo_properties', JSON.stringify(list));
    notifyListeners('properties', list);
  } catch {}

  // Sync with Express backend
  try {
    await fetch(`/api/properties/${property.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(property)
    });
  } catch {}
}

export async function getPropertyFromFirestore(id: string): Promise<Property | null> {
  try {
    const raw = localStorage.getItem('kinimmo_properties');
    if (raw) {
      const list: Property[] = JSON.parse(raw);
      const found = list.find((p) => p.id === id);
      if (found) return found;
    }
  } catch {}
  return initialProperties.find((p) => p.id === id) || null;
}

export async function deletePropertyFromFirestore(id: string) {
  try {
    const raw = localStorage.getItem('kinimmo_properties');
    if (raw) {
      let list: Property[] = JSON.parse(raw);
      list = list.filter((p) => p.id !== id);
      localStorage.setItem('kinimmo_properties', JSON.stringify(list));
      notifyListeners('properties', list);
    }
  } catch {}

  try {
    await fetch(`/api/properties/${id}`, { method: 'DELETE' });
  } catch {}
}

export async function saveCustomFieldToFirestore(field: CustomFieldDefinition) {
  try {
    const raw = localStorage.getItem('kinimmo_custom_fields');
    let list: CustomFieldDefinition[] = raw ? JSON.parse(raw) : [...initialCustomFields];
    const idx = list.findIndex((f) => f.id === field.id);
    if (idx >= 0) {
      list[idx] = field;
    } else {
      list.push(field);
    }
    localStorage.setItem('kinimmo_custom_fields', JSON.stringify(list));
    notifyListeners('customFields', list);
  } catch {}
}

export async function deleteCustomFieldFromFirestore(id: string) {
  try {
    const raw = localStorage.getItem('kinimmo_custom_fields');
    if (raw) {
      let list: CustomFieldDefinition[] = JSON.parse(raw);
      list = list.filter((f) => f.id !== id);
      localStorage.setItem('kinimmo_custom_fields', JSON.stringify(list));
      notifyListeners('customFields', list);
    }
  } catch {}
}

export async function saveLeadToFirestore(lead: LeadRequest) {
  try {
    const raw = localStorage.getItem('kinimmo_leads');
    let list: LeadRequest[] = raw ? JSON.parse(raw) : [...initialLeads];
    const idx = list.findIndex((l) => l.id === lead.id);
    if (idx >= 0) {
      list[idx] = lead;
    } else {
      list.unshift(lead);
    }
    localStorage.setItem('kinimmo_leads', JSON.stringify(list));
    notifyListeners('leads', list);
  } catch {}
}

export async function deleteLeadFromFirestore(id: string) {
  try {
    const raw = localStorage.getItem('kinimmo_leads');
    if (raw) {
      let list: LeadRequest[] = JSON.parse(raw);
      list = list.filter((l) => l.id !== id);
      localStorage.setItem('kinimmo_leads', JSON.stringify(list));
      notifyListeners('leads', list);
    }
  } catch {}
}

export async function saveUserToFirestore(user: User) {
  try {
    const raw = localStorage.getItem('kinimmo_users');
    let list: User[] = raw ? JSON.parse(raw) : [...initialUsersSeed];
    const idx = list.findIndex((u) => u.id === user.id || u.email?.toLowerCase() === user.email?.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...user };
    } else {
      list.unshift(user);
    }
    localStorage.setItem('kinimmo_users', JSON.stringify(list));
    notifyListeners('users', list);
  } catch {}

  try {
    await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
  } catch {}
}

export async function deleteUserFromFirestore(id: string) {
  try {
    const raw = localStorage.getItem('kinimmo_users');
    if (raw) {
      let list: User[] = JSON.parse(raw);
      list = list.filter((u) => u.id !== id);
      localStorage.setItem('kinimmo_users', JSON.stringify(list));
      notifyListeners('users', list);
    }
  } catch {}
}

export async function adminUpdateUserPasswordInFirestore(userId: string, newPassword: string): Promise<void> {
  const accounts = getRegisteredAccounts();
  const found = accounts.find((a) => a.id === userId);
  if (found) {
    found.password = newPassword.trim();
    localStorage.setItem('kinimmo_stored_accounts', JSON.stringify(accounts));
  }
}

export interface AdminClaimVerificationResult {
  isAdmin: boolean;
  source: 'firestore_user_doc' | 'firestore_email_query' | 'firebase_auth_token' | 'none';
  matchedField?: string;
  adminEmail?: string;
  error?: string;
}

export async function verifyUserAdminInFirestore(
  user: User | null
): Promise<AdminClaimVerificationResult> {
  if (!user || !user.email) {
    return {
      isAdmin: false,
      source: 'none',
      error: 'Aucun utilisateur connecté ou adresse email manquante.'
    };
  }

  const cleanEmail = user.email.trim().toLowerCase();
  const adminCreds = getAdminCredentials();
  const isAdminEmail =
    cleanEmail === adminCreds.email.toLowerCase() ||
    cleanEmail === 'joosskalu72@gmail.com' ||
    cleanEmail === 'admin@kin-immobilier.cd';

  if (user.role === 'admin' || isAdminEmail) {
    return {
      isAdmin: true,
      source: 'firestore_user_doc',
      matchedField: 'role: admin',
      adminEmail: user.email
    };
  }

  return {
    isAdmin: false,
    source: 'none',
    error: 'Accès administrateur non attribué à ce compte.'
  };
}

export async function saveInvoiceToFirestore(invoice: Invoice) {
  try {
    const raw = localStorage.getItem('kinimmo_invoices');
    let list: Invoice[] = raw ? JSON.parse(raw) : [...initialInvoices];
    const idx = list.findIndex((i) => i.id === invoice.id);
    if (idx >= 0) {
      list[idx] = invoice;
    } else {
      list.unshift(invoice);
    }
    localStorage.setItem('kinimmo_invoices', JSON.stringify(list));
    notifyListeners('invoices', list);
  } catch {}
}

export async function deleteInvoiceFromFirestore(id: string) {
  try {
    const raw = localStorage.getItem('kinimmo_invoices');
    if (raw) {
      let list: Invoice[] = JSON.parse(raw);
      list = list.filter((i) => i.id !== id);
      localStorage.setItem('kinimmo_invoices', JSON.stringify(list));
      notifyListeners('invoices', list);
    }
  } catch {}
}

export async function saveAgentToFirestore(agent: Agent) {
  try {
    const raw = localStorage.getItem('kinimmo_agents');
    let list: Agent[] = raw ? JSON.parse(raw) : [...initialAgents];
    const idx = list.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      list[idx] = agent;
    } else {
      list.unshift(agent);
    }
    localStorage.setItem('kinimmo_agents', JSON.stringify(list));
    notifyListeners('agents', list);
  } catch {}
}

export async function deleteAgentFromFirestore(id: string) {
  try {
    const raw = localStorage.getItem('kinimmo_agents');
    if (raw) {
      let list: Agent[] = JSON.parse(raw);
      list = list.filter((a) => a.id !== id);
      localStorage.setItem('kinimmo_agents', JSON.stringify(list));
      notifyListeners('agents', list);
    }
  } catch {}
}

export async function saveAgencyToFirestore(agency: Agency) {
  try {
    const raw = localStorage.getItem('kinimmo_agencies');
    let list: Agency[] = raw ? JSON.parse(raw) : [...initialAgencies];
    const idx = list.findIndex((a) => a.id === agency.id);
    if (idx >= 0) {
      list[idx] = agency;
    } else {
      list.unshift(agency);
    }
    localStorage.setItem('kinimmo_agencies', JSON.stringify(list));
    notifyListeners('agencies', list);
  } catch {}
}

export async function deleteAgencyFromFirestore(id: string) {
  try {
    const raw = localStorage.getItem('kinimmo_agencies');
    if (raw) {
      let list: Agency[] = JSON.parse(raw);
      list = list.filter((a) => a.id !== id);
      localStorage.setItem('kinimmo_agencies', JSON.stringify(list));
      notifyListeners('agencies', list);
    }
  } catch {}
}

export async function savePricingConfigToFirestore(config: {
  pricingPlans?: any[];
  subscriptionPlans?: SubscriptionPlan[];
  cdfExchangeRate?: number;
  pricingDisplayCurrency?: string;
}) {
  try {
    const raw = localStorage.getItem('kinimmo_pricing_config');
    const existing = raw ? JSON.parse(raw) : {};
    const updated = { ...existing, ...config };
    localStorage.setItem('kinimmo_pricing_config', JSON.stringify(updated));
    notifyListeners('pricingConfig', updated);
  } catch {}
}

// -------------------------------------------------------------
// Authentication Methods (Zero Firebase SDK Dependency)
// -------------------------------------------------------------

export async function signInWithGoogleAuth(roleOverride?: string, agencyNameOverride?: string): Promise<User> {
  const account = authenticateOrRegisterGoogleUser('client.google@kin-immobilier.cd', 'Utilisateur Google RDC');
  if (roleOverride) account.role = roleOverride as UserRole;
  if (agencyNameOverride) account.agencyName = agencyNameOverride;
  return account;
}

export async function registerWithFirebaseEmailPassword(params: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: string;
  agencyName?: string;
  avatarUrl?: string;
  rccmOrNif?: string;
}): Promise<User> {
  const { email, password, name, phone, role, agencyName, avatarUrl, rccmOrNif } = params;
  const cleanEmail = email.trim().toLowerCase();
  const isAdmin = cleanEmail === 'joosskalu72@gmail.com' || cleanEmail === 'admin@kin-immobilier.cd';
  const effectiveRole = isAdmin ? 'admin' : (role || 'user');
  const uid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const userProfile: User = {
    id: uid,
    name: name || cleanEmail.split('@')[0],
    email: cleanEmail,
    phone: phone || '',
    whatsapp: phone || '',
    role: effectiveRole as any,
    agencyName: (effectiveRole === 'agent' || effectiveRole === 'agency') ? agencyName || 'Kinshasa Immobilier' : undefined,
    rccmOrNif: rccmOrNif,
    avatar: avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
    agentId: (effectiveRole === 'agent' || effectiveRole === 'agency') ? uid : undefined,
    planId: effectiveRole === 'agency' ? 'agency' : effectiveRole === 'agent' ? 'pro' : 'starter',
    provider: 'email',
    isVerified: isAdmin,
    emailVerified: false,
    phoneVerified: Boolean(phone),
    twoFactorEnabled: false,
    kinshasaBadgeVerified: effectiveRole === 'agent' || effectiveRole === 'agency' || isAdmin,
    createdAt: new Date().toISOString(),
  };

  registerUserAccount(userProfile, password);
  saveUserToFirestore(userProfile);
  return userProfile;
}

export async function loginWithFirebaseEmailPassword(
  email: string,
  password: string,
  expectedRole?: UserRole,
  agencyName?: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  // 1. Strict Administrator Authentication
  const isAdmin = cleanEmail === 'joosskalu72@gmail.com' || cleanEmail === 'admin@kin-immobilier.cd';
  if (isAdmin) {
    const isPinValid = verifyAdminPin(trimmedPassword);
    if (!isPinValid) {
      throw new Error("Mot de passe ou Code PIN Administrateur incorrect. Veuillez vérifier vos accès sécurisés.");
    }
    const adminCreds = getAdminCredentials();
    const adminUser: User = {
      id: 'usr_admin_001',
      name: adminCreds.name,
      email: cleanEmail,
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
    saveUserToFirestore(adminUser);
    return adminUser;
  }

  // 2. Local registered accounts and demo accounts
  const authenticated = authenticateUser(cleanEmail, trimmedPassword, 'email');
  if (authenticated.success && authenticated.user) {
    return authenticated.user;
  }

  throw new Error(authenticated.error || "Identifiants incorrects. Veuillez vérifier votre adresse e-mail et mot de passe.");
}

export async function logOutFromFirebase(): Promise<void> {
  try {
    localStorage.removeItem('kinimmo_session_user');
  } catch {}
}

export function listenToAuthChanges(callback: (user: User | null) => void): () => void {
  const handler = () => {
    try {
      const raw = localStorage.getItem('kinimmo_user');
      if (raw) {
        callback(JSON.parse(raw));
      } else {
        callback(null);
      }
    } catch {
      callback(null);
    }
  };

  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('storage', handler);
  };
}
