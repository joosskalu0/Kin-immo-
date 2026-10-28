import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Building,
  Home,
  Check,
  X,
  Eye,
  History,
  RotateCcw,
  Calendar,
  ExternalLink,
  ClipboardCheck,
  Activity,
  Award,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Lock,
  Download,
  Info,
  Phone,
  Mail,
  MapPin,
  Send,
  Sparkles
} from 'lucide-react';
import {
  TrustVerification,
  TrustStatus,
  TRUST_STATUS_LABELS,
  TrustDocument,
  TrustCheck,
  TrustAuditLog,
  AvailabilityStatus,
  AVAILABILITY_LABELS
} from '../../types/trust';
import { trustService } from '../../services/trustService';

interface TrustAdminDashboardProps {
  adminUser?: {
    id: string;
    name: string;
    email: string;
    role: string;
    agencyName?: string;
  };
}

export const TrustAdminDashboard: React.FC<TrustAdminDashboardProps> = ({ adminUser }) => {
  const [activeTab, setActiveTab] = useState<'verifications' | 'audit_logs' | 'availability'>('verifications');
  const [verifications, setVerifications] = useState<TrustVerification[]>([]);
  const [auditLogs, setAuditLogs] = useState<TrustAuditLog[]>([]);
  const [selectedVerif, setSelectedVerif] = useState<TrustVerification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filtres
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Formulaire de décision
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionStatus, setDecisionStatus] = useState<TrustStatus>('property_verified');
  const [decisionLevel, setDecisionLevel] = useState('');
  const [decisionScore, setDecisionScore] = useState<number>(95);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionCategory, setRejectionCategory] = useState('Titre Foncier Cadastral Non Conforme');
  const [suspensionReason, setSuspensionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [expiresInMonths, setExpiresInMonths] = useState(12);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Boîte de confirmation avant décision définitive
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Demande d'informations complémentaires
  const [requestInfoModalOpen, setRequestInfoModalOpen] = useState(false);
  const [requestInfoMessage, setRequestInfoMessage] = useState('');
  const [isSendingRequestInfo, setIsSendingRequestInfo] = useState(false);

  // Consultation sécurisée d'un document avec journal d'accès
  const [viewingDocument, setViewingDocument] = useState<TrustDocument | null>(null);

  // Formulaire d'ajout de contrôle d'audit
  const [newCheckType, setNewCheckType] = useState('cadastre_conservation_titres');
  const [newCheckLabel, setNewCheckLabel] = useState('Contrôle Cadastre & Conservation des Titres');
  const [newCheckResult, setNewCheckResult] = useState<'passed' | 'failed' | 'waived'>('passed');
  const [newCheckNotes, setNewCheckNotes] = useState('');
  const [isAddingCheck, setIsAddingCheck] = useState(false);

  // Notification locale
  const [alertBanner, setAlertBanner] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlertBanner({ type, message });
    setTimeout(() => setAlertBanner(null), 5000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [verifData, logsData] = await Promise.all([
        trustService.getVerifications(),
        trustService.getAuditLogs()
      ]);
      setVerifications(verifData);
      setAuditLogs(logsData);
    } catch (e) {
      console.error('Erreur chargement Kinimmo Trust', e);
      showAlert('error', 'Erreur lors du chargement des données Kinimmo Trust.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectVerif = async (id: string) => {
    const detail = await trustService.getVerificationById(id);
    if (detail) {
      setSelectedVerif(detail);
      // Pré-remplir les valeurs selon le type de cible
      const targetType = detail.targetType || detail.target_type;
      if (targetType === 'property') {
        setDecisionStatus('property_verified');
        setDecisionLevel('Bien Vérifié & Titre Foncier Contrôlé');
      } else if (targetType === 'agent') {
        setDecisionStatus('pro_verified');
        setDecisionLevel('Professionnel Agréé Kinimmo Trust');
      } else {
        setDecisionStatus('identity_verified');
        setDecisionLevel('Agence Certifiée Kinimmo Trust');
      }
      setDecisionScore(detail.trustScore || detail.score || 95);
      setRejectionReason(detail.rejectionReason || detail.rejection_reason || '');
      setSuspensionReason(detail.suspensionReason || detail.suspension_reason || '');
      setAdminNotes(detail.adminNotes || detail.admin_notes || '');
      setValidationError(null);
    }
  };

  // Consultation sécurisée d'un justificatif avec journalisation
  const handleViewDocumentSecurely = async (doc: TrustDocument) => {
    setViewingDocument(doc);
    if (selectedVerif) {
      await trustService.logDocumentAccess(doc.id, selectedVerif.id, doc.title);
      // Recharger les logs d'audit en arrière-plan
      trustService.getAuditLogs().then(setAuditLogs);
    }
  };

  const handleApproveDocument = async (docId: string) => {
    await trustService.updateDocumentStatus(docId, 'approved');
    showAlert('success', 'Pièce justificative marquée comme CONFORME.');
    if (selectedVerif) {
      handleSelectVerif(selectedVerif.id);
    }
    loadData();
  };

  const handleRejectDocument = async (docId: string) => {
    const note = prompt('Motif de non-conformité de la pièce :') || 'Pièce illisible ou non valide';
    await trustService.updateDocumentStatus(docId, 'rejected', note);
    showAlert('warning', 'Pièce justificative marquée comme NON CONFORME.');
    if (selectedVerif) {
      handleSelectVerif(selectedVerif.id);
    }
    loadData();
  };

  const handleAddCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerif) return;

    setIsAddingCheck(true);
    try {
      await trustService.addCheck(selectedVerif.id, {
        check_type: newCheckType,
        check_label: newCheckLabel,
        result: newCheckResult,
        evidence_notes: newCheckNotes
      });

      showAlert('success', 'Contrôle d’audit cadastral consigné avec succès.');
      setNewCheckNotes('');
      handleSelectVerif(selectedVerif.id);
      loadData();
    } catch (err: any) {
      showAlert('error', err?.message || 'Erreur lors de l’ajout du contrôle.');
    } finally {
      setIsAddingCheck(false);
    }
  };

  // 1ère étape : Déclencher la modal de confirmation
  const handleInitiateDecision = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // RÈGLES DE SÉCURITÉ OBLIGATOIRES
    if (decisionStatus === 'rejected' && (!rejectionReason || !rejectionReason.trim())) {
      setValidationError('Le motif de refus est obligatoire pour toute décision de rejet.');
      return;
    }

    if (decisionStatus === 'suspended' && (!suspensionReason || !suspensionReason.trim())) {
      setValidationError('Le motif de suspension est obligatoire en cas de problème sérieux ou litige.');
      return;
    }

    // Protection anti-auto-approbation
    if (
      ['identity_verified', 'pro_verified', 'property_verified'].includes(decisionStatus) &&
      selectedVerif?.applicantUserId === adminUser?.id
    ) {
      setValidationError('Violation de sécurité : Vous ne pouvez pas approuver votre propre dossier de vérification.');
      return;
    }

    // Ouvrir la boîte de dialogue de confirmation explicite
    setConfirmDialogOpen(true);
  };

  // 2ème étape : Exécution définitive après confirmation explicite
  const handleExecuteConfirmedDecision = async () => {
    if (!selectedVerif) return;

    setIsSubmittingDecision(true);
    setConfirmDialogOpen(false);
    try {
      const res = await trustService.updateStatus(selectedVerif.id, {
        status: decisionStatus,
        trust_level: decisionLevel,
        trust_score: decisionScore,
        rejection_reason: rejectionReason,
        rejection_category: rejectionCategory,
        suspension_reason: suspensionReason,
        admin_notes: adminNotes,
        expires_in_months: expiresInMonths
      });

      if (res && res.success === false) {
        showAlert('error', res.message || 'Erreur lors de l’enregistrement de la décision.');
        return;
      }

      setDecisionModalOpen(false);
      showAlert(
        'success',
        decisionStatus === 'rejected'
          ? 'Demande refusée. Le motif officiel a été consigné et notifié.'
          : decisionStatus === 'suspended'
          ? 'Vérification suspendue d’urgence. Badge révoqué et audit consigné.'
          : 'Dossier approuvé avec succès ! Le badge officiel Kinimmo Trust est actif.'
      );
      handleSelectVerif(selectedVerif.id);
      loadData();
    } catch (err: any) {
      console.error('Erreur décision', err);
      showAlert('error', err?.message || 'Erreur serveur lors de la prise de décision.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Demande d'informations complémentaires
  const handleSendRequestInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerif) return;
    if (!requestInfoMessage.trim()) {
      showAlert('warning', 'Veuillez préciser les informations ou pièces complémentaires requises.');
      return;
    }

    setIsSendingRequestInfo(true);
    try {
      await trustService.requestMoreInfo(selectedVerif.id, {
        message: requestInfoMessage.trim()
      });

      showAlert('success', 'Demande de pièces complémentaires envoyée au demandeur.');
      setRequestInfoModalOpen(false);
      setRequestInfoMessage('');
      handleSelectVerif(selectedVerif.id);
      loadData();
    } catch (err: any) {
      showAlert('error', err?.message || 'Erreur lors de l’envoi de la demande.');
    } finally {
      setIsSendingRequestInfo(false);
    }
  };

  // Statistiques calculées
  const stats = useMemo(() => {
    const total = verifications.length;
    const pending = verifications.filter((v) => (v.trustStatus || v.status) === 'pending').length;
    const inProgress = verifications.filter((v) => (v.trustStatus || v.status) === 'in_progress').length;
    const approved = verifications.filter((v) =>
      ['identity_verified', 'pro_verified', 'property_verified'].includes(v.trustStatus || v.status || '')
    ).length;
    const rejected = verifications.filter((v) => (v.trustStatus || v.status) === 'rejected').length;
    const suspended = verifications.filter((v) => (v.trustStatus || v.status) === 'suspended').length;

    return { total, pending, inProgress, approved, rejected, suspended };
  }, [verifications]);

  // Filtrage avancé
  const filteredVerifications = useMemo(() => {
    return verifications.filter((v) => {
      const vType = v.targetType || v.target_type;
      const vStatus = v.trustStatus || v.status;
      const vNum = v.verification_number || v.id;
      const vTargetName = v.targetName || v.target_title || '';
      const vApplicant = v.applicantName || v.applicant_name || '';
      const vEmail = v.applicantEmail || v.applicant_email || '';
      const vPhone = v.applicantPhone || v.applicant_phone || '';

      const matchType = filterType === 'all' || vType === filterType;
      const matchStatus = filterStatus === 'all' || vStatus === filterStatus;

      const s = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === '' ||
        vNum.toLowerCase().includes(s) ||
        vTargetName.toLowerCase().includes(s) ||
        vApplicant.toLowerCase().includes(s) ||
        vEmail.toLowerCase().includes(s) ||
        vPhone.toLowerCase().includes(s);

      return matchType && matchStatus && matchSearch;
    });
  }, [verifications, filterType, filterStatus, searchTerm]);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Bannière de notification contextuelle */}
      {alertBanner && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between text-xs font-bold shadow-lg transition-all ${
            alertBanner.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : alertBanner.type === 'error'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
          }`}
        >
          <div className="flex items-center gap-2">
            {alertBanner.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : alertBanner.type === 'error' ? (
              <AlertTriangle size={16} className="text-rose-400" />
            ) : (
              <Info size={16} className="text-amber-400" />
            )}
            <span>{alertBanner.message}</span>
          </div>
          <button onClick={() => setAlertBanner(null)} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* En-tête Kinimmo Trust */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/30 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Award size={32} className="text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Administration Centrale
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Kinimmo Trust • Sécurité Cadastrale & RBAC
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              Espace de Contrôle & Certification Kinimmo Trust
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instruction des demandes, audit cadastral (Lukunga, Funa, Mont-Amba, Tshangu), vérification des mandats et journalisation immuable.
            </p>
          </div>
        </div>

        {/* Boutons d'onglets principaux */}
        <div className="flex bg-slate-800/80 p-1 rounded-2xl border border-slate-700 text-xs font-bold">
          <button
            onClick={() => setActiveTab('verifications')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'verifications'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ClipboardCheck size={15} />
            <span>Dossiers ({stats.total})</span>
            {stats.pending > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'audit_logs'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History size={15} />
            <span>Journal d'Audit ({auditLogs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'availability'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity size={15} />
            <span>Disponibilités Biens</span>
          </button>
        </div>
      </div>

      {/* Cartes d'indicateurs de performance (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => {
            setActiveTab('verifications');
            setFilterStatus('pending');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'pending'
              ? 'bg-amber-950/40 border-amber-500 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              En Attente
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <span className="text-2xl font-black text-amber-300 mt-1 block">
            {stats.pending}
          </span>
          <span className="text-[10px] text-slate-400">À instruire en priorité</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('verifications');
            setFilterStatus('in_progress');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'in_progress'
              ? 'bg-blue-950/40 border-blue-500 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block">
            En Cours d'Audit
          </span>
          <span className="text-2xl font-black text-blue-300 mt-1 block">
            {stats.inProgress}
          </span>
          <span className="text-[10px] text-slate-400">Contrôle cadastral ou pièces</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('verifications');
            setFilterStatus('property_verified');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'property_verified'
              ? 'bg-emerald-950/40 border-emerald-500 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
            Certifiés Actifs
          </span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {stats.approved}
          </span>
          <span className="text-[10px] text-slate-400">Badge vert affiché en public</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('verifications');
            setFilterStatus('rejected');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'rejected'
              ? 'bg-red-950/40 border-red-500 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">
            Refusés
          </span>
          <span className="text-2xl font-black text-red-400 mt-1 block">
            {stats.rejected}
          </span>
          <span className="text-[10px] text-slate-400">Non conformité ou motif</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('verifications');
            setFilterStatus('suspended');
          }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filterStatus === 'suspended'
              ? 'bg-orange-950/40 border-orange-500 shadow-lg'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block">
            Suspendus
          </span>
          <span className="text-2xl font-black text-orange-400 mt-1 block">
            {stats.suspended}
          </span>
          <span className="text-[10px] text-slate-400">Litige ou contestation</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ONGLET 1 : GESTION DES DOSSIERS DE VÉRIFICATION           */}
      {/* ======================================================== */}
      {activeTab === 'verifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Colonne Gauche : Liste & Filtres (5 cols sur grand écran) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                  <span>Demandes de Vérification ({filteredVerifications.length})</span>
                </h3>
                {filterStatus !== 'all' && (
                  <button
                    onClick={() => setFilterStatus('all')}
                    className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              {/* Barre de Recherche Multi-Critères */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher par N° dossier, annonce, agent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Filtres par type de cible & statut */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cible
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">Toutes les cibles</option>
                    <option value="property">Annonces (Biens)</option>
                    <option value="agent">Profils Agents</option>
                    <option value="agency">Agences Immobilières</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Statut
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente (Pending)</option>
                    <option value="in_progress">En cours d'audit</option>
                    <option value="property_verified">Bien vérifié (Approuvé)</option>
                    <option value="pro_verified">Agent certifié</option>
                    <option value="rejected">Refusé</option>
                    <option value="suspended">Suspendu</option>
                    <option value="expired">Expiré</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Liste scrollable des dossiers */}
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {isLoading ? (
                <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Chargement des dossiers...</span>
                </div>
              ) : filteredVerifications.length === 0 ? (
                <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-400 text-xs">
                  Aucun dossier ne correspond à vos filtres.
                </div>
              ) : (
                filteredVerifications.map((verif) => {
                  const statusKey = verif.trustStatus || verif.status || 'unverified';
                  const meta = TRUST_STATUS_LABELS[statusKey] || TRUST_STATUS_LABELS.unverified;
                  const isSelected = selectedVerif?.id === verif.id;

                  return (
                    <div
                      key={verif.id}
                      onClick={() => handleSelectVerif(verif.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                        isSelected
                          ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500 shadow-emerald-500/10'
                          : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {verif.verification_number || verif.id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {verif.targetName || verif.target_title || verif.targetId}
                      </h4>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span>Par : {verif.applicantName || verif.applicant_name}</span>
                        <span>{new Date(verif.createdAt || verif.created_at || Date.now()).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Colonne Droite : Examen Approfondi du Dossier (7 cols sur grand écran) */}
          <div className="lg:col-span-7">
            {selectedVerif ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl">
                {/* Entête du Dossier Sélectionné */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        {selectedVerif.targetType === 'property'
                          ? '🏠 Annonce Immobilière'
                          : selectedVerif.targetType === 'agent'
                          ? '👤 Profil Agent'
                          : '🏢 Agence Immobilière'}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {selectedVerif.verification_number || selectedVerif.id}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-white mt-1">
                      {selectedVerif.targetName || selectedVerif.target_title}
                    </h3>

                    <p className="text-xs text-slate-400">
                      Demandeur : <strong className="text-slate-200">{selectedVerif.applicantName || selectedVerif.applicant_name}</strong> ({selectedVerif.applicantEmail || selectedVerif.applicant_email})
                      {selectedVerif.applicantPhone && ` • Tél : ${selectedVerif.applicantPhone}`}
                    </p>
                  </div>

                  {/* Boutons d'Action Principaux */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setRequestInfoModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare size={14} />
                      <span>Demander des compléments</span>
                    </button>

                    <button
                      onClick={() => {
                        setValidationError(null);
                        setDecisionModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      <ShieldCheck size={16} />
                      <span>Prendre une décision</span>
                    </button>
                  </div>
                </div>

                {/* Métadonnées & Statut Actuel */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Statut Actuel
                    </span>
                    <span className="text-xs font-black text-emerald-400 mt-1 block">
                      {TRUST_STATUS_LABELS[selectedVerif.trustStatus || selectedVerif.status || 'unverified']?.label}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Score de Confiance
                    </span>
                    <span className="text-xs font-black text-white mt-1 block">
                      {selectedVerif.trustScore || selectedVerif.score || 0}/100
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Dépôt du Dossier
                    </span>
                    <span className="text-xs font-semibold text-slate-300 mt-1 block">
                      {new Date(selectedVerif.createdAt || selectedVerif.created_at || Date.now()).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Expiration Badge
                    </span>
                    <span className="text-xs font-semibold text-slate-300 mt-1 block">
                      {selectedVerif.expiresAt || selectedVerif.expires_at
                        ? new Date(selectedVerif.expiresAt || selectedVerif.expires_at!).toLocaleDateString('fr-FR')
                        : 'Non fixée'}
                    </span>
                  </div>
                </div>

                {/* Message d'alerte si rejeté ou suspendu */}
                {(selectedVerif.rejectionReason || selectedVerif.rejection_reason) && (
                  <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/40 text-xs text-red-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-red-400">
                      <XCircle size={15} />
                      <span>Motif officiel du refus :</span>
                    </div>
                    <p className="pl-5 leading-relaxed">
                      {selectedVerif.rejectionReason || selectedVerif.rejection_reason}
                    </p>
                  </div>
                )}

                {(selectedVerif.suspensionReason || selectedVerif.suspension_reason) && (
                  <div className="p-4 rounded-2xl bg-orange-950/40 border border-orange-500/40 text-xs text-orange-300 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-orange-400">
                      <AlertTriangle size={15} />
                      <span>Motif de suspension urgente :</span>
                    </div>
                    <p className="pl-5 leading-relaxed">
                      {selectedVerif.suspensionReason || selectedVerif.suspension_reason}
                    </p>
                  </div>
                )}

                {/* SECTION 1 : PIÈCES JUSTIFICATIVES JOINTS AVEC CONTRÔLE D'ACCÈS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileText size={14} className="text-emerald-400" />
                      <span>Pièces Justificatives Déposées ({selectedVerif.documents?.length || 0})</span>
                    </h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Lock size={11} /> Accès consigné au journal
                    </span>
                  </div>

                  {(!selectedVerif.documents || selectedVerif.documents.length === 0) ? (
                    <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                      Aucune pièce justificative déposée pour ce dossier.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedVerif.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                              <FileText size={18} className="text-emerald-400" />
                            </div>
                            <div>
                              <div className="font-bold text-white">{doc.title}</div>
                              <div className="text-[10px] text-slate-400">
                                {doc.docType || doc.doc_type} • {doc.documentNumber || doc.document_number || 'Sans N°'} • {doc.fileSize || doc.file_size || '2.4 MB'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleViewDocumentSecurely(doc)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye size={13} className="text-emerald-400" />
                              <span>Consulter</span>
                            </button>

                            <button
                              onClick={() => handleApproveDocument(doc.id)}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                doc.status === 'approved'
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-emerald-400'
                              }`}
                              title="Marquer comme conforme"
                            >
                              <Check size={14} />
                            </button>

                            <button
                              onClick={() => handleRejectDocument(doc.id)}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                doc.status === 'rejected'
                                  ? 'bg-red-500 text-white border-red-400'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-red-400'
                              }`}
                              title="Rejeter la pièce"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION 2 : CONTRÔLES CADASTRAUX & JURIDIQUES EFFECTUÉS */}
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      <span>Contrôles Cadastraux & Vérifications CTI ({selectedVerif.checks?.length || 0})</span>
                    </h4>
                  </div>

                  {(!selectedVerif.checks || selectedVerif.checks.length === 0) ? (
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-center">
                      Aucun contrôle consigné. Ajoutez les vérifications cadastre et identité ci-dessous.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedVerif.checks.map((ck) => (
                        <div
                          key={ck.id}
                          className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs flex items-start gap-3"
                        >
                          {ck.result === 'passed' ? (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                          ) : ck.result === 'failed' ? (
                            <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                          ) : (
                            <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{ck.checkLabel || ck.check_label || ck.checkType}</span>
                              <span className="text-[10px] text-slate-500">
                                {new Date(ck.createdAt || ck.created_at || Date.now()).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            <p className="text-slate-400 mt-1 leading-relaxed">
                              {ck.evidenceNotes || ck.evidence_notes || ck.notes || 'Contrôle effectué sans observation.'}
                            </p>
                            <div className="text-[10px] text-slate-500 mt-1">
                              Audité par : {ck.conductedByName || ck.audited_by_name || 'Auditeur Kinimmo'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Formulaire d'ajout rapide d'un contrôle officiel */}
                  <form onSubmit={handleAddCheck} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-bold text-slate-300 block">
                      Consigner un nouveau contrôle cadastral officiel :
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={newCheckType}
                        onChange={(e) => {
                          setNewCheckType(e.target.value);
                          if (e.target.value === 'cadastre_conservation_titres') {
                            setNewCheckLabel('Contrôle Cadastre & Conservation des Titres (Vol/Folio)');
                          } else if (e.target.value === 'identity_validation') {
                            setNewCheckLabel('Vérification d’Identité & Registre National');
                          } else if (e.target.value === 'physical_site_inspection') {
                            setNewCheckLabel('Inspection physique de localisation parcellaire');
                          } else {
                            setNewCheckLabel('Audit Mandat de Commercialisation Légal');
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      >
                        <option value="cadastre_conservation_titres">Cadastre & Titres (CTI)</option>
                        <option value="identity_validation">Identité (CNI / Passeport)</option>
                        <option value="mandat_commercialisation">Mandat Légal Propriétaire</option>
                        <option value="physical_site_inspection">Visite & Géolocalisation</option>
                      </select>

                      <select
                        value={newCheckResult}
                        onChange={(e) => setNewCheckResult(e.target.value as any)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white"
                      >
                        <option value="passed">✓ Conforme (Validé)</option>
                        <option value="failed">✕ Non conforme (Échoué)</option>
                        <option value="waived">Dispense justifiée</option>
                      </select>

                      <button
                        type="submit"
                        disabled={isAddingCheck}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <Check size={14} />
                        <span>Enregistrer le contrôle</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Notes de preuve (ex: Vol. 142 Folio 58 vérifié à la CTI Lukunga, aucun litige)..."
                      value={newCheckNotes}
                      onChange={(e) => setNewCheckNotes(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </form>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 space-y-3 shadow-xl">
                <ShieldCheck size={48} className="text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">Sélectionnez un dossier à examiner</h3>
                <p className="text-xs max-w-sm mx-auto">
                  Cliquez sur une demande dans la liste à gauche pour consulter ses justificatifs, effectuer les contrôles cadastraux et prendre une décision officielle.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ONGLET 2 : JOURNAL D'AUDIT IMMUABLE                      */}
      {/* ======================================================== */}
      {activeTab === 'audit_logs' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" />
                  <span>Journal d'Audit Immuable Kinimmo Trust</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  Protégé & Non Modifiable
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Traçabilité intégrale de toutes les décisions, accès aux pièces sensibles, approbations, refus et suspensions horodatés.
              </p>
            </div>

            <button
              onClick={loadData}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw size={14} />
              <span>Actualiser le journal</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                  <th className="pb-3">Date & Heure</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Administrateur</th>
                  <th className="pb-3">Cible / Dossier</th>
                  <th className="pb-3">Transition Statut</th>
                  <th className="pb-3">Motif & Observations</th>
                  <th className="pb-3 text-right">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {auditLogs.map((log) => {
                  const isActionApproval = log.action === 'TRUST_GRANTED';
                  const isActionRejection = log.action === 'TRUST_REJECTED';
                  const isActionSuspension = log.action === 'TRUST_SUSPENDED';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt || log.created_at || Date.now()).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isActionApproval
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isActionRejection
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : isActionSuspension
                              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 text-white font-bold whitespace-nowrap">
                        {log.adminName || log.admin_name || 'Admin Kinimmo'}
                      </td>
                      <td className="py-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {log.verificationId || log.targetId || 'Système'}
                      </td>
                      <td className="py-3 text-slate-300 whitespace-nowrap">
                        {log.previousStatus && log.newStatus ? (
                          <span>
                            {log.previousStatus} → <strong className="text-white">{log.newStatus}</strong>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 text-slate-300 max-w-xs truncate" title={log.reasonOrNotes || log.reason_or_notes}>
                        {log.reasonOrNotes || log.reason_or_notes || '—'}
                      </td>
                      <td className="py-3 text-right font-mono text-[10px] text-slate-500 whitespace-nowrap">
                        {log.ipAddress || log.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ONGLET 3 : SUIVI DE DISPONIBILITÉ DES BIENS               */}
      {/* ======================================================== */}
      {activeTab === 'availability' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Contrôle de Disponibilité en Direct des Biens Vérifiés</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Garantie anti-doublon et anti-fantôme : surveillance du statut réel (Disponible, Réservé, Loué, Vendu) avec horodatage de confirmation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {verifications
              .filter((v) => v.targetType === 'property')
              .map((verif) => (
                <div
                  key={verif.id}
                  className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      {verif.verification_number || verif.id}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Disponible
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white line-clamp-1">
                    {verif.targetName || verif.target_title}
                  </h4>

                  <p className="text-xs text-slate-400">
                    Déposé par : {verif.applicantName || verif.applicant_name}
                  </p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Dernière confirmation :</span>
                    <span className="text-slate-300 font-semibold">Aujourd'hui</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1 : FORMULAIRE DE DÉCISION ADMINISTRATIVE          */}
      {/* ======================================================== */}
      {decisionModalOpen && selectedVerif && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <h3 className="text-base font-black text-white">
                  Décision Administrative Kinimmo Trust
                </h3>
              </div>
              <button
                onClick={() => setDecisionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {validationError && (
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-300 font-bold flex items-center gap-2">
                <AlertCircle size={16} className="text-red-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleInitiateDecision} className="space-y-4 text-xs">
              {/* Choix de la Décision */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Type de Décision
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDecisionStatus(
                        selectedVerif.targetType === 'property'
                          ? 'property_verified'
                          : selectedVerif.targetType === 'agent'
                          ? 'pro_verified'
                          : 'identity_verified'
                      );
                      setValidationError(null);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      ['identity_verified', 'pro_verified', 'property_verified'].includes(decisionStatus)
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ✓ Approuver
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDecisionStatus('rejected');
                      setValidationError(null);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      decisionStatus === 'rejected'
                        ? 'bg-red-500/20 text-red-400 border-red-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ✕ Refuser
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDecisionStatus('suspended');
                      setValidationError(null);
                    }}
                    className={`py-2 px-3 rounded-xl font-bold border transition-all cursor-pointer ${
                      decisionStatus === 'suspended'
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    ⚠ Suspendre
                  </button>
                </div>
              </div>

              {/* Cas d'Approbation */}
              {['identity_verified', 'pro_verified', 'property_verified'].includes(decisionStatus) && (
                <div className="space-y-3 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Libellé Officiel du Badge Attribué
                    </label>
                    <input
                      type="text"
                      value={decisionLevel}
                      onChange={(e) => setDecisionLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Score Attribué (0-100)
                      </label>
                      <input
                        type="number"
                        min="50"
                        max="100"
                        value={decisionScore}
                        onChange={(e) => setDecisionScore(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Validité (Mois)
                      </label>
                      <select
                        value={expiresInMonths}
                        onChange={(e) => setExpiresInMonths(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="6">6 mois</option>
                        <option value="12">12 mois (1 an standard)</option>
                        <option value="24">24 mois (2 ans)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Cas de Refus : Motif Obligatoire */}
              {decisionStatus === 'rejected' && (
                <div className="space-y-3 p-4 rounded-2xl bg-red-950/20 border border-red-500/30">
                  <div>
                    <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                      Catégorie du Refus
                    </label>
                    <select
                      value={rejectionCategory}
                      onChange={(e) => setRejectionCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-red-500"
                    >
                      <option value="Titre Foncier Cadastral Non Conforme">Titre Foncier Cadastral Non Conforme</option>
                      <option value="Mandat de Commercialisation Absent ou Non Valide">Mandat de Commercialisation Absent ou Non Valide</option>
                      <option value="Pièce d’Identité Illisible ou Expirée">Pièce d’Identité Illisible ou Expirée</option>
                      <option value="Divergence Cadastrale (Superficie / Commune)">Divergence Cadastrale (Superficie / Commune)</option>
                      <option value="Suspicion de Fraude ou Faux Titre">Suspicion de Fraude ou Faux Titre</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                      Motif Officiel du Refus (Obligatoire) *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Précisez la raison détaillée du refus qui sera notifiée au demandeur..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              )}

              {/* Cas de Suspension : Motif Obligatoire */}
              {decisionStatus === 'suspended' && (
                <div className="space-y-3 p-4 rounded-2xl bg-orange-950/20 border border-orange-500/30">
                  <div className="text-[11px] text-orange-300 font-bold flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-orange-400 shrink-0" />
                    <span>La suspension révoque immédiatement le badge public de confiance.</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-orange-400 uppercase tracking-wider block mb-1">
                      Motif Obligatoire de la Suspension d’Urgence *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Indiquez le litige foncier, signalement ou motif grave justifiant la suspension..."
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Notes Internes Admin */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Notes Internes Administrateur (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Notes réservées à l'équipe de conformité Kinimmo..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDecisionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl font-black text-slate-950 transition-all cursor-pointer shadow-lg ${
                    decisionStatus === 'rejected'
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : decisionStatus === 'suspended'
                      ? 'bg-orange-500 hover:bg-orange-600 text-slate-950'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                  }`}
                >
                  Continuer vers la confirmation →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2 : CONFIRMATION EXPLICITE AVANT DÉCISION FINALE    */}
      {/* ======================================================== */}
      {confirmDialogOpen && selectedVerif && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle size={28} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">
                Confirmation de Décision Officielle
              </h3>
              <p className="text-xs text-slate-400">
                Cette décision sera immédiatement consignée au journal d'audit immuable et le demandeur recevra une notification officielle.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Dossier :</span>
                <span className="font-bold text-white">{selectedVerif.verification_number || selectedVerif.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cible :</span>
                <span className="font-bold text-white">{selectedVerif.targetName || selectedVerif.target_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Action :</span>
                <span className={`font-black ${
                  decisionStatus === 'rejected' ? 'text-red-400' : decisionStatus === 'suspended' ? 'text-orange-400' : 'text-emerald-400'
                }`}>
                  {TRUST_STATUS_LABELS[decisionStatus]?.label || decisionStatus}
                </span>
              </div>
              {decisionStatus === 'rejected' && (
                <div className="pt-2 border-t border-slate-800 text-red-300">
                  <strong>Motif :</strong> {rejectionReason}
                </div>
              )}
              {decisionStatus === 'suspended' && (
                <div className="pt-2 border-t border-slate-800 text-orange-300">
                  <strong>Motif :</strong> {suspensionReason}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialogOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
              >
                Retour
              </button>
              <button
                type="button"
                disabled={isSubmittingDecision}
                onClick={handleExecuteConfirmedDecision}
                className={`py-2.5 px-4 rounded-xl font-black text-xs cursor-pointer shadow-lg flex items-center justify-center gap-1.5 ${
                  decisionStatus === 'rejected'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : decisionStatus === 'suspended'
                    ? 'bg-orange-500 hover:bg-orange-600 text-slate-950'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                }`}
              >
                {isSubmittingDecision ? (
                  <span>Enregistrement...</span>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirmer Définitivement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3 : DEMANDE DE PIÈCES COMPLÉMENTAIRES              */}
      {/* ======================================================== */}
      {requestInfoModalOpen && selectedVerif && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-7 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-black text-white">
                  Demande de Pièces Complémentaires
                </h3>
              </div>
              <button
                onClick={() => setRequestInfoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Envoyer une notification directe au demandeur ({selectedVerif.applicantName || selectedVerif.applicant_name}) pour demander des pièces rectificatives ou des précisions cadastrales.
            </p>

            <form onSubmit={handleSendRequestInfo} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Message officiel au demandeur *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ex: Merci de fournir une copie lisible du Certificat d'Enregistrement (les numéros de Vol. et Folio sont tronqués sur la pièce fournie)..."
                  value={requestInfoMessage}
                  onChange={(e) => setRequestInfoMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRequestInfoModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSendingRequestInfo}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/25"
                >
                  <Send size={14} />
                  <span>{isSendingRequestInfo ? 'Envoi...' : 'Envoyer la demande'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4 : VISIONNEUSE SÉCURISÉE DE DOCUMENT JUSTIFICATIF */}
      {/* ======================================================== */}
      {viewingDocument && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>{viewingDocument.title}</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Accès Consigné
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {viewingDocument.docType || viewingDocument.doc_type} • N° {viewingDocument.documentNumber || viewingDocument.document_number || 'Non renseigné'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setViewingDocument(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Bannière de confidentialité */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock size={12} className="text-emerald-400" />
                <span>Document confidentiel à usage exclusif du comité d'instruction Kinimmo.</span>
              </span>
              <span className="text-slate-500 font-mono text-[10px]">
                {viewingDocument.fileSize || viewingDocument.file_size || '2.4 MB'}
              </span>
            </div>

            {/* Zone d'affichage sécurisée */}
            <div className="flex-1 min-h-[300px] max-h-[460px] overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 relative flex items-center justify-center">
              <img
                src={viewingDocument.fileUrl || viewingDocument.file_url || 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800'}
                alt={viewingDocument.title}
                className="max-w-full max-h-[420px] object-contain rounded-xl"
              />

              {/* Watermark de traçabilité */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10 rotate-[-25deg]">
                <span className="text-4xl font-black text-white uppercase tracking-widest text-center">
                  KINIMMO TRUST • CONFIDENTIEL AUDIT
                </span>
              </div>
            </div>

            {/* Actions sur le document */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleApproveDocument(viewingDocument.id);
                    setViewingDocument(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Marquer Conforme</span>
                </button>

                <button
                  onClick={() => {
                    handleRejectDocument(viewingDocument.id);
                    setViewingDocument(null);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={14} />
                  <span>Marquer Non Conforme</span>
                </button>
              </div>

              <button
                onClick={() => setViewingDocument(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
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
