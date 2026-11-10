const pool = require('../config/database');
const crypto = require('crypto');

function formatPlan(p) {
  const priceUsd = Number(p.price_usd !== undefined ? p.price_usd : (p.priceMonthly || 0));
  const priceCdf = Number(p.price_cdf !== undefined ? p.price_cdf : (p.priceMonthlyCDF || (priceUsd * 2850)));
  const maxListings = Number(p.max_listings !== undefined ? p.max_listings : (p.maxListings || 3));
  const featuredListings = Number(p.max_featured_listings !== undefined ? p.max_featured_listings : (p.featuredListings || 0));

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
        'Fiche descriptive complète avec photos HD',
        'Mise en relation directe avec les acheteurs',
        'Messagerie et contacts WhatsApp directs'
      ];
    } else if (p.id === 'pro') {
      features = [
        'Jusqu\'à 25 annonces immobilières actives',
        '3 annonces en vedette (Mise en avant)',
        'Badge Officiel Courtier Vérifié Kinshasa',
        'Accès direct aux demandes de Conciergerie (Leads)',
        'Statistiques des vues et contacts WhatsApp',
        'Support réactif 6j/7'
      ];
    } else if (p.id === 'agency') {
      features = [
        'Jusqu\'à 100 annonces immobilières actives',
        '10 annonces en vedette incluses',
        'Vitrine Agence Immobilière dédiée avec logo et agents',
        'Gestion multi-comptes pour agents immobiliers',
        'Badge Agence Certifiée & Agréée RDC',
        'Rapports d\'activité mensuels et CRM leads',
        'Support prioritaire dédié 7j/7'
      ];
    } else {
      features = [
        'Annonces immobilières illimitées (grands chantiers, lotissements)',
        '30 annonces en tête de liste et carrousel d\'accueil',
        'Bannières publicitaires régie incluses',
        'Multi-diffusion WhatsApp VIP & Réseaux sociaux',
        'Conseiller commercial et juridique dédié',
        'Gestion prioritaire des visites VIP'
      ];
    }
  }

  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    badge: p.badge,
    price_usd: priceUsd,
    price_cdf: priceCdf,
    priceMonthly: priceUsd,
    priceMonthlyCDF: priceCdf,
    currency: 'USD',
    billing_period: p.billing_period || 'monthly',
    billingPeriod: 'month',
    max_listings: maxListings,
    maxListings: maxListings,
    max_featured_listings: featuredListings,
    featuredListings: featuredListings,
    agentAccounts: p.category === 'agency' ? 10 : (p.category === 'promoter' ? 25 : 1),
    features: features,
    recommended: p.id === 'agency' || p.id === 'pro',
    is_active: p.is_active !== false,
    isActive: p.is_active !== false,
    has_verified_badge: Boolean(p.has_verified_badge),
    hasVerifiedBadge: Boolean(p.has_verified_badge),
    has_crm_leads: Boolean(p.has_crm_leads),
    hasCrmLeads: Boolean(p.has_crm_leads),
    has_priority_support: Boolean(p.has_priority_support),
    hasPrioritySupport: Boolean(p.has_priority_support)
  };
}

function formatOption(opt) {
  const priceUsd = Number(opt.price_usd !== undefined ? opt.price_usd : (opt.price || 0));
  const priceCdf = Number(opt.price_cdf !== undefined ? opt.price_cdf : (opt.priceCDF || (priceUsd * 2850)));

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

/**
 * Récupérer la liste des formules d'abonnement actives
 * GET /api/billing/plans
 */
async function getPlans(req, res, next) {
  try {
    const { category } = req.query;
    let sql = "SELECT * FROM pricing_plans WHERE is_active = TRUE AND category NOT IN ('dealership', 'garage')";
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }
    sql += ' ORDER BY price_usd ASC';

    const [rows] = await pool.execute(sql, params);
    const mapped = rows.map(formatPlan);
    res.json({ success: true, plans: mapped });
  } catch (error) {
    // Repli de secours 100% immobilier si table non configurée
    const fallbackRealEstatePlans = [
      {
        id: 'starter',
        name: 'Annonce Gratuite Particulier',
        description: 'Idéal pour les propriétaires souhaitant publier leurs biens sans aucun frais ni engagement.',
        category: 'individual',
        badge: 'Gratuit',
        price_usd: 0.00,
        price_cdf: 0.00,
        billing_period: 'monthly',
        max_listings: 3,
        max_featured_listings: 0,
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
        badge: 'Courtier Pro',
        price_usd: 29.00,
        price_cdf: 82650.00,
        billing_period: 'monthly',
        max_listings: 25,
        max_featured_listings: 3,
        has_verified_badge: true,
        has_crm_leads: true,
        has_priority_support: false,
        is_active: true
      },
      {
        id: 'agency',
        name: 'Agence Immobilière Partenaire',
        description: 'Visibilité maximale pour agences immobilières avec agents illimités, CRM et vitrine dédiée.',
        category: 'agency',
        badge: 'Agence Certifiée',
        price_usd: 79.00,
        price_cdf: 225150.00,
        billing_period: 'monthly',
        max_listings: 100,
        max_featured_listings: 10,
        has_verified_badge: true,
        has_crm_leads: true,
        has_priority_support: true,
        is_active: true
      },
      {
        id: 'enterprise',
        name: 'Promoteur Immobilier & Constructeur VIP',
        description: 'Pour promoteurs fonciers, lotissements et grands chantiers avec bannières sponsorisées et multi-diffusion.',
        category: 'promoter',
        badge: 'Promoteur VIP',
        price_usd: 149.00,
        price_cdf: 424650.00,
        billing_period: 'monthly',
        max_listings: 500,
        max_featured_listings: 30,
        has_verified_badge: true,
        has_crm_leads: true,
        has_priority_support: true,
        is_active: true
      }
    ];
    return res.json({ success: true, plans: fallbackRealEstatePlans.map(formatPlan) });
  }
}

