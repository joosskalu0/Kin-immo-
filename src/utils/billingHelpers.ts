import {
  Agency,
  Agent,
  Invoice,
  PaymentMethodConfig,
  PlanAudience,
  Property,
  PropertyVideo,
  SubscriptionPlan,
  User,
} from '../types';

export const AUDIENCE_LABELS: Record<PlanAudience, string> = {
  grand_public: 'Grand Public',
  agence: 'Agences Immobilières',
  promoteur: 'Promoteurs Immobiliers',
  entreprise: 'Entreprises & Grands Comptes',
};

export const LAUNCH_ACTIVE_AUDIENCES: PlanAudience[] = ['grand_public', 'agence'];

export function mapCategoryToAudience(
  planOrCategory: Partial<SubscriptionPlan> | string | undefined,
  planId?: string
): PlanAudience {
  if (planOrCategory && typeof planOrCategory === 'object') {
    if (
      planOrCategory.audience === 'grand_public' ||
      planOrCategory.audience === 'agence' ||
      planOrCategory.audience === 'promoteur' ||
      planOrCategory.audience === 'entreprise'
    ) {
      return planOrCategory.audience;
    }
    const cat = String(planOrCategory.category || '').toLowerCase();
    if (cat === 'agency' || cat === 'agence') return 'agence';
    if (cat === 'promoter' || cat === 'promoteur') return 'promoteur';
    if (cat === 'enterprise' || cat === 'entreprise') return 'entreprise';
    const pid = String(planOrCategory.id || '').toLowerCase();
    if (pid.includes('agency') || pid.includes('agence')) return 'agence';
    if (pid.includes('promoter') || pid.includes('promoteur')) return 'promoteur';
    if (pid.includes('enterprise') || pid.includes('entreprise')) return 'entreprise';
    return 'grand_public';
  }
  const cat = String(planOrCategory || '').toLowerCase();
  const pid = String(planId || '').toLowerCase();
  if (cat === 'agency' || cat === 'agence' || pid.includes('agency') || pid.includes('agence')) return 'agence';
  if (cat === 'promoter' || cat === 'promoteur' || pid.includes('promoter') || pid.includes('promoteur')) return 'promoteur';
  if (cat === 'enterprise' || cat === 'entreprise' || pid.includes('enterprise') || pid.includes('entreprise')) return 'entreprise';
  return 'grand_public';
}

export function isLaunchAudience(audience?: PlanAudience): boolean {
  return audience === 'grand_public' || audience === 'agence';
}

