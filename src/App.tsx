import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { trackPageView, initAllTracking } from './utils/analytics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePageView } from './components/HomePageView';
import { SearchPage } from './components/Pages/SearchPage';
import { SearchWidget } from './components/SearchWidget';
import { getPropertySlug, resolvePropertyBySlugOrId } from './utils/shareUtils';
import { AgentInviteModal } from './components/Dashboard/AgentInviteModal';
import { SocialShareModal } from './components/SocialShareModal';
import { CompareDock } from './components/CompareDock';
import { FloatingConciergeWidget } from './components/FloatingConciergeWidget';
import { PageHeaderBar } from './components/StateFeedback';
import { PWAMobileBanner } from './components/PWA/PWAInstallPrompt';
import { OfflineIndicator } from './components/PWA/OfflineIndicator';
import { recordRecentPage, recordRecentProperty } from './utils/offlineCache';

const WishlistPage = lazy(() =>
  import('./components/Pages/WishlistPage').then((m) => ({ default: m.WishlistPage }))
);
const AlertsPage = lazy(() =>
  import('./components/Pages/AlertsPage').then((m) => ({ default: m.AlertsPage }))
);
const AccountPage = lazy(() =>
  import('./components/Pages/AccountPage').then((m) => ({ default: m.AccountPage }))
);
const PublishPage = lazy(() =>
  import('./components/Pages/PublishPage').then((m) => ({ default: m.PublishPage }))
);
const BoostPage = lazy(() =>
  import('./components/Pages/BoostPage').then((m) => ({ default: m.BoostPage }))
);
const AuthPage = lazy(() =>
  import('./components/Pages/AuthPage').then((m) => ({ default: m.AuthPage }))
);
const ComparePage = lazy(() =>
  import('./components/Pages/ComparePage').then((m) => ({ default: m.ComparePage }))
);
const SecurityPage = lazy(() =>
  import('./components/Pages/SecurityPage').then((m) => ({ default: m.SecurityPage }))
);
const ProWorkspacePage = lazy(() =>
  import('./components/Dashboard/ProWorkspacePage').then((m) => ({ default: m.ProWorkspacePage }))
);
const PropertyMap = lazy(() =>
  import('./components/PropertyMap').then((m) => ({ default: m.PropertyMap }))
);
const AgentDirectory = lazy(() =>
  import('./components/AgentDirectory').then((m) => ({ default: m.AgentDirectory }))
);
const ShortcodesGallery = lazy(() =>
  import('./components/ShortcodesGallery').then((m) => ({ default: m.ShortcodesGallery }))
);
const PropertyDetailPage = lazy(() =>
  import('./components/PropertyDetailPage').then((m) => ({ default: m.PropertyDetailPage }))
);
const AdminPortal = lazy(() =>
  import('./components/Admin/AdminPortal').then((m) => ({ default: m.AdminPortal }))
);
const MonetizationPricingView = lazy(() =>
  import('./components/Monetization/MonetizationPricingView').then((m) => ({
    default: m.MonetizationPricingView,
  }))
);
const ConciergeriePage = lazy(() =>
  import('./components/Conciergerie/ConciergeriePage').then((m) => ({ default: m.ConciergeriePage }))
);
const VisitsReelsView = lazy(() =>
  import('./components/Visits/VisitsReelsView').then((m) => ({ default: m.VisitsReelsView }))
);
const NeighborhoodPageView = lazy(() =>
  import('./components/Content/NeighborhoodPageView').then((m) => ({
    default: m.NeighborhoodPageView,
  }))
);
const BlogGuidesView = lazy(() =>
  import('./components/Content/BlogGuidesView').then((m) => ({ default: m.BlogGuidesView }))
);
const HelpFaqView = lazy(() =>
  import('./components/Content/HelpFaqView').then((m) => ({ default: m.HelpFaqView }))
);
const LegalPageView = lazy(() =>
  import('./components/Content/LegalPageView').then((m) => ({ default: m.LegalPageView }))
);
const OfflinePage = lazy(() =>
  import('./components/Pages/OfflinePage').then((m) => ({ default: m.OfflinePage }))
);

