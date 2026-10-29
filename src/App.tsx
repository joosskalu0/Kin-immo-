import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { trackPageView, initAllTracking } from './utils/analytics';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { SearchWidget } from './components/SearchWidget';
import { PropertyCard } from './components/PropertyCard';
import { PropertyMap } from './components/PropertyMap';
import { AgentDirectory } from './components/AgentDirectory';
import { ShortcodesGallery } from './components/ShortcodesGallery';
import { UserDashboard } from './components/Dashboard/UserDashboard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { PropertyFormModal } from './components/PropertyFormModal';
import { FieldsBuilderModal } from './components/FieldsBuilder/FieldsBuilderModal';
import { CompareModal } from './components/CompareModal';
import { AuthModal } from './components/AuthModal';
import { AgentInviteModal } from './components/Dashboard/AgentInviteModal';
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { SocialShareModal } from './components/SocialShareModal';
import { CompareDock } from './components/CompareDock';
import { AdminPortal } from './components/Admin/AdminPortal';
import { MonetizationPricingView } from './components/Monetization/MonetizationPricingView';
import { ArchitecturalHeroSlider } from './components/ArchitecturalHeroSlider';
import { FloatingConciergeWidget } from './components/FloatingConciergeWidget';
import { ConciergeriePage } from './components/Conciergerie/ConciergeriePage';
import { VisitsReelsView } from './components/Visits/VisitsReelsView';
import { AgentDashboardView } from './components/Dashboard/AgentDashboardView';
import { AgencyDashboardView } from './components/Dashboard/AgencyDashboardView';
import {
  Home,
  Building2,
  Briefcase,
  MapPin,
  Grid,
  List,
  Map as MapIcon,
  Sparkles,
  SlidersHorizontal,
  Flame,
  ArrowUpDown,
  Zap,
  Bot,
  MessageSquareCode,
  Car,
  ShieldCheck,
  Compass,
  PlayCircle,
  Film,
  User as UserIcon,
} from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    user,
    properties,
    filters,
    setFilters,
    setIsFieldsBuilderOpen,
    activePropertyModalId,
    setActivePropertyModalId,
    setIsSubmitPropertyOpen,
    setIsSecurityModalOpen,
    setIsAuthModalOpen
  } = useApp();

  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const pathname = window.location.pathname;
        if (pathname === '/admin' || pathname.startsWith('/admin/')) {
          return 'admin';
        }
        if (pathname === '/conciergerie' || pathname.startsWith('/conciergerie')) {
          return 'conciergerie';
        }
        if (pathname === '/visites' || pathname.startsWith('/visites')) {
          return 'visites';
        }
        if (pathname === '/agent-dashboard' || pathname.startsWith('/agent-dashboard')) {
          return 'agent-dashboard';
        }
        if (pathname === '/agency-dashboard' || pathname.startsWith('/agency-dashboard')) {
          return 'agency-dashboard';
        }
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && ['home', 'visites', 'map', 'agents', 'agencies', 'shortcodes', 'dashboard', 'agent-dashboard', 'agency-dashboard', 'wishlist', 'admin', 'pricing', 'conciergerie'].includes(tab)) {
          return tab;
        }
      } catch {}
    }
    return 'home';
  }); // 'home' | 'visites' | 'map' | 'agents' | 'agencies' | 'shortcodes' | 'dashboard' | 'agent-dashboard' | 'agency-dashboard' | 'wishlist' | 'admin' | 'pricing' | 'conciergerie'
  const [sharePropertyId, setSharePropertyId] = useState<string | null>(null);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const handleGoHome = () => {
    setActivePropertyModalId(null);
    setIsFieldsBuilderOpen(false);
    setCurrentTab('home');
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('tab');
      url.searchParams.delete('property');
      const targetPath = (url.pathname === '/admin' || url.pathname === '/conciergerie' || url.pathname === '/visites') ? '/' : url.pathname;
      window.history.pushState({}, '', targetPath + (url.search ? url.search : ''));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  };

  useEffect(() => {
    initAllTracking();

    const handleTabPopState = () => {
      try {
        const pathname = window.location.pathname;
        if (pathname === '/admin' || pathname.startsWith('/admin/')) {
          setCurrentTab('admin');
          return;
        }
        if (pathname === '/conciergerie' || pathname.startsWith('/conciergerie')) {
          setCurrentTab('conciergerie');
          return;
        }
        if (pathname === '/visites' || pathname.startsWith('/visites')) {
          setCurrentTab('visites');
          return;
        }
        if (pathname === '/agent-dashboard' || pathname.startsWith('/agent-dashboard')) {
          setCurrentTab('agent-dashboard');
          return;
        }
        if (pathname === '/agency-dashboard' || pathname.startsWith('/agency-dashboard')) {
          setCurrentTab('agency-dashboard');
          return;
        }
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && ['home', 'visites', 'map', 'agents', 'agencies', 'shortcodes', 'dashboard', 'agent-dashboard', 'agency-dashboard', 'wishlist', 'admin', 'pricing', 'conciergerie'].includes(tab)) {
          setCurrentTab(tab);
          return;
        }
        setCurrentTab('home');
      } catch {}
    };

    window.addEventListener('popstate', handleTabPopState);
    return () => window.removeEventListener('popstate', handleTabPopState);
  }, []);

  // Strict role segregation: Agent never enters agency space, Agency never enters agent space, Admin stays in admin dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'agent' && currentTab === 'agency-dashboard') {
        setCurrentTab('agent-dashboard');
      } else if (user.role === 'agency' && currentTab === 'agent-dashboard') {
        setCurrentTab('agency-dashboard');
      } else if (user.role === 'admin' && (currentTab === 'agent-dashboard' || currentTab === 'agency-dashboard')) {
        setCurrentTab('dashboard');
      }
    }
  }, [user, currentTab]);

  useEffect(() => {
    const tabTitles: Record<string, string> = {
      home: 'Accueil - Annonces Immobilières Kinshasa',
      visites: 'Kinimmo Visites - Vidéos Immersives des Biens Immobiliers Kinshasa',
      map: 'Carte Interactive des Biens - Kinshasa',
      agents: 'Annuaire des Agents & Agences Immobilières',
      agencies: 'Agences Immobilières Agréées - Kinshasa',
      shortcodes: 'Galerie des Shortcodes & Widgets',
      dashboard: 'Tableau de Bord & Gestion Immobilière',
      'agent-dashboard': 'Tableau de Bord Agent Immobilier - Kinimmo',
      'agency-dashboard': 'Tableau de Bord Agence Immobilière - Kinimmo',
      wishlist: 'Mes Favoris Sauvegardés',
      pricing: 'Tarifs & Abonnements - Kinimmo',
      conciergerie: 'Conciergerie Immobilière - Votre recherche, notre accompagnement | Kinimmo',
      admin: 'Panneau d’Administration Sécurisé - Kinimmo',
    };
    trackPageView(tabTitles[currentTab] || `Kinshasa Immo - ${currentTab}`, `/${currentTab}`);
    
    // Mettre à jour l'historique d'URL pour /conciergerie, /visites et /admin
    if (typeof window !== 'undefined') {
      try {
        if (currentTab === 'admin') {
          if (!window.location.pathname.startsWith('/admin')) {
            window.history.pushState({}, '', '/admin');
          }
        } else if (currentTab === 'conciergerie' && window.location.pathname !== '/conciergerie') {
          window.history.pushState({}, '', '/conciergerie');
        } else if (currentTab === 'visites' && window.location.pathname !== '/visites') {
          window.history.pushState({}, '', '/visites');
        } else if (currentTab !== 'admin' && currentTab !== 'conciergerie' && currentTab !== 'visites' && (window.location.pathname.startsWith('/admin') || window.location.pathname === '/conciergerie' || window.location.pathname === '/visites')) {
          window.history.pushState({}, '', '/');
        }
      } catch {}
    }
  }, [currentTab]);

  // GESTION DYNAMIQUE DE LA CANONICALISATION ET DES META-TAGS SEO (Google Indexation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const origin = window.location.origin;
    let canonicalUrl = `${origin}/`;
    let pageTitle = 'Kinshasa Immobilier - Plateforme Immobilière & Gestion RDC';
    let metaDescription = 'Portail immobilier de référence en RDC : Vente, location, gestion locative, terrains titrés et annuaire des agents certifiés à Kinshasa.';

    if (activePropertyModalId) {
      const activeProp = properties.find((p) => p.id === activePropertyModalId);
      if (activeProp) {
        canonicalUrl = `${origin}/?property=${encodeURIComponent(activeProp.id)}`;
        pageTitle = `${activeProp.title} à ${activeProp.commune || 'Kinshasa'} - Kinshasa Immobilier`;
        if (activeProp.description) {
          metaDescription = `${activeProp.type === 'land' ? 'Terrain' : 'Bien'} à ${activeProp.commune || 'Kinshasa'}. ${activeProp.description.slice(0, 140)}...`;
        }
      }
    } else if (currentTab === 'visites') {
      canonicalUrl = `${origin}/visites`;
      pageTitle = 'Kinimmo Visites - Vidéos Immersives des Biens Immobiliers Kinshasa';
      metaDescription = 'Découvrez les appartements et villas à Kinshasa en vidéos 30s immersives haute fidélité.';
    } else if (currentTab === 'conciergerie') {
      canonicalUrl = `${origin}/conciergerie`;
      pageTitle = 'Conciergerie Immobilière Kinshasa - Recherche sur-mesure & Visites | Kinimmo';
      metaDescription = 'Service de conciergerie VIP pour trouver et visiter votre bien immobilier à Kinshasa (Gombe, Ngaliema, Limete).';
    } else if (currentTab === 'map') {
      canonicalUrl = `${origin}/?tab=map`;
      pageTitle = 'Carte Interactive des Biens Immobiliers à Kinshasa | Kinimmo';
      metaDescription = 'Carte interactive géolocalisée des biens à vendre et à louer à Kinshasa par commune et quartier.';
    } else if (currentTab === 'agents') {
      canonicalUrl = `${origin}/?tab=agents`;
      pageTitle = 'Annuaire des Agents Immobiliers Vérifiés à Kinshasa | Kinimmo';
      metaDescription = 'Trouvez un agent immobilier indépendant certifié et audité à Kinshasa avec badge Kinimmo Trust.';
    } else if (currentTab === 'agencies') {
      canonicalUrl = `${origin}/?tab=agencies`;
      pageTitle = 'Agences Immobilières Agréées à Kinshasa | Kinimmo';
      metaDescription = 'Répertoire des agences immobilières agréées avec licence officielle et collaborateurs certifiés.';
    } else if (currentTab === 'pricing') {
      canonicalUrl = `${origin}/?tab=pricing`;
      pageTitle = 'Tarifs & Abonnements Particuliers et Professionnels | Kinimmo';
      metaDescription = 'Formules gratuites et forfaits professionnels pour publier et booster vos biens à Kinshasa.';
    } else if (currentTab === 'home') {
      canonicalUrl = `${origin}/`;
    } else {
      canonicalUrl = `${origin}/?tab=${encodeURIComponent(currentTab)}`;
    }

    // Mise à jour de document.title
    document.title = pageTitle;

    // Mise à jour ou création de <link rel="canonical">
    let canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // Mise à jour de <meta property="og:url">
    let ogUrl = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', canonicalUrl);

    // Mise à jour de <meta property="og:title"> et twitter:title
    const ogTitle = document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);
    const twTitle = document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
    if (twTitle) twTitle.setAttribute('content', pageTitle);

    // Mise à jour de <meta name="description"> et og:description
    const descMeta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (descMeta) descMeta.setAttribute('content', metaDescription);
    const ogDescMeta = document.querySelector<HTMLMetaElement>('meta[property="og:description"]');
    if (ogDescMeta) ogDescMeta.setAttribute('content', metaDescription);
    const twDescMeta = document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
    if (twDescMeta) twDescMeta.setAttribute('content', metaDescription);
  }, [currentTab, activePropertyModalId, properties]);

  // Filter Properties Logic
  const filteredProperties = properties.filter((p) => {
    // Search Query (includes title, address, city, commune, quartier, avenue, reference point)
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCity = p.city?.toLowerCase().includes(q);
      const matchAddress = p.address?.toLowerCase().includes(q);
      const matchCommune = p.commune?.toLowerCase().includes(q);
      const matchQuartier = p.quartier?.toLowerCase().includes(q);
      const matchAvenue = p.avenue?.toLowerCase().includes(q);
      const matchRef = p.referencePoint?.toLowerCase().includes(q);
      if (!matchTitle && !matchCity && !matchAddress && !matchCommune && !matchQuartier && !matchAvenue && !matchRef) {
        return false;
      }
    }

    // Commune Filter
    if (filters.commune && filters.commune !== 'all') {
      const targetCommune = filters.commune.toLowerCase();
      const propCommune = (p.commune || '').toLowerCase();
      const propAddress = (p.address || '').toLowerCase();
      if (!propCommune.includes(targetCommune) && !propAddress.includes(targetCommune)) {
        return false;
      }
    }

    // Quartier Filter
    if (filters.quartier && filters.quartier !== 'all') {
      const targetQuartier = filters.quartier.toLowerCase();
      const propQuartier = (p.quartier || '').toLowerCase();
      const propAddress = (p.address || '').toLowerCase();
      if (!propQuartier.includes(targetQuartier) && !propAddress.includes(targetQuartier)) {
        return false;
      }
    }

    // Avenue Filter
    if (filters.avenue) {
      const targetAvenue = filters.avenue.toLowerCase();
      const propAvenue = (p.avenue || '').toLowerCase();
      const propAddress = (p.address || '').toLowerCase();
      if (!propAvenue.includes(targetAvenue) && !propAddress.includes(targetAvenue)) {
        return false;
      }
    }

    // Type Filter
    if (filters.type && filters.type !== 'all' && p.type !== filters.type) {
      return false;
    }

    // Status Filter
    if (filters.status && filters.status !== 'all') {
      if (p.status !== filters.status) {
        return false;
      }
    } else {
      // By default on the home screen feed, sold properties automatically disappear so only available properties are shown
      if (p.status === 'sold') {
        return false;
      }
    }

    // Max Price
    if (filters.maxPrice && p.price > filters.maxPrice) {
      return false;
    }

    // Min Bedrooms
    if (filters.minBedrooms && p.bedrooms < filters.minBedrooms) {
      return false;
    }

    // Min Area
    if (filters.minArea && p.area < filters.minArea) {
      return false;
    }

    // Custom Fields Filters
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

  // Sorting Logic
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    if (filters.sortBy === 'price-asc') return a.price - b.price;
    if (filters.sortBy === 'price-desc') return b.price - a.price;
    if (filters.sortBy === 'popular') return b.viewsCount - a.viewsCount;
    if (filters.sortBy === 'area-desc') return b.area - a.area;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // default newest
  });

  const propertyToShare = properties.find((p) => p.id === sharePropertyId) || null;

  // Si l'utilisateur est sur la route ou l'onglet d'administration /admin
  if (currentTab === 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white">
        <AdminPortal onReturnHome={handleGoHome} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden w-full max-w-full">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center fixed top-16 left-0 right-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
      />

      <main className={`flex-1 w-full pt-16 ${currentTab === 'conciergerie' || currentTab === 'visites' ? '' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8'} pb-24 lg:pb-12 space-y-6 sm:space-y-8`}>
        {/* TAB 1: HOME / PROPERTY LISTINGS */}
        {currentTab === 'home' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Interactive Luxury Architectural Showcase Slider (Safricode Kinshasa Style) */}
            <ArchitecturalHeroSlider
              onExploreCommune={(commune) => {
                setFilters((prev) => ({ ...prev, commune, searchQuery: '' }));
              }}
              onNavigateToAgencies={() => setCurrentTab('agents')}
            />

            {/* Bannière Découverte Format TikTok : Visites Vidéo 30s Kinshasa */}
            <div
              onClick={() => {
                setCurrentTab('visites');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-emerald-500/40 p-4 sm:p-6 shadow-xl cursor-pointer group hover:border-emerald-400 transition-all active:scale-[0.99]"
            >
              <div className="absolute top-0 right-0 w-80 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950">
                      Nouveau Format Vidéo
                    </span>
                    <span className="text-xs text-emerald-400 font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Comme sur TikTok
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white group-hover:text-emerald-300 transition-colors">
                    Visites Vidéo 30s de Biens Immobiliers
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
                    Faites défiler les vidéos réelles de biens titrés à Kinshasa (Gombe, Ngaliema, Limete) avec prix en USD et Francs Congolais, commune et bouton WhatsApp direct vers l'agent.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-all cursor-pointer">
                    <PlayCircle className="w-4.5 h-4.5 fill-slate-950 text-emerald-500" />
                    <span>Lancer les Visites Vidéo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Search Widget - Direct et Simple */}
            <SearchWidget />

            {/* Results Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-sm">
              <div className="font-semibold text-slate-700">
                <span className="text-emerald-600 font-black text-base">{sortedProperties.length}</span> propriétés disponibles
              </div>

              <div className="flex items-center gap-3 ms-auto">
                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-slate-500" />
                  <select
                    value={filters.sortBy || 'newest'}
                    onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                    className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-600 text-xs sm:text-sm font-semibold"
                  >
                    <option value="newest">Plus récentes</option>
                    <option value="price-asc">Prix (Croissant)</option>
                    <option value="price-desc">Prix (Décroissant)</option>
                    <option value="popular">Plus vues</option>
                    <option value="area-desc">Surface (Décroissant)</option>
                  </select>
                </div>

                {/* Bouton Conciergerie Immobilière */}
                <button
                  onClick={() => {
                    setCurrentTab('conciergerie');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                  title="Accompagnement Conciergerie Immobilière Kinimmo"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-100" />
                  <span>Conciergerie</span>
                </button>
              </div>
            </div>

            {/* Grille des Propriétés Disponibles */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProperties.map((property) => (
                <PropertyCard key={property.id} property={property} onShare={(id) => setSharePropertyId(id)} />
              ))}
            </div>
          </div>
        )}

        {/* TAB 1B: VISITES VERTICALES REELS TIKTOK */}
        {currentTab === 'visites' && (
          <VisitsReelsView
            onReturnHome={handleGoHome}
            onOpenPropertyModal={(id) => setActivePropertyModalId(id)}
            onOpenShareModal={(id) => setSharePropertyId(id)}
          />
        )}

        {/* TAB 2: INTERACTIVE MAP AJAX */}
        {currentTab === 'map' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-5 shadow-xl text-white">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                  <Compass className="w-4 h-4" />
                  <span>Cartographie Urbaine & Immobilière Intelligente</span>
                </div>
                <h2 className="text-xl font-black text-white">
                  Kinshasa Urban Intelligence & Immobilier
                </h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Explorez les prix & loyers moyens, écoles, hôpitaux, marchés, boulevards majeurs, scores de sécurité, eau, électricité et calculateur de temps de route vers l'Aéroport et le centre-ville.
                </p>
              </div>
              <button
                onClick={handleGoHome}
                className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer border border-slate-700"
                title="Retourner à la page d'accueil"
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Retour Accueil</span>
              </button>
            </div>
            <SearchWidget />
            <PropertyMap properties={sortedProperties} height="h-[740px]" />
          </div>
        )}

        {/* TAB 3: AGENTS DIRECTORY */}
        {currentTab === 'agents' && <AgentDirectory initialTab="agents" onReturnHome={handleGoHome} />}

        {/* TAB 3B: AGENCIES DIRECTORY */}
        {currentTab === 'agencies' && <AgentDirectory initialTab="agencies" onReturnHome={handleGoHome} />}

        {/* TAB 4: WIDGETS & SHORTCODES */}
        {currentTab === 'shortcodes' && <ShortcodesGallery onReturnHome={handleGoHome} />}

        {/* TAB 5: GENERAL DASHBOARD / ADMIN PANEL */}
        {(currentTab === 'dashboard' || currentTab === 'admin') && (
          !user ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <UserIcon className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase">
                  Accès Réservé
                </span>
                <h3 className="text-2xl font-black text-white">Connexion Requise</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Le tableau de bord est accessible uniquement après authentification. Veuillez vous connecter pour accéder à vos annonces et outils.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                >
                  Se Connecter
                </button>
              </div>
            </div>
          ) : (
            <UserDashboard onReturnHome={handleGoHome} />
          )
        )}

        {/* TAB 5B: STANDALONE AGENT DASHBOARD */}
        {currentTab === 'agent-dashboard' && (
          !user ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <Briefcase className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase">
                  Accès Professionnel
                </span>
                <h3 className="text-2xl font-black text-white">Connexion Agent Requise</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Veuillez vous connecter à votre compte professionnel pour accéder à vos annonces, vidéos et prospects.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                >
                  Se Connecter
                </button>
              </div>
            </div>
          ) : user.role !== 'agent' ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-amber-500/30 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black uppercase">
                  Accès Réservé aux Agents
                </span>
                <h3 className="text-2xl font-black text-white">Espace Non Autorisé</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {user.role === 'admin'
                    ? "En tant qu'administrateur, votre espace de gestion et de gouvernance se trouve dans votre panneau d'administration."
                    : "Votre compte est un compte Agence Immobilière. Vous ne pouvez pas accéder à l'Espace Agent individuel."}
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {user.role === 'admin' ? (
                  <button
                    onClick={() => setCurrentTab('dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
                  >
                    Aller au Panneau Administrateur
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentTab('agency-dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs shadow-lg transition-all cursor-pointer"
                  >
                    Aller à mon Espace Agence
                  </button>
                )}
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-emerald-500/30 p-5 rounded-3xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-md">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">Tableau de Bord Agent Immobilier</h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                        Espace Indépendant
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Vos mandats personnels, vidéos haute fidélité, prospects directs et calendrier de visites
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleGoHome}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Retourner à l'accueil"
                  >
                    <Home className="w-4 h-4 text-emerald-400" />
                    <span>Accueil</span>
                  </button>
                </div>
              </div>

              <AgentDashboardView
                onOpenSubmitProperty={() => setIsSubmitPropertyOpen(true)}
                onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
              />
            </div>
          )
        )}

        {/* TAB 5C: STANDALONE AGENCY DASHBOARD */}
        {currentTab === 'agency-dashboard' && (
          !user ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-lg">
                <Building2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-black uppercase">
                  Accès Direction
                </span>
                <h3 className="text-2xl font-black text-white">Connexion Agence Requise</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Veuillez vous connecter avec votre compte agence agréée pour gérer vos collaborateurs et mandats.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-black text-xs shadow-lg cursor-pointer"
                >
                  Se Connecter
                </button>
              </div>
            </div>
          ) : user.role !== 'agency' ? (
            <div className="p-8 sm:p-12 bg-slate-900 border border-amber-500/30 rounded-3xl text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-black uppercase">
                  Accès Réservé aux Agences
                </span>
                <h3 className="text-2xl font-black text-white">Espace Non Autorisé</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  {user.role === 'admin'
                    ? "En tant qu'administrateur, votre espace de gestion et de gouvernance se trouve dans votre panneau d'administration."
                    : "Votre compte est un compte Agent Indépendant. Vous ne pouvez pas accéder à l'Espace Agence de direction."}
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                {user.role === 'admin' ? (
                  <button
                    onClick={() => setCurrentTab('dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
                  >
                    Aller au Panneau Administrateur
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentTab('agent-dashboard')}
                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
                  >
                    Aller à mon Espace Agent
                  </button>
                )}
                <button
                  onClick={handleGoHome}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 cursor-pointer"
                >
                  Retour Accueil
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-indigo-500/30 p-5 rounded-3xl shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-md">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">Tableau de Bord Agence Immobilière</h2>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase">
                        Direction & Équipe
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Gestion des collaborateurs, attribution des biens & leads, pipeline des transactions et label Kinimmo Trust
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleGoHome}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Retourner à l'accueil"
                  >
                    <Home className="w-4 h-4 text-emerald-400" />
                    <span>Accueil</span>
                  </button>
                </div>
              </div>

              <AgencyDashboardView
                onOpenSubmitProperty={() => setIsSubmitPropertyOpen(true)}
                onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
              />
            </div>
          )
        )}

        {/* TAB 6: WISHLIST */}
        {currentTab === 'wishlist' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 flex items-center justify-between shadow-sm">
              <span className="font-bold text-slate-900 text-lg">Mes Favoris Enregistrés</span>
              <button
                onClick={handleGoHome}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
                title="Retourner à la page d'accueil"
              >
                <Home className="w-4 h-4 text-emerald-600" />
                <span>Retour Accueil</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {properties
                .filter((p) => sortedProperties.map((sp) => sp.id).includes(p.id))
                .map((p) => (
                  <PropertyCard key={p.id} property={p} onShare={(id) => setSharePropertyId(id)} />
                ))}
            </div>
          </div>
        )}

        {/* TAB 7: TARIFS & ABONNEMENTS */}
        {currentTab === 'pricing' && <MonetizationPricingView />}

        {/* TAB 8: CONCIERGERIE IMMOBILIÈRE */}
        {currentTab === 'conciergerie' && (
          <ConciergeriePage
            onReturnHome={handleGoHome}
            onExploreProperties={() => {
              setCurrentTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Global Floating Interactive Controls & Modals */}
      <FloatingConciergeWidget
        onNavigateToConciergerie={() => {
          setCurrentTab('conciergerie');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Global Modals */}
      <PropertyDetailModal onOpenShareModal={(id) => setSharePropertyId(id)} />
      <PropertyFormModal />
      <FieldsBuilderModal />
      <CompareModal />
      <AuthModal />
      <AgentInviteModal />
      <SecuritySettingsModal />
      <SocialShareModal property={propertyToShare} onClose={() => setSharePropertyId(null)} />

      <Footer />
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
