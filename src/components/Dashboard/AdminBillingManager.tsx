import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceItem, Agent, Agency, User } from '../../types';
import { subscribeToUsers } from '../../lib/firebase';
import { AdminPlansPricingManager } from './AdminPlansPricingManager';
import {
  Receipt,
  CreditCard,
  Plus,
  Search,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  DollarSign,
  Building2,
  Users,
  Printer,
  Download,
  Phone,
  MessageSquare,
  Filter,
  Trash2,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
  FileText,
  Check,
  X,
  Eye,
  Calendar,
  Zap,
  Globe,
  Edit3,
  Gift,
  Coins
} from 'lucide-react';

export const AdminBillingManager: React.FC = () => {
  const {
    invoices,
    addInvoice,
    updateInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    deleteUser,
    deleteAgent,
    deleteAgency,
    updateAgencySubscriptionStatus,
    updateUserSubscriptionStatus,
    requestConfirm,
    agents,
    agencies,
    user
  } = useApp();

  const [activeTab, setActiveTab] = useState<'invoices' | 'subscriptions' | 'plans_pricing' | 'settings'>('invoices');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<Invoice | null>(null);
  const [markPaidModalInvoice, setMarkPaidModalInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [paymentMethodSelect, setPaymentMethodSelect] = useState<Invoice['paymentMethod']>('orange_money');

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
    d.setDate(d.getDate() + 14); // default 14 days
    return d.toISOString().split('T')[0];
  });
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 'item_1',
      description: 'Abonnement Mensuel Pack Agence Immobilière Elite (150 annonces)',
      amount: 99,
      quantity: 1
    }
  ]);
  const [notes, setNotes] = useState('Paiement par Orange Money RDC : +243 84 529 4616 (Titulaire : IMMOCRAFT / KIN IMMOBILIER SARL)');

  // Registered Users state (Nouveaux venus & membres inscrits)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  useEffect(() => {
    const localUsers: User[] = JSON.parse(localStorage.getItem('estatik_registered_users') || '[]');
    
    const unsub = subscribeToUsers((firestoreUsers) => {
      const mergedMap = new Map<string, User>();
      localUsers.forEach((u) => {
        if (u.email) mergedMap.set(u.email.toLowerCase(), u);
      });
      firestoreUsers.forEach((u) => {
        if (u.email) mergedMap.set(u.email.toLowerCase(), u);
      });
      if (user && user.email) {
        mergedMap.set(user.email.toLowerCase(), user);
      }
      setRegisteredUsers(Array.from(mergedMap.values()));
    });

    if (localUsers.length > 0) {
      const map = new Map<string, User>();
      localUsers.forEach((u) => {
        if (u.email) map.set(u.email.toLowerCase(), u);
      });
      if (user && user.email) map.set(user.email.toLowerCase(), user);
      setRegisteredUsers(Array.from(map.values()));
    }

    return () => unsub();
  }, [user]);

  // Combined targets: registered users (nouveaux venus) + demo agents (excluding administrators)
  const isAdministrator = (email?: string, name?: string, role?: string, id?: string) => {
    const emailLower = (email || '').toLowerCase();
    const nameLower = (name || '').toLowerCase();
    const roleLower = (role || '').toLowerCase();
    const idLower = (id || '').toLowerCase();
    return (
      roleLower === 'admin' ||
      emailLower === 'joosskalu72@gmail.com' ||
      emailLower === 'admin@immocraft.cd' ||
      emailLower === 'admin@estatik.com' ||
      idLower === 'usr_admin_001' ||
      idLower === 'user_admin' ||
      idLower === 'admin' ||
      nameLower.includes('administrateur') ||
      nameLower === 'admin' ||
      nameLower === 'admin immocraft'
    );
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

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!markPaidModalInvoice) return;

    const note = `Paiement enregistré le ${new Date().toLocaleDateString('fr-FR')} via ${paymentMethodSelect?.toUpperCase()} Ref: ${paymentRefInput || 'Direct Admin'}`;
    updateInvoiceStatus(markPaidModalInvoice.id, 'paid', paymentMethodSelect, note);
    setMarkPaidModalInvoice(null);
    setPaymentRefInput('');
    alert(`Paiement de la facture ${markPaidModalInvoice.invoiceNumber} validé avec succès !`);
  };

  const handleSendWhatsAppReminder = (inv: Invoice) => {
    const text = encodeURIComponent(
      `Bonjour ${inv.targetName},\n\nVoici votre facture *${inv.invoiceNumber}* émise par *KIN IMMOBILIER RDC*:\n` +
      `📌 Service: ${inv.items.map(i => i.description).join(', ')}\n` +
      `💰 Montant Total: *${inv.totalAmount} ${inv.currency}*\n` +
      `📅 Date d'échéance: ${new Date(inv.dueDate).toLocaleDateString('fr-FR')}\n\n` +
      `Mode de paiement exclusif Orange Money RDC:\n` +
      `📱 Orange Money: *+243 84 529 4616*\n` +
      `👤 Titulaire: IMMOCRAFT / KIN IMMOBILIER SARL\n\n` +
      `Veuillez nous envoyer la référence du transfert. Merci pour votre confiance !`
    );
    const phone = inv.targetPhone ? inv.targetPhone.replace(/[^0-9]/g, '') : '243845294616';
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  // KPIs
  const totalRevenuePaid = invoices
    .filter(i => i.status === 'paid')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalPending = invoices
    .filter(i => i.status === 'pending')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  const totalOverdue = invoices
    .filter(i => i.status === 'overdue')
    .reduce((sum, i) => sum + i.totalAmount, 0);

  // Filtering
  const filteredInvoices = invoices.filter(inv => {
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.targetName.toLowerCase().includes(q) ||
      inv.targetEmail.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* Banner & Header */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" /> Module Administrateur Kinshasa & RDC
              </span>
              <span className="text-xs text-slate-400 font-mono">
                RCCM & TVA DGI Compliant
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Receipt className="w-7 h-7 text-emerald-400" />
              Facturation Agences & Agents Immobiliers
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Émettez des factures d'abonnements mensuels (Pack Agent $35, Pack Agence $99), encaissez par Orange Money RDC (+243 84 529 4616) et relancez directement par WhatsApp.
            </p>
          </div>

          <button
            onClick={() => setIsNewInvoiceOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-2.5 shrink-0 hover:scale-105"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Créer une Facture
          </button>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 mt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">MRR / Recettes Encaissées</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">${totalRevenuePaid} <span className="text-xs text-slate-400">USD</span></div>
              <div className="text-[10px] text-orange-400 font-bold flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3" /> Orange Money RDC
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Factures En Attente</div>
              <div className="text-2xl font-black text-amber-400 mt-1">${totalPending} <span className="text-xs text-slate-400">USD</span></div>
              <div className="text-[10px] text-amber-400 font-semibold mt-0.5">
                {invoices.filter(i => i.status === 'pending').length} factures à encaisser
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Factures En Retard</div>
              <div className="text-2xl font-black text-rose-400 mt-1">${totalOverdue} <span className="text-xs text-slate-400">USD</span></div>
              <div className="text-[10px] text-rose-400 font-semibold mt-0.5">
                Relance WhatsApp recommandée
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Agences & Agents Actifs</div>
              <div className="text-2xl font-black text-white mt-1">{agencies.length + agents.length} <span className="text-xs text-slate-400">Comptes</span></div>
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
            Coordonnées Orange Money
          </button>
        </div>
      </div>

      {/* TAB 1: INVOICES LIST & MANAGEMENT */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher facture, agence, agent..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto text-xs font-semibold">
              <span className="text-slate-400 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Statut:
              </span>
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'paid', label: 'Payées' },
                { id: 'pending', label: 'En Attente' },
                { id: 'overdue', label: 'En Retard' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id as any)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
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

          {/* Invoices Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider">
                    <th className="p-3.5">N° Facture</th>
                    <th className="p-3.5">Client (Agence / Agent)</th>
                    <th className="p-3.5">Pack / Prestation</th>
                    <th className="p-3.5">Montant Total</th>
                    <th className="p-3.5">Échéance</th>
                    <th className="p-3.5">Statut</th>
                    <th className="p-3.5 text-right">Actions Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Aucune facture ne correspond à la recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {inv.invoiceNumber}
                        </td>

                        <td className="p-3.5">
                          <div className="font-bold text-white text-sm">{inv.targetName}</div>
                          <div className="text-[11px] text-slate-400">{inv.targetEmail} {inv.targetPhone && `• ${inv.targetPhone}`}</div>
                          {inv.targetNifRccm && (
                            <div className="text-[10px] text-slate-500 font-mono">RCCM: {inv.targetNifRccm}</div>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="font-medium text-slate-200">
                            {inv.items[0]?.description || 'Service Immobilier'}
                          </span>
                          {inv.items.length > 1 && (
                            <span className="block text-[10px] text-slate-400">+{inv.items.length - 1} options supplémentaires</span>
                          )}
                        </td>

                        <td className="p-3.5 font-black text-sm text-white whitespace-nowrap">
                          {inv.totalAmount} {inv.currency}
                        </td>

                        <td className="p-3.5 whitespace-nowrap text-slate-400">
                          {new Date(inv.dueDate).toLocaleDateString('fr-FR')}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {inv.status === 'paid' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Payée
                            </span>
                          )}
                          {inv.status === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold text-[11px]">
                              <Clock className="w-3.5 h-3.5" /> En Attente
                            </span>
                          )}
                          {inv.status === 'overdue' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 font-bold text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5" /> En Retard
                            </span>
                          )}
                          {inv.status === 'cancelled' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[11px]">
                              Annulée
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingInvoice(inv)}
                              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1 transition-all"
                              title="Modifier le montant ou les détails de la facture"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Modifier Montant
                            </button>

                            <button
                              onClick={() => setSelectedInvoiceModal(inv)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-medium text-xs flex items-center gap-1 transition-all"
                              title="Voir & Imprimer Facture Détaillée"
                            >
                              <Eye className="w-3.5 h-3.5" /> Facture
                            </button>

                            <button
                              onClick={() => handleSendWhatsAppReminder(inv)}
                              className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                              title="Envoyer Rappel WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                            </button>

                            {inv.status !== 'paid' && (
                              <button
                                onClick={() => setMarkPaidModalInvoice(inv)}
                                className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-all shadow-md"
                                title="Enregistrer le Paiement"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> Encasser
                              </button>
                            )}

                            <button
                              onClick={() => {
                                requestConfirm({
                                  title: "Suppression de la facture",
                                  message: `Voulez-vous vraiment supprimer la facture ${inv.invoiceNumber} ?`,
                                  onConfirm: () => deleteInvoice(inv.id)
                                });
                              }}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* TAB 2: SUBSCRIPTIONS & ACCOUNTS OVERVIEW */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              Répertoire des Agences Immobilières à Kinshasa
            </h3>
            <p className="text-xs text-slate-400">
              Gérez les abonnements mensuels des agences (Pack Elite $99/mois), ajustez les crédits d'annonces et émettez des factures récurrentes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {agencies.map(ag => {
                const isExpired = ag.subscriptionStatus === 'Expired';
                return (
                  <div key={ag.id} className={`bg-slate-950 border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all ${
                    isExpired ? 'border-rose-500/40 ring-1 ring-rose-500/20' : 'border-slate-800'
                  }`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <img src={ag.logo} alt={ag.name} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/20 shrink-0" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-base">{ag.name}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isExpired
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}>
                              {isExpired ? '🔴 Expiré' : '🟢 Actif'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">📍 {ag.address}, Kinshasa</p>
                          <p className="text-xs text-emerald-400 font-mono mt-0.5">{ag.email} • {ag.phone}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-bold">
                              Pack Agence Elite ($99/mois)
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">{ag.agentsCount} agents rattachés</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 font-medium">Statut Abonnement: </span>
                        <span className={`font-bold ${isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {isExpired ? 'Paiement en retard / Compte Expiré' : 'Abonnement Actif'}
                        </span>
                        {ag.subscriptionExpiresAt && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Échéance: {new Date(ag.subscriptionExpiresAt).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          const nextStatus = isExpired ? 'Active' : 'Expired';
                          updateAgencySubscriptionStatus(ag.id, nextStatus);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          isExpired
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isExpired ? 'Re-Activer (Paiement Reçu)' : 'Marquer comme Expiré'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Agence Vérifiée & Agréée RDC
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            requestConfirm({
                              title: "Suppression de l'agence / concessionnaire",
                              message: `Voulez-vous vraiment supprimer l'agence / concessionnaire "${ag.name}" ?`,
                              onConfirm: () => deleteAgency(ag.id)
                            });
                          }}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all shrink-0"
                          title="Supprimer cette agence"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleGrantFreeMonth('agency', ag.id, ag.name, ag.email, ag.phone)}
                          className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1.5 transition-all text-xs"
                          title="Offrir 1 mois d'abonnement gratuit"
                        >
                          <Gift className="w-3.5 h-3.5 text-amber-400" /> 1 Mois Gratuit ($0)
                        </button>

                        <button
                          onClick={() => {
                            handleTargetChange('agency', ag.id);
                            setIsNewInvoiceOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1.5 transition-all"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-400" /> Facturer Agence
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
              Répertoire des Agents Immobilier Indépendants & Membres Inscrits ({combinedAgentTargets.length})
            </h3>
            <p className="text-xs text-slate-400">
              Abonnements individuels (Pack Agent Pro $35/mois ou Starter $20/mois). Émettez des factures directement pour les nouveaux venus et agents de démonstration.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {combinedAgentTargets.map((agt) => {
                // Find agent or user matching status
                const existingAgent = agents.find(a => a.id === agt.id || a.email === agt.email);
                const isExpired = agt.subscriptionStatus === 'Expired' || existingAgent?.subscriptionStatus === 'Expired';
                
                return (
                  <div key={agt.id} className={`bg-slate-950 border rounded-2xl p-4 space-y-3 relative overflow-hidden transition-all ${
                    isExpired ? 'border-rose-500/40 ring-1 ring-rose-500/20' : 'border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        isExpired
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      }`}>
                        {isExpired ? '🔴 Compte Expiré' : '🟢 Abonnement Actif'}
                      </span>
                      {agt.isNew && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-[9px] uppercase tracking-wider">
                          🆕 Nouveau Membre
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <img src={agt.avatar} alt={agt.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/20 shrink-0" />
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-white text-sm truncate">{agt.name}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{agt.agencyName}</p>
                        <p className="text-[10px] text-emerald-400 font-mono truncate">{agt.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[11px]">
                      <span className="text-slate-400">📱 {agt.phone}</span>
                      <span className="text-emerald-400 font-bold">{agt.planId === 'starter' ? '$20' : '$35'} / mois</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                      <button
                        onClick={() => {
                          const nextStatus = isExpired ? 'Active' : 'Expired';
                          updateUserSubscriptionStatus(agt.id, nextStatus);
                          if (agt.email) {
                            updateUserSubscriptionStatus(agt.email, nextStatus);
                          }
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          isExpired
                            ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {isExpired ? 'Activer Compte' : 'Marquer Expiré'}
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleGrantFreeMonth('agent', agt.id, agt.name, agt.email, agt.phone)}
                          className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition-all"
                          title="Offrir 1 mois d'abonnement gratuit à cet agent"
                        >
                          <Gift className="w-3 h-3 text-amber-400" /> 1 Mois Gratuit
                        </button>

                        <button
                          onClick={() => {
                            handleTargetChange('agent', agt.id);
                            setIsNewInvoiceOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center gap-1 transition-all"
                        >
                          <Receipt className="w-3 h-3 text-emerald-400" /> Facturer
                        </button>

                        <button
                          onClick={() => {
                            requestConfirm({
                              title: "Suppression du membre / agent",
                              message: `Voulez-vous vraiment supprimer le membre / agent "${agt.name}" (${agt.email}) ?`,
                              onConfirm: () => {
                                deleteUser(agt.id);
                                deleteAgent(agt.id);
                                setRegisteredUsers((prev) => prev.filter((u) => u.id !== agt.id && u.email !== agt.email));
                              }
                            });
                          }}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all shrink-0"
                          title="Supprimer cet utilisateur"
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
        </div>
      )}

      {/* TAB: PLANS & PRICING MANAGEMENT (CDF & USD) */}
      {activeTab === 'plans_pricing' && (
        <AdminPlansPricingManager />
      )}

      {/* TAB 3: PAYMENT GATEWAYS & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Coordonnées de Facturation & Règlement Mobile Money (Orange Money RDC Exclusif)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ce numéro Orange Money apparaît automatiquement sur toutes les factures, fiches d'encaissement et liens de paiement transmis aux agences & agents.
            </p>
          </div>

          <div className="space-y-6">
            {/* Unique Active Payment Method: Orange Money RDC */}
            <div className="bg-gradient-to-r from-orange-950/40 via-slate-950 to-slate-950 border-2 border-orange-500/50 rounded-3xl p-6 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-lg shadow-orange-500/30">
                    OM
                  </div>
                  <div>
                    <span className="font-black text-white text-base flex items-center gap-2">
                      Orange Money RDC
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    </span>
                    <p className="text-xs text-orange-400 font-semibold">Moyen de Paiement Exclusif Activé</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold self-start sm:self-center">
                  Actif Principal (100%)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="bg-slate-900/90 border border-orange-500/30 p-4 rounded-2xl">
                  <span className="text-slate-400 text-[11px] block font-medium">Numéro Orange Money de Facturation :</span>
                  <span className="font-mono text-orange-400 font-black text-base mt-1 block">
                    +243 84 529 4616
                  </span>
                  <span className="text-[10px] text-slate-400">RDC Kinshasa (+243)</span>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-slate-400 text-[11px] block font-medium">Titulaire du Compte :</span>
                  <span className="font-bold text-white text-sm mt-1 block">
                    IMMOCRAFT / KIN IMMOBILIER SARL
                  </span>
                  <span className="text-[10px] text-slate-400">Compte vérifié professionnel</span>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
                  <span className="text-slate-400 text-[11px] block font-medium">Réception & Confirmation :</span>
                  <span className="font-bold text-emerald-400 text-sm mt-1 block">
                    Validation Instantanée
                  </span>
                  <span className="text-[10px] text-slate-400">Notification WhatsApp automatique</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200/90 flex items-center gap-2">
                <span className="font-bold">Information :</span>
                <span>Tous les règlements de factures, d'abonnements agences et de vérifications foncières sont actuellement centralisés sur le numéro Orange Money <strong>+243 84 529 4616</strong>.</span>
              </div>
            </div>

            {/* Inactive other methods notice */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-300 block">Autres moyens de paiement (M-Pesa, Airtel Money, Virement bancaire)</span>
                <span className="text-[11px] text-slate-400 mt-0.5 block">Désactivés temporairement selon la configuration active. Seul Orange Money est actif.</span>
              </div>
              <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 font-bold text-[10px] shrink-0">
                Désactivés
              </span>
            </div>
          </div>
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
                <label className="text-xs font-semibold text-slate-300">Moyen de Paiement Utilisé</label>
                <select
                  value={paymentMethodSelect}
                  onChange={e => setPaymentMethodSelect(e.target.value as any)}
                  className="w-full bg-slate-950 border border-orange-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="orange_money">Orange Money RDC (+243 84 529 4616)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Numéro / Référence de Transaction (ID)</label>
                <input
                  type="text"
                  placeholder="Ex: MP260808.1042 ou Ref BCDC-9921"
                  value={paymentRefInput}
                  onChange={e => setPaymentRefInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all"
              >
                Valider & Débloquer l'Abonnement
              </button>
            </form>
          </div>
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
                    Tél: +243 84 529 4616 • joosskalu72@gmail.com
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

              {/* Payment Instructions RDC */}
              <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-600 space-y-2 bg-orange-50/50 p-4 rounded-xl border border-orange-200">
                <p className="font-bold text-slate-900">Instructions de Paiement Mobile Money Officiel RDC :</p>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-orange-600 font-mono">▶ Orange Money RDC :</span>
                    <span className="font-mono font-black text-slate-950 text-sm bg-white px-2 py-0.5 rounded border border-orange-300">+243 84 529 4616</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Titulaire : <strong>IMMOCRAFT / KIN IMMOBILIER SARL</strong> • Mentionnez le N° de facture <strong>{selectedInvoiceModal.invoiceNumber}</strong> en référence
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
