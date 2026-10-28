/**
 * Cas d'utilisation : RegisterUserUseCase
 * 
 * Orchestre l'inscription d'un nouvel utilisateur dans Kinimmo.
 * Règle métier : validation, unicité d'email, hachage, filtrage strict des rôles publics.
 */

const User = require('../../../core/domain/user/User');

class RegisterUserUseCase {
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
   * @param {string} input.name
   * @param {string} input.email
   * @param {string} input.password
   * @param {string} [input.role]
   * @param {string} [input.phone]
   * @param {string} [input.whatsapp]
   * @param {string} [input.agencyName]
   * @returns {Promise<{ user: object, token: string }>}
   */
  async execute({ name, email, password, role, phone, whatsapp, agencyName }) {
    // 1. Validation du mot de passe en clair (minimum 6 caractères)
    User.validatePlainPassword(password);

    // 2. Normalisation et sécurisation du rôle pour inscription publique
    const sanitizedRole = User.sanitizeRegistrationRole(role);

    // 3. Validation de domaine et normalisation de l'email
    const normalizedEmail = User.validateEmail(email);

    // 4. Vérification de l'unicité de l'e-mail
    const existingUser = await this.userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const err = new Error('Cette adresse e-mail est déjà associée à un compte Kinimmo.');
      err.statusCode = 400;
      err.code = 'EMAIL_ALREADY_EXISTS';
      throw err;
    }

    // 5. Hachage sécurisé du mot de passe
    const password_hash = await this.passwordHasher.hash(password);

    // 6. Instanciation de l'entité User
    const newUser = new User({
      name,
      email: normalizedEmail,
      password_hash,
      role: sanitizedRole,
      phone,
      whatsapp: whatsapp || phone || null,
      agency_name: agencyName || null,
      is_verified: false
    });

    // 7. Persistance via le repository
    const savedUser = await this.userRepository.create(newUser);

    // 8. Génération du token JWT (format compatible existant)
    const token = this.tokenService.generateToken({
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role
    });

    return {
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        whatsapp: savedUser.whatsapp,
        role: savedUser.role,
        agencyName: savedUser.agency_name,
        isVerified: savedUser.is_verified
      },
      token
    };
  }
}

module.exports = RegisterUserUseCase;
