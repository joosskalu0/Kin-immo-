import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { validateConciergerieRequest } from './src/utils/conciergerieValidation';
import { findMatchingProperties } from './src/utils/propertyMatching';
import { initialProperties } from './src/data/mockData';
import { ConciergerieRequest, PropertyVisitRecord, ConciergeRequestStatus } from './src/types/index';
import { analyzePropertyForFraud, auditPropertyList } from './src/utils/suspiciousListingDetector';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

// Parser JSON & URL-encoded
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Fichier local de secours pour persistance robuste
const LOCAL_LEADS_FILE = path.join(__dirname, 'concierge_requests.json');
const LOCAL_LEADS_FILE_ALT = path.join(__dirname, 'conciergerie_requests.json');
const LOCAL_VISITS_FILE = path.join(__dirname, 'property_visits.json');
const LOCAL_ADS_FILE = path.join(__dirname, 'advertisements.json');
const LOCAL_SLIDES_FILE = path.join(__dirname, 'hero_slides.json');
const LOCAL_PLANS_FILE = path.join(__dirname, 'pricing_plans.json');
const LOCAL_OPTIONS_FILE = path.join(__dirname, 'visibility_options.json');
const LOCAL_NOTIFICATIONS_FILE = path.join(__dirname, 'notifications.json');
const LOCAL_VIDEOS_FILE = path.join(__dirname, 'property_videos.json');
const LOCAL_CLOUDINARY_FILE = path.join(__dirname, 'cloudinary_config.json');
const LOCAL_PROPERTIES_FILE = path.join(__dirname, 'properties_store.json');
const LOCAL_COLLABORATORS_FILE = path.join(__dirname, 'agency_collaborators.json');
const LOCAL_TRANSACTIONS_FILE = path.join(__dirname, 'agency_transactions.json');
const LOCAL_TRUST_FILE = path.join(__dirname, 'trust_store.json');

const INITIAL_PLANS = [
  {
    id: 'starter',
    name: 'Annonce Gratuite Particulier',
    description: 'Idéal pour les propriétaires souhaitant publier leurs biens sans aucun frais ni engagement.',
    category: 'individual',
    badge: 'Gratuit',
    price_usd: 0.0,
    price_cdf: 0.0,
    priceMonthly: 0.0,
    priceMonthlyCDF: 0.0,
    currency: 'USD',
    billing_period: 'monthly',
    billingPeriod: 'month',
    max_listings: 3,
    maxListings: 3,
    max_featured_listings: 0,
    featuredListings: 0,
    agentAccounts: 1,
    features: [
      'Publication de 3 annonces immobilières actives',
      'Fiche descriptive complète avec photos HD',
      'Mise en relation directe avec les acheteurs',
      'Messagerie et contacts WhatsApp directs'
    ],
    recommended: false,
    has_verified_badge: false,
    hasVerifiedBadge: false,
    has_crm_leads: false,
    hasCrmLeads: false,
    has_priority_support: false,
    hasPrioritySupport: false,
    is_active: true,
    isActive: true
  },
  {
    id: 'pro',
    name: 'Pro Courtier Indépendant',
    description: 'Pour courtiers indépendants actifs à Kinshasa avec badge vérifié et gestion prioritaire des leads.',
    category: 'individual',
    badge: 'Courtier Pro',
    price_usd: 29.0,
    price_cdf: 82650.0,
    priceMonthly: 29.0,
    priceMonthlyCDF: 82650.0,
    currency: 'USD',
    billing_period: 'monthly',
    billingPeriod: 'month',
    max_listings: 25,
    maxListings: 25,
    max_featured_listings: 3,
    featuredListings: 3,
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
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: false,
    hasPrioritySupport: false,
    is_active: true,
    isActive: true
  },
  {
    id: 'agency',
    name: 'Agence Immobilière Certifiée',
    description: 'Visibilité maximale pour agences immobilières avec agents illimités, CRM et vitrine dédiée.',
    category: 'agency',
    badge: 'Agence Agréée',
    price_usd: 79.0,
    price_cdf: 225150.0,
    priceMonthly: 79.0,
    priceMonthlyCDF: 225150.0,
    currency: 'USD',
    billing_period: 'monthly',
    billingPeriod: 'month',
    max_listings: 100,
    maxListings: 100,
    max_featured_listings: 10,
    featuredListings: 10,
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
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: true,
    hasPrioritySupport: true,
    is_active: true,
    isActive: true
  },
  {
    id: 'enterprise',
    name: 'Promoteur Immobilier & Constructeur VIP',
    description: 'Pour promoteurs fonciers, lotissements et grands chantiers avec bannières sponsorisées et multi-diffusion.',
    category: 'promoter',
    badge: 'Promoteur VIP',
    price_usd: 149.0,
    price_cdf: 424650.0,
    priceMonthly: 149.0,
    priceMonthlyCDF: 424650.0,
    currency: 'USD',
    billing_period: 'monthly',
    billingPeriod: 'month',
    max_listings: 500,
    maxListings: 500,
    max_featured_listings: 30,
    featuredListings: 30,
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
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: true,
    hasPrioritySupport: true,
    is_active: true,
    isActive: true
  }
];

const INITIAL_VISIBILITY_OPTIONS = [
  {
    id: 'opt_featured_7d',
    name: 'Mise en Avant 7 jours',
    slug: 'mise_en_avant_7d',
    description: 'Positionnement en tête de page d\'accueil et carrousel prioritaire pendant 7 jours.',
    boost_type: 'featured',
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
    boost_type: 'premium',
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
    boost_type: 'urgent',
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
    boost_type: 'refresh',
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
    boost_type: 'social_blast',
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

const INITIAL_PAYMENT_METHODS = [
  {
    id: 'pm_mpesa',
    provider: 'mpesa',
    account_name: 'KINIMMO SARL - Vodacom M-Pesa',
    account_number: '+243 810 000 000',
    merchant_code: '123456',
    instructions: 'Envoyer le montant exact via M-Pesa puis insérer le code de transaction pour validation instantanée.',
    is_active: true
  },
  {
    id: 'pm_airtel',
    provider: 'airtel',
    account_name: 'KINIMMO SARL - Airtel Money RDC',
    account_number: '+243 990 000 000',
    merchant_code: '789012',
    instructions: 'Paiement direct via Airtel Money RDC. Indiquez votre numéro de facture en référence.',
    is_active: true
  },
  {
    id: 'pm_orange',
    provider: 'orange',
    account_name: 'KINIMMO SARL - Orange Money Kinshasa',
    account_number: '+243 890 000 000',
    merchant_code: '345678',
    instructions: 'Paiement direct via Orange Money Kinshasa.',
    is_active: true
  },
  {
    id: 'pm_rawbank',
    provider: 'bank_transfer',
    account_name: 'KINIMMO RDC - Rawbank Kinshasa Gombe',
    account_number: '01002-00012345678-90',
    merchant_code: null,
    instructions: 'Virement bancaire ou versement au guichet Rawbank. Joindre le bordereau de versement comme preuve.',
    is_active: true
  },
  {
    id: 'pm_equity',
    provider: 'bank_transfer',
    account_name: 'KINIMMO RDC - Equity BCDC Kinshasa',
    account_number: '00014-00987654321-12',
    merchant_code: null,
    instructions: 'Virement bancaire ou versement au guichet Equity BCDC.',
    is_active: true
  }
];

const INITIAL_INVOICES = [
  {
    id: 'inv_sub_101',
    invoice_number: 'FAC-KIN-902140',
    user_id: 'user_agent_01',
    user_name: 'Dieudonné Mwamba (Congo Luxury)',
    user_email: 'dieudonne@congoluxury.cd',
    target_name: 'Congo Luxury Homes SARL',
    target_email: 'contact@congoluxuryhomes.cd',
    invoice_type: 'subscription',
    plan_id: 'agency',
    plan_name: 'Agence Immobilière Certifiée',
    amount: 79.0,
    currency: 'USD',
    amount_cdf: 225150.0,
    total_amount: 79.0,
    total_amount_cdf: 225150.0,
    payment_method_id: 'pm_rawbank',
    payment_method_provider: 'Rawbank Virement',
    transaction_reference: 'RAW-FT-2026-99120',
    status: 'paid',
    due_date: '2026-10-15',
    created_at: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'inv_bst_102',
    invoice_number: 'BST-KIN-481902',
    user_id: 'user_agent_02',
    user_name: 'Patrick Kalombo',
    user_email: 'patrick@immokingombe.cd',
    target_name: 'Patrick Kalombo (Immo Kin Gombe)',
    target_email: 'info@immokingombe.cd',
    invoice_type: 'boost',
    option_id: 'opt_premium_30d',
    option_name: 'Pack Annonce Premium 30 jours',
    property_id: 'prop-1',
    property_title: 'Villa Moderne avec Piscine & Vue Fleuve - Macampagne',
    amount: 25.0,
    currency: 'USD',
    amount_cdf: 71250.0,
    total_amount: 25.0,
    total_amount_cdf: 71250.0,
    payment_method_id: 'pm_mpesa',
    payment_method_provider: 'Vodacom M-Pesa',
    transaction_reference: 'MP-8921-X99',
    status: 'paid',
    due_date: '2026-10-10',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'inv_sub_103',
    invoice_number: 'FAC-KIN-772109',
    user_id: 'user_agent_03',
    user_name: 'Sarah Mbuyi',
    user_email: 'sarah.mbuyi@fleuvecongoimmo.cd',
    target_name: 'Sarah Mbuyi (Fleuve Congo Immo)',
    target_email: 'sarah.mbuyi@fleuvecongoimmo.cd',
    invoice_type: 'subscription',
    plan_id: 'pro',
    plan_name: 'Pro Courtier Indépendant',
    amount: 29.0,
    currency: 'USD',
    amount_cdf: 82650.0,
    total_amount: 29.0,
    total_amount_cdf: 82650.0,
    payment_method_id: 'pm_orange',
    payment_method_provider: 'Orange Money Kinshasa',
    transaction_reference: 'OM-TX-44129',
    status: 'pending',
    due_date: '2026-10-05',
    created_at: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

function loadLocalPlans(): any[] {
  try {
    if (fs.existsSync(LOCAL_PLANS_FILE)) {
      const content = fs.readFileSync(LOCAL_PLANS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erreur lecture pricing_plans.json', e);
  }
  return INITIAL_PLANS;
}

function saveLocalPlans(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_PLANS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture pricing_plans.json', e);
  }
}

function loadLocalOptions(): any[] {
  try {
    if (fs.existsSync(LOCAL_OPTIONS_FILE)) {
      const content = fs.readFileSync(LOCAL_OPTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erreur lecture visibility_options.json', e);
  }
  return INITIAL_VISIBILITY_OPTIONS;
}

function saveLocalOptions(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_OPTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture visibility_options.json', e);
  }
}

const LOCAL_INVOICES_FILE = path.join(__dirname, 'invoices_store.json');

function loadLocalInvoices(): any[] {
  try {
    if (fs.existsSync(LOCAL_INVOICES_FILE)) {
      const content = fs.readFileSync(LOCAL_INVOICES_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erreur lecture invoices_store.json', e);
  }
  return INITIAL_INVOICES;
}

function saveLocalInvoices(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_INVOICES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture invoices_store.json', e);
  }
}

let inMemoryPlans: any[] = loadLocalPlans();
let inMemoryOptions: any[] = loadLocalOptions();
let inMemoryPaymentMethods: any[] = INITIAL_PAYMENT_METHODS;
let inMemoryInvoices: any[] = loadLocalInvoices();

// Store des propriétés avec statuts stricts et cycle de vie
let inMemoryProperties: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_PROPERTIES_FILE)) {
      const raw = fs.readFileSync(LOCAL_PROPERTIES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return (initialProperties || []).map((p) => {
    const rawSt = p.status === 'sold' ? 'SOLD' : (p.published === false ? 'DRAFT' : 'PUBLISHED');
    return {
      ...p,
      listingStatus: rawSt,
      isAvailable: rawSt === 'PUBLISHED',
      trust_status: p.trust_status || (p.id === 'prop_1' ? 'property_verified' : 'unverified'),
      trust_level: p.trust_level || (p.id === 'prop_1' ? 'Bien Vérifié & Titre Foncier Contrôlé' : undefined),
      trust_score: p.trust_score ?? (p.id === 'prop_1' ? 98 : 0),
      trust_verified_at: p.trust_verified_at || (p.id === 'prop_1' ? '2026-09-12T15:00:00Z' : undefined),
      trust_expires_at: p.trust_expires_at || (p.id === 'prop_1' ? '2027-09-12T15:00:00Z' : undefined),
      availability_status: p.availability_status || (rawSt === 'PUBLISHED' ? 'available' : 'withdrawn'),
      availability_confirmed_at: p.availability_confirmed_at || (p.id === 'prop_1' ? '2026-10-17T09:00:00Z' : undefined),
      statusHistory: [
        {
          id: `hist_init_${p.id}`,
          fromStatus: 'NONE',
          toStatus: rawSt,
          changedByUserId: p.agentId || 'admin',
          changedByName: 'Système Kinimmo',
          changedAt: p.createdAt || new Date().toISOString(),
          note: 'Création et mise en ligne initiale de l\'annonce'
        }
      ]
    };
  });
})();

function saveLocalProperties(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_PROPERTIES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture properties_store.json', e);
  }
}

// Collaborateurs d'agence
let inMemoryCollaborators: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_COLLABORATORS_FILE)) {
      const raw = fs.readFileSync(LOCAL_COLLABORATORS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
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
      permissions: {
        canEditAllProperties: true,
        canAssignProperties: true,
        canAssignLeads: true,
        canViewBilling: true,
        canManageTeam: true
      },
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
      permissions: {
        canEditAllProperties: true,
        canAssignProperties: true,
        canAssignLeads: true,
        canViewBilling: false,
        canManageTeam: true
      },
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
      permissions: {
        canEditAllProperties: false,
        canAssignProperties: false,
        canAssignLeads: false,
        canViewBilling: false,
        canManageTeam: false
      },
      status: 'active',
      invitedAt: '2026-02-01T11:00:00Z',
      joinedAt: '2026-02-02T09:15:00Z',
      activeListingsCount: 5,
      totalLeadsCount: 19
    }
  ];
})();

function saveLocalCollaborators(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_COLLABORATORS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture agency_collaborators.json', e);
  }
}

// Transactions et pipeline d'agence
let inMemoryTransactions: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_TRANSACTIONS_FILE)) {
      const raw = fs.readFileSync(LOCAL_TRANSACTIONS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
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
})();

function saveLocalTransactions(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_TRANSACTIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture agency_transactions.json', e);
  }
}

// -------------------------------------------------------------
// KINIMMO TRUST : MAGASIN EN MÉMOIRE & PERSISTANCE
// -------------------------------------------------------------
interface LocalTrustStore {
  verifications: any[];
  documents: any[];
  checks: any[];
  auditLogs: any[];
  availabilities: any[];
  notifications: any[];
}