export function normalizePlan(raw: any, exchangeRate: number = 2850): SubscriptionPlan {
  const audience = mapCategoryToAudience(raw);
  const priceMonthly = Number(raw.priceMonthly ?? raw.price_usd ?? raw.price ?? 0);
  const priceMonthlyCDF = Number(
    raw.priceMonthlyCDF ?? raw.price_cdf ?? Math.round(priceMonthly * exchangeRate)
  );
  const priceYearly = Number(
    raw.priceYearly ?? raw.price_yearly_usd ?? Math.round(priceMonthly * 10)
  );
  const priceYearlyCDF = Number(
    raw.priceYearlyCDF ?? raw.price_yearly_cdf ?? Math.round(priceYearly * exchangeRate)
  );
  const maxListings = Number(raw.maxListings ?? raw.max_listings ?? 3);
  const maxPhotos = Number(raw.maxPhotos ?? raw.max_photos ?? (priceMonthly === 0 ? 5 : audience === 'agence' ? 20 : 12));
  const maxVideos = Number(raw.maxVideos ?? raw.max_videos ?? (priceMonthly === 0 ? 0 : audience === 'agence' ? 15 : 3));
  const includedBoosts = Number(
    raw.includedBoosts ?? raw.included_boosts ?? raw.featuredListings ?? raw.max_featured_listings ?? 0
  );
  const agentAccounts = Number(
    raw.agentAccounts ?? raw.max_team_members ?? (audience === 'agence' ? 10 : audience === 'promoteur' ? 25 : audience === 'entreprise' ? 50 : 1)
  );
  const trialDays = Number(raw.trialDays ?? raw.trial_days ?? 0);

  const isActive =
    raw.isActive !== undefined
      ? Boolean(raw.isActive)
      : raw.is_active !== undefined
      ? Boolean(raw.is_active)
      : isLaunchAudience(audience);

  const category: SubscriptionPlan['category'] =
    audience === 'agence'
      ? 'agency'
      : audience === 'promoteur'
      ? 'promoter'
      : audience === 'entreprise'
      ? 'enterprise'
      : 'individual';

  return {
    ...raw,
    id: String(raw.id),
    name: String(raw.name || 'Formule Kinimmo'),
    description: raw.description || '',
    audience,
    category,
    badge: raw.badge || (priceMonthly === 0 ? 'Gratuit' : AUDIENCE_LABELS[audience]),
    priceMonthly,
    priceMonthlyCDF,
    priceYearly,
    priceYearlyCDF,
    price_usd: priceMonthly,
    price_cdf: priceMonthlyCDF,
    price_yearly_usd: priceYearly,
    price_yearly_cdf: priceYearlyCDF,
    currency: raw.currency || 'USD',
    billingPeriod: raw.billingPeriod || (raw.billing_period === 'yearly' ? 'year' : 'month'),
    billing_period: raw.billing_period || 'monthly',
    trialDays,
    trial_days: trialDays,
    maxListings,
    max_listings: maxListings,
    maxPhotos,
    max_photos: maxPhotos,
    maxVideos,
    max_videos: maxVideos,
    includedBoosts,
    included_boosts: includedBoosts,
    featuredListings: includedBoosts,
    max_featured_listings: includedBoosts,
    agentAccounts,
    max_team_members: agentAccounts,
    features: Array.isArray(raw.features) ? raw.features : [],
    recommended: Boolean(raw.recommended),
    isActive,
    is_active: isActive,
    hasVerifiedBadge: Boolean(raw.hasVerifiedBadge ?? raw.has_verified_badge ?? priceMonthly > 0),
    has_verified_badge: Boolean(raw.hasVerifiedBadge ?? raw.has_verified_badge ?? priceMonthly > 0),
    hasCrmLeads: Boolean(raw.hasCrmLeads ?? raw.has_crm_leads ?? priceMonthly > 0),
    has_crm_leads: Boolean(raw.hasCrmLeads ?? raw.has_crm_leads ?? priceMonthly > 0),
    hasPrioritySupport: Boolean(raw.hasPrioritySupport ?? raw.has_priority_support ?? audience !== 'grand_public'),
    has_priority_support: Boolean(raw.hasPrioritySupport ?? raw.has_priority_support ?? audience !== 'grand_public'),
  };
}

