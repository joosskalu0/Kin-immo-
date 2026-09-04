const pool = require('../config/database');
const crypto = require('crypto');

/**
 * Récupérer la liste des formules d'abonnement actives
 * GET /api/billing/plans
 */
async function getPlans(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM pricing_plans WHERE is_active = TRUE ORDER BY price_usd ASC'
    );
    res.json({ success: true, plans: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer les coordonnées et modes de paiement officiels Kinimmo (M-Pesa, Airtel, etc.)
 * GET /api/billing/payment-methods
 */
async function getPaymentMethods(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT id, provider, account_name, account_number, merchant_code, instructions FROM payment_methods WHERE is_active = TRUE'
    );
    res.json({ success: true, paymentMethods: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Générer une facture pour souscrire ou renouveler un forfait
 * POST /api/billing/invoices
 */
async function createInvoice(req, res, next) {
  try {
    const userId = req.user.id;
    const { planId, paymentMethodId } = req.body;

    // Vérifier que le plan existe
    const [plans] = await pool.execute('SELECT * FROM pricing_plans WHERE id = ? AND is_active = TRUE LIMIT 1', [planId]);
    if (plans.length === 0) {
      return res.status(404).json({ success: false, message: 'Plan de tarification introuvable.' });
    }
    const selectedPlan = plans[0];

    const invoiceId = 'inv_' + crypto.randomBytes(8).toString('hex');
    const invoiceNumber = 'FAC-KIN-' + Date.now().toString().slice(-6);
    
    // Échéance à 7 jours
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    await pool.execute(
      `INSERT INTO invoices (id, invoice_number, user_id, plan_id, amount, currency, amount_cdf, payment_method_id, status, due_date)
       VALUES (?, ?, ?, ?, ?, 'USD', ?, ?, 'pending', ?)`,
      [
        invoiceId,
        invoiceNumber,
        userId,
        selectedPlan.id,
        selectedPlan.price_usd,
        selectedPlan.price_cdf,
        paymentMethodId || null,
        dueDateStr
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Facture générée avec succès.',
      invoice: {
        id: invoiceId,
        invoiceNumber,
        plan: selectedPlan.name,
        amount: selectedPlan.price_usd,
        amountCdf: selectedPlan.price_cdf,
        status: 'pending',
        dueDate: dueDateStr
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Soumettre les coordonnées de paiement / référence de transaction pour validation
 * PUT /api/billing/invoices/:id/pay
 */
async function submitPaymentProof(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { paymentMethodId, transactionReference, proofImageUrl } = req.body;

    const [invs] = await pool.execute('SELECT * FROM invoices WHERE id = ? AND user_id = ? LIMIT 1', [id, userId]);
    if (invs.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture introuvable pour votre compte.' });
    }

    await pool.execute(
      `UPDATE invoices
       SET payment_method_id = COALESCE(?, payment_method_id),
           transaction_reference = COALESCE(?, transaction_reference),
           proof_image_url = COALESCE(?, proof_image_url)
       WHERE id = ?`,
      [paymentMethodId || null, transactionReference || null, proofImageUrl || null, id]
    );

    res.json({
      success: true,
      message: 'Justificatif de paiement enregistré. Votre compte sera activé dès validation.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Consulter l'historique de ses factures (Courtier ou Agence)
 * GET /api/billing/my-invoices
 */
async function getMyInvoices(req, res, next) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT i.*, p.name as plan_name, pm.provider as payment_provider, pm.account_name as payment_account_name
       FROM invoices i
       LEFT JOIN pricing_plans p ON i.plan_id = p.id
       LEFT JOIN payment_methods pm ON i.payment_method_id = pm.id
       WHERE i.user_id = ?
       ORDER BY i.created_at DESC`,
      [userId]
    );

    res.json({ success: true, invoices: rows });
  } catch (error) {
    next(error);
  }
}

/**
 * Valider une facture et activer immédiatement le compte (Admin)
 * PUT /api/billing/invoices/:id/approve
 */
async function approveInvoice(req, res, next) {
  try {
    const { id } = req.params;

    const [invs] = await pool.execute('SELECT * FROM invoices WHERE id = ? LIMIT 1', [id]);
    if (invs.length === 0) {
      return res.status(404).json({ success: false, message: 'Facture introuvable.' });
    }
    const inv = invs[0];

    // Marquer la facture comme payée
    await pool.execute(
      `UPDATE invoices
       SET status = 'paid', paid_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    // Mettre à jour le plan de l'utilisateur et son statut
    if (inv.plan_id) {
      await pool.execute(
        `UPDATE users
         SET plan_id = ?, subscription_status = 'Active'
         WHERE id = ?`,
        [inv.plan_id, inv.user_id]
      );
    }

    res.json({
      success: true,
      message: `Facture ${inv.invoice_number} validée. L'abonnement a été activé.`
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPlans,
  getPaymentMethods,
  createInvoice,
  submitPaymentProof,
  getMyInvoices,
  approveInvoice
};
