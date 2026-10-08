import React from 'react';
import { useApp } from '../context/AppContext';
import { convertAndFormatPrice } from '../utils/currency';
import { X, Scale, Trash2, Check, Zap } from 'lucide-react';

export const CompareModal: React.FC = () => {
  const {
    isCompareOpen,
    setIsCompareOpen,
    compareList,
    toggleCompare,
    clearCompare,
    properties,
    customFields,
    currency,
    setActivePropertyModalId,
  } = useApp();

  if (!isCompareOpen) return null;

  const comparedProperties = properties.filter((p) => compareList.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl text-slate-900 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
              <Scale className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Comparateur de Propriétés
              </h3>
              <p className="text-xs text-slate-500">
                Comparez les prix, caractéristiques et critères jusqu'à 4 biens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {comparedProperties.length > 0 && (
              <button
                onClick={clearCompare}
                className="text-xs font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Tout Effacer
              </button>
            )}

            <button
              onClick={() => setIsCompareOpen(false)}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-x-auto flex-1">
          {comparedProperties.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <Scale className="w-12 h-12 text-slate-400 mx-auto" />
              <p className="font-semibold text-sm text-slate-800">Aucun bien sélectionné pour la comparaison</p>
              <p className="text-xs text-slate-500">
                Cliquez sur l'icône de la balance <Scale className="w-3.5 h-3.5 inline text-emerald-600" /> sur n'importe quelle carte pour l'ajouter.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-3 bg-slate-100 text-slate-700 font-bold w-48 rounded-tl-xl border border-slate-200">
                    Propriété
                  </th>
                  {comparedProperties.map((p) => (
                    <th key={p.id} className="p-3 bg-slate-50 border border-slate-200 min-w-[200px] align-top">
                      <div className="space-y-2">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                          <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                          <button
                            onClick={() => toggleCompare(p.id)}
                            className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-rose-500 hover:text-white text-slate-700 rounded-lg transition-colors shadow-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="font-bold text-slate-900 line-clamp-2">{p.title}</div>
                        <div className="text-emerald-700 font-black text-sm">
                          {convertAndFormatPrice(p.price, currency)}
                        </div>

                        <button
                          onClick={() => {
                            setIsCompareOpen(false);
                            setActivePropertyModalId(p.id);
                          }}
                          className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
                        >
                          Fiche Détaillée
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-3 font-semibold bg-slate-50 text-slate-700 border border-slate-200">Ville / Localisation</td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3 text-slate-800 border border-slate-200">{p.city}, {p.country}</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3 font-semibold bg-slate-50 text-slate-700 border border-slate-200">Type de Bien</td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3 text-slate-800 border border-slate-200 capitalize">{p.type}</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3 font-semibold bg-slate-50 text-slate-700 border border-slate-200">Chambres / Sdb</td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3 text-slate-800 border border-slate-200">{p.bedrooms} ch. / {p.bathrooms} sdb</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3 font-semibold bg-slate-50 text-slate-700 border border-slate-200">Surface (m²)</td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3 text-slate-800 border border-slate-200 font-bold">{p.area} m²</td>
                  ))}
                </tr>

                {/* DYNAMIC CUSTOM FIELDS COMPARE ROWS */}
                {customFields.filter(f => !f.isPrivate).map((field) => (
                  <tr key={field.id}>
                    <td className="p-3 font-semibold bg-slate-50 text-emerald-800 border border-slate-200 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      {field.label['fr'] || field.key}
                    </td>
                    {comparedProperties.map((p) => {
                      const val = p.customFields[field.key];
                      return (
                        <td key={p.id} className="p-3 text-slate-800 border border-slate-200 font-semibold">
                          {val !== undefined && val !== null && val !== '' ? `${val} ${field.unit || ''}` : '-'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
