import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  Home,
  Search,
  Heart,
  Bell,
  User as UserIcon,
  Plus,
  Calendar,
  Briefcase,
  Building2,
  Users,
  MoreHorizontal,
  Sparkles,
  Film,
  LogIn,
} from 'lucide-react';
import { KinimmoLogo } from './KinimmoLogo';
import { PWAInstallButton } from './PWA/PWAInstallPrompt';
import { AppPageTab, ProSectionTab, buildProPath, buildSearchPath } from '../utils/navigation';

interface HeaderProps {
  currentTab: AppPageTab;
  proSection?: ProSectionTab;
  isProMode?: boolean;
  onNavigatePath: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  proSection = 'today',
  isProMode = false,
  onNavigatePath,
}) => {
  const {
    user,
    wishlist,
    inAppBillingNotifications,
    savedSearches,
    leads,
    filters,
    setFilters,
  } = useApp();

  const [desktopQuery, setDesktopQuery] = useState(filters.searchQuery || '');

  useEffect(() => {
    setDesktopQuery(filters.searchQuery || '');
  }, [filters.searchQuery]);

  const unreadAlertsCount =
    inAppBillingNotifications.filter((n) => !n.isRead).length +
    (savedSearches?.length > 0 ? 0 : 0);

  const isProUser = user && (user.role === 'agent' || user.role === 'agency');
  const showProBottomBar = Boolean(isProUser && isProMode);

  const pendingLeadsCount = isProUser
    ? leads.filter((l) => l.status === 'new').length
    : 0;

  const handleDesktopSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, searchQuery: desktopQuery }));
    onNavigatePath(buildSearchPath({ q: desktopQuery, commune: filters.commune, type: filters.type, status: filters.status }));
  };

  return (
    <>
      {/* TOP HEADER : Compact sur mobile (Logo, Recherche, Cloche), complet avec recherche intégrée sur ordinateur */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-900 h-14 lg:h-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-full flex items-center justify-between gap-2.5 lg:gap-4">
          {/* 1. Logo Kinimmo */}
          <KinimmoLogo
            compact
            showTagline={false}
            onClick={() => onNavigatePath('/')}
            className="shrink-0"
          />

          {/* Mobile Compact Header Actions (Logo + Recherche + Télécharger + Cloche) */}
          <div className="flex lg:hidden items-center gap-1.5 flex-1 justify-end min-w-0">
            <button
              type="button"
              onClick={() => onNavigatePath('/rechercher')}
              aria-label="Rechercher un bien"
              className="flex-1 min-w-0 max-w-[190px] h-10 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4 text-[#1D4ED8] shrink-0" />
              <span className="truncate">Rechercher...</span>
            </button>

            <PWAInstallButton compact />

            <button
              type="button"
              onClick={() => onNavigatePath('/alertes')}
              aria-label="Alertes et notifications"
              className="relative w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5 text-[#1D4ED8]" />
              {unreadAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadAlertsCount}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Integrated Search + Navigation */}
          <div className="hidden lg:flex items-center gap-4 flex-1 min-w-0">
            <form
              onSubmit={handleDesktopSearchSubmit}
              className="flex items-center flex-1 max-w-md h-10 bg-slate-100 border border-slate-200 focus-within:border-[#1D4ED8] focus-within:bg-white rounded-xl overflow-hidden transition-colors"
            >
              <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={desktopQuery}
                onChange={(e) => setDesktopQuery(e.target.value)}
                placeholder="Commune, quartier, type de bien..."
                className="flex-1 bg-transparent px-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none min-w-0"
              />
              <button
                type="submit"
                className="h-full px-3.5 bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
              >
                Rechercher
              </button>
            </form>

            <nav className="flex items-center gap-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, status: 'for-sale' }));
                  onNavigatePath('/rechercher?status=for-sale');
                }}
                className={`px-3 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  currentTab === 'search' && filters.status === 'for-sale'
                    ? 'bg-blue-50 text-[#1D4ED8]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                À vendre
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, status: 'for-rent' }));
                  onNavigatePath('/rechercher?status=for-rent');
                }}
                className={`px-3 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  currentTab === 'search' && filters.status === 'for-rent'
                    ? 'bg-blue-50 text-[#1D4ED8]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                À louer
              </button>
              <button
                type="button"
                onClick={() => onNavigatePath('/agences')}
                className={`px-3 py-2 rounded-xl transition-colors cursor-pointer whitespace-nowrap ${
                  currentTab === 'agencies' || currentTab === 'agents'
                    ? 'bg-blue-50 text-[#1D4ED8]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                Agences
              </button>
              <button
                type="button"
                onClick={() => onNavigatePath('/visites')}
                className={`px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  currentTab === 'visites'
                    ? 'bg-blue-50 text-[#1D4ED8]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Film className="w-3.5 h-3.5 text-[#1D4ED8]" />
                <span>Visites</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigatePath('/conciergerie')}
                className={`px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  currentTab === 'conciergerie'
                    ? 'bg-blue-50 text-[#1D4ED8]'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Conciergerie</span>
              </button>
            </nav>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => onNavigatePath('/favoris')}
              className={`relative h-10 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                currentTab === 'wishlist'
                  ? 'bg-blue-50 border-blue-200 text-[#1D4ED8]'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Mes favoris"
            >
              <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
              <span>Favoris</span>
              {wishlist.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#1D4ED8] text-white text-[10px] font-bold tabular-nums">
                  {wishlist.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigatePath('/alertes')}
              aria-label="Mes alertes et notifications"
              className={`relative w-10 h-10 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                currentTab === 'alerts'
                  ? 'bg-blue-50 border-blue-200 text-[#1D4ED8]'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Mes alertes"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {isProUser && (
              <button
                type="button"
                onClick={() => onNavigatePath('/pro')}
                className={`h-10 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                  currentTab === 'pro'
                    ? 'bg-[#0B3EA8] text-white border-[#0B3EA8]'
                    : 'bg-blue-50 text-[#1D4ED8] border-blue-200 hover:bg-blue-100'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Espace pro</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigatePath(user ? '/publier' : '/connexion')}
              className="h-10 px-4 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Publier</span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => onNavigatePath('/compte')}
                className={`h-10 pl-1.5 pr-3 rounded-xl border flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
                  currentTab === 'account' || currentTab === 'security'
                    ? 'bg-blue-50 border-blue-200 text-[#1D4ED8]'
                    : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                }`}
              >
                <img
                  src={
                    user.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                  }
                  alt={user.name}
                  className="w-7 h-7 rounded-lg object-cover"
                />
                <span className="max-w-[110px] truncate">{user.name.split(' ')[0]}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigatePath('/connexion')}
                className="h-10 px-3.5 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Connexion</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR — Jamais plus de 5 éléments */}
      {showProBottomBar ? (
        <nav
          aria-label="Navigation Espace Pro"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 h-[60px] pb-safe flex items-center justify-around px-1 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] select-none"
        >
          {[
            { id: 'today' as ProSectionTab, label: "Aujourd'hui", icon: Home, path: '/pro' },
            { id: 'listings' as ProSectionTab, label: 'Annonces', icon: Building2, path: '/pro/annonces' },
            {
              id: 'leads' as ProSectionTab,
              label: 'Prospects',
              icon: Users,
              path: '/pro/prospects',
              badge: pendingLeadsCount,
            },
            { id: 'visits' as ProSectionTab, label: 'Visites', icon: Calendar, path: '/pro/visites' },
            { id: 'more' as ProSectionTab, label: 'Plus', icon: MoreHorizontal, path: '/pro/plus' },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === 'pro' && proSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigatePath(item.path)}
                className={`relative flex-1 min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  isActive ? 'text-[#1D4ED8]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="truncate max-w-full px-1">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0.5 w-8 h-0.5 rounded-full bg-[#1D4ED8]" />
                )}
              </button>
            );
          })}
        </nav>
      ) : (
        <nav
          aria-label="Navigation principale"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 h-[60px] pb-safe flex items-center justify-around px-1 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] select-none"
        >
          {[
            { id: 'home', label: 'Accueil', icon: Home, path: '/' },
            { id: 'search', label: 'Rechercher', icon: Search, path: '/rechercher' },
            {
              id: 'wishlist',
              label: 'Favoris',
              icon: Heart,
              path: '/favoris',
              badge: wishlist.length,
            },
            {
              id: 'alerts',
              label: 'Alertes',
              icon: Bell,
              path: '/alertes',
              badge: unreadAlertsCount,
            },
            {
              id: 'account',
              label: 'Compte',
              icon: UserIcon,
              path: user ? '/compte' : '/connexion',
            },
          ].map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.id === 'home' && currentTab === 'home') ||
              (item.id === 'search' && (currentTab === 'search' || currentTab === 'map')) ||
              (item.id === 'wishlist' && (currentTab === 'wishlist' || currentTab === 'compare')) ||
              (item.id === 'alerts' && currentTab === 'alerts') ||
              (item.id === 'account' &&
                (currentTab === 'account' || currentTab === 'auth' || currentTab === 'security'));
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigatePath(item.path)}
                className={`relative flex-1 min-w-[56px] min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-colors cursor-pointer ${
                  isActive ? 'text-[#1D4ED8]' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive
                        ? item.id === 'home'
                          ? 'fill-[#1D4ED8]/15 stroke-[2.5]'
                          : 'stroke-[2.5]'
                        : 'stroke-[2]'
                    }`}
                  />
                  {item.badge && item.badge > 0 ? (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center tabular-nums">
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span className="truncate max-w-full px-1">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0.5 w-8 h-0.5 rounded-full bg-[#1D4ED8]" />
                )}
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
};
