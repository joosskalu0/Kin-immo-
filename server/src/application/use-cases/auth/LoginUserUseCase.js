/**
 * Cas d'utilisation : LoginUserUseCase
 * 
 * Orchestre l'authentification d'un utilisateur par email et mot de passe.
 * Retourne la structure exacte attendue par le frontend Kinimmo.
 */

const User = require('../../../core/domain/user/User');

class LoginUserUseCase {
  /**
   * @param {object} dependencies
   * @param {import('../../../core/ports/repositories/IUserRepository')} dependencies.userRepository
   * @param {import('../../../core/ports/security/IPasswordHasher')} dependencies.passwordHasher
   * @param {import('../../../core/ports/security/ITokenService')} dependencies.tokenService
   */
  constructor({ userRepository, passwordHasher, tokenService }) {
    this.userRepository = userRepository;
    this.passwordHasher = passwordHasher;
    this.tokenService = tokenService;
  }

  /**
   * Exécute le cas d'utilisation
   * @param {object} input
   * @param {string} input.email
   * @param {string} input.password
   * @returns {Promise<{ user: object, token: string }>}
   */
  async execute({ email, password }) {
    if (!email || !password) {
      const err = new Error('Veuillez fournir votre adresse e-mail et votre mot de passe.');
      err.statusCode = 400;
      throw err;
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Recherche de l'utilisateur par e-mail
    const user = await this.userRepository.findByEmail(cleanEmail);
    if (!user) {
      const err = new Error('Identifiants incorrects : aucun compte trouvé pour cet e-mail.');
      err.statusCode = 401;
      throw err;
    }

    // 2. Vérification du statut du compte si suspendu
    if (user.status === 'suspended' || user.status === 'inactive') {
      const err = new Error('Votre compte est suspendu ou désactivé.');
      err.statusCode = 403;
      throw err;
    }

    // 3. Vérification du mot de passe
    if (!user.password_hash) {
      const err = new Error('Identifiants incorrects : mot de passe invalide.');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await this.passwordHasher.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Identifiants incorrects : mot de passe invalide.');
      err.statusCode = 401;
      throw err;
    }

    // 4. Génération du token JWT
    const token = this.tokenService.generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return {
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
        isVerified: user.is_verified,
        kinshasaBadgeVerified: user.kinshasa_badge_verified,
        planId: user.plan_id,
        subscriptionStatus: user.subscription_status
      },
      token
    };
  }
}

module.exports = LoginUserUseCase;
