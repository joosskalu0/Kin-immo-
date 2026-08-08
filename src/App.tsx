import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
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
import { SecuritySettingsModal } from './components/SecuritySettingsModal';
import { SocialShareModal } from './components/SocialShareModal';
import {
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
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { properties, filters, setFilters, setIsFieldsBuilderOpen } = useApp();

  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'map' | 'agents' | 'shortcodes' | 'dashboard' | 'wishlist'
  const [viewLayout, setViewLayout] = useState<'grid' | 'split'>('grid');
  const [sharePropertyId, setSharePropertyId] = useState<string | null>(null);

  // Filter Properties Logic
  const filteredProperties = properties.filter((p) => {
    // Search Query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCity = p.city.toLowerCase().includes(q);
      const matchAddress = p.address.toLowerCase().includes(q);
      if (!matchTitle && !matchCity && !matchAddress) return false;
    }

    // Type Filter
    if (filters.type && filters.type !== 'all' && p.type !== filters.type) {
      return false;
    }

    // Status Filter
    if (filters.status && filters.status !== 'all' && p.status !== filters.status) {
      return false;
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Header currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 pb-20 lg:pb-8 space-y-6 sm:space-y-8">
        {/* TAB 1: HOME / PROPERTY LISTINGS */}
        {currentTab === 'home' && (
          <div className="space-y-6 sm:space-y-8">
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 p-5 sm:p-12 shadow-2xl">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />

              <div className="max-w-2xl space-y-4 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> KIN IMMOBILIER • Plateforme Officielle RDC
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                  Trouvez Votre Bien d'Exception à Kinshasa
                </h1>

                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Immobilier de luxe et opportunités uniques à Kinshasa (Gombe, Ngaliema, Macampagne, Limete, Kintambo). Filtrez par Titre Foncier, autonomie Solaire/Groupe, Forage d'eau et Sécurité avec carte interactive AJAX.
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => setIsFieldsBuilderOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    Open Fields Builder
                  </button>

                  <button
                    onClick={() => setCurrentTab('map')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Map View (AJAX)
                  </button>
                </div>
              </div>
            </div>

            {/* Search Widget */}
            <SearchWidget />

            {/* Explore Popular Kinshasa Communes Section */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Communes & Quartiers Prisés à Kinshasa
                  </h2>
                  <p className="text-xs text-slate-400">
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
                    className="group relative h-40 rounded-2xl overflow-hidden cursor-pointer border border-slate-800 hover:border-emerald-500/50 transition-all shadow-lg"
                  >
                    <img
                      src={loc.image}
                      alt={loc.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {loc.name}
                      </h3>
                      <p className="text-[10px] text-slate-300 font-medium">
                        {loc.desc}
                      </p>
                      <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                        {loc.count} propriétés
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Results Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 text-xs">
              <div className="font-semibold text-slate-300">
                <span className="text-emerald-400 font-bold text-sm">{sortedProperties.length}</span> propriétés disponibles
              </div>

              <div className="flex items-center gap-3 ms-auto">
                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={filters.sortBy || 'newest'}
                    onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                    className="bg-slate-950 border border-slate-800 text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="newest">Plus récentes</option>
                    <option value="price-asc">Prix (Croissant)</option>
                    <option value="price-desc">Prix (Décroissant)</option>
                    <option value="popular">Plus vues</option>
                    <option value="area-desc">Surface (Décroissant)</option>
                  </select>
                </div>

                {/* View Layout Switcher */}
                <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
                  <button
                    onClick={() => setViewLayout('grid')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewLayout === 'grid' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                    }`}
                    title="Vue Grille"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewLayout('split')}
                    className={`p-1.5 rounded-lg transition-colors ${
                      viewLayout === 'split' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
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
                {sortedProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-5 h-[650px] sticky top-24">
                  <PropertyMap properties={sortedProperties} height="h-full" />
                </div>
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sortedProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              </div>
            )}

            {/* Meet Our Top-rated Kinshasa Agents Section */}
            <div className="pt-10 space-y-6 border-t border-slate-800">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  Nos Experts Immobiliers à Kinshasa
                </h2>
                <p className="text-xs text-slate-400">
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
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-3 hover:border-emerald-500/50 transition-all group"
                  >
                    <div className="relative w-20 h-20 mx-auto rounded-full overflow-hidden ring-2 ring-emerald-500/40 group-hover:ring-emerald-400 group-hover:scale-105 transition-all">
                      <img
                        src={agentItem.avatar}
                        alt={agentItem.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {agentItem.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">{agentItem.role}</p>
                      <p className="text-[10px] text-emerald-400 font-medium">{agentItem.agency}</p>
                    </div>

                    <div className="flex items-center justify-center gap-1 text-xs text-amber-400">
                      <span>★ {agentItem.rating}</span>
                      <span className="text-[10px] text-slate-500">({agentItem.reviews} avis)</span>
                    </div>

                    <button
                      onClick={() => setCurrentTab('agents')}
                      className="text-[11px] font-semibold text-emerald-400 hover:underline pt-1 block mx-auto"
                    >
                      Contacter l'agent →
                    </button>
                  </div>
                ))}
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => setCurrentTab('agents')}
                  className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-800 hover:border-slate-700 transition-all inline-flex items-center gap-2"
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
            <SearchWidget />
            <PropertyMap properties={sortedProperties} height="h-[700px]" />
          </div>
        )}

        {/* TAB 3: AGENTS DIRECTORY */}
        {currentTab === 'agents' && <AgentDirectory />}

        {/* TAB 4: WIDGETS & SHORTCODES */}
        {currentTab === 'shortcodes' && <ShortcodesGallery />}

        {/* TAB 5: DASHBOARD */}
        {currentTab === 'dashboard' && <UserDashboard />}

        {/* TAB 6: WISHLIST */}
        {currentTab === 'wishlist' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 font-bold text-white text-lg">
              Mes Favoris Enregistrés
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {properties
                .filter((p) => sortedProperties.map((sp) => sp.id).includes(p.id))
                .map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Global Modals */}
      <PropertyDetailModal onOpenShareModal={(id) => setSharePropertyId(id)} />
      <PropertyFormModal />
      <FieldsBuilderModal />
      <CompareModal />
      <AuthModal />
      <SecuritySettingsModal />
      <SocialShareModal property={propertyToShare} onClose={() => setSharePropertyId(null)} />

      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
