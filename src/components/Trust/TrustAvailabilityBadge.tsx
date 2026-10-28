import React, { useState } from 'react';
import { CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { AvailabilityStatus, AVAILABILITY_LABELS } from '../../types/trust';
import { trustService } from '../../services/trustService';

interface TrustAvailabilityBadgeProps {
  propertyId: string;
  propertyTitle: string;
  status?: AvailabilityStatus;
  confirmedAt?: string;
  canConfirm?: boolean; // True for the listing's agent, agency, or admin
  onUpdated?: (newStatus: AvailabilityStatus) => void;
  className?: string;
}

export const TrustAvailabilityBadge: React.FC<TrustAvailabilityBadgeProps> = ({
  propertyId,
  status = 'available',
  confirmedAt,
  canConfirm = false,
  onUpdated,
  className = ''
}) => {
  const [currentStatus, setCurrentStatus] = useState<AvailabilityStatus>(status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const meta = AVAILABILITY_LABELS[currentStatus] || AVAILABILITY_LABELS.available;

  const handleStatusChange = async (newStatus: AvailabilityStatus) => {
    setIsUpdating(true);
    try {
      await trustService.confirmAvailability(propertyId, {
        availability_status: newStatus,
        confirmation_method: 'agent_statement',
        notes: `Mise à jour de disponibilité par le gestionnaire (${newStatus})`
      });
      setCurrentStatus(newStatus);
      setShowOptions(false);
      if (onUpdated) onUpdated(newStatus);
    } catch (e) {
      console.error('Erreur mise à jour disponibilité', e);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`relative inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm ${meta.color}`}
      >
        <span className={`w-2 h-2 rounded-full ${currentStatus === 'available' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
        <span>{meta.label}</span>
      </span>

      {confirmedAt && (
        <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400">
          <Clock size={12} />
          <span>Vérifié {new Date(confirmedAt).toLocaleDateString('fr-FR')}</span>
        </span>
      )}

      {canConfirm && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(!showOptions);
            }}
            disabled={isUpdating}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-slate-700 text-xs flex items-center gap-1"
            title="Mettre à jour la disponibilité en temps réel"
          >
            <RefreshCw size={12} className={isUpdating ? 'animate-spin' : ''} />
            <span className="text-[10px]">Actualiser</span>
          </button>

          {showOptions && (
            <div 
              className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-xl z-30 space-y-1 text-xs animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Statut de Disponibilité
              </div>
              {(['available', 'under_option', 'reserved', 'rented', 'sold', 'withdrawn'] as AvailabilityStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl font-medium transition-colors flex items-center justify-between ${
                    currentStatus === st ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{AVAILABILITY_LABELS[st].label}</span>
                  {currentStatus === st && <CheckCircle2 size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