export function getDefaultPlans(exchangeRate: number = 2850): SubscriptionPlan[] {
  return [
    {
      id: 'starter',
      name: 'Gratuit Particulier',
      description: 'Publiez vos premiers biens à Kinshasa gratuitement sans engagement.',
      audience: 'grand_public',
      category: 'individual',
      badge: 'Gratuit',
      priceMonthly: 0,
      priceMonthlyCDF: 0,
      priceYearly: 0,
      priceYearlyCDF: 0,
      currency: 'USD',
      billingPeriod: 'month',
      trialDays: 0,
      maxListings: 3,
      maxPhotos: 5,
      maxVideos: 0,
      includedBoosts: 0,
      featuredListings: 0,
      agentAccounts: 1,
      recommended: false,
      isActive: true,
      hasVerifiedBadge: false,
      hasCrmLeads: false,
      hasPrioritySupport: false,
      features: [
        'Jusqu’à 3 annonces actives simultanées',
        '5 photos HD par annonce',
        'Contacts directs téléphone et WhatsApp',
      ],
    },
    {
      id: 'pro',
      name: 'Agent Pro',
      description: 'Pour particuliers bailleurs et courtiers indépendants souhaitant accélérer leurs ventes.',
      audience: 'grand_public',
      category: 'individual',
      badge: 'Populaire',
      priceMonthly: 29,
      priceMonthlyCDF: Math.round(29 * exchangeRate),
      priceYearly: 290,
      priceYearlyCDF: Math.round(290 * exchangeRate),
      currency: 'USD',
      billingPeriod: 'month',
      trialDays: 14,
      maxListings: 25,
      maxPhotos: 12,
      maxVideos: 3,
      includedBoosts: 3,
      featuredListings: 3,
      agentAccounts: 1,
      recommended: true,
      isActive: true,
      hasVerifiedBadge: true,
      hasCrmLeads: true,
      hasPrioritySupport: false,
      features: [
        'Jusqu’à 25 annonces actives',
        '12 photos et 3 vidéos immersives',
        '3 boosts mise en avant inclus',
        'Badge profil vérifié & leads Conciergerie',
      ],
    },
    {
      id: 'agency',
      name: 'Agence Partenaire',
      description: 'Gestion multi-collaborateurs, vitrine agence certifiée et visibilité prioritaire.',
      audience: 'agence',
      category: 'agency',
      badge: 'Agence Agréée',
      priceMonthly: 79,
      priceMonthlyCDF: Math.round(79 * exchangeRate),
      priceYearly: 790,
      priceYearlyCDF: Math.round(790 * exchangeRate),
      currency: 'USD',
      billingPeriod: 'month',
      trialDays: 14,
      maxListings: 100,
      maxPhotos: 20,
      maxVideos: 15,
      includedBoosts: 10,
      featuredListings: 10,
      agentAccounts: 10,
      recommended: true,
      isActive: true,
      hasVerifiedBadge: true,
      hasCrmLeads: true,
      hasPrioritySupport: true,
      features: [
        'Jusqu’à 100 annonces actives',
        '20 photos par bien & 15 vidéos',
        '10 boosts inclus + vitrine dédiée',
        'Jusqu’à 10 membres d’équipe',
      ],
    },
    {
      id: 'promoter_vip',
      name: 'Promoteur Immobilier (Brouillon)',
      description: 'Audience Promoteur réservée aux programmes neufs et lotissements (activation post-lancement).',
      audience: 'promoteur',
      category: 'promoter',
      badge: 'Brouillon Admin',
      priceMonthly: 149,
      priceMonthlyCDF: Math.round(149 * exchangeRate),
      priceYearly: 1490,
      priceYearlyCDF: Math.round(1490 * exchangeRate),
      currency: 'USD',
      billingPeriod: 'month',
      trialDays: 7,
      maxListings: 300,
      maxPhotos: 30,
      maxVideos: 40,
      includedBoosts: 25,
      featuredListings: 25,
      agentAccounts: 25,
      recommended: false,
      isActive: false,
      hasVerifiedBadge: true,
      hasCrmLeads: true,
      hasPrioritySupport: true,
      features: [
        '300 annonces et lots de projets neufs',
        '30 photos par bien & 40 vidéos',
        '25 boosts inclus & 25 collaborateurs',
      ],
    },
    {
      id: 'enterprise',
      name: 'Entreprise & Institutionnel (Brouillon)',
      description: 'Audience Entreprise pour foncières et groupes multi-agences (activation post-lancement).',
      audience: 'entreprise',
      category: 'enterprise',
      badge: 'Brouillon Admin',
      priceMonthly: 249,
      priceMonthlyCDF: Math.round(249 * exchangeRate),
      priceYearly: 2490,
      priceYearlyCDF: Math.round(2490 * exchangeRate),
      currency: 'USD',
      billingPeriod: 'month',
      trialDays: 14,
      maxListings: 500,
      maxPhotos: 40,
      maxVideos: 100,
      includedBoosts: 50,
      featuredListings: 50,
      agentAccounts: 50,
      recommended: false,
      isActive: false,
      hasVerifiedBadge: true,
      hasCrmLeads: true,
      hasPrioritySupport: true,
      features: [
        'Annonces illimitées (plafond 500+)',
        '40 photos par bien & 100 vidéos',
        '50 boosts inclus & 50 membres d’équipe',
      ],
    },
  ].map((p) => normalizePlan(p, exchangeRate));
}

