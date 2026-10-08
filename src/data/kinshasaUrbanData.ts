/**
 * Données d'Intelligence Urbaine & Immobilière de Kinshasa
 * 
 * Regroupe les métriques territoriales demandées :
 * - Prix moyen du quartier & loyers moyens
 * - Écoles & Universités de référence
 * - Hôpitaux & Cliniques d'urgence
 * - Marchés & Hypermarchés
 * - Routes principales & Boulevards
 * - Indices de sécurité
 * - Disponibilité de l'eau (REGIDESO & forages)
 * - Stabilité électricité (SNEL & solaire)
 * - Points névralgiques pour calcul de distance (Aéroport, Centre Gombe, etc.)
 * - Évolution historique des prix (2022 - 2026)
 */

export interface CommuneUrbanMetrics {
  id: string;
  name: string;
  district: 'Lukunga' | 'Funa' | 'Mont-Amba' | 'Tshangu';
  lat: number;
  lng: number;
  zoomLevel: number;
  
  // Prix & Loyers
  avgSalePriceUSD: number; // Prix moyen d'un bien
  avgSalePerSqmUSD: number; // Prix moyen / m²
  avgRentMonthlyUSD: number; // Loyer mensuel moyen
  rentBreakdown: {
    studio2rooms: number;
    apt3rooms: number;
    villaStanding: number;
  };
  
  // Évolution historique des prix (en USD / m²)
  priceHistory: Array<{ year: string; pricePerSqm: number; growthPct: number }>;
  annualAppreciationRate: number; // e.g. +11.5% / an
  
  // Services & Cadre de vie (notes / 10)
  securityScore: number;
  securityLabel: 'Zone Diplomatique / Très Sécurisée' | 'Sécurisée / Patrouilles Régulières' | 'Moyenne / Vigilance Normale';
  securityDetails: string;
  
  waterScore: number;
  waterLabel: 'Excellent (Forages privés + REGIDESO continu)' | 'Bon (Régulier avec citerne)' | 'Moyen (Coupures tournantes)';
  waterDetails: string;
  
  powerScore: number;
  powerLabel: 'Très Stable (Ligne prioritaire + Groupes)' | 'Stable (Solaire + SNEL)' | 'Variable (Délestage périodique)';
  powerDetails: string;
  
  commuteToGombeMin: string;
  
  // Description & Profil
  overview: string;
  recommendedFor: string[];
}

export interface LandmarkPOI {
  id: string;
  name: string;
  category: 'school' | 'hospital' | 'market' | 'hub';
  commune: string;
  lat: number;
  lng: number;
  description: string;
  details?: string;
  contact?: string;
}

export interface MajorRoadRoute {
  id: string;
  name: string;
  type: 'boulevard' | 'highway' | 'avenue';
  trafficSpeed: string;
  importance: string;
  coordinates: Array<[number, number]>; // [lat, lng]
}

export interface StrategicDistanceHub {
  id: string;
  name: string;
  shortName: string;
  iconName: string;
  lat: number;
  lng: number;
  description: string;
}

