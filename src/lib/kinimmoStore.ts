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
import { mysqlApi, clearStoredToken } from '../services/mysqlApi';
import { getApiBaseUrl, resolvePropertyMedia } from '../utils/mediaUrl';
import { secureFetch, purgeLegacyAuthStorage } from '../services/secureFetch';

let inMemorySessionUser: User | null = null;
purgeLegacyAuthStorage();

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
        callback(parsed.map(resolvePropertyMedia));
      } else {
        callback([]);
      }
    } else {
      callback([]);
    }
  } catch {
    callback([]);
  }

  secureFetch('/properties')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const items = Array.isArray(json?.data) ? json.data : (Array.isArray(json?.properties) ? json.properties : null);
      if (items) {
        const resolved = items.map(resolvePropertyMedia);
        try { localStorage.setItem('kinimmo_properties', JSON.stringify(resolved)); } catch {}
        callback(resolved);
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

  fetch(`${getApiBaseUrl()}/custom-fields`)
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const items = Array.isArray(json?.fields) ? json.fields : (Array.isArray(json?.data) ? json.data : null);
      if (json?.success && items && items.length > 0) {
        localStorage.setItem('kinimmo_custom_fields', JSON.stringify(items));
        callback(items);
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

  if (inMemorySessionUser) {
    secureFetch('/leads', { skipAutoRefresh: true })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const items = Array.isArray(json?.leads) ? json.leads : (Array.isArray(json?.data) ? json.data : null);
        if (json?.success && items) {
          localStorage.setItem('kinimmo_leads', JSON.stringify(items));
          callback(items);
        }
      })
      .catch(() => {});
  }

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

  fetch(`${getApiBaseUrl()}/agents`)
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const items = Array.isArray(json?.agents) ? json.agents : (Array.isArray(json?.data) ? json.data : null);
      if (json?.success && items) {
        localStorage.setItem('kinimmo_agents', JSON.stringify(items));
        callback(items);
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

  fetch(`${getApiBaseUrl()}/agencies`)
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      const items = Array.isArray(json?.agencies) ? json.agencies : (Array.isArray(json?.data) ? json.data : null);
      if (json?.success && items) {
        localStorage.setItem('kinimmo_agencies', JSON.stringify(items));
        callback(items);
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

  if (inMemorySessionUser) {
    secureFetch('/invoices', { skipAutoRefresh: true })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const items = Array.isArray(json?.invoices) ? json.invoices : (Array.isArray(json?.data) ? json.data : null);
        if (json?.success && items) {
          localStorage.setItem('kinimmo_invoices', JSON.stringify(items));
          callback(items);
        }
      })
      .catch(() => {});
  }

  return registerListener('invoices', callback);
}

export function subscribeToUsers(callback: (users: User[]) => void): () => void {
  callback([]);

  if (inMemorySessionUser?.role === 'admin') {
    secureFetch('/users')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const items = Array.isArray(json?.users) ? json.users : (Array.isArray(json?.data) ? json.data : null);
        if (json?.success && items) {
          callback(items);
        }
      })
      .catch(() => {});
  }

  return registerListener('users', callback);
}

