export type PropertyStatus = 'for-sale' | 'for-rent' | 'pending' | 'sold' | 'open-house';
export type PropertyType = 'apartment' | 'house' | 'villa' | 'office' | 'land' | 'commercial' | 'penthouse';
export type PropertyLabel = 'featured' | 'hot' | 'openhouse' | 'reduced' | 'new';

export type FieldType = 
  | 'text' 
  | 'number' 
  | 'area' 
  | 'select' 
  | 'checkbox' 
  | 'textarea' 
  | 'date' 
  | 'file' 
  | 'contact' 
  | 'range';

export type FieldGroup = 'general' | 'specs' | 'financial' | 'media' | 'private';

export interface CustomFieldDefinition {
  id: string;
  key: string; // e.g. 'energy_class'
  label: Record<string, string>; // Multi-lang labels { fr: 'Classe Énergétique', en: 'Energy Rating' }
  type: FieldType;
  group: FieldGroup;
  options?: string[]; // For select dropdowns
  unit?: string; // e.g., 'm²', 'kWh/m²', '€/mo'
  required: boolean;
  isPrivate?: boolean; // For Admin/Agents only (PRO feature)
  showInSearch?: boolean; // Can filter in Search Widget
  icon?: string; // Lucide icon name
  defaultValue?: any;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  period?: 'month' | 'year' | 'total'; // For rental or sale
  type: PropertyType;
  status: PropertyStatus;
  labels: PropertyLabel[];
  category: string;
  
  // Location Kinshasa
  address: string;
  city: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  referencePoint?: string;
  zipCode: string;
  country: string;
  lat: number;
  lng: number;

  // Key specs
  bedrooms: number;
  bathrooms: number;
  area: number; // in m²
  yearBuilt?: number;
  garages?: number;

  // Features & Amenities
  amenities: string[];

  // Media
  images: string[];
  videoUrl?: string; // YouTube or Vimeo link
  virtualTourUrl?: string;
  floorPlanUrl?: string;

  // Custom Fields (dynamic key-value pairs matching CustomFieldDefinition.key)
  customFields: Record<string, any>;

  // Private Fields (Admin/Agent internal notes, owner contact, lockbox)
  privateFields?: {
    ownerName?: string;
    ownerPhone?: string;
    ownerEmail?: string;
    commissionRate?: number;
    internalNotes?: string;
    keyBoxCode?: string;
  };

  // Metadata & Agent
  agentId: string;
  agencyId?: string;
  agencyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
  viewsCount: number;
  sharesCount?: number;
  whatsappClicks?: number;
  phoneCalls?: number;
  leadsCount?: number;
  lastViewedAt?: string;
  featured: boolean;
  isPremium?: boolean;
  isUrgent?: boolean;
  listingTier?: 'free' | 'standard' | 'premium' | 'featured';
  boostExpiresAt?: string;
  refreshBumpAt?: string;
  published: boolean;
}

export interface VerificationDocument {
  id: string;
  type: 'passport' | 'voter_card' | 'cni' | 'rccm' | 'professional_card' | 'proof_of_address' | 'other';
  title: string;
  documentNumber: string;
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionNote?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Agent {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  whatsapp?: string;
  avatar: string;
  agencyId?: string;
  agencyName?: string;
  agencyLogo?: string;
  rating: number;
  reviewCount: number;
  listingsCount: number;
  bio: string;
  specialties: string[];
  languages: string[];
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  verificationDocuments?: VerificationDocument[];
  verificationRequestedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  identityDocType?: 'passport' | 'voter_card' | 'carte_electeur' | 'cni' | 'rccm' | 'professional_card' | 'national_id' | 'rccm_license';
  identityDocNumber?: string;
  rccmOrNif?: string;
  subscriptionStatus?: 'Active' | 'Expired';
  subscriptionExpiresAt?: string;
  isHidden?: boolean; // When true, hidden from public directory and visitors (Admin toggle)
}

export interface Agency {
  id: string;
  name: string;
  logo: string;
  address: string;
  city: string;
  commune?: string;
  phone: string;
  whatsapp?: string;
  email: string;
  website: string;
  managerName?: string;
  rccm?: string;
  idNat?: string;
  nif?: string;
  agentsCount: number;
  description: string;
  specialties?: string[];
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  verificationDocuments?: VerificationDocument[];
  subscriptionStatus?: 'Active' | 'Expired';
  subscriptionExpiresAt?: string;
  planId?: string;
  lastPaymentDate?: string;
  unpaidInvoiceId?: string;
  createdAt?: string;
  isHidden?: boolean; // When true, hidden from public directory and visitors (Admin toggle)
}

export interface SavedSearch {
  id: string;
  userId: string;
  title: string;
  filters: PropertyFilters;
  notifyFrequency: 'instant' | 'daily' | 'weekly' | 'never';
  createdAt: string;
  lastNotifiedAt?: string;
}

export interface LeadRequest {
  id: string;
  propertyId: string;
  propertyTitle: string;
  agentId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  message: string;
  requestType: 'info' | 'tour' | 'offer';
  tourDate?: string;
  tourTime?: string;
  status: 'new' | 'contacted' | 'viewing' | 'closed';
  createdAt: string;
}

export type UserRole = 'admin' | 'agent' | 'user' | 'owner' | 'agency';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  avatar: string;
  agentId?: string;
  agencyId?: string;
  agencyName?: string;
  rccmOrNif?: string; // RCCM / NIF Impôts RDC
  planId: string; // 'starter' | 'pro' | 'agency'
  planExpiry?: string;
  subscriptionStatus?: 'Active' | 'Expired';
  subscriptionExpiresAt?: string;
  provider?: 'google' | 'facebook' | 'email' | 'phone';
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  verificationDocuments?: VerificationDocument[];
  verificationRequestedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'authenticator' | 'sms' | 'email';
  kinshasaBadgeVerified?: boolean;
  identityDocType?: 'passport' | 'voter_card' | 'carte_electeur' | 'cni' | 'national_id' | 'rccm' | 'rccm_license' | 'professional_card';
  identityDocNumber?: string;
  createdAt?: string;
  lastLoginLocation?: string;
  password?: string;
  accessPin?: string;
}