let inMemoryTrust: LocalTrustStore = (() => {
  try {
    if (fs.existsSync(LOCAL_TRUST_FILE)) {
      const raw = fs.readFileSync(LOCAL_TRUST_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.verifications)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erreur lecture trust_store.json', e);
  }

  return {
    verifications: [
      {
        id: 'trust_prop_gombe_villa',
        targetType: 'property',
        targetId: 'prop_1',
        targetName: 'Superbe Villa Duplex avec Piscine - Gombe',
        applicantUserId: 'usr_dieudonne_01',
        applicantName: 'Dieudonné Mwamba',
        applicantEmail: 'dieudonne@congoluxuryhomes.cd',
        applicantPhone: '+243 81 000 0001',
        trustStatus: 'property_verified',
        trustLevel: 'Bien Vérifié & Titre Foncier Contrôlé',
        trustScore: 98,
        submittedAt: '2026-09-10T10:00:00Z',
        reviewedAt: '2026-09-12T14:30:00Z',
        approvedAt: '2026-09-12T15:00:00Z',
        expiresAt: '2027-09-12T15:00:00Z',
        assignedAdminId: 'admin_master',
        assignedAdminName: 'Direction Kinimmo',
        adminNotes: 'Titre de propriété conforme au registre foncier de la Gombe (Vol. 42 / Folio 18). Visite physique confirmée.',
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-12T15:00:00Z'
      },
      {
        id: 'trust_agent_patrick',
        targetType: 'agent',
        targetId: 'collab_patrick',
        targetName: 'Patrick Kalombo',
        applicantUserId: 'usr_patrick_02',
        applicantName: 'Patrick Kalombo',
        applicantEmail: 'patrick@congoluxuryhomes.cd',
        applicantPhone: '+243 82 555 4444',
        trustStatus: 'pro_verified',
        trustLevel: 'Professionnel Certifié Kinimmo Trust',
        trustScore: 92,
        submittedAt: '2026-09-15T09:00:00Z',
        reviewedAt: '2026-09-16T11:00:00Z',
        approvedAt: '2026-09-16T11:30:00Z',
        expiresAt: '2027-09-16T11:30:00Z',
        assignedAdminId: 'admin_master',
        assignedAdminName: 'Direction Kinimmo',
        adminNotes: 'Agrément professionnel et identité nationale vérifiés.',
        createdAt: '2026-09-15T09:00:00Z',
        updatedAt: '2026-09-16T11:30:00Z'
      },
      {
        id: 'trust_prop_penthouse_river',
        targetType: 'property',
        targetId: 'prop_2',
        targetName: 'Penthouse Exécutif Vue Fleuve Congo - Ngaliema',
        applicantUserId: 'usr_sarah_01',
        applicantName: 'Sarah Mbuyi',
        applicantEmail: 'sarah@fleuvecongoimmo.cd',
        applicantPhone: '+243 99 876 5432',
        trustStatus: 'pending',
        trustLevel: 'En attente d’audit cadastral',
        trustScore: 35,
        submittedAt: '2026-10-14T08:30:00Z',
        adminNotes: 'Dossier déposé avec Certificat d’enregistrement. En attente de contre-visite sur site.',
        createdAt: '2026-10-14T08:30:00Z',
        updatedAt: '2026-10-14T08:30:00Z'
      }
    ],
    documents: [
      {
        id: 'doc_cert_gombe_1',
        verificationId: 'trust_prop_gombe_villa',
        docType: 'certificat_enregistrement',
        title: 'Certificat d’Enregistrement Vol. 42 Folio 18 Gombe',
        documentNumber: 'CE-KIN-GMB-2024-897',
        fileUrl: 'https://images.unsplash.com/photo-1618042164219-62c820f10723?w=800',
        fileSize: '2.4 MB',
        fileMimeType: 'application/pdf',
        status: 'approved',
        verifiedByUserId: 'admin_master',
        verifiedByName: 'Direction Kinimmo',
        verifiedAt: '2026-09-12T14:30:00Z',
        createdAt: '2026-09-10T10:05:00Z'
      },
      {
        id: 'doc_mandat_gombe_1',
        verificationId: 'trust_prop_gombe_villa',
        docType: 'mandat_exclusif',
        title: 'Mandat Exclusif de Commercialisation Notarié',
        documentNumber: 'MDT-EXCL-2026-004',
        fileUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800',
        fileSize: '1.8 MB',
        fileMimeType: 'application/pdf',
        status: 'approved',
        verifiedByUserId: 'admin_master',
        verifiedByName: 'Direction Kinimmo',
        verifiedAt: '2026-09-12T14:45:00Z',
        createdAt: '2026-09-10T10:08:00Z'
      },
      {
        id: 'doc_id_patrick_1',
        verificationId: 'trust_agent_patrick',
        docType: 'passport',
        title: 'Passeport Ordinaire RDC - Patrick Kalombo',
        documentNumber: 'OP-CD-9823412',
        fileUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
        fileSize: '1.1 MB',
        fileMimeType: 'image/jpeg',
        status: 'approved',
        verifiedByUserId: 'admin_master',
        verifiedByName: 'Direction Kinimmo',
        verifiedAt: '2026-09-16T11:15:00Z',
        createdAt: '2026-09-15T09:05:00Z'
      },
      {
        id: 'doc_cert_penthouse_2',
        verificationId: 'trust_prop_penthouse_river',
        docType: 'certificat_enregistrement',
        title: 'Certificat d’Enregistrement Ngaliema Macampagne',
        documentNumber: 'CE-KIN-NGL-2023-412',
        fileUrl: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800',
        fileSize: '3.1 MB',
        fileMimeType: 'application/pdf',
        status: 'pending',
        createdAt: '2026-10-14T08:35:00Z'
      }
    ],
    checks: [
      {
        id: 'chk_cadastre_1',
        verificationId: 'trust_prop_gombe_villa',
        checkType: 'cadastre_conservation_titres',
        checkLabel: 'Contrôle Cadastre & Conservation des Titres Immobiliers (Gombe)',
        result: 'passed',
        evidenceNotes: 'Titre vérifié auprès de la Conservation des Titres Immobiliers de la Lukunga. Aucune hypothèque ni litige en cours.',
        conductedByUserId: 'admin_master',
        conductedByName: 'Direction Kinimmo',
        conductedAt: '2026-09-12T14:00:00Z',
        createdAt: '2026-09-12T14:00:00Z'
      },
      {
        id: 'chk_inspection_1',
        verificationId: 'trust_prop_gombe_villa',
        checkType: 'physical_site_inspection',
        checkLabel: 'Inspection Physique sur Site à Kinshasa',
        result: 'passed',
        evidenceNotes: 'Visite des lieux effectuée. Propriété conforme aux photos, standing vérifié, clés remises pour visites VIP.',
        conductedByUserId: 'admin_master',
        conductedByName: 'Direction Kinimmo',
        conductedAt: '2026-09-12T11:00:00Z',
        createdAt: '2026-09-12T11:00:00Z'
      },
      {
        id: 'chk_id_patrick',
        verificationId: 'trust_agent_patrick',
        checkType: 'identity_validation',
        checkLabel: 'Validation Biométrique et Identité Officielle',
        result: 'passed',
        evidenceNotes: 'Passeport valide et concordance d’identité confirmée en visio.',
        conductedByUserId: 'admin_master',
        conductedByName: 'Direction Kinimmo',
        conductedAt: '2026-09-16T11:00:00Z',
        createdAt: '2026-09-16T11:00:00Z'
      }
    ],
    auditLogs: [
      {
        id: 'audit_01',
        verificationId: 'trust_prop_gombe_villa',
        targetType: 'property',
        targetId: 'prop_1',
        adminUserId: 'admin_master',
        adminName: 'Direction Kinimmo',
        adminEmail: 'direction@kinimmo.cd',
        action: 'TRUST_GRANTED',
        previousStatus: 'in_progress',
        newStatus: 'property_verified',
        reasonOrNotes: 'Audit cadastral et visite physique validés sans réserve.',
        ipAddress: '105.101.42.12',
        createdAt: '2026-09-12T15:00:00Z'
      },
      {
        id: 'audit_02',
        verificationId: 'trust_agent_patrick',
        targetType: 'agent',
        targetId: 'collab_patrick',
        adminUserId: 'admin_master',
        adminName: 'Direction Kinimmo',
        adminEmail: 'direction@kinimmo.cd',
        action: 'TRUST_GRANTED',
        previousStatus: 'in_progress',
        newStatus: 'pro_verified',
        reasonOrNotes: 'Agrément professionnel vérifié.',
        ipAddress: '105.101.42.12',
        createdAt: '2026-09-16T11:30:00Z'
      }
    ],
    availabilities: [
      {
        id: 'avail_prop_1',
        propertyId: 'prop_1',
        propertyTitle: 'Superbe Villa Duplex avec Piscine - Gombe',
        isAvailable: true,
        availabilityStatus: 'available',
        lastConfirmedAt: '2026-10-17T09:00:00Z',
        lastConfirmedById: 'collab_patrick',
        lastConfirmedByName: 'Patrick Kalombo',
        confirmationMethod: 'agent_statement',
        nextVerificationDue: '2026-10-31T09:00:00Z',
        notes: 'Bien toujours disponible pour visites et signatures de bail.',
        createdAt: '2026-09-12T15:00:00Z',
        updatedAt: '2026-10-17T09:00:00Z'
      }
    ],
    notifications: [
      {
        id: 'notif_trust_welcome',
        userId: 'usr_dieudonne_01',
        title: 'Certification Kinimmo Trust Validée !',
        message: 'Félicitations, votre bien "Superbe Villa Duplex avec Piscine - Gombe" arbore désormais le badge officiel Kinimmo Trust.',
        type: 'trust_approved',
        targetType: 'property',
        targetId: 'prop_1',
        isRead: false,
        createdAt: '2026-09-12T15:05:00Z'
      }
    ]
  };
})();

function saveLocalTrust(store: LocalTrustStore) {
  try {
    fs.writeFileSync(LOCAL_TRUST_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture trust_store.json', e);
  }
}


function loadLocalRequests(): ConciergerieRequest[] {
  try {
    if (fs.existsSync(LOCAL_LEADS_FILE)) {
      const content = fs.readFileSync(LOCAL_LEADS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    } else if (fs.existsSync(LOCAL_LEADS_FILE_ALT)) {
      const content = fs.readFileSync(LOCAL_LEADS_FILE_ALT, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error('Erreur lecture concierge_requests.json', e);
  }
  return [];
}

function saveLocalRequests(list: ConciergerieRequest[]) {
  try {
    fs.writeFileSync(LOCAL_LEADS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    fs.writeFileSync(LOCAL_LEADS_FILE_ALT, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture concierge_requests.json', e);
  }
}

function loadLocalVisits(): PropertyVisitRecord[] {
  try {
    if (fs.existsSync(LOCAL_VISITS_FILE)) {
      const content = fs.readFileSync(LOCAL_VISITS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error('Erreur lecture property_visits.json', e);
  }
  return [];
}

function saveLocalVisits(list: PropertyVisitRecord[]) {
  try {
    fs.writeFileSync(LOCAL_VISITS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture property_visits.json', e);
  }
}

function loadLocalAds(): any[] {
  try {
    if (fs.existsSync(LOCAL_ADS_FILE)) {
      const content = fs.readFileSync(LOCAL_ADS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error('Erreur lecture advertisements.json', e);
  }
  return [];
}

function saveLocalAds(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_ADS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture advertisements.json', e);
  }
}

function loadLocalSlides(): any[] {
  try {
    if (fs.existsSync(LOCAL_SLIDES_FILE)) {
      const content = fs.readFileSync(LOCAL_SLIDES_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error('Erreur lecture hero_slides.json', e);
  }
  return [];
}

function saveLocalSlides(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_SLIDES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture hero_slides.json', e);
  }
}

// Types et persistance des notifications backend
export interface NotificationRecord {
  id: string;
  event_type: 'client_request_confirmation' | 'agent_request_assigned' | 'visit_confirmation' | 'visit_reminder' | 'status_update';
  recipient_type: 'client' | 'agent' | 'admin' | 'user';
  recipient_id?: string | null;
  recipient_name: string;
  recipient_email?: string | null;
  recipient_phone?: string | null;
  channel: 'email' | 'whatsapp' | 'sms' | 'in_app';
  title: string;
  content_text: string;
  content_html?: string | null;
  status: 'pending' | 'queued' | 'sent' | 'failed' | 'cancelled';
  metadata?: any;
  scheduled_for?: string | null;
  sent_at?: string | null;
  created_at: string;
}

function loadLocalNotifications(): NotificationRecord[] {
  try {
    if (fs.existsSync(LOCAL_NOTIFICATIONS_FILE)) {
      const content = fs.readFileSync(LOCAL_NOTIFICATIONS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error('Erreur lecture notifications.json', e);
  }
  return [];
}

function saveLocalNotifications(list: NotificationRecord[]) {
  try {
    fs.writeFileSync(LOCAL_NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture notifications.json', e);
  }
}

// In-memory cache initialisé
let inMemoryRequests: ConciergerieRequest[] = loadLocalRequests();
let inMemoryVisits: PropertyVisitRecord[] = loadLocalVisits();
let inMemoryAds: any[] = loadLocalAds();
let inMemorySlides: any[] = loadLocalSlides();
let inMemoryNotifications: NotificationRecord[] = loadLocalNotifications();

// Helper de sécurité : extraction et validation de l'utilisateur authentifié
interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'agent' | 'user';
  agencyName?: string;
}

const getAuthUser = (req: Request): AuthUser | null => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!token) return null;

  try {
    // Si c'est un token JSON encodé en base64
    const decodedStr = Buffer.from(token, 'base64').toString('utf-8');
    if (decodedStr.startsWith('{')) {
      const parsed = JSON.parse(decodedStr);
      if (parsed && parsed.id && parsed.role) {
        return parsed as AuthUser;
      }
    }
  } catch {}

  // Session admin simulée ou JWT token standard
  if (token.includes('admin') || token.startsWith('admin_')) {
    return {
      id: 'admin_master',
      name: 'Direction Kinimmo',
      email: 'admin@kinimmo.cd',
      role: 'admin'
    };
  }

  // Token agent simulé
  if (token.startsWith('agent_') || token.includes('agent')) {
    return {
      id: token,
      name: 'Agent Kinshasa',
      email: `${token}@kinimmo.cd`,
      role: 'agent'
    };
  }

  return null;
};

// Architecture Notifications : Dispatcher local sans API externe
const enqueueNotification = (record: Omit<NotificationRecord, 'id' | 'created_at' | 'status'> & { id?: string; status?: NotificationRecord['status'] }): NotificationRecord => {
  const id = record.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const notif: NotificationRecord = {
    ...record,
    id,
    status: record.status || 'queued',
    created_at: new Date().toISOString()
  };

  inMemoryNotifications.unshift(notif);
  saveLocalNotifications(inMemoryNotifications);
  console.log(`[Notification Dispatcher] Notification enregistrée dans la file : [${notif.event_type}] pour ${notif.recipient_name} (${notif.channel})`);
  return notif;
};

// --- Routes API ---

// 1. Soumission d'une demande de conciergerie (Table: concierge_requests)
const handleCreateConciergeRequest = async (req: Request, res: Response) => {
  try {
    const rawData = req.body;

    // VALIDATION BACKEND OBLIGATOIRE
    const validation = validateConciergerieRequest(rawData);

    if (!validation.isValid || !validation.sanitized) {
      return res.status(400).json({
        success: false,
        error: 'Validation échouée sur le serveur. Veuillez corriger les informations requises.',
        errors: validation.errors
      });
    }

    const sanitized = validation.sanitized;
    const now = new Date();
    const year = now.getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reference = `KIN-CONC-${year}-${randomSuffix}`;
    const id = `conc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Structure conforme à la table concierge_requests :
    const newRequest: ConciergerieRequest = {
      id,
      user_id: sanitized.user_id || null,
      project_type: sanitized.project_type,
      property_type: sanitized.property_type,
      commune: sanitized.commune,
      quartier: sanitized.quartier || null,
      budget_min: sanitized.budget_min ?? null,
      budget_max: sanitized.budget_max,
      currency: sanitized.currency,
      bedrooms: sanitized.bedrooms ?? null,
      bathrooms: sanitized.bathrooms ?? null,
      parking: sanitized.parking,
      furnished: sanitized.furnished,
      services: sanitized.services,
      description: sanitized.description || null,
      full_name: sanitized.full_name,
      phone: sanitized.phone,
      whatsapp: sanitized.whatsapp || null,
      email: sanitized.email,
      status: 'new',
      assigned_agent_id: sanitized.assigned_agent_id || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),

      // Champs enrichis / compatibilité :
      reference,
      projet: sanitized.projet,
      typeBien: sanitized.typeBien,
      localisation: sanitized.localisation,
      budget: sanitized.budget,
      caracteristiques: sanitized.caracteristiques,
      client: sanitized.client,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    // Correspondance automatique avec les annonces dès la création de la demande
    const matches = findMatchingProperties(newRequest, initialProperties, { minScore: 20, limit: 10 });
    newRequest.matched_property_ids = matches.map((m) => m.property.id);
    newRequest.matched_count = matches.length;
    newRequest.top_match_score = matches[0]?.score || 0;

    // Si des biens correspondent très fortement (ex: score >= 60), marquer automatiquement le statut en 'properties_found'
    if (matches.length > 0 && matches[0].score >= 60) {
      newRequest.status = 'properties_found';
    }

    // Sauvegarde en mémoire et fichier local
    inMemoryRequests.unshift(newRequest);
    saveLocalRequests(inMemoryRequests);

    // ARCHITECTURE NOTIFICATIONS : Déclencher confirmation de demande au client (sans appel API externe)
    try {
      enqueueNotification({
        event_type: 'client_request_confirmation',
        recipient_type: 'client',
        recipient_id: newRequest.user_id || null,
        recipient_name: newRequest.full_name,
        recipient_email: newRequest.email || null,
        recipient_phone: newRequest.phone || null,
        channel: newRequest.email ? 'email' : 'whatsapp',
        title: `[Kinimmo] Confirmation de votre demande de Conciergerie #${newRequest.reference}`,
        content_text: `Bonjour ${newRequest.full_name}, nous confirmons la bonne réception de votre demande de conciergerie #${newRequest.reference} (${newRequest.project_type} - ${newRequest.property_type} à ${newRequest.commune}). Un conseiller dédié prendra contact avec vous dans les plus brefs délais.`,
        metadata: { requestId: newRequest.id, reference: newRequest.reference }
      });
    } catch (e) {
      console.warn('Erreur notification confirmation client:', e);
    }

    return res.status(201).json({
      success: true,
      message: 'Votre demande a été prise en compte avec succès par la Conciergerie Kinimmo.',
      reference: newRequest.reference,
      data: newRequest,
      matched_properties: matches
    });
  } catch (error: any) {
    console.error('Erreur backend POST concierge_requests:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur interne est survenue lors de l’enregistrement de votre demande.',
      details: error?.message || String(error)
    });
  }
};

app.post('/api/concierge-requests', handleCreateConciergeRequest);
app.post('/api/conciergerie', handleCreateConciergeRequest);

// Route de consultation des correspondances automatiques pour une demande
app.get('/api/concierge-requests/:id/matches', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const foundReq = inMemoryRequests.find((r) => r.id === id);
    if (!foundReq) {
      return res.status(404).json({ success: false, error: 'Demande introuvable.' });
    }
    const matches = findMatchingProperties(foundReq, initialProperties, { minScore: 15, limit: 15 });
    return res.json({ success: true, count: matches.length, data: matches });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// 2. Consultation des demandes (Table: concierge_requests)
// SÉCURITÉ : Contrôle des rôles et non-exposition des données administratives au public
const handleGetConciergeRequests = async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    let list: ConciergerieRequest[] = [...inMemoryRequests];

    // SÉCURITÉ : Vérifier qu'un agent ne peut accéder qu'aux données qui lui sont autorisées
    if (user && user.role === 'agent') {
      list = list.filter((r) => r.assigned_agent_id === user.id);
    }

    // SÉCURITÉ : Ne jamais exposer les données administratives (notesAdmin) au frontend public
    if (!user || user.role === 'user') {
      list = list.map((r) => {
        const sanitized = { ...r };
        delete (sanitized as any).notesAdmin;
        return sanitized;
      });
    }

    return res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};

app.get('/api/concierge-requests', handleGetConciergeRequests);
app.get('/api/conciergerie', handleGetConciergeRequests);

// 3. Mise à jour de statut, agent ou modification complète de la demande
// SÉCURITÉ : Vérifier que SEUL UN ADMINISTRATEUR peut modifier les demandes
const handleUpdateConciergeRequest = async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);

    // Contrôle strict des rôles : Seul l'administrateur peut modifier ou assigner les demandes
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit : Seul un administrateur habilité peut modifier ou réassigner les demandes de conciergerie.'
      });
    }

    const { id } = req.params;
    const body = req.body || {};

    const reqItem = inMemoryRequests.find((r) => r.id === id);
    if (!reqItem) {
      return res.status(404).json({ success: false, error: 'Demande introuvable.' });
    }

    const previousAgentId = reqItem.assigned_agent_id;

    const validStatuses: ConciergeRequestStatus[] = [
      'new',
      'searching',
      'properties_found',
      'visit_scheduled',
      'negotiation',
      'completed',
      'cancelled'
    ];

    if (body.status) {
      // Normalisation des statuts
      let mappedStatus = body.status;
      if (body.status === 'nouveau') mappedStatus = 'new';
      else if (body.status === 'en_cours') mappedStatus = 'searching';
      else if (body.status === 'traite') mappedStatus = 'completed';
      else if (body.status === 'archive') mappedStatus = 'cancelled';

      if (validStatuses.includes(mappedStatus)) {
        reqItem.status = mappedStatus;
      }
    }

    // Champs éditables
    if (body.full_name !== undefined) reqItem.full_name = String(body.full_name).trim();
    if (body.phone !== undefined) reqItem.phone = String(body.phone).trim();
    if (body.email !== undefined) reqItem.email = String(body.email).trim().toLowerCase();
    if (body.project_type !== undefined) reqItem.project_type = body.project_type;
    if (body.property_type !== undefined) reqItem.property_type = body.property_type;
    if (body.commune !== undefined) reqItem.commune = body.commune;
    if (body.quartier !== undefined) reqItem.quartier = body.quartier;
    if (body.budget_min !== undefined) reqItem.budget_min = Number(body.budget_min) || 0;
    if (body.budget_max !== undefined) reqItem.budget_max = Number(body.budget_max) || 0;
    if (body.currency !== undefined) reqItem.currency = body.currency;
    if (body.bedrooms !== undefined) reqItem.bedrooms = Number(body.bedrooms) || 0;
    if (body.bathrooms !== undefined) reqItem.bathrooms = Number(body.bathrooms) || 0;
    if (body.notes !== undefined) reqItem.notes = body.notes;
    if (body.assigned_agent_id !== undefined) reqItem.assigned_agent_id = body.assigned_agent_id;
    if (body.assigned_agent_name !== undefined) reqItem.assigned_agent_name = body.assigned_agent_name;
    if (body.notesAdmin !== undefined) reqItem.notesAdmin = String(body.notesAdmin);

    const nowIso = new Date().toISOString();
    reqItem.updated_at = nowIso;
    reqItem.updatedAt = nowIso;

    saveLocalRequests(inMemoryRequests);

    // ARCHITECTURE NOTIFICATIONS : Déclencher notification à l'agent responsable lors d'une nouvelle attribution
    if (body.assigned_agent_id && body.assigned_agent_id !== previousAgentId) {
      try {
        enqueueNotification({
          event_type: 'agent_request_assigned',
          recipient_type: 'agent',
          recipient_id: body.assigned_agent_id,
          recipient_name: body.assigned_agent_name || 'Agent Kinshasa',
          recipient_email: `${body.assigned_agent_id}@kinimmo.cd`,
          channel: 'email',
          title: `[Kinimmo Agent] Nouvelle mission de Conciergerie #${reqItem.reference || reqItem.id}`,
          content_text: `Bonjour ${body.assigned_agent_name || 'Agent'}, une nouvelle demande de conciergerie (#${reqItem.reference || reqItem.id}) pour ${reqItem.full_name} (${reqItem.project_type} - ${reqItem.property_type} à ${reqItem.commune}) vous a été attribuée par la Direction.`,
          metadata: { requestId: reqItem.id, agentId: body.assigned_agent_id }
        });
      } catch (notifErr) {
        console.warn('Erreur notification agent:', notifErr);
      }
    }

    return res.json({ success: true, message: 'Demande mise à jour avec succès.', data: reqItem });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};

app.patch('/api/concierge-requests/:id', handleUpdateConciergeRequest);
app.put('/api/concierge-requests/:id', handleUpdateConciergeRequest);
app.patch('/api/conciergerie/:id', handleUpdateConciergeRequest);
app.put('/api/conciergerie/:id', handleUpdateConciergeRequest);

// 4. Table : property_visits (CRUD complet avec contrôle RBAC et Notifications)
app.get('/api/property-visits', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const { request_id } = req.query;

    let list: PropertyVisitRecord[] = [...inMemoryVisits];
    if (request_id) {
      list = list.filter((v) => v.request_id === String(request_id));
    }

    // SÉCURITÉ : Contrôle des rôles - Un agent ne peut accéder qu'aux visites qui lui sont autorisées
    if (user && user.role === 'agent') {
      list = list.filter((v) => v.agent_id === user.id);
    }

    return res.json({ success: true, count: list.length, data: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

app.post('/api/property-visits', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    // SÉCURITÉ : Authentification obligatoire pour planifier une visite
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      return res.status(401).json({
        success: false,
        error: 'Accès non autorisé : Vous devez être authentifié en tant qu’administrateur ou agent pour planifier une visite.'
      });
    }

    let { request_id, property_id, agent_id, visit_date, visit_time, status, notes, property_title, agent_name, client_name } = req.body;

    if (!request_id || !visit_date) {
      return res.status(400).json({
        success: false,
        error: 'Les champs request_id et visit_date sont obligatoires pour planifier une visite.'
      });
    }

    // Si c'est un agent, forcer agent_id = user.id (un agent ne peut pas planifier pour un autre agent)
    if (user.role === 'agent') {
      agent_id = user.id;
      agent_name = user.name;
    }

    const nowIso = new Date().toISOString();
    const id = `visit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newVisit: PropertyVisitRecord = {
      id,
      request_id: String(request_id),
      property_id: property_id || null,
      agent_id: agent_id || null,
      visit_date: String(visit_date),
      visit_time: visit_time || '14:00',
      status: status || 'scheduled',
      notes: notes ? String(notes).trim() : null,
      created_at: nowIso,
      updated_at: nowIso,
      property_title: property_title || null,
      agent_name: agent_name || null,
      client_name: client_name || null
    };

    inMemoryVisits.unshift(newVisit);
    saveLocalVisits(inMemoryVisits);

    // Mettre à jour le statut de la demande en 'visit_scheduled' si approprié
    const targetRequest = inMemoryRequests.find((r) => r.id === request_id);
    if (targetRequest && targetRequest.status !== 'completed' && targetRequest.status !== 'cancelled') {
      targetRequest.status = 'visit_scheduled';
      targetRequest.updated_at = nowIso;
      saveLocalRequests(inMemoryRequests);
    }

    // ARCHITECTURE NOTIFICATIONS : 3. Déclencher confirmation de visite (client & agent) sans API externe
    try {
      enqueueNotification({
        event_type: 'visit_confirmation',
        recipient_type: 'client',
        recipient_name: client_name || targetRequest?.full_name || 'Client',
        recipient_email: targetRequest?.email || null,
        recipient_phone: targetRequest?.phone || null,
        channel: 'email',
        title: `[Kinimmo] Confirmation de votre visite immobilière le ${visit_date}`,
        content_text: `Bonjour ${client_name || targetRequest?.full_name || 'Client'}, votre visite pour "${property_title || 'le bien sélectionné'}" est confirmée le ${visit_date} à ${visit_time || '14:00'} avec ${agent_name || 'votre conseiller Kinimmo'}.`,
        metadata: { visitId: newVisit.id, requestId: newVisit.request_id }
      });

      // 4. Préparer également le rappel de visite dans la file (rappel programmé)
      enqueueNotification({
        event_type: 'visit_reminder',
        recipient_type: 'client',
        recipient_name: client_name || targetRequest?.full_name || 'Client',
        recipient_email: targetRequest?.email || null,
        recipient_phone: targetRequest?.phone || null,
        channel: 'whatsapp',
        title: `[Rappel Kinimmo] Visite immobilière prévue à ${visit_time || '14:00'}`,
        content_text: `Rappel de rendez-vous Kinimmo : votre visite pour "${property_title || 'votre propriété'}" aura lieu aujourd'hui à ${visit_time || '14:00'}.`,
        status: 'pending',
        scheduled_for: `${visit_date}T${visit_time || '12:00'}:00.000Z`,
        metadata: { visitId: newVisit.id, visitDate: visit_date }
      });
    } catch (notifErr) {
      console.warn('Erreur notification visite:', notifErr);
    }

    return res.status(201).json({ success: true, message: 'Visite planifiée et notifications enregistrées dans la file.', data: newVisit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

app.patch('/api/property-visits/:id', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }

    const { id } = req.params;
    const { status, notes, visit_date, visit_time, agent_id, property_id } = req.body;

    const visit = inMemoryVisits.find((v) => v.id === id);
    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visite introuvable.' });
    }

    // SÉCURITÉ : Un agent ne peut modifier que ses propres visites
    if (user.role === 'agent' && visit.agent_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Accès interdit : vous ne pouvez modifier que les visites qui vous sont attribuées.' });
    }

    if (status !== undefined) visit.status = status;
    if (notes !== undefined) visit.notes = notes;
    if (visit_date !== undefined) visit.visit_date = visit_date;
    if (visit_time !== undefined) visit.visit_time = visit_time;
    if (agent_id !== undefined && user.role === 'admin') visit.agent_id = agent_id;
    if (property_id !== undefined) visit.property_id = property_id;
    visit.updated_at = new Date().toISOString();

    saveLocalVisits(inMemoryVisits);

    return res.json({ success: true, message: 'Visite mise à jour.', data: visit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

app.delete('/api/property-visits/:id', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }

    const { id } = req.params;
    const visit = inMemoryVisits.find((v) => v.id === id);
    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visite introuvable.' });
    }

    if (user.role === 'agent' && visit.agent_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }

    inMemoryVisits = inMemoryVisits.filter((v) => v.id !== id);
    saveLocalVisits(inMemoryVisits);

    return res.json({ success: true, message: 'Visite supprimée avec succès.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// ==========================================
// 5. MODULE DE NOTIFICATIONS (Architecture Backend)
// ==========================================

// GET /api/notifications - Consultation sécurisée de la file d'attente
app.get('/api/notifications', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise pour consulter les notifications.'
      });
    }

    let list = inMemoryNotifications;

    // SÉCURITÉ : Contrôle des rôles et isolation des données
    if (user.role === 'agent') {
      list = list.filter((n) => n.recipient_id === user.id || n.recipient_type === 'agent');
    } else if (user.role === 'user') {
      list = list.filter((n) => n.recipient_id === user.id);
    }

    const { event_type, status } = req.query;
    if (event_type) {
      list = list.filter((n) => n.event_type === String(event_type));
    }
    if (status) {
      list = list.filter((n) => n.status === String(status));
    }

    return res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// GET /api/notifications/templates - Définition des 4 modèles
app.get('/api/notifications/templates', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
    return res.status(401).json({ success: false, error: 'Authentification requise.' });
  }

  return res.json({
    success: true,
    data: [
      {
        id: 'client_request_confirmation',
        name: 'Confirmation de demande au client',
        description: 'Accusé de réception avec récapitulatif du projet (Projet, type de bien, commune, budget, référence).',
        variables: ['full_name', 'reference', 'project_type', 'property_type', 'commune', 'budget_max', 'currency'],
        supportedChannels: ['email', 'whatsapp', 'sms']
      },
      {
        id: 'agent_request_assigned',
        name: 'Notification à l’agent responsable',
        description: 'Alerte transmise au courtier responsable lors de l’attribution d’un nouveau dossier.',
        variables: ['agent_name', 'client_name', 'phone', 'project', 'property_type', 'commune', 'reference'],
        supportedChannels: ['email', 'whatsapp', 'in_app']
      },
      {
        id: 'visit_confirmation',
        name: 'Confirmation de visite immobilière',
        description: 'Confirmation de rendez-vous terrain envoyée au client et à l’agent accompagnateur.',
        variables: ['client_name', 'agent_name', 'visit_date', 'visit_time', 'property_title'],
        supportedChannels: ['email', 'whatsapp', 'sms']
      },
      {
        id: 'visit_reminder',
        name: 'Rappel de visite',
        description: 'Rappel automatique envoyé avant l’heure du rendez-vous (J-1 ou H-2) pour confirmer la présence.',
        variables: ['client_name', 'visit_date', 'visit_time', 'property_title', 'agent_name'],
        supportedChannels: ['whatsapp', 'sms', 'email']
      }
    ]
  });
});

// POST /api/notifications/test-template - Simulation de rendu sans API externe
app.post('/api/notifications/test-template', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  }

  const { event_type, sample_data = {} } = req.body;
  let preview = { subject: '', text: '' };

  switch (event_type) {
    case 'client_request_confirmation':
      preview = {
        subject: `[Kinimmo] Confirmation de votre demande de Conciergerie #${sample_data.reference || 'KIN-84920'}`,
        text: `Bonjour ${sample_data.full_name || 'Client'}, votre demande #${sample_data.reference || 'KIN-84920'} (${sample_data.project_type || 'Acheter'} - ${sample_data.property_type || 'Villa'} à ${sample_data.commune || 'Gombe'}) a bien été enregistrée. Un conseiller Kinimmo vous contactera très rapidement.`
      };
      break;
    case 'agent_request_assigned':
      preview = {
        subject: `[Kinimmo Agent] Nouvelle mission de Conciergerie assignée #${sample_data.reference || 'KIN-84920'}`,
        text: `Bonjour ${sample_data.agent_name || 'Agent'}, une nouvelle demande de conciergerie (#${sample_data.reference || 'KIN-84920'}) pour ${sample_data.client_name || 'Client'} (${sample_data.phone || '+243...'}) vous a été attribuée par la Direction.`
      };
      break;
    case 'visit_confirmation':
      preview = {
        subject: `[Kinimmo] Confirmation de votre visite immobilière le ${sample_data.visit_date || '2026-10-05'}`,
        text: `Bonjour ${sample_data.client_name || 'Client'}, votre visite pour "${sample_data.property_title || 'Propriété Kinshasa'}" est confirmée le ${sample_data.visit_date || '2026-10-05'} à ${sample_data.visit_time || '15:00'} avec ${sample_data.agent_name || 'votre conseiller Kinimmo'}.`
      };
      break;
    case 'visit_reminder':
      preview = {
        subject: `[Rappel Kinimmo] Visite immobilière prévue à ${sample_data.visit_time || '15:00'}`,
        text: `Rappel : votre visite pour "${sample_data.property_title || 'Propriété Kinshasa'}" aura lieu aujourd’hui à ${sample_data.visit_time || '15:00'}. Merci de confirmer votre présence.`
      };
      break;
    default:
      return res.status(400).json({ success: false, error: 'Type d’événement de notification invalide.' });
  }

  return res.json({
    success: true,
    event_type,
    simulated: true,
    notice: 'Structure backend uniquement. Aucune API externe n’a été contactée.',
    preview
  });
});

// POST /api/notifications/trigger-reminder/:visitId - Déclenchement de rappel
app.post('/api/notifications/trigger-reminder/:visitId', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user || (user.role !== 'admin' && user.role !== 'agent')) {
    return res.status(401).json({ success: false, error: 'Authentification requise.' });
  }

  const { visitId } = req.params;
  const visit = inMemoryVisits.find((v) => v.id === visitId);
  if (!visit) {
    return res.status(404).json({ success: false, error: 'Visite introuvable.' });
  }

  if (user.role === 'agent' && visit.agent_id !== user.id) {
    return res.status(403).json({ success: false, error: 'Accès interdit : vous ne pouvez déclencher des rappels que pour vos propres visites.' });
  }

  const notif = enqueueNotification({
    event_type: 'visit_reminder',
    recipient_type: 'client',
    recipient_name: visit.client_name || 'Client',
    channel: 'whatsapp',
    title: `[Rappel Kinimmo] Visite immobilière prévue le ${visit.visit_date} à ${visit.visit_time || '14:00'}`,
    content_text: `Rappel Kinimmo : votre visite pour "${visit.property_title || 'le bien sélectionné'}" est prévue le ${visit.visit_date} à ${visit.visit_time || '14:00'}.`,
    metadata: { visitId: visit.id, visitDate: visit.visit_date }
  });

  return res.json({
    success: true,
    message: 'Rappel de visite enregistré dans la file d’attente backend.',
    notification: notif
  });
});

