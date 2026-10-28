import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Property, ListingLifecycleStatus, LeadRequest, AgencyCollaborator, AgencyTransaction, AgencyRole } from '../../types';
import {
  LISTING_STATUS_CONFIG,
  getListingLifecycleStatus,
  canBoostProperty,
  createStatusHistoryEntry
} from '../../utils/propertyStatusHelpers';
import { TrustBadge } from '../Trust/TrustBadge';
import { TrustVerificationModal } from '../Trust/TrustVerificationModal';
import {
  Building2,
  Users,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  Award,
  CheckCircle2,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  MessageCircle,
  Clock,
  MapPin,
  FileText,
  AlertTriangle,
  Lock,
  ChevronRight,
  Filter,
  Search,
  Sparkles,
  Receipt,
  ExternalLink,
  Crown,
  Eye,
  Check,
  X,
  BadgeCheck,
  Briefcase,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export type AgencySectionId =
  | 'profile'
  | 'collaborators'
  | 'roles_permissions'
  | 'assignments'
  | 'analytics'
  | 'transactions'
  | 'subscriptions'
  | 'trust_verification';

interface AgencyDashboardViewProps {
  onOpenSubmitProperty?: () => void;
  onOpenSecurityModal?: () => void;
}

export const AgencyDashboardView: React.FC<AgencyDashboardViewProps> = ({
  onOpenSubmitProperty,
  onOpenSecurityModal
}) => {
  const {
    user,
    setUser,
    properties,
    updateProperty,
    updatePropertyListingStatus,
    assignPropertyToAgent,
    setEditingProperty,
    setIsSubmitPropertyOpen,
    setActivePropertyModalId,
    leads,
    updateLeadStatus,
    invoices,
    agencyCollaborators,
    inviteAgencyCollaborator,
    updateAgencyCollaborator,
    deleteAgencyCollaborator,
    agencyTransactions,
    createAgencyTransaction,
    cdfExchangeRate,
    subscriptionPlans
  } = useApp();

  const [activeSection, setActiveSection] = useState<AgencySectionId>('collaborators');

  // 1. Profil de l'agence
  const [agencyName, setAgencyName] = useState(user?.agencyName || 'Congo Luxury Homes SARL');
  const [agencyAddress, setAgencyAddress] = useState('Boulevard du 30 Juin, Gombe, Kinshasa, RDC');
  const [agencyPhone, setAgencyPhone] = useState(user?.phone || '+243 81 000 0001');
  const [agencyWhatsapp, setAgencyWhatsapp] = useState(user?.whatsapp || user?.phone || '+243 81 000 0001');
  const [agencyEmail, setAgencyEmail] = useState(user?.email || 'contact@congoluxuryhomes.cd');
  const [agencyRccm, setAgencyRccm] = useState(user?.rccmOrNif || 'CD/KIN/RCCM/20-B-04921');
  const [agencyNif, setAgencyNif] = useState('A1209384Z');
  const [agencyBio, setAgencyBio] = useState('Agence immobilière de référence à Kinshasa spécialisée dans les résidences diplomatiques, appartements haut standing et transactions commerciales à Gombe, Ngaliema et Limete.');
  const [agencyProfileSuccess, setAgencyProfileSuccess] = useState<string | null>(null);
  const [isTrustModalOpen, setIsTrustModalOpen] = useState(false);

  // 2. Invitation Collaborateur Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('+243 ');
  const [inviteRole, setInviteRole] = useState<AgencyRole>('agency_agent');
  const [invitePermissions, setInvitePermissions] = useState({
    canEditAllProperties: false,
    canAssignProperties: false,
    canAssignLeads: false,
    canViewBilling: false,
    canManageTeam: false
  });
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // 3. Permissions Edit Modal
  const [editingCollabPermissions, setEditingCollabPermissions] = useState<AgencyCollaborator | null>(null);

  // 4. Attribution
  const [assignFilterAgent, setAssignFilterAgent] = useState<string>('ALL');
  const [assignSearch, setAssignSearch] = useState('');
  const [selectedPropertyToAssign, setSelectedPropertyToAssign] = useState<Property | null>(null);
  const [targetAgentForProperty, setTargetAgentForProperty] = useState('');

  // 5. Transactions Modal
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [txPropertyId, setTxPropertyId] = useState('');
  const [txAgentId, setTxAgentId] = useState('');
  const [txClientName, setTxClientName] = useState('');
  const [txClientContact, setTxClientContact] = useState('+243 ');
  const [txType, setTxType] = useState<'sale' | 'rent'>('sale');
  const [txAmount, setTxAmount] = useState<number>(50000);
  const [txCommissionRate, setTxCommissionRate] = useState<number>(5);
  const [txNotes, setTxNotes] = useState('');
  const [txStatus, setTxStatus] = useState<'negotiating' | 'under_contract' | 'closed'>('closed');
  const [txSuccessMsg, setTxSuccessMsg] = useState<string | null>(null);

  // 6. Kinimmo Trust verification state
  const [trustFormSubmitted, setTrustFormSubmitted] = useState(false);

  // Filtrer les annonces de l'agence
  const currentAgencyId = user?.agencyId || (user?.role === 'agency' ? user?.id : 'agency_congo_luxury');
  const currentAgencyName = (user?.agencyName || agencyName).toLowerCase();

  const agencyProperties = properties.filter((p) => {
    if (user?.role === 'admin') return true;
    if (p.agencyId && (p.agencyId === currentAgencyId || p.agencyId === user?.id)) return true;
    if (p.agencyName && p.agencyName.toLowerCase() === currentAgencyName) return true;
    if (agencyCollaborators.some((c) => c.userId === p.agentId || c.id === p.agentId)) return true;
    return false;
  });

  // KPIs
  const totalAgencyProperties = agencyProperties.length;
  const publishedCount = agencyProperties.filter((p) => getListingLifecycleStatus(p) === 'PUBLISHED').length;
  const closedCount = agencyProperties.filter((p) => {
    const st = getListingLifecycleStatus(p);
    return st === 'SOLD' || st === 'RENTED';
  }).length;
  const totalViews = agencyProperties.reduce((sum, p) => sum + (p.viewsCount || 0), 0);

  // Total volume transactions
  const totalVolumeUSD = agencyTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const totalCommissionsUSD = agencyTransactions.reduce((sum, tx) => sum + (tx.commissionAmount || 0), 0);

  // Formatage monétaire
  const formatUSD = (val: number) =>
    new Intl.NumberFormat('fr-CD', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const formatCDF = (usdVal: number) => {
    const cdfVal = usdVal * (cdfExchangeRate || 2850);
    return new Intl.NumberFormat('fr-CD', { maximumFractionDigits: 0 }).format(cdfVal) + ' FC';
  };

  // Enregistrer le profil agence
  const handleSaveAgencyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updated = {
      ...user,
      agencyName,
      phone: agencyPhone,
      whatsapp: agencyWhatsapp,
      rccmOrNif: agencyRccm
    };
    setUser(updated);
    setAgencyProfileSuccess('Profil et coordonnées officielles de l’agence enregistrés avec succès !');
    setTimeout(() => setAgencyProfileSuccess(null), 4000);
  };

  // Inviter un collaborateur
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      alert('Veuillez renseigner le nom et l’adresse e-mail.');
      return;
    }

    const defaultPerms =
      inviteRole === 'agency_owner'
        ? { canEditAllProperties: true, canAssignProperties: true, canAssignLeads: true, canViewBilling: true, canManageTeam: true }
        : inviteRole === 'agency_manager'
        ? { canEditAllProperties: true, canAssignProperties: true, canAssignLeads: true, canViewBilling: false, canManageTeam: true }
        : invitePermissions;

    await inviteAgencyCollaborator({
      agencyId: currentAgencyId,
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      phone: invitePhone.trim(),
      whatsapp: invitePhone.trim(),
      role: inviteRole,
      permissions: defaultPerms
    });

    setInviteSuccessMsg(`Invitation envoyée avec succès à ${inviteEmail} !`);
    setInviteName('');
    setInviteEmail('');
    setInvitePhone('+243 ');
    setTimeout(() => {
      setInviteSuccessMsg(null);
      setIsInviteModalOpen(false);
    }, 2000);
  };

  // Sauvegarder modification permissions
  const handleSaveCollabPermissions = async () => {
    if (!editingCollabPermissions) return;
    await updateAgencyCollaborator(editingCollabPermissions.id, {
      role: editingCollabPermissions.role,
      permissions: editingCollabPermissions.permissions
    });
    setEditingCollabPermissions(null);
  };

  // Attribuer propriété
  const handleExecuteAssignProperty = async () => {
    if (!selectedPropertyToAssign || !targetAgentForProperty) return;
    const agent = agencyCollaborators.find((c) => c.id === targetAgentForProperty || c.userId === targetAgentForProperty);
    const agentName = agent ? agent.name : 'Agent Kinimmo';
    await assignPropertyToAgent(selectedPropertyToAssign.id, targetAgentForProperty, agentName);
    setSelectedPropertyToAssign(null);
    setTargetAgentForProperty('');
  };

  // Ajouter transaction
  const handleCreateTx = async (e: React.FormEvent) => {
    e.preventDefault();
    const prop = properties.find((p) => p.id === txPropertyId);
    const agent = agencyCollaborators.find((c) => c.id === txAgentId || c.userId === txAgentId);

    const calcCommission = (Number(txAmount) * Number(txCommissionRate)) / 100;

    await createAgencyTransaction({
      agencyId: currentAgencyId,
      propertyId: txPropertyId,
      propertyTitle: prop ? prop.title : 'Bien immobilier Kinshasa',
      agentId: txAgentId || user?.id || 'collab_current',
      agentName: agent ? agent.name : (user?.name || 'Agent Agence'),
      clientName: txClientName || 'Client Acquéreur',
      clientContact: txClientContact,
      type: txType,
      amount: Number(txAmount),
      currency: 'USD',
      commissionRate: Number(txCommissionRate),
      commissionAmount: calcCommission,
      status: txStatus,
      notes: txNotes,
      closedAt: new Date().toISOString()
    });

    // Si la transaction est clôturée et reliée à un bien, marquer le bien comme VENDU ou LOUÉ
    if (txStatus === 'closed' && txPropertyId) {
      const targetLifecycle: ListingLifecycleStatus = txType === 'sale' ? 'SOLD' : 'RENTED';
      await updatePropertyListingStatus(
        txPropertyId,
        targetLifecycle,
        `Transaction clôturée par l’agence pour un montant de ${formatUSD(Number(txAmount))}`
      );
    }

    setTxSuccessMsg('Transaction enregistrée avec succès dans le registre de l’agence !');
    setTimeout(() => {
      setTxSuccessMsg(null);
      setIsAddTxModalOpen(false);
      setTxPropertyId('');
      setTxClientName('');
      setTxNotes('');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* En-tête Espace Agence */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-black text-2xl shadow-lg">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white">{agencyName}</h2>
                <TrustBadge
                  status={user?.trust_status || 'identity_verified'}
                  level={user?.trust_level || 'Agence Certifiée Kinimmo Trust'}
                  score={user?.trust_score || 94}
                  targetType="agency"
                  targetTitle={agencyName}
                  showUnverified={true}
                />
                <button
                  type="button"
                  onClick={() => setIsTrustModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 cursor-pointer"
                >
                  Certification RCCM / Trust
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {agencyAddress}
                </span>
                <span className="hidden sm:inline text-slate-600">•</span>
                <span className="hidden sm:inline font-mono text-[11px] text-slate-300">RCCM : {agencyRccm}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-slate-950 font-black text-xs hover:opacity-95 shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-slate-950" />
              <span>+ Inviter un Collaborateur</span>
            </button>
            <button
              onClick={() => {
                setEditingProperty(null);
                setIsSubmitPropertyOpen(true);
              }}
              className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Publier pour l'Agence</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Agence */}
        <div className="flex border-t border-slate-800/80 mt-6 pt-3 gap-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'collaborators', label: `Collaborateurs (${agencyCollaborators.length})`, icon: Users },
            { id: 'roles_permissions', label: 'Rôles & Permissions', icon: ShieldCheck },
            { id: 'assignments', label: `Attribution des Biens (${totalAgencyProperties})`, icon: Layers },
            { id: 'transactions', label: `Visites & Transactions (${agencyTransactions.length})`, icon: DollarSign },
            { id: 'analytics', label: 'Statistiques Globales & Agents', icon: TrendingUp },
            { id: 'subscriptions', label: 'Abonnement Agence & Facturation', icon: CreditCard },
            { id: 'trust_verification', label: 'Vérification Kinimmo Trust', icon: Award },
            { id: 'profile', label: 'Profil de l’Agence', icon: Building2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as AgencySectionId)}
                className={`py-2 px-3.5 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-indigo-500 text-slate-950 font-bold shadow-md shadow-indigo-500/20'
                    : 'bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. GESTION DES COLLABORATEURS & ÉQUIPE */}
      {/* ======================================================== */}
      {activeSection === 'collaborators' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Équipe & Collaborateurs de l'Agence
              </h3>
              <p className="text-xs text-slate-400">
                Gérez vos agents immobiliers, attribuez leurs accès et suivez leur activité en temps réel à Kinshasa.
              </p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Collaborateur</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agencyCollaborators.map((collab) => {
              const assignedProps = agencyProperties.filter((p) => p.assignedAgentId === collab.id || p.assignedAgentId === collab.userId);
              const assignedLeads = leads.filter((l) => l.assignedAgentId === collab.id || l.assignedAgentId === collab.userId);

              return (
                <div
                  key={collab.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-xl flex flex-col justify-between hover:border-indigo-500/40 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={collab.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={collab.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700 shadow-md"
                        />
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            {collab.name}
                          </h4>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1 ${
                              collab.role === 'agency_owner'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : collab.role === 'agency_manager'
                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {collab.role === 'agency_owner'
                              ? 'Directeur Agence'
                              : collab.role === 'agency_manager'
                              ? 'Manager Équipe'
                              : 'Agent Commercial'}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          collab.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : collab.status === 'invited'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {collab.status === 'active' ? 'Actif' : collab.status === 'invited' ? 'Invité' : 'Suspendu'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{collab.email}</span>
                      </div>
                      {collab.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{collab.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Compteurs d'activité */}
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Biens Attribués</span>
                        <span className="text-base font-black text-white">{assignedProps.length}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
                        <span className="text-[10px] text-slate-400 uppercase block font-bold">Leads Actifs</span>
                        <span className="text-base font-black text-indigo-400">{assignedLeads.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions rapides */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {collab.whatsapp && (
                        <a
                          href={`https://wa.me/${collab.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${collab.name}, point sur votre portefeuille Kinimmo.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          title="WhatsApp direct"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      )}
                      <a
                        href={`mailto:${collab.email}`}
                        className="p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors"
                        title="Envoyer un e-mail"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingCollabPermissions(collab)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Permissions</span>
                      </button>

                      {collab.role !== 'agency_owner' && (
                        <button
                          onClick={() => {
                            if (confirm(`Confirmez-vous le retrait de ${collab.name} de l'agence ?`)) {
                              deleteAgencyCollaborator(collab.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Retirer le collaborateur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. RÔLES & PERMISSIONS GRANULAIRES */}
      {/* ======================================================== */}
      {activeSection === 'roles_permissions' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Rôles et Matrice des Permissions d'Agence
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
              Kinimmo applique une politique d'accès stricte : un agent ne peut modifier que ses propres biens ou ceux explicitement attribués avec une permission valide. Un responsable d’agence ne peut intervenir que dans le périmètre de son agence et selon son rôle.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-black uppercase">
                  Directeur Agence (Owner)
                </span>
                <h4 className="text-sm font-bold text-white">Contrôle Total</h4>
                <ul className="text-xs text-slate-400 space-y-1.5 pt-1">
                  <li className="flex items-center gap-2 text-emerald-400"><Check className="w-3.5 h-3.5" /> Modification de tous les biens</li>
                  <li className="flex items-center gap-2 text-emerald-400"><Check className="w-3.5 h-3.5" /> Attribution des mandats & prospects</li>
                  <li className="flex items-center gap-2 text-emerald-400"><Check className="w-3.5 h-3.5" /> Accès facturation & abonnements</li>
                  <li className="flex items-center gap-2 text-emerald-400"><Check className="w-3.5 h-3.5" /> Gestion des recrutements d'agents</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-black uppercase">
                  Manager Équipe (Manager)
                </span>
                <h4 className="text-sm font-bold text-white">Supervision Commerciale</h4>
                <ul className="text-xs text-slate-400 space-y-1.5 pt-1">
                  <li className="flex items-center gap-2 text-emerald-400"><Check className="w-3.5 h-3.5" /> Répartition des leads & visites</li>
                  <li className="flex items-center gap-2 text-emerald-400"><Check className="w-3.5 h-3.5" /> Suivi du pipeline des transactions</li>
                  <li className="flex items-center gap-2 text-emerald-400"><Check className="w-3.5 h-3.5" /> Validation des annonces de l'équipe</li>
                  <li className="flex items-center gap-2 text-slate-500"><X className="w-3.5 h-3.5" /> Facturation confidentielle (Restreinte)</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                  Agent Commercial (Agent)
                </span>
                <h4 className="text-sm font-bold text-white">Opérationnel Terrain</h4>
                <ul className="text-xs text-slate-400 space-y-1.5 pt-1">
                  <li className="flex items-center gap-2 text-emerald-400"><Check className="w-3.5 h-3.5" /> Gestion de ses biens & mandats attribués</li>
                  <li className="flex items-center gap-2 text-emerald-400"><Check className="w-3.5 h-3.5" /> Suivi de ses prospects directs</li>
                  <li className="flex items-center gap-2 text-slate-500"><X className="w-3.5 h-3.5" /> Modification des annonces des confrères</li>
                  <li className="flex items-center gap-2 text-slate-500"><X className="w-3.5 h-3.5" /> Paramètres d'agence restreints</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Tableau des collaborateurs et réglages permissions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Droits attribués par collaborateur</h4>
              <span className="text-xs text-slate-400">{agencyCollaborators.length} membres enregistrés</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Collaborateur</th>
                    <th className="py-3 px-4">Rôle</th>
                    <th className="py-3 px-4 text-center">Modifier Tous Biens</th>
                    <th className="py-3 px-4 text-center">Attribuer Mandats</th>
                    <th className="py-3 px-4 text-center">Attribuer Leads</th>
                    <th className="py-3 px-4 text-center">Voir Facturation</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {agencyCollaborators.map((collab) => (
                    <tr key={collab.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <img src={collab.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          <div>
                            <span className="font-bold text-white block">{collab.name}</span>
                            <span className="text-[11px] text-slate-400">{collab.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                        {collab.role}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {collab.role === 'agency_owner' || collab.permissions?.canEditAllProperties ? (
                          <span className="text-emerald-400 font-bold">✓ Oui</span>
                        ) : (
                          <span className="text-slate-600">Non</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {collab.role === 'agency_owner' || collab.permissions?.canAssignProperties ? (
                          <span className="text-emerald-400 font-bold">✓ Oui</span>
                        ) : (
                          <span className="text-slate-600">Non</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {collab.role === 'agency_owner' || collab.permissions?.canAssignLeads ? (
                          <span className="text-emerald-400 font-bold">✓ Oui</span>
                        ) : (
                          <span className="text-slate-600">Non</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {collab.role === 'agency_owner' || collab.permissions?.canViewBilling ? (
                          <span className="text-emerald-400 font-bold">✓ Oui</span>
                        ) : (
                          <span className="text-slate-600">Non</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setEditingCollabPermissions(collab)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-bold text-xs"
                        >
                          Configurer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. ATTRIBUTION DES BIENS ET DES PROSPECTS */}
      {/* ======================================================== */}
      {activeSection === 'assignments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Attribution des Biens & des Prospects
              </h3>
              <p className="text-xs text-slate-400">
                Affectez chaque mandat et chaque lead client à un agent collaborateur de votre agence.
              </p>
            </div>

            {/* Filtre par collaborateur */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Filtrer par agent :</span>
              <select
                value={assignFilterAgent}
                onChange={(e) => setAssignFilterAgent(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Tous les agents ({agencyCollaborators.length})</option>
                {agencyCollaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tableau des biens de l'agence avec attribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Catalogue des Biens de l’Agence</h4>
              <span className="text-xs text-slate-400">{agencyProperties.length} biens</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Bien immobilier</th>
                    <th className="py-3 px-4">Prix</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Agent Attribué</th>
                    <th className="py-3 px-4 text-right">Attribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {agencyProperties
                    .filter((p) => {
                      if (assignFilterAgent === 'ALL') return true;
                      return p.assignedAgentId === assignFilterAgent || p.agentId === assignFilterAgent;
                    })
                    .map((prop) => {
                      const lifecycle = getListingLifecycleStatus(prop);
                      const statusConfig = LISTING_STATUS_CONFIG[lifecycle];
                      const assignedCollab = agencyCollaborators.find(
                        (c) => c.id === prop.assignedAgentId || c.userId === prop.assignedAgentId
                      );

                      return (
                        <tr key={prop.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=150&auto=format&fit=crop&q=80'}
                                alt=""
                                className="w-12 h-10 rounded-lg object-cover border border-slate-800"
                              />
                              <div>
                                <h5 className="font-bold text-white hover:text-indigo-400 transition-colors cursor-pointer" onClick={() => setActivePropertyModalId(prop.id)}>
                                  {prop.title}
                                </h5>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-indigo-400" />
                                  {prop.commune || 'Kinshasa'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-black text-white">
                            {formatUSD(prop.price)}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}>
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {assignedCollab ? (
                              <div className="flex items-center gap-2">
                                <img src={assignedCollab.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                <span className="font-bold text-indigo-300">{assignedCollab.name}</span>
                              </div>
                            ) : (
                              <span className="text-amber-400/80 italic font-semibold">Non attribué (Agence générale)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedPropertyToAssign(prop);
                                setTargetAgentForProperty(prop.assignedAgentId || agencyCollaborators[0]?.id || '');
                              }}
                              className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-black text-xs shadow-sm"
                            >
                              Changer Agent
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VISITES & PIPELINE DES TRANSACTIONS */}
      {/* ======================================================== */}
      {activeSection === 'transactions' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                Pipeline des Transactions & Ventes Conclues
              </h3>
              <p className="text-xs text-slate-400">
                Suivez les compromis, signatures notariées et commissions générées par l'équipe d'agents.
              </p>
            </div>
            <button
              onClick={() => setIsAddTxModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Enregistrer une Transaction</span>
            </button>
          </div>

          {/* Cartes KPI Transactions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Volume Total des Ventes</span>
              <div className="text-2xl font-black text-white">{formatUSD(totalVolumeUSD)}</div>
              <span className="text-xs text-emerald-400 font-mono mt-1 block">{formatCDF(totalVolumeUSD)}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Commissions Agence Perçues</span>
              <div className="text-2xl font-black text-emerald-400">{formatUSD(totalCommissionsUSD)}</div>
              <span className="text-xs text-slate-400 font-mono mt-1 block">{formatCDF(totalCommissionsUSD)}</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Dossiers Clôturés</span>
              <div className="text-2xl font-black text-white">
                {agencyTransactions.filter((t) => t.status === 'closed').length} / {agencyTransactions.length}
              </div>
              <span className="text-xs text-indigo-400 mt-1 block">Taux de réussite élevé</span>
            </div>
          </div>

          {/* Liste des transactions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Registre des Actes et Baux Locatifs</h4>
              <span className="text-xs text-slate-400">{agencyTransactions.length} enregistrements</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Bien & Contrat</th>
                    <th className="py-3 px-4">Client Acquéreur</th>
                    <th className="py-3 px-4">Agent en Charge</th>
                    <th className="py-3 px-4">Montant Total</th>
                    <th className="py-3 px-4">Commission</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {agencyTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white block">{tx.propertyTitle}</span>
                        <span className="text-[11px] text-indigo-400 font-semibold uppercase">{tx.type === 'sale' ? 'Vente Définitive' : 'Bail Locatif'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-100 block">{tx.clientName}</span>
                        {tx.clientContact && <span className="text-[11px] text-slate-400">{tx.clientContact}</span>}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-indigo-300">
                        {tx.agentName}
                      </td>
                      <td className="py-3.5 px-4 font-black text-white font-mono">
                        {formatUSD(tx.amount)}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                        {formatUSD(tx.commissionAmount || 0)} ({tx.commissionRate}%)
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            tx.status === 'closed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : tx.status === 'under_contract'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                          }`}
                        >
                          {tx.status === 'closed' ? 'Acté & Conclu' : tx.status === 'under_contract' ? 'Sous Compromis' : 'Négociation'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(tx.closedAt || tx.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. STATISTIQUES INDIVIDUELLES ET GLOBALES */}
      {/* ======================================================== */}
      {activeSection === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Total Biens Agence</span>
              <div className="text-3xl font-black text-white">{totalAgencyProperties}</div>
              <span className="text-xs text-emerald-400 mt-1 block">{publishedCount} actifs en ligne</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Vues Totales Portefeuille</span>
              <div className="text-3xl font-black text-indigo-400">{totalViews.toLocaleString()}</div>
              <span className="text-xs text-slate-400 mt-1 block">Acheteurs & locataires Kinshasa</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Leads & Demandes Reçues</span>
              <div className="text-3xl font-black text-amber-400">{leads.length}</div>
              <span className="text-xs text-slate-400 mt-1 block">Visites & offres d'achat</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg">
              <span className="text-[11px] text-slate-400 uppercase font-bold block mb-1">Biens Clôturés (Vendus/Loués)</span>
              <div className="text-3xl font-black text-blue-400">{closedCount}</div>
              <span className="text-xs text-slate-400 mt-1 block">Statut RENTED / SOLD</span>
            </div>
          </div>

          {/* Tableau comparatif de performance par collaborateur */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Performance Individuelle des Collaborateurs
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Agent Collaborateur</th>
                    <th className="py-3 px-4">Mandats Gérés</th>
                    <th className="py-3 px-4">Leads Reçus</th>
                    <th className="py-3 px-4">Transactions Conclues</th>
                    <th className="py-3 px-4">Volume d'Affaires</th>
                    <th className="py-3 px-4 text-right">Efficacité</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {agencyCollaborators.map((c) => {
                    const agentProps = agencyProperties.filter((p) => p.assignedAgentId === c.id || p.assignedAgentId === c.userId);
                    const agentLeads = leads.filter((l) => l.assignedAgentId === c.id || l.assignedAgentId === c.userId);
                    const agentTxs = agencyTransactions.filter((t) => t.agentId === c.id || t.agentId === c.userId);
                    const volume = agentTxs.reduce((sum, t) => sum + (t.amount || 0), 0);

                    return (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <img src={c.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                            <div>
                              <span className="font-bold text-white block">{c.name}</span>
                              <span className="text-[11px] text-slate-400">{c.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">{agentProps.length}</td>
                        <td className="py-3.5 px-4 font-bold text-indigo-400">{agentLeads.length}</td>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">{agentTxs.length}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">{formatUSD(volume)}</td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-black text-[11px] border border-emerald-500/20">
                            {agentProps.length > 0 ? `${Math.round((agentTxs.length / (agentProps.length || 1)) * 100)}% Conv.` : 'N/A'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. GESTION DES ABONNEMENTS ET PROMOTIONS */}
      {/* ======================================================== */}
      {activeSection === 'subscriptions' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 text-xs font-black uppercase">
                Formule Professionnelle Agence
              </span>
              <h3 className="text-2xl font-black text-white">Agence Immobilière Certifiée Kinimmo</h3>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Votre formule inclut l'intégration d'un nombre illimité de collaborateurs, le module multi-mandats, les rapports d'audit Kinshasa Trust et la vitrine exclusive.
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl text-center min-w-[200px]">
              <span className="text-xs text-slate-400 uppercase font-bold block">Tarif Mensuel</span>
              <div className="text-3xl font-black text-emerald-400">79 USD</div>
              <span className="text-xs text-slate-400 font-mono mt-1 block">{formatCDF(79)} / mois</span>
              <span className="mt-2 inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Abonnement Actif
              </span>
            </div>
          </div>

          {/* Factures de l'agence */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Historique des Factures & Règlements de l’Agence
              </h4>
              <span className="text-xs text-slate-400">Devise : USD & Franc Congolais</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Numéro</th>
                    <th className="py-3 px-4">Objet</th>
                    <th className="py-3 px-4">Montant USD</th>
                    <th className="py-3 px-4">Montant CDF</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                        {inv.invoiceNumber || (inv as any).invoice_number || inv.id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {(inv as any).plan_name || (inv.planId ? `Formule ${inv.planId}` : 'Abonnement Agence Kinimmo')}
                      </td>
                      <td className="py-3.5 px-4 font-black text-white">
                        {formatUSD(inv.totalAmount || inv.amount || 79)}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {formatCDF(inv.totalAmount || inv.amount || 79)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase">
                          Payé & Validé
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {new Date(inv.createdAt || (inv as any).created_at || Date.now()).toLocaleDateString('fr-FR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. VÉRIFICATION PROFESSIONNELLE KINIMMO TRUST */}
      {/* ======================================================== */}
      {activeSection === 'trust_verification' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-emerald-400" />
                  Label de Confiance & Certification Kinimmo Trust RDC
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  Le badge Kinimmo Trust certifie que votre agence immobilière est régulièrement enregistrée auprès des autorités de la République Démocratique du Congo (RCCM, NIF, DGI) et dispose d'une adresse physique vérifiable à Kinshasa.
                </p>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black flex items-center gap-2">
                <BadgeCheck className="w-4 h-4" />
                <span>Statut : CONFORME (Vérifié)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Documents Légaux Enregistrés
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">RCCM RDC :</span>
                    <span className="font-mono font-bold text-white">{agencyRccm}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">NIF Fiscal :</span>
                    <span className="font-mono font-bold text-white">{agencyNif}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-400">Siège Social Kinshasa :</span>
                    <span className="font-semibold text-white">{agencyAddress}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Garanties de Confiance pour vos Clients
                </h4>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Affichage du badge or "Agence Agréée" sur chaque annonce
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Numéro WhatsApp officiel sécurisé et vérifié
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    Priorité de classement sur les recherches à Gombe et Ngaliema
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. GESTION DU PROFIL DE L'AGENCE */}
      {/* ======================================================== */}
      {activeSection === 'profile' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              Informations Officielles de l'Agence
            </h3>
            <p className="text-xs text-slate-400">
              Ces informations apparaissent sur la vitrine publique de votre agence et sur les fiches de vos annonces à Kinshasa.
            </p>
          </div>

          {agencyProfileSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{agencyProfileSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSaveAgencyProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Raison Sociale de l'Agence</label>
                <input
                  type="text"
                  required
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Adresse Siège à Kinshasa</label>
                <input
                  type="text"
                  required
                  value={agencyAddress}
                  onChange={(e) => setAgencyAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Téléphone Direct</label>
                <input
                  type="text"
                  required
                  value={agencyPhone}
                  onChange={(e) => setAgencyPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Numéro WhatsApp Professionnel</label>
                <input
                  type="text"
                  required
                  value={agencyWhatsapp}
                  onChange={(e) => setAgencyWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Numéro RCCM RDC</label>
                <input
                  type="text"
                  required
                  value={agencyRccm}
                  onChange={(e) => setAgencyRccm(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Numéro NIF Fiscal</label>
                <input
                  type="text"
                  value={agencyNif}
                  onChange={(e) => setAgencyNif(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Biographie / Présentation de l'Agence</label>
              <textarea
                rows={4}
                value={agencyBio}
                onChange={(e) => setAgencyBio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-500/20"
              >
                Enregistrer les Modifications
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : INVITER UN COLLABORATEUR */}
      {/* ======================================================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Inviter un Nouveau Collaborateur</h4>
                <p className="text-xs text-slate-400">Ajoutez un agent à votre équipe Kinimmo</p>
              </div>
            </div>

            {inviteSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                {inviteSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nom Complet de l'Agent</label>
                <input
                  type="text"
                  required
                  placeholder="Ex : Dieudonné Mwamba"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Adresse E-mail</label>
                  <input
                    type="email"
                    required
                    placeholder="agent@agence.cd"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Téléphone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    placeholder="+243 81 000 0000"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Rôle au sein de l'Agence</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AgencyRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="agency_agent">Agent Commercial (Gère ses propres mandats)</option>
                  <option value="agency_manager">Manager Équipe (Supervise et attribue les biens)</option>
                  <option value="agency_owner">Directeur / Co-gérant (Tous les droits)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-slate-950 font-black text-xs hover:opacity-95"
                >
                  Envoyer l'Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : CHANGER AGENT ATTRIBUÉ */}
      {/* ======================================================== */}
      {selectedPropertyToAssign && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedPropertyToAssign(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h4 className="text-base font-black text-white">Attribuer ce Bien à un Agent</h4>
            <p className="text-xs text-slate-400 truncate font-semibold">
              {selectedPropertyToAssign.title}
            </p>

            <div className="space-y-3 pt-2">
              <label className="block text-xs font-bold text-slate-300">Sélectionner l'Agent Responsable</label>
              <select
                value={targetAgentForProperty}
                onChange={(e) => setTargetAgentForProperty(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {agencyCollaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.role})
                  </option>
                ))}
              </select>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedPropertyToAssign(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAssignProperty}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-black text-xs"
                >
                  Confirmer l'Attribution
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : ENREGISTRER UNE TRANSACTION */}
      {/* ======================================================== */}
      {isAddTxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setIsAddTxModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black text-white">Enregistrer une Transaction Conclue</h4>
                <p className="text-xs text-slate-400">Vente ou bail locatif acté par l'agence</p>
              </div>
            </div>

            {txSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                {txSuccessMsg}
              </div>
            )}

            <form onSubmit={handleCreateTx} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Bien Immobilier Concerné</label>
                <select
                  value={txPropertyId}
                  onChange={(e) => setTxPropertyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Sélectionner un bien du catalogue...</option>
                  {agencyProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.commune} - {formatUSD(p.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Type de Contrat</label>
                  <select
                    value={txType}
                    onChange={(e) => setTxType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="sale">Vente Définitive</option>
                    <option value="rent">Location (Bail)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Statut Acte</label>
                  <select
                    value={txStatus}
                    onChange={(e) => setTxStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="closed">Conclu & Signé (Vendu/Loué)</option>
                    <option value="under_contract">Sous Compromis</option>
                    <option value="negotiating">Négociation en cours</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Montant Transaction ($ USD)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={txAmount}
                    onChange={(e) => setTxAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">{formatCDF(txAmount)}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Taux Commission (%)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={txCommissionRate}
                    onChange={(e) => setTxCommissionRate(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                    Commission : {formatUSD((txAmount * txCommissionRate) / 100)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Client Acquéreur / Locataire</label>
                  <input
                    type="text"
                    required
                    placeholder="Nom du client"
                    value={txClientName}
                    onChange={(e) => setTxClientName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Contact Client</label>
                  <input
                    type="text"
                    placeholder="+243 ..."
                    value={txClientContact}
                    onChange={(e) => setTxClientContact(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Agent Responsable</label>
                <select
                  value={txAgentId}
                  onChange={(e) => setTxAgentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Sélectionner l'agent...</option>
                  {agencyCollaborators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Notes / Réf Notariée</label>
                <textarea
                  rows={2}
                  placeholder="Ex : Acte notarié de vente signé à la Gombe, virement reçu."
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTxModalOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 shadow-lg shadow-emerald-500/20"
                >
                  Enregistrer la Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL : ÉDITION PERMISSIONS D'UN COLLABORATEUR */}
      {/* ======================================================== */}
      {editingCollabPermissions && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl space-y-4">
            <button
              onClick={() => setEditingCollabPermissions(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <img src={editingCollabPermissions.avatar} alt="" className="w-12 h-12 rounded-xl object-cover" />
              <div>
                <h4 className="text-base font-black text-white">{editingCollabPermissions.name}</h4>
                <p className="text-xs text-slate-400">Configuration des Rôles & Permissions</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Rôle d'Agence</label>
                <select
                  value={editingCollabPermissions.role}
                  onChange={(e) =>
                    setEditingCollabPermissions({
                      ...editingCollabPermissions,
                      role: e.target.value as AgencyRole
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="agency_agent">Agent Commercial</option>
                  <option value="agency_manager">Manager Équipe</option>
                  <option value="agency_owner">Directeur Agence</option>
                </select>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300 block">Permissions Spécifiques :</span>

                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCollabPermissions.permissions?.canEditAllProperties}
                    onChange={(e) =>
                      setEditingCollabPermissions({
                        ...editingCollabPermissions,
                        permissions: {
                          ...editingCollabPermissions.permissions,
                          canEditAllProperties: e.target.checked
                        }
                      })
                    }
                    className="rounded text-indigo-500 focus:ring-0 bg-slate-950 border-slate-700"
                  />
                  <span>Peut modifier toutes les annonces de l'agence</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCollabPermissions.permissions?.canAssignProperties}
                    onChange={(e) =>
                      setEditingCollabPermissions({
                        ...editingCollabPermissions,
                        permissions: {
                          ...editingCollabPermissions.permissions,
                          canAssignProperties: e.target.checked
                        }
                      })
                    }
                    className="rounded text-indigo-500 focus:ring-0 bg-slate-950 border-slate-700"
                  />
                  <span>Peut attribuer des biens aux collaborateurs</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCollabPermissions.permissions?.canAssignLeads}
                    onChange={(e) =>
                      setEditingCollabPermissions({
                        ...editingCollabPermissions,
                        permissions: {
                          ...editingCollabPermissions.permissions,
                          canAssignLeads: e.target.checked
                        }
                      })
                    }
                    className="rounded text-indigo-500 focus:ring-0 bg-slate-950 border-slate-700"
                  />
                  <span>Peut attribuer les leads et demandes de visites</span>
                </label>

                <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCollabPermissions.permissions?.canViewBilling}
                    onChange={(e) =>
                      setEditingCollabPermissions({
                        ...editingCollabPermissions,
                        permissions: {
                          ...editingCollabPermissions.permissions,
                          canViewBilling: e.target.checked
                        }
                      })
                    }
                    className="rounded text-indigo-500 focus:ring-0 bg-slate-950 border-slate-700"
                  />
                  <span>Peut consulter les factures & abonnements de l'agence</span>
                </label>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCollabPermissions(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveCollabPermissions}
                  className="w-2/3 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-slate-950 font-black text-xs"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Demande Kinimmo Trust Agence */}
      <TrustVerificationModal
        isOpen={isTrustModalOpen}
        onClose={() => setIsTrustModalOpen(false)}
        targetType="agency"
        targetId={user?.agencyId || user?.id || 'agency_current'}
        targetName={agencyName}
        onSuccess={() => {
          setIsTrustModalOpen(false);
        }}
      />
    </div>
  );
};
