import { Property, User, ListingLifecycleStatus, PropertyStatusHistoryEntry } from '../types';

/**
 * Utilitaires pour les règles métier des annonces Kinimmo
 * Règle stricte : Statuts DRAFT, PENDING_REVIEW, PUBLISHED, RENTED, SOLD, ARCHIVED
 */

export const LISTING_STATUS_CONFIG: Record<
  ListingLifecycleStatus,
  {
    label: string;
    description: string;
    color: string;
    bg: string;
    border: string;
    isAvailable: boolean;
    allowsBoost: boolean;
  }
> = {
  DRAFT: {
    label: 'Brouillon',
    description: 'En cours de rédaction, invisible au grand public.',
    color: 'text-slate-400',
    bg: 'bg-slate-800/80',
    border: 'border-slate-700',
    isAvailable: false,
    allowsBoost: false
  },
  PENDING_REVIEW: {
    label: 'En attente de validation',
    description: 'Soumis à l’équipe Kinimmo pour vérification et audit de conformité.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    isAvailable: false,
    allowsBoost: false
  },
  PUBLISHED: {
    label: 'Publié (En ligne)',
    description: 'Visible publiquement par tous les acheteurs et locataires.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    isAvailable: true,
    allowsBoost: true
  },
  RENTED: {
    label: 'Loué',
    description: 'Transaction locative conclue. Le bien n’est plus disponible.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/40',
    isAvailable: false,
    allowsBoost: false
  },
  SOLD: {
    label: 'Vendu',
    description: 'Vente actée et clôturée. Le bien n’est plus disponible.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/40',
    isAvailable: false,
    allowsBoost: false
  },
  ARCHIVED: {
    label: 'Archivé',
    description: 'Retiré du catalogue actif mais conservé dans votre historique.',
    color: 'text-slate-500',
    bg: 'bg-slate-900',
    border: 'border-slate-800',
    isAvailable: false,
    allowsBoost: false
  }
};

/**
 * Normalise le statut d'une annonce pour garantir la compatibilité
 */
export function getListingLifecycleStatus(property?: Partial<Property> | null): ListingLifecycleStatus {
  if (!property) return 'DRAFT';

  // Si le champ direct listingStatus existe
  if (property.listingStatus) {
    const raw = String(property.listingStatus).toUpperCase();
    if (['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RENTED', 'SOLD', 'ARCHIVED'].includes(raw)) {
      return raw as ListingLifecycleStatus;
    }
  }

  // Rétrocompatibilité avec property.status legacy ('sold', 'for-rent', 'for-sale')
  if (property.status === 'sold') return 'SOLD';
  if (property.published === false) return 'DRAFT';
  return 'PUBLISHED';
}

/**
 * Détermine si le bien est encore disponible à la visite et transaction
 */
export function isPropertyAvailable(property?: Partial<Property> | null): boolean {
  if (!property) return false;
  if (property.isAvailable !== undefined) {
    return Boolean(property.isAvailable);
  }
  const status = getListingLifecycleStatus(property);
  return status === 'PUBLISHED';
}

/**
 * Vérifie si un boost de visibilité est autorisé sur ce bien
 * Règle stricte Kinimmo : Empêcher les nouveaux boosts pour les biens RENTED, SOLD, ARCHIVED, DRAFT
 */
export function canBoostProperty(property?: Partial<Property> | null): { allowed: boolean; reason?: string } {
  if (!property) {
    return { allowed: false, reason: 'Bien introuvable.' };
  }
  const status = getListingLifecycleStatus(property);
  if (status === 'SOLD') {
    return {
      allowed: false,
      reason: 'Ce bien a été marqué comme VENDU. Les boosts de visibilité sont strictement interdits pour les biens vendus.'
    };
  }
  if (status === 'RENTED') {
    return {
      allowed: false,
      reason: 'Ce bien a été marqué comme LOUÉ. Les boosts de visibilité sont désactivés pour les biens loués.'
    };
  }
  if (status === 'ARCHIVED') {
    return {
      allowed: false,
      reason: 'Ce bien est archivé. Veuillez d’abord le republier pour commander un boost.'
    };
  }
  if (status === 'DRAFT') {
    return {
      allowed: false,
      reason: 'Ce bien est un brouillon non publié. Veuillez le publier avant de le sponsoriser.'
    };
  }
  if (status === 'PENDING_REVIEW') {
    return {
      allowed: false,
      reason: 'Ce bien est en attente de modération. Le boost s’activera dès approbation.'
    };
  }
  return { allowed: true };
}

/**
 * Vérifie les droits d'édition d'un bien
 * Règle stricte Kinimmo :
 * - Un agent ne peut modifier que ses propres biens ou ceux explicitement attribués.
 * - Un responsable d’agence ne peut intervenir que dans le périmètre de son agence.
 * - L'admin a accès à tout le catalogue.
 */
export function canUserEditProperty(user: User | null, property: Property): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;

  const currentUserId = user.id;
  const currentUserEmail = user.email?.toLowerCase();

  // 1. Propriétaire direct du bien
  if (
    property.agentId === currentUserId ||
    property.userId === currentUserId ||
    (property.agentId && property.agentId === user.agentId) ||
    (currentUserEmail && property.contactEmail?.toLowerCase() === currentUserEmail) ||
    (currentUserEmail && property.agentId?.toLowerCase() === currentUserEmail)
  ) {
    return true;
  }

  // 2. Bien explicitement attribué à cet agent
  if (
    property.assignedAgentId &&
    (property.assignedAgentId === currentUserId || property.assignedAgentId === user.agentId)
  ) {
    return true;
  }

  // 3. Responsable ou membre d'agence avec droits
  const userAgencyId = user.agencyId || (user.role === 'agency' ? user.id : undefined);
  const userAgencyName = user.agencyName?.toLowerCase();
  const propAgencyId = property.agencyId;
  const propAgencyName = property.agencyName?.toLowerCase();

  const isSameAgency =
    (userAgencyId && propAgencyId && userAgencyId === propAgencyId) ||
    (userAgencyName && propAgencyName && userAgencyName === propAgencyName);

  if (isSameAgency) {
    // Si c'est le gérant de l'agence ou propriétaire de l'agence
    if (user.role === 'agency' || user.agencyRole === 'agency_owner' || user.agencyRole === 'agency_manager') {
      return true;
    }
  }

  return false;
}

/**
 * Crée une entrée d'audit pour l'historique des statuts
 */
export function createStatusHistoryEntry(
  fromStatus: string,
  toStatus: ListingLifecycleStatus,
  user: User | null,
  note?: string
): PropertyStatusHistoryEntry {
  return {
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    fromStatus: fromStatus || 'NONE',
    toStatus,
    changedByUserId: user?.id || 'sys_user',
    changedByName: user?.name || 'Utilisateur Kinimmo',
    changedAt: new Date().toISOString(),
    note: note || `Statut mis à jour vers ${LISTING_STATUS_CONFIG[toStatus]?.label || toStatus}`
  };
}
