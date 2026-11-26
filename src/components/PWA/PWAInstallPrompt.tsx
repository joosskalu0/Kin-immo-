import React, { useEffect, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface IOSInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IOSInstallModal: React.FC<IOSInstallModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ios-install-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-5 shadow-2xl text-slate-900 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 id="ios-install-title" className="text-base font-extrabold text-slate-900 leading-tight">
                Installer Kinimmo sur iPhone
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">Accès rapide depuis votre écran d’accueil</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le guide d'installation"
            className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ol className="space-y-2.5 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <li className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
              1
            </span>
            <span>
              Touchez le bouton <strong className="inline-flex items-center gap-1 text-slate-900"><Share className="w-3.5 h-3.5 text-[#1D4ED8]" /> Partager</strong> dans la barre de Safari.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
              2
            </span>
            <span>
              Faites défiler puis choisissez <strong className="text-slate-900">Sur l’écran d’accueil</strong>.
            </span>
          </li>
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-sm transition-colors cursor-pointer"
        >
          J’ai compris
        </button>
      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-[#1D4ED8] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        title="Installer l'application Kinimmo"
      >
        <Download className="w-4 h-4 text-[#1D4ED8]" />
        <span>Installer l’app</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-[#1D4ED8] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title="Installer Kinimmo sur iPhone / iPad"
        >
          <Download className="w-4 h-4 text-[#1D4ED8]" />
          <span>Installer</span>
        </button>
        <IOSInstallModal isOpen={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
      </>
    );
  }

  return null;
};

export const PWAMobileBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isBannerDismissed, install, dismissBanner } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || isBannerDismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  return (
    <>
      <aside
        aria-label="Installer l'application Kinimmo"
        className="lg:hidden mb-3 rounded-2xl bg-white border border-blue-200 shadow-2xs px-3 py-2 flex items-center justify-between gap-2.5"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#1D4ED8] text-[#FACC15] flex items-center justify-center shrink-0">
            <Smartphone className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-slate-900 truncate">
              Application Kinimmo
            </p>
            <p className="text-[11px] text-slate-600 truncate">
              Accès rapide et annonces hors connexion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (isInstallable) {
                void install();
              } else {
                setShowIOSGuide(true);
              }
            }}
            className="min-h-[44px] px-3 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Installer</span>
          </button>

          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Masquer la suggestion d'installation"
            className="min-w-[44px] min-h-[44px] rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <IOSInstallModal isOpen={showIOSGuide} onClose={() => setShowIOSGuide(false)} />
    </>
  );
};
