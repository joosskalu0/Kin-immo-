/**
 * Adaptateur d'infrastructure : MySqlUserRepository
 * 
 * Implémentation concrète de IUserRepository pour MySQL via mysql2/promise.
 * Conforme au schéma réel de la table `users`.
 * Utilise strictement des requêtes SQL paramétrées.
 */

const IUserRepository = require('../../../../core/ports/repositories/IUserRepository');
const User = require('../../../../core/domain/user/User');

class MySqlUserRepository extends IUserRepository {
  /**
   * @param {object} pool Instance pool mysql2/promise
   */
  constructor(pool) {
    super();
    this.pool = pool;
  }

  /**
   * Transforme une ligne MySQL (RAW) en Entité User de Domaine
   * @param {object} row
   * @returns {User|null}
   */
  static toDomain(row) {
    if (!row) return null;
    return new User({
      id: row.id,
      name: row.name,
      email: row.email,
      password_hash: row.password_hash,
      phone: row.phone,
      whatsapp: row.whatsapp,
      role: row.role,
      agency_id: row.agency_id,
      agency_name: row.agency_name,
      avatar: row.avatar,
      is_verified: row.is_verified,
      kinshasa_badge_verified: row.kinshasa_badge_verified,
      rccm_or_nif: row.rccm_or_nif,
      plan_id: row.plan_id,
      subscription_status: row.subscription_status,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  }

  /**
   * Trouve un utilisateur par son identifiant unique
   * @param {string} id
   * @returns {Promise<User|null>}
   */
  async findById(id) {
    const query = `
      SELECT id, name, email, password_hash, phone, whatsapp, role,
             agency_id, agency_name, avatar, is_verified, kinshasa_badge_verified,
             rccm_or_nif, plan_id, subscription_status, created_at, updated_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `;
    const [rows] = await this.pool.execute(query, [id]);
    if (!rows || rows.length === 0) {
      return null;
    }
    return MySqlUserRepository.toDomain(rows[0]);
  }

  /**
   * Trouve un utilisateur par son e-mail
   * @param {string} email
   * @returns {Promise<User|null>}
   */
  async findByEmail(email) {
    const query = `
      SELECT id, name, email, password_hash, phone, whatsapp, role,
             agency_id, agency_name, avatar, is_verified, kinshasa_badge_verified,
             rccm_or_nif, plan_id, subscription_status, created_at, updated_at
      FROM users
      WHERE email = ?
      LIMIT 1
    `;
    const [rows] = await this.pool.execute(query, [email]);
    if (!rows || rows.length === 0) {
      return null;
    }
    return MySqlUserRepository.toDomain(rows[0]);
  }

  /**
   * Insère un nouvel utilisateur dans la table MySQL `users`
   * @param {User} user
   * @returns {Promise<User>}
   */
  async create(user) {
    const userId = user.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const query = `
      INSERT INTO users (
        id, name, email, password_hash, phone, whatsapp, role,
        agency_id, agency_name, avatar, is_verified, kinshasa_badge_verified,
        rccm_or_nif, plan_id, subscription_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      userId,
      user.name,
      user.email,
      user.password_hash,
      user.phone,
      user.whatsapp,
      user.role,
      user.agency_id,
      user.agency_name,
      user.avatar,
      user.is_verified ? 1 : 0,
      user.kinshasa_badge_verified ? 1 : 0,
      user.rccm_or_nif,
      user.plan_id,
      user.subscription_status
    ];

    await this.pool.execute(query, values);

    // Si rôle Agent, création de l'enregistrement dans agents si absent
    if (user.role === 'agent') {
      const agentId = `agent_${Date.now()}`;
      await this.pool.execute(
        `INSERT IGNORE INTO agents (id, user_id, name, email, phone, whatsapp, title)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [agentId, userId, user.name, user.email, user.phone || '', user.whatsapp || '', 'Courtier Immobilier Kinshasa']
      );
    }

    // Si rôle Agence, création de l'enregistrement dans agencies si absent
    if (user.role === 'agency') {
      const agencyId = user.agency_id || `agency_${Date.now()}`;
      await this.pool.execute(
        `INSERT IGNORE INTO agencies (id, name, email, phone, whatsapp, owner_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [agencyId, user.agency_name || user.name, user.email, user.phone || '', user.whatsapp || '', userId]
      );
      if (!user.agency_id) {
        await this.pool.execute('UPDATE users SET agency_id = ? WHERE id = ?', [agencyId, userId]);
      }
    }

    return this.findById(userId);
  }

  /**
   * Met à jour un utilisateur existant
   * @param {User} user
   * @returns {Promise<User>}
   */
  async update(user) {
    const query = `
      UPDATE users SET
        name = ?,
        phone = ?,
        whatsapp = ?,
        avatar = ?,
        rccm_or_nif = ?,
        agency_name = ?
      WHERE id = ?
    `;

    const values = [
      user.name,
      user.phone,
      user.whatsapp,
      user.avatar,
      user.rccm_or_nif,
      user.agency_name,
      user.id
    ];

    await this.pool.execute(query, values);
    return this.findById(user.id);
  }
}

module.exports = MySqlUserRepository;
