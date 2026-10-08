import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Search,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Mail,
  MapPin,
  Calendar,
  User,
  ExternalLink,
  RefreshCw,
  Save,
  CheckSquare,
  Plus,
  Trash2,
  Building2,
  Sparkles,
  X,
  AlertCircle,
  Eye,
  Edit3,
  UserCheck,
  Users,
  FileText,
  ChevronRight,
  DollarSign,
  Filter,
  MoreHorizontal,
  ArrowRight,
  Check
} from 'lucide-react';
import { ConciergeRequest, ConciergeRequestStatus, PropertyVisit, PropertyVisitStatus } from '../../types';
import { findMatchingProperties, PropertyMatchResult } from '../../utils/propertyMatching';
import {
  fetchConciergerieRequests,
  updateConciergeRequestStatus,
  updateConciergeRequestFull,
  fetchPropertyVisits,
  schedulePropertyVisit,
  updatePropertyVisitStatus,
  deletePropertyVisit
} from '../../services/conciergerieApi';
import { useApp } from '../../context/AppContext';

// Libellés et styles des statuts demandés
const CONCIERGE_STATUS_CONFIG: Record<
  ConciergeRequestStatus,
  { label: string; badgeClass: string; selectClass: string }
> = {
  new: {
    label: 'Nouveau',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    selectClass: 'bg-amber-50 text-amber-900 border-amber-300'
  },
  searching: {
    label: 'Recherche en cours',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
    selectClass: 'bg-blue-50 text-blue-900 border-blue-300'
  },
  properties_found: {
    label: 'Biens trouvés',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
    selectClass: 'bg-purple-50 text-purple-900 border-purple-300'
  },
  visit_scheduled: {
    label: 'Visite planifiée',
    badgeClass: 'bg-cyan-100 text-cyan-900 border-cyan-300',
    selectClass: 'bg-cyan-50 text-cyan-900 border-cyan-300'
  },
  negotiation: {
    label: 'Négociation',
    badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
    selectClass: 'bg-indigo-50 text-indigo-900 border-indigo-300'
  },
  completed: {
    label: 'Finalisé / Clôturé',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    selectClass: 'bg-emerald-50 text-emerald-900 border-emerald-300'
  },
  cancelled: {
    label: 'Annulé',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    selectClass: 'bg-slate-50 text-slate-700 border-slate-300'
  }
};

