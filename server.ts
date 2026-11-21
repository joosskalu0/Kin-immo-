import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { validateConciergerieRequest } from './src/utils/conciergerieValidation';
import { findMatchingProperties } from './src/utils/propertyMatching';
import { initialProperties, initialCustomFields, initialAgencies, initialAgents, initialLeads } from './src/data/mockData';
import { ConciergerieRequest, PropertyVisitRecord, ConciergeRequestStatus } from './src/types/index';
import { analyzePropertyForFraud, auditPropertyList } from './src/utils/suspiciousListingDetector';
import {
  DEFAULT_BLOG_ARTICLES,
  DEFAULT_LEGAL_DOCUMENTS,
  DEFAULT_FAQ_ITEMS,
  resolveNeighborhoodBySlug,
  buildNeighborhoodDirectory,
  slugifyText,
} from './src/data/contentSeed';
import { getPropertySlug, resolvePropertyBySlugOrId } from './src/utils/shareUtils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? (isNaN(Number(process.env.PORT)) ? process.env.PORT : Number(process.env.PORT)) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// Parser JSON & URL-encoded (support des vidéos et photos haute définition)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir les fichiers téléversés et les images éditoriales OG
const devUploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(devUploadsDir)) {
  try { fs.mkdirSync(devUploadsDir, { recursive: true }); } catch {}
}
app.use('/uploads', express.static(devUploadsDir));
app.use('/og-images', express.static(path.join(__dirname, 'src/assets/images')));

// Fichier local de secours pour persistance robuste
const LOCAL_LEADS_FILE = path.join(__dirname, 'concierge_requests.json');
const LOCAL_LEADS_FILE_ALT = path.join(__dirname, 'conciergerie_requests.json');
const LOCAL_VISITS_FILE = path.join(__dirname, 'property_visits.json');
const LOCAL_ADS_FILE = path.join(__dirname, 'advertisements.json');
const LOCAL_SLIDES_FILE = path.join(__dirname, 'hero_slides.json');
const LOCAL_PLANS_FILE = path.join(__dirname, 'pricing_plans.json');
const LOCAL_OPTIONS_FILE = path.join(__dirname, 'visibility_options.json');
const LOCAL_PAYMENT_METHODS_FILE = path.join(__dirname, 'payment_methods_store.json');
const LOCAL_NOTIFICATIONS_FILE = path.join(__dirname, 'notifications.json');
const LOCAL_VIDEOS_FILE = path.join(__dirname, 'property_videos.json');
const LOCAL_CLOUDINARY_FILE = path.join(__dirname, 'cloudinary_config.json');
const LOCAL_PROPERTIES_FILE = path.join(__dirname, 'properties_store.json');
const LOCAL_COLLABORATORS_FILE = path.join(__dirname, 'agency_collaborators.json');
const LOCAL_TRANSACTIONS_FILE = path.join(__dirname, 'agency_transactions.json');
const LOCAL_TRUST_FILE = path.join(__dirname, 'trust_store.json');
const LOCAL_USERS_FILE = path.join(__dirname, 'users_store.json');
const LOCAL_CUSTOM_FIELDS_FILE = path.join(__dirname, 'custom_fields_store.json');
const LOCAL_SETTINGS_FILE = path.join(__dirname, 'site_settings_store.json');
const LOCAL_FAVORITES_FILE = path.join(__dirname, 'favorites_store.json');
const LOCAL_MESSAGES_FILE = path.join(__dirname, 'messages_store.json');
const LOCAL_ANALYTICS_FILE = path.join(__dirname, 'analytics_store.json');
const LOCAL_CRM_LEADS_FILE = path.join(__dirname, 'crm_leads_store.json');
const LOCAL_AGENCIES_FILE = path.join(__dirname, 'agencies_store.json');
const LOCAL_AGENTS_FILE = path.join(__dirname, 'agents_store.json');
const LOCAL_VIDEO_REPORTS_FILE = path.join(__dirname, 'video_reports_store.json');
const LOCAL_BLOG_ARTICLES_FILE = path.join(__dirname, 'blog_articles_store.json');
const LOCAL_LEGAL_DOCS_FILE = path.join(__dirname, 'legal_documents_store.json');

const INITIAL_PLANS = [
  {
    id: 'starter',
    name: 'Gratuit (Grand Public)',
    description: 'Idéal pour les propriétaires et particuliers souhaitant publier leurs biens sans aucun frais.',
    category: 'individual',
    audience: 'grand_public',
    badge: 'Gratuit',
    price_usd: 0.0,
    price_cdf: 0.0,
    priceMonthly: 0.0,
    priceMonthlyCDF: 0.0,
    price_yearly_usd: 0.0,
    priceYearly: 0.0,
    price_yearly_cdf: 0.0,
    priceYearlyCDF: 0.0,
    trial_days: 0,
    trialDays: 0,
    currency: 'USD',
    billing_period: 'monthly',
    billingPeriod: 'month',
    max_listings: 3,
    maxListings: 3,
    max_photos_per_listing: 6,
    maxPhotos: 6,
    max_videos: 1,
    maxVideos: 1,
    included_boosts: 0,
    includedBoosts: 0,
    max_featured_listings: 0,
    featuredListings: 0,
    max_team_members: 1,
    agentAccounts: 1,
    features: [
      'Jusqu\'à 3 annonces immobilières actives',
      'Jusqu\'à 6 photos HD par annonce',
      '1 vidéo de visite incluse',
      '0 boost inclus (boosts à la carte possibles)',
      '1 membre / compte titulaire'
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
    name: 'Agent Pro',
    description: 'Pour courtiers et propriétaires actifs à Kinshasa avec badge vérifié, boosts inclus et vidéos.',
    category: 'individual',
    audience: 'grand_public',
    badge: 'Populaire',
    price_usd: 29.0,
    price_cdf: 82650.0,
    priceMonthly: 29.0,
    priceMonthlyCDF: 82650.0,
    price_yearly_usd: 290.0,
    priceYearly: 290.0,
    price_yearly_cdf: 826500.0,
    priceYearlyCDF: 826500.0,
    trial_days: 7,
    trialDays: 7,
    currency: 'USD',
    billing_period: 'monthly',
    billingPeriod: 'month',
    max_listings: 25,
    maxListings: 25,
    max_photos_per_listing: 15,
    maxPhotos: 15,
    max_videos: 5,
    maxVideos: 5,
    included_boosts: 3,
    includedBoosts: 3,
    max_featured_listings: 3,
    featuredListings: 3,
    max_team_members: 1,
    agentAccounts: 1,
    features: [
      'Jusqu\'à 25 annonces actives',
      '15 photos HD par annonce & 5 vidéos immersives',
      '3 boosts inclus / mois',
      'Essai gratuit configurable (7 jours)',
      'Badge Officiel Vérifié Kinshasa & CRM Leads'
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
    name: 'Agence Immobilière',
    description: 'Visibilité maximale pour agences immobilières : équipe multi-agents, boosts inclus et vitrine certifiée.',
    category: 'agency',
    audience: 'agence',
    badge: 'Agence Agréée',
    price_usd: 79.0,
    price_cdf: 225150.0,
    priceMonthly: 79.0,
    priceMonthlyCDF: 225150.0,
    price_yearly_usd: 790.0,
    priceYearly: 790.0,
    price_yearly_cdf: 2251500.0,
    priceYearlyCDF: 2251500.0,
    trial_days: 14,
    trialDays: 14,
    currency: 'USD',
    billing_period: 'monthly',
    billingPeriod: 'month',
    max_listings: 100,
    maxListings: 100,
    max_photos_per_listing: 25,
    maxPhotos: 25,
    max_videos: 20,
    maxVideos: 20,
    included_boosts: 10,
    includedBoosts: 10,
    max_featured_listings: 10,
    featuredListings: 10,
    max_team_members: 10,
    agentAccounts: 10,
    features: [
      'Jusqu\'à 100 annonces actives',
      '25 photos HD par annonce & 20 vidéos immersives',
      '10 boosts inclus / mois',
      'Jusqu\'à 10 membres d\'équipe & comptes collaborateurs',
      'Essai gratuit configurable (14 jours) & Support prioritaire 7j/7'
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
    id: 'promoter_vip',
    name: 'Promoteur Immobilier VIP',
    description: 'Audience Promoteur (Brouillon Admin au lancement) : grands chantiers, lotissements et bannières dédiées.',
    category: 'promoter',
    audience: 'promoteur',
    badge: 'Bientôt disponible',
    price_usd: 149.0,
    price_cdf: 424650.0,
    priceMonthly: 149.0,
    priceMonthlyCDF: 424650.0,
    price_yearly_usd: 1490.0,
    priceYearly: 1490.0,
    price_yearly_cdf: 4246500.0,
    priceYearlyCDF: 4246500.0,
    trial_days: 14,
    trialDays: 14,
    currency: 'USD',
    billing_period: 'monthly',
    billingPeriod: 'month',
    max_listings: 500,
    maxListings: 500,
    max_photos_per_listing: 40,
    maxPhotos: 40,
    max_videos: 50,
    maxVideos: 50,
    included_boosts: 30,
    includedBoosts: 30,
    max_featured_listings: 30,
    featuredListings: 30,
    max_team_members: 25,
    agentAccounts: 25,
    features: [
      'Jusqu\'à 500 annonces de projets & lotissements',
      '40 photos HD par annonce & 50 vidéos',
      '30 boosts inclus / mois & vitrine sponsorisée',
      'Jusqu\'à 25 membres d\'équipe'
    ],
    recommended: false,
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: true,
    hasPrioritySupport: true,
    is_active: false,
    isActive: false
  },
  {
    id: 'enterprise',
    name: 'Pack Entreprise & Groupe',
    description: 'Audience Entreprise (Brouillon Admin au lancement) : grands comptes institutionnels et groupes fonciers.',
    category: 'enterprise',
    audience: 'entreprise',
    badge: 'Sur devis',
    price_usd: 299.0,
    price_cdf: 852150.0,
    priceMonthly: 299.0,
    priceMonthlyCDF: 852150.0,
    price_yearly_usd: 2990.0,
    priceYearly: 2990.0,
    price_yearly_cdf: 8521500.0,
    priceYearlyCDF: 8521500.0,
    trial_days: 30,
    trialDays: 30,
    currency: 'USD',
    billing_period: 'monthly',
    billingPeriod: 'month',
    max_listings: 1000,
    maxListings: 1000,
    max_photos_per_listing: 50,
    maxPhotos: 50,
    max_videos: 100,
    maxVideos: 100,
    included_boosts: 50,
    includedBoosts: 50,
    max_featured_listings: 50,
    featuredListings: 50,
    max_team_members: 50,
    agentAccounts: 50,
    features: [
      'Jusqu\'à 1000 annonces actives multi-filiales',
      '50 photos HD par annonce & 100 vidéos',
      '50 boosts inclus / mois & API CRM dédiée',
      'Jusqu\'à 50 membres d\'équipe'
    ],
    recommended: false,
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: true,
    hasPrioritySupport: true,
    is_active: false,
    isActive: false
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

const LAUNCH_AUDIENCES = ['grand_public', 'agence'];

function mapCategoryToAudienceServer(category?: string, id?: string): string {
  if (id === 'enterprise') return 'entreprise';
  if (id === 'promoter_vip') return 'promoteur';
  if (id === 'agency') return 'agence';
  if (category === 'agency') return 'agence';
  if (category === 'promoter') return 'promoteur';
  if (category === 'enterprise') return 'entreprise';
  return 'grand_public';
}

function normalizeServerPlan(p: any): any {
  const base = INITIAL_PLANS.find((ip) => ip.id === p.id);
  const audience = p.audience || mapCategoryToAudienceServer(p.category, p.id);
  const priceUsd = Number(p.price_usd ?? p.priceMonthly ?? base?.price_usd ?? 0);
  const priceCdf = Number(p.price_cdf ?? p.priceMonthlyCDF ?? base?.price_cdf ?? Math.round(priceUsd * 2850));
  const priceYearlyUsd = Number(p.price_yearly_usd ?? p.priceYearly ?? base?.price_yearly_usd ?? Math.round(priceUsd * 10));
  const priceYearlyCdf = Number(p.price_yearly_cdf ?? p.priceYearlyCDF ?? base?.price_yearly_cdf ?? Math.round(priceYearlyUsd * 2850));
  const maxListings = Number(p.max_listings ?? p.maxListings ?? base?.max_listings ?? 3);
  const maxPhotos = Number(p.max_photos_per_listing ?? p.maxPhotos ?? base?.max_photos_per_listing ?? 6);
  const maxVideos = Number(p.max_videos ?? p.maxVideos ?? base?.max_videos ?? 1);
  const includedBoosts = Number(p.included_boosts ?? p.includedBoosts ?? p.max_featured_listings ?? p.featuredListings ?? base?.included_boosts ?? 0);
  const maxTeam = Number(p.max_team_members ?? p.agentAccounts ?? base?.max_team_members ?? 1);
  const trialDays = Number(p.trial_days ?? p.trialDays ?? base?.trial_days ?? 0);
  const defaultActive = LAUNCH_AUDIENCES.includes(audience);
  const isActive = p.is_active !== undefined ? Boolean(p.is_active) : (p.isActive !== undefined ? Boolean(p.isActive) : defaultActive);

  return {
    ...(base || {}),
    ...p,
    audience,
    category: p.category || (audience === 'agence' ? 'agency' : audience === 'promoteur' ? 'promoter' : audience === 'entreprise' ? 'enterprise' : 'individual'),
    price_usd: priceUsd,
    priceMonthly: priceUsd,
    price_cdf: priceCdf,
    priceMonthlyCDF: priceCdf,
    price_yearly_usd: priceYearlyUsd,
    priceYearly: priceYearlyUsd,
    price_yearly_cdf: priceYearlyCdf,
    priceYearlyCDF: priceYearlyCdf,
    trial_days: trialDays,
    trialDays,
    max_listings: maxListings,
    maxListings,
    max_photos_per_listing: maxPhotos,
    maxPhotos,
    max_videos: maxVideos,
    maxVideos,
    included_boosts: includedBoosts,
    includedBoosts,
    max_featured_listings: includedBoosts,
    featuredListings: includedBoosts,
    max_team_members: maxTeam,
    agentAccounts: maxTeam,
    is_active: isActive,
    isActive
  };
}

function loadLocalPlans(): any[] {
  try {
    if (fs.existsSync(LOCAL_PLANS_FILE)) {
      const content = fs.readFileSync(LOCAL_PLANS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map(normalizeServerPlan);
        // Ensure promoter_vip exists if an older pricing_plans.json only had starter/pro/agency/enterprise
        for (const defPlan of INITIAL_PLANS) {
          if (!normalized.some((p) => p.id === defPlan.id)) {
            normalized.push(defPlan);
          }
        }
        return normalized;
      }
    }
  } catch (e) {
    console.error('Erreur lecture pricing_plans.json', e);
  }
  return INITIAL_PLANS.map(normalizeServerPlan);
}

function saveLocalPlans(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_PLANS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture pricing_plans.json', e);
  }
}

function loadLocalPaymentMethods(): any[] {
  try {
    if (fs.existsSync(LOCAL_PAYMENT_METHODS_FILE)) {
      const content = fs.readFileSync(LOCAL_PAYMENT_METHODS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erreur lecture payment_methods_store.json', e);
  }
  return INITIAL_PAYMENT_METHODS;
}

function saveLocalPaymentMethods(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_PAYMENT_METHODS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture payment_methods_store.json', e);
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
let inMemoryPaymentMethods: any[] = loadLocalPaymentMethods();
let inMemoryInvoices: any[] = loadLocalInvoices();

async function saveBase64PropertyImage(imgData: unknown, propertyId: string, index: number): Promise<string> {
  if (!imgData || typeof imgData !== 'string') return '';
  const trimmed = imgData.trim();
  if (!trimmed.startsWith('data:image')) {
    const uploadsMatch = trimmed.match(/^https?:\/\/[^/]+(\/uploads\/images\/[^?#]+)$/i);
    return uploadsMatch ? uploadsMatch[1] : trimmed;
  }

  try {
    serverCloudinaryConfig = loadCloudinaryConfig();
    applyCloudinarySettings(serverCloudinaryConfig);
    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.apiSecret && serverCloudinaryConfig.apiKey) {
      const uploaded = await cloudinary.uploader.upload(trimmed, {
        folder: 'kinimmo/property_images',
        transformation: [{ quality: 'auto:good', fetch_format: 'auto' }]
      });
      if (uploaded?.secure_url) return uploaded.secure_url;
    } else if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.uploadPreset) {
      const formData = new FormData();
      formData.append('file', trimmed);
      formData.append('upload_preset', serverCloudinaryConfig.uploadPreset);
      formData.append('folder', 'kinimmo/property_images');
      const r = await fetch(`https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const j: any = await r.json().catch(() => ({}));
      if (r.ok && j?.secure_url) return j.secure_url;
    }
  } catch (cloudErr: any) {
    console.warn('[server.ts] Cloudinary image upload fallback to disk:', cloudErr?.message || cloudErr);
  }

  try {
    const matches = trimmed.match(/^data:image\/([A-Za-z0-9.+-]+);base64,(.+)$/s);
    if (!matches || matches.length !== 3) return trimmed;
    const rawExt = matches[1].toLowerCase();
    const ext = rawExt.includes('png')
      ? 'png'
      : rawExt.includes('webp')
      ? 'webp'
      : rawExt.includes('gif')
      ? 'gif'
      : rawExt.includes('avif')
      ? 'avif'
      : 'jpg';
    const uploadDir = path.join(devUploadsDir, 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const cleanPropId = String(propertyId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `img_${cleanPropId}_${index}_${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(matches[2], 'base64'));
    return `/uploads/images/${filename}`;
  } catch {
    return trimmed;
  }
}

const MIN_PROPERTY_PHOTOS = 3;
const MAX_PROPERTY_PHOTOS = 20;
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_FILE_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 60;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
const DEFAULT_VIRTUAL_TOUR_DOMAINS = [
  'my.matterport.com',
  'matterport.com',
  'kuula.co',
  'www.kuula.co',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
];

function extractCloudinaryPublicIdServer(url?: string | null): string | null {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const clean = url.split('?')[0];
    const marker = '/upload/';
    const idx = clean.indexOf(marker);
    if (idx === -1) return null;
    let rest = clean.slice(idx + marker.length);
    const versionMatch = rest.match(/(?:^|\/)v\d+\/(.+)$/);
    if (versionMatch) {
      rest = versionMatch[1];
    } else {
      const parts = rest.split('/');
      if (parts.length > 1 && (parts[0].includes(',') || parts[0].includes('_'))) {
        rest = parts.slice(1).join('/');
      }
    }
    return rest.replace(/\.[a-z0-9]+$/i, '') || null;
  } catch {
    return null;
  }
}

async function destroyFromCloudinaryServer({ publicId, url, resourceType }: { publicId?: string | null; url?: string | null; resourceType?: 'image' | 'video' }) {
  const targetPublicId = publicId || extractCloudinaryPublicIdServer(url);
  if (!targetPublicId) return { success: true, skipped: true };
  serverCloudinaryConfig = loadCloudinaryConfig();
  if (!serverCloudinaryConfig.cloudName || !serverCloudinaryConfig.apiKey || !serverCloudinaryConfig.apiSecret) {
    return { success: false, skipped: true };
  }
  applyCloudinarySettings(serverCloudinaryConfig);
  const resType = resourceType || (typeof url === 'string' && url.includes('/video/upload/') ? 'video' : 'image');
  try {
    const res = await cloudinary.uploader.destroy(targetPublicId, { resource_type: resType, invalidate: true });
    return { success: res?.result === 'ok' || res?.result === 'not found', result: res?.result, publicId: targetPublicId };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

function getUserMediaQuotasServer(userId: string) {
  const u = inMemoryUsers.find((usr) => usr.id === userId);
  const planId = u?.planId || 'starter';
  const plan = inMemoryPlans.find((pl) => pl.id === planId) || inMemoryPlans[0] || {};
  const maxPlanPhotos = Number(plan.max_photos_per_listing ?? plan.maxPhotos ?? MAX_PROPERTY_PHOTOS);
  const maxPlanVideos = Number(plan.max_videos ?? plan.maxVideos ?? 25);
  const usedVideos = inMemoryVideos.filter((v) => v.userId === userId && v.status !== 'rejected').length;
  return { maxPlanPhotos, maxPlanVideos, usedVideos };
}

function validateMediaUploadServer(params: {
  purpose?: string;
  resourceType?: 'image' | 'video';
  mimeType?: string;
  fileSize?: number;
  fileCount?: number;
  currentPhotoCount?: number;
  duration?: number;
  maxPlanPhotos?: number;
  maxPlanVideos?: number;
  usedVideos?: number;
  isAdmin?: boolean;
}) {
  const {
    purpose = 'property_photo',
    resourceType = 'image',
    mimeType,
    fileSize,
    fileCount = 1,
    currentPhotoCount = 0,
    duration,
    maxPlanPhotos = MAX_PROPERTY_PHOTOS,
    maxPlanVideos = 50,
    usedVideos = 0,
    isAdmin = false,
  } = params;

  const normalizedMime = mimeType ? String(mimeType).toLowerCase().trim() : '';
  const sizeNum = fileSize !== undefined && fileSize !== null ? Number(fileSize) : null;
  const durationNum = duration !== undefined && duration !== null ? Number(duration) : null;

  if (resourceType === 'image') {
    if (normalizedMime && !ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMime)) {
      return { valid: false, status: 400, message: `Format photo non autorisé (${normalizedMime}). Formats acceptés : JPEG, PNG ou WebP.` };
    }
    if (sizeNum !== null && Number.isFinite(sizeNum) && sizeNum > MAX_IMAGE_FILE_BYTES) {
      return { valid: false, status: 413, message: 'Photo trop volumineuse : taille maximale de 10 Mo par image.' };
    }
    if (purpose === 'property_photo') {
      const effectiveMax = isAdmin ? MAX_PROPERTY_PHOTOS : Math.min(MAX_PROPERTY_PHOTOS, Math.max(MIN_PROPERTY_PHOTOS, Number(maxPlanPhotos || MAX_PROPERTY_PHOTOS)));
      if (Number(currentPhotoCount || 0) + Number(fileCount || 1) > effectiveMax) {
        return { valid: false, status: 403, message: `Quota de photos atteint : maximum ${effectiveMax} photos par annonce (plafond 20).` };
      }
    }
  } else {
    if (normalizedMime && !normalizedMime.startsWith('video/') && !ALLOWED_VIDEO_MIME_TYPES.includes(normalizedMime)) {
      return { valid: false, status: 400, message: `Format vidéo non autorisé (${normalizedMime}). Formats acceptés : MP4, MOV ou WebM.` };
    }
    if (sizeNum !== null && Number.isFinite(sizeNum) && sizeNum > MAX_VIDEO_FILE_BYTES) {
      return { valid: false, status: 413, message: 'Vidéo trop volumineuse : taille maximale autorisée de 100 Mo.' };
    }
    if (durationNum !== null && Number.isFinite(durationNum) && durationNum > MAX_VIDEO_DURATION_SECONDS) {
      return { valid: false, status: 400, message: `Durée vidéo dépassée (${Math.round(durationNum)}s). Maximum autorisé : 60 secondes.` };
    }
    if (!isAdmin && Number.isFinite(Number(maxPlanVideos)) && Number(maxPlanVideos) >= 0 && usedVideos >= maxPlanVideos) {
      return { valid: false, status: 403, message: `Quota vidéo de votre formule atteint (${usedVideos}/${maxPlanVideos} vidéos).` };
    }
  }
  return { valid: true };
}

function normalizeAllowedDomainsServer(raw: any): string[] {
  let list: string[] = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('[')) {
      try { const p = JSON.parse(t); if (Array.isArray(p)) list = p; } catch {}
    } else if (t) {
      list = t.split(/[\n,;]+/);
    }
  }
  const cleaned = list
    .map((d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, ''))
    .filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : [...DEFAULT_VIRTUAL_TOUR_DOMAINS];
}

function validateVirtualTourDomainServer(rawUrl: any, allowedRaw: any) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { valid: true, normalizedUrl: undefined };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, message: 'URL de visite virtuelle invalide.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, message: 'Seuls les liens HTTPS/HTTP sont autorisés pour les visites virtuelles.' };
  }
  const hostname = parsed.hostname.toLowerCase();
  const whitelist = normalizeAllowedDomainsServer(allowedRaw);
  const ok = whitelist.some((d) => {
    const clean = d.replace(/^www\./, '');
    return hostname === d || hostname === clean || hostname.endsWith(`.${clean}`);
  });
  if (!ok) {
    return { valid: false, message: `Le domaine "${hostname}" n'est pas autorisé pour les visites virtuelles.` };
  }
  return { valid: true, normalizedUrl: parsed.toString() };
}

function hammingDistanceHex64Server(a: string, b: string): number {
  if (!a || !b || a.length !== 16 || b.length !== 16) return 64;
  let dist = 0;
  for (let i = 0; i < 16; i++) {
    const va = parseInt(a[i], 16);
    const vb = parseInt(b[i], 16);
    if (Number.isNaN(va) || Number.isNaN(vb)) return 64;
    let xor = va ^ vb;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

function findDuplicateFingerprintsInMemory(fingerprints: string[], imageUrls: string[], excludePropertyId?: string | null) {
  const cleanFps = Array.isArray(fingerprints) ? fingerprints.map((f) => String(f || '').trim().toLowerCase()).filter((f) => f.length === 16) : [];
  const cleanUrls = Array.isArray(imageUrls) ? imageUrls.map((u) => String(u || '').trim()).filter(Boolean) : [];
  if (cleanFps.length === 0 && cleanUrls.length === 0) return [];

  const matches: Array<{ propertyId: string; propertyTitle: string; agentId?: string; imageUrl?: string; distance: number }> = [];
  for (const prop of inMemoryProperties) {
    if (excludePropertyId && prop.id === excludePropertyId) continue;
    let matched = false;
    for (const u of cleanUrls) {
      if (Array.isArray(prop.images) && prop.images.includes(u)) {
        matches.push({ propertyId: prop.id, propertyTitle: prop.title, agentId: prop.agentId, imageUrl: u, distance: 0 });
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const existingFps: string[] = Array.isArray(prop.imageFingerprints)
      ? prop.imageFingerprints
      : Array.isArray(prop.imagesMeta)
      ? prop.imagesMeta.map((m: any) => m?.fingerprint).filter(Boolean)
      : [];
    for (const fp of cleanFps) {
      for (const efp of existingFps) {
        const dist = hammingDistanceHex64Server(fp, String(efp || '').toLowerCase());
        if (dist <= 6) {
          matches.push({ propertyId: prop.id, propertyTitle: prop.title, agentId: prop.agentId, distance: dist });
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }
  return matches;
}

function ensurePendingVideoModerationInMemory({ prop, user, videoUrl }: { prop: any; user: AuthUser; videoUrl?: string | null }) {
  if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) return undefined;
  const trimmed = videoUrl.trim();
  const existing = inMemoryVideos.find((v) => v.propertyId === prop.id && v.videoUrl === trimmed);
  if (existing) return existing.status;

  const vidStatus = user.role === 'admin' ? 'approved' : 'pending';
  const newVideo = {
    id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    propertyId: prop.id,
    userId: user.id,
    videoUrl: trimmed,
    thumbnailUrl: prop.images?.[0] || '',
    description: 'Visite vidéo soumise depuis le formulaire d\'annonce',
    status: vidStatus,
    viewsCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    propertyTitle: prop.title || 'Bien Immobilier Kinshasa',
    propertyPrice: prop.price || 0,
    propertyCurrency: prop.currency || 'USD',
    propertyCommune: prop.commune || 'Kinshasa',
    propertyQuartier: prop.quartier || '',
    propertyType: prop.type || 'villa',
    propertyStatus: prop.status || 'for-sale',
    propertyBedrooms: prop.bedrooms,
    propertyBathrooms: prop.bathrooms,
    agentName: prop.agencyName || user.agencyName || user.name || 'Agent Immobilier Kinimmo',
    agencyName: prop.agencyName || user.agencyName,
    agentPhone: prop.contactPhone || user.phone,
    agentWhatsapp: prop.contactPhone || user.whatsapp || user.phone,
    agentVerified: Boolean(user.isVerified),
  };
  inMemoryVideos.unshift(newVideo);
  saveLocalVideos(inMemoryVideos);
  return vidStatus;
}

function sanitizePropertyForViewer(prop: any, authUser: AuthUser | null) {
  const normalized = normalizePropertyRecord(prop);
  const matchingVideo = inMemoryVideos.find((v) => v.propertyId === normalized.id && v.videoUrl === normalized.videoUrl)
    || inMemoryVideos.find((v) => v.propertyId === normalized.id);
  const videoModStatus = matchingVideo?.status || normalized.videoModerationStatus;
  const isOwnerOrAdmin = Boolean(authUser && canManageProperty(authUser, normalized));

  if (videoModStatus && videoModStatus !== 'approved' && !isOwnerOrAdmin) {
    return {
      ...normalized,
      videoUrl: undefined,
      videoModerationStatus: videoModStatus,
    };
  }
  return {
    ...normalized,
    ...(videoModStatus ? { videoModerationStatus: videoModStatus } : {}),
  };
}

function normalizePropertyRecord(p: any) {
  if (!p || typeof p !== 'object') return p;
  return {
    ...p,
    description: typeof p.description === 'string' ? p.description : '',
    category: p.category || 'Résidentiel',
    currency: p.currency || 'USD',
    bedrooms: typeof p.bedrooms === 'number' ? p.bedrooms : Number(p.bedrooms) || 0,
    bathrooms: typeof p.bathrooms === 'number' ? p.bathrooms : Number(p.bathrooms) || 0,
    area: typeof p.area === 'number' ? p.area : Number(p.area) || 0,
    images: Array.isArray(p.images) ? p.images : [],
    imagesMeta: Array.isArray(p.imagesMeta) ? p.imagesMeta : [],
    imageFingerprints: Array.isArray(p.imageFingerprints) ? p.imageFingerprints : [],
    labels: Array.isArray(p.labels) ? p.labels : [],
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    customFields: p.customFields && typeof p.customFields === 'object' && !Array.isArray(p.customFields) ? p.customFields : {},
  };
}

// Store des propriétés avec statuts stricts et cycle de vie
let inMemoryProperties: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_PROPERTIES_FILE)) {
      const raw = fs.readFileSync(LOCAL_PROPERTIES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizePropertyRecord);
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

// Helper de sécurité & Authentification Kinimmo (Node.js & MySQL)
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  role: 'admin' | 'agent' | 'agency' | 'user' | 'owner';
  agencyId?: string;
  agencyName?: string;
  rccmOrNif?: string;
  avatar?: string;
  planId?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string;
  billingCycle?: 'monthly' | 'yearly';
  trialEndsAt?: string;
  includedBoostsRemaining?: number;
  isVerified?: boolean;
  kinshasaBadgeVerified?: boolean;
}

interface StoredAccountRecord extends AuthUser {
  password?: string;
  createdAt: string;
}

const DEFAULT_USERS_SEED: StoredAccountRecord[] = [
  {
    id: 'admin_master',
    name: 'Direction Kinimmo',
    email: 'admin@kinimmo.cd',
    password: 'AdminPassword2026!',
    phone: '+243 84 529 4616',
    role: 'admin',
    agencyName: 'Kinimmo RDC',
    isVerified: true,
    kinshasaBadgeVerified: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'agent_gombe_01',
    name: 'Cabinet Immobilier Gombe',
    email: 'agent.gombe@kinimmo.cd',
    password: 'Password123!',
    phone: '+243 81 000 0001',
    role: 'agent',
    agencyName: 'Cabinet Immobilier Gombe SARL',
    rccmOrNif: 'CD/KIN/RCCM/26-B-08420',
    isVerified: true,
    kinshasaBadgeVerified: true,
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString()
  },
  {
    id: 'agency_prestige_01',
    name: 'Agence Prestige Kinshasa',
    email: 'agence@kinimmo.cd',
    password: 'Password123!',
    phone: '+243 82 123 4567',
    role: 'agency',
    agencyId: 'agency_prestige_01',
    agencyName: 'Agence Prestige Kinshasa SARL',
    rccmOrNif: 'CD/KIN/RCCM/24-B-01192',
    isVerified: true,
    kinshasaBadgeVerified: true,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString()
  }
];

function loadLocalUsers(): StoredAccountRecord[] {
  try {
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      const raw = fs.readFileSync(LOCAL_USERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Users Store] Erreur lors du chargement des comptes:', err);
  }
  return [...DEFAULT_USERS_SEED];
}

function saveLocalUsers(users: StoredAccountRecord[]): void {
  try {
    fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Users Store] Erreur lors de la sauvegarde des comptes:', err);
  }
}

let inMemoryUsers: StoredAccountRecord[] = loadLocalUsers();

// Génération d'un jeton d'authentification unique canonique
const createAuthToken = (user: AuthUser): string => {
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || '',
    agencyId: user.agencyId || (user.role === 'agency' ? user.id : undefined),
    agencyName: user.agencyName || '',
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 jours
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
};

const getAuthUser = (req: Request): AuthUser | null => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') return null;
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();
  if (!token) return null;

  try {
    const decodedStr = Buffer.from(token, 'base64').toString('utf-8');
    if (!decodedStr.startsWith('{')) return null;

    const parsed = JSON.parse(decodedStr);
    if (!parsed || !parsed.id || !parsed.role) return null;
    if (parsed.exp && Number(parsed.exp) < Date.now()) {
      return null;
    }

    const storedUser = inMemoryUsers.find(u => u.id === parsed.id);
    if (storedUser) {
      const { password: _pwd, ...safeUser } = storedUser;
      if (safeUser.role === 'agency' && !safeUser.agencyId) {
        safeUser.agencyId = safeUser.id;
      }
      return safeUser;
    }

    // Rejeter toute usurpation de rôle admin si le compte n'existe pas dans inMemoryUsers
    if (parsed.role === 'admin') {
      return null;
    }

    return {
      id: String(parsed.id),
      name: String(parsed.name || 'Utilisateur Kinimmo'),
      email: String(parsed.email || ''),
      phone: parsed.phone,
      whatsapp: parsed.whatsapp,
      role: parsed.role,
      agencyId: parsed.agencyId || (parsed.role === 'agency' ? parsed.id : undefined),
      agencyName: parsed.agencyName,
      rccmOrNif: parsed.rccmOrNif,
      avatar: parsed.avatar,
      planId: parsed.planId,
      isVerified: Boolean(parsed.isVerified),
      kinshasaBadgeVerified: Boolean(parsed.kinshasaBadgeVerified)
    };
  } catch {
    return null;
  }
};

// Handlers d'authentification (/auth/register, /auth/login, /auth/me)
const handleRegister = (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role, agencyName, rccmOrNif, avatarUrl } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Une adresse e-mail valide est requise.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit comporter au moins 6 caractères.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = inMemoryUsers.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Un compte est déjà enregistré avec cette adresse e-mail. Veuillez vous connecter.'
      });
    }

    const userRole = (role === 'agency' || role === 'agent' || role === 'owner') ? role : 'user';
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRecord: StoredAccountRecord = {
      id: newId,
      name: (name && name.trim()) || cleanEmail.split('@')[0],
      email: cleanEmail,
      password: password.trim(),
      phone: phone || '',
      role: userRole,
      agencyId: userRole === 'agency' ? newId : undefined,
      agencyName: (userRole === 'agency' || userRole === 'agent') ? agencyName || 'Kinshasa Immobilier' : undefined,
      rccmOrNif: rccmOrNif || undefined,
      avatar: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      planId: userRole === 'agency' ? 'agency' : userRole === 'agent' ? 'pro' : 'starter',
      isVerified: false,
      kinshasaBadgeVerified: false,
      createdAt: new Date().toISOString()
    };

    inMemoryUsers.unshift(newRecord);
    saveLocalUsers(inMemoryUsers);

    const { password: _pwd, ...safeUser } = newRecord;
    const token = createAuthToken(safeUser);

    console.log(`[Auth] Inscription réussie pour ${cleanEmail} (${userRole})`);

    return res.status(201).json({
      success: true,
      message: 'Inscription réussie.',
      token,
      user: safeUser,
      data: {
        token,
        user: safeUser
      }
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Erreur interne lors de l\'inscription.' });
  }
};

const handleLogin = (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez saisir votre adresse e-mail ou identifiant.'
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez saisir votre mot de passe.'
      });
    }

    const cleanIdentifier = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Chercher uniquement par e-mail exact ou téléphone exact
    const found = inMemoryUsers.find(
      u => u.email.toLowerCase() === cleanIdentifier || (u.phone && u.phone.replace(/\s+/g, '') === cleanIdentifier.replace(/\s+/g, ''))
    );

    if (!found) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects. Veuillez vérifier votre adresse e-mail et mot de passe.'
      });
    }

    // Vérification stricte du mot de passe (aucun mot de passe maître ou bypass)
    const isMatched = Boolean(found.password && found.password === cleanPassword);

    if (!isMatched) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe incorrect pour cette adresse e-mail.'
      });
    }

    const { password: _pwd, ...safeUser } = found;
    if (safeUser.role === 'agency' && !safeUser.agencyId) {
      safeUser.agencyId = safeUser.id;
    }
    const token = createAuthToken(safeUser);

    console.log(`[Auth] Connexion réussie pour ${safeUser.email} (${safeUser.role})`);

    return res.json({
      success: true,
      message: 'Connexion réussie.',
      token,
      user: safeUser,
      data: {
        token,
        user: safeUser
      }
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Erreur interne lors de la connexion.' });
  }
};