export function subscribeToPricingConfig(
  callback: (config: {
    pricingPlans: any[];
    subscriptionPlans: SubscriptionPlan[];
    cdfExchangeRate: number;
    cdfExchangeRateUpdatedAt?: string;
    pricingDisplayCurrency: string;
  }) => void
): () => void {
  const defaultConfig = {
    pricingPlans: [],
    subscriptionPlans: initialSubscriptionPlans,
    cdfExchangeRate: 2850,
    cdfExchangeRateUpdatedAt: '2026-11-18T10:00:00.000Z',
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

export async function savePropertyToStore(property: Property, skipRemoteSync = false) {
  const resolvedProp = resolvePropertyMedia(property);
  try {
    const raw = localStorage.getItem('kinimmo_properties');
    let list: Property[] = raw ? JSON.parse(raw) : [...initialProperties];
    const idx = list.findIndex((p) => p.id === resolvedProp.id);
    if (idx >= 0) {
      list[idx] = resolvedProp;
    } else {
      list.unshift(resolvedProp);
    }
    localStorage.setItem('kinimmo_properties', JSON.stringify(list));
    notifyListeners('properties', list);
  } catch {}

  if (skipRemoteSync) return;

  // Sync with Express backend
  try {
    await secureFetch(`/properties/${resolvedProp.id}`, {
      method: 'PUT',
      body: JSON.stringify(resolvedProp)
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
    await secureFetch(`/properties/${id}`, { method: 'DELETE' });
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
  inMemorySessionUser = user;
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kinimmo_auth_change', { detail: user }));
    }
  } catch {}

  try {
    await secureFetch(`/users/${user.id}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    });
  } catch {}
}
export const saveUserToFirestore = saveUserToStore;

export async function deleteUserFromStore(_id: string) {
  return;
}
export const deleteUserFromFirestore = deleteUserFromStore;

export async function adminUpdateUserPasswordInStore(userId: string, newPassword: string): Promise<void> {
  await mysqlApi.adminResetUserPassword(userId, newPassword);
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
  cdfExchangeRateUpdatedAt?: string;
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

export async function signInWithGoogleAuth(): Promise<User> {
  throw new Error('Connexion directe requise par e-mail ou numéro +243 et mot de passe.');
}

export async function registerWithEmailPassword(params: {
  email?: string;
  password: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  role?: string;
  agencyName?: string;
  avatarUrl?: string;
  rccmOrNif?: string;
  termsAccepted?: boolean;
}): Promise<User> {
  const { email, password, name, phone, whatsapp, role, agencyName, avatarUrl, rccmOrNif, termsAccepted } = params;
  const cleanEmail = email ? email.trim().toLowerCase() : '';

  const res = await mysqlApi.register({
    name: name || (cleanEmail ? cleanEmail.split('@')[0] : phone || 'Membre Kinimmo'),
    email: cleanEmail || undefined,
    password: password.trim(),
    phone: phone || '',
    role: role || 'user',
    agencyName: (role === 'agent' || role === 'agency') ? agencyName : undefined,
    rccmOrNif,
    termsAccepted: termsAccepted ?? true,
  });

  if (res.success && (res.user || res.data?.user)) {
    const rawUser = res.user || res.data?.user;
    const user: User = {
      ...rawUser,
      whatsapp: rawUser.whatsapp || whatsapp || rawUser.phone || '',
      avatar: avatarUrl || rawUser.avatar || '',
    };
    inMemorySessionUser = user;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kinimmo_auth_change', { detail: user }));
    }
    return user;
  }

  throw new Error(res.message || res.error || "Échec de l'inscription.");
}
export const registerWithFirebaseEmailPassword = registerWithEmailPassword;

export async function loginWithEmailPassword(
  identifier: string,
  password: string
): Promise<User> {
  const res = await mysqlApi.login({
    identifier: identifier.trim(),
    password: password.trim(),
  });

  if (res.success && (res.user || res.data?.user)) {
    const user = (res.user || res.data?.user) as User;
    inMemorySessionUser = user;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kinimmo_auth_change', { detail: user }));
    }
    return user;
  }

  throw new Error(res.message || res.error || "Identifiants incorrects. Veuillez vérifier vos informations.");
}
export const loginWithFirebaseEmailPassword = loginWithEmailPassword;

export async function logOutFromStore(): Promise<void> {
  inMemorySessionUser = null;
  await mysqlApi.logout();
  clearStoredToken();
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kinimmo_auth_change', { detail: null }));
    }
  } catch {}
}
export const logOutFromFirebase = logOutFromStore;

export function listenToAuthChanges(callback: (user: User | null) => void): () => void {
  callback(inMemorySessionUser);

  const handleCustom = (e: any) => {
    inMemorySessionUser = e.detail ?? null;
    callback(inMemorySessionUser);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('kinimmo_auth_change', handleCustom as any);
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('kinimmo_auth_change', handleCustom as any);
    }
  };
}
