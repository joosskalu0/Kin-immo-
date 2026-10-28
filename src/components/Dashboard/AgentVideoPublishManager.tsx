import React, { useState, useRef, useEffect } from 'react';
import { Property, PropertyVideo, PropertyVideoStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Film,
  Upload,
  Plus,
  Play,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  FileVideo,
  Sparkles,
  Trash2,
  ExternalLink,
  Layers,
  ShieldCheck,
  X,
  Cloud,
  Settings,
  Loader2,
  Check,
  RefreshCw,
  Sliders,
  Zap
} from 'lucide-react';
import {
  fetchCloudinaryConfig,
  saveCloudinaryConfig,
  testCloudinaryConnection,
  uploadVideoWithProgress,
  isCloudinaryUrl,
  getCloudinaryOptimizedVideoUrl,
  getCloudinaryAutoThumbnail,
  CloudinaryConfig
} from '../../services/cloudinaryService';

interface AgentVideoPublishManagerProps {
  myProperties: Property[];
  onOpenPropertyModal?: (propertyId: string) => void;
}

export const AgentVideoPublishManager: React.FC<AgentVideoPublishManagerProps> = ({
  myProperties,
  onOpenPropertyModal
}) => {
  const {
    propertyVideos,
    addPropertyVideo,
    deletePropertyVideo,
    user
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(myProperties[0]?.id || '');
  const [videoInputMode, setVideoInputMode] = useState<'cloudinary' | 'url'>('cloudinary');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [thumbnailUrlInput, setThumbnailUrlInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);

  // Téléversement Cloudinary & progression en direct
  const [isUploadingToCloudinary, setIsUploadingToCloudinary] = useState(false);
  const [cloudinaryProgress, setCloudinaryProgress] = useState(0);
  const [uploadSuccessInfo, setUploadSuccessInfo] = useState<{
    bytes?: number;
    duration?: number;
    format?: string;
  } | null>(null);

  // Configuration Cloudinary
  const [cloudinaryConfig, setCloudinaryConfig] = useState<CloudinaryConfig | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configCloudName, setConfigCloudName] = useState('');
  const [configApiKey, setConfigApiKey] = useState('');
  const [configApiSecret, setConfigApiSecret] = useState('');
  const [configPreset, setConfigPreset] = useState('');
  const [isTestingCloudinary, setIsTestingCloudinary] = useState(false);
  const [cloudinaryTestResult, setCloudinaryTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Aperçu vidéo modal
  const [previewVideo, setPreviewVideo] = useState<PropertyVideo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger la configuration Cloudinary au montage
  useEffect(() => {
    fetchCloudinaryConfig().then((cfg) => {
      setCloudinaryConfig(cfg);
      setConfigCloudName(cfg.cloudName || '');
      setConfigApiKey(cfg.apiKey || '');
      setConfigPreset(cfg.uploadPreset || 'kinimmo_videos');
    });
  }, []);

  // Filtrer les vidéos appartenant à cet utilisateur
  const userVideos = propertyVideos.filter(
    (v) =>
      user?.role === 'admin' ||
      v.userId === user?.id ||
      v.userId === 'agent_current' ||
      myProperties.some((p) => p.id === v.propertyId)
  );

  const stats = {
    total: userVideos.length,
    approved: userVideos.filter((v) => v.status === 'approved').length,
    pending: userVideos.filter((v) => v.status === 'pending').length,
    drafts: userVideos.filter((v) => v.status === 'draft').length,
    totalViews: userVideos.reduce((acc, v) => acc + (v.viewsCount || 0), 0)
  };

  // Sélection d'un fichier vidéo et déclenchement du téléversement Cloudinary
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileUploadError(null);
    setUploadSuccessInfo(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation du format vidéo
    const validFormats = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
    if (!validFormats.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|mkv|m4v)$/i)) {
      setFileUploadError('Format non pris en charge. Veuillez choisir un fichier MP4, WebM ou MOV.');
      return;
    }

    // Validation de la taille (max 100 Mo)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setFileUploadError('Le fichier est trop volumineux (maximum 100 Mo).');
      return;
    }

    setSelectedFile(file);
    setSelectedFileName(file.name);

    // Téléverser automatiquement vers Cloudinary
    await startCloudinaryUpload(file);
  };

  // Envoi vers le serveur / Cloudinary
  const startCloudinaryUpload = async (file: File) => {
    setIsUploadingToCloudinary(true);
    setCloudinaryProgress(0);
    setFileUploadError(null);

    try {
      const result = await uploadVideoWithProgress(file, (percent) => {
        setCloudinaryProgress(percent);
      });

      if (result.success && result.secure_url) {
        setVideoUrlInput(result.secure_url);
        // Miniature auto générée par Cloudinary
        if (result.thumbnail_url) {
          setThumbnailUrlInput(result.thumbnail_url);
        }
        setUploadSuccessInfo({
          bytes: result.bytes,
          duration: result.duration,
          format: result.format
        });
        setSuccessToast('Vidéo téléversée sur Cloudinary et optimisée pour mobile avec succès !');
        setTimeout(() => setSuccessToast(null), 4000);
      }
    } catch (err: any) {
      console.error('Erreur téléversement Cloudinary:', err);
      // Fallback local blob URL pour ne pas bloquer l'agent si Cloudinary n'est pas encore configuré
      const blobUrl = URL.createObjectURL(file);
      setVideoUrlInput(blobUrl);
      setFileUploadError(
        err?.message ||
        'Impossible de téléverser vers Cloudinary. Vérifiez la configuration de vos clés API.'
      );
    } finally {
      setIsUploadingToCloudinary(false);
    }
  };

  const handleSaveCloudinaryConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setCloudinaryTestResult(null);

    try {
      const res = await saveCloudinaryConfig({
        cloudName: configCloudName.trim(),
        apiKey: configApiKey.trim(),
        apiSecret: configApiSecret.trim(),
        uploadPreset: configPreset.trim()
      });

      if (res.success && res.config) {
        setCloudinaryConfig(res.config);
        setSuccessToast('Paramètres Cloudinary enregistrés avec succès !');
        setTimeout(() => setSuccessToast(null), 4000);
        setIsConfigModalOpen(false);
      }
    } catch (err: any) {
      setCloudinaryTestResult({
        success: false,
        message: err?.message || 'Erreur lors de la sauvegarde.'
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestCloudinary = async () => {
    setIsTestingCloudinary(true);
    setCloudinaryTestResult(null);
    try {
      const res = await testCloudinaryConnection();
      setCloudinaryTestResult(res);
    } catch (err: any) {
      setCloudinaryTestResult({
        success: false,
        message: err?.message || 'Erreur réseau.'
      });
    } finally {
      setIsTestingCloudinary(false);
    }
  };

  const handleSubmit = async (targetStatus: PropertyVideoStatus) => {
    if (!selectedPropertyId) {
      setErrorToast('Veuillez sélectionner une annonce immobilière existante.');
      return;
    }

    const finalVideoUrl = videoUrlInput.trim();
    if (!finalVideoUrl) {
      setErrorToast('Veuillez téléverser une vidéo ou renseigner une URL valide.');
      return;
    }

    setIsSubmitting(true);
    setErrorToast(null);

    try {
      // Déterminer la miniature finale
      let finalThumbnail = thumbnailUrlInput.trim();
      if (!finalThumbnail && isCloudinaryUrl(finalVideoUrl)) {
        finalThumbnail = getCloudinaryAutoThumbnail(finalVideoUrl);
      }

      const res = await addPropertyVideo({
        propertyId: selectedPropertyId,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnail || undefined,
        description: descriptionInput.trim() || undefined,
        status: targetStatus
      });

      setSuccessToast(res.message || 'Vidéo enregistrée avec succès !');
      setTimeout(() => setSuccessToast(null), 4000);
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      setErrorToast(err?.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setVideoUrlInput('');
    setThumbnailUrlInput('');
    setDescriptionInput('');
    setSelectedFile(null);
    setSelectedFileName(null);
    setFileUploadError(null);
    setCloudinaryProgress(0);
    setUploadSuccessInfo(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette vidéo ?')) {
      await deletePropertyVideo(id);
      setSuccessToast('Vidéo supprimée.');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  const getStatusBadge = (status: PropertyVideoStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>En Ligne (Approuvée)</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            <span>En attente de validation</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-slate-700/60 text-slate-300 border border-slate-600">
            <FileVideo className="w-3.5 h-3.5" />
            <span>Brouillon</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>Refusée</span>
          </span>
        );
      case 'hidden':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Masquée / Suspendue</span>
          </span>
        );
      default:
        return null;
    }
  };

  const selectedProperty = myProperties.find((p) => p.id === selectedPropertyId);

  return (
    <div className="space-y-6">
      {/* Toast Alertes */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header Espace Kinimmo Visites PRO avec indicateur Cloudinary */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              Module Kinimmo Visites
            </span>

            {/* Badge statut Cloudinary */}
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-black uppercase tracking-wider border border-sky-500/30 flex items-center gap-1 hover:bg-sky-500/30 transition-all cursor-pointer"
              title="Configurer les clés Cloudinary"
            >
              <Cloud className="w-3 h-3 text-sky-400" />
              <span>Hébergeur : Cloudinary Video {cloudinaryConfig?.isConfigured ? '✓' : '(Config)'}</span>
            </button>

            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Film className="w-6 h-6 text-emerald-400" />
            <span>Vidéos & Visites Immersives PRO</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Glissez vos vidéos directement dans l'application : KinImmo les envoie automatiquement à <strong>Cloudinary</strong> avec encodage H.264, compression intelligente et diffusion CDN ultra-rapide sur mobile.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3.5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-700"
            title="Paramètres Cloudinary"
          >
            <Settings className="w-4 h-4 text-sky-400" />
            <span className="hidden md:inline">Configuration Cloudinary</span>
          </button>

          <button
            onClick={() => {
              if (myProperties.length === 0) {
                alert('Vous devez d\'abord créer au moins une annonce immobilière avant de pouvoir publier une vidéo.');
                return;
              }
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Publier une Vidéo</span>
          </button>
        </div>
      </div>

      {/* Cartes KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Vidéos</span>
          <span className="text-2xl font-black text-white mt-1 block">{stats.total}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">En Ligne (Approuvées)</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">{stats.approved}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">En Validation</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{stats.pending}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block">Vues Totales</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">{stats.totalViews}</span>
        </div>
      </div>

      {/* Liste des vidéos de l'agent */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Mes Vidéos Visites Soumises</span>
          </h3>

          <span className="text-xs text-slate-400">
            {userVideos.length} vidéo{userVideos.length > 1 ? 's' : ''} au total
          </span>
        </div>

        {userVideos.length === 0 ? (
          <div className="p-10 text-center space-y-3 bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl">
            <Film className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-white">Aucune vidéo publiée pour l'instant</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Sélectionnez l'une de vos annonces et déposez votre vidéo : le site se charge de la compresser et de l'héberger sur Cloudinary pour les visiteurs.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter ma première vidéo Cloudinary</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userVideos.map((video) => {
              const prop = myProperties.find((p) => p.id === video.propertyId);
              const isCloud = isCloudinaryUrl(video.videoUrl);

              return (
                <div
                  key={video.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition-all group"
                >
                  <div className="relative aspect-video sm:aspect-[9/10] bg-black overflow-hidden flex items-center justify-center">
                    <img
                      src={
                        video.thumbnailUrl ||
                        (isCloud ? getCloudinaryAutoThumbnail(video.videoUrl) : null) ||
                        prop?.images?.[0] ||
                        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80'
                      }
                      alt={video.propertyTitle || 'Vidéo Visite'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/60 pointer-events-none" />

                    <div className="absolute top-3 left-3">
                      {getStatusBadge(video.status)}
                    </div>

                    {/* Badge Cloudinary */}
                    {isCloud && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-sky-950/80 border border-sky-500/40 text-[10px] font-black text-sky-300 flex items-center gap-1 backdrop-blur-sm">
                        <Cloud className="w-3 h-3 text-sky-400" />
                        <span>Cloudinary CDN</span>
                      </div>
                    )}

                    <button
                      onClick={() => setPreviewVideo(video)}
                      className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-emerald-500/90 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
                      title="Visionner la vidéo"
                    >
                      <Play className="w-5 h-5 fill-slate-950 translate-x-0.5" />
                    </button>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <span className="flex items-center gap-1 font-bold">
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{video.viewsCount || 0} vues</span>
                      </span>
                      <span className="text-[11px] text-slate-300 font-mono">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-2.5">
                    <div>
                      <h4 className="text-xs font-black text-white line-clamp-1">
                        {video.propertyTitle || prop?.title || 'Annonce liée'}
                      </h4>
                      <p className="text-[11px] text-emerald-400 font-bold mt-0.5">
                        {video.propertyPrice ? `$${video.propertyPrice.toLocaleString()}` : prop ? `$${prop.price.toLocaleString()}` : ''} • {video.propertyCommune || prop?.commune || 'Kinshasa'}
                      </p>
                    </div>

                    {video.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {video.description}
                      </p>
                    )}

                    {video.status === 'rejected' && video.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] space-y-0.5">
                        <span className="font-bold block text-rose-400">Motif du refus administratif :</span>
                        <span>{video.rejectionReason}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      {prop && onOpenPropertyModal && (
                        <button
                          onClick={() => onOpenPropertyModal(prop.id)}
                          className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <ExternalLink className="w-3 h-3 text-emerald-400" />
                          <span>Voir le bien</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(video.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-auto cursor-pointer"
                        title="Supprimer la vidéo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal / Formulaire de publication d'une vidéo avec téléversement Cloudinary */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Publier une Visite Vidéo</h3>
                  <p className="text-xs text-slate-400">Déposez votre vidéo : KinImmo l'envoie sur Cloudinary</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit('pending');
              }}
              className="space-y-5"
            >
              {/* 1. Sélection de l'annonce existante */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  1. Sélectionner l'annonce associée <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-emerald-500"
                  required
                >
                  {myProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} — ${p.price.toLocaleString()} ({p.commune || 'Kinshasa'})
                    </option>
                  ))}
                </select>

                {selectedProperty && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3 mt-2">
                    <img
                      src={selectedProperty.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&auto=format&fit=crop&q=80'}
                      alt={selectedProperty.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{selectedProperty.title}</p>
                      <p className="text-[11px] text-emerald-400 font-bold">
                        ${selectedProperty.price.toLocaleString()} • {selectedProperty.commune || 'Kinshasa'} • {selectedProperty.bedrooms || 0} ch.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Source vidéo : Téléversement Cloudinary ou URL */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">
                  2. Téléverser la vidéo du bien <span className="text-emerald-400">*</span>
                </label>

                <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 gap-1">
                  <button
                    type="button"
                    onClick={() => setVideoInputMode('cloudinary')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      videoInputMode === 'cloudinary'
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Déposer sur Cloudinary (Recommandé)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoInputMode('url')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      videoInputMode === 'url'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Lien URL Existant</span>
                  </button>
                </div>

                {videoInputMode === 'cloudinary' ? (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <div
                      onClick={() => !isUploadingToCloudinary && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all bg-slate-950/40 space-y-2 ${
                        isUploadingToCloudinary
                          ? 'border-sky-500/50 bg-sky-950/10 cursor-wait'
                          : 'border-slate-800 hover:border-sky-500/60 cursor-pointer'
                      }`}
                    >
                      {isUploadingToCloudinary ? (
                        <div className="space-y-3 py-2">
                          <Loader2 className="w-8 h-8 text-sky-400 animate-spin mx-auto" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-white">
                              Téléversement vers Cloudinary en cours... ({cloudinaryProgress}%)
                            </p>
                            <p className="text-[10px] text-sky-300">
                              Application de la compression mobile automatique q_auto & encodage H.264
                            </p>
                          </div>

                          {/* Barre de progression animée */}
                          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-sky-400 to-blue-500 h-2.5 rounded-full transition-all duration-200"
                              style={{ width: `${cloudinaryProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mx-auto">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">
                              {selectedFileName ? selectedFileName : 'Cliquez ou glissez votre vidéo ici'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              MP4, MOV, WebM • Jusqu'à 100 Mo • Transcodage mobile et miniature auto
                            </p>
                          </div>

                          {videoUrlInput && isCloudinaryUrl(videoUrlInput) && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30">
                              <Check className="w-3.5 h-3.5" />
                              <span>Fichier hébergé sur Cloudinary avec succès</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {fileUploadError && (
                      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{fileUploadError}</span>
                      </div>
                    )}

                    {/* Résumé des optimisations Cloudinary */}
                    <div className="p-3 rounded-2xl bg-sky-950/30 border border-sky-900/40 text-[11px] text-sky-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-sky-300">
                        <Zap className="w-3.5 h-3.5 text-sky-400" />
                        <span>Optimisations automatiques Cloudinary pour Kinshasa :</span>
                      </div>
                      <p className="text-slate-300 text-[10px] leading-relaxed">
                        • Compression intelligente <code>q_auto</code> : économise jusqu'à 60% de données mobiles pour les acheteurs.<br />
                        • Encodage adaptatif <code>f_auto</code> : diffusion fluide selon le smartphone (Android/iOS).<br />
                        • Extraction de miniature automatique : affiche instantanément la 1ère image du bien.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <input
                      type="url"
                      value={videoUrlInput}
                      onChange={(e) => setVideoUrlInput(e.target.value)}
                      placeholder="https://res.cloudinary.com/... ou https://.../video.mp4"
                      className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                    <p className="text-[10px] text-slate-500">
                      Renseignez l'URL HTTPS directe de votre vidéo hébergée (Cloudinary, AWS, Hostinger, etc.).
                    </p>
                  </div>
                )}
              </div>

              {/* 3. Miniature de couverture */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  3. Miniature de couverture {isCloudinaryUrl(videoUrlInput) ? '(Générée par Cloudinary)' : '(facultatif)'}
                </label>
                <input
                  type="url"
                  value={thumbnailUrlInput}
                  onChange={(e) => setThumbnailUrlInput(e.target.value)}
                  placeholder="https://... (Générée automatiquement par Cloudinary si vide)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* 4. Description facultative */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  4. Description / Points forts de la visite (facultatif)
                </label>
                <textarea
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  rows={2}
                  placeholder="Visite complète du salon lumineux, suite parentale et terrasse avec vue fleuve..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* 5. Aperçu avant publication */}
              {videoUrlInput && (
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Aperçu du flux vidéo</span>
                    </span>
                    {isCloudinaryUrl(videoUrlInput) && (
                      <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-800">
                        Cloudinary Stream HD
                      </span>
                    )}
                  </div>
                  <div className="relative aspect-video max-h-48 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                    <video
                      src={
                        isCloudinaryUrl(videoUrlInput)
                          ? getCloudinaryOptimizedVideoUrl(videoUrlInput, { quality: 'auto:good' })
                          : videoUrlInput
                      }
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* 6. Boutons d'action (Brouillon vs Soumettre) */}
              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => handleSubmit('draft')}
                  disabled={isSubmitting || isUploadingToCloudinary}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Enregistrer en Brouillon
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingToCloudinary}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Soumettre pour Validation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Paramètres Cloudinary */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Configuration Cloudinary</h3>
                  <p className="text-xs text-slate-400">Paramétrez votre cloud d'hébergement vidéo</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCloudinaryConfig} className="space-y-4">
              {/* Raccourci Collage URL Cloudinary */}
              <div className="p-3.5 rounded-2xl bg-sky-950/40 border border-sky-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                    <span>Coller votre lien CLOUDINARY_URL</span>
                  </label>
                  <span className="text-[10px] text-sky-400/80 font-semibold">Remplissage automatique</span>
                </div>
                <input
                  type="text"
                  placeholder="CLOUDINARY_URL=cloudinary://<clé>:<secret>@ljcl1c4t"
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (!val) return;
                    const clean = val.replace(/^CLOUDINARY_URL=/, '').trim();
                    const match = clean.match(/cloudinary:\/\/([^:]+):([^@]+)@([^\/\s]+)/);
                    if (match) {
                      const extractedKey = match[1];
                      const extractedSecret = match[2];
                      const extractedCloud = match[3];

                      if (extractedCloud && !extractedCloud.includes('<')) {
                        setConfigCloudName(extractedCloud);
                      }
                      if (extractedKey && !extractedKey.includes('<your_')) {
                        setConfigApiKey(extractedKey);
                      }
                      if (extractedSecret && !extractedSecret.includes('<your_')) {
                        setConfigApiSecret(extractedSecret);
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700/80 text-sky-200 text-xs font-mono focus:outline-none focus:border-sky-400"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  💡 <strong className="text-slate-300">Astuce :</strong> Sur Cloudinary, cliquez sur la petite icône <strong className="text-white">👁️ (œil)</strong> ou le bouton <strong className="text-white">Copy API secret</strong> pour afficher les vrais numéros au lieu de <code className="text-amber-400">&lt;your_api_key&gt;</code>.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Cloud Name <span className="text-sky-400">*</span>
                </label>
                <input
                  type="text"
                  value={configCloudName}
                  onChange={(e) => setConfigCloudName(e.target.value)}
                  placeholder="ex: ljcl1c4t"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  API Key (numéro de 15 chiffres)
                </label>
                <input
                  type="text"
                  value={configApiKey}
                  onChange={(e) => setConfigApiKey(e.target.value)}
                  placeholder="ex: 123456789012345"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  API Secret (clé secrète affichée après avoir cliqué sur l'œil 👁️)
                </label>
                <input
                  type="password"
                  value={configApiSecret}
                  onChange={(e) => setConfigApiSecret(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block">
                    Upload Preset (Recommandé pour téléversement direct)
                  </label>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    Mode Unsigned
                  </span>
                </div>
                <input
                  type="text"
                  value={configPreset}
                  onChange={(e) => setConfigPreset(e.target.value)}
                  placeholder="ex: kinimmo_videos"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              {cloudinaryTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    cloudinaryTestResult.success
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {cloudinaryTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{cloudinaryTestResult.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleTestCloudinary}
                  disabled={isTestingCloudinary}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {isTestingCloudinary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  <span>Tester la connexion</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingConfig}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black transition-all cursor-pointer"
                >
                  {isSavingConfig ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Visionneuse Vidéo Réel */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative max-w-sm w-full aspect-[9/16] bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
            <button
              onClick={() => setPreviewVideo(null)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <video
              src={
                isCloudinaryUrl(previewVideo.videoUrl)
                  ? getCloudinaryOptimizedVideoUrl(previewVideo.videoUrl, { quality: 'auto:good' })
                  : previewVideo.videoUrl
              }
              autoPlay
              controls
              playsInline
              className="w-full h-full object-cover"
            />

            <div className="absolute bottom-4 left-4 right-4 z-10 bg-black/60 backdrop-blur-md p-3 rounded-2xl text-white space-y-1">
              <h4 className="text-xs font-black line-clamp-1">{previewVideo.propertyTitle}</h4>
              <p className="text-[11px] text-emerald-400 font-bold">
                {previewVideo.propertyPrice ? `$${previewVideo.propertyPrice.toLocaleString()}` : ''} • {previewVideo.propertyCommune}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
