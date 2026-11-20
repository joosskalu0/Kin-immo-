import {
  BlogArticle,
  FaqItem,
  LegalCompanyMeta,
  LegalDocument,
  NeighborhoodProfile,
  Property,
} from '../types';
import { KINSHASA_COMMUNES_DATA } from './kinshasaLocations';

export function slugifyText(input: string): string {
  return String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const BLOG_CATEGORY_LABELS: Record<BlogArticle['category'], string> = {
  guide_achat: "Guide d'achat",
  guide_location: 'Guide location',
  juridique_foncier: 'Juridique & Foncier',
  quartiers_marche: 'Quartiers & Marché',
  conseils_pro: 'Conseils Pro',
};

export const DEFAULT_BLOG_ARTICLES: BlogArticle[] = [
  {
    id: 'art_certificat_enregistrement_rdc',
    slug: 'verifier-certificat-enregistrement-kinshasa-avant-achat',
    title: "Vérifier un Certificat d'Enregistrement à Kinshasa avant tout achat immobilier",
    excerpt:
      "Les 6 contrôles incontournables auprès de la Conservation des Titres Immobiliers (Circonscription Foncière) pour sécuriser l'achat d'une parcelle ou d'une villa en RDC.",
    category: 'juridique_foncier',
    coverImage: '/og-images/blog_foncier_titres_1795161876901.jpg',
    authorName: 'Maître Didier Kabongo',
    authorRole: 'Conseil Foncier Kinimmo',
    readTimeMinutes: 7,
    status: 'published',
    featured: true,
    tags: ['Certificat d\'Enregistrement', 'Cadastre Kinshasa', 'Sécurité juridique'],
    relatedCommune: 'Gombe',
    publishedAt: '2026-10-12',
    updatedAt: '2026-11-10',
    content: `## Pourquoi le Certificat d'Enregistrement est la seule preuve pleine de propriété en RDC

En République Démocratique du Congo, la Loi foncière n° 73-021 du 20 juillet 1973 établit que le sol est la propriété exclusive de l'État. Un particulier ou une société détient un **droit de concession** (perpétuelle pour les personnes physiques congolaises, ordinaire de 25 ans renouvelables pour les personnes morales et non-nationaux).

La détention d'une simple « fiche parcellaire » ou d'un acte de vente sous seing privé ne suffit jamais à sécuriser une acquisition urbaine à Kinshasa : seul le **Certificat d'Enregistrement** délivré par le Conservateur des Titres Immobiliers fait foi de droit.

## 1. Identifier la bonne Circonscription Foncière

Kinshasa compte plusieurs circonscriptions foncières (Gombe, Lukunga, Mont-Amba, Funa, Tshangu). Vérifiez que le certificat présenté porte le sceau de la circonscription correspondant à la commune du bien et relevez le **numéro de volume et de folio**.

## 2. Demander un état de charges et d'hypothèques

Avant toute remise d'acompte, exigez un relevé officiel de situation juridique auprès du Conservateur des Titres Immobiliers :
- Confirmer que le vendeur inscrit sur l'acte est bien le dernier concessionnaire enregistré ;
- Vérifier l'absence d'hypothèque bancaire, de saisie conservatoire ou d'opposition judiciaire en cours ;
- Vérifier la concordance exacte des mesures cadastrales et du procès-verbal de mesurage et de bornage.

## 3. Contrôler les procurations et successions

Dans plus d'un tiers des litiges constatés à Kinshasa, le bien appartient à une indivision successorale. Exigez le jugement d'investiture, l'acte de notoriété et la procuration notariée signée par l'ensemble des héritiers majeurs.

## 4. Rédiger l'acte authentique et opérer la mutation

La vente doit être constatée par acte authentique (notaire) suivi du paiement des droits proportionnels d'enregistrement et de la mutation effective sur le livre d'enregistrement. Ne versez jamais la totalité du prix avant la vérification matérielle du dossier complet au guichet du Conservateur.`
  },
  {
    id: 'art_comparatif_gombe_ngaliema_limete',
    slug: 'ou-habiter-kinshasa-gombe-ngaliema-limete-comparatif',
    title: 'Où habiter ou investir à Kinshasa : comparatif Gombe, Ngaliema et Limete',
    excerpt:
      "Analyse des loyers moyens, temps de trajet, sécurité électrique, écoles internationales et potentiel locatif dans les trois pôles immobiliers les plus demandés.",
    category: 'quartiers_marche',
    coverImage: '/og-images/blog_gombe_skyline_1795161879500.jpg',
    authorName: 'Sarah Ntumba',
    authorRole: 'Analyste Marché Kinshasa',
    readTimeMinutes: 6,
    status: 'published',
    featured: false,
    tags: ['Gombe', 'Ngaliema', 'Limete', 'Investissement locatif'],
    relatedCommune: 'Gombe',
    publishedAt: '2026-10-25',
    updatedAt: '2026-11-12',
    content: `## Trois marchés complémentaires selon votre objectif

Choisir un quartier à Kinshasa détermine directement votre qualité de vie quotidienne — notamment la fluidité des déplacements vers le Boulevard du 30 Juin — et la rentabilité locative de votre patrimoine.

## Gombe : le cœur diplomatique et des affaires

La commune de la Gombe concentre ambassades, sièges sociaux, banques et cliniques. La demande y privilégie les **appartements haut standing avec groupe électrogène de secours, citerne d'eau et sécurité 24h/24**.
- **Profil idéal** : expatriés, cadres dirigeants, cabinets, sièges ONG ;
- **Points forts** : déplacements à pied ou en 10 minutes entre bureaux et services ;
- **Point d'attention** : prix d'entrée élevé au m² et rareté des grandes parcelles familiales avec jardin.

## Ngaliema (Binza Macampagne, Pigeon, Joli Parc) : le refuge résidentiel

Ngaliema séduit les familles et les résidences diplomatiques grâce à ses avenues arborées, ses vues sur le fleuve Congo et ses villas sur parcelles de 800 à 2 500 m².
- **Points forts** : calme résidentiel, proximité des écoles internationales, grand choix de villas avec piscine ;
- **Point d'attention** : anticiper les heures de pointe sur l'avenue de l'OUA et la route de Matadi.

## Limete Résidentiel : l'équilibre accessibilité et rendement

Les rues résidentielles numérotées de Limete offrent un accès rapide à l'aéroport de N'djili et vers le centre-ville via le Boulevard Lumumba. Les duplex modernes y affichent des taux d'occupation élevés auprès des cadres congolais et PME.`
  },
  {
    id: 'art_bail_residentiel_kinshasa',
    slug: 'contrat-bail-kinshasa-garantie-locative-preavis',
    title: 'Contrat de bail à Kinshasa : garantie locative, durée et état des lieux',
    excerpt:
      "Comment encadrer votre location d'appartement ou de maison à Kinshasa : mois de garantie, indexation, charges d'entretien, groupe électrogène et restitution.",
    category: 'guide_location',
    coverImage: '/og-images/blog_villa_ngaliema_1795161878137.jpg',
    authorName: 'Patrick Mukendi',
    authorRole: 'Responsable Gestion Locative',
    readTimeMinutes: 5,
    status: 'published',
    featured: false,
    tags: ['Contrat de bail', 'Garantie locative', 'Locataire Kinshasa'],
    relatedCommune: 'Ngaliema',
    publishedAt: '2026-11-01',
    updatedAt: '2026-11-15',
    content: `## Clarifier les usages de la garantie locative dès la signature

À Kinshasa, la négociation du bail porte souvent sur la durée d'avance et le montant de la garantie locative (couramment comprise entre **2 et 3 mois de loyer** pour un bail résidentiel classique). Exigez toujours que l'affectation exacte de chaque somme versée soit inscrite en toutes lettres dans le contrat.

## Les 5 clauses à vérifier impérativement avant de payer

1. **Inventaire et état des lieux contradictoire** : photographiez compteurs SNEL, REGIDESO, climatiseurs, pompes et menuiseries à la remise des clés.
2. **Maintenance du groupe électrogène et du forage** : précisez par écrit qui prend en charge l'entretien courant (vidanges, filtres) et les grosses réparations moteur.
3. **Modalités de règlement et quittances** : exigez une quittance datée et numérotée à chaque paiement mensuel.
4. **Délai de préavis** : prévoyez un préavis clair (généralement 3 mois pour un bail résidentiel, 6 mois pour un bail commercial) et les conditions de restitution de la garantie.
5. **Enregistrement du bail** : un bail écrit daté et enregistré vous protège en cas de changement de propriétaire.`
  },
  {
    id: 'art_vendre_louer_plus_vite',
    slug: 'publier-annonce-immobiliere-efficace-kinshasa',
    title: 'Comment préparer votre bien pour louer ou vendre 2 fois plus vite à Kinshasa',
    excerpt:
      "Lumière naturelle, photos nettes, vidéo 30 secondes, affichage du loyer transparent et QR code panneau : les standards des annonces qui convertissent.",
    category: 'conseils_pro',
    coverImage: '/og-images/blog_quartier_limete_1795161878489.jpg',
    authorName: 'Équipe Éditoriale Kinimmo',
    authorRole: 'Accompagnement Agences',
    readTimeMinutes: 4,
    status: 'published',
    featured: false,
    tags: ['Photos immobilières', 'Visite vidéo', 'QR code panneau'],
    relatedCommune: 'Limete',
    publishedAt: '2026-11-05',
    updatedAt: '2026-11-16',
    content: `## La confiance commence par la transparence du dossier visuel

Les acheteurs et locataires à Kinshasa — qu'ils soient sur place ou issus de la diaspora — écartent en quelques secondes les annonces floues ou sans indication de quartier précis.

## Checklist de publication haute performance

- **6 à 10 photos lumineuses en format paysage** : séjour, cuisine équipée, chambres, salles de bain, façade et jardin/parking.
- **Une visite vidéo verticale de 30 secondes** : filmée de jour avec un smartphone stabilisé pour montrer les volumes réels et rassurer les clients à distance.
- **Une localisation par point de repère crédible** : indiquer la commune, le quartier et un repère connu (« à 3 min de l'avenue des Écuries ») multiplie les demandes qualifiées sans exposer l'adresse exacte.
- **Un panneau « À VENDRE / À LOUER » équipé du QR code Kinimmo** : permet aux passants de consulter immédiatement le prix, les photos et d'écrire sur WhatsApp sans appel inutile.`
  },
  {
    id: 'art_paiement_mobile_money_securite',
    slug: 'payer-abonnement-boost-mobile-money-securite-rdc',
    title: 'Mobile Money (M-Pesa, Airtel, Orange) : bonnes pratiques pour vos transactions immobilières',
    excerpt:
      "Comment vérifier un compte marchand officiel, conserver vos références de transaction et obtenir vos reçus certifiés sur Kinimmo.",
    category: 'guide_achat',
    coverImage: '/og-images/blog_gombe_skyline_1795161879500.jpg',
    authorName: 'Équipe Confiance Kinimmo',
    authorRole: 'Sécurité & Facturation',
    readTimeMinutes: 4,
    status: 'published',
    featured: false,
    tags: ['Mobile Money RDC', 'M-Pesa', 'Anti-arnaque'],
    relatedCommune: 'Kintambo',
    publishedAt: '2026-11-08',
    updatedAt: '2026-11-18',
    content: `## Ne payez jamais de frais de visite avant d'avoir vu le bien

Un principe d'or sur le marché immobilier kinois : aucune visite sérieuse organisée par une agence vérifiée ne doit exiger un envoi d'argent préalable à un inconnu sur Mobile Money pour « réserver le transport » ou « bloquer la visite ».

## Vérifier vos paiements de services et d'abonnements

Lorsque vous réglez un abonnement Pro, Agence ou un Boost de visibilité sur la plateforme :
1. Utilisez exclusivement les **numéros marchands affichés dans votre facture officielle** ;
2. Saisissez votre référence SMS complète (et joignez la capture si besoin) pour faire passer la facture en validation ;
3. Téléchargez votre **reçu PDF numéroté avec QR code** dès la confirmation par notre équipe.`
  }
];

export const DEFAULT_LEGAL_COMPANY_META: LegalCompanyMeta = {
  companyName: 'KIN IMMOBILIER RDC SARL (À compléter)',
  legalForm: 'Société à Responsabilité Limitée (SARL)',
  rccm: 'CD/KIN/RCCM/XX-B-XXXXX (À compléter après validation)',
  idNat: '01-XXXX-NXXXXX (À compléter)',
  nif: 'AXXXXXXXX (À compléter)',
  headquartersAddress: 'Avenue Kananga, Q/ Binza Pigeon, C/ Ngaliema, Kinshasa, RDC',
  publicationDirector: 'Direction Générale Kinimmo',
  contactEmail: 'joosskalu72@gmail.com',
  dpoEmail: 'confidentialite@kinimmo.cd',
  supportPhone: '+243 84 529 4616',
  hostingProvider: 'Infrastructure Cloud Sécurisée & Serveurs Web Hostinger / Node.js',
};

export const DEFAULT_LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'conditions-utilisation',
    title: "Conditions Générales d'Utilisation",
    subtitle: "Règles d'accès, publication d'annonces, abonnements et responsabilité sur la plateforme Kinimmo en RDC.",
    needsLegalReview: true,
    legalReviewNotice:
      'Document indicatif rédigé pour le cadre légal de la République Démocratique du Congo — À faire valider par votre conseil juridique avant exploitation définitive.',
    effectiveDate: '2026-11-01',
    updatedAt: '2026-11-18',
    companyMeta: DEFAULT_LEGAL_COMPANY_META,
    sections: [
      {
        id: 'cgu_objet',
        heading: '1. Objet de la plateforme',
        body: `La plateforme Kinshasa Immobilier (Kinimmo) fournit un service numérique de mise en relation, de diffusion d'annonces immobilières, de visites vidéo, de conciergerie VIP et d'outils de gestion destinés aux particuliers, agents immobiliers et agences opérant principalement à Kinshasa et en République Démocratique du Congo.

Kinimmo agit en qualité d'intermédiaire technique d'hébergement et d'organisation de rendez-vous, sauf mandat écrit distinct expressément conclu dans le cadre du service de Conciergerie VIP.`
      },
      {
        id: 'cgu_comptes',
        heading: '2. Inscription, vérification d’identité et exactitude des annonces',
        body: `Tout annonceur (propriétaire, agent indépendant ou agence immobilière) s'engage à fournir des informations exactes, à jour et vérifiables sur son identité, son agrément professionnel le cas échéant (RCCM, carte professionnelle) ainsi que sur les caractéristiques réelles du bien publié (prix en USD/CDF, surface, commune, statut de disponibilité et titre foncier).

La publication d'annonces fictives, de photos détournées, de prix volontairement trompeurs ou la sollicitation de paiements abusifs avant visite entraînent la suspension immédiate du compte sans préavis.`
      },
      {
        id: 'cgu_abonnements',
        heading: '3. Formules d’abonnement, paiements Mobile Money et rétrogradation douce',
        body: `Les forfaits payants (mensuels ou annuels) et options de boost peuvent être réglés par Mobile Money (M-Pesa, Airtel Money, Orange Money) ou virement auprès des comptes marchands affichés sur la facture générée. L'activation intervient après vérification et émission d'un reçu numéroté.

En cas d'expiration d'un abonnement sans renouvellement, une rétrogradation douce vers le plan gratuit s'applique automatiquement : les annonces excédant le plafond du plan gratuit sont masquées au public sans être supprimées et redeviennent visibles dès le renouvellement.`
      },
      {
        id: 'cgu_propriete_intellectuelle',
        heading: '4. Propriété intellectuelle et partage',
        body: `Les marques, interfaces, codes sources, guides éditoriaux et fiches PDF générées par la plateforme demeurent la propriété de l'éditeur. Les annonceurs garantissent détenir l'ensemble des droits d'utilisation sur les photographies, plans et vidéos mis en ligne.`
      },
      {
        id: 'cgu_droit_applicable',
        heading: '5. Droit applicable et règlement des litiges',
        body: `Les présentes conditions sont régies par le droit positif de la République Démocratique du Congo et les Actes Uniformes OHADA applicables. Tout différend fera l'objet d'une tentative de règlement amiable préalable avant saisine des juridictions compétentes de Kinshasa.`
      }
    ]
  },
  {
    slug: 'confidentialite',
    title: 'Politique de Confidentialité & Protection des Données',
    subtitle: 'Collecte, usage, sécurisation et droits relatifs à vos données personnelles conformément au Code du Numérique RDC.',
    needsLegalReview: true,
    legalReviewNotice:
      'Document indicatif conforme aux principes du Code du Numérique de la RDC — À faire valider par votre conseil juridique.',
    effectiveDate: '2026-11-01',
    updatedAt: '2026-11-18',
    companyMeta: DEFAULT_LEGAL_COMPANY_META,
    sections: [
      {
        id: 'conf_collecte',
        heading: '1. Données personnelles collectées',
        body: `Dans le cadre de l'utilisation de Kinimmo, nous collectons uniquement les données strictement nécessaires au service : identité (nom, prénom), coordonnées de contact (numéro WhatsApp, téléphone, e-mail), pièces justificatives soumises volontairement pour la vérification Kinimmo Trust, préférences de recherche, demandes de visite ou de conciergerie, ainsi que les preuves de paiement de facturation.`
      },
      {
        id: 'conf_finalites',
        heading: '2. Finalités du traitement',
        body: `Vos données sont utilisées exclusivement pour :
- Créer et sécuriser votre compte utilisateur, agent ou agence ;
- Transmettre vos demandes de visite ou de renseignements à l'annonceur concerné ;
- Traiter vos dossiers de conciergerie VIP et d'abonnement/facturation ;
- Lutter contre la fraude immobilière, les annonces suspectes et le démarchage abusif ;
- Établir des statistiques anonymisées du marché immobilier par commune.`
      },
      {
        id: 'conf_conservation',
        heading: '3. Localisation approximative des biens et sécurité',
        body: `Afin de protéger la sécurité et la vie privée des occupants et propriétaires, la carte publique n'affiche qu'une zone approximative et des points de repère connus. Les documents de vérification d'identité et justificatifs Mobile Money sont accessibles uniquement aux personnes habilitées de la modération.`
      },
      {
        id: 'conf_droits',
        heading: '4. Vos droits d’accès, de rectification et de suppression',
        body: `Conformément aux dispositions applicables au traitement des données à caractère personnel en RDC, vous disposez d'un droit d'accès, de rectification, de mise à jour et de suppression de vos informations personnelles. Vous pouvez exercer ces droits à tout moment en écrivant au Délégué à la Protection des Données indiqué dans les coordonnées ci-contre.`
      }
    ]
  },
  {
    slug: 'mentions-legales',
    title: 'Mentions Légales',
    subtitle: 'Identification de l’éditeur, direction de publication, hébergement et coordonnées officielles.',
    needsLegalReview: true,
    legalReviewNotice:
      'Complétez vos numéros officiels RCCM, Id. Nat. et NIF dans l’onglet CMS Administrateur puis faites valider ces mentions par votre conseil.',
    effectiveDate: '2026-11-01',
    updatedAt: '2026-11-18',
    companyMeta: DEFAULT_LEGAL_COMPANY_META,
    sections: [
      {
        id: 'ml_editeur',
        heading: '1. Éditeur du site et de l’application',
        body: `La plateforme Kinshasa Immobilier (Kinimmo) est éditée par la société identifiée dans l'encadré officiel ci-contre, immatriculée au Registre du Commerce et du Crédit Mobilier (RCCM) de Kinshasa, République Démocratique du Congo.`
      },
      {
        id: 'ml_hebergement',
        heading: '2. Hébergement et disponibilité technique',
        body: `L'application web, les API temps réel et les sauvegardes sont hébergés sur une infrastructure sécurisée redondée garantissant le chiffrement des échanges HTTPS et la continuité de service.`
      },
      {
        id: 'ml_moderation',
        heading: '3. Signalement d’un contenu illicite ou d’une annonce suspecte',
        body: `Tout utilisateur peut signaler une annonce inexacte, déjà louée/vendue ou suspecte en deux clics directement depuis la fiche du bien (menu « … » -> « Signaler cette annonce ») ou par e-mail auprès de notre équipe de modération.`
      }
    ]
  }
];

