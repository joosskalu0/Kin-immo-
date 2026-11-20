import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CreditCard,
  ShieldAlert,
  Clock,
  X,
  ArrowRight,
  Upload,
  CheckCircle2,
  EyeOff,
  Loader2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { compressProofImageFile, resolveAccountBillingSummary } from '../../utils/billingHelpers';

interface PaymentReminderBannerProps {
  onOpenBilling?: () => void;
}

export const PaymentReminderBanner: React.FC<PaymentReminderBannerProps> = ({ onOpenBilling }) => {
  const {
    user,
    agencies,
    agents,
    invoices,
    properties,
    propertyVideos,
    subscriptionPlans,
    paymentMethods,
    cdfExchangeRate,
    submitManualPaymentProof,
    subscribeToPlan
  } = useApp();

  const [isDismissed, setIsDismissed] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPmId, setSelectedPmId] = useState<string>(() => paymentMethods.find((m) => m.is_active !== false)?.id || 'pm_mpesa');
  const [txReference, setTxReference] = useState('');
  const [proofPreview, setProofPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);

  const userAgency = useMemo(
    () =>
      agencies.find(
        (a) =>
          a.id === user?.agencyId ||
          (a.name && user?.agencyName && a.name.toLowerCase() === user.agencyName.toLowerCase())
      ),
    [agencies, user]
  );

  const summary = useMemo(() => {
    if (!user || user.role === 'admin') return null;
    return resolveAccountBillingSummary({
      user,
      agency: userAgency,
      plans: subscriptionPlans,
      properties,
      propertyVideos,
      agents
    });
  }, [user, userAgency, subscriptionPlans, properties, propertyVideos, agents]);

  const activeMethods = useMemo(
    () => paymentMethods.filter((m) => m.is_active !== false),
    [paymentMethods]
  );

  if (!user || user.role === 'admin' || !summary) return null;

  const { isExpired, isExpiringSoon, daysRemaining, plan, softHiddenCount } = summary;
  const pendingInvoice = invoices.find(
    (inv) =>
      (inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'rejected') &&
      (inv.targetId === user.id || inv.targetEmail === user.email || (userAgency && inv.targetId === userAgency.id))
  );
  const awaitingInvoice = invoices.find(
    (inv) =>
      inv.status === 'awaiting_validation' &&
      (inv.targetId === user.id || inv.targetEmail === user.email || (userAgency && inv.targetId === userAgency.id))
  );

  // Afficher la bannière uniquement si expiré, proche d'expiration (<=7j), annonces masquées par rétrogradation ou facture à payer
  if (!isExpired && !isExpiringSoon && softHiddenCount === 0 && !pendingInvoice) {
    return null;
  }

  const amountDue = pendingInvoice
    ? (pendingInvoice.totalAmount ?? pendingInvoice.amount ?? 0)
    : Math.max(plan.priceMonthly, userAgency ? 79 : 29);
  const amountDueCdf = Math.round(amountDue * cdfExchangeRate);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressProofImageFile(file);
      setProofPreview(dataUrl);
    } catch {}
  };

  const handleQuickPaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txReference.trim() && !proofPreview) return;
    setIsSubmitting(true);
    try {
      let targetInv = pendingInvoice;
      if (!targetInv) {
        const renewPlan =
          plan.priceMonthly > 0
            ? plan
            : subscriptionPlans.find((p) => (userAgency ? p.id === 'agency' : p.id === 'pro')) || plan;
        const created = await subscribeToPlan(renewPlan, 'monthly', selectedPmId, false);
        targetInv = created.invoice;
      }
      if (targetInv) {
        const res = await submitManualPaymentProof(targetInv.id, {
          paymentMethodId: selectedPmId,
          transactionReference: txReference.trim() || undefined,
          proofImageUrl: proofPreview || undefined
        });
        setSubmittedMsg(res.message || 'Preuve envoyée pour validation administrateur.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isDismissed) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-amber-200 text-xs mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>{isExpired ? 'Abonnement expiré' : 'Échéance proche'} :</strong> {plan.name}
            {softHiddenCount > 0 ? ` (${softHiddenCount} annonce(s) masquée(s) sans suppression)` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (onOpenBilling ? onOpenBilling() : setShowPayModal(true))}
            className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 text-xs"
          >
            Régulariser
          </button>
          <button type="button" onClick={() => setIsDismissed(false)} className="text-amber-300 underline text-[11px]">
            Détails
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`rounded-2xl p-5 mb-6 border ${
          isExpired || softHiddenCount > 0
            ? 'bg-rose-950/30 border-rose-500/40'
            : 'bg-amber-950/25 border-amber-500/40'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border ${
                  isExpired
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                {isExpired ? 'Abonnement Expiré — Rétrogradation Douce' : `Échéance dans ${daysRemaining ?? 0} jour(s)`}
              </span>
              {pendingInvoice && (
                <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono text-[11px]">
                  {pendingInvoice.invoiceNumber || pendingInvoice.id}
                </span>
              )}
              {awaitingInvoice && (
                <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[11px] font-semibold">
                  Preuve en attente de validation ({awaitingInvoice.invoiceNumber})
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-black text-white">
              {isExpired
                ? `Renouvelez votre abonnement ${userAgency ? `(${userAgency.name})` : ''}`
                : `Rappel d'échéance : ${plan.name}`}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {softHiddenCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-amber-200">
                  <EyeOff className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {softHiddenCount} annonce(s) au-dessus du plafond gratuit ont été <strong>masquées sans suppression</strong>. Elles seront réactivées dès validation de votre renouvellement.
                  </span>
                </span>
              ) : (
                <>
                  Montant indicatif : <strong className="font-mono text-white">${amountDue} USD</strong> (~{amountDueCdf.toLocaleString('fr-FR')} CDF).
                  Réglez via {activeMethods.map((m) => m.account_name.split('-')[0].trim()).slice(0, 3).join(', ')}.
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-2 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowPayModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Payer / Envoyer Preuve (${amountDue})</span>
            </button>

            {onOpenBilling && (
              <button
                type="button"
                onClick={onOpenBilling}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Voir factures & quotas</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-slate-200 text-[11px] text-center underline"
            >
              Masquer
            </button>
          </div>
        </div>
      </div>

      {showPayModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black">Règlement Mobile Money</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {plan.name} • ${amountDue} USD (~{amountDueCdf.toLocaleString('fr-FR')} CDF)
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPayModal(false);
                  setSubmittedMsg(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submittedMsg ? (
              <div className="py-6 text-center space-y-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-bold text-white">{submittedMsg}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowPayModal(false);
                    setSubmittedMsg(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuickPaySubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">Opérateurs Mobile Money configurés :</label>
                  <div className="space-y-2">
                    {activeMethods.map((pm) => (
                      <button
                        type="button"
                        key={pm.id}
                        onClick={() => setSelectedPmId(pm.id)}
                        className={`w-full p-3 rounded-xl border text-left text-xs ${
                          selectedPmId === pm.id
                            ? 'bg-emerald-500/10 border-emerald-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex justify-between font-bold">
                          <span>{pm.account_name}</span>
                          <span className="font-mono text-emerald-400">{pm.account_number}</span>
                        </div>
                        {pm.merchant_code && <p className="text-[11px] text-amber-300 font-mono">Code: {pm.merchant_code}</p>}
                        {pm.instructions && <p className="text-[11px] text-slate-400 mt-1">{pm.instructions}</p>}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Référence de transaction *</label>
                  <input
                    type="text"
                    value={txReference}
                    onChange={(e) => setTxReference(e.target.value)}
                    placeholder="Ex: MP-8921-X99"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Capture de preuve (optionnel)</label>
                  <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-dashed border-slate-700 cursor-pointer text-xs text-slate-300">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    <span>{proofPreview ? 'Capture ajoutée' : 'Joindre une capture'}</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || (!txReference.trim() && !proofPreview)}
                  className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  <span>Soumettre la preuve pour validation</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
