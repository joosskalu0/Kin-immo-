import React, { createContext, useContext, useState, useEffect } from 'react';
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
} from '../types';
import {
  initialProperties,
  initialCustomFields,
  initialAgents,
  initialAgencies,
  initialLeads,
  initialInvoices,
} from '../data/mockData';
import { translations, languages } from '../utils/i18n';
import Papa from 'papaparse';
import {
  seedInitialFirestoreData,
  subscribeToProperties,
  subscribeToCustomFields,
  subscribeToLeads,
  subscribeToInvoices,
  savePropertyToFirestore,
  deletePropertyFromFirestore,
  saveCustomFieldToFirestore,
  deleteCustomFieldFromFirestore,
  saveLeadToFirestore,
  saveUserToFirestore,
  saveInvoiceToFirestore,
  deleteInvoiceFromFirestore,
  saveAdminPinToFirestore,
  getAdminPinFromFirestore
} from '../lib/firebase';

interface AppContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currency: CurrencyCode;
  setCurrency: (curr: CurrencyCode) => void;
  t: (key: string) => string;

  user: User | null;
  setUser: (user: User | null) => void;

  customFields: CustomFieldDefinition[];
  addCustomField: (field: CustomFieldDefinition) => void;
  updateCustomField: (field: CustomFieldDefinition) => void;
  deleteCustomField: (id: string) => void;

  properties: Property[];
  addProperty: (property: Property) => void;
  updateProperty: (property: Property) => void;
  deleteProperty: (id: string) => void;

  agents: Agent[];
  agencies: Agency[];

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

  invoices: Invoice[];
  addInvoice: (invoice: Invoice) => void;
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

const defaultUser: User = {
  id: 'user_agent_kinshasa',
  name: 'Jean-Luc Mpoy',
  email: 'jeanluc.mpoy@kinshasa-prestige.cd',
  phone: '+243 81 555 44 33',
  role: 'agent',
  avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
  agentId: 'agent_1',
  agencyName: 'Kinshasa Prestige Real Estate',
  rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
  planId: 'pro',
  isVerified: true,
  emailVerified: true,
  phoneVerified: true,
  twoFactorEnabled: true,
  twoFactorMethod: 'authenticator',
  kinshasaBadgeVerified: true,
  lastLoginLocation: 'Kinshasa (Gombe), RDC',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageCode>('fr');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('estatik_kinshasa_user');
    return saved ? JSON.parse(saved) : defaultUser;
  });

  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => {
    const saved = localStorage.getItem('immocraft_custom_fields');
    return saved ? JSON.parse(saved) : initialCustomFields;
  });

  const [properties, setProperties] = useState<Property[]>(() => {
    const saved = localStorage.getItem('immocraft_properties');
    return saved ? JSON.parse(saved) : initialProperties;
  });

  const [agents] = useState<Agent[]>(initialAgents);
  const [agencies] = useState<Agency[]>(initialAgencies);

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

  // Admin PIN Secret State
  const [adminPin, setAdminPinState] = useState<string>(() => {
    return localStorage.getItem('kin_admin_secret_pin') || '2026';
  });

  useEffect(() => {
    getAdminPinFromFirestore().then((pin) => {
      if (pin) {
        setAdminPinState(pin);
        localStorage.setItem('kin_admin_secret_pin', pin);
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
      if (firestoreProps && firestoreProps.length > 0) {
        setProperties(firestoreProps);
      }
    });

    const unsubFields = subscribeToCustomFields((firestoreFields) => {
      if (firestoreFields && firestoreFields.length > 0) {
        setCustomFields(firestoreFields);
      }
    });

    const unsubLeads = subscribeToLeads((firestoreLeads) => {
      if (firestoreLeads && firestoreLeads.length > 0) {
        setLeads(firestoreLeads);
      }
    });

    const unsubInvoices = subscribeToInvoices((firestoreInvoices) => {
      if (firestoreInvoices && firestoreInvoices.length > 0) {
        setInvoices(firestoreInvoices);
      }
    });

    return () => {
      unsubProperties();
      unsubFields();
      unsubLeads();
      unsubInvoices();
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
    setProperties((prev) => [property, ...prev]);
    savePropertyToFirestore(property).catch(err => console.error(err));
  };

  const updateProperty = (property: Property) => {
    setProperties((prev) => prev.map((p) => (p.id === property.id ? property : p)));
    savePropertyToFirestore(property).catch(err => console.error(err));
  };

  const deleteProperty = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
    deletePropertyFromFirestore(id).catch(err => console.error(err));
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

  // Invoices Actions
  const addInvoice = (invoice: Invoice) => {
    setInvoices((prev) => [invoice, ...prev]);
    saveInvoiceToFirestore(invoice).catch(err => console.error(err));
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
    document.body.removeChild(link);
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
        customFields,
        addCustomField,
        updateCustomField,
        deleteCustomField,
        properties,
        addProperty,
        updateProperty,
        deleteProperty,
        agents,
        agencies,
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
        invoices,
        addInvoice,
        updateInvoiceStatus,
        deleteInvoice,
        adminPin,
        updateAdminPin,
        filters,
        setFilters,
        resetFilters,
        activePropertyModalId,
        setActivePropertyModalId,
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
      }}
    >
      <div dir={languages.find((l) => l.code === language)?.dir || 'ltr'}>
        {children}
      </div>
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
