import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Property, ListingLifecycleStatus, LeadRequest } from '../../types';
import {
  LISTING_STATUS_CONFIG,
  getListingLifecycleStatus,
  canUserEditProperty,
  canBoostProperty,
} from '../../utils/propertyStatusHelpers';
import { AgentVideoPublishManager } from './AgentVideoPublishManager';
import { VisibilityBoostModal } from '../Monetization/VisibilityBoostModal';
import { TrustBadge } from '../Trust/TrustBadge';
import { TrustVerificationModal } from '../Trust/TrustVerificationModal';
import { AgentTrustSpace } from '../Trust/AgentTrustSpace';
import {
  Building2,
  Plus,
  Edit,
  Eye,
  Trash2,
  Camera,
  Film,
  Users,
  Calendar,
  BarChart3,
  Sparkles,
  CreditCard,
  User as UserIcon,
  Bell,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Check,
  X,
  Clock,
  MapPin,
  Search,
  Filter,
  Ban,
  Crown,
  Zap,
  Send,
  HelpCircle,
  Lock,
  ExternalLink,
  MessageCircle,
  FileText,
  BadgeCheck,
  TrendingUp,
  Receipt,
  Layers
} from 'lucide-react';

export type AgentSectionId =
  | 'overview'
  | 'my_properties'
  | 'kinimmo_trust'
  | 'media_manager'
  | 'leads'
  | 'visits_calendar'
  | 'analytics'
  | 'boosts'
  | 'billing_subscription'
  | 'profile_whatsapp'
  | 'notifications_settings';

interface AgentDashboardViewProps {
  onOpenSubmitProperty?: () => void;
  onOpenSecurityModal?: () => void;
}

