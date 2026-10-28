import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Calendar,
  Eye,
  RotateCcw,
  Building,
  Home,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  HelpCircle,
  Award,
  Sparkles,
  Search,
  Filter,
  Plus
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  TrustVerification,
  TrustStatus,
  TRUST_STATUS_LABELS,
  TrustDocument,
  TrustCheck,
  TrustPropertyAvailability,
  AvailabilityStatus,
  AVAILABILITY_LABELS
} from '../../types/trust';
import { Property } from '../../types';
import { trustService } from '../../services/trustService';
import { TrustBadge } from './TrustBadge';
import { TrustAvailabilityBadge } from './TrustAvailabilityBadge';
import { TrustVerificationModal } from './TrustVerificationModal';

export const AgentTrustSpace: React.FC = () => {
  const { user, properties } = useApp();
  const [verifications, setVerifications] = useState<TrustVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVerif, setSelectedVerif] = useState<TrustVerification | null>(null);

  // Modal de soumission de vérification
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitTargetType, setSubmitTargetType] = useState<'agent' | 'property'>('property');
  const [submitTargetId, setSubmitTargetId] = useState<string>('');
  const [submitTargetName, setSubmitTargetName] = useState<string>('');

  // Filtre d'annonces
  const [propertySearch, setPropertySearch] = useState('');
  const [trustFilter, setTrustFilter] = useState<'all' | 'verified' | 'pending' | 'unverified'>('all');

  // RÈGLE MÉTIER STRICTE KINIMMO TRUST :
  // On peut uniquement certifier les biens qui vous appartiennent (que vous avez vous-même publiés)
  const agentProperties = useMemo(() => {
    if (!properties || !user) return [];
    return properties.filter((p) => {
      // 1. Est-ce l'agent identifié
      const isAgent = p.agentId && p.agentId === user.id;
      // 2. Est-ce le propriétaire utilisateur identifié
      const isUser = p.userId && p.userId === user.id;
      // 3. Est-ce l'email de contact
      const isEmail = user.email && p.contactEmail && p.contactEmail.toLowerCase() === user.email.toLowerCase();
      // 4. Session de démonstration agent-1
      const isDemoAgent = user.id === 'agent-1' && (p.agentId === 'agent-1' || p.agentId === 'collab_patrick');
      // 5. Administrateur
      const isAdmin = user.role === 'admin';

      return isAgent || isUser || isEmail || isDemoAgent || isAdmin;
    });
  }, [properties, user]);


  // Charger les dossiers de l'agent
  const fetchMyVerifications = async () => {
    setIsLoading(true);
    try {
      const data = await trustService.getVerifications({
        applicant_id: user?.id || 'agent-1'
      });
      setVerifications(data);
    } catch (e) {
      console.error('Erreur chargement dossiers Kinimmo Trust', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyVerifications();
  }, [user]);

  // Statistiques pour l'agent
  const stats = useMemo(() => {
    const verifiedCount = agentProperties.filter((p) => p.trust_status === 'property_verified').length;
    const pendingCount = verifications.filter((v) => v.status === 'pending' || v.status === 'in_progress').length;
    const agentIsVerified = user?.trust_status === 'pro_verified' || user?.trust_status === 'identity_verified';

    return {
      verifiedCount,
      pendingCount,
      totalProps: agentProperties.length,
      agentIsVerified,
      trustScore: user?.trust_score || (agentIsVerified ? 96 : 40)
    };
  }, [agentProperties, verifications, user]);

  const handleOpenSubmit = (type: 'agent' | 'property', id: string, name: string) => {
    setSubmitTargetType(type);
    setSubmitTargetId(id);
    setSubmitTargetName(name);
    setIsSubmitModalOpen(true);
  };

  // Filtrage des annonces
  const filteredProperties = useMemo(() => {
    return agentProperties.filter((prop) => {
      const matchesSearch =
        prop.title.toLowerCase().includes(propertySearch.toLowerCase()) ||
        prop.commune?.toLowerCase().includes(propertySearch.toLowerCase()) ||
        ((prop as any).propertyRef || prop.id).toLowerCase().includes(propertySearch.toLowerCase());

      if (!matchesSearch) return false;

      if (trustFilter === 'verified') return prop.trust_status === 'property_verified';
      if (trustFilter === 'pending') return prop.trust_status === 'pending' || prop.trust_status === 'in_progress';
      if (trustFilter === 'unverified') return !prop.trust_status || prop.trust_status === 'unverified';

      return true;
    });
  }, [agentProperties, propertySearch, trustFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ======================================================== */}
      {/* 1. HERO BANNER : ESPACE KINIMMO TRUST PRO                 */}
      {/* ======================================================== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-900 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>Système Officiel de Confiance & Cadastre RDC</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Espace Kinimmo Trust <span className="text-emerald-400">Agent Professionnel</span>
            </h2>

            <p className="text-sm text-slate-300 leading-relaxed">
              Sécurisez vos transactions et multipliez par 3 les prises de contact en faisant certifier vos annonces et votre identité professionnelle. Les badges certifiés Kinimmo garantissent la vérification du titre foncier, du cadastre et du mandat légal.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Vérification Conservation des Titres Immobiliers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Contrôle Mandat & Identité notariée</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Horodatage et transparence publique</span>
              </div>
            </div>
          </div>

          {/* Carte Statut de l'Agent */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 w-full lg:w-80 shrink-0 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Mon Statut Agent
              </span>
              <TrustBadge
                status={user?.trust_status || 'unverified'}
                level={user?.trust_level}
                score={user?.trust_score}
                verifiedAt={user?.trust_verified_at}
                expiresAt={user?.trust_expires_at}
                targetType="agent"
                targetTitle={user?.name}
                showUnverified={true}
              />
            </div>

            <div className="flex items-baseline justify-between border-y border-slate-800/80 py-3">
              <div>
                <div className="text-[11px] text-slate-400">Score de Confiance</div>
                <div className="text-2xl font-black text-white mt-0.5">
                  {stats.trustScore}<span className="text-xs text-slate-500 font-normal">/100</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Biens certifiés</div>
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  {stats.verifiedCount}<span className="text-xs text-slate-500 font-normal">/{stats.totalProps}</span>
                </div>
              </div>
            </div>

            {user?.trust_verified_at ? (
              <div className="space-y-1.5 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Date d’approbation :</span>
                  <span className="font-semibold text-emerald-400">
                    {new Date(user.trust_verified_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                {user.trust_expires_at && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Expire le :</span>
                    <span className="font-semibold text-slate-300">
                      {new Date(user.trust_expires_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                )}
                <div className="text-[10px] text-slate-400 mt-1">
                  ✓ Carte Agent & Identité validées par le comité d'audit Kinimmo.
                </div>
              </div>
            ) : (
              <button
                onClick={() =>
                  handleOpenSubmit('agent', user?.id || 'agent-1', user?.name || 'Mon Profil Agent')
                }
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Faire certifier mon identité Agent</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. ÉTAPES DE PROGRESSION DU PROCESSUS DE VÉRIFICATION    */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" />
            <span>Processus d’Attribution du Label Kinimmo Trust</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Chaque bien et profil fait l'objet d'une instruction juridique et cadastrale rigoureuse avant l'attribution de son badge vert vérifié.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {[
            {
              step: '1',
              title: 'Soumission du Dossier',
              desc: 'Téléversement des pièces : Titre Foncier, Certificat d’enregistrement, Mandat de commercialisation, CNI ou RCCM.',
              status: 'done'
            },
            {
              step: '2',
              title: 'Examen de Conformité',
              desc: 'Contrôle automatique de l’intégrité des fichiers, anti-virus, vérification des signatures et dates de validité.',
              status: 'done'
            },
            {
              step: '3',
              title: 'Contrôle Cadastral Kinshasa',
              desc: 'Vérification du volume et folio auprès de la Conservation Foncière et inspection physique de la localisation.',
              status: 'active'
            },
            {
              step: '4',
              title: 'Attribution du Badge & Suivi',
              desc: 'Publication du badge officiel, horodatage public, et mise à jour dynamique de la disponibilité en temps réel.',
              status: 'upcoming'
            }
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                item.status === 'done'
                  ? 'bg-emerald-950/20 border-emerald-500/40'
                  : item.status === 'active'
                  ? 'bg-amber-950/20 border-amber-500/40 shadow-lg'
                  : 'bg-slate-950/40 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    item.status === 'done'
                      ? 'bg-emerald-500 text-slate-950'
                      : item.status === 'active'
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.step}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    item.status === 'done'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : item.status === 'active'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {item.status === 'done' ? 'Étape 1 & 2' : item.status === 'active' ? 'Audit en cours' : 'Finalisation'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MES DEMANDES DE VÉRIFICATION EN COURS / HISTORIQUE   */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-400" />
              <span>Mes Demandes de Vérification Kinimmo Trust</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Historique de vos dossiers soumis, statut de modération, pièces validées et décisions du comité.
            </p>
          </div>

          <button
            onClick={() => {
              if (agentProperties.length > 0) {
                const first = agentProperties[0];
                handleOpenSubmit('property', first.id, first.title);
              } else {
                handleOpenSubmit('agent', user?.id || 'agent-1', user?.name || 'Mon Profil Agent');
              }
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-colors shadow-md flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Déposer une nouvelle demande</span>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span>Chargement des dossiers de vérification...</span>
          </div>
        ) : verifications.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800 p-6 space-y-3">
            <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">Aucune demande soumise pour le moment</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Soumettez votre premier dossier de vérification avec les pièces justificatives (Certificat d'Enregistrement, Mandat) pour obtenir le badge vert certifié.
            </p>
            <button
              onClick={() => {
                if (agentProperties.length > 0) {
                  const first = agentProperties[0];
                  handleOpenSubmit('property', first.id, first.title);
                } else {
                  handleOpenSubmit('agent', user?.id || 'agent-1', user?.name || 'Mon Profil Agent');
                }
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Soumettre une demande</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {verifications.map((verif) => {
              const statusMeta = TRUST_STATUS_LABELS[verif.status] || TRUST_STATUS_LABELS.unverified;
              return (
                <div
                  key={verif.id}
                  className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {verif.verification_number}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {verif.target_type === 'property' ? '🏠 Annonce Immobilière' : '👤 Profil Agent'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{verif.target_title || verif.target_id}</span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>Soumis le : {new Date(verif.created_at).toLocaleDateString('fr-FR')}</span>
                      {verif.verified_at && (
                        <span className="text-emerald-400 font-semibold">
                          Approuvé le : {new Date(verif.verified_at).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                      {verif.expires_at && (
                        <span>Expire le : {new Date(verif.expires_at).toLocaleDateString('fr-FR')}</span>
                      )}
                      <span>Pièces jointes : {verif.documents?.length || 0} document(s)</span>
                    </div>

                    {verif.rejection_reason && (
                      <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300">
                        <strong>Motif de refus :</strong> {verif.rejection_reason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedVerif(verif)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-emerald-400" />
                      <span>Examiner le dossier</span>
                    </button>

                    {verif.status === 'rejected' && (
                      <button
                        onClick={() =>
                          handleOpenSubmit(
                            verif.target_type as 'agent' | 'property',
                            verif.target_id,
                            verif.target_title || verif.target_id
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Re-soumettre avec nouvelles pièces</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. GESTION DU STATUT DE CONFIANCE DE MES ANNONCES        */}
      {/* ======================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-400" />
              <span>Statut Kinimmo Trust de mes Annonces ({agentProperties.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Contrôlez les badges visibles sur vos annonces et mettez à jour leur disponibilité en temps réel.
            </p>
          </div>

          {/* Recherche & Filtre */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher une annonce..."
                value={propertySearch}
                onChange={(e) => setPropertySearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'verified', label: 'Vérifiées' },
                { id: 'pending', label: 'En cours' },
                { id: 'unverified', label: 'Non vérifiées' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTrustFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    trustFilter === f.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grille des annonces */}
        {filteredProperties.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-3">
            <Home className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">
              {agentProperties.length === 0
                ? "Vous n'avez pas encore publié d'annonces immobilières"
                : "Aucune annonce ne correspond à votre filtre"}
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {agentProperties.length === 0
                ? "Règle métier Kinimmo Trust : Vous pouvez certifier uniquement les biens immobiliers qui vous appartiennent (que vous avez vous-même publiés). Publiez d'abord votre bien immobilier pour pouvoir soumettre ses justificatifs (Titre foncier, Mandat)."
                : "Essayez de réinitialiser vos critères de recherche pour retrouver vos annonces publiées."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((prop) => {
            const isVerified = prop.trust_status === 'property_verified';
            const isPending = prop.trust_status === 'pending' || prop.trust_status === 'in_progress';

            return (
              <div
                key={prop.id}
                className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div className="space-y-3">
                  {/* Image & Badges */}
                  <div className="relative h-36 rounded-xl overflow-hidden bg-slate-800">
                    <img
                      src={(prop as any).imageUrl || (prop.images && prop.images[0]) || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600'}
                      alt={prop.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                      <TrustBadge
                        status={prop.trust_status || 'unverified'}
                        level={prop.trust_level}
                        score={prop.trust_score}
                        verifiedAt={prop.trust_verified_at}
                        expiresAt={prop.trust_expires_at}
                        targetType="property"
                        targetTitle={prop.title}
                        showUnverified={true}
                        size="sm"
                      />
                    </div>
                    <div className="absolute bottom-2 right-2">
                      <TrustAvailabilityBadge
                        propertyId={prop.id}
                        propertyTitle={prop.title}
                        status={prop.availability_status || 'available'}
                        confirmedAt={prop.availability_confirmed_at}
                        canConfirm={true}
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{prop.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {prop.commune}, Kinshasa • {prop.price?.toLocaleString()} {prop.currency || '$'}
                    </p>
                  </div>

                  {/* Détails clairs de ce qui a été vérifié */}
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Contrôle Cadastre :</span>
                      <span className={isVerified ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {isVerified ? '✓ Conforme (Vol/Folio)' : isPending ? 'En cours' : 'Non vérifié'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Mandat Propriétaire :</span>
                      <span className={isVerified ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {isVerified ? '✓ Mandat exclusif vérifié' : isPending ? 'En examen' : 'Non vérifié'}
                      </span>
                    </div>
                    {prop.trust_verified_at && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                        <span className="text-slate-400">Certifié le :</span>
                        <span className="text-slate-300 font-mono">
                          {new Date(prop.trust_verified_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bouton d'action */}
                <div>
                  {isVerified ? (
                    <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Badge Actif & Visible en Public</span>
                    </div>
                  ) : isPending ? (
                    <div className="w-full py-2 px-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold flex items-center justify-center gap-1.5">
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Dossier en cours d’examen</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenSubmit('property', prop.id, prop.title)}
                      className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-500/15"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Demander la vérification Trust</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

      {/* ======================================================== */}
      {/* 5. MODAL DE DÉTAIL D'UN DOSSIER DE VÉRIFICATION           */}
      {/* ======================================================== */}
      {selectedVerif && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Dossier {selectedVerif.verification_number}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedVerif.target_title || selectedVerif.target_id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedVerif(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Statut et Métadonnées */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Statut Actuel</div>
                <div className="text-xs font-bold text-emerald-400 mt-1">
                  {TRUST_STATUS_LABELS[selectedVerif.status]?.label || selectedVerif.status}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Score Attribué</div>
                <div className="text-xs font-bold text-white mt-1">
                  {selectedVerif.score || 0}/100
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Date de dépôt</div>
                <div className="text-xs font-bold text-slate-300 mt-1">
                  {new Date(selectedVerif.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Expiration</div>
                <div className="text-xs font-bold text-slate-300 mt-1">
                  {selectedVerif.expires_at
                    ? new Date(selectedVerif.expires_at).toLocaleDateString('fr-FR')
                    : '1 an après validation'}
                </div>
              </div>
            </div>

            {/* Messages explicatifs des vérifications effectuées */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Rapport d'instruction et contrôles réalisés
              </h4>

              <div className="space-y-2">
                {(selectedVerif.checks && selectedVerif.checks.length > 0) ? (
                  selectedVerif.checks.map((ck) => (
                    <div
                      key={ck.id}
                      className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-start gap-3 text-xs"
                    >
                      {ck.result === 'passed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : ck.result === 'failed' ? (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold text-white">{ck.check_type}</div>
                        <p className="text-slate-400 mt-0.5">{ck.notes || 'Contrôle effectué par le comité technique.'}</p>
                        <div className="text-[10px] text-slate-500 mt-1">
                          Vérifié le {new Date(ck.created_at).toLocaleDateString('fr-FR')} par {ck.audited_by_name || 'Auditeur Kinimmo'}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-2">
                    <p>
                      <strong>Ce qui est contrôlé pour cette demande :</strong>
                    </p>
                    <ul className="list-disc pl-5 space-y-1 text-slate-300">
                      <li>Authenticité du Certificat d’Enregistrement ou Titre de Propriété Cadastral.</li>
                      <li>Validité du Mandat de commercialisation signé par le propriétaire légitime.</li>
                      <li>Vérification de l’identité du déclarant (Passeport / CNI).</li>
                      <li>Absence de litige foncier déclaré sur la parcelle cadastrale à Kinshasa.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Pièces Justificatives déposées */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pièces justificatives ({selectedVerif.documents?.length || 0})
              </h4>

              <div className="space-y-2">
                {selectedVerif.documents?.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <div>
                        <div className="font-bold text-white">{doc.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {doc.doc_type} {doc.document_number && `• N° ${doc.document_number}`}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        doc.status === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : doc.status === 'rejected'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {doc.status === 'approved'
                        ? 'Approuvé'
                        : doc.status === 'rejected'
                        ? 'Rejeté'
                        : 'En attente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedVerif(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL DE SOUMISSION DE NOUVELLE VÉRIFICATION         */}
      {/* ======================================================== */}
      <TrustVerificationModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        targetType={submitTargetType}
        targetId={submitTargetId}
        targetName={submitTargetName}
        onSuccess={() => {
          setIsSubmitModalOpen(false);
          fetchMyVerifications();
        }}
      />
    </div>
  );
};
