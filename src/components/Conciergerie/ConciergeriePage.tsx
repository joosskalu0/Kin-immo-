import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  DollarSign,
  BedDouble,
  Bath,
  Car,
  Armchair,
  CheckSquare,
  Square,
  Send,
  AlertCircle,
  Phone,
  MessageCircle,
  Mail,
  User,
  Compass,
  Search,
  Eye,
  Calendar,
  X
} from 'lucide-react';
import {
  ConciergerieProjet,
  ConciergerieTypeBien,
  ConciergerieService,
  ConciergerieRequest
} from '../../types';
import {
  CONCIERGERIE_PROJETS,
  CONCIERGERIE_TYPES_BIEN,
  CONCIERGERIE_SERVICES,
  KINSHASA_COMMUNES,
  validateConciergerieRequest
} from '../../utils/conciergerieValidation';
import { findMatchingProperties, PropertyMatchResult } from '../../utils/propertyMatching';
import { submitConciergerieRequest } from '../../services/conciergerieApi';
import { useApp } from '../../context/AppContext';

interface ConciergeriePageProps {
  onReturnHome?: () => void;
  onExploreProperties?: () => void;
  initialCriteria?: {
    projet?: ConciergerieProjet;
    typeBien?: ConciergerieTypeBien;
    commune?: string;
    quartier?: string;
  };
}

