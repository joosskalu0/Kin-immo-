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
  Bot,
} from 'lucide-react';
import { CurrencyCode, LanguageCode } from '../types';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAssistant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentTab, setCurrentTab, onOpenAssistant }) => {
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
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 text-slate-800 transition-all shadow-sm">
        {/* Top Utility Bar */}
        <div className="bg-slate-50 px-3 sm:px-4 py-1 text-xs text-slate-600 border-b border-slate-200">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                KIN IMMOBILIER • Kinshasa & RDC
              </span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="hidden sm:inline text-[11px] text-slate-600">
                Plateforme Immobilière Certifiée • Annonces Vérifiées & Carte Interactive
              </span>
            </div>

            <div className="flex items-center gap-3 ms-auto text-[11px]">
              {/* Language Selector */}
              <div className="relative flex items-center gap-1 group cursor-pointer">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="bg-transparent text-slate-700 hover:text-slate-900 cursor-pointer outline-none border-none text-[11px] font-semibold"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code} className="bg-white text-slate-800">
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Selector */}
              <div className="relative flex items-center gap-1 group cursor-pointer">
                <Coins className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="bg-transparent text-slate-700 hover:text-slate-900 cursor-pointer outline-none border-none text-[11px] font-semibold"
                >
                  {Object.values(currencies).map((c) => (
                    <option key={c.code} value={c.code} className="bg-white text-slate-800">
                      {c.symbol} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navbar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Kin Immobilier Logo */}
          <div
            onClick={() => {
              setCurrentTab('home');
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
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

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setCurrentTab('home')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'home'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              Accueil
            </button>

            <button
              onClick={() => setCurrentTab('map')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'map'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Carte
            </button>

            <button
              onClick={() => setCurrentTab('grid')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'grid'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Grille
            </button>

            <button
              onClick={() => setCurrentTab('agencies')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'agencies'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Agences
            </button>

            <button
              onClick={() => setCurrentTab('agents')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'agents'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Agents
            </button>

            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              Mon Espace
            </button>

            <button
              onClick={() => setIsFieldsBuilderOpen(true)}
              className="ml-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-all flex items-center gap-1 shadow-sm"
            >
              <SlidersHorizontal className="w-3 h-3 text-emerald-700" />
              Champs Custom
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* AI Assistant Quick Trigger */}
            {onOpenAssistant && (
              <button
                onClick={onOpenAssistant}
                title="Conseiller IA Kinshasa"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition-all shadow-sm active:scale-95"
              >
                <Bot className="w-3.5 h-3.5 text-emerald-700" />
                <span>Conseiller IA</span>
              </button>
            )}

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
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Publier
            </button>

            {/* User Account / Auth Menu */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-200">
                <button
                  onClick={() => setIsSecurityModalOpen(true)}
                  title="2FA & Sécurité"
                  className="p-2.5 min-h-[42px] rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-all flex items-center gap-1.5 text-xs font-semibold active:scale-95"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span className="hidden md:inline text-[11px] font-bold">2FA & Sécurité</span>
                </button>

                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
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
                  onClick={() => setUser(null)}
                  title="Se déconnecter"
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-slate-800 transition-all active:scale-95 shadow-sm"
              >
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Connexion</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu principal"
              className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 flex items-center justify-center active:scale-95 transition-transform"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-emerald-700" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Overlay & Menu Panel */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Mobile Menu Panel */}
            <div className="fixed inset-x-0 top-[102px] z-40 bg-white border-b border-slate-200 px-4 py-5 space-y-4 shadow-xl max-h-[82vh] overflow-y-auto lg:hidden rounded-b-3xl animate-in slide-in-from-top duration-200">
              {/* User Profile Card Header inside Mobile Menu */}
              {user ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
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
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsAuthModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white font-extrabold text-sm flex items-center justify-center gap-2 active:scale-98 transition-all shadow-sm"
                >
                  <UserIcon className="w-4 h-4 text-emerald-400" />
                  <span>Se Connecter / S'inscrire</span>
                </button>
              )}

              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 pt-1">
                Navigation Principale
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    setCurrentTab('home');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`p-3.5 min-h-[48px] rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2.5 ${
                    currentTab === 'home'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Home className="w-4 h-4 text-emerald-600 shrink-0" />
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
                  onClick={() => {
                    setCurrentTab('grid');
                    setIsMobileMenuOpen(false);
                  }}
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

                <button
                  onClick={() => {
                    setIsFieldsBuilderOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-100 border border-slate-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filtres & Critères Personnalisés</span>
                </button>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-2xl border-t border-slate-200 px-2 h-16 sm:h-18 flex items-center justify-around text-[10px] font-bold text-slate-600 shadow-lg select-none pb-safe">
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[48px] gap-1 transition-all active:scale-90 ${
            currentTab === 'home' ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
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
          onClick={() => setCurrentTab('agencies')}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[48px] gap-1 transition-all active:scale-90 ${
            currentTab === 'agencies' ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
        >
          <Building2 className={`w-5 h-5 ${currentTab === 'agencies' ? 'text-emerald-600' : ''}`} />
          <span>Agences</span>
        </button>

        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[48px] gap-1 transition-all active:scale-90 ${
            currentTab === 'dashboard' ? 'text-emerald-700 font-black' : 'hover:text-slate-900'
          }`}
        >
          <UserIcon className={`w-5 h-5 ${currentTab === 'dashboard' ? 'text-emerald-600' : ''}`} />
          <span>Espace</span>
        </button>
      </nav>
    </>
  );
};