const handleGetMe = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Session non authentifiée ou jeton expiré.'
    });
  }
  return res.json({
    success: true,
    user,
    data: { user }
  });
};

const handleUpdateProfile = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Non autorisé.' });
  }

  const idx = inMemoryUsers.findIndex(u => u.id === user.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Compte introuvable.' });
  }

  const updates = { ...req.body };
  delete updates.password;
  delete updates.role;
  delete updates.id;
  delete updates.isVerified;
  delete updates.kinshasaBadgeVerified;
  inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...updates };
  saveLocalUsers(inMemoryUsers);

  const { password: _pwd, ...safeUser } = inMemoryUsers[idx];
  return res.json({ success: true, message: 'Profil mis à jour.', user: safeUser, data: { user: safeUser } });
};

const handleChangePassword = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Non autorisé.' });
  }

  const { oldPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
  }

  const idx = inMemoryUsers.findIndex(u => u.id === user.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Compte introuvable.' });
  }

  inMemoryUsers[idx].password = newPassword;
  saveLocalUsers(inMemoryUsers);

  return res.json({ success: true, message: 'Mot de passe modifié avec succès.' });
};

// Enregistrement des routes d'authentification (compatibilité avec et sans préfixe /api)
app.post('/api/auth/register', handleRegister);
app.post('/auth/register', handleRegister);
app.post('/api/auth/login', handleLogin);
app.post('/auth/login', handleLogin);
app.get('/api/auth/me', handleGetMe);
app.get('/auth/me', handleGetMe);
app.put('/api/auth/profile', handleUpdateProfile);
app.put('/auth/profile', handleUpdateProfile);
app.put('/api/auth/change-password', handleChangePassword);
app.put('/auth/change-password', handleChangePassword);

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

    // Correspondance automatique avec les annonces actives en mémoire
    const matches = findMatchingProperties(newRequest, inMemoryProperties, { minScore: 20, limit: 10 });
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
app.post('/api/concierge/requests', handleCreateConciergeRequest);
app.post('/api/conciergerie', handleCreateConciergeRequest);

// Route de consultation des correspondances automatiques pour une demande
app.get('/api/concierge-requests/:id/matches', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }
    const { id } = req.params;
    const foundReq = inMemoryRequests.find((r) => r.id === id);
    if (!foundReq) {
      return res.status(404).json({ success: false, error: 'Demande introuvable.' });
    }
    if (user.role === 'agent' && foundReq.assigned_agent_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }
    if (user.role !== 'admin' && user.role !== 'agent') {
      return res.status(403).json({ success: false, error: 'Accès réservé aux conseillers et administrateurs.' });
    }
    const matches = findMatchingProperties(foundReq, inMemoryProperties, { minScore: 15, limit: 15 });
    return res.json({ success: true, count: matches.length, data: matches });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// 2. Consultation des demandes (Table: concierge_requests)
// SÉCURITÉ : Authentification et contrôle strict des rôles
const serializeConciergeForPreview = (raw: any): ConciergerieRequest => {
  const createdAt = raw.created_at || raw.createdAt || new Date().toISOString();
  const updatedAt = raw.updated_at || raw.updatedAt || createdAt;
  const currency = String(raw.currency || raw.budget?.devise || 'USD').toUpperCase() === 'CDF' ? 'CDF' : 'USD';
  const budgetMin = raw.budget_min !== undefined ? raw.budget_min : raw.budget?.min ?? null;
  const budgetMax = Number(raw.budget_max ?? raw.budget?.max ?? 0) || 0;
  return {
    ...raw,
    reference: raw.reference || `KIN-CONC-${new Date(createdAt).getFullYear()}-${String(raw.id || '').slice(-4).toUpperCase()}`,
    currency,
    services: Array.isArray(raw.services) ? raw.services : ['Recherche de biens'],
    projet: raw.project_type || raw.projet || 'Acheter',
    typeBien: raw.property_type || raw.typeBien || 'Appartement',
    localisation: {
      commune: raw.commune || raw.localisation?.commune || 'Gombe',
      quartier: raw.quartier || raw.localisation?.quartier || undefined
    },
    budget: {
      min: budgetMin !== null && budgetMin !== undefined ? Number(budgetMin) : undefined,
      max: budgetMax,
      devise: currency
    },
    caracteristiques: {
      chambres: raw.bedrooms !== null && raw.bedrooms !== undefined ? Number(raw.bedrooms) : raw.caracteristiques?.chambres,
      sallesDeBain: raw.bathrooms !== null && raw.bathrooms !== undefined ? Number(raw.bathrooms) : raw.caracteristiques?.sallesDeBain,
      parking: Boolean(raw.parking ?? raw.caracteristiques?.parking),
      meuble: Boolean(raw.furnished ?? raw.caracteristiques?.meuble)
    },
    client: {
      nomComplet: raw.full_name || raw.client?.nomComplet || 'Client Kinimmo',
      telephone: raw.phone || raw.client?.telephone || '',
      whatsapp: raw.whatsapp || raw.client?.whatsapp || undefined,
      email: raw.email || raw.client?.email || '',
      message: raw.description || raw.notes || raw.client?.message || undefined
    },
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt
  };
};

const handleGetConciergeRequests = async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise pour consulter les demandes de conciergerie.'
      });
    }
    if (!['admin', 'agent'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit : privilèges insuffisants.'
      });
    }

    let list: ConciergerieRequest[] = inMemoryRequests.map(serializeConciergeForPreview);

    // SÉCURITÉ : Un agent ne peut accéder qu'aux demandes qui lui sont attribuées
    if (user.role === 'agent') {
      list = list.filter((r) => r.assigned_agent_id === user.id);
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
app.get('/api/concierge/requests', handleGetConciergeRequests);
app.get('/api/conciergerie', handleGetConciergeRequests);

// 3. Mise à jour de statut, agent ou modification complète de la demande
const handleUpdateConciergeRequest = async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise pour modifier une demande de conciergerie.'
      });
    }

    if (user.role !== 'admin' && user.role !== 'agent') {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit : Seuls les administrateurs ou agents assignés peuvent modifier une demande.'
      });
    }

    const { id } = req.params;
    const body = req.body || {};

    const reqItem = inMemoryRequests.find((r) => r.id === id);
    if (!reqItem) {
      return res.status(404).json({ success: false, error: 'Demande introuvable.' });
    }

    if (user.role === 'agent') {
      if (reqItem.assigned_agent_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Accès interdit : vous ne pouvez mettre à jour que les demandes qui vous sont attribuées.'
        });
      }
      if (body.assigned_agent_id !== undefined) {
        return res.status(403).json({
          success: false,
          error: 'Accès interdit : seul un administrateur peut réattribuer une demande.'
        });
      }
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
    if (body.currency !== undefined) reqItem.currency = String(body.currency).toUpperCase() === 'CDF' ? 'CDF' : 'USD';
    if (body.bedrooms !== undefined) reqItem.bedrooms = Number(body.bedrooms) || 0;
    if (body.bathrooms !== undefined) reqItem.bathrooms = Number(body.bathrooms) || 0;
    if (body.notes !== undefined) {
      reqItem.notes = body.notes;
      reqItem.description = body.notes;
    }
    if (body.assigned_agent_id !== undefined && user.role === 'admin') reqItem.assigned_agent_id = body.assigned_agent_id;
    if (body.assigned_agent_name !== undefined && user.role === 'admin') reqItem.assigned_agent_name = body.assigned_agent_name;
    if (body.notesAdmin !== undefined) reqItem.notesAdmin = String(body.notesAdmin);

    const synced = serializeConciergeForPreview(reqItem);
    Object.assign(reqItem, synced);

    const nowIso = new Date().toISOString();
    reqItem.updated_at = nowIso;
    reqItem.updatedAt = nowIso;

    saveLocalRequests(inMemoryRequests);

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
app.patch('/api/concierge/requests/:id', handleUpdateConciergeRequest);
app.put('/api/concierge/requests/:id', handleUpdateConciergeRequest);
app.patch('/api/conciergerie/:id', handleUpdateConciergeRequest);
app.put('/api/conciergerie/:id', handleUpdateConciergeRequest);

