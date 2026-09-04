const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'kinimmo_jwt_secret_default_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15d';

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

    const cleanEmail = email.toLowerCase().trim();

    // Vérification de l'existence de l'e-mail
    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [cleanEmail]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cette adresse e-mail est déjà associée à un compte Kinimmo.'
      });
    }

    // Hashage du mot de passe avec bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveRole = ['user', 'agent', 'agency', 'admin'].includes(role) ? role : 'user';

    // Insertion dans la table users
    await pool.execute(
      `INSERT INTO users (id, name, email, password_hash, phone, whatsapp, role, agency_name, is_verified, plan_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        name.trim(),
        cleanEmail,
        passwordHash,
        phone || null,
        whatsapp || phone || null,
        effectiveRole,
        agencyName || null,
        false,
        effectiveRole === 'agency' ? 'agency' : effectiveRole === 'agent' ? 'pro' : 'starter'
      ]
    );

    // Si rôle Agent, création automatique de l'entrée dans la table agents
    if (effectiveRole === 'agent') {
      const agentId = `agent_${Date.now()}`;
      await pool.execute(
        `INSERT INTO agents (id, user_id, name, email, phone, whatsapp, title)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [agentId, userId, name.trim(), cleanEmail, phone || '', whatsapp || phone || '', 'Courtier Immobilier Kinshasa']
      );
    }

    // Si rôle Agence, création automatique de l'entrée dans la table agencies
    if (effectiveRole === 'agency') {
      const agencyId = `agency_${Date.now()}`;
      await pool.execute(
        `INSERT INTO agencies (id, name, email, phone, whatsapp, owner_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [agencyId, agencyName || name.trim(), cleanEmail, phone || '', whatsapp || phone || '', userId]
      );
      // Mettre à jour l'agency_id dans users
      await pool.execute('UPDATE users SET agency_id = ? WHERE id = ?', [agencyId, userId]);
    }

    // Génération du Token JWT
    const token = jwt.sign(
      { id: userId, email: cleanEmail, role: effectiveRole },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès sur Kinimmo.',
      token,
      user: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        phone: phone || null,
        whatsapp: whatsapp || null,
        role: effectiveRole,
        agencyName: agencyName || null,
        isVerified: false
      }
    });
  } catch (error) {
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

    const cleanEmail = email.toLowerCase().trim();

    // Recherche de l'utilisateur avec son hash de mot de passe
    const [rows] = await pool.execute(
      `SELECT id, name, email, password_hash, phone, whatsapp, role, agency_id, agency_name, avatar,
              is_verified, kinshasa_badge_verified, plan_id, subscription_status
       FROM users WHERE email = ? LIMIT 1`,
      [cleanEmail]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects : aucun compte trouvé pour cet e-mail.'
      });
    }

    const user = rows[0];

    // Vérification du mot de passe avec bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants incorrects : mot de passe invalide.'
      });
    }

    // Signature du token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Supprimer le hash avant l'envoi au client
    delete user.password_hash;

    res.json({
      success: true,
      message: `Bienvenue ${user.name} !`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        role: user.role,
        agencyId: user.agency_id,
        agencyName: user.agency_name,
        avatar: user.avatar,
        isVerified: Boolean(user.is_verified),
        kinshasaBadgeVerified: Boolean(user.kinshasa_badge_verified),
        planId: user.plan_id,
        subscriptionStatus: user.subscription_status
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer le profil de l'utilisateur connecté
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, whatsapp, role, agency_id, agency_name, avatar,
              is_verified, kinshasa_badge_verified, rccm_or_nif, plan_id, subscription_status, created_at
       FROM users WHERE id = ? LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable.' });
    }

    const user = rows[0];

    // Récupérer le nombre de propriétés si agent/agence
    let listingsCount = 0;
    if (['agent', 'agency', 'admin'].includes(user.role)) {
      const [pCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM properties WHERE agent_id = ?',
        [user.id]
      );
      listingsCount = pCount[0].count;
    }

    res.json({
      success: true,
      user: {
        ...user,
        isVerified: Boolean(user.is_verified),
        kinshasaBadgeVerified: Boolean(user.kinshasa_badge_verified),
        listingsCount
      }
    });
  } catch (error) {
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
