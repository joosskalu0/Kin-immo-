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
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Scale className="w-5 h-5 font-bold" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Comparateur de Propriétés Détaillé
              </h3>
              <p className="text-xs text-slate-400">
                Comparez les prix, caractéristiques et champs personnalisés jusqu'à 4 biens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {comparedProperties.length > 0 && (
              <button
                onClick={clearCompare}
                className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Tout Effacer
              </button>
            )}

            <button
              onClick={() => setIsCompareOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-x-auto flex-1">
          {comparedProperties.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-3">
              <Scale className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="font-semibold text-sm">Aucun bien sélectionné pour la comparaison</p>
              <p className="text-xs text-slate-500">
                Cliquez sur l'icône de la balance <Scale className="w-3.5 h-3.5 inline text-amber-400" /> sur n'importe quelle carte pour l'ajouter.
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr>
                  <th className="p-3 bg-slate-950 text-slate-400 font-semibold w-48 rounded-tl-xl border border-slate-800">
                    Propriété
                  </th>
                  {comparedProperties.map((p) => (
                    <th key={p.id} className="p-3 bg-slate-950 border border-slate-800 min-w-[200px] align-top">
                      <div className="space-y-2">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900">
                          <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                          <button
                            onClick={() => toggleCompare(p.id)}
                            className="absolute top-1 right-1 p-1 bg-slate-950/80 hover:bg-rose-500 text-slate-300 hover:text-white rounded-lg transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="font-bold text-white line-clamp-2">{p.title}</div>
                        <div className="text-emerald-400 font-bold text-sm">
                          {convertAndFormatPrice(p.price, currency)}
                        </div>

                        <button
                          onClick={() => {
                            setIsCompareOpen(false);
                            setActivePropertyModalId(p.id);
                          }}
                          className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition-colors"
                        >
                          Fiche Détaillée
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80">
                <tr>
                  <td className="p-3 font-semibold bg-slate-950/60 text-slate-300 border border-slate-800">Ville / Localisation</td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3 text-slate-200 border border-slate-800">{p.city}, {p.country}</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3 font-semibold bg-slate-950/60 text-slate-300 border border-slate-800">Type de Bien</td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3 text-slate-200 border border-slate-800 capitalize">{p.type}</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3 font-semibold bg-slate-950/60 text-slate-300 border border-slate-800">Chambres / Sdb</td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3 text-slate-200 border border-slate-800">{p.bedrooms} ch. / {p.bathrooms} sdb</td>
                  ))}
                </tr>

                <tr>
                  <td className="p-3 font-semibold bg-slate-950/60 text-slate-300 border border-slate-800">Surface (m²)</td>
                  {comparedProperties.map((p) => (
                    <td key={p.id} className="p-3 text-slate-200 border border-slate-800 font-bold">{p.area} m²</td>
                  ))}
                </tr>

                {/* DYNAMIC CUSTOM FIELDS COMPARE ROWS */}
                {customFields.filter(f => !f.isPrivate).map((field) => (
                  <tr key={field.id}>
                    <td className="p-3 font-semibold bg-slate-950/60 text-emerald-400 border border-slate-800 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      {field.label['fr'] || field.key}
                    </td>
                    {comparedProperties.map((p) => {
                      const val = p.customFields[field.key];
                      return (
                        <td key={p.id} className="p-3 text-slate-200 border border-slate-800 font-semibold">
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