const handleDeleteConciergeRequest = (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const { id } = req.params;
  const idx = inMemoryRequests.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Demande introuvable.' });
  inMemoryRequests.splice(idx, 1);
  saveLocalRequests(inMemoryRequests);
  return res.json({ success: true, message: 'Demande supprimée avec succès.' });
};
app.delete('/api/concierge-requests/:id', handleDeleteConciergeRequest);
app.delete('/api/concierge/requests/:id', handleDeleteConciergeRequest);

// 4. Table : property_visits (CRUD complet avec contrôle RBAC et Notifications)
const handleGetPropertyVisits = async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentification requise pour consulter les visites.' });
    }
    if (user.role !== 'admin' && user.role !== 'agent' && user.role !== 'agency') {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }

    const { request_id } = req.query;

    let list: PropertyVisitRecord[] = [...inMemoryVisits];
    if (request_id) {
      list = list.filter((v) => v.request_id === String(request_id));
    }

    // SÉCURITÉ : Contrôle des rôles - Un agent ne peut accéder qu'aux visites qui lui sont autorisées
    if (user.role === 'agent') {
      list = list.filter((v) => v.agent_id === user.id);
    }

    return res.json({ success: true, count: list.length, data: list });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};
app.get('/api/property-visits', handleGetPropertyVisits);
app.get('/api/concierge/visits', handleGetPropertyVisits);

const handleCreatePropertyVisit = async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    // SÉCURITÉ : Authentification obligatoire pour planifier une visite
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Accès non autorisé : Authentification requise pour planifier une visite.'
      });
    }
    if (user.role !== 'admin' && user.role !== 'agent' && user.role !== 'agency') {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit : Seuls les administrateurs, agences ou agents peuvent planifier une visite.'
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

    const cleanVisitDate = String(visit_date).trim().split('T')[0].slice(0, 10);
    const nowIso = new Date().toISOString();
    const id = `visit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newVisit: PropertyVisitRecord = {
      id,
      request_id: String(request_id),
      property_id: property_id || null,
      agent_id: agent_id || null,
      visit_date: cleanVisitDate,
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
};
app.post('/api/property-visits', handleCreatePropertyVisit);
app.post('/api/concierge/visits', handleCreatePropertyVisit);

const handlePatchPropertyVisit = async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }
    if (user.role !== 'admin' && user.role !== 'agent' && user.role !== 'agency') {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
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
    if (visit_date !== undefined) visit.visit_date = String(visit_date).trim().split('T')[0].slice(0, 10);
    if (visit_time !== undefined) visit.visit_time = visit_time;
    if (agent_id !== undefined && user.role === 'admin') visit.agent_id = agent_id;
    if (property_id !== undefined) visit.property_id = property_id;
    visit.updated_at = new Date().toISOString();

    saveLocalVisits(inMemoryVisits);

    return res.json({ success: true, message: 'Visite mise à jour.', data: visit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};
app.patch('/api/property-visits/:id', handlePatchPropertyVisit);
app.patch('/api/concierge/visits/:id', handlePatchPropertyVisit);

const handleDeletePropertyVisit = async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }
    if (user.role !== 'admin' && user.role !== 'agent' && user.role !== 'agency') {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
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
};
app.delete('/api/property-visits/:id', handleDeletePropertyVisit);
app.delete('/api/concierge/visits/:id', handleDeletePropertyVisit);

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

// Helpers Rétrogradation Douce & Restauration (Plans & Abonnements P2)
function getFreePlanMaxListingsServer(): number {
  const starter = inMemoryPlans.find((p) => p.id === 'starter' || Number(p.price_usd || p.priceMonthly || 0) === 0);
  return Number(starter?.max_listings ?? starter?.maxListings ?? 3);
}

function doesPropertyBelongToUserServer(p: any, userId: string, agencyId?: string): boolean {
  if (!p) return false;
  if (p.userId === userId || p.agentId === userId || p.ownerId === userId) return true;
  if (agencyId && (p.agencyId === agencyId || p.agentId === agencyId)) return true;
  return false;
}

function softDowngradeUserPropertiesServer(userId: string): { hiddenCount: number; keptCount: number } {
  const freeMax = getFreePlanMaxListingsServer();
  const targetUser = inMemoryUsers.find((u) => u.id === userId || u.email === userId);
  const agencyId = targetUser?.agencyId;
  const ownedActive = inMemoryProperties
    .filter((p) => doesPropertyBelongToUserServer(p, userId, agencyId) && p.published !== false && p.listingStatus !== 'ARCHIVED')
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  if (ownedActive.length <= freeMax) {
    return { hiddenCount: 0, keptCount: ownedActive.length };
  }

  const keepIds = new Set(ownedActive.slice(0, freeMax).map((p) => p.id));
  const nowIso = new Date().toISOString();
  let hiddenCount = 0;

  inMemoryProperties = inMemoryProperties.map((p) => {
    if (doesPropertyBelongToUserServer(p, userId, agencyId) && p.published !== false && !keepIds.has(p.id)) {
      hiddenCount += 1;
      return {
        ...p,
        published: false,
        softHiddenByPlan: true,
        softHiddenAt: nowIso,
        updatedAt: nowIso
      };
    }
    return p;
  });

  if (hiddenCount > 0) saveLocalProperties(inMemoryProperties);
  return { hiddenCount, keptCount: Math.min(ownedActive.length, freeMax) };
}

function restoreSoftHiddenPropertiesServer(userId: string): number {
  const targetUser = inMemoryUsers.find((u) => u.id === userId || u.email === userId);
  const agencyId = targetUser?.agencyId;
  const nowIso = new Date().toISOString();
  let restoredCount = 0;

  inMemoryProperties = inMemoryProperties.map((p) => {
    if (doesPropertyBelongToUserServer(p, userId, agencyId) && p.softHiddenByPlan) {
      restoredCount += 1;
      return {
        ...p,
        published: true,
        softHiddenByPlan: false,
        softHiddenAt: undefined,
        updatedAt: nowIso
      };
    }
    return p;
  });

  if (restoredCount > 0) saveLocalProperties(inMemoryProperties);
  return restoredCount;
}

function applyPlanToAccountServer(userId: string, plan: any, cycle: 'monthly' | 'yearly', isTrial = false) {
  const now = new Date();
  const durationDays = isTrial ? Math.max(1, Number(plan?.trial_days ?? plan?.trialDays ?? 7)) : (cycle === 'yearly' ? 365 : 30);
  const expiresAtIso = new Date(now.getTime() + durationDays * 86400000).toISOString().split('T')[0];

  const uIdx = inMemoryUsers.findIndex((u) => u.id === userId || u.email === userId);
  let targetAgencyId: string | undefined;
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = {
      ...inMemoryUsers[uIdx],
      subscriptionPlan: plan.id,
      subscriptionStatus: 'Active',
      subscriptionExpiresAt: expiresAtIso,
      billingCycle: cycle,
      trialEndsAt: isTrial ? expiresAtIso : undefined,
      includedBoostsRemaining: Number(plan.included_boosts ?? plan.includedBoosts ?? 0)
    };
    targetAgencyId = inMemoryUsers[uIdx].agencyId;
    saveLocalUsers(inMemoryUsers);
  }

  const agIdx = inMemoryAgencies.findIndex((a) => a.id === targetAgencyId || a.id === userId || a.userId === userId);
  if (agIdx !== -1) {
    inMemoryAgencies[agIdx] = {
      ...inMemoryAgencies[agIdx],
      subscriptionPlan: plan.id,
      subscriptionStatus: 'Active',
      subscriptionExpiresAt: expiresAtIso,
      billingCycle: cycle,
      trialEndsAt: isTrial ? expiresAtIso : undefined,
      includedBoostsRemaining: Number(plan.included_boosts ?? plan.includedBoosts ?? 0),
      lastPaymentDate: now.toISOString().split('T')[0],
      unpaidInvoiceId: undefined
    };
    saveLocalAgencies(inMemoryAgencies);
  }

  const restored = restoreSoftHiddenPropertiesServer(userId);
  return { expiresAtIso, restored };
}

function downgradeAccountToFreeServer(userId: string) {
  const nowDate = new Date().toISOString().split('T')[0];
  const uIdx = inMemoryUsers.findIndex((u) => u.id === userId || u.email === userId);
  let targetAgencyId: string | undefined;
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = {
      ...inMemoryUsers[uIdx],
      subscriptionPlan: 'starter',
      subscriptionStatus: 'Expired',
      subscriptionExpiresAt: nowDate,
      includedBoostsRemaining: 0
    };
    targetAgencyId = inMemoryUsers[uIdx].agencyId;
    saveLocalUsers(inMemoryUsers);
  }
  const agIdx = inMemoryAgencies.findIndex((a) => a.id === targetAgencyId || a.id === userId || a.userId === userId);
  if (agIdx !== -1) {
    inMemoryAgencies[agIdx] = {
      ...inMemoryAgencies[agIdx],
      subscriptionPlan: 'starter',
      subscriptionStatus: 'Expired',
      subscriptionExpiresAt: nowDate,
      includedBoostsRemaining: 0
    };
    saveLocalAgencies(inMemoryAgencies);
  }
  return softDowngradeUserPropertiesServer(userId);
}

// 5a. Formules d'abonnements & Monétisation (GET /api/billing/plans)
app.get('/api/billing/plans', (req: Request, res: Response) => {
  try {
    const { category, audience, include_inactive } = req.query;
    let list = inMemoryPlans.map(normalizeServerPlan);
    if (include_inactive !== 'true') {
      list = list.filter((p) => p.is_active !== false && LAUNCH_AUDIENCES.includes(p.audience));
    }
    if (audience && audience !== 'all') {
      list = list.filter((p) => p.audience === audience);
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const idx = inMemoryPlans.findIndex(p => p.id === id);
    if (idx !== -1) {
      const existing = inMemoryPlans[idx];
      const merged = normalizeServerPlan({
        ...existing,
        ...req.body,
        id,
        updated_at: new Date().toISOString()
      });
      inMemoryPlans[idx] = merged;
      saveLocalPlans(inMemoryPlans);
      return res.json({ success: true, message: 'Formule mise à jour avec succès.', plan: merged });
    }
    return res.status(404).json({ success: false, error: 'Formule introuvable' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Création d'une nouvelle formule d'abonnement (Admin)
app.post('/api/billing/plans', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const id = req.body.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const audience = req.body.audience || mapCategoryToAudienceServer(req.body.category, id);
    const newPlan = normalizeServerPlan({
      ...req.body,
      id,
      audience,
      created_at: new Date().toISOString()
    });

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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    inMemoryOptions = inMemoryOptions.filter(o => o.id !== id);
    saveLocalOptions(inMemoryOptions);
    return res.json({ success: true, message: 'Option supprimée avec succès.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5c. Moyens de paiement officiels RDC configurables (CRUD Admin + GET public)
app.get('/api/billing/payment-methods', (req: Request, res: Response) => {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const list = includeInactive ? inMemoryPaymentMethods : inMemoryPaymentMethods.filter((pm) => pm.is_active !== false);
    return res.json({ success: true, count: list.length, paymentMethods: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

const handleCreatePaymentMethod = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const pm = {
      id: req.body.id || `pm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider: req.body.provider || 'mpesa',
      account_name: req.body.account_name || 'Compte Marchand Kinimmo',
      account_number: req.body.account_number || '',
      merchant_code: req.body.merchant_code || null,
      instructions: req.body.instructions || '',
      is_active: req.body.is_active !== false,
      created_at: new Date().toISOString()
    };
    inMemoryPaymentMethods.push(pm);
    saveLocalPaymentMethods(inMemoryPaymentMethods);
    return res.status(201).json({ success: true, paymentMethod: pm });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post('/api/billing/payment-methods', handleCreatePaymentMethod);
app.post('/api/billing/admin/payment-methods', handleCreatePaymentMethod);

