import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  SiteContactSettings,
  PropertyUserReport,
  PropertyVideo,
  PropertyVideoStatus,
  ListingLifecycleStatus,
  AgencyCollaborator,
  AgencyTransaction,
  PaymentMethodConfig,
  InAppBillingNotification,
  BlogArticle,
  LegalDocument,
  LegalDocumentSlug
} from '../types';
import {
  DEFAULT_BLOG_ARTICLES,
  DEFAULT_LEGAL_DOCUMENTS,
  slugifyText
} from '../data/contentSeed';
import { analyzePropertyForFraud } from '../utils/suspiciousListingDetector';
import { createStatusHistoryEntry } from '../utils/propertyStatusHelpers';
import {
  getDefaultPlans,
  normalizePlan,
  enforceSoftDowngradeOnProperties,
  restoreSoftHiddenProperties,
  getFreePlan,
  resolveAccountBillingSummary
} from '../utils/billingHelpers';
import { resolvePropertyMedia } from '../utils/mediaUrl';
import { isBoostWindowActive, parseFeaturedSlotsLimit, resolveBoostPrimaryLabel } from '../utils/boostHelpers';

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
import { ArchitecturalSlide, INITIAL_ARCHITECTURAL_SLIDES } from '../types/heroShowcase';
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
} from '../lib/kinimmoStore';
import { mysqlApi } from '../services/mysqlApi';
import { purgeLegacyAuthStorage } from '../services/secureFetch';
import { getAdminCredentials, saveAdminCredentials } from '../lib/adminCredentials';
import { parsePropertyIdFromUrl, resolvePropertyBySlugOrId, updateBrowserUrlForProperty } from '../utils/shareUtils';
import { dispatchAppNavigate } from '../utils/navigation';
import { readStoredWishlist, writeStoredWishlist } from '../utils/offlineCache';

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
  deleteProperty: (id: string) => Promise<void> | void;
  updatePropertyListingStatus: (propertyId: string, status: ListingLifecycleStatus, note?: string) => Promise<{ success: boolean; message?: string }>;
  assignPropertyToAgent: (propertyId: string, assignedAgentId: string, assignedAgentName: string) => Promise<void>;

  // Agency Collaborators & Transactions
  agencyCollaborators: AgencyCollaborator[];
  inviteAgencyCollaborator: (data: any) => Promise<{ success: boolean; message?: string; collaborator?: AgencyCollaborator }>;
  updateAgencyCollaborator: (id: string, data: Partial<AgencyCollaborator>) => Promise<void>;
  deleteAgencyCollaborator: (id: string) => Promise<void>;
  agencyTransactions: AgencyTransaction[];
  createAgencyTransaction: (data: any) => Promise<{ success: boolean; transaction?: AgencyTransaction }>;

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
  updateAgencySubscriptionStatus: (
    agencyId: string,
    status: 'Active' | 'Expired',
    expiresAt?: string,
    planId?: string,
    cycle?: 'monthly' | 'yearly',
    trialEndsAt?: string
  ) => void;
  updateUserSubscriptionStatus: (
    targetIdOrEmail: string,
    status: 'Active' | 'Expired',
    expiresAt?: string,
    planId?: string,
    cycle?: 'monthly' | 'yearly',
    trialEndsAt?: string
  ) => void;

  // Subscription Plans & Pricing in Francs Congolais (CDF)
  subscriptionPlans: SubscriptionPlan[];
  updateSubscriptionPlan: (plan: SubscriptionPlan) => void;
  addSubscriptionPlan: (plan: SubscriptionPlan) => void;
  deleteSubscriptionPlan: (id: string) => void;
  pricingDisplayCurrency: 'CDF' | 'USD' | 'BOTH';
  setPricingDisplayCurrency: (mode: 'CDF' | 'USD' | 'BOTH') => void;
  cdfExchangeRate: number;
  cdfExchangeRateUpdatedAt: string;
  setCdfExchangeRate: (rate: number) => Promise<{ success: boolean; message?: string; error?: string }>;

  // Dynamic Payment Methods & P2 Billing Workflow
  paymentMethods: PaymentMethodConfig[];
  savePaymentMethod: (pm: Partial<PaymentMethodConfig>) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  inAppBillingNotifications: InAppBillingNotification[];
  pushBillingNotification: (n: Omit<InAppBillingNotification, 'id' | 'createdAt' | 'isRead'>) => void;
  markBillingNotificationRead: (id: string) => void;
  dismissBillingNotification: (id: string) => void;
  subscribeToPlan: (
    plan: SubscriptionPlan,
    cycle: 'monthly' | 'yearly',
    paymentMethodId?: string,
    useTrial?: boolean
  ) => Promise<{ success: boolean; invoice?: Invoice; message?: string }>;
  submitManualPaymentProof: (
    invoiceId: string,
    payload: { paymentMethodId?: string; transactionReference?: string; proofImageUrl?: string }
  ) => Promise<{ success: boolean; invoice?: Invoice; message?: string }>;
  approveManualInvoice: (invoiceId: string) => Promise<{ success: boolean; message?: string; restoredCount?: number }>;
  rejectManualInvoice: (invoiceId: string, reason: string) => Promise<{ success: boolean; message?: string }>;
  refundManualInvoice: (
    invoiceId: string,
    refundNote: string,
    refundAction: 'revoke' | 'keep'
  ) => Promise<{ success: boolean; message?: string; softHiddenCount?: number }>;
  runSubscriptionExpirationAudit: () => { downgradedCount: number; hiddenListingsCount: number; expiringSoonCount: number };

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

  // Vitrine d'Exception & Mises en Avant (Hero Showcase Safricode Style)
  heroSlides: ArchitecturalSlide[];
  setHeroSlides: React.Dispatch<React.SetStateAction<ArchitecturalSlide[]>>;
  addHeroSlide: (slide: ArchitecturalSlide) => void;
  updateHeroSlide: (id: string, slide: Partial<ArchitecturalSlide>) => void;
  deleteHeroSlide: (id: string) => void;
  promotePropertyToHero: (propertyId: string) => void;
  removePropertyFromHero: (propertyId: string) => void;

  // Coordonnées de Contact & Conciergerie VIP
  contactSettings: SiteContactSettings;
  updateContactSettings: (newSettings: Partial<SiteContactSettings>) => Promise<{ success: boolean; message?: string; error?: string }>;

  // Signalements & Détection Anti-Fraude
  reports: PropertyUserReport[];
  addPropertyReport: (report: Omit<PropertyUserReport, 'id' | 'createdAt' | 'status'>) => Promise<void> | void;
  resolvePropertyReport: (reportId: string, action: 'resolved' | 'dismissed') => void;

  // Kinimmo Visites (Vidéos Verticales Immersives & Modération)
  propertyVideos: PropertyVideo[];
  loadPropertyVideos: () => Promise<void>;
  addPropertyVideo: (videoData: {
    propertyId: string;
    videoUrl: string;
    thumbnailUrl?: string;
    description?: string;
    status?: PropertyVideoStatus;
    duration?: number;
  }) => Promise<{ success: boolean; message?: string }>;
  updatePropertyVideoStatus: (id: string, status: PropertyVideoStatus, reason?: string) => Promise<void>;
  deletePropertyVideo: (id: string) => Promise<void>;

  // Contenus Éditoriaux P1 (Blog / Guides & Pages Légales CMS)
  blogArticles: BlogArticle[];
  legalDocuments: LegalDocument[];
  upsertBlogArticle: (article: Partial<BlogArticle>) => Promise<{ success: boolean; article?: BlogArticle; message?: string }>;
  deleteBlogArticle: (id: string) => Promise<{ success: boolean; message?: string }>;
  updateLegalDocument: (slug: LegalDocumentSlug, payload: Partial<LegalDocument>) => Promise<{ success: boolean; document?: LegalDocument; message?: string }>;
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

const DURABLE_PROPERTIES_KEY = 'kinimmo_durable_published_properties';
const DELETED_PROPERTIES_KEY = 'kinimmo_deleted_properties_registry';

