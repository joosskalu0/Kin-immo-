import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  ShieldCheck,
  Sparkles,
  FileText,
  X,
  Send,
  EyeOff,
  Bell,
  Check,
  Layers,
  Image as ImageIcon,
  Video,
  Zap,
  Users,
  Loader2,
  Ban,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Invoice, SubscriptionPlan } from '../../types';
import {
  AUDIENCE_LABELS,
  compressProofImageFile,
  formatInvoiceStatusInfo,
  isLaunchAudience,
  mapCategoryToAudience,
  normalizePlan,
  resolveAccountBillingSummary
} from '../../utils/billingHelpers';
import { generatePaymentReceiptPDF } from '../../utils/pdfGenerator';

interface AccountBillingPortalProps {
  compact?: boolean;
}

export const AccountBillingPortal: React.FC<AccountBillingPortalProps> = ({ compact = false }) => {
  const {
    user,
    agencies,
    agents,
    agencyCollaborators,
    properties,
    propertyVideos,
    subscriptionPlans,
    paymentMethods,
    invoices,
    cdfExchangeRate,
    inAppBillingNotifications,
    markBillingNotificationRead,
    dismissBillingNotification,
    subscribeToPlan,
    submitManualPaymentProof
  } = useApp();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
  const [selectedPmId, setSelectedPmId] = useState<string>(() => paymentMethods.find((m) => m.is_active !== false)?.id || 'pm_mpesa');
  const [txReference, setTxReference] = useState<string>('');
  const [proofPreview, setProofPreview] = useState<string>('');
  const [isUploadingProof, setIsUploadingProof] = useState<boolean>(false);
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  const userAgency = useMemo(() => {
    if (!user) return undefined;
    return agencies.find(
      (a) =>
        a.id === user.agencyId ||
        (a.name && user.agencyName && a.name.toLowerCase() === user.agencyName.toLowerCase()) ||
        (a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [agencies, user]);

  const teamMembersCount = useMemo(() => {
    const agId = userAgency?.id || user?.agencyId;
    if (!agId) return 1;
    const count = agencyCollaborators.filter((c) => c.agencyId === agId).length;
    return Math.max(1, count);
  }, [agencyCollaborators, userAgency?.id, user?.agencyId]);

  const accountSummary = useMemo(() => {
    return resolveAccountBillingSummary({
      user,
      agency: userAgency,
      plans: subscriptionPlans,
      properties,
      propertyVideos,
      agents,
      collaboratorsCount: userAgency ? teamMembersCount : undefined
    });
  }, [userAgency, user, subscriptionPlans, properties, propertyVideos, agents, teamMembersCount]);

  const activePaymentMethods = useMemo(
    () => paymentMethods.filter((pm) => pm.is_active !== false),
    [paymentMethods]
  );

  const launchPlans = useMemo(() => {
    return subscriptionPlans
      .map((p) => normalizePlan(p, cdfExchangeRate))
      .filter((p) => {
        const audience = p.audience || mapCategoryToAudience(p.category, p.id);
        return p.isActive !== false && isLaunchAudience(audience);
      });
  }, [subscriptionPlans, cdfExchangeRate]);

  const myInvoices = useMemo(() => {
    if (!user) return [];
    const targetIds = new Set([user.id, user.agencyId, userAgency?.id].filter(Boolean));
    const userEmail = (user.email || '').toLowerCase();
    const agEmail = (userAgency?.email || '').toLowerCase();

    return [...invoices]
      .filter((inv) => {
        const anyInv = inv as any;
        const invUid = inv.targetId || anyInv.user_id;
        const invEmail = (inv.targetEmail || anyInv.user_email || '').toLowerCase();
        return (
          (invUid && targetIds.has(invUid)) ||
          (invEmail && (invEmail === userEmail || invEmail === agEmail))
        );
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [invoices, user, userAgency]);

  const myNotifications = useMemo(() => {
    if (!user) return [];
    const targetIds = new Set([user.id, user.agencyId, userAgency?.id].filter(Boolean));
    return inAppBillingNotifications.filter((n) => (n.userId ? targetIds.has(n.userId) : false));
  }, [inAppBillingNotifications, user, userAgency?.id]);

  const handleSelectPlan = async (plan: SubscriptionPlan, useTrial = false) => {
    setFeedback(null);
    setIsCreatingInvoice(true);
    try {
      const defaultPm = activePaymentMethods[0]?.id;
      const res = await subscribeToPlan(plan, billingCycle, defaultPm, useTrial);
      if (res.success && res.invoice) {
        setFeedback({ type: 'success', text: res.message || 'Opération effectuée.' });
        if (res.invoice.status === 'pending') {
          setCheckoutInvoice(res.invoice);
          setSelectedPmId(res.invoice.paymentMethodId || defaultPm || 'pm_mpesa');
          setTxReference('');
          setProofPreview('');
        }
      } else {
        setFeedback({ type: 'error', text: res.message || 'Impossible de générer la souscription.' });
      }
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingProof(true);
    try {
      const dataUrl = await compressProofImageFile(file);
      setProofPreview(dataUrl);
    } catch {
      setFeedback({ type: 'error', text: 'Impossible de traiter cette image. Utilisez un format JPG ou PNG.' });
    } finally {
      setIsUploadingProof(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutInvoice) return;
    if (!txReference.trim() && !proofPreview) {
      setFeedback({ type: 'error', text: 'Indiquez la référence de transaction Mobile Money ou joignez une capture.' });
      return;
    }

    setIsSubmittingProof(true);
    try {
      const res = await submitManualPaymentProof(checkoutInvoice.id, {
        paymentMethodId: selectedPmId,
        transactionReference: txReference.trim() || undefined,
        proofImageUrl: proofPreview || undefined
      });
      if (res.success) {
        setFeedback({
          type: 'success',
          text: res.message || 'Preuve transmise. Votre facture passe « en attente de validation ».'
        });
        setCheckoutInvoice(null);
        setTxReference('');
        setProofPreview('');
      }
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleDownloadReceipt = async (inv: Invoice) => {
    setDownloadingReceiptId(inv.id);
    try {
      await generatePaymentReceiptPDF(inv, cdfExchangeRate);
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const selectedPm = activePaymentMethods.find((m) => m.id === selectedPmId) || activePaymentMethods[0];
  const { plan, statusLabel, isExpired, isExpiringSoon, daysRemaining, usage, softHiddenCount, isTrialActive, cycle } = accountSummary;

  const quotaRows = [
    {
      label: 'Annonces actives',
      used: usage.activeListings,
      max: plan.maxListings,
      icon: Layers
    },
    {
      label: 'Photos / annonce',
      used: usage.maxPhotosPerListingUsed,
      max: plan.maxPhotos ?? 6,
      icon: ImageIcon
    },
    {
      label: 'Vidéos actives',
      used: usage.videosUsed,
      max: plan.maxVideos ?? 1,
      icon: Video
    },
    {
      label: 'Boosts inclus restants',
      used: accountSummary.includedBoostsRemaining,
      max: plan.includedBoosts ?? plan.featuredListings ?? 0,
      icon: Zap,
      isRemainingMetric: true
    },
    {
      label: 'Membres d\'équipe',
      used: usage.teamMembers,
      max: plan.agentAccounts ?? 1,
      icon: Users
    }
  ];

  return (
    <div className="space-y-6">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Soft Downgrade Preservation Alert */}
      {softHiddenCount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <EyeOff className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-300">
                Rétrogradation douce : {softHiddenCount} annonce(s) temporairement masquée(s)
              </p>
              <p className="text-slate-300 leading-relaxed">
                Vos {softHiddenCount} annonce(s) au-dessus du plafond du plan gratuit n&apos;ont <strong>jamais été supprimées</strong>. Elles réapparaîtront automatiquement dès le renouvellement de votre formule.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* In-app billing notifications */}
      {myNotifications.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Notifications de facturation ({myNotifications.filter((n) => !n.isRead).length} non lue(s))
            </span>
          </div>
          <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
            {myNotifications.slice(0, 5).map((notif) => (
              <div
                key={notif.id}
                className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                  notif.isRead ? 'bg-slate-950/50 border-slate-800/80 text-slate-400' : 'bg-slate-950 border-slate-700 text-slate-200'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-bold flex items-center gap-2">
                    {!notif.isRead && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                    <span>{notif.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">{notif.message}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={() => markBillingNotificationRead(notif.id)}
                      className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
                      title="Marquer comme lu"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => dismissBillingNotification(notif.id)}
                    className="p-1 text-slate-500 hover:text-white rounded"
                    title="Masquer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Plan & Real Quotas Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400">
                Formule actuelle • {AUDIENCE_LABELS[plan.audience || 'grand_public']}
              </span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                  isExpired
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : isExpiringSoon
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                }`}
              >
                {statusLabel}
              </span>
              {isTrialActive && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Essai gratuit
                </span>
              )}
            </div>
            <h3 className="text-lg font-black text-white">{plan.name}</h3>
            <p className="text-xs text-slate-400">
              Cycle : <span className="text-slate-200 font-semibold">{cycle === 'yearly' ? 'Annuel' : 'Mensuel'}</span>
              {accountSummary.expiresAt && (
                <>
                  {' • '}
                  {isExpired ? 'Expiré le ' : 'Valide jusqu’au '}
                  <span className="font-mono text-slate-200">
                    {new Date(accountSummary.expiresAt).toLocaleDateString('fr-FR')}
                  </span>
                  {daysRemaining !== null && !isExpired && ` (${daysRemaining} j restants)`}
                </>
              )}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <div className="text-xl font-black font-mono tabular-nums text-white">
              {plan.priceMonthly === 0
                ? 'Gratuit'
                : `${(cycle === 'yearly' ? (plan.priceYearly ?? plan.priceMonthly * 10) : plan.priceMonthly).toLocaleString()} USD`}
            </div>
            {plan.priceMonthly > 0 && (
              <div className="text-[11px] text-emerald-400 font-mono tabular-nums">
                ~{Math.round((cycle === 'yearly' ? (plan.priceYearly ?? plan.priceMonthly * 10) : plan.priceMonthly) * cdfExchangeRate).toLocaleString('fr-FR')} CDF / {cycle === 'yearly' ? 'an' : 'mois'}
              </div>
            )}
          </div>
        </div>

        {/* 5 Plan Quotas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {quotaRows.map((q) => {
            const Icon = q.icon;
            const pct = q.max > 0 ? Math.min(100, Math.round((q.used / q.max) * 100)) : 0;
            const atLimit = !q.isRemainingMetric && q.max > 0 && q.used >= q.max;
            return (
              <div key={q.label} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate">{q.label}</span>
                  <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                </div>
                <div className="flex items-baseline justify-between font-mono tabular-nums">
                  <span className={`text-sm font-black ${atLimit ? 'text-amber-400' : 'text-white'}`}>
                    {q.used}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    / {q.max >= 500 ? 'Illimité' : q.max}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${atLimit ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${q.max > 0 ? pct : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Upgrade / Renewal Selector */}
      {!compact && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-black text-white">Changer de formule ou renouveler</h4>
              <p className="text-xs text-slate-400">
                Paiement manuel Mobile Money (M-Pesa, Airtel Money, Orange Money) avec reçu PDF après validation.
              </p>
            </div>
            <div className="inline-flex p-1 rounded-xl bg-slate-950 border border-slate-800 self-start">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  billingCycle === 'monthly' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  billingCycle === 'yearly' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Annuel (-17%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {launchPlans.map((p) => {
              const isCurrent = p.id === plan.id && !isExpired;
              const priceUsd = billingCycle === 'yearly' ? (p.priceYearly ?? p.priceMonthly * 10) : p.priceMonthly;
              const priceCdf = Math.round(priceUsd * cdfExchangeRate);
              const trialDays = Number(p.trialDays || 0);

              return (
                <div
                  key={p.id}
                  className={`p-4 rounded-xl border flex flex-col justify-between space-y-4 ${
                    isCurrent
                      ? 'bg-slate-950 border-emerald-500/60'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {AUDIENCE_LABELS[p.audience || 'grand_public']}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          Actuel
                        </span>
                      )}
                    </div>
                    <h5 className="text-sm font-black text-white">{p.name}</h5>
                    <div>
                      <span className="text-xl font-black font-mono tabular-nums text-white">
                        {priceUsd === 0 ? 'Gratuit' : `${priceUsd} USD`}
                      </span>
                      {priceUsd > 0 && (
                        <span className="text-[11px] text-slate-400"> / {billingCycle === 'yearly' ? 'an' : 'mois'}</span>
                      )}
                      {priceUsd > 0 && (
                        <p className="text-[11px] font-mono tabular-nums text-emerald-400">
                          ~{priceCdf.toLocaleString('fr-FR')} CDF
                        </p>
                      )}
                    </div>

                    <ul className="space-y-1 text-[11px] text-slate-300 pt-2 border-t border-slate-800/80">
                      <li>• {p.maxListings >= 500 ? 'Annonces illimitées' : `${p.maxListings} annonces actives`}</li>
                      <li>• {p.maxPhotos ?? 6} photos / annonce • {p.maxVideos ?? 1} vidéo(s)</li>
                      <li>• {p.includedBoosts ?? p.featuredListings ?? 0} boost(s) inclus • {p.agentAccounts ?? 1} membre(s)</li>
                    </ul>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="button"
                      disabled={isCreatingInvoice}
                      onClick={() => handleSelectPlan(p, false)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${
                        isCurrent
                          ? 'bg-slate-800 hover:bg-slate-700 text-white'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>
                        {priceUsd === 0 ? 'Plan de base' : isCurrent ? 'Renouveler' : 'Choisir & Payer'}
                      </span>
                    </button>

                    {trialDays > 0 && priceUsd > 0 && !isCurrent && (
                      <button
                        type="button"
                        disabled={isCreatingInvoice}
                        onClick={() => handleSelectPlan(p, true)}
                        className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>Essai gratuit {trialDays} jours</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Invoices, Payment Proofs & Refunds History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-black text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Factures, Preuves Mobile Money & Reçus PDF
            </h4>
            <p className="text-xs text-slate-400">
              Historique complet de vos abonnements, boosts, remboursements et téléchargements de reçus.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 tabular-nums">{myInvoices.length} document(s)</span>
        </div>

        {myInvoices.length === 0 ? (
          <div className="p-8 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-400">
            Aucune facture enregistrée sur ce compte pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase text-slate-400">
                  <th className="py-2.5 px-3">Facture</th>
                  <th className="py-2.5 px-3">Objet</th>
                  <th className="py-2.5 px-3">Montant</th>
                  <th className="py-2.5 px-3">Statut</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {myInvoices.map((inv) => {
                  const anyInv = inv as any;
                  const invNum = inv.invoiceNumber || anyInv.invoice_number || inv.id;
                  const amount = Number(inv.totalAmount ?? anyInv.amount ?? 0);
                  const amountCdf = Number(inv.totalAmountCDF ?? anyInv.amount_cdf ?? Math.round(amount * cdfExchangeRate));
                  const st = formatInvoiceStatusInfo(inv.status);
                  const canPay = inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'rejected';
                  const canReceipt = inv.status === 'paid' || inv.status === 'refunded';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-950/60">
                      <td className="py-3 px-3 align-top">
                        <div className="font-mono font-bold text-white">{invNum}</div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(inv.createdAt || anyInv.created_at || Date.now()).toLocaleDateString('fr-FR')}
                        </div>
                        {inv.receiptNumber && (
                          <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                            Reçu: {inv.receiptNumber}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top">
                        <div className="font-semibold text-slate-200">
                          {inv.planName || anyInv.plan_name || anyInv.option_name || inv.items?.[0]?.description || 'Abonnement Kinimmo'}
                        </div>
                        {inv.transactionReference && (
                          <div className="text-[11px] text-slate-400 font-mono">
                            Réf: {inv.transactionReference}
                          </div>
                        )}
                        {inv.rejectionReason && (
                          <div className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                            <Ban className="w-3 h-3 shrink-0" />
                            <span>Motif : {inv.rejectionReason}</span>
                          </div>
                        )}
                        {inv.status === 'refunded' && inv.refundNote && (
                          <div className="mt-1 text-[11px] text-purple-300 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3 shrink-0" />
                            <span>
                              Remboursé ({inv.refundAction === 'keep' ? 'Plan maintenu' : 'Plan révoqué'}) : {inv.refundNote}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 align-top font-mono tabular-nums">
                        <div className="font-bold text-white">${amount.toLocaleString()}</div>
                        <div className="text-[11px] text-slate-400">{amountCdf.toLocaleString('fr-FR')} FC</div>
                      </td>
                      <td className="py-3 px-3 align-top">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            st.tone === 'emerald'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : st.tone === 'blue'
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                              : st.tone === 'amber'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : st.tone === 'rose'
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 align-top text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {canPay && (
                            <button
                              type="button"
                              onClick={() => {
                                setCheckoutInvoice(inv);
                                setSelectedPmId(inv.paymentMethodId || activePaymentMethods[0]?.id || 'pm_mpesa');
                                setTxReference(inv.transactionReference || '');
                                setProofPreview(inv.proofImageUrl || '');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              <span>{inv.status === 'rejected' ? 'Renvoyer preuve' : 'Payer & Preuve'}</span>
                            </button>
                          )}
                          {inv.status === 'awaiting_validation' && (
                            <span className="text-[11px] text-blue-300 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Contrôle admin
                            </span>
                          )}
                          {canReceipt && (
                            <button
                              type="button"
                              disabled={downloadingReceiptId === inv.id}
                              onClick={() => handleDownloadReceipt(inv)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-[11px] inline-flex items-center gap-1"
                            >
                              {downloadingReceiptId === inv.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Download className="w-3 h-3 text-emerald-400" />
                              )}
                              <span>Reçu PDF</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Money Manual Checkout Modal */}
      {checkoutInvoice && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Paiement Manuel Mobile Money
                </span>
                <h4 className="text-base font-black text-white mt-0.5">
                  Facture {checkoutInvoice.invoiceNumber}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5 font-mono tabular-nums">
                  Montant dû : <strong className="text-white">${checkoutInvoice.totalAmount} USD</strong> (~
                  {(checkoutInvoice.totalAmountCDF ?? Math.round(checkoutInvoice.totalAmount * cdfExchangeRate)).toLocaleString('fr-FR')} CDF)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutInvoice(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitProof} className="space-y-4">
              {/* Dynamic Admin-configured Operators */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  1. Choisissez l&apos;opérateur et effectuez le dépôt :
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {activePaymentMethods.map((pm) => (
                    <button
                      type="button"
                      key={pm.id}
                      onClick={() => setSelectedPmId(pm.id)}
                      className={`p-3 rounded-xl border text-left transition-colors ${
                        selectedPmId === pm.id
                          ? 'bg-emerald-500/10 border-emerald-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs">{pm.account_name}</span>
                        <span className="font-mono text-xs text-emerald-400 font-bold">{pm.account_number}</span>
                      </div>
                      {pm.merchant_code && (
                        <div className="text-[11px] text-amber-300 font-mono mt-0.5">
                          Code Marchand : {pm.merchant_code}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {selectedPm && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Instructions ({selectedPm.account_name})
                  </div>
                  <p className="leading-relaxed text-slate-400">
                    {selectedPm.instructions || 'Effectuez le transfert du montant exact puis indiquez votre ID de transaction.'}
                  </p>
                </div>
              )}

              {/* Transaction Reference */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  2. Référence / ID de la transaction Mobile Money *
                </label>
                <input
                  type="text"
                  value={txReference}
                  onChange={(e) => setTxReference(e.target.value)}
                  placeholder="Ex: MP261119.1422.B90123 ou ID SMS opérateur"
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Optional Proof Screenshot */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  3. Capture d&apos;écran / Bordereau (optionnel)
                </label>
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-950 border border-dashed border-slate-700 hover:border-emerald-500/60 cursor-pointer text-xs text-slate-300">
                  {isUploadingProof ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <Upload className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>{proofPreview ? 'Capture jointe (cliquez pour remplacer)' : 'Joindre une capture PNG/JPG'}</span>
                  <input type="file" accept="image/*" onChange={handleProofFileChange} className="hidden" />
                </label>
                {proofPreview && (
                  <div className="mt-2 relative w-32 h-20 rounded-lg overflow-hidden border border-slate-700">
                    <img src={proofPreview} alt="Capture preuve" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setProofPreview('')}
                      className="absolute top-1 right-1 p-0.5 rounded bg-slate-950/80 text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCheckoutInvoice(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProof || isUploadingProof}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingProof ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Soumettre pour validation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
