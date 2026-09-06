import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertTriangle,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { mysqlApi, setStoredToken } from '../../services/mysqlApi';

interface AdminLoginProps {
  onLoginSuccess: (adminUser: any) => void;
  onReturnHome: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onLoginSuccess, onReturnHome }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // Authentification sécurisée via l'API REST MySQL côté serveur
      const res = await mysqlApi.login({ email: email.trim(), password });

      if (res.success && res.data?.user) {
        const loggedUser = res.data.user;
        // Vérification stricte des permissions : Seul le rôle 'admin' est autorisé
        if (loggedUser.role !== 'admin') {
          setIsLoading(false);
          setErrorMessage('Accès refusé. Ce compte ne dispose pas des privilèges administrateur.');
          return;
        }

        if (res.data.token) {
          setStoredToken(res.data.token);
        }

        // Sauvegarder la session admin chiffrée
        try {
          localStorage.setItem('kinimmo_admin_session', JSON.stringify({
            id: loggedUser.id,
            name: loggedUser.name,
            email: loggedUser.email,
            role: loggedUser.role,
            loginTime: new Date().toISOString()
          }));
        } catch {}

        onLoginSuccess(loggedUser);
        return;
      }

      setErrorMessage(res.message || 'Identifiants administrateur incorrects.');
    } catch (err: any) {
      setErrorMessage(
        'Impossible de contacter le serveur backend. Vérifiez que votre API Node.js / MySQL est bien active et accessible.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 relative overflow-hidden selection:bg-emerald-500 selection:text-slate-950">
      {/* Background glowing effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-emerald-600/15 via-emerald-900/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <button
          onClick={onReturnHome}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm group"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Retour au site public</span>
        </button>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Portail MySQL • Kinimmo RDC</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8 z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-emerald-950/20 relative">
          {/* Decorative Badge */}
          <div className="flex justify-center -mt-16 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-0.5 shadow-xl shadow-emerald-500/25 ring-4 ring-slate-950">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="text-center space-y-1.5 mb-8">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-black uppercase tracking-wider">
              Accès Restreint
            </span>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Administration Kinimmo
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Console de gestion sécurisée des biens, agents, agences et utilisateurs de Kinshasa.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Adresse e-mail administrateur
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kinimmo.cd"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Mot de passe secret
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-600/25 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Vérification des autorisations...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Se connecter au Dashboard Admin</span>
                </>
              )}
            </button>
          </form>

          {/* Security Features Info */}
          <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Chiffrement TLS & JWT</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Contrôle RBAC Strict</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Hashes non exposés</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Audit logs MySQL</span>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer Notice */}
      <footer className="max-w-md w-full mx-auto text-center text-[11px] text-slate-500 z-10">
        <p>
          Plateforme Immobilière Kinimmo • Accès strictement réservé au personnel autorisé de la Direction.
        </p>
      </footer>
    </div>
  );
};
