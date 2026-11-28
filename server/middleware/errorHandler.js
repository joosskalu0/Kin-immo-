/**
 * Gestionnaire d'erreurs centralisé pour l'API Express
 */
function errorHandler(err, req, res, next) {
  console.error('[API Error]', err);

  // Erreurs MySQL courantes
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(400).json({
      success: false,
      message: 'Cette entrée existe déjà dans la base de données (e-mail ou identifiant dupliqué).'
    });
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    const rawMsg = String(err.sqlMessage || err.message || '');
    let detail = "l'élément lié (annonce, option, moyen de paiement ou compte) n'existe plus";
    if (rawMsg.includes('fk_invoices_payment_method') || rawMsg.includes('payment_method_id')) {
      detail = "le moyen de paiement sélectionné n'est pas valide ou n'existe plus";
    } else if (rawMsg.includes('fk_boost_option') || rawMsg.includes('option_id')) {
      detail = "l'option de boost sélectionnée n'existe plus";
    } else if (
      rawMsg.includes('fk_boost_property') ||
      rawMsg.includes('fk_invoices_property') ||
      rawMsg.includes('property_id')
    ) {
      detail = "l'annonce sélectionnée n'existe plus";
    } else if (
      rawMsg.includes('fk_boost_user') ||
      rawMsg.includes('fk_invoices_user') ||
      rawMsg.includes('user_id')
    ) {
      detail = "votre session utilisateur est invalide, veuillez vous reconnecter";
    }
    return res.status(400).json({
      success: false,
      message: `Référence invalide : ${detail}.`
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Une erreur interne est survenue sur le serveur.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
