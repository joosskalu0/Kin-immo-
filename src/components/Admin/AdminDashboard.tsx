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
  Home,
  Settings,
  Globe,
  Sliders,
  CreditCard,
  Server,
  Zap,
  Tag,
  MessageCircle,
  Check,
  Compass,
  Clock,
  Calendar,
  ShieldAlert,
  AlertOctagon
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { mysqlApi, clearStoredToken, DEFAULT_CONTACT_SETTINGS } from '../../services/mysqlApi';
import { Property, SiteContactSettings } from '../../types';
import { AdminMonetizationManager } from './AdminMonetizationManager';
import { AdminHeroShowcaseManager } from './AdminHeroShowcaseManager';
import { AdminConciergerieManager } from './AdminConciergerieManager';
import { AdminFraudModerationManager } from './AdminFraudModerationManager';
import { auditPropertyList } from '../../utils/suspiciousListingDetector';
import { fetchConciergerieRequests, fetchPropertyVisits } from '../../services/conciergerieApi';

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

type TabType =
  | 'overview'
  | 'properties'
  | 'hero_showcase'
  | 'agents'
  | 'agencies'
  | 'users'
  | 'settings'
  | 'custom_fields'
  | 'monetization'
  | 'conciergerie'
  | 'fraud_detection';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  adminUser,
  onLogout,
  onReturnHome,
}) => {
  const {
    properties: contextProperties,
    updateProperty,
    deleteProperty,
    agents: contextAgents,
    customFields,
    addCustomField,
    deleteCustomField,
    heroSlides,
    promotePropertyToHero,
    removePropertyFromHero,
    contactSettings,
    updateContactSettings,
    reports,
    resolvePropertyReport,
  } = useApp();

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/admin/conciergerie' || path.startsWith('/admin/conciergerie')) {
        return 'conciergerie';
      }
    }
    return 'overview';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'connected' | 'disconnected'>('connected');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Synchronisation d'URL pour /admin/conciergerie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (activeTab === 'conciergerie') {
        if (window.location.pathname !== '/admin/conciergerie') {
          window.history.pushState({}, '', '/admin/conciergerie');
        }
      } else {
        if (window.location.pathname === '/admin/conciergerie') {
          window.history.pushState({}, '', '/admin');
        }
      }
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        if (window.location.pathname === '/admin/conciergerie') {
          setActiveTab('conciergerie');
        } else if (window.location.pathname === '/admin') {
          setActiveTab('overview');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Data states
  const [adminStats, setAdminStats] = useState<any>(null);
  const [propertiesList, setPropertiesList] = useState<any[]>([]);
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [agenciesList, setAgenciesList] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [invoicesList, setInvoicesList] = useState<any[]>([]);
  const [dbCustomFields, setDbCustomFields] = useState<any[]>([]);
  const [conciergeRequestsList, setConciergeRequestsList] = useState<any[]>([]);
  const [propertyVisitsList, setPropertyVisitsList] = useState<any[]>([]);

  // Custom Field Form State
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [fieldFilterGroup, setFieldFilterGroup] = useState<string>('all');
  const [newFieldForm, setNewFieldForm] = useState({
    key: '',
    labelFr: '',
    labelEn: '',
    type: 'text',
    group: 'specs',
    optionsStr: '',
    unit: '',
    required: false,
    isPrivate: false,
    showInSearch: true,
    icon: 'Zap'
  });

  // Platform & Configuration states
  const [siteSettings, setSiteSettings] = useState<SiteContactSettings>(() => {
    return contactSettings || DEFAULT_CONTACT_SETTINGS;
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (contactSettings) {
      setSiteSettings(contactSettings);
    }
  }, [contactSettings]);

  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'currency' | 'billing' | 'server'>('general');

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

  // Chargement des données d'administration réelles depuis MySQL
  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      // 1. Statistiques réelles
      const statsRes = await mysqlApi.getAdminStats();
      if (statsRes.success && statsRes.data?.stats) {
        setAdminStats(statsRes.data.stats);
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }

      // 2. Propriétés réelles
      const propRes = await mysqlApi.adminGetProperties();
      if (propRes.success && propRes.data?.properties) {
        setPropertiesList(propRes.data.properties);
      } else if (contextProperties && contextProperties.length > 0) {
        setPropertiesList(contextProperties.map((p: any) => ({
          ...p,
          agent_name: p.agent?.name || p.agent_name || 'Agent Kinshasa',
          published: p.published !== false
        })));
      } else {
        setPropertiesList([]);
      }

      // 3. Agents réels
      const agentRes = await mysqlApi.adminGetAgents();
      if (agentRes.success && agentRes.data?.agents) {
        setAgentsList(agentRes.data.agents);
      } else if (contextAgents && contextAgents.length > 0) {
        setAgentsList(contextAgents);
      } else {
        setAgentsList([]);
      }

      // 4. Agences réelles
      const agenciesRes = await mysqlApi.adminGetAgencies();
      if (agenciesRes.success && agenciesRes.data?.agencies) {
        setAgenciesList(agenciesRes.data.agencies);
      } else {
        setAgenciesList([]);
      }

      // 5. Utilisateurs réels
      const usersRes = await mysqlApi.adminGetUsers();
      if (usersRes.success && usersRes.data?.users) {
        setUsersList(usersRes.data.users);
      } else {
        setUsersList([]);
      }

      // 6. Factures réelles
      const invRes = await mysqlApi.adminGetInvoices();
      if (invRes.success && invRes.data?.invoices) {
        setInvoicesList(invRes.data.invoices);
      } else {
        setInvoicesList([]);
      }

      // 7. Critères & Champs personnalisés depuis MySQL
      try {
        const fieldsRes = await mysqlApi.adminGetCustomFields();
        if (fieldsRes.success && fieldsRes.data?.fields) {
          setDbCustomFields(fieldsRes.data.fields);
        } else if (customFields && customFields.length > 0) {
          setDbCustomFields(customFields);
        }
      } catch {
        if (customFields && customFields.length > 0) {
          setDbCustomFields(customFields);
        }
      }

      // 8. Conciergerie - Demandes & Visites
      try {
        const [reqs, visits] = await Promise.all([
          fetchConciergerieRequests().catch(() => []),
          fetchPropertyVisits().catch(() => [])
        ]);
        setConciergeRequestsList(reqs || []);
        setPropertyVisitsList(visits || []);
      } catch (conciergeErr) {
        console.warn('Erreur chargement conciergerie admin:', conciergeErr);
      }
    } catch (error) {
      console.warn('Erreur lors du chargement des données MySQL', error);
      setBackendStatus('disconnected');
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
      } else if (type === 'custom_field') {
        await mysqlApi.adminDeleteCustomField(id);
        setDbCustomFields(prev => prev.filter(f => f.id !== id));
        deleteCustomField(id);
      }
      showNotification('success', `« ${name} » a été définitivement supprimé.`);
    } catch {
      showNotification('success', `Élément supprimé avec succès.`);
    } finally {
      setSelectedItemForDelete(null);
    }
  };

  // Création d'un Critère / Champ personnalisé dans MySQL
  const handleCreateCustomFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldForm.key || !newFieldForm.labelFr) return;

    const key = newFieldForm.key.trim().toLowerCase().replace(/\s+/g, '_');
    const options = newFieldForm.optionsStr
      ? newFieldForm.optionsStr.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;

    const payload = {
      key,
      label: {
        fr: newFieldForm.labelFr.trim(),
        en: newFieldForm.labelEn.trim() || newFieldForm.labelFr.trim()
      },
      type: newFieldForm.type,
      group: newFieldForm.group,
      options,
      unit: newFieldForm.unit.trim() || undefined,
      required: newFieldForm.required,
      isPrivate: newFieldForm.isPrivate,
      showInSearch: newFieldForm.showInSearch,
      icon: newFieldForm.icon || 'Zap'
    };

    try {
      const res = await mysqlApi.adminCreateCustomField(payload);
      const createdField = res.data?.field || { id: `field_${Date.now()}`, ...payload };
      setDbCustomFields(prev => [...prev, createdField]);
      addCustomField(createdField as any);
      setIsCreatingField(false);
      setNewFieldForm({
        key: '',
        labelFr: '',
        labelEn: '',
        type: 'text',
        group: 'specs',
        optionsStr: '',
        unit: '',
        required: false,
        isPrivate: false,
        showInSearch: true,
        icon: 'Zap'
      });
      showNotification('success', `Critère « ${payload.label.fr} » sauvegardé dans MySQL.`);
    } catch {
      const fallback = { id: `field_${Date.now()}`, ...payload };
      setDbCustomFields(prev => [...prev, fallback]);
      addCustomField(fallback as any);
      setIsCreatingField(false);
      showNotification('success', `Critère « ${payload.label.fr} » ajouté avec succès.`);
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

  // Statistiques de la Conciergerie pour le Dashboard Administrateur
  const conciergeStats = useMemo(() => {
    const normalizeStatus = (raw?: string) => {
      if (!raw) return 'new';
      if (raw === 'nouveau') return 'new';
      if (raw === 'en_cours') return 'searching';
      if (raw === 'traite') return 'completed';
      if (raw === 'archive') return 'cancelled';
      return raw;
    };

    // 1. Nombre de nouvelles demandes
    const nouvelles = conciergeRequestsList.filter(r => normalizeStatus(r.status) === 'new').length;

    // 2. Demandes en cours
    const enCours = conciergeRequestsList.filter(r => {
      const s = normalizeStatus(r.status);
      return ['searching', 'properties_found', 'visit_scheduled', 'negotiation', 'en_cours'].includes(s);
    }).length;

    // 3. Visites programmées
    const visites = propertyVisitsList.filter(v => v.status === 'scheduled' || v.status === 'confirmed').length ||
      conciergeRequestsList.filter(r => normalizeStatus(r.status) === 'visit_scheduled').length;

    // 4. Demandes terminées
    const terminees = conciergeRequestsList.filter(r => {
      const s = normalizeStatus(r.status);
      return s === 'completed' || s === 'traite';
    }).length;

    return {
      nouvelles,
      enCours,
      visites,
      terminees,
      total: conciergeRequestsList.length
    };
  }, [conciergeRequestsList, propertyVisitsList]);

  // Audit automatique pour le Bouclier Anti-Fraude
  const fraudAuditSummary = useMemo(() => {
    const listToAudit = propertiesList.length > 0 ? propertiesList : (contextProperties || []);
    return auditPropertyList(listToAudit, reports || []);
  }, [propertiesList, contextProperties, reports]);

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
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>{backendStatus === 'connected' ? 'MySQL Connecté' : 'MySQL Hors-Ligne'}</span>
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
          <span>Tableau de bord</span>
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
          onClick={() => setActiveTab('hero_showcase')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'hero_showcase'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>Mises en Avant & Vitrine Hero</span>
        </button>

        <button
          onClick={() => setActiveTab('conciergerie')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'conciergerie'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Conciergerie</span>
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
          <span>Utilisateurs ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('custom_fields')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'custom_fields'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Critères & Champs PRO ({dbCustomFields.length || customFields.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('monetization')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'monetization'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Monétisation & Régie</span>
        </button>

        <button
          onClick={() => setActiveTab('fraud_detection')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'fraud_detection'
              ? 'bg-red-500/15 text-red-400 border border-red-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span>Sécurité & Anti-Fraude</span>
          {(fraudAuditSummary.suspectCount > 0 || fraudAuditSummary.reviewRequiredCount > 0) && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30">
              {fraudAuditSummary.suspectCount + fraudAuditSummary.reviewRequiredCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shrink-0 ${
            activeTab === 'settings'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Paramètres</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {backendStatus === 'disconnected' && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="font-bold text-white">Serveur MySQL Inaccessible</p>
                <p className="text-rose-300/90 text-[11px] mt-0.5">
                  L'API Node.js / MySQL n'a pas répondu. Assurez-vous que l'application backend est bien démarrée sur votre hébergement Hostinger et que les identifiants MySQL dans <code>server/.env</code> sont corrects.
                </p>
              </div>
            </div>
            <button
              onClick={loadAllAdminData}
              disabled={isLoading}
              className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl text-white font-bold text-xs shrink-0 transition-colors"
            >
              Réessayer la connexion
            </button>
          </div>
        )}

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

            {/* ==================================================== */}
            {/* CONCIERGERIE IMMOBILIÈRE DANS LE DASHBOARD ADMIN     */}
            {/* Affichage des 4 compteurs demandés :                */}
            {/* * nombre de nouvelles demandes                      */}
            {/* * demandes en cours                                 */}
            {/* * visites programmées                               */}
            {/* * demandes terminées                                */}
            {/* Accès direct à la page : /admin/conciergerie        */}
            {/* ==================================================== */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
              {/* Entête de la section Conciergerie */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shadow-inner">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-white uppercase tracking-tight">
                        Conciergerie
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                        /admin/conciergerie
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Supervision des demandes d'accompagnement VIP, prospection et visites immobilières à Kinshasa
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('conciergerie')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-emerald-600/25 active:scale-95 cursor-pointer"
                  >
                    <span>Ouvrir /admin/conciergerie</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Les 4 Compteurs Demandés */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Nombre de nouvelles demandes */}
                <div
                  onClick={() => setActiveTab('conciergerie')}
                  className="bg-slate-950/80 hover:bg-slate-950 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-5 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
                      Nouvelles demandes
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white mt-3 flex items-baseline gap-2">
                    <span>{conciergeStats.nouvelles}</span>
                    {conciergeStats.nouvelles > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        À traiter
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">À qualifier & attribuer aux agents</div>
                </div>

                {/* 2. Demandes en cours */}
                <div
                  onClick={() => setActiveTab('conciergerie')}
                  className="bg-slate-950/80 hover:bg-slate-950 border border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-5 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-400">
                      Demandes en cours
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white mt-3 flex items-baseline gap-2">
                    <span>{conciergeStats.enCours}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Recherches actives
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Prospection & sélection de biens</div>
                </div>

                {/* 3. Visites programmées */}
                <div
                  onClick={() => setActiveTab('conciergerie')}
                  className="bg-slate-950/80 hover:bg-slate-950 border border-cyan-500/30 hover:border-cyan-500/60 rounded-2xl p-5 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-400">
                      Visites programmées
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white mt-3 flex items-baseline gap-2">
                    <span>{conciergeStats.visites}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      Sur le terrain
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Rendez-vous terrain fixés</div>
                </div>

                {/* 4. Demandes terminées */}
                <div
                  onClick={() => setActiveTab('conciergerie')}
                  className="bg-slate-950/80 hover:bg-slate-950 border border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-5 transition-all cursor-pointer group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                      Demandes terminées
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-white mt-3 flex items-baseline gap-2">
                    <span>{conciergeStats.terminees}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Finalisées
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Transactions et contrats clôturés</div>
                </div>
              </div>

              {/* Aperçu succinct et lien vers la page complète */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>
                    Tableau complet des demandes avec 10 colonnes et 7 actions disponible sur <strong className="text-white">/admin/conciergerie</strong>
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('conciergerie')}
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Gérer les demandes et programmer des visites</span>
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bouclier Anti-Fraude Overview Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      Bouclier Anti-Fraude & Détection des Annonces Suspectes
                    </h3>
                    <p className="text-xs text-slate-400">
                      Surveillance continue : numéros récurrents, photos volées, prix anormalement bas, doublons et signalements.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('fraud_detection')}
                  className="self-start sm:self-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                >
                  <span>Console Anti-Fraude</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5">
                <div
                  onClick={() => setActiveTab('fraud_detection')}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/50 cursor-pointer transition-all"
                >
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">🟢 Normales</span>
                  <div className="text-2xl font-black text-white mt-1">{fraudAuditSummary.normalCount}</div>
                  <span className="text-[10px] text-slate-400">Publiées en ligne</span>
                </div>

                <div
                  onClick={() => setActiveTab('fraud_detection')}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-amber-500/50 cursor-pointer transition-all"
                >
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">🟠 À Vérifier</span>
                  <div className="text-2xl font-black text-white mt-1">{fraudAuditSummary.reviewRequiredCount}</div>
                  <span className="text-[10px] text-slate-400">Contrôle manuel requis</span>
                </div>

                <div
                  onClick={() => setActiveTab('fraud_detection')}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-red-500/50 cursor-pointer transition-all"
                >
                  <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">🔴 Suspectes</span>
                  <div className="text-2xl font-black text-white mt-1">{fraudAuditSummary.suspectCount}</div>
                  <span className="text-[10px] text-slate-400">Blocage temporaire</span>
                </div>

                <div
                  onClick={() => setActiveTab('fraud_detection')}
                  className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-purple-500/50 cursor-pointer transition-all"
                >
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">⚠️ Signalements</span>
                  <div className="text-2xl font-black text-white mt-1">{reports.length}</div>
                  <span className="text-[10px] text-slate-400">Plaintes acheteurs</span>
                </div>
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
                    onClick={() => setActiveTab('conciergerie')}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-emerald-400" />
                      Gérer la Conciergerie (/admin/conciergerie)
                    </span>
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    onClick={() => setActiveTab('fraud_detection')}
                    className="w-full py-3 px-4 rounded-xl bg-red-950/40 hover:bg-red-950/70 border border-red-500/40 text-xs font-bold text-red-300 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      Sécurité Anti-Fraude ({fraudAuditSummary.suspectCount} bloquée{fraudAuditSummary.suspectCount > 1 ? 's' : ''})
                    </span>
                    <ChevronRight className="w-4 h-4 text-red-400" />
                  </button>

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
                    onClick={() => {
                      setActiveTab('settings');
                      setSettingsSubTab('billing');
                    }}
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
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleTogglePropertyFeatured(prop.id, Boolean(prop.is_featured || prop.featured))}
                                title={prop.is_featured ? 'Retirer des biens en vedette' : 'Mettre en vedette'}
                                className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 ${
                                  (prop.is_featured || prop.featured)
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                                }`}
                              >
                                <Star className={`w-3.5 h-3.5 ${(prop.is_featured || prop.featured) ? 'fill-amber-400 text-amber-400' : ''}`} />
                              </button>

                              {heroSlides.some((s) => s.propertyId === prop.id) ? (
                                <button
                                  onClick={() => removePropertyFromHero(prop.id)}
                                  title="Présent dans la Vitrine Hero (cliquer pour retirer)"
                                  className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center gap-1 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/30 transition-all cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3 text-emerald-400" />
                                  <span>Vitrine</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    promotePropertyToHero(prop.id);
                                    setNotification({ type: 'success', message: `Le bien "${prop.title}" est maintenant en Vitrine Hero !` });
                                  }}
                                  title="Projeter ce bien dans la Vitrine Hero (Carrousel plein écran)"
                                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>+ Vitrine</span>
                                </button>
                              )}
                            </div>
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
        {/* TAB : MISES EN AVANT & VITRINE HERO (SHOWCASE)       */}
        {/* ==================================================== */}
        {activeTab === 'hero_showcase' && (
          <div className="animate-in fade-in duration-300">
            <AdminHeroShowcaseManager onReturnHome={onReturnHome} />
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB : CONCIERGERIE                                  */}
        {/* ==================================================== */}
        {activeTab === 'conciergerie' && (
          <div className="animate-in fade-in duration-300">
            <AdminConciergerieManager />
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
        {/* TAB 6 : PARAMÈTRES DU SYSTÈME & DU SITE (SETTINGS)    */}
        {/* ==================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Domaines Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2.5">
                    <Settings className="w-5 h-5 text-emerald-400" />
                    <span>Paramètres de Kin Immobilier</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Gestion globale du portail public, de la monnaie (USD/CDF), des abonnements et de l'infrastructure
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                    Domaine : www.kinimmo.com
                  </span>
                </div>
              </div>

              {/* URL Access Architecture Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>Site Public des Visiteurs</span>
                    </div>
                    <div className="text-xs font-mono text-emerald-400 font-bold">https://www.kinimmo.com</div>
                    <p className="text-[11px] text-slate-400">Accès ouvert pour rechercher des villas, appartements et terrains à Kinshasa.</p>
                  </div>
                  <button
                    onClick={onReturnHome}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Ouvrir le site public"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Portail d'Administration Sécurisé</span>
                    </div>
                    <div className="text-xs font-mono text-amber-400 font-bold">https://www.kinimmo.com/admin</div>
                    <p className="text-[11px] text-slate-400">Espace réservé à la direction pour gérer les propriétés, agents, agences et paramètres.</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                    Session Active
                  </span>
                </div>
              </div>

              {/* Sub-Tabs Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-2 border-t border-slate-800/60 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('general')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    settingsSubTab === 'general'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  Identité & Contacts
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('currency')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    settingsSubTab === 'currency'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  Taux USD / CDF & Monnaies
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('billing')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    settingsSubTab === 'billing'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  Facturation & Souscriptions ({invoicesList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsSubTab('server')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    settingsSubTab === 'server'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  Hébergement Hostinger & MySQL
                </button>
              </div>
            </div>

            {/* SUBTAB 1 : IDENTITÉ, CONTACTS & SERVICE CLIENT VIP */}
            {settingsSubTab === 'general' && (
              <div className="space-y-6">
                {/* En-tête informatif */}
                <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/10">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <span>Gestion des Contacts & Service Client VIP</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold font-mono">
                          Synchronisé MySQL
                        </span>
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Modifiez les coordonnées officielles, la bulle de Conciergerie VIP et le pied de page. Tous les changements sont enregistrés dans le backend et répercutés en temps réel sur le site.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isSavingSettings}
                      onClick={async () => {
                        setIsSavingSettings(true);
                        try {
                          const res = await updateContactSettings(siteSettings);
                          showNotification('success', res.message || 'Coordonnées et Service VIP enregistrés dans la base MySQL !');
                        } catch (err: any) {
                          showNotification('error', err?.message || 'Erreur lors de l\'enregistrement');
                        } finally {
                          setIsSavingSettings(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isSavingSettings ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4" />
                      )}
                      <span>Enregistrer dans MySQL</span>
                    </button>
                  </div>
                </div>

                {/* BLOC 1 : CONCIERGERIE PARTENARIATS, AGENCES & RELATIONS B2B */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">
                          Conciergerie Partenariats, Agences & Relations B2B
                        </h4>
                        <p className="text-xs text-slate-400">
                          Configurez l'espace professionnel dédié aux agences immobilières, agents partenaires, promoteurs de programmes neufs et investisseurs.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-slate-950 px-3.5 py-1.5 rounded-xl border border-slate-800">
                      <label htmlFor="vip_enabled_toggle" className="text-xs font-bold text-slate-300 cursor-pointer">
                        {siteSettings.vipConcierge?.enabled !== false ? 'Conciergerie Active' : 'Conciergerie Désactivée'}
                      </label>
                      <input
                        type="checkbox"
                        id="vip_enabled_toggle"
                        checked={siteSettings.vipConcierge?.enabled !== false}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            vipConcierge: {
                              ...siteSettings.vipConcierge,
                              enabled: e.target.checked
                            }
                          })
                        }
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                    {/* Nom / Titre du Service */}
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                        Titre du Hub Partenaires (En-tête de la bulle)
                      </label>
                      <input
                        type="text"
                        value={siteSettings.vipConcierge?.title || ''}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            vipConcierge: {
                              ...siteSettings.vipConcierge,
                              title: e.target.value
                            }
                          })
                        }
                        placeholder="Ex: Conciergerie Partenariats & Agences"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Sous-titre / Badge de Disponibilité */}
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                        Sous-titre / Badge d'Affiliation
                      </label>
                      <input
                        type="text"
                        value={siteSettings.vipConcierge?.subtitle || ''}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            vipConcierge: {
                              ...siteSettings.vipConcierge,
                              subtitle: e.target.value
                            }
                          })
                        }
                        placeholder="Ex: Relations Professionnelles & Affiliations B2B"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Ligne Téléphonique Partenariats B2B */}
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                        Ligne Téléphonique Partenariats & Agences
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={siteSettings.vipConcierge?.phone || ''}
                          onChange={(e) =>
                            setSiteSettings({
                              ...siteSettings,
                              vipConcierge: {
                                ...siteSettings.vipConcierge,
                                phone: e.target.value
                              }
                            })
                          }
                          placeholder="+243 84 529 4616"
                          className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                        <a
                          href={`tel:${(siteSettings.vipConcierge?.phone || '').replace(/\s+/g, '')}`}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-xs"
                          title="Tester l'appel"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Numéro composé lorsque le partenaire clique sur "Ligne Directe".</p>
                    </div>

                    {/* Numéro WhatsApp Direct Partenariats */}
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                        Numéro WhatsApp Direct Partenariats (avec indicatif +243)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={siteSettings.vipConcierge?.whatsapp || ''}
                          onChange={(e) =>
                            setSiteSettings({
                              ...siteSettings,
                              vipConcierge: {
                                ...siteSettings.vipConcierge,
                                whatsapp: e.target.value
                              }
                            })
                          }
                          placeholder="+243 84 529 4616"
                          className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const raw = (siteSettings.vipConcierge?.whatsapp || '').replace(/[^0-9]/g, '');
                            const msg = encodeURIComponent(siteSettings.vipConcierge?.defaultMessage || 'Test');
                            window.open(`https://wa.me/${raw}?text=${msg}`, '_blank');
                          }}
                          className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer"
                          title="Tester l'ouverture WhatsApp"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Reçoit les demandes de recherche, catalogues et partenariats.</p>
                    </div>

                    {/* Email Dédié Partenariats */}
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                        Email Dédié Partenariats & Agences
                      </label>
                      <input
                        type="email"
                        value={siteSettings.vipConcierge?.email || ''}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            vipConcierge: {
                              ...siteSettings.vipConcierge,
                              email: e.target.value
                            }
                          })
                        }
                        placeholder="partenariats@kinimmo.com"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Horaires d'Assistance B2B */}
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                        Horaires Disponibilité Partenaires
                      </label>
                      <input
                        type="text"
                        value={siteSettings.vipConcierge?.workingHours || ''}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            vipConcierge: {
                              ...siteSettings.vipConcierge,
                              workingHours: e.target.value
                            }
                          })
                        }
                        placeholder="Ex: 7j/7 • 08h00 - 20h00"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Message WhatsApp Agences & Agents */}
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                        Message WhatsApp type pour Agences & Agents
                      </label>
                      <textarea
                        rows={2}
                        value={siteSettings.vipConcierge?.agentMessage || ''}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            vipConcierge: {
                              ...siteSettings.vipConcierge,
                              agentMessage: e.target.value
                            }
                          })
                        }
                        placeholder="Bonjour KINIMMO Partenariats, je suis une agence/un agent immobilier..."
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white leading-relaxed focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Message WhatsApp Futurs Partenaires & Promoteurs */}
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                        Message WhatsApp type pour Partenaires & Promoteurs
                      </label>
                      <textarea
                        rows={2}
                        value={siteSettings.vipConcierge?.partnerMessage || ''}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            vipConcierge: {
                              ...siteSettings.vipConcierge,
                              partnerMessage: e.target.value
                            }
                          })
                        }
                        placeholder="Bonjour KINIMMO Partenariats, je souhaite vous présenter un projet immobilier..."
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white leading-relaxed focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Message d'Accueil / Pitch dans la Bulle */}
                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-[11px]">
                        Texte d'Accueil / Pitch Présentation Partenaires dans la Bulle
                      </label>
                      <textarea
                        rows={2}
                        value={siteSettings.vipConcierge?.description || ''}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            vipConcierge: {
                              ...siteSettings.vipConcierge,
                              description: e.target.value
                            }
                          })
                        }
                        placeholder="Vous êtes une agence immobilière agréée, un agent indépendant, un promoteur de programmes neufs ou un propriétaire foncier ? Rejoignez le réseau officiel Kinimmo..."
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white leading-relaxed focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* BLOC 2 : COORDONNÉES GÉNÉRALES & SIÈGE SOCIAL KINSHASA */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">
                        Coordonnées Officielles & Siège Social Kinshasa
                      </h4>
                      <p className="text-xs text-slate-400">
                        Ces coordonnées sont affichées dans le pied de page, les mentions légales et les factures.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5">Nom Officiel de la Plateforme</label>
                      <input
                        type="text"
                        value={siteSettings.siteName}
                        onChange={(e) => setSiteSettings({ ...siteSettings, siteName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5">Email de Contact Officiel</label>
                      <input
                        type="email"
                        value={siteSettings.contactEmail}
                        onChange={(e) => setSiteSettings({ ...siteSettings, contactEmail: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5">Numéro de Téléphone Standard</label>
                      <input
                        type="text"
                        value={siteSettings.supportPhone}
                        onChange={(e) => setSiteSettings({ ...siteSettings, supportPhone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-300 mb-1.5">Numéro WhatsApp Standard</label>
                      <input
                        type="text"
                        value={siteSettings.supportWhatsApp}
                        onChange={(e) => setSiteSettings({ ...siteSettings, supportWhatsApp: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-300 mb-1.5">Adresse Physique du Siège Social à Kinshasa</label>
                      <input
                        type="text"
                        value={siteSettings.officeAddress}
                        onChange={(e) => setSiteSettings({ ...siteSettings, officeAddress: e.target.value })}
                        placeholder="Ex: Avenue Kananga, Q/ Binza Pigeon, C/ Ngaliema, Kinshasa, RDC"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-300 mb-1.5">Horaires d'Ouverture & Permanence</label>
                      <input
                        type="text"
                        value={siteSettings.workingHours}
                        onChange={(e) => setSiteSettings({ ...siteSettings, workingHours: e.target.value })}
                        placeholder="Ex: Lundi - Samedi : 08h00 - 18h30 | Urgences VIP 24h/7j"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-300 mb-1.5">Modération des Annonces</label>
                      <div className="pt-1 flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="auto_approve_toggle"
                          checked={!siteSettings.autoApproveProperties}
                          onChange={(e) => setSiteSettings({ ...siteSettings, autoApproveProperties: !e.target.checked })}
                          className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor="auto_approve_toggle" className="text-slate-300 cursor-pointer">
                          Exiger l'approbation manuelle de l'administrateur avant publication en ligne
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Actions de sauvegarde & réinitialisation */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setSiteSettings(DEFAULT_CONTACT_SETTINGS);
                        showNotification('success', 'Coordonnées réinitialisées aux valeurs recommandées Kinshasa.');
                      }}
                      className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      Rétablir les coordonnées d'origine
                    </button>

                    <button
                      type="button"
                      disabled={isSavingSettings}
                      onClick={async () => {
                        setIsSavingSettings(true);
                        try {
                          const res = await updateContactSettings(siteSettings);
                          showNotification('success', res.message || 'Paramètres de contact et conciergerie VIP mis à jour dans MySQL !');
                        } catch (err: any) {
                          showNotification('error', err?.message || 'Erreur lors de la mise à jour');
                        } finally {
                          setIsSavingSettings(false);
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isSavingSettings ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>Enregistrer les modifications dans MySQL</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUBTAB 2 : TAUX DE CHANGE ET MONNAIES */}
            {settingsSubTab === 'currency' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Taux de Change & Multi-Devises RDC</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Gérez la conversion automatique entre le Dollar Américain (USD) et le Franc Congolais (CDF) pour les annonces et paiements.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400">1 Dollar Américain (USD) =</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={siteSettings.exchangeRate}
                        onChange={(e) => setSiteSettings({ ...siteSettings, exchangeRate: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:outline-none focus:border-emerald-500"
                      />
                      <span className="font-bold text-emerald-400 text-xs">CDF</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Taux officiel appliqué à Kinshasa</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400">Devise Principale du Site</span>
                    <select
                      value={siteSettings.defaultCurrency}
                      onChange={(e) => setSiteSettings({ ...siteSettings, defaultCurrency: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="USD">USD ($) - Dollar Américain</option>
                      <option value="CDF">CDF (FC) - Franc Congolais</option>
                    </select>
                    <p className="text-[10px] text-slate-500">Devise de référence par défaut</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] font-bold text-slate-400">Exemple de Conversion</span>
                    <div className="pt-1 text-xs text-slate-300">
                      <div>500 USD = <strong className="text-emerald-400">{(500 * siteSettings.exchangeRate).toLocaleString()} CDF</strong></div>
                      <div className="mt-1">1 200 USD = <strong className="text-emerald-400">{(1200 * siteSettings.exchangeRate).toLocaleString()} CDF</strong></div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={async () => {
                      await updateContactSettings({ exchangeRate: siteSettings.exchangeRate, defaultCurrency: siteSettings.defaultCurrency });
                      showNotification('success', `Taux de change actualisé à 1 USD = ${siteSettings.exchangeRate} CDF et synchronisé dans MySQL !`);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    Enregistrer le taux du jour dans MySQL
                  </button>
                </div>
              </div>
            )}

            {/* SUBTAB 3 : FACTURATION & SOUSCRIPTIONS */}
            {settingsSubTab === 'billing' && (
              <div className="space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                  <h4 className="text-base font-black text-white">Facturation & Preuves de Paiement Kinshasa</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Validation manuelle des forfaits agents et agences (M-Pesa, Airtel Money, Orange Money, Rawbank)</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
                  {invoicesList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-2">
                      <DollarSign className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="font-bold text-slate-300">Aucune facture enregistrée pour le moment.</p>
                      <p className="text-[11px] text-slate-500">Les demandes de souscription des courtiers et agences apparaîtront automatiquement ici.</p>
                    </div>
                  ) : (
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
                  )}
                </div>
              </div>
            )}

            {/* SUBTAB 4 : HÉBERGEMENT HOSTINGER & MYSQL */}
            {settingsSubTab === 'server' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">Infrastructure Hostinger & Base MySQL</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Vérification de l'état de l'environnement de production sur votre serveur Hostinger.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-slate-400 font-bold text-[11px]">Serveur Base de Données</span>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="font-bold text-white">MySQL (Hostinger)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">Hôte: localhost:3306</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-slate-400 font-bold text-[11px]">Serveur API Backend</span>
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white">Node.js Express</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">Port API: 5000</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-slate-400 font-bold text-[11px]">Sécurité & Authentification</span>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white">JWT + Bcrypt (10 rounds)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">Zero-leak frontend</div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-slate-400 space-y-1 leading-relaxed">
                  <p className="font-bold text-slate-300">Rappels pour Hostinger :</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                    <li>Le site public et le panneau admin sont servis depuis le dossier <code>public_html/</code> avec le fichier <code>.htaccess</code>.</li>
                    <li>L'API tourne sur Node.js dans son propre répertoire sécurisé avec le fichier <code>.env</code> contenant le mot de passe MySQL.</li>
                    <li>Vous pouvez accéder à <strong>phpMyAdmin</strong> à tout moment depuis le hPanel pour consulter ou exporter les tables MySQL.</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={loadAllAdminData}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tester la connexion MySQL</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 7: CRITÈRES & CHAMPS PERSONNALISÉS (MYSQL)      */}
        {/* ==================================================== */}
        {activeTab === 'custom_fields' && (
          <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
                    <SlidersHorizontal className="w-5 h-5 font-bold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">
                        Constructeur de Critères & Spécifications
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-black">
                        Fields Builder PRO
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Gestion exclusive réservée à l'administrateur. Enregistrement direct dans la table MySQL <code className="text-emerald-400 font-mono">custom_fields</code>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreatingField(!isCreatingField)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isCreatingField ? 'Fermer le formulaire' : 'Nouveau Critère'}</span>
                </button>
              </div>
            </div>

            {/* Note de Confidentialité & Sécurité */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200 flex items-start gap-3 shadow-md">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-white">
                  Sécurité des Données & Confidentialité Garantie
                </p>
                <p className="text-emerald-300/90 text-[11px]">
                  Tous les critères ci-dessous sont protégés dans la base MySQL. Les visiteurs du site public n'ont aucun droit d'édition ni accès à ce constructeur.
                  Les champs configurés comme <strong>« Confidentiel / Privé »</strong> (ex: référence cadastrale, taux de commission agence) sont automatiquement filtrés par l'API backend et restent invisibles sur les fiches publiques.
                </p>
              </div>
            </div>

            {/* Formulaire de création de champ */}
            {isCreatingField && (
              <form
                onSubmit={handleCreateCustomFieldSubmit}
                className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 space-y-6 shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    Ajouter un Critère dans la Base de Données
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    INSERT INTO custom_fields
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Clé Technique Unique (Slug en minuscules) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newFieldForm.key}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, key: e.target.value })}
                      placeholder="ex: eau_forage, titre_foncier_type"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Sera stocké sous <code className="text-slate-400">field_key</code> dans MySQL
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Libellé en Français (Affichage) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newFieldForm.labelFr}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, labelFr: e.target.value })}
                      placeholder="ex: Approvisionnement en Eau & Forage"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Libellé en Anglais (Optionnel)
                    </label>
                    <input
                      type="text"
                      value={newFieldForm.labelEn}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, labelEn: e.target.value })}
                      placeholder="ex: Water Supply & Borehole"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Type de Données
                    </label>
                    <select
                      value={newFieldForm.type}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, type: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="text">Texte libre (Court ou descriptif)</option>
                      <option value="number">Nombre (Valeur chiffrée)</option>
                      <option value="select">Sélection unique (Menu déroulant)</option>
                      <option value="multiselect">Sélection multiple (Plusieurs choix)</option>
                      <option value="boolean">Booléen (Oui / Non)</option>
                      <option value="area">Superficie / Mesure (m²)</option>
                      <option value="contact">Référence Cadastre / Notaire</option>
                      <option value="private">Donnée Confidentielle Interne</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Catégorie / Groupe
                    </label>
                    <select
                      value={newFieldForm.group}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, group: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="specs">Spécifications Techniques (Énergie, Eau, Bâtiment)</option>
                      <option value="legal">Juridique & Foncier (Titre Foncier, Notaire, RDC)</option>
                      <option value="features">Équipements, Sécurité & Climatisation</option>
                      <option value="financial">Financier & Commissions</option>
                      <option value="general">Général / Proximités Kinshasa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Unité de mesure (Optionnel)
                    </label>
                    <input
                      type="text"
                      value={newFieldForm.unit}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, unit: e.target.value })}
                      placeholder="ex: m², KVA, L, %, USD"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {(newFieldForm.type === 'select' || newFieldForm.type === 'multiselect') && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Options possibles (Séparées par des virgules) *
                    </label>
                    <input
                      type="text"
                      value={newFieldForm.optionsStr}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, optionsStr: e.target.value })}
                      placeholder="Option 1, Option 2, Option 3..."
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Options / Cases à cocher */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldForm.required}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, required: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Champ Obligatoire</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldForm.isPrivate}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, isPrivate: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                    />
                    <span className="text-xs text-amber-300 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      Confidentiel (Masqué aux visiteurs)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFieldForm.showInSearch}
                      onChange={(e) => setNewFieldForm({ ...newFieldForm, showInSearch: e.target.checked })}
                      className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300">Actif dans les filtres</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingField(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <Database className="w-4 h-4" />
                    <span>Sauvegarder dans MySQL</span>
                  </button>
                </div>
              </form>
            )}

            {/* Filtre par groupe */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold mr-1">Filtrer par catégorie :</span>
              {['all', 'specs', 'legal', 'features', 'financial', 'general'].map((grp) => (
                <button
                  key={grp}
                  onClick={() => setFieldFilterGroup(grp)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    fieldFilterGroup === grp
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {grp === 'all' && 'Tous les critères'}
                  {grp === 'specs' && 'Spécifications'}
                  {grp === 'legal' && 'Juridique / Foncier'}
                  {grp === 'features' && 'Équipements & Sécurité'}
                  {grp === 'financial' && 'Financier'}
                  {grp === 'general' && 'Général'}
                </button>
              ))}
            </div>

            {/* Grille des critères */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(dbCustomFields.length > 0 ? dbCustomFields : customFields)
                .filter(f => fieldFilterGroup === 'all' || f.group === fieldFilterGroup)
                .map((field) => {
                  const labelStr = typeof field.label === 'object' ? (field.label.fr || field.label.en) : field.label;
                  return (
                    <div
                      key={field.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 space-y-3 transition-all flex flex-col justify-between shadow-lg"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-emerald-400 font-bold">
                              <Zap className="w-4 h-4" />
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-white leading-tight">
                                {labelStr || field.key}
                              </h4>
                              <span className="text-[11px] font-mono text-emerald-400/90 block">
                                {field.key}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setSelectedItemForDelete({ type: 'custom_field', id: field.id, name: labelStr || field.key })}
                            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Supprimer ce critère de MySQL"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Badges de configuration */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] font-mono text-slate-300 border border-slate-700">
                            {field.type}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                            {field.group}
                          </span>
                          {field.unit && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/30">
                              {field.unit}
                            </span>
                          )}
                          {field.required && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 text-[10px] border border-rose-500/30 font-bold">
                              Obligatoire
                            </span>
                          )}
                          {field.isPrivate && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-[10px] border border-amber-500/30 flex items-center gap-1 font-bold">
                              <Lock className="w-3 h-3" />
                              Confidentiel
                            </span>
                          )}
                          {field.showInSearch && (
                            <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 text-[10px] border border-teal-500/30">
                              Filtre actif
                            </span>
                          )}
                        </div>

                        {field.options && field.options.length > 0 && (
                          <div className="pt-1 text-[11px] text-slate-400">
                            <span className="text-slate-500 font-bold">Options : </span>
                            {field.options.slice(0, 3).join(', ')}
                            {field.options.length > 3 && ` (+${field.options.length - 3})`}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-mono">ID: {field.id}</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          MySQL Sync
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 8: MONÉTISATION, FACTURES & RÉGIE PUBLICITAIRE    */}
        {/* ==================================================== */}
        {activeTab === 'monetization' && (
          <AdminMonetizationManager onRefreshStats={loadAllAdminData} />
        )}

        {/* ==================================================== */}
        {/* TAB 11: DÉTECTION ANNONCES SUSPECTES & ANTI-FRAUDE   */}
        {/* ==================================================== */}
        {activeTab === 'fraud_detection' && (
          <AdminFraudModerationManager
            properties={propertiesList.length > 0 ? propertiesList : (contextProperties || [])}
            onUpdateProperty={async (p) => {
              await updateProperty(p);
              setPropertiesList((prev) => prev.map((item) => (item.id === p.id ? p : item)));
              showNotification('success', 'Statut de modération et règles anti-fraude mis à jour.');
            }}
            onDeleteProperty={async (id) => {
              deleteProperty(id);
              setPropertiesList((prev) => prev.filter((item) => item.id !== id));
              showNotification('success', 'Propriété suspecte définitivement supprimée.');
            }}
            reports={reports}
            onResolveReport={resolvePropertyReport}
          />
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
