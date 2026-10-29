import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  Briefcase,
  ShieldCheck,
  Search,
  Plus,
  Trash2,
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Eye,
  EyeOff,
  Award,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Agent, Agency } from '../../types';

interface AdminAgentsAgenciesControlProps {
  initialView?: 'agents' | 'agencies';
  onOpenSubmitProperty?: () => void;
}

export const AdminAgentsAgenciesControl: React.FC<AdminAgentsAgenciesControlProps> = ({
  initialView = 'agents',
}) => {
  const {
    agents,
    agencies,
    properties,
    addAgent,
    deleteAgent,
    toggleAgentVisibility,
    updateAgentVerification,
    addAgency,
    deleteAgency,
    updateAgencySubscriptionStatus,
    setIsInviteModalOpen,
    requestConfirm,
  } = useApp();

  const [currentView, setCurrentView] = useState<'agents' | 'agencies'>(initialView);

  // Filtres Agents
  const [agentSearch, setAgentSearch] = useState('');
  const [agentStatusFilter, setAgentStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'visible' | 'hidden'>('all');
  const [agentAgencyFilter, setAgentAgencyFilter] = useState<string>('all');

  // Filtres Agences
  const [agencySearch, setAgencySearch] = useState('');
  const [agencyStatusFilter, setAgencyStatusFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [agencyCommuneFilter, setAgencyCommuneFilter] = useState<string>('all');

  // Modals création / édition
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false);
  const [isNewAgencyModalOpen, setIsNewAgencyModalOpen] = useState(false);
  const [selectedAgentPropertiesModal, setSelectedAgentPropertiesModal] = useState<Agent | null>(null);

  // Formulaire Nouvel Agent
  const [agentForm, setAgentForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    title: 'Courtier Immobilier Agréé',
    agencyName: '',
    commune: 'Gombe',
    isVerified: true,
  });

  // Formulaire Nouvelle Agence
  const [agencyForm, setAgencyForm] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    address: '',
    commune: 'Gombe',
    rccm: '',
    managerName: '',
    subscriptionStatus: 'Active' as 'Active' | 'Expired',
  });

  // Stats Globales
  const stats = useMemo(() => {
    const verifiedAgentsCount = agents.filter((a) => a.isVerified).length;
    const independentAgentsCount = agents.filter((a) => !a.agencyName || a.agencyName === 'Indépendant').length;
    const activeAgenciesCount = agencies.filter((a) => a.subscriptionStatus !== 'Expired').length;
    return {
      totalAgents: agents.length,
      verifiedAgents: verifiedAgentsCount,
      independentAgents: independentAgentsCount,
      totalAgencies: agencies.length,
      activeAgencies: activeAgenciesCount,
      totalProperties: properties.length,
    };
  }, [agents, agencies, properties]);

  // Liste filtrée des agents
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => {
      const q = agentSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        agent.name.toLowerCase().includes(q) ||
        agent.email.toLowerCase().includes(q) ||
        (agent.phone && agent.phone.toLowerCase().includes(q)) ||
        (agent.agencyName && agent.agencyName.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (agentStatusFilter === 'verified' && !agent.isVerified) return false;
      if (agentStatusFilter === 'unverified' && agent.isVerified) return false;
      if (agentStatusFilter === 'visible' && agent.isHidden === true) return false;
      if (agentStatusFilter === 'hidden' && agent.isHidden !== true) return false;

      if (agentAgencyFilter !== 'all') {
        if (agentAgencyFilter === 'independent') {
          if (agent.agencyName && agent.agencyName !== 'Indépendant') return false;
        } else if (agent.agencyName !== agentAgencyFilter) {
          return false;
        }
      }

      return true;
    });
  }, [agents, agentSearch, agentStatusFilter, agentAgencyFilter]);

  // Liste filtrée des agences
  const filteredAgencies = useMemo(() => {
    return agencies.filter((agency) => {
      const q = agencySearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        agency.name.toLowerCase().includes(q) ||
        agency.email.toLowerCase().includes(q) ||
        (agency.rccm && agency.rccm.toLowerCase().includes(q)) ||
        (agency.commune && agency.commune.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (agencyStatusFilter === 'active' && agency.subscriptionStatus === 'Expired') return false;
      if (agencyStatusFilter === 'expired' && agency.subscriptionStatus !== 'Expired') return false;

      if (agencyCommuneFilter !== 'all' && agency.commune !== agencyCommuneFilter) return false;

      return true;
    });
  }, [agencies, agencySearch, agencyStatusFilter, agencyCommuneFilter]);

  // Gestion création d'un agent
  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentForm.name.trim() || !agentForm.email.trim()) return;

    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: agentForm.name.trim(),
      email: agentForm.email.trim(),
      phone: agentForm.phone.trim() || '+243 84 529 4616',
      whatsapp: agentForm.whatsapp.trim() || agentForm.phone.trim() || '+243 84 529 4616',
      title: agentForm.title,
      agencyName: agentForm.agencyName || 'Indépendant',
      avatar: `https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80`,
      rating: 5.0,
      reviewCount: 0,
      listingsCount: 0,
      isVerified: agentForm.isVerified,
      isHidden: false,
      verificationStatus: agentForm.isVerified ? 'verified' : 'unverified',
      specialties: ['Vente Résidentielle', 'Location Haut Standing', 'Kinshasa'],
      languages: ['Français', 'Lingala', 'Anglais'],
      bio: `Courtier immobilier accrédité auprès de Kinshasa Immobilier opérant sur ${agentForm.commune || 'Kinshasa'}.`,
    };

    addAgent(newAgent);
    setIsNewAgentModalOpen(false);
    setAgentForm({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      title: 'Courtier Immobilier Agréé',
      agencyName: '',
      commune: 'Gombe',
      isVerified: true,
    });
  };

  // Gestion création d'une agence
  const handleCreateAgency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyForm.name.trim() || !agencyForm.email.trim()) return;

    const newAgency: Agency = {
      id: `agency-${Date.now()}`,
      name: agencyForm.name.trim(),
      email: agencyForm.email.trim(),
      phone: agencyForm.phone.trim() || '+243 84 529 4616',
      whatsapp: agencyForm.whatsapp.trim() || agencyForm.phone.trim() || '+243 84 529 4616',
      address: agencyForm.address.trim() || `Boulevard du 30 Juin, ${agencyForm.commune}`,
      city: 'Kinshasa',
      commune: agencyForm.commune,
      website: 'https://www.kinimmo.com',
      rccm: agencyForm.rccm.trim() || 'CD/KIN/RCCM/24-B-0012',
      logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&auto=format&fit=crop&q=80',
      description: `Agence immobilière professionnelle agréée à ${agencyForm.commune}, Kinshasa. Gestion locative, transactions et expertises.`,
      agentsCount: 1,
      subscriptionStatus: agencyForm.subscriptionStatus,
    };

    addAgency(newAgency);
    setIsNewAgencyModalOpen(false);
    setAgencyForm({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      address: '',
      commune: 'Gombe',
      rccm: '',
      managerName: '',
      subscriptionStatus: 'Active',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Overview Stats */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Gouvernance & Supervision Administrative</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Contrôle des Agents & Agences Immobilières
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Supervisez l'annuaire des courtiers et des agences agréées à Kinshasa, gérez les badges Kinimmo Trust, contrôlez les affiliations et suspendez les profils non conformes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Inviter Partenaire</span>
            </button>
            {currentView === 'agents' ? (
              <button
                onClick={() => setIsNewAgentModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un Agent</span>
              </button>
            ) : (
              <button
                onClick={() => setIsNewAgencyModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une Agence</span>
              </button>
            )}
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div
            onClick={() => setCurrentView('agents')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              currentView === 'agents'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Agents Enregistrés</span>
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.totalAgents}</div>
            <span className="text-[10px] text-emerald-400 font-semibold">{stats.verifiedAgents} avec Badge Vérifié</span>
          </div>

          <div
            onClick={() => setCurrentView('agencies')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              currentView === 'agencies'
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Agences Partenaires</span>
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.totalAgencies}</div>
            <span className="text-[10px] text-indigo-400 font-semibold">{stats.activeAgencies} Agréments Actifs</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Courtiers Indépendants</span>
              <Award className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.independentAgents}</div>
            <span className="text-[10px] text-slate-500">Sans affiliation d'agence</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-slate-400">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">Biens Sous Mandats</span>
              <Building2 className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.totalProperties}</div>
            <span className="text-[10px] text-slate-500">Portefeuille global Kinshasa</span>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pt-2">
          <button
            onClick={() => setCurrentView('agents')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              currentView === 'agents'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Courtiers & Agents Immobiliers ({filteredAgents.length})</span>
          </button>
          <button
            onClick={() => setCurrentView('agencies')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              currentView === 'agencies'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Agences Immobilières Agréées ({filteredAgencies.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VUE 1 : CONTRÔLE DES AGENTS                               */}
      {/* ========================================================= */}
      {currentView === 'agents' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={agentSearch}
                onChange={(e) => setAgentSearch(e.target.value)}
                placeholder="Rechercher par nom d'agent, email, agence, téléphone..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={agentStatusFilter}
                onChange={(e) => setAgentStatusFilter(e.target.value as any)}
                aria-label="Filtrer les agents par statut"
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Tous les Statuts</option>
                <option value="verified">✅ Vérifiés Kinshasa</option>
                <option value="unverified">⚠️ Non Vérifiés</option>
                <option value="visible">👁️ Actifs (En ligne)</option>
                <option value="hidden">🚫 Suspendus (Masqués)</option>
              </select>

              <select
                value={agentAgencyFilter}
                onChange={(e) => setAgentAgencyFilter(e.target.value)}
                aria-label="Filtrer les agents par agence"
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Toutes les Agences</option>
                <option value="independent">Indépendants</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.name}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => {
              const agentPropsCount = properties.filter(
                (p) => p.agentId === agent.id || p.assignedAgentId === agent.id || p.assignedAgentName === agent.name
              ).length;

              return (
                <div
                  key={agent.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={agent.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'}
                          alt={agent.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-white text-sm truncate">{agent.name}</h4>
                            {agent.isVerified && (
                              <span title="Badge Kinimmo Trust Vérifié">
                                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate">{agent.title || 'Courtier Immobilier'}</p>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          agent.isHidden !== true
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {agent.isHidden !== true ? 'Actif' : 'Suspendu'}
                      </span>
                    </div>

                    {/* Details Box */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>Agence :</span>
                        </span>
                        <span className="font-semibold text-white truncate max-w-[150px]">
                          {agent.agencyName || 'Indépendant'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Email :</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-300 truncate max-w-[150px]">{agent.email}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Téléphone :</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-300">{agent.phone || 'Non renseigné'}</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800/60">
                        <span>Biens publiés :</span>
                        <span className="font-bold text-emerald-400">{agentPropsCount} annonces</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Toggle Verification Badge */}
                      <button
                        onClick={() => {
                          const newStatus = !agent.isVerified;
                          updateAgentVerification(
                            agent.id,
                            newStatus,
                            newStatus ? 'verified' : 'unverified',
                            undefined,
                            'Super Admin'
                          );
                        }}
                        title={agent.isVerified ? 'Retirer le badge de certification' : 'Accorder le badge vérifié'}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          agent.isVerified
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>

                      {/* Toggle Suspension */}
                      <button
                        onClick={() => toggleAgentVisibility(agent.id)}
                        title={agent.isHidden !== true ? "Suspendre l'agent" : "Réactiver l'agent"}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          agent.isHidden !== true
                            ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-rose-400 hover:border-rose-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                      >
                        {agent.isHidden !== true ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      {/* WhatsApp contact */}
                      {agent.whatsapp && (
                        <a
                          href={`https://wa.me/${agent.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Bonjour ${agent.name}, message de la Direction Kinimmo concernant votre compte agent.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Contacter sur WhatsApp"
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedAgentPropertiesModal(agent)}
                        title="Voir les biens de cet agent"
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>Biens ({agentPropsCount})</span>
                      </button>

                      <button
                        onClick={() => {
                          requestConfirm({
                            title: `Supprimer l'agent ${agent.name} ?`,
                            message: `Cette action supprimera définitivement le profil de l'agent. Les biens publiés resteront archivés sous la plateforme.`,
                            confirmText: 'Supprimer',
                            cancelText: 'Annuler',
                            onConfirm: () => deleteAgent(agent.id),
                          });
                        }}
                        title="Supprimer ce profil d'agent"
                        className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAgents.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-white font-bold text-base">Aucun agent trouvé</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Modifiez vos filtres ou ajoutez un nouveau courtier pour le faire apparaître dans l'annuaire.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 2 : CONTRÔLE DES AGENCES                             */}
      {/* ========================================================= */}
      {currentView === 'agencies' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between shadow-sm">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={agencySearch}
                onChange={(e) => setAgencySearch(e.target.value)}
                placeholder="Rechercher par nom d'agence, RCCM, commune, contact..."
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={agencyStatusFilter}
                onChange={(e) => setAgencyStatusFilter(e.target.value as any)}
                aria-label="Filtrer les agences par statut"
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Tous les Statuts d'Abonnement</option>
                <option value="active">🟢 Agréments Actifs</option>
                <option value="expired">🔴 Agréments Expirés</option>
              </select>

              <select
                value={agencyCommuneFilter}
                onChange={(e) => setAgencyCommuneFilter(e.target.value)}
                aria-label="Filtrer les agences par commune"
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Toutes les Communes</option>
                <option value="Gombe">Gombe</option>
                <option value="Ngaliema">Ngaliema</option>
                <option value="Limete">Limete</option>
                <option value="Mont-Ngafula">Mont-Ngafula</option>
                <option value="Bandalungwa">Bandalungwa</option>
                <option value="Kalamu">Kalamu</option>
                <option value="Barumbu">Barumbu</option>
              </select>
            </div>
          </div>

          {/* Agencies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgencies.map((agency) => {
              const agencyAgents = agents.filter((a) => a.agencyName === agency.name);
              const agencyPropsCount = properties.filter(
                (p) => agencyAgents.some((a) => a.id === p.agentId) || p.agencyName === agency.name
              ).length;

              return (
                <div
                  key={agency.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between shadow-md"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={agency.logo || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&auto=format&fit=crop&q=80'}
                          alt={agency.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-500/20 shadow-md shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-bold text-white text-sm truncate">{agency.name}</h4>
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-indigo-400 shrink-0" />
                            <span>{agency.commune || agency.city || 'Kinshasa'}</span>
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          agency.subscriptionStatus !== 'Expired'
                            ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}
                      >
                        {agency.subscriptionStatus !== 'Expired' ? 'Agrément Actif' : 'Expiré'}
                      </span>
                    </div>

                    {/* Agency Details */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl space-y-1.5 text-xs text-slate-300">
                      {agency.rccm && (
                        <div className="flex items-center justify-between text-slate-400">
                          <span>RCCM / NIF :</span>
                          <span className="font-mono text-[11px] text-amber-300 font-bold">{agency.rccm}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Courtiers affiliés :</span>
                        <span className="font-bold text-white">{agencyAgents.length} agents</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Biens en portefeuille :</span>
                        <span className="font-bold text-emerald-400">{agencyPropsCount} biens</span>
                      </div>

                      <div className="flex items-center justify-between text-slate-400">
                        <span>Contact direct :</span>
                        <span className="font-mono text-[11px] text-slate-300">{agency.phone || agency.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Toggle Subscription Status */}
                      <button
                        onClick={() => {
                          const newStatus = agency.subscriptionStatus === 'Expired' ? 'Active' : 'Expired';
                          updateAgencySubscriptionStatus(agency.id, newStatus);
                        }}
                        title={
                          agency.subscriptionStatus === 'Expired'
                            ? "Réactiver l'agrément de l'agence"
                            : "Suspendre l'agrément de l'agence"
                        }
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          agency.subscriptionStatus !== 'Expired'
                            ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-amber-300'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                        }`}
                      >
                        {agency.subscriptionStatus !== 'Expired' ? 'Suspendre' : 'Réactiver'}
                      </button>

                      {/* WhatsApp contact */}
                      {agency.whatsapp && (
                        <a
                          href={`https://wa.me/${agency.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Bonjour la Direction de ${agency.name}, message de l'Administration Kinimmo.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Contacter la direction de l'agence"
                          className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        requestConfirm({
                          title: `Supprimer l'agence ${agency.name} ?`,
                          message: `Cette action supprimera l'agence de la plateforme. Ses courtiers associés passeront automatiquement au statut Indépendant.`,
                          confirmText: 'Supprimer',
                          cancelText: 'Annuler',
                          onConfirm: () => deleteAgency(agency.id),
                        });
                      }}
                      title="Supprimer cette agence"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredAgencies.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
              <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-white font-bold text-base">Aucune agence trouvée</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Modifiez vos filtres ou enregistrez une nouvelle agence immobilière à Kinshasa.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL : CRÉATION NOUVEL AGENT                             */}
      {/* ========================================================= */}
      {isNewAgentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black text-white">Ajouter un Agent Immobilier</h3>
              </div>
              <button
                onClick={() => setIsNewAgentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nom complet de l'agent *</label>
                <input
                  type="text"
                  required
                  value={agentForm.name}
                  onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  placeholder="Ex: Patrick Tshisekedi"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email professionnel *</label>
                <input
                  type="email"
                  required
                  value={agentForm.email}
                  onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                  placeholder="Ex: patrick.tshisekedi@kinimmo.com"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={agentForm.phone}
                    onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                    placeholder="+243 84..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={agentForm.whatsapp}
                    onChange={(e) => setAgentForm({ ...agentForm, whatsapp: e.target.value })}
                    placeholder="+243 84..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Agence de rattachement</label>
                <select
                  value={agentForm.agencyName}
                  onChange={(e) => setAgentForm({ ...agentForm, agencyName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Indépendant (Sans agence)</option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="agentVerifyCheck"
                  checked={agentForm.isVerified}
                  onChange={(e) => setAgentForm({ ...agentForm, isVerified: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-950 border-slate-800"
                />
                <label htmlFor="agentVerifyCheck" className="text-xs text-slate-300 font-semibold cursor-pointer">
                  Accorder immédiatement le Badge Kinimmo Trust Vérifié
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewAgentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Enregistrer l'Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL : CRÉATION NOUVELLE AGENCE                          */}
      {/* ========================================================= */}
      {isNewAgencyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-black text-white">Ajouter une Agence Immobilière</h3>
              </div>
              <button
                onClick={() => setIsNewAgencyModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAgency} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Raison sociale / Nom d'agence *</label>
                <input
                  type="text"
                  required
                  value={agencyForm.name}
                  onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                  placeholder="Ex: Kinshasa Prestige Realty"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Email officiel de l'agence *</label>
                <input
                  type="email"
                  required
                  value={agencyForm.email}
                  onChange={(e) => setAgencyForm({ ...agencyForm, email: e.target.value })}
                  placeholder="Ex: direction@kinshasaprestige.cd"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Commune</label>
                  <select
                    value={agencyForm.commune}
                    onChange={(e) => setAgencyForm({ ...agencyForm, commune: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Gombe">Gombe</option>
                    <option value="Ngaliema">Ngaliema</option>
                    <option value="Limete">Limete</option>
                    <option value="Mont-Ngafula">Mont-Ngafula</option>
                    <option value="Bandalungwa">Bandalungwa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">RCCM / NIF</label>
                  <input
                    type="text"
                    value={agencyForm.rccm}
                    onChange={(e) => setAgencyForm({ ...agencyForm, rccm: e.target.value })}
                    placeholder="CD/KIN/RCCM/..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Téléphone de contact</label>
                <input
                  type="text"
                  value={agencyForm.phone}
                  onChange={(e) => setAgencyForm({ ...agencyForm, phone: e.target.value })}
                  placeholder="+243 84..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewAgencyModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-500/20 cursor-pointer"
                >
                  Enregistrer l'Agence
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL : CONSULTATION DES BIENS DE L'AGENT                  */}
      {/* ========================================================= */}
      {selectedAgentPropertiesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <img
                  src={selectedAgentPropertiesModal.avatar}
                  alt={selectedAgentPropertiesModal.name}
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/30"
                />
                <div>
                  <h3 className="text-base font-black text-white">{selectedAgentPropertiesModal.name}</h3>
                  <p className="text-xs text-slate-400">
                    Portefeuille de biens publiés • {selectedAgentPropertiesModal.agencyName || 'Indépendant'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgentPropertiesModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {properties
                .filter(
                  (p) =>
                    p.agentId === selectedAgentPropertiesModal.id ||
                    p.assignedAgentId === selectedAgentPropertiesModal.id ||
                    p.assignedAgentName === selectedAgentPropertiesModal.name
                )
                .map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=120'}
                        alt={prop.title}
                        className="w-12 h-10 rounded-xl object-cover shrink-0"
                      />
                      <div>
                        <div className="font-bold text-xs text-white line-clamp-1">{prop.title}</div>
                        <div className="text-[11px] text-slate-400">
                          {prop.commune} • ${prop.price?.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        prop.status === 'for-sale'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : prop.status === 'for-rent'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {prop.status === 'for-sale' ? 'Vente' : prop.status === 'for-rent' ? 'Location' : prop.status}
                    </span>
                  </div>
                ))}

              {properties.filter(
                (p) =>
                  p.agentId === selectedAgentPropertiesModal.id ||
                  p.assignedAgentId === selectedAgentPropertiesModal.id ||
                  p.assignedAgentName === selectedAgentPropertiesModal.name
              ).length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Cet agent n'a pas encore de biens publiés sous son nom.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedAgentPropertiesModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
