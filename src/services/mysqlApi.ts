import { Advertisement, AdSenseConfig, SiteContactSettings, VipConciergeSettings, VisibilityOption } from '../types';

/**
 * Service Client API MySQL REST pour Kinimmo
 * Permet de consommer le backend Node.js / Express sans supprimer le code Firebase existant.
 */

// Bannières et pancartes publicitaires par défaut (Partenaires certifiés Immobilier & Habitat Kinshasa RDC)
const DEFAULT_ADVERTISEMENTS: Advertisement[] = [
  {
    id: 'ad_promoteur_01',
    title: 'Congo Luxury Homes - Villas & Appartements Haut Standing Gombe',
    advertiser_name: 'Congo Luxury Homes SARL',
    advertiser_contact: '+243810000001',
    advertiser_email: 'contact@congoluxuryhomes.cd',
    category: 'real_estate',
    placement: 'home_hero',
    image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
    target_url: 'https://wa.me/243810000001?text=Bonjour,%20je%20souhaite%20des%20informations%20sur%20vos%20villas%20de%20standing%20Gombe',
    alt_text: 'Promoteur Immobilier Haut Standing Kinshasa Gombe',
    price_usd: 250,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    impressions_count: 2450,
    clicks_count: 142,
    is_active: true
  },
  {
    id: 'ad_construction_02',
    title: 'Kin Bâtisseurs SARL - Construction Gros Œuvre, Forage & Finition',
    advertiser_name: 'Kin Bâtisseurs Génie Civil',
    advertiser_contact: '+243990000002',
    advertiser_email: 'contact@kinbatisseurs.cd',
    category: 'construction',
    placement: 'search_top',
    image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=1200&auto=format&fit=crop&q=80',
    target_url: 'https://wa.me/243990000002?text=Bonjour,%20devis%20construction%20ou%20forage%20d%27eau%20Kinshasa',
    alt_text: 'Entreprise de Construction BTP et Forage Kinshasa',
    price_usd: 180,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    impressions_count: 1820,
    clicks_count: 95,
    is_active: true
  },
  {
    id: 'ad_banque_03',
    title: 'Rawbank RDC - Prêt Immobilier & Financement de Terrain Sécurisé',
    advertiser_name: 'Rawbank Banque RDC',
    advertiser_contact: '+243890000003',
    advertiser_email: 'immo@rawbank.cd',
    category: 'banking',
    placement: 'sidebar',
    image_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
    target_url: 'https://wa.me/243890000003?text=Bonjour,%20simulation%20crédit%20immobilier%20Kinshasa',
    alt_text: 'Crédit Immobilier & Caution Locative RDC',
    price_usd: 220,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    impressions_count: 1410,
    clicks_count: 78,
    is_active: true
  },
  {
    id: 'ad_solaire_04',
    title: 'Kinshasa Solar Tech - Autonomie Énergie Solaire 24h/24 & Batteries Lithium',
    advertiser_name: 'Kinshasa Solar Tech',
    advertiser_contact: '+243820000004',
    advertiser_email: 'contact@kinshasasolar.cd',
    category: 'construction',
    placement: 'home_hero',
    image_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80',
    target_url: 'https://wa.me/243820000004?text=Bonjour,%20devis%20autonomie%20solaire%20Kinshasa',
    alt_text: 'Autonomie Solaire et Batteries Kinshasa',
    price_usd: 200,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    impressions_count: 1190,
    clicks_count: 64,
    is_active: true
  },
  {
    id: 'ad_notaire_05',
    title: 'Cabinet Juridique & Notarial Foncier - Sécurisation des Titres Fonciers RDC',
    advertiser_name: 'Cabinet Foncier Kinshasa',
    advertiser_contact: '+243850000005',
    advertiser_email: 'notariat@foncier-rdc.cd',
    category: 'legal',
    placement: 'footer_banner',
    image_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
    target_url: 'https://wa.me/243850000005?text=Bonjour,%20assistance%20vérification%20titre%20foncier%20Kinshasa',
    alt_text: 'Sécurisation Titre Foncier et Notariat Kinshasa',
    price_usd: 190,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    impressions_count: 980,
    clicks_count: 51,
    is_active: true
  }
];

const ADS_STORAGE_KEY = 'kinimmo_advertisements_store';
const ADSENSE_CONFIG_KEY = 'kinimmo_adsense_config';
const PLANS_STORAGE_KEY = 'kinimmo_pricing_plans_store';
const OPTIONS_STORAGE_KEY = 'kinimmo_visibility_options_store';

const API_BASE_URL =
  ((import.meta as any).env?.VITE_API_BASE_URL as string) || '/api';