// -------------------------------------------------------------
// 1. MÉTRIQUES PAR COMMUNE (Prix, Loyers, Eau, Électricité, Sécurité, Évolution)
// -------------------------------------------------------------
export const KINSHASA_URBAN_COMMUNES: CommuneUrbanMetrics[] = [
  {
    id: 'Gombe',
    name: 'Gombe',
    district: 'Lukunga',
    lat: -4.3033,
    lng: 15.3045,
    zoomLevel: 14,
    avgSalePriceUSD: 520000,
    avgSalePerSqmUSD: 2950,
    avgRentMonthlyUSD: 3200,
    rentBreakdown: {
      studio2rooms: 1600,
      apt3rooms: 3000,
      villaStanding: 6500
    },
    priceHistory: [
      { year: '2022', pricePerSqm: 2300, growthPct: 0 },
      { year: '2023', pricePerSqm: 2480, growthPct: 7.8 },
      { year: '2024', pricePerSqm: 2650, growthPct: 6.8 },
      { year: '2025', pricePerSqm: 2820, growthPct: 6.4 },
      { year: '2026', pricePerSqm: 2950, growthPct: 4.6 }
    ],
    annualAppreciationRate: 6.5,
    securityScore: 9.6,
    securityLabel: 'Zone Diplomatique / Très Sécurisée',
    securityDetails: 'Quartier présidentiel, ambassades et banques. Surveillance policière 24/7 et patrouilles permanentes.',
    waterScore: 9.0,
    waterLabel: 'Excellent (Forages privés + REGIDESO continu)',
    waterDetails: 'Réseau REGIDESO sous pression continue avec forages privés et hydrophores sur 95% des immeubles.',
    powerScore: 9.2,
    powerLabel: 'Très Stable (Ligne prioritaire + Groupes)',
    powerDetails: 'Raccordement aux lignes prioritaires SNEL du centre-ville, doublé de groupes électrogènes automatiques.',
    commuteToGombeMin: '0 min (Centre des affaires)',
    overview: 'Cœur économique, financier et institutionnel de la République Démocratique du Congo. Forte concentration d\'expatriés, ambassades et multinationales.',
    recommendedFor: ['Diplomates', 'Directeurs & Expatriés', 'Investisseurs locatifs haut rendement', 'Sociétés']
  },
  {
    id: 'Ngaliema',
    name: 'Ngaliema (Macampagne / Mont-Fleury)',
    district: 'Lukunga',
    lat: -4.3385,
    lng: 15.2635,
    zoomLevel: 13,
    avgSalePriceUSD: 410000,
    avgSalePerSqmUSD: 1950,
    avgRentMonthlyUSD: 2400,
    rentBreakdown: {
      studio2rooms: 1100,
      apt3rooms: 2200,
      villaStanding: 5000
    },
    priceHistory: [
      { year: '2022', pricePerSqm: 1450, growthPct: 0 },
      { year: '2023', pricePerSqm: 1600, growthPct: 10.3 },
      { year: '2024', pricePerSqm: 1740, growthPct: 8.7 },
      { year: '2025', pricePerSqm: 1860, growthPct: 6.9 },
      { year: '2026', pricePerSqm: 1950, growthPct: 4.8 }
    ],
    annualAppreciationRate: 8.2,
    securityScore: 9.1,
    securityLabel: 'Zone Diplomatique / Très Sécurisée',
    securityDetails: 'Quartiers résidentiels huppés (Macampagne, Mont-Fleury, Joli Parc) avec gardiennage privé et clôtures sécurisées.',
    waterScore: 8.7,
    waterLabel: 'Excellent (Forages privés + REGIDESO continu)',
    waterDetails: 'Forages privatifs profonds avec châteaux d’eau et filtration UV sur la quasi-totalité des villas.',
    powerScore: 8.6,
    powerLabel: 'Stable (Solaire + SNEL)',
    powerDetails: 'Forte adoption de centrales solaires hybrides (10-25 KVA) garantissant une autonomie énergétique continue.',
    commuteToGombeMin: '15 à 30 min (via Bd 30 Juin ou Mondjiba)',
    overview: 'Quartier résidentiel calme et verdoyant sur les collines ouest. Idéal pour les familles cherchant de grands jardins et des vues panoramiques.',
    recommendedFor: ['Familles aisées', 'Cadres supérieurs', 'Amateurs de calme et verdure', 'Villas privées']
  },
  {
    id: 'Kintambo',
    name: 'Kintambo (Magasin / Baie)',
    district: 'Lukunga',
    lat: -4.3265,
    lng: 15.2798,
    zoomLevel: 14,
    avgSalePriceUSD: 290000,
    avgSalePerSqmUSD: 1650,
    avgRentMonthlyUSD: 1750,
    rentBreakdown: {
      studio2rooms: 900,
      apt3rooms: 1600,
      villaStanding: 3500
    },
    priceHistory: [
      { year: '2022', pricePerSqm: 1250, growthPct: 0 },
      { year: '2023', pricePerSqm: 1380, growthPct: 10.4 },
      { year: '2024', pricePerSqm: 1490, growthPct: 8.0 },
      { year: '2025', pricePerSqm: 1580, growthPct: 6.0 },
      { year: '2026', pricePerSqm: 1650, growthPct: 4.4 }
    ],
    annualAppreciationRate: 7.2,
    securityScore: 8.7,
    securityLabel: 'Sécurisée / Patrouilles Régulières',
    securityDetails: 'Quartier intermédiaire très actif avec présence militaire/policière continue autour de Kintambo Magasin.',
    waterScore: 8.3,
    waterLabel: 'Bon (Régulier avec citerne)',
    waterDetails: 'Réseau urbain REGIDESO stable avec citernes tampons recommandées pour les immeubles à étages.',
    powerScore: 8.3,
    powerLabel: 'Stable (Solaire + SNEL)',
    powerDetails: 'Bonne alimentation grâce à la proximité des sous-stations de Kintambo et Bandalungwa.',
    commuteToGombeMin: '8 à 15 min',
    overview: 'Charnière stratégique entre Gombe et Ngaliema. Proximité immédiate des centres commerciaux de Kintambo Magasin et des restaurants de la baie.',
    recommendedFor: ['Jeunes cadres', 'Professions libérales', 'Commerces & Bureaux', 'Résidence urbaine']
  },
  {
    id: 'Limete',
    name: 'Limete (Résidentiel / 7ème Rue)',
    district: 'Funa',
    lat: -4.3542,
    lng: 15.3412,
    zoomLevel: 13,
    avgSalePriceUSD: 360000,
    avgSalePerSqmUSD: 1450,
    avgRentMonthlyUSD: 1600,
    rentBreakdown: {
      studio2rooms: 800,
      apt3rooms: 1500,
      villaStanding: 3200
    },
    priceHistory: [
      { year: '2022', pricePerSqm: 1100, growthPct: 0 },
      { year: '2023', pricePerSqm: 1220, growthPct: 10.9 },
      { year: '2024', pricePerSqm: 1310, growthPct: 7.4 },
      { year: '2025', pricePerSqm: 1390, growthPct: 6.1 },
      { year: '2026', pricePerSqm: 1450, growthPct: 4.3 }
    ],
    annualAppreciationRate: 7.1,
    securityScore: 8.5,
    securityLabel: 'Sécurisée / Patrouilles Régulières',
    securityDetails: 'Quartier résidentiel calme, rues larges et clôturées. Surveillance efficace de la 1ère à la 20ème rue.',
    waterScore: 8.0,
    waterLabel: 'Bon (Régulier avec citerne)',
    waterDetails: 'Nappe phréatique très accessible permettant des forages peu profonds et économiques.',
    powerScore: 8.1,
    powerLabel: 'Stable (Solaire + SNEL)',
    powerDetails: 'Réseau correct soutenu par des installations solaires individuelles et groupes de secours.',
    commuteToGombeMin: '12 à 25 min (accès direct Bd Lumumba)',
    overview: 'Commune résidentielle historique aux parcelles généreuses (800 à 1 500 m²). Très prisée pour les sièges d\'ONG, fondations et résidences familiales.',
    recommendedFor: ['Grandes familles', 'Sièges d\'ONG', 'Investissement patrimonial', 'Villas à rénover']
  },
  {
    id: 'Mont-Ngafula',
    name: 'Mont-Ngafula (Cité Verte / Mbudi)',
    district: 'Lukunga',
    lat: -4.4215,
    lng: 15.2584,
    zoomLevel: 13,
    avgSalePriceUSD: 175000,
    avgSalePerSqmUSD: 850,
    avgRentMonthlyUSD: 850,
    rentBreakdown: {
      studio2rooms: 450,
      apt3rooms: 800,
      villaStanding: 1800
    },
    priceHistory: [
      { year: '2022', pricePerSqm: 580, growthPct: 0 },
      { year: '2023', pricePerSqm: 660, growthPct: 13.8 },
      { year: '2024', pricePerSqm: 740, growthPct: 12.1 },
      { year: '2025', pricePerSqm: 800, growthPct: 8.1 },
      { year: '2026', pricePerSqm: 850, growthPct: 6.2 }
    ],
    annualAppreciationRate: 10.2,
    securityScore: 8.0,
    securityLabel: 'Moyenne / Vigilance Normale',
    securityDetails: 'Quartiers calmes en hauteur, micro-communautés fermées avec vigiles privés.',
    waterScore: 7.5,
    waterLabel: 'Moyen (Coupures tournantes)',
    waterDetails: 'Approvisionnement principalement assuré par forages privés et sources naturelles d\'altitude.',
    powerScore: 7.2,
    powerLabel: 'Variable (Délestage périodique)',
    powerDetails: 'Délestages plus fréquents compensés par l\'énergie solaire photovoltaïque très répandue.',
    commuteToGombeMin: '30 à 60 min (selon trafic Route de Matadi)',
    overview: 'Zone en pleine expansion immobilière sur les plateaux sud. Prix de la terre encore accessibles et forte plus-value potentielle.',
    recommendedFor: ['Primo-accédants', 'Investisseurs à forte plus-value', 'Professeurs UNIKIN', 'Maisons secondaires']
  },
  {
    id: 'Bandalungwa',
    name: 'Bandalungwa (Moulaert)',
    district: 'Funa',
    lat: -4.3395,
    lng: 15.2915,
    zoomLevel: 14,
    avgSalePriceUSD: 210000,
    avgSalePerSqmUSD: 1150,
    avgRentMonthlyUSD: 950,
    rentBreakdown: {
      studio2rooms: 500,
      apt3rooms: 950,
      villaStanding: 2000
    },
    priceHistory: [
      { year: '2022', pricePerSqm: 880, growthPct: 0 },
      { year: '2023', pricePerSqm: 960, growthPct: 9.1 },
      { year: '2024', pricePerSqm: 1030, growthPct: 7.3 },
      { year: '2025', pricePerSqm: 1100, growthPct: 6.8 },
      { year: '2026', pricePerSqm: 1150, growthPct: 4.5 }
    ],
    annualAppreciationRate: 7.0,
    securityScore: 8.1,
    securityLabel: 'Moyenne / Vigilance Normale',
    securityDetails: 'Quartier vivant et animé jour et nuit. Bonne convivialité communautaire.',
    waterScore: 7.6,
    waterLabel: 'Bon (Régulier avec citerne)',
    waterDetails: 'Réseau REGIDESO fonctionnel avec stockage en citerne nécessaire.',
    powerScore: 7.7,
    powerLabel: 'Stable (Solaire + SNEL)',
    powerDetails: 'Proximité des lignes de distribution centrales.',
    commuteToGombeMin: '10 à 20 min',
    overview: 'Commune branchée et festive de Kinshasa, réputée pour sa gastronomie, ses terrasses et sa proximité directe avec la Gombe.',
    recommendedFor: ['Actifs citadins', 'Location meublée saisonnière', 'Commerces & Restauration']
  },
  {
    id: 'Lemba',
    name: 'Lemba (Super / Échangeur)',
    district: 'Mont-Amba',
    lat: -4.3795,
    lng: 15.3345,
    zoomLevel: 13,
    avgSalePriceUSD: 160000,
    avgSalePerSqmUSD: 880,
    avgRentMonthlyUSD: 750,
    rentBreakdown: {
      studio2rooms: 400,
      apt3rooms: 750,
      villaStanding: 1600
    },
    priceHistory: [
      { year: '2022', pricePerSqm: 680, growthPct: 0 },
      { year: '2023', pricePerSqm: 740, growthPct: 8.8 },
      { year: '2024', pricePerSqm: 790, growthPct: 6.8 },
      { year: '2025', pricePerSqm: 840, growthPct: 6.3 },
      { year: '2026', pricePerSqm: 880, growthPct: 4.8 }
    ],
    annualAppreciationRate: 6.7,
    securityScore: 7.8,
    securityLabel: 'Moyenne / Vigilance Normale',
    securityDetails: 'Quartier étudiant et intellectuel dynamique.',
    waterScore: 7.4,
    waterLabel: 'Moyen (Coupures tournantes)',
    waterDetails: 'Réseau alimenté par l\'usine de Ndjili avec réservoirs tampons.',
    powerScore: 7.3,
    powerLabel: 'Variable (Délestage périodique)',
    powerDetails: 'Délestages tournants réguliers.',
    commuteToGombeMin: '25 à 45 min',
    overview: 'Cité universitaire et intellectuelle par excellence. Très forte demande locative pour étudiants et enseignants.',
    recommendedFor: ['Investisseurs locatifs étudiants', 'Petits budgets', 'Résidences familiales']
  }
];