export const DEFAULT_PAYMENT_METHODS_LIST: PaymentMethodConfig[] = [
  {
    id: 'pm_mpesa',
    provider: 'mpesa',
    account_name: 'KINIMMO SARL - Vodacom M-Pesa',
    account_number: '+243 810 000 000',
    merchant_code: '123456',
    instructions: 'Envoyez le montant exact via M-Pesa puis indiquez la référence SMS et joignez une capture.',
    is_active: true,
    display_order: 1,
  },
  {
    id: 'pm_airtel',
    provider: 'airtel',
    account_name: 'KINIMMO SARL - Airtel Money RDC',
    account_number: '+243 990 000 000',
    merchant_code: '789012',
    instructions: 'Effectuez le transfert Airtel Money RDC puis saisissez l’ID de transaction reçu par SMS.',
    is_active: true,
    display_order: 2,
  },
  {
    id: 'pm_orange',
    provider: 'orange',
    account_name: 'KINIMMO SARL - Orange Money Kinshasa',
    account_number: '+243 84 529 4616',
    merchant_code: '345678',
    instructions: 'Transférez le montant via Orange Money en mentionnant votre N° de facture, puis soumettez la référence.',
    is_active: true,
    display_order: 3,
  },
];

export interface AccountBillingSummary {
  plan: SubscriptionPlan;
  activePlan: SubscriptionPlan;
  freePlan: SubscriptionPlan;
  effectivePlan: SubscriptionPlan;
  subscriptionStatus: 'Active' | 'Trial' | 'ExpiringSoon' | 'Expired';
  statusLabel: string;
  cycle: 'monthly' | 'yearly' | 'trial';
  expiresAt?: string;
  daysRemaining: number | null;
  isTrial: boolean;
  isTrialActive: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  softHiddenCount: number;
  includedBoostsRemaining: number;
  limits: {
    maxListings: number;
    maxPhotos: number;
    maxVideos: number;
    includedBoosts: number;
    maxTeamMembers: number;
  };
  usage: {
    activeListings: number;
    totalListings: number;
    softHiddenListings: number;
    maxPhotosPerListingUsed: number;
    videosCount: number;
    videosUsed: number;
    teamMembersCount: number;
    teamMembers: number;
    boostsRemaining: number;
  };
}

export function getFreePlan(plans: SubscriptionPlan[]): SubscriptionPlan {
  return (
    plans.find((p) => p.id === 'starter' || Number(p.priceMonthly) === 0) ||
    getDefaultPlans()[0]
  );
}

export function matchesAccountOwner(
  p: Property,
  targetIdOrEmail: string,
  agencyName?: string
): boolean {
  const key = String(targetIdOrEmail || '').trim().toLowerCase();
  if (!key) return false;
  if (p.agentId?.toLowerCase() === key || p.userId?.toLowerCase() === key || p.agencyId?.toLowerCase() === key) {
    return true;
  }
  if (p.contactEmail?.toLowerCase() === key) return true;
  if (agencyName && p.agencyName?.toLowerCase() === agencyName.toLowerCase()) return true;
  return false;
}

export function getUserOwnedProperties(
  properties: Property[],
  user: Partial<User> | null,
  agency?: Partial<Agency> | null
): Property[] {
  if (!user && !agency) return [];
  const emailLower = (agency?.email || user?.email || '').toLowerCase();
  return properties.filter((p) => {
    if (user?.id && (p.agentId === user.id || p.userId === user.id)) return true;
    if (user?.agentId && p.agentId === user.agentId) return true;
    if (emailLower && p.contactEmail?.toLowerCase() === emailLower) return true;
    if (agency?.id && p.agencyId === agency.id) return true;
    if (agency?.name && p.agencyName && p.agencyName.toLowerCase() === agency.name.toLowerCase()) return true;
    if (user?.agencyId && p.agencyId === user.agencyId) return true;
    if (user?.agencyName && p.agencyName && p.agencyName.toLowerCase() === user.agencyName.toLowerCase()) return true;
    return false;
  });
}

