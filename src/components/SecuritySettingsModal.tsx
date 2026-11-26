import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { dispatchAppNavigate } from '../utils/navigation';

/**
 * Pont de compatibilité : les paramètres de sécurité utilisent désormais la page URL dédiée /compte/securite.
 */
export const SecuritySettingsModal: React.FC = () => {
  const { isSecurityModalOpen, setIsSecurityModalOpen } = useApp();

  useEffect(() => {
    if (isSecurityModalOpen) {
      setIsSecurityModalOpen(false);
      dispatchAppNavigate('/compte/securite');
    }
  }, [isSecurityModalOpen, setIsSecurityModalOpen]);

  return null;
};
