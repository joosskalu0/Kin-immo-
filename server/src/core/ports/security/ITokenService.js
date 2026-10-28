/**
 * Port : ITokenService
 * 
 * Contrat d'interface pour la génération et la validation de tokens d'authentification.
 */

class ITokenService {
  /**
   * Génère un token JWT pour un utilisateur
   * @param {object} payload
   * @param {string|number} [expiresIn]
   * @returns {string}
   */
  generateToken(payload, expiresIn) {
    throw new Error('Method generateToken must be implemented');
  }

  /**
   * Vérifie et décode un token JWT
   * @param {string} token
   * @returns {object} Payload décodé
   */
  verifyToken(token) {
    throw new Error('Method verifyToken must be implemented');
  }
}

module.exports = ITokenService;
