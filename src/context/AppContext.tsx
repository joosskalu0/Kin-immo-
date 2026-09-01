import React, { createContext, useContext, useState, useEffect } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import {
  Property,
  CustomFieldDefinition,
  Agent,
  Agency,
  SavedSearch,
  LeadRequest,
  User,
  PropertyFilters,
  CurrencyCode,
  LanguageCode,
  Invoice,
  SubscriptionPlan,
} from '../types';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}
import {
  initialProperties,
  initialCustomFields,
  initialAgents,
  initialAgencies,
  initialLeads,
  initialInvoices,
  initialSubscriptionPlans,
} from '../data/mockData';
import { translations, languages } from '../utils/i18n';
import Papa from 'papaparse';
import {
  initGoogleAnalytics,
  trackPropertyView,
  trackContactClick,
  DEFAULT_GA_ID
} from '../utils/analytics';
import {
  getRegisteredAccounts,
  syncFirestoreUsersToAuthStore,
  syncFirestoreAgentsToAuthStore,
} from '../lib/authStore';
import {
  seedInitialFirestoreData,
  subscribeToProperties,
  subscribeToCustomFields,
  subscribeToLeads,
  subscribeToInvoices,
  subscribeToAgents,
  subscribeToAgencies,
  subscribeToUsers,
  savePropertyToFirestore,
  getPropertyFromFirestore,
  deletePropertyFromFirestore,
  saveCustomFieldToFirestore,
  deleteCustomFieldFromFirestore,
  saveLeadToFirestore,
  deleteLeadFromFirestore,
  saveUserToFirestore,
  deleteUserFromFirestore,
  saveInvoiceToFirestore,
  deleteInvoiceFromFirestore,
  saveAgentToFirestore,
  deleteAgentFromFirestore,
  saveAgencyToFirestore,
  deleteAgencyFromFirestore,
  subscribeToPricingConfig,
  savePricingConfigToFirestore,
  listenToAuthChanges,
  logOutFromFirebase
} from '../lib/firebase';
import { getAdminCredentials, saveAdminCredentials } from '../lib/adminCredentials';
import { parsePropertyIdFromUrl, updateBrowserUrlForProperty } from '../utils/shareUtils';

interface AppContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currency: CurrencyCode;
  setCurrency: (curr: CurrencyCode) => void;
  t: (key: string) => string;

  user: User | null;
  setUser: (user: User | null) => void;
  deleteUser: (id: string) => void;
  allUsers: User[];
  logOut: () => Promise<void>;

  // Invitation link support for agents & agencies
  invitedRole: 'agent' | 'agency' | null;
  invitedBy: string | null;
  clearInvite: () => void;
  isInviteModalOpen: boolean;
  setIsInviteModalOpen: (open: boolean) => void;

  customFields: CustomFieldDefinition[];
  addCustomField: (field: CustomFieldDefinition) => void;
  updateCustomField: (field: CustomFieldDefinition) => void;
  deleteCustomField: (id: string) => void;

  properties: Property[];
  addProperty: (property: Property) => Promise<void> | void;
  updateProperty: (property: Property) => Promise<void> | void;
  deleteProperty: (id: string) => void;

  agents: Agent[];
  addAgent: (agent: Agent) => void;
  updateAgent: (agent: Agent) => void;
  deleteAgent: (id: string) => void;
  toggleAgentVisibility: (agentId: string) => void;
  updateAgentVerification: (
    agentId: string,
    isVerified: boolean,
    verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected',
    rejectionReason?: string,
    verifiedBy?: string
  ) => void;
  updateAgentVerificationDocument: (
    agentId: string,
    docId: string,
    status: 'approved' | 'rejected',
    rejectionNote?: string
  ) => void;
  submitAgentVerificationDocuments: (
    agentId: string,
    documents: import('../types').VerificationDocument[],
    identityDocType?: any,
    identityDocNumber?: string,
    rccmOrNif?: string
  ) => void;

  agencies: Agency[];
  addAgency: (agency: Agency) => void;
  updateAgency: (agency: Agency) => void;
  deleteAgency: (id: string) => void;
  toggleAgencyVisibility: (agencyId: string) => void;
  updateAgencySubscriptionStatus: (agencyId: string, status: 'Active' | 'Expired', expiresAt?: string) => void;
  updateUserSubscriptionStatus: (targetIdOrEmail: string, status: 'Active' | 'Expired', expiresAt?: string) => void;

  // Subscription Plans & Pricing in Francs Congolais (CDF)
  subscriptionPlans: SubscriptionPlan[];
  updateSubscriptionPlan: (plan: SubscriptionPlan) => void;
  addSubscriptionPlan: (plan: SubscriptionPlan) => void;
  deleteSubscriptionPlan: (id: string) => void;
  pricingDisplayCurrency: 'CDF' | 'USD' | 'BOTH';
  setPricingDisplayCurrency: (mode: 'CDF' | 'USD' | 'BOTH') => void;
  cdfExchangeRate: number;
  setCdfExchangeRate: (rate: number) => void;

  wishlist: string[];
  toggleWishlist: (propertyId: string) => void;

  compareList: string[];
  toggleCompare: (propertyId: string) => void;
  clearCompare: () => void;

  savedSearches: SavedSearch[];
  addSavedSearch: (title: string, notifyFrequency: SavedSearch['notifyFrequency']) => void;
  deleteSavedSearch: (id: string) => void;

  leads: LeadRequest[];
  addLeadRequest: (lead: Omit<LeadRequest, 'id' | 'createdAt' | 'status'>) => void;
  updateLeadStatus: (leadId: string, status: LeadRequest['status']) => void;
  deleteLead: (id: string) => void;

  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (invoice: Invoice) => void;
  updateInvoiceStatus: (id: string, status: Invoice['status'], paymentMethod?: Invoice['paymentMethod'], notes?: string) => void;
  deleteInvoice: (id: string) => void;

  adminPin: string;
  updateAdminPin: (newPin: string) => Promise<void>;

  filters: PropertyFilters;
  setFilters: React.Dispatch<React.SetStateAction<PropertyFilters>>;
  resetFilters: () => void;

  // Modals & Active State
  activePropertyModalId: string | null;
  setActivePropertyModalId: (id: string | null) => void;
  isFieldsBuilderOpen: boolean;
  setIsFieldsBuilderOpen: (open: boolean) => void;
  isSubmitPropertyOpen: boolean;
  setIsSubmitPropertyOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  isSecurityModalOpen: boolean;
  setIsSecurityModalOpen: (open: boolean) => void;
  isCompareOpen: boolean;
  setIsCompareOpen: (open: boolean) => void;
  editingProperty: Property | null;
  setEditingProperty: (prop: Property | null) => void;

  importCSV: (csvContent: string) => void;
  exportCSV: () => void;

  // Google Analytics & Listing Views Tracking
  googleAnalyticsId: string;
  updateGoogleAnalyticsId: (newId: string) => void;
  incrementPropertyViews: (propertyId: string) => void;
  recordPropertyAction: (propertyId: string, action: 'whatsapp' | 'call' | 'lead' | 'share') => void;

  requestConfirm: (options: ConfirmOptions) => void;
}

