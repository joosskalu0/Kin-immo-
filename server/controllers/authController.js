/**
 * Contrôleur d'Authentification Kinimmo (Backend MySQL)
 *
 * Prend en charge à la fois le contrat historique Bearer JWT et les cookies HttpOnly + CSRF
 * utilisés par le frontend Kinimmo (admin, agents, agences, particuliers).
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const {
  registerUserUseCase,
  loginUserUseCase,
  getMeUseCase,
  tokenService,
  pool
} = require('../src/infrastructure/container');
const { extractRequestJwt, extractCookieToken } = require('../middleware/auth');

const ACCESS_COOKIE_NAME = 'kinimmo_access';
const CSRF_COOKIE_NAME = 'kinimmo_csrf';
const ACCESS_MAX_AGE_SEC = 15 * 24 * 60 * 60;

function isHttpsRequest(req) {
  const forwardedProto = String((req.headers && req.headers['x-forwarded-proto']) || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  return Boolean(req.secure || forwardedProto === 'https');
}

function buildCookieString(req, name, value, maxAgeSeconds, httpOnly = true) {
  const hostHeader = String((req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '');
  const isLocalHttp = !isHttpsRequest(req) && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostHeader);
  const secure = isHttpsRequest(req) || (process.env.NODE_ENV === 'production' && !isLocalHttp);
  const isEmbedded = req.headers && req.headers['x-kinimmo-embedded'] === '1';

  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  if (isEmbedded && secure) {
    parts.push('SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

function issueSessionCookies(req, res, jwtToken) {
  const csrfToken = extractCookieToken(req, CSRF_COOKIE_NAME) || crypto.randomBytes(24).toString('hex');
  res.append('Set-Cookie', buildCookieString(req, ACCESS_COOKIE_NAME, jwtToken, ACCESS_MAX_AGE_SEC, true));
  res.append('Set-Cookie', buildCookieString(req, CSRF_COOKIE_NAME, csrfToken, 24 * 60 * 60, true));
  return csrfToken;
}

/**
 * Jeton CSRF pour les formulaires frontend
 * GET /api/auth/csrf
 */
function getCsrf(req, res) {
  const csrfToken = extractCookieToken(req, CSRF_COOKIE_NAME) || crypto.randomBytes(24).toString('hex');
  res.append('Set-Cookie', buildCookieString(req, CSRF_COOKIE_NAME, csrfToken, 24 * 60 * 60, true));
  return res.json({ success: true, csrfToken });
}

/**
 * Inscription d'un nouvel utilisateur (Particulier, Agent ou Agence)
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, phone, whatsapp, role, agencyName } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez renseigner votre nom, adresse e-mail et mot de passe.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères.'
      });
    }

    const result = await registerUserUseCase.execute({
      name,
      email,
      password,
      role,
      phone,
      whatsapp,
      agencyName
    });

    const csrfToken = issueSessionCookies(req, res, result.token);

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès sur Kinimmo.',
      token: result.token,
      csrfToken,
      user: result.user,
      data: { user: result.user }
    });
  } catch (error) {
    if (error.code === 'EMAIL_ALREADY_EXISTS') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

/**
 * Connexion d'un utilisateur existant (Admin, Agent, Agence, Particulier)
 * Accepte identifier (e-mail ou téléphone +243), email ou phone.
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { identifier, email, phone, password } = req.body || {};
    const rawIdentifier = String(identifier || email || phone || '').trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir votre identifiant (e-mail ou téléphone) et votre mot de passe.'
      });
    }

    const result = await loginUserUseCase.execute({
      identifier: rawIdentifier,
      email,
      phone,
      password
    });

    const csrfToken = issueSessionCookies(req, res, result.token);

    return res.json({
      success: true,
      message: `Bienvenue ${result.user.name} !`,
      token: result.token,
      csrfToken,
      user: result.user,
      data: { user: result.user }
    });
  } catch (error) {
    if (error.statusCode === 400 || error.statusCode === 401 || error.statusCode === 403) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
}

/**
 * Vérification silencieuse de la session courante
 * GET /api/auth/session
 */
async function getSession(req, res) {
  try {
    const token = extractRequestJwt(req);
    if (!token) {
      return res.json({
        success: true,
        authenticated: false,
        user: null,
        data: { authenticated: false, user: null }
      });
    }
    const decoded = tokenService.verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.json({
        success: true,
        authenticated: false,
        user: null,
        data: { authenticated: false, user: null }
      });
    }
    const userProfile = await getMeUseCase.execute(decoded.id);
    return res.json({
      success: true,
      authenticated: true,
      user: userProfile,
      data: { authenticated: true, user: userProfile }
    });
  } catch {
    return res.json({
      success: true,
      authenticated: false,
      user: null,
      data: { authenticated: false, user: null }
    });
  }
}

/**
 * Rafraîchissement de session
 * POST /api/auth/refresh
 */
async function refreshSession(req, res) {
  try {
    const token = extractRequestJwt(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        code: 'REFRESH_INVALID',
        message: 'Session expirée. Veuillez vous reconnecter.'
      });
    }
    const decoded = tokenService.verifyToken(token);
    const userProfile = await getMeUseCase.execute(decoded.id);
    const newToken = tokenService.generateToken({
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role
    });
    const csrfToken = issueSessionCookies(req, res, newToken);
    return res.json({
      success: true,
      token: newToken,
      csrfToken,
      user: userProfile,
      data: { user: userProfile }
    });
  } catch {
    return res.status(401).json({
      success: false,
      code: 'REFRESH_INVALID',
      message: 'Session expirée. Veuillez vous reconnecter.'
    });
  }
}

/**
 * Déconnexion
 * POST /api/auth/logout
 */
function logout(req, res) {
  res.append('Set-Cookie', buildCookieString(req, ACCESS_COOKIE_NAME, '', 0, true));
  return res.json({ success: true, message: 'Déconnexion effectuée.' });
}

/**
 * Récupérer le profil de l'utilisateur connecté
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const userProfile = await getMeUseCase.execute(req.user.id);

    return res.json({
      success: true,
      user: userProfile,
      data: { user: userProfile }
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
}

/**
 * Modifier son propre profil utilisateur
 * PUT /api/auth/profile
 */
async function updateProfile(req, res, next) {
  try {
    const { name, phone, whatsapp, avatar, rccmOrNif, agencyName } = req.body;

    await pool.execute(
      `UPDATE users
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           whatsapp = COALESCE(?, whatsapp),
           avatar = COALESCE(?, avatar),
           rccm_or_nif = COALESCE(?, rccm_or_nif),
           agency_name = COALESCE(?, agency_name)
       WHERE id = ?`,
      [name || null, phone || null, whatsapp || null, avatar || null, rccmOrNif || null, agencyName || null, req.user.id]
    );

    const updated = await getMeUseCase.execute(req.user.id);
    res.json({
      success: true,
      message: 'Profil mis à jour avec succès.',
      user: updated,
      data: { user: updated }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Modifier son mot de passe
 * PUT /api/auth/change-password
 */
async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "L'ancien et le nouveau mot de passe sont requis."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit comporter au moins 6 caractères.'
      });
    }

    const [rows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    const normalizedHash = String(rows[0].password_hash || '').trim().replace(/^\$2y\$/, '$2b$');
    const valid = await bcrypt.compare(oldPassword, normalizedHash);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: "L'ancien mot de passe actuel est incorrect."
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.user.id]);

    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCsrf,
  register,
  login,
  getSession,
  refreshSession,
  logout,
  getMe,
  updateProfile,
  changePassword
};
