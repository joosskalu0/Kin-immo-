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
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Property,
  CustomFieldDefinition,
  LeadRequest,
  User,
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

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore targeting the specific database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

    // Seed default baseline users if not already present in Firestore

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

    // 8. Check & Seed Pricing Config in System Settings
    const pricingConfigRef = doc(db, COLLECTIONS.SYSTEM_SETTINGS, 'pricingConfig');
    const pricingSnap = await getDoc(pricingConfigRef);
    if (!pricingSnap.exists()) {
      console.log('Seeding initial pricing config to Firestore...');
      await setDoc(pricingConfigRef, sanitizeForFirestore({
        cdfExchangeRate: 2800,
        pricingDisplayCurrency: 'CDF',
        subscriptionPlans: initialSubscriptionPlans,
        updatedAt: new Date().toISOString()
      }));
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

export function subscribeToPricingConfig(
  callback: (config: {
    cdfExchangeRate?: number;
    pricingDisplayCurrency?: 'CDF' | 'USD' | 'BOTH';
    subscriptionPlans?: SubscriptionPlan[];
  } | null) => void
) {
  const ref = doc(db, COLLECTIONS.SYSTEM_SETTINGS, 'pricingConfig');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as any);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Firestore pricingConfig subscription error:', error);
  });
}

// --- Write Operations ---

export async function savePricingConfigToFirestore(config: {
  cdfExchangeRate: number;
  pricingDisplayCurrency: 'CDF' | 'USD' | 'BOTH';
  subscriptionPlans: SubscriptionPlan[];
}) {
  try {
    const ref = doc(db, COLLECTIONS.SYSTEM_SETTINGS, 'pricingConfig');
    await setDoc(ref, sanitizeForFirestore({
      ...config,
      updatedAt: new Date().toISOString()
    }), { merge: true });
  } catch (err) {
    console.error('Error saving pricing config to Firestore:', err);
  }
}

export async function savePropertyToFirestore(property: Property) {
  const ref = doc(db, COLLECTIONS.PROPERTIES, property.id);
  await setDoc(ref, sanitizeForFirestore(property), { merge: true });
}

export async function getPropertyFromFirestore(id: string): Promise<Property | null> {
  try {
    const ref = doc(db, COLLECTIONS.PROPERTIES, id);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Property;
    }
  } catch (err) {
    console.error('Error fetching property from Firestore:', err);
  }
  return null;
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

export function subscribeToUsers(callback: (users: User[]) => void) {
  const q = collection(db, COLLECTIONS.USERS);
  return onSnapshot(q, (snapshot) => {
    const list: User[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as User;
      // Strip any password field from user profile
      delete (data as any).password;
      list.push({ id: docSnap.id, ...data });
    });
    callback(list);
  }, (error) => {
    console.error('Firestore users subscription error:', error);
  });
}

export async function saveUserToFirestore(user: User) {
  // STRICT: Do not store any password or admin PIN in Firestore
  const { ...safeUser } = user as any;
  delete safeUser.password;
  delete safeUser.pin;
  const ref = doc(db, COLLECTIONS.USERS, user.id);
  await setDoc(ref, sanitizeForFirestore(safeUser), { merge: true });
}

export async function deleteUserFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.USERS, id);
  await deleteDoc(ref);
}

// --- Firebase Authentication Methods ---

/**
 * Sign in or Sign up via Google Popup using Firebase Auth
 */
