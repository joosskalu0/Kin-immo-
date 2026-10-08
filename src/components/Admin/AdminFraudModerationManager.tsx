import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Phone,
  Image,
  TrendingDown,
  Copy,
  UserX,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  DollarSign,
  MapPin,
  Sparkles,
  ArrowRight,
  Shield,
  HelpCircle
} from 'lucide-react';
import { Property, FraudVerdict, FraudAnalysisResult, PropertyUserReport } from '../../types';
import {
  analyzePropertyForFraud,
  auditPropertyList,
  KINSHASA_PRICE_BENCHMARKS
} from '../../utils/suspiciousListingDetector';

interface AdminFraudModerationManagerProps {
  properties: Property[];
  onUpdateProperty: (property: Property) => Promise<void> | void;
  onDeleteProperty: (id: string) => Promise<void> | void;
  reports?: PropertyUserReport[];
  onResolveReport?: (reportId: string, action: 'resolved' | 'dismissed') => void;
}

export const AdminFraudModerationManager: React.FC<AdminFraudModerationManagerProps> = ({
  properties,
  onUpdateProperty,
  onDeleteProperty,
  reports = [],
  onResolveReport
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'suspect' | 'review' | 'normal' | 'reported'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<FraudAnalysisResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [moderatorNote, setModeratorNote] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Exécution de l'analyse sur toutes les annonces
  const auditData = useMemo(() => {
    return auditPropertyList(properties, reports);
  }, [properties, reports]);

  const showSuccess = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Filtrage des annonces
  const filteredList = useMemo(() => {
    return auditData.auditedProperties.filter(item => {
      const matchSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.commune?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.contactPhone && item.contactPhone.includes(searchQuery)) ||
        (item.agentId && item.agentId.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (filterTab === 'suspect') return item.fraudStatus === 'suspect';
      if (filterTab === 'review') return item.fraudStatus === 'review_required';
      if (filterTab === 'normal') return item.fraudStatus === 'normal';
      if (filterTab === 'reported') {
        const itemReports = reports.filter(r => r.propertyId === item.id);
        return itemReports.length > 0;
      }

      return true;
    });
  }, [auditData, filterTab, searchQuery, reports]);

  // Lancer un audit global avec animation
  const handleTriggerAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      setIsAuditing(false);
      showSuccess(`Audit anti-fraude achevé : ${auditData.total} annonces scannées (${auditData.normalCount} normales, ${auditData.reviewRequiredCount} à vérifier, ${auditData.suspectCount} suspectes).`);
    }, 900);
  };

  // Inspecter une annonce
  const handleInspect = (property: Property) => {
    const analysis = analyzePropertyForFraud(property, properties, reports);
    setSelectedProperty(property);
    setSelectedAnalysis(analysis);
    setModeratorNote(property.moderationNotes || '');
  };

  // Changer le statut de modération
  const handleSetModerationStatus = async (newVerdict: FraudVerdict) => {
    if (!selectedProperty) return;

    const updatedProp: Property = {
      ...selectedProperty,
      fraudStatus: newVerdict,
      published: newVerdict === 'normal',
      moderationNotes: moderatorNote,
      fraudLastCheckedAt: new Date().toISOString()
    };

    try {
      await onUpdateProperty(updatedProp);
      setSelectedProperty(updatedProp);
      if (selectedAnalysis) {
        setSelectedAnalysis({
          ...selectedAnalysis,
          verdict: newVerdict
        });
      }

      const labels = {
        normal: '🟢 Annonce approuvée et publiée en ligne !',
        review_required: '🟠 Annonce placée en contrôle manuel approfondi.',
        suspect: '🔴 Annonce bloquée temporairement pour suspicion de fraude.'
      };
      showSuccess(labels[newVerdict]);
    } catch (err: any) {
      console.error('Erreur mise à jour modération:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              Bouclier Anti-Fraude Immocraft Kinshasa
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              Détection des Annonces Suspectes
            </h2>
            <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
              Algorithme intelligent analysant en temps réel 6 critères de risque majeurs : 
              <strong className="text-white"> numéros abusifs</strong>, 
              <strong className="text-white"> photos dupliquées</strong>, 
              <strong className="text-white"> prix anormalement bas</strong>, 
              <strong className="text-white"> annonces identiques</strong>, 
              <strong className="text-white"> comportement inhabituel</strong> et 
              <strong className="text-white"> vendeurs signalés</strong>.
            </p>
          </div>

          <button
            onClick={handleTriggerAudit}
            disabled={isAuditing}
            className="self-start lg:self-auto inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/50 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            {isAuditing ? 'Audit en cours...' : 'Relancer l\'Audit Global'}
          </button>
        </div>

        {actionSuccessMessage && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-sm flex items-center gap-3 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Cards: The 3 verdict states */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Normal (Vert) */}
        <div
          onClick={() => setFilterTab('normal')}
          className={`cursor-pointer bg-slate-900/90 border rounded-2xl p-5 transition-all hover:translate-y-[-2px] ${
            filterTab === 'normal'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20'
              : 'border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              🟢 Normales
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{auditData.normalCount}</span>
            <span className="text-xs text-emerald-400 font-semibold">Publiées en ligne</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Score &lt; 30 pts. Conformité vérifiée sans risque d'arnaque.
          </p>
        </div>

        {/* 2. À vérifier (Orange) */}
        <div
          onClick={() => setFilterTab('review')}
          className={`cursor-pointer bg-slate-900/90 border rounded-2xl p-5 transition-all hover:translate-y-[-2px] ${
            filterTab === 'review'
              ? 'border-amber-500 ring-2 ring-amber-500/20'
              : 'border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              🟠 À Vérifier
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{auditData.reviewRequiredCount}</span>
            <span className="text-xs text-amber-400 font-semibold">Contrôle manuel requis</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Score 30-69 pts. Anomalies détectées nécessitant un œil humain.
          </p>
        </div>

        {/* 3. Suspect (Rouge) */}
        <div
          onClick={() => setFilterTab('suspect')}
          className={`cursor-pointer bg-slate-900/90 border rounded-2xl p-5 transition-all hover:translate-y-[-2px] ${
            filterTab === 'suspect'
              ? 'border-red-500 ring-2 ring-red-500/20'
              : 'border-slate-800 hover:border-red-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              🔴 Suspectes
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{auditData.suspectCount}</span>
            <span className="text-xs text-red-400 font-semibold">Blocage temporaire</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Score &ge; 70 pts. Risque critique : mise en quarantaine immédiate.
          </p>
        </div>

        {/* 4. Signalements */}
        <div
          onClick={() => setFilterTab('reported')}
          className={`cursor-pointer bg-slate-900/90 border rounded-2xl p-5 transition-all hover:translate-y-[-2px] ${
            filterTab === 'reported'
              ? 'border-purple-500 ring-2 ring-purple-500/20'
              : 'border-slate-800 hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ⚠️ Signalements
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{reports.length}</span>
            <span className="text-xs text-purple-400 font-semibold">Plaintes acheteurs</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Alertes citoyennes transmises par les utilisateurs du portail.
          </p>
        </div>
      </div>

      {/* Explication synthétique des 6 critères */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-400" />
          Les 6 règles de détection programmées dans l'algorithme :
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
              <Phone className="w-3.5 h-3.5" />
              1. Même numéro
            </div>
            <p className="text-slate-400 text-[11px]">Détecte le même téléphone disséminé sur une multitude d'annonces.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1">
              <Image className="w-3.5 h-3.5" />
              2. Mêmes photos
            </div>
            <p className="text-slate-400 text-[11px]">Détecte les visuels volés ou réutilisés sur d'autres biens et comptes.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
              <TrendingDown className="w-3.5 h-3.5" />
              3. Prix dérisoire
            </div>
            <p className="text-slate-400 text-[11px]">Compare avec la médiane de la commune (ex: villa Gombe à 150$/m).</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
              <Copy className="w-3.5 h-3.5" />
              4. Doublon exact
            </div>
            <p className="text-slate-400 text-[11px]">Similarité textuelle &gt; 80% repérant les robots spams et clones.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              5. Mots suspects
            </div>
            <p className="text-slate-400 text-[11px]">Repère « acompte avant visite », « western union », arnaques de mandat.</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-1.5 text-purple-400 font-bold mb-1">
              <UserX className="w-3.5 h-3.5" />
              6. Signalements
            </div>
            <p className="text-slate-400 text-[11px]">Historique cumulatif des plaintes acheteurs contre un même vendeur.</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterTab === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Toutes ({auditData.total})
          </button>
          <button
            onClick={() => setFilterTab('suspect')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterTab === 'suspect'
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'text-red-400/80 hover:text-red-300 hover:bg-red-500/10'
            }`}
          >
            🔴 Suspectes ({auditData.suspectCount})
          </button>
          <button
            onClick={() => setFilterTab('review')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterTab === 'review'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            🟠 À vérifier ({auditData.reviewRequiredCount})
          </button>
          <button
            onClick={() => setFilterTab('normal')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterTab === 'normal'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10'
            }`}
          >
            🟢 Normales ({auditData.normalCount})
          </button>
          <button
            onClick={() => setFilterTab('reported')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              filterTab === 'reported'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                : 'text-purple-400/80 hover:text-purple-300 hover:bg-purple-500/10'
            }`}
          >
            ⚠️ Signalées ({reports.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par titre, commune, tél..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
              <tr>
                <th className="py-4 px-4">Bien Immobilier</th>
                <th className="py-4 px-4">Prix & Commune</th>
                <th className="py-4 px-4">Numéro / Vendeur</th>
                <th className="py-4 px-4">Verdict & Score</th>
                <th className="py-4 px-4">Anomalies Détectées</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    Aucune annonce ne correspond aux filtres anti-fraude sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const analysis = item.fraudAnalysis;
                  const verdict = analysis.verdict;
                  const isBlocked = verdict === 'suspect' || item.published === false;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* 1. Titre & Image */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={item.images?.[0] || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300'}
                            alt={item.title}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                          />
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              ID: {item.id} • {item.type}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Prix & Commune */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-emerald-400">
                          {Number(item.price).toLocaleString()} {item.currency || 'USD'}
                          {item.period === 'month' ? '/mois' : ''}
                        </div>
                        <div className="text-slate-400 flex items-center gap-1 text-[11px]">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {item.commune || 'Kinshasa'}
                        </div>
                      </td>

                      {/* 3. Téléphone & Vendeur */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-white font-medium flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {item.contactPhone || item.privateFields?.ownerPhone || 'Non spécifié'}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Agent : {item.agentId || 'N/A'}
                        </div>
                      </td>

                      {/* 4. Verdict & Score */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1.5">
                          {verdict === 'normal' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                              🟢 Normal (Publiée)
                            </span>
                          )}
                          {verdict === 'review_required' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
                              🟠 À vérifier (Contrôle)
                            </span>
                          )}
                          {verdict === 'suspect' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 font-bold text-[11px]">
                              🔴 Suspect (Bloquée)
                            </span>
                          )}

                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  analysis.riskScore >= 70
                                    ? 'bg-red-500'
                                    : analysis.riskScore >= 30
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${analysis.riskScore}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {analysis.riskScore}/100
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5. Drapeaux & Anomalies */}
                      <td className="py-3.5 px-4">
                        {analysis.flags.length === 0 ? (
                          <span className="text-slate-500 text-[11px]">Aucun signal suspect</span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {analysis.flags.map((flag, idx) => {
                              const colorClass =
                                flag.severity === 'critical'
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : flag.severity === 'high'
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-slate-800 text-slate-300 border-slate-700';

                              return (
                                <span
                                  key={idx}
                                  title={flag.details}
                                  className={`px-2 py-0.5 rounded-md border text-[10px] font-medium truncate max-w-[260px] ${colorClass}`}
                                >
                                  {flag.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* 6. Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleInspect(item)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors border border-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            Inspecter
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

      {/* MODAL D'INSPECTION APPROFONDIE & DÉCISION DE MODÉRATION */}
      {selectedProperty && selectedAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Header modal */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    selectedAnalysis.verdict === 'suspect'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : selectedAnalysis.verdict === 'review_required'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    Dossier Anti-Fraude : {selectedProperty.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    ID: {selectedProperty.id} • Commune : {selectedProperty.commune || 'Kinshasa'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProperty(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Corps Modal scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Verdict Banner */}
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  selectedAnalysis.verdict === 'suspect'
                    ? 'bg-red-950/40 border-red-500/40 text-red-200'
                    : selectedAnalysis.verdict === 'review_required'
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <div className="p-2 rounded-xl bg-black/30 shrink-0">
                  {selectedAnalysis.verdict === 'suspect' && <AlertOctagon className="w-5 h-5 text-red-400" />}
                  {selectedAnalysis.verdict === 'review_required' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
                  {selectedAnalysis.verdict === 'normal' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="space-y-1">
                  <div className="font-black text-sm uppercase tracking-wide">
                    Verdict : {selectedAnalysis.verdict === 'suspect' ? '🔴 Suspect (Blocage Temporaire)' : selectedAnalysis.verdict === 'review_required' ? '🟠 À Vérifier (Contrôle Manuel)' : '🟢 Normal (Publication Directe)'}
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {selectedAnalysis.recommendation}
                  </p>
                  <div className="pt-1 text-[11px] font-mono text-slate-400">
                    Score de risque calculé : <strong className="text-white">{selectedAnalysis.riskScore}/100</strong> • Scanné le : {new Date(selectedAnalysis.analyzedAt).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Les 6 Piliers d'Analyse Anti-Fraude */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Rapport Détaillé des 6 Critères d'Investigation :
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Critère 1 : Téléphone */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-emerald-400" />
                        1. Même numéro utilisé
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedAnalysis.checks.samePhoneCount >= 4 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {selectedAnalysis.checks.samePhoneCount} autre(s) annonce(s)
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Numéro de contact analysé : <strong className="text-white">{selectedProperty.contactPhone || selectedProperty.privateFields?.ownerPhone || 'Non renseigné'}</strong>.
                      {selectedAnalysis.checks.samePhoneCount >= 4
                        ? ' Alerte : Présence anormale du même numéro sur plusieurs annonces (risque de multi-comptes ou de courtier pirate).'
                        : ' Volume de publication normal pour ce numéro.'}
                    </p>
                  </div>

                  {/* Critère 2 : Photos */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Image className="w-4 h-4 text-blue-400" />
                        2. Mêmes photos dupliquées
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedAnalysis.checks.duplicatePhotosFound ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {selectedAnalysis.checks.duplicatePhotosFound ? 'Doublons détectés' : 'Photos uniques'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {selectedAnalysis.checks.duplicatePhotosFound
                        ? `Attention : ${selectedAnalysis.checks.duplicatePhotoUrls.length} image(s) ont déjà été utilisées dans d'autres biens du catalogue.`
                        : 'Aucune duplication visuelle repérée. Les images sont authentiques et spécifiques à ce bien.'}
                    </p>
                  </div>

                  {/* Critère 3 : Prix */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <TrendingDown className="w-4 h-4 text-amber-400" />
                        3. Prix anormalement bas
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedAnalysis.checks.priceAnomalyRatio !== undefined ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {selectedAnalysis.checks.priceAnomalyRatio !== undefined ? 'Anomalie tarifaire' : 'Prix conforme'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Prix affiché : <strong className="text-white">{Number(selectedProperty.price).toLocaleString()} {selectedProperty.currency}</strong> ({selectedProperty.period || 'total'}) à {selectedProperty.commune || 'Kinshasa'}.
                      {selectedAnalysis.checks.benchmarkPrice && (
                        <span className="block mt-1 text-slate-400">
                          Seuil plancher de référence pour cette commune : <strong className="text-amber-300">{selectedAnalysis.checks.benchmarkPrice.toLocaleString()}$</strong>.
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Critère 4 : Annonces identiques */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Copy className="w-4 h-4 text-cyan-400" />
                        4. Doublon d'annonce
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        (selectedAnalysis.checks.similarityScore || 0) >= 0.8 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        Similarité : {Math.round((selectedAnalysis.checks.similarityScore || 0) * 100)}%
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {selectedAnalysis.checks.identicalListingTitle ? (
                        <span>
                          Forte ressemblance avec : <strong className="text-white">"{selectedAnalysis.checks.identicalListingTitle}"</strong>.
                        </span>
                      ) : (
                        'Annonce originale. Aucun clone ou doublon massif repéré.'
                      )}
                    </p>
                  </div>

                  {/* Critère 5 : Comportement inhabituel */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-400" />
                        5. Comportement inhabituel
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedAnalysis.checks.unusualKeywordsFound.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {selectedAnalysis.checks.unusualKeywordsFound.length > 0 ? 'Mots suspects' : 'Régulier'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {selectedAnalysis.checks.unusualKeywordsFound.length > 0 ? (
                        <span>
                          Termes d'escroquerie repérés : <strong className="text-red-400">"{selectedAnalysis.checks.unusualKeywordsFound.join(', ')}"</strong> (ex: demande de virement ou acompte avant visite).
                        </span>
                      ) : (
                        'Rédaction saine et professionnelle. Aucun indicateur de phishing ou de pression abusive.'
                      )}
                    </p>
                  </div>

                  {/* Critère 6 : Signalements */}
                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                        <UserX className="w-4 h-4 text-purple-400" />
                        6. Vendeur signalé
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedAnalysis.checks.sellerReportsCount > 0 ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {selectedAnalysis.checks.sellerReportsCount} signalement(s)
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      {selectedAnalysis.checks.sellerReportsCount > 0
                        ? `Ce vendeur ou cette annonce fait l'objet de ${selectedAnalysis.checks.sellerReportsCount} plainte(s) citoyenne(s).`
                        : 'Vendeur sans antécédent négatif ni signalement enregistré.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Aperçu Photos du bien */}
              {selectedProperty.images && selectedProperty.images.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-300">Galerie photo de l'annonce :</span>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedProperty.images.slice(0, 4).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="Aperçu"
                        className="w-full h-24 object-cover rounded-xl border border-slate-700"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5 p-4 rounded-2xl bg-slate-950/50 border border-slate-800">
                <span className="font-bold text-slate-300">Description soumise par l'annonceur :</span>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {selectedProperty.description || 'Aucune description textuelle renseignée.'}
                </p>
              </div>

              {/* Note interne du modérateur */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-300">
                  Note d'audit interne (visible uniquement par les administrateurs) :
                </label>
                <textarea
                  rows={2}
                  value={moderatorNote}
                  onChange={(e) => setModeratorNote(e.target.value)}
                  placeholder="Ex : Appelé le propriétaire sur WhatsApp pour vérification du titre foncier, faux prix corrigé..."
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Footer d'action de modération */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {selectedProperty.contactPhone && (
                  <a
                    href={`https://wa.me/${selectedProperty.contactPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp Vendeur
                  </a>
                )}
                <button
                  onClick={async () => {
                    if (confirm('Voulez-vous supprimer définitivement cette annonce frauduleuse ?')) {
                      await onDeleteProperty(selectedProperty.id);
                      setSelectedProperty(null);
                      showSuccess('Annonce supprimée définitivement.');
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-red-950/50 hover:bg-red-900 border border-red-500/30 text-red-300 text-xs font-bold transition-colors"
                >
                  Supprimer le bien
                </button>
              </div>

              {/* Les 3 boutons de décision */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSetModerationStatus('suspect')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    selectedAnalysis.verdict === 'suspect'
                      ? 'bg-red-600 text-white ring-2 ring-red-400'
                      : 'bg-red-950/60 border border-red-500/50 text-red-300 hover:bg-red-900/60'
                  }`}
                >
                  <AlertOctagon className="w-4 h-4" />
                  🔴 Bloquer Temporairement
                </button>

                <button
                  onClick={() => handleSetModerationStatus('review_required')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    selectedAnalysis.verdict === 'review_required'
                      ? 'bg-amber-600 text-white ring-2 ring-amber-400'
                      : 'bg-amber-950/60 border border-amber-500/50 text-amber-300 hover:bg-amber-900/60'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  🟠 Mettre en Contrôle Manuel
                </button>

                <button
                  onClick={() => handleSetModerationStatus('normal')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                    selectedAnalysis.verdict === 'normal'
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  🟢 Approuver & Publier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
