import React from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Search,
  MessageCircle,
  Compass
} from 'lucide-react';
import { ConciergerieProjet, ConciergerieTypeBien } from '../../types';
import { useApp } from '../../context/AppContext';

interface ConciergeriePreviewSectionProps {
  onNavigateToConciergerie: (params?: {
    projet?: ConciergerieProjet;
    typeBien?: ConciergerieTypeBien;
    commune?: string;
  }) => void;
}

export const ConciergeriePreviewSection: React.FC<ConciergeriePreviewSectionProps> = ({
  onNavigateToConciergerie
}) => {
  const { contactSettings } = useApp();

  const conciergeWhatsAppNumber = (
    contactSettings?.vipConcierge?.whatsapp ||
    contactSettings?.supportWhatsApp ||
    '243845294616'
  ).replace(/[^0-9]/g, '');

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50/70 to-emerald-50/30 text-slate-900 border border-slate-200/90 shadow-xs p-5 sm:p-7 lg:p-8 my-2 transition-all">
      {/* Halo subtil vert Kinimmo en arrière-plan */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-slate-200/40 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        
        {/* Contenu textuel & Accompagnement */}
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 text-emerald-900 border border-emerald-200/80 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Service d'Accompagnement Dédié • Kinshasa</span>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 uppercase tracking-tight leading-tight">
            Votre recherche immobilière, notre accompagnement
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
            « Vous recherchez un bien immobilier mais vous n’avez pas le temps de parcourir toutes les annonces ? Kinimmo vous accompagne dans votre recherche. »
          </p>

          {/* Points forts condensés en ligne */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs">
              <Search className="w-3 h-3 text-emerald-600" />
              Recherche sur-mesure & hors-marché
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Audit foncier & juridique
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs">
              <Compass className="w-3 h-3 text-emerald-600" />
              Visites organisées & négociation
            </span>
          </div>
        </div>

        {/* Actions rapides compactes */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigateToConciergerie()}
            className="px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer group whitespace-nowrap"
          >
            <span>Demander l’aide de Kinimmo</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <a
            href={`https://wa.me/${conciergeWhatsAppNumber}?text=${encodeURIComponent(
              'Bonjour Conciergerie Kinimmo, je souhaite un accompagnement personnalisé pour ma recherche immobilière à Kinshasa.'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-emerald-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp Direct</span>
          </a>
        </div>

      </div>
    </section>
  );
};