export const DEFAULT_FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq_1',
    category: 'acheteurs_locataires',
    question: 'Comment demander une visite ou contacter un annonceur sur Kinimmo ?',
    answer:
      "Sur chaque fiche annonce (/annonces/:slug), utilisez la barre d'actions fixe en bas d'écran : cliquez sur WhatsApp pour écrire directement à l'annonceur, sur Appeler pour joindre son téléphone, ou sur Demander une visite pour proposer un créneau horaire précis."
  },
  {
    id: 'faq_2',
    category: 'acheteurs_locataires',
    question: 'Pourquoi la carte sur la fiche annonce indique-t-elle une zone approximative ?',
    answer:
      "Pour préserver la sécurité des résidents et éviter les visites impromptues sans rendez-vous, la carte publique affiche un cercle de zone approximatif autour du quartier et des points de repère officiels. L'adresse exacte est communiquée lors de la confirmation de la visite."
  },
  {
    id: 'faq_3',
    category: 'securite_confiance',
    question: 'Que signifie le niveau de vérification Kinimmo Trust sur un profil ou un bien ?',
    answer:
      "Kinimmo Trust vérifie la cohérence de l'identité de l'annonceur (pièce d'identité, RCCM pour les agences) et des justificatifs fonciers soumis. Un badge vérifié réduit fortement les risques d'intermédiaires non mandatés, sans remplacer l'audit cadastral final avant signature."
  },
  {
    id: 'faq_4',
    category: 'securite_confiance',
    question: 'Comment signaler une annonce suspecte ou déjà louée ?',
    answer:
      "Ouvrez la fiche du bien, touchez le bouton « … » dans la barre d'actions en bas, puis sélectionnez « Signaler cette annonce ». Choisissez le motif (faux prix, bien déjà vendu/loué, demande d'avance suspecte) : le signalement est envoyé en deux appuis à notre modération."
  },
  {
    id: 'faq_5',
    category: 'proprietaires_agences',
    question: 'Comment obtenir le QR code à coller sur mon panneau « À vendre » ou « À louer » ?',
    answer:
      "Depuis la fiche de votre annonce, cliquez sur « Partager » ou « QR & Panneau » : vous pouvez télécharger le QR code en PNG ou en SVG haute définition, ou imprimer directement l'affiche PDF prête à poser avec le bandeau « À VENDRE / À LOUER » et le lien court."
  },
  {
    id: 'faq_6',
    category: 'paiements_plans',
    question: 'Comment fonctionne le paiement manuel par Mobile Money (M-Pesa, Airtel Money, Orange Money) ?',
    answer:
      "Sélectionnez votre formule ou option de boost : une facture unique (FAC-KIN-...) est créée avec les numéros marchands configurés par Kinimmo. Effectuez le transfert, saisissez la référence SMS et joignez si souhaité une capture d'écran. Dès validation par l'administration, votre plan s'active et votre reçu PDF avec QR code est généré."
  },
  {
    id: 'faq_7',
    category: 'paiements_plans',
    question: 'Que deviennent mes annonces si mon abonnement expire ?',
    answer:
      "Aucune annonce n'est supprimée : une rétrogradation douce s'applique. Vos annonces les plus récentes restent publiées dans la limite du plan gratuit, et l'excédent est simplement masqué au public jusqu'au prochain renouvellement."
  },
  {
    id: 'faq_8',
    category: 'conciergerie',
    question: 'Dans quels cas faire appel à la Conciergerie VIP Kinimmo ?',
    answer:
      "La Conciergerie VIP accompagne les particuliers exigeants, cadres expatriés, membres de la diaspora et entreprises souhaitant déléguer la présélection de biens vérifiés, la planification des visites groupées à Kinshasa et l'appui jusqu'à la signature."
  }
];

