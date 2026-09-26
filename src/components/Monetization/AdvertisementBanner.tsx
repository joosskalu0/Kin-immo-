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

  // Rotation automatique toutes les 6 secondes si non survolé
  useEffect(() => {
    if (ads.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [ads.length, isPaused]);

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
    const phone = currentAd.advertiser_phone?.replace(/[^0-9]/g, '') || '243810000000';
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
        className={`group relative rounded-2xl overflow-hidden bg-slate-900 border border-emerald-500/30 text-white shadow-lg flex flex-col justify-between transition-all duration-300 hover:border-emerald-400/50 hover:shadow-xl ${className}`}
      >
        {/* Pancarte Top Badge */}
        <div className="p-3.5 sm:p-4 pb-0 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Pancarte Partenaire • RDC</span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <span>{currentAd.advertiser_name}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Pancarte Content */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div
            onClick={handleAdClick}
            className="w-full sm:w-1/3 h-36 sm:h-40 rounded-xl overflow-hidden relative cursor-pointer group/img flex-shrink-0"
          >
            <img
              src={currentAd.image_url}
              alt={currentAd.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2.5">
              <span className="text-[10px] font-bold text-white bg-emerald-600/90 px-2 py-0.5 rounded-md">
                Partenaire Vérifié
              </span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {currentAd.category || 'Construction & Immobilier'}
              </span>
            </div>

            <h3
              onClick={handleAdClick}
              className="text-base sm:text-lg font-black text-white hover:text-emerald-300 transition-colors cursor-pointer leading-tight"
            >
              {currentAd.title}
            </h3>

            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
              {currentAd.description}
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-2">
              {currentAd.advertiser_phone && (
                <button
                  onClick={handleWhatsAppContact}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Partenaire (+243)</span>
                </button>
              )}

              {currentAd.target_url && (
                <button
                  onClick={handleAdClick}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Consulter l'Offre</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer info & pagination */}
        <div className="px-3.5 sm:p-4 py-2 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Service vérifié par Kinshasa Immobilier</span>
          </div>

          {displayAds.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Précédent"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono">
                {currentIndex + 1}/{displayAds.length}
              </span>
              <button
                onClick={handleNext}
                className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
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

  // Format Grand Écran / Home Hero (Pancarte Partenaire Principale)
  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 text-white shadow-lg transition-all duration-300 hover:border-emerald-500/50 ${className}`}
    >
      {/* Top Bar Pancarte */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-950/90 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <Award className="w-3 h-3 text-emerald-400" />
            Pancarte Partenaire • RDC
          </span>
          <span className="text-white/20 hidden sm:inline">|</span>
          <span className="text-slate-300 font-medium hidden sm:inline">
            {currentAd.advertiser_name}
          </span>
        </div>

        {displayAds.length > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Partenaire précédent"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-slate-400 px-1">
              {currentIndex + 1}/{displayAds.length}
            </span>
            <button
              onClick={handleNext}
              className="w-6 h-6 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Partenaire suivant"
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
            className="w-full h-full object-cover object-center filter brightness-[0.38] group-hover:scale-105 transition-transform duration-700 ease-out"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 p-4 sm:p-6 flex flex-col justify-between min-h-[140px] sm:min-h-[160px]">
          <div className="max-w-2xl space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/20">
                {currentAd.category || 'Partenaire Immobilier'}
              </span>
              <span className="text-xs text-slate-300 font-semibold flex items-center gap-1">
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

            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 max-w-xl">
              {currentAd.description}
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {currentAd.advertiser_phone && (
                <button
                  onClick={handleWhatsAppContact}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-slate-950" />
                  <span>WhatsApp Partenaire (+243)</span>
                </button>
              )}

              {currentAd.target_url && (
                <button
                  onClick={handleAdClick}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 backdrop-blur-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Visiter le Site</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-300" />
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
                      idx === currentIndex ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/30 hover:bg-white/60'
                    }`}
                    aria-label={`Aller au partenaire ${idx + 1}`}
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
