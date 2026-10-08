import React, { useState } from 'react';
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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 transition-all shadow-sm">
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
              <span className="block text-[9px] sm:text-[10px] text-emerald-700 font-extrabold tracking-tight">
                Plateforme Immobilière RDC
              </span>
            </div>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Wishlist */}
            <button
              onClick={() => setCurrentTab('wishlist')}
              title="Mes Favoris"
              className="relative p-2.5 min-w-[42px] min-h-[42px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all border border-slate-200 flex items-center justify-center active:scale-95"
            >
              <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Compare Drawer Toggle */}
            <button
              onClick={() => setIsCompareOpen(true)}
              title="Comparateur de biens"
              className="relative p-2.5 min-w-[42px] min-h-[42px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all border border-slate-200 flex items-center justify-center active:scale-95"
            >
              <Scale className="w-4 h-4 text-amber-600" />
              {compareList.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                  {compareList.length}
                </span>
              )}
            </button>

            {/* Submit Property Button */}
            <button
              onClick={() => setIsSubmitPropertyOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Publier
            </button>

            {/* Bouton Devenir Partenaire */}
            <button
              onClick={() => {
                const partnerMsg = encodeURIComponent("Bonjour KINIMMO Partenariats, je souhaite devenir partenaire officiel (agence immobilière, promoteur ou agent indépendant) à Kinshasa.");
                window.open(`https://wa.me/243845294616?text=${partnerMsg}`, '_blank', 'noopener,noreferrer');
              }}
              title="Devenir Agence Partenaire ou Promoteur Agréé"
              className="hidden md:flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-700" />
              <span>Devenir Partenaire</span>
            </button>

            {/* User Account / Auth Menu */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200">
                {/* Invite Partner button for agents, agencies, admins */}
                {(user.role === 'agent' || user.role === 'agency' || user.role === 'admin') && (
                  <button
                    onClick={() => setIsInviteModalOpen(true)}
                    title="Inviter un agent ou une agence"
                    className="p-2.5 min-h-[42px] rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-700" />
                    <span className="hidden md:inline text-[11px] font-bold">Inviter</span>
                  </button>
                )}

                <button
                  onClick={() => setIsSecurityModalOpen(true)}
                  title="2FA & Sécurité"
                  className="p-2.5 min-h-[42px] rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span className="hidden md:inline text-[11px] font-bold">2FA & Sécurité</span>
                </button>

                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200 cursor-pointer"
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
                      <BadgeCheck className="w-3 h-3 inline text-emerald-600" /> Vérifié
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
                className="flex items-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-800 transition-all active:scale-95 shadow-sm cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Connexion</span>
              </button>
            )}

            {/* Bouton Menu Propre & Moderne */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu principal"
              className="p-2.5 px-3 min-h-[42px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center gap-1.5 active:scale-95 transition-all font-bold text-xs cursor-pointer shadow-2xs"
              title="Menu principal"
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

        {/* Slide-down Menu Panel */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <div className="fixed inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 top-18 sm:top-20 z-50 bg-white border border-slate-200 px-4 sm:px-5 py-5 space-y-4 shadow-2xl max-h-[82vh] overflow-y-auto rounded-3xl animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Menu & Raccourcis
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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
              {/* User Profile Card Header inside Mobile Menu */}
              {user ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/40" />
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-1">
                          {user.name}
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                        </h4>
                        <p className="text-[11px] text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setIsSecurityModalOpen(true);
                          setIsMobileMenuOpen(false);
                        }}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                        title="Sécurité 2FA"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          logOut();
                          setIsMobileMenuOpen(false);
                        }}
                        className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 text-xs"
                        title="Se déconnecter"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {(user.role === 'agent' || user.role === 'agency' || user.role === 'admin') && (
                    <button
                      onClick={() => {
                        setIsInviteModalOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-100/70 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <UserPlus className="w-4 h-4 text-emerald-700" />
                      <span>Inviter des Agents & Agences</span>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  <span>Se Connecter / S'inscrire</span>
                </button>
              )}

              {/* Espace Devenir Partenaire */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-emerald-50 border border-amber-300/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-2xs">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                        Espace Partenaires & Agences
                      </h4>
                      <p className="text-[10px] text-slate-600 font-medium">
                        Agences certifiées, promoteurs neufs & agents
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white">
                    B2B
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      const partnerMsg = encodeURIComponent("Bonjour KINIMMO Partenariats, je souhaite devenir partenaire (agence immobilière, promoteur ou agent indépendant) sur votre plateforme.");
                      window.open(`https://wa.me/243845294616?text=${partnerMsg}`, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98"
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Devenir Partenaire</span>
                  </button>
                  <a
                    href="tel:+243845294616"
                    className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                    title="Ligne directe Partenariats"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Ligne Directe</span>
                  </a>
                </div>
              </div>

              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 pt-1">
                Navigation Principale
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={handleGoHome}
                  className={`p-3.5 min-h-[48px] rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2.5 ${
                    currentTab === 'home'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                  title="Retourner à l'Accueil"
                >
                  <Home className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Accueil</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('map');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3.5 min-h-[48px] rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2.5 ${
                    currentTab === 'map'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Carte RDC</span>
                </button>

                <button
                  onClick={handleGoHome}
                  className={`p-3.5 min-h-[48px] rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2.5 ${
                    currentTab === 'grid'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Grid className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Toutes Annonces</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('agencies');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3.5 min-h-[48px] rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2.5 ${
                    currentTab === 'agencies'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm'
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
                  className={`p-3.5 min-h-[48px] rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2.5 ${
                    currentTab === 'agents'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Agents Vérifiés</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('conciergerie');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3.5 min-h-[48px] rounded-2xl text-xs font-extrabold transition-all flex items-center justify-between gap-2.5 col-span-2 ${
                    currentTab === 'conciergerie'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-md ring-2 ring-emerald-400'
                      : 'bg-emerald-50/60 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Conciergerie Immobilière (Accompagnement VIP)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white">
                    Service
                  </span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('pricing');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3.5 min-h-[48px] rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2.5 ${
                    currentTab === 'pricing'
                      ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Tarifs & Abonnements</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3.5 min-h-[48px] rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2.5 ${
                    currentTab === 'dashboard'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tableau de Bord</span>
                </button>
              </div>

              <div className="pt-2 flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setIsSubmitPropertyOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Publier une Annonce</span>
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200 px-2 h-16 sm:h-18 flex items-center justify-around text-[10px] font-bold text-slate-600 shadow-lg select-none pb-safe">
        <button
          onClick={handleGoHome}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[48px] gap-1 transition-all active:scale-90 ${
            currentTab === 'home' ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
          title="Retourner à l'Accueil"
        >
          <Home className={`w-5 h-5 ${currentTab === 'home' ? 'text-emerald-600' : ''}`} />
          <span>Accueil</span>
        </button>

        <button
          onClick={() => setCurrentTab('map')}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[48px] gap-1 transition-all active:scale-90 ${
            currentTab === 'map' ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
        >
          <MapPin className={`w-5 h-5 ${currentTab === 'map' ? 'text-emerald-600' : ''}`} />
          <span>Carte</span>
        </button>

        {/* Central Floating "Publier" Action Button */}
        <button
          onClick={() => setIsSubmitPropertyOpen(true)}
          className="relative -mt-6 flex flex-col items-center group active:scale-90 transition-transform"
          aria-label="Publier un bien"
        >
          <div className="w-13 h-13 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-600/30 ring-4 ring-white flex items-center justify-center font-black">
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span className="text-[9px] font-black text-emerald-700 mt-0.5 tracking-tight">Publier</span>
        </button>

        <button
          onClick={() => setCurrentTab('conciergerie')}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[48px] gap-1 transition-all active:scale-90 ${
            currentTab === 'conciergerie' ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
          title="Conciergerie Immobilière Kinimmo"
        >
          <Sparkles className={`w-5 h-5 ${currentTab === 'conciergerie' ? 'text-emerald-600' : ''}`} />
          <span>Conciergerie</span>
        </button>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[48px] gap-1 transition-all active:scale-90 cursor-pointer ${
            isMobileMenuOpen ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
          title="Menu principal"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5 text-emerald-600" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
};

