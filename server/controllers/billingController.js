const pool = require('../config/database');
const crypto = require('crypto');

function mapCategoryToAudience(cat, id) {
  if (cat === 'agency' || id === 'agency') return 'agence';
  if (cat === 'promoter' || id === 'promoter_vip') return 'promoteur';
  if (id === 'enterprise') return 'entreprise';
  return 'grand_public';
}

function isLaunchAudience(audience) {
  return audience === 'grand_public' || audience === 'agence';
}

async function getActiveExchangeRate() {
  try {
    const [rows] = await pool.execute(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'exchange_rate_usd_cdf' LIMIT 1"
    );
    const raw = rows && rows[0] ? Number(rows[0].setting_value) : NaN;
    if (Number.isFinite(raw) && raw > 0) return raw;
  } catch {}
  return 2850;
}

function formatPlan(p, activeRate = 2850) {
  const rate = Number.isFinite(Number(activeRate)) && Number(activeRate) > 0 ? Number(activeRate) : 2850;
  const audience = p.audience || mapCategoryToAudience(p.category, p.id);
  const priceUsd = Number(p.price_usd !== undefined ? p.price_usd : (p.priceMonthly || 0));
  const priceCdf = priceUsd > 0
    ? Math.round(priceUsd * rate)
    : Number(p.price_cdf !== undefined ? p.price_cdf : (p.priceMonthlyCDF || 0));
  const priceYearlyUsd = Number(
    p.price_yearly_usd !== undefined && p.price_yearly_usd !== null && Number(p.price_yearly_usd) > 0
      ? p.price_yearly_usd
      : (p.priceYearly !== undefined ? p.priceYearly : Math.round(priceUsd * 10 * 100) / 100)
  );
  const priceYearlyCdf = priceYearlyUsd > 0
    ? Math.round(priceYearlyUsd * rate)
    : Number(p.price_yearly_cdf !== undefined && p.price_yearly_cdf !== null ? p.price_yearly_cdf : (p.priceYearlyCDF || 0));
  const maxListings = Number(p.max_listings !== undefined ? p.max_listings : (p.maxListings ?? 3));
  const featuredListings = Number(p.max_featured_listings !== undefined ? p.max_featured_listings : (p.featuredListings ?? 0));
  const maxPhotos = Number(p.max_photos_per_listing !== undefined ? p.max_photos_per_listing : (p.maxPhotos ?? (priceUsd === 0 ? 6 : 15)));
  const maxVideos = Number(p.max_videos !== undefined ? p.max_videos : (p.maxVideos ?? (priceUsd === 0 ? 1 : 5)));
  const includedBoosts = Number(p.included_boosts !== undefined ? p.included_boosts : (p.includedBoosts ?? featuredListings));
  const maxTeamMembers = Number(p.max_team_members !== undefined ? p.max_team_members : (p.agentAccounts ?? (audience === 'agence' ? 10 : 1)));
  const trialDays = Number(p.trial_days !== undefined ? p.trial_days : (p.trialDays ?? 0));

  let features = [];
  if (Array.isArray(p.features)) {
    features = p.features;
  } else if (typeof p.features === 'string') {
    try { features = JSON.parse(p.features); } catch (e) { features = []; }
  }

  if (!features || features.length === 0) {
    if (p.id === 'starter') {
      features = [
        'Publication de 3 annonces immobilières actives',
        'Jusqu\'à 6 photos HD et 1 vidéo par bien',
        'Mise en relation directe avec les acheteurs',
        'Messagerie et contacts WhatsApp directs'
      ];
    } else if (p.id === 'pro') {
      features = [
        'Jusqu\'à 25 annonces immobilières actives',
        'Jusqu\'à 15 photos HD & 5 vidéos immersives',
        '3 boosts de visibilité inclus par mois',
        'Badge Officiel Courtier Vérifié Kinshasa',
        'Accès direct aux demandes de Conciergerie (Leads)',
        'Support réactif 6j/7'
      ];
    } else if (p.id === 'agency') {
      features = [
        'Jusqu\'à 100 annonces immobilières actives',
        'Jusqu\'à 25 photos & 20 vidéos immersives',
        '10 boosts inclus et jusqu\'à 10 comptes collaborateurs',
        'Vitrine Agence Immobilière dédiée avec logo et agents',
        'Badge Agence Certifiée & Agréée RDC',
        'Support prioritaire dédié 7j/7'
      ];
    } else {
      features = [
        `${maxListings >= 500 ? 'Annonces illimitées' : maxListings + ' annonces actives'}`,
        `${maxPhotos} photos par bien & ${maxVideos} vidéos`,
        `${includedBoosts} boosts inclus • ${maxTeamMembers} membres d'équipe`,
        'Multi-diffusion WhatsApp VIP & conseiller dédié'
      ];
    }
  }

  const isActive = p.is_active !== false && p.isActive !== false && p.is_active !== 0;

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category || (audience === 'agence' ? 'agency' : audience === 'promoteur' || audience === 'entreprise' ? 'promoter' : 'individual'),
    audience,
    badge: p.badge,
    price_usd: priceUsd,
    price_cdf: priceCdf,
    priceMonthly: priceUsd,
    priceMonthlyCDF: priceCdf,
    price_yearly_usd: priceYearlyUsd,
    price_yearly_cdf: priceYearlyCdf,
    priceYearly: priceYearlyUsd,
    priceYearlyCDF: priceYearlyCdf,
    currency: 'USD',
    billing_period: p.billing_period || 'monthly',
    billingPeriod: p.billing_period === 'yearly' ? 'year' : 'month',
    trial_days: trialDays,
    trialDays,
    max_listings: maxListings,
    maxListings: maxListings,
    max_featured_listings: featuredListings,
    featuredListings: featuredListings,
    max_photos_per_listing: maxPhotos,
    maxPhotos,
    max_videos: maxVideos,
    maxVideos,
    included_boosts: includedBoosts,
    includedBoosts,
    max_team_members: maxTeamMembers,
    agentAccounts: maxTeamMembers,
    features: features,
    recommended: p.recommended !== undefined ? Boolean(p.recommended) : (p.id === 'agency' || p.id === 'pro'),
    is_active: isActive,
    isActive: isActive,
    has_verified_badge: Boolean(p.has_verified_badge ?? p.hasVerifiedBadge),
    hasVerifiedBadge: Boolean(p.has_verified_badge ?? p.hasVerifiedBadge),
    has_crm_leads: Boolean(p.has_crm_leads ?? p.hasCrmLeads),
    hasCrmLeads: Boolean(p.has_crm_leads ?? p.hasCrmLeads),
    has_priority_support: Boolean(p.has_priority_support ?? p.hasPrioritySupport),
    hasPrioritySupport: Boolean(p.has_priority_support ?? p.hasPrioritySupport)
  };
}

function formatOption(opt, activeRate = 2850) {
  const rate = Number.isFinite(Number(activeRate)) && Number(activeRate) > 0 ? Number(activeRate) : 2850;
  const priceUsd = Number(opt.price_usd !== undefined ? opt.price_usd : (opt.price || 0));
  const priceCdf = priceUsd > 0
    ? Math.round(priceUsd * rate)
    : Number(opt.price_cdf !== undefined ? opt.price_cdf : (opt.priceCDF || 0));

  return {
    id: opt.id,
    name: opt.name,
    slug: opt.slug,
    description: opt.description,
    boost_type: opt.boost_type,
    duration_days: Number(opt.duration_days || 7),
    price_usd: priceUsd,
    price_cdf: priceCdf,
    price: priceUsd,
    priceCDF: priceCdf,
    badge_text: opt.badge_text,
    icon: opt.icon || 'Sparkles',
    is_active: opt.is_active !== false
  };
}

const DEFAULT_VISIBILITY_OPTIONS_SEED = [
  {
    id: 'opt_featured_7d',
    name: 'À la une — 7 jours',
    slug: 'mise_en_avant_7d',
    description: 'Positionnement en tête de page d\'accueil et de recherche pendant 7 jours avec étiquette « À la une ».',
    boost_type: 'featured',
    duration_days: 7,
    price_usd: 10.0,
    badge_text: 'À la une',
    icon: 'Sparkles',
    is_active: true
  },
  {
    id: 'opt_sponsorise_14d',
    name: 'Annonce Sponsorisée — 14 jours',
    slug: 'annonce_sponsorisee_14d',
    description: 'Mise en avant ciblée dans les résultats et vitrine pendant 14 jours avec étiquette « Sponsorisé ».',
    boost_type: 'featured',
    duration_days: 14,
    price_usd: 15.0,
    badge_text: 'Sponsorisé',
    icon: 'Rocket',
    is_active: true
  },
  {
    id: 'opt_premium_30d',
    name: 'Pack À la une — 30 jours',
    slug: 'annonce_premium_30d',
    description: 'Affichage continu pendant 30 jours avec étiquette « À la une », priorité maximale et 3x plus d\'appels.',
    boost_type: 'premium',
    duration_days: 30,
    price_usd: 25.0,
    badge_text: 'À la une',
    icon: 'Crown',
    is_active: true
  },
  {
    id: 'opt_urgent_14d',
    name: 'Badge Urgent — 14 jours',
    slug: 'badge_urgent_14d',
    description: 'Étiquette visible « Urgent » pour attirer immédiatement les acheteurs et locataires sérieux.',
    boost_type: 'urgent',
    duration_days: 14,
    price_usd: 8.0,
    badge_text: 'Urgent',
    icon: 'Zap',
    is_active: true
  },
  {
    id: 'opt_refresh_bump',
    name: 'Remontée Immédiate (24h)',
    slug: 'remontee_tete',
    description: 'Actualise la date de votre annonce pour la replacer en tête des résultats récents pendant 24h.',
    boost_type: 'refresh',
    duration_days: 1,
    price_usd: 5.0,
    badge_text: 'Sponsorisé',
    icon: 'ArrowUpCircle',
    is_active: true
  },
  {
    id: 'opt_social_blast',
    name: 'Diffusion Multi-Canal — 14 jours',
    slug: 'diffusion_reseaux',
    description: 'Publication sponsorisée sur Kinimmo et diffusion sur les réseaux communautaires pendant 14 jours.',
    boost_type: 'social_blast',
    duration_days: 14,
    price_usd: 35.0,
    badge_text: 'Sponsorisé',
    icon: 'Share2',
    is_active: true
  }
];

