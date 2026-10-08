import React, { useState, useEffect } from 'react';
import { Advertisement } from '../../types';
import { mysqlApi } from '../../services/mysqlApi';
import {
  ExternalLink,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Award
} from 'lucide-react';

interface AdvertisementBannerProps {
  placement?: 'home_hero' | 'search_top' | 'sidebar' | 'footer_banner' | 'in_feed' | 'interstitial';
  category?: string;
  className?: string;
}

export const AdvertisementBanner: React.FC<AdvertisementBannerProps> = ({
  placement = 'home_hero',
  category,
  className = ''
}) => {
  const [ads, setAds] = useState<Advertisement[]>(() => {
    const initial = mysqlApi.getLocalAds();
    return initial.filter(a => (placement as string) === 'all' || a.placement === placement || (placement === 'in_feed' && (a.placement === 'search_top' || a.placement === 'home_hero')));
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const loadAds = async () => {
    try {
      const res = await mysqlApi.getAdvertisements(placement, category);
      if (res.success && res.advertisements && res.advertisements.length > 0) {
        setAds(res.advertisements);
      } else {
        const local = mysqlApi.getLocalAds();
        setAds(local);
      }
    } catch (err) {
      const local = mysqlApi.getLocalAds();
      setAds(local);
    }
  };

  useEffect(() => {
    loadAds();

    const handleAdsUpdated = () => loadAds();
    window.addEventListener('kinimmo_ads_updated', handleAdsUpdated);

    return () => {
      window.removeEventListener('kinimmo_ads_updated', handleAdsUpdated);
    };
  }, [placement, category]);

  // Affichage stable sans bascule automatique (navigation manuelle possible)

  // Liste des publicités
  const displayAds = ads.length > 0 ? ads : mysqlApi.getLocalAds();
  const currentAd = displayAds[currentIndex % displayAds.length] || displayAds[0];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % displayAds.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + displayAds.length) % displayAds.length);
  };

  const handleAdClick = async () => {
    if (!currentAd) return;
    try {
      await mysqlApi.trackAdClick(currentAd.id);
    } catch (e) {}

    if (currentAd.target_url) {
      window.open(currentAd.target_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleWhatsAppContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentAd) return;
    mysqlApi.trackAdClick(currentAd.id).catch(() => {});
    const phone = (currentAd.advertiser_phone || currentAd.advertiser_contact)?.replace(/[^0-9]/g, '') || '243810000000';
    const message = encodeURIComponent(`Bonjour ${currentAd.advertiser_name}, j'ai vu votre annonce "${currentAd.title}" sur Kinshasa Immobilier et je souhaite obtenir des informations.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  if (!currentAd) return null;

  // Format Pancarte in-feed (Insérée dans la grille des biens)
  if (placement === 'in_feed') {
    return (
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={`group relative rounded-3xl overflow-hidden bg-white border border-slate-200 text-slate-900 shadow-sm flex flex-col justify-between transition-all duration-300 hover:border-emerald-500 hover:shadow-md ${className}`}
      >
        {/* Pancarte Top Badge */}
        <div className="p-3.5 sm:p-4 pb-0 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            <span>Espace Publicitaire & Sponsor • Kinshasa</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <span>{currentAd.advertiser_name}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>

        {/* Pancarte Content */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div
            onClick={handleAdClick}
            className="w-full sm:w-1/3 h-36 sm:h-40 rounded-2xl overflow-hidden relative cursor-pointer group/img flex-shrink-0 border border-slate-200"
          >
            <img
              src={currentAd.image_url}
              alt={currentAd.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent flex items-end p-2.5">
              <span className="text-[10px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-md">
                Annonceur Certifié
              </span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {currentAd.category || 'Construction & Immobilier'}
              </span>
            </div>

            <h3
              onClick={handleAdClick}
              className="text-base sm:text-lg font-black text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer leading-tight"
            >
              {currentAd.title}
            </h3>

            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
              {currentAd.description || currentAd.alt_text || currentAd.title}
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              {(currentAd.advertiser_phone || currentAd.advertiser_contact) && (
                <button
                  onClick={handleWhatsAppContact}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                  <span>WhatsApp (+243)</span>
                </button>
              )}

              {currentAd.target_url && (
                <button
                  onClick={handleAdClick}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all border border-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Consulter l'Offre</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info & pagination */}
        <div className="px-3.5 sm:p-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Espace certifié par Kinshasa Immobilier</span>
          </div>

          {displayAds.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                title="Précédent"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-600">
                {currentIndex + 1}/{displayAds.length}
              </span>
              <button
                onClick={handleNext}
                className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
                title="Suivant"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Format Grand Écran / Home Hero (Espace Publicitaire & Sponsor)
  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`group relative rounded-3xl overflow-hidden bg-white border border-slate-200 text-slate-900 shadow-sm transition-all duration-300 hover:border-emerald-500/50 ${className}`}
    >
      {/* Top Bar Pancarte */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <Award className="w-3 h-3 text-emerald-600" />
            Espace Publicitaire & Sponsor • RDC
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-slate-600 font-semibold hidden sm:inline">
            {currentAd.advertiser_name}
          </span>
        </div>

        {displayAds.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
              title="Précédent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-500 px-1">
              {currentIndex + 1}/{displayAds.length}
            </span>
            <button
              onClick={handleNext}
              className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
              title="Suivant"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Banner Body */}
      <div className="relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src={currentAd.image_url}
            alt={currentAd.title}
            className="w-full h-full object-cover object-center filter brightness-[0.25] group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 p-4 sm:p-6 flex flex-col justify-between min-h-[140px] sm:min-h-[160px]">
          <div className="max-w-2xl space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/20">
                {currentAd.category || 'Annonceur Officiel'}
              </span>
              <span className="text-xs text-slate-200 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Vérifié Kinshasa
              </span>
            </div>

            <h3
              onClick={handleAdClick}
              className="text-base sm:text-xl font-black text-white hover:text-emerald-300 transition-colors cursor-pointer leading-snug drop-shadow-md"
            >
              {currentAd.title}
            </h3>

            <p className="text-xs text-slate-200 leading-relaxed line-clamp-2 max-w-xl">
              {currentAd.description || currentAd.alt_text || currentAd.title}
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {(currentAd.advertiser_phone || currentAd.advertiser_contact) && (
                <button
                  onClick={handleWhatsAppContact}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-md active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>WhatsApp (+243)</span>
                </button>
              )}

              {currentAd.target_url && (
                <button
                  onClick={handleAdClick}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/25 backdrop-blur-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Visiter le Site</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-200" />
                </button>
              )}
            </div>

            {/* Indicator dots */}
            {displayAds.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5">
                {displayAds.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      idx === currentIndex ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Aller au sponsor ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
