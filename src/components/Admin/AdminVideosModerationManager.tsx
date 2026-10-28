import React, { useState, useMemo } from 'react';
import { Property, PropertyVideo, PropertyVideoStatus, PropertyUserReport } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Film,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  MapPin,
  Building2,
  MessageSquare,
  AlertOctagon,
  RefreshCw,
  X,
  Sparkles,
  Cloud
} from 'lucide-react';
import { isCloudinaryUrl, getCloudinaryOptimizedVideoUrl } from '../../utils/videoHelpers';

interface AdminVideosModerationManagerProps {
  properties: Property[];
  reports?: PropertyUserReport[];
  onOpenPropertyModal?: (propertyId: string) => void;
}

export const AdminVideosModerationManager: React.FC<AdminVideosModerationManagerProps> = ({
  properties,
  reports = [],
  onOpenPropertyModal
}) => {
  const {
    propertyVideos,
    updatePropertyVideoStatus,
    deletePropertyVideo,
    resolvePropertyReport
  } = useApp();

  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'hidden'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVideoToPlay, setActiveVideoToPlay] = useState<PropertyVideo | null>(null);
  const [rejectingVideoId, setRejectingVideoId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 4000);
  };

  // Filtrage des vidéos
  const filteredVideos = useMemo(() => {
    return propertyVideos.filter((video) => {
      // 1. Filtre statut
      if (filterTab !== 'all' && video.status !== filterTab) return false;

      // 2. Recherche textuelle
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (video.propertyTitle || '').toLowerCase().includes(q);
        const matchAgent = (video.agentName || '').toLowerCase().includes(q);
        const matchCommune = (video.propertyCommune || '').toLowerCase().includes(q);
        if (!matchTitle && !matchAgent && !matchCommune) return false;
      }

      return true;
    });
  }, [propertyVideos, filterTab, searchQuery]);

  const pendingCount = propertyVideos.filter((v) => v.status === 'pending').length;
  const approvedCount = propertyVideos.filter((v) => v.status === 'approved').length;
  const rejectedCount = propertyVideos.filter((v) => v.status === 'rejected').length;
  const hiddenCount = propertyVideos.filter((v) => v.status === 'hidden').length;
  const totalViews = propertyVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0);

  const handleApprove = async (video: PropertyVideo) => {
    await updatePropertyVideoStatus(video.id, 'approved');
    showNotification(`La vidéo pour « ${video.propertyTitle} » a été approuvée et mise en ligne sur Kinimmo Visites.`);
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingVideoId) return;

    const reason = rejectionReasonInput.trim() || 'Vidéo non conforme aux standards Kinimmo Visites.';
    await updatePropertyVideoStatus(rejectingVideoId, 'rejected', reason);
    setRejectingVideoId(null);
    setRejectionReasonInput('');
    showNotification('Publication refusée. Le motif a été consigné pour l\'agent.');
  };

  const handleToggleHide = async (video: PropertyVideo) => {
    const newStatus: PropertyVideoStatus = video.status === 'hidden' ? 'approved' : 'hidden';
    await updatePropertyVideoStatus(video.id, newStatus);
    showNotification(newStatus === 'hidden' ? 'Vidéo masquée du flux public.' : 'Vidéo rétablie en ligne.');
  };

  const handleDelete = async (video: PropertyVideo) => {
    if (window.confirm(`Confirmer la suppression définitive de la vidéo pour « ${video.propertyTitle} » ?`)) {
      await deletePropertyVideo(video.id);
      showNotification('Vidéo supprimée définitivement.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de notification */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* En-tête du module de modération */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              Contrôle Administrateur
            </span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
                {pendingCount} en attente
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Film className="w-6 h-6 text-emerald-400" />
            <span>Modération des Vidéos • Kinimmo Visites</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Examinez la qualité, la conformité et l'authenticité des vidéos courtes soumises par les agents et agences avant diffusion dans le flux immersif Kinshasa.
          </p>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div
          onClick={() => setFilterTab('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterTab === 'all'
              ? 'bg-slate-800/80 border-slate-600 ring-2 ring-slate-400/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Vidéos</span>
          <span className="text-2xl font-black text-white mt-1 block">{propertyVideos.length}</span>
        </div>

        <div
          onClick={() => setFilterTab('pending')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterTab === 'pending'
              ? 'bg-amber-500/15 border-amber-500/40 ring-2 ring-amber-400/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">En Attente</span>
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{pendingCount}</span>
        </div>

        <div
          onClick={() => setFilterTab('approved')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterTab === 'approved'
              ? 'bg-emerald-500/15 border-emerald-500/40 ring-2 ring-emerald-400/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">Approuvées</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{approvedCount}</span>
        </div>

        <div
          onClick={() => setFilterTab('rejected')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            filterTab === 'rejected'
              ? 'bg-rose-500/15 border-rose-500/40 ring-2 ring-rose-400/20'
              : 'bg-slate-900 border-slate-800 hover:border-slate-700'
          }`}
        >
          <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider block">Refusées</span>
          <span className="text-2xl font-black text-rose-400 mt-1 block">{rejectedCount}</span>
        </div>

        <div className="p-4 rounded-2xl border bg-slate-900 border-slate-800 col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Vues Flux</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">{totalViews}</span>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par titre, agent, commune..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `Toutes (${propertyVideos.length})` },
            { id: 'pending', label: `En attente (${pendingCount})` },
            { id: 'approved', label: `Approuvées (${approvedCount})` },
            { id: 'rejected', label: `Refusées (${rejectedCount})` },
            { id: 'hidden', label: `Masquées (${hiddenCount})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                filterTab === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des Vidéos à Modérer */}
      {filteredVideos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Film className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Aucune vidéo dans cette catégorie</h3>
          <p className="text-xs text-slate-400">
            {searchQuery ? 'Aucun résultat ne correspond à votre recherche.' : 'Toutes les vidéos ont été traitées.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((video) => {
            const prop = properties.find((p) => p.id === video.propertyId);
            const propReports = reports.filter((r) => r.propertyId === video.propertyId && r.status === 'pending');

            return (
              <div
                key={video.id}
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all shadow-xl group"
              >
                {/* Aperçu vidéo avec bouton lecture direct */}
                <div className="relative aspect-video sm:aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
                  <img
                    src={video.thumbnailUrl || prop?.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80'}
                    alt={video.propertyTitle || 'Vidéo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/60 pointer-events-none" />

                  {/* Statut Badge */}
                  <div className="absolute top-3 left-3 z-10">
                    {video.status === 'approved' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500 text-slate-950 flex items-center gap-1 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" /> En Ligne
                      </span>
                    )}
                    {video.status === 'pending' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 flex items-center gap-1 shadow-md animate-pulse">
                        <Clock className="w-3.5 h-3.5" /> À Valider
                      </span>
                    )}
                    {video.status === 'rejected' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-500 text-white flex items-center gap-1 shadow-md">
                        <XCircle className="w-3.5 h-3.5" /> Refusée
                      </span>
                    )}
                    {video.status === 'hidden' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-500 text-white flex items-center gap-1 shadow-md">
                        <AlertOctagon className="w-3.5 h-3.5" /> Masquée
                      </span>
                    )}
                    {video.status === 'draft' && (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-700 text-slate-200 flex items-center gap-1 shadow-md">
                        Brouillon
                      </span>
                    )}
                  </div>

                  {/* Badge Cloudinary CDN */}
                  {isCloudinaryUrl(video.videoUrl) && (
                    <div className="absolute top-3 right-3 z-10 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/40 text-[10px] font-black text-sky-300 flex items-center gap-1 backdrop-blur-sm">
                      <Cloud className="w-3 h-3 text-sky-400" />
                      <span>Cloudinary</span>
                    </div>
                  )}

                  {/* Bouton de lecture centré */}
                  <button
                    onClick={() => setActiveVideoToPlay(video)}
                    className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl transition-transform active:scale-90 cursor-pointer"
                    title="Visionner la vidéo"
                  >
                    <Play className="w-6 h-6 fill-slate-950 translate-x-0.5" />
                  </button>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white z-10">
                    <span className="font-bold flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{video.viewsCount || 0} vues</span>
                    </span>
                    <span className="text-[11px] text-slate-300">
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Métadonnées & Détails */}
                <div className="p-5 space-y-3.5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-black text-white line-clamp-1">
                        {video.propertyTitle || prop?.title || 'Titre non disponible'}
                      </h4>
                      <p className="text-xs text-emerald-400 font-bold mt-0.5">
                        {video.propertyPrice ? `$${video.propertyPrice.toLocaleString()}` : prop ? `$${prop.price.toLocaleString()}` : ''} • {video.propertyCommune || prop?.commune || 'Kinshasa'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Créateur : <strong className="text-slate-200">{video.agentName || 'Agent'}</strong></span>
                    </div>

                    {video.description && (
                      <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800">
                        {video.description}
                      </p>
                    )}

                    {/* Alerte si des signalements existent sur ce bien */}
                    {propReports.length > 0 && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-white">Signalement Actif ({propReports.length}) :</span>
                          <span className="text-[11px]">{propReports[0].comment || propReports[0].reason}</span>
                        </div>
                      </div>
                    )}

                    {video.status === 'rejected' && video.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                        <span className="font-bold block">Motif de rejet :</span>
                        <span>{video.rejectionReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions Administratives */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {video.status !== 'approved' && (
                        <button
                          onClick={() => handleApprove(video)}
                          className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approuver</span>
                        </button>
                      )}

                      {video.status === 'approved' && (
                        <button
                          onClick={() => handleToggleHide(video)}
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Masquer</span>
                        </button>
                      )}

                      {video.status !== 'rejected' && (
                        <button
                          onClick={() => {
                            setRejectingVideoId(video.id);
                            setRejectionReasonInput('');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Refuser</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      {prop && onOpenPropertyModal && (
                        <button
                          onClick={() => onOpenPropertyModal(prop.id)}
                          className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                        >
                          <ExternalLink className="w-3 h-3 text-emerald-400" />
                          <span>Examiner l'annonce</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(video)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px] ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Supprimer</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Visionneuse Vidéo Réel */}
      {activeVideoToPlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-sm w-full aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            <button
              onClick={() => setActiveVideoToPlay(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <video
              src={
                isCloudinaryUrl(activeVideoToPlay.videoUrl)
                  ? getCloudinaryOptimizedVideoUrl(activeVideoToPlay.videoUrl, { quality: 'auto:good' })
                  : activeVideoToPlay.videoUrl
              }
              autoPlay
              controls
              playsInline
              className="w-full h-full object-cover"
            />

            <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/60 backdrop-blur-md p-3 rounded-2xl text-white space-y-1">
              <h4 className="text-xs font-black line-clamp-1">{activeVideoToPlay.propertyTitle}</h4>
              <p className="text-[11px] text-emerald-400 font-bold">
                {activeVideoToPlay.propertyPrice ? `$${activeVideoToPlay.propertyPrice.toLocaleString()}` : ''} • {activeVideoToPlay.propertyCommune}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Refus avec Motif */}
      {rejectingVideoId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Refuser la publication de la vidéo</h3>
                <p className="text-xs text-slate-400">Indiquez le motif du refus pour notifier l'agent</p>
              </div>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Ex : Vidéo floue, informations erronées par rapport à l'annonce, son inaudible..."
                rows={3}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-rose-500 resize-none"
              />

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRejectingVideoId(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs"
                >
                  Confirmer le Refus
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
