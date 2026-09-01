import React, { useState } from 'react';
import {
  Users,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
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
  Sparkles,
  ExternalLink,
  Info
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { useApp } from '../../context/AppContext';
import { adminResetUserPassword, adminCreateOrUpdateUserAccount, getRegisteredAccounts } from '../../lib/authStore';

export const AdminUserPasswordsManager: React.FC = () => {
  const { allUsers, deleteUser, requestConfirm } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  
  // Password visibility tracking per user ID
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  
  // Copy feedback tracking
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWhatsappId, setCopiedWhatsappId] = useState<string | null>(null);

  // Edit password modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState<string | null>(null);
  const [passwordUpdateError, setPasswordUpdateError] = useState<string | null>(null);

  // Add user modal state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('agent');
  const [newUserAgency, setNewUserAgency] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [createUserSuccess, setCreateUserSuccess] = useState<string | null>(null);

  // Merge registered accounts from local store and AppContext allUsers
  const localAccounts = getRegisteredAccounts();
  const usersMap = new Map<string, User>();

  localAccounts.forEach((acc) => {
    if (acc.id) usersMap.set(acc.id, acc);
    if (acc.email) usersMap.set(acc.email.toLowerCase(), acc);
  });

  allUsers.forEach((u) => {
    const existing = (u.id ? usersMap.get(u.id) : undefined) || (u.email ? usersMap.get(u.email.toLowerCase()) : undefined);
    const resolvedPassword = u.password || u.accessPin || existing?.password || existing?.accessPin || undefined;
    const merged: User = {
      ...existing,
      ...u,
      password: resolvedPassword,
      accessPin: resolvedPassword,
    };
    if (u.id) usersMap.set(u.id, merged);
    if (u.email) usersMap.set(u.email.toLowerCase(), merged);
  });

  const combinedUsers = Array.from(new Set(Array.from(usersMap.values())));

  // Filtering
  const filteredUsers = combinedUsers.filter((u) => {
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

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const generateWhatsappMessage = (targetUser: User): string => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://immocraft-kinshasa.com';
    const pwd = targetUser.password || targetUser.accessPin || 'kalu2002jooss';
    return `Bonjour ${targetUser.name},\n\nVoici vos identifiants pour vous connecter à votre compte Immocraft Kinshasa :\n\n📧 Adresse E-mail : ${targetUser.email}\n🔑 Mot de passe : ${pwd}\n🌐 Accès Direct : ${currentOrigin}\n\nEn cas de besoin, l'assistance technique reste à votre entière disposition !`;
  };

  const handleCopyWhatsapp = (targetUser: User) => {
    const message = generateWhatsappMessage(targetUser);
    navigator.clipboard.writeText(message);
    setCopiedWhatsappId(targetUser.id);
    setTimeout(() => setCopiedWhatsappId(null), 3000);

    // If user has a phone number, optionally open WhatsApp directly
    if (targetUser.phone) {
      const cleanPhone = targetUser.phone.replace(/[^\d]/g, '');
      if (cleanPhone.length >= 8) {
        const encoded = encodeURIComponent(message);
        window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
      }
    }
  };

  const handleOpenEditPassword = (targetUser: User) => {
    setEditingUser(targetUser);
    setNewPasswordInput(targetUser.password || targetUser.accessPin || '');
    setPasswordUpdateSuccess(null);
    setPasswordUpdateError(null);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 4) {
      setPasswordUpdateError('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordUpdateError(null);
    try {
      const res = await adminResetUserPassword(editingUser.id || editingUser.email, newPasswordInput.trim());
      if (res.success) {
        setPasswordUpdateSuccess(`Mot de passe mis à jour avec succès pour ${editingUser.name} !`);
        setTimeout(() => {
          setEditingUser(null);
          setPasswordUpdateSuccess(null);
        }, 2000);
      } else {
        setPasswordUpdateError(res.error || 'Erreur lors de la mise à jour.');
      }
    } catch (err: any) {
      setPasswordUpdateError(err?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail.trim() || !newUserName.trim()) {
      setCreateUserError('Le nom et l\'adresse e-mail sont obligatoires.');
      return;
    }
    if (!newUserPassword.trim() || newUserPassword.trim().length < 4) {
      setCreateUserError('Le mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    setIsCreatingUser(true);
    setCreateUserError(null);

    const newId = `user_${Date.now()}`;
    const userToCreate: User = {
      id: newId,
      name: newUserName.trim(),
      email: newUserEmail.trim().toLowerCase(),
      phone: newUserPhone.trim() || '+243 81 000 0000',
      whatsapp: newUserPhone.trim() || '+243 81 000 0000',
      role: newUserRole,
      agencyName: (newUserRole === 'agent' || newUserRole === 'agency') ? (newUserAgency.trim() || 'Kinshasa Immobilier') : undefined,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      planId: newUserRole === 'agency' ? 'agency' : newUserRole === 'agent' ? 'pro' : 'starter',
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      twoFactorEnabled: false,
      kinshasaBadgeVerified: newUserRole === 'agent' || newUserRole === 'agency',
      password: newUserPassword.trim(),
      accessPin: newUserPassword.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      await adminCreateOrUpdateUserAccount(userToCreate, newUserPassword.trim());
      setCreateUserSuccess(`Compte créé avec succès pour ${userToCreate.name} !`);
      setTimeout(() => {
        setIsAddUserOpen(false);
        setCreateUserSuccess(null);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPhone('');
        setNewUserAgency('');
        setNewUserPassword('');
      }, 1800);
    } catch (err: any) {
      setCreateUserError(err?.message || 'Erreur lors de la création du compte.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = (u: User) => {
    requestConfirm({
      title: 'Supprimer ce compte',
      message: `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${u.name} (${u.email}) ?`,
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
            <Building className="w-3 h-3" /> Agence Partenaire
          </span>
        );
      case 'agent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Briefcase className="w-3 h-3" /> Agent Immobilier
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-300 border border-slate-700">
            <UserIcon className="w-3 h-3" /> Client / Particulier
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Comptes Utilisateurs & Mots de Passe</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Assistance Admin Active
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Consultez la liste des comptes inscrits, visualisez leurs identifiants de connexion, modifiez ou réinitialisez leurs mots de passe, et envoyez un message d'assistance WhatsApp en un clic pour les aider à se connecter.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddUserOpen(true)}
            className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Ajouter un Compte</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs text-slate-400 block font-medium">Total Inscrits</span>
            <span className="text-2xl font-black text-white mt-1 block">{combinedUsers.length}</span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs text-blue-400 block font-medium">Agents Immobiliers</span>
            <span className="text-2xl font-black text-blue-400 mt-1 block">
              {combinedUsers.filter((u) => u.role === 'agent').length}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs text-amber-400 block font-medium">Agences Immobilières</span>
            <span className="text-2xl font-black text-amber-400 mt-1 block">
              {combinedUsers.filter((u) => u.role === 'agency').length}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <span className="text-xs text-emerald-400 block font-medium">Particuliers / Clients</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {combinedUsers.filter((u) => u.role === 'user' || !u.role).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
          {(['all', 'agent', 'agency', 'user', 'admin'] as const).map((rf) => (
            <button
              key={rf}
              onClick={() => setRoleFilter(rf)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                roleFilter === rf
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
              }`}
            >
              {rf === 'all'
                ? 'Tous'
                : rf === 'agent'
                ? 'Agents'
                : rf === 'agency'
                ? 'Agences'
                : rf === 'user'
                ? 'Clients'
                : 'Admins'}
            </button>
          ))}
        </div>
      </div>

      {/* Users & Passwords Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider font-semibold">
                <th className="py-4 px-5">Utilisateur & Agence</th>
                <th className="py-4 px-5">Rôle</th>
                <th className="py-4 px-5">Contact</th>
                <th className="py-4 px-5">Mot de Passe / Clé d'Accès</th>
                <th className="py-4 px-5 text-right">Actions d'Assistance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-base">Aucun utilisateur trouvé</p>
                    <p className="text-xs text-slate-500 mt-1">Essayez un autre mot-clé ou filtre.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isVisible = visiblePasswords[u.id] || false;
                  const passwordToDisplay = u.password || u.accessPin || (u.role === 'admin' ? 'kalu2002jooss' : 'Kinshasa@2026');
                  const isCopied = copiedId === u.id;
                  const isWhatsappCopied = copiedWhatsappId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-850/50 transition-colors">
                      {/* User Info */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={u.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {u.kinshasaBadgeVerified && (
                                <span className="text-[10px] text-amber-400" title="Vérifié Kinshasa">🛡️</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{u.email}</span>
                            </div>
                            {u.agencyName && (
                              <div className="text-[11px] text-amber-400/90 font-medium mt-0.5 flex items-center gap-1">
                                <Building className="w-3 h-3" />
                                <span>{u.agencyName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-5 whitespace-nowrap">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Phone & Contact */}
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

                      {/* Password Display Box */}
                      <td className="py-4 px-5">
                        <div className="inline-flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="font-mono text-xs font-bold tracking-wider text-slate-200">
                            {isVisible ? passwordToDisplay : '••••••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                            title={isVisible ? 'Masquer' : 'Afficher le mot de passe'}
                          >
                            {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(passwordToDisplay, u.id)}
                            className={`p-1 rounded transition-colors ${
                              isCopied ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
                            }`}
                            title="Copier le mot de passe"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* WhatsApp Helper Message Button */}
                          <button
                            type="button"
                            onClick={() => handleCopyWhatsapp(u)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
                              isWhatsappCopied
                                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                            }`}
                            title="Copier le message complet avec les identifiants pour l'envoyer sur WhatsApp à l'utilisateur"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{isWhatsappCopied ? 'Copié WhatsApp !' : '📲 WhatsApp'}</span>
                          </button>

                          {/* Edit Password Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditPassword(u)}
                            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 transition-all active:scale-95"
                            title="Modifier / Réinitialiser le mot de passe"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User Button (not for admin) */}
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-all active:scale-95"
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

      {/* Modal: Edit Password */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Changer le Mot de Passe</h3>
                  <p className="text-xs text-slate-400">{editingUser.name} ({editingUser.email})</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
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
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nouveau Mot de Passe / Clé de Connexion
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Ex: Kinshasa@2026 ou nouveau mot de passe"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Ce mot de passe sera immédiatement actif et synchronisé dans la base de données pour permettre à l'utilisateur de se connecter.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUpdatingPassword ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add New User Account */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Créer un Nouveau Compte</h3>
                  <p className="text-xs text-slate-400">Ajouter manuellement un agent, une agence ou un utilisateur</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
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
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nom Complet *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Ex: Patrick Tshisekedi"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Rôle du Compte *
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="agent">Agent Immobilier (PRO)</option>
                    <option value="agency">Agence Immobilière</option>
                    <option value="user">Client / Particulier</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Adresse E-mail *
                  </label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="agent@domaine.cd"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Numéro Téléphone / WhatsApp
                  </label>
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
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nom de l'Agence Immobilière
                  </label>
                  <input
                    type="text"
                    value={newUserAgency}
                    onChange={(e) => setNewUserAgency(e.target.value)}
                    placeholder="Ex: Kinshasa Prestige Real Estate"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Mot de Passe Initial *
                </label>
                <input
                  type="text"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Ex: Kinshasa@2026"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Vous pourrez immédiatement copier les identifiants pour lui transmettre sur WhatsApp après la création.
                </p>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCreatingUser ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  <span>Créer le Compte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
