import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { useApp } from '../../context/AppContext';
import { clearStoredToken } from '../../services/mysqlApi';

interface AdminPortalProps {
  onReturnHome: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onReturnHome }) => {
  const { user } = useApp();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Vérifier si une session admin existe déjà
    try {
      const savedAdminStr = localStorage.getItem('kinimmo_admin_session');
      if (savedAdminStr) {
        const parsed = JSON.parse(savedAdminStr);
        if (parsed && parsed.role === 'admin') {
          setAdminUser(parsed);
          setIsInitializing(false);
          return;
        }
      }

      // Si l'utilisateur dans AppContext a déjà le rôle admin
      if (user && user.role === 'admin') {
        setAdminUser({
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'admin',
          agencyName: user.agencyName || 'Direction Kinimmo'
        });
      }
    } catch (e) {
      console.error('Erreur lecture session admin:', e);
    } finally {
      setIsInitializing(false);
    }
  }, [user]);

  const handleLoginSuccess = (authenticatedAdmin: any) => {
    setAdminUser(authenticatedAdmin);
  };

  const handleLogout = () => {
    localStorage.removeItem('kinimmo_admin_session');
    clearStoredToken();
    setAdminUser(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-400">Chargement de l'environnement sécurisé Kinimmo...</span>
        </div>
      </div>
    );
  }

  if (adminUser) {
    return (
      <AdminDashboard
        adminUser={adminUser}
        onLogout={handleLogout}
        onReturnHome={onReturnHome}
      />
    );
  }

  return (
    <AdminLogin
      onLoginSuccess={handleLoginSuccess}
      onReturnHome={onReturnHome}
    />
  );
};
