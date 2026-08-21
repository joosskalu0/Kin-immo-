import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Send,
  Trash2,
  Globe,
  Smartphone,
  ExternalLink,
  Code2,
  ShieldCheck,
  Activity,
  Play,
  Settings2,
  Sliders,
  Flame,
  HelpCircle,
  BarChart3
} from 'lucide-react';
import {
  getStoredTrackingConfig,
  saveStoredTrackingConfig,
  checkAllTrackingStatus,
  getAnalyticsLogs,
  subscribeToAnalyticsLogs,
  clearAnalyticsLogs,
  AnalyticsEventLog,
  trackPageView,
  trackPropertyView,
  trackLeadGenerated,
  trackContactClick,
  trackAgencyRegistration,
  trackSubscriptionPayment,
  trackSearchEvent,
  DEFAULT_GTM_ID,
  DEFAULT_GA_ID,
  DEFAULT_META_PIXEL_ID,
  DEFAULT_TIKTOK_PIXEL_ID,
  DEFAULT_GOOGLE_ADS_ID,
  DEFAULT_GOOGLE_ADS_LABEL,
  DEFAULT_TRACKING_CONFIG
} from '../../utils/analytics';
import { TrackingConfig } from '../../types';

interface TagManagerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TagManagerSettingsModal: React.FC<TagManagerSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'config' | 'live_inspector' | 'simulator' | 'gtm_guide'>('config');
  const [config, setConfig] = useState<TrackingConfig>(() => getStoredTrackingConfig());
  const [status, setStatus] = useState(() => checkAllTrackingStatus());
  const [logs, setLogs] = useState<AnalyticsEventLog[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [testSentMsg, setTestSentMsg] = useState<string | null>(null);
  const [filterDestination, setFilterDestination] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoredTrackingConfig());
      setStatus(checkAllTrackingStatus());
      setLogs(getAnalyticsLogs());

      const unsub = subscribeToAnalyticsLogs((newLogs) => {
        setLogs(newLogs);
        setStatus(checkAllTrackingStatus());
      });

      return () => unsub();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredTrackingConfig(config);
    setStatus(checkAllTrackingStatus());
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3500);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const runTestEvent = (type: 'pageview' | 'property' | 'lead' | 'whatsapp' | 'agency' | 'purchase') => {
    switch (type) {
      case 'pageview':
        trackPageView('Appartement Standing Gombe Kinshasa', '/properties/prop_gombe_test');
        setTestSentMsg('✓ Événement "page_view" (PageView) envoyé au DataLayer GTM & Pixels !');
        break;
      case 'property':
        trackPropertyView({
          id: 'prop_kin_001',
          title: 'Villa Moderne avec Piscine & Groupe',
          price: 650000,
          currency: 'USD',
          type: 'house',
          status: 'for-sale',
          city: 'Kinshasa',
          commune: 'Ngaliema',
          address: 'Avenue Colonel Mondjiba',
          viewsCount: 142,
          agentId: 'agent_kin_01',
          bedrooms: 4,
          bathrooms: 3,
          area: 450,
          description: 'Superbe propriété',
          labels: ['featured'],
          category: 'Résidentiel',
          zipCode: 'Kinshasa',
          country: 'RDC',
          lat: -4.325,
          lng: 15.322,
          amenities: ['Piscine', 'Groupe Électrogène'],
          images: [],
          customFields: {},
          featured: true,
          published: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setTestSentMsg('✓ Événement "view_item" (ViewContent) envoyé avec les variables e-commerce au DataLayer GTM !');
        break;
      case 'lead':
        trackLeadGenerated({
          id: `lead_${Date.now()}`,
          propertyId: 'prop_kin_001',
          propertyTitle: 'Villa Moderne Ngaliema',
          agentId: 'agent_kin_01',
          userName: 'Alain Kabasele',
          userEmail: 'alain.kabasele@gmail.com',
          userPhone: '+243 81 999 8877',
          message: 'Bonjour, je souhaite visiter cette villa samedi.',
          requestType: 'tour',
          status: 'new',
          createdAt: new Date().toISOString(),
        });
        setTestSentMsg('✓ Événement "generate_lead" (Lead / SubmitForm) envoyé au DataLayer GTM, Meta & TikTok !');
        break;
      case 'whatsapp':
        trackContactClick('whatsapp', {
          id: 'prop_kin_001',
          title: 'Villa Moderne Ngaliema',
          price: 650000,
          currency: 'USD',
          type: 'house',
          status: 'for-sale',
          city: 'Kinshasa',
          commune: 'Ngaliema',
          address: 'Avenue Colonel Mondjiba',
          viewsCount: 142,
          agentId: 'agent_kin_01',
          bedrooms: 4,
          bathrooms: 3,
          area: 450,
          description: '',
          labels: [],
          category: '',
          zipCode: '',
          country: '',
          lat: 0,
          lng: 0,
          amenities: [],
          images: [],
          customFields: {},
          featured: false,
          published: true,
          createdAt: '',
          updatedAt: '',
        });
        setTestSentMsg('✓ Événement "contact_agent" (WhatsApp Direct Click) transmis à GTM & Google Ads !');
        break;
      case 'agency':
        trackAgencyRegistration(
          {
            id: 'agency_kin_09',
            name: 'Agence Immobilière Prestige Gombe',
            address: 'Boulevard du 30 Juin',
            city: 'Kinshasa',
            commune: 'Gombe',
            phone: '+243 81 000 1122',
            email: 'contact@prestige-kin.cd',
            website: 'https://prestige-kin.cd',
            logo: '',
            agentsCount: 6,
            description: '',
            specialties: ['Luxe'],
            rccm: 'CD/KIN/RCCM/26-B-0912',
          },
          'Directeur Général'
        );
        setTestSentMsg('✓ Événement "agency_registration" (CompleteRegistration) transmis à GTM, Meta & TikTok !');
        break;
      case 'purchase':
        trackSubscriptionPayment({
          id: `inv_${Date.now()}`,
          invoiceNumber: 'KIN-2026-INV-99',
          targetType: 'agency',
          targetId: 'agency_kin_09',
          targetName: 'Agence Immobilière Prestige Gombe',
          targetEmail: 'contact@prestige-kin.cd',
          totalAmount: 150.0,
          subtotalAmount: 150.0,
          taxAmount: 0,
          currency: 'USD',
          status: 'paid',
          dueDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          paymentMethod: 'mpesa',
          items: [
            {
              id: 'plan_pro',
              description: 'Abonnement Mensuel Agence Immobilière Immocraft',
              amount: 150.0,
              quantity: 1,
            },
          ],
        });
        setTestSentMsg('✓ Événement e-commerce "purchase" (Achat / PlaceAnOrder) transmis au DataLayer GTM !');
        break;
    }
    setTimeout(() => setTestSentMsg(null), 4000);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterDestination === 'all') return true;
    return log.destinations.includes(filterDestination as any);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Gestionnaire de Balises & Pixels
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30">
                  GTM DATA LAYER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilotez Google Tag Manager, Google Analytics 4, Meta Pixel, TikTok Pixel et Google Ads depuis un point unique.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-slate-800 flex gap-2 bg-slate-950/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-3.5 border-b-2 text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'config'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Configuration des Identifiants</span>
          </button>

          <button
            onClick={() => setActiveTab('live_inspector')}
            className={`py-3 px-3.5 border-b-2 text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'live_inspector'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>DataLayer en Direct ({logs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`py-3 px-3.5 border-b-2 text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'simulator'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulateur & Tests d'Événements</span>
          </button>

          <button
            onClick={() => setActiveTab('gtm_guide')}
            className={`py-3 px-3.5 border-b-2 text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'gtm_guide'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Guide des Balises GTM</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Notifications */}
          {saveSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Vos configurations de balises et pixels ont été enregistrées avec succès et synchronisées !</span>
            </div>
          )}

          {testSentMsg && (
            <div className="p-3.5 rounded-2xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>{testSentMsg}</span>
            </div>
          )}

          {/* TAB 1: CONFIGURATION */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* Quick Status Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>GTM</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="text-xs font-black text-white truncate">{config.gtmContainerId || 'GTM-MBV5CSQR'}</div>
                  <div className="text-[10px] text-emerald-400">Conteneur Actif</div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>Google Analytics</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  </div>
                  <div className="text-xs font-black text-white truncate">{config.googleAnalyticsId || 'G-3FYYBC6QQG'}</div>
                  <div className="text-[10px] text-emerald-400">GA4 Connecté</div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>Meta Pixel</span>
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  </div>
                  <div className="text-xs font-black text-white truncate">{config.metaPixelId || '104829104829'}</div>
                  <div className="text-[10px] text-blue-400">FB / Instagram</div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>TikTok Pixel</span>
                    <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                  </div>
                  <div className="text-xs font-black text-white truncate">{config.tiktokPixelId || 'CKINSHASATT'}</div>
                  <div className="text-[10px] text-pink-400">TikTok Ads</div>
                </div>

                <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-1 col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>Google Ads</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  </div>
                  <div className="text-xs font-black text-white truncate">{config.googleAdsId || 'AW-1092849201'}</div>
                  <div className="text-[10px] text-amber-400">Conversions RDC</div>
                </div>
              </div>

              {/* Form Input Fields */}
              <div className="space-y-4">
                {/* GTM Container ID */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      <span>ID du Conteneur Google Tag Manager (GTM)</span>
                    </label>
                    <span className="text-[10px] text-emerald-400 font-bold">Hub Central Recommandé</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={config.gtmContainerId}
                    onChange={(e) => setConfig({ ...config, gtmContainerId: e.target.value.trim() })}
                    placeholder="ex: GTM-MBV5CSQR"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Insère automatiquement le conteneur officiel GTM. Toutes les balises (Meta, TikTok, Ads, GA4) peuvent être gérées depuis l'interface tagmanager.google.com.
                  </p>
                </div>

                {/* GA4 ID */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    <span>ID de Mesure Google Analytics 4 (Flux Web)</span>
                  </label>
                  <input
                    type="text"
                    value={config.googleAnalyticsId}
                    onChange={(e) => setConfig({ ...config, googleAnalyticsId: e.target.value.trim() })}
                    placeholder="ex: G-3FYYBC6QQG"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    Propriété GA4 pour l'analyse d'audience, les vues d'annonces et les recherches sur Kinshasa.
                  </p>
                </div>

                {/* Meta Pixel & TikTok Pixel */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span>Meta Pixel ID (Facebook / Instagram)</span>
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.isMetaPixelEnabled}
                          onChange={(e) => setConfig({ ...config, isMetaPixelEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-500"></div>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.metaPixelId}
                      onChange={(e) => setConfig({ ...config, metaPixelId: e.target.value.trim() })}
                      placeholder="ex: 123456789012345"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Pour le retargeting et le suivi des prospects immobiliers sur Facebook et Instagram.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-pink-400" />
                        <span>TikTok Pixel ID</span>
                      </label>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.isTiktokPixelEnabled}
                          onChange={(e) => setConfig({ ...config, isTiktokPixelEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-pink-500"></div>
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.tiktokPixelId}
                      onChange={(e) => setConfig({ ...config, tiktokPixelId: e.target.value.trim() })}
                      placeholder="ex: CXXXXXXXXXXXXXX"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-pink-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      Pour vos campagnes vidéo TikTok Ads sur le marché immobilier congolais.
                    </p>
                  </div>
                </div>

                {/* Google Ads */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Google Ads Conversion Tracking & Remarketing</span>
                    </label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.isGoogleAdsEnabled}
                        onChange={(e) => setConfig({ ...config, isGoogleAdsEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 mb-1">ID Google Ads (AW-XXX)</span>
                      <input
                        type="text"
                        value={config.googleAdsId}
                        onChange={(e) => setConfig({ ...config, googleAdsId: e.target.value.trim() })}
                        placeholder="ex: AW-1092849201"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 mb-1">Libellé de Conversion (Conversion Label)</span>
                      <input
                        type="text"
                        value={config.googleAdsConversionLabel}
                        onChange={(e) => setConfig({ ...config, googleAdsConversionLabel: e.target.value.trim() })}
                        placeholder="ex: AbCdEfGhIjK"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfig(DEFAULT_TRACKING_CONFIG);
                    saveStoredTrackingConfig(DEFAULT_TRACKING_CONFIG);
                    setStatus(checkAllTrackingStatus());
                    setSaveSuccessMsg(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                >
                  Restaurer les valeurs par défaut
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Enregistrer & Activer les Balises</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LIVE DATALAYER INSPECTOR */}
          {activeTab === 'live_inspector' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div>
                  <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Flux d'Événements DataLayer en Temps Réel</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tous les événements transmis à <code>window.dataLayer.push()</code> et routés vers GA4, Meta, TikTok et Google Ads.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filterDestination}
                    onChange={(e) => setFilterDestination(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="all">Toutes destinations ({logs.length})</option>
                    <option value="GTM">Google Tag Manager (GTM)</option>
                    <option value="GA4">Google Analytics 4 (GA4)</option>
                    <option value="Meta Pixel">Meta Pixel (Facebook)</option>
                    <option value="TikTok Pixel">TikTok Pixel</option>
                    <option value="Google Ads">Google Ads</option>
                  </select>

                  <button
                    onClick={clearAnalyticsLogs}
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 transition-all"
                    title="Vider le flux"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-dashed border-slate-800 text-slate-400 space-y-2">
                  <Layers className="w-8 h-8 mx-auto text-slate-600 opacity-50" />
                  <p className="text-xs">Aucun événement capturé pour l'instant dans ce filtre.</p>
                  <button
                    onClick={() => runTestEvent('pageview')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all"
                  >
                    <Play className="w-3 h-3" />
                    <span>Envoyer un événement de test</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl space-y-2 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                            {log.eventName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">{log.timestamp}</span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {log.destinations.map((dest) => (
                            <span
                              key={dest}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                dest === 'GTM'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : dest === 'GA4'
                                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                  : dest === 'Meta Pixel'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                  : dest === 'TikTok Pixel'
                                  ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {dest}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Payload Inspector JSON */}
                      <pre className="p-2.5 bg-slate-900 rounded-xl text-[10px] font-mono text-slate-300 overflow-x-auto border border-slate-800/80">
                        {JSON.stringify(log.params, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SIMULATOR & TEST BUTTONS */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Simulateur d'Événements Immobiliers & Conversions</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cliquez sur les boutons ci-dessous pour déclencher instantanément des événements DataLayer et vérifier leur arrivée dans Google Tag Assistant, Meta Events Manager et TikTok Pixel Helper.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">1. Consultation d'Annonce</span>
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">view_item</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Déclenche <code>view_item</code> (GTM/GA4) et <code>ViewContent</code> (Meta/TikTok) avec les prix en USD et la commune (ex: Ngaliema).
                    </p>
                  </div>
                  <button
                    onClick={() => runTestEvent('property')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tester "Vue d'Annonce"</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">2. Clic WhatsApp Agent</span>
                      <span className="text-[9px] bg-teal-500/20 text-teal-400 px-1.5 py-0.5 rounded font-bold">contact_agent</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Déclenche <code>contact_agent</code> et conversion Google Ads pour mesurer la génération de leads WhatsApp à Kinshasa.
                    </p>
                  </div>
                  <button
                    onClick={() => runTestEvent('whatsapp')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-teal-400" />
                    <span>Tester "Contact WhatsApp"</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">3. Demande de Visite / Lead</span>
                      <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">generate_lead</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Déclenche <code>generate_lead</code> (GA4), <code>Lead</code> (Meta), <code>SubmitForm</code> (TikTok) et conversion Ads.
                    </p>
                  </div>
                  <button
                    onClick={() => runTestEvent('lead')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tester "Lead Visite Formulaire"</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">4. Inscription Agence Immobilière</span>
                      <span className="text-[9px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded font-bold">agency_registration</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Déclenche <code>agency_registration</code> et <code>CompleteRegistration</code> lors de l'inscription d'un cabinet partenaire.
                    </p>
                  </div>
                  <button
                    onClick={() => runTestEvent('agency')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-pink-400" />
                    <span>Tester "Inscription Agence"</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5 flex flex-col justify-between sm:col-span-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">5. Paiement Facture / Abonnement (E-Commerce)</span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">purchase</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Déclenche <code>purchase</code> avec le panier d'abonnement (items, total USD 150$, transaction_id).
                    </p>
                  </div>
                  <button
                    onClick={() => runTestEvent('purchase')}
                    className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tester "Achat / Paiement Purchase"</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GTM CONFIGURATION GUIDE & CODE SNIPPET */}
          {activeTab === 'gtm_guide' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-emerald-400" />
                  <span>Guide de Paramétrage des Balises dans Google Tag Manager</span>
                </h3>
                <p className="text-slate-400 text-[11px]">
                  Voici la liste des variables de couche de données (DataLayer) et des déclencheurs prêts à l'emploi à créer dans votre conteneur GTM :
                </p>
              </div>

              {/* Variables List */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs">1. Variables de couche de données (DataLayer Variables) à créer :</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-emerald-400">item_name</span>
                    <span className="text-slate-500">Titre de l'annonce</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-emerald-400">price</span>
                    <span className="text-slate-500">Prix du bien</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-emerald-400">commune</span>
                    <span className="text-slate-500">Commune Kinshasa</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-emerald-400">contact_method</span>
                    <span className="text-slate-500">whatsapp / call</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-emerald-400">agency_name</span>
                    <span className="text-slate-500">Nom agence RDC</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center">
                    <span className="text-emerald-400">value</span>
                    <span className="text-slate-500">Valeur conversion</span>
                  </div>
                </div>
              </div>

              {/* Triggers List */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="font-bold text-white text-xs">2. Déclencheurs d'événement personnalisé (Custom Events) :</h4>
                <div className="space-y-1.5 text-[11px]">
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span>• <strong>view_item</strong> : Déclencheur pour balise Meta ViewContent & TikTok ViewContent</span>
                    <span className="font-mono text-emerald-400">Event = view_item</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span>• <strong>contact_agent</strong> : Déclencheur pour conversion WhatsApp Google Ads & Lead Meta</span>
                    <span className="font-mono text-emerald-400">Event = contact_agent</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span>• <strong>generate_lead</strong> : Déclencheur pour formulaire de contact ou visite</span>
                    <span className="font-mono text-emerald-400">Event = generate_lead</span>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                    <span>• <strong>agency_registration</strong> : Déclencheur pour nouvelle agence inscrite</span>
                    <span className="font-mono text-emerald-400">Event = agency_registration</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">DataLayer conforme RGPD & Standards Google Tag Manager 2026</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all ml-auto"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