interface CuratedNeighborhoodCopy {
  tagline: string;
  description: string;
  highlights: string[];
  landmarks: string[];
  advisorTip: string;
  neighborSlugs: string[];
}

const CURATED_COMMUNE_PROFILES: Record<string, CuratedNeighborhoodCopy> = {
  gombe: {
    tagline: 'Centre diplomatique, financier et résidentiel haut standing de Kinshasa',
    description:
      "La Gombe borde le fleuve Congo et regroupe les ministères, ambassades, sièges bancaires, cliniques internationales et résidences de standing. C'est le secteur le plus recherché pour les appartements sécurisés, penthouses et bureaux clés en main.",
    highlights: ['Proximité immédiate du Boulevard du 30 Juin', 'Immeubles avec groupe électrogène et gardiennage 24/7', 'Forte liquidité locative auprès des expatriés et sièges sociaux'],
    landmarks: ['Boulevard du 30 Juin', 'Gare Centrale', 'Clinique Ngaliema', 'Hôtel Memling & Fleuve Congo'],
    advisorTip: "Vérifiez systématiquement les charges de copropriété (groupe électrogène, eau, sécurité) souvent facturées en supplément du loyer de base.",
    neighborSlugs: ['ngaliema', 'kintambo', 'lingwala', 'barumbu']
  },
  ngaliema: {
    tagline: 'Villas résidentielles, ambassades et vues panoramiques sur le fleuve Congo',
    description:
      "Vaste commune résidentielle de l'Ouest kinois, Ngaliema abrite les quartiers prisés de Binza Macampagne, Binza Pigeon, Joli Parc et Basoko/GB. Elle séduit par ses parcelles verdoyantes, ses écoles internationales et ses villas familiales avec piscine.",
    highlights: ['Grandes parcelles arborées et villas familiales', 'Écoles internationales et commerces sur l’avenue des Écuries', 'Quartiers calmes prisés par les diplomates et familles'],
    landmarks: ['Avenue Ma Campagne', 'Binza Pigeon', 'Mont Ngaliema / OUA', 'Avenue des Écuries'],
    advisorTip: "Évaluez les trajets aux heures de pointe vers la Gombe selon que le bien se trouve côté Basoko/GB, Macampagne ou Pigeon.",
    neighborSlugs: ['gombe', 'kintambo', 'mont-ngafula', 'binza-pigeon']
  },
  limete: {
    tagline: 'Quartier résidentiel structuré entre centre-ville et axe aéroportuaire',
    description:
      "Reconnue pour le tracé géométrique de ses rues résidentielles numérotées le long du Boulevard Lumumba, Limete combine vie de quartier dynamique, duplex modernes et accessibilité rapide vers Gombe comme vers l'aéroport de N'djili.",
    highlights: ['Rues résidentielles numérotées et accessibles', 'Fort dynamisme des immeubles R+2 / duplex récents', 'Accès direct vers le Boulevard Lumumba'],
    landmarks: ['Échangeur de Limete', 'Boulevard Lumumba', '7ème et 10ème Rues Résidentielles', 'Place des Artistes'],
    advisorTip: "Privilégiez les rues résidentielles bitumées (1ère à 15ème rue) avec bon drainage pluvial et transformateur dédié.",
    neighborSlugs: ['matete', 'kalamu', 'lemba', 'barumbu']
  },
  kintambo: {
    tagline: 'Carrefour historique entre Gombe et Ngaliema avec forte vie commerçante',
    description:
      "Située à la jonction stratégique de l'avenue Colonel Mondjiba et de Kintambo Magasin, la commune attire jeunes actifs, cabinets et investisseurs cherchant des appartements modernes à 10 minutes de la Gombe.",
    highlights: ['Connexion immédiate vers Gombe et Ngaliema', 'Loyers plus accessibles qu’à la Gombe pour un emplacement central', 'Commerces et transports abondants'],
    landmarks: ['Rond-point Kintambo Magasin', 'Avenue Colonel Mondjiba', 'Hôpital de Kintambo', 'Quartier Jamaïque'],
    advisorTip: "Les appartements rénovés proches de l'axe Mondjiba offrent d'excellents rendements locatifs tout au long de l'année.",
    neighborSlugs: ['gombe', 'ngaliema', 'bandalungwa']
  },
  'mont-ngafula': {
    tagline: 'Collines verdoyantes, grands terrains titrés et nouveaux lotissements',
    description:
      "Au sud-ouest de Kinshasa, Mont-Ngafula offre de grands espaces constructibles, des cités résidentielles récentes (Cité Mama Mobutu, Righini, Kimbondo) et un cadre plus aéré en altitude.",
    highlights: ['Terrains vastes à prix compétitifs', 'Programmes de villas contemporaines sur lotissements', 'Proximité du campus universitaire UNIKIN'],
    landmarks: ['Triangle de Mont-Ngafula', 'Cité Mama Mobutu', 'Righini', 'Route By-Pass'],
    advisorTip: "Lors de l'achat d'un terrain nu à Mont-Ngafula, faites vérifier le bornage et l'absence de chevauchement auprès du cadastre de Lukunga.",
    neighborSlugs: ['ngaliema', 'lemba', 'makala']
  },
  bandalungwa: {
    tagline: 'Commune vivante prisée des cadres, studios modernes et commerces urbains',
    description:
      "Bandalungwa est appréciée pour sa convivialité, ses avenues éclairées et le développement rapide de résidences R+2 proposant des appartements 2 à 3 chambres très demandés.",
    highlights: ['Forte demande locative pour studios et 2 chambres', 'Ambiance urbaine animée et commerces de proximité', 'Position centrale dans le district de la Funa'],
    landmarks: ['Avenue Kasa-Vubu', 'Makelele', 'Tshibangu', 'Moulin'],
    advisorTip: "Vérifiez la présence d'une citerne d'eau et d'un raccordement stable lors de la visite d'immeubles récents.",
    neighborSlugs: ['kintambo', 'lingwala', 'kalamu']
  }
};

