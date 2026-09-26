const pool = require('../config/database');

class AdPayment {
  /**
   * Enregistrer un paiement partenaire
   */
  static async create(data) {
    const {
      id,
      partner_id,
      campaign_id = null,
      amount_usd,
      amount_cdf = 0.00,
      payment_method,
      transaction_reference = null,
      payment_date = new Date().toISOString().slice(0, 10),
      status = 'completed',
      notes = null,
      recorded_by_user_id = null
    } = data;

    const query = `
      INSERT INTO ad_payments (
        id, partner_id, campaign_id, amount_usd, amount_cdf, payment_method,
        transaction_reference, payment_date, status, notes, recorded_by_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await pool.execute(query, [
      id, partner_id, campaign_id, amount_usd, amount_cdf, payment_method,
      transaction_reference, payment_date, status, notes, recorded_by_user_id
    ]);

    return this.findById(id);
  }

  /**
   * Trouver un paiement par son ID
   */
  static async findById(id) {
    const query = `
      SELECT pay.*,
        p.company_name AS partner_name,
        c.title AS campaign_title,
        u.name AS recorded_by_name
      FROM ad_payments pay
      JOIN ad_partners p ON pay.partner_id = p.id
      LEFT JOIN ad_campaigns c ON pay.campaign_id = c.id
      LEFT JOIN users u ON pay.recorded_by_user_id = u.id
      WHERE pay.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.execute(query, [id]);
    return rows[0] || null;
  }

  /**
   * Lister les paiements
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT pay.*,
        p.company_name AS partner_name,
        c.title AS campaign_title,
        u.name AS recorded_by_name
      FROM ad_payments pay
      JOIN ad_partners p ON pay.partner_id = p.id
      LEFT JOIN ad_campaigns c ON pay.campaign_id = c.id
      LEFT JOIN users u ON pay.recorded_by_user_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (filters.partner_id) {
      conditions.push(`pay.partner_id = ?`);
      params.push(filters.partner_id);
    }

    if (filters.status) {
      conditions.push(`pay.status = ?`);
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` ORDER BY pay.payment_date DESC, pay.created_at DESC`;

    const [rows] = await pool.execute(query, params);
    return rows;
  }

  /**
   * Obtenir les totaux financiers (revenus réels des partenaires Kinimmo)
   */
  static async getFinancialSummary() {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount_usd ELSE 0 END), 0) AS total_revenue_usd,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount_cdf ELSE 0 END), 0) AS total_revenue_cdf,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount_usd ELSE 0 END), 0) AS pending_revenue_usd,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) AS completed_payments_count
      FROM ad_payments
    `;
    const [rows] = await pool.execute(query);
    return rows[0];
  }
}

module.exports = AdPayment;
