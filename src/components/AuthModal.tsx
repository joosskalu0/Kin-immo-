import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dispatchAppNavigate } from '../utils/navigation';

/**
 * Formate proprement les erreurs d'authentification renvoyées par l'API Kinimmo.
 */
export const formatAuthErrorMessage = (
  err: any,
  context: 'login' | 'register' | 'general' = 'login'
): string => {
  if (!err) return "Une erreur inattendue est survenue lors de l'authentification.";
  const rawMsg = typeof err === 'string' ? err : err?.message || '';

  if (/mot de passe incorrect|identifiant ou mot de passe/i.test(rawMsg)) {
    return 'Identifiant ou mot de passe incorrect. Vérifiez vos accès ou réinitialisez votre mot de passe.';
  }
  if (/trop de tentatives|too-many-requests/i.test(rawMsg)) {
    return 'Trop de tentatives récentes. Patientez quelques instants avant de réessayer.';
  }
  if (/load failed|failed to fetch|networkerror|impossible de joindre le serveur/i.test(rawMsg)) {
    return 'Impossible de joindre le serveur Kinimmo. Vérifiez votre connexion Internet.';
  }
  if (rawMsg.trim().length > 0) return rawMsg;

  return context === 'login'
    ? 'Identifiant ou mot de passe incorrect.'
    : "Impossible de finaliser l'inscription. Vérifiez vos informations.";
};

/**
 * Pont de compatibilité : l'authentification Kinimmo utilise désormais les pages URL dédiées (/connexion, /inscription).
 */
export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen } = useApp();

  useEffect(() => {
    if (isAuthModalOpen) {
      setIsAuthModalOpen(false);
      dispatchAppNavigate('/connexion');
    }
  }, [isAuthModalOpen, setIsAuthModalOpen]);

  return null;
};
