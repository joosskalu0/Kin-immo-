import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ProSectionTab, buildProPath, goBackOrFallback } from '../../utils/navigation';
import { getListingLifecycleStatus } from '../../utils/propertyStatusHelpers';
import { AgentDashboardView, AgentSectionId } from './AgentDashboardView';
import { AgencyDashboardView, AgencySectionId } from './AgencyDashboardView';
import { PaymentReminderBanner } from './PaymentReminderBanner';
import { EmptyState, PageHeaderBar } from '../StateFeedback';
import { TrustBadge } from '../Trust/TrustBadge';
import {
  Home,
  Building2,
  Users,
  Calendar,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  CreditCard,
  User as UserIcon,
  MessageCircle,
  ArrowRight,
  ChevronRight,
  Film,
  Layers,
  DollarSign,
  Lock,
  ExternalLink,
  Briefcase,
  Bell,
} from 'lucide-react';

interface ProWorkspacePageProps {
  proSection: ProSectionTab;
  proSubSection?: string | null;
  onNavigatePath: (path: string) => void;
}

const SUB_SECTION_META: Record<
  string,
  {
    title: string;
    subtitle: string;
    agentSection?: AgentSectionId;
    agencySection?: AgencySectionId;
  }
> = {
  profil: {
    title: 'Profil & WhatsApp Pro',
    subtitle: 'Vos coordonnées affichées sur vos annonces',
    agentSection: 'profile_whatsapp',
    agencySection: 'profile',
  },
  confiance: {
    title: 'Kinimmo Trust',
    subtitle: 'Badge vérifié, identité et mandats',
    agentSection: 'kinimmo_trust',
    agencySection: 'trust_verification',
  },
  boosts: {
    title: 'Boosts & Vitrine',
    subtitle: 'Mettez vos biens en avant à Kinshasa',
    agentSection: 'boosts',
  },
  stats: {
    title: 'Statistiques',
    subtitle: 'Vues, clics WhatsApp et performances',
    agentSection: 'analytics',
    agencySection: 'analytics',
  },
  abonnement: {
    title: 'Abonnement & Factures',
    subtitle: 'Votre plan actif, quotas et paiements',
    agentSection: 'billing_subscription',
    agencySection: 'subscriptions',
  },
  assistance: {
    title: 'Assistance & Paramètres',
    subtitle: 'Support Kinimmo et sécurité',
    agentSection: 'notifications_settings',
  },
  equipe: {
    title: 'Collaborateurs',
    subtitle: 'Gérez les agents de votre agence',
    agencySection: 'collaborators',
  },
  roles: {
    title: 'Rôles & Permissions',
    subtitle: "Droits d'accès de votre équipe",
    agencySection: 'roles_permissions',
  },
  transactions: {
    title: 'Transactions & Commissions',
    subtitle: 'Suivi des ventes et baux conclus',
    agencySection: 'transactions',
  },
};