const handleUpdatePaymentMethod = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const idx = inMemoryPaymentMethods.findIndex((pm) => pm.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Opérateur introuvable.' });
    inMemoryPaymentMethods[idx] = { ...inMemoryPaymentMethods[idx], ...req.body, id, updated_at: new Date().toISOString() };
    saveLocalPaymentMethods(inMemoryPaymentMethods);
    return res.json({ success: true, paymentMethod: inMemoryPaymentMethods[idx] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.put('/api/billing/payment-methods/:id', handleUpdatePaymentMethod);
app.put('/api/billing/admin/payment-methods/:id', handleUpdatePaymentMethod);

const handleDeletePaymentMethod = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    inMemoryPaymentMethods = inMemoryPaymentMethods.filter((pm) => pm.id !== id);
    saveLocalPaymentMethods(inMemoryPaymentMethods);
    return res.json({ success: true, message: 'Moyen de paiement supprimé.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.delete('/api/billing/payment-methods/:id', handleDeletePaymentMethod);
app.delete('/api/billing/admin/payment-methods/:id', handleDeletePaymentMethod);

// 5d. Création de facture de souscription forfait (POST /api/billing/invoices)
app.post('/api/billing/invoices', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    const {
      planId,
      paymentMethodId,
      paymentGateway = 'manual_mobile_money',
      billingCycle = 'monthly',
      startTrial = false,
      userName,
      userEmail
    } = req.body;
    const rawPlan = inMemoryPlans.find((p) => p.id === planId) || inMemoryPlans[0];
    const targetPlan = normalizeServerPlan(rawPlan);
    const targetPayment = inMemoryPaymentMethods.find((pm) => pm.id === paymentMethodId) || inMemoryPaymentMethods[0];
    const cycle: 'monthly' | 'yearly' = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const trialDays = Number(targetPlan.trial_days ?? targetPlan.trialDays ?? 0);
    const isTrial = Boolean(startTrial && trialDays > 0);

    const amountUsd = isTrial ? 0 : (cycle === 'yearly' ? Number(targetPlan.price_yearly_usd ?? targetPlan.priceYearly ?? 0) : Number(targetPlan.price_usd ?? targetPlan.priceMonthly ?? 0));
    const amountCdf = isTrial ? 0 : (cycle === 'yearly' ? Number(targetPlan.price_yearly_cdf ?? targetPlan.priceYearlyCDF ?? 0) : Number(targetPlan.price_cdf ?? targetPlan.priceMonthlyCDF ?? 0));
    const isZero = amountUsd <= 0;

    const invoiceNumber = `FAC-KIN-${Math.floor(100000 + Math.random() * 900000)}`;
    const receiptNumber = isZero ? `REC-KIN-${Math.floor(100000 + Math.random() * 900000)}` : undefined;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const durationDays = isTrial ? trialDays : (cycle === 'yearly' ? 365 : 30);
    const periodEndIso = new Date(Date.now() + durationDays * 86400000).toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const newInvoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      invoiceNumber,
      receipt_number: receiptNumber,
      receiptNumber,
      user_id: user.id,
      user_name: userName || user.name || 'Client Kinshasa',
      user_email: userEmail || user.email || 'client@kinimmo.cd',
      target_name: userName || user.name || targetPlan.name,
      target_email: userEmail || user.email || 'client@kinimmo.cd',
      invoice_type: 'subscription',
      invoiceType: 'subscription',
      plan_id: targetPlan.id,
      plan_name: targetPlan.name,
      billing_cycle: cycle,
      billingCycle: cycle,
      is_trial: isTrial,
      isTrial,
      amount: amountUsd,
      amount_usd: amountUsd,
      currency: 'USD',
      amount_cdf: amountCdf,
      total_amount: amountUsd,
      total_amount_cdf: amountCdf,
      payment_method_id: targetPayment?.id || null,
      payment_method_provider: isTrial ? 'Essai Gratuit Kinimmo' : (targetPayment?.account_name || 'Mobile Money'),
      payment_gateway: isTrial ? 'free_trial' : paymentGateway,
      status: isZero ? 'paid' : 'pending',
      period_start: nowIso.split('T')[0],
      period_end: periodEndIso,
      due_date: dueDate,
      paid_at: isZero ? nowIso : undefined,
      validated_at: isZero ? nowIso : undefined,
      validated_by: isZero ? 'Système Kinimmo' : undefined,
      created_at: nowIso,
      updated_at: nowIso
    };

    if (isZero) {
      applyPlanToAccountServer(user.id, targetPlan, cycle, isTrial);
    }

    inMemoryInvoices.unshift(newInvoice);
    saveLocalInvoices(inMemoryInvoices);
    return res.status(201).json({
      success: true,
      message: isTrial ? `Essai gratuit de ${trialDays} jours activé avec succès.` : 'Facture générée avec succès.',
      invoice: newInvoice
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5e. Commande de boost d'annonce à la carte (POST /api/billing/boost-order)
app.post('/api/billing/boost-order', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    const { propertyId, optionId, paymentMethodId, paymentGateway = 'manual_mobile_money', propertyTitle } = req.body;

    // Règle stricte Kinimmo : Empêcher les nouveaux boosts incompatibles avec le statut RENTED, SOLD, ARCHIVED
    if (propertyId) {
      const targetProperty = inMemoryProperties.find((p: any) => p.id === propertyId);
      if (targetProperty) {
        if (!canManageProperty(user, targetProperty)) {
          return res.status(403).json({ success: false, error: 'Accès interdit : vous ne pouvez booster que vos propres annonces.' });
        }
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
      user_id: user.id,
      user_name: user.name || 'Bailleur / Courtier Partenaire',
      user_email: user.email || 'partenaire@kinimmo.cd',
      target_name: user.name || 'Annonceur Kinshasa',
      target_email: user.email || 'partenaire@kinimmo.cd',
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
    saveLocalInvoices(inMemoryInvoices);
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
app.get('/api/billing/my-invoices', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const list = user.role === 'admin' ? inMemoryInvoices : inMemoryInvoices.filter((inv) => inv.user_id === user.id || inv.user_email === user.email);
  return res.json({ success: true, count: list.length, invoices: list });
});

// 5g. Boosts actifs de l'utilisateur (GET /api/billing/my-boosts)
app.get('/api/billing/my-boosts', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const boosts = inMemoryInvoices.filter(
    (inv) => inv.invoice_type === 'boost' && (user.role === 'admin' || inv.user_id === user.id)
  );
  return res.json({ success: true, count: boosts.length, boosts });
});

// 5h. Transmission de la référence / preuve de paiement -> passe en "awaiting_validation" (PUT /api/billing/invoices/:id/pay)
app.put('/api/billing/invoices/:id/pay', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    const { id } = req.params;
    const { transactionReference, paymentMethodId, proofImageUrl, gatewayTransactionId } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }
    if (user.role !== 'admin' && inv.user_id !== user.id && inv.user_email !== user.email) {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }
    const refValue = transactionReference || gatewayTransactionId || inv.transaction_reference;
    if (!refValue && !proofImageUrl) {
      return res.status(400).json({ success: false, error: 'Veuillez renseigner la référence de transaction ou joindre une capture de paiement.' });
    }
    if (refValue) inv.transaction_reference = String(refValue).trim();
    if (paymentMethodId) {
      inv.payment_method_id = paymentMethodId;
      const pm = inMemoryPaymentMethods.find((m) => m.id === paymentMethodId);
      if (pm) inv.payment_method_provider = pm.account_name;
    }
    if (proofImageUrl !== undefined) {
      inv.proof_image_url = proofImageUrl;
      inv.proofImageUrl = proofImageUrl;
    }
    inv.status = 'awaiting_validation';
    inv.payment_submitted_at = new Date().toISOString();
    inv.rejection_reason = undefined;
    inv.updated_at = new Date().toISOString();
    saveLocalInvoices(inMemoryInvoices);
    return res.json({ success: true, message: 'Preuve transmise. Facture en attente de validation par un administrateur.', invoice: inv });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5i. Validation et approbation manuelle d'une facture / boost par l'administrateur (PUT /api/billing/invoices/:id/approve)
app.put('/api/billing/invoices/:id/approve', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }
    const nowIso = new Date().toISOString();
    inv.status = 'paid';
    inv.paid_at = nowIso;
    inv.validated_at = nowIso;
    inv.validated_by = user.name || 'Administrateur Kinimmo';
    if (!inv.receipt_number) {
      inv.receipt_number = `REC-KIN-${Math.floor(100000 + Math.random() * 900000)}`;
      inv.receiptNumber = inv.receipt_number;
    }
    inv.rejection_reason = undefined;
    inv.updated_at = nowIso;

    let restoredCount = 0;

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

        inMemoryProperties[propIdx].refreshBumpAt = nowIso;
        inMemoryProperties[propIdx].updatedAt = nowIso;
        saveLocalProperties(inMemoryProperties);
      }
    } else if (inv.plan_id) {
      const targetPlan = normalizeServerPlan(inMemoryPlans.find((p) => p.id === inv.plan_id) || inMemoryPlans[1] || inMemoryPlans[0]);
      const cycle: 'monthly' | 'yearly' = inv.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
      const result = applyPlanToAccountServer(inv.user_id, targetPlan, cycle, Boolean(inv.is_trial));
      inv.period_start = nowIso.split('T')[0];
      inv.period_end = result.expiresAtIso;
      restoredCount = result.restored;
    }

    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: restoredCount > 0
        ? `Facture ${inv.invoice_number} validée (${inv.receipt_number}). Plan activé et ${restoredCount} annonce(s) restaurée(s).`
        : `Facture ${inv.invoice_number} validée avec succès (${inv.receipt_number}).`,
      invoice: inv,
      restoredListingsCount: restoredCount
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5i-bis. Rejet manuel d'une facture / demande de boost par l'administrateur (PUT /api/billing/invoices/:id/reject)
app.put('/api/billing/invoices/:id/reject', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const { reason = 'Paiement non reçu ou référence de transaction non confirmée.' } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }

    inv.status = 'rejected';
    inv.rejection_reason = reason;
    inv.notes = `Paiement refusé par l'administrateur : ${reason}`;
    inv.validated_at = new Date().toISOString();
    inv.validated_by = user.name || 'Administrateur Kinimmo';
    inv.updated_at = new Date().toISOString();

    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: `Paiement refusé pour la facture ${inv.invoice_number}. Motif enregistré.`,
      invoice: inv
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5i-bis-2. Remboursement manuel avec note et option Révoquer ou Maintenir (PUT /api/billing/invoices/:id/refund)
app.put('/api/billing/invoices/:id/refund', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const { refundNote = 'Remboursement manuel administratif', refundAction = 'revoke' } = req.body || {};
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Facture non trouvée' });
    }
    const action: 'revoke' | 'keep' = refundAction === 'keep' ? 'keep' : 'revoke';
    const nowIso = new Date().toISOString();

    inv.status = 'refunded';
    inv.refund_note = String(refundNote).trim();
    inv.refundNote = inv.refund_note;
    inv.refunded_at = nowIso;
    inv.refundedAt = nowIso;
    inv.refund_action = action;
    inv.refundAction = action;
    inv.validated_by = user.name || 'Administrateur Kinimmo';
    inv.updated_at = nowIso;

    let softHiddenCount = 0;
    if (action === 'revoke') {
      if (inv.invoice_type === 'boost' || inv.property_id) {
        const propIdx = inMemoryProperties.findIndex((p) => p.id === inv.property_id);
        if (propIdx !== -1) {
          inMemoryProperties[propIdx].featured = false;
          inMemoryProperties[propIdx].isPremium = false;
          inMemoryProperties[propIdx].isUrgent = false;
          inMemoryProperties[propIdx].boostExpiresAt = undefined;
          inMemoryProperties[propIdx].listingTier = 'standard';
          inMemoryProperties[propIdx].updatedAt = nowIso;
          saveLocalProperties(inMemoryProperties);
        }
      } else if (inv.user_id) {
        const resDowngrade = downgradeAccountToFreeServer(inv.user_id);
        softHiddenCount = resDowngrade.hiddenCount;
      }
    }

    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: action === 'revoke'
        ? `Facture ${inv.invoice_number} remboursée et avantage révoqué (${softHiddenCount} annonce(s) excédentaire(s) masquée(s) sans suppression).`
        : `Facture ${inv.invoice_number} remboursée avec note ; le plan/boost reste actif.`,
      invoice: inv,
      softHiddenCount
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5i-bis-3. Audit des échéances & rétrogradation douce automatique (POST /api/billing/admin/check-expirations)
const handleCheckExpirations = (req: Request, res: Response) => {
  try {
    const nowMs = Date.now();
    let downgradedAccounts = 0;
    let totalHidden = 0;

    inMemoryUsers.forEach((u) => {
      if (u.subscriptionExpiresAt && u.subscriptionPlan && u.subscriptionPlan !== 'starter') {
        const expMs = new Date(u.subscriptionExpiresAt).getTime();
        if (!isNaN(expMs) && expMs < nowMs) {
          downgradedAccounts += 1;
          const r = downgradeAccountToFreeServer(u.id);
          totalHidden += r.hiddenCount;
        }
      }
    });

    return res.json({
      success: true,
      downgradedAccounts,
      softHiddenProperties: totalHidden,
      message: downgradedAccounts > 0
        ? `${downgradedAccounts} compte(s) rétrogradé(s) en plan gratuit (${totalHidden} annonce(s) excédentaire(s) masquée(s) sans suppression).`
        : 'Tous les abonnements actifs sont à jour.'
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post('/api/billing/admin/check-expirations', handleCheckExpirations);
app.post('/api/billing/invoices/check-expirations', handleCheckExpirations);

// 5i-ter. Liste des demandes de boost pour l'administration (GET /api/billing/admin/boost-requests)
app.get('/api/billing/admin/boost-requests', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const boostInvoices = inMemoryInvoices.filter((inv) => inv.invoice_type === 'boost' || inv.property_id);
    const enriched = boostInvoices.map((inv) => {
      const prop = inMemoryProperties.find((p: any) => p.id === inv.property_id);
      return {
        id: inv.id,
        property_id: inv.property_id,
        user_id: inv.user_id,
        option_id: inv.option_id,
        invoice_id: inv.id,
        status: inv.status === 'paid' ? 'active' : (inv.status === 'failed' || inv.status === 'cancelled' ? 'rejected' : 'pending'),
        admin_id: inv.admin_id || (inv.status === 'paid' ? 'admin' : null),
        admin_name: inv.admin_name || (inv.status === 'paid' ? 'Administrateur Kinimmo' : null),
        reviewed_at: inv.paid_at || inv.reviewed_at,
        rejection_reason: inv.rejection_reason || inv.notes,
        created_at: inv.created_at,
        property_title: prop?.title || inv.property_title || 'Bien immobilier',
        property_price: prop?.price || inv.amount,
        property_currency: prop?.currency || inv.currency || 'USD',
        property_commune: prop?.commune || 'Kinshasa',
        property_type: prop?.type || 'Résidence',
        property_status: prop?.status || 'for-sale',
        property_published: prop?.published !== false,
        property_featured: prop?.featured === true,
        property_boost_expires_at: prop?.boostExpiresAt,
        property_image: prop?.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600',
        applicant_name: inv.user_name || inv.target_name || 'Annonceur Kinshasa',
        applicant_email: inv.user_email || inv.target_email || 'partenaire@kinimmo.cd',
        applicant_phone: prop?.contactPhone || '+243 81 000 0000',
        option_name: inv.option_name || 'Mise en avant',
        boost_type: inv.boost_type || 'featured',
        duration_days: inv.duration_days || 7,
        price_usd: inv.amount || 10,
        price_cdf: inv.amount_cdf || 28500,
        invoice_number: inv.invoice_number,
        transaction_reference: inv.transaction_reference,
        due_date: inv.due_date
      };
    });

    return res.json({ success: true, count: enriched.length, boosts: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5i-quater. Approbation directe d'un boost par l'administrateur
const handleApproveBoostAction = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Demande de boost introuvable' });
    }

    inv.status = 'paid';
    inv.admin_id = user.id;
    inv.admin_name = user.name || 'Administrateur Kinimmo';
    inv.paid_at = new Date().toISOString();
    inv.reviewed_at = new Date().toISOString();
    inv.updated_at = new Date().toISOString();

    const propIdx = inMemoryProperties.findIndex((p: any) => p.id === inv.property_id);
    let durationDays = Number(inv.duration_days) || 7;
    let propTitle = inv.property_title || 'Bien';

    if (propIdx !== -1) {
      const prop = inMemoryProperties[propIdx];
      propTitle = prop.title;
      const expiresAt = new Date(Date.now() + durationDays * 86400000).toISOString();
      prop.boostExpiresAt = expiresAt;
      prop.featured = true;
      prop.published = true;
      if (inv.boost_type === 'premium') {
        prop.isPremium = true;
        prop.listingTier = 'premium';
      } else {
        prop.listingTier = 'featured';
      }
      prop.updatedAt = new Date().toISOString();
      saveLocalProperties(inMemoryProperties);

      // Synchronisation avec inMemorySlides pour la Vitrine
      const existingSlideIdx = inMemorySlides.findIndex((s) => s.propertyId === prop.id);
      const slideData = {
        id: `slide_prop_${prop.id}`,
        badgeCategory: prop.category?.toUpperCase() || 'PRESTIGE',
        badgeLocation: `${(prop.commune || 'KINSHASA').toUpperCase()}`,
        title: prop.title.toUpperCase(),
        subTitle: `${(prop.type || 'RÉSIDENCE').toUpperCase()} D'EXCEPTION • KINSHASA`,
        description: prop.description || 'Bien immobilier d\'exception validé en vitrine.',
        image: prop.images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600',
        propertyType: prop.type || 'Résidence',
        commune: prop.commune || 'Gombe',
        propertyId: prop.id,
        isActive: true,
        order: 1,
        contactName: prop.agencyName || 'Service Commercial',
        contactPhone: prop.contactPhone || '+243 81 000 0001',
        contactWhatsapp: prop.contactPhone || '+243 81 000 0001',
        stats: {
          units: prop.bedrooms ? `${prop.bedrooms} Chambres` : 'Standing',
          parking: prop.bathrooms ? `${prop.bathrooms} Salles d'eau` : 'Parking',
          surface: prop.area ? `${prop.area} m²` : '320 m²'
        },
        details: {
          amenities: prop.amenities || ['Sécurité 24/7', 'Groupe & Forage', 'Titre foncier garanti'],
          priceInfo: `$${Number(prop.price || 0).toLocaleString()} ${prop.period === 'month' ? '/ mois' : ''}`,
          deliveryDate: 'Disponible immédiatement'
        }
      };

      if (existingSlideIdx !== -1) {
        inMemorySlides[existingSlideIdx] = { ...inMemorySlides[existingSlideIdx], ...slideData, isActive: true };
      } else {
        inMemorySlides.unshift(slideData);
      }
      saveLocalSlides(inMemorySlides);
    }

    saveLocalInvoices(inMemoryInvoices);

    return res.json({
      success: true,
      message: `Demande de mise en avant validée avec succès. L'annonce "${propTitle}" est désormais active en vitrine pour ${durationDays} jours.`,
      boost: { id: inv.id, status: 'active', propertyId: inv.property_id, durationDays }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};

app.post('/api/billing/admin/boost-requests/:id/approve', handleApproveBoostAction);
app.put('/api/billing/admin/boost-requests/:id/approve', handleApproveBoostAction);

// 5i-quinquies. Rejet direct d'un boost par l'administrateur
const handleRejectBoostAction = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const { reason = 'Demande non validée ou paiement non reçu.' } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Demande de boost introuvable' });
    }

    inv.status = 'failed';
    inv.admin_id = user.id;
    inv.admin_name = user.name || 'Administrateur Kinimmo';
    inv.rejection_reason = reason;
    inv.notes = `Demande rejetée : ${reason}`;
    inv.reviewed_at = new Date().toISOString();
    inv.updated_at = new Date().toISOString();

    if (inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p: any) => p.id === inv.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = false;
        inMemoryProperties[propIdx].boostExpiresAt = undefined;
        saveLocalProperties(inMemoryProperties);
      }

      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === inv.property_id);
      if (slideIdx !== -1) {
        inMemorySlides[slideIdx].isActive = false;
        saveLocalSlides(inMemorySlides);
      }
    }

    saveLocalInvoices(inMemoryInvoices);

    return res.json({
      success: true,
      message: `Demande de mise en avant rejetée. Motif : ${reason}`,
      boost: { id: inv.id, status: 'rejected', rejectionReason: reason }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};

app.post('/api/billing/admin/boost-requests/:id/reject', handleRejectBoostAction);
app.put('/api/billing/admin/boost-requests/:id/reject', handleRejectBoostAction);

// 5i-sexies. Suspension temporaire d'un boost avec gel du temps restant (Admin)
const handleSuspendBoostAction = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Demande de boost introuvable' });
    }

    let remainingSeconds = 7 * 86400;
    if (inv.expires_at) {
      const expiresTime = new Date(inv.expires_at).getTime();
      remainingSeconds = Math.max(0, Math.floor((expiresTime - Date.now()) / 1000));
    }

    inv.status = 'suspended';
    inv.remaining_seconds_frozen = remainingSeconds;
    inv.reviewed_at = new Date().toISOString();
    inv.updated_at = new Date().toISOString();

    if (inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p: any) => p.id === inv.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = false;
        saveLocalProperties(inMemoryProperties);
      }
      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === inv.property_id);
      if (slideIdx !== -1) {
        inMemorySlides[slideIdx].isActive = false;
        saveLocalSlides(inMemorySlides);
      }
    }

    saveLocalInvoices(inMemoryInvoices);
    const remainingDays = Math.ceil(remainingSeconds / 86400);

    return res.json({
      success: true,
      message: `Mise en avant suspendue. Le compteur a été gelé (${remainingDays} jour(s) préservé(s)).`,
      boost: { id: inv.id, status: 'suspended', remainingSecondsFrozen: remainingSeconds, remainingDays }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post('/api/billing/admin/boost-requests/:id/suspend', handleSuspendBoostAction);
app.put('/api/billing/admin/boost-requests/:id/suspend', handleSuspendBoostAction);

// 5i-septies. Réactivation d'une mise en avant suspendue avec dégeler le solde restant (Admin)
const handleResumeBoostAction = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Demande de boost introuvable' });
    }

    const remainingSeconds = inv.remaining_seconds_frozen || 7 * 86400;
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + remainingSeconds * 1000);

    inv.status = 'paid';
    inv.starts_at = now.toISOString();
    inv.expires_at = newExpiresAt.toISOString();
    inv.remaining_seconds_frozen = undefined;
    inv.reviewed_at = now.toISOString();
    inv.updated_at = now.toISOString();

    if (inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p: any) => p.id === inv.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = true;
        inMemoryProperties[propIdx].published = true;
        inMemoryProperties[propIdx].boostExpiresAt = newExpiresAt.toISOString();
        saveLocalProperties(inMemoryProperties);
      }
      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === inv.property_id);
      if (slideIdx !== -1) {
        inMemorySlides[slideIdx].isActive = true;
        saveLocalSlides(inMemorySlides);
      }
    }

    saveLocalInvoices(inMemoryInvoices);
    const remainingDays = Math.ceil(remainingSeconds / 86400);

    return res.json({
      success: true,
      message: `Mise en avant réactivée pour ${remainingDays} jour(s) restant(s).`,
      boost: { id: inv.id, status: 'active', remainingDays, expiresAt: newExpiresAt.toISOString() }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post('/api/billing/admin/boost-requests/:id/resume', handleResumeBoostAction);
app.put('/api/billing/admin/boost-requests/:id/resume', handleResumeBoostAction);

// 5i-octies. Modification manuelle de la durée ou prolongation (Admin)
const handleUpdateBoostDurationAction = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const { durationDays, expiresAt } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: 'Demande de boost introuvable' });
    }

    let targetDate = new Date();
    if (expiresAt) {
      targetDate = new Date(expiresAt);
    } else if (durationDays) {
      const base = inv.expires_at && new Date(inv.expires_at) > new Date() ? new Date(inv.expires_at) : new Date();
      base.setDate(base.getDate() + Number(durationDays));
      targetDate = base;
    } else {
      return res.status(400).json({ success: false, error: 'Paramètre durationDays ou expiresAt requis' });
    }

    inv.status = 'paid';
    inv.expires_at = targetDate.toISOString();
    inv.updated_at = new Date().toISOString();

    if (inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p: any) => p.id === inv.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = true;
        inMemoryProperties[propIdx].boostExpiresAt = targetDate.toISOString();
        saveLocalProperties(inMemoryProperties);
      }
      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === inv.property_id);
      if (slideIdx !== -1) {
        inMemorySlides[slideIdx].isActive = true;
        saveLocalSlides(inMemorySlides);
      }
    }

    saveLocalInvoices(inMemoryInvoices);

    return res.json({
      success: true,
      message: `Mise en avant prolongée jusqu'au ${targetDate.toLocaleDateString()}.`,
      expiresAt: targetDate.toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.put('/api/billing/admin/boost-requests/:id/duration', handleUpdateBoostDurationAction);

// 5i-nonies. Suppression d'une demande de boost (Admin)
const handleDeleteBoostAction = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const idx = inMemoryInvoices.findIndex((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Demande de boost introuvable' });
    }

    const [deleted] = inMemoryInvoices.splice(idx, 1);
    if (deleted.property_id) {
      const propIdx = inMemoryProperties.findIndex((p: any) => p.id === deleted.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = false;
        inMemoryProperties[propIdx].boostExpiresAt = undefined;
        saveLocalProperties(inMemoryProperties);
      }
      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === deleted.property_id);
      if (slideIdx !== -1) {
        inMemorySlides.splice(slideIdx, 1);
        saveLocalSlides(inMemorySlides);
      }
    }

    saveLocalInvoices(inMemoryInvoices);
    return res.json({ success: true, message: 'Demande de boost supprimée.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.delete('/api/billing/admin/boost-requests/:id', handleDeleteBoostAction);

// 5i-decies. Statistiques de la vitrine (Admin)
app.get('/api/billing/admin/vitrine-stats', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const boostInvoices = inMemoryInvoices.filter((i) => i.property_id || i.type === 'boost');
    const now = Date.now();
    const stats = {
      totalRequests: boostInvoices.length,
      pending: boostInvoices.filter((i) => i.status === 'pending' || i.status === 'awaiting_validation' || i.status === 'pending_validation').length,
      active: boostInvoices.filter((i) => (i.status === 'paid' || i.status === 'active') && (!i.expires_at || new Date(i.expires_at).getTime() > now)).length,
      rejected: boostInvoices.filter((i) => i.status === 'failed' || i.status === 'rejected').length,
      refunded: boostInvoices.filter((i) => i.status === 'refunded').length,
      suspended: boostInvoices.filter((i) => i.status === 'suspended').length,
      expired: boostInvoices.filter((i) => i.expires_at && new Date(i.expires_at).getTime() <= now).length,
      activeShowcaseSlides: inMemorySlides.filter((s) => s.isActive && s.propertyId).length
    };
    return res.json({ success: true, stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5j. Consultation de toutes les factures côté administration (GET /api/admin/invoices)
app.get('/api/admin/invoices', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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
app.get('/api/billing/admin/advertisements', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  return res.json({ success: true, count: inMemoryAds.length, advertisements: inMemoryAds });
});

app.post('/api/billing/admin/advertisements', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    inMemoryAds = inMemoryAds.filter(a => a.id !== id);
    saveLocalAds(inMemoryAds);
    return res.json({ success: true, message: 'Publicité supprimée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Statistiques administratives de monétisation
app.get('/api/billing/admin/monetization-stats', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const totalImpressions = inMemoryAds.reduce((acc, a) => acc + (a.impressions_count || 0), 0);
  const totalClicks = inMemoryAds.reduce((acc, a) => acc + (a.clicks_count || 0), 0);
  return res.json({
    success: true,
    data: {
      invoices: {
        total_invoices: inMemoryInvoices.length,
        paid_invoices: inMemoryInvoices.filter(i => i.status === 'paid').length,
        awaiting_validation_invoices: inMemoryInvoices.filter(i => i.status === 'awaiting_validation').length,
        pending_invoices: inMemoryInvoices.filter(i => i.status === 'pending').length,
        rejected_invoices: inMemoryInvoices.filter(i => i.status === 'rejected' || i.status === 'failed').length,
        refunded_invoices: inMemoryInvoices.filter(i => i.status === 'refunded').length,
        total_revenue_usd: inMemoryInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount || 0), 0),
        total_revenue_cdf: inMemoryInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount_cdf || 0), 0),
        boost_invoices: inMemoryInvoices.filter(i => i.invoice_type === 'boost').length,
        subscription_invoices: inMemoryInvoices.filter(i => i.invoice_type === 'subscription').length
      },
      activeBoosts: inMemoryInvoices.filter(i => i.invoice_type === 'boost' && i.status === 'paid').length,
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
  const now = Date.now();
  // RÈGLES STRICTES : Affiche exclusivement les biens réels validés par l'administrateur
  const validSlides = inMemorySlides.filter((slide) => {
    if (!slide || slide.isActive === false) return false;
    // Condition 1: Le bien doit exister
    if (!slide.propertyId) return false;
    const prop = inMemoryProperties.find((p: any) => p.id === slide.propertyId);
    if (!prop) return false;

    // Condition 2: Le bien doit être publié
    if (prop.published === false) return false;

    // Condition 3: Le bien ne doit pas être vendu, supprimé, archivé ou suspendu
    const status = String(prop.status || '').toLowerCase();
    if (status === 'sold' || status === 'archived' || status === 'draft' || status === 'rented') return false;

    // Condition 4: Le bien doit avoir été validé par l'administrateur (featured)
    const isFeatured = prop.featured === true || (Array.isArray(prop.labels) && prop.labels.includes('featured'));
    if (!isFeatured) return false;

    // Condition 5: La période de mise en avant doit être active
    if (prop.boostExpiresAt) {
      const expTime = new Date(prop.boostExpiresAt).getTime();
      if (!isNaN(expTime) && expTime < now) return false;
    }

    return true;
  });

  return res.json({ success: true, count: validSlides.length, slides: validSlides });
});

app.get('/api/showcase/admin', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  return res.json({ success: true, count: inMemorySlides.length, slides: inMemorySlides });
});

const handleCreateShowcaseSlide = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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
};
app.post('/api/showcase', handleCreateShowcaseSlide);
app.post('/api/showcase/admin', handleCreateShowcaseSlide);

const handleUpdateShowcaseSlide = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    const idx = inMemorySlides.findIndex(s => s.id === id);
    if (idx !== -1) {
      inMemorySlides[idx] = { ...inMemorySlides[idx], ...req.body, id };
      saveLocalSlides(inMemorySlides);
      return res.json({ success: true, slide: inMemorySlides[idx] });
    }
    return res.status(404).json({ success: false, error: 'Diapositive non trouvée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.put('/api/showcase/:id', handleUpdateShowcaseSlide);
app.put('/api/showcase/admin/:id', handleUpdateShowcaseSlide);

const handleDeleteShowcaseSlide = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const { id } = req.params;
    inMemorySlides = inMemorySlides.filter(s => s.id !== id);
    saveLocalSlides(inMemorySlides);
    return res.json({ success: true, message: 'Diapositive supprimée' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.delete('/api/showcase/:id', handleDeleteShowcaseSlide);
app.delete('/api/showcase/admin/:id', handleDeleteShowcaseSlide);

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
    const analysis = analyzePropertyForFraud(property, inMemoryProperties, inMemoryReports);
    return res.json({ success: true, analysis });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Audit global de toutes les annonces (Admin)
app.get('/api/fraud/audit', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
    const audit = auditPropertyList(inMemoryProperties, inMemoryReports);
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

// Récupérer la liste des signalements (Admin)
app.get('/api/fraud/reports', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  return res.json({ success: true, count: inMemoryReports.length, reports: inMemoryReports });
});

// Mettre à jour le statut d'un signalement (Admin)
app.put('/api/fraud/reports/:id', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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

// Sauvegarder la configuration Cloudinary (Admin)
app.post('/api/cloudinary/config', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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

// Tester la connexion Cloudinary (Admin)
app.post('/api/cloudinary/test', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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

// Téléverser une vidéo vers Cloudinary (Utilisateur authentifié)
app.post('/api/cloudinary/upload', (req: Request, res: Response, next) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise pour téléverser une vidéo.' });
  return next();
}, videoMulter.single('video'), async (req: Request, res: Response) => {
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
      if (uploadResult.duration && Number(uploadResult.duration) > MAX_VIDEO_DURATION_SECONDS) {
        if (uploadResult.public_id) {
          cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: 'video', invalidate: true }).catch(() => {});
        }
        return res.status(400).json({
          success: false,
          error: `Vidéo trop longue (${Math.round(Number(uploadResult.duration))}s). Maximum autorisé : 60 secondes.`
        });
      }
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

const imageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// Générer une signature Cloudinary sécurisée pour upload direct navigateur (photos & vidéos)
app.post('/api/cloudinary/sign', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });

  serverCloudinaryConfig = loadCloudinaryConfig();
  if (!serverCloudinaryConfig.cloudName) {
    return res.status(400).json({ success: false, error: 'Cloudinary Cloud Name non configuré.' });
  }

  const resourceType = req.body?.resourceType === 'video' ? 'video' : 'image';
  const defaultFolder = resourceType === 'video' ? 'kinimmo/property_videos' : 'kinimmo/property_images';
  const folder = typeof req.body?.folder === 'string' && req.body.folder.trim() ? req.body.folder.trim() : defaultFolder;
  const purpose = req.body?.purpose || (folder.includes('floor_plan') ? 'floor_plan' : resourceType === 'video' ? 'property_video' : 'property_photo');

  const quotas = getUserMediaQuotasServer(user.id);
  const check = validateMediaUploadServer({
    purpose,
    resourceType,
    mimeType: req.body?.mimeType,
    fileSize: req.body?.fileSize,
    fileCount: req.body?.fileCount,
    currentPhotoCount: req.body?.currentPhotoCount,
    duration: req.body?.duration,
    maxPlanPhotos: quotas.maxPlanPhotos,
    maxPlanVideos: quotas.maxPlanVideos,
    usedVideos: quotas.usedVideos,
    isAdmin: user.role === 'admin',
  });
  if (!check.valid) {
    return res.status(check.status || 400).json({ success: false, error: check.message, message: check.message });
  }

  const timestamp = Math.floor(Date.now() / 1000);

  if (serverCloudinaryConfig.apiKey && serverCloudinaryConfig.apiSecret) {
    const signature = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${serverCloudinaryConfig.apiSecret}`)
      .digest('hex');
    return res.json({
      success: true,
      mode: 'signed',
      cloudName: serverCloudinaryConfig.cloudName,
      apiKey: serverCloudinaryConfig.apiKey,
      timestamp,
      signature,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/${resourceType}/upload`
    });
  }

  if (serverCloudinaryConfig.uploadPreset) {
    return res.json({
      success: true,
      mode: 'unsigned',
      cloudName: serverCloudinaryConfig.cloudName,
      uploadPreset: serverCloudinaryConfig.uploadPreset,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/${resourceType}/upload`
    });
  }

  return res.status(400).json({ success: false, error: 'Identifiants Cloudinary incomplets.' });
});

// Suppression sécurisée d'un média Cloudinary côté serveur
app.post('/api/cloudinary/destroy', async (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });

  const { publicId, url, resourceType, propertyId } = req.body || {};
  if (propertyId && user.role !== 'admin') {
    const prop = inMemoryProperties.find((p) => p.id === propertyId);
    if (prop && !canManageProperty(user, prop)) {
      return res.status(403).json({ success: false, error: 'Accès interdit pour supprimer ce média.' });
    }
  }
  const result = await destroyFromCloudinaryServer({ publicId, url, resourceType });
  return res.json({ success: Boolean(result.success || result.skipped), ...result });
});

// Détection d'empreinte dHash / URL déjà utilisée sur d'autres annonces (P2)
app.post('/api/media/check-fingerprint', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const fingerprints = Array.isArray(req.body?.fingerprints) ? req.body.fingerprints : [];
  const imageUrls = Array.isArray(req.body?.imageUrls) ? req.body.imageUrls : [];
  const excludePropertyId = req.body?.excludePropertyId ? String(req.body.excludePropertyId) : null;
  const matches = findDuplicateFingerprintsInMemory(fingerprints, imageUrls, excludePropertyId);
  return res.json({
    success: true,
    duplicateDetected: matches.length > 0,
    matches,
  });
});

// Téléverser une photo vers Cloudinary (multipart ou base64 JSON)
app.post('/api/cloudinary/upload-image', (req: Request, res: Response, next) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise pour téléverser une photo.' });
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    return imageMulter.single('image')(req, res, next);
  }
  return next();
}, async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req)!;
    serverCloudinaryConfig = loadCloudinaryConfig();
    applyCloudinarySettings(serverCloudinaryConfig);

    const file = req.file;
    const dataUrl = req.body?.image || req.body?.fileData || req.body?.dataUrl;

    if (!file && !dataUrl) {
      return res.status(400).json({ success: false, error: 'Aucune photo transmise.' });
    }

    const quotas = getUserMediaQuotasServer(user.id);
    const check = validateMediaUploadServer({
      purpose: req.body?.purpose || 'property_photo',
      resourceType: 'image',
      mimeType: file?.mimetype || req.body?.mimeType,
      fileSize: file?.size || req.body?.fileSize,
      fileCount: req.body?.fileCount || 1,
      currentPhotoCount: req.body?.currentPhotoCount || 0,
      maxPlanPhotos: quotas.maxPlanPhotos,
      isAdmin: user.role === 'admin',
    });
    if (!check.valid) {
      return res.status(check.status || 400).json({ success: false, error: check.message, message: check.message });
    }
    const targetFolder = typeof req.body?.folder === 'string' && req.body.folder.trim()
      ? req.body.folder.trim()
      : 'kinimmo/property_images';

    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.apiSecret && serverCloudinaryConfig.apiKey) {
      let uploadResult: any;
      if (file) {
        uploadResult = await new Promise<any>((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'image',
              folder: targetFolder,
              transformation: [{ quality: 'auto:good', fetch_format: 'auto' }]
            },
            (err, result) => (err ? reject(err) : resolve(result))
          );
          stream.end(file.buffer);
        });
      } else {
        uploadResult = await cloudinary.uploader.upload(String(dataUrl), {
          resource_type: 'image',
          folder: targetFolder,
          transformation: [{ quality: 'auto:good', fetch_format: 'auto' }]
        });
      }

      return res.json({
        success: true,
        url: uploadResult.url,
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        thumbnail_url: uploadResult.secure_url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height
      });
    }

    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.uploadPreset) {
      const endpoint = `https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/image/upload`;
      const formData = new FormData();
      if (file) {
        formData.append('file', new Blob([file.buffer], { type: file.mimetype }), file.originalname);
      } else {
        formData.append('file', String(dataUrl));
      }
      formData.append('upload_preset', serverCloudinaryConfig.uploadPreset);
      formData.append('folder', 'kinimmo/property_images');

      const fetchRes = await fetch(endpoint, { method: 'POST', body: formData });
      const cloudData: any = await fetchRes.json();
      if (!fetchRes.ok) {
        throw new Error(cloudData?.error?.message || 'Erreur Cloudinary');
      }
      return res.json({
        success: true,
        url: cloudData.url,
        secure_url: cloudData.secure_url,
        public_id: cloudData.public_id,
        thumbnail_url: cloudData.secure_url,
        format: cloudData.format,
        bytes: cloudData.bytes,
        width: cloudData.width,
        height: cloudData.height
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Cloudinary n\'est pas configuré.'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Erreur lors du téléversement photo vers Cloudinary.'
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
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }
    const userVideos = authUser.role === 'admin'
      ? [...inMemoryVideos]
      : inMemoryVideos.filter(v => v.userId === authUser.id);
    return res.json({
      success: true,
      count: userVideos.length,
      data: { videos: userVideos }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.2-bis Signalements vidéos (Admin) — placé avant /:id pour éviter collision de route
let inMemoryVideoReports: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_VIDEO_REPORTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_VIDEO_REPORTS_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
})();

function saveLocalVideoReports(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_VIDEO_REPORTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
}

app.get('/api/videos/admin/reports', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (authUser.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  return res.json({ success: true, count: inMemoryVideoReports.length, data: { reports: inMemoryVideoReports }, reports: inMemoryVideoReports });
});

app.patch('/api/videos/admin/reports/:id', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (authUser.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const { id } = req.params;
  const idx = inMemoryVideoReports.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Signalement introuvable.' });
  inMemoryVideoReports[idx] = { ...inMemoryVideoReports[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveLocalVideoReports(inMemoryVideoReports);
  return res.json({ success: true, data: { report: inMemoryVideoReports[idx] } });
});

// 9.9 Modérer les publications dans l’espace administrateur (placé avant /:id)
app.get('/api/videos/admin/all', (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (authUser.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (authUser.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
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

// 9.3 Consulter les détails d’une vidéo spécifique
app.get('/api/videos/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const video = inMemoryVideos.find(v => v.id === id);
    if (!video) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable.' });
    }
    if (video.status !== 'approved') {
      const authUser = getAuthUser(req);
      if (!authUser || (authUser.role !== 'admin' && video.userId !== authUser.id)) {
        return res.status(403).json({ success: false, error: 'Vidéo non encore approuvée.' });
      }
    }
    return res.json({ success: true, data: { video } });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 9.4 Publier une vidéo ou soumettre une publication
app.post('/api/videos', (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: 'Authentification requise pour publier une vidéo.' });
    }
    const { propertyId, videoUrl, thumbnailUrl, description, duration, status = 'pending' } = req.body;

    if (!propertyId || !videoUrl) {
      return res.status(400).json({ success: false, error: 'L\'ID de l\'annonce et l\'URL de la vidéo sont obligatoires.' });
    }
    if (duration !== undefined && duration !== null && Number(duration) > MAX_VIDEO_DURATION_SECONDS) {
      return res.status(400).json({ success: false, error: `Vidéo trop longue (${Math.round(Number(duration))}s). Maximum autorisé : 60 secondes.` });
    }

    // Récupérer les informations de la propriété depuis le store live
    const linkedProp = inMemoryProperties.find(p => p.id === propertyId);
    if (linkedProp && !canManageProperty(authUser, linkedProp)) {
      return res.status(403).json({ success: false, error: 'Vous ne pouvez associer une vidéo qu\'à vos propres annonces.' });
    }

    const newVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      propertyId,
      userId: authUser.id,
      videoUrl,
      thumbnailUrl: thumbnailUrl || linkedProp?.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
      description: description || '',
      status: status === 'draft' ? 'draft' : (authUser.role === 'admin' && status === 'approved' ? 'approved' : 'pending'),
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
      agentName: linkedProp?.agencyName || authUser.agencyName || authUser.name || 'Agent Immobilier Kinimmo',
      agencyName: linkedProp?.agencyName || authUser.agencyName,
      agentPhone: linkedProp?.contactPhone || authUser.phone,
      agentWhatsapp: linkedProp?.contactPhone || authUser.whatsapp || authUser.phone,
      agentVerified: Boolean(authUser.isVerified)
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
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    const { id } = req.params;
    const idx = inMemoryVideos.findIndex(v => v.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable.' });
    }
    if (authUser.role !== 'admin' && inMemoryVideos[idx].userId !== authUser.id) {
      return res.status(403).json({ success: false, error: 'Accès interdit : vous ne pouvez modifier que vos propres vidéos.' });
    }

    const { status: reqStatus, ...safeBody } = req.body || {};
    const nextStatus = authUser.role === 'admin' && reqStatus
      ? reqStatus
      : (reqStatus === 'draft' || reqStatus === 'pending' ? reqStatus : inMemoryVideos[idx].status);

    inMemoryVideos[idx] = {
      ...inMemoryVideos[idx],
      ...safeBody,
      id,
      userId: inMemoryVideos[idx].userId,
      status: nextStatus,
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
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    const { id } = req.params;
    const target = inMemoryVideos.find(v => v.id === id);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Vidéo introuvable.' });
    }
    if (authUser.role !== 'admin' && target.userId !== authUser.id) {
      return res.status(403).json({ success: false, error: 'Accès interdit : vous ne pouvez supprimer que vos propres vidéos.' });
    }

    inMemoryVideos = inMemoryVideos.filter(v => v.id !== id);
    saveLocalVideos(inMemoryVideos);
    if (target.videoUrl && String(target.videoUrl).includes('cloudinary.com')) {
      destroyFromCloudinaryServer({ url: target.videoUrl, resourceType: 'video' }).catch(() => {});
    }
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

// 9.7-bis Signaler une vidéo
app.post('/api/videos/:id/report', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, details, reporterName, reporterContact } = req.body || {};
    if (!reason) return res.status(400).json({ success: false, error: 'Le motif du signalement est requis.' });
    const video = inMemoryVideos.find(v => v.id === id);
    const report = {
      id: `vrep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      videoId: id,
      propertyId: video?.propertyId || null,
      propertyTitle: video?.propertyTitle || 'Visite vidéo',
      reason,
      details: details || '',
      reporterName: reporterName || 'Utilisateur',
      reporterContact: reporterContact || '',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    inMemoryVideoReports.unshift(report);
    saveLocalVideoReports(inMemoryVideoReports);
    return res.status(201).json({ success: true, message: 'Signalement vidéo enregistré.', data: { report } });
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

// ==========================================
// 10. API REST ANNONCES, STATUTS & CYCLES DE VIE
// ==========================================

// Helper ownership propriétés
const canManageProperty = (user: AuthUser, prop: any): boolean => {
  if (!user || !prop) return false;
  if (user.role === 'admin') return true;
  if (prop.agentId && prop.agentId === user.id) return true;
  if (prop.userId && prop.userId === user.id) return true;
  if (user.agencyId && prop.agencyId && prop.agencyId === user.agencyId) return true;
  if (user.role === 'agency' && prop.agencyId === user.id) return true;
  if (user.email && prop.contactEmail && prop.contactEmail.toLowerCase() === user.email.toLowerCase()) return true;
  return false;
};

// 10.1 Récupérer les propriétés avec filtres
app.get('/api/properties', (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    const { commune, type, status, listingStatus, search, limit = '100', offset = '0', include_unpublished } = req.query;
    let list = [...inMemoryProperties];

    // Filtrer les biens non publiés sauf pour l'admin ou le propriétaire du bien
    const allowUnpublished = include_unpublished === 'true' && authUser;
    list = list.filter((p) => {
      const ls = String(p.listingStatus || '').toUpperCase();
      const isPublic = p.published !== false && ls !== 'DRAFT' && ls !== 'ARCHIVED' && ls !== 'PENDING_REVIEW';
      if (isPublic) return true;
      if (allowUnpublished && canManageProperty(authUser!, p)) return true;
      if (authUser?.role === 'admin' && include_unpublished === 'true') return true;
      return false;
    });

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
    const paginated = list
      .slice(Number(offset), Number(offset) + Number(limit))
      .map((p) => sanitizePropertyForViewer(p, authUser));
    return res.json({ success: true, count: total, properties: paginated, data: paginated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Upload direct de vidéo de propriété
const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'videos');
    if (!fs.existsSync(dir)) {
      try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `video_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});
const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }
});

app.post('/api/properties/upload-video', (req: Request, res: Response, next) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentification requise pour téléverser une vidéo.' });
  }
  return next();
}, videoUpload.single('video'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Aucun fichier vidéo reçu.' });
  }
  return res.json({
    success: true,
    message: 'Vidéo téléversée avec succès.',
    url: `/uploads/videos/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size
  });
});

// 10.2 Détail d'une propriété
app.get('/api/properties/:id', (req: Request, res: Response) => {
  const prop = inMemoryProperties.find(p => p.id === req.params.id);
  if (!prop) {
    return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
  }
  const authUser = getAuthUser(req);
  const ls = String(prop.listingStatus || '').toUpperCase();
  const isPublic = prop.published !== false && ls !== 'DRAFT' && ls !== 'ARCHIVED' && ls !== 'PENDING_REVIEW';
  if (!isPublic) {
    if (!authUser || !canManageProperty(authUser, prop)) {
      return res.status(403).json({ success: false, error: 'Cette annonce n\'est pas publique.' });
    }
  }
  return res.json({ success: true, property: sanitizePropertyForViewer(prop, authUser) });
});

// 10.3 Créer une propriété
app.post('/api/properties', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    const body = req.body || {};

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Règle métier Kinimmo : Vous devez être connecté pour publier une annonce.'
      });
    }

    const id = body.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();
    const listingStatus = String(body.listingStatus || (body.published === false ? 'DRAFT' : 'PUBLISHED')).toUpperCase();
    const isDraft = listingStatus === 'DRAFT' || listingStatus === 'ARCHIVED';
    const isAvailable = listingStatus === 'PUBLISHED';

    const { trust_status: _ts, trust_score: _tsc, trust_verified_at: _tva, ...safeBody } = body;
    const rawImages = Array.isArray(safeBody.images) ? safeBody.images.filter(Boolean) : [];

    if (!isDraft && listingStatus === 'PUBLISHED' && rawImages.length < MIN_PROPERTY_PHOTOS) {
      return res.status(400).json({
        success: false,
        error: `Au moins ${MIN_PROPERTY_PHOTOS} photos sont requises pour publier une annonce publiquement (actuellement ${rawImages.length}). Enregistrez en brouillon pour continuer plus tard.`,
      });
    }

    const quotas = getUserMediaQuotasServer(user.id);
    const effectiveMaxPhotos = user.role === 'admin'
      ? MAX_PROPERTY_PHOTOS
      : Math.min(MAX_PROPERTY_PHOTOS, Math.max(MIN_PROPERTY_PHOTOS, quotas.maxPlanPhotos || MAX_PROPERTY_PHOTOS));

    if (rawImages.length > effectiveMaxPhotos) {
      return res.status(400).json({
        success: false,
        error: `Nombre maximum de photos dépassé (${rawImages.length}/${effectiveMaxPhotos} max).`,
      });
    }

    const tourCheck = validateVirtualTourDomainServer(safeBody.virtualTourUrl, inMemorySettings.virtual_tour_allowed_domains);
    if (!tourCheck.valid) {
      return res.status(400).json({ success: false, error: tourCheck.message });
    }

    if (safeBody.videoDuration !== undefined && Number(safeBody.videoDuration) > MAX_VIDEO_DURATION_SECONDS) {
      return res.status(400).json({ success: false, error: `La vidéo ne peut pas dépasser ${MAX_VIDEO_DURATION_SECONDS} secondes.` });
    }

    const persistedImages = (await Promise.all(rawImages.map((img: unknown, idx: number) => saveBase64PropertyImage(img, id, idx)))).filter(Boolean);
    const persistedFloorPlan = safeBody.floorPlanUrl
      ? await saveBase64PropertyImage(safeBody.floorPlanUrl, `${id}_plan`, 0)
      : undefined;

    const fingerprints: string[] = Array.isArray(safeBody.imageFingerprints)
      ? safeBody.imageFingerprints
      : Array.isArray(safeBody.imagesMeta)
      ? safeBody.imagesMeta.map((m: any) => m?.fingerprint).filter(Boolean)
      : [];
    const dupMatches = findDuplicateFingerprintsInMemory(fingerprints, persistedImages, null);
    let fraudStatus = safeBody.fraudStatus || 'normal';
    const fraudFlags = Array.isArray(safeBody.fraudFlags) ? [...safeBody.fraudFlags] : [];
    if (dupMatches.length > 0) {
      if (fraudStatus === 'normal') fraudStatus = 'review_required';
      if (!fraudFlags.some((f: any) => f.code === 'DUPLICATE_PHOTOS')) {
        fraudFlags.push({
          code: 'DUPLICATE_PHOTOS',
          label: 'Empreinte photo déjà utilisée sur une autre annonce',
          severity: 'high',
          details: dupMatches.map((m) => `${m.propertyTitle} (${m.propertyId})`).join(', '),
        });
      }
    }

    const newProp = normalizePropertyRecord({
      ...safeBody,
      images: persistedImages,
      ...(persistedFloorPlan ? { floorPlanUrl: persistedFloorPlan } : {}),
      virtualTourUrl: tourCheck.normalizedUrl,
      imageFingerprints: fingerprints,
      fraudStatus,
      fraudFlags,
      id,
      userId: user.id,
      agentId: user.role === 'admin' && body.agentId ? body.agentId : user.id,
      agencyId: user.role === 'agency' ? (user.agencyId || user.id) : (body.agencyId || user.agencyId),
      agencyName: body.agencyName || user.agencyName,
      contactEmail: body.contactEmail || user.email,
      contactPhone: body.contactPhone || user.phone,
      listingStatus,
      isAvailable,
      published: !isDraft && body.published !== false && fraudStatus !== 'suspect',
      status: listingStatus === 'SOLD' ? 'sold' : (body.status || 'for-sale'),
      createdAt: body.createdAt || nowIso,
      updatedAt: nowIso,
      statusHistory: [
        {
          id: `hist_${Date.now()}`,
          fromStatus: 'NONE',
          toStatus: listingStatus,
          changedByUserId: user.id,
          changedByName: user.name || 'Agent Kinimmo',
          changedAt: nowIso,
          note: isDraft ? 'Enregistrement en brouillon' : 'Création initiale de l\'annonce'
        }
      ]
    });

    if (newProp.videoUrl) {
      newProp.videoModerationStatus = ensurePendingVideoModerationInMemory({ prop: newProp, user, videoUrl: newProp.videoUrl });
    }

    inMemoryProperties.unshift(newProp);
    saveLocalProperties(inMemoryProperties);
    return res.status(201).json({
      success: true,
      message: isDraft ? 'Brouillon enregistré avec succès.' : 'Annonce créée avec succès.',
      duplicateMatches: dupMatches,
      property: newProp
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 10.4 Mettre à jour une propriété
app.put('/api/properties/:id', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentification requise pour modifier une annonce.' });
    }

    const { id } = req.params;
    const idx = inMemoryProperties.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
    }

    const current = inMemoryProperties[idx];
    if (!canManageProperty(user, current)) {
      return res.status(403).json({ success: false, error: 'Accès interdit : vous ne pouvez modifier que vos propres annonces.' });
    }

    const incoming = req.body || {};
    const {
      trust_status: _ts,
      trust_score: _tsc,
      trust_verified_at: _tva,
      trust_expires_at: _tea,
      ...safeIncoming
    } = incoming;

    const oldStatus = current.listingStatus || (current.status === 'sold' ? 'SOLD' : 'PUBLISHED');
    const newStatus = safeIncoming.listingStatus ? String(safeIncoming.listingStatus).toUpperCase() : oldStatus;
    const isDraft = newStatus === 'DRAFT' || newStatus === 'ARCHIVED';

    const rawImages = Array.isArray(safeIncoming.images) ? safeIncoming.images.filter(Boolean) : current.images || [];
    if (!isDraft && newStatus === 'PUBLISHED' && rawImages.length < MIN_PROPERTY_PHOTOS) {
      return res.status(400).json({
        success: false,
        error: `Au moins ${MIN_PROPERTY_PHOTOS} photos sont requises pour publier une annonce publiquement (actuellement ${rawImages.length}).`,
      });
    }
    if (rawImages.length > MAX_PROPERTY_PHOTOS) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_PROPERTY_PHOTOS} photos autorisées par annonce.`,
      });
    }

    if (safeIncoming.virtualTourUrl !== undefined) {
      const tourCheck = validateVirtualTourDomainServer(safeIncoming.virtualTourUrl, inMemorySettings.virtual_tour_allowed_domains);
      if (!tourCheck.valid) {
        return res.status(400).json({ success: false, error: tourCheck.message });
      }
      safeIncoming.virtualTourUrl = tourCheck.normalizedUrl;
    }

    if (safeIncoming.videoDuration !== undefined && Number(safeIncoming.videoDuration) > MAX_VIDEO_DURATION_SECONDS) {
      return res.status(400).json({ success: false, error: `La vidéo ne peut pas dépasser ${MAX_VIDEO_DURATION_SECONDS} secondes.` });
    }

    const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [];
    if (newStatus !== oldStatus) {
      history.push({
        id: `hist_${Date.now()}`,
        fromStatus: oldStatus,
        toStatus: newStatus,
        changedByUserId: user.id,
        changedByName: user.name || 'Utilisateur Kinimmo',
        changedAt: new Date().toISOString(),
        note: safeIncoming.statusNote || `Mise à jour du statut vers ${newStatus}`
      });
    }

    const incomingImages = Array.isArray(safeIncoming.images)
      ? (await Promise.all(rawImages.map((img: unknown, i: number) => saveBase64PropertyImage(img, id, i)))).filter(Boolean)
      : current.images || [];

    const nextFloorPlan = safeIncoming.floorPlanUrl !== undefined
      ? (safeIncoming.floorPlanUrl ? await saveBase64PropertyImage(safeIncoming.floorPlanUrl, `${id}_plan`, 0) : undefined)
      : current.floorPlanUrl;

    const fingerprints: string[] = Array.isArray(safeIncoming.imageFingerprints)
      ? safeIncoming.imageFingerprints
      : Array.isArray(safeIncoming.imagesMeta)
      ? safeIncoming.imagesMeta.map((m: any) => m?.fingerprint).filter(Boolean)
      : (current.imageFingerprints || []);
    const dupMatches = findDuplicateFingerprintsInMemory(fingerprints, incomingImages, id);
    let fraudStatus = safeIncoming.fraudStatus || current.fraudStatus || 'normal';
    const fraudFlags = Array.isArray(safeIncoming.fraudFlags) ? [...safeIncoming.fraudFlags] : (current.fraudFlags || []);
    if (dupMatches.length > 0) {
      if (fraudStatus === 'normal') fraudStatus = 'review_required';
      if (!fraudFlags.some((f: any) => f.code === 'DUPLICATE_PHOTOS')) {
        fraudFlags.push({
          code: 'DUPLICATE_PHOTOS',
          label: 'Empreinte photo déjà utilisée sur une autre annonce',
          severity: 'high',
          details: dupMatches.map((m) => `${m.propertyTitle} (${m.propertyId})`).join(', '),
        });
      }
    }

    const updated = normalizePropertyRecord({
      ...current,
      ...safeIncoming,
      images: incomingImages,
      floorPlanUrl: nextFloorPlan,
      imageFingerprints: fingerprints,
      fraudStatus,
      fraudFlags,
      id,
      userId: current.userId || user.id,
      agentId: user.role === 'admin' && safeIncoming.agentId ? safeIncoming.agentId : (current.agentId || user.id),
      listingStatus: newStatus,
      isAvailable: newStatus === 'PUBLISHED',
      published: !isDraft && safeIncoming.published !== false && fraudStatus !== 'suspect',
      status: newStatus === 'SOLD' ? 'sold' : (safeIncoming.status || current.status),
      statusHistory: history,
      updatedAt: new Date().toISOString()
    });

    if (updated.videoUrl && updated.videoUrl !== current.videoUrl) {
      updated.videoModerationStatus = ensurePendingVideoModerationInMemory({ prop: updated, user, videoUrl: updated.videoUrl });
    }

    // Nettoyage Cloudinary des médias retirés
    const prevImages = Array.isArray(current.images) ? current.images : [];
    for (const oldImg of prevImages) {
      if (oldImg && oldImg.includes('cloudinary.com') && !incomingImages.includes(oldImg)) {
        destroyFromCloudinaryServer({ url: oldImg, resourceType: 'image' }).catch(() => {});
      }
    }
    if (current.floorPlanUrl && current.floorPlanUrl.includes('cloudinary.com') && current.floorPlanUrl !== nextFloorPlan) {
      destroyFromCloudinaryServer({ url: current.floorPlanUrl, publicId: current.floorPlanPublicId, resourceType: 'image' }).catch(() => {});
    }
    if (current.videoUrl && current.videoUrl.includes('cloudinary.com') && updated.videoUrl !== current.videoUrl) {
      destroyFromCloudinaryServer({ url: current.videoUrl, publicId: current.videoPublicId, resourceType: 'video' }).catch(() => {});
    }

    inMemoryProperties[idx] = updated;
    saveLocalProperties(inMemoryProperties);
    return res.json({
      success: true,
      message: 'Annonce mise à jour avec succès.',
      duplicateMatches: dupMatches,
      property: updated
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 10.4-bis Supprimer une propriété
app.delete('/api/properties/:id', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentification requise pour supprimer une annonce.' });
    }
    const { id } = req.params;
    const idx = inMemoryProperties.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
    }
    const target = inMemoryProperties[idx];
    if (!canManageProperty(user, target)) {
      return res.status(403).json({ success: false, error: 'Accès interdit : vous ne pouvez supprimer que vos propres annonces.' });
    }

    if (Array.isArray(target.images)) {
      target.images.forEach((u: string) => {
        if (u && u.includes('cloudinary.com')) destroyFromCloudinaryServer({ url: u, resourceType: 'image' }).catch(() => {});
      });
    }
    if (target.floorPlanUrl && target.floorPlanUrl.includes('cloudinary.com')) {
      destroyFromCloudinaryServer({ url: target.floorPlanUrl, publicId: target.floorPlanPublicId, resourceType: 'image' }).catch(() => {});
    }
    if (target.videoUrl && target.videoUrl.includes('cloudinary.com')) {
      destroyFromCloudinaryServer({ url: target.videoUrl, publicId: target.videoPublicId, resourceType: 'video' }).catch(() => {});
    }

    inMemoryProperties.splice(idx, 1);
    saveLocalProperties(inMemoryProperties);
    return res.json({ success: true, message: 'Annonce supprimée avec succès.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 10.5 Mettre à jour le statut du cycle de vie (DRAFT, PENDING_REVIEW, PUBLISHED, RENTED, SOLD, ARCHIVED)
const handlePropertyStatusUpdate = (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }

    const { id } = req.params;
    const { status, note } = req.body;
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
    if (!canManageProperty(user, current)) {
      return res.status(403).json({ success: false, error: 'Accès interdit : vous ne pouvez modifier que vos propres annonces.' });
    }

    if (targetStatus === 'PUBLISHED') {
      const imgCount = Array.isArray(current.images) ? current.images.filter(Boolean).length : 0;
      if (imgCount < MIN_PROPERTY_PHOTOS) {
        return res.status(400).json({
          success: false,
          error: `Impossible de publier : au moins ${MIN_PROPERTY_PHOTOS} photos sont requises (actuellement ${imgCount}).`,
        });
      }
    }

    const oldStatus = current.listingStatus || (current.status === 'sold' ? 'SOLD' : 'PUBLISHED');

    const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [];
    history.push({
      id: `hist_${Date.now()}`,
      fromStatus: oldStatus,
      toStatus: targetStatus,
      changedByUserId: user.id,
      changedByName: user.name || 'Agent Kinimmo',
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
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentification requise.' });
    }

    const { id } = req.params;
    const { assignedAgentId, assignedAgentName } = req.body;
    const idx = inMemoryProperties.findIndex(p => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
    }

    if (!canManageProperty(user, inMemoryProperties[idx])) {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
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
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentification requise.' });
  }
  const prop = inMemoryProperties.find(p => p.id === req.params.id);
  if (!prop) {
    return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
  }
  if (!canManageProperty(user, prop)) {
    return res.status(403).json({ success: false, error: 'Accès interdit.' });
  }
  return res.json({ success: true, history: prop.statusHistory || [] });
});

// ==========================================
// 11. API REST GESTION DE L'AGENCE & COLLABORATEURS
// ==========================================

// 11.1 Liste des collaborateurs
app.get('/api/agency/collaborators', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin' && user.role !== 'agency' && user.role !== 'agent') {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }
    const { agencyId } = req.query;
    const effectiveAgencyId = user.role === 'admin' ? (agencyId ? String(agencyId) : null) : (user.agencyId || user.id);
    let list = inMemoryCollaborators;
    if (effectiveAgencyId) {
      list = list.filter(c => c.agencyId === effectiveAgencyId);
    }
    return res.json({ success: true, count: list.length, collaborators: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 11.2 Inviter un collaborateur
app.post('/api/agency/collaborators/invite', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin' && user.role !== 'agency') {
      return res.status(403).json({ success: false, error: 'Seules les agences ou administrateurs peuvent inviter un collaborateur.' });
    }
    const { agencyId, name, email, phone, whatsapp, role = 'agency_agent', permissions } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Le nom et l\'adresse e-mail sont obligatoires.' });
    }

    const targetAgencyId = user.role === 'admin' ? (agencyId || 'agency_default') : (user.agencyId || user.id);

    const newCollab = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: targetAgencyId,
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin' && user.role !== 'agency') {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }
    const { id } = req.params;
    const idx = inMemoryCollaborators.findIndex(c => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Collaborateur introuvable.' });
    }
    if (user.role !== 'admin' && inMemoryCollaborators[idx].agencyId !== (user.agencyId || user.id)) {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }

    inMemoryCollaborators[idx] = {
      ...inMemoryCollaborators[idx],
      ...req.body,
      id,
      agencyId: inMemoryCollaborators[idx].agencyId
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin' && user.role !== 'agency') {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }
    const { id } = req.params;
    const target = inMemoryCollaborators.find(c => c.id === id);
    if (!target) return res.status(404).json({ success: false, error: 'Collaborateur introuvable.' });
    if (user.role !== 'admin' && target.agencyId !== (user.agencyId || user.id)) {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin' && user.role !== 'agency' && user.role !== 'agent') {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }
    const { agencyId } = req.query;
    const effectiveAgencyId = user.role === 'admin' ? (agencyId ? String(agencyId) : null) : (user.agencyId || user.id);
    let list = inMemoryTransactions;
    if (effectiveAgencyId) {
      list = list.filter(t => t.agencyId === effectiveAgencyId || t.agentId === user.id);
    }
    return res.json({ success: true, count: list.length, transactions: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 11.6 Enregistrer une transaction d'agence
app.post('/api/agency/transactions', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
    if (user.role !== 'admin' && user.role !== 'agency' && user.role !== 'agent') {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }
    const body = req.body;
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: user.role === 'admin' ? (body.agencyId || 'agency_default') : (user.agencyId || user.id),
      propertyId: body.propertyId || '',
      propertyTitle: body.propertyTitle || 'Propriété Kinshasa',
      agentId: user.role === 'admin' ? (body.agentId || user.id) : user.id,
      agentName: body.agentName || user.name || 'Agent Immobilier',
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    const { target_type, status, applicant_id } = req.query;
    let list = [...inMemoryTrust.verifications];

    if (user.role !== 'admin') {
      list = list.filter((v) => v.applicantUserId === user.id);
    } else if (applicant_id) {
      list = list.filter((v) => v.applicantUserId === applicant_id);
    }

    if (target_type) {
      list = list.filter((v) => v.targetType === target_type);
    }
    if (status) {
      list = list.filter((v) => v.trustStatus === status);
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    const { id } = req.params;
    const verification = inMemoryTrust.verifications.find((v) => v.id === id);
    if (!verification) {
      return res.status(404).json({ success: false, message: 'Dossier Kinimmo Trust introuvable.' });
    }
    if (user.role !== 'admin' && verification.applicantUserId !== user.id) {
      return res.status(403).json({ success: false, message: 'Accès interdit à ce dossier de vérification.' });
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
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentification requise pour soumettre une demande Kinimmo Trust.' });
    }
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

      if (!canManageProperty(user, prop)) {
        return res.status(403).json({
          success: false,
          message: 'Règle métier Kinimmo Trust : Vous pouvez uniquement certifier les biens immobiliers qui vous appartiennent (que vous avez vous-même publiés). Il est strictement interdit de demander la certification d’un bien appartenant à un tiers.'
        });
      }
    } else if (target_type === 'agent' || target_type === 'agency') {
      const isSelf = user.id === target_id || (user.agencyId && user.agencyId === target_id) || user.role === 'admin';
      if (!isSelf) {
        return res.status(403).json({
          success: false,
          message: 'Règle métier Kinimmo Trust : Vous ne pouvez soumettre une vérification que pour votre propre profil.'
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
    const admin = getAuthUser(req);
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Authentification requise.' });
    }
    
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
    const admin = getAuthUser(req);
    if (!admin) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    if (admin.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès interdit : Rôle administrateur requis.' });
    }
    const { id } = req.params;
    const { message } = req.body;
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Accès interdit.' });
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
    const admin = getAuthUser(req);
    if (!admin) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    if (admin.role !== 'admin') return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
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
    const admin = getAuthUser(req);
    if (!admin) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    if (admin.role !== 'admin') return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
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
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    const { propertyId } = req.params;
    const { availability_status = 'available', confirmation_method = 'agent_statement', notes } = req.body;

    const prop = inMemoryProperties.find((p: any) => p.id === propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, message: 'Bien immobilier introuvable.' });
    }
    if (!canManageProperty(user, prop)) {
      return res.status(403).json({ success: false, message: 'Accès interdit : vous ne pouvez confirmer la disponibilité que pour vos propres annonces.' });
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
app.get('/api/trust/audit-logs', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    if (user.role !== 'admin') return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
    return res.json({ success: true, count: inMemoryTrust.auditLogs.length, data: inMemoryTrust.auditLogs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 10. Notifications de changement de statut
app.get('/api/trust/notifications', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    const list = inMemoryTrust.notifications.filter(
      (n) => n.userId === user.id || (user.role === 'admin' && n.userId === 'all')
    );
    return res.json({ success: true, count: list.length, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.put('/api/trust/notifications/:id/read', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: 'Authentification requise.' });
    const { id } = req.params;
    const notif = inMemoryTrust.notifications.find((n) => n.id === id);
    if (notif) {
      if (user.role !== 'admin' && notif.userId !== user.id && notif.userId !== 'all') {
        return res.status(403).json({ success: false, message: 'Accès interdit.' });
      }
      notif.isRead = true;
      saveLocalTrust(inMemoryTrust);
    }
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});


// ==========================================
// 12. PARITÉ API COMPLÈTE (CHAMPS, PARAMÈTRES, ADMIN, AGENTS, AGENCES, FAVORIS, MESSAGES, ANALYTICS, LEADS)
// ==========================================

// 12.1 Custom Fields
let inMemoryCustomFields: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_CUSTOM_FIELDS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_CUSTOM_FIELDS_FILE, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return Array.isArray(initialCustomFields) ? [...initialCustomFields] : [];
})();

function saveLocalCustomFields(list: any[]) {
  try { fs.writeFileSync(LOCAL_CUSTOM_FIELDS_FILE, JSON.stringify(list, null, 2), 'utf-8'); } catch {}
}

app.get('/api/custom-fields', (_req: Request, res: Response) => {
  const publicFields = inMemoryCustomFields.filter((f) => !f.isPrivate);
  return res.json({ success: true, count: publicFields.length, fields: publicFields });
});

app.get('/api/admin/custom-fields', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  return res.json({ success: true, count: inMemoryCustomFields.length, fields: inMemoryCustomFields });
});

app.post('/api/admin/custom-fields', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const body = req.body || {};
  if (!body.key) return res.status(400).json({ success: false, error: 'La clé du champ est obligatoire.' });
  const newField = {
    id: body.id || `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    key: String(body.key).trim(),
    label: body.label || { fr: body.labelFr || body.key, en: body.labelEn || body.key },
    type: body.type || 'text',
    unit: body.unit || undefined,
    options: Array.isArray(body.options) ? body.options : undefined,
    required: Boolean(body.required),
    isPrivate: Boolean(body.isPrivate),
    filterable: body.filterable !== false,
    showInCard: Boolean(body.showInCard),
    order: Number(body.order) || inMemoryCustomFields.length + 1
  };
  inMemoryCustomFields.push(newField);
  saveLocalCustomFields(inMemoryCustomFields);
  return res.status(201).json({ success: true, field: newField });
});

app.put('/api/admin/custom-fields/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const idx = inMemoryCustomFields.findIndex((f) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Champ introuvable.' });
  inMemoryCustomFields[idx] = { ...inMemoryCustomFields[idx], ...req.body, id: req.params.id };
  saveLocalCustomFields(inMemoryCustomFields);
  return res.json({ success: true, field: inMemoryCustomFields[idx] });
});

app.delete('/api/admin/custom-fields/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const initialLen = inMemoryCustomFields.length;
  inMemoryCustomFields = inMemoryCustomFields.filter((f) => f.id !== req.params.id);
  if (inMemoryCustomFields.length === initialLen) return res.status(404).json({ success: false, error: 'Champ introuvable.' });
  saveLocalCustomFields(inMemoryCustomFields);
  return res.json({ success: true, message: 'Champ supprimé.' });
});

// 12.2 Paramètres du site & VIP Conciergerie
const DEFAULT_SETTINGS = {
  site_name: 'Kinimmo RDC',
  contact_email: 'contact@kinimmo.cd',
  support_phone: '+243 84 529 4616',
  support_whatsapp: '+243 84 529 4616',
  office_address: 'Boulevard du 30 Juin, Gombe, Kinshasa',
  working_hours: 'Lun - Sam : 08h30 - 18h00',
  exchange_rate_usd_cdf: 2850,
  auto_approve_properties: true,
  vip_enabled: true,
  vip_title: 'Conciergerie Privée & VIP Kinshasa',
  vip_subtitle: 'Accompagnement sur mesure pour résidences et investissements',
  vip_phone: '+243 84 529 4616',
  vip_whatsapp: '+243 84 529 4616',
  vip_email: 'vip@kinimmo.cd',
  vip_message: 'Bonjour, je souhaite bénéficier du service de conciergerie VIP Kinimmo.',
  vip_description: 'Visites privées, vérifications juridiques et négociation clé en main.',
  virtual_tour_allowed_domains: JSON.stringify(DEFAULT_VIRTUAL_TOUR_DOMAINS),
};

let inMemorySettings: Record<string, any> = (() => {
  try {
    if (fs.existsSync(LOCAL_SETTINGS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_SETTINGS_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
})();

function saveLocalSettings(settings: Record<string, any>) {
  try { fs.writeFileSync(LOCAL_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8'); } catch {}
}

app.get('/api/settings/contact', (_req: Request, res: Response) => {
  return res.json({ success: true, settings: inMemorySettings });
});
app.get('/api/settings', (_req: Request, res: Response) => {
  return res.json({ success: true, settings: inMemorySettings });
});
app.get('/api/admin/settings', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  return res.json({ success: true, settings: inMemorySettings });
});
app.put('/api/admin/settings', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  inMemorySettings = { ...inMemorySettings, ...(req.body || {}), updated_at: new Date().toISOString() };
  saveLocalSettings(inMemorySettings);
  return res.json({ success: true, message: 'Paramètres mis à jour.', settings: inMemorySettings });
});

// 12.3 Agents & Agences
let inMemoryAgencies: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_AGENCIES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_AGENCIES_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return Array.isArray(initialAgencies) ? [...initialAgencies] : [];
})();
function saveLocalAgencies(list: any[]) {
  try { fs.writeFileSync(LOCAL_AGENCIES_FILE, JSON.stringify(list, null, 2), 'utf-8'); } catch {}
}

let inMemoryAgents: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_AGENTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_AGENTS_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return Array.isArray(initialAgents) ? [...initialAgents] : [];
})();
function saveLocalAgents(list: any[]) {
  try { fs.writeFileSync(LOCAL_AGENTS_FILE, JSON.stringify(list, null, 2), 'utf-8'); } catch {}
}

const normalizeAgentRecord = (a: any) => ({
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

const normalizeAgencyRecord = (ag: any) => ({
  ...ag,
  name: ag.name || ag.agencyName || 'Agence Immobilière',
  logo: ag.logo || ag.avatar || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80',
  address: ag.address || 'Kinshasa, RDC',
  city: ag.city || 'Kinshasa',
  phone: ag.phone || '+243 81 000 00 00',
  whatsapp: ag.whatsapp || ag.phone || '+243 81 000 00 00',
  rccm: ag.rccm || ag.rccmOrNif,
  description: ag.description || 'Agence immobilière partenaire à Kinshasa.',
  specialties: Array.isArray(ag.specialties) ? ag.specialties : ['Achat & Vente', 'Location', 'Conseil'],
  agentsCount: typeof ag.agentsCount === 'number' ? ag.agentsCount : 1,
});

const getMergedAgents = () => {
  const byId = new Map<string, any>();
  inMemoryAgents.forEach((a) => byId.set(a.id, normalizeAgentRecord(a)));
  inMemoryUsers
    .filter((u) => u.role === 'agent')
    .forEach((u) => {
      const { password: _p, ...safe } = u;
      const existing = byId.get(u.id) || {};
      byId.set(u.id, normalizeAgentRecord({
        ...safe,
        ...existing,
        id: u.id,
        name: existing.name || u.name,
        email: u.email,
        phone: existing.phone || u.phone,
        whatsapp: existing.whatsapp || u.whatsapp || u.phone,
        agencyName: existing.agencyName || u.agencyName,
        isVerified: Boolean(u.isVerified ?? existing.isVerified),
        listingsCount: inMemoryProperties.filter((p) => p.agentId === u.id || p.userId === u.id).length
      }));
    });
  return Array.from(byId.values());
};

const getMergedAgencies = () => {
  const byId = new Map<string, any>();
  inMemoryAgencies.forEach((ag) => byId.set(ag.id, normalizeAgencyRecord(ag)));
  inMemoryUsers
    .filter((u) => u.role === 'agency')
    .forEach((u) => {
      const { password: _p, ...safe } = u;
      const agId = u.agencyId || u.id;
      const existing = byId.get(agId) || {};
      byId.set(agId, normalizeAgencyRecord({
        ...safe,
        ...existing,
        id: agId,
        userId: u.id,
        name: existing.name || u.agencyName || u.name,
        email: existing.email || u.email,
        phone: existing.phone || u.phone,
        whatsapp: existing.whatsapp || u.whatsapp || u.phone,
        rccmOrNif: existing.rccmOrNif || u.rccmOrNif,
        isVerified: Boolean(u.isVerified ?? existing.isVerified),
        listingsCount: inMemoryProperties.filter((p) => p.agencyId === agId || p.userId === u.id).length
      }));
    });
  return Array.from(byId.values());
};

app.get('/api/agents', (_req: Request, res: Response) => {
  const agents = getMergedAgents();
  return res.json({ success: true, count: agents.length, agents });
});

app.get('/api/agents/:id', (req: Request, res: Response) => {
  const agent = getMergedAgents().find((a) => a.id === req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: 'Agent introuvable.' });
  return res.json({ success: true, agent });
});

app.put('/api/agents/profile', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const { password: _p, role: _r, isVerified: _v, kinshasaBadgeVerified: _k, id: _id, ...safeBody } = req.body || {};
  const uIdx = inMemoryUsers.findIndex((u) => u.id === user.id);
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = { ...inMemoryUsers[uIdx], ...safeBody };
    saveLocalUsers(inMemoryUsers);
  }
  const aIdx = inMemoryAgents.findIndex((a) => a.id === user.id);
  if (aIdx !== -1) {
    inMemoryAgents[aIdx] = { ...inMemoryAgents[aIdx], ...safeBody };
  } else {
    inMemoryAgents.push({ id: user.id, name: user.name, email: user.email, ...safeBody });
  }
  saveLocalAgents(inMemoryAgents);
  return res.json({ success: true, message: 'Profil agent mis à jour.', agent: getMergedAgents().find((a) => a.id === user.id) });
});

app.get('/api/agencies', (_req: Request, res: Response) => {
  const agencies = getMergedAgencies();
  return res.json({ success: true, count: agencies.length, agencies });
});

app.get('/api/agencies/:id', (req: Request, res: Response) => {
  const agency = getMergedAgencies().find((a) => a.id === req.params.id || a.userId === req.params.id);
  if (!agency) return res.status(404).json({ success: false, error: 'Agence introuvable.' });
  return res.json({ success: true, agency });
});

app.put('/api/agencies/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const { id } = req.params;
  if (user.role !== 'admin' && user.id !== id && user.agencyId !== id) {
    return res.status(403).json({ success: false, error: 'Accès interdit.' });
  }
  const { password: _p, role: _r, isVerified: _v, kinshasaBadgeVerified: _k, ...safeBody } = req.body || {};
  const idx = inMemoryAgencies.findIndex((a) => a.id === id);
  if (idx !== -1) {
    inMemoryAgencies[idx] = { ...inMemoryAgencies[idx], ...safeBody, id };
  } else {
    inMemoryAgencies.push({ id, ...safeBody });
  }
  saveLocalAgencies(inMemoryAgencies);
  return res.json({ success: true, message: 'Agence mise à jour.', agency: getMergedAgencies().find((a) => a.id === id) });
});

