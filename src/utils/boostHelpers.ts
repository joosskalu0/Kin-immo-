export const DEFAULT_FEATURED_SLOTS_LIMIT = 6;

export type BoostVisibleLabel = 'À la une' | 'Sponsorisé';

export type BoostComputedStatus =
  | 'pending'
  | 'awaiting_validation'
  | 'active'
  | 'expired'
  | 'suspended'
  | 'rejected'
  | 'refunded';

export function parseFeaturedSlotsLimit(rawValue: unknown): number {
  const num = Number(rawValue);
  if (!Number.isFinite(num) || num < 1) return DEFAULT_FEATURED_SLOTS_LIMIT;
  return Math.min(50, Math.max(1, Math.round(num)));
}

/**
 * Vérifie strictement qu'une annonce est publiée, disponible et non suspendue/masquée.
 * Une annonce suspendue, masquée, brouillon, archivée, vendue, louée ou suspecte
 * n'est jamais affichée publiquement, même si un boost existe en base.
 */
export function isPropertyPubliclyVisible(prop: any): boolean {
  if (!prop || typeof prop !== 'object') return false;
  if (prop.published === false) return false;
  if (prop.softHiddenByPlan === true) return false;
  if (prop.fraudStatus === 'suspect') return false;
  if (prop.isSuspended === true || prop.suspended === true) return false;

  const lifecycle = String(prop.listingStatus || '').toUpperCase();
  if (
    lifecycle === 'DRAFT' ||
    lifecycle === 'ARCHIVED' ||
    lifecycle === 'PENDING_REVIEW' ||
    lifecycle === 'SOLD' ||
    lifecycle === 'RENTED' ||
    lifecycle === 'SUSPENDED' ||
    lifecycle === 'HIDDEN'
  ) {
    return false;
  }

  const rawStatus = String(prop.status || '').toLowerCase();
  if (
    rawStatus === 'sold' ||
    rawStatus === 'rented' ||
    rawStatus === 'archived' ||
    rawStatus === 'draft' ||
    rawStatus === 'suspended' ||
    rawStatus === 'hidden'
  ) {
    return false;
  }

  return true;
}

/**
 * Vérifie à la lecture si une fenêtre [startsAt, expiresAt) est active à l'instant nowMs.
 */
export function isBoostWindowActive(
  startsAt?: string | null,
  expiresAt?: string | null,
  nowMs = Date.now()
): boolean {
  if (startsAt) {
    const startMs = Date.parse(startsAt);
    if (!Number.isNaN(startMs) && nowMs < startMs) {
      return false;
    }
  }
  if (!expiresAt) return false;
  const expMs = Date.parse(expiresAt);
  if (Number.isNaN(expMs)) return false;
  return nowMs < expMs;
}

/**
 * Détermine l'étiquette visible principale (« À la une » ou « Sponsorisé »)
 * selon le type de boost et le texte paramétré par l'administrateur.
 */
export function resolveBoostPrimaryLabel(
  boostType?: string | null,
  badgeText?: string | null,
  explicitLabel?: string | null
): BoostVisibleLabel {
  if (explicitLabel === 'À la une' || explicitLabel === 'Sponsorisé') {
    return explicitLabel;
  }
  const typeLower = String(boostType || '').toLowerCase();
  const badgeLower = String(badgeText || '').toLowerCase();

  if (badgeLower.includes('sponsoris')) return 'Sponsorisé';
  if (badgeLower.includes('une') || badgeLower.includes('vedette') || badgeLower.includes('premium')) {
    return 'À la une';
  }
  if (
    typeLower === 'sponsorise' ||
    typeLower === 'sponsored' ||
    typeLower === 'social_blast' ||
    typeLower === 'refresh'
  ) {
    return 'Sponsorisé';
  }
  return 'À la une';
}

export interface ActiveBoostDisplay {
  isActive: boolean;
  primaryLabel: BoostVisibleLabel | null;
  isUrgent: boolean;
  isPremium: boolean;
  startsAt?: string;
  expiresAt?: string;
}

