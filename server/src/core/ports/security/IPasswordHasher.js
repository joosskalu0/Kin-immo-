/**
 * Port : IPasswordHasher
 * 
 * Contrat d'interface pour le hachage et la vérification des mots de passe.
 */

class IPasswordHasher {
  /**
   * Hache un mot de passe en clair
   * @param {string} plainPassword
   * @returns {Promise<string>}
   */
  async hash(plainPassword) {
    throw new Error('Method hash must be implemented');
  }

  /**
   * Compare un mot de passe en clair avec une empreinte hachée
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  async compare(plainPassword, hashedPassword) {
    throw new Error('Method compare must be implemented');
  }
}

module.exports = IPasswordHasher;
