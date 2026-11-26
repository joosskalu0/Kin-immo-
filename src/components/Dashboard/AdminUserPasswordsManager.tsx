import React, { useState } from 'react';
import {
  Users,
  Search,
  KeyRound,
  MessageSquare,
  UserPlus,
  Shield,
  Briefcase,
  Building,
  User as UserIcon,
  Edit3,
  Trash2,
  Lock,
  RefreshCw,
  Phone,
  Mail,
  Check,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { useApp } from '../../context/AppContext';
import { mysqlApi } from '../../services/mysqlApi';
import {
  MIN_PASSWORD_LENGTH,
  validatePasswordPolicy,
  normalizePhoneRdc,
  normalizeEmailAddress,
  isValidEmailAddress,
} from '../../utils/authValidation';

export const AdminUserPasswordsManager: React.FC = () => {
  const { allUsers, deleteUser, requestConfirm } = useApp();
  const [adminUsersOverride, setAdminUsersOverride] = useState<User[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [copiedWhatsappId, setCopiedWhatsappId] = useState<string | null>(null);

  // Edit / reset password modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState<string | null>(null);
  const [passwordUpdateError, setPasswordUpdateError] = useState<string | null>(null);

  // Add user modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('+243 ');
  const [newUserRole, setNewUserRole] = useState<UserRole>('agent');
  const [newUserAgency, setNewUserAgency] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);

  const displayedUsers = adminUsersOverride || allUsers;
  const filteredUsers = displayedUsers.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchPhone = u.phone?.toLowerCase().includes(q);
      const matchAgency = u.agencyName?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchAgency) return false;
    }
    return true;
  });

  const handleCopyWhatsappResetLink = (targetUser: User) => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://kinimmo.com';
    const identifier = targetUser.email || targetUser.phone || '';
    const message = `Bonjour ${targetUser.name},\n\nVoici les informations de votre compte Kinimmo :\n\n• Identifiant : ${identifier}\n• Connexion : ${currentOrigin}/connexion\n• Réinitialiser votre mot de passe : ${currentOrigin}/mot-de-passe-oublie\n\nNotre équipe reste à votre disposition.`;
    navigator.clipboard.writeText(message).catch(() => {});
    setCopiedWhatsappId(targetUser.id);
    setTimeout(() => setCopiedWhatsappId(null), 3000);
  };

  const handleOpenEditPassword = (targetUser: User) => {
    setEditingUser(targetUser);
    setNewPasswordInput('');
    setPasswordUpdateSuccess(null);
    setPasswordUpdateError(null);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const pwdCheck = validatePasswordPolicy(newPasswordInput);
    if (!pwdCheck.valid) {
      setPasswordUpdateError(pwdCheck.error || `Minimum ${MIN_PASSWORD_LENGTH} caractères requis.`);
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordUpdateError(null);
    try {
      const res = await mysqlApi.adminResetUserPassword(editingUser.id, newPasswordInput);
      if (res?.success) {
        setPasswordUpdateSuccess(`Mot de passe chiffré (bcrypt) mis à jour pour ${editingUser.name}. Toutes ses anciennes sessions ont été révoquées.`);
        setNewPasswordInput('');
        setTimeout(() => {
          setEditingUser(null);
          setPasswordUpdateSuccess(null);
        }, 1800);
      } else {
        setPasswordUpdateError(res?.error || 'Erreur lors de la mise à jour.');
      }
    } catch (err: any) {
      setPasswordUpdateError(err?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) {
      setCreateUserError('Le nom complet est obligatoire.');
      return;
    }
    const cleanEmail = normalizeEmailAddress(newUserEmail);
    const hasPhoneInput = Boolean(newUserPhone.trim() && newUserPhone.trim() !== '+243');
    const phoneCheck = normalizePhoneRdc(newUserPhone);
    if (!cleanEmail && !hasPhoneInput) {
      setCreateUserError('Renseignez une adresse e-mail ou un numéro +243 valide.');
      return;
    }
    if (cleanEmail && !isValidEmailAddress(cleanEmail)) {
      setCreateUserError("Format d'adresse e-mail invalide.");
      return;
    }
    if (hasPhoneInput && !phoneCheck.valid) {
      setCreateUserError(phoneCheck.error || 'Format téléphone +243 invalide.');
      return;
    }
    const pwdCheck = validatePasswordPolicy(newUserPassword);
    if (!pwdCheck.valid) {
      setCreateUserError(pwdCheck.error || `Mot de passe invalide (${MIN_PASSWORD_LENGTH} caractères minimum).`);
      return;
    }

    setIsCreatingUser(true);
    setCreateUserError(null);

    try {
      const res = await mysqlApi.adminCreateUser({
        name: newUserName.trim(),
        email: cleanEmail || undefined,
        phone: phoneCheck.valid ? phoneCheck.normalized : undefined,
        password: newUserPassword,
        role: newUserRole,
        agencyName:
          newUserRole === 'agent' || newUserRole === 'agency'
            ? newUserAgency.trim() || undefined
            : undefined,
      });

      if (!res?.success) {
        throw new Error(res?.error || 'Création refusée par le serveur.');
      }

      setCreateUserSuccess(`Compte créé de façon sécurisée pour ${newUserName.trim()}.`);
      try {
        const usersRes = await mysqlApi.adminGetUsers();
        const freshList = (usersRes?.users || usersRes?.data?.users) as User[] | undefined;
        if (Array.isArray(freshList)) {
          setAdminUsersOverride(freshList);
        }
      } catch {}
      setTimeout(() => {
        setIsAddUserOpen(false);
        setCreateUserSuccess(null);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPhone('+243 ');
        setNewUserAgency('');
        setNewUserPassword('');
      }, 1500);
    } catch (err: any) {
      setCreateUserError(err?.message || 'Erreur lors de la création du compte.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = (u: User) => {
    requestConfirm({
      title: 'Supprimer ce compte',
      message: `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${u.name} (${u.email || u.phone || u.id}) ?`,
      confirmText: 'Supprimer définitivement',
      cancelText: 'Annuler',
      onConfirm: () => {
        deleteUser(u.id);
      },
    });
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Shield className="w-3 h-3" /> Administrateur
          </span>
        );
      case 'agency':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Building className="w-3 h-3" /> Agence
          </span>
        );
      case 'agent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Briefcase className="w-3 h-3" /> Agent
          </span>
        );
      case 'owner':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UserIcon className="w-3 h-3" /> Particulier
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-300 border border-slate-700">
            <UserIcon className="w-3 h-3" /> Chercheur
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Gestion sécurisée des comptes</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Les mots de passe sont hachés avec bcrypt et ne sont jamais affichés en clair. Vous pouvez réinitialiser l’accès d’un utilisateur ou copier son lien de récupération.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddUserOpen(true)}
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un compte</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs text-slate-400 block font-medium">Total comptes</span>
            <span className="text-2xl font-black text-white mt-1 block">{displayedUsers.length}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs text-blue-400 block font-medium">Agents</span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">
              {displayedUsers.filter((u) => u.role === 'agent').length}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs text-amber-400 block font-medium">Agences</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {displayedUsers.filter((u) => u.role === 'agency').length}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs text-emerald-400 block font-medium">E-mails confirmés</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {displayedUsers.filter((u) => Boolean(u.email && u.emailVerified)).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-lg">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, téléphone, agence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {(['all', 'agent', 'agency', 'owner', 'user', 'admin'] as const).map((rf) => (
            <button
              key={rf}
              type="button"
              onClick={() => setRoleFilter(rf)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                roleFilter === rf
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {rf === 'all'
                ? 'Tous'
                : rf === 'agent'
                ? 'Agents'
                : rf === 'agency'
                ? 'Agences'
                : rf === 'owner'
                ? 'Particuliers'
                : rf === 'user'
                ? 'Chercheurs'
                : 'Admins'}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="py-4 px-5">Utilisateur</th>
                <th className="py-4 px-5">Type de compte</th>
                <th className="py-4 px-5">Téléphone</th>
                <th className="py-4 px-5">Vérification</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-base">Aucun utilisateur trouvé</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isWhatsappCopied = copiedWhatsappId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-white">{u.name}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span>{u.email || 'Aucun e-mail'}</span>
                        </div>
                        {u.agencyName && (
                          <div className="text-[11px] text-amber-400 font-medium mt-0.5">
                            {u.agencyName}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">{getRoleBadge(u.role)}</td>

                      <td className="py-4 px-5 whitespace-nowrap text-xs text-slate-300">
                        {u.phone ? (
                          <div className="flex items-center gap-1.5 font-mono">
                            <Phone className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Non renseigné</span>
                        )}
                      </td>

                      <td className="py-4 px-5 whitespace-nowrap">
                        {u.email && u.emailVerified ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                            <ShieldCheck className="w-3.5 h-3.5" /> E-mail confirmé
                          </span>
                        ) : u.email ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5" /> En attente de confirmation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                            Téléphone uniquement
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyWhatsappResetLink(u)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                              isWhatsappCopied
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{isWhatsappCopied ? 'Lien copié' : 'Lien d’accès'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditPassword(u)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 cursor-pointer"
                            title="Définir un nouveau mot de passe"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 cursor-pointer"
                              title="Supprimer ce compte"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Reset Password */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white">Réinitialiser le mot de passe</h3>
                <p className="text-xs text-slate-400">{editingUser.name}</p>
              </div>
              <button type="button" onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="space-y-4 mt-5">
              {passwordUpdateSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{passwordUpdateSuccess}</span>
                </div>
              )}
              {passwordUpdateError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                  {passwordUpdateError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nouveau mot de passe ({MIN_PASSWORD_LENGTH} caractères minimum) *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create User */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white">Créer un compte sécurisé</h3>
                <p className="text-xs text-slate-400">Hachage bcrypt automatique côté serveur</p>
              </div>
              <button type="button" onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 mt-5">
              {createUserSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{createUserSuccess}</span>
                </div>
              )}
              {createUserError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                  {createUserError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Ex: Patrick Kabila"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Type de compte *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="user">Chercheur</option>
                    <option value="owner">Particulier</option>
                    <option value="agent">Agent</option>
                    <option value="agency">Agence</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Adresse e-mail</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="agent@kinimmo.cd"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Téléphone +243</label>
                  <input
                    type="tel"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    placeholder="+243 81 234 5678"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {(newUserRole === 'agent' || newUserRole === 'agency') && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nom de l'agence</label>
                  <input
                    type="text"
                    value={newUserAgency}
                    onChange={(e) => setNewUserAgency(e.target.value)}
                    placeholder="Ex: Kinshasa Prestige"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Mot de passe initial ({MIN_PASSWORD_LENGTH} caractères min.) *
                </label>
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder={`Au moins ${MIN_PASSWORD_LENGTH} caractères`}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>Créer le compte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
