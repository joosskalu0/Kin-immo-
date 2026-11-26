import React from 'react';
import { useApp } from '../../context/AppContext';
import { EmptyState, PageHeaderBar } from '../StateFeedback';
import { getAccountRoleLabel } from '../../utils/authValidation';
import {
  User as UserIcon,
  Briefcase,
  Plus,
  Heart,
  Bell,
  ShieldCheck,
  Building2,
  Users,
  Film,
  Sparkles,
  BookOpen,
  HelpCircle,
  CreditCard,
  LogOut,
  ChevronRight,
  Lock,
  Mail,
} from 'lucide-react';

interface AccountPageProps {
  onNavigatePath: (path: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onNavigatePath }) => {
  const { user, wishlist, savedSearches, logOut, requestConfirm } = useApp();

  if (!user) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PageHeaderBar title="Mon compte" fallbackPath="/" />
        <EmptyState
          icon={UserIcon}
          title="Connectez-vous à votre compte Kinimmo"
          description="Retrouvez vos favoris, vos alertes, publiez une annonce ou accédez à votre espace professionnel."
          actionLabel="Se connecter / Créer un compte"
          onAction={() => onNavigatePath('/connexion')}
          secondaryLabel="Parcourir les biens"
          onSecondaryAction={() => onNavigatePath('/rechercher')}
        />
      </div>
    );
  }

  const isPro = user.role === 'agent' || user.role === 'agency';
  const roleLabel = getAccountRoleLabel(user.role);
  const needsEmailConfirmation = user.role !== 'admin' && (!user.email || !user.emailVerified);

  const handleLogoutClick = () => {
    requestConfirm({
      title: 'Se déconnecter ?',
      message: 'Voulez-vous fermer votre session sur cet appareil ?',
      confirmText: 'Se déconnecter',
      cancelText: 'Rester connecté',
      onConfirm: async () => {
        await logOut();
        onNavigatePath('/');
      },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      <PageHeaderBar title="Mon compte" subtitle={roleLabel} fallbackPath="/" />

      {/* Carte Profil + Action principale unique */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <img
            src={
              user.avatar ||
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            }
            alt={user.name}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-[#1D4ED8]/20 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              {user.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 truncate">
              {user.email ? user.email : 'Aucun e-mail enregistré'}
            </p>
            {user.phone && (
              <p className="text-xs text-slate-500 font-medium truncate tabular-nums">
                {user.phone}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="inline-block px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#1D4ED8] text-[11px] font-bold">
                {roleLabel}
              </span>
              {user.email && user.emailVerified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                  <ShieldCheck className="w-3 h-3" /> E-mail confirmé
                </span>
              )}
            </div>
          </div>
        </div>

        {needsEmailConfirmation && (
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs text-slate-700 min-w-0">
              <Mail className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
              <div className="space-y-0.5 min-w-0">
                <p className="font-bold text-slate-900">
                  {user.email ? 'E-mail non confirmé (facultatif)' : 'Ajouter un e-mail (facultatif)'}
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Utile pour récupérer votre mot de passe ou recevoir des notifications par courriel.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigatePath('/compte/securite')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[#1D4ED8] font-bold text-xs inline-flex items-center justify-center shrink-0 cursor-pointer transition-colors"
            >
              {user.email ? 'Confirmer' : 'Ajouter'}
            </button>
          </div>
        )}

        {/* Action principale selon rôle */}
        {isPro ? (
          <button
            type="button"
            onClick={() => onNavigatePath('/pro')}
            className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Briefcase className="w-4 h-4" />
            <span>Ouvrir mon Espace pro</span>
          </button>
        ) : user.role === 'admin' ? (
          <button
            type="button"
            onClick={() => onNavigatePath('/admin')}
            className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-[#0B3EA8] hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Lock className="w-4 h-4 text-[#FACC15]" />
            <span>Ouvrir l'administration</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigatePath('/publier')}
            className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Publier une annonce</span>
          </button>
        )}
      </div>

      {/* Mon activité */}
      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
        <button
          type="button"
          onClick={() => onNavigatePath('/favoris')}
          className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-rose-500" />
            <span className="text-sm font-bold text-slate-800">Mes favoris</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tabular-nums">
            <span>{wishlist.length}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigatePath('/alertes')}
          className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[#1D4ED8]" />
            <span className="text-sm font-bold text-slate-800">Mes alertes</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 tabular-nums">
            <span>{savedSearches.length}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigatePath('/publier')}
          className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-[#1D4ED8]" />
            <span className="text-sm font-bold text-slate-800">Publier un bien</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => onNavigatePath('/compte/securite')}
          className="w-full min-h-[52px] px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#1D4ED8]" />
            <span className="text-sm font-bold text-slate-800">E-mail, sécurité et mot de passe</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Accès secondaires regroupés */}
      <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Découvrir & Services
        </div>
        {[
          { label: 'Agences immobilières', path: '/agences', icon: Building2 },
          { label: 'Agents certifiés', path: '/agents', icon: Users },
          { label: 'Visites vidéo', path: '/visites', icon: Film },
          { label: 'Conciergerie immobilière', path: '/conciergerie', icon: Sparkles },
          { label: 'Tarifs & abonnements', path: '/tarifs', icon: CreditCard },
          { label: 'Guides immobiliers', path: '/blog', icon: BookOpen },
          { label: "Centre d'aide", path: '/aide', icon: HelpCircle },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigatePath(item.path)}
              className="w-full min-h-[50px] px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4.5 h-4.5 text-[#1D4ED8]" />
                <span className="text-sm font-semibold text-slate-800">{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleLogoutClick}
        className="w-full min-h-[46px] px-4 py-3 rounded-xl bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Se déconnecter</span>
      </button>
    </div>
  );
};
