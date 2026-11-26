import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { useApp } from '../../context/AppContext';
import { mysqlApi } from '../../services/mysqlApi';
import { purgeLegacyAuthStorage } from '../../services/secureFetch';

interface AdminPortalProps {
  onReturnHome: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onReturnHome }) => {
  const { user, logOut } = useApp();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    purgeLegacyAuthStorage();

    if (user && user.role === 'admin') {
      setAdminUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
        agencyName: user.agencyName || 'Direction Kinimmo'
      });
      setIsInitializing(false);
      return;
    }

    mysqlApi
      .getMe()
      .then((res) => {
        if (!active) return;
        const liveUser = res.user || res.data?.user;
        if (res.success && liveUser?.role === 'admin') {
          setAdminUser(liveUser);
        } else {
          setAdminUser(null);
        }
      })
      .catch(() => {
        if (active) setAdminUser(null);
      })
      .finally(() => {
        if (active) setIsInitializing(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const handleLoginSuccess = (authenticatedAdmin: any) => {
    setAdminUser(authenticatedAdmin);
  };

  const handleLogout = async () => {
    await logOut();
    setAdminUser(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-600">Chargement de l'environnement sécurisé Kinimmo...</span>
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
