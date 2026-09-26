import { Property, ConciergeRequest, PropertyType } from '../types/index';

export interface MatchScoreBreakdown {
  locationScore: number;     // max 30
  typeScore: number;         // max 20
  budgetScore: number;       // max 25
  bedroomsScore: number;     // max 15
  bathroomsScore: number;    // max 10
  totalScore: number;        // max 100
  reasons: string[];         // Explications détaillées des points attribués
  isAvailable: boolean;      // Disponibilité
  isPublished: boolean;      // Statut de publication
}

export interface PropertyMatchResult {
  property: Property;
  score: number;             // 0 à 100
  breakdown: MatchScoreBreakdown;
}

/**
 * Normalisation de chaîne pour comparaisons tolérantes (casse, accents, espaces)
 */
function normalizeStr(val?: string | null): string {
  if (!val) return '';
  return val
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Mappage des équivalences de types de propriétés Kinshasa / Kinimmo
 */
const TYPE_EQUIVALENCES: Record<string, string[]> = {
  appartement: ['apartment', 'penthouse', 'appartement'],
  apartment: ['apartment', 'penthouse', 'appartement'],
  penthouse: ['penthouse', 'apartment', 'appartement'],
  villa: ['villa', 'house', 'maison'],
  maison: ['house', 'villa', 'maison'],
  house: ['house', 'villa', 'maison'],
  terrain: ['land', 'terrain'],
  land: ['land', 'terrain'],
  bureau: ['office', 'commercial', 'bureau'],
  office: ['office', 'commercial', 'bureau'],
  'local commercial': ['commercial', 'office', 'local commercial'],
  commercial: ['commercial', 'office', 'local commercial']
};

/**
 * Calcule le score de correspondance d'une propriété par rapport à une demande client (0 à 100 points)
 * 
 * Règles officielles de score :
 * - Correspondance localisation : +30
 * - Correspondance type : +20
 * - Budget compatible : +25
 * - Chambres : +15
 * - Salles de bain : +10
 */
export function calculatePropertyMatch(
  request: Partial<ConciergeRequest>,
  property: Property,
  exchangeRate: number = 2800
): MatchScoreBreakdown {
  const reasons: string[] = [];

  // 1. Disponibilité et Statut de publication
  // Une propriété n'est disponible que si elle n'est pas vendue/archivée et si elle est publiée
  const isPublished = property.published !== false;
  const isAvailable = property.status !== 'sold';

  // Si non publiée ou vendue, elle ne peut pas être proposée
  if (!isPublished || !isAvailable) {
    return {
      locationScore: 0,
      typeScore: 0,
      budgetScore: 0,
      bedroomsScore: 0,
      bathroomsScore: 0,
      totalScore: 0,
      reasons: [
        !isPublished ? 'Annonce non publiée' : 'Bien indisponible ou déjà vendu'
      ],
      isAvailable,
      isPublished
    };
  }

  // -------------------------------------------------------------
  // CRITÈRE 1 : Correspondance Localisation (+30 points)
  // -------------------------------------------------------------
  let locationScore = 0;
  const reqCommune = normalizeStr(request.commune || request.localisation?.commune);
  const reqQuartier = normalizeStr(request.quartier || request.localisation?.quartier);

  const propCommune = normalizeStr(property.commune);
  const propQuartier = normalizeStr(property.quartier);
  const propAddress = normalizeStr(property.address);
  const propRef = normalizeStr(property.referencePoint);

  if (reqCommune) {
    const isCommuneExact = propCommune.includes(reqCommune) || reqCommune.includes(propCommune);
    const isCommuneInAddress = propAddress.includes(reqCommune) || propRef.includes(reqCommune);

    if (isCommuneExact || isCommuneInAddress) {
      if (reqQuartier) {
        const isQuartierMatch =
          (propQuartier && (propQuartier.includes(reqQuartier) || reqQuartier.includes(propQuartier))) ||
          propAddress.includes(reqQuartier) ||
          propRef.includes(reqQuartier);

        if (isQuartierMatch) {
          locationScore = 30;
          reasons.push(`Commune (${property.commune}) et Quartier (${property.quartier || reqQuartier}) parfaitement alignés (+30)`);
        } else {
          locationScore = 24;
          reasons.push(`Commune exacte (${property.commune}) (+24)`);
        }
      } else {
        // Pas de quartier spécifié par le client -> La commune correspond à 100%
        locationScore = 30;
        reasons.push(`Commune conforme (${property.commune}) (+30)`);
      }
    } else if (reqQuartier && (propAddress.includes(reqQuartier) || propRef.includes(reqQuartier))) {
      locationScore = 15;
      reasons.push(`Quartier ou repère proche (${reqQuartier}) (+15)`);
    }
  }

  // -------------------------------------------------------------
  // CRITÈRE 2 : Correspondance Type (+20 points)
  // -------------------------------------------------------------
  let typeScore = 0;
  const rawReqType = normalizeStr(request.property_type || request.typeBien);
  const propType = normalizeStr(property.type);

  if (!rawReqType || rawReqType === 'autre') {
    typeScore = 10;
    reasons.push('Type de bien flexible (+10)');
  } else {
    const equivalents = TYPE_EQUIVALENCES[rawReqType] || [rawReqType];
    const isTypeMatch = equivalents.some(
      (eq) => propType === eq || propType.includes(eq) || eq.includes(propType)
    );

    if (isTypeMatch) {
      typeScore = 20;
      reasons.push(`Type de bien conforme (${property.type}) (+20)`);
    } else {
      // Tolérances connexes (ex: villa vs penthouse haut de standing)
      if (
        (rawReqType.includes('villa') && propType.includes('house')) ||
        (rawReqType.includes('appartement') && propType.includes('penthouse'))
      ) {
        typeScore = 18;
        reasons.push(`Type de bien très proche (${property.type}) (+18)`);
      }
    }
  }

  // -------------------------------------------------------------
  // CRITÈRE 3 : Budget compatible (+25 points)
  // -------------------------------------------------------------
  let budgetScore = 0;
  const rawBudgetMax = Number(request.budget_max || request.budget?.max || 0);
  const rawBudgetMin = Number(request.budget_min ?? request.budget?.min ?? 0);
  const reqCurrency = (request.currency || request.budget?.devise || 'USD').toUpperCase();
  const propCurrency = (property.currency || 'USD').toUpperCase();

  // Convertir le prix du bien dans la devise de la demande
  let normalizedPropertyPrice = property.price;
  if (reqCurrency === 'CDF' && propCurrency === 'USD') {
    normalizedPropertyPrice = property.price * exchangeRate;
  } else if (reqCurrency === 'USD' && propCurrency === 'CDF') {
    normalizedPropertyPrice = property.price / exchangeRate;
  }

  if (rawBudgetMax <= 0) {
    budgetScore = 25;
    reasons.push('Budget non restreint (+25)');
  } else {
    // Si le prix de la propriété est inférieur ou égal au budget maximum
    if (normalizedPropertyPrice <= rawBudgetMax) {
      if (rawBudgetMin > 0) {
        if (normalizedPropertyPrice >= rawBudgetMin) {
          budgetScore = 25;
          reasons.push(
            `Prix (${property.price.toLocaleString()} ${property.currency}) dans la fourchette client (+25)`
          );
        } else if (normalizedPropertyPrice >= rawBudgetMin * 0.75) {
          budgetScore = 22;
          reasons.push(
            `Prix (${property.price.toLocaleString()} ${property.currency}) très avantageux (+22)`
          );
        } else {
          budgetScore = 18;
          reasons.push(
            `Prix inférieur au budget minimum estimé (+18)`
          );
        }
      } else {
        budgetScore = 25;
        reasons.push(
          `Prix (${property.price.toLocaleString()} ${property.currency}) respecte le plafond de ${rawBudgetMax.toLocaleString()} ${reqCurrency} (+25)`
        );
      }
    } else if (normalizedPropertyPrice <= rawBudgetMax * 1.1) {
      // Tolérance de 10% (négociable sur le marché de Kinshasa)
      budgetScore = 14;
      reasons.push(
        `Prix légèrement supérieur (+10% max) négociable (+14)`
      );
    }
  }

  // -------------------------------------------------------------
  // CRITÈRE 4 : Chambres (+15 points)
  // -------------------------------------------------------------
  let bedroomsScore = 0;
  const reqBedrooms = request.bedrooms ?? request.caracteristiques?.chambres ?? null;
  const propBedrooms = property.bedrooms || 0;

  // Si la demande ne précise pas de chambres (ou terrain / bureau / local commercial)
  const isNonResidential = ['land', 'terrain', 'office', 'bureau', 'commercial', 'local commercial'].some(
    (t) => rawReqType.includes(t) || propType.includes(t)
  );

  if (reqBedrooms === null || reqBedrooms === undefined || reqBedrooms <= 0 || isNonResidential) {
    bedroomsScore = 15;
    reasons.push('Critère chambres non restrictif / adapté (+15)');
  } else {
    if (propBedrooms === reqBedrooms) {
      bedroomsScore = 15;
      reasons.push(`Nombre de chambres exact (${propBedrooms} ch.) (+15)`);
    } else if (propBedrooms > reqBedrooms) {
      bedroomsScore = 13;
      reasons.push(`Espace supplémentaire (${propBedrooms} ch. au lieu de ${reqBedrooms}) (+13)`);
    } else if (propBedrooms === reqBedrooms - 1) {
      bedroomsScore = 7;
      reasons.push(`1 chambre en moins (${propBedrooms} au lieu de ${reqBedrooms}) (+7)`);
    }
  }

  // -------------------------------------------------------------
  // CRITÈRE 5 : Salles de bain (+10 points)
  // -------------------------------------------------------------
  let bathroomsScore = 0;
  const reqBathrooms = request.bathrooms ?? request.caracteristiques?.sallesDeBain ?? null;
  const propBathrooms = property.bathrooms || 0;

  if (reqBathrooms === null || reqBathrooms === undefined || reqBathrooms <= 0 || isNonResidential) {
    bathroomsScore = 10;
    reasons.push('Critère salles de bain flexible (+10)');
  } else {
    if (propBathrooms === reqBathrooms) {
      bathroomsScore = 10;
      reasons.push(`Nombre de salles de bain exact (${propBathrooms} sdb) (+10)`);
    } else if (propBathrooms > reqBathrooms) {
      bathroomsScore = 10;
      reasons.push(`Salles d'eau généreuses (${propBathrooms} sdb) (+10)`);
    } else if (propBathrooms === reqBathrooms - 1) {
      bathroomsScore = 5;
      reasons.push(`1 salle de bain en moins (${propBathrooms} au lieu de ${reqBathrooms}) (+5)`);
    }
  }

  // -------------------------------------------------------------
  // TOTAL DU SCORE (MAXIMUM 100 POINTS)
  // -------------------------------------------------------------
  const totalScore = Math.min(
    100,
    Math.round(locationScore + typeScore + budgetScore + bedroomsScore + bathroomsScore)
  );

  return {
    locationScore,
    typeScore,
    budgetScore,
    bedroomsScore,
    bathroomsScore,
    totalScore,
    reasons,
    isAvailable,
    isPublished
  };
}

/**
 * Recherche et ordonne les biens correspondants aux critères d'une demande
 * Présente les biens les plus pertinents en premier (tri décroissant par score).
 */
export function findMatchingProperties(
  request: Partial<ConciergeRequest>,
  properties: Property[],
  options: {
    minScore?: number;
    limit?: number;
    exchangeRate?: number;
  } = {}
): PropertyMatchResult[] {
  const { minScore = 20, limit = 20, exchangeRate = 2800 } = options;

  const results: PropertyMatchResult[] = [];

  for (const property of properties) {
    const breakdown = calculatePropertyMatch(request, property, exchangeRate);

    // Filtrer par le score minimum requis et la disponibilité
    if (breakdown.totalScore >= minScore && breakdown.isAvailable && breakdown.isPublished) {
      results.push({
        property,
        score: breakdown.totalScore,
        breakdown
      });
    }
  }

  // Trier par score décroissant (les biens les plus pertinents en premier)
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Critères secondaires : en vedette puis vues
    if (b.property.featured !== a.property.featured) {
      return b.property.featured ? 1 : -1;
    }
    return (b.property.viewsCount || 0) - (a.property.viewsCount || 0);
  });

  return results.slice(0, limit);
}
