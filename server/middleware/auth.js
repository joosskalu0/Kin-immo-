const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'kinimmo_jwt_secret_default_key_2026';

/**
 * Middleware d'authentification par JWT
 * Vérifie le token présent dans le header 'Authorization: Bearer <token>'
 */
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Accès refusé : Jeton d\'authentification (Token JWT) manquant.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Vérification que l'utilisateur existe toujours dans la base MySQL
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, agency_id, is_verified, subscription_status FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur introuvable ou compte supprimé.'
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Jeton invalide ou session expirée. Veuillez vous reconnecter.'
    });
  }
}

/**
 * Middleware d'authentification optionnelle (pour les routes publiques qui personnalisent le résultat si connecté)
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.execute(
      'SELECT id, name, email, role, agency_id FROM users WHERE id = ? LIMIT 1',
      [decoded.id]
    );
    req.user = rows.length > 0 ? rows[0] : null;
  } catch (e) {
    req.user = null;
  }

  next();
}

module.exports = {
  authenticateToken,
  optionalAuth
};
