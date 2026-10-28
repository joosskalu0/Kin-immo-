/**
 * Entité de Domaine : User
 * 
 * Encapsule les règles métier et invariants d'un utilisateur Kinimmo.
 * Indépendante d'Express, de MySQL ou de tout framework externe.
 */

class User {
  /**
   * Rôles valides dans le système Kinimmo
   */
  static ROLES = Object.freeze({
    USER: 'user',
    AGENT: 'agent',
    AGENCY: 'agency',
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
  });

  /**
   * Statuts possibles
   */
  static STATUSES = Object.freeze({
    ACTIVE: 'active',
    PENDING: 'pending',
    SUSPENDED: 'suspended',
    INACTIVE: 'inactive'
  });

  /**
   * Rôles autorisés pour une inscription publique standard
   */
  static ALLOWED_REGISTRATION_ROLES = Object.freeze([
    'user',
    'agent',
    'agency'
  ]);

  constructor({
    id = null,
    name,
    email,
    password_hash = null,
    role = User.ROLES.USER,
    status = User.STATUSES.ACTIVE,
    phone = null,
    whatsapp = null,
    avatar = null,
    avatar_url = null,
    address = null,
    agency_id = null,
    agency_name = null,
    is_verified = false,
    kinshasa_badge_verified = false,
    rccm_or_nif = null,
    plan_id = 'starter',
    subscription_status = 'Active',
    created_at = null,
    updated_at = null
  }) {
    this.id = id;
    this.name = User.validateName(name);
    this.email = User.validateEmail(email);
    this.password_hash = password_hash;
    this.role = User.validateRole(role);
    this.status = status || User.STATUSES.ACTIVE;
    this.phone = phone ? String(phone).trim() : null;
    this.whatsapp = whatsapp ? String(whatsapp).trim() : (this.phone || null);
    this.avatar = avatar || avatar_url || null;
    this.avatar_url = this.avatar;
    this.address = address || null;
    this.agency_id = agency_id || null;
    this.agency_name = agency_name || null;
    this.is_verified = Boolean(is_verified);
    this.kinshasa_badge_verified = Boolean(kinshasa_badge_verified);
    this.rccm_or_nif = rccm_or_nif || null;
    this.plan_id = plan_id || (this.role === 'agency' ? 'agency' : this.role === 'agent' ? 'pro' : 'starter');
    this.subscription_status = subscription_status || 'Active';
    this.created_at = created_at ? new Date(created_at) : new Date();
    this.updated_at = updated_at ? new Date(updated_at) : new Date();
  }

  static validateName(name) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Le nom est requis et ne peut être vide.');
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      throw new Error('Le nom doit contenir au moins 2 caractères.');
    }
    if (trimmed.length > 255) {
      throw new Error('Le nom ne peut pas dépasser 255 caractères.');
    }
    return trimmed;
  }

  static validateEmail(email) {
    if (!email || typeof email !== 'string') {
      throw new Error("L'adresse e-mail est requise.");
    }
    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error("Format d'adresse e-mail invalide.");
    }
    return trimmed;
  }

  static validateRole(role) {
    const validRoles = Object.values(User.ROLES);
    if (!role || !validRoles.includes(role)) {
      throw new Error(`Rôle invalide: '${role}'. Rôles autorisés: ${validRoles.join(', ')}.`);
    }
    return role;
  }

  /**
   * Vérifie et filtre le rôle demandé lors d'une inscription publique.
   * Empêche formellement l'élévation de privilèges vers admin ou super_admin.
   */
  static sanitizeRegistrationRole(requestedRole) {
    if (!requestedRole) {
      return User.ROLES.USER;
    }
    const roleLower = String(requestedRole).toLowerCase().trim();
    if (!User.ALLOWED_REGISTRATION_ROLES.includes(roleLower)) {
      throw new Error(`Le rôle '${requestedRole}' n'est pas autorisé pour une inscription publique.`);
    }
    return roleLower;
  }

  /**
   * Validation de complexité du mot de passe en clair
   */
  static validatePlainPassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Le mot de passe est requis.');
    }
    if (password.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
    }
    return password;
  }

  /**
   * Détermine si l'utilisateur est actif
   */
  isActive() {
    return this.status === User.STATUSES.ACTIVE;
  }

  /**
   * Détermine si l'utilisateur est administrateur
   */
  isAdmin() {
    return this.role === User.ROLES.ADMIN || this.role === User.ROLES.SUPER_ADMIN;
  }

  /**
   * Retourne un objet sécurisé pour l'API sans AUCUNE trace de mot de passe haché
   */
  toSafeObject() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      phone: this.phone,
      whatsapp: this.whatsapp,
      role: this.role,
      agencyId: this.agency_id,
      agencyName: this.agency_name,
      avatar: this.avatar,
      isVerified: this.is_verified,
      kinshasaBadgeVerified: this.kinshasa_badge_verified,
      planId: this.plan_id,
      subscriptionStatus: this.subscription_status,
      createdAt: this.created_at,
      updatedAt: this.updated_at
    };
  }
}

module.exports = User;
