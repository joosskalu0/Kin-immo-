const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

/**
 * Statistiques globales du tableau de bord d'administration Kinimmo
 * GET /api/admin/stats
 */
async function getStats(req, res, next) {
  try {
    const [uCount] = await pool.execute('SELECT COUNT(*) as totalUsers FROM users');
    const [pCount] = await pool.execute('SELECT COUNT(*) as totalProperties FROM properties');
    const [activeCount] = await pool.execute("SELECT COUNT(*) as activeProperties FROM properties WHERE status != 'sold' AND published = TRUE");
    const [soldCount] = await pool.execute("SELECT COUNT(*) as soldProperties FROM properties WHERE status = 'sold'");
    const [agentCount] = await pool.execute('SELECT COUNT(*) as totalAgents FROM agents');
    const [agencyCount] = await pool.execute('SELECT COUNT(*) as totalAgencies FROM agencies');
    const [msgCount] = await pool.execute('SELECT COUNT(*) as totalMessages FROM messages');
    const [invCount] = await pool.execute("SELECT COUNT(*) as pendingInvoices, COALESCE(SUM(amount), 0) as totalRevenue FROM invoices WHERE status = 'paid'");

    // Répartition par commune de Kinshasa
    const [communesStats] = await pool.execute(
      `SELECT commune, COUNT(*) as count
       FROM properties
       GROUP BY commune
       ORDER BY count DESC LIMIT 6`
    );

    res.json({
      success: true,
      stats: {
        totalUsers: uCount[0]?.totalUsers || 0,
        totalProperties: pCount[0]?.totalProperties || 0,
        activeProperties: activeCount[0]?.activeProperties || 0,
        soldProperties: soldCount[0]?.soldProperties || 0,
        totalAgents: agentCount[0]?.totalAgents || 0,
        totalAgencies: agencyCount[0]?.totalAgencies || 0,
        totalMessages: msgCount[0]?.totalMessages || 0,
        totalRevenueUsd: invCount[0]?.totalRevenue || 0,
        topCommunes: communesStats
      }
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 1. GESTION DES UTILISATEURS (USERS)
// ==========================================

/**
 * Récupérer tous les utilisateurs (SANS AUCUN HASH DE MOT DE PASSE)
 * GET /api/admin/users
 */
async function getUsers(req, res, next) {
  try {
    const { role, search } = req.query;
    let sql = `
      SELECT id, name, email, phone, whatsapp, role, agency_id, agency_name,
             avatar, is_verified, kinshasa_badge_verified, rccm_or_nif,
             plan_id, subscription_status, created_at, updated_at
      FROM users
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }
    if (search) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, users: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Créer un utilisateur depuis le panneau admin
 * POST /api/admin/users
 */
async function createUser(req, res, next) {
  try {
    const { name, email, password, role, phone, whatsapp, agencyName, isVerified } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nom, e-mail et mot de passe requis.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Un compte avec cet e-mail existe déjà.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const effectiveRole = ['user', 'agent', 'agency', 'admin'].includes(role) ? role : 'user';

    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, phone, whatsapp, role, agency_name, is_verified, plan_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        cleanEmail,
        passwordHash,
        phone || null,
        whatsapp || phone || null,
        effectiveRole,
        agencyName || null,
        Boolean(isVerified),
        effectiveRole === 'agency' ? 'agency' : effectiveRole === 'agent' ? 'pro' : 'starter'
      ]
    );

    if (effectiveRole === 'agent') {
      const agentId = `agent_${Date.now()}`;
      await pool.execute(
        `INSERT INTO agents (id, user_id, name, email, phone, whatsapp, title, is_verified)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [agentId, userId, name.trim(), cleanEmail, phone || '', whatsapp || phone || null, 'Courtier Kinshasa', Boolean(isVerified)]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès.',
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role: effectiveRole,
        isVerified: Boolean(isVerified)
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mettre à jour un profil utilisateur (Admin)
 * PUT /api/admin/users/:id
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, phone, whatsapp, role, planId, subscriptionStatus, isVerified, kinshasaBadgeVerified } = req.body;

    await pool.execute(
      `UPDATE users
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           whatsapp = COALESCE(?, whatsapp),
           role = COALESCE(?, role),
           plan_id = COALESCE(?, plan_id),
           subscription_status = COALESCE(?, subscription_status),
           is_verified = COALESCE(?, is_verified),
           kinshasa_badge_verified = COALESCE(?, kinshasa_badge_verified)
       WHERE id = ?`,
      [
        name || null,
        phone || null,
        whatsapp || null,
        role || null,
        planId || null,
        subscriptionStatus || null,
        isVerified !== undefined ? Boolean(isVerified) : null,
        kinshasaBadgeVerified !== undefined ? Boolean(kinshasaBadgeVerified) : null,
        id
      ]
    );

    res.json({ success: true, message: 'Utilisateur mis à jour avec succès.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Réinitialiser le mot de passe d'un utilisateur
 * PUT /api/admin/users/:id/reset-password
 */
async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Le mot de passe doit comporter au moins 6 caractères.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Modifier le rôle ou le statut d'un utilisateur
 * PUT /api/admin/users/:id/role
 */
async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'agent', 'agency', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Rôle invalide.' });
    }

    await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    res.json({ success: true, message: `Rôle de l'utilisateur modifié en "${role}".` });
  } catch (error) {
    next(error);
  }
}

/**
 * Valider ou révoquer la vérification d'un agent ou agence
 * PUT /api/admin/users/:id/verify
 */
async function toggleVerification(req, res, next) {
  try {
    const { id } = req.params;
    const { isVerified, kinshasaBadgeVerified } = req.body;

    await pool.execute(
      `UPDATE users
       SET is_verified = COALESCE(?, is_verified),
           kinshasa_badge_verified = COALESCE(?, kinshasa_badge_verified)
       WHERE id = ?`,
      [
        isVerified !== undefined ? Boolean(isVerified) : null,
        kinshasaBadgeVerified !== undefined ? Boolean(kinshasaBadgeVerified) : null,
        id
      ]
    );

    // Mettre à jour également dans la table agents si c'est un agent
    await pool.execute(
      'UPDATE agents SET is_verified = COALESCE(?, is_verified) WHERE user_id = ?',
      [isVerified !== undefined ? Boolean(isVerified) : null, id]
    );

    res.json({ success: true, message: 'Statut de vérification mis à jour.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Supprimer un utilisateur
 * DELETE /api/admin/users/:id
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez pas supprimer votre propre compte administrateur.' });
    }

    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ success: true, message: 'Utilisateur supprimé de la base MySQL.' });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 2. GESTION DES BIENS IMMOBILIERS (PROPERTIES)
// ==========================================

/**
 * Liste complète des biens immobiliers pour l'administration
 * GET /api/admin/properties
 */
async function getProperties(req, res, next) {
  try {
    const { status, commune, search, isFeatured } = req.query;
    let sql = `
      SELECT p.*, u.name as agent_name, u.email as agent_email, u.phone as agent_phone
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    }
    if (commune) {
      sql += ' AND p.commune = ?';
      params.push(commune);
    }
    if (isFeatured !== undefined) {
      sql += ' AND p.is_featured = ?';
      params.push(isFeatured === 'true' ? 1 : 0);
    }
    if (search) {
      sql += ' AND (p.title LIKE ? OR p.address LIKE ? OR p.commune LIKE ? OR p.quartier LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY p.created_at DESC';

    const [rows] = await pool.execute(sql, params);
    res.json({ success: true, properties: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Mettre à jour le statut, la publication ou la mise en avant d'une annonce
 * PUT /api/admin/properties/:id/status
 */
async function updatePropertyStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, published, isFeatured } = req.body;

    await pool.execute(
      `UPDATE properties
       SET status = COALESCE(?, status),
           published = COALESCE(?, published),
           is_featured = COALESCE(?, is_featured)
       WHERE id = ?`,
      [
        status || null,
        published !== undefined ? Boolean(published) : null,
        isFeatured !== undefined ? Boolean(isFeatured) : null,
        id
      ]
    );

    res.json({ success: true, message: 'Statut du bien immobilier mis à jour.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Supprimer une annonce immobilière
 * DELETE /api/admin/properties/:id
 */
async function deleteProperty(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM properties WHERE id = ?', [id]);
    res.json({ success: true, message: 'Annonce supprimée avec succès.' });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 3. GESTION DES AGENTS IMMOBILIERS (AGENTS)
// ==========================================

/**
 * Récupérer tous les agents avec le nombre de biens qu'ils gèrent
 * GET /api/admin/agents
 */
async function getAgents(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT a.*, ag.name as agency_name,
              COUNT(p.id) as total_listings,
              u.subscription_status, u.plan_id
       FROM agents a
       LEFT JOIN agencies ag ON a.agency_id = ag.id
       LEFT JOIN users u ON a.user_id = u.id
       LEFT JOIN properties p ON a.id = p.agent_id OR a.user_id = p.agent_id
       GROUP BY a.id
       ORDER BY a.created_at DESC`
    );
    res.json({ success: true, agents: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Mettre à jour un agent (Vérification, Titre, Contact)
 * PUT /api/admin/agents/:id
 */
async function updateAgent(req, res, next) {
  try {
    const { id } = req.params;
    const { name, title, phone, whatsapp, isVerified, agencyId } = req.body;

    await pool.execute(
      `UPDATE agents
       SET name = COALESCE(?, name),
           title = COALESCE(?, title),
           phone = COALESCE(?, phone),
           whatsapp = COALESCE(?, whatsapp),
           is_verified = COALESCE(?, is_verified),
           agency_id = COALESCE(?, agency_id)
       WHERE id = ?`,
      [
        name || null,
        title || null,
        phone || null,
        whatsapp || null,
        isVerified !== undefined ? Boolean(isVerified) : null,
        agencyId || null,
        id
      ]
    );

    res.json({ success: true, message: 'Profil agent mis à jour.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Supprimer un profil agent
 * DELETE /api/admin/agents/:id
 */
async function deleteAgent(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM agents WHERE id = ?', [id]);
    res.json({ success: true, message: 'Agent supprimé avec succès.' });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 4. GESTION DES AGENCES IMMOBILIÈRES (AGENCIES)
// ==========================================

/**
 * Récupérer toutes les agences avec leur nombre d'agents et biens
 * GET /api/admin/agencies
 */
async function getAgencies(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT ag.*,
              COUNT(DISTINCT a.id) as agents_count,
              COUNT(DISTINCT p.id) as listings_count
       FROM agencies ag
       LEFT JOIN agents a ON ag.id = a.agency_id
       LEFT JOIN properties p ON ag.id = p.agency_id
       GROUP BY ag.id
       ORDER BY ag.created_at DESC`
    );
    res.json({ success: true, agencies: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Mettre à jour une agence immobilière (Validation RCCM/NIF, Masquage, Statut)
 * PUT /api/admin/agencies/:id
 */
async function updateAgency(req, res, next) {
  try {
    const { id } = req.params;
    const { isVerified, isHidden, subscriptionStatus, rccm, nif, phone, whatsapp, email } = req.body;

    await pool.execute(
      `UPDATE agencies
       SET is_verified = COALESCE(?, is_verified),
           is_hidden = COALESCE(?, is_hidden),
           subscription_status = COALESCE(?, subscription_status),
           rccm = COALESCE(?, rccm),
           nif = COALESCE(?, nif),
           phone = COALESCE(?, phone),
           whatsapp = COALESCE(?, whatsapp),
           email = COALESCE(?, email)
       WHERE id = ?`,
      [
        isVerified !== undefined ? Boolean(isVerified) : null,
        isHidden !== undefined ? Boolean(isHidden) : null,
        subscriptionStatus || null,
        rccm || null,
        nif || null,
        phone || null,
        whatsapp || null,
        email || null,
        id
      ]
    );

    res.json({ success: true, message: 'Agence mise à jour avec succès.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Supprimer une agence
 * DELETE /api/admin/agencies/:id
 */
async function deleteAgency(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM agencies WHERE id = ?', [id]);
    res.json({ success: true, message: 'Agence supprimée avec succès.' });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// 5. GESTION DES FACTURES (INVOICES)
// ==========================================

/**
 * Liste de toutes les factures Kinimmo pour l'administrateur
 * GET /api/admin/invoices
 */
async function getInvoices(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT i.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
              p.name as plan_name, pm.provider as payment_provider, pm.account_name as payment_account_name
       FROM invoices i
       LEFT JOIN users u ON i.user_id = u.id
       LEFT JOIN pricing_plans p ON i.plan_id = p.id
       LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
       ORDER BY i.created_at DESC`
    );
    res.json({ success: true, invoices: rows });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStats,
  // Users
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
  updateUserRole,
  toggleVerification,
  deleteUser,
  // Properties
  getProperties,
  updatePropertyStatus,
  deleteProperty,
  // Agents
  getAgents,
  updateAgent,
  deleteAgent,
  // Agencies
  getAgencies,
  updateAgency,
  deleteAgency,
  // Invoices
  getInvoices
};
