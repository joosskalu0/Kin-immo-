const pool = require('../config/database');

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
        totalUsers: uCount[0].totalUsers,
        totalProperties: pCount[0].totalProperties,
        activeProperties: activeCount[0].activeProperties,
        soldProperties: soldCount[0].soldProperties,
        totalAgents: agentCount[0].totalAgents,
        totalAgencies: agencyCount[0].totalAgencies,
        totalMessages: msgCount[0].totalMessages,
        topCommunes: communesStats
      }
    });
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
 * Supprimer un utilisateur (et ses données associées via les clés étrangères)
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

module.exports = {
  getStats,
  updateUserRole,
  toggleVerification,
  deleteUser
};
