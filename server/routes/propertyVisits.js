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

let visitsSchemaReadyPromise = null;

function normalizeVisitDate(rawDate) {
  if (!rawDate) return '';
  if (rawDate instanceof Date && !Number.isNaN(rawDate.getTime())) {
    return rawDate.toISOString().split('T')[0];
  }
  const str = String(rawDate).trim();
  if (str.includes('T')) return str.split('T')[0];
  return str.slice(0, 10);
}

function serializeVisitRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    ...row,
    visit_date: normalizeVisitDate(row.visit_date),
    property_title: row.property_title || null,
    agent_name: row.agent_name || null,
    client_name: row.client_name || null
  };
}

async function ensurePropertyVisitsTable() {
  if (visitsSchemaReadyPromise) {
    return visitsSchemaReadyPromise;
  }

  visitsSchemaReadyPromise = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS property_visits (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        request_id VARCHAR(64) NOT NULL,
        property_id VARCHAR(64) DEFAULT NULL,
        property_title VARCHAR(255) DEFAULT NULL,
        agent_id VARCHAR(64) DEFAULT NULL,
        agent_name VARCHAR(255) DEFAULT NULL,
        client_name VARCHAR(255) DEFAULT NULL,
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

    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM property_visits');
      const colNames = new Set(cols.map((c) => String(c.Field).toLowerCase()));
      if (!colNames.has('property_title')) {
        await pool.query('ALTER TABLE property_visits ADD COLUMN property_title VARCHAR(255) DEFAULT NULL AFTER property_id');
      }
      if (!colNames.has('agent_name')) {
        await pool.query('ALTER TABLE property_visits ADD COLUMN agent_name VARCHAR(255) DEFAULT NULL AFTER agent_id');
      }
      if (!colNames.has('client_name')) {
        await pool.query('ALTER TABLE property_visits ADD COLUMN client_name VARCHAR(255) DEFAULT NULL AFTER agent_name');
      }
    } catch (alterErr) {
      console.warn('[PropertyVisits Schema Upgrade Warning]', alterErr.message);
    }
  })().catch((err) => {
    visitsSchemaReadyPromise = null;
    throw err;
  });

  return visitsSchemaReadyPromise;
}

