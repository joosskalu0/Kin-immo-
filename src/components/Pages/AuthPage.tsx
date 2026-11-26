import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Mail,
  Lock,
  Phone,
  Building,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  KeyRound,
  UserCheck,
  Building2,
  Home,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  X,
} from 'lucide-react';
import { User, Agency, Agent } from '../../types';
import { mysqlApi } from '../../services/mysqlApi';
import { formatAuthErrorMessage } from '../AuthModal';
import { ErrorState, PageHeaderBar } from '../StateFeedback';
import { AuthPageView, goBackOrFallback } from '../../utils/navigation';
import {
  ACCOUNT_ROLE_OPTIONS,
  TERMS_VERSION,
  isValidEmailAddress,
  normalizeEmailAddress,
  normalizePhoneRdc,
  validatePasswordPolicy,
} from '../../utils/authValidation';

interface AuthPageProps {
  authView?: AuthPageView;
  authToken?: string | null;
  onNavigatePath: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  authView = 'login',
  authToken = null,
  onNavigatePath,
}) => {
  const {
    user,
    setUser,
    addAgency,
    addAgent,
    invitedRole,
    invitedBy,
    clearInvite,
  } = useApp();

  const nextRedirect = React.useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');
    return next && next.startsWith('/') ? next : null;
  }, []);

  const [view, setView] = useState<AuthPageView>(authView);
  const [step, setStep] = useState<'form' | 'verify_email_pending'>('form');

  // Login & Forgot Password identifier (e-mail ou téléphone +243)
  const [identifier, setIdentifier] = useState('');

  // Registration fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+243 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'owner' | 'agent' | 'agency'>('user');
  const [agencyName, setAgencyName] = useState('');
  const [agencyCommune, setAgencyCommune] = useState('Gombe');
  const [rccmOrNif, setRccmOrNif] = useState('');
  // M25.2 : case à cocher impérativement non pré-cochée
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Verification / Reset feedback state
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string>('');
  const [previewActionUrl, setPreviewActionUrl] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [resendEmailInput, setResendEmailInput] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setView(authView);
    setStep('form');
    setError(null);
    setSuccessMessage(null);
    setPreviewActionUrl(null);
    if (authView !== 'verify_email') {
      setVerifyStatus('idle');
      setVerifyMessage(null);
    }
  }, [authView, authToken]);

  useEffect(() => {
    if (invitedRole) {
      setView('register');
      if (invitedRole === 'agent' || invitedRole === 'agency') {
        setRole(invitedRole);
      }
      if (invitedBy && !agencyName) {
        setAgencyName(invitedBy);
      }
    }
  }, [invitedRole, invitedBy, agencyName]);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  // Exécuter automatiquement la vérification d'e-mail lorsque /confirmer-email?token=... est visité
  useEffect(() => {
    if (view !== 'verify_email' || !authToken) return;
    let active = true;
    setVerifyStatus('loading');
    setVerifyMessage('Vérification de votre lien de confirmation en cours...');
    mysqlApi
      .verifyEmail(authToken)
      .then((res) => {
        if (!active) return;
        const verifiedUser = res.user || res.data?.user;
        if (res.success && verifiedUser) {
          setUser(verifiedUser);
          setVerifyStatus('success');
          setVerifyMessage(
            res.message || 'Votre adresse e-mail est confirmée. Vous pouvez désormais publier des annonces.'
          );
        } else {
          setVerifyStatus('error');
          setVerifyMessage(res.message || 'Ce lien de confirmation est invalide ou a expiré.');
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setVerifyStatus('error');
        setVerifyMessage(err?.message || 'Impossible de vérifier ce lien.');
      });
    return () => {
      active = false;
    };
  }, [view, authToken, setUser]);

  const navigateAfterAuth = (authedUser: User) => {
    if (nextRedirect) {
      onNavigatePath(nextRedirect);
      return;
    }
    if (authedUser.role === 'agent' || authedUser.role === 'agency') {
      onNavigatePath('/pro');
    } else if (authedUser.role === 'admin') {
      onNavigatePath('/admin');
    } else {
      onNavigatePath('/compte');
    }
  };

  const passwordPolicy = React.useMemo(
    () =>
      validatePasswordPolicy(password, {
        email: email.trim(),
        name: name.trim(),
        phone: phone.trim(),
      }),
    [password, email, name, phone]
  );

  // Si déjà connecté et qu'on visite /connexion ou /inscription (hors attente de confirmation)
  if (user && (view === 'login' || view === 'register') && step !== 'verify_email_pending' && !successMessage) {
    return (
      <div className="space-y-4 max-w-md mx-auto">
        <PageHeaderBar
          title="Déjà connecté"
          fallbackPath="/compte"
          onBack={() => goBackOrFallback('/compte', onNavigatePath)}
        />
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900">Bonjour {user.name}</h2>
            <p className="text-sm text-slate-600">Vous êtes déjà connecté sur Kinimmo.</p>
          </div>
          <button
            type="button"
            onClick={() => navigateAfterAuth(user)}
            className="w-full min-h-[46px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-sm cursor-pointer transition-colors"
          >
            {user.role === 'agent' || user.role === 'agency' ? 'Aller à mon Espace pro' : 'Ouvrir mon compte'}
          </button>
        </div>
      </div>
    );
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Veuillez saisir votre adresse e-mail ou votre numéro +243.');
      return;
    }
    if (!password) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await mysqlApi.login({
        identifier: cleanIdentifier,
        password,
      });

      const loggedUser = (res.user || res.data?.user) as User | undefined;
      if (!res.success || !loggedUser) {
        setIsLoading(false);
        setError(res.message || 'Identifiant ou mot de passe incorrect.');
        return;
      }

      setUser(loggedUser);
      setIsLoading(false);
      setSuccessMessage(`Connexion réussie. Bienvenue ${loggedUser.name} !`);
      setTimeout(() => {
        navigateAfterAuth(loggedUser);
      }, 450);
    } catch (err: any) {
      setIsLoading(false);
      setError(formatAuthErrorMessage(err, 'login'));
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setError('Veuillez saisir votre nom complet (au moins 2 caractères).');
      return;
    }

    const cleanEmail = email ? normalizeEmailAddress(email) : '';
    if (cleanEmail && !isValidEmailAddress(cleanEmail)) {
      setError("L'adresse e-mail saisie n'est pas valide.");
      return;
    }

    const rawPhone = phone.trim();
    let normalizedPhone = '';
    if (rawPhone && rawPhone !== '+243') {
      const phoneCheck = normalizePhoneRdc(rawPhone);
      if (!phoneCheck.valid) {
        setError(phoneCheck.error || 'Numéro +243 invalide.');
        return;
      }
      normalizedPhone = phoneCheck.normalized;
    }

    if (!cleanEmail && !normalizedPhone) {
      setError('Renseignez au moins une adresse e-mail ou un numéro de téléphone (+243).');
      return;
    }

    if (role === 'agency' && !agencyName.trim()) {
      setError("Veuillez saisir le nom de votre agence immobilière.");
      return;
    }

    const pwdCheck = validatePasswordPolicy(password, {
      email: cleanEmail,
      name: cleanName,
      phone: normalizedPhone,
    });
    if (!pwdCheck.valid) {
      setError(pwdCheck.error || 'Mot de passe non conforme.');
      return;
    }

    if (!termsAccepted) {
      setError("Vous devez cocher l'acceptation des conditions d'utilisation pour créer votre compte.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await mysqlApi.register({
        name: cleanName,
        email: cleanEmail || undefined,
        password,
        phone: normalizedPhone || undefined,
        role,
        agencyName: role === 'agency' || role === 'agent' ? agencyName.trim() || undefined : undefined,
        rccmOrNif: role === 'agency' && rccmOrNif.trim() ? rccmOrNif.trim() : undefined,
        termsAccepted: true,
        termsVersion: TERMS_VERSION,
      });

      const createdUser = (res.user || res.data?.user) as User | undefined;
      if (!res.success || !createdUser) {
        setIsLoading(false);
        setError(res.message || "Impossible de créer votre compte. Vérifiez vos informations.");
        return;
      }

      if (createdUser.role === 'agency') {
        const newAgency: Agency = {
          id: createdUser.agencyId || createdUser.id,
          name: createdUser.agencyName || agencyName.trim() || 'Agence Kinimmo',
          logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80',
          address: `${agencyCommune}, Kinshasa`,
          city: 'Kinshasa',
          commune: agencyCommune,
          phone: createdUser.phone || normalizedPhone || '',
          whatsapp: createdUser.whatsapp || normalizedPhone || '',
          email: createdUser.email || '',
          website: '',
          managerName: createdUser.name,
          rccm: createdUser.rccmOrNif || undefined,
          agentsCount: 1,
          description: `Agence immobilière à Kinshasa (${agencyCommune}).`,
          specialties: ['Résidentiel', 'Location', 'Vente'],
          isVerified: false,
          verificationStatus: 'pending',
          subscriptionStatus: 'Active',
          planId: 'agency',
          createdAt: createdUser.createdAt || new Date().toISOString(),
        };
        addAgency(newAgency);
      } else if (createdUser.role === 'agent') {
        const newAgent: Agent = {
          id: createdUser.agentId || createdUser.id,
          name: createdUser.name,
          title: 'Agent Immobilier',
          email: createdUser.email || '',
          phone: createdUser.phone || normalizedPhone || '',
          whatsapp: createdUser.whatsapp || normalizedPhone || '',
          avatar: createdUser.avatar,
          agencyName: createdUser.agencyName || 'Indépendant Kinimmo',
          rating: 5,
          reviewCount: 0,
          listingsCount: 0,
          bio: 'Conseiller immobilier à Kinshasa.',
          specialties: ['Résidentiel', 'Commercial'],
          languages: ['Français', 'Lingala'],
          isVerified: false,
          verificationStatus: 'pending',
        };
        addAgent(newAgent);
      }

      setUser(createdUser);
      setIsLoading(false);

      if (cleanEmail) {
        setPendingVerifyEmail(cleanEmail);
        setPreviewActionUrl(res.verificationPreviewUrl || null);
        setStep('verify_email_pending');
      } else {
        setSuccessMessage('Compte créé avec succès ! Vous pouvez rechercher, contacter et publier dès maintenant.');
        setTimeout(() => {
          navigateAfterAuth(createdUser);
        }, 700);
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(formatAuthErrorMessage(err, 'register'));
    }
  };

  const handleResendVerification = async (targetEmail?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await mysqlApi.resendVerification(targetEmail || pendingVerifyEmail || undefined);
      setIsLoading(false);
      if (res.success) {
        setSuccessMessage(res.message || 'Un nouveau lien de confirmation vient d’être envoyé.');
        if (res.verificationPreviewUrl) {
          setPreviewActionUrl(res.verificationPreviewUrl);
        }
        if (res.user) {
          setUser(res.user);
        }
      } else {
        setError(res.message || 'Impossible de renvoyer le lien.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Erreur réseau lors du renvoi.');
    }
  };

  const handleCheckEmailConfirmed = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await mysqlApi.getMe();
      const liveUser = (res.user || res.data?.user) as User | undefined;
      setIsLoading(false);
      if (res.success && liveUser) {
        setUser(liveUser);
        if (liveUser.emailVerified) {
          setSuccessMessage('E-mail confirmé ! Votre compte est prêt pour publier.');
          setTimeout(() => navigateAfterAuth(liveUser), 500);
        } else {
          setError("Votre adresse e-mail n'est pas encore confirmée. Cliquez d'abord sur le lien reçu.");
        }
      } else {
        setError('Impossible de vérifier votre session pour le moment.');
      }
    } catch {
      setIsLoading(false);
      setError('Connexion au serveur impossible.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    setSuccessMessage(null);
    setPreviewActionUrl(null);

    if (!identifier.trim()) {
      setError('Saisissez votre adresse e-mail ou votre numéro +243.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await mysqlApi.forgotPassword(identifier.trim());
      setIsLoading(false);
      if (res.success) {
        setSuccessMessage(
          res.message ||
            'Si un compte avec une adresse e-mail associée existe, un lien à usage unique valable 1 heure vient d’être envoyé.'
        );
        if (res.resetPreviewUrl) {
          setPreviewActionUrl(res.resetPreviewUrl);
        }
      } else {
        setError(res.message || 'Erreur lors de l’envoi du lien.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Impossible de contacter le serveur.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    if (!authToken) {
      setError('Lien de réinitialisation manquant ou invalide. Demandez un nouveau lien.');
      return;
    }

    const check = validatePasswordPolicy(password);
    if (!check.valid) {
      setError(check.error || 'Mot de passe non conforme.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await mysqlApi.resetPassword(authToken, password);
      setIsLoading(false);
      if (!res.success) {
        setError(res.message || 'Ce lien est invalide ou a expiré (validité 1 heure).');
        return;
      }
      setUser(null);
      setPassword('');
      setConfirmPassword('');
      setSuccessMessage(
        res.message || 'Mot de passe réinitialisé avec succès. Connectez-vous avec votre nouveau mot de passe.'
      );
      setTimeout(() => onNavigatePath('/connexion'), 1200);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Erreur lors de la réinitialisation.');
    }
  };

  const roleIcons: Record<'user' | 'owner' | 'agent' | 'agency', any> = {
    user: UserCheck,
    owner: Home,
    agent: Building,
    agency: Building2,
  };

  const pageTitle =
    view === 'register'
      ? 'Créer un compte'
      : view === 'verify_email'
      ? "Confirmation d'e-mail"
      : view === 'forgot_password'
      ? 'Mot de passe oublié'
      : view === 'reset_password'
      ? 'Nouveau mot de passe'
      : 'Connexion';

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <PageHeaderBar
        title={pageTitle}
        subtitle="Compte sécurisé Kinimmo"
        fallbackPath="/"
        onBack={() => goBackOrFallback('/', onNavigatePath)}
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm font-bold flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div ref={errorRef}>
            <ErrorState
              title="Action impossible"
              message={error}
              nextStepHint="Vérifiez votre saisie ou utilisez l'option proposée ci-dessous."
            />
          </div>
        )}

        {invitedRole && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#1D4ED8]">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span className="font-bold">
                Invitation reçue {invitedBy ? `de ${invitedBy}` : ''} ({invitedRole === 'agency' ? 'Agence' : 'Agent'})
              </span>
            </div>
            <button type="button" onClick={clearInvite} className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ÉCRAN POST-INSCRIPTION : CONFIRMATION E-MAIL */}
        {step === 'verify_email_pending' && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-base font-extrabold text-slate-900">Confirmez votre adresse e-mail</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Un lien de confirmation a été envoyé à <strong className="text-slate-900">{pendingVerifyEmail}</strong>.
                Vous pouvez déjà rechercher, contacter et publier des annonces ; confirmer votre e-mail vous permet aussi de réinitialiser votre mot de passe si besoin.
              </p>
            </div>

            {previewActionUrl && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                <p className="text-[11px] font-bold text-amber-900">
                  Mode aperçu (messagerie SMTP non configurée) — cliquez pour confirmer :
                </p>
                <a
                  href={previewActionUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    try {
                      const u = new URL(previewActionUrl);
                      onNavigatePath(`${u.pathname}${u.search}`);
                    } catch {
                      window.location.href = previewActionUrl;
                    }
                  }}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Confirmer mon e-mail maintenant</span>
                </a>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleCheckEmailConfirmed}
                className="w-full min-h-[46px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>J'ai confirmé mon e-mail</span>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleResendVerification(pendingVerifyEmail)}
                className="w-full min-h-[42px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
              >
                Renvoyer le lien de confirmation
              </button>

              <button
                type="button"
                onClick={() => navigateAfterAuth(user || undefined)}
                className="w-full min-h-[40px] rounded-xl text-[#1D4ED8] hover:underline font-bold text-xs cursor-pointer"
              >
                Continuer maintenant
              </button>
            </div>
          </div>
        )}

        {/* PAGE /confirmer-email */}
        {step === 'form' && view === 'verify_email' && (
          <div className="space-y-4">
            {verifyStatus === 'loading' && (
              <div className="py-6 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#1D4ED8] animate-spin mx-auto" />
                <p className="text-sm font-bold text-slate-800">{verifyMessage}</p>
              </div>
            )}

            {verifyStatus === 'success' && (
              <div className="space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-extrabold text-slate-900">Adresse e-mail confirmée</h2>
                  <p className="text-xs sm:text-sm text-slate-600">{verifyMessage}</p>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onNavigatePath('/publier')}
                    className="w-full min-h-[46px] rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-sm cursor-pointer"
                  >
                    Publier une annonce
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigatePath('/compte')}
                    className="w-full min-h-[42px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                  >
                    Aller à mon compte
                  </button>
                </div>
              </div>
            )}

            {(verifyStatus === 'error' || verifyStatus === 'idle') && (
              <div className="space-y-4">
                {verifyStatus === 'error' && verifyMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{verifyMessage}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    {user && !user.email
                      ? 'Associer et confirmer une adresse e-mail'
                      : 'Renvoyer un lien de confirmation'}
                  </label>
                  <input
                    type="email"
                    value={resendEmailInput}
                    onChange={(e) => setResendEmailInput(e.target.value)}
                    placeholder={user?.email || 'nom@exemple.cd'}
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                  />
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleResendVerification(resendEmailInput.trim() || user?.email)}
                    className="w-full min-h-[46px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-sm cursor-pointer"
                  >
                    {isLoading ? 'Envoi...' : 'Envoyer le lien de confirmation'}
                  </button>
                </div>

                {previewActionUrl && (
                  <a
                    href={previewActionUrl}
                    onClick={(e) => {
                      e.preventDefault();
                      try {
                        const u = new URL(previewActionUrl);
                        onNavigatePath(`${u.pathname}${u.search}`);
                      } catch {
                        window.location.href = previewActionUrl;
                      }
                    }}
                    className="w-full min-h-[42px] px-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Ouvrir le lien de confirmation (test)</span>
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* PAGE /mot-de-passe-oublie */}
        {step === 'form' && view === 'forgot_password' && (
          <form onSubmit={handleForgotSubmit} className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Indiquez votre adresse e-mail ou votre numéro +243. Si une adresse e-mail est associée à votre compte, vous recevrez un lien à usage unique valable <strong>1 heure</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                E-mail ou téléphone (+243) *
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="nom@exemple.cd ou +243 81..."
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            {previewActionUrl && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                <p className="text-[11px] font-bold text-amber-900">
                  Lien généré (aperçu test — valable 1 heure, usage unique) :
                </p>
                <a
                  href={previewActionUrl}
                  onClick={(e) => {
                    e.preventDefault();
                    try {
                      const u = new URL(previewActionUrl);
                      onNavigatePath(`${u.pathname}${u.search}`);
                    } catch {
                      window.location.href = previewActionUrl;
                    }
                  }}
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Réinitialiser mon mot de passe maintenant</span>
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[46px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              <span>Envoyer le lien (1h)</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigatePath('/connexion')}
              className="w-full min-h-[40px] text-xs font-bold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              Retour à la connexion
            </button>
          </form>
        )}

        {/* PAGE /reinitialiser-mot-de-passe */}
        {step === 'form' && view === 'reset_password' && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <p className="text-xs sm:text-sm text-slate-600">
              Choisissez un nouveau mot de passe d'au moins 10 caractères (les mots de passe courants sont refusés).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nouveau mot de passe *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 10 caractères"
                  className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-10 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-1.5 space-y-1">
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        !passwordPolicy.valid
                          ? 'bg-rose-500 w-1/3'
                          : passwordPolicy.score >= 4
                          ? 'bg-emerald-500 w-full'
                          : 'bg-[#1D4ED8] w-2/3'
                      }`}
                    />
                  </div>
                  <p className={`text-[11px] font-semibold ${passwordPolicy.valid ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {passwordPolicy.error || passwordPolicy.label}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirmer le mot de passe *</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ressaisissez votre mot de passe"
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !authToken}
              className="w-full min-h-[46px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              <span>Enregistrer le nouveau mot de passe</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigatePath('/mot-de-passe-oublie')}
              className="w-full min-h-[38px] text-xs font-bold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              Demander un nouveau lien
            </button>
          </form>
        )}

        {/* ONGLETS CONNEXION / INSCRIPTION */}
        {step === 'form' && (view === 'login' || view === 'register') && (
          <>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setView('login');
                  setError(null);
                  onNavigatePath('/connexion');
                }}
                className={`min-h-[42px] text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  view === 'login'
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Se connecter
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setView('register');
                  setError(null);
                  onNavigatePath('/inscription');
                }}
                className={`min-h-[42px] text-xs font-extrabold rounded-lg transition-all cursor-pointer ${
                  view === 'register'
                    ? 'bg-[#1D4ED8] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Créer un compte
              </button>
            </div>

            {view === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    E-mail ou téléphone (+243) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      disabled={isLoading}
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="nom@exemple.cd ou +243 81..."
                      className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Mot de passe *</label>
                    <button
                      type="button"
                      onClick={() => onNavigatePath('/mot-de-passe-oublie')}
                      className="text-xs font-bold text-[#1D4ED8] hover:underline cursor-pointer"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      disabled={isLoading}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="••••••••••"
                      className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connexion...</span>
                    </>
                  ) : (
                    <>
                      <span>Se connecter</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5" noValidate>
                {/* Type de compte */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">Type de compte *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCOUNT_ROLE_OPTIONS.map((opt) => {
                      const Icon = roleIcons[opt.id];
                      const active = role === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setRole(opt.id)}
                          className={`p-2.5 rounded-xl border text-left flex items-start gap-2 cursor-pointer transition-colors ${
                            active
                              ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8]'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="text-xs font-extrabold truncate">{opt.label}</div>
                            <div className="text-[10px] text-slate-500 leading-tight">{opt.subtitle}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nom complet */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ex: Jean-Luc Mpoy"
                    className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                  />
                </div>

                {/* E-mail et/ou téléphone +243 */}
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-[11px] text-slate-700 leading-relaxed">
                  Inscrivez-vous avec un <strong>e-mail</strong> et/ou un numéro <strong>+243</strong>. Vous pouvez publier des annonces et des vidéos dès votre inscription, même sans adresse e-mail.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Adresse e-mail <span className="font-normal text-slate-500">(facultative si téléphone +243 renseigné)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@exemple.cd"
                      className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Téléphone RDC (+243)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+243 81 234 56 78"
                      className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 text-sm text-slate-900 font-mono focus:outline-none focus:border-[#1D4ED8]"
                    />
                  </div>
                </div>

                {role === 'agency' && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <input
                      type="text"
                      required
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      placeholder="Nom de l'agence *"
                      className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={rccmOrNif}
                        onChange={(e) => setRccmOrNif(e.target.value)}
                        placeholder="RCCM / NIF (optionnel)"
                        className="w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900 font-mono"
                      />
                      <select
                        value={agencyCommune}
                        onChange={(e) => setAgencyCommune(e.target.value)}
                        className="w-full h-10 bg-white border border-slate-300 rounded-xl px-2.5 text-xs text-slate-900"
                      >
                        {['Gombe', 'Ngaliema', 'Limete', 'Kintambo', 'Bandalungwa', 'Lingwala', 'Lemba'].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {role === 'agent' && (
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    placeholder="Nom de votre structure ou agence (optionnel)"
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900"
                  />
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mot de passe * <span className="font-normal text-slate-500">(10 caractères minimum)</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={10}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 10 caractères"
                      className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-1.5 space-y-1">
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            !passwordPolicy.valid
                              ? 'bg-rose-500 w-1/3'
                              : passwordPolicy.score >= 4
                              ? 'bg-emerald-500 w-full'
                              : 'bg-[#1D4ED8] w-2/3'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-semibold block ${
                          passwordPolicy.valid ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {passwordPolicy.error || passwordPolicy.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Case CGU non pré-cochée (M25.2) */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#1D4ED8] focus:ring-[#1D4ED8] cursor-pointer shrink-0"
                  />
                  <span>
                    J'accepte les{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigatePath('/conditions-utilisation');
                      }}
                      className="text-[#1D4ED8] font-bold underline cursor-pointer"
                    >
                      Conditions d'Utilisation
                    </button>{' '}
                    (version {TERMS_VERSION}).
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[48px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Création du compte...</span>
                    </>
                  ) : (
                    <>
                      <span>Créer mon compte</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