// 12.4 Favoris utilisateur
let inMemoryFavorites: Record<string, string[]> = (() => {
  try {
    if (fs.existsSync(LOCAL_FAVORITES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_FAVORITES_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
})();
function saveLocalFavorites(map: Record<string, string[]>) {
  try { fs.writeFileSync(LOCAL_FAVORITES_FILE, JSON.stringify(map, null, 2), 'utf-8'); } catch {}
}

app.get('/api/favorites', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const propIds = inMemoryFavorites[user.id] || [];
  const favorites = inMemoryProperties.filter((p) => propIds.includes(p.id));
  return res.json({ success: true, count: favorites.length, propertyIds: propIds, favorites });
});

app.post('/api/favorites/:propertyId', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const { propertyId } = req.params;
  const current = new Set(inMemoryFavorites[user.id] || []);
  current.add(propertyId);
  inMemoryFavorites[user.id] = Array.from(current);
  saveLocalFavorites(inMemoryFavorites);
  return res.json({ success: true, propertyIds: inMemoryFavorites[user.id] });
});

app.delete('/api/favorites/:propertyId', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const { propertyId } = req.params;
  inMemoryFavorites[user.id] = (inMemoryFavorites[user.id] || []).filter((id) => id !== propertyId);
  saveLocalFavorites(inMemoryFavorites);
  return res.json({ success: true, propertyIds: inMemoryFavorites[user.id] });
});

