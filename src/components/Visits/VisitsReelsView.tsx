import React, { useState, useEffect, useRef } from 'react';
import { Property, Agent, PropertyUserReport } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  openWhatsApp,
  triggerPhoneCall,
} from '../../utils/whatsapp';
import { convertAndFormatPrice } from '../../utils/currency';
import {
  trackVideoStart,
  trackVideoSignificantWatch,
  trackVideoListingClick,
  trackVideoWhatsAppClick,
  trackVideoVisitRequest,
  trackVideoWishlistToggle
} from '../../utils/analytics';
import { ScheduleVisitModal } from '../ScheduleVisitModal';
import { ReportListingModal } from '../ReportListingModal';
import {
  MapPin,
  Heart,
  Share2,
  Phone,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  BadgeCheck,
  Check,
  Building2,
  Home,
  Zap,
  Droplets,
  Layers,
  ArrowLeft,
  Calendar,
  MessageCircle,
  Eye,
  Bed,
  Bath,
  Maximize,
  AlertTriangle
} from 'lucide-react';
import {
  isCloudinaryUrl,
  getCloudinaryOptimizedVideoUrl,
  getCloudinaryAutoThumbnail
} from '../../utils/videoHelpers';

interface VisitsReelsViewProps {
  onReturnHome?: () => void;
  onOpenPropertyModal?: (propertyId: string) => void;
  onOpenShareModal?: (propertyId: string) => void;
}

// Fallback architectural video loops optimisées pour Kinshasa
const FALLBACK_VIDEOS = [
  'https://assets.mixkit.co/videos/preview/mixkit-modern-luxury-house-patio-and-pool-walkthrough-40541-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-modern-living-room-with-large-windows-41584-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-luxury-home-interior-with-modern-furniture-41589-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-moving-through-a-corridor-in-a-modern-house-41586-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-interior-of-a-luxury-apartment-with-panoramic-view-41588-large.mp4',
];

// Dictionnaire des libellés de types de biens en français
const TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartement',
  house: 'Maison',
  villa: 'Villa',
  penthouse: 'Penthouse / Duplex',
  land: 'Terrain / Concession',
  commercial: 'Local Commercial',
  office: 'Bureau / Espace Pro'
};

