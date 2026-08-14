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
  
  // Location
  address: string;
  city: string;
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
  createdAt: string;
  updatedAt: string;
  viewsCount: number;
  featured: boolean;
  published: boolean;
}

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
  subscriptionStatus?: 'Active' | 'Expired';
  subscriptionExpiresAt?: string;
}

export interface Agency {
  id: string;
  name: string;
  logo: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  agentsCount: number;
  description: string;
  subscriptionStatus?: 'Active' | 'Expired';
  subscriptionExpiresAt?: string;
  planId?: string;
  lastPaymentDate?: string;
  unpaidInvoiceId?: string;
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

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  role: 'admin' | 'agent' | 'user' | 'owner';
  avatar: string;
  agentId?: string;
  agencyName?: string;
  rccmOrNif?: string; // RCCM / NIF Impôts RDC
  planId: string; // 'starter' | 'pro' | 'agency'
  planExpiry?: string;
  subscriptionStatus?: 'Active' | 'Expired';
  subscriptionExpiresAt?: string;
  provider?: 'google' | 'facebook' | 'email' | 'phone';
  isVerified?: boolean;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'authenticator' | 'sms' | 'email';
  kinshasaBadgeVerified?: boolean;
  identityDocType?: 'national_id' | 'passport' | 'rccm_license';
  createdAt?: string;
  lastLoginLocation?: string;
}

export interface PropertyFilters {
  searchQuery?: string;
  city?: string;
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
  priceMonthly: number;
  currency: string;
  maxListings: number;
  featuredListings: number;
  agentAccounts: number;
  features: string[];
  recommended?: boolean;
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
  targetType: 'agent' | 'agency' | 'user';
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