// -------------------------------------------------------------
// 2. ÉCOLES & UNIVERSITÉS (Éducation)
// -------------------------------------------------------------
export const KINSHASA_SCHOOLS: LandmarkPOI[] = [
  {
    id: 'school_1',
    name: 'The American School of Kinshasa (TASOK)',
    category: 'school',
    commune: 'Ngaliema',
    lat: -4.3492,
    lng: 15.2532,
    description: 'École américaine internationale de la maternelle au Baccalauréat International (IB).',
    details: 'Campus sécurisé de 17 hectares, piscine olympique, terrains de sport.'
  },
  {
    id: 'school_2',
    name: 'Lycée Français René Descartes (Site Kalemie)',
    category: 'school',
    commune: 'Gombe',
    lat: -4.3095,
    lng: 15.3021,
    description: 'Enseignement officiel français homologué AEFE (Collège & Lycée).',
    details: 'Excellence académique, cursus bilingue français-anglais.'
  },
  {
    id: 'school_3',
    name: 'Lycée Français René Descartes (Site OUA)',
    category: 'school',
    commune: 'Ngaliema',
    lat: -4.3312,
    lng: 15.2678,
    description: 'Enseignement primaire et maternelle du Lycée Français.',
    details: 'Cadre verdoyant et très sécurisé à proximité de Binza Macampagne.'
  },
  {
    id: 'school_4',
    name: 'Collège Boboto',
    category: 'school',
    commune: 'Gombe',
    lat: -4.3125,
    lng: 15.2984,
    description: 'Établissement jésuite d\'élite historique fondé en 1937.',
    details: 'Formation rigoureuse des cadres et dirigeants congolais.'
  },
  {
    id: 'school_5',
    name: 'Lycée Bosangani (Sacré-Cœur)',
    category: 'school',
    commune: 'Gombe',
    lat: -4.3142,
    lng: 15.3045,
    description: 'Établissement catholique conventionné de référence.',
    details: 'Situé sur l\'avenue Tombalbaye / Tabu Ley.'
  },
  {
    id: 'school_6',
    name: 'Université de Kinshasa (UNIKIN)',
    category: 'school',
    commune: 'Mont-Ngafula',
    lat: -4.4172,
    lng: 15.3055,
    description: 'Plus grande université publique de la RDC (Médecine, Droit, Polytechnique).',
    details: 'Campus historique sur la colline inspirée du Mont Amba.'
  },
  {
    id: 'school_7',
    name: 'Université Protestante au Congo (UPC)',
    category: 'school',
    commune: 'Lingwala',
    lat: -4.3325,
    lng: 15.2978,
    description: 'Université privée réputée pour ses facultés d\'Économie, Gestion et Droit.',
    details: 'Face au Palais du Peuple sur l\'avenue de la Libération.'
  }
];