app.get('/api/favorites/check/:propertyId', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const isFavorite = (inMemoryFavorites[user.id] || []).includes(req.params.propertyId);
  return res.json({ success: true, isFavorite });
});

// 12.5 Messages & Leads CRM
let inMemoryMessages: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_MESSAGES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_MESSAGES_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
})();
function saveLocalMessages(list: any[]) {
  try { fs.writeFileSync(LOCAL_MESSAGES_FILE, JSON.stringify(list, null, 2), 'utf-8'); } catch {}
}

let inMemoryCrmLeads: any[] = (() => {
  try {
    if (fs.existsSync(LOCAL_CRM_LEADS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_CRM_LEADS_FILE, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return Array.isArray(initialLeads) ? [...initialLeads] : [];
})();
function saveLocalCrmLeads(list: any[]) {
  try { fs.writeFileSync(LOCAL_CRM_LEADS_FILE, JSON.stringify(list, null, 2), 'utf-8'); } catch {}
}

app.post('/api/messages', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const body = req.body || {};
  const { propertyId, agentId, senderName, senderEmail, senderPhone, message, type = 'info', visitDate } = body;
  if (!senderName || !message) {
    return res.status(400).json({ success: false, error: 'Nom et message requis.' });
  }
  const prop = propertyId ? inMemoryProperties.find((p) => p.id === propertyId) : null;
  const record = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    propertyId: propertyId || null,
    propertyTitle: prop?.title || body.propertyTitle || null,
    agentId: agentId || prop?.agentId || prop?.userId || null,
    agencyId: prop?.agencyId || null,
    senderUserId: authUser?.id || null,
    senderName,
    senderEmail: senderEmail || '',
    senderPhone: senderPhone || '',
    message,
    type,
    visitDate: visitDate || null,
    status: 'new',
    createdAt: new Date().toISOString()
  };
  inMemoryMessages.unshift(record);
  saveLocalMessages(inMemoryMessages);
  inMemoryCrmLeads.unshift({
    id: record.id,
    propertyId: record.propertyId,
    propertyTitle: record.propertyTitle,
    agentId: record.agentId,
    agencyId: record.agencyId,
    name: senderName,
    email: senderEmail || '',
    phone: senderPhone || '',
    message,
    type: type === 'tour' ? 'visit' : 'inquiry',
    status: 'new',
    createdAt: record.createdAt
  });
  saveLocalCrmLeads(inMemoryCrmLeads);
  return res.status(201).json({ success: true, message: 'Message envoyé avec succès.', data: record });
});

app.get('/api/messages/inbox', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  let list = [...inMemoryMessages];
  if (user.role !== 'admin') {
    list = list.filter((m) => m.agentId === user.id || m.agencyId === (user.agencyId || user.id) || m.senderUserId === user.id);
  }
  return res.json({ success: true, count: list.length, messages: list });
});

