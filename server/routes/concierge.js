const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRoles, requireAdmin } = require('../middleware/roles');
const { NotificationService } = require('../services/notificationService');
const { handlers: visitHandlers } = require('./propertyVisits');

// Whitelists strictes pour protection et validation
const ALLOWED_STATUSES = [
  'new',
  'searching',
  'properties_found',
  'visit_scheduled',
  'negotiation',
  'completed',
  'cancelled'
];

let schemaReadyPromise = null;

function parseJsonStringArray(val) {
  if (Array.isArray(val)) {
    return val.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {}
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeConciergeStatus(rawStatus) {
  if (!rawStatus) return 'new';
  const s = String(rawStatus).trim().toLowerCase();
  if (s === 'nouveau') return 'new';
  if (s === 'en_cours') return 'searching';
  if (s === 'traite') return 'completed';
  if (s === 'archive') return 'cancelled';
  return ALLOWED_STATUSES.includes(s) ? s : 'new';
}

/**
 * Normalise une ligne MySQL en contrat unifié (colonnes SQL + objets imbriqués UI)
 */
function serializeConciergeRow(row, { includeAdminNotes = false } = {}) {
  if (!row || typeof row !== 'object') return null;

  const id = String(row.id || '');
  const createdAt = row.created_at || row.createdAt || new Date().toISOString();
  const updatedAt = row.updated_at || row.updatedAt || createdAt;
  const year = new Date(createdAt).getFullYear() || new Date().getFullYear();
  const reference = row.reference || `KIN-CCG-${year}-${id.slice(-4).toUpperCase()}`;

  const budgetMin =
    row.budget_min !== undefined && row.budget_min !== null && row.budget_min !== ''
      ? Number(row.budget_min)
      : null;
  const budgetMax = Number(row.budget_max || 0) || 0;
  const currency = String(row.currency || 'USD').toUpperCase() === 'CDF' ? 'CDF' : 'USD';
  const bedrooms =
    row.bedrooms !== undefined && row.bedrooms !== null && row.bedrooms !== ''
      ? Number(row.bedrooms)
      : null;
  const bathrooms =
    row.bathrooms !== undefined && row.bathrooms !== null && row.bathrooms !== ''
      ? Number(row.bathrooms)
      : null;
  const parking = Boolean(row.parking);
  const furnished = Boolean(row.furnished);

  const services = parseJsonStringArray(row.services);
  const matchedPropertyIds = parseJsonStringArray(row.matched_property_ids);
  const description = row.description ?? null;

  const serialized = {
    ...row,
    id,
    reference,
    budget_min: budgetMin,
    budget_max: budgetMax,
    currency,
    bedrooms,
    bathrooms,
    parking,
    furnished,
    services: services.length > 0 ? services : ['Recherche de biens'],
    matched_property_ids: matchedPropertyIds,
    description,
    notes: description || undefined,
    status: normalizeConciergeStatus(row.status),
    assigned_agent_id: row.assigned_agent_id || null,
    assigned_agent_name: row.assigned_agent_name || null,
    created_at: createdAt,
    updated_at: updatedAt,

    // Blocs de compatibilité frontend
    projet: row.project_type || 'Acheter',
    typeBien: row.property_type || 'Appartement',
    localisation: {
      commune: row.commune || 'Gombe',
      quartier: row.quartier || undefined
    },
    budget: {
      min: budgetMin !== null ? budgetMin : undefined,
      max: budgetMax,
      devise: currency
    },
    caracteristiques: {
      chambres: bedrooms !== null ? bedrooms : undefined,
      sallesDeBain: bathrooms !== null ? bathrooms : undefined,
      parking,
      meuble: furnished
    },
    client: {
      nomComplet: row.full_name || 'Client Kinimmo',
      telephone: row.phone || '',
      whatsapp: row.whatsapp || undefined,
      email: row.email || '',
      message: description || undefined
    },
    createdAt,
    updatedAt
  };

  if (includeAdminNotes) {
    serialized.notesAdmin = row.notes_admin || row.notesAdmin || '';
  } else {
    delete serialized.notesAdmin;
    delete serialized.notes_admin;
    delete serialized.internal_notes;
    delete serialized.admin_notes;
  }

  return serialized;
}

/**
 * Projection sécurisée pour le frontend public
 */
function sanitizeForPublic(row) {
  return serializeConciergeRow(row, { includeAdminNotes: false });
}

function normalizeConciergeData(data) {
  if (!data || typeof data !== 'object') return {};
  const client = data.client || {};
  const localisation = data.localisation || {};
  const budget = data.budget || {};
  const caracteristiques = data.caracteristiques || {};

  return {
    ...data,
    full_name: data.full_name || client.nomComplet || client.nom || client.fullName || '',
    phone: data.phone || client.telephone || client.phone || '',
    whatsapp: data.whatsapp || client.whatsapp || client.whatsApp || null,
    email: data.email || client.email || client.adresseEmail || '',
    project_type: data.project_type || data.projet || '',
    property_type: data.property_type || data.typeBien || '',
    commune:
      data.commune ||
      localisation.commune ||
      (Array.isArray(localisation.communesSouhaitees) ? localisation.communesSouhaitees[0] : '') ||
      '',
    quartier: data.quartier || localisation.quartier || null,
    budget_min:
      data.budget_min !== undefined
        ? data.budget_min
        : budget.min !== undefined
        ? budget.min
        : data.budgetMin,
    budget_max:
      data.budget_max !== undefined
        ? data.budget_max
        : budget.max !== undefined
        ? budget.max
        : data.budgetMax,
    currency: data.currency || budget.devise || data.devise || 'USD',
    bedrooms:
      data.bedrooms !== undefined
        ? data.bedrooms
        : caracteristiques.chambres !== undefined
        ? caracteristiques.chambres
        : data.chambres,
    bathrooms:
      data.bathrooms !== undefined
        ? data.bathrooms
        : caracteristiques.sallesDeBain !== undefined
        ? caracteristiques.sallesDeBain
        : data.sallesDeBain,
    parking: data.parking !== undefined ? data.parking : caracteristiques.parking,
    furnished: data.furnished !== undefined ? data.furnished : caracteristiques.meuble,
    services: data.services || caracteristiques.equipementsSouhaites || [],
    description:
      data.description !== undefined
        ? data.description
        : data.notes !== undefined
        ? data.notes
        : client.message || client.messageSupplementaire || caracteristiques.cahierDesCharges || null
  };
}

/**
 * Validation robuste des entrées de demande (retourne liste + map par champ)
 */
function validateRequestInput(rawInput) {
  const data = normalizeConciergeData(rawInput);
  const errors = [];
  const fieldErrors = {};

  if (!data.full_name || typeof data.full_name !== 'string' || data.full_name.trim().length < 2) {
    const msg = 'Le nom complet est obligatoire (au moins 2 caractères).';
    errors.push(msg);
    fieldErrors.nomComplet = msg;
  }

  if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length < 6) {
    const msg = 'Le numéro de téléphone est obligatoire.';
    errors.push(msg);
    fieldErrors.telephone = msg;
  }

  if (!data.email || typeof data.email !== 'string') {
    const msg = 'L’adresse e-mail est obligatoire.';
    errors.push(msg);
    fieldErrors.email = msg;
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      const msg = 'Format d’adresse e-mail invalide.';
      errors.push(msg);
      fieldErrors.email = msg;
    }
  }

  if (!data.project_type || typeof data.project_type !== 'string') {
    const msg = 'Le type de projet est obligatoire.';
    errors.push(msg);
    fieldErrors.projet = msg;
  }

  if (!data.property_type || typeof data.property_type !== 'string') {
    const msg = 'Le type de bien est obligatoire.';
    errors.push(msg);
    fieldErrors.typeBien = msg;
  }

  if (!data.commune || typeof data.commune !== 'string') {
    const msg = 'La commune de Kinshasa est obligatoire.';
    errors.push(msg);
    fieldErrors.commune = msg;
  }

  if (
    data.budget_min !== undefined &&
    data.budget_min !== null &&
    data.budget_min !== '' &&
    (Number.isNaN(Number(data.budget_min)) || Number(data.budget_min) < 0)
  ) {
    const msg = 'Le budget minimum ne peut pas être négatif.';
    errors.push(msg);
    fieldErrors.budgetMin = msg;
  }

  if (
    data.budget_max === undefined ||
    data.budget_max === null ||
    data.budget_max === '' ||
    Number.isNaN(Number(data.budget_max)) ||
    Number(data.budget_max) <= 0
  ) {
    const msg = 'Le budget maximum doit être supérieur à zéro.';
    errors.push(msg);
    fieldErrors.budgetMax = msg;
  }

  if (
    data.budget_min !== undefined &&
    data.budget_min !== null &&
    data.budget_min !== '' &&
    data.budget_max !== undefined &&
    data.budget_max !== null &&
    data.budget_max !== '' &&
    Number(data.budget_min) > Number(data.budget_max) &&
    Number(data.budget_max) > 0
  ) {
    const msg = 'Le budget minimum ne peut pas dépasser le budget maximum.';
    errors.push(msg);
    fieldErrors.budgetMax = msg;
  }

  return { errors, fieldErrors };
}

