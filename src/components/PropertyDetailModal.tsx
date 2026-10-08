import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { convertAndFormatPrice } from '../utils/currency';
import { generatePropertyPDF } from '../utils/pdfGenerator';
import {
  X,
  Home,
  Bed,
  Bath,
  Maximize,
  Heart,
  Scale,
  Share2,
  FileDown,
  Phone,
  Mail,
  Calendar,
  Send,
  Lock,
  Sparkles,
  Zap,
  Play,
  Video,
  MapPin,
  CheckCircle2,
  Calculator,
  UserCheck,
  MessageCircle,
  Compass,
  Navigation,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Edit,
  Trash2,
  Eye,
  Layers,
} from 'lucide-react';
import { MortgageCalculator } from './MortgageCalculator';
import { PropertyVideoPlayer } from './PropertyVideoPlayer';
import { SocialShareBar } from './SocialShareBar';
import { ScheduleVisitModal } from './ScheduleVisitModal';
import { ReportListingModal } from './ReportListingModal';

interface PropertyDetailModalProps {
  onOpenShareModal: (propertyId: string) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({ onOpenShareModal }) => {
  const {
    activePropertyModalId,
    setActivePropertyModalId,
    properties,
    customFields,
    currency,
    agents,
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
    requestConfirm,
    addPropertyReport,
  } = useApp();

  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video' | 'virtual360' | 'calculator'>('photos');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeVirtualRoom, setActiveVirtualRoom] = useState(0);
  const [isScheduleVisitOpen, setIsScheduleVisitOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Tour / Contact Form State
  const [requestType, setRequestType] = useState<'info' | 'tour'>('info');
  const [leadName, setLeadName] = useState(user?.name || '');
  const [leadEmail, setLeadEmail] = useState(user?.email || '');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadMessage, setLeadMessage] = useState('Bonjour, je suis intéressé par cette propriété. Merci de me recontacter.');
  const [tourDate, setTourDate] = useState('2026-08-12');
  const [tourTime, setTourTime] = useState('14:00');
  const [isSent, setIsSent] = useState(false);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePropertyModalId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActivePropertyModalId]);

  // Reset tab and selected image on property change
  useEffect(() => {
    if (activePropertyModalId) {
      setSelectedImageIndex(0);
      setActiveMediaTab('photos');
    }
  }, [activePropertyModalId]);

  if (!activePropertyModalId) return null;

  const property = properties.find((p) => p.id === activePropertyModalId);
  if (!property) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl text-slate-900">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto animate-pulse">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Chargement de l'annonce...</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Récupération des détails, photos et critères de la propriété.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setActivePropertyModalId(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Fermer et voir toutes les annonces
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFavorite = wishlist.includes(property.id);
  const isCompared = compareList.includes(property.id);
  const formattedPrice = convertAndFormatPrice(property.price, currency);
  const agent = agents.find((a) => a.id === property.agentId);

  const canManageProperty = Boolean(
    user && (
      user.role === 'admin' ||
      user.role === 'agent' ||
      user.role === 'agency' ||
      property.agentId === user.id ||
      property.agentId === user.agentId ||
      property.agencyId === user.agencyId ||
      property.agencyId === user.id ||
      (user.agencyName && property.agencyName === user.agencyName) ||
      (user.email && (user.email === property.contactEmail || user.email === property.agentId || user.email === property.privateFields?.ownerEmail))
    )
  );

  const handleSendLead = (e: React.FormEvent) => {
    e.preventDefault();
    addLeadRequest({
      propertyId: property.id,
      propertyTitle: property.title,
      agentId: property.agentId,
      userName: leadName || 'Client',
      userEmail: leadEmail || 'client@immocraft.fr',
      userPhone: leadPhone || '+33 6 00 00 00 00',
      message: leadMessage,
      requestType,
      tourDate: requestType === 'tour' ? tourDate : undefined,
      tourTime: requestType === 'tour' ? tourTime : undefined,
    });
    recordPropertyAction(property.id, 'lead');
    setIsSent(true);
    setTimeout(() => setIsSent(false), 4000);
  };

  const handleDownloadPDF = () => {
    recordPropertyAction(property.id, 'share');
    generatePropertyPDF(property, customFields, agent, currency);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl my-auto overflow-hidden shadow-2xl text-slate-900 flex flex-col max-h-[95vh]">
        {/* Top Sticky Header Bar */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
              <button
                type="button"
                onClick={() => setActivePropertyModalId(null)}
                className="hover:text-emerald-700 font-bold flex items-center gap-1 text-slate-600 transition-colors shrink-0 cursor-pointer"
                title="Retourner à l'accueil"
              >
                <Home className="w-3.5 h-3.5 text-emerald-600" />
                <span>Accueil</span>
              </button>
              <span className="text-slate-300">›</span>
              <span className="text-emerald-700 font-bold shrink-0">{property.category}</span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1 text-slate-600 truncate max-w-[200px] sm:max-w-xs md:max-w-sm" title={`${property.address}, ${property.city}`}>
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{property.address}, {property.city}</span>
              </span>
              {property.status === 'sold' && (
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs shrink-0">
                  <CheckCircle2 className="w-3 h-3 fill-white text-rose-600" />
                  VENDU
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-xl font-black text-slate-900 truncate mt-1" title={property.title}>
              {property.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            {/* Direct Home Return Button - Refined Distinct Style */}
            <button
              type="button"
              onClick={() => setActivePropertyModalId(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-200 shadow-xs active:scale-95 shrink-0 cursor-pointer"
              title="Retourner à l'accueil et fermer cette fiche"
            >
              <Home className="w-4 h-4 text-emerald-600" />
              <span>Accueil</span>
            </button>
            {/* Quick Toggle Sold Button for Admin / Agent / Agency / Owner */}
            {canManageProperty && (
              <button
                type="button"
                onClick={() => {
                  const newStatus = property.status === 'sold' ? 'for-sale' : 'sold';
                  const actionLabel = property.status === 'sold'
                    ? `remettre en vente le bien "${property.title}"`
                    : `marquer le bien "${property.title}" comme VENDU / TRANSACTION CONCLUE`;

                  requestConfirm({
                    title: property.status === 'sold' ? "Remettre le bien en vente" : "Déclarer le bien comme Vendu",
                    message: `Voulez-vous vraiment ${actionLabel} ?`,
                    confirmText: property.status === 'sold' ? "Oui, remettre en vente" : "Oui, déclarer Vendu",
                    onConfirm: () => {
                      updateProperty({ ...property, status: newStatus });
                    }
                  });
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shrink-0 ${
                  property.status === 'sold'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                }`}
                title={property.status === 'sold' ? 'Remettre en vente' : 'Déclarer ce bien comme vendu'}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${property.status === 'sold' ? 'text-rose-600' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{property.status === 'sold' ? 'Bien Vendu ✓' : 'Marquer Vendu'}</span>
              </button>
            )}

            {/* Modifier le bien */}
            {canManageProperty && (
              <button
                type="button"
                onClick={() => {
                  setEditingProperty(property);
                  setActivePropertyModalId(null);
                  setIsSubmitPropertyOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-200 shrink-0"
                title="Modifier cette annonce"
              >
                <Edit className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden md:inline">Modifier</span>
              </button>
            )}

            {/* Supprimer le bien */}
            {canManageProperty && (
              <button
                type="button"
                onClick={() => {
                  requestConfirm({
                    title: "Suppression de l'annonce",
                    message: `Voulez-vous vraiment supprimer définitivement l'annonce "${property.title}" ?`,
                    confirmText: "Oui, supprimer",
                    onConfirm: () => {
                      deleteProperty(property.id);
                      setActivePropertyModalId(null);
                    }
                  });
                }}
                className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-all border border-rose-200 shrink-0"
                title="Supprimer cette annonce"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden md:inline">Supprimer</span>
              </button>
            )}

            {/* Programmer une Visite - Primary Highlight CTA */}
            <button
              onClick={() => setIsScheduleVisitOpen(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0 cursor-pointer"
              title="Programmer une visite sur place ou vidéo"
            >
              <Calendar className="w-3.5 h-3.5 text-white" />
              <span>Visiter ce bien</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-200 shrink-0 cursor-pointer"
              title="Télécharger la fiche PDF de ce bien"
            >
              <FileDown className="w-4 h-4 text-emerald-600" />
              <span className="hidden md:inline">PDF Flyer</span>
            </button>

            {/* Share */}
            <button
              onClick={() => onOpenShareModal(property.id)}
              className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs flex items-center gap-1.5 transition-all border border-sky-200 shrink-0 cursor-pointer"
              title="Partager sur les réseaux sociaux (WhatsApp, Facebook, etc.)"
            >
              <Share2 className="w-4 h-4 text-sky-600" />
              <span className="hidden md:inline">Partager</span>
            </button>

            {/* Signaler l'annonce */}
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="px-2.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs flex items-center gap-1.5 transition-all border border-amber-200 shrink-0 cursor-pointer"
              title="Signaler un prix anormal, une arnaque ou des photos volées"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span className="hidden md:inline">Signaler</span>
            </button>

            {/* Wishlist */}
            <button
              onClick={() => toggleWishlist(property.id)}
              className={`p-2 rounded-xl transition-all shrink-0 cursor-pointer ${
                isFavorite
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
              }`}
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
            </button>

            {/* Close */}
            <button
              onClick={() => setActivePropertyModalId(null)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Fermer cette fiche"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Sold Alert Banner */}
          {property.status === 'sold' && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-900 text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center text-white shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-black text-rose-900 text-sm">Ce bien immobilier a été VENDU</p>
                  <p className="text-[11px] text-rose-700">Transaction enregistrée avec succès. Vous pouvez contacter l'agent pour des biens similaires dans le secteur.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-xl bg-rose-600 text-white font-black text-xs uppercase tracking-wider shrink-0">
                Transaction Conclue
              </span>
            </div>
          )}
          {/* Media Header / Lightbox */}
          <div className="space-y-3">
            <div className="flex border-b border-slate-200 text-xs">
              <button
                onClick={() => setActiveMediaTab('photos')}
                className={`py-2.5 px-4 font-bold border-b-2 transition-colors ${
                  activeMediaTab === 'photos'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Photos ({property.images.length})
              </button>

              {property.videoUrl && (
                <button
                  onClick={() => setActiveMediaTab('video')}
                  className={`py-2.5 px-4 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeMediaTab === 'video'
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 text-emerald-600" />
                  Vidéo HD
                </button>
              )}

              <button
                onClick={() => setActiveMediaTab('virtual360')}
                className={`py-2.5 px-4 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeMediaTab === 'virtual360'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                Visite 360° Virtuelle
              </button>

              <button
                onClick={() => setActiveMediaTab('calculator')}
                className={`py-2.5 px-4 font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeMediaTab === 'calculator'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-emerald-600" />
                Calculateur de Prêt
              </button>
            </div>

            {activeMediaTab === 'photos' && (
              <div className="space-y-3">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md">
                  <img
                    src={property.images[selectedImageIndex] || property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-md">
                      <span className="text-xl font-black text-emerald-700">{formattedPrice}</span>
                      {property.period === 'month' && <span className="text-xs text-slate-600 font-medium"> /mois</span>}
                    </div>
                    {property.status === 'sold' && (
                      <div className="bg-red-600/90 text-white font-black text-xs uppercase px-3 py-1.5 rounded-xl border border-red-400 shadow-lg flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-white text-red-600" />
                        VENDU
                      </div>
                    )}
                  </div>

                  {/* Floating Video Tour Button if video is published */}
                  {property.videoUrl && (
                    <button
                      onClick={() => setActiveMediaTab('video')}
                      className="absolute bottom-4 right-4 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl backdrop-blur-md transition-all transform hover:scale-105 active:scale-95 z-10"
                    >
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>Regarder la Visite Vidéo HD</span>
                    </button>
                  )}
                </div>

                {/* Thumbnails */}
                {property.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {property.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                          selectedImageIndex === idx ? 'border-emerald-600 ring-2 ring-emerald-500/20 scale-105' : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeMediaTab === 'video' && (
              <div className="space-y-3">
                <PropertyVideoPlayer
                  videoUrl={property.videoUrl || ''}
                  title={`Visite vidéo HD : ${property.title}`}
                  posterImage={property.images[0]}
                  autoPlay={true}
                />
                <div className="flex items-center justify-between text-xs text-slate-600 px-1">
                  <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                    <Video className="w-4 h-4" />
                    Visite immersive & guidée de la propriété
                  </span>
                  <button
                    onClick={() => setActiveMediaTab('photos')}
                    className="hover:text-slate-900 underline font-medium"
                  >
                    Retourner à la galerie photos ({property.images.length})
                  </button>
                </div>
              </div>
            )}

            {activeMediaTab === 'virtual360' && (
              <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
                    </span>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Simulateur de Visite Virtuelle 360°
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-800 font-bold bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                    Mode Interactif
                  </span>
                </div>

                {/* Virtual Room Selector Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                  {[
                    { title: 'Grand Salon VIP', tag: 'Réception' },
                    { title: 'Suite Parentale', tag: 'Chambre 1' },
                    { title: 'Cuisine Équipée', tag: 'Moderne' },
                    { title: 'Terrasse & Extérieur', tag: 'Piscine / Vue' },
                  ].map((room, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveVirtualRoom(idx)}
                      className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all border ${
                        activeVirtualRoom === idx
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>{room.title}</span>
                    </button>
                  ))}
                </div>

                {/* Simulated 360 viewer canvas */}
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 group select-none">
                  <img
                    src={
                      property.images[activeVirtualRoom % property.images.length] ||
                      property.images[0]
                    }
                    alt="Visite 360"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-slate-900/10 pointer-events-none" />

                  {/* 360 Badge */}
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 text-teal-800 font-black text-xs flex items-center gap-1.5 shadow-sm">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Vue 360° - Déplacez le curseur pour explorer</span>
                  </div>

                  {/* Hotspots */}
                  <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform">
                    <button
                      onClick={() => setIsScheduleVisitOpen(true)}
                      className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 hover:bg-emerald-500 border border-white/40 animate-bounce"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Voir en vrai (Visite)</span>
                    </button>
                  </div>

                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <button
                      onClick={() => setIsScheduleVisitOpen(true)}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Programmer la Visite Réelle</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeMediaTab === 'calculator' && (
              <MortgageCalculator initialPrice={property.price} />
            )}
          </div>

          {/* SOCIAL SHARING BAR */}
          <SocialShareBar
            property={property}
            onOpenFullModal={() => onOpenShareModal(property.id)}
          />

          {/* Grid Layout: Left Details, Right Lead Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-200">
            {/* Left 2 Cols: Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600">
                <div>
                  <span className="text-slate-500 block">Chambres</span>
                  <span className="text-sm font-black text-slate-900 flex items-center gap-1 mt-0.5">
                    <Bed className="w-4 h-4 text-emerald-600" /> {property.bedrooms}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Salles de bain</span>
                  <span className="text-sm font-black text-slate-900 flex items-center gap-1 mt-0.5">
                    <Bath className="w-4 h-4 text-emerald-600" /> {property.bathrooms}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Surface</span>
                  <span className="text-sm font-black text-slate-900 flex items-center gap-1 mt-0.5">
                    <Maximize className="w-4 h-4 text-emerald-600" /> {property.area} m²
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Garages</span>
                  <span className="text-sm font-black text-slate-900 flex items-center gap-1 mt-0.5">
                    🚗 {property.garages || 0}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-black text-slate-900 mb-2">Description du Bien</h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  {property.description}
                </p>
              </div>

              {/* Localisation Kinshasa (Commune, Quartier, Avenue) */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                <h4 className="text-sm font-black text-emerald-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  Localisation à Kinshasa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 block text-[11px] font-medium flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-emerald-600" /> Commune
                    </span>
                    <span className="text-sm font-black text-slate-900 mt-0.5 block">
                      {property.commune || 'Kinshasa'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 block text-[11px] font-medium flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600" /> Quartier
                    </span>
                    <span className="text-sm font-black text-slate-900 mt-0.5 block">
                      {property.quartier || 'Centre'}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-slate-500 block text-[11px] font-medium flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Avenue / Voie
                    </span>
                    <span className="text-sm font-black text-slate-900 mt-0.5 block truncate">
                      {property.avenue || property.address}
                    </span>
                  </div>
                </div>

                {property.referencePoint && (
                  <div className="text-xs bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 flex items-start gap-2">
                    <span className="text-emerald-700 font-bold shrink-0">Repère / Réf :</span>
                    <span>{property.referencePoint}</span>
                  </div>
                )}
              </div>

              {/* DYNAMIC FIELDS BUILDER SECTION */}
              <div>
                <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  Caractéristiques & Critères Complémentaires
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {customFields
                    .filter((f) => !f.isPrivate)
                    .map((field) => {
                      const val = property.customFields[field.key];
                      if (val === undefined || val === null || val === '') return null;
                      return (
                        <div
                          key={field.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <span className="text-slate-600 font-medium">
                            {field.label['fr'] || field.key}
                          </span>
                          <span className="font-bold text-slate-900">
                            {val} {field.unit || ''}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-slate-900 mb-3">Équipements & Prestations</h4>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* PRIVATE FIELDS (ADMIN / AGENT ONLY) */}
              {(user?.role === 'admin' || user?.role === 'agent') && property.privateFields && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-800 font-bold">
                    <Lock className="w-4 h-4 text-amber-600" />
                    Champs Privés Agent & Administration (PRO)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-800">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Propriétaire</span>
                      <span className="font-bold">{property.privateFields.ownerName || 'N/C'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Tél. Propriétaire</span>
                      <span className="font-bold">{property.privateFields.ownerPhone || 'N/C'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Commission Agence</span>
                      <span className="font-bold text-emerald-700">{property.privateFields.commissionRate || 4}%</span>
                    </div>
                  </div>
                  {property.privateFields.internalNotes && (
                    <div className="text-[11px] text-amber-900 pt-1 border-t border-amber-200">
                      <strong>Notes Agent:</strong> {property.privateFields.internalNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Col: Agent Card & Contact Form Widget */}
            <div className="space-y-4">
              {/* Agent Card */}
              {agent && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40"
                      />
                      {(agent.isVerified || agent.verificationStatus === 'verified') && (
                        <span className="absolute -bottom-1 -right-1 p-0.5 bg-white rounded-full border border-emerald-500 text-emerald-600">
                          <ShieldCheck className="w-3.5 h-3.5 fill-emerald-500/20" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-slate-900 text-sm">{agent.name}</h4>
                        {(agent.isVerified || agent.verificationStatus === 'verified') && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-[10px] font-black">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Vérifié</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-700 font-semibold">{agent.title}</p>
                      <p className="text-[10px] text-slate-500">{agent.agencyName}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* WhatsApp Direct */}
                      <a
                        href={`https://wa.me/${(agent.whatsapp || agent.phone || '+243810000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${agent.name}, je suis intéressé(e) par votre annonce "${property.title}" (${formattedPrice}) sur Kin Immobilier.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordPropertyAction(property.id, 'whatsapp')}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Direct Phone Call */}
                      <a
                        href={`tel:${agent.phone}`}
                        onClick={() => recordPropertyAction(property.id, 'call')}
                        className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition-all"
                      >
                        <Phone className="w-4 h-4 text-emerald-600" />
                        <span>Appeler</span>
                      </a>
                    </div>

                    <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
                      <span className="truncate">{agent.email}</span>
                      <span className="text-emerald-700 font-bold">{agent.phone}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Inquiry & Tour Form Widget */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
                <h4 className="font-black text-slate-900 text-sm">Demande d'Information & Visite</h4>

                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setRequestType('info')}
                    className={`py-1.5 rounded-lg font-bold transition-colors ${
                      requestType === 'info' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Information
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('tour')}
                    className={`py-1.5 rounded-lg font-bold transition-colors ${
                      requestType === 'tour' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Réserver Visite
                  </button>
                </div>

                {isSent ? (
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-center font-bold">
                    ✓ Demande envoyée directement à l'agent !
                  </div>
                ) : (
                  <form onSubmit={handleSendLead} className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="Votre nom"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />

                    <input
                      type="email"
                      required
                      placeholder="Votre email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />

                    <input
                      type="tel"
                      required
                      placeholder="Téléphone"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />

                    {requestType === 'tour' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={tourDate}
                          onChange={(e) => setTourDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                        />
                        <input
                          type="time"
                          value={tourTime}
                          onChange={(e) => setTourTime(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 text-slate-900 focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    )}

                    <textarea
                      rows={3}
                      value={leadMessage}
                      onChange={(e) => setLeadMessage(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                    />

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs hover:scale-[1.01] transition-transform shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Envoyez la demande
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Navigation / Return to Home Banner */}
          <div className="pt-6 pb-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => {
                setActivePropertyModalId(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
              title="Quitter la fiche et retourner à la liste complète des annonces"
            >
              <Home className="w-4 h-4" />
              <span>← Retour à l'Accueil & Voir toutes les annonces de Kinshasa</span>
            </button>
            <p className="text-[11px] text-slate-500 text-center sm:text-right">
              Réf. Annonce : <span className="font-mono text-emerald-700 font-bold">{property.id}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Schedule Visit Modal */}
      <ScheduleVisitModal
        property={property}
        isOpen={isScheduleVisitOpen}
        onClose={() => setIsScheduleVisitOpen(false)}
      />

      {/* Report Listing Modal */}
      <ReportListingModal
        property={property}
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={addPropertyReport}
      />
    </div>
  );
};
