const express = require('express');
const router = express.Router();
const pool = require('../config/database');

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

// ==========================================
// 1. DEMANDES DE CONCIERGERIE (concierge_requests)
// ==========================================

// GET /api/concierge-requests - Liste des demandes avec filtres
router.get('/requests', async (req, res) => {
  try {
    const { status, commune, assigned_agent_id, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM concierge_requests WHERE 1=1';
    const params = [];

    if (status && ALLOWED_STATUSES.includes(status)) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (commune) {
      query += ' AND commune = ?';
      params.push(commune);
    }
    if (assigned_agent_id) {
      query += ' AND assigned_agent_id = ?';
      params.push(assigned_agent_id);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('[MySQL concierge_requests GET error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/concierge-requests/:id - Détail d'une demande avec ses visites planifiées
router.get('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Demande introuvable.' });
    }

    const request = rows[0];
    const [visits] = await pool.query(
      'SELECT * FROM property_visits WHERE request_id = ? ORDER BY visit_date ASC, visit_time ASC',
      [id]
    );

    res.json({ success: true, data: { ...request, visits } });
  } catch (error) {
    console.error('[MySQL concierge_requests GET :id error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/concierge-requests - Création d'une nouvelle demande
router.post('/requests', async (req, res) => {
  try {
    const {
      id = `cr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id = null,
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
      email,
      status = 'new',
      assigned_agent_id = null
    } = req.body;

    if (!project_type || !property_type || !commune || !full_name || !phone || !email) {
      return res.status(400).json({
        success: false,
        error: 'Champs obligatoires manquants (project_type, property_type, commune, full_name, phone, email).'
      });
    }

    const validStatus = ALLOWED_STATUSES.includes(status) ? status : 'new';
    const servicesJson = typeof services === 'string' ? services : JSON.stringify(services);

    const query = `
      INSERT INTO concierge_requests (
        id, user_id, project_type, property_type, commune, quartier,
        budget_min, budget_max, currency, bedrooms, bathrooms,
        parking, furnished, services, description, full_name,
        phone, whatsapp, email, status, assigned_agent_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(query, [
      id, user_id, project_type, property_type, commune, quartier,
      budget_min, budget_max, currency, bedrooms, bathrooms,
      parking ? 1 : 0, furnished ? 1 : 0, servicesJson, description, full_name,
      phone, whatsapp, email, validStatus, assigned_agent_id
    ]);

    const [created] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [id]);
    res.status(201).json({ success: true, message: 'Demande enregistrée avec succès.', data: created[0] });
  } catch (error) {
    console.error('[MySQL concierge_requests POST error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/concierge-requests/:id - Mise à jour (statut, agent assigné, etc.)
router.patch('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assigned_agent_id, notesAdmin } = req.body;

    const updates = [];
    const params = [];

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Statut invalide. Statuts acceptés : ${ALLOWED_STATUSES.join(', ')}`
        });
      }
      updates.push('status = ?');
      params.push(status);
    }

    if (assigned_agent_id !== undefined) {
      updates.push('assigned_agent_id = ?');
      params.push(assigned_agent_id);
    }

    if (notesAdmin !== undefined) {
      updates.push('description = ?');
      params.push(notesAdmin);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun champ à mettre à jour.' });
    }

    params.push(id);
    await pool.query(`UPDATE concierge_requests SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updated] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [id]);
    res.json({ success: true, message: 'Mise à jour réussie.', data: updated[0] });
  } catch (error) {
    console.error('[MySQL concierge_requests PATCH error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/concierge-requests/:id
router.delete('/requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM concierge_requests WHERE id = ?', [id]);
    res.json({ success: true, message: 'Demande supprimée avec succès.' });
  } catch (error) {
    console.error('[MySQL concierge_requests DELETE error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// 2. VISITES IMMOBILIÈRES (property_visits)
// ==========================================

// GET /api/concierge/visits - Liste des visites
router.get('/visits', async (req, res) => {
  try {
    const { request_id, agent_id, property_id, status } = req.query;
    let query = 'SELECT * FROM property_visits WHERE 1=1';
    const params = [];

    if (request_id) {
      query += ' AND request_id = ?';
      params.push(request_id);
    }
    if (agent_id) {
      query += ' AND agent_id = ?';
      params.push(agent_id);
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/concierge/visits - Planifier une nouvelle visite
router.post('/visits', async (req, res) => {
  try {
    const {
      id = `pv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
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

    const validStatus = ALLOWED_VISIT_STATUSES.includes(status) ? status : 'scheduled';

    const query = `
      INSERT INTO property_visits (
        id, request_id, property_id, agent_id, visit_date, visit_time, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.query(query, [
      id, request_id, property_id, agent_id, visit_date, visit_time, validStatus, notes
    ]);

    // Mettre à jour automatiquement le statut de la demande en 'visit_scheduled'
    await pool.query(
      "UPDATE concierge_requests SET status = 'visit_scheduled' WHERE id = ? AND status IN ('new', 'searching', 'properties_found')",
      [request_id]
    );

    const [created] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [id]);
    res.status(201).json({ success: true, message: 'Visite planifiée avec succès.', data: created[0] });
  } catch (error) {
    console.error('[MySQL property_visits POST error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/concierge/visits/:id
router.patch('/visits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, visit_date, visit_time } = req.body;

    const updates = [];
    const params = [];

    if (status) {
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
      params.push(notes);
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

    const [updated] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [id]);
    res.json({ success: true, message: 'Visite mise à jour.', data: updated[0] });
  } catch (error) {
    console.error('[MySQL property_visits PATCH error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/concierge/visits/:id
router.delete('/visits/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM property_visits WHERE id = ?', [id]);
    res.json({ success: true, message: 'Visite supprimée.' });
  } catch (error) {
    console.error('[MySQL property_visits DELETE error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
