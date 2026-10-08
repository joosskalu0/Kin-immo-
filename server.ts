import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
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

let inMemoryPlans: any[] = loadLocalPlans();
let inMemoryOptions: any[] = loadLocalOptions();
let inMemoryPaymentMethods: any[] = INITIAL_PAYMENT_METHODS;
let inMemoryInvoices: any[] = INITIAL_INVOICES;

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

    // Sauvegarde dans Firestore : collections 'concierge_requests' ET 'conciergerieRequests'
    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'concierge_requests', id), newRequest);
      await setDoc(doc(db, 'conciergerieRequests', id), newRequest);
    } catch (firestoreErr) {
      console.warn('Note: Sauvegarde Firestore différée (stocké localement avec succès):', firestoreErr);
    }

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
    let list: ConciergerieRequest[] = inMemoryRequests;

    // Essayer de lire depuis Firestore
    try {
      const { db } = await import('./src/lib/firebase');
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const q = query(collection(db, 'concierge_requests'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreList: ConciergerieRequest[] = [];
        snapshot.forEach((d) => firestoreList.push(d.data() as ConciergerieRequest));
        list = firestoreList;
      }
    } catch {}

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

    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      const updatePayload = {
        ...body,
        status: reqItem.status,
        updated_at: nowIso,
        updatedAt: nowIso
      };
      await updateDoc(doc(db, 'concierge_requests', id), updatePayload);
      await updateDoc(doc(db, 'conciergerieRequests', id), updatePayload);
    } catch {}

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

    // Essayer Firestore
    let list: PropertyVisitRecord[] = [];
    try {
      const { db } = await import('./src/lib/firebase');
      const { collection, getDocs, orderBy, query, where } = await import('firebase/firestore');
      const visitsCol = collection(db, 'property_visits');
      const q = request_id
        ? query(visitsCol, where('request_id', '==', String(request_id)))
        : query(visitsCol, orderBy('visit_date', 'desc'));

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        snapshot.forEach((d) => list.push(d.data() as PropertyVisitRecord));
      }
    } catch {}

    if (list.length === 0) {
      list = inMemoryVisits;
      if (request_id) {
        list = list.filter((v) => v.request_id === String(request_id));
      }
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

    // Sauvegarde Firestore
    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, setDoc, updateDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'property_visits', id), newVisit);
      if (targetRequest) {
        await updateDoc(doc(db, 'concierge_requests', request_id), { status: 'visit_scheduled', updated_at: nowIso });
      }
    } catch (e) {
      console.warn('Note: Sauvegarde visite Firestore différée:', e);
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

    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'property_visits', id), {
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(visit_date !== undefined ? { visit_date } : {}),
        ...(visit_time !== undefined ? { visit_time } : {}),
        ...(agent_id !== undefined ? { agent_id } : {}),
        ...(property_id !== undefined ? { property_id } : {}),
        updated_at: visit.updated_at
      });
    } catch {}

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

    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'property_visits', id));
    } catch {}

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

// 5i. Validation et approbation d'une facture par l'administrateur (PUT /api/billing/invoices/:id/approve)
app.put('/api/billing/invoices/:id/approve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }
    inv.status = 'paid';
    inv.updated_at = new Date().toISOString();
    return res.json({ success: true, message: 'Facture validée et service activé.', invoice: inv });
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Kinimmo Conciergerie API', timestamp: new Date().toISOString() });
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
