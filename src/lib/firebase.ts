import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Property,
  CustomFieldDefinition,
  LeadRequest,
  User,
  Agent,
  Agency,
  Invoice
} from '../types';
import {
  initialProperties,
  initialCustomFields,
  initialAgents,
  initialAgencies,
  initialLeads,
  initialInvoices
} from '../data/mockData';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Firestore Collections
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

// --- Firestore CRUD Helpers ---

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
  },
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
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: false,
    kinshasaBadgeVerified: true,
    createdAt: '2026-07-01T00:00:00Z'
  },
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
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: false,
    kinshasaBadgeVerified: true,
    createdAt: '2026-07-05T00:00:00Z'
  },
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
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: false,
    kinshasaBadgeVerified: true,
    createdAt: '2026-06-01T00:00:00Z'
  },
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
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: false,
    kinshasaBadgeVerified: true,
    createdAt: '2026-06-15T00:00:00Z'
  }
];

/**
 * Dedicated helper to sync users ONLY to Firestore without touching properties or other collections
 */
export async function syncUsersOnlyToFirestore() {
  try {
    const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
    const existingUserDocIds = new Set<string>();
    const existingUserEmails = new Set<string>();
    usersSnap.forEach((d) => {
      existingUserDocIds.add(d.id);
      const data = d.data();
      if (data?.email) {
        existingUserEmails.add(data.email.toLowerCase());
      }
    });

    const usersToSeed: User[] = [];
    initialUsersSeed.forEach((u) => {
      if (!existingUserDocIds.has(u.id) && (!u.email || !existingUserEmails.has(u.email.toLowerCase()))) {
        usersToSeed.push(u);
      }
    });

    try {
      const localUsersRaw = localStorage.getItem('estatik_registered_users');
      if (localUsersRaw) {
        const localUsers: User[] = JSON.parse(localUsersRaw);
        if (Array.isArray(localUsers)) {
          localUsers.forEach((lu) => {
            if (lu && lu.id && !existingUserDocIds.has(lu.id) && (!lu.email || !existingUserEmails.has(lu.email.toLowerCase()))) {
              usersToSeed.push(lu);
            }
          });
        }
      }
    } catch (e) {
      console.error('Error reading local users for Firestore seeding:', e);
    }

    if (usersToSeed.length > 0) {
      const userBatch = writeBatch(db);
      usersToSeed.forEach((u) => {
        const ref = doc(db, COLLECTIONS.USERS, u.id);
        userBatch.set(ref, sanitizeForFirestore(u), { merge: true });
      });
      await userBatch.commit();
    }
  } catch (err) {
    console.error('Error syncing users to Firestore:', err);
  }
}

/**
 * Seed initial data to Firestore if collection is empty
 */
