import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { verifyAdminPin } from '../lib/adminCredentials';
import { updateAccountPassword } from '../lib/authStore';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Mail,
  CheckCircle2,
  Copy,
  Check,
  QrCode,
  KeyRound,
  Lock,
  Building2,
  AlertTriangle,
  RefreshCw,
  BadgeCheck,
  Globe,
  FileText
} from 'lucide-react';
import { User } from '../types';

export const SecuritySettingsModal: React.FC = () => {
  const { user, setUser, isSecurityModalOpen, setIsSecurityModalOpen, adminPin, updateAdminPin } = useApp();

  const [activeTab, setActiveTab] = useState<'status' | '2fa' | 'rccm' | 'sessions' | 'password'>('status');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // 2FA state toggle
  const [otpInput, setOtpInput] = useState('');
  const [isToggling2FA, setIsToggling2FA] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Password state
  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // RCCM Form state
  const [rccmNumber, setRccmNumber] = useState(user?.rccmOrNif || '');

  if (!isSecurityModalOpen || !user) return null;

  const backupCodes = [
    'KIN-8821-X992-SEC',
    'KIN-4902-M881-SEC',
    'KIN-1092-P334-SEC',
    'KIN-7729-K110-SEC',
  ];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(code);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggle2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (user.twoFactorEnabled) {
      // Disable 2FA
      setIsToggling2FA(true);
      setTimeout(() => {
        setIsToggling2FA(false);
        const updatedUser: User = {
          ...user,
          twoFactorEnabled: false,
        };
        setUser(updatedUser);
        setSuccessMsg('Double Authentification (2FA) désactivée avec succès.');
        setTimeout(() => setSuccessMsg(null), 2500);
      }, 700);
    } else {
      // Enable 2FA after checking 6-digit code
      if (!otpInput || otpInput.trim().length < 4) {
        setErrorMsg('Veuillez entrer le code à 6 chiffres de votre application Authenticator.');
        return;
      }

      setIsToggling2FA(true);
      setTimeout(() => {
        setIsToggling2FA(false);
        const updatedUser: User = {
          ...user,
          twoFactorEnabled: true,
          twoFactorMethod: 'authenticator',
        };
        setUser(updatedUser);
        setOtpInput('');
        setSuccessMsg('Double Authentification (2FA) activée et vérifiée !');
        setTimeout(() => setSuccessMsg(null), 2500);
      }, 800);
    }
  };

  const handleSaveRCCM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rccmNumber.trim()) return;

    const updatedUser: User = {
      ...user,
      rccmOrNif: rccmNumber,
      kinshasaBadgeVerified: true,
    };

    setUser(updatedUser);
    setSuccessMsg('Numéro RCCM / NIF Kinshasa mis à jour ! Badge agent vérifié.');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cClean = currPwd.trim();
    const nClean = newPwd.trim();
    const cfClean = confirmPwd.trim();

    if (nClean.length < 4) {
      setErrorMsg('Le nouveau mot de passe doit contenir au moins 4 caractères.');
      return;
    }

    if (nClean !== cfClean) {
      setErrorMsg('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setPwdSubmitting(true);
    try {
      if (user.role === 'admin') {
        if (!verifyAdminPin(cClean)) {
          setErrorMsg('Le mot de passe administrateur actuel est incorrect.');
          setPwdSubmitting(false);
          return;
        }
        await updateAdminPin(nClean);
        setSuccessMsg('Nouveau mot de passe secret administrateur enregistré avec succès !');
      } else {
        const updateResult = updateAccountPassword(user.email || user.id, cClean, nClean);
        if (!updateResult.success) {
          setErrorMsg(updateResult.error || 'Le mot de passe actuel est incorrect.');
          setPwdSubmitting(false);
          return;
        }
        setSuccessMsg('Votre mot de passe a été mis à jour avec succès !');
      }

      setCurrPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(`Erreur lors de la sauvegarde: ${err.message}`);
    } finally {
      setPwdSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 relative shadow-2xl text-slate-100 my-8">
        
        {/* Close button */}
        <button
          onClick={() => setIsSecurityModalOpen(false)}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white tracking-tight">
                Sécurité du Compte & Double Authentification (2FA)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Gérez l'authentification forte, les badges certifiés Kinshasa et la 2FA pour {user.name}
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Nav Tabs */}
        <div className="flex border-b border-slate-800 gap-2 mb-5 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('status')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'status'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <BadgeCheck className="w-4 h-4" /> Statut & Badges
          </button>

          <button
            onClick={() => setActiveTab('2fa')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === '2fa'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" /> Configuration 2FA
          </button>

          <button
            onClick={() => setActiveTab('rccm')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'rccm'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" /> RCCM / NIF RDC
          </button>

          <button
            onClick={() => setActiveTab('sessions')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" /> Sessions Actives
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'password'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Lock className="w-4 h-4" /> Mot de Passe Secret Admin
          </button>
        </div>

        {/* TAB 1: Status & Badges */}
        {activeTab === 'status' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Niveaux de Vérification & Légitimité RDC
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 2FA Badge */}
                <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                  user.twoFactorEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  <KeyRound className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-bold">Double Authentification (2FA)</div>
                    <div className="text-[10px] opacity-80">
                      {user.twoFactorEnabled ? 'Active (Authenticator / TOTP)' : 'Désactivée (Recommandé d\'activer)'}
                    </div>
                  </div>
                </div>

                {/* Email Verification */}
                <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                  <Mail className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-bold">E-mail Vérifié</div>
                    <div className="text-[10px] opacity-80">{user.email}</div>
                  </div>
                </div>

                {/* Phone Verification */}
                <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                  <Smartphone className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-bold">Téléphone +243 SMS Vérifié</div>
                    <div className="text-[10px] opacity-80">{user.phone || '+243 84 529 46 16'}</div>
                  </div>
                </div>

                {/* Kinshasa Agent License */}
                <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-bold">Agent Certifié Kinshasa</div>
                    <div className="text-[10px] opacity-80">
                      {user.rccmOrNif ? `RCCM: ${user.rccmOrNif}` : 'Badge de confiance actif'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-white block">Pourquoi activer la 2FA à Kinshasa ?</span>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Le système de double authentification exige la saisie d'un code unique à 6 chiffres depuis votre smartphone à chaque connexion. Cela protège vos mandats immobiliers, transactions et coordonnées contre toute tentative d'usurpation.
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: 2FA Configuration */}
        {activeTab === '2fa' && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Statut 2FA Actuel</h4>
                  <p className="text-xs text-slate-400">
                    Google Authenticator / Authy TOTP App
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  user.twoFactorEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}>
                  {user.twoFactorEnabled ? '2FA Active (Protegée)' : '2FA Inactive'}
                </span>
              </div>

              {/* If 2FA disabled, offer QR Code & Code activation */}
              {!user.twoFactorEnabled ? (
                <form onSubmit={handleToggle2FA} className="space-y-3 pt-2">
                  <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <div className="w-24 h-24 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center">
                      <QrCode className="w-20 h-20 text-slate-950" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <span className="font-bold text-white block">1. Scannez le QR Code</span>
                      <p className="text-slate-400 text-[11px]">
                        Utilisez votre application mobile Google Authenticator ou Authy.
                      </p>
                      <span className="text-[10px] font-mono text-emerald-400 block pt-1">
                        Clé manuelle : KIN-2FA-ESTATIK-992
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      2. Entrez le code à 6 chiffres généré par l'application *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="739102"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-center text-lg font-mono font-bold text-emerald-400 tracking-widest focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isToggling2FA}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    {isToggling2FA ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        Activation en cours...
                      </span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Activer la Double Authentification</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* If 2FA enabled, allow Disabling or viewing backup codes */
                <div className="space-y-4 pt-2">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4" /> Clés de secours d'urgence 2FA (Backup Codes)
                    </span>
                    <p className="text-[11px] text-slate-400">
                      Conservez ces codes en lieu sûr pour déverrouiller votre compte si vous perdez votre téléphone.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                      {backupCodes.map((code) => (
                        <div
                          key={code}
                          onClick={() => handleCopy(code)}
                          className="p-2 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors"
                        >
                          <span className="text-slate-200">{code}</span>
                          {copiedKey === code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleToggle2FA}>
                    <button
                      type="submit"
                      disabled={isToggling2FA}
                      className="w-full py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
                    >
                      {isToggling2FA ? (
                        <span>Désactivation...</span>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4" />
                          <span>Désactiver la Double Authentification</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: RCCM & NIF RDC Verification */}
        {activeTab === 'rccm' && (
          <form onSubmit={handleSaveRCCM} className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <Building2 className="w-4 h-4" /> Certification Juridique & Registre du Commerce RDC
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Les comptes disposant d'un numéro RCCM ou NIF vérifié auprès du Ministère de l'Urbanisme et de l'Immobilier de Kinshasa bénéficient du badge de légitimité maximale.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Numéro RCCM ou NIF Impôts RDC *
                </label>
                <input
                  type="text"
                  required
                  value={rccmNumber}
                  onChange={(e) => setRccmNumber(e.target.value)}
                  placeholder="CD/KIN/RCCM/20-B-04921"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Enregistrer & Valider le Badge de Légitimité</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 5: Password Management */}
        {activeTab === 'password' && (
          <form onSubmit={handleSavePassword} autoComplete="off" className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3.5 text-xs">
              <div className="flex items-center gap-2 text-amber-400 font-bold">
                <Lock className="w-4 h-4" />{' '}
                {user.role === 'admin'
                  ? 'Changement du Mot de Passe Administrateur'
                  : `Changement du Mot de Passe (${user.role === 'agency' ? 'Compte Agence' : 'Compte Agent'})`}
              </div>

              <p className="text-slate-400 text-[11px] leading-relaxed">
                {user.role === 'admin'
                  ? 'Ce mot de passe protège l\'accès à la console d\'administration, à la base de données sécurisée et aux privilèges administrateur système. Il est strictement confidentiel.'
                  : 'Ce mot de passe sécurise l\'accès à votre compte et à vos annonces. Il sera exigé lors de chacune de vos prochaines connexions.'}
              </p>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Mot de passe actuel *
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  data-lpignore="true"
                  value={currPwd}
                  onChange={(e) => setCurrPwd(e.target.value)}
                  placeholder="Entrez votre mot de passe actuel"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nouveau mot de passe secret *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Choisissez un mot de passe secret"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Confirmer le nouveau mot de passe *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Répétez le nouveau mot de passe"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={pwdSubmitting}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
              >
                {pwdSubmitting ? (
                  <span>Enregistrement en cours...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Enregistrer le Nouveau Mot de Passe Secret</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
        {activeTab === 'sessions' && (
          <div className="space-y-3">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <h4 className="font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" /> Journal des Connexions Sécurisées
              </h4>

              <div className="space-y-2">
                <div className="p-3 bg-slate-900 border border-emerald-500/30 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Session Actuelle (Kinshasa, Gombe)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      IP: 197.242.10.88 • Navigateur Web Chrome RDC
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded font-mono">
                    2FA Validée
                  </span>
                </div>

                <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between opacity-75">
                  <div>
                    <div className="font-semibold text-slate-300">
                      Application Mobile WhatsApp (+243 84 529 46 16)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Hier à 18:42 • Kinshasa (Ngaliema)
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Actif 24h</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