const getDurableLocalProperties = (): Property[] => {
  try {
    const raw = localStorage.getItem(DURABLE_PROPERTIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((p) => resolvePropertyMedia(p));
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

const HERO_SLIDES_KEY = 'kinimmo_hero_showcase_slides';

const getInitialHeroSlides = (): ArchitecturalSlide[] => {
  try {
    const raw = localStorage.getItem(HERO_SLIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ne conserver que les slides réellement rattachés à un bien immobilier
        const valid = parsed.filter((slide) => slide && slide.propertyId);
        return valid;
      }
    }
  } catch {}
  return [];
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('fr');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [user, setUser] = useState<User | null>(null);

  // Invitation link state for agents & agencies
  const [invitedRole, setInvitedRole] = useState<'agent' | 'agency' | null>(null);
  const [invitedBy, setInvitedBy] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Purger immédiatement toute ancienne donnée d'authentification ou jeton hérité de localStorage
  useEffect(() => {
    purgeLegacyAuthStorage();
    try {
      localStorage.removeItem('estatik_kinshasa_user');
      localStorage.removeItem('estatik_admin_credentials_v1');
      localStorage.removeItem('immocraft_agents');
      localStorage.removeItem('immocraft_agencies');
      localStorage.removeItem('estatik_registered_users');
      localStorage.removeItem('estatik_local_registered_accounts');
      localStorage.removeItem('immocraft_custom_fields');
      localStorage.removeItem('immocraft_saved_searches');
      localStorage.removeItem('kin_tracking_config');
      localStorage.removeItem('immocraft_durable_published_properties');
      localStorage.removeItem('estatik_durable_properties');
      localStorage.removeItem('immocraft_property_user_reports');
    } catch {}
  }, []);

  // Hydrater la session utilisateur exclusivement depuis les cookies HttpOnly (/api/auth/me avec rotation automatique)
  useEffect(() => {
    let active = true;
    const unsub = listenToAuthChanges((currentUser) => {
      if (active) setUser(currentUser);
    });

    mysqlApi
      .getSession()
      .then((res) => {
        if (!active) return;
        const liveUser = res.user || res.data?.user;
        if (res.success && liveUser) {
          setUser(liveUser);
        } else {
          purgeLegacyAuthStorage();
          setUser(null);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
      unsub();
    };
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
    await mysqlApi.logout();
    await logOutFromFirebase();
  };

  // Magasin de données Kinimmo - synchronisé avec l'API MySQL et le stockage local
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(initialCustomFields);
  const [properties, setProperties] = useState<Property[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  const [contactSettings, setContactSettings] = useState<SiteContactSettings>(() => {
    return mysqlApi.getStoredContactSettings();
  });

  const initialExchangeRate =
    Number(contactSettings.exchangeRate) > 0 ? Number(contactSettings.exchangeRate) : 2850;
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>(() =>
    getDefaultPlans(initialExchangeRate)
  );

  const [pricingDisplayCurrency, setPricingDisplayCurrency] = useState<'CDF' | 'USD' | 'BOTH'>('CDF');
  const [cdfExchangeRate, setCdfExchangeRate] = useState<number>(initialExchangeRate);
  const [cdfExchangeRateUpdatedAt, setCdfExchangeRateUpdatedAt] = useState<string>(
    contactSettings.exchangeRateUpdatedAt || '2026-11-18T10:00:00.000Z'
  );
  const cdfExchangeRateRef = useRef<number>(initialExchangeRate);
  const cdfExchangeRateUpdatedAtRef = useRef<string>(
    contactSettings.exchangeRateUpdatedAt || '2026-11-18T10:00:00.000Z'
  );
  const mysqlSettingsLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    cdfExchangeRateRef.current = cdfExchangeRate;
  }, [cdfExchangeRate]);

  useEffect(() => {
    cdfExchangeRateUpdatedAtRef.current = cdfExchangeRateUpdatedAt;
  }, [cdfExchangeRateUpdatedAt]);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(() => mysqlApi.getLocalPaymentMethods());

  const BILLING_NOTIF_STORAGE_KEY = 'kinimmo_billing_notifications_v1';
  const [inAppBillingNotifications, setInAppBillingNotifications] = useState<InAppBillingNotification[]>(() => {
    try {
      const raw = localStorage.getItem(BILLING_NOTIF_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const saveBillingNotificationsLocally = (list: InAppBillingNotification[]) => {
    try {
      localStorage.setItem(BILLING_NOTIF_STORAGE_KEY, JSON.stringify(list.slice(0, 40)));
    } catch {}
  };

  const pushBillingNotification = (n: Omit<InAppBillingNotification, 'id' | 'createdAt' | 'isRead'>) => {
    const item: InAppBillingNotification = {
      ...n,
      id: `bnotif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    setInAppBillingNotifications((prev) => {
      const next = [item, ...prev.filter((x) => !(x.type === item.type && x.invoiceId && x.invoiceId === item.invoiceId))];
      saveBillingNotificationsLocally(next);
      return next;
    });
  };

  const markBillingNotificationRead = (id: string) => {
    setInAppBillingNotifications((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, isRead: true } : x));
      saveBillingNotificationsLocally(next);
      return next;
    });
  };

  const dismissBillingNotification = (id: string) => {
    setInAppBillingNotifications((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveBillingNotificationsLocally(next);
      return next;
    });
  };

  const [wishlist, setWishlist] = useState<string[]>(() => readStoredWishlist());
  const [compareList, setCompareList] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const [leads, setLeads] = useState<LeadRequest[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Signalements utilisateurs & Anti-Fraude
  const REPORTS_STORAGE_KEY = 'kinimmo_property_user_reports';
  const [reports, setReports] = useState<PropertyUserReport[]>(() => {
    try {
      const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const saveReportsLocally = (newList: PropertyUserReport[]) => {
    try {
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(newList));
    } catch {}
  };

  const addPropertyReport = async (reportData: Omit<PropertyUserReport, 'id' | 'createdAt' | 'status'>) => {
    const newReport: PropertyUserReport = {
      ...reportData,
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    setReports((prev) => {
      const updated = [newReport, ...prev];
      saveReportsLocally(updated);
      return updated;
    });

    mysqlApi.submitPropertyReport({
      propertyId: reportData.propertyId,
      reporterName: reportData.reporterName,
      reporterContact: reportData.reporterContact,
      reason: reportData.reason,
      comment: reportData.comment
    }).catch(() => {});

    // Mettre à jour l'annonce concernée pour ré-exécuter l'analyse anti-fraude
    setProperties((prev) => {
      const target = prev.find((p) => p.id === reportData.propertyId);
      if (!target) return prev;

      const currentReports = [...reports, newReport];
      const analysis = analyzePropertyForFraud(target, prev, currentReports);

      const updatedProp: Property = {
        ...target,
        fraudStatus: analysis.verdict,
        fraudScore: analysis.riskScore,
        fraudFlags: analysis.flags,
        fraudLastCheckedAt: analysis.analyzedAt,
        userReportsCount: (target.userReportsCount || 0) + 1,
        // Si le verdict bascule à suspect, blocage temporaire immédiat !
        published: analysis.verdict === 'normal' ? target.published : false
      };

      const updatedList = prev.map((p) => (p.id === updatedProp.id ? updatedProp : p));
      saveDurableLocalProperties(updatedList);
      return updatedList;
    });
  };

  const resolvePropertyReport = (reportId: string, action: 'resolved' | 'dismissed') => {
    setReports((prev) => {
      const updated = prev.map((r) => (r.id === reportId ? { ...r, status: action } : r));
      saveReportsLocally(updated);
      return updated;
    });
  };

  // -----------------------------------------------------------
  // KINIMMO VISITES (Vidéos Verticales Immersives & Modération)
  // -----------------------------------------------------------
  const VIDEOS_STORAGE_KEY = 'kinimmo_property_videos_v1';
  const [propertyVideos, setPropertyVideos] = useState<PropertyVideo[]>(() => {
    try {
      const saved = localStorage.getItem(VIDEOS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return [];
  });

  const saveVideosLocally = (videos: PropertyVideo[]) => {
    try {
      localStorage.setItem(VIDEOS_STORAGE_KEY, JSON.stringify(videos));
    } catch {}
  };

  const loadPropertyVideos = async () => {
    try {
      const res = await mysqlApi.getApprovedVideos();
      if (res.success && res.data?.videos && res.data.videos.length > 0) {
        setPropertyVideos(res.data.videos);
        saveVideosLocally(res.data.videos);
      }
    } catch (e) {
      console.warn('Could not load videos from MySQL API, using local videos:', e);
    }
  };

  const addPropertyVideo = async (videoData: {
    propertyId: string;
    videoUrl: string;
    thumbnailUrl?: string;
    description?: string;
    status?: PropertyVideoStatus;
    duration?: number;
  }): Promise<{ success: boolean; message?: string }> => {
    const linkedProp = properties.find((p) => p.id === videoData.propertyId);
    if (!linkedProp) {
      throw new Error('Annonce immobilière introuvable pour cette vidéo.');
    }

    const newVideo: PropertyVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      propertyId: videoData.propertyId,
      userId: user?.id || 'agent_current',
      videoUrl: videoData.videoUrl,
      thumbnailUrl: videoData.thumbnailUrl || linkedProp.images?.[0],
      description: videoData.description || '',
      status: videoData.status || 'pending',
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      propertyTitle: linkedProp.title,
      propertyPrice: linkedProp.price,
      propertyCurrency: linkedProp.currency,
      propertyCommune: linkedProp.commune,
      propertyQuartier: linkedProp.quartier,
      propertyType: linkedProp.type,
      propertyStatus: linkedProp.status,
      propertyBedrooms: linkedProp.bedrooms,
      propertyBathrooms: linkedProp.bathrooms,
      propertyAddress: linkedProp.address,
      propertyFeatured: linkedProp.featured,
      agentName: user?.name || linkedProp.agencyName || 'Conseiller Kinimmo',
      agencyName: linkedProp.agencyName,
      agentPhone: linkedProp.contactPhone || user?.phone,
      agentWhatsapp: linkedProp.contactPhone || user?.phone,
      agentAvatar: user?.avatar,
      agentVerified: user?.isVerified || false
    };

    // Persister d'abord via l'API backend
    const res = await mysqlApi.createVideo(videoData);
    if (!res.success && res.status) {
      throw new Error(res.message || res.error || 'Vous devez être connecté et autorisé pour publier cette vidéo.');
    }

    const savedVideo: PropertyVideo = (res.success && (res.data?.video || res.video))
      ? (res.data?.video || res.video)
      : newVideo;

    setPropertyVideos((prev) => {
      const updated = [savedVideo, ...prev.filter((v) => v.id !== savedVideo.id)];
      saveVideosLocally(updated);
      return updated;
    });

    return {
      success: true,
      message: savedVideo.status === 'draft'
        ? 'Brouillon de vidéo enregistré avec succès.'
        : 'Vidéo soumise à validation administrative avec succès.'
    };
  };

  const updatePropertyVideoStatus = async (id: string, status: PropertyVideoStatus, reason?: string) => {
    const res = await mysqlApi.adminModerateVideo(id, status, reason);
    if (!res.success && res.status) {
      throw new Error(res.message || res.error || 'Action réservée aux administrateurs.');
    }

    setPropertyVideos((prev) => {
      const updated = prev.map((v) =>
        v.id === id ? { ...v, status, rejectionReason: reason, updatedAt: new Date().toISOString() } : v
      );
      saveVideosLocally(updated);
      return updated;
    });
  };

  const deletePropertyVideo = async (id: string) => {
    const res = await mysqlApi.deleteVideo(id);
    if (!res.success && res.status) {
      throw new Error(res.message || res.error || 'Suppression refusée.');
    }

    setPropertyVideos((prev) => {
      const updated = prev.filter((v) => v.id !== id);
      saveVideosLocally(updated);
      return updated;
    });
  };
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

  // Vitrine d'Exception & Mises en Avant (Hero Showcase)
  const [heroSlides, setHeroSlides] = useState<ArchitecturalSlide[]>(getInitialHeroSlides);

  // Sync slides with MySQL if available
  useEffect(() => {
    let isMounted = true;
    mysqlApi.getHeroSlides().then((remoteSlides) => {
      if (isMounted && remoteSlides && Array.isArray(remoteSlides) && remoteSlides.length > 0) {
        setHeroSlides(remoteSlides);
      }
    }).catch(() => {});

    // Charger les vidéos approuvées depuis l'API backend
    loadPropertyVideos().catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(HERO_SLIDES_KEY, JSON.stringify(heroSlides));
    } catch {}
  }, [heroSlides]);

  const addHeroSlide = (slide: ArchitecturalSlide) => {
    setHeroSlides((prev) => [slide, ...prev]);
    mysqlApi.adminCreateHeroSlide(slide).catch(() => {});
  };

  const updateHeroSlide = (id: string, updated: Partial<ArchitecturalSlide>) => {
    setHeroSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    mysqlApi.adminUpdateHeroSlide(id, updated).catch(() => {});
  };

  const deleteHeroSlide = (id: string) => {
    setHeroSlides((prev) => prev.filter((s) => s.id !== id));
    mysqlApi.adminDeleteHeroSlide(id).catch(() => {});
  };

  const promotePropertyToHero = (propertyId: string) => {
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) return;

    // Résoudre l'agence ou l'agent référent assigné à ce bien
    const assignedAgent = prop.agentId ? agents.find((a) => a.id === prop.agentId) : null;
    const assignedAgency = prop.agencyId
      ? agencies.find((a) => a.id === prop.agencyId || a.name === prop.agencyName)
      : (assignedAgent?.agencyId ? agencies.find((a) => a.id === assignedAgent.agencyId) : null);

    const hasAdminNumber = (num?: string) => Boolean(num && num.replace(/[^0-9]/g, '').includes('845294616'));

    const directWhatsapp =
      (assignedAgency?.whatsapp && !hasAdminNumber(assignedAgency.whatsapp) ? assignedAgency.whatsapp : null) ||
      (assignedAgent?.whatsapp && !hasAdminNumber(assignedAgent.whatsapp) ? assignedAgent.whatsapp : null) ||
      (prop.contactPhone && !hasAdminNumber(prop.contactPhone) ? prop.contactPhone : null) ||
      assignedAgency?.phone ||
      assignedAgent?.phone ||
      '+243 81 000 0001';

    const directPhone =
      (assignedAgency?.phone && !hasAdminNumber(assignedAgency.phone) ? assignedAgency.phone : null) ||
      (assignedAgent?.phone && !hasAdminNumber(assignedAgent.phone) ? assignedAgent.phone : null) ||
      directWhatsapp;

    const directName = assignedAgency?.name || (assignedAgent ? `${assignedAgent.name}` : (prop.agencyName || 'Service Commercial'));
    const directRole = assignedAgency ? assignedAgency.name : (assignedAgent ? `Conseiller Immobilier (${assignedAgent.name})` : 'Service Commercial');
    const directEmail = assignedAgency?.email || assignedAgent?.email || 'contact@kinimmo.com';
    const directLegalStatus = prop.customFields?.titre_foncier || 'Certificat d’Enregistrement Notarié & Titre Foncier Conforme';

    const newSlide: ArchitecturalSlide = {
      id: `slide_prop_${prop.id}`,
      badgeCategory: prop.category?.toUpperCase() || (prop.status === 'for-sale' ? 'VENTE DE STANDING' : 'LOCATION DE LUXE'),
      badgeLocation: `${(prop.commune || prop.city || 'KINSHASA').toUpperCase()}`,
      title: prop.title.toUpperCase(),
      subTitle: `${(prop.type || 'Résidence').toUpperCase()} D'EXCEPTION • KINSHASA`,
      description: prop.description || 'Superbe opportunité immobilière de grand standing à Kinshasa avec titre foncier garanti.',
      image: prop.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&auto=format&fit=crop&q=85',
      propertyType: prop.type,
      commune: prop.commune || 'Gombe',
      propertyId: prop.id,
      isActive: true,
      order: 1,
      contactName: directName,
      contactRole: directRole,
      contactPhone: directPhone,
      contactWhatsapp: directWhatsapp,
      contactEmail: directEmail,
      legalStatus: directLegalStatus,
      stats: {
        units: prop.bedrooms ? `${prop.bedrooms} Chambres` : 'Standing',
        parking: prop.bathrooms ? `${prop.bathrooms} Salles d'eau` : 'Parking Sécurisé',
        surface: prop.area ? `${prop.area} m²` : '320 m²'
      },
      details: {
        amenities: prop.amenities && prop.amenities.length > 0 ? prop.amenities.slice(0, 5) : [
          'Sécurité 24/7 & Gardiennage VIP',
          'Alimentation électrique continue (Groupe & Solaire)',
          'Titre foncier et certificat vérifié au Cadastre'
        ],
        priceInfo: `$${prop.price?.toLocaleString()} ${prop.period === 'month' ? '/ mois' : ''}`,
        deliveryDate: 'Disponible immédiatement'
      }
    };

    setHeroSlides((prev) => [newSlide, ...prev.filter((s) => s.propertyId !== propertyId)]);

    setProperties((prev) =>
      prev.map((p) => {
        if (p.id === propertyId) {
          const currentLabels = p.labels || [];
          if (!currentLabels.includes('featured')) {
            return { ...p, labels: [...currentLabels, 'featured'] };
          }
        }
        return p;
      })
    );
  };

  const removePropertyFromHero = (propertyId: string) => {
    setHeroSlides((prev) => prev.filter((s) => s.propertyId !== propertyId));
  };

  // Coordonnées de Contact & Conciergerie VIP (synchronisation bidirectionnelle avec le taux de change)
  useEffect(() => {
    let isMounted = true;
    mysqlApi.getContactSettings().then((remoteSettings) => {
      if (isMounted && remoteSettings) {
        mysqlSettingsLoadedRef.current = true;
        setContactSettings(remoteSettings);
        const remoteRate = Number(remoteSettings.exchangeRate);
        if (Number.isFinite(remoteRate) && remoteRate > 0) {
          cdfExchangeRateRef.current = remoteRate;
          setCdfExchangeRate(remoteRate);
          if (remoteSettings.exchangeRateUpdatedAt) {
            cdfExchangeRateUpdatedAtRef.current = remoteSettings.exchangeRateUpdatedAt;
            setCdfExchangeRateUpdatedAt(remoteSettings.exchangeRateUpdatedAt);
          }
          setSubscriptionPlans((prev) => prev.map((p) => normalizePlan(p, remoteRate, true)));
        }
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const updateContactSettings = async (
    newSettings: Partial<SiteContactSettings>
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    const previousSettings = contactSettings;
    const isRateProvided = newSettings.exchangeRate !== undefined;
    const parsedRate = isRateProvided ? Number(newSettings.exchangeRate) : contactSettings.exchangeRate;
    if (isRateProvided && (!Number.isFinite(parsedRate) || parsedRate <= 0)) {
      return { success: false, error: 'Le taux de change USD/CDF doit être un nombre strictement positif.' };
    }

    const nextRate = isRateProvided ? Math.round(parsedRate * 100) / 100 : contactSettings.exchangeRate;
    const nextRateUpdatedAt = isRateProvided
      ? new Date().toISOString()
      : (newSettings.exchangeRateUpdatedAt ?? contactSettings.exchangeRateUpdatedAt ?? cdfExchangeRateUpdatedAt);

    const merged: SiteContactSettings = {
      ...contactSettings,
      ...newSettings,
      exchangeRate: nextRate,
      exchangeRateUpdatedAt: nextRateUpdatedAt,
      featuredSlotsLimit: parseFeaturedSlotsLimit(newSettings.featuredSlotsLimit ?? contactSettings.featuredSlotsLimit),
      virtualTourAllowedDomains: newSettings.virtualTourAllowedDomains ?? contactSettings.virtualTourAllowedDomains,
      vipConcierge: {
        ...contactSettings.vipConcierge,
        ...(newSettings.vipConcierge || {})
      }
    };

    const res = await mysqlApi.adminUpdateContactSettings(merged);
    if (!res.success) {
      setContactSettings(previousSettings);
      return {
        success: false,
        error: res.error || res.message || 'Impossible de sauvegarder les paramètres dans MySQL.'
      };
    }

    const syncedSettings = res.settings || merged;
    setContactSettings(syncedSettings);

    if (isRateProvided && syncedSettings.exchangeRate > 0) {
      const appliedRate = syncedSettings.exchangeRate;
      const appliedUpdatedAt = syncedSettings.exchangeRateUpdatedAt || nextRateUpdatedAt;
      cdfExchangeRateRef.current = appliedRate;
      cdfExchangeRateUpdatedAtRef.current = appliedUpdatedAt;
      setCdfExchangeRate(appliedRate);
      setCdfExchangeRateUpdatedAt(appliedUpdatedAt);
      const recalculatedPlans = subscriptionPlans.map((p) => normalizePlan(p, appliedRate, true));
      setSubscriptionPlans(recalculatedPlans);
      savePricingConfigToFirestore({
        cdfExchangeRate: appliedRate,
        cdfExchangeRateUpdatedAt: appliedUpdatedAt,
        pricingDisplayCurrency,
        subscriptionPlans: recalculatedPlans,
      }).catch((err) => console.error('Firestore save cdf exchange rate error:', err));
    }

    return { success: true, message: res.message };
  };

  // Contenus P1 : Blog / Guides & Pages Légales CMS
  const [blogArticles, setBlogArticles] = useState<BlogArticle[]>(DEFAULT_BLOG_ARTICLES);
  const [legalDocuments, setLegalDocuments] = useState<LegalDocument[]>(DEFAULT_LEGAL_DOCUMENTS);

  useEffect(() => {
    let isMounted = true;
    const includeDrafts = user?.role === 'admin';
    mysqlApi.getBlogArticles(includeDrafts).then((res) => {
      if (isMounted && res?.success && Array.isArray(res.articles) && res.articles.length > 0) {
        setBlogArticles(res.articles);
      }
    }).catch(() => {});

    mysqlApi.getLegalDocuments().then((res) => {
      if (isMounted && res?.success && Array.isArray(res.documents) && res.documents.length > 0) {
        setLegalDocuments(res.documents);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user?.role]);

  const upsertBlogArticle = async (articleInput: Partial<BlogArticle>) => {
    const nowIso = new Date().toISOString().split('T')[0];
    const generatedSlug = slugifyText(articleInput.slug || articleInput.title || `guide-${Date.now()}`);
    const payload: BlogArticle = {
      id: articleInput.id || `art_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      slug: generatedSlug,
      title: (articleInput.title || 'Nouvel article Kinimmo').trim(),
      excerpt: (articleInput.excerpt || '').trim(),
      content: (articleInput.content || '').trim(),
      category: articleInput.category || 'guide_achat',
      coverImage: articleInput.coverImage || '/og-images/blog_gombe_skyline_1795161879500.jpg',
      authorName: articleInput.authorName || user?.name || 'Équipe Éditoriale Kinimmo',
      authorRole: articleInput.authorRole || 'Rédaction Kinimmo',
      readTimeMinutes: Math.max(1, Number(articleInput.readTimeMinutes || 5)),
      status: articleInput.status || 'published',
      featured: Boolean(articleInput.featured),
      tags: Array.isArray(articleInput.tags) ? articleInput.tags : [],
      relatedCommune: articleInput.relatedCommune || undefined,
      publishedAt: articleInput.publishedAt || nowIso,
      updatedAt: nowIso
    };

    try {
      const res = await mysqlApi.saveBlogArticle(articleInput.id ? payload : { ...payload, id: undefined });
      const saved: BlogArticle = res?.article || payload;
      setBlogArticles((prev) => {
        const exists = prev.some((a) => a.id === saved.id || a.slug === saved.slug);
        if (exists) {
          return prev.map((a) => (a.id === saved.id || a.slug === saved.slug ? saved : a));
        }
        return [saved, ...prev];
      });
      return { success: true, article: saved, message: res?.message || 'Article enregistré et publié.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erreur lors de l’enregistrement.' };
    }
  };

  const deleteBlogArticle = async (id: string) => {
    try {
      const res = await mysqlApi.deleteBlogArticle(id);
      setBlogArticles((prev) => prev.filter((a) => a.id !== id));
      return { success: true, message: res?.message || 'Article supprimé.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erreur lors de la suppression.' };
    }
  };

  const updateLegalDocument = async (slug: LegalDocumentSlug, payload: Partial<LegalDocument>) => {
    const existing = legalDocuments.find((d) => d.slug === slug) || DEFAULT_LEGAL_DOCUMENTS.find((d) => d.slug === slug)!;
    const merged: LegalDocument = {
      ...existing,
      ...payload,
      slug,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    try {
      const res = await mysqlApi.updateLegalDocument(slug, merged);
      const saved: LegalDocument = res?.document || merged;
      setLegalDocuments((prev) => {
        const next = prev.map((d) => (d.slug === slug ? saved : d));
        if (merged.companyMeta) {
          return next.map((d) => ({ ...d, companyMeta: saved.companyMeta || merged.companyMeta }));
        }
        return next;
      });
      return { success: true, document: saved, message: res?.message || 'Document légal mis à jour.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Erreur lors de la mise à jour.' };
    }
  };

  // Deep-linking URL Synchronization & Browser History Navigation
  useEffect(() => {
    const handlePopState = () => {
      const propId = parsePropertyIdFromUrl(properties);
      setActivePropertyModalId(propId);
      if (propId) {
        incrementPropertyViews(propId);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [properties]);

  // Synchronisation de l'URL (/annonces/:slug) et récupération de la propriété si nécessaire
  useEffect(() => {
    if (!activePropertyModalId) {
      updateBrowserUrlForProperty(null);
      return;
    }

    const foundProp = resolvePropertyBySlugOrId(activePropertyModalId, properties);
    if (foundProp) {
      if (foundProp.id !== activePropertyModalId) {
        setActivePropertyModalId(foundProp.id);
      }
      updateBrowserUrlForProperty(foundProp, foundProp.title, properties);
    } else {
      // Récupérer depuis le magasin de données
      let isMounted = true;
      getPropertyFromFirestore(activePropertyModalId).then((fetchedProp) => {
        if (isMounted && fetchedProp) {
          setProperties((prev) => {
            if (prev.some((p) => p.id === fetchedProp.id)) return prev;
            return [fetchedProp, ...prev];
          });
          updateBrowserUrlForProperty(fetchedProp, fetchedProp.title, [fetchedProp, ...properties]);
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
    return creds.pin || '';
  });

  const updateAdminPin = async (newPin: string) => {
    setAdminPinState(newPin);
    saveAdminCredentials({ pin: newPin });
  };

  // Initialisation et abonnement aux flux de données Kinimmo
  useEffect(() => {
    seedInitialFirestoreData();

    // Abonnement aux propriétés
    const unsubProperties = subscribeToProperties((storeProps) => {
      if (Array.isArray(storeProps)) {
        setProperties((currentLocalProps) => {
          const deleted = getDeletedPropertiesIds();
          const durable = getDurableLocalProperties();
          const propsMap = new Map<string, Property>();
          const sanitizeProp = (p: Property): Property => {
            const mediaResolved = resolvePropertyMedia(p);
            return {
              ...mediaResolved,
              labels: Array.isArray(mediaResolved.labels) ? mediaResolved.labels : [],
              amenities: Array.isArray(mediaResolved.amenities) ? mediaResolved.amenities : [],
              images: Array.isArray(mediaResolved.images) ? mediaResolved.images : [],
              customFields: mediaResolved.customFields && typeof mediaResolved.customFields === 'object' ? mediaResolved.customFields : {},
              category: mediaResolved.category || 'Résidentiel',
              currency: mediaResolved.currency || 'USD',
              description: mediaResolved.description || '',
              bedrooms: typeof mediaResolved.bedrooms === 'number' ? mediaResolved.bedrooms : Number(mediaResolved.bedrooms) || 0,
              bathrooms: typeof mediaResolved.bathrooms === 'number' ? mediaResolved.bathrooms : Number(mediaResolved.bathrooms) || 0,
              area: typeof mediaResolved.area === 'number' ? mediaResolved.area : Number(mediaResolved.area) || 0,
            };
          };

          // 1. Charger les propriétés de base et locales
          currentLocalProps.forEach((p) => {
            if (!deleted.has(p.id)) propsMap.set(p.id, sanitizeProp(p));
          });
          durable.forEach((p) => {
            if (!deleted.has(p.id)) propsMap.set(p.id, sanitizeProp(p));
          });

          // 2. Fusionner les propriétés mises à jour
          storeProps.forEach((fp) => {
            if (!deleted.has(fp.id)) {
              propsMap.set(fp.id, sanitizeProp(fp));
            }
          });

          const merged = Array.from(propsMap.values());
          saveDurableLocalProperties(merged);
          return merged;
        });
      }
    });

    // Chargement direct depuis l'API REST MySQL
    mysqlApi.getProperties().then((res: any) => {
      const items = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.properties) ? res.properties : (Array.isArray(res) ? res : null));
      if (items && items.length > 0) {
        setProperties((currentLocalProps) => {
          const deleted = getDeletedPropertiesIds();
          const propsMap = new Map<string, Property>();
          const sanitizeProp = (p: Property): Property => {
            const mediaResolved = resolvePropertyMedia(p);
            return {
              ...mediaResolved,
              labels: Array.isArray(mediaResolved.labels) ? mediaResolved.labels : [],
              amenities: Array.isArray(mediaResolved.amenities) ? mediaResolved.amenities : [],
              images: Array.isArray(mediaResolved.images) ? mediaResolved.images : [],
              customFields: mediaResolved.customFields && typeof mediaResolved.customFields === 'object' ? mediaResolved.customFields : {},
              category: mediaResolved.category || 'Résidentiel',
              currency: mediaResolved.currency || 'USD',
              description: mediaResolved.description || '',
              bedrooms: typeof mediaResolved.bedrooms === 'number' ? mediaResolved.bedrooms : Number(mediaResolved.bedrooms) || 0,
              bathrooms: typeof mediaResolved.bathrooms === 'number' ? mediaResolved.bathrooms : Number(mediaResolved.bathrooms) || 0,
              area: typeof mediaResolved.area === 'number' ? mediaResolved.area : Number(mediaResolved.area) || 0,
            };
          };
          currentLocalProps.forEach((p) => {
            if (!deleted.has(p.id)) propsMap.set(p.id, sanitizeProp(p));
          });
          items.forEach((p: Property) => {
            if (!deleted.has(p.id)) propsMap.set(p.id, sanitizeProp(p));
          });
          const merged = Array.from(propsMap.values());
          saveDurableLocalProperties(merged);
          return merged;
        });
      }
    }).catch(() => {});

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
      }
    });

    const unsubAgencies = subscribeToAgencies((firestoreAgencies) => {
      if (Array.isArray(firestoreAgencies)) {
        setAgencies(firestoreAgencies);
      }
    });

    const unsubUsers = subscribeToUsers((firestoreUsers) => {
      if (Array.isArray(firestoreUsers)) {
        setAllUsers(firestoreUsers);
      }
    });

    const unsubPricing = subscribeToPricingConfig((firestorePricing) => {
      if (firestorePricing) {
        const fsRate = Number(firestorePricing.cdfExchangeRate);
        const fsUpdatedAt = (firestorePricing as any).cdfExchangeRateUpdatedAt as string | undefined;
        const fsTime = fsUpdatedAt ? Date.parse(fsUpdatedAt) : 0;
        const localTime = cdfExchangeRateUpdatedAtRef.current ? Date.parse(cdfExchangeRateUpdatedAtRef.current) : 0;
        const shouldApplyFirestoreRate =
          Number.isFinite(fsRate) &&
          fsRate > 0 &&
          (!mysqlSettingsLoadedRef.current || (fsTime > 0 && fsTime > localTime));

        const effectiveRateForPlans = shouldApplyFirestoreRate ? fsRate : cdfExchangeRateRef.current;

        if (shouldApplyFirestoreRate) {
          cdfExchangeRateRef.current = fsRate;
          setCdfExchangeRate(fsRate);
          setContactSettings((prev) => ({
            ...prev,
            exchangeRate: fsRate,
            exchangeRateUpdatedAt: fsUpdatedAt || prev.exchangeRateUpdatedAt,
          }));
          if (fsUpdatedAt) {
            cdfExchangeRateUpdatedAtRef.current = fsUpdatedAt;
            setCdfExchangeRateUpdatedAt(fsUpdatedAt);
          }
        }
        if (firestorePricing.pricingDisplayCurrency) {
          setPricingDisplayCurrency(firestorePricing.pricingDisplayCurrency as 'USD' | 'CDF' | 'BOTH');
        }
        if (Array.isArray(firestorePricing.subscriptionPlans) && firestorePricing.subscriptionPlans.length > 0) {
          setSubscriptionPlans(
            firestorePricing.subscriptionPlans.map((p: any) =>
              normalizePlan(p, effectiveRateForPlans || 2850, shouldApplyFirestoreRate)
            )
          );
        }
      }
    });

    // Synchronize plans & dynamic payment methods from MySQL / Express API
    mysqlApi.getPricingPlans(undefined, true).then((res) => {
      if (res && res.success && Array.isArray(res.plans) && res.plans.length > 0) {
        const serverRate = Number((res as any).exchangeRate);
        const rateToUse =
          Number.isFinite(serverRate) && serverRate > 0 ? serverRate : cdfExchangeRateRef.current || 2850;
        setSubscriptionPlans(res.plans.map((p: any) => normalizePlan(p, rateToUse)));
      }
    }).catch(() => {});

    mysqlApi.getPaymentMethods(true).then((res) => {
      if (res && res.success && Array.isArray(res.paymentMethods) && res.paymentMethods.length > 0) {
        setPaymentMethods(res.paymentMethods);
      }
    }).catch(() => {});

    // Synchronize custom fields from MySQL API (Hostinger backend)
    mysqlApi.getCustomFields().then((res: any) => {
      const apiFields = Array.isArray(res) ? res : (Array.isArray(res?.fields) ? res.fields : res?.data?.fields);
      if (Array.isArray(apiFields) && apiFields.length > 0) {
        setCustomFields(apiFields as CustomFieldDefinition[]);
      }
    }).catch(() => {});

    // Synchronize agencies from MySQL API backend
    mysqlApi.getAgencies().then((res) => {
      if (res && res.success && Array.isArray(res.agencies) && res.agencies.length > 0) {
        const sanitizeAgency = (a: any): Agency => ({
          ...a,
          name: a.name || a.agencyName || 'Agence Immobilière',
          logo: a.logo || a.avatar || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80',
          address: a.address || 'Kinshasa, RDC',
          city: a.city || 'Kinshasa',
          phone: a.phone || '+243 81 000 00 00',
          whatsapp: a.whatsapp || a.phone || '+243 81 000 00 00',
          description: a.description || 'Agence immobilière partenaire à Kinshasa.',
          specialties: Array.isArray(a.specialties) ? a.specialties : ['Achat & Vente', 'Location', 'Conseil'],
          agentsCount: typeof a.agentsCount === 'number' ? a.agentsCount : 1,
        });
        setAgencies((prev) => {
          const map = new Map<string, Agency>();
          res.agencies.forEach((a: Agency) => map.set(a.id, sanitizeAgency(a)));
          prev.forEach((a) => {
            if (!map.has(a.id)) map.set(a.id, sanitizeAgency(a));
          });
          return Array.from(map.values());
        });
      }
    }).catch(() => {});

    // Synchronize agents from MySQL API backend
    mysqlApi.getAgents().then((res) => {
      if (res && res.success && Array.isArray(res.agents) && res.agents.length > 0) {
        const sanitizeAgent = (a: any): Agent => ({
          ...a,
          name: a.name || 'Agent Immobilier',
          title: a.title || 'Agent Immobilier Agréé',
          avatar: a.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
          phone: a.phone || '+243 81 000 0000',
          whatsapp: a.whatsapp || a.phone || '+243 81 000 0000',
          bio: a.bio || 'Agent immobilier partenaire certifié à Kinshasa.',
          rating: typeof a.rating === 'number' ? a.rating : 5.0,
          reviewCount: typeof a.reviewCount === 'number' ? a.reviewCount : 1,
          specialties: Array.isArray(a.specialties) ? a.specialties : ['Résidentiel', 'Commercial', 'Conseil Immobilier'],
          languages: Array.isArray(a.languages) ? a.languages : ['Français', 'Lingala'],
        });
        setAgents((prev) => {
          const map = new Map<string, Agent>();
          res.agents.forEach((a: Agent) => map.set(a.id, sanitizeAgent(a)));
          prev.forEach((a) => {
            if (!map.has(a.id)) map.set(a.id, sanitizeAgent(a));
          });
          return Array.from(map.values());
        });
      }
    }).catch(() => {});

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

  // Sync user profile to Firestore (never password) and refresh protected streams once authenticated
  useEffect(() => {
    if (user) {
      saveUserToFirestore(user).catch(err => console.error('Error saving user to Firestore:', err));
      const unsubLeadsAuth = subscribeToLeads((items) => {
        if (Array.isArray(items)) setLeads(items);
      });
      const unsubInvoicesAuth = subscribeToInvoices((items) => {
        if (Array.isArray(items)) setInvoices(items);
      });
      return () => {
        unsubLeadsAuth();
        unsubInvoicesAuth();
      };
    }
  }, [user?.id]);

  // Translate helper
  const t = (key: string): string => {
    return translations[language]?.[key] || translations['fr']?.[key] || key;
  };

  // Custom Fields Actions (Synchronized with MySQL database and protected admin endpoints)
  const addCustomField = (field: CustomFieldDefinition) => {
    setCustomFields((prev) => [...prev, field]);
    mysqlApi.adminCreateCustomField(field).catch(() => {});
    saveCustomFieldToFirestore(field).catch(err => console.error(err));
  };

  const updateCustomField = (field: CustomFieldDefinition) => {
    setCustomFields((prev) => prev.map((f) => (f.id === field.id ? field : f)));
    mysqlApi.adminUpdateCustomField(field.id, field).catch(() => {});
    saveCustomFieldToFirestore(field).catch(err => console.error(err));
  };

  const deleteCustomField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
    mysqlApi.adminDeleteCustomField(id).catch(() => {});
    deleteCustomFieldFromFirestore(id).catch(err => console.error(err));
  };

  // Properties Actions
  const addProperty = async (property: Property) => {
    // Règle métier : la publication d'un bien est strictement réservée aux utilisateurs connectés
    if (!user) {
      throw new Error("Règle métier Kinimmo : Vous devez être connecté pour publier une annonce.");
    }

    const isDraft = property.listingStatus === 'DRAFT' || property.published === false;
    // Exécution automatique de l'algorithme de détection des annonces suspectes
    const fraudAnalysis = analyzePropertyForFraud(property, properties, reports);
    const enrichedProperty: Property = {
      ...property,
      agentId: user.agentId || user.id || property.agentId,
      agencyId: user.agencyId || (user.role === 'agency' ? user.id : property.agencyId),
      contactEmail: user.email || property.contactEmail,
      contactPhone: user.phone || property.contactPhone,
      fraudStatus: fraudAnalysis.verdict,
      fraudScore: fraudAnalysis.riskScore,
      fraudFlags: fraudAnalysis.flags,
      fraudLastCheckedAt: fraudAnalysis.analyzedAt,
      // Les brouillons restent non publiés mais ne sont pas bloqués à l'enregistrement
      published: !isDraft && fraudAnalysis.verdict !== 'suspect' && (property.published !== false)
    };

    // Enregistrement d'abord dans le backend via l'API REST
    const res = await mysqlApi.createProperty(enrichedProperty);
    if (!res.success && res.status) {
      throw new Error(res.message || res.error || "Erreur lors de la publication de l'annonce.");
    }

    const rawSavedProperty: Property = (res.success && (res.property || res.data?.property))
      ? (res.property || res.data?.property)
      : {
          ...enrichedProperty,
          ...(res.propertyId ? { id: res.propertyId } : {}),
          ...(Array.isArray(res.images) ? { images: res.images } : {})
        };
    const savedProperty = resolvePropertyMedia(rawSavedProperty);

    setProperties((prev) => {
      const exists = prev.some((p) => p.id === savedProperty.id);
      const next = exists ? prev.map((p) => (p.id === savedProperty.id ? savedProperty : p)) : [savedProperty, ...prev];
      saveDurableLocalProperties(next);
      return next;
    });

    try {
      await savePropertyToFirestore(savedProperty, Boolean(res.success));
    } catch (err) {
      console.warn('Firestore save property notice (retained in durable storage):', err);
    }
  };

  const updateProperty = async (property: Property) => {
    // Règle métier : la modification d'un bien est strictement réservée aux utilisateurs connectés
    if (!user) {
      throw new Error("Règle métier Kinimmo : Vous devez être connecté pour modifier une annonce.");
    }

    const isDraft = property.listingStatus === 'DRAFT' || property.published === false;
    // Ré-analyse lors de toute modification
    const fraudAnalysis = analyzePropertyForFraud(property, properties, reports);
    const enrichedProperty: Property = {
      ...property,
      fraudStatus: fraudAnalysis.verdict,
      fraudScore: fraudAnalysis.riskScore,
      fraudFlags: fraudAnalysis.flags,
      fraudLastCheckedAt: fraudAnalysis.analyzedAt,
      published: !isDraft && fraudAnalysis.verdict !== 'suspect' && (property.published !== false)
    };

    const res = await mysqlApi.updateProperty(enrichedProperty.id, enrichedProperty);
    if (!res.success && res.status) {
      throw new Error(res.message || res.error || "Erreur lors de la mise à jour de l'annonce.");
    }

    const rawSavedProperty: Property = (res.success && (res.property || res.data?.property))
      ? (res.property || res.data?.property)
      : {
          ...enrichedProperty,
          ...(Array.isArray(res.images) ? { images: res.images } : {})
        };
    const savedProperty = resolvePropertyMedia(rawSavedProperty);

    setProperties((prev) => {
      const next = prev.map((p) => (p.id === savedProperty.id ? savedProperty : p));
      saveDurableLocalProperties(next);
      return next;
    });

    try {
      await savePropertyToFirestore(savedProperty, Boolean(res.success));
    } catch (err) {
      console.warn('Firestore update property notice:', err);
    }
  };

  const deleteProperty = async (id: string) => {
    const res = await mysqlApi.deleteProperty(id);
    if (!res.success && res.status) {
      console.warn('Suppression refusée par le serveur:', res.message || res.error);
      return;
    }

    markPropertyAsDeletedLocally(id);
    setProperties((prev) => {
      const next = prev.filter((p) => p.id !== id);
      saveDurableLocalProperties(next);
      return next;
    });
    deletePropertyFromFirestore(id).catch((err) => console.error('Firestore delete property error:', err));
  };

  // Règles des annonces : Mise à jour du statut du cycle de vie
  const updatePropertyListingStatus = async (propertyId: string, status: ListingLifecycleStatus, note?: string) => {
    // 1. Enregistrer le nouveau statut côté serveur
    const res = await mysqlApi.updatePropertyListingStatus(propertyId, status, note);
    if (!res.success && res.status) {
      return {
        success: false,
        message: res.message || res.error || 'Vous n\'êtes pas autorisé à modifier le statut de cette annonce.'
      };
    }

    // 2. Mettre à jour immédiatement les données du tableau de bord
    let updatedPropertyObj: Property | null = null;
    setProperties((prev) => {
      const next = prev.map((p) => {
        if (p.id === propertyId) {
          const oldStatus = p.listingStatus || (p.status === 'sold' ? 'SOLD' : 'PUBLISHED');
          const historyEntry = createStatusHistoryEntry(oldStatus, status, user, note);
          const history = Array.isArray(p.statusHistory) ? [...p.statusHistory, historyEntry] : [historyEntry];

          const isAvailable = status === 'PUBLISHED';
          const legacyStatus = status === 'SOLD' ? 'sold' : (status === 'RENTED' ? 'for-rent' : p.status);

          const updated: Property = {
            ...p,
            listingStatus: status,
            isAvailable,
            status: legacyStatus,
            published: status === 'PUBLISHED',
            statusHistory: history,
            updatedAt: new Date().toISOString()
          };
          updatedPropertyObj = updated;
          return updated;
        }
        return p;
      });
      saveDurableLocalProperties(next);
      return next;
    });

    if (updatedPropertyObj) {
      savePropertyToFirestore(updatedPropertyObj).catch(() => {});
    }

    return {
      success: true,
      message: `Statut du bien mis à jour vers ${status}.`
    };
  };

  const assignPropertyToAgent = async (propertyId: string, assignedAgentId: string, assignedAgentName: string) => {
    try {
      await mysqlApi.assignProperty(propertyId, assignedAgentId, assignedAgentName);
    } catch (e) {}

    setProperties((prev) => {
      const next = prev.map((p) => {
        if (p.id === propertyId) {
          return {
            ...p,
            assignedAgentId,
            assignedAgentName,
            updatedAt: new Date().toISOString()
          };
        }
        return p;
      });
      saveDurableLocalProperties(next);
      return next;
    });
  };

  // Collaborateurs d'agence
  const COLLABORATORS_STORAGE_KEY = 'kinimmo_agency_collaborators_store';
  const [agencyCollaborators, setAgencyCollaborators] = useState<AgencyCollaborator[]>(() => {
    try {
      const saved = localStorage.getItem(COLLABORATORS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'collab_dieudonne',
        agencyId: 'agency_congo_luxury',
        userId: 'usr_dieudonne_01',
        name: 'Dieudonné Mwamba',
        email: 'dieudonne@congoluxuryhomes.cd',
        phone: '+243 81 000 0001',
        whatsapp: '+243 81 000 0001',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'agency_owner',
        permissions: { canEditAllProperties: true, canAssignProperties: true, canAssignLeads: true, canViewBilling: true, canManageTeam: true },
        status: 'active',
        invitedAt: '2026-01-01T08:00:00Z',
        joinedAt: '2026-01-01T08:30:00Z',
        activeListingsCount: 12,
        totalLeadsCount: 48
      },
      {
        id: 'collab_patrick',
        agencyId: 'agency_immo_kinshasa',
        userId: 'usr_patrick_02',
        name: 'Patrick Kalombo',
        email: 'patrick@immokingombe.cd',
        phone: '+243 82 123 4567',
        whatsapp: '+243 82 123 4567',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        role: 'agency_manager',
        permissions: { canEditAllProperties: true, canAssignProperties: true, canAssignLeads: true, canViewBilling: false, canManageTeam: true },
        status: 'active',
        invitedAt: '2026-01-10T09:00:00Z',
        joinedAt: '2026-01-10T10:00:00Z',
        activeListingsCount: 8,
        totalLeadsCount: 32
      },
      {
        id: 'collab_sarah',
        agencyId: 'agency_fleuve_habitat',
        userId: 'usr_sarah_03',
        name: 'Sarah Mbuyi',
        email: 'sarah@fleuvecongoimmo.cd',
        phone: '+243 99 876 5432',
        whatsapp: '+243 99 876 5432',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        role: 'agency_agent',
        permissions: { canEditAllProperties: false, canAssignProperties: false, canAssignLeads: false, canViewBilling: false, canManageTeam: false },
        status: 'active',
        invitedAt: '2026-02-01T11:00:00Z',
        joinedAt: '2026-02-02T09:15:00Z',
        activeListingsCount: 5,
        totalLeadsCount: 19
      }
    ];
  });

  const saveCollaboratorsLocally = (collabs: AgencyCollaborator[]) => {
    try {
      localStorage.setItem(COLLABORATORS_STORAGE_KEY, JSON.stringify(collabs));
    } catch {}
  };

  const inviteAgencyCollaborator = async (data: any) => {
    const newCollab: AgencyCollaborator = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: data.agencyId || user?.agencyId || user?.id || 'agency_default',
      userId: `usr_${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      whatsapp: data.whatsapp || data.phone || '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: data.role || 'agency_agent',
      permissions: data.permissions || { canEditAllProperties: false, canAssignProperties: false, canAssignLeads: false, canViewBilling: false, canManageTeam: false },
      status: 'invited',
      invitedAt: new Date().toISOString(),
      activeListingsCount: 0,
      totalLeadsCount: 0
    };

    setAgencyCollaborators((prev) => {
      const next = [newCollab, ...prev];
      saveCollaboratorsLocally(next);
      return next;
    });

    try {
      await mysqlApi.inviteAgencyCollaborator(newCollab);
    } catch {}

    return { success: true, message: `Collaborateur ${data.name} invité avec succès.`, collaborator: newCollab };
  };

  const updateAgencyCollaborator = async (id: string, data: Partial<AgencyCollaborator>) => {
    setAgencyCollaborators((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...data } : c));
      saveCollaboratorsLocally(next);
      return next;
    });
    try {
      await mysqlApi.updateAgencyCollaborator(id, data);
    } catch {}
  };

  const deleteAgencyCollaborator = async (id: string) => {
    setAgencyCollaborators((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveCollaboratorsLocally(next);
      return next;
    });
    try {
      await mysqlApi.deleteAgencyCollaborator(id);
    } catch {}
  };

  // Transactions d'agence
  const TRANSACTIONS_STORAGE_KEY = 'kinimmo_agency_transactions_store';
  const [agencyTransactions, setAgencyTransactions] = useState<AgencyTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'tx_001',
        agencyId: 'agency_congo_luxury',
        propertyId: 'prop_1',
        propertyTitle: 'Villa Diplomatique Haute Sécurité avec Piscine',
        agentId: 'collab_dieudonne',
        agentName: 'Dieudonné Mwamba',
        clientName: 'Ambassade & Mission Diplomatique',
        clientContact: '+243 81 999 8888',
        type: 'sale',
        amount: 1250000,
        currency: 'USD',
        commissionRate: 5.0,
        commissionAmount: 62500,
        status: 'closed',
        notes: 'Acte notarié signé avec succès à la Gombe.',
        closedAt: '2026-09-15T14:00:00Z',
        createdAt: '2026-08-20T10:00:00Z'
      },
      {
        id: 'tx_002',
        agencyId: 'agency_immo_kinshasa',
        propertyId: 'prop_2',
        propertyTitle: 'Appartement Haut Standing Vue Fleuve',
        agentId: 'collab_patrick',
        agentName: 'Patrick Kalombo',
        clientName: 'Directeur Général Multinationale Télécom',
        clientContact: '+243 82 555 4444',
        type: 'rent',
        amount: 3500,
        currency: 'USD',
        commissionRate: 100.0,
        commissionAmount: 3500,
        status: 'closed',
        notes: 'Bail locatif d\'un an renouvelable.',
        closedAt: '2026-10-01T16:30:00Z',
        createdAt: '2026-09-25T11:00:00Z'
      }
    ];
  });

  const saveTransactionsLocally = (txs: AgencyTransaction[]) => {
    try {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(txs));
    } catch {}
  };

  const createAgencyTransaction = async (data: any) => {
    const newTx: AgencyTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: data.agencyId || user?.agencyId || user?.id || 'agency_default',
      propertyId: data.propertyId || '',
      propertyTitle: data.propertyTitle || 'Propriété Kinshasa',
      agentId: data.agentId || user?.id || 'agent_current',
      agentName: data.agentName || user?.name || 'Agent Immobilier',
      clientName: data.clientName || 'Client Particulier',
      clientContact: data.clientContact || '',
      type: data.type || 'sale',
      amount: Number(data.amount) || 0,
      currency: data.currency || 'USD',
      commissionRate: Number(data.commissionRate) || 5,
      commissionAmount: Number(data.commissionAmount) || (Number(data.amount || 0) * 0.05),
      status: data.status || 'closed',
      notes: data.notes || '',
      closedAt: data.closedAt || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    setAgencyTransactions((prev) => {
      const next = [newTx, ...prev];
      saveTransactionsLocally(next);
      return next;
    });

    try {
      await mysqlApi.createAgencyTransaction(newTx);
    } catch {}

    return { success: true, transaction: newTx };
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

  // Subscription Plans Management (CDF & USD, Audiences & Quotas)
  const updateSubscriptionPlan = (plan: SubscriptionPlan) => {
    const normalized = normalizePlan(plan, cdfExchangeRate);
    setSubscriptionPlans((prev) => {
      const updated = prev.map((p) => (p.id === normalized.id ? normalized : p));
      mysqlApi.saveLocalPlans(updated);
      mysqlApi.adminUpdatePlan(normalized.id, normalized).catch(() => {});
      savePricingConfigToFirestore({
        cdfExchangeRate,
        pricingDisplayCurrency,
        subscriptionPlans: updated,
      }).catch(err => console.error('Firestore save pricing config error:', err));
      return updated;
    });
  };

  const addSubscriptionPlan = (plan: SubscriptionPlan) => {
    const normalized = normalizePlan(plan, cdfExchangeRate);
    setSubscriptionPlans((prev) => {
      const updated = [...prev, normalized];
      mysqlApi.saveLocalPlans(updated);
      mysqlApi.adminCreatePlan(normalized).catch(() => {});
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
      mysqlApi.saveLocalPlans(updated);
      mysqlApi.adminDeletePlan(id).catch(() => {});
      savePricingConfigToFirestore({
        cdfExchangeRate,
        pricingDisplayCurrency,
        subscriptionPlans: updated,
      }).catch(err => console.error('Firestore delete pricing plan error:', err));
      return updated;
    });
  };

  const savePaymentMethod = async (pm: Partial<PaymentMethodConfig>) => {
    if (pm.id && paymentMethods.some((m) => m.id === pm.id)) {
      const res = await mysqlApi.adminUpdatePaymentMethod(pm.id, pm);
      const updatedPm = (res as any)?.paymentMethod || { ...paymentMethods.find((m) => m.id === pm.id), ...pm };
      setPaymentMethods((prev) => {
        const next = prev.map((m) => (m.id === pm.id ? (updatedPm as PaymentMethodConfig) : m));
        mysqlApi.saveLocalPaymentMethods(next);
        return next;
      });
    } else {
      const res = await mysqlApi.adminCreatePaymentMethod(pm);
      const createdPm: PaymentMethodConfig = (res as any)?.paymentMethod || {
        id: `pm_${Date.now()}`,
        provider: (pm.provider as any) || 'mpesa',
        account_name: pm.account_name || 'Compte Kinimmo',
        account_number: pm.account_number || '',
        merchant_code: pm.merchant_code || null,
        instructions: pm.instructions || '',
        is_active: pm.is_active !== false
      };
      setPaymentMethods((prev) => {
        const next = [...prev, createdPm];
        mysqlApi.saveLocalPaymentMethods(next);
        return next;
      });
    }
  };

  const deletePaymentMethod = async (id: string) => {
    await mysqlApi.adminDeletePaymentMethod(id);
    setPaymentMethods((prev) => {
      const next = prev.filter((m) => m.id !== id);
      mysqlApi.saveLocalPaymentMethods(next);
      return next;
    });
  };

  const handleSetCdfExchangeRate = async (
    rate: number
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    const parsedRate = Number(rate);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      return { success: false, error: 'Le taux de change USD/CDF doit être strictement positif.' };
    }
    return updateContactSettings({ exchangeRate: parsedRate });
  };

  const handleSetPricingDisplayCurrency = (currency: 'CDF' | 'USD' | 'BOTH') => {
    setPricingDisplayCurrency(currency);
    savePricingConfigToFirestore({
      cdfExchangeRate,
      pricingDisplayCurrency: currency,
      subscriptionPlans,
    }).catch(err => console.error('Firestore save pricing display currency error:', err));
  };

  const applySoftDowngradeForTarget = (targetIdOrEmail: string) => {
    const freeCap = getFreePlan(subscriptionPlans).maxListings;
    setProperties((prev) => {
      const res = enforceSoftDowngradeOnProperties(prev, targetIdOrEmail, freeCap);
      if (res.hiddenIds.length > 0) {
        saveDurableLocalProperties(res.updatedProperties);
        res.updatedProperties
          .filter((p) => res.hiddenIds.includes(p.id))
          .forEach((p) => {
            savePropertyToFirestore(p).catch(() => {});
            mysqlApi.updateProperty(p.id, p).catch(() => {});
          });
      }
      return res.updatedProperties;
    });
  };

  const restorePropertiesForTarget = (targetIdOrEmail: string): number => {
    let restoredTotal = 0;
    setProperties((prev) => {
      const res = restoreSoftHiddenProperties(prev, targetIdOrEmail);
      restoredTotal = res.restoredIds.length;
      if (restoredTotal > 0) {
        saveDurableLocalProperties(res.updatedProperties);
        res.updatedProperties
          .filter((p) => res.restoredIds.includes(p.id))
          .forEach((p) => {
            savePropertyToFirestore(p).catch(() => {});
            mysqlApi.updateProperty(p.id, p).catch(() => {});
          });
      }
      return res.updatedProperties;
    });
    return restoredTotal;
  };

  const updateAgencySubscriptionStatus = (
    agencyId: string,
    status: 'Active' | 'Expired',
    expiresAt?: string,
    planId?: string,
    cycle?: 'monthly' | 'yearly',
    trialEndsAt?: string
  ) => {
    const nextExpiry = expiresAt || (status === 'Active'
      ? new Date(Date.now() + (cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]);
    const matchedPlan = planId ? subscriptionPlans.find((p) => p.id === planId) : undefined;

    setAgencies((prev) => {
      const updated = prev.map((ag) => {
        if (ag.id === agencyId || ag.name.toLowerCase() === agencyId.toLowerCase() || ag.email?.toLowerCase() === agencyId.toLowerCase()) {
          const updatedAg: Agency = {
            ...ag,
            subscriptionStatus: status,
            subscriptionExpiresAt: nextExpiry,
            ...(planId
              ? { planId, subscriptionPlan: planId }
              : status === 'Expired'
              ? { planId: 'starter', subscriptionPlan: 'starter' }
              : {}),
            ...(cycle ? { billingCycle: cycle } : {}),
            trialEndsAt,
            ...(matchedPlan ? { includedBoostsRemaining: matchedPlan.includedBoosts ?? matchedPlan.featuredListings ?? 0 } : {}),
            ...(status === 'Active' ? { unpaidInvoiceId: undefined, lastPaymentDate: new Date().toISOString().split('T')[0] } : {})
          };
          saveAgencyToFirestore(updatedAg).catch((err) => console.error('Firestore update agency subscription status error:', err));
          return updatedAg;
        }
        return ag;
      });
      return updated;
    });

    if (user && (user.agencyId === agencyId || user.id === agencyId || (user.agencyName && user.agencyName.toLowerCase() === agencyId.toLowerCase()))) {
      const updatedUser: User = {
        ...user,
        subscriptionStatus: status,
        subscriptionExpiresAt: nextExpiry,
        ...(planId
          ? { planId, subscriptionPlan: planId }
          : status === 'Expired'
          ? { planId: 'starter', subscriptionPlan: 'starter' }
          : {}),
        ...(cycle ? { billingCycle: cycle } : {}),
        trialEndsAt,
        ...(matchedPlan ? { includedBoostsRemaining: matchedPlan.includedBoosts ?? matchedPlan.featuredListings ?? 0 } : {})
      };
      setUser(updatedUser);
      saveUserToFirestore(updatedUser).catch((err) => console.error('Firestore update user error:', err));
    }

    if (status === 'Expired') {
      applySoftDowngradeForTarget(agencyId);
    } else {
      restorePropertiesForTarget(agencyId);
    }
  };

  const updateUserSubscriptionStatus = (
    targetIdOrEmail: string,
    status: 'Active' | 'Expired',
    expiresAt?: string,
    planId?: string,
    cycle?: 'monthly' | 'yearly',
    trialEndsAt?: string
  ) => {
    const nextExpiry = expiresAt || (status === 'Active'
      ? new Date(Date.now() + (cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]);
    const matchedPlan = planId ? subscriptionPlans.find((p) => p.id === planId) : undefined;

    setAgents((prev) => {
      const updated = prev.map((agt) => {
        if (agt.id === targetIdOrEmail || agt.email?.toLowerCase() === targetIdOrEmail.toLowerCase()) {
          const updatedAgt: Agent = {
            ...agt,
            subscriptionStatus: status,
            subscriptionExpiresAt: nextExpiry,
            ...(planId
              ? { planId, subscriptionPlan: planId }
              : status === 'Expired'
              ? { planId: 'starter', subscriptionPlan: 'starter' }
              : {}),
            ...(cycle ? { billingCycle: cycle } : {}),
            trialEndsAt
          };
          saveAgentToFirestore(updatedAgt).catch((err) => console.error('Firestore update agent error:', err));
          return updatedAgt;
        }
        return agt;
      });
      return updated;
    });

    setAllUsers((prev) =>
      prev.map((u) => {
        if (u.id === targetIdOrEmail || u.email?.toLowerCase() === targetIdOrEmail.toLowerCase()) {
          const updatedU: User = {
            ...u,
            subscriptionStatus: status,
            subscriptionExpiresAt: nextExpiry,
            ...(planId
              ? { planId, subscriptionPlan: planId }
              : status === 'Expired'
              ? { planId: 'starter', subscriptionPlan: 'starter' }
              : {}),
            ...(cycle ? { billingCycle: cycle } : {}),
            trialEndsAt,
            ...(matchedPlan ? { includedBoostsRemaining: matchedPlan.includedBoosts ?? matchedPlan.featuredListings ?? 0 } : {})
          };
          saveUserToFirestore(updatedU).catch(() => {});
          return updatedU;
        }
        return u;
      })
    );

    if (user && (user.id === targetIdOrEmail || user.email?.toLowerCase() === targetIdOrEmail.toLowerCase())) {
      const updatedUser: User = {
        ...user,
        subscriptionStatus: status,
        subscriptionExpiresAt: nextExpiry,
        ...(planId
          ? { planId, subscriptionPlan: planId }
          : status === 'Expired'
          ? { planId: 'starter', subscriptionPlan: 'starter' }
          : {}),
        ...(cycle ? { billingCycle: cycle } : {}),
        trialEndsAt,
        ...(matchedPlan ? { includedBoostsRemaining: matchedPlan.includedBoosts ?? matchedPlan.featuredListings ?? 0 } : {})
      };
      setUser(updatedUser);
      saveUserToFirestore(updatedUser).catch((err) => console.error('Firestore update user error:', err));
    }

    if (status === 'Expired') {
      applySoftDowngradeForTarget(targetIdOrEmail);
    } else {
      restorePropertiesForTarget(targetIdOrEmail);
    }
  };

  // Wishlist Actions
  const toggleWishlist = (propertyId: string) => {
    setWishlist((prev) => {
      const next = prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId];
      writeStoredWishlist(next);
      return next;
    });
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

  // Invoices Actions & P2 Manual Billing Workflow
  const addInvoice = (invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
    saveInvoiceToFirestore(invoice).catch(err => console.error(err));
  };

  const updateInvoice = (updatedInvoice: Invoice) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
    saveInvoiceToFirestore(updatedInvoice).catch(err => console.error(err));
  };

  const subscribeToPlan = async (
    plan: SubscriptionPlan,
    cycle: 'monthly' | 'yearly',
    paymentMethodId?: string,
    useTrial = false
  ): Promise<{ success: boolean; invoice?: Invoice; message?: string }> => {
    if (!user) {
      return { success: false, message: 'Veuillez vous connecter pour souscrire à un forfait.' };
    }
    const normPlan = normalizePlan(plan, cdfExchangeRate);
    const trialDays = Number(normPlan.trialDays || 0);
    const isTrial = Boolean(useTrial && trialDays > 0);
    const priceUsd = isTrial ? 0 : (cycle === 'yearly' ? (normPlan.priceYearly ?? normPlan.priceMonthly * 10) : normPlan.priceMonthly);
    const priceCdf = isTrial ? 0 : Math.round(priceUsd * cdfExchangeRate);
    const isZero = priceUsd <= 0;
    const nowIso = new Date().toISOString();
    const durationDays = isTrial ? trialDays : (cycle === 'yearly' ? 365 : 30);
    const periodEnd = new Date(Date.now() + durationDays * 86400000).toISOString().split('T')[0];
    const pm = paymentMethods.find((m) => m.id === paymentMethodId) || paymentMethods.find((m) => m.is_active !== false);

    // Call backend API if authenticated with token
    let serverInv: any = null;
    try {
      const res = await mysqlApi.createInvoice(normPlan.id, pm?.id, isTrial ? 'free_trial' : 'manual_mobile_money', cycle, isTrial);
      if (res?.success && res?.invoice) serverInv = res.invoice;
    } catch {}

    const newInvoice: Invoice = {
      id: serverInv?.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      invoiceNumber: serverInv?.invoice_number || serverInv?.invoiceNumber || `FAC-KIN-${Math.floor(100000 + Math.random() * 900000)}`,
      receiptNumber: serverInv?.receipt_number || (isZero ? `REC-KIN-${Math.floor(100000 + Math.random() * 900000)}` : undefined),
      targetType: user.role === 'agency' ? 'agency' : user.role === 'agent' ? 'agent' : 'user',
      targetId: user.agencyId || user.id,
      targetName: user.agencyName || user.name,
      targetEmail: user.email,
      targetPhone: user.phone,
      planId: normPlan.id,
      planName: normPlan.name,
      billingCycle: cycle,
      isTrial,
      items: [
        {
          id: `item_${Date.now()}`,
          description: isTrial
            ? `Essai gratuit ${trialDays} jours — ${normPlan.name}`
            : `Abonnement ${normPlan.name} (${cycle === 'yearly' ? 'Annuel' : 'Mensuel'})`,
          amount: priceUsd,
          quantity: 1
        }
      ],
      subtotalAmount: priceUsd,
      taxAmount: 0,
      totalAmount: priceUsd,
      totalAmountCDF: priceCdf,
      currency: 'USD',
      status: isZero ? 'paid' : 'pending',
      paymentMethod: (pm?.provider === 'mpesa' ? 'mpesa' : pm?.provider === 'airtel' ? 'airtel_money' : pm?.provider === 'bank_transfer' ? 'bank_transfer' : 'orange_money'),
      paymentMethodId: pm?.id,
      paymentMethodProvider: isTrial ? 'Essai Gratuit Kinimmo' : (pm?.account_name || 'Mobile Money'),
      periodStart: nowIso.split('T')[0],
      periodEnd,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      createdAt: nowIso,
      ...(isZero ? { paidAt: nowIso, validatedAt: nowIso, validatedBy: 'Système Kinimmo' } : {})
    };

    setInvoices((prev) => [newInvoice, ...prev.filter((i) => i.id !== newInvoice.id)]);
    saveInvoiceToFirestore(newInvoice).catch(() => {});

    if (isZero) {
      const targetKey = user.role === 'agency' ? (user.agencyId || user.id) : user.id;
      if (user.role === 'agency') {
        updateAgencySubscriptionStatus(targetKey, 'Active', periodEnd, normPlan.id, cycle, isTrial ? periodEnd : undefined);
      } else {
        updateUserSubscriptionStatus(targetKey, 'Active', periodEnd, normPlan.id, cycle, isTrial ? periodEnd : undefined);
      }
      pushBillingNotification({
        userId: user.id,
        type: 'payment_approved',
        title: isTrial ? `Essai gratuit activé (${trialDays} j)` : `Plan ${normPlan.name} activé`,
        message: `Votre formule ${normPlan.name} est active jusqu'au ${periodEnd}.`,
        invoiceId: newInvoice.id
      });
    }

    return {
      success: true,
      invoice: newInvoice,
      message: isZero ? `Forfait ${normPlan.name} activé avec succès.` : `Facture ${newInvoice.invoiceNumber} créée. Veuillez effectuer le paiement Mobile Money et transmettre la référence.`
    };
  };

  const submitManualPaymentProof = async (
    invoiceId: string,
    payload: { paymentMethodId?: string; transactionReference?: string; proofImageUrl?: string }
  ): Promise<{ success: boolean; invoice?: Invoice; message?: string }> => {
    const pm = paymentMethods.find((m) => m.id === payload.paymentMethodId);
    const nowIso = new Date().toISOString();

    try {
      await mysqlApi.submitPaymentProof(invoiceId, {
        paymentMethodId: payload.paymentMethodId,
        transactionReference: payload.transactionReference,
        proofImageUrl: payload.proofImageUrl
      });
    } catch {}

    let updatedObj: Invoice | undefined;
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoiceId || inv.invoiceNumber === invoiceId) {
          updatedObj = {
            ...inv,
            status: 'awaiting_validation',
            paymentMethodId: payload.paymentMethodId || inv.paymentMethodId,
            paymentMethodProvider: pm?.account_name || inv.paymentMethodProvider,
            transactionReference: payload.transactionReference || inv.transactionReference,
            proofImageUrl: payload.proofImageUrl ?? inv.proofImageUrl,
            paymentSubmittedAt: nowIso,
            rejectionReason: undefined
          };
          saveInvoiceToFirestore(updatedObj).catch(() => {});
          return updatedObj;
        }
        return inv;
      })
    );

    if (user) {
      pushBillingNotification({
        userId: user.id,
        type: 'payment_submitted',
        title: 'Preuve transmise pour validation',
        message: `Votre preuve pour la facture ${updatedObj?.invoiceNumber || invoiceId} est en attente de vérification par l'administrateur.`,
        invoiceId
      });
    }

    return {
      success: true,
      invoice: updatedObj,
      message: 'Preuve transmise ! Votre facture est maintenant « en attente de validation ».'
    };
  };

  const approveManualInvoice = async (invoiceId: string): Promise<{ success: boolean; message?: string; restoredCount?: number }> => {
    const target = invoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!target) return { success: false, message: 'Facture introuvable.' };

    let apiRes: any = null;
    try {
      apiRes = await mysqlApi.approveInvoice(invoiceId);
    } catch {}

    const serverInv = apiRes?.invoice;
    const serverProp = apiRes?.property;
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const cycle: 'monthly' | 'yearly' = target.billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const matchedPlan = subscriptionPlans.find((p) => p.id === target.planId);
    const durationDays = target.isTrial ? Math.max(1, Number(matchedPlan?.trialDays || 7)) : (cycle === 'yearly' ? 365 : 30);
    const nextExpiry = new Date(nowMs + durationDays * 86400000).toISOString().split('T')[0];
    const receiptNum = serverInv?.receipt_number || serverInv?.receiptNumber || target.receiptNumber || `REC-KIN-${Math.floor(100000 + Math.random() * 900000)}`;

    const anyInv = target as any;
    const targetPropId = serverInv?.property_id || anyInv.propertyId || anyInv.property_id || (String(anyInv.targetType) === 'property' ? target.targetId : null);

    let fallbackStartsAt = nowIso;
    let fallbackExpiresAt = new Date(nowMs + (Number(anyInv.duration_days) || 7) * 86400000).toISOString();
    let fallbackViewsBefore = 0;
    let fallbackContactsBefore = 0;
    let resolvedLabel = serverInv?.boost_label || anyInv.boost_label;

    if (targetPropId) {
      const existingProp = properties.find((p) => p.id === targetPropId);
      const optionId = String(serverInv?.option_id || anyInv.optionId || anyInv.option_id || '').toLowerCase();
      const boostType = String(serverInv?.boost_type || anyInv.boost_type || (optionId.includes('sponsor') ? 'sponsorise' : optionId.includes('premium') ? 'premium' : optionId.includes('urgent') ? 'urgent' : 'featured')).toLowerCase();
      let boostDays = Number(serverInv?.duration_days || anyInv.duration_days) || 7;
      if (!serverInv?.duration_days && !anyInv.duration_days) {
        if (optionId.includes('30')) boostDays = 30;
        else if (optionId.includes('14')) boostDays = 14;
      }

      if (existingProp && isBoostWindowActive(existingProp.boostStartedAt, existingProp.boostExpiresAt, nowMs)) {
        const curExpMs = Date.parse(existingProp.boostExpiresAt!);
        fallbackStartsAt = existingProp.boostStartedAt || nowIso;
        fallbackExpiresAt = new Date(curExpMs + boostDays * 86400000).toISOString();
      } else {
        fallbackExpiresAt = new Date(nowMs + boostDays * 86400000).toISOString();
      }

      if (existingProp) {
        fallbackViewsBefore = Number(existingProp.viewsCount || 0);
        fallbackContactsBefore = Number(existingProp.whatsappClicks || 0) + Number(existingProp.phoneCalls || 0) + Number(existingProp.leadsCount || 0);
      }

      if (!resolvedLabel && boostType !== 'urgent') {
        resolvedLabel = resolveBoostPrimaryLabel(boostType, serverInv?.badge_text || anyInv.badge_text);
      }

      const finalStartsAt = serverInv?.starts_at || serverProp?.boostStartedAt || fallbackStartsAt;
      const finalExpiresAt = serverInv?.expires_at || serverProp?.boostExpiresAt || fallbackExpiresAt;

      setProperties((curr) => {
        const updatedProps = curr.map((p) => {
          if (p.id === targetPropId) {
            if (serverProp) {
              return { ...p, ...serverProp };
            }
            const isUrg = boostType === 'urgent' || optionId.includes('urgent');
            const isPrem = boostType === 'premium' || optionId.includes('premium');
            const isSpons = resolvedLabel === 'Sponsorisé' || boostType === 'sponsorise';
            const isFeat = !isUrg && (resolvedLabel === 'À la une' || boostType === 'featured' || isPrem);
            return {
              ...p,
              boostStartedAt: finalStartsAt,
              boostExpiresAt: finalExpiresAt,
              boostSuspended: false,
              boostType: boostType as any,
              boostLabel: isUrg ? p.boostLabel : resolvedLabel,
              featured: isFeat || p.featured,
              isPremium: isPrem || p.isPremium,
              isSponsored: isSpons || p.isSponsored,
              isUrgent: isUrg || p.isUrgent,
              listingTier: isPrem ? 'premium' : (isFeat || isSpons ? 'featured' : p.listingTier),
              refreshBumpAt: nowIso,
              updatedAt: nowIso
            };
          }
          return p;
        });
        saveDurableLocalProperties(updatedProps);
        return updatedProps;
      });
      promotePropertyToHero(targetPropId);
    }

    const updatedInv: Invoice = {
      ...target,
      ...(serverInv ? {
        starts_at: serverInv.starts_at,
        expires_at: serverInv.expires_at,
        views_before: serverInv.views_before,
        contacts_before: serverInv.contacts_before,
        boost_type: serverInv.boost_type,
        boost_label: serverInv.boost_label,
      } : targetPropId ? {
        starts_at: fallbackStartsAt,
        expires_at: fallbackExpiresAt,
        views_before: fallbackViewsBefore,
        contacts_before: fallbackContactsBefore,
        boost_label: resolvedLabel,
      } : {}),
      status: 'paid',
      paidAt: serverInv?.paid_at || nowIso,
      validatedAt: nowIso,
      validatedBy: user?.name || 'Administrateur Kinimmo',
      receiptNumber: receiptNum,
      periodStart: nowIso.split('T')[0],
      periodEnd: nextExpiry,
      rejectionReason: undefined
    };

    setInvoices((prev) => prev.map((inv) => (inv.id === target.id ? updatedInv : inv)));
    saveInvoiceToFirestore(updatedInv).catch(() => {});

    let restoredCount = 0;
    if (!targetPropId) {
      if (target.targetType === 'agency' || target.targetId.startsWith('agency_')) {
        updateAgencySubscriptionStatus(target.targetId, 'Active', nextExpiry, target.planId, cycle);
      }
      updateUserSubscriptionStatus(target.targetId, 'Active', nextExpiry, target.planId, cycle);
      if (target.targetEmail) {
        updateUserSubscriptionStatus(target.targetEmail, 'Active', nextExpiry, target.planId, cycle);
      }
      restoredCount = restoreSoftHiddenProperties(properties, target.targetId).restoredIds.length;
    }

    pushBillingNotification({
      userId: target.targetId,
      type: 'payment_approved',
      title: `Paiement validé — ${receiptNum}`,
      message: `La facture ${target.invoiceNumber} a été validée. Votre reçu PDF est disponible.`,
      invoiceId: target.id
    });

    return {
      success: true,
      restoredCount,
      message: `Facture ${target.invoiceNumber} validée (${receiptNum}).`
    };
  };

  const rejectManualInvoice = async (invoiceId: string, reason: string): Promise<{ success: boolean; message?: string }> => {
    const target = invoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!target) return { success: false, message: 'Facture introuvable.' };

    try {
      await mysqlApi.rejectInvoice(invoiceId, reason);
    } catch {}

    const nowIso = new Date().toISOString();
    const updatedInv: Invoice = {
      ...target,
      status: 'rejected',
      rejectionReason: reason,
      notes: `Refusé : ${reason}`,
      validatedAt: nowIso,
      validatedBy: user?.name || 'Administrateur Kinimmo'
    };

    setInvoices((prev) => prev.map((inv) => (inv.id === target.id ? updatedInv : inv)));
    saveInvoiceToFirestore(updatedInv).catch(() => {});

    pushBillingNotification({
      userId: target.targetId,
      type: 'payment_rejected',
      title: `Paiement refusé (${target.invoiceNumber})`,
      message: reason,
      invoiceId: target.id
    });

    return { success: true, message: `Paiement refusé pour ${target.invoiceNumber}.` };
  };

  const refundManualInvoice = async (
    invoiceId: string,
    refundNote: string,
    refundAction: 'revoke' | 'keep'
  ): Promise<{ success: boolean; message?: string; softHiddenCount?: number }> => {
    const target = invoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId);
    if (!target) return { success: false, message: 'Facture introuvable.' };

    try {
      await mysqlApi.refundInvoice(invoiceId, { refundNote, refundAction });
    } catch {}

    const nowIso = new Date().toISOString();
    const updatedInv: Invoice = {
      ...target,
      status: 'refunded',
      refundNote,
      refundedAt: nowIso,
      refundAction,
      validatedBy: user?.name || 'Administrateur Kinimmo',
      notes: `Remboursement (${refundAction === 'revoke' ? 'Avantage révoqué' : 'Avantage maintenu'}) : ${refundNote}`
    };

    setInvoices((prev) => prev.map((inv) => (inv.id === target.id ? updatedInv : inv)));
    saveInvoiceToFirestore(updatedInv).catch(() => {});

    let softHiddenCount = 0;
    const anyInv = target as any;
    const targetPropId = anyInv.propertyId || anyInv.property_id || (String(anyInv.targetType) === 'property' ? target.targetId : null);

    if (refundAction === 'revoke') {
      if (targetPropId) {
        setProperties((curr) => {
          const updatedProps = curr.map((p) =>
            p.id === targetPropId
              ? {
                  ...p,
                  featured: false,
                  isPremium: false,
                  isSponsored: false,
                  isUrgent: false,
                  boostSuspended: false,
                  boostStartedAt: undefined,
                  boostExpiresAt: undefined,
                  boostLabel: undefined,
                  boostType: undefined,
                  boostBadgeText: undefined,
                  listingTier: 'standard' as const,
                  updatedAt: nowIso,
                }
              : p
          );
          saveDurableLocalProperties(updatedProps);
          return updatedProps;
        });
        removePropertyFromHero(targetPropId);
      } else {
        const freeCap = getFreePlan(subscriptionPlans).maxListings;
        softHiddenCount = enforceSoftDowngradeOnProperties(properties, target.targetId, freeCap).hiddenIds.length;
        if (target.targetType === 'agency' || target.targetId.startsWith('agency_')) {
          updateAgencySubscriptionStatus(target.targetId, 'Expired');
        }
        updateUserSubscriptionStatus(target.targetId, 'Expired');
        if (target.targetEmail) {
          updateUserSubscriptionStatus(target.targetEmail, 'Expired');
        }
      }
    }

    pushBillingNotification({
      userId: target.targetId,
      type: 'payment_refunded',
      title: `Remboursement effectué (${target.invoiceNumber})`,
      message: `${refundNote} — ${refundAction === 'revoke' ? 'Forfait/Boost révoqué' : 'Forfait/Boost maintenu'}.`,
      invoiceId: target.id
    });

    return {
      success: true,
      softHiddenCount,
      message: refundAction === 'revoke'
        ? `Remboursement enregistré et avantage révoqué (${softHiddenCount} annonce(s) excédentaire(s) masquée(s)).`
        : 'Remboursement enregistré ; le plan/boost reste actif.'
    };
  };

  const runSubscriptionExpirationAudit = () => {
    const freeCap = getFreePlan(subscriptionPlans).maxListings;
    let downgradedCount = 0;
    let hiddenListingsCount = 0;
    let expiringSoonCount = 0;
    let workingProps = [...properties];

    const accountsToAudit: Array<{ id: string; email?: string; name?: string; type: 'agency' | 'user'; planId?: string; expiresAt?: string; status?: 'Active' | 'Expired' }> = [];
    agencies.forEach((ag) => accountsToAudit.push({ id: ag.id, email: ag.email, name: ag.name, type: 'agency', planId: ag.planId || ag.subscriptionPlan, expiresAt: ag.subscriptionExpiresAt, status: ag.subscriptionStatus }));
    allUsers.filter((u) => u.role !== 'admin').forEach((u) => accountsToAudit.push({ id: u.id, email: u.email, name: u.name, type: 'user', planId: u.planId || u.subscriptionPlan, expiresAt: u.subscriptionExpiresAt, status: u.subscriptionStatus }));
    if (user && user.role !== 'admin' && !accountsToAudit.some((a) => a.id === user.id)) {
      accountsToAudit.push({ id: user.id, email: user.email, name: user.name, type: user.role === 'agency' ? 'agency' : 'user', planId: user.planId || user.subscriptionPlan, expiresAt: user.subscriptionExpiresAt, status: user.subscriptionStatus });
    }

    accountsToAudit.forEach((acc) => {
      const summary = resolveAccountBillingSummary({
        user: {
          id: acc.id,
          email: acc.email,
          planId: acc.planId || 'starter',
          subscriptionStatus: acc.status,
          subscriptionExpiresAt: acc.expiresAt
        },
        plans: subscriptionPlans,
        properties: workingProps,
        propertyVideos,
        agents
      });
      if (summary.isExpiringSoon) {
        expiringSoonCount += 1;
        pushBillingNotification({
          userId: acc.id,
          type: 'expiry_warning',
          title: `Échéance proche : ${summary.plan.name}`,
          message: `Votre abonnement expire dans ${summary.daysRemaining} jour(s). Renouvelez pour conserver vos quotas.`
        });
      }
      if (summary.isExpired && summary.activePlan.id !== 'starter' && summary.activePlan.priceMonthly > 0) {
        downgradedCount += 1;
        const downgradeRes = enforceSoftDowngradeOnProperties(workingProps, acc.id, freeCap);
        workingProps = downgradeRes.updatedProperties;
        hiddenListingsCount += downgradeRes.hiddenIds.length;
        if (acc.type === 'agency') {
          updateAgencySubscriptionStatus(acc.id, 'Expired');
        } else {
          updateUserSubscriptionStatus(acc.id, 'Expired');
        }
        pushBillingNotification({
          userId: acc.id,
          type: 'expired_downgrade',
          title: 'Rétrogradation douce appliquée',
          message: downgradeRes.hiddenIds.length > 0
            ? `Votre abonnement a expiré. ${freeCap} annonce(s) récentes restent actives et ${downgradeRes.hiddenIds.length} annonce(s) ont été masquées sans suppression.`
            : 'Votre abonnement a expiré et votre compte est repassé sur le plan gratuit.'
        });
      }
    });

    if (hiddenListingsCount > 0) {
      setProperties(workingProps);
      saveDurableLocalProperties(workingProps);
    }
    mysqlApi.runExpirationCheck().catch(() => {});
    return { downgradedCount, hiddenListingsCount, expiringSoonCount };
  };

  // Audit automatique à l'ouverture de session pour alerter ou appliquer la rétrogradation douce
  useEffect(() => {
    if (!user || user.role === 'admin' || properties.length === 0) return;
    const summary = resolveAccountBillingSummary({
      user,
      plans: subscriptionPlans,
      properties,
      propertyVideos,
      agents
    });
    if (summary.isExpiringSoon) {
      pushBillingNotification({
        userId: user.id,
        type: 'expiry_warning',
        title: `Abonnement bientôt expiré (${summary.daysRemaining}j)`,
        message: `Votre formule ${summary.plan.name} expire le ${new Date(summary.expiresAt || '').toLocaleDateString('fr-FR')}.`
      });
    } else if (summary.isExpired && summary.activePlan.id !== 'starter' && summary.activePlan.priceMonthly > 0) {
      runSubscriptionExpirationAudit();
    }
  }, [user?.id]);

  const updateInvoiceStatus = (id: string, status: Invoice['status'], paymentMethod?: Invoice['paymentMethod'], notes?: string) => {
    if (status === 'paid') {
      approveManualInvoice(id).catch(() => {});
      return;
    }
    if (status === 'rejected') {
      rejectManualInvoice(id, notes || 'Paiement refusé par l’administrateur').catch(() => {});
      return;
    }
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === id) {
          const updatedInv: Invoice = {
            ...inv,
            status,
            ...(paymentMethod ? { paymentMethod } : {}),
            ...(notes ? { notes } : {})
          };
          saveInvoiceToFirestore(updatedInv).catch(err => console.error(err));
          if (status === 'overdue' || status === 'cancelled') {
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
      })
    );
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
      const prop = properties.find((p) => p.id === id || p.slug === id);
      updateBrowserUrlForProperty(prop || id, prop?.title, properties);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
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
        cdfExchangeRateUpdatedAt,
        setCdfExchangeRate: handleSetCdfExchangeRate,
        paymentMethods,
        savePaymentMethod,
        deletePaymentMethod,
        inAppBillingNotifications,
        pushBillingNotification,
        markBillingNotificationRead,
        dismissBillingNotification,
        subscribeToPlan,
        submitManualPaymentProof,
        approveManualInvoice,
        rejectManualInvoice,
        refundManualInvoice,
        runSubscriptionExpirationAudit,
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
        setIsFieldsBuilderOpen: (open: boolean) => {
          setIsFieldsBuilderOpen(open);
          if (open) dispatchAppNavigate('/admin/champs');
        },
        isSubmitPropertyOpen,
        setIsSubmitPropertyOpen: (open: boolean) => {
          setIsSubmitPropertyOpen(open);
          if (open) {
            dispatchAppNavigate('/publier');
          }
        },
        isAuthModalOpen,
        setIsAuthModalOpen: (open: boolean) => {
          setIsAuthModalOpen(open);
          if (open) dispatchAppNavigate('/connexion');
        },
        isSecurityModalOpen,
        setIsSecurityModalOpen: (open: boolean) => {
          setIsSecurityModalOpen(open);
          if (open) dispatchAppNavigate('/compte/securite');
        },
        isCompareOpen,
        setIsCompareOpen: (open: boolean) => {
          setIsCompareOpen(open);
          if (open) dispatchAppNavigate('/comparer');
        },
        editingProperty,
        setEditingProperty,
        importCSV,
        exportCSV,
        googleAnalyticsId,
        updateGoogleAnalyticsId,
        incrementPropertyViews,
        recordPropertyAction,
        requestConfirm,
        heroSlides,
        setHeroSlides,
        addHeroSlide,
        updateHeroSlide,
        deleteHeroSlide,
        promotePropertyToHero,
        removePropertyFromHero,
        contactSettings,
        updateContactSettings,
        reports,
        addPropertyReport,
        resolvePropertyReport,
        propertyVideos,
        loadPropertyVideos,
        addPropertyVideo,
        updatePropertyVideoStatus,
        deletePropertyVideo,
        updatePropertyListingStatus,
        assignPropertyToAgent,
        agencyCollaborators,
        inviteAgencyCollaborator,
        updateAgencyCollaborator,
        deleteAgencyCollaborator,
        agencyTransactions,
        createAgencyTransaction,
        blogArticles,
        legalDocuments,
        upsertBlogArticle,
        deleteBlogArticle,
        updateLegalDocument,
      }}
    >
      <div dir={languages.find((l) => l.code === language)?.dir || 'ltr'}>
        {children}
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative">
            <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-extrabold text-slate-900">
                {confirmState.title || 'Confirmer cette action'}
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                {confirmState.message}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors cursor-pointer"
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
                className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {confirmState.confirmText || 'Confirmer'}
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