export const ProWorkspacePage: React.FC<ProWorkspacePageProps> = ({
  proSection,
  proSubSection,
  onNavigatePath,
}) => {
  const {
    user,
    properties,
    leads,
    agencyCollaborators,
    setEditingProperty,
  } = useApp();

  const [agencyListingsMode, setAgencyListingsMode] = useState<'my' | 'assign'>('my');
  const [visitsTabMode, setVisitsTabMode] = useState<'calendar' | 'media' | 'transactions'>('calendar');

  // Gardes d'accès stricts (8.1 principe 5 : écran vide/garde clair avec prochaine action)
  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-4">
        <PageHeaderBar title="Espace Pro" fallbackPath="/" />
        <EmptyState
          icon={Briefcase}
          title="Connectez-vous à votre Espace Pro"
          description="Retrouvez vos annonces, prospects WhatsApp, visites programmées et statistiques en un seul endroit."
          actionLabel="Se connecter"
          onAction={() => onNavigatePath('/connexion?next=/pro')}
          secondaryLabel="Retour à l'accueil"
          onSecondaryAction={() => onNavigatePath('/')}
        />
      </div>
    );
  }

  if (user.role === 'admin') {
    return (
      <div className="max-w-xl mx-auto py-4">
        <PageHeaderBar title="Espace Pro" fallbackPath="/" />
        <EmptyState
          icon={Lock}
          title="Compte Administrateur détecté"
          description="Votre panneau de supervision complet et de modération est accessible dans l'espace d'administration."
          actionLabel="Ouvrir l'administration"
          onAction={() => onNavigatePath('/admin')}
          secondaryLabel="Voir le site public"
          onSecondaryAction={() => onNavigatePath('/')}
        />
      </div>
    );
  }

  if (user.role !== 'agent' && user.role !== 'agency') {
    return (
      <div className="max-w-xl mx-auto py-4">
        <PageHeaderBar title="Espace Pro" fallbackPath="/compte" />
        <EmptyState
          icon={Building2}
          title="Espace réservé aux agents et agences"
          description="Vous utilisez actuellement un compte particulier ou propriétaire. Vous pouvez publier une annonce directement ou gérer votre compte."
          actionLabel="Publier une annonce"
          onAction={() => {
            setEditingProperty(null);
            onNavigatePath('/publier');
          }}
          secondaryLabel="Aller à Mon compte"
          onSecondaryAction={() => onNavigatePath('/compte')}
        />
      </div>
    );
  }

  const isAgency = user.role === 'agency';

  // Filtrage des annonces pro
  const myProperties = properties.filter((p) => {
    const uid = user.id;
    const uemail = user.email?.toLowerCase();
    const uagentId = user.agentId;
    if (isAgency) {
      const agencyId = user.agencyId || user.id;
      const agencyName = (user.agencyName || '').toLowerCase();
      if (p.agencyId && (p.agencyId === agencyId || p.agencyId === uid)) return true;
      if (agencyName && p.agencyName && p.agencyName.toLowerCase() === agencyName) return true;
      if (agencyCollaborators.some((c) => c.userId === p.agentId || c.id === p.agentId)) return true;
    }
    return (
      p.agentId === uid ||
      (uagentId && p.agentId === uagentId) ||
      p.userId === uid ||
      p.assignedAgentId === uid ||
      (uagentId && p.assignedAgentId === uagentId) ||
      (uemail && p.contactEmail?.toLowerCase() === uemail)
    );
  });

  const publishedCount = myProperties.filter((p) => getListingLifecycleStatus(p) === 'PUBLISHED').length;
  const draftCount = myProperties.filter((p) => getListingLifecycleStatus(p) === 'DRAFT').length;
  const newLeads = leads.filter((l) => l.status === 'new');
  const scheduledVisits = leads.filter((l) => l.requestType === 'tour' || Boolean(l.tourDate));

  const mainNavItems: Array<{
    id: ProSectionTab;
    label: string;
    icon: any;
    path: string;
    badge?: number;
  }> = [
    { id: 'today', label: "Aujourd'hui", icon: Home, path: '/pro' },
    { id: 'listings', label: 'Annonces', icon: Building2, path: '/pro/annonces', badge: myProperties.length },
    { id: 'leads', label: 'Prospects', icon: Users, path: '/pro/prospects', badge: newLeads.length },
    { id: 'visits', label: 'Visites & Médias', icon: Calendar, path: '/pro/visites', badge: scheduledVisits.length },
    { id: 'more', label: 'Plus & Réglages', icon: MoreHorizontal, path: '/pro/plus' },
  ];

  const desktopSubLinks: Array<{
    sub: string;
    label: string;
    icon: any;
    show: boolean;
  }> = [
    { sub: 'confiance', label: 'Kinimmo Trust', icon: ShieldCheck, show: true },
    { sub: 'stats', label: 'Statistiques', icon: TrendingUp, show: true },
    { sub: 'boosts', label: 'Boosts & Vitrine', icon: Sparkles, show: true },
    { sub: 'abonnement', label: 'Abonnement & Factures', icon: CreditCard, show: true },
    { sub: 'profil', label: 'Profil & WhatsApp', icon: UserIcon, show: true },
    { sub: 'equipe', label: 'Collaborateurs', icon: Users, show: isAgency },
    { sub: 'roles', label: 'Rôles & Permissions', icon: Layers, show: isAgency },
    { sub: 'transactions', label: 'Transactions', icon: DollarSign, show: isAgency },
  ];

  const activeSubMeta = proSubSection ? SUB_SECTION_META[proSubSection] : undefined;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* MENU LATÉRAL PERSISTANT SUR ORDINATEUR (8.2) */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs sticky top-20 space-y-4">
        {/* Identité Pro */}
        <div className="pb-3 border-b border-slate-100 space-y-2">
          <div className="flex items-center gap-2.5">
            <img
              src={
                user.avatar ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
              }
              alt={user.name}
              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-900 truncate">
                {isAgency ? user.agencyName || user.name : user.name}
              </p>
              <span className="text-[11px] font-bold text-[#1D4ED8] block">
                {isAgency ? 'Espace Agence' : 'Espace Agent Pro'}
              </span>
            </div>
          </div>
          <TrustBadge
            status={user.trust_status || 'unverified'}
            level={user.trust_level}
            score={user.trust_score}
            targetType={isAgency ? 'agency' : 'agent'}
            targetTitle={user.name}
            showUnverified={true}
          />
        </div>

        {/* Action principale unique */}
        <button
          type="button"
          onClick={() => {
            setEditingProperty(null);
            onNavigatePath('/publier');
          }}
          className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Publier une annonce</span>
        </button>

        {/* 5 Sections principales */}
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = proSection === item.id && !proSubSection;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigatePath(item.path)}
                className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold tabular-nums ${
                      isActive ? 'bg-white/20 text-white' : 'bg-blue-50 text-[#1D4ED8]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Raccourcis directs outils Pro */}
        <div className="pt-3 border-t border-slate-100 space-y-1">
          <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Outils & Gestion
          </p>
          {desktopSubLinks
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = proSection === 'more' && proSubSection === item.sub;
              return (
                <button
                  key={item.sub}
                  type="button"
                  onClick={() => onNavigatePath(buildProPath('more', item.sub))}
                  className={`w-full min-h-[38px] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-[#1D4ED8] font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
        </div>

        {/* Retour site public */}
        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onNavigatePath('/')}
            className="w-full min-h-[38px] px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-[#1D4ED8] hover:bg-blue-50/50 flex items-center justify-between transition-colors cursor-pointer"
          >
            <span>Voir le site public</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* CONTENU PRINCIPAL ESPACE PRO */}
      <div className="flex-1 min-w-0 w-full space-y-4 sm:space-y-6">
        <PaymentReminderBanner
          onOpenBilling={() => onNavigatePath('/pro/plus/abonnement')}
        />

        {/* ======================================================= */}
        {/* 1. AUJOURD'HUI (/pro)                                   */}
        {/* ======================================================= */}
        {proSection === 'today' && (
          <div className="space-y-5">
            {/* Carte d'accueil Aujourd'hui + 1 action principale */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1D4ED8]">
                  {isAgency ? 'Tableau de bord Agence' : 'Tableau de bord Agent'}
                </span>
                <h1 className="font-display text-xl sm:text-2xl font-extrabold text-slate-900">
                  Bonjour, {user.name.split(' ')[0]}
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  Votre activité du jour à Kinshasa en un coup d'œil.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingProperty(null);
                  onNavigatePath('/publier');
                }}
                className="w-full sm:w-auto min-h-[46px] px-5 py-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Publier une annonce</span>
              </button>
            </div>

            {/* 4 KPIs Aujourd'hui */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => onNavigatePath('/pro/visites')}
                className="bg-white border border-slate-200 hover:border-[#1D4ED8] rounded-2xl p-4 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Visites prévues</span>
                  <Calendar className="w-4 h-4 text-[#1D4ED8]" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
                  {scheduledVisits.length}
                </div>
                <span className="text-[11px] text-[#1D4ED8] font-bold mt-1 inline-flex items-center gap-1">
                  Voir le planning <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigatePath('/pro/prospects')}
                className="bg-white border border-slate-200 hover:border-[#1D4ED8] rounded-2xl p-4 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Nouveaux prospects</span>
                  <Users className="w-4 h-4 text-[#1D4ED8]" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
                  {newLeads.length}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block tabular-nums">
                  {leads.length} contacts au total
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigatePath('/pro/annonces')}
                className="bg-white border border-slate-200 hover:border-[#1D4ED8] rounded-2xl p-4 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Annonces actives</span>
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
                  {publishedCount}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block tabular-nums">
                  sur {myProperties.length} biens
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigatePath('/pro/annonces')}
                className="bg-white border border-slate-200 hover:border-[#1D4ED8] rounded-2xl p-4 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>Brouillons</span>
                  <Layers className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 mt-2 tabular-nums">
                  {draftCount}
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Prêts à compléter
                </span>
              </button>
            </div>

            {/* Prospects prioritaires du jour */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Demandes récentes à rappeler
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigatePath('/pro/prospects')}
                  className="text-xs font-bold text-[#1D4ED8] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Tout voir</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {leads.length === 0 ? (
                <div className="py-6 text-center space-y-2 bg-slate-50 rounded-xl border border-slate-100 px-4">
                  <p className="text-xs sm:text-sm font-bold text-slate-800">
                    Aucune nouvelle demande pour le moment
                  </p>
                  <p className="text-xs text-slate-500">
                    Publiez un bien avec au moins 5 photos pour attirer les premiers appels WhatsApp.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {leads.slice(0, 3).map((lead) => (
                    <div
                      key={lead.id}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 truncate">
                            {lead.userName}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#1D4ED8] text-[10px] font-bold">
                            {lead.status === 'new' ? 'Nouveau' : 'Suivi'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 truncate">{lead.propertyTitle}</p>
                      </div>

                      {lead.userPhone && (
                        <a
                          href={`https://wa.me/${lead.userPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Bonjour ${lead.userName}, je vous contacte depuis Kinimmo pour « ${lead.propertyTitle} ».`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[38px] px-3.5 py-2 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Répondre sur WhatsApp</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Raccourcis rapides mobile vers outils */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 lg:hidden">
              {[
                { label: 'Kinimmo Trust', path: '/pro/plus/confiance', icon: ShieldCheck },
                { label: 'Vidéos & Photos', path: '/pro/visites', icon: Film },
                { label: 'Statistiques', path: '/pro/plus/stats', icon: TrendingUp },
                { label: 'Abonnement', path: '/pro/plus/abonnement', icon: CreditCard },
              ].map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <button
                    key={shortcut.path}
                    type="button"
                    onClick={() => onNavigatePath(shortcut.path)}
                    className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 text-left text-xs font-bold text-slate-800 hover:border-[#1D4ED8] cursor-pointer"
                  >
                    <Icon className="w-4 h-4 text-[#1D4ED8] shrink-0" />
                    <span className="truncate">{shortcut.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* 2. ANNONCES (/pro/annonces)                             */}
        {/* ======================================================= */}
        {proSection === 'listings' && (
          <div className="space-y-4">
            <PageHeaderBar
              title="Mes annonces"
              subtitle={`${myProperties.length} bien${myProperties.length > 1 ? 's' : ''}`}
              fallbackPath="/pro"
              onBack={() => onNavigatePath('/pro')}
              rightSlot={
                <button
                  type="button"
                  onClick={() => {
                    setEditingProperty(null);
                    onNavigatePath('/publier');
                  }}
                  className="h-9 px-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Publier</span>
                </button>
              }
            />

            {isAgency && (
              <div className="bg-white border border-slate-200 rounded-2xl p-1.5 inline-flex gap-1">
                <button
                  type="button"
                  onClick={() => setAgencyListingsMode('my')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    agencyListingsMode === 'my'
                      ? 'bg-[#1D4ED8] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Catalogue & Statuts
                </button>
                <button
                  type="button"
                  onClick={() => setAgencyListingsMode('assign')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    agencyListingsMode === 'assign'
                      ? 'bg-[#1D4ED8] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Attribution équipe
                </button>
              </div>
            )}

            <div className="rounded-3xl bg-slate-950 p-3 sm:p-5 border border-slate-800">
              {isAgency && agencyListingsMode === 'assign' ? (
                <AgencyDashboardView
                  forcedSection="assignments"
                  hideTopNav
                  onOpenSubmitProperty={() => {
                    setEditingProperty(null);
                    onNavigatePath('/publier');
                  }}
                  onOpenSecurityModal={() => onNavigatePath('/compte/securite')}
                />
              ) : (
                <AgentDashboardView
                  forcedSection="my_properties"
                  hideTopNav
                  onOpenSecurityModal={() => onNavigatePath('/compte/securite')}
                />
              )}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* 3. PROSPECTS (/pro/prospects)                           */}
        {/* ======================================================= */}
        {proSection === 'leads' && (
          <div className="space-y-4">
            <PageHeaderBar
              title="Prospects & Contacts"
              subtitle={`${leads.length} demande${leads.length > 1 ? 's' : ''}`}
              fallbackPath="/pro"
              onBack={() => onNavigatePath('/pro')}
            />
            <div className="rounded-3xl bg-slate-950 p-3 sm:p-5 border border-slate-800">
              <AgentDashboardView
                forcedSection="leads"
                hideTopNav
                onOpenSecurityModal={() => onNavigatePath('/compte/securite')}
              />
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* 4. VISITES & MÉDIAS (/pro/visites)                      */}
        {/* ======================================================= */}
        {proSection === 'visits' && (
          <div className="space-y-4">
            <PageHeaderBar
              title="Visites & Médias"
              subtitle="Calendrier des visites, photos et vidéos"
              fallbackPath="/pro"
              onBack={() => onNavigatePath('/pro')}
            />

            <div className="bg-white border border-slate-200 rounded-2xl p-1.5 flex flex-wrap gap-1 w-fit">
              <button
                type="button"
                onClick={() => setVisitsTabMode('calendar')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  visitsTabMode === 'calendar'
                    ? 'bg-[#1D4ED8] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Visites & Calendrier
              </button>
              <button
                type="button"
                onClick={() => setVisitsTabMode('media')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  visitsTabMode === 'media'
                    ? 'bg-[#1D4ED8] text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Vidéos & Photos
              </button>
              {isAgency && (
                <button
                  type="button"
                  onClick={() => setVisitsTabMode('transactions')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                    visitsTabMode === 'transactions'
                      ? 'bg-[#1D4ED8] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Transactions
                </button>
              )}
            </div>

            <div className="rounded-3xl bg-slate-950 p-3 sm:p-5 border border-slate-800">
              {isAgency && visitsTabMode === 'transactions' ? (
                <AgencyDashboardView
                  forcedSection="transactions"
                  hideTopNav
                  onOpenSecurityModal={() => onNavigatePath('/compte/securite')}
                />
              ) : (
                <AgentDashboardView
                  forcedSection={visitsTabMode === 'media' ? 'media_manager' : 'visits_calendar'}
                  hideTopNav
                  onOpenSecurityModal={() => onNavigatePath('/compte/securite')}
                />
              )}
            </div>
          </div>
        )}

        {/* ======================================================= */}
        {/* 5. PLUS & RÉGLAGES (/pro/plus et /pro/plus/:sub)        */}
        {/* ======================================================= */}
        {proSection === 'more' && (
          <div className="space-y-4">
            {proSubSection && activeSubMeta ? (
              <>
                <PageHeaderBar
                  title={activeSubMeta.title}
                  subtitle={activeSubMeta.subtitle}
                  fallbackPath="/pro/plus"
                  onBack={() => goBackOrFallback('/pro/plus', onNavigatePath)}
                  rightSlot={
                    proSubSection === 'boosts' ? (
                      <button
                        type="button"
                        onClick={() => onNavigatePath('/pro/boost')}
                        className="h-9 px-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Nouveau boost</span>
                      </button>
                    ) : undefined
                  }
                />

                <div className="rounded-3xl bg-slate-950 p-3 sm:p-5 border border-slate-800">
                  {isAgency && activeSubMeta.agencySection ? (
                    <AgencyDashboardView
                      forcedSection={activeSubMeta.agencySection}
                      hideTopNav
                      onOpenSubmitProperty={() => {
                        setEditingProperty(null);
                        onNavigatePath('/publier');
                      }}
                      onOpenSecurityModal={() => onNavigatePath('/compte/securite')}
                    />
                  ) : (
                    <AgentDashboardView
                      forcedSection={activeSubMeta.agentSection || 'profile_whatsapp'}
                      hideTopNav
                      onOpenSecurityModal={() => onNavigatePath('/compte/securite')}
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <PageHeaderBar
                  title="Plus & Réglages Pro"
                  subtitle={isAgency ? 'Gestion complète de votre agence' : 'Votre activité et paramètres'}
                  fallbackPath="/pro"
                  onBack={() => onNavigatePath('/pro')}
                />

                {/* Action rapide Publier */}
                <button
                  type="button"
                  onClick={() => {
                    setEditingProperty(null);
                    onNavigatePath('/publier');
                  }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Publier une nouvelle annonce</span>
                </button>

                {/* Liste claire des sous-pages Pro */}
                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                  {[
                    { sub: 'profil', label: 'Profil & WhatsApp Pro', desc: 'Nom, téléphone et présentation publique', icon: UserIcon, show: true },
                    { sub: 'confiance', label: 'Kinimmo Trust', desc: 'Vérifier votre identité et vos mandats', icon: ShieldCheck, show: true },
                    { sub: 'stats', label: 'Statistiques', desc: 'Vues, clics WhatsApp et classements', icon: TrendingUp, show: true },
                    { sub: 'boosts', label: 'Boosts & Vitrine', desc: 'Mettre vos annonces en tête de liste', icon: Sparkles, show: true },
                    { sub: 'abonnement', label: 'Abonnement & Factures', desc: 'Plan actif, quotas et facturation', icon: CreditCard, show: true },
                    { sub: 'assistance', label: 'Assistance & Paramètres', desc: 'Contacter le support Kinimmo', icon: Bell, show: true },
                    { sub: 'equipe', label: 'Collaborateurs', desc: 'Inviter et gérer vos agents', icon: Users, show: isAgency },
                    { sub: 'roles', label: 'Rôles & Permissions', desc: "Droits d'accès de l'agence", icon: Layers, show: isAgency },
                    { sub: 'transactions', label: 'Transactions & Commissions', desc: 'Ventes et baux clôturés', icon: DollarSign, show: isAgency },
                  ]
                    .filter((item) => item.show)
                    .map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.sub}
                          type="button"
                          onClick={() => onNavigatePath(buildProPath('more', item.sub))}
                          className="w-full min-h-[58px] px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0">
                              <Icon className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-bold text-slate-900 block truncate">
                                {item.label}
                              </span>
                              <span className="text-xs text-slate-500 block truncate">
                                {item.desc}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                      );
                    })}
                </div>

                {/* Sécurité & Retour Public */}
                <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onNavigatePath('/compte/securite')}
                    className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <Lock className="w-4.5 h-4.5 text-[#1D4ED8]" />
                      <span className="text-sm font-bold text-slate-800">
                        Sécurité & mot de passe
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigatePath('/compte')}
                    className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <UserIcon className="w-4.5 h-4.5 text-[#1D4ED8]" />
                      <span className="text-sm font-bold text-slate-800">
                        Mon compte personnel
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigatePath('/')}
                    className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <ExternalLink className="w-4.5 h-4.5 text-[#1D4ED8]" />
                      <span className="text-sm font-bold text-[#1D4ED8]">
                        Retour au site public
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