export async function seedInitialFirestoreData() {
  try {
    // Check if initial seeding already happened previously in this database
    const initCheckRef = doc(db, COLLECTIONS.SYSTEM_SETTINGS, 'system_init');
    const initSnap = await getDoc(initCheckRef);
    const isAlreadyInitialized = initSnap.exists();

    // 1. Check & Seed Properties (ONLY if never initialized before and collection is empty)
    if (!isAlreadyInitialized) {
      const propsSnap = await getDocs(collection(db, COLLECTIONS.PROPERTIES));
      if (propsSnap.empty) {
        console.log('Initial setup: Seeding initial properties to Firestore...');
        const batch = writeBatch(db);
        initialProperties.forEach((p) => {
          const ref = doc(db, COLLECTIONS.PROPERTIES, p.id);
          batch.set(ref, sanitizeForFirestore(p));
        });
        await batch.commit();
      }

      // Mark system as initialized so deleted properties are never resurrected
      await setDoc(initCheckRef, {
        initialized: true,
        initializedAt: new Date().toISOString(),
      }, { merge: true });
    }

    // 2. Check & Seed Custom Fields
    const fieldsSnap = await getDocs(collection(db, COLLECTIONS.CUSTOM_FIELDS));
    if (fieldsSnap.empty) {
      console.log('Seeding initial custom fields to Firestore...');
      const batch = writeBatch(db);
      initialCustomFields.forEach((f) => {
        const ref = doc(db, COLLECTIONS.CUSTOM_FIELDS, f.id);
        batch.set(ref, sanitizeForFirestore(f));
      });
      await batch.commit();
    }

    // 3. Check & Seed Leads
    const leadsSnap = await getDocs(collection(db, COLLECTIONS.LEADS));
    if (leadsSnap.empty) {
      console.log('Seeding initial leads to Firestore...');
      const batch = writeBatch(db);
      initialLeads.forEach((l) => {
        const ref = doc(db, COLLECTIONS.LEADS, l.id);
        batch.set(ref, sanitizeForFirestore(l));
      });
      await batch.commit();
    }

    // 4. Check & Seed Agents
    const agentsSnap = await getDocs(collection(db, COLLECTIONS.AGENTS));
    if (agentsSnap.empty) {
      console.log('Seeding initial agents to Firestore...');
      const batch = writeBatch(db);
      initialAgents.forEach((a) => {
        const ref = doc(db, COLLECTIONS.AGENTS, a.id);
        batch.set(ref, sanitizeForFirestore(a));
      });
      await batch.commit();
    }

    // 5. Check & Seed Agencies
    const agenciesSnap = await getDocs(collection(db, COLLECTIONS.AGENCIES));
    if (agenciesSnap.empty) {
      console.log('Seeding initial agencies to Firestore...');
      const batch = writeBatch(db);
      initialAgencies.forEach((a) => {
        const ref = doc(db, COLLECTIONS.AGENCIES, a.id);
        batch.set(ref, sanitizeForFirestore(a));
      });
      await batch.commit();
    }

    // 6. Sync users to Firestore safely
    await syncUsersOnlyToFirestore();

    // 7. Check & Seed Invoices
    const invoicesSnap = await getDocs(collection(db, COLLECTIONS.INVOICES));
    if (invoicesSnap.empty) {
      console.log('Seeding initial invoices to Firestore...');
      const batch = writeBatch(db);
      initialInvoices.forEach((inv) => {
        const ref = doc(db, COLLECTIONS.INVOICES, inv.id);
        batch.set(ref, sanitizeForFirestore(inv));
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error seeding Firestore database:', err);
  }
}

// --- Realtime Firestore Sync Helpers ---

export function subscribeToProperties(callback: (properties: Property[]) => void) {
  const q = collection(db, COLLECTIONS.PROPERTIES);
  return onSnapshot(q, (snapshot) => {
    const list: Property[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Property);
    });
    callback(list);
  }, (error) => {
    console.error('Firestore properties subscription error:', error);
  });
}

export function subscribeToCustomFields(callback: (fields: CustomFieldDefinition[]) => void) {
  const q = collection(db, COLLECTIONS.CUSTOM_FIELDS);
  return onSnapshot(q, (snapshot) => {
    const list: CustomFieldDefinition[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as CustomFieldDefinition);
    });
    callback(list);
  }, (error) => {
    console.error('Firestore custom fields subscription error:', error);
  });
}

export function subscribeToLeads(callback: (leads: LeadRequest[]) => void) {
  const q = collection(db, COLLECTIONS.LEADS);
  return onSnapshot(q, (snapshot) => {
    const list: LeadRequest[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as LeadRequest);
    });
    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (error) => {
    console.error('Firestore leads subscription error:', error);
  });
}

export function subscribeToUsers(callback: (users: User[]) => void) {
  const q = collection(db, COLLECTIONS.USERS);
  return onSnapshot(q, (snapshot) => {
    const list: User[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as User);
    });
    callback(list);
  }, (error) => {
    console.error('Firestore users subscription error:', error);
  });
}

