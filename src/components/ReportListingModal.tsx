import React, { useState } from 'react';
import { ShieldAlert, X, AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import { Property, PropertyUserReport } from '../types';

interface ReportListingModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onSubmitReport: (report: Omit<PropertyUserReport, 'id' | 'createdAt' | 'status'>) => Promise<void> | void;
}

export const ReportListingModal: React.FC<ReportListingModalProps> = ({
  property,
  isOpen,
  onClose,
  onSubmitReport
}) => {
  const [reason, setReason] = useState<PropertyUserReport['reason']>('fake_price');
  const [comment, setComment] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const reasonsMap: Record<PropertyUserReport['reason'], string> = {
      fake_price: 'Prix anormalement bas / Trompeur',
      scam_advance_payment: 'Exigence d\'argent ou d\'acompte avant la visite',
      stolen_photos: 'Photos volées ou non conformes à la réalité',
      unreachable_seller: 'Numéro de téléphone faux ou injoignable',
      already_sold: 'Bien immobilier déjà vendu ou indisponible',
      other: 'Autre motif suspect'
    };

    try {
      await onSubmitReport({
        propertyId: property.id,
        propertyTitle: property.title,
        agentId: property.agentId,
        reporterName: reporterName.trim() || undefined,
        reporterContact: reporterContact.trim() || undefined,
        reason,
        reasonLabel: reasonsMap[reason],
        comment: comment.trim() || undefined
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Erreur envoi signalement:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Signaler cette annonce</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{property.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white">Signalement transmis</h4>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              Merci pour votre vigilance. Notre algorithme anti-fraude et notre équipe de modération ont été alertés et examinent immédiatement ce bien.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Immocraft protège les acquéreurs à Kinshasa. Tout signalement avéré entraîne le blocage immédiat de l'annonce et l'audit du vendeur.
              </span>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">Motif principal du signalement *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
              >
                <option value="fake_price">📉 Prix anormalement bas ou trompeur (arnaque suspectée)</option>
                <option value="scam_advance_payment">🚨 Le vendeur exige de l'argent / acompte avant la visite</option>
                <option value="stolen_photos">🖼️ Photos volées ou fausses images (non réelles)</option>
                <option value="unreachable_seller">📞 Numéro de téléphone suspect, faux ou injoignable</option>
                <option value="already_sold">❌ Bien déjà vendu / n'existe pas à cette adresse</option>
                <option value="other">⚠️ Autre comportement suspect ou abus</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1.5">
                Précisions complémentaires (facultatif mais recommandé)
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Expliquez ce qui vous a paru suspect (ex: le vendeur m'a demandé 50$ par M-Pesa avant toute visite)..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Votre nom (facultatif)</label>
                <input
                  type="text"
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Ex: Jean Mukendi"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Téléphone / WhatsApp</label>
                <input
                  type="text"
                  value={reporterContact}
                  onChange={(e) => setReporterContact(e.target.value)}
                  placeholder="+243 81..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-semibold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all shadow-lg shadow-red-950/50 flex items-center gap-2 disabled:opacity-50"
              >
                <ShieldAlert className="w-4 h-4" />
                {isSubmitting ? 'Transmission...' : 'Envoyer le signalement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
