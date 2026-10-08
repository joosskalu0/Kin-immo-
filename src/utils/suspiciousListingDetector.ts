/**
 * Algorithme de Détection des Annonces Suspectes & Anti-Fraude Immobilière - Kinimmo RDC
 * 
 * Capable de détecter avec précision :
 * 1. Même numéro utilisé sur beaucoup d'annonces
 * 2. Mêmes photos utilisées plusieurs fois
 * 3. Prix anormalement bas (comparé aux prix du marché selon la commune de Kinshasa et type de bien)
 * 4. Annonces identiques (doublons de titres, descriptions et caractéristiques)
 * 5. Comportement inhabituel (mots-clés de tentative d'escroquerie, acompte préalable, multi-publications éclair)
 * 6. Vendeur signalé plusieurs fois (historique de plaintes des acquéreurs)
 * 
 * Système de décision en 3 paliers :
 * 🟢 Normal (Score < 30)      -> Publication directe
 * 🟠 À vérifier (Score 30-69) -> Contrôle manuel requis par les modérateurs
 * 🔴 Suspect (Score >= 70)    -> Blocage temporaire immédiat (mise en quarantaine)
 */

import { Property, FraudVerdict, FraudFlag, FraudAnalysisResult, PropertyUserReport } from '../types';

// Valeurs de référence minimales réalistes par commune à Kinshasa (en USD)
// Si le prix d'une annonce est très inférieur à ces seuils, il s'agit d'un signal fort d'arnaque
export const KINSHASA_PRICE_BENCHMARKS: Record<string, { minRent: number; avgRent: number; minSale: number; avgSale: number }> = {
  'Gombe': { minRent: 700, avgRent: 2200, minSale: 120000, avgSale: 450000 },
  'Ngaliema': { minRent: 450, avgRent: 1500, minSale: 80000, avgSale: 320000 },
  'Mont-Ngafula': { minRent: 150, avgRent: 500, minSale: 25000, avgSale: 90000 },
  'Kintambo': { minRent: 350, avgRent: 900, minSale: 60000, avgSale: 180000 },
  'Limete': { minRent: 400, avgRent: 1200, minSale: 70000, avgSale: 250000 },
  'Bandalungwa': { minRent: 250, avgRent: 600, minSale: 40000, avgSale: 110000 },
  'Barumbu': { minRent: 180, avgRent: 450, minSale: 30000, avgSale: 80000 },
  'Kinshasa': { minRent: 200, avgRent: 500, minSale: 35000, avgSale: 95000 },
  'Lingwala': { minRent: 200, avgRent: 500, minSale: 35000, avgSale: 85000 },
  'Kalamu': { minRent: 200, avgRent: 550, minSale: 35000, avgSale: 90000 },
  'Kasa-Vubu': { minRent: 250, avgRent: 600, minSale: 40000, avgSale: 100000 },
  'Lemba': { minRent: 200, avgRent: 500, minSale: 35000, avgSale: 95000 },
  'Matete': { minRent: 180, avgRent: 450, minSale: 30000, avgSale: 80000 },
  'Masina': { minRent: 120, avgRent: 350, minSale: 20000, avgSale: 60000 },
  'Ndjili': { minRent: 120, avgRent: 300, minSale: 18000, avgSale: 55000 },
  'Kimbanseke': { minRent: 100, avgRent: 250, minSale: 15000, avgSale: 45000 },
  'Nsele': { minRent: 100, avgRent: 300, minSale: 15000, avgSale: 50000 },
  'Maluku': { minRent: 80, avgRent: 250, minSale: 12000, avgSale: 40000 },
  'Selembao': { minRent: 120, avgRent: 350, minSale: 20000, avgSale: 60000 },
  'Bumbu': { minRent: 120, avgRent: 300, minSale: 18000, avgSale: 55000 },
  'Makala': { minRent: 120, avgRent: 300, minSale: 18000, avgSale: 55000 },
  'Ngaba': { minRent: 130, avgRent: 320, minSale: 20000, avgSale: 60000 },
  'Kisenso': { minRent: 80, avgRent: 220, minSale: 12000, avgSale: 40000 }
};

