const pool = require('../config/database');

class AdClick {
  /**
   * Enregistrer un clic publicitaire
   */
  static async record(data) {
    const {
      id,
      campaign_id,
      placement_id,
      ip_address = null,
      user_agent = null
    } = data;

    const query = `
      INSERT INTO ad_clicks (
        id, campaign_id, placement_id, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      id, campaign_id, placement_id, ip_address, user_agent
    ]);

    return { id, campaign_id, recorded: true };
  }

  /**
   * Statistiques de clics par période
   */
  static async getStats(campaignId = null) {
    let query = `
      SELECT
        DATE(clicked_at) AS date,
        COUNT(*) AS count
      FROM ad_clicks
    `;
    const params = [];

    if (campaignId) {
      query += ` WHERE campaign_id = ? `;
      params.push(campaignId);
    }

    query += ` GROUP BY DATE(clicked_at) ORDER BY date DESC LIMIT 30`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }
}

module.exports = AdClick;