export interface PropertyFilters {
  searchQuery?: string;
  city?: string;
  commune?: string;
  quartier?: string;
  avenue?: string;
  type?: PropertyType | 'all';
  status?: PropertyStatus | 'all';
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  labels?: PropertyLabel[];
  amenities?: string[];
  customFields?: Record<string, any>;
  sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'popular' | 'area-desc';
}

export type CurrencyCode = 'USD' | 'CDF' | 'EUR' | 'GBP' | 'FCFA' | 'CHF' | 'MAD' | 'AED';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  rateToEUR: number; // EUR is base
  format: string; // e.g. '{symbol}{amount}' or '{amount} {symbol}'
}

export type LanguageCode = 'fr' | 'en' | 'es' | 'ar';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
  dir: 'ltr' | 'rtl';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  category?: 'general' | 'individual' | 'agency' | 'promoter';
  badge?: string;
  priceMonthly: number; // in USD
  priceMonthlyCDF?: number; // in CDF (Francs Congolais)
  currency: string;
  billingPeriod?: 'month' | 'year';
  maxListings: number;
  featuredListings: number;
  agentAccounts: number;
  features: string[];
  recommended?: boolean;
  isActive?: boolean;
  hasVerifiedBadge?: boolean;
  hasCrmLeads?: boolean;
  hasPrioritySupport?: boolean;
}

export type BoostType = 'featured' | 'premium' | 'urgent' | 'refresh' | 'social_blast';

export interface VisibilityOption {
  id: string;
  name: string;
  slug: string;
  description: string;
  boost_type: BoostType;
  duration_days: number;
  price_usd: number;
  price_cdf: number;
  badge_text?: string;
  icon: string;
  is_active: boolean;
}

export interface ListingBoost {
  id: string;
  property_id: string;
  user_id: string;
  option_id: string;
  invoice_id?: string;
  status: 'pending' | 'active' | 'expired' | 'canceled';
  starts_at?: string;
  expires_at?: string;
  created_at: string;
  option_name?: string;
  boost_type?: BoostType;
  duration_days?: number;
  badge_text?: string;
  property_title?: string;
  property_price?: number;
  property_commune?: string;
}

export interface Advertisement {
  id: string;
  title: string;
  description?: string;
  advertiser_name: string;
  advertiser_contact?: string;
  advertiser_phone?: string;
  advertiser_email?: string;
  category: 'real_estate' | 'construction' | 'architecture' | 'interior_design' | 'banking' | 'insurance' | 'legal' | 'general';
  placement: 'home_hero' | 'search_top' | 'sidebar' | 'footer_banner' | 'interstitial';
  image_url: string;
  target_url: string;
  alt_text?: string;
  price_usd: number;
  start_date: string;
  end_date: string;
  impressions_count: number;
  clicks_count: number;
  is_active: boolean;
  created_at?: string;
}

export interface AdSenseConfig {
  enabled: boolean;
  clientId: string; // e.g. ca-pub-1234567890123456
  slotHero?: string;
  slotInFeed?: string;
  slotSidebar?: string;
  slotFooter?: string;
  displayMode: 'sponsors' | 'adsense' | 'hybrid';
  testMode?: boolean;
}

export interface MonetizationStats {
  invoices: {
    total_invoices?: number;
    paid_invoices?: number;
    pending_invoices?: number;
    total_revenue_usd?: number;
    total_revenue_cdf?: number;
    boost_invoices?: number;
    subscription_invoices?: number;
  };
  activeBoosts: number;
  ads: {
    active_ads?: number;
    total_impressions?: number;
    total_clicks?: number;
  };
}