// Mots-clés suspects indiquant un risque d'escroquerie (phishing, demande de transfert anticipé, etc.)
export const SUSPICIOUS_KEYWORDS = [
  { term: 'acompte avant visite', severity: 'critical', score: 35 },
  { term: 'payer avant de visiter', severity: 'critical', score: 35 },
  { term: 'frais de visite obligatoire d\'avance', severity: 'high', score: 25 },
  { term: 'western union', severity: 'critical', score: 30 },
  { term: 'moneygram', severity: 'critical', score: 30 },
  { term: 'airtel money avant', severity: 'high', score: 25 },
  { term: 'm-pesa avant', severity: 'high', score: 25 },
  { term: 'orange money avant', severity: 'high', score: 25 },
  { term: 'propriétaire en voyage', severity: 'medium', score: 20 },
  { term: 'propriétaire hospitalisé', severity: 'critical', score: 30 },
  { term: 'mandat postal', severity: 'high', score: 25 },
  { term: 'transfert préalable', severity: 'high', score: 25 },
  { term: 'bloquer le bien avec une avance', severity: 'high', score: 20 },
  { term: 'très urgent affaire en or', severity: 'low', score: 10 },
  { term: 'prix sacrifié cause départ immédiat', severity: 'medium', score: 15 }
];

// Nettoyer un numéro de téléphone pour comparaison canonique
export function normalizePhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '').slice(-9); // Garde les 9 derniers chiffres (format RDC ex: 812345678)
}

// Calcul de similarité textuelle simple (Jaccard sur tokens)
export function computeTextSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  const tokensA = new Set(textA.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2));
  const tokensB = new Set(textB.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 2));
  
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  
  let intersection = 0;
  tokensA.forEach(token => {
    if (tokensB.has(token)) intersection++;
  });
  
  const union = new Set([...tokensA, ...tokensB]).size;
  return union > 0 ? intersection / union : 0;
}

/**
 * MOTEUR PRINCIPAL D'ANALYSE ANTI-FRAUDE
 * 
 * Évalue une annonce par rapport à l'ensemble du catalogue et à l'historique des signalements
 */
