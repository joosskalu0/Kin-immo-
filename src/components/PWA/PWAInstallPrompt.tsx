import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, ExternalLink, Monitor, Share, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface InstallGuideModalProps {
  isOpen: boolean;
  isIOS: boolean;
  onClose: () => void;
}

const InstallGuideModal: React.FC<InstallGuideModalProps> = ({ isOpen, isIOS, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyUrl = async () => {
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setCopiedUrl(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-guide-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-5 shadow-2xl text-slate-900 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 id="pwa-install-guide-title" className="text-base font-extrabold text-slate-900 leading-tight">
                {isIOS ? 'Installer Kinimmo sur iPhone' : 'Télécharger l’application Kinimmo'}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Accès rapide depuis votre écran d’accueil et mode hors connexion
              </p>
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

        {isInIframe && currentUrl && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3.5 space-y-2.5">
            <p className="text-xs text-slate-700 leading-relaxed">
              Vous consultez actuellement l’application dans un aperçu intégré. Ouvrez-la dans un onglet dédié de votre navigateur pour lancer l’installation directe :
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={typeof window !== 'undefined' ? window.location.href : '/'}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[40px] px-3.5 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ouvrir dans un nouvel onglet</span>
              </a>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="min-h-[40px] px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Lien copié' : 'Copier le lien'}</span>
              </button>
            </div>
          </div>
        )}

        {isIOS ? (
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
        ) : (
          <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Sur Android (Chrome / Edge)</p>
                <p className="mt-0.5 leading-relaxed">
                  Ouvrez le menu du navigateur (<strong>⋮</strong>) puis touchez <strong>Installer l’application</strong> ou <strong>Ajouter à l’écran d’accueil</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
              <Monitor className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Sur ordinateur (Chrome / Edge)</p>
                <p className="mt-0.5 leading-relaxed">
                  Cliquez sur l’icône d’installation à droite de la barre d’adresse ou ouvrez le menu du navigateur → <strong>Installer Kinimmo</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200">
              <Share className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900">Sur iPhone / iPad (Safari)</p>
                <p className="mt-0.5 leading-relaxed">
                  Touchez <strong>Partager</strong> puis <strong>Sur l’écran d’accueil</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

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

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  if (isInstalled) return null;

  const handleClick = () => {
    if (isInstallable) {
      void install();
    } else {
      setShowInstallGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Télécharger ou installer l'application Kinimmo"
        title="Télécharger / installer l'application Kinimmo"
        className={
          compact
            ? 'w-11 h-11 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1D4ED8] flex items-center justify-center shrink-0 transition-colors cursor-pointer'
            : 'h-10 px-3 rounded-xl bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-800 hover:text-[#1D4ED8] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap'
        }
      >
        <Download className={compact ? 'w-5 h-5 text-[#1D4ED8]' : 'w-4 h-4 text-[#1D4ED8] shrink-0'} />
        {!compact && <span className="hidden xl:inline">Télécharger l’app</span>}
        {!compact && <span className="xl:hidden">Installer</span>}
      </button>

      <InstallGuideModal
        isOpen={showInstallGuide}
        isIOS={isIOS}
        onClose={() => setShowInstallGuide(false)}
      />
    </>
  );
};

export const PWAMobileBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isBannerDismissed, install, dismissBanner } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  if (isInstalled || isBannerDismissed) {
    return null;
  }

  return (
    <>
      <aside
        aria-label="Télécharger l'application Kinimmo"
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
                setShowInstallGuide(true);
              }
            }}
            className="min-h-[44px] px-3 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger</span>
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

      <InstallGuideModal
        isOpen={showInstallGuide}
        isIOS={isIOS}
        onClose={() => setShowInstallGuide(false)}
      />
    </>
  );
};
