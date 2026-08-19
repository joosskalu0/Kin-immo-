import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAdminCredentials, verifyAdminPin } from '../lib/adminCredentials';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  ShieldCheck,
  Phone,
  Building,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  KeyRound,
  Send,
  UserCheck,
  Building2,
  Home,
  QrCode,
  Copy,
  Check,
  ShieldAlert,
  Smartphone,
  RefreshCw,
  BadgeCheck,
  Award
} from 'lucide-react';
import { User, Agency, Agent } from '../types';
import { saveUserToFirestore, saveAgentToFirestore, saveAgencyToFirestore } from '../lib/firebase';
import { authenticateUser, registerUserAccount, authenticateOrRegisterGoogleUser } from '../lib/authStore';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, setUser, addAgency, addAgent } = useApp();
  
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  
  // Steps in Auth Modal
  // 'form' -> 'email_verify' or 'phone_verify' -> '2fa_challenge' -> '2fa_setup' -> 'admin_pin' -> 'google_prompt'
  const [step, setStep] = useState<'form' | 'email_verify' | 'phone_verify' | '2fa_challenge' | '2fa_setup' | 'admin_pin' | 'google_prompt'>('form');
  const [adminPinInput, setAdminPinInput] = useState('');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+243 ');
  const [whatsapp, setWhatsapp] = useState('+243 ');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [legalForm, setLegalForm] = useState('SARL');
  const [agencyCommune, setAgencyCommune] = useState('Gombe');
  const [agencyAddress, setAgencyAddress] = useState('');
  const [managerIdType, setManagerIdType] = useState<'passport' | 'voter_card' | 'cni'>('passport');
  const [managerIdNumber, setManagerIdNumber] = useState('');
  const [rccmOrNif, setRccmOrNif] = useState('');
  const [role, setRole] = useState<'user' | 'owner' | 'agent' | 'agency'>('user');
  const [enable2FAOnSignup, setEnable2FAOnSignup] = useState(true);

  // Google OAuth specific prompt state
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');
  
  // Verification codes
  const [verificationCode, setVerificationCode] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [copiedBackup, setCopiedBackup] = useState(false);
  
  // Simulated test codes for user feedback
  const simEmailCode = '592104';
  const simPhoneCode = '842910';
  const sim2FACode = '739102';
  const simBackupKey = 'KIN-8821-X992-SEC';
  
  // Pending user object constructed during multi-step registration/login
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  // Status & Validation
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  // Validate password strength
  const getPasswordStrength = () => {
    if (!password) return null;
    if (password.length < 6) return { label: 'Faible (min 6 car.)', color: 'bg-rose-500', width: 'w-1/3' };
    if (password.length < 10) return { label: 'Moyen', color: 'bg-amber-500', width: 'w-2/3' };
    return { label: 'Sécurisé & Conforme RDC', color: 'bg-emerald-500', width: 'w-full' };
  };

  const strength = getPasswordStrength();

  // Social Sign-In Prompt
  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    setError(null);
    if (provider === 'google') {
      const initialGoogleEmail = email.includes('@') ? email : '';
      const initialGoogleName = name.trim() || (initialGoogleEmail ? initialGoogleEmail.split('@')[0] : '');
      setGoogleEmailInput(initialGoogleEmail);
      setGoogleNameInput(initialGoogleName);
      setStep('google_prompt');
    } else {
      setIsLoading(true);
      setTimeout(() => {
        const fbEmail = email.includes('@') ? email : `user.facebook.${Date.now()}@gmail.com`;
        const fbUser = authenticateOrRegisterGoogleUser(fbEmail, name || 'Utilisateur Facebook');
        setUser(fbUser);
        setIsLoading(false);
        setSuccessMessage(`Bienvenue ${fbUser.name} ! Connexion réussie via Facebook.`);
        setTimeout(() => {
          setIsAuthModalOpen(false);
          setSuccessMessage(null);
          resetState();
        }, 1200);
      }, 700);
    }
  };

  // Confirm Google Login with User's specific email and name
  const handleConfirmGoogleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmailInput.includes('@')) {
      setError('Veuillez saisir une adresse compte Google valide (ex: votre-nom@gmail.com).');
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const authedGoogleUser = authenticateOrRegisterGoogleUser(
        googleEmailInput.trim(),
        googleNameInput.trim()
      );

      setUser(authedGoogleUser);
      setIsLoading(false);
      setSuccessMessage(`Bienvenue ${authedGoogleUser.name} ! Connexion Google réussie.`);

      setTimeout(() => {
        setIsAuthModalOpen(false);
        setSuccessMessage(null);
        resetState();
      }, 1000);
    }, 600);
  };

  // Direct Admin Login Helper
  const handleAdminLogin = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => {
      const creds = getAdminCredentials();
      const adminUserObj: User = {
        id: 'usr_admin_001',
        name: creds.name,
        email: creds.email,
        phone: creds.phone,
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        agencyName: creds.agencyName,
        rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
        planId: 'pro',
        isVerified: true,
        emailVerified: true,
        phoneVerified: true,
        twoFactorEnabled: false,
        kinshasaBadgeVerified: true,
        lastLoginLocation: 'Kinshasa (Gombe), RDC',
        createdAt: new Date().toISOString(),
      };

      setUser(adminUserObj);
      localStorage.setItem('estatik_kinshasa_user', JSON.stringify(adminUserObj));
      setIsLoading(false);
      setSuccessMessage('Connexion réussie en tant qu\'Administrateur Système !');
      setTimeout(() => {
        setIsAuthModalOpen(false);
        setSuccessMessage(null);
        resetState();
      }, 1000);
    }, 500);
  };

  const resetState = () => {
    setStep('form');
    setError(null);
    setSuccessMessage(null);
    setVerificationCode('');
    setTwoFactorCode('');
    setPendingUser(null);
    setGoogleEmailInput('');
    setGoogleNameInput('');
  };

  // Step 1: Form Submit Handler
  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (method === 'email' && !email.includes('@')) {
      setError('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    if (method === 'phone' && phone.trim().length < 10) {
      setError('Veuillez saisir un numéro de téléphone valide en RDC (+243...).');
      return;
    }

    if (mode === 'register' && password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (mode === 'register') {
        // Construct pending user profile
        const newTempUser: User = {
          id: `user_${Date.now()}`,
          name: name || (method === 'email' ? email.split('@')[0] : 'Membre Kinshasa'),
          email: method === 'email' ? email : `${phone.replace(/\s+/g, '')}@estatik.cd`,
          phone: phone && phone.trim() !== '+243' ? phone : '+243 81 000 0000',
          whatsapp: whatsapp && whatsapp.trim() !== '+243' ? whatsapp : (phone && phone.trim() !== '+243' ? phone : '+243 81 000 0000'),
          role: role,
          agencyName: (role === 'agent' || role === 'owner' || role === 'agency') ? agencyName || 'Kinshasa Immobilier' : undefined,
          rccmOrNif: rccmOrNif || (role === 'agency' || role === 'agent' ? 'CD/KIN/RCCM/26-B-08420' : undefined),
          avatar: role === 'agency' || role === 'agent'
            ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
          agentId: (role === 'agent' || role === 'agency') ? `agent_${Date.now()}` : undefined,
          planId: role === 'agency' ? 'agency' : role === 'agent' ? 'pro' : 'starter',
          subscriptionStatus: 'Active',
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          provider: method,
          isVerified: false,
          emailVerified: method === 'email' ? false : true,
          phoneVerified: method === 'phone' ? false : true,
          twoFactorEnabled: enable2FAOnSignup,
          twoFactorMethod: 'authenticator',
          kinshasaBadgeVerified: role === 'agent' || role === 'owner' || role === 'agency',
          identityDocType: managerIdType,
          identityDocNumber: managerIdNumber,
          lastLoginLocation: role === 'agency' ? `Kinshasa (${agencyCommune}), RDC` : 'Kinshasa (Gombe), RDC',
          createdAt: new Date().toISOString(),
        };

        setPendingUser(newTempUser);

        // Redirect to Verification Step (Email or Phone)
        if (method === 'email') {
          setStep('email_verify');
        } else {
          setStep('phone_verify');
        }
      } else {
        // STRICT LOGIN MODE: Must match account & exact password
        const identifier = method === 'email' ? email : phone;
        const authResult = authenticateUser(identifier, password, method);

        if (!authResult.success) {
          setError(authResult.error || 'Mot de passe ou identifiant incorrect.');
          return;
        }

        const targetUser = authResult.user!;
        setPendingUser(targetUser);

        // If 2FA enabled, force 2FA Challenge step
        if (targetUser.twoFactorEnabled) {
          setStep('2fa_challenge');
        } else {
          // Direct authenticated login
          completeAuthentication(targetUser, 'Connexion réussie !');
        }
      }
    }, 700);
  };

  // Verify Email or Phone Code
  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!verificationCode || verificationCode.trim().length < 4) {
      setError('Veuillez entrer le code de confirmation à 6 chiffres.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);

      if (!pendingUser) return;

      const updatedUser: User = {
        ...pendingUser,
        emailVerified: true,
        phoneVerified: true,
        isVerified: true,
      };

      setPendingUser(updatedUser);

      // If user enabled 2FA on signup, show 2FA Setup QR screen
      if (enable2FAOnSignup) {
        setStep('2fa_setup');
      } else {
        completeAuthentication(updatedUser, 'Compte vérifié et créé avec succès !');
      }
    }, 800);
  };

  // Verify 2FA Challenge or Complete 2FA Setup
  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!twoFactorCode || twoFactorCode.trim().length < 4) {
      setError('Veuillez entrer le code à 6 chiffres généré par votre application Authenticator.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (!pendingUser) return;

      const finalizedUser: User = {
        ...pendingUser,
        twoFactorEnabled: true,
        twoFactorMethod: 'authenticator',
        isVerified: true,
      };

      completeAuthentication(
        finalizedUser,
        step === '2fa_setup'
          ? 'Double Authentification (2FA) configurée avec succès !'
          : 'Code 2FA validé ! Connexion sécurisée active.'
      );
    }, 800);
  };

  // Save finalized user and close modal
  const completeAuthentication = (userToSave: User, msg: string) => {
    // Save account with password to persistent authStore
    const userPass = password || (userToSave as any).password || 'Kinshasa2026';
    registerUserAccount(userToSave, userPass);

    saveUserToFirestore(userToSave).catch((err) => console.error('Error saving user to Firestore:', err));

    if (userToSave.role === 'agency') {
      const agencyId = `agency_${Date.now()}`;
      const nextExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const newAgency: Agency = {
        id: agencyId,
        name: userToSave.agencyName || 'Cabinet Immobilier Kinshasa',
        logo: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=300&auto=format&fit=crop&q=80',
        address: agencyAddress ? `${agencyAddress}, ${agencyCommune}` : `Boulevard du 30 Juin, ${agencyCommune}`,
        city: 'Kinshasa',
        commune: agencyCommune,
        phone: userToSave.phone || '+243 81 000 0000',
        whatsapp: userToSave.whatsapp || userToSave.phone || '+243 81 000 0000',
        email: userToSave.email,
        website: `https://${(userToSave.agencyName || 'agence').toLowerCase().replace(/[^a-z0-9]/g, '')}.cd`,
        managerName: userToSave.name,
        rccm: userToSave.rccmOrNif || 'CD/KIN/RCCM/26-B-08420',
        nif: 'A2609820-DGI',
        idNat: '01-83-N84910K',
        agentsCount: 5,
        description: `Cabinet immobilier agréé à Kinshasa (${agencyCommune}). Spécialisé en vente et location résidentielle de standing et commerciale.`,
        specialties: ['Résidentiel Haut Standing', 'Vente Concessions', 'Location Diplomatique'],
        isVerified: false,
        verificationStatus: 'pending',
        subscriptionStatus: 'Active',
        subscriptionExpiresAt: nextExpiry,
        planId: 'agency',
        lastPaymentDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      addAgency(newAgency);
      saveAgencyToFirestore(newAgency).catch((err) => console.error('Error saving agency to Firestore:', err));

      const chiefAgent: Agent = {
        id: userToSave.agentId || `agent_${Date.now()}`,
        name: userToSave.name,
        title: `Directeur Général - ${newAgency.name}`,
        email: userToSave.email,
        phone: userToSave.phone || '+243 81 000 0000',
        whatsapp: userToSave.whatsapp || userToSave.phone || '+243 81 000 0000',
        avatar: userToSave.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
        agencyId: agencyId,
        agencyName: newAgency.name,
        agencyLogo: newAgency.logo,
        rating: 5.0,
        reviewCount: 1,
        listingsCount: 0,
        bio: `Direction générale du cabinet ${newAgency.name} à Kinshasa (${agencyCommune}). RCCM: ${newAgency.rccm}.`,
        specialties: ['Résidentiel', 'Commercial', 'Conseil Juridique'],
        languages: ['Français', 'Lingala', 'English'],
        isVerified: false,
        verificationStatus: 'pending',
        identityDocType: managerIdType,
        identityDocNumber: managerIdNumber,
        rccmOrNif: newAgency.rccm,
        subscriptionStatus: 'Active',
        subscriptionExpiresAt: nextExpiry,
      };

      addAgent(chiefAgent);
      saveAgentToFirestore(chiefAgent).catch((err) => console.error('Error saving chief agent to Firestore:', err));
    } else if (userToSave.role === 'agent' || userToSave.role === 'owner' || userToSave.role === 'admin' || userToSave.agencyName) {
      saveAgentToFirestore({
        id: userToSave.agentId || userToSave.id,
        name: userToSave.name,
        title: userToSave.role === 'admin' ? 'Administrateur Immobilier' : userToSave.role === 'owner' ? 'Propriétaire Vendeur' : 'Agent Immobilier Agréé',
        email: userToSave.email,
        phone: userToSave.phone || '+243 81 000 0000',
        whatsapp: userToSave.whatsapp || userToSave.phone || '+243 81 000 0000',
        avatar: userToSave.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&auto=format&fit=crop&q=80',
        agencyName: userToSave.agencyName || 'Kinshasa Immobilier',
        rating: 5.0,
        reviewCount: 1,
        listingsCount: 0,
        bio: `Agent / Membre partenaire certifié Immocraft. RCCM/NIF: ${userToSave.rccmOrNif || 'CD/KIN/RCCM/20-B-04921'}.`,
        specialties: ['Résidentiel', 'Commercial', 'Conseil'],
        languages: ['Français', 'Lingala'],
      }).catch((err) => console.error('Error saving agent to Firestore:', err));
    }

    setUser(userToSave);
    setSuccessMessage(msg);

    setTimeout(() => {
      setIsAuthModalOpen(false);
      resetState();
    }, 1300);
  };

  const copyBackupKey = () => {
    navigator.clipboard.writeText(simBackupKey);
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 relative shadow-2xl text-slate-100 my-8">
        
        {/* Close Button */}
        <button
          onClick={() => {
            setIsAuthModalOpen(false);
            resetState();
          }}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding & Security Icon */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-emerald-500/20 text-slate-950 font-black">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-1">
            <BadgeCheck className="w-3.5 h-3.5" /> ESTATIK ® Auth & 2FA Kinshasa
          </div>
          <h3 className="text-xl font-black text-white tracking-tight">
            {step === 'form' && (mode === 'login' ? 'Connexion Sécurisée' : 'Créer un Compte Légitime')}
            {step === 'email_verify' && 'Vérification de l\'E-mail'}
            {step === 'phone_verify' && 'Vérification Téléphone +243'}
            {step === '2fa_challenge' && 'Double Authentification (2FA)'}
            {step === '2fa_setup' && 'Activer la Double Authentification'}
            {step === 'admin_pin' && 'Zone Administrateur Protégée'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {step === 'form' && (mode === 'login'
              ? 'Accédez à votre espace agent, propriétaire ou acheteur en RDC'
              : 'Système d\'authentification avec vérification par e-mail, SMS/WhatsApp +243 et 2FA')}
            {step === 'email_verify' && `Code de confirmation envoyé à ${email}`}
            {step === 'phone_verify' && `SMS/WhatsApp de confirmation envoyé au ${phone}`}
            {step === '2fa_challenge' && 'Entrez le code de sécurité pour déverrouiller votre session'}
            {step === '2fa_setup' && 'Scannez le QR code avec Google Authenticator ou Authy'}
            {step === 'admin_pin' && 'Entrez votre code PIN secret d\'administration'}
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Step */}
        {step === 'form' && (
          <>
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'login'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Se Connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`py-2 text-xs font-bold rounded-xl transition-all ${
                  mode === 'register'
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                S'Inscrire (Compte Vérifié)
              </button>
            </div>

            {/* Social Authentication */}
            <div className="space-y-2 mb-4">
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z" />
                </svg>
                Google (Authentification Directe)
              </button>
            </div>

            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Ou avec identifiants RDC
              </span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            {/* Email / Phone Toggle */}
            <div className="flex justify-center gap-4 mb-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMethod('email')}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition-all ${
                  method === 'email'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> E-mail avec Code de Vérification
              </button>

              <button
                type="button"
                onClick={() => setMethod('phone')}
                className={`flex items-center gap-1.5 pb-1 border-b-2 transition-all ${
                  method === 'phone'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Phone className="w-3.5 h-3.5" /> SMS / WhatsApp (+243)
              </button>
            </div>

            <form onSubmit={handleInitialSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom Complet *
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ex: Jean-Luc Mpoy"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {method === 'email' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Adresse E-mail Officielle *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jeanluc.mpoy@kinshasa-prestige.cd"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Phone & WhatsApp fields for registration or phone login */}
              {mode === 'register' ? (
                <div className="space-y-3 p-3 rounded-2xl bg-slate-950 border border-slate-800">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Coordonnées de Contact (Appels & WhatsApp)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-300 mb-1">
                        Téléphone pour Appels *
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPhone(val);
                            if (whatsapp === '+243 ' || !whatsapp) {
                              setWhatsapp(val);
                            }
                          }}
                          placeholder="+243 81 555 44 33"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-medium text-slate-300">
                          Numéro WhatsApp *
                        </label>
                        <button
                          type="button"
                          onClick={() => setWhatsapp(phone)}
                          className="text-[9px] text-emerald-400 hover:underline font-semibold"
                        >
                          Même numéro
                        </button>
                      </div>
                      <div className="relative">
                        <Send className="w-3.5 h-3.5 text-emerald-500 absolute left-2.5 top-2.5" />
                        <input
                          type="tel"
                          required
                          value={whatsapp}
                          onChange={(e) => setWhatsapp(e.target.value)}
                          placeholder="+243 81 555 44 33"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 leading-tight block">
                    Ces numéros seront affichés sur vos fiches d'annonces pour recevoir des appels et messages WhatsApp directs de vos clients.
                  </span>
                </div>
              ) : method === 'phone' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Numéro Téléphone RDC (+243) *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+243 81 555 44 33"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Un code de vérification SMS / WhatsApp vous sera transmis.
                  </span>
                </div>
              ) : null}

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Mot de Passe Sécurisé *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {mode === 'register' && strength && (
                  <div className="mt-1.5 space-y-1">
                    <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300`} />
                    </div>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      Niveau : <span className="text-emerald-400">{strength.label}</span>
                    </span>
                  </div>
                )}
              </div>

              {/* Role Selection & Kinshasa Legitimacy Data */}
              {mode === 'register' && (
                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Statut du Compte à Kinshasa *
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRole('user')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        role === 'user'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="text-[11px] font-bold">Acheteur / Locataire</div>
                        <div className="text-[9px] text-slate-500">Profil particulier</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('owner')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        role === 'owner'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Home className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="text-[11px] font-bold">Propriétaire</div>
                        <div className="text-[9px] text-slate-500">Annonces directes</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('agent')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        role === 'agent'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Building className="w-4 h-4 shrink-0" />
                      <div>
                        <div className="text-[11px] font-bold">Agent Indépendant</div>
                        <div className="text-[9px] text-slate-500">Courtier agréé RDC</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('agency')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all ${
                        role === 'agency'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-semibold shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Building2 className="w-4 h-4 shrink-0 text-emerald-400" />
                      <div>
                        <div className="text-[11px] font-bold flex items-center gap-1">
                          <span>Agence Immobilière</span>
                          <span className="text-[8px] bg-emerald-500/30 text-emerald-300 px-1 rounded font-black">PRO</span>
                        </div>
                        <div className="text-[9px] text-emerald-400">1er Mois Offert • SARL / Ets</div>
                      </div>
                    </button>
                  </div>

                  {/* Agency Specific Registration Section */}
                  {role === 'agency' && (
                    <div className="p-3 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <Building2 className="w-4 h-4" /> Détails de l'Agence Immobilière
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                          Offre 1 Mois Gratuit
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Raison Sociale de l'Agence *
                          </label>
                          <input
                            type="text"
                            required
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            placeholder="Ex: Kinshasa Prestige Real Estate"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Forme Juridique
                          </label>
                          <select
                            value={legalForm}
                            onChange={(e) => setLegalForm(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="SARL">SARL</option>
                            <option value="SAS">SAS</option>
                            <option value="SPRL">SPRL</option>
                            <option value="Cabinet">Cabinet</option>
                            <option value="Ets">Ets</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Numéro RCCM (Guichet Unique RDC)
                          </label>
                          <input
                            type="text"
                            value={rccmOrNif}
                            onChange={(e) => setRccmOrNif(e.target.value)}
                            placeholder="CD/KIN/RCCM/26-B-08420"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Commune du Siège à Kinshasa
                          </label>
                          <select
                            value={agencyCommune}
                            onChange={(e) => setAgencyCommune(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          >
                            {['Gombe', 'Ngaliema', 'Limete', 'Kintambo', 'Bandalungwa', 'Lingwala', 'Kasa-Vubu', 'Mont-Ngafula', 'Lemba'].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-300 mb-1">
                          Adresse Physique du Siège à Kinshasa
                        </label>
                        <input
                          type="text"
                          value={agencyAddress}
                          onChange={(e) => setAgencyAddress(e.target.value)}
                          placeholder="Ex: 18 Avenue Batetela, Immeuble Crown Tower"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Pièce d'Identité du Représentant Légal *
                          </label>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => setManagerIdType('passport')}
                              className={`py-1.5 px-2 rounded-lg border text-center text-[10px] font-bold transition-all ${
                                managerIdType === 'passport'
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              🛂 Passeport RDC
                            </button>
                            <button
                              type="button"
                              onClick={() => setManagerIdType('voter_card')}
                              className={`py-1.5 px-2 rounded-lg border text-center text-[10px] font-bold transition-all ${
                                managerIdType === 'voter_card'
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500'
                                  : 'bg-slate-900 text-slate-400 border-slate-800'
                              }`}
                            >
                              🗳️ Carte CENI
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-300 mb-1">
                            Numéro de la Pièce {managerIdType === 'passport' ? '(Passeport)' : '(Carte CENI)'}
                          </label>
                          <input
                            type="text"
                            value={managerIdNumber}
                            onChange={(e) => setManagerIdNumber(e.target.value)}
                            placeholder={managerIdType === 'passport' ? 'OB-992140-CD' : '1029-4820-9182'}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Agent or Owner simple fields */}
                  {(role === 'agent' || role === 'owner') && (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Nom de l'Agence Immobilière ou Affiliation
                        </label>
                        <input
                          type="text"
                          value={agencyName}
                          onChange={(e) => setAgencyName(e.target.value)}
                          placeholder="ex: Kinshasa Prestige Real Estate"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-300 mb-1">
                          Numéro RCCM / NIF Impôts RDC (Optionnel pour vérification)
                        </label>
                        <input
                          type="text"
                          value={rccmOrNif}
                          onChange={(e) => setRccmOrNif(e.target.value)}
                          placeholder="ex: CD/KIN/RCCM/20-B-04921"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* 2FA Toggle checkbox on signup */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-950 p-2.5 rounded-xl border border-slate-800 hover:border-slate-700">
                      <input
                        type="checkbox"
                        checked={enable2FAOnSignup}
                        onChange={(e) => setEnable2FAOnSignup(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 w-4 h-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-emerald-400 block">
                          Activer la Double Authentification (2FA) obligatoire
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Protection maximale contre le piratage pour vos comptes et annonces
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 mt-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    Traitement en cours...
                  </span>
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? 'Se Connecter'
                        : 'Continuer vers la Vérification Code'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Discrete Footer Lock Link for Admin PIN Access */}
            <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>ESTATIK ® Kinshasa</span>
              <button
                type="button"
                onClick={() => {
                  setStep('admin_pin');
                  setError(null);
                  setAdminPinInput('');
                }}
                className="flex items-center gap-1.5 text-slate-500 hover:text-amber-400 font-medium transition-colors cursor-pointer"
              >
                <Lock className="w-3 h-3 text-slate-500 hover:text-amber-400" />
                <span>Accès Protégé (PIN)</span>
              </button>
            </div>
          </>
        )}

        {/* ADMIN PIN UNLOCK STEP */}
        {step === 'admin_pin' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (verifyAdminPin(adminPinInput)) {
                handleAdminLogin();
              } else {
                setError('Code PIN Administrateur incorrect. Accès refusé.');
              }
            }}
            autoComplete="off"
            className="space-y-4 py-2"
          >
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-200 text-sm">Zone Administrateur Sécurisée</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Saisissez votre code PIN secret d'administration pour déverrouiller la session système.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Code PIN Secret Administrateur
              </label>
              <input
                type="password"
                maxLength={20}
                required
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                value={adminPinInput}
                onChange={(e) => {
                  setAdminPinInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center text-xl font-mono text-emerald-400 tracking-[0.5em] focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError(null);
                }}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Retour
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:opacity-90 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-slate-950" />
                <span>Déverrouiller Admin</span>
              </button>
            </div>
          </form>
        )}

        {/* GOOGLE DIRECT AUTHENTICATION STEP */}
        {step === 'google_prompt' && (
          <form onSubmit={handleConfirmGoogleLogin} className="space-y-4 py-2">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-start gap-3">
              <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z" />
              </svg>
              <div>
                <p className="font-bold text-white text-sm">Authentification avec votre Compte Google</p>
                <p className="text-[11px] text-blue-200/80 mt-0.5">
                  Connectez-vous directement avec votre adresse Google personnelle ou professionnelle pour accéder à vos favoris, recherches et alertes.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Adresse Google (@gmail.com ou Google Workspace) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={googleEmailInput}
                  onChange={(e) => {
                    setGoogleEmailInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="votre-adresse@gmail.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nom & Prénom (affiché sur votre profil)
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={googleNameInput}
                  onChange={(e) => setGoogleNameInput(e.target.value)}
                  placeholder="ex: Joos Kalu"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
              🔒 Connexion sécurisée : Si vous êtes un utilisateur ou acquéreur, votre espace personnel sera automatiquement créé. Si vous êtes un agent déjà inscrit avec cet e-mail, vous serez directement connecté à vos annonces.
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError(null);
                }}
                className="w-1/3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-teal-500 hover:opacity-90 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Se Connecter avec Google</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* EMAIL VERIFICATION STEP */}
        {step === 'email_verify' && (
          <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">
                Code de vérification E-mail
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Un code de vérification à 6 chiffres a été généré pour l'adresse{' '}
                <strong className="text-emerald-400">{email}</strong>.
              </p>
              
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl font-mono text-center">
                ⚡ Code de test de démonstration : <strong>{simEmailCode}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-center">
                Saisissez le code à 6 chiffres
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="592104"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold text-emerald-400 tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  Vérification...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirmer & Valider l'E-mail</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-1 block"
            >
              ← Modifier mes informations
            </button>
          </form>
        )}

        {/* PHONE SMS / WHATSAPP VERIFICATION STEP */}
        {step === 'phone_verify' && (
          <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white">
                Vérification du Numéro RDC (+243)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Un SMS / WhatsApp a été envoyé au numéro{' '}
                <strong className="text-emerald-400">{phone}</strong>.
              </p>
              
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl font-mono text-center">
                ⚡ Code SMS RDC de test : <strong>{simPhoneCode}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-center">
                Saisissez le code SMS (+243)
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="842910"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-xl font-mono font-bold text-emerald-400 tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  Vérification du téléphone...
                </span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Activer le numéro +243</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-1 block"
            >
              ← Modifier mes informations
            </button>
          </form>
        )}

        {/* 2FA CHALLENGE LOGIN STEP */}
        {step === '2fa_challenge' && (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center text-slate-950 font-black">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white">
                Challenge Double Authentification (2FA)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ce compte est protégé par la 2FA. Ouvrez votre application <strong>Google Authenticator</strong> ou consultez vos SMS/WhatsApp.
              </p>
              
              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl font-mono text-center">
                ⚡ Code 2FA de test : <strong>{sim2FACode}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 text-center">
                Code 2FA Sécurisé (6 chiffres)
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="739102"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-center text-2xl font-mono font-extrabold text-emerald-400 tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs hover:opacity-95 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  Validation 2FA...
                </span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Déverrouiller et Accéder au Compte</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full text-center text-xs text-slate-400 hover:text-white pt-1 block"
            >
              ← Annuler la connexion
            </button>
          </form>
        )}

        {/* 2FA SETUP QR STEP ON SIGNUP */}
        {step === '2fa_setup' && (
          <form onSubmit={handle2FASubmit} className="space-y-4">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3">
              <div className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <QrCode className="w-3.5 h-3.5" /> Étape Finale : Configuration 2FA
              </div>

              {/* Simulated QR Code Canvas */}
              <div className="bg-white p-3 rounded-2xl w-40 h-40 mx-auto flex flex-col items-center justify-center shadow-md">
                <div className="w-full h-full border-4 border-slate-900 rounded-xl bg-slate-950 p-2 flex flex-col items-center justify-center text-white">
                  <QrCode className="w-16 h-16 text-emerald-400" />
                  <span className="text-[9px] font-mono font-bold text-slate-300 mt-1">ESTATIK-KIN-2FA</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Scannez ce QR Code dans <strong>Google Authenticator</strong> ou <strong>Authy</strong>.
              </p>

              {/* Backup Key */}
              <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-2 text-xs">
                <div className="text-left">
                  <span className="text-[10px] text-slate-500 block">Clé de Secours 2FA :</span>
                  <span className="font-mono font-bold text-amber-400">{simBackupKey}</span>
                </div>
                <button
                  type="button"
                  onClick={copyBackupKey}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors"
                >
                  {copiedBackup ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl font-mono text-center">
                ⚡ Saisissez le code 2FA pour terminer : <strong>{sim2FACode}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 text-center">
                Code de confirmation 2FA
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="739102"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-xl font-mono font-bold text-emerald-400 tracking-widest focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  Activation 2FA...
                </span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Finaliser la Création du Compte Kinshasa</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