const KEY_QUARTIERS_EXTRA: Array<{ name: string; commune: string; tagline: string; landmarks: string[]; description: string }> = [
  {
    name: 'Binza Pigeon',
    commune: 'Ngaliema',
    tagline: 'Quartier résidentiel très demandé à Ngaliema avec accès rapide vers Kintambo',
    landmarks: ['Rond-point Binza Pigeon', 'Avenue Kananga', 'Route de Matadi'],
    description: "Binza Pigeon attire familles, cadres et agences grâce à son équilibre entre calme résidentiel, écoles et proximité directe avec Kintambo et la Gombe."
  },
  {
    name: 'Binza Macampagne',
    commune: 'Ngaliema',
    tagline: 'Secteur résidentiel de référence pour villas de standing et résidences sécurisées',
    landmarks: ['Avenue Ma Campagne', 'Avenue des Écuries', 'Supermarchés Macampagne'],
    description: "Binza Macampagne est l'un des quartiers les plus cotés de Kinshasa pour les villas contemporaines, les résidences diplomatiques et les programmes neufs avec piscine."
  },
  {
    name: 'Socimat',
    commune: 'Gombe',
    tagline: 'Axe stratégique entre la Gombe et Ngaliema autour du Boulevard du 30 Juin',
    landmarks: ['Rond-point Socimat', 'Avenue Colonel Mondjiba', 'Boulevard du 30 Juin'],
    description: "Autour du rond-point Socimat, les tours résidentielles et immeubles de bureaux offrent un accès immédiat aux institutions et hôtels de la Gombe."
  },
  {
    name: 'Limete Résidentiel',
    commune: 'Limete',
    tagline: 'Les avenues numérotées historiques dédiées à l’habitat familial et aux duplex',
    landmarks: ['7ème Rue Résidentielle', '10ème Rue Résidentielle', 'Boulevard Lumumba'],
    description: "Limete Résidentiel rassemble des parcelles spacieuses, des duplex de standing et des écoles réputées au cœur du district du Mont-Amba."
  },
  {
    name: 'Righini',
    commune: 'Mont-Ngafula',
    tagline: 'Quartier calme proche de l’UNIKIN prisé pour les maisons familiales et investissements',
    landmarks: ['Avenue Université', 'By-Pass', 'Campus UNIKIN'],
    description: "Situé entre Lemba et Mont-Ngafula, Righini offre des parcelles généreuses et des immeubles locatifs appréciés des enseignants, chercheurs et familles."
  }
];