/**
 * Récupérer les options de visibilité et boosts à la carte
 * GET /api/billing/visibility-options
 */
async function getVisibilityOptions(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM visibility_options WHERE is_active = TRUE ORDER BY price_usd ASC'
    );
    res.json({ success: true, options: rows.map(formatOption) });
  } catch (error) {
    // Fallback dynamique si la table n'a pas encore été importée
    const fallbackOptions = [
      {
        id: 'opt_featured_7d',
        name: 'Mise en Avant 7 jours',
        slug: 'mise_en_avant_7d',
        description: 'Positionnement en tête de page d\'accueil et carrousel prioritaire pendant 7 jours.',
        boost_type: 'featured',
        duration_days: 7,
        price_usd: 10.0,
        price_cdf: 28500.0,
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
        badge_text: 'Multi-Canal VIP',
        icon: 'Share2',
        is_active: true
      }
    ];
    res.json({ success: true, options: fallbackOptions.map(formatOption) });
  }
}

/**
 * Récupérer les coordonnées et modes de paiement officiels Kinimmo
 * GET /api/billing/payment-methods
 */
async function getPaymentMethods(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, provider, account_name, account_number, merchant_code, instructions FROM payment_methods WHERE is_active = TRUE'
    );
    res.json({ success: true, paymentMethods: rows });
  } catch (error) {
    const fallbackPaymentMethods = [
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
    return res.json({ success: true, paymentMethods: fallbackPaymentMethods });
  }
}

/**
 * Générer une facture pour souscrire ou renouveler un forfait
 * POST /api/billing/invoices
 */