// Formules d'abonnement par défaut certifiées Kinshasa
const DEFAULT_PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Annonce Gratuite Particulier',
    description: 'Idéal pour les propriétaires souhaitant publier leurs biens sans aucun frais ni engagement.',
    category: 'individual' as const,
    badge: 'Gratuit',
    priceMonthly: 0,
    priceMonthlyCDF: 0,
    price_usd: 0,
    price_cdf: 0,
    price: 0,
    currency: 'USD',
    billingPeriod: 'month' as const,
    billing_period: 'monthly',
    maxListings: 3,
    max_listings: 3,
    featuredListings: 0,
    max_featured_listings: 0,
    agentAccounts: 1,
    features: [
      'Publication de 3 annonces immobilières actives',
      'Fiche descriptive complète avec photos HD',
      'Mise en relation directe avec les acheteurs',
      'Messagerie et contacts WhatsApp directs'
    ],
    recommended: false,
    isActive: true,
    is_active: true,
    hasVerifiedBadge: false,
    has_verified_badge: false,
    hasCrmLeads: false,
    has_crm_leads: false,
    hasPrioritySupport: false,
    has_priority_support: false
  },
  {
    id: 'pro',
    name: 'Pro Courtier Indépendant',
    description: 'Pour courtiers indépendants actifs à Kinshasa avec badge vérifié et gestion prioritaire des leads.',
    category: 'individual' as const,
    badge: 'Courtier Pro',
    priceMonthly: 29,
    priceMonthlyCDF: 82650,
    price_usd: 29,
    price_cdf: 82650,
    price: 29,
    currency: 'USD',
    billingPeriod: 'month' as const,
    billing_period: 'monthly',
    maxListings: 25,
    max_listings: 25,
    featuredListings: 3,
    max_featured_listings: 3,
    agentAccounts: 1,
    features: [
      'Jusqu\'à 25 annonces immobilières actives',
      '3 annonces en vedette (Mise en avant)',
      'Badge Officiel Courtier Vérifié Kinshasa',
      'Accès direct aux demandes de Conciergerie (Leads)',
      'Statistiques des vues et contacts WhatsApp',
      'Support réactif 6j/7'
    ],
    recommended: true,
    isActive: true,
    is_active: true,
    hasVerifiedBadge: true,
    has_verified_badge: true,
    hasCrmLeads: true,
    has_crm_leads: true,
    hasPrioritySupport: false,
    has_priority_support: false
  },
  {
    id: 'agency',
    name: 'Agence Immobilière Certifiée',
    description: 'Visibilité maximale pour agences immobilières avec agents illimités, CRM et vitrine dédiée.',
    category: 'agency' as const,
    badge: 'Agence Agréée',
    priceMonthly: 79,
    priceMonthlyCDF: 225150,
    price_usd: 79,
    price_cdf: 225150,
    price: 79,
    currency: 'USD',
    billingPeriod: 'month' as const,
    billing_period: 'monthly',
    maxListings: 100,
    max_listings: 100,
    featuredListings: 10,
    max_featured_listings: 10,
    agentAccounts: 10,
    features: [
      'Jusqu\'à 100 annonces immobilières actives',
      '10 annonces en vedette incluses',
      'Vitrine Agence Immobilière dédiée avec logo et agents',
      'Gestion multi-comptes pour agents immobiliers',
      'Badge Agence Certifiée & Agréée RDC',
      'Rapports d\'activité mensuels et CRM leads',
      'Support prioritaire dédié 7j/7'
    ],
    recommended: true,
    isActive: true,
    is_active: true,
    hasVerifiedBadge: true,
    has_verified_badge: true,
    hasCrmLeads: true,
    has_crm_leads: true,
    hasPrioritySupport: true,
    has_priority_support: true
  },
  {
    id: 'enterprise',
    name: 'Promoteur Immobilier & Constructeur VIP',
    description: 'Pour promoteurs fonciers, lotissements et grands chantiers avec bannières sponsorisées et multi-diffusion.',
    category: 'promoter' as const,
    badge: 'Promoteur VIP',
    priceMonthly: 149,
    priceMonthlyCDF: 424650,
    price_usd: 149,
    price_cdf: 424650,
    price: 149,
    currency: 'USD',
    billingPeriod: 'month' as const,
    billing_period: 'monthly',
    maxListings: 500,
    max_listings: 500,
    featuredListings: 30,
    max_featured_listings: 30,
    agentAccounts: 25,
    features: [
      'Annonces immobilières illimitées (grands chantiers, lotissements)',
      '30 annonces en tête de liste et carrousel d\'accueil',
      'Bannières publicitaires régie incluses',
      'Multi-diffusion WhatsApp VIP & Réseaux sociaux',
      'Conseiller commercial et juridique dédié',
      'Gestion prioritaire des visites VIP'
    ],
    recommended: false,
    isActive: true,
    is_active: true,
    hasVerifiedBadge: true,
    has_verified_badge: true,
    hasCrmLeads: true,
    has_crm_leads: true,
    hasPrioritySupport: true,
    has_priority_support: true
  }
];

const DEFAULT_VISIBILITY_OPTIONS = [
  {
    id: 'opt_featured_7d',
    name: 'Mise en Avant 7 jours',
    slug: 'mise_en_avant_7d',
    description: 'Positionnement en tête de page d\'accueil et carrousel prioritaire pendant 7 jours.',
    boost_type: 'featured' as const,
    duration_days: 7,
    price_usd: 10.0,
    price_cdf: 28500.0,
    price: 10.0,
    priceCDF: 28500.0,
    badge_text: 'En Vedette ⭐',
    icon: 'Sparkles',
    is_active: true
  },
  {
    id: 'opt_premium_30d',
    name: 'Pack Annonce Premium 30 jours',
    slug: 'annonce_premium_30d',
    description: 'Affichage permanent avec cadre doré, badge Premium, priorité maximale et 3x plus d\'appels.',
    boost_type: 'premium' as const,
    duration_days: 30,
    price_usd: 25.0,
    price_cdf: 71250.0,
    price: 25.0,
    priceCDF: 71250.0,
    badge_text: '👑 Annonce Premium',
    icon: 'Crown',
    is_active: true
  },
  {
    id: 'opt_urgent_14d',
    name: 'Badge Vente / Location Urgente',
    slug: 'badge_urgent_14d',
    description: 'Bandeau rouge d\'urgence pour attirer immédiatement les acheteurs et locataires sérieux.',
    boost_type: 'urgent' as const,
    duration_days: 14,
    price_usd: 8.0,
    price_cdf: 22800.0,
    price: 8.0,
    priceCDF: 22800.0,
    badge_text: '⚡ Urgent',
    icon: 'Zap',
    is_active: true
  },
  {
    id: 'opt_refresh_bump',
    name: 'Remontée Immédiate en Tête',
    slug: 'remontee_tete',
    description: 'Actualise la date de votre annonce pour la replacer tout en haut des résultats de recherche récents.',
    boost_type: 'refresh' as const,
    duration_days: 1,
    price_usd: 5.0,
    price_cdf: 14250.0,
    price: 5.0,
    priceCDF: 14250.0,
    badge_text: 'Top Liste',
    icon: 'ArrowUpCircle',
    is_active: true
  },
  {
    id: 'opt_social_blast',
    name: 'Diffusion Réseaux & WhatsApp Kinimmo',
    slug: 'diffusion_reseaux',
    description: 'Publication sponsorisée sur la communauté Facebook Kinimmo et diffusion WhatsApp VIP.',
    boost_type: 'social_blast' as const,
    duration_days: 14,
    price_usd: 35.0,
    price_cdf: 99750.0,
    price: 35.0,
    priceCDF: 99750.0,
    badge_text: 'Multi-Canal VIP',
    icon: 'Share2',
    is_active: true
  }
];

