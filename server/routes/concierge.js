const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireRoles, requireAdmin } = require('../middleware/roles');
const { NotificationService } = require('../services/notificationService');

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

const ALLOWED_VISIT_STATUSES = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'rescheduled'
];

const ALLOWED_PROJECTS = [
  'Acheter',
  'Louer',
  'Trouver un terrain',
  'Trouver un local commercial',
  'Autre'
];

/**
 * Fonction d'assainissement et projection sécurisée pour le frontend public
 * Ne JAMAIS exposer les notes administratives ni les données internes au public
 */
function sanitizeForPublic(row) {
  if (!row) return null;
  const clone = { ...row };
  // Supprimer les notes administratives confidentielles
  delete clone.notesAdmin;
  delete clone.internal_notes;
  delete clone.admin_notes;
  return clone;
}

/**
 * Validation robuste des entrées de demande
 */
function validateRequestInput(data) {
  const errors = [];

  if (!data.full_name || typeof data.full_name !== 'string' || data.full_name.trim().length < 2) {
    errors.push('Le nom complet est obligatoire (au moins 2 caractères).');
  }

  if (!data.phone || typeof data.phone !== 'string' || data.phone.trim().length < 6) {
    errors.push('Le numéro de téléphone est obligatoire.');
  }

  if (!data.email || typeof data.email !== 'string') {
    errors.push('L’adresse e-mail est obligatoire.');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email.trim())) {
      errors.push('Format d’adresse e-mail invalide.');
    }
  }

  if (!data.project_type || typeof data.project_type !== 'string') {
    errors.push('Le type de projet est obligatoire.');
  }

  if (!data.property_type || typeof data.property_type !== 'string') {
    errors.push('Le type de bien est obligatoire.');
  }

  if (!data.commune || typeof data.commune !== 'string') {
    errors.push('La commune de Kinshasa est obligatoire.');
  }

  if (data.budget_min !== undefined && data.budget_min !== null && Number(data.budget_min) < 0) {
    errors.push('Le budget minimum ne peut pas être négatif.');
  }

  if (data.budget_max !== undefined && data.budget_max !== null && Number(data.budget_max) < 0) {
    errors.push('Le budget maximum ne peut pas être négatif.');
  }

  if (
    data.budget_min &&
    data.budget_max &&
    Number(data.budget_min) > Number(data.budget_max) &&
    Number(data.budget_max) > 0
  ) {
    errors.push('Le budget minimum ne peut pas dépasser le budget maximum.');
  }

  return errors;
}

// ==========================================
// 1. DEMANDES DE CONCIERGERIE (concierge_requests)
// ==========================================

/**
 * GET /api/concierge-requests/requests OU /api/concierge/requests
 * SÉCURITÉ :
 * - Authentification obligatoire pour consulter les demandes administratives
 * - Contrôle des rôles :
 *   * Admin : accès complet à toutes les demandes
 *   * Agent : accès strictement restreint aux demandes qui lui sont attribuées (assigned_agent_id = user.id)
 * - Requêtes SQL paramétrées (protection contre SQL injection)
 */
router.get('/requests', authenticateToken, requireRoles('admin', 'agent'), async (req, res) => {
  try {
    const user = req.user;
    const { status, commune, assigned_agent_id, limit = 50, offset = 0 } = req.query;

    let query = 'SELECT * FROM concierge_requests WHERE 1=1';
    const params = [];

    // CONTRÔLE D'ISOLATION DES DONNÉES : Un agent ne peut accéder QU'À ses propres demandes
    if (user.role === 'agent') {
      query += ' AND assigned_agent_id = ?';
      params.push(user.id);
    } else if (assigned_agent_id && user.role === 'admin') {
      query += ' AND assigned_agent_id = ?';
      params.push(assigned_agent_id);
    }

    if (status && ALLOWED_STATUSES.includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (commune) {
      query += ' AND commune = ?';
      params.push(commune.trim());
    }

    // Protection SQL Injection sur limit & offset avec conversion Number stricte
    const sanitizedLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const sanitizedOffset = Math.max(Number(offset) || 0, 0);

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(sanitizedLimit, sanitizedOffset);

    // Requête préparée paramétrée
    const [rows] = await pool.query(query, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    console.error('[MySQL concierge_requests GET error]', error);
    res.status(500).json({ success: false, error: 'Erreur interne du serveur lors de la récupération des demandes.' });
  }
});

/**
 * GET /api/concierge-requests/requests/:id
 * SÉCURITÉ :
 * - Authentification obligatoire
 * - Vérification de propriété : l'agent ne peut consulter que les demandes qui lui sont attribuées
 */
router.get('/requests/:id', authenticateToken, requireRoles('admin', 'agent'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Demande de conciergerie introuvable.' });
    }

    const request = rows[0];

    // CONTRÔLE STRICT D'ACCÈS : Un agent ne peut pas voir le dossier d'un autre agent
    if (user.role === 'agent' && request.assigned_agent_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit : vous n’avez pas les droits d’accès pour consulter cette demande.'
      });
    }

    const [visits] = await pool.query(
      'SELECT * FROM property_visits WHERE request_id = ? ORDER BY visit_date ASC, visit_time ASC',
      [id]
    );

    res.json({ success: true, data: { ...request, visits } });
  } catch (error) {
    console.error('[MySQL concierge_requests GET :id error]', error);
    res.status(500).json({ success: false, error: 'Erreur interne lors de la consultation du dossier.' });
  }
});