export async function signInWithGoogleAuth(roleOverride?: string, agencyNameOverride?: string): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const fbUser = result.user;

  // Retrieve user document from Firestore users collection
  const userRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
  const userSnap = await getDoc(userRef);

  let userProfile: User;
  if (userSnap.exists()) {
    userProfile = { id: userSnap.id, ...userSnap.data() } as User;
    delete (userProfile as any).password;
  } else {
    // Check if a legacy record exists with this email
    let matchedLegacyUser: User | null = null;
    if (fbUser.email) {
      try {
        const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', fbUser.email.toLowerCase()));
        const snapByEmail = await getDocs(q);
        if (!snapByEmail.empty) {
          matchedLegacyUser = { id: snapByEmail.docs[0].id, ...snapByEmail.docs[0].data() } as User;
        }
      } catch (e) {
        console.warn('Query by email warning:', e);
      }
    }

    const isAdmin = fbUser.email?.toLowerCase() === 'joosskalu72@gmail.com';
    const effectiveRole = isAdmin ? 'admin' : (matchedLegacyUser?.role || roleOverride || 'user');
    userProfile = {
      id: fbUser.uid,
      name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Utilisateur Google'),
      email: fbUser.email || '',
      phone: fbUser.phoneNumber || matchedLegacyUser?.phone || '',
      role: effectiveRole as any,
      agencyName: matchedLegacyUser?.agencyName || agencyNameOverride || undefined,
      avatar: fbUser.photoURL || matchedLegacyUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      planId: (effectiveRole === 'agency' ? 'agency' : effectiveRole === 'agent' ? 'pro' : matchedLegacyUser?.planId || 'starter'),
      provider: 'google',
      isVerified: true,
      emailVerified: true,
      phoneVerified: Boolean(fbUser.phoneNumber),
      twoFactorEnabled: false,
      kinshasaBadgeVerified: isAdmin || roleOverride === 'agent' || roleOverride === 'agency',
      createdAt: matchedLegacyUser?.createdAt || new Date().toISOString(),
    };

    // Save profile to Firestore users/{uid} WITHOUT password
    await setDoc(userRef, sanitizeForFirestore(userProfile), { merge: true });

    // If agent, create corresponding agent doc in Firestore
    if (userProfile.role === 'agent') {
      const agentRef = doc(db, COLLECTIONS.AGENTS, fbUser.uid);
      await setDoc(agentRef, sanitizeForFirestore({
        id: fbUser.uid,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone || '+243 81 000 0000',
        avatar: userProfile.avatar,
        agencyName: userProfile.agencyName || 'Kinshasa Immobilier',
        rating: 5.0,
        listingsCount: 0,
        bio: `Agent immobilier vérifié Kinshasa.`,
        isVerified: true,
      }), { merge: true });
    } else if (userProfile.role === 'agency') {
      const agencyRef = doc(db, COLLECTIONS.AGENCIES, fbUser.uid);
      await setDoc(agencyRef, sanitizeForFirestore({
        id: fbUser.uid,
        name: userProfile.agencyName || userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone || '+243 81 000 0000',
        logo: userProfile.avatar,
        city: 'Kinshasa',
        description: `Cabinet / Agence immobilière Kinshasa.`,
        isVerified: true,
      }), { merge: true });
    }
  }

  return userProfile;
}

/**
 * Register account with Firebase Authentication (Email/Password)
 * Passwords are encrypted inside Firebase Auth and NOT in Firestore.
 */
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

  let fbUid = '';
  try {
    const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const fbUser = credential.user;
    fbUid = fbUser.uid;

    if (name || avatarUrl) {
      try {
        await updateProfile(fbUser, {
          displayName: name,
          photoURL: avatarUrl || undefined,
        });
      } catch (e) {
        console.warn('Could not update Firebase Auth profile:', e);
      }
    }
  } catch (authErr: any) {
    console.warn('Firebase Auth user creation warning:', authErr?.code, authErr?.message);
    // If email/password provider is not toggled in Firebase console due to Starter IAM limitations
    if (
      authErr?.code === 'auth/operation-not-allowed' ||
      authErr?.code === 'auth/admin-restricted-operation' ||
      authErr?.message?.includes('operation-not-allowed')
    ) {
      fbUid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    } else {
      throw authErr;
    }
  }

  const isAdmin = email.trim().toLowerCase() === 'joosskalu72@gmail.com';
  const effectiveRole = isAdmin ? 'admin' : (role || 'user');

  const userProfile: User = {
    id: fbUid,
    name: name || email.split('@')[0],
    email: email.trim().toLowerCase(),
    phone: phone || '',
    whatsapp: phone || '',
    role: effectiveRole as any,
    agencyName: (effectiveRole === 'agent' || effectiveRole === 'agency') ? agencyName || 'Kinshasa Immobilier' : undefined,
    rccmOrNif: rccmOrNif,
    avatar: avatarUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
    agentId: (effectiveRole === 'agent' || effectiveRole === 'agency') ? fbUid : undefined,
    planId: effectiveRole === 'agency' ? 'agency' : effectiveRole === 'agent' ? 'pro' : 'starter',
    provider: 'email',
    isVerified: isAdmin,
    emailVerified: false,
    phoneVerified: Boolean(phone),
    twoFactorEnabled: false,
    kinshasaBadgeVerified: effectiveRole === 'agent' || effectiveRole === 'agency' || isAdmin,
    createdAt: new Date().toISOString(),
  };

  const userRef = doc(db, COLLECTIONS.USERS, fbUid);
  await setDoc(userRef, sanitizeForFirestore(userProfile), { merge: true });

  if (effectiveRole === 'agent') {
    const agentRef = doc(db, COLLECTIONS.AGENTS, fbUid);
    await setDoc(agentRef, sanitizeForFirestore({
      id: fbUid,
      name: userProfile.name,
      email: userProfile.email,
      phone: userProfile.phone || '+243 81 000 0000',
      avatar: userProfile.avatar,
      agencyName: userProfile.agencyName || 'Kinshasa Immobilier',
      rating: 5.0,
      listingsCount: 0,
      bio: `Agent immobilier certifié Kinshasa.`,
      isVerified: false,
    }), { merge: true });
  } else if (effectiveRole === 'agency') {
    const agencyRef = doc(db, COLLECTIONS.AGENCIES, fbUid);
    await setDoc(agencyRef, sanitizeForFirestore({
      id: fbUid,
      name: userProfile.agencyName || userProfile.name,
      email: userProfile.email,
      phone: userProfile.phone || '+243 81 000 0000',
      logo: userProfile.avatar,
      city: 'Kinshasa',
      description: `Cabinet immobilier agréé à Kinshasa.`,
      isVerified: false,
    }), { merge: true });
  }

  return userProfile;
}

