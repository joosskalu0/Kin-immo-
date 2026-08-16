import React, { useState } from 'react';
import { AlertTriangle, CreditCard, ExternalLink, ShieldAlert, PhoneCall, CheckCircle2, Clock, X, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PaymentReminderBannerProps {
  onOpenBilling?: () => void;
}

export const PaymentReminderBanner: React.FC<PaymentReminderBannerProps> = ({ onOpenBilling }) => {
  const { user, agencies, invoices } = useApp();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  // Find user's agency if any
  const userAgency = agencies.find(a => 
    a.id === user?.agencyId || 
    (a.name && user?.agencyName && a.name.toLowerCase() === user.agencyName.toLowerCase())
  );

  // Check if account is expired
  const isAccountExpired = 
    user?.subscriptionStatus === 'Expired' || 
    userAgency?.subscriptionStatus === 'Expired' ||
    (user?.planExpiry && new Date(user.planExpiry) < new Date());

  if (!isAccountExpired) {
    return null;
  }

  // Find relevant pending/overdue invoice
  const pendingInvoice = invoices.find(inv => 
    (inv.status === 'pending' || inv.status === 'overdue') &&
    (inv.targetId === user?.id || inv.targetEmail === user?.email || (userAgency && inv.targetId === userAgency.id))
  );

  const amountDue = pendingInvoice ? (pendingInvoice.totalAmount ?? pendingInvoice.amount ?? 35) : (userAgency ? 99 : 35);
  const currency = pendingInvoice ? pendingInvoice.currency : 'USD';
  const planName = userAgency ? 'Pack Agence Elite' : (user?.planId === 'pro' ? 'Pack Agent Pro' : 'Pack Starter');

  if (isDismissed) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-3 text-amber-200 text-xs mb-6 animate-fadeIn">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>
            <strong>Abonnement Expiré:</strong> Votre compte est en mode restreint ({planName}).
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPayModal(true)}
            className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-all text-xs"
          >
            Régulariser ${amountDue}
          </button>
          <button
            onClick={() => setIsDismissed(false)}
            className="text-amber-400 underline text-[11px] hover:text-white"
          >
            Agrandir
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/80 border-2 border-rose-500/40 rounded-3xl p-6 mb-8 shadow-2xl relative overflow-hidden animate-fadeIn">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" /> Compte Suspendu / Expiré
              </span>
              {pendingInvoice && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-xs">
                  Facture #{pendingInvoice.invoiceNumber || pendingInvoice.id}
                </span>
              )}
            </div>

            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Régularisez votre abonnement {userAgency ? `(${userAgency.name})` : ''}
            </h3>

            <p className="text-slate-300 text-sm leading-relaxed">
              Votre formule <strong className="text-amber-300">{planName}</strong> est arrivée à échéance. 
              Pour maintenir la priorité de vos annonces immobilières à Kinshasa et conserver vos statistiques d'agents, 
              veuillez régler la redevance mensuelle de <strong className="text-emerald-400 font-mono">${amountDue} {currency}</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-rose-400 font-medium">
                <Clock className="w-3.5 h-3.5" /> Échéance dépassée
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Payez par M-Pesa, Airtel Money, Orange Money ou Carte
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-3 shrink-0 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowPayModal(true)}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              <CreditCard className="w-4 h-4" />
              Régulariser Maintenant (${amountDue})
            </button>

            <a
              href={`https://wa.me/243845294616?text=Bonjour%20Immocraft,%20je%20souhaite%20régulariser%20l'abonnement%20de%20mon%20compte%20${encodeURIComponent(user?.email || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
              Contacter le Support RDC
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="text-slate-400 hover:text-slate-200 text-xs text-center pt-1 underline"
            >
              Masquer temporairement
            </button>
          </div>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-white">
            <button
              onClick={() => setShowPayModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black">Règlement de l'Abonnement Immocraft</h3>
              <p className="text-xs text-slate-400">
                Paiement sécurisé pour réactiver immédiatement vos accès agents & annonces.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Formule:</span>
                <span className="font-bold text-emerald-400">{planName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Montant total:</span>
                <span className="font-mono font-black text-lg text-white">${amountDue} {currency}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Modes de Paiement Mobiles RDC:</h4>
              
              <div className="grid grid-cols-1 gap-2.5 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-emerald-400">Vodacom M-Pesa / Airtel Money / Orange</p>
                    <p className="text-[11px] text-slate-400">Numéro Marchand Mobile Money / WhatsApp: <strong className="text-white font-mono">+243 84 529 46 16</strong></p>
                  </div>
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">Instant</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-200">Virement Bancaire (EquityBCDC / Rawbank)</p>
                    <p className="text-[11px] text-slate-400">RIB: <strong className="text-white font-mono">00018-00001234567-89</strong></p>
                  </div>
                  <span className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[10px]">24h</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <a
                href={`https://wa.me/243845294616?text=Bonjour%20Immocraft,%20j'ai%20effectué%20mon%20paiement%20de%20$${amountDue}%20pour%20mon%20compte%20${encodeURIComponent(user?.email || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
              >
                Envoyer la preuve par WhatsApp
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