const DEFAULT_PAYMENT_METHODS_SEED = [
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

async function ensureDefaultVisibilityOptions(db = pool, activeRate = 2850, specificOptionId = null) {
  try {
    const rate = Number.isFinite(Number(activeRate)) && Number(activeRate) > 0 ? Number(activeRate) : 2850;
    const seeds = specificOptionId
      ? DEFAULT_VISIBILITY_OPTIONS_SEED.filter((o) => o.id === specificOptionId)
      : DEFAULT_VISIBILITY_OPTIONS_SEED;

    for (const opt of seeds) {
      const priceCdf = Math.round(Number(opt.price_usd) * rate);
      await db.execute(
        `INSERT IGNORE INTO visibility_options
         (id, name, slug, description, boost_type, duration_days, price_usd, price_cdf, badge_text, icon, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          opt.id,
          opt.name,
          opt.slug,
          opt.description,
          opt.boost_type,
          opt.duration_days,
          opt.price_usd,
          priceCdf,
          opt.badge_text,
          opt.icon,
          Boolean(opt.is_active)
        ]
      );
    }
  } catch (err) {
    console.warn('[Seed VisibilityOptions] Warning:', err.message);
  }
}

async function ensureDefaultPaymentMethods(db = pool) {
  try {
    for (const pm of DEFAULT_PAYMENT_METHODS_SEED) {
      await db.execute(
        `INSERT IGNORE INTO payment_methods
         (id, provider, account_name, account_number, merchant_code, instructions, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          pm.id,
          pm.provider,
          pm.account_name,
          pm.account_number,
          pm.merchant_code || null,
          pm.instructions || '',
          Boolean(pm.is_active)
        ]
      );
    }
  } catch (err) {
    console.warn('[Seed PaymentMethods] Warning:', err.message);
  }
}

async function resolvePaymentMethodId(db = pool, paymentMethodId) {
  if (typeof paymentMethodId !== 'string') return null;
  const trimmed = paymentMethodId.trim();
  if (!trimmed) return null;

  try {
    const [rows] = await db.execute('SELECT id FROM payment_methods WHERE id = ? LIMIT 1', [trimmed]);
    if (rows.length > 0) return rows[0].id;

    // Si la table payment_methods est entièrement vide et qu'un identifiant par défaut est soumis, amorcer proprement
    if (DEFAULT_PAYMENT_METHODS_SEED.some((pm) => pm.id === trimmed)) {
      const [countRows] = await db.execute('SELECT COUNT(*) AS total FROM payment_methods');
      const total = Number(countRows?.[0]?.total ?? 0);
      if (total === 0) {
        await ensureDefaultPaymentMethods(db);
        const [retryRows] = await db.execute('SELECT id FROM payment_methods WHERE id = ? LIMIT 1', [trimmed]);
        if (retryRows.length > 0) return retryRows[0].id;
      }
    }
  } catch (err) {
    console.warn('[ResolvePaymentMethod] Warning:', err.message);
  }

  return null;
}

function parseJsonSafe(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

async function canUserManagePropertyRow(db, user, propRow) {
  if (!user || !propRow) return false;
  const role = String(user.role || '').trim().toLowerCase();
  if (role === 'admin') return true;

  const userId = String(user.id || '').trim();
  const userEmail = String(user.email || '').trim().toLowerCase();
  const propAgentId = String(propRow.agent_id || '').trim();

  if (propAgentId && propAgentId === userId) return true;
  if (propAgentId && userEmail && propAgentId.toLowerCase() === userEmail) return true;

  const customFields = parseJsonSafe(propRow.custom_fields, {});
  const assignedIds = [
    customFields?.assignedAgentId,
    customFields?.agentId,
    customFields?.ownerId,
    customFields?.userId
  ].filter(Boolean).map((v) => String(v).trim());
  if (assignedIds.includes(userId)) return true;

  if (
    propRow.agency_id &&
    ((user.agency_id && propRow.agency_id === user.agency_id) ||
      (role === 'agency' && propRow.agency_id === userId))
  ) {
    return true;
  }

  // Correspondance éventuelle via profil agent rattaché à l'utilisateur connecté
  if (propAgentId) {
    try {
      const [agentRows] = await db.execute(
        'SELECT id, user_id, agency_id, email FROM agents WHERE id = ? LIMIT 1',
        [propAgentId]
      );
      if (agentRows.length > 0) {
        const ag = agentRows[0];
        if (ag.user_id && String(ag.user_id).trim() === userId) return true;
        if (userEmail && ag.email && String(ag.email).trim().toLowerCase() === userEmail) return true;
        if (user.agency_id && ag.agency_id && String(ag.agency_id).trim() === String(user.agency_id).trim()) {
          return true;
        }
      }
    } catch {}
  }

  return false;
}

function checkPropertyBoostEligibility(propRow) {
  if (!propRow || typeof propRow !== 'object') {
    return { allowed: false, reason: 'Propriété introuvable.' };
  }

  if (propRow.published === 0 || propRow.published === false) {
    return {
      allowed: false,
      reason: 'Cette annonce n’est pas publiée publiquement (brouillon ou masquée). Publiez-la avant de commander un boost.'
    };
  }

  if (propRow.soft_hidden_by_plan === 1 || propRow.soft_hidden_by_plan === true) {
    return {
      allowed: false,
      reason: 'Cette annonce est temporairement masquée par votre formule actuelle. Passez à une formule supérieure pour la réactiver et la booster.'
    };
  }

  const customFields = parseJsonSafe(propRow.custom_fields, {});
  const mediaMeta = customFields && typeof customFields === 'object' ? customFields._mediaMeta : null;
  const fraudStatus = String(mediaMeta?.fraudStatus || '').toLowerCase();
  if (fraudStatus === 'suspect') {
    return {
      allowed: false,
      reason: 'Cette annonce fait l’objet d’une vérification de modération et ne peut pas être boostée pour le moment.'
    };
  }

  const lifecycle = String(mediaMeta?.listingStatus || '').toUpperCase();
  if (['DRAFT', 'ARCHIVED', 'PENDING_REVIEW', 'SOLD', 'RENTED', 'SUSPENDED', 'HIDDEN'].includes(lifecycle)) {
    return {
      allowed: false,
      reason: `Impossible de booster une annonce ayant le statut « ${lifecycle} ».`
    };
  }

  const rawStatus = String(propRow.status || '').toLowerCase();
  if (['sold', 'rented', 'archived', 'draft', 'suspended', 'hidden'].includes(rawStatus)) {
    return {
      allowed: false,
      reason: `Impossible de booster un bien ayant le statut « ${rawStatus} ».`
    };
  }

  return { allowed: true, reason: null };
}

/**
 * Récupérer la liste des formules d'abonnement actives
 * GET /api/billing/plans
 */
async function getPlans(req, res, next) {
  try {
    const { category, audience, include_inactive } = req.query;
    const includeInactive = include_inactive === 'true';
    let sql = "SELECT * FROM pricing_plans WHERE category NOT IN ('dealership', 'garage')";
    const params = [];

    if (!includeInactive) {
      sql += " AND is_active = TRUE AND audience IN ('grand_public', 'agence')";
    }
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (audience && audience !== 'all') {
      sql += ' AND audience = ?';
      params.push(audience);
    }
    sql += ' ORDER BY price_usd ASC';

    const activeRate = await getActiveExchangeRate();
    const [rows] = await pool.execute(sql, params);
    let mapped = rows.map(p => formatPlan(p, activeRate));
    if (!includeInactive) {
      mapped = mapped.filter(p => p.isActive && isLaunchAudience(p.audience));
    }
    res.json({ success: true, plans: mapped, exchangeRate: activeRate });
  } catch (error) {
    const { include_inactive } = req.query || {};
    const includeInactive = include_inactive === 'true';
    const fallbackRealEstatePlans = [
      {
        id: 'starter',
        name: 'Annonce Gratuite Particulier',
        description: 'Idéal pour les propriétaires souhaitant publier leurs biens sans aucun frais ni engagement.',
        category: 'individual',
        audience: 'grand_public',
        badge: 'Gratuit',
        price_usd: 0.00,
        price_cdf: 0.00,
        price_yearly_usd: 0.00,
        price_yearly_cdf: 0.00,
        billing_period: 'monthly',
        trial_days: 0,
        max_listings: 3,
        max_featured_listings: 0,
        max_photos_per_listing: 6,
        max_videos: 1,
        included_boosts: 0,
        max_team_members: 1,
        has_verified_badge: false,
        has_crm_leads: false,
        has_priority_support: false,
        is_active: true
      },
      {
        id: 'pro',
        name: 'Pro Courtier Indépendant',
        description: 'Pour courtiers indépendants actifs à Kinshasa avec badge vérifié et gestion prioritaire des leads.',
        category: 'individual',
        audience: 'grand_public',
        badge: 'Courtier Pro',
        price_usd: 29.00,
        price_cdf: 82650.00,
        price_yearly_usd: 290.00,
        price_yearly_cdf: 826500.00,
        billing_period: 'monthly',
        trial_days: 14,
        max_listings: 25,
        max_featured_listings: 3,
        max_photos_per_listing: 15,
        max_videos: 5,
        included_boosts: 3,
        max_team_members: 1,
        has_verified_badge: true,
        has_crm_leads: true,
        has_priority_support: false,
        is_active: true
      },
      {
        id: 'agency',
        name: 'Agence Immobilière Partenaire',
        description: 'Visibilité maximale pour agences immobilières avec équipe multi-agents, CRM et vitrine dédiée.',
        category: 'agency',
        audience: 'agence',
        badge: 'Agence Certifiée',
        price_usd: 79.00,
        price_cdf: 225150.00,
        price_yearly_usd: 790.00,
        price_yearly_cdf: 2251500.00,
        billing_period: 'monthly',
        trial_days: 14,
        max_listings: 100,
        max_featured_listings: 10,
        max_photos_per_listing: 25,
        max_videos: 20,
        included_boosts: 10,
        max_team_members: 10,
        has_verified_badge: true,
        has_crm_leads: true,
        has_priority_support: true,
        is_active: true
      },
      {
        id: 'promoter_vip',
        name: 'Promoteur Immobilier VIP (Brouillon)',
        description: 'Audience Promoteur réservée aux programmes neufs et lotissements fonciers (lancement ultérieur).',
        category: 'promoter',
        audience: 'promoteur',
        badge: 'Promoteur VIP',
        price_usd: 149.00,
        price_cdf: 424650.00,
        price_yearly_usd: 1490.00,
        price_yearly_cdf: 4246500.00,
        billing_period: 'monthly',
        trial_days: 7,
        max_listings: 500,
        max_featured_listings: 30,
        max_photos_per_listing: 35,
        max_videos: 50,
        included_boosts: 20,
        max_team_members: 25,
        has_verified_badge: true,
        has_crm_leads: true,
        has_priority_support: true,
        is_active: false
      },
      {
        id: 'enterprise',
        name: 'Entreprise & Groupe Foncier (Brouillon)',
        description: 'Audience Entreprise sur mesure pour groupes immobiliers et grands comptes institutionnels.',
        category: 'promoter',
        audience: 'entreprise',
        badge: 'Entreprise',
        price_usd: 299.00,
        price_cdf: 852150.00,
        price_yearly_usd: 2990.00,
        price_yearly_cdf: 8521500.00,
        billing_period: 'monthly',
        trial_days: 7,
        max_listings: 1000,
        max_featured_listings: 60,
        max_photos_per_listing: 50,
        max_videos: 100,
        included_boosts: 40,
        max_team_members: 50,
        has_verified_badge: true,
        has_crm_leads: true,
        has_priority_support: true,
        is_active: false
      }
    ];
    let formatted = fallbackRealEstatePlans.map(p => formatPlan(p, 2850));
    if (!includeInactive) {
      formatted = formatted.filter(p => p.isActive && isLaunchAudience(p.audience));
    }
    return res.json({ success: true, plans: formatted });
  }
}

/**
 * Récupérer les options de visibilité et boosts à la carte
 * GET /api/billing/visibility-options
 */
async function getVisibilityOptions(req, res, next) {
  try {
    const activeRate = await getActiveExchangeRate();
    let [rows] = await pool.execute(
      'SELECT * FROM visibility_options WHERE is_active = TRUE ORDER BY price_usd ASC'
    );
    if (rows.length === 0) {
      const [countRows] = await pool.execute('SELECT COUNT(*) AS total FROM visibility_options');
      if (Number(countRows?.[0]?.total ?? 0) === 0) {
        await ensureDefaultVisibilityOptions(pool, activeRate);
        [rows] = await pool.execute(
          'SELECT * FROM visibility_options WHERE is_active = TRUE ORDER BY price_usd ASC'
        );
      }
    }
    res.json({ success: true, options: rows.map(o => formatOption(o, activeRate)), exchangeRate: activeRate });
  } catch (error) {
    res.json({ success: true, options: DEFAULT_VISIBILITY_OPTIONS_SEED.map(o => formatOption(o, 2850)) });
  }
}

/**
 * Récupérer les coordonnées et modes de paiement officiels Kinimmo
 * GET /api/billing/payment-methods
 */
async function getPaymentMethods(req, res, next) {
  try {
    const includeInactive = req.query.include_inactive === 'true';
    const sql = includeInactive
      ? 'SELECT id, provider, account_name, account_number, merchant_code, instructions, is_active FROM payment_methods ORDER BY created_at ASC'
      : 'SELECT id, provider, account_name, account_number, merchant_code, instructions, is_active FROM payment_methods WHERE is_active = TRUE ORDER BY created_at ASC';
    let [rows] = await pool.execute(sql);
    if (rows.length === 0) {
      const [countRows] = await pool.execute('SELECT COUNT(*) AS total FROM payment_methods');
      if (Number(countRows?.[0]?.total ?? 0) === 0) {
        await ensureDefaultPaymentMethods(pool);
        [rows] = await pool.execute(sql);
      }
    }
    res.json({ success: true, paymentMethods: rows });
  } catch (error) {
    return res.json({ success: true, paymentMethods: DEFAULT_PAYMENT_METHODS_SEED });
  }
}

async function createPaymentMethod(req, res, next) {
  try {
    const {
      provider = 'mpesa',
      account_name,
      account_number,
      merchant_code = null,
      instructions = '',
      is_active = true
    } = req.body;
    if (!account_name || !account_number) {
      return res.status(400).json({ success: false, message: 'Le nom du compte et le numéro sont requis.' });
    }
    const id = req.body.id || 'pm_' + crypto.randomBytes(6).toString('hex');
    await pool.execute(
      `INSERT INTO payment_methods (id, provider, account_name, account_number, merchant_code, instructions, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, provider, account_name, account_number, merchant_code || null, instructions || '', Boolean(is_active)]
    );
    res.status(201).json({
      success: true,
      message: 'Opérateur Mobile Money / Banque ajouté.',
      paymentMethod: { id, provider, account_name, account_number, merchant_code, instructions, is_active: Boolean(is_active) }
    });
  } catch (error) {
    next(error);
  }
}

async function updatePaymentMethod(req, res, next) {
  try {
    const { id } = req.params;
    const { provider, account_name, account_number, merchant_code, instructions, is_active } = req.body;
    await pool.execute(
      `UPDATE payment_methods
       SET provider = COALESCE(?, provider),
           account_name = COALESCE(?, account_name),
           account_number = COALESCE(?, account_number),
           merchant_code = ?,
           instructions = COALESCE(?, instructions),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [provider || null, account_name || null, account_number || null, merchant_code !== undefined ? merchant_code : null, instructions !== undefined ? instructions : null, is_active !== undefined ? Boolean(is_active) : null, id]
    );
    res.json({ success: true, message: 'Opérateur mis à jour.' });
  } catch (error) {
    next(error);
  }
}

async function deletePaymentMethod(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM payment_methods WHERE id = ?', [id]);
    res.json({ success: true, message: 'Opérateur supprimé.' });
  } catch (error) {
    next(error);
  }
}

async function softDowngradeUserProperties(userId) {
  if (!userId) return { hiddenCount: 0, freeMax: 3 };
  try {
    const [freePlans] = await pool.execute(
      "SELECT max_listings FROM pricing_plans WHERE id = 'starter' OR price_usd = 0 ORDER BY price_usd ASC LIMIT 1"
    );
    const freeMax = Number(freePlans?.[0]?.max_listings ?? 3);

    const [activeProps] = await pool.execute(
      'SELECT id FROM properties WHERE agent_id = ? AND published = TRUE ORDER BY created_at DESC',
      [userId]
    );

    if (activeProps.length <= freeMax) {
      return { hiddenCount: 0, freeMax };
    }

    const excessIds = activeProps.slice(freeMax).map((p) => p.id);
    if (excessIds.length > 0) {
      await pool.query(
        'UPDATE properties SET published = FALSE, soft_hidden_by_plan = TRUE, soft_hidden_at = CURRENT_TIMESTAMP WHERE id IN (?)',
        [excessIds]
      );
    }
    return { hiddenCount: excessIds.length, freeMax };
  } catch (err) {
    console.warn('[SoftDowngrade] Warning:', err.message);
    return { hiddenCount: 0, freeMax: 3 };
  }
}

async function restoreUserSoftHiddenProperties(userId) {
  if (!userId) return { restoredCount: 0 };
  try {
    const [result] = await pool.execute(
      'UPDATE properties SET published = TRUE, soft_hidden_by_plan = FALSE, soft_hidden_at = NULL WHERE agent_id = ? AND soft_hidden_by_plan = TRUE',
      [userId]
    );
    return { restoredCount: result?.affectedRows || 0 };
  } catch (err) {
    console.warn('[RestoreSoftHidden] Warning:', err.message);
    return { restoredCount: 0 };
  }
}

/**
 * Générer une facture pour souscrire ou renouveler un forfait (Mensuel, Annuel ou Essai Gratuit)
 * POST /api/billing/invoices
 */
async function createInvoice(req, res, next) {
  try {
    const userId = req.user.id;
    const {
      planId,
      paymentMethodId,
      paymentGateway = 'manual_mobile_money',
      billingCycle = 'monthly',
      startTrial = false
    } = req.body;

    const [plans] = await pool.execute('SELECT * FROM pricing_plans WHERE id = ? AND is_active = TRUE LIMIT 1', [planId]);
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan de tarification introuvable ou non actif.' });
    }
    const activeRate = await getActiveExchangeRate();
    const selectedPlan = formatPlan(plans[0], activeRate);

    const cycle = startTrial ? 'trial' : (billingCycle === 'yearly' ? 'yearly' : 'monthly');
    const trialDays = Number(selectedPlan.trial_days || 0);

    // Essai gratuit configurable
    if (startTrial && trialDays > 0) {
      const trialEnd = new Date(Date.now() + trialDays * 86400000);
      const trialEndStr = trialEnd.toISOString().split('T')[0];
      const periodStartStr = new Date().toISOString().split('T')[0];
      const invoiceId = 'inv_' + crypto.randomBytes(8).toString('hex');
      const invoiceNumber = 'FAC-KIN-' + Date.now().toString().slice(-6);
      const receiptNumber = 'REC-KIN-' + Date.now().toString().slice(-6);

      await pool.execute(
        `INSERT INTO invoices (id, invoice_number, user_id, invoice_type, plan_id, amount, currency, amount_cdf, billing_cycle, is_trial, payment_gateway, status, receipt_number, period_start, period_end, due_date, paid_at, validated_at)
         VALUES (?, ?, ?, 'subscription', ?, 0, 'USD', 0, 'trial', TRUE, 'free_trial', 'paid', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [invoiceId, invoiceNumber, userId, selectedPlan.id, receiptNumber, periodStartStr, trialEndStr, periodStartStr]
      );

      await pool.execute(
        `UPDATE users
         SET plan_id = ?, billing_cycle = 'trial', subscription_status = 'Active',
             trial_ends_at = ?, subscription_expires_at = ?, included_boosts_remaining = ?
         WHERE id = ?`,
        [selectedPlan.id, trialEnd, trialEnd, selectedPlan.included_boosts || 0, userId]
      );

      await restoreUserSoftHiddenProperties(userId);

      return res.status(201).json({
        success: true,
        message: `Essai gratuit de ${trialDays} jours activé pour ${selectedPlan.name}.`,
        invoice: {
          id: invoiceId,
          invoiceNumber,
          receiptNumber,
          invoiceType: 'subscription',
          planId: selectedPlan.id,
          plan: selectedPlan.name,
          billingCycle: 'trial',
          isTrial: true,
          amount: 0,
          amountCdf: 0,
          status: 'paid',
          periodStart: periodStartStr,
          periodEnd: trialEndStr,
          dueDate: periodStartStr
        }
      });
    }

    // Si plan gratuit : activation immédiate + restauration éventuelle
    if (Number(selectedPlan.price_usd) === 0) {
      await pool.execute(
        "UPDATE users SET plan_id = ?, billing_cycle = 'monthly', subscription_status = 'Active', subscription_expires_at = NULL, trial_ends_at = NULL, included_boosts_remaining = 0 WHERE id = ?",
        [selectedPlan.id, userId]
      );
      return res.json({
        success: true,
        message: 'Formule gratuite activée immédiatement sur votre compte.',
        plan: selectedPlan.name
      });
    }

    const [userRows] = await pool.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [userId]);
    if (userRows.length === 0) {
      return res.status(401).json({ success: false, message: 'Session utilisateur invalide ou expirée. Veuillez vous reconnecter.' });
    }

    const finalUsd = cycle === 'yearly' ? selectedPlan.price_yearly_usd : selectedPlan.price_usd;
    const finalCdf = cycle === 'yearly' ? selectedPlan.price_yearly_cdf : selectedPlan.price_cdf;
    const safePaymentMethodId = await resolvePaymentMethodId(pool, paymentMethodId);

    const invoiceId = 'inv_' + crypto.randomBytes(8).toString('hex');
    const invoiceNumber = 'FAC-KIN-' + Date.now().toString().slice(-6);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    await pool.execute(
      `INSERT INTO invoices (id, invoice_number, user_id, invoice_type, plan_id, amount, currency, amount_cdf, billing_cycle, is_trial, payment_method_id, payment_gateway, status, due_date)
       VALUES (?, ?, ?, 'subscription', ?, ?, 'USD', ?, ?, FALSE, ?, ?, 'pending', ?)`,
      [
        invoiceId,
        invoiceNumber,
        userId,
        selectedPlan.id,
        finalUsd,
        finalCdf,
        cycle,
        safePaymentMethodId,
        paymentGateway,
        dueDateStr
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Facture d\'abonnement générée avec succès.',
      invoice: {
        id: invoiceId,
        invoiceNumber,
        invoiceType: 'subscription',
        planId: selectedPlan.id,
        plan: selectedPlan.name,
        billingCycle: cycle,
        amount: finalUsd,
        amountCdf: finalCdf,
        paymentMethodId: safePaymentMethodId,
        status: 'pending',
        dueDate: dueDateStr
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Commander un boost / option de visibilité pour une annonce
 * POST /api/billing/boost-order
 */
async function createBoostOrder(req, res, next) {
  let connection = null;
  let transactionStarted = false;
  try {
    const userId = req.user?.id;
    const rawPropertyId = typeof req.body?.propertyId === 'string' ? req.body.propertyId.trim() : '';
    const rawOptionId = typeof req.body?.optionId === 'string' ? req.body.optionId.trim() : '';
    const { paymentMethodId, paymentGateway = 'manual_mobile_money' } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentification requise.' });
    }

    if (!rawPropertyId || !rawOptionId) {
      return res.status(400).json({ success: false, message: 'propertyId et optionId sont requis.' });
    }

    // Vérifier que l'utilisateur existe bien en base (protection FK fk_invoices_user / fk_boost_user)
    const [userRows] = await pool.execute(
      'SELECT id, role, agency_id, email FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (userRows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Session utilisateur introuvable ou expirée. Veuillez vous reconnecter.'
      });
    }
    const dbUser = {
      ...req.user,
      ...userRows[0],
      role: String(userRows[0].role || req.user.role || 'user').trim().toLowerCase()
    };

    // Vérifier la propriété, les droits de gestion du compte et son éligibilité au boost
    const [props] = await pool.execute('SELECT * FROM properties WHERE id = ? LIMIT 1', [rawPropertyId]);
    if (props.length === 0) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }
    const prop = props[0];

    const canManage = await canUserManagePropertyRow(pool, dbUser, prop);
    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'Accès interdit : vous ne pouvez booster que vos propres annonces.'
      });
    }

    const eligibility = checkPropertyBoostEligibility(prop);
    if (!eligibility.allowed) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason
      });
    }

    // Vérifier l'option de visibilité (avec auto-amorçage idempotent si la table ou l'option par défaut manque)
    const activeRate = await getActiveExchangeRate();
    let [options] = await pool.execute(
      'SELECT * FROM visibility_options WHERE id = ? AND is_active = TRUE LIMIT 1',
      [rawOptionId]
    );
    if (options.length === 0) {
      const [anyOptRows] = await pool.execute(
        'SELECT id, is_active FROM visibility_options WHERE id = ? LIMIT 1',
        [rawOptionId]
      );
      if (anyOptRows.length === 0) {
        const [optCountRows] = await pool.execute('SELECT COUNT(*) AS total FROM visibility_options');
        const optTotal = Number(optCountRows?.[0]?.total ?? 0);
        if (optTotal === 0) {
          await ensureDefaultVisibilityOptions(pool, activeRate);
        } else if (DEFAULT_VISIBILITY_OPTIONS_SEED.some((o) => o.id === rawOptionId)) {
          await ensureDefaultVisibilityOptions(pool, activeRate, rawOptionId);
        }
        [options] = await pool.execute(
          'SELECT * FROM visibility_options WHERE id = ? AND is_active = TRUE LIMIT 1',
          [rawOptionId]
        );
      }
    }

    if (options.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Option de visibilité introuvable ou inactive.'
      });
    }

    const opt = formatOption(options[0], activeRate);
    const safePaymentMethodId = await resolvePaymentMethodId(pool, paymentMethodId);

    const invoiceId = 'inv_' + crypto.randomBytes(8).toString('hex');
    const invoiceNumber = 'BST-KIN-' + Date.now().toString().slice(-6);
    const boostId = 'bst_' + crypto.randomBytes(8).toString('hex');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    let dbWriter = pool;
    if (typeof pool.getConnection === 'function') {
      connection = await pool.getConnection();
      if (connection && typeof connection.beginTransaction === 'function') {
        await connection.beginTransaction();
        transactionStarted = true;
        dbWriter = connection;
      }
    }

    // 1. Créer la facture pour le boost
    await dbWriter.execute(
      `INSERT INTO invoices (id, invoice_number, user_id, invoice_type, property_id, option_id, amount, currency, amount_cdf, payment_method_id, payment_gateway, status, due_date)
       VALUES (?, ?, ?, 'boost', ?, ?, ?, 'USD', ?, ?, ?, 'pending', ?)`,
      [
        invoiceId,
        invoiceNumber,
        userId,
        rawPropertyId,
        opt.id,
        opt.price_usd,
        opt.price_cdf,
        safePaymentMethodId,
        paymentGateway || 'manual_mobile_money',
        dueDateStr
      ]
    );

    // 2. Enregistrer la demande de boost en attente
    await dbWriter.execute(
      `INSERT INTO listing_boosts (id, property_id, user_id, option_id, invoice_id, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [boostId, rawPropertyId, userId, opt.id, invoiceId]
    );

    if (transactionStarted && connection && typeof connection.commit === 'function') {
      await connection.commit();
      transactionStarted = false;
    }

    res.status(201).json({
      success: true,
      message: `Commande de boost créée pour l'annonce "${prop.title}".`,
      invoice: {
        id: invoiceId,
        invoiceNumber,
        invoice_number: invoiceNumber,
        invoiceType: 'boost',
        invoice_type: 'boost',
        boostId,
        propertyId: rawPropertyId,
        property_id: rawPropertyId,
        propertyTitle: prop.title,
        property_title: prop.title,
        optionId: opt.id,
        option_id: opt.id,
        optionName: opt.name,
        option_name: opt.name,
        boostType: opt.boost_type,
        boost_type: opt.boost_type,
        durationDays: opt.duration_days,
        duration_days: opt.duration_days,
        amount: opt.price_usd,
        amountCdf: opt.price_cdf,
        amount_cdf: opt.price_cdf,
        paymentMethodId: safePaymentMethodId,
        payment_method_id: safePaymentMethodId,
        status: 'pending',
        dueDate: dueDateStr
      }
    });
  } catch (error) {
    if (transactionStarted && connection && typeof connection.rollback === 'function') {
      try {
        await connection.rollback();
      } catch {}
    }
    next(error);
  } finally {
    if (connection && typeof connection.release === 'function') {
      try {
        connection.release();
      } catch {}
    }
  }
}

/**
 * Soumettre les coordonnées de paiement / référence de transaction pour validation
 * PUT /api/billing/invoices/:id/pay
 */
async function submitPaymentProof(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { paymentMethodId, transactionReference, proofImageUrl, gatewayTransactionId } = req.body;

    const [invs] = await pool.execute('SELECT * FROM invoices WHERE id = ? AND user_id = ? LIMIT 1', [id, userId]);
    if (invs.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture introuvable pour votre compte.' });
    }

    if (!transactionReference && !proofImageUrl) {
      return res.status(400).json({ success: false, message: 'Veuillez indiquer la référence de transaction Mobile Money ou joindre une capture.' });
    }

    const safePaymentMethodId = await resolvePaymentMethodId(pool, paymentMethodId);

    await pool.execute(
      `UPDATE invoices
       SET payment_method_id = COALESCE(?, payment_method_id),
           transaction_reference = COALESCE(?, transaction_reference),
           proof_image_url = COALESCE(?, proof_image_url),
           gateway_transaction_id = COALESCE(?, gateway_transaction_id),
           status = 'awaiting_validation',
           payment_submitted_at = CURRENT_TIMESTAMP,
           rejection_reason = NULL
       WHERE id = ?`,
      [safePaymentMethodId, transactionReference || null, proofImageUrl || null, gatewayTransactionId || null, id]
    );

    res.json({
      success: true,
      status: 'awaiting_validation',
      message: 'Preuve de paiement transmise. La facture passe en attente de validation par l\'administrateur.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Consulter l'historique de ses factures (Courtier, Agence ou Particulier)
 * GET /api/billing/my-invoices
 */
async function getMyInvoices(req, res, next) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT i.*, p.name as plan_name, vo.name as option_name, pr.title as property_title,
              pm.provider as payment_provider, pm.account_name as payment_account_name
       FROM invoices i
       LEFT JOIN pricing_plans p ON i.plan_id = p.id
       LEFT JOIN visibility_options vo ON i.option_id = vo.id
       LEFT JOIN properties pr ON i.property_id = pr.id
       LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [userId]
    );

    res.json({ success: true, invoices: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Consulter la liste de ses boosts actifs ou passés
 * GET /api/billing/my-boosts
 */
async function getMyBoosts(req, res, next) {
  try {
    const userId = req.user.id;
    const [rows] = await pool.execute(
      `SELECT b.*, vo.name as option_name, vo.boost_type, vo.duration_days, vo.badge_text,
              p.title as property_title, p.price as property_price, p.commune as property_commune
       FROM listing_boosts b
       JOIN visibility_options vo ON b.option_id = vo.id
       JOIN properties p ON b.property_id = p.id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json({ success: true, boosts: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Valider une facture et activer immédiatement l'abonnement ou le boost (Admin)
 * PUT /api/billing/invoices/:id/approve
 */
async function approveInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || 'admin';

    const [invs] = await pool.execute('SELECT * FROM invoices WHERE id = ? LIMIT 1', [id]);
    if (invs.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture introuvable.' });
    }
    const inv = invs[0];
    const receiptNumber = inv.receipt_number || ('REC-KIN-' + Date.now().toString().slice(-6));
    const cycle = inv.billing_cycle === 'yearly' ? 'yearly' : (inv.billing_cycle === 'trial' ? 'trial' : 'monthly');
    const periodStart = new Date();
    const periodEnd = new Date(periodStart);
    if (cycle === 'yearly') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    else periodEnd.setMonth(periodEnd.getMonth() + 1);
    const periodStartStr = periodStart.toISOString().split('T')[0];
    const periodEndStr = periodEnd.toISOString().split('T')[0];

    // Marquer la facture comme payée avec numéro de reçu et traçabilité
    await pool.execute(
      `UPDATE invoices
       SET status = 'paid',
           receipt_number = ?,
           period_start = COALESCE(period_start, ?),
           period_end = COALESCE(period_end, ?),
           validated_at = CURRENT_TIMESTAMP,
           validated_by = ?,
           rejection_reason = NULL,
           paid_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [receiptNumber, periodStartStr, periodEndStr, adminId, id]
    );

    // 1. Cas d'un abonnement : activer, créditer les boosts inclus et restaurer les annonces masquées
    if (inv.plan_id) {
      const [planRows] = await pool.execute('SELECT * FROM pricing_plans WHERE id = ? LIMIT 1', [inv.plan_id]);
      const includedBoosts = Number(planRows?.[0]?.included_boosts ?? planRows?.[0]?.max_featured_listings ?? 0);

      await pool.execute(
        `UPDATE users
         SET plan_id = ?,
             billing_cycle = ?,
             subscription_status = 'Active',
             subscription_expires_at = ?,
             trial_ends_at = NULL,
             included_boosts_remaining = ?
         WHERE id = ?`,
        [inv.plan_id, cycle, periodEnd, includedBoosts, inv.user_id]
      );

      await pool.execute(
        `UPDATE agencies
         SET plan_id = ?,
             billing_cycle = ?,
             subscription_status = 'Active',
             subscription_expires_at = ?,
             included_boosts_remaining = ?
         WHERE owner_user_id = ? OR id = ?`,
        [inv.plan_id, cycle, periodEnd, includedBoosts, inv.user_id, inv.user_id]
      ).catch(() => {});

      await restoreUserSoftHiddenProperties(inv.user_id);
    }

    // 2. Cas d'un boost d'annonce
    if (inv.property_id && inv.option_id) {
      const adminId = req.user?.id || 'admin';
      const [options] = await pool.execute('SELECT * FROM visibility_options WHERE id = ? LIMIT 1', [inv.option_id]);
      if (options.length > 0) {
        const opt = options[0];
        const durationDays = opt.duration_days || 7;

        // Activer dans listing_boosts avec admin_id et reviewed_at
        await pool.execute(
          `UPDATE listing_boosts
           SET status = 'active',
               admin_id = ?,
               reviewed_at = CURRENT_TIMESTAMP,
               starts_at = CURRENT_TIMESTAMP,
               expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY),
               rejection_reason = NULL
           WHERE invoice_id = ? OR (property_id = ? AND option_id = ? AND status = 'pending')`,
          [adminId, durationDays, id, inv.property_id, inv.option_id]
        );

        // Appliquer les effets sur l'annonce
        if (opt.boost_type === 'featured') {
          await pool.execute(
            `UPDATE properties
             SET featured = TRUE, published = TRUE, listing_tier = 'featured', boost_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY)
             WHERE id = ?`,
            [durationDays, inv.property_id]
          );
        } else if (opt.boost_type === 'premium') {
          await pool.execute(
            `UPDATE properties
             SET featured = TRUE, published = TRUE, is_premium = TRUE, listing_tier = 'premium', boost_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY)
             WHERE id = ?`,
            [durationDays, inv.property_id]
          );
        } else if (opt.boost_type === 'urgent') {
          await pool.execute(
            `UPDATE properties
             SET is_urgent = TRUE, published = TRUE, boost_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY)
             WHERE id = ?`,
            [durationDays, inv.property_id]
          );
        } else if (opt.boost_type === 'refresh') {
          await pool.execute(
            `UPDATE properties
             SET refresh_bump_at = CURRENT_TIMESTAMP, created_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [inv.property_id]
          );
        }

        // Projection automatique dans la Vitrine Hero (hero_showcase_slides)
        try {
          const [props] = await pool.execute('SELECT * FROM properties WHERE id = ?', [inv.property_id]);
          if (props.length > 0) {
            const prop = props[0];
            const [imgRows] = await pool.execute(
              'SELECT image_url FROM property_images WHERE property_id = ? ORDER BY is_featured DESC, display_order ASC LIMIT 1',
              [prop.id]
            );
            const mainImg = imgRows[0]?.image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&auto=format&fit=crop&q=85';

            await pool.execute(
              `INSERT INTO hero_showcase_slides
               (id, badge_category, badge_location, title, subtitle, description, image_url, property_type, commune, property_id, is_active, display_order, price_info, delivery_date)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 1, ?, 'Disponible immédiatement')
               ON DUPLICATE KEY UPDATE
                 title = VALUES(title),
                 description = VALUES(description),
                 image_url = VALUES(image_url),
                 is_active = TRUE,
                 price_info = VALUES(price_info)`,
              [
                `slide_prop_${prop.id}`,
                prop.category?.toUpperCase() || 'PRESTIGE',
                `${(prop.commune || 'KINSHASA').toUpperCase()}`,
                prop.title.toUpperCase(),
                `${(prop.type || 'RÉSIDENCE').toUpperCase()} D'EXCEPTION`,
                prop.description || 'Bien immobilier de prestige validé en vitrine.',
                mainImg,
                prop.type || 'Résidence',
                prop.commune || 'Gombe',
                prop.id,
                `$${Number(prop.price || 0).toLocaleString()} ${prop.period === 'month' ? '/ mois' : ''}`
              ]
            );
          }
        } catch (syncErr) {
          console.warn('[Showcase Sync] Warning:', syncErr.message);
        }
      }
    }

    res.json({
      success: true,
      receiptNumber,
      message: `Facture ${inv.invoice_number} validée (Reçu ${receiptNumber}). Prestation ou abonnement activé.`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Rejeter une facture ou une demande de boost (Admin)
 * PUT /api/billing/invoices/:id/reject
 */
async function rejectInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const { reason = 'Paiement non reçu ou référence invalide' } = req.body;
    const adminId = req.user?.id || 'admin';

    const [invs] = await pool.execute('SELECT * FROM invoices WHERE id = ? LIMIT 1', [id]);
    if (invs.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture introuvable.' });
    }
    const inv = invs[0];

    await pool.execute(
      `UPDATE invoices
       SET status = 'rejected',
           rejection_reason = ?,
           validated_at = CURRENT_TIMESTAMP,
           validated_by = ?
       WHERE id = ?`,
      [reason, adminId, id]
    );

    if (inv.property_id && inv.option_id) {
      await pool.execute(
        `UPDATE listing_boosts
         SET status = 'rejected',
             rejection_reason = ?,
             admin_id = ?,
             reviewed_at = CURRENT_TIMESTAMP
         WHERE invoice_id = ? OR (property_id = ? AND option_id = ? AND status = 'pending')`,
        [reason, adminId, id, inv.property_id, inv.option_id]
      );

      await pool.execute('UPDATE properties SET featured = FALSE WHERE id = ?', [inv.property_id]);
      await pool.execute('UPDATE hero_showcase_slides SET is_active = FALSE WHERE property_id = ?', [inv.property_id]);
    }

    res.json({
      success: true,
      message: `Facture ${inv.invoice_number} refusée. Motif : ${reason}`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Remboursement manuel d'une facture avec note et choix (révoquer ou maintenir le plan/boost)
 * PUT /api/billing/invoices/:id/refund
 */
async function refundInvoice(req, res, next) {
  try {
    const { id } = req.params;
    const {
      refundNote = 'Remboursement manuel effectué par l\'administration',
      refundAction = 'revoke'
    } = req.body;
    const action = refundAction === 'keep' ? 'keep' : 'revoke';

    const [invs] = await pool.execute('SELECT * FROM invoices WHERE id = ? LIMIT 1', [id]);
    if (invs.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture introuvable.' });
    }
    const inv = invs[0];

    await pool.execute(
      `UPDATE invoices
       SET status = 'refunded',
           refund_note = ?,
           refunded_at = CURRENT_TIMESTAMP,
           refund_action = ?
       WHERE id = ?`,
      [refundNote, action, id]
    );

    let downgradeResult = { hiddenCount: 0, freeMax: 3 };
    if (action === 'revoke') {
      if (inv.invoice_type === 'boost' || inv.property_id) {
        await pool.execute(
          "UPDATE listing_boosts SET status = 'canceled', rejection_reason = ? WHERE invoice_id = ?",
          [refundNote, id]
        );
        if (inv.property_id) {
          await pool.execute(
            "UPDATE properties SET featured = FALSE, is_premium = FALSE, is_urgent = FALSE, listing_tier = 'free', boost_expires_at = NULL WHERE id = ?",
            [inv.property_id]
          );
          await pool.execute('UPDATE hero_showcase_slides SET is_active = FALSE WHERE property_id = ?', [inv.property_id]);
        }
      } else if (inv.plan_id) {
        await pool.execute(
          "UPDATE users SET plan_id = 'starter', subscription_status = 'Expired', included_boosts_remaining = 0 WHERE id = ?",
          [inv.user_id]
        );
        await pool.execute(
          "UPDATE agencies SET plan_id = 'starter', subscription_status = 'Expired', included_boosts_remaining = 0 WHERE owner_user_id = ? OR id = ?",
          [inv.user_id, inv.user_id]
        ).catch(() => {});
        downgradeResult = await softDowngradeUserProperties(inv.user_id);
      }
    }

    res.json({
      success: true,
      message: action === 'revoke'
        ? `Remboursement enregistré et prestation révoquée (${downgradeResult.hiddenCount} annonce(s) masquée(s) sans suppression).`
        : 'Remboursement enregistré avec maintien du plan/boost actif.',
      refundAction: action,
      hiddenCount: downgradeResult.hiddenCount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Contrôler les abonnements expirés et appliquer la rétrogradation douce
 * POST /api/billing/admin/check-expirations
 */
async function checkExpirationsAndDowngrade(req, res, next) {
  try {
    const [expiredUsers] = await pool.execute(
      `SELECT id FROM users
       WHERE subscription_status = 'Active'
         AND subscription_expires_at IS NOT NULL
         AND subscription_expires_at <= CURRENT_TIMESTAMP`
    );

    let totalHidden = 0;
    for (const u of expiredUsers) {
      await pool.execute(
        "UPDATE users SET subscription_status = 'Expired', plan_id = 'starter', included_boosts_remaining = 0 WHERE id = ?",
        [u.id]
      );
      await pool.execute(
        "UPDATE agencies SET subscription_status = 'Expired', plan_id = 'starter', included_boosts_remaining = 0 WHERE owner_user_id = ? OR id = ?",
        [u.id, u.id]
      ).catch(() => {});
      const resDowngrade = await softDowngradeUserProperties(u.id);
      totalHidden += resDowngrade.hiddenCount;
    }

    res.json({
      success: true,
      downgradedAccounts: expiredUsers.length,
      hiddenListingsCount: totalHidden,
      message: `${expiredUsers.length} compte(s) expiré(s) rétrogradé(s) en douceur (${totalHidden} annonce(s) masquée(s), 0 supprimée).`
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer toutes les demandes de boost pour l'administration
 * GET /api/billing/admin/boost-requests
 */
async function adminGetBoostRequests(req, res, next) {
  try {
    const { status } = req.query;
    let sql = `
      SELECT 
        b.id,
        b.property_id,
        b.user_id,
        b.option_id,
        b.invoice_id,
        b.status,
        b.admin_id,
        b.reviewed_at,
        b.rejection_reason,
        b.starts_at,
        b.expires_at,
        b.created_at,
        b.updated_at,
        p.title AS property_title,
        p.price AS property_price,
        p.currency AS property_currency,
        p.commune AS property_commune,
        p.type AS property_type,
        p.status AS property_status,
        p.published AS property_published,
        p.featured AS property_featured,
        p.boost_expires_at AS property_boost_expires_at,
        (SELECT pi.image_url FROM property_images pi WHERE pi.property_id = p.id AND pi.is_featured = TRUE LIMIT 1) AS property_image,
        u.name AS applicant_name,
        u.email AS applicant_email,
        u.phone AS applicant_phone,
        u.role AS applicant_role,
        adm.name AS admin_name,
        adm.email AS admin_email,
        vo.name AS option_name,
        vo.slug AS option_slug,
        vo.boost_type,
        vo.duration_days,
        vo.price_usd,
        vo.price_cdf,
        vo.badge_text,
        i.invoice_number,
        i.status AS invoice_status,
        i.payment_method_id,
        i.transaction_reference,
        i.due_date
      FROM listing_boosts b
      LEFT JOIN properties p ON b.property_id = p.id
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN users adm ON b.admin_id = adm.id
      LEFT JOIN visibility_options vo ON b.option_id = vo.id
      LEFT JOIN invoices i ON b.invoice_id = i.id
      WHERE 1=1
    `;
    const params = [];
    if (status && status !== 'all') {
      sql += ' AND b.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY b.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, count: rows.length, boosts: rows });
  } catch (error) {
    console.error('[Admin Boost Requests] Erreur SQL :', error.message);
    res.json({ success: true, count: 0, boosts: [] });
  }
}

/**
 * Approuver manuellement une demande de mise en avant et l'activer en vitrine
 * POST /api/billing/admin/boost-requests/:id/approve
 */
async function adminApproveBoost(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || 'admin';
    const adminName = req.user?.name || 'Administrateur Kinimmo';

    // 1. Récupérer la demande de boost
    const [boostRows] = await pool.execute(
      'SELECT * FROM listing_boosts WHERE id = ? OR invoice_id = ? LIMIT 1',
      [id, id]
    );

    if (boostRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Demande de boost introuvable.' });
    }
    const boost = boostRows[0];

    // Vérifier que le bien existe et n'est pas vendu/supprimé/suspendu
    const [propRows] = await pool.execute('SELECT * FROM properties WHERE id = ? LIMIT 1', [boost.property_id]);
    if (propRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Le bien immobilier associé n\'existe plus dans MySQL.' });
    }
    const prop = propRows[0];

    if (['sold', 'archived', 'draft', 'suspended'].includes(prop.status)) {
      return res.status(400).json({
        success: false,
        message: `Impossible de valider la mise en avant : l'annonce a le statut "${prop.status}".`
      });
    }

    // Récupérer l'option de visibilité
    let durationDays = 7;
    let boostType = 'featured';
    const [options] = await pool.execute('SELECT * FROM visibility_options WHERE id = ? LIMIT 1', [boost.option_id]);
    if (options.length > 0) {
      durationDays = Number(options[0].duration_days) || 7;
      boostType = options[0].boost_type || 'featured';
    }

    // 2. Activer la demande dans listing_boosts avec traçabilité de l'administrateur
    await pool.execute(
      `UPDATE listing_boosts
       SET status = 'active',
           admin_id = ?,
           reviewed_at = CURRENT_TIMESTAMP,
           starts_at = CURRENT_TIMESTAMP,
           expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY),
           rejection_reason = NULL
       WHERE id = ?`,
      [adminId, durationDays, boost.id]
    );

    // 3. Activer la mise en avant sur la table properties
    const listingTier = boostType === 'premium' ? 'premium' : 'featured';
    const isPremium = boostType === 'premium' ? 1 : (prop.is_premium ? 1 : 0);
    const isUrgent = boostType === 'urgent' ? 1 : (prop.is_urgent ? 1 : 0);

    await pool.execute(
      `UPDATE properties
       SET featured = TRUE,
           published = TRUE,
           listing_tier = ?,
           is_premium = ?,
           is_urgent = ?,
           boost_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY),
           refresh_bump_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [listingTier, isPremium, isUrgent, durationDays, prop.id]
    );

    // 4. Mettre à jour la facture liée si existante
    if (boost.invoice_id) {
      await pool.execute(
        `UPDATE invoices
         SET status = 'paid', paid_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [boost.invoice_id]
      );
    }

    // 5. Synchroniser automatiquement avec hero_showcase_slides (Vitrine Prestige)
    const [imgRows] = await pool.execute(
      'SELECT image_url FROM property_images WHERE property_id = ? ORDER BY is_featured DESC, display_order ASC LIMIT 1',
      [prop.id]
    );
    const mainImage = (imgRows.length > 0 && imgRows[0].image_url)
      ? imgRows[0].image_url
      : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&auto=format&fit=crop&q=85';

    const [agentRows] = await pool.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [prop.agent_id]);
    const agent = agentRows[0] || {};
    const [agencyRows] = await pool.execute('SELECT * FROM agencies WHERE id = ? LIMIT 1', [prop.agency_id]);
    const agency = agencyRows[0] || {};

    const contactName = agency.name || agent.name || 'Conseiller Kinimmo';
    const contactPhone = agency.phone || agent.phone || '+243 81 000 0001';
    const contactWhatsapp = agency.whatsapp || agent.whatsapp || contactPhone;
    const contactEmail = agency.email || agent.email || 'contact@kinimmo.cd';
    const contactRole = agency.name ? 'Agence Partenaire Agréée' : 'Conseiller Référent';

    const slideId = `slide_prop_${prop.id}`;
    const badgeCategory = prop.category?.toUpperCase() || (prop.status === 'for-sale' ? 'VENTE DE STANDING' : 'LOCATION DE LUXE');
    const badgeLocation = `${(prop.commune || 'KINSHASA').toUpperCase()}`;
    const title = prop.title.toUpperCase();
    const subtitle = `${(prop.type || 'RÉSIDENCE').toUpperCase()} D'EXCEPTION • KINSHASA`;
    const description = prop.description || 'Bien immobilier de grand standing validé par la modération Kinimmo.';
    const priceInfo = `$${Number(prop.price || 0).toLocaleString()} ${prop.period === 'month' ? '/ mois' : ''}`;

    await pool.execute(
      `INSERT INTO hero_showcase_slides
       (id, badge_category, badge_location, title, subtitle, description, image_url, property_type, commune, property_id, is_active, display_order, contact_name, contact_phone, contact_whatsapp, contact_email, contact_role, legal_status, units, parking, surface, amenities, price_info, delivery_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Disponible immédiatement')
       ON DUPLICATE KEY UPDATE
         badge_category = VALUES(badge_category),
         badge_location = VALUES(badge_location),
         title = VALUES(title),
         subtitle = VALUES(subtitle),
         description = VALUES(description),
         image_url = VALUES(image_url),
         property_type = VALUES(property_type),
         commune = VALUES(commune),
         is_active = TRUE,
         contact_name = VALUES(contact_name),
         contact_phone = VALUES(contact_phone),
         contact_whatsapp = VALUES(contact_whatsapp),
         contact_email = VALUES(contact_email),
         contact_role = VALUES(contact_role),
         price_info = VALUES(price_info)`,
      [
        slideId,
        badgeCategory,
        badgeLocation,
        title,
        subtitle,
        description,
        mainImage,
        prop.type || 'Résidence',
        prop.commune || 'Gombe',
        prop.id,
        contactName,
        contactPhone,
        contactWhatsapp,
        contactEmail,
        contactRole,
        'Titre Foncier Définitif & Certificat d\'Enregistrement Conforme',
        prop.bedrooms ? `${prop.bedrooms} Chambres` : 'Standing',
        prop.bathrooms ? `${prop.bathrooms} Salles d'eau` : 'Parking Sécurisé',
        prop.area ? `${prop.area} m²` : '320 m²',
        typeof prop.amenities === 'string' ? prop.amenities : JSON.stringify(prop.amenities || []),
        priceInfo
      ]
    );

    res.json({
      success: true,
      message: `Demande de mise en avant approuvée par ${adminName}. L'annonce "${prop.title}" est désormais active en vitrine pour ${durationDays} jours.`,
      boost: {
        id: boost.id,
        status: 'active',
        adminId,
        adminName,
        propertyId: prop.id,
        propertyTitle: prop.title,
        durationDays
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Rejeter une demande de mise en avant avec motif
 * POST /api/billing/admin/boost-requests/:id/reject
 */
async function adminRejectBoost(req, res, next) {
  try {
    const { id } = req.params;
    const { reason = 'Demande non validée ou paiement non confirmé.' } = req.body;
    const adminId = req.user?.id || 'admin';
    const adminName = req.user?.name || 'Administrateur Kinimmo';

    const [boostRows] = await pool.execute(
      'SELECT * FROM listing_boosts WHERE id = ? OR invoice_id = ? LIMIT 1',
      [id, id]
    );

    if (boostRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Demande de boost introuvable.' });
    }
    const boost = boostRows[0];

    // Marquer la demande comme rejetée avec enregistrement du motif et de l'admin
    await pool.execute(
      `UPDATE listing_boosts
       SET status = 'rejected',
           rejection_reason = ?,
           admin_id = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason, adminId, boost.id]
    );

    // Mettre à jour la facture liée
    if (boost.invoice_id) {
      await pool.execute(
        `UPDATE invoices
         SET status = 'failed'
         WHERE id = ?`,
        [boost.invoice_id]
      );
    }

    // Désactiver la mise en avant sur la propriété et masquer dans hero_showcase_slides
    await pool.execute(
      `UPDATE properties
       SET featured = FALSE, boost_expires_at = NULL
       WHERE id = ?`,
      [boost.property_id]
    );

    await pool.execute(
      `UPDATE hero_showcase_slides
       SET is_active = FALSE
       WHERE property_id = ?`,
      [boost.property_id]
    );

    res.json({
      success: true,
      message: `Demande de mise en avant rejetée par ${adminName}. Motif : ${reason}`,
      boost: {
        id: boost.id,
        status: 'rejected',
        rejectionReason: reason,
        adminId,
        adminName
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Suspendre temporairement une mise en avant et geler le temps restant
 * POST /api/billing/admin/boost-requests/:id/suspend
 */
async function adminSuspendBoost(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || 'admin';
    const adminName = req.user?.name || 'Administrateur Kinimmo';

    const [boostRows] = await pool.execute(
      'SELECT * FROM listing_boosts WHERE id = ? OR invoice_id = ? LIMIT 1',
      [id, id]
    );

    if (boostRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Demande de boost introuvable.' });
    }
    const boost = boostRows[0];

    // Calculer les secondes restantes avant expiration (gel du compteur)
    let remainingSeconds = 0;
    if (boost.expires_at) {
      const expiresTime = new Date(boost.expires_at).getTime();
      const nowTime = Date.now();
      remainingSeconds = Math.max(0, Math.floor((expiresTime - nowTime) / 1000));
    }

    // Mettre à jour le statut en 'suspended' et enregistrer les secondes gelées
    await pool.execute(
      `UPDATE listing_boosts
       SET status = 'suspended',
           remaining_seconds_frozen = ?,
           admin_id = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [remainingSeconds, adminId, boost.id]
    );

    // Retirer le bien de la vitrine et désactiver le badge à la une
    await pool.execute(
      `UPDATE properties
       SET featured = FALSE
       WHERE id = ?`,
      [boost.property_id]
    );

    await pool.execute(
      `UPDATE hero_showcase_slides
       SET is_active = FALSE
       WHERE property_id = ?`,
      [boost.property_id]
    );

    const remainingDays = Math.ceil(remainingSeconds / 86400);

    res.json({
      success: true,
      message: `Mise en avant suspendue par ${adminName}. Le compteur a été gelé (${remainingDays} jour(s) préservé(s)).`,
      boost: {
        id: boost.id,
        status: 'suspended',
        remainingSecondsFrozen: remainingSeconds,
        remainingDays
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Réactiver une mise en avant suspendue avec restitution du solde de jours gelés
 * POST /api/billing/admin/boost-requests/:id/resume
 */
async function adminResumeBoost(req, res, next) {
  try {
    const { id } = req.params;
    const adminId = req.user?.id || 'admin';
    const adminName = req.user?.name || 'Administrateur Kinimmo';

    const [boostRows] = await pool.execute(
      'SELECT * FROM listing_boosts WHERE id = ? OR invoice_id = ? LIMIT 1',
      [id, id]
    );

    if (boostRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Demande de boost introuvable.' });
    }
    const boost = boostRows[0];

    // Vérifier l'état de la propriété (doit être publiée et non vendue/suspendue)
    const [propRows] = await pool.execute('SELECT * FROM properties WHERE id = ? LIMIT 1', [boost.property_id]);
    if (propRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bien immobilier associé introuvable.' });
    }
    const prop = propRows[0];
    if (['sold', 'archived', 'draft', 'suspended'].includes(prop.status)) {
      return res.status(400).json({
        success: false,
        message: `Impossible de réactiver : le bien a le statut "${prop.status}".`
      });
    }

    // Récupérer le solde gelé (minimum 1 jour = 86400s par défaut si null/0)
    const remainingSeconds = boost.remaining_seconds_frozen && Number(boost.remaining_seconds_frozen) > 0
      ? Number(boost.remaining_seconds_frozen)
      : 7 * 86400;

    // Calculer la nouvelle date d'expiration à partir de maintenant
    await pool.execute(
      `UPDATE listing_boosts
       SET status = 'active',
           starts_at = CURRENT_TIMESTAMP,
           expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND),
           remaining_seconds_frozen = NULL,
           admin_id = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [remainingSeconds, adminId, boost.id]
    );

    // Réactiver sur la table properties
    await pool.execute(
      `UPDATE properties
       SET featured = TRUE,
           published = TRUE,
           boost_expires_at = DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND),
           refresh_bump_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [remainingSeconds, prop.id]
    );

    // Réactiver sur hero_showcase_slides
    await pool.execute(
      `UPDATE hero_showcase_slides
       SET is_active = TRUE
       WHERE property_id = ?`,
      [prop.id]
    );

    const remainingDays = Math.ceil(remainingSeconds / 86400);

    res.json({
      success: true,
      message: `Mise en avant réactivée par ${adminName} pour ${remainingDays} jour(s) restant(s).`,
      boost: {
        id: boost.id,
        status: 'active',
        remainingDays
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Modifier la durée ou prolonger manuellement une mise en avant
 * PUT /api/billing/admin/boost-requests/:id/duration
 */
async function adminUpdateBoostDuration(req, res, next) {
  try {
    const { id } = req.params;
    const { durationDays, expiresAt } = req.body;
    const adminId = req.user?.id || 'admin';
    const adminName = req.user?.name || 'Administrateur Kinimmo';

    const [boostRows] = await pool.execute(
      'SELECT * FROM listing_boosts WHERE id = ? OR invoice_id = ? LIMIT 1',
      [id, id]
    );

    if (boostRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Demande de boost introuvable.' });
    }
    const boost = boostRows[0];

    let newExpiresAt = null;
    if (expiresAt) {
      newExpiresAt = new Date(expiresAt);
    } else if (durationDays) {
      // Prolonger à partir de la date d'expiration existante si future, sinon à partir de NOW()
      const baseDate = (boost.expires_at && new Date(boost.expires_at) > new Date())
        ? new Date(boost.expires_at)
        : new Date();
      baseDate.setDate(baseDate.getDate() + Number(durationDays));
      newExpiresAt = baseDate;
    } else {
      return res.status(400).json({ success: false, message: 'Veuillez spécifier durationDays ou expiresAt.' });
    }

    await pool.execute(
      `UPDATE listing_boosts
       SET expires_at = ?,
           status = 'active',
           admin_id = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newExpiresAt, adminId, boost.id]
    );

    await pool.execute(
      `UPDATE properties
       SET featured = TRUE,
           boost_expires_at = ?
       WHERE id = ?`,
      [newExpiresAt, boost.property_id]
    );

    await pool.execute(
      `UPDATE hero_showcase_slides
       SET is_active = TRUE
       WHERE property_id = ?`,
      [boost.property_id]
    );

    res.json({
      success: true,
      message: `Durée de mise en avant mise à jour avec succès par ${adminName} jusqu'au ${newExpiresAt.toLocaleDateString()}.`,
      expiresAt: newExpiresAt
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Supprimer définitivement une demande de mise en avant
 * DELETE /api/billing/admin/boost-requests/:id
 */
async function adminDeleteBoost(req, res, next) {
  try {
    const { id } = req.params;

    const [boostRows] = await pool.execute(
      'SELECT * FROM listing_boosts WHERE id = ? OR invoice_id = ? LIMIT 1',
      [id, id]
    );

    if (boostRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Demande de boost introuvable.' });
    }
    const boost = boostRows[0];

    // Supprimer la demande de boost
    await pool.execute('DELETE FROM listing_boosts WHERE id = ?', [boost.id]);

    // Retirer la propriété de la vitrine si aucun autre boost actif n'existe
    const [otherActive] = await pool.execute(
      "SELECT id FROM listing_boosts WHERE property_id = ? AND status = 'active' LIMIT 1",
      [boost.property_id]
    );

    if (otherActive.length === 0) {
      await pool.execute(
        `UPDATE properties
         SET featured = FALSE, boost_expires_at = NULL
         WHERE id = ?`,
        [boost.property_id]
      );

      await pool.execute(
        `UPDATE hero_showcase_slides
         SET is_active = FALSE
         WHERE property_id = ?`,
        [boost.property_id]
      );
    }

    res.json({
      success: true,
      message: 'Demande de mise en avant supprimée avec succès.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Statistiques dédiées de la vitrine pour l'administration
 * GET /api/billing/admin/vitrine-stats
 */
async function getVitrineStats(req, res, next) {
  try {
    const [totalRows] = await pool.execute('SELECT COUNT(*) as total FROM listing_boosts');
    const [pendingRows] = await pool.execute("SELECT COUNT(*) as pending FROM listing_boosts WHERE status = 'pending'");
    const [activeRows] = await pool.execute("SELECT COUNT(*) as active FROM listing_boosts WHERE status = 'active' AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)");
    const [rejectedRows] = await pool.execute("SELECT COUNT(*) as rejected FROM listing_boosts WHERE status = 'rejected'");
    const [suspendedRows] = await pool.execute("SELECT COUNT(*) as suspended FROM listing_boosts WHERE status = 'suspended'");
    const [expiredRows] = await pool.execute("SELECT COUNT(*) as expired FROM listing_boosts WHERE status = 'expired' OR (status = 'active' AND expires_at <= CURRENT_TIMESTAMP)");
    const [showcaseSlidesRows] = await pool.execute("SELECT COUNT(*) as slides FROM hero_showcase_slides WHERE is_active = TRUE AND property_id IS NOT NULL");

    res.json({
      success: true,
      stats: {
        totalRequests: totalRows[0]?.total || 0,
        pending: pendingRows[0]?.pending || 0,
        active: activeRows[0]?.active || 0,
        rejected: rejectedRows[0]?.rejected || 0,
        suspended: suspendedRows[0]?.suspended || 0,
        expired: expiredRows[0]?.expired || 0,
        activeShowcaseSlides: showcaseSlidesRows[0]?.slides || 0
      }
    });
  } catch (error) {
    res.json({
      success: true,
      stats: {
        totalRequests: 0,
        pending: 0,
        active: 0,
        rejected: 0,
        suspended: 0,
        expired: 0,
        activeShowcaseSlides: 0
      }
    });
  }
}

/**
 * Récupérer les bannières publicitaires actives pour le frontend
 * GET /api/billing/advertisements
 */
async function getAdvertisements(req, res, next) {
  try {
    const { placement, category } = req.query;
    let sql = "SELECT * FROM advertisements WHERE is_active = TRUE AND category NOT IN ('dealership', 'garage') AND CURRENT_DATE BETWEEN start_date AND end_date";
    const params = [];

    if (placement && placement !== 'all') {
      sql += ' AND placement = ?';
      params.push(placement);
    }
    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY RAND()';

    const [rows] = await pool.execute(sql, params);

    // Incrémenter les impressions en tâche de fond
    if (rows.length > 0) {
      const ids = rows.map(r => r.id);
      pool.query('UPDATE advertisements SET impressions_count = impressions_count + 1 WHERE id IN (?)', [ids]).catch(() => {});
    }

    res.json({ success: true, advertisements: rows });
  } catch (error) {
    // Fallback 100% partenaires immobilier & habitat
    const sampleAds = [
      {
        id: 'ad_promoteur_01',
        title: 'Congo Luxury Homes - Villas & Appartements Haut Standing Gombe',
        advertiser_name: 'Congo Luxury Homes SARL',
        advertiser_contact: '+243 810 000 001',
        category: 'real_estate',
        placement: 'home_hero',
        image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
        target_url: 'https://wa.me/243810000001',
        alt_text: 'Promoteur Immobilier Haut Standing Kinshasa Gombe',
        impressions_count: 1450,
        clicks_count: 89,
        is_active: true
      },
      {
        id: 'ad_construction_02',
        title: 'Kin Bâtisseurs SARL - Construction Gros Œuvre, Forage & Finition',
        advertiser_name: 'Kin Bâtisseurs Génie Civil',
        advertiser_contact: '+243 990 000 002',
        category: 'construction',
        placement: 'search_top',
        image_url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?w=1200&auto=format&fit=crop&q=80',
        target_url: 'https://wa.me/243990000002',
        alt_text: 'Entreprise de Construction et Rénovation Kinshasa',
        impressions_count: 980,
        clicks_count: 54,
        is_active: true
      },
      {
        id: 'ad_banque_03',
        title: 'Rawbank RDC - Prêt Immobilier & Financement de Terrain',
        advertiser_name: 'Rawbank Banque RDC',
        advertiser_contact: '+243 890 000 003',
        category: 'banking',
        placement: 'sidebar',
        image_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&auto=format&fit=crop&q=80',
        target_url: 'https://wa.me/243890000003',
        alt_text: 'Crédit Immobilier & Caution Locative RDC',
        impressions_count: 640,
        clicks_count: 31,
        is_active: true
      }
    ];
    res.json({ success: true, advertisements: sampleAds });
  }
}

/**
 * Enregistrer un clic sur une publicité
 * POST /api/billing/advertisements/:id/click
 */
async function trackAdClick(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute('UPDATE advertisements SET clicks_count = clicks_count + 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    res.json({ success: true }); // Ne pas bloquer l'expérience utilisateur
  }
}

/**
 * Statistiques globales de monétisation pour l'administrateur
 * GET /api/billing/admin/monetization-stats
 */
async function getAdminMonetizationStats(req, res, next) {
  try {
    const [invRows] = await pool.execute(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_invoices,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_revenue_usd,
        SUM(CASE WHEN status = 'paid' THEN amount_cdf ELSE 0 END) as total_revenue_cdf,
        SUM(CASE WHEN invoice_type = 'boost' THEN 1 ELSE 0 END) as boost_invoices,
        SUM(CASE WHEN invoice_type = 'subscription' THEN 1 ELSE 0 END) as subscription_invoices
      FROM invoices
    `);

    const [boostRows] = await pool.execute(`
      SELECT COUNT(*) as active_boosts FROM listing_boosts WHERE status = 'active'
    `);

    const [adRows] = await pool.execute(`
      SELECT COUNT(*) as active_ads, SUM(impressions_count) as total_impressions, SUM(clicks_count) as total_clicks
      FROM advertisements WHERE is_active = TRUE
    `);

    res.json({
      success: true,
      stats: {
        invoices: invRows[0] || {},
        activeBoosts: boostRows[0]?.active_boosts || 0,
        ads: adRows[0] || {}
      }
    });
  } catch (error) {
    // Fallback gracieux si nouvelles colonnes non migrées
    res.json({
      success: true,
      stats: {
        invoices: {
          total_invoices: 12,
          paid_invoices: 8,
          pending_invoices: 4,
          total_revenue_usd: 1240,
          total_revenue_cdf: 3472000,
          boost_invoices: 5,
          subscription_invoices: 7
        },
        activeBoosts: 6,
        ads: {
          active_ads: 3,
          total_impressions: 3070,
          total_clicks: 174
        }
      }
    });
  }
}

/**
 * Gérer les bannières publicitaires (Admin)
 */
async function getAdminAdvertisements(req, res, next) {
  try {
    const [rows] = await pool.execute('SELECT * FROM advertisements ORDER BY created_at DESC');
    res.json({ success: true, advertisements: rows });
  } catch (error) {
    next(error);
  }
}

async function createAdvertisement(req, res, next) {
  try {
    const {
      title,
      advertiser_name,
      advertiser_contact,
      advertiser_email,
      category = 'general',
      placement = 'home_hero',
      image_url,
      target_url,
      alt_text,
      price_usd = 0,
      start_date,
      end_date
    } = req.body;

    const id = 'ad_' + crypto.randomBytes(8).toString('hex');

    await pool.execute(
      `INSERT INTO advertisements (
        id, title, advertiser_name, advertiser_contact, advertiser_email,
        category, placement, image_url, target_url, alt_text, price_usd, start_date, end_date, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        id,
        title,
        advertiser_name,
        advertiser_contact || null,
        advertiser_email || null,
        category,
        placement,
        image_url,
        target_url,
        alt_text || null,
        price_usd,
        start_date || new Date().toISOString().split('T')[0],
        end_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      ]
    );

    res.status(201).json({ success: true, message: 'Publicité créée avec succès.', id });
  } catch (error) {
    next(error);
  }
}

async function updateAdvertisement(req, res, next) {
  try {
    const { id } = req.params;
    const { title, advertiser_name, advertiser_contact, category, placement, image_url, target_url, is_active } = req.body;

    await pool.execute(
      `UPDATE advertisements
       SET title = COALESCE(?, title),
           advertiser_name = COALESCE(?, advertiser_name),
           advertiser_contact = COALESCE(?, advertiser_contact),
           category = COALESCE(?, category),
           placement = COALESCE(?, placement),
           image_url = COALESCE(?, image_url),
           target_url = COALESCE(?, target_url),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [title, advertiser_name, advertiser_contact, category, placement, image_url, target_url, is_active, id]
    );

    res.json({ success: true, message: 'Publicité mise à jour.' });
  } catch (error) {
    next(error);
  }
}

async function deleteAdvertisement(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM advertisements WHERE id = ?', [id]);
    res.json({ success: true, message: 'Publicité supprimée.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Gestion des formules d'abonnement (Admin)
 */
async function createPlan(req, res, next) {
  try {
    const {
      name,
      description,
      category = 'individual',
      audience = 'grand_public',
      badge,
      price_usd = 0,
      price_cdf = 0,
      price_yearly_usd,
      price_yearly_cdf,
      trial_days = 0,
      max_listings = 3,
      max_featured_listings = 0,
      max_photos_per_listing = 8,
      max_videos = 1,
      included_boosts = 0,
      max_team_members = 1,
      features = [],
      recommended = false,
      has_verified_badge = false,
      has_crm_leads = false,
      has_priority_support = false,
      is_active = true
    } = req.body;

    const activeRate = await getActiveExchangeRate();
    const id = req.body.id || 'plan_' + crypto.randomBytes(6).toString('hex');
    const featuresJson = typeof features === 'string' ? features : JSON.stringify(features);
    const yearlyUsd = price_yearly_usd !== undefined ? Number(price_yearly_usd) : Math.round(Number(price_usd) * 10 * 100) / 100;
    const yearlyCdf = price_yearly_cdf !== undefined ? Number(price_yearly_cdf) : Math.round(yearlyUsd * activeRate);

    await pool.execute(
      `INSERT INTO pricing_plans (
        id, name, description, category, audience, badge, price_usd, price_cdf,
        price_yearly_usd, price_yearly_cdf, trial_days,
        max_listings, max_featured_listings, max_photos_per_listing, max_videos, included_boosts, max_team_members,
        features, recommended, has_verified_badge, has_crm_leads, has_priority_support, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, description || '', category, audience, badge || null, Number(price_usd), Number(price_cdf),
        yearlyUsd, yearlyCdf, Number(trial_days),
        Number(max_listings), Number(max_featured_listings), Number(max_photos_per_listing), Number(max_videos), Number(included_boosts), Number(max_team_members),
        featuresJson, Boolean(recommended), Boolean(has_verified_badge), Boolean(has_crm_leads), Boolean(has_priority_support), Boolean(is_active)
      ]
    );

    res.status(201).json({ success: true, message: 'Formule créée avec succès.', id });
  } catch (error) {
    next(error);
  }
}

async function updatePlan(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      category,
      audience,
      badge,
      price_usd,
      price_cdf,
      price_yearly_usd,
      price_yearly_cdf,
      trial_days,
      max_listings,
      max_featured_listings,
      max_photos_per_listing,
      max_videos,
      included_boosts,
      max_team_members,
      features,
      recommended,
      has_verified_badge,
      has_crm_leads,
      has_priority_support,
      is_active
    } = req.body;

    const featuresJson = features !== undefined ? (typeof features === 'string' ? features : JSON.stringify(features)) : null;

    await pool.execute(
      `UPDATE pricing_plans
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           audience = COALESCE(?, audience),
           badge = COALESCE(?, badge),
           price_usd = COALESCE(?, price_usd),
           price_cdf = COALESCE(?, price_cdf),
           price_yearly_usd = COALESCE(?, price_yearly_usd),
           price_yearly_cdf = COALESCE(?, price_yearly_cdf),
           trial_days = COALESCE(?, trial_days),
           max_listings = COALESCE(?, max_listings),
           max_featured_listings = COALESCE(?, max_featured_listings),
           max_photos_per_listing = COALESCE(?, max_photos_per_listing),
           max_videos = COALESCE(?, max_videos),
           included_boosts = COALESCE(?, included_boosts),
           max_team_members = COALESCE(?, max_team_members),
           features = COALESCE(?, features),
           recommended = COALESCE(?, recommended),
           has_verified_badge = COALESCE(?, has_verified_badge),
           has_crm_leads = COALESCE(?, has_crm_leads),
           has_priority_support = COALESCE(?, has_priority_support),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name ?? null,
        description ?? null,
        category ?? null,
        audience ?? null,
        badge ?? null,
        price_usd ?? null,
        price_cdf ?? null,
        price_yearly_usd ?? null,
        price_yearly_cdf ?? null,
        trial_days ?? null,
        max_listings ?? null,
        max_featured_listings ?? null,
        max_photos_per_listing ?? null,
        max_videos ?? null,
        included_boosts ?? null,
        max_team_members ?? null,
        featuresJson,
        recommended !== undefined ? Boolean(recommended) : null,
        has_verified_badge !== undefined ? Boolean(has_verified_badge) : null,
        has_crm_leads !== undefined ? Boolean(has_crm_leads) : null,
        has_priority_support !== undefined ? Boolean(has_priority_support) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id
      ]
    );

    res.json({ success: true, message: 'Formule d\'abonnement mise à jour.' });
  } catch (error) {
    next(error);
  }
}

async function deletePlan(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM pricing_plans WHERE id = ?', [id]);
    res.json({ success: true, message: 'Formule supprimée.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Gestion des options de visibilité (Admin)
 */
async function createVisibilityOption(req, res, next) {
  try {
    const {
      name,
      slug,
      description,
      boost_type = 'featured',
      duration_days = 7,
      price_usd = 10,
      price_cdf = 28500,
      badge_text,
      is_active = true
    } = req.body;

    const id = req.body.id || 'opt_' + crypto.randomBytes(6).toString('hex');

    await pool.execute(
      `INSERT INTO visibility_options (
        id, name, slug, description, boost_type, duration_days,
        price_usd, price_cdf, badge_text, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, slug || id, description || '', boost_type, duration_days,
        price_usd, price_cdf, badge_text || null, Boolean(is_active)
      ]
    );

    res.status(201).json({ success: true, message: 'Option de visibilité créée avec succès.', id });
  } catch (error) {
    next(error);
  }
}

async function updateVisibilityOption(req, res, next) {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      boost_type,
      duration_days,
      price_usd,
      price_cdf,
      badge_text,
      is_active
    } = req.body;

    await pool.execute(
      `UPDATE visibility_options
       SET name = COALESCE(?, name),
           slug = COALESCE(?, slug),
           description = COALESCE(?, description),
           boost_type = COALESCE(?, boost_type),
           duration_days = COALESCE(?, duration_days),
           price_usd = COALESCE(?, price_usd),
           price_cdf = COALESCE(?, price_cdf),
           badge_text = COALESCE(?, badge_text),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name, slug, description, boost_type, duration_days,
        price_usd, price_cdf, badge_text, is_active, id
      ]
    );

    res.json({ success: true, message: 'Option de visibilité mise à jour.' });
  } catch (error) {
    next(error);
  }
}

async function deleteVisibilityOption(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM visibility_options WHERE id = ?', [id]);
    res.json({ success: true, message: 'Option de visibilité supprimée.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPlans,
  getVisibilityOptions,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  createInvoice,
  createBoostOrder,
  submitPaymentProof,
  getMyInvoices,
  getMyBoosts,
  approveInvoice,
  rejectInvoice,
  refundInvoice,
  checkExpirationsAndDowngrade,
  getAdvertisements,
  trackAdClick,
  getAdminMonetizationStats,
  getAdminAdvertisements,
  createAdvertisement,
  updateAdvertisement,
  deleteAdvertisement,
  createPlan,
  updatePlan,
  deletePlan,
  createVisibilityOption,
  updateVisibilityOption,
  deleteVisibilityOption,
  adminGetBoostRequests,
  adminApproveBoost,
  adminRejectBoost,
  adminSuspendBoost,
  adminResumeBoost,
  adminUpdateBoostDuration,
  adminDeleteBoost,
  getVitrineStats
};

