import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bath,
  Bed,
  Building2,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Edit,
  Expand,
  FileDown,
  Heart,
  Home,
  Layers,
  Lock,
  Mail,
  MapPin,
  Maximize,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Play,
  Printer,
  QrCode,
  Scale,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Video,
  X,
  Zap,
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { Property, PropertyUserReport } from '../types';
import { useApp } from '../context/AppContext';
import {
  convertAndFormatPrice,
  formatAdminDateFR,
  getDualCurrencyDisplay,
} from '../utils/currency';
import { canUserManageProperty } from '../utils/propertyPermissions';
import { generatePropertyPDF, generateSignboardPosterPDF } from '../utils/pdfGenerator';
import { buildPropertyShareUrl, resolvePropertyBySlugOrId } from '../utils/shareUtils';
import { slugifyText } from '../data/contentSeed';
import { buildWhatsAppUrl, cleanPhoneNumberForTel, cleanPhoneNumberForWhatsApp, copyPhoneNumber } from '../utils/whatsapp';
import { ApproximatePropertyMap } from './ApproximatePropertyMap';
import { MortgageCalculator } from './MortgageCalculator';
import { PropertyVideoPlayer } from './PropertyVideoPlayer';
import { ScheduleVisitModal } from './ScheduleVisitModal';
import { TrustBadge } from './Trust/TrustBadge';
import { TrustAvailabilityBadge } from './Trust/TrustAvailabilityBadge';
import { TrustVerificationModal } from './Trust/TrustVerificationModal';

interface PropertyDetailPageProps {
  propertyIdOrSlug: string;
  onBackHome: () => void;
  onOpenShareModal: (propertyId: string) => void;
  onOpenNeighborhood?: (slug: string) => void;
}

const REPORT_REASONS: Array<{
  reason: PropertyUserReport['reason'];
  label: string;
  description: string;
}> = [
  {
    reason: 'fake_price',
    label: 'Prix anormalement bas ou trompeur',
    description: 'Tarif incohérent avec le marché du secteur',
  },
  {
    reason: 'scam_advance_payment',
    label: 'Demande d’acompte avant visite',
    description: 'Sollicitation d’argent avant toute rencontre sur place',
  },
  {
    reason: 'stolen_photos',
    label: 'Photos volées ou non conformes',
    description: 'Images reprises d’un autre bien ou fictives',
  },
  {
    reason: 'unreachable_seller',
    label: 'Numéro faux ou injoignable',
    description: 'Le contact affiché ne répond pas ou est invalide',
  },
  {
    reason: 'already_sold',
    label: 'Bien déjà vendu ou loué',
    description: 'L’annonce n’est plus disponible',
  },
  {
    reason: 'other',
    label: 'Autre motif ou abus',
    description: 'Contenu inapproprié ou information erronée',
  },
];

function formatTenureLabel(dateStr?: string | null): string {
  if (!dateStr) return 'Ancienneté vérifiée (2+ ans)';
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return `Membre depuis ${dateStr}`;
  const months = Math.max(
    1,
    Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 30.4))
  );
  const year = parsed.getFullYear();
  if (months < 12) {
    return `Membre depuis ${months} mois (${year})`;
  }
  const years = Math.floor(months / 12);
  return `Membre depuis ${year} (${years} an${years > 1 ? 's' : ''})`;
}

function getAvailabilityLabel(property: Property): { label: string; toneClass: string } {
  if (property.status === 'sold' || property.listingStatus === 'SOLD' || property.availability_status === 'sold') {
    return { label: 'Vendu', toneClass: 'text-rose-700' };
  }
  if (property.listingStatus === 'RENTED' || property.availability_status === 'rented') {
    return { label: 'Loué', toneClass: 'text-sky-700' };
  }
  if (property.availability_status === 'under_option') {
    return { label: 'Sous option', toneClass: 'text-amber-700' };
  }
  if (property.availability_status === 'reserved') {
    return { label: 'Réservé', toneClass: 'text-amber-700' };
  }
  if (property.availability_status === 'withdrawn' || property.listingStatus === 'ARCHIVED') {
    return { label: 'Retiré', toneClass: 'text-slate-600' };
  }
  return { label: 'Disponible immédiatement', toneClass: 'text-emerald-700' };
}