// -------------------------------------------------------------
// 3. HÔPITAUX & CENTRES MÉDICAUX (Santé)
// -------------------------------------------------------------
export const KINSHASA_HOSPITALS: LandmarkPOI[] = [
  {
    id: 'hosp_1',
    name: 'Centre Médical de Kinshasa (CMK)',
    category: 'hospital',
    commune: 'Gombe',
    lat: -4.3082,
    lng: 15.3089,
    description: 'Polyclinique médico-chirurgicale de référence internationale.',
    details: 'Urgences 24/7, laboratoire d\'analyses de pointe, évacuations sanitaires.'
  },
  {
    id: 'hosp_2',
    name: 'Clinique Ngaliema',
    category: 'hospital',
    commune: 'Gombe / Ngaliema',
    lat: -4.3188,
    lng: 15.2865,
    description: 'Grand centre hospitalier pavillonnaire historique.',
    details: 'Services de maternité, pédiatrie, réanimation et scanner moderne.'
  },
  {
    id: 'hosp_3',
    name: 'Hôpital du Cinquantenaire',
    category: 'hospital',
    commune: 'Kasa-Vubu',
    lat: -4.3345,
    lng: 15.3112,
    description: 'Hôpital moderne de 500 lits doté d\'équipements d\'imagerie IRM et cardiologie.',
    details: 'Sur le Boulevard Triomphal, face au Stade des Martyrs.'
  },
  {
    id: 'hosp_4',
    name: 'HJ Hospitals (Groupe Harish Jagtani)',
    category: 'hospital',
    commune: 'Limete',
    lat: -4.3562,
    lng: 15.3421,
    description: 'Centre de diagnostic et de soins tertiaires aux normes internationales.',
    details: 'Blocs opératoires haute technologie, oncologie, cardiologie interventionnelle.'
  },
  {
    id: 'hosp_5',
    name: 'Hôpital Général de Kinshasa (Ex-Mama Yemo)',
    category: 'hospital',
    commune: 'Gombe',
    lat: -4.3168,
    lng: 15.3142,
    description: 'Nouvel hôpital ultra-moderne entièrement reconstruit et inauguré en 2024.',
    details: 'Plus grand centre hospitalier public de la capitale.'
  },
  {
    id: 'hosp_6',
    name: 'Centre Hospitalier Monkole',
    category: 'hospital',
    commune: 'Mont-Ngafula',
    lat: -4.4085,
    lng: 15.2678,
    description: 'Hôpital universitaire moderne de standing européen.',
    details: 'Réputé pour ses soins materno-infantiles et sa pharmacie certifiée.'
  }
];

