import React, { useState, useEffect } from 'react';
import { mysqlApi } from '../../services/mysqlApi';
import { MonetizationStats, Advertisement, VisibilityOption } from '../../types';
import {
  DollarSign,
  TrendingUp,
  Sparkles,
  Zap,
  Building2,
  Landmark,
  Megaphone,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Eye,
  MousePointerClick,
  Filter
} from 'lucide-react';

interface AdminMonetizationManagerProps {
  onRefreshStats?: () => void;
}

export const AdminMonetizationManager: React.FC<AdminMonetizationManagerProps> = ({
  onRefreshStats
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'ads' | 'adsense' | 'plans' | 'options'>('invoices');
  const [stats, setStats] = useState<MonetizationStats | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [options, setOptions] = useState<VisibilityOption[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Configuration Google AdSense
  const [adSenseConfig, setAdSenseConfig] = useState(mysqlApi.getAdSenseConfig());

  // Formulaire nouvelle publicité
  const [isCreatingAd, setIsCreatingAd] = useState(false);
  const [newAdForm, setNewAdForm] = useState({
    title: '',
    advertiser_name: '',
    advertiser_contact: '',
    advertiser_email: '',
    category: 'real_estate',
    placement: 'home_hero',
    image_url: '',
    target_url: '',
    alt_text: '',
    price_usd: 150,
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
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
      const [statsRes, invRes, adsRes, plansRes, optRes] = await Promise.all([
        mysqlApi.adminGetMonetizationStats(),
        mysqlApi.adminGetInvoices(),
        mysqlApi.adminGetAdvertisements(),
        mysqlApi.getPricingPlans(),
        mysqlApi.getVisibilityOptions()
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (invRes.success && invRes.data?.invoices) {
        setInvoices(invRes.data.invoices);
      }
      if (adsRes.success && adsRes.advertisements) {
        setAds(adsRes.advertisements);
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
    if (!confirm('Confirmez-vous la réception du paiement et l\'activation immédiate ?')) return;
    setIsProcessing(invoiceId);
    try {
      const res = await mysqlApi.approveInvoice(invoiceId);
      if (res.success) {
        showMsg('success', res.message || 'Facture approuvée avec succès.');
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

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdForm.title || !newAdForm.advertiser_name) {
      alert('Veuillez renseigner au moins le titre et l\'annonceur.');
      return;
    }

    try {
      const res = await mysqlApi.adminCreateAdvertisement(newAdForm);
      if (res.success) {
        showMsg('success', 'Campagne publicitaire enregistrée avec succès.');
        setIsCreatingAd(false);
        setNewAdForm({
          title: '',
          advertiser_name: '',
          advertiser_contact: '',
          advertiser_email: '',
          category: 'dealership',
          placement: 'home_hero',
          image_url: '',
          target_url: '',
          alt_text: '',
          price_usd: 150,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
        });
        loadData();
      } else {
        showMsg('error', res.message || 'Erreur lors de la création de la publicité.');
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Erreur réseau.');
    }
  };

  const handleDeleteAd = async (adId: string) => {
    if (!confirm('Supprimer définitivement cette campagne publicitaire ?')) return;
    try {
      const res = await mysqlApi.adminDeleteAdvertisement(adId);
      if (res.success) {
        showMsg('success', 'Publicité supprimée.');
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
          <span className="text-[11px] text-amber-400 block font-semibold">
            {stats?.invoices?.pending_invoices || 0} en attente de vérification
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Boosts & Visibilité Actifs</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {stats?.activeBoosts || 0}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Annonces propulsées (Premium / Urgent)
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Régie Publicitaire</span>
            <Megaphone className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {stats?.ads?.active_ads || 0}
          </div>
          <span className="text-[11px] text-slate-400 block">
            {Number(stats?.ads?.total_impressions || 0).toLocaleString()} vues • {stats?.ads?.total_clicks || 0} clics
          </span>
        </div>
      </div>

      {/* Sub navigation buttons */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'invoices', label: `Factures & Règlements (${invoices.length})`, icon: DollarSign },
          { id: 'ads', label: `Régie Bannières & Pancartes Partenaires (${ads.length})`, icon: Megaphone },
          { id: 'plans', label: `Formules & Abonnements (${plans.length})`, icon: Building2 },
          { id: 'options', label: `Options de Visibilité (${options.length})`, icon: Zap }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                activeSubTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

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
                            {inv.total_amount || inv.amount} {inv.currency || 'USD'}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            ~{Number(inv.total_amount_cdf || (inv.total_amount || 0) * 2800).toLocaleString()} CDF
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

      {/* Sub-Tab 2: Régie Publicitaire & Bannières */}
      {activeSubTab === 'ads' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Campagnes Publicitaires Actives (Sponsoring Bannières)
              </h3>
              <p className="text-xs text-slate-400">
                Gérez les partenariats avec les promoteurs immobiliers, entreprises de construction et banques de Kinshasa
              </p>
            </div>
            <button
              onClick={() => setIsCreatingAd(!isCreatingAd)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Nouvelle Campagne Pub</span>
            </button>
          </div>

          {/* Formulaire création de campagne */}
          {isCreatingAd && (
            <form onSubmit={handleCreateAd} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h4 className="font-bold text-sm text-white">Créer un contrat publicitaire</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Titre de la publicité *</label>
                  <input
                    type="text"
                    required
                    value={newAdForm.title}
                    onChange={(e) => setNewAdForm({ ...newAdForm, title: e.target.value })}
                    placeholder="Ex: Nouveau Programme Résidentiel Gombe"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Nom de l'Annonceur / Entreprise *</label>
                  <input
                    type="text"
                    required
                    value={newAdForm.advertiser_name}
                    onChange={(e) => setNewAdForm({ ...newAdForm, advertiser_name: e.target.value })}
                    placeholder="Ex: Kinshasa Real Estate Developers"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Catégorie Sponsor</label>
                  <select
                    value={newAdForm.category}
                    onChange={(e) => setNewAdForm({ ...newAdForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="real_estate">Promoteur Foncier & Immobilier</option>
                    <option value="construction">Entreprise BTP & Construction</option>
                    <option value="architecture">Architecture & Aménagement</option>
                    <option value="banking">Banque & Crédit Immobilier</option>
                    <option value="insurance">Assurance & Caution Locative</option>
                    <option value="general">Général Partenaire</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Emplacement d'affichage</label>
                  <select
                    value={newAdForm.placement}
                    onChange={(e) => setNewAdForm({ ...newAdForm, placement: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="home_hero">Bannière Accueil (Grand format Cockpit)</option>
                    <option value="in_feed">Pancarte Sponsorisée (Dans le flux des propriétés)</option>
                    <option value="search_top">Tête des résultats de recherche</option>
                    <option value="sidebar">Barre latérale (Sidebar)</option>
                    <option value="footer_banner">Bannière bas de page</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">URL de l'image (Bannière)</label>
                  <input
                    type="url"
                    value={newAdForm.image_url}
                    onChange={(e) => setNewAdForm({ ...newAdForm, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Lien cible (Clic) ou WhatsApp</label>
                  <input
                    type="text"
                    value={newAdForm.target_url}
                    onChange={(e) => setNewAdForm({ ...newAdForm, target_url: e.target.value })}
                    placeholder="https://wa.me/243... ou site web"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatingAd(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                >
                  Enregistrer la campagne
                </button>
              </div>
            </form>
          )}

          {/* Grille des publicités */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      {ad.category === 'real_estate'
                        ? 'Promoteur'
                        : ad.category === 'construction'
                        ? 'BTP Construction'
                        : ad.category === 'banking'
                        ? 'Banque / Crédit'
                        : ad.category === 'architecture'
                        ? 'Architecture'
                        : ad.category === 'insurance'
                        ? 'Assurance'
                        : ad.category}
                    </span>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h4 className="font-bold text-sm text-white">{ad.title}</h4>
                  <p className="text-xs text-slate-400">
                    Annonceur : <strong className="text-slate-200">{ad.advertiser_name}</strong>
                  </p>

                  {ad.image_url && (
                    <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-950">
                      <img
                        src={ad.image_url}
                        alt={ad.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono text-slate-300">
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      {ad.impressions_count || 0} vues
                    </span>
                    <span className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
                      <MousePointerClick className="w-3.5 h-3.5 text-emerald-500" />
                      {ad.clicks_count || 0} clics
                    </span>
                  </div>

                  {ad.target_url && (
                    <a
                      href={ad.target_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Voir</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 2b: Configuration et Espaces Google AdSense */}
      {activeSubTab === 'adsense' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                Monétisation & Diffusion Google AdSense
              </h3>
              <p className="text-xs text-slate-400">
                Allouez et configurez les espaces publicitaires (bannières d'accueil et pancartes in-feed) pour diffuser vos annonces Google AdSense
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                adSenseConfig.displayMode === 'adsense'
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : adSenseConfig.displayMode === 'hybrid'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                Mode Actif : {
                  adSenseConfig.displayMode === 'adsense' ? '100% Google AdSense' :
                  adSenseConfig.displayMode === 'hybrid' ? 'Hybride (Sponsors + AdSense)' :
                  'Régie Sponsors Directs RDC'
                }
              </span>
            </div>
          </div>

          {/* Formulaire de configuration AdSense */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-6 shadow-xl">
            {/* Mode Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Règle de diffusion sur l'écran d'accueil et les pancartes
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'sponsors',
                    title: 'Régie Sponsors RDC',
                    desc: 'Diffuse vos contrats directs avec les promoteurs et banques',
                    color: 'emerald'
                  },
                  {
                    id: 'adsense',
                    title: 'Google AdSense',
                    desc: 'Donne cet espace à Google pour diffuser ses annonces programmatiques',
                    color: 'blue'
                  },
                  {
                    id: 'hybrid',
                    title: 'Alternance Hybride',
                    desc: 'Alterne entre vos partenaires locaux et Google AdSense',
                    color: 'purple'
                  }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => {
                      const updated = mysqlApi.updateAdSenseConfig({ displayMode: mode.id as any });
                      setAdSenseConfig(updated);
                      showMsg('success', `Mode de diffusion modifié : ${mode.title}`);
                    }}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                      adSenseConfig.displayMode === mode.id
                        ? 'bg-slate-800 border-blue-500 shadow-md ring-2 ring-blue-500/30'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-white">{mode.title}</span>
                      {adSenseConfig.displayMode === mode.id && (
                        <CheckCircle2 className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{mode.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* IDs AdSense */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>Identifiants de votre compte Google AdSense</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    ID Éditeur Google AdSense (Client ID) *
                  </label>
                  <input
                    type="text"
                    value={adSenseConfig.clientId}
                    onChange={(e) => setAdSenseConfig({ ...adSenseConfig, clientId: e.target.value })}
                    placeholder="ca-pub-1234567890123456"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Format : ca-pub- suivi de 16 chiffres.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Slot ID - Bannière d'Accueil (Cockpit Hero)
                  </label>
                  <input
                    type="text"
                    value={adSenseConfig.slotHero || ''}
                    onChange={(e) => setAdSenseConfig({ ...adSenseConfig, slotHero: e.target.value })}
                    placeholder="1234567890"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Bloc d'annonces responsive pour le haut de l'écran d'accueil.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Slot ID - Pancartes In-Feed (Au cœur des propriétés)
                  </label>
                  <input
                    type="text"
                    value={adSenseConfig.slotInFeed || ''}
                    onChange={(e) => setAdSenseConfig({ ...adSenseConfig, slotInFeed: e.target.value })}
                    placeholder="2345678901"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Bloc d'annonces in-feed inséré au milieu de la grille des propriétés.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">
                    Slot ID - Pancarte Barre Latérale (Sidebar)
                  </label>
                  <input
                    type="text"
                    value={adSenseConfig.slotSidebar || ''}
                    onChange={(e) => setAdSenseConfig({ ...adSenseConfig, slotSidebar: e.target.value })}
                    placeholder="3456789012"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-blue-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Format carré ou vertical pour la vue scindée carte / propriétés.
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const saved = mysqlApi.updateAdSenseConfig(adSenseConfig);
                    setAdSenseConfig(saved);
                    showMsg('success', 'Paramètres Google AdSense enregistrés et appliqués en direct.');
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer les identifiants AdSense</span>
                </button>
              </div>
            </div>

            {/* Aperçu en direct */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Aperçu en direct de l'espace Google AdSense sur l'écran
              </h4>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="max-w-3xl mx-auto">
                  <div className="p-4 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-md">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-[10px] text-slate-500 font-medium">
                      <span className="font-bold text-blue-700">ANNONCE GOOGLE ADSENSE</span>
                      <span className="font-mono text-slate-400">ID: {adSenseConfig.clientId}</span>
                    </div>
                    <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            AdSense Display Network
                          </span>
                          <h5 className="font-extrabold text-sm text-slate-900 mt-1">
                            Annonce ciblée Immobilier Kinshasa
                          </h5>
                          <p className="text-xs text-slate-500">
                            Emplacement prêt pour la diffusion automatique de vos revenus AdSense.
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                        Prêt pour la diffusion
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Formules d'abonnements */}
      {activeSubTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">
              Catalogue des Abonnements (Particuliers, Agences, Concessionnaires, Garages)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div
                key={p.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400">
                    {p.category || 'Général'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    ID: {p.id}
                  </span>
                </div>

                <h4 className="font-black text-base text-white">{p.name}</h4>
                <div className="text-2xl font-black text-emerald-400">
                  {p.priceMonthly === 0 ? 'Gratuit' : `${p.priceMonthly} USD / mois`}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {p.description || 'Formule active sur la plateforme.'}
                </p>

                <div className="pt-2 border-t border-slate-800 text-xs text-slate-300 space-y-1">
                  <div>
                    Max Annonces : <strong>{p.maxListings >= 999 ? 'Illimité' : p.maxListings}</strong>
                  </div>
                  <div>
                    Annonces Vedettes : <strong>{p.featuredListings || 0}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Options de visibilité */}
      {activeSubTab === 'options' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">
            Catalogue des Options de Visibilité & Boosts à la carte
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {options.map((opt) => (
              <div
                key={opt.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-400">
                    {opt.boost_type}
                  </span>
                  <span className="text-xs font-mono font-black text-amber-400">
                    {opt.price_usd} USD ({opt.duration_days}j)
                  </span>
                </div>

                <h4 className="font-bold text-sm text-white">{opt.name}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {opt.description}
                </p>
                {opt.badge_text && (
                  <div className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Badge: {opt.badge_text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
