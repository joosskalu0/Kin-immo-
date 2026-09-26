const pool = require('../config/database');

class AdPartner {
  /**
   * Créer un nouveau partenaire publicitaire
   */
  static async create(data) {
    const {
      id,
      company_name,
      contact_person = null,
      email = null,
      phone = null,
      whatsapp = null,
      rccm_nif = null,
      address = null,
      status = 'active'
    } = data;

    const query = `
      INSERT INTO ad_partners (
        id, company_name, contact_person, email, phone, whatsapp, rccm_nif, address, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      id, company_name, contact_person, email, phone, whatsapp, rccm_nif, address, status
    ]);

    return this.findById(id);
  }

  /**
   * Trouver un partenaire par son ID
   */
  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT * FROM ad_partners WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }

  /**
   * Récupérer tous les partenaires avec pagination et filtre optionnel
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT p.*,
        COUNT(DISTINCT c.id) AS total_campaigns,
        COALESCE(SUM(pay.amount_usd), 0) AS total_paid_usd
      FROM ad_partners p
      LEFT JOIN ad_campaigns c ON p.id = c.partner_id
      LEFT JOIN ad_payments pay ON p.id = pay.partner_id AND pay.status = 'completed'
    `;
    const params = [];
    const conditions = [];

    if (filters.status) {
      conditions.push(`p.status = ?`);
      params.push(filters.status);
    }

    if (filters.search) {
      conditions.push(`(p.company_name LIKE ? OR p.contact_person LIKE ? OR p.email LIKE ?)`);
      const searchPattern = `%${filters.search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Mettre à jour un partenaire
   */
  static async update(id, data) {
    const allowedFields = [
      'company_name', 'contact_person', 'email', 'phone', 'whatsapp',
      'rccm_nif', 'address', 'status'
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
    const query = `UPDATE ad_partners SET ${updates.join(', ')} WHERE id = ?`;
    await pool.execute(query, params);

    return this.findById(id);
  }

  /**
   * Supprimer ou désactiver un partenaire
   */
  static async delete(id, soft = true) {
    if (soft) {
      await pool.execute(
        `UPDATE ad_partners SET status = 'inactive' WHERE id = ?`,
        [id]
      );
      // Désactiver également ses campagnes en cours
      await pool.execute(
        `UPDATE ad_campaigns SET status = 'paused' WHERE partner_id = ? AND status = 'active'`,
        [id]
      );
      return true;
    } else {
      const [result] = await pool.execute(
        `DELETE FROM ad_partners WHERE id = ?`,
        [id]
      );
      return result.affectedRows > 0;
    }
  }
}

module.exports = AdPartner;