// -------------------------------------------------------------
// 4. MARCHÉS & HYPERMARCHÉS (Commerces & Ravitaillement)
// -------------------------------------------------------------
export const KINSHASA_MARKETS: LandmarkPOI[] = [
  {
    id: 'mkt_1',
    name: 'Grand Marché de Kinshasa (Zando Central)',
    category: 'market',
    commune: 'Gombe / Kinshasa',
    lat: -4.3195,
    lng: 15.3125,
    description: 'Cœur battant du commerce populaire kino-congolais (entièrement modernisé).',
    details: 'Plus de 60 000 étals, textile, vivres frais, épices et artisanat.'
  },
  {
    id: 'mkt_2',
    name: 'Marché Gambela',
    category: 'market',
    commune: 'Kasa-Vubu',
    lat: -4.3382,
    lng: 15.3085,
    description: 'Célèbre marché réputé pour les produits vivriers, poissons du fleuve et tissus.',
    details: 'Accessible depuis l\'avenue Gambela et l\'avenue des Huileries.'
  },
  {
    id: 'mkt_3',
    name: 'Marché de Kintambo Magasin',
    category: 'market',
    commune: 'Kintambo',
    lat: -4.3282,
    lng: 15.2785,
    description: 'Marché de proximité et galeries commerciales modernes à Kintambo.',
    details: 'Fruits, légumes frais, banques et supermarchés mitoyens.'
  },
  {
    id: 'mkt_4',
    name: 'Marché de la Liberté Mzee L.D. Kabila',
    category: 'market',
    commune: 'Masina',
    lat: -4.3912,
    lng: 15.4055,
    description: 'Immense marché moderne desservant tout le district de la Tshangu.',
    details: 'Pavillons spécialisés et parking camions de ravitaillement provincial.'
  },
  {
    id: 'mkt_5',
    name: 'Hypermarché Kin-Marché (Boulevard du 30 Juin)',
    category: 'market',
    commune: 'Gombe',
    lat: -4.3055,
    lng: 15.3065,
    description: 'Grande surface alimentaire, produits d\'importation et boulangerie fine.',
    details: 'Rayons européens, asiatiques et locaux, parking gardé.'
  },
  {
    id: 'mkt_6',
    name: 'GB Hyper Psaro / Shoprite Complex',
    category: 'market',
    commune: 'Ngaliema / Gombe',
    lat: -4.3215,
    lng: 15.2812,
    description: 'Complexe commercial historique avec galerie marchande et supermarché international.',
    details: 'Sur l\'avenue Colonel Mondjiba.'
  }
];

