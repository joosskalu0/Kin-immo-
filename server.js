// server.ts
import "dotenv/config";
import express from "express";
import path2 from "path";
import fs2 from "fs";
import { fileURLToPath } from "url";
import crypto2 from "crypto";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

// src/utils/conciergerieValidation.ts
var CONCIERGERIE_PROJETS = [
  "Acheter",
  "Louer",
  "Trouver un terrain",
  "Trouver un local commercial",
  "Autre"
];
var CONCIERGERIE_TYPES_BIEN = [
  "Appartement",
  "Maison",
  "Villa",
  "Terrain",
  "Bureau",
  "Local commercial",
  "Autre"
];
function sanitizeString(val) {
  if (typeof val !== "string") return "";
  return val.trim().replace(/[<>]/g, "");
}
var EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
function validateConciergerieRequest(input) {
  const errors = {};
  if (!input || typeof input !== "object") {
    return {
      isValid: false,
      errors: { _global: "Les donn\xE9es transmises sont invalides ou manquantes." }
    };
  }
  const rawProjet = input.project_type || input.projet;
  const projet = sanitizeString(rawProjet);
  if (!projet) {
    errors.projet = "Veuillez s\xE9lectionner votre projet immobilier.";
  } else if (!CONCIERGERIE_PROJETS.includes(projet)) {
    errors.projet = `Le projet "${projet}" n'est pas reconnu par le service Conciergerie.`;
  }
  const rawType = input.property_type || input.typeBien;
  const typeBien = sanitizeString(rawType);
  if (!typeBien) {
    errors.typeBien = "Veuillez s\xE9lectionner le type de bien recherch\xE9.";
  } else if (!CONCIERGERIE_TYPES_BIEN.includes(typeBien)) {
    errors.typeBien = `Le type de bien "${typeBien}" n'est pas valide.`;
  }
  const commune = sanitizeString(input.localisation?.commune || input.commune);
  const quartier = sanitizeString(input.localisation?.quartier || input.quartier);
  if (!commune) {
    errors.commune = "Veuillez indiquer la commune cibl\xE9e \xE0 Kinshasa.";
  } else if (commune.length > 100) {
    errors.commune = "Le nom de la commune ne doit pas d\xE9passer 100 caract\xE8res.";
  }
  if (quartier && quartier.length > 100) {
    errors.quartier = "Le quartier ne doit pas d\xE9passer 100 caract\xE8res.";
  }
  const budgetRawMin = input.budget_min !== void 0 ? input.budget_min : input.budget?.min !== void 0 ? input.budget?.min : input.budgetMin;
  const budgetRawMax = input.budget_max !== void 0 ? input.budget_max : input.budget?.max !== void 0 ? input.budget?.max : input.budgetMax;
  const devise = sanitizeString(input.currency || input.budget?.devise || input.devise || "USD").toUpperCase();
  if (devise !== "USD" && devise !== "CDF") {
    errors.devise = "La devise doit \xEAtre USD ou CDF.";
  }
  let minBudgetNum = void 0;
  if (budgetRawMin !== void 0 && budgetRawMin !== null && budgetRawMin !== "") {
    const parsedMin = Number(budgetRawMin);
    if (isNaN(parsedMin) || parsedMin < 0) {
      errors.budgetMin = "Le budget minimum doit \xEAtre un montant positif.";
    } else {
      minBudgetNum = parsedMin;
    }
  }
  let maxBudgetNum = void 0;
  if (budgetRawMax === void 0 || budgetRawMax === null || budgetRawMax === "") {
    errors.budgetMax = "Veuillez renseigner un budget maximum estim\xE9.";
  } else {
    const parsedMax = Number(budgetRawMax);
    if (isNaN(parsedMax) || parsedMax <= 0) {
      errors.budgetMax = "Le budget maximum doit \xEAtre sup\xE9rieur \xE0 z\xE9ro.";
    } else {
      maxBudgetNum = parsedMax;
    }
  }
  if (minBudgetNum !== void 0 && maxBudgetNum !== void 0 && minBudgetNum > maxBudgetNum) {
    errors.budgetMax = "Le budget maximum doit \xEAtre sup\xE9rieur ou \xE9gal au budget minimum.";
  }
  const chambresRaw = input.bedrooms ?? input.caracteristiques?.chambres ?? input.chambres;
  const sallesDeBainRaw = input.bathrooms ?? input.caracteristiques?.sallesDeBain ?? input.sallesDeBain;
  const parkingRaw = input.parking !== void 0 ? input.parking : input.caracteristiques?.parking;
  const meubleRaw = input.furnished !== void 0 ? input.furnished : input.caracteristiques?.meuble;
  let chambresNum = void 0;
  if (chambresRaw !== void 0 && chambresRaw !== null && chambresRaw !== "") {
    const parsed = parseInt(String(chambresRaw), 10);
    if (isNaN(parsed) || parsed < 0) {
      errors.chambres = "Le nombre de chambres doit \xEAtre un nombre entier positif.";
    } else {
      chambresNum = parsed;
    }
  }
  let sallesDeBainNum = void 0;
  if (sallesDeBainRaw !== void 0 && sallesDeBainRaw !== null && sallesDeBainRaw !== "") {
    const parsed = parseInt(String(sallesDeBainRaw), 10);
    if (isNaN(parsed) || parsed < 0) {
      errors.sallesDeBain = "Le nombre de salles d'eau doit \xEAtre un nombre entier positif.";
    } else {
      sallesDeBainNum = parsed;
    }
  }
  const parkingBool = parkingRaw === true || parkingRaw === "oui" || parkingRaw === "true";
  const meubleBool = meubleRaw === true || meubleRaw === "oui" || meubleRaw === "true";
  const servicesRaw = input.services || [];
  let servicesList = [];
  if (Array.isArray(servicesRaw) && servicesRaw.length > 0) {
    servicesList = servicesRaw.map((s) => sanitizeString(s)).filter(Boolean);
  } else if (typeof servicesRaw === "string" && servicesRaw.trim()) {
    servicesList = [sanitizeString(servicesRaw)];
  }
  if (servicesList.length === 0) {
    servicesList = ["Recherche de biens"];
  }
  const clientInput = input.client || input;
  const nomComplet = sanitizeString(input.full_name || clientInput.nomComplet || clientInput.nom || clientInput.fullName);
  const telephone = sanitizeString(input.phone || clientInput.telephone || clientInput.phone);
  const whatsapp = sanitizeString(input.whatsapp || clientInput.whatsapp || clientInput.whatsApp);
  const email = sanitizeString(input.email || clientInput.email || clientInput.adresseEmail);
  const message = sanitizeString(input.description || clientInput.message || clientInput.messageSupplementaire);
  if (!nomComplet) {
    errors.nomComplet = "Votre nom complet est obligatoire.";
  } else if (nomComplet.length < 2) {
    errors.nomComplet = "Le nom doit comporter au moins 2 caract\xE8res.";
  } else if (nomComplet.length > 100) {
    errors.nomComplet = "Le nom ne doit pas d\xE9passer 100 caract\xE8res.";
  }
  if (!telephone) {
    errors.telephone = "Le num\xE9ro de t\xE9l\xE9phone est obligatoire.";
  } else {
    const cleanPhone = telephone.replace(/[\s\-\.\(\)]/g, "");
    if (cleanPhone.length < 7 || cleanPhone.length > 20) {
      errors.telephone = "Veuillez saisir un num\xE9ro de t\xE9l\xE9phone valide (ex: +243 81 234 5678).";
    }
  }
  if (whatsapp) {
    const cleanWa = whatsapp.replace(/[\s\-\.\(\)]/g, "");
    if (cleanWa.length < 7 || cleanWa.length > 20) {
      errors.whatsapp = "Le num\xE9ro WhatsApp renseign\xE9 est invalide (ex: +243 84 529 4616).";
    }
  }
  if (!email) {
    errors.email = "L'adresse e-mail est obligatoire.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Le format de l'adresse e-mail est invalide (ex: nom@domaine.com).";
  } else if (email.length > 120) {
    errors.email = "L'adresse e-mail ne doit pas d\xE9passer 120 caract\xE8res.";
  }
  if (message && message.length > 2500) {
    errors.message = "Le message ne doit pas d\xE9passer 2500 caract\xE8res.";
  }
  const isValid = Object.keys(errors).length === 0;
  const sanitized = isValid ? {
    // Champs exacts de la table concierge_requests :
    project_type: projet,
    property_type: typeBien,
    commune,
    quartier: quartier || null,
    budget_min: minBudgetNum ?? null,
    budget_max: maxBudgetNum,
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
    status: "new",
    user_id: input.user_id || null,
    assigned_agent_id: input.assigned_agent_id || null,
    // Compatibilité UI existante :
    projet,
    typeBien,
    localisation: {
      commune,
      quartier: quartier || void 0
    },
    budget: {
      min: minBudgetNum,
      max: maxBudgetNum,
      devise
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
      whatsapp: whatsapp || void 0,
      email: email.toLowerCase(),
      message: message || void 0
    }
  } : void 0;
  return {
    isValid,
    errors,
    sanitized
  };
}

// src/utils/propertyMatching.ts
function normalizeStr(val) {
  if (!val) return "";
  return val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
var TYPE_EQUIVALENCES = {
  appartement: ["apartment", "penthouse", "appartement"],
  apartment: ["apartment", "penthouse", "appartement"],
  penthouse: ["penthouse", "apartment", "appartement"],
  villa: ["villa", "house", "maison"],
  maison: ["house", "villa", "maison"],
  house: ["house", "villa", "maison"],
  terrain: ["land", "terrain"],
  land: ["land", "terrain"],
  bureau: ["office", "commercial", "bureau"],
  office: ["office", "commercial", "bureau"],
  "local commercial": ["commercial", "office", "local commercial"],
  commercial: ["commercial", "office", "local commercial"]
};
function calculatePropertyMatch(request, property, exchangeRate = 2800) {
  const reasons = [];
  const isPublished = property.published !== false;
  const isAvailable = property.status !== "sold";
  if (!isPublished || !isAvailable) {
    return {
      locationScore: 0,
      typeScore: 0,
      budgetScore: 0,
      bedroomsScore: 0,
      bathroomsScore: 0,
      totalScore: 0,
      reasons: [
        !isPublished ? "Annonce non publi\xE9e" : "Bien indisponible ou d\xE9j\xE0 vendu"
      ],
      isAvailable,
      isPublished
    };
  }
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
        const isQuartierMatch = propQuartier && (propQuartier.includes(reqQuartier) || reqQuartier.includes(propQuartier)) || propAddress.includes(reqQuartier) || propRef.includes(reqQuartier);
        if (isQuartierMatch) {
          locationScore = 30;
          reasons.push(`Commune (${property.commune}) et Quartier (${property.quartier || reqQuartier}) parfaitement align\xE9s (+30)`);
        } else {
          locationScore = 24;
          reasons.push(`Commune exacte (${property.commune}) (+24)`);
        }
      } else {
        locationScore = 30;
        reasons.push(`Commune conforme (${property.commune}) (+30)`);
      }
    } else if (reqQuartier && (propAddress.includes(reqQuartier) || propRef.includes(reqQuartier))) {
      locationScore = 15;
      reasons.push(`Quartier ou rep\xE8re proche (${reqQuartier}) (+15)`);
    }
  }
  let typeScore = 0;
  const rawReqType = normalizeStr(request.property_type || request.typeBien);
  const propType = normalizeStr(property.type);
  if (!rawReqType || rawReqType === "autre") {
    typeScore = 10;
    reasons.push("Type de bien flexible (+10)");
  } else {
    const equivalents = TYPE_EQUIVALENCES[rawReqType] || [rawReqType];
    const isTypeMatch = equivalents.some(
      (eq) => propType === eq || propType.includes(eq) || eq.includes(propType)
    );
    if (isTypeMatch) {
      typeScore = 20;
      reasons.push(`Type de bien conforme (${property.type}) (+20)`);
    } else {
      if (rawReqType.includes("villa") && propType.includes("house") || rawReqType.includes("appartement") && propType.includes("penthouse")) {
        typeScore = 18;
        reasons.push(`Type de bien tr\xE8s proche (${property.type}) (+18)`);
      }
    }
  }
  let budgetScore = 0;
  const rawBudgetMax = Number(request.budget_max || request.budget?.max || 0);
  const rawBudgetMin = Number(request.budget_min ?? request.budget?.min ?? 0);
  const reqCurrency = (request.currency || request.budget?.devise || "USD").toUpperCase();
  const propCurrency = (property.currency || "USD").toUpperCase();
  const propPrice = Number(property.price) || 0;
  let normalizedPropertyPrice = propPrice;
  if (reqCurrency === "CDF" && propCurrency === "USD") {
    normalizedPropertyPrice = propPrice * exchangeRate;
  } else if (reqCurrency === "USD" && propCurrency === "CDF") {
    normalizedPropertyPrice = propPrice / exchangeRate;
  }
  if (rawBudgetMax <= 0) {
    budgetScore = 25;
    reasons.push("Budget non restreint (+25)");
  } else {
    if (normalizedPropertyPrice <= rawBudgetMax) {
      if (rawBudgetMin > 0) {
        if (normalizedPropertyPrice >= rawBudgetMin) {
          budgetScore = 25;
          reasons.push(
            `Prix (${propPrice.toLocaleString()} ${propCurrency}) dans la fourchette client (+25)`
          );
        } else if (normalizedPropertyPrice >= rawBudgetMin * 0.75) {
          budgetScore = 22;
          reasons.push(
            `Prix (${propPrice.toLocaleString()} ${propCurrency}) tr\xE8s avantageux (+22)`
          );
        } else {
          budgetScore = 18;
          reasons.push(
            `Prix inf\xE9rieur au budget minimum estim\xE9 (+18)`
          );
        }
      } else {
        budgetScore = 25;
        reasons.push(
          `Prix (${propPrice.toLocaleString()} ${propCurrency}) respecte le plafond de ${rawBudgetMax.toLocaleString()} ${reqCurrency} (+25)`
        );
      }
    } else if (normalizedPropertyPrice <= rawBudgetMax * 1.1) {
      budgetScore = 14;
      reasons.push(
        `Prix l\xE9g\xE8rement sup\xE9rieur (+10% max) n\xE9gociable (+14)`
      );
    }
  }
  let bedroomsScore = 0;
  const reqBedrooms = request.bedrooms ?? request.caracteristiques?.chambres ?? null;
  const propBedrooms = property.bedrooms || 0;
  const isNonResidential = ["land", "terrain", "office", "bureau", "commercial", "local commercial"].some(
    (t) => rawReqType.includes(t) || propType.includes(t)
  );
  if (reqBedrooms === null || reqBedrooms === void 0 || reqBedrooms <= 0 || isNonResidential) {
    bedroomsScore = 15;
    reasons.push("Crit\xE8re chambres non restrictif / adapt\xE9 (+15)");
  } else {
    if (propBedrooms === reqBedrooms) {
      bedroomsScore = 15;
      reasons.push(`Nombre de chambres exact (${propBedrooms} ch.) (+15)`);
    } else if (propBedrooms > reqBedrooms) {
      bedroomsScore = 13;
      reasons.push(`Espace suppl\xE9mentaire (${propBedrooms} ch. au lieu de ${reqBedrooms}) (+13)`);
    } else if (propBedrooms === reqBedrooms - 1) {
      bedroomsScore = 7;
      reasons.push(`1 chambre en moins (${propBedrooms} au lieu de ${reqBedrooms}) (+7)`);
    }
  }
  let bathroomsScore = 0;
  const reqBathrooms = request.bathrooms ?? request.caracteristiques?.sallesDeBain ?? null;
  const propBathrooms = property.bathrooms || 0;
  if (reqBathrooms === null || reqBathrooms === void 0 || reqBathrooms <= 0 || isNonResidential) {
    bathroomsScore = 10;
    reasons.push("Crit\xE8re salles de bain flexible (+10)");
  } else {
    if (propBathrooms === reqBathrooms) {
      bathroomsScore = 10;
      reasons.push(`Nombre de salles de bain exact (${propBathrooms} sdb) (+10)`);
    } else if (propBathrooms > reqBathrooms) {
      bathroomsScore = 10;
      reasons.push(`Salles d'eau g\xE9n\xE9reuses (${propBathrooms} sdb) (+10)`);
    } else if (propBathrooms === reqBathrooms - 1) {
      bathroomsScore = 5;
      reasons.push(`1 salle de bain en moins (${propBathrooms} au lieu de ${reqBathrooms}) (+5)`);
    }
  }
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
function findMatchingProperties(request, properties, options = {}) {
  const { minScore = 20, limit = 20, exchangeRate = 2800 } = options;
  const safeProperties = Array.isArray(properties) ? properties : [];
  const results = [];
  for (const property of safeProperties) {
    if (!property || typeof property !== "object") continue;
    const breakdown = calculatePropertyMatch(request, property, exchangeRate);
    if (breakdown.totalScore >= minScore && breakdown.isAvailable && breakdown.isPublished) {
      results.push({
        property,
        score: breakdown.totalScore,
        breakdown
      });
    }
  }
  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.property.featured !== a.property.featured) {
      return b.property.featured ? 1 : -1;
    }
    return (b.property.viewsCount || 0) - (a.property.viewsCount || 0);
  });
  return results.slice(0, limit);
}

// src/data/mockData.ts
var initialCustomFields = [
  {
    id: "field_titre_foncier",
    key: "titre_foncier",
    label: { fr: "Titre de Propri\xE9t\xE9 / Document Foncier", en: "Land Title Document" },
    type: "select",
    group: "specs",
    options: ["Certificat d'Enregistrement (Titre Foncier Valid\xE9)", "Contrat d'Occupation Provisoire (COP)", "Livret de Logeur", "Fiche d'Attribution"],
    required: true,
    showInSearch: true,
    icon: "FileCheck",
    defaultValue: "Certificat d'Enregistrement (Titre Foncier Valid\xE9)"
  },
  {
    id: "field_electricite_autonomie",
    key: "electricite_autonomie",
    label: { fr: "\xC9lectricit\xE9 & Autonomie (Groupe / Solaire)", en: "Electricity & Solar System" },
    type: "select",
    group: "specs",
    options: ["Panneaux Solaires + Groupe \xC9lectrog\xE8ne + SNEL", "Groupe \xC9lectrog\xE8ne + SNEL", "Panneaux Solaires + SNEL", "SNEL Uniquement"],
    required: false,
    showInSearch: true,
    icon: "Zap",
    defaultValue: "Panneaux Solaires + Groupe \xC9lectrog\xE8ne + SNEL"
  },
  {
    id: "field_eau_forage",
    key: "eau_forage",
    label: { fr: "Approvisionnement en Eau & Forage", en: "Water Supply & Well" },
    type: "select",
    group: "specs",
    options: ["Forage Priv\xE9 d'Eau + REGIDESO + Citerne", "Forage Priv\xE9 + Citerne Hydrophore", "REGIDESO + Citerne de R\xE9serve", "REGIDESO Uniquement"],
    required: false,
    showInSearch: true,
    icon: "Droplets",
    defaultValue: "Forage Priv\xE9 d'Eau + REGIDESO + Citerne"
  },
  {
    id: "field_securite",
    key: "securite",
    label: { fr: "Dispositif de S\xE9curit\xE9", en: "Security System" },
    type: "select",
    group: "specs",
    options: ["Mur de Cl\xF4ture + Fil Barbel\xE9 \xC9lectrifi\xE9 + Cam\xE9ras + Gardien 24/7", "Cl\xF4ture \xC9lectrifi\xE9e + Gardien 24/7", "Mur de Cl\xF4ture + Cam\xE9ras", "Portail S\xE9curis\xE9"],
    required: false,
    showInSearch: true,
    icon: "ShieldAlert",
    defaultValue: "Mur de Cl\xF4ture + Fil Barbel\xE9 \xC9lectrifi\xE9 + Cam\xE9ras + Gardien 24/7"
  },
  {
    id: "field_taxe_fonciere",
    key: "taxe_fonciere_dgrk",
    label: { fr: "Taxe Fonci\xE8re Annuelle DGRK ($/an)", en: "Annual Property Tax DGRK ($/yr)" },
    type: "number",
    unit: "$/an",
    group: "financial",
    required: false,
    showInSearch: false,
    icon: "Receipt",
    defaultValue: 1200
  },
  {
    id: "field_distance_fleuve",
    key: "distance_fleuve",
    label: { fr: "Proximit\xE9 Fleuve Congo / Centre Gombe", en: "Proximity to River or Gombe" },
    type: "text",
    group: "general",
    required: false,
    showInSearch: true,
    icon: "Compass",
    defaultValue: "5 min du Fleuve Congo / Bd du 30 Juin"
  },
  {
    id: "field_private_owner_phone",
    key: "private_owner_phone",
    label: { fr: "T\xE9l\xE9phone Direct Propri\xE9taire Kinshasa (Priv\xE9)", en: "Direct Owner Phone (Private)" },
    type: "contact",
    group: "private",
    required: false,
    isPrivate: true,
    icon: "PhoneLock",
    defaultValue: "+243 81 234 56 78"
  },
  {
    id: "field_private_commission",
    key: "private_commission_rate",
    label: { fr: "Commission Agence N\xE9goci\xE9e (%)", en: "Negotiated Commission (%)" },
    type: "number",
    unit: "%",
    group: "private",
    required: false,
    isPrivate: true,
    icon: "Percent",
    defaultValue: 5
  }
];
var initialAgencies = [];
var initialAgents = [];
var initialProperties = [];
var initialLeads = [];

// src/utils/mediaTools.ts
var MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
var MAX_VIDEO_FILE_BYTES = 100 * 1024 * 1024;
function dHashHammingDistance(hashA, hashB) {
  if (!hashA || !hashB || hashA.length !== 16 || hashB.length !== 16) return 64;
  let dist = 0;
  for (let i = 0; i < 16; i++) {
    const a = parseInt(hashA[i], 16);
    const b = parseInt(hashB[i], 16);
    if (Number.isNaN(a) || Number.isNaN(b)) return 64;
    let xor = a ^ b;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

// src/utils/suspiciousListingDetector.ts
var KINSHASA_PRICE_BENCHMARKS = {
  "Gombe": { minRent: 700, avgRent: 2200, minSale: 12e4, avgSale: 45e4 },
  "Ngaliema": { minRent: 450, avgRent: 1500, minSale: 8e4, avgSale: 32e4 },
  "Mont-Ngafula": { minRent: 150, avgRent: 500, minSale: 25e3, avgSale: 9e4 },
  "Kintambo": { minRent: 350, avgRent: 900, minSale: 6e4, avgSale: 18e4 },
  "Limete": { minRent: 400, avgRent: 1200, minSale: 7e4, avgSale: 25e4 },
  "Bandalungwa": { minRent: 250, avgRent: 600, minSale: 4e4, avgSale: 11e4 },
  "Barumbu": { minRent: 180, avgRent: 450, minSale: 3e4, avgSale: 8e4 },
  "Kinshasa": { minRent: 200, avgRent: 500, minSale: 35e3, avgSale: 95e3 },
  "Lingwala": { minRent: 200, avgRent: 500, minSale: 35e3, avgSale: 85e3 },
  "Kalamu": { minRent: 200, avgRent: 550, minSale: 35e3, avgSale: 9e4 },
  "Kasa-Vubu": { minRent: 250, avgRent: 600, minSale: 4e4, avgSale: 1e5 },
  "Lemba": { minRent: 200, avgRent: 500, minSale: 35e3, avgSale: 95e3 },
  "Matete": { minRent: 180, avgRent: 450, minSale: 3e4, avgSale: 8e4 },
  "Masina": { minRent: 120, avgRent: 350, minSale: 2e4, avgSale: 6e4 },
  "Ndjili": { minRent: 120, avgRent: 300, minSale: 18e3, avgSale: 55e3 },
  "Kimbanseke": { minRent: 100, avgRent: 250, minSale: 15e3, avgSale: 45e3 },
  "Nsele": { minRent: 100, avgRent: 300, minSale: 15e3, avgSale: 5e4 },
  "Maluku": { minRent: 80, avgRent: 250, minSale: 12e3, avgSale: 4e4 },
  "Selembao": { minRent: 120, avgRent: 350, minSale: 2e4, avgSale: 6e4 },
  "Bumbu": { minRent: 120, avgRent: 300, minSale: 18e3, avgSale: 55e3 },
  "Makala": { minRent: 120, avgRent: 300, minSale: 18e3, avgSale: 55e3 },
  "Ngaba": { minRent: 130, avgRent: 320, minSale: 2e4, avgSale: 6e4 },
  "Kisenso": { minRent: 80, avgRent: 220, minSale: 12e3, avgSale: 4e4 }
};
var SUSPICIOUS_KEYWORDS = [
  { term: "acompte avant visite", severity: "critical", score: 35 },
  { term: "payer avant de visiter", severity: "critical", score: 35 },
  { term: "frais de visite obligatoire d'avance", severity: "high", score: 25 },
  { term: "western union", severity: "critical", score: 30 },
  { term: "moneygram", severity: "critical", score: 30 },
  { term: "airtel money avant", severity: "high", score: 25 },
  { term: "m-pesa avant", severity: "high", score: 25 },
  { term: "orange money avant", severity: "high", score: 25 },
  { term: "propri\xE9taire en voyage", severity: "medium", score: 20 },
  { term: "propri\xE9taire hospitalis\xE9", severity: "critical", score: 30 },
  { term: "mandat postal", severity: "high", score: 25 },
  { term: "transfert pr\xE9alable", severity: "high", score: 25 },
  { term: "bloquer le bien avec une avance", severity: "high", score: 20 },
  { term: "tr\xE8s urgent affaire en or", severity: "low", score: 10 },
  { term: "prix sacrifi\xE9 cause d\xE9part imm\xE9diat", severity: "medium", score: 15 }
];
function normalizePhoneNumber(phone) {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "").slice(-9);
}
function computeTextSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  const tokensA = new Set(textA.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter((w) => w.length > 2));
  const tokensB = new Set(textB.toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/).filter((w) => w.length > 2));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersection++;
  });
  const union = (/* @__PURE__ */ new Set([...tokensA, ...tokensB])).size;
  return union > 0 ? intersection / union : 0;
}
function analyzePropertyForFraud(target, allProperties = [], userReports = []) {
  const flags = [];
  let riskScore = 0;
  const targetPhone = normalizePhoneNumber(target.contactPhone || target.privateFields?.ownerPhone);
  const targetImages = target.images || [];
  const otherProperties = allProperties.filter((p) => p.id !== target.id);
  let samePhoneCount = 0;
  const listingsWithSamePhone = [];
  if (targetPhone && targetPhone.length >= 7) {
    otherProperties.forEach((p) => {
      const pPhone = normalizePhoneNumber(p.contactPhone || p.privateFields?.ownerPhone);
      if (pPhone && pPhone === targetPhone) {
        samePhoneCount++;
        listingsWithSamePhone.push(p);
      }
    });
    if (samePhoneCount >= 8) {
      const pts = 35;
      riskScore += pts;
      flags.push({
        code: "SAME_PHONE_MANY_LISTINGS",
        label: "M\xEAme num\xE9ro sur un volume anormal d'annonces",
        severity: "high",
        score: pts,
        details: `Ce num\xE9ro de contact (${target.contactPhone || targetPhone}) est pr\xE9sent sur ${samePhoneCount + 1} annonces diff\xE9rentes.`
      });
    } else if (samePhoneCount >= 4) {
      const pts = 18;
      riskScore += pts;
      flags.push({
        code: "SAME_PHONE_MANY_LISTINGS",
        label: "M\xEAme num\xE9ro r\xE9current sur plusieurs annonces",
        severity: "medium",
        score: pts,
        details: `Le num\xE9ro de contact appara\xEEt d\xE9j\xE0 sur ${samePhoneCount} autres annonces.`
      });
    }
  }
  const duplicatePhotoUrls = [];
  let fingerprintMatchCount = 0;
  let foundReusedFromOtherAgent = false;
  const targetFingerprints = Array.isArray(target.imageFingerprints) ? target.imageFingerprints.filter(Boolean) : Array.isArray(target.imagesMeta) ? target.imagesMeta.map((m) => m.fingerprint).filter((fp) => Boolean(fp)) : [];
  if (targetImages.length > 0 || targetFingerprints.length > 0) {
    const targetUrlSet = new Set(targetImages.map((img) => img.split("?")[0].trim()));
    otherProperties.forEach((otherProp) => {
      const otherImgs = (otherProp.images || []).map((img) => img.split("?")[0].trim());
      otherImgs.forEach((imgUrl) => {
        if (imgUrl && targetUrlSet.has(imgUrl) && !duplicatePhotoUrls.includes(imgUrl)) {
          duplicatePhotoUrls.push(imgUrl);
          if (otherProp.agentId && target.agentId && otherProp.agentId !== target.agentId) {
            foundReusedFromOtherAgent = true;
          }
        }
      });
      const otherFingerprints = Array.isArray(otherProp.imageFingerprints) ? otherProp.imageFingerprints.filter(Boolean) : Array.isArray(otherProp.imagesMeta) ? otherProp.imagesMeta.map((m) => m.fingerprint).filter((fp) => Boolean(fp)) : [];
      for (const fp of targetFingerprints) {
        if (otherFingerprints.some((ofp) => dHashHammingDistance(fp, ofp) <= 6)) {
          fingerprintMatchCount += 1;
          if (otherProp.agentId && target.agentId && otherProp.agentId !== target.agentId) {
            foundReusedFromOtherAgent = true;
          }
          break;
        }
      }
    });
    const totalDuplicates = Math.max(duplicatePhotoUrls.length, fingerprintMatchCount);
    if (totalDuplicates > 0) {
      const pts = foundReusedFromOtherAgent ? 45 : 30;
      riskScore += pts;
      flags.push({
        code: "DUPLICATE_PHOTOS",
        label: foundReusedFromOtherAgent ? "Empreinte d\u2019image d\xE9j\xE0 utilis\xE9e par un autre compte" : "Photos ou empreintes d\u2019images dupliqu\xE9es sur d'autres annonces",
        severity: foundReusedFromOtherAgent ? "critical" : "high",
        score: pts,
        details: `${totalDuplicates} photo(s) correspondante(s) (URL ou empreinte visuelle) d\xE9tect\xE9e(s) sur d'autres annonces${foundReusedFromOtherAgent ? " appartenant \xE0 d'autres annonceurs" : ""}.`
      });
    }
  }
  let priceAnomalyRatio;
  let benchmarkPrice;
  const targetCommune = target.commune || "Gombe";
  const communeBenchmark = KINSHASA_PRICE_BENCHMARKS[targetCommune] || KINSHASA_PRICE_BENCHMARKS["Gombe"];
  const isRent = target.status === "for-rent" || target.period === "month" || target.period === "year";
  const rawPrice = Number(target.price) || 0;
  const usdPrice = String(target.currency || "USD").toUpperCase() === "CDF" ? rawPrice / 2850 : rawPrice;
  const targetPrice = isRent && target.period === "year" ? usdPrice / 12 : usdPrice;
  if (isRent) {
    benchmarkPrice = communeBenchmark.minRent;
    if (targetPrice > 0 && targetPrice < communeBenchmark.minRent * 0.4) {
      priceAnomalyRatio = targetPrice / communeBenchmark.minRent;
      const pts = targetPrice < communeBenchmark.minRent * 0.25 ? 40 : 25;
      riskScore += pts;
      flags.push({
        code: "ABNORMALLY_LOW_PRICE",
        label: "Prix anormalement bas (suspect d'arnaque au loyer)",
        severity: pts >= 35 ? "critical" : "high",
        score: pts,
        details: `Loyer estim\xE9 \xE0 ${Math.round(targetPrice)}$/mois \xE0 ${targetCommune}, alors que le plancher r\xE9aliste du quartier est d'au moins ${communeBenchmark.minRent}$ (prix inf\xE9rieur de ${Math.round((1 - priceAnomalyRatio) * 100)}%).`
      });
    }
  } else {
    benchmarkPrice = communeBenchmark.minSale;
    if (targetPrice > 0 && targetPrice < communeBenchmark.minSale * 0.35) {
      priceAnomalyRatio = targetPrice / communeBenchmark.minSale;
      const pts = targetPrice < communeBenchmark.minSale * 0.2 ? 45 : 30;
      riskScore += pts;
      flags.push({
        code: "ABNORMALLY_LOW_PRICE",
        label: "Prix de vente anormalement d\xE9risoire",
        severity: "critical",
        score: pts,
        details: `Prix de vente de ${targetPrice.toLocaleString()}$ pour un bien \xE0 ${targetCommune}, bien en dessous de la valeur minimale marchande estim\xE9e \xE0 ${communeBenchmark.minSale.toLocaleString()}$.`
      });
    }
  }
  let identicalListingId;
  let identicalListingTitle;
  let maxSimilarity = 0;
  otherProperties.forEach((otherProp) => {
    const titleSim = computeTextSimilarity(target.title, otherProp.title);
    const descSim = computeTextSimilarity(target.description || "", otherProp.description || "");
    const combinedScore = titleSim * 0.6 + descSim * 0.4;
    if (combinedScore > maxSimilarity) {
      maxSimilarity = combinedScore;
      if (combinedScore >= 0.8) {
        identicalListingId = otherProp.id;
        identicalListingTitle = otherProp.title;
      }
    }
  });
  if (identicalListingId && maxSimilarity >= 0.8) {
    const pts = 35;
    riskScore += pts;
    flags.push({
      code: "IDENTICAL_LISTING",
      label: "Annonce quasi-identique \xE0 un bien existant",
      severity: "high",
      score: pts,
      details: `Similarit\xE9 textuelle de ${Math.round(maxSimilarity * 100)}% avec l'annonce "${identicalListingTitle}" (ID: ${identicalListingId}).`
    });
  }
  const textCorpus = `${target.title} ${target.description || ""} ${target.address || ""}`.toLowerCase();
  const unusualKeywordsFound = [];
  SUSPICIOUS_KEYWORDS.forEach((kw) => {
    if (textCorpus.includes(kw.term.toLowerCase())) {
      unusualKeywordsFound.push(kw.term);
      riskScore += kw.score;
      flags.push({
        code: "UNUSUAL_BEHAVIOR",
        label: `Terme suspect d\xE9tect\xE9 : "${kw.term}"`,
        severity: kw.severity,
        score: kw.score,
        details: `L'annonce mentionne "${kw.term}", une formule fr\xE9quemment employ\xE9e dans les tentatives d'escroquerie \xE0 la visite.`
      });
    }
  });
  const lettersOnly = (target.title || "").replace(/[^a-zA-Z]/g, "");
  if (lettersOnly.length > 15) {
    const upperRatio = target.title.replace(/[^A-Z]/g, "").length / lettersOnly.length;
    if (upperRatio > 0.8) {
      const pts = 12;
      riskScore += pts;
      flags.push({
        code: "UNUSUAL_BEHAVIOR",
        label: "Titre enti\xE8rement en majuscules (Spam/Agressif)",
        severity: "low",
        score: pts,
        details: "Le titre est r\xE9dig\xE9 en lettres capitales pour capter l'attention de fa\xE7on non professionnelle."
      });
    }
  }
  const matchingReports = userReports.filter(
    (r) => r.propertyId === target.id || target.agentId && r.propertyId && allProperties.find((p) => p.id === r.propertyId)?.agentId === target.agentId
  );
  const sellerReportsCount = matchingReports.length;
  if (sellerReportsCount >= 3) {
    const pts = 55;
    riskScore += pts;
    flags.push({
      code: "SELLER_REPORTED_MULTIPLE_TIMES",
      label: "Vendeur / Annonceur signal\xE9 \xE0 r\xE9p\xE9tition",
      severity: "critical",
      score: pts,
      details: `${sellerReportsCount} signalements d'utilisateurs ont \xE9t\xE9 d\xE9pos\xE9s contre cet annonceur pour abus ou tentative de fraude.`
    });
  } else if (sellerReportsCount >= 1) {
    const pts = 25;
    riskScore += pts;
    flags.push({
      code: "SELLER_REPORTED_MULTIPLE_TIMES",
      label: "Signalement utilisateur actif",
      severity: "medium",
      score: pts,
      details: `${sellerReportsCount} signalement enregistr\xE9 pour cette annonce ou ce vendeur.`
    });
  }
  riskScore = Math.min(100, Math.round(riskScore));
  let verdict = "normal";
  let recommendation = "Annonce conforme aux r\xE8gles de s\xE9curit\xE9. Publication autoris\xE9e.";
  const hasCriticalFlag = flags.some((f) => f.severity === "critical");
  const hasHighFlag = flags.some((f) => f.severity === "high");
  if (riskScore >= 70 || hasCriticalFlag) {
    verdict = "suspect";
    recommendation = "\u{1F534} SUSPECT : Risque tr\xE8s \xE9lev\xE9 de fraude. L'annonce a \xE9t\xE9 temporairement bloqu\xE9e par mesure de pr\xE9caution. Un contr\xF4le approfondi par un administrateur est obligatoire avant toute r\xE9activation.";
  } else if (riskScore >= 30 || hasHighFlag) {
    verdict = "review_required";
    recommendation = "\u{1F7E0} \xC0 V\xC9RIFIER : Des anomalies significatives ont \xE9t\xE9 relev\xE9es. L'annonce est en attente d'une validation manuelle par l'\xE9quipe de mod\xE9ration Kinimmo.";
  }
  return {
    propertyId: target.id,
    verdict,
    riskScore,
    analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
    flags,
    checks: {
      samePhoneCount,
      duplicatePhotosFound: duplicatePhotoUrls.length > 0,
      duplicatePhotoUrls,
      priceAnomalyRatio,
      benchmarkPrice,
      identicalListingId,
      identicalListingTitle,
      similarityScore: maxSimilarity,
      unusualKeywordsFound,
      sellerReportsCount
    },
    recommendation
  };
}
function auditPropertyList(properties, userReports = []) {
  const results = /* @__PURE__ */ new Map();
  let normalCount = 0;
  let reviewRequiredCount = 0;
  let suspectCount = 0;
  const auditedProperties = properties.map((property) => {
    const analysis = analyzePropertyForFraud(property, properties, userReports);
    results.set(property.id, analysis);
    if (analysis.verdict === "suspect") suspectCount++;
    else if (analysis.verdict === "review_required") reviewRequiredCount++;
    else normalCount++;
    return {
      ...property,
      fraudStatus: analysis.verdict,
      fraudScore: analysis.riskScore,
      fraudFlags: analysis.flags,
      fraudLastCheckedAt: analysis.analyzedAt,
      published: analysis.verdict === "normal" ? property.published : false,
      fraudAnalysis: analysis
    };
  });
  return {
    total: properties.length,
    normalCount,
    reviewRequiredCount,
    suspectCount,
    results,
    auditedProperties
  };
}

// src/data/kinshasaLocations.ts
var KINSHASA_COMMUNES_DATA = {
  "Gombe": {
    name: "Gombe",
    districts: "Lukunga",
    quartiers: [
      "Centre-Ville / 30 Juin",
      "Golf",
      "Haut-Commandement",
      "Socimat",
      "Fleuve Congo / Batetela",
      "Gare Centrale",
      "Palais de la Nation",
      "Clinique Ngaliema Zone"
    ],
    popularAvenues: [
      "Boulevard du 30 Juin",
      "Avenue de la Justice",
      "Avenue Colonel Mondjiba",
      "Avenue Haut-Commandement",
      "Avenue Batetela",
      "Avenue du Commerce",
      "Avenue Tombalbaye",
      "Avenue des Aviateurs",
      "Avenue de la Mongala",
      "Avenue Tabu Ley (ex-Tombalbaye)",
      "Avenue Sergent Mok\xE9"
    ]
  },
  "Ngaliema": {
    name: "Ngaliema",
    districts: "Lukunga",
    quartiers: [
      "Binza Macampagne",
      "Binza Pigeon",
      "Binza Ozone",
      "Binza IPN",
      "Binza Delvaux",
      "Basoko / GB",
      "Joli Parc",
      "Kinsuka P\xEAcheurs",
      "Camp Munganga",
      "Mimosas",
      "Djelo-Binza",
      "Bunda"
    ],
    popularAvenues: [
      "Avenue des \xC9curies",
      "Avenue de la Montagne",
      "Route de Matadi",
      "Avenue Colonel Mondjiba",
      "Avenue de l'OUA",
      "Avenue de l'\xC9cole",
      "Avenue Ma Campagne",
      "Avenue des P\xEAcheurs (Kinsuka)",
      "Avenue Kanzaku",
      "Avenue du Drapeau"
    ]
  },
  "Limete": {
    name: "Limete",
    districts: "Mont-Amba",
    quartiers: [
      "Limete R\xE9sidentiel",
      "Limete Industriel",
      "Salongo",
      "Mombele",
      "Kingabwa",
      "Mososo",
      "Agricole",
      "Ndanu"
    ],
    popularAvenues: [
      "Boulevard Lumumba",
      "Avenue des Poids Lourds",
      "1\xE8re Rue R\xE9sidentielle",
      "7\xE8me Rue R\xE9sidentielle",
      "10\xE8me Rue R\xE9sidentielle",
      "14\xE8me Rue R\xE9sidentielle",
      "Avenue de la M\xE9tallurgie",
      "Avenue du Marais",
      "Avenue Universitaire"
    ]
  },
  "Mont-Ngafula": {
    name: "Mont-Ngafula",
    districts: "Lukunga",
    quartiers: [
      "Righini",
      "Livulu / UNIKIN",
      "Cit\xE9 Mama Mobutu",
      "Kindele",
      "Kimbondo",
      "Mitendi",
      "UPN",
      "Mataba",
      "Kimwenza",
      "Mazamba",
      "Ngana"
    ],
    popularAvenues: [
      "Route de Matadi",
      "Avenue By-Pass",
      "Avenue de l'Universit\xE9",
      "Avenue Mama Mobutu",
      "Route de Kimwenza",
      "Avenue Kimbondo",
      "Avenue Kasangulu"
    ]
  },
  "Kintambo": {
    name: "Kintambo",
    districts: "Lukunga",
    quartiers: [
      "Jama\xEFque",
      "Kilimani",
      "Tanzanie",
      "Lubudi",
      "Camp Kokolo",
      "Nganda"
    ],
    popularAvenues: [
      "Avenue Kasa-Vubu",
      "Avenue Komoriko",
      "Avenue Bangala",
      "Avenue OUA",
      "Avenue du Camp Militaire",
      "Boulevard du 30 Juin (Ext)"
    ]
  },
  "Bandalungwa": {
    name: "Bandalungwa",
    districts: "Funa",
    quartiers: [
      "Makelele",
      "Synkin",
      "Lumumba",
      "Adoula",
      "Kimbangu",
      "Bisengo",
      "Tshibangu"
    ],
    popularAvenues: [
      "Avenue Kasa-Vubu",
      "Avenue de la Lib\xE9ration (24 Novembre)",
      "Avenue Inga",
      "Avenue Bakusu",
      "Avenue Lubumbashi",
      "Avenue Kimbondo"
    ]
  },
  "Lemba": {
    name: "Lemba",
    districts: "Mont-Amba",
    quartiers: [
      "Super Lemba",
      "Righini-Lemba",
      "Salongo-Lemba",
      "\xC9changeur",
      "Gombele",
      "Livulu-Lemba",
      "Foire",
      "Molo",
      "Maduda"
    ],
    popularAvenues: [
      "Avenue de l'Universit\xE9",
      "Avenue By-Pass",
      "Boulevard Lumumba",
      "Avenue Kianza",
      "Avenue Sefu",
      "Avenue Maternit\xE9"
    ]
  },
  "Barumbu": {
    name: "Barumbu",
    districts: "Lukunga",
    quartiers: [
      "Ndolo",
      "Bon March\xE9",
      "Funa",
      "Bitshaku-Tshaku",
      "Mososo"
    ],
    popularAvenues: [
      "Avenue Flambeau",
      "Avenue Kabambare",
      "Avenue Luambo Makiadi (Bokassa)",
      "Avenue Kabasele (Flambeau)",
      "Avenue des Huileries"
    ]
  },
  "Lingwala": {
    name: "Lingwala",
    districts: "Lukunga",
    quartiers: [
      "Singa-Mopepe",
      "La Voix du Peuple",
      "Palais du Peuple",
      "R\xE9volution",
      "Stade des Martyrs Zone"
    ],
    popularAvenues: [
      "Avenue de la Lib\xE9ration (24 Novembre)",
      "Avenue des Huileries",
      "Avenue Nyangwe",
      "Avenue Kalembe-Lembe",
      "Avenue Kabinda"
    ]
  },
  "Kalamu": {
    name: "Kalamu",
    districts: "Funa",
    quartiers: [
      "Matonge",
      "Yolo-Nord",
      "Yolo-Sud",
      "Kauka",
      "Pinzi",
      "Immo-Congo"
    ],
    popularAvenues: [
      "Avenue Kasa-Vubu",
      "Avenue Victoire",
      "Avenue Universit\xE9",
      "Avenue Oshwe",
      "Avenue Yolo"
    ]
  },
  "Kasa-Vubu": {
    name: "Kasa-Vubu",
    districts: "Funa",
    quartiers: [
      "Ancien Combattant",
      "Assossa",
      "Katanga",
      "Lubumbashi",
      "Saio"
    ],
    popularAvenues: [
      "Avenue Kasa-Vubu",
      "Avenue Assossa",
      "Avenue Saio",
      "Avenue Gambela"
    ]
  },
  "Matete": {
    name: "Matete",
    districts: "Mont-Amba",
    quartiers: [
      "Mandina",
      "Anunga",
      "Batende",
      "Bahumbu",
      "Pululu",
      "Lokoro"
    ],
    popularAvenues: [
      "Boulevard Lumumba",
      "Avenue de la R\xE9sidence",
      "Avenue Banunu",
      "Avenue Marais"
    ]
  },
  "Ndjili": {
    name: "Ndjili",
    districts: "Tshangu",
    quartiers: [
      "Quartier 1",
      "Quartier 2",
      "Quartier 4",
      "Quartier 7",
      "Quartier 12",
      "Quartier 13",
      "Sainte-Th\xE9r\xE8se"
    ],
    popularAvenues: [
      "Boulevard Lumumba",
      "Avenue Ndjili",
      "Avenue Kimwenza",
      "Avenue Cecomaf"
    ]
  },
  "Masina": {
    name: "Masina",
    districts: "Tshangu",
    quartiers: [
      "Sans-Fil",
      "Abattoir",
      "Mapela",
      "Petro-Congo",
      "Pascal"
    ],
    popularAvenues: [
      "Boulevard Lumumba",
      "Avenue Mokali",
      "Avenue Abattoir",
      "Avenue Pascal"
    ]
  },
  "Kinshasa": {
    name: "Kinshasa",
    districts: "Lukunga",
    quartiers: [
      "Madimba",
      "Mongala",
      "Pey-Pey",
      "Camp Militaire",
      "March\xE9 Central Zone"
    ],
    popularAvenues: [
      "Avenue Kasa-Vubu",
      "Avenue Luambo Makiadi (Bokassa)",
      "Avenue du Commerce",
      "Avenue Lowa"
    ]
  },
  "Ngiri-Ngiri": {
    name: "Ngiri-Ngiri",
    districts: "Funa",
    quartiers: [
      "Diomi",
      "Karting",
      "Saio",
      "Petit-Boulevard"
    ],
    popularAvenues: [
      "Avenue Kasa-Vubu",
      "Avenue Elengesa",
      "Avenue Ngiri-Ngiri",
      "Avenue Gambela"
    ]
  },
  "Selembao": {
    name: "Selembao",
    districts: "Funa",
    quartiers: [
      "Badiadingi",
      "Cit\xE9 Verte",
      "Inga",
      "Herady",
      "Ngafani"
    ],
    popularAvenues: [
      "Route de Matadi",
      "Avenue de la Lib\xE9ration",
      "Avenue Badiadingi",
      "Avenue Ngafani"
    ]
  },
  "Bumbu": {
    name: "Bumbu",
    districts: "Funa",
    quartiers: [
      "Kinsuka-Bumbu",
      "Mbaki",
      "Kasa-Vubu Zone",
      "Mbandaka"
    ],
    popularAvenues: [
      "Avenue de la Lib\xE9ration (24)",
      "Avenue Landu",
      "Avenue Kasa-Vubu"
    ]
  },
  "Makala": {
    name: "Makala",
    districts: "Funa",
    quartiers: [
      "Salongo-Makala",
      "Uele",
      "Mawete",
      "Bolingo"
    ],
    popularAvenues: [
      "Avenue Elengesa",
      "Avenue Universit\xE9",
      "Avenue Kikwit"
    ]
  },
  "Ngaba": {
    name: "Ngaba",
    districts: "Mont-Amba",
    quartiers: [
      "Baobab",
      "Bulambemba",
      "Kolo-Fuma",
      "Mateba"
    ],
    popularAvenues: [
      "Avenue Universit\xE9",
      "Avenue Kianza",
      "Avenue By-Pass"
    ]
  },
  "Kimbanseke": {
    name: "Kimbanseke",
    districts: "Tshangu",
    quartiers: [
      "Mombele",
      "Kingasani",
      "Mokali",
      "Bikanga",
      "Salongo-Kimbanseke"
    ],
    popularAvenues: [
      "Boulevard Lumumba",
      "Avenue Mokali",
      "Avenue de la Paix"
    ]
  },
  "Kisenso": {
    name: "Kisenso",
    districts: "Mont-Amba",
    quartiers: [
      "Regideso",
      "Amba",
      "Mission",
      "Kabu"
    ],
    popularAvenues: [
      "Avenue de la Paix",
      "Avenue Universit\xE9 Ext"
    ]
  },
  "Nsele": {
    name: "Nsele",
    districts: "Tshangu",
    quartiers: [
      "Kinkole (Port de P\xEAche)",
      "DAIPN",
      "Bibwa",
      "Mpasa 1",
      "Mpasa 2",
      "Cit\xE9 du Fleuve Nsele"
    ],
    popularAvenues: [
      "Boulevard Lumumba / RN1",
      "Route Kinkole",
      "Route DAIPN"
    ]
  },
  "Maluku": {
    name: "Maluku",
    districts: "Tshangu",
    quartiers: [
      "Maluku Centre",
      "Menkao",
      "Nguma",
      "Plateau des Bateke",
      "Mbankana"
    ],
    popularAvenues: [
      "Route Nationale 1 (RN1)",
      "Route Menkao",
      "Route Plateau Bateke"
    ]
  }
};
var KINSHASA_COMMUNES_LIST = Object.keys(KINSHASA_COMMUNES_DATA);

// src/data/contentSeed.ts
function slugifyText(input) {
  return String(input || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
var DEFAULT_BLOG_ARTICLES = [
  {
    id: "art_certificat_enregistrement_rdc",
    slug: "verifier-certificat-enregistrement-kinshasa-avant-achat",
    title: "V\xE9rifier un Certificat d'Enregistrement \xE0 Kinshasa avant tout achat immobilier",
    excerpt: "Les 6 contr\xF4les incontournables aupr\xE8s de la Conservation des Titres Immobiliers (Circonscription Fonci\xE8re) pour s\xE9curiser l'achat d'une parcelle ou d'une villa en RDC.",
    category: "juridique_foncier",
    coverImage: "/og-images/blog_foncier_titres_1795161876901.jpg",
    authorName: "Ma\xEEtre Didier Kabongo",
    authorRole: "Conseil Foncier Kinimmo",
    readTimeMinutes: 7,
    status: "published",
    featured: true,
    tags: ["Certificat d'Enregistrement", "Cadastre Kinshasa", "S\xE9curit\xE9 juridique"],
    relatedCommune: "Gombe",
    publishedAt: "2026-10-12",
    updatedAt: "2026-11-10",
    content: `## Pourquoi le Certificat d'Enregistrement est la seule preuve pleine de propri\xE9t\xE9 en RDC

En R\xE9publique D\xE9mocratique du Congo, la Loi fonci\xE8re n\xB0 73-021 du 20 juillet 1973 \xE9tablit que le sol est la propri\xE9t\xE9 exclusive de l'\xC9tat. Un particulier ou une soci\xE9t\xE9 d\xE9tient un **droit de concession** (perp\xE9tuelle pour les personnes physiques congolaises, ordinaire de 25 ans renouvelables pour les personnes morales et non-nationaux).

La d\xE9tention d'une simple \xAB fiche parcellaire \xBB ou d'un acte de vente sous seing priv\xE9 ne suffit jamais \xE0 s\xE9curiser une acquisition urbaine \xE0 Kinshasa : seul le **Certificat d'Enregistrement** d\xE9livr\xE9 par le Conservateur des Titres Immobiliers fait foi de droit.

## 1. Identifier la bonne Circonscription Fonci\xE8re

Kinshasa compte plusieurs circonscriptions fonci\xE8res (Gombe, Lukunga, Mont-Amba, Funa, Tshangu). V\xE9rifiez que le certificat pr\xE9sent\xE9 porte le sceau de la circonscription correspondant \xE0 la commune du bien et relevez le **num\xE9ro de volume et de folio**.

## 2. Demander un \xE9tat de charges et d'hypoth\xE8ques

Avant toute remise d'acompte, exigez un relev\xE9 officiel de situation juridique aupr\xE8s du Conservateur des Titres Immobiliers :
- Confirmer que le vendeur inscrit sur l'acte est bien le dernier concessionnaire enregistr\xE9 ;
- V\xE9rifier l'absence d'hypoth\xE8que bancaire, de saisie conservatoire ou d'opposition judiciaire en cours ;
- V\xE9rifier la concordance exacte des mesures cadastrales et du proc\xE8s-verbal de mesurage et de bornage.

## 3. Contr\xF4ler les procurations et successions

Dans plus d'un tiers des litiges constat\xE9s \xE0 Kinshasa, le bien appartient \xE0 une indivision successorale. Exigez le jugement d'investiture, l'acte de notori\xE9t\xE9 et la procuration notari\xE9e sign\xE9e par l'ensemble des h\xE9ritiers majeurs.

## 4. R\xE9diger l'acte authentique et op\xE9rer la mutation

La vente doit \xEAtre constat\xE9e par acte authentique (notaire) suivi du paiement des droits proportionnels d'enregistrement et de la mutation effective sur le livre d'enregistrement. Ne versez jamais la totalit\xE9 du prix avant la v\xE9rification mat\xE9rielle du dossier complet au guichet du Conservateur.`
  },
  {
    id: "art_comparatif_gombe_ngaliema_limete",
    slug: "ou-habiter-kinshasa-gombe-ngaliema-limete-comparatif",
    title: "O\xF9 habiter ou investir \xE0 Kinshasa : comparatif Gombe, Ngaliema et Limete",
    excerpt: "Analyse des loyers moyens, temps de trajet, s\xE9curit\xE9 \xE9lectrique, \xE9coles internationales et potentiel locatif dans les trois p\xF4les immobiliers les plus demand\xE9s.",
    category: "quartiers_marche",
    coverImage: "/og-images/blog_gombe_skyline_1795161879500.jpg",
    authorName: "Sarah Ntumba",
    authorRole: "Analyste March\xE9 Kinshasa",
    readTimeMinutes: 6,
    status: "published",
    featured: false,
    tags: ["Gombe", "Ngaliema", "Limete", "Investissement locatif"],
    relatedCommune: "Gombe",
    publishedAt: "2026-10-25",
    updatedAt: "2026-11-12",
    content: `## Trois march\xE9s compl\xE9mentaires selon votre objectif

Choisir un quartier \xE0 Kinshasa d\xE9termine directement votre qualit\xE9 de vie quotidienne \u2014 notamment la fluidit\xE9 des d\xE9placements vers le Boulevard du 30 Juin \u2014 et la rentabilit\xE9 locative de votre patrimoine.

## Gombe : le c\u0153ur diplomatique et des affaires

La commune de la Gombe concentre ambassades, si\xE8ges sociaux, banques et cliniques. La demande y privil\xE9gie les **appartements haut standing avec groupe \xE9lectrog\xE8ne de secours, citerne d'eau et s\xE9curit\xE9 24h/24**.
- **Profil id\xE9al** : expatri\xE9s, cadres dirigeants, cabinets, si\xE8ges ONG ;
- **Points forts** : d\xE9placements \xE0 pied ou en 10 minutes entre bureaux et services ;
- **Point d'attention** : prix d'entr\xE9e \xE9lev\xE9 au m\xB2 et raret\xE9 des grandes parcelles familiales avec jardin.

## Ngaliema (Binza Macampagne, Pigeon, Joli Parc) : le refuge r\xE9sidentiel

Ngaliema s\xE9duit les familles et les r\xE9sidences diplomatiques gr\xE2ce \xE0 ses avenues arbor\xE9es, ses vues sur le fleuve Congo et ses villas sur parcelles de 800 \xE0 2 500 m\xB2.
- **Points forts** : calme r\xE9sidentiel, proximit\xE9 des \xE9coles internationales, grand choix de villas avec piscine ;
- **Point d'attention** : anticiper les heures de pointe sur l'avenue de l'OUA et la route de Matadi.

## Limete R\xE9sidentiel : l'\xE9quilibre accessibilit\xE9 et rendement

Les rues r\xE9sidentielles num\xE9rot\xE9es de Limete offrent un acc\xE8s rapide \xE0 l'a\xE9roport de N'djili et vers le centre-ville via le Boulevard Lumumba. Les duplex modernes y affichent des taux d'occupation \xE9lev\xE9s aupr\xE8s des cadres congolais et PME.`
  },
  {
    id: "art_bail_residentiel_kinshasa",
    slug: "contrat-bail-kinshasa-garantie-locative-preavis",
    title: "Contrat de bail \xE0 Kinshasa : garantie locative, dur\xE9e et \xE9tat des lieux",
    excerpt: "Comment encadrer votre location d'appartement ou de maison \xE0 Kinshasa : mois de garantie, indexation, charges d'entretien, groupe \xE9lectrog\xE8ne et restitution.",
    category: "guide_location",
    coverImage: "/og-images/blog_villa_ngaliema_1795161878137.jpg",
    authorName: "Patrick Mukendi",
    authorRole: "Responsable Gestion Locative",
    readTimeMinutes: 5,
    status: "published",
    featured: false,
    tags: ["Contrat de bail", "Garantie locative", "Locataire Kinshasa"],
    relatedCommune: "Ngaliema",
    publishedAt: "2026-11-01",
    updatedAt: "2026-11-15",
    content: `## Clarifier les usages de la garantie locative d\xE8s la signature

\xC0 Kinshasa, la n\xE9gociation du bail porte souvent sur la dur\xE9e d'avance et le montant de la garantie locative (couramment comprise entre **2 et 3 mois de loyer** pour un bail r\xE9sidentiel classique). Exigez toujours que l'affectation exacte de chaque somme vers\xE9e soit inscrite en toutes lettres dans le contrat.

## Les 5 clauses \xE0 v\xE9rifier imp\xE9rativement avant de payer

1. **Inventaire et \xE9tat des lieux contradictoire** : photographiez compteurs SNEL, REGIDESO, climatiseurs, pompes et menuiseries \xE0 la remise des cl\xE9s.
2. **Maintenance du groupe \xE9lectrog\xE8ne et du forage** : pr\xE9cisez par \xE9crit qui prend en charge l'entretien courant (vidanges, filtres) et les grosses r\xE9parations moteur.
3. **Modalit\xE9s de r\xE8glement et quittances** : exigez une quittance dat\xE9e et num\xE9rot\xE9e \xE0 chaque paiement mensuel.
4. **D\xE9lai de pr\xE9avis** : pr\xE9voyez un pr\xE9avis clair (g\xE9n\xE9ralement 3 mois pour un bail r\xE9sidentiel, 6 mois pour un bail commercial) et les conditions de restitution de la garantie.
5. **Enregistrement du bail** : un bail \xE9crit dat\xE9 et enregistr\xE9 vous prot\xE8ge en cas de changement de propri\xE9taire.`
  },
  {
    id: "art_vendre_louer_plus_vite",
    slug: "publier-annonce-immobiliere-efficace-kinshasa",
    title: "Comment pr\xE9parer votre bien pour louer ou vendre 2 fois plus vite \xE0 Kinshasa",
    excerpt: "Lumi\xE8re naturelle, photos nettes, vid\xE9o 30 secondes, affichage du loyer transparent et QR code panneau : les standards des annonces qui convertissent.",
    category: "conseils_pro",
    coverImage: "/og-images/blog_quartier_limete_1795161878489.jpg",
    authorName: "\xC9quipe \xC9ditoriale Kinimmo",
    authorRole: "Accompagnement Agences",
    readTimeMinutes: 4,
    status: "published",
    featured: false,
    tags: ["Photos immobili\xE8res", "Visite vid\xE9o", "QR code panneau"],
    relatedCommune: "Limete",
    publishedAt: "2026-11-05",
    updatedAt: "2026-11-16",
    content: `## La confiance commence par la transparence du dossier visuel

Les acheteurs et locataires \xE0 Kinshasa \u2014 qu'ils soient sur place ou issus de la diaspora \u2014 \xE9cartent en quelques secondes les annonces floues ou sans indication de quartier pr\xE9cis.

## Checklist de publication haute performance

- **6 \xE0 10 photos lumineuses en format paysage** : s\xE9jour, cuisine \xE9quip\xE9e, chambres, salles de bain, fa\xE7ade et jardin/parking.
- **Une visite vid\xE9o verticale de 30 secondes** : film\xE9e de jour avec un smartphone stabilis\xE9 pour montrer les volumes r\xE9els et rassurer les clients \xE0 distance.
- **Une localisation par point de rep\xE8re cr\xE9dible** : indiquer la commune, le quartier et un rep\xE8re connu (\xAB \xE0 3 min de l'avenue des \xC9curies \xBB) multiplie les demandes qualifi\xE9es sans exposer l'adresse exacte.
- **Un panneau \xAB \xC0 VENDRE / \xC0 LOUER \xBB \xE9quip\xE9 du QR code Kinimmo** : permet aux passants de consulter imm\xE9diatement le prix, les photos et d'\xE9crire sur WhatsApp sans appel inutile.`
  },
  {
    id: "art_paiement_mobile_money_securite",
    slug: "payer-abonnement-boost-mobile-money-securite-rdc",
    title: "Mobile Money (M-Pesa, Airtel, Orange) : bonnes pratiques pour vos transactions immobili\xE8res",
    excerpt: "Comment v\xE9rifier un compte marchand officiel, conserver vos r\xE9f\xE9rences de transaction et obtenir vos re\xE7us certifi\xE9s sur Kinimmo.",
    category: "guide_achat",
    coverImage: "/og-images/blog_gombe_skyline_1795161879500.jpg",
    authorName: "\xC9quipe Confiance Kinimmo",
    authorRole: "S\xE9curit\xE9 & Facturation",
    readTimeMinutes: 4,
    status: "published",
    featured: false,
    tags: ["Mobile Money RDC", "M-Pesa", "Anti-arnaque"],
    relatedCommune: "Kintambo",
    publishedAt: "2026-11-08",
    updatedAt: "2026-11-18",
    content: `## Ne payez jamais de frais de visite avant d'avoir vu le bien

Un principe d'or sur le march\xE9 immobilier kinois : aucune visite s\xE9rieuse organis\xE9e par une agence v\xE9rifi\xE9e ne doit exiger un envoi d'argent pr\xE9alable \xE0 un inconnu sur Mobile Money pour \xAB r\xE9server le transport \xBB ou \xAB bloquer la visite \xBB.

## V\xE9rifier vos paiements de services et d'abonnements

Lorsque vous r\xE9glez un abonnement Pro, Agence ou un Boost de visibilit\xE9 sur la plateforme :
1. Utilisez exclusivement les **num\xE9ros marchands affich\xE9s dans votre facture officielle** ;
2. Saisissez votre r\xE9f\xE9rence SMS compl\xE8te (et joignez la capture si besoin) pour faire passer la facture en validation ;
3. T\xE9l\xE9chargez votre **re\xE7u PDF num\xE9rot\xE9 avec QR code** d\xE8s la confirmation par notre \xE9quipe.`
  }
];
var DEFAULT_LEGAL_COMPANY_META = {
  companyName: "KIN IMMOBILIER RDC SARL (\xC0 compl\xE9ter)",
  legalForm: "Soci\xE9t\xE9 \xE0 Responsabilit\xE9 Limit\xE9e (SARL)",
  rccm: "CD/KIN/RCCM/XX-B-XXXXX (\xC0 compl\xE9ter apr\xE8s validation)",
  idNat: "01-XXXX-NXXXXX (\xC0 compl\xE9ter)",
  nif: "AXXXXXXXX (\xC0 compl\xE9ter)",
  headquartersAddress: "Avenue Kananga, Q/ Binza Pigeon, C/ Ngaliema, Kinshasa, RDC",
  publicationDirector: "Direction G\xE9n\xE9rale Kinimmo",
  contactEmail: "joosskalu72@gmail.com",
  dpoEmail: "confidentialite@kinimmo.cd",
  supportPhone: "+243 84 529 4616",
  hostingProvider: "Infrastructure Cloud S\xE9curis\xE9e & Serveurs Web Hostinger / Node.js"
};
var DEFAULT_LEGAL_DOCUMENTS = [
  {
    slug: "conditions-utilisation",
    title: "Conditions G\xE9n\xE9rales d'Utilisation",
    subtitle: "R\xE8gles d'acc\xE8s, publication d'annonces, abonnements et responsabilit\xE9 sur la plateforme Kinimmo en RDC.",
    needsLegalReview: true,
    legalReviewNotice: "Document indicatif r\xE9dig\xE9 pour le cadre l\xE9gal de la R\xE9publique D\xE9mocratique du Congo \u2014 \xC0 faire valider par votre conseil juridique avant exploitation d\xE9finitive.",
    effectiveDate: "2026-11-01",
    updatedAt: "2026-11-18",
    companyMeta: DEFAULT_LEGAL_COMPANY_META,
    sections: [
      {
        id: "cgu_objet",
        heading: "1. Objet de la plateforme",
        body: `La plateforme Kinshasa Immobilier (Kinimmo) fournit un service num\xE9rique de mise en relation, de diffusion d'annonces immobili\xE8res, de visites vid\xE9o, de conciergerie VIP et d'outils de gestion destin\xE9s aux particuliers, agents immobiliers et agences op\xE9rant principalement \xE0 Kinshasa et en R\xE9publique D\xE9mocratique du Congo.

Kinimmo agit en qualit\xE9 d'interm\xE9diaire technique d'h\xE9bergement et d'organisation de rendez-vous, sauf mandat \xE9crit distinct express\xE9ment conclu dans le cadre du service de Conciergerie VIP.`
      },
      {
        id: "cgu_comptes",
        heading: "2. Inscription, v\xE9rification d\u2019identit\xE9 et exactitude des annonces",
        body: `Tout annonceur (propri\xE9taire, agent ind\xE9pendant ou agence immobili\xE8re) s'engage \xE0 fournir des informations exactes, \xE0 jour et v\xE9rifiables sur son identit\xE9, son agr\xE9ment professionnel le cas \xE9ch\xE9ant (RCCM, carte professionnelle) ainsi que sur les caract\xE9ristiques r\xE9elles du bien publi\xE9 (prix en USD/CDF, surface, commune, statut de disponibilit\xE9 et titre foncier).

La publication d'annonces fictives, de photos d\xE9tourn\xE9es, de prix volontairement trompeurs ou la sollicitation de paiements abusifs avant visite entra\xEEnent la suspension imm\xE9diate du compte sans pr\xE9avis.`
      },
      {
        id: "cgu_abonnements",
        heading: "3. Formules d\u2019abonnement, paiements Mobile Money et r\xE9trogradation douce",
        body: `Les forfaits payants (mensuels ou annuels) et options de boost peuvent \xEAtre r\xE9gl\xE9s par Mobile Money (M-Pesa, Airtel Money, Orange Money) ou virement aupr\xE8s des comptes marchands affich\xE9s sur la facture g\xE9n\xE9r\xE9e. L'activation intervient apr\xE8s v\xE9rification et \xE9mission d'un re\xE7u num\xE9rot\xE9.

En cas d'expiration d'un abonnement sans renouvellement, une r\xE9trogradation douce vers le plan gratuit s'applique automatiquement : les annonces exc\xE9dant le plafond du plan gratuit sont masqu\xE9es au public sans \xEAtre supprim\xE9es et redeviennent visibles d\xE8s le renouvellement.`
      },
      {
        id: "cgu_propriete_intellectuelle",
        heading: "4. Propri\xE9t\xE9 intellectuelle et partage",
        body: `Les marques, interfaces, codes sources, guides \xE9ditoriaux et fiches PDF g\xE9n\xE9r\xE9es par la plateforme demeurent la propri\xE9t\xE9 de l'\xE9diteur. Les annonceurs garantissent d\xE9tenir l'ensemble des droits d'utilisation sur les photographies, plans et vid\xE9os mis en ligne.`
      },
      {
        id: "cgu_droit_applicable",
        heading: "5. Droit applicable et r\xE8glement des litiges",
        body: `Les pr\xE9sentes conditions sont r\xE9gies par le droit positif de la R\xE9publique D\xE9mocratique du Congo et les Actes Uniformes OHADA applicables. Tout diff\xE9rend fera l'objet d'une tentative de r\xE8glement amiable pr\xE9alable avant saisine des juridictions comp\xE9tentes de Kinshasa.`
      }
    ]
  },
  {
    slug: "confidentialite",
    title: "Politique de Confidentialit\xE9 & Protection des Donn\xE9es",
    subtitle: "Collecte, usage, s\xE9curisation et droits relatifs \xE0 vos donn\xE9es personnelles conform\xE9ment au Code du Num\xE9rique RDC.",
    needsLegalReview: true,
    legalReviewNotice: "Document indicatif conforme aux principes du Code du Num\xE9rique de la RDC \u2014 \xC0 faire valider par votre conseil juridique.",
    effectiveDate: "2026-11-01",
    updatedAt: "2026-11-18",
    companyMeta: DEFAULT_LEGAL_COMPANY_META,
    sections: [
      {
        id: "conf_collecte",
        heading: "1. Donn\xE9es personnelles collect\xE9es",
        body: `Dans le cadre de l'utilisation de Kinimmo, nous collectons uniquement les donn\xE9es strictement n\xE9cessaires au service : identit\xE9 (nom, pr\xE9nom), coordonn\xE9es de contact (num\xE9ro WhatsApp, t\xE9l\xE9phone, e-mail), pi\xE8ces justificatives soumises volontairement pour la v\xE9rification Kinimmo Trust, pr\xE9f\xE9rences de recherche, demandes de visite ou de conciergerie, ainsi que les preuves de paiement de facturation.`
      },
      {
        id: "conf_finalites",
        heading: "2. Finalit\xE9s du traitement",
        body: `Vos donn\xE9es sont utilis\xE9es exclusivement pour :
- Cr\xE9er et s\xE9curiser votre compte utilisateur, agent ou agence ;
- Transmettre vos demandes de visite ou de renseignements \xE0 l'annonceur concern\xE9 ;
- Traiter vos dossiers de conciergerie VIP et d'abonnement/facturation ;
- Lutter contre la fraude immobili\xE8re, les annonces suspectes et le d\xE9marchage abusif ;
- \xC9tablir des statistiques anonymis\xE9es du march\xE9 immobilier par commune.`
      },
      {
        id: "conf_conservation",
        heading: "3. Localisation approximative des biens et s\xE9curit\xE9",
        body: `Afin de prot\xE9ger la s\xE9curit\xE9 et la vie priv\xE9e des occupants et propri\xE9taires, la carte publique n'affiche qu'une zone approximative et des points de rep\xE8re connus. Les documents de v\xE9rification d'identit\xE9 et justificatifs Mobile Money sont accessibles uniquement aux personnes habilit\xE9es de la mod\xE9ration.`
      },
      {
        id: "conf_droits",
        heading: "4. Vos droits d\u2019acc\xE8s, de rectification et de suppression",
        body: `Conform\xE9ment aux dispositions applicables au traitement des donn\xE9es \xE0 caract\xE8re personnel en RDC, vous disposez d'un droit d'acc\xE8s, de rectification, de mise \xE0 jour et de suppression de vos informations personnelles. Vous pouvez exercer ces droits \xE0 tout moment en \xE9crivant au D\xE9l\xE9gu\xE9 \xE0 la Protection des Donn\xE9es indiqu\xE9 dans les coordonn\xE9es ci-contre.`
      }
    ]
  },
  {
    slug: "mentions-legales",
    title: "Mentions L\xE9gales",
    subtitle: "Identification de l\u2019\xE9diteur, direction de publication, h\xE9bergement et coordonn\xE9es officielles.",
    needsLegalReview: true,
    legalReviewNotice: "Compl\xE9tez vos num\xE9ros officiels RCCM, Id. Nat. et NIF dans l\u2019onglet CMS Administrateur puis faites valider ces mentions par votre conseil.",
    effectiveDate: "2026-11-01",
    updatedAt: "2026-11-18",
    companyMeta: DEFAULT_LEGAL_COMPANY_META,
    sections: [
      {
        id: "ml_editeur",
        heading: "1. \xC9diteur du site et de l\u2019application",
        body: `La plateforme Kinshasa Immobilier (Kinimmo) est \xE9dit\xE9e par la soci\xE9t\xE9 identifi\xE9e dans l'encadr\xE9 officiel ci-contre, immatricul\xE9e au Registre du Commerce et du Cr\xE9dit Mobilier (RCCM) de Kinshasa, R\xE9publique D\xE9mocratique du Congo.`
      },
      {
        id: "ml_hebergement",
        heading: "2. H\xE9bergement et disponibilit\xE9 technique",
        body: `L'application web, les API temps r\xE9el et les sauvegardes sont h\xE9berg\xE9s sur une infrastructure s\xE9curis\xE9e redond\xE9e garantissant le chiffrement des \xE9changes HTTPS et la continuit\xE9 de service.`
      },
      {
        id: "ml_moderation",
        heading: "3. Signalement d\u2019un contenu illicite ou d\u2019une annonce suspecte",
        body: `Tout utilisateur peut signaler une annonce inexacte, d\xE9j\xE0 lou\xE9e/vendue ou suspecte en deux clics directement depuis la fiche du bien (menu \xAB \u2026 \xBB -> \xAB Signaler cette annonce \xBB) ou par e-mail aupr\xE8s de notre \xE9quipe de mod\xE9ration.`
      }
    ]
  }
];
var DEFAULT_FAQ_ITEMS = [
  {
    id: "faq_1",
    category: "acheteurs_locataires",
    question: "Comment demander une visite ou contacter un annonceur sur Kinimmo ?",
    answer: "Sur chaque fiche annonce (/annonces/:slug), utilisez la barre d'actions fixe en bas d'\xE9cran : cliquez sur WhatsApp pour \xE9crire directement \xE0 l'annonceur, sur Appeler pour joindre son t\xE9l\xE9phone, ou sur Demander une visite pour proposer un cr\xE9neau horaire pr\xE9cis."
  },
  {
    id: "faq_2",
    category: "acheteurs_locataires",
    question: "Pourquoi la carte sur la fiche annonce indique-t-elle une zone approximative ?",
    answer: "Pour pr\xE9server la s\xE9curit\xE9 des r\xE9sidents et \xE9viter les visites impromptues sans rendez-vous, la carte publique affiche un cercle de zone approximatif autour du quartier et des points de rep\xE8re officiels. L'adresse exacte est communiqu\xE9e lors de la confirmation de la visite."
  },
  {
    id: "faq_3",
    category: "securite_confiance",
    question: "Que signifie le niveau de v\xE9rification Kinimmo Trust sur un profil ou un bien ?",
    answer: "Kinimmo Trust v\xE9rifie la coh\xE9rence de l'identit\xE9 de l'annonceur (pi\xE8ce d'identit\xE9, RCCM pour les agences) et des justificatifs fonciers soumis. Un badge v\xE9rifi\xE9 r\xE9duit fortement les risques d'interm\xE9diaires non mandat\xE9s, sans remplacer l'audit cadastral final avant signature."
  },
  {
    id: "faq_4",
    category: "securite_confiance",
    question: "Comment signaler une annonce suspecte ou d\xE9j\xE0 lou\xE9e ?",
    answer: "Ouvrez la fiche du bien, touchez le bouton \xAB \u2026 \xBB dans la barre d'actions en bas, puis s\xE9lectionnez \xAB Signaler cette annonce \xBB. Choisissez le motif (faux prix, bien d\xE9j\xE0 vendu/lou\xE9, demande d'avance suspecte) : le signalement est envoy\xE9 en deux appuis \xE0 notre mod\xE9ration."
  },
  {
    id: "faq_5",
    category: "proprietaires_agences",
    question: "Comment obtenir le QR code \xE0 coller sur mon panneau \xAB \xC0 vendre \xBB ou \xAB \xC0 louer \xBB ?",
    answer: "Depuis la fiche de votre annonce, cliquez sur \xAB Partager \xBB ou \xAB QR & Panneau \xBB : vous pouvez t\xE9l\xE9charger le QR code en PNG ou en SVG haute d\xE9finition, ou imprimer directement l'affiche PDF pr\xEAte \xE0 poser avec le bandeau \xAB \xC0 VENDRE / \xC0 LOUER \xBB et le lien court."
  },
  {
    id: "faq_6",
    category: "paiements_plans",
    question: "Comment fonctionne le paiement manuel par Mobile Money (M-Pesa, Airtel Money, Orange Money) ?",
    answer: "S\xE9lectionnez votre formule ou option de boost : une facture unique (FAC-KIN-...) est cr\xE9\xE9e avec les num\xE9ros marchands configur\xE9s par Kinimmo. Effectuez le transfert, saisissez la r\xE9f\xE9rence SMS et joignez si souhait\xE9 une capture d'\xE9cran. D\xE8s validation par l'administration, votre plan s'active et votre re\xE7u PDF avec QR code est g\xE9n\xE9r\xE9."
  },
  {
    id: "faq_7",
    category: "paiements_plans",
    question: "Que deviennent mes annonces si mon abonnement expire ?",
    answer: "Aucune annonce n'est supprim\xE9e : une r\xE9trogradation douce s'applique. Vos annonces les plus r\xE9centes restent publi\xE9es dans la limite du plan gratuit, et l'exc\xE9dent est simplement masqu\xE9 au public jusqu'au prochain renouvellement."
  },
  {
    id: "faq_8",
    category: "conciergerie",
    question: "Dans quels cas faire appel \xE0 la Conciergerie VIP Kinimmo ?",
    answer: "La Conciergerie VIP accompagne les particuliers exigeants, cadres expatri\xE9s, membres de la diaspora et entreprises souhaitant d\xE9l\xE9guer la pr\xE9s\xE9lection de biens v\xE9rifi\xE9s, la planification des visites group\xE9es \xE0 Kinshasa et l'appui jusqu'\xE0 la signature."
  }
];
var CURATED_COMMUNE_PROFILES = {
  gombe: {
    tagline: "Centre diplomatique, financier et r\xE9sidentiel haut standing de Kinshasa",
    description: "La Gombe borde le fleuve Congo et regroupe les minist\xE8res, ambassades, si\xE8ges bancaires, cliniques internationales et r\xE9sidences de standing. C'est le secteur le plus recherch\xE9 pour les appartements s\xE9curis\xE9s, penthouses et bureaux cl\xE9s en main.",
    highlights: ["Proximit\xE9 imm\xE9diate du Boulevard du 30 Juin", "Immeubles avec groupe \xE9lectrog\xE8ne et gardiennage 24/7", "Forte liquidit\xE9 locative aupr\xE8s des expatri\xE9s et si\xE8ges sociaux"],
    landmarks: ["Boulevard du 30 Juin", "Gare Centrale", "Clinique Ngaliema", "H\xF4tel Memling & Fleuve Congo"],
    advisorTip: "V\xE9rifiez syst\xE9matiquement les charges de copropri\xE9t\xE9 (groupe \xE9lectrog\xE8ne, eau, s\xE9curit\xE9) souvent factur\xE9es en suppl\xE9ment du loyer de base.",
    neighborSlugs: ["ngaliema", "kintambo", "lingwala", "barumbu"]
  },
  ngaliema: {
    tagline: "Villas r\xE9sidentielles, ambassades et vues panoramiques sur le fleuve Congo",
    description: "Vaste commune r\xE9sidentielle de l'Ouest kinois, Ngaliema abrite les quartiers pris\xE9s de Binza Macampagne, Binza Pigeon, Joli Parc et Basoko/GB. Elle s\xE9duit par ses parcelles verdoyantes, ses \xE9coles internationales et ses villas familiales avec piscine.",
    highlights: ["Grandes parcelles arbor\xE9es et villas familiales", "\xC9coles internationales et commerces sur l\u2019avenue des \xC9curies", "Quartiers calmes pris\xE9s par les diplomates et familles"],
    landmarks: ["Avenue Ma Campagne", "Binza Pigeon", "Mont Ngaliema / OUA", "Avenue des \xC9curies"],
    advisorTip: "\xC9valuez les trajets aux heures de pointe vers la Gombe selon que le bien se trouve c\xF4t\xE9 Basoko/GB, Macampagne ou Pigeon.",
    neighborSlugs: ["gombe", "kintambo", "mont-ngafula", "binza-pigeon"]
  },
  limete: {
    tagline: "Quartier r\xE9sidentiel structur\xE9 entre centre-ville et axe a\xE9roportuaire",
    description: "Reconnue pour le trac\xE9 g\xE9om\xE9trique de ses rues r\xE9sidentielles num\xE9rot\xE9es le long du Boulevard Lumumba, Limete combine vie de quartier dynamique, duplex modernes et accessibilit\xE9 rapide vers Gombe comme vers l'a\xE9roport de N'djili.",
    highlights: ["Rues r\xE9sidentielles num\xE9rot\xE9es et accessibles", "Fort dynamisme des immeubles R+2 / duplex r\xE9cents", "Acc\xE8s direct vers le Boulevard Lumumba"],
    landmarks: ["\xC9changeur de Limete", "Boulevard Lumumba", "7\xE8me et 10\xE8me Rues R\xE9sidentielles", "Place des Artistes"],
    advisorTip: "Privil\xE9giez les rues r\xE9sidentielles bitum\xE9es (1\xE8re \xE0 15\xE8me rue) avec bon drainage pluvial et transformateur d\xE9di\xE9.",
    neighborSlugs: ["matete", "kalamu", "lemba", "barumbu"]
  },
  kintambo: {
    tagline: "Carrefour historique entre Gombe et Ngaliema avec forte vie commer\xE7ante",
    description: "Situ\xE9e \xE0 la jonction strat\xE9gique de l'avenue Colonel Mondjiba et de Kintambo Magasin, la commune attire jeunes actifs, cabinets et investisseurs cherchant des appartements modernes \xE0 10 minutes de la Gombe.",
    highlights: ["Connexion imm\xE9diate vers Gombe et Ngaliema", "Loyers plus accessibles qu\u2019\xE0 la Gombe pour un emplacement central", "Commerces et transports abondants"],
    landmarks: ["Rond-point Kintambo Magasin", "Avenue Colonel Mondjiba", "H\xF4pital de Kintambo", "Quartier Jama\xEFque"],
    advisorTip: "Les appartements r\xE9nov\xE9s proches de l'axe Mondjiba offrent d'excellents rendements locatifs tout au long de l'ann\xE9e.",
    neighborSlugs: ["gombe", "ngaliema", "bandalungwa"]
  },
  "mont-ngafula": {
    tagline: "Collines verdoyantes, grands terrains titr\xE9s et nouveaux lotissements",
    description: "Au sud-ouest de Kinshasa, Mont-Ngafula offre de grands espaces constructibles, des cit\xE9s r\xE9sidentielles r\xE9centes (Cit\xE9 Mama Mobutu, Righini, Kimbondo) et un cadre plus a\xE9r\xE9 en altitude.",
    highlights: ["Terrains vastes \xE0 prix comp\xE9titifs", "Programmes de villas contemporaines sur lotissements", "Proximit\xE9 du campus universitaire UNIKIN"],
    landmarks: ["Triangle de Mont-Ngafula", "Cit\xE9 Mama Mobutu", "Righini", "Route By-Pass"],
    advisorTip: "Lors de l'achat d'un terrain nu \xE0 Mont-Ngafula, faites v\xE9rifier le bornage et l'absence de chevauchement aupr\xE8s du cadastre de Lukunga.",
    neighborSlugs: ["ngaliema", "lemba", "makala"]
  },
  bandalungwa: {
    tagline: "Commune vivante pris\xE9e des cadres, studios modernes et commerces urbains",
    description: "Bandalungwa est appr\xE9ci\xE9e pour sa convivialit\xE9, ses avenues \xE9clair\xE9es et le d\xE9veloppement rapide de r\xE9sidences R+2 proposant des appartements 2 \xE0 3 chambres tr\xE8s demand\xE9s.",
    highlights: ["Forte demande locative pour studios et 2 chambres", "Ambiance urbaine anim\xE9e et commerces de proximit\xE9", "Position centrale dans le district de la Funa"],
    landmarks: ["Avenue Kasa-Vubu", "Makelele", "Tshibangu", "Moulin"],
    advisorTip: "V\xE9rifiez la pr\xE9sence d'une citerne d'eau et d'un raccordement stable lors de la visite d'immeubles r\xE9cents.",
    neighborSlugs: ["kintambo", "lingwala", "kalamu"]
  }
};
var KEY_QUARTIERS_EXTRA = [
  {
    name: "Binza Pigeon",
    commune: "Ngaliema",
    tagline: "Quartier r\xE9sidentiel tr\xE8s demand\xE9 \xE0 Ngaliema avec acc\xE8s rapide vers Kintambo",
    landmarks: ["Rond-point Binza Pigeon", "Avenue Kananga", "Route de Matadi"],
    description: "Binza Pigeon attire familles, cadres et agences gr\xE2ce \xE0 son \xE9quilibre entre calme r\xE9sidentiel, \xE9coles et proximit\xE9 directe avec Kintambo et la Gombe."
  },
  {
    name: "Binza Macampagne",
    commune: "Ngaliema",
    tagline: "Secteur r\xE9sidentiel de r\xE9f\xE9rence pour villas de standing et r\xE9sidences s\xE9curis\xE9es",
    landmarks: ["Avenue Ma Campagne", "Avenue des \xC9curies", "Supermarch\xE9s Macampagne"],
    description: "Binza Macampagne est l'un des quartiers les plus cot\xE9s de Kinshasa pour les villas contemporaines, les r\xE9sidences diplomatiques et les programmes neufs avec piscine."
  },
  {
    name: "Socimat",
    commune: "Gombe",
    tagline: "Axe strat\xE9gique entre la Gombe et Ngaliema autour du Boulevard du 30 Juin",
    landmarks: ["Rond-point Socimat", "Avenue Colonel Mondjiba", "Boulevard du 30 Juin"],
    description: "Autour du rond-point Socimat, les tours r\xE9sidentielles et immeubles de bureaux offrent un acc\xE8s imm\xE9diat aux institutions et h\xF4tels de la Gombe."
  },
  {
    name: "Limete R\xE9sidentiel",
    commune: "Limete",
    tagline: "Les avenues num\xE9rot\xE9es historiques d\xE9di\xE9es \xE0 l\u2019habitat familial et aux duplex",
    landmarks: ["7\xE8me Rue R\xE9sidentielle", "10\xE8me Rue R\xE9sidentielle", "Boulevard Lumumba"],
    description: "Limete R\xE9sidentiel rassemble des parcelles spacieuses, des duplex de standing et des \xE9coles r\xE9put\xE9es au c\u0153ur du district du Mont-Amba."
  },
  {
    name: "Righini",
    commune: "Mont-Ngafula",
    tagline: "Quartier calme proche de l\u2019UNIKIN pris\xE9 pour les maisons familiales et investissements",
    landmarks: ["Avenue Universit\xE9", "By-Pass", "Campus UNIKIN"],
    description: "Situ\xE9 entre Lemba et Mont-Ngafula, Righini offre des parcelles g\xE9n\xE9reuses et des immeubles locatifs appr\xE9ci\xE9s des enseignants, chercheurs et familles."
  }
];
function computeStatsForProperties(list) {
  const active = list.filter((p) => {
    const statusUpper = String(p?.listingStatus || "").toUpperCase();
    return p && p.published !== false && statusUpper !== "ARCHIVED" && statusUpper !== "REJECTED";
  });
  const sale = active.filter((p) => p.status === "for-sale" && p.price > 0);
  const rent = active.filter((p) => p.status === "for-rent" && p.price > 0);
  const withArea = sale.filter((p) => p.area && p.area > 0);
  const allPrices = active.map((p) => Number(p.price || 0)).filter((n) => n > 0);
  return {
    activeCount: active.length,
    saleCount: sale.length,
    rentCount: rent.length,
    avgSalePriceUsd: sale.length > 0 ? Math.round(sale.reduce((s, p) => s + Number(p.price || 0), 0) / sale.length) : null,
    avgRentPriceUsd: rent.length > 0 ? Math.round(rent.reduce((s, p) => s + Number(p.price || 0), 0) / rent.length) : null,
    avgPricePerSqmUsd: withArea.length > 0 ? Math.round(withArea.reduce((s, p) => s + Number(p.price || 0) / Number(p.area || 1), 0) / withArea.length) : null,
    minPriceUsd: allPrices.length > 0 ? Math.min(...allPrices) : null,
    maxPriceUsd: allPrices.length > 0 ? Math.max(...allPrices) : null
  };
}
function matchesNeighborhood(prop, profile) {
  const propCommune = slugifyText(prop.commune || "");
  const propQuartier = slugifyText(prop.quartier || "");
  const propAddress = slugifyText(prop.address || "");
  const targetSlug = slugifyText(profile.name);
  const communeSlug = slugifyText(profile.commune);
  if (profile.kind === "commune") {
    return propCommune === communeSlug || propAddress.includes(communeSlug);
  }
  return propQuartier.includes(targetSlug) || propAddress.includes(targetSlug) || propCommune === communeSlug && slugifyText(prop.title || "").includes(targetSlug);
}
function buildNeighborhoodDirectory(properties = []) {
  const profiles = [];
  Object.values(KINSHASA_COMMUNES_DATA).forEach((communeData) => {
    const slug = slugifyText(communeData.name);
    const curated = CURATED_COMMUNE_PROFILES[slug];
    const baseProfile = {
      slug,
      name: communeData.name,
      commune: communeData.name,
      district: communeData.districts || "Kinshasa",
      kind: "commune",
      tagline: curated?.tagline || `Annonces immobili\xE8res v\xE9rifi\xE9es, maisons, terrains et appartements \xE0 ${communeData.name}`,
      description: curated?.description || `La commune de ${communeData.name} (district de ${communeData.districts || "Kinshasa"}) offre un march\xE9 immobilier actif pour la vente de parcelles, maisons familiales et locations r\xE9sidentielles autour de ses quartiers phares (${communeData.quartiers.slice(0, 4).join(", ")}).`,
      highlights: curated?.highlights || [
        `Quartiers principaux : ${communeData.quartiers.slice(0, 3).join(", ")}`,
        `Axes cl\xE9s : ${communeData.popularAvenues.slice(0, 2).join(", ")}`,
        "Annonces contr\xF4l\xE9es par la mod\xE9ration Kinimmo"
      ],
      landmarks: curated?.landmarks || communeData.popularAvenues.slice(0, 4),
      advisorTip: curated?.advisorTip || `Comparez plusieurs biens similaires \xE0 ${communeData.name} et v\xE9rifiez toujours les titres fonciers ainsi que les raccordements eau/\xE9lectricit\xE9 avant signature.`,
      neighborSlugs: curated?.neighborSlugs || ["gombe", "ngaliema", "limete", "kintambo"].filter((s) => s !== slug)
    };
    const matching = properties.filter((p) => matchesNeighborhood(p, baseProfile));
    profiles.push({
      ...baseProfile,
      stats: computeStatsForProperties(matching)
    });
  });
  KEY_QUARTIERS_EXTRA.forEach((q) => {
    const slug = slugifyText(q.name);
    const communeSlug = slugifyText(q.commune);
    const baseProfile = {
      slug,
      name: q.name,
      commune: q.commune,
      district: KINSHASA_COMMUNES_DATA[q.commune]?.districts || "Kinshasa",
      kind: "quartier",
      tagline: q.tagline,
      description: q.description,
      highlights: [
        `Situ\xE9 dans la commune de ${q.commune}`,
        `Rep\xE8res cl\xE9s : ${q.landmarks.join(", ")}`,
        "Demande active en location et acquisition v\xE9rifi\xE9e"
      ],
      landmarks: q.landmarks,
      advisorTip: `Demandez \xE0 l'annonceur la distance pr\xE9cise par rapport aux rep\xE8res de ${q.name} lors de la confirmation de visite.`,
      neighborSlugs: [communeSlug, "gombe", "ngaliema", "limete"].filter((s, i, a) => s !== slug && a.indexOf(s) === i)
    };
    const matching = properties.filter((p) => matchesNeighborhood(p, baseProfile));
    profiles.push({
      ...baseProfile,
      stats: computeStatsForProperties(matching)
    });
  });
  return profiles;
}
function resolveNeighborhoodBySlug(slug, properties = []) {
  const normalized = slugifyText(decodeURIComponent(slug || ""));
  if (!normalized) return null;
  const all = buildNeighborhoodDirectory(properties);
  return all.find((n) => n.slug === normalized) || null;
}

// src/utils/shareUtils.ts
function slugifyText2(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
}
function getPropertySlug(propertyOrMeta) {
  if (propertyOrMeta.slug && propertyOrMeta.slug.trim()) {
    return propertyOrMeta.slug.trim();
  }
  const titlePart = slugifyText2(propertyOrMeta.title || "annonce-kinimmo");
  const locPart = slugifyText2(propertyOrMeta.commune || propertyOrMeta.city || "kinshasa");
  const rawId = String(propertyOrMeta.id || "").trim();
  const base = [titlePart, locPart].filter(Boolean).join("-") || "annonce";
  return rawId ? `${base}--${rawId}` : base;
}
function extractPropertyIdFromSlug(slugOrId) {
  const clean = decodeURIComponent(String(slugOrId || "").trim());
  if (!clean) return "";
  const separatorIdx = clean.lastIndexOf("--");
  if (separatorIdx !== -1 && separatorIdx + 2 < clean.length) {
    return clean.slice(separatorIdx + 2);
  }
  return clean;
}
function resolvePropertyBySlugOrId(slugOrId, properties) {
  const clean = decodeURIComponent(String(slugOrId || "").trim());
  if (!clean) return void 0;
  const direct = properties.find((p) => p.id === clean || p.slug === clean);
  if (direct) return direct;
  const extractedId = extractPropertyIdFromSlug(clean);
  if (extractedId && extractedId !== clean) {
    const byExtracted = properties.find((p) => p.id === extractedId);
    if (byExtracted) return byExtracted;
  }
  return properties.find((p) => getPropertySlug(p) === clean);
}

// src/utils/currency.ts
var currencies = {
  USD: { code: "USD", symbol: "$", rateToEUR: 1, format: "{symbol}{amount}" },
  CDF: { code: "CDF", symbol: "FC", rateToEUR: 2850, format: "{amount} {symbol}" },
  EUR: { code: "EUR", symbol: "\u20AC", rateToEUR: 0.92, format: "{amount} {symbol}" },
  FCFA: { code: "FCFA", symbol: "FCFA", rateToEUR: 655.95, format: "{amount} {symbol}" },
  GBP: { code: "GBP", symbol: "\xA3", rateToEUR: 0.78, format: "{symbol}{amount}" },
  CHF: { code: "CHF", symbol: "CHF", rateToEUR: 0.95, format: "{amount} {symbol}" },
  MAD: { code: "MAD", symbol: "DH", rateToEUR: 10.8, format: "{amount} {symbol}" },
  AED: { code: "AED", symbol: "AED", rateToEUR: 3.67, format: "{amount} {symbol}" }
};
function convertAndFormatPrice(amount, targetCurrencyCode, adminCdfRate, sourceCurrencyCode = "USD") {
  const effectiveCdfRate = adminCdfRate && adminCdfRate > 0 ? adminCdfRate : currencies.CDF.rateToEUR;
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  let amountInUSD = safeAmount;
  const normalizedSource = (sourceCurrencyCode || "USD").toUpperCase();
  if (normalizedSource === "CDF") {
    amountInUSD = safeAmount / effectiveCdfRate;
  } else if (normalizedSource !== "USD" && currencies[normalizedSource]) {
    amountInUSD = safeAmount * (currencies.USD.rateToEUR / currencies[normalizedSource].rateToEUR);
  }
  const targetCurrency = currencies[targetCurrencyCode] || currencies.USD;
  let converted = amountInUSD;
  if (targetCurrencyCode === "CDF") {
    converted = amountInUSD * effectiveCdfRate;
  } else {
    converted = amountInUSD * (targetCurrency.rateToEUR / currencies.USD.rateToEUR);
  }
  const formattedNumber = new Intl.NumberFormat("fr-CD", {
    maximumFractionDigits: 0
  }).format(Math.round(converted));
  return targetCurrency.format.replace("{symbol}", targetCurrency.symbol).replace("{amount}", formattedNumber);
}
function getDualCurrencyDisplay(price, propertyCurrency = "USD", displayCurrency = "USD", adminCdfRate = 2850) {
  const effectiveRate = adminCdfRate && adminCdfRate > 0 ? Math.round(adminCdfRate) : 2850;
  const primaryCurrency = displayCurrency || "USD";
  const secondaryCurrency = primaryCurrency === "CDF" ? "USD" : "CDF";
  const primaryFormatted = convertAndFormatPrice(
    price,
    primaryCurrency,
    effectiveRate,
    propertyCurrency || "USD"
  );
  const secondaryFormatted = convertAndFormatPrice(
    price,
    secondaryCurrency,
    effectiveRate,
    propertyCurrency || "USD"
  );
  return {
    primaryFormatted,
    primaryCurrency,
    secondaryFormatted,
    secondaryCurrency,
    effectiveRate
  };
}

// src/utils/propertyPricing.ts
var MAX_RENTAL_MONTHS = 36;
function parseStrictInteger(raw) {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || !Number.isInteger(raw)) return { ok: false };
    return { ok: true, value: raw };
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim().replace(/\s+/g, "");
    if (!trimmed || !/^-?\d+$/.test(trimmed)) return { ok: false };
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) return { ok: false };
    return { ok: true, value: parsed };
  }
  return { ok: false };
}
function parseOptionalRentalMonths(raw, fieldLabel) {
  if (raw === void 0 || raw === null || raw === "") {
    return { ok: true, value: void 0 };
  }
  const parsed = parseStrictInteger(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      error: `${fieldLabel} doit \xEAtre un nombre entier compris entre 0 et ${MAX_RENTAL_MONTHS} mois.`
    };
  }
  if (parsed.value < 0 || parsed.value > MAX_RENTAL_MONTHS) {
    return {
      ok: false,
      error: `${fieldLabel} doit \xEAtre compris entre 0 et ${MAX_RENTAL_MONTHS} mois de loyer.`
    };
  }
  return { ok: true, value: parsed.value };
}
function coerceBooleanFlag(raw, fallback = false) {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw === 1;
  if (typeof raw === "string") {
    const clean = raw.trim().toLowerCase();
    if (clean === "true" || clean === "1" || clean === "oui" || clean === "yes") return true;
    if (clean === "false" || clean === "0" || clean === "non" || clean === "no") return false;
  }
  return fallback;
}
function validateAndNormalizePropertyPricing(input) {
  const status = String(input.status || "for-sale").trim();
  const isRent = status === "for-rent";
  const requirePositivePrice = Boolean(input.requirePositivePrice);
  let normalizedCurrency = "USD";
  if (input.currency !== void 0 && input.currency !== null && String(input.currency).trim() !== "") {
    const upper = String(input.currency).trim().toUpperCase();
    if (upper !== "USD" && upper !== "CDF") {
      return {
        valid: false,
        error: "La devise du bien doit \xEAtre USD ou CDF."
      };
    }
    normalizedCurrency = upper;
  }
  let normalizedPrice = 0;
  if (input.price !== void 0 && input.price !== null && input.price !== "") {
    const parsedPrice = parseStrictInteger(input.price);
    if (!parsedPrice.ok) {
      return {
        valid: false,
        error: "Le prix du bien doit \xEAtre un nombre entier sans d\xE9cimales."
      };
    }
    if (parsedPrice.value < 0) {
      return {
        valid: false,
        error: "Le prix du bien doit \xEAtre un entier positif."
      };
    }
    if (requirePositivePrice && parsedPrice.value <= 0) {
      return {
        valid: false,
        error: `Le prix doit \xEAtre un entier sup\xE9rieur \xE0 0 ${normalizedCurrency === "CDF" ? "FC" : "USD"}.`
      };
    }
    normalizedPrice = parsedPrice.value;
  } else if (requirePositivePrice) {
    return {
      valid: false,
      error: `Le prix est obligatoire et doit \xEAtre sup\xE9rieur \xE0 0 ${normalizedCurrency === "CDF" ? "FC" : "USD"}.`
    };
  }
  let normalizedPeriod = isRent ? "month" : "total";
  if (isRent && input.period !== void 0 && input.period !== null && String(input.period).trim() !== "") {
    const rawPeriod = String(input.period).trim().toLowerCase();
    if (rawPeriod === "month" || rawPeriod === "year") {
      normalizedPeriod = rawPeriod;
    } else {
      return {
        valid: false,
        error: "La p\xE9riodicit\xE9 du loyer doit \xEAtre mensuelle (mois) ou annuelle (an)."
      };
    }
  }
  const isNegotiable = coerceBooleanFlag(input.isNegotiable, false);
  if (!isRent) {
    return {
      valid: true,
      data: {
        price: normalizedPrice,
        currency: normalizedCurrency,
        period: "total",
        isNegotiable,
        guaranteeMonths: void 0,
        advanceMonths: void 0
      }
    };
  }
  const guaranteeCheck = parseOptionalRentalMonths(input.guaranteeMonths, "La garantie");
  if (!guaranteeCheck.ok) {
    return { valid: false, error: guaranteeCheck.error };
  }
  const advanceCheck = parseOptionalRentalMonths(input.advanceMonths, "L'avance");
  if (!advanceCheck.ok) {
    return { valid: false, error: advanceCheck.error };
  }
  return {
    valid: true,
    data: {
      price: normalizedPrice,
      currency: normalizedCurrency,
      period: normalizedPeriod,
      isNegotiable,
      guaranteeMonths: guaranteeCheck.value,
      advanceMonths: advanceCheck.value
    }
  };
}
function getPropertyPeriodSuffix(period, status, compact = true) {
  const isRent = status === "for-rent";
  if (!isRent && period !== "month" && period !== "year") {
    return "";
  }
  if (period === "year") {
    return compact ? "/an" : " / an";
  }
  if (period === "month" || isRent) {
    return compact ? "/mois" : " / mois";
  }
  return "";
}
function getPropertyDisplayCurrencies(property, adminCdfRate = 2850) {
  const primaryCurrency = String(property.currency || "USD").toUpperCase() === "CDF" ? "CDF" : "USD";
  const dual = getDualCurrencyDisplay(
    Math.round(Number(property.price) || 0),
    primaryCurrency,
    primaryCurrency,
    adminCdfRate
  );
  return {
    primaryCurrency,
    secondaryCurrency: dual.secondaryCurrency,
    primaryFormatted: dual.primaryFormatted,
    secondaryFormatted: dual.secondaryFormatted,
    periodSuffixCompact: getPropertyPeriodSuffix(property.period, property.status, true),
    periodSuffixSpaced: getPropertyPeriodSuffix(property.period, property.status, false),
    effectiveRate: dual.effectiveRate
  };
}
function formatPropertyPrimaryPriceWithPeriod(property, adminCdfRate = 2850, compact = true) {
  const display = getPropertyDisplayCurrencies(property, adminCdfRate);
  const suffix = compact ? display.periodSuffixCompact : display.periodSuffixSpaced;
  return `${display.primaryFormatted}${suffix}`;
}

// src/utils/boostHelpers.ts
var DEFAULT_FEATURED_SLOTS_LIMIT = 6;
function parseFeaturedSlotsLimit(rawValue) {
  const num = Number(rawValue);
  if (!Number.isFinite(num) || num < 1) return DEFAULT_FEATURED_SLOTS_LIMIT;
  return Math.min(50, Math.max(1, Math.round(num)));
}
function isPropertyPubliclyVisible(prop) {
  if (!prop || typeof prop !== "object") return false;
  if (prop.published === false) return false;
  if (prop.softHiddenByPlan === true) return false;
  if (prop.fraudStatus === "suspect") return false;
  if (prop.isSuspended === true || prop.suspended === true) return false;
  const lifecycle = String(prop.listingStatus || "").toUpperCase();
  if (lifecycle === "DRAFT" || lifecycle === "ARCHIVED" || lifecycle === "PENDING_REVIEW" || lifecycle === "SOLD" || lifecycle === "RENTED" || lifecycle === "SUSPENDED" || lifecycle === "HIDDEN") {
    return false;
  }
  const rawStatus = String(prop.status || "").toLowerCase();
  if (rawStatus === "sold" || rawStatus === "rented" || rawStatus === "archived" || rawStatus === "draft" || rawStatus === "suspended" || rawStatus === "hidden") {
    return false;
  }
  return true;
}
function isBoostWindowActive(startsAt, expiresAt, nowMs = Date.now()) {
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
function resolveBoostPrimaryLabel(boostType, badgeText, explicitLabel) {
  if (explicitLabel === "\xC0 la une" || explicitLabel === "Sponsoris\xE9") {
    return explicitLabel;
  }
  const typeLower = String(boostType || "").toLowerCase();
  const badgeLower = String(badgeText || "").toLowerCase();
  if (badgeLower.includes("sponsoris")) return "Sponsoris\xE9";
  if (badgeLower.includes("une") || badgeLower.includes("vedette") || badgeLower.includes("premium")) {
    return "\xC0 la une";
  }
  if (typeLower === "sponsorise" || typeLower === "sponsored" || typeLower === "social_blast" || typeLower === "refresh") {
    return "Sponsoris\xE9";
  }
  return "\xC0 la une";
}
function getActiveBoostDisplay(prop, nowMs = Date.now()) {
  if (!isPropertyPubliclyVisible(prop) || prop?.boostSuspended === true) {
    return {
      isActive: false,
      primaryLabel: null,
      isUrgent: false,
      isPremium: false,
      startsAt: prop?.boostStartedAt,
      expiresAt: prop?.boostExpiresAt
    };
  }
  const labels = Array.isArray(prop.labels) ? prop.labels : [];
  const hasAnyFlag = Boolean(
    prop.featured || prop.isPremium || prop.isUrgent || prop.isSponsored || prop.boostLabel || prop.listingTier === "featured" || prop.listingTier === "premium" || labels.includes("featured")
  );
  if (!hasAnyFlag && !prop.boostExpiresAt) {
    return {
      isActive: false,
      primaryLabel: null,
      isUrgent: false,
      isPremium: false
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
        expiresAt: prop.boostExpiresAt
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
        startsAt: prop.boostStartedAt
      };
    }
  }
  const isUrgent = Boolean(prop.isUrgent || prop.boostType === "urgent");
  const isPremium = Boolean(prop.isPremium || prop.listingTier === "premium");
  const hasPrimary = Boolean(
    prop.featured || isPremium || prop.isSponsored || prop.listingTier === "featured" || labels.includes("featured") || prop.boostLabel === "\xC0 la une" || prop.boostLabel === "Sponsoris\xE9" || prop.boostType && prop.boostType !== "urgent"
  );
  const primaryLabel = hasPrimary ? resolveBoostPrimaryLabel(
    prop.boostType || prop.listingTier,
    prop.boostBadgeText,
    prop.boostLabel
  ) : null;
  return {
    isActive: hasPrimary || isUrgent,
    primaryLabel,
    isUrgent,
    isPremium,
    startsAt: prop.boostStartedAt,
    expiresAt: prop.boostExpiresAt
  };
}
function evaluateBoostRequestStatus(inv, prop, nowMs = Date.now()) {
  const raw = String(inv?.status || "pending").toLowerCase();
  if (raw === "refunded") return "refunded";
  if (raw === "rejected" || raw === "failed" || raw === "cancelled") return "rejected";
  if (raw === "suspended") return "suspended";
  if (raw === "awaiting_validation") return "awaiting_validation";
  if (raw === "pending" || raw === "pending_validation") return "pending";
  if (raw === "paid" || raw === "active") {
    const startsAt = inv?.starts_at || inv?.startsAt || prop?.boostStartedAt;
    const expiresAt = inv?.expires_at || inv?.expiresAt || prop?.boostExpiresAt;
    if (expiresAt) {
      return isBoostWindowActive(startsAt, expiresAt, nowMs) ? "active" : "expired";
    }
    return "active";
  }
  return "pending";
}
function computeBoostMetrics(inv, prop, analyticsRow, computedStatus) {
  const viewsBefore = Number(inv?.views_before ?? inv?.viewsBefore ?? 0);
  const contactsBefore = Number(inv?.contacts_before ?? inv?.contactsBefore ?? 0);
  const liveViews = Number(analyticsRow?.views ?? prop?.viewsCount ?? viewsBefore);
  const liveWhatsapp = Number(analyticsRow?.whatsapp ?? prop?.whatsappClicks ?? 0);
  const livePhone = Number(analyticsRow?.phone ?? prop?.phoneCalls ?? 0);
  const liveLeads = Number(prop?.leadsCount ?? 0);
  const liveContacts = liveWhatsapp + livePhone + liveLeads;
  const status = computedStatus || evaluateBoostRequestStatus(inv, prop);
  const hasActivated = status === "active" || status === "expired" || status === "suspended" || status === "refunded";
  if (!hasActivated) {
    return {
      viewsBefore,
      contactsBefore,
      viewsDuring: 0,
      contactsDuring: 0
    };
  }
  const viewsDuring = inv?.views_during_acc !== void 0 && inv?.views_during_acc !== null ? Math.max(0, Number(inv.views_during_acc)) : Math.max(0, liveViews - viewsBefore);
  const contactsDuring = inv?.contacts_during_acc !== void 0 && inv?.contacts_during_acc !== null ? Math.max(0, Number(inv.contacts_during_acc)) : Math.max(0, liveContacts - contactsBefore);
  return {
    viewsBefore,
    contactsBefore,
    viewsDuring,
    contactsDuring
  };
}

// server/authSecurity.ts
import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

// src/utils/authValidation.ts
var TERMS_VERSION = "2026.1";
var MIN_PASSWORD_LENGTH = 10;
var COMMON_PASSWORDS_BLACKLIST = /* @__PURE__ */ new Set([
  "password",
  "password1",
  "password12",
  "password123",
  "password1234",
  "password12345",
  "passw0rd",
  "p@ssword123",
  "1234567890",
  "0123456789",
  "12345678910",
  "9876543210",
  "0987654321",
  "1111111111",
  "0000000000",
  "2222222222",
  "azertyuiop",
  "azertyuiop1",
  "azerty1234",
  "azerty12345",
  "qwertyuiop",
  "qwerty1234",
  "qwerty12345",
  "motdepasse",
  "motdepasse1",
  "motdepasse12",
  "motdepasse123",
  "admin12345",
  "admin123456",
  "administrator",
  "administrateur",
  "bienvenue1",
  "bienvenue123",
  "welcome123",
  "welcome1234",
  "iloveyou12",
  "iloveyou123",
  "letmein123",
  "letmein1234",
  "football12",
  "football123",
  "sunshine12",
  "princess12",
  "dragon1234",
  "monkey1234",
  "superman12",
  "batman1234",
  "trustno123",
  "12345qwert",
  "qazwsxedc1",
  "abcd123456",
  "abcdefghij",
  "kinshasa12",
  "kinshasa123",
  "kinshasa2024",
  "kinshasa2025",
  "kinshasa2026",
  "kinimmo123",
  "kinimmo2025",
  "kinimmo2026",
  "immobilier1",
  "immobilier123",
  "congokinshasa",
  "rdc243243243",
  "test123456",
  "test12345678",
  "demo123456",
  "changeme12",
  "changeme123"
]);
function normalizeAccountRole(input) {
  const val = String(input || "").trim().toLowerCase();
  if (val === "chercheur" || val === "user") return "user";
  if (val === "particulier" || val === "owner") return "owner";
  if (val === "agent") return "agent";
  if (val === "agence" || val === "agency") return "agency";
  return "user";
}
function normalizeEmailAddress(raw) {
  return String(raw || "").trim().toLowerCase();
}
function isValidEmailAddress(raw) {
  const clean = normalizeEmailAddress(raw);
  if (!clean || clean.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
}
function normalizePhoneRdc(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed || trimmed === "+243") {
    return {
      valid: false,
      normalized: "",
      error: "Entrez un num\xE9ro de t\xE9l\xE9phone au format +243 (ex: +243 81 234 56 78)."
    };
  }
  let compact = trimmed.replace(/[\s().-]/g, "");
  if (compact.startsWith("00243")) {
    compact = "+243" + compact.slice(5);
  } else if (/^243\d{9}$/.test(compact)) {
    compact = "+" + compact;
  } else if (/^0\d{9}$/.test(compact)) {
    compact = "+243" + compact.slice(1);
  }
  if (!/^\+243\d{9}$/.test(compact)) {
    return {
      valid: false,
      normalized: "",
      error: "Le t\xE9l\xE9phone doit \xEAtre au format +243 suivi de 9 chiffres (ex: +243 81 234 56 78)."
    };
  }
  return {
    valid: true,
    normalized: compact
  };
}
function validatePasswordPolicy(password, context) {
  const raw = String(password || "");
  if (raw.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      score: raw.length >= 6 ? 1 : 0,
      label: `Trop court (${raw.length}/${MIN_PASSWORD_LENGTH} caract\xE8res min.)`,
      error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caract\xE8res.`
    };
  }
  const lower = raw.toLowerCase().trim();
  const alphaDigitsOnly = lower.replace(/[^a-z0-9]/g, "");
  const strippedTrailingDigits = alphaDigitsOnly.replace(/\d+$/, "");
  if (COMMON_PASSWORDS_BLACKLIST.has(lower) || COMMON_PASSWORDS_BLACKLIST.has(alphaDigitsOnly) || strippedTrailingDigits.length >= 6 && (COMMON_PASSWORDS_BLACKLIST.has(strippedTrailingDigits) || strippedTrailingDigits === "password" || strippedTrailingDigits === "azerty" || strippedTrailingDigits === "qwerty" || strippedTrailingDigits === "kinshasa" || strippedTrailingDigits === "kinimmo" || strippedTrailingDigits === "motdepasse" || strippedTrailingDigits === "bienvenue")) {
    return {
      valid: false,
      score: 1,
      label: "Mot de passe trop courant",
      error: "Ce mot de passe est trop courant. Choisissez une phrase secr\xE8te ou une combinaison plus originale."
    };
  }
  if (/^(.)\1+$/.test(raw) || new Set(raw).size <= 2) {
    return {
      valid: false,
      score: 1,
      label: "Trop r\xE9p\xE9titif",
      error: "Utilisez des caract\xE8res vari\xE9s dans votre mot de passe."
    };
  }
  if (context?.email) {
    const localPart = context.email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (localPart && localPart.length >= 4 && alphaDigitsOnly.includes(localPart)) {
      return {
        valid: false,
        score: 1,
        label: "Contient votre e-mail",
        error: "Le mot de passe ne doit pas contenir votre adresse e-mail."
      };
    }
  }
  if (context?.name) {
    const tokens = context.name.toLowerCase().split(/\s+/).map((t) => t.replace(/[^a-z0-9]/g, "")).filter((t) => t.length >= 4);
    if (tokens.some((t) => alphaDigitsOnly.includes(t))) {
      return {
        valid: false,
        score: 1,
        label: "Contient votre nom",
        error: "Le mot de passe ne doit pas contenir votre nom."
      };
    }
  }
  if (context?.phone) {
    const digits = context.phone.replace(/\D/g, "").slice(-9);
    if (digits.length >= 6 && alphaDigitsOnly.includes(digits)) {
      return {
        valid: false,
        score: 1,
        label: "Contient votre num\xE9ro",
        error: "Le mot de passe ne doit pas contenir votre num\xE9ro de t\xE9l\xE9phone."
      };
    }
  }
  let classes = 0;
  if (/[a-z]/.test(raw)) classes++;
  if (/[A-Z]/.test(raw)) classes++;
  if (/\d/.test(raw)) classes++;
  if (/[^A-Za-z0-9]/.test(raw)) classes++;
  const score = raw.length >= 14 && classes >= 3 ? 4 : classes >= 3 || raw.length >= 12 ? 3 : 2;
  const label = score >= 4 ? "Tr\xE8s solide" : score === 3 ? "Solide" : "Acceptable (10+ car.)";
  return {
    valid: true,
    score,
    label
  };
}

// server/authSecurity.ts
var BCRYPT_COST = 12;
var ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
var REFRESH_TOKEN_TTL_SECONDS = 14 * 24 * 60 * 60;
var EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1e3;
var PASSWORD_RESET_TTL_MS = 60 * 60 * 1e3;
var ACCESS_COOKIE_NAME = "kinimmo_access";
var REFRESH_COOKIE_NAME = "kinimmo_refresh";
var CSRF_COOKIE_NAME = "kinimmo_csrf";
var EPHEMERAL_SIGNING_SECRET = crypto.randomBytes(32).toString("hex");
function getJwtSecret() {
  return process.env.AUTH_JWT_SECRET || process.env.JWT_SECRET || EPHEMERAL_SIGNING_SECRET;
}
function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
function timingSafeEqualStr(a, b) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
async function hashPasswordBcrypt(plain) {
  return bcrypt.hash(plain, BCRYPT_COST);
}
async function verifyPasswordBcrypt(plain, user) {
  if (user.passwordHash) {
    const normalizedHash = user.passwordHash.trim().replace(/^\$2y\$/, "$2b$");
    return bcrypt.compare(plain, normalizedHash);
  }
  if (user.password && timingSafeEqualStr(plain, user.password)) {
    user.passwordHash = await hashPasswordBcrypt(plain);
    delete user.password;
    return true;
  }
  return false;
}
async function migrateUsersToBcrypt(users, saveFn) {
  let dirty = false;
  for (const u of users) {
    if (!u.passwordHash && u.password) {
      u.passwordHash = await hashPasswordBcrypt(u.password);
      delete u.password;
      dirty = true;
    } else if (u.password !== void 0) {
      delete u.password;
      dirty = true;
    }
    if (u.email && isValidEmailAddress(u.email) && u.emailVerified === void 0) {
      u.emailVerified = true;
      u.emailVerifiedAt = u.emailVerifiedAt || u.createdAt || (/* @__PURE__ */ new Date()).toISOString();
      dirty = true;
    }
    if (!u.email && u.emailVerified === void 0) {
      u.emailVerified = false;
      dirty = true;
    }
  }
  if (dirty) {
    saveFn(users);
  }
  return dirty;
}
function sanitizePublicUser(u) {
  const {
    password: _pwd,
    passwordHash: _hash,
    ...safe
  } = u;
  return {
    ...safe,
    emailVerified: Boolean(safe.email && safe.emailVerified)
  };
}
var ROOT_DIR = path.resolve(process.cwd());
var SESSIONS_FILE = path.join(ROOT_DIR, "auth_sessions_store.json");
var ACTION_TOKENS_FILE = path.join(ROOT_DIR, "auth_tokens_store.json");
function loadJsonArray(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn(`[AuthSecurity] Lecture impossible ${path.basename(filePath)}:`, err);
  }
  return [];
}
function saveJsonArray(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn(`[AuthSecurity] \xC9criture impossible ${path.basename(filePath)}:`, err);
  }
}
var inMemorySessions = loadJsonArray(SESSIONS_FILE);
var inMemoryActionTokens = loadJsonArray(ACTION_TOKENS_FILE);
function pruneExpiredAuthData() {
  const now = Date.now();
  const prevSessionsLen = inMemorySessions.length;
  inMemorySessions = inMemorySessions.filter((s) => new Date(s.expiresAt).getTime() > now);
  if (inMemorySessions.length !== prevSessionsLen) {
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
  }
  const prevTokensLen = inMemoryActionTokens.length;
  inMemoryActionTokens = inMemoryActionTokens.filter(
    (t) => new Date(t.expiresAt).getTime() > now - 24 * 60 * 60 * 1e3
  );
  if (inMemoryActionTokens.length !== prevTokensLen) {
    saveJsonArray(ACTION_TOKENS_FILE, inMemoryActionTokens);
  }
}
function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header || typeof header !== "string") return out;
  const parts = header.split(";");
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}
function isHttpsRequest(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  return Boolean(req.secure || forwardedProto === "https");
}
function buildCookieHeader(req, name, value, maxAgeSeconds, options = { httpOnly: true }) {
  const hostHeader = String(req.headers["x-forwarded-host"] || req.headers.host || "");
  const isLocalHttp = !isHttpsRequest(req) && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostHeader);
  const secure = isHttpsRequest(req) || process.env.NODE_ENV === "production" && !isLocalHttp;
  const isEmbedded = req.headers["x-kinimmo-embedded"] === "1";
  const segments = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (options.httpOnly !== false) {
    segments.push("HttpOnly");
  }
  if (secure) {
    segments.push("Secure");
  }
  if (isEmbedded && secure) {
    segments.push("SameSite=None");
    segments.push("Partitioned");
  } else {
    segments.push("SameSite=Lax");
  }
  return segments.join("; ");
}
function appendAuthCookies(req, res, accessToken, refreshToken) {
  res.append(
    "Set-Cookie",
    buildCookieHeader(req, ACCESS_COOKIE_NAME, accessToken, ACCESS_TOKEN_TTL_SECONDS, { httpOnly: true })
  );
  res.append(
    "Set-Cookie",
    buildCookieHeader(req, REFRESH_COOKIE_NAME, refreshToken, REFRESH_TOKEN_TTL_SECONDS, { httpOnly: true })
  );
}
function clearAuthCookies(req, res) {
  res.append(
    "Set-Cookie",
    buildCookieHeader(req, ACCESS_COOKIE_NAME, "", 0, { httpOnly: true })
  );
  res.append(
    "Set-Cookie",
    buildCookieHeader(req, REFRESH_COOKIE_NAME, "", 0, { httpOnly: true })
  );
}
function signCsrfRaw(raw) {
  const sig = crypto.createHmac("sha256", getJwtSecret()).update(`csrf:${raw}`).digest("hex");
  return `${raw}.${sig}`;
}
function verifyCsrfCookieValue(cookieVal) {
  const dotIdx = cookieVal.indexOf(".");
  if (dotIdx <= 0) return null;
  const raw = cookieVal.slice(0, dotIdx);
  const sig = cookieVal.slice(dotIdx + 1);
  if (!raw || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", getJwtSecret()).update(`csrf:${raw}`).digest("hex");
  if (!timingSafeEqualStr(sig, expectedSig)) return null;
  return raw;
}
function issueCsrfToken(req, res) {
  const cookies = parseCookies(req);
  const existingCookie = cookies[CSRF_COOKIE_NAME];
  if (existingCookie) {
    const existingRaw = verifyCsrfCookieValue(existingCookie);
    if (existingRaw) {
      return existingRaw;
    }
  }
  const raw = crypto.randomBytes(32).toString("hex");
  const signed = signCsrfRaw(raw);
  res.append(
    "Set-Cookie",
    buildCookieHeader(req, CSRF_COOKIE_NAME, signed, 24 * 60 * 60, { httpOnly: true })
  );
  return raw;
}
function csrfProtectionMiddleware(req, res, next) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return next();
  }
  const originHeader = req.headers.origin;
  if (originHeader && typeof originHeader === "string") {
    try {
      const originHost = new URL(originHeader).host.toLowerCase();
      const requestHost = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
      const appUrlHost = process.env.APP_URL ? new URL(process.env.APP_URL).host.toLowerCase() : "";
      let frontendHost = "";
      if (process.env.FRONTEND_URL) {
        try {
          frontendHost = new URL(process.env.FRONTEND_URL).host.toLowerCase();
        } catch {
        }
      }
      const allowedHosts = new Set([requestHost, appUrlHost, frontendHost].filter(Boolean));
      if (allowedHosts.size > 0 && !allowedHosts.has(originHost)) {
        return res.status(403).json({
          success: false,
          code: "ORIGIN_MISMATCH",
          message: "Requ\xEAte refus\xE9e : origine non autoris\xE9e."
        });
      }
    } catch {
      return res.status(403).json({
        success: false,
        code: "ORIGIN_INVALID",
        message: "En-t\xEAte Origin invalide."
      });
    }
  }
  const cookies = parseCookies(req);
  const cookieVal = cookies[CSRF_COOKIE_NAME];
  const headerToken = String(req.headers["x-csrf-token"] || "").trim();
  if (!cookieVal || !headerToken) {
    return res.status(403).json({
      success: false,
      code: "CSRF_INVALID",
      message: "Protection CSRF : jeton de s\xE9curit\xE9 manquant. Rechargez le formulaire et r\xE9essayez."
    });
  }
  const cookieRaw = verifyCsrfCookieValue(cookieVal);
  if (!cookieRaw || !timingSafeEqualStr(cookieRaw, headerToken)) {
    return res.status(403).json({
      success: false,
      code: "CSRF_INVALID",
      message: "Protection CSRF : jeton invalide ou expir\xE9. R\xE9essayez l'op\xE9ration."
    });
  }
  return next();
}
function signAccessJwt(user, sessionId) {
  const payload = {
    sub: user.id,
    role: user.role,
    sid: sessionId,
    type: "access"
  };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: "kinimmo-auth"
  });
}
function createNewSessionPair(req, user) {
  pruneExpiredAuthData();
  const sessionId = `sess_${crypto.randomBytes(12).toString("hex")}`;
  const rawSecret = crypto.randomBytes(32).toString("hex");
  const refreshToken = `${sessionId}.${rawSecret}`;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1e3).toISOString();
  const session = {
    id: sessionId,
    userId: user.id,
    currentTokenHash: sha256Hex(refreshToken),
    previousTokenHash: null,
    rotationCount: 0,
    userAgent: String(req.headers["user-agent"] || "Navigateur Web").slice(0, 180),
    ip: String(req.headers["x-forwarded-for"] || req.ip || "127.0.0.1").split(",")[0].trim(),
    createdAt: nowIso,
    lastActiveAt: nowIso,
    expiresAt,
    revokedAt: null,
    revokedReason: null
  };
  inMemorySessions.unshift(session);
  saveJsonArray(SESSIONS_FILE, inMemorySessions);
  const accessToken = signAccessJwt(user, sessionId);
  return { accessToken, refreshToken, session };
}
function rotateRefreshSession(req, users) {
  pruneExpiredAuthData();
  const cookies = parseCookies(req);
  const rawRefresh = cookies[REFRESH_COOKIE_NAME];
  if (!rawRefresh || !rawRefresh.includes(".")) {
    return { ok: false, error: "Session absente ou expir\xE9e." };
  }
  const sessionId = rawRefresh.split(".")[0];
  const sessionIdx = inMemorySessions.findIndex((s) => s.id === sessionId);
  if (sessionIdx === -1) {
    return { ok: false, error: "Session introuvable." };
  }
  const session = inMemorySessions[sessionIdx];
  if (session.revokedAt) {
    return { ok: false, error: "Cette session a \xE9t\xE9 r\xE9voqu\xE9e. Veuillez vous reconnecter." };
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    session.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
    session.revokedReason = "expired";
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
    return { ok: false, error: "Session expir\xE9e. Veuillez vous reconnecter." };
  }
  const presentedHash = sha256Hex(rawRefresh);
  if (session.previousTokenHash && timingSafeEqualStr(presentedHash, session.previousTokenHash)) {
    session.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
    session.revokedReason = "refresh_token_reuse_detected";
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
    return {
      ok: false,
      error: "Activit\xE9 suspecte d\xE9tect\xE9e (jeton d\xE9j\xE0 utilis\xE9). Votre session a \xE9t\xE9 ferm\xE9e par s\xE9curit\xE9."
    };
  }
  if (!timingSafeEqualStr(presentedHash, session.currentTokenHash)) {
    return { ok: false, error: "Jeton de session invalide." };
  }
  const user = users.find((u) => u.id === session.userId);
  if (!user) {
    session.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
    session.revokedReason = "user_deleted";
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
    return { ok: false, error: "Compte utilisateur introuvable." };
  }
  const nextSecret = crypto.randomBytes(32).toString("hex");
  const nextRefreshToken = `${session.id}.${nextSecret}`;
  session.previousTokenHash = session.currentTokenHash;
  session.currentTokenHash = sha256Hex(nextRefreshToken);
  session.rotationCount += 1;
  session.lastActiveAt = (/* @__PURE__ */ new Date()).toISOString();
  session.expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1e3).toISOString();
  session.userAgent = String(req.headers["user-agent"] || session.userAgent).slice(0, 180);
  saveJsonArray(SESSIONS_FILE, inMemorySessions);
  const accessToken = signAccessJwt(user, session.id);
  return { ok: true, user, accessToken, refreshToken: nextRefreshToken };
}
function getAuthenticatedUserFromCookies(req, users) {
  const cookies = parseCookies(req);
  const accessToken = cookies[ACCESS_COOKIE_NAME];
  if (!accessToken) return null;
  try {
    const decoded = jwt.verify(accessToken, getJwtSecret(), {
      issuer: "kinimmo-auth"
    });
    if (!decoded || decoded.type !== "access" || !decoded.sub || !decoded.sid) {
      return null;
    }
    const session = inMemorySessions.find((s) => s.id === decoded.sid);
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    const user = users.find((u) => u.id === decoded.sub);
    if (!user) return null;
    return { user, sessionId: session.id };
  } catch {
    return null;
  }
}
function revokeSessionById(sessionId, userId, reason = "user_logout") {
  const session = inMemorySessions.find((s) => s.id === sessionId && s.userId === userId);
  if (!session) return false;
  session.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
  session.revokedReason = reason;
  saveJsonArray(SESSIONS_FILE, inMemorySessions);
  return true;
}
function revokeCurrentRequestSession(req) {
  const cookies = parseCookies(req);
  const access = cookies[ACCESS_COOKIE_NAME];
  const refresh = cookies[REFRESH_COOKIE_NAME];
  let sid = null;
  if (refresh && refresh.includes(".")) {
    sid = refresh.split(".")[0];
  } else if (access) {
    try {
      const decoded = jwt.verify(access, getJwtSecret(), { ignoreExpiration: true });
      sid = decoded?.sid || null;
    } catch {
    }
  }
  if (!sid) return;
  const session = inMemorySessions.find((s) => s.id === sid);
  if (session && !session.revokedAt) {
    session.revokedAt = (/* @__PURE__ */ new Date()).toISOString();
    session.revokedReason = "logout";
    saveJsonArray(SESSIONS_FILE, inMemorySessions);
  }
}
function revokeAllUserSessions(userId, reason = "security_reset", exceptSessionId) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let count = 0;
  for (const s of inMemorySessions) {
    if (s.userId === userId && !s.revokedAt && s.id !== exceptSessionId) {
      s.revokedAt = nowIso;
      s.revokedReason = reason;
      count++;
    }
  }
  if (count > 0) saveJsonArray(SESSIONS_FILE, inMemorySessions);
  return count;
}
function listActiveSessionsForUser(userId, currentSessionId) {
  pruneExpiredAuthData();
  return inMemorySessions.filter((s) => s.userId === userId && !s.revokedAt).map((s) => ({
    id: s.id,
    userAgent: s.userAgent,
    ip: s.ip,
    createdAt: s.createdAt,
    lastActiveAt: s.lastActiveAt,
    expiresAt: s.expiresAt,
    isCurrent: Boolean(currentSessionId && s.id === currentSessionId)
  }));
}
function createOneTimeActionToken(params) {
  pruneExpiredAuthData();
  const now = Date.now();
  for (const t of inMemoryActionTokens) {
    if (t.userId === params.userId && t.purpose === params.purpose && !t.usedAt) {
      t.usedAt = new Date(now).toISOString();
    }
  }
  const rawToken = crypto.randomBytes(32).toString("hex");
  const record = {
    id: `tok_${crypto.randomBytes(8).toString("hex")}`,
    tokenHash: sha256Hex(rawToken),
    purpose: params.purpose,
    userId: params.userId,
    targetEmail: normalizeEmailAddress(params.targetEmail),
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + params.ttlMs).toISOString(),
    usedAt: null
  };
  inMemoryActionTokens.unshift(record);
  saveJsonArray(ACTION_TOKENS_FILE, inMemoryActionTokens);
  return { rawToken, record };
}
function peekOneTimeActionToken(rawToken, expectedPurpose) {
  const clean = String(rawToken || "").trim();
  if (!clean || clean.length < 32) {
    return { ok: false, code: "TOKEN_INVALID", error: "Lien de v\xE9rification invalide." };
  }
  const hash = sha256Hex(clean);
  const found = inMemoryActionTokens.find((t) => timingSafeEqualStr(t.tokenHash, hash));
  if (!found) {
    return { ok: false, code: "TOKEN_INVALID", error: "Ce lien est invalide ou introuvable." };
  }
  if (expectedPurpose) {
    const allowed = Array.isArray(expectedPurpose) ? expectedPurpose : [expectedPurpose];
    if (!allowed.includes(found.purpose)) {
      return { ok: false, code: "TOKEN_INVALID", error: "Ce lien ne correspond pas \xE0 cette action." };
    }
  }
  if (found.usedAt) {
    return { ok: false, code: "TOKEN_USED", error: "Ce lien a d\xE9j\xE0 \xE9t\xE9 utilis\xE9. Demandez un nouveau lien si n\xE9cessaire." };
  }
  if (new Date(found.expiresAt).getTime() <= Date.now()) {
    return { ok: false, code: "TOKEN_EXPIRED", error: "Ce lien a expir\xE9. Demandez un nouvel envoi." };
  }
  return { ok: true, record: found };
}
function markOneTimeActionTokenUsed(record) {
  record.usedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveJsonArray(ACTION_TOKENS_FILE, inMemoryActionTokens);
}
function consumeOneTimeActionToken(rawToken, expectedPurpose) {
  const check = peekOneTimeActionToken(rawToken, expectedPurpose);
  if (!check.ok || !check.record) {
    return check;
  }
  markOneTimeActionTokenUsed(check.record);
  return { ok: true, record: check.record };
}
function resolveSiteOrigin(req) {
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:3000").split(",")[0].trim();
  const proto = isHttpsRequest(req) ? "https" : "http";
  if (process.env.APP_URL && /^https?:\/\//i.test(process.env.APP_URL)) {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  return `${proto}://${host}`;
}
async function dispatchAuthEmail(params) {
  const { to, subject, text, html, actionUrl } = params;
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpFrom = process.env.SMTP_FROM?.trim() || smtpUser || "no-reply@kinimmo.cd";
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
      await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text,
        html
      });
      return { delivered: true, channel: "smtp" };
    } catch (err) {
      console.error("[AuthEmail] Erreur envoi SMTP:", err);
    }
  }
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: process.env.SMTP_FROM?.trim() || "Kinimmo <no-reply@kinimmo.cd>",
          to: [to],
          subject,
          text,
          html
        })
      });
      if (resp.ok) {
        return { delivered: true, channel: "resend" };
      }
    } catch (err) {
      console.error("[AuthEmail] Erreur envoi Resend:", err);
    }
  }
  return {
    delivered: false,
    channel: "preview",
    previewUrl: actionUrl
  };
}
function canUserPublishListings(user) {
  if (!user) {
    return {
      allowed: false,
      reason: "Vous devez \xEAtre connect\xE9 pour publier une annonce."
    };
  }
  return { allowed: true };
}

// server/mysqlUsersBridge.ts
import mysql from "mysql2/promise";
var cachedPool = null;
function isMysqlConfigured() {
  const dbName = String(process.env.DB_NAME || "").trim();
  const dbUser = String(process.env.DB_USER || "").trim();
  return Boolean(dbName && dbUser);
}
function getMysqlPool() {
  if (!isMysqlConfigured()) return null;
  if (cachedPool) return cachedPool;
  const rawHost = String(process.env.DB_HOST || "").trim();
  const dbHost = rawHost && rawHost !== "localhost" ? rawHost : "127.0.0.1";
  cachedPool = mysql.createPool({
    host: dbHost,
    port: Number(process.env.DB_PORT) || 3306,
    user: String(process.env.DB_USER || "").trim(),
    password: String(process.env.DB_PASSWORD || ""),
    database: String(process.env.DB_NAME || "").trim(),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: 5e3,
    enableKeepAlive: true,
    timezone: "+00:00"
  });
  return cachedPool;
}
function normalizeRole(rawRole) {
  const clean = String(rawRole || "user").trim().toLowerCase();
  if (clean === "admin" || clean === "agent" || clean === "agency" || clean === "owner" || clean === "user") {
    return clean;
  }
  return "user";
}
function normalizeBcryptPrefix(hash) {
  if (!hash || typeof hash !== "string") return void 0;
  const trimmed = hash.trim();
  if (!trimmed) return void 0;
  return trimmed.replace(/^\$2y\$/, "$2b$");
}
function isMysqlRowSuspended(row) {
  const st = String(row?.status || "").trim().toLowerCase();
  return st === "suspended" || st === "inactive";
}
function mapMysqlRowToAccountRecord(row) {
  const cleanEmail = row.email ? normalizeEmailAddress(String(row.email)) : "";
  const createdAt = row.created_at ? new Date(row.created_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
  const role = normalizeRole(row.role);
  const agencyId = row.agency_id ? String(row.agency_id) : role === "agency" ? String(row.id) : void 0;
  return {
    id: String(row.id),
    name: String(row.name || cleanEmail || "Utilisateur Kinimmo").trim(),
    email: cleanEmail,
    passwordHash: normalizeBcryptPrefix(row.password_hash || row.passwordHash),
    phone: row.phone ? String(row.phone).trim() : "",
    whatsapp: row.whatsapp ? String(row.whatsapp).trim() : row.phone ? String(row.phone).trim() : "",
    role,
    agencyId,
    agencyName: row.agency_name ? String(row.agency_name) : void 0,
    rccmOrNif: row.rccm_or_nif ? String(row.rccm_or_nif) : void 0,
    avatar: row.avatar ? String(row.avatar) : void 0,
    planId: row.plan_id ? String(row.plan_id) : role === "agency" ? "agency" : role === "agent" ? "pro" : "starter",
    subscriptionPlan: row.plan_id ? String(row.plan_id) : void 0,
    subscriptionStatus: row.subscription_status ? String(row.subscription_status) : void 0,
    subscriptionExpiresAt: row.subscription_expires_at ? new Date(row.subscription_expires_at).toISOString().split("T")[0] : void 0,
    billingCycle: row.billing_cycle === "yearly" || row.billing_cycle === "monthly" ? row.billing_cycle : void 0,
    trialEndsAt: row.trial_ends_at ? new Date(row.trial_ends_at).toISOString().split("T")[0] : void 0,
    includedBoostsRemaining: row.included_boosts_remaining !== void 0 && row.included_boosts_remaining !== null ? Number(row.included_boosts_remaining) : void 0,
    isVerified: Boolean(row.is_verified),
    emailVerified: row.email_verified !== void 0 && row.email_verified !== null ? Boolean(row.email_verified) : Boolean(cleanEmail),
    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at).toISOString() : cleanEmail ? createdAt : void 0,
    phoneVerified: row.phone_verified !== void 0 ? Boolean(row.phone_verified) : void 0,
    kinshasaBadgeVerified: Boolean(row.kinshasa_badge_verified),
    createdAt
  };
}
function mergeAccountIntoMemory(list, record) {
  const idx = list.findIndex(
    (u) => u.id === record.id || record.email && u.email && normalizeEmailAddress(u.email) === normalizeEmailAddress(record.email)
  );
  if (idx !== -1) {
    const merged = {
      ...list[idx],
      ...record,
      passwordHash: record.passwordHash || list[idx].passwordHash
    };
    list[idx] = merged;
    return merged;
  }
  list.unshift(record);
  return record;
}
async function loadAllMysqlUsers() {
  const pool = getMysqlPool();
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM users ORDER BY created_at DESC LIMIT 1000");
    return (rows || []).filter((row) => !isMysqlRowSuspended(row)).map((row) => mapMysqlRowToAccountRecord(row));
  } catch (err) {
    console.warn("[MySQL Auth Bridge] Chargement initial des utilisateurs impossible:", err?.message || err);
    return [];
  }
}
async function findMysqlUserByIdentifier(identifier) {
  const pool = getMysqlPool();
  if (!pool) return { record: null, suspended: false };
  const trimmed = String(identifier || "").trim();
  if (!trimmed) return { record: null, suspended: false };
  try {
    if (trimmed.includes("@")) {
      const cleanEmail = normalizeEmailAddress(trimmed);
      const [rows2] = await pool.execute(
        "SELECT * FROM users WHERE LOWER(TRIM(email)) = LOWER(?) LIMIT 1",
        [cleanEmail]
      );
      if (!rows2 || rows2.length === 0) return { record: null, suspended: false };
      if (isMysqlRowSuspended(rows2[0])) return { record: null, suspended: true };
      return { record: mapMysqlRowToAccountRecord(rows2[0]), suspended: false };
    }
    const phoneCheck = normalizePhoneRdc(trimmed);
    const normalized = phoneCheck.valid ? phoneCheck.normalized : trimmed.replace(/[\s().-]/g, "");
    const digitsOnly = normalized.replace(/\D/g, "");
    const last9 = digitsOnly.length >= 6 ? digitsOnly.slice(-9) : "";
    const conditions = ["phone = ?", "whatsapp = ?"];
    const params = [trimmed, trimmed];
    if (normalized && normalized !== trimmed) {
      conditions.push("phone = ?", "whatsapp = ?");
      params.push(normalized, normalized);
    }
    if (last9) {
      conditions.push(
        "(phone IS NOT NULL AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '.', ''), 9) = ?)",
        "(whatsapp IS NOT NULL AND RIGHT(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '+', ''), '.', ''), 9) = ?)"
      );
      params.push(last9, last9);
    }
    const [rows] = await pool.execute(
      `SELECT * FROM users WHERE ${conditions.join(" OR ")} LIMIT 1`,
      params
    );
    if (!rows || rows.length === 0) return { record: null, suspended: false };
    if (isMysqlRowSuspended(rows[0])) return { record: null, suspended: true };
    return { record: mapMysqlRowToAccountRecord(rows[0]), suspended: false };
  } catch (err) {
    console.warn("[MySQL Auth Bridge] Recherche utilisateur MySQL \xE9chou\xE9e:", err?.message || err);
    return { record: null, suspended: false };
  }
}
async function findMysqlUserById(id) {
  const pool = getMysqlPool();
  if (!pool || !id) return null;
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows || rows.length === 0 || isMysqlRowSuspended(rows[0])) return null;
    return mapMysqlRowToAccountRecord(rows[0]);
  } catch (err) {
    console.warn("[MySQL Auth Bridge] Lecture utilisateur par ID \xE9chou\xE9e:", err?.message || err);
    return null;
  }
}
async function insertMysqlUser(record) {
  const pool = getMysqlPool();
  if (!pool) return;
  try {
    const emailVal = record.email || `${record.id}@phone.kinimmo.cd`;
    await pool.execute(
      `INSERT IGNORE INTO users (
        id, name, email, password_hash, phone, whatsapp, role,
        agency_id, agency_name, avatar, is_verified, kinshasa_badge_verified,
        rccm_or_nif, plan_id, subscription_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.name,
        emailVal,
        record.passwordHash || "",
        record.phone || null,
        record.whatsapp || record.phone || null,
        record.role === "owner" ? "user" : record.role,
        record.agencyId || null,
        record.agencyName || null,
        record.avatar || null,
        record.isVerified ? 1 : 0,
        record.kinshasaBadgeVerified ? 1 : 0,
        record.rccmOrNif || null,
        record.planId || "starter",
        record.subscriptionStatus || "Active"
      ]
    );
    if (record.role === "agent") {
      await pool.execute(
        `INSERT IGNORE INTO agents (id, user_id, name, email, phone, whatsapp, title)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `agent_${Date.now()}`,
          record.id,
          record.name,
          emailVal,
          record.phone || "",
          record.whatsapp || record.phone || "",
          "Courtier Immobilier Kinshasa"
        ]
      );
    } else if (record.role === "agency") {
      const agencyId = record.agencyId || record.id;
      await pool.execute(
        `INSERT IGNORE INTO agencies (id, name, email, phone, whatsapp, owner_user_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          agencyId,
          record.agencyName || record.name,
          emailVal,
          record.phone || "",
          record.whatsapp || record.phone || "",
          record.id
        ]
      );
    }
  } catch (err) {
    console.warn("[MySQL Auth Bridge] Synchronisation INSERT users \xE9chou\xE9e:", err?.message || err);
  }
}
async function updateMysqlUserPassword(id, passwordHash) {
  const pool = getMysqlPool();
  if (!pool || !id || !passwordHash) return;
  try {
    await pool.execute("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [
      passwordHash,
      id
    ]);
  } catch (err) {
    console.warn("[MySQL Auth Bridge] Mise \xE0 jour mot de passe MySQL \xE9chou\xE9e:", err?.message || err);
  }
}
async function updateMysqlUserProfile(id, updates) {
  const pool = getMysqlPool();
  if (!pool || !id) return;
  try {
    await pool.execute(
      `UPDATE users
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           whatsapp = COALESCE(?, whatsapp),
           avatar = COALESCE(?, avatar),
           rccm_or_nif = COALESCE(?, rccm_or_nif),
           agency_name = COALESCE(?, agency_name),
           updated_at = NOW()
       WHERE id = ?`,
      [
        updates.name ?? null,
        updates.phone ?? null,
        updates.whatsapp ?? null,
        updates.avatar ?? null,
        updates.rccmOrNif ?? null,
        updates.agencyName ?? null,
        id
      ]
    );
  } catch (err) {
    console.warn("[MySQL Auth Bridge] Mise \xE0 jour profil MySQL \xE9chou\xE9e:", err?.message || err);
  }
}
async function updateMysqlUserEmail(id, email) {
  const pool = getMysqlPool();
  if (!pool || !id || !email) return;
  try {
    await pool.execute("UPDATE users SET email = ?, updated_at = NOW() WHERE id = ?", [
      normalizeEmailAddress(email),
      id
    ]);
  } catch (err) {
    console.warn("[MySQL Auth Bridge] Mise \xE0 jour e-mail MySQL \xE9chou\xE9e:", err?.message || err);
  }
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var app = express();
app.set("trust proxy", 1);
var PORT = process.env.PORT ? isNaN(Number(process.env.PORT)) ? process.env.PORT : Number(process.env.PORT) : 3e3;
var isProd = process.env.NODE_ENV === "production";
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use("/api", csrfProtectionMiddleware);
app.use("/auth", csrfProtectionMiddleware);
function createSlidingRateLimiter(opts) {
  const buckets = /* @__PURE__ */ new Map();
  return (req, res, next) => {
    const ip = String(req.ip || req.socket?.remoteAddress || "unknown");
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const cutoff = now - opts.windowMs;
    const recent = (buckets.get(key) || []).filter((ts) => ts > cutoff);
    if (recent.length >= opts.max) {
      const retryAfterSec = Math.max(1, Math.ceil((recent[0] + opts.windowMs - now) / 1e3));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        success: false,
        code: "RATE_LIMITED",
        message: opts.message,
        error: opts.message
      });
    }
    recent.push(now);
    buckets.set(key, recent);
    if (buckets.size > 5e3) {
      for (const [bKey, hits] of buckets.entries()) {
        if (!hits.some((ts) => ts > cutoff)) buckets.delete(bKey);
      }
    }
    return next();
  };
}
var authLoginRateLimiter = createSlidingRateLimiter({
  windowMs: 15 * 60 * 1e3,
  max: Number(process.env.KINIMMO_LOGIN_RATE_LIMIT || 25),
  message: "Trop de tentatives de connexion. Veuillez patienter avant de r\xE9essayer."
});
var authSensitiveRateLimiter = createSlidingRateLimiter({
  windowMs: 15 * 60 * 1e3,
  max: Number(process.env.KINIMMO_AUTH_SENSITIVE_RATE_LIMIT || 10),
  message: "Trop de requ\xEAtes sensibles effectu\xE9es. Veuillez r\xE9essayer dans quelques minutes."
});
var publicSubmissionRateLimiter = createSlidingRateLimiter({
  windowMs: 10 * 60 * 1e3,
  max: Number(process.env.KINIMMO_PUBLIC_SUBMISSION_RATE_LIMIT || 25),
  message: "Limite d\u2019envoi atteinte. Veuillez patienter quelques minutes avant un nouvel envoi."
});
var devUploadsDir = path2.join(__dirname, "uploads");
if (!fs2.existsSync(devUploadsDir)) {
  try {
    fs2.mkdirSync(devUploadsDir, { recursive: true });
  } catch {
  }
}
app.use("/uploads", express.static(devUploadsDir, { dotfiles: "deny", index: false }));
app.use("/uploads", (_req, res) => res.status(404).json({ success: false, message: "Fichier introuvable." }));
app.use("/og-images", express.static(path2.join(__dirname, "src/assets/images"), { dotfiles: "deny", index: false }));
app.use("/og-images", (_req, res) => res.status(404).json({ success: false, message: "Image introuvable." }));
var LOCAL_LEADS_FILE = path2.join(__dirname, "concierge_requests.json");
var LOCAL_LEADS_FILE_ALT = path2.join(__dirname, "conciergerie_requests.json");
var LOCAL_VISITS_FILE = path2.join(__dirname, "property_visits.json");
var LOCAL_ADS_FILE = path2.join(__dirname, "advertisements.json");
var LOCAL_SLIDES_FILE = path2.join(__dirname, "hero_slides.json");
var LOCAL_PLANS_FILE = path2.join(__dirname, "pricing_plans.json");
var LOCAL_OPTIONS_FILE = path2.join(__dirname, "visibility_options.json");
var LOCAL_PAYMENT_METHODS_FILE = path2.join(__dirname, "payment_methods_store.json");
var LOCAL_NOTIFICATIONS_FILE = path2.join(__dirname, "notifications.json");
var LOCAL_VIDEOS_FILE = path2.join(__dirname, "property_videos.json");
var LOCAL_CLOUDINARY_FILE = path2.join(__dirname, "cloudinary_config.json");
var LOCAL_PROPERTIES_FILE = path2.join(__dirname, "properties_store.json");
var LOCAL_COLLABORATORS_FILE = path2.join(__dirname, "agency_collaborators.json");
var LOCAL_TRANSACTIONS_FILE = path2.join(__dirname, "agency_transactions.json");
var LOCAL_TRUST_FILE = path2.join(__dirname, "trust_store.json");
var LOCAL_USERS_FILE = path2.join(__dirname, "users_store.json");
var LOCAL_CUSTOM_FIELDS_FILE = path2.join(__dirname, "custom_fields_store.json");
var LOCAL_SETTINGS_FILE = path2.join(__dirname, "site_settings_store.json");
var LOCAL_FAVORITES_FILE = path2.join(__dirname, "favorites_store.json");
var LOCAL_MESSAGES_FILE = path2.join(__dirname, "messages_store.json");
var LOCAL_ANALYTICS_FILE = path2.join(__dirname, "analytics_store.json");
var LOCAL_CRM_LEADS_FILE = path2.join(__dirname, "crm_leads_store.json");
var LOCAL_AGENCIES_FILE = path2.join(__dirname, "agencies_store.json");
var LOCAL_AGENTS_FILE = path2.join(__dirname, "agents_store.json");
var LOCAL_VIDEO_REPORTS_FILE = path2.join(__dirname, "video_reports_store.json");
var LOCAL_BLOG_ARTICLES_FILE = path2.join(__dirname, "blog_articles_store.json");
var LOCAL_LEGAL_DOCS_FILE = path2.join(__dirname, "legal_documents_store.json");
var INITIAL_PLANS = [
  {
    id: "starter",
    name: "Gratuit (Grand Public)",
    description: "Id\xE9al pour les propri\xE9taires et particuliers souhaitant publier leurs biens sans aucun frais.",
    category: "individual",
    audience: "grand_public",
    badge: "Gratuit",
    price_usd: 0,
    price_cdf: 0,
    priceMonthly: 0,
    priceMonthlyCDF: 0,
    price_yearly_usd: 0,
    priceYearly: 0,
    price_yearly_cdf: 0,
    priceYearlyCDF: 0,
    trial_days: 0,
    trialDays: 0,
    currency: "USD",
    billing_period: "monthly",
    billingPeriod: "month",
    max_listings: 3,
    maxListings: 3,
    max_photos_per_listing: 6,
    maxPhotos: 6,
    max_videos: 1,
    maxVideos: 1,
    included_boosts: 0,
    includedBoosts: 0,
    max_featured_listings: 0,
    featuredListings: 0,
    max_team_members: 1,
    agentAccounts: 1,
    features: [
      "Jusqu'\xE0 3 annonces immobili\xE8res actives",
      "Jusqu'\xE0 6 photos HD par annonce",
      "1 vid\xE9o de visite incluse",
      "0 boost inclus (boosts \xE0 la carte possibles)",
      "1 membre / compte titulaire"
    ],
    recommended: false,
    has_verified_badge: false,
    hasVerifiedBadge: false,
    has_crm_leads: false,
    hasCrmLeads: false,
    has_priority_support: false,
    hasPrioritySupport: false,
    is_active: true,
    isActive: true
  },
  {
    id: "pro",
    name: "Agent Pro",
    description: "Pour courtiers et propri\xE9taires actifs \xE0 Kinshasa avec badge v\xE9rifi\xE9, boosts inclus et vid\xE9os.",
    category: "individual",
    audience: "grand_public",
    badge: "Populaire",
    price_usd: 29,
    price_cdf: 82650,
    priceMonthly: 29,
    priceMonthlyCDF: 82650,
    price_yearly_usd: 290,
    priceYearly: 290,
    price_yearly_cdf: 826500,
    priceYearlyCDF: 826500,
    trial_days: 7,
    trialDays: 7,
    currency: "USD",
    billing_period: "monthly",
    billingPeriod: "month",
    max_listings: 25,
    maxListings: 25,
    max_photos_per_listing: 15,
    maxPhotos: 15,
    max_videos: 5,
    maxVideos: 5,
    included_boosts: 3,
    includedBoosts: 3,
    max_featured_listings: 3,
    featuredListings: 3,
    max_team_members: 1,
    agentAccounts: 1,
    features: [
      "Jusqu'\xE0 25 annonces actives",
      "15 photos HD par annonce & 5 vid\xE9os immersives",
      "3 boosts inclus / mois",
      "Essai gratuit configurable (7 jours)",
      "Badge Officiel V\xE9rifi\xE9 Kinshasa & CRM Leads"
    ],
    recommended: true,
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: false,
    hasPrioritySupport: false,
    is_active: true,
    isActive: true
  },
  {
    id: "agency",
    name: "Agence Immobili\xE8re",
    description: "Visibilit\xE9 maximale pour agences immobili\xE8res : \xE9quipe multi-agents, boosts inclus et vitrine certifi\xE9e.",
    category: "agency",
    audience: "agence",
    badge: "Agence Agr\xE9\xE9e",
    price_usd: 79,
    price_cdf: 225150,
    priceMonthly: 79,
    priceMonthlyCDF: 225150,
    price_yearly_usd: 790,
    priceYearly: 790,
    price_yearly_cdf: 2251500,
    priceYearlyCDF: 2251500,
    trial_days: 14,
    trialDays: 14,
    currency: "USD",
    billing_period: "monthly",
    billingPeriod: "month",
    max_listings: 100,
    maxListings: 100,
    max_photos_per_listing: 25,
    maxPhotos: 25,
    max_videos: 20,
    maxVideos: 20,
    included_boosts: 10,
    includedBoosts: 10,
    max_featured_listings: 10,
    featuredListings: 10,
    max_team_members: 10,
    agentAccounts: 10,
    features: [
      "Jusqu'\xE0 100 annonces actives",
      "25 photos HD par annonce & 20 vid\xE9os immersives",
      "10 boosts inclus / mois",
      "Jusqu'\xE0 10 membres d'\xE9quipe & comptes collaborateurs",
      "Essai gratuit configurable (14 jours) & Support prioritaire 7j/7"
    ],
    recommended: true,
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: true,
    hasPrioritySupport: true,
    is_active: true,
    isActive: true
  },
  {
    id: "promoter_vip",
    name: "Promoteur Immobilier VIP",
    description: "Audience Promoteur (Brouillon Admin au lancement) : grands chantiers, lotissements et banni\xE8res d\xE9di\xE9es.",
    category: "promoter",
    audience: "promoteur",
    badge: "Bient\xF4t disponible",
    price_usd: 149,
    price_cdf: 424650,
    priceMonthly: 149,
    priceMonthlyCDF: 424650,
    price_yearly_usd: 1490,
    priceYearly: 1490,
    price_yearly_cdf: 4246500,
    priceYearlyCDF: 4246500,
    trial_days: 14,
    trialDays: 14,
    currency: "USD",
    billing_period: "monthly",
    billingPeriod: "month",
    max_listings: 500,
    maxListings: 500,
    max_photos_per_listing: 40,
    maxPhotos: 40,
    max_videos: 50,
    maxVideos: 50,
    included_boosts: 30,
    includedBoosts: 30,
    max_featured_listings: 30,
    featuredListings: 30,
    max_team_members: 25,
    agentAccounts: 25,
    features: [
      "Jusqu'\xE0 500 annonces de projets & lotissements",
      "40 photos HD par annonce & 50 vid\xE9os",
      "30 boosts inclus / mois & vitrine sponsoris\xE9e",
      "Jusqu'\xE0 25 membres d'\xE9quipe"
    ],
    recommended: false,
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: true,
    hasPrioritySupport: true,
    is_active: false,
    isActive: false
  },
  {
    id: "enterprise",
    name: "Pack Entreprise & Groupe",
    description: "Audience Entreprise (Brouillon Admin au lancement) : grands comptes institutionnels et groupes fonciers.",
    category: "enterprise",
    audience: "entreprise",
    badge: "Sur devis",
    price_usd: 299,
    price_cdf: 852150,
    priceMonthly: 299,
    priceMonthlyCDF: 852150,
    price_yearly_usd: 2990,
    priceYearly: 2990,
    price_yearly_cdf: 8521500,
    priceYearlyCDF: 8521500,
    trial_days: 30,
    trialDays: 30,
    currency: "USD",
    billing_period: "monthly",
    billingPeriod: "month",
    max_listings: 1e3,
    maxListings: 1e3,
    max_photos_per_listing: 50,
    maxPhotos: 50,
    max_videos: 100,
    maxVideos: 100,
    included_boosts: 50,
    includedBoosts: 50,
    max_featured_listings: 50,
    featuredListings: 50,
    max_team_members: 50,
    agentAccounts: 50,
    features: [
      "Jusqu'\xE0 1000 annonces actives multi-filiales",
      "50 photos HD par annonce & 100 vid\xE9os",
      "50 boosts inclus / mois & API CRM d\xE9di\xE9e",
      "Jusqu'\xE0 50 membres d'\xE9quipe"
    ],
    recommended: false,
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: true,
    hasPrioritySupport: true,
    is_active: false,
    isActive: false
  }
];
var INITIAL_VISIBILITY_OPTIONS = [
  {
    id: "opt_featured_7d",
    name: "\xC0 la une 7 jours",
    slug: "mise_en_avant_7d",
    description: "Positionnement en t\xEAte d'accueil et de recherche avec l'\xE9tiquette \xAB \xC0 la une \xBB pendant 7 jours.",
    boost_type: "featured",
    duration_days: 7,
    price_usd: 10,
    price_cdf: 28500,
    price: 10,
    priceCDF: 28500,
    label_type: "\xC0 la une",
    badge_text: "\xC0 la une",
    icon: "Sparkles",
    is_active: true
  },
  {
    id: "opt_sponsorise_14d",
    name: "Annonce Sponsoris\xE9e 14 jours",
    slug: "annonce_sponsorisee_14d",
    description: "Mise en avant prioritaire dans les r\xE9sultats de recherche avec l'\xE9tiquette \xAB Sponsoris\xE9 \xBB pendant 14 jours.",
    boost_type: "sponsorise",
    duration_days: 14,
    price_usd: 15,
    price_cdf: 42750,
    price: 15,
    priceCDF: 42750,
    label_type: "Sponsoris\xE9",
    badge_text: "Sponsoris\xE9",
    icon: "Megaphone",
    is_active: true
  },
  {
    id: "opt_premium_30d",
    name: "Pack \xC0 la une 30 jours",
    slug: "annonce_premium_30d",
    description: "Affichage prioritaire \xAB \xC0 la une \xBB pendant 30 jours complets avec mise en valeur maximale.",
    boost_type: "premium",
    duration_days: 30,
    price_usd: 25,
    price_cdf: 71250,
    price: 25,
    priceCDF: 71250,
    label_type: "\xC0 la une",
    badge_text: "\xC0 la une",
    icon: "Crown",
    is_active: true
  },
  {
    id: "opt_urgent_14d",
    name: "Badge Urgent 14 jours",
    slug: "badge_urgent_14d",
    description: "Signal\xE9tique \xAB Urgent \xBB pour attirer imm\xE9diatement les acheteurs et locataires s\xE9rieux.",
    boost_type: "urgent",
    duration_days: 14,
    price_usd: 8,
    price_cdf: 22800,
    price: 8,
    priceCDF: 22800,
    badge_text: "Urgent",
    icon: "Zap",
    is_active: true
  },
  {
    id: "opt_refresh_bump",
    name: "Sponsoris\xE9 Flash 24h",
    slug: "remontee_tete",
    description: "Replacer votre annonce en t\xEAte des r\xE9sultats pendant 24h avec l'\xE9tiquette \xAB Sponsoris\xE9 \xBB.",
    boost_type: "refresh",
    duration_days: 1,
    price_usd: 5,
    price_cdf: 14250,
    price: 5,
    priceCDF: 14250,
    label_type: "Sponsoris\xE9",
    badge_text: "Sponsoris\xE9",
    icon: "ArrowUpCircle",
    is_active: true
  },
  {
    id: "opt_social_blast",
    name: "Pack Sponsoris\xE9 Multi-Canal 14 jours",
    slug: "diffusion_reseaux",
    description: "Annonce \xAB Sponsoris\xE9 \xBB en t\xEAte de liste + diffusion sur la communaut\xE9 Kinimmo.",
    boost_type: "social_blast",
    duration_days: 14,
    price_usd: 35,
    price_cdf: 99750,
    price: 35,
    priceCDF: 99750,
    label_type: "Sponsoris\xE9",
    badge_text: "Sponsoris\xE9",
    icon: "Share2",
    is_active: true
  }
];
var INITIAL_PAYMENT_METHODS = [
  {
    id: "pm_mpesa",
    provider: "mpesa",
    account_name: "KINIMMO SARL - Vodacom M-Pesa",
    account_number: "+243 810 000 000",
    merchant_code: "123456",
    instructions: "Envoyer le montant exact via M-Pesa puis ins\xE9rer le code de transaction pour validation instantan\xE9e.",
    is_active: true
  },
  {
    id: "pm_airtel",
    provider: "airtel",
    account_name: "KINIMMO SARL - Airtel Money RDC",
    account_number: "+243 990 000 000",
    merchant_code: "789012",
    instructions: "Paiement direct via Airtel Money RDC. Indiquez votre num\xE9ro de facture en r\xE9f\xE9rence.",
    is_active: true
  },
  {
    id: "pm_orange",
    provider: "orange",
    account_name: "KINIMMO SARL - Orange Money Kinshasa",
    account_number: "+243 890 000 000",
    merchant_code: "345678",
    instructions: "Paiement direct via Orange Money Kinshasa.",
    is_active: true
  },
  {
    id: "pm_rawbank",
    provider: "bank_transfer",
    account_name: "KINIMMO RDC - Rawbank Kinshasa Gombe",
    account_number: "01002-00012345678-90",
    merchant_code: null,
    instructions: "Virement bancaire ou versement au guichet Rawbank. Joindre le bordereau de versement comme preuve.",
    is_active: true
  },
  {
    id: "pm_equity",
    provider: "bank_transfer",
    account_name: "KINIMMO RDC - Equity BCDC Kinshasa",
    account_number: "00014-00987654321-12",
    merchant_code: null,
    instructions: "Virement bancaire ou versement au guichet Equity BCDC.",
    is_active: true
  }
];
var INITIAL_INVOICES = [
  {
    id: "inv_sub_101",
    invoice_number: "FAC-KIN-902140",
    user_id: "user_agent_01",
    user_name: "Dieudonn\xE9 Mwamba (Congo Luxury)",
    user_email: "dieudonne@congoluxury.cd",
    target_name: "Congo Luxury Homes SARL",
    target_email: "contact@congoluxuryhomes.cd",
    invoice_type: "subscription",
    plan_id: "agency",
    plan_name: "Agence Immobili\xE8re Certifi\xE9e",
    amount: 79,
    currency: "USD",
    amount_cdf: 225150,
    total_amount: 79,
    total_amount_cdf: 225150,
    payment_method_id: "pm_rawbank",
    payment_method_provider: "Rawbank Virement",
    transaction_reference: "RAW-FT-2026-99120",
    status: "paid",
    due_date: "2026-10-15",
    created_at: new Date(Date.now() - 3 * 864e5).toISOString()
  },
  {
    id: "inv_bst_102",
    invoice_number: "BST-KIN-481902",
    user_id: "user_agent_02",
    user_name: "Patrick Kalombo",
    user_email: "patrick@immokingombe.cd",
    target_name: "Patrick Kalombo (Immo Kin Gombe)",
    target_email: "info@immokingombe.cd",
    invoice_type: "boost",
    option_id: "opt_premium_30d",
    option_name: "Pack Annonce Premium 30 jours",
    property_id: "prop-1",
    property_title: "Villa Moderne avec Piscine & Vue Fleuve - Macampagne",
    amount: 25,
    currency: "USD",
    amount_cdf: 71250,
    total_amount: 25,
    total_amount_cdf: 71250,
    payment_method_id: "pm_mpesa",
    payment_method_provider: "Vodacom M-Pesa",
    transaction_reference: "MP-8921-X99",
    status: "paid",
    due_date: "2026-10-10",
    created_at: new Date(Date.now() - 5 * 864e5).toISOString()
  },
  {
    id: "inv_sub_103",
    invoice_number: "FAC-KIN-772109",
    user_id: "user_agent_03",
    user_name: "Sarah Mbuyi",
    user_email: "sarah.mbuyi@fleuvecongoimmo.cd",
    target_name: "Sarah Mbuyi (Fleuve Congo Immo)",
    target_email: "sarah.mbuyi@fleuvecongoimmo.cd",
    invoice_type: "subscription",
    plan_id: "pro",
    plan_name: "Pro Courtier Ind\xE9pendant",
    amount: 29,
    currency: "USD",
    amount_cdf: 82650,
    total_amount: 29,
    total_amount_cdf: 82650,
    payment_method_id: "pm_orange",
    payment_method_provider: "Orange Money Kinshasa",
    transaction_reference: "OM-TX-44129",
    status: "pending",
    due_date: "2026-10-05",
    created_at: new Date(Date.now() - 1 * 864e5).toISOString()
  }
];
var LAUNCH_AUDIENCES = ["grand_public", "agence"];
function mapCategoryToAudienceServer(category, id) {
  if (id === "enterprise") return "entreprise";
  if (id === "promoter_vip") return "promoteur";
  if (id === "agency") return "agence";
  if (category === "agency") return "agence";
  if (category === "promoter") return "promoteur";
  if (category === "enterprise") return "entreprise";
  return "grand_public";
}
function getActiveExchangeRateServer() {
  try {
    const raw = Number(inMemorySettings?.exchange_rate_usd_cdf);
    if (Number.isFinite(raw) && raw > 0) return raw;
  } catch {
  }
  return 2850;
}
function normalizeServerPlan(p, activeRate) {
  const rate = Number.isFinite(Number(activeRate)) && Number(activeRate) > 0 ? Number(activeRate) : 2850;
  const base = INITIAL_PLANS.find((ip) => ip.id === p.id);
  const audience = p.audience || mapCategoryToAudienceServer(p.category, p.id);
  const priceUsd = Number(p.price_usd ?? p.priceMonthly ?? base?.price_usd ?? 0);
  const priceCdf = activeRate && priceUsd > 0 ? Math.round(priceUsd * rate) : Number(p.price_cdf ?? p.priceMonthlyCDF ?? base?.price_cdf ?? Math.round(priceUsd * rate));
  const priceYearlyUsd = Number(p.price_yearly_usd ?? p.priceYearly ?? base?.price_yearly_usd ?? Math.round(priceUsd * 10));
  const priceYearlyCdf = activeRate && priceYearlyUsd > 0 ? Math.round(priceYearlyUsd * rate) : Number(p.price_yearly_cdf ?? p.priceYearlyCDF ?? base?.price_yearly_cdf ?? Math.round(priceYearlyUsd * rate));
  const maxListings = Number(p.max_listings ?? p.maxListings ?? base?.max_listings ?? 3);
  const maxPhotos = Number(p.max_photos_per_listing ?? p.maxPhotos ?? base?.max_photos_per_listing ?? 6);
  const maxVideos = Number(p.max_videos ?? p.maxVideos ?? base?.max_videos ?? 1);
  const includedBoosts = Number(p.included_boosts ?? p.includedBoosts ?? p.max_featured_listings ?? p.featuredListings ?? base?.included_boosts ?? 0);
  const maxTeam = Number(p.max_team_members ?? p.agentAccounts ?? base?.max_team_members ?? 1);
  const trialDays = Number(p.trial_days ?? p.trialDays ?? base?.trial_days ?? 0);
  const defaultActive = LAUNCH_AUDIENCES.includes(audience);
  const isActive = p.is_active !== void 0 ? Boolean(p.is_active) : p.isActive !== void 0 ? Boolean(p.isActive) : defaultActive;
  return {
    ...base || {},
    ...p,
    audience,
    category: p.category || (audience === "agence" ? "agency" : audience === "promoteur" ? "promoter" : audience === "entreprise" ? "enterprise" : "individual"),
    price_usd: priceUsd,
    priceMonthly: priceUsd,
    price_cdf: priceCdf,
    priceMonthlyCDF: priceCdf,
    price_yearly_usd: priceYearlyUsd,
    priceYearly: priceYearlyUsd,
    price_yearly_cdf: priceYearlyCdf,
    priceYearlyCDF: priceYearlyCdf,
    trial_days: trialDays,
    trialDays,
    max_listings: maxListings,
    maxListings,
    max_photos_per_listing: maxPhotos,
    maxPhotos,
    max_videos: maxVideos,
    maxVideos,
    included_boosts: includedBoosts,
    includedBoosts,
    max_featured_listings: includedBoosts,
    featuredListings: includedBoosts,
    max_team_members: maxTeam,
    agentAccounts: maxTeam,
    is_active: isActive,
    isActive
  };
}
function loadLocalPlans() {
  try {
    if (fs2.existsSync(LOCAL_PLANS_FILE)) {
      const content = fs2.readFileSync(LOCAL_PLANS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map((p) => normalizeServerPlan(p));
        for (const defPlan of INITIAL_PLANS) {
          if (!normalized.some((p) => p.id === defPlan.id)) {
            normalized.push(defPlan);
          }
        }
        return normalized;
      }
    }
  } catch (e) {
    console.error("Erreur lecture pricing_plans.json", e);
  }
  return INITIAL_PLANS.map((p) => normalizeServerPlan(p));
}
function saveLocalPlans(list) {
  try {
    fs2.writeFileSync(LOCAL_PLANS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture pricing_plans.json", e);
  }
}
function loadLocalPaymentMethods() {
  try {
    if (fs2.existsSync(LOCAL_PAYMENT_METHODS_FILE)) {
      const content = fs2.readFileSync(LOCAL_PAYMENT_METHODS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Erreur lecture payment_methods_store.json", e);
  }
  return INITIAL_PAYMENT_METHODS;
}
function saveLocalPaymentMethods(list) {
  try {
    fs2.writeFileSync(LOCAL_PAYMENT_METHODS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture payment_methods_store.json", e);
  }
}
function loadLocalOptions() {
  try {
    if (fs2.existsSync(LOCAL_OPTIONS_FILE)) {
      const content = fs2.readFileSync(LOCAL_OPTIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const list = parsed.map((opt) => ({
          ...opt,
          label_type: opt.boost_type === "urgent" ? void 0 : resolveBoostPrimaryLabel(opt.boost_type, opt.badge_text, opt.label_type)
        }));
        const sponsorOpt = INITIAL_VISIBILITY_OPTIONS.find((o) => o.id === "opt_sponsorise_14d");
        if (sponsorOpt && !list.some((o) => o.id === "opt_sponsorise_14d")) {
          list.splice(1, 0, sponsorOpt);
        }
        return list;
      }
    }
  } catch (e) {
    console.error("Erreur lecture visibility_options.json", e);
  }
  return INITIAL_VISIBILITY_OPTIONS;
}
function saveLocalOptions(list) {
  try {
    fs2.writeFileSync(LOCAL_OPTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture visibility_options.json", e);
  }
}
var LOCAL_INVOICES_FILE = path2.join(__dirname, "invoices_store.json");
function loadLocalInvoices() {
  try {
    if (fs2.existsSync(LOCAL_INVOICES_FILE)) {
      const content = fs2.readFileSync(LOCAL_INVOICES_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Erreur lecture invoices_store.json", e);
  }
  return INITIAL_INVOICES;
}
function saveLocalInvoices(list) {
  try {
    fs2.writeFileSync(LOCAL_INVOICES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture invoices_store.json", e);
  }
}
var inMemoryPlans = loadLocalPlans();
var inMemoryOptions = loadLocalOptions();
var inMemoryPaymentMethods = loadLocalPaymentMethods();
var inMemoryInvoices = loadLocalInvoices();
async function saveBase64PropertyImage(imgData, propertyId, index) {
  if (!imgData || typeof imgData !== "string") return "";
  const trimmed = imgData.trim();
  if (!trimmed.startsWith("data:image")) {
    const uploadsMatch = trimmed.match(/^https?:\/\/[^/]+(\/uploads\/images\/[^?#]+)$/i);
    return uploadsMatch ? uploadsMatch[1] : trimmed;
  }
  try {
    serverCloudinaryConfig = loadCloudinaryConfig();
    applyCloudinarySettings(serverCloudinaryConfig);
    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.apiSecret && serverCloudinaryConfig.apiKey) {
      const uploaded = await cloudinary.uploader.upload(trimmed, {
        folder: "kinimmo/property_images",
        transformation: [{ quality: "auto:good", fetch_format: "auto" }]
      });
      if (uploaded?.secure_url) return uploaded.secure_url;
    } else if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.uploadPreset) {
      const formData = new FormData();
      formData.append("file", trimmed);
      formData.append("upload_preset", serverCloudinaryConfig.uploadPreset);
      formData.append("folder", "kinimmo/property_images");
      const r = await fetch(`https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/image/upload`, {
        method: "POST",
        body: formData
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j?.secure_url) return j.secure_url;
    }
  } catch (cloudErr) {
    console.warn("[server.ts] Cloudinary image upload fallback to disk:", cloudErr?.message || cloudErr);
  }
  try {
    const matches = trimmed.match(/^data:image\/([A-Za-z0-9.+-]+);base64,(.+)$/s);
    if (!matches || matches.length !== 3) return trimmed;
    const rawExt = matches[1].toLowerCase();
    const ext = rawExt.includes("png") ? "png" : rawExt.includes("webp") ? "webp" : rawExt.includes("gif") ? "gif" : rawExt.includes("avif") ? "avif" : "jpg";
    const uploadDir = path2.join(devUploadsDir, "images");
    if (!fs2.existsSync(uploadDir)) {
      fs2.mkdirSync(uploadDir, { recursive: true });
    }
    const cleanPropId = String(propertyId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `img_${cleanPropId}_${index}_${Date.now()}.${ext}`;
    fs2.writeFileSync(path2.join(uploadDir, filename), Buffer.from(matches[2], "base64"));
    return `/uploads/images/${filename}`;
  } catch {
    return trimmed;
  }
}
var MIN_PROPERTY_PHOTOS = 3;
var MAX_PROPERTY_PHOTOS = 20;
var MAX_IMAGE_FILE_BYTES2 = 10 * 1024 * 1024;
var MAX_VIDEO_FILE_BYTES2 = 100 * 1024 * 1024;
var MAX_VIDEO_DURATION_SECONDS = 60;
var ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
var ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"];
var DEFAULT_VIRTUAL_TOUR_DOMAINS = [
  "my.matterport.com",
  "matterport.com",
  "kuula.co",
  "www.kuula.co",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com"
];
function extractCloudinaryPublicIdServer(url) {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) return null;
  try {
    const clean = url.split("?")[0];
    const marker = "/upload/";
    const idx = clean.indexOf(marker);
    if (idx === -1) return null;
    let rest = clean.slice(idx + marker.length);
    const versionMatch = rest.match(/(?:^|\/)v\d+\/(.+)$/);
    if (versionMatch) {
      rest = versionMatch[1];
    } else {
      const parts = rest.split("/");
      if (parts.length > 1 && (parts[0].includes(",") || parts[0].includes("_"))) {
        rest = parts.slice(1).join("/");
      }
    }
    return rest.replace(/\.[a-z0-9]+$/i, "") || null;
  } catch {
    return null;
  }
}
async function destroyFromCloudinaryServer({ publicId, url, resourceType }) {
  const targetPublicId = publicId || extractCloudinaryPublicIdServer(url);
  if (!targetPublicId) return { success: true, skipped: true };
  serverCloudinaryConfig = loadCloudinaryConfig();
  if (!serverCloudinaryConfig.cloudName || !serverCloudinaryConfig.apiKey || !serverCloudinaryConfig.apiSecret) {
    return { success: false, skipped: true };
  }
  applyCloudinarySettings(serverCloudinaryConfig);
  const resType = resourceType || (typeof url === "string" && url.includes("/video/upload/") ? "video" : "image");
  try {
    const res = await cloudinary.uploader.destroy(targetPublicId, { resource_type: resType, invalidate: true });
    return { success: res?.result === "ok" || res?.result === "not found", result: res?.result, publicId: targetPublicId };
  } catch (err) {
    return { success: false, error: err?.message };
  }
}
function getUserMediaQuotasServer(userId) {
  const u = inMemoryUsers.find((usr) => usr.id === userId);
  const planId = u?.planId || "starter";
  const plan = inMemoryPlans.find((pl) => pl.id === planId) || inMemoryPlans[0] || {};
  const maxPlanPhotos = Number(plan.max_photos_per_listing ?? plan.maxPhotos ?? MAX_PROPERTY_PHOTOS);
  const maxPlanVideos = Number(plan.max_videos ?? plan.maxVideos ?? 25);
  const usedVideos = inMemoryVideos.filter((v) => v.userId === userId && v.status !== "rejected").length;
  return { maxPlanPhotos, maxPlanVideos, usedVideos };
}
function validateMediaUploadServer(params) {
  const {
    purpose = "property_photo",
    resourceType = "image",
    mimeType,
    fileSize,
    fileCount = 1,
    currentPhotoCount = 0,
    duration,
    maxPlanPhotos = MAX_PROPERTY_PHOTOS,
    maxPlanVideos = 50,
    usedVideos = 0,
    isAdmin = false
  } = params;
  const normalizedMime = mimeType ? String(mimeType).toLowerCase().trim() : "";
  const sizeNum = fileSize !== void 0 && fileSize !== null ? Number(fileSize) : null;
  const durationNum = duration !== void 0 && duration !== null ? Number(duration) : null;
  if (resourceType === "image") {
    if (normalizedMime && !ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMime)) {
      return { valid: false, status: 400, message: `Format photo non autoris\xE9 (${normalizedMime}). Formats accept\xE9s : JPEG, PNG ou WebP.` };
    }
    if (sizeNum !== null && Number.isFinite(sizeNum) && sizeNum > MAX_IMAGE_FILE_BYTES2) {
      return { valid: false, status: 413, message: "Photo trop volumineuse : taille maximale de 10 Mo par image." };
    }
    if (purpose === "property_photo") {
      const effectiveMax = isAdmin ? MAX_PROPERTY_PHOTOS : Math.min(MAX_PROPERTY_PHOTOS, Math.max(MIN_PROPERTY_PHOTOS, Number(maxPlanPhotos || MAX_PROPERTY_PHOTOS)));
      if (Number(currentPhotoCount || 0) + Number(fileCount || 1) > effectiveMax) {
        return { valid: false, status: 403, message: `Quota de photos atteint : maximum ${effectiveMax} photos par annonce (plafond 20).` };
      }
    }
  } else {
    if (normalizedMime && !normalizedMime.startsWith("video/") && !ALLOWED_VIDEO_MIME_TYPES.includes(normalizedMime)) {
      return { valid: false, status: 400, message: `Format vid\xE9o non autoris\xE9 (${normalizedMime}). Formats accept\xE9s : MP4, MOV ou WebM.` };
    }
    if (sizeNum !== null && Number.isFinite(sizeNum) && sizeNum > MAX_VIDEO_FILE_BYTES2) {
      return { valid: false, status: 413, message: "Vid\xE9o trop volumineuse : taille maximale autoris\xE9e de 100 Mo." };
    }
    if (durationNum !== null && Number.isFinite(durationNum) && durationNum > MAX_VIDEO_DURATION_SECONDS) {
      return { valid: false, status: 400, message: `Dur\xE9e vid\xE9o d\xE9pass\xE9e (${Math.round(durationNum)}s). Maximum autoris\xE9 : 60 secondes.` };
    }
    if (!isAdmin && Number.isFinite(Number(maxPlanVideos)) && Number(maxPlanVideos) >= 0 && usedVideos >= maxPlanVideos) {
      return { valid: false, status: 403, message: `Quota vid\xE9o de votre formule atteint (${usedVideos}/${maxPlanVideos} vid\xE9os).` };
    }
  }
  return { valid: true };
}
function normalizeAllowedDomainsServer(raw) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === "string") {
    const t = raw.trim();
    if (t.startsWith("[")) {
      try {
        const p = JSON.parse(t);
        if (Array.isArray(p)) list = p;
      } catch {
      }
    } else if (t) {
      list = t.split(/[\n,;]+/);
    }
  }
  const cleaned = list.map((d) => String(d || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "")).filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : [...DEFAULT_VIRTUAL_TOUR_DOMAINS];
}
function validateVirtualTourDomainServer(rawUrl, allowedRaw) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return { valid: true, normalizedUrl: void 0 };
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, message: "URL de visite virtuelle invalide." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { valid: false, message: "Seuls les liens HTTPS/HTTP sont autoris\xE9s pour les visites virtuelles." };
  }
  const hostname = parsed.hostname.toLowerCase();
  const whitelist = normalizeAllowedDomainsServer(allowedRaw);
  const ok = whitelist.some((d) => {
    const clean = d.replace(/^www\./, "");
    return hostname === d || hostname === clean || hostname.endsWith(`.${clean}`);
  });
  if (!ok) {
    return { valid: false, message: `Le domaine "${hostname}" n'est pas autoris\xE9 pour les visites virtuelles.` };
  }
  return { valid: true, normalizedUrl: parsed.toString() };
}
function hammingDistanceHex64Server(a, b) {
  if (!a || !b || a.length !== 16 || b.length !== 16) return 64;
  let dist = 0;
  for (let i = 0; i < 16; i++) {
    const va = parseInt(a[i], 16);
    const vb = parseInt(b[i], 16);
    if (Number.isNaN(va) || Number.isNaN(vb)) return 64;
    let xor = va ^ vb;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}
function findDuplicateFingerprintsInMemory(fingerprints, imageUrls, excludePropertyId) {
  const cleanFps = Array.isArray(fingerprints) ? fingerprints.map((f) => String(f || "").trim().toLowerCase()).filter((f) => f.length === 16) : [];
  const cleanUrls = Array.isArray(imageUrls) ? imageUrls.map((u) => String(u || "").trim()).filter(Boolean) : [];
  if (cleanFps.length === 0 && cleanUrls.length === 0) return [];
  const matches = [];
  for (const prop of inMemoryProperties) {
    if (excludePropertyId && prop.id === excludePropertyId) continue;
    let matched = false;
    for (const u of cleanUrls) {
      if (Array.isArray(prop.images) && prop.images.includes(u)) {
        matches.push({ propertyId: prop.id, propertyTitle: prop.title, agentId: prop.agentId, imageUrl: u, distance: 0 });
        matched = true;
        break;
      }
    }
    if (matched) continue;
    const existingFps = Array.isArray(prop.imageFingerprints) ? prop.imageFingerprints : Array.isArray(prop.imagesMeta) ? prop.imagesMeta.map((m) => m?.fingerprint).filter(Boolean) : [];
    for (const fp of cleanFps) {
      for (const efp of existingFps) {
        const dist = hammingDistanceHex64Server(fp, String(efp || "").toLowerCase());
        if (dist <= 6) {
          matches.push({ propertyId: prop.id, propertyTitle: prop.title, agentId: prop.agentId, distance: dist });
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }
  return matches;
}
function ensurePendingVideoModerationInMemory({ prop, user, videoUrl }) {
  if (!videoUrl || typeof videoUrl !== "string" || !videoUrl.trim()) return void 0;
  const trimmed = videoUrl.trim();
  const existing = inMemoryVideos.find((v) => v.propertyId === prop.id && v.videoUrl === trimmed);
  if (existing) return existing.status;
  const vidStatus = user.role === "admin" ? "approved" : "pending";
  const newVideo = {
    id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    propertyId: prop.id,
    userId: user.id,
    videoUrl: trimmed,
    thumbnailUrl: prop.images?.[0] || "",
    description: "Visite vid\xE9o soumise depuis le formulaire d'annonce",
    status: vidStatus,
    viewsCount: 0,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    propertyTitle: prop.title || "Bien Immobilier Kinshasa",
    propertyPrice: prop.price || 0,
    propertyCurrency: prop.currency || "USD",
    propertyCommune: prop.commune || "Kinshasa",
    propertyQuartier: prop.quartier || "",
    propertyType: prop.type || "villa",
    propertyStatus: prop.status || "for-sale",
    propertyBedrooms: prop.bedrooms,
    propertyBathrooms: prop.bathrooms,
    agentName: prop.agencyName || user.agencyName || user.name || "Agent Immobilier Kinimmo",
    agencyName: prop.agencyName || user.agencyName,
    agentPhone: prop.contactPhone || user.phone,
    agentWhatsapp: prop.contactPhone || user.whatsapp || user.phone,
    agentVerified: Boolean(user.isVerified)
  };
  inMemoryVideos.unshift(newVideo);
  saveLocalVideos(inMemoryVideos);
  return vidStatus;
}
function getFeaturedSlotsLimitServer() {
  return parseFeaturedSlotsLimit(inMemorySettings?.featured_slots_limit ?? DEFAULT_FEATURED_SLOTS_LIMIT);
}
function getLivePropertyMetrics(prop) {
  const analyticsRow = prop?.id ? inMemoryAnalytics[prop.id] : void 0;
  const views = Math.max(Number(prop?.viewsCount || 0), Number(analyticsRow?.views || 0));
  const whatsapp = Math.max(Number(prop?.whatsappClicks || 0), Number(analyticsRow?.whatsapp || 0));
  const phone = Math.max(Number(prop?.phoneCalls || 0), Number(analyticsRow?.phone || 0));
  const leads = Number(prop?.leadsCount || 0);
  return {
    views,
    contacts: whatsapp + phone + leads,
    analyticsRow
  };
}
function countActiveBoostSlotsServer(nowMs = Date.now()) {
  return inMemoryProperties.filter((p) => getActiveBoostDisplay(p, nowMs).isActive).length;
}
function pickFirstNonEmptyServer(...values) {
  for (const val of values) {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed) return trimmed;
    }
  }
  return void 0;
}
function enrichPropertyPublisherFields(prop) {
  const matchedUser = inMemoryUsers.find(
    (u) => prop.userId && u.id === prop.userId || prop.agentId && (u.id === prop.agentId || u.agentId === prop.agentId) || prop.contactEmail && u.email?.toLowerCase() === String(prop.contactEmail).toLowerCase()
  );
  const matchedAgent = inMemoryAgents.find(
    (a) => prop.agentId && (a.id === prop.agentId || a.userId === prop.agentId) || prop.userId && (a.userId === prop.userId || a.id === prop.userId) || matchedUser?.email && a.email?.toLowerCase() === matchedUser.email.toLowerCase()
  );
  const matchedAgency = inMemoryAgencies.find(
    (ag) => prop.agencyId && ag.id === prop.agencyId || matchedAgent?.agencyId && ag.id === matchedAgent.agencyId
  );
  const agentName = pickFirstNonEmptyServer(
    prop.agentName,
    matchedUser?.name,
    matchedAgent?.name,
    matchedAgency?.managerName,
    matchedAgency?.name,
    prop.agencyName
  );
  const agentPhone = pickFirstNonEmptyServer(
    prop.agentPhone,
    matchedUser?.phone,
    matchedAgent?.phone,
    prop.contactPhone,
    matchedAgency?.phone
  );
  const agentWhatsapp = pickFirstNonEmptyServer(
    prop.agentWhatsapp,
    prop.contactWhatsapp,
    matchedUser?.whatsapp,
    matchedAgent?.whatsapp,
    matchedUser?.phone,
    matchedAgent?.phone,
    prop.contactPhone,
    matchedAgency?.whatsapp,
    matchedAgency?.phone
  );
  const agentEmail = pickFirstNonEmptyServer(
    prop.agentEmail,
    matchedUser?.email,
    matchedAgent?.email,
    prop.contactEmail,
    matchedAgency?.email
  );
  const agentAvatar = pickFirstNonEmptyServer(
    prop.agentAvatar,
    matchedUser?.avatar,
    matchedAgent?.avatar,
    matchedAgency?.logo
  );
  return {
    ...prop,
    ...agentName ? { agentName } : {},
    ...agentPhone ? { agentPhone, contactPhone: prop.contactPhone || agentPhone } : {},
    ...agentWhatsapp ? { agentWhatsapp, contactWhatsapp: prop.contactWhatsapp || agentWhatsapp } : {},
    ...agentEmail ? { agentEmail, contactEmail: prop.contactEmail || agentEmail } : {},
    ...agentAvatar ? { agentAvatar } : {},
    ...matchedAgency?.name && !prop.agencyName ? { agencyName: matchedAgency.name } : {},
    ...matchedAgency?.logo && !prop.agencyLogo ? { agencyLogo: matchedAgency.logo } : {},
    ...matchedAgency?.phone ? { agencyPhone: matchedAgency.phone } : {},
    ...matchedAgency?.whatsapp ? { agencyWhatsapp: matchedAgency.whatsapp } : {},
    ...matchedAgency?.email ? { agencyEmail: matchedAgency.email } : {},
    ...matchedUser?.createdAt && !prop.agentCreatedAt ? { agentCreatedAt: matchedUser.createdAt } : {},
    agentVerified: Boolean(prop.agentVerified || matchedUser?.isVerified || matchedAgent?.isVerified || matchedAgency?.isVerified)
  };
}
function sanitizePropertyForViewer(prop, authUser) {
  const normalized = normalizePropertyRecord(prop);
  const matchingVideo = inMemoryVideos.find((v) => v.propertyId === normalized.id && v.videoUrl === normalized.videoUrl) || inMemoryVideos.find((v) => v.propertyId === normalized.id);
  const videoModStatus = matchingVideo?.status || normalized.videoModerationStatus;
  const isOwnerOrAdmin = Boolean(authUser && canManageProperty(authUser, normalized));
  const nowMs = Date.now();
  const boostDisplay = getActiveBoostDisplay(normalized, nowMs);
  const boostSanitized = boostDisplay.isActive ? normalized : {
    ...normalized,
    featured: false,
    isPremium: false,
    isUrgent: false,
    isSponsored: false,
    boostLabel: void 0,
    listingTier: normalized.listingTier === "free" ? "free" : "standard"
  };
  const { privateFields: _pf, ...withoutPrivate } = boostSanitized;
  const baseProp = enrichPropertyPublisherFields(isOwnerOrAdmin ? boostSanitized : withoutPrivate);
  if (videoModStatus && videoModStatus !== "approved" && !isOwnerOrAdmin) {
    return {
      ...baseProp,
      videoUrl: void 0,
      videoModerationStatus: videoModStatus
    };
  }
  return {
    ...baseProp,
    ...videoModStatus ? { videoModerationStatus: videoModStatus } : {}
  };
}
function normalizePropertyRecord(p) {
  if (!p || typeof p !== "object") return p;
  const status = String(p.status || "for-sale");
  const isRent = status === "for-rent";
  const rawPrice = Number(p.price);
  const safePrice = Number.isFinite(rawPrice) && rawPrice >= 0 ? Math.round(rawPrice) : 0;
  const normalizedCurrency = String(p.currency || "USD").toUpperCase() === "CDF" ? "CDF" : "USD";
  const normalizedPeriod = isRent ? String(p.period || "").toLowerCase() === "year" ? "year" : "month" : "total";
  const rawGuarantee = isRent && p.guaranteeMonths !== void 0 && p.guaranteeMonths !== null && p.guaranteeMonths !== "" ? Math.round(Number(p.guaranteeMonths)) : void 0;
  const rawAdvance = isRent && p.advanceMonths !== void 0 && p.advanceMonths !== null && p.advanceMonths !== "" ? Math.round(Number(p.advanceMonths)) : void 0;
  const safeGuarantee = rawGuarantee !== void 0 && Number.isInteger(rawGuarantee) && rawGuarantee >= 0 && rawGuarantee <= MAX_RENTAL_MONTHS ? rawGuarantee : void 0;
  const safeAdvance = rawAdvance !== void 0 && Number.isInteger(rawAdvance) && rawAdvance >= 0 && rawAdvance <= MAX_RENTAL_MONTHS ? rawAdvance : void 0;
  return {
    ...p,
    description: typeof p.description === "string" ? p.description : "",
    category: p.category || "R\xE9sidentiel",
    price: safePrice,
    currency: normalizedCurrency,
    period: normalizedPeriod,
    isNegotiable: coerceBooleanFlag(p.isNegotiable, false),
    guaranteeMonths: safeGuarantee,
    advanceMonths: safeAdvance,
    bedrooms: typeof p.bedrooms === "number" ? p.bedrooms : Number(p.bedrooms) || 0,
    bathrooms: typeof p.bathrooms === "number" ? p.bathrooms : Number(p.bathrooms) || 0,
    area: typeof p.area === "number" ? p.area : Number(p.area) || 0,
    images: Array.isArray(p.images) ? p.images : [],
    imagesMeta: Array.isArray(p.imagesMeta) ? p.imagesMeta : [],
    imageFingerprints: Array.isArray(p.imageFingerprints) ? p.imageFingerprints : [],
    labels: Array.isArray(p.labels) ? p.labels : [],
    amenities: Array.isArray(p.amenities) ? p.amenities : [],
    customFields: p.customFields && typeof p.customFields === "object" && !Array.isArray(p.customFields) ? p.customFields : {}
  };
}
var inMemoryProperties = (() => {
  try {
    if (fs2.existsSync(LOCAL_PROPERTIES_FILE)) {
      const raw = fs2.readFileSync(LOCAL_PROPERTIES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(normalizePropertyRecord);
    }
  } catch {
  }
  return (initialProperties || []).map((p) => {
    const rawSt = p.status === "sold" ? "SOLD" : p.published === false ? "DRAFT" : "PUBLISHED";
    return {
      ...p,
      listingStatus: rawSt,
      isAvailable: rawSt === "PUBLISHED",
      trust_status: p.trust_status || (p.id === "prop_1" ? "property_verified" : "unverified"),
      trust_level: p.trust_level || (p.id === "prop_1" ? "Bien V\xE9rifi\xE9 & Titre Foncier Contr\xF4l\xE9" : void 0),
      trust_score: p.trust_score ?? (p.id === "prop_1" ? 98 : 0),
      trust_verified_at: p.trust_verified_at || (p.id === "prop_1" ? "2026-09-12T15:00:00Z" : void 0),
      trust_expires_at: p.trust_expires_at || (p.id === "prop_1" ? "2027-09-12T15:00:00Z" : void 0),
      availability_status: p.availability_status || (rawSt === "PUBLISHED" ? "available" : "withdrawn"),
      availability_confirmed_at: p.availability_confirmed_at || (p.id === "prop_1" ? "2026-10-17T09:00:00Z" : void 0),
      statusHistory: [
        {
          id: `hist_init_${p.id}`,
          fromStatus: "NONE",
          toStatus: rawSt,
          changedByUserId: p.agentId || "admin",
          changedByName: "Syst\xE8me Kinimmo",
          changedAt: p.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
          note: "Cr\xE9ation et mise en ligne initiale de l'annonce"
        }
      ]
    };
  });
})();
function saveLocalProperties(list) {
  try {
    fs2.writeFileSync(LOCAL_PROPERTIES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture properties_store.json", e);
  }
}
var inMemoryCollaborators = (() => {
  try {
    if (fs2.existsSync(LOCAL_COLLABORATORS_FILE)) {
      const raw = fs2.readFileSync(LOCAL_COLLABORATORS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
  }
  return [
    {
      id: "collab_dieudonne",
      agencyId: "agency_congo_luxury",
      userId: "usr_dieudonne_01",
      name: "Dieudonn\xE9 Mwamba",
      email: "dieudonne@congoluxuryhomes.cd",
      phone: "+243 81 000 0001",
      whatsapp: "+243 81 000 0001",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "agency_owner",
      permissions: {
        canEditAllProperties: true,
        canAssignProperties: true,
        canAssignLeads: true,
        canViewBilling: true,
        canManageTeam: true
      },
      status: "active",
      invitedAt: "2026-01-01T08:00:00Z",
      joinedAt: "2026-01-01T08:30:00Z",
      activeListingsCount: 12,
      totalLeadsCount: 48
    },
    {
      id: "collab_patrick",
      agencyId: "agency_immo_kinshasa",
      userId: "usr_patrick_02",
      name: "Patrick Kalombo",
      email: "patrick@immokingombe.cd",
      phone: "+243 82 123 4567",
      whatsapp: "+243 82 123 4567",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      role: "agency_manager",
      permissions: {
        canEditAllProperties: true,
        canAssignProperties: true,
        canAssignLeads: true,
        canViewBilling: false,
        canManageTeam: true
      },
      status: "active",
      invitedAt: "2026-01-10T09:00:00Z",
      joinedAt: "2026-01-10T10:00:00Z",
      activeListingsCount: 8,
      totalLeadsCount: 32
    },
    {
      id: "collab_sarah",
      agencyId: "agency_fleuve_habitat",
      userId: "usr_sarah_03",
      name: "Sarah Mbuyi",
      email: "sarah@fleuvecongoimmo.cd",
      phone: "+243 99 876 5432",
      whatsapp: "+243 99 876 5432",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
      role: "agency_agent",
      permissions: {
        canEditAllProperties: false,
        canAssignProperties: false,
        canAssignLeads: false,
        canViewBilling: false,
        canManageTeam: false
      },
      status: "active",
      invitedAt: "2026-02-01T11:00:00Z",
      joinedAt: "2026-02-02T09:15:00Z",
      activeListingsCount: 5,
      totalLeadsCount: 19
    }
  ];
})();
function saveLocalCollaborators(list) {
  try {
    fs2.writeFileSync(LOCAL_COLLABORATORS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture agency_collaborators.json", e);
  }
}
var inMemoryTransactions = (() => {
  try {
    if (fs2.existsSync(LOCAL_TRANSACTIONS_FILE)) {
      const raw = fs2.readFileSync(LOCAL_TRANSACTIONS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
  }
  return [
    {
      id: "tx_001",
      agencyId: "agency_congo_luxury",
      propertyId: "prop_1",
      propertyTitle: "Villa Diplomatique Haute S\xE9curit\xE9 avec Piscine",
      agentId: "collab_dieudonne",
      agentName: "Dieudonn\xE9 Mwamba",
      clientName: "Ambassade & Mission Diplomatique",
      clientContact: "+243 81 999 8888",
      type: "sale",
      amount: 125e4,
      currency: "USD",
      commissionRate: 5,
      commissionAmount: 62500,
      status: "closed",
      notes: "Acte notari\xE9 sign\xE9 avec succ\xE8s \xE0 la Gombe.",
      closedAt: "2026-09-15T14:00:00Z",
      createdAt: "2026-08-20T10:00:00Z"
    },
    {
      id: "tx_002",
      agencyId: "agency_immo_kinshasa",
      propertyId: "prop_2",
      propertyTitle: "Appartement Haut Standing Vue Fleuve",
      agentId: "collab_patrick",
      agentName: "Patrick Kalombo",
      clientName: "Directeur G\xE9n\xE9ral Multinationale T\xE9l\xE9com",
      clientContact: "+243 82 555 4444",
      type: "rent",
      amount: 3500,
      currency: "USD",
      commissionRate: 100,
      commissionAmount: 3500,
      status: "closed",
      notes: "Bail locatif d'un an renouvelable.",
      closedAt: "2026-10-01T16:30:00Z",
      createdAt: "2026-09-25T11:00:00Z"
    }
  ];
})();
function saveLocalTransactions(list) {
  try {
    fs2.writeFileSync(LOCAL_TRANSACTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture agency_transactions.json", e);
  }
}
var inMemoryTrust = (() => {
  try {
    if (fs2.existsSync(LOCAL_TRUST_FILE)) {
      const raw = fs2.readFileSync(LOCAL_TRUST_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.verifications)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Erreur lecture trust_store.json", e);
  }
  return {
    verifications: [
      {
        id: "trust_prop_gombe_villa",
        targetType: "property",
        targetId: "prop_1",
        targetName: "Superbe Villa Duplex avec Piscine - Gombe",
        applicantUserId: "usr_dieudonne_01",
        applicantName: "Dieudonn\xE9 Mwamba",
        applicantEmail: "dieudonne@congoluxuryhomes.cd",
        applicantPhone: "+243 81 000 0001",
        trustStatus: "property_verified",
        trustLevel: "Bien V\xE9rifi\xE9 & Titre Foncier Contr\xF4l\xE9",
        trustScore: 98,
        submittedAt: "2026-09-10T10:00:00Z",
        reviewedAt: "2026-09-12T14:30:00Z",
        approvedAt: "2026-09-12T15:00:00Z",
        expiresAt: "2027-09-12T15:00:00Z",
        assignedAdminId: "admin_master",
        assignedAdminName: "Direction Kinimmo",
        adminNotes: "Titre de propri\xE9t\xE9 conforme au registre foncier de la Gombe (Vol. 42 / Folio 18). Visite physique confirm\xE9e.",
        createdAt: "2026-09-10T10:00:00Z",
        updatedAt: "2026-09-12T15:00:00Z"
      },
      {
        id: "trust_agent_patrick",
        targetType: "agent",
        targetId: "collab_patrick",
        targetName: "Patrick Kalombo",
        applicantUserId: "usr_patrick_02",
        applicantName: "Patrick Kalombo",
        applicantEmail: "patrick@congoluxuryhomes.cd",
        applicantPhone: "+243 82 555 4444",
        trustStatus: "pro_verified",
        trustLevel: "Professionnel Certifi\xE9 Kinimmo Trust",
        trustScore: 92,
        submittedAt: "2026-09-15T09:00:00Z",
        reviewedAt: "2026-09-16T11:00:00Z",
        approvedAt: "2026-09-16T11:30:00Z",
        expiresAt: "2027-09-16T11:30:00Z",
        assignedAdminId: "admin_master",
        assignedAdminName: "Direction Kinimmo",
        adminNotes: "Agr\xE9ment professionnel et identit\xE9 nationale v\xE9rifi\xE9s.",
        createdAt: "2026-09-15T09:00:00Z",
        updatedAt: "2026-09-16T11:30:00Z"
      },
      {
        id: "trust_prop_penthouse_river",
        targetType: "property",
        targetId: "prop_2",
        targetName: "Penthouse Ex\xE9cutif Vue Fleuve Congo - Ngaliema",
        applicantUserId: "usr_sarah_01",
        applicantName: "Sarah Mbuyi",
        applicantEmail: "sarah@fleuvecongoimmo.cd",
        applicantPhone: "+243 99 876 5432",
        trustStatus: "pending",
        trustLevel: "En attente d\u2019audit cadastral",
        trustScore: 35,
        submittedAt: "2026-10-14T08:30:00Z",
        adminNotes: "Dossier d\xE9pos\xE9 avec Certificat d\u2019enregistrement. En attente de contre-visite sur site.",
        createdAt: "2026-10-14T08:30:00Z",
        updatedAt: "2026-10-14T08:30:00Z"
      }
    ],
    documents: [
      {
        id: "doc_cert_gombe_1",
        verificationId: "trust_prop_gombe_villa",
        docType: "certificat_enregistrement",
        title: "Certificat d\u2019Enregistrement Vol. 42 Folio 18 Gombe",
        documentNumber: "CE-KIN-GMB-2024-897",
        fileUrl: "https://images.unsplash.com/photo-1618042164219-62c820f10723?w=800",
        fileSize: "2.4 MB",
        fileMimeType: "application/pdf",
        status: "approved",
        verifiedByUserId: "admin_master",
        verifiedByName: "Direction Kinimmo",
        verifiedAt: "2026-09-12T14:30:00Z",
        createdAt: "2026-09-10T10:05:00Z"
      },
      {
        id: "doc_mandat_gombe_1",
        verificationId: "trust_prop_gombe_villa",
        docType: "mandat_exclusif",
        title: "Mandat Exclusif de Commercialisation Notari\xE9",
        documentNumber: "MDT-EXCL-2026-004",
        fileUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800",
        fileSize: "1.8 MB",
        fileMimeType: "application/pdf",
        status: "approved",
        verifiedByUserId: "admin_master",
        verifiedByName: "Direction Kinimmo",
        verifiedAt: "2026-09-12T14:45:00Z",
        createdAt: "2026-09-10T10:08:00Z"
      },
      {
        id: "doc_id_patrick_1",
        verificationId: "trust_agent_patrick",
        docType: "passport",
        title: "Passeport Ordinaire RDC - Patrick Kalombo",
        documentNumber: "OP-CD-9823412",
        fileUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800",
        fileSize: "1.1 MB",
        fileMimeType: "image/jpeg",
        status: "approved",
        verifiedByUserId: "admin_master",
        verifiedByName: "Direction Kinimmo",
        verifiedAt: "2026-09-16T11:15:00Z",
        createdAt: "2026-09-15T09:05:00Z"
      },
      {
        id: "doc_cert_penthouse_2",
        verificationId: "trust_prop_penthouse_river",
        docType: "certificat_enregistrement",
        title: "Certificat d\u2019Enregistrement Ngaliema Macampagne",
        documentNumber: "CE-KIN-NGL-2023-412",
        fileUrl: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
        fileSize: "3.1 MB",
        fileMimeType: "application/pdf",
        status: "pending",
        createdAt: "2026-10-14T08:35:00Z"
      }
    ],
    checks: [
      {
        id: "chk_cadastre_1",
        verificationId: "trust_prop_gombe_villa",
        checkType: "cadastre_conservation_titres",
        checkLabel: "Contr\xF4le Cadastre & Conservation des Titres Immobiliers (Gombe)",
        result: "passed",
        evidenceNotes: "Titre v\xE9rifi\xE9 aupr\xE8s de la Conservation des Titres Immobiliers de la Lukunga. Aucune hypoth\xE8que ni litige en cours.",
        conductedByUserId: "admin_master",
        conductedByName: "Direction Kinimmo",
        conductedAt: "2026-09-12T14:00:00Z",
        createdAt: "2026-09-12T14:00:00Z"
      },
      {
        id: "chk_inspection_1",
        verificationId: "trust_prop_gombe_villa",
        checkType: "physical_site_inspection",
        checkLabel: "Inspection Physique sur Site \xE0 Kinshasa",
        result: "passed",
        evidenceNotes: "Visite des lieux effectu\xE9e. Propri\xE9t\xE9 conforme aux photos, standing v\xE9rifi\xE9, cl\xE9s remises pour visites VIP.",
        conductedByUserId: "admin_master",
        conductedByName: "Direction Kinimmo",
        conductedAt: "2026-09-12T11:00:00Z",
        createdAt: "2026-09-12T11:00:00Z"
      },
      {
        id: "chk_id_patrick",
        verificationId: "trust_agent_patrick",
        checkType: "identity_validation",
        checkLabel: "Validation Biom\xE9trique et Identit\xE9 Officielle",
        result: "passed",
        evidenceNotes: "Passeport valide et concordance d\u2019identit\xE9 confirm\xE9e en visio.",
        conductedByUserId: "admin_master",
        conductedByName: "Direction Kinimmo",
        conductedAt: "2026-09-16T11:00:00Z",
        createdAt: "2026-09-16T11:00:00Z"
      }
    ],
    auditLogs: [
      {
        id: "audit_01",
        verificationId: "trust_prop_gombe_villa",
        targetType: "property",
        targetId: "prop_1",
        adminUserId: "admin_master",
        adminName: "Direction Kinimmo",
        adminEmail: "direction@kinimmo.cd",
        action: "TRUST_GRANTED",
        previousStatus: "in_progress",
        newStatus: "property_verified",
        reasonOrNotes: "Audit cadastral et visite physique valid\xE9s sans r\xE9serve.",
        ipAddress: "105.101.42.12",
        createdAt: "2026-09-12T15:00:00Z"
      },
      {
        id: "audit_02",
        verificationId: "trust_agent_patrick",
        targetType: "agent",
        targetId: "collab_patrick",
        adminUserId: "admin_master",
        adminName: "Direction Kinimmo",
        adminEmail: "direction@kinimmo.cd",
        action: "TRUST_GRANTED",
        previousStatus: "in_progress",
        newStatus: "pro_verified",
        reasonOrNotes: "Agr\xE9ment professionnel v\xE9rifi\xE9.",
        ipAddress: "105.101.42.12",
        createdAt: "2026-09-16T11:30:00Z"
      }
    ],
    availabilities: [
      {
        id: "avail_prop_1",
        propertyId: "prop_1",
        propertyTitle: "Superbe Villa Duplex avec Piscine - Gombe",
        isAvailable: true,
        availabilityStatus: "available",
        lastConfirmedAt: "2026-10-17T09:00:00Z",
        lastConfirmedById: "collab_patrick",
        lastConfirmedByName: "Patrick Kalombo",
        confirmationMethod: "agent_statement",
        nextVerificationDue: "2026-10-31T09:00:00Z",
        notes: "Bien toujours disponible pour visites et signatures de bail.",
        createdAt: "2026-09-12T15:00:00Z",
        updatedAt: "2026-10-17T09:00:00Z"
      }
    ],
    notifications: [
      {
        id: "notif_trust_welcome",
        userId: "usr_dieudonne_01",
        title: "Certification Kinimmo Trust Valid\xE9e !",
        message: 'F\xE9licitations, votre bien "Superbe Villa Duplex avec Piscine - Gombe" arbore d\xE9sormais le badge officiel Kinimmo Trust.',
        type: "trust_approved",
        targetType: "property",
        targetId: "prop_1",
        isRead: false,
        createdAt: "2026-09-12T15:05:00Z"
      }
    ]
  };
})();
function saveLocalTrust(store) {
  try {
    fs2.writeFileSync(LOCAL_TRUST_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture trust_store.json", e);
  }
}
function loadLocalRequests() {
  try {
    if (fs2.existsSync(LOCAL_LEADS_FILE)) {
      const content = fs2.readFileSync(LOCAL_LEADS_FILE, "utf-8");
      return JSON.parse(content) || [];
    } else if (fs2.existsSync(LOCAL_LEADS_FILE_ALT)) {
      const content = fs2.readFileSync(LOCAL_LEADS_FILE_ALT, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture concierge_requests.json", e);
  }
  return [];
}
function saveLocalRequests(list) {
  try {
    fs2.writeFileSync(LOCAL_LEADS_FILE, JSON.stringify(list, null, 2), "utf-8");
    fs2.writeFileSync(LOCAL_LEADS_FILE_ALT, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture concierge_requests.json", e);
  }
}
function loadLocalVisits() {
  try {
    if (fs2.existsSync(LOCAL_VISITS_FILE)) {
      const content = fs2.readFileSync(LOCAL_VISITS_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture property_visits.json", e);
  }
  return [];
}
function saveLocalVisits(list) {
  try {
    fs2.writeFileSync(LOCAL_VISITS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture property_visits.json", e);
  }
}
function loadLocalAds() {
  try {
    if (fs2.existsSync(LOCAL_ADS_FILE)) {
      const content = fs2.readFileSync(LOCAL_ADS_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture advertisements.json", e);
  }
  return [];
}
function saveLocalAds(list) {
  try {
    fs2.writeFileSync(LOCAL_ADS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture advertisements.json", e);
  }
}
function loadLocalSlides() {
  try {
    if (fs2.existsSync(LOCAL_SLIDES_FILE)) {
      const content = fs2.readFileSync(LOCAL_SLIDES_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture hero_slides.json", e);
  }
  return [];
}
function saveLocalSlides(list) {
  try {
    fs2.writeFileSync(LOCAL_SLIDES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture hero_slides.json", e);
  }
}
function loadLocalNotifications() {
  try {
    if (fs2.existsSync(LOCAL_NOTIFICATIONS_FILE)) {
      const content = fs2.readFileSync(LOCAL_NOTIFICATIONS_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture notifications.json", e);
  }
  return [];
}
function saveLocalNotifications(list) {
  try {
    fs2.writeFileSync(LOCAL_NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture notifications.json", e);
  }
}
var inMemoryRequests = loadLocalRequests();
var inMemoryVisits = loadLocalVisits();
var inMemoryAds = loadLocalAds();
var inMemorySlides = loadLocalSlides();
var inMemoryNotifications = loadLocalNotifications();
var DEFAULT_USERS_SEED = [];
function loadLocalUsers() {
  try {
    if (fs2.existsSync(LOCAL_USERS_FILE)) {
      const raw = fs2.readFileSync(LOCAL_USERS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("[Users Store] Erreur lors du chargement des comptes:", err);
  }
  return [...DEFAULT_USERS_SEED];
}
function saveLocalUsers(users) {
  try {
    const cleaned = users.map((u) => {
      const { password: _plain, ...rest } = u;
      return rest;
    });
    fs2.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(cleaned, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Users Store] Erreur lors de la sauvegarde des comptes:", err);
  }
}
var inMemoryUsers = loadLocalUsers();
migrateUsersToBcrypt(inMemoryUsers, saveLocalUsers).catch((err) => {
  console.warn("[Auth Migration] Erreur migration bcrypt:", err);
});
var getAuthUser = (req) => {
  const authed = getAuthenticatedUserFromCookies(req, inMemoryUsers);
  if (!authed) return null;
  const safeUser = sanitizePublicUser(authed.user);
  if (safeUser.role === "agency" && !safeUser.agencyId) {
    safeUser.agencyId = safeUser.id;
  }
  return safeUser;
};
function findUserByIdentifier(identifier) {
  const trimmed = String(identifier || "").trim();
  if (!trimmed) return void 0;
  if (trimmed.includes("@")) {
    const cleanEmail = normalizeEmailAddress(trimmed);
    return inMemoryUsers.find((u) => u.email && normalizeEmailAddress(u.email) === cleanEmail);
  }
  const phoneCheck = normalizePhoneRdc(trimmed);
  const targetPhone = phoneCheck.valid ? phoneCheck.normalized : trimmed.replace(/[\s().-]/g, "");
  return inMemoryUsers.find((u) => {
    const p = (u.phone || "").replace(/[\s().-]/g, "");
    return Boolean(p && (p === targetPhone || phoneCheck.valid && p.endsWith(targetPhone.slice(-9))));
  });
}
async function findOrFetchUserByIdentifier(identifier) {
  if (isMysqlConfigured()) {
    const mysqlRes = await findMysqlUserByIdentifier(identifier);
    if (mysqlRes.suspended) {
      return { user: void 0, suspended: true };
    }
    if (mysqlRes.record) {
      const merged = mergeAccountIntoMemory(inMemoryUsers, mysqlRes.record);
      return { user: merged, suspended: false };
    }
  }
  return { user: findUserByIdentifier(identifier), suspended: false };
}
async function ensureCookieUserLoadedFromMysql(req) {
  if (!isMysqlConfigured()) return;
  const already = getAuthenticatedUserFromCookies(req, inMemoryUsers);
  if (already) return;
  const cookies = parseCookies(req);
  const accessCookie = cookies[ACCESS_COOKIE_NAME];
  if (!accessCookie) return;
  try {
    const parts = accessCookie.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      const sub = payload?.sub ? String(payload.sub) : "";
      if (sub) {
        const record = await findMysqlUserById(sub);
        if (record) {
          mergeAccountIntoMemory(inMemoryUsers, record);
        }
      }
    }
  } catch {
  }
}
async function sendVerificationLinkEmail(req, user, targetEmail, purpose) {
  const { rawToken } = createOneTimeActionToken({
    purpose,
    userId: user.id,
    targetEmail,
    ttlMs: EMAIL_VERIFY_TTL_MS
  });
  const origin = resolveSiteOrigin(req);
  const actionUrl = `${origin}/confirmer-email?token=${encodeURIComponent(rawToken)}`;
  const isChange = purpose === "change_email";
  const subject = isChange ? "[Kinimmo] Confirmez votre nouvelle adresse e-mail" : "[Kinimmo] Confirmez votre adresse e-mail";
  const text = `Bonjour ${user.name},

Cliquez sur ce lien pour confirmer votre adresse e-mail sur Kinimmo :
${actionUrl}

Ce lien est valable 24 heures et \xE0 usage unique.`;
  const html = `<p>Bonjour <strong>${user.name}</strong>,</p><p>Cliquez sur le bouton ci-dessous pour confirmer votre adresse e-mail sur Kinimmo :</p><p><a href="${actionUrl}" style="display:inline-block;padding:12px 20px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Confirmer mon e-mail</a></p><p>Ce lien est valable 24 heures.</p>`;
  const dispatchResult = await dispatchAuthEmail({
    to: targetEmail,
    subject,
    text,
    html,
    actionUrl
  });
  enqueueNotification({
    event_type: isChange ? "auth_email_change_verification" : "auth_email_verification",
    recipient_type: "user",
    recipient_id: user.id,
    recipient_name: user.name,
    recipient_email: targetEmail,
    channel: "email",
    status: dispatchResult.delivered ? "sent" : "queued",
    title: subject,
    content_text: `Lien de confirmation g\xE9n\xE9r\xE9 pour ${targetEmail} (expiration 24h).`,
    metadata: { purpose, userId: user.id, channel: dispatchResult.channel }
  });
  return dispatchResult;
}
var handleGetCsrfToken = (req, res) => {
  const csrfToken = issueCsrfToken(req, res);
  return res.json({ success: true, csrfToken });
};
var handleRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      whatsapp,
      role,
      agencyName,
      rccmOrNif,
      avatarUrl,
      termsAccepted,
      termsVersion
    } = req.body || {};
    const cleanName = String(name || "").trim();
    if (cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Veuillez renseigner votre nom complet (au moins 2 caract\xE8res)."
      });
    }
    if (termsAccepted !== true) {
      return res.status(400).json({
        success: false,
        message: "Vous devez accepter les conditions d'utilisation pour cr\xE9er un compte."
      });
    }
    const cleanEmail = email ? normalizeEmailAddress(email) : "";
    if (cleanEmail && !isValidEmailAddress(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "L'adresse e-mail saisie n'est pas valide."
      });
    }
    const rawPhone = String(phone || "").trim();
    let normalizedPhone = "";
    if (rawPhone && rawPhone !== "+243") {
      const phoneRes = normalizePhoneRdc(rawPhone);
      if (!phoneRes.valid) {
        return res.status(400).json({
          success: false,
          message: phoneRes.error
        });
      }
      normalizedPhone = phoneRes.normalized;
    }
    if (!cleanEmail && !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Renseignez au moins une adresse e-mail ou un num\xE9ro de t\xE9l\xE9phone (+243)."
      });
    }
    const pwdCheck = validatePasswordPolicy(String(password || ""), {
      email: cleanEmail,
      name: cleanName,
      phone: normalizedPhone
    });
    if (!pwdCheck.valid) {
      return res.status(400).json({
        success: false,
        message: pwdCheck.error || "Mot de passe non conforme."
      });
    }
    if (cleanEmail) {
      const mysqlExisting = isMysqlConfigured() ? await findMysqlUserByIdentifier(cleanEmail) : { record: null, suspended: false };
      const emailTaken = Boolean(mysqlExisting.record) || inMemoryUsers.some(
        (u) => u.email && normalizeEmailAddress(u.email) === cleanEmail || u.pendingEmail && normalizeEmailAddress(u.pendingEmail) === cleanEmail
      );
      if (emailTaken) {
        return res.status(409).json({
          success: false,
          message: "Un compte existe d\xE9j\xE0 avec cette adresse e-mail. Connectez-vous ou r\xE9initialisez votre mot de passe."
        });
      }
    }
    if (normalizedPhone) {
      const mysqlPhoneExisting = isMysqlConfigured() ? await findMysqlUserByIdentifier(normalizedPhone) : { record: null, suspended: false };
      const phoneTaken = Boolean(mysqlPhoneExisting.record) || inMemoryUsers.some(
        (u) => u.phone && u.phone.replace(/[\s().-]/g, "") === normalizedPhone
      );
      if (phoneTaken) {
        return res.status(409).json({
          success: false,
          message: "Un compte existe d\xE9j\xE0 avec ce num\xE9ro +243. Connectez-vous avec votre num\xE9ro."
        });
      }
    }
    const userRole = normalizeAccountRole(role);
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const passwordHash = await hashPasswordBcrypt(String(password));
    let normalizedWhatsapp = normalizedPhone;
    if (whatsapp && String(whatsapp).trim() && String(whatsapp).trim() !== "+243") {
      const waCheck = normalizePhoneRdc(String(whatsapp));
      if (waCheck.valid) normalizedWhatsapp = waCheck.normalized;
    }
    const newRecord = {
      id: newId,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      phone: normalizedPhone,
      whatsapp: normalizedWhatsapp,
      role: userRole,
      agencyId: userRole === "agency" ? newId : void 0,
      agencyName: userRole === "agency" || userRole === "agent" ? String(agencyName || "Kinshasa Immobilier").trim() : void 0,
      rccmOrNif: rccmOrNif ? String(rccmOrNif).trim() : void 0,
      avatar: avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      planId: userRole === "agency" ? "agency" : userRole === "agent" ? "pro" : "starter",
      isVerified: false,
      emailVerified: false,
      phoneVerified: false,
      termsAcceptedVersion: String(termsVersion || TERMS_VERSION),
      termsAcceptedAt: nowIso,
      passwordUpdatedAt: nowIso,
      kinshasaBadgeVerified: false,
      createdAt: nowIso
    };
    inMemoryUsers.unshift(newRecord);
    saveLocalUsers(inMemoryUsers);
    if (isMysqlConfigured()) {
      await insertMysqlUser(newRecord);
    }
    const { accessToken, refreshToken } = createNewSessionPair(req, newRecord);
    appendAuthCookies(req, res, accessToken, refreshToken);
    let verificationPreviewUrl;
    let emailChannel;
    if (cleanEmail) {
      const mailRes = await sendVerificationLinkEmail(req, newRecord, cleanEmail, "verify_email");
      verificationPreviewUrl = mailRes.previewUrl;
      emailChannel = mailRes.channel;
    }
    const safeUser = sanitizePublicUser(newRecord);
    return res.status(201).json({
      success: true,
      message: cleanEmail ? "Compte cr\xE9\xE9 avec succ\xE8s ! Un lien de confirmation facultatif vient d\u2019\xEAtre envoy\xE9 \xE0 votre adresse e-mail." : "Compte cr\xE9\xE9 avec succ\xE8s ! Vous pouvez rechercher, contacter et publier d\xE8s maintenant.",
      user: safeUser,
      data: { user: safeUser },
      verificationRequired: false,
      verificationChannel: emailChannel,
      ...verificationPreviewUrl ? { verificationPreviewUrl } : {}
    });
  } catch (err) {
    console.error("[Auth Register Error]:", err);
    return res.status(500).json({ success: false, message: err?.message || "Erreur interne lors de l'inscription." });
  }
};
var handleLogin = async (req, res) => {
  try {
    const body = req.body || {};
    const rawIdentifier = String(body.identifier || body.email || body.phone || "").trim();
    const rawPassword = String(body.password || "");
    if (!rawIdentifier) {
      return res.status(400).json({
        success: false,
        message: "Veuillez saisir votre adresse e-mail ou votre num\xE9ro +243."
      });
    }
    if (!rawPassword) {
      return res.status(400).json({
        success: false,
        message: "Veuillez saisir votre mot de passe."
      });
    }
    const { user: found, suspended } = await findOrFetchUserByIdentifier(rawIdentifier);
    if (suspended) {
      return res.status(403).json({
        success: false,
        message: "Votre compte est suspendu ou d\xE9sactiv\xE9."
      });
    }
    if (!found) {
      return res.status(401).json({
        success: false,
        message: "Identifiant ou mot de passe incorrect."
      });
    }
    const matched = await verifyPasswordBcrypt(rawPassword, found);
    if (!matched) {
      return res.status(401).json({
        success: false,
        message: "Identifiant ou mot de passe incorrect."
      });
    }
    if (found.password !== void 0) {
      delete found.password;
      saveLocalUsers(inMemoryUsers);
      if (isMysqlConfigured() && found.passwordHash) {
        await updateMysqlUserPassword(found.id, found.passwordHash);
      }
    }
    if (found.role === "agency" && !found.agencyId) {
      found.agencyId = found.id;
    }
    const { accessToken, refreshToken } = createNewSessionPair(req, found);
    appendAuthCookies(req, res, accessToken, refreshToken);
    const safeUser = sanitizePublicUser(found);
    return res.json({
      success: true,
      message: "Connexion r\xE9ussie.",
      user: safeUser,
      data: { user: safeUser }
    });
  } catch (err) {
    console.error("[Auth Login Error]:", err);
    return res.status(500).json({ success: false, message: err?.message || "Erreur interne lors de la connexion." });
  }
};
var handleRefreshSession = async (req, res) => {
  await ensureCookieUserLoadedFromMysql(req);
  const result = rotateRefreshSession(req, inMemoryUsers);
  if (!result.ok || !result.user || !result.accessToken || !result.refreshToken) {
    clearAuthCookies(req, res);
    return res.status(401).json({
      success: false,
      code: "REFRESH_INVALID",
      message: result.error || "Session expir\xE9e. Veuillez vous reconnecter."
    });
  }
  appendAuthCookies(req, res, result.accessToken, result.refreshToken);
  const safeUser = sanitizePublicUser(result.user);
  return res.json({
    success: true,
    user: safeUser,
    data: { user: safeUser }
  });
};
var handleLogout = (req, res) => {
  revokeCurrentRequestSession(req);
  clearAuthCookies(req, res);
  return res.json({ success: true, message: "D\xE9connexion effectu\xE9e." });
};
var handleGetMe = async (req, res) => {
  await ensureCookieUserLoadedFromMysql(req);
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      code: "ACCESS_EXPIRED",
      message: "Session non authentifi\xE9e ou jeton expir\xE9."
    });
  }
  return res.json({
    success: true,
    user,
    data: { user }
  });
};
var handleGetSession = async (req, res) => {
  await ensureCookieUserLoadedFromMysql(req);
  const user = getAuthUser(req);
  return res.json({
    success: true,
    authenticated: Boolean(user),
    user: user || null,
    data: { authenticated: Boolean(user), user: user || null }
  });
};
var handleVerifyEmail = async (req, res) => {
  const token = String(req.body?.token || req.query?.token || "").trim();
  const check = consumeOneTimeActionToken(token, ["verify_email", "change_email"]);
  if (!check.ok || !check.record) {
    return res.status(400).json({
      success: false,
      code: check.code || "TOKEN_INVALID",
      message: check.error || "Lien de confirmation invalide ou expir\xE9."
    });
  }
  const idx = inMemoryUsers.findIndex((u) => u.id === check.record.userId);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Compte introuvable." });
  }
  const targetEmail = normalizeEmailAddress(check.record.targetEmail);
  if (check.record.purpose === "change_email") {
    const taken = inMemoryUsers.some(
      (u) => u.id !== inMemoryUsers[idx].id && u.email && normalizeEmailAddress(u.email) === targetEmail
    );
    if (taken) {
      return res.status(409).json({ success: false, message: "Cette adresse e-mail est d\xE9j\xE0 utilis\xE9e par un autre compte." });
    }
    inMemoryUsers[idx].email = targetEmail;
    delete inMemoryUsers[idx].pendingEmail;
    if (isMysqlConfigured()) {
      await updateMysqlUserEmail(inMemoryUsers[idx].id, targetEmail);
    }
  } else {
    if (normalizeEmailAddress(inMemoryUsers[idx].email) !== targetEmail) {
      return res.status(400).json({ success: false, message: "Ce lien ne correspond plus \xE0 l'adresse actuelle du compte." });
    }
  }
  inMemoryUsers[idx].emailVerified = true;
  inMemoryUsers[idx].emailVerifiedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveLocalUsers(inMemoryUsers);
  const safeUser = sanitizePublicUser(inMemoryUsers[idx]);
  return res.json({
    success: true,
    message: "Adresse e-mail confirm\xE9e avec succ\xE8s.",
    user: safeUser,
    data: { user: safeUser }
  });
};
var handleResendVerification = async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const requestedEmail = req.body?.email ? normalizeEmailAddress(req.body.email) : "";
    if (authUser) {
      const idx = inMemoryUsers.findIndex((u) => u.id === authUser.id);
      if (idx === -1) return res.status(404).json({ success: false, message: "Compte introuvable." });
      const targetUser = inMemoryUsers[idx];
      let targetEmail = targetUser.email ? normalizeEmailAddress(targetUser.email) : "";
      if (!targetEmail) {
        if (!requestedEmail || !isValidEmailAddress(requestedEmail)) {
          return res.status(400).json({
            success: false,
            message: "Saisissez une adresse e-mail valide \xE0 associer et confirmer."
          });
        }
        const taken = inMemoryUsers.some(
          (u) => u.id !== targetUser.id && (u.email && normalizeEmailAddress(u.email) === requestedEmail || u.pendingEmail && normalizeEmailAddress(u.pendingEmail) === requestedEmail)
        );
        if (taken) {
          return res.status(409).json({
            success: false,
            message: "Cette adresse e-mail est d\xE9j\xE0 utilis\xE9e par un autre compte."
          });
        }
        targetUser.email = requestedEmail;
        targetUser.emailVerified = false;
        saveLocalUsers(inMemoryUsers);
        targetEmail = requestedEmail;
      } else if (targetUser.emailVerified && !targetUser.pendingEmail) {
        return res.json({
          success: true,
          message: "Votre adresse e-mail est d\xE9j\xE0 confirm\xE9e.",
          user: sanitizePublicUser(targetUser)
        });
      }
      const purpose = targetUser.pendingEmail && !targetUser.emailVerified ? "verify_email" : targetUser.pendingEmail ? "change_email" : "verify_email";
      const sendTo = purpose === "change_email" && targetUser.pendingEmail ? targetUser.pendingEmail : targetEmail;
      const mailRes = await sendVerificationLinkEmail(req, targetUser, sendTo, purpose);
      return res.json({
        success: true,
        message: `Un lien de confirmation vient d'\xEAtre envoy\xE9 \xE0 ${sendTo}.`,
        user: sanitizePublicUser(targetUser),
        ...mailRes.previewUrl ? { verificationPreviewUrl: mailRes.previewUrl } : {}
      });
    }
    if (!requestedEmail || !isValidEmailAddress(requestedEmail)) {
      return res.status(400).json({ success: false, message: "Veuillez saisir une adresse e-mail valide." });
    }
    const found = inMemoryUsers.find((u) => u.email && normalizeEmailAddress(u.email) === requestedEmail);
    let previewUrl;
    if (found && !found.emailVerified) {
      const mailRes = await sendVerificationLinkEmail(req, found, found.email, "verify_email");
      previewUrl = mailRes.previewUrl;
    }
    return res.json({
      success: true,
      message: "Si ce compte attend une confirmation, un nouveau lien vient d\u2019\xEAtre envoy\xE9.",
      ...previewUrl ? { verificationPreviewUrl: previewUrl } : {}
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Erreur lors du renvoi." });
  }
};
var handleForgotPassword = async (req, res) => {
  try {
    const identifier = String(req.body?.identifier || req.body?.email || "").trim();
    if (!identifier) {
      return res.status(400).json({
        success: false,
        message: "Veuillez saisir votre adresse e-mail ou num\xE9ro +243."
      });
    }
    const { user: found } = await findOrFetchUserByIdentifier(identifier);
    let resetPreviewUrl;
    if (found && found.email && isValidEmailAddress(found.email)) {
      const { rawToken } = createOneTimeActionToken({
        purpose: "reset_password",
        userId: found.id,
        targetEmail: found.email,
        ttlMs: PASSWORD_RESET_TTL_MS
        // Strictement 1 heure
      });
      const origin = resolveSiteOrigin(req);
      const actionUrl = `${origin}/reinitialiser-mot-de-passe?token=${encodeURIComponent(rawToken)}`;
      const mailRes = await dispatchAuthEmail({
        to: found.email,
        subject: "[Kinimmo] R\xE9initialisation de votre mot de passe (valable 1 heure)",
        text: `Bonjour ${found.name},

Utilisez ce lien \xE0 usage unique (valable 1 heure) pour choisir un nouveau mot de passe :
${actionUrl}

Si vous n'\xEAtes pas \xE0 l'origine de cette demande, ignorez cet e-mail.`,
        html: `<p>Bonjour <strong>${found.name}</strong>,</p><p>Cliquez ci-dessous pour r\xE9initialiser votre mot de passe Kinimmo (lien \xE0 usage unique valable <strong>1 heure</strong>) :</p><p><a href="${actionUrl}" style="display:inline-block;padding:12px 20px;background:#1D4ED8;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">R\xE9initialiser mon mot de passe</a></p>`,
        actionUrl
      });
      enqueueNotification({
        event_type: "auth_password_reset",
        recipient_type: "user",
        recipient_id: found.id,
        recipient_name: found.name,
        recipient_email: found.email,
        channel: "email",
        status: mailRes.delivered ? "sent" : "queued",
        title: "R\xE9initialisation de mot de passe (1h)",
        content_text: `Lien de r\xE9initialisation g\xE9n\xE9r\xE9 pour ${found.email} (validit\xE9 1 heure).`,
        metadata: { userId: found.id, channel: mailRes.channel }
      });
      if (mailRes.previewUrl && process.env.NODE_ENV !== "production") {
        console.log(`[Auth Reset Preview] ${found.email}: ${mailRes.previewUrl}`);
      }
    }
    return res.json({
      success: true,
      message: "Si un compte avec une adresse e-mail associ\xE9e existe, un lien \xE0 usage unique valable 1 heure vient d\u2019\xEAtre envoy\xE9."
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Erreur lors de la demande." });
  }
};
var handleResetPassword = async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");
    const peek = peekOneTimeActionToken(token, "reset_password");
    if (!peek.ok || !peek.record) {
      return res.status(400).json({
        success: false,
        code: peek.code || "TOKEN_INVALID",
        message: peek.error || "Ce lien de r\xE9initialisation est invalide ou a expir\xE9 (validit\xE9 1 heure)."
      });
    }
    const idx = inMemoryUsers.findIndex((u) => u.id === peek.record.userId);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Compte introuvable." });
    }
    const userRecord = inMemoryUsers[idx];
    const pwdCheck = validatePasswordPolicy(newPassword, {
      email: userRecord.email,
      name: userRecord.name,
      phone: userRecord.phone
    });
    if (!pwdCheck.valid) {
      return res.status(400).json({
        success: false,
        message: pwdCheck.error || "Mot de passe non conforme."
      });
    }
    markOneTimeActionTokenUsed(peek.record);
    userRecord.passwordHash = await hashPasswordBcrypt(newPassword);
    delete userRecord.password;
    userRecord.passwordUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveLocalUsers(inMemoryUsers);
    if (isMysqlConfigured()) {
      await updateMysqlUserPassword(userRecord.id, userRecord.passwordHash);
    }
    revokeAllUserSessions(userRecord.id, "password_reset");
    clearAuthCookies(req, res);
    return res.json({
      success: true,
      message: "Mot de passe r\xE9initialis\xE9 avec succ\xE8s. Connectez-vous avec votre nouveau mot de passe."
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Erreur lors de la r\xE9initialisation." });
  }
};
var handleUpdateProfile = async (req, res) => {
  await ensureCookieUserLoadedFromMysql(req);
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Non autoris\xE9." });
  }
  const idx = inMemoryUsers.findIndex((u) => u.id === user.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "Compte introuvable." });
  }
  const body = req.body || {};
  const updates = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) {
    updates.name = body.name.trim();
  }
  if (typeof body.phone === "string" && body.phone.trim() && body.phone.trim() !== "+243") {
    const phoneCheck = normalizePhoneRdc(body.phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ success: false, message: phoneCheck.error });
    }
    updates.phone = phoneCheck.normalized;
  }
  if (typeof body.whatsapp === "string" && body.whatsapp.trim() && body.whatsapp.trim() !== "+243") {
    const waCheck = normalizePhoneRdc(body.whatsapp);
    if (!waCheck.valid) {
      return res.status(400).json({ success: false, message: waCheck.error });
    }
    updates.whatsapp = waCheck.normalized;
  }
  if (typeof body.agencyName === "string") updates.agencyName = body.agencyName.trim();
  if (typeof body.rccmOrNif === "string") updates.rccmOrNif = body.rccmOrNif.trim();
  if (typeof body.avatar === "string") updates.avatar = body.avatar;
  inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...updates };
  saveLocalUsers(inMemoryUsers);
  if (isMysqlConfigured()) {
    await updateMysqlUserProfile(inMemoryUsers[idx].id, updates);
  }
  const safeUser = sanitizePublicUser(inMemoryUsers[idx]);
  return res.json({ success: true, message: "Profil mis \xE0 jour.", user: safeUser, data: { user: safeUser } });
};
var handleChangePassword = async (req, res) => {
  try {
    await ensureCookieUserLoadedFromMysql(req);
    const authed = getAuthenticatedUserFromCookies(req, inMemoryUsers);
    if (!authed) {
      return res.status(401).json({ success: false, message: "Non autoris\xE9." });
    }
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword) {
      return res.status(400).json({ success: false, message: "Saisissez votre mot de passe actuel." });
    }
    const idx = inMemoryUsers.findIndex((u) => u.id === authed.user.id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: "Compte introuvable." });
    }
    const target = inMemoryUsers[idx];
    const validOld = await verifyPasswordBcrypt(String(oldPassword), target);
    if (!validOld) {
      return res.status(400).json({ success: false, message: "Le mot de passe actuel est incorrect." });
    }
    const pwdCheck = validatePasswordPolicy(String(newPassword || ""), {
      email: target.email,
      name: target.name,
      phone: target.phone
    });
    if (!pwdCheck.valid) {
      return res.status(400).json({ success: false, message: pwdCheck.error });
    }
    target.passwordHash = await hashPasswordBcrypt(String(newPassword));
    delete target.password;
    target.passwordUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveLocalUsers(inMemoryUsers);
    if (isMysqlConfigured()) {
      await updateMysqlUserPassword(target.id, target.passwordHash);
    }
    revokeAllUserSessions(target.id, "password_changed", authed.sessionId);
    return res.json({
      success: true,
      message: "Mot de passe modifi\xE9 avec succ\xE8s. Vos autres appareils ont \xE9t\xE9 d\xE9connect\xE9s."
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Erreur lors du changement de mot de passe." });
  }
};
var handleRequestEmailChange = async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentification requise." });
    }
    const { currentPassword, newEmail } = req.body || {};
    const cleanNewEmail = normalizeEmailAddress(newEmail);
    if (!isValidEmailAddress(cleanNewEmail)) {
      return res.status(400).json({ success: false, message: "Veuillez saisir une nouvelle adresse e-mail valide." });
    }
    const idx = inMemoryUsers.findIndex((u) => u.id === user.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Compte introuvable." });
    const target = inMemoryUsers[idx];
    const validPwd = await verifyPasswordBcrypt(String(currentPassword || ""), target);
    if (!validPwd) {
      return res.status(400).json({ success: false, message: "Mot de passe actuel incorrect." });
    }
    if (target.email && normalizeEmailAddress(target.email) === cleanNewEmail && target.emailVerified) {
      return res.status(400).json({ success: false, message: "Cette adresse est d\xE9j\xE0 votre adresse e-mail confirm\xE9e." });
    }
    const taken = inMemoryUsers.some(
      (u) => u.id !== target.id && (u.email && normalizeEmailAddress(u.email) === cleanNewEmail || u.pendingEmail && normalizeEmailAddress(u.pendingEmail) === cleanNewEmail)
    );
    if (taken) {
      return res.status(409).json({ success: false, message: "Cette adresse e-mail est d\xE9j\xE0 associ\xE9e \xE0 un autre compte." });
    }
    if (!target.email) {
      target.pendingEmail = cleanNewEmail;
      saveLocalUsers(inMemoryUsers);
      const mailRes2 = await sendVerificationLinkEmail(req, target, cleanNewEmail, "change_email");
      return res.json({
        success: true,
        message: `Un lien de confirmation a \xE9t\xE9 envoy\xE9 \xE0 ${cleanNewEmail}.`,
        user: sanitizePublicUser(target),
        ...mailRes2.previewUrl ? { verificationPreviewUrl: mailRes2.previewUrl } : {}
      });
    }
    target.pendingEmail = cleanNewEmail;
    saveLocalUsers(inMemoryUsers);
    const mailRes = await sendVerificationLinkEmail(req, target, cleanNewEmail, "change_email");
    return res.json({
      success: true,
      message: `Un lien de confirmation a \xE9t\xE9 envoy\xE9 \xE0 ${cleanNewEmail}. Votre adresse actuelle reste active jusqu'\xE0 validation.`,
      user: sanitizePublicUser(target),
      ...mailRes.previewUrl ? { verificationPreviewUrl: mailRes.previewUrl } : {}
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err?.message || "Erreur lors du changement d'e-mail." });
  }
};
var handleListSessions = (req, res) => {
  const authed = getAuthenticatedUserFromCookies(req, inMemoryUsers);
  if (!authed) {
    return res.status(401).json({ success: false, message: "Authentification requise." });
  }
  const sessions = listActiveSessionsForUser(authed.user.id, authed.sessionId);
  return res.json({ success: true, sessions });
};
var handleRevokeSession = (req, res) => {
  const authed = getAuthenticatedUserFromCookies(req, inMemoryUsers);
  if (!authed) {
    return res.status(401).json({ success: false, message: "Authentification requise." });
  }
  const targetSessionId = String(req.params.sessionId || "");
  const revoked = revokeSessionById(targetSessionId, authed.user.id, "revoked_by_user");
  if (!revoked) {
    return res.status(404).json({ success: false, message: "Session introuvable." });
  }
  if (targetSessionId === authed.sessionId) {
    clearAuthCookies(req, res);
  }
  return res.json({ success: true, message: "Session ferm\xE9e avec succ\xE8s." });
};
app.get("/api/auth/csrf", handleGetCsrfToken);
app.get("/auth/csrf", handleGetCsrfToken);
app.post("/api/auth/register", authSensitiveRateLimiter, handleRegister);
app.post("/auth/register", authSensitiveRateLimiter, handleRegister);
app.post("/api/auth/login", authLoginRateLimiter, handleLogin);
app.post("/auth/login", authLoginRateLimiter, handleLogin);
app.post("/api/auth/refresh", handleRefreshSession);
app.post("/auth/refresh", handleRefreshSession);
app.post("/api/auth/logout", handleLogout);
app.post("/auth/logout", handleLogout);
app.get("/api/auth/me", handleGetMe);
app.get("/auth/me", handleGetMe);
app.get("/api/auth/session", handleGetSession);
app.get("/auth/session", handleGetSession);
app.post("/api/auth/verify-email", handleVerifyEmail);
app.get("/api/auth/verify-email", handleVerifyEmail);
app.post("/api/auth/resend-verification", authSensitiveRateLimiter, handleResendVerification);
app.post("/api/auth/forgot-password", authSensitiveRateLimiter, handleForgotPassword);
app.post("/auth/forgot-password", authSensitiveRateLimiter, handleForgotPassword);
app.post("/api/auth/reset-password", authSensitiveRateLimiter, handleResetPassword);
app.put("/api/auth/profile", handleUpdateProfile);
app.put("/auth/profile", handleUpdateProfile);
app.put("/api/auth/change-password", handleChangePassword);
app.put("/auth/change-password", handleChangePassword);
app.post("/api/auth/request-email-change", handleRequestEmailChange);
app.post("/api/auth/confirm-email-change", handleVerifyEmail);
app.get("/api/auth/sessions", handleListSessions);
app.delete("/api/auth/sessions/:sessionId", handleRevokeSession);
var enqueueNotification = (record) => {
  const id = record.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const notif = {
    ...record,
    id,
    status: record.status || "queued",
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  inMemoryNotifications.unshift(notif);
  saveLocalNotifications(inMemoryNotifications);
  console.log(`[Notification Dispatcher] Notification enregistr\xE9e dans la file : [${notif.event_type}] pour ${notif.recipient_name} (${notif.channel})`);
  return notif;
};
var handleCreateConciergeRequest = async (req, res) => {
  try {
    const rawData = req.body;
    const validation = validateConciergerieRequest(rawData);
    if (!validation.isValid || !validation.sanitized) {
      return res.status(400).json({
        success: false,
        error: "Validation \xE9chou\xE9e sur le serveur. Veuillez corriger les informations requises.",
        errors: validation.errors
      });
    }
    const sanitized = validation.sanitized;
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const randomSuffix = Math.floor(1e3 + Math.random() * 9e3);
    const reference = `KIN-CONC-${year}-${randomSuffix}`;
    const id = `conc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newRequest = {
      id,
      user_id: sanitized.user_id || null,
      project_type: sanitized.project_type,
      property_type: sanitized.property_type,
      commune: sanitized.commune,
      quartier: sanitized.quartier || null,
      budget_min: sanitized.budget_min ?? null,
      budget_max: sanitized.budget_max,
      currency: sanitized.currency,
      bedrooms: sanitized.bedrooms ?? null,
      bathrooms: sanitized.bathrooms ?? null,
      parking: sanitized.parking,
      furnished: sanitized.furnished,
      services: sanitized.services,
      description: sanitized.description || null,
      full_name: sanitized.full_name,
      phone: sanitized.phone,
      whatsapp: sanitized.whatsapp || null,
      email: sanitized.email,
      status: "new",
      assigned_agent_id: sanitized.assigned_agent_id || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      // Champs enrichis / compatibilité :
      reference,
      projet: sanitized.projet,
      typeBien: sanitized.typeBien,
      localisation: sanitized.localisation,
      budget: sanitized.budget,
      caracteristiques: sanitized.caracteristiques,
      client: sanitized.client,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    const matches = findMatchingProperties(newRequest, inMemoryProperties, { minScore: 20, limit: 10 });
    newRequest.matched_property_ids = matches.map((m) => m.property.id);
    newRequest.matched_count = matches.length;
    newRequest.top_match_score = matches[0]?.score || 0;
    if (matches.length > 0 && matches[0].score >= 60) {
      newRequest.status = "properties_found";
    }
    inMemoryRequests.unshift(newRequest);
    saveLocalRequests(inMemoryRequests);
    try {
      enqueueNotification({
        event_type: "client_request_confirmation",
        recipient_type: "client",
        recipient_id: newRequest.user_id || null,
        recipient_name: newRequest.full_name,
        recipient_email: newRequest.email || null,
        recipient_phone: newRequest.phone || null,
        channel: newRequest.email ? "email" : "whatsapp",
        title: `[Kinimmo] Confirmation de votre demande de Conciergerie #${newRequest.reference}`,
        content_text: `Bonjour ${newRequest.full_name}, nous confirmons la bonne r\xE9ception de votre demande de conciergerie #${newRequest.reference} (${newRequest.project_type} - ${newRequest.property_type} \xE0 ${newRequest.commune}). Un conseiller d\xE9di\xE9 prendra contact avec vous dans les plus brefs d\xE9lais.`,
        metadata: { requestId: newRequest.id, reference: newRequest.reference }
      });
    } catch (e) {
      console.warn("Erreur notification confirmation client:", e);
    }
    return res.status(201).json({
      success: true,
      message: "Votre demande a \xE9t\xE9 prise en compte avec succ\xE8s par la Conciergerie Kinimmo.",
      reference: newRequest.reference,
      data: newRequest,
      matched_properties: matches
    });
  } catch (error) {
    console.error("Erreur backend POST concierge_requests:", error);
    return res.status(500).json({
      success: false,
      error: "Une erreur interne est survenue lors de l\u2019enregistrement de votre demande.",
      details: error?.message || String(error)
    });
  }
};
app.post("/api/concierge-requests", publicSubmissionRateLimiter, handleCreateConciergeRequest);
app.post("/api/concierge/requests", publicSubmissionRateLimiter, handleCreateConciergeRequest);
app.post("/api/conciergerie", publicSubmissionRateLimiter, handleCreateConciergeRequest);
app.get("/api/concierge-requests/:id/matches", async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Authentification requise." });
    }
    const { id } = req.params;
    const foundReq = inMemoryRequests.find((r) => r.id === id);
    if (!foundReq) {
      return res.status(404).json({ success: false, error: "Demande introuvable." });
    }
    if (user.role === "agent" && foundReq.assigned_agent_id !== user.id) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    if (user.role !== "admin" && user.role !== "agent") {
      return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux conseillers et administrateurs." });
    }
    const matches = findMatchingProperties(foundReq, inMemoryProperties, { minScore: 15, limit: 15 });
    return res.json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});
var serializeConciergeForPreview = (raw) => {
  const createdAt = raw.created_at || raw.createdAt || (/* @__PURE__ */ new Date()).toISOString();
  const updatedAt = raw.updated_at || raw.updatedAt || createdAt;
  const currency = String(raw.currency || raw.budget?.devise || "USD").toUpperCase() === "CDF" ? "CDF" : "USD";
  const budgetMin = raw.budget_min !== void 0 ? raw.budget_min : raw.budget?.min ?? null;
  const budgetMax = Number(raw.budget_max ?? raw.budget?.max ?? 0) || 0;
  return {
    ...raw,
    reference: raw.reference || `KIN-CONC-${new Date(createdAt).getFullYear()}-${String(raw.id || "").slice(-4).toUpperCase()}`,
    currency,
    services: Array.isArray(raw.services) ? raw.services : ["Recherche de biens"],
    projet: raw.project_type || raw.projet || "Acheter",
    typeBien: raw.property_type || raw.typeBien || "Appartement",
    localisation: {
      commune: raw.commune || raw.localisation?.commune || "Gombe",
      quartier: raw.quartier || raw.localisation?.quartier || void 0
    },
    budget: {
      min: budgetMin !== null && budgetMin !== void 0 ? Number(budgetMin) : void 0,
      max: budgetMax,
      devise: currency
    },
    caracteristiques: {
      chambres: raw.bedrooms !== null && raw.bedrooms !== void 0 ? Number(raw.bedrooms) : raw.caracteristiques?.chambres,
      sallesDeBain: raw.bathrooms !== null && raw.bathrooms !== void 0 ? Number(raw.bathrooms) : raw.caracteristiques?.sallesDeBain,
      parking: Boolean(raw.parking ?? raw.caracteristiques?.parking),
      meuble: Boolean(raw.furnished ?? raw.caracteristiques?.meuble)
    },
    client: {
      nomComplet: raw.full_name || raw.client?.nomComplet || "Client Kinimmo",
      telephone: raw.phone || raw.client?.telephone || "",
      whatsapp: raw.whatsapp || raw.client?.whatsapp || void 0,
      email: raw.email || raw.client?.email || "",
      message: raw.description || raw.notes || raw.client?.message || void 0
    },
    created_at: createdAt,
    updated_at: updatedAt,
    createdAt,
    updatedAt
  };
};
var handleGetConciergeRequests = async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise pour consulter les demandes de conciergerie."
      });
    }
    if (!["admin", "agent"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: "Acc\xE8s interdit : privil\xE8ges insuffisants."
      });
    }
    let list = inMemoryRequests.map(serializeConciergeForPreview);
    if (user.role === "agent") {
      list = list.filter((r) => r.assigned_agent_id === user.id);
    }
    return res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};
app.get("/api/concierge-requests", handleGetConciergeRequests);
app.get("/api/concierge/requests", handleGetConciergeRequests);
app.get("/api/conciergerie", handleGetConciergeRequests);
var handleUpdateConciergeRequest = async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise pour modifier une demande de conciergerie."
      });
    }
    if (user.role !== "admin" && user.role !== "agent") {
      return res.status(403).json({
        success: false,
        error: "Acc\xE8s interdit : Seuls les administrateurs ou agents assign\xE9s peuvent modifier une demande."
      });
    }
    const { id } = req.params;
    const body = req.body || {};
    const reqItem = inMemoryRequests.find((r) => r.id === id);
    if (!reqItem) {
      return res.status(404).json({ success: false, error: "Demande introuvable." });
    }
    if (user.role === "agent") {
      if (reqItem.assigned_agent_id !== user.id) {
        return res.status(403).json({
          success: false,
          error: "Acc\xE8s interdit : vous ne pouvez mettre \xE0 jour que les demandes qui vous sont attribu\xE9es."
        });
      }
      if (body.assigned_agent_id !== void 0) {
        return res.status(403).json({
          success: false,
          error: "Acc\xE8s interdit : seul un administrateur peut r\xE9attribuer une demande."
        });
      }
    }
    const previousAgentId = reqItem.assigned_agent_id;
    const validStatuses = [
      "new",
      "searching",
      "properties_found",
      "visit_scheduled",
      "negotiation",
      "completed",
      "cancelled"
    ];
    if (body.status) {
      let mappedStatus = body.status;
      if (body.status === "nouveau") mappedStatus = "new";
      else if (body.status === "en_cours") mappedStatus = "searching";
      else if (body.status === "traite") mappedStatus = "completed";
      else if (body.status === "archive") mappedStatus = "cancelled";
      if (validStatuses.includes(mappedStatus)) {
        reqItem.status = mappedStatus;
      }
    }
    if (body.full_name !== void 0) reqItem.full_name = String(body.full_name).trim();
    if (body.phone !== void 0) reqItem.phone = String(body.phone).trim();
    if (body.email !== void 0) reqItem.email = String(body.email).trim().toLowerCase();
    if (body.project_type !== void 0) reqItem.project_type = body.project_type;
    if (body.property_type !== void 0) reqItem.property_type = body.property_type;
    if (body.commune !== void 0) reqItem.commune = body.commune;
    if (body.quartier !== void 0) reqItem.quartier = body.quartier;
    if (body.budget_min !== void 0) reqItem.budget_min = Number(body.budget_min) || 0;
    if (body.budget_max !== void 0) reqItem.budget_max = Number(body.budget_max) || 0;
    if (body.currency !== void 0) reqItem.currency = String(body.currency).toUpperCase() === "CDF" ? "CDF" : "USD";
    if (body.bedrooms !== void 0) reqItem.bedrooms = Number(body.bedrooms) || 0;
    if (body.bathrooms !== void 0) reqItem.bathrooms = Number(body.bathrooms) || 0;
    if (body.notes !== void 0) {
      reqItem.notes = body.notes;
      reqItem.description = body.notes;
    }
    if (body.assigned_agent_id !== void 0 && user.role === "admin") reqItem.assigned_agent_id = body.assigned_agent_id;
    if (body.assigned_agent_name !== void 0 && user.role === "admin") reqItem.assigned_agent_name = body.assigned_agent_name;
    if (body.notesAdmin !== void 0) reqItem.notesAdmin = String(body.notesAdmin);
    const synced = serializeConciergeForPreview(reqItem);
    Object.assign(reqItem, synced);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    reqItem.updated_at = nowIso;
    reqItem.updatedAt = nowIso;
    saveLocalRequests(inMemoryRequests);
    if (body.assigned_agent_id && body.assigned_agent_id !== previousAgentId) {
      try {
        enqueueNotification({
          event_type: "agent_request_assigned",
          recipient_type: "agent",
          recipient_id: body.assigned_agent_id,
          recipient_name: body.assigned_agent_name || "Agent Kinshasa",
          recipient_email: `${body.assigned_agent_id}@kinimmo.cd`,
          channel: "email",
          title: `[Kinimmo Agent] Nouvelle mission de Conciergerie #${reqItem.reference || reqItem.id}`,
          content_text: `Bonjour ${body.assigned_agent_name || "Agent"}, une nouvelle demande de conciergerie (#${reqItem.reference || reqItem.id}) pour ${reqItem.full_name} (${reqItem.project_type} - ${reqItem.property_type} \xE0 ${reqItem.commune}) vous a \xE9t\xE9 attribu\xE9e par la Direction.`,
          metadata: { requestId: reqItem.id, agentId: body.assigned_agent_id }
        });
      } catch (notifErr) {
        console.warn("Erreur notification agent:", notifErr);
      }
    }
    return res.json({ success: true, message: "Demande mise \xE0 jour avec succ\xE8s.", data: reqItem });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};
app.patch("/api/concierge-requests/:id", handleUpdateConciergeRequest);
app.put("/api/concierge-requests/:id", handleUpdateConciergeRequest);
app.patch("/api/concierge/requests/:id", handleUpdateConciergeRequest);
app.put("/api/concierge/requests/:id", handleUpdateConciergeRequest);
app.patch("/api/conciergerie/:id", handleUpdateConciergeRequest);
app.put("/api/conciergerie/:id", handleUpdateConciergeRequest);
var handleDeleteConciergeRequest = (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const { id } = req.params;
  const idx = inMemoryRequests.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Demande introuvable." });
  inMemoryRequests.splice(idx, 1);
  saveLocalRequests(inMemoryRequests);
  return res.json({ success: true, message: "Demande supprim\xE9e avec succ\xE8s." });
};
app.delete("/api/concierge-requests/:id", handleDeleteConciergeRequest);
app.delete("/api/concierge/requests/:id", handleDeleteConciergeRequest);
var handleGetPropertyVisits = async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Authentification requise pour consulter les visites." });
    }
    if (user.role !== "admin" && user.role !== "agent" && user.role !== "agency") {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    const { request_id } = req.query;
    let list = [...inMemoryVisits];
    if (request_id) {
      list = list.filter((v) => v.request_id === String(request_id));
    }
    if (user.role === "agent") {
      list = list.filter((v) => {
        if (v.agent_id === user.id) return true;
        if (v.property_id) {
          const prop = inMemoryProperties.find((p) => p.id === v.property_id);
          return Boolean(prop && canManageProperty(user, prop));
        }
        return false;
      });
    } else if (user.role === "agency") {
      const agencyKey = user.agencyId || user.id;
      const agencyAgentIds = new Set(
        [user.id, agencyKey].concat(inMemoryCollaborators.filter((c) => c.agencyId === agencyKey).map((c) => c.userId)).concat(inMemoryUsers.filter((u) => u.agencyId === agencyKey).map((u) => u.id)).filter(Boolean)
      );
      list = list.filter((v) => {
        if (v.agency_id && v.agency_id === agencyKey) return true;
        if (v.agent_id && agencyAgentIds.has(v.agent_id)) return true;
        if (v.property_id) {
          const prop = inMemoryProperties.find((p) => p.id === v.property_id);
          return Boolean(prop && canManageProperty(user, prop));
        }
        return false;
      });
    }
    return res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};
app.get("/api/property-visits", handleGetPropertyVisits);
app.get("/api/concierge/visits", handleGetPropertyVisits);
var handleCreatePropertyVisit = async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Acc\xE8s non autoris\xE9 : Authentification requise pour planifier une visite."
      });
    }
    if (user.role !== "admin" && user.role !== "agent" && user.role !== "agency") {
      return res.status(403).json({
        success: false,
        error: "Acc\xE8s interdit : Seuls les administrateurs, agences ou agents peuvent planifier une visite."
      });
    }
    let { request_id, property_id, agent_id, visit_date, visit_time, status, notes, property_title, agent_name, client_name } = req.body;
    if (!request_id || !visit_date) {
      return res.status(400).json({
        success: false,
        error: "Les champs request_id et visit_date sont obligatoires pour planifier une visite."
      });
    }
    if (user.role === "agent") {
      agent_id = user.id;
      agent_name = user.name;
    }
    const cleanVisitDate = String(visit_date).trim().split("T")[0].slice(0, 10);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const id = `visit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newVisit = {
      id,
      request_id: String(request_id),
      property_id: property_id || null,
      agent_id: agent_id || null,
      visit_date: cleanVisitDate,
      visit_time: visit_time || "14:00",
      status: status || "scheduled",
      notes: notes ? String(notes).trim() : null,
      created_at: nowIso,
      updated_at: nowIso,
      property_title: property_title || null,
      agent_name: agent_name || null,
      client_name: client_name || null
    };
    inMemoryVisits.unshift(newVisit);
    saveLocalVisits(inMemoryVisits);
    const targetRequest = inMemoryRequests.find((r) => r.id === request_id);
    if (targetRequest && targetRequest.status !== "completed" && targetRequest.status !== "cancelled") {
      targetRequest.status = "visit_scheduled";
      targetRequest.updated_at = nowIso;
      saveLocalRequests(inMemoryRequests);
    }
    try {
      enqueueNotification({
        event_type: "visit_confirmation",
        recipient_type: "client",
        recipient_name: client_name || targetRequest?.full_name || "Client",
        recipient_email: targetRequest?.email || null,
        recipient_phone: targetRequest?.phone || null,
        channel: "email",
        title: `[Kinimmo] Confirmation de votre visite immobili\xE8re le ${visit_date}`,
        content_text: `Bonjour ${client_name || targetRequest?.full_name || "Client"}, votre visite pour "${property_title || "le bien s\xE9lectionn\xE9"}" est confirm\xE9e le ${visit_date} \xE0 ${visit_time || "14:00"} avec ${agent_name || "votre conseiller Kinimmo"}.`,
        metadata: { visitId: newVisit.id, requestId: newVisit.request_id }
      });
      enqueueNotification({
        event_type: "visit_reminder",
        recipient_type: "client",
        recipient_name: client_name || targetRequest?.full_name || "Client",
        recipient_email: targetRequest?.email || null,
        recipient_phone: targetRequest?.phone || null,
        channel: "whatsapp",
        title: `[Rappel Kinimmo] Visite immobili\xE8re pr\xE9vue \xE0 ${visit_time || "14:00"}`,
        content_text: `Rappel de rendez-vous Kinimmo : votre visite pour "${property_title || "votre propri\xE9t\xE9"}" aura lieu aujourd'hui \xE0 ${visit_time || "14:00"}.`,
        status: "pending",
        scheduled_for: `${visit_date}T${visit_time || "12:00"}:00.000Z`,
        metadata: { visitId: newVisit.id, visitDate: visit_date }
      });
    } catch (notifErr) {
      console.warn("Erreur notification visite:", notifErr);
    }
    return res.status(201).json({ success: true, message: "Visite planifi\xE9e et notifications enregistr\xE9es dans la file.", data: newVisit });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};
app.post("/api/property-visits", handleCreatePropertyVisit);
app.post("/api/concierge/visits", handleCreatePropertyVisit);
var handlePatchPropertyVisit = async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Authentification requise." });
    }
    if (user.role !== "admin" && user.role !== "agent" && user.role !== "agency") {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    const { id } = req.params;
    const { status, notes, visit_date, visit_time, agent_id, property_id } = req.body;
    const visit = inMemoryVisits.find((v) => v.id === id);
    if (!visit) {
      return res.status(404).json({ success: false, error: "Visite introuvable." });
    }
    if (user.role === "agent" && visit.agent_id !== user.id) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit : vous ne pouvez modifier que les visites qui vous sont attribu\xE9es." });
    }
    if (user.role === "agency") {
      const agencyKey = user.agencyId || user.id;
      const agencyAgentIds = new Set(
        [user.id, agencyKey].concat(inMemoryCollaborators.filter((c) => c.agencyId === agencyKey).map((c) => c.userId)).concat(inMemoryUsers.filter((u) => u.agencyId === agencyKey).map((u) => u.id)).filter(Boolean)
      );
      const linkedProp = visit.property_id ? inMemoryProperties.find((p) => p.id === visit.property_id) : null;
      const allowed = visit.agency_id === agencyKey || visit.agent_id && agencyAgentIds.has(visit.agent_id) || Boolean(linkedProp && canManageProperty(user, linkedProp));
      if (!allowed) {
        return res.status(403).json({ success: false, error: "Acc\xE8s interdit : visite hors de votre organisation." });
      }
    }
    if (status !== void 0) visit.status = status;
    if (notes !== void 0) visit.notes = notes;
    if (visit_date !== void 0) visit.visit_date = String(visit_date).trim().split("T")[0].slice(0, 10);
    if (visit_time !== void 0) visit.visit_time = visit_time;
    if (agent_id !== void 0 && user.role === "admin") visit.agent_id = agent_id;
    if (property_id !== void 0) visit.property_id = property_id;
    visit.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    saveLocalVisits(inMemoryVisits);
    return res.json({ success: true, message: "Visite mise \xE0 jour.", data: visit });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};
app.patch("/api/property-visits/:id", handlePatchPropertyVisit);
app.patch("/api/concierge/visits/:id", handlePatchPropertyVisit);
var handleDeletePropertyVisit = async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Authentification requise." });
    }
    if (user.role !== "admin" && user.role !== "agent" && user.role !== "agency") {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    const { id } = req.params;
    const visit = inMemoryVisits.find((v) => v.id === id);
    if (!visit) {
      return res.status(404).json({ success: false, error: "Visite introuvable." });
    }
    if (user.role === "agent" && visit.agent_id !== user.id) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    if (user.role === "agency") {
      const agencyKey = user.agencyId || user.id;
      const agencyAgentIds = new Set(
        [user.id, agencyKey].concat(inMemoryCollaborators.filter((c) => c.agencyId === agencyKey).map((c) => c.userId)).concat(inMemoryUsers.filter((u) => u.agencyId === agencyKey).map((u) => u.id)).filter(Boolean)
      );
      const linkedProp = visit.property_id ? inMemoryProperties.find((p) => p.id === visit.property_id) : null;
      const allowed = visit.agency_id === agencyKey || visit.agent_id && agencyAgentIds.has(visit.agent_id) || Boolean(linkedProp && canManageProperty(user, linkedProp));
      if (!allowed) {
        return res.status(403).json({ success: false, error: "Acc\xE8s interdit : visite hors de votre organisation." });
      }
    }
    inMemoryVisits = inMemoryVisits.filter((v) => v.id !== id);
    saveLocalVisits(inMemoryVisits);
    return res.json({ success: true, message: "Visite supprim\xE9e avec succ\xE8s." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};
app.delete("/api/property-visits/:id", handleDeletePropertyVisit);
app.delete("/api/concierge/visits/:id", handleDeletePropertyVisit);
app.get("/api/notifications", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Authentification requise pour consulter les notifications."
      });
    }
    let list = inMemoryNotifications;
    if (user.role === "agent") {
      list = list.filter((n) => n.recipient_id === user.id);
    } else if (user.role !== "admin") {
      const agencyKey = user.agencyId || user.id;
      list = list.filter((n) => n.recipient_id === user.id || n.recipient_id === agencyKey);
    }
    const { event_type, status } = req.query;
    if (event_type) {
      list = list.filter((n) => n.event_type === String(event_type));
    }
    if (status) {
      list = list.filter((n) => n.status === String(status));
    }
    return res.json({
      success: true,
      count: list.length,
      data: list
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});
app.get("/api/notifications/templates", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Authentification requise." });
  }
  if (user.role !== "admin" && user.role !== "agent" && user.role !== "agency") {
    return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
  }
  return res.json({
    success: true,
    data: [
      {
        id: "client_request_confirmation",
        name: "Confirmation de demande au client",
        description: "Accus\xE9 de r\xE9ception avec r\xE9capitulatif du projet (Projet, type de bien, commune, budget, r\xE9f\xE9rence).",
        variables: ["full_name", "reference", "project_type", "property_type", "commune", "budget_max", "currency"],
        supportedChannels: ["email", "whatsapp", "sms"]
      },
      {
        id: "agent_request_assigned",
        name: "Notification \xE0 l\u2019agent responsable",
        description: "Alerte transmise au courtier responsable lors de l\u2019attribution d\u2019un nouveau dossier.",
        variables: ["agent_name", "client_name", "phone", "project", "property_type", "commune", "reference"],
        supportedChannels: ["email", "whatsapp", "in_app"]
      },
      {
        id: "visit_confirmation",
        name: "Confirmation de visite immobili\xE8re",
        description: "Confirmation de rendez-vous terrain envoy\xE9e au client et \xE0 l\u2019agent accompagnateur.",
        variables: ["client_name", "agent_name", "visit_date", "visit_time", "property_title"],
        supportedChannels: ["email", "whatsapp", "sms"]
      },
      {
        id: "visit_reminder",
        name: "Rappel de visite",
        description: "Rappel automatique envoy\xE9 avant l\u2019heure du rendez-vous (J-1 ou H-2) pour confirmer la pr\xE9sence.",
        variables: ["client_name", "visit_date", "visit_time", "property_title", "agent_name"],
        supportedChannels: ["whatsapp", "sms", "email"]
      }
    ]
  });
});
app.post("/api/notifications/test-template", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  }
  const { event_type, sample_data = {} } = req.body;
  let preview = { subject: "", text: "" };
  switch (event_type) {
    case "client_request_confirmation":
      preview = {
        subject: `[Kinimmo] Confirmation de votre demande de Conciergerie #${sample_data.reference || "KIN-84920"}`,
        text: `Bonjour ${sample_data.full_name || "Client"}, votre demande #${sample_data.reference || "KIN-84920"} (${sample_data.project_type || "Acheter"} - ${sample_data.property_type || "Villa"} \xE0 ${sample_data.commune || "Gombe"}) a bien \xE9t\xE9 enregistr\xE9e. Un conseiller Kinimmo vous contactera tr\xE8s rapidement.`
      };
      break;
    case "agent_request_assigned":
      preview = {
        subject: `[Kinimmo Agent] Nouvelle mission de Conciergerie assign\xE9e #${sample_data.reference || "KIN-84920"}`,
        text: `Bonjour ${sample_data.agent_name || "Agent"}, une nouvelle demande de conciergerie (#${sample_data.reference || "KIN-84920"}) pour ${sample_data.client_name || "Client"} (${sample_data.phone || "+243..."}) vous a \xE9t\xE9 attribu\xE9e par la Direction.`
      };
      break;
    case "visit_confirmation":
      preview = {
        subject: `[Kinimmo] Confirmation de votre visite immobili\xE8re le ${sample_data.visit_date || "2026-10-05"}`,
        text: `Bonjour ${sample_data.client_name || "Client"}, votre visite pour "${sample_data.property_title || "Propri\xE9t\xE9 Kinshasa"}" est confirm\xE9e le ${sample_data.visit_date || "2026-10-05"} \xE0 ${sample_data.visit_time || "15:00"} avec ${sample_data.agent_name || "votre conseiller Kinimmo"}.`
      };
      break;
    case "visit_reminder":
      preview = {
        subject: `[Rappel Kinimmo] Visite immobili\xE8re pr\xE9vue \xE0 ${sample_data.visit_time || "15:00"}`,
        text: `Rappel : votre visite pour "${sample_data.property_title || "Propri\xE9t\xE9 Kinshasa"}" aura lieu aujourd\u2019hui \xE0 ${sample_data.visit_time || "15:00"}. Merci de confirmer votre pr\xE9sence.`
      };
      break;
    default:
      return res.status(400).json({ success: false, error: "Type d\u2019\xE9v\xE9nement de notification invalide." });
  }
  return res.json({
    success: true,
    event_type,
    simulated: true,
    notice: "Structure backend uniquement. Aucune API externe n\u2019a \xE9t\xE9 contact\xE9e.",
    preview
  });
});
app.post("/api/notifications/trigger-reminder/:visitId", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "admin" && user.role !== "agent") {
    return res.status(401).json({ success: false, error: "Authentification requise." });
  }
  const { visitId } = req.params;
  const visit = inMemoryVisits.find((v) => v.id === visitId);
  if (!visit) {
    return res.status(404).json({ success: false, error: "Visite introuvable." });
  }
  if (user.role === "agent" && visit.agent_id !== user.id) {
    return res.status(403).json({ success: false, error: "Acc\xE8s interdit : vous ne pouvez d\xE9clencher des rappels que pour vos propres visites." });
  }
  const notif = enqueueNotification({
    event_type: "visit_reminder",
    recipient_type: "client",
    recipient_name: visit.client_name || "Client",
    channel: "whatsapp",
    title: `[Rappel Kinimmo] Visite immobili\xE8re pr\xE9vue le ${visit.visit_date} \xE0 ${visit.visit_time || "14:00"}`,
    content_text: `Rappel Kinimmo : votre visite pour "${visit.property_title || "le bien s\xE9lectionn\xE9"}" est pr\xE9vue le ${visit.visit_date} \xE0 ${visit.visit_time || "14:00"}.`,
    metadata: { visitId: visit.id, visitDate: visit.visit_date }
  });
  return res.json({
    success: true,
    message: "Rappel de visite enregistr\xE9 dans la file d\u2019attente backend.",
    notification: notif
  });
});
function getFreePlanMaxListingsServer() {
  const starter = inMemoryPlans.find((p) => p.id === "starter" || Number(p.price_usd || p.priceMonthly || 0) === 0);
  return Number(starter?.max_listings ?? starter?.maxListings ?? 3);
}
function doesPropertyBelongToUserServer(p, userId, agencyId) {
  if (!p) return false;
  if (p.userId === userId || p.agentId === userId || p.ownerId === userId) return true;
  if (agencyId && (p.agencyId === agencyId || p.agentId === agencyId)) return true;
  return false;
}
function softDowngradeUserPropertiesServer(userId) {
  const freeMax = getFreePlanMaxListingsServer();
  const targetUser = inMemoryUsers.find((u) => u.id === userId || u.email === userId);
  const agencyId = targetUser?.agencyId;
  const ownedActive = inMemoryProperties.filter((p) => doesPropertyBelongToUserServer(p, userId, agencyId) && p.published !== false && p.listingStatus !== "ARCHIVED").sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  if (ownedActive.length <= freeMax) {
    return { hiddenCount: 0, keptCount: ownedActive.length };
  }
  const keepIds = new Set(ownedActive.slice(0, freeMax).map((p) => p.id));
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let hiddenCount = 0;
  inMemoryProperties = inMemoryProperties.map((p) => {
    if (doesPropertyBelongToUserServer(p, userId, agencyId) && p.published !== false && !keepIds.has(p.id)) {
      hiddenCount += 1;
      return {
        ...p,
        published: false,
        softHiddenByPlan: true,
        softHiddenAt: nowIso,
        updatedAt: nowIso
      };
    }
    return p;
  });
  if (hiddenCount > 0) saveLocalProperties(inMemoryProperties);
  return { hiddenCount, keptCount: Math.min(ownedActive.length, freeMax) };
}
function restoreSoftHiddenPropertiesServer(userId) {
  const targetUser = inMemoryUsers.find((u) => u.id === userId || u.email === userId);
  const agencyId = targetUser?.agencyId;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  let restoredCount = 0;
  inMemoryProperties = inMemoryProperties.map((p) => {
    if (doesPropertyBelongToUserServer(p, userId, agencyId) && p.softHiddenByPlan) {
      restoredCount += 1;
      return {
        ...p,
        published: true,
        softHiddenByPlan: false,
        softHiddenAt: void 0,
        updatedAt: nowIso
      };
    }
    return p;
  });
  if (restoredCount > 0) saveLocalProperties(inMemoryProperties);
  return restoredCount;
}
function applyPlanToAccountServer(userId, plan, cycle, isTrial = false) {
  const now = /* @__PURE__ */ new Date();
  const durationDays = isTrial ? Math.max(1, Number(plan?.trial_days ?? plan?.trialDays ?? 7)) : cycle === "yearly" ? 365 : 30;
  const expiresAtIso = new Date(now.getTime() + durationDays * 864e5).toISOString().split("T")[0];
  const uIdx = inMemoryUsers.findIndex((u) => u.id === userId || u.email === userId);
  let targetAgencyId;
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = {
      ...inMemoryUsers[uIdx],
      subscriptionPlan: plan.id,
      subscriptionStatus: "Active",
      subscriptionExpiresAt: expiresAtIso,
      billingCycle: cycle,
      trialEndsAt: isTrial ? expiresAtIso : void 0,
      includedBoostsRemaining: Number(plan.included_boosts ?? plan.includedBoosts ?? 0)
    };
    targetAgencyId = inMemoryUsers[uIdx].agencyId;
    saveLocalUsers(inMemoryUsers);
  }
  const agIdx = inMemoryAgencies.findIndex((a) => a.id === targetAgencyId || a.id === userId || a.userId === userId);
  if (agIdx !== -1) {
    inMemoryAgencies[agIdx] = {
      ...inMemoryAgencies[agIdx],
      subscriptionPlan: plan.id,
      subscriptionStatus: "Active",
      subscriptionExpiresAt: expiresAtIso,
      billingCycle: cycle,
      trialEndsAt: isTrial ? expiresAtIso : void 0,
      includedBoostsRemaining: Number(plan.included_boosts ?? plan.includedBoosts ?? 0),
      lastPaymentDate: now.toISOString().split("T")[0],
      unpaidInvoiceId: void 0
    };
    saveLocalAgencies(inMemoryAgencies);
  }
  const restored = restoreSoftHiddenPropertiesServer(userId);
  return { expiresAtIso, restored };
}
function downgradeAccountToFreeServer(userId) {
  const nowDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const uIdx = inMemoryUsers.findIndex((u) => u.id === userId || u.email === userId);
  let targetAgencyId;
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = {
      ...inMemoryUsers[uIdx],
      subscriptionPlan: "starter",
      subscriptionStatus: "Expired",
      subscriptionExpiresAt: nowDate,
      includedBoostsRemaining: 0
    };
    targetAgencyId = inMemoryUsers[uIdx].agencyId;
    saveLocalUsers(inMemoryUsers);
  }
  const agIdx = inMemoryAgencies.findIndex((a) => a.id === targetAgencyId || a.id === userId || a.userId === userId);
  if (agIdx !== -1) {
    inMemoryAgencies[agIdx] = {
      ...inMemoryAgencies[agIdx],
      subscriptionPlan: "starter",
      subscriptionStatus: "Expired",
      subscriptionExpiresAt: nowDate,
      includedBoostsRemaining: 0
    };
    saveLocalAgencies(inMemoryAgencies);
  }
  return softDowngradeUserPropertiesServer(userId);
}
app.get("/api/billing/plans", (req, res) => {
  try {
    const { category, audience, include_inactive } = req.query;
    const activeRate = getActiveExchangeRateServer();
    let list = inMemoryPlans.map((p) => normalizeServerPlan(p, activeRate));
    if (include_inactive !== "true") {
      list = list.filter((p) => p.is_active !== false && LAUNCH_AUDIENCES.includes(p.audience));
    }
    if (audience && audience !== "all") {
      list = list.filter((p) => p.audience === audience);
    }
    if (category && category !== "all") {
      list = list.filter((p) => p.category === category);
    }
    return res.json({ success: true, count: list.length, plans: list, exchangeRate: activeRate });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/plans/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const idx = inMemoryPlans.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const existing = inMemoryPlans[idx];
      const merged = normalizeServerPlan({
        ...existing,
        ...req.body,
        id,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      inMemoryPlans[idx] = merged;
      saveLocalPlans(inMemoryPlans);
      return res.json({ success: true, message: "Formule mise \xE0 jour avec succ\xE8s.", plan: merged });
    }
    return res.status(404).json({ success: false, error: "Formule introuvable" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/billing/plans", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const id = req.body.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const audience = req.body.audience || mapCategoryToAudienceServer(req.body.category, id);
    const newPlan = normalizeServerPlan({
      ...req.body,
      id,
      audience,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    });
    inMemoryPlans.push(newPlan);
    saveLocalPlans(inMemoryPlans);
    return res.status(201).json({ success: true, message: "Formule cr\xE9\xE9e avec succ\xE8s.", plan: newPlan });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/billing/plans/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    inMemoryPlans = inMemoryPlans.filter((p) => p.id !== id);
    saveLocalPlans(inMemoryPlans);
    return res.json({ success: true, message: "Formule supprim\xE9e." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/billing/visibility-options", (_req, res) => {
  try {
    const activeRate = getActiveExchangeRateServer();
    const options = inMemoryOptions.map((opt) => {
      const priceUsd = Number(opt.price_usd ?? opt.price ?? 0);
      const priceCdf = priceUsd > 0 ? Math.round(priceUsd * activeRate) : Number(opt.price_cdf ?? opt.priceCDF ?? 0);
      return {
        ...opt,
        price_cdf: priceCdf,
        priceCDF: priceCdf
      };
    });
    return res.json({ success: true, count: options.length, options, exchangeRate: activeRate });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/visibility-options/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const idx = inMemoryOptions.findIndex((o) => o.id === id);
    if (idx !== -1) {
      const priceUsd = Number(req.body.price_usd !== void 0 ? req.body.price_usd : req.body.price !== void 0 ? req.body.price : inMemoryOptions[idx].price_usd);
      const priceCdf = Number(req.body.price_cdf !== void 0 ? req.body.price_cdf : req.body.priceCDF !== void 0 ? req.body.priceCDF : priceUsd * (Number(inMemorySettings?.exchange_rate_usd_cdf) || 2850));
      const durationDays = Math.max(1, Number(req.body.duration_days !== void 0 ? req.body.duration_days : inMemoryOptions[idx].duration_days));
      const nextBoostType = req.body.boost_type ?? inMemoryOptions[idx].boost_type;
      const nextBadgeText = req.body.badge_text !== void 0 ? req.body.badge_text : inMemoryOptions[idx].badge_text;
      const nextLabelType = nextBoostType === "urgent" ? void 0 : resolveBoostPrimaryLabel(nextBoostType, nextBadgeText, req.body.label_type ?? inMemoryOptions[idx].label_type);
      inMemoryOptions[idx] = {
        ...inMemoryOptions[idx],
        ...req.body,
        boost_type: nextBoostType,
        badge_text: nextBadgeText,
        label_type: nextLabelType,
        price_usd: priceUsd,
        price: priceUsd,
        price_cdf: priceCdf,
        priceCDF: priceCdf,
        duration_days: durationDays,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      saveLocalOptions(inMemoryOptions);
      return res.json({ success: true, message: "Option de visibilit\xE9 mise \xE0 jour.", option: inMemoryOptions[idx] });
    }
    return res.status(404).json({ success: false, error: "Option non trouv\xE9e" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/billing/visibility-options", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const id = req.body.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const priceUsd = Number(req.body.price_usd ?? req.body.price ?? 10);
    const priceCdf = Number(req.body.price_cdf ?? req.body.priceCDF ?? priceUsd * (Number(inMemorySettings?.exchange_rate_usd_cdf) || 2850));
    const boostType = req.body.boost_type || "featured";
    const badgeText = req.body.badge_text || (boostType === "urgent" ? "Urgent" : resolveBoostPrimaryLabel(boostType));
    const newOption = {
      id,
      name: req.body.name || "Option de visibilit\xE9",
      slug: req.body.slug || `boost_${Date.now()}`,
      description: req.body.description || "",
      boost_type: boostType,
      duration_days: Math.max(1, Number(req.body.duration_days || 7)),
      price_usd: priceUsd,
      price: priceUsd,
      price_cdf: priceCdf,
      priceCDF: priceCdf,
      badge_text: badgeText,
      label_type: boostType === "urgent" ? void 0 : resolveBoostPrimaryLabel(boostType, badgeText, req.body.label_type),
      icon: req.body.icon || "Sparkles",
      is_active: req.body.is_active !== false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryOptions.push(newOption);
    saveLocalOptions(inMemoryOptions);
    return res.status(201).json({ success: true, message: "Option de visibilit\xE9 cr\xE9\xE9e.", option: newOption });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/billing/visibility-options/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    inMemoryOptions = inMemoryOptions.filter((o) => o.id !== id);
    saveLocalOptions(inMemoryOptions);
    return res.json({ success: true, message: "Option supprim\xE9e avec succ\xE8s." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/billing/payment-methods", (req, res) => {
  try {
    const includeInactive = req.query.include_inactive === "true";
    const list = includeInactive ? inMemoryPaymentMethods : inMemoryPaymentMethods.filter((pm) => pm.is_active !== false);
    return res.json({ success: true, count: list.length, paymentMethods: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var handleCreatePaymentMethod = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const pm = {
      id: req.body.id || `pm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider: req.body.provider || "mpesa",
      account_name: req.body.account_name || "Compte Marchand Kinimmo",
      account_number: req.body.account_number || "",
      merchant_code: req.body.merchant_code || null,
      instructions: req.body.instructions || "",
      is_active: req.body.is_active !== false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryPaymentMethods.push(pm);
    saveLocalPaymentMethods(inMemoryPaymentMethods);
    return res.status(201).json({ success: true, paymentMethod: pm });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/billing/payment-methods", handleCreatePaymentMethod);
app.post("/api/billing/admin/payment-methods", handleCreatePaymentMethod);
var handleUpdatePaymentMethod = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const idx = inMemoryPaymentMethods.findIndex((pm) => pm.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: "Op\xE9rateur introuvable." });
    inMemoryPaymentMethods[idx] = { ...inMemoryPaymentMethods[idx], ...req.body, id, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
    saveLocalPaymentMethods(inMemoryPaymentMethods);
    return res.json({ success: true, paymentMethod: inMemoryPaymentMethods[idx] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.put("/api/billing/payment-methods/:id", handleUpdatePaymentMethod);
app.put("/api/billing/admin/payment-methods/:id", handleUpdatePaymentMethod);
var handleDeletePaymentMethod = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    inMemoryPaymentMethods = inMemoryPaymentMethods.filter((pm) => pm.id !== id);
    saveLocalPaymentMethods(inMemoryPaymentMethods);
    return res.json({ success: true, message: "Moyen de paiement supprim\xE9." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.delete("/api/billing/payment-methods/:id", handleDeletePaymentMethod);
app.delete("/api/billing/admin/payment-methods/:id", handleDeletePaymentMethod);
app.post("/api/billing/invoices", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    const {
      planId,
      paymentMethodId,
      paymentGateway = "manual_mobile_money",
      billingCycle = "monthly",
      startTrial = false,
      userName,
      userEmail
    } = req.body;
    const rawPlan = inMemoryPlans.find((p) => p.id === planId) || inMemoryPlans[0];
    const targetPlan = normalizeServerPlan(rawPlan);
    const targetPayment = inMemoryPaymentMethods.find((pm) => pm.id === paymentMethodId) || inMemoryPaymentMethods[0];
    const cycle = billingCycle === "yearly" ? "yearly" : "monthly";
    const trialDays = Number(targetPlan.trial_days ?? targetPlan.trialDays ?? 0);
    const isTrial = Boolean(startTrial && trialDays > 0);
    const amountUsd = isTrial ? 0 : cycle === "yearly" ? Number(targetPlan.price_yearly_usd ?? targetPlan.priceYearly ?? 0) : Number(targetPlan.price_usd ?? targetPlan.priceMonthly ?? 0);
    const amountCdf = isTrial ? 0 : cycle === "yearly" ? Number(targetPlan.price_yearly_cdf ?? targetPlan.priceYearlyCDF ?? 0) : Number(targetPlan.price_cdf ?? targetPlan.priceMonthlyCDF ?? 0);
    const isZero = amountUsd <= 0;
    const invoiceNumber = `FAC-KIN-${Math.floor(1e5 + Math.random() * 9e5)}`;
    const receiptNumber = isZero ? `REC-KIN-${Math.floor(1e5 + Math.random() * 9e5)}` : void 0;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const durationDays = isTrial ? trialDays : cycle === "yearly" ? 365 : 30;
    const periodEndIso = new Date(Date.now() + durationDays * 864e5).toISOString().split("T")[0];
    const dueDate = new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0];
    const newInvoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      invoiceNumber,
      receipt_number: receiptNumber,
      receiptNumber,
      user_id: user.id,
      user_name: userName || user.name || "Client Kinshasa",
      user_email: userEmail || user.email || "client@kinimmo.cd",
      target_name: userName || user.name || targetPlan.name,
      target_email: userEmail || user.email || "client@kinimmo.cd",
      invoice_type: "subscription",
      invoiceType: "subscription",
      plan_id: targetPlan.id,
      plan_name: targetPlan.name,
      billing_cycle: cycle,
      billingCycle: cycle,
      is_trial: isTrial,
      isTrial,
      amount: amountUsd,
      amount_usd: amountUsd,
      currency: "USD",
      amount_cdf: amountCdf,
      total_amount: amountUsd,
      total_amount_cdf: amountCdf,
      payment_method_id: targetPayment?.id || null,
      payment_method_provider: isTrial ? "Essai Gratuit Kinimmo" : targetPayment?.account_name || "Mobile Money",
      payment_gateway: isTrial ? "free_trial" : paymentGateway,
      status: isZero ? "paid" : "pending",
      period_start: nowIso.split("T")[0],
      period_end: periodEndIso,
      due_date: dueDate,
      paid_at: isZero ? nowIso : void 0,
      validated_at: isZero ? nowIso : void 0,
      validated_by: isZero ? "Syst\xE8me Kinimmo" : void 0,
      created_at: nowIso,
      updated_at: nowIso
    };
    if (isZero) {
      applyPlanToAccountServer(user.id, targetPlan, cycle, isTrial);
    }
    inMemoryInvoices.unshift(newInvoice);
    saveLocalInvoices(inMemoryInvoices);
    return res.status(201).json({
      success: true,
      message: isTrial ? `Essai gratuit de ${trialDays} jours activ\xE9 avec succ\xE8s.` : "Facture g\xE9n\xE9r\xE9e avec succ\xE8s.",
      invoice: newInvoice
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
function activateBoostOnPropertyAndInvoice(inv, adminUser) {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const matchedOption = inMemoryOptions.find((o) => o.id === inv.option_id);
  const optionId = String(inv.option_id || "").toLowerCase();
  const boostType = String(inv.boost_type || matchedOption?.boost_type || "featured").toLowerCase();
  let durationDays = Number(inv.duration_days ?? matchedOption?.duration_days ?? 7);
  if (!Number.isFinite(durationDays) || durationDays < 1) {
    if (optionId.includes("30")) durationDays = 30;
    else if (optionId.includes("14")) durationDays = 14;
    else durationDays = 7;
  }
  const boostLabel = boostType === "urgent" ? "Urgent" : resolveBoostPrimaryLabel(boostType, matchedOption?.badge_text, inv.boost_label || matchedOption?.label_type);
  const propIdx = inMemoryProperties.findIndex((p) => p.id === inv.property_id);
  let propTitle = inv.property_title || "Bien immobilier";
  let startsAtIso = nowIso;
  let expiresAtIso = new Date(nowMs + durationDays * 864e5).toISOString();
  if (propIdx !== -1) {
    const prop = inMemoryProperties[propIdx];
    propTitle = prop.title || propTitle;
    const liveMetrics = getLivePropertyMetrics(prop);
    const existingExpMs = prop.boostExpiresAt ? Date.parse(prop.boostExpiresAt) : NaN;
    const hasRunningBoost = !prop.boostSuspended && !Number.isNaN(existingExpMs) && existingExpMs > nowMs;
    if (hasRunningBoost) {
      startsAtIso = new Date(existingExpMs).toISOString();
      expiresAtIso = new Date(existingExpMs + durationDays * 864e5).toISOString();
    }
    inv.views_before = inv.views_before !== void 0 ? Number(inv.views_before) : liveMetrics.views;
    inv.contacts_before = inv.contacts_before !== void 0 ? Number(inv.contacts_before) : liveMetrics.contacts;
    inv.views_during_acc = inv.views_during_acc ?? 0;
    inv.contacts_during_acc = inv.contacts_during_acc ?? 0;
    inv.starts_at = startsAtIso;
    inv.expires_at = expiresAtIso;
    inv.boost_type = boostType;
    inv.boost_label = boostLabel;
    inv.duration_days = durationDays;
    prop.boostStartedAt = hasRunningBoost && prop.boostStartedAt ? prop.boostStartedAt : startsAtIso;
    prop.boostExpiresAt = expiresAtIso;
    prop.boostSuspended = false;
    prop.boostType = boostType;
    prop.boostBadgeText = matchedOption?.badge_text || boostLabel;
    if (boostType === "urgent") {
      prop.isUrgent = true;
    } else if (boostType === "premium") {
      prop.isPremium = true;
      prop.featured = true;
      prop.listingTier = "premium";
      prop.boostLabel = boostLabel;
    } else if (boostType === "sponsorise" || boostType === "social_blast" || boostType === "refresh") {
      prop.isSponsored = true;
      prop.featured = true;
      prop.listingTier = prop.listingTier === "premium" ? "premium" : "featured";
      prop.boostLabel = boostLabel;
    } else {
      prop.featured = true;
      prop.listingTier = prop.listingTier === "premium" ? "premium" : "featured";
      prop.boostLabel = boostLabel;
    }
    prop.refreshBumpAt = nowIso;
    prop.updatedAt = nowIso;
    saveLocalProperties(inMemoryProperties);
    const existingSlideIdx = inMemorySlides.findIndex((s) => s.propertyId === prop.id);
    const slideData = {
      id: `slide_prop_${prop.id}`,
      badgeCategory: prop.category?.toUpperCase() || "PRESTIGE",
      badgeLocation: `${(prop.commune || "KINSHASA").toUpperCase()}`,
      title: prop.title.toUpperCase(),
      subTitle: `${(prop.type || "R\xC9SIDENCE").toUpperCase()} D'EXCEPTION \u2022 KINSHASA`,
      description: prop.description || "Bien immobilier d'exception valid\xE9 en vitrine.",
      image: prop.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600",
      propertyType: prop.type || "R\xE9sidence",
      commune: prop.commune || "Gombe",
      propertyId: prop.id,
      isActive: true,
      order: 1,
      contactName: prop.agencyName || "Service Commercial",
      contactPhone: prop.contactPhone || "+243 81 000 0001",
      contactWhatsapp: prop.contactPhone || "+243 81 000 0001",
      stats: {
        units: prop.bedrooms ? `${prop.bedrooms} Chambres` : "Standing",
        parking: prop.bathrooms ? `${prop.bathrooms} Salles d'eau` : "Parking",
        surface: prop.area ? `${prop.area} m\xB2` : "320 m\xB2"
      },
      details: {
        amenities: prop.amenities || ["S\xE9curit\xE9 24/7", "Groupe & Forage", "Titre foncier garanti"],
        priceInfo: formatPropertyPrimaryPriceWithPeriod(prop, getActiveExchangeRateServer(), false),
        deliveryDate: "Disponible imm\xE9diatement"
      }
    };
    if (existingSlideIdx !== -1) {
      inMemorySlides[existingSlideIdx] = { ...inMemorySlides[existingSlideIdx], ...slideData, isActive: true };
    } else {
      inMemorySlides.unshift(slideData);
    }
    saveLocalSlides(inMemorySlides);
  } else {
    inv.starts_at = startsAtIso;
    inv.expires_at = expiresAtIso;
    inv.boost_label = boostLabel;
    inv.duration_days = durationDays;
  }
  inv.admin_id = adminUser.id;
  inv.admin_name = adminUser.name || "Administrateur Kinimmo";
  inv.reviewed_at = nowIso;
  return { propTitle, durationDays, startsAtIso, expiresAtIso, boostLabel };
}
app.post("/api/billing/boost-order", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    const { propertyId, optionId, paymentMethodId, paymentGateway = "manual_mobile_money", propertyTitle, extendsBoostId } = req.body;
    let targetProperty = null;
    if (propertyId) {
      targetProperty = inMemoryProperties.find((p) => p.id === propertyId);
      if (!targetProperty) {
        return res.status(404).json({ success: false, error: "Annonce introuvable." });
      }
      if (!canManageProperty(user, targetProperty)) {
        return res.status(403).json({ success: false, error: "Acc\xE8s interdit : vous ne pouvez booster que vos propres annonces." });
      }
      if (!isPropertyPubliclyVisible(targetProperty)) {
        const rawStatus = String(targetProperty.listingStatus || targetProperty.status || "MASQU\xC9").toUpperCase();
        return res.status(400).json({
          success: false,
          error: `Impossible de commander un boost pour un bien non visible publiquement (${rawStatus}). Publiez et rendez le bien disponible avant de le mettre en avant.`
        });
      }
    }
    const targetOption = inMemoryOptions.find((o) => o.id === optionId && o.is_active !== false) || inMemoryOptions.find((o) => o.id === optionId) || inMemoryOptions[0];
    if (!targetOption) {
      return res.status(400).json({ success: false, error: "Aucune option de boost disponible." });
    }
    const targetPayment = inMemoryPaymentMethods.find((pm) => pm.id === paymentMethodId) || inMemoryPaymentMethods[0];
    const boostLabel = targetOption.boost_type === "urgent" ? "Urgent" : resolveBoostPrimaryLabel(targetOption.boost_type, targetOption.badge_text, targetOption.label_type);
    const invoiceNumber = `BST-KIN-${Math.floor(1e5 + Math.random() * 9e5)}`;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const dueDate = new Date(Date.now() + 3 * 864e5).toISOString().split("T")[0];
    const newInvoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      invoiceNumber,
      user_id: user.id,
      user_name: user.name || "Bailleur / Courtier Partenaire",
      user_email: user.email || user.phone || "partenaire@kinimmo.cd",
      target_name: user.name || "Annonceur Kinshasa",
      target_email: user.email || user.phone || "partenaire@kinimmo.cd",
      invoice_type: "boost",
      invoiceType: "boost",
      property_id: propertyId,
      property_title: targetProperty?.title || propertyTitle || "Propri\xE9t\xE9 Kinshasa",
      option_id: targetOption.id,
      option_name: targetOption.name,
      boost_type: targetOption.boost_type,
      boost_label: boostLabel,
      duration_days: Number(targetOption.duration_days || 7),
      extends_boost_id: extendsBoostId || void 0,
      amount: targetOption.price_usd,
      amount_usd: targetOption.price_usd,
      currency: "USD",
      amount_cdf: targetOption.price_cdf,
      total_amount: targetOption.price_usd,
      total_amount_cdf: targetOption.price_cdf,
      payment_method_id: targetPayment?.id || null,
      payment_method_provider: targetPayment?.account_name || "Mobile Money",
      payment_gateway: paymentGateway,
      status: "pending",
      due_date: dueDate,
      created_at: nowIso,
      updated_at: nowIso
    };
    inMemoryInvoices.unshift(newInvoice);
    saveLocalInvoices(inMemoryInvoices);
    return res.status(201).json({
      success: true,
      message: "Commande de visibilit\xE9 cr\xE9\xE9e avec succ\xE8s.",
      invoice: newInvoice,
      featured_slots_limit: getFeaturedSlotsLimitServer(),
      active_slots_count: countActiveBoostSlotsServer()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/billing/my-invoices", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const list = user.role === "admin" ? inMemoryInvoices : inMemoryInvoices.filter((inv) => inv.user_id === user.id || user.email && inv.user_email === user.email);
  return res.json({ success: true, count: list.length, invoices: list });
});
app.get("/api/billing/my-boosts", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const nowMs = Date.now();
  const rawBoosts = inMemoryInvoices.filter(
    (inv) => (inv.invoice_type === "boost" || inv.invoiceType === "boost" || Boolean(inv.property_id)) && (user.role === "admin" || inv.user_id === user.id || user.email && inv.user_email === user.email)
  );
  const boosts = rawBoosts.map((inv) => {
    const prop = inMemoryProperties.find((p) => p.id === inv.property_id);
    const computedStatus = evaluateBoostRequestStatus(inv, prop, nowMs);
    const liveMetrics = prop ? getLivePropertyMetrics(prop) : null;
    const metrics = computeBoostMetrics(inv, prop, liveMetrics?.analyticsRow, computedStatus);
    const matchedOpt = inMemoryOptions.find((o) => o.id === inv.option_id);
    const boostLabel = inv.boost_label || (inv.boost_type === "urgent" ? "Urgent" : resolveBoostPrimaryLabel(inv.boost_type || matchedOpt?.boost_type, matchedOpt?.badge_text, matchedOpt?.label_type));
    return {
      ...inv,
      status: computedStatus,
      computed_status: computedStatus,
      invoice_status: inv.status,
      boost_label: boostLabel,
      starts_at: inv.starts_at || (computedStatus === "active" ? prop?.boostStartedAt : void 0),
      expires_at: inv.expires_at || (computedStatus === "active" ? prop?.boostExpiresAt : void 0),
      property_title: prop?.title || inv.property_title || "Bien immobilier",
      property_commune: prop?.commune || "Kinshasa",
      property_visible: prop ? isPropertyPubliclyVisible(prop) : false,
      property_image: prop?.images?.[0] || "",
      views_before: metrics.viewsBefore,
      contacts_before: metrics.contactsBefore,
      views_during: metrics.viewsDuring,
      contacts_during: metrics.contactsDuring
    };
  });
  return res.json({
    success: true,
    count: boosts.length,
    boosts,
    featured_slots_limit: getFeaturedSlotsLimitServer(),
    active_slots_count: countActiveBoostSlotsServer(nowMs)
  });
});
app.put("/api/billing/invoices/:id/pay", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    const { id } = req.params;
    const { transactionReference, paymentMethodId, proofImageUrl, gatewayTransactionId } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Facture non trouv\xE9e" });
    }
    if (user.role !== "admin" && inv.user_id !== user.id && (!user.email || inv.user_email !== user.email)) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    const refValue = transactionReference || gatewayTransactionId || inv.transaction_reference;
    if (!refValue && !proofImageUrl) {
      return res.status(400).json({ success: false, error: "Veuillez renseigner la r\xE9f\xE9rence de transaction ou joindre une capture de paiement." });
    }
    if (refValue) inv.transaction_reference = String(refValue).trim();
    if (paymentMethodId) {
      inv.payment_method_id = paymentMethodId;
      const pm = inMemoryPaymentMethods.find((m) => m.id === paymentMethodId);
      if (pm) inv.payment_method_provider = pm.account_name;
    }
    if (proofImageUrl !== void 0) {
      inv.proof_image_url = proofImageUrl;
      inv.proofImageUrl = proofImageUrl;
    }
    inv.status = "awaiting_validation";
    inv.payment_submitted_at = (/* @__PURE__ */ new Date()).toISOString();
    inv.rejection_reason = void 0;
    inv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    saveLocalInvoices(inMemoryInvoices);
    return res.json({ success: true, message: "Preuve transmise. Facture en attente de validation par un administrateur.", invoice: inv });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/invoices/:id/approve", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Facture non trouv\xE9e" });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    inv.status = "paid";
    inv.paid_at = nowIso;
    inv.validated_at = nowIso;
    inv.validated_by = user.name || "Administrateur Kinimmo";
    if (!inv.receipt_number) {
      inv.receipt_number = `REC-KIN-${Math.floor(1e5 + Math.random() * 9e5)}`;
      inv.receiptNumber = inv.receipt_number;
    }
    inv.rejection_reason = void 0;
    inv.updated_at = nowIso;
    let restoredCount = 0;
    if (inv.invoice_type === "boost" || inv.invoiceType === "boost" || inv.property_id) {
      activateBoostOnPropertyAndInvoice(inv, user);
    } else if (inv.plan_id) {
      const targetPlan = normalizeServerPlan(inMemoryPlans.find((p) => p.id === inv.plan_id) || inMemoryPlans[1] || inMemoryPlans[0]);
      const cycle = inv.billing_cycle === "yearly" ? "yearly" : "monthly";
      const result = applyPlanToAccountServer(inv.user_id, targetPlan, cycle, Boolean(inv.is_trial));
      inv.period_start = nowIso.split("T")[0];
      inv.period_end = result.expiresAtIso;
      restoredCount = result.restored;
    }
    saveLocalInvoices(inMemoryInvoices);
    const updatedProp = inv.property_id ? inMemoryProperties.find((p) => p.id === inv.property_id) : null;
    return res.json({
      success: true,
      message: restoredCount > 0 ? `Facture ${inv.invoice_number} valid\xE9e (${inv.receipt_number}). Plan activ\xE9 et ${restoredCount} annonce(s) restaur\xE9e(s).` : `Facture ${inv.invoice_number} valid\xE9e avec succ\xE8s (${inv.receipt_number}).`,
      invoice: inv,
      property: updatedProp ? sanitizePropertyForViewer(updatedProp, user) : void 0,
      restoredListingsCount: restoredCount,
      featured_slots_limit: getFeaturedSlotsLimitServer(),
      active_slots_count: countActiveBoostSlotsServer()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/invoices/:id/reject", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const { reason = "Paiement non re\xE7u ou r\xE9f\xE9rence de transaction non confirm\xE9e." } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Facture non trouv\xE9e" });
    }
    inv.status = "rejected";
    inv.rejection_reason = reason;
    inv.notes = `Paiement refus\xE9 par l'administrateur : ${reason}`;
    inv.validated_at = (/* @__PURE__ */ new Date()).toISOString();
    inv.validated_by = user.name || "Administrateur Kinimmo";
    inv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: `Paiement refus\xE9 pour la facture ${inv.invoice_number}. Motif enregistr\xE9.`,
      invoice: inv
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/invoices/:id/refund", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const { refundNote = "Remboursement manuel administratif", refundAction = "revoke" } = req.body || {};
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Facture non trouv\xE9e" });
    }
    const action = refundAction === "keep" ? "keep" : "revoke";
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    inv.status = "refunded";
    inv.refund_note = String(refundNote).trim();
    inv.refundNote = inv.refund_note;
    inv.refunded_at = nowIso;
    inv.refundedAt = nowIso;
    inv.refund_action = action;
    inv.refundAction = action;
    inv.validated_by = user.name || "Administrateur Kinimmo";
    inv.updated_at = nowIso;
    let softHiddenCount = 0;
    if (action === "revoke") {
      if (inv.invoice_type === "boost" || inv.property_id) {
        const propIdx = inMemoryProperties.findIndex((p) => p.id === inv.property_id);
        if (propIdx !== -1) {
          inMemoryProperties[propIdx].featured = false;
          inMemoryProperties[propIdx].isPremium = false;
          inMemoryProperties[propIdx].isUrgent = false;
          inMemoryProperties[propIdx].isSponsored = false;
          inMemoryProperties[propIdx].boostLabel = void 0;
          inMemoryProperties[propIdx].boostStartedAt = void 0;
          inMemoryProperties[propIdx].boostExpiresAt = void 0;
          inMemoryProperties[propIdx].listingTier = "standard";
          inMemoryProperties[propIdx].updatedAt = nowIso;
          saveLocalProperties(inMemoryProperties);
        }
      } else if (inv.user_id) {
        const resDowngrade = downgradeAccountToFreeServer(inv.user_id);
        softHiddenCount = resDowngrade.hiddenCount;
      }
    }
    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: action === "revoke" ? `Facture ${inv.invoice_number} rembours\xE9e et avantage r\xE9voqu\xE9 (${softHiddenCount} annonce(s) exc\xE9dentaire(s) masqu\xE9e(s) sans suppression).` : `Facture ${inv.invoice_number} rembours\xE9e avec note ; le plan/boost reste actif.`,
      invoice: inv,
      softHiddenCount
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var handleCheckExpirations = (req, res) => {
  try {
    const nowMs = Date.now();
    let downgradedAccounts = 0;
    let totalHidden = 0;
    inMemoryUsers.forEach((u) => {
      if (u.subscriptionExpiresAt && u.subscriptionPlan && u.subscriptionPlan !== "starter") {
        const expMs = new Date(u.subscriptionExpiresAt).getTime();
        if (!isNaN(expMs) && expMs < nowMs) {
          downgradedAccounts += 1;
          const r = downgradeAccountToFreeServer(u.id);
          totalHidden += r.hiddenCount;
        }
      }
    });
    return res.json({
      success: true,
      downgradedAccounts,
      softHiddenProperties: totalHidden,
      message: downgradedAccounts > 0 ? `${downgradedAccounts} compte(s) r\xE9trograd\xE9(s) en plan gratuit (${totalHidden} annonce(s) exc\xE9dentaire(s) masqu\xE9e(s) sans suppression).` : "Tous les abonnements actifs sont \xE0 jour."
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/billing/admin/check-expirations", handleCheckExpirations);
app.post("/api/billing/invoices/check-expirations", handleCheckExpirations);
app.get("/api/billing/admin/boost-requests", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const nowMs = Date.now();
    const boostInvoices = inMemoryInvoices.filter((inv) => inv.invoice_type === "boost" || inv.invoiceType === "boost" || inv.property_id);
    const enriched = boostInvoices.map((inv) => {
      const prop = inMemoryProperties.find((p) => p.id === inv.property_id);
      const computedStatus = evaluateBoostRequestStatus(inv, prop, nowMs);
      const liveMetrics = prop ? getLivePropertyMetrics(prop) : null;
      const metrics = computeBoostMetrics(inv, prop, liveMetrics?.analyticsRow, computedStatus);
      return {
        id: inv.id,
        property_id: inv.property_id,
        user_id: inv.user_id,
        option_id: inv.option_id,
        invoice_id: inv.id,
        status: computedStatus,
        computed_status: computedStatus,
        starts_at: inv.starts_at,
        expires_at: inv.expires_at || prop?.boostExpiresAt,
        boost_label: inv.boost_label,
        views_before: metrics.viewsBefore,
        contacts_before: metrics.contactsBefore,
        views_during: metrics.viewsDuring,
        contacts_during: metrics.contactsDuring,
        admin_id: inv.admin_id || (inv.status === "paid" ? "admin" : null),
        admin_name: inv.admin_name || (inv.status === "paid" ? "Administrateur Kinimmo" : null),
        reviewed_at: inv.paid_at || inv.reviewed_at,
        rejection_reason: inv.rejection_reason || inv.notes,
        created_at: inv.created_at,
        property_title: prop?.title || inv.property_title || "Bien immobilier",
        property_price: prop?.price || inv.amount,
        property_currency: prop?.currency || inv.currency || "USD",
        property_commune: prop?.commune || "Kinshasa",
        property_type: prop?.type || "R\xE9sidence",
        property_status: prop?.status || "for-sale",
        property_published: prop ? isPropertyPubliclyVisible(prop) : false,
        property_featured: prop?.featured === true,
        property_boost_expires_at: prop?.boostExpiresAt,
        property_image: prop?.images?.[0] || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600",
        applicant_name: inv.user_name || inv.target_name || "Annonceur Kinshasa",
        applicant_email: inv.user_email || inv.target_email || "partenaire@kinimmo.cd",
        applicant_phone: prop?.contactPhone || "+243 81 000 0000",
        option_name: inv.option_name || "Mise en avant",
        boost_type: inv.boost_type || "featured",
        duration_days: inv.duration_days || 7,
        price_usd: inv.amount || 10,
        price_cdf: inv.amount_cdf || 28500,
        invoice_number: inv.invoice_number,
        transaction_reference: inv.transaction_reference,
        due_date: inv.due_date
      };
    });
    return res.json({
      success: true,
      count: enriched.length,
      boosts: enriched,
      featured_slots_limit: getFeaturedSlotsLimitServer(),
      active_slots_count: countActiveBoostSlotsServer(nowMs)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var handleApproveBoostAction = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Demande de boost introuvable" });
    }
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    inv.status = "paid";
    inv.paid_at = nowIso;
    inv.validated_at = nowIso;
    inv.validated_by = user.name || "Administrateur Kinimmo";
    if (!inv.receipt_number) {
      inv.receipt_number = `REC-KIN-${Math.floor(1e5 + Math.random() * 9e5)}`;
      inv.receiptNumber = inv.receipt_number;
    }
    inv.updated_at = nowIso;
    const activation = activateBoostOnPropertyAndInvoice(inv, user);
    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: `Demande de mise en avant valid\xE9e avec succ\xE8s. L'annonce "${activation.propTitle}" est d\xE9sormais active (${activation.boostLabel}) pour ${activation.durationDays} jours.`,
      invoice: inv,
      boost: {
        id: inv.id,
        status: "active",
        propertyId: inv.property_id,
        durationDays: activation.durationDays,
        startsAt: activation.startsAtIso,
        expiresAt: activation.expiresAtIso,
        boostLabel: activation.boostLabel
      },
      featured_slots_limit: getFeaturedSlotsLimitServer(),
      active_slots_count: countActiveBoostSlotsServer()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/billing/admin/boost-requests/:id/approve", handleApproveBoostAction);
app.put("/api/billing/admin/boost-requests/:id/approve", handleApproveBoostAction);
var handleRejectBoostAction = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const { reason = "Demande non valid\xE9e ou paiement non re\xE7u." } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Demande de boost introuvable" });
    }
    inv.status = "failed";
    inv.admin_id = user.id;
    inv.admin_name = user.name || "Administrateur Kinimmo";
    inv.rejection_reason = reason;
    inv.notes = `Demande rejet\xE9e : ${reason}`;
    inv.reviewed_at = (/* @__PURE__ */ new Date()).toISOString();
    inv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    if (inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p) => p.id === inv.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = false;
        inMemoryProperties[propIdx].boostExpiresAt = void 0;
        saveLocalProperties(inMemoryProperties);
      }
      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === inv.property_id);
      if (slideIdx !== -1) {
        inMemorySlides[slideIdx].isActive = false;
        saveLocalSlides(inMemorySlides);
      }
    }
    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: `Demande de mise en avant rejet\xE9e. Motif : ${reason}`,
      boost: { id: inv.id, status: "rejected", rejectionReason: reason }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/billing/admin/boost-requests/:id/reject", handleRejectBoostAction);
app.put("/api/billing/admin/boost-requests/:id/reject", handleRejectBoostAction);
var handleSuspendBoostAction = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Demande de boost introuvable" });
    }
    let remainingSeconds = 7 * 86400;
    if (inv.expires_at) {
      const expiresTime = new Date(inv.expires_at).getTime();
      remainingSeconds = Math.max(0, Math.floor((expiresTime - Date.now()) / 1e3));
    }
    inv.status = "suspended";
    inv.remaining_seconds_frozen = remainingSeconds;
    inv.reviewed_at = (/* @__PURE__ */ new Date()).toISOString();
    inv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    if (inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p) => p.id === inv.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = false;
        inMemoryProperties[propIdx].boostSuspended = true;
        saveLocalProperties(inMemoryProperties);
      }
      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === inv.property_id);
      if (slideIdx !== -1) {
        inMemorySlides[slideIdx].isActive = false;
        saveLocalSlides(inMemorySlides);
      }
    }
    saveLocalInvoices(inMemoryInvoices);
    const remainingDays = Math.ceil(remainingSeconds / 86400);
    return res.json({
      success: true,
      message: `Mise en avant suspendue. Le compteur a \xE9t\xE9 gel\xE9 (${remainingDays} jour(s) pr\xE9serv\xE9(s)).`,
      boost: { id: inv.id, status: "suspended", remainingSecondsFrozen: remainingSeconds, remainingDays }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/billing/admin/boost-requests/:id/suspend", handleSuspendBoostAction);
app.put("/api/billing/admin/boost-requests/:id/suspend", handleSuspendBoostAction);
var handleResumeBoostAction = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Demande de boost introuvable" });
    }
    const remainingSeconds = inv.remaining_seconds_frozen || 7 * 86400;
    const now = /* @__PURE__ */ new Date();
    const newExpiresAt = new Date(now.getTime() + remainingSeconds * 1e3);
    inv.status = "paid";
    inv.starts_at = inv.starts_at || now.toISOString();
    inv.expires_at = newExpiresAt.toISOString();
    inv.remaining_seconds_frozen = void 0;
    inv.reviewed_at = now.toISOString();
    inv.updated_at = now.toISOString();
    if (inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p) => p.id === inv.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = true;
        inMemoryProperties[propIdx].boostSuspended = false;
        inMemoryProperties[propIdx].boostExpiresAt = newExpiresAt.toISOString();
        saveLocalProperties(inMemoryProperties);
      }
      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === inv.property_id);
      if (slideIdx !== -1) {
        inMemorySlides[slideIdx].isActive = true;
        saveLocalSlides(inMemorySlides);
      }
    }
    saveLocalInvoices(inMemoryInvoices);
    const remainingDays = Math.ceil(remainingSeconds / 86400);
    return res.json({
      success: true,
      message: `Mise en avant r\xE9activ\xE9e pour ${remainingDays} jour(s) restant(s).`,
      boost: { id: inv.id, status: "active", remainingDays, expiresAt: newExpiresAt.toISOString() }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/billing/admin/boost-requests/:id/resume", handleResumeBoostAction);
app.put("/api/billing/admin/boost-requests/:id/resume", handleResumeBoostAction);
var handleUpdateBoostDurationAction = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const { durationDays, expiresAt } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Demande de boost introuvable" });
    }
    let targetDate = /* @__PURE__ */ new Date();
    if (expiresAt) {
      targetDate = new Date(expiresAt);
    } else if (durationDays) {
      const base = inv.expires_at && new Date(inv.expires_at) > /* @__PURE__ */ new Date() ? new Date(inv.expires_at) : /* @__PURE__ */ new Date();
      base.setDate(base.getDate() + Number(durationDays));
      targetDate = base;
    } else {
      return res.status(400).json({ success: false, error: "Param\xE8tre durationDays ou expiresAt requis" });
    }
    inv.status = "paid";
    inv.expires_at = targetDate.toISOString();
    inv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    if (inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p) => p.id === inv.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = true;
        inMemoryProperties[propIdx].boostExpiresAt = targetDate.toISOString();
        saveLocalProperties(inMemoryProperties);
      }
      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === inv.property_id);
      if (slideIdx !== -1) {
        inMemorySlides[slideIdx].isActive = true;
        saveLocalSlides(inMemorySlides);
      }
    }
    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: `Mise en avant prolong\xE9e jusqu'au ${targetDate.toLocaleDateString()}.`,
      expiresAt: targetDate.toISOString()
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.put("/api/billing/admin/boost-requests/:id/duration", handleUpdateBoostDurationAction);
var handleDeleteBoostAction = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const idx = inMemoryInvoices.findIndex((i) => i.id === id || i.invoice_number === id || i.property_id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Demande de boost introuvable" });
    }
    const [deleted] = inMemoryInvoices.splice(idx, 1);
    if (deleted.property_id) {
      const propIdx = inMemoryProperties.findIndex((p) => p.id === deleted.property_id);
      if (propIdx !== -1) {
        inMemoryProperties[propIdx].featured = false;
        inMemoryProperties[propIdx].boostExpiresAt = void 0;
        saveLocalProperties(inMemoryProperties);
      }
      const slideIdx = inMemorySlides.findIndex((s) => s.propertyId === deleted.property_id);
      if (slideIdx !== -1) {
        inMemorySlides.splice(slideIdx, 1);
        saveLocalSlides(inMemorySlides);
      }
    }
    saveLocalInvoices(inMemoryInvoices);
    return res.json({ success: true, message: "Demande de boost supprim\xE9e." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.delete("/api/billing/admin/boost-requests/:id", handleDeleteBoostAction);
app.get("/api/billing/admin/vitrine-stats", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const boostInvoices = inMemoryInvoices.filter((i) => i.property_id || i.type === "boost");
    const now = Date.now();
    const stats = {
      totalRequests: boostInvoices.length,
      pending: boostInvoices.filter((i) => i.status === "pending" || i.status === "awaiting_validation" || i.status === "pending_validation").length,
      active: boostInvoices.filter((i) => (i.status === "paid" || i.status === "active") && (!i.expires_at || new Date(i.expires_at).getTime() > now)).length,
      rejected: boostInvoices.filter((i) => i.status === "failed" || i.status === "rejected").length,
      refunded: boostInvoices.filter((i) => i.status === "refunded").length,
      suspended: boostInvoices.filter((i) => i.status === "suspended").length,
      expired: boostInvoices.filter((i) => i.expires_at && new Date(i.expires_at).getTime() <= now).length,
      activeShowcaseSlides: inMemorySlides.filter((s) => s.isActive && s.propertyId).length
    };
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/admin/invoices", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  return res.json({
    success: true,
    count: inMemoryInvoices.length,
    data: { invoices: inMemoryInvoices },
    invoices: inMemoryInvoices
  });
});
app.get("/api/billing/advertisements", (req, res) => {
  try {
    const { placement, category } = req.query;
    let ads = inMemoryAds.filter((a) => a.is_active !== false);
    if (placement && placement !== "all") {
      ads = ads.filter((a) => a.placement === placement || placement === "in_feed" && (a.placement === "search_top" || a.placement === "home_hero"));
    }
    if (category && category !== "all") {
      ads = ads.filter((a) => a.category === category);
    }
    return res.json({ success: true, count: ads.length, advertisements: ads });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/ads/:placement", (req, res) => {
  try {
    const { placement } = req.params;
    const { category } = req.query;
    let ads = inMemoryAds.filter((a) => a.is_active !== false);
    if (placement && placement !== "all") {
      ads = ads.filter((a) => a.placement === placement || placement === "in_feed" && (a.placement === "search_top" || a.placement === "home_hero"));
    }
    if (category && category !== "all") {
      ads = ads.filter((a) => a.category === category);
    }
    const currentAd = ads[0] || inMemoryAds[0] || null;
    return res.json({ success: true, ad: currentAd, advertisements: ads });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var handleAdClick = (req, res) => {
  try {
    const id = req.params.id || req.params.campaignId;
    const ad = inMemoryAds.find((a) => a.id === id);
    if (ad) {
      ad.clicks_count = (ad.clicks_count || 0) + 1;
      saveLocalAds(inMemoryAds);
      return res.json({ success: true, clicks_count: ad.clicks_count, target_url: ad.target_url });
    }
    return res.json({ success: true, message: "Click tracked" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/billing/advertisements/:id/click", handleAdClick);
app.post("/api/ads/:campaignId/click", handleAdClick);
var handleAdImpression = (req, res) => {
  try {
    const id = req.params.id || req.params.campaignId;
    const ad = inMemoryAds.find((a) => a.id === id);
    if (ad) {
      ad.impressions_count = (ad.impressions_count || 0) + 1;
      saveLocalAds(inMemoryAds);
      return res.json({ success: true, impressions_count: ad.impressions_count });
    }
    return res.json({ success: true, message: "Impression tracked" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/billing/advertisements/:id/impression", handleAdImpression);
app.post("/api/ads/:campaignId/impression", handleAdImpression);
app.get("/api/billing/admin/advertisements", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  return res.json({ success: true, count: inMemoryAds.length, advertisements: inMemoryAds });
});
app.post("/api/billing/admin/advertisements", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const newAd = {
      id: req.body.id || `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: req.body.title || "Campagne Sponsor",
      advertiser_name: req.body.advertiser_name || "Annonceur",
      advertiser_contact: req.body.advertiser_contact || "",
      advertiser_email: req.body.advertiser_email || "",
      category: req.body.category || "real_estate",
      placement: req.body.placement || "home_hero",
      image_url: req.body.image_url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
      target_url: req.body.target_url || "",
      alt_text: req.body.alt_text || req.body.title,
      price_usd: Number(req.body.price_usd) || 150,
      start_date: req.body.start_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      end_date: req.body.end_date || new Date(Date.now() + 30 * 864e5).toISOString().split("T")[0],
      impressions_count: 0,
      clicks_count: 0,
      is_active: req.body.is_active !== false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryAds.unshift(newAd);
    saveLocalAds(inMemoryAds);
    return res.status(201).json({ success: true, advertisement: newAd });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/admin/advertisements/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const idx = inMemoryAds.findIndex((a) => a.id === id);
    if (idx !== -1) {
      inMemoryAds[idx] = { ...inMemoryAds[idx], ...req.body, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
      saveLocalAds(inMemoryAds);
      return res.json({ success: true, advertisement: inMemoryAds[idx] });
    }
    return res.status(404).json({ success: false, error: "Publicit\xE9 non trouv\xE9e" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/billing/admin/advertisements/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    inMemoryAds = inMemoryAds.filter((a) => a.id !== id);
    saveLocalAds(inMemoryAds);
    return res.json({ success: true, message: "Publicit\xE9 supprim\xE9e" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/billing/admin/monetization-stats", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const totalImpressions = inMemoryAds.reduce((acc, a) => acc + (a.impressions_count || 0), 0);
  const totalClicks = inMemoryAds.reduce((acc, a) => acc + (a.clicks_count || 0), 0);
  return res.json({
    success: true,
    data: {
      invoices: {
        total_invoices: inMemoryInvoices.length,
        paid_invoices: inMemoryInvoices.filter((i) => i.status === "paid").length,
        awaiting_validation_invoices: inMemoryInvoices.filter((i) => i.status === "awaiting_validation").length,
        pending_invoices: inMemoryInvoices.filter((i) => i.status === "pending").length,
        rejected_invoices: inMemoryInvoices.filter((i) => i.status === "rejected" || i.status === "failed").length,
        refunded_invoices: inMemoryInvoices.filter((i) => i.status === "refunded").length,
        total_revenue_usd: inMemoryInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount || 0), 0),
        total_revenue_cdf: inMemoryInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + Number(i.amount_cdf || 0), 0),
        boost_invoices: inMemoryInvoices.filter((i) => i.invoice_type === "boost").length,
        subscription_invoices: inMemoryInvoices.filter((i) => i.invoice_type === "subscription").length
      },
      activeBoosts: inMemoryInvoices.filter((i) => i.invoice_type === "boost" && i.status === "paid").length,
      ads: {
        active_campaigns: inMemoryAds.filter((a) => a.is_active !== false).length,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        avg_ctr_percent: totalImpressions > 0 ? parseFloat((totalClicks / totalImpressions * 100).toFixed(2)) : 4.5
      }
    }
  });
});
app.get("/api/showcase", (_req, res) => {
  const now = Date.now();
  const limit = getFeaturedSlotsLimitServer();
  const validSlides = inMemorySlides.filter((slide) => {
    if (!slide || slide.isActive === false || !slide.propertyId) return false;
    const prop = inMemoryProperties.find((p) => p.id === slide.propertyId);
    if (!prop) return false;
    if (!isPropertyPubliclyVisible(prop)) return false;
    return getActiveBoostDisplay(prop, now).isActive;
  }).slice(0, limit);
  return res.json({ success: true, count: validSlides.length, slides: validSlides, featured_slots_limit: limit });
});
app.get("/api/showcase/admin", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  return res.json({ success: true, count: inMemorySlides.length, slides: inMemorySlides });
});
var handleCreateShowcaseSlide = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const newSlide = {
      ...req.body,
      id: req.body.id || `slide_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isActive: req.body.isActive !== false
    };
    inMemorySlides.unshift(newSlide);
    saveLocalSlides(inMemorySlides);
    return res.status(201).json({ success: true, slide: newSlide });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/showcase", handleCreateShowcaseSlide);
app.post("/api/showcase/admin", handleCreateShowcaseSlide);
var handleUpdateShowcaseSlide = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const idx = inMemorySlides.findIndex((s) => s.id === id);
    if (idx !== -1) {
      inMemorySlides[idx] = { ...inMemorySlides[idx], ...req.body, id };
      saveLocalSlides(inMemorySlides);
      return res.json({ success: true, slide: inMemorySlides[idx] });
    }
    return res.status(404).json({ success: false, error: "Diapositive non trouv\xE9e" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.put("/api/showcase/:id", handleUpdateShowcaseSlide);
app.put("/api/showcase/admin/:id", handleUpdateShowcaseSlide);
var handleDeleteShowcaseSlide = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    inMemorySlides = inMemorySlides.filter((s) => s.id !== id);
    saveLocalSlides(inMemorySlides);
    return res.json({ success: true, message: "Diapositive supprim\xE9e" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.delete("/api/showcase/:id", handleDeleteShowcaseSlide);
app.delete("/api/showcase/admin/:id", handleDeleteShowcaseSlide);
var LOCAL_REPORTS_FILE = path2.join(__dirname, "property_user_reports.json");
var INITIAL_REPORTS = [
  {
    id: "rep_1",
    propertyId: "prop_mock_suspect_1",
    propertyTitle: "Villa Diplomatique Piscine Gombe",
    agentId: "agent_fake_1",
    reporterName: "Marc Kabamba",
    reporterContact: "+243 81 200 3040",
    reason: "fake_price",
    reasonLabel: "Prix anormalement bas / Trompeur",
    comment: "Cette villa avec piscine \xE0 Gombe est affich\xE9e \xE0 150$/mois. Le vendeur r\xE9clame un acompte pr\xE9alable par M-Pesa avant la visite.",
    createdAt: "2026-10-02T10:30:00.000Z",
    status: "pending"
  },
  {
    id: "rep_2",
    propertyId: "prop_mock_suspect_2",
    propertyTitle: "Appartement Moderne 3 Ch Limete",
    agentId: "agent_fake_2",
    reporterName: "Clarisse Tshala",
    reporterContact: "+243 99 876 5432",
    reason: "stolen_photos",
    reasonLabel: "Photos vol\xE9es ou non r\xE9elles",
    comment: "Photos copi\xE9es d'un projet h\xF4telier \xE9tranger.",
    createdAt: "2026-10-03T14:15:00.000Z",
    status: "pending"
  }
];
var inMemoryReports = (() => {
  try {
    if (fs2.existsSync(LOCAL_REPORTS_FILE)) {
      const raw = fs2.readFileSync(LOCAL_REPORTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
  }
  return [...INITIAL_REPORTS];
})();
function saveLocalReports(list) {
  try {
    fs2.writeFileSync(LOCAL_REPORTS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
  }
}
app.post("/api/fraud/analyze", (req, res) => {
  try {
    const property = req.body;
    const analysis = analyzePropertyForFraud(property, inMemoryProperties, inMemoryReports);
    return res.json({ success: true, analysis });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/fraud/audit", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const audit = auditPropertyList(inMemoryProperties, inMemoryReports);
    return res.json({
      success: true,
      stats: {
        total: audit.total,
        normalCount: audit.normalCount,
        reviewRequiredCount: audit.reviewRequiredCount,
        suspectCount: audit.suspectCount,
        reportsCount: inMemoryReports.length
      },
      flagged: audit.auditedProperties.filter((p) => p.fraudStatus !== "normal")
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/fraud/report", (req, res) => {
  try {
    const { propertyId, propertyTitle, agentId, reporterName, reporterContact, reason, reasonLabel, comment } = req.body;
    if (!propertyId || !reason) {
      return res.status(400).json({ success: false, message: "ID propri\xE9t\xE9 et motif requis." });
    }
    const newReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      propertyId,
      propertyTitle: propertyTitle || "Bien immobilier",
      agentId: agentId || null,
      reporterName: reporterName || "Anonyme",
      reporterContact: reporterContact || "",
      reason,
      reasonLabel: reasonLabel || reason,
      comment: comment || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending"
    };
    inMemoryReports.unshift(newReport);
    saveLocalReports(inMemoryReports);
    return res.status(201).json({ success: true, report: newReport });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/fraud/reports", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  return res.json({ success: true, count: inMemoryReports.length, reports: inMemoryReports });
});
app.put("/api/fraud/reports/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const { status } = req.body;
    const idx = inMemoryReports.findIndex((r) => r.id === id);
    if (idx !== -1) {
      inMemoryReports[idx].status = status || "resolved";
      saveLocalReports(inMemoryReports);
      return res.json({ success: true, report: inMemoryReports[idx] });
    }
    return res.status(404).json({ success: false, message: "Signalement introuvable." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
function parseCloudinaryUrl(urlStr) {
  try {
    const clean = urlStr.replace(/^CLOUDINARY_URL=/, "").trim();
    const match = clean.match(/cloudinary:\/\/([^:]+):([^@]+)@([^\/\s]+)/);
    if (match) {
      return {
        apiKey: match[1],
        apiSecret: match[2],
        cloudName: match[3]
      };
    }
  } catch {
  }
  return {};
}
function loadCloudinaryConfig() {
  let envCloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  let envApiKey = process.env.CLOUDINARY_API_KEY || "";
  let envApiSecret = process.env.CLOUDINARY_API_SECRET || "";
  let envPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "";
  if (process.env.CLOUDINARY_URL) {
    const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
    if (parsed.cloudName) envCloudName = parsed.cloudName;
    if (parsed.apiKey) envApiKey = parsed.apiKey;
    if (parsed.apiSecret) envApiSecret = parsed.apiSecret;
  }
  let fileConfig = {};
  try {
    if (fs2.existsSync(LOCAL_CLOUDINARY_FILE)) {
      fileConfig = JSON.parse(fs2.readFileSync(LOCAL_CLOUDINARY_FILE, "utf-8"));
    }
  } catch {
  }
  const cloudName = envCloudName || fileConfig.cloudName || "ljcl1c4t";
  const apiKey = envApiKey || fileConfig.apiKey || "";
  const apiSecret = envApiSecret || fileConfig.apiSecret || "";
  const uploadPreset = envPreset || fileConfig.uploadPreset || "kinimmo_videos";
  const isConfigured = Boolean(cloudName && apiSecret || cloudName && uploadPreset);
  const autoOptimize = fileConfig.autoOptimize !== false;
  return { cloudName, apiKey, apiSecret, uploadPreset, isConfigured, autoOptimize };
}
var serverCloudinaryConfig = loadCloudinaryConfig();
function applyCloudinarySettings(cfg) {
  if (cfg.cloudName) {
    cloudinary.config({
      cloud_name: cfg.cloudName,
      api_key: cfg.apiKey || void 0,
      api_secret: cfg.apiSecret || void 0,
      secure: true
    });
  }
}
applyCloudinarySettings(serverCloudinaryConfig);
var ALLOWED_VIDEO_MIMES = /* @__PURE__ */ new Set(["video/mp4", "video/webm", "video/quicktime", "video/x-m4v", "video/ogg"]);
var ALLOWED_VIDEO_EXTS = /* @__PURE__ */ new Set([".mp4", ".webm", ".mov", ".m4v", ".ogg"]);
var ALLOWED_IMAGE_MIMES = /* @__PURE__ */ new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"]);
var ALLOWED_IMAGE_EXTS = /* @__PURE__ */ new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
var videoMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path2.extname(String(file.originalname || "")).toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    if (ALLOWED_VIDEO_MIMES.has(mime) && ALLOWED_VIDEO_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Format vid\xE9o interdit ou non support\xE9 (MP4, WebM, MOV, M4V uniquement)."));
    }
  }
});
app.get("/api/cloudinary/config", (_req, res) => {
  serverCloudinaryConfig = loadCloudinaryConfig();
  applyCloudinarySettings(serverCloudinaryConfig);
  return res.json({
    success: true,
    config: {
      cloudName: serverCloudinaryConfig.cloudName,
      apiKey: serverCloudinaryConfig.apiKey,
      uploadPreset: serverCloudinaryConfig.uploadPreset,
      hasApiSecret: Boolean(serverCloudinaryConfig.apiSecret),
      isConfigured: serverCloudinaryConfig.isConfigured,
      autoOptimize: serverCloudinaryConfig.autoOptimize
    }
  });
});
app.post("/api/cloudinary/config", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    let { cloudName, apiKey, apiSecret, uploadPreset, autoOptimize, cloudinaryUrl } = req.body;
    if (cloudinaryUrl) {
      const parsed = parseCloudinaryUrl(String(cloudinaryUrl));
      if (parsed.cloudName) cloudName = parsed.cloudName;
      if (parsed.apiKey && !parsed.apiKey.includes("<your_")) apiKey = parsed.apiKey;
      if (parsed.apiSecret && !parsed.apiSecret.includes("<your_")) apiSecret = parsed.apiSecret;
    }
    if (!cloudName) {
      cloudName = serverCloudinaryConfig.cloudName || "ljcl1c4t";
    }
    serverCloudinaryConfig = {
      cloudName: String(cloudName).trim(),
      apiKey: apiKey ? String(apiKey).trim() : serverCloudinaryConfig.apiKey,
      apiSecret: apiSecret ? String(apiSecret).trim() : serverCloudinaryConfig.apiSecret,
      uploadPreset: uploadPreset ? String(uploadPreset).trim() : serverCloudinaryConfig.uploadPreset,
      isConfigured: Boolean(cloudName && (apiSecret || uploadPreset)),
      autoOptimize: autoOptimize !== false
    };
    fs2.writeFileSync(LOCAL_CLOUDINARY_FILE, JSON.stringify(serverCloudinaryConfig, null, 2), "utf-8");
    applyCloudinarySettings(serverCloudinaryConfig);
    return res.json({
      success: true,
      message: "Configuration Cloudinary enregistr\xE9e avec succ\xE8s.",
      config: {
        cloudName: serverCloudinaryConfig.cloudName,
        apiKey: serverCloudinaryConfig.apiKey,
        uploadPreset: serverCloudinaryConfig.uploadPreset,
        hasApiSecret: Boolean(serverCloudinaryConfig.apiSecret),
        isConfigured: serverCloudinaryConfig.isConfigured,
        autoOptimize: serverCloudinaryConfig.autoOptimize
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/cloudinary/test", async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    serverCloudinaryConfig = loadCloudinaryConfig();
    applyCloudinarySettings(serverCloudinaryConfig);
    if (!serverCloudinaryConfig.cloudName) {
      return res.status(400).json({ success: false, message: "Cloud Name non renseign\xE9." });
    }
    if (serverCloudinaryConfig.apiSecret && serverCloudinaryConfig.apiKey) {
      const pingRes = await cloudinary.api.ping();
      return res.json({
        success: true,
        message: `Connexion Cloudinary r\xE9ussie pour le cloud \xAB ${serverCloudinaryConfig.cloudName} \xBB ! Statut: ${pingRes.status || "OK"}`
      });
    }
    return res.json({
      success: true,
      message: `Cloud Name \xAB ${serverCloudinaryConfig.cloudName} \xBB et Preset \xAB ${serverCloudinaryConfig.uploadPreset} \xBB configur\xE9s.`
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Impossible de joindre Cloudinary : ${err?.message || "Identifiants invalides"}`
    });
  }
});
app.post("/api/cloudinary/upload", (req, res, next) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise pour t\xE9l\xE9verser une vid\xE9o." });
  videoMulter.single("video")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err?.message || "Fichier vid\xE9o refus\xE9." });
    }
    return next();
  });
}, async (req, res) => {
  try {
    serverCloudinaryConfig = loadCloudinaryConfig();
    applyCloudinarySettings(serverCloudinaryConfig);
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: "Aucun fichier vid\xE9o transmis." });
    }
    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.apiSecret && serverCloudinaryConfig.apiKey) {
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: "kinimmo/property_videos",
            transformation: [
              { quality: "auto:good", fetch_format: "auto" }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });
      const secureUrl = uploadResult.secure_url;
      if (uploadResult.duration && Number(uploadResult.duration) > MAX_VIDEO_DURATION_SECONDS) {
        if (uploadResult.public_id) {
          cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: "video", invalidate: true }).catch(() => {
          });
        }
        return res.status(400).json({
          success: false,
          error: `Vid\xE9o trop longue (${Math.round(Number(uploadResult.duration))}s). Maximum autoris\xE9 : 60 secondes.`
        });
      }
      const autoThumbnail = secureUrl ? secureUrl.replace(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i, ".jpg$2").replace("/video/upload/", "/video/upload/so_0,q_auto,f_jpg,w_800,c_fill/") : void 0;
      return res.json({
        success: true,
        url: uploadResult.url,
        secure_url: secureUrl,
        public_id: uploadResult.public_id,
        thumbnail_url: autoThumbnail,
        duration: uploadResult.duration,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height
      });
    }
    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.uploadPreset) {
      const endpoint = `https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/video/upload`;
      const formData = new FormData();
      const blob = new Blob([file.buffer], { type: file.mimetype });
      formData.append("file", blob, file.originalname);
      formData.append("upload_preset", serverCloudinaryConfig.uploadPreset);
      const fetchRes = await fetch(endpoint, {
        method: "POST",
        body: formData
      });
      const cloudData = await fetchRes.json();
      if (!fetchRes.ok) {
        throw new Error(cloudData.error?.message || "Erreur lors du t\xE9l\xE9versement vers Cloudinary");
      }
      const secureUrl = cloudData.secure_url;
      const autoThumbnail = secureUrl ? secureUrl.replace(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i, ".jpg$2").replace("/video/upload/", "/video/upload/so_0,q_auto,f_jpg,w_800,c_fill/") : void 0;
      return res.json({
        success: true,
        url: cloudData.url,
        secure_url: secureUrl,
        public_id: cloudData.public_id,
        thumbnail_url: autoThumbnail,
        duration: cloudData.duration,
        format: cloudData.format,
        bytes: cloudData.bytes,
        width: cloudData.width,
        height: cloudData.height
      });
    }
    return res.status(400).json({
      success: false,
      error: "Votre compte Cloudinary n'est pas encore configur\xE9. Cliquez sur \xAB Configurer Cloudinary \xBB pour renseigner votre Cloud Name et vos cl\xE9s API (ou votre Upload Preset)."
    });
  } catch (err) {
    console.error("Erreur t\xE9l\xE9versement Cloudinary:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Erreur interne lors du t\xE9l\xE9versement vers Cloudinary."
    });
  }
});
var imageMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path2.extname(String(file.originalname || "")).toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    if (ALLOWED_IMAGE_MIMES.has(mime) && ALLOWED_IMAGE_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Format image interdit ou non support\xE9 (JPG, PNG, WebP, GIF, AVIF uniquement)."));
    }
  }
});
app.post("/api/cloudinary/sign", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  serverCloudinaryConfig = loadCloudinaryConfig();
  if (!serverCloudinaryConfig.cloudName) {
    return res.status(400).json({ success: false, error: "Cloudinary Cloud Name non configur\xE9." });
  }
  const resourceType = req.body?.resourceType === "video" ? "video" : "image";
  const defaultFolder = resourceType === "video" ? "kinimmo/property_videos" : "kinimmo/property_images";
  const folder = typeof req.body?.folder === "string" && req.body.folder.trim() ? req.body.folder.trim() : defaultFolder;
  const purpose = req.body?.purpose || (folder.includes("floor_plan") ? "floor_plan" : resourceType === "video" ? "property_video" : "property_photo");
  const quotas = getUserMediaQuotasServer(user.id);
  const check = validateMediaUploadServer({
    purpose,
    resourceType,
    mimeType: req.body?.mimeType,
    fileSize: req.body?.fileSize,
    fileCount: req.body?.fileCount,
    currentPhotoCount: req.body?.currentPhotoCount,
    duration: req.body?.duration,
    maxPlanPhotos: quotas.maxPlanPhotos,
    maxPlanVideos: quotas.maxPlanVideos,
    usedVideos: quotas.usedVideos,
    isAdmin: user.role === "admin"
  });
  if (!check.valid) {
    return res.status(check.status || 400).json({ success: false, error: check.message, message: check.message });
  }
  const timestamp = Math.floor(Date.now() / 1e3);
  if (serverCloudinaryConfig.apiKey && serverCloudinaryConfig.apiSecret) {
    const signature = crypto2.createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${serverCloudinaryConfig.apiSecret}`).digest("hex");
    return res.json({
      success: true,
      mode: "signed",
      cloudName: serverCloudinaryConfig.cloudName,
      apiKey: serverCloudinaryConfig.apiKey,
      timestamp,
      signature,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/${resourceType}/upload`
    });
  }
  if (serverCloudinaryConfig.uploadPreset) {
    return res.json({
      success: true,
      mode: "unsigned",
      cloudName: serverCloudinaryConfig.cloudName,
      uploadPreset: serverCloudinaryConfig.uploadPreset,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/${resourceType}/upload`
    });
  }
  return res.status(400).json({ success: false, error: "Identifiants Cloudinary incomplets." });
});
app.post("/api/cloudinary/destroy", async (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const { publicId, url, resourceType, propertyId } = req.body || {};
  if (propertyId && user.role !== "admin") {
    const prop = inMemoryProperties.find((p) => p.id === propertyId);
    if (prop && !canManageProperty(user, prop)) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit pour supprimer ce m\xE9dia." });
    }
  }
  const result = await destroyFromCloudinaryServer({ publicId, url, resourceType });
  return res.json({ success: Boolean(result.success || result.skipped), ...result });
});
app.post("/api/media/check-fingerprint", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const fingerprints = Array.isArray(req.body?.fingerprints) ? req.body.fingerprints : [];
  const imageUrls = Array.isArray(req.body?.imageUrls) ? req.body.imageUrls : [];
  const excludePropertyId = req.body?.excludePropertyId ? String(req.body.excludePropertyId) : null;
  const matches = findDuplicateFingerprintsInMemory(fingerprints, imageUrls, excludePropertyId);
  return res.json({
    success: true,
    duplicateDetected: matches.length > 0,
    matches
  });
});
app.post("/api/cloudinary/upload-image", (req, res, next) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise pour t\xE9l\xE9verser une photo." });
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (contentType.includes("multipart/form-data")) {
    return imageMulter.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, error: err?.message || "Fichier image refus\xE9." });
      }
      return next();
    });
  }
  return next();
}, async (req, res) => {
  try {
    const user = getAuthUser(req);
    serverCloudinaryConfig = loadCloudinaryConfig();
    applyCloudinarySettings(serverCloudinaryConfig);
    const file = req.file;
    const dataUrl = req.body?.image || req.body?.fileData || req.body?.dataUrl;
    if (!file && !dataUrl) {
      return res.status(400).json({ success: false, error: "Aucune photo transmise." });
    }
    const quotas = getUserMediaQuotasServer(user.id);
    const check = validateMediaUploadServer({
      purpose: req.body?.purpose || "property_photo",
      resourceType: "image",
      mimeType: file?.mimetype || req.body?.mimeType,
      fileSize: file?.size || req.body?.fileSize,
      fileCount: req.body?.fileCount || 1,
      currentPhotoCount: req.body?.currentPhotoCount || 0,
      maxPlanPhotos: quotas.maxPlanPhotos,
      isAdmin: user.role === "admin"
    });
    if (!check.valid) {
      return res.status(check.status || 400).json({ success: false, error: check.message, message: check.message });
    }
    const targetFolder = typeof req.body?.folder === "string" && req.body.folder.trim() ? req.body.folder.trim() : "kinimmo/property_images";
    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.apiSecret && serverCloudinaryConfig.apiKey) {
      let uploadResult;
      if (file) {
        uploadResult = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              resource_type: "image",
              folder: targetFolder,
              transformation: [{ quality: "auto:good", fetch_format: "auto" }]
            },
            (err, result) => err ? reject(err) : resolve(result)
          );
          stream.end(file.buffer);
        });
      } else {
        uploadResult = await cloudinary.uploader.upload(String(dataUrl), {
          resource_type: "image",
          folder: targetFolder,
          transformation: [{ quality: "auto:good", fetch_format: "auto" }]
        });
      }
      return res.json({
        success: true,
        url: uploadResult.url,
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
        thumbnail_url: uploadResult.secure_url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        width: uploadResult.width,
        height: uploadResult.height
      });
    }
    if (serverCloudinaryConfig.cloudName && serverCloudinaryConfig.uploadPreset) {
      const endpoint = `https://api.cloudinary.com/v1_1/${serverCloudinaryConfig.cloudName}/image/upload`;
      const formData = new FormData();
      if (file) {
        formData.append("file", new Blob([file.buffer], { type: file.mimetype }), file.originalname);
      } else {
        formData.append("file", String(dataUrl));
      }
      formData.append("upload_preset", serverCloudinaryConfig.uploadPreset);
      formData.append("folder", "kinimmo/property_images");
      const fetchRes = await fetch(endpoint, { method: "POST", body: formData });
      const cloudData = await fetchRes.json();
      if (!fetchRes.ok) {
        throw new Error(cloudData?.error?.message || "Erreur Cloudinary");
      }
      return res.json({
        success: true,
        url: cloudData.url,
        secure_url: cloudData.secure_url,
        public_id: cloudData.public_id,
        thumbnail_url: cloudData.secure_url,
        format: cloudData.format,
        bytes: cloudData.bytes,
        width: cloudData.width,
        height: cloudData.height
      });
    }
    return res.status(400).json({
      success: false,
      error: "Cloudinary n'est pas configur\xE9."
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Erreur lors du t\xE9l\xE9versement photo vers Cloudinary."
    });
  }
});
var inMemoryVideos = (() => {
  try {
    if (fs2.existsSync(LOCAL_VIDEOS_FILE)) {
      const raw = fs2.readFileSync(LOCAL_VIDEOS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
  }
  return [];
})();
function saveLocalVideos(list) {
  try {
    fs2.writeFileSync(LOCAL_VIDEOS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
  }
}
app.get("/api/videos", (req, res) => {
  try {
    const { commune, type, page = "1", limit = "20" } = req.query;
    let approvedVideos = inMemoryVideos.filter((v) => v.status === "approved");
    if (commune && commune !== "all") {
      const qCom = String(commune).toLowerCase();
      approvedVideos = approvedVideos.filter((v) => (v.propertyCommune || "").toLowerCase().includes(qCom));
    }
    if (type && type !== "all") {
      approvedVideos = approvedVideos.filter((v) => v.propertyType === type || v.propertyStatus === type);
    }
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(String(limit), 10) || 20));
    const total = approvedVideos.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedVideos = approvedVideos.slice(startIndex, startIndex + limitNum);
    return res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      count: paginatedVideos.length,
      data: {
        videos: paginatedVideos
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/videos/my", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentification requise." });
    }
    const userVideos = authUser.role === "admin" ? [...inMemoryVideos] : inMemoryVideos.filter((v) => v.userId === authUser.id);
    return res.json({
      success: true,
      count: userVideos.length,
      data: { videos: userVideos }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var inMemoryVideoReports = (() => {
  try {
    if (fs2.existsSync(LOCAL_VIDEO_REPORTS_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_VIDEO_REPORTS_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
  }
  return [];
})();
function saveLocalVideoReports(list) {
  try {
    fs2.writeFileSync(LOCAL_VIDEO_REPORTS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
  }
}
app.get("/api/videos/admin/reports", (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (authUser.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  return res.json({ success: true, count: inMemoryVideoReports.length, data: { reports: inMemoryVideoReports }, reports: inMemoryVideoReports });
});
app.patch("/api/videos/admin/reports/:id", (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (authUser.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const { id } = req.params;
  const idx = inMemoryVideoReports.findIndex((r) => r.id === id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Signalement introuvable." });
  inMemoryVideoReports[idx] = { ...inMemoryVideoReports[idx], ...req.body, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  saveLocalVideoReports(inMemoryVideoReports);
  return res.json({ success: true, data: { report: inMemoryVideoReports[idx] } });
});
app.get("/api/videos/admin/all", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (authUser.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { status, search } = req.query;
    let list = [...inMemoryVideos];
    if (status && status !== "all") {
      list = list.filter((v) => v.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (v) => (v.propertyTitle || "").toLowerCase().includes(q) || (v.agentName || "").toLowerCase().includes(q) || (v.propertyCommune || "").toLowerCase().includes(q)
      );
    }
    return res.json({
      success: true,
      count: list.length,
      data: { videos: list }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.patch("/api/videos/admin/:id/status", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (authUser.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    const validStatuses = ["approved", "rejected", "pending", "hidden", "draft"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Statut de mod\xE9ration invalide." });
    }
    const idx = inMemoryVideos.findIndex((v) => v.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Vid\xE9o introuvable." });
    }
    inMemoryVideos[idx].status = status;
    if (rejectionReason) {
      inMemoryVideos[idx].rejectionReason = rejectionReason;
    }
    inMemoryVideos[idx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveLocalVideos(inMemoryVideos);
    return res.json({
      success: true,
      message: status === "approved" ? "Vid\xE9o approuv\xE9e et visible dans le fil public." : "Statut mis \xE0 jour.",
      data: { video: inMemoryVideos[idx] }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/videos/:id", (req, res) => {
  try {
    const { id } = req.params;
    const video = inMemoryVideos.find((v) => v.id === id);
    if (!video) {
      return res.status(404).json({ success: false, error: "Vid\xE9o introuvable." });
    }
    if (video.status !== "approved") {
      const authUser = getAuthUser(req);
      if (!authUser || authUser.role !== "admin" && video.userId !== authUser.id) {
        return res.status(403).json({ success: false, error: "Vid\xE9o non encore approuv\xE9e." });
      }
    }
    return res.json({ success: true, data: { video } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/videos", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ success: false, error: "Authentification requise pour publier une vid\xE9o." });
    }
    const { propertyId, videoUrl, thumbnailUrl, description, duration, status = "pending" } = req.body;
    if (status !== "draft") {
      const storedUser = inMemoryUsers.find((u) => u.id === authUser.id) || null;
      const pubCheck = canUserPublishListings(storedUser);
      if (!pubCheck.allowed) {
        return res.status(403).json({ success: false, code: "EMAIL_VERIFICATION_REQUIRED", error: pubCheck.reason });
      }
    }
    if (!propertyId || !videoUrl) {
      return res.status(400).json({ success: false, error: "L'ID de l'annonce et l'URL de la vid\xE9o sont obligatoires." });
    }
    if (duration !== void 0 && duration !== null && Number(duration) > MAX_VIDEO_DURATION_SECONDS) {
      return res.status(400).json({ success: false, error: `Vid\xE9o trop longue (${Math.round(Number(duration))}s). Maximum autoris\xE9 : 60 secondes.` });
    }
    const linkedProp = inMemoryProperties.find((p) => p.id === propertyId);
    if (linkedProp && !canManageProperty(authUser, linkedProp)) {
      return res.status(403).json({ success: false, error: "Vous ne pouvez associer une vid\xE9o qu'\xE0 vos propres annonces." });
    }
    const newVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      propertyId,
      userId: authUser.id,
      videoUrl,
      thumbnailUrl: thumbnailUrl || linkedProp?.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
      description: description || "",
      status: status === "draft" ? "draft" : authUser.role === "admin" && status === "approved" ? "approved" : "pending",
      viewsCount: 0,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      // Données de l'annonce immobilière
      propertyTitle: linkedProp?.title || "Bien Immobilier Kinshasa",
      propertyPrice: linkedProp?.price || 0,
      propertyCurrency: linkedProp?.currency || "USD",
      propertyCommune: linkedProp?.commune || "Kinshasa",
      propertyQuartier: linkedProp?.quartier || "",
      propertyType: linkedProp?.type || "villa",
      propertyStatus: linkedProp?.status || "for-sale",
      propertyBedrooms: linkedProp?.bedrooms,
      propertyBathrooms: linkedProp?.bathrooms,
      agentName: linkedProp?.agencyName || authUser.agencyName || authUser.name || "Agent Immobilier Kinimmo",
      agencyName: linkedProp?.agencyName || authUser.agencyName,
      agentPhone: linkedProp?.contactPhone || authUser.phone,
      agentWhatsapp: linkedProp?.contactPhone || authUser.whatsapp || authUser.phone,
      agentVerified: Boolean(authUser.isVerified)
    };
    inMemoryVideos.unshift(newVideo);
    saveLocalVideos(inMemoryVideos);
    return res.status(201).json({
      success: true,
      message: newVideo.status === "draft" ? "Brouillon de vid\xE9o enregistr\xE9 avec succ\xE8s." : "Vid\xE9o soumise avec succ\xE8s pour mod\xE9ration.",
      data: { video: newVideo }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/videos/:id", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ success: false, error: "Authentification requise." });
    const { id } = req.params;
    const idx = inMemoryVideos.findIndex((v) => v.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Vid\xE9o introuvable." });
    }
    if (authUser.role !== "admin" && inMemoryVideos[idx].userId !== authUser.id) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit : vous ne pouvez modifier que vos propres vid\xE9os." });
    }
    const { status: reqStatus, ...safeBody } = req.body || {};
    const nextStatus = authUser.role === "admin" && reqStatus ? reqStatus : reqStatus === "draft" || reqStatus === "pending" ? reqStatus : inMemoryVideos[idx].status;
    if (nextStatus !== "draft") {
      const storedUser = inMemoryUsers.find((u) => u.id === authUser.id) || null;
      const pubCheck = canUserPublishListings(storedUser);
      if (!pubCheck.allowed) {
        return res.status(403).json({ success: false, code: "EMAIL_VERIFICATION_REQUIRED", error: pubCheck.reason });
      }
    }
    inMemoryVideos[idx] = {
      ...inMemoryVideos[idx],
      ...safeBody,
      id,
      userId: inMemoryVideos[idx].userId,
      status: nextStatus,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveLocalVideos(inMemoryVideos);
    return res.json({ success: true, message: "Vid\xE9o mise \xE0 jour avec succ\xE8s.", data: { video: inMemoryVideos[idx] } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/videos/:id", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) return res.status(401).json({ success: false, error: "Authentification requise." });
    const { id } = req.params;
    const target = inMemoryVideos.find((v) => v.id === id);
    if (!target) {
      return res.status(404).json({ success: false, error: "Vid\xE9o introuvable." });
    }
    if (authUser.role !== "admin" && target.userId !== authUser.id) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit : vous ne pouvez supprimer que vos propres vid\xE9os." });
    }
    inMemoryVideos = inMemoryVideos.filter((v) => v.id !== id);
    saveLocalVideos(inMemoryVideos);
    if (target.videoUrl && String(target.videoUrl).includes("cloudinary.com")) {
      destroyFromCloudinaryServer({ url: target.videoUrl, resourceType: "video" }).catch(() => {
      });
    }
    return res.json({ success: true, message: "Vid\xE9o supprim\xE9e avec succ\xE8s." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/videos/:id/view", (req, res) => {
  try {
    const { id } = req.params;
    const video = inMemoryVideos.find((v) => v.id === id);
    if (video) {
      video.viewsCount = (video.viewsCount || 0) + 1;
      saveLocalVideos(inMemoryVideos);
    }
    return res.json({ success: true, viewsCount: video?.viewsCount || 1 });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var handleVideoOrListingReport = (req, res) => {
  try {
    const id = req.params.id || req.body?.videoId || req.body?.propertyId;
    const { reason, details, comment, reporterName, reporterContact, propertyId } = req.body || {};
    if (!reason || String(reason).trim().length < 2) {
      return res.status(400).json({ success: false, error: "Le motif du signalement est requis." });
    }
    const video = inMemoryVideos.find((v) => v.id === id || propertyId && v.propertyId === propertyId);
    const prop = propertyId ? inMemoryProperties.find((p) => p.id === propertyId) : null;
    const report = {
      id: `vrep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      videoId: video?.id || id || null,
      propertyId: propertyId || video?.propertyId || null,
      propertyTitle: prop?.title || video?.propertyTitle || "Visite vid\xE9o",
      reason: String(reason).trim(),
      details: String(details || comment || "").trim(),
      reporterName: String(reporterName || "Utilisateur").trim(),
      reporterContact: String(reporterContact || "").trim(),
      status: "pending",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryVideoReports.unshift(report);
    saveLocalVideoReports(inMemoryVideoReports);
    return res.status(201).json({ success: true, message: "Signalement vid\xE9o enregistr\xE9.", data: { report } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/videos/:id/report", handleVideoOrListingReport);
app.post("/api/videos/reports", handleVideoOrListingReport);
app.post("/api/videos/:id/visit-request", (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, clientPhone, clientEmail, preferredDate, preferredTimeSlot, notes } = req.body;
    if (!clientName || !clientPhone) {
      return res.status(400).json({ success: false, error: "Le nom et le num\xE9ro de t\xE9l\xE9phone sont requis." });
    }
    const video = inMemoryVideos.find((v) => v.id === id);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const visitRecord = {
      id: `vis_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      request_id: `lead_vid_${Date.now()}`,
      property_id: video?.propertyId || null,
      agent_id: video?.userId || null,
      visit_date: preferredDate || nowIso.split("T")[0],
      visit_time: preferredTimeSlot || "10:00",
      status: "scheduled",
      notes: notes ? `${notes} (T\xE9l: ${clientPhone}, Email: ${clientEmail || "N/A"})` : `Visite demand\xE9e via vid\xE9o par ${clientName} (${clientPhone})`,
      created_at: nowIso,
      updated_at: nowIso,
      property_title: video?.propertyTitle || "Visite Vid\xE9o Kinimmo",
      agent_name: video?.agentName || null,
      client_name: clientName
    };
    inMemoryVisits.unshift(visitRecord);
    saveLocalVisits(inMemoryVisits);
    return res.status(201).json({
      success: true,
      message: "Demande de visite planifi\xE9e et transmise avec succ\xE8s \xE0 l'agent.",
      visit: visitRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var canManageProperty = (user, prop) => {
  if (!user || !prop) return false;
  if (user.role === "admin") return true;
  if (prop.agentId && prop.agentId === user.id) return true;
  if (prop.userId && prop.userId === user.id) return true;
  if (user.agencyId && prop.agencyId && prop.agencyId === user.agencyId) return true;
  if (user.role === "agency" && prop.agencyId === user.id) return true;
  if (user.email && prop.contactEmail && prop.contactEmail.toLowerCase() === user.email.toLowerCase()) return true;
  return false;
};
app.get("/api/properties", (req, res) => {
  try {
    const authUser = getAuthUser(req);
    const { commune, type, status, listingStatus, search, limit = "100", offset = "0", include_unpublished } = req.query;
    let list = [...inMemoryProperties];
    const allowUnpublished = include_unpublished === "true" && authUser;
    list = list.filter((p) => {
      const ls = String(p.listingStatus || "").toUpperCase();
      const hiddenOrSuspended = p.published === false || p.softHiddenByPlan === true || p.fraudStatus === "suspect" || p.isSuspended === true || p.suspended === true || ls === "DRAFT" || ls === "ARCHIVED" || ls === "PENDING_REVIEW" || ls === "SUSPENDED" || ls === "HIDDEN";
      if (!hiddenOrSuspended) return true;
      if (allowUnpublished && canManageProperty(authUser, p)) return true;
      if (authUser?.role === "admin" && include_unpublished === "true") return true;
      return false;
    });
    if (listingStatus && listingStatus !== "all") {
      list = list.filter((p) => (p.listingStatus || "").toUpperCase() === String(listingStatus).toUpperCase());
    } else if (status && status !== "all") {
      list = list.filter((p) => p.status === status);
    }
    if (commune && commune !== "all") {
      list = list.filter((p) => (p.commune || "").toLowerCase() === String(commune).toLowerCase());
    }
    if (type && type !== "all") {
      list = list.filter((p) => p.type === type);
    }
    if (search && String(search).trim()) {
      const q = String(search).toLowerCase().trim();
      list = list.filter(
        (p) => (p.title || "").toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q) || (p.commune || "").toLowerCase().includes(q) || (p.quartier || "").toLowerCase().includes(q) || (p.address || "").toLowerCase().includes(q)
      );
    }
    const total = list.length;
    const paginated = list.slice(Number(offset), Number(offset) + Number(limit)).map((p) => sanitizePropertyForViewer(p, authUser));
    return res.json({ success: true, count: total, properties: paginated, data: paginated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path2.join(__dirname, "uploads", "videos");
    if (!fs2.existsSync(dir)) {
      try {
        fs2.mkdirSync(dir, { recursive: true });
      } catch {
      }
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const rawExt = path2.extname(String(file.originalname || "")).toLowerCase();
    const safeExt = ALLOWED_VIDEO_EXTS.has(rawExt) ? rawExt : ".mp4";
    cb(null, `video_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${safeExt}`);
  }
});
var videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path2.extname(String(file.originalname || "")).toLowerCase();
    const mime = String(file.mimetype || "").toLowerCase();
    if (ALLOWED_VIDEO_MIMES.has(mime) && ALLOWED_VIDEO_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Format de fichier interdit. Seules les vid\xE9os MP4, WebM, MOV et M4V sont autoris\xE9es."));
    }
  }
});
app.post("/api/properties/upload-video", (req, res, next) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, message: "Authentification requise pour t\xE9l\xE9verser une vid\xE9o." });
  }
  const storedUser = inMemoryUsers.find((u) => u.id === user.id) || null;
  const pubCheck = canUserPublishListings(storedUser);
  if (!pubCheck.allowed) {
    return res.status(403).json({ success: false, code: "EMAIL_VERIFICATION_REQUIRED", message: pubCheck.reason });
  }
  return videoUpload.single("video")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err?.message || "Fichier vid\xE9o refus\xE9." });
    }
    return next();
  });
}, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Aucun fichier vid\xE9o re\xE7u." });
  }
  return res.json({
    success: true,
    message: "Vid\xE9o t\xE9l\xE9vers\xE9e avec succ\xE8s.",
    url: `/uploads/videos/${req.file.filename}`,
    filename: req.file.filename,
    size: req.file.size
  });
});
app.get("/api/properties/:id", (req, res) => {
  const prop = inMemoryProperties.find((p) => p.id === req.params.id);
  if (!prop) {
    return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
  }
  const authUser = getAuthUser(req);
  const ls = String(prop.listingStatus || "").toUpperCase();
  const isPublic = prop.published !== false && prop.softHiddenByPlan !== true && prop.fraudStatus !== "suspect" && prop.isSuspended !== true && prop.suspended !== true && ls !== "DRAFT" && ls !== "ARCHIVED" && ls !== "PENDING_REVIEW" && ls !== "SUSPENDED" && ls !== "HIDDEN";
  if (!isPublic) {
    if (!authUser || !canManageProperty(authUser, prop)) {
      return res.status(403).json({ success: false, error: "Cette annonce n'est pas publique." });
    }
  }
  return res.json({ success: true, property: sanitizePropertyForViewer(prop, authUser) });
});
app.post("/api/properties", async (req, res) => {
  try {
    const user = getAuthUser(req);
    const body = req.body || {};
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "R\xE8gle m\xE9tier Kinimmo : Vous devez \xEAtre connect\xE9 pour publier une annonce."
      });
    }
    const storedUser = inMemoryUsers.find((u) => u.id === user.id) || null;
    const pubCheck = canUserPublishListings(storedUser);
    if (!pubCheck.allowed) {
      return res.status(403).json({
        success: false,
        code: "EMAIL_VERIFICATION_REQUIRED",
        error: pubCheck.reason
      });
    }
    const id = user.role === "admin" && body.id ? body.id : `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const listingStatus = String(body.listingStatus || (body.published === false ? "DRAFT" : "PUBLISHED")).toUpperCase();
    const isDraft = listingStatus === "DRAFT" || listingStatus === "ARCHIVED";
    const isAvailable = listingStatus === "PUBLISHED";
    const cleanTitle = String(body.title || "").trim();
    if (!cleanTitle || !isDraft && cleanTitle.length < 3) {
      return res.status(400).json({
        success: false,
        error: "Le titre de l'annonce est obligatoire (au moins 3 caract\xE8res)."
      });
    }
    const resolvedTransactionStatus = listingStatus === "SOLD" ? "sold" : body.status || "for-sale";
    const pricingCheck = validateAndNormalizePropertyPricing({
      status: resolvedTransactionStatus,
      listingStatus,
      price: body.price,
      currency: body.currency,
      period: body.period,
      isNegotiable: body.isNegotiable,
      guaranteeMonths: body.guaranteeMonths,
      advanceMonths: body.advanceMonths,
      requirePositivePrice: !isDraft && listingStatus === "PUBLISHED"
    });
    if (!pricingCheck.valid) {
      return res.status(400).json({
        success: false,
        error: pricingCheck.error
      });
    }
    const {
      trust_status: _ts,
      trust_score: _tsc,
      trust_verified_at: _tva,
      featured: _f,
      isPremium: _ip,
      isUrgent: _iu,
      isSponsored: _is,
      boostExpiresAt: _be,
      boostStartedAt: _bs,
      boostLabel: _bl,
      boostType: _bt,
      isVerified: _iv,
      verified: _v,
      ...restBody
    } = body;
    const safeBody = user.role === "admin" ? body : restBody;
    const rawImages = Array.isArray(safeBody.images) ? safeBody.images.filter(Boolean) : [];
    if (!isDraft && listingStatus === "PUBLISHED" && rawImages.length < MIN_PROPERTY_PHOTOS) {
      return res.status(400).json({
        success: false,
        error: `Au moins ${MIN_PROPERTY_PHOTOS} photos sont requises pour publier une annonce publiquement (actuellement ${rawImages.length}). Enregistrez en brouillon pour continuer plus tard.`
      });
    }
    const quotas = getUserMediaQuotasServer(user.id);
    const effectiveMaxPhotos = user.role === "admin" ? MAX_PROPERTY_PHOTOS : Math.min(MAX_PROPERTY_PHOTOS, Math.max(MIN_PROPERTY_PHOTOS, quotas.maxPlanPhotos || MAX_PROPERTY_PHOTOS));
    if (rawImages.length > effectiveMaxPhotos) {
      return res.status(400).json({
        success: false,
        error: `Nombre maximum de photos d\xE9pass\xE9 (${rawImages.length}/${effectiveMaxPhotos} max).`
      });
    }
    const tourCheck = validateVirtualTourDomainServer(safeBody.virtualTourUrl, inMemorySettings.virtual_tour_allowed_domains);
    if (!tourCheck.valid) {
      return res.status(400).json({ success: false, error: tourCheck.message });
    }
    if (safeBody.videoDuration !== void 0 && Number(safeBody.videoDuration) > MAX_VIDEO_DURATION_SECONDS) {
      return res.status(400).json({ success: false, error: `La vid\xE9o ne peut pas d\xE9passer ${MAX_VIDEO_DURATION_SECONDS} secondes.` });
    }
    const persistedImages = (await Promise.all(rawImages.map((img, idx) => saveBase64PropertyImage(img, id, idx)))).filter(Boolean);
    const persistedFloorPlan = safeBody.floorPlanUrl ? await saveBase64PropertyImage(safeBody.floorPlanUrl, `${id}_plan`, 0) : void 0;
    const fingerprints = Array.isArray(safeBody.imageFingerprints) ? safeBody.imageFingerprints : Array.isArray(safeBody.imagesMeta) ? safeBody.imagesMeta.map((m) => m?.fingerprint).filter(Boolean) : [];
    const dupMatches = findDuplicateFingerprintsInMemory(fingerprints, persistedImages, null);
    let fraudStatus = user.role === "admin" ? safeBody.fraudStatus || "normal" : "normal";
    const fraudFlags = Array.isArray(safeBody.fraudFlags) ? [...safeBody.fraudFlags] : [];
    if (dupMatches.length > 0) {
      if (fraudStatus === "normal") fraudStatus = "review_required";
      if (!fraudFlags.some((f) => f.code === "DUPLICATE_PHOTOS")) {
        fraudFlags.push({
          code: "DUPLICATE_PHOTOS",
          label: "Empreinte photo d\xE9j\xE0 utilis\xE9e sur une autre annonce",
          severity: "high",
          details: dupMatches.map((m) => `${m.propertyTitle} (${m.propertyId})`).join(", ")
        });
      }
    }
    const newProp = normalizePropertyRecord({
      ...safeBody,
      title: cleanTitle,
      price: pricingCheck.data.price,
      currency: pricingCheck.data.currency,
      period: pricingCheck.data.period,
      isNegotiable: pricingCheck.data.isNegotiable,
      guaranteeMonths: pricingCheck.data.guaranteeMonths,
      advanceMonths: pricingCheck.data.advanceMonths,
      images: persistedImages,
      ...persistedFloorPlan ? { floorPlanUrl: persistedFloorPlan } : {},
      virtualTourUrl: tourCheck.normalizedUrl,
      imageFingerprints: fingerprints,
      fraudStatus,
      fraudFlags,
      id,
      userId: user.id,
      agentId: user.role === "admin" && body.agentId ? body.agentId : user.id,
      agencyId: user.role === "admin" ? body.agencyId || user.agencyId : user.role === "agency" ? user.agencyId || user.id : user.agencyId,
      agencyName: user.role === "admin" ? body.agencyName || user.agencyName : user.agencyName || body.agencyName,
      contactEmail: body.contactEmail || storedUser?.email || user.email,
      contactPhone: body.contactPhone || storedUser?.phone || user.phone,
      contactWhatsapp: body.contactWhatsapp || storedUser?.whatsapp || body.contactPhone || storedUser?.phone || user.phone,
      agentName: body.agentName || storedUser?.name || user.name,
      agentPhone: body.agentPhone || storedUser?.phone || user.phone || body.contactPhone,
      agentWhatsapp: body.agentWhatsapp || storedUser?.whatsapp || storedUser?.phone || user.phone || body.contactPhone,
      agentEmail: body.agentEmail || storedUser?.email || user.email || body.contactEmail,
      agentAvatar: body.agentAvatar || storedUser?.avatar || user.avatar,
      listingStatus,
      isAvailable,
      published: !isDraft && body.published !== false && fraudStatus !== "suspect",
      ...user.role !== "admin" ? { featured: false, isPremium: false, isUrgent: false, isSponsored: false, isVerified: false, verified: false } : {},
      status: resolvedTransactionStatus,
      createdAt: body.createdAt || nowIso,
      updatedAt: nowIso,
      statusHistory: [
        {
          id: `hist_${Date.now()}`,
          fromStatus: "NONE",
          toStatus: listingStatus,
          changedByUserId: user.id,
          changedByName: user.name || "Agent Kinimmo",
          changedAt: nowIso,
          note: isDraft ? "Enregistrement en brouillon" : "Cr\xE9ation initiale de l'annonce"
        }
      ]
    });
    if (newProp.videoUrl) {
      newProp.videoModerationStatus = ensurePendingVideoModerationInMemory({ prop: newProp, user, videoUrl: newProp.videoUrl });
    }
    inMemoryProperties.unshift(newProp);
    saveLocalProperties(inMemoryProperties);
    return res.status(201).json({
      success: true,
      message: isDraft ? "Brouillon enregistr\xE9 avec succ\xE8s." : "Annonce cr\xE9\xE9e avec succ\xE8s.",
      duplicateMatches: dupMatches,
      property: newProp
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/properties/:id", async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Authentification requise pour modifier une annonce." });
    }
    const { id } = req.params;
    const idx = inMemoryProperties.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
    }
    const current = inMemoryProperties[idx];
    if (!canManageProperty(user, current)) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit : vous ne pouvez modifier que vos propres annonces." });
    }
    const incoming = req.body || {};
    const {
      trust_status: _ts,
      trust_score: _tsc,
      trust_verified_at: _tva,
      trust_expires_at: _tea,
      ...safeIncoming
    } = incoming;
    const oldStatus = current.listingStatus || (current.status === "sold" ? "SOLD" : "PUBLISHED");
    const newStatus = safeIncoming.listingStatus ? String(safeIncoming.listingStatus).toUpperCase() : oldStatus;
    const isDraft = newStatus === "DRAFT" || newStatus === "ARCHIVED";
    if (!isDraft && newStatus === "PUBLISHED") {
      const storedUser = inMemoryUsers.find((u) => u.id === user.id) || null;
      const pubCheck = canUserPublishListings(storedUser);
      if (!pubCheck.allowed) {
        return res.status(403).json({
          success: false,
          code: "EMAIL_VERIFICATION_REQUIRED",
          error: pubCheck.reason
        });
      }
    }
    const rawImages = Array.isArray(safeIncoming.images) ? safeIncoming.images.filter(Boolean) : current.images || [];
    if (!isDraft && newStatus === "PUBLISHED" && rawImages.length < MIN_PROPERTY_PHOTOS) {
      return res.status(400).json({
        success: false,
        error: `Au moins ${MIN_PROPERTY_PHOTOS} photos sont requises pour publier une annonce publiquement (actuellement ${rawImages.length}).`
      });
    }
    if (rawImages.length > MAX_PROPERTY_PHOTOS) {
      return res.status(400).json({
        success: false,
        error: `Maximum ${MAX_PROPERTY_PHOTOS} photos autoris\xE9es par annonce.`
      });
    }
    if (safeIncoming.virtualTourUrl !== void 0) {
      const tourCheck = validateVirtualTourDomainServer(safeIncoming.virtualTourUrl, inMemorySettings.virtual_tour_allowed_domains);
      if (!tourCheck.valid) {
        return res.status(400).json({ success: false, error: tourCheck.message });
      }
      safeIncoming.virtualTourUrl = tourCheck.normalizedUrl;
    }
    if (safeIncoming.videoDuration !== void 0 && Number(safeIncoming.videoDuration) > MAX_VIDEO_DURATION_SECONDS) {
      return res.status(400).json({ success: false, error: `La vid\xE9o ne peut pas d\xE9passer ${MAX_VIDEO_DURATION_SECONDS} secondes.` });
    }
    const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [];
    if (newStatus !== oldStatus) {
      history.push({
        id: `hist_${Date.now()}`,
        fromStatus: oldStatus,
        toStatus: newStatus,
        changedByUserId: user.id,
        changedByName: user.name || "Utilisateur Kinimmo",
        changedAt: (/* @__PURE__ */ new Date()).toISOString(),
        note: safeIncoming.statusNote || `Mise \xE0 jour du statut vers ${newStatus}`
      });
    }
    const incomingImages = Array.isArray(safeIncoming.images) ? (await Promise.all(rawImages.map((img, i) => saveBase64PropertyImage(img, id, i)))).filter(Boolean) : current.images || [];
    const nextFloorPlan = safeIncoming.floorPlanUrl !== void 0 ? safeIncoming.floorPlanUrl ? await saveBase64PropertyImage(safeIncoming.floorPlanUrl, `${id}_plan`, 0) : void 0 : current.floorPlanUrl;
    const fingerprints = Array.isArray(safeIncoming.imageFingerprints) ? safeIncoming.imageFingerprints : Array.isArray(safeIncoming.imagesMeta) ? safeIncoming.imagesMeta.map((m) => m?.fingerprint).filter(Boolean) : current.imageFingerprints || [];
    const dupMatches = findDuplicateFingerprintsInMemory(fingerprints, incomingImages, id);
    let fraudStatus = safeIncoming.fraudStatus || current.fraudStatus || "normal";
    const fraudFlags = Array.isArray(safeIncoming.fraudFlags) ? [...safeIncoming.fraudFlags] : current.fraudFlags || [];
    if (dupMatches.length > 0) {
      if (fraudStatus === "normal") fraudStatus = "review_required";
      if (!fraudFlags.some((f) => f.code === "DUPLICATE_PHOTOS")) {
        fraudFlags.push({
          code: "DUPLICATE_PHOTOS",
          label: "Empreinte photo d\xE9j\xE0 utilis\xE9e sur une autre annonce",
          severity: "high",
          details: dupMatches.map((m) => `${m.propertyTitle} (${m.propertyId})`).join(", ")
        });
      }
    }
    const resolvedNextStatus = newStatus === "SOLD" ? "sold" : safeIncoming.status || current.status;
    const pricingCheck = validateAndNormalizePropertyPricing({
      status: resolvedNextStatus,
      listingStatus: newStatus,
      price: safeIncoming.price !== void 0 ? safeIncoming.price : current.price,
      currency: safeIncoming.currency !== void 0 ? safeIncoming.currency : current.currency,
      period: safeIncoming.period !== void 0 ? safeIncoming.period : resolvedNextStatus === "for-rent" ? current.period === "year" ? "year" : "month" : "total",
      isNegotiable: safeIncoming.isNegotiable !== void 0 ? safeIncoming.isNegotiable : current.isNegotiable,
      guaranteeMonths: resolvedNextStatus === "for-rent" ? safeIncoming.guaranteeMonths !== void 0 ? safeIncoming.guaranteeMonths : current.guaranteeMonths : void 0,
      advanceMonths: resolvedNextStatus === "for-rent" ? safeIncoming.advanceMonths !== void 0 ? safeIncoming.advanceMonths : current.advanceMonths : void 0,
      requirePositivePrice: !isDraft && newStatus === "PUBLISHED"
    });
    if (!pricingCheck.valid) {
      return res.status(400).json({ success: false, error: pricingCheck.error });
    }
    const updated = normalizePropertyRecord({
      ...current,
      ...safeIncoming,
      price: pricingCheck.data.price,
      currency: pricingCheck.data.currency,
      period: pricingCheck.data.period,
      isNegotiable: pricingCheck.data.isNegotiable,
      guaranteeMonths: pricingCheck.data.guaranteeMonths,
      advanceMonths: pricingCheck.data.advanceMonths,
      images: incomingImages,
      floorPlanUrl: nextFloorPlan,
      imageFingerprints: fingerprints,
      fraudStatus,
      fraudFlags,
      id,
      userId: current.userId || user.id,
      agentId: user.role === "admin" && safeIncoming.agentId ? safeIncoming.agentId : current.agentId || user.id,
      listingStatus: newStatus,
      isAvailable: newStatus === "PUBLISHED",
      published: !isDraft && safeIncoming.published !== false && fraudStatus !== "suspect",
      status: resolvedNextStatus,
      statusHistory: history,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (updated.videoUrl && updated.videoUrl !== current.videoUrl) {
      updated.videoModerationStatus = ensurePendingVideoModerationInMemory({ prop: updated, user, videoUrl: updated.videoUrl });
    }
    const prevImages = Array.isArray(current.images) ? current.images : [];
    for (const oldImg of prevImages) {
      if (oldImg && oldImg.includes("cloudinary.com") && !incomingImages.includes(oldImg)) {
        destroyFromCloudinaryServer({ url: oldImg, resourceType: "image" }).catch(() => {
        });
      }
    }
    if (current.floorPlanUrl && current.floorPlanUrl.includes("cloudinary.com") && current.floorPlanUrl !== nextFloorPlan) {
      destroyFromCloudinaryServer({ url: current.floorPlanUrl, publicId: current.floorPlanPublicId, resourceType: "image" }).catch(() => {
      });
    }
    if (current.videoUrl && current.videoUrl.includes("cloudinary.com") && updated.videoUrl !== current.videoUrl) {
      destroyFromCloudinaryServer({ url: current.videoUrl, publicId: current.videoPublicId, resourceType: "video" }).catch(() => {
      });
    }
    inMemoryProperties[idx] = updated;
    saveLocalProperties(inMemoryProperties);
    return res.json({
      success: true,
      message: "Annonce mise \xE0 jour avec succ\xE8s.",
      duplicateMatches: dupMatches,
      property: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/properties/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Authentification requise pour supprimer une annonce." });
    }
    const { id } = req.params;
    const idx = inMemoryProperties.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
    }
    const target = inMemoryProperties[idx];
    if (!canManageProperty(user, target)) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit : vous ne pouvez supprimer que vos propres annonces." });
    }
    if (Array.isArray(target.images)) {
      target.images.forEach((u) => {
        if (u && u.includes("cloudinary.com")) destroyFromCloudinaryServer({ url: u, resourceType: "image" }).catch(() => {
        });
      });
    }
    if (target.floorPlanUrl && target.floorPlanUrl.includes("cloudinary.com")) {
      destroyFromCloudinaryServer({ url: target.floorPlanUrl, publicId: target.floorPlanPublicId, resourceType: "image" }).catch(() => {
      });
    }
    if (target.videoUrl && target.videoUrl.includes("cloudinary.com")) {
      destroyFromCloudinaryServer({ url: target.videoUrl, publicId: target.videoPublicId, resourceType: "video" }).catch(() => {
      });
    }
    inMemoryProperties.splice(idx, 1);
    saveLocalProperties(inMemoryProperties);
    return res.json({ success: true, message: "Annonce supprim\xE9e avec succ\xE8s." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var handlePropertyStatusUpdate = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Authentification requise." });
    }
    const { id } = req.params;
    const { status, note } = req.body;
    const validStatuses = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "RENTED", "SOLD", "ARCHIVED"];
    const targetStatus = String(status).toUpperCase();
    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({ success: false, error: `Statut invalide. Statuts autoris\xE9s : ${validStatuses.join(", ")}` });
    }
    const idx = inMemoryProperties.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
    }
    const current = inMemoryProperties[idx];
    if (!canManageProperty(user, current)) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit : vous ne pouvez modifier que vos propres annonces." });
    }
    if (targetStatus === "PUBLISHED") {
      const imgCount = Array.isArray(current.images) ? current.images.filter(Boolean).length : 0;
      if (imgCount < MIN_PROPERTY_PHOTOS) {
        return res.status(400).json({
          success: false,
          error: `Impossible de publier : au moins ${MIN_PROPERTY_PHOTOS} photos sont requises (actuellement ${imgCount}).`
        });
      }
    }
    const oldStatus = current.listingStatus || (current.status === "sold" ? "SOLD" : "PUBLISHED");
    const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [];
    history.push({
      id: `hist_${Date.now()}`,
      fromStatus: oldStatus,
      toStatus: targetStatus,
      changedByUserId: user.id,
      changedByName: user.name || "Agent Kinimmo",
      changedAt: (/* @__PURE__ */ new Date()).toISOString(),
      note: note || `Statut pass\xE9 \xE0 ${targetStatus}`
    });
    const isAvailable = targetStatus === "PUBLISHED";
    const legacyStatus = targetStatus === "SOLD" ? "sold" : targetStatus === "RENTED" ? "for-rent" : current.status;
    const updated = {
      ...current,
      listingStatus: targetStatus,
      isAvailable,
      status: legacyStatus,
      published: targetStatus === "PUBLISHED",
      statusHistory: history,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryProperties[idx] = updated;
    saveLocalProperties(inMemoryProperties);
    return res.json({
      success: true,
      message: `Statut du bien mis \xE0 jour avec succ\xE8s : ${targetStatus}`,
      property: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.put("/api/properties/:id/status", handlePropertyStatusUpdate);
app.patch("/api/properties/:id/status", handlePropertyStatusUpdate);
app.patch("/api/properties/:id/assign", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: "Authentification requise." });
    }
    const { id } = req.params;
    const { assignedAgentId, assignedAgentName } = req.body;
    const idx = inMemoryProperties.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
    }
    if (!canManageProperty(user, inMemoryProperties[idx])) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    inMemoryProperties[idx].assignedAgentId = assignedAgentId;
    inMemoryProperties[idx].assignedAgentName = assignedAgentName;
    inMemoryProperties[idx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    saveLocalProperties(inMemoryProperties);
    return res.json({ success: true, message: `Bien attribu\xE9 \xE0 ${assignedAgentName || assignedAgentId}.`, property: inMemoryProperties[idx] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/properties/:id/status-history", (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: "Authentification requise." });
  }
  const prop = inMemoryProperties.find((p) => p.id === req.params.id);
  if (!prop) {
    return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
  }
  if (!canManageProperty(user, prop)) {
    return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
  }
  return res.json({ success: true, history: prop.statusHistory || [] });
});
app.get("/api/agency/collaborators", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin" && user.role !== "agency" && user.role !== "agent") {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    const { agencyId } = req.query;
    const effectiveAgencyId = user.role === "admin" ? agencyId ? String(agencyId) : null : user.agencyId || user.id;
    let list = inMemoryCollaborators;
    if (effectiveAgencyId) {
      list = list.filter((c) => c.agencyId === effectiveAgencyId);
    }
    return res.json({ success: true, count: list.length, collaborators: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/agency/collaborators/invite", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin" && user.role !== "agency") {
      return res.status(403).json({ success: false, error: "Seules les agences ou administrateurs peuvent inviter un collaborateur." });
    }
    const { agencyId, name, email, phone, whatsapp, role = "agency_agent", permissions } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: "Le nom et l'adresse e-mail sont obligatoires." });
    }
    const targetAgencyId = user.role === "admin" ? agencyId || "agency_default" : user.agencyId || user.id;
    const newCollab = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: targetAgencyId,
      userId: `usr_invited_${Date.now()}`,
      name,
      email,
      phone: phone || "",
      whatsapp: whatsapp || phone || "",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role,
      permissions: permissions || {
        canEditAllProperties: false,
        canAssignProperties: false,
        canAssignLeads: false,
        canViewBilling: false,
        canManageTeam: false
      },
      status: "invited",
      invitedAt: (/* @__PURE__ */ new Date()).toISOString(),
      activeListingsCount: 0,
      totalLeadsCount: 0
    };
    inMemoryCollaborators.unshift(newCollab);
    saveLocalCollaborators(inMemoryCollaborators);
    return res.status(201).json({ success: true, message: `Invitation envoy\xE9e \xE0 ${email}.`, collaborator: newCollab });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.patch("/api/agency/collaborators/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin" && user.role !== "agency") {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    const { id } = req.params;
    const idx = inMemoryCollaborators.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Collaborateur introuvable." });
    }
    if (user.role !== "admin" && inMemoryCollaborators[idx].agencyId !== (user.agencyId || user.id)) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    inMemoryCollaborators[idx] = {
      ...inMemoryCollaborators[idx],
      ...req.body,
      id,
      agencyId: inMemoryCollaborators[idx].agencyId
    };
    saveLocalCollaborators(inMemoryCollaborators);
    return res.json({ success: true, message: "Collaborateur mis \xE0 jour.", collaborator: inMemoryCollaborators[idx] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/agency/collaborators/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin" && user.role !== "agency") {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    const { id } = req.params;
    const target = inMemoryCollaborators.find((c) => c.id === id);
    if (!target) return res.status(404).json({ success: false, error: "Collaborateur introuvable." });
    if (user.role !== "admin" && target.agencyId !== (user.agencyId || user.id)) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    inMemoryCollaborators = inMemoryCollaborators.filter((c) => c.id !== id);
    saveLocalCollaborators(inMemoryCollaborators);
    return res.json({ success: true, message: "Collaborateur retir\xE9 de l'agence." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/agency/transactions", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin" && user.role !== "agency" && user.role !== "agent") {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    const { agencyId } = req.query;
    const effectiveAgencyId = user.role === "admin" ? agencyId ? String(agencyId) : null : user.agencyId || user.id;
    let list = inMemoryTransactions;
    if (effectiveAgencyId) {
      if (user.role === "agency") {
        list = list.filter((t) => t.agencyId === effectiveAgencyId);
      } else {
        list = list.filter((t) => t.agencyId === effectiveAgencyId || t.agentId === user.id);
      }
    }
    return res.json({ success: true, count: list.length, transactions: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/agency/transactions", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
    if (user.role !== "admin" && user.role !== "agency" && user.role !== "agent") {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    const body = req.body || {};
    const targetAgencyId = user.role === "admin" ? body.agencyId || "agency_default" : user.agencyId || user.id;
    if (body.propertyId && user.role !== "admin") {
      const linkedProp = inMemoryProperties.find((p) => p.id === body.propertyId);
      if (linkedProp && !canManageProperty(user, linkedProp)) {
        return res.status(403).json({ success: false, error: "Acc\xE8s interdit : ce bien appartient \xE0 une autre organisation." });
      }
    }
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: targetAgencyId,
      propertyId: body.propertyId || "",
      propertyTitle: body.propertyTitle || "Propri\xE9t\xE9 Kinshasa",
      agentId: user.role === "admin" ? body.agentId || user.id : user.id,
      agentName: body.agentName || user.name || "Agent Immobilier",
      clientName: body.clientName || "Client Particulier",
      clientContact: body.clientContact || "",
      type: body.type || "sale",
      amount: Number(body.amount) || 0,
      currency: body.currency || "USD",
      commissionRate: Number(body.commissionRate) || 5,
      commissionAmount: Number(body.commissionAmount) || Number(body.amount || 0) * 0.05,
      status: body.status || "closed",
      notes: body.notes || "",
      closedAt: body.closedAt || (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryTransactions.unshift(newTx);
    saveLocalTransactions(inMemoryTransactions);
    return res.status(201).json({ success: true, message: "Transaction enregistr\xE9e avec succ\xE8s.", transaction: newTx });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/trust/badge/:targetType/:targetId", (req, res) => {
  try {
    const { targetType, targetId } = req.params;
    let target = null;
    if (targetType === "property") {
      const verif = inMemoryTrust.verifications.find(
        (v) => v.targetType === "property" && v.targetId === targetId
      );
      const prop = inMemoryProperties.find((p) => p.id === targetId);
      if (verif) {
        target = {
          id: targetId,
          name: prop?.title || verif.targetName,
          trust_status: verif.trustStatus,
          trust_level: verif.trustLevel,
          trust_score: verif.trustScore,
          trust_verified_at: verif.approvedAt,
          trust_expires_at: verif.expiresAt,
          availability_status: prop?.availability_status || "available",
          availability_confirmed_at: prop?.availability_confirmed_at || null
        };
      } else {
        target = prop;
      }
    } else if (targetType === "agent") {
      const verif = inMemoryTrust.verifications.find(
        (v) => v.targetType === "agent" && (v.targetId === targetId || v.applicantUserId === targetId)
      );
      if (verif) {
        target = {
          id: targetId,
          name: verif.targetName,
          trust_status: verif.trustStatus,
          trust_level: verif.trustLevel,
          trust_score: verif.trustScore,
          trust_verified_at: verif.approvedAt,
          trust_expires_at: verif.expiresAt
        };
      } else {
        target = { id: targetId, trust_status: "unverified" };
      }
    } else if (targetType === "agency") {
      const verif = inMemoryTrust.verifications.find(
        (v) => v.targetType === "agency" && (v.targetId === targetId || v.applicantUserId === targetId)
      );
      if (verif) {
        target = {
          id: targetId,
          name: verif.targetName,
          trust_status: verif.trustStatus,
          trust_level: verif.trustLevel,
          trust_score: verif.trustScore,
          trust_verified_at: verif.approvedAt,
          trust_expires_at: verif.expiresAt
        };
      } else {
        target = { id: targetId, trust_status: "unverified" };
      }
    }
    if (!target) {
      return res.status(404).json({ success: false, message: "Entit\xE9 cible introuvable." });
    }
    const currentStatus = target.trust_status || target.trustStatus || "unverified";
    const isApproved = ["identity_verified", "pro_verified", "property_verified"].includes(currentStatus);
    return res.json({
      success: true,
      data: {
        targetType,
        targetId,
        isVerified: isApproved,
        trustStatus: currentStatus,
        trustLevel: isApproved ? target.trust_level || target.trustLevel : null,
        trustScore: isApproved ? target.trust_score ?? target.trustScore ?? 0 : 0,
        verifiedAt: isApproved ? target.trust_verified_at || target.trustVerifiedAt || target.approvedAt : null,
        expiresAt: isApproved ? target.trust_expires_at || target.trustExpiresAt || target.expiresAt : null,
        availabilityConfirmedAt: target.availability_confirmed_at || null,
        availabilityStatus: target.availability_status || "available"
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/trust/verifications", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentification requise." });
    const { target_type, status, applicant_id } = req.query;
    let list = [...inMemoryTrust.verifications];
    if (user.role !== "admin") {
      list = list.filter((v) => v.applicantUserId === user.id);
    } else if (applicant_id) {
      list = list.filter((v) => v.applicantUserId === applicant_id);
    }
    if (target_type) {
      list = list.filter((v) => v.targetType === target_type);
    }
    if (status) {
      list = list.filter((v) => v.trustStatus === status);
    }
    const enriched = list.map((v) => {
      const docs = inMemoryTrust.documents.filter((d) => d.verificationId === v.id);
      const chks = inMemoryTrust.checks.filter((c) => c.verificationId === v.id);
      return {
        ...v,
        documentsCount: docs.length,
        checksCount: chks.length
      };
    });
    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/trust/verifications/:id", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentification requise." });
    const { id } = req.params;
    const verification = inMemoryTrust.verifications.find((v) => v.id === id);
    if (!verification) {
      return res.status(404).json({ success: false, message: "Dossier Kinimmo Trust introuvable." });
    }
    if (user.role !== "admin" && verification.applicantUserId !== user.id) {
      return res.status(403).json({ success: false, message: "Acc\xE8s interdit \xE0 ce dossier de v\xE9rification." });
    }
    const documents = inMemoryTrust.documents.filter((d) => d.verificationId === id);
    const checks = inMemoryTrust.checks.filter((c) => c.verificationId === id);
    const auditLogs = inMemoryTrust.auditLogs.filter(
      (a) => a.verificationId === id || a.targetType === verification.targetType && a.targetId === verification.targetId
    );
    const availability = inMemoryTrust.availabilities.find((av) => av.propertyId === verification.targetId) || null;
    return res.json({
      success: true,
      data: {
        ...verification,
        documents,
        checks,
        auditLogs,
        availability
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var handleApplyTrust = (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentification requise pour soumettre une demande Kinimmo Trust." });
    }
    const { target_type, target_id, target_name, documents = [], applicant_phone } = req.body;
    if (!target_type || !target_id || !target_name) {
      return res.status(400).json({ success: false, message: "Type de cible, ID cible et Nom sont obligatoires." });
    }
    if (target_type === "property") {
      const prop = inMemoryProperties.find((p) => p.id === target_id);
      if (!prop) {
        return res.status(404).json({ success: false, message: "Annonce immobili\xE8re cibl\xE9e introuvable." });
      }
      if (!canManageProperty(user, prop)) {
        return res.status(403).json({
          success: false,
          message: "R\xE8gle m\xE9tier Kinimmo Trust : Vous pouvez uniquement certifier les biens immobiliers qui vous appartiennent (que vous avez vous-m\xEAme publi\xE9s). Il est strictement interdit de demander la certification d\u2019un bien appartenant \xE0 un tiers."
        });
      }
    } else if (target_type === "agent" || target_type === "agency") {
      const isSelf = user.id === target_id || user.agencyId && user.agencyId === target_id || user.role === "admin";
      if (!isSelf) {
        return res.status(403).json({
          success: false,
          message: "R\xE8gle m\xE9tier Kinimmo Trust : Vous ne pouvez soumettre une v\xE9rification que pour votre propre profil."
        });
      }
    }
    const verificationId = `trust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newVerif = {
      id: verificationId,
      targetType: target_type,
      targetId: target_id,
      targetName: target_name,
      applicantUserId: user.id,
      applicantName: user.name,
      applicantEmail: user.email,
      applicantPhone: applicant_phone || user.phone || null,
      trustStatus: "pending",
      trustLevel: "En attente d\u2019audit",
      trustScore: 20,
      submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryTrust.verifications.unshift(newVerif);
    if (target_type === "property") {
      const propIndex = inMemoryProperties.findIndex((p) => p.id === target_id);
      if (propIndex !== -1) {
        inMemoryProperties[propIndex].trust_status = "pending";
        inMemoryProperties[propIndex].trust_score = 20;
        saveLocalProperties(inMemoryProperties);
      }
    }
    if (Array.isArray(documents)) {
      documents.forEach((d) => {
        if (d.file_url || d.fileUrl) {
          inMemoryTrust.documents.push({
            id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            verificationId,
            docType: d.doc_type || d.docType || "other",
            title: d.title || "Pi\xE8ce justificative",
            documentNumber: d.document_number || d.documentNumber || null,
            fileUrl: d.file_url || d.fileUrl,
            fileSize: d.file_size || d.fileSize || "1.2 MB",
            fileMimeType: d.file_mime_type || d.fileMimeType || "application/pdf",
            status: "pending",
            createdAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      });
    }
    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId,
      targetType: target_type,
      targetId: target_id,
      adminUserId: user.id,
      adminName: user.name,
      adminEmail: user.email,
      action: "DOSSIER_SUBMITTED",
      previousStatus: "unverified",
      newStatus: "pending",
      reasonOrNotes: "Demande de v\xE9rification Kinimmo Trust soumise par le demandeur avec documents justificatifs.",
      ipAddress: req.ip || "127.0.0.1",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveLocalTrust(inMemoryTrust);
    return res.status(201).json({
      success: true,
      message: "Votre dossier a \xE9t\xE9 soumis avec succ\xE8s \xE0 l\u2019\xE9quipe Kinimmo Trust.",
      verification: newVerif
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.post("/api/trust/apply", handleApplyTrust);
app.post("/api/trust/verifications", handleApplyTrust);
var handleUpdateTrustStatus = (req, res) => {
  try {
    const admin = getAuthUser(req);
    if (!admin) {
      return res.status(401).json({ success: false, message: "Authentification requise." });
    }
    if (admin.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Acc\xE8s interdit : Seules les personnes disposant du r\xF4le administrateur autoris\xE9 peuvent prendre des d\xE9cisions."
      });
    }
    const { id } = req.params;
    const {
      status,
      // 'in_progress', 'identity_verified', 'pro_verified', 'property_verified', 'rejected', 'expired', 'suspended'
      trust_level,
      trust_score = 90,
      rejection_reason,
      rejection_category,
      suspension_reason,
      admin_notes,
      expires_in_months = 12
    } = req.body;
    const verifIndex = inMemoryTrust.verifications.findIndex((v) => v.id === id);
    if (verifIndex === -1) {
      return res.status(404).json({ success: false, message: "Dossier introuvable." });
    }
    const currentVerif = inMemoryTrust.verifications[verifIndex];
    const prevStatus = currentVerif.trustStatus;
    const isApproval = ["identity_verified", "pro_verified", "property_verified"].includes(status);
    if (isApproval && currentVerif.applicantUserId === admin.id) {
      return res.status(403).json({
        success: false,
        message: "Violation de s\xE9curit\xE9 : Un utilisateur ne peut JAMAIS approuver son propre dossier de v\xE9rification."
      });
    }
    if (status === "rejected" && (!rejection_reason || !rejection_reason.trim())) {
      return res.status(400).json({
        success: false,
        message: "Le motif de refus (rejection_reason) est obligatoire pour rejeter un dossier."
      });
    }
    if (status === "suspended" && (!suspension_reason || !suspension_reason.trim())) {
      return res.status(400).json({
        success: false,
        message: "Le motif de suspension (suspension_reason) est obligatoire en cas de probl\xE8me s\xE9rieux."
      });
    }
    let approvedAt = currentVerif.approvedAt;
    let expiresAt = currentVerif.expiresAt;
    if (isApproval) {
      approvedAt = (/* @__PURE__ */ new Date()).toISOString();
      const expDate = /* @__PURE__ */ new Date();
      expDate.setMonth(expDate.getMonth() + Number(expires_in_months));
      expiresAt = expDate.toISOString();
    }
    inMemoryTrust.verifications[verifIndex] = {
      ...currentVerif,
      trustStatus: status,
      trustLevel: trust_level || currentVerif.trustLevel,
      trustScore: Number(trust_score),
      reviewedAt: (/* @__PURE__ */ new Date()).toISOString(),
      approvedAt,
      expiresAt,
      rejectionReason: rejection_reason || null,
      rejectionCategory: rejection_category || null,
      suspensionReason: suspension_reason || null,
      adminNotes: admin_notes || currentVerif.adminNotes,
      assignedAdminId: admin.id,
      assignedAdminName: admin.name,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (currentVerif.targetType === "property") {
      const pIdx = inMemoryProperties.findIndex((p) => p.id === currentVerif.targetId);
      if (pIdx !== -1) {
        inMemoryProperties[pIdx].trust_status = status;
        inMemoryProperties[pIdx].trust_level = trust_level || "Bien V\xE9rifi\xE9 & Titre Foncier Contr\xF4l\xE9";
        inMemoryProperties[pIdx].trust_score = Number(trust_score);
        inMemoryProperties[pIdx].trust_verified_at = approvedAt;
        inMemoryProperties[pIdx].trust_expires_at = expiresAt;
        saveLocalProperties(inMemoryProperties);
      }
    }
    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId: id,
      targetType: currentVerif.targetType,
      targetId: currentVerif.targetId,
      adminUserId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      action: isApproval ? "TRUST_GRANTED" : status === "rejected" ? "TRUST_REJECTED" : status === "suspended" ? "TRUST_SUSPENDED" : "AUDIT_UPDATED",
      previousStatus: prevStatus,
      newStatus: status,
      reasonOrNotes: rejection_reason || suspension_reason || admin_notes || `Changement de statut vers ${status}`,
      ipAddress: req.ip || "127.0.0.1",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    inMemoryTrust.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: currentVerif.applicantUserId,
      title: isApproval ? "Badge Kinimmo Trust Approuv\xE9 !" : "Notification Kinimmo Trust",
      message: isApproval ? `Votre demande de v\xE9rification pour "${currentVerif.targetName}" est approuv\xE9e.` : `Statut de v\xE9rification mis \xE0 jour : ${status}. Motif : ${rejection_reason || suspension_reason || "Consultez les d\xE9tails."}`,
      type: isApproval ? "trust_approved" : status === "rejected" ? "trust_rejected" : "trust_suspended",
      targetType: currentVerif.targetType,
      targetId: currentVerif.targetId,
      isRead: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveLocalTrust(inMemoryTrust);
    return res.json({
      success: true,
      message: `D\xE9cision enregistr\xE9e avec succ\xE8s : ${status}`,
      verification: inMemoryTrust.verifications[verifIndex]
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
};
app.put("/api/trust/verifications/:id/status", handleUpdateTrustStatus);
app.post("/api/trust/verifications/:id/status", handleUpdateTrustStatus);
app.put("/api/trust/verifications/:id/decision", handleUpdateTrustStatus);
app.post("/api/trust/verifications/:id/request-info", (req, res) => {
  try {
    const admin = getAuthUser(req);
    if (!admin) return res.status(401).json({ success: false, message: "Authentification requise." });
    if (admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Acc\xE8s interdit : R\xF4le administrateur requis." });
    }
    const { id } = req.params;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Le message d\xE9taillant les pi\xE8ces manquantes est obligatoire." });
    }
    const verifIndex = inMemoryTrust.verifications.findIndex((v) => v.id === id);
    if (verifIndex === -1) {
      return res.status(404).json({ success: false, message: "Dossier introuvable." });
    }
    const currentVerif = inMemoryTrust.verifications[verifIndex];
    inMemoryTrust.verifications[verifIndex].trustStatus = "in_progress";
    inMemoryTrust.verifications[verifIndex].adminNotes = `Compl\xE9ment d'information requis : ${message.trim()}`;
    inMemoryTrust.verifications[verifIndex].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId: id,
      targetType: currentVerif.targetType,
      targetId: currentVerif.targetId,
      adminUserId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      action: "INFO_REQUESTED",
      previousStatus: currentVerif.trustStatus,
      newStatus: "in_progress",
      reasonOrNotes: `Compl\xE9ment demand\xE9 : ${message.trim()}`,
      ipAddress: req.ip || "127.0.0.1",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    inMemoryTrust.notifications.unshift({
      id: `notif_${Date.now()}`,
      userId: currentVerif.applicantUserId,
      title: "Pi\xE8ces compl\xE9mentaires requises pour Kinimmo Trust",
      message: `L'\xE9quipe d'audit Kinimmo Trust a besoin de compl\xE9ments : ${message.trim()}`,
      type: "doc_required",
      targetType: currentVerif.targetType,
      targetId: currentVerif.targetId,
      isRead: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveLocalTrust(inMemoryTrust);
    return res.json({ success: true, message: "Demande de compl\xE9ments envoy\xE9e au demandeur avec succ\xE8s." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/trust/documents/:id/access-log", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Acc\xE8s interdit." });
    const { id } = req.params;
    const { verification_id, document_title } = req.body;
    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId: verification_id,
      targetType: "system",
      targetId: id,
      adminUserId: user.id,
      adminName: user.name,
      adminEmail: user.email,
      action: "DOCUMENT_VIEWED",
      reasonOrNotes: `Consultation du document sensible "${document_title || id}" par ${user.name} (${user.role})`,
      ipAddress: req.ip || "127.0.0.1",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveLocalTrust(inMemoryTrust);
    return res.json({ success: true, message: "Acc\xE8s consign\xE9 au journal d\u2019audit." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/trust/audit-logs*", (_req, res) => {
  return res.status(405).json({
    success: false,
    message: "S\xE9curit\xE9 : Les journaux d\u2019audit Kinimmo Trust sont immuables et prot\xE9g\xE9s contre toute suppression r\xE9troactive."
  });
});
app.put("/api/trust/audit-logs*", (_req, res) => {
  return res.status(405).json({
    success: false,
    message: "S\xE9curit\xE9 : Les journaux d\u2019audit Kinimmo Trust sont immuables et prot\xE9g\xE9s contre toute modification."
  });
});
app.post("/api/trust/verifications/:id/checks", (req, res) => {
  try {
    const admin = getAuthUser(req);
    if (!admin) return res.status(401).json({ success: false, message: "Authentification requise." });
    if (admin.role !== "admin") return res.status(403).json({ success: false, message: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const { check_type, check_label, result = "passed", evidence_notes } = req.body;
    const check = {
      id: `chk_${Date.now()}`,
      verificationId: id,
      checkType: check_type,
      checkLabel: check_label,
      result,
      evidenceNotes: evidence_notes || "",
      conductedByUserId: admin.id,
      conductedByName: admin.name,
      conductedAt: (/* @__PURE__ */ new Date()).toISOString(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryTrust.checks.push(check);
    inMemoryTrust.auditLogs.unshift({
      id: `audit_${Date.now()}`,
      verificationId: id,
      targetType: "system",
      targetId: id,
      adminUserId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      action: "CHECK_PERFORMED",
      reasonOrNotes: `Contr\xF4le d'audit "${check_label}" ex\xE9cut\xE9 avec le r\xE9sultat : ${result}. Notes: ${evidence_notes || "RAS"}`,
      ipAddress: req.ip || "127.0.0.1",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    saveLocalTrust(inMemoryTrust);
    return res.status(201).json({ success: true, check });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/trust/documents/:id/status", (req, res) => {
  try {
    const admin = getAuthUser(req);
    if (!admin) return res.status(401).json({ success: false, message: "Authentification requise." });
    if (admin.role !== "admin") return res.status(403).json({ success: false, message: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    const { id } = req.params;
    const { status, rejection_note } = req.body;
    const docIndex = inMemoryTrust.documents.findIndex((d) => d.id === id);
    if (docIndex === -1) {
      return res.status(404).json({ success: false, message: "Document introuvable." });
    }
    inMemoryTrust.documents[docIndex] = {
      ...inMemoryTrust.documents[docIndex],
      status,
      rejectionNote: rejection_note || null,
      verifiedByUserId: admin.id,
      verifiedByName: admin.name,
      verifiedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveLocalTrust(inMemoryTrust);
    return res.json({ success: true, document: inMemoryTrust.documents[docIndex] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/trust/availability/:propertyId", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentification requise." });
    const { propertyId } = req.params;
    const { availability_status = "available", confirmation_method = "agent_statement", notes } = req.body;
    const prop = inMemoryProperties.find((p) => p.id === propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, message: "Bien immobilier introuvable." });
    }
    if (!canManageProperty(user, prop)) {
      return res.status(403).json({ success: false, message: "Acc\xE8s interdit : vous ne pouvez confirmer la disponibilit\xE9 que pour vos propres annonces." });
    }
    const isAvailable = availability_status === "available";
    const nextDue = /* @__PURE__ */ new Date();
    nextDue.setDate(nextDue.getDate() + 14);
    const availIndex = inMemoryTrust.availabilities.findIndex((a) => a.propertyId === propertyId);
    const availRecord = {
      id: availIndex !== -1 ? inMemoryTrust.availabilities[availIndex].id : `avail_${Date.now()}`,
      propertyId,
      propertyTitle: prop.title,
      isAvailable,
      availabilityStatus: availability_status,
      lastConfirmedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastConfirmedById: user.id,
      lastConfirmedByName: user.name,
      confirmationMethod: confirmation_method,
      nextVerificationDue: nextDue.toISOString(),
      notes: notes || null,
      createdAt: availIndex !== -1 ? inMemoryTrust.availabilities[availIndex].createdAt : (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (availIndex !== -1) {
      inMemoryTrust.availabilities[availIndex] = availRecord;
    } else {
      inMemoryTrust.availabilities.push(availRecord);
    }
    const pIdx = inMemoryProperties.findIndex((p) => p.id === propertyId);
    if (pIdx !== -1) {
      inMemoryProperties[pIdx].isAvailable = isAvailable;
      inMemoryProperties[pIdx].availability_status = availability_status;
      inMemoryProperties[pIdx].availability_confirmed_at = (/* @__PURE__ */ new Date()).toISOString();
      saveLocalProperties(inMemoryProperties);
    }
    saveLocalTrust(inMemoryTrust);
    return res.json({
      success: true,
      message: "Disponibilit\xE9 confirm\xE9e avec succ\xE8s.",
      availability: availRecord
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/trust/audit-logs", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentification requise." });
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
    return res.json({ success: true, count: inMemoryTrust.auditLogs.length, data: inMemoryTrust.auditLogs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/trust/notifications", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentification requise." });
    const list = inMemoryTrust.notifications.filter(
      (n) => n.userId === user.id || user.role === "admin" && n.userId === "all"
    );
    return res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/trust/notifications/:id/read", (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Authentification requise." });
    const { id } = req.params;
    const notif = inMemoryTrust.notifications.find((n) => n.id === id);
    if (notif) {
      if (user.role !== "admin" && notif.userId !== user.id && notif.userId !== "all") {
        return res.status(403).json({ success: false, message: "Acc\xE8s interdit." });
      }
      notif.isRead = true;
      saveLocalTrust(inMemoryTrust);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var inMemoryCustomFields = (() => {
  try {
    if (fs2.existsSync(LOCAL_CUSTOM_FIELDS_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_CUSTOM_FIELDS_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
  }
  return Array.isArray(initialCustomFields) ? [...initialCustomFields] : [];
})();
function saveLocalCustomFields(list) {
  try {
    fs2.writeFileSync(LOCAL_CUSTOM_FIELDS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
  }
}
app.get("/api/custom-fields", (_req, res) => {
  const publicFields = inMemoryCustomFields.filter((f) => !f.isPrivate);
  return res.json({ success: true, count: publicFields.length, fields: publicFields });
});
app.get("/api/admin/custom-fields", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  return res.json({ success: true, count: inMemoryCustomFields.length, fields: inMemoryCustomFields });
});
app.post("/api/admin/custom-fields", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const body = req.body || {};
  if (!body.key) return res.status(400).json({ success: false, error: "La cl\xE9 du champ est obligatoire." });
  const newField = {
    id: body.id || `cf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    key: String(body.key).trim(),
    label: body.label || { fr: body.labelFr || body.key, en: body.labelEn || body.key },
    type: body.type || "text",
    unit: body.unit || void 0,
    options: Array.isArray(body.options) ? body.options : void 0,
    required: Boolean(body.required),
    isPrivate: Boolean(body.isPrivate),
    filterable: body.filterable !== false,
    showInCard: Boolean(body.showInCard),
    order: Number(body.order) || inMemoryCustomFields.length + 1
  };
  inMemoryCustomFields.push(newField);
  saveLocalCustomFields(inMemoryCustomFields);
  return res.status(201).json({ success: true, field: newField });
});
app.put("/api/admin/custom-fields/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const idx = inMemoryCustomFields.findIndex((f) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Champ introuvable." });
  inMemoryCustomFields[idx] = { ...inMemoryCustomFields[idx], ...req.body, id: req.params.id };
  saveLocalCustomFields(inMemoryCustomFields);
  return res.json({ success: true, field: inMemoryCustomFields[idx] });
});
app.delete("/api/admin/custom-fields/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const initialLen = inMemoryCustomFields.length;
  inMemoryCustomFields = inMemoryCustomFields.filter((f) => f.id !== req.params.id);
  if (inMemoryCustomFields.length === initialLen) return res.status(404).json({ success: false, error: "Champ introuvable." });
  saveLocalCustomFields(inMemoryCustomFields);
  return res.json({ success: true, message: "Champ supprim\xE9." });
});
var DEFAULT_SETTINGS = {
  site_name: "Kinimmo RDC",
  contact_email: "contact@kinimmo.cd",
  support_phone: "+243 84 529 4616",
  support_whatsapp: "+243 84 529 4616",
  office_address: "Boulevard du 30 Juin, Gombe, Kinshasa",
  working_hours: "Lun - Sam : 08h30 - 18h00",
  exchange_rate_usd_cdf: 2850,
  exchange_rate_updated_at: "2026-11-18T10:00:00.000Z",
  default_currency: "USD",
  auto_approve_properties: true,
  featured_slots_limit: DEFAULT_FEATURED_SLOTS_LIMIT,
  vip_enabled: true,
  vip_title: "Conciergerie Priv\xE9e & VIP Kinshasa",
  vip_subtitle: "Accompagnement sur mesure pour r\xE9sidences et investissements",
  vip_phone: "+243 84 529 4616",
  vip_whatsapp: "+243 84 529 4616",
  vip_email: "vip@kinimmo.cd",
  vip_message: "Bonjour, je souhaite b\xE9n\xE9ficier du service de conciergerie VIP Kinimmo.",
  vip_description: "Visites priv\xE9es, v\xE9rifications juridiques et n\xE9gociation cl\xE9 en main.",
  virtual_tour_allowed_domains: JSON.stringify(DEFAULT_VIRTUAL_TOUR_DOMAINS)
};
var inMemorySettings = (() => {
  try {
    if (fs2.existsSync(LOCAL_SETTINGS_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_SETTINGS_FILE, "utf-8"));
      if (parsed && typeof parsed === "object") return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
  }
  return { ...DEFAULT_SETTINGS };
})();
function saveLocalSettings(settings) {
  try {
    fs2.writeFileSync(LOCAL_SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch {
  }
}
app.get("/api/settings/contact", (_req, res) => {
  return res.json({ success: true, settings: inMemorySettings });
});
app.get("/api/settings", (_req, res) => {
  return res.json({ success: true, settings: inMemorySettings });
});
app.get("/api/admin/settings", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  return res.json({ success: true, settings: inMemorySettings });
});
app.put("/api/admin/settings", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const incoming = { ...req.body || {} };
  let updatedRate = null;
  if (Object.prototype.hasOwnProperty.call(incoming, "exchange_rate_usd_cdf")) {
    const parsedRate = Number(incoming.exchange_rate_usd_cdf);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      return res.status(400).json({ success: false, error: "Le taux de change USD/CDF doit \xEAtre un nombre strictement positif." });
    }
    updatedRate = Math.round(parsedRate * 100) / 100;
    incoming.exchange_rate_usd_cdf = updatedRate;
    incoming.exchange_rate_updated_at = (/* @__PURE__ */ new Date()).toISOString();
  }
  if (Object.prototype.hasOwnProperty.call(incoming, "default_currency")) {
    const curr = String(incoming.default_currency || "USD").trim().toUpperCase();
    incoming.default_currency = curr === "CDF" ? "CDF" : "USD";
  }
  if (incoming.featured_slots_limit !== void 0) {
    incoming.featured_slots_limit = parseFeaturedSlotsLimit(incoming.featured_slots_limit);
  }
  inMemorySettings = { ...inMemorySettings, ...incoming, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
  saveLocalSettings(inMemorySettings);
  if (updatedRate !== null) {
    inMemoryPlans = inMemoryPlans.map((p) => normalizeServerPlan(p, updatedRate));
    saveLocalPlans(inMemoryPlans);
    inMemoryOptions = inMemoryOptions.map((opt) => {
      const priceUsd = Number(opt.price_usd ?? opt.price ?? 0);
      const priceCdf = priceUsd > 0 ? Math.round(priceUsd * updatedRate) : Number(opt.price_cdf ?? opt.priceCDF ?? 0);
      return { ...opt, price_cdf: priceCdf, priceCDF: priceCdf };
    });
    saveLocalOptions(inMemoryOptions);
  }
  return res.json({ success: true, message: "Param\xE8tres mis \xE0 jour.", settings: inMemorySettings });
});
var inMemoryAgencies = (() => {
  try {
    if (fs2.existsSync(LOCAL_AGENCIES_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_AGENCIES_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
  }
  return Array.isArray(initialAgencies) ? [...initialAgencies] : [];
})();
function saveLocalAgencies(list) {
  try {
    fs2.writeFileSync(LOCAL_AGENCIES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
  }
}
var inMemoryAgents = (() => {
  try {
    if (fs2.existsSync(LOCAL_AGENTS_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_AGENTS_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
  }
  return Array.isArray(initialAgents) ? [...initialAgents] : [];
})();
function saveLocalAgents(list) {
  try {
    fs2.writeFileSync(LOCAL_AGENTS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
  }
}
var normalizeAgentRecord = (a) => ({
  ...a,
  name: a.name || "Agent Immobilier",
  title: a.title || "Agent Immobilier Agr\xE9\xE9",
  avatar: a.avatar || "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80",
  phone: a.phone || "+243 81 000 0000",
  whatsapp: a.whatsapp || a.phone || "+243 81 000 0000",
  bio: a.bio || "Agent immobilier partenaire certifi\xE9 \xE0 Kinshasa.",
  rating: typeof a.rating === "number" ? a.rating : 5,
  reviewCount: typeof a.reviewCount === "number" ? a.reviewCount : 1,
  specialties: Array.isArray(a.specialties) ? a.specialties : ["R\xE9sidentiel", "Commercial", "Conseil Immobilier"],
  languages: Array.isArray(a.languages) ? a.languages : ["Fran\xE7ais", "Lingala"]
});
var normalizeAgencyRecord = (ag) => ({
  ...ag,
  name: ag.name || ag.agencyName || "Agence Immobili\xE8re",
  logo: ag.logo || ag.avatar || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80",
  address: ag.address || "Kinshasa, RDC",
  city: ag.city || "Kinshasa",
  phone: ag.phone || "+243 81 000 00 00",
  whatsapp: ag.whatsapp || ag.phone || "+243 81 000 00 00",
  rccm: ag.rccm || ag.rccmOrNif,
  description: ag.description || "Agence immobili\xE8re partenaire \xE0 Kinshasa.",
  specialties: Array.isArray(ag.specialties) ? ag.specialties : ["Achat & Vente", "Location", "Conseil"],
  agentsCount: typeof ag.agentsCount === "number" ? ag.agentsCount : 1
});
var getMergedAgents = () => {
  const byId = /* @__PURE__ */ new Map();
  inMemoryAgents.forEach((a) => byId.set(a.id, normalizeAgentRecord(a)));
  inMemoryUsers.filter((u) => u.role === "agent").forEach((u) => {
    const { password: _p, ...safe } = u;
    const existing = byId.get(u.id) || {};
    byId.set(u.id, normalizeAgentRecord({
      ...safe,
      ...existing,
      id: u.id,
      name: existing.name || u.name,
      email: u.email,
      phone: existing.phone || u.phone,
      whatsapp: existing.whatsapp || u.whatsapp || u.phone,
      agencyName: existing.agencyName || u.agencyName,
      isVerified: Boolean(u.isVerified ?? existing.isVerified),
      listingsCount: inMemoryProperties.filter((p) => p.agentId === u.id || p.userId === u.id).length
    }));
  });
  return Array.from(byId.values());
};
var getMergedAgencies = () => {
  const byId = /* @__PURE__ */ new Map();
  inMemoryAgencies.forEach((ag) => byId.set(ag.id, normalizeAgencyRecord(ag)));
  inMemoryUsers.filter((u) => u.role === "agency").forEach((u) => {
    const { password: _p, ...safe } = u;
    const agId = u.agencyId || u.id;
    const existing = byId.get(agId) || {};
    byId.set(agId, normalizeAgencyRecord({
      ...safe,
      ...existing,
      id: agId,
      userId: u.id,
      name: existing.name || u.agencyName || u.name,
      email: existing.email || u.email,
      phone: existing.phone || u.phone,
      whatsapp: existing.whatsapp || u.whatsapp || u.phone,
      rccmOrNif: existing.rccmOrNif || u.rccmOrNif,
      isVerified: Boolean(u.isVerified ?? existing.isVerified),
      listingsCount: inMemoryProperties.filter((p) => p.agencyId === agId || p.userId === u.id).length
    }));
  });
  return Array.from(byId.values());
};
app.get("/api/agents", (_req, res) => {
  const agents = getMergedAgents();
  return res.json({ success: true, count: agents.length, agents });
});
app.get("/api/agents/:id", (req, res) => {
  const agent = getMergedAgents().find((a) => a.id === req.params.id);
  if (!agent) return res.status(404).json({ success: false, error: "Agent introuvable." });
  return res.json({ success: true, agent });
});
app.put("/api/agents/profile", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const { password: _p, role: _r, isVerified: _v, kinshasaBadgeVerified: _k, id: _id, ...safeBody } = req.body || {};
  const uIdx = inMemoryUsers.findIndex((u) => u.id === user.id);
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = { ...inMemoryUsers[uIdx], ...safeBody };
    saveLocalUsers(inMemoryUsers);
  }
  const aIdx = inMemoryAgents.findIndex((a) => a.id === user.id);
  if (aIdx !== -1) {
    inMemoryAgents[aIdx] = { ...inMemoryAgents[aIdx], ...safeBody };
  } else {
    inMemoryAgents.push({ id: user.id, name: user.name, email: user.email, ...safeBody });
  }
  saveLocalAgents(inMemoryAgents);
  return res.json({ success: true, message: "Profil agent mis \xE0 jour.", agent: getMergedAgents().find((a) => a.id === user.id) });
});
app.get("/api/agencies", (_req, res) => {
  const agencies = getMergedAgencies();
  return res.json({ success: true, count: agencies.length, agencies });
});
app.get("/api/agencies/:id", (req, res) => {
  const agency = getMergedAgencies().find((a) => a.id === req.params.id || a.userId === req.params.id);
  if (!agency) return res.status(404).json({ success: false, error: "Agence introuvable." });
  return res.json({ success: true, agency });
});
app.put("/api/agencies/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const { id } = req.params;
  if (user.role !== "admin" && user.id !== id && user.agencyId !== id) {
    return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
  }
  const { password: _p, role: _r, isVerified: _v, kinshasaBadgeVerified: _k, ...safeBody } = req.body || {};
  const idx = inMemoryAgencies.findIndex((a) => a.id === id);
  if (idx !== -1) {
    inMemoryAgencies[idx] = { ...inMemoryAgencies[idx], ...safeBody, id };
  } else {
    inMemoryAgencies.push({ id, ...safeBody });
  }
  saveLocalAgencies(inMemoryAgencies);
  return res.json({ success: true, message: "Agence mise \xE0 jour.", agency: getMergedAgencies().find((a) => a.id === id) });
});
var inMemoryFavorites = (() => {
  try {
    if (fs2.existsSync(LOCAL_FAVORITES_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_FAVORITES_FILE, "utf-8"));
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
  }
  return {};
})();
function saveLocalFavorites(map) {
  try {
    fs2.writeFileSync(LOCAL_FAVORITES_FILE, JSON.stringify(map, null, 2), "utf-8");
  } catch {
  }
}
app.get("/api/favorites", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const propIds = inMemoryFavorites[user.id] || [];
  const favorites = inMemoryProperties.filter((p) => propIds.includes(p.id));
  return res.json({ success: true, count: favorites.length, propertyIds: propIds, favorites });
});
app.post("/api/favorites/:propertyId", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const { propertyId } = req.params;
  const current = new Set(inMemoryFavorites[user.id] || []);
  current.add(propertyId);
  inMemoryFavorites[user.id] = Array.from(current);
  saveLocalFavorites(inMemoryFavorites);
  return res.json({ success: true, propertyIds: inMemoryFavorites[user.id] });
});
app.delete("/api/favorites/:propertyId", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const { propertyId } = req.params;
  inMemoryFavorites[user.id] = (inMemoryFavorites[user.id] || []).filter((id) => id !== propertyId);
  saveLocalFavorites(inMemoryFavorites);
  return res.json({ success: true, propertyIds: inMemoryFavorites[user.id] });
});
app.get("/api/favorites/check/:propertyId", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const isFavorite = (inMemoryFavorites[user.id] || []).includes(req.params.propertyId);
  return res.json({ success: true, isFavorite });
});
var inMemoryMessages = (() => {
  try {
    if (fs2.existsSync(LOCAL_MESSAGES_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_MESSAGES_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
  }
  return [];
})();
function saveLocalMessages(list) {
  try {
    fs2.writeFileSync(LOCAL_MESSAGES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
  }
}
var inMemoryCrmLeads = (() => {
  try {
    if (fs2.existsSync(LOCAL_CRM_LEADS_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_CRM_LEADS_FILE, "utf-8"));
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
  }
  return Array.isArray(initialLeads) ? [...initialLeads] : [];
})();
function saveLocalCrmLeads(list) {
  try {
    fs2.writeFileSync(LOCAL_CRM_LEADS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
  }
}
app.post("/api/messages", publicSubmissionRateLimiter, (req, res) => {
  const authUser = getAuthUser(req);
  const body = req.body || {};
  const { propertyId, agentId, senderName, senderEmail, senderPhone, message, type = "info", visitDate } = body;
  if (!senderName || !message) {
    return res.status(400).json({ success: false, error: "Nom et message requis." });
  }
  const prop = propertyId ? inMemoryProperties.find((p) => p.id === propertyId) : null;
  const record = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    propertyId: propertyId || null,
    propertyTitle: prop?.title || body.propertyTitle || null,
    agentId: agentId || prop?.agentId || prop?.userId || null,
    agencyId: prop?.agencyId || null,
    senderUserId: authUser?.id || null,
    senderName,
    senderEmail: senderEmail || "",
    senderPhone: senderPhone || "",
    message,
    type,
    visitDate: visitDate || null,
    status: "new",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  inMemoryMessages.unshift(record);
  saveLocalMessages(inMemoryMessages);
  inMemoryCrmLeads.unshift({
    id: record.id,
    propertyId: record.propertyId,
    propertyTitle: record.propertyTitle,
    agentId: record.agentId,
    agencyId: record.agencyId,
    name: senderName,
    email: senderEmail || "",
    phone: senderPhone || "",
    message,
    type: type === "tour" ? "visit" : "inquiry",
    status: "new",
    createdAt: record.createdAt
  });
  saveLocalCrmLeads(inMemoryCrmLeads);
  return res.status(201).json({ success: true, message: "Message envoy\xE9 avec succ\xE8s.", data: record });
});
app.get("/api/messages/inbox", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  let list = [...inMemoryMessages];
  if (user.role !== "admin") {
    list = list.filter((m) => m.agentId === user.id || m.agencyId === (user.agencyId || user.id) || m.senderUserId === user.id);
  }
  return res.json({ success: true, count: list.length, messages: list });
});
app.put("/api/messages/:id/status", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const idx = inMemoryMessages.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Message introuvable." });
  const msg = inMemoryMessages[idx];
  if (user.role !== "admin" && msg.agentId !== user.id && msg.agencyId !== (user.agencyId || user.id)) {
    return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
  }
  inMemoryMessages[idx].status = req.body?.status || "read";
  inMemoryMessages[idx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveLocalMessages(inMemoryMessages);
  return res.json({ success: true, data: inMemoryMessages[idx] });
});
app.get("/api/leads", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  let list = [...inMemoryCrmLeads];
  if (user.role !== "admin") {
    list = list.filter((l) => l.agentId === user.id || l.agencyId === (user.agencyId || user.id));
  }
  return res.json({ success: true, count: list.length, leads: list, data: list });
});
app.post("/api/leads", publicSubmissionRateLimiter, (req, res) => {
  const body = req.body || {};
  const cleanName = String(body.name || body.clientName || "").trim();
  const cleanMessage = String(body.message || body.notes || "").trim();
  if (!cleanName && !body.email && !body.phone) {
    return res.status(400).json({ success: false, error: "Nom ou coordonn\xE9es du contact requis." });
  }
  const linkedProp = body.propertyId ? inMemoryProperties.find((p) => p.id === body.propertyId) : null;
  const lead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    propertyId: body.propertyId || null,
    propertyTitle: linkedProp?.title || body.propertyTitle || "",
    agentId: linkedProp?.agentId || body.agentId || null,
    agencyId: linkedProp?.agencyId || body.agencyId || null,
    name: cleanName || "Visiteur Kinimmo",
    email: String(body.email || "").trim(),
    phone: String(body.phone || "").trim(),
    message: cleanMessage,
    type: String(body.type || "inquiry"),
    status: "new",
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  inMemoryCrmLeads.unshift(lead);
  saveLocalCrmLeads(inMemoryCrmLeads);
  if (lead.propertyId) {
    const pIdx = inMemoryProperties.findIndex((p) => p.id === lead.propertyId);
    if (pIdx !== -1) {
      inMemoryProperties[pIdx].leadsCount = (inMemoryProperties[pIdx].leadsCount || 0) + 1;
      saveLocalProperties(inMemoryProperties);
    }
    const nowMs = Date.now();
    let updatedInv = false;
    inMemoryInvoices.forEach((inv) => {
      if ((inv.invoice_type === "boost" || inv.invoiceType === "boost") && inv.property_id === lead.propertyId && inv.status === "paid" && isBoostWindowActive(inv.starts_at, inv.expires_at, nowMs)) {
        inv.contacts_during_acc = Number(inv.contacts_during_acc || 0) + 1;
        updatedInv = true;
      }
    });
    if (updatedInv) saveLocalInvoices(inMemoryInvoices);
  }
  return res.status(201).json({ success: true, lead, data: lead });
});
app.put("/api/leads/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const idx = inMemoryCrmLeads.findIndex((l) => l.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Lead introuvable." });
  if (user.role !== "admin" && inMemoryCrmLeads[idx].agentId !== user.id && inMemoryCrmLeads[idx].agencyId !== (user.agencyId || user.id)) {
    return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
  }
  inMemoryCrmLeads[idx] = { ...inMemoryCrmLeads[idx], ...req.body || {}, id: req.params.id, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  saveLocalCrmLeads(inMemoryCrmLeads);
  return res.json({ success: true, lead: inMemoryCrmLeads[idx], data: inMemoryCrmLeads[idx] });
});
app.get("/api/invoices", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const list = user.role === "admin" ? inMemoryInvoices : inMemoryInvoices.filter((i) => i.user_id === user.id);
  return res.json({ success: true, count: list.length, invoices: list, data: list });
});
var inMemoryAnalytics = (() => {
  try {
    if (fs2.existsSync(LOCAL_ANALYTICS_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_ANALYTICS_FILE, "utf-8"));
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
  }
  return {};
})();
function saveLocalAnalytics(data) {
  try {
    fs2.writeFileSync(LOCAL_ANALYTICS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
  }
}
app.post("/api/analytics/track", (req, res) => {
  const { propertyId, eventType = "view" } = req.body || {};
  if (!propertyId) return res.status(400).json({ success: false, error: "propertyId requis." });
  if (!inMemoryAnalytics[propertyId]) {
    inMemoryAnalytics[propertyId] = { views: 0, whatsapp: 0, phone: 0, shares: 0, favorites: 0 };
  }
  if (eventType === "view") inMemoryAnalytics[propertyId].views += 1;
  else if (eventType === "whatsapp") inMemoryAnalytics[propertyId].whatsapp += 1;
  else if (eventType === "phone" || eventType === "call") inMemoryAnalytics[propertyId].phone += 1;
  else if (eventType === "share") inMemoryAnalytics[propertyId].shares += 1;
  else if (eventType === "favorite") inMemoryAnalytics[propertyId].favorites += 1;
  saveLocalAnalytics(inMemoryAnalytics);
  const pIdx = inMemoryProperties.findIndex((p) => p.id === propertyId);
  if (pIdx !== -1) {
    if (eventType === "view") {
      inMemoryProperties[pIdx].viewsCount = (inMemoryProperties[pIdx].viewsCount || 0) + 1;
    } else if (eventType === "whatsapp") {
      inMemoryProperties[pIdx].whatsappClicks = (inMemoryProperties[pIdx].whatsappClicks || 0) + 1;
    } else if (eventType === "phone" || eventType === "call") {
      inMemoryProperties[pIdx].phoneCalls = (inMemoryProperties[pIdx].phoneCalls || 0) + 1;
    }
    saveLocalProperties(inMemoryProperties);
  }
  if (eventType === "view" || eventType === "whatsapp" || eventType === "phone" || eventType === "call") {
    const nowMs = Date.now();
    let updatedInv = false;
    inMemoryInvoices.forEach((inv) => {
      if ((inv.invoice_type === "boost" || inv.invoiceType === "boost") && inv.property_id === propertyId && inv.status === "paid" && isBoostWindowActive(inv.starts_at, inv.expires_at, nowMs)) {
        if (eventType === "view") inv.views_during_acc = Number(inv.views_during_acc || 0) + 1;
        else inv.contacts_during_acc = Number(inv.contacts_during_acc || 0) + 1;
        updatedInv = true;
      }
    });
    if (updatedInv) saveLocalInvoices(inMemoryInvoices);
  }
  return res.json({ success: true, stats: inMemoryAnalytics[propertyId] });
});
app.get("/api/analytics/property/:id", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const prop = inMemoryProperties.find((p) => p.id === req.params.id);
  if (!prop && user.role !== "admin") {
    return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
  }
  if (prop && !canManageProperty(user, prop)) {
    return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
  }
  const stats = inMemoryAnalytics[req.params.id] || { views: prop?.viewsCount || 0, whatsapp: 0, phone: 0, shares: 0, favorites: 0 };
  return res.json({ success: true, stats });
});
app.get("/api/analytics/my-performance", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  const myProps = inMemoryProperties.filter((p) => canManageProperty(user, p));
  const summary = myProps.reduce(
    (acc, p) => {
      const s = inMemoryAnalytics[p.id] || { views: p.viewsCount || 0, whatsapp: 0, phone: 0, shares: 0, favorites: 0 };
      acc.views += s.views || p.viewsCount || 0;
      acc.whatsapp += s.whatsapp || 0;
      acc.phone += s.phone || 0;
      acc.shares += s.shares || 0;
      acc.favorites += s.favorites || 0;
      return acc;
    },
    { propertiesCount: myProps.length, views: 0, whatsapp: 0, phone: 0, shares: 0, favorites: 0 }
  );
  return res.json({ success: true, summary });
});
var sanitizeUser = (u) => sanitizePublicUser(u);
app.get("/api/users", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const users = inMemoryUsers.map(sanitizeUser);
  return res.json({ success: true, count: users.length, users, data: users });
});
app.get("/api/users/:id", (req, res) => {
  const target = inMemoryUsers.find((u) => u.id === req.params.id);
  if (!target) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
  const authUser = getAuthUser(req);
  if (authUser && (authUser.id === target.id || authUser.role === "admin")) {
    return res.json({ success: true, user: sanitizeUser(target) });
  }
  return res.json({
    success: true,
    user: {
      id: target.id,
      name: target.name,
      role: target.role,
      agencyName: target.agencyName,
      avatar: target.avatar,
      isVerified: Boolean(target.isVerified)
    }
  });
});
app.put("/api/users/:id", (req, res) => {
  const authUser = getAuthUser(req);
  if (!authUser) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (authUser.role !== "admin" && authUser.id !== req.params.id) {
    return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
  }
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
  const body = req.body || {};
  if (authUser.role !== "admin") {
    const {
      password: _p,
      passwordHash: _ph,
      passwordUpdatedAt: _pu,
      role: _r,
      id: _id,
      email: _e,
      pendingEmail: _pe,
      emailVerified: _ev,
      emailVerifiedAt: _eva,
      termsAcceptedVersion: _tav,
      termsAcceptedAt: _taa,
      isVerified: _v,
      kinshasaBadgeVerified: _k,
      ...safeBody
    } = body;
    if (safeBody.phone !== void 0 && String(safeBody.phone).trim()) {
      const phoneRes = normalizePhoneRdc(String(safeBody.phone));
      if (!phoneRes.valid || !phoneRes.normalized) {
        return res.status(400).json({ success: false, error: phoneRes.error || "Num\xE9ro +243 invalide." });
      }
      safeBody.phone = phoneRes.normalized;
    }
    inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...safeBody, id: req.params.id };
  } else {
    const { id: _id, password: _p, passwordHash: _ph, ...adminBody } = body;
    inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...adminBody, id: req.params.id };
  }
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, user: sanitizeUser(inMemoryUsers[idx]) });
});
app.get("/api/admin/stats", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const communeMap = /* @__PURE__ */ new Map();
  inMemoryProperties.forEach((p) => {
    const c = p.commune || "Kinshasa";
    communeMap.set(c, (communeMap.get(c) || 0) + 1);
  });
  const topCommunes = Array.from(communeMap.entries()).map(([commune, count]) => ({ commune, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  return res.json({
    success: true,
    stats: {
      totalUsers: inMemoryUsers.length,
      totalProperties: inMemoryProperties.length,
      activeProperties: inMemoryProperties.filter((p) => p.published !== false && p.status !== "sold").length,
      soldProperties: inMemoryProperties.filter((p) => p.status === "sold" || p.listingStatus === "SOLD").length,
      totalAgents: getMergedAgents().length,
      totalAgencies: getMergedAgencies().length,
      totalMessages: inMemoryMessages.length,
      totalRevenueUsd: inMemoryInvoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + Number(i.amount || 0), 0),
      topCommunes
    }
  });
});
app.get("/api/admin/users", (req, res) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (user.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  return res.json({ success: true, count: inMemoryUsers.length, users: inMemoryUsers.map(sanitizeUser) });
});
app.post("/api/admin/users", async (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const { name, email, password, phone, role = "user", agencyName, rccmOrNif, emailVerified } = req.body || {};
  const cleanEmail = email ? normalizeEmailAddress(String(email)) : "";
  const phoneRes = phone ? normalizePhoneRdc(String(phone)) : { valid: true, normalized: "" };
  const cleanPhone = phoneRes.normalized || "";
  if (phone && !phoneRes.valid) {
    return res.status(400).json({ success: false, error: phoneRes.error || "Num\xE9ro +243 invalide." });
  }
  if (!cleanEmail && !cleanPhone) {
    return res.status(400).json({ success: false, error: "Un e-mail ou un num\xE9ro +243 est requis." });
  }
  if (cleanEmail && !isValidEmailAddress(cleanEmail)) {
    return res.status(400).json({ success: false, error: "Adresse e-mail invalide." });
  }
  if (!password) {
    return res.status(400).json({ success: false, error: "Mot de passe requis." });
  }
  const pwdCheck = validatePasswordPolicy(String(password), {
    name: String(name || ""),
    email: cleanEmail,
    phone: cleanPhone
  });
  if (!pwdCheck.valid) {
    return res.status(400).json({ success: false, error: pwdCheck.error || "Mot de passe non conforme." });
  }
  if (cleanEmail && inMemoryUsers.some((u) => u.email && u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ success: false, error: "Cet email est d\xE9j\xE0 utilis\xE9." });
  }
  if (cleanPhone && inMemoryUsers.some((u) => u.phone && normalizePhoneRdc(u.phone).normalized === cleanPhone)) {
    return res.status(409).json({ success: false, error: "Ce num\xE9ro +243 est d\xE9j\xE0 utilis\xE9." });
  }
  const normalizedRole = role === "admin" ? "admin" : normalizeAccountRole(String(role));
  const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const passwordHash = await hashPasswordBcrypt(String(password));
  const isEmailConfirmed = Boolean(cleanEmail) && (emailVerified !== void 0 ? Boolean(emailVerified) : true);
  const record = {
    id: newId,
    name: String(name || (cleanEmail ? cleanEmail.split("@")[0] : cleanPhone)).trim(),
    email: cleanEmail,
    passwordHash,
    phone: cleanPhone,
    role: normalizedRole,
    agencyId: normalizedRole === "agency" ? newId : void 0,
    agencyName: agencyName ? String(agencyName).trim() : void 0,
    rccmOrNif: rccmOrNif ? String(rccmOrNif).trim() : void 0,
    isVerified: false,
    emailVerified: isEmailConfirmed,
    emailVerifiedAt: isEmailConfirmed ? nowIso : void 0,
    kinshasaBadgeVerified: false,
    termsAcceptedVersion: TERMS_VERSION,
    termsAcceptedAt: nowIso,
    passwordUpdatedAt: nowIso,
    createdAt: nowIso
  };
  inMemoryUsers.unshift(record);
  saveLocalUsers(inMemoryUsers);
  return res.status(201).json({ success: true, user: sanitizeUser(record) });
});
app.put("/api/admin/users/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
  const { id: _id, password: _p, passwordHash: _ph, ...updates } = req.body || {};
  if (updates.email !== void 0) {
    updates.email = updates.email ? normalizeEmailAddress(String(updates.email)) : "";
  }
  if (updates.phone !== void 0 && String(updates.phone).trim()) {
    const phoneRes = normalizePhoneRdc(String(updates.phone));
    if (!phoneRes.valid || !phoneRes.normalized) {
      return res.status(400).json({ success: false, error: phoneRes.error || "Num\xE9ro +243 invalide." });
    }
    updates.phone = phoneRes.normalized;
  }
  inMemoryUsers[idx] = { ...inMemoryUsers[idx], ...updates, id: req.params.id };
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, user: sanitizeUser(inMemoryUsers[idx]) });
});
app.put("/api/admin/users/:id/role", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
  const { role } = req.body || {};
  if (!["admin", "agent", "agency", "user", "owner"].includes(role)) {
    return res.status(400).json({ success: false, error: "R\xF4le invalide." });
  }
  inMemoryUsers[idx].role = role;
  if (role === "agency" && !inMemoryUsers[idx].agencyId) {
    inMemoryUsers[idx].agencyId = inMemoryUsers[idx].id;
  }
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, user: sanitizeUser(inMemoryUsers[idx]) });
});
app.put("/api/admin/users/:id/verify", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
  const verified = req.body?.isVerified !== void 0 ? Boolean(req.body.isVerified) : true;
  inMemoryUsers[idx].isVerified = verified;
  inMemoryUsers[idx].kinshasaBadgeVerified = verified;
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, user: sanitizeUser(inMemoryUsers[idx]) });
});
app.put("/api/admin/users/:id/reset-password", async (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const idx = inMemoryUsers.findIndex((u) => u.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
  const newPassword = String(req.body?.newPassword || req.body?.password || "");
  const target = inMemoryUsers[idx];
  const pwdCheck = validatePasswordPolicy(newPassword, {
    name: target.name,
    email: target.email,
    phone: target.phone
  });
  if (!pwdCheck.valid) {
    return res.status(400).json({ success: false, error: pwdCheck.error || "Mot de passe non conforme." });
  }
  target.passwordHash = await hashPasswordBcrypt(newPassword);
  delete target.password;
  target.passwordUpdatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveLocalUsers(inMemoryUsers);
  revokeAllUserSessions(target.id, "admin_password_reset");
  return res.json({ success: true, message: "Mot de passe r\xE9initialis\xE9 avec succ\xE8s et sessions r\xE9voqu\xE9es." });
});
app.delete("/api/admin/users/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  if (req.params.id === admin.id) {
    return res.status(400).json({ success: false, error: "Impossible de supprimer votre propre compte administrateur actif." });
  }
  const initialLen = inMemoryUsers.length;
  inMemoryUsers = inMemoryUsers.filter((u) => u.id !== req.params.id);
  if (inMemoryUsers.length === initialLen) return res.status(404).json({ success: false, error: "Utilisateur introuvable." });
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, message: "Utilisateur supprim\xE9." });
});
app.get("/api/admin/properties", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  return res.json({ success: true, count: inMemoryProperties.length, properties: inMemoryProperties });
});
app.put("/api/admin/properties/:id/status", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const idx = inMemoryProperties.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
  const { status, published, featured } = req.body || {};
  if (status !== void 0) {
    inMemoryProperties[idx].status = status;
    if (String(status).toUpperCase() === "PUBLISHED") inMemoryProperties[idx].listingStatus = "PUBLISHED";
    else if (String(status).toUpperCase() === "ARCHIVED") inMemoryProperties[idx].listingStatus = "ARCHIVED";
    else if (String(status).toUpperCase() === "SOLD") inMemoryProperties[idx].listingStatus = "SOLD";
  }
  if (published !== void 0) inMemoryProperties[idx].published = Boolean(published);
  if (featured !== void 0) inMemoryProperties[idx].featured = Boolean(featured);
  inMemoryProperties[idx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  saveLocalProperties(inMemoryProperties);
  return res.json({ success: true, property: inMemoryProperties[idx] });
});
app.delete("/api/admin/properties/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const target = inMemoryProperties.find((p) => p.id === req.params.id);
  if (!target) return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
  if (Array.isArray(target.images)) {
    target.images.forEach((u) => {
      if (u && u.includes("cloudinary.com")) destroyFromCloudinaryServer({ url: u, resourceType: "image" }).catch(() => {
      });
    });
  }
  if (target.floorPlanUrl && target.floorPlanUrl.includes("cloudinary.com")) {
    destroyFromCloudinaryServer({ url: target.floorPlanUrl, publicId: target.floorPlanPublicId, resourceType: "image" }).catch(() => {
    });
  }
  if (target.videoUrl && target.videoUrl.includes("cloudinary.com")) {
    destroyFromCloudinaryServer({ url: target.videoUrl, publicId: target.videoPublicId, resourceType: "video" }).catch(() => {
    });
  }
  inMemoryProperties = inMemoryProperties.filter((p) => p.id !== req.params.id);
  saveLocalProperties(inMemoryProperties);
  return res.json({ success: true, message: "Propri\xE9t\xE9 supprim\xE9e." });
});
app.get("/api/admin/agents", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const agents = getMergedAgents();
  return res.json({ success: true, count: agents.length, agents });
});
app.put("/api/admin/agents/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const { id } = req.params;
  const uIdx = inMemoryUsers.findIndex((u) => u.id === id);
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = { ...inMemoryUsers[uIdx], ...req.body || {}, id };
    saveLocalUsers(inMemoryUsers);
  }
  const aIdx = inMemoryAgents.findIndex((a) => a.id === id);
  if (aIdx !== -1) {
    inMemoryAgents[aIdx] = { ...inMemoryAgents[aIdx], ...req.body || {}, id };
    saveLocalAgents(inMemoryAgents);
  }
  return res.json({ success: true, agent: getMergedAgents().find((a) => a.id === id) });
});
app.delete("/api/admin/agents/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  inMemoryAgents = inMemoryAgents.filter((a) => a.id !== req.params.id);
  inMemoryUsers = inMemoryUsers.filter((u) => u.id !== req.params.id);
  saveLocalAgents(inMemoryAgents);
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, message: "Agent supprim\xE9." });
});
app.get("/api/admin/agencies", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const agencies = getMergedAgencies();
  return res.json({ success: true, count: agencies.length, agencies });
});
app.put("/api/admin/agencies/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const { id } = req.params;
  const agIdx = inMemoryAgencies.findIndex((a) => a.id === id);
  if (agIdx !== -1) {
    inMemoryAgencies[agIdx] = { ...inMemoryAgencies[agIdx], ...req.body || {}, id };
  } else {
    inMemoryAgencies.push({ id, ...req.body || {} });
  }
  saveLocalAgencies(inMemoryAgencies);
  const uIdx = inMemoryUsers.findIndex((u) => u.id === id || u.agencyId === id);
  if (uIdx !== -1) {
    inMemoryUsers[uIdx] = { ...inMemoryUsers[uIdx], ...req.body || {}, id: inMemoryUsers[uIdx].id };
    saveLocalUsers(inMemoryUsers);
  }
  return res.json({ success: true, agency: getMergedAgencies().find((a) => a.id === id) });
});
app.delete("/api/admin/agencies/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  inMemoryAgencies = inMemoryAgencies.filter((a) => a.id !== req.params.id);
  inMemoryUsers = inMemoryUsers.filter((u) => u.id !== req.params.id && u.agencyId !== req.params.id);
  saveLocalAgencies(inMemoryAgencies);
  saveLocalUsers(inMemoryUsers);
  return res.json({ success: true, message: "Agence supprim\xE9e." });
});
function loadLocalBlogArticles() {
  try {
    if (fs2.existsSync(LOCAL_BLOG_ARTICLES_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_BLOG_ARTICLES_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Erreur lecture blog_articles_store.json:", e);
  }
  return [...DEFAULT_BLOG_ARTICLES];
}
function saveLocalBlogArticles(list) {
  try {
    fs2.writeFileSync(LOCAL_BLOG_ARTICLES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture blog_articles_store.json:", e);
  }
}
function loadLocalLegalDocuments() {
  try {
    if (fs2.existsSync(LOCAL_LEGAL_DOCS_FILE)) {
      const parsed = JSON.parse(fs2.readFileSync(LOCAL_LEGAL_DOCS_FILE, "utf-8"));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Erreur lecture legal_documents_store.json:", e);
  }
  return [...DEFAULT_LEGAL_DOCUMENTS];
}
function saveLocalLegalDocuments(list) {
  try {
    fs2.writeFileSync(LOCAL_LEGAL_DOCS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture legal_documents_store.json:", e);
  }
}
var inMemoryBlogArticles = loadLocalBlogArticles();
var inMemoryLegalDocuments = loadLocalLegalDocuments();
app.get("/api/content/articles", (req, res) => {
  const includeDrafts = String(req.query.include_drafts || "") === "true";
  const authUser = getAuthUser(req);
  const canSeeDrafts = includeDrafts && authUser?.role === "admin";
  const articles = canSeeDrafts ? inMemoryBlogArticles : inMemoryBlogArticles.filter((a) => a.isPublished !== false);
  return res.json({ success: true, articles });
});
app.get("/api/content/articles/:slug", (req, res) => {
  const authUser = getAuthUser(req);
  const found = inMemoryBlogArticles.find(
    (a) => a.slug === req.params.slug || a.id === req.params.slug
  );
  if (!found || found.isPublished === false && authUser?.role !== "admin") {
    return res.status(404).json({ success: false, error: "Article introuvable." });
  }
  return res.json({ success: true, article: found });
});
app.post("/api/content/articles", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const body = req.body || {};
  const title = String(body.title || "").trim();
  if (!title) return res.status(400).json({ success: false, error: "Le titre de l\u2019article est obligatoire." });
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const baseSlug = slugifyText(body.slug || title) || `article-${Date.now()}`;
  const slugExists = inMemoryBlogArticles.some((a) => a.slug === baseSlug && a.id !== body.id);
  const finalSlug = slugExists ? `${baseSlug}-${Date.now().toString().slice(-4)}` : baseSlug;
  const article = {
    id: body.id || `art_${Date.now()}`,
    slug: finalSlug,
    title,
    category: body.category || "achat_vente",
    excerpt: String(body.excerpt || "").trim(),
    content: String(body.content || "").trim(),
    coverImage: String(body.coverImage || "/og-images/blog_gombe_skyline_1795161879500.jpg").trim(),
    authorName: String(body.authorName || "R\xE9daction Kinimmo RDC").trim(),
    readingMinutes: Math.max(1, Number(body.readingMinutes || 5)),
    tags: Array.isArray(body.tags) ? body.tags : [],
    relatedNeighborhoodSlugs: Array.isArray(body.relatedNeighborhoodSlugs) ? body.relatedNeighborhoodSlugs : [],
    isFeatured: Boolean(body.isFeatured),
    isPublished: body.isPublished !== false,
    publishedAt: body.publishedAt || now,
    updatedAt: now
  };
  inMemoryBlogArticles = [article, ...inMemoryBlogArticles.filter((a) => a.id !== article.id)];
  saveLocalBlogArticles(inMemoryBlogArticles);
  return res.status(201).json({ success: true, article });
});
app.put("/api/content/articles/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const idx = inMemoryBlogArticles.findIndex(
    (a) => a.id === req.params.id || a.slug === req.params.id
  );
  if (idx === -1) return res.status(404).json({ success: false, error: "Article introuvable." });
  const body = req.body || {};
  const current = inMemoryBlogArticles[idx];
  const updated = {
    ...current,
    ...body,
    id: current.id,
    slug: body.slug ? slugifyText(body.slug) : current.slug,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  inMemoryBlogArticles[idx] = updated;
  saveLocalBlogArticles(inMemoryBlogArticles);
  return res.json({ success: true, article: updated });
});
app.delete("/api/content/articles/:id", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const initialLen = inMemoryBlogArticles.length;
  inMemoryBlogArticles = inMemoryBlogArticles.filter(
    (a) => a.id !== req.params.id && a.slug !== req.params.id
  );
  if (inMemoryBlogArticles.length === initialLen) {
    return res.status(404).json({ success: false, error: "Article introuvable." });
  }
  saveLocalBlogArticles(inMemoryBlogArticles);
  return res.json({ success: true, message: "Article supprim\xE9." });
});
app.get("/api/content/legal", (_req, res) => {
  return res.json({ success: true, documents: inMemoryLegalDocuments });
});
app.get("/api/content/legal/:slug", (req, res) => {
  const found = inMemoryLegalDocuments.find((d) => d.slug === req.params.slug);
  if (!found) return res.status(404).json({ success: false, error: "Document l\xE9gal introuvable." });
  return res.json({ success: true, document: found });
});
app.put("/api/content/legal/:slug", (req, res) => {
  const admin = getAuthUser(req);
  if (!admin) return res.status(401).json({ success: false, error: "Authentification requise." });
  if (admin.role !== "admin") return res.status(403).json({ success: false, error: "Acc\xE8s r\xE9serv\xE9 aux administrateurs." });
  const idx = inMemoryLegalDocuments.findIndex((d) => d.slug === req.params.slug);
  if (idx === -1) return res.status(404).json({ success: false, error: "Document l\xE9gal introuvable." });
  const body = req.body || {};
  const current = inMemoryLegalDocuments[idx];
  const updated = {
    ...current,
    ...body,
    slug: current.slug,
    lastUpdatedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    updatedBy: admin.name || admin.email
  };
  inMemoryLegalDocuments[idx] = updated;
  saveLocalLegalDocuments(inMemoryLegalDocuments);
  return res.json({ success: true, document: updated });
});
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "Kinimmo Conciergerie & Cloudinary Video API",
    cloudinary: {
      isConfigured: serverCloudinaryConfig.isConfigured,
      cloudName: serverCloudinaryConfig.cloudName
    },
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
function getSiteBaseUrl(req) {
  if (process.env.APP_URL && process.env.APP_URL !== "MY_APP_URL") {
    return process.env.APP_URL.replace(/\/+$/, "");
  }
  const host = req.get("x-forwarded-host") || req.get("host") || `localhost:${PORT}`;
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  return `${proto}://${host}`.replace(/\/+$/, "");
}
function resolveCanonicalListingPath(rawToken) {
  const matched = resolvePropertyBySlugOrId(rawToken, inMemoryProperties);
  if (matched) {
    return `/annonces/${encodeURIComponent(getPropertySlug(matched))}`;
  }
  return `/annonces/${encodeURIComponent(getPropertySlug({ id: rawToken }))}`;
}
app.get(["/annonce/:id", "/property/:id", "/bien/:id"], (req, res) => {
  return res.redirect(301, resolveCanonicalListingPath(req.params.id));
});
app.get("/quartier/:slug", (req, res) => {
  const cleanSlug = slugifyText(req.params.slug || "gombe") || "gombe";
  return res.redirect(301, `/quartiers/${encodeURIComponent(cleanSlug)}`);
});
app.get("/", (req, res, next) => {
  const legacyProp = req.query.property || req.query.prop || req.query.annonce || req.query.property_id;
  if (legacyProp && typeof legacyProp === "string" && legacyProp.trim()) {
    return res.redirect(301, resolveCanonicalListingPath(legacyProp.trim()));
  }
  const legacyCommune = req.query.commune;
  if (legacyCommune && typeof legacyCommune === "string" && legacyCommune.trim() && !req.query.status && !req.query.type && !req.query.search && !req.query.searchQuery && !req.query.tab) {
    const cleanSlug = slugifyText(legacyCommune.trim());
    if (cleanSlug) {
      return res.redirect(301, `/quartiers/${encodeURIComponent(cleanSlug)}`);
    }
  }
  return next();
});
app.get("/sitemap.xml", (req, res) => {
  try {
    const baseUrl = getSiteBaseUrl(req);
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const staticPages = [
      { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily", lastmod: today },
      { loc: `${baseUrl}/visites`, priority: "0.9", changefreq: "daily", lastmod: today },
      { loc: `${baseUrl}/conciergerie`, priority: "0.8", changefreq: "weekly", lastmod: today },
      { loc: `${baseUrl}/blog`, priority: "0.8", changefreq: "weekly", lastmod: today },
      { loc: `${baseUrl}/aide`, priority: "0.7", changefreq: "monthly", lastmod: today },
      { loc: `${baseUrl}/conditions-utilisation`, priority: "0.4", changefreq: "monthly", lastmod: today },
      { loc: `${baseUrl}/confidentialite`, priority: "0.4", changefreq: "monthly", lastmod: today },
      { loc: `${baseUrl}/mentions-legales`, priority: "0.4", changefreq: "monthly", lastmod: today }
    ];
    const neighborhoods = buildNeighborhoodDirectory(inMemoryProperties);
    const communePages = neighborhoods.map((n) => ({
      loc: `${baseUrl}/quartiers/${encodeURIComponent(n.slug)}`,
      priority: n.stats.activeCount > 0 ? "0.8" : "0.6",
      changefreq: "weekly",
      lastmod: today
    }));
    const articlePages = inMemoryBlogArticles.filter((a) => a && a.isPublished !== false).map((a) => ({
      loc: `${baseUrl}/blog/${encodeURIComponent(a.slug)}`,
      priority: "0.7",
      changefreq: "monthly",
      lastmod: String(a.updatedAt || a.publishedAt || today).split("T")[0]
    }));
    const publishedProps = inMemoryProperties.filter(
      (p) => p && p.published !== false && p.listingStatus !== "ARCHIVED" && p.listingStatus !== "REJECTED" && !p.hiddenByPlanDowngrade
    );
    const propertyPages = publishedProps.map((p) => {
      let lastmod = today;
      if (p.updatedAt) {
        lastmod = String(p.updatedAt).split("T")[0];
      } else if (p.createdAt) {
        lastmod = String(p.createdAt).split("T")[0];
      }
      return {
        loc: `${baseUrl}/annonces/${encodeURIComponent(getPropertySlug(p))}`,
        priority: p.featured ? "0.9" : "0.8",
        changefreq: "weekly",
        lastmod
      };
    });
    const allUrls = [...staticPages, ...communePages, ...articlePages, ...propertyPages];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allUrls.map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    ).join("\n")}
</urlset>`;
    res.header("Content-Type", "application/xml; charset=utf-8");
    res.header("Cache-Control", "public, max-age=3600");
    return res.send(xml);
  } catch (err) {
    console.error("Error generating dynamic sitemap:", err);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Erreur g\xE9n\xE9ration sitemap</error>');
  }
});
app.get("/robots.txt", (req, res) => {
  const baseUrl = getSiteBaseUrl(req);
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /agent-dashboard
Disallow: /agency-dashboard
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header("Content-Type", "text/plain; charset=utf-8");
  res.header("Cache-Control", "public, max-age=86400");
  return res.send(robots);
});
function escapeHtmlAttr(val) {
  return String(val || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeHtmlText(val) {
  return String(val || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function resolveAbsoluteAssetUrl(rawUrl, baseUrl) {
  const fallback = `${baseUrl}/og-images/blog_gombe_skyline_1795161879500.jpg`;
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) return fallback;
  const clean = rawUrl.trim();
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  if (clean.startsWith("/")) return `${baseUrl}${clean}`;
  return `${baseUrl}/${clean}`;
}
function resolveSeoMetadataForRequest(req, baseUrl) {
  const pathname = (req.path || "/").replace(/\/+$/, "") || "/";
  const defaultImage = `${baseUrl}/og-images/blog_gombe_skyline_1795161879500.jpg`;
  const listingMatch = pathname.match(/^\/annonces\/([^/?#]+)/i);
  if (listingMatch && listingMatch[1]) {
    const token = decodeURIComponent(listingMatch[1]);
    const prop = resolvePropertyBySlugOrId(token, inMemoryProperties);
    if (prop) {
      const slug = getPropertySlug(prop);
      const canonicalUrl = `${baseUrl}/annonces/${encodeURIComponent(slug)}`;
      const isSale = prop.status === "for-sale" || prop.category === "sale";
      const priceStr = formatPropertyPrimaryPriceWithPeriod(prop, getActiveExchangeRateServer(), true);
      const locStr = [prop.quartier, prop.commune || prop.city || "Kinshasa"].filter(Boolean).join(", ");
      const title = `${prop.title} \u2014 ${priceStr} \xE0 ${prop.commune || "Kinshasa"} | Kinimmo`;
      const rawDesc = prop.description ? String(prop.description).replace(/\s+/g, " ").trim().slice(0, 155) : `${isSale ? "\xC0 vendre" : "\xC0 louer"} \xE0 ${locStr}. ${prop.area || 0} m\xB2, ${prop.bedrooms || 0} chambres. Consultez les photos et contactez l'agent sur Kinimmo.`;
      const firstImg = Array.isArray(prop.images) && prop.images.length > 0 ? prop.images[0] : defaultImage;
      const imageUrl = resolveAbsoluteAssetUrl(firstImg, baseUrl);
      return {
        title,
        description: rawDesc,
        canonicalUrl,
        imageUrl,
        ogType: "article",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "RealEstateListing",
          name: prop.title,
          description: rawDesc,
          url: canonicalUrl,
          image: imageUrl,
          dateModified: prop.updatedAt || prop.createdAt,
          offers: {
            "@type": "Offer",
            price: prop.price,
            priceCurrency: prop.currency || "USD",
            availability: "https://schema.org/InStock"
          },
          address: {
            "@type": "PostalAddress",
            addressLocality: prop.commune || prop.city || "Kinshasa",
            addressCountry: "CD"
          }
        }
      };
    }
  }
  const quartierMatch = pathname.match(/^\/quartiers\/([^/?#]+)/i);
  if (quartierMatch && quartierMatch[1]) {
    const profile = resolveNeighborhoodBySlug(decodeURIComponent(quartierMatch[1]), inMemoryProperties);
    if (profile) {
      const canonicalUrl = `${baseUrl}/quartiers/${encodeURIComponent(profile.slug)}`;
      const title = `Immobilier \xE0 ${profile.name} (${profile.commune}) : ${profile.stats.activeCount} annonces & prix | Kinimmo`;
      const priceNote = profile.stats.avgSalePriceUsd ? ` Prix moyen vente : ${profile.stats.avgSalePriceUsd.toLocaleString("fr-FR")} USD.` : "";
      const description = `${profile.tagline}${priceNote}`;
      const imageUrl = defaultImage;
      return {
        title,
        description,
        canonicalUrl,
        imageUrl,
        ogType: "website",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Place",
          name: `${profile.name}, Kinshasa`,
          description: profile.description,
          url: canonicalUrl,
          address: {
            "@type": "PostalAddress",
            addressLocality: profile.commune,
            addressRegion: "Kinshasa",
            addressCountry: "CD"
          }
        }
      };
    }
  }
  if (pathname === "/blog") {
    return {
      title: "Blog & Guides Immobiliers RDC \u2014 Kinshasa | Kinimmo",
      description: "Guides pratiques sur l\u2019achat foncier, le certificat d\u2019enregistrement, la location \xE0 Kinshasa et les communes porteuses.",
      canonicalUrl: `${baseUrl}/blog`,
      imageUrl: `${baseUrl}/og-images/blog_foncier_titres_1795161876901.jpg`,
      ogType: "website",
      jsonLd: null
    };
  }
  const blogMatch = pathname.match(/^\/blog\/([^/?#]+)/i);
  if (blogMatch && blogMatch[1]) {
    const slug = decodeURIComponent(blogMatch[1]);
    const article = inMemoryBlogArticles.find((a) => a.slug === slug || a.id === slug);
    if (article) {
      const canonicalUrl = `${baseUrl}/blog/${encodeURIComponent(article.slug)}`;
      const imageUrl = resolveAbsoluteAssetUrl(article.coverImage, baseUrl);
      return {
        title: `${article.title} | Guides Kinimmo RDC`,
        description: article.excerpt || article.title,
        canonicalUrl,
        imageUrl,
        ogType: "article",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          image: imageUrl,
          author: { "@type": "Organization", name: article.authorName || "R\xE9daction Kinimmo RDC" },
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          mainEntityOfPage: canonicalUrl
        }
      };
    }
  }
  if (pathname === "/aide") {
    return {
      title: "Centre d\u2019aide & Questions fr\xE9quentes (FAQ) | Kinimmo RDC",
      description: "Toutes les r\xE9ponses sur les paiements Mobile Money, les affiches QR panneau, la v\xE9rification Kinimmo Trust et la publication d\u2019annonces.",
      canonicalUrl: `${baseUrl}/aide`,
      imageUrl: defaultImage,
      ogType: "website",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: DEFAULT_FAQ_ITEMS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer
          }
        }))
      }
    };
  }
  const legalSlug = pathname.slice(1);
  if (["conditions-utilisation", "confidentialite", "mentions-legales"].includes(legalSlug)) {
    const doc = inMemoryLegalDocuments.find((d) => d.slug === legalSlug);
    if (doc) {
      return {
        title: `${doc.title} | Kinimmo RDC`,
        description: doc.subtitle || doc.title,
        canonicalUrl: `${baseUrl}/${doc.slug}`,
        imageUrl: defaultImage,
        ogType: "website",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: doc.title,
          description: doc.subtitle,
          url: `${baseUrl}/${doc.slug}`
        }
      };
    }
  }
  if (pathname === "/visites") {
    return {
      title: "Kinimmo Visites \u2014 Visites Vid\xE9o Immersives \xE0 Kinshasa",
      description: "D\xE9couvrez en vid\xE9o les biens disponibles \xE0 la vente et \xE0 la location \xE0 Kinshasa (Gombe, Ngaliema, Limete).",
      canonicalUrl: `${baseUrl}/visites`,
      imageUrl: defaultImage,
      ogType: "website",
      jsonLd: null
    };
  }
  if (pathname === "/conciergerie") {
    return {
      title: "Conciergerie Immobili\xE8re Kinshasa \u2014 Recherche Sur-Mesure | Kinimmo",
      description: "Confiez votre recherche de villa, appartement ou bureau \xE0 Kinshasa \xE0 notre service de conciergerie VIP.",
      canonicalUrl: `${baseUrl}/conciergerie`,
      imageUrl: defaultImage,
      ogType: "website",
      jsonLd: null
    };
  }
  return {
    title: "Kinshasa Immobilier \u2014 Plateforme Immobili\xE8re & Gestion RDC",
    description: "Plateforme immobili\xE8re de r\xE9f\xE9rence en RDC : Vente, location, terrains titr\xE9s, quartiers de Kinshasa et annuaire des agents certifi\xE9s.",
    canonicalUrl: `${baseUrl}${pathname === "/" ? "/" : pathname}`,
    imageUrl: defaultImage,
    ogType: "website",
    jsonLd: null
  };
}
function injectSeoTagsIntoHtml(html, meta) {
  const safeTitle = escapeHtmlText(meta.title);
  const safeDesc = escapeHtmlAttr(meta.description);
  const safeCanonical = escapeHtmlAttr(meta.canonicalUrl);
  const safeImage = escapeHtmlAttr(meta.imageUrl);
  const safeType = escapeHtmlAttr(meta.ogType);
  let out = html;
  out = out.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle}</title>`);
  out = out.replace(
    /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<link\s+rel=["']canonical["'][^>]*\/?>/i,
    `<link rel="canonical" id="canonical-url" href="${safeCanonical}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:type["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:type" content="${safeType}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:url["'][^>]*\/?>/i,
    `<meta property="og:url" id="og-url" content="${safeCanonical}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:title["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:title" content="${safeTitle}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<meta\s+property=["']og:image["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta property="og:image" content="${safeImage}" />`
  );
  out = out.replace(
    /<meta\s+name=["']twitter:title["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:title" content="${safeTitle}" />`
  );
  out = out.replace(
    /<meta\s+name=["']twitter:description["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:description" content="${safeDesc}" />`
  );
  out = out.replace(
    /<meta\s+name=["']twitter:image["']\s+content=["'][^"']*["']\s*\/?>/i,
    `<meta name="twitter:image" content="${safeImage}" />`
  );
  if (meta.jsonLd) {
    const ldJson = JSON.stringify(meta.jsonLd).replace(/<\/script>/gi, "<\\/script>");
    out = out.replace(
      "</head>",
      `  <script type="application/ld+json" id="kinimmo-listing-jsonld">${ldJson}</script>
  </head>`
    );
  }
  return out;
}
function isHtmlPageRequest(req) {
  const p = req.path || "/";
  if (p.startsWith("/api") || p.startsWith("/uploads") || p.startsWith("/og-images") || p.startsWith("/@") || p.startsWith("/src/") || p.startsWith("/node_modules/")) {
    return false;
  }
  if (/\.[a-z0-9]{1,8}$/i.test(p)) return false;
  const accept = String(req.headers.accept || "");
  const ua = String(req.headers["user-agent"] || "");
  const isCrawler = /WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Googlebot|Bingbot|curl/i.test(ua);
  return accept.includes("text/html") || accept === "*/*" || accept === "" || isCrawler;
}
async function startServer() {
  if (isMysqlConfigured()) {
    const mysqlUsers = await loadAllMysqlUsers();
    if (mysqlUsers.length > 0) {
      for (const record of mysqlUsers) {
        mergeAccountIntoMemory(inMemoryUsers, record);
      }
      console.log(`[MySQL Auth Bridge] ${mysqlUsers.length} compte(s) synchronis\xE9(s) depuis la table MySQL users.`);
    }
  }
  const distPath = path2.join(__dirname, "dist");
  const hasDist = fs2.existsSync(distPath) && fs2.existsSync(path2.join(distPath, "index.html"));
  if (isProd || hasDist) {
    app.use(
      express.static(distPath, {
        index: false,
        setHeaders(res, filePath) {
          const baseName = path2.basename(filePath);
          if (baseName === "sw.js" || baseName === "registerSW.js" || baseName === "manifest.webmanifest" || baseName === "offline.html" || baseName === "index.html" || baseName.startsWith("workbox-")) {
            res.setHeader("Cache-Control", "no-cache, must-revalidate");
          } else if (filePath.includes(`${path2.sep}assets${path2.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        }
      })
    );
    app.get("*", (req, res) => {
      const indexPath = path2.join(distPath, "index.html");
      if (fs2.existsSync(indexPath)) {
        const rawHtml = fs2.readFileSync(indexPath, "utf-8");
        const seoMeta = resolveSeoMetadataForRequest(req, getSiteBaseUrl(req));
        const finalHtml = injectSeoTagsIntoHtml(rawHtml, seoMeta);
        res.status(200).set({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, must-revalidate"
        }).send(finalHtml);
      } else {
        res.status(200).send("Kinimmo API Server is running");
      }
    });
  } else {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.get("*", async (req, res, next) => {
        if (!isHtmlPageRequest(req)) {
          return next();
        }
        try {
          const indexPath = path2.join(__dirname, "index.html");
          const rawHtml = fs2.readFileSync(indexPath, "utf-8");
          const transformedHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          const seoMeta = resolveSeoMetadataForRequest(req, getSiteBaseUrl(req));
          const finalHtml = injectSeoTagsIntoHtml(transformedHtml, seoMeta);
          return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
        } catch (err) {
          vite.ssrFixStacktrace(err);
          return next(err);
        }
      });
      app.use(vite.middlewares);
    } catch (viteError) {
      console.warn("Vite non disponible en environnement d h\xE9bergement, bascule en mode statique :", viteError.message);
      if (fs2.existsSync(distPath)) {
        app.use(express.static(distPath, { index: false }));
      }
      app.get("*", (req, res) => {
        const indexPath = path2.join(distPath, "index.html");
        if (fs2.existsSync(indexPath)) {
          const rawHtml = fs2.readFileSync(indexPath, "utf-8");
          const seoMeta = resolveSeoMetadataForRequest(req, getSiteBaseUrl(req));
          res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).send(injectSeoTagsIntoHtml(rawHtml, seoMeta));
        } else {
          res.json({
            status: "ok",
            service: "Kinimmo API Server",
            message: "Serveur actif."
          });
        }
      });
    }
  }
  app.listen(Number(PORT) || 3e3, "0.0.0.0", () => {
    console.log(`Kinimmo Full-Stack Server running on http://0.0.0.0:${PORT} (${isProd ? "Production" : hasDist ? "Production (dist)" : "Development"})`);
  });
}
startServer().catch((err) => {
  console.error("Fatal server boot error:", err);
});
