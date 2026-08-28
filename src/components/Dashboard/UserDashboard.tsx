import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { initialSubscriptionPlans } from '../../data/mockData';
import { Property, LeadRequest, User } from '../../types';
import { AdminDatabaseManager } from './AdminDatabaseManager';
import { AdminBillingManager } from './AdminBillingManager';
import { AdminSettingsManager } from './AdminSettingsManager';
import { AdminVerificationManager } from './AdminVerificationManager';
import { PropertyAnalyticsView } from './PropertyAnalyticsView';
import { PaymentReminderBanner } from './PaymentReminderBanner';
import { TagManagerSettingsModal } from './TagManagerSettingsModal';
import { AdminPlansPricingManager } from './AdminPlansPricingManager';
import { getAdminCredentials, verifyAdminPin } from '../../lib/adminCredentials';
import { saveUserToFirestore } from '../../lib/firebase';
import {
  Home,
  Building2,
  Users,
  Search,
  CreditCard,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit,
  Eye,
  Check,
  CheckCircle2,
  Sparkles,
  Bell,
  Send,
  Download,
  Upload,
  Shield,
  ShieldCheck,
  BadgeCheck,
  KeyRound,
  Zap,
  Database,
  Receipt,
  Lock,
  X,
  BarChart3,
  TrendingUp,
  Sliders,
  Layers,
  Coins,
  Clock,
  Camera,
  UploadCloud,
} from 'lucide-react';

