import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SubscriptionPlan } from '../../types';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Sparkles,
  Save,
  RefreshCw,
  Coins,
  DollarSign,
  Layers,
  ArrowRightLeft,
  Eye,
  Check,
  X,
  Building2,
  UserCheck,
  Star,
  Info
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
    setCdfExchangeRate,
    requestConfirm
  } = useApp();

  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<SubscriptionPlan | null>(null);
  const [exchangeRateInput, setExchangeRateInput] = useState<number>(cdfExchangeRate || 2800);
  const [newFeatureInput, setNewFeatureInput] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  useEffect(() => {
    if (cdfExchangeRate && cdfExchangeRate > 0) {
      setExchangeRateInput(cdfExchangeRate);
    }
  }, [cdfExchangeRate]);

  // New Plan State
  const [newPlan, setNewPlan] = useState<SubscriptionPlan>({
    id: `plan_${Date.now()}`,
    name: 'Nouveau Pack Kinshasa',
    priceMonthly: 50,
    priceMonthlyCDF: 140000,
    currency: 'CDF',
    billingPeriod: 'month',
    maxListings: 50,
    featuredListings: 10,
    agentAccounts: 3,
    recommended: false,
    isActive: true,
    features: [
      'Jusqu\'à 50 annonces actives',
      '10 Annonces En Vedette',
      '3 Comptes Agents',
      'Support client prioritaire'
    ]
  });

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const handleStartEdit = (plan: SubscriptionPlan) => {
    setEditingPlanId(plan.id);
    setEditFormData({
      ...plan,
      priceMonthlyCDF: plan.priceMonthlyCDF ?? Math.round(plan.priceMonthly * exchangeRateInput)
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

    updateSubscriptionPlan(editFormData);
    setEditingPlanId(null);
    setEditFormData(null);
    showNotification(`Tarifs et formule "${editFormData.name}" mis à jour avec succès !`);
  };

  const handleSaveExchangeRate = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(exchangeRateInput);
    if (rate > 0) {
      setCdfExchangeRate(rate);
      showNotification(`Taux de change mis à jour : 1 USD = ${rate.toLocaleString()} FC (Francs Congolais)`);
    }
  };

  const handleConvertUsdToCdf = () => {
    if (!editFormData) return;
    const rate = exchangeRateInput > 0 ? exchangeRateInput : 2800;
    const usd = Number(editFormData.priceMonthly) || 0;
    const cdfValue = Math.round(usd * rate);
    setEditFormData({ ...editFormData, priceMonthlyCDF: isNaN(cdfValue) ? 0 : cdfValue });
  };

  const handleConvertCdfToUsd = () => {
    if (!editFormData) return;
    const rate = exchangeRateInput > 0 ? exchangeRateInput : 2800;
    const cdf = Number(editFormData.priceMonthlyCDF) || 0;
    const usdValue = Math.round(cdf / rate);
    setEditFormData({ ...editFormData, priceMonthly: isNaN(usdValue) ? 0 : usdValue });
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
    const rate = exchangeRateInput > 0 ? exchangeRateInput : 2800;
    const rawCdf = Number(newPlan.priceMonthlyCDF);
    const rawUsd = Number(newPlan.priceMonthly);
    const cdfVal = !isNaN(rawCdf) && rawCdf > 0 ? rawCdf : Math.round((!isNaN(rawUsd) ? rawUsd : 0) * rate);
    const planToSave: SubscriptionPlan = {
      ...newPlan,
      id: `plan_${Date.now()}`,
      priceMonthly: isNaN(rawUsd) ? 0 : rawUsd,
      priceMonthlyCDF: isNaN(cdfVal) ? 0 : cdfVal,
      maxListings: Number(newPlan.maxListings) || 1,
      featuredListings: Number(newPlan.featuredListings) || 0,
      agentAccounts: Number(newPlan.agentAccounts) || 1
    };
    addSubscriptionPlan(planToSave);
    setShowAddModal(false);
    showNotification(`Nouvelle formule "${planToSave.name}" créée avec succès !`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-3 animate-fadeIn shadow-lg">
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
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">Gestion des Tarifs & Abonnements (Franc Congolais)</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase">
                  Admin RDC
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Configurez les montants en Francs Congolais (CDF / FC) et en Dollars (USD) pour chaque formule d'abonnement.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une Formule</span>
            </button>
          </div>
        </div>

        {/* Currency & Exchange Rate Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Display Mode Selection */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Devise d'Affichage Principale (Public & Agents)</span>
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
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                🇨🇩 Franc Congolais (FC)
              </button>

              <button
                type="button"
                onClick={() => {
                  setPricingDisplayCurrency('BOTH');
                  showNotification('Affichage public réglé sur : Double devise (FC + USD)');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                  pricingDisplayCurrency === 'BOTH'
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
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
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                }`}
              >
                💵 Dollars ($ USD)
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Définit la manière dont les montants sont présentés sur l'ensemble du site, dans le tableau de bord des agents et sur les factures.
            </p>
          </div>

          {/* Exchange Rate Converter Setting */}
          <form onSubmit={handleSaveExchangeRate} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                <span>Taux de Change Indicatif (1 USD = ? FC)</span>
              </label>
              <span className="text-[10px] text-amber-400/90 font-mono font-bold">1 USD = {cdfExchangeRate.toLocaleString()} CDF</span>
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
                  className="w-full pl-3 pr-12 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:border-amber-500"
                  placeholder="2800"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[11px] font-bold">
                  CDF / $
                </span>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Appliquer</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Sert au calcul automatique lors de la conversion rapide USD ↔ Francs Congolais.
            </p>
          </form>
        </div>
      </div>

      {/* Plans List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {subscriptionPlans.map((plan) => {
          const isEditing = editingPlanId === plan.id;
          const cdfPrice = plan.priceMonthlyCDF ?? Math.round(plan.priceMonthly * cdfExchangeRate);

          if (isEditing && editFormData) {
            return (
              <form
                key={plan.id}
                onSubmit={handleSaveEdit}
                className="bg-slate-900 border-2 border-emerald-500 rounded-3xl p-6 space-y-4 shadow-2xl relative animate-fadeIn"
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

                {/* Plan Name */}
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

                {/* Pricing Fields in CDF & USD */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-400 mb-1">
                      Prix en Francs Congolais (CDF)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="500"
                        value={isNaN(editFormData.priceMonthlyCDF ?? 0) ? '' : (editFormData.priceMonthlyCDF ?? 0)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditFormData({ ...editFormData, priceMonthlyCDF: isNaN(val) ? 0 : val });
                        }}
                        className="w-full pl-2.5 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-extrabold text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">
                        FC
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleConvertUsdToCdf}
                      className="mt-1 text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                      title="Calculer d'après le prix USD et le taux"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Convertir depuis USD
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-300 mb-1">
                      Prix en Dollars (USD $)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={isNaN(editFormData.priceMonthly) ? '' : editFormData.priceMonthly}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditFormData({ ...editFormData, priceMonthly: isNaN(val) ? 0 : val });
                        }}
                        className="w-full pl-2.5 pr-8 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white font-extrabold text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold">
                        $
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleConvertCdfToUsd}
                      className="mt-1 text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                      title="Calculer d'après le montant CDF et le taux"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Convertir depuis CDF
                    </button>
                  </div>
                </div>

                {/* Quotas */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Max Annonces</label>
                    <input
                      type="number"
                      min="1"
                      value={isNaN(editFormData.maxListings) ? '' : editFormData.maxListings}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditFormData({ ...editFormData, maxListings: isNaN(val) ? 1 : val });
                      }}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">En Vedette</label>
                    <input
                      type="number"
                      min="0"
                      value={isNaN(editFormData.featuredListings) ? '' : editFormData.featuredListings}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditFormData({ ...editFormData, featuredListings: isNaN(val) ? 0 : val });
                      }}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1">Comptes Agents</label>
                    <input
                      type="number"
                      min="1"
                      value={isNaN(editFormData.agentAccounts) ? '' : editFormData.agentAccounts}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEditFormData({ ...editFormData, agentAccounts: isNaN(val) ? 1 : val });
                      }}
                      className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs font-bold"
                    />
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-slate-300">Fonctionnalités Incluses</label>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {editFormData.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 p-1.5 bg-slate-950 rounded-lg text-[11px] text-slate-300">
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

                {/* Toggle Recommended */}
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <input
                    type="checkbox"
                    checked={editFormData.recommended || false}
                    onChange={(e) => setEditFormData({ ...editFormData, recommended: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span className="text-xs text-slate-300 font-semibold">
                    Mettre en avant comme "Formule Recommandée"
                  </span>
                </label>

                {/* Submit / Cancel Buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5"
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
              className={`p-6 rounded-3xl border text-xs flex flex-col justify-between space-y-6 relative transition-all ${
                plan.recommended
                  ? 'bg-slate-900 border-emerald-500/80 shadow-2xl shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase shadow-md flex items-center gap-1">
                  <Star className="w-3 h-3 fill-slate-950" /> Recommandé
                </span>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-white text-base">{plan.name}</h4>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(plan)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 transition-colors"
                      title="Modifier les montants et le pack"
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

                {/* Price Display based on configuration */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  {/* Primary Price: CDF */}
                  <div className="text-2xl font-black text-emerald-400 flex items-baseline gap-1.5">
                    {cdfPrice === 0 ? (
                      <span>Gratuit (0 FC)</span>
                    ) : (
                      <>
                        <span>{cdfPrice.toLocaleString('fr-FR')} FC</span>
                        <span className="text-[11px] font-normal text-slate-400">/mois</span>
                      </>
                    )}
                  </div>

                  {/* Secondary Price: USD */}
                  <div className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                    <span>Équivalent :</span>
                    <span className="text-white font-bold">
                      {plan.priceMonthly === 0 ? '0 $' : `${plan.priceMonthly} $ USD`}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      (Taux 1$ = {cdfExchangeRate.toLocaleString()} FC)
                    </span>
                  </div>
                </div>

                {/* Quotas Summary */}
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] py-1 border-y border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Annonces</span>
                    <span className="font-bold text-white">{plan.maxListings} max</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">En Vedette</span>
                    <span className="font-bold text-amber-400">{plan.featuredListings}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-bold">Agents</span>
                    <span className="font-bold text-emerald-400">{plan.agentAccounts}</span>
                  </div>
                </div>

                {/* Features List */}
                <ul className="space-y-2 text-slate-300">
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
                  <span>Modifier le Prix en Francs Congolais</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Add New Custom Plan */}
      {showAddModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Créer une Nouvelle Formule</h3>
                  <p className="text-xs text-slate-400">Ajoutez une tarification sur-mesure pour les agents ou promoteurs.</p>
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
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nom de la Formule</label>
                <input
                  type="text"
                  required
                  value={newPlan.name}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Pack Promoteur Foncier Kinshasa"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 mb-1">Prix en Francs Congolais (CDF)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={isNaN(newPlan.priceMonthlyCDF ?? 0) ? '' : (newPlan.priceMonthlyCDF ?? 0)}
                      onChange={(e) => {
                        const cdf = Number(e.target.value);
                        const rate = exchangeRateInput > 0 ? exchangeRateInput : 2800;
                        const safeCdf = isNaN(cdf) ? 0 : cdf;
                        setNewPlan({
                          ...newPlan,
                          priceMonthlyCDF: safeCdf,
                          priceMonthly: Math.round(safeCdf / rate)
                        });
                      }}
                      className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-extrabold text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">FC</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Prix en Dollars ($ USD)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={isNaN(newPlan.priceMonthly) ? '' : newPlan.priceMonthly}
                      onChange={(e) => {
                        const usd = Number(e.target.value);
                        const rate = exchangeRateInput > 0 ? exchangeRateInput : 2800;
                        const safeUsd = isNaN(usd) ? 0 : usd;
                        setNewPlan({
                          ...newPlan,
                          priceMonthly: safeUsd,
                          priceMonthlyCDF: Math.round(safeUsd * rate)
                        });
                      }}
                      className="w-full pl-3 pr-10 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-extrabold text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">$</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Max Annonces</label>
                  <input
                    type="number"
                    min="1"
                    value={isNaN(newPlan.maxListings) ? '' : newPlan.maxListings}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewPlan({ ...newPlan, maxListings: isNaN(val) ? 1 : val });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">En Vedette</label>
                  <input
                    type="number"
                    min="0"
                    value={isNaN(newPlan.featuredListings) ? '' : newPlan.featuredListings}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewPlan({ ...newPlan, featuredListings: isNaN(val) ? 0 : val });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Comptes Agents</label>
                  <input
                    type="number"
                    min="1"
                    value={isNaN(newPlan.agentAccounts) ? '' : newPlan.agentAccounts}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setNewPlan({ ...newPlan, agentAccounts: isNaN(val) ? 1 : val });
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
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
