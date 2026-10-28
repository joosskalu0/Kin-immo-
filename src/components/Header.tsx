import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { languages } from '../utils/i18n';
import { currencies } from '../utils/currency';
import {
  Home,
  MapPin,
  Grid,
  Users,
  Building2,
  Heart,
  Scale,
  PlusCircle,
  User as UserIcon,
  Globe,
  Coins,
  SlidersHorizontal,
  LogOut,
  Sparkles,
  ShieldCheck,
  BadgeCheck,
  Menu,
  X,
  UserPlus,
  Briefcase,
  Phone,
  Film,
} from 'lucide-react';
import { CurrencyCode, LanguageCode } from '../types';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAssistant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab }) => {
  const {
    language,
    setLanguage,
    currency,
    setCurrency,
    user,
    setUser,
    wishlist,
    compareList,
    setIsFieldsBuilderOpen,
    setIsSubmitPropertyOpen,
    setIsAuthModalOpen,
    setIsSecurityModalOpen,
    setIsCompareOpen,
    setActivePropertyModalId,
    setIsInviteModalOpen,
    logOut,
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Règle métier : la publication d'un bien est réservée exclusivement aux utilisateurs connectés
  const handleOpenPublish = () => {
    if (!user) {
      setIsAuthModalOpen(true);
    } else {
      setIsSubmitPropertyOpen(true);
    }
  };

  // Assurer la suppression des anciennes classes de zoom pour toujours ouvrir en taille standard A
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('font-scale-standard', 'font-scale-large', 'font-scale-xlarge');
      try {
        localStorage.removeItem('kin_font_scale');
      } catch {}
    }
  }, []);

  // Fermer le tiroir menu avec la touche Echap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleGoHome = () => {
    setActivePropertyModalId(null);
    setIsFieldsBuilderOpen(false);
    setIsSubmitPropertyOpen(false);
    setIsAuthModalOpen(false);
    setIsSecurityModalOpen(false);
    setIsCompareOpen(false);
    setIsMobileMenuOpen(false);
    setCurrentTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 shadow-xs h-16 transition-none">
        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Kin Immobilier Logo */}
          <div
            onClick={handleGoHome}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
            title="Retourner à l'Accueil"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5 fill-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-xl font-black tracking-tight text-slate-900 uppercase">
                  KIN IMMOBILIER
                </span>
              </div>
              <span className="block text-xs text-emerald-700 font-extrabold tracking-tight">
                Plateforme Immobilière RDC
              </span>
            </div>
          </div>

          {/* Desktop Center Navigation Bar - Propre, fixe et sans boutons menu déroulants */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <button
              onClick={handleGoHome}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'home'
                  ? 'bg-emerald-50 text-emerald-800 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Accueil
            </button>
            <button
              onClick={() => {
                setCurrentTab('visites');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                currentTab === 'visites'
                  ? 'bg-slate-900 text-white font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span>Visites Vidéo</span>
            </button>
            <button
              onClick={() => {
                setCurrentTab('map');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'map'
                  ? 'bg-emerald-50 text-emerald-800 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Carte RDC
            </button>
            <button
              onClick={() => {
                setCurrentTab('agencies');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'agencies'
                  ? 'bg-emerald-50 text-emerald-800 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Agences
            </button>
            <button
              onClick={() => {
                setCurrentTab('agents');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'agents'
                  ? 'bg-emerald-50 text-emerald-800 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Agents Pro
            </button>
            <button
              onClick={() => {
                setCurrentTab('conciergerie');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                currentTab === 'conciergerie'
                  ? 'bg-emerald-50 text-emerald-800 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Conciergerie</span>
            </button>
            <button
              onClick={() => {
                setCurrentTab('pricing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                currentTab === 'pricing'
                  ? 'bg-emerald-50 text-emerald-800 font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Tarifs
            </button>
          </nav>

          {/* Right Action Tools - Épuré, fixe, sans boutons menu encombrants */}
          <div className="flex items-center gap-2">
            {/* Submit Property Button */}
            <button
              onClick={handleOpenPublish}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs sm:text-sm shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shrink-0"
              title="Publier une annonce immobilière"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publier</span>
            </button>

            {/* User Account / Auth Menu */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200">
                {/* Invite Partner button for agents, agencies, admins */}
                {(user.role === 'agent' || user.role === 'agency' || user.role === 'admin') && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    title="Inviter un agent ou une agence"
                    className="p-2 sm:p-2.5 min-h-[38px] rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-700" />
                    <span className="hidden xl:inline text-[11px] font-bold">Inviter</span>
                  </button>
                )}

                <button
                  onClick={() => setIsSecurityModalOpen(true)}
                  title="2FA & Sécurité"
                  className="p-2 sm:p-2.5 min-h-[38px] rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span className="hidden xl:inline text-[11px] font-bold">2FA</span>
                </button>

                <button
                  onClick={() => {
                    if (user.role === 'agency') {
                      setCurrentTab('agency-dashboard');
                    } else if (user.role === 'agent') {
                      setCurrentTab('agent-dashboard');
                    } else {
                      setCurrentTab('dashboard');
                    }
                  }}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
                  title="Mon Profil & Tableau de Bord"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-emerald-500/40"
                  />
                  <div className="hidden xl:block text-left">
                    <span className="block text-xs font-semibold text-slate-800 leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                      <BadgeCheck className="w-3 h-3 inline text-emerald-600" /> {user.role === 'agency' ? 'Agence' : user.role === 'agent' ? 'Agent' : 'Vérifié'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={logOut}
                  title="Se déconnecter"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 min-h-[38px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-800 transition-all active:scale-95 shadow-sm cursor-pointer shrink-0"
              >
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span>Connexion</span>
              </button>
            )}

            {/* Bouton Menu Interactif & Réactif (Visible sur tous les écrans) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu principal"
              className="p-2 sm:px-3 min-h-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-1.5 active:scale-95 transition-all font-bold text-xs cursor-pointer shadow-2xs shrink-0"
              title="Menu principal et outils"
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 text-emerald-700" />
              ) : (
                <Menu className="w-4 h-4 text-slate-700" />
              )}
              <span className="font-bold">Menu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Menu Panel Modal / Drawer - Placé hors du header pour échapper au stacking context backdrop-filter */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop plein écran */}
          <div
            className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed inset-x-3 bottom-20 sm:bottom-auto sm:top-20 sm:right-6 sm:left-auto sm:w-96 z-50 bg-white border border-slate-200 px-4 sm:px-5 py-5 space-y-4 shadow-2xl max-h-[82vh] overflow-y-auto rounded-3xl animate-in slide-in-from-bottom-2 sm:slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Menu & Outils
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Fermer le menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Language & Currency Quick Switcher */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                    className="bg-transparent text-slate-800 font-bold cursor-pointer outline-none text-xs"
                  >
                    {languages.map((l) => (
                      <option key={l.code} value={l.code} className="bg-white text-slate-900">
                        {l.flag} {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="bg-transparent text-slate-800 font-bold cursor-pointer outline-none text-xs"
                  >
                    {Object.values(currencies).map((c) => (
                      <option key={c.code} value={c.code} className="bg-white text-slate-900">
                        {c.symbol} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* User Profile Card Header or Login Button */}
              {user ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-sm text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                        alt={user.name}
                        className="w-11 h-11 rounded-xl object-cover ring-2 ring-emerald-500/50 shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5 truncate">
                          {user.name}
                          <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                        </h4>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        logOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                      title="Se déconnecter"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Accès Direct au Tableau de Bord de l'utilisateur connecté */}
                  <button
                    onClick={() => {
                      if (user.role === 'agency') {
                        setCurrentTab('agency-dashboard');
                      } else if (user.role === 'agent') {
                        setCurrentTab('agent-dashboard');
                      } else {
                        setCurrentTab('dashboard');
                      }
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-between transition-all shadow-md cursor-pointer ${
                      user.role === 'agency'
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                        : user.role === 'agent'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {user.role === 'agency' ? (
                        <Building2 className="w-4 h-4" />
                      ) : user.role === 'agent' ? (
                        <Briefcase className="w-4 h-4" />
                      ) : (
                        <UserIcon className="w-4 h-4" />
                      )}
                      <span>
                        {user.role === 'agency'
                          ? 'Mon Espace Agence'
                          : user.role === 'agent'
                          ? 'Mon Espace Agent'
                          : 'Mon Tableau de Bord'}
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 uppercase tracking-wider font-extrabold">
                      Accéder
                    </span>
                  </button>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <button
                      onClick={() => {
                        setIsSecurityModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sécurité 2FA</span>
                    </button>
                    {(user.role === 'agent' || user.role === 'agency' || user.role === 'admin') && (
                      <button
                        onClick={() => {
                          setIsInviteModalOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Inviter Partenaire</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  <span>Se Connecter / Créer un Compte</span>
                </button>
              )}

              {/* Raccourcis Favoris & Comparateur */}
              <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
                <button
                  onClick={() => {
                    setCurrentTab('wishlist');
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : 'text-slate-400'}`} />
                    <span>Favoris</span>
                  </div>
                  {wishlist.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                      {wishlist.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setIsCompareOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-600" />
                    <span>Comparer</span>
                  </div>
                  {compareList.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                      {compareList.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Navigation Essentielle & Épurée */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 pb-1">
                  Navigation
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                  <button
                    onClick={handleGoHome}
                    className={`p-3 rounded-xl flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      currentTab === 'home'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Home className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Accueil</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTab('visites');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-xl flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      currentTab === 'visites'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Film className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Visites Vidéo</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTab('map');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-xl flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      currentTab === 'map'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Carte RDC</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTab('agencies');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-xl flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      currentTab === 'agencies'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Agences</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTab('agents');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-xl flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      currentTab === 'agents'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Agents Pro</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTab('pricing');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-xl flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      currentTab === 'pricing'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Tarifs</span>
                  </button>

                  <button
                    onClick={() => {
                      setCurrentTab('conciergerie');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`p-3 rounded-xl flex items-center gap-2 text-left transition-colors cursor-pointer col-span-2 ${
                      currentTab === 'conciergerie'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Conciergerie Immobilière</span>
                  </button>
                </div>
              </div>

              {/* Devenir Partenaire WhatsApp */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    const partnerMsg = encodeURIComponent("Bonjour KINIMMO Partenariats, je souhaite devenir partenaire officiel (agence immobilière, promoteur ou agent indépendant) à Kinshasa.");
                    window.open(`https://wa.me/243845294616?text=${partnerMsg}`, '_blank', 'noopener,noreferrer');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Briefcase className="w-4 h-4 text-amber-700" />
                  <span>Devenir Agence Partenaire ou Promoteur</span>
                </button>
              </div>

              {/* Bouton Publier Simple */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    handleOpenPublish();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publier une Annonce</span>
                </button>
              </div>
            </div>
          </>
        )}

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200 px-3 h-17 sm:h-18 flex items-center justify-around text-xs font-extrabold text-slate-700 shadow-xl select-none pb-safe">
        <button
          onClick={handleGoHome}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] gap-1 transition-all active:scale-90 ${
            currentTab === 'home' ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
          title="Retourner à l'Accueil"
        >
          <Home className={`w-5.5 h-5.5 ${currentTab === 'home' ? 'text-emerald-600' : ''}`} />
          <span className="text-xs">Accueil</span>
        </button>

        {/* Bouton Visites Vidéo 30s TikTok */}
        <button
          onClick={() => {
            setCurrentTab('visites');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`relative flex flex-col items-center justify-center min-w-[56px] min-h-[50px] gap-1 transition-all active:scale-90 ${
            currentTab === 'visites' ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
          title="Visites Vidéo 30s TikTok"
        >
          <div className="relative">
            <Film className={`w-5.5 h-5.5 ${currentTab === 'visites' ? 'text-emerald-600' : ''}`} />
            <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <span className="text-xs">Visites</span>
        </button>

        {/* Central Floating "Publier" Action Button */}
        <button
          onClick={handleOpenPublish}
          className="relative -mt-6 flex flex-col items-center group active:scale-90 transition-transform cursor-pointer"
          aria-label="Publier un bien"
        >
          <div className="w-13 h-13 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 ring-4 ring-white flex items-center justify-center font-black">
            <PlusCircle className="w-6.5 h-6.5 stroke-[2.5]" />
          </div>
          <span className="text-xs font-black text-emerald-700 mt-0.5 tracking-tight">Publier</span>
        </button>

        <button
          onClick={() => {
            setCurrentTab('conciergerie');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] gap-1 transition-all active:scale-90 ${
            currentTab === 'conciergerie' ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
          title="Conciergerie Immobilière Kinimmo"
        >
          <Sparkles className={`w-5.5 h-5.5 ${currentTab === 'conciergerie' ? 'text-emerald-600' : ''}`} />
          <span className="text-xs">Conciergerie</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[50px] gap-1 transition-all active:scale-90 cursor-pointer ${
            isMobileMenuOpen ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
          title="Menu principal"
        >
          {isMobileMenuOpen ? (
            <X className="w-5.5 h-5.5 text-emerald-600" />
          ) : (
            <Menu className="w-5.5 h-5.5" />
          )}
          <span className="text-xs">Menu</span>
        </button>
      </nav>
    </>
  );
};