function computeStatsForProperties(list: Property[]) {
  const active = list.filter((p) => {
    const statusUpper = String(p?.listingStatus || '').toUpperCase();
    return p && p.published !== false && statusUpper !== 'ARCHIVED' && statusUpper !== 'REJECTED';
  });
  const sale = active.filter((p) => p.status === 'for-sale' && p.price > 0);
  const rent = active.filter((p) => p.status === 'for-rent' && p.price > 0);
  const withArea = sale.filter((p) => p.area && p.area > 0);
  const allPrices = active.map((p) => Number(p.price || 0)).filter((n) => n > 0);

  return {
    activeCount: active.length,
    saleCount: sale.length,
    rentCount: rent.length,
    avgSalePriceUsd:
      sale.length > 0 ? Math.round(sale.reduce((s, p) => s + Number(p.price || 0), 0) / sale.length) : null,
    avgRentPriceUsd:
      rent.length > 0 ? Math.round(rent.reduce((s, p) => s + Number(p.price || 0), 0) / rent.length) : null,
    avgPricePerSqmUsd:
      withArea.length > 0
        ? Math.round(withArea.reduce((s, p) => s + Number(p.price || 0) / Number(p.area || 1), 0) / withArea.length)
        : null,
    minPriceUsd: allPrices.length > 0 ? Math.min(...allPrices) : null,
    maxPriceUsd: allPrices.length > 0 ? Math.max(...allPrices) : null,
  };
}

