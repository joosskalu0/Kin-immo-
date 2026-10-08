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

  const agentMsg = vip?.agentMessage || "Bonjour KINIMMO Partenariats, je suis une agence/un agent immobilier à Kinshasa et je souhaite collaborer avec votre plateforme pour diffuser mes annonces de biens.";
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
    <div className="fixed bottom-18 sm:bottom-22 right-3 sm:right-5 z-40 flex flex-col items-end gap-2.5 select-none">
      {/* Floating Menu Popover (Structuré & Compact) */}
      {isOpen && (
        <div className="w-[310px] sm:w-[350px] rounded-3xl bg-white/95 backdrop-blur-xl border border-slate-200 p-4 sm:p-5 shadow-2xl text-slate-900 space-y-3.5 animate-in slide-in-from-bottom-3 duration-200">
          {/* Header B2B */}
          <div className="flex items-start justify-between pb-3 border-b border-slate-100">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  Réseau Professionnel
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-extrabold uppercase tracking-tight text-slate-900">
                {title}
              </h4>
              <p className="text-[11px] text-slate-500 font-medium">
                {subtitle}
              </p>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer shrink-0"
              title="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Description courte */}
          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
            {description}
          </p>

          {/* Options B2B structurées */}
          <div className="space-y-2">
            {/* 1. Agences & Agents */}
            <button
              onClick={handleAgencyWhatsApp}
              className="w-full p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer group active:scale-[0.99] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block truncate">
                    Agences & Agents
                  </span>
                  <span className="text-[10px] text-slate-500 block truncate">
                    Affiliation & diffusion d'annonces
                  </span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            {/* 2. Promoteurs & Programmes Neufs */}
            <button
              onClick={handlePartnerWhatsApp}
              className="w-full p-2.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/90 text-left transition-all cursor-pointer group active:scale-[0.99] flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block truncate">
                    Devenir Partenaire / Promoteur
                  </span>
                  <span className="text-[10px] text-slate-600 block truncate">
                    Programmes neufs & projets B2B
                  </span>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>

            {/* Actions Rapides Appel & Email */}
            <div className="grid grid-cols-2 gap-2 pt-0.5">
              <button
                onClick={handleCall}
                className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title={`Appeler le ${displayPhone}`}
              >
                <Phone className="w-3 h-3 text-emerald-600" />
                <span>Ligne Directe</span>
              </button>

              <button
                onClick={handleEmail}
                className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title={`Écrire à ${cleanEmail}`}
              >
                <Mail className="w-3 h-3 text-emerald-600" />
                <span>Email Pro</span>
              </button>
            </div>
          </div>

          {/* Footer de la bulle avec badge horaire */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1 font-mono text-emerald-700 font-semibold">
              <Clock className="w-3 h-3" />
              <span>{workingHours}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Kinimmo Pro</span>
            </span>
          </div>
        </div>
      )}

      {/* Bouton Flottant Visible, Structuré & Valorisé */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Espace Partenaires et Agences"
        className="group flex items-center gap-2.5 pl-2.5 pr-4 py-2 sm:py-2.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-emerald-500 text-slate-900 shadow-xl backdrop-blur-xl transition-all duration-200 active:scale-95 cursor-pointer ring-2 ring-emerald-500/20"
      >
        {/* Icône mallette valorisée et bien visible */}
        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
          <Briefcase className="w-4.5 h-4.5 text-white" />
        </div>

        {/* Textes clairs et bien lisibles */}
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight whitespace-nowrap">
              Espace Partenaires
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 block whitespace-nowrap">
            Agences & Promoteurs
          </span>
        </div>

        {/* Indicateur d'état */}
        {isOpen ? (
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 ml-1">
            <X className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 ml-1">
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        )}
      </button>
    </div>
  );
};
