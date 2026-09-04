const pool = require('../config/database');

/**
 * Enregistrer un événement d'interaction (Vue, clic WhatsApp, appel téléphonique, partage)
 * POST /api/analytics/track
 */
async function trackEvent(req, res, next) {
  try {
    const { propertyId, eventType } = req.body;

    if (!propertyId || !['view', 'whatsapp', 'call', 'tour', 'share'].includes(eventType)) {
      return res.status(400).json({ success: false, message: 'Paramètres d’événement invalides.' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Colonne à incrémenter
    const columnMap = {
      view: 'views_count',
      whatsapp: 'whatsapp_clicks',
      call: 'call_clicks',
      tour: 'tour_requests',
      share: 'shares_count'
    };
    const col = columnMap[eventType];

    // Insertion ou mise à jour par incrémentation sur la date du jour
    await pool.execute(
      `INSERT INTO property_analytics (property_id, date, ${col})
       VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE ${col} = ${col} + 1`,
      [propertyId, today]
    );

    // Si c'est une vue, on incrémente aussi le total global dans la table properties
    if (eventType === 'view') {
      await pool.execute('UPDATE properties SET views_count = views_count + 1 WHERE id = ?', [propertyId]);
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer les performances complètes d'un bien (pour le propriétaire ou l'agence)
 * GET /api/analytics/property/:id
 */
async function getPropertyAnalytics(req, res, next) {
  try {
    const { id } = req.params;

    // Récupérer l'historique des 30 derniers jours
    const [rows] = await pool.execute(
      `SELECT date, views_count, whatsapp_clicks, call_clicks, tour_requests, shares_count
       FROM property_analytics
       WHERE property_id = ?
       ORDER BY date DESC LIMIT 30`,
      [id]
    );

    // Calculer les totaux
    const totals = rows.reduce(
      (acc, r) => ({
        views: acc.views + r.views_count,
        whatsapp: acc.whatsapp + r.whatsapp_clicks,
        calls: acc.calls + r.call_clicks,
        tours: acc.tours + r.tour_requests,
        shares: acc.shares + r.shares_count
      }),
      { views: 0, whatsapp: 0, calls: 0, tours: 0, shares: 0 }
    );

    res.json({
      success: true,
      propertyId: id,
      totals,
      dailyStats: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer les statistiques globales de performance d'un agent / agence
 * GET /api/analytics/my-performance
 */
async function getMyPerformance(req, res, next) {
  try {
    const userId = req.user.id;

    // Trouver tous les biens de cet agent / agence
    const [stats] = await pool.execute(
      `SELECT 
         COUNT(DISTINCT p.id) as totalListings,
         COALESCE(SUM(pa.views_count), 0) as totalViews,
         COALESCE(SUM(pa.whatsapp_clicks), 0) as totalWhatsappClicks,
         COALESCE(SUM(pa.call_clicks), 0) as totalCallClicks,
         COALESCE(SUM(pa.tour_requests), 0) as totalTourRequests
       FROM properties p
       LEFT JOIN property_analytics pa ON p.id = pa.property_id
       WHERE p.agent_id = ?`,
      [userId]
    );

    res.json({
      success: true,
      performance: stats[0]
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  trackEvent,
  getPropertyAnalytics,
  getMyPerformance
};