export function resolveAccountBillingSummary(params: {
  user: Partial<User> | null;
  agency?: Partial<Agency> | null;
  plans: SubscriptionPlan[];
  properties: Property[];
  propertyVideos?: PropertyVideo[];
  agents?: Agent[];
  collaboratorsCount?: number;
}): AccountBillingSummary {
  const { user, agency, plans, properties, propertyVideos = [], agents = [], collaboratorsCount } = params;
  const freePlan = getFreePlan(plans);
  const rawPlanId = agency?.planId || agency?.subscriptionPlan || user?.planId || user?.subscriptionPlan || freePlan.id;
  const targetPlan = plans.find((p) => p.id === rawPlanId) || freePlan;

  const expiresAt = agency?.subscriptionExpiresAt || user?.subscriptionExpiresAt || user?.planExpiry || user?.trialEndsAt;
  const now = Date.now();
  let daysRemaining: number | null = null;
  if (expiresAt) {
    const expiryMs = new Date(expiresAt).getTime();
    if (!Number.isNaN(expiryMs)) {
      daysRemaining = Math.ceil((expiryMs - now) / 86400000);
    }
  }

  const isTrial = Boolean(
    user?.billingCycle === 'trial' ||
      agency?.billingCycle === 'trial' ||
      (user?.trialEndsAt && new Date(user.trialEndsAt).getTime() > now) ||
      (agency?.trialEndsAt && new Date(agency.trialEndsAt).getTime() > now)
  );

  const explicitExpired =
    agency?.subscriptionStatus === 'Expired' || user?.subscriptionStatus === 'Expired';
  const dateExpired = daysRemaining !== null && daysRemaining <= 0 && Number(targetPlan.priceMonthly) > 0;
  const isExpired = explicitExpired || dateExpired;
  const isExpiringSoon = !isExpired && Number(targetPlan.priceMonthly) > 0 && daysRemaining !== null && daysRemaining <= 7;

  const effectivePlan = isExpired ? freePlan : targetPlan;
  const cycle: 'monthly' | 'yearly' | 'trial' =
    isTrial
      ? 'trial'
      : agency?.billingCycle === 'yearly' || user?.billingCycle === 'yearly'
      ? 'yearly'
      : 'monthly';

  const ownedProps = getUserOwnedProperties(properties, user, agency);
  const activeListings = ownedProps.filter((p) => p.published !== false && !p.softHiddenByPlan).length;
  const softHiddenListings = ownedProps.filter((p) => Boolean(p.softHiddenByPlan)).length;
  const maxPhotosPerListingUsed = ownedProps.reduce(
    (max, p) => Math.max(max, Array.isArray(p.images) ? p.images.length : 0),
    0
  );

  const ownedPropIds = new Set(ownedProps.map((p) => p.id));
  const videosCount = propertyVideos.filter(
    (v) => (user?.id && v.userId === user.id) || ownedPropIds.has(v.propertyId)
  ).length;

  const teamMembersCount =
    collaboratorsCount !== undefined
      ? Math.max(1, collaboratorsCount)
      : agency?.id
      ? Math.max(1, agents.filter((a) => a.agencyId === agency.id).length || agency.agentsCount || 1)
      : 1;

  const subscriptionStatus: AccountBillingSummary['subscriptionStatus'] = isExpired
    ? 'Expired'
    : isTrial
    ? 'Trial'
    : isExpiringSoon
    ? 'ExpiringSoon'
    : 'Active';

  const statusLabel = isExpired
    ? 'Expiré (Rétrogradé)'
    : isTrial
    ? 'Essai gratuit actif'
    : isExpiringSoon
    ? 'Échéance proche'
    : 'Actif';

  const includedBoostsRemaining =
    user?.includedBoostsRemaining ??
    agency?.includedBoostsRemaining ??
    Number(effectivePlan.includedBoosts ?? effectivePlan.featuredListings ?? 0);

  return {
    plan: effectivePlan,
    activePlan: targetPlan,
    freePlan,
    effectivePlan,
    subscriptionStatus,
    statusLabel,
    cycle,
    expiresAt,
    daysRemaining,
    isTrial,
    isTrialActive: isTrial,
    isExpired,
    isExpiringSoon,
    softHiddenCount: softHiddenListings,
    includedBoostsRemaining,
    limits: {
      maxListings: Number(effectivePlan.maxListings ?? 3),
      maxPhotos: Number(effectivePlan.maxPhotos ?? 5),
      maxVideos: Number(effectivePlan.maxVideos ?? 0),
      includedBoosts: Number(effectivePlan.includedBoosts ?? effectivePlan.featuredListings ?? 0),
      maxTeamMembers: Number(effectivePlan.agentAccounts ?? 1),
    },
    usage: {
      activeListings,
      totalListings: ownedProps.length,
      softHiddenListings,
      maxPhotosPerListingUsed,
      videosCount,
      videosUsed: videosCount,
      teamMembersCount,
      teamMembers: teamMembersCount,
      boostsRemaining: includedBoostsRemaining,
    },
  };
}