/**
 * Helper SQL pour créer et mettre à niveau automatiquement la table concierge_requests
 */
async function ensureConciergeTable() {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS concierge_requests (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        reference VARCHAR(64) DEFAULT NULL,
        user_id VARCHAR(64) DEFAULT NULL,
        project_type VARCHAR(100) NOT NULL,
        property_type VARCHAR(100) NOT NULL,
        commune VARCHAR(100) NOT NULL,
        quartier VARCHAR(150) DEFAULT NULL,
        budget_min DECIMAL(15, 2) DEFAULT NULL,
        budget_max DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        bedrooms INT DEFAULT NULL,
        bathrooms INT DEFAULT NULL,
        parking BOOLEAN NOT NULL DEFAULT FALSE,
        furnished BOOLEAN NOT NULL DEFAULT FALSE,
        services TEXT DEFAULT NULL,
        description TEXT DEFAULT NULL,
        notes_admin TEXT DEFAULT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        whatsapp VARCHAR(50) DEFAULT NULL,
        email VARCHAR(255) NOT NULL,
        status ENUM('new', 'searching', 'properties_found', 'visit_scheduled', 'negotiation', 'completed', 'cancelled') NOT NULL DEFAULT 'new',
        assigned_agent_id VARCHAR(64) DEFAULT NULL,
        assigned_agent_name VARCHAR(255) DEFAULT NULL,
        matched_property_ids TEXT DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_concierge_status (status),
        INDEX idx_concierge_commune (commune)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM concierge_requests');
      const colMap = new Map(cols.map((c) => [String(c.Field).toLowerCase(), c]));

      if (!colMap.has('reference')) {
        await pool.query('ALTER TABLE concierge_requests ADD COLUMN reference VARCHAR(64) DEFAULT NULL AFTER id');
      }
      if (!colMap.has('notes_admin')) {
        await pool.query('ALTER TABLE concierge_requests ADD COLUMN notes_admin TEXT DEFAULT NULL AFTER description');
      }
      if (!colMap.has('assigned_agent_name')) {
        await pool.query('ALTER TABLE concierge_requests ADD COLUMN assigned_agent_name VARCHAR(255) DEFAULT NULL AFTER assigned_agent_id');
      }
      if (!colMap.has('matched_property_ids')) {
        await pool.query('ALTER TABLE concierge_requests ADD COLUMN matched_property_ids TEXT DEFAULT NULL AFTER assigned_agent_name');
      }

      const bMinType = String(colMap.get('budget_min')?.Type || '').toLowerCase();
      const bMaxType = String(colMap.get('budget_max')?.Type || '').toLowerCase();
      if (bMinType.includes('(12,') || bMaxType.includes('(12,')) {
        await pool.query(
          'ALTER TABLE concierge_requests MODIFY COLUMN budget_min DECIMAL(15, 2) DEFAULT NULL, MODIFY COLUMN budget_max DECIMAL(15, 2) NOT NULL DEFAULT 0.00'
        );
      }
    } catch (alterErr) {
      console.warn('[Concierge Schema Upgrade Warning]', alterErr.message);
    }
  })().catch((err) => {
    schemaReadyPromise = null;
    throw err;
  });

  return schemaReadyPromise;
}

