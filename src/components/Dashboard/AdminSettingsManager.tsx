import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getAdminCredentials, saveAdminCredentials, AdminCredentials } from '../../lib/adminCredentials';
import { ShieldCheck, KeyRound, User, Mail, Phone, Lock, Save, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export const AdminSettingsManager: React.FC = () => {
  const { user, setUser } = useApp();
  const currentCreds = getAdminCredentials();

  const [name, setName] = useState(currentCreds.name);
  const [email, setEmail] = useState(currentCreds.email);
  const [phone, setPhone] = useState(currentCreds.phone);
  const [agencyName, setAgencyName] = useState(currentCreds.agencyName);
  const [pin, setPin] = useState(currentCreds.pin);
  
  const [showPin, setShowPin] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || pin.length < 4) {
      setErrorMsg('Le code PIN/Mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    const updated: AdminCredentials = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      agencyName: agencyName.trim(),
      pin: pin.trim(),
    };

    saveAdminCredentials(updated);

    // Also update current active user object if logged in as admin
    if (user && user.role === 'admin') {
      const updatedUser = {
        ...user,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        agencyName: updated.agencyName,
      };
      setUser(updatedUser);
      localStorage.setItem('estatik_kinshasa_user', JSON.stringify(updatedUser));
    }

    setErrorMsg(null);
    setSuccessMsg('Vos identifiants et votre code PIN administrateur ont été mis à jour avec succès !');

    setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl max-w-3xl mx-auto">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
          <KeyRound className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-white">Sécurité & Identifiants Administrateur</h3>
          <p className="text-xs text-slate-400">
            Modifiez votre nom, votre e-mail et votre code PIN secret de connexion. Ces informations sont strictement confidentielles.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>Nom complet de l'Administrateur</span>
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>Adresse E-mail Administrateur</span>
            </label>
            <input
              type="email"
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Téléphone Administrateur</span>
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500/60"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Nom de l'Organisme / Agence</span>
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-amber-500/60"
            />
          </div>
        </div>

        {/* PIN Code secret */}
        <div className="pt-3 border-t border-slate-800">
          <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Nouveau Code PIN / Mot de passe Secret Administrateur</span>
          </label>
          <p className="text-[11px] text-slate-400 mb-2">
            Ce code est nécessaire pour déverrouiller l'accès administrateur. Conservez-le précieusement.
          </p>

          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              required
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              data-lpignore="true"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 border border-amber-500/40 rounded-xl text-emerald-400 text-lg font-mono tracking-widest focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:opacity-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Save className="w-4 h-4 text-slate-950" />
            <span>Enregistrer les Identifiants Admin</span>
          </button>
        </div>
      </form>
    </div>
  );
};