export const PropertyDetailPage: React.FC<PropertyDetailPageProps> = ({
  propertyIdOrSlug,
  onBackHome,
  onOpenShareModal,
  onOpenNeighborhood,
}) => {
  const {
    properties,
    customFields,
    currency,
    setCurrency,
    cdfExchangeRate,
    cdfExchangeRateUpdatedAt,
    agents,
    agencies,
    allUsers,
    wishlist,
    toggleWishlist,
    compareList,
    toggleCompare,
    addLeadRequest,
    recordPropertyAction,
    user,
    updateProperty,
    deleteProperty,
    setEditingProperty,
    setIsSubmitPropertyOpen,
    setActivePropertyModalId,
    requestConfirm,
    addPropertyReport,
  } = useApp();

  const property = useMemo(() => {
    return resolvePropertyBySlugOrId(propertyIdOrSlug, properties);
  }, [properties, propertyIdOrSlug]);

  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video' | 'virtual360' | 'calculator'>('photos');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFullscreenGallery, setIsFullscreenGallery] = useState(false);
  const [activeVirtualRoom, setActiveVirtualRoom] = useState(0);

  const [isScheduleVisitOpen, setIsScheduleVisitOpen] = useState(false);
  const [isOverflowMenuOpen, setIsOverflowMenuOpen] = useState(false);
  const [isQuickReportOpen, setIsQuickReportOpen] = useState(false);
  const [reportSubmittedReason, setReportSubmittedReason] = useState<string | null>(null);
  const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Formulaire de message direct dans la colonne droite (desktop)
  const [leadName, setLeadName] = useState(user?.name || '');
  const [leadEmail, setLeadEmail] = useState(user?.email || '');
  const [leadPhone, setLeadPhone] = useState(user?.phone || '');
  const [leadMessage, setLeadMessage] = useState(
    'Bonjour, je souhaite obtenir plus d’informations ou planifier une visite pour ce bien.'
  );
  const [isLeadSent, setIsLeadSent] = useState(false);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  useEffect(() => {
    setSelectedImageIndex(0);
    setActiveMediaTab('photos');
    setIsFullscreenGallery(false);
    setIsOverflowMenuOpen(false);
    setIsQuickReportOpen(false);
    setReportSubmittedReason(null);
  }, [property?.id]);

  // Navigation clavier dans la galerie plein écran
  useEffect(() => {
    if (!isFullscreenGallery || !property) return;
    const imgs = Array.isArray(property.images) ? property.images : [];
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreenGallery(false);
      } else if (e.key === 'ArrowRight' && imgs.length > 1) {
        setSelectedImageIndex((prev) => (prev + 1) % imgs.length);
      } else if (e.key === 'ArrowLeft' && imgs.length > 1) {
        setSelectedImageIndex((prev) => (prev - 1 + imgs.length) % imgs.length);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isFullscreenGallery, property]);

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="sticky top-0 z-30 h-11 sm:h-14 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackHome}
            className="min-h-[40px] px-2.5 flex items-center gap-1.5 text-sm font-bold text-slate-800 hover:text-emerald-700 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <span className="text-xs font-black tracking-wide uppercase text-emerald-700">Kinimmo</span>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-900">Annonce en cours de chargement</h1>
            <p className="text-sm text-slate-500">
              Si cette annonce vient d’être retirée ou modifiée, vous pouvez revenir au catalogue complet.
            </p>
            <button
              type="button"
              onClick={onBackHome}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer"
            >
              Retourner aux annonces Kinshasa
            </button>
          </div>
        </div>
      </div>
    );
  }

  const images =
    Array.isArray(property.images) && property.images.length > 0
      ? property.images
      : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80'];

  const isFavorite = wishlist.includes(property.id);
  const isCompared = compareList.includes(property.id);
  const isSold = property.status === 'sold' || property.listingStatus === 'SOLD';

  // Calcul prix principal + conversion approximative datée (USD <-> CDF)
  const effectiveDisplayCurrency = currency === 'CDF' ? 'CDF' : 'USD';
  const dualPrice = getDualCurrencyDisplay(
    property.price,
    property.currency || 'USD',
    effectiveDisplayCurrency,
    cdfExchangeRate
  );
  const periodSuffix = property.period === 'month' ? ' / mois' : property.period === 'year' ? ' / an' : '';

  // Résolution Agent, Agence & Utilisateur pour le bloc Annonceur
  const agent = agents.find(
    (a) =>
      a.id === property.agentId ||
      a.name === property.agentId ||
      (property.contactEmail && a.email === property.contactEmail)
  );
  const agency =
    (property.agencyId
      ? agencies?.find(
          (ag) =>
            ag.id === property.agencyId ||
            ag.name === property.agencyName ||
            (property.agencyId === 'agency_1' && ag.id === 'agency_congo_luxury') ||
            (property.agencyId === 'agency_2' && ag.id === 'agency_fleuve_habitat')
        )
      : null) ||
    (agent?.agencyId ? agencies?.find((ag) => ag.id === agent.agencyId || ag.name === agent.agencyName) : null) ||
    (property.agencyName
      ? agencies?.find((ag) => ag.name?.toLowerCase().trim() === property.agencyName?.toLowerCase().trim())
      : null);

  const matchedUser = allUsers?.find(
    (u) =>
      u.id === property.userId ||
      u.id === property.agentId ||
      u.agentId === property.agentId ||
      (property.contactEmail && u.email?.toLowerCase() === property.contactEmail.toLowerCase())
  );

  const advertiserName =
    agent?.name ||
    matchedUser?.name ||
    agency?.managerName ||
    agency?.name ||
    property.agencyName ||
    'Conseiller Kinimmo';

  const advertiserPhoto =
    agent?.avatar ||
    matchedUser?.avatar ||
    agency?.logo ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80';

  const advertiserPhone =
    agent?.phone || agency?.phone || matchedUser?.phone || property.contactPhone || '+243 81 000 0001';
  const advertiserWhatsapp =
    agent?.whatsapp || agent?.phone || agency?.whatsapp || agency?.phone || property.contactPhone || '+243 81 000 0001';
  const advertiserEmail =
    agent?.email || agency?.email || matchedUser?.email || property.contactEmail || 'contact@kinimmo.com';

  // Niveau de vérification
  const verificationLevel = (() => {
    if (property.trust_status === 'property_verified') {
      return { label: 'Bien & Annonceur Certifiés (Kinimmo Trust)', verified: true };
    }
    if (agent?.isVerified || agent?.verificationStatus === 'verified' || matchedUser?.isVerified) {
      return { label: 'Identité & Licence Vérifiées', verified: true };
    }
    if (agency?.isVerified || agency?.verificationStatus === 'verified') {
      return { label: 'Agence Agréée Vérifiée', verified: true };
    }
    return { label: 'Annonceur Enregistré', verified: false };
  })();

  // Ancienneté réelle
  const advertiserTenure = formatTenureLabel(
    matchedUser?.createdAt || agency?.createdAt || agent?.verifiedAt || property.createdAt
  );

  // Nombre d'annonces publiées par cet annonceur
  const advertiserListingsCount = useMemo(() => {
    const count = properties.filter(
      (p) =>
        p.published !== false &&
        ((property.agentId && p.agentId === property.agentId) ||
          (property.agencyId && p.agencyId === property.agencyId) ||
          (property.userId && p.userId === property.userId))
    ).length;
    return Math.max(count, agent?.listingsCount || 0, 1);
  }, [properties, property.agentId, property.agencyId, property.userId, agent?.listingsCount]);

  const availabilityInfo = getAvailabilityLabel(property);

  // Règle stricte Modifier / Supprimer : Propriétaire, son Agence, ou Admin uniquement
  const canManageProperty = canUserManageProperty(user, property, agents);

  // WhatsApp URL
  const waMessage = `Bonjour ${advertiserName}, je vous contacte depuis Kinimmo au sujet de "${property.title}" (${dualPrice.primaryFormatted}) à ${property.commune || property.city || 'Kinshasa'} — ${buildPropertyShareUrl(property)}`;
  const waUrl = buildWhatsAppUrl(advertiserWhatsapp, waMessage);

  const handleOpenWhatsApp = () => {
    recordPropertyAction(property.id, 'whatsapp');
    if (typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      try {
        const appScheme = `whatsapp://send?phone=${cleanPhoneNumberForWhatsApp(advertiserWhatsapp)}&text=${encodeURIComponent(waMessage)}`;
        const temp = document.createElement('a');
        temp.href = appScheme;
        temp.style.display = 'none';
        document.body.appendChild(temp);
        temp.click();
        setTimeout(() => {
          try {
            document.body.removeChild(temp);
          } catch {}
        }, 300);
      } catch {}
    }
  };

  const handleCall = () => {
    recordPropertyAction(property.id, 'call');
    copyPhoneNumber(advertiserPhone);
    showToast(`Numéro ${advertiserPhone} copié • Appel en cours`);
  };

  const handleDownloadOrPrintPDF = async (mode: 'download' | 'print') => {
    setIsGeneratingPdf(true);
    setIsOverflowMenuOpen(false);
    recordPropertyAction(property.id, 'share');
    try {
      await generatePropertyPDF({
        property,
        customFieldDefs: customFields,
        agent,
        agency,
        currencyCode: effectiveDisplayCurrency,
        cdfExchangeRate,
        cdfExchangeRateUpdatedAt,
        mode,
      });
      showToast(
        mode === 'print'
          ? 'Fiche PDF préparée pour impression avec QR code.'
          : 'Fiche PDF téléchargée avec QR code Kinimmo.'
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const shareCanonicalUrl = buildPropertyShareUrl(property);
  const whatsappShareText = `🏡 ${property.title} (${dualPrice.primaryFormatted}) à ${property.commune || property.city || 'Kinshasa'} — ${shareCanonicalUrl}`;
  const whatsappShareLink = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappShareText)}`;
  const facebookShareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareCanonicalUrl)}`;

  const handleCopyShareUrl = () => {
    try {
      navigator.clipboard.writeText(shareCanonicalUrl);
      recordPropertyAction(property.id, 'share');
      setCopiedShareLink(true);
      showToast('Lien de l’annonce copié dans le presse-papiers.');
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      onOpenShareModal(property.id);
    }
  };

  const handleDownloadSignboardPoster = async () => {
    setIsGeneratingPdf(true);
    recordPropertyAction(property.id, 'share');
    try {
      await generateSignboardPosterPDF(property, shareCanonicalUrl, advertiserWhatsapp || advertiserPhone, 'download');
      showToast('Affiche panneau QR « À vendre / À louer » téléchargée en PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleTwoTapReport = async (item: (typeof REPORT_REASONS)[number]) => {
    await addPropertyReport({
      propertyId: property.id,
      propertyTitle: property.title,
      agentId: property.agentId,
      reporterName: user?.name || undefined,
      reporterContact: user?.phone || user?.email || undefined,
      reason: item.reason,
      reasonLabel: item.label,
    });
    setReportSubmittedReason(item.label);
    showToast('Signalement envoyé — Notre équipe examine cette annonce.');
    setTimeout(() => {
      setIsQuickReportOpen(false);
      setIsOverflowMenuOpen(false);
    }, 1600);
  };

  const handleSendLead = (e: React.FormEvent) => {
    e.preventDefault();
    addLeadRequest({
      propertyId: property.id,
      propertyTitle: property.title,
      agentId: property.agentId,
      userName: leadName || 'Visiteur Kinimmo',
      userEmail: leadEmail || 'contact@kinimmo.com',
      userPhone: leadPhone || '+243 81 000 0000',
      message: leadMessage,
      requestType: 'info',
    });
    recordPropertyAction(property.id, 'lead');
    setIsLeadSent(true);
    setTimeout(() => setIsLeadSent(false), 4000);
  };

  // Annonces similaires (priorité commune, type, statut, écart de prix)
  const similarProperties = useMemo(() => {
    return properties
      .filter((p) => p.id !== property.id && p.published !== false && p.listingStatus !== 'ARCHIVED')
      .map((p) => {
        let score = 0;
        if (p.commune && property.commune && p.commune.toLowerCase() === property.commune.toLowerCase()) score += 4;
        if (p.type === property.type) score += 3;
        if (p.status === property.status) score += 2;
        const priceDiff = Math.abs((p.price || 0) - (property.price || 0));
        if (property.price > 0 && priceDiff / property.price <= 0.35) score += 2;
        return { prop: p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map((item) => item.prop);
  }, [properties, property]);

  const publicCustomFields = customFields.filter(
    (f) => !f.isPrivate && property.customFields?.[f.key] !== undefined && property.customFields?.[f.key] !== ''
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 sm:pb-28">
      {/* EN-TÊTE COMPACT DÉDIÉ SUR MOBILE (h-11 = 44px <= 7% ; + barre basse 52px = 96px <= 14.5% sur mobile) */}
      <header className="sticky top-0 z-30 h-11 sm:h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBackHome}
            className="min-w-[40px] min-h-[40px] px-2 -ml-1 rounded-xl hover:bg-slate-100 text-slate-800 flex items-center gap-1.5 text-xs sm:text-sm font-bold shrink-0 cursor-pointer"
            title="Retour aux annonces"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">
            {property.commune || property.city || 'Kinshasa'} — {property.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setCurrency(effectiveDisplayCurrency === 'USD' ? 'CDF' : 'USD')}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-bold text-slate-800 cursor-pointer"
            title="Basculer l'affichage USD / CDF"
          >
            {effectiveDisplayCurrency === 'USD' ? 'USD → CDF' : 'CDF → USD'}
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="hidden sm:inline-flex h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Catalogue</span>
          </button>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">
        {/* Bandeau d'alerte si vendu */}
        {isSold && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex flex-wrap items-center justify-between gap-3 text-rose-900">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">Ce bien immobilier a été déclaré VENDU</p>
                <p className="text-xs text-rose-700">
                  Contactez l’annonceur pour découvrir des opportunités similaires dans ce secteur.
                </p>
              </div>
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-rose-700">Vendu</span>
          </div>
        )}

        {/* SECTION MÉDIAS & GALERIE PLEIN ÉCRAN */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 gap-2 overflow-x-auto">
            <div className="flex items-center text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setActiveMediaTab('photos')}
                className={`py-2.5 px-3.5 font-bold border-b-2 whitespace-nowrap cursor-pointer ${
                  activeMediaTab === 'photos'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Photos ({images.length})
              </button>

              {property.videoUrl && (
                <button
                  type="button"
                  onClick={() => setActiveMediaTab('video')}
                  className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeMediaTab === 'video'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Vidéo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveMediaTab('virtual360')}
                className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeMediaTab === 'virtual360'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>Visite 360°</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMediaTab('calculator')}
                className={`py-2.5 px-3.5 font-bold border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeMediaTab === 'calculator'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simulation</span>
              </button>
            </div>

            {activeMediaTab === 'photos' && (
              <button
                type="button"
                onClick={() => setIsFullscreenGallery(true)}
                className="shrink-0 py-1.5 px-3 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Expand className="w-3.5 h-3.5" />
                <span>Plein écran</span>
              </button>
            )}
          </div>

          {activeMediaTab === 'photos' && (
            <div className="space-y-2.5">
              <div className="relative aspect-[16/10] sm:aspect-[21/10] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 group">
                <img
                  src={images[selectedImageIndex] || images[0]}
                  alt={`${property.title} — photo ${selectedImageIndex + 1}`}
                  onClick={() => setIsFullscreenGallery(true)}
                  className="w-full h-full object-cover cursor-zoom-in transition-transform duration-500 group-hover:scale-[1.01]"
                />

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/75 hover:bg-slate-950 text-white flex items-center justify-center border border-white/15 cursor-pointer"
                      aria-label="Photo précédente"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImageIndex((prev) => (prev + 1) % images.length);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950/75 hover:bg-slate-950 text-white flex items-center justify-center border border-white/15 cursor-pointer"
                      aria-label="Photo suivante"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950/80 text-white text-xs font-semibold tabular-nums">
                    {selectedImageIndex + 1} / {images.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsFullscreenGallery(true)}
                    className="px-3 py-1 rounded-lg bg-white/95 hover:bg-white text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Expand className="w-3.5 h-3.5" />
                    <span>Agrandir</span>
                  </button>
                </div>
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                        selectedImageIndex === idx
                          ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Miniature ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeMediaTab === 'video' && property.videoUrl && (
            <PropertyVideoPlayer
              videoUrl={property.videoUrl}
              title={`Visite vidéo : ${property.title}`}
              posterImage={images[0]}
              autoPlay={true}
            />
          )}

          {activeMediaTab === 'virtual360' && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                {['Séjour principal', 'Suite parentale', 'Cuisine', 'Extérieur'].map((room, idx) => (
                  <button
                    key={room}
                    type="button"
                    onClick={() => setActiveVirtualRoom(idx)}
                    className={`px-3 py-1.5 rounded-lg font-bold border whitespace-nowrap cursor-pointer ${
                      activeVirtualRoom === idx
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {room}
                  </button>
                ))}
              </div>
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200">
                <img
                  src={images[activeVirtualRoom % images.length]}
                  alt="Aperçu 360"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 right-3">
                  <button
                    type="button"
                    onClick={() => setIsScheduleVisitOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Visiter ce bien sur place</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeMediaTab === 'calculator' && <MortgageCalculator initialPrice={property.price} />}
        </section>

        {/* GRILLE PRINCIPALE : 2 COLONNES CONTENU + 1 COLONNE ANNONCEUR / CONTACT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {/* COLONNE GAUCHE (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* TITRE, PRIX + CONVERSION APPROXIMATIVE DATÉE, DATE DE MAJ */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <div className="flex items-center gap-2 font-semibold uppercase tracking-wide text-emerald-700">
                  <span>
                    {property.status === 'for-sale'
                      ? 'À vendre'
                      : property.status === 'for-rent'
                      ? 'À louer'
                      : property.status}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-600">{property.category || property.type}</span>
                </div>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Dernière mise à jour :{' '}
                    <strong className="text-slate-700">
                      {formatAdminDateFR(property.updatedAt || property.createdAt)}
                    </strong>
                  </span>
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {property.title}
              </h1>

              {/* Bloc Prix Principal + Conversion Approximative Admin Datée */}
              <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-700 tabular-nums tracking-tight">
                      {dualPrice.primaryFormatted}
                    </span>
                    {periodSuffix && (
                      <span className="text-sm font-semibold text-slate-500">{periodSuffix}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-slate-700 tabular-nums">
                    Conversion approximative :{' '}
                    <span className="text-slate-900 font-bold">
                      ≈ {dualPrice.secondaryFormatted}
                      {periodSuffix}
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Taux indicatif admin : 1 USD = {dualPrice.effectiveRate.toLocaleString('fr-FR')} FC • Mis à jour le{' '}
                    {formatAdminDateFR(cdfExchangeRateUpdatedAt)}
                  </p>
                </div>

                {/* Boutons d'administration strictement réservés : Propriétaire, Son Agence, Admin */}
                {canManageProperty && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProperty(property);
                        setIsSubmitPropertyOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        requestConfirm({
                          title: "Suppression de l'annonce",
                          message: `Voulez-vous vraiment supprimer définitivement « ${property.title} » ?`,
                          confirmText: 'Oui, supprimer',
                          onConfirm: () => {
                            deleteProperty(property.id);
                            onBackHome();
                          },
                        });
                      }}
                      className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Barre de partage P1 & QR Panneau P2 */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={whatsappShareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordPropertyAction(property.id, 'share')}
                    className="h-9 px-3.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Partager WhatsApp</span>
                  </a>

                  <a
                    href={facebookShareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => recordPropertyAction(property.id, 'share')}
                    className="h-9 px-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Facebook</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    {copiedShareLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedShareLink ? 'Lien copié' : 'Copier le lien'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isGeneratingPdf}
                    onClick={handleDownloadSignboardPoster}
                    className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 cursor-pointer"
                    title="Télécharger l'affiche panneau À vendre / À louer avec QR code"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Affiche Panneau QR</span>
                  </button>
                </div>

                {onOpenNeighborhood && (property.commune || property.quartier) && (
                  <button
                    type="button"
                    onClick={() => onOpenNeighborhood(slugifyText(property.commune || property.quartier || 'gombe'))}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Explorer {property.commune || property.quartier} →
                  </button>
                )}
              </div>

              {/* Caractéristiques principales sans surcharge visuelle */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Bed className="w-3.5 h-3.5 text-emerald-600" />
                    Chambres
                  </span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">
                    {property.bedrooms ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Bath className="w-3.5 h-3.5 text-emerald-600" />
                    Salles de bain
                  </span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">
                    {property.bathrooms ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Maximize className="w-3.5 h-3.5 text-emerald-600" />
                    Surface
                  </span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">
                    {property.area ? `${property.area} m²` : 'N/C'}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-emerald-600" />
                    Stationnement
                  </span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums mt-0.5 block">
                    {property.garages ? `${property.garages} place(s)` : 'Disponible'}
                  </span>
                </div>
              </div>
            </section>

            {/* DESCRIPTION & CARACTÉRISTIQUES DÉTAILLÉES */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-2">Description du bien</h2>
                <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                  {property.description}
                </p>
              </div>

              {publicCustomFields.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-emerald-600" />
                    <span>Caractéristiques complémentaires</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                    {publicCustomFields.map((field) => {
                      const val = property.customFields?.[field.key];
                      const label =
                        (typeof field.label === 'string'
                          ? field.label
                          : field.label?.fr || field.label?.en) || field.key;
                      return (
                        <div
                          key={field.id || field.key}
                          className="flex items-center justify-between py-2 border-b border-slate-100 gap-3"
                        >
                          <span className="text-slate-500 text-xs">{label}</span>
                          <span className="font-semibold text-slate-900 text-xs text-right">
                            {val} {field.unit || ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {Array.isArray(property.amenities) && property.amenities.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Équipements & prestations</h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-700">
                    {property.amenities.map((amenity) => (
                      <li key={amenity} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{amenity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Champs privés réservés strictement aux gestionnaires autorisés */}
              {canManageProperty && property.privateFields && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Informations internes (propriétaire / agence / admin)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-800">
                    <div>
                      <span className="text-slate-500 block">Propriétaire</span>
                      <strong>{property.privateFields.ownerName || 'N/C'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Téléphone</span>
                      <strong>{property.privateFields.ownerPhone || 'N/C'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Commission</span>
                      <strong>{property.privateFields.commissionRate || 4}%</strong>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* CARTE INTERACTIVE APPROXIMATIVE + POINT DE REPÈRE */}
            <ApproximatePropertyMap property={property} />

            {/* BLOC CONFIANCE KINIMMO TRUST (si certifié ou si gestionnaire autorisé) */}
            <section className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Kinimmo Trust
                  </span>
                  <TrustBadge
                    status={property.trust_status}
                    level={property.trust_level}
                    score={property.trust_score}
                    verifiedAt={property.trust_verified_at}
                    expiresAt={property.trust_expires_at}
                    targetType="property"
                    targetTitle={property.title}
                    size="sm"
                    showUnverified={true}
                  />
                </div>
                <p className="text-xs text-slate-300">
                  {property.trust_status === 'property_verified'
                    ? 'Bien vérifié : titre foncier et mandat contrôlés sur le terrain.'
                    : 'Contrôle documentaire et suivi de disponibilité assurés par Kinimmo.'}
                </p>
              </div>

              {property.trust_status !== 'property_verified' && canManageProperty && (
                <button
                  type="button"
                  onClick={() => setIsTrustModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shrink-0 cursor-pointer"
                >
                  Demander la certification
                </button>
              )}
            </section>
          </div>

          {/* COLONNE DROITE (1/3) : BLOC ANNONCEUR + MESSAGE DIRECT */}
          <aside className="space-y-5 lg:sticky lg:top-20">
            {/* BLOC ANNONCEUR COMPLET */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Annonceur</h2>
                <span className={`text-xs font-bold ${availabilityInfo.toneClass}`}>
                  {availabilityInfo.label}
                </span>
              </div>

              {/* Photo, Nom, Agence */}
              <div className="flex items-center gap-3.5">
                <img
                  src={advertiserPhoto}
                  alt={advertiserName}
                  className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 truncate">{advertiserName}</h3>
                  {(agency?.name || agent?.agencyName || property.agencyName) && (
                    <p className="text-xs text-slate-600 truncate">
                      {agency?.name || agent?.agencyName || property.agencyName}
                    </p>
                  )}
                  <p
                    className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
                      verificationLevel.verified ? 'text-emerald-700' : 'text-slate-600'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{verificationLevel.label}</span>
                  </p>
                </div>
              </div>

              {/* Métriques annonceur : Ancienneté, Nombre d'annonces, Disponibilité */}
              <dl className="grid grid-cols-1 gap-2.5 text-xs pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Ancienneté</dt>
                  <dd className="font-semibold text-slate-900 text-right">{advertiserTenure}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Annonces publiées</dt>
                  <dd className="font-semibold text-slate-900 tabular-nums">
                    {advertiserListingsCount} bien{advertiserListingsCount > 1 ? 's' : ''}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">Disponibilité</dt>
                  <dd>
                    <TrustAvailabilityBadge
                      propertyId={property.id}
                      propertyTitle={property.title}
                      status={property.availability_status}
                      confirmedAt={property.availability_confirmed_at}
                      canConfirm={canManageProperty}
                    />
                  </dd>
                </div>
              </dl>

              {/* Actions rapides Fiche PDF / Imprimer / Signaler sur desktop */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => handleDownloadOrPrintPDF('download')}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Fiche PDF + QR</span>
                </button>
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => handleDownloadOrPrintPDF('print')}
                  className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  title="Imprimer la fiche avec QR code"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-700" />
                  <span>Imprimer</span>
                </button>
              </div>
            </section>

            {/* FORMULAIRE D'ENVOI MESSAGE DIRECT */}
            <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3.5 text-xs">
              <h3 className="font-bold text-slate-900 text-sm">Contacter l’annonceur par écrit</h3>
              {isLeadSent ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-center">
                  Message transmis directement à {advertiserName}.
                </div>
              ) : (
                <form onSubmit={handleSendLead} className="space-y-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Votre nom complet"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Votre téléphone / WhatsApp"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Votre adresse email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <textarea
                    rows={3}
                    value={leadMessage}
                    onChange={(e) => setLeadMessage(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer le message</span>
                  </button>
                </form>
              )}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{advertiserEmail}</span>
                </span>
                <span className="font-semibold text-slate-700 shrink-0">{advertiserPhone}</span>
              </div>
            </section>
          </aside>
        </div>

        {/* ANNONCES SIMILAIRES */}
        {similarProperties.length > 0 && (
          <section className="pt-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Annonces similaires</h2>
              <button
                type="button"
                onClick={onBackHome}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                Voir tout le catalogue →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similarProperties.map((sim) => {
                const simImg =
                  (Array.isArray(sim.images) && sim.images[0]) ||
                  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop&q=80';
                const simPrice = convertAndFormatPrice(
                  sim.price,
                  effectiveDisplayCurrency,
                  cdfExchangeRate,
                  sim.currency || 'USD'
                );
                return (
                  <article
                    key={sim.id}
                    onClick={() => setActivePropertyModalId(sim.id)}
                    className="bg-white border border-slate-200 hover:border-emerald-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all hover:shadow-md flex flex-col"
                  >
                    <div className="aspect-[16/10] bg-slate-100 overflow-hidden">
                      <img
                        src={simImg}
                        alt={sim.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {sim.commune || sim.city}
                        </p>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-2 mt-0.5">
                          {sim.title}
                        </h3>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-extrabold text-emerald-700 tabular-nums">
                          {simPrice}
                          {sim.period === 'month' ? '/mois' : ''}
                        </span>
                        <span className="text-slate-500 tabular-nums">
                          {sim.bedrooms ? `${sim.bedrooms} ch` : `${sim.area || '-'} m²`}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* BARRE D'ACTIONS FIXE EN BAS : STRICTEMENT 3 BOUTONS + MENU "..." */}
      <div className="fixed bottom-0 left-0 right-0 z-40 h-[52px] sm:h-16 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 sm:px-6 shadow-lg">
        <div className="max-w-4xl mx-auto h-full flex items-center gap-1.5 sm:gap-3">
          {/* 1. WhatsApp */}
          <a
            href={waUrl}
            target="_top"
            onClick={handleOpenWhatsApp}
            className="flex-1 h-10 sm:h-11 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 px-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>WhatsApp</span>
          </a>

          {/* 2. Appeler */}
          <a
            href={`tel:${cleanPhoneNumberForTel(advertiserPhone)}`}
            target="_top"
            onClick={handleCall}
            className="flex-1 h-10 sm:h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 px-2 cursor-pointer"
          >
            <Phone className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Appeler</span>
          </a>

          {/* 3. Demander une visite */}
          <button
            type="button"
            onClick={() => setIsScheduleVisitOpen(true)}
            className="flex-[1.35] h-10 sm:h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 px-2.5 cursor-pointer"
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="truncate">Demander une visite</span>
          </button>

          {/* Menu « … » */}
          <button
            type="button"
            onClick={() => {
              setIsOverflowMenuOpen((prev) => !prev);
              setIsQuickReportOpen(false);
            }}
            aria-label="Plus d'actions"
            className="w-11 h-10 sm:w-12 sm:h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MENU CONTEXTUEL « … » (Favori, Partager, Comparer, Signaler 2 appuis, Télécharger la fiche) */}
      {isOverflowMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsOverflowMenuOpen(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {isQuickReportOpen ? 'Signaler cette annonce (1 appui pour envoyer)' : 'Autres actions'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsOverflowMenuOpen(false);
                  setIsQuickReportOpen(false);
                }}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isQuickReportOpen ? (
              <div className="divide-y divide-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    toggleWishlist(property.id);
                    showToast(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
                    setIsOverflowMenuOpen(false);
                  }}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[48px]"
                >
                  <span className="flex items-center gap-3">
                    <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}`} />
                    <span>{isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}</span>
                  </span>
                  {isFavorite && <Check className="w-4 h-4 text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOverflowMenuOpen(false);
                    onOpenShareModal(property.id);
                  }}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[48px]"
                >
                  <span className="flex items-center gap-3">
                    <Share2 className="w-4.5 h-4.5 text-sky-600" />
                    <span>Partager l’annonce</span>
                  </span>
                  <span className="text-xs text-slate-400">Lien & Réseaux</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleCompare(property.id);
                    showToast(isCompared ? 'Retiré du comparateur' : 'Ajouté au comparateur');
                    setIsOverflowMenuOpen(false);
                  }}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[48px]"
                >
                  <span className="flex items-center gap-3">
                    <Scale className={`w-4.5 h-4.5 ${isCompared ? 'text-amber-600' : 'text-slate-600'}`} />
                    <span>{isCompared ? 'Retirer du comparateur' : 'Comparer ce bien'}</span>
                  </span>
                  {isCompared && <Check className="w-4 h-4 text-emerald-600" />}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadOrPrintPDF('download')}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[48px]"
                >
                  <span className="flex items-center gap-3">
                    <FileDown className="w-4.5 h-4.5 text-emerald-600" />
                    <span>Télécharger la fiche (PDF + QR code)</span>
                  </span>
                  <span className="text-xs text-slate-400">A4</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadOrPrintPDF('print')}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-slate-800 hover:bg-slate-50 cursor-pointer min-h-[48px]"
                >
                  <span className="flex items-center gap-3">
                    <Printer className="w-4.5 h-4.5 text-slate-700" />
                    <span>Imprimer la fiche</span>
                  </span>
                </button>

                {/* Signalement — Appui 1 */}
                <button
                  type="button"
                  onClick={() => setIsQuickReportOpen(true)}
                  className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer min-h-[48px]"
                >
                  <span className="flex items-center gap-3">
                    <ShieldAlert className="w-4.5 h-4.5 text-rose-600" />
                    <span>Signaler cette annonce</span>
                  </span>
                  <span className="text-xs text-rose-500">2 appuis</span>
                </button>
              </div>
            ) : reportSubmittedReason ? (
              <div className="p-6 text-center space-y-2.5">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">Signalement enregistré</p>
                <p className="text-xs text-slate-600">
                  Motif transmis : <strong>{reportSubmittedReason}</strong>. Merci pour votre vigilance.
                </p>
              </div>
            ) : (
              /* Signalement — Appui 2 : sélection directe = envoi immédiat */
              <div className="p-3 space-y-1.5 max-h-[70vh] overflow-y-auto">
                <div className="px-2 py-1.5 text-xs text-slate-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Touchez le motif correspondant pour envoyer immédiatement le signalement :</span>
                </div>
                {REPORT_REASONS.map((item) => (
                  <button
                    key={item.reason}
                    type="button"
                    onClick={() => handleTwoTapReport(item)}
                    className="w-full text-left px-3.5 py-3 rounded-xl border border-slate-200 hover:border-rose-300 hover:bg-rose-50/70 transition-colors cursor-pointer min-h-[48px]"
                  >
                    <span className="block text-sm font-bold text-slate-900">{item.label}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{item.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GALERIE PLEIN ÉCRAN (LIGHTBOX) */}
      {isFullscreenGallery && (
        <div
          className="fixed inset-0 z-50 bg-slate-950 flex flex-col justify-between p-3 sm:p-6"
          onClick={() => setIsFullscreenGallery(false)}
        >
          <div
            className="flex items-center justify-between text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs sm:text-sm font-bold truncate max-w-[75%]">
              {property.title} • {selectedImageIndex + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreenGallery(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              aria-label="Fermer la galerie plein écran"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            className="relative flex-1 flex items-center justify-center my-3 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedImageIndex] || images[0]}
              alt={`${property.title} plein écran`}
              className="max-h-full max-w-full object-contain rounded-xl"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-2 sm:left-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedImageIndex((prev) => (prev + 1) % images.length)}
                  className="absolute right-2 sm:right-4 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div
              className="flex gap-2 overflow-x-auto justify-center pb-1"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-14 h-10 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                    selectedImageIndex === idx ? 'border-emerald-400' : 'border-white/20 opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TOAST DE CONFIRMATION */}
      {actionToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-emerald-500/40 text-xs font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* MODAUX SECONDAIRES (VISITE & CERTIFICATION) */}
      <ScheduleVisitModal
        property={property}
        isOpen={isScheduleVisitOpen}
        onClose={() => setIsScheduleVisitOpen(false)}
      />

      <TrustVerificationModal
        isOpen={isTrustModalOpen}
        onClose={() => setIsTrustModalOpen(false)}
        targetType="property"
        targetId={property.id}
        targetName={property.title}
        onSuccess={() => setIsTrustModalOpen(false)}
      />
    </div>
  );
};
