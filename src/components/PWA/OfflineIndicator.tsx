import React from 'react';
import { WifiOff, ArrowRight } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  currentTab: string;
  onOpenOfflinePage: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  currentTab,
  onOpenOfflinePage,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs"
    >
      <div className="flex items-center gap-2 min-w-0">
        <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
        <span className="text-xs sm:text-sm font-semibold">
          Mode hors connexion — Données en cache affichées.
        </span>
      </div>

      {currentTab !== 'offline' && (
        <button
          type="button"
          onClick={onOpenOfflinePage}
          className="min-h-[40px] px-3 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <span>Pages récentes & favoris</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