// -------------------------------------------------------------
// 5. ROUTES PRINCIPALES & BOULEVARDS CLÉS
// -------------------------------------------------------------
export const KINSHASA_MAIN_ROADS: MajorRoadRoute[] = [
  {
    id: 'road_30juin',
    name: 'Boulevard du 30 Juin',
    type: 'boulevard',
    trafficSpeed: 'Fluide en dehors des heures de pointe (8h & 17h)',
    importance: 'Artère maîtresse est-ouest de la Gombe reliant la Gare Centrale au Pont Kintambo.',
    coordinates: [
      [-4.3012, 15.3185],
      [-4.3045, 15.3095],
      [-4.3092, 15.2985],
      [-4.3165, 15.2865],
      [-4.3242, 15.2785]
    ]
  },
  {
    id: 'road_lumumba',
    name: 'Boulevard Lumumba (Axe Aéroport)',
    type: 'highway',
    trafficSpeed: 'Dense aux heures de pointe, chaussée rapide',
    importance: 'Corridor stratégique reliant le centre-ville à l\'Aéroport International de Ndjili.',
    coordinates: [
      [-4.3512, 15.3345],
      [-4.3645, 15.3525],
      [-4.3785, 15.3785],
      [-4.3892, 15.4125],
      [-4.3985, 15.4485]
    ]
  },
  {
    id: 'road_matadi',
    name: 'Route de Matadi (Axe Ouest)',
    type: 'highway',
    trafficSpeed: 'Modéré, ralentissements au niveau de Delvaux et UPN',
    importance: 'Liaison vitale vers le Kongo-Central, desservant Kintambo, Ngaliema et Mont-Ngafula.',
    coordinates: [
      [-4.3295, 15.2745],
      [-4.3412, 15.2612],
      [-4.3625, 15.2535],
      [-4.3895, 15.2485],
      [-4.4215, 15.2445]
    ]
  },
  {
    id: 'road_triomphal',
    name: 'Boulevard Triomphal',
    type: 'boulevard',
    trafficSpeed: 'Fluide',
    importance: 'Axe monumental séparant Kasa-Vubu et Lingwala (Stade des Martyrs & Palais du Peuple).',
    coordinates: [
      [-4.3295, 15.3045],
      [-4.3345, 15.3115],
      [-4.3395, 15.3195]
    ]
  },
  {
    id: 'road_mondjiba',
    name: 'Avenue Colonel Mondjiba',
    type: 'avenue',
    trafficSpeed: 'Modéré, très commerçant',
    importance: 'Lien direct entre Socimat (Gombe) et Kintambo Magasin.',
    coordinates: [
      [-4.3165, 15.2865],
      [-4.3205, 15.2825],
      [-4.3255, 15.2795]
    ]
  }
];

