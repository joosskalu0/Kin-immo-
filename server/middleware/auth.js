const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'kinimmo_jwt_secret_default_key_2026';

function extractCookieToken(req, cookieName) {
  const header = req.headers && req.headers.cookie;
  if (!header || typeof header !== 'string') return null;
  const parts = header.split(';');
  for (const part of parts) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    if (key === cookieName) {
      const val = part.slice(eqIdx + 1).trim();
      try {
        return decodeURIComponent(val);
      } catch {
        return val;
      }
    }
  }
  return null;
}

function extractRequestJwt(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return extractCookieToken(req, 'kinimmo_access');
}

/**
 * Middleware d'authentification par JWT (Header Bearer ou Cookie HttpOnly kinimmo_access)
 */
async function authenticateToken(req, res, next) {
  const token = extractRequestJwt(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Accès refusé : Jeton d'authentification (Token JWT) manquant."
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

    const userRow = rows[0];
    userRow.role = String(userRow.role || 'user').trim().toLowerCase();
    req.user = userRow;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: 'Jeton invalide ou session expirée. Veuillez vous reconnecter.'
    });
  }
}

/**
 * Middleware d'authentification optionnelle (Header Bearer ou Cookie HttpOnly kinimmo_access)
 */
async function optionalAuth(req, res, next) {
  const token = extractRequestJwt(req);

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
    if (rows.length > 0) {
      rows[0].role = String(rows[0].role || 'user').trim().toLowerCase();
      req.user = rows[0];
    } else {
      req.user = null;
    }
  } catch (e) {
    req.user = null;
  }

  next();
}

module.exports = {
  authenticateToken,
  optionalAuth,
  extractRequestJwt,
  extractCookieToken
};