export function analyzePropertyForFraud(
  target: Property,
  allProperties: Property[] = [],
  userReports: PropertyUserReport[] = []
): FraudAnalysisResult {
  const flags: FraudFlag[] = [];
  let riskScore = 0;

  const targetPhone = normalizePhoneNumber(target.contactPhone || target.privateFields?.ownerPhone);
  const targetImages = target.images || [];
  const otherProperties = allProperties.filter(p => p.id !== target.id);

  // =========================================================================
  // RÈGLE 1 : Même numéro utilisé sur beaucoup d'annonces
  // =========================================================================
  let samePhoneCount = 0;
  const listingsWithSamePhone: Property[] = [];

  if (targetPhone && targetPhone.length >= 7) {
    otherProperties.forEach(p => {
      const pPhone = normalizePhoneNumber(p.contactPhone || p.privateFields?.ownerPhone);
      if (pPhone && pPhone === targetPhone) {
        samePhoneCount++;
        listingsWithSamePhone.push(p);
      }
    });

    // Seuil : plus de 5 annonces avec le même numéro pour un courtier/particulier
    if (samePhoneCount >= 8) {
      const pts = 35;
      riskScore += pts;
      flags.push({
        code: 'SAME_PHONE_MANY_LISTINGS',
        label: 'Même numéro sur un volume anormal d\'annonces',
        severity: 'high',
        score: pts,
        details: `Ce numéro de contact (${target.contactPhone || targetPhone}) est présent sur ${samePhoneCount + 1} annonces différentes.`
      });
    } else if (samePhoneCount >= 4) {
      const pts = 18;
      riskScore += pts;
      flags.push({
        code: 'SAME_PHONE_MANY_LISTINGS',
        label: 'Même numéro récurrent sur plusieurs annonces',
        severity: 'medium',
        score: pts,
        details: `Le numéro de contact apparaît déjà sur ${samePhoneCount} autres annonces.`
      });
    }
  }

  // =========================================================================
  // RÈGLE 2 : Mêmes photos utilisées plusieurs fois (doublons d'images)
  // =========================================================================
  const duplicatePhotoUrls: string[] = [];
  let foundReusedFromOtherAgent = false;

  if (targetImages.length > 0) {
    const targetUrlSet = new Set(targetImages.map(img => img.split('?')[0].trim()));

    otherProperties.forEach(otherProp => {
      const otherImgs = (otherProp.images || []).map(img => img.split('?')[0].trim());
      otherImgs.forEach(imgUrl => {
        if (imgUrl && targetUrlSet.has(imgUrl) && !duplicatePhotoUrls.includes(imgUrl)) {
          duplicatePhotoUrls.push(imgUrl);
          // Si les photos sont réutilisées par un agent/compte différent
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
        code: 'DUPLICATE_PHOTOS',
        label: foundReusedFromOtherAgent ? 'Photos volées / réutilisées d\'un autre compte' : 'Photos dupliquées sur d\'autres annonces',
        severity: foundReusedFromOtherAgent ? 'critical' : 'high',
        score: pts,
        details: `${duplicatePhotoUrls.length} photo(s) identique(s) ont été détectées sur d'autres biens${foundReusedFromOtherAgent ? ' appartenant à d\'autres annonceurs' : ''}.`
      });
    }
  }

  // =========================================================================
  // RÈGLE 3 : Prix anormalement bas (comparaison avec la médiane de la commune)
  // =========================================================================
  let priceAnomalyRatio: number | undefined;
  let benchmarkPrice: number | undefined;

  const targetCommune = target.commune || 'Gombe';
  const communeBenchmark = KINSHASA_PRICE_BENCHMARKS[targetCommune] || KINSHASA_PRICE_BENCHMARKS['Gombe'];
  const isRent = target.status === 'for-rent' || target.period === 'month';
  const targetPrice = Number(target.price) || 0;

  if (isRent) {
    benchmarkPrice = communeBenchmark.minRent;
    if (targetPrice > 0 && targetPrice < communeBenchmark.minRent * 0.4) {
      // Prix inférieur à 40% du loyer minimal admissible
      priceAnomalyRatio = targetPrice / communeBenchmark.minRent;
      const pts = targetPrice < communeBenchmark.minRent * 0.25 ? 40 : 25;
      riskScore += pts;
      flags.push({
        code: 'ABNORMALLY_LOW_PRICE',
        label: 'Prix anormalement bas (suspect d\'arnaque au loyer)',
        severity: pts >= 35 ? 'critical' : 'high',
        score: pts,
        details: `Loyer affiché de ${targetPrice}$/${target.period || 'mois'} à ${targetCommune}, alors que le plancher réaliste du quartier est d'au moins ${communeBenchmark.minRent}$ (prix inférieur de ${Math.round((1 - priceAnomalyRatio) * 100)}%).`
      });
    }
  } else {
    // Vente
    benchmarkPrice = communeBenchmark.minSale;
    if (targetPrice > 0 && targetPrice < communeBenchmark.minSale * 0.35) {
      // Prix de vente inférieur à 35% du plancher de la commune
      priceAnomalyRatio = targetPrice / communeBenchmark.minSale;
      const pts = targetPrice < communeBenchmark.minSale * 0.2 ? 45 : 30;
      riskScore += pts;
      flags.push({
        code: 'ABNORMALLY_LOW_PRICE',
        label: 'Prix de vente anormalement dérisoire',
        severity: 'critical',
        score: pts,
        details: `Prix de vente de ${targetPrice.toLocaleString()}$ pour un bien à ${targetCommune}, bien en dessous de la valeur minimale marchande estimée à ${communeBenchmark.minSale.toLocaleString()}$.`
      });
    }
  }

  // =========================================================================
  // RÈGLE 4 : Annonces identiques (détection de robots de spam ou doublons)
  // =========================================================================
  let identicalListingId: string | undefined;
  let identicalListingTitle: string | undefined;
  let maxSimilarity = 0;

  otherProperties.forEach(otherProp => {
    const titleSim = computeTextSimilarity(target.title, otherProp.title);
    const descSim = computeTextSimilarity(target.description || '', otherProp.description || '');
    const combinedScore = (titleSim * 0.6) + (descSim * 0.4);

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
      code: 'IDENTICAL_LISTING',
      label: 'Annonce quasi-identique à un bien existant',
      severity: 'high',
      score: pts,
      details: `Similarité textuelle de ${Math.round(maxSimilarity * 100)}% avec l'annonce "${identicalListingTitle}" (ID: ${identicalListingId}).`
    });
  }

  // =========================================================================
  // RÈGLE 5 : Comportement inhabituel & mots-clés d'arnaque
  // =========================================================================
  const textCorpus = `${target.title} ${target.description || ''} ${target.address || ''}`.toLowerCase();
  const unusualKeywordsFound: string[] = [];

  SUSPICIOUS_KEYWORDS.forEach(kw => {
    if (textCorpus.includes(kw.term.toLowerCase())) {
      unusualKeywordsFound.push(kw.term);
      riskScore += kw.score;
      flags.push({
        code: 'UNUSUAL_BEHAVIOR',
        label: `Terme suspect détecté : "${kw.term}"`,
        severity: kw.severity as any,
        score: kw.score,
        details: `L'annonce mentionne "${kw.term}", une formule fréquemment employée dans les tentatives d'escroquerie à la visite.`
      });
    }
  });

  // Détection de texte tout en majuscules (comportement agressif/spam)
  const lettersOnly = (target.title || '').replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length > 15) {
    const upperRatio = (target.title.replace(/[^A-Z]/g, '').length) / lettersOnly.length;
    if (upperRatio > 0.8) {
      const pts = 12;
      riskScore += pts;
      flags.push({
        code: 'UNUSUAL_BEHAVIOR',
        label: 'Titre entièrement en majuscules (Spam/Agressif)',
        severity: 'low',
        score: pts,
        details: 'Le titre est rédigé en lettres capitales pour capter l\'attention de façon non professionnelle.'
      });
    }
  }

  // =========================================================================
  // RÈGLE 6 : Vendeur signalé plusieurs fois
  // =========================================================================
  // Compter les signalements liés à cette annonce ou à cet agent
  const matchingReports = userReports.filter(r => 
    r.propertyId === target.id ||
    (target.agentId && r.propertyId && allProperties.find(p => p.id === r.propertyId)?.agentId === target.agentId)
  );

  const sellerReportsCount = matchingReports.length;

  if (sellerReportsCount >= 3) {
    const pts = 55;
    riskScore += pts;
    flags.push({
      code: 'SELLER_REPORTED_MULTIPLE_TIMES',
      label: 'Vendeur / Annonceur signalé à répétition',
      severity: 'critical',
      score: pts,
      details: `${sellerReportsCount} signalements d'utilisateurs ont été déposés contre cet annonceur pour abus ou tentative de fraude.`
    });
  } else if (sellerReportsCount >= 1) {
    const pts = 25;
    riskScore += pts;
    flags.push({
      code: 'SELLER_REPORTED_MULTIPLE_TIMES',
      label: 'Signalement utilisateur actif',
      severity: 'medium',
      score: pts,
      details: `${sellerReportsCount} signalement enregistré pour cette annonce ou ce vendeur.`
    });
  }

  // Plafonner le score à 100
  riskScore = Math.min(100, Math.round(riskScore));

  // =========================================================================
  // VERDICT FINAL EN 3 PALIERS :
  // 🟢 Normal (score < 30 et pas de flag critique)
  // 🟠 À vérifier (score 30-69 ou flag de gravité élevée)
  // 🔴 Suspect (score >= 70 ou flag critique)
  // =========================================================================
  let verdict: FraudVerdict = 'normal';
  let recommendation = 'Annonce conforme aux règles de sécurité. Publication autorisée.';

  const hasCriticalFlag = flags.some(f => f.severity === 'critical');
  const hasHighFlag = flags.some(f => f.severity === 'high');

  if (riskScore >= 70 || hasCriticalFlag) {
    verdict = 'suspect';
    recommendation = '🔴 SUSPECT : Risque très élevé de fraude. L\'annonce a été temporairement bloquée par mesure de précaution. Un contrôle approfondi par un administrateur est obligatoire avant toute réactivation.';
  } else if (riskScore >= 30 || hasHighFlag) {
    verdict = 'review_required';
    recommendation = '🟠 À VÉRIFIER : Des anomalies significatives ont été relevées. L\'annonce est en attente d\'une validation manuelle par l\'équipe de modération Kinimmo.';
  }

  return {
    propertyId: target.id,
    verdict,
    riskScore,
    analyzedAt: new Date().toISOString(),
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

/**
 * Audit global de tout le catalogue d'annonces
 */
export function auditPropertyList(
  properties: Property[],
  userReports: PropertyUserReport[] = []
): {
  total: number;
  normalCount: number;
  reviewRequiredCount: number;
  suspectCount: number;
  results: Map<string, FraudAnalysisResult>;
  auditedProperties: Array<Property & { fraudAnalysis: FraudAnalysisResult }>;
} {
  const results = new Map<string, FraudAnalysisResult>();
  let normalCount = 0;
  let reviewRequiredCount = 0;
  let suspectCount = 0;

  const auditedProperties = properties.map(property => {
    const analysis = analyzePropertyForFraud(property, properties, userReports);
    results.set(property.id, analysis);

    if (analysis.verdict === 'suspect') suspectCount++;
    else if (analysis.verdict === 'review_required') reviewRequiredCount++;
    else normalCount++;

    return {
      ...property,
      fraudStatus: analysis.verdict,
      fraudScore: analysis.riskScore,
      fraudFlags: analysis.flags,
      fraudLastCheckedAt: analysis.analyzedAt,
      published: analysis.verdict === 'normal' ? property.published : false,
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
