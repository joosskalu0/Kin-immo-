import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { mysqlApi } from '../../services/mysqlApi';
import { Invoice, PaymentMethodConfig, Property, VisibilityOption } from '../../types';
import { canUserManageProperty } from '../../utils/propertyPermissions';
import {
  canBoostProperty,
  getListingLifecycleStatus,
  LISTING_STATUS_CONFIG,
} from '../../utils/propertyStatusHelpers';
import { compressProofImageFile } from '../../utils/billingHelpers';
import {
  DEFAULT_FEATURED_SLOTS_LIMIT,
  getActiveBoostDisplay,
  parseFeaturedSlotsLimit,
  resolveBoostPrimaryLabel,
} from '../../utils/boostHelpers';
import { buildBoostPath } from '../../utils/navigation';
import { resolveMediaUrl, handlePropertyImageError, FALLBACK_PROPERTY_IMAGE } from '../../utils/mediaUrl';
import { EmptyState, PageHeaderBar } from '../StateFeedback';
import {
  Sparkles,
  Crown,
  Zap,
  ArrowUpCircle,
  Share2,
  Rocket,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Upload,
  Image as ImageIcon,
  ShieldCheck,
  Building2,
  Ban,
  ArrowRight,
  Loader2,
  FileText,
  Layers,
} from 'lucide-react';

interface BoostPageProps {
  propertyId?: string | null;
  invoiceId?: string | null;
  optionId?: string | null;
  onNavigatePath: (path: string, replace?: boolean) => void;
}

