import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Compass,
  Home,
  MapPin,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  buildNeighborhoodDirectory,
  matchesNeighborhood,
  resolveNeighborhoodBySlug,
} from '../../data/contentSeed';
import { PropertyCard } from '../PropertyCard';
import { convertAndFormatPrice } from '../../utils/currency';

interface NeighborhoodPageViewProps {
  slug: string;
  onSelectNeighborhood: (slug: string) => void;
  onReturnHome: () => void;
  onOpenShare: (propertyId: string) => void;
  onOpenConciergerie: () => void;
}

export const NeighborhoodPageView: React.FC<NeighborhoodPageViewProps> = ({
  slug,
  onSelectNeighborhood,
  onReturnHome,
  onOpenShare,
  onOpenConciergerie,
}) => {
  const { properties, currency, cdfExchangeRate } = useApp();
  const [txFilter, setTxFilter] = useState<'all' | 'for-sale' | 'for-rent'>('all');
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState<string>('all');

  const directory = useMemo(() => buildNeighborhoodDirectory(properties), [properties]);
  const activeProfile = useMemo(
    () => resolveNeighborhoodBySlug(slug, properties) || directory[0],
    [slug, properties, directory]
  );

  const neighborhoodProperties = useMemo(() => {
    if (!activeProfile) return [];
    return properties.filter((p) => {
      const statusUpper = String(p?.listingStatus || '').toUpperCase();
      const isVisible = p && p.published !== false && statusUpper !== 'ARCHIVED' && statusUpper !== 'REJECTED';
      if (!isVisible) return false;
      if (!matchesNeighborhood(p, activeProfile)) return false;
      if (txFilter !== 'all' && p.status !== txFilter) return false;
      return true;
    });
  }, [properties, activeProfile, txFilter]);

  const neighborLinks = useMemo(() => {
    if (!activeProfile) return [];
    return activeProfile.neighborSlugs
      .map((s) => directory.find((d) => d.slug === s))
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [activeProfile, directory]);

  const districts = useMemo(() => {
    const set = new Set(directory.map((d) => d.district).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [directory]);

  const filteredDirectory = useMemo(() => {
    return directory.filter(
      (d) => selectedDistrictFilter === 'all' || d.district === selectedDistrictFilter
    );
  }, [directory, selectedDistrictFilter]);

  if (!activeProfile) return null;

  const formatUsdOrDash = (val: number | null) =>
    val && val > 0 ? convertAndFormatPrice(val, currency, cdfExchangeRate, 'USD') : '—';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Fil d'Ariane & retour */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={onReturnHome}
            className="hover:text-slate-900 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Accueil</span>
          </button>
          <span aria-hidden="true">/</span>
          <span>Quartiers Kinshasa</span>
          <span aria-hidden="true">/</span>
          <span className="text-slate-900 font-semibold">{activeProfile.name}</span>
        </nav>

        <button
          type="button"
          onClick={onReturnHome}
          className="h-9 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Toutes les annonces</span>
        </button>
      </div>

      {/* En-tête éditorial du quartier */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{activeProfile.kind === 'commune' ? 'Commune de Kinshasa' : `Quartier · ${activeProfile.commune}`}</span>
            <span aria-hidden="true">·</span>
            <span>District de {activeProfile.district}</span>
            <span aria-hidden="true">·</span>
            <span>Kinshasa, RDC</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight text-balance">
            Immobilier à {activeProfile.name}
          </h1>

          <p className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
            {activeProfile.tagline}
          </p>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl">
            {activeProfile.description}
          </p>
        </div>

        {/* Bande d'indicateurs réels calculés sur le catalogue actif */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-5 border-t border-slate-200">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-xs text-slate-500 font-medium">Annonces actives</span>
            <p className="text-2xl font-black text-slate-900 font-mono tabular-nums">
              {activeProfile.stats.activeCount}
            </p>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              {activeProfile.stats.saleCount} vente · {activeProfile.stats.rentCount} location
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-xs text-slate-500 font-medium">Prix moyen à l'achat</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tabular-nums truncate">
              {formatUsdOrDash(activeProfile.stats.avgSalePriceUsd)}
            </p>
            <p className="text-xs text-slate-500">Biens disponibles en vente</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-xs text-slate-500 font-medium">Loyer mensuel moyen</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums truncate">
              {formatUsdOrDash(activeProfile.stats.avgRentPriceUsd)}
            </p>
            <p className="text-xs text-slate-500">Sur les locations actives</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-xs text-slate-500 font-medium">Moyenne indicative / m²</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 font-mono tabular-nums">
              {activeProfile.stats.avgPricePerSqmUsd
                ? `${activeProfile.stats.avgPricePerSqmUsd.toLocaleString('fr-FR')} $`
                : '—'}
            </p>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              Fourchette : {formatUsdOrDash(activeProfile.stats.minPriceUsd)} – {formatUsdOrDash(activeProfile.stats.maxPriceUsd)}
            </p>
          </div>
        </div>

        {/* Atouts, repères et conseil local */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5 border-t border-slate-200 text-sm">
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Profil du secteur</span>
            </h2>
            <ul className="space-y-1.5 text-slate-700 text-xs sm:text-sm leading-relaxed">
              {activeProfile.highlights.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Points de repère</span>
            </h2>
            <ul className="space-y-1.5 text-slate-700 text-xs sm:text-sm leading-relaxed">
              {activeProfile.landmarks.map((lm, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold">·</span>
                  <span>{lm}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conseil terrain Kinimmo</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {activeProfile.advisorTip}
            </p>
            <button
              type="button"
              onClick={onOpenConciergerie}
              className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Confier ma recherche à la Conciergerie VIP →</span>
            </button>
          </div>
        </div>
      </section>

      {/* Liste des annonces disponibles dans le quartier */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">
              Biens disponibles à {activeProfile.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              {neighborhoodProperties.length} annonce{neighborhoodProperties.length > 1 ? 's' : ''} correspondante{neighborhoodProperties.length > 1 ? 's' : ''}
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 self-start">
            {(
              [
                { id: 'all', label: 'Tous' },
                { id: 'for-sale', label: 'À vendre' },
                { id: 'for-rent', label: 'À louer' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTxFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  txFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {neighborhoodProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {neighborhoodProperties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} onShare={onOpenShare} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
            <Building2 className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">
              Aucune annonce active sur ce filtre à {activeProfile.name}
            </h3>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Notre équipe Conciergerie dispose souvent de biens hors-marché ou en cours de vérification dans cette zone.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {txFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setTxFilter('all')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                >
                  Afficher ventes & locations
                </button>
              )}
              <button
                type="button"
                onClick={onOpenConciergerie}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
              >
                Demander une recherche ciblée
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Secteurs voisins + Répertoire complet des 24 communes et quartiers clés */}
      <section className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
        {neighborLinks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Quartiers & communes à proximité</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {neighborLinks.map((nb) => (
                <button
                  key={nb.slug}
                  type="button"
                  onClick={() => onSelectNeighborhood(nb.slug)}
                  className="p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 text-left transition-colors bg-slate-50/70 hover:bg-white cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">{nb.name}</span>
                    <span className="text-xs font-mono tabular-nums text-emerald-700 font-bold">
                      {nb.stats.activeCount} biens
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">{nb.district}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-5 border-t border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Explorer les 24 communes et quartiers clés de Kinshasa
              </h3>
              <p className="text-xs text-slate-500">
                Indicateurs calculés en direct sur le portefeuille actif Kinimmo
              </p>
            </div>

            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
              {districts.map((dist) => (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setSelectedDistrictFilter(dist)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedDistrictFilter === dist
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {dist === 'all' ? 'Tous districts' : dist}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {filteredDirectory.map((item) => {
              const isCurrent = item.slug === activeProfile.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => onSelectNeighborhood(item.slug)}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    isCurrent
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 hover:border-slate-400 bg-white text-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs truncate">{item.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                    {item.stats.activeCount} annonce{item.stats.activeCount > 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
