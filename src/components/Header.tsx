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
} from 'lucide-react';
import { CurrencyCode, LanguageCode } from '../types';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
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
  } = useApp();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 transition-all">
        {/* Top Utility Bar */}
        <div className="bg-slate-950 px-3 sm:px-4 py-1 text-xs text-slate-400 border-b border-slate-800/60">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                KIN IMMOBILIER • Kinshasa & RDC
              </span>
              <span className="hidden sm:inline text-slate-600">|</span>
              <span className="hidden sm:inline text-[11px] text-slate-300">
                Base de Données Firestore Temps Réel & Recherche Carte
              </span>
            </div>

            <div className="flex items-center gap-3 ms-auto text-[11px]">
              {/* Language Selector */}
              <div className="relative flex items-center gap-1 group cursor-pointer">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                  className="bg-transparent text-slate-300 hover:text-white cursor-pointer outline-none border-none text-[11px] font-medium"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code} className="bg-slate-900 text-slate-200">
                      {l.flag} {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Selector */}
              <div className="relative flex items-center gap-1 group cursor-pointer">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="bg-transparent text-slate-300 hover:text-white cursor-pointer outline-none border-none text-[11px] font-medium"
                >
                  {Object.values(currencies).map((c) => (
                    <option key={c.code} value={c.code} className="bg-slate-900 text-slate-200">
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
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <svg
                className="w-5 h-5 fill-slate-950"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-base sm:text-xl font-black tracking-tight text-white uppercase">
                  KIN IMMOBILIER
                </span>
              </div>
              <span className="block text-[9px] sm:text-[10px] text-emerald-400 font-bold tracking-tight">
                Plateforme Immobilière RDC
              </span>
            </div>
          </div>

          {/* Navigation Links matching Estatik */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => setCurrentTab('home')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'home'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              Accueil
            </button>

            <button
              onClick={() => setCurrentTab('map')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'map'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Carte
            </button>

            <button
              onClick={() => setCurrentTab('grid')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'grid'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              Grille
            </button>

            <button
              onClick={() => setCurrentTab('agencies')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'agencies'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Agences
            </button>

            <button
              onClick={() => setCurrentTab('agents')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'agents'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Agents
            </button>

            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'dashboard'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              Mon Espace
            </button>

            <button
              onClick={() => setIsFieldsBuilderOpen(true)}
              className="ml-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all flex items-center gap-1 shadow-sm"
            >
              <SlidersHorizontal className="w-3 h-3 text-emerald-400" />
              Champs Custom
            </button>
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Wishlist */}
            <button
              onClick={() => setCurrentTab('wishlist')}
              title="Mes Favoris"
              className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
            >
              <Heart className={`w-4 h-4 ${wishlist.length > 0 ? 'text-rose-400 fill-rose-400' : ''}`} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Compare Drawer Toggle */}
            <button
              onClick={() => setIsCompareOpen(true)}
              title="Comparateur de biens"
              className="relative p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
            >
              <Scale className="w-4 h-4 text-amber-400" />
              {compareList.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-slate-950 rounded-full text-[10px] font-bold flex items-center justify-center">
                  {compareList.length}
                </span>
              )}
            </button>

            {/* Submit Property Button */}
            <button
              onClick={() => setIsSubmitPropertyOpen(true)}
              className="hidden sm:flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Publier
            </button>

            {/* User Account / Auth Menu */}
            {user ? (
              <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-800">
                <button
                  onClick={() => setIsSecurityModalOpen(true)}
                  title="2FA & Sécurité"
                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all flex items-center gap-1.5 text-xs font-semibold"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="hidden md:inline text-[11px] font-bold">2FA & Sécurité</span>
                </button>

                <button
                  onClick={() => setCurrentTab('dashboard')}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800"
                >
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-lg object-cover ring-2 ring-emerald-500/40"
                  />
                  <div className="hidden xl:block text-left">
                    <span className="block text-xs font-semibold text-slate-200 leading-tight">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                      <BadgeCheck className="w-3 h-3 inline" /> Vérifié
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setUser(null)}
                  title="Se déconnecter"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
              >
                <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Connexion</span>
              </button>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu principal"
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700/60"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5 text-emerald-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-down Menu Panel */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-3 animate-in slide-in-from-top duration-200">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setCurrentTab('home');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  currentTab === 'home'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Accueil</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab('map');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  currentTab === 'map'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Carte</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab('grid');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  currentTab === 'grid'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Grid className="w-4 h-4 text-emerald-400" />
                <span>Grille Biens</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab('agencies');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  currentTab === 'agencies'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Agences</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab('agents');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  currentTab === 'agents'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Agents</span>
              </button>

              <button
                onClick={() => {
                  setCurrentTab('dashboard');
                  setIsMobileMenuOpen(false);
                }}
                className={`p-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  currentTab === 'dashboard'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <UserIcon className="w-4 h-4 text-emerald-400" />
                <span>Mon Espace Admin</span>
              </button>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setIsSubmitPropertyOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Publier une Annonce</span>
              </button>

              <button
                onClick={() => {
                  setIsFieldsBuilderOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Fields Builder PRO</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Fixed Mobile Bottom Navigation Bar (Visible on phones & tablets < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-2 h-16 flex items-center justify-around text-[10px] font-bold text-slate-400 shadow-2xl">
        <button
          onClick={() => setCurrentTab('home')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentTab === 'home' ? 'text-emerald-400' : 'hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span>Accueil</span>
        </button>

        <button
          onClick={() => setCurrentTab('map')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentTab === 'map' ? 'text-emerald-400' : 'hover:text-slate-200'
          }`}
        >
          <MapPin className="w-5 h-5" />
          <span>Carte</span>
        </button>

        <button
          onClick={() => setIsSubmitPropertyOpen(true)}
          className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 font-extrabold active:scale-90 transition-transform"
          aria-label="Publier un bien"
        >
          <PlusCircle className="w-6 h-6" />
        </button>

        <button
          onClick={() => setCurrentTab('agencies')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentTab === 'agencies' ? 'text-emerald-400' : 'hover:text-slate-200'
          }`}
        >
          <Building2 className="w-5 h-5" />
          <span>Agences</span>
        </button>

        <button
          onClick={() => setCurrentTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentTab === 'dashboard' ? 'text-emerald-400' : 'hover:text-slate-200'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span>Espace</span>
        </button>
      </nav>
    </>
  );
};