export const AgentDashboardView: React.FC<AgentDashboardViewProps> = ({
  onOpenSubmitProperty,
  onOpenSecurityModal
}) => {
  const {
    user,
    setUser,
    properties,
    updatePropertyListingStatus,
    setEditingProperty,
    setIsSubmitPropertyOpen,
    setActivePropertyModalId,
    leads,
    updateLeadStatus,
    deleteLead,
    invoices,
    agents,
    subscriptionPlans,
    cdfExchangeRate,
    propertyVideos,
    contactSettings
  } = useApp();

  const [activeSection, setActiveSection] = useState<AgentSectionId>('overview');
  const [propertyFilter, setPropertyFilter] = useState<'ALL' | ListingLifecycleStatus>('ALL');
  const [propertySearch, setPropertySearch] = useState('');

  // Status Change Modal State
  const [statusModalProperty, setStatusModalProperty] = useState<Property | null>(null);
  const [targetStatus, setTargetStatus] = useState<ListingLifecycleStatus>('SOLD');
  const [statusChangeNote, setStatusChangeNote] = useState('');
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);
  const [statusHistoryViewProperty, setStatusHistoryViewProperty] = useState<Property | null>(null);

  // Boost Modal State
  const [boostModalProperty, setBoostModalProperty] = useState<Property | null>(null);

  // Kinimmo Trust Application Modal
  const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '+243 ');
  const [profileWhatsapp, setProfileWhatsapp] = useState(user?.whatsapp || user?.phone || '+243 ');
  const [profileBio, setProfileBio] = useState('Agent immobilier agréé et conseiller en investissement à Kinshasa.');
  const [profileSpecialties, setProfileSpecialties] = useState('Villas Gombe, Appartements Ngaliema, Terrains titrés');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);

  // Lead quick note / contact state
  const [selectedLead, setSelectedLead] = useState<LeadRequest | null>(null);
  const [leadFollowupNote, setLeadFollowupNote] = useState('');

  // Properties belonging to this agent (or assigned to them, or admin)
  const myProperties = properties.filter((p) => {
    if (user?.role === 'admin') return true;
    const uid = user?.id;
    const uemail = user?.email?.toLowerCase();
    const uagentId = user?.agentId;
    return (
      p.agentId === uid ||
      p.agentId === uagentId ||
      p.userId === uid ||
      p.assignedAgentId === uid ||
      p.assignedAgentId === uagentId ||
      (uemail && p.contactEmail?.toLowerCase() === uemail) ||
      (uemail && p.agentId?.toLowerCase() === uemail)
    );
  });

  // Filtered properties
  const filteredProperties = myProperties.filter((p) => {
    const lifecycle = getListingLifecycleStatus(p);
    if (propertyFilter !== 'ALL' && lifecycle !== propertyFilter) return false;
    if (propertySearch.trim()) {
      const q = propertySearch.toLowerCase().trim();
      return (
        p.title.toLowerCase().includes(q) ||
        (p.commune && p.commune.toLowerCase().includes(q)) ||
        (p.quartier && p.quartier.toLowerCase().includes(q)) ||
        p.price.toString().includes(q)
      );
    }
    return true;
  });

  // KPIs
  const totalListings = myProperties.length;
  const publishedListings = myProperties.filter((p) => getListingLifecycleStatus(p) === 'PUBLISHED').length;
  const rentedListings = myProperties.filter((p) => getListingLifecycleStatus(p) === 'RENTED').length;
  const soldListings = myProperties.filter((p) => getListingLifecycleStatus(p) === 'SOLD').length;
  const totalViews = myProperties.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const totalWhatsappClicks = myProperties.reduce((sum, p) => sum + (p.whatsappClicks || 0), 0);

  // Invoices
  const myInvoices = invoices.filter(
    (inv) =>
      inv.targetEmail?.toLowerCase() === user?.email?.toLowerCase() ||
      inv.targetId === user?.id ||
      (inv as any).user_id === user?.id ||
      (inv as any).userId === user?.id
  );

  // Active boosts
  const activeBoostedProps = myProperties.filter(
    (p) => p.featured || p.isPremium || p.isUrgent || p.listingTier === 'featured' || p.listingTier === 'premium'
  );

  // Status Change Handler
  const handleConfirmStatusChange = async () => {
    if (!statusModalProperty) return;
    setIsSubmittingStatus(true);
    try {
      await updatePropertyListingStatus(statusModalProperty.id, targetStatus, statusChangeNote);
      setStatusModalProperty(null);
      setStatusChangeNote('');
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la mise à jour du statut.');
    } finally {
      setIsSubmittingStatus(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updatedUser = {
      ...user,
      name: profileName,
      phone: profilePhone,
      whatsapp: profileWhatsapp,
    };
    setUser(updatedUser);
    setProfileSuccessMsg('Profil professionnel et numéro WhatsApp mis à jour avec succès !');
    setTimeout(() => setProfileSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs pour le tableau de bord Agent */}
      <div className="flex border-b border-slate-800 gap-1.5 overflow-x-auto text-xs font-semibold pb-1">
        {[
          { id: 'overview', label: 'Vue d’ensemble', icon: BarChart3 },
          { id: 'my_properties', label: `Mes Biens (${totalListings})`, icon: Building2 },
          { id: 'kinimmo_trust', label: 'Kinimmo Trust', icon: ShieldCheck },
          { id: 'media_manager', label: 'Photos & Vidéos', icon: Film },
          { id: 'leads', label: `Prospects & CRM (${leads.length})`, icon: Users },
          { id: 'visits_calendar', label: 'Visites & Calendrier', icon: Calendar },
          { id: 'analytics', label: 'Statistiques Annonces', icon: TrendingUp },
          { id: 'boosts', label: `Boosts (${activeBoostedProps.length})`, icon: Sparkles },
          { id: 'billing_subscription', label: 'Abonnement & Factures', icon: CreditCard },
          { id: 'profile_whatsapp', label: 'Profil & WhatsApp Pro', icon: UserIcon },
          { id: 'notifications_settings', label: 'Assistance & Paramètres', icon: Bell }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as AgentSectionId)}
              className={`py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 1. VUE D'ENSEMBLE */}
      {/* ======================================================== */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Grille des KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Biens Actifs (Publiés)</span>
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{publishedListings}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                sur {totalListings} bien{totalListings > 1 ? 's' : ''} au catalogue
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Biens Clôturés</span>
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">
                {soldListings + rentedListings}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {soldListings} vendu{soldListings > 1 ? 's' : ''} • {rentedListings} loué{rentedListings > 1 ? 's' : ''}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Vues Cumulées</span>
                <Eye className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{totalViews.toLocaleString()}</div>
              <span className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" /> Forte visibilité Kinshasa
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">Contacts WhatsApp</span>
                <MessageCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-black text-white">{totalWhatsappClicks}</div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {leads.length} prospect{leads.length > 1 ? 's' : ''} enregistrés
              </span>
            </div>
          </div>

          {/* Alertes d'action & Raccourcis Rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col justify-between space-y-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  Action Rapide
                </span>
                <h4 className="text-base font-bold text-white mt-2">Publier un Nouveau Bien</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Ajoutez une villa, appartement ou concession avec localisation exacte à Kinshasa.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProperty(null);
                  setIsSubmitPropertyOpen(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau bien immobilier</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-sky-950/40 to-slate-900 border border-sky-500/30 flex flex-col justify-between space-y-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-black uppercase tracking-wider">
                  Visites Virtuelles
                </span>
                <h4 className="text-base font-bold text-white mt-2">Vidéos & Reels Immersifs</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Téléversez des vidéos verticales courtes hébergées et optimisées sur Cloudinary.
                </p>
              </div>
              <button
                onClick={() => setActiveSection('media_manager')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Film className="w-4 h-4" />
                <span>Gérer les vidéos Cloudinary</span>
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 flex flex-col justify-between space-y-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                  Visibilité Maximale
                </span>
                <h4 className="text-base font-bold text-white mt-2">Booster vos annonces</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Propulsez vos annonces en tête d'affiche, avec badge Urgent ou statut Premium.
                </p>
              </div>
              <button
                onClick={() => setActiveSection('boosts')}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold text-xs flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Voir les packs de visibilité</span>
              </button>
            </div>
          </div>

          {/* Module Kinimmo Trust : Statut de Confiance Agent */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/30 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Kinimmo Trust Pro
                  </span>
                  <TrustBadge
                    status={user?.trust_status || 'unverified'}
                    level={user?.trust_level}
                    score={user?.trust_score}
                    verifiedAt={user?.trust_verified_at}
                    expiresAt={user?.trust_expires_at}
                    targetType="agent"
                    targetTitle={user?.name}
                    showUnverified={true}
                  />
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  Certification & Badges de Confiance Kinimmo Trust
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Faites vérifier votre carte d’agent immobilier, votre identité et vos mandats légaux pour afficher le badge vert vérifié auprès de vos acheteurs.
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsTrustModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Déposer mes pièces justificatives</span>
            </button>
          </div>

          {/* Liste rapide des derniers biens */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Dernières annonces publiées</h3>
                <p className="text-xs text-slate-400">Statut en direct et actions rapides</p>
              </div>
              <button
                onClick={() => setActiveSection('my_properties')}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <span>Tout afficher ({myProperties.length})</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {myProperties.slice(0, 4).map((p) => {
                const status = getListingLifecycleStatus(p);
                const cfg = LISTING_STATUS_CONFIG[status];
                return (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.images[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&auto=format&fit=crop&q=80'}
                        alt={p.title}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{p.title}</h4>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{p.commune || 'Kinshasa'}</span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-400">{p.price.toLocaleString()} {p.currency}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      <button
                        onClick={() => {
                          setStatusModalProperty(p);
                          setTargetStatus(status === 'SOLD' ? 'PUBLISHED' : 'SOLD');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700"
                      >
                        Changer statut
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ESPACE KINIMMO TRUST : VÉRIFICATION ET CONFIANCE          */}
      {/* ======================================================== */}
      {activeSection === 'kinimmo_trust' && (
        <AgentTrustSpace />
      )}

      {/* ======================================================== */}
      {/* 2. MES BIENS IMMOBILIERS (AVEC RÈGLES DES ANNONCES) */}
      {/* ======================================================== */}
      {activeSection === 'my_properties' && (
        <div className="space-y-4">
          {/* Header & Filtres */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrer :
              </span>
              {[
                { id: 'ALL', label: 'Tous' },
                { id: 'PUBLISHED', label: 'Publiés' },
                { id: 'PENDING_REVIEW', label: 'En attente' },
                { id: 'SOLD', label: 'Vendus' },
                { id: 'RENTED', label: 'Loués' },
                { id: 'DRAFT', label: 'Brouillons' },
                { id: 'ARCHIVED', label: 'Archivés' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setPropertyFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    propertyFilter === f.id
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-64 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                placeholder="Rechercher par titre, commune..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Liste des cartes de propriétés */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map((p) => {
              const status = getListingLifecycleStatus(p);
              const cfg = LISTING_STATUS_CONFIG[status];
              const boostCheck = canBoostProperty(p);
              const canEdit = canUserEditProperty(user, p);

              return (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between"
                >
                  <div>
                    {/* Image & Status Badge */}
                    <div className="relative h-44 w-full">
                      <img
                        src={p.images[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&auto=format&fit=crop&q=80'}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-md ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                        {!cfg.isAvailable && (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-slate-950/80 text-rose-400 border border-rose-500/30">
                            Indisponible
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-slate-950/85 backdrop-blur-md text-emerald-400 text-xs font-black border border-emerald-500/30 shadow-lg">
                        {p.price.toLocaleString()} {p.currency}
                      </div>
                    </div>

                    {/* Descriptif */}
                    <div className="p-4 space-y-2">
                      <h4 className="text-xs font-bold text-white line-clamp-1">{p.title}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{p.commune || 'Kinshasa'} • {p.quartier || 'Centre'}</span>
                      </p>

                      {p.assignedAgentName && (
                        <p className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md inline-block">
                          Attribué à : <strong>{p.assignedAgentName}</strong>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Boutons d'actions */}
                  <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Bouton Modifier (vérification stricte de permission) */}
                      <button
                        onClick={() => {
                          if (!canEdit) {
                            alert("Permission refusée : Vous n'êtes pas autorisé à modifier ce bien.");
                            return;
                          }
                          setEditingProperty(p);
                          setIsSubmitPropertyOpen(true);
                        }}
                        disabled={!canEdit}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                          canEdit
                            ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                            : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                        }`}
                        title={canEdit ? 'Modifier cette annonce' : 'Non autorisé à modifier ce bien'}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Modifier</span>
                      </button>

                      {/* Changer Statut (Vendu / Loué / Publié) */}
                      <button
                        onClick={() => {
                          setStatusModalProperty(p);
                          setTargetStatus(status === 'SOLD' ? 'PUBLISHED' : 'SOLD');
                        }}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Changer statut</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {/* Bouton Booster (Désactivé si RENTED ou SOLD) */}
                      <button
                        onClick={() => setBoostModalProperty(p)}
                        disabled={!boostCheck.allowed}
                        className={`py-1.5 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                          boostCheck.allowed
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed opacity-60'
                        }`}
                        title={boostCheck.reason || 'Sponsoriser ce bien'}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{boostCheck.allowed ? 'Booster' : 'Boost interdit'}</span>
                      </button>

                      {/* Historique des statuts */}
                      <button
                        onClick={() => setStatusHistoryViewProperty(p)}
                        className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Historique</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProperties.length === 0 && (
            <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-white">Aucun bien trouvé pour ce filtre</h4>
              <p className="text-xs text-slate-400">Modifiez vos critères ou ajoutez une nouvelle annonce.</p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. GESTION DES PHOTOS ET VIDÉOS (CLOUDINARY) */}
      {/* ======================================================== */}
      {activeSection === 'media_manager' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                <Film className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Gestion des Médias, Photos & Vidéos Cloudinary</h3>
                <p className="text-xs text-slate-400">
                  Hébergement haute fidélité pour vos visites virtuelles avec streaming optimisé et génération automatique des miniatures.
                </p>
              </div>
            </div>

            {/* Réutilisation du composant de téléversement Cloudinary complet */}
            <AgentVideoPublishManager
              myProperties={myProperties}
              onOpenPropertyModal={setActivePropertyModalId}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. PROSPECTS ET SUIVI COMMERCIAL */}
      {/* ======================================================== */}
      {activeSection === 'leads' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white">Prospects & Suivi Commercial (CRM)</h3>
              <p className="text-xs text-slate-400">
                Gérez vos demandes de contact, relancez les clients et concluez vos transactions.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
              {leads.length} prospect{leads.length > 1 ? 's' : ''} au total
            </span>
          </div>

          <div className="divide-y divide-slate-800">
            {leads.map((lead) => (
              <div key={lead.id} className="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">{lead.userName}</h4>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      lead.status === 'new'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : lead.status === 'contacted'
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : lead.status === 'viewing'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      {lead.status === 'new' ? 'Nouveau' : lead.status === 'contacted' ? 'Contacté' : lead.status === 'viewing' ? 'Visite' : 'Clôturé'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">{lead.propertyTitle}</p>
                  <p className="text-xs text-slate-300 italic">« {lead.message} »</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span>{lead.userPhone}</span>
                    <span>•</span>
                    <span>{lead.userEmail}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Bouton WhatsApp direct */}
                  {lead.userPhone && (
                    <a
                      href={`https://wa.me/${lead.userPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${lead.userName}, je suis votre agent Kinimmo concernant le bien « ${lead.propertyTitle} ».`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Direct</span>
                    </a>
                  )}

                  {/* Sélecteur de statut lead */}
                  <select
                    value={lead.status}
                    onChange={(e) => updateLeadStatus(lead.id, e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="new">Nouveau</option>
                    <option value="contacted">Contacté</option>
                    <option value="viewing">Visite planifiée</option>
                    <option value="closed">Clôturé / Transaction</option>
                  </select>

                  <button
                    onClick={() => deleteLead(lead.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                    title="Supprimer ce lead"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {leads.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                Aucun prospect pour le moment. Vos demandes apparaîtront ici dès que des visiteurs vous contacteront.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. DEMANDES DE VISITE ET CALENDRIER */}
      {/* ======================================================== */}
      {activeSection === 'visits_calendar' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-white">Demandes de Visite & Calendrier</h3>
              <p className="text-xs text-slate-400">
                Planification des visites en présentiel et virtuelles guidées à Kinshasa.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-bold">
              Visites programmées
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leads.filter(l => l.requestType === 'tour' || l.tourDate).map((visit) => (
              <div key={visit.id} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{visit.propertyTitle}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    Visite client
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-300">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span>Date : <strong>{visit.tourDate || 'À convenir'}</strong> à <strong>{visit.tourTime || '10:00'}</strong></span>
                </div>

                <div className="text-xs text-slate-400">
                  Client : <strong className="text-white">{visit.userName}</strong> ({visit.userPhone})
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <a
                    href={`https://wa.me/${visit.userPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${visit.userName}, je confirme notre rendez-vous de visite pour ${visit.propertyTitle} le ${visit.tourDate || 'ce week-end'}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Confirmer sur WhatsApp</span>
                  </a>

                  <button
                    onClick={() => updateLeadStatus(visit.id, 'closed')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold"
                  >
                    Marquer effectuée
                  </button>
                </div>
              </div>
            ))}

            {leads.filter(l => l.requestType === 'tour' || l.tourDate).length === 0 && (
              <div className="col-span-2 text-center py-10 text-slate-400 text-xs space-y-2">
                <Calendar className="w-8 h-8 text-slate-600 mx-auto" />
                <p>Aucune visite planifiée pour le moment.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. STATISTIQUES DES ANNONCES */}
      {/* ======================================================== */}
      {activeSection === 'analytics' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black text-white">Statistiques Détaillées de vos Biens</h3>
            <p className="text-xs text-slate-400">
              Performances, clics WhatsApp et volume d'engagement des acquéreurs et locataires.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 font-bold">Vues par bien (Moyenne)</span>
              <div className="text-2xl font-black text-white mt-1">
                {totalListings > 0 ? Math.round(totalViews / totalListings) : 0}
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 font-bold">Taux de Contact</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {totalViews > 0 ? ((totalWhatsappClicks / totalViews) * 100).toFixed(1) : 0} %
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400 font-bold">Taux de Clôture (Vendu / Loué)</span>
              <div className="text-2xl font-black text-blue-400 mt-1">
                {totalListings > 0 ? (((soldListings + rentedListings) / totalListings) * 100).toFixed(0) : 0} %
              </div>
            </div>
          </div>

          {/* Tableau des meilleures annonces */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Classement de vos annonces</h4>
            <div className="divide-y divide-slate-800">
              {myProperties.slice().sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0)).map((prop, idx) => (
                <div key={prop.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-white truncate max-w-xs">{prop.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-400">
                    <span>{prop.viewsCount || 0} vues</span>
                    <span className="text-emerald-400 font-bold">{prop.whatsappClicks || 0} clics WA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. BOOSTS ET ANNONCES SPONSORISÉES */}
      {/* ======================================================== */}
      {activeSection === 'boosts' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-white">Boosts & Annonces Sponsorisées</h3>
              <p className="text-xs text-slate-400">
                Multipliez jusqu'à 5x vos demandes de visite en plaçant vos biens en vedette.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              {activeBoostedProps.length} boost{activeBoostedProps.length > 1 ? 's' : ''} actif{activeBoostedProps.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">Mise en Vedette (7 jours)</span>
                <span className="text-emerald-400 font-bold text-xs">10 $ USD</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Positionnement prioritaire en tête de la page d'accueil et dans les résultats de recherche.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/70 border border-yellow-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">Pack Premium (30 jours)</span>
                <span className="text-emerald-400 font-bold text-xs">25 $ USD</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Cadre doré officiel, badge Premium exclusif et visibilité maximale pendant un mois complet.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/70 border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs">Badge Urgent (14 jours)</span>
                <span className="text-emerald-400 font-bold text-xs">8 $ USD</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Bandeau d'urgence clignotant pour accélérer la transaction auprès des acquéreurs sérieux.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold text-slate-300">Vos annonces avec boost actif</h4>
            <div className="divide-y divide-slate-800">
              {activeBoostedProps.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{p.title}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                    Sponsorisé Actif
                  </span>
                </div>
              ))}
              {activeBoostedProps.length === 0 && (
                <p className="text-slate-400 text-xs py-4 text-center">
                  Aucun boost actif pour le moment. Cliquez sur « Booster » sur l'une de vos annonces publiées.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 9. ABONNEMENT ET FACTURES */}
      {/* ======================================================== */}
      {activeSection === 'billing_subscription' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black text-white">Abonnement & Historique des Paiements</h3>
            <p className="text-xs text-slate-400">
              Suivi de votre formule, quotas d'annonces et justificatifs de règlement Mobile Money.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Formule Pro Active
              </span>
              <h4 className="text-base font-bold text-white mt-2">Formule Pro Courtier Indépendant</h4>
              <p className="text-xs text-slate-400 mt-1">
                Jusqu'à 25 annonces actives, 3 boosts inclus et contact WhatsApp direct certifié.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-emerald-400">29 $ / mois</span>
              <span className="text-[11px] text-slate-400 block">(~{(29 * cdfExchangeRate).toLocaleString()} CDF)</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Historique des factures</h4>
            <div className="divide-y divide-slate-800">
              {myInvoices.map((inv) => (
                <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white">{inv.invoiceNumber || (inv as any).invoice_number || inv.id}</span>
                    <p className="text-[11px] text-slate-400">{inv.createdAt || (inv as any).created_at || 'Facture récente'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-white">{inv.totalAmount || inv.amount || 0} USD</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {inv.status === 'paid' ? 'Payée' : 'En attente'}
                    </span>
                  </div>
                </div>
              ))}
              {myInvoices.length === 0 && (
                <p className="text-slate-400 text-xs py-4 text-center">Aucune facture émise pour le moment.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 10. PROFIL PROFESSIONNEL ET NUMÉRO WHATSAPP */}
      {/* ======================================================== */}
      {activeSection === 'profile_whatsapp' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black text-white">Profil Professionnel & Contact WhatsApp</h3>
            <p className="text-xs text-slate-400">
              Ces coordonnées sont directement présentées sur vos fiches de biens pour les contacts clients.
            </p>
          </div>

          {profileSuccessMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nom complet</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Téléphone d'appel</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Numéro WhatsApp direct (RDC)</span>
                </label>
                <input
                  type="text"
                  value={profileWhatsapp}
                  onChange={(e) => setProfileWhatsapp(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
                  placeholder="+243 81 000 0000"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Zones & Spécialités Immobilières</label>
              <input
                type="text"
                value={profileSpecialties}
                onChange={(e) => setProfileSpecialties(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Présentation / Bio professionnelle</label>
              <textarea
                rows={3}
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20"
            >
              Enregistrer mon profil
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* 11. NOTIFICATIONS, ASSISTANCE ET PARAMÈTRES */}
      {/* ======================================================== */}
      {activeSection === 'notifications_settings' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
          <div>
            <h3 className="text-lg font-black text-white">Notifications, Assistance & Sécurité</h3>
            <p className="text-xs text-slate-400">
              Assistance VIP Kinimmo et protection de votre compte professionnel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <HelpCircle className="w-5 h-5" />
                <span>Assistance VIP Kinimmo</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Une question sur la publication de vos annonces ou sur vos factures ? L'équipe technique Kinimmo est à votre service.
              </p>
              <div className="pt-2">
                <a
                  href={`https://wa.me/${(contactSettings.supportWhatsApp || '243845294616').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Bonjour Support Kinimmo, je suis un agent partenaire et j\'ai besoin d\'assistance.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contacter le support sur WhatsApp</span>
                </a>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Lock className="w-5 h-5" />
                <span>Sécurité & Double Authentification (2FA)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Protégez l'accès à vos mandats et coordonnées avec l'authentification à deux facteurs et le contrôle d'accès.
              </p>
              <div className="pt-2">
                <button
                  onClick={onOpenSecurityModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold shadow-md"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Gérer la sécurité du compte</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL CHANGEMENT DE STATUT (VENDU / LOUÉ / PUBLIÉ / ETC.) */}
      {/* ======================================================== */}
      {statusModalProperty && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative text-left">
            <button
              onClick={() => setStatusModalProperty(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Changer le statut de l'annonce</h3>
              <p className="text-xs text-slate-400 truncate">{statusModalProperty.title}</p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Sélectionnez le nouveau statut :
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['PUBLISHED', 'RENTED', 'SOLD', 'DRAFT', 'PENDING_REVIEW', 'ARCHIVED'] as ListingLifecycleStatus[]).map((st) => {
                  const cfg = LISTING_STATUS_CONFIG[st];
                  const isSelected = targetStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setTargetStatus(st)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <span className={`text-xs font-bold block ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{cfg.description}</span>
                    </button>
                  );
                })}
              </div>

              {(targetStatus === 'SOLD' || targetStatus === 'RENTED') && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  ⚠️ <strong>Attention :</strong> En marquant ce bien comme {targetStatus === 'SOLD' ? 'VENDU' : 'LOUÉ'}, il ne sera plus présenté comme disponible au public et tous les boosts de visibilité seront désactivés.
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Commentaire / Note d'historique (facultatif)
                </label>
                <input
                  type="text"
                  value={statusChangeNote}
                  onChange={(e) => setStatusChangeNote(e.target.value)}
                  placeholder="Ex: Vente conclue au notaire, loué pour 1 an..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalProperty(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-bold text-xs hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={isSubmittingStatus}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {isSubmittingStatus ? 'Enregistrement...' : 'Confirmer le statut'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL HISTORIQUE DU BIEN */}
      {/* ======================================================== */}
      {statusHistoryViewProperty && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative text-left">
            <button
              onClick={() => setStatusHistoryViewProperty(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-black text-white">Historique de l'annonce</h3>
            </div>
            <p className="text-xs text-slate-400 truncate">{statusHistoryViewProperty.title}</p>

            <div className="space-y-3 max-h-80 overflow-y-auto divide-y divide-slate-800 pt-2">
              {(statusHistoryViewProperty.statusHistory || []).map((hist) => (
                <div key={hist.id} className="pt-3 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400">
                      {hist.fromStatus} ➔ {hist.toStatus}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(hist.changedAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{hist.note}</p>
                  <span className="text-[10px] text-slate-500 block">Modifié par : {hist.changedByName}</span>
                </div>
              ))}

              {(!statusHistoryViewProperty.statusHistory || statusHistoryViewProperty.statusHistory.length === 0) && (
                <p className="text-xs text-slate-400 text-center py-4">
                  Aucun historique antérieur enregistré.
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setStatusHistoryViewProperty(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Boost de visibilité */}
      {boostModalProperty && (
        <VisibilityBoostModal
          isOpen={Boolean(boostModalProperty)}
          onClose={() => setBoostModalProperty(null)}
          property={boostModalProperty}
          onSuccess={() => setBoostModalProperty(null)}
        />
      )}

      {/* Modal Demande Kinimmo Trust Agent */}
      <TrustVerificationModal
        isOpen={isTrustModalOpen}
        onClose={() => setIsTrustModalOpen(false)}
        targetType="agent"
        targetId={user?.agentId || user?.id || 'agent_current'}
        targetName={user?.name || 'Agent PRO'}
        onSuccess={() => {
          setIsTrustModalOpen(false);
        }}
      />
    </div>
  );
};
