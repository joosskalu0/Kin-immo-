import React, { useState } from 'react';
import {
  MessageCircle,
  Phone,
  Mail,
  X,
  Building2,
  Briefcase,
  Clock,
  ArrowRight,
  ShieldCheck,
  Users,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface FloatingConciergeWidgetProps {
  onNavigateToConciergerie?: () => void;
}

export const FloatingConciergeWidget: React.FC<FloatingConciergeWidgetProps> = ({
  onNavigateToConciergerie
}) => {
  const { contactSettings } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const vip = contactSettings?.vipConcierge;

  // Si désactivé par l'administrateur
  if (vip && vip.enabled === false) {
    return null;
  }

  const rawWhatsApp = (vip?.whatsapp || contactSettings?.supportWhatsApp || '+243845294616').replace(/[^0-9]/g, '');
  const cleanPhone = (vip?.phone || contactSettings?.supportPhone || '+243845294616').replace(/\s+/g, '');
  const cleanEmail = vip?.email || contactSettings?.contactEmail || 'joosskalu72@gmail.com';
  
  const title = vip?.title || 'Conciergerie Partenariats & Agences';
  const subtitle = vip?.subtitle || 'Relations Professionnelles & Affiliations B2B';
  const description = vip?.description || 'Vous êtes une agence immobilière agréée, un agent indépendant, un promoteur de programmes neufs ou un propriétaire foncier ? Rejoignez le réseau officiel Kinimmo.';
  const displayPhone = vip?.phone || contactSettings?.supportPhone || '+243 84 529 4616';
  const workingHours = vip?.workingHours || '7j/7 • 08h00 - 20h00';

  const agentMsg = vip?.agentMessage || "Bonjour KINIMMO Partenariats, je suis une agence/un agent immobilier à Kinshasa et je souhaite collaborer avec votre plateforme pour diffuser mes annonces et mandats.";
  const partnerMsg = vip?.partnerMessage || "Bonjour KINIMMO Partenariats, je souhaite vous présenter un projet immobilier / programme neuf / partenariat d'affaires.";

  const handleAgencyWhatsApp = () => {
    const text = encodeURIComponent(agentMsg);
    window.open(`https://wa.me/${rawWhatsApp}?text=${text}`, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handlePartnerWhatsApp = () => {
    const text = encodeURIComponent(partnerMsg);
    window.open(`https://wa.me/${rawWhatsApp}?text=${text}`, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleCall = () => {
    window.location.href = `tel:${cleanPhone}`;
    setIsOpen(false);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Partenariat Professionnel B2B - ${contactSettings?.siteName || 'Kinimmo'}`);
    window.location.href = `mailto:${cleanEmail}?subject=${subject}`;
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40 flex flex-col items-end gap-3 select-none">
      {/* Floating Menu Popover (Design Clair Kinimmo) */}
      {isOpen && (
        <div className="w-[340px] sm:w-[390px] rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200 p-5 sm:p-6 shadow-2xl text-slate-900 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
          {/* Header B2B */}
          <div className="flex items-start justify-between pb-3.5 border-b border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Partenariats & Conciergerie
                </span>
              </div>
              <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 leading-tight">
                {title}
              </h4>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <Users className="w-3 h-3 text-emerald-600" />
                <span>{subtitle}</span>
              </p>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed font-normal">
            {description}
          </p>

          {/* Boutons d'orientation spécifiques B2B & Particuliers */}
          <div className="space-y-2.5">
            {/* 0. Conciergerie Particuliers & Recherche Sur-Mesure */}
            <button
              onClick={() => {
                setIsOpen(false);
                if (onNavigateToConciergerie) {
                  onNavigateToConciergerie();
                } else {
                  window.location.href = '/conciergerie';
                }
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-slate-50 hover:bg-emerald-100/60 border border-emerald-200 text-left transition-all cursor-pointer group active:scale-[0.98] shadow-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                      Conciergerie Immobilière Kinimmo
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">
                      Acheteurs, Locataires & Diaspora
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-600 pl-9 font-normal">
                « Votre recherche immobilière, notre accompagnement » • Mandat sur-mesure & audit foncier.
              </p>
            </button>

            {/* 1. Agences & Agents */}
            <button
              onClick={handleAgencyWhatsApp}
              className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-emerald-400 text-left transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Agences & Agents Immobiliers
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-500 pl-9">
                Diffusion de mandats, catalogue et affiliation officielle.
              </p>
            </button>

            {/* 2. Promoteurs & Partenaires Fonciers */}
            <button
              onClick={handlePartnerWhatsApp}
              className="w-full p-3.5 rounded-2xl bg-amber-50/50 hover:bg-amber-50 border border-amber-200 text-left transition-all cursor-pointer group active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Devenir Partenaire / Promoteur
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-600 group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-slate-600 pl-9">
                Programmes neufs, projets d’envergure & partenariats d’affaires.
              </p>
            </button>

            {/* Ligne d'appel direct & Email */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCall}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                title={`Appeler le ${displayPhone}`}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ligne Directe</span>
              </button>

              <button
                onClick={handleEmail}
                className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer"
                title={`Écrire à ${cleanEmail}`}
              >
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Email Pro</span>
              </button>
            </div>
          </div>

          {/* Footer de la bulle avec badge horaire */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-mono text-emerald-700 font-semibold">
              <Clock className="w-3 h-3" />
              <span>{workingHours}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Réseau Kinimmo Pro</span>
            </span>
          </div>
        </div>
      )}

      {/* Main Floating Trigger Button (Design Clair & Lumineux) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Conciergerie Partenariats et Agences"
        className="group relative flex items-center gap-2.5 pl-3.5 pr-4 py-2.5 sm:py-3 rounded-full bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-500 text-slate-900 shadow-xl backdrop-blur-xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>

        <div className="flex items-center gap-1.5 text-left">
          <Briefcase className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Espace Partenaires & Agences
          </span>
        </div>

        {isOpen ? (
          <X className="w-4 h-4 text-slate-400 group-hover:rotate-90 transition-transform" />
        ) : (
          <MessageCircle className="w-4 h-4 text-emerald-600" />
        )}
      </button>
    </div>
  );
};