/**
 * Évalue à la lecture l'état effectif du boost d'un bien.
 * - Retourne inactif si l'annonce est suspendue/masquée/non publique.
 * - Retourne inactif dès que boostExpiresAt <= nowMs (aucun cron requis).
 */
export function getActiveBoostDisplay(prop: any, nowMs = Date.now()): ActiveBoostDisplay {
  if (!isPropertyPubliclyVisible(prop) || prop?.boostSuspended === true) {
    return {
      isActive: false,
      primaryLabel: null,
      isUrgent: false,
      isPremium: false,
      startsAt: prop?.boostStartedAt,
      expiresAt: prop?.boostExpiresAt,
    };
  }

  const labels = Array.isArray(prop.labels) ? prop.labels : [];
  const hasAnyFlag = Boolean(
    prop.featured ||
      prop.isPremium ||
      prop.isUrgent ||
      prop.isSponsored ||
      prop.boostLabel ||
      prop.listingTier === 'featured' ||
      prop.listingTier === 'premium' ||
      labels.includes('featured')
  );

  if (!hasAnyFlag && !prop.boostExpiresAt) {
    return {
      isActive: false,
      primaryLabel: null,
      isUrgent: false,
      isPremium: false,
    };
  }

  if (prop.boostExpiresAt) {
    if (!isBoostWindowActive(prop.boostStartedAt, prop.boostExpiresAt, nowMs)) {
      return {
        isActive: false,
        primaryLabel: null,
        isUrgent: false,
        isPremium: false,
        startsAt: prop.boostStartedAt,
        expiresAt: prop.boostExpiresAt,
      };
    }
  } else if (prop.boostStartedAt) {
    const startMs = Date.parse(prop.boostStartedAt);
    if (!Number.isNaN(startMs) && nowMs < startMs) {
      return {
        isActive: false,
        primaryLabel: null,
        isUrgent: false,
        isPremium: false,
        startsAt: prop.boostStartedAt,
      };
    }
  }

  const isUrgent = Boolean(prop.isUrgent || prop.boostType === 'urgent');
  const isPremium = Boolean(prop.isPremium || prop.listingTier === 'premium');
  const hasPrimary = Boolean(
    prop.featured ||
      isPremium ||
      prop.isSponsored ||
      prop.listingTier === 'featured' ||
      labels.includes('featured') ||
      prop.boostLabel === 'À la une' ||
      prop.boostLabel === 'Sponsorisé' ||
      (prop.boostType && prop.boostType !== 'urgent')
  );

  const primaryLabel = hasPrimary
    ? resolveBoostPrimaryLabel(
        prop.boostType || prop.listingTier,
        prop.boostBadgeText,
        prop.boostLabel
      )
    : null;

  return {
    isActive: hasPrimary || isUrgent,
    primaryLabel,
    isUrgent,
    isPremium,
    startsAt: prop.boostStartedAt,
    expiresAt: prop.boostExpiresAt,
  };
}

/**
 * Sélectionne au maximum `featuredSlotsLimit` biens visibles et activement boostés
 * pour les emplacements en tête de liste.
 */
export function getTopFeaturedProperties<T extends Record<string, any>>(
  properties: T[],
  featuredSlotsLimit = DEFAULT_FEATURED_SLOTS_LIMIT,
  nowMs = Date.now()
): T[] {
  const limit = parseFeaturedSlotsLimit(featuredSlotsLimit);
  const candidates = (properties || []).filter((prop) => getActiveBoostDisplay(prop, nowMs).isActive);

  const ranked = [...candidates].sort((a, b) => {
    const da = getActiveBoostDisplay(a, nowMs);
    const db = getActiveBoostDisplay(b, nowMs);
    const scoreA = (da.isPremium ? 4 : da.primaryLabel === 'À la une' ? 3 : da.primaryLabel === 'Sponsorisé' ? 2 : 1);
    const scoreB = (db.isPremium ? 4 : db.primaryLabel === 'À la une' ? 3 : db.primaryLabel === 'Sponsorisé' ? 2 : 1);
    if (scoreB !== scoreA) return scoreB - scoreA;
    const bumpA = Date.parse(a.refreshBumpAt || a.boostStartedAt || a.updatedAt || a.createdAt || '') || 0;
    const bumpB = Date.parse(b.refreshBumpAt || b.boostStartedAt || b.updatedAt || b.createdAt || '') || 0;
    return bumpB - bumpA;
  });

  return ranked.slice(0, limit);
}

