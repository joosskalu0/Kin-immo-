const pool = require('../config/database');

class AdStats {
  /**
   * Tableau de bord général des performances publicitaires
   */
  static async getOverview() {
    // 1. Total impressions et clics globaux
    const [counts] = await pool.execute(`
      SELECT
        (SELECT COUNT(*) FROM ad_impressions) AS total_impressions,
        (SELECT COUNT(*) FROM ad_clicks) AS total_clicks,
        (SELECT COUNT(*) FROM ad_campaigns WHERE status = 'active' AND CURDATE() BETWEEN start_date AND end_date) AS active_campaigns,
        (SELECT COUNT(*) FROM ad_partners WHERE status = 'active') AS active_partners,
        (SELECT COALESCE(SUM(amount_usd), 0) FROM ad_payments WHERE status = 'completed') AS total_partners_revenue_usd
    `);

    const summary = counts[0] || {};
    const totalImpressions = parseInt(summary.total_impressions, 10) || 0;
    const totalClicks = parseInt(summary.total_clicks, 10) || 0;
    const globalCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

    // 2. Performances par emplacement publicitaire
    const [placementStats] = await pool.execute(`
      SELECT
        pl.id AS placement_id,
        pl.name AS placement_name,
        pl.allow_google_adsense,
        pl.adsense_slot_id,
        COUNT(DISTINCT c.id) AS campaigns_count,
        COUNT(DISTINCT i.id) AS impressions_count,
        COUNT(DISTINCT cl.id) AS clicks_count
      FROM ad_placements pl
      LEFT JOIN ad_campaigns c ON pl.id = c.placement_id
      LEFT JOIN ad_impressions i ON pl.id = i.placement_id
      LEFT JOIN ad_clicks cl ON pl.id = cl.placement_id
      GROUP BY pl.id
      ORDER BY impressions_count DESC
    `);

    // 3. Top 5 des campagnes les plus performantes
    const [topCampaigns] = await pool.execute(`
      SELECT
        c.id, c.title, c.placement_id, p.company_name AS partner_name,
        COUNT(DISTINCT i.id) AS impressions,
        COUNT(DISTINCT cl.id) AS clicks,
        CASE
          WHEN COUNT(DISTINCT i.id) > 0 THEN ROUND((COUNT(DISTINCT cl.id) / COUNT(DISTINCT i.id)) * 100, 2)
          ELSE 0.00
        END AS ctr
      FROM ad_campaigns c
      JOIN ad_partners p ON c.partner_id = p.id
      LEFT JOIN ad_impressions i ON c.id = i.campaign_id
      LEFT JOIN ad_clicks cl ON c.id = cl.campaign_id
      GROUP BY c.id
      ORDER BY clicks DESC, impressions DESC
      LIMIT 5
    `);

    return {
      summary: {
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        ctr_percent: parseFloat(globalCTR),
        active_campaigns: summary.active_campaigns,
        active_partners: summary.active_partners,
        total_partners_revenue_usd: parseFloat(summary.total_partners_revenue_usd)
      },
      placements: placementStats.map(p => ({
        ...p,
        ctr_percent: p.impressions_count > 0 ? parseFloat(((p.clicks_count / p.impressions_count) * 100).toFixed(2)) : 0
      })),
      top_campaigns: topCampaigns
    };
  }
}

module.exports = AdStats;
