/**
 * Cas d'utilisation : GetMeUseCase
 * 
 * Récupère le profil complet de l'utilisateur connecté avec son nombre d'annonces.
 * Retourne la structure exacte attendue par le frontend Kinimmo.
 */

class GetMeUseCase {
  /**
   * @param {object} dependencies
   * @param {import('../../../core/ports/repositories/IUserRepository')} dependencies.userRepository
   * @param {object} [dependencies.pool]
   */
  constructor({ userRepository, pool }) {
    this.userRepository = userRepository;
    this.pool = pool;
  }

  /**
   * Exécute le cas d'utilisation
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async execute(userId) {
    if (!userId) {
      const err = new Error('Identifiant utilisateur manquant.');
      err.statusCode = 400;
      throw err;
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      const err = new Error('Utilisateur introuvable.');
      err.statusCode = 404;
      throw err;
    }

    // Récupérer le nombre de propriétés si agent/agence/admin
    let listingsCount = 0;
    if (['agent', 'agency', 'admin'].includes(user.role) && this.pool) {
      try {
        const [pCount] = await this.pool.execute(
          'SELECT COUNT(*) as count FROM properties WHERE agent_id = ?',
          [user.id]
        );
        listingsCount = (pCount && pCount[0]) ? pCount[0].count : 0;
      } catch (err) {
        // En cas d'erreur de requête count, ne pas bloquer le chargement du profil
        listingsCount = 0;
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      whatsapp: user.whatsapp,
      role: user.role,
      agency_id: user.agency_id,
      agency_name: user.agency_name,
      avatar: user.avatar,
      is_verified: user.is_verified,
      kinshasa_badge_verified: user.kinshasa_badge_verified,
      rccm_or_nif: user.rccm_or_nif,
      plan_id: user.plan_id,
      subscription_status: user.subscription_status,
      created_at: user.created_at,
      isVerified: user.is_verified,
      kinshasaBadgeVerified: user.kinshasa_badge_verified,
      listingsCount
    };
  }
}

module.exports = GetMeUseCase;