export const ConciergeriePage: React.FC<ConciergeriePageProps> = ({
  onReturnHome,
  onExploreProperties,
  initialCriteria
}) => {
  const { contactSettings, properties } = useApp();
  const formRef = useRef<HTMLDivElement>(null);

  // État des correspondances automatiques
  const [submissionMatches, setSubmissionMatches] = useState<PropertyMatchResult[]>([]);

  // État du formulaire
  const [projet, setProjet] = useState<ConciergerieProjet>(initialCriteria?.projet || 'Acheter');
  const [typeBien, setTypeBien] = useState<ConciergerieTypeBien>(initialCriteria?.typeBien || 'Appartement');
  const [commune, setCommune] = useState<string>(initialCriteria?.commune || 'Gombe');
  const [quartier, setQuartier] = useState<string>(initialCriteria?.quartier || '');
  const [budgetMin, setBudgetMin] = useState<string>('');
  const [budgetMax, setBudgetMax] = useState<string>('');
  const [devise, setDevise] = useState<'USD' | 'CDF'>('USD');
  const [chambres, setChambres] = useState<string>('3');
  const [sallesDeBain, setSallesDeBain] = useState<string>('2');
  const [parking, setParking] = useState<boolean>(true);
  const [meuble, setMeuble] = useState<boolean>(false);
  const [services, setServices] = useState<ConciergerieService[]>([
    'Recherche de biens',
    'Organisation de visites',
    'Vérification des informations disponibles'
  ]);
  const [nomComplet, setNomComplet] = useState<string>('');
  const [telephone, setTelephone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');

  // États d'aperçu et modale
  const [showProcessPreviewModal, setShowProcessPreviewModal] = useState(false);
  const [isPreviewModeActive, setIsPreviewModeActive] = useState(false);

  // États de soumission et erreurs de validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<ConciergerieRequest | null>(null);

  // Synchronisation avec les paramètres URL pour l'aperçu
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = (params.get('projet') || initialCriteria?.projet) as ConciergerieProjet;
      const t = (params.get('type') || params.get('typeBien') || initialCriteria?.typeBien) as ConciergerieTypeBien;
      const c = params.get('commune') || initialCriteria?.commune;
      const q = params.get('quartier') || initialCriteria?.quartier;
      const bMax = params.get('budgetMax');

      if (p && CONCIERGERIE_PROJETS.includes(p)) setProjet(p);
      if (t && CONCIERGERIE_TYPES_BIEN.includes(t)) setTypeBien(t);
      if (c && KINSHASA_COMMUNES.includes(c)) setCommune(c);
      if (q) setQuartier(q);
      if (bMax) setBudgetMax(bMax);
    } catch {}
  }, [initialCriteria]);

  // Pré-remplissage en un clic d'un exemple concret d'aperçu
  const handleLoadSamplePreview = () => {
    setProjet('Acheter');
    setTypeBien('Villa');
    setCommune('Ngaliema');
    setQuartier('Macampagne');
    setBudgetMin('250000');
    setBudgetMax('450000');
    setDevise('USD');
    setChambres('4');
    setSallesDeBain('3');
    setParking(true);
    setMeuble(false);
    setServices([
      'Recherche de biens',
      'Organisation de visites',
      'Accompagnement à l’achat',
      'Vérification des informations disponibles'
    ]);
    setNomComplet('Kalu Mukendi (Exemple d’aperçu)');
    setTelephone('+243 82 000 1234');
    setWhatsapp('+243 82 000 1234');
    setEmail('kalu.mukendi@example.com');
    setMessage('Exemple d’aperçu concret : recherche d’une villa standing avec jardin arboré, piscine et groupe électrogène. Titre foncier (certificat d’enregistrement) en ordre impératif.');
    setErrors({});
    setServerError(null);
    setIsPreviewModeActive(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Défilement fluide vers le formulaire
  const handleScrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleToggleService = (service: ConciergerieService) => {
    if (services.includes(service)) {
      setServices(services.filter((s) => s !== service));
    } else {
      setServices([...services, service]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const formData = {
      // Table concierge_requests :
      project_type: projet,
      property_type: typeBien,
      commune,
      quartier: quartier.trim() || null,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : 0,
      currency: devise,
      bedrooms: chambres ? Number(chambres) : null,
      bathrooms: sallesDeBain ? Number(sallesDeBain) : null,
      parking,
      furnished: meuble,
      services,
      description: message.trim() || null,
      full_name: nomComplet.trim(),
      phone: telephone.trim(),
      whatsapp: whatsapp.trim() || null,
      email: email.trim(),
      status: 'new' as const,
      assigned_agent_id: null,
      user_id: null,

      // Rétrocompatibilité :
      projet,
      typeBien,
      localisation: {
        commune,
        quartier: quartier.trim() || undefined
      },
      budget: {
        min: budgetMin ? Number(budgetMin) : undefined,
        max: budgetMax ? Number(budgetMax) : 0,
        devise
      },
      caracteristiques: {
        chambres: chambres ? Number(chambres) : undefined,
        sallesDeBain: sallesDeBain ? Number(sallesDeBain) : undefined,
        parking,
        meuble
      },
      client: {
        nomComplet: nomComplet.trim(),
        telephone: telephone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim(),
        message: message.trim() || undefined
      }
    };

    // 1. Validation Frontend rigoureuse
    const clientValidation = validateConciergerieRequest(formData);
    if (!clientValidation.isValid) {
      setErrors(clientValidation.errors);
      const firstErrorKey = Object.keys(clientValidation.errors)[0];
      const el = document.getElementById(`field-${firstErrorKey}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      // 2. Validation Backend & Sauvegarde
      const res = await submitConciergerieRequest(formData);

      if (!res.success) {
        if (res.errors) {
          setErrors(res.errors);
        }
        setServerError(res.error || 'Erreur lors de la validation par le serveur.');
        setIsSubmitting(false);
        return;
      }

      if (res.data) {
        setSubmittedData(res.data);
        if (res.matched_properties && res.matched_properties.length > 0) {
          setSubmissionMatches(res.matched_properties);
        } else {
          const matches = findMatchingProperties(res.data, properties, { minScore: 10, limit: 10 });
          setSubmissionMatches(matches);
        }
      }
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      setServerError('Une erreur inattendue est survenue. Veuillez réessayer.');
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedData(null);
    setSubmissionMatches([]);
    setNomComplet('');
    setTelephone('');
    setWhatsapp('');
    setEmail('');
    setMessage('');
    setBudgetMin('');
    setBudgetMax('');
    setQuartier('');
    setErrors({});
    setServerError(null);
    setIsPreviewModeActive(false);
  };

  const conciergeWhatsAppNumber = (
    contactSettings?.vipConcierge?.whatsapp ||
    contactSettings?.supportWhatsApp ||
    '243845294616'
  ).replace(/[^0-9]/g, '');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      
      {/* 1. EN-TÊTE PROFESSIONNEL & HERO LUMINEUX */}
      <div className="relative overflow-hidden bg-gradient-to-b from-emerald-50/50 via-white to-slate-50 border-b border-slate-200 pt-8 pb-12 sm:pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          
          {/* Fil d'Ariane */}
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
            <button
              onClick={onReturnHome}
              className="hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Accueil</span>
            </button>
            <span>/</span>
            <span className="text-emerald-700 font-bold">Conciergerie Immobilière</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Colonne Gauche : Présentation Officielle */}
            <div className="lg:col-span-8 space-y-6">
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Service d'Accompagnement Dédié • Kinshasa</span>
              </div>

              {/* Titre Demandé */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 uppercase tracking-tight leading-[1.1]">
                Votre recherche immobilière, notre accompagnement
              </h1>

              {/* Texte Demandé */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
                « Vous recherchez un bien immobilier mais vous n’avez pas le temps de parcourir toutes les annonces ? Kinimmo vous accompagne dans votre recherche. »
              </p>

              {/* Bouton Demandé & Boutons d'Aperçu */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleScrollToForm}
                  className="px-7 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center gap-3 cursor-pointer active:scale-95 group"
                >
                  <span>Demander l’aide de Kinimmo</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  onClick={() => setShowProcessPreviewModal(true)}
                  className="px-5 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                  title="Voir l'aperçu complet de la prise en charge et de la démarche"
                >
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <span>Aperçu de la démarche</span>
                </button>

                <button
                  onClick={handleLoadSamplePreview}
                  className="px-4 py-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300 transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Pré-remplir instantanément le formulaire avec un exemple concret pour tester"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tester avec un exemple</span>
                </button>

                {onExploreProperties && (
                  <button
                    onClick={onExploreProperties}
                    className="px-4 py-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-bold text-xs border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <span>Catalogue</span>
                  </button>
                )}
              </div>

              {/* Badges de Réassurance Kinimmo */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-slate-200">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Audit Foncier</span>
                    <span className="text-[11px] text-slate-500">Titres vérifiés au cadastre</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Gain de Temps</span>
                    <span className="text-[11px] text-slate-500">Sélection ciblée sous 24-48h</span>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 col-span-2 sm:col-span-1">
                  <Building2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Réseau Certifié</span>
                    <span className="text-[11px] text-slate-500">Accès exclusif inter-agences</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Colonne Droite : Fiche de Confiance Lumineuse */}
            <div className="lg:col-span-4">
              <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200 text-slate-900 shadow-sm relative space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Recherche Personnalisée
                  </span>
                  <h3 className="text-lg font-black text-slate-900 pt-2">Comment ça marche ?</h3>
                </div>

                <div className="space-y-4 text-xs text-slate-600">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-900 block font-bold mb-0.5">Exprimez votre besoin</strong>
                      <span>Remplissez vos critères précis dans le formulaire ci-dessous.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-900 block font-bold mb-0.5">Audit & Sélection exclusive</strong>
                      <span>Notre conciergerie active le réseau des agences et promoteurs vérifiés.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-black flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-900 block font-bold mb-0.5">Visites & Négociation</strong>
                      <span>Visitez uniquement des biens conformes et bénéficiez de conseils neutres.</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="text-xs leading-snug">
                    <span className="font-bold text-slate-900 block">Besoin d'un contact immédiat ?</span>
                    <a
                      href={`https://wa.me/${conciergeWhatsAppNumber}?text=${encodeURIComponent('Bonjour Conciergerie Kinimmo, je souhaite un accompagnement pour ma recherche immobilière.')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:text-emerald-800 font-bold underline transition-colors"
                    >
                      Échanger directement sur WhatsApp
                    </a>
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 2. CONFIRMATION DE SOUMISSION RÉUSSIE */}
      {submittedData && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
          <div className="p-8 sm:p-10 rounded-3xl bg-white border-2 border-emerald-500 shadow-sm text-slate-900 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
            
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-200 inline-block">
                Dossier Enregistré • Réf : {submittedData.reference}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase">
                Votre demande a bien été transmise à la Conciergerie Kinimmo !
              </h2>
              <p className="text-sm text-slate-600">
                Merci <strong className="text-slate-900">{submittedData.client.nomComplet}</strong>. Un conseiller dédié étudie actuellement votre recherche de <span className="text-emerald-700 font-bold">{submittedData.typeBien} ({submittedData.projet})</span> à <span className="text-emerald-700 font-bold">{submittedData.localisation.commune}</span>.
              </p>
            </div>

            {/* Récapitulatif structuré */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-medium">
              <div>
                <span className="text-slate-500 block font-normal">Projet & Type :</span>
                <span className="text-slate-900 font-bold">{submittedData.projet} • {submittedData.typeBien}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-normal">Localisation :</span>
                <span className="text-slate-900 font-bold">{submittedData.localisation.commune} {submittedData.localisation.quartier ? `(${submittedData.localisation.quartier})` : ''}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-normal">Budget Max :</span>
                <span className="text-emerald-700 font-mono font-black">${submittedData.budget.max.toLocaleString()} {submittedData.budget.devise}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-normal">Contact :</span>
                <span className="text-slate-900 font-bold">{submittedData.client.telephone}</span>
              </div>
            </div>

            {/* Actions rapides */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href={`https://wa.me/${conciergeWhatsAppNumber}?text=${encodeURIComponent(
                  `Bonjour Conciergerie Kinimmo, je viens de soumettre ma demande de recherche n° ${submittedData.reference} pour un ${submittedData.typeBien} (${submittedData.projet}) à ${submittedData.localisation.commune}. Je souhaite échanger avec vous.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center gap-2 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Accélérer mon dossier sur WhatsApp</span>
              </a>

              <button
                onClick={handleResetForm}
                className="px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer border border-slate-200"
              >
                Soumettre une autre demande
              </button>
            </div>

            {/* SECTION DE CORRESPONDANCE AUTOMATIQUE AVEC LES ANNONCES KINIMMO */}
            {submissionMatches.length > 0 && (
              <div className="pt-8 border-t border-slate-200 space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Correspondance automatique immédiate</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">
                      Biens correspondants trouvés dans notre catalogue
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Notre système a instantanément scanné les propriétés disponibles et identifié les biens les plus pertinents selon vos critères :
                    </p>
                  </div>
                </div>

                {/* Grille des biens correspondants classés par score décroissant */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                  {submissionMatches.slice(0, 6).map((match, idx) => {
                    const prop = match.property;
                    let badgeClass = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                    if (match.score < 50) {
                      badgeClass = 'bg-amber-100 text-amber-900 border-amber-300';
                    } else if (match.score < 80) {
                      badgeClass = 'bg-blue-100 text-blue-900 border-blue-300';
                    }

                    return (
                      <div
                        key={prop.id}
                        className="bg-white rounded-3xl border border-slate-200 hover:border-purple-300 transition-all p-4 space-y-3 flex flex-col justify-between shadow-xs group"
                      >
                        <div className="space-y-3">
                          {/* Image & Score Badge */}
                          <div className="relative rounded-2xl overflow-hidden aspect-video bg-slate-100">
                            <img
                              src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600'}
                              alt={prop.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-full bg-slate-900/80 text-white flex items-center justify-center text-xs font-black">
                                #{idx + 1}
                              </span>
                            </div>
                            <div className="absolute top-2.5 right-2.5">
                              <span className={`px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1 shadow-sm ${badgeClass}`}>
                                <Sparkles className="w-3 h-3 text-purple-600" />
                                <span>{match.score}% Pertinence</span>
                              </span>
                            </div>
                          </div>

                          {/* Titre & Localisation */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                              <span className="uppercase text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                                {prop.type}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-emerald-600" />
                                <span>{prop.commune}</span>
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                              {prop.title}
                            </h4>

                            <div className="text-base font-mono font-black text-emerald-700 pt-1">
                              {prop.price.toLocaleString()} {prop.currency}
                              {prop.period ? <span className="text-xs text-slate-500 font-normal"> / {prop.period}</span> : ''}
                            </div>
                          </div>

                          {/* Chips des points attribués (+30, +20, +25, +15, +10) */}
                          <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                            {match.breakdown.locationScore > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                                📍 Loc +{match.breakdown.locationScore}
                              </span>
                            )}
                            {match.breakdown.typeScore > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                🏠 Type +{match.breakdown.typeScore}
                              </span>
                            )}
                            {match.breakdown.budgetScore > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                                💰 Budget +{match.breakdown.budgetScore}
                              </span>
                            )}
                            {match.breakdown.bedroomsScore > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                🛏️ {prop.bedrooms} ch.
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bouton de contact pour ce bien */}
                        <div className="pt-2 border-t border-slate-100">
                          <a
                            href={`https://wa.me/${conciergeWhatsAppNumber}?text=${encodeURIComponent(
                              `Bonjour Conciergerie Kinimmo, suite à ma demande n° ${submittedData.reference}, je souhaite visiter ce bien suggéré par votre système (${match.score}% de correspondance) :\n\n🏡 *${prop.title}*\n📍 ${prop.commune}\n💵 ${prop.price} ${prop.currency}`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Demander une visite pour ce bien</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 3. FORMULAIRE DE DEMANDE COMPLET (Design Clair Kinimmo) */}
      {!submittedData && (
        <div ref={formRef} className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8 relative">
            
            {/* En-tête formulaire */}
            <div className="border-b border-slate-200 pb-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                  <Compass className="w-4 h-4" />
                  <span>Formulaire Officiel de Demande de Recherche</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadSamplePreview}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Pré-remplir automatiquement tous les champs avec un exemple de demande concrète"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Charger un exemple (Aperçu direct)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowProcessPreviewModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer border border-slate-200"
                    title="Découvrir les étapes de l'accompagnement"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Aperçu de la démarche</span>
                  </button>
                </div>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                Définissez votre bien idéal
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Complétez les critères ci-dessous. Toutes les données sont rigoureusement validées pour vous garantir un accompagnement réactif et sur-mesure.
              </p>

              {isPreviewModeActive && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>Aperçu actif :</strong> Tous les champs ont été pré-remplis avec un exemple réaliste (Achat Villa 4 chambres à Ngaliema Macampagne).</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer ml-2 shrink-0"
                  >
                    Effacer l'exemple
                  </button>
                </div>
              )}
            </div>

            {/* Alerte d'erreur globale serveur */}
            {serverError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Erreur de validation :</span>
                  <span>{serverError}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* SECTION 1 : PROJET */}
              <div id="field-projet" className="space-y-3">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center justify-between">
                  <span>1. Quel est votre projet ? <span className="text-emerald-600">*</span></span>
                  {errors.projet && <span className="text-rose-600 text-[11px] font-normal">{errors.projet}</span>}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {CONCIERGERIE_PROJETS.map((item) => {
                    const isSelected = projet === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setProjet(item)}
                        className={`p-3 rounded-2xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2 : TYPE DE BIEN */}
              <div id="field-typeBien" className="space-y-3">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center justify-between">
                  <span>2. Type de bien recherché <span className="text-emerald-600">*</span></span>
                  {errors.typeBien && <span className="text-rose-600 text-[11px] font-normal">{errors.typeBien}</span>}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {CONCIERGERIE_TYPES_BIEN.map((item) => {
                    const isSelected = typeBien === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setTypeBien(item)}
                        className={`p-3 rounded-2xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3 : LOCALISATION */}
              <div id="field-commune" className="space-y-3">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center justify-between">
                  <span>3. Localisation à Kinshasa <span className="text-emerald-600">*</span></span>
                  {errors['localisation.commune'] && (
                    <span className="text-rose-600 text-[11px] font-normal">{errors['localisation.commune']}</span>
                  )}
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-500 font-semibold block">Commune prioritaire</span>
                    <div className="relative">
                      <select
                        value={commune}
                        onChange={(e) => setCommune(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white"
                      >
                        {KINSHASA_COMMUNES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-500 font-semibold block">Quartier ou Avenue (Optionnel)</span>
                    <input
                      type="text"
                      value={quartier}
                      onChange={(e) => setQuartier(e.target.value)}
                      placeholder="Ex: Macampagne, Golf, Socimat, Quartier Révolution..."
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white placeholder-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4 : BUDGET */}
              <div id="field-budget" className="space-y-3">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center justify-between">
                  <span>4. Budget & Devise <span className="text-emerald-600">*</span></span>
                  {errors['budget.max'] && (
                    <span className="text-rose-600 text-[11px] font-normal">{errors['budget.max']}</span>
                  )}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                  <div className="sm:col-span-5 space-y-1">
                    <span className="text-[11px] text-slate-500 block">Budget minimum (optionnel)</span>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={budgetMin}
                        onChange={(e) => setBudgetMin(e.target.value)}
                        placeholder="Ex: 50000"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-5 space-y-1">
                    <span className="text-[11px] text-slate-500 block">
                      Budget maximum <span className="text-emerald-600 font-bold">*</span>
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        required
                        value={budgetMax}
                        onChange={(e) => setBudgetMax(e.target.value)}
                        placeholder="Ex: 250000"
                        className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <span className="text-[11px] text-slate-500 block">Devise</span>
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 h-11 items-center">
                      <button
                        type="button"
                        onClick={() => setDevise('USD')}
                        className={`flex-1 h-full rounded-lg text-xs font-bold transition-all ${
                          devise === 'USD'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        USD
                      </button>
                      <button
                        type="button"
                        onClick={() => setDevise('CDF')}
                        className={`flex-1 h-full rounded-lg text-xs font-bold transition-all ${
                          devise === 'CDF'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        CDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5 : CARACTÉRISTIQUES */}
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider block">
                  5. Caractéristiques souhaitées
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Chambres</span>
                    </span>
                    <select
                      value={chambres}
                      onChange={(e) => setChambres(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white"
                    >
                      <option value="">Indifférent</option>
                      <option value="1">1 chambre</option>
                      <option value="2">2 chambres</option>
                      <option value="3">3 chambres</option>
                      <option value="4">4 chambres</option>
                      <option value="5">5+ chambres</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Salles de bain</span>
                    </span>
                    <select
                      value={sallesDeBain}
                      onChange={(e) => setSallesDeBain(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white"
                    >
                      <option value="">Indifférent</option>
                      <option value="1">1 salle de bain</option>
                      <option value="2">2 salles de bain</option>
                      <option value="3">3 salles de bain</option>
                      <option value="4">4+ salles de bain</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Parking</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 h-10">
                      <button
                        type="button"
                        onClick={() => setParking(true)}
                        className={`rounded-xl text-xs font-bold transition-all border ${
                          parking
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setParking(false)}
                        className={`rounded-xl text-xs font-bold transition-all border ${
                          !parking
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Non
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Armchair className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Meublé</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 h-10">
                      <button
                        type="button"
                        onClick={() => setMeuble(true)}
                        className={`rounded-xl text-xs font-bold transition-all border ${
                          meuble
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setMeuble(false)}
                        className={`rounded-xl text-xs font-bold transition-all border ${
                          !meuble
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Non
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 6 : SERVICES DEMANDÉS */}
              <div id="field-services" className="space-y-3">
                <label className="text-xs font-bold uppercase text-slate-700 tracking-wider flex items-center justify-between">
                  <span>6. Services demandés (Cases à cocher) <span className="text-emerald-600">*</span></span>
                  {errors.services && (
                    <span className="text-rose-600 text-[11px] font-normal">{errors.services}</span>
                  )}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CONCIERGERIE_SERVICES.map((s) => {
                    const isChecked = services.includes(s);
                    return (
                      <div
                        key={s}
                        onClick={() => handleToggleService(s)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-500 text-slate-900 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white'
                        }`}>
                          {isChecked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-transparent" />}
                        </div>
                        <span className="text-xs font-semibold leading-snug">{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 7 : INFORMATIONS DU CLIENT */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                    7. Vos coordonnées de contact
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ces informations restent strictement confidentielles et ne sont transmises qu'au conseiller en charge de votre dossier.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nom complet */}
                  <div id="field-nomComplet" className="space-y-1">
                    <label className="text-[11px] text-slate-600 font-semibold block">
                      Nom complet <span className="text-emerald-600 font-bold">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={nomComplet}
                      onChange={(e) => setNomComplet(e.target.value)}
                      placeholder="Ex: Kalu Mukendi"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                    {errors.nomComplet && <p className="text-rose-600 text-[10px]">{errors.nomComplet}</p>}
                  </div>

                  {/* Téléphone */}
                  <div id="field-telephone" className="space-y-1">
                    <label className="text-[11px] text-slate-600 font-semibold block">
                      Téléphone principal <span className="text-emerald-600 font-bold">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="Ex: +243 82 123 4567"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                    {errors.telephone && <p className="text-rose-600 text-[10px]">{errors.telephone}</p>}
                  </div>

                  {/* WhatsApp */}
                  <div id="field-whatsapp" className="space-y-1">
                    <label className="text-[11px] text-slate-600 font-semibold block">
                      Numéro WhatsApp (Optionnel)
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Ex: +243 82 123 4567"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                  </div>

                  {/* E-mail */}
                  <div id="field-email" className="space-y-1">
                    <label className="text-[11px] text-slate-600 font-semibold block">
                      Adresse e-mail <span className="text-emerald-600 font-bold">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: contact@exemple.cd"
                      className="w-full h-11 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                    />
                    {errors.email && <p className="text-rose-600 text-[10px]">{errors.email}</p>}
                  </div>
                </div>

                {/* Message supplémentaire */}
                <div id="field-message" className="space-y-1 pt-1">
                  <label className="text-[11px] text-slate-600 font-semibold block">
                    Message supplémentaire / Précisions particulières
                  </label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Décrivez vos exigences particulières (proximité écoles, vue sur le fleuve, groupe électrogène obligatoire, délai souhaité d'emménagement...)"
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white resize-none"
                  />
                  {errors.message && <p className="text-rose-600 text-[10px]">{errors.message}</p>}
                </div>
              </div>

              {/* BOUTON D'ENVOI */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Validation chiffrée • Confidentialité totale garantie par Kinimmo.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Vérification & Transmission...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Transmettre ma demande à Kinimmo</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>

        </div>
      )}

      {/* 4. MODALE INTERACTIVE D'APERÇU DU PROCESSUS CONCIERGERIE (Design Clair) */}
      {showProcessPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 space-y-6">
            
            {/* Header Modale */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                    Aperçu Détaillé du Service Kinimmo
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Comment fonctionne la Conciergerie ?
                </h3>
                <p className="text-xs text-slate-500">
                  Un accompagnement clé-en-main de la définition de vos critères jusqu'à la remise des clés.
                </p>
              </div>

              <button
                onClick={() => setShowProcessPreviewModal(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Étapes détaillées */}
            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase text-slate-900">
                    Prise en charge & Cadrage Express (sous 2 à 4h)
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Dès soumission de votre formulaire, votre demande de recherche est immédiatement prise en charge. Votre conseiller dédié vous contacte par téléphone ou WhatsApp pour affiner vos impératifs (communes, budget, standing, mode de paiement).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase text-slate-900">
                    Activation du Réseau Off-Market & Agences Partenaires (24-48h)
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Kinimmo mobilise en priorité les biens exclusifs non publiés sur internet, le réseau des agences agréées de Kinshasa et les propriétaires directs sans que vous n'ayez à passer des dizaines de coups de fil.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase text-slate-900">
                    Audit Foncier Cadastral & Titres de Propriété
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Avant même votre visite, la Conciergerie vérifie la validité des documents officiels (certificat d'enregistrement, extrait cadastral, procuration, absence de litiges au tribunal).
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase text-slate-900">
                    Planning de Visites Optimisé & Groupé
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Nous organisons votre parcours de visites aux créneaux qui vous conviennent, avec itinéraire sécurisé pour vous éviter les embouteillages de Kinshasa.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black">
                  5
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase text-slate-900">
                    Négociation Neutre & Signature Notariée
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    Nous négocions pour vous le prix le plus juste selon les référentiels du marché kinois et vous accompagnons lors de la signature du bail ou de l'acte notarié de vente.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions dans la modale */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowProcessPreviewModal(false);
                  handleLoadSamplePreview();
                }}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all border border-slate-200"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>Tester avec un exemple de demande</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowProcessPreviewModal(false);
                  handleScrollToForm();
                }}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm active:scale-95"
              >
                <span>Remplir ma propre demande</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
