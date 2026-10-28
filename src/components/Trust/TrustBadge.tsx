import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, Clock, CheckCircle2, FileCheck, Building, UserCheck, X } from 'lucide-react';
import { TrustStatus, TRUST_STATUS_LABELS } from '../../types/trust';

interface TrustBadgeProps {
  status?: TrustStatus | string;
  level?: string;
  score?: number;
  verifiedAt?: string;
  expiresAt?: string;
  targetType?: 'property' | 'agent' | 'agency';
  targetTitle?: string;
  size?: 'sm' | 'md' | 'lg';
  showUnverified?: boolean; // Only true when inside private dashboard for the owner/admin
  onApplyClick?: () => void;
  className?: string;
}

export const TrustBadge: React.FC<TrustBadgeProps> = ({
  status = 'unverified',
  level,
  score = 0,
  verifiedAt,
  expiresAt,
  targetType = 'property',
  targetTitle,
  size = 'md',
  showUnverified = false,
  onApplyClick,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const trustStatus = (status as TrustStatus) || 'unverified';
  const meta = TRUST_STATUS_LABELS[trustStatus] || TRUST_STATUS_LABELS.unverified;

  // RÈGLE MÉTIER STRICTE :
  // "Les statuts doivent être attribués uniquement après les contrôles correspondants. Ne pas afficher un badge de vérification avant l’approbation effective."
  const isApproved = meta.isApproved;

  // Pour le public : si ce n'est pas approuvé et qu'on ne force pas l'affichage privé, on n'affiche aucun badge de vérification !
  if (!isApproved && !showUnverified) {
    return null;
  }

  // Tailles
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2'
  }[size];

  const iconSizes = {
    sm: 13,
    md: 15,
    lg: 18
  }[size];

  // Label affiché
  const displayLabel = isApproved
    ? (level || meta.badgeText)
    : meta.label;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isApproved) {
            setIsModalOpen(true);
          } else if (onApplyClick) {
            onApplyClick();
          }
        }}
        className={`inline-flex items-center font-semibold rounded-full border shadow-sm transition-all duration-200 cursor-pointer ${
          isApproved
            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80 hover:border-emerald-400'
            : trustStatus === 'pending' || trustStatus === 'in_progress'
            ? 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/80'
            : trustStatus === 'rejected' || trustStatus === 'suspended'
            ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
        } ${sizeClasses} ${className}`}
        title={isApproved ? "Cliquez pour voir le certificat d'audit Kinimmo Trust" : displayLabel}
      >
        {isApproved ? (
          <ShieldCheck size={iconSizes} className="text-emerald-400 shrink-0" />
        ) : trustStatus === 'pending' || trustStatus === 'in_progress' ? (
          <Clock size={iconSizes} className="text-amber-400 animate-pulse shrink-0" />
        ) : (
          <ShieldAlert size={iconSizes} className="text-slate-400 shrink-0" />
        )}
        <span className="truncate tracking-wide">{displayLabel}</span>
        {isApproved && score > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-200 font-bold border border-emerald-500/30">
            {score}%
          </span>
        )}
      </button>

      {/* Modal Certificat d'Audit Kinimmo Trust */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton fermeture */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>

            {/* En-tête du certificat */}
            <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShieldCheck size={32} className="text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Kinimmo Trust Certified
                  </span>
                  {score > 0 && (
                    <span className="text-xs font-bold text-emerald-300">
                      Score : {score}/100
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-white mt-1">
                  Certificat de Confiance & d’Audit
                </h3>
                <p className="text-xs text-slate-400">
                  {targetTitle || 'Dossier vérifié par les auditeurs officiels de Kinimmo'}
                </p>
              </div>
            </div>

            {/* Contrôles effectués */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Garanties & Contrôles Validés
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <FileCheck size={16} />
                    <span>Titre & Cadastre</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Certificat d’enregistrement ou titre de propriété vérifié au Cadastre foncier.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <Building size={16} />
                    <span>Inspection Physique</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Localisation et conformité du bien constatées sur le terrain à Kinshasa.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <UserCheck size={16} />
                    <span>Identité & Mandat</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Pièce d’identité officielle, RCCM et droit légal de vente/location approuvés.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                    <CheckCircle2 size={16} />
                    <span>Disponibilité Réelle</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Bien actif, disponible pour visites et signatures sans intermédiaire fictif.
                  </p>
                </div>
              </div>
            </div>

            {/* Dates de validité */}
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-slate-300 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                  Audit Validé le
                </span>
                <span className="text-white font-medium">
                  {verifiedAt ? new Date(verifiedAt).toLocaleDateString('fr-FR') : 'Audit récent (2026)'}
                </span>
              </div>
              {expiresAt && (
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Expiration Certification
                  </span>
                  <span className="text-emerald-300 font-medium">
                    {new Date(expiresAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              )}
            </div>

            <div className="text-center pt-1">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors border border-slate-700"
              >
                Fermer l’attestation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