export const BoostPage: React.FC<BoostPageProps> = ({
  propertyId,
  invoiceId,
  optionId,
  onNavigatePath,
}) => {
  const {
    user,
    properties,
    agents,
    invoices,
    addInvoice,
    submitManualPaymentProof,
    contactSettings,
    cdfExchangeRate,
  } = useApp();

  const [options, setOptions] = useState<VisibilityOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(propertyId || '');
  const [selectedOptionId, setSelectedOptionId] = useState<string>(optionId || 'opt_featured_7d');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>('pm_mpesa');

  const [featuredSlotsLimit, setFeaturedSlotsLimit] = useState<number>(() =>
    parseFeaturedSlotsLimit(contactSettings?.featuredSlotsLimit ?? DEFAULT_FEATURED_SLOTS_LIMIT)
  );
  const [activeSlotsCount, setActiveSlotsCount] = useState<number>(0);

  const [remoteInvoice, setRemoteInvoice] = useState<any | null>(null);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [proofImageUrl, setProofImageUrl] = useState<string>('');
  const [proofSubmittedMsg, setProofSubmittedMsg] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const manageableProperties = useMemo(() => {
    if (!user) return [];
    if (user.role === 'admin') return properties;
    return properties.filter((p) => canUserManageProperty(user, p, agents));
  }, [user, properties, agents]);

  useEffect(() => {
    setFeaturedSlotsLimit(
      parseFeaturedSlotsLimit(contactSettings?.featuredSlotsLimit ?? DEFAULT_FEATURED_SLOTS_LIMIT)
    );
  }, [contactSettings?.featuredSlotsLimit]);

  useEffect(() => {
    if (propertyId) {
      setSelectedPropertyId(propertyId);
    } else if (!selectedPropertyId && manageableProperties.length > 0) {
      const firstEligible = manageableProperties.find((p) => canBoostProperty(p).allowed);
      setSelectedPropertyId((firstEligible || manageableProperties[0]).id);
    }
  }, [propertyId, manageableProperties, selectedPropertyId]);

  useEffect(() => {
    if (optionId) {
      setSelectedOptionId(optionId);
    }
  }, [optionId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const [optRes, pmRes, myBoostsRes, myInvRes] = await Promise.all([
          mysqlApi.getVisibilityOptions(),
          mysqlApi.getPaymentMethods(),
          user ? mysqlApi.getMyBoosts().catch(() => null) : Promise.resolve(null),
          invoiceId && user ? mysqlApi.getMyInvoices().catch(() => null) : Promise.resolve(null),
        ]);

        if (!mounted) return;

        if (optRes?.success && Array.isArray(optRes.options)) {
          const activeOpts = optRes.options.filter((o: any) => o.is_active !== false);
          setOptions(activeOpts);
          if (optionId && activeOpts.some((o: any) => o.id === optionId)) {
            setSelectedOptionId(optionId);
          } else if (activeOpts.length > 0 && !activeOpts.some((o: any) => o.id === selectedOptionId)) {
            setSelectedOptionId(activeOpts[0].id);
          }
        }

        if (pmRes?.success && Array.isArray(pmRes.paymentMethods) && pmRes.paymentMethods.length > 0) {
          setPaymentMethods(pmRes.paymentMethods);
          setSelectedPaymentMethodId((prev) =>
            pmRes.paymentMethods.some((m: any) => m.id === prev) ? prev : pmRes.paymentMethods[0].id
          );
        }

        if (myBoostsRes?.featured_slots_limit) {
          setFeaturedSlotsLimit(parseFeaturedSlotsLimit(myBoostsRes.featured_slots_limit));
        }
        if (typeof myBoostsRes?.active_slots_count === 'number') {
          setActiveSlotsCount(myBoostsRes.active_slots_count);
        }

        if (invoiceId) {
          const fromBoosts = myBoostsRes?.boosts?.find(
            (b: any) => b.id === invoiceId || b.invoice_number === invoiceId
          );
          const fromInvoices = myInvRes?.invoices?.find(
            (i: any) => i.id === invoiceId || i.invoice_number === invoiceId
          );
          const found = fromBoosts || fromInvoices || null;
          if (found) {
            setRemoteInvoice(found);
            if (found.property_id && !propertyId) {
              setSelectedPropertyId(found.property_id);
            }
            if (found.option_id) {
              setSelectedOptionId(found.option_id);
            }
            if (found.payment_method_id) {
              setSelectedPaymentMethodId(found.payment_method_id);
            }
          }
        } else {
          setRemoteInvoice(null);
          setProofSubmittedMsg(null);
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMsg(err?.message || 'Impossible de charger les options de mise en avant.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [user?.id, invoiceId, optionId, propertyId]);

  const contextInvoice = useMemo(() => {
    if (!invoiceId) return null;
    return invoices.find((inv) => inv.id === invoiceId || inv.invoiceNumber === invoiceId) || null;
  }, [invoices, invoiceId]);

  const activeInvoice: any = remoteInvoice || contextInvoice;

  const selectedProperty: Property | undefined = useMemo(() => {
    const targetId = activeInvoice?.property_id || activeInvoice?.propertyId || selectedPropertyId;
    return (
      manageableProperties.find((p) => p.id === targetId) ||
      properties.find((p) => p.id === targetId) ||
      manageableProperties[0]
    );
  }, [activeInvoice, selectedPropertyId, manageableProperties, properties]);

  const selectedOption: VisibilityOption | undefined = useMemo(() => {
    const optKey = activeInvoice?.option_id || activeInvoice?.optionId || selectedOptionId;
    return options.find((o) => o.id === optKey) || options[0];
  }, [activeInvoice, options, selectedOptionId]);

  const selectedPayment = useMemo(() => {
    return paymentMethods.find((m) => m.id === selectedPaymentMethodId) || paymentMethods[0];
  }, [paymentMethods, selectedPaymentMethodId]);

  const isProUser = Boolean(user && (user.role === 'agent' || user.role === 'agency'));
  const historyPath = isProUser ? '/pro/plus/boosts' : '/compte';
  const listingsBackPath = isProUser ? '/pro/annonces' : '/compte';

  if (!user) {
    return (
      <div className="max-w-xl mx-auto py-4">
        <PageHeaderBar
          title="Mise en avant (Boost)"
          subtitle="Propulsez votre annonce en tête de liste"
          fallbackPath="/"
          onBack={() => onNavigatePath('/')}
        />
        <EmptyState
          icon={Sparkles}
          title="Connexion requise pour booster une annonce"
          description="Connectez-vous à votre compte Kinimmo pour sélectionner votre annonce, générer une facture et activer une mise en avant."
          actionLabel="Se connecter"
          onAction={() => onNavigatePath(`/connexion?next=${encodeURIComponent(buildBoostPath(propertyId, { invoiceId, optionId }))}`)}
          secondaryLabel="Retour à l'accueil"
          onSecondaryAction={() => onNavigatePath('/')}
        />
      </div>
    );
  }

  if (manageableProperties.length === 0 && !activeInvoice) {
    return (
      <div className="max-w-2xl mx-auto py-4 space-y-4">
        <PageHeaderBar
          title="Mise en avant (Boost)"
          subtitle="Aucune annonce disponible"
          fallbackPath={listingsBackPath}
          onBack={() => onNavigatePath(listingsBackPath)}
        />
        <EmptyState
          icon={Building2}
          title="Publiez d'abord une annonce pour la mettre en avant"
          description="Vous n'avez encore aucune annonce publiée. Créez votre fiche immobilière, puis revenez choisir une option « À la une », « Sponsorisé » ou « Urgent »."
          actionLabel="Publier une annonce"
          onAction={() => onNavigatePath('/publier')}
          secondaryLabel="Retour à mon espace"
          onSecondaryAction={() => onNavigatePath(listingsBackPath)}
        />
      </div>
    );
  }

  const boostEligibility = selectedProperty
    ? canBoostProperty(selectedProperty)
    : { allowed: false, reason: 'Sélectionnez une annonce à mettre en avant.' };

  const getBoostIcon = (boostType: string) => {
    switch (boostType) {
      case 'premium':
        return <Crown className="w-5 h-5 text-amber-600" />;
      case 'urgent':
        return <Zap className="w-5 h-5 text-rose-600" />;
      case 'sponsorise':
        return <Rocket className="w-5 h-5 text-[#1D4ED8]" />;
      case 'refresh':
        return <ArrowUpCircle className="w-5 h-5 text-sky-600" />;
      case 'social_blast':
        return <Share2 className="w-5 h-5 text-indigo-600" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-600" />;
    }
  };

  const getOptionVisibleBadge = (opt?: VisibilityOption) => {
    if (!opt) return 'À la une';
    if (opt.boost_type === 'urgent') return 'Urgent';
    return resolveBoostPrimaryLabel(opt.boost_type, opt.badge_text, opt.label_type);
  };

  const handleCreateBoostInvoice = async () => {
    if (!selectedProperty || !selectedOption || !boostEligibility.allowed) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await mysqlApi.createBoostOrder(
        selectedProperty.id,
        selectedOption.id,
        selectedPayment?.id,
        'manual_mobile_money'
      );

      if (res?.success && res?.invoice) {
        const inv = res.invoice;
        const priceUsd = Number(inv.amount ?? inv.total_amount ?? selectedOption.price_usd ?? 10);
        const priceCdf = Number(inv.amount_cdf ?? inv.total_amount_cdf ?? Math.round(priceUsd * cdfExchangeRate));
        const appInvoice: Invoice = {
          id: inv.id,
          invoiceNumber: inv.invoice_number || inv.invoiceNumber || `INV-${Date.now()}`,
          targetType: 'property',
          targetId: selectedProperty.id,
          targetName: user.name || 'Annonceur Kinshasa',
          targetEmail: user.email || '',
          targetPhone: user.phone || '',
          invoiceType: 'boost',
          propertyId: selectedProperty.id,
          propertyTitle: selectedProperty.title,
          optionId: selectedOption.id,
          optionName: selectedOption.name,
          boost_type: selectedOption.boost_type,
          boost_label: getOptionVisibleBadge(selectedOption),
          totalAmount: priceUsd,
          subtotalAmount: priceUsd,
          taxAmount: 0,
          totalAmountCDF: priceCdf,
          currency: 'USD',
          status: 'pending',
          paymentMethod: (selectedPayment?.provider as any) || 'mpesa',
          paymentMethodId: selectedPayment?.id,
          paymentMethodProvider: selectedPayment?.account_name || 'Mobile Money RDC',
          dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          items: [
            {
              id: `item_${Date.now()}`,
              description: `Boost visibilité : ${selectedOption.name} (${selectedProperty.title})`,
              quantity: 1,
              amount: priceUsd,
            },
          ],
        };
        addInvoice(appInvoice);
        setRemoteInvoice(inv);
        if (typeof res.featured_slots_limit === 'number') setFeaturedSlotsLimit(res.featured_slots_limit);
        if (typeof res.active_slots_count === 'number') setActiveSlotsCount(res.active_slots_count);

        onNavigatePath(
          buildBoostPath(selectedProperty.id, { invoiceId: inv.id, optionId: selectedOption.id }),
          true
        );
      } else {
        setErrorMsg(res?.message || res?.error || 'Impossible de générer la facture de boost.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur réseau lors de la création de la facture.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProofFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressProofImageFile(file);
      if (compressed) setProofImageUrl(compressed);
    } catch {
      setErrorMsg('Impossible de traiter cette image de preuve.');
    }
  };

  const handleSubmitManualProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeInvoice?.id || !transactionRef.trim()) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await submitManualPaymentProof(activeInvoice.id, {
        paymentMethodId: selectedPayment?.id,
        transactionReference: transactionRef.trim(),
        proofImageUrl: proofImageUrl || undefined,
      });
      if (res.success) {
        setRemoteInvoice((prev: any) =>
          prev
            ? {
                ...prev,
                status: 'awaiting_validation',
                transaction_reference: transactionRef.trim(),
                proof_image_url: proofImageUrl || prev.proof_image_url,
              }
            : prev
        );
        setProofSubmittedMsg(
          res.message ||
            'Preuve transmise ! Votre mise en avant sera activée dès validation par l’administration.'
        );
      } else {
        setErrorMsg(res.message || 'Impossible d’enregistrer la preuve de paiement.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erreur lors de la transmission de la preuve.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const invoiceStatus = String(activeInvoice?.status || 'pending').toLowerCase();
  const isProofSent = Boolean(proofSubmittedMsg) || invoiceStatus === 'awaiting_validation';
  const isPaidInvoice = invoiceStatus === 'paid';
  const invoiceNumber = activeInvoice?.invoice_number || activeInvoice?.invoiceNumber || activeInvoice?.id;
  const invoiceUsd = Number(activeInvoice?.amount ?? activeInvoice?.totalAmount ?? activeInvoice?.total_amount ?? selectedOption?.price_usd ?? 0);
  const invoiceCdf = Number(
    activeInvoice?.amount_cdf ??
      activeInvoice?.totalAmountCDF ??
      activeInvoice?.total_amount_cdf ??
      Math.round(invoiceUsd * cdfExchangeRate)
  );
  const invoiceOptionName = activeInvoice?.option_name || activeInvoice?.optionName || selectedOption?.name || 'Mise en avant';
  const invoiceDuration = Number(activeInvoice?.duration_days ?? selectedOption?.duration_days ?? 7);
  const invoiceLabelPreview =
    activeInvoice?.boost_label ||
    (activeInvoice?.boost_type === 'urgent'
      ? 'Urgent'
      : selectedOption
      ? getOptionVisibleBadge(selectedOption)
      : 'À la une');

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeaderBar
        title={activeInvoice ? `Facture ${invoiceNumber}` : 'Mettre une annonce en avant'}
        subtitle={
          activeInvoice
            ? 'Étape 2/2 — Paiement manuel Mobile Money & validation admin'
            : 'Étape 1/2 — Choix du bien et de la formule de visibilité'
        }
        fallbackPath={historyPath}
        onBack={() => {
          if (activeInvoice) {
            setRemoteInvoice(null);
            onNavigatePath(buildBoostPath(selectedProperty?.id));
          } else {
            onNavigatePath(historyPath);
          }
        }}
        rightSlot={
          <button
            type="button"
            onClick={() => onNavigatePath(historyPath)}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-[#1D4ED8] text-xs font-bold text-[#1D4ED8] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Historique</span>
          </button>
        }
      />

      {/* Indicateur de places en tête configuré par l'admin */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1D4ED8] flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900">
              Emplacements prioritaires en tête de site :{' '}
              <span className="text-[#1D4ED8] tabular-nums">
                {activeSlotsCount} / {featuredSlotsLimit}
              </span>{' '}
              actuellement actifs
            </p>
            <p className="text-xs text-slate-600">
              Activation avec dates de début et de fin calculées dès validation du paiement par l’administration.
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>À la une / Sponsorisé / Urgent</span>
        </span>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-[#1D4ED8] mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Chargement des options de mise en avant...</p>
        </div>
      ) : !activeInvoice ? (
        /* ============================================================== */
        /* ÉTAPE 1 : CHOIX DE L'ANNONCE + CHOIX DE L'OPTION               */
        /* ============================================================== */
        <div className="space-y-5">
          {/* 1. Choix du bien */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  1. Sélectionnez l’annonce à booster
                </h2>
                <p className="text-xs text-slate-500">
                  Seules les annonces publiées et disponibles peuvent être mises en avant.
                </p>
              </div>
              <span className="text-xs font-bold text-slate-500 tabular-nums">
                {manageableProperties.length} bien{manageableProperties.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-0.5">
              {manageableProperties.map((prop) => {
                const isSelected = selectedProperty?.id === prop.id;
                const elig = canBoostProperty(prop);
                const lifecycle = getListingLifecycleStatus(prop);
                const statusCfg = LISTING_STATUS_CONFIG[lifecycle];
                const activeBoost = getActiveBoostDisplay(prop);
                const cover = resolveMediaUrl(prop.images?.[0] || '') || FALLBACK_PROPERTY_IMAGE;

                return (
                  <button
                    key={prop.id}
                    type="button"
                    onClick={() => setSelectedPropertyId(prop.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-[#1D4ED8] bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    } ${!elig.allowed ? 'opacity-75' : ''}`}
                  >
                    <img
                      src={cover}
                      alt={prop.title}
                      onError={(e) => handlePropertyImageError(e)}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          {statusCfg?.label || lifecycle}
                        </span>
                        {activeBoost.isActive && activeBoost.expiresAt && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900">
                            {activeBoost.primaryLabel || 'Boost actif'} · jusqu’au{' '}
                            {new Date(activeBoost.expiresAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {prop.title}
                      </h3>
                      <p className="text-xs font-extrabold text-[#1D4ED8] tabular-nums">
                        {prop.price.toLocaleString('fr-FR')} {prop.currency} • {prop.commune || prop.city}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {!boostEligibility.allowed && selectedProperty && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Ban className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">Boost impossible pour cette annonce</p>
                    <p className="text-amber-800 mt-0.5">{boostEligibility.reason}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigatePath(`/publier/${encodeURIComponent(selectedProperty.id)}`)}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-950 font-bold text-xs shrink-0 cursor-pointer"
                >
                  Modifier l’annonce
                </button>
              </div>
            )}
          </section>

          {/* 2. Choix de l'option paramétrable */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                2. Choisissez la formule de mise en avant
              </h2>
              <p className="text-xs text-slate-500">
                Tarifs, durées et étiquettes visibles (« À la une », « Sponsorisé », « Urgent ») configurés par l’administration.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {options.map((opt) => {
                const isSelected = selectedOption?.id === opt.id;
                const priceUsd = Number(opt.price_usd ?? opt.price ?? 0);
                const priceCdf = Number(opt.price_cdf ?? opt.priceCDF ?? Math.round(priceUsd * cdfExchangeRate));
                const visibleBadge = getOptionVisibleBadge(opt);

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-[#1D4ED8] bg-blue-50/40 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {getBoostIcon(opt.boost_type)}
                          <span className="text-xs font-extrabold text-slate-900 truncate">
                            {opt.name}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold shrink-0 ${
                            visibleBadge === 'Urgent'
                              ? 'bg-rose-600 text-white'
                              : visibleBadge === 'Sponsorisé'
                              ? 'bg-[#1D4ED8] text-white'
                              : 'bg-[#FACC15] text-slate-950'
                          }`}
                        >
                          {visibleBadge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {opt.description}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-end justify-between w-full tabular-nums">
                      <span className="text-xs font-bold text-slate-500">
                        {opt.duration_days} {opt.duration_days > 1 ? 'jours' : 'jour'}
                      </span>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-[#1D4ED8] block">
                          {priceUsd} $ USD
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          ~{priceCdf.toLocaleString('fr-FR')} CDF
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Récapitulatif + Création facture */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500">Récapitulatif de la demande</span>
              <p className="text-sm font-extrabold text-slate-900">
                {selectedProperty?.title || 'Sélectionnez une annonce'} — {selectedOption?.name}
              </p>
              <p className="text-xs text-slate-600 tabular-nums">
                Montant :{' '}
                <strong className="text-slate-900">
                  {Number(selectedOption?.price_usd ?? selectedOption?.price ?? 0)} USD
                </strong>{' '}
                (~
                {Number(
                  selectedOption?.price_cdf ??
                    selectedOption?.priceCDF ??
                    Math.round(Number(selectedOption?.price_usd ?? 0) * cdfExchangeRate)
                ).toLocaleString('fr-FR')}{' '}
                CDF) • Étiquette : <strong>{getOptionVisibleBadge(selectedOption)}</strong>
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateBoostInvoice}
              disabled={isSubmitting || !boostEligibility.allowed || !selectedOption}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors shrink-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Création facture...</span>
                </>
              ) : (
                <>
                  <span>Créer la facture & payer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </section>
        </div>
      ) : (
        /* ============================================================== */
        /* ÉTAPE 2 : FACTURE GÉNÉRÉE + PAIEMENT MANUEL MOBILE MONEY        */
        /* ============================================================== */
        <div className="space-y-5">
          {/* Détails Facture */}
          <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-extrabold bg-blue-50 text-[#1D4ED8]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {isPaidInvoice
                      ? 'Paiement validé · Boost actif'
                      : isProofSent
                      ? 'Preuve reçue · En attente de validation admin'
                      : 'Facture émise · Paiement manuel requis'}
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900">
                  Facture {invoiceNumber}
                </h2>
              </div>

              <div className="text-left sm:text-right tabular-nums">
                <span className="text-xs font-semibold text-slate-500 block">Total à régler</span>
                <span className="text-2xl font-extrabold text-[#1D4ED8] block">
                  {invoiceUsd} USD
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  ~{invoiceCdf.toLocaleString('fr-FR')} CDF
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div>
                <span className="text-slate-500 block">Annonce concernée</span>
                <strong className="text-slate-900 font-bold block mt-0.5 truncate">
                  {activeInvoice?.property_title || activeInvoice?.propertyTitle || selectedProperty?.title || 'Bien Kinimmo'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Option & Étiquette</span>
                <strong className="text-slate-900 font-bold block mt-0.5">
                  {invoiceOptionName} ({invoiceLabelPreview})
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Durée après validation</span>
                <strong className="text-slate-900 font-bold block mt-0.5 tabular-nums">
                  {invoiceDuration} {invoiceDuration > 1 ? 'jours' : 'jour'}
                </strong>
              </div>
            </div>
          </section>

          {isProofSent || isPaidInvoice ? (
            <section className="bg-white border border-emerald-200 rounded-2xl p-6 space-y-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    {isPaidInvoice
                      ? 'Boost validé et activé'
                      : 'Preuve de paiement enregistrée'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {proofSubmittedMsg ||
                      (isPaidInvoice
                        ? 'Votre mise en avant est active avec ses dates de début et de fin.'
                        : 'Votre référence de paiement est en cours de vérification par l’administration. Dès validation, les dates de début et de fin démarrent automatiquement.')}
                  </p>
                  {(activeInvoice?.transaction_reference || transactionRef) && (
                    <p className="text-xs font-mono font-bold text-slate-800 pt-1">
                      Référence transmise : {activeInvoice?.transaction_reference || transactionRef}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => onNavigatePath(historyPath)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Voir l’historique & statistiques Boost</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigatePath(listingsBackPath)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#1D4ED8] text-slate-800 font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Retour à mes annonces</span>
                </button>
              </div>
            </section>
          ) : (
            /* Formulaire de règlement manuel & preuve */
            <form
              onSubmit={handleSubmitManualProof}
              className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 shadow-2xs"
            >
              <div className="space-y-3">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Choisissez l’opérateur pour effectuer le dépôt
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedPaymentMethodId(pm.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        selectedPayment?.id === pm.id
                          ? 'border-[#1D4ED8] bg-blue-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <span className="block text-xs font-extrabold text-slate-900 uppercase">
                        {pm.provider === 'mpesa'
                          ? 'Vodacom M-Pesa'
                          : pm.provider === 'airtel'
                          ? 'Airtel Money'
                          : pm.provider === 'orange'
                          ? 'Orange Money'
                          : 'Banque / Virement'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-600 block truncate mt-0.5">
                        {pm.account_number}
                      </span>
                    </button>
                  ))}
                </div>

                {selectedPayment && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-700">
                    <div className="flex items-center gap-1.5 font-extrabold text-slate-900">
                      <Phone className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      <span>Compte marchand : {selectedPayment.account_name}</span>
                    </div>
                    <p>
                      Numéro / Compte :{' '}
                      <strong className="font-mono text-slate-900">{selectedPayment.account_number}</strong>
                      {selectedPayment.merchant_code && (
                        <span>
                          {' '}
                          • Code Marchand :{' '}
                          <strong className="font-mono text-slate-900">{selectedPayment.merchant_code}</strong>
                        </span>
                      )}
                    </p>
                    {selectedPayment.instructions && (
                      <p className="text-slate-600 pt-1">{selectedPayment.instructions}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs sm:text-sm font-bold text-slate-900">
                  Référence de transaction / bordereau (obligatoire)
                </label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="Ex: MP241123.1408.A92104"
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                />

                <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer min-h-[36px]">
                    <Upload className="w-4 h-4 text-[#1D4ED8]" />
                    <span>
                      {proofImageUrl
                        ? 'Capture jointe (cliquez pour modifier)'
                        : 'Joindre une capture du reçu Mobile Money (optionnel)'}
                    </span>
                    <input type="file" accept="image/*" onChange={handleProofFileChange} className="hidden" />
                  </label>
                  {proofImageUrl && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <ImageIcon className="w-4 h-4" />
                      Prête
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  L’administrateur vérifie votre référence et active le boost avec sa date de début et sa date de fin exactes.
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <a
                  href={`https://wa.me/${(contactSettings?.supportWhatsApp || '243845294616').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Bonjour Kinimmo, je règle la facture boost ${invoiceNumber} (${invoiceUsd} USD) pour l'annonce "${
                      activeInvoice?.property_title || selectedProperty?.title || ''
                    }".`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs inline-flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Envoyer aussi par WhatsApp</span>
                </a>

                <button
                  type="submit"
                  disabled={isSubmitting || !transactionRef.trim()}
                  className="min-h-[46px] px-6 py-3 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Envoyer la preuve pour validation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
