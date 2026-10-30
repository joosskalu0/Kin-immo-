import React, { useState, useEffect } from 'react';
import { Property, VisibilityOption } from '../../types';
import { useApp } from '../../context/AppContext';
import { mysqlApi } from '../../services/mysqlApi';
import {
  Sparkles,
  Crown,
  Zap,
  ArrowUpCircle,
  Share2,
  X,
  CheckCircle2,
  CreditCard,
  Phone,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Ban,
  Clock
} from 'lucide-react';
import { canBoostProperty, getListingLifecycleStatus, LISTING_STATUS_CONFIG } from '../../utils/propertyStatusHelpers';

interface VisibilityBoostModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property | null;
  onSuccess?: () => void;
}

export const VisibilityBoostModal: React.FC<VisibilityBoostModalProps> = ({
  isOpen,
  onClose,
  property,
  onSuccess
}) => {
  const { user, addInvoice, updateInvoiceStatus } = useApp();
  const [options, setOptions] = useState<VisibilityOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt_featured_7d');
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('pm_mpesa');
  const [paymentGateway, setPaymentGateway] = useState<string>('manual_mobile_money');
  const [transactionRef, setTransactionRef] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setOrderSuccess(null);
      setErrorMsg(null);
      setTransactionRef('');
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [optRes, pmRes] = await Promise.all([
        mysqlApi.getVisibilityOptions(),
        mysqlApi.getPaymentMethods()
      ]);

      if (optRes.success && optRes.options) {
        setOptions(optRes.options);
      }
      if (pmRes.success && pmRes.paymentMethods) {
        setPaymentMethods(pmRes.paymentMethods);
        if (pmRes.paymentMethods.length > 0) {
          setSelectedPaymentMethodId(pmRes.paymentMethods[0].id);
        }
      }
    } catch (err) {
      console.warn('Erreur lors du chargement des options:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !property) return null;

  const selectedOption = options.find((o) => o.id === selectedOptionId) || options[0];
  const selectedPayment = paymentMethods.find((p) => p.id === selectedPaymentMethodId) || paymentMethods[0];

  const handleOrderBoost = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await mysqlApi.createBoostOrder(
        property.id,
        selectedOption.id,
        selectedPaymentMethodId,
        paymentGateway
      );

      if (res.success && res.invoice) {
        setOrderSuccess(res.invoice);
        // Sync to AppContext invoices for immediate admin and user visibility
        const appInvoice = {
          id: res.invoice.id || `inv_${Date.now()}`,
          invoiceNumber: res.invoice.invoice_number || res.invoice.invoiceNumber || `INV-${Date.now()}`,
          targetType: 'property' as const,
          targetId: property.id,
          targetName: user?.name || 'Annonceur Kinshasa',
          targetEmail: user?.email || 'contact@kinimmo.cd',
          propertyId: property.id,
          propertyTitle: property.title,
          optionId: selectedOption.id,
          amount: Number(selectedOption.price_usd || (selectedOption as any).price || 10),
          subtotalAmount: Number(selectedOption.price_usd || (selectedOption as any).price || 10),
          taxAmount: 0,
          totalAmount: Number(selectedOption.price_usd || (selectedOption as any).price || 10),
          currency: 'USD' as const,
          status: 'pending' as const,
          paymentMethod: selectedPaymentMethodId as any,
          transactionReference: transactionRef || undefined,
          issuedDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          items: [
            {
              id: `item_${Date.now()}`,
              description: `Boost visibilité : ${selectedOption.name} (${property.title})`,
              quantity: 1,
              amount: Number(selectedOption.price_usd || (selectedOption as any).price || 10),
            }
          ]
        };
        addInvoice(appInvoice);
        if (onSuccess) onSuccess();
      } else {
        setErrorMsg(res.message || 'Impossible de créer la commande de boost.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur réseau lors de la commande.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitProof = async () => {
    if (!orderSuccess?.id) return;
    setIsSubmitting(true);
    try {
      const res = await mysqlApi.submitPaymentProof(orderSuccess.id, {
        paymentMethodId: selectedPaymentMethodId,
        transactionReference: transactionRef
      });
      if (res.success) {
        updateInvoiceStatus(orderSuccess.id, 'pending', selectedPaymentMethodId as any, `Réf SMS: ${transactionRef}`);
        alert('Référence de paiement enregistrée ! L\'administrateur va vérifier votre versement pour activer le boost.');
        onClose();
      }
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement de la référence.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBoostIcon = (boostType: string) => {
    switch (boostType) {
      case 'premium':
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 'urgent':
        return <Zap className="w-5 h-5 text-rose-500" />;
      case 'refresh':
        return <ArrowUpCircle className="w-5 h-5 text-sky-500" />;
      case 'social_blast':
        return <Share2 className="w-5 h-5 text-purple-500" />;
      case 'featured':
      default:
        return <Sparkles className="w-5 h-5 text-emerald-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">
                Options de Visibilité & Monétisation
              </span>
              <h2 className="text-xl font-black tracking-tight text-white">
                Booster la visibilité de votre annonce
              </h2>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-white/10 flex items-center gap-3 text-xs text-slate-300">
            <span className="font-semibold text-white truncate">{property.title}</span>
            <span className="text-emerald-400 font-bold ml-auto shrink-0">
              {property.price.toLocaleString()} {property.currency}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {!canBoostProperty(property).allowed && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-3">
              <Ban className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-900">
                  Boost de visibilité non disponible pour ce bien
                </h4>
                <p className="mt-1 leading-relaxed text-amber-800">
                  {canBoostProperty(property).reason}
                </p>
                <p className="mt-1 text-[11px] text-amber-700">
                  Statut actuel de l'annonce : <strong>{LISTING_STATUS_CONFIG[getListingLifecycleStatus(property)]?.label}</strong>.
                </p>
              </div>
            </div>
          )}

          {!orderSuccess ? (
            <>
              {/* Étape 1 : Choix de l'option de visibilité */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                  1. Choisissez une formule de mise en avant à la carte
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {options.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getBoostIcon(opt.boost_type)}
                              <span className="font-bold text-xs text-slate-900">{opt.name}</span>
                            </div>
                            {opt.badge_text && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-black">
                                {opt.badge_text}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2">
                            {opt.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-400">
                            Durée : {opt.duration_days} {opt.duration_days > 1 ? 'jours' : 'jour'}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-black text-emerald-700">
                              {Number(opt.price_usd ?? (opt as any).price ?? 0)} $
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              (~{Number(opt.price_cdf ?? ((Number(opt.price_usd ?? (opt as any).price ?? 0)) * 2850)).toLocaleString()} CDF)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Étape 2 : Choix du mode de règlement local ou carte */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-3">
                  2. Moyen de règlement (Mobile Money & Banques RDC)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethodId(pm.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedPaymentMethodId === pm.id
                          ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-black uppercase text-slate-900">
                        {pm.provider === 'mpesa'
                          ? 'Vodacom M-Pesa'
                          : pm.provider === 'airtel'
                          ? 'Airtel Money'
                          : pm.provider === 'orange'
                          ? 'Orange Money'
                          : 'Rawbank / Virement'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono truncate block mt-0.5">
                        {pm.account_number}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedPayment && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-700">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Coordonnées de versement : {selectedPayment.account_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Numéro ou Compte : <span className="font-mono font-bold text-slate-900">{selectedPayment.account_number}</span>
                      {selectedPayment.merchant_code && (
                        <span> | Code Marchand : <strong className="font-mono">{selectedPayment.merchant_code}</strong></span>
                      )}
                    </p>
                    {selectedPayment.instructions && (
                      <p className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                        {selectedPayment.instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Procédure de validation manuelle par l'administrateur */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Validation Manuelle par l'Administrateur</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Votre demande de boost sera soumise à l'administration Kinimmo. Dès vérification manuelle de votre paiement (M-Pesa, Airtel Money, Orange Money ou Rawbank), le boost sera activé sur votre annonce pour la durée sélectionnée.
                </p>
              </div>

              {/* Total et Bouton de validation */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500">Montant total à régler :</span>
                  <div className="text-xl font-black text-slate-900">
                    {Number(selectedOption?.price_usd ?? (selectedOption as any)?.price ?? 0)} USD{' '}
                    <span className="text-xs text-emerald-600 font-bold">
                      (~{Number(selectedOption?.price_cdf ?? ((Number(selectedOption?.price_usd ?? (selectedOption as any)?.price ?? 0)) * 2850)).toLocaleString()} CDF)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleOrderBoost}
                    disabled={isSubmitting || !canBoostProperty(property).allowed}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Transmission demande...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-slate-950" />
                        <span>Soumettre la Demande de Boost</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Confirmation & Facture générée */
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <Clock className="w-9 h-9 text-amber-600 animate-pulse" />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase">
                  <span>En attente de validation admin</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  Demande de Boost transmise avec succès !
                </h3>
                <p className="text-xs text-slate-500">
                  Numéro de facture : <strong className="text-slate-900 font-mono">{orderSuccess.invoiceNumber}</strong>
                </p>
              </div>

              {/* Notice explicative de validation manuelle */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Activation après contrôle de paiement</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  L'administrateur Kinimmo contrôle manuellement les versements. Dès confirmation de votre paiement, votre annonce sera propulsée en tête de liste et portera son badge de visibilité.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Annonce :</span>
                  <span className="font-bold text-slate-900">{orderSuccess.propertyTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Option choisie :</span>
                  <span className="font-bold text-amber-700">{orderSuccess.optionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Montant :</span>
                  <span className="font-black text-slate-900">
                    {orderSuccess.amount} USD ({Number(orderSuccess.amountCdf).toLocaleString()} CDF)
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-slate-700">
                  Insérez votre code de transaction SMS (facultatif maintenant) :
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    placeholder="Ex: MPESA-98745214 ou BORDEREAU-123"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    onClick={handleSubmitProof}
                    disabled={isSubmitting || !transactionRef}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs disabled:opacity-40"
                  >
                    Valider le code
                  </button>
                </div>
                <span className="text-[11px] text-slate-500">
                  Le code SMS aide l'administrateur à identifier et valider plus rapidement votre versement.
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`https://wa.me/243845294616?text=${encodeURIComponent(
                    `Bonjour Kinimmo, je viens de soumettre la demande de boost facture ${orderSuccess.invoiceNumber} pour l'annonce "${orderSuccess.propertyTitle}". Montant: ${orderSuccess.amount} USD.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Envoyer preuve sur WhatsApp (+243 84 529 4616)</span>
                </a>

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
