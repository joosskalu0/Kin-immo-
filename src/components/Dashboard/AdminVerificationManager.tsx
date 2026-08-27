import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Agent, VerificationDocument, VerificationStatus } from '../../types';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Search,
  Filter,
  Award,
  AlertTriangle,
  UserCheck,
  Building2,
  Phone,
  Mail,
  ExternalLink,
  RotateCcw,
  Check,
  X,
  Plus,
  FileCheck,
  Lock,
  ChevronRight,
  Download,
  Calendar,
  Sparkles,
} from 'lucide-react';

export const AdminVerificationManager: React.FC = () => {
  const {
    agents,
    allUsers,
    updateAgentVerification,
    updateAgentVerificationDocument,
    submitAgentVerificationDocuments,
    user,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'unverified'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentForInspection, setSelectedAgentForInspection] = useState<Agent | null>(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<{ doc: VerificationDocument; agent: Agent } | null>(null);

  // Rejection modal state
  const [rejectModalAgent, setRejectModalAgent] = useState<Agent | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Document d\'identité illisible ou expiré. Veuillez fournir une copie haute définition en cours de validité.');

  // Manual doc upload modal state
  const [showAddDocModal, setShowAddDocModal] = useState<Agent | null>(null);
  const [newDocType, setNewDocType] = useState<VerificationDocument['type']>('passport');
  const [newDocTitle, setNewDocTitle] = useState('Passeport Biométrique Ordinaire RD Congo');
  const [newDocNumber, setNewDocNumber] = useState('');
  const [newDocRccm, setNewDocRccm] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80');

  // Success toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Combine agents with any registered agent users (excluding administrators)
  const allAgentsList = React.useMemo(() => {
    const map = new Map<string, Agent>();

    const isAdministrator = (email?: string, name?: string, role?: string, id?: string) => {
      const emailLower = (email || '').toLowerCase();
      const nameLower = (name || '').toLowerCase();
      const roleLower = (role || '').toLowerCase();
      const idLower = (id || '').toLowerCase();
      return (
        roleLower === 'admin' ||
        emailLower === 'joosskalu72@gmail.com' ||
        emailLower === 'admin@immocraft.cd' ||
        emailLower === 'admin@estatik.com' ||
        idLower === 'usr_admin_001' ||
        idLower === 'user_admin' ||
        idLower === 'admin' ||
        nameLower.includes('administrateur') ||
        nameLower === 'admin' ||
        nameLower === 'admin immocraft'
      );
    };

    // Add agents from state (excluding any admin)
    agents.forEach((a) => {
      if (isAdministrator(a.email, a.name, (a as any).role, a.id)) {
        return;
      }
      map.set(a.id, a);
      if (a.email) map.set(a.email.toLowerCase(), a);
    });

    // Add users from allUsers if they act as agent (strictly exclude admin)
    (allUsers || []).forEach((u) => {
      if (isAdministrator(u.email, u.name, u.role, u.id) || (u as any).isAdmin) {
        return;
      }
      const isAgentOrOwner = u.role === 'agent' || u.role === 'owner' || !!u.agentId;
      if (isAgentOrOwner) {
        const id = u.agentId || u.id;
        const emailKey = u.email ? u.email.toLowerCase() : '';
        const existing = map.get(id) || (emailKey ? map.get(emailKey) : undefined);

        if (!existing) {
          const newAgentObj: Agent = {
            id,
            name: u.name || 'Agent Sans Nom',
            title: u.role === 'owner' ? 'Propriétaire Vendeur' : 'Agent Immobilier',
            email: u.email || '',
            phone: u.phone || '+243 81 000 0000',
            whatsapp: u.whatsapp || u.phone || '+243 81 000 0000',
            avatar: u.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
            agencyName: u.agencyName || 'Indépendant Kinshasa',
            rating: 5.0,
            reviewCount: 0,
            listingsCount: 0,
            bio: 'Agent immobilier partenaire Immocraft RDC.',
            specialties: ['Résidentiel', 'Commercial'],
            languages: ['Français', 'Lingala'],
            isVerified: u.isVerified || false,
            verificationStatus: (u.verificationStatus as VerificationStatus) || (u.isVerified ? 'verified' : 'unverified'),
            verificationDocuments: u.verificationDocuments || [],
            rccmOrNif: u.rccmOrNif,
            identityDocType: (u.identityDocType as any) || 'cni',
            identityDocNumber: u.identityDocNumber,
          };
          map.set(id, newAgentObj);
          if (emailKey) map.set(emailKey, newAgentObj);
        }
      }
    });

    const unique: Agent[] = [];
    const seen = new Set<string>();
    for (const a of map.values()) {
      if (!isAdministrator(a.email, a.name, (a as any).role, a.id) && !seen.has(a.id)) {
        seen.add(a.id);
        unique.push(a);
      }
    }
    return unique;
  }, [agents, allUsers]);

  // Statistics calculation
  const totalAgents = allAgentsList.length;
  const verifiedCount = allAgentsList.filter((a) => a.isVerified || a.verificationStatus === 'verified').length;
  const pendingCount = allAgentsList.filter((a) => !a.isVerified && a.verificationStatus === 'pending').length;
  const rejectedCount = allAgentsList.filter((a) => a.verificationStatus === 'rejected').length;
  const unverifiedCount = allAgentsList.filter((a) => (!a.verificationStatus || a.verificationStatus === 'unverified') && !a.isVerified).length;

  // Filter list
  const filteredAgents = allAgentsList.filter((agent) => {
    const isVer = agent.isVerified || agent.verificationStatus === 'verified';
    const status: VerificationStatus = isVer ? 'verified' : agent.verificationStatus || 'unverified';

    if (statusFilter !== 'all') {
      if (statusFilter === 'verified' && !isVer) return false;
      if (statusFilter === 'pending' && status !== 'pending') return false;
      if (statusFilter === 'rejected' && status !== 'rejected') return false;
      if (statusFilter === 'unverified' && (isVer || status !== 'unverified')) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = agent.name.toLowerCase().includes(q);
      const matchEmail = agent.email.toLowerCase().includes(q);
      const matchPhone = agent.phone.toLowerCase().includes(q);
      const matchAgency = agent.agencyName?.toLowerCase().includes(q);
      const matchDocNum = agent.identityDocNumber?.toLowerCase().includes(q);
      const matchRccm = agent.rccmOrNif?.toLowerCase().includes(q);
      return matchName || matchEmail || matchPhone || matchAgency || matchDocNum || matchRccm;
    }

    return true;
  });

  // Action handlers
  const handleApproveAgent = (agent: Agent) => {
    updateAgentVerification(
      agent.id,
      true,
      'verified',
      undefined,
      `Direction Immocraft RDC (${user?.name || 'Administrateur'})`
    );
    showToast(`✅ Le badge "Agent Vérifié" a été activé avec succès pour ${agent.name}.`);
    if (selectedAgentForInspection?.id === agent.id) {
      setSelectedAgentForInspection((prev) => (prev ? { ...prev, isVerified: true, verificationStatus: 'verified' } : null));
    }
  };

  const handleOpenRejectModal = (agent: Agent) => {
    setRejectModalAgent(agent);
    setRejectionReason(
      agent.rejectionReason ||
      'Document d\'identité non conforme ou illisible. Veuillez soumettre une pièce d\'identité officielle en cours de validité (CNI ou Passeport) ainsi que votre attestation RCCM/NIF.'
    );
  };

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalAgent) return;

    updateAgentVerification(
      rejectModalAgent.id,
      false,
      'rejected',
      rejectionReason,
      `Direction Immocraft RDC (${user?.name || 'Administrateur'})`
    );
    showToast(`❌ La demande de vérification pour ${rejectModalAgent.name} a été rejetée avec motif transmis.`);
    if (selectedAgentForInspection?.id === rejectModalAgent.id) {
      setSelectedAgentForInspection((prev) => (prev ? { ...prev, isVerified: false, verificationStatus: 'rejected', rejectionReason } : null));
    }
    setRejectModalAgent(null);
  };

  const handleRevokeBadge = (agent: Agent) => {
    if (window.confirm(`Êtes-vous sûr de vouloir révoquer le badge "Agent Vérifié" de ${agent.name} ? L'agent ne portera plus le badge public.`)) {
      updateAgentVerification(
        agent.id,
        false,
        'unverified',
        'Badge révoqué manuellement par l\'administration.',
        `Direction Immocraft RDC (${user?.name || 'Administrateur'})`
      );
      showToast(`⚠️ Badge "Agent Vérifié" révoqué pour ${agent.name}.`);
      if (selectedAgentForInspection?.id === agent.id) {
        setSelectedAgentForInspection((prev) => (prev ? { ...prev, isVerified: false, verificationStatus: 'unverified' } : null));
      }
    }
  };

  const handleApproveDoc = (agentId: string, docId: string) => {
    updateAgentVerificationDocument(agentId, docId, 'approved');
    showToast('Document individuel validé.');
  };

  const handleRejectDoc = (agentId: string, docId: string) => {
    const reason = prompt('Motif du rejet de ce document :', 'Document flou ou expiré.');
    if (reason) {
      updateAgentVerificationDocument(agentId, docId, 'rejected', reason);
      showToast('Document individuel refusé.');
    }
  };

  const handleSaveManualDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddDocModal) return;

    const newDoc: VerificationDocument = {
      id: `doc_${Date.now()}`,
      type: newDocType,
      title: newDocTitle || 'Document d\'identité officiel',
      documentNumber: newDocNumber || 'CD-KIN-VAL-2026',
      fileName: `${newDocType}_justificatif_officiel.pdf`,
      fileSize: '2.5 MB',
      fileUrl: newDocUrl,
      uploadedAt: new Date().toISOString(),
      status: 'pending',
    };

    submitAgentVerificationDocuments(
      showAddDocModal.id,
      [newDoc],
      newDocType,
      newDocNumber || showAddDocModal.identityDocNumber,
      newDocRccm || showAddDocModal.rccmOrNif
    );

    showToast(`Nouveau document ajouté au dossier de ${showAddDocModal.name}.`);
    setShowAddDocModal(null);
    setNewDocNumber('');
    setNewDocRccm('');
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-3 animate-fadeIn">
          <ShieldCheck className="w-5 h-5 text-slate-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Console d'Administration Immocraft</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Validation Manuelle des Badges « Agent Vérifié »
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Examinez les pièces d'identité (CNI, Passeport), les numéros RCCM & NIF fiscal des agents immobiliers de Kinshasa pour activer ou révoquer le badge officiel de conformité.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-2xl font-mono font-black text-amber-400">{pendingCount}</span>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">En Attente</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-2xl font-mono font-black text-emerald-400">{verifiedCount}</span>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">Vérifiés</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-slate-800 border-emerald-500 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Agents</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{totalAgents}</div>
          <span className="text-[10px] text-slate-500 font-medium">Dans l'annuaire public</span>
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
            statusFilter === 'pending'
              ? 'bg-amber-500/10 border-amber-500 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          {pendingCount > 0 && (
            <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">Dossiers en Attente</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-amber-400/80 font-medium">Validation requise</span>
        </button>

        <button
          onClick={() => setStatusFilter('verified')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'verified'
              ? 'bg-emerald-500/10 border-emerald-500 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">Badges Actifs</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{verifiedCount}</div>
          <span className="text-[10px] text-emerald-500/80 font-medium">Affichés avec badge public</span>
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === 'rejected'
              ? 'bg-rose-500/10 border-rose-500 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400">Rejetés / Incomplets</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-1">{rejectedCount}</div>
          <span className="text-[10px] text-rose-400/80 font-medium">{unverifiedCount} non vérifiés</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom d'agent, email, agence, n° CNI ou RCCM..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto text-xs font-bold">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl transition-all ${
              statusFilter === 'all' ? 'bg-slate-800 text-white border border-slate-700' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous ({totalAgents})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>À valider ({pendingCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('verified')}
            className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              statusFilter === 'verified'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Vérifiés ({verifiedCount})</span>
          </button>
          <button
            onClick={() => setStatusFilter('rejected')}
            className={`px-3 py-2 rounded-xl transition-all ${
              statusFilter === 'rejected'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'text-slate-400 hover:text-rose-400'
            }`}
          >
            Rejetés ({rejectedCount})
          </button>
          <button
            onClick={() => setStatusFilter('unverified')}
            className={`px-3 py-2 rounded-xl transition-all ${
              statusFilter === 'unverified'
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Non vérifiés ({unverifiedCount})
          </button>
        </div>
      </div>

      {/* Agent Dossiers List */}
      <div className="space-y-4">
        {filteredAgents.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Aucun agent ne correspond aux critères</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Essayez de modifier votre terme de recherche ou le filtre de statut sélectionné.
            </p>
          </div>
        ) : (
          filteredAgents.map((agent) => {
            const isVerified = agent.isVerified || agent.verificationStatus === 'verified';
            const status: VerificationStatus = isVerified ? 'verified' : agent.verificationStatus || 'unverified';
            const docs = agent.verificationDocuments || [];
            const isExpanded = selectedAgentForInspection?.id === agent.id;

            return (
              <div
                key={agent.id}
                className={`bg-slate-900 border rounded-3xl transition-all overflow-hidden ${
                  status === 'pending'
                    ? 'border-amber-500/40 ring-1 ring-amber-500/20 bg-gradient-to-b from-amber-500/5 to-slate-900'
                    : isVerified
                    ? 'border-emerald-500/30'
                    : status === 'rejected'
                    ? 'border-rose-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Agent Summary Card Header */}
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4 flex-1">
                    <div className="relative shrink-0">
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-14 h-14 rounded-2xl object-cover ring-2 ring-slate-700"
                      />
                      {isVerified ? (
                        <span className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-full border border-emerald-500 text-emerald-400 shadow-md" title="Badge Vérifié Actif">
                          <ShieldCheck className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-400" />
                        </span>
                      ) : status === 'pending' ? (
                        <span className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-full border border-amber-500 text-amber-400 shadow-md" title="En Attente de Validation">
                          <Clock className="w-3.5 h-3.5" />
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-base font-bold text-white">{agent.name}</h4>

                        {/* Status Badges */}
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-black">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Badge « Agent Vérifié » Actif</span>
                          </span>
                        )}

                        {status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-black animate-pulse">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Dossier en Attente d'Audit Manuel</span>
                          </span>
                        )}

                        {status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[11px] font-bold">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Dossier Refusé / Non Conforme</span>
                          </span>
                        )}

                        {status === 'unverified' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-semibold">
                            Non vérifié
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="text-emerald-400 font-medium">{agent.title}</span>
                        {agent.agencyName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {agent.agencyName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          {agent.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          {agent.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Inspection Button */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <button
                      onClick={() => setSelectedAgentForInspection(isExpanded ? null : agent)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isExpanded
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>{isExpanded ? 'Masquer le dossier' : `Examiner pièces (${docs.length})`}</span>
                    </button>

                    {/* Approve button */}
                    {!isVerified ? (
                      <button
                        onClick={() => handleApproveAgent(agent)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs transition-transform hover:scale-105 flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
                      >
                        <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                        <span>Valider & Activer le Badge</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRevokeBadge(agent)}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Révoquer Badge</span>
                      </button>
                    )}

                    {/* Reject button */}
                    {status === 'pending' && (
                      <button
                        onClick={() => handleOpenRejectModal(agent)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <X className="w-4 h-4" />
                        <span>Refuser</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Dossier Inspector Desk */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-slate-950/80 border-t border-slate-800 space-y-6">
                    {/* Rejection notice if previously rejected */}
                    {status === 'rejected' && agent.rejectionReason && (
                      <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold text-rose-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Motif du refus enregistré :</span>
                        </div>
                        <p className="leading-relaxed pl-6">{agent.rejectionReason}</p>
                      </div>
                    )}

                    {/* Verification info bar if already verified */}
                    {isVerified && (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            Dossier validé et certifié conforme le{' '}
                            <strong>{agent.verifiedAt ? new Date(agent.verifiedAt).toLocaleDateString('fr-FR') : 'Récemment'}</strong>{' '}
                            par <em>{agent.verifiedBy || 'Direction Immocraft'}</em>.
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase">
                          Badge Actif
                        </span>
                      </div>
                    )}

                    {/* Legal & Identification Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Type de Pièce Soumise
                        </span>
                        <p className="text-white font-mono font-bold capitalize">
                          {agent.identityDocType === 'passport'
                            ? '🛂 Passeport Biométrique RDC'
                            : agent.identityDocType === 'voter_card' || agent.identityDocType === 'carte_electeur'
                            ? '🗳️ Carte d\'Électeur CENI RDC'
                            : agent.identityDocType === 'rccm'
                            ? '📜 RCCM / Guichet Unique'
                            : agent.identityDocType === 'professional_card'
                            ? '💼 Carte Professionnelle'
                            : '🪪 Carte d\'Identité (CNI/ONIP)'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          N° de Pièce d'Identité
                        </span>
                        <p className="text-emerald-400 font-mono font-bold">
                          {agent.identityDocNumber || 'Non renseigné'}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                          Numéro RCCM / NIF Fiscal
                        </span>
                        <p className="text-white font-mono font-bold">
                          {agent.rccmOrNif || 'CD/KIN/RCCM/20-B-04921'}
                        </p>
                      </div>
                    </div>

                    {/* Documents List & Visual Inspection */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-400" />
                          <span>Pièces Justificatives Téléversées ({docs.length})</span>
                        </h5>

                        <button
                          onClick={() => setShowAddDocModal(agent)}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter un document</span>
                        </button>
                      </div>

                      {docs.length === 0 ? (
                        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-2">
                          <p className="text-xs text-slate-400">Aucun document n'a encore été joint par cet agent.</p>
                          <button
                            onClick={() => setShowAddDocModal(agent)}
                            className="px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/20"
                          >
                            + Joindre une pièce d'identité manuellement
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {docs.map((doc) => (
                            <div
                              key={doc.id}
                              className={`p-4 rounded-2xl bg-slate-900 border space-y-3 flex flex-col justify-between ${
                                doc.status === 'approved'
                                  ? 'border-emerald-500/40'
                                  : doc.status === 'rejected'
                                  ? 'border-rose-500/40'
                                  : 'border-slate-800'
                              }`}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${
                                    doc.type === 'passport'
                                      ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                                      : doc.type === 'voter_card'
                                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                      : doc.type === 'cni'
                                      ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                      : doc.type === 'rccm'
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}>
                                    {doc.type === 'passport'
                                      ? '🛂 Passeport'
                                      : doc.type === 'voter_card'
                                      ? '🗳️ Carte Électeur'
                                      : doc.type === 'cni'
                                      ? '🪪 CNI'
                                      : doc.type === 'rccm'
                                      ? '📜 RCCM'
                                      : doc.type}
                                  </span>

                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    doc.status === 'approved'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : doc.status === 'rejected'
                                      ? 'bg-rose-500/20 text-rose-400'
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}>
                                    {doc.status === 'approved' ? 'Validé' : doc.status === 'rejected' ? 'Rejeté' : 'En attente'}
                                  </span>
                                </div>

                                <h6 className="font-bold text-white text-xs line-clamp-1">{doc.title}</h6>
                                <p className="text-[11px] font-mono text-slate-400">N°: {doc.documentNumber}</p>
                                <p className="text-[10px] text-slate-500">{doc.fileName} • {doc.fileSize || '2.1 MB'}</p>

                                {/* Document Image Thumbnail */}
                                <div
                                  onClick={() => setSelectedDocForPreview({ doc, agent })}
                                  className="h-32 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative group cursor-pointer"
                                >
                                  <img
                                    src={doc.fileUrl}
                                    alt={doc.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Eye className="w-5 h-5 text-white" />
                                    <span className="text-xs font-bold text-white">Agrandir / Inspecter</span>
                                  </div>
                                </div>
                              </div>

                              {/* Per-Doc Actions */}
                              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedDocForPreview({ doc, agent })}
                                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Voir</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveDoc(agent.id, doc.id)}
                                    className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30"
                                    title="Valider cette pièce"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRejectDoc(agent.id, doc.id)}
                                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30"
                                    title="Refuser cette pièce"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Master Action Bar */}
                    <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-[11px] text-slate-400">
                        La validation de l'agent active immédiatement l'affichage du badge <strong>« Agent Vérifié »</strong> sur la carte AJAX, l'annuaire et toutes ses annonces.
                      </p>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {!isVerified && (
                          <button
                            onClick={() => handleOpenRejectModal(agent)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-rose-300 border border-slate-700 text-xs font-bold"
                          >
                            Refuser la demande
                          </button>
                        )}
                        <button
                          onClick={() => handleApproveAgent(agent)}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-slate-950" />
                          <span>{isVerified ? 'Mettre à jour la Certification' : 'Valider & Activer le Badge'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Document Inspector Zoom Modal */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedDocForPreview(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">{selectedDocForPreview.doc.title}</h4>
                <p className="text-xs text-slate-400">
                  Agent: <strong>{selectedDocForPreview.agent.name}</strong> • Document N° {selectedDocForPreview.doc.documentNumber}
                </p>
              </div>
            </div>

            {/* High-res Image Preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <img
                src={selectedDocForPreview.doc.fileUrl}
                alt={selectedDocForPreview.doc.title}
                className="w-full h-auto max-h-96 object-contain mx-auto"
              />
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Date de téléversement :</span>
                <p className="text-white">{new Date(selectedDocForPreview.doc.uploadedAt).toLocaleString('fr-FR')}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Statut actuel :</span>
                <p className={`font-bold capitalize ${
                  selectedDocForPreview.doc.status === 'approved' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {selectedDocForPreview.doc.status === 'approved' ? 'Approuvé' : 'En attente d\'audit'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  handleApproveDoc(selectedDocForPreview.agent.id, selectedDocForPreview.doc.id);
                  setSelectedDocForPreview(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-slate-950" />
                <span>Valider ce document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rejection Reason Modal */}
      {rejectModalAgent && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-left space-y-4">
            <button
              onClick={() => setRejectModalAgent(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Refuser la Vérification</h4>
                <p className="text-xs text-slate-400">Agent : {rejectModalAgent.name}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">
                  Motif du rejet (transmis à l'agent)
                </label>
                <textarea
                  rows={4}
                  required
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Expliquez pourquoi le dossier est incomplet ou non valide..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 text-xs"
                />
              </div>

              {/* Preset reasons quick chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Suggestions rapides :</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Pièce d\'identité expirée',
                    'Document illisible / flou',
                    'Numéro RCCM invalide au Guichet Unique',
                    'Nom différent sur le document',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRejectionReason(preset)}
                      className="px-2 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-[10px] text-slate-300 border border-slate-800"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalAgent(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Confirmer le Rejet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manually Add Verification Document */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-left space-y-4">
            <button
              onClick={() => setShowAddDocModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Ajouter un Document d'Identité</h4>
                <p className="text-xs text-slate-400">Pour : {showAddDocModal.name}</p>
              </div>
            </div>

            <form onSubmit={handleSaveManualDoc} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Type de Document</label>
                <select
                  value={newDocType}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setNewDocType(val);
                    if (val === 'passport') setNewDocTitle('Passeport Biométrique Ordinaire RD Congo');
                    if (val === 'voter_card') setNewDocTitle('Carte d\'Électeur Officielle CENI RDC');
                    if (val === 'cni') setNewDocTitle('Carte Nationale d\'Identité (CNI / ONIP RDC)');
                    if (val === 'rccm') setNewDocTitle('Certificat RCCM & NIF Guichet Unique');
                    if (val === 'professional_card') setNewDocTitle('Carte Professionnelle Agent Immobilier');
                    if (val === 'proof_of_address') setNewDocTitle('Justificatif de Domicile / Bail Kinshasa');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="passport">🛂 Passeport Biométrique RD Congo</option>
                  <option value="voter_card">🗳️ Carte d'Électeur (CENI RDC)</option>
                  <option value="cni">🪪 Carte Nationale d'Identité (CNI / ONIP)</option>
                  <option value="rccm">📜 Registre de Commerce RCCM / NIF</option>
                  <option value="professional_card">💼 Carte Professionnelle Agent Immobilier</option>
                  <option value="proof_of_address">🏠 Justificatif de Domicile / Bureau Kinshasa</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Intitulé du Document</label>
                <input
                  type="text"
                  required
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Numéro Officiel de la Pièce</label>
                <input
                  type="text"
                  required
                  value={newDocNumber}
                  onChange={(e) => setNewDocNumber(e.target.value)}
                  placeholder="Ex: CD-KIN-9921-2025-XX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Numéro RCCM / NIF (Optionnel)</label>
                <input
                  type="text"
                  value={newDocRccm}
                  onChange={(e) => setNewDocRccm(e.target.value)}
                  placeholder="Ex: CD/KIN/RCCM/20-B-04921"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">URL Image / Aperçu</label>
                <input
                  type="url"
                  required
                  value={newDocUrl}
                  onChange={(e) => setNewDocUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white text-[11px]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer le Document</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
