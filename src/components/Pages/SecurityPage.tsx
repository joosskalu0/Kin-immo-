import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  Smartphone,
  Mail,
  CheckCircle2,
  KeyRound,
  Lock,
  Building2,
  RefreshCw,
  BadgeCheck,
  Globe,
  ExternalLink,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { EmptyState, ErrorState, PageHeaderBar } from '../StateFeedback';
import { goBackOrFallback } from '../../utils/navigation';
import { mysqlApi } from '../../services/mysqlApi';
import {
  isValidEmailAddress,
  normalizeEmailAddress,
  validatePasswordPolicy,
} from '../../utils/authValidation';

interface SecurityPageProps {
  onNavigatePath: (path: string) => void;
}

interface SessionItem {
  id: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export const SecurityPage: React.FC<SecurityPageProps> = ({ onNavigatePath }) => {
  const { user, setUser } = useApp();

  const [activeTab, setActiveTab] = useState<'status' | 'email' | 'password' | 'sessions' | 'rccm'>('status');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mot de passe
  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // E-mail (ajout ou changement avec nouvelle confirmation)
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailChangePwd, setEmailChangePwd] = useState('');
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [verificationPreviewUrl, setVerificationPreviewUrl] = useState<string | null>(null);

  // Sessions réelles
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // RCCM / NIF
  const [rccmNumber, setRccmNumber] = useState(user?.rccmOrNif || '');
  const [rccmSubmitting, setRccmSubmitting] = useState(false);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await mysqlApi.getSessions();
      if (res.success && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
      }
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    if (user && activeTab === 'sessions') {
      loadSessions();
    }
  }, [user, activeTab]);

  if (!user) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PageHeaderBar
          title="Sécurité du compte"
          fallbackPath="/compte"
          onBack={() => goBackOrFallback('/compte', onNavigatePath)}
        />
        <EmptyState
          icon={Lock}
          title="Connectez-vous pour gérer la sécurité"
          description="Modifiez votre mot de passe, confirmez ou changez votre adresse e-mail et gérez vos appareils connectés."
          actionLabel="Se connecter"
          onAction={() => onNavigatePath('/connexion?next=/compte/securite')}
        />
      </div>
    );
  }

  const passwordPolicy = validatePasswordPolicy(newPwd, {
    email: user.email,
    name: user.name,
    phone: user.phone,
  });

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currPwd) {
      setErrorMsg('Saisissez votre mot de passe actuel.');
      return;
    }
    if (!passwordPolicy.valid) {
      setErrorMsg(passwordPolicy.error || 'Le nouveau mot de passe ne respecte pas les règles de sécurité.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setErrorMsg('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setPwdSubmitting(true);
    try {
      const res = await mysqlApi.changePassword(currPwd, newPwd);
      if (!res.success) {
        setErrorMsg(res.message || 'Impossible de modifier le mot de passe.');
        return;
      }
      setSuccessMsg(res.message || 'Mot de passe mis à jour avec succès.');
      setCurrPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur réseau lors de la modification.');
    } finally {
      setPwdSubmitting(false);
    }
  };

  const handleRequestEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setVerificationPreviewUrl(null);

    const cleanNew = normalizeEmailAddress(newEmailInput);
    if (!isValidEmailAddress(cleanNew)) {
      setErrorMsg("L'adresse e-mail saisie n'est pas valide.");
      return;
    }
    if (!emailChangePwd) {
      setErrorMsg('Saisissez votre mot de passe actuel pour confirmer ce changement.');
      return;
    }

    setEmailSubmitting(true);
    try {
      const res = await mysqlApi.requestEmailChange(emailChangePwd, cleanNew);
      if (!res.success) {
        setErrorMsg(res.message || "Impossible d'envoyer le lien de confirmation.");
        return;
      }
      if (res.user) setUser(res.user);
      if (res.verificationPreviewUrl) setVerificationPreviewUrl(res.verificationPreviewUrl);
      setSuccessMsg(res.message || `Un lien de confirmation vient d'être envoyé à ${cleanNew}.`);
      setEmailChangePwd('');
    } catch (err: any) {
      setErrorMsg(err?.message || "Erreur lors de la demande de changement d'e-mail.");
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setVerificationPreviewUrl(null);
    setEmailSubmitting(true);
    try {
      const res = await mysqlApi.resendVerification(user.pendingEmail || user.email || undefined);
      if (!res.success) {
        setErrorMsg(res.message || 'Impossible de renvoyer le lien.');
        return;
      }
      if (res.verificationPreviewUrl) setVerificationPreviewUrl(res.verificationPreviewUrl);
      setSuccessMsg(res.message || 'Lien de confirmation renvoyé.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors du renvoi.');
    } finally {
      setEmailSubmitting(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    setErrorMsg(null);
    try {
      const res = await mysqlApi.revokeSession(sessionId);
      if (res.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        setSuccessMsg('Appareil déconnecté avec succès.');
      } else {
        setErrorMsg(res.message || 'Impossible de fermer cette session.');
      }
    } finally {
      setRevokingId(null);
    }
  };

  const handleSaveRCCM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rccmNumber.trim()) return;
    setRccmSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await mysqlApi.updateProfile({ rccmOrNif: rccmNumber.trim() });
      if (res.success && (res.user || res.data?.user)) {
        setUser(res.user || res.data?.user);
        setSuccessMsg('Numéro RCCM / NIF enregistré.');
      } else {
        setErrorMsg(res.message || 'Impossible de sauvegarder le RCCM / NIF.');
      }
    } finally {
      setRccmSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto">
      <PageHeaderBar
        title="Sécurité & mot de passe"
        subtitle={user.name}
        fallbackPath="/compte"
        onBack={() => goBackOrFallback('/compte', onNavigatePath)}
      />

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <ErrorState
          title="Modification impossible"
          message={errorMsg}
          nextStepHint="Vérifiez votre saisie puis validez à nouveau."
        />
      )}

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto px-3 pt-2 text-xs font-bold">
          {[
            { id: 'status', label: 'Statut', icon: BadgeCheck },
            { id: 'email', label: 'E-mail', icon: Mail },
            { id: 'password', label: 'Mot de passe', icon: Lock },
            { id: 'sessions', label: 'Sessions', icon: Globe },
            { id: 'rccm', label: 'RCCM / NIF', icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`min-h-[42px] px-3 border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                  active
                    ? 'border-[#1D4ED8] text-[#1D4ED8]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    user.email && user.emailVerified
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <Mail className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      {!user.email
                        ? 'E-mail facultatif non renseigné'
                        : user.emailVerified
                        ? 'E-mail confirmé'
                        : 'E-mail en attente (facultatif)'}
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">
                      {user.email || 'Optionnel : utile pour réinitialiser le mot de passe'}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-blue-50 border-blue-200 text-slate-900 flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                  <div>
                    <div className="font-bold">Téléphone +243</div>
                    <div className="text-[11px] text-slate-600 font-mono">{user.phone || 'Non renseigné'}</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-blue-50 border-blue-200 text-slate-900 flex items-center gap-3">
                  <KeyRound className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                  <div>
                    <div className="font-bold">Session sécurisée</div>
                    <div className="text-[11px] text-slate-600">Cookies HttpOnly + protection CSRF</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-blue-50 border-blue-200 text-slate-900 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#1D4ED8] shrink-0" />
                  <div>
                    <div className="font-bold">Conditions d'utilisation</div>
                    <div className="text-[11px] text-slate-600">
                      Version {user.termsAcceptedVersion || '2026.1'} acceptée
                    </div>
                  </div>
                </div>
              </div>

              {(!user.email || !user.emailVerified) && (
                <button
                  type="button"
                  onClick={() => setActiveTab('email')}
                  className="w-full min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs cursor-pointer transition-colors"
                >
                  {!user.email
                    ? 'Ajouter un e-mail (facultatif — récupération de compte)'
                    : 'Confirmer mon adresse e-mail (facultatif)'}
                </button>
              )}
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-700">Adresse e-mail actuelle :</span>
                  <span className="font-bold text-slate-900">{user.email || 'Aucune'}</span>
                </div>
                {user.email && !user.emailVerified && (
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-200">
                    <span className="text-slate-700 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0" />
                      Non confirmée (vous pouvez publier normalement ; confirmez pour sécuriser la récupération).
                    </span>
                    <button
                      type="button"
                      disabled={emailSubmitting}
                      onClick={handleResendVerification}
                      className="px-3 py-1.5 rounded-lg bg-[#1D4ED8] text-white font-bold text-[11px] cursor-pointer shrink-0"
                    >
                      Renvoyer le lien
                    </button>
                  </div>
                )}
                {user.pendingEmail && (
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-200 text-blue-800">
                    <span>
                      Nouvelle adresse en attente de confirmation : <strong>{user.pendingEmail}</strong>
                    </span>
                    <button
                      type="button"
                      disabled={emailSubmitting}
                      onClick={handleResendVerification}
                      className="px-3 py-1.5 rounded-lg bg-blue-100 text-[#1D4ED8] font-bold text-[11px] cursor-pointer shrink-0"
                    >
                      Renvoyer
                    </button>
                  </div>
                )}
              </div>

              {verificationPreviewUrl && (
                <a
                  href={verificationPreviewUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    try {
                      const u = new URL(verificationPreviewUrl);
                      onNavigatePath(`${u.pathname}${u.search}`);
                    } catch {
                      window.location.href = verificationPreviewUrl;
                    }
                  }}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ouvrir le lien de confirmation (aperçu test)</span>
                </a>
              )}

              <form onSubmit={handleRequestEmailChange} className="space-y-3 pt-2 border-t border-slate-100">
                <h3 className="text-xs font-extrabold text-slate-900">
                  {user.email ? "Changer d'adresse e-mail" : 'Ajouter une adresse e-mail'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Un nouveau lien de confirmation sera envoyé à cette adresse. Votre adresse actuelle reste active jusqu'à validation.
                </p>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nouvelle adresse e-mail *</label>
                  <input
                    type="email"
                    required
                    value={newEmailInput}
                    onChange={(e) => setNewEmailInput(e.target.value)}
                    placeholder="nouveau@exemple.cd"
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe actuel *</label>
                  <input
                    type="password"
                    required
                    value={emailChangePwd}
                    onChange={(e) => setEmailChangePwd(e.target.value)}
                    placeholder="Confirmez votre mot de passe"
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={emailSubmitting}
                  className="w-full min-h-[46px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {emailSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>Envoyer le lien de confirmation</span>
                </button>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handleSavePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mot de passe actuel *</label>
                <input
                  type="password"
                  required
                  value={currPwd}
                  onChange={(e) => setCurrPwd(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nouveau mot de passe * (min. 10 caractères)
                </label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm"
                />
                {newPwd && (
                  <p className={`mt-1 text-[11px] font-semibold ${passwordPolicy.valid ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {passwordPolicy.error || passwordPolicy.label}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirmer le nouveau mot de passe *</label>
                <input
                  type="password"
                  required
                  minLength={10}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={pwdSubmitting}
                className="w-full min-h-[46px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2"
              >
                {pwdSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>Mettre à jour le mot de passe</span>
              </button>
            </form>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">Appareils connectés</span>
                <button
                  type="button"
                  onClick={loadSessions}
                  className="text-[#1D4ED8] font-bold hover:underline cursor-pointer"
                >
                  Actualiser
                </button>
              </div>

              {sessionsLoading ? (
                <div className="py-6 text-center text-slate-500">Chargement des sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#1D4ED8]">Session actuelle</div>
                    <div className="text-slate-600">Navigateur Web actif</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-white text-[#1D4ED8] font-bold">Active</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        s.isCurrent ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="font-bold text-slate-900 truncate">{s.userAgent}</div>
                        <div className="text-[11px] text-slate-500">
                          IP : {s.ip} · Activité : {new Date(s.lastActiveAt).toLocaleString('fr-FR')}
                        </div>
                      </div>
                      {s.isCurrent ? (
                        <span className="px-2.5 py-1 rounded-lg bg-white text-[#1D4ED8] font-bold shrink-0">
                          Actuelle
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={revokingId === s.id}
                          onClick={() => handleRevokeSession(s.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Déconnecter</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'rccm' && (
            <form onSubmit={handleSaveRCCM} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Numéro RCCM ou NIF RDC *</label>
              <input
                type="text"
                required
                value={rccmNumber}
                onChange={(e) => setRccmNumber(e.target.value)}
                placeholder="CD/KIN/RCCM/20-B-04921"
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm font-mono"
              />
              <button
                type="submit"
                disabled={rccmSubmitting}
                className="w-full min-h-[46px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-xs cursor-pointer"
              >
                {rccmSubmitting ? 'Enregistrement...' : 'Enregistrer le RCCM / NIF'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
