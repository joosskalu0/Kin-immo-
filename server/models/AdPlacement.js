const pool = require('../config/database');

class AdPlacement {
  /**
   * Récupérer tous les emplacements configurés
   */
  static async findAll() {
    const [rows] = await pool.execute(`
      SELECT p.*,
        COUNT(DISTINCT c.id) AS active_campaigns_count
      FROM ad_placements p
      LEFT JOIN ad_campaigns c ON p.id = c.placement_id
        AND c.status = 'active'
        AND CURDATE() BETWEEN c.start_date AND c.end_date
      GROUP BY p.id
      ORDER BY p.id ASC
    `);
    return rows;
  }

  /**
   * Trouver un emplacement par son identifiant unique
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM ad_placements WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Mettre à jour un emplacement (activation, slot Google AdSense)
   */
  static async update(id, data) {
    const allowedFields = ['name', 'description', 'width', 'height', 'is_active', 'allow_google_adsense', 'adsense_slot_id'];
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
    await pool.execute(
      `UPDATE ad_placements SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    return this.findById(id);
  }
}

module.exports = AdPlacement;
