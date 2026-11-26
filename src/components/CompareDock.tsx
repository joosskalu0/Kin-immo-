import React from 'react';
import { useApp } from '../context/AppContext';
import { convertAndFormatPrice } from '../utils/currency';
import { dispatchAppNavigate } from '../utils/navigation';
import { Scale, X, ArrowRight, Trash2 } from 'lucide-react';

export const CompareDock: React.FC = () => {
  const { compareList, properties, toggleCompare, clearCompare, currency } = useApp();

  if (compareList.length === 0) return null;

  const comparedProperties = properties.filter((p) => compareList.includes(p.id));

  return (
    <div className="fixed bottom-[70px] lg:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-3xl animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 backdrop-blur-xl border-2 border-[#1D4ED8]/40 rounded-2xl p-3 sm:p-4 shadow-xl flex flex-wrap items-center justify-between gap-3 text-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <span>Comparateur</span>
              <span className="bg-blue-50 text-[#1D4ED8] text-[10px] px-2 py-0.5 rounded-full border border-blue-200 tabular-nums">
                {comparedProperties.length} / 4 biens
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Comparez prix, surfaces et équipements côte à côte
            </p>
          </div>
        </div>

        {/* Thumbnails preview */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-[200px] sm:max-w-none no-scrollbar">
          {comparedProperties.map((p) => (
            <div
              key={p.id}
              className="relative group w-11 h-11 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100"
              title={`${p.title} (${convertAndFormatPrice(p.price, currency)})`}
            >
              <img
                src={p.images[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200'}
                alt={p.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => toggleCompare(p.id)}
                className="absolute inset-0 bg-slate-900/75 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Retirer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ms-auto">
          <button
            type="button"
            onClick={clearCompare}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-xs flex items-center gap-1 cursor-pointer"
            title="Tout vider"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">Vider</span>
          </button>

          <button
            type="button"
            onClick={() => dispatchAppNavigate('/comparer')}
            className="px-4 py-2.5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs shadow-xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <span>Comparer ({comparedProperties.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