/**
 * Place jusqu'à `featuredSlotsLimit` biens boostés actifs en tête,
 * puis conserve l'ordre du catalogue pour les autres biens.
 */
export function sortPropertiesWithTopSlots<T extends Record<string, any>>(
  properties: T[],
  featuredSlotsLimit = DEFAULT_FEATURED_SLOTS_LIMIT,
  nowMs = Date.now()
): T[] {
  const topList = getTopFeaturedProperties(properties, featuredSlotsLimit, nowMs);
  if (topList.length === 0) return properties;
  const topIds = new Set(topList.map((p) => p.id));
  const rest = properties.filter((p) => !topIds.has(p.id));
  return [...topList, ...rest];
}

/**
 * Évalue à la lecture l'état d'une facture / demande de boost.
 */
export function evaluateBoostRequestStatus(
  inv: any,
  prop?: any,
  nowMs = Date.now()
): BoostComputedStatus {
  const raw = String(inv?.status || 'pending').toLowerCase();
  if (raw === 'refunded') return 'refunded';
  if (raw === 'rejected' || raw === 'failed' || raw === 'cancelled') return 'rejected';
  if (raw === 'suspended') return 'suspended';
  if (raw === 'awaiting_validation') return 'awaiting_validation';
  if (raw === 'pending' || raw === 'pending_validation') return 'pending';

  if (raw === 'paid' || raw === 'active') {
    const startsAt = inv?.starts_at || inv?.startsAt || prop?.boostStartedAt;
    const expiresAt = inv?.expires_at || inv?.expiresAt || prop?.boostExpiresAt;
    if (expiresAt) {
      return isBoostWindowActive(startsAt, expiresAt, nowMs) ? 'active' : 'expired';
    }
    return 'active';
  }

  return 'pending';
}

export function computeBoostMetrics(
  inv: any,
  prop?: any,
  analyticsRow?: { views?: number; whatsapp?: number; phone?: number } | null,
  computedStatus?: BoostComputedStatus
) {
  const viewsBefore = Number(inv?.views_before ?? inv?.viewsBefore ?? 0);
  const contactsBefore = Number(inv?.contacts_before ?? inv?.contactsBefore ?? 0);

  const liveViews = Number(analyticsRow?.views ?? prop?.viewsCount ?? viewsBefore);
  const liveWhatsapp = Number(analyticsRow?.whatsapp ?? prop?.whatsappClicks ?? 0);
  const livePhone = Number(analyticsRow?.phone ?? prop?.phoneCalls ?? 0);
  const liveLeads = Number(prop?.leadsCount ?? 0);
  const liveContacts = liveWhatsapp + livePhone + liveLeads;

  const status = computedStatus || evaluateBoostRequestStatus(inv, prop);
  const hasActivated = status === 'active' || status === 'expired' || status === 'suspended' || status === 'refunded';

  if (!hasActivated) {
    return {
      viewsBefore,
      contactsBefore,
      viewsDuring: 0,
      contactsDuring: 0,
    };
  }

  const viewsDuring =
    inv?.views_during_acc !== undefined && inv?.views_during_acc !== null
      ? Math.max(0, Number(inv.views_during_acc))
      : Math.max(0, liveViews - viewsBefore);

  const contactsDuring =
    inv?.contacts_during_acc !== undefined && inv?.contacts_during_acc !== null
      ? Math.max(0, Number(inv.contacts_during_acc))
      : Math.max(0, liveContacts - contactsBefore);

  return {
    viewsBefore,
    contactsBefore,
    viewsDuring,
    contactsDuring,
  };
}
