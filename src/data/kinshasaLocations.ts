export interface CommuneData {
  name: string;
  districts?: string; // e.g. Lukunga, Funa, Mont-Amba, Tshangu
  quartiers: string[];
  popularAvenues: string[];
}

export const KINSHASA_COMMUNES_DATA: Record<string, CommuneData> = {
  'Gombe': {
    name: 'Gombe',
    districts: 'Lukunga',
    quartiers: [
      'Centre-Ville / 30 Juin',
      'Golf',
      'Haut-Commandement',
      'Socimat',
      'Fleuve Congo / Batetela',
      'Gare Centrale',
      'Palais de la Nation',
      'Clinique Ngaliema Zone'
    ],
    popularAvenues: [
      'Boulevard du 30 Juin',
      'Avenue de la Justice',
      'Avenue Colonel Mondjiba',
      'Avenue Haut-Commandement',
      'Avenue Batetela',
      'Avenue du Commerce',
      'Avenue Tombalbaye',
      'Avenue des Aviateurs',
      'Avenue de la Mongala',
      'Avenue Tabu Ley (ex-Tombalbaye)',
      'Avenue Sergent Moké'
    ]
  },
  'Ngaliema': {
    name: 'Ngaliema',
    districts: 'Lukunga',
    quartiers: [
      'Binza Macampagne',
      'Binza Pigeon',
      'Binza Ozone',
      'Binza IPN',
      'Binza Delvaux',
      'Basoko / GB',
      'Joli Parc',
      'Kinsuka Pêcheurs',
      'Camp Munganga',
      'Mimosas',
      'Djelo-Binza',
      'Bunda'
    ],
    popularAvenues: [
      'Avenue des Écuries',
      'Avenue de la Montagne',
      'Route de Matadi',
      'Avenue Colonel Mondjiba',
      'Avenue de l\'OUA',
      'Avenue de l\'École',
      'Avenue Ma Campagne',
      'Avenue des Pêcheurs (Kinsuka)',
      'Avenue Kanzaku',
      'Avenue du Drapeau'
    ]
  },
  'Limete': {
    name: 'Limete',
    districts: 'Mont-Amba',
    quartiers: [
      'Limete Résidentiel',
      'Limete Industriel',
      'Salongo',
      'Mombele',
      'Kingabwa',
      'Mososo',
      'Agricole',
      'Ndanu'
    ],
    popularAvenues: [
      'Boulevard Lumumba',
      'Avenue des Poids Lourds',
      '1ère Rue Résidentielle',
      '7ème Rue Résidentielle',
      '10ème Rue Résidentielle',
      '14ème Rue Résidentielle',
      'Avenue de la Métallurgie',
      'Avenue du Marais',
      'Avenue Universitaire'
    ]
  },
  'Mont-Ngafula': {
    name: 'Mont-Ngafula',
    districts: 'Lukunga',
    quartiers: [
      'Righini',
      'Livulu / UNIKIN',
      'Cité Mama Mobutu',
      'Kindele',
      'Kimbondo',
      'Mitendi',
      'UPN',
      'Mataba',
      'Kimwenza',
      'Mazamba',
      'Ngana'
    ],
    popularAvenues: [
      'Route de Matadi',
      'Avenue By-Pass',
      'Avenue de l\'Université',
      'Avenue Mama Mobutu',
      'Route de Kimwenza',
      'Avenue Kimbondo',
      'Avenue Kasangulu'
    ]
  },
  'Kintambo': {
    name: 'Kintambo',
    districts: 'Lukunga',
    quartiers: [
      'Jamaïque',
      'Kilimani',
      'Tanzanie',
      'Lubudi',
      'Camp Kokolo',
      'Nganda'
    ],
    popularAvenues: [
      'Avenue Kasa-Vubu',
      'Avenue Komoriko',
      'Avenue Bangala',
      'Avenue OUA',
      'Avenue du Camp Militaire',
      'Boulevard du 30 Juin (Ext)'
    ]
  },
  'Bandalungwa': {
    name: 'Bandalungwa',
    districts: 'Funa',
    quartiers: [
      'Makelele',
      'Synkin',
      'Lumumba',
      'Adoula',
      'Kimbangu',
      'Bisengo',
      'Tshibangu'
    ],
    popularAvenues: [
      'Avenue Kasa-Vubu',
      'Avenue de la Libération (24 Novembre)',
      'Avenue Inga',
      'Avenue Bakusu',
      'Avenue Lubumbashi',
      'Avenue Kimbondo'
    ]
  },
  'Lemba': {
    name: 'Lemba',
    districts: 'Mont-Amba',
    quartiers: [
      'Super Lemba',
      'Righini-Lemba',
      'Salongo-Lemba',
      'Échangeur',
      'Gombele',
      'Livulu-Lemba',
      'Foire',
      'Molo',
      'Maduda'
    ],
    popularAvenues: [
      'Avenue de l\'Université',
      'Avenue By-Pass',
      'Boulevard Lumumba',
      'Avenue Kianza',
      'Avenue Sefu',
      'Avenue Maternité'
    ]
  },
  'Barumbu': {
    name: 'Barumbu',
    districts: 'Lukunga',
    quartiers: [
      'Ndolo',
      'Bon Marché',
      'Funa',
      'Bitshaku-Tshaku',
      'Mososo'
    ],
    popularAvenues: [
      'Avenue Flambeau',
      'Avenue Kabambare',
      'Avenue Luambo Makiadi (Bokassa)',
      'Avenue Kabasele (Flambeau)',
      'Avenue des Huileries'
    ]
  },
  'Lingwala': {
    name: 'Lingwala',
    districts: 'Lukunga',
    quartiers: [
      'Singa-Mopepe',
      'La Voix du Peuple',
      'Palais du Peuple',
      'Révolution',
      'Stade des Martyrs Zone'
    ],
    popularAvenues: [
      'Avenue de la Libération (24 Novembre)',
      'Avenue des Huileries',
      'Avenue Nyangwe',
      'Avenue Kalembe-Lembe',
      'Avenue Kabinda'
    ]
  },
  'Kalamu': {
    name: 'Kalamu',
    districts: 'Funa',
    quartiers: [
      'Matonge',
      'Yolo-Nord',
      'Yolo-Sud',
      'Kauka',
      'Pinzi',
      'Immo-Congo'
    ],
    popularAvenues: [
      'Avenue Kasa-Vubu',
      'Avenue Victoire',
      'Avenue Université',
      'Avenue Oshwe',
      'Avenue Yolo'
    ]
  },
  'Kasa-Vubu': {
    name: 'Kasa-Vubu',
    districts: 'Funa',
    quartiers: [
      'Ancien Combattant',
      'Assossa',
      'Katanga',
      'Lubumbashi',
      'Saio'
    ],
    popularAvenues: [
      'Avenue Kasa-Vubu',
      'Avenue Assossa',
      'Avenue Saio',
      'Avenue Gambela'
    ]
  },
  'Matete': {
    name: 'Matete',
    districts: 'Mont-Amba',
    quartiers: [
      'Mandina',
      'Anunga',
      'Batende',
      'Bahumbu',
      'Pululu',
      'Lokoro'
    ],
    popularAvenues: [
      'Boulevard Lumumba',
      'Avenue de la Résidence',
      'Avenue Banunu',
      'Avenue Marais'
    ]
  },
  'Ndjili': {
    name: 'Ndjili',
    districts: 'Tshangu',
    quartiers: [
      'Quartier 1',
      'Quartier 2',
      'Quartier 4',
      'Quartier 7',
      'Quartier 12',
      'Quartier 13',
      'Sainte-Thérèse'
    ],
    popularAvenues: [
      'Boulevard Lumumba',
      'Avenue Ndjili',
      'Avenue Kimwenza',
      'Avenue Cecomaf'
    ]
  },
  'Masina': {
    name: 'Masina',
    districts: 'Tshangu',
    quartiers: [
      'Sans-Fil',
      'Abattoir',
      'Mapela',
      'Petro-Congo',
      'Pascal'
    ],
    popularAvenues: [
      'Boulevard Lumumba',
      'Avenue Mokali',
      'Avenue Abattoir',
      'Avenue Pascal'
    ]
  },
  'Kinshasa': {
    name: 'Kinshasa',
    districts: 'Lukunga',
    quartiers: [
      'Madimba',
      'Mongala',
      'Pey-Pey',
      'Camp Militaire',
      'Marché Central Zone'
    ],
    popularAvenues: [
      'Avenue Kasa-Vubu',
      'Avenue Luambo Makiadi (Bokassa)',
      'Avenue du Commerce',
      'Avenue Lowa'
    ]
  },
  'Ngiri-Ngiri': {
    name: 'Ngiri-Ngiri',
    districts: 'Funa',
    quartiers: [
      'Diomi',
      'Karting',
      'Saio',
      'Petit-Boulevard'
    ],
    popularAvenues: [
      'Avenue Kasa-Vubu',
      'Avenue Elengesa',
      'Avenue Ngiri-Ngiri',
      'Avenue Gambela'
    ]
  },
  'Selembao': {
    name: 'Selembao',
    districts: 'Funa',
    quartiers: [
      'Badiadingi',
      'Cité Verte',
      'Inga',
      'Herady',
      'Ngafani'
    ],
    popularAvenues: [
      'Route de Matadi',
      'Avenue de la Libération',
      'Avenue Badiadingi',
      'Avenue Ngafani'
    ]
  },
  'Bumbu': {
    name: 'Bumbu',
    districts: 'Funa',
    quartiers: [
      'Kinsuka-Bumbu',
      'Mbaki',
      'Kasa-Vubu Zone',
      'Mbandaka'
    ],
    popularAvenues: [
      'Avenue de la Libération (24)',
      'Avenue Landu',
      'Avenue Kasa-Vubu'
    ]
  },
  'Makala': {
    name: 'Makala',
    districts: 'Funa',
    quartiers: [
      'Salongo-Makala',
      'Uele',
      'Mawete',
      'Bolingo'
    ],
    popularAvenues: [
      'Avenue Elengesa',
      'Avenue Université',
      'Avenue Kikwit'
    ]
  },
  'Ngaba': {
    name: 'Ngaba',
    districts: 'Mont-Amba',
    quartiers: [
      'Baobab',
      'Bulambemba',
      'Kolo-Fuma',
      'Mateba'
    ],
    popularAvenues: [
      'Avenue Université',
      'Avenue Kianza',
      'Avenue By-Pass'
    ]
  },
  'Kimbanseke': {
    name: 'Kimbanseke',
    districts: 'Tshangu',
    quartiers: [
      'Mombele',
      'Kingasani',
      'Mokali',
      'Bikanga',
      'Salongo-Kimbanseke'
    ],
    popularAvenues: [
      'Boulevard Lumumba',
      'Avenue Mokali',
      'Avenue de la Paix'
    ]
  },
  'Kisenso': {
    name: 'Kisenso',
    districts: 'Mont-Amba',
    quartiers: [
      'Regideso',
      'Amba',
      'Mission',
      'Kabu'
    ],
    popularAvenues: [
      'Avenue de la Paix',
      'Avenue Université Ext'
    ]
  },
  'Nsele': {
    name: 'Nsele',
    districts: 'Tshangu',
    quartiers: [
      'Kinkole (Port de Pêche)',
      'DAIPN',
      'Bibwa',
      'Mpasa 1',
      'Mpasa 2',
      'Cité du Fleuve Nsele'
    ],
    popularAvenues: [
      'Boulevard Lumumba / RN1',
      'Route Kinkole',
      'Route DAIPN'
    ]
  },
  'Maluku': {
    name: 'Maluku',
    districts: 'Tshangu',
    quartiers: [
      'Maluku Centre',
      'Menkao',
      'Nguma',
      'Plateau des Bateke',
      'Mbankana'
    ],
    popularAvenues: [
      'Route Nationale 1 (RN1)',
      'Route Menkao',
      'Route Plateau Bateke'
    ]
  }
};

export const KINSHASA_COMMUNES_LIST = Object.keys(KINSHASA_COMMUNES_DATA);

export function getQuartiersForCommune(communeName: string): string[] {
  if (!communeName) return [];
  const found = KINSHASA_COMMUNES_DATA[communeName];
  return found ? found.quartiers : [];
}

export function getPopularAvenuesForCommune(communeName: string): string[] {
  if (!communeName) return [];
  const found = KINSHASA_COMMUNES_DATA[communeName];
  return found ? found.popularAvenues : [];
}

export function getAllQuartiers(): { commune: string; quartier: string }[] {
  const list: { commune: string; quartier: string }[] = [];
  Object.entries(KINSHASA_COMMUNES_DATA).forEach(([commune, data]) => {
    data.quartiers.forEach((q) => {
      list.push({ commune, quartier: q });
    });
  });
  return list;
}