/**
 * POST /api/concierge-requests/requests
 * Création d'une nouvelle demande (Formulaire public ou connecté)
 * SÉCURITÉ :
 * - Validation backend rigoureuse de tous les champs
 * - Requête préparée SQL paramétrée
 * - Aucune exposition de données administratives au public
 * - Déclenchement automatique de la confirmation de demande au client
 */
router.post('/requests', optionalAuth, async (req, res) => {
  try {
    const validationErrors = validateRequestInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Erreurs de validation des données soumises.',
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
    } = req.body;

    const id = `cr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const userId = req.user ? req.user.id : null;
    const servicesJson = Array.isArray(services) ? JSON.stringify(services) : JSON.stringify([]);

    // Nettoyage et assainissement
    const cleanFullName = full_name.trim().substring(0, 255);
    const cleanPhone = phone.trim().substring(0, 50);
    const cleanWhatsapp = whatsapp ? whatsapp.trim().substring(0, 50) : null;
    const cleanEmail = email.trim().toLowerCase().substring(0, 255);
    const cleanCommune = commune.trim().substring(0, 100);
    const cleanQuartier = quartier ? String(quartier).trim().substring(0, 150) : null;
    const cleanDescription = description ? String(description).trim().substring(0, 2000) : null;
    const cleanCurrency = ['USD', 'CDF'].includes(currency) ? currency : 'USD';

    const insertQuery = `
      INSERT INTO concierge_requests (
        id, user_id, project_type, property_type, commune, quartier,
        budget_min, budget_max, currency, bedrooms, bathrooms,
        parking, furnished, services, description, full_name,
        phone, whatsapp, email, status, assigned_agent_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, NOW())
    `;

    await pool.query(insertQuery, [
      id,
      userId,
      project_type,
      property_type,
      cleanCommune,
      cleanQuartier,
      budget_min ? Number(budget_min) : null,
      Number(budget_max) || 0,
      cleanCurrency,
      bedrooms ? Number(bedrooms) : null,
      bathrooms ? Number(bathrooms) : null,
      parking ? 1 : 0,
      furnished ? 1 : 0,
      servicesJson,
      cleanDescription,
      cleanFullName,
      cleanPhone,
      cleanWhatsapp,
      cleanEmail
    ]);

    const [createdRows] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [id]);
    const createdRequest = createdRows[0];

    // ARCHITECTURE NOTIFICATIONS : Déclencher confirmation de demande au client (sans API externe)
    try {
      await NotificationService.triggerClientRequestConfirmation(createdRequest);
    } catch (notifErr) {
      console.warn('[Notification Trigger Warning]', notifErr.message);
    }

    // Ne jamais renvoyer de données administratives au public
    res.status(201).json({
      success: true,
      message: 'Votre demande de conciergerie a été enregistrée avec succès. Un conseiller va vous contacter.',
      data: sanitizeForPublic(createdRequest)
    });
  } catch (error) {
    console.error('[MySQL concierge_requests POST error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de l’enregistrement de votre demande.' });
  }
});

/**
 * PATCH /api/concierge-requests/requests/:id
 * SÉCURITÉ :
 * - Vérifier que SEUL UN ADMINISTRATEUR peut modifier les demandes, assigner un agent ou changer les statuts critiques
 * - Requêtes préparées SQL
 */
router.patch('/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_agent_id, notesAdmin, project_type, property_type, commune, budget_max } = req.body;

    // Vérifier l'existence de la demande
    const [existingRows] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Demande introuvable.' });
    }
    const previousReq = existingRows[0];

    const updates = [];
    const params = [];

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Statut invalide. Statuts acceptés : ${ALLOWED_STATUSES.join(', ')}`
        });
      }
      updates.push('status = ?');
      params.push(status);
    }

    let agentToNotify = null;
    if (assigned_agent_id !== undefined) {
      if (assigned_agent_id) {
        // Vérifier que l'agent existe
        const [agentRows] = await pool.query('SELECT id, name, email, phone, role FROM users WHERE id = ?', [assigned_agent_id]);
        if (agentRows.length === 0) {
          return res.status(400).json({ success: false, error: 'Agent introuvable.' });
        }
        agentToNotify = agentRows[0];
      }
      updates.push('assigned_agent_id = ?');
      params.push(assigned_agent_id || null);
    }

    if (notesAdmin !== undefined) {
      updates.push('description = ?');
      params.push(String(notesAdmin).trim());
    }

    if (project_type !== undefined) {
      updates.push('project_type = ?');
      params.push(String(project_type).trim());
    }

    if (property_type !== undefined) {
      updates.push('property_type = ?');
      params.push(String(property_type).trim());
    }

    if (commune !== undefined) {
      updates.push('commune = ?');
      params.push(String(commune).trim());
    }

    if (budget_max !== undefined) {
      updates.push('budget_max = ?');
      params.push(Number(budget_max) || 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ valide à mettre à jour.' });
    }

    params.push(id);
    await pool.query(`UPDATE concierge_requests SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updatedRows] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [id]);
    const updatedRequest = updatedRows[0];

    // ARCHITECTURE NOTIFICATIONS : Déclencher notification à l'agent si nouvellement assigné
    if (agentToNotify && previousReq.assigned_agent_id !== assigned_agent_id) {
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
    console.error('[MySQL concierge_requests PATCH error]', error);
    res.status(500).json({ success: false, error: 'Erreur interne lors de la mise à jour de la demande.' });
  }
});

/**
 * DELETE /api/concierge-requests/requests/:id
 * SÉCURITÉ : Seul l'administrateur peut supprimer une demande
 */
router.delete('/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM concierge_requests WHERE id = ?', [id]);
    res.json({ success: true, message: 'Demande supprimée définitivement.' });
  } catch (error) {
    console.error('[MySQL concierge_requests DELETE error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression.' });
  }
});

// ==========================================
// 2. VISITES IMMOBILIÈRES (property_visits)
// ==========================================

/**
 * GET /api/concierge/visits
 * SÉCURITÉ :
 * - Authentification requise
 * - Un agent ne peut accéder qu'aux visites qui lui sont attribuées
 */
router.get('/visits', authenticateToken, requireRoles('admin', 'agent'), async (req, res) => {
  try {
    const user = req.user;
    const { request_id, agent_id, property_id, status } = req.query;

    let query = 'SELECT * FROM property_visits WHERE 1=1';
    const params = [];

    // CONTRÔLE D'ACCÈS AGENT : Ne voir que ses propres visites
    if (user.role === 'agent') {
      query += ' AND agent_id = ?';
      params.push(user.id);
    } else if (agent_id && user.role === 'admin') {
      query += ' AND agent_id = ?';
      params.push(agent_id);
    }

    if (request_id) {
      query += ' AND request_id = ?';
      params.push(request_id);
    }
    if (property_id) {
      query += ' AND property_id = ?';
      params.push(property_id);
    }
    if (status && ALLOWED_VISIT_STATUSES.includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY visit_date ASC, visit_time ASC';
    const [rows] = await pool.query(query, params);

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('[MySQL property_visits GET error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des visites.' });
  }
});

/**
 * POST /api/concierge/visits
 * Planification d'une visite
 * SÉCURITÉ :
 * - Authentification obligatoire (admin ou agent)
 * - Validation des données (date, format, statut)
 * - Déclencheurs de confirmation et de rappel de visite
 */
router.post('/visits', authenticateToken, requireRoles('admin', 'agent'), async (req, res) => {
  try {
    const user = req.user;
    const {
      request_id,
      property_id = null,
      agent_id = null,
      visit_date,
      visit_time = null,
      status = 'scheduled',
      notes = null
    } = req.body;

    if (!request_id || !visit_date) {
      return res.status(400).json({
        success: false,
        error: 'Champs obligatoires manquants (request_id, visit_date).'
      });
    }

    // Si c'est un agent qui programme, il ne peut programmer que pour lui-même
    const targetAgentId = user.role === 'agent' ? user.id : (agent_id || user.id);

    // Vérifier la demande associée
    const [reqRows] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [request_id]);
    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Demande associée introuvable.' });
    }
    const assocRequest = reqRows[0];

    // Vérifier l'agent
    let assocAgent = null;
    if (targetAgentId) {
      const [agentRows] = await pool.query('SELECT id, name, email, phone FROM users WHERE id = ?', [targetAgentId]);
      if (agentRows.length > 0) assocAgent = agentRows[0];
    }

    const id = `pv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const validStatus = ALLOWED_VISIT_STATUSES.includes(status) ? status : 'scheduled';

    const insertQuery = `
      INSERT INTO property_visits (
        id, request_id, property_id, agent_id, visit_date, visit_time, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(insertQuery, [
      id,
      request_id,
      property_id,
      targetAgentId,
      visit_date,
      visit_time ? String(visit_time).substring(0, 20) : null,
      validStatus,
      notes ? String(notes).trim().substring(0, 1000) : null
    ]);

    // Mettre à jour le statut de la demande en 'visit_scheduled'
    await pool.query(
      "UPDATE concierge_requests SET status = 'visit_scheduled' WHERE id = ? AND status IN ('new', 'searching', 'properties_found')",
      [request_id]
    );

    const [createdRows] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [id]);
    const createdVisit = createdRows[0];

    // ARCHITECTURE NOTIFICATIONS : Déclencher confirmation de visite au client et à l'agent
    try {
      await NotificationService.triggerVisitConfirmation(createdVisit, assocRequest, assocAgent);
    } catch (notifErr) {
      console.warn('[Notification Visit Trigger Warning]', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Visite planifiée avec succès et notifications préparées dans la file.',
      data: createdVisit
    });
  } catch (error) {
    console.error('[MySQL property_visits POST error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la planification de la visite.' });
  }
});

/**
 * PATCH /api/concierge/visits/:id
 * SÉCURITÉ :
 * - Un agent ne peut modifier que ses propres visites
 * - Un admin peut modifier toute visite
 */
router.patch('/visits/:id', authenticateToken, requireRoles('admin', 'agent'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;
    const { status, notes, visit_date, visit_time } = req.body;

    const [existingRows] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Visite introuvable.' });
    }
    const visit = existingRows[0];

    // Contrôle d'accès agent
    if (user.role === 'agent' && visit.agent_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit : vous ne pouvez modifier que les visites qui vous sont assignées.'
      });
    }

    const updates = [];
    const params = [];

    if (status !== undefined) {
      if (!ALLOWED_VISIT_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Statut invalide. Statuts acceptés : ${ALLOWED_VISIT_STATUSES.join(', ')}`
        });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(String(notes).trim());
    }
    if (visit_date) {
      updates.push('visit_date = ?');
      params.push(visit_date);
    }
    if (visit_time !== undefined) {
      updates.push('visit_time = ?');
      params.push(visit_time);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à modifier.' });
    }

    params.push(id);
    await pool.query(`UPDATE property_visits SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updatedRows] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [id]);
    res.json({ success: true, message: 'Visite mise à jour.', data: updatedRows[0] });
  } catch (error) {
    console.error('[MySQL property_visits PATCH error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour de la visite.' });
  }
});

/**
 * DELETE /api/concierge/visits/:id
 * SÉCURITÉ :
 * - Admin ou Agent assigné
 */
router.delete('/visits/:id', authenticateToken, requireRoles('admin', 'agent'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const [rows] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Visite introuvable.' });
    }

    if (user.role === 'agent' && rows[0].agent_id !== user.id) {
      return res.status(403).json({ success: false, error: 'Accès interdit.' });
    }

    await pool.query('DELETE FROM property_visits WHERE id = ?', [id]);
    res.json({ success: true, message: 'Visite supprimée.' });
  } catch (error) {
    console.error('[MySQL property_visits DELETE error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la suppression de la visite.' });
  }
});

module.exports = router;