// ==========================================
// 1. DEMANDES DE CONCIERGERIE (concierge_requests)
// ==========================================

/**
 * GET /api/concierge-requests OU /api/concierge-requests/requests OU /api/concierge/requests
 */
router.get(['/', '/requests'], authenticateToken, requireRoles('admin', 'agent'), async (req, res) => {
  try {
    await ensureConciergeTable();
    const user = req.user;
    const { status, commune, assigned_agent_id, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT c.*, COALESCE(c.assigned_agent_name, u.name) AS assigned_agent_name
      FROM concierge_requests c
      LEFT JOIN users u ON c.assigned_agent_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // CONTRÔLE D'ISOLATION DES DONNÉES : Un agent ne peut accéder QU'À ses propres demandes
    if (user.role === 'agent') {
      query += ' AND c.assigned_agent_id = ?';
      params.push(user.id);
    } else if (assigned_agent_id && user.role === 'admin') {
      query += ' AND c.assigned_agent_id = ?';
      params.push(assigned_agent_id);
    }

    if (status && ALLOWED_STATUSES.includes(status)) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (commune) {
      query += ' AND c.commune = ?';
      params.push(String(commune).trim());
    }

    const sanitizedLimit = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
    const sanitizedOffset = Math.max(parseInt(String(offset), 10) || 0, 0);

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(sanitizedLimit, sanitizedOffset);

    const [rows] = await pool.query(query, params);
    const serialized = rows.map((r) => serializeConciergeRow(r, { includeAdminNotes: true }));

    res.json({
      success: true,
      count: serialized.length,
      data: serialized
    });
  } catch (error) {
    console.error('[MySQL concierge_requests GET error]', error);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur lors de la récupération des demandes.' });
  }
});

// ==========================================
// 1b. VISITES IMMOBILIÈRES (/visits - AVANT /:id pour éviter le route shadowing !)
// ==========================================
router.get('/visits', authenticateToken, requireRoles('admin', 'agent', 'agency'), visitHandlers.listVisits);
router.post('/visits', authenticateToken, requireRoles('admin', 'agent', 'agency'), visitHandlers.createVisit);
router.patch('/visits/:id', authenticateToken, requireRoles('admin', 'agent', 'agency'), visitHandlers.updateVisit);
router.put('/visits/:id', authenticateToken, requireRoles('admin', 'agent', 'agency'), visitHandlers.updateVisit);
router.delete('/visits/:id', authenticateToken, requireRoles('admin', 'agent', 'agency'), visitHandlers.deleteVisit);

/**
 * GET /api/concierge-requests/:id OU /api/concierge-requests/requests/:id
 */
router.get(['/:id', '/requests/:id'], authenticateToken, requireRoles('admin', 'agent'), async (req, res) => {
  try {
    await ensureConciergeTable();
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.query(
      `SELECT c.*, COALESCE(c.assigned_agent_name, u.name) AS assigned_agent_name
       FROM concierge_requests c
       LEFT JOIN users u ON c.assigned_agent_id = u.id
       WHERE c.id = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Demande de conciergerie introuvable.' });
    }

    const request = rows[0];

    if (user.role === 'agent' && request.assigned_agent_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit : vous n’avez pas les droits d’accès pour consulter cette demande.'
      });
    }

    let visits = [];
    try {
      const [visitRows] = await pool.query(
        'SELECT * FROM property_visits WHERE request_id = ? ORDER BY visit_date ASC, visit_time ASC',
        [id]
      );
      visits = visitRows;
    } catch {}

    res.json({
      success: true,
      data: {
        ...serializeConciergeRow(request, { includeAdminNotes: true }),
        visits
      }
    });
  } catch (error) {
    console.error('[MySQL concierge_requests GET :id error]', error);
    res.status(500).json({ success: false, error: 'Erreur interne lors de la consultation du dossier.' });
  }
});

/**
 * POST /api/concierge-requests OU /api/concierge-requests/requests OU /api/concierge/requests
 * Création d'une nouvelle demande (Formulaire public ou connecté)
 */
router.post(['/', '/requests'], optionalAuth, async (req, res) => {
  try {
    await ensureConciergeTable();

    const normalized = normalizeConciergeData(req.body);
    const { errors: validationErrors, fieldErrors } = validateRequestInput(normalized);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Erreurs de validation des données soumises.',
        errors: fieldErrors,
        details: validationErrors
      });
    }

    const {
      project_type,
      property_type,
      commune,
      quartier = null,
      budget_min = null,
      budget_max = 0,
      currency = 'USD',
      bedrooms = null,
      bathrooms = null,
      parking = false,
      furnished = false,
      services = [],
      description = null,
      full_name,
      phone,
      whatsapp = null,
      email
    } = normalized;

    const id = `cr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reference = `KIN-CCG-${new Date().getFullYear()}-${randomSuffix}`;

    // Vérification de sécurité sur le user_id pour éviter un échec de contrainte étrangère
    let validUserId = null;
    if (req.user && req.user.id) {
      try {
        const [u] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [req.user.id]);
        if (u.length > 0) validUserId = req.user.id;
      } catch {}
    }

    const cleanServices = parseJsonStringArray(services);
    const servicesJson = JSON.stringify(cleanServices.length > 0 ? cleanServices : ['Recherche de biens']);

    // Identifiants des biens correspondants éventuels transmis par le matching client
    let matchedIds = [];
    if (Array.isArray(req.body?.matched_property_ids)) {
      matchedIds = req.body.matched_property_ids.map((item) => String(item)).filter(Boolean);
    } else if (Array.isArray(req.body?.matched_properties)) {
      matchedIds = req.body.matched_properties
        .map((m) => (m && m.property ? m.property.id : m?.id))
        .filter(Boolean)
        .map(String);
    }
    const matchedIdsJson = JSON.stringify(matchedIds);

    const cleanFullName = String(full_name).trim().substring(0, 255);
    const cleanPhone = String(phone).trim().substring(0, 50);
    const cleanWhatsapp = whatsapp ? String(whatsapp).trim().substring(0, 50) : null;
    const cleanEmail = String(email).trim().toLowerCase().substring(0, 255);
    const cleanProjectType = String(project_type).trim().substring(0, 100);
    const cleanPropertyType = String(property_type).trim().substring(0, 100);
    const cleanCommune = String(commune).trim().substring(0, 100);
    const cleanQuartier = quartier ? String(quartier).trim().substring(0, 150) : null;
    const cleanDescription = description ? String(description).trim().substring(0, 2000) : null;
    const cleanCurrency = ['USD', 'CDF'].includes(String(currency).toUpperCase())
      ? String(currency).toUpperCase()
      : 'USD';

    const insertQuery = `
      INSERT INTO concierge_requests (
        id, reference, user_id, project_type, property_type, commune, quartier,
        budget_min, budget_max, currency, bedrooms, bathrooms,
        parking, furnished, services, description, full_name,
        phone, whatsapp, email, status, assigned_agent_id, matched_property_ids, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, NOW())
    `;

    const insertParams = [
      id,
      reference,
      validUserId,
      cleanProjectType,
      cleanPropertyType,
      cleanCommune,
      cleanQuartier,
      budget_min !== null && budget_min !== '' ? Number(budget_min) : null,
      Number(budget_max) || 0,
      cleanCurrency,
      bedrooms !== null && bedrooms !== '' ? Number(bedrooms) : null,
      bathrooms !== null && bathrooms !== '' ? Number(bathrooms) : null,
      parking ? 1 : 0,
      furnished ? 1 : 0,
      servicesJson,
      cleanDescription,
      cleanFullName,
      cleanPhone,
      cleanWhatsapp,
      cleanEmail,
      matchedIdsJson
    ];

    await pool.query(insertQuery, insertParams);

    const [createdRows] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [id]);
    const createdRequest = createdRows[0] || {
      id,
      reference,
      user_id: validUserId,
      project_type: cleanProjectType,
      property_type: cleanPropertyType,
      commune: cleanCommune,
      quartier: cleanQuartier,
      budget_min: budget_min !== null && budget_min !== '' ? Number(budget_min) : null,
      budget_max: Number(budget_max) || 0,
      currency: cleanCurrency,
      bedrooms: bedrooms !== null && bedrooms !== '' ? Number(bedrooms) : null,
      bathrooms: bathrooms !== null && bathrooms !== '' ? Number(bathrooms) : null,
      parking: Boolean(parking),
      furnished: Boolean(furnished),
      services: cleanServices,
      matched_property_ids: matchedIds,
      description: cleanDescription,
      full_name: cleanFullName,
      phone: cleanPhone,
      whatsapp: cleanWhatsapp,
      email: cleanEmail,
      status: 'new',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Déclencher notification de confirmation (strictement non bloquant)
    try {
      await NotificationService.triggerClientRequestConfirmation({ ...createdRequest, reference });
    } catch (notifErr) {
      console.warn('[Notification Trigger Warning]', notifErr.message);
    }

    const publicData = sanitizeForPublic({ ...createdRequest, reference });

    res.status(201).json({
      success: true,
      message: 'Votre demande de recherche a été enregistrée avec succès. Un conseiller de la Conciergerie Kinimmo va vous contacter sous 24h.',
      reference,
      data: publicData
    });
  } catch (error) {
    console.error('[MySQL concierge_requests POST error]', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l’enregistrement de votre demande : ' + (error.message || 'Serveur indisponible')
    });
  }
});

