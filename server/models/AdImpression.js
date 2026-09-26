const pool = require('../config/database');

class AdImpression {
  /**
   * Enregistrer une impression publicitaire
   */
  static async record(data) {
    const {
      id,
      campaign_id,
      placement_id,
      ip_address = null,
      user_agent = null,
      referer = null
    } = data;

    const query = `
      INSERT INTO ad_impressions (
        id, campaign_id, placement_id, ip_address, user_agent, referer
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      id, campaign_id, placement_id, ip_address, user_agent, referer
    ]);

    return { id, campaign_id, recorded: true };
  }

  /**
   * Statistiques d'impressions par période
   */
  static async getStats(campaignId = null) {
    let query = `
      SELECT
        DATE(viewed_at) AS date,
        COUNT(*) AS count
      FROM ad_impressions
    `;
    const params = [];

    if (campaignId) {
      query += ` WHERE campaign_id = ? `;
      params.push(campaignId);
    }

    query += ` GROUP BY DATE(viewed_at) ORDER BY date DESC LIMIT 30`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

module.exports = AdImpression;
