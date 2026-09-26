import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Compass,
  Search,
  MessageCircle
} from 'lucide-react';
import { ConciergerieProjet, ConciergerieTypeBien } from '../../types';
import {
  CONCIERGERIE_PROJETS,
  CONCIERGERIE_TYPES_BIEN,
  KINSHASA_COMMUNES
} from '../../utils/conciergerieValidation';
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

  // États pour le sélecteur rapide d'aperçu
  const [selectedProjet, setSelectedProjet] = useState<ConciergerieProjet>('Acheter');
  const [selectedTypeBien, setSelectedTypeBien] = useState<ConciergerieTypeBien>('Villa');
  const [selectedCommune, setSelectedCommune] = useState<string>('Gombe');

  const conciergeWhatsAppNumber = (
    contactSettings?.vipConcierge?.whatsapp ||
    contactSettings?.supportWhatsApp ||
    '243845294616'
  ).replace(/[^0-9]/g, '');

  const handleLaunchRequest = () => {
    onNavigateToConciergerie({
      projet: selectedProjet,
      typeBien: selectedTypeBien,
      commune: selectedCommune
    });
  };

  return (
    <section className="relative overflow-hidden rounded-3xl bg-white text-slate-900 border border-slate-200 shadow-sm p-6 sm:p-10 lg:p-12 my-10 transition-all">
      {/* Halo subtil vert Kinimmo en arrière-plan */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-slate-100/50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-8">
        
        {/* En-tête officiel de la Conciergerie Kinimmo */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Service d'Accompagnement Dédié • Kinshasa</span>
            </div>

            {/* Titre Demandé */}
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 uppercase tracking-tight leading-tight">
              Votre recherche immobilière, notre accompagnement
            </h2>

            {/* Texte Demandé */}
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              « Vous recherchez un bien immobilier mais vous n’avez pas le temps de parcourir toutes les annonces ? Kinimmo vous accompagne dans votre recherche. »
            </p>
          </div>

          {/* Action principale rapide */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={handleLaunchRequest}
              className="px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer group"
            >
              <span>Demander l’aide de Kinimmo</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={() => onNavigateToConciergerie()}
              className="px-5 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs uppercase tracking-wider border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Compass className="w-4 h-4 text-emerald-600" />
              <span>Aperçu complet</span>
            </button>
          </div>
        </div>

        {/* Grille : Simulateur interactif & Piliers du service */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Colonne 1 : Mini simulateur clair d'aperçu */}
          <div className="lg:col-span-7 bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Simulez votre recherche en 3 clics
                </span>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                Accompagnement Sur-Mesure
              </span>
            </div>

            {/* Sélection Projet */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                1. Quel est votre projet ?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONCIERGERIE_PROJETS.slice(0, 5).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedProjet(p)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-left cursor-pointer ${
                      selectedProjet === p
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélection Type de Bien */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                2. Type de bien recherché
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {CONCIERGERIE_TYPES_BIEN.slice(0, 4).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTypeBien(t)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border text-center cursor-pointer ${
                      selectedTypeBien === t
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Sélection Commune */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                3. Commune prioritaire à Kinshasa
              </label>
              <select
                value={selectedCommune}
                onChange={(e) => setSelectedCommune(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-white text-slate-900 border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-semibold"
              >
                {KINSHASA_COMMUNES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Boutons d'action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={handleLaunchRequest}
                className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                <span>Demander l’aide de Kinimmo</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href={`https://wa.me/${conciergeWhatsAppNumber}?text=${encodeURIComponent(
                  `Bonjour Conciergerie Kinimmo, je souhaite un accompagnement pour ${selectedProjet.toLowerCase()} un(e) ${selectedTypeBien.toLowerCase()} à ${selectedCommune}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-white hover:bg-slate-100 text-emerald-700 border border-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Direct</span>
              </a>
            </div>
          </div>

          {/* Colonne 2 : Les 3 engagements concrets */}
          <div className="lg:col-span-5 space-y-4">
            
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase text-slate-900">
                  1. Recherche exhaustive & Hors-Marché
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Accès exclusif au portefeuille inter-agences, aux propriétaires privés et aux programmes neufs de Kinshasa non publiés.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase text-slate-900">
                  2. Audit Foncier & Sécurisation Juridique
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Vérification préalable des certificats d'enregistrement, titres cadastraux et antécédents avant toute signature.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase text-slate-900">
                  3. Organisation des visites & Négociation
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Planning de visites optimisé avec itinéraire sécurisé et négociation au juste prix du marché kinois.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
