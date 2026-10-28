/**
 * Adaptateur d'infrastructure : JwtTokenService
 * 
 * Implémentation concrète de ITokenService basée sur jsonwebtoken.
 */

const jwt = require('jsonwebtoken');
const ITokenService = require('../../core/ports/security/ITokenService');

class JwtTokenService extends ITokenService {
  /**
   * @param {string} [jwtSecret] Clé secrète JWT
   * @param {string|number} [defaultExpiresIn] Durée de validité par défaut (ex: '7d')
   */
  constructor(jwtSecret = process.env.JWT_SECRET || 'kinimmo-secret-key-change-in-production', defaultExpiresIn = '7d') {
    super();
    this.jwtSecret = jwtSecret;
    this.defaultExpiresIn = defaultExpiresIn;
  }

  /**
   * Génère un token signé
   * @param {object} payload
   * @param {string|number} [expiresIn]
   * @returns {string}
   */
  generateToken(payload, expiresIn = this.defaultExpiresIn) {
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  /**
   * Vérifie et décode un token
   * @param {string} token
   * @returns {object}
   */
  verifyToken(token) {
    return jwt.verify(token, this.jwtSecret);
  }
}

module.exports = JwtTokenService;