// -------------------------------------------------------------
// 6. HUBS STRATÉGIQUES POUR CALCUL DE DISTANCE & TEMPS DE TRAJET
// -------------------------------------------------------------
export const KINSHASA_DISTANCE_HUBS: StrategicDistanceHub[] = [
  {
    id: 'hub_gombe',
    name: 'Centre des Affaires (Bd 30 Juin / Gombe)',
    shortName: 'Gombe Centre',
    iconName: 'Building2',
    lat: -4.3055,
    lng: 15.3065,
    description: 'Sièges sociaux, banques, ministères et ambassades.'
  },
  {
    id: 'hub_airport',
    name: 'Aéroport International de N\'djili (FIH)',
    shortName: 'Aéroport N\'djili',
    iconName: 'Plane',
    lat: -4.3855,
    lng: 15.4445,
    description: 'Principal aéroport international desservant la RDC.'
  },
  {
    id: 'hub_kintambo',
    name: 'Carrefour Kintambo Magasin',
    shortName: 'Kintambo Magasin',
    iconName: 'Navigation',
    lat: -4.3265,
    lng: 15.2785,
    description: 'Carrefour stratégique reliant Ngaliema, Kintambo et Gombe.'
  },
  {
    id: 'hub_palais',
    name: 'Palais de la Nation (Présidence)',
    shortName: 'Palais Nation',
    iconName: 'Shield',
    lat: -4.2985,
    lng: 15.3095,
    description: 'Bord du fleuve Congo, quartier hautement sécurisé.'
  },
  {
    id: 'hub_gare',
    name: 'Gare Centrale de Kinshasa',
    shortName: 'Gare Centrale',
    iconName: 'Train',
    lat: -4.3015,
    lng: 15.3195,
    description: 'Extrémité est du Boulevard du 30 Juin.'
  },
  {
    id: 'hub_echangeur',
    name: 'Échangeur de Limete',
    shortName: 'Échangeur Limete',
    iconName: 'Compass',
    lat: -4.3725,
    lng: 15.3585,
    description: 'Monument emblématique et nœud routier central est-ouest.'
  }
];

/**
 * Calculateur de distance à vol d'oiseau (Formule de Haversine)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

/**
 * Estimation du temps de trajet en voiture à Kinshasa (en minutes)
 * Prend en compte la densité de circulation kinoise typique
 */
export function estimateKinshasaDriveTime(distanceKm: number, isAirportRoute = false): {
  minMinutes: number;
  maxMinutes: number;
  text: string;
} {
  // À Kinshasa, vitesse moyenne urbaine effective : 18 à 35 km/h
  const avgSpeedKmH = isAirportRoute ? 30 : 22;
  const rawMinutes = Math.round((distanceKm / avgSpeedKmH) * 60);

  const minMinutes = Math.max(5, Math.round(rawMinutes * 0.8));
  const maxMinutes = Math.max(10, Math.round(rawMinutes * 1.5));

  return {
    minMinutes,
    maxMinutes,
    text: `${minMinutes} - ${maxMinutes} min`
  };
}