async function listVisits(req, res) {
  try {
    await ensurePropertyVisitsTable();
    const user = req.user;
    const { request_id, agent_id, property_id, status } = req.query;

    let query = `
      SELECT v.*,
             COALESCE(v.client_name, c.full_name) AS client_name,
             COALESCE(v.agent_name, u.name) AS agent_name
      FROM property_visits v
      LEFT JOIN concierge_requests c ON v.request_id = c.id
      LEFT JOIN users u ON v.agent_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user.role === 'agent') {
      query += ' AND v.agent_id = ?';
      params.push(user.id);
    } else if (agent_id && ['admin', 'agency'].includes(user.role)) {
      query += ' AND v.agent_id = ?';
      params.push(agent_id);
    }

    if (request_id) {
      query += ' AND v.request_id = ?';
      params.push(request_id);
    }
    if (property_id) {
      query += ' AND v.property_id = ?';
      params.push(property_id);
    }
    if (status && ALLOWED_VISIT_STATUSES.includes(status)) {
      query += ' AND v.status = ?';
      params.push(status);
    }

    query += ' ORDER BY v.visit_date ASC, v.visit_time ASC';

    let rows = [];
    try {
      const [result] = await pool.query(query, params);
      rows = result;
    } catch (joinErr) {
      // Fallback si concierge_requests n'existe pas encore
      let fallbackQuery = 'SELECT * FROM property_visits WHERE 1=1';
      const fallbackParams = [];
      if (user.role === 'agent') {
        fallbackQuery += ' AND agent_id = ?';
        fallbackParams.push(user.id);
      }
      if (request_id) {
        fallbackQuery += ' AND request_id = ?';
        fallbackParams.push(request_id);
      }
      fallbackQuery += ' ORDER BY visit_date ASC, visit_time ASC';
      const [fallbackResult] = await pool.query(fallbackQuery, fallbackParams);
      rows = fallbackResult;
    }

    const serialized = rows.map(serializeVisitRow);
    res.json({ success: true, count: serialized.length, data: serialized });
  } catch (error) {
    console.error('[MySQL property_visits GET error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la récupération des visites.' });
  }
}

async function createVisit(req, res) {
  try {
    await ensurePropertyVisitsTable();
    const user = req.user;
    const {
      id: providedId,
      request_id,
      property_id = null,
      property_title = null,
      agent_id = null,
      agent_name = null,
      client_name = null,
      visit_date,
      visit_time = null,
      status = 'scheduled',
      notes = null
    } = req.body;

    const cleanVisitDate = normalizeVisitDate(visit_date);
    if (!request_id || !cleanVisitDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanVisitDate)) {
      return res.status(400).json({
        success: false,
        error: 'Champs obligatoires manquants ou date invalide (request_id, visit_date AAAA-MM-JJ).'
      });
    }

    const requestedAgentId = user.role === 'agent' ? user.id : (agent_id || user.id);

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

    // Résolution sûre de l'agent et du bien (pour éviter tout rejet FK)
    let resolvedAgentId = null;
    let resolvedAgentName = agent_name || null;
    let assocAgent = null;

    if (requestedAgentId) {
      try {
        const [userRows] = await pool.query('SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1', [requestedAgentId]);
        if (userRows.length > 0) {
          resolvedAgentId = userRows[0].id;
          resolvedAgentName = resolvedAgentName || userRows[0].name;
          assocAgent = userRows[0];
        } else {
          const [agentRows] = await pool.query('SELECT id, user_id, name, email, phone FROM agents WHERE id = ? LIMIT 1', [requestedAgentId]);
          if (agentRows.length > 0) {
            resolvedAgentName = resolvedAgentName || agentRows[0].name;
            if (agentRows[0].user_id) {
              const [uRows] = await pool.query('SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1', [agentRows[0].user_id]);
              if (uRows.length > 0) {
                resolvedAgentId = uRows[0].id;
                assocAgent = uRows[0];
              }
            }
          }
        }
      } catch {}
    }

    let resolvedPropertyId = property_id || null;
    if (resolvedPropertyId) {
      try {
        const [pRows] = await pool.query('SELECT id FROM properties WHERE id = ? LIMIT 1', [resolvedPropertyId]);
        if (pRows.length === 0) {
          resolvedPropertyId = null;
        }
      } catch {
        resolvedPropertyId = null;
      }
    }

    const id = providedId || `pv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const validStatus = ALLOWED_VISIT_STATUSES.includes(status) ? status : 'scheduled';
    const cleanClientName = client_name || assocRequest.full_name || null;
    const cleanPropertyTitle = property_title ? String(property_title).trim().substring(0, 255) : null;

    const insertQuery = `
      INSERT INTO property_visits (
        id, request_id, property_id, property_title, agent_id, agent_name, client_name, visit_date, visit_time, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertParams = [
      id,
      request_id,
      resolvedPropertyId,
      cleanPropertyTitle,
      resolvedAgentId,
      resolvedAgentName ? String(resolvedAgentName).trim().substring(0, 255) : null,
      cleanClientName ? String(cleanClientName).trim().substring(0, 255) : null,
      cleanVisitDate,
      visit_time ? String(visit_time).substring(0, 20) : null,
      validStatus,
      notes ? String(notes).trim().substring(0, 1000) : null
    ];

    await pool.query(insertQuery, insertParams);

    await pool.query(
      "UPDATE concierge_requests SET status = 'visit_scheduled' WHERE id = ? AND status IN ('new', 'searching', 'properties_found')",
      [request_id]
    );

    const [createdRows] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [id]);
    const createdVisit = serializeVisitRow(createdRows[0]);

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
    await ensurePropertyVisitsTable();
    const { id } = req.params;
    const user = req.user;
    const { status, notes, visit_date, visit_time } = req.body;

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
      const cleanDate = normalizeVisitDate(visit_date);
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
        updates.push('visit_date = ?');
        params.push(cleanDate);
      }
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
    res.json({ success: true, message: 'Visite mise à jour.', data: serializeVisitRow(updatedRows[0]) });
  } catch (error) {
    console.error('[MySQL property_visits PATCH error]', error);
    res.status(500).json({ success: false, error: 'Erreur lors de la mise à jour de la visite.' });
  }
}

async function deleteVisit(req, res) {
  try {
    await ensurePropertyVisitsTable();
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
