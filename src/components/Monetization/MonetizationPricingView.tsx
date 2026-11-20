import React, { useState, useEffect, useMemo } from 'react';
import { SubscriptionPlan, VisibilityOption, Invoice } from '../../types';
import { mysqlApi } from '../../services/mysqlApi';
import { useApp } from '../../context/AppContext';
import {
  Check,
  Sparkles,
  Zap,
  Building2,
  Home,
  Briefcase,
  ArrowRight,
  Loader2,
  Upload,
  CheckCircle2,
  X,
  Download
} from 'lucide-react';
import {
  AUDIENCE_LABELS,
  compressProofImageFile,
  isLaunchAudience,
  mapCategoryToAudience,
  normalizePlan
} from '../../utils/billingHelpers';
import { generatePaymentReceiptPDF } from '../../utils/pdfGenerator';

export const MonetizationPricingView: React.FC = () => {
  const {
    user,
    setIsAuthModalOpen,
    subscriptionPlans,
    paymentMethods,
    cdfExchangeRate,
    subscribeToPlan,
    submitManualPaymentProof
  } = useApp();

  const [visibilityOptions, setVisibilityOptions] = useState<VisibilityOption[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'grand_public' | 'agence' | 'boosts'>('all');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [useTrialMode, setUseTrialMode] = useState<boolean>(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('pm_mpesa');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState<Invoice | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  const [txReference, setTxReference] = useState<string>('');
  const [proofPreview, setProofPreview] = useState<string>('');
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);
  const [proofSubmitted, setProofSubmitted] = useState<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    mysqlApi
      .getVisibilityOptions()
      .then((res) => {
        if (res.success && res.options) setVisibilityOptions(res.options);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const activePaymentMethods = useMemo(
    () => paymentMethods.filter((pm) => pm.is_active !== false),
    [paymentMethods]
  );

  useEffect(() => {
    if (activePaymentMethods.length > 0 && !activePaymentMethods.some((m) => m.id === selectedPaymentMethodId)) {
      setSelectedPaymentMethodId(activePaymentMethods[0].id);
    }
  }, [activePaymentMethods, selectedPaymentMethodId]);

  // Seuls les plans grand public et agence actifs sont affichés au lancement
  const launchPlans = useMemo(() => {
    return subscriptionPlans
      .map((p) => normalizePlan(p, cdfExchangeRate))
      .filter((p) => {
        const audience = p.audience || mapCategoryToAudience(p.category, p.id);
        return p.isActive !== false && isLaunchAudience(audience);
      });
  }, [subscriptionPlans, cdfExchangeRate]);

  const filteredPlans = useMemo(() => {
    return launchPlans.filter((p) => {
      const audience = p.audience || mapCategoryToAudience(p.category, p.id);
      if (activeTab === 'all') return true;
      if (activeTab === 'grand_public') return audience === 'grand_public';
      if (activeTab === 'agence') return audience === 'agence';
      return false;
    });
  }, [launchPlans, activeTab]);

  const handleSelectPlan = (plan: SubscriptionPlan, isTrial = false) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setSelectedPlan(plan);
    setUseTrialMode(isTrial);
    setSubscribeSuccess(null);
    setSubscribeError(null);
    setTxReference('');
    setProofPreview('');
    setProofSubmitted(false);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlan) return;
    setIsSubscribing(true);
    setSubscribeError(null);
    try {
      const res = await subscribeToPlan(selectedPlan, billingCycle, selectedPaymentMethodId, useTrialMode);
      if (res.success && res.invoice) {
        setSubscribeSuccess(res.invoice);
      } else {
        setSubscribeError(res.message || 'Impossible de créer la souscription.');
      }
    } catch (err: any) {
      setSubscribeError(err?.message || 'Erreur lors de la création de facture.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressProofImageFile(file);
      setProofPreview(dataUrl);
    } catch {
      setSubscribeError('Format image invalide.');
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribeSuccess) return;
    if (!txReference.trim() && !proofPreview) {
      setSubscribeError('Veuillez indiquer la référence Mobile Money ou joindre une capture.');
      return;
    }
    setIsSubmittingProof(true);
    setSubscribeError(null);
    try {
      const res = await submitManualPaymentProof(subscribeSuccess.id, {
        paymentMethodId: selectedPaymentMethodId,
        transactionReference: txReference.trim() || undefined,
        proofImageUrl: proofPreview || undefined
      });
      if (res.success) {
        setProofSubmitted(true);
      }
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const selectedMethod = activePaymentMethods.find((m) => m.id === selectedPaymentMethodId) || activePaymentMethods[0];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Offres Kinimmo RDC — Paiement Mobile Money</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Plans Grand Public & Agences Immobilières
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Choisissez la formule mensuelle ou annuelle adaptée à votre activité à Kinshasa. Essai gratuit configurable et paiement manuel sécurisé via M-Pesa, Airtel Money ou Orange Money.
          </p>

          {/* Audience Tabs + Cycle Toggle */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { id: 'all', label: 'Toutes les offres' },
                { id: 'grand_public', label: 'Grand Public', icon: Home },
                { id: 'agence', label: 'Agences', icon: Building2 },
                { id: 'boosts', label: 'Boosts à la carte', icon: Zap }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab !== 'boosts' && (
              <div className="inline-flex p-1 rounded-xl bg-white border border-slate-200">
                <button
                  type="button"
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    billingCycle === 'monthly' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    billingCycle === 'yearly' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Annuel (-17%)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Plans Grid */}
        {activeTab !== 'boosts' && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPlans.map((plan) => {
                  const audience = plan.audience || mapCategoryToAudience(plan.category, plan.id);
                  const isAgency = audience === 'agence';
                  const priceUsd =
                    billingCycle === 'yearly'
                      ? Number(plan.priceYearly ?? plan.priceMonthly * 10)
                      : Number(plan.priceMonthly ?? 0);
                  const priceCdf = Math.round(priceUsd * cdfExchangeRate);
                  const isFree = priceUsd === 0;
                  const trialDays = Number(plan.trialDays || 0);

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-2xl bg-white border p-6 flex flex-col justify-between transition-shadow hover:shadow-lg ${
                        plan.recommended
                          ? 'border-emerald-600 ring-1 ring-emerald-600/20'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                            {AUDIENCE_LABELS[audience]}
                          </span>
                          {isAgency ? (
                            <Building2 className="w-5 h-5 text-emerald-600" />
                          ) : priceUsd > 0 ? (
                            <Briefcase className="w-5 h-5 text-slate-700" />
                          ) : (
                            <Home className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        <div>
                          <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>
                          <p className="text-xs text-slate-500 mt-1 min-h-[34px]">
                            {plan.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex items-baseline gap-1 font-mono tabular-nums">
                            <span className="text-3xl font-black text-slate-900">
                              {isFree ? 'Gratuit' : `${priceUsd} $`}
                            </span>
                            {!isFree && (
                              <span className="text-xs text-slate-500">
                                / {billingCycle === 'yearly' ? 'an' : 'mois'}
                              </span>
                            )}
                          </div>
                          {!isFree && (
                            <span className="text-[11px] font-mono tabular-nums text-emerald-700 font-bold block mt-0.5">
                              ~{priceCdf.toLocaleString('fr-FR')} CDF
                            </span>
                          )}
                        </div>

                        {/* 5 Limits explicitly displayed */}
                        <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-mono tabular-nums text-slate-700">
                          <div>Annonces : <strong>{plan.maxListings}</strong></div>
                          <div>Photos/bien : <strong>{plan.maxPhotos ?? 6}</strong></div>
                          <div>Vidéos : <strong>{plan.maxVideos ?? 1}</strong></div>
                          <div>Boosts inclus : <strong>{plan.includedBoosts ?? plan.featuredListings ?? 0}</strong></div>
                          <div className="col-span-2">Membres d&apos;équipe : <strong>{plan.agentAccounts ?? 1}</strong></div>
                        </div>

                        <ul className="space-y-2 pt-1 text-xs text-slate-600">
                          {(plan.features || []).map((feat, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-6 mt-6 border-t border-slate-100 space-y-2">
                        <button
                          type="button"
                          onClick={() => handleSelectPlan(plan, false)}
                          className={`w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-colors ${
                            plan.recommended
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <span>{isFree ? 'Activer gratuitement' : 'Choisir ce plan'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>

                        {!isFree && trialDays > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(plan, true)}
                            className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center justify-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Démarrer l&apos;essai gratuit ({trialDays} jours)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Visibility Options */}
        {(activeTab === 'all' || activeTab === 'boosts') && (
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 space-y-5">
            <div>
              <span className="text-xs font-black uppercase text-amber-700 tracking-wider inline-flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> Options de Visibilité à la Carte
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1">
                Boosts Immédiats pour Annonces
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibilityOptions.map((opt) => (
                <div key={opt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm text-slate-900">{opt.name}</span>
                      <span className="text-[11px] font-mono text-slate-500">{opt.duration_days} j</span>
                    </div>
                    <p className="text-xs text-slate-600">{opt.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between font-mono tabular-nums">
                    <span className="text-sm font-black text-emerald-700">
                      {Number(opt.price_usd ?? (opt as any).price ?? 0)} USD
                    </span>
                    <span className="text-[11px] text-slate-500">
                      ~{Math.round(Number(opt.price_usd ?? 0) * cdfExchangeRate).toLocaleString('fr-FR')} CDF
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Souscription + Preuve Mobile Money */}
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[92vh] overflow-y-auto">
              <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    {useTrialMode ? 'Essai Gratuit' : `Souscription ${billingCycle === 'yearly' ? 'Annuelle' : 'Mensuelle'}`}
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5">{selectedPlan.name}</h3>
                  <p className="text-xs text-slate-300 mt-0.5 font-mono tabular-nums">
                    {useTrialMode
                      ? `0 USD pendant ${selectedPlan.trialDays || 7} jours`
                      : `${billingCycle === 'yearly' ? (selectedPlan.priceYearly ?? selectedPlan.priceMonthly * 10) : selectedPlan.priceMonthly} USD (~${Math.round(
                          (billingCycle === 'yearly' ? (selectedPlan.priceYearly ?? selectedPlan.priceMonthly * 10) : selectedPlan.priceMonthly) *
                            cdfExchangeRate
                        ).toLocaleString('fr-FR')} CDF)`}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedPlan(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {subscribeError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                    {subscribeError}
                  </div>
                )}

                {!subscribeSuccess ? (
                  <>
                    {!useTrialMode && Number(selectedPlan.priceMonthly) > 0 && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700">
                          Opérateur Mobile Money pour le règlement :
                        </label>
                        {activePaymentMethods.map((pm) => (
                          <button
                            type="button"
                            key={pm.id}
                            onClick={() => setSelectedPaymentMethodId(pm.id)}
                            className={`w-full p-3 rounded-xl border text-left text-xs ${
                              selectedPaymentMethodId === pm.id
                                ? 'border-emerald-600 bg-emerald-50/70'
                                : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold text-slate-900">
                              <span>{pm.account_name}</span>
                              <span className="font-mono text-emerald-700">{pm.account_number}</span>
                            </div>
                            {pm.merchant_code && (
                              <div className="text-[11px] font-mono text-amber-800">Code Marchand : {pm.merchant_code}</div>
                            )}
                            {pm.instructions && (
                              <div className="text-[11px] text-slate-600 mt-1">{pm.instructions}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(null)}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSubscription}
                        disabled={isSubscribing}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubscribing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>
                              {useTrialMode || Number(selectedPlan.priceMonthly) === 0
                                ? 'Activer maintenant'
                                : 'Générer ma facture'}
                            </span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : subscribeSuccess.status === 'paid' ? (
                  <div className="text-center py-4 space-y-4">
                    <CheckCircle2 className="w-11 h-11 text-emerald-600 mx-auto" />
                    <div>
                      <h4 className="font-black text-base text-slate-900">
                        Forfait activé ({subscribeSuccess.invoiceNumber})
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Votre abonnement est actif immédiatement jusqu&apos;au{' '}
                        <strong className="font-mono">{subscribeSuccess.periodEnd || subscribeSuccess.dueDate}</strong>.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => generatePaymentReceiptPDF(subscribeSuccess, { cdfExchangeRate })}
                        className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Reçu PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(null)}
                        className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                      >
                        Terminer
                      </button>
                    </div>
                  </div>
                ) : proofSubmitted ? (
                  <div className="text-center py-4 space-y-4">
                    <CheckCircle2 className="w-11 h-11 text-blue-600 mx-auto" />
                    <div>
                      <h4 className="font-black text-base text-slate-900">
                        Facture en attente de validation
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Votre référence Mobile Money pour la facture <strong>{subscribeSuccess.invoiceNumber}</strong> a été transmise à l&apos;administration Kinimmo. Votre reçu PDF sera disponible dès validation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan(null)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
                    >
                      Fermer
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitProof} className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                      <p className="font-black text-amber-900">
                        Facture {subscribeSuccess.invoiceNumber} générée — {subscribeSuccess.totalAmount} USD (~
                        {Number(subscribeSuccess.totalAmountCDF || subscribeSuccess.totalAmount * cdfExchangeRate).toLocaleString('fr-FR')} CDF)
                      </p>
                      {selectedMethod && (
                        <p className="text-amber-800">
                          Transférez le montant sur <strong>{selectedMethod.account_name}</strong> ({selectedMethod.account_number}
                          {selectedMethod.merchant_code ? ` • Code ${selectedMethod.merchant_code}` : ''}) puis saisissez votre référence ci-dessous.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Référence / ID de transaction *
                      </label>
                      <input
                        type="text"
                        value={txReference}
                        onChange={(e) => setTxReference(e.target.value)}
                        placeholder="Ex: MP261119.1502.A8812"
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-mono text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Capture de paiement (optionnel)
                      </label>
                      <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-dashed border-slate-300 cursor-pointer text-xs text-slate-600 hover:bg-slate-50">
                        <Upload className="w-4 h-4 text-emerald-600" />
                        <span>{proofPreview ? 'Capture prête (cliquez pour changer)' : 'Joindre une capture JPG/PNG'}</span>
                        <input type="file" accept="image/*" onChange={handleProofFileChange} className="hidden" />
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(null)}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                      >
                        Payer plus tard
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingProof}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingProof && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>Envoyer ma preuve</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
