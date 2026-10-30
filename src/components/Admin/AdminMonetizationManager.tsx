import React, { useState, useEffect } from 'react';
import { mysqlApi } from '../../services/mysqlApi';
import { MonetizationStats, VisibilityOption } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  DollarSign,
  TrendingUp,
  Sparkles,
  Zap,
  Building2,
  Landmark,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Filter,
  XCircle,
  MessageSquare,
  Phone,
  Eye,
  ArrowUpRight
} from 'lucide-react';

interface AdminMonetizationManagerProps {
  onRefreshStats?: () => void;
}

export const AdminMonetizationManager: React.FC<AdminMonetizationManagerProps> = ({
  onRefreshStats
}) => {
  const { properties, updateInvoiceStatus, setActivePropertyModalId } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'boosts' | 'invoices' | 'plans' | 'options'>('boosts');
  const [boostStatusFilter, setBoostStatusFilter] = useState<'pending' | 'all' | 'paid' | 'failed'>('pending');
  const [stats, setStats] = useState<MonetizationStats | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [options, setOptions] = useState<VisibilityOption[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Formulaire Forfait / Abonnement (Création / Édition)
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState<boolean>(false);
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    description: '',
    category: 'individual',
    badge: '',
    price_usd: 0,
    price_cdf: 0,
    max_listings: 3,
    max_featured_listings: 0,
    features_text: '',
    recommended: false,
    has_verified_badge: false,
    has_crm_leads: false,
    has_priority_support: false,
    is_active: true
  });

  // Formulaire Option de visibilité / Boost (Création / Édition)
  const [editingOption, setEditingOption] = useState<VisibilityOption | null>(null);
  const [isCreatingOption, setIsCreatingOption] = useState<boolean>(false);
  const [optionForm, setOptionForm] = useState({
    id: '',
    name: '',
    slug: '',
    description: '',
    boost_type: 'featured',
    duration_days: 7,
    price_usd: 10,
    price_cdf: 28500,
    badge_text: '',
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4500);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, invRes, plansRes, optRes] = await Promise.all([
        mysqlApi.adminGetMonetizationStats(),
        mysqlApi.adminGetInvoices(),
        mysqlApi.getPricingPlans(undefined, true),
        mysqlApi.getVisibilityOptions()
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (invRes.success && invRes.data?.invoices) {
        setInvoices(invRes.data.invoices);
      }
      if (plansRes.success && plansRes.plans) {
        setPlans(plansRes.plans);
      }
      if (optRes.success && optRes.options) {
        setOptions(optRes.options);
      }
    } catch (err: any) {
      showMsg('error', 'Erreur chargement monétisation: ' + (err.message || 'Réseau'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    if (!confirm('Confirmez-vous la vérification manuelle du paiement et l\'activation immédiate du boost ?')) return;
    setIsProcessing(invoiceId);
    try {
      const res = await mysqlApi.approveInvoice(invoiceId);
      if (res.success) {
        updateInvoiceStatus(invoiceId, 'paid');
        showMsg('success', res.message || 'Paiement validé avec succès ! Le boost est désormais actif sur l\'annonce.');
        loadData();
        if (onRefreshStats) onRefreshStats();
      } else {
        showMsg('error', res.message || 'Échec de l\'approbation');
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur serveur');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectInvoice = async (invoiceId: string) => {
    const reason = prompt('Motif du rejet du paiement (ex: Référence introuvable, montant non reçu) :', 'Paiement non confirmé');
    if (reason === null) return;
    setIsProcessing(invoiceId);
    try {
      const res = await mysqlApi.rejectInvoice(invoiceId, reason);
      if (res.success) {
        updateInvoiceStatus(invoiceId, 'cancelled', undefined, reason);
        showMsg('success', res.message || 'Demande de boost rejetée. Le paiement n\'a pas été validé.');
        loadData();
        if (onRefreshStats) onRefreshStats();
      } else {
        showMsg('error', res.message || 'Échec du rejet');
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur serveur');
    } finally {
      setIsProcessing(null);
    }
  };

  // Gestion des Formules d'abonnements (Plans)
  const handleOpenEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setIsCreatingPlan(false);
    const priceUsd = Number(plan.priceMonthly ?? plan.price_usd ?? plan.price ?? 0);
    const priceCdf = Number(plan.priceMonthlyCDF ?? plan.price_cdf ?? (priceUsd * 2850));
    const feats = Array.isArray(plan.features) ? plan.features.join('\n') : (typeof plan.features === 'string' ? plan.features : '');

    setPlanForm({
      id: plan.id,
      name: plan.name || '',
      description: plan.description || '',
      category: plan.category || 'individual',
      badge: plan.badge || '',
      price_usd: priceUsd,
      price_cdf: priceCdf,
      max_listings: Number(plan.maxListings ?? plan.max_listings ?? 3),
      max_featured_listings: Number(plan.featuredListings ?? plan.max_featured_listings ?? 0),
      features_text: feats,
      recommended: Boolean(plan.recommended),
      has_verified_badge: Boolean(plan.hasVerifiedBadge || plan.has_verified_badge),
      has_crm_leads: Boolean(plan.hasCrmLeads || plan.has_crm_leads),
      has_priority_support: Boolean(plan.hasPrioritySupport || plan.has_priority_support),
      is_active: plan.is_active !== false && plan.isActive !== false
    });
  };

  const handleOpenCreatePlan = () => {
    setEditingPlan(null);
    setIsCreatingPlan(true);
    setPlanForm({
      id: `plan_${Date.now()}`,
      name: '',
      description: '',
      category: 'individual',
      badge: 'Pack Nouveau',
      price_usd: 19,
      price_cdf: 54150,
      max_listings: 10,
      max_featured_listings: 1,
      features_text: 'Jusqu\'à 10 annonces\n1 annonce en vedette\nSupport WhatsApp',
      recommended: false,
      has_verified_badge: false,
      has_crm_leads: false,
      has_priority_support: false,
      is_active: true
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name) {
      alert('Veuillez renseigner le nom de la formule.');
      return;
    }

    const features = planForm.features_text
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      ...planForm,
      priceMonthly: Number(planForm.price_usd),
      price_usd: Number(planForm.price_usd),
      priceMonthlyCDF: Number(planForm.price_cdf),
      price_cdf: Number(planForm.price_cdf),
      maxListings: Number(planForm.max_listings),
      max_listings: Number(planForm.max_listings),
      featuredListings: Number(planForm.max_featured_listings),
      max_featured_listings: Number(planForm.max_featured_listings),
      features,
      is_active: planForm.is_active,
      isActive: planForm.is_active
    };

    try {
      let res;
      if (editingPlan) {
        res = await mysqlApi.adminUpdatePlan(editingPlan.id, payload);
      } else {
        res = await mysqlApi.adminCreatePlan(payload);
      }

      if (res && res.success !== false) {
        showMsg('success', editingPlan ? 'Tarif et formule d\'abonnement mis à jour.' : 'Nouvelle formule d\'abonnement créée.');
        setEditingPlan(null);
        setIsCreatingPlan(false);
        loadData();
      } else {
        showMsg('error', res?.message || 'Erreur lors de la sauvegarde du forfait.');
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur serveur.');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm(`Supprimer définitivement la formule ${planId} ?`)) return;
    try {
      const res = await mysqlApi.adminDeletePlan(planId);
      if (res.success !== false) {
        showMsg('success', 'Formule supprimée.');
        loadData();
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur suppression.');
    }
  };

  // Gestion des Options de visibilité (Boosts)
  const handleOpenEditOption = (opt: VisibilityOption) => {
    setEditingOption(opt);
    setIsCreatingOption(false);
    const priceUsd = Number(opt.price_usd ?? (opt as any).price ?? 0);
    const priceCdf = Number(opt.price_cdf ?? (opt as any).priceCDF ?? (priceUsd * 2850));

    setOptionForm({
      id: opt.id,
      name: opt.name || '',
      slug: (opt as any).slug || opt.id,
      description: opt.description || '',
      boost_type: opt.boost_type || 'featured',
      duration_days: Number(opt.duration_days || 7),
      price_usd: priceUsd,
      price_cdf: priceCdf,
      badge_text: opt.badge_text || '',
      is_active: (opt as any).is_active !== false
    });
  };

  const handleOpenCreateOption = () => {
    setEditingOption(null);
    setIsCreatingOption(true);
    setOptionForm({
      id: `opt_${Date.now()}`,
      name: '',
      slug: `boost_${Date.now()}`,
      description: '',
      boost_type: 'featured',
      duration_days: 7,
      price_usd: 15,
      price_cdf: 42750,
      badge_text: '⭐ Boost',
      is_active: true
    });
  };

  const handleSaveOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!optionForm.name) {
      alert('Veuillez renseigner le nom de l\'option.');
      return;
    }

    const payload = {
      ...optionForm,
      price_usd: Number(optionForm.price_usd),
      price: Number(optionForm.price_usd),
      price_cdf: Number(optionForm.price_cdf),
      priceCDF: Number(optionForm.price_cdf),
      duration_days: Number(optionForm.duration_days)
    };

    try {
      let res;
      if (editingOption) {
        res = await mysqlApi.adminUpdateVisibilityOption(editingOption.id, payload);
      } else {
        res = await mysqlApi.adminCreateVisibilityOption(payload);
      }

      if (res && res.success !== false) {
        showMsg('success', editingOption ? 'Tarif et détails du boost mis à jour.' : 'Nouvelle option de boost enregistrée.');
        setEditingOption(null);
        setIsCreatingOption(false);
        loadData();
      } else {
        showMsg('error', res?.message || 'Erreur lors de la modification de l\'option.');
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur serveur.');
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (!confirm(`Supprimer l'option de boost ${optionId} ?`)) return;
    try {
      const res = await mysqlApi.adminDeleteVisibilityOption(optionId);
      if (res.success !== false) {
        showMsg('success', 'Option de visibilité supprimée.');
        loadData();
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur suppression.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg transition-all ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Calculs spécifiques des demandes de boost */}
      {(() => {
        const boostInvoices = invoices.filter(
          (inv) => inv.invoice_type === 'boost' || inv.invoiceType === 'boost' || inv.property_id || inv.propertyId || inv.option_id
        );
        const pendingBoosts = boostInvoices.filter((inv) => inv.status === 'pending');
        const activeBoosts = boostInvoices.filter((inv) => inv.status === 'paid');
        const rejectedBoosts = boostInvoices.filter((inv) => inv.status === 'failed' || inv.status === 'cancelled');

        const filteredBoosts = boostInvoices.filter((inv) => {
          if (boostStatusFilter === 'pending') return inv.status === 'pending';
          if (boostStatusFilter === 'paid') return inv.status === 'paid';
          if (boostStatusFilter === 'failed') return inv.status === 'failed' || inv.status === 'cancelled';
          return true;
        });

        return (
          <>
            {/* Top Monetization KPI Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Chiffre d'Affaires Réel</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {Number(stats?.invoices?.total_revenue_usd || 0).toLocaleString()} USD
                </div>
                <span className="text-[11px] text-slate-500 block">
                  ~{Number(stats?.invoices?.total_revenue_cdf || 0).toLocaleString()} CDF encaissés
                </span>
              </div>

              <div
                onClick={() => {
                  setActiveSubTab('boosts');
                  setBoostStatusFilter('pending');
                }}
                className={`p-5 rounded-2xl bg-slate-900 border transition-all cursor-pointer space-y-1 ${
                  pendingBoosts.length > 0
                    ? 'border-amber-500/50 shadow-lg shadow-amber-500/10 hover:border-amber-400'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Boosts en Attente Paiement</span>
                  <Clock className={`w-4 h-4 ${pendingBoosts.length > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-black ${pendingBoosts.length > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {pendingBoosts.length}
                  </div>
                  {pendingBoosts.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                      Action requise
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Validation manuelle admin requise
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Factures Réglées</span>
                  <CheckCircle2 className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-2xl font-black text-white">
                  {stats?.invoices?.paid_invoices || 0}{' '}
                  <span className="text-xs text-slate-400 font-normal">
                    / {stats?.invoices?.total_invoices || 0} émises
                  </span>
                </div>
                <span className="text-[11px] text-sky-400 block font-semibold">
                  Tous paiements confondus
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Boosts & Visibilité Actifs</span>
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">
                  {activeBoosts.length || stats?.activeBoosts || 0}
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Annonces propulsées (En vedette & Urgentes)
                </span>
              </div>
            </div>

            {/* Sub navigation buttons */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              {[
                {
                  id: 'boosts',
                  label: `⚡ Demandes de Boost (${pendingBoosts.length} en attente)`,
                  icon: Zap,
                  badge: pendingBoosts.length
                },
                { id: 'invoices', label: `Factures & Règlements (${invoices.length})`, icon: DollarSign },
                { id: 'plans', label: `Formules & Abonnements (${plans.length})`, icon: Building2 },
                { id: 'options', label: `Options de Visibilité (${options.length})`, icon: Sparkles }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id as any)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                      activeSubTab === tab.id
                        ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        activeSubTab === tab.id
                          ? 'bg-slate-950 text-amber-300'
                          : 'bg-amber-400 text-slate-950 animate-pulse'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sub-Tab 0: Demandes de Boost & Validation manuelle des paiements */}
            {activeSubTab === 'boosts' && (
              <div className="space-y-5">
                {/* Notice de gouvernance */}
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-amber-300 text-sm">
                        Règle de Contrôle Strict : Autorisation & Validation Manuelle des Boosts
                      </div>
                      <p className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed">
                        Aucun boost ne s'active automatiquement. L'administrateur doit vérifier la réception effective des fonds sur les comptes Mobile Money (M-Pesa, Airtel Money, Orange Money) ou Banque (Rawbank), puis cliquer sur <strong>« Valider le Paiement & Activer »</strong>. Le calcul de la durée d'expiration prend effet immédiatement après validation.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={loadData}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-1.5 transition-all"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Rafraîchir les flux</span>
                  </button>
                </div>

                {/* Filtres de statut des boosts */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'pending', label: 'En attente de validation', count: pendingBoosts.length, color: 'amber' },
                      { id: 'paid', label: 'Boosts Actifs & Validés', count: activeBoosts.length, color: 'emerald' },
                      { id: 'failed', label: 'Paiements Rejetés', count: rejectedBoosts.length, color: 'rose' },
                      { id: 'all', label: 'Toutes les demandes', count: boostInvoices.length, color: 'slate' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setBoostStatusFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          boostStatusFilter === f.id
                            ? 'bg-slate-800 text-white border border-emerald-500 shadow-sm'
                            : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        <span>{f.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          f.id === 'pending' && f.count > 0
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {f.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <span className="text-xs text-slate-400">
                    {filteredBoosts.length} demande{filteredBoosts.length > 1 ? 's' : ''} affichée{filteredBoosts.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Liste des demandes de boost */}
                {filteredBoosts.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 space-y-3">
                    <Zap className="w-10 h-10 text-slate-600 mx-auto" />
                    <div className="text-sm font-bold text-slate-300">
                      {boostStatusFilter === 'pending'
                        ? 'Aucune demande de boost en attente de validation pour le moment.'
                        : 'Aucune demande trouvée avec ce filtre.'}
                    </div>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Dès qu'un courtier, agent ou propriétaire sollicite un boost de visibilité pour son annonce, la demande apparaîtra ici avec son code de transaction SMS.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBoosts.map((inv) => {
                      const propId = inv.property_id || inv.propertyId;
                      const targetProp = properties.find((p) => p.id === propId);
                      const propTitle = inv.property_title || targetProp?.title || 'Bien immobilier';
                      const propCommune = targetProp?.commune || 'Kinshasa';
                      const propImg = targetProp?.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=300&q=80';
                      const applicantName = inv.user_name || inv.target_name || 'Annonceur Partenaire';
                      const applicantEmail = inv.user_email || inv.target_email || 'contact@kinimmo.cd';
                      const applicantPhone = targetProp?.assignedAgentName || targetProp?.agencyName ? '+243 81 000 0000' : '+243 84 529 4616';
                      const cleanPhone = applicantPhone.replace(/[^0-9]/g, '');

                      const durationDays = Number(inv.duration_days) || 7;
                      const amountUsd = Number(inv.amount || inv.amount_usd || inv.total_amount || 0);
                      const amountCdf = Number(inv.amount_cdf || inv.total_amount_cdf || (amountUsd * 2850));
                      const isPending = inv.status === 'pending';
                      const isPaid = inv.status === 'paid';
                      const isFailed = inv.status === 'failed' || inv.status === 'cancelled';

                      return (
                        <div
                          key={inv.id}
                          className={`rounded-2xl border p-5 transition-all bg-slate-900 ${
                            isPending
                              ? 'border-amber-500/40 shadow-lg shadow-amber-500/5'
                              : isPaid
                              ? 'border-emerald-500/30'
                              : 'border-slate-800 opacity-80'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            {/* Colonne 1: Bien Immobilier Ciblé */}
                            <div className="flex items-start gap-4 min-w-[280px] max-w-sm">
                              <img
                                src={propImg}
                                alt={propTitle}
                                className="w-20 h-16 rounded-xl object-cover border border-slate-800 shrink-0"
                              />
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {inv.invoice_number || inv.id}
                                  </span>
                                  {isPending && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase">
                                      En attente
                                    </span>
                                  )}
                                  {isPaid && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                                      Boost Actif
                                    </span>
                                  )}
                                  {isFailed && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-black uppercase">
                                      Rejeté
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-bold text-white text-sm line-clamp-1">
                                  {propTitle}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  <span>📍 {propCommune}</span>
                                  {targetProp && (
                                    <button
                                      type="button"
                                      onClick={() => setActivePropertyModalId(targetProp.id)}
                                      className="text-emerald-400 hover:underline font-bold flex items-center gap-0.5"
                                    >
                                      <span>Voir fiche</span>
                                      <ArrowUpRight className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Colonne 2: Demandeur & Contact WhatsApp */}
                            <div className="min-w-[200px] space-y-1 text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                Annonceur / Demandeur
                              </span>
                              <div className="font-bold text-white">{applicantName}</div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                {applicantEmail}
                              </div>
                              <a
                                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                                  `Bonjour ${applicantName}, nous traitons votre demande de boost Kinimmo pour l'annonce "${propTitle}".`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold mt-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Contacter sur WhatsApp</span>
                              </a>
                            </div>

                            {/* Colonne 3: Formule choisie & Tarif */}
                            <div className="min-w-[180px] space-y-1 text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                Formule de Visibilité
                              </span>
                              <div className="font-black text-amber-300 flex items-center gap-1">
                                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                                <span>{inv.option_name || 'Boost Vedette'}</span>
                              </div>
                              <div className="text-[11px] text-slate-300 font-semibold">
                                Durée : <span className="text-white font-bold">{durationDays} jours</span>
                              </div>
                              <div className="font-black text-white text-sm">
                                {amountUsd} USD{' '}
                                <span className="text-[11px] text-slate-400 font-normal">
                                  (~{amountCdf.toLocaleString()} CDF)
                                </span>
                              </div>
                            </div>

                            {/* Colonne 4: Moyen de Paiement & Code Transaction */}
                            <div className="min-w-[210px] space-y-1.5 text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                Modalité & Référence Reçue
                              </span>
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                <Landmark className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span>{inv.payment_method_provider || 'Mobile Money RDC'}</span>
                              </div>
                              {inv.transaction_reference ? (
                                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono">
                                  <span className="text-slate-400 block text-[9px] uppercase">Code Transaction SMS :</span>
                                  <strong className="text-emerald-400 font-black tracking-wide">
                                    {inv.transaction_reference}
                                  </strong>
                                </div>
                              ) : (
                                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold">
                                  En attente de code SMS
                                </div>
                              )}
                            </div>

                            {/* Colonne 5: Décision Administrateur (Boutons Valider / Rejeter) */}
                            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 w-full sm:w-auto lg:w-44">
                              {isPending ? (
                                <>
                                  <button
                                    onClick={() => handleApproveInvoice(inv.id)}
                                    disabled={isProcessing === inv.id}
                                    className="w-full px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    title="Confirmer la réception des fonds et activer immédiatement le boost"
                                  >
                                    {isProcessing === inv.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>Valider & Activer</span>
                                  </button>

                                  <button
                                    onClick={() => handleRejectInvoice(inv.id)}
                                    disabled={isProcessing === inv.id}
                                    className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-500/30 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                    title="Rejeter la demande de boost"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Refuser Paiement</span>
                                  </button>
                                </>
                              ) : isPaid ? (
                                <div className="text-center p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold space-y-0.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    <span>Paiement Validé ✓</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-normal block">
                                    Boost actif sur l'annonce
                                  </span>
                                </div>
                              ) : (
                                <div className="text-center p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold space-y-0.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <XCircle className="w-4 h-4 text-rose-400" />
                                    <span>Paiement Rejeté</span>
                                  </div>
                                  {inv.notes && (
                                    <span className="text-[10px] text-slate-400 font-normal block truncate max-w-[170px]" title={inv.notes}>
                                      {inv.notes}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        );
      })()}

      {/* Sub-Tab 1: Factures & Approbation des paiements */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Historique des Factures & Règlements (Mobile Money & Banques)
            </h3>
            <button
              onClick={loadData}
              className="text-xs text-emerald-400 hover:underline font-bold"
            >
              Rafraîchir
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Facture #</th>
                    <th className="px-4 py-3">Bénéficiaire / Client</th>
                    <th className="px-4 py-3">Type / Description</th>
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Mode & Référence</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Aucune facture enregistrée pour le moment.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 font-mono font-bold text-white">
                          {inv.invoice_number || inv.id}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-white block">
                            {inv.target_name || inv.user_name || 'Client Kinshasa'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {inv.target_email || inv.user_email}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-200 block">
                            {inv.plan_name || inv.option_name || inv.invoice_type || 'Abonnement'}
                          </span>
                          {inv.property_title && (
                            <span className="text-[10px] text-amber-400 block truncate max-w-[180px]">
                              Bien: {inv.property_title}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-black text-white block">
                            {inv.total_amount || inv.amount || 0} {inv.currency || 'USD'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            ~{Number(inv.total_amount_cdf || inv.amount_cdf || (Number(inv.total_amount || inv.amount || 0) * 2850)).toLocaleString()} CDF
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[11px] text-slate-300 block">
                            {inv.payment_method_provider || inv.payment_method || 'Mobile Money'}
                          </span>
                          {inv.transaction_reference && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold">
                              Réf: {inv.transaction_reference}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              inv.status === 'paid'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : inv.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {inv.status === 'paid' ? 'Payée' : inv.status === 'pending' ? 'En attente' : inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {inv.status !== 'paid' ? (
                            <button
                              onClick={() => handleApproveInvoice(inv.id)}
                              disabled={isProcessing === inv.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow transition-all active:scale-95 disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              {isProcessing === inv.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>Valider Paiement</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Activé ✓
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Formules d'abonnements */}
      {activeSubTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Catalogue des Abonnements (Particuliers, Courtiers, Agences, Promoteurs VIP)
              </h3>
              <p className="text-xs text-slate-400">
                Ajustez les tarifs mensuels en USD & CDF, les plafonds d'annonces et les privilèges de chaque formule
              </p>
            </div>
            <button
              onClick={handleOpenCreatePlan}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une Formule</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => {
              const priceUsd = Number(p.priceMonthly ?? p.price_usd ?? p.price ?? 0);
              const priceCdf = Number(p.priceMonthlyCDF ?? p.price_cdf ?? (priceUsd * 2850));

              return (
                <div
                  key={p.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                        {p.category || 'Général'}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditPlan(p)}
                          className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Modifier les tarifs et fonctionnalités"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {p.id !== 'starter' && p.id !== 'pro' && p.id !== 'agency' && p.id !== 'enterprise' && (
                          <button
                            onClick={() => handleDeletePlan(p.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-black text-base text-white">{p.name}</h4>
                      {p.badge && (
                        <span className="inline-block text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 mt-1">
                          {p.badge}
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="text-2xl font-black text-emerald-400">
                        {priceUsd === 0 ? 'Gratuit' : `${priceUsd} USD / mois`}
                      </div>
                      {priceUsd > 0 && (
                        <span className="text-xs text-slate-400 font-semibold block mt-0.5">
                          ~{priceCdf.toLocaleString()} CDF / mois
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {p.description || 'Formule active sur la plateforme Kinshasa.'}
                    </p>

                    <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 space-y-1 font-medium">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max Annonces :</span>
                        <strong className="text-white">
                          {(p.maxListings ?? p.max_listings ?? 0) >= 500 ? 'Illimité' : (p.maxListings ?? p.max_listings ?? 3)}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Annonces Vedettes :</span>
                        <strong className="text-amber-400">
                          {p.featuredListings ?? p.max_featured_listings ?? 0}
                        </strong>
                      </div>
                      {p.hasCrmLeads && (
                        <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Leads Conciergerie inclus</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60">
                    <button
                      onClick={() => handleOpenEditPlan(p)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier le Tarif & Options</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Options de visibilité */}
      {activeSubTab === 'options' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Catalogue des Options de Visibilité & Boosts à la carte
              </h3>
              <p className="text-xs text-slate-400">
                Gérez les prix unitaires, la durée d'effet et les badges des boosts de biens
              </p>
            </div>
            <button
              onClick={handleOpenCreateOption}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Créer une Option de Boost</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {options.map((opt) => {
              const priceUsd = Number(opt.price_usd ?? (opt as any).price ?? 0);
              const priceCdf = Number(opt.price_cdf ?? (opt as any).priceCDF ?? (priceUsd * 2850));

              return (
                <div
                  key={opt.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        {opt.boost_type}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditOption(opt)}
                          className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Modifier le prix et la durée"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {opt.id !== 'opt_featured_7d' && opt.id !== 'opt_premium_30d' && (
                          <button
                            onClick={() => handleDeleteOption(opt.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 className="font-bold text-base text-white">{opt.name}</h4>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xl font-black text-amber-400">
                          {priceUsd} USD
                        </span>
                        <span className="text-xs font-mono text-slate-400 font-bold">
                          {opt.duration_days} jours de validité
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-semibold block mt-0.5">
                        ~{priceCdf.toLocaleString()} CDF
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {opt.description}
                    </p>

                    {opt.badge_text && (
                      <div className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Aperçu Badge : {opt.badge_text}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/60">
                    <button
                      onClick={() => handleOpenEditOption(opt)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier Tarif & Durée</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ÉDITION & CRÉATION DE FORMULE D'ABONNEMENT     */}
      {/* ======================================================== */}
      {(editingPlan || isCreatingPlan) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 text-white space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-lg text-white">
                  {editingPlan ? `Modifier la Formule: ${editingPlan.name}` : 'Nouvelle Formule d\'Abonnement'}
                </h3>
              </div>
              <button
                onClick={() => { setEditingPlan(null); setIsCreatingPlan(false); }}
                className="text-slate-400 hover:text-white text-base p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nom de la formule *</label>
                  <input
                    type="text"
                    required
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    placeholder="Ex: Pro Courtier Indépendant"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Badge public</label>
                  <input
                    type="text"
                    value={planForm.badge}
                    onChange={(e) => setPlanForm({ ...planForm, badge: e.target.value })}
                    placeholder="Ex: Courtier Pro, Agence Agréée"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Catégorie cible</label>
                  <select
                    value={planForm.category}
                    onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="individual">Particulier / Propriétaire</option>
                    <option value="pro">Courtier Indépendant Pro</option>
                    <option value="agency">Agence Immobilière Certifiée</option>
                    <option value="promoter">Promoteur Foncier VIP</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Prix USD ($) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={planForm.price_usd}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPlanForm({
                          ...planForm,
                          price_usd: val,
                          price_cdf: Math.round(val * 2850)
                        });
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-black text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Prix CDF (FC)</label>
                    <input
                      type="number"
                      min="0"
                      value={planForm.price_cdf}
                      onChange={(e) => setPlanForm({ ...planForm, price_cdf: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Max Annonces Actives</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.max_listings}
                    onChange={(e) => setPlanForm({ ...planForm, max_listings: parseInt(e.target.value) || 3 })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">500 ou plus = Illimité</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Annonces Vedettes Incluses</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.max_featured_listings}
                    onChange={(e) => setPlanForm({ ...planForm, max_featured_listings: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description courte</label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Avantages principaux présentés sur la page de tarification..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">
                  Fonctionnalités incluses (une par ligne)
                </label>
                <textarea
                  rows={4}
                  value={planForm.features_text}
                  onChange={(e) => setPlanForm({ ...planForm, features_text: e.target.value })}
                  placeholder="Jusqu'à 25 annonces actives&#10;Badge Vérifié Kinshasa&#10;Accès direct aux demandes de Conciergerie..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.recommended}
                    onChange={(e) => setPlanForm({ ...planForm, recommended: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Recommandé</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.has_verified_badge}
                    onChange={(e) => setPlanForm({ ...planForm, has_verified_badge: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Badge Officiel</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.has_crm_leads}
                    onChange={(e) => setPlanForm({ ...planForm, has_crm_leads: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Leads Conciergerie</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planForm.is_active}
                    onChange={(e) => setPlanForm({ ...planForm, is_active: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                  />
                  <span>Formule Active</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setEditingPlan(null); setIsCreatingPlan(false); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg"
                >
                  {editingPlan ? 'Mettre à jour la Formule' : 'Enregistrer la Formule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ÉDITION & CRÉATION D'OPTION DE VISIBILITÉ (BOOST) */}
      {/* ======================================================== */}
      {(editingOption || isCreatingOption) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 text-white space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-lg text-white">
                  {editingOption ? `Modifier le Boost: ${editingOption.name}` : 'Nouvelle Option de Boost'}
                </h3>
              </div>
              <button
                onClick={() => { setEditingOption(null); setIsCreatingOption(false); }}
                className="text-slate-400 hover:text-white text-base p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOption} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Nom de l'option *</label>
                  <input
                    type="text"
                    required
                    value={optionForm.name}
                    onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                    placeholder="Ex: Mise en Avant 7 jours"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Type de boost</label>
                  <select
                    value={optionForm.boost_type}
                    onChange={(e) => setOptionForm({ ...optionForm, boost_type: e.target.value as any })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="featured">Vedette (Carrousel Accueil & Tête de liste)</option>
                    <option value="premium">Pack Premium (Cadre doré VIP)</option>
                    <option value="urgent">Urgent Flash (Bandeau rouge)</option>
                    <option value="refresh">Remontée 24h (Top liste instantané)</option>
                    <option value="social_blast">Multi-Canal (WhatsApp VIP & Réseaux)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Prix USD ($) *</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={optionForm.price_usd}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setOptionForm({
                        ...optionForm,
                        price_usd: val,
                        price_cdf: Math.round(val * 2850)
                      });
                    }}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400 font-black text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Prix CDF (FC)</label>
                  <input
                    type="number"
                    min="0"
                    value={optionForm.price_cdf}
                    onChange={(e) => setOptionForm({ ...optionForm, price_cdf: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Durée d'activation (jours) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={optionForm.duration_days}
                    onChange={(e) => setOptionForm({ ...optionForm, duration_days: parseInt(e.target.value) || 7 })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Badge visuel sur l'annonce</label>
                  <input
                    type="text"
                    value={optionForm.badge_text}
                    onChange={(e) => setOptionForm({ ...optionForm, badge_text: e.target.value })}
                    placeholder="Ex: ⭐ En Vedette, 👑 Premium"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Description du boost</label>
                <textarea
                  rows={3}
                  value={optionForm.description}
                  onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                  placeholder="Explication claire visible par l'utilisateur lors du choix du boost..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setEditingOption(null); setIsCreatingOption(false); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-lg"
                >
                  {editingOption ? 'Enregistrer les Modifications' : 'Créer l\'Option'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