export interface InvoiceItem {
  id: string;
  description: string;
  amount: number;
  quantity: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. 'KIN-2026-001'
  targetType: 'agent' | 'agency' | 'user' | 'custom';
  targetId: string;
  targetName: string;
  targetEmail: string;
  targetPhone?: string;
  targetNifRccm?: string;
  planId?: string; // 'pro' | 'agency' | 'custom'
  items: InvoiceItem[];
  subtotalAmount: number;
  taxAmount: number; // e.g. TVA DGI RDC 16% or 0%
  totalAmount: number;
  amount?: number; // convenience alias
  currency: 'USD' | 'CDF';
  status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  paymentMethod?: 'mpesa' | 'orange_money' | 'airtel_money' | 'card' | 'bank_transfer' | 'cash';
  dueDate: string;
  paidAt?: string;
  createdAt: string;
  notes?: string;
  periodStart?: string;
  periodEnd?: string;
}

export interface TrackingConfig {
  gtmContainerId: string; // e.g. 'GTM-MBV5CSQR' or 'GTM-XXXXXXX'
  googleAnalyticsId: string; // e.g. 'G-3FYYBC6QQG' or 'G-XXXXXXX'
  metaPixelId: string; // e.g. '123456789012345'
  tiktokPixelId: string; // e.g. 'C1234567890ABCDEF'
  googleAdsId: string; // e.g. 'AW-123456789'
  googleAdsConversionLabel: string; // e.g. 'AbC-dEfGhIjK'
  isGtmEnabled: boolean;
  isMetaPixelEnabled: boolean;
  isTiktokPixelEnabled: boolean;
  isGoogleAdsEnabled: boolean;
}

export interface VipConciergeSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  phone: string;
  whatsapp: string;
  email: string;
  defaultMessage: string;
  description: string;
  workingHours?: string;
  agentMessage?: string; // Message WhatsApp pré-rempli pour Agences & Agents
  partnerMessage?: string; // Message WhatsApp pré-rempli pour Partenaires & Promoteurs
}

export interface SiteContactSettings {
  siteName: string;
  contactEmail: string;
  supportPhone: string;
  supportWhatsApp: string;
  officeAddress: string;
  workingHours: string;
  exchangeRate: number;
  defaultCurrency?: string;
  domainUrl?: string;
  adminUrl?: string;
  requireCertifiedBadge?: boolean;
  autoApproveProperties?: boolean;
  vipConcierge: VipConciergeSettings;
}

// Module Conciergerie Immobilière Kinimmo
export type ConciergerieProjet =
  | 'Acheter'
  | 'Louer'
  | 'Trouver un terrain'
  | 'Trouver un local commercial'
  | 'Autre';

export type ConciergerieTypeBien =
  | 'Appartement'
  | 'Maison'
  | 'Villa'
  | 'Terrain'
  | 'Bureau'
  | 'Local commercial'
  | 'Autre';

export type ConciergerieService =
  | 'Recherche de biens'
  | 'Organisation de visites'
  | 'Accompagnement à la location'
  | 'Accompagnement à l’achat'
  | 'Vérification des informations disponibles'
  | 'Autre';

export type ConciergeRequestStatus =
  | 'new'
  | 'searching'
  | 'properties_found'
  | 'visit_scheduled'
  | 'negotiation'
  | 'completed'
  | 'cancelled';

/**
 * Table : concierge_requests
 * Représente les mandats et demandes de conciergerie immobilière soumises par les clients
 */
export interface ConciergeRequest {
  id: string;
  user_id?: string | null;
  project_type: string;
  property_type: string;
  commune: string;
  quartier?: string | null;
  budget_min?: number | null;
  budget_max: number;
  currency: 'USD' | 'CDF' | string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking: boolean;
  furnished: boolean;
  services: string[];
  description?: string | null;
  full_name: string;
  phone: string;
  whatsapp?: string | null;
  email: string;
  status: ConciergeRequestStatus;
  assigned_agent_id?: string | null;
  created_at: string;
  updated_at: string;

  // Correspondance automatique avec les annonces de propriétés
  matched_property_ids?: string[];
  matched_count?: number;
  top_match_score?: number;

  // Propriétés de compatibilité et d'enrichissement pour l'interface UI
  reference?: string;
  notesAdmin?: string;
  assigned_agent_name?: string | null;
  projet?: ConciergerieProjet;
  typeBien?: ConciergerieTypeBien;
  localisation?: {
    commune: string;
    quartier?: string;
  };
  budget?: {
    min?: number;
    max: number;
    devise: 'USD' | 'CDF';
  };
  caracteristiques?: {
    chambres?: number;
    sallesDeBain?: number;
    parking: boolean;
    meuble: boolean;
  };
  client?: {
    nomComplet: string;
    telephone: string;
    whatsapp?: string;
    email: string;
    message?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type PropertyVisitStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

/**
 * Table : property_visits
 * Planification et suivi des visites immobilières associées à une demande
 */
export interface PropertyVisit {
  id: string;
  request_id: string;
  property_id?: string | null;
  agent_id?: string | null;
  visit_date: string;
  visit_time?: string | null;
  status: PropertyVisitStatus | string;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Métadonnées enrichies d'affichage
  property_title?: string | null;
  agent_name?: string | null;
  client_name?: string | null;
}

// Alias de type pour assurer la rétrocompatibilité
export type ConciergeRequestRecord = ConciergeRequest;
export type PropertyVisitRecord = PropertyVisit;
export type ConciergerieRequest = ConciergeRequest;