const RouteLoadingFallback: React.FC = () => (
  <div
    role="status"
    aria-live="polite"
    className="min-h-[45vh] flex flex-col items-center justify-center gap-3 p-6 text-slate-600"
  >
    <div className="w-8 h-8 rounded-full border-3 border-slate-200 border-t-[#1D4ED8] animate-spin" />
    <span className="text-xs font-semibold">Chargement de la page...</span>
  </div>
);
import {
  DEFAULT_FAQ_ITEMS,
  DEFAULT_LEGAL_DOCUMENTS,
  resolveNeighborhoodBySlug,
} from './data/contentSeed';
import {
  KINIMMO_NAV_EVENT,
  ParsedAppRoute,
  goBackOrFallback,
  parseAppRoute,
} from './utils/navigation';
import {
  DEFAULT_FEATURED_SLOTS_LIMIT,
  isPropertyPubliclyVisible,
  parseFeaturedSlotsLimit,
  sortPropertiesWithTopSlots,
} from './utils/boostHelpers';

const AppContent: React.FC = () => {
  const {
    user,
    properties,
    filters,
    setFilters,
    activePropertyModalId,
    setActivePropertyModalId,
    blogArticles,
    legalDocuments,
    contactSettings,
  } = useApp();

  const [route, setRoute] = useState<ParsedAppRoute>(() => {
    if (typeof window !== 'undefined') {
      return parseAppRoute(window.location.pathname, window.location.search);
    }
    return parseAppRoute('/', '');
  });

  const [sharePropertyId, setSharePropertyId] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  // Sync URL query params on initial /rechercher visit
  useEffect(() => {
    if (route.tab === 'search') {
      const sp = route.searchParams;
      if (sp.q || sp.commune || sp.type || sp.status) {
        setFilters((prev) => ({
          ...prev,
          searchQuery: sp.q ?? prev.searchQuery,
          commune: sp.commune ?? prev.commune,
          type: (sp.type as any) ?? prev.type,
          status: (sp.status as any) ?? prev.status,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyParsedRoute = useCallback(
    (parsed: ParsedAppRoute) => {
      setRoute(parsed);
      if (parsed.propertySlugOrId) {
        setActivePropertyModalId(parsed.propertySlugOrId);
      } else {
        setActivePropertyModalId(null);
      }

      if (parsed.tab === 'search') {
        const sp = parsed.searchParams;
        if (sp.q !== undefined || sp.commune !== undefined || sp.type !== undefined || sp.status !== undefined) {
          setFilters((prev) => ({
            ...prev,
            ...(sp.q !== undefined ? { searchQuery: sp.q } : {}),
            ...(sp.commune !== undefined ? { commune: sp.commune } : {}),
            ...(sp.type !== undefined ? { type: sp.type as any } : {}),
            ...(sp.status !== undefined ? { status: sp.status as any } : {}),
          }));
        }
      }
    },
    [setActivePropertyModalId, setFilters]
  );

  const navigateToPath = useCallback(
    (path: string, replace = false) => {
      const cleanPath = path.startsWith('/') ? path : `/${path}`;
      const [pathnamePart, searchPart = ''] = cleanPath.split('?');
      const parsed = parseAppRoute(pathnamePart, searchPart ? `?${searchPart}` : '');
      applyParsedRoute(parsed);

      if (typeof window !== 'undefined') {
        try {
          const currentFull = `${window.location.pathname}${window.location.search}`;
          if (currentFull !== cleanPath) {
            if (replace) {
              window.history.replaceState({}, '', cleanPath);
            } else {
              window.history.pushState({}, '', cleanPath);
            }
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch {}
      }
    },
    [applyParsedRoute]
  );

  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    initAllTracking();

    const handlePopState = () => {
      try {
        const parsed = parseAppRoute(window.location.pathname, window.location.search);
        applyParsedRoute(parsed);
      } catch {}
    };

    const handleCustomNavigate = (e: Event) => {
      const custom = e as CustomEvent<{ path?: string; replace?: boolean }>;
      if (custom.detail?.path) {
        navigateToPath(custom.detail.path, Boolean(custom.detail.replace));
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener(KINIMMO_NAV_EVENT, handleCustomNavigate);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener(KINIMMO_NAV_EVENT, handleCustomNavigate);
    };
  }, [applyParsedRoute, navigateToPath]);

  useEffect(() => {
    const tabTitles: Record<string, string> = {
      home: 'Accueil - Kinimmo Kinshasa',
      search: 'Rechercher un bien à Kinshasa - Kinimmo',
      map: 'Carte des biens à Kinshasa - Kinimmo',
      wishlist: 'Mes favoris - Kinimmo',
      compare: 'Comparer des biens - Kinimmo',
      alerts: 'Mes alertes immobilières - Kinimmo',
      account: 'Mon compte - Kinimmo',
      security: 'Sécurité du compte - Kinimmo',
      auth: 'Connexion / Inscription - Kinimmo',
      publish: 'Publier une annonce - Kinimmo',
      boost: 'Mise en avant (Boost) - Kinimmo',
      pro: 'Espace Pro - Kinimmo',
      visites: 'Visites vidéo - Kinimmo',
      agencies: 'Agences immobilières à Kinshasa - Kinimmo',
      agents: 'Agents immobiliers à Kinshasa - Kinimmo',
      conciergerie: 'Conciergerie immobilière - Kinimmo',
      pricing: 'Tarifs et abonnements - Kinimmo',
      neighborhood: 'Immobilier par quartier - Kinimmo',
      blog: 'Guides immobiliers - Kinimmo',
      aide: "Centre d'aide - Kinimmo",
      legal: 'Informations légales - Kinimmo',
      admin: 'Administration - Kinimmo',
      offline: 'Mode hors connexion - Kinimmo',
    };
    const currentPath = `${window.location.pathname || '/'}${window.location.search || ''}`;
    const label = tabTitles[route.tab] || `Kinimmo - ${route.tab}`;
    trackPageView(label, window.location.pathname || '/');
    recordRecentPage(currentPath, label);
  }, [route.tab, route.proSection, route.neighborhoodSlug, route.blogSlug]);

  useEffect(() => {
    if (!activePropertyModalId) return;
    const activeProp = resolvePropertyBySlugOrId(activePropertyModalId, properties);
    if (activeProp) {
      recordRecentProperty(activeProp);
      recordRecentPage(
        `/annonces/${encodeURIComponent(getPropertySlug(activeProp))}`,
        activeProp.title
      );
    }
  }, [activePropertyModalId, properties]);

  // GESTION DYNAMIQUE DE LA CANONICALISATION, OPEN GRAPH & SCHEMA.ORG JSON-LD
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const origin = window.location.origin;
    let canonicalUrl = `${origin}${window.location.pathname || '/'}`;
    let pageTitle = 'Kinimmo - Immobilier à Kinshasa | Trouvez. Vendez. Louez. Gérez.';
    let metaDescription =
      'La plateforme immobilière de référence à Kinshasa : maisons, appartements, terrains titrés, agences certifiées et visites vidéo.';
    let structuredData: Record<string, any> | null = null;

    if (activePropertyModalId) {
      const activeProp = resolvePropertyBySlugOrId(activePropertyModalId, properties);
      if (activeProp) {
        canonicalUrl = `${origin}/annonces/${encodeURIComponent(getPropertySlug(activeProp))}`;
        pageTitle = `${activeProp.title} à ${activeProp.commune || 'Kinshasa'} - Kinimmo`;
        if (activeProp.description) {
          metaDescription = `${activeProp.commune || 'Kinshasa'}. ${activeProp.description.slice(0, 140)}...`;
        }
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'RealEstateListing',
          name: activeProp.title,
          description: activeProp.description,
          url: canonicalUrl,
          dateModified: activeProp.updatedAt || activeProp.createdAt,
          image: Array.isArray(activeProp.images) ? activeProp.images[0] : undefined,
          offers: {
            '@type': 'Offer',
            price: activeProp.price,
            priceCurrency: activeProp.currency || 'USD',
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: activeProp.commune || activeProp.city || 'Kinshasa',
            addressCountry: 'CD',
          },
        };
      }
    } else if (route.tab === 'neighborhood') {
      const profile = resolveNeighborhoodBySlug(route.neighborhoodSlug, properties);
      canonicalUrl = `${origin}/quartiers/${encodeURIComponent(profile?.slug || route.neighborhoodSlug)}`;
      pageTitle = profile
        ? `Immobilier à ${profile.name} (${profile.commune}) | Kinimmo`
        : 'Quartiers à Kinshasa | Kinimmo';
      metaDescription = profile
        ? `${profile.stats.activeCount} biens disponibles à ${profile.name}. ${profile.tagline}`
        : metaDescription;
      if (profile) {
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'Place',
          name: `${profile.name}, Kinshasa`,
          description: profile.description,
          url: canonicalUrl,
          address: {
            '@type': 'PostalAddress',
            addressLocality: profile.commune,
            addressRegion: 'Kinshasa',
            addressCountry: 'CD',
          },
        };
      }
    } else if (route.tab === 'blog') {
      const article = route.blogSlug ? blogArticles.find((a) => a.slug === route.blogSlug) : null;
      if (article) {
        canonicalUrl = `${origin}/blog/${encodeURIComponent(article.slug)}`;
        pageTitle = `${article.title} | Kinimmo`;
        metaDescription = article.excerpt;
        structuredData = {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: article.title,
          description: article.excerpt,
          image: article.coverImage,
          author: { '@type': 'Organization', name: article.authorName || 'Rédaction Kinimmo' },
          datePublished: article.publishedAt,
          dateModified: article.updatedAt,
          mainEntityOfPage: canonicalUrl,
        };
      } else {
        pageTitle = 'Guides Immobiliers Kinshasa & RDC | Kinimmo';
      }
    } else if (route.tab === 'aide') {
      pageTitle = "Centre d'aide & FAQ | Kinimmo";
      structuredData = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: DEFAULT_FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      };
    } else if (route.tab === 'legal') {
      const doc =
        legalDocuments.find((d) => d.slug === route.legalSlug) ||
        DEFAULT_LEGAL_DOCUMENTS.find((d) => d.slug === route.legalSlug);
      pageTitle = doc ? `${doc.title} | Kinimmo` : 'Informations Légales | Kinimmo';
      metaDescription = doc ? doc.subtitle : metaDescription;
    }

    document.title = pageTitle;

    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);
    const ogDescMeta = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDescMeta) ogDescMeta.setAttribute('content', metaDescription);
    const descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', metaDescription);

    const existingLd = document.getElementById('kinimmo-listing-jsonld');
    if (structuredData) {
      const ldScript = existingLd || document.createElement('script');
      ldScript.setAttribute('type', 'application/ld+json');
      ldScript.setAttribute('id', 'kinimmo-listing-jsonld');
      ldScript.textContent = JSON.stringify(structuredData);
      if (!existingLd) document.head.appendChild(ldScript);
    } else if (existingLd) {
      existingLd.remove();
    }
  }, [route, activePropertyModalId, properties, blogArticles, legalDocuments]);

  // Filtrage complet des annonces (strict : aucune annonce suspendue/masquée/non publique n'apparaît publiquement)
  const filteredProperties = properties.filter((p) => {
    const lifecycle = String(p.listingStatus || '').toUpperCase();
    const isSoldRequested = filters.status === 'sold';

    if (
      p.published === false ||
      p.softHiddenByPlan === true ||
      p.fraudStatus === 'suspect' ||
      p.isSuspended === true ||
      p.suspended === true ||
      lifecycle === 'DRAFT' ||
      lifecycle === 'ARCHIVED' ||
      lifecycle === 'PENDING_REVIEW' ||
      lifecycle === 'SUSPENDED' ||
      lifecycle === 'HIDDEN'
    ) {
      return false;
    }

    if (isSoldRequested) {
      if (p.status !== 'sold' && lifecycle !== 'SOLD') return false;
    } else if (!isPropertyPubliclyVisible(p)) {
      return false;
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.trim().toLowerCase();
      const tokens = query.split(/\s+/).filter(Boolean);
      const amenitiesText = Array.isArray(p.amenities) ? p.amenities.join(' ').toLowerCase() : '';
      const customFieldsText = p.customFields
        ? Object.values(p.customFields)
            .filter((v) => typeof v === 'string' || typeof v === 'number')
            .join(' ')
            .toLowerCase()
        : '';
      const cadastreText = (p as any).cadastre_data
        ? Object.values((p as any).cadastre_data).join(' ').toLowerCase()
        : '';
      const searchableCorpus = [
        p.title,
        p.description || '',
        p.type || '',
        p.city || '',
        p.address || '',
        p.commune || '',
        p.quartier || '',
        p.avenue || '',
        p.referencePoint || '',
        p.trust_level || '',
        amenitiesText,
        customFieldsText,
        cadastreText,
      ]
        .join(' ')
        .toLowerCase();

      if (!tokens.every((token) => searchableCorpus.includes(token))) return false;
    }

    if (filters.commune && filters.commune !== 'all') {
      const target = filters.commune.toLowerCase();
      if (
        !(p.commune || '').toLowerCase().includes(target) &&
        !(p.address || '').toLowerCase().includes(target)
      ) {
        return false;
      }
    }

    if (filters.quartier && filters.quartier !== 'all') {
      const target = filters.quartier.toLowerCase();
      if (
        !(p.quartier || '').toLowerCase().includes(target) &&
        !(p.address || '').toLowerCase().includes(target)
      ) {
        return false;
      }
    }

    if (filters.avenue) {
      const target = filters.avenue.toLowerCase();
      if (
        !(p.avenue || '').toLowerCase().includes(target) &&
        !(p.address || '').toLowerCase().includes(target)
      ) {
        return false;
      }
    }

    if (filters.type && filters.type !== 'all' && p.type !== filters.type) {
      return false;
    }

    if (filters.status && filters.status !== 'all') {
      if (p.status !== filters.status) return false;
    } else if (p.status === 'sold') {
      return false;
    }

    if (filters.maxPrice && p.price > filters.maxPrice) return false;
    if (filters.minBedrooms && p.bedrooms < filters.minBedrooms) return false;
    if (filters.minArea && p.area < filters.minArea) return false;

    if (filters.customFields && Object.keys(filters.customFields).length > 0) {
      for (const [key, val] of Object.entries(filters.customFields)) {
        if (val) {
          const propVal = p.customFields?.[key];
          if (!propVal || !String(propVal).toLowerCase().includes(String(val).toLowerCase())) {
            return false;
          }
        }
      }
    }

    return true;
  });

  const baseSortedProperties = [...filteredProperties].sort((a, b) => {
    if (filters.sortBy === 'price-asc') return a.price - b.price;
    if (filters.sortBy === 'price-desc') return b.price - a.price;
    if (filters.sortBy === 'popular') return b.viewsCount - a.viewsCount;
    if (filters.sortBy === 'area-desc') return b.area - a.area;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const featuredSlotsLimit = parseFeaturedSlotsLimit(
    contactSettings?.featuredSlotsLimit ?? DEFAULT_FEATURED_SLOTS_LIMIT
  );
  const sortedProperties =
    filters.sortBy === 'price-asc' || filters.sortBy === 'price-desc' || filters.sortBy === 'area-desc'
      ? baseSortedProperties
      : sortPropertiesWithTopSlots(baseSortedProperties, featuredSlotsLimit);

  const propertyToShare = properties.find((p) => p.id === sharePropertyId) || null;
  const isProUser = Boolean(user && (user.role === 'agent' || user.role === 'agency'));
  const isProMode = route.tab === 'pro' || (isProUser && (route.tab === 'publish' || route.tab === 'boost'));

  // 1. Page détail dédiée (/annonces/:slug)
  if (activePropertyModalId) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <PropertyDetailPage
          propertyIdOrSlug={activePropertyModalId}
          onBackHome={() => {
            setActivePropertyModalId(null);
            if (window.location.pathname.startsWith('/annonces/')) {
              goBackOrFallback('/', navigateToPath);
            }
          }}
          onOpenShareModal={(id) => setSharePropertyId(id)}
          onOpenNeighborhood={(slug) => navigateToPath(`/quartiers/${slug}`)}
        />
        <AgentInviteModal />
        <SocialShareModal property={propertyToShare} onClose={() => setSharePropertyId(null)} />
      </Suspense>
    );
  }

  // 2. Portail Admin (/admin et /admin/:section)
  if (route.tab === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-[#1D4ED8] selection:text-white">
        <Suspense fallback={<RouteLoadingFallback />}>
          <AdminPortal onReturnHome={() => navigateToPath('/')} />
        </Suspense>
      </div>
    );
  }

  const hideCompareDock = ['compare', 'publish', 'boost', 'auth', 'pro', 'admin', 'visites', 'offline'].includes(route.tab);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans overflow-x-hidden w-full max-w-full">
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 text-xs text-center fixed top-14 lg:top-16 left-0 right-0 z-30">
          La limite Google Maps a été atteinte. Les cartes de quartier restent accessibles.
        </div>
      )}

      <Header
        currentTab={route.tab}
        proSection={route.proSection}
        isProMode={isProMode}
        onNavigatePath={navigateToPath}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className={`flex-1 w-full pt-14 lg:pt-16 focus:outline-none ${
          route.tab === 'conciergerie' || route.tab === 'visites'
            ? ''
            : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6'
        } pb-24 lg:pb-12`}
      >
        <OfflineIndicator
          currentTab={route.tab}
          onOpenOfflinePage={() => navigateToPath('/hors-ligne')}
        />
        {(route.tab === 'home' || route.tab === 'search') && <PWAMobileBanner />}

        <Suspense fallback={<RouteLoadingFallback />}>
        {route.tab === 'home' && (
          <HomePageView
            sortedProperties={sortedProperties}
            onNavigatePath={navigateToPath}
            onShareProperty={(id) => setSharePropertyId(id)}
          />
        )}

        {route.tab === 'search' && (
          <SearchPage
            sortedProperties={sortedProperties}
            onNavigatePath={navigateToPath}
            onShareProperty={(id) => setSharePropertyId(id)}
          />
        )}

        {route.tab === 'map' && (
          <div className="space-y-4">
            <PageHeaderBar
              title="Carte des biens"
              subtitle="Kinshasa par commune et quartier"
              fallbackPath="/rechercher"
            />
            <SearchWidget />
            <PropertyMap properties={sortedProperties} height="h-[520px] lg:h-[700px]" />
          </div>
        )}

        {route.tab === 'wishlist' && (
          <WishlistPage
            onNavigatePath={navigateToPath}
            onShareProperty={(id) => setSharePropertyId(id)}
          />
        )}

        {route.tab === 'compare' && <ComparePage onNavigatePath={navigateToPath} />}

        {route.tab === 'alerts' && <AlertsPage onNavigatePath={navigateToPath} />}

        {route.tab === 'account' && <AccountPage onNavigatePath={navigateToPath} />}

        {route.tab === 'security' && <SecurityPage onNavigatePath={navigateToPath} />}

        {route.tab === 'auth' && (
          <AuthPage
            authView={route.authView}
            authToken={route.authToken}
            onNavigatePath={navigateToPath}
          />
        )}

        {route.tab === 'publish' && (
          <PublishPage editPropertyId={route.editPropertyId} onNavigatePath={navigateToPath} />
        )}

        {route.tab === 'boost' && (
          <BoostPage
            propertyId={route.boostPropertyId}
            invoiceId={route.boostInvoiceId}
            optionId={route.boostOptionId}
            onNavigatePath={navigateToPath}
          />
        )}

        {route.tab === 'pro' && (
          <ProWorkspacePage
            proSection={route.proSection}
            proSubSection={route.proSubSection}
            onNavigatePath={navigateToPath}
          />
        )}

        {route.tab === 'visites' && (
          <VisitsReelsView
            onReturnHome={() => goBackOrFallback('/', navigateToPath)}
            onOpenPropertyModal={(id) => setActivePropertyModalId(id)}
            onOpenShareModal={(id) => setSharePropertyId(id)}
          />
        )}

        {route.tab === 'agencies' && (
          <AgentDirectory initialTab="agencies" onReturnHome={() => navigateToPath('/')} />
        )}

        {route.tab === 'agents' && (
          <AgentDirectory initialTab="agents" onReturnHome={() => navigateToPath('/')} />
        )}

        {route.tab === 'shortcodes' && (
          <ShortcodesGallery onReturnHome={() => navigateToPath('/')} />
        )}

        {route.tab === 'pricing' && <MonetizationPricingView />}

        {route.tab === 'conciergerie' && (
          <ConciergeriePage
            onReturnHome={() => navigateToPath('/')}
            onExploreProperties={() => navigateToPath('/rechercher')}
          />
        )}

        {route.tab === 'neighborhood' && (
          <NeighborhoodPageView
            slug={route.neighborhoodSlug}
            onSelectNeighborhood={(slug) => navigateToPath(`/quartiers/${slug}`)}
            onReturnHome={() => navigateToPath('/')}
            onOpenShare={(id) => setSharePropertyId(id)}
            onOpenConciergerie={() => navigateToPath('/conciergerie')}
          />
        )}

        {route.tab === 'blog' && (
          <BlogGuidesView
            articleSlug={route.blogSlug}
            onSelectArticle={(slug) => navigateToPath(slug ? `/blog/${slug}` : '/blog')}
            onSelectNeighborhood={(slug) => navigateToPath(`/quartiers/${slug}`)}
            onReturnHome={() => navigateToPath('/')}
          />
        )}

        {route.tab === 'aide' && (
          <HelpFaqView
            onReturnHome={() => navigateToPath('/')}
            onOpenConciergerie={() => navigateToPath('/conciergerie')}
          />
        )}

        {route.tab === 'legal' && (
          <LegalPageView
            slug={route.legalSlug}
            onSelectLegalSlug={(slug) => navigateToPath(`/${slug}`)}
            onReturnHome={() => navigateToPath('/')}
          />
        )}

        {route.tab === 'offline' && <OfflinePage onNavigatePath={navigateToPath} />}
        </Suspense>
      </main>

      {!hideCompareDock && <CompareDock />}

      <FloatingConciergeWidget
        onNavigateToConciergerie={() => navigateToPath('/conciergerie')}
      />

      <AgentInviteModal />
      <SocialShareModal property={propertyToShare} onClose={() => setSharePropertyId(null)} />

      {route.tab !== 'visites' && <Footer onNavigate={navigateToPath} />}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
