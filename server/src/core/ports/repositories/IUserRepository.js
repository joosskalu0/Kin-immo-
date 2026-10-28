/**
 * Port : IUserRepository
 * 
 * Contrat d'interface pour la persistance des entités User.
 * En JavaScript CommonJS, cette classe abstraite documente et garantit
 * les méthodes attendues par la couche Domaine / Application.
 */

class IUserRepository {
  /**
   * Trouve un utilisateur par son identifiant unique
   * @param {number|string} id
   * @returns {Promise<User|null>}
   */
  async findById(id) {
    throw new Error('Method findById must be implemented');
  }

  /**
   * Trouve un utilisateur par son adresse e-mail
   * @param {string} email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    throw new Error('Method findByEmail must be implemented');
  }

  /**
   * Enregistre un nouvel utilisateur en base de données
   * @param {User} user
   * @returns {Promise<User>}
   */
  async create(user) {
    throw new Error('Method create must be implemented');
  }

  /**
   * Met à jour les informations d'un utilisateur existant
   * @param {User} user
   * @returns {Promise<User>}
   */
  async update(user) {
    throw new Error('Method update must be implemented');
  }
}

module.exports = IUserRepository;
