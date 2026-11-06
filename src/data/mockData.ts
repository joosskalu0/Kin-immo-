import { CustomFieldDefinition, Property, Agent, Agency, SubscriptionPlan, LeadRequest, Invoice } from '../types';

export const initialCustomFields: CustomFieldDefinition[] = [
  {
    id: 'field_titre_foncier',
    key: 'titre_foncier',
    label: { fr: 'Titre de Propriété / Document Foncier', en: 'Land Title Document' },
    type: 'select',
    group: 'specs',
    options: ['Certificat d\'Enregistrement (Titre Foncier Validé)', 'Contrat d\'Occupation Provisoire (COP)', 'Livret de Logeur', 'Fiche d\'Attribution'],
    required: true,
    showInSearch: true,
    icon: 'FileCheck',
    defaultValue: 'Certificat d\'Enregistrement (Titre Foncier Validé)',
  },
  {
    id: 'field_electricite_autonomie',
    key: 'electricite_autonomie',
    label: { fr: 'Électricité & Autonomie (Groupe / Solaire)', en: 'Electricity & Solar System' },
    type: 'select',
    group: 'specs',
    options: ['Panneaux Solaires + Groupe Électrogène + SNEL', 'Groupe Électrogène + SNEL', 'Panneaux Solaires + SNEL', 'SNEL Uniquement'],
    required: false,
    showInSearch: true,
    icon: 'Zap',
    defaultValue: 'Panneaux Solaires + Groupe Électrogène + SNEL',
  },
  {
    id: 'field_eau_forage',
    key: 'eau_forage',
    label: { fr: 'Approvisionnement en Eau & Forage', en: 'Water Supply & Well' },
    type: 'select',
    group: 'specs',
    options: ['Forage Privé d\'Eau + REGIDESO + Citerne', 'Forage Privé + Citerne Hydrophore', 'REGIDESO + Citerne de Réserve', 'REGIDESO Uniquement'],
    required: false,
    showInSearch: true,
    icon: 'Droplets',
    defaultValue: 'Forage Privé d\'Eau + REGIDESO + Citerne',
  },
  {
    id: 'field_securite',
    key: 'securite',
    label: { fr: 'Dispositif de Sécurité', en: 'Security System' },
    type: 'select',
    group: 'specs',
    options: ['Mur de Clôture + Fil Barbelé Électrifié + Caméras + Gardien 24/7', 'Clôture Électrifiée + Gardien 24/7', 'Mur de Clôture + Caméras', 'Portail Sécurisé'],
    required: false,
    showInSearch: true,
    icon: 'ShieldAlert',
    defaultValue: 'Mur de Clôture + Fil Barbelé Électrifié + Caméras + Gardien 24/7',
  },
  {
    id: 'field_taxe_fonciere',
    key: 'taxe_fonciere_dgrk',
    label: { fr: 'Taxe Foncière Annuelle DGRK ($/an)', en: 'Annual Property Tax DGRK ($/yr)' },
    type: 'number',
    unit: '$/an',
    group: 'financial',
    required: false,
    showInSearch: false,
    icon: 'Receipt',
    defaultValue: 1200,
  },
  {
    id: 'field_distance_fleuve',
    key: 'distance_fleuve',
    label: { fr: 'Proximité Fleuve Congo / Centre Gombe', en: 'Proximity to River or Gombe' },
    type: 'text',
    group: 'general',
    required: false,
    showInSearch: true,
    icon: 'Compass',
    defaultValue: '5 min du Fleuve Congo / Bd du 30 Juin',
  },
  {
    id: 'field_private_owner_phone',
    key: 'private_owner_phone',
    label: { fr: 'Téléphone Direct Propriétaire Kinshasa (Privé)', en: 'Direct Owner Phone (Private)' },
    type: 'contact',
    group: 'private',
    required: false,
    isPrivate: true,
    icon: 'PhoneLock',
    defaultValue: '+243 81 234 56 78',
  },
  {
    id: 'field_private_commission',
    key: 'private_commission_rate',
    label: { fr: 'Commission Agence Négociée (%)', en: 'Negotiated Commission (%)' },
    type: 'number',
    unit: '%',
    group: 'private',
    required: false,
    isPrivate: true,
    icon: 'Percent',
    defaultValue: 5.0,
  },
];

export const initialAgencies: Agency[] = [];

export const initialAgents: Agent[] = [];

export const initialProperties: Property[] = [];

export const initialSubscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Pack Particulier / Propriétaire',
    priceMonthly: 0,
    priceMonthlyCDF: 0,
    currency: 'CDF',
    billingPeriod: 'month',
    maxListings: 3,
    featuredListings: 0,
    agentAccounts: 1,
    isActive: true,
    features: [
      'Jusqu\'à 3 annonces gratuites',
      'Fiche détaillée avec photos',
      'Champs personnalisés Kinshasa (Titre foncier, Groupe, Eau)',
      'Reception des demandes par WhatsApp (+243)',
      'Support client'
    ],
  },
  {
    id: 'pro',
    name: 'Pack Agent Pro Kinshasa',
    priceMonthly: 35,
    priceMonthlyCDF: 98000,
    currency: 'CDF',
    billingPeriod: 'month',
    maxListings: 25,
    featuredListings: 5,
    agentAccounts: 1,
    recommended: true,
    isActive: true,
    features: [
      'Jusqu\'à 25 annonces actives',
      '5 Annonces En Vedette sur la Carte AJAX',
      'Accès aux Notes Privées & Infos Propriétaires',
      'Fields Builder Illimité (Champs personnalisés)',
      'Gestionnaire de Leads CRM & Rendez-vous',
      'Badge "Agent Vérifié +243"',
      'Générateur de Fiches PDF pour Clients'
    ],
  },
  {
    id: 'agency',
    name: 'Pack Agence Immobilière Elite',
    priceMonthly: 99,
    priceMonthlyCDF: 280000,
    currency: 'CDF',
    billingPeriod: 'month',
    maxListings: 150,
    featuredListings: 20,
    agentAccounts: 8,
    isActive: true,
    features: [
      'Jusqu\'à 150 annonces d\'agence',
      '20 Annonces En Vedette',
      '8 Comptes Agents inclus',
      'Page Agence dédiée avec Logo & Contact direct',
      'Exportation PDF aux couleurs de votre Agence',
      'Mise en avant prioritaire sur Kinshasa',
      'Support VIP dédié 24h/7'
    ],
  },
];

export const initialLeads: LeadRequest[] = [];

export const initialInvoices: Invoice[] = [];
