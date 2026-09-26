/**
 * Middleware de validation des données d'entrée pour le module publicitaire
 * Protège contre les données malformées et les attaques par injection
 */

const ALLOWED_PLACEMENTS = [
  'home_top',
  'home_middle',
  'property_top',
  'property_middle',
  'property_bottom',
  'search_top',
  'search_middle',
  'agency_top'
];

function validatePartnerInput(req, res, next) {
  const { company_name, email } = req.body;

  if (!company_name || typeof company_name !== 'string' || company_name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Le nom de l\'entreprise partenaire (company_name) est requis.'
    });
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'L\'adresse email fournie est invalide.'
      });
    }
  }

  next();
}

function validateCampaignInput(req, res, next) {
  const { partner_id, placement_id, title, image_url, target_url, start_date, end_date } = req.body;

  if (!partner_id || !placement_id || !title || !image_url || !target_url || !start_date || !end_date) {
    return res.status(400).json({
      success: false,
      message: 'Champs requis manquants : partner_id, placement_id, title, image_url, target_url, start_date, end_date.'
    });
  }

  if (!ALLOWED_PLACEMENTS.includes(placement_id)) {
    return res.status(400).json({
      success: false,
      message: `Emplacement publicitaire invalide. Valeurs acceptées : ${ALLOWED_PLACEMENTS.join(', ')}`
    });
  }

  const start = new Date(start_date);
  const end = new Date(end_date);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Format de date invalide pour start_date ou end_date (utilisez YYYY-MM-DD).'
    });
  }

  if (end < start) {
    return res.status(400).json({
      success: false,
      message: 'La date de fin (end_date) ne peut pas être antérieure à la date de début (start_date).'
    });
  }

  next();
}

function validatePaymentInput(req, res, next) {
  const { partner_id, amount_usd, payment_method } = req.body;

  if (!partner_id || amount_usd === undefined || !payment_method) {
    return res.status(400).json({
      success: false,
      message: 'Champs requis manquants : partner_id, amount_usd, payment_method.'
    });
  }

  const amount = parseFloat(amount_usd);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Le montant en USD (amount_usd) doit être un nombre strictement positif.'
    });
  }

  const validMethods = ['mpesa', 'airtel', 'orange', 'bank_transfer', 'card', 'cash'];
  if (!validMethods.includes(payment_method)) {
    return res.status(400).json({
      success: false,
      message: `Méthode de paiement non valide. Méthodes autorisées : ${validMethods.join(', ')}`
    });
  }

  next();
}

module.exports = {
  ALLOWED_PLACEMENTS,
  validatePartnerInput,
  validateCampaignInput,
  validatePaymentInput
};
