import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Property } from '../types';
import { convertAndFormatPrice } from '../utils/currency';
import { resolveMediaUrl, handlePropertyImageError, FALLBACK_PROPERTY_IMAGE, getOptimizedImageUrl } from '../utils/mediaUrl';
import { PropertyCard } from './PropertyCard';
import { EmptyState } from './StateFeedback';
import { buildSearchPath } from '../utils/navigation';
import {
  DEFAULT_FEATURED_SLOTS_LIMIT,
  getActiveBoostDisplay,
  getTopFeaturedProperties,
  isPropertyPubliclyVisible,
  parseFeaturedSlotsLimit,
} from '../utils/boostHelpers';
import {
  MapPin,
  Search,
  Home,
  Key,
  Building2,
  Headphones,
  ShieldCheck,
  Zap,
  Users,
  Heart,
  ArrowRight,
  Film,
  Compass,
  Bed,
  Bath,
  Maximize,
} from 'lucide-react';

interface HomePageViewProps {
  sortedProperties: Property[];
  onNavigatePath: (path: string) => void;
  onShareProperty: (propertyId: string) => void;
}

const KINSHASA_HERO_FALLBACK =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&auto=format&fit=crop&q=85';

export const HomePageView: React.FC<HomePageViewProps> = ({
  sortedProperties,
  onNavigatePath,
  onShareProperty,
}) => {
  const {
    user,
    filters,
    setFilters,
    resetFilters,
    wishlist,
    toggleWishlist,
    setActivePropertyModalId,
    heroSlides,
    currency,
    cdfExchangeRate,
    contactSettings,
  } = useApp();

  const [quickCommune, setQuickCommune] = useState(filters.commune || 'all');
  const [quickType, setQuickType] = useState<string>(filters.type || 'all');
  const [quickQuery, setQuickQuery] = useState(filters.searchQuery || '');

  const activeHeroImage =
    heroSlides.find((s) => s.isActive && s.image)?.image || KINSHASA_HERO_FALLBACK;

  // Biens en vedette : jusqu'à featured_slots_limit (6 par défaut) annonces boostées visibles et actives en tête
  const featuredSlotsLimit = parseFeaturedSlotsLimit(
    contactSettings?.featuredSlotsLimit ?? DEFAULT_FEATURED_SLOTS_LIMIT
  );
  const availableProperties = sortedProperties.filter((p) => isPropertyPubliclyVisible(p));
  const boostedTop = getTopFeaturedProperties(availableProperties, featuredSlotsLimit);
  const boostedIds = new Set(boostedTop.map((p) => p.id));
  const featuredProperties =
    boostedTop.length > 0
      ? boostedTop.length >= 4
        ? boostedTop
        : [
            ...boostedTop,
            ...availableProperties
              .filter((p) => !boostedIds.has(p.id))
              .slice(0, Math.min(featuredSlotsLimit, 4) - boostedTop.length),
          ]
      : availableProperties.slice(0, Math.min(featuredSlotsLimit, 4));

  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      commune: quickCommune,
      type: quickType as any,
      searchQuery: quickQuery,
    }));
    onNavigatePath(
      buildSearchPath({
        q: quickQuery,
        commune: quickCommune,
        type: quickType,
        status: filters.status,
      })
    );
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* 1. HERO SECTION (Style maquette Kinimmo Bleu Royal & Jaune Doré) */}
      <section className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-900 border border-slate-200 shadow-sm">
        <div className="absolute inset-0">
          <img
            src={getOptimizedImageUrl(activeHeroImage, { width: 1400 }) || KINSHASA_HERO_FALLBACK}
            alt="Kinshasa Immobilier - Kinimmo"
            fetchPriority="high"
            decoding="async"
            onError={(e) => handlePropertyImageError(e)}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/30 sm:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-white/90 via-transparent to-white/40 sm:hidden" />
        </div>

        <div className="relative z-10 p-5 sm:p-10 lg:p-12 max-w-2xl space-y-3.5 sm:space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/95 border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-[#1D4ED8]" />
            <span>Kinshasa, RDC</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Trouvez. Vendez.
            <br />
            Louez. <span className="text-[#1D4ED8]">Gérez.</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-700 font-medium max-w-md leading-relaxed">
            La plateforme immobilière de référence à Kinshasa.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => onNavigatePath('/rechercher')}
              className="min-h-[46px] px-5 py-3 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-sm inline-flex items-center gap-2 shadow-md shadow-blue-900/15 transition-colors cursor-pointer active:scale-98"
            >
              <Search className="w-4 h-4" />
              <span>Rechercher un bien</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 2. BARRE DE 4 RACCOURCIS RAPIDES (À vendre, À louer, Agences, Services) */}
      <section className="bg-white border border-slate-200 rounded-2xl shadow-2xs grid grid-cols-4 divide-x divide-slate-100">
        <button
          type="button"
          onClick={() => {
            setFilters((prev) => ({ ...prev, status: 'for-sale' }));
            onNavigatePath('/rechercher?status=for-sale');
          }}
          className="min-h-[72px] p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-50/50 transition-colors cursor-pointer"
        >
          <Home className="w-5 h-5 text-[#1D4ED8]" />
          <span className="text-xs font-bold text-slate-800">À vendre</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilters((prev) => ({ ...prev, status: 'for-rent' }));
            onNavigatePath('/rechercher?status=for-rent');
          }}
          className="min-h-[72px] p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-50/50 transition-colors cursor-pointer"
        >
          <Key className="w-5 h-5 text-[#1D4ED8]" />
          <span className="text-xs font-bold text-slate-800">À louer</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigatePath('/agences')}
          className="min-h-[72px] p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-50/50 transition-colors cursor-pointer"
        >
          <Building2 className="w-5 h-5 text-[#1D4ED8]" />
          <span className="text-xs font-bold text-slate-800">Agences</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigatePath('/conciergerie')}
          className="min-h-[72px] p-2.5 flex flex-col items-center justify-center gap-1.5 hover:bg-blue-50/50 transition-colors cursor-pointer"
        >
          <Headphones className="w-5 h-5 text-[#1D4ED8]" />
          <span className="text-xs font-bold text-slate-800">Services</span>
        </button>
      </section>

      {/* 3. CARTE DE RECHERCHE RAPIDE (Commune, Type, Mot-clé, Rechercher) */}
      <section aria-label="Recherche rapide">
        <form
          onSubmit={handleQuickSearchSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-3"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            <div className="lg:col-span-4 flex items-center justify-between gap-2 border-b lg:border-b-0 lg:border-r border-slate-100 pb-2 lg:pb-0 lg:pr-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 shrink-0">
                <MapPin className="w-4 h-4 text-[#1D4ED8]" />
                <span>Commune</span>
              </div>
              <select
                aria-label="Commune"
                value={quickCommune}
                onChange={(e) => setQuickCommune(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="all">Toutes les communes</option>
                {[
                  'Gombe',
                  'Ngaliema',
                  'Limete',
                  'Kintambo',
                  'Lingwala',
                  'Mont-Ngafula',
                  'Lemba',
                  'Bandalungwa',
                  'Kalamu',
                  'Ndjili',
                  'Nsele',
                ].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-3 flex items-center justify-between gap-2 border-b lg:border-b-0 lg:border-r border-slate-100 pb-2 lg:pb-0 lg:pr-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 shrink-0">
                <Home className="w-4 h-4 text-[#1D4ED8]" />
                <span>Type</span>
              </div>
              <select
                aria-label="Type de bien"
                value={quickType}
                onChange={(e) => setQuickType(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="all">Tous les types</option>
                <option value="apartment">Appartement</option>
                <option value="house">Villa / Maison</option>
                <option value="penthouse">Penthouse</option>
                <option value="office">Bureaux</option>
                <option value="land">Terrain</option>
              </select>
            </div>

            <div className="lg:col-span-3 relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Rechercher un bien..."
                className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Rechercher</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 4. BARRE DE RÉASSURANCE + ACCÈS SECONDAIRES (Visites vidéo & Carte) */}
      <section className="space-y-2.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-3 grid grid-cols-3 divide-x divide-slate-100 text-center">
          <div className="px-1.5 flex flex-col sm:flex-row items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#1D4ED8] shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
              Transactions sécurisées
            </span>
          </div>
          <div className="px-1.5 flex flex-col sm:flex-row items-center justify-center gap-1.5">
            <Zap className="w-4 h-4 text-[#EAB308] shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
              Recherche rapide
            </span>
          </div>
          <div className="px-1.5 flex flex-col sm:flex-row items-center justify-center gap-1.5">
            <Users className="w-4 h-4 text-[#1D4ED8] shrink-0" />
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 leading-tight">
              Experts locaux
            </span>
          </div>
        </div>

        {/* Accès secondaires propres sur Accueil (Visites vidéo, Carte, Agents) */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => onNavigatePath('/visites')}
            className="shrink-0 min-h-[38px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#1D4ED8] text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Film className="w-4 h-4 text-[#1D4ED8]" />
            <span>Visites vidéo</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigatePath('/carte')}
            className="shrink-0 min-h-[38px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#1D4ED8] text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Compass className="w-4 h-4 text-[#1D4ED8]" />
            <span>Voir sur la carte</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigatePath('/agents')}
            className="shrink-0 min-h-[38px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#1D4ED8] text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Users className="w-4 h-4 text-[#1D4ED8]" />
            <span>Agents certifiés</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigatePath('/blog')}
            className="shrink-0 min-h-[38px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#1D4ED8] text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <span>Guides Kinshasa</span>
          </button>
        </div>
      </section>

      {/* 5. NOS BIENS EN VEDETTE (Grille 2 colonnes compacte sur mobile 360px, comme la maquette) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Nos biens en vedette
          </h2>
          <button
            type="button"
            onClick={() => onNavigatePath('/rechercher')}
            className="text-xs sm:text-sm font-bold text-[#1D4ED8] hover:text-[#0B3EA8] inline-flex items-center gap-1 cursor-pointer min-h-[36px] px-1"
          >
            <span>Voir tous</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {featuredProperties.length === 0 ? (
          <EmptyState
            icon={Home}
            title="Aucune annonce disponible pour cette sélection"
            description="Élargissez votre zone de recherche ou réinitialisez les filtres pour découvrir tous les biens à Kinshasa."
            actionLabel="Tout afficher"
            onAction={() => {
              resetFilters();
              onNavigatePath('/rechercher');
            }}
          />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {featuredProperties.map((prop) => {
              const isFav = wishlist.includes(prop.id);
              const boostDisplay = getActiveBoostDisplay(prop);
              const priceLabel = convertAndFormatPrice(
                prop.price,
                currency,
                cdfExchangeRate,
                prop.currency || 'USD'
              );
              const coverImg =
                (Array.isArray(prop.images) && prop.images[0]
                  ? resolveMediaUrl(prop.images[0])
                  : '') || FALLBACK_PROPERTY_IMAGE;

              return (
                <article
                  key={prop.id}
                  onClick={() => setActivePropertyModalId(prop.id)}
                  className="bg-white border border-slate-200 hover:border-[#1D4ED8]/50 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={getOptimizedImageUrl(coverImg, { width: 640 }) || FALLBACK_PROPERTY_IMAGE}
                      alt={prop.imagesMeta?.[0]?.alt || prop.title}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => handlePropertyImageError(e)}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[78%]">
                      <span className="px-2 py-0.5 rounded-lg bg-[#1D4ED8] text-white text-[10px] font-bold">
                        {prop.status === 'for-rent' ? 'À louer' : 'À vendre'}
                      </span>
                      {boostDisplay.primaryLabel && (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shadow-xs ${
                            boostDisplay.primaryLabel === 'Sponsorisé'
                              ? 'bg-slate-900/90 text-white'
                              : 'bg-[#FACC15] text-slate-950'
                          }`}
                        >
                          {boostDisplay.primaryLabel}
                        </span>
                      )}
                      {boostDisplay.isUrgent && (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[10px] font-extrabold shadow-xs">
                          Urgent
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist(prop.id);
                      }}
                      aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-slate-700 flex items-center justify-center shadow-xs cursor-pointer"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          isFav ? 'text-rose-600 fill-rose-600' : 'text-slate-700'
                        }`}
                      />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-[#1D4ED8] text-white text-[11px] sm:text-xs font-extrabold tabular-nums shadow-xs">
                      {priceLabel}
                      {prop.period === 'month' ? '/mois' : ''}
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 space-y-1 flex-1 flex flex-col justify-between">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                      {prop.title}
                    </h3>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2 flex-wrap tabular-nums">
                      {(prop.bedrooms ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Bed className="w-3 h-3 text-slate-400" />
                          {prop.bedrooms} ch.
                        </span>
                      )}
                      {(prop.bathrooms ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Bath className="w-3 h-3 text-slate-400" />
                          {prop.bathrooms} sdb
                        </span>
                      )}
                      {prop.area > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <Maximize className="w-3 h-3 text-slate-400" />
                          {prop.area} m²
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-semibold text-slate-700 flex items-center gap-1 truncate pt-0.5">
                      <MapPin className="w-3 h-3 text-[#1D4ED8] shrink-0" />
                      <span className="truncate">{prop.commune || prop.city || 'Kinshasa'}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. BANNIÈRE PRO BLEU ROYAL & BOUTON DORÉ (Max 2 appuis pour publier) */}
      <section className="rounded-2xl bg-gradient-to-r from-[#0B3EA8] to-[#1D4ED8] text-white p-4 sm:p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <Home className="w-6 h-6 text-[#FACC15]" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-sm sm:text-base font-extrabold text-white">
              Vous êtes agent ou agence ?
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 leading-snug">
              Publiez vos annonces et développez votre activité avec Kinimmo.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigatePath(user ? '/publier' : '/connexion')}
          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
        >
          <span>Publier une annonce</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* 7. CATALOGUE COMPLET DES BIENS DISPONIBLES */}
      {availableProperties.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Annonces récentes à Kinshasa
            </h2>
            <span className="text-xs font-bold text-slate-500 tabular-nums">
              {availableProperties.length} biens
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {availableProperties.slice(0, 6).map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onShare={onShareProperty}
              />
            ))}
          </div>

          {availableProperties.length > 6 && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onNavigatePath('/rechercher')}
                className="min-h-[44px] px-6 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#1D4ED8] text-[#1D4ED8] font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <span>Voir toutes les annonces ({availableProperties.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
