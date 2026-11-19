const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');

async function ensureAgencyTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agency_collaborators (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      agency_id VARCHAR(64) NOT NULL,
      user_id VARCHAR(64) DEFAULT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      whatsapp VARCHAR(50) DEFAULT NULL,
      agency_role ENUM('agency_owner', 'agency_manager', 'agency_agent', 'agency_assistant') NOT NULL DEFAULT 'agency_agent',
      status ENUM('active', 'invited', 'suspended') NOT NULL DEFAULT 'active',
      commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
      joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_agency_collab_agency (agency_id),
      INDEX idx_agency_collab_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS agency_transactions (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      agency_id VARCHAR(64) NOT NULL,
      property_id VARCHAR(64) DEFAULT NULL,
      property_title VARCHAR(255) NOT NULL,
      collaborator_id VARCHAR(64) DEFAULT NULL,
      collaborator_name VARCHAR(255) DEFAULT NULL,
      transaction_type ENUM('sale', 'rental', 'management_fee') NOT NULL DEFAULT 'sale',
      client_name VARCHAR(255) DEFAULT NULL,
      deal_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
      currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
      agency_commission DECIMAL(15, 2) NOT NULL DEFAULT 0,
      agent_share DECIMAL(15, 2) NOT NULL DEFAULT 0,
      status ENUM('pending', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
      transaction_date DATE DEFAULT NULL,
      notes TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_agency_tx_agency (agency_id),
      INDEX idx_agency_tx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

function resolveAgencyId(user, requestedAgencyId) {
  if (user.role === 'admin' && requestedAgencyId) {
    return requestedAgencyId;
  }
  return user.agency_id || user.id;
}

function mapCollaborator(row) {
  return {
    id: row.id,
    agencyId: row.agency_id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    agencyRole: row.agency_role,
    status: row.status,
    commissionRate: Number(row.commission_rate || 0),
    joinedAt: row.joined_at,
    updatedAt: row.updated_at
  };
}

function mapTransaction(row) {
  return {
    id: row.id,
    agencyId: row.agency_id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    collaboratorId: row.collaborator_id,
    collaboratorName: row.collaborator_name,
    transactionType: row.transaction_type,
    clientName: row.client_name,
    dealAmount: Number(row.deal_amount || 0),
    currency: row.currency || 'USD',
    commissionRate: Number(row.commission_rate || 0),
    agencyCommission: Number(row.agency_commission || 0),
    agentShare: Number(row.agent_share || 0),
    status: row.status,
    transactionDate: row.transaction_date,
    notes: row.notes,
    createdAt: row.created_at
  };
}

// GET /api/agency/collaborators
router.get('/collaborators', authenticateToken, requireRoles('agency', 'agent', 'admin'), async (req, res, next) => {
  try {
    await ensureAgencyTables();
    const agencyId = resolveAgencyId(req.user, req.query.agencyId);
    const [rows] = await pool.query(
      'SELECT * FROM agency_collaborators WHERE agency_id = ? ORDER BY joined_at DESC',
      [agencyId]
    );
    res.json({ success: true, collaborators: rows.map(mapCollaborator) });
  } catch (error) {
    next(error);
  }
});

// POST /api/agency/collaborators/invite
router.post('/collaborators/invite', authenticateToken, requireRoles('agency', 'admin'), async (req, res, next) => {
  try {
    await ensureAgencyTables();
    const { name, email, phone, whatsapp, agencyRole, role, commissionRate = 5, agencyId: bodyAgencyId } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Nom et adresse e-mail du collaborateur obligatoires.' });
    }

    const agencyId = resolveAgencyId(req.user, bodyAgencyId);
    const cleanEmail = String(email).trim().toLowerCase();
    const validRoles = ['agency_owner', 'agency_manager', 'agency_agent', 'agency_assistant'];
    const requestedRole = agencyRole || role || 'agency_agent';
    const targetRole = validRoles.includes(requestedRole) ? requestedRole : 'agency_agent';

    const [existing] = await pool.query(
      'SELECT id FROM agency_collaborators WHERE agency_id = ? AND email = ? LIMIT 1',
      [agencyId, cleanEmail]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Ce collaborateur fait déjà partie de votre agence.' });
    }

    const [matchedUsers] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    const matchedUserId = matchedUsers[0]?.id || null;

    const id = `collab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await pool.query(
      `INSERT INTO agency_collaborators
        (id, agency_id, user_id, name, email, phone, whatsapp, agency_role, status, commission_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
      [
        id,
        agencyId,
        matchedUserId,
        String(name).trim(),
        cleanEmail,
        phone || null,
        whatsapp || phone || null,
        targetRole,
        Number(commissionRate) || 5
      ]
    );

    const [created] = await pool.query('SELECT * FROM agency_collaborators WHERE id = ? LIMIT 1', [id]);
    res.status(201).json({
      success: true,
      message: 'Collaborateur ajouté à l\'agence avec succès.',
      collaborator: mapCollaborator(created[0])
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/agency/collaborators/:id ET /api/agency/collaborators/:id/role
router.patch(['/collaborators/:id', '/collaborators/:id/role'], authenticateToken, requireRoles('agency', 'admin'), async (req, res, next) => {
  try {
    await ensureAgencyTables();
    const { id } = req.params;
    const { agencyRole, role, status, commissionRate } = req.body;
    const effectiveRole = agencyRole || role;
    const agencyId = resolveAgencyId(req.user, req.body.agencyId);

    const [rows] = await pool.query('SELECT * FROM agency_collaborators WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Collaborateur introuvable.' });
    }
    if (req.user.role !== 'admin' && rows[0].agency_id !== agencyId) {
      return res.status(403).json({ success: false, message: 'Non autorisé pour cette agence.' });
    }

    const updates = [];
    const params = [];
    if (effectiveRole) {
      updates.push('agency_role = ?');
      params.push(effectiveRole);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (commissionRate !== undefined) {
      updates.push('commission_rate = ?');
      params.push(Number(commissionRate));
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE agency_collaborators SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const [updated] = await pool.query('SELECT * FROM agency_collaborators WHERE id = ? LIMIT 1', [id]);
    res.json({
      success: true,
      message: 'Collaborateur mis à jour.',
      collaborator: mapCollaborator(updated[0])
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/agency/collaborators/:id
router.delete('/collaborators/:id', authenticateToken, requireRoles('agency', 'admin'), async (req, res, next) => {
  try {
    await ensureAgencyTables();
    const { id } = req.params;
    const agencyId = resolveAgencyId(req.user, req.query.agencyId);

    const [rows] = await pool.query('SELECT * FROM agency_collaborators WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Collaborateur introuvable.' });
    }
    if (req.user.role !== 'admin' && rows[0].agency_id !== agencyId) {
      return res.status(403).json({ success: false, message: 'Non autorisé pour cette agence.' });
    }

    await pool.query('DELETE FROM agency_collaborators WHERE id = ?', [id]);
    res.json({ success: true, message: 'Collaborateur retiré de l\'agence.' });
  } catch (error) {
    next(error);
  }
});

// GET /api/agency/transactions
router.get('/transactions', authenticateToken, requireRoles('agency', 'agent', 'admin'), async (req, res, next) => {
  try {
    await ensureAgencyTables();
    const agencyId = resolveAgencyId(req.user, req.query.agencyId);
    const [rows] = await pool.query(
      'SELECT * FROM agency_transactions WHERE agency_id = ? ORDER BY created_at DESC',
      [agencyId]
    );
    res.json({ success: true, transactions: rows.map(mapTransaction) });
  } catch (error) {
    next(error);
  }
});

// POST /api/agency/transactions
router.post('/transactions', authenticateToken, requireRoles('agency', 'admin'), async (req, res, next) => {
  try {
    await ensureAgencyTables();
    const {
      propertyId = null,
      propertyTitle,
      collaboratorId = null,
      collaboratorName = null,
      agentId = null,
      agentName = null,
      transactionType,
      type,
      clientName = null,
      dealAmount,
      amount,
      currency = 'USD',
      commissionRate = 5,
      agencyCommission,
      commissionAmount,
      agentShare = 0,
      status = 'completed',
      transactionDate = null,
      closedAt = null,
      notes = null,
      agencyId: bodyAgencyId
    } = req.body;

    if (!propertyTitle) {
      return res.status(400).json({ success: false, message: 'Le libellé du bien ou de la transaction est obligatoire.' });
    }

    const agencyId = resolveAgencyId(req.user, bodyAgencyId);
    const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const rawType = transactionType || type || 'sale';
    const normalizedType = rawType === 'rent' ? 'rental' : (['sale', 'rental', 'management_fee'].includes(rawType) ? rawType : 'sale');
    const amountNum = Number(dealAmount !== undefined ? dealAmount : (amount || 0)) || 0;
    const rateNum = Number(commissionRate) || 5;
    const computedCommission = agencyCommission !== undefined
      ? Number(agencyCommission)
      : (commissionAmount !== undefined ? Number(commissionAmount) : (amountNum * rateNum) / 100);
    const effectiveCollabId = collaboratorId || agentId || null;
    const effectiveCollabName = collaboratorName || agentName || null;
    const normalizedStatus = status === 'closed' ? 'completed' : (['pending', 'completed', 'cancelled'].includes(status) ? status : 'completed');
    const effectiveDate = transactionDate || (closedAt ? String(closedAt).split('T')[0] : new Date().toISOString().split('T')[0]);

    await pool.query(
      `INSERT INTO agency_transactions
        (id, agency_id, property_id, property_title, collaborator_id, collaborator_name, transaction_type,
         client_name, deal_amount, currency, commission_rate, agency_commission, agent_share, status, transaction_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        agencyId,
        propertyId,
        String(propertyTitle).trim(),
        effectiveCollabId,
        effectiveCollabName,
        normalizedType,
        clientName,
        amountNum,
        ['USD', 'CDF'].includes(currency) ? currency : 'USD',
        rateNum,
        computedCommission,
        Number(agentShare) || 0,
        normalizedStatus,
        effectiveDate,
        notes
      ]
    );

    const [created] = await pool.query('SELECT * FROM agency_transactions WHERE id = ? LIMIT 1', [id]);
    res.status(201).json({
      success: true,
      message: 'Transaction enregistrée dans le registre de l\'agence.',
      transaction: mapTransaction(created[0])
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
