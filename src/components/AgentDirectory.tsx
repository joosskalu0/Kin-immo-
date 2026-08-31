import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Agent, Agency } from '../types';
import { AgentVerificationSubmitModal } from './Dashboard/AgentVerificationSubmitModal';
import { AgencyRegistrationModal } from './AgencyRegistrationModal';
import {
  Home,
  Search,
  Star,
  Phone,
  Mail,
  MessageSquare,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Check,
  Trash2,
  Info,
  BadgeCheck,
  FileCheck,
  UserCheck,
  Award,
  X,
  Lock,
  Clock,
  Sparkles,
  PlusCircle,
  FileText,
  Filter,
  Eye,
  EyeOff,
  UserPlus,
} from 'lucide-react';

interface AgentDirectoryProps {
  initialTab?: 'agents' | 'agencies';
  onReturnHome?: () => void;
}

export const AgentDirectory: React.FC<AgentDirectoryProps> = ({ initialTab = 'agents', onReturnHome }) => {
  const {
    agents,
    agencies,
    properties,
    allUsers,
    deleteAgent,
    deleteAgency,
    toggleAgentVisibility,
    toggleAgencyVisibility,
    user,
    requestConfirm,
    setActivePropertyModalId,
    setIsInviteModalOpen,
  } = useApp();

  const isAdmin = user?.role === 'admin' || user?.email === 'joosskalu72@gmail.com' || (user as any)?.isAdmin;

  const [activeTab, setActiveTab] = useState<'agents' | 'agencies'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified_only' | 'pending_only' | 'hidden_only'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [contactAgentModal, setContactAgentModal] = useState<Agent | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const [verificationModalAgent, setVerificationModalAgent] = useState<Agent | null>(null);
  const [showGeneralVerificationInfo, setShowGeneralVerificationInfo] = useState(false);
  const [showSubmitVerificationModal, setShowSubmitVerificationModal] = useState(false);
  const [showAgencyRegistrationModal, setShowAgencyRegistrationModal] = useState(false);

  // Combine explicitly saved agents with all registered users from Firestore who are agents/owners (strictly excluding administrators)
  const combinedAgentsList = React.useMemo(() => {
    const map = new Map<string, Agent>();

    const isAdministrator = (email?: string, name?: string, role?: string, id?: string) => {
      const emailLower = (email || '').toLowerCase();
      const nameLower = (name || '').toLowerCase();
      const roleLower = (role || '').toLowerCase();
      const idLower = (id || '').toLowerCase();
      // Only filter out the dedicated system admin accounts, never real user or agent accounts
      return (
        idLower === 'usr_admin_001' ||
        idLower === 'user_admin' ||
        emailLower === 'admin@immocraft.cd' ||
        emailLower === 'admin@estatik.com' ||
        (nameLower.includes('administrateur système') && roleLower === 'admin')
      );
    };

    // 1. Add explicitly created agents (excluding any admin)
    agents.forEach((a) => {
      if (isAdministrator(a.email, a.name, (a as any).role, a.id)) {
        return;
      }
      map.set(a.id, a);
      if (a.email) map.set(a.email.toLowerCase(), a);
    });

    // 2. Add registered users from database (strictly excluding administrators)
    (allUsers || []).forEach((u) => {
      if (isAdministrator(u.email, u.name, u.role, u.id) || (u as any).isAdmin) {
        return;
      }
      const isAgentOrOwner = u.role === 'agent' || u.role === 'owner' || !!u.agencyName || !!u.agentId;
      if (isAgentOrOwner) {
        const primaryKey = u.agentId || u.id;
        const emailKey = u.email ? u.email.toLowerCase() : '';

        const existing = map.get(primaryKey) || (emailKey ? map.get(emailKey) : undefined);

        if (!existing) {
          const isVer = u.isVerified || u.kinshasaBadgeVerified || false;
          const newAgentObj: Agent = {
            id: primaryKey,
            name: u.name || 'Agent Immobilier',
            title: u.role === 'owner' ? 'Propriétaire Vendeur' : 'Agent Immobilier Agréé',
            email: u.email || '',
            phone: u.phone || '+243 81 000 0000',
            whatsapp: u.whatsapp || u.phone || '+243 81 000 0000',
            avatar: u.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
            agencyName: u.agencyName || 'Kinshasa Immobilier',
            rating: 5.0,
            reviewCount: 1,
            listingsCount: 0,
            bio: `Agent / Membre partenaire certifié Immocraft Kinshasa. RCCM/NIF: ${u.rccmOrNif || 'CD/KIN/RCCM/20-B-04921'}.`,
            specialties: ['Résidentiel', 'Commercial', 'Conseil Immobilier'],
            languages: ['Français', 'Lingala'],
            isVerified: isVer,
            verificationStatus: (u.verificationStatus as any) || (isVer ? 'verified' : 'unverified'),
            verificationDocuments: u.verificationDocuments || [],
            rccmOrNif: u.rccmOrNif,
            identityDocNumber: u.identityDocNumber,
          };
          map.set(primaryKey, newAgentObj);
          if (emailKey) map.set(emailKey, newAgentObj);
        } else {
          // Enhance existing
          if (!existing.phone && u.phone) existing.phone = u.phone;
          if (u.whatsapp) existing.whatsapp = u.whatsapp;
          if (!existing.email && u.email) existing.email = u.email;
          if ((!existing.agencyName || existing.agencyName === 'Kinshasa Immobilier') && u.agencyName) {
            existing.agencyName = u.agencyName;
          }
          if (u.isVerified !== undefined) {
            existing.isVerified = u.isVerified;
            existing.verificationStatus = (u.verificationStatus as any) || (u.isVerified ? 'verified' : 'unverified');
          }
        }
      }
    });

    // Return unique values (strictly omitting any administrator)
    const uniqueList: Agent[] = [];
    const seenIds = new Set<string>();
    for (const item of map.values()) {
      if (!isAdministrator(item.email, item.name, (item as any).role, item.id) && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        uniqueList.push(item);
      }
    }
    return uniqueList;
  }, [agents, allUsers]);

  const getAgentListingsCount = (agent: Agent) => {
    const activeProps = properties.filter(
      (p) => p.agentId === agent.id || (agent.email && p.agentId === agent.email)
    ).length;
    return Math.max(activeProps, agent.listingsCount || 0);
  };

  const filteredAgents = combinedAgentsList.filter((a) => {
    // Regular users do not see hidden agents
    if (!isAdmin && a.isHidden) return false;

    if (verificationFilter === 'hidden_only' && !a.isHidden) return false;
    const isVer = a.isVerified === true || a.verificationStatus === 'verified';
    if (verificationFilter === 'verified_only' && !isVer) return false;
    if (verificationFilter === 'pending_only' && (isVer || a.verificationStatus !== 'pending')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.name.toLowerCase().includes(q);
      const matchEmail = a.email && a.email.toLowerCase().includes(q);
      const matchSpec = a.specialties.some((s) => s.toLowerCase().includes(q));
      const matchAgency = a.agencyName && a.agencyName.toLowerCase().includes(q);
      return matchName || matchEmail || matchSpec || matchAgency;
    }
    return true;
  });

  const sortedAgents = [...filteredAgents].sort(
    (a, b) => getAgentListingsCount(b) - getAgentListingsCount(a)
  );

  const verifiedAgentsCount = combinedAgentsList.filter(
    (a) => a.isVerified === true || a.verificationStatus === 'verified'
  ).length;

  const hiddenAgentsCount = combinedAgentsList.filter((a) => a.isHidden).length;

  const getAgencyListingsCount = (agency: Agency) => {
    const agencyAgents = combinedAgentsList.filter(
      (a) => a.agencyId === agency.id || (a.agencyName && a.agencyName.toLowerCase().includes(agency.name.toLowerCase()))
    );
    const agencyAgentIds = new Set(agencyAgents.map((a) => a.id));
    agencyAgents.forEach((a) => {
      if (a.email) agencyAgentIds.add(a.email);
    });

    const activePropsCount = properties.filter(
      (p) => p.agencyId === agency.id || (p.agentId && agencyAgentIds.has(p.agentId))
    ).length;
    return activePropsCount;
  };

  const combinedAgenciesList = React.useMemo(() => {
    const map = new Map<string, Agency>();

    // 1. Add all agencies from Firestore collection
    agencies.forEach((ag) => {
      if (ag && ag.name) {
        map.set(ag.id, ag);
        map.set(ag.name.toLowerCase().trim(), ag);
      }
    });

    // 2. Add users whose role is 'agency'
    (allUsers || []).forEach((u) => {
      if (u.role === 'agency' && u.name) {
        const agencyName = u.agencyName || u.name;
        const key = agencyName.toLowerCase().trim();
        if (!map.has(key)) {
          const newAgency: Agency = {
            id: u.agencyId || `agency_${u.id}`,
            name: agencyName,
            logo: u.avatar || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80',
            address: (u as any).address || 'Kinshasa, RDC',
            city: 'Kinshasa',
            commune: (u as any).commune || 'Gombe',
            phone: u.phone || '+243 81 000 00 00',
            whatsapp: u.whatsapp || u.phone || '+243 81 000 00 00',
            email: u.email || '',
            website: (u as any).website || '',
            managerName: u.name,
            rccm: u.rccmOrNif || 'CD/KIN/RCCM/24-B-03912',
            agentsCount: 1,
            description: `Agence immobilière enregistrée sur Immocraft Kinshasa. Gestion et transactions immobilières.`,
            specialties: ['Achat & Vente', 'Location', 'Conseil Immobilier'],
            isVerified: Boolean(u.isVerified || u.kinshasaBadgeVerified),
            verificationStatus: (u.verificationStatus as any) || (u.isVerified ? 'verified' : 'unverified'),
            subscriptionStatus: 'Active',
            planId: 'agency',
            createdAt: u.createdAt || new Date().toISOString(),
          };
          map.set(newAgency.id, newAgency);
          map.set(key, newAgency);
        }
      }
    });

    // 3. Include agencies represented by registered agents in combinedAgentsList
    combinedAgentsList.forEach((agt) => {
      if (agt.agencyName && agt.agencyName.trim().length > 1) {
        const cleanName = agt.agencyName.trim();
        const key = cleanName.toLowerCase();
        const existing = map.get(key);

        if (!existing) {
          const generatedAgency: Agency = {
            id: agt.agencyId || `agency_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
            name: cleanName,
            logo: agt.avatar || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80',
            address: `${(agt as any).commune || 'Gombe'}, Kinshasa, RDC`,
            city: 'Kinshasa',
            commune: (agt as any).commune || 'Gombe',
            phone: agt.phone || '+243 81 000 00 00',
            whatsapp: agt.whatsapp || agt.phone || '+243 81 000 00 00',
            email: agt.email || '',
            website: '',
            managerName: agt.name,
            rccm: agt.rccmOrNif || 'CD/KIN/RCCM/24-B-03912',
            agentsCount: 1,
            description: `Agence immobilière partenaire à Kinshasa. Équipe d'agents agréés au service de vos projets immobiliers.`,
            specialties: ['Transactions Résidentielles', 'Location Haut Standing', 'Conseil'],
            isVerified: Boolean(agt.isVerified),
            verificationStatus: (agt.verificationStatus as any) || (agt.isVerified ? 'verified' : 'unverified'),
            subscriptionStatus: 'Active',
            planId: 'agency',
            createdAt: new Date().toISOString(),
          };
          map.set(generatedAgency.id, generatedAgency);
          map.set(key, generatedAgency);
        } else {
          if (agt.phone && !existing.phone) existing.phone = agt.phone;
          if (agt.whatsapp && !existing.whatsapp) existing.whatsapp = agt.whatsapp;
          if (agt.email && !existing.email) existing.email = agt.email;
        }
      }
    });

    const uniqueAgencies: Agency[] = [];
    const seenAgencyIds = new Set<string>();
    for (const ag of map.values()) {
      if (!seenAgencyIds.has(ag.id)) {
        seenAgencyIds.add(ag.id);
        const realCount = combinedAgentsList.filter(
          (a) => a.agencyId === ag.id || (a.agencyName && a.agencyName.toLowerCase().trim() === ag.name.toLowerCase().trim())
        ).length;
        uniqueAgencies.push({
          ...ag,
          agentsCount: Math.max(ag.agentsCount || 0, realCount || 1),
        });
      }
    }
    return uniqueAgencies;
  }, [agencies, allUsers, combinedAgentsList]);

  const filteredAgencies = combinedAgenciesList.filter((agency) => {
    // Regular users do not see hidden agencies
    if (!isAdmin && agency.isHidden) return false;
    if (verificationFilter === 'hidden_only' && !agency.isHidden) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        agency.name.toLowerCase().includes(q) ||
        agency.city.toLowerCase().includes(q) ||
        agency.address.toLowerCase().includes(q) ||
        agency.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sortedAgencies = [...filteredAgencies].sort(
    (a, b) => getAgencyListingsCount(b) - getAgencyListingsCount(a)
  );

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setMessageSent(true);
    setTimeout(() => {
      setMessageSent(false);
      setContactAgentModal(null);
    }, 2500);
  };

  return (
    <div className="space-y-8">
      {/* Directory Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl relative overflow-hidden">
        <div className="max-w-2xl space-y-3 relative z-10">
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            Annuaire PRO Agents & Agences Kinshasa
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Des Experts Immobiliers & Foncier à votre Service
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Consultez les profils des agents immobiliers de Kinshasa certifiés par la direction Immocraft (CNI, RCCM, NIF et audit de bureau).
          </p>

          {/* Search Bar & Verification Guarantee Banner */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom d'agent, commune ou spécialité..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onReturnHome && (
                <button
                  onClick={onReturnHome}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Retourner à la page d'accueil"
                >
                  <Home className="w-4 h-4 text-emerald-400" />
                  <span>Accueil</span>
                </button>
              )}

              <button
                onClick={() => setShowAgencyRegistrationModal(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Building2 className="w-4 h-4 text-slate-950" />
                <span>Inscrire une Agence (1 Mois Offert)</span>
              </button>

              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                title="Inviter un agent ou une agence à s'inscrire sur Immocraft"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Inviter un Partenaire</span>
              </button>

              <button
                onClick={() => setShowGeneralVerificationInfo(true)}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all flex items-center gap-2 group cursor-pointer shrink-0"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Garantie « Vérifié »</span>
                <Info className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Call to Action: Submit ID for Verification */}
      {user && (user.role === 'agent' || user.role === 'owner') && (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">Vous êtes agent immobilier ou propriétaire ?</h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black">
                  Badge Officiel
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 max-w-xl">
                Faites vérifier votre identité (<strong>Passeport Biométrique RDC</strong> ou <strong>Carte d'Électeur CENI</strong> / RCCM) pour afficher le badge <strong>« Agent Vérifié »</strong> sur l'annuaire et booster vos demandes clients.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowSubmitVerificationModal(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>Faire Vérifier mon Compte</span>
          </button>
        </div>
      )}

      {/* Tabs Switcher & Verification Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 gap-4">
        <div className="flex gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('agents')}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === 'agents'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Agents Immobiliers ({sortedAgents.length})
          </button>
          <button
            onClick={() => setActiveTab('agencies')}
            className={`py-3 px-4 border-b-2 transition-all ${
              activeTab === 'agencies'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Agences Partenaires ({sortedAgencies.length})
          </button>
        </div>

        {/* Verification Filter Chips (for agents tab) */}
        {activeTab === 'agents' && (
          <div className="flex items-center gap-1.5 pb-2 sm:pb-0 text-xs font-bold flex-wrap">
            <button
              onClick={() => setVerificationFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                verificationFilter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setVerificationFilter('verified_only')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                verificationFilter === 'verified_only'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Agents Vérifiés ({verifiedAgentsCount})</span>
            </button>
            <button
              onClick={() => setVerificationFilter('pending_only')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                verificationFilter === 'pending_only'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>En Attente</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => setVerificationFilter(verificationFilter === 'hidden_only' ? 'all' : 'hidden_only')}
                className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  verificationFilter === 'hidden_only'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-rose-300'
                }`}
                title="Afficher uniquement les agents masqués du public"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Masqués ({hiddenAgentsCount})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Agents Cards Grid */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAgents.map((agent) => {
            const agentListings = getAgentListingsCount(agent);
            const isVerified = agent.isVerified === true || agent.verificationStatus === 'verified';
            const isPending = !isVerified && agent.verificationStatus === 'pending';
            const isRejected = agent.verificationStatus === 'rejected';

            return (
              <div
                key={agent.id}
                className={`bg-slate-900 border rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl flex flex-col justify-between space-y-4 relative ${
                  isVerified
                    ? 'border-slate-800 hover:border-emerald-500/50'
                    : isPending
                    ? 'border-amber-500/30'
                    : 'border-slate-800/80'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Profile */}
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className={`w-16 h-16 rounded-2xl object-cover ring-2 ${
                          isVerified
                            ? 'ring-emerald-500/60'
                            : isPending
                            ? 'ring-amber-500/50'
                            : 'ring-slate-700'
                        }`}
                      />
                      {/* Avatar Shield Badge: Display ONLY if verified */}
                      {isVerified ? (
                        <span
                          className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-full border border-emerald-500 text-emerald-400 shadow-md"
                          title="Agent Vérifié Immocraft"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-400" />
                        </span>
                      ) : isPending ? (
                        <span
                          className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-full border border-amber-500 text-amber-400 shadow-md"
                          title="Dossier de vérification en cours d'audit"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{agent.rating}</span>
                        <span className="text-slate-500 font-normal">({agent.reviewCount} avis)</span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-base truncate">{agent.name}</h3>

                        {agent.isHidden && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase">
                            <EyeOff className="w-3 h-3" /> Masqué du Public
                          </span>
                        )}

                        {/* Verified Badge: Rendered ONLY if isVerified is true */}
                        {isVerified ? (
                          <div className="relative group inline-block">
                            <button
                              type="button"
                              onClick={() => setVerificationModalAgent(agent)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-black hover:bg-emerald-500/25 transition-all cursor-pointer shadow-sm"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Agent Vérifié</span>
                            </button>

                            {/* Desktop Hover Tooltip */}
                            <div className="absolute left-0 bottom-full mb-2 w-72 bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-slate-200 text-xs shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-30 pointer-events-none group-hover:pointer-events-auto">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                  <BadgeCheck className="w-4 h-4 text-emerald-400" />
                                  <span>Agent Vérifié & Conforme</span>
                                </div>
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                  Validé RDC
                                </span>
                              </div>
                              <ul className="space-y-1.5 text-[11px] text-slate-300">
                                <li className="flex items-start gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span><strong>Pièce d'Identité :</strong> {agent.identityDocType === 'passport' ? 'Passeport' : 'CNI'} vérifié(e)</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span><strong>RCCM / NIF :</strong> {agent.rccmOrNif || 'Enregistré'}</span>
                                </li>
                                <li className="flex items-start gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                  <span><strong>Audit :</strong> Bureau & Titres fonciers audités</span>
                                </li>
                              </ul>
                              <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-emerald-400 font-semibold flex items-center justify-between">
                                <span>Contrôle Direction Immocraft</span>
                                <span className="underline">Détails de l'audit &rarr;</span>
                              </div>
                            </div>
                          </div>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                            <Clock className="w-3 h-3" />
                            <span>Vérification en cours</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold">
                            <span>Dossier Incomplet</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-semibold">
                            Non vérifié
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-emerald-400 font-medium">{agent.title}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {agent.agencyName || 'Indépendant Kinshasa'}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60">
                    "{agent.bio}"
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-1.5">
                    {agent.specialties.map((s) => (
                      <span
                        key={s}
                        className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Stats & Contact */}
                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">
                    <strong className="text-white font-bold">{agentListings}</strong> annonces actives
                  </span>

                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => toggleAgentVisibility(agent.id)}
                        className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
                          agent.isHidden
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                        }`}
                        title={agent.isHidden ? "Rendre cet agent visible au public" : "Masquer cet agent du public"}
                      >
                        {agent.isHidden ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                            <span className="hidden sm:inline">Masqué</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                            <span className="hidden sm:inline">Visible</span>
                          </>
                        )}
                      </button>
                    )}

                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          requestConfirm({
                            title: "Suppression de l'agent",
                            message: `Voulez-vous vraiment supprimer définitivement l'agent "${agent.name}" ?`,
                            onConfirm: () => deleteAgent(agent.id)
                          });
                        }}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                        title="Supprimer cet agent"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => setContactAgentModal(agent)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-transform hover:scale-105 flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Contacter
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Agencies Tab */}
      {activeTab === 'agencies' && (
        <div className="space-y-6">
          {/* Agency Onboarding Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/30 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="p-3.5 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-400 shrink-0">
                <Building2 className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-white text-base sm:text-lg">Vous dirigez une Agence ou un Cabinet Immobilier à Kinshasa ?</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                    1er Mois Offert
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Inscrivez votre cabinet (SARL/SAS/Ets), certifiez vos courtiers avec leurs documents officiels (RCCM & Passeport / Carte d'Électeur CENI) et recevez des leads qualifiés à Gombe, Ngaliema, Limete et partout en RDC.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAgencyRegistrationModal(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 shrink-0"
            >
              <Building2 className="w-4 h-4 text-slate-950" />
              <span>Inscrire mon Agence Immobilière</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedAgencies.map((agency) => {
              const agencyListingsCount = getAgencyListingsCount(agency);

              return (
                <div
                  key={agency.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row gap-6 items-start relative group hover:border-slate-700 transition-all shadow-lg"
                >
                  <img
                    src={agency.logo}
                    alt={agency.name}
                    className="w-24 h-24 rounded-2xl object-cover ring-1 ring-slate-700 shrink-0"
                  />
                  <div className="space-y-2 text-xs flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-base">{agency.name}</h3>
                        {agency.isHidden && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black uppercase flex items-center gap-1">
                            <EyeOff className="w-3 h-3" /> Masquée du Public
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          Partenaire Certifié
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => toggleAgencyVisibility(agency.id)}
                            className={`p-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                              agency.isHidden
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                            }`}
                            title={agency.isHidden ? "Rendre cette agence visible au public" : "Masquer cette agence du public"}
                          >
                            {agency.isHidden ? <EyeOff className="w-3.5 h-3.5 text-rose-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                            <span className="text-[11px] hidden sm:inline">{agency.isHidden ? "Masquée" : "Visible"}</span>
                          </button>
                        )}

                        {user?.role === 'admin' && (
                          <button
                            onClick={() => {
                              requestConfirm({
                                title: "Suppression de l'agence / concessionnaire",
                                message: `Voulez-vous vraiment supprimer définitivement l'agence / concessionnaire "${agency.name}" ?`,
                                onConfirm: () => deleteAgency(agency.id)
                              });
                            }}
                            className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                            title="Supprimer cette agence / concessionnaire"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-400">{agency.address}, {agency.city}</p>
                    {agency.rccm && (
                      <p className="text-[11px] font-mono text-emerald-400">RCCM: {agency.rccm}</p>
                    )}
                    <p className="text-slate-300 leading-relaxed">{agency.description}</p>
                    <div className="pt-2 text-slate-400 flex flex-wrap items-center gap-3">
                      <a href={`tel:${agency.phone}`} className="text-emerald-400 hover:underline">📞 {agency.phone}</a>
                      {agency.whatsapp && (
                        <a
                          href={`https://wa.me/${agency.whatsapp.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline"
                        >
                          💬 WhatsApp
                        </a>
                      )}
                      <span>👥 {agency.agentsCount} agents</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-semibold border border-slate-700">
                        🏡 <strong className="text-white">{agencyListingsCount}</strong> annonces
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contact Agent Modal */}
      {contactAgentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-slate-100 space-y-4">
            <button
              onClick={() => setContactAgentModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              ✕
            </button>

            <div className="flex items-center gap-3">
              <img
                src={contactAgentModal.avatar}
                alt={contactAgentModal.name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40"
              />
              <div>
                <h4 className="font-bold text-white">{contactAgentModal.name}</h4>
                <p className="text-xs text-emerald-400 font-medium">{contactAgentModal.title}</p>
                <p className="text-[11px] text-slate-400">{contactAgentModal.phone}</p>
              </div>
            </div>

            {/* Quick WhatsApp & Call Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/${(contactAgentModal.whatsapp || contactAgentModal.phone || '+243810000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${contactAgentModal.name}, je vous contacte depuis Kin Immobilier pour une recherche de propriété.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
                <span>WhatsApp Direct</span>
              </a>

              <a
                href={`tel:${contactAgentModal.phone}`}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>Appeler ({contactAgentModal.phone})</span>
              </a>
            </div>

            {messageSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-center font-bold text-xs">
                ✓ Message transmis directement à {contactAgentModal.name} !
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Votre nom complet"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="email"
                  required
                  placeholder="Votre e-mail"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <textarea
                  rows={4}
                  required
                  placeholder="Bonjour, je cherche une propriété à acheter/louer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:scale-[1.02] transition-transform"
                >
                  Envoyer le Message Direct
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bottom Return to Home Bar */}
      {onReturnHome && (
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={onReturnHome}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>← Retourner à la liste de toutes les annonces (Accueil)</span>
          </button>
          <span className="text-xs text-slate-400">
            Annuaire officiel des professionnels immobiliers certifiés à Kinshasa
          </span>
        </div>
      )}

      {/* Verification Details Modal (Agent specific or General) */}
      {(verificationModalAgent || showGeneralVerificationInfo) && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 sm:p-7 relative shadow-2xl text-slate-100 space-y-6 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setVerificationModalAgent(null);
                setShowGeneralVerificationInfo(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Badge & Title */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  <BadgeCheck className="w-3 h-3" /> Certification Officielle
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Processus de Vérification Immocraft
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Notre protocole strict de contrôle pour garantir la sécurité et la transparence de vos transactions immobilières en RDC.
                </p>
              </div>
            </div>

            {/* Agent Context (if clicking specific agent) */}
            {verificationModalAgent && (
              <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={verificationModalAgent.avatar}
                    alt={verificationModalAgent.name}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40"
                  />
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                      {verificationModalAgent.name}
                      <ShieldCheck className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                    </h4>
                    <p className="text-xs text-emerald-400 font-medium">{verificationModalAgent.title}</p>
                    <p className="text-[11px] text-slate-400">{verificationModalAgent.agencyName}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                  Agréé & Validé
                </span>
              </div>
            )}

            {/* 4 Pillars of Verification */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" /> Les 4 Étapes de Contrôle Qualité
              </h4>

              <div className="grid grid-cols-1 gap-2.5 text-xs">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">1. Audit d'Identité Biométrique (Passeport ou Carte d'Électeur)</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Vérification manuelle des pièces d'identité officielles de la RD Congo (<strong>Passeport Biométrique</strong> ou <strong>Carte d'Électeur CENI</strong>) du gestionnaire ou de l'agent.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">2. Immatriculation Légal RDC (RCCM & NIF)</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Contrôle du Registre du Commerce et du Crédit Mobilier ainsi que du Numéro d'Identification Fiscale de l'agence.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">3. Audit du Bureau Physique & Téléphones</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Validation de la localisation physique de l'agence à Kinshasa et vérification des lignes d'appel directes et WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 text-emerald-400 border border-slate-800 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-xs">4. Signature de la Charte Anti-Fraude Immocraft</h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                      Engagement légal sur la transparence des frais de commission, l'exclusivité des mandats et l'interdiction des surcoûts cachés.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom guarantee footer */}
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                <strong>Sérénité Garantie :</strong> Toutes les annonces publiées par nos agents certifiés bénéficient du contrôle préalable des titres de propriété.
              </p>
            </div>

            <div className="pt-2 flex gap-3 justify-end">
              {verificationModalAgent && (
                <button
                  onClick={() => {
                    const target = verificationModalAgent;
                    setVerificationModalAgent(null);
                    setContactAgentModal(target);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <MessageSquare className="w-4 h-4" /> Contacter cet Agent
                </button>
              )}
              <button
                onClick={() => {
                  setVerificationModalAgent(null);
                  setShowGeneralVerificationInfo(false);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Agent Verification Submission Modal */}
      <AgentVerificationSubmitModal
        isOpen={showSubmitVerificationModal}
        onClose={() => setShowSubmitVerificationModal(false)}
      />

      {/* Agency Registration Modal */}
      <AgencyRegistrationModal
        isOpen={showAgencyRegistrationModal}
        onClose={() => setShowAgencyRegistrationModal(false)}
      />
    </div>
  );
};