export const AdminConciergerieManager: React.FC = () => {
  const { agents, properties } = useApp();

  // Navigation par sous-onglets : Demandes (Tableau principal) vs Visites programmées
  const [activeTab, setActiveTab] = useState<'requests' | 'visits'>('requests');

  // Données des demandes
  const [requests, setRequests] = useState<ConciergeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ConciergeRequestStatus>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');

  // Données des visites
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);

  // Notification d'action
  const [actionNotification, setActionNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = (type: 'success' | 'error', message: string) => {
    setActionNotification({ type, message });
    setTimeout(() => setActionNotification(null), 4000);
  };

  // Modales d'Actions :
  // 1. Voir
  const [viewingRequest, setViewingRequest] = useState<ConciergeRequest | null>(null);

  // 2. Modifier
  const [editingRequest, setEditingRequest] = useState<ConciergeRequest | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    project_type: 'Acheter',
    property_type: 'Villa',
    commune: 'Gombe',
    quartier: '',
    budget_min: 0,
    budget_max: 0,
    currency: 'USD',
    bedrooms: 0,
    bathrooms: 0,
    notes: ''
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // 3. Attribuer à un agent
  const [assigningRequest, setAssigningRequest] = useState<ConciergeRequest | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');

  // 4. Voir les biens correspondants
  const [matchingModalRequest, setMatchingModalRequest] = useState<ConciergeRequest | null>(null);

  // 5. Programmer une visite
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    request_id: '',
    property_id: '',
    property_title: '',
    agent_id: '',
    visit_date: new Date().toISOString().split('T')[0],
    visit_time: '14:00',
    status: 'scheduled' as PropertyVisitStatus,
    notes: ''
  });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [isSavingVisit, setIsSavingVisit] = useState(false);

  // 6. Modifier le statut
  const [statusChangingRequest, setStatusChangingRequest] = useState<ConciergeRequest | null>(null);

  // 7. Ajouter une note
  const [notingRequest, setNotingRequest] = useState<ConciergeRequest | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Menu déroulant d'actions ouvert par ID
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

  // Chargement des données
  const loadAllData = async () => {
    setLoadingRequests(true);
    setLoadingVisits(true);
    try {
      const [reqData, visitData] = await Promise.all([
        fetchConciergerieRequests(),
        fetchPropertyVisits()
      ]);
      setRequests(reqData);
      setVisits(visitData);
    } catch (e) {
      console.error('Erreur chargement conciergerie:', e);
      notify('error', 'Impossible de charger les données de conciergerie.');
    } finally {
      setLoadingRequests(false);
      setLoadingVisits(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Fermer le menu d'action au clic ailleurs
  useEffect(() => {
    const closeMenu = () => setOpenActionMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Normalisation du statut
  const getNormalizedStatus = (rawStatus?: string): ConciergeRequestStatus => {
    if (!rawStatus) return 'new';
    if (rawStatus === 'nouveau') return 'new';
    if (rawStatus === 'en_cours') return 'searching';
    if (rawStatus === 'traite') return 'completed';
    if (rawStatus === 'archive') return 'cancelled';
    if (CONCIERGE_STATUS_CONFIG[rawStatus as ConciergeRequestStatus]) {
      return rawStatus as ConciergeRequestStatus;
    }
    return 'new';
  };

  // Compteurs KPI demandés :
  // * nombre de nouvelles demandes
  // * demandes en cours
  // * visites programmées
  // * demandes terminées
  const kpiStats = useMemo(() => {
    const nouvelles = requests.filter((r) => {
      const s = getNormalizedStatus(r.status);
      return s === 'new';
    }).length;

    const enCours = requests.filter((r) => {
      const s = getNormalizedStatus(r.status);
      return ['searching', 'properties_found', 'visit_scheduled', 'negotiation'].includes(s);
    }).length;

    const visites = visits.filter((v) => v.status === 'scheduled' || v.status === 'confirmed').length ||
      requests.filter((r) => getNormalizedStatus(r.status) === 'visit_scheduled').length;

    const terminees = requests.filter((r) => {
      const s = getNormalizedStatus(r.status);
      return s === 'completed';
    }).length;

    return {
      nouvelles,
      enCours,
      visites,
      terminees,
      total: requests.length
    };
  }, [requests, visits]);

  // Filtrage des demandes
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const currentStatus = getNormalizedStatus(req.status);
      if (statusFilter !== 'all' && currentStatus !== statusFilter) return false;

      const project = req.project_type || req.projet || '';
      if (projectFilter !== 'all' && project !== projectFilter) return false;

      if (agentFilter !== 'all') {
        if (agentFilter === 'unassigned') {
          if (req.assigned_agent_id) return false;
        } else {
          if (req.assigned_agent_id !== agentFilter) return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const clientName = (req.full_name || req.client?.nomComplet || '').toLowerCase();
        const clientPhone = (req.phone || req.client?.telephone || '').toLowerCase();
        const clientEmail = (req.email || req.client?.email || '').toLowerCase();
        const commune = (req.commune || req.localisation?.commune || '').toLowerCase();
        const quartier = (req.quartier || req.localisation?.quartier || '').toLowerCase();
        const ref = (req.reference || req.id || '').toLowerCase();

        return (
          clientName.includes(q) ||
          clientPhone.includes(q) ||
          clientEmail.includes(q) ||
          commune.includes(q) ||
          quartier.includes(q) ||
          ref.includes(q)
        );
      }

      return true;
    });
  }, [requests, statusFilter, projectFilter, agentFilter, searchQuery]);

  // ==========================================
  // GESTION DES 7 ACTIONS DEMANDÉES
  // ==========================================

  // Action 1 : VOIR
  const handleOpenView = (req: ConciergeRequest) => {
    setViewingRequest(req);
  };

  // Action 2 : MODIFIER
  const handleOpenEdit = (req: ConciergeRequest) => {
    setEditingRequest(req);
    setEditForm({
      full_name: req.full_name || req.client?.nomComplet || '',
      phone: req.phone || req.client?.telephone || '',
      email: req.email || req.client?.email || '',
      project_type: req.project_type || req.projet || 'Acheter',
      property_type: req.property_type || req.typeBien || 'Villa',
      commune: req.commune || req.localisation?.commune || 'Gombe',
      quartier: req.quartier || req.localisation?.quartier || '',
      budget_min: req.budget_min !== undefined ? req.budget_min : (req.budget?.min || 0),
      budget_max: req.budget_max || req.budget?.max || 0,
      currency: req.currency || req.budget?.devise || 'USD',
      bedrooms: req.bedrooms !== undefined ? req.bedrooms : (req.caracteristiques?.chambres || 0),
      bathrooms: req.bathrooms !== undefined ? req.bathrooms : (req.caracteristiques?.sallesDeBain || 0),
      notes: req.notes || req.preferencesClient?.remarques || ''
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    setIsSavingEdit(true);

    try {
      const updatePayload: Partial<ConciergeRequest> = {
        full_name: editForm.full_name,
        phone: editForm.phone,
        email: editForm.email,
        project_type: editForm.project_type,
        property_type: editForm.property_type,
        commune: editForm.commune,
        quartier: editForm.quartier,
        budget_min: Number(editForm.budget_min) || 0,
        budget_max: Number(editForm.budget_max) || 0,
        currency: editForm.currency,
        bedrooms: Number(editForm.bedrooms) || 0,
        bathrooms: Number(editForm.bathrooms) || 0,
        notes: editForm.notes
      };

      await updateConciergeRequestFull(editingRequest.id, updatePayload);

      setRequests((prev) =>
        prev.map((r) => (r.id === editingRequest.id ? { ...r, ...updatePayload, updated_at: new Date().toISOString() } : r))
      );

      notify('success', 'Demande modifiée avec succès.');
      setEditingRequest(null);
    } catch (e: any) {
      notify('error', e?.message || 'Erreur lors de la modification.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Action 3 : ATTRIBUER À UN AGENT
  const handleOpenAssign = (req: ConciergeRequest) => {
    setAssigningRequest(req);
    setSelectedAgentId(req.assigned_agent_id || '');
  };

  const handleSaveAssign = async () => {
    if (!assigningRequest) return;
    try {
      const targetAgent = agents.find((a) => a.id === selectedAgentId);
      const agentName = targetAgent ? targetAgent.name : null;

      await updateConciergeRequestFull(assigningRequest.id, {
        assigned_agent_id: selectedAgentId || null,
        assigned_agent_name: agentName
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === assigningRequest.id
            ? { ...r, assigned_agent_id: selectedAgentId || null, assigned_agent_name: agentName, updated_at: new Date().toISOString() }
            : r
        )
      );

      notify('success', selectedAgentId ? `Demande attribuée à ${agentName}.` : 'Demande réinitialisée sans agent.');
      setAssigningRequest(null);
    } catch (e: any) {
      notify('error', 'Erreur lors de l’attribution.');
    }
  };

  // Action 4 : VOIR LES BIENS CORRESPONDANTS
  const handleOpenMatching = (req: ConciergeRequest) => {
    setMatchingModalRequest(req);
  };

  // Action 5 : PROGRAMMER UNE VISITE
  const handleOpenSchedule = (req: ConciergeRequest, defaultProperty?: any) => {
    setScheduleForm({
      request_id: req.id,
      property_id: defaultProperty?.id || '',
      property_title: defaultProperty?.title || `${req.property_type || req.typeBien || 'Bien'} à ${req.commune || req.localisation?.commune || 'Kinshasa'}`,
      agent_id: req.assigned_agent_id || (agents[0]?.id || ''),
      visit_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      visit_time: '14:00',
      status: 'scheduled',
      notes: `Visite programmée pour ${req.full_name || req.client?.nomComplet} (${req.phone || req.client?.telephone})`
    });
    setScheduleError(null);
    setIsScheduleModalOpen(true);
  };

  const handleSaveScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.request_id) {
      setScheduleError('Veuillez indiquer la demande associée.');
      return;
    }
    if (!scheduleForm.visit_date) {
      setScheduleError('Veuillez sélectionner une date de visite.');
      return;
    }

    setIsSavingVisit(true);
    setScheduleError(null);

    try {
      const selectedReq = requests.find((r) => r.id === scheduleForm.request_id);
      const selectedAgent = agents.find((a) => a.id === scheduleForm.agent_id);

      const res = await schedulePropertyVisit({
        request_id: scheduleForm.request_id,
        property_id: scheduleForm.property_id || null,
        property_title: scheduleForm.property_title || null,
        agent_id: scheduleForm.agent_id || null,
        agent_name: selectedAgent ? selectedAgent.name : null,
        client_name: selectedReq ? (selectedReq.full_name || selectedReq.client?.nomComplet) : null,
        visit_date: scheduleForm.visit_date,
        visit_time: scheduleForm.visit_time || null,
        status: scheduleForm.status,
        notes: scheduleForm.notes || null
      });

      if (res.success && res.data) {
        setVisits((prev) => [res.data!, ...prev.filter((v) => v.id !== res.data!.id)]);
        // Mettre à jour la demande en visit_scheduled
        setRequests((prev) =>
          prev.map((r) =>
            r.id === scheduleForm.request_id
              ? { ...r, status: 'visit_scheduled', updated_at: new Date().toISOString() }
              : r
          )
        );
        notify('success', 'Visite programmée avec succès.');
        setIsScheduleModalOpen(false);
      } else {
        setScheduleError(res.error || 'Erreur lors de la planification.');
      }
    } catch (err: any) {
      setScheduleError(err?.message || 'Erreur inattendue.');
    } finally {
      setIsSavingVisit(false);
    }
  };

  // Action 6 : MODIFIER LE STATUT
  const handleOpenStatusChange = (req: ConciergeRequest) => {
    setStatusChangingRequest(req);
  };

  const handleUpdateStatus = async (id: string, newStatus: ConciergeRequestStatus) => {
    try {
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r))
      );
      await updateConciergeRequestStatus(id, newStatus);
      notify('success', `Statut mis à jour : ${CONCIERGE_STATUS_CONFIG[newStatus]?.label || newStatus}`);
      setStatusChangingRequest(null);
    } catch (e) {
      notify('error', 'Erreur lors du changement de statut.');
    }
  };

  // Action 7 : AJOUTER UNE NOTE
  const handleOpenAddNote = (req: ConciergeRequest) => {
    setNotingRequest(req);
    setNoteContent(req.notesAdmin || '');
  };

  const handleSaveNote = async () => {
    if (!notingRequest) return;
    setIsSavingNote(true);

    try {
      await updateConciergeRequestStatus(notingRequest.id, undefined as any, noteContent);
      setRequests((prev) =>
        prev.map((r) => (r.id === notingRequest.id ? { ...r, notesAdmin: noteContent, updated_at: new Date().toISOString() } : r))
      );
      notify('success', 'Note administrative enregistrée.');
      setNotingRequest(null);
    } catch (e) {
      notify('error', 'Erreur enregistrement note.');
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {actionNotification && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              actionNotification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80 backdrop-blur-md'
                : 'bg-rose-950/90 text-rose-300 border-rose-700/80 backdrop-blur-md'
            }`}
          >
            {actionNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{actionNotification.message}</span>
          </div>
        </div>
      )}

      {/* Header Principal & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                Conciergerie Immobilière Kinshasa
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-emerald-400 font-bold">/admin/conciergerie</span>
                <span>•</span>
                <span>Gestion des demandes d'accompagnement & prospection</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAllData}
            disabled={loadingRequests}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRequests ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          <button
            onClick={() => {
              if (requests.length > 0) {
                handleOpenSchedule(requests[0]);
              } else {
                setIsScheduleModalOpen(true);
              }
            }}
            className="px-3.5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-600/20 active:scale-95 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Programmer une visite</span>
          </button>
        </div>
      </div>

      {/* Les 4 KPI Clés Demandés dans le dashboard administrateur :
          * nombre de nouvelles demandes
          * demandes en cours
          * visites programmées
          * demandes terminées */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. Nouvelles demandes */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'new' ? 'all' : 'new')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'new'
              ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md ring-2 ring-amber-400/40'
              : 'bg-slate-900 border-slate-800 hover:border-amber-500/50 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Nouvelles demandes
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black mt-2">{kpiStats.nouvelles}</div>
          <div className="text-[11px] text-slate-400 mt-1">À traiter et attribuer</div>
        </div>

        {/* 2. Demandes en cours */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'searching' ? 'all' : 'searching')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'searching'
              ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/40'
              : 'bg-slate-900 border-slate-800 hover:border-blue-500/50 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              Demandes en cours
            </span>
            <Search className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black mt-2">{kpiStats.enCours}</div>
          <div className="text-[11px] text-slate-400 mt-1">Recherche & prospection</div>
        </div>

        {/* 3. Visites programmées */}
        <div
          onClick={() => {
            setActiveTab('visits');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeTab === 'visits'
              ? 'bg-cyan-600 text-white border-cyan-400 shadow-md ring-2 ring-cyan-400/40'
              : 'bg-slate-900 border-slate-800 hover:border-cyan-500/50 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
              Visites programmées
            </span>
            <Calendar className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black mt-2">{kpiStats.visites}</div>
          <div className="text-[11px] text-slate-400 mt-1">Sur le terrain à Kinshasa</div>
        </div>

        {/* 4. Demandes terminées */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'completed'
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/40'
              : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 text-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Demandes terminées
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black mt-2">{kpiStats.terminees}</div>
          <div className="text-[11px] text-slate-400 mt-1">Missions clôturées</div>
        </div>
      </div>

      {/* Onglets secondaires : Tableau des demandes vs Calendrier des visites */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Tableau des Demandes ({filteredRequests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('visits')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'visits'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Visites programmées ({visits.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* VUE 1 : TABLEAU DES DEMANDES DE CONCIERGERIE            */}
      {/* ======================================================== */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Barre de Recherche et Filtres */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par client, téléphone, e-mail, commune, ID..."
                className="w-full bg-transparent text-white placeholder-slate-500 focus:outline-none text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtre Statut */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Tous les statuts ({requests.length})</option>
                <option value="new">Nouveau ({kpiStats.nouvelles})</option>
                <option value="searching">Recherche en cours</option>
                <option value="properties_found">Biens trouvés</option>
                <option value="visit_scheduled">Visite planifiée</option>
                <option value="negotiation">Négociation</option>
                <option value="completed">Finalisé / Clôturé ({kpiStats.terminees})</option>
                <option value="cancelled">Annulé</option>
              </select>

              {/* Filtre Projet */}
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Tous les projets</option>
                <option value="Acheter">Acheter</option>
                <option value="Louer">Louer</option>
                <option value="Trouver un terrain">Terrain</option>
                <option value="Trouver un local commercial">Commercial</option>
              </select>

              {/* Filtre Agent */}
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="all">Tous les agents</option>
                <option value="unassigned">Non assigné</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>

              {(statusFilter !== 'all' || projectFilter !== 'all' || agentFilter !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setProjectFilter('all');
                    setAgentFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* LE TABLEAU COMPLET AVEC LES 10 COLONNES DEMANDÉES */}
          {loadingRequests ? (
            <div className="p-12 text-center text-slate-400 space-y-2 bg-slate-900 rounded-3xl border border-slate-800">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Chargement du tableau des demandes de conciergerie...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <Compass className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white">Aucune demande trouvée</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'Aucune demande ne correspond à vos filtres actuels.'
                  : 'Les demandes soumises par les clients apparaîtront ici.'}
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800 select-none">
                      <th className="py-3.5 px-3">ID</th>
                      <th className="py-3.5 px-3">Client</th>
                      <th className="py-3.5 px-3">Projet</th>
                      <th className="py-3.5 px-3">Type de bien</th>
                      <th className="py-3.5 px-3">Commune</th>
                      <th className="py-3.5 px-3">Budget</th>
                      <th className="py-3.5 px-3">Date</th>
                      <th className="py-3.5 px-3">Agent responsable</th>
                      <th className="py-3.5 px-3">Statut</th>
                      <th className="py-3.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredRequests.map((req) => {
                      const currentStatus = getNormalizedStatus(req.status);
                      const statusConfig = CONCIERGE_STATUS_CONFIG[currentStatus] || CONCIERGE_STATUS_CONFIG.new;

                      const clientName = req.full_name || req.client?.nomComplet || 'Client Inconnu';
                      const clientPhone = req.phone || req.client?.telephone || '';
                      const clientEmail = req.email || req.client?.email || '';
                      const rawPhone = clientPhone.replace(/[^0-9]/g, '');

                      const projectType = req.project_type || req.projet || 'Acheter';
                      const propertyType = req.property_type || req.typeBien || 'Bien';
                      const commune = req.commune || req.localisation?.commune || 'Kinshasa';
                      const quartier = req.quartier || req.localisation?.quartier || '';

                      const maxBudget = req.budget_max || req.budget?.max || 0;
                      const minBudget = req.budget_min !== undefined ? req.budget_min : req.budget?.min;
                      const currency = req.currency || req.budget?.devise || 'USD';

                      const assignedAgent = agents.find((a) => a.id === req.assigned_agent_id);

                      // Date formatée
                      const dateObj = new Date(req.created_at || req.createdAt || Date.now());
                      const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      });

                      // Biens correspondants pour badge rapide
                      const matches = findMatchingProperties(req, properties, { minScore: 10, limit: 15 });

                      return (
                        <tr
                          key={req.id}
                          className="hover:bg-slate-800/50 transition-colors group"
                        >
                          {/* 1. Colonne ID */}
                          <td className="py-3 px-3 align-middle font-mono font-bold text-slate-300 whitespace-nowrap">
                            <span className="bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800 text-[11px] text-emerald-400">
                              #{req.reference || req.id.slice(-6)}
                            </span>
                          </td>

                          {/* 2. Colonne Client */}
                          <td className="py-3 px-3 align-middle">
                            <div className="font-extrabold text-white text-xs whitespace-nowrap">
                              {clientName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                              {clientPhone && (
                                <a
                                  href={`tel:${clientPhone}`}
                                  className="hover:text-emerald-400 flex items-center gap-1"
                                  title="Appeler le client"
                                >
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  <span>{clientPhone}</span>
                                </a>
                              )}
                              {rawPhone && (
                                <a
                                  href={`https://wa.me/${rawPhone}?text=${encodeURIComponent(`Bonjour ${clientName}, je vous contacte depuis la Conciergerie Immobilière Kinimmo au sujet de votre demande.`)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300"
                                  title="Écrire sur WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>

                          {/* 3. Colonne Projet */}
                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                projectType === 'Acheter'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : projectType === 'Louer'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {projectType}
                            </span>
                          </td>

                          {/* 4. Colonne Type de bien */}
                          <td className="py-3 px-3 align-middle whitespace-nowrap font-medium text-slate-200">
                            <span>{propertyType}</span>
                            {req.bedrooms ? (
                              <span className="text-slate-500 text-[10px] ml-1">
                                ({req.bedrooms} ch.)
                              </span>
                            ) : null}
                          </td>

                          {/* 5. Colonne Commune */}
                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 text-slate-300 font-semibold">
                              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{commune}</span>
                            </span>
                            {quartier && (
                              <span className="block text-[10px] text-slate-500">
                                {quartier}
                              </span>
                            )}
                          </td>

                          {/* 6. Colonne Budget */}
                          <td className="py-3 px-3 align-middle whitespace-nowrap font-mono font-bold text-slate-200">
                            {maxBudget > 0 ? (
                              <span>
                                {minBudget && minBudget > 0 ? `${Number(minBudget).toLocaleString()} - ` : ''}
                                {Number(maxBudget).toLocaleString()} {currency}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Non spécifié</span>
                            )}
                          </td>

                          {/* 7. Colonne Date */}
                          <td className="py-3 px-3 align-middle whitespace-nowrap text-slate-400">
                            {formattedDate}
                          </td>

                          {/* 8. Colonne Agent responsable */}
                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                            {assignedAgent ? (
                              <button
                                onClick={() => handleOpenAssign(req)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 hover:border-emerald-500 text-[11px] transition-colors cursor-pointer"
                                title="Cliquer pour réassigner"
                              >
                                <UserCheck className="w-3 h-3 text-emerald-400" />
                                <span className="font-semibold">{assignedAgent.name}</span>
                              </button>
                            ) : req.assigned_agent_name ? (
                              <button
                                onClick={() => handleOpenAssign(req)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 hover:border-emerald-500 text-[11px] transition-colors cursor-pointer"
                              >
                                <UserCheck className="w-3 h-3 text-emerald-400" />
                                <span>{req.assigned_agent_name}</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenAssign(req)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold transition-all cursor-pointer"
                                title="Attribuer cette demande à un courtier"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Attribuer</span>
                              </button>
                            )}
                          </td>

                          {/* 9. Colonne Statut */}
                          <td className="py-3 px-3 align-middle whitespace-nowrap">
                            <button
                              onClick={() => handleOpenStatusChange(req)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${statusConfig.badgeClass}`}
                              title="Cliquer pour modifier le statut"
                            >
                              {statusConfig.label}
                            </button>
                          </td>

                          {/* 10. Colonne Actions (Les 7 actions demandées) */}
                          <td className="py-3 px-3 align-middle text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* Action 1 : Voir */}
                              <button
                                onClick={() => handleOpenView(req)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Voir les détails complets de la demande"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-300" />
                              </button>

                              {/* Action 2 : Modifier */}
                              <button
                                onClick={() => handleOpenEdit(req)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Modifier la demande"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                              </button>

                              {/* Action 3 : Attribuer à un agent */}
                              <button
                                onClick={() => handleOpenAssign(req)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Attribuer à un agent responsable"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                              </button>

                              {/* Action 4 : Voir les biens correspondants */}
                              <button
                                onClick={() => handleOpenMatching(req)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer relative"
                                title={`Voir les biens correspondants (${matches.length} trouvés)`}
                              >
                                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                {matches.length > 0 && (
                                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-purple-500 text-white text-[8px] font-black flex items-center justify-center">
                                    {matches.length}
                                  </span>
                                )}
                              </button>

                              {/* Action 5 : Programmer une visite */}
                              <button
                                onClick={() => handleOpenSchedule(req)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Programmer une visite immobilière"
                              >
                                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                              </button>

                              {/* Action 6 : Modifier le statut */}
                              <button
                                onClick={() => handleOpenStatusChange(req)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Modifier le statut de la demande"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                              </button>

                              {/* Action 7 : Ajouter une note */}
                              <button
                                onClick={() => handleOpenAddNote(req)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  req.notesAdmin
                                    ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                                }`}
                                title={req.notesAdmin ? `Note administrative : ${req.notesAdmin}` : 'Ajouter une note administrative'}
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer du tableau */}
              <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
                <span>
                  Affichage de <strong className="text-white">{filteredRequests.length}</strong> demande{filteredRequests.length > 1 ? 's' : ''} sur un total de {requests.length}
                </span>
                <span className="text-[11px] text-slate-500">
                  Mises à jour synchronisées en direct avec l'API Conciergerie Kinimmo
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VUE 2 : TABLEAU DES VISITES PROGRAMMÉES                  */}
      {/* ======================================================== */}
      {activeTab === 'visits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Planning des Visites Immobilières sur le terrain
            </h3>
            <button
              onClick={() => {
                if (requests.length > 0) handleOpenSchedule(requests[0]);
                else setIsScheduleModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouvelle Visite</span>
            </button>
          </div>

          {loadingVisits ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900 rounded-3xl border border-slate-800">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : visits.length === 0 ? (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-2">
              <Calendar className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-white">Aucune visite programmée</h4>
              <p className="text-xs text-slate-400">Cliquez sur « Programmer une visite » pour planifier un rendez-vous.</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                      <th className="py-3.5 px-3">Date & Heure</th>
                      <th className="py-3.5 px-3">Client</th>
                      <th className="py-3.5 px-3">Bien ciblé</th>
                      <th className="py-3.5 px-3">Agent accompagnateur</th>
                      <th className="py-3.5 px-3">Statut</th>
                      <th className="py-3.5 px-3">Notes</th>
                      <th className="py-3.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {visits.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                          {v.visit_date} {v.visit_time ? `à ${v.visit_time}` : ''}
                        </td>
                        <td className="py-3 px-3 font-extrabold text-white">
                          {v.client_name || 'Client'}
                        </td>
                        <td className="py-3 px-3 text-slate-200">
                          {v.property_title || 'Bien non spécifié'}
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {v.agent_name || 'Agent non assigné'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              v.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : v.status === 'cancelled'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            }`}
                          >
                            {v.status === 'completed' ? 'Effectuée' : v.status === 'cancelled' ? 'Annulée' : 'Planifiée'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                          {v.notes || '-'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {v.status !== 'completed' && (
                              <button
                                onClick={async () => {
                                  await updatePropertyVisitStatus(v.id, 'completed');
                                  setVisits((prev) => prev.map((item) => item.id === v.id ? { ...item, status: 'completed' } : item));
                                  notify('success', 'Visite marquée comme effectuée.');
                                }}
                                className="px-2 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-[10px] font-bold"
                              >
                                Clôturer
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                if (window.confirm('Supprimer cette visite ?')) {
                                  await deletePropertyVisit(v.id);
                                  setVisits((prev) => prev.filter((item) => item.id !== v.id));
                                  notify('success', 'Visite supprimée.');
                                }
                              }}
                              className="p-1 rounded text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE 1 : ACTION « VOIR » LA DEMANDE                    */}
      {/* ======================================================== */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 text-xs text-slate-200 shadow-2xl">
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    #{viewingRequest.reference || viewingRequest.id}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${CONCIERGE_STATUS_CONFIG[getNormalizedStatus(viewingRequest.status)]?.badgeClass}`}>
                    {CONCIERGE_STATUS_CONFIG[getNormalizedStatus(viewingRequest.status)]?.label}
                  </span>
                </div>
                <h3 className="text-base font-black text-white">
                  Détail de la demande de Conciergerie
                </h3>
              </div>
              <button
                onClick={() => setViewingRequest(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Infos Client */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Coordonnées du Client
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Nom complet</span>
                  <strong className="text-white text-sm">
                    {viewingRequest.full_name || viewingRequest.client?.nomComplet || 'Non renseigné'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Téléphone</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">{viewingRequest.phone || viewingRequest.client?.telephone || 'Non renseigné'}</span>
                    {viewingRequest.phone && (
                      <a
                        href={`https://wa.me/${viewingRequest.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-bold text-[11px]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">E-mail</span>
                  <span className="text-slate-300">{viewingRequest.email || viewingRequest.client?.email || 'Non renseigné'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Date de création</span>
                  <span className="text-slate-300">
                    {new Date(viewingRequest.created_at || viewingRequest.createdAt || Date.now()).toLocaleString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Critères de Recherche */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Critères & Spécifications Recherchées
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-500 block text-[10px]">Projet</span>
                  <span className="text-white font-bold">{viewingRequest.project_type || viewingRequest.projet || 'Acheter'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Type de bien</span>
                  <span className="text-white font-bold">{viewingRequest.property_type || viewingRequest.typeBien || 'Bien'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Commune ciblée</span>
                  <span className="text-white font-bold">{viewingRequest.commune || viewingRequest.localisation?.commune || 'Kinshasa'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Quartier</span>
                  <span className="text-white font-bold">{viewingRequest.quartier || viewingRequest.localisation?.quartier || 'Indifférent'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Budget Min</span>
                  <span className="text-white font-mono font-bold">
                    {viewingRequest.budget_min ? `${Number(viewingRequest.budget_min).toLocaleString()} ${viewingRequest.currency || 'USD'}` : '0 USD'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Budget Max</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {viewingRequest.budget_max ? `${Number(viewingRequest.budget_max).toLocaleString()} ${viewingRequest.currency || 'USD'}` : 'Non limité'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Chambres min.</span>
                  <span className="text-white font-bold">{viewingRequest.bedrooms || viewingRequest.caracteristiques?.chambres || 'Indifférent'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Salles de bain</span>
                  <span className="text-white font-bold">{viewingRequest.bathrooms || viewingRequest.caracteristiques?.sallesDeBain || 'Indifférent'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Agent assigné</span>
                  <span className="text-emerald-400 font-bold">
                    {agents.find(a => a.id === viewingRequest.assigned_agent_id)?.name || viewingRequest.assigned_agent_name || 'Non assigné'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Notes & Remarques du client
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs">
                {viewingRequest.notes || viewingRequest.preferencesClient?.remarques || 'Aucune note transmise par le client.'}
              </div>
            </div>

            {viewingRequest.notesAdmin && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  Note interne d'administration
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                  {viewingRequest.notesAdmin}
                </div>
              </div>
            )}

            {/* Actions rapides depuis la vue */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-end gap-2">
              <button
                onClick={() => {
                  const req = viewingRequest;
                  setViewingRequest(null);
                  handleOpenEdit(req);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                <span>Modifier</span>
              </button>

              <button
                onClick={() => {
                  const req = viewingRequest;
                  setViewingRequest(null);
                  handleOpenMatching(req);
                }}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Biens correspondants</span>
              </button>

              <button
                onClick={() => {
                  const req = viewingRequest;
                  setViewingRequest(null);
                  handleOpenSchedule(req);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Programmer une visite</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE 2 : ACTION « MODIFIER » LA DEMANDE                */}
      {/* ======================================================== */}
      {editingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveEdit}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs text-slate-200 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  <span>Modifier la demande #{editingRequest.reference || editingRequest.id.slice(-6)}</span>
                </h3>
                <p className="text-[11px] text-slate-400">Mettez à jour les informations du client et les critères de recherche.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Nom du client</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Téléphone</label>
                <input
                  type="text"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">E-mail</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Type de Projet</label>
                <select
                  value={editForm.project_type}
                  onChange={(e) => setEditForm({ ...editForm, project_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Acheter">Acheter</option>
                  <option value="Louer">Louer</option>
                  <option value="Trouver un terrain">Trouver un terrain</option>
                  <option value="Trouver un local commercial">Trouver un local commercial</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Type de bien</label>
                <select
                  value={editForm.property_type}
                  onChange={(e) => setEditForm({ ...editForm, property_type: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Villa">Villa</option>
                  <option value="Appartement">Appartement</option>
                  <option value="Maison">Maison</option>
                  <option value="Terrain">Terrain</option>
                  <option value="Concession">Concession</option>
                  <option value="Immeuble">Immeuble</option>
                  <option value="Bureau / Local">Bureau / Local commercial</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Commune</label>
                <select
                  value={editForm.commune}
                  onChange={(e) => setEditForm({ ...editForm, commune: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                >
                  {['Gombe', 'Ngaliema', 'Kintambo', 'Limete', 'Mont-Ngafula', 'Bandalungwa', 'Barumbu', 'Lingwala', 'Lemba', 'Kalamu'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Quartier (optionnel)</label>
                <input
                  type="text"
                  value={editForm.quartier}
                  onChange={(e) => setEditForm({ ...editForm, quartier: e.target.value })}
                  placeholder="ex: Macampagne, Batetela..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Budget Min ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.budget_min}
                    onChange={(e) => setEditForm({ ...editForm, budget_min: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Budget Max ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.budget_max}
                    onChange={(e) => setEditForm({ ...editForm, budget_max: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Chambres minimum</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.bedrooms}
                  onChange={(e) => setEditForm({ ...editForm, bedrooms: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Salles de bain</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.bathrooms}
                  onChange={(e) => setEditForm({ ...editForm, bathrooms: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Précisions & Remarques</label>
              <textarea
                rows={3}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Détails complémentaires sur les critères souhaités..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-blue-500 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingEdit ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE 3 : ACTION « ATTRIBUER À UN AGENT »               */}
      {/* ======================================================== */}
      {assigningRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-xs text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">
                    Attribuer à un agent
                  </h3>
                  <p className="text-[10px] text-slate-400">Demande #{assigningRequest.reference || assigningRequest.id.slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={() => setAssigningRequest(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-300">
                Sélectionnez le courtier / agent responsable :
              </label>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                <div
                  onClick={() => setSelectedAgentId('')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedAgentId === ''
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="font-bold">Aucun agent (Non assigné)</span>
                  {selectedAgentId === '' && <CheckSquare className="w-4 h-4 text-amber-400" />}
                </div>

                {agents.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => setSelectedAgentId(a.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      selectedAgentId === a.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={a.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                        alt={a.name}
                        className="w-7 h-7 rounded-lg object-cover ring-1 ring-slate-700"
                      />
                      <div>
                        <div className="font-bold text-xs">{a.name}</div>
                        <div className="text-[10px] text-slate-400">{a.phone || a.email}</div>
                      </div>
                    </div>
                    {selectedAgentId === a.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssigningRequest(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveAssign}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md"
              >
                Confirmer l'attribution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE 4 : ACTION « VOIR LES BIENS CORRESPONDANTS »      */}
      {/* ======================================================== */}
      {matchingModalRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs text-slate-200 shadow-2xl">
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Biens immobiliers correspondants</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Correspondance algorithmique pour {matchingModalRequest.full_name || matchingModalRequest.client?.nomComplet} ({matchingModalRequest.property_type || matchingModalRequest.typeBien} à {matchingModalRequest.commune || matchingModalRequest.localisation?.commune}).
                </p>
              </div>
              <button
                onClick={() => setMatchingModalRequest(null)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Liste des résultats avec score */}
            {(() => {
              const matchedList = findMatchingProperties(matchingModalRequest, properties, { minScore: 10, limit: 15 });
              if (matchedList.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <p className="text-slate-400 text-xs">Aucun bien du catalogue ne correspond directement aux critères stricts.</p>
                    <p className="text-[11px] text-slate-500">Essayez d'élargir le budget ou la commune dans l'action Modifier.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="text-[11px] font-bold text-purple-300">
                    {matchedList.length} bien{matchedList.length > 1 ? 's' : ''} trouvé{matchedList.length > 1 ? 's' : ''} dans le catalogue Kinimmo :
                  </div>

                  <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                    {matchedList.map((match) => (
                      <div
                        key={match.property.id}
                        className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={match.property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400'}
                            alt={match.property.title}
                            className="w-16 h-16 rounded-xl object-cover shrink-0 ring-1 ring-slate-800"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white text-xs hover:text-purple-300">
                                {match.property.title}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                                {match.score}% compatibilité
                              </span>
                            </div>
                            <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-1">
                              <span className="font-bold text-emerald-400 font-mono">
                                ${match.property.price?.toLocaleString()} {match.property.pricePeriod ? `/${match.property.pricePeriod}` : ''}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-500" />
                                {match.property.commune}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {(match.breakdown?.reasons || (match as any).reasons || []).join(' • ')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              const req = matchingModalRequest;
                              setMatchingModalRequest(null);
                              handleOpenSchedule(req, match.property);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Calendar className="w-3 h-3" />
                            <span>Programmer visite</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setMatchingModalRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE 5 : ACTION « PROGRAMMER UNE VISITE »              */}
      {/* ======================================================== */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <form
            onSubmit={handleSaveScheduleVisit}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-slate-200 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>Programmer une visite immobilière</span>
                </h3>
                <p className="text-[11px] text-slate-400">Enregistrement dans le planning de conciergerie et notification.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {scheduleError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {scheduleError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Bien à visiter</label>
                <input
                  type="text"
                  required
                  value={scheduleForm.property_title}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, property_title: e.target.value })}
                  placeholder="ex: Villa contemporaine 4 chambres - Gombe"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Date de visite</label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.visit_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, visit_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Heure de visite</label>
                  <input
                    type="time"
                    value={scheduleForm.visit_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, visit_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Agent accompagnateur</label>
                <select
                  value={scheduleForm.agent_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, agent_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Sélectionner un agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.agencyName || 'Kinimmo'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Notes et consignes pour la visite</label>
                <textarea
                  rows={2}
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="Lieu de rendez-vous, accès, confirmation client..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSavingVisit}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 disabled:opacity-50"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{isSavingVisit ? 'Planification...' : 'Valider la visite'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE 6 : ACTION « MODIFIER LE STATUT »                 */}
      {/* ======================================================== */}
      {statusChangingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-xs text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span>Modifier le statut de la demande</span>
                </h3>
                <p className="text-[10px] text-slate-400">Demande #{statusChangingRequest.reference || statusChangingRequest.id.slice(-6)}</p>
              </div>
              <button
                onClick={() => setStatusChangingRequest(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {(Object.keys(CONCIERGE_STATUS_CONFIG) as ConciergeRequestStatus[]).map((st) => {
                const conf = CONCIERGE_STATUS_CONFIG[st];
                const isSelected = getNormalizedStatus(statusChangingRequest.status) === st;

                return (
                  <button
                    key={st}
                    onClick={() => handleUpdateStatus(statusChangingRequest.id, st)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-black'
                        : 'bg-slate-950 border-slate-800 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${conf.badgeClass.split(' ')[0]}`} />
                      <span>{conf.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setStatusChangingRequest(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALE 7 : ACTION « AJOUTER UNE NOTE »                   */}
      {/* ======================================================== */}
      {notingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-xs text-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">
                    Note administrative interne
                  </h3>
                  <p className="text-[10px] text-slate-400">Demande #{notingRequest.reference || notingRequest.id.slice(-6)} - {notingRequest.full_name || notingRequest.client?.nomComplet}</p>
                </div>
              </div>
              <button
                onClick={() => setNotingRequest(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1.5">
                Note de suivi confidentielle (visible uniquement par les administrateurs) :
              </label>
              <textarea
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Indiquez ici les détails de négociation, préférences précises ou retours d'appels..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setNotingRequest(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                disabled={isSavingNote}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingNote ? 'Enregistrement...' : 'Enregistrer la note'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