interface UserDashboardProps {
  onReturnHome?: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ onReturnHome }) => {
  const {
    user,
    setUser,
    properties,
    updateProperty,
    deleteProperty,
    setEditingProperty,
    setIsSubmitPropertyOpen,
    setActivePropertyModalId,
    setIsSecurityModalOpen,
    setIsAuthModalOpen,
    savedSearches,
    deleteSavedSearch,
    leads,
    updateLeadStatus,
    deleteLead,
    exportCSV,
    importCSV,
    invoices,
    requestConfirm,
    agents,
    allUsers,
    subscriptionPlans,
    pricingDisplayCurrency,
    cdfExchangeRate
  } = useApp();

  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState<'analytics' | 'verification' | 'billing' | 'database' | 'admin_settings' | 'listings' | 'my_invoices' | 'leads' | 'saved' | 'plans' | 'csv' | 'gtm_manager'>(
    isAdmin ? 'admin_settings' : 'analytics'
  );
  const [csvTextInput, setCsvTextInput] = useState('');
  const [selectedPlanSuccess, setSelectedPlanSuccess] = useState<string | null>(null);
  const [isTagManagerModalOpen, setIsTagManagerModalOpen] = useState(false);

  // Invoices belonging to this logged-in user or agent
  const myInvoices = invoices.filter(
    (inv) =>
      inv.targetEmail?.toLowerCase() === user?.email?.toLowerCase() ||
      inv.targetName?.toLowerCase().includes(user?.name?.toLowerCase() || '___') ||
      inv.targetId === user?.id ||
      (user?.phone && inv.targetPhone && inv.targetPhone.replace(/\s+/g, '').includes(user.phone.replace(/\s+/g, '')))
  );

  // Admin PIN Protection State
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Profile photo upload from gallery
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState(false);

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('La photo sélectionnée est trop volumineuse (max 8 Mo).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const updatedUser: User = {
          ...user,
          avatar: event.target.result,
        };
        setUser(updatedUser);
        localStorage.setItem('estatik_kinshasa_user', JSON.stringify(updatedUser));
        saveUserToFirestore(updatedUser).catch(console.error);
        setPhotoUploadSuccess(true);
        setTimeout(() => setPhotoUploadSuccess(false), 3000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPin(pinInput)) {
      handleSwitchToAdmin();
      setShowPinModal(false);
      setPinInput('');
      setPinError(null);
    } else {
      setPinError('Code PIN Administrateur incorrect. Accès refusé.');
    }
  };

  const handleSwitchToAdmin = () => {
    const creds = getAdminCredentials();
    const adminProfile: User = {
      id: 'usr_admin_001',
      name: creds.name,
      email: creds.email,
      phone: creds.phone,
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      agencyName: creds.agencyName,
      rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
      planId: 'pro',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      kinshasaBadgeVerified: true,
      lastLoginLocation: 'Kinshasa (Gombe), RDC',
      createdAt: new Date().toISOString(),
    };
    setUser(adminProfile);
    localStorage.setItem('estatik_kinshasa_user', JSON.stringify(adminProfile));
    setActiveTab('admin_settings');
  };

  // If not logged in at all
  if (!user) {
    return (
      <div className="p-8 sm:p-12 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 max-w-2xl mx-auto my-8 shadow-2xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-black uppercase tracking-wider">
            Espace Administrateur & Agent
          </span>
          <h3 className="text-2xl font-black text-white">Connectez-vous à votre Espace Administrateur</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Accédez à la gestion des annonces, demandes de clients, facturation globale et outils d'administration centralisés.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
              title="Retourner à la page d'accueil"
            >
              <Home className="w-4 h-4 text-emerald-400" />
              <span>Retour à l'Accueil</span>
            </button>
          )}

          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4 text-slate-950" />
            <span>Se Connecter / Formulaire Authentification</span>
          </button>

          <button
            onClick={() => {
              setPinInput('');
              setPinError(null);
              setShowPinModal(true);
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Accès Administrateur Protégé (PIN)</span>
          </button>
        </div>

        {/* PIN PROMPT MODAL FOR UNLOGGED USER */}
        {showPinModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-left space-y-4">
              <button
                onClick={() => setShowPinModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-white">Déverrouillage Administrateur</h4>
                  <p className="text-xs text-slate-400">Saisissez votre code PIN d'administration secret</p>
                </div>
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs">
                  {pinError}
                </div>
              )}

              <form onSubmit={handleVerifyAdminPin} autoComplete="off" className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Code PIN Secret Administrateur
                  </label>
                  <input
                    type="password"
                    maxLength={20}
                    required
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    data-lpignore="true"
                    value={pinInput}
                    onChange={(e) => {
                      setPinInput(e.target.value);
                      if (pinError) setPinError(null);
                    }}
                    placeholder="••••"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center text-2xl font-mono text-emerald-400 tracking-[0.5em] focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-xs hover:opacity-90 flex items-center justify-center gap-2 shadow-lg"
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-950" />
                    <span>Valider Code PIN</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Filter properties belonging to user/agent/agency
  const myProperties = properties.filter(
    (p) =>
      user?.role === 'admin' ||
      p.agentId === user?.agentId ||
      p.agentId === user?.id ||
      p.agencyId === user?.agencyId ||
      p.agencyId === user?.id ||
      (user?.agencyName && p.agencyName?.toLowerCase() === user.agencyName.toLowerCase()) ||
      (user?.email && (
        p.agentId === user.email ||
        p.contactEmail?.toLowerCase() === user.email.toLowerCase() ||
        p.privateFields?.ownerEmail?.toLowerCase() === user.email.toLowerCase()
      ))
  );

  const handleCsvUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (csvTextInput.trim()) {
      importCSV(csvTextInput);
      setCsvTextInput('');
      alert('Importation CSV réussie ! Les propriétés ont été ajoutées.');
    }
  };

  const handleSelectPlan = (planName: string) => {
    setSelectedPlanSuccess(planName);
    setTimeout(() => setSelectedPlanSuccess(null), 4000);
  };

  const pendingVerificationsCount = (agents || []).filter(
    (a) => !a.isVerified && a.verificationStatus === 'pending'
  ).length;

  return (
    <div className="space-y-8">
      {/* Payment Reminder Banner for Expired Subscriptions */}
      {!isAdmin && <PaymentReminderBanner onOpenBilling={() => setActiveTab('my_invoices')} />}

      {/* Dashboard Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-slate-100 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <input
              ref={profilePhotoInputRef}
              type="file"
              accept="image/png, image/jpeg, image/jpg, image/webp"
              className="hidden"
              onChange={handleProfilePhotoChange}
            />
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'}
              alt={user?.name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 cursor-pointer shadow-lg group-hover:opacity-90 transition-opacity"
              onClick={() => profilePhotoInputRef.current?.click()}
            />
            <button
              type="button"
              onClick={() => profilePhotoInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-90"
              title="Changer ma photo depuis la galerie"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">{user?.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold capitalize flex items-center gap-1">
                <BadgeCheck className="w-3.5 h-3.5" /> Compte {user?.role} PRO
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-slate-400">{user?.email} • Formule Pro Agent Active</p>
              {photoUploadSuccess && (
                <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 animate-fadeIn">
                  <CheckCircle2 className="w-3 h-3" /> Photo mise à jour !
                </span>
              )}
            </div>
            
            {/* 2FA & RCCM Status Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${
                user?.twoFactorEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}>
                <KeyRound className="w-3 h-3" />
                {user?.twoFactorEnabled ? '2FA Active (Google Auth / SMS)' : '2FA Inactive'}
              </span>

              {user?.rccmOrNif && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  RCCM: {user.rccmOrNif}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('verification')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 shadow-sm relative ${
                  activeTab === 'verification'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Badges Agents</span>
                {pendingVerificationsCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black animate-pulse">
                    {pendingVerificationsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('admin_settings')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 shadow-sm ${
                  activeTab === 'admin_settings'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                }`}
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Identifiants & PIN Admin</span>
              </button>

              <button
                onClick={() => setActiveTab('billing')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 shadow-sm ${
                  activeTab === 'billing'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span>Facturation Globale Admin</span>
              </button>

              <button
                onClick={() => setActiveTab('database')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 shadow-sm ${
                  activeTab === 'database'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Console DB Admin</span>
              </button>

              <button
                onClick={() => setIsTagManagerModalOpen(true)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 shadow-sm ${
                  activeTab === 'gtm_manager'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-emerald-500/30'
                }`}
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Balises & Pixels (GTM)</span>
              </button>
            </>
          )}

          {!isAdmin && (
            <>
              <button
                onClick={() => {
                  setPinInput('');
                  setPinError(null);
                  setShowPinModal(true);
                }}
                className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 shadow-md flex items-center gap-2 transition-all"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Passer Administrateur (PIN)</span>
              </button>

              <button
                onClick={() => setActiveTab('plans')}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 shadow-sm ${
                  activeTab === 'plans'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Mon Abonnement Pro</span>
              </button>
            </>
          )}

          {onReturnHome && (
            <button
              onClick={onReturnHome}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 shadow-sm"
              title="Retourner à la page d'accueil"
            >
              <Home className="w-4 h-4 text-emerald-400" />
              <span>Retour Accueil</span>
            </button>
          )}

          <button
            onClick={() => setIsSecurityModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sécurité & 2FA</span>
          </button>

          <button
            onClick={() => {
              setEditingProperty(null);
              setIsSubmitPropertyOpen(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:scale-105 transition-transform shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Publier un Bien
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto text-xs font-semibold">
        {[
          ...(isAdmin || activeTab === 'verification'
            ? [{ id: 'verification', label: `🛡️ Audit Badges Agents (${pendingVerificationsCount > 0 ? `${pendingVerificationsCount} en attente` : 'Conforme'})`, icon: ShieldCheck }]
            : []),
          ...(isAdmin || activeTab === 'admin_settings'
            ? [{ id: 'admin_settings', label: 'Sécurité & Identifiants Admin', icon: KeyRound }]
            : []),
          ...(isAdmin || activeTab === 'billing'
            ? [{ id: 'billing', label: 'Facturation & Encaissements Admin', icon: Receipt }]
            : []),
          ...(isAdmin || activeTab === 'database'
            ? [{ id: 'database', label: 'Base de Données Sécurisée (Admin)', icon: Database }]
            : []),
          ...(isAdmin
            ? [{ id: 'gtm_manager', label: '🏷️ Google Tag Manager & Pixels (Admin)', icon: Layers }]
            : []),
          {
            id: 'analytics',
            label: isAdmin ? '📊 Statistiques Globales & Performance' : '📊 Statistiques de mes Annonces',
            icon: BarChart3
          },
          { id: 'listings', label: `Mes Annonces (${myProperties.length})`, icon: Building2 },
          { id: 'my_invoices', label: `Mes Factures & Réglements (${myInvoices.length})`, icon: Receipt },
          { id: 'leads', label: `CRM Leads & Demandes (${leads.length})`, icon: Users },
          { id: 'saved', label: `Alertes & Recherches (${savedSearches.length})`, icon: Bell },
          { id: 'plans', label: 'Formules & Abonnements', icon: CreditCard },
          { id: 'csv', label: 'Import / Export CSV (WP All Import)', icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 rounded-t-2xl border-b-2 whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB: Agent Identity Verification Desk */}
      {activeTab === 'verification' && (
        <AdminVerificationManager />
      )}

      {/* TAB: Google Analytics & Listings Views */}
      {activeTab === 'analytics' && (
        <PropertyAnalyticsView />
      )}

      {/* TAB 0: Admin Credentials & Security Settings */}
      {activeTab === 'admin_settings' && (
        <AdminSettingsManager />
      )}

      {/* TAB 1: Admin Billing & Invoicing Manager */}
      {activeTab === 'billing' && (
        <AdminBillingManager />
      )}

      {/* TAB 2: Firestore Admin Database Manager */}
      {activeTab === 'database' && (
        <AdminDatabaseManager />
      )}

      {/* TAB 1: My Listings */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {myProperties.map((prop) => (
              <div
                key={prop.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <img
                    src={prop.images[0]}
                    alt={prop.title}
                    className="w-20 h-16 rounded-xl object-cover shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-white text-sm line-clamp-1">{prop.title}</div>
                      {prop.status === 'sold' && (
                        <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[10px] uppercase tracking-wider shrink-0">
                          Vendu
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-emerald-400 font-semibold">{prop.price} {prop.currency}</div>
                    <div className="text-[11px] text-slate-400">📍 {prop.city} • Views: {prop.viewsCount}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {/* Bouton Vendu Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const newStatus = prop.status === 'sold' ? 'for-sale' : 'sold';
                      const actionLabel = prop.status === 'sold'
                        ? `remettre en vente le bien "${prop.title}"`
                        : `déclarer le bien "${prop.title}" comme VENDU / TRANSACTION CONCLUE`;

                      requestConfirm({
                        title: prop.status === 'sold' ? "Remettre en vente" : "Confirmation de Vente",
                        message: `Voulez-vous vraiment ${actionLabel} ?`,
                        confirmText: prop.status === 'sold' ? "Oui, remettre en vente" : "Oui, déclarer Vendu",
                        onConfirm: () => {
                          updateProperty({ ...prop, status: newStatus });
                        }
                      });
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                      prop.status === 'sold'
                        ? 'bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border-red-500/40'
                        : 'bg-slate-800 hover:bg-red-600/20 text-slate-300 hover:text-red-400 border-slate-700 hover:border-red-500/40'
                    }`}
                    title={prop.status === 'sold' ? 'Cliquer pour remettre en vente' : 'Cliquer pour marquer comme vendu'}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${prop.status === 'sold' ? 'text-red-400' : 'text-slate-400'}`} />
                    <span>{prop.status === 'sold' ? 'Vendu ✓' : 'Marquer Vendu'}</span>
                  </button>
                  <button
                    onClick={() => setActivePropertyModalId(prop.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Voir Fiche"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingProperty(prop);
                      setIsSubmitPropertyOpen(true);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      requestConfirm({
                        title: "Suppression de l'annonce",
                        message: `Voulez-vous vraiment supprimer l'annonce "${prop.title}" ?`,
                        onConfirm: () => deleteProperty(prop.id)
                      });
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/50 text-rose-400"
                    title="Supprimer l'annonce"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: My Invoices */}
      {activeTab === 'my_invoices' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-400" /> Mes Factures & Abonnements ({myInvoices.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Consultez l'historique de vos abonnements et réglez vos factures par Orange Money RDC (+243 84 529 4616).
                </p>
              </div>
            </div>

            {myInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold">Aucune facture émise pour le moment.</p>
                <p className="text-[11px] text-slate-500">
                  Lorsqu'une facture d'abonnement est générée par l'administration, elle apparaîtra ici.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                      <th className="p-3">N° Facture</th>
                      <th className="p-3">Désignation / Pack</th>
                      <th className="p-3">Montant</th>
                      <th className="p-3">Échéance</th>
                      <th className="p-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {myInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-emerald-400">{inv.invoiceNumber}</td>
                        <td className="p-3 text-white">
                          <div className="font-semibold">{inv.items[0]?.description || 'Abonnement Kinshasa Immobilier'}</div>
                          <div className="text-[10px] text-slate-400">{inv.targetName} • {inv.targetEmail}</div>
                        </td>
                        <td className="p-3 font-black text-white">
                          ${inv.totalAmount} <span className="text-[10px] text-slate-400 font-normal">{inv.currency}</span>
                        </td>
                        <td className="p-3 text-slate-300 font-medium">{inv.dueDate}</td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              inv.status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : inv.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {inv.status === 'paid' ? 'Payé ✓' : inv.status === 'pending' ? 'En Attente' : 'En Retard'}
                          </span>
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

      {/* TAB 2: Leads & Requests CRM */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 bg-slate-950 border-b border-slate-800 font-bold text-sm text-white">
              Inbox Demandes de Visites & Prospects (Leads CRM)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                    <th className="p-3">Prospect</th>
                    <th className="p-3">Propriété Visée</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Message / Date Visite</th>
                    <th className="p-3">Statut CRM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-white">
                        {lead.userName}
                        <span className="block text-[10px] text-slate-400 font-normal">{lead.userEmail} | {lead.userPhone}</span>
                      </td>
                      <td className="p-3 text-slate-300 max-w-[180px] truncate">{lead.propertyTitle}</td>
                      <td className="p-3 uppercase text-[10px] font-bold text-emerald-400">{lead.requestType}</td>
                      <td className="p-3 text-slate-300">
                        {lead.message}
                        {lead.tourDate && <div className="text-amber-400 font-semibold">🗓️ {lead.tourDate} à {lead.tourTime}</div>}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value as any)}
                            className="bg-slate-950 border border-slate-800 text-emerald-400 font-bold rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="new">Nouveau</option>
                            <option value="contacted">Contacté</option>
                            <option value="viewing">Visite Maintien</option>
                            <option value="closed">Conclu</option>
                          </select>

                          <button
                            onClick={() => {
                              requestConfirm({
                                title: "Suppression de la demande",
                                message: "Voulez-vous vraiment supprimer cette demande client ?",
                                onConfirm: () => deleteLead(lead.id)
                              });
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                            title="Supprimer la demande"
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
        </div>
      )}

      {/* TAB 3: Saved Searches */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedSearches.map((search) => (
              <div key={search.id} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-white">
                  <span>{search.title}</span>
                  <button onClick={() => deleteSavedSearch(search.id)} className="text-rose-400 hover:text-rose-300">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Filtres: Ville ({search.filters.city || 'Toutes'}), Type ({search.filters.type || 'Tous'})
                </div>
                <div className="text-emerald-400 font-medium text-[10px] flex items-center gap-1">
                  <Bell className="w-3 h-3" /> Notifications Email: {search.notifyFrequency.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Subscription Plans (Admin editor or Agent chooser) */}
      {activeTab === 'plans' && (
        isAdmin ? (
          <AdminPlansPricingManager />
        ) : (
          <div className="space-y-6">
            {selectedPlanSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-center font-bold text-xs animate-fadeIn">
                ✓ Demande d'activation de l'abonnement **{selectedPlanSuccess}** prise en compte avec succès !
              </div>
            )}

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                  Tarification Kinshasa
                </span>
                <h3 className="text-lg font-black text-white mt-1">Formules d'Abonnement Courtiers & Agences</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Publiez vos biens immobiliers et terrains fonciers avec une visibilité maximale en RDC.
                </p>
              </div>
              <div className="px-3.5 py-2 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Affichage : <strong className="text-emerald-400 font-bold">Franc Congolais (CDF / FC)</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan) => {
                const cdfPrice = plan.priceMonthlyCDF ?? Math.round(plan.priceMonthly * cdfExchangeRate);

                return (
                  <div
                    key={plan.id}
                    className={`p-6 rounded-3xl border text-xs flex flex-col justify-between space-y-6 relative transition-all ${
                      plan.recommended
                        ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-emerald-500 shadow-2xl shadow-emerald-500/10'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    {plan.recommended && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase shadow-md">
                        Formule Recommandée
                      </span>
                    )}

                    <div className="space-y-4">
                      <h3 className="font-bold text-white text-base">{plan.name}</h3>

                      {/* Dynamic Price Display */}
                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="text-2xl font-black text-emerald-400 flex items-baseline gap-1">
                          {cdfPrice === 0 ? (
                            <span>Gratuit (0 FC)</span>
                          ) : (
                            <>
                              <span>{cdfPrice.toLocaleString('fr-FR')} FC</span>
                              <span className="text-xs font-normal text-slate-400">/mois</span>
                            </>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                          <span>Équivalent :</span>
                          <span className="text-white font-bold">
                            {plan.priceMonthly === 0 ? '0 $' : `${plan.priceMonthly} $ USD`}
                          </span>
                        </div>
                      </div>

                      {/* Quotas */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] py-1 border-y border-slate-800/80">
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[9px]">Annonces</span>
                          <span className="font-bold text-white">{plan.maxListings} max</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[9px]">En Vedette</span>
                          <span className="font-bold text-amber-400">{plan.featuredListings}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block uppercase font-bold text-[9px]">Agents</span>
                          <span className="font-bold text-emerald-400">{plan.agentAccounts}</span>
                        </div>
                      </div>

                      <ul className="space-y-2 text-slate-300">
                        {plan.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <button
                      onClick={() => handleSelectPlan(plan.name)}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <span>Souscrire à cette Formule</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}

      {/* TAB: GTM & Balises Marketing (Admin Only) */}
      {activeTab === 'gtm_manager' && (
        isAdmin ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 text-slate-100 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Layers className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Google Tag Manager & Balises Publicitaires</h3>
                  <p className="text-xs text-slate-400">
                    Gérez vos identifiants GTM, Google Analytics 4, Meta Pixel (FB/Insta), TikTok Pixel et conversions Google Ads.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTagManagerModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <Sliders className="w-4 h-4 text-slate-950" />
                <span>Ouvrir la Console des Balises</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Couche de Données GTM</span>
                <h4 className="text-sm font-bold text-white">Événements Prêts à l'Emploi</h4>
                <p className="text-xs text-slate-400">
                  Les événements immobiliers (<code>view_item</code>, <code>contact_agent</code>, <code>generate_lead</code>, <code>agency_registration</code>) sont automatiquement propulsés dans <code>dataLayer</code>.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Réseaux Sociaux</span>
                <h4 className="text-sm font-bold text-white">Meta & TikTok Pixels</h4>
                <p className="text-xs text-slate-400">
                  Retargetez les acheteurs et locataires potentiels à Kinshasa grâce aux événements de conversion standardisés.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Google Ads RDC</span>
                <h4 className="text-sm font-bold text-white">Suivi des Conversions</h4>
                <p className="text-xs text-slate-400">
                  Mesurez le ROI de vos campagnes Google Ads lors des prises de contact WhatsApp et demandes de visites.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 max-w-xl mx-auto my-6 shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-white">Page Balises & Pixels Réservée à l'Administrateur</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              La gestion des balises Google Tag Manager, pixels publicitaires et conteneurs de tracking est strictement restreinte aux administrateurs du système Kin Immobilier.
            </p>
            <button
              onClick={() => setActiveTab('analytics')}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition-all"
            >
              Retour au tableau de bord
            </button>
          </div>
        )
      )}

      {/* TAB 5: CSV Import / Export */}
      {activeTab === 'csv' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 text-xs text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-bold text-white text-base">Export / Import CSV (WP All Import Compatible)</h3>
              <p className="text-slate-400">Exportez en 1 clic vos propriétés ou collez du contenu CSV brut pour importation en masse.</p>
            </div>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-md"
            >
              <Download className="w-4 h-4" /> Exporter CSV
            </button>
          </div>

          <form onSubmit={handleCsvUpload} className="space-y-3">
            <label className="block font-semibold text-slate-300">Copier / Coller du texte CSV brut</label>
            <textarea
              rows={5}
              value={csvTextInput}
              onChange={(e) => setCsvTextInput(e.target.value)}
              placeholder="title,price,currency,type,status,city&#10;Villa Luxe,1500000,EUR,villa,for-sale,Nice"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl flex items-center gap-2"
            >
              <Upload className="w-4 h-4 text-emerald-400" /> Importer le CSV
            </button>
          </form>
        </div>
      )}

      {/* Bottom Navigation / Return Home */}
      {onReturnHome && (
        <div className="pt-4 border-t border-slate-800 flex justify-center">
          <button
            onClick={onReturnHome}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            <span>← Retourner à l'Accueil du Site</span>
          </button>
        </div>
      )}

      {/* Tag Manager & Pixels Modal (Strictly Admin) */}
      {isAdmin && (
        <TagManagerSettingsModal
          isOpen={isTagManagerModalOpen}
          onClose={() => setIsTagManagerModalOpen(false)}
        />
      )}
    </div>
  );
};
