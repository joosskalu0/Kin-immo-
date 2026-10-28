/**
 * Contrôleur d'Authentification Kinimmo
 * 
 * Délègue les opérations métier aux Use Cases Hexagonaux
 * tout en garantissant une compatibilité descendante 100% stricte
 * avec les routes, statuts HTTP et payloads JSON existants.
 */

const { registerUserUseCase, loginUserUseCase, getMeUseCase, pool } = require('../src/infrastructure/container');
const bcrypt = require('bcryptjs');

/**
 * Inscription d'un nouvel utilisateur (Particulier, Agent ou Agence)
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, password, phone, whatsapp, role, agencyName } = req.body;

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

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès sur Kinimmo.',
      token: result.token,
      user: result.user
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
 * Connexion d'un utilisateur existant
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez fournir votre adresse e-mail et votre mot de passe.'
      });
    }

    const result = await loginUserUseCase.execute({ email, password });

    return res.json({
      success: true,
      message: `Bienvenue ${result.user.name} !`,
      token: result.token,
      user: result.user
    });
  } catch (error) {
    if (error.statusCode === 401) {
      return res.status(401).json({
        success: false,
        message: error.message
      });
    }
    if (error.statusCode === 403) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
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
      user: userProfile
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

    res.json({
      success: true,
      message: 'Profil mis à jour avec succès.'
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
        message: 'L\'ancien et le nouveau mot de passe sont requis.'
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

    const valid = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'L\'ancien mot de passe actuel est incorrect.'
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
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};
