import { ConciergerieProjet, ConciergerieTypeBien, ConciergerieService } from '../types';

export const CONCIERGERIE_PROJETS: ConciergerieProjet[] = [
  'Acheter',
  'Louer',
  'Trouver un terrain',
  'Trouver un local commercial',
  'Autre'
];

export const CONCIERGERIE_TYPES_BIEN: ConciergerieTypeBien[] = [
  'Appartement',
  'Maison',
  'Villa',
  'Terrain',
  'Bureau',
  'Local commercial',
  'Autre'
];

export const CONCIERGERIE_SERVICES: ConciergerieService[] = [
  'Recherche de biens',
  'Organisation de visites',
  'Accompagnement à la location',
  'Accompagnement à l’achat',
  'Vérification des informations disponibles',
  'Autre'
];

export const KINSHASA_COMMUNES = [
  'Gombe',
  'Ngaliema',
  'Limete',
  'Kintambo',
  'Mont-Ngafula',
  'Bandalungwa',
  'Barumbu',
  'Bumbu',
  'Kalamu',
  'Kasa-Vubu',
  'Kimbanseke',
  'Kinshasa',
  'Kisenso',
  'Lemba',
  'Lingwala',
  'Makala',
  'Maluku',
  'Masina',
  'Matete',
  'Nsele',
  "N'djili",
  'Ngaba',
  'Ngiri-Ngiri',
  'Selembao',
  'Autre commune / Périphérie'
];

// Nettoyage anti-XSS et trim
export function sanitizeString(val: any): string {
  if (typeof val !== 'string') return '';
  return val
    .trim()
    .replace(/[<>]/g, ''); // Suppression des balises HTML
}

// Regex validation email RFC-compliant
export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

// Regex téléphone RDC / International
export const PHONE_REGEX = /^(?:\+?243|00243|0)?[1-9]\d{7,10}$/;

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized?: any;
}

/**
 * Validation rigoureuse partagée Frontend et Backend
 * Ne jamais faire confiance uniquement aux validations frontend.
 */
