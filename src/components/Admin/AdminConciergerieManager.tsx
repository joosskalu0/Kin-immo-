import React, { useState, useEffect } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { ConciergeRequest, ConciergeRequestStatus, PropertyVisit, PropertyVisitStatus } from '../../types';
import { findMatchingProperties, PropertyMatchResult } from '../../utils/propertyMatching';
import {
  fetchConciergerieRequests,
  updateConciergeRequestStatus,
  fetchPropertyVisits,
  schedulePropertyVisit,
  updatePropertyVisitStatus,
  deletePropertyVisit
} from '../../services/conciergerieApi';
import { useApp } from '../../context/AppContext';

// Libellés et styles des 7 statuts demandés
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

const VISIT_STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  scheduled: { label: 'Planifiée', badge: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
  confirmed: { label: 'Confirmée', badge: 'bg-blue-100 text-blue-900 border-blue-300' },
  completed: { label: 'Effectuée', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  cancelled: { label: 'Annulée', badge: 'bg-rose-100 text-rose-900 border-rose-300' },
  rescheduled: { label: 'Reportée', badge: 'bg-amber-100 text-amber-900 border-amber-300' }
};

export const AdminConciergerieManager: React.FC = () => {
  const { agents, properties } = useApp();

  // Navigation par onglets (Tables : concierge_requests vs property_visits)
  const [activeTab, setActiveTab] = useState<'requests' | 'visits'>('requests');

  // État Table : concierge_requests
  const [requests, setRequests] = useState<ConciergeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ConciergeRequestStatus>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<ConciergeRequest | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  // Modale de Correspondance Automatique avec les annonces
  const [matchingModalRequest, setMatchingModalRequest] = useState<ConciergeRequest | null>(null);

  // État Table : property_visits
  const [visits, setVisits] = useState<PropertyVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(true);
  const [visitStatusFilter, setVisitStatusFilter] = useState<string>('all');
  const [visitSearchQuery, setVisitSearchQuery] = useState('');

  // Modale planification de visite
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

  // Planification rapide depuis un bien matché
  const handlePlanVisitForMatchedProperty = (req: ConciergeRequest, prop: any, score: number) => {
    setScheduleForm({
      request_id: req.id,
      property_id: prop.id,
      property_title: prop.title,
      agent_id: req.assigned_agent_id || prop.agentId || agents[0]?.id || '',
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: '14:00',
      status: 'scheduled',
      notes: `Visite programmée suite à la correspondance automatique (${score}% de pertinence).`
    });
    setMatchingModalRequest(null);
    setIsScheduleModalOpen(true);
  };

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
      console.error('Erreur chargement données conciergerie:', e);
    } finally {
      setLoadingRequests(false);
      setLoadingVisits(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Normalisation du statut de demande
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

  // Mise à jour de statut d'une demande
  const handleUpdateStatus = async (id: string, newStatus: ConciergeRequestStatus) => {
    try {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r
        )
      );
      await updateConciergeRequestStatus(id, newStatus);
    } catch (e) {
      console.error('Erreur mise à jour statut:', e);
    }
  };

  // Attribution d'un agent à une demande
  const handleAssignAgent = async (requestId: string, agentId: string) => {
    try {
      const targetAgent = agents.find((a) => a.id === agentId);
      const agentName = targetAgent ? targetAgent.name : null;

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? {
                ...r,
                assigned_agent_id: agentId || null,
                assigned_agent_name: agentName,
                updated_at: new Date().toISOString()
              }
            : r
        )
      );

      await updateConciergeRequestStatus(requestId, undefined as any, undefined, agentId || null);
    } catch (e) {
      console.error('Erreur attribution agent:', e);
    }
  };

  // Sauvegarde des notes internes
  const handleSaveNotes = async (id: string) => {
    try {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, notesAdmin: tempNotes, updated_at: new Date().toISOString() } : r
        )
      );
      setEditingNotesId(null);
      await updateConciergeRequestStatus(id, undefined as any, tempNotes);
    } catch (e) {
      console.error('Erreur mise à jour notes:', e);
    }
  };

  // Ouvrir modale de planification pour une demande précise
  const handleOpenScheduleForRequest = (req: ConciergeRequest) => {
    setScheduleForm({
      request_id: req.id,
      property_id: '',
      property_title: `${req.property_type || req.typeBien || 'Bien'} à ${req.commune || req.localisation?.commune}`,
      agent_id: req.assigned_agent_id || (agents[0]?.id || ''),
      visit_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      visit_time: '14:00',
      status: 'scheduled',
      notes: `Visite pour ${req.full_name || req.client?.nomComplet} (${req.phone || req.client?.telephone})`
    });
    setScheduleError(null);
    setIsScheduleModalOpen(true);
  };

  // Soumission d'une nouvelle visite (property_visits)
  const handleSaveScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.request_id) {
      setScheduleError('Veuillez sélectionner ou indiquer la demande associée (request_id).');
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
        // Mettre à jour l'état de la demande en visit_scheduled si applicable
        setRequests((prev) =>
          prev.map((r) =>
            r.id === scheduleForm.request_id && r.status !== 'completed' && r.status !== 'cancelled'
              ? { ...r, status: 'visit_scheduled', updated_at: new Date().toISOString() }
              : r
          )
        );
        setIsScheduleModalOpen(false);
      } else {
        setScheduleError(res.error || 'Erreur lors de la planification de la visite.');
      }
    } catch (err: any) {
      setScheduleError(err?.message || 'Erreur inattendue.');
    } finally {
      setIsSavingVisit(false);
    }
  };

  // Mise à jour de statut d'une visite
  const handleUpdateVisitStatus = async (visitId: string, newStatus: string) => {
    try {
      setVisits((prev) =>
        prev.map((v) => (v.id === visitId ? { ...v, status: newStatus, updated_at: new Date().toISOString() } : v))
      );
      await updatePropertyVisitStatus(visitId, newStatus);
    } catch (e) {
      console.error('Erreur statut visite:', e);
    }
  };

  // Suppression d'une visite
  const handleDeleteVisit = async (visitId: string) => {
    if (!window.confirm('Confirmez-vous la suppression de cette visite ?')) return;
    try {
      setVisits((prev) => prev.filter((v) => v.id !== visitId));
      await deletePropertyVisit(visitId);
    } catch (e) {
      console.error('Erreur suppression visite:', e);
    }
  };

  // Filtrage des demandes (concierge_requests)
  const filteredRequests = requests.filter((r) => {
    const currentStatus = getNormalizedStatus(r.status);
    if (statusFilter !== 'all' && currentStatus !== statusFilter) {
      return false;
    }
    const currentProjet = r.project_type || r.projet;
    if (projectFilter !== 'all' && currentProjet !== projectFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const clientName = (r.full_name || r.client?.nomComplet || '').toLowerCase();
      const clientPhone = r.phone || r.client?.telephone || '';
      const clientEmail = (r.email || r.client?.email || '').toLowerCase();
      const commune = (r.commune || r.localisation?.commune || '').toLowerCase();
      const ref = (r.reference || r.id || '').toLowerCase();
      return (
        clientName.includes(q) ||
        clientPhone.includes(q) ||
        clientEmail.includes(q) ||
        commune.includes(q) ||
        ref.includes(q)
      );
    }
    return true;
  });

  // Filtrage des visites (property_visits)
  const filteredVisits = visits.filter((v) => {
    if (visitStatusFilter !== 'all' && v.status !== visitStatusFilter) {
      return false;
    }
    if (visitSearchQuery.trim()) {
      const q = visitSearchQuery.toLowerCase();
      const title = (v.property_title || '').toLowerCase();
      const client = (v.client_name || '').toLowerCase();
      const agent = (v.agent_name || '').toLowerCase();
      const notes = (v.notes || '').toLowerCase();
      const reqId = (v.request_id || '').toLowerCase();
      return (
        title.includes(q) ||
        client.includes(q) ||
        agent.includes(q) ||
        notes.includes(q) ||
        reqId.includes(q)
      );
    }
    return true;
  });

  // Compteurs par statut pour les KPI
  const countByStatus = {
    new: requests.filter((r) => getNormalizedStatus(r.status) === 'new').length,
    searching: requests.filter((r) => getNormalizedStatus(r.status) === 'searching').length,
    properties_found: requests.filter((r) => getNormalizedStatus(r.status) === 'properties_found').length,
    visit_scheduled: requests.filter((r) => getNormalizedStatus(r.status) === 'visit_scheduled').length,
    negotiation: requests.filter((r) => getNormalizedStatus(r.status) === 'negotiation').length,
    completed: requests.filter((r) => getNormalizedStatus(r.status) === 'completed').length,
    cancelled: requests.filter((r) => getNormalizedStatus(r.status) === 'cancelled').length
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* 1. EN-TÊTE OFFICIEL KINIMMO (Design Clair & Lumineux) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gestion des Mandats & Accompagnements Kinimmo</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
            Conciergerie Immobilière & Visites
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl font-normal leading-relaxed">
            Supervisez les deux tables clés de la conciergerie : les mandats de recherche reçus (<code>concierge_requests</code>) et les visites physiques planifiées (<code>property_visits</code>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/conciergerie"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
            title="Ouvrir la page publique /conciergerie dans un nouvel onglet"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Aperçu Public</span>
          </a>

          <button
            onClick={() => {
              setScheduleForm({
                request_id: requests[0]?.id || '',
                property_id: '',
                property_title: '',
                agent_id: agents[0]?.id || '',
                visit_date: new Date().toISOString().split('T')[0],
                visit_time: '14:00',
                status: 'scheduled',
                notes: ''
              });
              setScheduleError(null);
              setIsScheduleModalOpen(true);
            }}
            className="px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider border border-slate-300 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-emerald-600" />
            <span>Planifier une visite</span>
          </button>

          <button
            onClick={loadAllData}
            className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Actualiser les données"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRequests || loadingVisits ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* 2. ONGLETS DE SÉLECTION DE TABLE */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            activeTab === 'requests'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Demandes & Mandats (concierge_requests)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'requests' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {requests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('visits')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
            activeTab === 'visits'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Visites Immobilières (property_visits)</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              activeTab === 'visits' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {visits.length}
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* VUE 1 : TABLE concierge_requests                           */}
      {/* ========================================================= */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          
          {/* KPI des 7 statuts demandés */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div
              onClick={() => setStatusFilter('all')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block opacity-70">Total</span>
              <span className="text-xl font-black block">{requests.length}</span>
              <span className="text-[9px] opacity-75">Tous statuts</span>
            </div>

            <div
              onClick={() => setStatusFilter('new')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'new'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                  : 'bg-amber-50 border-amber-200 text-amber-900 hover:border-amber-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block opacity-80">Nouveau</span>
              <span className="text-xl font-black block">{countByStatus.new}</span>
              <span className="text-[9px] opacity-80">À attribuer</span>
            </div>

            <div
              onClick={() => setStatusFilter('searching')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'searching'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                  : 'bg-blue-50 border-blue-200 text-blue-900 hover:border-blue-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block opacity-80">Recherche</span>
              <span className="text-xl font-black block">{countByStatus.searching}</span>
              <span className="text-[9px] opacity-80">Prospection</span>
            </div>

            <div
              onClick={() => setStatusFilter('properties_found')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'properties_found'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                  : 'bg-purple-50 border-purple-200 text-purple-900 hover:border-purple-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block opacity-80">Biens trouvés</span>
              <span className="text-xl font-black block">{countByStatus.properties_found}</span>
              <span className="text-[9px] opacity-80">En sélection</span>
            </div>

            <div
              onClick={() => setStatusFilter('visit_scheduled')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'visit_scheduled'
                  ? 'bg-cyan-600 text-white border-cyan-700 shadow-xs'
                  : 'bg-cyan-50 border-cyan-200 text-cyan-900 hover:border-cyan-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block opacity-80">Visites</span>
              <span className="text-xl font-black block">{countByStatus.visit_scheduled}</span>
              <span className="text-[9px] opacity-80">Planifiées</span>
            </div>

            <div
              onClick={() => setStatusFilter('negotiation')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'negotiation'
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                  : 'bg-indigo-50 border-indigo-200 text-indigo-900 hover:border-indigo-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block opacity-80">Négociation</span>
              <span className="text-xl font-black block">{countByStatus.negotiation}</span>
              <span className="text-[9px] opacity-80">Offres en cours</span>
            </div>

            <div
              onClick={() => setStatusFilter('completed')}
              className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:border-emerald-300'
              }`}
            >
              <span className="text-[10px] uppercase font-bold block opacity-80">Finalisé</span>
              <span className="text-xl font-black block">{countByStatus.completed}</span>
              <span className="text-[9px] opacity-80">Clôturé</span>
            </div>
          </div>

          {/* Filtres & Recherche pour les demandes */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, téléphone, e-mail, commune..."
                className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-emerald-600"
              >
                <option value="all">Tous les 7 statuts</option>
                <option value="new">new (Nouveau)</option>
                <option value="searching">searching (Recherche en cours)</option>
                <option value="properties_found">properties_found (Biens trouvés)</option>
                <option value="visit_scheduled">visit_scheduled (Visite planifiée)</option>
                <option value="negotiation">negotiation (Négociation)</option>
                <option value="completed">completed (Finalisé)</option>
                <option value="cancelled">cancelled (Annulé)</option>
              </select>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-emerald-600"
              >
                <option value="all">Tous les types de projet</option>
                <option value="Acheter">Acheter</option>
                <option value="Louer">Louer</option>
                <option value="Trouver un terrain">Trouver un terrain</option>
                <option value="Trouver un local commercial">Trouver un local commercial</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Liste des Demandes */}
          {loadingRequests ? (
            <div className="p-12 text-center text-slate-500 space-y-2 bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Chargement des demandes de conciergerie...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
              <Compass className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Aucune demande trouvée</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'all' || projectFilter !== 'all'
                  ? 'Aucun résultat ne correspond à vos filtres actuels.'
                  : 'Les demandes soumises via la conciergerie apparaîtront ici automatiquement.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map((req) => {
                const currentStatus = getNormalizedStatus(req.status);
                const statusConfig = CONCIERGE_STATUS_CONFIG[currentStatus] || CONCIERGE_STATUS_CONFIG.new;

                const clientName = req.full_name || req.client?.nomComplet || 'Client Inconnu';
                const clientPhone = req.phone || req.client?.telephone || '';
                const clientEmail = req.email || req.client?.email || '';
                const clientWa = req.whatsapp || req.client?.whatsapp || clientPhone;
                const cleanPhone = clientPhone.replace(/\s+/g, '');
                const rawWa = clientWa.replace(/[^0-9]/g, '');

                const projectType = req.project_type || req.projet || 'Projet';
                const propertyType = req.property_type || req.typeBien || 'Bien';
                const commune = req.commune || req.localisation?.commune || 'Kinshasa';
                const quartier = req.quartier || req.localisation?.quartier || null;

                const maxBudget = req.budget_max || req.budget?.max || 0;
                const minBudget = req.budget_min !== undefined ? req.budget_min : req.budget?.min;
                const currency = req.currency || req.budget?.devise || 'USD';

                const bedrooms = req.bedrooms !== undefined ? req.bedrooms : req.caracteristiques?.chambres;
                const bathrooms = req.bathrooms !== undefined ? req.bathrooms : req.caracteristiques?.sallesDeBain;
                const parking = req.parking !== undefined ? req.parking : req.caracteristiques?.parking;
                const furnished = req.furnished !== undefined ? req.furnished : req.caracteristiques?.meuble;

                const assignedAgent = agents.find((a) => a.id === req.assigned_agent_id);

                // Correspondance automatique calculée avec les annonces existantes
                const reqMatches = findMatchingProperties(req, properties, { minScore: 10, limit: 15 });
                const bestMatchScore = reqMatches.length > 0 ? reqMatches[0].score : 0;

                return (
                  <div
                    key={req.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-4 shadow-xs"
                  >
                    {/* Ligne 1 : Titres & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {req.reference || req.id}
                          </span>
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                            {projectType} • {propertyType}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            <span>{commune} {quartier ? `(${quartier})` : ''}</span>
                          </span>

                          {/* Badge de correspondance automatique */}
                          {reqMatches.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setMatchingModalRequest(req)}
                              className="px-2.5 py-0.5 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="Cliquer pour afficher les biens correspondants triés par score de pertinence"
                            >
                              <Sparkles className="w-3 h-3 text-purple-600" />
                              <span>{reqMatches.length} bien{reqMatches.length > 1 ? 's' : ''} trouvé{reqMatches.length > 1 ? 's' : ''} ({bestMatchScore}% max)</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            Créé le{' '}
                            {new Date(req.created_at || req.createdAt || Date.now()).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Sélecteur de statut rapide parmi les 7 autorisés */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Statut :</span>
                        <select
                          value={currentStatus}
                          onChange={(e) => handleUpdateStatus(req.id, e.target.value as ConciergeRequestStatus)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider border cursor-pointer ${statusConfig.selectClass}`}
                        >
                          <option value="new">new (Nouveau)</option>
                          <option value="searching">searching (Recherche)</option>
                          <option value="properties_found">properties_found (Biens trouvés)</option>
                          <option value="visit_scheduled">visit_scheduled (Visite)</option>
                          <option value="negotiation">negotiation (Négociation)</option>
                          <option value="completed">completed (Finalisé)</option>
                          <option value="cancelled">cancelled (Annulé)</option>
                        </select>
                      </div>
                    </div>

                    {/* Ligne 2 : Données financières & caractéristiques */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-normal">Budget ({currency})</span>
                        <span className="font-mono font-bold text-emerald-700">
                          {minBudget ? `${minBudget.toLocaleString()} - ` : ''}
                          {maxBudget.toLocaleString()} {currency}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-normal">Pièces & Salles d'eau</span>
                        <span className="font-bold text-slate-800">
                          {bedrooms ? `${bedrooms} Ch.` : 'Ch. libre'} • {bathrooms ? `${bathrooms} Sdb` : 'Sdb libre'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-normal">Équipements</span>
                        <span className="font-bold text-slate-800">
                          {parking ? '✓ Parking' : '✗ Sans parking'} • {furnished ? '✓ Meublé' : '✗ Vide'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-[10px] text-slate-500 block font-normal">Conseiller Attribué</span>
                        <select
                          value={req.assigned_agent_id || ''}
                          onChange={(e) => handleAssignAgent(req.id, e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-1 text-[11px] font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
                        >
                          <option value="">Non assigné (Choisir un agent)</option>
                          {agents.map((ag) => (
                            <option key={ag.id} value={ag.id}>
                              {ag.name} ({ag.agencyName || 'Kinimmo'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ligne 3 : Coordonnées Client & Actions Rapides */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="space-y-0.5 text-xs">
                        <span className="text-slate-900 font-bold flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{clientName}</span>
                          {assignedAgent && (
                            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md font-semibold">
                              Suivi par {assignedAgent.name}
                            </span>
                          )}
                        </span>
                        <span className="text-slate-600 font-mono text-[11px] block">
                          {clientPhone} • {clientEmail}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Bouton Biens Correspondants avec Score */}
                        <button
                          type="button"
                          onClick={() => setMatchingModalRequest(req)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold border border-purple-300 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          title="Consulter les annonces de la base correspondant à cette demande"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                          <span>Biens Matchés ({reqMatches.length})</span>
                          {bestMatchScore > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-purple-200 text-purple-900 text-[10px] font-black">
                              {bestMatchScore}%
                            </span>
                          )}
                        </button>

                        {/* Planifier une visite liée */}
                        <button
                          onClick={() => handleOpenScheduleForRequest(req)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          title="Planifier une visite immobilière pour cette demande"
                        >
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+ Visite</span>
                        </button>

                        {/* Appel */}
                        {cleanPhone && (
                          <a
                            href={`tel:${cleanPhone}`}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Appeler</span>
                          </a>
                        )}

                        {/* WhatsApp */}
                        {rawWa && (
                          <a
                            href={`https://wa.me/${rawWa}?text=${encodeURIComponent(
                              `Bonjour ${clientName}, je suis votre conseiller Kinimmo pour votre recherche (${projectType} ${propertyType} à ${commune}).`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {/* Email */}
                        {clientEmail && (
                          <a
                            href={`mailto:${clientEmail}?subject=${encodeURIComponent(
                              `Kinimmo Conciergerie - Suivi de votre recherche [${req.reference || req.id}]`
                            )}`}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Mail className="w-3.5 h-3.5 text-blue-600" />
                            <span>Email</span>
                          </a>
                        )}

                        {/* Détails */}
                        <button
                          onClick={() => setSelectedRequest(selectedRequest?.id === req.id ? null : req)}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-all cursor-pointer"
                        >
                          {selectedRequest?.id === req.id ? 'Masquer' : 'Détails'}
                        </button>
                      </div>
                    </div>

                    {/* Tiroir détaillé du mandat */}
                    {selectedRequest?.id === req.id && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-200 text-xs text-slate-700">
                        {/* Description / Message */}
                        {(req.description || req.client?.message) && (
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Description & Exigences Particulières :
                            </span>
                            <p className="p-3 rounded-xl bg-white border border-slate-200 text-slate-800 italic">
                              "{req.description || req.client?.message}"
                            </p>
                          </div>
                        )}

                        {/* Services demandés */}
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-500 block">
                            Services & Prestations cochées :
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {(Array.isArray(req.services) ? req.services : [req.services]).filter(Boolean).map((svc) => (
                              <span
                                key={svc}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold flex items-center gap-1"
                              >
                                <CheckSquare className="w-3 h-3 text-emerald-600" />
                                <span>{svc}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Notes Internes Admin */}
                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-500">
                              Notes Internes Privées (Kinimmo) :
                            </span>
                            {editingNotesId !== req.id && (
                              <button
                                onClick={() => {
                                  setEditingNotesId(req.id);
                                  setTempNotes(req.notesAdmin || '');
                                }}
                                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                              >
                                {req.notesAdmin ? 'Modifier la note' : '+ Ajouter une note'}
                              </button>
                            )}
                          </div>

                          {editingNotesId === req.id ? (
                            <div className="space-y-2">
                              <textarea
                                rows={3}
                                value={tempNotes}
                                onChange={(e) => setTempNotes(e.target.value)}
                                placeholder="Notes d'entretien, retours de visites, propositions..."
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setEditingNotesId(null)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => handleSaveNotes(req.id)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Enregistrer</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs">
                              {req.notesAdmin || 'Aucune note interne enregistrée.'}
                            </p>
                          )}
                        </div>

                        {/* SECTION : Biens correspondants en direct */}
                        <div className="space-y-2 pt-3 border-t border-slate-200">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              <span>Correspondance Automatique avec les Propriétés ({reqMatches.length} identifiés) :</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setMatchingModalRequest(req)}
                              className="text-xs text-purple-700 hover:text-purple-900 font-bold underline cursor-pointer"
                            >
                              Ouvrir le comparateur complet ({reqMatches.length}) →
                            </button>
                          </div>

                          {reqMatches.length === 0 ? (
                            <p className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs">
                              Aucune propriété du catalogue ne correspond actuellement à cette combinaison exacte.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {reqMatches.slice(0, 2).map((m) => (
                                <div
                                  key={m.property.id}
                                  className="p-3 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 transition-all flex flex-col justify-between gap-2 shadow-xs"
                                >
                                  <div className="flex items-start gap-2.5">
                                    <img
                                      src={m.property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400'}
                                      alt={m.property.title}
                                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                                    />
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-[11px] font-bold text-slate-900 truncate block">
                                          {m.property.title}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded-md bg-purple-100 text-purple-900 font-black text-[10px] shrink-0 border border-purple-200">
                                          {m.score}%
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 truncate">
                                        {m.property.commune} {m.property.quartier ? `(${m.property.quartier})` : ''} • {m.property.bedrooms} ch. • {m.property.bathrooms} sdb
                                      </p>
                                      <p className="text-xs font-mono font-bold text-emerald-700">
                                        {m.property.price.toLocaleString()} {m.property.currency}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => handlePlanVisitForMatchedProperty(req, m.property, m.score)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 border border-emerald-200"
                                    >
                                      <Calendar className="w-3 h-3 text-emerald-600" />
                                      <span>+ Planifier visite</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* VUE 2 : TABLE property_visits                             */}
      {/* ========================================================= */}
      {activeTab === 'visits' && (
        <div className="space-y-6">
          
          {/* Barre de contrôle et recherche des visites */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={visitSearchQuery}
                onChange={(e) => setVisitSearchQuery(e.target.value)}
                placeholder="Rechercher une visite par client, bien, agent, notes..."
                className="w-full bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={visitStatusFilter}
                onChange={(e) => setVisitStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-700 font-semibold focus:outline-none focus:border-emerald-600"
              >
                <option value="all">Tous les statuts de visite</option>
                <option value="scheduled">Planifiée (scheduled)</option>
                <option value="confirmed">Confirmée (confirmed)</option>
                <option value="completed">Effectuée (completed)</option>
                <option value="cancelled">Annulée (cancelled)</option>
                <option value="rescheduled">Reportée (rescheduled)</option>
              </select>

              <button
                onClick={() => {
                  setScheduleForm({
                    request_id: requests[0]?.id || '',
                    property_id: '',
                    property_title: '',
                    agent_id: agents[0]?.id || '',
                    visit_date: new Date().toISOString().split('T')[0],
                    visit_time: '14:00',
                    status: 'scheduled',
                    notes: ''
                  });
                  setScheduleError(null);
                  setIsScheduleModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Nouvelle Visite</span>
              </button>
            </div>
          </div>

          {/* Liste des Visites */}
          {loadingVisits ? (
            <div className="p-12 text-center text-slate-500 space-y-2 bg-white rounded-3xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs">Chargement du calendrier des visites...</p>
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-xs">
              <Calendar className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">Aucune visite programmée</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Cliquez sur « Planifier une visite » pour fixer un rendez-vous entre un client et un agent Kinimmo.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredVisits.map((visit) => {
                const statusInfo = VISIT_STATUS_LABELS[visit.status] || {
                  label: visit.status,
                  badge: 'bg-slate-100 text-slate-700 border-slate-300'
                };

                const parentReq = requests.find((r) => r.id === visit.request_id);
                const assignedAgent = agents.find((a) => a.id === visit.agent_id);

                return (
                  <div
                    key={visit.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 transition-all space-y-3.5 shadow-xs relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusInfo.badge}`}>
                          {statusInfo.label}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">
                          {visit.property_title || 'Visite Immobilière'}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{visit.visit_date} {visit.visit_time ? `à ${visit.visit_time}` : ''}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteVisit(visit.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Supprimer la visite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Informations Associées */}
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Client concerné :</span>
                        <span className="font-bold text-slate-900">
                          {visit.client_name || parentReq?.full_name || parentReq?.client?.nomComplet || visit.request_id}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Agent accompagnateur :</span>
                        <span className="font-bold text-slate-900">
                          {visit.agent_name || assignedAgent?.name || 'Agent non spécifié'}
                        </span>
                      </div>
                      {parentReq && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Mandat lié :</span>
                          <span className="font-mono text-[11px] text-emerald-700 font-bold">
                            {parentReq.reference || parentReq.id}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes de visite */}
                    {visit.notes && (
                      <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60">
                        "{visit.notes}"
                      </p>
                    )}

                    {/* Boutons d'état rapide */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400">Modifier statut :</span>
                      <div className="flex items-center gap-1.5">
                        {visit.status !== 'confirmed' && (
                          <button
                            onClick={() => handleUpdateVisitStatus(visit.id, 'confirmed')}
                            className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200 cursor-pointer"
                          >
                            Confirmer
                          </button>
                        )}
                        {visit.status !== 'completed' && (
                          <button
                            onClick={() => handleUpdateVisitStatus(visit.id, 'completed')}
                            className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200 cursor-pointer"
                          >
                            Terminée
                          </button>
                        )}
                        {visit.status !== 'cancelled' && (
                          <button
                            onClick={() => handleUpdateVisitStatus(visit.id, 'cancelled')}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200 cursor-pointer"
                          >
                            Annuler
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALE : PLANIFIER UNE VISITE (Table: property_visits)     */}
      {/* ========================================================= */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 space-y-5">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Table : property_visits
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                  Planifier une Visite Immobilière
                </h3>
              </div>

              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {scheduleError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scheduleError}</span>
              </div>
            )}

            <form onSubmit={handleSaveScheduleVisit} className="space-y-4 text-xs">
              
              {/* Demande de Conciergerie Associée (request_id) */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase text-[10px]">
                  Demande de Conciergerie (request_id) <span className="text-emerald-600">*</span>
                </label>
                <select
                  value={scheduleForm.request_id}
                  onChange={(e) => {
                    const reqId = e.target.value;
                    const r = requests.find((item) => item.id === reqId);
                    setScheduleForm((prev) => ({
                      ...prev,
                      request_id: reqId,
                      property_title: r
                        ? `${r.property_type || r.typeBien || 'Bien'} à ${r.commune || r.localisation?.commune}`
                        : prev.property_title
                    }));
                  }}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="">-- Sélectionner un mandat client --</option>
                  {requests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.reference || r.id} — {r.full_name || r.client?.nomComplet} ({r.property_type || r.typeBien} à {r.commune || r.localisation?.commune})
                    </option>
                  ))}
                </select>
              </div>

              {/* Titre ou Réf du bien (property_title / property_id) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase text-[10px]">
                    Sélectionner un bien du catalogue (Optionnel)
                  </label>
                  <select
                    value={scheduleForm.property_id}
                    onChange={(e) => {
                      const propId = e.target.value;
                      const p = properties.find((item) => item.id === propId);
                      setScheduleForm((prev) => ({
                        ...prev,
                        property_id: propId,
                        property_title: p ? p.title : prev.property_title
                      }));
                    }}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  >
                    <option value="">-- Bien libre / Off-market --</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase text-[10px]">
                    Intitulé ou Adresse de la visite
                  </label>
                  <input
                    type="text"
                    value={scheduleForm.property_title}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, property_title: e.target.value })}
                    placeholder="Ex: Villa contemporaine avec piscine, Macampagne"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Agent assigné */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase text-[10px]">
                  Agent Kinimmo en charge (agent_id)
                </label>
                <select
                  value={scheduleForm.agent_id}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, agent_id: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                >
                  <option value="">-- Choisir un agent --</option>
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.agencyName || 'Kinimmo'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Heure */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase text-[10px]">
                    Date de la visite (visit_date) <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduleForm.visit_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, visit_date: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block uppercase text-[10px]">
                    Heure (visit_time)
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.visit_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, visit_time: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase text-[10px]">
                  Consignes & Notes de visite (notes)
                </label>
                <textarea
                  rows={2}
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  placeholder="Rendez-vous sur place à 14h, clés chez le gardien, vérifier l'alimentation en eau..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white resize-none"
                />
              </div>

              {/* Boutons d'action */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingVisit}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingVisit ? 'Planification...' : 'Confirmer la visite'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MODALE DE CORRESPONDANCE AUTOMATIQUE AVEC LES ANNONCES */}
      {/* ========================================================= */}
      {matchingModalRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            
            {/* En-tête Modale */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Système de Matching Kinimmo • Score sur 100</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase">
                  Correspondance Automatique avec les Annonces
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Biens du catalogue correspondant aux critères du client <strong>{matchingModalRequest.full_name || matchingModalRequest.client?.nomComplet}</strong> (Réf : {matchingModalRequest.reference || matchingModalRequest.id}).
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMatchingModalRequest(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barème officiel du score demandé */}
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2 text-xs">
              <span className="font-bold text-purple-950 uppercase text-[10px] tracking-wider block">
                Barème Officiel de Pondération (Trié par pertinence décroissante) :
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center font-bold">
                <div className="p-2 rounded-xl bg-white border border-purple-200 text-purple-900">
                  <span className="block text-[10px] text-slate-500 font-normal">Localisation</span>
                  <span className="text-emerald-700 text-sm font-black">+30 pts</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-purple-200 text-purple-900">
                  <span className="block text-[10px] text-slate-500 font-normal">Type de bien</span>
                  <span className="text-emerald-700 text-sm font-black">+20 pts</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-purple-200 text-purple-900">
                  <span className="block text-[10px] text-slate-500 font-normal">Budget</span>
                  <span className="text-emerald-700 text-sm font-black">+25 pts</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-purple-200 text-purple-900">
                  <span className="block text-[10px] text-slate-500 font-normal">Chambres</span>
                  <span className="text-emerald-700 text-sm font-black">+15 pts</span>
                </div>
                <div className="p-2 rounded-xl bg-white border border-purple-200 text-purple-900 col-span-2 sm:col-span-1">
                  <span className="block text-[10px] text-slate-500 font-normal">Salles de bain</span>
                  <span className="text-emerald-700 text-sm font-black">+10 pts</span>
                </div>
              </div>
            </div>

            {/* Rappel des critères demandés par le client */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center gap-3">
              <span className="font-bold text-slate-700 text-[11px] uppercase">Critères client :</span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-bold">
                {matchingModalRequest.project_type || matchingModalRequest.projet} • {matchingModalRequest.property_type || matchingModalRequest.typeBien}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 font-semibold flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>{matchingModalRequest.commune || matchingModalRequest.localisation?.commune} {matchingModalRequest.quartier ? `(${matchingModalRequest.quartier})` : ''}</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-emerald-700 font-mono font-bold">
                Budget max : {Number(matchingModalRequest.budget_max || matchingModalRequest.budget?.max || 0).toLocaleString()} {matchingModalRequest.currency || matchingModalRequest.budget?.devise || 'USD'}
              </span>
              {(matchingModalRequest.bedrooms || matchingModalRequest.caracteristiques?.chambres) && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                  {matchingModalRequest.bedrooms || matchingModalRequest.caracteristiques?.chambres} Chambres
                </span>
              )}
              {(matchingModalRequest.bathrooms || matchingModalRequest.caracteristiques?.sallesDeBain) && (
                <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                  {matchingModalRequest.bathrooms || matchingModalRequest.caracteristiques?.sallesDeBain} Salles de bain
                </span>
              )}
            </div>

            {/* Liste ordonnée par score de pertinence décroissant */}
            {(() => {
              const matchedList = findMatchingProperties(matchingModalRequest, properties, { minScore: 5, limit: 25 });

              if (matchedList.length === 0) {
                return (
                  <div className="p-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <AlertCircle className="w-10 h-10 text-slate-400 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">Aucun bien correspondant pour le moment</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Aucune propriété publiée ne correspond actuellement aux critères de cette demande. Dès qu'une nouvelle annonce sera créée dans la même commune ou avec un budget compatible, elle apparaîtra ici automatiquement.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      <strong>{matchedList.length} bien(s)</strong> correspondant(s) trouvé(s) — classés du plus pertinent au moins pertinent :
                    </span>
                    <span className="text-[11px] font-semibold text-purple-700">
                      Top score : {matchedList[0]?.score || 0}%
                    </span>
                  </div>

                  <div className="space-y-3">
                    {matchedList.map((m, idx) => {
                      const clientWa = (matchingModalRequest.whatsapp || matchingModalRequest.phone || '').replace(/[^0-9]/g, '');
                      const clientName = matchingModalRequest.full_name || matchingModalRequest.client?.nomComplet || 'Cher Client';

                      let badgeTheme = 'bg-amber-100 text-amber-900 border-amber-300';
                      let labelMatch = 'Correspondance Partielle';
                      if (m.score >= 80) {
                        badgeTheme = 'bg-emerald-100 text-emerald-950 border-emerald-300';
                        labelMatch = 'Excellente Correspondance';
                      } else if (m.score >= 50) {
                        badgeTheme = 'bg-blue-100 text-blue-950 border-blue-300';
                        labelMatch = 'Bonne Correspondance';
                      }

                      return (
                        <div
                          key={m.property.id}
                          className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 hover:border-purple-300 transition-all space-y-3 shadow-xs"
                        >
                          {/* Ligne 1 : Rang, Titre & Score */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                                #{idx + 1}
                              </span>
                              <div className="space-y-0.5">
                                <h4 className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors">
                                  {m.property.title}
                                </h4>
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>{m.property.commune} {m.property.quartier ? `(${m.property.quartier})` : ''} • {m.property.type}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className={`px-3 py-1.5 rounded-2xl border font-black text-xs flex items-center gap-1.5 shadow-2xs ${badgeTheme}`}>
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                <span>Score : {m.score} / 100</span>
                                <span className="text-[10px] font-normal opacity-80 hidden sm:inline">({labelMatch})</span>
                              </div>
                            </div>
                          </div>

                          {/* Ligne 2 : Détails des points attribués (Scoring breakdown) */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
                            <div className={`p-2 rounded-xl border ${m.breakdown.locationScore > 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                              <span className="block text-[10px] text-slate-500">Localisation (30)</span>
                              <span className="font-bold">+{m.breakdown.locationScore} pts</span>
                            </div>
                            <div className={`p-2 rounded-xl border ${m.breakdown.typeScore > 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                              <span className="block text-[10px] text-slate-500">Type bien (20)</span>
                              <span className="font-bold">+{m.breakdown.typeScore} pts</span>
                            </div>
                            <div className={`p-2 rounded-xl border ${m.breakdown.budgetScore > 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                              <span className="block text-[10px] text-slate-500">Budget (25)</span>
                              <span className="font-bold">+{m.breakdown.budgetScore} pts</span>
                            </div>
                            <div className={`p-2 rounded-xl border ${m.breakdown.bedroomsScore > 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                              <span className="block text-[10px] text-slate-500">Chambres (15)</span>
                              <span className="font-bold">+{m.breakdown.bedroomsScore} pts</span>
                            </div>
                            <div className={`p-2 rounded-xl border ${m.breakdown.bathroomsScore > 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'} col-span-2 sm:col-span-1`}>
                              <span className="block text-[10px] text-slate-500">Salles d'eau (10)</span>
                              <span className="font-bold">+{m.breakdown.bathroomsScore} pts</span>
                            </div>
                          </div>

                          {/* Ligne 3 : Informations sur le bien & Raisons du match */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                            <div className="flex items-center gap-3">
                              <img
                                src={m.property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400'}
                                alt={m.property.title}
                                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                              <div className="space-y-0.5">
                                <span className="font-mono font-black text-sm text-emerald-700">
                                  {m.property.price.toLocaleString()} {m.property.currency}
                                  {m.property.period ? ` / ${m.property.period}` : ''}
                                </span>
                                <span className="text-slate-600 block text-[11px]">
                                  {m.property.bedrooms} chambres • {m.property.bathrooms} sdb • {m.property.area} m²
                                </span>
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {m.breakdown.reasons.slice(0, 2).map((r, i) => (
                                    <span key={i} className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                      ✓ {r}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Actions rapides */}
                            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                              {/* Bouton planifier visite */}
                              <button
                                type="button"
                                onClick={() => handlePlanVisitForMatchedProperty(matchingModalRequest, m.property, m.score)}
                                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                                title="Planifier une visite immobilière pour ce bien"
                              >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Planifier une visite</span>
                              </button>

                              {/* Proposer WhatsApp */}
                              {clientWa && (
                                <a
                                  href={`https://wa.me/${clientWa}?text=${encodeURIComponent(
                                    `Bonjour ${clientName}, suite à votre demande de conciergerie Kinimmo [${matchingModalRequest.reference || matchingModalRequest.id}], notre système a identifié ce bien qui correspond à ${m.score}% à vos critères :\n\n🏡 *${m.property.title}*\n📍 Localisation : ${m.property.commune} ${m.property.quartier ? `(${m.property.quartier})` : ''}\n💵 Prix : ${m.property.price.toLocaleString()} ${m.property.currency}\n🛏️ Spécifications : ${m.property.bedrooms} ch. • ${m.property.bathrooms} sdb\n\nSouhaitez-vous planifier une visite avec l'un de nos conseillers ?`
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                                  title="Partager cette annonce au client sur WhatsApp"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Pied de page modale */}
            <div className="pt-3 flex items-center justify-end border-t border-slate-200">
              <button
                type="button"
                onClick={() => setMatchingModalRequest(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-all"
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