/**
 * Rétrogradation douce : garde les N annonces publiées les plus récentes actives
 * dans la limite du plan gratuit, et masque l'excédent sans jamais supprimer.
 */
export function enforceSoftDowngradeOnProperties(
  properties: Property[],
  matchOwnerOrTarget: ((p: Property) => boolean) | string,
  freeMaxListings: number = 3
): { updatedProperties: Property[]; hiddenCount: number; hiddenIds: string[] } {
  const matchOwner =
    typeof matchOwnerOrTarget === 'function'
      ? matchOwnerOrTarget
      : (p: Property) => matchesAccountOwner(p, matchOwnerOrTarget);

  const ownedPublished = properties
    .filter((p) => matchOwner(p) && p.published !== false && !p.softHiddenByPlan)
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA; // Plus récentes en premier
    });

  if (ownedPublished.length <= freeMaxListings) {
    return { updatedProperties: properties, hiddenCount: 0, hiddenIds: [] };
  }

  const keepIds = new Set(ownedPublished.slice(0, freeMaxListings).map((p) => p.id));
  const nowIso = new Date().toISOString();
  const hiddenIds: string[] = [];

  const updatedProperties = properties.map((p) => {
    if (matchOwner(p) && p.published !== false && !keepIds.has(p.id)) {
      hiddenIds.push(p.id);
      return {
        ...p,
        published: false,
        softHiddenByPlan: true,
        softHiddenAt: nowIso,
      };
    }
    return p;
  });

  return { updatedProperties, hiddenCount: hiddenIds.length, hiddenIds };
}

/**
 * Restaure automatiquement les annonces précédemment masquées par la rétrogradation douce
 * sans toucher aux annonces mises hors ligne manuellement par l'annonceur.
 */
export function restoreSoftHiddenProperties(
  properties: Property[],
  matchOwnerOrTarget: ((p: Property) => boolean) | string
): { updatedProperties: Property[]; restoredCount: number; restoredIds: string[] } {
  const matchOwner =
    typeof matchOwnerOrTarget === 'function'
      ? matchOwnerOrTarget
      : (p: Property) => matchesAccountOwner(p, matchOwnerOrTarget);

  const restoredIds: string[] = [];
  const updatedProperties = properties.map((p) => {
    if (matchOwner(p) && p.softHiddenByPlan) {
      restoredIds.push(p.id);
      return {
        ...p,
        published: true,
        softHiddenByPlan: false,
        softHiddenAt: undefined,
      };
    }
    return p;
  });
  return { updatedProperties, restoredCount: restoredIds.length, restoredIds };
}

