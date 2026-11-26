import React from 'react';
import { ArrowLeft, AlertCircle, Share2, LucideIcon } from 'lucide-react';
import { goBackOrFallback } from '../utils/navigation';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-10 text-center space-y-4 shadow-xs max-w-xl mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-[#1D4ED8] flex items-center justify-center mx-auto">
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">{description}</p>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={onAction}
          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-sm transition-colors cursor-pointer active:scale-98"
        >
          {actionLabel}
        </button>
        {secondaryLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors cursor-pointer"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
};

interface ErrorStateProps {
  title?: string;
  message: string;
  nextStepHint: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Action impossible pour le moment',
  message,
  nextStepHint,
  actionLabel = 'Réessayer',
  onAction,
}) => {
  return (
    <div
      role="alert"
      className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 text-slate-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 text-sm">
          <p className="font-bold text-rose-900">{title}</p>
          <p className="text-rose-800">{message}</p>
          <p className="text-xs font-semibold text-rose-700">Que faire : {nextStepHint}</p>
        </div>
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

interface PageHeaderBarProps {
  title: string;
  subtitle?: string;
  fallbackPath?: string;
  onBack?: () => void;
  shareUrl?: string;
  shareTitle?: string;
  rightSlot?: React.ReactNode;
}

export const PageHeaderBar: React.FC<PageHeaderBarProps> = ({
  title,
  subtitle,
  fallbackPath = '/',
  onBack,
  shareUrl,
  shareTitle,
  rightSlot,
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      goBackOrFallback(fallbackPath);
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareUrl || typeof window === 'undefined') return;
    const text = encodeURIComponent(`${shareTitle || title}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 flex items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Revenir à la page précédente"
          className="w-11 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center shrink-0 transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-extrabold text-slate-900 truncate">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-slate-600 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {shareUrl && (
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="min-h-[44px] px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1D4ED8] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            title="Partager ce lien sur WhatsApp"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Partager</span>
          </button>
        )}
        {rightSlot}
      </div>
    </div>
  );
};