app.put('/api/messages/:id/status', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const idx = inMemoryMessages.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Message introuvable.' });
  const msg = inMemoryMessages[idx];
  if (user.role !== 'admin' && msg.agentId !== user.id && msg.agencyId !== (user.agencyId || user.id)) {
    return res.status(403).json({ success: false, error: 'Accès interdit.' });
  }
  inMemoryMessages[idx].status = req.body?.status || 'read';
  inMemoryMessages[idx].updatedAt = new Date().toISOString();
  saveLocalMessages(inMemoryMessages);
  return res.json({ success: true, data: inMemoryMessages[idx] });
});

app.get('/api/leads', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  let list = [...inMemoryCrmLeads];
  if (user.role !== 'admin') {
    list = list.filter((l) => l.agentId === user.id || l.agencyId === (user.agencyId || user.id));
  }
  return res.json({ success: true, count: list.length, leads: list, data: list });
});

app.post('/api/leads', (req: Request, res: Response) => {
  const body = req.body || {};
  const lead = {
    id: body.id || `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    ...body,
    status: body.status || 'new',
    createdAt: body.createdAt || new Date().toISOString()
  };
  inMemoryCrmLeads.unshift(lead);
  saveLocalCrmLeads(inMemoryCrmLeads);
  return res.status(201).json({ success: true, lead, data: lead });
});

app.put('/api/leads/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const idx = inMemoryCrmLeads.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Lead introuvable.' });
  if (user.role !== 'admin' && inMemoryCrmLeads[idx].agentId !== user.id && inMemoryCrmLeads[idx].agencyId !== (user.agencyId || user.id)) {
    return res.status(403).json({ success: false, error: 'Accès interdit.' });
  }
  inMemoryCrmLeads[idx] = { ...inMemoryCrmLeads[idx], ...(req.body || {}), id: req.params.id, updatedAt: new Date().toISOString() };
  saveLocalCrmLeads(inMemoryCrmLeads);
  return res.json({ success: true, lead: inMemoryCrmLeads[idx], data: inMemoryCrmLeads[idx] });
});

app.get('/api/invoices', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const list = user.role === 'admin' ? inMemoryInvoices : inMemoryInvoices.filter((i) => i.user_id === user.id);
  return res.json({ success: true, count: list.length, invoices: list, data: list });
});

// 12.6 Analytics
let inMemoryAnalytics: Record<string, { views: number; whatsapp: number; phone: number; shares: number; favorites: number }> = (() => {
  try {
    if (fs.existsSync(LOCAL_ANALYTICS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_ANALYTICS_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return {};
})();
function saveLocalAnalytics(data: typeof inMemoryAnalytics) {
  try { fs.writeFileSync(LOCAL_ANALYTICS_FILE, JSON.stringify(data, null, 2), 'utf-8'); } catch {}
}

app.post('/api/analytics/track', (req: Request, res: Response) => {
  const { propertyId, eventType = 'view' } = req.body || {};
  if (!propertyId) return res.status(400).json({ success: false, error: 'propertyId requis.' });
  if (!inMemoryAnalytics[propertyId]) {
    inMemoryAnalytics[propertyId] = { views: 0, whatsapp: 0, phone: 0, shares: 0, favorites: 0 };
  }
  if (eventType === 'view') inMemoryAnalytics[propertyId].views += 1;
  else if (eventType === 'whatsapp') inMemoryAnalytics[propertyId].whatsapp += 1;
  else if (eventType === 'phone') inMemoryAnalytics[propertyId].phone += 1;
  else if (eventType === 'share') inMemoryAnalytics[propertyId].shares += 1;
  else if (eventType === 'favorite') inMemoryAnalytics[propertyId].favorites += 1;
  saveLocalAnalytics(inMemoryAnalytics);

  if (eventType === 'view') {
    const pIdx = inMemoryProperties.findIndex((p) => p.id === propertyId);
    if (pIdx !== -1) {
      inMemoryProperties[pIdx].viewsCount = (inMemoryProperties[pIdx].viewsCount || 0) + 1;
      saveLocalProperties(inMemoryProperties);
    }
  }
  return res.json({ success: true, stats: inMemoryAnalytics[propertyId] });
});

app.get('/api/analytics/property/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const prop = inMemoryProperties.find((p) => p.id === req.params.id);
  if (prop && !canManageProperty(user, prop)) {
    return res.status(403).json({ success: false, error: 'Accès interdit.' });
  }
  const stats = inMemoryAnalytics[req.params.id] || { views: prop?.viewsCount || 0, whatsapp: 0, phone: 0, shares: 0, favorites: 0 };
  return res.json({ success: true, stats });
});

app.get('/api/analytics/my-performance', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  const myProps = inMemoryProperties.filter((p) => canManageProperty(user, p));
  const summary = myProps.reduce(
    (acc, p) => {
      const s = inMemoryAnalytics[p.id] || { views: p.viewsCount || 0, whatsapp: 0, phone: 0, shares: 0, favorites: 0 };
      acc.views += s.views || p.viewsCount || 0;
      acc.whatsapp += s.whatsapp || 0;
      acc.phone += s.phone || 0;
      acc.shares += s.shares || 0;
      acc.favorites += s.favorites || 0;
      return acc;
    },
    { propertiesCount: myProps.length, views: 0, whatsapp: 0, phone: 0, shares: 0, favorites: 0 }
  );
  return res.json({ success: true, summary });
});

// 12.7 Utilisateurs (/api/users)
const sanitizeUser = (u: StoredAccountRecord) => {
  const { password: _pwd, ...safe } = u;
  return safe;
};

app.get('/api/users', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const users = inMemoryUsers.map(sanitizeUser);
  return res.json({ success: true, count: users.length, users, data: users });
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const target = inMemoryUsers.find((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  const authUser = getAuthUser(req);
  if (authUser && (authUser.id === target.id || authUser.role === 'admin')) {
    return res.json({ success: true, user: sanitizeUser(target) });
  }
  return res.json({
    success: true,
    user: {
      id: target.id,
      name: target.name,
      role: target.role,
      agencyName: target.agencyName,
      avatar: target.avatar,
      isVerified: Boolean(target.isVerified)
    }
  });
});

app.put('/api/users/:id', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (authUser.role !== 'admin' && authUser.id !== req.params.id) {
    return res.status(403).json({ success: false, error: 'Accès interdit.' });
  }
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });

  const body = req.body || {};
  if (authUser.role !== 'admin') {
    const { password: _p, role: _r, id: _id, isVerified: _v, kinshasaBadgeVerified: _k, ...safeBody } = body;
    inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...safeBody, id: req.params.id };
  } else {
    const { id: _id, ...adminBody } = body;
    inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...adminBody, id: req.params.id };
  }
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, user: sanitizeUser(inMemoryUsers[idx]) });
});

// 12.8 Console d'Administration (/api/admin/*)
app.get('/api/admin/stats', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });

  const communeMap = new Map<string, number>();
  inMemoryProperties.forEach((p) => {
    const c = p.commune || 'Kinshasa';
    communeMap.set(c, (communeMap.get(c) || 0) + 1);
  });
  const topCommunes = Array.from(communeMap.entries())
    .map(([commune, count]) => ({ commune, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return res.json({
    success: true,
    stats: {
      totalUsers: inMemoryUsers.length,
      totalProperties: inMemoryProperties.length,
      activeProperties: inMemoryProperties.filter((p) => p.published !== false && p.status !== 'sold').length,
      soldProperties: inMemoryProperties.filter((p) => p.status === 'sold' || p.listingStatus === 'SOLD').length,
      totalAgents: getMergedAgents().length,
      totalAgencies: getMergedAgencies().length,
      totalMessages: inMemoryMessages.length,
      totalRevenueUsd: inMemoryInvoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount || 0), 0),
      topCommunes
    }
  });
});

app.get('/api/admin/users', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (user.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  return res.json({ success: true, count: inMemoryUsers.length, users: inMemoryUsers.map(sanitizeUser) });
});

app.post('/api/admin/users', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const { name, email, password, phone, role = 'user', agencyName, rccmOrNif } = req.body || {};
  if (!email || !password) return res.status(400).json({ success: false, error: 'Email et mot de passe requis.' });
  const cleanEmail = String(email).trim().toLowerCase();
  if (inMemoryUsers.some((u) => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ success: false, error: 'Cet email est déjà utilisé.' });
  }
  const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const record: StoredAccountRecord = {
    id: newId,
    name: name || cleanEmail.split('@')[0],
    email: cleanEmail,
    password: String(password).trim(),
    phone: phone || '',
    role,
    agencyId: role === 'agency' ? newId : undefined,
    agencyName: agencyName || undefined,
    rccmOrNif: rccmOrNif || undefined,
    isVerified: false,
    kinshasaBadgeVerified: false,
    createdAt: new Date().toISOString()
  };
  inMemoryUsers.unshift(record);
  saveLocalUsers(inMemoryUsers);
  return res.status(201).json({ success: true, user: sanitizeUser(record) });
});

app.put('/api/admin/users/:id', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  const { id: _id, ...updates } = req.body || {};
  inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...updates, id: req.params.id };
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, user: sanitizeUser(inMemoryUsers[idx]) });
});

app.put('/api/admin/users/:id/role', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  const { role } = req.body || {};
  if (!['admin', 'agent', 'agency', 'user', 'owner'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Rôle invalide.' });
  }
  inMemoryUsers[idx].role = role;
  if (role === 'agency' && !inMemoryUsers[idx].agencyId) {
    inMemoryUsers[idx].agencyId = inMemoryUsers[idx].id;
  }
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, user: sanitizeUser(inMemoryUsers[idx]) });
});

app.put('/api/admin/users/:id/verify', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  const verified = req.body?.isVerified !== undefined ? Boolean(req.body.isVerified) : true;
  inMemoryUsers[idx].isVerified = verified;
  inMemoryUsers[idx].kinshasaBadgeVerified = verified;
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, user: sanitizeUser(inMemoryUsers[idx]) });
});

app.put('/api/admin/users/:id/reset-password', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  const newPassword = req.body?.newPassword || req.body?.password;
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ success: false, error: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
  }
  inMemoryUsers[idx].password = String(newPassword).trim();
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
});

app.delete('/api/admin/users/:id', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  if (req.params.id === admin.id) {
    return res.status(400).json({ success: false, error: 'Impossible de supprimer votre propre compte administrateur actif.' });
  }
  const initialLen = inMemoryUsers.length;
  inMemoryUsers = inMemoryUsers.filter((u) => u.id !== req.params.id);
  if (inMemoryUsers.length === initialLen) return res.status(404).json({ success: false, error: 'Utilisateur introuvable.' });
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, message: 'Utilisateur supprimé.' });
});

app.get('/api/admin/properties', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  return res.json({ success: true, count: inMemoryProperties.length, properties: inMemoryProperties });
});

app.put('/api/admin/properties/:id/status', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const idx = inMemoryProperties.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Propriété introuvable.' });
  const { status, published, featured } = req.body || {};
  if (status !== undefined) {
    inMemoryProperties[idx].status = status;
    if (String(status).toUpperCase() === 'PUBLISHED') inMemoryProperties[idx].listingStatus = 'PUBLISHED';
    else if (String(status).toUpperCase() === 'ARCHIVED') inMemoryProperties[idx].listingStatus = 'ARCHIVED';
    else if (String(status).toUpperCase() === 'SOLD') inMemoryProperties[idx].listingStatus = 'SOLD';
  }
  if (published !== undefined) inMemoryProperties[idx].published = Boolean(published);
  if (featured !== undefined) inMemoryProperties[idx].featured = Boolean(featured);
  inMemoryProperties[idx].updatedAt = new Date().toISOString();
  saveLocalProperties(inMemoryProperties);
  return res.json({ success: true, property: inMemoryProperties[idx] });
});

app.delete('/api/admin/properties/:id', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const target = inMemoryProperties.find((p) => p.id === req.params.id);
  if (!target) return res.status(404).json({ success: false, error: 'Propriété introuvable.' });

  if (Array.isArray(target.images)) {
    target.images.forEach((u: string) => {
      if (u && u.includes('cloudinary.com')) destroyFromCloudinaryServer({ url: u, resourceType: 'image' }).catch(() => {});
    });
  }
  if (target.floorPlanUrl && target.floorPlanUrl.includes('cloudinary.com')) {
    destroyFromCloudinaryServer({ url: target.floorPlanUrl, publicId: target.floorPlanPublicId, resourceType: 'image' }).catch(() => {});
  }
  if (target.videoUrl && target.videoUrl.includes('cloudinary.com')) {
    destroyFromCloudinaryServer({ url: target.videoUrl, publicId: target.videoPublicId, resourceType: 'video' }).catch(() => {});
  }

  inMemoryProperties = inMemoryProperties.filter((p) => p.id !== req.params.id);
  saveLocalProperties(inMemoryProperties);
  return res.json({ success: true, message: 'Propriété supprimée.' });
});

app.get('/api/admin/agents', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const agents = getMergedAgents();
  return res.json({ success: true, count: agents.length, agents });
});

app.put('/api/admin/agents/:id', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const { id } = req.params;
  const uIdx = inMemoryUsers.findIndex((u) => u.id === id);
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = { ...inMemoryUsers[uIdx], ...(req.body || {}), id };
    saveLocalUsers(inMemoryUsers);
  }
  const aIdx = inMemoryAgents.findIndex((a) => a.id === id);
  if (aIdx !== -1) {
    inMemoryAgents[aIdx] = { ...inMemoryAgents[aIdx], ...(req.body || {}), id };
    saveLocalAgents(inMemoryAgents);
  }
  return res.json({ success: true, agent: getMergedAgents().find((a) => a.id === id) });
});

app.delete('/api/admin/agents/:id', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  inMemoryAgents = inMemoryAgents.filter((a) => a.id !== req.params.id);
  inMemoryUsers = inMemoryUsers.filter((u) => u.id !== req.params.id);
  saveLocalAgents(inMemoryAgents);
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, message: 'Agent supprimé.' });
});

app.get('/api/admin/agencies', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const agencies = getMergedAgencies();
  return res.json({ success: true, count: agencies.length, agencies });
});

app.put('/api/admin/agencies/:id', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  const { id } = req.params;
  const agIdx = inMemoryAgencies.findIndex((a) => a.id === id);
  if (agIdx !== -1) {
    inMemoryAgencies[agIdx] = { ...inMemoryAgencies[agIdx], ...(req.body || {}), id };
  } else {
    inMemoryAgencies.push({ id, ...(req.body || {}) });
  }
  saveLocalAgencies(inMemoryAgencies);
  const uIdx = inMemoryUsers.findIndex((u) => u.id === id || u.agencyId === id);
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = { ...inMemoryUsers[uIdx], ...(req.body || {}), id: inMemoryUsers[uIdx].id };
    saveLocalUsers(inMemoryUsers);
  }
  return res.json({ success: true, agency: getMergedAgencies().find((a) => a.id === id) });
});

app.delete('/api/admin/agencies/:id', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });
  inMemoryAgencies = inMemoryAgencies.filter((a) => a.id !== req.params.id);
  inMemoryUsers = inMemoryUsers.filter((u) => u.id !== req.params.id && u.agencyId !== req.params.id);
  saveLocalAgencies(inMemoryAgencies);
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, message: 'Agence supprimée.' });
});

// -------------------------------------------------------------
// CMS CONTENUS : BLOG & GUIDES + DOCUMENTS LÉGAUX RDC
// -------------------------------------------------------------
function loadLocalBlogArticles(): any[] {
  try {
    if (fs.existsSync(LOCAL_BLOG_ARTICLES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_BLOG_ARTICLES_FILE, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erreur lecture blog_articles_store.json:', e);
  }
  return [...DEFAULT_BLOG_ARTICLES];
}

function saveLocalBlogArticles(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_BLOG_ARTICLES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture blog_articles_store.json:', e);
  }
}

function loadLocalLegalDocuments(): any[] {
  try {
    if (fs.existsSync(LOCAL_LEGAL_DOCS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_LEGAL_DOCS_FILE, 'utf-8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Erreur lecture legal_documents_store.json:', e);
  }
  return [...DEFAULT_LEGAL_DOCUMENTS];
}

function saveLocalLegalDocuments(list: any[]) {
  try {
    fs.writeFileSync(LOCAL_LEGAL_DOCS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture legal_documents_store.json:', e);
  }
}

let inMemoryBlogArticles: any[] = loadLocalBlogArticles();
let inMemoryLegalDocuments: any[] = loadLocalLegalDocuments();

app.get('/api/content/articles', (req: Request, res: Response) => {
  const includeDrafts = String(req.query.include_drafts || '') === 'true';
  const authUser = getAuthUser(req);
  const canSeeDrafts = includeDrafts && authUser?.role === 'admin';
  const articles = canSeeDrafts
    ? inMemoryBlogArticles
    : inMemoryBlogArticles.filter((a: any) => a.isPublished !== false);
  return res.json({ success: true, articles });
});

app.get('/api/content/articles/:slug', (req: Request, res: Response) => {
  const authUser = getAuthUser(req);
  const found = inMemoryBlogArticles.find(
    (a: any) => a.slug === req.params.slug || a.id === req.params.slug
  );
  if (!found || (found.isPublished === false && authUser?.role !== 'admin')) {
    return res.status(404).json({ success: false, error: 'Article introuvable.' });
  }
  return res.json({ success: true, article: found });
});

app.post('/api/content/articles', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });

  const body = req.body || {};
  const title = String(body.title || '').trim();
  if (!title) return res.status(400).json({ success: false, error: 'Le titre de l’article est obligatoire.' });

  const now = new Date().toISOString();
  const baseSlug = slugifyText(body.slug || title) || `article-${Date.now()}`;
  const slugExists = inMemoryBlogArticles.some((a: any) => a.slug === baseSlug && a.id !== body.id);
  const finalSlug = slugExists ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;

  const article = {
    id: body.id || `art_${Date.now()}`,
    slug: finalSlug,
    title,
    category: body.category || 'achat_vente',
    excerpt: String(body.excerpt || '').trim(),
    content: String(body.content || '').trim(),
    coverImage: String(body.coverImage || '/og-images/blog_gombe_skyline_1795161879500.jpg').trim(),
    authorName: String(body.authorName || 'Rédaction Kinimmo RDC').trim(),
    readingMinutes: Math.max(1, Number(body.readingMinutes || 5)),
    tags: Array.isArray(body.tags) ? body.tags : [],
    relatedNeighborhoodSlugs: Array.isArray(body.relatedNeighborhoodSlugs) ? body.relatedNeighborhoodSlugs : [],
    isFeatured: Boolean(body.isFeatured),
    isPublished: body.isPublished !== false,
    publishedAt: body.publishedAt || now,
    updatedAt: now,
  };

  inMemoryBlogArticles = [article, ...inMemoryBlogArticles.filter((a: any) => a.id !== article.id)];
  saveLocalBlogArticles(inMemoryBlogArticles);
  return res.status(201).json({ success: true, article });
});

app.put('/api/content/articles/:id', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });

  const idx = inMemoryBlogArticles.findIndex(
    (a: any) => a.id === req.params.id || a.slug === req.params.id
  );
  if (idx === -1) return res.status(404).json({ success: false, error: 'Article introuvable.' });

  const body = req.body || {};
  const current = inMemoryBlogArticles[idx];
  const updated = {
    ...current,
    ...body,
    id: current.id,
    slug: body.slug ? slugifyText(body.slug) : current.slug,
    updatedAt: new Date().toISOString(),
  };
  inMemoryBlogArticles[idx] = updated;
  saveLocalBlogArticles(inMemoryBlogArticles);
  return res.json({ success: true, article: updated });
});

app.delete('/api/content/articles/:id', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });

  const initialLen = inMemoryBlogArticles.length;
  inMemoryBlogArticles = inMemoryBlogArticles.filter(
    (a: any) => a.id !== req.params.id && a.slug !== req.params.id
  );
  if (inMemoryBlogArticles.length === initialLen) {
    return res.status(404).json({ success: false, error: 'Article introuvable.' });
  }
  saveLocalBlogArticles(inMemoryBlogArticles);
  return res.json({ success: true, message: 'Article supprimé.' });
});

app.get('/api/content/legal', (_req: Request, res: Response) => {
  return res.json({ success: true, documents: inMemoryLegalDocuments });
});

app.get('/api/content/legal/:slug', (req: Request, res: Response) => {
  const found = inMemoryLegalDocuments.find((d: any) => d.slug === req.params.slug);
  if (!found) return res.status(404).json({ success: false, error: 'Document légal introuvable.' });
  return res.json({ success: true, document: found });
});

app.put('/api/content/legal/:slug', (req: Request, res: Response) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: 'Authentification requise.' });
  if (admin.role !== 'admin') return res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs.' });

  const idx = inMemoryLegalDocuments.findIndex((d: any) => d.slug === req.params.slug);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Document légal introuvable.' });

  const body = req.body || {};
  const current = inMemoryLegalDocuments[idx];
  const updated = {
    ...current,
    ...body,
    slug: current.slug,
    lastUpdatedAt: new Date().toISOString().split('T')[0],
    updatedBy: admin.name || admin.email,
  };
  inMemoryLegalDocuments[idx] = updated;
  saveLocalLegalDocuments(inMemoryLegalDocuments);
  return res.json({ success: true, document: updated });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
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
// REDIRECTIONS HTTP 301 VERS LES URLS CANONIQUES PROPRES (SEO)
// -------------------------------------------------------------
function resolveCanonicalListingPath(rawToken: string): string {
  const matched = resolvePropertyBySlugOrId(rawToken, inMemoryProperties as any);
  if (matched) {
    return `/annonces/${encodeURIComponent(getPropertySlug(matched))}`;
  }
  return `/annonces/${encodeURIComponent(getPropertySlug({ id: rawToken }))}`;
}

app.get(['/annonce/:id', '/property/:id', '/bien/:id'], (req: Request, res: Response) => {
  return res.redirect(301, resolveCanonicalListingPath(req.params.id));
});

app.get('/quartier/:slug', (req: Request, res: Response) => {
  const cleanSlug = slugifyText(req.params.slug || 'gombe') || 'gombe';
  return res.redirect(301, `/quartiers/${encodeURIComponent(cleanSlug)}`);
});

app.get('/', (req: Request, res: Response, next) => {
  const legacyProp =
    req.query.property ||
    req.query.prop ||
    req.query.annonce ||
    req.query.property_id;
  if (legacyProp && typeof legacyProp === 'string' && legacyProp.trim()) {
    return res.redirect(301, resolveCanonicalListingPath(legacyProp.trim()));
  }
  const legacyCommune = req.query.commune;
  if (
    legacyCommune &&
    typeof legacyCommune === 'string' &&
    legacyCommune.trim() &&
    !req.query.status &&
    !req.query.type &&
    !req.query.search &&
    !req.query.searchQuery &&
    !req.query.tab
  ) {
    const cleanSlug = slugifyText(legacyCommune.trim());
    if (cleanSlug) {
      return res.redirect(301, `/quartiers/${encodeURIComponent(cleanSlug)}`);
    }
  }
  return next();
});

// -------------------------------------------------------------
// SITEMAP.XML DYNAMIQUE POUR LE RÉFÉRENCEMENT GOOGLE (SEO)
// -------------------------------------------------------------
app.get('/sitemap.xml', (req: Request, res: Response) => {
  try {
    const baseUrl = getSiteBaseUrl(req);
    const today = new Date().toISOString().split('T')[0];

    const staticPages = [
      { loc: `${baseUrl}/`, priority: '1.0', changefreq: 'daily', lastmod: today },
      { loc: `${baseUrl}/visites`, priority: '0.9', changefreq: 'daily', lastmod: today },
      { loc: `${baseUrl}/conciergerie`, priority: '0.8', changefreq: 'weekly', lastmod: today },
      { loc: `${baseUrl}/blog`, priority: '0.8', changefreq: 'weekly', lastmod: today },
      { loc: `${baseUrl}/aide`, priority: '0.7', changefreq: 'monthly', lastmod: today },
      { loc: `${baseUrl}/conditions-utilisation`, priority: '0.4', changefreq: 'monthly', lastmod: today },
      { loc: `${baseUrl}/confidentialite`, priority: '0.4', changefreq: 'monthly', lastmod: today },
      { loc: `${baseUrl}/mentions-legales`, priority: '0.4', changefreq: 'monthly', lastmod: today },
    ];

    // Toutes les communes & quartiers clés (URLs propres)
    const neighborhoods = buildNeighborhoodDirectory(inMemoryProperties as any);
    const communePages = neighborhoods.map((n) => ({
      loc: `${baseUrl}/quartiers/${encodeURIComponent(n.slug)}`,
      priority: n.stats.activeCount > 0 ? '0.8' : '0.6',
      changefreq: 'weekly',
      lastmod: today,
    }));

    // Articles de blog & guides publiés
    const articlePages = inMemoryBlogArticles
      .filter((a: any) => a && a.isPublished !== false)
      .map((a: any) => ({
        loc: `${baseUrl}/blog/${encodeURIComponent(a.slug)}`,
        priority: '0.7',
        changefreq: 'monthly',
        lastmod: String(a.updatedAt || a.publishedAt || today).split('T')[0],
      }));

    // Annonces immobilières publiées et actives (URLs propres /annonces/:slug)
    const publishedProps = inMemoryProperties.filter(
      (p: any) =>
        p &&
        p.published !== false &&
        p.listingStatus !== 'ARCHIVED' &&
        p.listingStatus !== 'REJECTED' &&
        !p.hiddenByPlanDowngrade
    );

    const propertyPages = publishedProps.map((p: any) => {
      let lastmod = today;
      if (p.updatedAt) {
        lastmod = String(p.updatedAt).split('T')[0];
      } else if (p.createdAt) {
        lastmod = String(p.createdAt).split('T')[0];
      }
      return {
        loc: `${baseUrl}/annonces/${encodeURIComponent(getPropertySlug(p))}`,
        priority: p.featured ? '0.9' : '0.8',
        changefreq: 'weekly',
        lastmod,
      };
    });

    const allUrls = [...staticPages, ...communePages, ...articlePages, ...propertyPages];

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
Disallow: /admin/
Disallow: /agent-dashboard
Disallow: /agency-dashboard
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header('Content-Type', 'text/plain; charset=utf-8');
  res.header('Cache-Control', 'public, max-age=86400');
  return res.send(robots);
});

// -------------------------------------------------------------
// INJECTION SERVEUR DES BALISES OPEN GRAPH, TWITTER, CANONICAL & JSON-LD
// (Indispensable pour aperçus WhatsApp, Facebook & GoogleBot)
// -------------------------------------------------------------
function escapeHtmlAttr(val: string): string {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeHtmlText(val: string): string {
  return String(val || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveAbsoluteAssetUrl(rawUrl: string | undefined, baseUrl: string): string {
  const fallback = `${baseUrl}/og-images/blog_gombe_skyline_1795161879500.jpg`;
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) return fallback;
  const clean = rawUrl.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
  if (clean.startsWith('/')) return `${baseUrl}${clean}`;
  return `${baseUrl}/${clean}`;
}

interface ServerSeoMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  ogType: string;
  jsonLd: Record<string, any> | null;
}

function resolveSeoMetadataForRequest(req: Request, baseUrl: string): ServerSeoMeta {
  const pathname = (req.path || '/').replace(/\/+$/, '') || '/';
  const defaultImage = `${baseUrl}/og-images/blog_gombe_skyline_1795161879500.jpg`;

  // 1. Page annonce (/annonces/:slug)
  const listingMatch = pathname.match(/^\/annonces\/([^/?#]+)/i);
  if (listingMatch && listingMatch[1]) {
    const token = decodeURIComponent(listingMatch[1]);
    const prop = resolvePropertyBySlugOrId(token, inMemoryProperties as any);
    if (prop) {
      const slug = getPropertySlug(prop);
      const canonicalUrl = `${baseUrl}/annonces/${encodeURIComponent(slug)}`;
      const isSale = prop.status === 'for-sale' || prop.category === 'sale';
      const priceStr = `${Number(prop.price || 0).toLocaleString('fr-FR')} ${prop.currency || 'USD'}${!isSale && prop.period === 'month' ? '/mois' : ''}`;
      const locStr = [prop.quartier, prop.commune || prop.city || 'Kinshasa'].filter(Boolean).join(', ');
      const title = `${prop.title} — ${priceStr} à ${prop.commune || 'Kinshasa'} | Kinimmo`;
      const rawDesc = prop.description
        ? String(prop.description).replace(/\s+/g, ' ').trim().slice(0, 155)
        : `${isSale ? 'À vendre' : 'À louer'} à ${locStr}. ${prop.area || 0} m², ${prop.bedrooms || 0} chambres. Consultez les photos et contactez l'agent sur Kinimmo.`;
      const firstImg = Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : defaultImage;
      const imageUrl = resolveAbsoluteAssetUrl(firstImg, baseUrl);
      return {
        title,
        description: rawDesc,
        canonicalUrl,
        imageUrl,
        ogType: 'article',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'RealEstateListing',
          name: prop.title,
          description: rawDesc,
          url: canonicalUrl,
          image: imageUrl,
          dateModified: prop.updatedAt || prop.createdAt,
          offers: {
            '@type': 'Offer',
            price: prop.price,
            priceCurrency: prop.currency || 'USD',
            availability: 'https://schema.org/InStock',
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: prop.commune || prop.city || 'Kinshasa',
            addressCountry: 'CD',
          },
        },
      };
    }
  }

  // 2. Page quartier (/quartiers/:slug)
  const quartierMatch = pathname.match(/^\/quartiers\/([^/?#]+)/i);
  if (quartierMatch && quartierMatch[1]) {
    const profile = resolveNeighborhoodBySlug(decodeURIComponent(quartierMatch[1]), inMemoryProperties as any);
    if (profile) {
      const canonicalUrl = `${baseUrl}/quartiers/${encodeURIComponent(profile.slug)}`;
      const title = `Immobilier à ${profile.name} (${profile.commune}) : ${profile.stats.activeCount} annonces & prix | Kinimmo`;
      const priceNote = profile.stats.avgSalePriceUsd
        ? ` Prix moyen vente : ${profile.stats.avgSalePriceUsd.toLocaleString('fr-FR')} USD.`
        : '';
      const description = `${profile.tagline}${priceNote}`;
      const imageUrl = defaultImage;
      return {
        title,
        description,
        canonicalUrl,
        imageUrl,
        ogType: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Place',
          name: `${profile.name}, Kinshasa`,
          description: profile.description,
          url: canonicalUrl,
          address: {
            '@type': 'PostalAddress',
            addressLocality: profile.commune,
            addressRegion: 'Kinshasa',
            addressCountry: 'CD',
          },
        },
      };
    }
  }

  // 3. Page article de blog (/blog/:slug) ou liste /blog
  if (pathname === '/blog') {
    return {
      title: 'Blog & Guides Immobiliers RDC — Kinshasa | Kinimmo',
      description: 'Guides pratiques sur l’achat foncier, le certificat d’enregistrement, la location à Kinshasa et les communes porteuses.',
      canonicalUrl: `${baseUrl}/blog`,
      imageUrl: `${baseUrl}/og-images/blog_foncier_titres_1795161876901.jpg`,
      ogType: 'website',
      jsonLd: null,
    };
  }
  const blogMatch = pathname.match(/^\/blog\/([^/?#]+)/i);
  if (blogMatch && blogMatch[1]) {
    const slug = decodeURIComponent(blogMatch[1]);
    const article = inMemoryBlogArticles.find((a: any) => a.slug === slug || a.id === slug);
    if (article) {
      const canonicalUrl = `${baseUrl}/blog/${encodeURIComponent(article.slug)}`;
      const imageUrl = resolveAbsoluteAssetUrl(article.coverImage, baseUrl);
      return {
        title: `${article.title} | Guides Kinimmo RDC`,
        description: article.excerpt || article.title,
        canonicalUrl,
        imageUrl,
        ogType: 'article',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt,
          image: imageUrl,
          author: { '@type': 'Organization', name: article.authorName || 'Rédaction Kinimmo RDC' },
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          mainEntityOfPage: canonicalUrl,
        },
      };
    }
  }

  // 4. Centre d'aide (/aide)
  if (pathname === '/aide') {
    return {
      title: 'Centre d’aide & Questions fréquentes (FAQ) | Kinimmo RDC',
      description: 'Toutes les réponses sur les paiements Mobile Money, les affiches QR panneau, la vérification Kinimmo Trust et la publication d’annonces.',
      canonicalUrl: `${baseUrl}/aide`,
      imageUrl: defaultImage,
      ogType: 'website',
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: DEFAULT_FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    };
  }

  // 5. Pages légales
  const legalSlug = pathname.slice(1);
  if (['conditions-utilisation', 'confidentialite', 'mentions-legales'].includes(legalSlug)) {
    const doc = inMemoryLegalDocuments.find((d: any) => d.slug === legalSlug);
    if (doc) {
      return {
        title: `${doc.title} | Kinimmo RDC`,
        description: doc.subtitle || doc.title,
        canonicalUrl: `${baseUrl}/${doc.slug}`,
        imageUrl: defaultImage,
        ogType: 'website',
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: doc.title,
          description: doc.subtitle,
          url: `${baseUrl}/${doc.slug}`,
        },
      };
    }
  }

  if (pathname === '/visites') {
    return {
      title: 'Kinimmo Visites — Visites Vidéo Immersives à Kinshasa',
      description: 'Découvrez en vidéo les biens disponibles à la vente et à la location à Kinshasa (Gombe, Ngaliema, Limete).',
      canonicalUrl: `${baseUrl}/visites`,
      imageUrl: defaultImage,
      ogType: 'website',
      jsonLd: null,
    };
  }

  if (pathname === '/conciergerie') {
    return {
      title: 'Conciergerie Immobilière Kinshasa — Recherche Sur-Mesure | Kinimmo',
      description: 'Confiez votre recherche de villa, appartement ou bureau à Kinshasa à notre service de conciergerie VIP.',
      canonicalUrl: `${baseUrl}/conciergerie`,
      imageUrl: defaultImage,
      ogType: 'website',
      jsonLd: null,
    };
  }

  return {
    title: 'Kinshasa Immobilier — Plateforme Immobilière & Gestion RDC',
    description: 'Plateforme immobilière de référence en RDC : Vente, location, terrains titrés, quartiers de Kinshasa et annuaire des agents certifiés.',
    canonicalUrl: `${baseUrl}${pathname === '/' ? '/' : pathname}`,
    imageUrl: defaultImage,
    ogType: 'website',
    jsonLd: null,
  };
}

function injectSeoTagsIntoHtml(html: string, meta: ServerSeoMeta): string {
  const safeTitle = escapeHtmlText(meta.title);
  const safeDesc = escapeHtmlAttr(meta.description);
  const safeCanonical = escapeHtmlAttr(meta.canonicalUrl);
  const safeImage = escapeHtmlAttr(meta.imageUrl);
  const safeType = escapeHtmlAttr(meta.ogType);

  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  out = out.replace(
    /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<link\s+rel=["']canonical["'][^>]*\/?>/i,
    `<link rel="canonical" id="canonical-url" href="${safeCanonical}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:type["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:type" content="${safeType}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:url["'][^>]*\/?>/i,
    `<meta property="og:url" id="og-url" content="${safeCanonical}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:image" content="${safeImage}" />`
  );
  out = out.replace(
    /<meta\s+name=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  out = out.replace(
    /<meta\s+name=["']twitter:description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<meta\s+name=["']twitter:image["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:image" content="${safeImage}" />`
  );

  if (meta.jsonLd) {
    const ldJson = JSON.stringify(meta.jsonLd).replace(/<\/script>/gi, '<\\/script>');
    out = out.replace(
      '</head>',
      `  <script type="application/ld+json" id="kinimmo-listing-jsonld">${ldJson}</script>\n  </head>`
    );
  }

  return out;
}

function isHtmlPageRequest(req: Request): boolean {
  const p = req.path || '/';
  if (
    p.startsWith('/api') ||
    p.startsWith('/uploads') ||
    p.startsWith('/og-images') ||
    p.startsWith('/@') ||
    p.startsWith('/src/') ||
    p.startsWith('/node_modules/')
  ) {
    return false;
  }
  if (/\.[a-z0-9]{1,8}$/i.test(p)) return false;
  const accept = String(req.headers.accept || '');
  const ua = String(req.headers['user-agent'] || '');
  const isCrawler = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Googlebot|Bingbot|curl/i.test(ua);
  return accept.includes('text/html') || accept === '*/*' || accept === '' || isCrawler;
}

// Initialisation Serveur Vite (Dev) ou Fichiers Statiques (Prod)
async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  // Si on est en production ou que le dossier dist compilé existe, on sert les fichiers statiques
  if (isProd || hasDist) {
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        const rawHtml = fs.readFileSync(indexPath, 'utf-8');
        const seoMeta = resolveSeoMetadataForRequest(req, getSiteBaseUrl(req));
        const finalHtml = injectSeoTagsIntoHtml(rawHtml, seoMeta);
        res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(finalHtml);
      } else {
        res.status(200).send('Kinimmo API Server is running');
      }
    });
  } else {
    // Mode Développement local : middleware Vite + injection SEO HTML pour crawlers/WhatsApp
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });

      app.get('*', async (req: Request, res: Response, next) => {
        if (!isHtmlPageRequest(req)) {
          return next();
        }
        try {
          const indexPath = path.join(__dirname, 'index.html');
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const transformedHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          const seoMeta = resolveSeoMetadataForRequest(req, getSiteBaseUrl(req));
          const finalHtml = injectSeoTagsIntoHtml(transformedHtml, seoMeta);
          return res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).end(finalHtml);
        } catch (err) {
          vite.ssrFixStacktrace(err as Error);
          return next(err);
        }
      });

      app.use(vite.middlewares);
    } catch (viteError) {
      console.warn('Vite non disponible en environnement d hébergement, bascule en mode statique :', (viteError as Error).message);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath, { index: false }));
      }
      app.get('*', (req: Request, res: Response) => {
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          const rawHtml = fs.readFileSync(indexPath, 'utf-8');
          const seoMeta = resolveSeoMetadataForRequest(req, getSiteBaseUrl(req));
          res.status(200).set({ 'Content-Type': 'text/html; charset=utf-8' }).send(injectSeoTagsIntoHtml(rawHtml, seoMeta));
        } else {
          res.json({
            status: 'ok',
            service: 'Kinimmo API Server',
            message: 'Serveur actif.'
          });
        }
      });
    }
  }

  app.listen(Number(PORT) || 3000, '0.0.0.0', () => {
    console.log(`Kinimmo Full-Stack Server running on http://0.0.0.0:${PORT} (${isProd ? 'Production' : (hasDist ? 'Production (dist)' : 'Development')})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
});
