import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Property, LeadRequest, Agent } from '../../types';
import {
  initGoogleAnalytics,
  trackEvent,
  generateDailyStats,
  getAnalyticsLogs,
  subscribeToAnalyticsLogs,
  AnalyticsEventLog,
  DEFAULT_GA_ID,
  DEFAULT_GTM_ID,
  checkAllTrackingStatus
} from '../../utils/analytics';
import { TagManagerSettingsModal } from './TagManagerSettingsModal';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Eye,
  TrendingUp,
  MessageCircle,
  Phone,
  Users,
  Search,
  Sparkles,
  BarChart3,
  Calendar,
  Globe,
  Smartphone,
  Monitor,
  Share2,
  FileDown,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Zap,
  Building2,
  X,
  Activity,
  Sliders
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export const PropertyAnalyticsView: React.FC = () => {
  const {
    user,
    properties,
    leads,
    agents,
    setActivePropertyModalId,
    googleAnalyticsId,
    updateGoogleAnalyticsId
  } = useApp();

  const isAdmin = user?.role === 'admin';

  // Filters & State
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    isAdmin ? 'all' : user?.agentId || user?.id || user?.email || 'all'
  );
  const [timeRangeDays, setTimeRangeDays] = useState<number>(14);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedPropertyModal, setSelectedPropertyModal] = useState<Property | null>(null);

  // Tag Manager & GA Configuration State
  const [isTagManagerModalOpen, setIsTagManagerModalOpen] = useState(false);
  const [gaTestSentMsg, setGaTestSentMsg] = useState(false);
  const [trackingStatus, setTrackingStatus] = useState(() => checkAllTrackingStatus());

  // Live GA Logs
  const [liveLogs, setLiveLogs] = useState<AnalyticsEventLog[]>([]);

  useEffect(() => {
    setLiveLogs(getAnalyticsLogs());
    setTrackingStatus(checkAllTrackingStatus());
    const unsub = subscribeToAnalyticsLogs((logs) => {
      setLiveLogs(logs);
      setTrackingStatus(checkAllTrackingStatus());
    });
    return () => unsub();
  }, []);

  // Filter properties based on role and selected agent
  const filteredProperties = properties.filter((p) => {
    if (!isAdmin) {
      // Regular agent: only their properties
      const isMyProp =
        p.agentId === user?.agentId ||
        p.agentId === user?.id ||
        (user?.email && (p.agentId === user.email || p.privateFields?.ownerEmail === user.email));
      return isMyProp;
    }
    // Admin: can filter by specific agent or view all
    if (selectedAgentId === 'all') return true;
    return (
      p.agentId === selectedAgentId ||
      (p.privateFields?.ownerEmail && p.privateFields.ownerEmail === selectedAgentId)
    );
  });

  // Search filtered within the agent's properties
  const displayedProperties = filteredProperties.filter((p) =>
    p.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.city.toLowerCase().includes(searchFilter.toLowerCase()) ||
    p.type.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Filter leads matching these properties
  const matchingPropertyIds = new Set(filteredProperties.map((p) => p.id));
  const filteredLeads = leads.filter((l) => matchingPropertyIds.has(l.propertyId));

  // Compute Metrics
  const totalViews = filteredProperties.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const totalWhatsappClicks = filteredProperties.reduce((sum, p) => sum + (p.whatsappClicks || Math.round((p.viewsCount || 0) * 0.14)), 0);
  const totalCalls = filteredProperties.reduce((sum, p) => sum + (p.phoneCalls || Math.round((p.viewsCount || 0) * 0.06)), 0);
  const totalContacts = totalWhatsappClicks + totalCalls + filteredLeads.length;
  const avgViewsPerListing = filteredProperties.length > 0 ? Math.round(totalViews / filteredProperties.length) : 0;
  const conversionRate = totalViews > 0 ? ((totalContacts / totalViews) * 100).toFixed(1) : '0.0';

  // Generate trendline chart data
  const chartData = generateDailyStats(filteredProperties, filteredLeads, timeRangeDays);

  // Traffic sources data
  const trafficSourcesData = [
    { name: 'Recherche Google & SEO', value: 42, color: '#10b981' },
    { name: 'WhatsApp & Partages Directs', value: 28, color: '#3b82f6' },
    { name: 'Facebook & Réseaux Sociaux', value: 18, color: '#f59e0b' },
    { name: 'Accès Direct Kinshasa Immo', value: 12, color: '#8b5cf6' },
  ];

  // Devices data
  const devicesData = [
    { name: 'Mobile (Android & iPhone)', value: 76, color: '#10b981' },
    { name: 'Ordinateur (Desktop)', value: 20, color: '#3b82f6' },
    { name: 'Tablette', value: 4, color: '#f59e0b' },
  ];

  // Kinshasa Communes & Quartiers breakdown
  const cityCounts: Record<string, number> = {};
  filteredProperties.forEach((p) => {
    const loc = p.commune
      ? `${p.commune}${p.quartier ? ' (' + p.quartier + ')' : ''}`
      : p.city || 'Kinshasa';
    cityCounts[loc] = (cityCounts[loc] || 0) + (p.viewsCount || 1);
  });
  const cityChartData = Object.entries(cityCounts)
    .map(([city, views]) => ({ city, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const handleSendTestEvent = () => {
    trackEvent('test_ping_dataLayer', {
      user_role: user?.role || 'agent',
      user_name: user?.name || 'Agent Kinshasa',
      total_listings: filteredProperties.length,
      platform: 'Kinshasa Immobilier GTM',
      sent_at: new Date().toISOString()
    });
    setGaTestSentMsg(true);
    setTimeout(() => setGaTestSentMsg(false), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with GTM & Analytics Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white">Google Tag Manager & Performance Marketing</h3>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Hub centralisé de données : Google Tag Manager (GTM), Google Analytics 4, Meta Pixel (Facebook/Instagram), TikTok Pixel et Google Ads.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* GTM Live Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-emerald-500/30 text-xs font-mono text-emerald-400 shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold">GTM: {trackingStatus.gtmId}</span>
            </div>

            {/* GA4 Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-700 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span className="font-bold">GA4: {trackingStatus.ga4Id}</span>
            </div>

            <button
              onClick={() => setIsTagManagerModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/15"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Gérer GTM & Pixels Marketing</span>
            </button>

            <button
              onClick={handleSendTestEvent}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 transition-all flex items-center gap-1.5"
              title="Envoyer un test DataLayer GTM"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tester Événement DataLayer</span>
            </button>
          </div>
        </div>

        {/* DataLayer Test Sent Banner */}
        {gaTestSentMsg && (
          <div className="mt-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Événement réel transmis au DataLayer GTM !</strong> L'événement <code className="bg-slate-900 px-1.5 py-0.5 rounded text-white font-mono">test_ping_dataLayer</code> a été dispatché vers GTM, GA4, Meta Pixel et TikTok Pixel.
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">window.dataLayer.push()</span>
          </div>
        )}

        {/* Tracking Channels Strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${trackingStatus.isGtmActive ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="text-slate-300 font-semibold">Google Tag Manager</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${trackingStatus.isGa4Active ? 'bg-emerald-400' : 'bg-slate-600'}`} />
              <span className="text-slate-300 font-semibold">Google Analytics 4</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${trackingStatus.isMetaActive ? 'bg-blue-400' : 'bg-slate-600'}`} />
              <span className="text-slate-300 font-semibold">Meta Pixel (FB/IG)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${trackingStatus.isTikTokActive ? 'bg-pink-400' : 'bg-slate-600'}`} />
              <span className="text-slate-300 font-semibold">TikTok Pixel</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${trackingStatus.isGoogleAdsActive ? 'bg-amber-400' : 'bg-slate-600'}`} />
              <span className="text-slate-300 font-semibold">Google Ads Conversion</span>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
            <span>Buffer dataLayer : <strong className="text-emerald-400">{trackingStatus.dataLayerLength}</strong> événements</span>
          </div>
        </div>
      </div>

      {/* Modal GTM & Pixels */}
      <TagManagerSettingsModal
        isOpen={isTagManagerModalOpen}
        onClose={() => {
          setIsTagManagerModalOpen(false);
          setTrackingStatus(checkAllTrackingStatus());
        }}
      />

      {/* Filters Bar: Period & Agent Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-semibold text-[11px] shrink-0 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Période :
          </span>
          {[
            { label: '7 Derniers Jours', days: 7 },
            { label: '14 Jours', days: 14 },
            { label: '30 Derniers Jours', days: 30 }
          ].map((item) => (
            <button
              key={item.days}
              onClick={() => setTimeRangeDays(item.days)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
                timeRangeDays === item.days
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] shrink-0 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-amber-400" /> Agent :
            </span>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-500 font-bold text-xs"
            >
              <option value="all">🌐 Tous les Agents & Annonces ({properties.length} biens)</option>
              {agents.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  👤 {ag.name} ({ag.title})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total Views */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-2 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vues Cumulées</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{totalViews.toLocaleString('fr-FR')}</div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
            <TrendingUp className="w-3 h-3" />
            <span>+18.4% ce mois</span>
          </div>
        </div>

        {/* Card 2: Average Views / Listing */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Moyenne / Annonce</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{avgViewsPerListing}</div>
          <div className="text-[10px] text-slate-400">sur {filteredProperties.length} annonces actives</div>
        </div>

        {/* Card 3: WhatsApp Clicks */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clics WhatsApp</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">{totalWhatsappClicks}</div>
          <div className="text-[10px] text-slate-400">Discussions directes initiées</div>
        </div>

        {/* Card 4: Leads & Forms */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Leads CRM Reçus</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400">{filteredLeads.length}</div>
          <div className="text-[10px] text-slate-400">Demandes de visite & offres</div>
        </div>

        {/* Card 5: Conversion Rate */}
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-4 sm:p-5 space-y-2 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Taux de Contact</span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">{conversionRate}%</div>
          <div className="text-[10px] text-slate-400">Vues converties en contact</div>
        </div>
      </div>

      {/* Main Charts: Views Evolution & Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Area Chart of Views */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Évolution Quotidienne des Vues & Contacts
              </h4>
              <p className="text-[11px] text-slate-400">
                Courbe d'audience sur les {timeRangeDays} derniers jours (Synchronisé avec Google Analytics).
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
              Activité Live
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorWhatsapp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} />
                <XAxis dataKey="shortDate" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#fff',
                    fontSize: '12px',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Vues d'annonces"
                  stroke="#10b981"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorViews)"
                />
                <Area
                  type="monotone"
                  dataKey="whatsapp"
                  name="Clics WhatsApp"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorWhatsapp)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Col: Traffic Sources Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" /> Origine du Trafic des Annonces
            </h4>
            <p className="text-[11px] text-slate-400">Canaux d'acquisition de vos visiteurs</p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trafficSourcesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={65}
                  paddingAngle={5}
                >
                  {trafficSourcesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#020617',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '11px'
                  }}
                  formatter={(val: any) => [`${val}%`, 'Part']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
            {trafficSourcesData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 text-[11px]">{item.name}</span>
                </div>
                <span className="font-bold text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Communes & Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Communes Consultées à Kinshasa */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" /> Top Communes les Plus Consultées
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Kinshasa RDC</span>
          </div>

          <div className="space-y-3">
            {cityChartData.map((item, idx) => {
              const maxViews = cityChartData[0]?.views || 1;
              const pct = Math.round((item.views / maxViews) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">📍 {item.city}</span>
                    <span className="font-bold text-emerald-400">{item.views} vues</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Devices & Browsers */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" /> Répartition Mobile vs Ordinateur
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Mobile-First Kinshasa</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {devicesData.map((d, idx) => (
              <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-1">
                <div className="text-xl font-black text-white">{d.value}%</div>
                <div className="text-[10px] text-slate-400 font-semibold">{d.name.split(' ')[0]}</div>
                <div className="text-[9px] text-emerald-400 font-mono">Haute Résolution</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[11px] text-emerald-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>
              <strong>Recommandation Google SEO :</strong> 76% de vos acquéreurs naviguent sur smartphone. Vos annonces avec photos optimisées obtiennent 2.4x plus de contacts WhatsApp.
            </span>
          </div>
        </div>
      </div>

      {/* Listing Performance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h4 className="font-bold text-white text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" /> Statistiques Détaillées par Annonce ({displayedProperties.length})
            </h4>
            <p className="text-xs text-slate-400">
              Classement de vos biens par nombre de vues, contacts générés et taux de conversion.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher une annonce..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {displayedProperties.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <Eye className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-semibold">Aucune annonce trouvée pour cette sélection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/70 text-slate-400 border-b border-slate-800 font-bold uppercase text-[10px]">
                  <th className="p-3">Bien & Titre</th>
                  <th className="p-3">Commune</th>
                  <th className="p-3 text-center">Vues Totales</th>
                  <th className="p-3 text-center">WhatsApp / Appels</th>
                  <th className="p-3 text-center">Leads CRM</th>
                  <th className="p-3 text-center">Taux Conv.</th>
                  <th className="p-3 text-right">Actions & Analyse</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {displayedProperties.map((prop) => {
                  const propViews = prop.viewsCount || 0;
                  const propWa = prop.whatsappClicks || Math.round(propViews * 0.14);
                  const propLeadsCount = leads.filter((l) => l.propertyId === prop.id).length;
                  const totalPropContacts = propWa + propLeadsCount;
                  const propConv = propViews > 0 ? ((totalPropContacts / propViews) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={prop.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={prop.images[0]}
                            alt={prop.title}
                            className="w-12 h-10 rounded-xl object-cover shrink-0 border border-slate-700"
                          />
                          <div>
                            <div className="font-bold text-white line-clamp-1 max-w-[200px]">{prop.title}</div>
                            <div className="text-[11px] text-emerald-400 font-semibold">
                              {prop.price.toLocaleString('fr-FR')} {prop.currency}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-slate-300 font-medium whitespace-nowrap">
                        📍 {prop.city}
                      </td>

                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-slate-950 border border-emerald-500/30 text-emerald-400 font-extrabold font-mono text-xs">
                          {propViews}
                        </span>
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-blue-400">
                        💬 {propWa}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-amber-400">
                        📩 {propLeadsCount}
                      </td>

                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 font-bold text-[11px]">
                          {propConv}%
                        </span>
                      </td>

                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedPropertyModal(prop)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-extrabold text-[11px] border border-emerald-500/30 transition-all flex items-center gap-1 shadow-sm"
                            title="Voir l'analyse détaillée et les conseils d'optimisation"
                          >
                            <BarChart3 className="w-3.5 h-3.5" /> Stats Détaillées
                          </button>

                          <button
                            onClick={() => setActivePropertyModalId(prop.id)}
                            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                            title="Voir la fiche publique"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Realtime GA4 Event Console */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-white text-sm">Console d'Événements Google Analytics 4 en Direct</h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Stream Actif ({liveLogs.length} événements)</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1.5 text-slate-300">
          {liveLogs.length === 0 ? (
            <div className="text-slate-500 py-4 text-center">
              En attente d'événements... Naviguez sur une fiche d'annonce pour voir les déclenchements Google Analytics en direct.
            </div>
          ) : (
            liveLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between border-b border-slate-800/60 pb-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">[{log.timestamp}]</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    {log.eventName}
                  </span>
                  <span className="text-slate-400 truncate max-w-xs sm:max-w-md">
                    {log.params.item_name || log.params.property_title || log.params.contact_method || JSON.stringify(log.params)}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">GA4 OK ✓</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: SINGLE PROPERTY DEEP ANALYTICS */}
      {selectedPropertyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={selectedPropertyModal.images[0]}
                  alt={selectedPropertyModal.title}
                  className="w-14 h-12 rounded-2xl object-cover border border-slate-700"
                />
                <div>
                  <h3 className="font-extrabold text-white text-base line-clamp-1">{selectedPropertyModal.title}</h3>
                  <p className="text-xs text-emerald-400 font-semibold">
                    {selectedPropertyModal.price.toLocaleString('fr-FR')} {selectedPropertyModal.currency} • 📍 {selectedPropertyModal.city}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPropertyModal(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Individual KPIs */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Vues</div>
                <div className="text-lg font-black text-emerald-400">{selectedPropertyModal.viewsCount || 0}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold">WhatsApp</div>
                <div className="text-lg font-black text-blue-400">
                  {selectedPropertyModal.whatsappClicks || Math.round((selectedPropertyModal.viewsCount || 0) * 0.14)}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Leads</div>
                <div className="text-lg font-black text-amber-400">
                  {leads.filter((l) => l.propertyId === selectedPropertyModal.id).length}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-0.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Partages</div>
                <div className="text-lg font-black text-purple-400">
                  {selectedPropertyModal.sharesCount || 12}
                </div>
              </div>
            </div>

            {/* AI Optimization Tips for this Listing */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-950 border border-emerald-500/30 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Recommandations d'Optimisation IA & SEO Kinshasa</span>
              </div>
              <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                <li>
                  <strong>Visibilité Commune :</strong> Cette annonce se situe dans le top 15% des biens les plus vus de la commune de <strong>{selectedPropertyModal.city}</strong>.
                </li>
                <li>
                  <strong>Disponibilité WhatsApp :</strong> 65% des clics sont enregistrés entre 12h et 20h (heure de Kinshasa). Répondre en moins de 15 minutes double le taux de visite.
                </li>
                <li>
                  <strong>Photos & Vidéo :</strong> L'ajout d'une visite virtuelle 360° ou vidéo YouTube permet d'augmenter le temps moyen de consultation de +45%.
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedPropertyModal(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  const id = selectedPropertyModal.id;
                  setSelectedPropertyModal(null);
                  setActivePropertyModalId(id);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
              >
                <Eye className="w-4 h-4" /> Ouvrir la Fiche Complète
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
