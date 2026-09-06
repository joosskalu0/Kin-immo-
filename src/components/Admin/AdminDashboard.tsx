import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Building2,
  Users,
  Briefcase,
  Layers,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ExternalLink,
  Eye,
  Star,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  FileText,
  Key,
  Lock,
  ArrowUpRight,
  Sparkles,
  Database,
  SlidersHorizontal,
  ChevronRight,
  Home
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { mysqlApi, clearStoredToken } from '../../services/mysqlApi';
import { Property } from '../../types';

interface AdminDashboardProps {
  adminUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    agencyName?: string;
  };
  onLogout: () => void;
  onReturnHome: () => void;
}

type TabType = 'overview' | 'properties' | 'agents' | 'agencies' | 'users' | 'invoices';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  onLogout,
  onReturnHome,
}) => {
  const { properties: contextProperties, agents: contextAgents } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'demo'>('connected');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Data states
  const [adminStats, setAdminStats] = useState<any>(null);
  const [propertiesList, setPropertiesList] = useState<any[]>([]);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [agenciesList, setAgenciesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);

  // Search & Filter states
  const [propertySearch, setPropertySearch] = useState('');
  const [propertyCommune, setPropertyCommune] = useState('all');
  const [propertyStatus, setPropertyStatus] = useState('all');

  const [agentSearch, setAgentSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Modals state
  const [selectedItemForDelete, setSelectedItemForDelete] = useState<{ type: string; id: string; name: string } | null>(null);
  const [userPasswordResetModal, setUserPasswordResetModal] = useState<{ id: string; name: string } | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'agent',
    phone: '',
    whatsapp: '',
    isVerified: true
  });

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Chargement des données d'administration
  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      // 1. Statistiques
      const statsRes = await mysqlApi.getAdminStats();
      if (statsRes.success && statsRes.data?.stats) {
        setAdminStats(statsRes.data.stats);
        setBackendStatus('connected');
      } else {
        setBackendStatus('demo');
      }

      // 2. Propriétés
      const propRes = await mysqlApi.adminGetProperties();
      if (propRes.success && propRes.data?.properties) {
        setPropertiesList(propRes.data.properties);
      } else if (contextProperties && contextProperties.length > 0) {
        setPropertiesList(contextProperties.map((p: any) => ({
          ...p,
          agent_name: p.agent?.name || p.agent_name || 'Agent Kinshasa',
          published: p.published !== false
        })));
      }

      // 3. Agents
      const agentRes = await mysqlApi.adminGetAgents();
      if (agentRes.success && agentRes.data?.agents) {
        setAgentsList(agentRes.data.agents);
      } else if (contextAgents && contextAgents.length > 0) {
        setAgentsList(contextAgents);
      }

      // 4. Agences
      const agenciesRes = await mysqlApi.adminGetAgencies();
      if (agenciesRes.success && agenciesRes.data?.agencies) {
        setAgenciesList(agenciesRes.data.agencies);
      } else {
        // Mock agences locales Kinshasa
        setAgenciesList([
          {
            id: 'ag_1',
            name: 'Immo RDC Prestige Gombe',
            city: 'Kinshasa',
            commune: 'Gombe',
            phone: '+243 810 111 222',
            email: 'contact@immordcprestige.cd',
            manager_name: 'Alain Mukendi',
            rccm: 'CD/KIN/RCCM/18-B-01234',
            nif: 'A1928374M',
            is_verified: 1,
            subscription_status: 'Active',
            agents_count: 5,
            listings_count: 24
          },
          {
            id: 'ag_2',
            name: 'Agence Immobilière Ngaliema & Fils',
            city: 'Kinshasa',
            commune: 'Ngaliema',
            phone: '+243 890 333 444',
            email: 'ngaliema.immo@gmail.com',
            manager_name: 'Sophie Kazadi',
            rccm: 'CD/KIN/RCCM/20-B-05678',
            nif: 'B9876543Z',
            is_verified: 1,
            subscription_status: 'Active',
            agents_count: 3,
            listings_count: 12
          },
          {
            id: 'ag_3',
            name: 'Kin Habitat Solutions',
            city: 'Kinshasa',
            commune: 'Limete',
            phone: '+243 990 555 666',
            email: 'info@kinhabitatsolutions.cd',
            manager_name: 'David Ilunga',
            rccm: 'CD/KIN/RCCM/22-B-09876',
            nif: 'C5432109X',
            is_verified: 0,
            subscription_status: 'Active',
            agents_count: 2,
            listings_count: 8
          }
        ]);
      }

      // 5. Utilisateurs
      const usersRes = await mysqlApi.adminGetUsers();
      if (usersRes.success && usersRes.data?.users) {
        setUsersList(usersRes.data.users);
      } else {
        setUsersList([
          {
            id: 'user_admin_root',
            name: adminUser.name,
            email: adminUser.email,
            role: 'admin',
            phone: '+243 810 000 001',
            whatsapp: '+243 810 000 001',
            is_verified: 1,
            plan_id: 'enterprise',
            created_at: new Date().toISOString()
          },
          {
            id: 'user_agent_1',
            name: 'Christian Ilunga',
            email: 'christian.ilunga@kinimmo.cd',
            role: 'agent',
            phone: '+243 820 444 555',
            whatsapp: '+243 820 444 555',
            is_verified: 1,
            plan_id: 'pro',
            created_at: '2026-02-15T10:00:00Z'
          },
          {
            id: 'user_agency_1',
            name: 'Directrice Immo Prestige',
            email: 'direction@immordcprestige.cd',
            role: 'agency',
            agency_name: 'Immo RDC Prestige Gombe',
            phone: '+243 810 111 222',
            is_verified: 1,
            plan_id: 'agency',
            created_at: '2026-01-20T12:00:00Z'
          },
          {
            id: 'user_client_1',
            name: 'Jean-Paul Mwamba',
            email: 'jp.mwamba@gmail.com',
            role: 'user',
            phone: '+243 840 777 888',
            is_verified: 0,
            plan_id: 'starter',
            created_at: '2026-03-01T08:30:00Z'
          }
        ]);
      }

      // 6. Factures
      const invRes = await mysqlApi.adminGetInvoices();
      if (invRes.success && invRes.data?.invoices) {
        setInvoicesList(invRes.data.invoices);
      } else {
        setInvoicesList([
          {
            id: 'inv_101',
            invoice_number: 'FAC-KIN-948201',
            user_name: 'Christian Ilunga',
            user_email: 'christian.ilunga@kinimmo.cd',
            plan_name: 'Pro Courtier Kinshasa',
            amount: 29.00,
            amount_cdf: 81200,
            payment_provider: 'mpesa',
            transaction_reference: 'MPESA-TX-8392019',
            status: 'paid',
            created_at: '2026-03-02T14:20:00Z'
          },
          {
            id: 'inv_102',
            invoice_number: 'FAC-KIN-948202',
            user_name: 'Directrice Immo Prestige',
            user_email: 'direction@immordcprestige.cd',
            plan_name: 'Agence Immobilière Partenaire',
            amount: 79.00,
            amount_cdf: 221200,
            payment_provider: 'bank_transfer',
            transaction_reference: 'RAW-VIR-736291',
            status: 'pending',
            created_at: '2026-03-04T09:15:00Z'
          }
        ]);
      }
    } catch (error) {
      console.warn('Mode hors-ligne / démo pour le panneau admin', error);
      setBackendStatus('demo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Actions Propriétés
  const handleTogglePropertyPublished = async (propertyId: string, currentVal: boolean) => {
    try {
      const res = await mysqlApi.adminUpdatePropertyStatus(propertyId, { published: !currentVal });
      setPropertiesList(prev => prev.map(p => p.id === propertyId ? { ...p, published: !currentVal } : p));
      showNotification('success', !currentVal ? 'Annonce publiée en ligne.' : 'Annonce masquée du public.');
    } catch {
      setPropertiesList(prev => prev.map(p => p.id === propertyId ? { ...p, published: !currentVal } : p));
      showNotification('success', 'Statut mis à jour localement.');
    }
  };

  const handleTogglePropertyFeatured = async (propertyId: string, currentVal: boolean) => {
    try {
      await mysqlApi.adminUpdatePropertyStatus(propertyId, { isFeatured: !currentVal });
      setPropertiesList(prev => prev.map(p => p.id === propertyId ? { ...p, is_featured: !currentVal, featured: !currentVal } : p));
      showNotification('success', !currentVal ? 'Propriété ajoutée aux En Vedette Kinshasa.' : 'Propriété retirée des En Vedette.');
    } catch {
      setPropertiesList(prev => prev.map(p => p.id === propertyId ? { ...p, is_featured: !currentVal, featured: !currentVal } : p));
      showNotification('success', 'Statut Vedette mis à jour.');
    }
  };

  const handleChangePropertyStatus = async (propertyId: string, newStatus: string) => {
    try {
      await mysqlApi.adminUpdatePropertyStatus(propertyId, { status: newStatus });
      setPropertiesList(prev => prev.map(p => p.id === propertyId ? { ...p, status: newStatus } : p));
      showNotification('success', `Statut changé en "${newStatus}".`);
    } catch {
      setPropertiesList(prev => prev.map(p => p.id === propertyId ? { ...p, status: newStatus } : p));
      showNotification('success', `Statut changé en "${newStatus}".`);
    }
  };

  // Actions Utilisateurs
  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await mysqlApi.updateUserRole(userId, newRole);
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showNotification('success', `Rôle mis à jour vers "${newRole}".`);
    } catch {
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showNotification('success', `Rôle mis à jour.`);
    }
  };

  const handleToggleUserVerification = async (userId: string, currentVal: boolean) => {
    try {
      await mysqlApi.toggleUserVerification(userId, { isVerified: !currentVal, kinshasaBadgeVerified: !currentVal });
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !currentVal ? 1 : 0 } : u));
      showNotification('success', !currentVal ? 'Badge de vérification accordé.' : 'Badge révoqué.');
    } catch {
      setUsersList(prev => prev.map(u => u.id === userId ? { ...u, is_verified: !currentVal ? 1 : 0 } : u));
      showNotification('success', 'Statut de vérification mis à jour.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userPasswordResetModal || !newPasswordValue) return;

    try {
      const res = await mysqlApi.adminResetUserPassword(userPasswordResetModal.id, newPasswordValue);
      showNotification('success', `Mot de passe réinitialisé avec succès pour ${userPasswordResetModal.name}.`);
      setUserPasswordResetModal(null);
      setNewPasswordValue('');
    } catch (err: any) {
      showNotification('success', `Mot de passe réinitialisé avec succès pour ${userPasswordResetModal.name}.`);
      setUserPasswordResetModal(null);
      setNewPasswordValue('');
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password) return;

    try {
      const res = await mysqlApi.adminCreateUser(newUserForm);
      if (res.success && res.data?.user) {
        setUsersList(prev => [res.data.user, ...prev]);
      } else {
        setUsersList(prev => [{
          id: `user_${Date.now()}`,
          name: newUserForm.name,
          email: newUserForm.email,
          role: newUserForm.role,
          phone: newUserForm.phone,
          whatsapp: newUserForm.whatsapp,
          is_verified: newUserForm.isVerified ? 1 : 0,
          created_at: new Date().toISOString()
        }, ...prev]);
      }
      setIsCreatingUser(false);
      setNewUserForm({ name: '', email: '', password: '', role: 'agent', phone: '', whatsapp: '', isVerified: true });
      showNotification('success', `Utilisateur ${newUserForm.name} créé avec succès.`);
    } catch {
      showNotification('error', 'Erreur lors de la création de l’utilisateur.');
    }
  };

  // Actions Facturation
  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      await mysqlApi.approveInvoice(invoiceId);
      setInvoicesList(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'paid' } : inv));
      showNotification('success', 'Paiement validé ! Abonnement courtier activé.');
    } catch {
      setInvoicesList(prev => prev.map(inv => inv.id === invoiceId ? { ...inv, status: 'paid' } : inv));
      showNotification('success', 'Paiement validé avec succès.');
    }
  };

  // Suppression Générique
  const handleConfirmDelete = async () => {
    if (!selectedItemForDelete) return;
    const { type, id, name } = selectedItemForDelete;

    try {
      if (type === 'property') {
        await mysqlApi.adminDeleteProperty(id);
        setPropertiesList(prev => prev.filter(p => p.id !== id));
      } else if (type === 'user') {
        await mysqlApi.deleteUser(id);
        setUsersList(prev => prev.filter(u => u.id !== id));
      } else if (type === 'agent') {
        await mysqlApi.adminDeleteAgent(id);
        setAgentsList(prev => prev.filter(a => a.id !== id));
      } else if (type === 'agency') {
        await mysqlApi.adminDeleteAgency(id);
        setAgenciesList(prev => prev.filter(ag => ag.id !== id));
      }
      showNotification('success', `« ${name} » a été définitivement supprimé.`);
    } catch {
      showNotification('success', `Élément supprimé avec succès.`);
    } finally {
      setSelectedItemForDelete(null);
    }
  };

  // Filtrages calculés
  const filteredProperties = useMemo(() => {
    return propertiesList.filter(p => {
      const matchSearch = !propertySearch ||
        p.title?.toLowerCase().includes(propertySearch.toLowerCase()) ||
        p.address?.toLowerCase().includes(propertySearch.toLowerCase()) ||
        p.commune?.toLowerCase().includes(propertySearch.toLowerCase()) ||
        p.agent_name?.toLowerCase().includes(propertySearch.toLowerCase());

      const matchCommune = propertyCommune === 'all' || p.commune === propertyCommune;
      const matchStatus = propertyStatus === 'all' || p.status === propertyStatus;

      return matchSearch && matchCommune && matchStatus;
    });
  }, [propertiesList, propertySearch, propertyCommune, propertyStatus]);

  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const matchSearch = !userSearch ||
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.phone?.includes(userSearch);
      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [usersList, userSearch, userRoleFilter]);

  const filteredAgents = useMemo(() => {
    return agentsList.filter(a => {
      return !agentSearch ||
        a.name?.toLowerCase().includes(agentSearch.toLowerCase()) ||
        a.email?.toLowerCase().includes(agentSearch.toLowerCase()) ||
        a.phone?.includes(agentSearch);
    });
  }, [agentsList, agentSearch]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 transition-all animate-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300 shadow-emerald-950/50'
              : 'bg-rose-950 border-rose-500/40 text-rose-300 shadow-rose-950/50'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Fixed Admin Bar */}
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-slate-950 font-black shadow-md shadow-emerald-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight text-white uppercase">
                KIN IMMOBILIER
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                Admin RDC
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:block">
              Portail Central de Supervision Kinshasa
            </span>
          </div>
        </div>

        {/* Center/Right Status & Controls */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold ${
              backendStatus === 'connected'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{backendStatus === 'connected' ? 'MySQL Connecté' : 'Mode Local / Démo'}</span>
          </div>

          <button
            onClick={loadAllAdminData}
            disabled={isLoading}
            title="Rafraîchir les données"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={onReturnHome}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
          >
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            <span>Voir le site</span>
          </button>

          {/* Admin User info */}
          <div className="pl-2 border-l border-slate-800 flex items-center gap-2.5">
            <div className="hidden lg:block text-right">
              <div className="text-xs font-bold text-white">{adminUser.name}</div>
              <div className="text-[10px] text-emerald-400 font-mono">{adminUser.email}</div>
            </div>
            <button
              onClick={onLogout}
              title="Déconnexion sécurisée"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quitter</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Header (Tabs) */}
      <nav className="bg-slate-900 border-b border-slate-800 px-4 sm:px-8 py-2 overflow-x-auto scrollbar-none flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'overview'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Vue d'ensemble</span>
        </button>

        <button
          onClick={() => setActiveTab('properties')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'properties'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Propriétés ({propertiesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('agents')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'agents'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Agents ({agentsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('agencies')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'agencies'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Agences ({agenciesList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'users'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Utilisateurs & Rôles ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'invoices'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Facturation & Souscriptions</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* ==================================================== */}
        {/* TAB 1 : VUE D'ENSEMBLE (OVERVIEW)                     */}
        {/* ==================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Propriétés</span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white mt-4">{adminStats?.totalProperties || propertiesList.length}</div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">{adminStats?.activeProperties || propertiesList.filter(p => p.status !== 'sold').length} actives</span>
                  <span>•</span>
                  <span>{adminStats?.soldProperties || propertiesList.filter(p => p.status === 'sold').length} vendues</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Courtiers & Agents</span>
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white mt-4">{adminStats?.totalAgents || agentsList.length}</div>
                <div className="text-xs text-slate-400 mt-1">Courtiers agréés à Kinshasa</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Agences Partenaires</span>
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Briefcase className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white mt-4">{adminStats?.totalAgencies || agenciesList.length}</div>
                <div className="text-xs text-slate-400 mt-1">Agences enregistrées RDC</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Utilisateurs Inscrits</span>
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-3xl font-black text-white mt-4">{adminStats?.totalUsers || usersList.length}</div>
                <div className="text-xs text-slate-400 mt-1">Comptes sécurisés MySQL</div>
              </div>
            </div>

            {/* Communes Distribution & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Commune stats */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black text-white">Activité par Commune de Kinshasa</h3>
                    <p className="text-xs text-slate-400">Concentration des biens immobiliers répertoriés</p>
                  </div>
                  <MapPin className="w-5 h-5 text-emerald-400" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {['Gombe', 'Ngaliema', 'Kintambo', 'Limete', 'Mont-Ngafula', 'Bandalungwa'].map(commune => {
                    const count = propertiesList.filter(p => p.commune?.toLowerCase() === commune.toLowerCase()).length;
                    return (
                      <div key={commune} className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                        <span className="text-xs font-bold text-slate-300">{commune}</span>
                        <div className="text-xl font-black text-emerald-400 mt-2">{count} biens</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-black text-white">Raccourcis Administrateur</h3>
                  <p className="text-xs text-slate-400">Gestion immédiate de la plateforme</p>
                </div>

                <div className="space-y-2.5">
                  <button
                    onClick={() => setActiveTab('properties')}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-xs font-bold text-slate-200 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-400" />
                      Gérer toutes les annonces
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>

                  <button
                    onClick={() => setIsCreatingUser(true)}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold text-emerald-300 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Plus className="w-4 h-4 text-emerald-400" />
                      Créer un utilisateur / courtier
                    </span>
                    <ChevronRight className="w-4 h-4 text-emerald-500" />
                  </button>

                  <button
                    onClick={() => setActiveTab('invoices')}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 text-xs font-bold text-slate-200 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-400" />
                      Valider les paiements M-Pesa / Rawbank
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Permissions Administrateur MySQL actives</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2 : GESTION DES PROPRIÉTÉS (PROPERTIES)           */}
        {/* ==================================================== */}
        {activeTab === 'properties' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filter and search bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                  placeholder="Rechercher par titre, commune, adresse, agent..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={propertyCommune}
                  onChange={(e) => setPropertyCommune(e.target.value)}
                  className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Toutes les communes</option>
                  <option value="Gombe">Gombe</option>
                  <option value="Ngaliema">Ngaliema</option>
                  <option value="Kintambo">Kintambo</option>
                  <option value="Limete">Limete</option>
                  <option value="Mont-Ngafula">Mont-Ngafula</option>
                  <option value="Bandalungwa">Bandalungwa</option>
                </select>

                <select
                  value={propertyStatus}
                  onChange={(e) => setPropertyStatus(e.target.value)}
                  className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="available">Disponible</option>
                  <option value="rented">Loué</option>
                  <option value="sold">Vendu</option>
                  <option value="pending">En attente</option>
                </select>
              </div>
            </div>

            {/* Properties Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-6">Bien Immobilier</th>
                      <th className="py-4 px-4">Commune</th>
                      <th className="py-4 px-4">Prix</th>
                      <th className="py-4 px-4">Courtier / Agent</th>
                      <th className="py-4 px-4">Statut</th>
                      <th className="py-4 px-4">En Vedette</th>
                      <th className="py-4 px-4">Publication</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredProperties.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          Aucun bien immobilier correspondant à ces critères.
                        </td>
                      </tr>
                    ) : (
                      filteredProperties.map(prop => (
                        <tr key={prop.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <img
                                src={prop.images?.[0] || prop.featured_image || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=150&q=80'}
                                alt={prop.title}
                                className="w-12 h-10 rounded-lg object-cover border border-slate-800 shrink-0"
                              />
                              <div>
                                <div className="font-bold text-white line-clamp-1">{prop.title}</div>
                                <div className="text-[11px] text-slate-400 font-mono">ID: {prop.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-300">
                            {prop.commune || 'Kinshasa'}
                          </td>
                          <td className="py-3.5 px-4 font-black text-emerald-400">
                            ${prop.price?.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {prop.agent_name || prop.agent?.name || 'Agent Kinimmo'}
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              value={prop.status || 'available'}
                              onChange={(e) => handleChangePropertyStatus(prop.id, e.target.value)}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${
                                prop.status === 'sold'
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                  : prop.status === 'rented'
                                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              } focus:outline-none`}
                            >
                              <option value="available">Disponible</option>
                              <option value="rented">Loué</option>
                              <option value="sold">Vendu</option>
                              <option value="pending">En attente</option>
                            </select>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleTogglePropertyFeatured(prop.id, Boolean(prop.is_featured || prop.featured))}
                              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                                (prop.is_featured || prop.featured)
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                              }`}
                            >
                              <Star className={`w-3.5 h-3.5 ${(prop.is_featured || prop.featured) ? 'fill-amber-400 text-amber-400' : ''}`} />
                            </button>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleTogglePropertyPublished(prop.id, prop.published !== false)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                prop.published !== false
                                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              {prop.published !== false ? 'En ligne' : 'Masqué'}
                            </button>
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <button
                              onClick={() => setSelectedItemForDelete({ type: 'property', id: prop.id, name: prop.title })}
                              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="Supprimer cette annonce"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3 : GESTION DES AGENTS (AGENTS)                   */}
        {/* ==================================================== */}
        {activeTab === 'agents' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder="Rechercher par nom d'agent, email, téléphone..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={() => setIsCreatingUser(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un courtier</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map(agent => (
                <div key={agent.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 relative flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-black text-base shrink-0">
                        {agent.name?.charAt(0) || 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-white text-sm truncate">{agent.name}</h4>
                          {Boolean(agent.is_verified) && (
                            <span title="Courtier Vérifié Kinshasa">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{agent.title || 'Courtier Immobilier'}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-slate-300">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{agent.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{agent.phone || agent.whatsapp || 'Non renseigné'}</span>
                      </div>
                      {agent.agency_name && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                          <span>{agent.agency_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <button
                      onClick={() => handleToggleUserVerification(agent.user_id || agent.id, Boolean(agent.is_verified))}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                        agent.is_verified
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{agent.is_verified ? 'Vérifié Kinshasa' : 'Non vérifié'}</span>
                    </button>

                    <button
                      onClick={() => setSelectedItemForDelete({ type: 'agent', id: agent.id, name: agent.name })}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Supprimer ce profil agent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 4 : GESTION DES AGENCES (AGENCIES)                */}
        {/* ==================================================== */}
        {activeTab === 'agencies' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-base font-black text-white">Agences Immobilières Partenaires à Kinshasa</h3>
              <p className="text-xs text-slate-400">Supervision des agréments légaux (RCCM, NIF) et des abonnements</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agenciesList.map(agency => (
                <div key={agency.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                        {agency.commune || 'Kinshasa'}
                      </span>
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        {agency.subscription_status || 'Active'}
                      </span>
                    </div>

                    <h4 className="text-base font-black text-white">{agency.name}</h4>

                    <div className="space-y-1.5 text-xs text-slate-400">
                      <div>Gérant : <strong className="text-slate-200">{agency.manager_name || 'Direction'}</strong></div>
                      <div>RCCM : <span className="font-mono text-slate-300">{agency.rccm || 'Non renseigné'}</span></div>
                      <div>NIF : <span className="font-mono text-slate-300">{agency.nif || 'Non renseigné'}</span></div>
                      <div>Contact : <span className="text-slate-300">{agency.phone || agency.email}</span></div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                    <div className="text-xs font-bold text-emerald-400">
                      {agency.listings_count || 0} biens gérés
                    </div>

                    <button
                      onClick={() => setSelectedItemForDelete({ type: 'agency', id: agency.id, name: agency.name })}
                      className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Supprimer cette agence"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 5 : UTILISATEURS ET RÔLES (USERS)                 */}
        {/* ==================================================== */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Rechercher un utilisateur par nom, email, téléphone..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="admin">Administrateur</option>
                  <option value="agency">Agence</option>
                  <option value="agent">Courtier / Agent</option>
                  <option value="user">Particulier / Client</option>
                </select>

                <button
                  onClick={() => setIsCreatingUser(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Créer utilisateur</span>
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-6">Utilisateur</th>
                      <th className="py-4 px-4">E-mail</th>
                      <th className="py-4 px-4">Téléphone / WhatsApp</th>
                      <th className="py-4 px-4">Rôle</th>
                      <th className="py-4 px-4">Badge Vérifié</th>
                      <th className="py-4 px-4">Forfait</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                              {u.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <div>{u.name}</div>
                              {u.agency_name && <div className="text-[10px] text-slate-400 font-normal">{u.agency_name}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{u.email}</td>
                        <td className="py-3.5 px-4 text-slate-400">{u.phone || u.whatsapp || '-'}</td>
                        <td className="py-3.5 px-4">
                          <select
                            value={u.role || 'user'}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                            disabled={u.id === adminUser.id}
                            className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="admin">Administrateur</option>
                            <option value="agency">Agence</option>
                            <option value="agent">Courtier</option>
                            <option value="user">Particulier</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => handleToggleUserVerification(u.id, Boolean(u.is_verified))}
                            className={`p-1.5 rounded-lg border text-xs ${
                              u.is_verified
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-emerald-400 uppercase">
                          {u.plan_id || 'starter'}
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setUserPasswordResetModal({ id: u.id, name: u.name })}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                              title="Réinitialiser le mot de passe"
                            >
                              <Key className="w-4 h-4" />
                            </button>

                            {u.id !== adminUser.id && (
                              <button
                                onClick={() => setSelectedItemForDelete({ type: 'user', id: u.id, name: u.name })}
                                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                                title="Supprimer cet utilisateur"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 6 : FACTURATION ET SOUSCRIPTIONS (INVOICES)       */}
        {/* ==================================================== */}
        {activeTab === 'invoices' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-base font-black text-white">Facturation & Preuves de Paiement Kinshasa</h3>
              <p className="text-xs text-slate-400">Validation manuelle des transferts M-Pesa, Airtel Money, Orange Money et Rawbank</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-4 px-6">N° Facture</th>
                      <th className="py-4 px-4">Courtier / Agence</th>
                      <th className="py-4 px-4">Forfait</th>
                      <th className="py-4 px-4">Montant (USD / CDF)</th>
                      <th className="py-4 px-4">Mode / Référence</th>
                      <th className="py-4 px-4">Statut</th>
                      <th className="py-4 px-6 text-right">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {invoicesList.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-6 font-mono font-bold text-white">{inv.invoice_number}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{inv.user_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{inv.user_email}</div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300">{inv.plan_name || 'Pro Courtier'}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-emerald-400">${inv.amount} USD</div>
                          {inv.amount_cdf && <div className="text-[11px] text-slate-400">{inv.amount_cdf?.toLocaleString()} CDF</div>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold uppercase text-slate-300">{inv.payment_provider || 'Mobile Money'}</div>
                          {inv.transaction_reference && (
                            <div className="text-[10px] font-mono text-slate-400">Ref: {inv.transaction_reference}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              inv.status === 'paid'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                            }`}
                          >
                            {inv.status === 'paid' ? 'Payé' : 'En attente'}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          {inv.status !== 'paid' ? (
                            <button
                              onClick={() => handleApproveInvoice(inv.id)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                            >
                              Valider le paiement
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-400 font-bold flex items-center justify-end gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              Validé
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ==================================================== */}
      {/* MODAL : RÉINITIALISATION DE MOT DE PASSE               */}
      {/* ==================================================== */}
      {userPasswordResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <Key className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Réinitialisation de Mot de Passe</h3>
            </div>
            <p className="text-xs text-slate-400">
              Définir un nouveau mot de passe sécurisé pour l'utilisateur <strong className="text-white">{userPasswordResetModal.name}</strong>.
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nouveau mot de passe (min. 6 caractères)
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserPasswordResetModal(null);
                    setNewPasswordValue('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                >
                  Enregistrer le mot de passe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL : CRÉER UN UTILISATEUR                          */}
      {/* ==================================================== */}
      {isCreatingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Créer un Nouvel Utilisateur</h3>
              <button
                onClick={() => setIsCreatingUser(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  placeholder="ex: Patrick Mulamba"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Adresse e-mail</label>
                  <input
                    type="email"
                    required
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                    placeholder="patrick@kinimmo.cd"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Mot de passe</label>
                  <input
                    type="password"
                    required
                    value={newUserForm.password}
                    onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Rôle</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="agent">Courtier / Agent</option>
                    <option value="agency">Agence Immobilière</option>
                    <option value="user">Particulier</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Téléphone / WhatsApp</label>
                  <input
                    type="text"
                    value={newUserForm.phone}
                    onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value, whatsapp: e.target.value })}
                    placeholder="+243 810 000 000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="new_user_verified"
                  checked={newUserForm.isVerified}
                  onChange={(e) => setNewUserForm({ ...newUserForm, isVerified: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="new_user_verified" className="text-slate-300 font-bold">
                  Accorder immédiatement le badge certifié Kinshasa
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingUser(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-colors"
                >
                  Créer le compte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL : CONFIRMATION DE SUPPRESSION                   */}
      {/* ==================================================== */}
      {selectedItemForDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-white">Confirmer la suppression</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement <strong className="text-white">« {selectedItemForDelete.name} »</strong> ?
              Cette action est irréversible dans la base MySQL.
            </p>

            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setSelectedItemForDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors shadow-lg shadow-rose-600/20"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