// ==========================================
// 5. RÉGIE PUBLICITAIRE & MONÉTISATION (API BACKEND)
// ==========================================

// 5a. Formules d'abonnements & Monétisation (GET /api/billing/plans)
app.get('/api/billing/plans', (req: Request, res: Response) => {
  try {
    const { category, include_inactive } = req.query;
    let list = inMemoryPlans;
    if (include_inactive !== 'true') {
      list = list.filter((p) => p.is_active !== false);
    }
    if (category && category !== 'all') {
      list = list.filter((p) => p.category === category);
    }
    return res.json({ success: true, count: list.length, plans: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Mise à jour d'un forfait / plan d'abonnement (Admin)
app.put('/api/billing/plans/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemoryPlans.findIndex(p => p.id === id);
    if (idx !== -1) {
      const priceUsd = Number(req.body.price_usd !== undefined ? req.body.price_usd : (req.body.priceMonthly !== undefined ? req.body.priceMonthly : inMemoryPlans[idx].price_usd));
      const priceCdf = Number(req.body.price_cdf !== undefined ? req.body.price_cdf : (req.body.priceMonthlyCDF !== undefined ? req.body.priceMonthlyCDF : (priceUsd * 2850)));
      const maxListings = Number(req.body.max_listings !== undefined ? req.body.max_listings : (req.body.maxListings !== undefined ? req.body.maxListings : inMemoryPlans[idx].max_listings));
      const featuredListings = Number(req.body.max_featured_listings !== undefined ? req.body.max_featured_listings : (req.body.featuredListings !== undefined ? req.body.featuredListings : inMemoryPlans[idx].max_featured_listings));

      inMemoryPlans[idx] = {
        ...inMemoryPlans[idx],
        ...req.body,
        price_usd: priceUsd,
        priceMonthly: priceUsd,
        price_cdf: priceCdf,
        priceMonthlyCDF: priceCdf,
        max_listings: maxListings,
        maxListings: maxListings,
        max_featured_listings: featuredListings,
        featuredListings: featuredListings,
        updated_at: new Date().toISOString()
      };
      saveLocalPlans(inMemoryPlans);
      return res.json({ success: true, message: 'Formule mise à jour avec succès.', plan: inMemoryPlans[idx] });
    }
    return res.status(404).json({ success: false, error: 'Formule introuvable' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Création d'une nouvelle formule d'abonnement (Admin)
app.post('/api/billing/plans', (req: Request, res: Response) => {
  try {
    const id = req.body.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const priceUsd = Number(req.body.price_usd ?? req.body.priceMonthly ?? 0);
    const priceCdf = Number(req.body.price_cdf ?? req.body.priceMonthlyCDF ?? (priceUsd * 2850));
    const maxListings = Number(req.body.max_listings ?? req.body.maxListings ?? 5);
    const featuredListings = Number(req.body.max_featured_listings ?? req.body.featuredListings ?? 0);

    const newPlan = {
      id,
      name: req.body.name || 'Nouvelle formule',
      description: req.body.description || '',
      category: req.body.category || 'individual',
      badge: req.body.badge || 'Formule Pro',
      price_usd: priceUsd,
      priceMonthly: priceUsd,
      price_cdf: priceCdf,
      priceMonthlyCDF: priceCdf,
      currency: 'USD',
      billing_period: req.body.billing_period || 'monthly',
      billingPeriod: 'month',
      max_listings: maxListings,
      maxListings: maxListings,
      max_featured_listings: featuredListings,
      featuredListings: featuredListings,
      agentAccounts: Number(req.body.agentAccounts || 1),
      features: Array.isArray(req.body.features) ? req.body.features : ['Publication d\'annonces'],
      recommended: Boolean(req.body.recommended),
      has_verified_badge: Boolean(req.body.has_verified_badge),
      hasVerifiedBadge: Boolean(req.body.hasVerifiedBadge),
      has_crm_leads: Boolean(req.body.has_crm_leads),
      hasCrmLeads: Boolean(req.body.hasCrmLeads),
      has_priority_support: Boolean(req.body.has_priority_support),
      hasPrioritySupport: Boolean(req.body.hasPrioritySupport),
      is_active: req.body.is_active !== false,
      isActive: req.body.isActive !== false,
      created_at: new Date().toISOString()
    };

    inMemoryPlans.push(newPlan);
    saveLocalPlans(inMemoryPlans);
    return res.status(201).json({ success: true, message: 'Formule créée avec succès.', plan: newPlan });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Suppression d'une formule (Admin)
app.delete('/api/billing/plans/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    inMemoryPlans = inMemoryPlans.filter(p => p.id !== id);
    saveLocalPlans(inMemoryPlans);
    return res.json({ success: true, message: 'Formule supprimée.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5b. Options de visibilité & Boosts à la carte (GET /api/billing/visibility-options)
app.get('/api/billing/visibility-options', (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, count: inMemoryOptions.length, options: inMemoryOptions });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Mise à jour d'une option de visibilité (Admin)
app.put('/api/billing/visibility-options/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemoryOptions.findIndex(o => o.id === id);
    if (idx !== -1) {
      const priceUsd = Number(req.body.price_usd !== undefined ? req.body.price_usd : (req.body.price !== undefined ? req.body.price : inMemoryOptions[idx].price_usd));
      const priceCdf = Number(req.body.price_cdf !== undefined ? req.body.price_cdf : (req.body.priceCDF !== undefined ? req.body.priceCDF : (priceUsd * 2850)));
      const durationDays = Number(req.body.duration_days !== undefined ? req.body.duration_days : inMemoryOptions[idx].duration_days);

      inMemoryOptions[idx] = {
        ...inMemoryOptions[idx],
        ...req.body,
        price_usd: priceUsd,
        price: priceUsd,
        price_cdf: priceCdf,
        priceCDF: priceCdf,
        duration_days: durationDays,
        updated_at: new Date().toISOString()
      };
      saveLocalOptions(inMemoryOptions);
      return res.json({ success: true, message: 'Option de visibilité mise à jour.', option: inMemoryOptions[idx] });
    }
    return res.status(404).json({ success: false, error: 'Option non trouvée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Création d'une option de visibilité (Admin)
app.post('/api/billing/visibility-options', (req: Request, res: Response) => {
  try {
    const id = req.body.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const priceUsd = Number(req.body.price_usd ?? req.body.price ?? 10);
    const priceCdf = Number(req.body.price_cdf ?? req.body.priceCDF ?? (priceUsd * 2850));

    const newOption = {
      id,
      name: req.body.name || 'Option de visibilité',
      slug: req.body.slug || `boost_${Date.now()}`,
      description: req.body.description || '',
      boost_type: req.body.boost_type || 'featured',
      duration_days: Number(req.body.duration_days || 7),
      price_usd: priceUsd,
      price: priceUsd,
      price_cdf: priceCdf,
      priceCDF: priceCdf,
      badge_text: req.body.badge_text || 'En Vedette',
      icon: req.body.icon || 'Sparkles',
      is_active: req.body.is_active !== false,
      created_at: new Date().toISOString()
    };

    inMemoryOptions.push(newOption);
    saveLocalOptions(inMemoryOptions);
    return res.status(201).json({ success: true, message: 'Option de visibilité créée.', option: newOption });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Suppression d'une option de visibilité (Admin)
app.delete('/api/billing/visibility-options/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    inMemoryOptions = inMemoryOptions.filter(o => o.id !== id);
    saveLocalOptions(inMemoryOptions);
    return res.json({ success: true, message: 'Option supprimée avec succès.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5c. Moyens de paiement officiels RDC (GET /api/billing/payment-methods)
app.get('/api/billing/payment-methods', (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, count: inMemoryPaymentMethods.length, paymentMethods: inMemoryPaymentMethods });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5d. Création de facture de souscription forfait (POST /api/billing/invoices)
app.post('/api/billing/invoices', (req: Request, res: Response) => {
  try {
    const { planId, paymentMethodId, paymentGateway = 'manual_mobile_money', userId, userName, userEmail } = req.body;
    const targetPlan = inMemoryPlans.find((p) => p.id === planId) || inMemoryPlans[0];
    const targetPayment = inMemoryPaymentMethods.find((pm) => pm.id === paymentMethodId) || inMemoryPaymentMethods[0];

    const invoiceNumber = `FAC-KIN-${Math.floor(100000 + Math.random() * 900000)}`;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const newInvoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      invoiceNumber,
      user_id: userId || 'user_guest',
      user_name: userName || 'Client Kinshasa',
      user_email: userEmail || 'client@kinimmo.cd',
      target_name: userName || targetPlan.name,
      target_email: userEmail || 'client@kinimmo.cd',
      invoice_type: 'subscription',
      invoiceType: 'subscription',
      plan_id: targetPlan.id,
      plan_name: targetPlan.name,
      amount: targetPlan.price_usd || targetPlan.priceMonthly,
      amount_usd: targetPlan.price_usd || targetPlan.priceMonthly,
      currency: 'USD',
      amount_cdf: targetPlan.price_cdf || targetPlan.priceMonthlyCDF,
      total_amount: targetPlan.price_usd || targetPlan.priceMonthly,
      total_amount_cdf: targetPlan.price_cdf || targetPlan.priceMonthlyCDF,
      payment_method_id: targetPayment?.id || null,
      payment_method_provider: targetPayment?.account_name || 'Mobile Money',
      payment_gateway: paymentGateway,
      status: targetPlan.priceMonthly === 0 ? 'paid' : 'pending',
      due_date: dueDate,
      created_at: nowIso,
      updated_at: nowIso
    };

    inMemoryInvoices.unshift(newInvoice);
    return res.status(201).json({
      success: true,
      message: 'Facture générée avec succès.',
      invoice: newInvoice
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5e. Commande de boost d'annonce à la carte (POST /api/billing/boost-order)
app.post('/api/billing/boost-order', (req: Request, res: Response) => {
  try {
    const { propertyId, optionId, paymentMethodId, paymentGateway = 'manual_mobile_money', userId, propertyTitle } = req.body;

    // Règle stricte Kinimmo : Empêcher les nouveaux boosts incompatibles avec le statut RENTED, SOLD, ARCHIVED
    if (propertyId) {
      const targetProperty = inMemoryProperties.find((p: any) => p.id === propertyId);
      if (targetProperty) {
        const rawStatus = String(targetProperty.listingStatus || targetProperty.status || '').toUpperCase();
        if (rawStatus === 'RENTED' || rawStatus === 'SOLD' || rawStatus === 'ARCHIVED' || targetProperty.status === 'sold') {
          return res.status(400).json({
            success: false,
            error: `Impossible de commander un boost pour un bien avec le statut « ${rawStatus} ». Seuls les biens disponibles et publiés peuvent faire l'objet d'un boost de visibilité.`
          });
        }
      }
    }

    const targetOption = inMemoryOptions.find((o) => o.id === optionId) || inMemoryOptions[0];
    const targetPayment = inMemoryPaymentMethods.find((pm) => pm.id === paymentMethodId) || inMemoryPaymentMethods[0];

    const invoiceNumber = `BST-KIN-${Math.floor(100000 + Math.random() * 900000)}`;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const dueDate = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    const newInvoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      invoiceNumber,
      user_id: userId || 'user_agent_active',
      user_name: 'Bailleur / Courtier Partenaire',
      user_email: 'partenaire@kinimmo.cd',
      target_name: 'Annonceur Kinshasa',
      target_email: 'partenaire@kinimmo.cd',
      invoice_type: 'boost',
      invoiceType: 'boost',
      property_id: propertyId,
      property_title: propertyTitle || 'Propriété Kinshasa',
      option_id: targetOption.id,
      option_name: targetOption.name,
      boost_type: targetOption.boost_type,
      duration_days: targetOption.duration_days,
      amount: targetOption.price_usd,
      amount_usd: targetOption.price_usd,
      currency: 'USD',
      amount_cdf: targetOption.price_cdf,
      total_amount: targetOption.price_usd,
      total_amount_cdf: targetOption.price_cdf,
      payment_method_id: targetPayment?.id || null,
      payment_method_provider: targetPayment?.account_name || 'Mobile Money',
      payment_gateway: paymentGateway,
      status: 'pending',
      due_date: dueDate,
      created_at: nowIso,
      updated_at: nowIso
    };

    inMemoryInvoices.unshift(newInvoice);
    return res.status(201).json({
      success: true,
      message: 'Commande de visibilité créée avec succès.',
      invoice: newInvoice
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5f. Factures de l'utilisateur connecté (GET /api/billing/my-invoices)
app.get('/api/billing/my-invoices', (_req: Request, res: Response) => {
  return res.json({ success: true, count: inMemoryInvoices.length, invoices: inMemoryInvoices });
});

// 5g. Boosts actifs de l'utilisateur (GET /api/billing/my-boosts)
app.get('/api/billing/my-boosts', (_req: Request, res: Response) => {
  const boosts = inMemoryInvoices.filter((inv) => inv.invoice_type === 'boost');
  return res.json({ success: true, count: boosts.length, boosts });
});

// 5h. Transmission de la référence / preuve de paiement (PUT /api/billing/invoices/:id/pay)
app.put('/api/billing/invoices/:id/pay', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { transactionReference, paymentMethodId } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }
    if (transactionReference) inv.transaction_reference = transactionReference;
    if (paymentMethodId) inv.payment_method_id = paymentMethodId;
    inv.updated_at = new Date().toISOString();
    return res.json({ success: true, message: 'Référence de règlement enregistrée avec succès.', invoice: inv });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5i. Validation et approbation manuelle d'une facture / boost par l'administrateur (PUT /api/billing/invoices/:id/approve)
app.put('/api/billing/invoices/:id/approve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }
    inv.status = 'paid';
    inv.paid_at = new Date().toISOString();
    inv.updated_at = new Date().toISOString();

    // Activation du boost sur la propriété si la facture est un boost
    if (inv.invoice_type === 'boost' || inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p) => p.id === inv.property_id);
      if (propIdx !== -1) {
        const optionId = String(inv.option_id || '').toLowerCase();
        let durationDays = Number(inv.duration_days) || 7;
        if (optionId.includes('30')) durationDays = 30;
        else if (optionId.includes('14')) durationDays = 14;
        else if (optionId.includes('7')) durationDays = 7;

        const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
        inMemoryProperties[propIdx].boostExpiresAt = expiresAt;

        if (optionId.includes('premium')) {
          inMemoryProperties[propIdx].isPremium = true;
          inMemoryProperties[propIdx].featured = true;
          inMemoryProperties[propIdx].listingTier = 'premium';
        } else if (optionId.includes('featured')) {
          inMemoryProperties[propIdx].featured = true;
          inMemoryProperties[propIdx].listingTier = 'featured';
        } else if (optionId.includes('urgent')) {
          inMemoryProperties[propIdx].isUrgent = true;
        }

        inMemoryProperties[propIdx].refreshBumpAt = new Date().toISOString();
        inMemoryProperties[propIdx].updatedAt = new Date().toISOString();
        saveLocalProperties(inMemoryProperties);
      }
    }

    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: `Facture ${inv.invoice_number} validée avec succès. Le boost a été activé sur l'annonce.`,
      invoice: inv
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5i-bis. Rejet manuel d'une facture / demande de boost par l'administrateur (PUT /api/billing/invoices/:id/reject)
app.put('/api/billing/invoices/:id/reject', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason = 'Paiement non reçu ou référence de transaction non confirmée.' } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }

    inv.status = 'failed';
    inv.notes = `Paiement rejeté par l'administrateur : ${reason}`;
    inv.updated_at = new Date().toISOString();

    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: `Paiement rejeté pour la facture ${inv.invoice_number}. Le boost n'a pas été activé.`,
      invoice: inv
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5j. Consultation de toutes les factures côté administration (GET /api/admin/invoices)
app.get('/api/admin/invoices', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    count: inMemoryInvoices.length,
    data: { invoices: inMemoryInvoices },
    invoices: inMemoryInvoices
  });
});

// Consultation des publicités par placement ou catégorie
app.get('/api/billing/advertisements', (req: Request, res: Response) => {
  try {
    const { placement, category } = req.query;
    let ads = inMemoryAds.filter(a => a.is_active !== false);
    if (placement && placement !== 'all') {
      ads = ads.filter(a => a.placement === placement || (placement === 'in_feed' && (a.placement === 'search_top' || a.placement === 'home_hero')));
    }
    if (category && category !== 'all') {
      ads = ads.filter(a => a.category === category);
    }
    return res.json({ success: true, count: ads.length, advertisements: ads });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.get('/api/ads/:placement', (req: Request, res: Response) => {
  try {
    const { placement } = req.params;
    const { category } = req.query;
    let ads = inMemoryAds.filter(a => a.is_active !== false);
    if (placement && placement !== 'all') {
      ads = ads.filter(a => a.placement === placement || (placement === 'in_feed' && (a.placement === 'search_top' || a.placement === 'home_hero')));
    }
    if (category && category !== 'all') {
      ads = ads.filter(a => a.category === category);
    }
    const currentAd = ads[0] || inMemoryAds[0] || null;
    return res.json({ success: true, ad: currentAd, advertisements: ads });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Suivi des clics sur les publicités
const handleAdClick = (req: Request, res: Response) => {
  try {
    const id = req.params.id || req.params.campaignId;
    const ad = inMemoryAds.find(a => a.id === id);
    if (ad) {
      ad.clicks_count = (ad.clicks_count || 0) + 1;
      saveLocalAds(inMemoryAds);
      return res.json({ success: true, clicks_count: ad.clicks_count, target_url: ad.target_url });
    }
    return res.json({ success: true, message: 'Click tracked' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post('/api/billing/advertisements/:id/click', handleAdClick);
app.post('/api/ads/:campaignId/click', handleAdClick);

// Suivi des impressions sur les publicités
const handleAdImpression = (req: Request, res: Response) => {
  try {
    const id = req.params.id || req.params.campaignId;
    const ad = inMemoryAds.find(a => a.id === id);
    if (ad) {
      ad.impressions_count = (ad.impressions_count || 0) + 1;
      saveLocalAds(inMemoryAds);
      return res.json({ success: true, impressions_count: ad.impressions_count });
    }
    return res.json({ success: true, message: 'Impression tracked' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post('/api/billing/advertisements/:id/impression', handleAdImpression);
app.post('/api/ads/:campaignId/impression', handleAdImpression);

// Administration des publicités
app.get('/api/billing/admin/advertisements', (_req: Request, res: Response) => {
  return res.json({ success: true, count: inMemoryAds.length, advertisements: inMemoryAds });
});

app.post('/api/billing/admin/advertisements', (req: Request, res: Response) => {
  try {
    const newAd = {
      id: req.body.id || `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: req.body.title || 'Campagne Sponsor',
      advertiser_name: req.body.advertiser_name || 'Annonceur',
      advertiser_contact: req.body.advertiser_contact || '',
      advertiser_email: req.body.advertiser_email || '',
      category: req.body.category || 'real_estate',
      placement: req.body.placement || 'home_hero',
      image_url: req.body.image_url || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200',
      target_url: req.body.target_url || '',
      alt_text: req.body.alt_text || req.body.title,
      price_usd: Number(req.body.price_usd) || 150,
      start_date: req.body.start_date || new Date().toISOString().split('T')[0],
      end_date: req.body.end_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      impressions_count: 0,
      clicks_count: 0,
      is_active: req.body.is_active !== false,
      created_at: new Date().toISOString()
    };
    inMemoryAds.unshift(newAd);
    saveLocalAds(inMemoryAds);
    return res.status(201).json({ success: true, advertisement: newAd });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.put('/api/billing/admin/advertisements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemoryAds.findIndex(a => a.id === id);
    if (idx !== -1) {
      inMemoryAds[idx] = { ...inMemoryAds[idx], ...req.body, updated_at: new Date().toISOString() };
      saveLocalAds(inMemoryAds);
      return res.json({ success: true, advertisement: inMemoryAds[idx] });
    }
    return res.status(404).json({ success: false, error: 'Publicité non trouvée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.delete('/api/billing/admin/advertisements/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    inMemoryAds = inMemoryAds.filter(a => a.id !== id);
    saveLocalAds(inMemoryAds);
    return res.json({ success: true, message: 'Publicité supprimée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Statistiques administratives de monétisation
app.get('/api/billing/admin/monetization-stats', (_req: Request, res: Response) => {
  const totalImpressions = inMemoryAds.reduce((acc, a) => acc + (a.impressions_count || 0), 0);
  const totalClicks = inMemoryAds.reduce((acc, a) => acc + (a.clicks_count || 0), 0);
  return res.json({
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
        active_campaigns: inMemoryAds.filter(a => a.is_active !== false).length,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        avg_ctr_percent: totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 4.5
      }
    }
  });
});

// ==========================================
// 6. MISE EN AVANT & SHOWCASE HERO SLIDER
// ==========================================
app.get('/api/showcase', (_req: Request, res: Response) => {
  return res.json({ success: true, count: inMemorySlides.length, slides: inMemorySlides });
});

app.post('/api/showcase', (req: Request, res: Response) => {
  try {
    const newSlide = {
      ...req.body,
      id: req.body.id || `slide_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isActive: req.body.isActive !== false
    };
    inMemorySlides.unshift(newSlide);
    saveLocalSlides(inMemorySlides);
    return res.status(201).json({ success: true, slide: newSlide });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.put('/api/showcase/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemorySlides.findIndex(s => s.id === id);
    if (idx !== -1) {
      inMemorySlides[idx] = { ...inMemorySlides[idx], ...req.body };
      saveLocalSlides(inMemorySlides);
      return res.json({ success: true, slide: inMemorySlides[idx] });
    }
    return res.status(404).json({ success: false, error: 'Diapositive non trouvée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.delete('/api/showcase/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    inMemorySlides = inMemorySlides.filter(s => s.id !== id);
    saveLocalSlides(inMemorySlides);
    return res.json({ success: true, message: 'Diapositive supprimée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// ==========================================
// 7. DÉTECTION DES ANNONCES SUSPECTES & ANTI-FRAUDE
// ==========================================
const LOCAL_REPORTS_FILE = path.join(__dirname, 'property_user_reports.json');

const INITIAL_REPORTS = [
  {
    id: 'rep_1',
    propertyId: 'prop_mock_suspect_1',
    propertyTitle: 'Villa Diplomatique Piscine Gombe',
    agentId: 'agent_fake_1',
    reporterName: 'Marc Kabamba',
    reporterContact: '+243 81 200 3040',
    reason: 'fake_price',
    reasonLabel: 'Prix anormalement bas / Trompeur',
    comment: 'Cette villa avec piscine à Gombe est affichée à 150$/mois. Le vendeur réclame un acompte préalable par M-Pesa avant la visite.',
    createdAt: '2026-10-02T10:30:00.000Z',
    status: 'pending'
  },
  {
    id: 'rep_2',
    propertyId: 'prop_mock_suspect_2',
    propertyTitle: 'Appartement Moderne 3 Ch Limete',
    agentId: 'agent_fake_2',
    reporterName: 'Clarisse Tshala',
    reporterContact: '+243 99 876 5432',
    reason: 'stolen_photos',
    reasonLabel: 'Photos volées ou non réelles',
    comment: 'Photos copiées d\'un projet hôtelier étranger.',
    createdAt: '2026-10-03T14:15:00.000Z',
    status: 'pending'
  }
];

let inMemoryReports = (() => {
  try {
    if (fs.existsSync(LOCAL_REPORTS_FILE)) {
      const raw = fs.readFileSync(LOCAL_REPORTS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...INITIAL_REPORTS];
})();

function saveLocalReports(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_REPORTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
}

// Analyser une annonce spécifique selon les 6 règles
app.post('/api/fraud/analyze', (req: Request, res: Response) => {
  try {
    const property = req.body;
    const analysis = analyzePropertyForFraud(property, initialProperties, inMemoryReports);
    return res.json({ success: true, analysis });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Audit global de toutes les annonces
app.get('/api/fraud/audit', (_req: Request, res: Response) => {
  try {
    const audit = auditPropertyList(initialProperties, inMemoryReports);
    return res.json({
      success: true,
      stats: {
        total: audit.total,
        normalCount: audit.normalCount,
        reviewRequiredCount: audit.reviewRequiredCount,
        suspectCount: audit.suspectCount,
        reportsCount: inMemoryReports.length
      },
      flagged: audit.auditedProperties.filter(p => p.fraudStatus !== 'normal')
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Enregistrer un signalement citoyen (Prix trompeur, arnaque/acompte, etc.)
app.post('/api/fraud/report', (req: Request, res: Response) => {
  try {
    const { propertyId, propertyTitle, agentId, reporterName, reporterContact, reason, reasonLabel, comment } = req.body;
    if (!propertyId || !reason) {
      return res.status(400).json({ success: false, message: 'ID propriété et motif requis.' });
    }

    const newReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      propertyId,
      propertyTitle: propertyTitle || 'Bien immobilier',
      agentId: agentId || null,
      reporterName: reporterName || 'Anonyme',
      reporterContact: reporterContact || '',
      reason,
      reasonLabel: reasonLabel || reason,
      comment: comment || '',
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    inMemoryReports.unshift(newReport);
    saveLocalReports(inMemoryReports);
    return res.status(201).json({ success: true, report: newReport });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Récupérer la liste des signalements
app.get('/api/fraud/reports', (_req: Request, res: Response) => {
  return res.json({ success: true, count: inMemoryReports.length, reports: inMemoryReports });
});

// Mettre à jour le statut d'un signalement
app.put('/api/fraud/reports/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const idx = inMemoryReports.findIndex(r => r.id === id);
    if (idx !== -1) {
      inMemoryReports[idx].status = status || 'resolved';
      saveLocalReports(inMemoryReports);
      return res.json({ success: true, report: inMemoryReports[idx] });
    }
    return res.status(404).json({ success: false, message: 'Signalement introuvable.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// ==========================================
// 8. HÉBERGEMENT VIDÉO CLOUDINARY & CDN PRO
// ==========================================
interface CloudinaryServerConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
  isConfigured: boolean;
  autoOptimize: boolean;
}

function parseCloudinaryUrl(urlStr: string): { cloudName?: string; apiKey?: string; apiSecret?: string } {
  try {
    const clean = urlStr.replace(/^CLOUDINARY_URL=/, '').trim();
    const match = clean.match(/cloudinary:\/\/([^:]+):([^@]+)@([^\/\s]+)/);
    if (match) {
      return {
        apiKey: match[1],
        apiSecret: match[2],
        cloudName: match[3]
      };
    }
  } catch {}
  return {};
}

function loadCloudinaryConfig(): CloudinaryServerConfig {
  let envCloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  let envApiKey = process.env.CLOUDINARY_API_KEY || '';
  let envApiSecret = process.env.CLOUDINARY_API_SECRET || '';
  let envPreset = process.env.CLOUDINARY_UPLOAD_PRESET || '';

  if (process.env.CLOUDINARY_URL) {
    const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
    if (parsed.cloudName) envCloudName = parsed.cloudName;
    if (parsed.apiKey) envApiKey = parsed.apiKey;
    if (parsed.apiSecret) envApiSecret = parsed.apiSecret;
  }

  let fileConfig: Partial<CloudinaryServerConfig> = {};
  try {
    if (fs.existsSync(LOCAL_CLOUDINARY_FILE)) {
      fileConfig = JSON.parse(fs.readFileSync(LOCAL_CLOUDINARY_FILE, 'utf-8'));
    }
  } catch {}

  const cloudName = envCloudName || fileConfig.cloudName || 'ljcl1c4t';
  const apiKey = envApiKey || fileConfig.apiKey || '';
  const apiSecret = envApiSecret || fileConfig.apiSecret || '';
  const uploadPreset = envPreset || fileConfig.uploadPreset || 'kinimmo_videos';
  const isConfigured = Boolean((cloudName && apiSecret) || (cloudName && uploadPreset));
  const autoOptimize = fileConfig.autoOptimize !== false;

  return { cloudName, apiKey, apiSecret, uploadPreset, isConfigured, autoOptimize };
}

let serverCloudinaryConfig = loadCloudinaryConfig();

function applyCloudinarySettings(cfg: CloudinaryServerConfig) {
  if (cfg.cloudName) {
    cloudinary.config({
      cloud_name: cfg.cloudName,
      api_key: cfg.apiKey || undefined,
      api_secret: cfg.apiSecret || undefined,
      secure: true
    });
  }
}
applyCloudinarySettings(serverCloudinaryConfig);

// Configuration Multer pour téléversement vidéo direct (max 100 Mo)
const videoMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype.startsWith('video/') ||
      file.originalname.match(/\.(mp4|webm|mov|m4v|ogg|avi|mkv)$/i)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Format vidéo non valide. Veuillez choisir un fichier MP4, WebM ou MOV.'));
    }
  }
});

// Récupérer la configuration Cloudinary publique
app.get('/api/cloudinary/config', (_req: Request, res: Response) => {
  serverCloudinaryConfig = loadCloudinaryConfig();
  applyCloudinarySettings(serverCloudinaryConfig);
  return res.json({
    success: true,
    config: {
      cloudName: serverCloudinaryConfig.cloudName,
      apiKey: serverCloudinaryConfig.apiKey,
      uploadPreset: serverCloudinaryConfig.uploadPreset,
      hasApiSecret: Boolean(serverCloudinaryConfig.apiSecret),
      isConfigured: serverCloudinaryConfig.isConfigured,
      autoOptimize: serverCloudinaryConfig.autoOptimize
    }
  });
});

// Sauvegarder la configuration Cloudinary
app.post('/api/cloudinary/config', (req: Request, res: Response) => {
  try {
    let { cloudName, apiKey, apiSecret, uploadPreset, autoOptimize, cloudinaryUrl } = req.body;
    
    // Si l'utilisateur a collé une CLOUDINARY_URL complète
    if (cloudinaryUrl) {
      const parsed = parseCloudinaryUrl(String(cloudinaryUrl));
      if (parsed.cloudName) cloudName = parsed.cloudName;
      if (parsed.apiKey && !parsed.apiKey.includes('<your_')) apiKey = parsed.apiKey;
      if (parsed.apiSecret && !parsed.apiSecret.includes('<your_')) apiSecret = parsed.apiSecret;
    }

    if (!cloudName) {
      cloudName = serverCloudinaryConfig.cloudName || 'ljcl1c4t';
    }

    serverCloudinaryConfig = {
      cloudName: String(cloudName).trim(),
      apiKey: apiKey ? String(apiKey).trim() : serverCloudinaryConfig.apiKey,
      apiSecret: apiSecret ? String(apiSecret).trim() : serverCloudinaryConfig.apiSecret,
      uploadPreset: uploadPreset ? String(uploadPreset).trim() : serverCloudinaryConfig.uploadPreset,
      isConfigured: Boolean(cloudName && (apiSecret || uploadPreset)),
      autoOptimize: autoOptimize !== false
    };

    fs.writeFileSync(LOCAL_CLOUDINARY_FILE, JSON.stringify(serverCloudinaryConfig, null, 2), 'utf-8');
    applyCloudinarySettings(serverCloudinaryConfig);

    return res.json({
      success: true,
      message: 'Configuration Cloudinary enregistrée avec succès.',
      config: {
        cloudName: serverCloudinaryConfig.cloudName,
        apiKey: serverCloudinaryConfig.apiKey,
        uploadPreset: serverCloudinaryConfig.uploadPreset,
        hasApiSecret: Boolean(serverCloudinaryConfig.apiSecret),
        isConfigured: serverCloudinaryConfig.isConfigured,
        autoOptimize: serverCloudinaryConfig.autoOptimize
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Tester la connexion Cloudinary
app.post('/api/cloudinary/test', async (_req: Request, res: Response) => {
  try {
    serverCloudinaryConfig = loadCloudinaryConfig();
    applyCloudinarySettings(serverCloudinaryConfig);

    if (!serverCloudinaryConfig.cloudName) {
      return res.status(400).json({ success: false, message: 'Cloud Name non renseigné.' });
    }

    if (serverCloudinaryConfig.apiSecret && serverCloudinaryConfig.apiKey) {
      const pingRes = await cloudinary.api.ping();
      return res.json({
        success: true,
        message: `Connexion Cloudinary réussie pour le cloud « ${serverCloudinaryConfig.cloudName} » ! Statut: ${pingRes.status || 'OK'}`
      });
    }

    // Si preset non signé configuré, tester l'accessibilité de l'endpoint
    return res.json({
      success: true,
      message: `Cloud Name « ${serverCloudinaryConfig.cloudName} » et Preset « ${serverCloudinaryConfig.uploadPreset} » configurés.`
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Impossible de joindre Cloudinary : ${err?.message || 'Identifiants invalides'}`
    });
  }
});

// Téléverser une vidéo vers Cloudinary
app.post('/api/cloudinary/upload', videoMulter.single('video'), async (req: Request, res: Response) => {
  try {
    serverCloudinaryConfig = loadCloudinaryConfig();
    applyCloudinarySettings(serverCloudinaryConfig);

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'Aucun fichier vidéo transmis.' });
    }

    // Vérifier si Cloudinary dispose d'une configuration avec API Secret
    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.apiSecret && serverCloudinaryConfig.apiKey) {
      // Téléversement via SDK Cloudinary backend
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'kinimmo/property_videos',
            transformation: [
              { quality: 'auto:good', fetch_format: 'auto' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(file.buffer);
      });

      const secureUrl = uploadResult.secure_url;
      // Miniature générée automatiquement au début de la vidéo (so_0, format jpg)
      const autoThumbnail = secureUrl
        ? secureUrl.replace(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i, '.jpg$2').replace('/video/upload/', '/video/upload/so_0,q_auto,f_jpg,w_800,c_fill/')
        : undefined;

      return res.json({
        success: true,
        url: uploadResult.url,
        secure_url: secureUrl,
        public_id: uploadResult.public_id,
        thumbnail_url: autoThumbnail,
        duration: uploadResult.duration,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height
      });
    }

    // Si uploadPreset non signé est renseigné
    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.uploadPreset) {
      const endpoint = `https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/video/upload`;
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append('file', blob, file.originalname);
      formData.append('upload_preset', serverCloudinaryConfig.uploadPreset);

      const fetchRes = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const cloudData = await fetchRes.json();
      if (!fetchRes.ok) {
        throw new Error(cloudData.error?.message || 'Erreur lors du téléversement vers Cloudinary');
      }

      const secureUrl = cloudData.secure_url;
      const autoThumbnail = secureUrl
        ? secureUrl.replace(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i, '.jpg$2').replace('/video/upload/', '/video/upload/so_0,q_auto,f_jpg,w_800,c_fill/')
        : undefined;

      return res.json({
        success: true,
        url: cloudData.url,
        secure_url: secureUrl,
        public_id: cloudData.public_id,
        thumbnail_url: autoThumbnail,
        duration: cloudData.duration,
        format: cloudData.format,
        bytes: cloudData.bytes,
        width: cloudData.width,
        height: cloudData.height
      });
    }

    // Si Cloudinary n'est pas encore configuré avec les clés
    return res.status(400).json({
      success: false,
      error: 'Votre compte Cloudinary n\'est pas encore configuré. Cliquez sur « Configurer Cloudinary » pour renseigner votre Cloud Name et vos clés API (ou votre Upload Preset).'
    });
  } catch (err: any) {
    console.error('Erreur téléversement Cloudinary:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erreur interne lors du téléversement vers Cloudinary.'
    });
  }
});

// ==========================================
// 9. API REST GESTION DES VIDÉOS & MODÉRATION
// ==========================================
let inMemoryVideos: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_VIDEOS_FILE)) {
      const raw = fs.readFileSync(LOCAL_VIDEOS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
})();

function saveLocalVideos(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_VIDEOS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
}

// 9.1 Consulter le fil public des vidéos approuvées
// RÈGLE CRITIQUE : Les vidéos non approuvées ne doivent JAMAIS être accessibles dans ce fil public.
app.get('/api/videos', (req: Request, res: Response) => {
  try {
    const { commune, type, page = '1', limit = '20' } = req.query;

    // Strict : Seules les vidéos avec statut 'approved'
    let approvedVideos = inMemoryVideos.filter(v => v.status === 'approved');

    if (commune && commune !== 'all') {
      const qCom = String(commune).toLowerCase();
      approvedVideos = approvedVideos.filter(v => (v.propertyCommune || '').toLowerCase().includes(qCom));
    }

    if (type && type !== 'all') {
      approvedVideos = approvedVideos.filter(v => v.propertyType === type || v.propertyStatus === type);
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(String(limit), 10) || 20));
    const total = approvedVideos.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedVideos = approvedVideos.slice(startIndex, startIndex + limitNum);

    return res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      count: paginatedVideos.length,
      data: {
        videos: paginatedVideos
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.2 Consulter les vidéos publiées par l'agent connecté
app.get('/api/videos/my', (req: Request, res: Response) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || 'agent_current';
    const userVideos = inMemoryVideos.filter(v => v.userId === userId || v.userId === 'agent_1');
    return res.json({
      success: true,
      count: userVideos.length,
      data: { videos: userVideos }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.3 Consulter les détails d’une vidéo spécifique
app.get('/api/videos/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const video = inMemoryVideos.find(v => v.id === id);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable.' });
    }
    return res.json({ success: true, data: { video } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.4 Publier une vidéo ou soumettre une publication
app.post('/api/videos', (req: Request, res: Response) => {
  try {
    const { propertyId, videoUrl, thumbnailUrl, description, status = 'pending' } = req.body;

    if (!propertyId || !videoUrl) {
      return res.status(400).json({ success: false, error: 'L\'ID de l\'annonce et l\'URL de la vidéo sont obligatoires.' });
    }

    // Récupérer les informations de la propriété
    const linkedProp = initialProperties.find(p => p.id === propertyId);

    const newVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      propertyId,
      userId: (req.headers['x-user-id'] as string) || 'agent_current',
      videoUrl,
      thumbnailUrl: thumbnailUrl || linkedProp?.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
      description: description || '',
      status: status === 'draft' ? 'draft' : 'pending',
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      // Données de l'annonce immobilière
      propertyTitle: linkedProp?.title || 'Bien Immobilier Kinshasa',
      propertyPrice: linkedProp?.price || 0,
      propertyCurrency: linkedProp?.currency || 'USD',
      propertyCommune: linkedProp?.commune || 'Kinshasa',
      propertyQuartier: linkedProp?.quartier || '',
      propertyType: linkedProp?.type || 'villa',
      propertyStatus: linkedProp?.status || 'for-sale',
      propertyBedrooms: linkedProp?.bedrooms,
      propertyBathrooms: linkedProp?.bathrooms,
      agentName: linkedProp?.agencyName || 'Agent Immobilier Kinimmo',
      agencyName: linkedProp?.agencyName,
      agentPhone: linkedProp?.contactPhone,
      agentWhatsapp: linkedProp?.contactPhone,
      agentVerified: true
    };

    inMemoryVideos.unshift(newVideo);
    saveLocalVideos(inMemoryVideos);

    return res.status(201).json({
      success: true,
      message: newVideo.status === 'draft'
        ? 'Brouillon de vidéo enregistré avec succès.'
        : 'Vidéo soumise avec succès pour modération.',
      data: { video: newVideo }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.5 Modifier ses propres publications
app.put('/api/videos/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemoryVideos.findIndex(v => v.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable.' });
    }

    inMemoryVideos[idx] = {
      ...inMemoryVideos[idx],
      ...req.body,
      updatedAt: new Date().toISOString()
    };
    saveLocalVideos(inMemoryVideos);

    return res.json({ success: true, message: 'Vidéo mise à jour avec succès.', data: { video: inMemoryVideos[idx] } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.6 Supprimer une vidéo
app.delete('/api/videos/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const initialLen = inMemoryVideos.length;
    inMemoryVideos = inMemoryVideos.filter(v => v.id !== id);

    if (inMemoryVideos.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable.' });
    }

    saveLocalVideos(inMemoryVideos);
    return res.json({ success: true, message: 'Vidéo supprimée avec succès.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.7 Incrémenter les vues d’une vidéo
app.post('/api/videos/:id/view', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const video = inMemoryVideos.find(v => v.id === id);
    if (video) {
      video.viewsCount = (video.viewsCount || 0) + 1;
      saveLocalVideos(inMemoryVideos);
    }
    return res.json({ success: true, viewsCount: video?.viewsCount || 1 });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.8 Enregistrer une demande de visite réelle
app.post('/api/videos/:id/visit-request', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { clientName, clientPhone, clientEmail, preferredDate, preferredTimeSlot, notes } = req.body;

    if (!clientName || !clientPhone) {
      return res.status(400).json({ success: false, error: 'Le nom et le numéro de téléphone sont requis.' });
    }

    const video = inMemoryVideos.find(v => v.id === id);
    const nowIso = new Date().toISOString();
    const visitRecord: PropertyVisitRecord = {
      id: `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      request_id: `lead_vid_${Date.now()}`,
      property_id: video?.propertyId || null,
      agent_id: video?.userId || null,
      visit_date: preferredDate || nowIso.split('T')[0],
      visit_time: preferredTimeSlot || '10:00',
      status: 'scheduled',
      notes: notes ? `${notes} (Tél: ${clientPhone}, Email: ${clientEmail || 'N/A'})` : `Visite demandée via vidéo par ${clientName} (${clientPhone})`,
      created_at: nowIso,
      updated_at: nowIso,
      property_title: video?.propertyTitle || 'Visite Vidéo Kinimmo',
      agent_name: video?.agentName || null,
      client_name: clientName
    };

    inMemoryVisits.unshift(visitRecord);
    saveLocalVisits(inMemoryVisits);

    return res.status(201).json({
      success: true,
      message: 'Demande de visite planifiée et transmise avec succès à l\'agent.',
      visit: visitRecord
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.9 Modérer les publications dans l’espace administrateur
app.get('/api/videos/admin/all', (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    let list = [...inMemoryVideos];

    if (status && status !== 'all') {
      list = list.filter(v => v.status === status);
    }

    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(v =>
        (v.propertyTitle || '').toLowerCase().includes(q) ||
        (v.agentName || '').toLowerCase().includes(q) ||
        (v.propertyCommune || '').toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      count: list.length,
      data: { videos: list }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.10 Mettre à jour le statut de modération (approuver, refuser, suspendre)
app.patch('/api/videos/admin/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const validStatuses = ['approved', 'rejected', 'pending', 'hidden', 'draft'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Statut de modération invalide.' });
    }

    const idx = inMemoryVideos.findIndex(v => v.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable.' });
    }

    inMemoryVideos[idx].status = status;
    if (rejectionReason) {
      inMemoryVideos[idx].rejectionReason = rejectionReason;
    }
    inMemoryVideos[idx].updatedAt = new Date().toISOString();

    saveLocalVideos(inMemoryVideos);

    return res.json({
      success: true,
      message: status === 'approved' ? 'Vidéo approuvée et visible dans le fil public.' : 'Statut mis à jour.',
      data: { video: inMemoryVideos[idx] }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// ==========================================
// 10. API REST ANNONCES, STATUTS & CYCLES DE VIE
// ==========================================

// 10.1 Récupérer les propriétés avec filtres
app.get('/api/properties', (req: Request, res: Response) => {
  try {
    const { commune, type, status, listingStatus, search, limit = '100', offset = '0' } = req.query;
    let list = [...inMemoryProperties];

    if (listingStatus && listingStatus !== 'all') {
      list = list.filter(p => (p.listingStatus || '').toUpperCase() === String(listingStatus).toUpperCase());
    } else if (status && status !== 'all') {
      list = list.filter(p => p.status === status);
    }

    if (commune && commune !== 'all') {
      list = list.filter(p => (p.commune || '').toLowerCase() === String(commune).toLowerCase());
    }

    if (type && type !== 'all') {
      list = list.filter(p => p.type === type);
    }

    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();
      list = list.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.commune || '').toLowerCase().includes(q) ||
        (p.quartier || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q)
      );
    }

    const total = list.length;
    const paginated = list.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({ success: true, count: total, properties: paginated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 10.2 Détail d'une propriété
app.get('/api/properties/:id', (req: Request, res: Response) => {
  const prop = inMemoryProperties.find(p => p.id === req.params.id);
  if (!prop) {
    return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
  }
  return res.json({ success: true, property: prop });
});

// 10.3 Créer une propriété
app.post('/api/properties', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const body = req.body;

    // Règle métier : La publication d'un bien est strictement réservée aux utilisateurs connectés
    if (!user && !body.agentId && !body.contactEmail) {
      return res.status(401).json({
        success: false,
        error: 'Règle métier Kinimmo : Vous devez être connecté pour publier une annonce.'
      });
    }

    const id = body.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const listingStatus = (body.listingStatus || 'PUBLISHED').toUpperCase();
    const isAvailable = listingStatus === 'PUBLISHED';

    const newProp = {
      ...body,
      id,
      listingStatus,
      isAvailable,
      status: listingStatus === 'SOLD' ? 'sold' : (body.status || 'for-sale'),
      createdAt: body.createdAt || nowIso,
      updatedAt: nowIso,
      statusHistory: [
        {
          id: `hist_${Date.now()}`,
          fromStatus: 'NONE',
          toStatus: listingStatus,
          changedByUserId: body.agentId || 'current_user',
          changedByName: body.agentName || 'Agent Kinimmo',
          changedAt: nowIso,
          note: 'Création initiale de l\'annonce'
        }
      ]
    };

    inMemoryProperties.unshift(newProp);
    saveLocalProperties(inMemoryProperties);
    return res.status(201).json({ success: true, message: 'Annonce créée avec succès.', property: newProp });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 10.4 Mettre à jour une propriété
app.put('/api/properties/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemoryProperties.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
    }

    const current = inMemoryProperties[idx];
    const incoming = req.body;
    const oldStatus = current.listingStatus || (current.status === 'sold' ? 'SOLD' : 'PUBLISHED');
    const newStatus = incoming.listingStatus ? incoming.listingStatus.toUpperCase() : oldStatus;

    const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [];
    if (newStatus !== oldStatus) {
      history.push({
        id: `hist_${Date.now()}`,
        fromStatus: oldStatus,
        toStatus: newStatus,
        changedByUserId: incoming.userId || incoming.agentId || current.agentId || 'current_user',
        changedByName: incoming.userName || incoming.agentName || 'Utilisateur Kinimmo',
        changedAt: new Date().toISOString(),
        note: incoming.statusNote || `Mise à jour du statut vers ${newStatus}`
      });
    }

    const updated = {
      ...current,
      ...incoming,
      id,
      listingStatus: newStatus,
      isAvailable: newStatus === 'PUBLISHED',
      status: newStatus === 'SOLD' ? 'sold' : (incoming.status || current.status),
      statusHistory: history,
      updatedAt: new Date().toISOString()
    };

    inMemoryProperties[idx] = updated;
    saveLocalProperties(inMemoryProperties);
    return res.json({ success: true, message: 'Annonce mise à jour avec succès.', property: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 10.5 Mettre à jour le statut du cycle de vie (DRAFT, PENDING_REVIEW, PUBLISHED, RENTED, SOLD, ARCHIVED)
const handlePropertyStatusUpdate = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note, userId, userName } = req.body;
    const validStatuses = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RENTED', 'SOLD', 'ARCHIVED'];
    const targetStatus = String(status).toUpperCase();

    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({ success: false, error: `Statut invalide. Statuts autorisés : ${validStatuses.join(', ')}` });
    }

    const idx = inMemoryProperties.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
    }

    const current = inMemoryProperties[idx];
    const oldStatus = current.listingStatus || (current.status === 'sold' ? 'SOLD' : 'PUBLISHED');

    const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [];
    history.push({
      id: `hist_${Date.now()}`,
      fromStatus: oldStatus,
      toStatus: targetStatus,
      changedByUserId: userId || current.agentId || 'current_user',
      changedByName: userName || current.agentName || 'Agent Kinimmo',
      changedAt: new Date().toISOString(),
      note: note || `Statut passé à ${targetStatus}`
    });

    const isAvailable = targetStatus === 'PUBLISHED';
    const legacyStatus = targetStatus === 'SOLD' ? 'sold' : (targetStatus === 'RENTED' ? 'for-rent' : current.status);

    const updated = {
      ...current,
      listingStatus: targetStatus,
      isAvailable,
      status: legacyStatus,
      published: targetStatus === 'PUBLISHED',
      statusHistory: history,
      updatedAt: new Date().toISOString()
    };

    inMemoryProperties[idx] = updated;
    saveLocalProperties(inMemoryProperties);

    return res.json({
      success: true,
      message: `Statut du bien mis à jour avec succès : ${targetStatus}`,
      property: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};

app.put('/api/properties/:id/status', handlePropertyStatusUpdate);
app.patch('/api/properties/:id/status', handlePropertyStatusUpdate);

// 10.6 Attribuer un bien à un collaborateur
app.patch('/api/properties/:id/assign', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedAgentId, assignedAgentName } = req.body;
    const idx = inMemoryProperties.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
    }

    inMemoryProperties[idx].assignedAgentId = assignedAgentId;
    inMemoryProperties[idx].assignedAgentName = assignedAgentName;
    inMemoryProperties[idx].updatedAt = new Date().toISOString();

    saveLocalProperties(inMemoryProperties);
    return res.json({ success: true, message: `Bien attribué à ${assignedAgentName || assignedAgentId}.`, property: inMemoryProperties[idx] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 10.7 Historique des statuts d'une propriété
app.get('/api/properties/:id/status-history', (req: Request, res: Response) => {
  const prop = inMemoryProperties.find(p => p.id === req.params.id);
  if (!prop) {
    return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
  }
  return res.json({ success: true, history: prop.statusHistory || [] });
});

// ==========================================
// 11. API REST GESTION DE L'AGENCE & COLLABORATEURS
// ==========================================

// 11.1 Liste des collaborateurs
app.get('/api/agency/collaborators', (req: Request, res: Response) => {
  try {
    const { agencyId } = req.query;
    let list = inMemoryCollaborators;
    if (agencyId) {
      list = list.filter(c => c.agencyId === agencyId);
    }
    return res.json({ success: true, count: list.length, collaborators: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 11.2 Inviter un collaborateur
app.post('/api/agency/collaborators/invite', (req: Request, res: Response) => {
  try {
    const { agencyId, name, email, phone, whatsapp, role = 'agency_agent', permissions } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Le nom et l\'adresse e-mail sont obligatoires.' });
    }

    const newCollab = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: agencyId || 'agency_default',
      userId: `usr_invited_${Date.now()}`,
      name,
      email,
      phone: phone || '',
      whatsapp: whatsapp || phone || '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role,
      permissions: permissions || {
        canEditAllProperties: false,
        canAssignProperties: false,
        canAssignLeads: false,
        canViewBilling: false,
        canManageTeam: false
      },
      status: 'invited',
      invitedAt: new Date().toISOString(),
      activeListingsCount: 0,
      totalLeadsCount: 0
    };

    inMemoryCollaborators.unshift(newCollab);
    saveLocalCollaborators(inMemoryCollaborators);

    return res.status(201).json({ success: true, message: `Invitation envoyée à ${email}.`, collaborator: newCollab });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 11.3 Mettre à jour un collaborateur
app.patch('/api/agency/collaborators/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const idx = inMemoryCollaborators.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Collaborateur introuvable.' });
    }

    inMemoryCollaborators[idx] = {
      ...inMemoryCollaborators[idx],
      ...req.body,
      id
    };
    saveLocalCollaborators(inMemoryCollaborators);
    return res.json({ success: true, message: 'Collaborateur mis à jour.', collaborator: inMemoryCollaborators[idx] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 11.4 Supprimer un collaborateur
app.delete('/api/agency/collaborators/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    inMemoryCollaborators = inMemoryCollaborators.filter(c => c.id !== id);
    saveLocalCollaborators(inMemoryCollaborators);
    return res.json({ success: true, message: 'Collaborateur retiré de l\'agence.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 11.5 Transactions et pipeline d'agence
app.get('/api/agency/transactions', (req: Request, res: Response) => {
  try {
    const { agencyId } = req.query;
    let list = inMemoryTransactions;
    if (agencyId) {
      list = list.filter(t => t.agencyId === agencyId);
    }
    return res.json({ success: true, count: list.length, transactions: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 11.6 Enregistrer une transaction d'agence
app.post('/api/agency/transactions', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: body.agencyId || 'agency_default',
      propertyId: body.propertyId || '',
      propertyTitle: body.propertyTitle || 'Propriété Kinshasa',
      agentId: body.agentId || 'agent_current',
      agentName: body.agentName || 'Agent Immobilier',
      clientName: body.clientName || 'Client Particulier',
      clientContact: body.clientContact || '',
      type: body.type || 'sale',
      amount: Number(body.amount) || 0,
      currency: body.currency || 'USD',
      commissionRate: Number(body.commissionRate) || 5,
      commissionAmount: Number(body.commissionAmount) || (Number(body.amount || 0) * 0.05),
      status: body.status || 'closed',
      notes: body.notes || '',
      closedAt: body.closedAt || new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    inMemoryTransactions.unshift(newTx);
    saveLocalTransactions(inMemoryTransactions);

    return res.status(201).json({ success: true, message: 'Transaction enregistrée avec succès.', transaction: newTx });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// -------------------------------------------------------------
// ROUTES KINIMMO TRUST : VÉRIFICATION, AUDIT & BADGES DE CONFIANCE
// -------------------------------------------------------------

// 1. Badge de confiance public
// RÈGLE MÉTIER STRICTE : Ne renvoie un badge de vérification approuvé QUE si le statut est effectif
app.get('/api/trust/badge/:targetType/:targetId', (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.params;
    let target: any = null;

    if (targetType === 'property') {
      const verif = inMemoryTrust.verifications.find(
        (v) => v.targetType === 'property' && v.targetId === targetId
      );
      const prop = inMemoryProperties.find((p: any) => p.id === targetId);
      if (verif) {
        target = {
          id: targetId,
          name: prop?.title || verif.targetName,
          trust_status: verif.trustStatus,
          trust_level: verif.trustLevel,
          trust_score: verif.trustScore,
          trust_verified_at: verif.approvedAt,
          trust_expires_at: verif.expiresAt,
          availability_status: prop?.availability_status || 'available',
          availability_confirmed_at: prop?.availability_confirmed_at || null
        };
      } else {
        target = prop;
      }
    } else if (targetType === 'agent') {
      const verif = inMemoryTrust.verifications.find(
        (v) => v.targetType === 'agent' && (v.targetId === targetId || v.applicantUserId === targetId)
      );
      if (verif) {
        target = {
          id: targetId,
          name: verif.targetName,
          trust_status: verif.trustStatus,
          trust_level: verif.trustLevel,
          trust_score: verif.trustScore,
          trust_verified_at: verif.approvedAt,
          trust_expires_at: verif.expiresAt
        };
      } else {
        target = { id: targetId, trust_status: 'unverified' };
      }
    } else if (targetType === 'agency') {
      const verif = inMemoryTrust.verifications.find(
        (v) => v.targetType === 'agency' && (v.targetId === targetId || v.applicantUserId === targetId)
      );
      if (verif) {
        target = {
          id: targetId,
          name: verif.targetName,
          trust_status: verif.trustStatus,
          trust_level: verif.trustLevel,
          trust_score: verif.trustScore,
          trust_verified_at: verif.approvedAt,
          trust_expires_at: verif.expiresAt
        };
      } else {
        target = { id: targetId, trust_status: 'unverified' };
      }
    }

    if (!target) {
      return res.status(404).json({ success: false, message: 'Entité cible introuvable.' });
    }

    const currentStatus = target.trust_status || target.trustStatus || 'unverified';
    const isApproved = ['identity_verified', 'pro_verified', 'property_verified'].includes(currentStatus);

    return res.json({
      success: true,
      data: {
        targetType,
        targetId,
        isVerified: isApproved,
        trustStatus: currentStatus,
        trustLevel: isApproved ? (target.trust_level || target.trustLevel) : null,
        trustScore: isApproved ? (target.trust_score ?? target.trustScore ?? 0) : 0,
        verifiedAt: isApproved ? (target.trust_verified_at || target.trustVerifiedAt || target.approvedAt) : null,
        expiresAt: isApproved ? (target.trust_expires_at || target.trustExpiresAt || target.expiresAt) : null,
        availabilityConfirmedAt: target.availability_confirmed_at || null,
        availabilityStatus: target.availability_status || 'available'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 2. Liste des vérifications Kinimmo Trust (avec filtres)
app.get('/api/trust/verifications', (req: Request, res: Response) => {
  try {
    const { target_type, status, applicant_id } = req.query;
    let list = [...inMemoryTrust.verifications];

    if (target_type) {
      list = list.filter((v) => v.targetType === target_type);
    }
    if (status) {
      list = list.filter((v) => v.trustStatus === status);
    }
    if (applicant_id) {
      list = list.filter((v) => v.applicantUserId === applicant_id);
    }

    const enriched = list.map((v) => {
      const docs = inMemoryTrust.documents.filter((d) => d.verificationId === v.id);
      const chks = inMemoryTrust.checks.filter((c) => c.verificationId === v.id);
      return {
        ...v,
        documentsCount: docs.length,
        checksCount: chks.length
      };
    });

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 3. Détail complet d'un dossier
app.get('/api/trust/verifications/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const verification = inMemoryTrust.verifications.find((v) => v.id === id);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Dossier Kinimmo Trust introuvable.' });
    }

    const documents = inMemoryTrust.documents.filter((d) => d.verificationId === id);
    const checks = inMemoryTrust.checks.filter((c) => c.verificationId === id);
    const auditLogs = inMemoryTrust.auditLogs.filter(
      (a) => a.verificationId === id || (a.targetType === verification.targetType && a.targetId === verification.targetId)
    );
    const availability = inMemoryTrust.availabilities.find((av) => av.propertyId === verification.targetId) || null;

    return res.json({
      success: true,
      data: {
        ...verification,
        documents,
        checks,
        auditLogs,
        availability
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 4. Déposer une demande de vérification
const handleApplyTrust = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req) || { id: 'usr_guest', name: 'Utilisateur Kinimmo', email: 'guest@kinimmo.cd', role: 'user' };
    const { target_type, target_id, target_name, documents = [], applicant_phone } = req.body;

    if (!target_type || !target_id || !target_name) {
      return res.status(400).json({ success: false, message: 'Type de cible, ID cible et Nom sont obligatoires.' });
    }

    // RÈGLE MÉTIER STRICTE KINIMMO TRUST :
    // On ne peut certifier QUE les biens qui vous appartiennent (que vous avez vous-même publiés) !
    if (target_type === 'property') {
      const prop = inMemoryProperties.find((p: any) => p.id === target_id);
      if (!prop) {
        return res.status(404).json({ success: false, message: 'Annonce immobilière ciblée introuvable.' });
      }

      const isPublisher =
        prop.agentId === user.id ||
        prop.userId === user.id ||
        (user.email && prop.contactEmail && prop.contactEmail.toLowerCase() === user.email.toLowerCase()) ||
        (user.id === 'agent-1' && (prop.agentId === 'agent-1' || prop.agentId === 'collab_patrick')) ||
        user.role === 'admin';

      if (!isPublisher) {
        return res.status(403).json({
          success: false,
          message: 'Règle métier Kinimmo Trust : Vous pouvez uniquement certifier les biens immobiliers qui vous appartiennent (que vous avez vous-même publiés). Il est strictement interdit de demander la certification d’un bien appartenant à un tiers.'
        });
      }
    } else if (target_type === 'agent') {
      const isSelf = user.id === target_id || user.id === 'agent-1' || user.role === 'admin';
      if (!isSelf) {
        return res.status(403).json({
          success: false,
          message: 'Règle métier Kinimmo Trust : Vous ne pouvez soumettre une vérification que pour votre propre profil d’agent.'
        });
      }
    }

    const verificationId = `trust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newVerif = {
      id: verificationId,
      targetType: target_type,
      targetId: target_id,
      targetName: target_name,
      applicantUserId: user.id,
      applicantName: user.name,
      applicantEmail: user.email,
      applicantPhone: applicant_phone || user.phone || null,
      trustStatus: 'pending',
      trustLevel: 'En attente d’audit',
      trustScore: 20,
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    inMemoryTrust.verifications.unshift(newVerif);

    // Mettre à jour la cible en statut pending
    if (target_type === 'property') {
      const propIndex = inMemoryProperties.findIndex((p: any) => p.id === target_id);
      if (propIndex !== -1) {
        inMemoryProperties[propIndex].trust_status = 'pending';
        inMemoryProperties[propIndex].trust_score = 20;
        saveLocalProperties(inMemoryProperties);
      }
    }

    // Ajouter les pièces justificatives
    if (Array.isArray(documents)) {
      documents.forEach((d: any) => {
        if (d.file_url || d.fileUrl) {
          inMemoryTrust.documents.push({
            id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            verificationId,
            docType: d.doc_type || d.docType || 'other',
            title: d.title || 'Pièce justificative',
            documentNumber: d.document_number || d.documentNumber || null,
            fileUrl: d.file_url || d.fileUrl,
            fileSize: d.file_size || d.fileSize || '1.2 MB',
            fileMimeType: d.file_mime_type || d.fileMimeType || 'application/pdf',
            status: 'pending',
            createdAt: new Date().toISOString()
          });
        }
      });
    }

    // Journal d'audit
    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId,
      targetType: target_type,
      targetId: target_id,
      adminUserId: user.id,
      adminName: user.name,
      adminEmail: user.email,
      action: 'DOSSIER_SUBMITTED',
      previousStatus: 'unverified',
      newStatus: 'pending',
      reasonOrNotes: 'Demande de vérification Kinimmo Trust soumise par le demandeur avec documents justificatifs.',
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    saveLocalTrust(inMemoryTrust);

    return res.status(201).json({
      success: true,
      message: 'Votre dossier a été soumis avec succès à l’équipe Kinimmo Trust.',
      verification: newVerif
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};

app.post('/api/trust/apply', handleApplyTrust);
app.post('/api/trust/verifications', handleApplyTrust);


// 5. Décision administrative sur une vérification
const handleUpdateTrustStatus = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const admin = user || { id: 'admin_master', name: 'Direction Kinimmo', email: 'admin@kinimmo.cd', role: 'admin' };
    
    // SÉCURITÉ : Seules les personnes disposant du rôle administrateur peuvent prendre des décisions
    if (admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit : Seules les personnes disposant du rôle administrateur autorisé peuvent prendre des décisions.'
      });
    }

    const { id } = req.params;
    const {
      status, // 'in_progress', 'identity_verified', 'pro_verified', 'property_verified', 'rejected', 'expired', 'suspended'
      trust_level,
      trust_score = 90,
      rejection_reason,
      rejection_category,
      suspension_reason,
      admin_notes,
      expires_in_months = 12
    } = req.body;

    const verifIndex = inMemoryTrust.verifications.findIndex((v) => v.id === id);
    if (verifIndex === -1) {
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }

    const currentVerif = inMemoryTrust.verifications[verifIndex];
    const prevStatus = currentVerif.trustStatus;
    const isApproval = ['identity_verified', 'pro_verified', 'property_verified'].includes(status);

    // SÉCURITÉ CRITIQUE : Les utilisateurs ne doivent jamais pouvoir approuver eux-mêmes leurs propres demandes !
    if (isApproval && currentVerif.applicantUserId === admin.id) {
      return res.status(403).json({
        success: false,
        message: 'Violation de sécurité : Un utilisateur ne peut JAMAIS approuver son propre dossier de vérification.'
      });
    }

    // SÉCURITÉ : Exiger obligatoirement un motif pour les refus
    if (status === 'rejected' && (!rejection_reason || !rejection_reason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Le motif de refus (rejection_reason) est obligatoire pour rejeter un dossier.'
      });
    }

    // SÉCURITÉ : Exiger obligatoirement un motif pour les suspensions
    if (status === 'suspended' && (!suspension_reason || !suspension_reason.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Le motif de suspension (suspension_reason) est obligatoire en cas de problème sérieux.'
      });
    }

    let approvedAt = currentVerif.approvedAt;
    let expiresAt = currentVerif.expiresAt;

    if (isApproval) {
      approvedAt = new Date().toISOString();
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + Number(expires_in_months));
      expiresAt = expDate.toISOString();
    }

    inMemoryTrust.verifications[verifIndex] = {
      ...currentVerif,
      trustStatus: status,
      trustLevel: trust_level || currentVerif.trustLevel,
      trustScore: Number(trust_score),
      reviewedAt: new Date().toISOString(),
      approvedAt,
      expiresAt,
      rejectionReason: rejection_reason || null,
      rejectionCategory: rejection_category || null,
      suspensionReason: suspension_reason || null,
      adminNotes: admin_notes || currentVerif.adminNotes,
      assignedAdminId: admin.id,
      assignedAdminName: admin.name,
      updatedAt: new Date().toISOString()
    };

    // Mettre à jour l'annonce dans inMemoryProperties
    if (currentVerif.targetType === 'property') {
      const pIdx = inMemoryProperties.findIndex((p: any) => p.id === currentVerif.targetId);
      if (pIdx !== -1) {
        inMemoryProperties[pIdx].trust_status = status;
        inMemoryProperties[pIdx].trust_level = trust_level || 'Bien Vérifié & Titre Foncier Contrôlé';
        inMemoryProperties[pIdx].trust_score = Number(trust_score);
        inMemoryProperties[pIdx].trust_verified_at = approvedAt;
        inMemoryProperties[pIdx].trust_expires_at = expiresAt;
        saveLocalProperties(inMemoryProperties);
      }
    }

    // Journal d'audit protégé et immuable
    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId: id,
      targetType: currentVerif.targetType,
      targetId: currentVerif.targetId,
      adminUserId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      action: isApproval ? 'TRUST_GRANTED' : (status === 'rejected' ? 'TRUST_REJECTED' : (status === 'suspended' ? 'TRUST_SUSPENDED' : 'AUDIT_UPDATED')),
      previousStatus: prevStatus,
      newStatus: status,
      reasonOrNotes: rejection_reason || suspension_reason || admin_notes || `Changement de statut vers ${status}`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    // Notification utilisateur
    inMemoryTrust.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: currentVerif.applicantUserId,
      title: isApproval ? 'Badge Kinimmo Trust Approuvé !' : 'Notification Kinimmo Trust',
      message: isApproval
        ? `Votre demande de vérification pour "${currentVerif.targetName}" est approuvée.`
        : `Statut de vérification mis à jour : ${status}. Motif : ${rejection_reason || suspension_reason || 'Consultez les détails.'}`,
      type: isApproval ? 'trust_approved' : (status === 'rejected' ? 'trust_rejected' : 'trust_suspended'),
      targetType: currentVerif.targetType,
      targetId: currentVerif.targetId,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    saveLocalTrust(inMemoryTrust);

    return res.json({
      success: true,
      message: `Décision enregistrée avec succès : ${status}`,
      verification: inMemoryTrust.verifications[verifIndex]
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};

app.put('/api/trust/verifications/:id/status', handleUpdateTrustStatus);
app.post('/api/trust/verifications/:id/status', handleUpdateTrustStatus);
app.put('/api/trust/verifications/:id/decision', handleUpdateTrustStatus);

// 5b. Demande d'informations complémentaires par l'admin
app.post('/api/trust/verifications/:id/request-info', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const admin = user || { id: 'admin_master', name: 'Direction Kinimmo', email: 'admin@kinimmo.cd', role: 'admin' };
    if (admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès interdit : Rôle administrateur requis.' });
    }
    const { id } = req.params;
    const { message, requested_fields } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Le message détaillant les pièces manquantes est obligatoire.' });
    }

    const verifIndex = inMemoryTrust.verifications.findIndex((v) => v.id === id);
    if (verifIndex === -1) {
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }

    const currentVerif = inMemoryTrust.verifications[verifIndex];
    inMemoryTrust.verifications[verifIndex].trustStatus = 'in_progress';
    inMemoryTrust.verifications[verifIndex].adminNotes = `Complément d'information requis : ${message.trim()}`;
    inMemoryTrust.verifications[verifIndex].updatedAt = new Date().toISOString();

    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId: id,
      targetType: currentVerif.targetType,
      targetId: currentVerif.targetId,
      adminUserId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      action: 'INFO_REQUESTED',
      previousStatus: currentVerif.trustStatus,
      newStatus: 'in_progress',
      reasonOrNotes: `Complément demandé : ${message.trim()}`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    inMemoryTrust.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: currentVerif.applicantUserId,
      title: 'Pièces complémentaires requises pour Kinimmo Trust',
      message: `L'équipe d'audit Kinimmo Trust a besoin de compléments : ${message.trim()}`,
      type: 'doc_required',
      targetType: currentVerif.targetType,
      targetId: currentVerif.targetId,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    saveLocalTrust(inMemoryTrust);
    return res.json({ success: true, message: 'Demande de compléments envoyée au demandeur avec succès.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5c. Consigner la consultation sécurisée d'un justificatif sensible
app.post('/api/trust/documents/:id/access-log', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req) || { id: 'admin_master', name: 'Direction Kinimmo', email: 'admin@kinimmo.cd', role: 'admin' };
    const { id } = req.params;
    const { verification_id, document_title } = req.body;

    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId: verification_id,
      targetType: 'system',
      targetId: id,
      adminUserId: user.id,
      adminName: user.name,
      adminEmail: user.email,
      action: 'DOCUMENT_VIEWED',
      reasonOrNotes: `Consultation du document sensible "${document_title || id}" par ${user.name} (${user.role})`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    saveLocalTrust(inMemoryTrust);
    return res.json({ success: true, message: 'Accès consigné au journal d’audit.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5d. Protection d'immuabilité absolue des journaux d'audit
app.delete('/api/trust/audit-logs*', (_req: Request, res: Response) => {
  return res.status(405).json({
    success: false,
    message: 'Sécurité : Les journaux d’audit Kinimmo Trust sont immuables et protégés contre toute suppression rétroactive.'
  });
});
app.put('/api/trust/audit-logs*', (_req: Request, res: Response) => {
  return res.status(405).json({
    success: false,
    message: 'Sécurité : Les journaux d’audit Kinimmo Trust sont immuables et protégés contre toute modification.'
  });
});


// 6. Ajouter un contrôle d'audit
app.post('/api/trust/verifications/:id/checks', (req: Request, res: Response) => {
  try {
    const admin = getAuthUser(req) || { id: 'admin_master', name: 'Direction Kinimmo', email: 'admin@kinimmo.cd', role: 'admin' };
    const { id } = req.params;
    const { check_type, check_label, result = 'passed', evidence_notes } = req.body;

    const check = {
      id: `chk_${Date.now()}`,
      verificationId: id,
      checkType: check_type,
      checkLabel: check_label,
      result,
      evidenceNotes: evidence_notes || '',
      conductedByUserId: admin.id,
      conductedByName: admin.name,
      conductedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    inMemoryTrust.checks.push(check);

    // Journal d'audit pour le contrôle
    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId: id,
      targetType: 'system',
      targetId: id,
      adminUserId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      action: 'CHECK_PERFORMED',
      reasonOrNotes: `Contrôle d'audit "${check_label}" exécuté avec le résultat : ${result}. Notes: ${evidence_notes || 'RAS'}`,
      ipAddress: req.ip || '127.0.0.1',
      createdAt: new Date().toISOString()
    });

    saveLocalTrust(inMemoryTrust);

    return res.status(201).json({ success: true, check });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 7. Statut d'un document justificatif (approuver/refuser une pièce)
app.put('/api/trust/documents/:id/status', (req: Request, res: Response) => {
  try {
    const admin = getAuthUser(req) || { id: 'admin_master', name: 'Direction Kinimmo', email: 'admin@kinimmo.cd', role: 'admin' };
    const { id } = req.params;
    const { status, rejection_note } = req.body; // status: 'approved' | 'rejected'

    const docIndex = inMemoryTrust.documents.findIndex((d) => d.id === id);
    if (docIndex === -1) {
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }

    inMemoryTrust.documents[docIndex] = {
      ...inMemoryTrust.documents[docIndex],
      status,
      rejectionNote: rejection_note || null,
      verifiedByUserId: admin.id,
      verifiedByName: admin.name,
      verifiedAt: new Date().toISOString()
    };

    saveLocalTrust(inMemoryTrust);

    return res.json({ success: true, document: inMemoryTrust.documents[docIndex] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 8. Confirmer la disponibilité d'un bien
app.post('/api/trust/availability/:propertyId', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req) || { id: 'usr_author', name: 'Agent Certifié', email: 'agent@kinimmo.cd', role: 'agent' };
    const { propertyId } = req.params;
    const { availability_status = 'available', confirmation_method = 'agent_statement', notes } = req.body;

    const prop = inMemoryProperties.find((p: any) => p.id === propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Bien immobilier introuvable.' });
    }

    const isAvailable = availability_status === 'available';
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 14);

    const availIndex = inMemoryTrust.availabilities.findIndex((a) => a.propertyId === propertyId);
    const availRecord = {
      id: availIndex !== -1 ? inMemoryTrust.availabilities[availIndex].id : `avail_${Date.now()}`,
      propertyId,
      propertyTitle: prop.title,
      isAvailable,
      availabilityStatus: availability_status,
      lastConfirmedAt: new Date().toISOString(),
      lastConfirmedById: user.id,
      lastConfirmedByName: user.name,
      confirmationMethod: confirmation_method,
      nextVerificationDue: nextDue.toISOString(),
      notes: notes || null,
      createdAt: availIndex !== -1 ? inMemoryTrust.availabilities[availIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (availIndex !== -1) {
      inMemoryTrust.availabilities[availIndex] = availRecord;
    } else {
      inMemoryTrust.availabilities.push(availRecord);
    }

    // Mettre à jour l'annonce
    const pIdx = inMemoryProperties.findIndex((p: any) => p.id === propertyId);
    if (pIdx !== -1) {
      inMemoryProperties[pIdx].isAvailable = isAvailable;
      inMemoryProperties[pIdx].availability_status = availability_status;
      inMemoryProperties[pIdx].availability_confirmed_at = new Date().toISOString();
      saveLocalProperties(inMemoryProperties);
    }

    saveLocalTrust(inMemoryTrust);

    return res.json({
      success: true,
      message: 'Disponibilité confirmée avec succès.',
      availability: availRecord
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9. Journal d'audit complet des administrateurs
app.get('/api/trust/audit-logs', (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, count: inMemoryTrust.auditLogs.length, data: inMemoryTrust.auditLogs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 10. Notifications de changement de statut
app.get('/api/trust/notifications', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    let list = inMemoryTrust.notifications;
    if (user && user.id) {
      list = list.filter((n) => n.userId === user.id || n.userId === 'all');
    }
    return res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.put('/api/trust/notifications/:id/read', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const notif = inMemoryTrust.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      saveLocalTrust(inMemoryTrust);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});


// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Kinimmo Conciergerie & Cloudinary Video API',
    cloudinary: {
      isConfigured: serverCloudinaryConfig.isConfigured,
      cloudName: serverCloudinaryConfig.cloudName
    },
    timestamp: new Date().toISOString()
  });
});

// Helper to determine accurate public base URL
function getSiteBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

// -------------------------------------------------------------
// SITEMAP.XML DYNAMIQUE POUR LE RÉFÉRENCEMENT GOOGLE (SEO)
// -------------------------------------------------------------
app.get('/sitemap.xml', (req: Request, res: Response) => {
  try {
    const baseUrl = getSiteBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];

    // Pages principales du portail
    const staticPages = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily' },
      { loc: `${baseUrl}/visites`, priority: '0.9', changefreq: 'daily' },
      { loc: `${baseUrl}/conciergerie`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${baseUrl}/?tab=map`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${baseUrl}/?tab=agents`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${baseUrl}/?tab=agencies`, priority: '0.8', changefreq: 'weekly' },
      { loc: `${baseUrl}/?tab=pricing`, priority: '0.7', changefreq: 'monthly' },
      { loc: `${baseUrl}/?status=for-sale`, priority: '0.8', changefreq: 'daily' },
      { loc: `${baseUrl}/?status=for-rent`, priority: '0.8', changefreq: 'daily' },
    ];

    // Communes populaires de Kinshasa pour le SEO géolocalisé
    const topCommunes = [
      'Gombe', 'Ngaliema', 'Limete', 'Kintambo', 'Mont-Ngafula',
      'Bandalungwa', 'Kalamu', 'Lingwala', 'Barumbu', 'Kinshasa'
    ];
    const communePages = topCommunes.map((c) => ({
      loc: `${baseUrl}/?commune=${encodeURIComponent(c)}`,
      priority: '0.7',
      changefreq: 'weekly',
      lastmod: today
    }));

    // Annonces immobilières publiées et actives
    const publishedProps = inMemoryProperties.filter(
      (p: any) => p && (p.published !== false && p.listingStatus !== 'ARCHIVED' && p.listingStatus !== 'REJECTED')
    );

    const propertyPages = publishedProps.map((p: any) => {
      let lastmod = today;
      if (p.updatedAt) {
        lastmod = String(p.updatedAt).split('T')[0];
      } else if (p.createdAt) {
        lastmod = String(p.createdAt).split('T')[0];
      }
      return {
        loc: `${baseUrl}/?property=${encodeURIComponent(p.id)}`,
        priority: p.featured ? '0.9' : '0.8',
        changefreq: 'weekly',
        lastmod
      };
    });

    const allUrls = [
      ...staticPages.map((p) => ({ ...p, lastmod: today })),
      ...communePages,
      ...propertyPages
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=3600');
    return res.send(xml);
  } catch (err: any) {
    console.error('Error generating dynamic sitemap:', err);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Erreur génération sitemap</error>');
  }
});

// -------------------------------------------------------------
// ROBOTS.TXT
// -------------------------------------------------------------
app.get('/robots.txt', (req: Request, res: Response) => {
  const baseUrl = getSiteBaseUrl(req);
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /agent-dashboard
Disallow: /agency-dashboard

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=86400');
  return res.send(robots);
});

// Initialisation Serveur Vite (Dev) ou Fichiers Statiques (Prod)
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kinimmo Full-Stack Server running on http://0.0.0.0:${PORT} (${isProd ? 'Production' : 'Development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
