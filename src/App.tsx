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
import { QuickInteractiveFilters } from './components/QuickInteractiveFilters';
import { CompareDock } from './components/CompareDock';
import { AdminPortal } from './components/Admin/AdminPortal';
import { MonetizationPricingView } from './components/Monetization/MonetizationPricingView';
import { AdvertisementBanner } from './components/Monetization/AdvertisementBanner';
import { ArchitecturalHeroSlider } from './components/ArchitecturalHeroSlider';
import { FloatingConciergeWidget } from './components/FloatingConciergeWidget';
import { ConciergeriePage } from './components/Conciergerie/ConciergeriePage';
import { ConciergeriePreviewSection } from './components/Conciergerie/ConciergeriePreviewSection';
import {
  Home,
  Building2,
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
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { properties, filters, setFilters, setIsFieldsBuilderOpen, setActivePropertyModalId } = useApp();

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
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && ['home', 'map', 'agents', 'agencies', 'shortcodes', 'dashboard', 'wishlist', 'admin', 'pricing', 'conciergerie'].includes(tab)) {
          return tab;
        }
      } catch {}
    }
    return 'home';
  }); // 'home' | 'map' | 'agents' | 'agencies' | 'shortcodes' | 'dashboard' | 'wishlist' | 'admin' | 'pricing' | 'conciergerie'
  const [viewLayout, setViewLayout] = useState<'grid' | 'split'>('grid');
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
      const targetPath = (url.pathname === '/admin' || url.pathname === '/conciergerie') ? '/' : url.pathname;
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
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab && ['home', 'map', 'agents', 'agencies', 'shortcodes', 'dashboard', 'wishlist', 'admin', 'pricing', 'conciergerie'].includes(tab)) {
          setCurrentTab(tab);
          return;
        }
        setCurrentTab('home');
      } catch {}
    };

    window.addEventListener('popstate', handleTabPopState);
    return () => window.removeEventListener('popstate', handleTabPopState);
  }, []);

  useEffect(() => {
    const tabTitles: Record<string, string> = {
      home: 'Accueil - Annonces Immobilières Kinshasa',
      map: 'Carte Interactive des Biens - Kinshasa',
      agents: 'Annuaire des Agents & Agences Immobilières',
      agencies: 'Agences Immobilières Agréées - Kinshasa',
      shortcodes: 'Galerie des Shortcodes & Widgets',
      dashboard: 'Tableau de Bord & Gestion Immobilière',
      wishlist: 'Mes Favoris Sauvegardés',
      pricing: 'Tarifs & Abonnements - Kinimmo',
      conciergerie: 'Conciergerie Immobilière - Votre recherche, notre accompagnement | Kinimmo',
      admin: 'Panneau d’Administration Sécurisé - Kinimmo',
    };
    trackPageView(tabTitles[currentTab] || `Kinshasa Immo - ${currentTab}`, `/${currentTab}`);
    
    // Mettre à jour l'historique d'URL pour /conciergerie et /admin
    if (typeof window !== 'undefined') {
      try {
        if (currentTab === 'admin') {
          if (!window.location.pathname.startsWith('/admin')) {
            window.history.pushState({}, '', '/admin');
          }
        } else if (currentTab === 'conciergerie' && window.location.pathname !== '/conciergerie') {
          window.history.pushState({}, '', '/conciergerie');
        } else if (currentTab !== 'admin' && currentTab !== 'conciergerie' && (window.location.pathname.startsWith('/admin') || window.location.pathname === '/conciergerie')) {
          window.history.pushState({}, '', '/');
        }
      } catch {}
    }
  }, [currentTab]);

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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
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

      <main className={`flex-1 w-full ${currentTab === 'conciergerie' ? '' : 'max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8'} pb-20 lg:pb-8 space-y-6 sm:space-y-8`}>
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

            {/* Aperçu Officiel du Service Conciergerie Immobilière Kinimmo (Accompagnement) */}
            <ConciergeriePreviewSection
              onNavigateToConciergerie={(params) => {
                if (params) {
                  try {
                    const url = new URL(window.location.href);
                    url.pathname = '/conciergerie';
                    if (params.projet) url.searchParams.set('projet', params.projet);
                    if (params.typeBien) url.searchParams.set('type', params.typeBien);
                    if (params.commune) url.searchParams.set('commune', params.commune);
                    window.history.pushState({}, '', url.pathname + url.search);
                  } catch {}
                }
                setCurrentTab('conciergerie');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />

            {/* Search Widget - Direct et Simple */}
            <SearchWidget />

            {/* Quick 1-Click Interactive Badges & Filters */}
            <QuickInteractiveFilters />

            {/* Espace Publicitaire & Sponsors Kinshasa */}
            <AdvertisementBanner placement="home_hero" className="shadow-xs" />

            {/* Explore Popular Kinshasa Communes Section */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                    Communes & Quartiers Prisés à Kinshasa
                  </h2>
                  <p className="text-xs text-slate-500">
                    Découvrez les meilleures offres dans les zones les plus recherchées
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    name: 'Gombe',
                    count: 18,
                    desc: 'Centre d\'Affaires & Ambassades',
                    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Ngaliema',
                    count: 14,
                    desc: 'Macampagne & Binza Pigeon',
                    image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Limete',
                    count: 9,
                    desc: 'Quartier Résidentiel & Industriel',
                    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Kintambo',
                    count: 11,
                    desc: 'Magasin & Bords du Fleuve',
                    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80',
                  },
                ].map((loc) => (
                  <div
                    key={loc.name}
                    onClick={() => setFilters((prev) => ({ ...prev, searchQuery: loc.name }))}
                    className="group relative h-40 rounded-2xl overflow-hidden cursor-pointer border border-slate-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
                  >
                    <img
                      src={loc.image}
                      alt={loc.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {loc.name}
                      </h3>
                      <p className="text-[10px] text-slate-200 font-medium">
                        {loc.desc}
                      </p>
                      <span className="text-[10px] text-emerald-300 font-bold block mt-0.5">
                        {loc.count} propriétés
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
              <div className="font-semibold text-slate-700">
                <span className="text-emerald-600 font-bold text-sm">{sortedProperties.length}</span> propriétés disponibles
              </div>

              <div className="flex items-center gap-3 ms-auto">
                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={filters.sortBy || 'newest'}
                    onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                    className="bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-600 text-xs font-medium"
                  >
                    <option value="newest">Plus récentes</option>
                    <option value="price-asc">Prix (Croissant)</option>
                    <option value="price-desc">Prix (Décroissant)</option>
                    <option value="popular">Plus vues</option>
                    <option value="area-desc">Surface (Décroissant)</option>
                  </select>
                </div>

                {/* View Layout Switcher */}
                <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
                  <button
                    onClick={() => setViewLayout('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewLayout === 'grid' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Vue Grille"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewLayout('split')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewLayout === 'split' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Vue Mixte (Carte + Liste)"
                  >
                    <MapIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* View Layout Render */}
            {viewLayout === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedProperties.map((property, idx) => (
                  <React.Fragment key={property.id}>
                    <PropertyCard property={property} onShare={(id) => setSharePropertyId(id)} />
                    {/* Espace Publicitaire In-Feed Kinshasa */}
                    {idx === 2 && (
                      <div className="col-span-1 md:col-span-2 lg:col-span-3 my-2">
                        <AdvertisementBanner placement="search_top" className="shadow-xs" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 h-[650px] sticky top-24">
                  <PropertyMap properties={sortedProperties} height="h-full" />
                </div>
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedProperties.map((property, idx) => (
                    <React.Fragment key={property.id}>
                      <PropertyCard property={property} onShare={(id) => setSharePropertyId(id)} />
                      {idx === 1 && (
                        <div className="col-span-1 sm:col-span-2 my-2">
                          <AdvertisementBanner placement="search_top" className="shadow-xs" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Meet Our Top-rated Kinshasa Agents Section */}
            <div className="pt-10 space-y-6 border-t border-slate-200">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Nos Experts Immobiliers à Kinshasa
                </h2>
                <p className="text-xs text-slate-500">
                  Travaillez avec des courtiers certifiés (+243) connaissant le marché foncier de Kinshasa
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    name: 'Jean-Luc Mpoy',
                    role: 'Spécialiste Luxe Gombe & Macampagne',
                    agency: 'Kinshasa Prestige Real Estate',
                    rating: 5.0,
                    reviews: 42,
                    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Grace Kabamba',
                    role: 'Consultante Baux Diplomatiques',
                    agency: 'Kinshasa Prestige Real Estate',
                    rating: 4.9,
                    reviews: 29,
                    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Patrick Tshimanga',
                    role: 'Expert Titres Fonciers & Terrains',
                    agency: 'Congo Real Assets',
                    rating: 4.8,
                    reviews: 21,
                    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
                  },
                  {
                    name: 'Chantal Luvumbu',
                    role: 'Conseillère Résidentiel Limete & Ngaliema',
                    agency: 'Fleuve Congo Housing',
                    rating: 5.0,
                    reviews: 18,
                    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80',
                  },
                ].map((agentItem, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-3 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md group"
                  >
                    <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden ring-2 ring-emerald-500/30 group-hover:ring-emerald-500 group-hover:scale-105 transition-all">
                      <img
                        src={agentItem.avatar}
                        alt={agentItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {agentItem.name}
                      </h3>
                      <p className="text-[11px] text-slate-500">{agentItem.role}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold">{agentItem.agency}</p>
                    </div>

                    <div className="flex items-center justify-center gap-1 text-xs text-amber-500 font-bold">
                      <span>★ {agentItem.rating}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({agentItem.reviews} avis)</span>
                    </div>

                    <button
                      onClick={() => setCurrentTab('agents')}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline pt-1 block mx-auto"
                    >
                      Contacter l'agent →
                    </button>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setCurrentTab('agents')}
                  className="px-6 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border border-slate-300 hover:border-slate-400 shadow-sm transition-all inline-flex items-center gap-2"
                >
                  Trouver votre agent à Kinshasa →
                </button>
              </div>
            </div>
          </div>
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

        {/* TAB 5: DASHBOARD */}
        {currentTab === 'dashboard' && <UserDashboard onReturnHome={handleGoHome} />}

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

        {/* TAB 7: TARIFS, MONÉTISATION & PUBLICITÉ */}
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
