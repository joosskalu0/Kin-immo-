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
    return res.status(400).json({
      success: false,
      message: 'Référence invalide : l\'élément lié (propriété, agence ou utilisateur) n\'existe pas.'
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