export function validateConciergerieRequest(input: any): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input || typeof input !== 'object') {
    return {
      isValid: false,
      errors: { _global: 'Les données transmises sont invalides ou manquantes.' }
    };
  }

  // 1. Projet
  const rawProjet = input.project_type || input.projet;
  const projet = sanitizeString(rawProjet) as ConciergerieProjet;
  if (!projet) {
    errors.projet = 'Veuillez sélectionner votre projet immobilier.';
  } else if (!CONCIERGERIE_PROJETS.includes(projet)) {
    errors.projet = `Le projet "${projet}" n'est pas reconnu par le service Conciergerie.`;
  }

  // 2. Type de bien
  const rawType = input.property_type || input.typeBien;
  const typeBien = sanitizeString(rawType) as ConciergerieTypeBien;
  if (!typeBien) {
    errors.typeBien = 'Veuillez sélectionner le type de bien recherché.';
  } else if (!CONCIERGERIE_TYPES_BIEN.includes(typeBien)) {
    errors.typeBien = `Le type de bien "${typeBien}" n'est pas valide.`;
  }

  // 3. Localisation
  const commune = sanitizeString(input.localisation?.commune || input.commune);
  const quartier = sanitizeString(input.localisation?.quartier || input.quartier);

  if (!commune) {
    errors.commune = 'Veuillez indiquer la commune ciblée à Kinshasa.';
  } else if (commune.length > 100) {
    errors.commune = 'Le nom de la commune ne doit pas dépasser 100 caractères.';
  }

  if (quartier && quartier.length > 100) {
    errors.quartier = 'Le quartier ne doit pas dépasser 100 caractères.';
  }

  // 4. Budget
  const budgetRawMin = input.budget_min !== undefined ? input.budget_min : (input.budget?.min !== undefined ? input.budget?.min : input.budgetMin);
  const budgetRawMax = input.budget_max !== undefined ? input.budget_max : (input.budget?.max !== undefined ? input.budget?.max : input.budgetMax);
  const devise = sanitizeString(input.currency || input.budget?.devise || input.devise || 'USD').toUpperCase();

  if (devise !== 'USD' && devise !== 'CDF') {
    errors.devise = 'La devise doit être USD ou CDF.';
  }

  let minBudgetNum: number | undefined = undefined;
  if (budgetRawMin !== undefined && budgetRawMin !== null && budgetRawMin !== '') {
    const parsedMin = Number(budgetRawMin);
    if (isNaN(parsedMin) || parsedMin < 0) {
      errors.budgetMin = 'Le budget minimum doit être un montant positif.';
    } else {
      minBudgetNum = parsedMin;
    }
  }

  let maxBudgetNum: number | undefined = undefined;
  if (budgetRawMax === undefined || budgetRawMax === null || budgetRawMax === '') {
    errors.budgetMax = 'Veuillez renseigner un budget maximum estimé.';
  } else {
    const parsedMax = Number(budgetRawMax);
    if (isNaN(parsedMax) || parsedMax <= 0) {
      errors.budgetMax = 'Le budget maximum doit être supérieur à zéro.';
    } else {
      maxBudgetNum = parsedMax;
    }
  }

  if (minBudgetNum !== undefined && maxBudgetNum !== undefined && minBudgetNum > maxBudgetNum) {
    errors.budgetMax = 'Le budget maximum doit être supérieur ou égal au budget minimum.';
  }

  // 5. Caractéristiques
  const chambresRaw = input.bedrooms ?? input.caracteristiques?.chambres ?? input.chambres;
  const sallesDeBainRaw = input.bathrooms ?? input.caracteristiques?.sallesDeBain ?? input.sallesDeBain;
  const parkingRaw = input.parking !== undefined ? input.parking : input.caracteristiques?.parking;
  const meubleRaw = input.furnished !== undefined ? input.furnished : input.caracteristiques?.meuble;

  let chambresNum: number | undefined = undefined;
  if (chambresRaw !== undefined && chambresRaw !== null && chambresRaw !== '') {
    const parsed = parseInt(String(chambresRaw), 10);
    if (isNaN(parsed) || parsed < 0) {
      errors.chambres = 'Le nombre de chambres doit être un nombre entier positif.';
    } else {
      chambresNum = parsed;
    }
  }

  let sallesDeBainNum: number | undefined = undefined;
  if (sallesDeBainRaw !== undefined && sallesDeBainRaw !== null && sallesDeBainRaw !== '') {
    const parsed = parseInt(String(sallesDeBainRaw), 10);
    if (isNaN(parsed) || parsed < 0) {
      errors.sallesDeBain = "Le nombre de salles d'eau doit être un nombre entier positif.";
    } else {
      sallesDeBainNum = parsed;
    }
  }

  const parkingBool = parkingRaw === true || parkingRaw === 'oui' || parkingRaw === 'true';
  const meubleBool = meubleRaw === true || meubleRaw === 'oui' || meubleRaw === 'true';

  // 6. Services demandés
  const servicesRaw = input.services || [];
  let servicesList: string[] = [];
  if (Array.isArray(servicesRaw) && servicesRaw.length > 0) {
    servicesList = servicesRaw.map((s: any) => sanitizeString(s)).filter(Boolean);
  } else if (typeof servicesRaw === 'string' && servicesRaw.trim()) {
    servicesList = [sanitizeString(servicesRaw)];
  }

  if (servicesList.length === 0) {
    servicesList = ['Recherche de biens'];
  }

  // 7. Informations du client
  const clientInput = input.client || input;
  const nomComplet = sanitizeString(input.full_name || clientInput.nomComplet || clientInput.nom || clientInput.fullName);
  const telephone = sanitizeString(input.phone || clientInput.telephone || clientInput.phone);
  const whatsapp = sanitizeString(input.whatsapp || clientInput.whatsapp || clientInput.whatsApp);
  const email = sanitizeString(input.email || clientInput.email || clientInput.adresseEmail);
  const message = sanitizeString(input.description || clientInput.message || clientInput.messageSupplementaire);

  if (!nomComplet) {
    errors.nomComplet = 'Votre nom complet est obligatoire.';
  } else if (nomComplet.length < 2) {
    errors.nomComplet = 'Le nom doit comporter au moins 2 caractères.';
  } else if (nomComplet.length > 100) {
    errors.nomComplet = 'Le nom ne doit pas dépasser 100 caractères.';
  }

  if (!telephone) {
    errors.telephone = 'Le numéro de téléphone est obligatoire.';
  } else {
    const cleanPhone = telephone.replace(/[\s\-\.\(\)]/g, '');
    if (cleanPhone.length < 7 || cleanPhone.length > 20) {
      errors.telephone = 'Veuillez saisir un numéro de téléphone valide (ex: +243 81 234 5678).';
    }
  }

  if (whatsapp) {
    const cleanWa = whatsapp.replace(/[\s\-\.\(\)]/g, '');
    if (cleanWa.length < 7 || cleanWa.length > 20) {
      errors.whatsapp = 'Le numéro WhatsApp renseigné est invalide (ex: +243 84 529 4616).';
    }
  }

  if (!email) {
    errors.email = "L'adresse e-mail est obligatoire.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Le format de l'adresse e-mail est invalide (ex: nom@domaine.com).";
  } else if (email.length > 120) {
    errors.email = "L'adresse e-mail ne doit pas dépasser 120 caractères.";
  }

  if (message && message.length > 2500) {
    errors.message = 'Le message ne doit pas dépasser 2500 caractères.';
  }

  const isValid = Object.keys(errors).length === 0;

  const sanitized = isValid
    ? {
        // Champs exacts de la table concierge_requests :
        project_type: projet,
        property_type: typeBien,
        commune,
        quartier: quartier || null,
        budget_min: minBudgetNum ?? null,
        budget_max: maxBudgetNum!,
        currency: devise,
        bedrooms: chambresNum ?? null,
        bathrooms: sallesDeBainNum ?? null,
        parking: parkingBool,
        furnished: meubleBool,
        services: servicesList,
        description: message || null,
        full_name: nomComplet,
        phone: telephone,
        whatsapp: whatsapp || null,
        email: email.toLowerCase(),
        status: 'new' as const,
        user_id: input.user_id || null,
        assigned_agent_id: input.assigned_agent_id || null,

        // Compatibilité UI existante :
        projet,
        typeBien,
        localisation: {
          commune,
          quartier: quartier || undefined
        },
        budget: {
          min: minBudgetNum,
          max: maxBudgetNum!,
          devise: devise as 'USD' | 'CDF'
        },
        caracteristiques: {
          chambres: chambresNum,
          sallesDeBain: sallesDeBainNum,
          parking: parkingBool,
          meuble: meubleBool
        },
        client: {
          nomComplet,
          telephone,
          whatsapp: whatsapp || undefined,
          email: email.toLowerCase(),
          message: message || undefined
        }
      }
    : undefined;

  return {
    isValid,
    errors,
    sanitized
  };
}
