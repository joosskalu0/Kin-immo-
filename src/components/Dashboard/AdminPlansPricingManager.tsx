import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PlanAudience, SubscriptionPlan } from '../../types';
import { formatAdminDateFR } from '../../utils/currency';
import { AUDIENCE_LABELS, isLaunchAudience, normalizePlan } from '../../utils/billingHelpers';
import {
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Save,
  RefreshCw,
  Coins,
  DollarSign,
  ArrowRightLeft,
  X,
  Star,
  EyeOff,
  Clock
} from 'lucide-react';

export const AdminPlansPricingManager: React.FC = () => {
  const {
    subscriptionPlans,
    updateSubscriptionPlan,
    addSubscriptionPlan,
    deleteSubscriptionPlan,
    pricingDisplayCurrency,
    setPricingDisplayCurrency,
    cdfExchangeRate,
    cdfExchangeRateUpdatedAt,
    setCdfExchangeRate,
    requestConfirm
  } = useApp();

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<SubscriptionPlan | null>(null);
  const [exchangeRateInput, setExchangeRateInput] = useState<number>(cdfExchangeRate || 2850);
  const [newFeatureInput, setNewFeatureInput] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isSavingRate, setIsSavingRate] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  useEffect(() => {
    if (cdfExchangeRate && cdfExchangeRate > 0) {
      setExchangeRateInput(cdfExchangeRate);
    }
  }, [cdfExchangeRate]);

  // New Plan State
  const [newPlan, setNewPlan] = useState<SubscriptionPlan>(() =>
    normalizePlan(
      {
        id: `plan_${Date.now()}`,
        name: 'Nouveau Pack Kinshasa',
        description: 'Formule personnalisée Kinimmo RDC.',
        audience: 'grand_public',
        priceMonthly: 49,
        priceMonthlyCDF: Math.round(49 * (cdfExchangeRate || 2850)),
        priceYearly: 490,
        priceYearlyCDF: Math.round(490 * (cdfExchangeRate || 2850)),
        currency: 'USD',
        billingPeriod: 'month',
        trialDays: 7,
        maxListings: 30,
        maxPhotos: 15,
        maxVideos: 5,
        includedBoosts: 4,
        featuredListings: 4,
        agentAccounts: 1,
        recommended: false,
        isActive: true,
        features: [
          "Jusqu'à 30 annonces actives",
          '15 photos par bien & 5 vidéos',
          '4 boosts inclus',
          'Support client prioritaire'
        ]
      },
      cdfExchangeRate || 2850
    )
  );

  const showNotification = (msg: string) => {
    setErrorToast(null);
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const showErrorNotification = (msg: string) => {
    setSuccessToast(null);
    setErrorToast(msg);
    setTimeout(() => setErrorToast(null), 5000);
  };

  const handleStartEdit = (plan: SubscriptionPlan) => {
    const normalized = normalizePlan(plan, exchangeRateInput || 2850);
    setEditingPlanId(plan.id);
    setEditFormData({
      ...normalized,
      priceMonthlyCDF: normalized.priceMonthlyCDF ?? Math.round(normalized.priceMonthly * exchangeRateInput),
      priceYearly: normalized.priceYearly ?? Math.round(normalized.priceMonthly * 10),
      priceYearlyCDF:
        normalized.priceYearlyCDF ?? Math.round((normalized.priceYearly ?? normalized.priceMonthly * 10) * exchangeRateInput)
    });
    setNewFeatureInput('');
  };

  const handleCancelEdit = () => {
    setEditingPlanId(null);
    setEditFormData(null);
    setNewFeatureInput('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData) return;

    const cleanPlan = normalizePlan(
      {
        ...editFormData,
        featuredListings: editFormData.includedBoosts ?? editFormData.featuredListings ?? 0,
        includedBoosts: editFormData.includedBoosts ?? editFormData.featuredListings ?? 0
      },
      exchangeRateInput || 2850
    );
    updateSubscriptionPlan(cleanPlan);
    setEditingPlanId(null);
    setEditFormData(null);
    showNotification(`Tarifs, quotas et audience de "${cleanPlan.name}" mis à jour avec succès !`);
  };

  const handleSaveExchangeRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(exchangeRateInput);
    if (!Number.isFinite(rate) || rate <= 0) {
      showErrorNotification('Veuillez saisir un taux de change USD/CDF valide (> 0).');
      return;
    }
    setIsSavingRate(true);
    try {
      const res = await setCdfExchangeRate(rate);
      if (res?.success) {
        showNotification(`Taux de change mis à jour : 1 USD = ${rate.toLocaleString('fr-FR')} FC et synchronisé dans MySQL.`);
      } else {
        showErrorNotification(res?.error || res?.message || 'Impossible de sauvegarder le taux dans MySQL.');
      }
    } finally {
      setIsSavingRate(false);
    }
  };

  const handleConvertUsdToCdf = () => {
    if (!editFormData) return;
    const rate = exchangeRateInput > 0 ? exchangeRateInput : 2850;
    const usd = Number(editFormData.priceMonthly) || 0;
    const yearlyUsd = Number(editFormData.priceYearly ?? usd * 10) || 0;
    setEditFormData({
      ...editFormData,
      priceMonthlyCDF: Math.round(usd * rate),
      priceYearlyCDF: Math.round(yearlyUsd * rate)
    });
  };

  const handleConvertCdfToUsd = () => {
    if (!editFormData) return;
    const rate = exchangeRateInput > 0 ? exchangeRateInput : 2850;
    const cdf = Number(editFormData.priceMonthlyCDF) || 0;
    const yearlyCdf = Number(editFormData.priceYearlyCDF ?? cdf * 10) || 0;
    setEditFormData({
      ...editFormData,
      priceMonthly: Math.round(cdf / rate),
      priceYearly: Math.round(yearlyCdf / rate)
    });
  };

  const handleAddFeatureToEdit = () => {
    if (!newFeatureInput.trim() || !editFormData) return;
    setEditFormData({
      ...editFormData,
      features: [...editFormData.features, newFeatureInput.trim()]
    });
    setNewFeatureInput('');
  };

  const handleRemoveFeatureFromEdit = (index: number) => {
    if (!editFormData) return;
    setEditFormData({
      ...editFormData,
      features: editFormData.features.filter((_, i) => i !== index)
    });
  };

  const handleCreateNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = exchangeRateInput > 0 ? exchangeRateInput : 2850;
    const rawUsd = Number(newPlan.priceMonthly) || 0;
    const rawCdf = Number(newPlan.priceMonthlyCDF) || Math.round(rawUsd * rate);
    const yearlyUsd = Number(newPlan.priceYearly ?? rawUsd * 10) || 0;
    const yearlyCdf = Number(newPlan.priceYearlyCDF ?? Math.round(yearlyUsd * rate)) || 0;

    const planToSave = normalizePlan(
      {
        ...newPlan,
        id: `plan_${Date.now()}`,
        priceMonthly: rawUsd,
        priceMonthlyCDF: rawCdf,
        priceYearly: yearlyUsd,
        priceYearlyCDF: yearlyCdf,
        maxListings: Number(newPlan.maxListings) || 1,
        maxPhotos: Number(newPlan.maxPhotos) || 5,
        maxVideos: Number(newPlan.maxVideos) || 0,
        includedBoosts: Number(newPlan.includedBoosts ?? newPlan.featuredListings) || 0,
        featuredListings: Number(newPlan.includedBoosts ?? newPlan.featuredListings) || 0,
        agentAccounts: Number(newPlan.agentAccounts) || 1,
        trialDays: Number(newPlan.trialDays) || 0
      },
      rate
    );

    addSubscriptionPlan(planToSave);
    setShowAddModal(false);
    showNotification(`Nouvelle formule "${planToSave.name}" créée avec succès !`);
  };

  return (
    <div className="space-y-6">
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header & Main Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 shadow-lg">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl font-black text-white">Plans, Audiences & Tarifs (USD / CDF)</h3>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                  Paramètres Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Seules les audiences <strong>Grand Public</strong> et <strong>Agences</strong> sont publiées au lancement ; Promoteur et Entreprise restent en brouillon admin.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une Formule</span>
            </button>
          </div>
        </div>

        {/* Currency & Exchange Rate Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Devise d&apos;Affichage Principale (Public & Agents)</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">Actif: {pricingDisplayCurrency}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPricingDisplayCurrency('CDF');
                  showNotification('Affichage public réglé sur : Franc Congolais (CDF / FC)');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  pricingDisplayCurrency === 'CDF'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                🇨🇩 Francs (FC)
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricingDisplayCurrency('BOTH');
                  showNotification('Affichage public réglé sur : Double devise (FC + USD)');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  pricingDisplayCurrency === 'BOTH'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                🔄 Double (FC + USD)
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricingDisplayCurrency('USD');
                  showNotification('Affichage public réglé sur : Dollars USD ($)');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  pricingDisplayCurrency === 'USD'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                💵 Dollars ($ USD)
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Définit la présentation des montants sur la page tarifs, l&apos;espace pro et les factures.
            </p>
          </div>

          <form onSubmit={handleSaveExchangeRate} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span>Taux de Change Indicatif (1 USD = ? FC)</span>
              </label>
              <span className="text-[10px] text-amber-400/90 font-mono font-bold">
                1 USD = {cdfExchangeRate.toLocaleString()} CDF
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  step="10"
                  value={isNaN(exchangeRateInput) ? '' : exchangeRateInput}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setExchangeRateInput(isNaN(val) ? 0 : val);
                  }}
                  className="w-full pl-3 pr-14 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold font-mono focus:outline-none focus:border-amber-500"
                  placeholder="2850"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[11px] font-bold">
                  CDF / $
                </span>
              </div>
              <button
                type="submit"
                disabled={isSavingRate}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingRate ? 'Enregistrement...' : 'Appliquer'}</span>
              </button>
            </div>
            {errorToast && (
              <p className="text-[11px] font-bold text-rose-400">{errorToast}</p>
            )}
            <p className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
              <span>Sert aux conversions annonces, factures et reçus PDF.</span>
              <span className="text-amber-400/80 font-semibold shrink-0">
                MAJ : {formatAdminDateFR(cdfExchangeRateUpdatedAt)}
              </span>
            </p>
          </form>
        </div>
      </div>

      {/* Plans List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subscriptionPlans.map((rawPlan) => {
          const plan = normalizePlan(rawPlan, cdfExchangeRate || 2850);
          const isEditing = editingPlanId === plan.id;
          const cdfPrice = plan.priceMonthlyCDF ?? Math.round(plan.priceMonthly * cdfExchangeRate);
          const yearlyUsd = plan.priceYearly ?? Math.round(plan.priceMonthly * 10);
          const audience = plan.audience || 'grand_public';
          const isDraft = plan.isActive === false || !isLaunchAudience(audience);

          if (isEditing && editFormData) {
            return (
              <form
                key={plan.id}
                onSubmit={handleSaveEdit}
                className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 space-y-4 shadow-2xl relative"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-black text-white text-xs uppercase tracking-wider">Modifier la Formule</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Plan Name + Description */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Nom du Pack</label>
                    <input
                      type="text"
                      required
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Description courte</label>
                    <input
                      type="text"
                      value={editFormData.description || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Audience + Trial Days + Draft Toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Audience cible</label>
                    <select
                      value={editFormData.audience || 'grand_public'}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          audience: e.target.value as PlanAudience
                        })
                      }
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-semibold"
                    >
                      {Object.entries(AUDIENCE_LABELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Essai gratuit (jours)</label>
                    <input
                      type="number"
                      min="0"
                      value={isNaN(editFormData.trialDays ?? 0) ? 0 : editFormData.trialDays ?? 0}
                      onChange={(e) => setEditFormData({ ...editFormData, trialDays: Number(e.target.value) || 0 })}
                      className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Pricing Fields Monthly & Yearly (USD + CDF) */}
                <div className="space-y-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Mensuel USD ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={isNaN(editFormData.priceMonthly) ? '' : editFormData.priceMonthly}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 0;
                          setEditFormData({ ...editFormData, priceMonthly: val });
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-400 mb-1">Mensuel CDF (FC)</label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={isNaN(editFormData.priceMonthlyCDF ?? 0) ? '' : editFormData.priceMonthlyCDF ?? 0}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, priceMonthlyCDF: Number(e.target.value) || 0 })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-300 mb-1">Annuel USD ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={isNaN(editFormData.priceYearly ?? 0) ? '' : editFormData.priceYearly ?? 0}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, priceYearly: Number(e.target.value) || 0 })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-400 mb-1">Annuel CDF (FC)</label>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={isNaN(editFormData.priceYearlyCDF ?? 0) ? '' : editFormData.priceYearlyCDF ?? 0}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, priceYearlyCDF: Number(e.target.value) || 0 })
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <button
                      type="button"
                      onClick={handleConvertUsdToCdf}
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Calculer CDF depuis USD
                    </button>
                    <button
                      type="button"
                      onClick={handleConvertCdfToUsd}
                      className="text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Calculer USD depuis CDF
                    </button>
                  </div>
                </div>

                {/* 5 Quotas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Annonces actives</label>
                    <input
                      type="number"
                      min="1"
                      value={isNaN(editFormData.maxListings) ? '' : editFormData.maxListings}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, maxListings: Number(e.target.value) || 1 })
                      }
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Photos / annonce</label>
                    <input
                      type="number"
                      min="1"
                      value={isNaN(editFormData.maxPhotos ?? 5) ? '' : editFormData.maxPhotos ?? 5}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, maxPhotos: Number(e.target.value) || 1 })
                      }
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Vidéos max</label>
                    <input
                      type="number"
                      min="0"
                      value={isNaN(editFormData.maxVideos ?? 0) ? '' : editFormData.maxVideos ?? 0}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, maxVideos: Number(e.target.value) || 0 })
                      }
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Boosts inclus</label>
                    <input
                      type="number"
                      min="0"
                      value={
                        isNaN(editFormData.includedBoosts ?? editFormData.featuredListings)
                          ? ''
                          : editFormData.includedBoosts ?? editFormData.featuredListings
                      }
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setEditFormData({ ...editFormData, includedBoosts: val, featuredListings: val });
                      }}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Membres d&apos;équipe</label>
                    <input
                      type="number"
                      min="1"
                      value={isNaN(editFormData.agentAccounts) ? '' : editFormData.agentAccounts}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, agentAccounts: Number(e.target.value) || 1 })
                      }
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-300">Fonctionnalités Incluses</label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {editFormData.features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-1.5 bg-slate-950 rounded-lg text-[11px] text-slate-300"
                      >
                        <span className="truncate">• {feat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeatureFromEdit(idx)}
                          className="text-rose-400 hover:text-rose-300 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={newFeatureInput}
                      onChange={(e) => setNewFeatureInput(e.target.value)}
                      placeholder="Ajouter une fonctionnalité..."
                      className="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddFeatureToEdit}
                      className="p-1.5 bg-emerald-500 text-slate-950 font-bold rounded-lg hover:bg-emerald-400 text-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isActive !== false}
                      onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300 font-semibold">
                      Publié publiquement (décocher = Brouillon Admin)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.recommended || false}
                      onChange={(e) => setEditFormData({ ...editFormData, recommended: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-xs text-slate-300 font-semibold">
                      Mettre en avant comme « Formule Recommandée »
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Sauvegarder</span>
                  </button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={plan.id}
              className={`p-6 rounded-3xl border text-xs flex flex-col justify-between space-y-5 relative transition-all ${
                isDraft
                  ? 'bg-slate-900/60 border-slate-800 border-dashed opacity-90'
                  : plan.recommended
                  ? 'bg-slate-900 border-emerald-500/80 shadow-xl shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {plan.recommended && !isDraft && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-[10px] uppercase flex items-center gap-1">
                  <Star className="w-3 h-3 fill-slate-950" /> Recommandé
                </span>
              )}

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-bold uppercase text-slate-300">
                        {AUDIENCE_LABELS[audience]}
                      </span>
                      {isDraft ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold inline-flex items-center gap-1">
                          <EyeOff className="w-3 h-3" /> Brouillon Admin
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                          Actif au lancement
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-white text-base">{plan.name}</h4>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(plan)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-colors"
                      title="Modifier les montants et quotas"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {subscriptionPlans.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          requestConfirm({
                            title: `Supprimer la formule "${plan.name}"`,
                            message: `Êtes-vous sûr de vouloir supprimer définitivement cette formule d'abonnement ?`,
                            onConfirm: () => {
                              deleteSubscriptionPlan(plan.id);
                              showNotification(`Formule "${plan.name}" supprimée.`);
                            }
                          });
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Supprimer la formule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Dual Monthly & Yearly Pricing */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 font-mono tabular-nums">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-black text-emerald-400">
                      {plan.priceMonthly === 0 ? 'Gratuit' : `${plan.priceMonthly} $ / mois`}
                    </span>
                    {plan.priceMonthly > 0 && (
                      <span className="text-[11px] text-slate-400">
                        {yearlyUsd} $ / an
                      </span>
                    )}
                  </div>
                  {cdfPrice > 0 && (
                    <div className="text-[11px] text-slate-400">
                      ~{cdfPrice.toLocaleString('fr-FR')} FC/mois
                    </div>
                  )}
                  {(plan.trialDays || 0) > 0 && (
                    <div className="text-[10px] text-blue-300 font-sans font-semibold flex items-center gap-1 pt-0.5">
                      <Clock className="w-3 h-3" /> Essai gratuit configurable : {plan.trialDays} jours
                    </div>
                  )}
                </div>

                {/* 5 Quotas Summary */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 font-mono tabular-nums">
                  <div className="text-slate-400">
                    Annonces : <strong className="text-white">{plan.maxListings >= 500 ? 'Illimité' : plan.maxListings}</strong>
                  </div>
                  <div className="text-slate-400">
                    Photos : <strong className="text-white">{plan.maxPhotos ?? 5}/bien</strong>
                  </div>
                  <div className="text-slate-400">
                    Vidéos : <strong className="text-white">{plan.maxVideos ?? 0}</strong>
                  </div>
                  <div className="text-slate-400">
                    Boosts : <strong className="text-amber-400">{plan.includedBoosts ?? plan.featuredListings ?? 0}</strong>
                  </div>
                  <div className="col-span-2 text-slate-400">
                    Membres d&apos;équipe : <strong className="text-emerald-400">{plan.agentAccounts}</strong>
                  </div>
                </div>

                <ul className="space-y-1.5 text-slate-300">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleStartEdit(plan)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Modifier Tarifs & Quotas</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add New Custom Plan */}
      {showAddModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Créer une Nouvelle Formule</h3>
                  <p className="text-xs text-slate-400">Définissez l&apos;audience, les tarifs mensuels/annuels et les 5 plafonds.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewPlan} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nom de la Formule *</label>
                  <input
                    type="text"
                    required
                    value={newPlan.name}
                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Audience cible</label>
                  <select
                    value={newPlan.audience || 'grand_public'}
                    onChange={(e) => {
                      const aud = e.target.value as PlanAudience;
                      setNewPlan({
                        ...newPlan,
                        audience: aud,
                        isActive: isLaunchAudience(aud)
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs"
                  >
                    {Object.entries(AUDIENCE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Mensuel USD ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={isNaN(newPlan.priceMonthly) ? '' : newPlan.priceMonthly}
                    onChange={(e) => {
                      const usd = Number(e.target.value) || 0;
                      const rate = exchangeRateInput > 0 ? exchangeRateInput : 2850;
                      setNewPlan({
                        ...newPlan,
                        priceMonthly: usd,
                        priceMonthlyCDF: Math.round(usd * rate),
                        priceYearly: usd * 10,
                        priceYearlyCDF: Math.round(usd * 10 * rate)
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">Mensuel CDF</label>
                  <input
                    type="number"
                    min="0"
                    value={isNaN(newPlan.priceMonthlyCDF ?? 0) ? '' : newPlan.priceMonthlyCDF ?? 0}
                    onChange={(e) => setNewPlan({ ...newPlan, priceMonthlyCDF: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Annuel USD ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={isNaN(newPlan.priceYearly ?? 0) ? '' : newPlan.priceYearly ?? 0}
                    onChange={(e) => {
                      const yUsd = Number(e.target.value) || 0;
                      const rate = exchangeRateInput > 0 ? exchangeRateInput : 2850;
                      setNewPlan({
                        ...newPlan,
                        priceYearly: yUsd,
                        priceYearlyCDF: Math.round(yUsd * rate)
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Essai (jours)</label>
                  <input
                    type="number"
                    min="0"
                    value={isNaN(newPlan.trialDays ?? 0) ? 0 : newPlan.trialDays ?? 0}
                    onChange={(e) => setNewPlan({ ...newPlan, trialDays: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Annonces</label>
                  <input
                    type="number"
                    min="1"
                    value={newPlan.maxListings}
                    onChange={(e) => setNewPlan({ ...newPlan, maxListings: Number(e.target.value) || 1 })}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Photos/bien</label>
                  <input
                    type="number"
                    min="1"
                    value={newPlan.maxPhotos ?? 5}
                    onChange={(e) => setNewPlan({ ...newPlan, maxPhotos: Number(e.target.value) || 1 })}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Vidéos</label>
                  <input
                    type="number"
                    min="0"
                    value={newPlan.maxVideos ?? 0}
                    onChange={(e) => setNewPlan({ ...newPlan, maxVideos: Number(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Boosts inclus</label>
                  <input
                    type="number"
                    min="0"
                    value={newPlan.includedBoosts ?? newPlan.featuredListings}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setNewPlan({ ...newPlan, includedBoosts: val, featuredListings: val });
                    }}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Équipe</label>
                  <input
                    type="number"
                    min="1"
                    value={newPlan.agentAccounts}
                    onChange={(e) => setNewPlan({ ...newPlan, agentAccounts: Number(e.target.value) || 1 })}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPlan.isActive !== false}
                  onChange={(e) => setNewPlan({ ...newPlan, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-500"
                />
                <span>Publier cette formule immédiatement (décocher pour garder en Brouillon Admin)</span>
              </label>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Enregistrer la Formule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