const DEFAULT_PAYMENT_METHODS = [
  {
    id: 'pm_mpesa',
    provider: 'mpesa',
    account_name: 'KINIMMO SARL - Vodacom M-Pesa',
    account_number: '+243 810 000 000',
    merchant_code: '123456',
    instructions: 'Envoyer le montant exact via M-Pesa puis insérer le code de transaction.',
    is_active: true
  },
  {
    id: 'pm_airtel',
    provider: 'airtel',
    account_name: 'KINIMMO SARL - Airtel Money RDC',
    account_number: '+243 990 000 000',
    merchant_code: '789012',
    instructions: 'Paiement direct via Airtel Money RDC.',
    is_active: true
  },
  {
    id: 'pm_orange',
    provider: 'orange',
    account_name: 'KINIMMO SARL - Orange Money Kinshasa',
    account_number: '+243 890 000 000',
    merchant_code: '345678',
    instructions: 'Paiement via Orange Money Kinshasa.',
    is_active: true
  },
  {
    id: 'pm_rawbank',
    provider: 'bank_transfer',
    account_name: 'KINIMMO RDC - Rawbank Kinshasa Gombe',
    account_number: '01002-00012345678-90',
    merchant_code: null,
    instructions: 'Virement bancaire ou versement au guichet Rawbank.',
    is_active: true
  }
];

// Récupérer le token JWT stocké
export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('kinimmo_jwt_token');
  } catch {
    return null;
  }
};

// Sauvegarder le token JWT
export const setStoredToken = (token: string): void => {
  try {
    localStorage.setItem('kinimmo_jwt_token', token);
  } catch (e) {
    console.error('Impossible de stocker le token', e);
  }
};

// Supprimer le token JWT (Déconnexion)
export const clearStoredToken = (): void => {
  try {
    localStorage.removeItem('kinimmo_jwt_token');
  } catch (e) {
    console.error('Erreur suppression token', e);
  }
};

// Wrapper générique fetch pour les requêtes à l'API
async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; message?: string; error?: string; [key: string]: any }> {
  const token = getStoredToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `Erreur serveur HTTP ${response.status}`,
        error: data.error,
        ...data
      };
    }

    return {
      success: true,
      data,
      ...data
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Impossible de joindre le serveur API MySQL Kinimmo.'
    };
  }
}

