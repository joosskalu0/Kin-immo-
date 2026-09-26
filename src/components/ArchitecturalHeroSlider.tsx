import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ArchitecturalSlide, INITIAL_ARCHITECTURAL_SLIDES } from '../types/heroShowcase';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Sparkles,
  ArrowRight,
  Phone,
  MessageCircle,
  ShieldCheck,
  Building,
  Building2,
  Key,
  X,
  Sliders,
  Settings,
  Mail,
  Users,
  CheckCircle2,
  Clock,
  ExternalLink,
  Briefcase,
  FileText
} from 'lucide-react';

interface ArchitecturalHeroSliderProps {
  onDiscoverSlide?: (slide: ArchitecturalSlide) => void;
  onExploreCommune?: (commune: string) => void;
  onNavigateToAgencies?: () => void;
  onNavigateToConciergerie?: () => void;
}

export const ArchitecturalHeroSlider: React.FC<ArchitecturalHeroSliderProps> = ({
  onDiscoverSlide,
  onExploreCommune,
  onNavigateToAgencies,
  onNavigateToConciergerie
}) => {
  const { heroSlides, contactSettings, properties, agencies, agents } = useApp();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedSlideDetails, setSelectedSlideDetails] = useState<ArchitecturalSlide | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  // Résolution stricte et automatique de l'agence mandataire pour chaque bien mis en avant
  // afin de NE JAMAIS envoyer vers le compte WhatsApp de l'administrateur
  const getAgencyContactForSlide = (slide: ArchitecturalSlide) => {
    const adminNumber = '845294616';
    const isHoldingAdminNumber = (num?: string) => Boolean(num && num.replace(/[^0-9]/g, '').includes(adminNumber));

    // 1. Si la slide possède son propre WhatsApp d'agence valide (non administrateur)
    if (slide.contactWhatsapp && !isHoldingAdminNumber(slide.contactWhatsapp)) {
      return {
        name: slide.contactName || 'Agence Immo Kin Gombe SARL',
        role: slide.contactRole || 'Agence Mandataire Exclusif',
        phone: (slide.contactPhone && !isHoldingAdminNumber(slide.contactPhone)) ? slide.contactPhone : slide.contactWhatsapp,
        whatsapp: slide.contactWhatsapp,
        email: slide.contactEmail || 'mandats@kinimmo.com',
        legalStatus: slide.legalStatus || 'Titre Foncier Définitif & Certificat Notarié Conforme'
      };
    }

    // 2. Si la slide est rattachée à un bien du catalogue (propertyId)
    if (slide.propertyId) {
      const prop = properties.find((p) => p.id === slide.propertyId);
      if (prop) {
        const propAgency = prop.agencyId ? agencies.find((a) => a.id === prop.agencyId || a.name === prop.agencyName) : null;
        const propAgent = prop.agentId ? agents.find((ag) => ag.id === prop.agentId) : null;

        if (propAgency?.whatsapp && !isHoldingAdminNumber(propAgency.whatsapp)) {
          return {
            name: propAgency.name,
            role: 'Agence Mandataire Exclusif',
            phone: propAgency.phone || propAgency.whatsapp,
            whatsapp: propAgency.whatsapp,
            email: propAgency.email || 'agence@kinimmo.com',
            legalStatus: prop.customFields?.titre_foncier || 'Mandat Exclusif & Titre Foncier en Règle'
          };
        }
        if (propAgent?.whatsapp && !isHoldingAdminNumber(propAgent.whatsapp)) {
          return {
            name: propAgent.name,
            role: propAgent.agencyName ? `Agence ${propAgent.agencyName}` : 'Agent Mandataire Référent',
            phone: propAgent.phone || propAgent.whatsapp,
            whatsapp: propAgent.whatsapp,
            email: propAgent.email || 'agent@kinimmo.com',
            legalStatus: prop.customFields?.titre_foncier || 'Mandat Déclaré & Certificat d’Enregistrement'
          };
        }
        if (prop.contactPhone && !isHoldingAdminNumber(prop.contactPhone)) {
          return {
            name: prop.agencyName || 'Service Commercial Agence Mandataire',
            role: 'Mandataire Agréé',
            phone: prop.contactPhone,
            whatsapp: prop.contactPhone,
            email: 'contact@kinimmo.com',
            legalStatus: prop.customFields?.titre_foncier || 'Titre Foncier Validé'
          };
        }
      }
    }

    // 3. Correspondance avec les diapositives architecturales par défaut
    const defaultSlide = INITIAL_ARCHITECTURAL_SLIDES.find((d) => d.id === slide.id);
    if (defaultSlide && defaultSlide.contactWhatsapp && !isHoldingAdminNumber(defaultSlide.contactWhatsapp)) {
      return {
        name: defaultSlide.contactName || 'Agence Immo Kin Gombe SARL',
        role: defaultSlide.contactRole || 'Agence Mandataire Agréée',
        phone: defaultSlide.contactPhone || defaultSlide.contactWhatsapp,
        whatsapp: defaultSlide.contactWhatsapp,
        email: defaultSlide.contactEmail || 'contact@kinimmo.com',
        legalStatus: defaultSlide.legalStatus || 'Titre Foncier Garanti'
      };
    }

    // 4. Correspondance par commune parmi les agences enregistrées
    const agencyInCommune = agencies.find((a) => a.commune?.toLowerCase() === slide.commune?.toLowerCase());
    if (agencyInCommune?.whatsapp && !isHoldingAdminNumber(agencyInCommune.whatsapp)) {
      return {
        name: agencyInCommune.name,
        role: 'Agence Mandataire Locale Certifiée',
        phone: agencyInCommune.phone || agencyInCommune.whatsapp,
        whatsapp: agencyInCommune.whatsapp,
        email: agencyInCommune.email,
        legalStatus: 'Agence Agréée RCCM & Mandat Conforme'
      };
    }

    // 5. Agence partenaire vérifiée de référence (jamais l'administrateur)
    const fallbackAgency = agencies[0] || {
      name: 'Congo Luxury Homes & Development',
      phone: '+243 81 000 0001',
      whatsapp: '+243 81 000 0001',
      email: 'contact@congoluxuryhomes.cd'
    };

    return {
      name: fallbackAgency.name || 'Agence Immo Kin Gombe SARL',
      role: 'Agence Mandataire Agréée',
      phone: fallbackAgency.phone || '+243 82 123 4567',
      whatsapp: fallbackAgency.whatsapp || '+243 82 123 4567',
      email: fallbackAgency.email || 'agence@kinimmo.com',
      legalStatus: 'Certificat d’Enregistrement Notarié & Titre Foncier Conforme'
    };
  };

  // Active slides that are enabled for display
  const activeSlides = (heroSlides && heroSlides.length > 0)
    ? heroSlides.filter((s) => s.isActive !== false)
    : INITIAL_ARCHITECTURAL_SLIDES;

  const displaySlides = activeSlides.length > 0 ? activeSlides : (heroSlides && heroSlides.length > 0 ? heroSlides : INITIAL_ARCHITECTURAL_SLIDES);

  // Keep index within bounds if list changes
  useEffect(() => {
    if (currentIndex >= displaySlides.length) {
      setCurrentIndex(0);
    }
  }, [displaySlides.length, currentIndex]);

  const currentSlide = displaySlides[currentIndex] || displaySlides[0] || INITIAL_ARCHITECTURAL_SLIDES[0];
  const currentAgency = getAgencyContactForSlide(currentSlide);

  // Auto-play timer (transitions every 7.5 seconds)
  useEffect(() => {
    if (isPaused || selectedSlideDetails !== null || displaySlides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displaySlides.length);
    }, 7500);

    return () => clearInterval(timer);
  }, [isPaused, selectedSlideDetails, displaySlides.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displaySlides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + displaySlides.length) % displaySlides.length);
  };

  // Touch Swipe for mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleOpenDetails = (slide: ArchitecturalSlide) => {
    setSelectedSlideDetails(slide);
    if (onDiscoverSlide) {
      onDiscoverSlide(slide);
    }
  };

  const handleContactWhatsApp = (slide: ArchitecturalSlide) => {
    // Utiliser exclusivement le WhatsApp propre à l'agence ou mandataire assigné à ce bien
    const agencyContact = getAgencyContactForSlide(slide);
    const rawWhatsApp = agencyContact.whatsapp.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Bonjour ${agencyContact.name}, je vous contacte directement concernant le bien d'exception mis en avant "${slide.title}" situé à ${slide.badgeLocation}. Pouvez-vous me transmettre les disponibilités et convenir d'une visite ?`
    );
    window.open(`https://wa.me/${rawWhatsApp}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="relative w-full mb-6">
      {/* Main Full-Bleed Architectural Slider Container */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full h-[580px] sm:h-[620px] lg:h-[680px] rounded-3xl overflow-hidden shadow-2xl bg-slate-950 border border-slate-800/80 group select-none"
      >
        {/* Background Image Slides with Smooth Fade Transition */}
        {displaySlides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className={`w-full h-full object-cover object-center transform transition-transform duration-10000 ease-out ${
                idx === currentIndex ? 'scale-105' : 'scale-100'
              }`}
            />
            {/* Cinematic Gradient Overlays (matching the Safricode luxury mobile style) */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/65 to-slate-900/40" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(16,185,129,0.12),_transparent_60%)]" />
          </div>
        ))}

        {/* Top Floating Badge Bar with slide counter & Admin Shortcut */}
        <div className="absolute top-6 left-6 right-6 z-20 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]" />
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-300 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-500/30 shadow-lg">
              KINIMMO PRESTIGE • KINSHASA
            </span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white font-mono text-xs font-bold shadow-lg">
              <span className="text-emerald-400">0{currentIndex + 1}</span>
              <span className="text-slate-400 mx-1">/</span>
              <span className="text-slate-400">0{displaySlides.length}</span>
            </div>
          </div>
        </div>

        {/* Architectural Content Layer (Exact Presentation Style from the User's Video) */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 sm:p-10 lg:p-16 max-w-4xl">
          {/* Category & Location Badge */}
          <div className="inline-flex items-center gap-2.5 mb-3 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{currentSlide.badgeCategory}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentSlide.badgeLocation}</span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[11px] font-bold">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Agence Référente : {currentAgency.name} • {currentAgency.whatsapp}</span>
            </div>
          </div>

          {/* Bold Impact Title (Uppercase, Architectural, Clean) */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-[1.15] mb-3 text-shadow-sm drop-shadow-md">
            {currentSlide.title}
          </h1>

          {/* Subtitle Headline */}
          <h2 className="text-xs sm:text-sm lg:text-base font-bold uppercase tracking-wider text-emerald-300/95 mb-4">
            {currentSlide.subTitle}
          </h2>

          {/* Architectural Description */}
          <p className="text-xs sm:text-sm text-slate-200/90 leading-relaxed font-normal mb-6 max-w-2xl line-clamp-3 sm:line-clamp-4">
            {currentSlide.description}
          </p>

          {/* Quick Specifications Pill Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 max-w-2xl">
            {currentSlide.stats.floors && (
              <div className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <span className="text-[10px] text-slate-300 block uppercase font-semibold">Hauteur</span>
                <span className="text-xs sm:text-sm font-black text-emerald-300">{currentSlide.stats.floors}</span>
              </div>
            )}
            {currentSlide.stats.units && (
              <div className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <span className="text-[10px] text-slate-300 block uppercase font-semibold">Capacité</span>
                <span className="text-xs sm:text-sm font-black text-white">{currentSlide.stats.units}</span>
              </div>
            )}
            {currentSlide.stats.parking && (
              <div className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <span className="text-[10px] text-slate-300 block uppercase font-semibold">Parking Sécurisé</span>
                <span className="text-xs sm:text-sm font-black text-white">{currentSlide.stats.parking}</span>
              </div>
            )}
            {currentSlide.stats.surface && (
              <div className="px-3 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white">
                <span className="text-[10px] text-slate-300 block uppercase font-semibold">Surfaces</span>
                <span className="text-xs sm:text-sm font-black text-emerald-300">{currentSlide.stats.surface}</span>
              </div>
            )}
          </div>

          {/* Action Buttons (Style Safricode: "Découvrir" button with sleek glass style) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => handleOpenDetails(currentSlide)}
              className="px-6 py-3.5 rounded-2xl bg-white/15 hover:bg-emerald-500 hover:text-slate-950 text-white font-black text-xs sm:text-sm tracking-wider uppercase border border-white/30 backdrop-blur-md shadow-xl transition-all duration-300 flex items-center gap-2.5 active:scale-95 cursor-pointer group/btn"
            >
              <span>Découvrir</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </button>

            <button
              onClick={() => handleContactWhatsApp(currentSlide)}
              className="px-5 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm tracking-wider uppercase shadow-lg shadow-emerald-500/25 transition-all duration-300 flex items-center gap-2 active:scale-95 cursor-pointer"
              title={`Échanger directement avec l'agence ${currentAgency.name} sur WhatsApp (${currentAgency.whatsapp})`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Agence</span>
            </button>

            <a
              href={`tel:${currentAgency.phone.replace(/\s+/g, '')}`}
              className="px-4 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm tracking-wider uppercase border border-white/20 backdrop-blur-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
              title={`Appeler directement l'agence ${currentAgency.name} au ${currentAgency.phone}`}
            >
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">{currentAgency.phone}</span>
              <span className="sm:hidden">Appel Agence</span>
            </a>

            {onExploreCommune && (
              <button
                onClick={() => onExploreCommune(currentSlide.commune)}
                className="hidden sm:inline-flex px-4 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs border border-white/10 backdrop-blur-md transition-all cursor-pointer items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Voir biens à {currentSlide.commune}</span>
              </button>
            )}
          </div>
        </div>

        {/* Carousel Slide Indicators at the Bottom */}
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
          {displaySlides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Aller au slide ${idx + 1}`}
              className={`h-2 transition-all duration-300 rounded-full cursor-pointer ${
                idx === currentIndex
                  ? 'w-8 bg-emerald-400 shadow-[0_0_8px_#10b981]'
                  : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* Interactive Navigation Arrows (Left / Right) */}
        {displaySlides.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              aria-label="Projet précédent"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-950/60 hover:bg-emerald-500 hover:text-slate-950 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 active:scale-90 cursor-pointer shadow-lg"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={handleNext}
              aria-label="Projet suivant"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-slate-950/60 hover:bg-emerald-500 hover:text-slate-950 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 active:scale-90 cursor-pointer shadow-lg"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Modal Detailed Project Discovery ("Découvrir") */}
      {selectedSlideDetails && (() => {
        const vip = contactSettings?.vipConcierge;
        const slideAgency = getAgencyContactForSlide(selectedSlideDetails);
        const slideDirectPhone = slideAgency.phone || '+243 82 123 4567';
        const cleanSlidePhone = slideDirectPhone.replace(/\s+/g, '');
        const rawSlideWhatsApp = slideAgency.whatsapp.replace(/[^0-9]/g, '');
        const slideEmail = slideAgency.email || 'mandats@kinimmo.com';
        const agencyName = slideAgency.name;
        const agencyRole = slideAgency.role;
        const legalStatusGuarantee = slideAgency.legalStatus || selectedSlideDetails.legalStatus || 'Titre Foncier Définitif & Certificat Notarié Conforme';

        const conciergeRawWhatsApp = (vip?.whatsapp || contactSettings?.supportWhatsApp || '+243845294616').replace(/[^0-9]/g, '');
        const conciergePhone = vip?.phone || contactSettings?.supportPhone || '+243 84 529 4616';
        const conciergeEmail = vip?.email || contactSettings?.contactEmail || 'joosskalu72@gmail.com';
        const conciergeHours = vip?.workingHours || '7j/7 • 08h00 - 20h00';

        const handleContactAgencyWhatsApp = () => {
          const text = encodeURIComponent(
            `Bonjour ${agencyName}, je vous contacte directement concernant le bien d'exception mis en avant "${selectedSlideDetails.title}" situé à ${selectedSlideDetails.badgeLocation}. Pouvez-vous me transmettre les disponibilités et convenir d'une visite privée ?`
          );
          window.open(`https://wa.me/${rawSlideWhatsApp}?text=${text}`, '_blank', 'noopener,noreferrer');
        };

        const handleAgencyEmail = () => {
          const subject = encodeURIComponent(`Demande d'informations & Dossier Technique - ${selectedSlideDetails.title}`);
          const body = encodeURIComponent(`Bonjour ${agencyName},\n\nJe suis intéressé(e) par le bien d'exception "${selectedSlideDetails.title}" situé à ${selectedSlideDetails.badgeLocation}.\nMerci de me transmettre la brochure complète ainsi que les disponibilités pour une visite privée.\n\nCordialement.`);
          window.location.href = `mailto:${slideEmail}?subject=${subject}&body=${body}`;
        };

        const handleConciergeB2BWhatsApp = () => {
          const text = encodeURIComponent(vip?.partnerMessage || `Bonjour Conciergerie KINIMMO Partenariats, je souhaite échanger sur une opportunité de collaboration professionnelle au sujet du bien "${selectedSlideDetails.title}".`);
          window.open(`https://wa.me/${conciergeRawWhatsApp}?text=${text}`, '_blank', 'noopener,noreferrer');
        };

        const handleInterAgencyWhatsApp = () => {
          const text = encodeURIComponent(`Bonjour Conciergerie KINIMMO, je suis une agence/un confrère immobilier et je souhaite collaborer en inter-cabinet pour proposer un client acquéreur sur le mandat "${selectedSlideDetails.title}" (${selectedSlideDetails.badgeLocation}).`);
          window.open(`https://wa.me/${conciergeRawWhatsApp}?text=${text}`, '_blank', 'noopener,noreferrer');
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700/80 text-white shadow-2xl p-5 sm:p-8 space-y-6">
              
              {/* Bouton Fermer */}
              <button
                onClick={() => setSelectedSlideDetails(null)}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer z-10"
                title="Fermer la fiche détaillée"
              >
                <X className="w-5 h-5" />
              </button>

              {/* 1. EN-TÊTE DU BIEN MIS EN AVANT */}
              <div className="space-y-2 pr-12">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{selectedSlideDetails.badgeCategory} • {selectedSlideDetails.badgeLocation}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold">
                    <Building className="w-3 h-3 text-emerald-400" />
                    <span>{selectedSlideDetails.propertyType}</span>
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-snug">
                  {selectedSlideDetails.title}
                </h3>
                <p className="text-xs sm:text-sm text-emerald-400 font-bold uppercase tracking-wider">
                  {selectedSlideDetails.subTitle}
                </p>
              </div>

              {/* 2. GRAND VISUEL DU BIEN AVEC BADGES DE STATUT */}
              <div className="relative rounded-2xl overflow-hidden h-64 sm:h-80 w-full shadow-lg border border-slate-800 group">
                <img
                  src={selectedSlideDetails.image}
                  alt={selectedSlideDetails.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                
                {/* Badges superposés */}
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700 text-white text-[11px] font-bold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedSlideDetails.commune}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedSlideDetails.legalStatus || 'Certificat Notarié & Titre Foncier en Règle'}</span>
                    </span>
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider">
                    {selectedSlideDetails.details.deliveryDate || 'Disponible'}
                  </span>
                </div>
              </div>

              {/* 3. FICHE TECHNIQUE & SPÉCIFICATIONS DU BIEN */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Fiche Technique & Spécifications du Bien</span>
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Superficie</span>
                    <span className="text-sm font-black text-white">{selectedSlideDetails.stats.surface || 'Sur mesure'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Niveaux / Étages</span>
                    <span className="text-sm font-black text-white">{selectedSlideDetails.stats.floors || 'Standing'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Capacité / Unités</span>
                    <span className="text-sm font-black text-white">{selectedSlideDetails.stats.units || 'Multiple'}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-0.5">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Stationnement</span>
                    <span className="text-sm font-black text-white">{selectedSlideDetails.stats.parking || 'Sécurisé'}</span>
                  </div>
                </div>
              </div>

              {/* 4. DESCRIPTIF ARCHITECTURAL DU BIEN */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Descriptif Architectural & Aménagements</span>
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
                  {selectedSlideDetails.description}
                </p>
              </div>

              {/* 5. PRESTATIONS & ÉQUIPEMENTS DE STANDING */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Équipements & Prestations Certifiées</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedSlideDetails.details.amenities.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5 text-xs text-slate-200"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. TARIFICATION & CONDITIONS D'ACQUISITION */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-0.5 text-center sm:text-left">
                  <span className="text-[10px] text-emerald-300 uppercase font-black tracking-widest block">
                    Tarification & Conditions Officielles
                  </span>
                  <span className="text-lg sm:text-xl font-black text-white">{selectedSlideDetails.details.priceInfo}</span>
                  <span className="text-[11px] text-slate-400 block font-medium">
                    {selectedSlideDetails.details.deliveryDate} • Modalités échelonnées ou comptant
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={handleContactAgencyWhatsApp}
                    className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                    title={`Contacter directement l'agence ${agencyName} sur WhatsApp (${slideAgency.whatsapp})`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Programmer une Visite (WhatsApp Agence)</span>
                  </button>
                  <a
                    href={`tel:${cleanSlidePhone}`}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                    title={`Appeler directement l'agence au ${slideDirectPhone}`}
                  >
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span className="hidden sm:inline">Appel Agence</span>
                  </a>
                </div>
              </div>

              {/* 7. CONTACT DIRECT DE L'AGENCE MANDATAIRE OU DU PROMOTEUR POUR CE BIEN */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-800/90 border border-slate-700 space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono">
                        MANDATAIRE RÉFÉRENT & CONTACT DIRECT OFFICIEL DU BIEN
                      </span>
                    </div>
                    <h5 className="text-base font-black text-white">
                      {agencyName}
                    </h5>
                    <p className="text-xs text-slate-400 font-medium">
                      Qualité : <span className="text-emerald-300 font-bold">{agencyRole}</span> • Mandat officiel certifié • {legalStatusGuarantee}
                    </p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>WhatsApp Direct : {slideAgency.whatsapp}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Cette annonce est commercialisée sous mandat officiel certifié. En cliquant sur le bouton ci-dessous, vous échangez <strong className="text-emerald-300">directement sur le numéro WhatsApp propre à l'agence {agencyName} ({slideAgency.whatsapp})</strong> sans intermédiaire ni redirection vers un compte central administrateur.
                </p>

                {/* Actions directes de contact vers l'agence */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Appel direct */}
                  <a
                    href={`tel:${cleanSlidePhone}`}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer group active:scale-95"
                    title={`Appeler directement l'agence : ${slideDirectPhone}`}
                  >
                    <Phone className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <span className="block text-[10px] text-slate-400 font-normal">Téléphone Agence</span>
                      <span className="font-mono text-white text-xs">{slideDirectPhone}</span>
                    </div>
                  </a>

                  {/* WhatsApp Direct Agence */}
                  <button
                    type="button"
                    onClick={handleContactAgencyWhatsApp}
                    className="p-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer group active:scale-95"
                    title={`Échanger avec ${agencyName} sur WhatsApp (${slideAgency.whatsapp})`}
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <span className="block text-[10px] text-emerald-400/80 font-normal">WhatsApp Agence Direct</span>
                      <span className="font-bold text-white text-xs">{slideAgency.whatsapp}</span>
                    </div>
                  </button>

                  {/* Email Direct Agence */}
                  <button
                    type="button"
                    onClick={handleAgencyEmail}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer group active:scale-95"
                    title={`Envoyer un email à l'agence : ${slideEmail}`}
                  >
                    <Mail className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                      <span className="block text-[10px] text-slate-400 font-normal">Courriel Agence</span>
                      <span className="text-xs font-bold text-white truncate max-w-[140px] block">
                        Demander le dossier
                      </span>
                    </div>
                  </button>
                </div>

                {/* Possibilité de contacter d'autres agences partenaires pour ce secteur */}
                {agencies && agencies.length > 1 && (
                  <div className="pt-3 border-t border-slate-700/60 space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Autres agences partenaires accréditées disponibles pour ce secteur :</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {agencies
                        .filter((ag) => ag.name !== agencyName && ag.whatsapp)
                        .slice(0, 3)
                        .map((otherAgency) => {
                          const otherWaClean = otherAgency.whatsapp ? otherAgency.whatsapp.replace(/[^0-9]/g, '') : '';
                          const otherMsg = encodeURIComponent(
                            `Bonjour ${otherAgency.name}, je consulte le bien d'exception "${selectedSlideDetails.title}" à ${selectedSlideDetails.badgeLocation} sur Kinimmo et je souhaite savoir si vous avez des biens similaires ou un mandat équivalent.`
                          );
                          return (
                            <div
                              key={otherAgency.id}
                              className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center justify-between gap-2 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-white block truncate">{otherAgency.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono block">{otherAgency.whatsapp}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => window.open(`https://wa.me/${otherWaClean}?text=${otherMsg}`, '_blank', 'noopener,noreferrer')}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shrink-0"
                                title={`Contacter ${otherAgency.name} sur WhatsApp`}
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>WhatsApp</span>
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* 8. ESPACE CONCIERGERIE & QUI SOMMES-NOUS ? (EN BAS DU BIEN) */}
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-2 border-emerald-500/30 text-white space-y-5 shadow-2xl relative overflow-hidden">
                {/* Décoration d'arrière-plan */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                {/* En-tête institutionnel Qui Sommes-Nous */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-slate-800">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 font-mono">
                        RÉSEAU OFFICIEL KINIMMO • CONCIERGERIE B2B & RELATIONS PROFESSIONNELLES
                      </span>
                    </div>
                    <h4 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                      Qui Sommes-Nous & Quel Est le Rôle de la Conciergerie ?
                    </h4>
                    <p className="text-xs text-slate-400">
                      Plateforme d'intermédiation neutre et certifiée pour l'immobilier d'excellence à Kinshasa
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-mono font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{conciergeHours}</span>
                    </span>
                  </div>
                </div>

                {/* Présentation institutionnelle : Qui Sommes-Nous */}
                <div className="text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
                  <p>
                    <strong className="text-white">Kinimmo</strong> est le réseau d'intermédiation immobilière de référence en République Démocratique du Congo. Notre plateforme n'est pas la vitrine exclusive d'une seule personne ou d'une régie unique : <span className="text-emerald-300 font-medium">nous fédérons et certifions l'ensemble des agences immobilières agréées, cabinets de courtage, agents mandataires accrédités et promoteurs de programmes neufs</span> opérant à Gombe, Ngaliema, Limete, Kintambo et dans tout Kinshasa.
                  </p>
                  <p className="text-slate-400 text-xs">
                    Le rôle de la <strong className="text-slate-200">Conciergerie Kinimmo</strong> est d'assurer la vérification préalable de la conformité juridique des titres fonciers, d'assister les acquéreurs et locataires avec une stricte neutralité, et de coordonner directement les échanges avec les agences titulaires des mandats.
                  </p>
                </div>

                {/* 3 Cartes de mission conciergerie */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <h5 className="text-xs font-black text-white uppercase tracking-wider">
                      Audit Notarié & Titres
                    </h5>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Vérification des certificats d'enregistrement et permis de bâtir sans litige foncier.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <h5 className="text-xs font-black text-white uppercase tracking-wider">
                      Accompagnement Neutre
                    </h5>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Assistance personnalisée gratuite pour guider votre acquisition vers l'agence légitime.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <h5 className="text-xs font-black text-white uppercase tracking-wider">
                      Synergies Inter-Agences
                    </h5>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Plateforme collaborative permettant aux confrères de travailler en mandat partagé sécurisé.
                    </p>
                  </div>
                </div>

                {/* Actions directes vers la conciergerie et les partenariats */}
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                        Vous êtes une agence, un agent ou un promoteur ?
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Collaborez sur ce bien en inter-cabinet ou rejoignez le réseau officiel Kinimmo.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleInterAgencyWhatsApp}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                      >
                        <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Collaborer sur ce mandat</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleConciergeB2BWhatsApp}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Contacter la Conciergerie B2B</span>
                      </button>
                    </div>
                  </div>

                  {/* Coordonnées officielles du siège et navigation */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-slate-400">
                    <div className="flex flex-wrap items-center gap-4">
                      <a
                        href={`tel:${conciergePhone.replace(/\s+/g, '')}`}
                        className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                        <span>Ligne Pro : {conciergePhone}</span>
                      </a>
                      <a
                        href={`mailto:${conciergeEmail}`}
                        className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                      >
                        <Mail className="w-3 h-3 text-emerald-400" />
                        <span>{conciergeEmail}</span>
                      </a>
                    </div>

                    {onNavigateToAgencies && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSlideDetails(null);
                          onNavigateToAgencies();
                        }}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Consulter l'Annuaire de toutes les Agences Partenaires</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
