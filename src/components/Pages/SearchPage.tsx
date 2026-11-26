import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Property } from '../../types';
import { SearchWidget } from '../SearchWidget';
import { PropertyCard } from '../PropertyCard';
import { EmptyState, PageHeaderBar } from '../StateFeedback';
import { buildSearchPath } from '../../utils/navigation';
import { ArrowUpDown, BookmarkCheck, Map as MapIcon, Search } from 'lucide-react';

interface SearchPageProps {
  sortedProperties: Property[];
  onNavigatePath: (path: string) => void;
  onShareProperty: (propertyId: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  sortedProperties,
  onNavigatePath,
  onShareProperty,
}) => {
  const { filters, setFilters, resetFilters, addSavedSearch } = useApp();
  const [alertSaved, setAlertSaved] = useState(false);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${buildSearchPath({
          q: filters.searchQuery,
          commune: filters.commune,
          type: filters.type,
          status: filters.status,
        })}`
      : '';

  const handleQuickCreateAlert = () => {
    const label = [
      filters.status === 'for-rent' ? 'Location' : filters.status === 'for-sale' ? 'Achat' : 'Recherche',
      filters.commune && filters.commune !== 'all' ? filters.commune : 'Kinshasa',
      filters.type && filters.type !== 'all' ? filters.type : '',
    ]
      .filter(Boolean)
      .join(' · ');
    addSavedSearch(label, 'instant');
    setAlertSaved(true);
    setTimeout(() => setAlertSaved(false), 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeaderBar
        title="Rechercher un bien"
        subtitle={`${sortedProperties.length} bien${sortedProperties.length > 1 ? 's' : ''} disponible${sortedProperties.length > 1 ? 's' : ''}`}
        fallbackPath="/"
        shareUrl={shareUrl}
        shareTitle="Ma recherche immobilière sur Kinimmo"
        rightSlot={
          <button
            type="button"
            onClick={() => onNavigatePath('/carte')}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <MapIcon className="w-4 h-4 text-[#1D4ED8]" />
            <span>Carte</span>
          </button>
        }
      />

      <SearchWidget
        onSubmitSearch={() => {
          const nextPath = buildSearchPath({
            q: filters.searchQuery,
            commune: filters.commune,
            type: filters.type,
            status: filters.status,
          });
          onNavigatePath(nextPath);
        }}
      />

      {/* Barre de tri & sauvegarde d'alerte */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-800 tabular-nums">
          <strong className="text-[#1D4ED8]">{sortedProperties.length}</strong> résultat{sortedProperties.length > 1 ? 's' : ''}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-4 h-4 text-slate-500" />
            <select
              aria-label="Trier les résultats"
              value={filters.sortBy || 'newest'}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
              className="h-10 bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 text-xs font-bold focus:outline-none focus:border-[#1D4ED8]"
            >
              <option value="newest">Plus récentes</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="popular">Plus consultées</option>
              <option value="area-desc">Plus grande surface</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleQuickCreateAlert}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>{alertSaved ? 'Alerte créée !' : 'Recevoir une alerte'}</span>
          </button>
        </div>
      </div>

      {/* Résultats ou état vide avec action suivante */}
      {sortedProperties.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Aucun bien ne correspond à ces critères"
          description="Essayez d'élargir votre budget, de choisir une autre commune ou de réinitialiser les filtres."
          actionLabel="Réinitialiser les filtres"
          onAction={resetFilters}
          secondaryLabel="Demander à la conciergerie"
          onSecondaryAction={() => onNavigatePath('/conciergerie')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {sortedProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onShare={onShareProperty}
            />
          ))}
        </div>
      )}
    </div>
  );
};
