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
import { getRegisteredAccounts, syncFirestoreUsersToAuthStore } from '../lib/authStore';
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
  saveAdminPinToFirestore,
  getAdminPinFromFirestore,
  subscribeToPricingConfig,
  savePricingConfigToFirestore
} from '../lib/firebase';

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

  customFields: CustomFieldDefinition[];
  addCustomField: (field: CustomFieldDefinition) => void;
  updateCustomField: (field: CustomFieldDefinition) => void;
  deleteCustomField: (id: string) => void;

  properties: Property[];
  addProperty: (property: Property) => void;
  updateProperty: (property: Property) => void;
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

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('fr');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('estatik_kinshasa_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('estatik_kinshasa_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('estatik_kinshasa_user');
    }
  }, [user]);

  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => {
    const saved = localStorage.getItem('immocraft_custom_fields');
    return saved ? JSON.parse(saved) : initialCustomFields;
  });

  const [properties, setProperties] = useState<Property[]>(() => {
    let deletedIds: string[] = [];
    try {
      const deletedRaw = localStorage.getItem('immocraft_deleted_properties');
      deletedIds = deletedRaw ? JSON.parse(deletedRaw) : [];
    } catch {}

    const saved = localStorage.getItem('immocraft_properties');
    if (saved) {
      try {
        const parsed: Property[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((p) => !deletedIds.includes(p.id));
        }
      } catch {}
    }
    return initialProperties.filter((p) => !deletedIds.includes(p.id));
  });

  const [allUsers, setAllUsers] = useState<User[]>(() => {
    return getRegisteredAccounts();
  });

  const [agents, setAgents] = useState<Agent[]>(() => {
    const saved = localStorage.getItem('immocraft_agents');
    return saved ? JSON.parse(saved) : initialAgents;
  });

  const [agencies, setAgencies] = useState<Agency[]>(() => {
    const saved = localStorage.getItem('immocraft_agencies');
    return saved ? JSON.parse(saved) : initialAgencies;
  });

  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(() => {
    const saved = localStorage.getItem('immocraft_subscription_plans');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing subscription plans from localStorage:', e);
      }
    }
    return initialSubscriptionPlans;
  });

  const [pricingDisplayCurrency, setPricingDisplayCurrency] = useState<'CDF' | 'USD' | 'BOTH'>(() => {
    return (localStorage.getItem('immocraft_pricing_display_currency') as any) || 'CDF';
  });

  const [cdfExchangeRate, setCdfExchangeRate] = useState<number>(() => {
    const saved = localStorage.getItem('immocraft_cdf_exchange_rate');
    return saved ? Number(saved) : 2800;
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('immocraft_wishlist');
    return saved ? JSON.parse(saved) : ['prop_1', 'prop_2'];
  });

  const [compareList, setCompareList] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const saved = localStorage.getItem('immocraft_saved_searches');
    return saved ? JSON.parse(saved) : [
      {
        id: 'search_1',
        userId: 'user_admin',
        title: 'Penthouse Paris > 150m²',
        filters: { city: 'Paris', type: 'penthouse', minArea: 150 },
        notifyFrequency: 'instant',
        createdAt: '2026-08-01T12:00:00Z',
      }
    ];
  });

  const [leads, setLeads] = useState<LeadRequest[]>(initialLeads);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filters, setFilters] = useState<PropertyFilters>(defaultFilters);

  // Modals
  const [activePropertyModalId, setActivePropertyModalId] = useState<string | null>(null);
  const [isFieldsBuilderOpen, setIsFieldsBuilderOpen] = useState(false);
  const [isSubmitPropertyOpen, setIsSubmitPropertyOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Confirm Modal State
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);

  const requestConfirm = (options: ConfirmOptions) => {
    setConfirmState(options);
  };

  // Google Analytics ID State
  const [googleAnalyticsId, setGoogleAnalyticsIdState] = useState<string>(() => {
    return localStorage.getItem('kin_google_analytics_id') || DEFAULT_GA_ID;
  });

  useEffect(() => {
    initGoogleAnalytics(googleAnalyticsId);
  }, [googleAnalyticsId]);

  const updateGoogleAnalyticsId = (newId: string) => {
    const cleanId = newId.trim() || DEFAULT_GA_ID;
    setGoogleAnalyticsIdState(cleanId);
    localStorage.setItem('kin_google_analytics_id', cleanId);
    initGoogleAnalytics(cleanId);
  };

  const [adminPin, setAdminPinState] = useState<string>(() => {
    const saved = localStorage.getItem('kin_admin_secret_pin');
    if (saved && saved !== '2026' && saved !== '2430' && saved !== 'admin' && saved !== '1234') {
      return saved;
    }
    localStorage.setItem('kin_admin_secret_pin', 'kalu2002jooss');
    return 'kalu2002jooss';
  });

  useEffect(() => {
    getAdminPinFromFirestore().then((pin) => {
      if (pin && pin !== '2026' && pin !== '2430' && pin !== 'admin' && pin !== '1234') {
        setAdminPinState(pin);
        localStorage.setItem('kin_admin_secret_pin', pin);
      } else {
        setAdminPinState('kalu2002jooss');
        localStorage.setItem('kin_admin_secret_pin', 'kalu2002jooss');
        saveAdminPinToFirestore('kalu2002jooss').catch(() => {});
      }
    });
  }, []);

  const updateAdminPin = async (newPin: string) => {
    setAdminPinState(newPin);
    localStorage.setItem('kin_admin_secret_pin', newPin);
    await saveAdminPinToFirestore(newPin);
  };

  // Initialize and subscribe to Firestore
  useEffect(() => {
    // Seed initial data if Firestore collections are empty
    seedInitialFirestoreData();

    // Subscribe to real-time updates from Firestore
    const unsubProperties = subscribeToProperties((firestoreProps) => {
      if (Array.isArray(firestoreProps)) {
        let deletedIds: string[] = [];
        try {
          const deletedRaw = localStorage.getItem('immocraft_deleted_properties');
          deletedIds = deletedRaw ? JSON.parse(deletedRaw) : [];
        } catch {}
        const filtered = firestoreProps.filter((p) => !deletedIds.includes(p.id));
        setProperties(filtered);
        try {
          localStorage.setItem('immocraft_properties', JSON.stringify(filtered));
        } catch (e) {
          console.error('Error saving properties to localStorage:', e);
        }
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
          localStorage.setItem('immocraft_agents', JSON.stringify(firestoreAgents));
        } catch (e) {
          console.error('Error saving agents to localStorage:', e);
        }
      }
    });

    const unsubAgencies = subscribeToAgencies((firestoreAgencies) => {
      if (Array.isArray(firestoreAgencies)) {
        setAgencies(firestoreAgencies);
        try {
          localStorage.setItem('immocraft_agencies', JSON.stringify(firestoreAgencies));
        } catch (e) {
          console.error('Error saving agencies to localStorage:', e);
        }
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
          try {
            localStorage.setItem('immocraft_cdf_exchange_rate', String(firestorePricing.cdfExchangeRate));
          } catch {}
        }
        if (firestorePricing.pricingDisplayCurrency) {
          setPricingDisplayCurrency(firestorePricing.pricingDisplayCurrency);
          try {
            localStorage.setItem('immocraft_pricing_display_currency', firestorePricing.pricingDisplayCurrency);
          } catch {}
        }
        if (Array.isArray(firestorePricing.subscriptionPlans) && firestorePricing.subscriptionPlans.length > 0) {
          setSubscriptionPlans(firestorePricing.subscriptionPlans);
          try {
            localStorage.setItem('immocraft_subscription_plans', JSON.stringify(firestorePricing.subscriptionPlans));
          } catch {}
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

  // Save changes to LocalStorage & Firestore User
  useEffect(() => {
    if (user) {
      localStorage.setItem('estatik_kinshasa_user', JSON.stringify(user));
      saveUserToFirestore(user).catch(err => console.error('Error saving user to Firestore:', err));
    } else {
      localStorage.removeItem('estatik_kinshasa_user');
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('immocraft_custom_fields', JSON.stringify(customFields));
  }, [customFields]);

  useEffect(() => {
    localStorage.setItem('immocraft_properties', JSON.stringify(properties));
  }, [properties]);

  useEffect(() => {
    localStorage.setItem('immocraft_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem('immocraft_saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

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
  const addProperty = (property: Property) => {
    setProperties((prev) => {
      const updated = [property, ...prev];
      try {
        localStorage.setItem('immocraft_properties', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save property to localStorage:', e);
      }
      return updated;
    });
    savePropertyToFirestore(property).catch((err) => console.error('Firestore save property error:', err));
  };

  const updateProperty = (property: Property) => {
    setProperties((prev) => {
      const updated = prev.map((p) => (p.id === property.id ? property : p));
      try {
        localStorage.setItem('immocraft_properties', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update property in localStorage:', e);
      }
      return updated;
    });
    savePropertyToFirestore(property).catch((err) => console.error('Firestore update property error:', err));
  };

  const deleteProperty = (id: string) => {
    setProperties((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem('immocraft_properties', JSON.stringify(updated));
        const deletedRaw = localStorage.getItem('immocraft_deleted_properties');
        const deletedIds: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        if (!deletedIds.includes(id)) {
          deletedIds.push(id);
          localStorage.setItem('immocraft_deleted_properties', JSON.stringify(deletedIds));
        }
      } catch (e) {
        console.error('Failed to delete property from localStorage:', e);
      }
      return updated;
    });
    deletePropertyFromFirestore(id).catch((err) => console.error('Firestore delete property error:', err));
  };

  // Agent Actions
  const addAgent = (agent: Agent) => {
    setAgents((prev) => {
      const updated = [agent, ...prev];
      try {
        localStorage.setItem('immocraft_agents', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save agent to localStorage:', e);
      }
      return updated;
    });
    saveAgentToFirestore(agent).catch((err) => console.error('Firestore save agent error:', err));
  };

  const updateAgent = (agent: Agent) => {
    setAgents((prev) => {
      const updated = prev.map((a) => (a.id === agent.id ? agent : a));
      try {
        localStorage.setItem('immocraft_agents', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update agent in localStorage:', e);
      }
      return updated;
    });
    saveAgentToFirestore(agent).catch((err) => console.error('Firestore update agent error:', err));
  };

  const deleteAgent = (id: string) => {
    setAgents((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem('immocraft_agents', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to delete agent from localStorage:', e);
      }
      return updated;
    });
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
      try {
        localStorage.setItem('immocraft_agents', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update agent visibility in localStorage:', e);
      }
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

      try {
        localStorage.setItem('immocraft_agents', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update agents in localStorage:', e);
      }
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
      try {
        localStorage.setItem('estatik_registered_users', JSON.stringify(updatedUsers));
      } catch (e) {
        console.error('Failed to update registered users in localStorage:', e);
      }
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

      try {
        localStorage.setItem('immocraft_agents', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update agent doc status in localStorage:', e);
      }
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

      try {
        localStorage.setItem('immocraft_agents', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save submitted docs in localStorage:', e);
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

    setAgencies((prev) => {
      const updated = [agencyWithFreeTrial, ...prev];
      try {
        localStorage.setItem('immocraft_agencies', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save agency to localStorage:', e);
      }
      return updated;
    });
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
    setAgencies((prev) => {
      const updated = prev.map((a) => (a.id === agency.id ? agency : a));
      try {
        localStorage.setItem('immocraft_agencies', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update agency in localStorage:', e);
      }
      return updated;
    });
    saveAgencyToFirestore(agency).catch((err) => console.error('Firestore update agency error:', err));
  };

  const deleteAgency = (id: string) => {
    setAgencies((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem('immocraft_agencies', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to delete agency from localStorage:', e);
      }
      return updated;
    });
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
      try {
        localStorage.setItem('immocraft_agencies', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update agency visibility in localStorage:', e);
      }
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
      try {
        localStorage.setItem('immocraft_subscription_plans', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save subscription plans in localStorage:', e);
      }
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
      try {
        localStorage.setItem('immocraft_subscription_plans', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to add subscription plan to localStorage:', e);
      }
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
      try {
        localStorage.setItem('immocraft_subscription_plans', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to delete subscription plan from localStorage:', e);
      }
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
      try {
        localStorage.setItem('immocraft_cdf_exchange_rate', String(rate));
      } catch {}
      savePricingConfigToFirestore({
        cdfExchangeRate: rate,
        pricingDisplayCurrency,
        subscriptionPlans,
      }).catch(err => console.error('Firestore save cdf exchange rate error:', err));
    }
  };

  const handleSetPricingDisplayCurrency = (currency: 'CDF' | 'USD' | 'BOTH') => {
    setPricingDisplayCurrency(currency);
    try {
      localStorage.setItem('immocraft_pricing_display_currency', currency);
    } catch {}
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
      try {
        localStorage.setItem('immocraft_agencies', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to update agency subscription in localStorage:', e);
      }
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
      localStorage.setItem('estatik_kinshasa_user', JSON.stringify(updatedUser));
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
      localStorage.setItem('estatik_kinshasa_user', JSON.stringify(updatedUser));
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
    const localUsers: User[] = JSON.parse(localStorage.getItem('estatik_registered_users') || '[]');
    const updatedLocal = localUsers.filter((u) => u.id !== id && u.email !== id);
    localStorage.setItem('estatik_registered_users', JSON.stringify(updatedLocal));

    if (user && (user.id === id || user.email === id)) {
      setUser(null);
      localStorage.removeItem('estatik_kinshasa_user');
    }

    deleteUserFromFirestore(id).catch(err => console.error(err));
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
