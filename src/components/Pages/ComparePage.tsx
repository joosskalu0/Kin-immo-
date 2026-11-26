import React from 'react';
import { useApp } from '../../context/AppContext';
import { getPropertyDisplayCurrencies } from '../../utils/propertyPricing';
import { Scale, Trash2, X, Zap } from 'lucide-react';
import { EmptyState, PageHeaderBar } from '../StateFeedback';
import { getOptimizedImageUrl, FALLBACK_PROPERTY_IMAGE } from '../../utils/mediaUrl';
import { getPropertySlug } from '../../utils/shareUtils';

interface ComparePageProps {
  onNavigatePath: (path: string) => void;
}

export const ComparePage: React.FC<ComparePageProps> = ({ onNavigatePath }) => {
  const { compareList, toggleCompare, clearCompare, properties, customFields, cdfExchangeRate } = useApp();

  const comparedProperties = properties.filter((p) => compareList.includes(p.id));
  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://kinimmo.cd/comparer';

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeaderBar
        title="Comparer les biens"
        subtitle={`${comparedProperties.length} / 4 sélectionné${comparedProperties.length > 1 ? 's' : ''}`}
        fallbackPath="/rechercher"
        shareUrl={shareUrl}
        shareTitle="Comparatif immobilier sur Kinimmo"
        rightSlot={
          comparedProperties.length > 0 ? (
            <button
              type="button"
              onClick={clearCompare}
              className="min-h-[44px] px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tout vider</span>
            </button>
          ) : undefined
        }
      />

      {comparedProperties.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="Aucun bien à comparer"
          description="Ajoutez jusqu'à 4 biens depuis la recherche ou vos favoris pour comparer leurs prix et caractéristiques côte à côte."
          actionLabel="Parcourir les biens"
          onAction={() => onNavigatePath('/rechercher')}
          secondaryLabel="Voir mes favoris"
          onSecondaryAction={() => onNavigatePath('/favoris')}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-2xs">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr>
                <th className="p-3 sm:p-4 bg-slate-50 text-slate-700 font-extrabold min-w-[140px] border-b border-r border-slate-200">
                  Critère
                </th>
                {comparedProperties.map((p) => (
                  <th
                    key={p.id}
                    className="p-3 sm:p-4 bg-white border-b border-r last:border-r-0 border-slate-200 min-w-[200px] align-top"
                  >
                    <div className="space-y-2.5">
                      <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                        <img
                          src={getOptimizedImageUrl(p.images?.[0] || FALLBACK_PROPERTY_IMAGE, { width: 480 }) || FALLBACK_PROPERTY_IMAGE}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => toggleCompare(p.id)}
                          aria-label="Retirer de la comparaison"
                          className="absolute top-1.5 right-1.5 w-8 h-8 rounded-lg bg-white/95 hover:bg-rose-600 hover:text-white text-slate-700 flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="font-bold text-slate-900 line-clamp-2 text-xs sm:text-sm">
                        {p.title}
                      </div>
                      {(() => {
                        const display = getPropertyDisplayCurrencies(p, cdfExchangeRate);
                        return (
                          <div className="text-[#1D4ED8] font-extrabold text-sm tabular-nums">
                            {display.primaryFormatted}{display.periodSuffixCompact}
                            <div className="text-[11px] text-slate-500 font-medium">
                              ≈ {display.secondaryFormatted}{display.periodSuffixCompact}
                            </div>
                          </div>
                        );
                      })()}
                      <button
                        type="button"
                        onClick={() => onNavigatePath(`/annonces/${encodeURIComponent(getPropertySlug(p))}`)}
                        className="w-full min-h-[40px] py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-xs cursor-pointer transition-colors"
                      >
                        Voir l'annonce
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              <tr>
                <td className="p-3 sm:p-4 font-bold bg-slate-50 text-slate-700 border-r border-slate-200">
                  Commune
                </td>
                {comparedProperties.map((p) => (
                  <td key={p.id} className="p-3 sm:p-4 text-slate-800 border-r last:border-r-0 border-slate-200">
                    {p.commune || p.city || 'Kinshasa'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-bold bg-slate-50 text-slate-700 border-r border-slate-200">
                  Type
                </td>
                {comparedProperties.map((p) => (
                  <td key={p.id} className="p-3 sm:p-4 text-slate-800 border-r last:border-r-0 border-slate-200 capitalize">
                    {p.type}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-bold bg-slate-50 text-slate-700 border-r border-slate-200">
                  Pièces
                </td>
                {comparedProperties.map((p) => (
                  <td key={p.id} className="p-3 sm:p-4 text-slate-800 border-r last:border-r-0 border-slate-200 tabular-nums">
                    {p.bedrooms} ch. / {p.bathrooms} sdb
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-bold bg-slate-50 text-slate-700 border-r border-slate-200">
                  Surface
                </td>
                {comparedProperties.map((p) => (
                  <td key={p.id} className="p-3 sm:p-4 text-slate-900 font-bold border-r last:border-r-0 border-slate-200 tabular-nums">
                    {p.area} m²
                  </td>
                ))}
              </tr>
              {customFields
                .filter((f) => !f.isPrivate)
                .map((field) => (
                  <tr key={field.id}>
                    <td className="p-3 sm:p-4 font-bold bg-slate-50 text-[#1D4ED8] border-r border-slate-200">
                      <span className="inline-flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        {(typeof field.label === 'string' ? field.label : field.label?.fr) || field.key}
                      </span>
                    </td>
                    {comparedProperties.map((p) => {
                      const val = p.customFields?.[field.key];
                      return (
                        <td key={p.id} className="p-3 sm:p-4 text-slate-800 border-r last:border-r-0 border-slate-200">
                          {val !== undefined && val !== null && val !== '' ? `${val} ${field.unit || ''}` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