const defaultFilters: PropertyFilters = {
  searchQuery: '',
  city: '',
  type: 'all',
  status: 'all',
  category: '',
  minPrice: 0,
  maxPrice: 5000000,
  minBedrooms: 0,
  minBathrooms: 0,
  minArea: 0,
  maxArea: 2000,
  labels: [],
  amenities: [],
  customFields: {},
  sortBy: 'newest',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const DURABLE_PROPERTIES_KEY = 'immocraft_durable_published_properties';
const DELETED_PROPERTIES_KEY = 'immocraft_deleted_properties_registry';

const getDurableLocalProperties = (): Property[] => {
  try {
    const raw = localStorage.getItem(DURABLE_PROPERTIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const saveDurableLocalProperties = (list: Property[]) => {
  try {
    localStorage.setItem(DURABLE_PROPERTIES_KEY, JSON.stringify(list));
  } catch {}
};

const getDeletedPropertiesIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_PROPERTIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
};

const markPropertyAsDeletedLocally = (id: string) => {
  try {
    const deleted = getDeletedPropertiesIds();
    deleted.add(id);
    localStorage.setItem(DELETED_PROPERTIES_KEY, JSON.stringify(Array.from(deleted)));
  } catch {}
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('fr');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [user, setUser] = useState<User | null>(null);

  // Invitation link state for agents & agencies
  const [invitedRole, setInvitedRole] = useState<'agent' | 'agency' | null>(null);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Proactively clean up legacy temporary items
  useEffect(() => {
    try {
      localStorage.removeItem('estatik_kinshasa_user');
      localStorage.removeItem('estatik_admin_credentials_v1');
      localStorage.removeItem('immocraft_agents');
      localStorage.removeItem('immocraft_agencies');
      localStorage.removeItem('estatik_registered_users');
      localStorage.removeItem('immocraft_custom_fields');
      localStorage.removeItem('immocraft_saved_searches');
      localStorage.removeItem('kin_tracking_config');
    } catch {}
  }, []);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsub = listenToAuthChanges((fbUser) => {
      setUser(fbUser);
    });
    return () => unsub();
  }, []);

  // Check URL query parameters for agent/agency invitation links
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const inviteParam = params.get('invite');
        const refParam = params.get('ref') || params.get('agency');
        if (inviteParam === 'agent' || inviteParam === 'agency') {
          setInvitedRole(inviteParam);
          setInvitedBy(refParam || null);
          setIsAuthModalOpen(true);
        }
      } catch (e) {
        console.warn('Error reading invite search params:', e);
      }
    }
  }, []);

  const clearInvite = () => {
    setInvitedRole(null);
    setInvitedBy(null);
  };

  const logOut = async () => {
    setUser(null);
    await logOutFromFirebase();
  };

  // Firestore is the single source of truth - initialized with clean mock data and durable local cache
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(initialCustomFields);
  const [properties, setProperties] = useState<Property[]>(() => {
    const durable = getDurableLocalProperties();
    const deleted = getDeletedPropertiesIds();
    const map = new Map<string, Property>();
    initialProperties.forEach((p) => {
      if (!deleted.has(p.id)) map.set(p.id, p);
    });
    durable.forEach((p) => {
      if (!deleted.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values());
  });
  const [allUsers, setAllUsers] = useState<User[]>(() => getRegisteredAccounts());
  const [agents, setAgents] = useState<Agent[]>(initialAgents);
  const [agencies, setAgencies] = useState<Agency[]>(initialAgencies);

  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(initialSubscriptionPlans);

  const [pricingDisplayCurrency, setPricingDisplayCurrency] = useState<'CDF' | 'USD' | 'BOTH'>('CDF');
  const [cdfExchangeRate, setCdfExchangeRate] = useState<number>(2800);

  const [wishlist, setWishlist] = useState<string[]>(['prop_1', 'prop_2']);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([
    {
      id: 'search_1',
      userId: 'user_admin',
      title: 'Penthouse Paris > 150m²',
      filters: { city: 'Paris', type: 'penthouse', minArea: 150 },
      notifyFrequency: 'instant',
      createdAt: '2026-08-01T12:00:00Z',
    }
  ]);

  const [leads, setLeads] = useState<LeadRequest[]>(initialLeads);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filters, setFilters] = useState<PropertyFilters>(defaultFilters);

  // Modals & Deep Linking
  const [activePropertyModalId, setActivePropertyModalId] = useState<string | null>(() => {
    return parsePropertyIdFromUrl();
  });
  const [isFieldsBuilderOpen, setIsFieldsBuilderOpen] = useState(false);
  const [isSubmitPropertyOpen, setIsSubmitPropertyOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Deep-linking URL Synchronization & Browser History Navigation
  useEffect(() => {
    const handlePopState = () => {
      const propId = parsePropertyIdFromUrl();
      setActivePropertyModalId(propId);
      if (propId) {
        incrementPropertyViews(propId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // When activePropertyModalId changes or properties list updates, sync URL & fetch from Firestore if missing
  useEffect(() => {
    if (!activePropertyModalId) {
      updateBrowserUrlForProperty(null);
      return;
    }

    const foundProp = properties.find((p) => p.id === activePropertyModalId);
    if (foundProp) {
      updateBrowserUrlForProperty(foundProp.id, foundProp.title);
    } else {
      // Property might be stored in Firestore but not yet in local state
      let isMounted = true;
      getPropertyFromFirestore(activePropertyModalId).then((fetchedProp) => {
        if (isMounted && fetchedProp) {
          setProperties((prev) => {
            if (prev.some((p) => p.id === fetchedProp.id)) return prev;
            return [fetchedProp, ...prev];
          });
          updateBrowserUrlForProperty(fetchedProp.id, fetchedProp.title);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [activePropertyModalId, properties]);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);

  const requestConfirm = (options: ConfirmOptions) => {
    setConfirmState(options);
  };

  // Google Analytics ID State
  const [googleAnalyticsId, setGoogleAnalyticsIdState] = useState<string>(DEFAULT_GA_ID);

  useEffect(() => {
    initGoogleAnalytics(googleAnalyticsId);
  }, [googleAnalyticsId]);

  const updateGoogleAnalyticsId = (newId: string) => {
    const cleanId = newId.trim() || DEFAULT_GA_ID;
    setGoogleAnalyticsIdState(cleanId);
    initGoogleAnalytics(cleanId);
  };

  const [adminPin, setAdminPinState] = useState<string>(() => {
    const creds = getAdminCredentials();
    return creds.pin || 'kalu2002jooss';
  });

  const updateAdminPin = async (newPin: string) => {
    setAdminPinState(newPin);
    saveAdminCredentials({ pin: newPin });
  };

  // Initialize and subscribe to Firestore (Single source of truth)
  useEffect(() => {
    // Seed initial data if Firestore collections are empty
    seedInitialFirestoreData();

    // Subscribe to real-time updates from Firestore
    const unsubProperties = subscribeToProperties((firestoreProps) => {
      if (Array.isArray(firestoreProps)) {
        setProperties((currentLocalProps) => {
          const deleted = getDeletedPropertiesIds();
          const durable = getDurableLocalProperties();
          const propsMap = new Map<string, Property>();

          // 1. Load baseline & local durable properties
          currentLocalProps.forEach((p) => {
            if (!deleted.has(p.id)) propsMap.set(p.id, p);
          });
          durable.forEach((p) => {
            if (!deleted.has(p.id)) propsMap.set(p.id, p);
          });

          // 2. Merge Firestore properties (authoritative updates)
          firestoreProps.forEach((fp) => {
            if (!deleted.has(fp.id)) {
              propsMap.set(fp.id, fp);
            }
          });

          const merged = Array.from(propsMap.values());
          saveDurableLocalProperties(merged);
          return merged;
        });
      }
    });

    const unsubFields = subscribeToCustomFields((firestoreFields) => {
      if (Array.isArray(firestoreFields)) {
        setCustomFields(firestoreFields);
      }
    });

    const unsubLeads = subscribeToLeads((firestoreLeads) => {
      if (Array.isArray(firestoreLeads)) {
        setLeads(firestoreLeads);
      }
    });

    const unsubInvoices = subscribeToInvoices((firestoreInvoices) => {
      if (Array.isArray(firestoreInvoices)) {
        setInvoices(firestoreInvoices);
      }
    });

    const unsubAgents = subscribeToAgents((firestoreAgents) => {
      if (Array.isArray(firestoreAgents)) {
        setAgents(firestoreAgents);
        try {
          syncFirestoreAgentsToAuthStore(firestoreAgents);
        } catch (e) {
          console.error('Error syncing firestore agents to auth store:', e);
        }
      }
    });

    const unsubAgencies = subscribeToAgencies((firestoreAgencies) => {
      if (Array.isArray(firestoreAgencies)) {
        setAgencies(firestoreAgencies);
      }
    });

    const unsubUsers = subscribeToUsers((firestoreUsers) => {
      if (Array.isArray(firestoreUsers) && firestoreUsers.length > 0) {
        setAllUsers(firestoreUsers);
        try {
          syncFirestoreUsersToAuthStore(firestoreUsers);
        } catch (e) {
          console.error('Error syncing firestore users to auth store:', e);
        }
      }
    });

    const unsubPricing = subscribeToPricingConfig((firestorePricing) => {
      if (firestorePricing) {
        if (typeof firestorePricing.cdfExchangeRate === 'number' && firestorePricing.cdfExchangeRate > 0) {
          setCdfExchangeRate(firestorePricing.cdfExchangeRate);
        }
        if (firestorePricing.pricingDisplayCurrency) {
          setPricingDisplayCurrency(firestorePricing.pricingDisplayCurrency);
        }
        if (Array.isArray(firestorePricing.subscriptionPlans) && firestorePricing.subscriptionPlans.length > 0) {
          setSubscriptionPlans(firestorePricing.subscriptionPlans);
        }
      }
    });

    return () => {
      unsubProperties();
      unsubFields();
      unsubLeads();
      unsubInvoices();
      unsubAgents();
      unsubAgencies();
      unsubUsers();
      unsubPricing();
    };
  }, []);

  // Sync user profile to Firestore (never password)
  useEffect(() => {
    if (user) {
      saveUserToFirestore(user).catch(err => console.error('Error saving user to Firestore:', err));
    }
  }, [user]);

  // Translate helper
  const t = (key: string): string => {
    return translations[language]?.[key] || translations['fr']?.[key] || key;
  };

  // Custom Fields Actions
  const addCustomField = (field: CustomFieldDefinition) => {
    setCustomFields((prev) => [...prev, field]);
    saveCustomFieldToFirestore(field).catch(err => console.error(err));
  };

  const updateCustomField = (field: CustomFieldDefinition) => {
    setCustomFields((prev) => prev.map((f) => (f.id === field.id ? field : f)));
    saveCustomFieldToFirestore(field).catch(err => console.error(err));
  };

  const deleteCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
    deleteCustomFieldFromFirestore(id).catch(err => console.error(err));
  };

  // Properties Actions
  const addProperty = async (property: Property) => {
    setProperties((prev) => {
      const exists = prev.some((p) => p.id === property.id);
      const next = exists ? prev.map((p) => (p.id === property.id ? property : p)) : [property, ...prev];
      saveDurableLocalProperties(next);
      return next;
    });
    try {
      await savePropertyToFirestore(property);
    } catch (err) {
      console.warn('Firestore save property notice (retained in durable storage):', err);
    }
  };

  const updateProperty = async (property: Property) => {
    setProperties((prev) => {
      const next = prev.map((p) => (p.id === property.id ? property : p));
      saveDurableLocalProperties(next);
      return next;
    });
    try {
      await savePropertyToFirestore(property);
    } catch (err) {
      console.warn('Firestore update property notice:', err);
    }
  };

  const deleteProperty = (id: string) => {
    markPropertyAsDeletedLocally(id);
    setProperties((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveDurableLocalProperties(next);
      return next;
    });
    deletePropertyFromFirestore(id).catch((err) => console.error('Firestore delete property error:', err));
  };

  // Agent Actions
  const addAgent = (agent: Agent) => {
    setAgents((prev) => [agent, ...prev]);
    saveAgentToFirestore(agent).catch((err) => console.error('Firestore save agent error:', err));
  };

  const updateAgent = (agent: Agent) => {
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? agent : a)));
    saveAgentToFirestore(agent).catch((err) => console.error('Firestore update agent error:', err));
  };

  const deleteAgent = (id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    deleteAgentFromFirestore(id).catch((err) => console.error('Firestore delete agent error:', err));
  };

  const toggleAgentVisibility = (agentId: string) => {
    let updatedAgentObj: Agent | null = null;
    setAgents((prev) => {
      const updated = prev.map((a) => {
        if (a.id === agentId || (a.email && a.email.toLowerCase() === agentId.toLowerCase())) {
          const updatedA = { ...a, isHidden: !a.isHidden };
          updatedAgentObj = updatedA;
          return updatedA;
        }
        return a;
      });
      return updated;
    });
    if (updatedAgentObj) {
      saveAgentToFirestore(updatedAgentObj).catch((err) => console.error('Firestore toggle agent visibility error:', err));
    }
  };

  // Agent Verification Management (Admin & Pro Agent)
  const updateAgentVerification = (
    agentId: string,
    isVerified: boolean,
    verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected',
    rejectionReason?: string,
    verifiedBy?: string
  ) => {
    const now = new Date().toISOString();
    let updatedAgentObj: Agent | null = null;

    setAgents((prev) => {
      const updated = prev.map((a) => {
        if (a.id === agentId || (a.email && a.email.toLowerCase() === agentId.toLowerCase())) {
          const updatedDocList = (a.verificationDocuments || []).map((doc) => ({
            ...doc,
            status: verificationStatus === 'verified' ? ('approved' as const) : verificationStatus === 'rejected' ? ('rejected' as const) : doc.status,
            verifiedAt: verificationStatus === 'verified' ? now : doc.verifiedAt,
            verifiedBy: verificationStatus === 'verified' ? (verifiedBy || 'Admin Immocraft') : doc.verifiedBy,
          }));

          const updatedAgent: Agent = {
            ...a,
            isVerified,
            verificationStatus,
            verifiedAt: isVerified ? now : undefined,
            verifiedBy: isVerified ? (verifiedBy || 'Direction Immocraft RDC (Admin Audit)') : undefined,
            rejectionReason: verificationStatus === 'rejected' ? rejectionReason : undefined,
            verificationDocuments: updatedDocList,
          };
          updatedAgentObj = updatedAgent;
          return updatedAgent;
        }
        return a;
      });

      return updated;
    });

    if (updatedAgentObj) {
      saveAgentToFirestore(updatedAgentObj).catch((err) => console.error('Firestore save agent verification error:', err));
    }

    // Sync with allUsers in case the agent is a registered user
    setAllUsers((prevUsers) => {
      const updatedUsers = prevUsers.map((u) => {
        if (u.id === agentId || u.agentId === agentId || (u.email && u.email.toLowerCase() === agentId.toLowerCase())) {
          const updatedUser: User = {
            ...u,
            isVerified,
            verificationStatus,
            verifiedAt: isVerified ? now : undefined,
            verifiedBy: isVerified ? (verifiedBy || 'Direction Immocraft RDC') : undefined,
            rejectionReason: verificationStatus === 'rejected' ? rejectionReason : undefined,
            kinshasaBadgeVerified: isVerified,
          };
          saveUserToFirestore(updatedUser).catch((err) => console.error('Firestore save user verification error:', err));
          return updatedUser;
        }
        return u;
      });
      return updatedUsers;
    });

    // Update logged in user if matching
    if (user && (user.id === agentId || user.agentId === agentId || (user.email && user.email.toLowerCase() === agentId.toLowerCase()))) {
      setUser((prev) => prev ? ({
        ...prev,
        isVerified,
        verificationStatus,
        verifiedAt: isVerified ? now : undefined,
        verifiedBy: isVerified ? (verifiedBy || 'Direction Immocraft RDC') : undefined,
        rejectionReason: verificationStatus === 'rejected' ? rejectionReason : undefined,
        kinshasaBadgeVerified: isVerified,
      }) : null);
    }
  };

  const updateAgentVerificationDocument = (
    agentId: string,
    docId: string,
    status: 'approved' | 'rejected',
    rejectionNote?: string
  ) => {
    const now = new Date().toISOString();
    let updatedAgentObj: Agent | null = null;

    setAgents((prev) => {
      const updated = prev.map((a) => {
        if (a.id === agentId || (a.email && a.email.toLowerCase() === agentId.toLowerCase())) {
          const updatedDocs = (a.verificationDocuments || []).map((doc) => {
            if (doc.id === docId) {
              return {
                ...doc,
                status,
                rejectionNote: status === 'rejected' ? rejectionNote : undefined,
                verifiedAt: status === 'approved' ? now : undefined,
                verifiedBy: status === 'approved' ? 'Admin Immocraft' : undefined,
              };
            }
            return doc;
          });

          // Check if all documents are approved
          const allApproved = updatedDocs.length > 0 && updatedDocs.every((d) => d.status === 'approved');
          const hasRejected = updatedDocs.some((d) => d.status === 'rejected');

          const newVerificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected' = allApproved
            ? 'verified'
            : hasRejected
            ? 'rejected'
            : 'pending';

          const updatedAgent: Agent = {
            ...a,
            verificationDocuments: updatedDocs,
            isVerified: allApproved,
            verificationStatus: newVerificationStatus,
            verifiedAt: allApproved ? now : a.verifiedAt,
            verifiedBy: allApproved ? 'Direction Immocraft RDC' : a.verifiedBy,
          };
          updatedAgentObj = updatedAgent;
          return updatedAgent;
        }
        return a;
      });

      return updated;
    });

    if (updatedAgentObj) {
      saveAgentToFirestore(updatedAgentObj).catch((err) => console.error('Firestore save agent doc status error:', err));
    }
  };

  const submitAgentVerificationDocuments = (
    agentId: string,
    documents: import('../types').VerificationDocument[],
    identityDocType?: any,
    identityDocNumber?: string,
    rccmOrNif?: string
  ) => {
    const now = new Date().toISOString();
    let updatedAgentObj: Agent | null = null;

    setAgents((prev) => {
      let found = false;
      const updated = prev.map((a) => {
        if (a.id === agentId || (a.email && a.email.toLowerCase() === agentId.toLowerCase())) {
          found = true;
          const mergedDocs = [...(a.verificationDocuments || []), ...documents];
          const updatedAgent: Agent = {
            ...a,
            verificationStatus: 'pending',
            isVerified: false,
            verificationRequestedAt: now,
            identityDocType: identityDocType || a.identityDocType,
            identityDocNumber: identityDocNumber || a.identityDocNumber,
            rccmOrNif: rccmOrNif || a.rccmOrNif,
            verificationDocuments: mergedDocs,
            rejectionReason: undefined,
          };
          updatedAgentObj = updatedAgent;
          return updatedAgent;
        }
        return a;
      });

      if (!found && user) {
        // Create new agent entry if it didn't exist
        const newAgent: Agent = {
          id: agentId,
          name: user.name || 'Agent Immobilier',
          title: 'Agent Immobilier Agréé',
          email: user.email || '',
          phone: user.phone || '+243 81 000 0000',
          whatsapp: user.whatsapp || user.phone || '+243 81 000 0000',
          avatar: user.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
          agencyName: user.agencyName || 'Indépendant Kinshasa',
          rating: 5.0,
          reviewCount: 1,
          listingsCount: 0,
          bio: 'Agent immobilier partenaire certifié Immocraft Kinshasa.',
          specialties: ['Résidentiel', 'Commercial'],
          languages: ['Français', 'Lingala'],
          verificationStatus: 'pending',
          isVerified: false,
          verificationRequestedAt: now,
          identityDocType,
          identityDocNumber,
          rccmOrNif,
          verificationDocuments: documents,
        };
        updated.push(newAgent);
        updatedAgentObj = newAgent;
      }

      return updated;
    });

    if (updatedAgentObj) {
      saveAgentToFirestore(updatedAgentObj).catch((err) => console.error('Firestore save agent submitted docs error:', err));
    }

    // Sync logged in user
    if (user && (user.id === agentId || user.agentId === agentId || (user.email && user.email.toLowerCase() === agentId.toLowerCase()))) {
      setUser((prev) => prev ? ({
        ...prev,
        verificationStatus: 'pending',
        isVerified: false,
        verificationRequestedAt: now,
        identityDocType,
        identityDocNumber,
        rccmOrNif,
        verificationDocuments: documents,
        rejectionReason: undefined,
      }) : null);
    }
  };

  // Agency (Concessionnaire) Actions
  const addAgency = (agency: Agency) => {
    const nextExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const agencyWithFreeTrial: Agency = {
      ...agency,
      subscriptionStatus: 'Active',
      subscriptionExpiresAt: agency.subscriptionExpiresAt || nextExpiry,
      lastPaymentDate: new Date().toISOString().split('T')[0],
    };

    setAgencies((prev) => [agencyWithFreeTrial, ...prev]);
    saveAgencyToFirestore(agencyWithFreeTrial).catch((err) => console.error('Firestore save agency error:', err));

    // Auto-generate 1 month free welcome invoice ($0)
    const promoInvoice: Invoice = {
      id: `inv_free_${Date.now()}`,
      invoiceNumber: `KIN-FREE-${Math.floor(1000 + Math.random() * 9000)}`,
      targetType: 'agency',
      targetId: agencyWithFreeTrial.id,
      targetName: agencyWithFreeTrial.name,
      targetEmail: agencyWithFreeTrial.email,
      targetPhone: agencyWithFreeTrial.phone,
      planId: 'agency',
      items: [
        {
          id: `item_free_${Date.now()}`,
          description: `Abonnement Agence Immobilière - 1er Mois Gratuit (Offre Spéciale de Bienvenue)`,
          amount: 0,
          quantity: 1
        }
      ],
      subtotalAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      currency: 'USD',
      status: 'paid',
      paymentMethod: 'orange_money',
      dueDate: nextExpiry,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      notes: 'Offre spéciale de bienvenue : 1 mois d\'abonnement offert gratuitement à toute nouvelle agence.'
    };

    setInvoices((prev) => [promoInvoice, ...prev]);
    saveInvoiceToFirestore(promoInvoice).catch(err => console.error(err));
  };

  const updateAgency = (agency: Agency) => {
    setAgencies((prev) => prev.map((a) => (a.id === agency.id ? agency : a)));
    saveAgencyToFirestore(agency).catch((err) => console.error('Firestore update agency error:', err));
  };

  const deleteAgency = (id: string) => {
    setAgencies((prev) => prev.filter((a) => a.id !== id));
    deleteAgencyFromFirestore(id).catch((err) => console.error('Firestore delete agency error:', err));
  };

  const toggleAgencyVisibility = (agencyId: string) => {
    let updatedAgencyObj: Agency | null = null;
    setAgencies((prev) => {
      const updated = prev.map((ag) => {
        if (ag.id === agencyId || ag.name.toLowerCase() === agencyId.toLowerCase()) {
          const updatedAg = { ...ag, isHidden: !ag.isHidden };
          updatedAgencyObj = updatedAg;
          return updatedAg;
        }
        return ag;
      });
      return updated;
    });
    if (updatedAgencyObj) {
      saveAgencyToFirestore(updatedAgencyObj).catch((err) => console.error('Firestore toggle agency visibility error:', err));
    }
  };

  // Subscription Plans Management (CDF & USD)
  const updateSubscriptionPlan = (plan: SubscriptionPlan) => {
    setSubscriptionPlans((prev) => {
      const updated = prev.map((p) => (p.id === plan.id ? plan : p));
      savePricingConfigToFirestore({
        cdfExchangeRate,
        pricingDisplayCurrency,
        subscriptionPlans: updated,
      }).catch(err => console.error('Firestore save pricing config error:', err));
      return updated;
    });
  };

  const addSubscriptionPlan = (plan: SubscriptionPlan) => {
    setSubscriptionPlans((prev) => {
      const updated = [...prev, plan];
      savePricingConfigToFirestore({
        cdfExchangeRate,
        pricingDisplayCurrency,
        subscriptionPlans: updated,
      }).catch(err => console.error('Firestore add pricing config error:', err));
      return updated;
    });
  };

  const deleteSubscriptionPlan = (id: string) => {
    setSubscriptionPlans((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      savePricingConfigToFirestore({
        cdfExchangeRate,
        pricingDisplayCurrency,
        subscriptionPlans: updated,
      }).catch(err => console.error('Firestore delete pricing plan error:', err));
      return updated;
    });
  };

  const handleSetCdfExchangeRate = (rate: number) => {
    if (typeof rate === 'number' && rate > 0) {
      setCdfExchangeRate(rate);
      savePricingConfigToFirestore({
        cdfExchangeRate: rate,
        pricingDisplayCurrency,
        subscriptionPlans,
      }).catch(err => console.error('Firestore save cdf exchange rate error:', err));
    }
  };

  const handleSetPricingDisplayCurrency = (currency: 'CDF' | 'USD' | 'BOTH') => {
    setPricingDisplayCurrency(currency);
    savePricingConfigToFirestore({
      cdfExchangeRate,
      pricingDisplayCurrency: currency,
      subscriptionPlans,
    }).catch(err => console.error('Firestore save pricing display currency error:', err));
  };

  const updateAgencySubscriptionStatus = (agencyId: string, status: 'Active' | 'Expired', expiresAt?: string) => {
    const nextExpiry = expiresAt || (status === 'Active'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]);

    setAgencies((prev) => {
      const updated = prev.map((ag) => {
        if (ag.id === agencyId || ag.name.toLowerCase() === agencyId.toLowerCase() || ag.email?.toLowerCase() === agencyId.toLowerCase()) {
          const updatedAg: Agency = {
            ...ag,
            subscriptionStatus: status,
            subscriptionExpiresAt: nextExpiry,
            ...(status === 'Active' ? { unpaidInvoiceId: undefined } : {})
          };
          saveAgencyToFirestore(updatedAg).catch((err) => console.error('Firestore update agency subscription status error:', err));
          return updatedAg;
        }
        return ag;
      });
      return updated;
    });

    // Also sync user if logged in under this agency
    if (user && (user.agencyId === agencyId || (user.agencyName && user.agencyName.toLowerCase() === agencyId.toLowerCase()))) {
      const updatedUser: User = {
        ...user,
        subscriptionStatus: status,
        subscriptionExpiresAt: nextExpiry,
      };
      setUser(updatedUser);
      saveUserToFirestore(updatedUser).catch((err) => console.error('Firestore update user error:', err));
    }
  };

  const updateUserSubscriptionStatus = (targetIdOrEmail: string, status: 'Active' | 'Expired', expiresAt?: string) => {
    const nextExpiry = expiresAt || (status === 'Active'
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]);

    setAgents((prev) => {
      const updated = prev.map((agt) => {
        if (agt.id === targetIdOrEmail || agt.email?.toLowerCase() === targetIdOrEmail.toLowerCase()) {
          const updatedAgt: Agent = {
            ...agt,
            subscriptionStatus: status,
            subscriptionExpiresAt: nextExpiry,
          };
          saveAgentToFirestore(updatedAgt).catch((err) => console.error('Firestore update agent error:', err));
          return updatedAgt;
        }
        return agt;
      });
      return updated;
    });

    if (user && (user.id === targetIdOrEmail || user.email?.toLowerCase() === targetIdOrEmail.toLowerCase())) {
      const updatedUser: User = {
        ...user,
        subscriptionStatus: status,
        subscriptionExpiresAt: nextExpiry,
      };
      setUser(updatedUser);
      saveUserToFirestore(updatedUser).catch((err) => console.error('Firestore update user error:', err));
    }
  };

  // Wishlist Actions
  const toggleWishlist = (propertyId: string) => {
    setWishlist((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  // Compare Actions
  const toggleCompare = (propertyId: string) => {
    setCompareList((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : prev.length >= 4
        ? prev // Limit max 4 properties
        : [...prev, propertyId]
    );
  };

  const clearCompare = () => {
    setCompareList([]);
  };

  // Saved Search Actions
  const addSavedSearch = (title: string, notifyFrequency: SavedSearch['notifyFrequency']) => {
    const newSearch: SavedSearch = {
      id: `search_${Date.now()}`,
      userId: user?.id || 'guest',
      title: title || `${filters.city || 'Toutes Villes'} - ${filters.type}`,
      filters: { ...filters },
      notifyFrequency,
      createdAt: new Date().toISOString(),
    };
    setSavedSearches((prev) => [newSearch, ...prev]);
  };

  const deleteSavedSearch = (id: string) => {
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
  };

  // Leads Actions
  const addLeadRequest = (lead: Omit<LeadRequest, 'id' | 'createdAt' | 'status'>) => {
    const newLead: LeadRequest = {
      ...lead,
      id: `lead_${Date.now()}`,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    setLeads((prev) => [newLead, ...prev]);
    saveLeadToFirestore(newLead).catch(err => console.error(err));
  };

  const updateLeadStatus = (leadId: string, status: LeadRequest['status']) => {
    setLeads((prev) => {
      const updated = prev.map((l) => (l.id === leadId ? { ...l, status } : l));
      const targetLead = updated.find((l) => l.id === leadId);
      if (targetLead) {
        saveLeadToFirestore(targetLead).catch(err => console.error(err));
      }
      return updated;
    });
  };

  const deleteLead = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    deleteLeadFromFirestore(id).catch(err => console.error(err));
  };

  const deleteUser = (id: string) => {
    if (user && (user.id === id || user.email === id)) {
      setUser(null);
    }
    deleteUserFromFirestore(id).catch((err) => console.error(err));
  };

  // Invoices Actions
  const addInvoice = (invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
    saveInvoiceToFirestore(invoice).catch(err => console.error(err));
  };

  const updateInvoice = (updatedInvoice: Invoice) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
    saveInvoiceToFirestore(updatedInvoice).catch(err => console.error(err));
  };

  const updateInvoiceStatus = (id: string, status: Invoice['status'], paymentMethod?: Invoice['paymentMethod'], notes?: string) => {
    setInvoices((prev) => {
      const updated = prev.map((inv) => {
        if (inv.id === id) {
          const updatedInv: Invoice = {
            ...inv,
            status,
            ...(paymentMethod ? { paymentMethod } : {}),
            ...(notes ? { notes } : {}),
            ...(status === 'paid' ? { paidAt: new Date().toISOString() } : {})
          };
          saveInvoiceToFirestore(updatedInv).catch(err => console.error(err));

          // Auto update subscription status of target
          if (status === 'paid') {
            const nextExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            if (inv.targetType === 'agency' || inv.targetId.startsWith('agency_')) {
              updateAgencySubscriptionStatus(inv.targetId, 'Active', nextExpiry);
            }
            updateUserSubscriptionStatus(inv.targetId, 'Active', nextExpiry);
            if (inv.targetEmail) {
              updateUserSubscriptionStatus(inv.targetEmail, 'Active', nextExpiry);
            }
          } else if (status === 'overdue') {
            if (inv.targetType === 'agency' || inv.targetId.startsWith('agency_')) {
              updateAgencySubscriptionStatus(inv.targetId, 'Expired');
            }
            updateUserSubscriptionStatus(inv.targetId, 'Expired');
            if (inv.targetEmail) {
              updateUserSubscriptionStatus(inv.targetEmail, 'Expired');
            }
          }

          return updatedInv;
        }
        return inv;
      });
      return updated;
    });
  };

  const deleteInvoice = (id: string) => {
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    deleteInvoiceFromFirestore(id).catch(err => console.error(err));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  // CSV Import / Export
  const importCSV = (csvContent: string) => {
    Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const imported: Property[] = results.data.map((row: any, idx: number) => ({
          id: `prop_csv_${Date.now()}_${idx}`,
          title: row.title || 'Propriété Importée',
          description: row.description || 'Description importée via CSV',
          price: Number(row.price) || 500000,
          currency: row.currency || 'EUR',
          type: row.type || 'apartment',
          status: row.status || 'for-sale',
          labels: row.labels ? row.labels.split(';') : ['new'],
          category: row.category || 'Général',
          address: row.address || 'Adresse Inconnue',
          city: row.city || 'Paris',
          zipCode: row.zipCode || '75000',
          country: row.country || 'France',
          lat: Number(row.lat) || 48.8566,
          lng: Number(row.lng) || 2.3522,
          bedrooms: Number(row.bedrooms) || 2,
          bathrooms: Number(row.bathrooms) || 1,
          area: Number(row.area) || 75,
          amenities: row.amenities ? row.amenities.split(';') : ['Ascenseur'],
          images: row.images ? row.images.split(';') : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'],
          customFields: {},
          agentId: user?.agentId || 'agent_1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          viewsCount: 1,
          featured: false,
          published: true,
        }));

        setProperties((prev) => [...imported, ...prev]);
      },
    });
  };

  const exportCSV = () => {
    const csvData = properties.map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      currency: p.currency,
      type: p.type,
      status: p.status,
      city: p.city,
      address: p.address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area,
      viewsCount: p.viewsCount,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ImmoCraft_Properties_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    if (link.parentNode) {
      link.parentNode.removeChild(link);
    } else {
      link.remove();
    }
  };

  // Google Analytics & Property View Incrementing
  const incrementPropertyViews = (propertyId: string) => {
    setProperties((prev) => {
      const updated = prev.map((p) => {
        if (p.id === propertyId) {
          const updatedProp: Property = {
            ...p,
            viewsCount: (p.viewsCount || 0) + 1,
            lastViewedAt: new Date().toISOString()
          };
          trackPropertyView(updatedProp);
          savePropertyToFirestore(updatedProp).catch((err) =>
            console.error('Firestore increment views error:', err)
          );
          return updatedProp;
        }
        return p;
      });
      return updated;
    });
  };

  const recordPropertyAction = (propertyId: string, action: 'whatsapp' | 'call' | 'lead' | 'share') => {
    setProperties((prev) => {
      const updated = prev.map((p) => {
        if (p.id === propertyId) {
          const updatedProp: Property = {
            ...p,
            whatsappClicks: action === 'whatsapp' ? (p.whatsappClicks || 0) + 1 : p.whatsappClicks,
            phoneCalls: action === 'call' ? (p.phoneCalls || 0) + 1 : p.phoneCalls,
            leadsCount: action === 'lead' ? (p.leadsCount || 0) + 1 : p.leadsCount,
            sharesCount: action === 'share' ? (p.sharesCount || 0) + 1 : p.sharesCount
          };
          trackContactClick(action === 'whatsapp' ? 'whatsapp' : action === 'call' ? 'call' : 'email', updatedProp);
          savePropertyToFirestore(updatedProp).catch((err) =>
            console.error('Firestore record action error:', err)
          );
          return updatedProp;
        }
        return p;
      });
      return updated;
    });
  };

  const handleSetActivePropertyModalId = (id: string | null) => {
    setActivePropertyModalId(id);
    if (id) {
      incrementPropertyViews(id);
      const prop = properties.find((p) => p.id === id);
      updateBrowserUrlForProperty(id, prop?.title);
    } else {
      updateBrowserUrlForProperty(null);
    }
  };

  return (
    <AppContext.Provider
      value={{
        language,
        setLanguage,
        currency,
        setCurrency,
        t,
        user,
        setUser,
        deleteUser,
        allUsers,
        logOut,
        invitedRole,
        invitedBy,
        clearInvite,
        isInviteModalOpen,
        setIsInviteModalOpen,
        customFields,
        addCustomField,
        updateCustomField,
        deleteCustomField,
        properties,
        addProperty,
        updateProperty,
        deleteProperty,
        agents,
        addAgent,
        updateAgent,
        deleteAgent,
        toggleAgentVisibility,
        updateAgentVerification,
        updateAgentVerificationDocument,
        submitAgentVerificationDocuments,
        agencies,
        addAgency,
        updateAgency,
        deleteAgency,
        toggleAgencyVisibility,
        updateAgencySubscriptionStatus,
        updateUserSubscriptionStatus,
        subscriptionPlans,
        updateSubscriptionPlan,
        addSubscriptionPlan,
        deleteSubscriptionPlan,
        pricingDisplayCurrency,
        setPricingDisplayCurrency: handleSetPricingDisplayCurrency,
        cdfExchangeRate,
        setCdfExchangeRate: handleSetCdfExchangeRate,
        wishlist,
        toggleWishlist,
        compareList,
        toggleCompare,
        clearCompare,
        savedSearches,
        addSavedSearch,
        deleteSavedSearch,
        leads,
        addLeadRequest,
        updateLeadStatus,
        deleteLead,
        invoices,
        addInvoice,
        updateInvoice,
        updateInvoiceStatus,
        deleteInvoice,
        adminPin,
        updateAdminPin,
        filters,
        setFilters,
        resetFilters,
        activePropertyModalId,
        setActivePropertyModalId: handleSetActivePropertyModalId,
        isFieldsBuilderOpen,
        setIsFieldsBuilderOpen,
        isSubmitPropertyOpen,
        setIsSubmitPropertyOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        isSecurityModalOpen,
        setIsSecurityModalOpen,
        isCompareOpen,
        setIsCompareOpen,
        editingProperty,
        setEditingProperty,
        importCSV,
        exportCSV,
        googleAnalyticsId,
        updateGoogleAnalyticsId,
        incrementPropertyViews,
        recordPropertyAction,
        requestConfirm,
      }}
    >
      <div dir={languages.find((l) => l.code === language)?.dir || 'ltr'}>
        {children}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">
                {confirmState.title || 'Confirmation de suppression'}
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                {confirmState.message}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all"
              >
                {confirmState.cancelText || 'Annuler'}
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    confirmState.onConfirm();
                  } catch (e) {
                    console.error('Error executing confirm action:', e);
                  } finally {
                    setConfirmState(null);
                  }
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {confirmState.confirmText || 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