export function compressProofImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Veuillez sélectionner une image (JPG, PNG, WebP).'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Fichier image vide.'));
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          const maxDim = 960;
          const scale = img.width > maxDim ? maxDim / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function buildWhatsAppReminderUrl(params: {
  recipientName: string;
  recipientPhone?: string;
  invoiceNumber?: string;
  planName?: string;
  amountUsd?: number;
  amountCdf?: number;
  dueDate?: string;
  paymentMethods?: PaymentMethodConfig[];
}): string {
  const cleanPhone = (params.recipientPhone || '+243845294616').replace(/[^0-9]/g, '') || '243845294616';
  const activePmLines = (params.paymentMethods || DEFAULT_PAYMENT_METHODS_LIST)
    .filter((pm) => pm.is_active !== false)
    .map((pm) => `• ${pm.account_name} : ${pm.account_number}${pm.merchant_code ? ` (Code ${pm.merchant_code})` : ''}`)
    .join('\n');

  const text =
    `Bonjour ${params.recipientName},\n\n` +
    `Rappel Kinimmo RDC concernant votre ${params.invoiceNumber ? `facture *${params.invoiceNumber}*` : `abonnement *${params.planName || 'Pro'}*`} :\n` +
    (params.amountUsd !== undefined
      ? `• Montant : *${params.amountUsd} USD* (~${Number(params.amountCdf || params.amountUsd * 2850).toLocaleString()} CDF)\n`
      : '') +
    (params.dueDate ? `• Échéance : ${new Date(params.dueDate).toLocaleDateString('fr-FR')}\n` : '') +
    `\nMoyens de paiement Mobile Money :\n${activePmLines}\n\n` +
    `Après paiement, veuillez saisir la référence de transaction dans votre espace Kinimmo pour validation et génération de votre reçu PDF.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export function buildEmailReminderMailto(params: {
  recipientName: string;
  recipientEmail: string;
  invoiceNumber?: string;
  planName?: string;
  amountUsd?: number;
  amountCdf?: number;
  dueDate?: string;
  paymentMethods?: PaymentMethodConfig[];
}): string {
  const subject = params.invoiceNumber
    ? `Rappel d'échéance Kinimmo - Facture ${params.invoiceNumber}`
    : `Rappel de renouvellement Kinimmo - ${params.planName || 'Abonnement'}`;

  const activePmLines = (params.paymentMethods || DEFAULT_PAYMENT_METHODS_LIST)
    .filter((pm) => pm.is_active !== false)
    .map((pm) => `- ${pm.account_name} : ${pm.account_number}${pm.merchant_code ? ` (Code marchand ${pm.merchant_code})` : ''}`)
    .join('\n');

  const body =
    `Bonjour ${params.recipientName},\n\n` +
    `Nous vous rappelons l'échéance de votre ${params.invoiceNumber ? `facture ${params.invoiceNumber}` : `abonnement ${params.planName || ''}`}.\n` +
    (params.amountUsd !== undefined
      ? `Montant : ${params.amountUsd} USD (~${Number(params.amountCdf || params.amountUsd * 2850).toLocaleString()} CDF)\n`
      : '') +
    (params.dueDate ? `Date d'échéance : ${new Date(params.dueDate).toLocaleDateString('fr-FR')}\n\n` : '\n') +
    `Instructions de paiement Mobile Money :\n${activePmLines}\n\n` +
    `Connectez-vous à votre espace Kinimmo pour saisir la référence de transaction et recevoir votre reçu PDF dès validation.\n\n` +
    `Cordialement,\nL'équipe Facturation Kinimmo RDC`;

  return `mailto:${encodeURIComponent(params.recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function formatInvoiceStatusLabel(status: Invoice['status']): string {
  switch (status) {
    case 'paid':
      return 'Payée & Validée';
    case 'awaiting_validation':
      return 'En attente de validation';
    case 'rejected':
    case 'failed':
      return 'Refusée';
    case 'refunded':
      return 'Remboursée';
    case 'overdue':
      return 'Échue / En retard';
    case 'cancelled':
      return 'Annulée';
    default:
      return 'À régler';
  }
}

export function formatInvoiceStatusInfo(status: Invoice['status']): {
  label: string;
  tone: 'emerald' | 'blue' | 'amber' | 'rose' | 'purple';
} {
  switch (status) {
    case 'paid':
      return { label: 'Payée & Validée', tone: 'emerald' };
    case 'awaiting_validation':
      return { label: 'En attente de validation', tone: 'blue' };
    case 'rejected':
    case 'failed':
      return { label: 'Refusée', tone: 'rose' };
    case 'refunded':
      return { label: 'Remboursée', tone: 'purple' };
    case 'overdue':
      return { label: 'Échue / En retard', tone: 'rose' };
    case 'cancelled':
      return { label: 'Annulée', tone: 'rose' };
    default:
      return { label: 'À régler', tone: 'amber' };
  }
}
