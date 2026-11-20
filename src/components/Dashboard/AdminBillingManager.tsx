import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceItem, PaymentMethodConfig, User } from '../../types';
import { AdminPlansPricingManager } from './AdminPlansPricingManager';
import {
  buildEmailReminderMailto,
  buildWhatsAppReminderUrl,
  formatInvoiceStatusInfo,
  matchesAccountOwner
} from '../../utils/billingHelpers';
import { generatePaymentReceiptPDF } from '../../utils/pdfGenerator';
import {
  Receipt,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Building2,
  Users,
  Printer,
  Download,
  MessageSquare,
  Filter,
  Trash2,
  ShieldCheck,
  Check,
  X,
  Eye,
  Edit3,
  Gift,
  Coins,
  RotateCcw,
  Ban,
  Mail,
  RefreshCw,
  EyeOff,
  Loader2,
  Save
} from 'lucide-react';

export const AdminBillingManager: React.FC = () => {
  const {
    invoices,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    deleteUser,
    deleteAgent,
    deleteAgency,
    updateAgencySubscriptionStatus,
    updateUserSubscriptionStatus,
    approveManualInvoice,
    rejectManualInvoice,
    refundManualInvoice,
    runSubscriptionExpirationAudit,
    paymentMethods,
    savePaymentMethod,
    deletePaymentMethod,
    subscriptionPlans,
    properties,
    cdfExchangeRate,
    requestConfirm,
    agents,
    agencies,
    allUsers,
    user
  } = useApp();

  const [activeTab, setActiveTab] = useState<'invoices' | 'subscriptions' | 'plans_pricing' | 'settings'>('invoices');
  const [statusFilter, setStatusFilter] = useState<'all' | 'awaiting_validation' | 'pending' | 'paid' | 'rejected' | 'refunded' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<Invoice | null>(null);
  const [markPaidModalInvoice, setMarkPaidModalInvoice] = useState<Invoice | null>(null);
  const [reviewProofInvoice, setReviewProofInvoice] = useState<Invoice | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [refundModalInvoice, setRefundModalInvoice] = useState<Invoice | null>(null);
  const [refundNoteInput, setRefundNoteInput] = useState('');
  const [refundActionSelect, setRefundActionSelect] = useState<'revoke' | 'keep'>('revoke');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [paymentMethodSelect, setPaymentMethodSelect] = useState<string>(() => paymentMethods[0]?.id || 'pm_mpesa');

  // Mobile Money Operators CRUD state
  const [editingPm, setEditingPm] = useState<Partial<PaymentMethodConfig> | null>(null);

  // New Invoice Form State
  const [targetType, setTargetType] = useState<'agency' | 'agent' | 'custom'>('agency');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customNifRccm, setCustomNifRccm] = useState('');
  const [planId, setPlanId] = useState<'pro' | 'agency' | 'custom'>('agency');
  const [currency, setCurrency] = useState<'USD' | 'CDF'>('USD');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_1',
      description: 'Abonnement Mensuel Pack Agence Partenaire',
      amount: 79,
      quantity: 1
    }
  ]);
  const [notes, setNotes] = useState('Règlement via Mobile Money Kinimmo (M-Pesa, Airtel Money ou Orange Money). Indiquez la référence de transaction dans votre espace pro.');

  const notifyAdmin = (type: 'success' | 'error', text: string) => {
    setActionFeedback({ type, text });
    setTimeout(() => setActionFeedback(null), 5000);
  };

  // Registered Users state (Nouveaux venus & membres inscrits)
  const registeredUsers = React.useMemo(() => {
    const mergedMap = new Map<string, User>();
    (allUsers || []).forEach((u) => {
      if (u.email) mergedMap.set(u.email.toLowerCase(), u);
    });
    if (user && user.email) {
      mergedMap.set(user.email.toLowerCase(), user);
    }
    return Array.from(mergedMap.values());
  }, [allUsers, user]);

  // Combined targets: registered users (nouveaux venus) + demo agents (excluding administrators)
  const isAdministrator = (email?: string, name?: string, role?: string, id?: string) => {
    const roleLower = (role || '').toLowerCase();
    return roleLower === 'admin';
  };

  const combinedAgentTargets = [
    ...registeredUsers
      .filter((u) => !isAdministrator(u.email, u.name, u.role, u.id) && !(u as any).isAdmin)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '+243 84 529 4616',
        role: u.role || 'agent',
        agencyName: u.agencyName || (u.role === 'agent' ? 'Agent Indépendant Inscrit' : 'Membre Inscrit'),
        avatar: u.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        rccmOrNif: u.rccmOrNif || 'CD/KIN/RCCM/20-B-04921',
        planId: u.planId || 'pro',
        subscriptionStatus: u.subscriptionStatus || 'Active',
        isNew: true,
      })),
    ...agents
      .filter((a) => !isAdministrator(a.email, a.name, (a as any).role, a.id) && !registeredUsers.some((u) => u.email?.toLowerCase() === a.email.toLowerCase()))
      .map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        role: 'agent' as const,
        agencyName: a.agencyName || 'Démo Agent',
        avatar: a.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        rccmOrNif: 'CD/KIN/RCCM/20-B-04921',
        planId: 'pro',
        subscriptionStatus: a.subscriptionStatus || 'Active',
        isNew: false,
      })),
  ];

  // Pre-fill target details when target selection changes
  const handleTargetChange = (type: 'agency' | 'agent' | 'custom', id: string) => {
    setTargetType(type);
    setSelectedTargetId(id);

    if (type === 'agency') {
      const ag = agencies.find(a => a.id === id);
      if (ag) {
        setCustomName(ag.name);
        setCustomEmail(ag.email);
        setCustomPhone(ag.phone);
        setCustomNifRccm('CD/KIN/RCCM/20-B-04921');
        setPlanId('agency');
        setItems([
          {
            id: 'item_1',
            description: `Abonnement Mensuel Pack Agence - ${ag.name}`,
            amount: 99,
            quantity: 1
          }
        ]);
      }
    } else if (type === 'agent') {
      const targetUser = combinedAgentTargets.find((a) => a.id === id) || combinedAgentTargets[0];
      if (targetUser) {
        setCustomName(`${targetUser.name} (${targetUser.agencyName})`);
        setCustomEmail(targetUser.email);
        setCustomPhone(targetUser.phone);
        setCustomNifRccm(targetUser.rccmOrNif);
        setPlanId((targetUser.planId as any) || 'pro');
        setItems([
          {
            id: 'item_1',
            description: `Abonnement Mensuel Pack Agent/Membre - ${targetUser.name}`,
            amount: targetUser.planId === 'starter' ? 20 : 35,
            quantity: 1
          }
        ]);
      }
    } else {
      setCustomName('');
      setCustomEmail('');
      setCustomPhone('');
      setCustomNifRccm('');
    }
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        description: 'Option Annonce En Vedette Carte AJAX (1 mois)',
        amount: 15,
        quantity: 1
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, val: any) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleGrantFreeMonth = (targetType: 'agency' | 'agent', targetId: string, targetName: string, targetEmail: string, targetPhone?: string) => {
    const nextExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (targetType === 'agency') {
      updateAgencySubscriptionStatus(targetId, 'Active', nextExpiry);
    } else {
      updateUserSubscriptionStatus(targetId, 'Active', nextExpiry);
      if (targetEmail) {
        updateUserSubscriptionStatus(targetEmail, 'Active', nextExpiry);
      }
    }

    const freeInvoice: Invoice = {
      id: `inv_free_${Date.now()}`,
      invoiceNumber: `KIN-FREE-${Math.floor(1000 + Math.random() * 9000)}`,
      targetType,
      targetId,
      targetName,
      targetEmail,
      targetPhone,
      planId: targetType === 'agency' ? 'agency' : 'pro',
      items: [
        {
          id: `item_free_${Date.now()}`,
          description: `Abonnement ${targetType === 'agency' ? 'Agence' : 'Agent'} - 1er Mois Gratuit (Offert)`,
          amount: 0,
          quantity: 1
        }
      ],
      subtotalAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      currency: 'USD',
      status: 'paid',
      paymentMethod: 'orange_money',
      dueDate: nextExpiry,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
      notes: 'Offre spéciale : 1 mois d\'abonnement gratuit offert par l\'administration Kin Immobilier.'
    };

    addInvoice(freeInvoice);
    alert(`🎉 1 Mois Gratuit offert avec succès à ${targetName} ! Accès actif jusqu'au ${new Date(nextExpiry).toLocaleDateString('fr-FR')}.`);
  };

  const handleSaveEditedInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    // Recalculate subtotal
    const newSubtotal = editingInvoice.items.reduce((sum, item) => sum + (Number(item.amount) || 0) * (Number(item.quantity) || 1), 0);
    const updatedInv: Invoice = {
      ...editingInvoice,
      subtotalAmount: newSubtotal,
      totalAmount: newSubtotal
    };

    updateInvoice(updatedInv);
    setEditingInvoice(null);
    alert(`✅ Facture ${updatedInv.invoiceNumber} mise à jour avec succès ! Nouveau montant : ${updatedInv.totalAmount} ${updatedInv.currency}`);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0) * (Number(item.quantity) || 1), 0);
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customName.trim() || !customEmail.trim()) {
      alert('Veuillez renseigner le nom et l\'adresse email du destinataire.');
      return;
    }

    const subtotal = calculateSubtotal();
    const invCount = invoices.length + 1;
    const invNum = `KIN-2026-${String(invCount).padStart(3, '0')}`;

    const newInv: Invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: invNum,
      targetType,
      targetId: selectedTargetId || `target_${Date.now()}`,
      targetName: customName,
      targetEmail: customEmail,
      targetPhone: customPhone,
      targetNifRccm: customNifRccm,
      planId,
      items,
      subtotalAmount: subtotal,
      taxAmount: 0,
      totalAmount: subtotal,
      currency,
      status: 'pending',
      paymentMethod: 'orange_money',
      dueDate,
      createdAt: new Date().toISOString(),
      notes
    };

    addInvoice(newInv);
    setIsNewInvoiceOpen(false);
    alert(`Facture ${invNum} créée avec succès pour ${customName} !`);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markPaidModalInvoice) return;
    setIsProcessingAction(true);
    try {
      const selectedPm = paymentMethods.find((m) => m.id === paymentMethodSelect || m.provider === paymentMethodSelect);
      updateInvoice({
        ...markPaidModalInvoice,
        paymentMethodId: selectedPm?.id,
        paymentMethodProvider: selectedPm?.account_name || 'Validation Admin',
        transactionReference: paymentRefInput || markPaidModalInvoice.transactionReference || 'Direct Admin'
      });
      const res = await approveManualInvoice(markPaidModalInvoice.id);
      setMarkPaidModalInvoice(null);
      setPaymentRefInput('');
      notifyAdmin(res.success ? 'success' : 'error', res.message || `Facture ${markPaidModalInvoice.invoiceNumber} validée.`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleApproveProof = async () => {
    if (!reviewProofInvoice) return;
    setIsProcessingAction(true);
    try {
      const res = await approveManualInvoice(reviewProofInvoice.id);
      setReviewProofInvoice(null);
      setRejectReasonInput('');
      notifyAdmin(res.success ? 'success' : 'error', res.message || 'Paiement validé et plan/boost activé.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectProof = async () => {
    if (!reviewProofInvoice) return;
    const reason = rejectReasonInput.trim() || 'Référence de transaction introuvable ou montant non reçu.';
    setIsProcessingAction(true);
    try {
      const res = await rejectManualInvoice(reviewProofInvoice.id, reason);
      setReviewProofInvoice(null);
      setRejectReasonInput('');
      notifyAdmin(res.success ? 'success' : 'error', res.message || 'Preuve refusée.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalInvoice) return;
    const note = refundNoteInput.trim() || 'Remboursement manuel validé par l’administration';
    setIsProcessingAction(true);
    try {
      const res = await refundManualInvoice(refundModalInvoice.id, note, refundActionSelect);
      setRefundModalInvoice(null);
      setRefundNoteInput('');
      notifyAdmin(res.success ? 'success' : 'error', res.message || 'Remboursement enregistré.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSaveOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPm || !editingPm.account_name?.trim() || !editingPm.account_number?.trim()) return;
    setIsProcessingAction(true);
    try {
      await savePaymentMethod({
        ...editingPm,
        id: editingPm.id || `pm_${Date.now()}`,
        provider: editingPm.provider || 'mpesa',
        is_active: editingPm.is_active !== false,
        display_order: Number(editingPm.display_order || paymentMethods.length + 1)
      });
      setEditingPm(null);
      notifyAdmin('success', 'Opérateur Mobile Money enregistré avec succès.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRunAudit = () => {
    const res = runSubscriptionExpirationAudit();
    notifyAdmin(
      'success',
      `Audit terminé : ${res.downgradedCount} rétrogradation(s) douce(s), ${res.hiddenListingsCount} annonce(s) excédentaire(s) masquée(s), ${res.expiringSoonCount} alerte(s) d'échéance.`
    );
  };

  const handleSendWhatsAppReminder = (inv: Invoice) => {
    const url = buildWhatsAppReminderUrl({
      recipientName: inv.targetName,
      recipientPhone: inv.targetPhone,
      invoiceNumber: inv.invoiceNumber,
      planName: inv.planName || inv.items?.[0]?.description,
      amountUsd: inv.totalAmount,
      amountCdf: inv.totalAmountCDF ?? Math.round(inv.totalAmount * cdfExchangeRate),
      dueDate: inv.dueDate,
      paymentMethods
    });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  // KPIs
  const totalRevenuePaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

  const awaitingValidationList = invoices.filter(i => i.status === 'awaiting_validation');
  const totalPending = invoices
    .filter(i => i.status === 'pending' || i.status === 'awaiting_validation')
    .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

  const totalOverdue = invoices
    .filter(i => i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.totalAmount || 0), 0);

  // Filtering
  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      (inv.invoiceNumber || '').toLowerCase().includes(q) ||
      (inv.targetName || '').toLowerCase().includes(q) ||
      (inv.targetEmail || '').toLowerCase().includes(q) ||
      (inv.transactionReference || '').toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between gap-3 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span>{actionFeedback.text}</span>
          </div>
          <button type="button" onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Banner & Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Module Facturation & Paiements Manuels
              </span>
              <span className="text-xs text-slate-400 font-mono">
                M-Pesa • Airtel Money • Orange Money • Reçus PDF
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Receipt className="w-7 h-7 text-emerald-400" />
              Facturation, Preuves Mobile Money & Remboursements
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Validez les références Mobile Money soumises, générez les reçus PDF, contrôlez les échéances (rétrogradation douce) et gérez vos numéros marchands.
            </p>
          </div>

          <button
            onClick={() => setIsNewInvoiceOpen(true)}
            className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Créer une Facture
          </button>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Recettes Validées</div>
              <div className="text-2xl font-black font-mono tabular-nums text-emerald-400 mt-1">${totalRevenuePaid.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                ~{Math.round(totalRevenuePaid * cdfExchangeRate).toLocaleString('fr-FR')} CDF
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab('invoices');
              setStatusFilter('awaiting_validation');
            }}
            className={`text-left bg-slate-950/80 border rounded-2xl p-4 flex items-center justify-between transition-colors ${
              awaitingValidationList.length > 0 ? 'border-blue-500/50 bg-blue-950/20' : 'border-slate-800'
            }`}
          >
            <div>
              <div className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">Preuves à Valider</div>
              <div className="text-2xl font-black font-mono tabular-nums text-blue-400 mt-1">
                {awaitingValidationList.length}
              </div>
              <div className="text-[10px] text-blue-300/80 font-semibold mt-0.5">
                {awaitingValidationList.length > 0 ? 'Contrôle référence requis' : 'Aucune preuve en attente'}
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </button>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Encours & Échues</div>
              <div className="text-2xl font-black font-mono tabular-nums text-amber-400 mt-1">${(totalPending + totalOverdue).toLocaleString()}</div>
              <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                {invoices.filter(i => i.status === 'pending' || i.status === 'overdue').length} facture(s) à recouvrer
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Opérateurs Actifs</div>
              <div className="text-2xl font-black font-mono tabular-nums text-white mt-1">
                {paymentMethods.filter((m) => m.is_active !== false).length}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">
                {agencies.length} Agences • {agents.length} Agents
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'invoices'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            Liste des Factures ({invoices.length})
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'subscriptions'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Abonnements Agences & Agents
          </button>

          <button
            onClick={() => setActiveTab('plans_pricing')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'plans_pricing'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <Coins className="w-4 h-4" />
            Tarifs & Formules (Franc Congolais)
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Opérateurs Mobile Money ({paymentMethods.length})
          </button>
        </div>
      </div>

      {/* TAB 1: INVOICES LIST & MANAGEMENT */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher facture, client, réf. transaction..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto text-xs font-semibold">
              <span className="text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" /> Statut:
              </span>
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'awaiting_validation', label: `À valider (${awaitingValidationList.length})` },
                { id: 'pending', label: 'À régler' },
                { id: 'paid', label: 'Payées' },
                { id: 'rejected', label: 'Refusées' },
                { id: 'refunded', label: 'Remboursées' },
                { id: 'overdue', label: 'Échues' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-2.5 py-1.5 rounded-lg transition-all ${
                    statusFilter === st.id
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                    <th className="p-3.5">N° Facture / Reçu</th>
                    <th className="p-3.5">Client</th>
                    <th className="p-3.5">Objet & Preuve Mobile Money</th>
                    <th className="p-3.5">Montant</th>
                    <th className="p-3.5">Statut</th>
                    <th className="p-3.5 text-right">Actions Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Aucune facture ne correspond à ce filtre.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => {
                      const st = formatInvoiceStatusInfo(inv.status);
                      const mailtoUrl = inv.targetEmail
                        ? buildEmailReminderMailto({
                            recipientName: inv.targetName,
                            recipientEmail: inv.targetEmail,
                            invoiceNumber: inv.invoiceNumber,
                            planName: inv.planName || inv.items?.[0]?.description,
                            amountUsd: inv.totalAmount,
                            amountCdf: inv.totalAmountCDF ?? Math.round(inv.totalAmount * cdfExchangeRate),
                            dueDate: inv.dueDate,
                            paymentMethods
                          })
                        : '#';

                      return (
                        <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 whitespace-nowrap align-top">
                            <div className="font-mono font-bold text-emerald-400">{inv.invoiceNumber}</div>
                            {inv.receiptNumber && (
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5">Reçu: {inv.receiptNumber}</div>
                            )}
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Échéance: {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                            </div>
                          </td>

                          <td className="p-3.5 align-top">
                            <div className="font-bold text-white text-sm">{inv.targetName}</div>
                            <div className="text-[11px] text-slate-400">{inv.targetEmail}</div>
                            {inv.targetPhone && <div className="text-[10px] text-slate-500 font-mono">{inv.targetPhone}</div>}
                          </td>

                          <td className="p-3.5 align-top">
                            <div className="font-medium text-slate-200">
                              {inv.planName || inv.items?.[0]?.description || 'Service Kinimmo'}
                            </div>
                            {(inv.paymentMethodProvider || inv.transactionReference) && (
                              <div className="mt-1 text-[11px] text-slate-400 font-mono">
                                {inv.paymentMethodProvider || 'Mobile Money'}
                                {inv.transactionReference ? ` • Réf: ${inv.transactionReference}` : ''}
                              </div>
                            )}
                            {inv.rejectionReason && (
                              <div className="text-[10px] text-rose-400 mt-0.5">Motif: {inv.rejectionReason}</div>
                            )}
                            {inv.status === 'refunded' && inv.refundNote && (
                              <div className="text-[10px] text-purple-300 mt-0.5">
                                Remboursement ({inv.refundAction === 'keep' ? 'Maintenu' : 'Révoqué'}): {inv.refundNote}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 font-mono tabular-nums align-top whitespace-nowrap">
                            <div className="font-black text-sm text-white">${inv.totalAmount} {inv.currency}</div>
                            <div className="text-[10px] text-slate-400">
                              ~{(inv.totalAmountCDF ?? Math.round(inv.totalAmount * cdfExchangeRate)).toLocaleString('fr-FR')} FC
                            </div>
                          </td>

                          <td className="p-3.5 whitespace-nowrap align-top">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-md border font-bold text-[11px] ${
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

                          <td className="p-3.5 text-right whitespace-nowrap align-top">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              {inv.status === 'awaiting_validation' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewProofInvoice(inv);
                                    setRejectReasonInput('');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-slate-950 font-black text-xs inline-flex items-center gap-1"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" /> Contrôler Preuve
                                </button>
                              )}

                              {(inv.status === 'pending' || inv.status === 'overdue' || inv.status === 'rejected') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMarkPaidModalInvoice(inv);
                                    setPaymentMethodSelect(inv.paymentMethodId || paymentMethods[0]?.id || 'pm_mpesa');
                                    setPaymentRefInput(inv.transactionReference || '');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Valider
                                </button>
                              )}

                              {(inv.status === 'paid' || inv.status === 'refunded') && (
                                <button
                                  type="button"
                                  onClick={() => generatePaymentReceiptPDF(inv, { cdfExchangeRate })}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-bold text-xs inline-flex items-center gap-1"
                                  title="Télécharger le reçu PDF officiel"
                                >
                                  <Download className="w-3.5 h-3.5" /> Reçu PDF
                                </button>
                              )}

                              {inv.status === 'paid' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRefundModalInvoice(inv);
                                    setRefundNoteInput('');
                                    setRefundActionSelect('revoke');
                                  }}
                                  className="px-2.5 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold text-xs inline-flex items-center gap-1"
                                  title="Effectuer un remboursement manuel avec note"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Rembourser
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceModal(inv)}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                                title="Aperçu Facture"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingInvoice(inv)}
                                className="p-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                title="Modifier montant"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSendWhatsAppReminder(inv)}
                                className="p-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30"
                                title="Relancer WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>

                              {inv.targetEmail && (
                                <a
                                  href={mailtoUrl}
                                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700"
                                  title="Relancer par E-mail"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  requestConfirm({
                                    title: 'Suppression de la facture',
                                    message: `Voulez-vous vraiment supprimer la facture ${inv.invoiceNumber} ?`,
                                    onConfirm: () => deleteInvoice(inv.id)
                                  });
                                }}
                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {/* TAB 2: SUBSCRIPTIONS & ACCOUNTS OVERVIEW */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-amber-400" />
                Contrôle des Échéances & Rétrogradation Douce Automatique
              </p>
              <p className="text-slate-400">
                Conserve les annonces les plus récentes dans le plafond du plan gratuit et masque l&apos;excédent sans jamais le supprimer.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunAudit}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shrink-0 flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Contrôler échéances & Rétrograder</span>
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              Agences Immobilières ({agencies.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {agencies.map(ag => {
                const isExpired = ag.subscriptionStatus === 'Expired';
                const realPlan = subscriptionPlans.find((p) => p.id === (ag.planId || ag.subscriptionPlan || 'agency')) || subscriptionPlans[0];
                const softHiddenCount = properties.filter(
                  (p) => matchesAccountOwner(p, ag.id, ag.name) && Boolean(p.softHiddenByPlan)
                ).length;

                return (
                  <div
                    key={ag.id}
                    className={`bg-slate-950 border rounded-2xl p-5 flex flex-col justify-between gap-4 ${
                      isExpired ? 'border-rose-500/40' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <img src={ag.logo} alt={ag.name} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/20 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-white text-base truncate">{ag.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                              isExpired
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}
                          >
                            {isExpired ? 'Expiré (Rétrogradé)' : 'Actif'}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-400 font-mono mt-0.5 truncate">{ag.email} • {ag.phone}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                            {realPlan?.name || 'Plan Agence'} (${realPlan?.priceMonthly ?? 79}/mois)
                          </span>
                          {softHiddenCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                              <EyeOff className="w-3 h-3" /> {softHiddenCount} annonce(s) masquée(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs gap-2">
                      <div>
                        <span className="text-slate-400">Échéance : </span>
                        <span className="font-mono text-white font-semibold">
                          {ag.subscriptionExpiresAt ? new Date(ag.subscriptionExpiresAt).toLocaleDateString('fr-FR') : 'Non définie'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => updateAgencySubscriptionStatus(ag.id, isExpired ? 'Active' : 'Expired')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${
                          isExpired
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isExpired ? 'Réactiver' : 'Marquer Expiré'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={buildWhatsAppReminderUrl({
                            recipientName: ag.name,
                            recipientPhone: ag.phone,
                            planName: realPlan?.name,
                            amountUsd: realPlan?.priceMonthly,
                            dueDate: ag.subscriptionExpiresAt,
                            paymentMethods
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Relancer WA
                        </a>
                        {ag.email && (
                          <a
                            href={buildEmailReminderMailto({
                              recipientName: ag.name,
                              recipientEmail: ag.email,
                              planName: realPlan?.name,
                              amountUsd: realPlan?.priceMonthly,
                              dueDate: ag.subscriptionExpiresAt,
                              paymentMethods
                            })}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold inline-flex items-center gap-1"
                          >
                            <Mail className="w-3.5 h-3.5" /> Mail
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleGrantFreeMonth('agency', ag.id, ag.name, ag.email, ag.phone)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1"
                        >
                          <Gift className="w-3.5 h-3.5" /> 1 Mois Offert
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleTargetChange('agency', ag.id);
                            setIsNewInvoiceOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-400" /> Facturer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            requestConfirm({
                              title: "Suppression de l'agence",
                              message: `Voulez-vous vraiment supprimer l'agence "${ag.name}" ?`,
                              onConfirm: () => deleteAgency(ag.id)
                            });
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Agents Indépendants & Comptes Inscrits ({combinedAgentTargets.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {combinedAgentTargets.map((agt) => {
                const existingAgent = agents.find(a => a.id === agt.id || a.email === agt.email);
                const isExpired = agt.subscriptionStatus === 'Expired' || existingAgent?.subscriptionStatus === 'Expired';
                const realPlan = subscriptionPlans.find((p) => p.id === (agt.planId || 'starter')) || subscriptionPlans[0];
                const softHiddenCount = properties.filter(
                  (p) => (matchesAccountOwner(p, agt.id) || (agt.email ? matchesAccountOwner(p, agt.email) : false)) && Boolean(p.softHiddenByPlan)
                ).length;

                return (
                  <div
                    key={agt.id}
                    className={`bg-slate-950 border rounded-2xl p-4 space-y-3 ${
                      isExpired ? 'border-rose-500/40' : 'border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                          isExpired
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        }`}
                      >
                        {isExpired ? 'Expiré' : 'Actif'}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-300 font-bold">
                        {realPlan?.name || 'Gratuit'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <img src={agt.avatar} alt={agt.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-white text-sm truncate">{agt.name}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{agt.agencyName}</p>
                        <p className="text-[10px] text-emerald-400 font-mono truncate">{agt.email}</p>
                      </div>
                    </div>

                    {softHiddenCount > 0 && (
                      <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1 flex items-center gap-1">
                        <EyeOff className="w-3 h-3 shrink-0" /> {softHiddenCount} annonce(s) masquée(s) sans suppression
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => {
                          const nextStatus = isExpired ? 'Active' : 'Expired';
                          updateUserSubscriptionStatus(agt.id, nextStatus);
                          if (agt.email) updateUserSubscriptionStatus(agt.email, nextStatus);
                        }}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          isExpired
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isExpired ? 'Activer' : 'Expirer'}
                      </button>

                      <div className="flex items-center gap-1">
                        <a
                          href={buildWhatsAppReminderUrl({
                            recipientName: agt.name,
                            recipientPhone: agt.phone,
                            planName: realPlan?.name,
                            amountUsd: realPlan?.priceMonthly,
                            paymentMethods
                          })}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                          title="Relancer WhatsApp"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </a>
                        {agt.email && (
                          <a
                            href={buildEmailReminderMailto({
                              recipientName: agt.name,
                              recipientEmail: agt.email,
                              planName: realPlan?.name,
                              amountUsd: realPlan?.priceMonthly,
                              paymentMethods
                            })}
                            className="p-1.5 rounded-lg bg-slate-800 text-sky-300 border border-slate-700"
                            title="Relancer par E-mail"
                          >
                            <Mail className="w-3 h-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleGrantFreeMonth('agent', agt.id, agt.name, agt.email, agt.phone)}
                          className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          title="Offrir 1 mois gratuit"
                        >
                          <Gift className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleTargetChange('agent', agt.id);
                            setIsNewInvoiceOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 text-emerald-400"
                          title="Créer facture"
                        >
                          <Receipt className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            requestConfirm({
                              title: 'Suppression du membre / agent',
                              message: `Voulez-vous vraiment supprimer "${agt.name}" (${agt.email}) ?`,
                              onConfirm: () => {
                                deleteUser(agt.id);
                                deleteAgent(agt.id);
                              }
                            });
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: PLANS & PRICING MANAGEMENT (CDF & USD) */}
      {activeTab === 'plans_pricing' && (
        <AdminPlansPricingManager />
      )}

      {/* TAB 3: DYNAMIC MOBILE MONEY OPERATORS CRUD */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Opérateurs Mobile Money & Moyens de Paiement Manuels
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configurez librement vos numéros marchands M-Pesa, Airtel Money, Orange Money ou comptes bancaires affichés aux clients lors du paiement.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setEditingPm({
                  id: `pm_${Date.now()}`,
                  provider: 'mpesa',
                  account_name: '',
                  account_number: '+243 ',
                  merchant_code: '',
                  instructions: '',
                  is_active: true,
                  display_order: paymentMethods.length + 1
                })
              }
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un Opérateur</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map((pm) => (
              <div
                key={pm.id}
                className={`p-5 rounded-2xl border space-y-3 flex flex-col justify-between ${
                  pm.is_active !== false ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/40 border-slate-800/60 opacity-70'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-[10px] font-bold uppercase text-amber-300">
                      {pm.provider}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        pm.is_active !== false
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {pm.is_active !== false ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{pm.account_name}</h4>
                  <div className="font-mono text-base font-black text-emerald-400">{pm.account_number}</div>
                  {pm.merchant_code && (
                    <div className="text-xs font-mono text-amber-300">Code Marchand : {pm.merchant_code}</div>
                  )}
                  {pm.instructions && (
                    <p className="text-[11px] text-slate-400 leading-relaxed">{pm.instructions}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setEditingPm(pm)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      savePaymentMethod({ ...pm, is_active: pm.is_active === false })
                    }
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs"
                  >
                    {pm.is_active !== false ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      requestConfirm({
                        title: "Supprimer l'opérateur",
                        message: `Supprimer le compte "${pm.account_name}" ?`,
                        onConfirm: () => deletePaymentMethod(pm.id)
                      });
                    }}
                    className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {editingPm && (
            <form onSubmit={handleSaveOperator} className="p-5 rounded-2xl bg-slate-950 border border-emerald-500/50 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-white">Configurer Opérateur Mobile Money / Banque</h4>
                <button type="button" onClick={() => setEditingPm(null)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Opérateur</label>
                  <select
                    value={editingPm.provider || 'mpesa'}
                    onChange={(e) => setEditingPm({ ...editingPm, provider: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  >
                    <option value="mpesa">M-Pesa (Vodacom)</option>
                    <option value="airtel">Airtel Money RDC</option>
                    <option value="orange">Orange Money RDC</option>
                    <option value="bank_transfer">Virement Bancaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Libellé affiché *</label>
                  <input
                    type="text"
                    required
                    value={editingPm.account_name || ''}
                    onChange={(e) => setEditingPm({ ...editingPm, account_name: e.target.value })}
                    placeholder="KINIMMO SARL - M-Pesa"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Numéro / Compte *</label>
                  <input
                    type="text"
                    required
                    value={editingPm.account_number || ''}
                    onChange={(e) => setEditingPm({ ...editingPm, account_number: e.target.value })}
                    placeholder="+243 810 000 000"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Code Marchand (optionnel)</label>
                  <input
                    type="text"
                    value={editingPm.merchant_code || ''}
                    onChange={(e) => setEditingPm({ ...editingPm, merchant_code: e.target.value })}
                    placeholder="Ex: 123456"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono"
                  />
                </div>
              </div>
              <div className="text-xs">
                <label className="block text-slate-400 mb-1 font-semibold">Instructions affichées à l&apos;utilisateur</label>
                <textarea
                  rows={2}
                  value={editingPm.instructions || ''}
                  onChange={(e) => setEditingPm({ ...editingPm, instructions: e.target.value })}
                  placeholder="Instructions claires pour effectuer le dépôt Mobile Money et soumettre la référence..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPm(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAction}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Enregistrer Opérateur
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE NEW INVOICE */}
      {isNewInvoiceOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-6 my-8 shadow-2xl relative">
            <button
              onClick={() => setIsNewInvoiceOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                Nouvelle Édition Facture RDC
              </span>
              <h3 className="text-2xl font-black text-white">Émettre une Facture Agence / Agent</h3>
            </div>

            <form onSubmit={handleCreateInvoiceSubmit} className="space-y-5">
              {/* Target Type Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Sélectionner le Client à Facturer</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleTargetChange('agency', agencies[0]?.id || '')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      targetType === 'agency'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Building2 className="w-4 h-4" /> Agence
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTargetChange('agent', combinedAgentTargets[0]?.id || '')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      targetType === 'agent'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Agent / Inscrit ({combinedAgentTargets.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTargetChange('custom', '')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      targetType === 'custom'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Plus className="w-4 h-4" /> Personnalisé
                  </button>
                </div>
              </div>

              {/* Dropdown if Agency or Agent */}
              {targetType === 'agency' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Choisir l'Agence Immobilière</label>
                  <select
                    value={selectedTargetId}
                    onChange={e => handleTargetChange('agency', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {agencies.map(ag => (
                      <option key={ag.id} value={ag.id}>
                        {ag.name} ({ag.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'agent' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Choisir l'Agent ou le Membre Inscrit (Nouveau Venu)</label>
                  <select
                    value={selectedTargetId}
                    onChange={e => handleTargetChange('agent', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Sélectionnez un destinataire --</option>
                    <optgroup label="🆕 Nouveaux Membres & Agents Inscrits">
                      {combinedAgentTargets.filter(u => u.isNew).map(u => (
                        <option key={u.id} value={u.id}>
                          🆕 {u.name} — {u.email} ({u.phone})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="🏢 Agents Démo Prédéfinis">
                      {combinedAgentTargets.filter(u => !u.isNew).map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} — {u.agencyName} ({u.phone})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {/* Recipient Details Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Nom / Raison Sociale *</label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Email Destinataire *</label>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={e => setCustomEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Téléphone WhatsApp (+243)</label>
                  <input
                    type="text"
                    value={customPhone}
                    onChange={e => setCustomPhone(e.target.value)}
                    placeholder="+243 81 000 0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">N° RCCM / NIF Impôts RDC</label>
                  <input
                    type="text"
                    value={customNifRccm}
                    onChange={e => setCustomNifRccm(e.target.value)}
                    placeholder="CD/KIN/RCCM/20-B-04921"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Items Table Form */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200">Lignes de la Facture (Services & Options)</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter une Option
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        placeholder="Description du service"
                        value={item.description}
                        onChange={e => handleItemChange(item.id, 'description', e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none"
                      />
                      <div className="w-20">
                        <input
                          type="number"
                          placeholder="Prix $"
                          value={isNaN(item.amount) ? '' : item.amount}
                          onChange={e => {
                            const val = Number(e.target.value);
                            handleItemChange(item.id, 'amount', isNaN(val) ? 0 : val);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-right text-emerald-400 font-bold focus:outline-none"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dates & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Date d'Échéance Limite</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400">Devise d'Émission</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="USD">USD ($ Dollars Américains)</option>
                    <option value="CDF">CDF (FC Francs Congolais)</option>
                  </select>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">Total Net à Payeur:</span>
                <span className="text-2xl font-black text-emerald-400">
                  ${calculateSubtotal()} {currency}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewInvoiceOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20"
                >
                  Émettre la Facture
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM PAYMENT / MARK PAID */}
      {markPaidModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setMarkPaidModalInvoice(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                Validation d'Encaissement Admin
              </span>
              <h3 className="text-xl font-bold text-white">Enregistrer le Règlement</h3>
              <p className="text-xs text-slate-400">
                Facture <span className="text-emerald-400 font-mono font-bold">{markPaidModalInvoice.invoiceNumber}</span> pour {markPaidModalInvoice.targetName}
              </p>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Montant Reçu:</span>
                <span className="text-lg font-black text-emerald-400">${markPaidModalInvoice.totalAmount} USD</span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Opérateur Mobile Money utilisé</label>
                <select
                  value={paymentMethodSelect}
                  onChange={e => setPaymentMethodSelect(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.account_name} ({pm.account_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Numéro / Référence de Transaction (ID)</label>
                <input
                  type="text"
                  placeholder="Ex: MP260808.1042 ou ID SMS opérateur"
                  value={paymentRefInput}
                  onChange={e => setPaymentRefInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessingAction}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
              >
                {isProcessingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Valider, Activer & Générer Reçu</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REVIEW MOBILE MONEY PROOF & APPROVE / REJECT */}
      {reviewProofInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold uppercase">
                  Contrôle Paiement Mobile Money
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Facture {reviewProofInvoice.invoiceNumber} — ${reviewProofInvoice.totalAmount} USD
                </h3>
                <p className="text-xs text-slate-400">
                  {reviewProofInvoice.targetName} ({reviewProofInvoice.targetEmail})
                </p>
              </div>
              <button type="button" onClick={() => setReviewProofInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Opérateur déclaré :</span>
                  <strong className="text-white">{reviewProofInvoice.paymentMethodProvider || 'Mobile Money'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Référence SMS / ID :</span>
                  <strong className="text-emerald-400 font-mono">
                    {reviewProofInvoice.transactionReference || 'Non renseignée'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Montant attendu :</span>
                  <strong className="text-white font-mono">
                    ${reviewProofInvoice.totalAmount} USD (~{(reviewProofInvoice.totalAmountCDF ?? Math.round(reviewProofInvoice.totalAmount * cdfExchangeRate)).toLocaleString('fr-FR')} CDF)
                  </strong>
                </div>
              </div>

              {reviewProofInvoice.proofImageUrl ? (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 block">Capture de transaction jointe :</span>
                  <img
                    src={reviewProofInvoice.proofImageUrl}
                    alt="Capture paiement"
                    className="w-full max-h-64 object-contain rounded-xl border border-slate-800 bg-slate-950"
                  />
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-[11px]">
                  Aucune capture jointe (vérification sur la référence transaction SMS ci-dessus).
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Motif en cas de refus (obligatoire uniquement pour refuser) :
                </label>
                <input
                  type="text"
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  placeholder="Ex: Référence introuvable sur M-Pesa / Montant incomplet"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleRejectProof}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Ban className="w-4 h-4" /> Refuser
              </button>
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={handleApproveProof}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
              >
                {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Valider & Activer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL REFUND WITH NOTE & REVOKE/KEEP CHOICE */}
      {refundModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmRefund}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold uppercase">
                  Remboursement Manuel Admin
                </span>
                <h3 className="text-lg font-black text-white mt-1">
                  Facture {refundModalInvoice.invoiceNumber} — ${refundModalInvoice.totalAmount}
                </h3>
                <p className="text-xs text-slate-400">{refundModalInvoice.targetName}</p>
              </div>
              <button type="button" onClick={() => setRefundModalInvoice(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Effet sur l&apos;abonnement / boost lié *</label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="refundAction"
                      checked={refundActionSelect === 'revoke'}
                      onChange={() => setRefundActionSelect('revoke')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-rose-300">Révoquer le plan ou le boost</div>
                      <p className="text-[11px] text-slate-400">
                        Applique la rétrogradation douce (conserve les annonces récentes dans le quota gratuit) ou désactive le boost.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="refundAction"
                      checked={refundActionSelect === 'keep'}
                      onChange={() => setRefundActionSelect('keep')}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-bold text-emerald-300">Maintenir le plan ou le boost actif</div>
                      <p className="text-[11px] text-slate-400">
                        Geste commercial : le remboursement est tracé mais l&apos;accès reste actif jusqu&apos;à l&apos;échéance.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Note justificative du remboursement *</label>
                <textarea
                  required
                  rows={3}
                  value={refundNoteInput}
                  onChange={(e) => setRefundNoteInput(e.target.value)}
                  placeholder="Ex: Double paiement M-Pesa constaté — remboursé vers +243..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRefundModalInvoice(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isProcessingAction}
                className="flex-1 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5"
              >
                {isProcessingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                <span>Confirmer Remboursement</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: INVOICE PRINT & OFFICIAL PREVIEW */}
      {selectedInvoiceModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-3xl w-full space-y-6 my-8 shadow-2xl relative text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-white text-base">Aperçu Facture Officielle Kin Immobilier RDC</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1 hover:bg-emerald-400 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimer / PDF
                </button>
                <button
                  onClick={() => setSelectedInvoiceModal(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 space-y-6 shadow-inner print:p-0 print:shadow-none">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-black flex items-center justify-center text-sm">
                      KI
                    </div>
                    <div>
                      <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">KIN IMMOBILIER SARL</h1>
                      <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Plateforme Immobilière Officielle RDC</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2 leading-tight">
                    Avenue Kananga, Q/ Binza Pigeon, C/ Ngaliema, Kinshasa, RDC<br />
                    RCCM: CD/KIN/RCCM/20-B-04921 • ID.NAT: 01-93-N39201F<br />
                    Tél: +243 81 000 0000 • contact@kinimmo.com
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-sm border border-slate-200">
                    FACTURE N° {selectedInvoiceModal.invoiceNumber}
                  </span>
                  <p className="text-xs text-slate-500 pt-1">
                    Date émission: {new Date(selectedInvoiceModal.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                  <p className="text-xs font-bold text-slate-800">
                    Date d'échéance: {new Date(selectedInvoiceModal.dueDate).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Client & Status Details */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">FACTURÉ À</span>
                  <p className="font-bold text-slate-900 text-sm">{selectedInvoiceModal.targetName}</p>
                  <p className="text-slate-600">{selectedInvoiceModal.targetEmail}</p>
                  {selectedInvoiceModal.targetPhone && <p className="text-slate-600">Tél: {selectedInvoiceModal.targetPhone}</p>}
                  {selectedInvoiceModal.targetNifRccm && <p className="text-slate-500 font-mono">RCCM: {selectedInvoiceModal.targetNifRccm}</p>}
                </div>

                <div className="text-right">
                  <span className="font-bold text-slate-400 uppercase text-[10px] tracking-wider block mb-1">STATUT DE RÈGLEMENT</span>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    selectedInvoiceModal.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {selectedInvoiceModal.status === 'paid' ? '✔ PAYÉE & ACQUITTÉE' : '⏳ EN ATTENTE DE RÈGLEMENT'}
                  </span>
                  {selectedInvoiceModal.notes && (
                    <p className="text-[11px] text-slate-500 mt-2 italic">{selectedInvoiceModal.notes}</p>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-800 font-bold uppercase text-[10px]">
                    <th className="py-2">Désignation des Prestations / Abonnements</th>
                    <th className="py-2 text-center">Qté</th>
                    <th className="py-2 text-right">Prix Unitaire</th>
                    <th className="py-2 text-right">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {selectedInvoiceModal.items.map(item => (
                    <tr key={item.id}>
                      <td className="py-3 font-semibold text-slate-900">{item.description}</td>
                      <td className="py-3 text-center">{item.quantity || 1}</td>
                      <td className="py-3 text-right">${item.amount} {selectedInvoiceModal.currency}</td>
                      <td className="py-3 text-right font-bold">${item.amount * (item.quantity || 1)} {selectedInvoiceModal.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Totals */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-Total HT:</span>
                    <span>${selectedInvoiceModal.subtotalAmount} {selectedInvoiceModal.currency}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>TVA RDC (0% Exonéré):</span>
                    <span>$0 {selectedInvoiceModal.currency}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-900 pt-2 font-black text-slate-900 text-base">
                    <span>NET À PAYER:</span>
                    <span className="text-emerald-700">${selectedInvoiceModal.totalAmount} {selectedInvoiceModal.currency}</span>
                  </div>
                </div>
              </div>

              {/* Payment Instructions RDC (Dynamic Operators) */}
              <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-900">Instructions de Paiement Mobile Money Kinimmo RDC :</p>
                <div className="space-y-1 text-xs">
                  {paymentMethods
                    .filter((m) => m.is_active !== false)
                    .map((pm) => (
                      <div key={pm.id} className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-emerald-700 font-mono">▶ {pm.account_name} :</span>
                        <span className="font-mono font-black text-slate-950 bg-white px-2 py-0.5 rounded border border-slate-300">
                          {pm.account_number}
                        </span>
                        {pm.merchant_code && <span className="text-[11px] text-slate-600 font-mono">(Code {pm.merchant_code})</span>}
                      </div>
                    ))}
                  <div className="text-[11px] text-slate-600 pt-1">
                    Mentionnez la facture <strong>{selectedInvoiceModal.invoiceNumber}</strong> puis saisissez votre référence SMS dans votre tableau de bord.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT INVOICE & AMOUNT */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Edit3 className="w-5 h-5" />
                <span>Modifier le Montant - Facture {editingInvoice.invoiceNumber}</span>
              </div>
              <button
                onClick={() => setEditingInvoice(null)}
                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedInvoice} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Client / Destinataire</label>
                <input
                  type="text"
                  disabled
                  value={`${editingInvoice.targetName} (${editingInvoice.targetEmail})`}
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-400 mt-1 cursor-not-allowed"
                />
              </div>

              {/* Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Tarifs Réduits & Modifiables (Abonnements Agence/Agent)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInvoice(prev => prev ? {
                        ...prev,
                        totalAmount: 0,
                        subtotalAmount: 0,
                        items: [{ id: prev.items[0]?.id || 'item_1', description: 'Abonnement Agence - 1er Mois Gratuit (Offert)', amount: 0, quantity: 1 }]
                      } : null);
                    }}
                    className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold transition-all text-center"
                  >
                    🎁 1er Mois Gratuit ($0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInvoice(prev => prev ? {
                        ...prev,
                        totalAmount: 20,
                        subtotalAmount: 20,
                        items: [{ id: prev.items[0]?.id || 'item_1', description: 'Abonnement Pack Starter ($20)', amount: 20, quantity: 1 }]
                      } : null);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-[11px] font-bold transition-all text-center"
                  >
                    ⚡ Starter $20
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInvoice(prev => prev ? {
                        ...prev,
                        totalAmount: 35,
                        subtotalAmount: 35,
                        items: [{ id: prev.items[0]?.id || 'item_1', description: 'Abonnement Pack Agent Pro ($35)', amount: 35, quantity: 1 }]
                      } : null);
                    }}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-[11px] font-bold transition-all text-center"
                  >
                    💼 Agent Pro $35
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInvoice(prev => prev ? {
                        ...prev,
                        totalAmount: 99,
                        subtotalAmount: 99,
                        items: [{ id: prev.items[0]?.id || 'item_1', description: 'Abonnement Pack Agence Elite ($99)', amount: 99, quantity: 1 }]
                      } : null);
                    }}
                    className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold transition-all text-center"
                  >
                    🏢 Agence Elite $99
                  </button>
                </div>
              </div>

              {/* Items Amount List */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">Montant Saisi & Description de l'Abonnement</label>
                {editingInvoice.items.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <input
                      type="text"
                      value={item.description}
                      onChange={e => {
                        const newDesc = e.target.value;
                        setEditingInvoice(prev => {
                          if (!prev) return null;
                          const newItems = [...prev.items];
                          newItems[idx] = { ...newItems[idx], description: newDesc };
                          return { ...prev, items: newItems };
                        });
                      }}
                      className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none"
                    />
                    <div className="w-24">
                      <input
                        type="number"
                        value={isNaN(item.amount) ? '' : item.amount}
                        onChange={e => {
                          const val = Number(e.target.value);
                          const newAmt = isNaN(val) ? 0 : val;
                          setEditingInvoice(prev => {
                            if (!prev) return null;
                            const newItems = [...prev.items];
                            newItems[idx] = { ...newItems[idx], amount: newAmt };
                            return { ...prev, items: newItems };
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-right text-emerald-400 font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Status & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Statut Facture</label>
                  <select
                    value={editingInvoice.status}
                    onChange={e => setEditingInvoice(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white mt-1 focus:outline-none"
                  >
                    <option value="pending">En Attente</option>
                    <option value="paid">Payée</option>
                    <option value="overdue">En Retard</option>
                    <option value="cancelled">Annulée</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400">Date d'Échéance</label>
                  <input
                    type="date"
                    value={editingInvoice.dueDate.split('T')[0]}
                    onChange={e => setEditingInvoice(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white mt-1 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Notes & Conditions</label>
                <textarea
                  value={editingInvoice.notes || ''}
                  onChange={e => setEditingInvoice(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white mt-1 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