export const VisitsReelsView: React.FC<VisitsReelsViewProps> = ({
  onReturnHome,
  onOpenPropertyModal,
  onOpenShareModal,
}) => {
  const {
    properties,
    agents,
    agencies,
    currency,
    wishlist,
    toggleWishlist,
    setActivePropertyModalId,
    addPropertyReport,
    recordPropertyAction,
    incrementPropertyViews,
    propertyVideos,
  } = useApp();

  // État des filtres
  const [selectedCommune, setSelectedCommune] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all'); // 'all' | 'sale' | 'rent'
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [doubleTapHeart, setDoubleTapHeart] = useState<{ x: number; y: number } | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(30);

  // État des modals secondaires
  const [visitModalProperty, setVisitModalProperty] = useState<Property | null>(null);
  const [reportModalProperty, setReportModalProperty] = useState<Property | null>(null);

  // État de chargement des vidéos (pour afficher la miniature nette tant que la vidéo charge)
  const [videoLoadedMap, setVideoLoadedMap] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const lastTapRef = useRef<number>(0);
  const trackedSignificantWatchRef = useRef<Record<string, boolean>>({});

  // Filtrer les annonces pour le flux vidéo des Visites
  // RÈGLE IMPÉRATIVE : Seules les annonces actives et disponibles (non 'sold', non supprimées) sont proposées
  const visitProperties = properties.filter((p) => {
    // 1. Exclure immédiatement tout bien vendu, indisponible ou archivé
    if (!p || p.status === 'sold') return false;

    // 2. Filtre par commune si sélectionné
    if (selectedCommune !== 'all') {
      const pCommune = (p.commune || '').toLowerCase();
      if (!pCommune.includes(selectedCommune.toLowerCase())) return false;
    }

    // 3. Filtre par transaction (Vente vs Location)
    if (selectedType === 'sale' && p.status !== 'for-sale') return false;
    if (selectedType === 'rent' && p.status !== 'for-rent') return false;

    return true;
  });

  // Ajustement de la vidéo visible lors du changement d'index ou de filtre
  useEffect(() => {
    videoRefs.current.forEach((vid, idx) => {
      if (!vid) return;
      if (idx === currentIndex) {
        vid.currentTime = 0;
        vid.muted = isMuted;
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Politique autoplay du navigateur (geste utilisateur requis)
              setIsPlaying(false);
            });
        }

        // Comptabiliser la vue de la vidéo et déclencher l'événement analytique de départ
        const activeProp = visitProperties[idx];
        if (activeProp) {
          incrementPropertyViews(activeProp.id);
          trackVideoStart(activeProp, vid.src);
        }
      } else {
        vid.pause();
        vid.currentTime = 0;
      }
    });
    setCurrentTime(0);
  }, [currentIndex, isMuted, selectedCommune, selectedType, visitProperties.length]);

  // Navigation clavier pour ordinateurs (Flèches Haut/Bas, Espace pour Pause, M pour Son)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si un modal de formulaire est ouvert
      if (visitModalProperty || reportModalProperty) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, visitProperties.length, isPlaying, visitModalProperty, reportModalProperty]);

  const goToNext = () => {
    if (currentIndex < visitProperties.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      scrollToIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      scrollToIndex(currentIndex - 1);
    }
  };

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const cards = containerRef.current.querySelectorAll('.reel-card');
    if (cards[index]) {
      cards[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Détection du défilement au doigt (snap vertical sur mobile)
  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const height = containerRef.current.clientHeight;
    if (height > 0) {
      const newIndex = Math.round(scrollTop / height);
      if (newIndex !== currentIndex && newIndex >= 0 && newIndex < visitProperties.length) {
        setCurrentIndex(newIndex);
      }
    }
  };

  const togglePlayPause = () => {
    const currentVideo = videoRefs.current[currentIndex];
    if (!currentVideo) return;
    if (currentVideo.paused) {
      currentVideo.play().catch(() => {});
      setIsPlaying(true);
    } else {
      currentVideo.pause();
      setIsPlaying(false);
    }
  };

  // Mise à jour de la barre d'avancement vidéo & Mesure du visionnage significatif
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const vid = e.currentTarget;
    setCurrentTime(vid.currentTime);
    const videoDuration = vid.duration && !isNaN(vid.duration) ? vid.duration : 30;
    setDuration(Math.min(videoDuration, 30));

    // Mesure analytique de visionnage significatif (>= 10s ou >= 50% de la durée de la vidéo)
    const activeProp = visitProperties[currentIndex];
    if (activeProp && !trackedSignificantWatchRef.current[activeProp.id]) {
      const percent = (vid.currentTime / videoDuration) * 100;
      if (vid.currentTime >= 10 || percent >= 50) {
        trackedSignificantWatchRef.current[activeProp.id] = true;
        trackVideoSignificantWatch(activeProp, vid.currentTime, percent);
      }
    }
  };

  // Double tap pour ajouter aux favoris avec animation de cœur
  const handleTouchCard = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, propertyId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      setDoubleTapHeart({ x: clientX, y: clientY });
      setTimeout(() => setDoubleTapHeart(null), 900);

      if (!wishlist.includes(propertyId)) {
        const prop = properties.find((p) => p.id === propertyId);
        if (prop) {
          trackVideoWishlistToggle(prop, true);
        }
        toggleWishlist(propertyId);
      }
    } else {
      lastTapRef.current = now;
    }
  };

  // Action WhatsApp direct
  const handleWhatsAppClick = (property: Property, agent: Agent | undefined) => {
    recordPropertyAction(property.id, 'whatsapp');
    trackVideoWhatsAppClick(property);
    const targetPhone = agent?.whatsapp || agent?.phone || property.contactPhone || '+243810000001';
    const cleanCommune = property.commune || 'Kinshasa';
    const priceFormatted = `$${property.price.toLocaleString()}${property.period === 'month' ? '/mois' : ''}`;
    const prefilledMessage = `Bonjour ${agent?.name || 'Conseiller Kinimmo'}, j'ai vu la visite vidéo du bien "${property.title}" (${cleanCommune}, ${priceFormatted}) sur Kinimmo. Je souhaite organiser une visite directe ou recevoir la fiche complète.`;

    openWhatsApp(targetPhone, prefilledMessage);
  };

  // Action Appel téléphonique
  const handlePhoneCallClick = (property: Property, agent: Agent | undefined) => {
    recordPropertyAction(property.id, 'call');
    const targetPhone = agent?.phone || agent?.whatsapp || property.contactPhone || '+243810000001';
    triggerPhoneCall(targetPhone);
  };

  // Action Partage
  const handleShare = async (property: Property) => {
    recordPropertyAction(property.id, 'share');
    if (onOpenShareModal) {
      onOpenShareModal(property.id);
      return;
    }

    const shareUrl = `${window.location.origin}/?tab=visites&property=${property.id}`;
    const shareText = `Regardez la visite vidéo de cette annonce à ${property.commune || 'Kinshasa'} sur Kinimmo : ${property.title} (${property.price.toLocaleString()} $)`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setShareToast('Lien de la visite copié dans le presse-papier !');
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      setShareToast('Lien prêt à être partagé.');
      setTimeout(() => setShareToast(null), 2000);
    }
  };

  // Ouverture de la fiche détaillée existante
  const handleOpenDetailModal = (propertyId: string) => {
    const targetProp = properties.find((p) => p.id === propertyId);
    if (targetProp) {
      trackVideoListingClick(targetProp);
    }
    if (onOpenPropertyModal) {
      onOpenPropertyModal(propertyId);
    } else {
      setActivePropertyModalId(propertyId);
    }
  };

  const activeProperty = visitProperties[currentIndex];
  const activeAgent = activeProperty
    ? agents.find((a) => a.id === activeProperty.agentId) || agents[0]
    : undefined;

  return (
    <div className="relative w-full min-h-[92vh] bg-slate-950 text-white select-none overflow-hidden flex flex-col items-center">
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-20 z-50 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Animation Double Tap Coeur */}
      {doubleTapHeart && (
        <div
          className="fixed pointer-events-none z-50 text-rose-500 animate-ping duration-700"
          style={{
            left: `${doubleTapHeart.x - 30}px`,
            top: `${doubleTapHeart.y - 30}px`,
          }}
        >
          <Heart className="w-16 h-16 fill-rose-500 text-rose-500 drop-shadow-lg" />
        </div>
      )}

      {/* Barre Supérieure Responsive */}
      <div className="w-full max-w-2xl px-4 py-3 flex items-center justify-between z-30 bg-gradient-to-b from-slate-950/95 to-transparent">
        <div className="flex items-center gap-2">
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all active:scale-95 cursor-pointer"
              title="Retour aux annonces"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <h1 className="text-sm font-black tracking-wider uppercase text-white">
                Kinimmo Visites
              </h1>
              <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                Immobilier Vidéo
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
              Défilement vertical immersif inspiré des vidéos courtes
            </p>
          </div>
        </div>

        {/* Contrôle du Son Global & Compteur */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
              isMuted
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
            title={isMuted ? 'Activer le son' : 'Couper le son'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Son coupé</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Son activé</span>
              </>
            )}
          </button>

          <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-bold text-slate-300 border border-white/10">
            {visitProperties.length > 0 ? `${currentIndex + 1} / ${visitProperties.length}` : '0 / 0'}
          </span>
        </div>
      </div>

      {/* Onglets Filtres par Commune & Type */}
      <div className="w-full max-w-2xl px-4 pb-2 z-20 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'all', label: 'Toutes les visites' },
          { id: 'Gombe', label: 'Gombe' },
          { id: 'Ngaliema', label: 'Ngaliema' },
          { id: 'Limete', label: 'Limete' },
          { id: 'Mont-Ngafula', label: 'Mont-Ngafula' },
          { id: 'Kalamu', label: 'Kalamu' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedCommune(tab.id);
              setCurrentIndex(0);
              if (containerRef.current) containerRef.current.scrollTop = 0;
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
              selectedCommune === tab.id
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black ring-2 ring-emerald-400/50'
                : 'bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10'
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Filtres Transaction */}
        <button
          onClick={() => {
            setSelectedType((prev) => (prev === 'sale' ? 'all' : 'sale'));
            setCurrentIndex(0);
            if (containerRef.current) containerRef.current.scrollTop = 0;
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
            selectedType === 'sale'
              ? 'bg-white text-slate-950 font-black'
              : 'bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          À Vendre
        </button>
        <button
          onClick={() => {
            setSelectedType((prev) => (prev === 'rent' ? 'all' : 'rent'));
            setCurrentIndex(0);
            if (containerRef.current) containerRef.current.scrollTop = 0;
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
            selectedType === 'rent'
              ? 'bg-white text-slate-950 font-black'
              : 'bg-white/10 text-slate-300 border border-white/10'
          }`}
        >
          À Louer
        </button>
      </div>

      {/* Conteneur Principal Défilement Vertical Plein Écran */}
      <div className="relative w-full max-w-[440px] flex-1 flex flex-col items-center">
        {visitProperties.length === 0 ? (
          <div className="w-full h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-600" />
            <h3 className="text-base font-bold text-white">Aucune visite vidéo disponible</h3>
            <p className="text-xs text-slate-400">
              Aucune annonce active ne correspond aux filtres ({selectedCommune}).
            </p>
            <button
              onClick={() => {
                setSelectedCommune('all');
                setSelectedType('all');
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="w-full h-[78vh] sm:h-[82vh] overflow-y-scroll snap-y snap-mandatory rounded-3xl relative shadow-2xl border border-slate-800/80 bg-black no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {visitProperties.map((property, idx) => {
              const agent = agents.find((a) => a.id === property.agentId) || agents[0];
              const agency = property.agencyId ? agencies.find((ag) => ag.id === property.agencyId) : undefined;
              const isCurrent = idx === currentIndex;
              const isWishlisted = wishlist.includes(property.id);

              // Récupérer la vidéo approuvée spécifiquement soumise pour cette annonce si existante
              const matchingApprovedVideo = (propertyVideos || []).find(
                (v) => v.propertyId === property.id && v.status === 'approved'
              );

              // URL de vidéo réelle ou boucle architecturale fluide
              const rawVideoSrc =
                matchingApprovedVideo?.videoUrl ||
                property.videoUrl ||
                FALLBACK_VIDEOS[idx % FALLBACK_VIDEOS.length];

              const videoSrc = isCloudinaryUrl(rawVideoSrc)
                ? getCloudinaryOptimizedVideoUrl(rawVideoSrc, { quality: 'auto:good' })
                : rawVideoSrc;

              // Miniature de couverture personnalisée, poster Cloudinary automatique ou 1ère photo du bien
              const posterImage =
                matchingApprovedVideo?.thumbnailUrl ||
                (isCloudinaryUrl(rawVideoSrc) ? getCloudinaryAutoThumbnail(rawVideoSrc) : null) ||
                (property.images && property.images[0] ? property.images[0] : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80');

              // Affichage du prix formaté via la devise active et contre-valeur CDF
              const formattedPrice = convertAndFormatPrice(property.price, currency);

              // Libellé propre du type de bien
              const typeLabel = TYPE_LABELS[property.type] || property.type;

              // Nom de l'agent ou de l'agence
              const creatorName = property.agencyName || agency?.name || agent?.name || 'Agent Kinimmo';

              // Chargement progressif : précharger seulement la vidéo courante et la suivante immédiate
              const shouldPreload = Math.abs(idx - currentIndex) <= 1;

              return (
                <div
                  key={property.id}
                  className="reel-card relative w-full h-full snap-start snap-always shrink-0 overflow-hidden bg-black flex items-center justify-center"
                  onClick={(e) => handleTouchCard(e, property.id)}
                >
                  {/* Miniature Haute Définition affichée pendant le chargement */}
                  <img
                    src={posterImage}
                    alt={property.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                      videoLoadedMap[property.id] ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                  />

                  {/* Lecteur Vidéo HTML5 Vertical */}
                  <video
                    ref={(el) => {
                      videoRefs.current[idx] = el;
                    }}
                    src={videoSrc}
                    playsInline
                    loop
                    muted={isMuted}
                    preload={shouldPreload ? 'auto' : 'none'}
                    onLoadedData={() => {
                      setVideoLoadedMap((prev) => ({ ...prev, [property.id]: true }));
                    }}
                    onTimeUpdate={isCurrent ? handleTimeUpdate : undefined}
                    onClick={togglePlayPause}
                    className="w-full h-full object-cover cursor-pointer"
                  />

                  {/* Indicateur Pause / Reprise au centre de l'écran */}
                  {!isPlaying && isCurrent && (
                    <div
                      onClick={togglePlayPause}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] z-20 cursor-pointer pointer-events-auto"
                    >
                      <div className="w-16 h-16 rounded-full bg-slate-900/85 text-white flex items-center justify-center ring-4 ring-white/30 backdrop-blur-md shadow-2xl transition-transform active:scale-95">
                        <Play className="w-8 h-8 fill-white ml-1" />
                      </div>
                    </div>
                  )}

                  {/* Pastille pour Réactiver le Son */}
                  {isMuted && isCurrent && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMuted(false);
                      }}
                      className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-bold border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer animate-bounce duration-1000"
                    >
                      <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                      <span>Activer le son</span>
                    </button>
                  )}

                  {/* Dégradés pour lisibilité du texte */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent pointer-events-none z-10" />
                  <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-transparent pointer-events-none z-10" />

                  {/* Rail d'Actions Latéral Droit (Style Réseaux Sociaux & Visites) */}
                  <div className="absolute right-2.5 bottom-24 z-20 flex flex-col items-center gap-3.5 select-none">
                    {/* Avatar de l'Agent ou Agence */}
                    <div className="relative flex flex-col items-center group cursor-pointer" onClick={() => handleOpenDetailModal(property.id)}>
                      <img
                        src={agent?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80'}
                        alt={creatorName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500 shadow-xl"
                      />
                      <div className="absolute -bottom-1 bg-emerald-500 text-slate-950 rounded-full p-0.5 shadow">
                        <BadgeCheck className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Bouton Ajouter aux Favoris */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        trackVideoWishlistToggle(property, !isWishlisted);
                        toggleWishlist(property.id);
                      }}
                      className="flex flex-col items-center gap-0.5 group active:scale-125 transition-transform cursor-pointer"
                      title={isWishlisted ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-all ${
                          isWishlisted
                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30'
                            : 'bg-slate-900/70 hover:bg-slate-900 text-white border border-white/10'
                        }`}
                      >
                        <Heart
                          className={`w-5 h-5 transition-transform ${
                            isWishlisted ? 'fill-white text-white scale-110' : 'text-white'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white drop-shadow">
                        {isWishlisted ? 'Sauvé' : 'Favori'}
                      </span>
                    </button>

                    {/* Bouton Demander une Visite */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVisitModalProperty(property);
                      }}
                      className="flex flex-col items-center gap-0.5 group active:scale-125 transition-transform cursor-pointer"
                      title="Planifier un créneau de visite"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 border border-emerald-400/40">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 drop-shadow">
                        Visiter
                      </span>
                    </button>

                    {/* Bouton WhatsApp */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWhatsAppClick(property, agent);
                      }}
                      className="flex flex-col items-center gap-0.5 group active:scale-125 transition-transform cursor-pointer"
                      title="Contacter sur WhatsApp"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white flex items-center justify-center shadow-lg shadow-[#25D366]/30 border border-white/20">
                        <svg className="w-5.5 h-5.5 fill-white" viewBox="0 0 24 24">
                          <path d="M12.031 2C6.494 2 2 6.494 2 12.031c0 1.809.479 3.525 1.328 5.021L2 22l5.093-1.309c1.455.794 3.109 1.242 4.938 1.242 5.537 0 10.031-4.494 10.031-10.031S17.568 2 12.031 2zm0 18.25c-1.603 0-3.084-.44-4.37-1.209l-.313-.188-3.037.781.813-2.953-.203-.328c-.859-1.375-1.328-2.984-1.328-4.665 0-4.664 3.797-8.469 8.469-8.469 4.672 0 8.469 3.805 8.469 8.469 0 4.672-3.805 8.469-8.469 8.469zm4.641-6.328c-.255-.128-1.516-.748-1.751-.834-.234-.085-.404-.128-.574.128-.17.255-.658.834-.807 1.004-.149.17-.298.191-.553.064-.255-.128-1.076-.397-2.05-1.265-.758-.677-1.27-1.513-1.419-1.768-.149-.255-.016-.393.112-.52.115-.115.255-.298.383-.447.128-.149.17-.255.255-.425.085-.17.043-.319-.021-.447-.064-.128-.574-1.383-.787-1.894-.207-.497-.419-.429-.574-.437l-.489-.009c-.17 0-.447.064-.681.319-.234.255-.894.872-.894 2.128s.915 2.468 1.043 2.638c.128.17 1.8 2.748 4.362 3.851.61.263 1.086.42 1.458.538.613.195 1.171.167 1.612.102.492-.074 1.516-.62 1.729-1.219.213-.599.213-1.113.149-1.219-.064-.106-.234-.17-.489-.298z" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-black text-[#25D366] drop-shadow">
                        WhatsApp
                      </span>
                    </button>

                    {/* Bouton Partage */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(property);
                      }}
                      className="flex flex-col items-center gap-0.5 group active:scale-125 transition-transform cursor-pointer"
                      title="Partager cette visite"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center border border-white/10 backdrop-blur-md shadow-lg">
                        <Share2 className="w-4.5 h-4.5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-white drop-shadow">
                        Partager
                      </span>
                    </button>

                    {/* Bouton Signaler une annonce suspecte */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReportModalProperty(property);
                      }}
                      className="flex flex-col items-center gap-0.5 group active:scale-125 transition-transform cursor-pointer"
                      title="Signaler un contenu ou prix suspect"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-900/70 hover:bg-rose-950 text-slate-300 hover:text-rose-400 flex items-center justify-center border border-white/10 backdrop-blur-md shadow-lg">
                        <ShieldAlert className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-300 drop-shadow">
                        Signaler
                      </span>
                    </button>
                  </div>

                  {/* Superposition des Informations de l'Annonce (Bas d'écran) */}
                  <div className="absolute left-3 right-16 bottom-3 z-20 space-y-1.5 select-text pointer-events-auto">
                    {/* Badges Localisation Kinshasa, Type et Statut */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md">
                        <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{property.commune || 'Kinshasa'}</span>
                      </span>

                      {property.quartier && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md text-white font-bold text-[11px] border border-white/10">
                          {property.quartier}
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full bg-slate-800/90 text-slate-200 font-bold text-[10px] border border-white/10">
                        {typeLabel}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          property.status === 'for-sale'
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-indigo-500 text-white'
                        }`}
                      >
                        {property.status === 'for-sale' ? 'À Vendre' : 'À Louer'}
                      </span>
                    </div>

                    {/* Prix et Devise Réels */}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                        {formattedPrice}
                        {property.period === 'month' && (
                          <span className="text-xs sm:text-sm font-bold text-slate-300 ml-0.5">/mois</span>
                        )}
                      </span>
                    </div>

                    {/* Titre de l'annonce */}
                    <h2
                      onClick={() => handleOpenDetailModal(property.id)}
                      className="text-sm font-extrabold text-white leading-snug line-clamp-2 hover:text-emerald-300 transition-colors cursor-pointer drop-shadow"
                    >
                      {property.title}
                    </h2>

                    {/* Caractéristiques (Chambres, Salles de bain, Surface) si applicable */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-200 font-bold pt-0.5">
                      {property.bedrooms > 0 && (
                        <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          <Bed className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{property.bedrooms} ch</span>
                        </span>
                      )}
                      {property.bathrooms > 0 && (
                        <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          <Bath className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{property.bathrooms} sdb</span>
                        </span>
                      )}
                      {property.area > 0 && (
                        <span className="flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                          <Maximize className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{property.area} m²</span>
                        </span>
                      )}
                    </div>

                    {/* Agence ou Agent Référent */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                      <span className="text-slate-400">Par :</span>
                      <span className="font-bold text-white truncate max-w-[200px]">{creatorName}</span>
                    </div>

                    {/* Boutons d'Action Principaux */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {/* Bouton Voir l'Annonce */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailModal(property.id);
                        }}
                        className="py-2.5 px-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4 text-emerald-600" />
                        <span>Voir l'Annonce</span>
                      </button>

                      {/* Bouton Demander une Visite */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisitModalProperty(property);
                        }}
                        className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
                      >
                        <Calendar className="w-4 h-4 text-white" />
                        <span>Demander Visite</span>
                      </button>
                    </div>
                  </div>

                  {/* Barre d'Avancement Vidéo */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20 z-30">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-150"
                      style={{
                        width: `${Math.min(100, (currentTime / (duration || 30)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Flèches de Défilement Dédiées sur Écran Ordinateur */}
        <div className="hidden lg:flex flex-col gap-3 absolute -right-16 top-1/2 -translate-y-1/2 z-30">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-xl cursor-pointer"
            title="Vidéo précédente (Touche Haut ↑)"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === visitProperties.length - 1}
            className="w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95 shadow-xl cursor-pointer"
            title="Vidéo suivante (Touche Bas ↓)"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Guide d'utilisation en pied de page */}
      <div className="py-2 text-center text-xs text-slate-400 font-medium z-10 flex items-center justify-center gap-2">
        <span className="hidden sm:inline">Utilisez les touches ↑ et ↓ du clavier ou</span>
        <span>Faites glisser au doigt pour passer à la vidéo suivante</span>
      </div>

      {/* Modal de Planification de Visite */}
      {visitModalProperty && (
        <ScheduleVisitModal
          property={visitModalProperty}
          isOpen={!!visitModalProperty}
          onClose={() => setVisitModalProperty(null)}
        />
      )}

      {/* Modal de Signalement d'Annonce Suspecte */}
      {reportModalProperty && (
        <ReportListingModal
          property={reportModalProperty}
          isOpen={!!reportModalProperty}
          onClose={() => setReportModalProperty(null)}
          onSubmitReport={(reportData) => {
            addPropertyReport(reportData);
          }}
        />
      )}
    </div>
  );
};
