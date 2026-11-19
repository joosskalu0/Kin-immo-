const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');
const { NotificationService } = require('../services/notificationService');

const ALLOWED_VISIT_STATUSES = [
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'rescheduled'
];

async function ensurePropertyVisitsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS property_visits (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      request_id VARCHAR(64) NOT NULL,
      property_id VARCHAR(64) DEFAULT NULL,
      agent_id VARCHAR(64) DEFAULT NULL,
      visit_date DATE NOT NULL,
      visit_time VARCHAR(20) DEFAULT NULL,
      status ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled') NOT NULL DEFAULT 'scheduled',
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_visits_req (request_id),
      INDEX idx_visits_agent (agent_id),
      INDEX idx_visits_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function listVisits(req, res) {
  try {
    const user = req.user;
    const { request_id, agent_id, property_id, status } = req.query;

    let query = 'SELECT * FROM property_visits WHERE 1=1';
    const params = [];

    if (user.role === 'agent') {
      query += ' AND agent_id = ?';
      params.push(user.id);
    } else if (agent_id && ['admin', 'agency'].includes(user.role)) {
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

    let rows = [];
    try {
      const [result] = await pool.query(query, params);
      rows = result;
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || (err.message && err.message.includes("doesn't exist"))) {
        await ensurePropertyVisitsTable();
        const [result] = await pool.query(query, params);
        rows = result;
      } else {
        throw err;
      }
    }

    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('[MySQL property_visits GET error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des visites.' });
  }
}

async function createVisit(req, res) {
  try {
    const user = req.user;
    const {
      id: providedId,
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

    const targetAgentId = user.role === 'agent' ? user.id : (agent_id || user.id);

    let reqRows = [];
    try {
      const [result] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [request_id]);
      reqRows = result;
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || (err.message && err.message.includes("doesn't exist"))) {
        return res.status(404).json({ success: false, error: 'Demande associée introuvable.' });
      }
      throw err;
    }

    if (reqRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Demande associée introuvable.' });
    }
    const assocRequest = reqRows[0];

    let assocAgent = null;
    if (targetAgentId) {
      const [agentRows] = await pool.query('SELECT id, name, email, phone FROM users WHERE id = ?', [targetAgentId]);
      if (agentRows.length > 0) assocAgent = agentRows[0];
    }

    const id = providedId || `pv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const validStatus = ALLOWED_VISIT_STATUSES.includes(status) ? status : 'scheduled';
    const insertQuery = `
      INSERT INTO property_visits (
        id, request_id, property_id, agent_id, visit_date, visit_time, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertParams = [
      id,
      request_id,
      property_id,
      targetAgentId,
      visit_date,
      visit_time ? String(visit_time).substring(0, 20) : null,
      validStatus,
      notes ? String(notes).trim().substring(0, 1000) : null
    ];

    try {
      await pool.query(insertQuery, insertParams);
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || (err.message && err.message.includes("doesn't exist"))) {
        await ensurePropertyVisitsTable();
        await pool.query(insertQuery, insertParams);
      } else {
        throw err;
      }
    }

    await pool.query(
      "UPDATE concierge_requests SET status = 'visit_scheduled' WHERE id = ? AND status IN ('new', 'searching', 'properties_found')",
      [request_id]
    );

    const [createdRows] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [id]);
    const createdVisit = createdRows[0];

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
}

async function updateVisit(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const { status, notes, visit_date, visit_time } = req.body;

    await ensurePropertyVisitsTable();
    const [existingRows] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [id]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Visite introuvable.' });
    }
    const visit = existingRows[0];

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
      params.push(notes === null ? null : String(notes).trim());
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
}

async function deleteVisit(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    await ensurePropertyVisitsTable();
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
}

router.get('/', authenticateToken, requireRoles('admin', 'agent', 'agency'), listVisits);
router.post('/', authenticateToken, requireRoles('admin', 'agent', 'agency'), createVisit);
router.patch('/:id', authenticateToken, requireRoles('admin', 'agent', 'agency'), updateVisit);
router.put('/:id', authenticateToken, requireRoles('admin', 'agent', 'agency'), updateVisit);
router.delete('/:id', authenticateToken, requireRoles('admin', 'agent', 'agency'), deleteVisit);

module.exports = router;
module.exports.handlers = {
  listVisits,
  createVisit,
  updateVisit,
  deleteVisit,
  ensurePropertyVisitsTable,
  ALLOWED_VISIT_STATUSES
};