export function matchesNeighborhood(prop: Property, profile: Pick<NeighborhoodProfile, 'name' | 'commune' | 'kind'>): boolean {
  const propCommune = slugifyText(prop.commune || '');
  const propQuartier = slugifyText(prop.quartier || '');
  const propAddress = slugifyText(prop.address || '');
  const targetSlug = slugifyText(profile.name);
  const communeSlug = slugifyText(profile.commune);

  if (profile.kind === 'commune') {
    return propCommune === communeSlug || propAddress.includes(communeSlug);
  }
  return (
    propQuartier.includes(targetSlug) ||
    propAddress.includes(targetSlug) ||
    (propCommune === communeSlug && slugifyText(prop.title || '').includes(targetSlug))
  );
}

export function buildNeighborhoodDirectory(properties: Property[] = []): NeighborhoodProfile[] {
  const profiles: NeighborhoodProfile[] = [];

  Object.values(KINSHASA_COMMUNES_DATA).forEach((communeData) => {
    const slug = slugifyText(communeData.name);
    const curated = CURATED_COMMUNE_PROFILES[slug];
    const baseProfile: Omit<NeighborhoodProfile, 'stats'> = {
      slug,
      name: communeData.name,
      commune: communeData.name,
      district: communeData.districts || 'Kinshasa',
      kind: 'commune',
      tagline:
        curated?.tagline ||
        `Annonces immobilières vérifiées, maisons, terrains et appartements à ${communeData.name}`,
      description:
        curated?.description ||
        `La commune de ${communeData.name} (district de ${communeData.districts || 'Kinshasa'}) offre un marché immobilier actif pour la vente de parcelles, maisons familiales et locations résidentielles autour de ses quartiers phares (${communeData.quartiers.slice(0, 4).join(', ')}).`,
      highlights:
        curated?.highlights || [
          `Quartiers principaux : ${communeData.quartiers.slice(0, 3).join(', ')}`,
          `Axes clés : ${communeData.popularAvenues.slice(0, 2).join(', ')}`,
          'Annonces contrôlées par la modération Kinimmo',
        ],
      landmarks: curated?.landmarks || communeData.popularAvenues.slice(0, 4),
      advisorTip:
        curated?.advisorTip ||
        `Comparez plusieurs biens similaires à ${communeData.name} et vérifiez toujours les titres fonciers ainsi que les raccordements eau/électricité avant signature.`,
      neighborSlugs: curated?.neighborSlugs || ['gombe', 'ngaliema', 'limete', 'kintambo'].filter((s) => s !== slug),
    };

    const matching = properties.filter((p) => matchesNeighborhood(p, baseProfile));
    profiles.push({
      ...baseProfile,
      stats: computeStatsForProperties(matching),
    });
  });

  KEY_QUARTIERS_EXTRA.forEach((q) => {
    const slug = slugifyText(q.name);
    const communeSlug = slugifyText(q.commune);
    const baseProfile: Omit<NeighborhoodProfile, 'stats'> = {
      slug,
      name: q.name,
      commune: q.commune,
      district: KINSHASA_COMMUNES_DATA[q.commune]?.districts || 'Kinshasa',
      kind: 'quartier',
      tagline: q.tagline,
      description: q.description,
      highlights: [
        `Situé dans la commune de ${q.commune}`,
        `Repères clés : ${q.landmarks.join(', ')}`,
        'Demande active en location et acquisition vérifiée',
      ],
      landmarks: q.landmarks,
      advisorTip: `Demandez à l'annonceur la distance précise par rapport aux repères de ${q.name} lors de la confirmation de visite.`,
      neighborSlugs: [communeSlug, 'gombe', 'ngaliema', 'limete'].filter((s, i, a) => s !== slug && a.indexOf(s) === i),
    };

    const matching = properties.filter((p) => matchesNeighborhood(p, baseProfile));
    profiles.push({
      ...baseProfile,
      stats: computeStatsForProperties(matching),
    });
  });

  return profiles;
}

export function resolveNeighborhoodBySlug(slug: string, properties: Property[] = []): NeighborhoodProfile | null {
  const normalized = slugifyText(decodeURIComponent(slug || ''));
  if (!normalized) return null;
  const all = buildNeighborhoodDirectory(properties);
  return all.find((n) => n.slug === normalized) || null;
}
