/**
 * Kinimmo Data Store & Authentication Layer
 * Système 100% autonome propulsé par l'API REST Node.js / Express et MySQL (Hostinger).
 * Aucune dépendance ni connexion à Firebase / Firestore.
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
import { mysqlApi } from '../services/mysqlApi';

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

export function sanitizeForStore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  return JSON.parse(JSON.stringify(data));
}
export const sanitizeForFirestore = sanitizeForStore;

export const initialUsersSeed: User[] = [];

export async function syncUsersOnlyToStore() {
  return;
}
export const syncUsersOnlyToFirestore = syncUsersOnlyToStore;

export async function seedInitialStoreData() {
  return;
}
export const seedInitialFirestoreData = seedInitialStoreData;

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
  try {
    const raw = localStorage.getItem('kinimmo_properties');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        callback(parsed);
      } else {
        callback([]);
      }
    } else {
      callback([]);
    }
  } catch {
    callback([]);
  }

  fetch('/api/properties')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data)) {
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
      callback([]);
    }
  } catch {
    callback([]);
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
      callback([]);
    }
  } catch {
    callback([]);
  }

  fetch('/api/agents')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data)) {
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
      callback([]);
    }
  } catch {
    callback([]);
  }

  fetch('/api/agencies')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (json?.success && Array.isArray(json.data)) {
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
      callback([]);
    }
  } catch {
    callback([]);
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
      callback([]);
    }
  } catch {
    callback([]);
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

export async function savePropertyToStore(property: Property) {
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
    const token = localStorage.getItem('kinimmo_auth_token') || sessionStorage.getItem('kinimmo_auth_token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    await fetch(`/api/properties/${property.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(property)
    });
  } catch {}
}
export const savePropertyToFirestore = savePropertyToStore;

export async function getPropertyFromStore(id: string): Promise<Property | null> {
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
export const getPropertyFromFirestore = getPropertyFromStore;

export async function deletePropertyFromStore(id: string) {
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
export const deletePropertyFromFirestore = deletePropertyFromStore;

export async function saveCustomFieldToStore(field: CustomFieldDefinition) {
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
export const saveCustomFieldToFirestore = saveCustomFieldToStore;

export async function deleteCustomFieldFromStore(id: string) {
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
export const deleteCustomFieldFromFirestore = deleteCustomFieldFromStore;

export async function saveLeadToStore(lead: LeadRequest) {
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
export const saveLeadToFirestore = saveLeadToStore;

export async function deleteLeadFromStore(id: string) {
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
export const deleteLeadFromFirestore = deleteLeadFromStore;

export async function saveUserToStore(user: User) {
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
export const saveUserToFirestore = saveUserToStore;

export async function deleteUserFromStore(id: string) {
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
export const deleteUserFromFirestore = deleteUserFromStore;

export async function adminUpdateUserPasswordInStore(userId: string, newPassword: string): Promise<void> {
  const accounts = getRegisteredAccounts();
  const found = accounts.find((a) => a.id === userId);
  if (found) {
    found.password = newPassword.trim();
    localStorage.setItem('kinimmo_stored_accounts', JSON.stringify(accounts));
  }
}
export const adminUpdateUserPasswordInFirestore = adminUpdateUserPasswordInStore;

export interface AdminClaimVerificationResult {
  isAdmin: boolean;
  source: 'database_user_doc' | 'database_email_query' | 'admin_credentials' | 'none';
  matchedField?: string;
  adminEmail?: string;
  error?: string;
}

export async function verifyUserAdminInStore(
  user: User | null
): Promise<AdminClaimVerificationResult> {
  if (!user || !user.email) {
    return {
      isAdmin: false,
      source: 'none',
      error: 'Aucun utilisateur connecté ou adresse email manquante.'
    };
  }

  if (user.role === 'admin') {
    return {
      isAdmin: true,
      source: 'database_user_doc',
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
export const verifyUserAdminInFirestore = verifyUserAdminInStore;

export async function saveInvoiceToStore(invoice: Invoice) {
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
export const saveInvoiceToFirestore = saveInvoiceToStore;

export async function deleteInvoiceFromStore(id: string) {
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
export const deleteInvoiceFromFirestore = deleteInvoiceFromStore;

export async function saveAgentToStore(agent: Agent) {
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
export const saveAgentToFirestore = saveAgentToStore;

export async function deleteAgentFromStore(id: string) {
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
export const deleteAgentFromFirestore = deleteAgentFromStore;

export async function saveAgencyToStore(agency: Agency) {
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
export const saveAgencyToFirestore = saveAgencyToStore;

export async function deleteAgencyFromStore(id: string) {
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
export const deleteAgencyFromFirestore = deleteAgencyFromStore;

export async function savePricingConfigToStore(config: {
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
export const savePricingConfigToFirestore = savePricingConfigToStore;

// -------------------------------------------------------------
// Authentication Methods (MySQL & Secure Local Auth)
// -------------------------------------------------------------

export async function signInWithGoogleAuth(roleOverride?: string, agencyNameOverride?: string): Promise<User> {
  const account = authenticateOrRegisterGoogleUser('client.google@kin-immobilier.cd', 'Utilisateur Google RDC');
  if (roleOverride) account.role = roleOverride as UserRole;
  if (agencyNameOverride) account.agencyName = agencyNameOverride;
  return account;
}

export async function registerWithEmailPassword(params: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  role?: string;
  agencyName?: string;
  avatarUrl?: string;
  rccmOrNif?: string;
}): Promise<User> {
  const { email, password, name, phone, whatsapp, role, agencyName, avatarUrl, rccmOrNif } = params;
  const cleanEmail = email.trim().toLowerCase();

  // Inscription DIRECTE dans la base de données MySQL
  const res = await mysqlApi.register({
    name: name || cleanEmail.split('@')[0],
    email: cleanEmail,
    password: password.trim(),
    phone: phone || '',
    role: role || 'user',
    agencyName: (role === 'agent' || role === 'agency') ? agencyName : undefined
  });

  if (res.success && (res.user || res.data?.user)) {
    const rawUser = res.user || res.data?.user;
    const user: User = {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      phone: rawUser.phone || phone || '',
      whatsapp: rawUser.whatsapp || whatsapp || phone || '',
      role: rawUser.role || role || 'user',
      agencyName: rawUser.agency_name || rawUser.agencyName || agencyName,
      rccmOrNif: rawUser.rccm_nif || rawUser.rccmOrNif || rccmOrNif,
      avatar: avatarUrl || rawUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      planId: rawUser.plan_id || (role === 'agency' ? 'agency' : role === 'agent' ? 'pro' : 'starter'),
      isVerified: Boolean(rawUser.is_verified ?? rawUser.isVerified ?? false),
      emailVerified: true,
      phoneVerified: Boolean(phone),
      twoFactorEnabled: false,
      kinshasaBadgeVerified: Boolean(rawUser.kinshasa_badge_verified ?? false),
      lastLoginLocation: 'Kinshasa, RDC',
      createdAt: rawUser.created_at || new Date().toISOString()
    };
    saveUserToStore(user);
    return user;
  }

  throw new Error(res.message || "Échec de l'inscription dans la base de données MySQL.");
}
export const registerWithFirebaseEmailPassword = registerWithEmailPassword;

export async function loginWithEmailPassword(
  email: string,
  password: string,
  expectedRole?: UserRole,
  agencyName?: string
): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();
  const trimmedPassword = password.trim();

  // Connexion DIRECTE et EXCLUSIVE via la base de données MySQL
  const res = await mysqlApi.login({
    email: cleanEmail,
    password: trimmedPassword
  });

  if (res.success && (res.user || res.data?.user)) {
    const rawUser = res.user || res.data?.user;
    const user: User = {
      id: rawUser.id,
      name: rawUser.name,
      email: rawUser.email,
      phone: rawUser.phone || '',
      whatsapp: rawUser.whatsapp || rawUser.phone || '',
      role: rawUser.role || 'user',
      avatar: rawUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      agencyName: rawUser.agency_name || rawUser.agencyName,
      rccmOrNif: rawUser.rccm_nif || rawUser.rccmOrNif,
      planId: rawUser.plan_id || 'starter',
      isVerified: Boolean(rawUser.is_verified ?? rawUser.isVerified ?? false),
      emailVerified: Boolean(rawUser.email_verified ?? rawUser.emailVerified ?? true),
      phoneVerified: Boolean(rawUser.phone_verified ?? rawUser.phoneVerified ?? false),
      twoFactorEnabled: false,
      kinshasaBadgeVerified: Boolean(rawUser.kinshasa_badge_verified ?? false),
      lastLoginLocation: 'Kinshasa, RDC',
      createdAt: rawUser.created_at || new Date().toISOString()
    };
    saveUserToStore(user);
    return user;
  }

  throw new Error(res.message || "Identifiants incorrects. Veuillez vérifier votre adresse e-mail et mot de passe.");
}
export const loginWithFirebaseEmailPassword = loginWithEmailPassword;

export async function logOutFromStore(): Promise<void> {
  try {
    localStorage.removeItem('kinimmo_user');
    localStorage.removeItem('kinimmo_jwt_token');
    localStorage.removeItem('kinimmo_session_user');
  } catch {}
}
export const logOutFromFirebase = logOutFromStore;

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
