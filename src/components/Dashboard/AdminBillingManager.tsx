import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Invoice, InvoiceItem, Agent, Agency } from '../../types';
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
  Globe
} from 'lucide-react';

export const AdminBillingManager: React.FC = () => {
  const {
    invoices,
    addInvoice,
    updateInvoiceStatus,
    deleteInvoice,
    agents,
    agencies,
    user
  } = useApp();

  const [activeTab, setActiveTab] = useState<'invoices' | 'subscriptions' | 'settings'>('invoices');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [selectedInvoiceModal, setSelectedInvoiceModal] = useState<Invoice | null>(null);
  const [markPaidModalInvoice, setMarkPaidModalInvoice] = useState<Invoice | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [paymentMethodSelect, setPaymentMethodSelect] = useState<Invoice['paymentMethod']>('mpesa');

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
  const [notes, setNotes] = useState('Paiement par Vodacom M-Pesa (+243 81 555 0100) ou Orange Money (+243 89 000 0000)');

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
      const agt = agents.find(a => a.id === id);
      if (agt) {
        setCustomName(`${agt.name} (${agt.title})`);
        setCustomEmail(agt.email);
        setCustomPhone(agt.phone);
        setCustomNifRccm('');
        setPlanId('pro');
        setItems([
          {
            id: 'item_1',
            description: `Abonnement Mensuel Pack Agent Pro - ${agt.name}`,
            amount: 35,
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
      paymentMethod: 'mpesa',
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
      `Mode de paiement rapide Mobile Money RDC:\n` +
      `📱 Vodacom M-Pesa: *+243 81 555 0100*\n` +
      `📱 Orange Money: *+243 89 000 0000*\n` +
      `📱 Airtel Money: *+243 99 000 0000*\n` +
      `🏦 Equity BCDC: Compte USD 00018-992019-91\n\n` +
      `Veuillez nous envoyer la référence du paiement. Merci pour votre confiance !`
    );
    const phone = inv.targetPhone ? inv.targetPhone.replace(/[^0-9]/g, '') : '243815550100';
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
              Émettez des factures d'abonnements mensuels (Pack Agent $35, Pack Agence $99), encaissez par Mobile Money (M-Pesa, Orange, Airtel) ou Banque, et relancez directement par WhatsApp.
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
              <div className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-0.5">
                <Sparkles className="w-3 h-3" /> Payé via M-Pesa & Cartes
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
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Coordonnées M-Pesa & BCDC
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
                                if (window.confirm(`Supprimer la facture ${inv.invoiceNumber} ?`)) {
                                  deleteInvoice(inv.id);
                                }
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
              {agencies.map(ag => (
                <div key={ag.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <img src={ag.logo} alt={ag.name} className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/20 shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-base">{ag.name}</h4>
                      <p className="text-xs text-slate-400">📍 {ag.address}, Kinshasa</p>
                      <p className="text-xs text-emerald-400 font-mono mt-0.5">{ag.email} • {ag.phone}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          Pack Agence Elite ($99/mois)
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">{ag.agentsCount} agents rattachés</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Compte Validé Admin
                    </span>
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
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Répertoire des Agents Immobilier Indépendants & Certifiés
            </h3>
            <p className="text-xs text-slate-400">
              Abonnements individuels (Pack Agent Pro $35/mois). Activez les badges "Agent Vérifié +243" et émettez des appels de fonds.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {agents.map(agt => (
                <div key={agt.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <img src={agt.avatar} alt={agt.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/20 shrink-0" />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-white text-sm truncate">{agt.name}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{agt.title}</p>
                      <p className="text-[10px] text-emerald-400 font-mono truncate">{agt.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-[11px]">
                    <span className="text-slate-400">18 annonces en ligne</span>
                    <span className="text-emerald-400 font-bold">$35 / mois</span>
                  </div>

                  <button
                    onClick={() => {
                      handleTargetChange('agent', agt.id);
                      setIsNewInvoiceOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Receipt className="w-3 h-3 text-emerald-400" /> Facturer Agent
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT GATEWAYS & SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Paramètres des Encaissements Mobile Money & Comptes Bancaires (RDC)
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Ces numéros marchands et coordonnées bancaires apparaissent automatiquement sur les factures imprimables et liens de paiement transmis aux agences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span> Vodacom M-Pesa RDC
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Actif</span>
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <div>Code Marchand / N° Till: <span className="font-mono text-emerald-400 font-bold">112200</span></div>
                <div>Téléphone Reste en Ligne: <span className="font-mono text-white">+243 81 555 0100</span></div>
                <div>Titulaire du Compte: <span className="font-semibold text-slate-200">KIN IMMOBILIER RDC SARL</span></div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span> Orange Money RDC
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Actif</span>
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <div>Code Marchand Orange: <span className="font-mono text-emerald-400 font-bold">889900</span></div>
                <div>Téléphone Reste en Ligne: <span className="font-mono text-white">+243 89 000 0000</span></div>
                <div>Titulaire du Compte: <span className="font-semibold text-slate-200">KIN IMMOBILIER RDC SARL</span></div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-600"></span> Airtel Money RDC
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Actif</span>
              </div>
              <div className="text-xs space-y-1 text-slate-300">
                <div>N° Airtel Money: <span className="font-mono text-emerald-400 font-bold">+243 99 000 0000</span></div>
                <div>Titulaire du Compte: <span className="font-semibold text-slate-200">KIN IMMOBILIER RDC SARL</span></div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Equity BCDC / Rawbank
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">Virement Bancaire</span>
              </div>
              <div className="text-xs space-y-1 text-slate-300 font-mono">
                <div>Equity BCDC: <span className="text-emerald-400 font-bold">00018-992019-91 USD</span></div>
                <div>Rawbank Kinshasa: <span className="text-emerald-400 font-bold">05101-0029302-88 USD</span></div>
                <div>Code SWIFT/BIC: <span className="text-white font-bold">EQRDCKKIN</span></div>
              </div>
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
                    onClick={() => handleTargetChange('agent', agents[0]?.id || '')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      targetType === 'agent'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Users className="w-4 h-4" /> Agent
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
                  <label className="text-xs font-semibold text-slate-400">Choisir l'Agent Immobilier</label>
                  <select
                    value={selectedTargetId}
                    onChange={e => handleTargetChange('agent', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {agents.map(agt => (
                      <option key={agt.id} value={agt.id}>
                        {agt.name} - {agt.agencyName || 'Indépendant'} ({agt.phone})
                      </option>
                    ))}
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
                          value={item.amount}
                          onChange={e => handleItemChange(item.id, 'amount', Number(e.target.value))}
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="mpesa">Vodacom M-Pesa RDC</option>
                  <option value="orange_money">Orange Money RDC</option>
                  <option value="airtel_money">Airtel Money RDC</option>
                  <option value="bank_transfer">Virement Bancaire (Equity BCDC / Rawbank)</option>
                  <option value="card">Carte Bancaire (VISA / Mastercard)</option>
                  <option value="cash">Espèces en Agence Gombe</option>
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
              <div className="border-t border-slate-200 pt-4 text-[11px] text-slate-600 space-y-2 bg-slate-50 p-4 rounded-xl">
                <p className="font-bold text-slate-800">Instructions de Paiement Mobile Money & Virement Kinshasa:</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div>• Vodacom M-Pesa: <span className="font-bold text-slate-900">+243 81 555 0100</span> (Marchand 112200)</div>
                  <div>• Orange Money: <span className="font-bold text-slate-900">+243 89 000 0000</span> (Marchand 889900)</div>
                  <div>• Airtel Money: <span className="font-bold text-slate-900">+243 99 000 0000</span></div>
                  <div>• Equity BCDC USD: <span className="font-bold text-slate-900">00018-992019-91</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
