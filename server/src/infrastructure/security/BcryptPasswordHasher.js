/**
 * Adaptateur d'infrastructure : BcryptPasswordHasher
 * 
 * Implémentation concrète de IPasswordHasher basée sur bcryptjs.
 */

const bcrypt = require('bcryptjs');
const IPasswordHasher = require('../../core/ports/security/IPasswordHasher');

class BcryptPasswordHasher extends IPasswordHasher {
  /**
   * @param {number} saltRounds Nombre de tours pour le sel (défaut 10)
   */
  constructor(saltRounds = 10) {
    super();
    this.saltRounds = saltRounds;
  }

  /**
   * Hache un mot de passe en clair
   * @param {string} plainPassword
   * @returns {Promise<string>}
   */
  async hash(plainPassword) {
    return bcrypt.hash(plainPassword, this.saltRounds);
  }

  /**
   * Compare un mot de passe avec une empreinte
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  async compare(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = BcryptPasswordHasher;
