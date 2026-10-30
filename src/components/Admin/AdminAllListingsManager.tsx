import React, { useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  Star,
  Sparkles,
  Zap,
  Flame,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  DollarSign,
  Filter,
  ArrowUpRight,
  RefreshCw,
  Share2,
  User,
  ShieldCheck,
  Calendar,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Property, PropertyStatus, ListingLifecycleStatus } from '../../types';
import { mysqlApi } from '../../services/mysqlApi';

interface AdminAllListingsManagerProps {
  onOpenSubmitProperty: () => void;
  onOpenEditProperty?: (property) => void;
  onOpenDetailModal?: (propertyId: string) => void;
}

export const AdminAllListingsManager: React.FC<AdminAllListingsManagerProps> = ({
  onOpenSubmitProperty,
  onOpenEditProperty,
  onOpenDetailModal,
}) => {
  const {
    properties,
    updateProperty,
    deleteProperty,
    heroSlides,
    promotePropertyToHero,
    removePropertyFromHero,
    requestConfirm,
    agents,
    agencies,
    invoices,
    updateInvoiceStatus,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [communeFilter, setCommuneFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [boostFilter, setBoostFilter] = useState<'all' | 'boosted' | 'pending_boost' | 'hero' | 'featured' | 'urgent'>('all');

  // Modal de Boostage rapide
  const [boostingProperty, setBoostingProperty] = useState<Property | null>(null);
  const [boostDays, setBoostDays] = useState<number>(7);
  const [boostTier, setBoostTier] = useState<'standard' | 'premium' | 'featured'>('featured');
  const [isUrgentBadge, setIsUrgentBadge] = useState<boolean>(false);

  const handleApprovePendingBoost = async (invoiceId: string) => {
    if (!confirm('Confirmez-vous la vérification manuelle du paiement et l\'activation immédiate du boost pour cette annonce ?')) return;
    try {
      const res = await mysqlApi.approveInvoice(invoiceId);
      if (res.success) {
        updateInvoiceStatus(invoiceId, 'paid');
        alert('Paiement validé avec succès ! Le boost est actif sur l\'annonce.');
      } else {
        alert(res.message || 'Erreur lors de la validation');
      }
    } catch (err: any) {
      alert(err.message || 'Erreur serveur');
    }
  };

  // Filtrage des propriétés de toute la base de données
  const filteredProperties = useMemo(() => {
    return properties.filter((prop) => {
      // 1. Recherche texte
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = prop.title.toLowerCase().includes(q);
        const matchCommune = (prop.commune || '').toLowerCase().includes(q);
        const matchAgent = (prop.assignedAgentName || prop.agencyName || prop.agentId || '').toLowerCase().includes(q);
        const matchId = prop.id.toLowerCase().includes(q);
        if (!matchTitle && !matchCommune && !matchAgent && !matchId) return false;
      }

      // 2. Commune
      if (communeFilter !== 'all' && prop.commune !== communeFilter) return false;

      // 3. Type
      if (typeFilter !== 'all' && prop.type !== typeFilter) return false;

      // 4. Statut
      if (statusFilter !== 'all') {
        if (statusFilter === 'published' && prop.published === false) return false;
        if (statusFilter === 'hidden' && prop.published !== false) return false;
        if (statusFilter === 'for-sale' && prop.status !== 'for-sale') return false;
        if (statusFilter === 'for-rent' && prop.status !== 'for-rent') return false;
        if (statusFilter === 'pending' && prop.status !== 'pending') return false;
        if (statusFilter === 'sold' && prop.status !== 'sold') return false;
      }

      // 5. Filtre de mise en avant / boost
      if (boostFilter === 'hero') {
        const isInHero = heroSlides.some((s) => s.propertyId === prop.id);
        if (!isInHero) return false;
      } else if (boostFilter === 'featured') {
        if (!prop.featured) return false;
      } else if (boostFilter === 'urgent') {
        if (!prop.isUrgent) return false;
      } else if (boostFilter === 'boosted') {
        const hasActiveBoost = prop.boostExpiresAt && new Date(prop.boostExpiresAt) > new Date();
        if (!hasActiveBoost && !prop.isPremium && !prop.featured) return false;
      } else if (boostFilter === 'pending_boost') {
        const hasPending = invoices.some(
          (inv) => ((inv as any).property_id === prop.id || inv.propertyId === prop.id || inv.targetId === prop.id) && inv.status === 'pending'
        );
        if (!hasPending) return false;
      }

      return true;
    });
  }, [properties, searchQuery, communeFilter, typeFilter, statusFilter, boostFilter, heroSlides, invoices]);

  // Statistiques de la base de données
  const stats = useMemo(() => {
    const total = properties.length;
    const published = properties.filter((p) => p.published !== false).length;
    const hidden = total - published;
    const inHero = heroSlides.length;
    const featured = properties.filter((p) => p.featured).length;
    const activeBoosted = properties.filter(
      (p) => p.boostExpiresAt && new Date(p.boostExpiresAt) > new Date()
    ).length;
    const pendingBoostCount = properties.filter((p) =>
      invoices.some(
        (inv) => ((inv as any).property_id === p.id || inv.propertyId === p.id || inv.targetId === p.id) && inv.status === 'pending'
      )
    ).length;

    return { total, published, hidden, inHero, featured, activeBoosted, pendingBoostCount };
  }, [properties, heroSlides, invoices]);

  // Action : Basculer publication (En ligne / Masqué)
  const handleTogglePublish = (prop: Property) => {
    const nextPublished = prop.published === false ? true : false;
    updateProperty({
      ...prop,
      published: nextPublished,
      updatedAt: new Date().toISOString(),
    });
  };

  // Action : Basculer "En Vedette" (Featured)
  const handleToggleFeatured = (prop: Property) => {
    const nextFeatured = !prop.featured;
    updateProperty({
      ...prop,
      featured: nextFeatured,
      listingTier: nextFeatured ? 'featured' : 'standard',
      updatedAt: new Date().toISOString(),
    });
  };

  // Action : Projeter dans la Vitrine Hero
  const handleToggleHero = (prop: Property) => {
    const isInHero = heroSlides.some((s) => s.propertyId === prop.id);
    if (isInHero) {
      removePropertyFromHero(prop.id);
    } else {
      promotePropertyToHero(prop.id);
    }
  };

  // Action : Appliquer un Boostage
  const handleApplyBoost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boostingProperty) return;

    const expiresAt = new Date(Date.now() + boostDays * 24 * 60 * 60 * 1000).toISOString();
    updateProperty({
      ...boostingProperty,
      boostExpiresAt: expiresAt,
      listingTier: boostTier,
      isPremium: boostTier === 'premium' || boostTier === 'featured',
      featured: boostTier === 'featured' || boostingProperty.featured,
      isUrgent: isUrgentBadge,
      refreshBumpAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setBoostingProperty(null);
  };

  // Action : Changer de statut (Disponible, Loué, Vendu, etc.)
  const handleChangeStatus = (prop: Property, newStatus: PropertyStatus) => {
    updateProperty({
      ...prop,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Statistiques Base de Données */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
              <Building2 className="w-4 h-4" />
              <span>Contrôle & Modération de la Base de Données</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Toutes les Annonces Immobilières ({properties.length} Biens en Base)
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Consultez l'ensemble des annonces publiées par les agents, agences et propriétaires. Validez la mise en ligne, activez les boostages de visibilité, et projetez les biens dans la Vitrine Hero d'accueil.
            </p>
          </div>

          <button
            onClick={onOpenSubmitProperty}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Publier une Annonce</span>
          </button>
        </div>

        {/* Cartes KPI Base de Données */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 pt-2">
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total Biens BDD</span>
            <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
            <span className="text-[10px] text-slate-500">Toutes communes</span>
          </div>

          <div
            onClick={() => setStatusFilter('published')}
            className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">🟢 En Ligne</span>
            <div className="text-2xl font-black text-white mt-1">{stats.published}</div>
            <span className="text-[10px] text-emerald-400/80 font-semibold">Validées & visibles</span>
          </div>

          <div
            onClick={() => setStatusFilter('hidden')}
            className="p-4 rounded-2xl bg-slate-950/70 border border-rose-500/30 hover:border-rose-500/60 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">🔴 Masquées</span>
            <div className="text-2xl font-black text-white mt-1">{stats.hidden}</div>
            <span className="text-[10px] text-rose-400/80 font-semibold">Hors ligne / En attente</span>
          </div>

          <div
            onClick={() => setBoostFilter('pending_boost')}
            className={`p-4 rounded-2xl bg-slate-950/70 border transition-all cursor-pointer ${
              stats.pendingBoostCount > 0
                ? 'border-amber-500/50 shadow-md shadow-amber-500/10 hover:border-amber-400'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-amber-300 tracking-wider">⏳ Boost en Attente</span>
              {stats.pendingBoostCount > 0 && <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
            </div>
            <div className={`text-2xl font-black mt-1 ${stats.pendingBoostCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
              {stats.pendingBoostCount}
            </div>
            <span className="text-[10px] text-amber-400/80 font-semibold">Action validation requise</span>
          </div>

          <div
            onClick={() => setBoostFilter('hero')}
            className="p-4 rounded-2xl bg-slate-950/70 border border-indigo-500/30 hover:border-indigo-500/60 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase text-indigo-300 tracking-wider">✨ Vitrine Hero</span>
            <div className="text-2xl font-black text-white mt-1">{stats.inHero}</div>
            <span className="text-[10px] text-indigo-400 font-semibold">Carrousel d'accueil</span>
          </div>

          <div
            onClick={() => setBoostFilter('featured')}
            className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30 hover:border-amber-500/60 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase text-amber-300 tracking-wider">⭐ En Vedette</span>
            <div className="text-2xl font-black text-white mt-1">{stats.featured}</div>
            <span className="text-[10px] text-amber-400 font-semibold">Mises en avant</span>
          </div>

          <div
            onClick={() => setBoostFilter('boosted')}
            className="p-4 rounded-2xl bg-slate-950/70 border border-cyan-500/30 hover:border-cyan-500/60 transition-all cursor-pointer"
          >
            <span className="text-[10px] font-bold uppercase text-cyan-300 tracking-wider">🚀 Boost Actif</span>
            <div className="text-2xl font-black text-white mt-1">{stats.activeBoosted}</div>
            <span className="text-[10px] text-cyan-400 font-semibold">Tête de liste payante</span>
          </div>
        </div>
      </div>

      {/* Barre de Filtres & Recherche Complète */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, ID, commune, agent, agence..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Commune */}
          <select
            value={communeFilter}
            onChange={(e) => setCommuneFilter(e.target.value)}
            aria-label="Filtrer par commune"
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Toutes Communes</option>
            <option value="Gombe">Gombe</option>
            <option value="Ngaliema">Ngaliema</option>
            <option value="Limete">Limete</option>
            <option value="Mont-Ngafula">Mont-Ngafula</option>
            <option value="Bandalungwa">Bandalungwa</option>
            <option value="Kalamu">Kalamu</option>
            <option value="Barumbu">Barumbu</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filtrer par type de bien"
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tous Types</option>
            <option value="apartment">Appartement</option>
            <option value="house">Maison</option>
            <option value="villa">Villa</option>
            <option value="land">Terrain</option>
            <option value="office">Bureau</option>
            <option value="commercial">Commercial</option>
          </select>

          {/* Statut publication */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrer par statut"
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Tous Statuts</option>
            <option value="published">🟢 En Ligne (Validé)</option>
            <option value="hidden">🔴 Masqué</option>
            <option value="for-sale">À Vendre</option>
            <option value="for-rent">À Louer</option>
            <option value="pending">En Négociation</option>
            <option value="sold">Vendu / Clôturé</option>
          </select>

          {/* Boost & Mises en avant */}
          <select
            value={boostFilter}
            onChange={(e) => setBoostFilter(e.target.value as any)}
            aria-label="Filtrer par niveau de boost"
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Toutes les Annonces</option>
            <option value="pending_boost">⏳ En Attente Validation Boost ({stats.pendingBoostCount})</option>
            <option value="hero">✨ En Vitrine Hero</option>
            <option value="featured">⭐ En Vedette</option>
            <option value="boosted">🚀 Avec Boost Actif</option>
            <option value="urgent">🔥 Badge Urgent</option>
          </select>

          {(searchQuery || communeFilter !== 'all' || typeFilter !== 'all' || statusFilter !== 'all' || boostFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCommuneFilter('all');
                setTypeFilter('all');
                setStatusFilter('all');
                setBoostFilter('all');
              }}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-all"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Tableau des Annonces de la Base de Données */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-4 px-6">Bien Immobilier</th>
                <th className="py-4 px-4">Commune</th>
                <th className="py-4 px-4">Prix</th>
                <th className="py-4 px-4">Courtier / Agence</th>
                <th className="py-4 px-4">Validation BDD</th>
                <th className="py-4 px-4">Mises en Avant</th>
                <th className="py-4 px-4">Boostages</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Aucun bien ne correspond aux filtres appliqués.
                  </td>
                </tr>
              ) : (
                filteredProperties.map((prop) => {
                  const isInHero = heroSlides.some((s) => s.propertyId === prop.id);
                  const isBoostActive = prop.boostExpiresAt && new Date(prop.boostExpiresAt) > new Date();

                  return (
                    <tr key={prop.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* 1. Bien Immobilier */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              prop.images?.[0] ||
                              'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=150&q=80'
                            }
                            alt={prop.title}
                            className="w-12 h-10 rounded-xl object-cover border border-slate-800 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => onOpenDetailModal && onOpenDetailModal(prop.id)}
                          />
                          <div className="min-w-0">
                            <div
                              onClick={() => onOpenDetailModal && onOpenDetailModal(prop.id)}
                              className="font-bold text-white line-clamp-1 cursor-pointer hover:text-emerald-400 transition-colors"
                            >
                              {prop.title}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>ID: {prop.id}</span>
                              <span className="capitalize text-slate-500">• {prop.type}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Commune */}
                      <td className="py-3.5 px-4 font-semibold text-slate-300">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{prop.commune || 'Kinshasa'}</span>
                        </span>
                      </td>

                      {/* 3. Prix */}
                      <td className="py-3.5 px-4 font-black text-emerald-400 whitespace-nowrap">
                        ${prop.price?.toLocaleString()}
                        {prop.period && <span className="text-[10px] text-slate-400 font-normal"> /{prop.period === 'month' ? 'mois' : prop.period}</span>}
                      </td>

                      {/* 4. Courtier / Agence */}
                      <td className="py-3.5 px-4 text-slate-300">
                        <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                          {prop.assignedAgentName || prop.agencyName || 'Courtier Partenaire'}
                        </div>
                        {prop.agencyName && (
                          <div className="text-[10px] text-indigo-400 truncate max-w-[140px]">{prop.agencyName}</div>
                        )}
                      </td>

                      {/* 5. Validation BDD */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            onClick={() => handleTogglePublish(prop)}
                            title={prop.published !== false ? 'Cliquer pour masquer' : 'Cliquer pour valider et publier'}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                              prop.published !== false
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                            }`}
                          >
                            {prop.published !== false ? '🟢 En Ligne' : '🔴 Masqué'}
                          </button>

                          <select
                            value={prop.status || 'for-sale'}
                            onChange={(e) => handleChangeStatus(prop, e.target.value as any)}
                            aria-label="Statut transactionnel"
                            className="text-[10px] bg-slate-950 border border-slate-800 rounded-md px-1.5 py-0.5 text-slate-300 focus:outline-none"
                          >
                            <option value="for-sale">À Vendre</option>
                            <option value="for-rent">À Louer</option>
                            <option value="pending">En Négociation</option>
                            <option value="sold">Vendu</option>
                          </select>
                        </div>
                      </td>

                      {/* 6. Mises en Avant */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {/* Featured Star */}
                          <button
                            onClick={() => handleToggleFeatured(prop)}
                            title={prop.featured ? 'Retirer des biens en vedette' : 'Mettre en vedette ⭐'}
                            className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                              prop.featured
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <Star className={`w-3.5 h-3.5 ${prop.featured ? 'fill-amber-400 text-amber-400' : ''}`} />
                          </button>

                          {/* Vitrine Hero Toggle */}
                          <button
                            onClick={() => handleToggleHero(prop)}
                            title={isInHero ? 'Retirer de la Vitrine Hero d\'accueil' : 'Projeter dans la Vitrine Hero d\'accueil'}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                              isInHero
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                          >
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            <span>{isInHero ? 'Vitrine' : '+ Vitrine'}</span>
                          </button>
                        </div>
                      </td>

                      {/* 7. Boostages */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          const pendingBoostInv = invoices.find(
                            (inv) => ((inv as any).property_id === prop.id || inv.propertyId === prop.id || inv.targetId === prop.id) && inv.status === 'pending'
                          );

                          if (pendingBoostInv) {
                            return (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black flex items-center gap-1 animate-pulse">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>Paiement en attente ({pendingBoostInv.totalAmount || pendingBoostInv.amount || 10}$)</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleApprovePendingBoost(pendingBoostInv.id)}
                                  className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] flex items-center gap-1 shadow transition-all cursor-pointer"
                                  title="Valider manuellement la réception du paiement Mobile Money et activer le boost"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Valider Paiement</span>
                                </button>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => {
                                  setBoostingProperty(prop);
                                  setBoostDays(7);
                                  setBoostTier('featured');
                                  setIsUrgentBadge(Boolean(prop.isUrgent));
                                }}
                                title="Ouvrir la console de boostage"
                                className={`px-2 py-1 rounded-lg border text-[10px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer ${
                                  isBoostActive
                                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-cyan-300'
                                }`}
                              >
                                <Zap className="w-3 h-3 text-cyan-400" />
                                <span>{isBoostActive ? 'Boosté' : 'Booster'}</span>
                              </button>

                              {prop.isUrgent && (
                                <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px] font-bold">
                                  Urgent
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3.5 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {onOpenDetailModal && (
                            <button
                              onClick={() => onOpenDetailModal(prop.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                              title="Voir l'annonce complète"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {onOpenEditProperty && (
                            <button
                              onClick={() => onOpenEditProperty(prop)}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Modifier cette annonce"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              requestConfirm({
                                title: `Supprimer l'annonce "${prop.title}" ?`,
                                message: `Cette annonce sera définitivement supprimée de la base de données de Kinshasa Immobilier.`,
                                confirmText: 'Supprimer',
                                cancelText: 'Annuler',
                                onConfirm: () => deleteProperty(prop.id),
                              });
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Supprimer cette annonce"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Boostage Rapide */}
      {boostingProperty && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black text-white">Booster la Visibilité du Bien</h3>
              </div>
              <button
                onClick={() => setBoostingProperty(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
              <div className="font-bold text-white line-clamp-1">{boostingProperty.title}</div>
              <div className="text-slate-400 mt-0.5">
                {boostingProperty.commune} • ${boostingProperty.price?.toLocaleString()}
              </div>
            </div>

            <form onSubmit={handleApplyBoost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Durée du Boost</label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setBoostDays(d)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        boostDays === d
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-black'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d} Jours
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Niveau de Priorité</label>
                <select
                  value={boostTier}
                  onChange={(e) => setBoostTier(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="standard">Standard (Priorité normale)</option>
                  <option value="premium">Premium (En haut des résultats de recherche)</option>
                  <option value="featured">Featured / Vedette (Tête de liste absolue)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="urgentCheck"
                  checked={isUrgentBadge}
                  onChange={(e) => setIsUrgentBadge(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-500 focus:ring-0 bg-slate-950 border-slate-800"
                />
                <label htmlFor="urgentCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Ajouter le badge "🔥 Urgent" sur l'annonce
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setBoostingProperty(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  Appliquer le Boost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
