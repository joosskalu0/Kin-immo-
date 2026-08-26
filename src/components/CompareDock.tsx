import React from 'react';
import { useApp } from '../context/AppContext';
import { convertAndFormatPrice } from '../utils/currency';
import { Scale, X, ArrowRight, Trash2 } from 'lucide-react';

export const CompareDock: React.FC = () => {
  const { compareList, properties, toggleCompare, clearCompare, setIsCompareOpen, currency } = useApp();

  if (compareList.length === 0) return null;

  const comparedProperties = properties.filter((p) => compareList.includes(p.id));

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-slate-900/95 backdrop-blur-xl border-2 border-emerald-500/50 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-emerald-950/50 flex flex-wrap items-center justify-between gap-3 text-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Comparateur Actif</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30">
                {comparedProperties.length} / 4 biens
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Comparez les caractéristiques, prix et équipements côte à côte
            </p>
          </div>
        </div>

        {/* Thumbnails preview */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-[280px] sm:max-w-none">
          {comparedProperties.map((p) => (
            <div
              key={p.id}
              className="relative group w-12 h-12 rounded-xl overflow-hidden border border-slate-700 shrink-0 bg-slate-800"
              title={`${p.title} (${convertAndFormatPrice(p.price, currency)})`}
            >
              <img
                src={p.images[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200'}
                alt={p.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => toggleCompare(p.id)}
                className="absolute inset-0 bg-slate-950/80 text-rose-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                title="Retirer de la comparaison"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ms-auto">
          <button
            onClick={clearCompare}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors text-xs flex items-center gap-1 border border-transparent hover:border-rose-500/20"
            title="Tout vider"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Vider</span>
          </button>

          <button
            onClick={() => setIsCompareOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
            <span>Comparer ({comparedProperties.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
