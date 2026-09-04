const pool = require('../config/database');

/**
 * Récupérer un profil utilisateur public
 * GET /api/users/:id
 */
async function getUserProfile(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, whatsapp, role, avatar, agency_name, is_verified,
              kinshasa_badge_verified, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    next(error);
  }
}

/**
 * Liste de tous les utilisateurs (Réservé à l'Admin)
 * GET /api/users
 */
async function getAllUsers(req, res, next) {
  try {
    const { role, search } = req.query;

    let sql = `
      SELECT id, name, email, phone, whatsapp, role, agency_name, avatar,
             is_verified, kinshasa_badge_verified, rccm_or_nif, plan_id, subscription_status, created_at
      FROM users WHERE 1=1
    `;
    const params = [];

    if (role && role !== 'all') {
      sql += ' AND role = ?';
      params.push(role);
    }

    if (search && search.trim() !== '') {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      count: rows.length,
      users: rows
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserProfile,
  getAllUsers
};
