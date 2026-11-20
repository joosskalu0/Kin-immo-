import React, { useState, useEffect } from 'react';
import { mysqlApi } from '../../services/mysqlApi';
import { MonetizationStats, VisibilityOption, PlanAudience, Invoice } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  AUDIENCE_LABELS,
  formatInvoiceStatusInfo,
  isLaunchAudience,
  mapCategoryToAudience
} from '../../utils/billingHelpers';
import { generatePaymentReceiptPDF } from '../../utils/pdfGenerator';
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
  ArrowUpRight,
  FileText,
  RotateCcw,
  Ban,
  X
} from 'lucide-react';

interface AdminMonetizationManagerProps {
  onRefreshStats?: () => void;
}

export const AdminMonetizationManager: React.FC<AdminMonetizationManagerProps> = ({
  onRefreshStats
}) => {
  const {
    properties,
    updateInvoiceStatus,
    setActivePropertyModalId,
    cdfExchangeRate,
    approveManualInvoice,
    rejectManualInvoice,
    refundManualInvoice
  } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'boosts' | 'invoices' | 'plans' | 'options'>('boosts');
  const [boostStatusFilter, setBoostStatusFilter] = useState<'to_validate' | 'awaiting_validation' | 'paid' | 'failed' | 'refunded' | 'all'>('to_validate');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'awaiting_validation' | 'pending' | 'paid' | 'rejected' | 'refunded'>('all');
  const [stats, setStats] = useState<MonetizationStats | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [options, setOptions] = useState<VisibilityOption[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Proof inspection & rejection modal
  const [reviewModalInv, setReviewModalInv] = useState<any | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('Référence transaction introuvable ou montant non reçu');

  // Manual refund modal
  const [refundModalInv, setRefundModalInv] = useState<any | null>(null);
  const [refundNoteInput, setRefundNoteInput] = useState<string>('');
  const [refundActionChoice, setRefundActionChoice] = useState<'revoke' | 'keep'>('revoke');

  // Formulaire Forfait / Abonnement (Création / Édition)
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState<boolean>(false);
  const [planForm, setPlanForm] = useState({
    id: '',
    name: '',
    description: '',
    category: 'individual',
    audience: 'grand_public' as PlanAudience,
    badge: '',
    price_usd: 0,
    price_cdf: 0,
    price_yearly_usd: 0,
    price_yearly_cdf: 0,
    trial_days: 0,
    max_listings: 3,
    max_photos: 5,
    max_videos: 0,
    included_boosts: 0,
    max_featured_listings: 0,
    max_team_members: 1,
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

  const toInvoiceObject = (raw: any): Invoice => {
    const amountUsd = Number(raw.totalAmount ?? raw.total_amount ?? raw.amount ?? raw.amount_usd ?? 0);
    const amountCdf = Number(raw.totalAmountCDF ?? raw.total_amount_cdf ?? raw.amount_cdf ?? Math.round(amountUsd * cdfExchangeRate));
    return {
      id: raw.id,
      invoiceNumber: raw.invoiceNumber || raw.invoice_number || raw.id,
      receiptNumber: raw.receiptNumber || raw.receipt_number,
      targetType: raw.targetType || raw.target_type || (raw.agency_id ? 'agency' : 'agent'),
      targetId: raw.targetId || raw.target_id || raw.user_id || raw.agency_id || 'client',
      targetName: raw.targetName || raw.target_name || raw.user_name || 'Client Kinimmo',
      targetEmail: raw.targetEmail || raw.target_email || raw.user_email || '',
      targetPhone: raw.targetPhone || raw.target_phone || '',
      planId: raw.planId || raw.plan_id,
      planName: raw.planName || raw.plan_name || raw.option_name,
      billingCycle: raw.billingCycle || raw.billing_cycle || 'monthly',
      invoiceType: raw.invoiceType || raw.invoice_type,
      propertyId: raw.propertyId || raw.property_id,
      propertyTitle: raw.propertyTitle || raw.property_title,
      items: Array.isArray(raw.items) && raw.items.length > 0
        ? raw.items
        : [{
            description: raw.plan_name || raw.option_name || (raw.property_title ? `Boost : ${raw.property_title}` : 'Abonnement Kinimmo'),
            quantity: 1,
            unitPrice: amountUsd,
            total: amountUsd
          }],
      totalAmount: amountUsd,
      totalAmountCDF: amountCdf,
      currency: raw.currency || 'USD',
      status: raw.status || 'pending',
      paymentMethod: raw.paymentMethod || raw.payment_method,
      paymentMethodProvider: raw.paymentMethodProvider || raw.payment_method_provider,
      transactionReference: raw.transactionReference || raw.transaction_reference,
      proofImageUrl: raw.proofImageUrl || raw.proof_image_url,
      paidAt: raw.paidAt || raw.paid_at,
      dueDate: raw.dueDate || raw.due_date || new Date().toISOString().split('T')[0],
      rejectionReason: raw.rejectionReason || raw.rejection_reason,
      refundNote: raw.refundNote || raw.refund_note,
      refundAction: raw.refundAction || raw.refund_action,
      refundedAt: raw.refundedAt || raw.refunded_at,
      notes: raw.notes,
      createdAt: raw.createdAt || raw.created_at || new Date().toISOString()
    };
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    setIsProcessing(invoiceId);
    try {
      await approveManualInvoice(invoiceId);
      setReviewModalInv(null);
      showMsg('success', 'Paiement validé ! Plan/Boost activé et reçu PDF prêt.');
      await loadData();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      showMsg('error', err.message || 'Échec de l\'approbation');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectInvoice = async (invoiceId: string, reason?: string) => {
    const cleanReason = (reason || rejectReasonInput || 'Paiement non confirmé').trim();
    setIsProcessing(invoiceId);
    try {
      await rejectManualInvoice(invoiceId, cleanReason);
      setReviewModalInv(null);
      showMsg('success', 'Preuve refusée. Le client a été notifié avec le motif.');
      await loadData();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      showMsg('error', err.message || 'Échec du rejet');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalInv) return;
    setIsProcessing(refundModalInv.id);
    try {
      await refundManualInvoice(
        refundModalInv.id,
        refundNoteInput.trim() || 'Remboursement manuel validé par l\'administration',
        refundActionChoice
      );
      setRefundModalInv(null);
      setRefundNoteInput('');
      showMsg(
        'success',
        refundActionChoice === 'revoke'
          ? 'Remboursement enregistré et abonnement/boost révoqué (rétrogradation douce appliquée).'
          : 'Remboursement enregistré avec maintien du plan/boost.'
      );
      await loadData();
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur lors du remboursement');
    } finally {
      setIsProcessing(null);
    }
  };

  // Gestion des Formules d'abonnements (Plans)
  const handleOpenEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setIsCreatingPlan(false);
    const priceUsd = Number(plan.priceMonthly ?? plan.price_usd ?? plan.price ?? 0);
    const priceCdf = Number(plan.priceMonthlyCDF ?? plan.price_cdf ?? Math.round(priceUsd * cdfExchangeRate));
    const priceYearlyUsd = Number(plan.priceYearly ?? plan.price_yearly_usd ?? Math.round(priceUsd * 10));
    const priceYearlyCdf = Number(plan.priceYearlyCDF ?? plan.price_yearly_cdf ?? Math.round(priceYearlyUsd * cdfExchangeRate));
    const feats = Array.isArray(plan.features) ? plan.features.join('\n') : (typeof plan.features === 'string' ? plan.features : '');
    const audience = (plan.audience || mapCategoryToAudience(plan.category, plan.id)) as PlanAudience;
    const includedBoosts = Number(plan.includedBoosts ?? plan.included_boosts ?? plan.featuredListings ?? plan.max_featured_listings ?? 0);

    setPlanForm({
      id: plan.id,
      name: plan.name || '',
      description: plan.description || '',
      category: plan.category || 'individual',
      audience,
      badge: plan.badge || '',
      price_usd: priceUsd,
      price_cdf: priceCdf,
      price_yearly_usd: priceYearlyUsd,
      price_yearly_cdf: priceYearlyCdf,
      trial_days: Number(plan.trialDays ?? plan.trial_days ?? 0),
      max_listings: Number(plan.maxListings ?? plan.max_listings ?? 3),
      max_photos: Number(plan.maxPhotos ?? plan.max_photos ?? 5),
      max_videos: Number(plan.maxVideos ?? plan.max_videos ?? 0),
      included_boosts: includedBoosts,
      max_featured_listings: includedBoosts,
      max_team_members: Number(plan.agentAccounts ?? plan.max_team_members ?? 1),
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
      category: 'pro',
      audience: 'grand_public',
      badge: 'Pack Nouveau',
      price_usd: 19,
      price_cdf: Math.round(19 * cdfExchangeRate),
      price_yearly_usd: 190,
      price_yearly_cdf: Math.round(190 * cdfExchangeRate),
      trial_days: 7,
      max_listings: 10,
      max_photos: 10,
      max_videos: 2,
      included_boosts: 1,
      max_featured_listings: 1,
      max_team_members: 1,
      features_text: 'Jusqu\'à 10 annonces\n10 photos par annonce\n1 boost inclus\nSupport WhatsApp',
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
      showMsg('error', 'Veuillez renseigner le nom de la formule.');
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
      priceYearly: Number(planForm.price_yearly_usd),
      price_yearly_usd: Number(planForm.price_yearly_usd),
      priceYearlyCDF: Number(planForm.price_yearly_cdf),
      price_yearly_cdf: Number(planForm.price_yearly_cdf),
      trialDays: Number(planForm.trial_days),
      trial_days: Number(planForm.trial_days),
      maxListings: Number(planForm.max_listings),
      max_listings: Number(planForm.max_listings),
      maxPhotos: Number(planForm.max_photos),
      max_photos: Number(planForm.max_photos),
      maxVideos: Number(planForm.max_videos),
      max_videos: Number(planForm.max_videos),
      includedBoosts: Number(planForm.included_boosts),
      included_boosts: Number(planForm.included_boosts),
      featuredListings: Number(planForm.included_boosts),
      max_featured_listings: Number(planForm.included_boosts),
      agentAccounts: Number(planForm.max_team_members),
      max_team_members: Number(planForm.max_team_members),
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

      {/* Calculs spécifiques des demandes de boost & validation */}
      {(() => {
        const boostInvoices = invoices.filter(
          (inv) => inv.invoice_type === 'boost' || inv.invoiceType === 'boost' || inv.property_id || inv.propertyId || inv.option_id
        );
        const awaitingInvoicesAll = invoices.filter((inv) => inv.status === 'awaiting_validation');
        const pendingBoosts = boostInvoices.filter((inv) => inv.status === 'pending' || inv.status === 'awaiting_validation');
        const awaitingBoosts = boostInvoices.filter((inv) => inv.status === 'awaiting_validation');
        const activeBoosts = boostInvoices.filter((inv) => inv.status === 'paid');
        const rejectedBoosts = boostInvoices.filter((inv) => inv.status === 'failed' || inv.status === 'cancelled' || inv.status === 'rejected');
        const refundedBoosts = boostInvoices.filter((inv) => inv.status === 'refunded');

        const filteredBoosts = boostInvoices.filter((inv) => {
          if (boostStatusFilter === 'to_validate') return inv.status === 'pending' || inv.status === 'awaiting_validation';
          if (boostStatusFilter === 'awaiting_validation') return inv.status === 'awaiting_validation';
          if (boostStatusFilter === 'paid') return inv.status === 'paid';
          if (boostStatusFilter === 'failed') return inv.status === 'failed' || inv.status === 'cancelled' || inv.status === 'rejected';
          if (boostStatusFilter === 'refunded') return inv.status === 'refunded';
          return true;
        });

        const filteredInvoicesList = invoices.filter((inv) => {
          if (invoiceStatusFilter === 'all') return true;
          if (invoiceStatusFilter === 'rejected') return inv.status === 'rejected' || inv.status === 'cancelled' || inv.status === 'failed';
          return inv.status === invoiceStatusFilter;
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
                <div className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
                  {Number(stats?.invoices?.total_revenue_usd || 0).toLocaleString()} USD
                </div>
                <span className="text-[11px] text-slate-500 block font-mono tabular-nums">
                  ~{Number(stats?.invoices?.total_revenue_cdf || 0).toLocaleString()} CDF encaissés
                </span>
              </div>

              <div
                onClick={() => {
                  setActiveSubTab('invoices');
                  setInvoiceStatusFilter('awaiting_validation');
                }}
                className={`p-5 rounded-2xl bg-slate-900 border transition-all cursor-pointer space-y-1 ${
                  awaitingInvoicesAll.length > 0
                    ? 'border-sky-500/50 shadow-lg shadow-sky-500/10 hover:border-sky-400'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Preuves à Valider</span>
                  <Clock className={`w-4 h-4 ${awaitingInvoicesAll.length > 0 ? 'text-sky-400 animate-pulse' : 'text-slate-500'}`} />
                </div>
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-black font-mono tabular-nums ${awaitingInvoicesAll.length > 0 ? 'text-sky-400' : 'text-slate-300'}`}>
                    {awaitingInvoicesAll.length}
                  </div>
                  {awaitingInvoicesAll.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black uppercase">
                      Réf / Capture reçue
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Boosts & Abonnements Mobile Money
                </span>
              </div>

              <div
                onClick={() => {
                  setActiveSubTab('boosts');
                  setBoostStatusFilter('to_validate');
                }}
                className={`p-5 rounded-2xl bg-slate-900 border transition-all cursor-pointer space-y-1 ${
                  pendingBoosts.length > 0
                    ? 'border-amber-500/50 hover:border-amber-400'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Boosts en Attente</span>
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400 font-mono tabular-nums">
                  {pendingBoosts.length}
                </div>
                <span className="text-[11px] text-slate-400 block font-semibold">
                  Dont {awaitingBoosts.length} avec référence envoyée
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>Factures Réglées</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white font-mono tabular-nums">
                  {stats?.invoices?.paid_invoices || 0}{' '}
                  <span className="text-xs text-slate-400 font-normal">
                    / {stats?.invoices?.total_invoices || 0} émises
                  </span>
                </div>
                <span className="text-[11px] text-emerald-400 block font-semibold">
                  {activeBoosts.length || stats?.activeBoosts || 0} boost(s) actifs
                </span>
              </div>
            </div>

            {/* Sub navigation buttons */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              {[
                {
                  id: 'boosts',
                  label: `⚡ Demandes de Boost (${pendingBoosts.length} à valider)`,
                  icon: Zap,
                  badge: pendingBoosts.length
                },
                {
                  id: 'invoices',
                  label: `Factures & Règlements (${invoices.length})`,
                  icon: DollarSign,
                  badge: awaitingInvoicesAll.length
                },
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
                      { id: 'to_validate', label: 'À valider', count: pendingBoosts.length },
                      { id: 'awaiting_validation', label: 'Preuves reçues', count: awaitingBoosts.length },
                      { id: 'paid', label: 'Boosts Actifs & Validés', count: activeBoosts.length },
                      { id: 'failed', label: 'Rejetés', count: rejectedBoosts.length },
                      { id: 'refunded', label: 'Remboursés', count: refundedBoosts.length },
                      { id: 'all', label: 'Toutes', count: boostInvoices.length }
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
                          (f.id === 'to_validate' || f.id === 'awaiting_validation') && f.count > 0
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
                      Aucune demande trouvée avec ce filtre.
                    </div>
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
                      const applicantPhone = inv.target_phone || '+243 84 529 4616';
                      const cleanPhone = applicantPhone.replace(/[^0-9]/g, '');

                      const durationDays = Number(inv.duration_days) || 7;
                      const amountUsd = Number(inv.amount || inv.amount_usd || inv.total_amount || 0);
                      const amountCdf = Number(inv.amount_cdf || inv.total_amount_cdf || Math.round(amountUsd * cdfExchangeRate));
                      const isPendingOrAwaiting = inv.status === 'pending' || inv.status === 'awaiting_validation';
                      const isPaid = inv.status === 'paid';
                      const isRefunded = inv.status === 'refunded';
                      const statusMeta = formatInvoiceStatusInfo(inv.status);

                      return (
                        <div
                          key={inv.id}
                          className={`rounded-2xl border p-5 transition-all bg-slate-900 ${
                            inv.status === 'awaiting_validation'
                              ? 'border-sky-500/40'
                              : inv.status === 'pending'
                              ? 'border-amber-500/40'
                              : isPaid
                              ? 'border-emerald-500/30'
                              : 'border-slate-800'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-[260px] max-w-sm">
                              <img
                                src={propImg}
                                alt={propTitle}
                                className="w-20 h-16 rounded-xl object-cover border border-slate-800 shrink-0"
                              />
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {inv.invoice_number || inv.id}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${statusMeta.tone}`}>
                                    {statusMeta.label}
                                  </span>
                                </div>
                                <h4 className="font-bold text-white text-sm line-clamp-1">
                                  {propTitle}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  <span>{propCommune}</span>
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

                            <div className="min-w-[180px] space-y-1 text-xs">
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
                                <span>Contacter WhatsApp</span>
                              </a>
                            </div>

                            <div className="min-w-[170px] space-y-1 text-xs">
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
                              <div className="font-black text-white text-sm font-mono tabular-nums">
                                {amountUsd} USD{' '}
                                <span className="text-[11px] text-slate-400 font-normal">
                                  (~{amountCdf.toLocaleString()} CDF)
                                </span>
                              </div>
                            </div>

                            <div className="min-w-[210px] space-y-1.5 text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                Modalité & Preuve Mobile Money
                              </span>
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                <Landmark className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span>{inv.payment_method_provider || 'Mobile Money RDC'}</span>
                              </div>
                              {inv.transaction_reference ? (
                                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono flex items-center justify-between gap-2">
                                  <div>
                                    <span className="text-slate-400 block text-[9px] uppercase">Réf Transaction :</span>
                                    <strong className="text-emerald-400 font-black tracking-wide">
                                      {inv.transaction_reference}
                                    </strong>
                                  </div>
                                  {inv.proof_image_url && (
                                    <img
                                      src={inv.proof_image_url}
                                      alt="Capture preuve"
                                      onClick={() => setReviewModalInv(inv)}
                                      className="w-9 h-9 rounded-lg object-cover border border-slate-700 cursor-pointer hover:opacity-80"
                                      title="Cliquer pour agrandir la capture"
                                    />
                                  )}
                                </div>
                              ) : (
                                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-semibold">
                                  En attente de référence client
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto lg:w-48">
                              {isPendingOrAwaiting ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setReviewModalInv(inv);
                                      setRejectReasonInput('Référence transaction introuvable ou montant non reçu');
                                    }}
                                    disabled={isProcessing === inv.id}
                                    className="w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Examiner & Valider</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReviewModalInv(inv);
                                      setRejectReasonInput('Référence transaction introuvable ou montant non reçu');
                                    }}
                                    disabled={isProcessing === inv.id}
                                    className="w-full px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Refuser</span>
                                  </button>
                                </>
                              ) : (isPaid || isRefunded) ? (
                                <div className="flex flex-col gap-1.5">
                                  <button
                                    onClick={() => generatePaymentReceiptPDF(toInvoiceObject(inv), { cdfExchangeRate })}
                                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Reçu PDF</span>
                                  </button>
                                  {isPaid && (
                                    <button
                                      onClick={() => {
                                        setRefundModalInv(inv);
                                        setRefundNoteInput('');
                                        setRefundActionChoice('revoke');
                                      }}
                                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-rose-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5"
                                    >
                                      <RotateCcw className="w-3.5 h-3.5" />
                                      <span>Rembourser</span>
                                    </button>
                                  )}
                                  {isRefunded && inv.refund_note && (
                                    <span className="text-[10px] text-slate-400 truncate max-w-[180px]" title={inv.refund_note}>
                                      Note : {inv.refund_note}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold space-y-0.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <XCircle className="w-4 h-4 text-rose-400" />
                                    <span>Paiement Refusé</span>
                                  </div>
                                  {(inv.rejection_reason || inv.notes) && (
                                    <span className="text-[10px] text-slate-400 font-normal block truncate max-w-[170px]" title={inv.rejection_reason || inv.notes}>
                                      {inv.rejection_reason || inv.notes}
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

            {/* Sub-Tab 1: Factures & Approbation des paiements */}
            {activeSubTab === 'invoices' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Historique des Factures, Preuves & Remboursements
                    </h3>
                    <p className="text-xs text-slate-400">
                      Validez les preuves Mobile Money, téléchargez les reçus PDF ou gérez les remboursements manuels.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'all', label: 'Toutes' },
                      { id: 'awaiting_validation', label: 'À valider' },
                      { id: 'pending', label: 'En attente' },
                      { id: 'paid', label: 'Payées' },
                      { id: 'rejected', label: 'Refusées' },
                      { id: 'refunded', label: 'Remboursées' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setInvoiceStatusFilter(f.id as any)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                          invoiceStatusFilter === f.id
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                    <button
                      onClick={loadData}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-emerald-400 text-[11px] font-bold hover:bg-slate-700"
                    >
                      Rafraîchir
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 text-[11px] uppercase tracking-wider font-extrabold border-b border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Facture #</th>
                          <th className="px-4 py-3">Bénéficiaire / Client</th>
                          <th className="px-4 py-3">Type / Formule</th>
                          <th className="px-4 py-3">Montant</th>
                          <th className="px-4 py-3">Preuve Mobile Money</th>
                          <th className="px-4 py-3">Statut</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {filteredInvoicesList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                              Aucune facture pour ce filtre.
                            </td>
                          </tr>
                        ) : (
                          filteredInvoicesList.map((inv) => {
                            const statusMeta = formatInvoiceStatusInfo(inv.status);
                            const amountUsd = Number(inv.total_amount || inv.amount || 0);
                            const amountCdf = Number(inv.total_amount_cdf || inv.amount_cdf || Math.round(amountUsd * cdfExchangeRate));
                            const canReview = inv.status === 'pending' || inv.status === 'awaiting_validation';

                            return (
                              <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-4 py-3.5 font-mono font-bold text-white">
                                  <div>{inv.invoice_number || inv.id}</div>
                                  {inv.receipt_number && (
                                    <span className="text-[10px] text-emerald-400 block">Reçu : {inv.receipt_number}</span>
                                  )}
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
                                  {inv.billing_cycle && (
                                    <span className="text-[10px] text-slate-400">
                                      Cycle : {inv.billing_cycle === 'yearly' ? 'Annuel' : 'Mensuel'}
                                    </span>
                                  )}
                                  {inv.property_title && (
                                    <span className="text-[10px] text-amber-400 block truncate max-w-[180px]">
                                      Bien: {inv.property_title}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 font-mono tabular-nums">
                                  <span className="font-black text-white block">
                                    {amountUsd} {inv.currency || 'USD'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 block">
                                    ~{amountCdf.toLocaleString()} CDF
                                  </span>
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <div>
                                      <span className="font-mono text-[11px] text-slate-300 block">
                                        {inv.payment_method_provider || inv.payment_method || 'Mobile Money'}
                                      </span>
                                      {inv.transaction_reference && (
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-bold">
                                          Réf: {inv.transaction_reference}
                                        </span>
                                      )}
                                    </div>
                                    {inv.proof_image_url && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReviewModalInv(inv);
                                          setRejectReasonInput('Référence transaction introuvable ou montant non reçu');
                                        }}
                                        className="p-1 rounded-lg border border-slate-700 hover:border-sky-400"
                                        title="Voir la capture justificative"
                                      >
                                        <img src={inv.proof_image_url} alt="Preuve" className="w-8 h-8 rounded object-cover" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${statusMeta.tone}`}>
                                    {statusMeta.label}
                                  </span>
                                  {inv.refund_note && (
                                    <span className="text-[10px] text-slate-400 block mt-1 max-w-[160px] truncate" title={inv.refund_note}>
                                      {inv.refund_action === 'keep' ? 'Maintenu' : 'Révoqué'} : {inv.refund_note}
                                    </span>
                                  )}
                                  {inv.rejection_reason && (
                                    <span className="text-[10px] text-rose-400 block mt-1 max-w-[160px] truncate" title={inv.rejection_reason}>
                                      Motif : {inv.rejection_reason}
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {canReview && (
                                      <button
                                        onClick={() => {
                                          setReviewModalInv(inv);
                                          setRejectReasonInput('Référence transaction introuvable ou montant non reçu');
                                        }}
                                        disabled={isProcessing === inv.id}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all disabled:opacity-50 inline-flex items-center gap-1"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>Examiner</span>
                                      </button>
                                    )}
                                    {(inv.status === 'paid' || inv.status === 'refunded') && (
                                      <button
                                        onClick={() => generatePaymentReceiptPDF(toInvoiceObject(inv), { cdfExchangeRate })}
                                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs inline-flex items-center gap-1"
                                        title="Télécharger le reçu PDF"
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>Reçu PDF</span>
                                      </button>
                                    )}
                                    {inv.status === 'paid' && (
                                      <button
                                        onClick={() => {
                                          setRefundModalInv(inv);
                                          setRefundNoteInput('');
                                          setRefundActionChoice('revoke');
                                        }}
                                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-rose-300 border border-rose-500/30 font-bold text-xs inline-flex items-center gap-1"
                                        title="Effectuer un remboursement manuel avec note"
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>Rembourser</span>
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Sub-Tab 2: Formules d'abonnements */}
      {activeSubTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Catalogue des Abonnements & Audiences (Lancement + Brouillons Admin)
              </h3>
              <p className="text-xs text-slate-400">
                Grand Public et Agence sont publiés au lancement. Promoteur et Entreprise restent en brouillon admin jusqu'à activation.
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
              const priceCdf = Number(p.priceMonthlyCDF ?? p.price_cdf ?? Math.round(priceUsd * cdfExchangeRate));
              const priceYearlyUsd = Number(p.priceYearly ?? p.price_yearly_usd ?? Math.round(priceUsd * 10));
              const trialDays = Number(p.trialDays ?? p.trial_days ?? 0);
              const audience = (p.audience || mapCategoryToAudience(p.category, p.id)) as PlanAudience;
              const isPublished = p.is_active !== false && p.isActive !== false && isLaunchAudience(audience);
              const maxPhotos = Number(p.maxPhotos ?? p.max_photos ?? 5);
              const maxVideos = Number(p.maxVideos ?? p.max_videos ?? 0);
              const includedBoosts = Number(p.includedBoosts ?? p.included_boosts ?? p.featuredListings ?? p.max_featured_listings ?? 0);
              const teamMembers = Number(p.agentAccounts ?? p.max_team_members ?? 1);

              return (
                <div
                  key={p.id}
                  className={`p-5 rounded-2xl border text-white space-y-3 flex flex-col justify-between ${
                    isPublished ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/60 border-amber-500/30'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black uppercase text-sky-300 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                        {AUDIENCE_LABELS[audience] || p.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                          isPublished
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}>
                          {isPublished ? 'Publié' : 'Brouillon Admin'}
                        </span>
                        <button
                          onClick={() => handleOpenEditPlan(p)}
                          className="text-slate-400 hover:text-emerald-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Modifier les tarifs et quotas"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!['starter', 'pro', 'agency', 'enterprise', 'promoter_draft'].includes(p.id) && (
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
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.badge && (
                          <span className="inline-block text-[10px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                            {p.badge}
                          </span>
                        )}
                        {trialDays > 0 && (
                          <span className="inline-block text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Essai {trialDays} j
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 font-mono tabular-nums">
                      <div className="text-xl font-black text-emerald-400">
                        {priceUsd === 0 ? 'Gratuit' : `${priceUsd} USD / mois`}
                      </div>
                      {priceUsd > 0 && (
                        <>
                          <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                            ~{priceCdf.toLocaleString()} CDF / mois
                          </span>
                          <span className="text-[10px] text-amber-300 font-semibold block mt-0.5">
                            Annuel : {priceYearlyUsd} USD/an
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {p.description || 'Formule active sur la plateforme Kinshasa.'}
                    </p>

                    <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 space-y-1 font-medium font-mono tabular-nums">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Annonces actives :</span>
                        <strong className="text-white">{(p.maxListings ?? p.max_listings ?? 0) >= 500 ? 'Illimité' : (p.maxListings ?? p.max_listings ?? 3)}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Photos / annonce :</span>
                        <strong className="text-white">{maxPhotos}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vidéos max :</span>
                        <strong className="text-white">{maxVideos}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Boosts inclus :</span>
                        <strong className="text-amber-400">{includedBoosts}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Membres d'équipe :</span>
                        <strong className="text-sky-300">{teamMembers}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/60">
                    <button
                      onClick={() => handleOpenEditPlan(p)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Modifier Tarif & Quotas</span>
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
                  <label className="block text-slate-400 mb-1 font-semibold">Audience (P2)</label>
                  <select
                    value={planForm.audience}
                    onChange={(e) => setPlanForm({ ...planForm, audience: e.target.value as PlanAudience })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="grand_public">Grand Public (Lancement)</option>
                    <option value="agence">Agence (Lancement)</option>
                    <option value="promoteur">Promoteur (Brouillon Admin)</option>
                    <option value="entreprise">Entreprise (Brouillon Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Essai gratuit (jours)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.trial_days}
                    onChange={(e) => setPlanForm({ ...planForm, trial_days: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Prix Mensuel USD ($) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      value={planForm.price_usd}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const yearly = Math.round(val * 10);
                        setPlanForm({
                          ...planForm,
                          price_usd: val,
                          price_cdf: Math.round(val * cdfExchangeRate),
                          price_yearly_usd: yearly,
                          price_yearly_cdf: Math.round(yearly * cdfExchangeRate)
                        });
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-black text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Mensuel CDF (FC)</label>
                    <input
                      type="number"
                      min="0"
                      value={planForm.price_cdf}
                      onChange={(e) => setPlanForm({ ...planForm, price_cdf: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Prix Annuel USD ($)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={planForm.price_yearly_usd}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPlanForm({
                          ...planForm,
                          price_yearly_usd: val,
                          price_yearly_cdf: Math.round(val * cdfExchangeRate)
                        });
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-black text-sm focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Annuel CDF (FC)</label>
                    <input
                      type="number"
                      min="0"
                      value={planForm.price_yearly_cdf}
                      onChange={(e) => setPlanForm({ ...planForm, price_yearly_cdf: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Annonces actives</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.max_listings}
                    onChange={(e) => setPlanForm({ ...planForm, max_listings: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Photos / bien</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.max_photos}
                    onChange={(e) => setPlanForm({ ...planForm, max_photos: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Vidéos max</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.max_videos}
                    onChange={(e) => setPlanForm({ ...planForm, max_videos: parseInt(e.target.value) || 0 })}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Boosts inclus</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.included_boosts}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setPlanForm({ ...planForm, included_boosts: val, max_featured_listings: val });
                    }}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1 font-semibold">Membres équipe</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.max_team_members}
                    onChange={(e) => setPlanForm({ ...planForm, max_team_members: parseInt(e.target.value) || 1 })}
                    className="w-full px-2.5 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sky-300 font-mono"
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
                  rows={3}
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
                  <span>{planForm.is_active ? 'Formule Publiée' : 'Brouillon Admin'}</span>
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

      {/* ======================================================== */}
      {/* MODAL 3: EXAMEN PREUVE MOBILE MONEY & VALIDATION/REJET    */}
      {/* ======================================================== */}
      {reviewModalInv && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Examen Preuve de Paiement Mobile Money</h3>
                <p className="text-xs text-slate-400 font-mono">{reviewModalInv.invoice_number || reviewModalInv.id}</p>
              </div>
              <button
                onClick={() => setReviewModalInv(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Client :</span>
                <span className="font-bold text-white">{reviewModalInv.target_name || reviewModalInv.user_name || 'Client Kinimmo'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Objet :</span>
                <span className="font-semibold text-slate-200">{reviewModalInv.plan_name || reviewModalInv.option_name || 'Boost / Abonnement'}</span>
              </div>
              <div className="flex justify-between font-mono tabular-nums">
                <span className="text-slate-400">Montant :</span>
                <span className="font-black text-emerald-400">
                  {Number(reviewModalInv.total_amount || reviewModalInv.amount || 0)} USD (~{Number(reviewModalInv.total_amount_cdf || reviewModalInv.amount_cdf || Math.round(Number(reviewModalInv.total_amount || reviewModalInv.amount || 0) * cdfExchangeRate)).toLocaleString()} CDF)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Opérateur :</span>
                <span className="font-bold text-sky-300">{reviewModalInv.payment_method_provider || reviewModalInv.payment_method || 'Mobile Money'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Référence reçue :</span>
                <span className="font-mono font-black text-amber-300">{reviewModalInv.transaction_reference || 'Non fournie'}</span>
              </div>
            </div>

            {reviewModalInv.proof_image_url ? (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase block">Capture justificative jointe</span>
                <img
                  src={reviewModalInv.proof_image_url}
                  alt="Justificatif paiement"
                  className="w-full max-h-64 object-contain rounded-2xl border border-slate-800 bg-slate-950"
                />
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 text-center">
                Aucune capture d'écran jointe (référence SMS uniquement).
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Motif en cas de refus (visible par le client)
              </label>
              <input
                type="text"
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleRejectInvoice(reviewModalInv.id, rejectReasonInput)}
                disabled={isProcessing === reviewModalInv.id}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>Refuser Paiement</span>
              </button>
              <button
                type="button"
                onClick={() => handleApproveInvoice(reviewModalInv.id)}
                disabled={isProcessing === reviewModalInv.id}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isProcessing === reviewModalInv.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Valider & Activer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: REMBOURSEMENT MANUEL AVEC NOTE & ACTION         */}
      {/* ======================================================== */}
      {refundModalInv && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleConfirmRefund}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-400" />
                  <span>Remboursement Manuel</span>
                </h3>
                <p className="text-xs text-slate-400 font-mono">{refundModalInv.invoice_number || refundModalInv.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setRefundModalInv(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">Effet sur l'abonnement ou le boost lié *</span>
              <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs ${
                refundActionChoice === 'revoke' ? 'bg-rose-500/10 border-rose-500/40' : 'bg-slate-950 border-slate-800'
              }`}>
                <input
                  type="radio"
                  name="refundAction"
                  checked={refundActionChoice === 'revoke'}
                  onChange={() => setRefundActionChoice('revoke')}
                  className="mt-0.5 accent-rose-500"
                />
                <div>
                  <span className="font-bold text-white block">Révoquer le plan / boost immédiatement</span>
                  <span className="text-[11px] text-slate-400">Rétrogradation douce vers le plan Gratuit (ou arrêt du boost).</span>
                </div>
              </label>
              <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs ${
                refundActionChoice === 'keep' ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800'
              }`}>
                <input
                  type="radio"
                  name="refundAction"
                  checked={refundActionChoice === 'keep'}
                  onChange={() => setRefundActionChoice('keep')}
                  className="mt-0.5 accent-emerald-500"
                />
                <div>
                  <span className="font-bold text-white block">Maintenir le plan / boost actif</span>
                  <span className="text-[11px] text-slate-400">Geste commercial : la facture passe à Remboursée sans couper l'accès.</span>
                </div>
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">Note de remboursement *</label>
              <textarea
                rows={3}
                required
                value={refundNoteInput}
                onChange={(e) => setRefundNoteInput(e.target.value)}
                placeholder="Ex: Remboursé par M-Pesa réf MP241119 suite à double paiement..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRefundModalInv(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isProcessing === refundModalInv.id}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs disabled:opacity-50"
              >
                Confirmer Remboursement
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
