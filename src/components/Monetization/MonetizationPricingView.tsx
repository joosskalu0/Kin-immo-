import React, { useState, useEffect } from 'react';
import { SubscriptionPlan, VisibilityOption } from '../../types';
import { mysqlApi } from '../../services/mysqlApi';
import { useApp } from '../../context/AppContext';
import {
  Check,
  Sparkles,
  Crown,
  Zap,
  Building2,
  Home,
  Briefcase,
  Landmark,
  TrendingUp,
  ShieldCheck,
  CreditCard,
  Phone,
  ArrowRight,
  HelpCircle,
  Megaphone,
  BarChart3,
  Loader2,
  Award
} from 'lucide-react';

export const MonetizationPricingView: React.FC = () => {
  const { user, setIsAuthModalOpen } = useApp();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [visibilityOptions, setVisibilityOptions] = useState<VisibilityOption[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'individual' | 'agency' | 'promoter' | 'boosts' | 'ads'>('all');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('pm_mpesa');
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState<any | null>(null);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [plansRes, optionsRes, pmRes] = await Promise.all([
        mysqlApi.getPricingPlans(),
        mysqlApi.getVisibilityOptions(),
        mysqlApi.getPaymentMethods()
      ]);

      if (plansRes.success && plansRes.plans) {
        setPlans(plansRes.plans);
      }
      if (optionsRes.success && optionsRes.options) {
        setVisibilityOptions(optionsRes.options);
      }
      if (pmRes.success && pmRes.paymentMethods) {
        const methods = pmRes.paymentMethods;
        setPaymentMethods(methods);
        if (methods.length > 0) {
          setSelectedPaymentMethodId(methods[0].id);
        }
      }
    } catch (e) {
      console.warn('Erreur chargement monétisation:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (plan.priceMonthly === 0) {
      alert('La formule Starter est gratuite et déjà activée sur votre compte.');
      return;
    }
    setSelectedPlan(plan);
    setSubscribeSuccess(null);
    setSubscribeError(null);
  };

  const handleConfirmSubscription = async () => {
    if (!selectedPlan) return;
    setIsSubscribing(true);
    setSubscribeError(null);

    try {
      const res = await mysqlApi.createInvoice(selectedPlan.id, selectedPaymentMethodId, 'manual_mobile_money');
      if (res.success && res.invoice) {
        setSubscribeSuccess(res.invoice);
      } else {
        setSubscribeError(res.message || 'Impossible de créer la souscription.');
      }
    } catch (err: any) {
      setSubscribeError(err.message || 'Erreur réseau lors de la commande.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const filteredPlans = plans.filter((p) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'individual') return p.category === 'individual';
    if (activeTab === 'agency') return p.category === 'agency';
    if (activeTab === 'promoter') return p.category === 'promoter' || p.id === 'enterprise';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Offres & Monétisation 100% Immobilière</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Tarifs transparents pour particuliers, courtiers, agences & promoteurs
          </h1>
          <p className="text-base text-slate-600">
            Publiez gratuitement vos biens immobiliers à Kinshasa ou développez votre activité grâce à nos forfaits pro,
            nos options de visibilité accélérée et nos partenariats habitat ciblés en RDC.
          </p>

          {/* Onglets sélecteurs */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'all', label: 'Toutes les offres' },
              { id: 'individual', label: 'Particuliers & Bailleurs', icon: Home },
              { id: 'agency', label: 'Courtiers & Agences Pro', icon: Building2 },
              { id: 'promoter', label: 'Promoteurs & Bâtisseurs', icon: Landmark },
              { id: 'boosts', label: 'Options de Visibilité', icon: Zap },
              { id: 'ads', label: 'Régie Publicitaire Habitat', icon: Megaphone }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Grille des Abonnements */}
        {(activeTab === 'all' || activeTab === 'individual' || activeTab === 'agency' || activeTab === 'promoter') && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Formules d'Abonnement Mensuel
                </h2>
                <p className="text-xs text-slate-500">
                  Règlement simplifié via M-Pesa, Airtel Money, Orange Money ou Virement Bancaire
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPlans.map((plan) => {
                  const isPromoter = plan.category === 'promoter' || plan.id === 'enterprise';
                  const isAgency = plan.category === 'agency';
                  const priceUsd = Number(plan.priceMonthly ?? (plan as any).price_usd ?? (plan as any).price ?? 0);
                  const priceCdf = Number(plan.priceMonthlyCDF ?? (plan as any).price_cdf ?? (plan as any).priceCDF ?? (priceUsd * 2850));
                  const isCourtierPro = plan.category === 'individual' && priceUsd > 0;
                  const isFree = priceUsd === 0;

                  return (
                    <div
                      key={plan.id}
                      className={`relative rounded-3xl bg-white border-2 p-6 flex flex-col justify-between transition-all hover:shadow-xl ${
                        plan.recommended
                          ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                          : isPromoter
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : isAgency
                          ? 'border-emerald-600 shadow-sm'
                          : 'border-slate-200'
                      }`}
                    >
                      {plan.badge && (
                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-[10px] tracking-wider uppercase shadow">
                          {plan.badge}
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-black uppercase tracking-wider ${
                              isPromoter ? 'text-amber-400' : 'text-slate-500'
                            }`}
                          >
                            {isPromoter
                              ? 'Promoteur & Constructeur'
                              : isAgency
                              ? 'Agence Immobilière'
                              : isCourtierPro
                              ? 'Courtier Indépendant'
                              : 'Particulier / Billeur'}
                          </span>
                          {isPromoter ? (
                            <Landmark className="w-5 h-5 text-amber-400" />
                          ) : isAgency ? (
                            <Building2 className="w-5 h-5 text-emerald-600" />
                          ) : isCourtierPro ? (
                            <Briefcase className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Home className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        <div>
                          <h3
                            className={`text-lg font-black ${
                              isPromoter ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            {plan.name}
                          </h3>
                          <p
                            className={`text-xs mt-1 min-h-[36px] ${
                              isPromoter ? 'text-slate-300' : 'text-slate-500'
                            }`}
                          >
                            {plan.description || 'Formule adaptée pour maximiser la visibilité de vos biens immobiliers.'}
                          </p>
                        </div>

                        {/* Prix garanti en USD et CDF */}
                        <div className="pt-2 border-t border-slate-100/20">
                          <div className="flex items-baseline gap-1">
                            <span
                              className={`text-3xl font-black ${
                                isPromoter ? 'text-white' : 'text-slate-900'
                              }`}
                            >
                              {isFree ? 'Gratuit' : `${priceUsd} $`}
                            </span>
                            {!isFree && (
                              <span
                                className={`text-xs ${
                                  isPromoter ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                / mois
                              </span>
                            )}
                          </div>
                          {!isFree && (
                            <span
                              className={`text-[11px] block mt-0.5 ${
                                isPromoter ? 'text-amber-400' : 'text-emerald-600 font-bold'
                              }`}
                            >
                              ~{priceCdf.toLocaleString()} CDF / mois
                            </span>
                          )}
                        </div>

                        {/* Fonctionnalités */}
                        <ul className="space-y-2.5 pt-4 text-xs">
                          <li
                            className={`flex items-center gap-2 font-bold ${
                              isPromoter ? 'text-slate-200' : 'text-slate-800'
                            }`}
                          >
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>
                              {(plan.maxListings || (plan as any).max_listings || 3) >= 500
                                ? 'Annonces immobilières illimitées'
                                : `${plan.maxListings || (plan as any).max_listings || 3} annonces immobilières actives`}
                            </span>
                          </li>
                          <li
                            className={`flex items-center gap-2 ${
                              isPromoter ? 'text-slate-300' : 'text-slate-600'
                            }`}
                          >
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span>
                              {(plan.featuredListings || (plan as any).max_featured_listings || 0) > 0
                                ? `${plan.featuredListings || (plan as any).max_featured_listings} annonces en avant incluses`
                                : 'Options de boost à la carte'}
                            </span>
                          </li>
                          {(plan.features || []).map((feat, idx) => (
                            <li
                              key={idx}
                              className={`flex items-start gap-2 ${
                                isPromoter ? 'text-slate-300' : 'text-slate-600'
                              }`}
                            >
                              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className="leading-tight">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-6 mt-6 border-t border-slate-100/20">
                        <button
                          type="button"
                          onClick={() => handleSelectPlan(plan)}
                          className={`w-full py-3 px-4 rounded-2xl font-black text-xs transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 ${
                            isPromoter
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-black'
                              : plan.recommended
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <span>{isFree ? 'Actuel / Inclus' : 'Choisir cette formule'}</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Section Options de Visibilité (Boosts à la carte) */}
        {(activeTab === 'all' || activeTab === 'boosts') && (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-600 tracking-wider">
                  <Zap className="w-4 h-4" />
                  <span>Visibilité Élevée Immédiate</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Options de Visibilité à la Carte (Boosts)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Propulsez une annonce spécifique en tête des recherches sans modifier votre abonnement
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibilityOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-slate-900">{opt.name}</span>
                      {opt.badge_text && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black uppercase">
                          {opt.badge_text}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {opt.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      Durée : {opt.duration_days} jours
                    </span>
                    <div className="text-right">
                      <span className="text-base font-black text-emerald-700">
                        {Number(opt.price_usd ?? (opt as any).price ?? 0)} USD
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        (~{Number(opt.price_cdf ?? (opt.price_usd ? opt.price_usd * 2850 : 0)).toLocaleString()} CDF)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Régie Publicitaire & Bannières */}
        {(activeTab === 'all' || activeTab === 'ads') && (
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-8 sm:p-10 border border-slate-800 shadow-xl relative overflow-hidden space-y-8">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
              <div className="lg:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/30 text-[11px] font-black uppercase">
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>Régie Publicitaire & Partenaires Habitat</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
                  Diffusez vos bannières auprès de milliers d'acquéreurs, locataires et investisseurs à Kinshasa
                </h2>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Idéal pour les <strong>promoteurs immobiliers</strong>, les <strong>entreprises de construction & génie civil</strong>,
                  les cabinets d'architecture, les architectes d'intérieur et les <strong>banques</strong> (crédit immobilier, caution locative).
                  Formats bannière Accueil, tête de recherche et barre latérale avec suivi précis des impressions et clics.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-amber-400 font-black text-base block">+25 000</span>
                    <span className="text-[11px] text-slate-400">Vues mensuelles qualifiées</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-emerald-400 font-black text-base block">100% Ciblée</span>
                    <span className="text-[11px] text-slate-400">Acheteurs, Bailleurs & Décideurs RDC</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 col-span-2 sm:col-span-1">
                    <span className="text-sky-400 font-black text-base block">Rapports Clairs</span>
                    <span className="text-[11px] text-slate-400">Impressions & Clics en direct</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm space-y-4">
                <h3 className="font-black text-base text-white">
                  Réserver un emplacement publicitaire
                </h3>
                <p className="text-xs text-slate-300">
                  Nos conseillers régie vous accompagnent dans le calibrage visuel et le ciblage de vos campagnes.
                </p>

                <div className="space-y-2 pt-2">
                  <a
                    href="https://wa.me/243810000000?text=Bonjour,%20je%20souhaite%20réserver%20un%20espace%20publicitaire%20bannière%20sur%20Kinshasa%20Immobilier"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Contacter par WhatsApp (+243)</span>
                  </a>
                  <a
                    href="mailto:contact@kinshasa-immobilier.cd?subject=Demande%20Régie%20Publicitaire%20Immobilier"
                    className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 border border-white/20"
                  >
                    <span>Demander la grille tarifaire</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Grille Tarifaire des Espaces Publicitaires */}
            <div className="border-t border-white/10 pt-6">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 mb-4">
                Grille des Tarifs Publicitaires Sponsors & Partenaires Habitat
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase block">Grand Écran Accueil</span>
                  <div className="text-xl font-black text-white">250 USD <span className="text-xs text-slate-400 font-normal">/ mois</span></div>
                  <span className="text-[11px] text-emerald-400 block font-semibold">~712 500 CDF</span>
                  <p className="text-[11px] text-slate-300">Format panoramique en haut de page d'accueil sous la recherche.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase block">Pancarte In-Feed</span>
                  <div className="text-xl font-black text-white">180 USD <span className="text-xs text-slate-400 font-normal">/ mois</span></div>
                  <span className="text-[11px] text-emerald-400 block font-semibold">~513 000 CDF</span>
                  <p className="text-[11px] text-slate-300">Insérée au cœur de la liste des biens pour une visibilité naturelle.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold text-sky-400 uppercase block">Bannière Tête de Recherche</span>
                  <div className="text-xl font-black text-white">150 USD <span className="text-xs text-slate-400 font-normal">/ mois</span></div>
                  <span className="text-[11px] text-emerald-400 block font-semibold">~427 500 CDF</span>
                  <p className="text-[11px] text-slate-300">Affichage prioritaire au-dessus des résultats de recherche.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-[10px] font-bold text-purple-400 uppercase block">Barre Latérale & Fiche</span>
                  <div className="text-xl font-black text-white">120 USD <span className="text-xs text-slate-400 font-normal">/ mois</span></div>
                  <span className="text-[11px] text-emerald-400 block font-semibold">~342 000 CDF</span>
                  <p className="text-[11px] text-slate-300">Format carré / vertical pour la vue scindée carte et navigation.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Souscription à une formule */}
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
              <div className="bg-slate-900 text-white p-6">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  Souscription d'Abonnement
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  {selectedPlan.name}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Montant : <strong>{Number(selectedPlan.priceMonthly ?? (selectedPlan as any).price_usd ?? 0)} USD</strong> (~{Number(selectedPlan.priceMonthlyCDF ?? (selectedPlan as any).price_cdf ?? ((Number(selectedPlan.priceMonthly ?? (selectedPlan as any).price_usd ?? 0)) * 2850)).toLocaleString()} CDF) par mois
                </p>
              </div>

              <div className="p-6 space-y-4">
                {subscribeError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {subscribeError}
                  </div>
                )}

                {!subscribeSuccess ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        Sélectionnez votre moyen de paiement :
                      </label>
                      <div className="space-y-2">
                        {paymentMethods.map((pm) => (
                          <div
                            key={pm.id}
                            onClick={() => setSelectedPaymentMethodId(pm.id)}
                            className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between text-xs ${
                              selectedPaymentMethodId === pm.id
                                ? 'border-emerald-600 bg-emerald-50/60 font-bold'
                                : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <span className="font-semibold text-slate-800 uppercase">
                              {pm.account_name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {pm.account_number}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800">Processus de règlement :</p>
                      <p>
                        Une facture avec numéro de référence vous sera attribuée. Après versement, transmettez le code de transaction pour activation instantanée.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan(null)}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-all"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSubscription}
                        disabled={isSubscribing}
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubscribing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <span>Générer ma facture</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="font-black text-base text-slate-900">
                        Facture {subscribeSuccess.invoiceNumber} émise
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">
                        Montant à régler : <strong>{subscribeSuccess.amount} USD</strong> (~{Number(subscribeSuccess.amountCdf || subscribeSuccess.amount * 2800).toLocaleString()} CDF)
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs space-y-2">
                      <p className="font-bold text-amber-900">Prochaine étape :</p>
                      <p className="text-amber-800 leading-relaxed">
                        Effectuez votre versement via le moyen de paiement sélectionné en indiquant <strong>{subscribeSuccess.invoiceNumber}</strong> en motif. Rendez-vous ensuite dans votre espace personnel ou contactez le support pour la confirmation immédiate.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlan(null);
                        setSubscribeSuccess(null);
                      }}
                      className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all"
                    >
                      Terminer
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