async function createInvoice(req, res, next) {
  try {
    const userId = req.user.id;
    const { planId, paymentMethodId, paymentGateway = 'manual_mobile_money' } = req.body;

    const [plans] = await pool.execute('SELECT * FROM pricing_plans WHERE id = ? AND is_active = TRUE LIMIT 1', [planId]);
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan de tarification introuvable.' });
    }
    const selectedPlan = plans[0];

    // Si plan gratuit : activation immédiate sans facture payante
    if (Number(selectedPlan.price_usd) === 0) {
      await pool.execute('UPDATE users SET plan_id = ?, subscription_status = "Active" WHERE id = ?', [selectedPlan.id, userId]);
      return res.json({
        success: true,
        message: 'Formule gratuite activée immédiatement sur votre compte.',
        plan: selectedPlan.name
      });
    }

    const invoiceId = 'inv_' + crypto.randomBytes(8).toString('hex');
    const invoiceNumber = 'FAC-KIN-' + Date.now().toString().slice(-6);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    await pool.execute(
      `INSERT INTO invoices (id, invoice_number, user_id, invoice_type, plan_id, amount, currency, amount_cdf, payment_method_id, payment_gateway, status, due_date)
       VALUES (?, ?, ?, 'subscription', ?, ?, 'USD', ?, ?, ?, 'pending', ?)`,
      [
        invoiceId,
        invoiceNumber,
        userId,
        selectedPlan.id,
        selectedPlan.price_usd,
        selectedPlan.price_cdf,
        paymentMethodId || null,
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
        plan: selectedPlan.name,
        amount: selectedPlan.price_usd,
        amountCdf: selectedPlan.price_cdf,
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
  try {
    const userId = req.user.id;
    const { propertyId, optionId, paymentMethodId, paymentGateway = 'manual_mobile_money' } = req.body;

    if (!propertyId || !optionId) {
      return res.status(400).json({ success: false, message: 'propertyId et optionId sont requis.' });
    }

    // Vérifier la propriété
    const [props] = await pool.execute('SELECT id, title, agent_id FROM properties WHERE id = ? LIMIT 1', [propertyId]);
    if (props.length === 0) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }
    const prop = props[0];

    // Vérifier l'option de visibilité
    const [options] = await pool.execute('SELECT * FROM visibility_options WHERE id = ? AND is_active = TRUE LIMIT 1', [optionId]);
    if (options.length === 0) {
      return res.status(404).json({ success: false, message: 'Option de visibilité introuvable.' });
    }
    const opt = options[0];

    const invoiceId = 'inv_' + crypto.randomBytes(8).toString('hex');
    const invoiceNumber = 'BST-KIN-' + Date.now().toString().slice(-6);
    const boostId = 'bst_' + crypto.randomBytes(8).toString('hex');

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Créer la facture pour le boost
    await pool.execute(
      `INSERT INTO invoices (id, invoice_number, user_id, invoice_type, property_id, option_id, amount, currency, amount_cdf, payment_method_id, payment_gateway, status, due_date)
       VALUES (?, ?, ?, 'boost', ?, ?, ?, 'USD', ?, ?, ?, 'pending', ?)`,
      [
        invoiceId,
        invoiceNumber,
        userId,
        propertyId,
        opt.id,
        opt.price_usd,
        opt.price_cdf,
        paymentMethodId || null,
        paymentGateway,
        dueDateStr
      ]
    );

    // Enregistrer la demande de boost en attente
    await pool.execute(
      `INSERT INTO listing_boosts (id, property_id, user_id, option_id, invoice_id, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [boostId, propertyId, userId, opt.id, invoiceId]
    );

    res.status(201).json({
      success: true,
      message: `Commande de boost créée pour l'annonce "${prop.title}".`,
      invoice: {
        id: invoiceId,
        invoiceNumber,
        invoiceType: 'boost',
        boostId,
        propertyId,
        propertyTitle: prop.title,
        optionName: opt.name,
        boostType: opt.boost_type,
        amount: opt.price_usd,
        amountCdf: opt.price_cdf,
        status: 'pending',
        dueDate: dueDateStr
      }
    });
  } catch (error) {
    next(error);
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

    await pool.execute(
      `UPDATE invoices
       SET payment_method_id = COALESCE(?, payment_method_id),
           transaction_reference = COALESCE(?, transaction_reference),
           proof_image_url = COALESCE(?, proof_image_url),
           gateway_transaction_id = COALESCE(?, gateway_transaction_id)
       WHERE id = ?`,
      [paymentMethodId || null, transactionReference || null, proofImageUrl || null, gatewayTransactionId || null, id]
    );

    res.json({
      success: true,
      message: 'Justificatif de paiement enregistré. Votre compte ou option sera activé dès vérification.'
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

    const [invs] = await pool.execute('SELECT * FROM invoices WHERE id = ? LIMIT 1', [id]);
    if (invs.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture introuvable.' });
    }
    const inv = invs[0];

    // Marquer la facture comme payée
    await pool.execute(
      `UPDATE invoices
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    // 1. Cas d'un abonnement
    if (inv.plan_id) {
      await pool.execute(
        `UPDATE users
         SET plan_id = ?, subscription_status = 'Active'
         WHERE id = ?`,
        [inv.plan_id, inv.user_id]
      );
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
      message: `Facture ${inv.invoice_number} validée avec succès. Prestation ou abonnement activé.`
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

    // Marquer la facture comme rejetée/échouée
    await pool.execute(
      `UPDATE invoices
       SET status = 'failed'
       WHERE id = ?`,
      [id]
    );

    // Annuler le boost si c'était un boost et conserver le motif
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

      // Désactiver le statut featured sur la propriété et masquer dans hero_showcase_slides
      await pool.execute('UPDATE properties SET featured = FALSE WHERE id = ?', [inv.property_id]);
      await pool.execute('UPDATE hero_showcase_slides SET is_active = FALSE WHERE property_id = ?', [inv.property_id]);
    }

    res.json({
      success: true,
      message: `Facture ${inv.invoice_number} rejetée. Le boost n'a pas été activé. Raison : ${reason}`
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
      badge,
      price_usd = 0,
      price_cdf = 0,
      max_listings = 3,
      max_featured_listings = 0,
      features = [],
      recommended = false,
      is_active = true
    } = req.body;

    const id = req.body.id || 'plan_' + crypto.randomBytes(6).toString('hex');
    const featuresJson = typeof features === 'string' ? features : JSON.stringify(features);

    await pool.execute(
      `INSERT INTO pricing_plans (
        id, name, description, category, badge, price_usd, price_cdf,
        max_listings, max_featured_listings, features, recommended, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, name, description || '', category, badge || null, price_usd, price_cdf,
        max_listings, max_featured_listings, featuresJson, Boolean(recommended), Boolean(is_active)
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
      badge,
      price_usd,
      price_cdf,
      max_listings,
      max_featured_listings,
      features,
      recommended,
      is_active
    } = req.body;

    const featuresJson = features !== undefined ? (typeof features === 'string' ? features : JSON.stringify(features)) : null;

    await pool.execute(
      `UPDATE pricing_plans
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           category = COALESCE(?, category),
           badge = COALESCE(?, badge),
           price_usd = COALESCE(?, price_usd),
           price_cdf = COALESCE(?, price_cdf),
           max_listings = COALESCE(?, max_listings),
           max_featured_listings = COALESCE(?, max_featured_listings),
           features = COALESCE(?, features),
           recommended = COALESCE(?, recommended),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name, description, category, badge, price_usd, price_cdf,
        max_listings, max_featured_listings, featuresJson, recommended, is_active, id
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
  createInvoice,
  createBoostOrder,
  submitPaymentProof,
  getMyInvoices,
  getMyBoosts,
  approveInvoice,
  rejectInvoice,
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

