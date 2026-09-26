const pool = require('../config/database');

class AdCampaign {
  /**
   * Créer une nouvelle campagne publicitaire
   */
  static async create(data) {
    const {
      id,
      partner_id,
      placement_id,
      title,
      description = null,
      image_url,
      target_url,
      start_date,
      end_date,
      price_usd = 0.00,
      price_cdf = 0.00,
      status = 'active',
      max_impressions = 0,
      max_clicks = 0,
      priority = 1
    } = data;

    const query = `
      INSERT INTO ad_campaigns (
        id, partner_id, placement_id, title, description, image_url, target_url,
        start_date, end_date, price_usd, price_cdf, status, max_impressions, max_clicks, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      id, partner_id, placement_id, title, description, image_url, target_url,
      start_date, end_date, price_usd, price_cdf, status, max_impressions, max_clicks, priority
    ]);

    return this.findById(id);
  }

  /**
   * Récupérer une campagne par son ID avec les informations du partenaire et de l'emplacement
   */
  static async findById(id) {
    const query = `
      SELECT c.*,
        p.company_name AS partner_name,
        p.email AS partner_email,
        p.phone AS partner_phone,
        p.whatsapp AS partner_whatsapp,
        pl.name AS placement_name,
        pl.width AS placement_width,
        pl.height AS placement_height,
        (SELECT COUNT(*) FROM ad_impressions WHERE campaign_id = c.id) AS impressions_count,
        (SELECT COUNT(*) FROM ad_clicks WHERE campaign_id = c.id) AS clicks_count
      FROM ad_campaigns c
      JOIN ad_partners p ON c.partner_id = p.id
      JOIN ad_placements pl ON c.placement_id = pl.id
      WHERE c.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  /**
   * Récupérer la campagne active et non expirée pour un emplacement donné
   * Condition primordiale demandée par le client :
   * "Le backend doit uniquement retourner les campagnes partenaires actives et non expirées."
   */
  static async findActiveByPlacement(placement_id) {
    const query = `
      SELECT c.id, c.partner_id, c.placement_id, c.title, c.description,
             c.image_url, c.target_url, c.start_date, c.end_date, c.priority,
             p.company_name AS advertiser_name,
             p.whatsapp AS advertiser_whatsapp,
             p.phone AS advertiser_phone,
             pl.adsense_slot_id,
             pl.allow_google_adsense
      FROM ad_campaigns c
      JOIN ad_partners p ON c.partner_id = p.id
      JOIN ad_placements pl ON c.placement_id = pl.id
      WHERE c.placement_id = ?
        AND c.status = 'active'
        AND p.status = 'active'
        AND pl.is_active = TRUE
        AND CURDATE() BETWEEN c.start_date AND c.end_date
        AND (c.max_impressions = 0 OR (SELECT COUNT(*) FROM ad_impressions WHERE campaign_id = c.id) < c.max_impressions)
        AND (c.max_clicks = 0 OR (SELECT COUNT(*) FROM ad_clicks WHERE campaign_id = c.id) < c.max_clicks)
      ORDER BY c.priority DESC, RAND()
      LIMIT 1
    `;

    const [rows] = await pool.execute(query, [placement_id]);
    return rows[0] || null;
  }

  /**
   * Lister toutes les campagnes (avec filtres de statut, partenaire ou emplacement)
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT c.*,
        p.company_name AS partner_name,
        pl.name AS placement_name,
        (SELECT COUNT(*) FROM ad_impressions WHERE campaign_id = c.id) AS impressions_count,
        (SELECT COUNT(*) FROM ad_clicks WHERE campaign_id = c.id) AS clicks_count,
        CASE
          WHEN CURDATE() < c.start_date THEN 'upcoming'
          WHEN CURDATE() > c.end_date THEN 'expired'
          WHEN c.status = 'paused' THEN 'paused'
          WHEN c.status = 'active' THEN 'running'
          ELSE c.status
        END AS real_status
      FROM ad_campaigns c
      JOIN ad_partners p ON c.partner_id = p.id
      JOIN ad_placements pl ON c.placement_id = pl.id
    `;
    const params = [];
    const conditions = [];

    if (filters.partner_id) {
      conditions.push(`c.partner_id = ?`);
      params.push(filters.partner_id);
    }

    if (filters.placement_id) {
      conditions.push(`c.placement_id = ?`);
      params.push(filters.placement_id);
    }

    if (filters.status) {
      conditions.push(`c.status = ?`);
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY c.created_at DESC`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Mettre à jour une campagne
   */
  static async update(id, data) {
    const allowedFields = [
      'partner_id', 'placement_id', 'title', 'description', 'image_url',
      'target_url', 'start_date', 'end_date', 'price_usd', 'price_cdf',
      'status', 'max_impressions', 'max_clicks', 'priority'
    ];
    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (updates.length === 0) return this.findById(id);

    params.push(id);
    const query = `UPDATE ad_campaigns SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(query, params);

    return this.findById(id);
  }

  /**
   * Activer ou désactiver une campagne
   */
  static async toggleStatus(id, newStatus) {
    await pool.execute(
      `UPDATE ad_campaigns SET status = ? WHERE id = ?`,
      [newStatus, id]
    );
    return this.findById(id);
  }

  /**
   * Supprimer une campagne
   */
  static async delete(id) {
    const [result] = await pool.execute(
      `DELETE FROM ad_campaigns WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}

module.exports = AdCampaign;