/**
 * PATCH / PUT /api/concierge-requests/:id OU /api/concierge-requests/requests/:id
 */
async function updateConciergeRequest(req, res) {
  try {
    await ensureConciergeTable();
    const { id } = req.params;
    const user = req.user;
    const body = normalizeConciergeData(req.body);
    const {
      status,
      assigned_agent_id,
      assigned_agent_name,
      notesAdmin,
      project_type,
      property_type,
      commune,
      quartier,
      budget_min,
      budget_max,
      currency,
      bedrooms,
      bathrooms,
      parking,
      furnished,
      services,
      description,
      full_name,
      phone,
      whatsapp,
      email
    } = body;

    const [existingRows] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Demande introuvable.' });
    }
    const previousReq = existingRows[0];

    // Un agent ne peut modifier que le statut / notes de ses propres dossiers assignés
    if (user.role === 'agent') {
      if (previousReq.assigned_agent_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: 'Accès interdit : vous ne pouvez mettre à jour que les demandes qui vous sont attribuées.'
        });
      }
      if (req.body.assigned_agent_id !== undefined) {
        return res.status(403).json({
          success: false,
          error: 'Accès interdit : seul un administrateur peut réattribuer une demande.'
        });
      }
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      const normalizedStatus = normalizeConciergeStatus(status);
      if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({
          success: false,
          error: `Statut invalide. Statuts acceptés : ${ALLOWED_STATUSES.join(', ')}`
        });
      }
      updates.push('status = ?');
      params.push(normalizedStatus);
    }

    let agentToNotify = null;
    if (assigned_agent_id !== undefined && user.role === 'admin') {
      if (assigned_agent_id) {
        let resolvedUserId = null;
        let resolvedAgentName = assigned_agent_name || null;

        try {
          const [userRows] = await pool.query(
            'SELECT id, name, email, phone, role FROM users WHERE id = ? LIMIT 1',
            [assigned_agent_id]
          );
          if (userRows.length > 0) {
            resolvedUserId = userRows[0].id;
            resolvedAgentName = resolvedAgentName || userRows[0].name;
            agentToNotify = userRows[0];
          }
        } catch {}

        // Si l'ID vient du répertoire agents plutôt que de users
        if (!resolvedUserId) {
          try {
            const [agentRows] = await pool.query(
              'SELECT id, user_id, name, email, phone FROM agents WHERE id = ? OR user_id = ? LIMIT 1',
              [assigned_agent_id, assigned_agent_id]
            );
            if (agentRows.length > 0) {
              const ag = agentRows[0];
              resolvedAgentName = resolvedAgentName || ag.name;
              if (ag.user_id) {
                const [linkedUser] = await pool.query('SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1', [ag.user_id]);
                if (linkedUser.length > 0) {
                  resolvedUserId = linkedUser[0].id;
                  agentToNotify = linkedUser[0];
                }
              }
            }
          } catch {}
        }

        if (!resolvedUserId && !resolvedAgentName) {
          return res.status(400).json({ success: false, error: 'Agent responsable introuvable.' });
        }

        updates.push('assigned_agent_id = ?');
        params.push(resolvedUserId);
        updates.push('assigned_agent_name = ?');
        params.push(resolvedAgentName || null);
      } else {
        updates.push('assigned_agent_id = ?');
        params.push(null);
        updates.push('assigned_agent_name = ?');
        params.push(null);
      }
    }

    if (notesAdmin !== undefined) {
      updates.push('notes_admin = ?');
      params.push(notesAdmin === null ? null : String(notesAdmin).trim());
    }
    if (req.body.description !== undefined || req.body.notes !== undefined) {
      updates.push('description = ?');
      params.push(description ? String(description).trim() : null);
    }

    if (req.body.project_type !== undefined || req.body.projet !== undefined) {
      updates.push('project_type = ?');
      params.push(String(project_type).trim());
    }
    if (req.body.property_type !== undefined || req.body.typeBien !== undefined) {
      updates.push('property_type = ?');
      params.push(String(property_type).trim());
    }
    if (req.body.commune !== undefined || req.body.localisation !== undefined) {
      updates.push('commune = ?');
      params.push(String(commune).trim());
    }
    if (quartier !== undefined && (req.body.quartier !== undefined || req.body.localisation !== undefined)) {
      updates.push('quartier = ?');
      params.push(quartier ? String(quartier).trim() : null);
    }
    if (budget_min !== undefined) {
      updates.push('budget_min = ?');
      params.push(budget_min !== null && budget_min !== '' ? Number(budget_min) : null);
    }
    if (budget_max !== undefined) {
      updates.push('budget_max = ?');
      params.push(Number(budget_max) || 0);
    }
    if (req.body.currency !== undefined || req.body.devise !== undefined || req.body.budget !== undefined) {
      const upperCurr = String(currency || 'USD').toUpperCase();
      updates.push('currency = ?');
      params.push(['USD', 'CDF'].includes(upperCurr) ? upperCurr : 'USD');
    }
    if (bedrooms !== undefined) {
      updates.push('bedrooms = ?');
      params.push(bedrooms !== null && bedrooms !== '' ? Number(bedrooms) : null);
    }
    if (bathrooms !== undefined) {
      updates.push('bathrooms = ?');
      params.push(bathrooms !== null && bathrooms !== '' ? Number(bathrooms) : null);
    }
    if (parking !== undefined) {
      updates.push('parking = ?');
      params.push(parking ? 1 : 0);
    }
    if (furnished !== undefined) {
      updates.push('furnished = ?');
      params.push(furnished ? 1 : 0);
    }
    if (req.body.services !== undefined || req.body.caracteristiques !== undefined) {
      updates.push('services = ?');
      params.push(JSON.stringify(parseJsonStringArray(services)));
    }
    if (req.body.full_name !== undefined || req.body.client !== undefined) {
      if (full_name) {
        updates.push('full_name = ?');
        params.push(String(full_name).trim());
      }
    }
    if (req.body.phone !== undefined || req.body.client !== undefined) {
      if (phone) {
        updates.push('phone = ?');
        params.push(String(phone).trim());
      }
    }
    if (whatsapp !== undefined) {
      updates.push('whatsapp = ?');
      params.push(whatsapp ? String(whatsapp).trim() : null);
    }
    if (req.body.email !== undefined || req.body.client !== undefined) {
      if (email) {
        updates.push('email = ?');
        params.push(String(email).trim().toLowerCase());
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ valide à mettre à jour.' });
    }

    params.push(id);
    await pool.query(`UPDATE concierge_requests SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updatedRows] = await pool.query(
      `SELECT c.*, COALESCE(c.assigned_agent_name, u.name) AS assigned_agent_name
       FROM concierge_requests c
       LEFT JOIN users u ON c.assigned_agent_id = u.id
       WHERE c.id = ?`,
      [id]
    );
    const updatedRequest = serializeConciergeRow(updatedRows[0], { includeAdminNotes: true });

    if (agentToNotify && previousReq.assigned_agent_id !== updatedRequest.assigned_agent_id) {
      try {
        await NotificationService.triggerAgentNotification(updatedRequest, agentToNotify);
      } catch (notifErr) {
        console.warn('[Notification Agent Trigger Warning]', notifErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Demande mise à jour avec succès.',
      data: updatedRequest
    });
  } catch (error) {
    console.error('[MySQL concierge_requests PATCH/PUT error]', error);
    res.status(500).json({ success: false, error: 'Erreur interne lors de la mise à jour de la demande.' });
  }
}

router.patch(['/:id', '/requests/:id'], authenticateToken, requireRoles('admin', 'agent'), updateConciergeRequest);
router.put(['/:id', '/requests/:id'], authenticateToken, requireRoles('admin', 'agent'), updateConciergeRequest);

/**
 * DELETE /api/concierge-requests/:id OU /api/concierge-requests/requests/:id
 */
router.delete(['/:id', '/requests/:id'], authenticateToken, requireAdmin, async (req, res) => {
  try {
    await ensureConciergeTable();
    const { id } = req.params;
    await pool.query('DELETE FROM concierge_requests WHERE id = ?', [id]);
    res.json({ success: true, message: 'Demande supprimée définitivement.' });
  } catch (error) {
    console.error('[MySQL concierge_requests DELETE error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;