/**
 * Sign in using Firebase Authentication (Email/Password)
 */
export async function loginWithFirebaseEmailPassword(email: string, password: string): Promise<User> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const fbUser = credential.user;

    const userRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data() as User;
      delete (data as any).password;
      return { id: snap.id, ...data };
    }
  } catch (authErr: any) {
    console.warn('Firebase Auth sign-in warning:', authErr?.code, authErr?.message);
    if (
      authErr?.code !== 'auth/operation-not-allowed' &&
      authErr?.code !== 'auth/admin-restricted-operation' &&
      !authErr?.message?.includes('operation-not-allowed')
    ) {
      throw authErr;
    }
  }

  // Check by email if user document exists in Firestore
  const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', cleanEmail));
  const emailSnap = await getDocs(q);
  if (!emailSnap.empty) {
    const existing = emailSnap.docs[0].data() as User;
    delete (existing as any).password;
    return { id: emailSnap.docs[0].id, ...existing };
  }

  // Fallback create basic profile
  const isAdmin = cleanEmail === 'joosskalu72@gmail.com';
  const fallbackId = `user_${Date.now()}`;
  const fallbackUser: User = {
    id: fallbackId,
    name: email.split('@')[0],
    email: cleanEmail,
    phone: '',
    role: isAdmin ? 'admin' : 'user',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    planId: isAdmin ? 'pro' : 'starter',
    provider: 'email',
    isVerified: true,
    createdAt: new Date().toISOString(),
  };

  const userRef = doc(db, COLLECTIONS.USERS, fallbackId);
  await setDoc(userRef, sanitizeForFirestore(fallbackUser), { merge: true });
  return fallbackUser;
}

export async function logOutFromFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (e) {
    console.error('Firebase signOut error:', e);
  }
}

export function listenToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null);
      return;
    }
    try {
      const userRef = doc(db, COLLECTIONS.USERS, fbUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as User;
        delete (data as any).password;
        callback({ id: snap.id, ...data });
        return;
      }
      // Check legacy doc by email
      if (fbUser.email) {
        const q = query(collection(db, COLLECTIONS.USERS), where('email', '==', fbUser.email.toLowerCase()));
        const snapByEmail = await getDocs(q);
        if (!snapByEmail.empty) {
          const data = snapByEmail.docs[0].data() as User;
          delete (data as any).password;
          callback({ id: snapByEmail.docs[0].id, ...data });
          return;
        }
      }
      // Basic fallback
      const isAdmin = fbUser.email?.toLowerCase() === 'joosskalu72@gmail.com';
      const basicUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || (fbUser.email ? fbUser.email.split('@')[0] : 'Utilisateur'),
        email: fbUser.email || '',
        phone: fbUser.phoneNumber || '',
        role: isAdmin ? 'admin' : 'user',
        avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        planId: isAdmin ? 'pro' : 'starter',
        provider: 'google',
        isVerified: true,
        createdAt: new Date().toISOString(),
      };
      callback(basicUser);
    } catch (e) {
      console.error('Error in onAuthStateChanged profile lookup:', e);
    }
  });
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
  const { ...safeAgent } = agent as any;
  delete safeAgent.password;
  delete safeAgent.pin;
  const ref = doc(db, COLLECTIONS.AGENTS, agent.id);
  await setDoc(ref, sanitizeForFirestore(safeAgent), { merge: true });
}

export async function deleteAgentFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.AGENTS, id);
  await deleteDoc(ref);
}

export async function saveAgencyToFirestore(agency: Agency) {
  const { ...safeAgency } = agency as any;
  delete safeAgency.password;
  delete safeAgency.pin;
  const ref = doc(db, COLLECTIONS.AGENCIES, agency.id);
  await setDoc(ref, sanitizeForFirestore(safeAgency), { merge: true });
}

export async function deleteAgencyFromFirestore(id: string) {
  const ref = doc(db, COLLECTIONS.AGENCIES, id);
  await deleteDoc(ref);
}