export function subscribeToAgents(callback: (agents: Agent[]) => void) {
  const q = collection(db, COLLECTIONS.AGENTS);
  return onSnapshot(q, (snapshot) => {
    const list: Agent[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Agent);
    });
    callback(list);
  }, (error) => {
    console.error('Firestore agents subscription error:', error);
  });
}

export function subscribeToAgencies(callback: (agencies: Agency[]) => void) {
  const q = collection(db, COLLECTIONS.AGENCIES);
  return onSnapshot(q, (snapshot) => {
    const list: Agency[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Agency);
    });
    callback(list);
  }, (error) => {
    console.error('Firestore agencies subscription error:', error);
  });
}

export function subscribeToInvoices(callback: (invoices: Invoice[]) => void) {
  const q = collection(db, COLLECTIONS.INVOICES);
  return onSnapshot(q, (snapshot) => {
    const list: Invoice[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as Invoice);
    });
    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (error) => {
    console.error('Firestore invoices subscription error:', error);
  });
}

// --- Write Operations ---

export async function savePropertyToFirestore(property: Property) {
  const ref = doc(db, COLLECTIONS.PROPERTIES, property.id);
  await setDoc(ref, sanitizeForFirestore(property), { merge: true });
}

export async function deletePropertyFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.PROPERTIES, id);
  await deleteDoc(ref);
}

export async function saveCustomFieldToFirestore(field: CustomFieldDefinition) {
  const ref = doc(db, COLLECTIONS.CUSTOM_FIELDS, field.id);
  await setDoc(ref, sanitizeForFirestore(field), { merge: true });
}

export async function deleteCustomFieldFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.CUSTOM_FIELDS, id);
  await deleteDoc(ref);
}

export async function saveLeadToFirestore(lead: LeadRequest) {
  const ref = doc(db, COLLECTIONS.LEADS, lead.id);
  await setDoc(ref, sanitizeForFirestore(lead), { merge: true });
}

export async function deleteLeadFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.LEADS, id);
  await deleteDoc(ref);
}

export async function saveUserToFirestore(user: User) {
  const ref = doc(db, COLLECTIONS.USERS, user.id);
  await setDoc(ref, sanitizeForFirestore(user), { merge: true });
}

export async function deleteUserFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.USERS, id);
  await deleteDoc(ref);
}

export async function saveAdminPinToFirestore(pin: string) {
  const ref = doc(db, COLLECTIONS.SYSTEM_SETTINGS, 'adminConfig');
  await setDoc(ref, sanitizeForFirestore({ secretPin: pin, updatedAt: new Date().toISOString() }), { merge: true });
}

export async function getAdminPinFromFirestore(): Promise<string | null> {
  try {
    const ref = doc(db, COLLECTIONS.SYSTEM_SETTINGS, 'adminConfig');
    const snap = await getDoc(ref);
    if (snap.exists() && snap.data().secretPin) {
      return snap.data().secretPin as string;
    }
  } catch (err) {
    console.error('Error fetching admin PIN from Firestore:', err);
  }
  return null;
}

export async function saveInvoiceToFirestore(invoice: Invoice) {
  const ref = doc(db, COLLECTIONS.INVOICES, invoice.id);
  await setDoc(ref, sanitizeForFirestore(invoice), { merge: true });
}

export async function deleteInvoiceFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.INVOICES, id);
  await deleteDoc(ref);
}

export async function saveAgentToFirestore(agent: Agent) {
  const ref = doc(db, COLLECTIONS.AGENTS, agent.id);
  await setDoc(ref, sanitizeForFirestore(agent), { merge: true });
}

export async function deleteAgentFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.AGENTS, id);
  await deleteDoc(ref);
}

export async function saveAgencyToFirestore(agency: Agency) {
  const ref = doc(db, COLLECTIONS.AGENCIES, agency.id);
  await setDoc(ref, sanitizeForFirestore(agency), { merge: true });
}

export async function deleteAgencyFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.AGENCIES, id);
  await deleteDoc(ref);
}

