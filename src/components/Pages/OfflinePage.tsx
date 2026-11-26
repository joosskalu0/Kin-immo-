import React, { useMemo } from 'react';
import {
  WifiOff,
  RefreshCw,
  Clock,
  Heart,
  Home,
  MapPin,
  ArrowRight,
  Bed,
  Maximize,
  Phone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import {
  getRecentPages,
  getRecentProperties,
  RecentPropertySnapshot,
} from '../../utils/offlineCache';
import { convertAndFormatPrice } from '../../utils/currency';
import { FALLBACK_PROPERTY_IMAGE, handlePropertyImageError, resolveMediaUrl } from '../../utils/mediaUrl';
import { cleanPhoneNumberForTel } from '../../utils/whatsapp';

interface OfflinePageProps {
  onNavigatePath: (path: string) => void;
}

export const OfflinePage: React.FC<OfflinePageProps> = ({ onNavigatePath }) => {
  const { properties, wishlist, currency, cdfExchangeRate, setActivePropertyModalId } = useApp();
  const isOnline = useOnlineStatus();

  const recentPages = useMemo(() => {
    const stored = getRecentPages();
    if (stored.length > 0) return stored;
    return [
      { path: '/', title: 'Accueil Kinimmo', visitedAt: '' },
      { path: '/rechercher', title: 'Rechercher un bien', visitedAt: '' },
      { path: '/favoris', title: 'Mes favoris', visitedAt: '' },
    ];
  }, []);

  const recentProperties = useMemo<RecentPropertySnapshot[]>(() => {
    const stored = getRecentProperties();
    if (stored.length > 0) return stored;
    return properties.slice(0, 6).map((p) => ({
      id: p.id,
      title: p.title,
      price: p.price,
      currency: p.currency || 'USD',
      period: p.period,
      status: p.status,
      commune: p.commune || p.city || 'Kinshasa',
      quartier: p.quartier,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      area: p.area,
      image:
        (Array.isArray(p.images) && p.images[0] ? resolveMediaUrl(p.images[0]) : '') ||
        FALLBACK_PROPERTY_IMAGE,
      contactPhone: p.contactPhone,
      agencyName: p.agencyName,
      viewedAt: p.updatedAt || p.createdAt || '',
    }));
  }, [properties]);

  const favoriteSnapshots = useMemo<RecentPropertySnapshot[]>(() => {
    const byId = new Map<string, RecentPropertySnapshot>();
    for (const r of recentProperties) {
      byId.set(r.id, r);
    }
    for (const p of properties) {
      if (!byId.has(p.id)) {
        byId.set(p.id, {
          id: p.id,
          title: p.title,
          price: p.price,
          currency: p.currency || 'USD',
          period: p.period,
          status: p.status,
          commune: p.commune || p.city || 'Kinshasa',
          quartier: p.quartier,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          area: p.area,
          image:
            (Array.isArray(p.images) && p.images[0] ? resolveMediaUrl(p.images[0]) : '') ||
            FALLBACK_PROPERTY_IMAGE,
          contactPhone: p.contactPhone,
          agencyName: p.agencyName,
          viewedAt: p.updatedAt || p.createdAt || '',
        });
      }
    }
    return wishlist
      .map((id) => byId.get(id))
      .filter((item): item is RecentPropertySnapshot => Boolean(item));
  }, [wishlist, properties, recentProperties]);

  const handleRetry = () => {
    if (typeof window !== 'undefined') {
      if (navigator.onLine) {
        onNavigatePath('/');
      } else {
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-7 shadow-2xs space-y-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <WifiOff className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              {isOnline ? 'Connexion rétablie' : 'Vous êtes hors connexion'}
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              {isOnline
                ? 'Votre connexion Internet est de nouveau active. Vous pouvez reprendre votre navigation normalement.'
                : 'Le réseau mobile semble coupé. Consultez ci-dessous vos dernières pages visitées, les annonces récentes en cache et vos favoris enregistrés.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleRetry}
            className="min-h-[44px] px-5 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{isOnline ? 'Retour à l’accueil' : 'Réessayer la connexion'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigatePath('/')}
            className="min-h-[44px] px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Home className="w-4 h-4 text-[#1D4ED8]" />
            <span>Accueil en cache</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="offline-recent-pages" className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-[#1D4ED8]" />
          <h2 id="offline-recent-pages" className="text-base sm:text-lg font-extrabold text-slate-900">
            Pages vues récemment
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {recentPages.map((entry) => (
            <button
              key={entry.path}
              type="button"
              onClick={() => onNavigatePath(entry.path)}
              className="min-h-[52px] p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-[#1D4ED8] text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{entry.title}</p>
                <p className="text-xs text-slate-600 truncate">{entry.path}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#1D4ED8] shrink-0" />
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="offline-recent-properties" className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5 text-[#1D4ED8]" />
            <h2 id="offline-recent-properties" className="text-base sm:text-lg font-extrabold text-slate-900">
              Annonces vues récemment
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-600 tabular-nums">
            {recentProperties.length} en cache
          </span>
        </div>

        {recentProperties.length === 0 ? (
          <p className="text-sm text-slate-600">
            Aucune annonce enregistrée pour l’instant. Consultez des annonces en ligne pour y accéder hors réseau.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recentProperties.map((prop) => {
              const priceLabel = convertAndFormatPrice(
                prop.price,
                currency,
                cdfExchangeRate,
                prop.currency || 'USD'
              );
              return (
                <article
                  key={prop.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => setActivePropertyModalId(prop.id)}
                    className="text-left flex-1 cursor-pointer focus-visible:outline-none"
                  >
                    <div className="relative aspect-[16/10] bg-slate-200 overflow-hidden">
                      <img
                        src={prop.image || FALLBACK_PROPERTY_IMAGE}
                        alt={prop.title}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => handlePropertyImageError(e)}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg bg-[#1D4ED8] text-white text-xs font-extrabold tabular-nums">
                        {priceLabel}
                        {prop.period === 'month' ? '/mois' : ''}
                      </span>
                    </div>
                    <div className="p-3.5 space-y-1.5">
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{prop.title}</h3>
                      <p className="text-xs text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0" />
                        <span className="truncate">
                          {prop.commune}
                          {prop.quartier ? ` • ${prop.quartier}` : ''}
                        </span>
                      </p>
                      <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
                        {(prop.bedrooms ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Bed className="w-3.5 h-3.5" />
                            {prop.bedrooms} ch.
                          </span>
                        )}
                        {(prop.area ?? 0) > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Maximize className="w-3.5 h-3.5" />
                            {prop.area} m²
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  {prop.contactPhone && (
                    <div className="px-3.5 pb-3.5">
                      <a
                        href={`tel:${cleanPhoneNumberForTel(prop.contactPhone)}`}
                        className="min-h-[44px] w-full rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold inline-flex items-center justify-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        <span>Appeler {prop.contactPhone}</span>
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-labelledby="offline-favorites" className="rounded-2xl bg-white border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
            <h2 id="offline-favorites" className="text-base sm:text-lg font-extrabold text-slate-900">
              Vos favoris enregistrés
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigatePath('/favoris')}
            className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-[#1D4ED8] hover:bg-blue-50 cursor-pointer"
          >
            Ouvrir Favoris
          </button>
        </div>

        {favoriteSnapshots.length === 0 ? (
          <p className="text-sm text-slate-600">
            Aucun bien enregistré en favoris pour le moment. Touchez le cœur d’une annonce pour la garder accessible hors connexion.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favoriteSnapshots.map((fav) => {
              const priceLabel = convertAndFormatPrice(
                fav.price,
                currency,
                cdfExchangeRate,
                fav.currency || 'USD'
              );
              return (
                <button
                  key={fav.id}
                  type="button"
                  onClick={() => setActivePropertyModalId(fav.id)}
                  className="min-h-[76px] p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-[#1D4ED8] flex items-center gap-3 text-left cursor-pointer transition-colors"
                >
                  <img
                    src={fav.image || FALLBACK_PROPERTY_IMAGE}
                    alt={fav.title}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => handlePropertyImageError(e)}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-bold text-slate-900 truncate">{fav.title}</p>
                    <p className="text-xs font-extrabold text-[#1D4ED8] tabular-nums">{priceLabel}</p>
                    <p className="text-xs text-slate-600 truncate">{fav.commune}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