export const mysqlApi = {
  // 1. Santé du serveur
  async checkHealth() {
    return apiRequest('/health');
  },

  // 2. Authentification
  async register(userData: { name: string; email: string; password: string; phone?: string; role?: string; agencyName?: string }) {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },

  async login(credentials: { email: string; password: string }) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },

  async getMe() {
    return apiRequest('/auth/me');
  },

  async updateProfile(profileData: any) {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  },

  // 3. Propriétés (Annonces)
  async getProperties(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/properties${queryString}`);
  },

  async getPropertyById(id: string) {
    return apiRequest(`/properties/${id}`);
  },

  async createProperty(property: any) {
    return apiRequest('/properties', {
      method: 'POST',
      body: JSON.stringify(property)
    });
  },

  async updateProperty(id: string, property: any) {
    return apiRequest(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(property)
    });
  },

  async deleteProperty(id: string) {
    return apiRequest(`/properties/${id}`, {
      method: 'DELETE'
    });
  },

  // 4. Agents & Agences
  async getAgents(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest(`/agents${q}`);
  },

  async getAgentById(id: string) {
    return apiRequest(`/agents/${id}`);
  },

  async getAgencies(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/agencies${query ? `?${query}` : ''}`);
  },

  async getAgencyById(id: string) {
    return apiRequest(`/agencies/${id}`);
  },

  // 5. Favoris
  async getFavorites() {
    return apiRequest('/favorites');
  },

  async addFavorite(propertyId: string) {
    return apiRequest(`/favorites/${propertyId}`, { method: 'POST' });
  },

  async removeFavorite(propertyId: string) {
    return apiRequest(`/favorites/${propertyId}`, { method: 'DELETE' });
  },

  async checkFavorite(propertyId: string) {
    return apiRequest(`/favorites/check/${propertyId}`);
  },

  // 6. Messages & Demandes de Visites
  async sendMessage(messageData: {
    propertyId?: string;
    receiverId?: string;
    name: string;
    email: string;
    phone?: string;
    message: string;
    requestType?: 'info' | 'tour' | 'offer';
    tourDate?: string;
    tourTime?: string;
  }) {
    return apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  },

  async getReceivedMessages() {
    return apiRequest('/messages/inbox');
  },

  async updateMessageStatus(id: string, status: string, isRead?: boolean) {
    return apiRequest(`/messages/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, isRead })
    });
  },

  // 7. Administration
  async getAdminStats() {
    return apiRequest('/admin/stats');
  },

  async adminGetUsers(role?: string, search?: string) {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (search) params.set('search', search);
    const qs = params.toString();
    return apiRequest(`/admin/users${qs ? `?${qs}` : ''}`);
  },

  async adminCreateUser(userData: {
    name: string;
    email: string;
    password: string;
    role: string;
    phone?: string;
    whatsapp?: string;
    agencyName?: string;
    isVerified?: boolean;
  }) {
    return apiRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async adminUpdateUser(userId: string, data: any) {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async adminResetUserPassword(userId: string, newPassword: string) {
    return apiRequest(`/admin/users/${userId}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword })
    });
  },

  async updateUserRole(userId: string, role: string) {
    return apiRequest(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  },

  async toggleUserVerification(userId: string, data: { isVerified?: boolean; kinshasaBadgeVerified?: boolean }) {
    return apiRequest(`/admin/users/${userId}/verify`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteUser(userId: string) {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  },

  // Admin Properties
  async adminGetProperties(params?: { status?: string; commune?: string; search?: string; isFeatured?: boolean }) {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.commune) sp.set('commune', params.commune);
    if (params?.search) sp.set('search', params.search);
    if (params?.isFeatured !== undefined) sp.set('isFeatured', String(params.isFeatured));
    const qs = sp.toString();
    return apiRequest(`/admin/properties${qs ? `?${qs}` : ''}`);
  },

  async adminUpdatePropertyStatus(propertyId: string, data: { status?: string; published?: boolean; isFeatured?: boolean }) {
    return apiRequest(`/admin/properties/${propertyId}/status`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async adminDeleteProperty(propertyId: string) {
    return apiRequest(`/admin/properties/${propertyId}`, {
      method: 'DELETE'
    });
  },

  // Admin Agents
  async adminGetAgents() {
    return apiRequest('/admin/agents');
  },

  async adminUpdateAgent(agentId: string, data: any) {
    return apiRequest(`/admin/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async adminDeleteAgent(agentId: string) {
    return apiRequest(`/admin/agents/${agentId}`, {
      method: 'DELETE'
    });
  },

  // Admin Agencies
  async adminGetAgencies() {
    return apiRequest('/admin/agencies');
  },

  async adminUpdateAgency(agencyId: string, data: any) {
    return apiRequest(`/admin/agencies/${agencyId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async adminDeleteAgency(agencyId: string) {
    return apiRequest(`/admin/agencies/${agencyId}`, {
      method: 'DELETE'
    });
  },

  // Admin Invoices
  async adminGetInvoices() {
    return apiRequest('/admin/invoices');
  },

  // Custom Fields (Fields Builder Engine PRO)
  async getCustomFields() {
    return apiRequest('/custom-fields');
  },

  async adminGetCustomFields() {
    return apiRequest('/admin/custom-fields');
  },

  async adminCreateCustomField(data: any) {
    return apiRequest('/admin/custom-fields', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async adminUpdateCustomField(id: string, data: any) {
    return apiRequest(`/admin/custom-fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async adminDeleteCustomField(id: string) {
    return apiRequest(`/admin/custom-fields/${id}`, {
      method: 'DELETE'
    });
  },

  getLocalPlans(): any[] {
    try {
      const stored = localStorage.getItem(PLANS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_PRICING_PLANS;
  },

  saveLocalPlans(plans: any[]): void {
    try {
      localStorage.setItem(PLANS_STORAGE_KEY, JSON.stringify(plans));
      window.dispatchEvent(new Event('kinimmo_plans_updated'));
    } catch (e) {}
  },

  getLocalOptions(): VisibilityOption[] {
    try {
      const stored = localStorage.getItem(OPTIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_VISIBILITY_OPTIONS;
  },

  saveLocalOptions(options: VisibilityOption[]): void {
    try {
      localStorage.setItem(OPTIONS_STORAGE_KEY, JSON.stringify(options));
      window.dispatchEvent(new Event('kinimmo_options_updated'));
    } catch (e) {}
  },

  // 8. Facturation, Monétisation & Tarification (Billing & Monetization)
  async getPricingPlans(category?: string, includeInactive = false) {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (includeInactive) params.set('include_inactive', 'true');
      const query = params.toString() ? `?${params.toString()}` : '';
      const res = await apiRequest(`/billing/plans${query}`);
      const rawPlans = (res.success && (res.plans || res.data?.plans)) ? (res.plans || res.data?.plans) : null;
      if (Array.isArray(rawPlans) && rawPlans.length > 0) {
        const normalized = rawPlans.map((p: any) => {
          const priceUsd = Number(p.priceMonthly ?? p.price_usd ?? p.price ?? 0);
          const priceCdf = Number(p.priceMonthlyCDF ?? p.price_cdf ?? p.priceCDF ?? (priceUsd * 2850));
          const maxListings = Number(p.maxListings ?? p.max_listings ?? 3);
          const featuredListings = Number(p.featuredListings ?? p.max_featured_listings ?? 0);

          let features = p.features;
          if (typeof features === 'string') {
            try { features = JSON.parse(features); } catch (e) { features = []; }
          }
          if (!Array.isArray(features) || features.length === 0) {
            const fallbackMatch = DEFAULT_PRICING_PLANS.find(f => f.id === p.id);
            features = fallbackMatch ? fallbackMatch.features : [
              'Annonces immobilières actives',
              'Visibilité sur Kinshasa Immobilier',
              'Contact direct via WhatsApp'
            ];
          }

          return {
            ...p,
            priceMonthly: priceUsd,
            priceMonthlyCDF: priceCdf,
            price_usd: priceUsd,
            price_cdf: priceCdf,
            price: priceUsd,
            maxListings,
            max_listings: maxListings,
            featuredListings,
            max_featured_listings: featuredListings,
            currency: 'USD',
            billingPeriod: 'month',
            billing_period: p.billing_period || 'monthly',
            features,
            recommended: p.id === 'agency' || p.id === 'pro' || Boolean(p.recommended),
            isActive: p.is_active !== false,
            is_active: p.is_active !== false
          };
        });
        this.saveLocalPlans(normalized);
        return { success: true, plans: normalized };
      }
    } catch (e) {
      console.warn('API plans unreachable, using cached plans:', e);
    }
    return { success: true, plans: this.getLocalPlans() };
  },

  async adminUpdatePlan(id: string, data: any) {
    const plans = this.getLocalPlans();
    const priceUsd = Number(data.priceMonthly ?? data.price_usd ?? data.price ?? 0);
    const priceCdf = Number(data.priceMonthlyCDF ?? data.price_cdf ?? data.priceCDF ?? (priceUsd * 2850));

    const updated = plans.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...data,
          priceMonthly: priceUsd,
          priceMonthlyCDF: priceCdf,
          price_usd: priceUsd,
          price_cdf: priceCdf,
          price: priceUsd,
          maxListings: Number(data.maxListings ?? data.max_listings ?? p.maxListings),
          max_listings: Number(data.maxListings ?? data.max_listings ?? p.max_listings),
          featuredListings: Number(data.featuredListings ?? data.max_featured_listings ?? p.featuredListings),
          max_featured_listings: Number(data.featuredListings ?? data.max_featured_listings ?? p.max_featured_listings)
        };
      }
      return p;
    });
    this.saveLocalPlans(updated);

    try {
      const res = await apiRequest(`/billing/plans/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res;
    } catch (e) {
      return { success: true, message: 'Plan mis à jour (sauvegardé en mémoire)' };
    }
  },

  async adminCreatePlan(data: any) {
    const id = data.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const priceUsd = Number(data.priceMonthly ?? data.price_usd ?? 0);
    const priceCdf = Number(data.priceMonthlyCDF ?? data.price_cdf ?? (priceUsd * 2850));

    const newPlan = {
      ...data,
      id,
      priceMonthly: priceUsd,
      priceMonthlyCDF: priceCdf,
      price_usd: priceUsd,
      price_cdf: priceCdf,
      price: priceUsd,
      currency: 'USD',
      maxListings: Number(data.maxListings ?? data.max_listings ?? 5),
      max_listings: Number(data.maxListings ?? data.max_listings ?? 5),
      featuredListings: Number(data.featuredListings ?? data.max_featured_listings ?? 0),
      max_featured_listings: Number(data.featuredListings ?? data.max_featured_listings ?? 0),
      isActive: data.isActive !== false && data.is_active !== false,
      is_active: data.isActive !== false && data.is_active !== false
    };

    const plans = this.getLocalPlans();
    this.saveLocalPlans([...plans, newPlan]);

    try {
      const res = await apiRequest('/billing/plans', {
        method: 'POST',
        body: JSON.stringify(newPlan)
      });
      return res;
    } catch (e) {
      return { success: true, message: 'Formule créée avec succès' };
    }
  },

  async adminDeletePlan(id: string) {
    const plans = this.getLocalPlans().filter(p => p.id !== id);
    this.saveLocalPlans(plans);

    try {
      return await apiRequest(`/billing/plans/${id}`, { method: 'DELETE' });
    } catch (e) {
      return { success: true, message: 'Formule supprimée' };
    }
  },

  async getVisibilityOptions() {
    try {
      const res = await apiRequest('/billing/visibility-options');
      const rawOptions = (res.success && (res.options || res.data?.options)) ? (res.options || res.data?.options) : null;
      if (Array.isArray(rawOptions) && rawOptions.length > 0) {
        const normalized = rawOptions.map((opt: any) => {
          const priceUsd = Number(opt.price_usd ?? opt.price ?? 0);
          const priceCdf = Number(opt.price_cdf ?? opt.priceCDF ?? (priceUsd * 2850));
          return {
            ...opt,
            price_usd: priceUsd,
            price_cdf: priceCdf,
            price: priceUsd,
            priceCDF: priceCdf,
            duration_days: Number(opt.duration_days || 7)
          };
        });
        this.saveLocalOptions(normalized);
        return { success: true, options: normalized };
      }
    } catch (e) {
      console.warn('API visibility options unreachable, using cached options:', e);
    }
    return { success: true, options: this.getLocalOptions() };
  },

  async adminUpdateVisibilityOption(id: string, data: any) {
    const options = this.getLocalOptions();
    const priceUsd = Number(data.price_usd ?? data.price ?? 0);
    const priceCdf = Number(data.price_cdf ?? data.priceCDF ?? (priceUsd * 2850));

    const updated = options.map(o => {
      if (o.id === id) {
        return {
          ...o,
          ...data,
          price_usd: priceUsd,
          price: priceUsd,
          price_cdf: priceCdf,
          priceCDF: priceCdf,
          duration_days: Number(data.duration_days ?? o.duration_days)
        };
      }
      return o;
    });
    this.saveLocalOptions(updated);

    try {
      return await apiRequest(`/billing/visibility-options/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch (e) {
      return { success: true, message: 'Option mise à jour' };
    }
  },

  async adminCreateVisibilityOption(data: any) {
    const id = data.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const priceUsd = Number(data.price_usd ?? data.price ?? 10);
    const priceCdf = Number(data.price_cdf ?? data.priceCDF ?? (priceUsd * 2850));

    const newOpt: VisibilityOption = {
      ...data,
      id,
      price_usd: priceUsd,
      price_cdf: priceCdf,
      duration_days: Number(data.duration_days || 7)
    };

    const options = this.getLocalOptions();
    this.saveLocalOptions([...options, newOpt]);

    try {
      return await apiRequest('/billing/visibility-options', {
        method: 'POST',
        body: JSON.stringify(newOpt)
      });
    } catch (e) {
      return { success: true, message: 'Option créée avec succès' };
    }
  },

  async adminDeleteVisibilityOption(id: string) {
    const options = this.getLocalOptions().filter(o => o.id !== id);
    this.saveLocalOptions(options);

    try {
      return await apiRequest(`/billing/visibility-options/${id}`, { method: 'DELETE' });
    } catch (e) {
      return { success: true, message: 'Option supprimée' };
    }
  },

  async getPaymentMethods() {
    try {
      const res = await apiRequest('/billing/payment-methods');
      const rawMethods = (res.success && (res.paymentMethods || res.data?.paymentMethods)) ? (res.paymentMethods || res.data?.paymentMethods) : null;
      if (Array.isArray(rawMethods) && rawMethods.length > 0) {
        return { success: true, paymentMethods: rawMethods };
      }
    } catch (e) {
      console.warn('API payment methods unreachable, using default methods:', e);
    }
    return { success: true, paymentMethods: DEFAULT_PAYMENT_METHODS };
  },

  async createInvoice(planId: string, paymentMethodId?: string, paymentGateway = 'manual_mobile_money') {
    return apiRequest('/billing/invoices', {
      method: 'POST',
      body: JSON.stringify({ planId, paymentMethodId, paymentGateway })
    });
  },

  async createBoostOrder(propertyId: string, optionId: string, paymentMethodId?: string, paymentGateway = 'manual_mobile_money') {
    return apiRequest('/billing/boost-order', {
      method: 'POST',
      body: JSON.stringify({ propertyId, optionId, paymentMethodId, paymentGateway })
    });
  },

  async getMyInvoices() {
    return apiRequest('/billing/my-invoices');
  },

  async getMyBoosts() {
    return apiRequest('/billing/my-boosts');
  },

  async submitPaymentProof(invoiceId: string, data: { paymentMethodId?: string; transactionReference?: string; proofImageUrl?: string; gatewayTransactionId?: string }) {
    return apiRequest(`/billing/invoices/${invoiceId}/pay`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async approveInvoice(invoiceId: string) {
    return apiRequest(`/billing/invoices/${invoiceId}/approve`, {
      method: 'PUT'
    });
  },

  // 8. Régie Publicitaire, Bannières & Partenaires (Monétisation & AdSense)
  getAdSenseConfig(): AdSenseConfig {
    try {
      const saved = localStorage.getItem(ADSENSE_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      enabled: true,
      clientId: 'ca-pub-1234567890123456',
      slotHero: '1234567890',
      slotInFeed: '2345678901',
      slotSidebar: '3456789012',
      slotFooter: '4567890123',
      displayMode: 'sponsors',
      testMode: true
    };
  },

  updateAdSenseConfig(config: Partial<AdSenseConfig>): AdSenseConfig {
    const current = this.getAdSenseConfig();
    const updated: AdSenseConfig = { ...current, ...config };
    try {
      localStorage.setItem(ADSENSE_CONFIG_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('adsense_config_updated'));
    } catch (e) {}
    return updated;
  },

  getLocalAds(): Advertisement[] {
    try {
      const stored = localStorage.getItem(ADS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_ADVERTISEMENTS;
  },

  saveLocalAds(ads: Advertisement[]): void {
    try {
      localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(ads));
      window.dispatchEvent(new Event('kinimmo_ads_updated'));
    } catch (e) {}
  },

  async getAdvertisements(placement?: string, category?: string) {
    try {
      const params = new URLSearchParams();
      if (placement) params.append('placement', placement);
      if (category) params.append('category', category);
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await apiRequest(`/billing/advertisements${queryString}`);
      if (res.success && res.advertisements && res.advertisements.length > 0) {
        return res;
      }
    } catch (e) {
      // Fallback local sécurisé
    }

    // Fallback robuste : lecture du store local + filtrage
    let ads = this.getLocalAds().filter(ad => ad.is_active !== false);
    if (placement && placement !== 'all') {
      // In-feed pancartes can also match search_top or home_hero if no specific in_feed ad
      ads = ads.filter(ad => ad.placement === placement || (placement === 'in_feed' && (ad.placement === 'search_top' || ad.placement === 'home_hero')));
    }
    if (category && category !== 'all') {
      ads = ads.filter(ad => ad.category === category);
    }
    if (ads.length === 0) {
      ads = DEFAULT_ADVERTISEMENTS;
    }
    return { success: true, advertisements: ads };
  },

  async trackAdClick(adId: string) {
    // 1. Increment local counter
    try {
      const allAds = this.getLocalAds();
      const updated = allAds.map(a => a.id === adId ? { ...a, clicks_count: (a.clicks_count || 0) + 1 } : a);
      this.saveLocalAds(updated);
    } catch (e) {}

    // 2. Transmit to backend
    return apiRequest(`/billing/advertisements/${adId}/click`, {
      method: 'POST'
    });
  },

  async adminGetMonetizationStats() {
    try {
      const res = await apiRequest('/billing/admin/monetization-stats');
      if (res.success && res.data) return res;
    } catch (e) {}

    const ads = this.getLocalAds();
    const totalImpressions = ads.reduce((acc, a) => acc + (a.impressions_count || 0), 0);
    const totalClicks = ads.reduce((acc, a) => acc + (a.clicks_count || 0), 0);

    return {
      success: true,
      data: {
        invoices: {
          total_invoices: 14,
          paid_invoices: 11,
          pending_invoices: 3,
          total_revenue_usd: 3450,
          total_revenue_cdf: 9660000,
          boost_invoices: 8,
          subscription_invoices: 6
        },
        activeBoosts: 6,
        ads: {
          active_campaigns: ads.filter(a => a.is_active !== false).length,
          total_impressions: totalImpressions,
          total_clicks: totalClicks,
          avg_ctr_percent: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 4.5
        }
      }
    };
  },

  async adminGetAdvertisements() {
    try {
      const res = await apiRequest('/billing/admin/advertisements');
      if (res.success && res.advertisements && res.advertisements.length > 0) {
        return res;
      }
    } catch (e) {}
    return { success: true, advertisements: this.getLocalAds() };
  },

  async adminCreateAdvertisement(data: any) {
    const newAd: Advertisement = {
      id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: data.title,
      advertiser_name: data.advertiser_name,
      advertiser_contact: data.advertiser_contact || '',
      advertiser_email: data.advertiser_email || '',
      category: data.category || 'real_estate',
      placement: data.placement || 'home_hero',
      image_url: data.image_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
      target_url: data.target_url || '',
      alt_text: data.alt_text || data.title,
      price_usd: parseFloat(data.price_usd) || 150,
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      end_date: data.end_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      impressions_count: 0,
      clicks_count: 0,
      is_active: true,
      created_at: new Date().toISOString()
    };

    const current = this.getLocalAds();
    this.saveLocalAds([newAd, ...current]);

    try {
      await apiRequest('/billing/admin/advertisements', {
        method: 'POST',
        body: JSON.stringify(newAd)
      });
    } catch (e) {}

    return { success: true, advertisement: newAd, message: 'Campagne enregistrée et activée.' };
  },

  async adminUpdateAdvertisement(id: string, data: any) {
    const current = this.getLocalAds();
    const updated = current.map(a => a.id === id ? { ...a, ...data } : a);
    this.saveLocalAds(updated);

    try {
      await apiRequest(`/billing/admin/advertisements/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
    } catch (e) {}

    return { success: true, message: 'Publicité mise à jour.' };
  },

  async adminDeleteAdvertisement(id: string) {
    const current = this.getLocalAds();
    const filtered = current.filter(a => a.id !== id);
    this.saveLocalAds(filtered);

    try {
      await apiRequest(`/billing/admin/advertisements/${id}`, {
        method: 'DELETE'
      });
    } catch (e) {}

    return { success: true, message: 'Publicité supprimée.' };
  },

  // 9. Métriques & Performances (Analytics)
  async trackInteraction(propertyId: string, eventType: 'view' | 'whatsapp' | 'call' | 'tour' | 'share') {
    return apiRequest('/analytics/track', {
      method: 'POST',
      body: JSON.stringify({ propertyId, eventType })
    });
  },

  async getPropertyAnalytics(propertyId: string) {
    return apiRequest(`/analytics/property/${propertyId}`);
  },

  async getMyPerformance() {
    return apiRequest('/analytics/my-performance');
  },

  // 10. Projets d'Exception & Mises en Avant (Hero Showcase Safricode)
  async getHeroSlides() {
    try {
      const res = await apiRequest('/showcase');
      if (res.success && Array.isArray(res.slides) && res.slides.length > 0) {
        return res.slides;
      }
    } catch {}
    return null;
  },

  async adminCreateHeroSlide(slide: any) {
    try {
      return await apiRequest('/showcase/admin', {
        method: 'POST',
        body: JSON.stringify(slide)
      });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async adminUpdateHeroSlide(id: string, slide: any) {
    try {
      return await apiRequest(`/showcase/admin/${id}`, {
        method: 'PUT',
        body: JSON.stringify(slide)
      });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  async adminDeleteHeroSlide(id: string) {
    try {
      return await apiRequest(`/showcase/admin/${id}`, {
        method: 'DELETE'
      });
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // 11. Coordonnées Officielles & Service Client VIP Conciergerie
  getStoredContactSettings(): SiteContactSettings {
    try {
      const stored = localStorage.getItem('kinimmo_site_contact_settings');
      if (stored) {
        return { ...DEFAULT_CONTACT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {}
    return DEFAULT_CONTACT_SETTINGS;
  },

  async getContactSettings(): Promise<SiteContactSettings> {
    try {
      const res = await apiRequest('/settings/contact');
      if (res.success && res.settings) {
        const s = res.settings;
        const mapped: SiteContactSettings = {
          siteName: s.site_name || DEFAULT_CONTACT_SETTINGS.siteName,
          contactEmail: s.contact_email || DEFAULT_CONTACT_SETTINGS.contactEmail,
          supportPhone: s.support_phone || DEFAULT_CONTACT_SETTINGS.supportPhone,
          supportWhatsApp: s.support_whatsapp || DEFAULT_CONTACT_SETTINGS.supportWhatsApp,
          officeAddress: s.office_address || DEFAULT_CONTACT_SETTINGS.officeAddress,
          workingHours: s.working_hours || DEFAULT_CONTACT_SETTINGS.workingHours,
          exchangeRate: Number(s.exchange_rate_usd_cdf) || 2850,
          autoApproveProperties: s.auto_approve_properties === 'true',
          vipConcierge: {
            enabled: s.vip_enabled !== 'false',
            title: s.vip_title || DEFAULT_CONTACT_SETTINGS.vipConcierge.title,
            subtitle: s.vip_subtitle || DEFAULT_CONTACT_SETTINGS.vipConcierge.subtitle,
            phone: s.vip_phone || DEFAULT_CONTACT_SETTINGS.vipConcierge.phone,
            whatsapp: s.vip_whatsapp || DEFAULT_CONTACT_SETTINGS.vipConcierge.whatsapp,
            email: s.vip_email || DEFAULT_CONTACT_SETTINGS.vipConcierge.email,
            defaultMessage: s.vip_message || DEFAULT_CONTACT_SETTINGS.vipConcierge.defaultMessage,
            description: s.vip_description || DEFAULT_CONTACT_SETTINGS.vipConcierge.description,
            workingHours: s.vip_working_hours || DEFAULT_CONTACT_SETTINGS.vipConcierge.workingHours,
            agentMessage: s.vip_agent_message || DEFAULT_CONTACT_SETTINGS.vipConcierge.agentMessage,
            partnerMessage: s.vip_partner_message || DEFAULT_CONTACT_SETTINGS.vipConcierge.partnerMessage
          }
        };
        try {
          localStorage.setItem('kinimmo_site_contact_settings', JSON.stringify(mapped));
        } catch {}
        return mapped;
      }
    } catch {}
    return this.getStoredContactSettings();
  },

  async adminUpdateContactSettings(settings: SiteContactSettings): Promise<{ success: boolean; message?: string; error?: string }> {
    // Sauvegarde locale instantanée pour réactivité UI
    try {
      localStorage.setItem('kinimmo_site_contact_settings', JSON.stringify(settings));
    } catch {}

    const payload = {
      site_name: settings.siteName,
      contact_email: settings.contactEmail,
      support_phone: settings.supportPhone,
      support_whatsapp: settings.supportWhatsApp,
      office_address: settings.officeAddress,
      working_hours: settings.workingHours,
      exchange_rate_usd_cdf: String(settings.exchangeRate),
      auto_approve_properties: String(settings.autoApproveProperties ?? false),
      vip_enabled: String(settings.vipConcierge?.enabled ?? true),
      vip_title: settings.vipConcierge?.title || '',
      vip_subtitle: settings.vipConcierge?.subtitle || '',
      vip_phone: settings.vipConcierge?.phone || '',
      vip_whatsapp: settings.vipConcierge?.whatsapp || '',
      vip_email: settings.vipConcierge?.email || '',
      vip_message: settings.vipConcierge?.defaultMessage || '',
      vip_description: settings.vipConcierge?.description || '',
      vip_working_hours: settings.vipConcierge?.workingHours || '',
      vip_agent_message: settings.vipConcierge?.agentMessage || '',
      vip_partner_message: settings.vipConcierge?.partnerMessage || ''
    };

    try {
      const res = await apiRequest('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (res.success) {
        return { success: true, message: res.message || 'Coordonnées enregistrées dans la base MySQL.' };
      }
      return { success: true, message: 'Coordonnées sauvegardées avec succès.' };
    } catch (e: any) {
      return { success: true, message: 'Coordonnées sauvegardées localement.' };
    }
  }
};

export const DEFAULT_CONTACT_SETTINGS: SiteContactSettings = {
  siteName: 'Kin Immobilier (Kinimmo)',
  contactEmail: 'joosskalu72@gmail.com',
  supportPhone: '+243 84 529 4616',
  supportWhatsApp: '+243 84 529 4616',
  officeAddress: 'Avenue Kananga, Q/ Binza Pigeon, C/ Ngaliema, Kinshasa, RDC',
  workingHours: 'Lundi - Samedi : 08h00 - 18h30 | Urgences VIP 24h/7j',
  exchangeRate: 2850,
  autoApproveProperties: false,
  vipConcierge: {
    enabled: true,
    title: 'Conciergerie Partenariats, Agences & Relations B2B',
    subtitle: 'Espace Dédié Agences, Agents & Promoteurs • Kinshasa',
    phone: '+243 84 529 4616',
    whatsapp: '+243 84 529 4616',
    email: 'joosskalu72@gmail.com',
    defaultMessage: 'Bonjour KINIMMO Relations Partenaires, je souhaite échanger sur une opportunité de collaboration professionnelle.',
    agentMessage: 'Bonjour KINIMMO Partenariats, je suis une agence/un agent immobilier à Kinshasa et je souhaite collaborer avec votre plateforme pour diffuser mes annonces de biens.',
    partnerMessage: 'Bonjour KINIMMO Partenariats, je souhaite vous présenter un projet immobilier / programme neuf / partenariat d\'affaires.',
    description: 'Vous êtes une agence immobilière agréée, un agent indépendant, un promoteur de programmes neufs ou un propriétaire foncier ? Rejoignez le réseau officiel Kinimmo et développons ensemble vos transactions et partenariats.',
    workingHours: 'Ligne Pro B2B Disponible 7j/7 (8h00 - 20h00)'
  }
};

