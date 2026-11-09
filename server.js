// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
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
  let normalizedPropertyPrice = property.price;
  if (reqCurrency === "CDF" && propCurrency === "USD") {
    normalizedPropertyPrice = property.price * exchangeRate;
  } else if (reqCurrency === "USD" && propCurrency === "CDF") {
    normalizedPropertyPrice = property.price / exchangeRate;
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
            `Prix (${property.price.toLocaleString()} ${property.currency}) dans la fourchette client (+25)`
          );
        } else if (normalizedPropertyPrice >= rawBudgetMin * 0.75) {
          budgetScore = 22;
          reasons.push(
            `Prix (${property.price.toLocaleString()} ${property.currency}) tr\xE8s avantageux (+22)`
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
          `Prix (${property.price.toLocaleString()} ${property.currency}) respecte le plafond de ${rawBudgetMax.toLocaleString()} ${reqCurrency} (+25)`
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
  const results = [];
  for (const property of properties) {
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
var initialProperties = [];

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
  let foundReusedFromOtherAgent = false;
  if (targetImages.length > 0) {
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
    });
    if (duplicatePhotoUrls.length > 0) {
      const pts = foundReusedFromOtherAgent ? 45 : 25;
      riskScore += pts;
      flags.push({
        code: "DUPLICATE_PHOTOS",
        label: foundReusedFromOtherAgent ? "Photos vol\xE9es / r\xE9utilis\xE9es d'un autre compte" : "Photos dupliqu\xE9es sur d'autres annonces",
        severity: foundReusedFromOtherAgent ? "critical" : "high",
        score: pts,
        details: `${duplicatePhotoUrls.length} photo(s) identique(s) ont \xE9t\xE9 d\xE9tect\xE9es sur d'autres biens${foundReusedFromOtherAgent ? " appartenant \xE0 d'autres annonceurs" : ""}.`
      });
    }
  }
  let priceAnomalyRatio;
  let benchmarkPrice;
  const targetCommune = target.commune || "Gombe";
  const communeBenchmark = KINSHASA_PRICE_BENCHMARKS[targetCommune] || KINSHASA_PRICE_BENCHMARKS["Gombe"];
  const isRent = target.status === "for-rent" || target.period === "month";
  const targetPrice = Number(target.price) || 0;
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
        details: `Loyer affich\xE9 de ${targetPrice}$/${target.period || "mois"} \xE0 ${targetCommune}, alors que le plancher r\xE9aliste du quartier est d'au moins ${communeBenchmark.minRent}$ (prix inf\xE9rieur de ${Math.round((1 - priceAnomalyRatio) * 100)}%).`
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

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var PORT = process.env.PORT ? isNaN(Number(process.env.PORT)) ? process.env.PORT : Number(process.env.PORT) : 3e3;
var isProd = process.env.NODE_ENV === "production";
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var devUploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(devUploadsDir)) {
  try {
    fs.mkdirSync(devUploadsDir, { recursive: true });
  } catch {
  }
}
app.use("/uploads", express.static(devUploadsDir));
var LOCAL_LEADS_FILE = path.join(__dirname, "concierge_requests.json");
var LOCAL_LEADS_FILE_ALT = path.join(__dirname, "conciergerie_requests.json");
var LOCAL_VISITS_FILE = path.join(__dirname, "property_visits.json");
var LOCAL_ADS_FILE = path.join(__dirname, "advertisements.json");
var LOCAL_SLIDES_FILE = path.join(__dirname, "hero_slides.json");
var LOCAL_PLANS_FILE = path.join(__dirname, "pricing_plans.json");
var LOCAL_OPTIONS_FILE = path.join(__dirname, "visibility_options.json");
var LOCAL_NOTIFICATIONS_FILE = path.join(__dirname, "notifications.json");
var LOCAL_VIDEOS_FILE = path.join(__dirname, "property_videos.json");
var LOCAL_CLOUDINARY_FILE = path.join(__dirname, "cloudinary_config.json");
var LOCAL_PROPERTIES_FILE = path.join(__dirname, "properties_store.json");
var LOCAL_COLLABORATORS_FILE = path.join(__dirname, "agency_collaborators.json");
var LOCAL_TRANSACTIONS_FILE = path.join(__dirname, "agency_transactions.json");
var LOCAL_TRUST_FILE = path.join(__dirname, "trust_store.json");
var INITIAL_PLANS = [
  {
    id: "starter",
    name: "Annonce Gratuite Particulier",
    description: "Id\xE9al pour les propri\xE9taires souhaitant publier leurs biens sans aucun frais ni engagement.",
    category: "individual",
    badge: "Gratuit",
    price_usd: 0,
    price_cdf: 0,
    priceMonthly: 0,
    priceMonthlyCDF: 0,
    currency: "USD",
    billing_period: "monthly",
    billingPeriod: "month",
    max_listings: 3,
    maxListings: 3,
    max_featured_listings: 0,
    featuredListings: 0,
    agentAccounts: 1,
    features: [
      "Publication de 3 annonces immobili\xE8res actives",
      "Fiche descriptive compl\xE8te avec photos HD",
      "Mise en relation directe avec les acheteurs",
      "Messagerie et contacts WhatsApp directs"
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
    name: "Pro Courtier Ind\xE9pendant",
    description: "Pour courtiers ind\xE9pendants actifs \xE0 Kinshasa avec badge v\xE9rifi\xE9 et gestion prioritaire des leads.",
    category: "individual",
    badge: "Courtier Pro",
    price_usd: 29,
    price_cdf: 82650,
    priceMonthly: 29,
    priceMonthlyCDF: 82650,
    currency: "USD",
    billing_period: "monthly",
    billingPeriod: "month",
    max_listings: 25,
    maxListings: 25,
    max_featured_listings: 3,
    featuredListings: 3,
    agentAccounts: 1,
    features: [
      "Jusqu'\xE0 25 annonces immobili\xE8res actives",
      "3 annonces en vedette (Mise en avant)",
      "Badge Officiel Courtier V\xE9rifi\xE9 Kinshasa",
      "Acc\xE8s direct aux demandes de Conciergerie (Leads)",
      "Statistiques des vues et contacts WhatsApp",
      "Support r\xE9actif 6j/7"
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
    name: "Agence Immobili\xE8re Certifi\xE9e",
    description: "Visibilit\xE9 maximale pour agences immobili\xE8res avec agents illimit\xE9s, CRM et vitrine d\xE9di\xE9e.",
    category: "agency",
    badge: "Agence Agr\xE9\xE9e",
    price_usd: 79,
    price_cdf: 225150,
    priceMonthly: 79,
    priceMonthlyCDF: 225150,
    currency: "USD",
    billing_period: "monthly",
    billingPeriod: "month",
    max_listings: 100,
    maxListings: 100,
    max_featured_listings: 10,
    featuredListings: 10,
    agentAccounts: 10,
    features: [
      "Jusqu'\xE0 100 annonces immobili\xE8res actives",
      "10 annonces en vedette incluses",
      "Vitrine Agence Immobili\xE8re d\xE9di\xE9e avec logo et agents",
      "Gestion multi-comptes pour agents immobiliers",
      "Badge Agence Certifi\xE9e & Agr\xE9\xE9e RDC",
      "Rapports d'activit\xE9 mensuels et CRM leads",
      "Support prioritaire d\xE9di\xE9 7j/7"
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
    id: "enterprise",
    name: "Promoteur Immobilier & Constructeur VIP",
    description: "Pour promoteurs fonciers, lotissements et grands chantiers avec banni\xE8res sponsoris\xE9es et multi-diffusion.",
    category: "promoter",
    badge: "Promoteur VIP",
    price_usd: 149,
    price_cdf: 424650,
    priceMonthly: 149,
    priceMonthlyCDF: 424650,
    currency: "USD",
    billing_period: "monthly",
    billingPeriod: "month",
    max_listings: 500,
    maxListings: 500,
    max_featured_listings: 30,
    featuredListings: 30,
    agentAccounts: 25,
    features: [
      "Annonces immobili\xE8res illimit\xE9es (grands chantiers, lotissements)",
      "30 annonces en t\xEAte de liste et carrousel d'accueil",
      "Banni\xE8res publicitaires r\xE9gie incluses",
      "Multi-diffusion WhatsApp VIP & R\xE9seaux sociaux",
      "Conseiller commercial et juridique d\xE9di\xE9",
      "Gestion prioritaire des visites VIP"
    ],
    recommended: false,
    has_verified_badge: true,
    hasVerifiedBadge: true,
    has_crm_leads: true,
    hasCrmLeads: true,
    has_priority_support: true,
    hasPrioritySupport: true,
    is_active: true,
    isActive: true
  }
];
var INITIAL_VISIBILITY_OPTIONS = [
  {
    id: "opt_featured_7d",
    name: "Mise en Avant 7 jours",
    slug: "mise_en_avant_7d",
    description: "Positionnement en t\xEAte de page d'accueil et carrousel prioritaire pendant 7 jours.",
    boost_type: "featured",
    duration_days: 7,
    price_usd: 10,
    price_cdf: 28500,
    price: 10,
    priceCDF: 28500,
    badge_text: "En Vedette \u2B50",
    icon: "Sparkles",
    is_active: true
  },
  {
    id: "opt_premium_30d",
    name: "Pack Annonce Premium 30 jours",
    slug: "annonce_premium_30d",
    description: "Affichage permanent avec cadre dor\xE9, badge Premium, priorit\xE9 maximale et 3x plus d'appels.",
    boost_type: "premium",
    duration_days: 30,
    price_usd: 25,
    price_cdf: 71250,
    price: 25,
    priceCDF: 71250,
    badge_text: "\u{1F451} Annonce Premium",
    icon: "Crown",
    is_active: true
  },
  {
    id: "opt_urgent_14d",
    name: "Badge Vente / Location Urgente",
    slug: "badge_urgent_14d",
    description: "Bandeau rouge d'urgence pour attirer imm\xE9diatement les acheteurs et locataires s\xE9rieux.",
    boost_type: "urgent",
    duration_days: 14,
    price_usd: 8,
    price_cdf: 22800,
    price: 8,
    priceCDF: 22800,
    badge_text: "\u26A1 Urgent",
    icon: "Zap",
    is_active: true
  },
  {
    id: "opt_refresh_bump",
    name: "Remont\xE9e Imm\xE9diate en T\xEAte",
    slug: "remontee_tete",
    description: "Actualise la date de votre annonce pour la replacer tout en haut des r\xE9sultats de recherche r\xE9cents.",
    boost_type: "refresh",
    duration_days: 1,
    price_usd: 5,
    price_cdf: 14250,
    price: 5,
    priceCDF: 14250,
    badge_text: "Top Liste",
    icon: "ArrowUpCircle",
    is_active: true
  },
  {
    id: "opt_social_blast",
    name: "Diffusion R\xE9seaux & WhatsApp Kinimmo",
    slug: "diffusion_reseaux",
    description: "Publication sponsoris\xE9e sur la communaut\xE9 Facebook Kinimmo et diffusion WhatsApp VIP.",
    boost_type: "social_blast",
    duration_days: 14,
    price_usd: 35,
    price_cdf: 99750,
    price: 35,
    priceCDF: 99750,
    badge_text: "Multi-Canal VIP",
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
function loadLocalPlans() {
  try {
    if (fs.existsSync(LOCAL_PLANS_FILE)) {
      const content = fs.readFileSync(LOCAL_PLANS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Erreur lecture pricing_plans.json", e);
  }
  return INITIAL_PLANS;
}
function saveLocalPlans(list) {
  try {
    fs.writeFileSync(LOCAL_PLANS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture pricing_plans.json", e);
  }
}
function loadLocalOptions() {
  try {
    if (fs.existsSync(LOCAL_OPTIONS_FILE)) {
      const content = fs.readFileSync(LOCAL_OPTIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Erreur lecture visibility_options.json", e);
  }
  return INITIAL_VISIBILITY_OPTIONS;
}
function saveLocalOptions(list) {
  try {
    fs.writeFileSync(LOCAL_OPTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture visibility_options.json", e);
  }
}
var LOCAL_INVOICES_FILE = path.join(__dirname, "invoices_store.json");
function loadLocalInvoices() {
  try {
    if (fs.existsSync(LOCAL_INVOICES_FILE)) {
      const content = fs.readFileSync(LOCAL_INVOICES_FILE, "utf-8");
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
    fs.writeFileSync(LOCAL_INVOICES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture invoices_store.json", e);
  }
}
var inMemoryPlans = loadLocalPlans();
var inMemoryOptions = loadLocalOptions();
var inMemoryPaymentMethods = INITIAL_PAYMENT_METHODS;
var inMemoryInvoices = loadLocalInvoices();
var inMemoryProperties = (() => {
  try {
    if (fs.existsSync(LOCAL_PROPERTIES_FILE)) {
      const raw = fs.readFileSync(LOCAL_PROPERTIES_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
    fs.writeFileSync(LOCAL_PROPERTIES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture properties_store.json", e);
  }
}
var inMemoryCollaborators = (() => {
  try {
    if (fs.existsSync(LOCAL_COLLABORATORS_FILE)) {
      const raw = fs.readFileSync(LOCAL_COLLABORATORS_FILE, "utf-8");
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
    fs.writeFileSync(LOCAL_COLLABORATORS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture agency_collaborators.json", e);
  }
}
var inMemoryTransactions = (() => {
  try {
    if (fs.existsSync(LOCAL_TRANSACTIONS_FILE)) {
      const raw = fs.readFileSync(LOCAL_TRANSACTIONS_FILE, "utf-8");
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
    fs.writeFileSync(LOCAL_TRANSACTIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture agency_transactions.json", e);
  }
}
var inMemoryTrust = (() => {
  try {
    if (fs.existsSync(LOCAL_TRUST_FILE)) {
      const raw = fs.readFileSync(LOCAL_TRUST_FILE, "utf-8");
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
    fs.writeFileSync(LOCAL_TRUST_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture trust_store.json", e);
  }
}
function loadLocalRequests() {
  try {
    if (fs.existsSync(LOCAL_LEADS_FILE)) {
      const content = fs.readFileSync(LOCAL_LEADS_FILE, "utf-8");
      return JSON.parse(content) || [];
    } else if (fs.existsSync(LOCAL_LEADS_FILE_ALT)) {
      const content = fs.readFileSync(LOCAL_LEADS_FILE_ALT, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture concierge_requests.json", e);
  }
  return [];
}
function saveLocalRequests(list) {
  try {
    fs.writeFileSync(LOCAL_LEADS_FILE, JSON.stringify(list, null, 2), "utf-8");
    fs.writeFileSync(LOCAL_LEADS_FILE_ALT, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture concierge_requests.json", e);
  }
}
function loadLocalVisits() {
  try {
    if (fs.existsSync(LOCAL_VISITS_FILE)) {
      const content = fs.readFileSync(LOCAL_VISITS_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture property_visits.json", e);
  }
  return [];
}
function saveLocalVisits(list) {
  try {
    fs.writeFileSync(LOCAL_VISITS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture property_visits.json", e);
  }
}
function loadLocalAds() {
  try {
    if (fs.existsSync(LOCAL_ADS_FILE)) {
      const content = fs.readFileSync(LOCAL_ADS_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture advertisements.json", e);
  }
  return [];
}
function saveLocalAds(list) {
  try {
    fs.writeFileSync(LOCAL_ADS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture advertisements.json", e);
  }
}
function loadLocalSlides() {
  try {
    if (fs.existsSync(LOCAL_SLIDES_FILE)) {
      const content = fs.readFileSync(LOCAL_SLIDES_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture hero_slides.json", e);
  }
  return [];
}
function saveLocalSlides(list) {
  try {
    fs.writeFileSync(LOCAL_SLIDES_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture hero_slides.json", e);
  }
}
function loadLocalNotifications() {
  try {
    if (fs.existsSync(LOCAL_NOTIFICATIONS_FILE)) {
      const content = fs.readFileSync(LOCAL_NOTIFICATIONS_FILE, "utf-8");
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error("Erreur lecture notifications.json", e);
  }
  return [];
}
function saveLocalNotifications(list) {
  try {
    fs.writeFileSync(LOCAL_NOTIFICATIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("Erreur \xE9criture notifications.json", e);
  }
}
var inMemoryRequests = loadLocalRequests();
var inMemoryVisits = loadLocalVisits();
var inMemoryAds = loadLocalAds();
var inMemorySlides = loadLocalSlides();
var inMemoryNotifications = loadLocalNotifications();
var getAuthUser = (req) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
  if (!token) return null;
  try {
    const decodedStr = Buffer.from(token, "base64").toString("utf-8");
    if (decodedStr.startsWith("{")) {
      const parsed = JSON.parse(decodedStr);
      if (parsed && parsed.id && parsed.role) {
        return parsed;
      }
    }
  } catch {
  }
  if (token.includes("admin") || token.startsWith("admin_")) {
    return {
      id: "admin_master",
      name: "Direction Kinimmo",
      email: "admin@kinimmo.cd",
      role: "admin"
    };
  }
  if (token.startsWith("agent_") || token.includes("agent")) {
    return {
      id: token,
      name: "Agent Kinshasa",
      email: `${token}@kinimmo.cd`,
      role: "agent"
    };
  }
  return null;
};
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
    const matches = findMatchingProperties(newRequest, initialProperties, { minScore: 20, limit: 10 });
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
app.post("/api/concierge-requests", handleCreateConciergeRequest);
app.post("/api/conciergerie", handleCreateConciergeRequest);
app.get("/api/concierge-requests/:id/matches", async (req, res) => {
  try {
    const { id } = req.params;
    const foundReq = inMemoryRequests.find((r) => r.id === id);
    if (!foundReq) {
      return res.status(404).json({ success: false, error: "Demande introuvable." });
    }
    const matches = findMatchingProperties(foundReq, initialProperties, { minScore: 15, limit: 15 });
    return res.json({ success: true, count: matches.length, data: matches });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});
var handleGetConciergeRequests = async (req, res) => {
  try {
    const user = getAuthUser(req);
    let list = [...inMemoryRequests];
    if (user && user.role === "agent") {
      list = list.filter((r) => r.assigned_agent_id === user.id);
    }
    if (!user || user.role === "user") {
      list = list.map((r) => {
        const sanitized = { ...r };
        delete sanitized.notesAdmin;
        return sanitized;
      });
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
app.get("/api/conciergerie", handleGetConciergeRequests);
var handleUpdateConciergeRequest = async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        error: "Acc\xE8s interdit : Seul un administrateur habilit\xE9 peut modifier ou r\xE9assigner les demandes de conciergerie."
      });
    }
    const { id } = req.params;
    const body = req.body || {};
    const reqItem = inMemoryRequests.find((r) => r.id === id);
    if (!reqItem) {
      return res.status(404).json({ success: false, error: "Demande introuvable." });
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
    if (body.currency !== void 0) reqItem.currency = body.currency;
    if (body.bedrooms !== void 0) reqItem.bedrooms = Number(body.bedrooms) || 0;
    if (body.bathrooms !== void 0) reqItem.bathrooms = Number(body.bathrooms) || 0;
    if (body.notes !== void 0) reqItem.notes = body.notes;
    if (body.assigned_agent_id !== void 0) reqItem.assigned_agent_id = body.assigned_agent_id;
    if (body.assigned_agent_name !== void 0) reqItem.assigned_agent_name = body.assigned_agent_name;
    if (body.notesAdmin !== void 0) reqItem.notesAdmin = String(body.notesAdmin);
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
app.patch("/api/conciergerie/:id", handleUpdateConciergeRequest);
app.put("/api/conciergerie/:id", handleUpdateConciergeRequest);
app.get("/api/property-visits", async (req, res) => {
  try {
    const user = getAuthUser(req);
    const { request_id } = req.query;
    let list = [...inMemoryVisits];
    if (request_id) {
      list = list.filter((v) => v.request_id === String(request_id));
    }
    if (user && user.role === "agent") {
      list = list.filter((v) => v.agent_id === user.id);
    }
    return res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});
app.post("/api/property-visits", async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin" && user.role !== "agent") {
      return res.status(401).json({
        success: false,
        error: "Acc\xE8s non autoris\xE9 : Vous devez \xEAtre authentifi\xE9 en tant qu\u2019administrateur ou agent pour planifier une visite."
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
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const id = `visit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newVisit = {
      id,
      request_id: String(request_id),
      property_id: property_id || null,
      agent_id: agent_id || null,
      visit_date: String(visit_date),
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
});
app.patch("/api/property-visits/:id", async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin" && user.role !== "agent") {
      return res.status(401).json({ success: false, error: "Authentification requise." });
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
    if (status !== void 0) visit.status = status;
    if (notes !== void 0) visit.notes = notes;
    if (visit_date !== void 0) visit.visit_date = visit_date;
    if (visit_time !== void 0) visit.visit_time = visit_time;
    if (agent_id !== void 0 && user.role === "admin") visit.agent_id = agent_id;
    if (property_id !== void 0) visit.property_id = property_id;
    visit.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    saveLocalVisits(inMemoryVisits);
    return res.json({ success: true, message: "Visite mise \xE0 jour.", data: visit });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});
app.delete("/api/property-visits/:id", async (req, res) => {
  try {
    const user = getAuthUser(req);
    if (!user || user.role !== "admin" && user.role !== "agent") {
      return res.status(401).json({ success: false, error: "Authentification requise." });
    }
    const { id } = req.params;
    const visit = inMemoryVisits.find((v) => v.id === id);
    if (!visit) {
      return res.status(404).json({ success: false, error: "Visite introuvable." });
    }
    if (user.role === "agent" && visit.agent_id !== user.id) {
      return res.status(403).json({ success: false, error: "Acc\xE8s interdit." });
    }
    inMemoryVisits = inMemoryVisits.filter((v) => v.id !== id);
    saveLocalVisits(inMemoryVisits);
    return res.json({ success: true, message: "Visite supprim\xE9e avec succ\xE8s." });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});
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
      list = list.filter((n) => n.recipient_id === user.id || n.recipient_type === "agent");
    } else if (user.role === "user") {
      list = list.filter((n) => n.recipient_id === user.id);
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
  if (!user || user.role !== "admin" && user.role !== "agent") {
    return res.status(401).json({ success: false, error: "Authentification requise." });
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
app.get("/api/billing/plans", (req, res) => {
  try {
    const { category, include_inactive } = req.query;
    let list = inMemoryPlans;
    if (include_inactive !== "true") {
      list = list.filter((p) => p.is_active !== false);
    }
    if (category && category !== "all") {
      list = list.filter((p) => p.category === category);
    }
    return res.json({ success: true, count: list.length, plans: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/plans/:id", (req, res) => {
  try {
    const { id } = req.params;
    const idx = inMemoryPlans.findIndex((p) => p.id === id);
    if (idx !== -1) {
      const priceUsd = Number(req.body.price_usd !== void 0 ? req.body.price_usd : req.body.priceMonthly !== void 0 ? req.body.priceMonthly : inMemoryPlans[idx].price_usd);
      const priceCdf = Number(req.body.price_cdf !== void 0 ? req.body.price_cdf : req.body.priceMonthlyCDF !== void 0 ? req.body.priceMonthlyCDF : priceUsd * 2850);
      const maxListings = Number(req.body.max_listings !== void 0 ? req.body.max_listings : req.body.maxListings !== void 0 ? req.body.maxListings : inMemoryPlans[idx].max_listings);
      const featuredListings = Number(req.body.max_featured_listings !== void 0 ? req.body.max_featured_listings : req.body.featuredListings !== void 0 ? req.body.featuredListings : inMemoryPlans[idx].max_featured_listings);
      inMemoryPlans[idx] = {
        ...inMemoryPlans[idx],
        ...req.body,
        price_usd: priceUsd,
        priceMonthly: priceUsd,
        price_cdf: priceCdf,
        priceMonthlyCDF: priceCdf,
        max_listings: maxListings,
        maxListings,
        max_featured_listings: featuredListings,
        featuredListings,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      saveLocalPlans(inMemoryPlans);
      return res.json({ success: true, message: "Formule mise \xE0 jour avec succ\xE8s.", plan: inMemoryPlans[idx] });
    }
    return res.status(404).json({ success: false, error: "Formule introuvable" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/billing/plans", (req, res) => {
  try {
    const id = req.body.id || `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const priceUsd = Number(req.body.price_usd ?? req.body.priceMonthly ?? 0);
    const priceCdf = Number(req.body.price_cdf ?? req.body.priceMonthlyCDF ?? priceUsd * 2850);
    const maxListings = Number(req.body.max_listings ?? req.body.maxListings ?? 5);
    const featuredListings = Number(req.body.max_featured_listings ?? req.body.featuredListings ?? 0);
    const newPlan = {
      id,
      name: req.body.name || "Nouvelle formule",
      description: req.body.description || "",
      category: req.body.category || "individual",
      badge: req.body.badge || "Formule Pro",
      price_usd: priceUsd,
      priceMonthly: priceUsd,
      price_cdf: priceCdf,
      priceMonthlyCDF: priceCdf,
      currency: "USD",
      billing_period: req.body.billing_period || "monthly",
      billingPeriod: "month",
      max_listings: maxListings,
      maxListings,
      max_featured_listings: featuredListings,
      featuredListings,
      agentAccounts: Number(req.body.agentAccounts || 1),
      features: Array.isArray(req.body.features) ? req.body.features : ["Publication d'annonces"],
      recommended: Boolean(req.body.recommended),
      has_verified_badge: Boolean(req.body.has_verified_badge),
      hasVerifiedBadge: Boolean(req.body.hasVerifiedBadge),
      has_crm_leads: Boolean(req.body.has_crm_leads),
      hasCrmLeads: Boolean(req.body.hasCrmLeads),
      has_priority_support: Boolean(req.body.has_priority_support),
      hasPrioritySupport: Boolean(req.body.hasPrioritySupport),
      is_active: req.body.is_active !== false,
      isActive: req.body.isActive !== false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryPlans.push(newPlan);
    saveLocalPlans(inMemoryPlans);
    return res.status(201).json({ success: true, message: "Formule cr\xE9\xE9e avec succ\xE8s.", plan: newPlan });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/billing/plans/:id", (req, res) => {
  try {
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
    return res.json({ success: true, count: inMemoryOptions.length, options: inMemoryOptions });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/visibility-options/:id", (req, res) => {
  try {
    const { id } = req.params;
    const idx = inMemoryOptions.findIndex((o) => o.id === id);
    if (idx !== -1) {
      const priceUsd = Number(req.body.price_usd !== void 0 ? req.body.price_usd : req.body.price !== void 0 ? req.body.price : inMemoryOptions[idx].price_usd);
      const priceCdf = Number(req.body.price_cdf !== void 0 ? req.body.price_cdf : req.body.priceCDF !== void 0 ? req.body.priceCDF : priceUsd * 2850);
      const durationDays = Number(req.body.duration_days !== void 0 ? req.body.duration_days : inMemoryOptions[idx].duration_days);
      inMemoryOptions[idx] = {
        ...inMemoryOptions[idx],
        ...req.body,
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
    const id = req.body.id || `opt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const priceUsd = Number(req.body.price_usd ?? req.body.price ?? 10);
    const priceCdf = Number(req.body.price_cdf ?? req.body.priceCDF ?? priceUsd * 2850);
    const newOption = {
      id,
      name: req.body.name || "Option de visibilit\xE9",
      slug: req.body.slug || `boost_${Date.now()}`,
      description: req.body.description || "",
      boost_type: req.body.boost_type || "featured",
      duration_days: Number(req.body.duration_days || 7),
      price_usd: priceUsd,
      price: priceUsd,
      price_cdf: priceCdf,
      priceCDF: priceCdf,
      badge_text: req.body.badge_text || "En Vedette",
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
    const { id } = req.params;
    inMemoryOptions = inMemoryOptions.filter((o) => o.id !== id);
    saveLocalOptions(inMemoryOptions);
    return res.json({ success: true, message: "Option supprim\xE9e avec succ\xE8s." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/billing/payment-methods", (_req, res) => {
  try {
    return res.json({ success: true, count: inMemoryPaymentMethods.length, paymentMethods: inMemoryPaymentMethods });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/billing/invoices", (req, res) => {
  try {
    const { planId, paymentMethodId, paymentGateway = "manual_mobile_money", userId, userName, userEmail } = req.body;
    const targetPlan = inMemoryPlans.find((p) => p.id === planId) || inMemoryPlans[0];
    const targetPayment = inMemoryPaymentMethods.find((pm) => pm.id === paymentMethodId) || inMemoryPaymentMethods[0];
    const invoiceNumber = `FAC-KIN-${Math.floor(1e5 + Math.random() * 9e5)}`;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const dueDate = new Date(Date.now() + 7 * 864e5).toISOString().split("T")[0];
    const newInvoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      invoiceNumber,
      user_id: userId || "user_guest",
      user_name: userName || "Client Kinshasa",
      user_email: userEmail || "client@kinimmo.cd",
      target_name: userName || targetPlan.name,
      target_email: userEmail || "client@kinimmo.cd",
      invoice_type: "subscription",
      invoiceType: "subscription",
      plan_id: targetPlan.id,
      plan_name: targetPlan.name,
      amount: targetPlan.price_usd || targetPlan.priceMonthly,
      amount_usd: targetPlan.price_usd || targetPlan.priceMonthly,
      currency: "USD",
      amount_cdf: targetPlan.price_cdf || targetPlan.priceMonthlyCDF,
      total_amount: targetPlan.price_usd || targetPlan.priceMonthly,
      total_amount_cdf: targetPlan.price_cdf || targetPlan.priceMonthlyCDF,
      payment_method_id: targetPayment?.id || null,
      payment_method_provider: targetPayment?.account_name || "Mobile Money",
      payment_gateway: paymentGateway,
      status: targetPlan.priceMonthly === 0 ? "paid" : "pending",
      due_date: dueDate,
      created_at: nowIso,
      updated_at: nowIso
    };
    inMemoryInvoices.unshift(newInvoice);
    return res.status(201).json({
      success: true,
      message: "Facture g\xE9n\xE9r\xE9e avec succ\xE8s.",
      invoice: newInvoice
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/billing/boost-order", (req, res) => {
  try {
    const { propertyId, optionId, paymentMethodId, paymentGateway = "manual_mobile_money", userId, propertyTitle } = req.body;
    if (propertyId) {
      const targetProperty = inMemoryProperties.find((p) => p.id === propertyId);
      if (targetProperty) {
        const rawStatus = String(targetProperty.listingStatus || targetProperty.status || "").toUpperCase();
        if (rawStatus === "RENTED" || rawStatus === "SOLD" || rawStatus === "ARCHIVED" || targetProperty.status === "sold") {
          return res.status(400).json({
            success: false,
            error: `Impossible de commander un boost pour un bien avec le statut \xAB ${rawStatus} \xBB. Seuls les biens disponibles et publi\xE9s peuvent faire l'objet d'un boost de visibilit\xE9.`
          });
        }
      }
    }
    const targetOption = inMemoryOptions.find((o) => o.id === optionId) || inMemoryOptions[0];
    const targetPayment = inMemoryPaymentMethods.find((pm) => pm.id === paymentMethodId) || inMemoryPaymentMethods[0];
    const invoiceNumber = `BST-KIN-${Math.floor(1e5 + Math.random() * 9e5)}`;
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const dueDate = new Date(Date.now() + 3 * 864e5).toISOString().split("T")[0];
    const newInvoice = {
      id: invoiceId,
      invoice_number: invoiceNumber,
      invoiceNumber,
      user_id: userId || "user_agent_active",
      user_name: "Bailleur / Courtier Partenaire",
      user_email: "partenaire@kinimmo.cd",
      target_name: "Annonceur Kinshasa",
      target_email: "partenaire@kinimmo.cd",
      invoice_type: "boost",
      invoiceType: "boost",
      property_id: propertyId,
      property_title: propertyTitle || "Propri\xE9t\xE9 Kinshasa",
      option_id: targetOption.id,
      option_name: targetOption.name,
      boost_type: targetOption.boost_type,
      duration_days: targetOption.duration_days,
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
    return res.status(201).json({
      success: true,
      message: "Commande de visibilit\xE9 cr\xE9\xE9e avec succ\xE8s.",
      invoice: newInvoice
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/billing/my-invoices", (_req, res) => {
  return res.json({ success: true, count: inMemoryInvoices.length, invoices: inMemoryInvoices });
});
app.get("/api/billing/my-boosts", (_req, res) => {
  const boosts = inMemoryInvoices.filter((inv) => inv.invoice_type === "boost");
  return res.json({ success: true, count: boosts.length, boosts });
});
app.put("/api/billing/invoices/:id/pay", (req, res) => {
  try {
    const { id } = req.params;
    const { transactionReference, paymentMethodId } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Facture non trouv\xE9e" });
    }
    if (transactionReference) inv.transaction_reference = transactionReference;
    if (paymentMethodId) inv.payment_method_id = paymentMethodId;
    inv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    return res.json({ success: true, message: "R\xE9f\xE9rence de r\xE8glement enregistr\xE9e avec succ\xE8s.", invoice: inv });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/invoices/:id/approve", (req, res) => {
  try {
    const { id } = req.params;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Facture non trouv\xE9e" });
    }
    inv.status = "paid";
    inv.paid_at = (/* @__PURE__ */ new Date()).toISOString();
    inv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    if (inv.invoice_type === "boost" || inv.property_id) {
      const propIdx = inMemoryProperties.findIndex((p) => p.id === inv.property_id);
      if (propIdx !== -1) {
        const optionId = String(inv.option_id || "").toLowerCase();
        let durationDays = Number(inv.duration_days) || 7;
        if (optionId.includes("30")) durationDays = 30;
        else if (optionId.includes("14")) durationDays = 14;
        else if (optionId.includes("7")) durationDays = 7;
        const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1e3).toISOString();
        inMemoryProperties[propIdx].boostExpiresAt = expiresAt;
        if (optionId.includes("premium")) {
          inMemoryProperties[propIdx].isPremium = true;
          inMemoryProperties[propIdx].featured = true;
          inMemoryProperties[propIdx].listingTier = "premium";
        } else if (optionId.includes("featured")) {
          inMemoryProperties[propIdx].featured = true;
          inMemoryProperties[propIdx].listingTier = "featured";
        } else if (optionId.includes("urgent")) {
          inMemoryProperties[propIdx].isUrgent = true;
        }
        inMemoryProperties[propIdx].refreshBumpAt = (/* @__PURE__ */ new Date()).toISOString();
        inMemoryProperties[propIdx].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        saveLocalProperties(inMemoryProperties);
      }
    }
    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: `Facture ${inv.invoice_number} valid\xE9e avec succ\xE8s. Le boost a \xE9t\xE9 activ\xE9 sur l'annonce.`,
      invoice: inv
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/billing/invoices/:id/reject", (req, res) => {
  try {
    const { id } = req.params;
    const { reason = "Paiement non re\xE7u ou r\xE9f\xE9rence de transaction non confirm\xE9e." } = req.body;
    const inv = inMemoryInvoices.find((i) => i.id === id || i.invoice_number === id);
    if (!inv) {
      return res.status(404).json({ success: false, error: "Facture non trouv\xE9e" });
    }
    inv.status = "failed";
    inv.notes = `Paiement rejet\xE9 par l'administrateur : ${reason}`;
    inv.updated_at = (/* @__PURE__ */ new Date()).toISOString();
    saveLocalInvoices(inMemoryInvoices);
    return res.json({
      success: true,
      message: `Paiement rejet\xE9 pour la facture ${inv.invoice_number}. Le boost n'a pas \xE9t\xE9 activ\xE9.`,
      invoice: inv
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/admin/invoices", (_req, res) => {
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
app.get("/api/billing/admin/advertisements", (_req, res) => {
  return res.json({ success: true, count: inMemoryAds.length, advertisements: inMemoryAds });
});
app.post("/api/billing/admin/advertisements", (req, res) => {
  try {
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
    const { id } = req.params;
    inMemoryAds = inMemoryAds.filter((a) => a.id !== id);
    saveLocalAds(inMemoryAds);
    return res.json({ success: true, message: "Publicit\xE9 supprim\xE9e" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/billing/admin/monetization-stats", (_req, res) => {
  const totalImpressions = inMemoryAds.reduce((acc, a) => acc + (a.impressions_count || 0), 0);
  const totalClicks = inMemoryAds.reduce((acc, a) => acc + (a.clicks_count || 0), 0);
  return res.json({
    success: true,
    data: {
      invoices: {
        total_invoices: 14,
        paid_invoices: 11,
        pending_invoices: 3,
        total_revenue_usd: 3450,
        total_revenue_cdf: 966e4,
        boost_invoices: 8,
        subscription_invoices: 6
      },
      activeBoosts: 6,
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
  return res.json({ success: true, count: inMemorySlides.length, slides: inMemorySlides });
});
app.post("/api/showcase", (req, res) => {
  try {
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
});
app.put("/api/showcase/:id", (req, res) => {
  try {
    const { id } = req.params;
    const idx = inMemorySlides.findIndex((s) => s.id === id);
    if (idx !== -1) {
      inMemorySlides[idx] = { ...inMemorySlides[idx], ...req.body };
      saveLocalSlides(inMemorySlides);
      return res.json({ success: true, slide: inMemorySlides[idx] });
    }
    return res.status(404).json({ success: false, error: "Diapositive non trouv\xE9e" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/showcase/:id", (req, res) => {
  try {
    const { id } = req.params;
    inMemorySlides = inMemorySlides.filter((s) => s.id !== id);
    saveLocalSlides(inMemorySlides);
    return res.json({ success: true, message: "Diapositive supprim\xE9e" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var LOCAL_REPORTS_FILE = path.join(__dirname, "property_user_reports.json");
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
    if (fs.existsSync(LOCAL_REPORTS_FILE)) {
      const raw = fs.readFileSync(LOCAL_REPORTS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
  }
  return [...INITIAL_REPORTS];
})();
function saveLocalReports(list) {
  try {
    fs.writeFileSync(LOCAL_REPORTS_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch {
  }
}
app.post("/api/fraud/analyze", (req, res) => {
  try {
    const property = req.body;
    const analysis = analyzePropertyForFraud(property, initialProperties, inMemoryReports);
    return res.json({ success: true, analysis });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/fraud/audit", (_req, res) => {
  try {
    const audit = auditPropertyList(initialProperties, inMemoryReports);
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
app.get("/api/fraud/reports", (_req, res) => {
  return res.json({ success: true, count: inMemoryReports.length, reports: inMemoryReports });
});
app.put("/api/fraud/reports/:id", (req, res) => {
  try {
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
    if (fs.existsSync(LOCAL_CLOUDINARY_FILE)) {
      fileConfig = JSON.parse(fs.readFileSync(LOCAL_CLOUDINARY_FILE, "utf-8"));
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
var videoMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("video/") || file.originalname.match(/\.(mp4|webm|mov|m4v|ogg|avi|mkv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Format vid\xE9o non valide. Veuillez choisir un fichier MP4, WebM ou MOV."));
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
    fs.writeFileSync(LOCAL_CLOUDINARY_FILE, JSON.stringify(serverCloudinaryConfig, null, 2), "utf-8");
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
app.post("/api/cloudinary/test", async (_req, res) => {
  try {
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
app.post("/api/cloudinary/upload", videoMulter.single("video"), async (req, res) => {
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
var inMemoryVideos = (() => {
  try {
    if (fs.existsSync(LOCAL_VIDEOS_FILE)) {
      const raw = fs.readFileSync(LOCAL_VIDEOS_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
  }
  return [];
})();
function saveLocalVideos(list) {
  try {
    fs.writeFileSync(LOCAL_VIDEOS_FILE, JSON.stringify(list, null, 2), "utf-8");
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
    const userId = req.headers["x-user-id"] || "agent_current";
    const userVideos = inMemoryVideos.filter((v) => v.userId === userId || v.userId === "agent_1");
    return res.json({
      success: true,
      count: userVideos.length,
      data: { videos: userVideos }
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
    return res.json({ success: true, data: { video } });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/videos", (req, res) => {
  try {
    const { propertyId, videoUrl, thumbnailUrl, description, status = "pending" } = req.body;
    if (!propertyId || !videoUrl) {
      return res.status(400).json({ success: false, error: "L'ID de l'annonce et l'URL de la vid\xE9o sont obligatoires." });
    }
    const linkedProp = initialProperties.find((p) => p.id === propertyId);
    const newVideo = {
      id: `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      propertyId,
      userId: req.headers["x-user-id"] || "agent_current",
      videoUrl,
      thumbnailUrl: thumbnailUrl || linkedProp?.images?.[0] || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
      description: description || "",
      status: status === "draft" ? "draft" : "pending",
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
      agentName: linkedProp?.agencyName || "Agent Immobilier Kinimmo",
      agencyName: linkedProp?.agencyName,
      agentPhone: linkedProp?.contactPhone,
      agentWhatsapp: linkedProp?.contactPhone,
      agentVerified: true
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
    const { id } = req.params;
    const idx = inMemoryVideos.findIndex((v) => v.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Vid\xE9o introuvable." });
    }
    inMemoryVideos[idx] = {
      ...inMemoryVideos[idx],
      ...req.body,
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
    const { id } = req.params;
    const initialLen = inMemoryVideos.length;
    inMemoryVideos = inMemoryVideos.filter((v) => v.id !== id);
    if (inMemoryVideos.length === initialLen) {
      return res.status(404).json({ success: false, error: "Vid\xE9o introuvable." });
    }
    saveLocalVideos(inMemoryVideos);
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
app.get("/api/videos/admin/all", (req, res) => {
  try {
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
app.get("/api/properties", (req, res) => {
  try {
    const { commune, type, status, listingStatus, search, limit = "100", offset = "0" } = req.query;
    let list = [...inMemoryProperties];
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
    const paginated = list.slice(Number(offset), Number(offset) + Number(limit));
    return res.json({ success: true, count: total, properties: paginated, data: paginated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "uploads", "videos");
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
      }
    }
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, `video_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});
var videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 }
});
app.post("/api/properties/upload-video", videoUpload.single("video"), (req, res) => {
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
  return res.json({ success: true, property: prop });
});
app.post("/api/properties", (req, res) => {
  try {
    const user = getAuthUser(req);
    const body = req.body;
    if (!user && !body.agentId && !body.contactEmail) {
      return res.status(401).json({
        success: false,
        error: "R\xE8gle m\xE9tier Kinimmo : Vous devez \xEAtre connect\xE9 pour publier une annonce."
      });
    }
    const id = body.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const listingStatus = (body.listingStatus || "PUBLISHED").toUpperCase();
    const isAvailable = listingStatus === "PUBLISHED";
    const newProp = {
      ...body,
      id,
      listingStatus,
      isAvailable,
      status: listingStatus === "SOLD" ? "sold" : body.status || "for-sale",
      createdAt: body.createdAt || nowIso,
      updatedAt: nowIso,
      statusHistory: [
        {
          id: `hist_${Date.now()}`,
          fromStatus: "NONE",
          toStatus: listingStatus,
          changedByUserId: body.agentId || "current_user",
          changedByName: body.agentName || "Agent Kinimmo",
          changedAt: nowIso,
          note: "Cr\xE9ation initiale de l'annonce"
        }
      ]
    };
    inMemoryProperties.unshift(newProp);
    saveLocalProperties(inMemoryProperties);
    return res.status(201).json({ success: true, message: "Annonce cr\xE9\xE9e avec succ\xE8s.", property: newProp });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/properties/:id", (req, res) => {
  try {
    const { id } = req.params;
    const idx = inMemoryProperties.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
    }
    const current = inMemoryProperties[idx];
    const incoming = req.body;
    const oldStatus = current.listingStatus || (current.status === "sold" ? "SOLD" : "PUBLISHED");
    const newStatus = incoming.listingStatus ? incoming.listingStatus.toUpperCase() : oldStatus;
    const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [];
    if (newStatus !== oldStatus) {
      history.push({
        id: `hist_${Date.now()}`,
        fromStatus: oldStatus,
        toStatus: newStatus,
        changedByUserId: incoming.userId || incoming.agentId || current.agentId || "current_user",
        changedByName: incoming.userName || incoming.agentName || "Utilisateur Kinimmo",
        changedAt: (/* @__PURE__ */ new Date()).toISOString(),
        note: incoming.statusNote || `Mise \xE0 jour du statut vers ${newStatus}`
      });
    }
    const updated = {
      ...current,
      ...incoming,
      id,
      listingStatus: newStatus,
      isAvailable: newStatus === "PUBLISHED",
      status: newStatus === "SOLD" ? "sold" : incoming.status || current.status,
      statusHistory: history,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryProperties[idx] = updated;
    saveLocalProperties(inMemoryProperties);
    return res.json({ success: true, message: "Annonce mise \xE0 jour avec succ\xE8s.", property: updated });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
var handlePropertyStatusUpdate = (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, userId, userName } = req.body;
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
    const oldStatus = current.listingStatus || (current.status === "sold" ? "SOLD" : "PUBLISHED");
    const history = Array.isArray(current.statusHistory) ? [...current.statusHistory] : [];
    history.push({
      id: `hist_${Date.now()}`,
      fromStatus: oldStatus,
      toStatus: targetStatus,
      changedByUserId: userId || current.agentId || "current_user",
      changedByName: userName || current.agentName || "Agent Kinimmo",
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
    const { id } = req.params;
    const { assignedAgentId, assignedAgentName } = req.body;
    const idx = inMemoryProperties.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
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
  const prop = inMemoryProperties.find((p) => p.id === req.params.id);
  if (!prop) {
    return res.status(404).json({ success: false, error: "Propri\xE9t\xE9 introuvable." });
  }
  return res.json({ success: true, history: prop.statusHistory || [] });
});
app.get("/api/agency/collaborators", (req, res) => {
  try {
    const { agencyId } = req.query;
    let list = inMemoryCollaborators;
    if (agencyId) {
      list = list.filter((c) => c.agencyId === agencyId);
    }
    return res.json({ success: true, count: list.length, collaborators: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/agency/collaborators/invite", (req, res) => {
  try {
    const { agencyId, name, email, phone, whatsapp, role = "agency_agent", permissions } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, error: "Le nom et l'adresse e-mail sont obligatoires." });
    }
    const newCollab = {
      id: `collab_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: agencyId || "agency_default",
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
    const { id } = req.params;
    const idx = inMemoryCollaborators.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Collaborateur introuvable." });
    }
    inMemoryCollaborators[idx] = {
      ...inMemoryCollaborators[idx],
      ...req.body,
      id
    };
    saveLocalCollaborators(inMemoryCollaborators);
    return res.json({ success: true, message: "Collaborateur mis \xE0 jour.", collaborator: inMemoryCollaborators[idx] });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/agency/collaborators/:id", (req, res) => {
  try {
    const { id } = req.params;
    inMemoryCollaborators = inMemoryCollaborators.filter((c) => c.id !== id);
    saveLocalCollaborators(inMemoryCollaborators);
    return res.json({ success: true, message: "Collaborateur retir\xE9 de l'agence." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/agency/transactions", (req, res) => {
  try {
    const { agencyId } = req.query;
    let list = inMemoryTransactions;
    if (agencyId) {
      list = list.filter((t) => t.agencyId === agencyId);
    }
    return res.json({ success: true, count: list.length, transactions: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/agency/transactions", (req, res) => {
  try {
    const body = req.body;
    const newTx = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      agencyId: body.agencyId || "agency_default",
      propertyId: body.propertyId || "",
      propertyTitle: body.propertyTitle || "Propri\xE9t\xE9 Kinshasa",
      agentId: body.agentId || "agent_current",
      agentName: body.agentName || "Agent Immobilier",
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
    const { target_type, status, applicant_id } = req.query;
    let list = [...inMemoryTrust.verifications];
    if (target_type) {
      list = list.filter((v) => v.targetType === target_type);
    }
    if (status) {
      list = list.filter((v) => v.trustStatus === status);
    }
    if (applicant_id) {
      list = list.filter((v) => v.applicantUserId === applicant_id);
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
    const { id } = req.params;
    const verification = inMemoryTrust.verifications.find((v) => v.id === id);
    if (!verification) {
      return res.status(404).json({ success: false, message: "Dossier Kinimmo Trust introuvable." });
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
    const user = getAuthUser(req) || { id: "usr_guest", name: "Utilisateur Kinimmo", email: "guest@kinimmo.cd", role: "user" };
    const { target_type, target_id, target_name, documents = [], applicant_phone } = req.body;
    if (!target_type || !target_id || !target_name) {
      return res.status(400).json({ success: false, message: "Type de cible, ID cible et Nom sont obligatoires." });
    }
    if (target_type === "property") {
      const prop = inMemoryProperties.find((p) => p.id === target_id);
      if (!prop) {
        return res.status(404).json({ success: false, message: "Annonce immobili\xE8re cibl\xE9e introuvable." });
      }
      const isPublisher = prop.agentId === user.id || prop.userId === user.id || user.email && prop.contactEmail && prop.contactEmail.toLowerCase() === user.email.toLowerCase() || user.id === "agent-1" && (prop.agentId === "agent-1" || prop.agentId === "collab_patrick") || user.role === "admin";
      if (!isPublisher) {
        return res.status(403).json({
          success: false,
          message: "R\xE8gle m\xE9tier Kinimmo Trust : Vous pouvez uniquement certifier les biens immobiliers qui vous appartiennent (que vous avez vous-m\xEAme publi\xE9s). Il est strictement interdit de demander la certification d\u2019un bien appartenant \xE0 un tiers."
        });
      }
    } else if (target_type === "agent") {
      const isSelf = user.id === target_id || user.id === "agent-1" || user.role === "admin";
      if (!isSelf) {
        return res.status(403).json({
          success: false,
          message: "R\xE8gle m\xE9tier Kinimmo Trust : Vous ne pouvez soumettre une v\xE9rification que pour votre propre profil d\u2019agent."
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
    const user = getAuthUser(req);
    const admin = user || { id: "admin_master", name: "Direction Kinimmo", email: "admin@kinimmo.cd", role: "admin" };
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
    const user = getAuthUser(req);
    const admin = user || { id: "admin_master", name: "Direction Kinimmo", email: "admin@kinimmo.cd", role: "admin" };
    if (admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Acc\xE8s interdit : R\xF4le administrateur requis." });
    }
    const { id } = req.params;
    const { message, requested_fields } = req.body;
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
    const user = getAuthUser(req) || { id: "admin_master", name: "Direction Kinimmo", email: "admin@kinimmo.cd", role: "admin" };
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
    const admin = getAuthUser(req) || { id: "admin_master", name: "Direction Kinimmo", email: "admin@kinimmo.cd", role: "admin" };
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
    const admin = getAuthUser(req) || { id: "admin_master", name: "Direction Kinimmo", email: "admin@kinimmo.cd", role: "admin" };
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
    const user = getAuthUser(req) || { id: "usr_author", name: "Agent Certifi\xE9", email: "agent@kinimmo.cd", role: "agent" };
    const { propertyId } = req.params;
    const { availability_status = "available", confirmation_method = "agent_statement", notes } = req.body;
    const prop = inMemoryProperties.find((p) => p.id === propertyId);
    if (!prop) {
      return res.status(404).json({ success: false, message: "Bien immobilier introuvable." });
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
app.get("/api/trust/audit-logs", (_req, res) => {
  try {
    return res.json({ success: true, count: inMemoryTrust.auditLogs.length, data: inMemoryTrust.auditLogs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/trust/notifications", (req, res) => {
  try {
    const user = getAuthUser(req);
    let list = inMemoryTrust.notifications;
    if (user && user.id) {
      list = list.filter((n) => n.userId === user.id || n.userId === "all");
    }
    return res.json({ success: true, count: list.length, data: list });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.put("/api/trust/notifications/:id/read", (req, res) => {
  try {
    const { id } = req.params;
    const notif = inMemoryTrust.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      saveLocalTrust(inMemoryTrust);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/health", (_req, res) => {
  res.json({
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
app.get("/sitemap.xml", (req, res) => {
  try {
    const baseUrl = getSiteBaseUrl(req);
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const staticPages = [
      { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
      { loc: `${baseUrl}/visites`, priority: "0.9", changefreq: "daily" },
      { loc: `${baseUrl}/conciergerie`, priority: "0.8", changefreq: "weekly" },
      { loc: `${baseUrl}/?tab=map`, priority: "0.8", changefreq: "weekly" },
      { loc: `${baseUrl}/?tab=agents`, priority: "0.8", changefreq: "weekly" },
      { loc: `${baseUrl}/?tab=agencies`, priority: "0.8", changefreq: "weekly" },
      { loc: `${baseUrl}/?tab=pricing`, priority: "0.7", changefreq: "monthly" },
      { loc: `${baseUrl}/?status=for-sale`, priority: "0.8", changefreq: "daily" },
      { loc: `${baseUrl}/?status=for-rent`, priority: "0.8", changefreq: "daily" }
    ];
    const topCommunes = [
      "Gombe",
      "Ngaliema",
      "Limete",
      "Kintambo",
      "Mont-Ngafula",
      "Bandalungwa",
      "Kalamu",
      "Lingwala",
      "Barumbu",
      "Kinshasa"
    ];
    const communePages = topCommunes.map((c) => ({
      loc: `${baseUrl}/?commune=${encodeURIComponent(c)}`,
      priority: "0.7",
      changefreq: "weekly",
      lastmod: today
    }));
    const publishedProps = inMemoryProperties.filter(
      (p) => p && (p.published !== false && p.listingStatus !== "ARCHIVED" && p.listingStatus !== "REJECTED")
    );
    const propertyPages = publishedProps.map((p) => {
      let lastmod = today;
      if (p.updatedAt) {
        lastmod = String(p.updatedAt).split("T")[0];
      } else if (p.createdAt) {
        lastmod = String(p.createdAt).split("T")[0];
      }
      return {
        loc: `${baseUrl}/?property=${encodeURIComponent(p.id)}`,
        priority: p.featured ? "0.9" : "0.8",
        changefreq: "weekly",
        lastmod
      };
    });
    const allUrls = [
      ...staticPages.map((p) => ({ ...p, lastmod: today })),
      ...communePages,
      ...propertyPages
    ];
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
Disallow: /agent-dashboard
Disallow: /agency-dashboard

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header("Content-Type", "text/plain; charset=utf-8");
  res.header("Cache-Control", "public, max-age=86400");
  return res.send(robots);
});
async function startServer() {
  const distPath = path.join(__dirname, "dist");
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, "index.html"));
  if (isProd || hasDist) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
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
      app.use(vite.middlewares);
    } catch (viteError) {
      console.warn("Vite non disponible en environnement d h\xE9bergement, bascule en mode statique :", viteError.message);
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
      }
      app.get("*", (_req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
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
