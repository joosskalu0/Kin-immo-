import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Property, PropertyType, PropertyStatus, PropertyLabel, PropertyImageMeta, User } from '../../types';
import { resolveMediaUrl, extractCloudinaryPublicIdFromUrl, getOptimizedImageUrl } from '../../utils/mediaUrl';
import {
  MIN_PROPERTY_PHOTOS,
  RECOMMENDED_PROPERTY_PHOTOS,
  MAX_PROPERTY_PHOTOS,
  MAX_VIDEO_DURATION_SECONDS,
  DEFAULT_VIRTUAL_TOUR_DOMAINS,
  validateImageFile,
  validateVideoFileAndDuration,
  compressImageFileToBlob,
  computeImageDHash,
  validateVirtualTourUrl,
  formatBytesCompact,
} from '../../utils/mediaTools';
import {
  KINSHASA_COMMUNES_DATA,
  getQuartiersForCommune,
  getPopularAvenuesForCommune,
} from '../../data/kinshasaLocations';
import {
  Building2,
  MapPin,
  Image as ImageIcon,
  Video,
  Lock,
  Camera,
  Upload,
  Plus,
  Trash2,
  Star,
  ArrowLeft,
  ArrowRight,
  FileImage,
  Globe,
  Save,
  Loader2,
  Check,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  Film,
  FileVideo,
  VideoOff,
  Sparkles,
  Play,
  GripVertical,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import { SAMPLE_REAL_ESTATE_VIDEOS, detectVideoType } from '../../utils/videoHelpers';
import { PropertyVideoPlayer } from '../PropertyVideoPlayer';
import { analyzePropertyForFraud } from '../../utils/suspiciousListingDetector';
import {
  uploadImageToCloudinary,
  uploadVideoWithProgress,
  destroyCloudinaryMedia,
  checkImageFingerprints,
  FingerprintMatch,
} from '../../services/cloudinaryService';
import { resolveAccountBillingSummary } from '../../utils/billingHelpers';
import { EmptyState, ErrorState, PageHeaderBar } from '../StateFeedback';
import { goBackOrFallback } from '../../utils/navigation';

interface PublishPageProps {
  editPropertyId?: string | null;
  onNavigatePath: (path: string) => void;
}

export const PublishPage: React.FC<PublishPageProps> = ({
  editPropertyId,
  onNavigatePath,
}) => {
  const {
    editingProperty,
    setEditingProperty,
    addProperty,
    updateProperty,
    customFields,
    user,
    properties,
    reports,
    subscriptionPlans,
    propertyVideos,
    agents,
    agencies,
    agencyCollaborators,
    contactSettings,
  } = useApp();

  const resolvedEditingProperty = React.useMemo(() => {
    if (editPropertyId) {
      return properties.find((p) => p.id === editPropertyId) || editingProperty || null;
    }
    return editingProperty || null;
  }, [editPropertyId, properties, editingProperty]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; hint: string } | null>(null);
  const [isCompressingImages, setIsCompressingImages] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState<string | null>(null);

  // Accordion optional sections for <= 2 taps publishing
  const [openSpecs, setOpenSpecs] = useState(false);
  const [openAdvancedMedia, setOpenAdvancedMedia] = useState(false);
  const [openPrivatePro, setOpenPrivatePro] = useState(false);

  // Inline completion / moderation result (no stacked modal!)
  const [completionState, setCompletionState] = useState<{
    mode: 'published' | 'draft' | 'review_required' | 'suspect';
    title: string;
    message: string;
    flags: string[];
    propertyId?: string;
  } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(150000);
  const [currency] = useState('USD');
  const [type, setType] = useState<PropertyType>('apartment');
  const [status, setStatus] = useState<PropertyStatus>('for-sale');
  const [category] = useState('Résidentiel Haut de Gamme');
  const [labels, setLabels] = useState<PropertyLabel[]>(['new']);

  // Kinshasa Location Specifics
  const [commune, setCommune] = useState<string>('Gombe');
  const [quartier, setQuartier] = useState<string>('Centre-Ville / 30 Juin');
  const [avenue, setAvenue] = useState<string>('Boulevard du 30 Juin');
  const [referencePoint, setReferencePoint] = useState<string>('');
  const [address, setAddress] = useState('Boulevard du 30 Juin, Gombe, Kinshasa');
  const [city, setCity] = useState('Kinshasa');
  const [zipCode, setZipCode] = useState('KN-01');
  const [country, setCountry] = useState('RDC');
  const [lat, setLat] = useState<number>(-4.3224);
  const [lng, setLng] = useState<number>(15.3070);

  // Specs
  const [bedrooms, setBedrooms] = useState<number>(3);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [area, setArea] = useState<number>(120);
  const [yearBuilt] = useState<number>(2022);
  const [garages, setGarages] = useState<number>(1);

  const availableAmenities = [
    'Climatisation',
    'Groupe électrogène',
    'Forage / Citerne',
    'Sécurité 24/7',
    'Piscine',
    'Terrasse',
    'Garage / Parking',
    'Fibre Optique',
    'Panneaux solaires',
    'Ascenseur',
  ];
  const [amenities, setAmenities] = useState<string[]>(['Climatisation', 'Sécurité 24/7']);

  // Media
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagesMeta, setImagesMeta] = useState<PropertyImageMeta[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [duplicateAlert, setDuplicateAlert] = useState<{ matches: FingerprintMatch[] } | null>(null);

  const [floorPlanUrl, setFloorPlanUrl] = useState('');
  const [floorPlanPublicId, setFloorPlanPublicId] = useState<string | undefined>(undefined);
  const [floorPlanAlt, setFloorPlanAlt] = useState('');
  const [isUploadingFloorPlan, setIsUploadingFloorPlan] = useState(false);

  const [videoUrl, setVideoUrl] = useState('');
  const [videoPublicId, setVideoPublicId] = useState<string | undefined>(undefined);
  const [videoDuration, setVideoDuration] = useState<number | undefined>(undefined);
  const [virtualTourUrl, setVirtualTourUrl] = useState('');
  const [virtualTourError, setVirtualTourError] = useState<string | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);
  const [videoUploadSuccess, setVideoUploadSuccess] = useState<string | null>(null);

  const [customFieldsState, setCustomFieldsState] = useState<Record<string, any>>({});

  // Private Fields State
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [internalNotes, setInternalNotes] = useState('');
  const [keyBoxCode, setKeyBoxCode] = useState('');

  useEffect(() => {
    if (resolvedEditingProperty) {
      setTitle(resolvedEditingProperty.title);
      setDescription(resolvedEditingProperty.description);
      setPrice(resolvedEditingProperty.price);
      setType(resolvedEditingProperty.type);
      setStatus(resolvedEditingProperty.status);
      setLabels(resolvedEditingProperty.labels || []);
      setCommune(resolvedEditingProperty.commune || 'Gombe');
      setQuartier(resolvedEditingProperty.quartier || 'Centre-Ville / 30 Juin');
      setAvenue(resolvedEditingProperty.avenue || 'Boulevard du 30 Juin');
      setReferencePoint(resolvedEditingProperty.referencePoint || '');
      setAddress(resolvedEditingProperty.address);
      setCity(resolvedEditingProperty.city || 'Kinshasa');
      setZipCode(resolvedEditingProperty.zipCode || 'KN-01');
      setCountry(resolvedEditingProperty.country || 'RDC');
      setLat(resolvedEditingProperty.lat || -4.3224);
      setLng(resolvedEditingProperty.lng || 15.3070);
      setBedrooms(resolvedEditingProperty.bedrooms);
      setBathrooms(resolvedEditingProperty.bathrooms);
      setArea(resolvedEditingProperty.area);
      setGarages(resolvedEditingProperty.garages || 0);
      setAmenities(resolvedEditingProperty.amenities || []);

      const resolvedImgs = Array.isArray(resolvedEditingProperty.images)
        ? resolvedEditingProperty.images.map((u) => resolveMediaUrl(u)).filter(Boolean)
        : [];
      const existingMetaMap = new Map<string, PropertyImageMeta>();
      if (Array.isArray(resolvedEditingProperty.imagesMeta)) {
        resolvedEditingProperty.imagesMeta.forEach((m) => {
          if (m?.url) existingMetaMap.set(resolveMediaUrl(m.url), m);
        });
      }
      const hydratedMetas: PropertyImageMeta[] = resolvedImgs.map((u, idx) => {
        const matched = existingMetaMap.get(u) || resolvedEditingProperty.imagesMeta?.[idx];
        return {
          url: u,
          publicId: matched?.publicId || extractCloudinaryPublicIdFromUrl(u),
          alt: matched?.alt || '',
          fingerprint: matched?.fingerprint || resolvedEditingProperty.imageFingerprints?.[idx],
          width: matched?.width,
          height: matched?.height,
          bytes: matched?.bytes,
          format: matched?.format,
        };
      });
      setImageUrls(resolvedImgs);
      setImagesMeta(hydratedMetas);

      setFloorPlanUrl(resolvedEditingProperty.floorPlanUrl ? resolveMediaUrl(resolvedEditingProperty.floorPlanUrl) : '');
      setFloorPlanPublicId(
        resolvedEditingProperty.floorPlanPublicId || extractCloudinaryPublicIdFromUrl(resolvedEditingProperty.floorPlanUrl)
      );
      setFloorPlanAlt(resolvedEditingProperty.floorPlanAlt || '');

      const resolvedVid = resolvedEditingProperty.videoUrl ? resolveMediaUrl(resolvedEditingProperty.videoUrl) : '';
      setVideoUrl(resolvedVid);
      setVideoPublicId(resolvedEditingProperty.videoPublicId || extractCloudinaryPublicIdFromUrl(resolvedVid));
      setVideoDuration(resolvedEditingProperty.videoDuration);
      setVirtualTourUrl(resolvedEditingProperty.virtualTourUrl || '');
      setVirtualTourError(null);
      setDuplicateAlert(null);
      setCustomFieldsState(resolvedEditingProperty.customFields || {});

      if (resolvedEditingProperty.privateFields) {
        setOwnerName(resolvedEditingProperty.privateFields.ownerName || '');
        setOwnerPhone(resolvedEditingProperty.privateFields.ownerPhone || '');
        setOwnerEmail(resolvedEditingProperty.privateFields.ownerEmail || '');
        setCommissionRate(resolvedEditingProperty.privateFields.commissionRate || 5);
        setInternalNotes(resolvedEditingProperty.privateFields.internalNotes || '');
        setKeyBoxCode(resolvedEditingProperty.privateFields.keyBoxCode || '');
      }
    } else {
      const defaults: Record<string, any> = {};
      customFields.forEach((f) => {
        if (f.defaultValue !== undefined) {
          defaults[f.key] = f.defaultValue;
        }
      });
      setCustomFieldsState(defaults);
    }
  }, [resolvedEditingProperty, customFields]);

  // Règle métier : Connexion obligatoire
  if (!user) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PageHeaderBar title="Publier un bien" fallbackPath="/" onBack={() => goBackOrFallback('/', onNavigatePath)} />
        <EmptyState
          icon={Lock}
          title="Connectez-vous pour publier"
          description="La publication d'une annonce est réservée aux comptes connectés afin de garantir la fiabilité des contacts."
          actionLabel="Se connecter / Créer un compte"
          onAction={() => onNavigatePath('/connexion?next=/publier')}
          secondaryLabel="Retour à l'accueil"
          onSecondaryAction={() => onNavigatePath('/')}
        />
      </div>
    );
  }

  const userAgency = agencies.find(
    (a) =>
      a.id === user.agencyId ||
      (a.name && user.agencyName && a.name.toLowerCase() === user.agencyName.toLowerCase()) ||
      (a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase())
  );
  const collabCount = userAgency
    ? Math.max(1, agencyCollaborators.filter((c) => c.agencyId === userAgency.id).length)
    : undefined;
  const billingSummary = resolveAccountBillingSummary({
    user,
    agency: userAgency,
    plans: subscriptionPlans,
    properties,
    propertyVideos,
    agents,
    collaboratorsCount: collabCount,
  });
  const isAdminUser = user.role === 'admin';
  const maxListingsCap = billingSummary.limits.maxListings;
  const maxPhotosCap = billingSummary.limits.maxPhotos;
  const effectiveMaxPhotos = isAdminUser ? MAX_PROPERTY_PHOTOS : Math.min(MAX_PROPERTY_PHOTOS, maxPhotosCap);
  const maxVideosCap = billingSummary.limits.maxVideos;
  const activeListingsUsed = billingSummary.usage.activeListings;
  const videosUsed = billingSummary.usage.videosCount;
  const isNewListingQuotaExceeded = !isAdminUser && !resolvedEditingProperty && activeListingsUsed >= maxListingsCap;
  const allowedTourDomains = contactSettings?.virtualTourAllowedDomains || DEFAULT_VIRTUAL_TOUR_DOMAINS;

  const runDuplicateFingerprintCheck = async (fingerprints: string[], urls: string[]) => {
    const cleanHashes = fingerprints.filter(Boolean);
    const cleanUrls = urls.filter(Boolean);
    if (cleanHashes.length === 0 && cleanUrls.length === 0) return;

    const res = await checkImageFingerprints({
      fingerprints: cleanHashes,
      imageUrls: cleanUrls,
      excludePropertyId: resolvedEditingProperty?.id,
    });
    if (res.duplicateDetected && res.matches.length > 0) {
      setDuplicateAlert({ matches: res.matches });
    }
  };

  const handleAddImage = async () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    if (imageUrls.length >= effectiveMaxPhotos) {
      setSubmitError({
        message: `Limite de photos atteinte (${effectiveMaxPhotos} photos max).`,
        hint: 'Retirez une photo existante avant d’en ajouter une nouvelle.',
      });
      return;
    }
    setSubmitError(null);
    const meta: PropertyImageMeta = {
      url: trimmed,
      publicId: extractCloudinaryPublicIdFromUrl(trimmed),
      alt: '',
    };
    setImageUrls((prev) => [...prev, trimmed]);
    setImagesMeta((prev) => [...prev, meta]);
    setNewImageUrl('');
    runDuplicateFingerprintCheck([], [trimmed]).catch(() => {});
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (imageUrls.length >= effectiveMaxPhotos) {
      setSubmitError({
        message: `Limite atteinte : maximum ${effectiveMaxPhotos} photo(s) par annonce.`,
        hint: 'Supprimez une photo ou passez à une formule supérieure.',
      });
      e.target.value = '';
      return;
    }

    setSubmitError(null);
    setIsCompressingImages(true);
    try {
      const remainingSlots = Math.max(0, effectiveMaxPhotos - imageUrls.length);
      const fileList = Array.from(files).slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        setSubmitError({
          message: `Seules ${remainingSlots} photo(s) ont été ajoutées (plafond de ${effectiveMaxPhotos} atteint).`,
          hint: 'Vérifiez votre galerie ci-dessous.',
        });
      }

      const uploadedMetas: PropertyImageMeta[] = [];
      let lastUploadError: string | null = null;

      for (let idx = 0; idx < fileList.length; idx++) {
        const file = fileList[idx];
        const validation = validateImageFile(file);
        if (!validation.valid) {
          lastUploadError = validation.error || 'Fichier image invalide.';
          continue;
        }

        setImageUploadStatus(`Préparation (${idx + 1}/${fileList.length}) : ${file.name}...`);
        try {
          const compressed = await compressImageFileToBlob(file, 1600, 0.82);
          const dhash = await computeImageDHash(compressed.file);

          setImageUploadStatus(
            `Envoi sécurisé (${idx + 1}/${fileList.length}) — ${formatBytesCompact(compressed.compressedBytes)}...`
          );

          const result = await uploadImageToCloudinary(
            compressed.file,
            undefined,
            'kinimmo/property_images',
            {
              purpose: 'property_photo',
              mimeType: compressed.mimeType,
              fileSize: compressed.compressedBytes,
              currentPhotoCount: imageUrls.length + uploadedMetas.length,
            }
          );

          if (result.secure_url) {
            uploadedMetas.push({
              url: result.secure_url,
              publicId: result.public_id || extractCloudinaryPublicIdFromUrl(result.secure_url),
              alt: '',
              fingerprint: dhash || undefined,
              width: result.width || compressed.width,
              height: result.height || compressed.height,
              bytes: result.bytes || compressed.compressedBytes,
              format: result.format,
            });
          }
        } catch (err: any) {
          lastUploadError = err?.message || 'Impossible d’envoyer la photo.';
        }
      }

      if (uploadedMetas.length > 0) {
        const newUrls = uploadedMetas.map((m) => m.url);
        const newHashes = uploadedMetas.map((m) => m.fingerprint).filter((h): h is string => Boolean(h));
        setImageUrls((prev) => [...prev, ...newUrls]);
        setImagesMeta((prev) => [...prev, ...uploadedMetas]);
        runDuplicateFingerprintCheck(newHashes, newUrls).catch(() => {});
      }

      if (lastUploadError) {
        setSubmitError({
          message:
            uploadedMetas.length > 0
              ? `${uploadedMetas.length} photo(s) ajoutée(s), erreur sur une image : ${lastUploadError}`
              : lastUploadError,
          hint: 'Utilisez des images JPEG, PNG ou WebP de moins de 10 Mo et vérifiez votre connexion.',
        });
      }
    } catch (err: any) {
      setSubmitError({
        message: err?.message || 'Erreur lors de l’envoi des photos.',
        hint: 'Vérifiez votre connexion Internet et réessayez.',
      });
    } finally {
      setIsCompressingImages(false);
      setImageUploadStatus(null);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    const targetUrl = imageUrls[index];
    const targetMeta = imagesMeta[index];
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
    setImagesMeta((prev) => prev.filter((_, i) => i !== index));

    if (targetMeta?.publicId || (targetUrl && targetUrl.includes('cloudinary.com'))) {
      destroyCloudinaryMedia({
        publicId: targetMeta?.publicId,
        url: targetUrl,
        resourceType: 'image',
        propertyId: resolvedEditingProperty?.id,
      }).catch(() => {});
    }
  };

  const moveImageOrder = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= imageUrls.length ||
      toIndex >= imageUrls.length
    ) {
      return;
    }
    setImageUrls((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setImagesMeta((prev) => {
      const next = [...prev];
      const moved = next[fromIndex] || { url: imageUrls[fromIndex], alt: '' };
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleUpdateImageAlt = (index: number, altValue: string) => {
    setImagesMeta((prev) => {
      const next = [...prev];
      const existing = next[index] || { url: imageUrls[index] || '' };
      next[index] = { ...existing, alt: altValue };
      return next;
    });
  };

  const handleFloorPlanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setSubmitError({
        message: validation.error || 'Plan invalide (JPEG, PNG ou WebP, 10 Mo max).',
        hint: 'Importez un fichier image valide.',
      });
      e.target.value = '';
      return;
    }

    setSubmitError(null);
    setIsUploadingFloorPlan(true);
    try {
      const compressed = await compressImageFileToBlob(file, 1800, 0.86);
      const result = await uploadImageToCloudinary(
        compressed.file,
        undefined,
        'kinimmo/floor_plans',
        {
          purpose: 'floor_plan',
          mimeType: compressed.mimeType,
          fileSize: compressed.compressedBytes,
        }
      );

      if (floorPlanUrl && (floorPlanPublicId || floorPlanUrl.includes('cloudinary.com'))) {
        destroyCloudinaryMedia({
          publicId: floorPlanPublicId,
          url: floorPlanUrl,
          resourceType: 'image',
          propertyId: resolvedEditingProperty?.id,
        }).catch(() => {});
      }

      setFloorPlanUrl(result.secure_url);
      setFloorPlanPublicId(result.public_id || extractCloudinaryPublicIdFromUrl(result.secure_url));
      if (!floorPlanAlt) {
        setFloorPlanAlt(`Plan du bien — ${title || 'Propriété Kinshasa'}`);
      }
    } catch (err: any) {
      setSubmitError({
        message: err?.message || 'Impossible de téléverser le plan.',
        hint: 'Vérifiez votre connexion et réessayez.',
      });
    } finally {
      setIsUploadingFloorPlan(false);
      e.target.value = '';
    }
  };

  const handleRemoveFloorPlan = () => {
    const prevUrl = floorPlanUrl;
    const prevPubId = floorPlanPublicId;
    setFloorPlanUrl('');
    setFloorPlanPublicId(undefined);
    setFloorPlanAlt('');
    if (prevUrl && (prevPubId || prevUrl.includes('cloudinary.com'))) {
      destroyCloudinaryMedia({
        publicId: prevPubId,
        url: prevUrl,
        resourceType: 'image',
        propertyId: resolvedEditingProperty?.id,
      }).catch(() => {});
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAddingNewVideo = !resolvedEditingProperty?.videoUrl;
    if (!isAdminUser && isAddingNewVideo && videosUsed >= maxVideosCap) {
      setVideoUploadError(
        maxVideosCap === 0
          ? `Votre formule ${billingSummary.plan.name} n'inclut pas la vidéo. Passez à une formule supérieure.`
          : `Quota vidéo atteint (${videosUsed}/${maxVideosCap}).`
      );
      e.target.value = '';
      return;
    }

    setVideoUploadError(null);
    setVideoUploadSuccess(null);

    const vCheck = await validateVideoFileAndDuration(file);
    if (!vCheck.valid) {
      setVideoUploadError(vCheck.error || 'Vidéo non conforme (60s max, 100 Mo max).');
      e.target.value = '';
      return;
    }

    setVideoUploading(true);
    setVideoUploadProgress(5);

    try {
      const result = await uploadVideoWithProgress(
        file,
        (percent) => setVideoUploadProgress(Math.max(5, percent)),
        'kinimmo/property_videos',
        {
          purpose: 'property_video',
          mimeType: file.type,
          fileSize: file.size,
          duration: vCheck.duration,
        }
      );

      if (result.success && result.secure_url) {
        if (videoUrl && (videoPublicId || videoUrl.includes('cloudinary.com'))) {
          destroyCloudinaryMedia({
            publicId: videoPublicId,
            url: videoUrl,
            resourceType: 'video',
            propertyId: resolvedEditingProperty?.id,
          }).catch(() => {});
        }
        setVideoUrl(result.secure_url);
        setVideoPublicId(result.public_id || extractCloudinaryPublicIdFromUrl(result.secure_url));
        setVideoDuration(result.duration || vCheck.duration);
        setVideoUploadProgress(100);
        setVideoUploadSuccess(
          `Vidéo ajoutée (${Math.round(result.duration || vCheck.duration || 0)}s). Elle sera visible après vérification.`
        );
      } else {
        throw new Error(result.message || 'Échec de l’envoi vidéo.');
      }
    } catch (err: any) {
      setVideoUploadError(err?.message || "Impossible d'envoyer la vidéo.");
    } finally {
      setVideoUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveVideo = () => {
    const prevUrl = videoUrl;
    const prevPubId = videoPublicId;
    setVideoUrl('');
    setVideoPublicId(undefined);
    setVideoDuration(undefined);
    setVideoUploadError(null);
    setVideoUploadSuccess(null);
    if (prevUrl && (prevPubId || prevUrl.includes('cloudinary.com'))) {
      destroyCloudinaryMedia({
        publicId: prevPubId,
        url: prevUrl,
        resourceType: 'video',
        propertyId: resolvedEditingProperty?.id,
      }).catch(() => {});
    }
  };

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const toggleLabel = (label: PropertyLabel) => {
    setLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const saveProperty = async (targetMode: 'PUBLISHED' | 'DRAFT') => {
    setSubmitError(null);

    if (!title || !title.trim()) {
      setSubmitError({
        message: "Le titre de l'annonce est manquant.",
        hint: 'Ajoutez un titre court (ex: Villa 4 chambres à Gombe).',
      });
      return;
    }

    if (targetMode === 'PUBLISHED') {
      if (!price || Number(price) <= 0) {
        setSubmitError({
          message: 'Le prix doit être supérieur à 0 USD.',
          hint: 'Indiquez le prix de vente ou le loyer mensuel.',
        });
        return;
      }

      if (!description || !description.trim()) {
        setSubmitError({
          message: 'La description est obligatoire pour publier.',
          hint: 'Décrivez en quelques lignes les atouts du bien.',
        });
        return;
      }

      if (!commune || !commune.trim()) {
        setSubmitError({
          message: 'La commune est requise.',
          hint: 'Choisissez la commune à Kinshasa.',
        });
        return;
      }

      if (imageUrls.length < MIN_PROPERTY_PHOTOS) {
        setSubmitError({
          message: `Minimum ${MIN_PROPERTY_PHOTOS} photos requises pour publier (${imageUrls.length}/${MIN_PROPERTY_PHOTOS}).`,
          hint: 'Ajoutez les photos manquantes ou appuyez sur « Enregistrer en brouillon ».',
        });
        return;
      }
    }

    if (imageUrls.length > effectiveMaxPhotos) {
      setSubmitError({
        message: `Maximum ${effectiveMaxPhotos} photos autorisées (${imageUrls.length} ajoutées).`,
        hint: 'Retirez les photos en trop.',
      });
      return;
    }

    const vtCheck = validateVirtualTourUrl(virtualTourUrl, allowedTourDomains);
    if (!vtCheck.valid) {
      setVirtualTourError(vtCheck.error || 'Domaine de visite virtuelle non autorisé.');
      setOpenAdvancedMedia(true);
      setSubmitError({
        message: vtCheck.error || 'Lien de visite virtuelle invalide.',
        hint: `Utilisez un lien ${allowedTourDomains.slice(0, 4).join(', ')} ou videz ce champ.`,
      });
      return;
    }

    if (videoDuration && videoDuration > MAX_VIDEO_DURATION_SECONDS) {
      setSubmitError({
        message: `La vidéo dépasse ${MAX_VIDEO_DURATION_SECONDS} secondes.`,
        hint: 'Remplacez la vidéo par un extrait plus court.',
      });
      return;
    }

    if (!isAdminUser) {
      const willPublishSlot =
        targetMode === 'PUBLISHED' &&
        (!resolvedEditingProperty ||
          resolvedEditingProperty.softHiddenByPlan ||
          resolvedEditingProperty.published === false);
      if (willPublishSlot && activeListingsUsed >= maxListingsCap) {
        setSubmitError({
          message: `Quota d'annonces actives atteint (${activeListingsUsed}/${maxListingsCap}).`,
          hint: 'Enregistrez en brouillon ou mettez votre formule à niveau.',
        });
        return;
      }
    }

    setIsSubmitting(true);

    const syncedMetas: PropertyImageMeta[] = imageUrls.map((url, idx) => ({
      ...(imagesMeta[idx] || { url }),
      url,
      publicId: imagesMeta[idx]?.publicId || extractCloudinaryPublicIdFromUrl(url),
    }));
    const fingerprints = syncedMetas
      .map((m) => m.fingerprint)
      .filter((fp): fp is string => Boolean(fp));

    const propId = resolvedEditingProperty ? resolvedEditingProperty.id : `prop_${Date.now()}`;
    const propertyData: Property = {
      id: propId,
      title: title.trim(),
      description: description || '',
      price: Number(price) || 0,
      currency,
      period: status === 'for-rent' ? 'month' : 'total',
      type,
      status,
      listingStatus: targetMode === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      labels,
      category,
      commune,
      quartier,
      avenue,
      referencePoint: referencePoint || undefined,
      address:
        address || `${avenue ? avenue + ', ' : ''}${quartier ? quartier + ', ' : ''}${commune}, Kinshasa`,
      city: city || 'Kinshasa',
      zipCode: zipCode || 'KN-01',
      country: country || 'RDC',
      lat,
      lng,
      bedrooms,
      bathrooms,
      area,
      yearBuilt,
      garages,
      amenities,
      images: imageUrls,
      imagesMeta: syncedMetas,
      imageFingerprints: fingerprints,
      videoUrl: videoUrl.trim() || undefined,
      videoPublicId: videoUrl.trim() ? (videoPublicId || extractCloudinaryPublicIdFromUrl(videoUrl)) : undefined,
      videoDuration: videoUrl.trim() ? videoDuration : undefined,
      virtualTourUrl: vtCheck.normalizedUrl || undefined,
      floorPlanUrl: floorPlanUrl.trim() || undefined,
      floorPlanPublicId: floorPlanUrl.trim()
        ? (floorPlanPublicId || extractCloudinaryPublicIdFromUrl(floorPlanUrl))
        : undefined,
      floorPlanAlt: floorPlanUrl.trim() ? (floorPlanAlt.trim() || undefined) : undefined,
      customFields: customFieldsState,
      privateFields: {
        ownerName: ownerName || user.name || '',
        ownerPhone: ownerPhone || user.phone || '',
        ownerEmail: ownerEmail || user.email || '',
        commissionRate,
        internalNotes,
        keyBoxCode,
      },
      agentId: resolvedEditingProperty?.agentId || user.agentId || user.id,
      agencyId: resolvedEditingProperty?.agencyId || user.agencyId || (user.role === 'agency' ? user.id : undefined),
      agencyName: resolvedEditingProperty?.agencyName || user.agencyName || (user.role === 'agency' ? user.name : undefined),
      contactEmail: resolvedEditingProperty?.contactEmail || user.email || undefined,
      contactPhone: resolvedEditingProperty?.contactPhone || user.phone || undefined,
      createdAt: resolvedEditingProperty ? resolvedEditingProperty.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewsCount: resolvedEditingProperty ? resolvedEditingProperty.viewsCount : 1,
      featured: labels.includes('featured'),
      published: targetMode === 'PUBLISHED',
    };

    const fraudAnalysis = analyzePropertyForFraud(propertyData, properties, reports);
    const mergedFlags = [...fraudAnalysis.flags];
    let mergedScore = fraudAnalysis.riskScore;
    let mergedVerdict = fraudAnalysis.verdict;

    if (
      duplicateAlert &&
      duplicateAlert.matches.length > 0 &&
      !mergedFlags.some((f) => f.code === 'DUPLICATE_PHOTOS')
    ) {
      mergedScore = Math.min(100, mergedScore + 35);
      mergedFlags.push({
        code: 'DUPLICATE_PHOTOS',
        label: 'Empreinte photo déjà utilisée sur une autre annonce',
        severity: 'high',
        score: 35,
        details: `${duplicateAlert.matches.length} correspondance(s) visuelle(s) détectée(s).`,
      });
      if (mergedVerdict === 'normal') {
        mergedVerdict = 'review_required';
      }
    }

    const enrichedData: Property = {
      ...propertyData,
      fraudStatus: mergedVerdict,
      fraudScore: mergedScore,
      fraudFlags: mergedFlags,
      fraudLastCheckedAt: fraudAnalysis.analyzedAt,
      published: targetMode === 'PUBLISHED' && mergedVerdict !== 'suspect',
    };

    try {
      if (resolvedEditingProperty) {
        await updateProperty(enrichedData);
      } else {
        await addProperty(enrichedData);
      }
      setEditingProperty(null);
      setIsSubmitting(false);

      if (targetMode === 'DRAFT') {
        setCompletionState({
          mode: 'draft',
          title: 'Brouillon enregistré',
          message:
            duplicateAlert && duplicateAlert.matches.length > 0
              ? 'Votre brouillon est sauvegardé. Note : des photos similaires ont été signalées pour contrôle.'
              : 'Votre brouillon est sauvegardé. Vous pourrez le compléter et le publier à tout moment.',
          flags: mergedFlags.map((f) => f.label),
          propertyId: enrichedData.id,
        });
      } else if (mergedVerdict === 'suspect') {
        setCompletionState({
          mode: 'suspect',
          title: 'Annonce mise en attente de sécurité',
          message:
            'Notre contrôle automatique a détecté un point à vérifier. Notre équipe l’examinera rapidement avant sa mise en ligne.',
          flags: mergedFlags.map((f) => f.label),
          propertyId: enrichedData.id,
        });
      } else if (mergedVerdict === 'review_required') {
        setCompletionState({
          mode: 'review_required',
          title: 'Annonce envoyée pour vérification',
          message:
            'Votre annonce est enregistrée. Un signalement (ex: photo similaire) nécessite une validation rapide.',
          flags: mergedFlags.map((f) => f.label),
          propertyId: enrichedData.id,
        });
      } else {
        setCompletionState({
          mode: 'published',
          title: resolvedEditingProperty ? 'Annonce mise à jour' : 'Annonce publiée avec succès',
          message: 'Votre bien est maintenant en ligne et visible sur Kinimmo.',
          flags: [],
          propertyId: enrichedData.id,
        });
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setSubmitError({
        message: err?.message || "Impossible d'enregistrer l'annonce pour le moment.",
        hint: 'Vérifiez votre connexion Internet et réessayez.',
      });
    }
  };

  // Écran de confirmation inline (sans fenêtre superposée)
  if (completionState) {
    const isPro = user.role === 'agent' || user.role === 'agency';
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <PageHeaderBar
          title={completionState.title}
          fallbackPath={isPro ? '/pro/annonces' : '/'}
          onBack={() => onNavigatePath(isPro ? '/pro/annonces' : '/')}
        />
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-2xs">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ${
              completionState.mode === 'published'
                ? 'bg-emerald-50 text-emerald-600'
                : completionState.mode === 'suspect'
                ? 'bg-rose-50 text-rose-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {completionState.mode === 'published' ? (
              <CheckCircle2 className="w-8 h-8" />
            ) : completionState.mode === 'suspect' ? (
              <AlertOctagon className="w-8 h-8" />
            ) : (
              <AlertTriangle className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-slate-900">{completionState.title}</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              {completionState.message}
            </p>
          </div>

          {completionState.flags.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1">
              <p className="font-bold text-slate-700 uppercase text-[11px]">Points relevés :</p>
              <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                {completionState.flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2 justify-center">
            {completionState.mode === 'published' && completionState.propertyId && (
              <button
                type="button"
                onClick={() => onNavigatePath(`/annonces/${completionState.propertyId}`)}
                className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-bold text-sm cursor-pointer transition-colors"
              >
                Voir mon annonce
              </button>
            )}
            <button
              type="button"
              onClick={() => onNavigatePath(isPro ? '/pro/annonces' : '/')}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm cursor-pointer transition-colors"
            >
              {isPro ? 'Retour à mes annonces' : "Retour à l'accueil"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 max-w-3xl mx-auto">
      <PageHeaderBar
        title={resolvedEditingProperty ? "Modifier l'annonce" : 'Publier un bien'}
        subtitle="Publication rapide en 1 écran"
        fallbackPath={user.role === 'agent' || user.role === 'agency' ? '/pro' : '/'}
        onBack={() => {
          setEditingProperty(null);
          goBackOrFallback(user.role === 'agent' || user.role === 'agency' ? '/pro' : '/', onNavigatePath);
        }}
      />

      {!isAdminUser && (
        <div
          className={`rounded-2xl border p-3.5 text-xs flex flex-wrap items-center justify-between gap-2 tabular-nums ${
            isNewListingQuotaExceeded
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50/70 border-blue-200 text-slate-800'
          }`}
        >
          <span className="font-bold">
            Formule <span className="text-[#1D4ED8]">{billingSummary.plan.name}</span>
          </span>
          <div className="flex flex-wrap items-center gap-3 font-semibold">
            <span>
              Annonces : {activeListingsUsed}/{maxListingsCap >= 500 ? '∞' : maxListingsCap}
            </span>
            <span>
              Photos : {imageUrls.length}/{effectiveMaxPhotos}
            </span>
            <span>
              Vidéos : {videosUsed}/{maxVideosCap}
            </span>
          </div>
        </div>
      )}

      {submitError && (
        <ErrorState
          title="Vérifiez ces informations"
          message={submitError.message}
          nextStepHint={submitError.hint}
        />
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          saveProperty('PUBLISHED');
        }}
        noValidate
        className="space-y-4"
      >
        {/* 1. ESSENTIEL : Transaction, Type, Prix, Titre, Description */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#1D4ED8]" />
            <h2 className="text-base font-extrabold text-slate-900">1. L’essentiel du bien</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus('for-sale')}
              className={`min-h-[44px] rounded-xl font-bold text-xs sm:text-sm border transition-colors cursor-pointer ${
                status === 'for-sale'
                  ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              À vendre
            </button>
            <button
              type="button"
              onClick={() => setStatus('for-rent')}
              className={`min-h-[44px] rounded-xl font-bold text-xs sm:text-sm border transition-colors cursor-pointer ${
                status === 'for-rent'
                  ? 'bg-[#1D4ED8] text-white border-[#1D4ED8]'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              À louer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Type de bien *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PropertyType)}
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#1D4ED8]"
              >
                <option value="apartment">Appartement</option>
                <option value="house">Maison / Villa</option>
                <option value="penthouse">Penthouse</option>
                <option value="office">Bureau</option>
                <option value="land">Terrain</option>
                <option value="commercial">Local commercial</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {status === 'for-rent' ? 'Loyer mensuel (USD) *' : 'Prix (USD) *'}
              </label>
              <input
                type="number"
                value={isNaN(price) ? '' : price}
                onChange={(e) => setPrice(isNaN(Number(e.target.value)) ? 0 : Number(e.target.value))}
                placeholder="ex: 150000"
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 font-bold tabular-nums focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Titre de l'annonce *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Villa moderne 4 chambres avec piscine à Gombe"
              className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description *</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez les pièces, l'état du bien, le voisinage et les avantages..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
            />
          </div>
        </section>

        {/* 2. LOCALISATION KINSHASA */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#1D4ED8]" />
              <h2 className="text-base font-extrabold text-slate-900">2. Où se situe le bien ?</h2>
            </div>
            {commune && KINSHASA_COMMUNES_DATA[commune]?.districts && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-lg bg-blue-50 text-[#1D4ED8]">
                {KINSHASA_COMMUNES_DATA[commune].districts}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Commune *</label>
              <select
                value={commune}
                onChange={(e) => {
                  const newCommune = e.target.value;
                  setCommune(newCommune);
                  const qList = getQuartiersForCommune(newCommune);
                  const defaultQ = qList[0] || '';
                  setQuartier(defaultQ);
                  const avList = getPopularAvenuesForCommune(newCommune);
                  const defaultAv = avList[0] || '';
                  setAvenue(defaultAv);
                  setAddress(`${defaultAv ? defaultAv + ', ' : ''}${defaultQ ? defaultQ + ', ' : ''}${newCommune}, Kinshasa`);
                }}
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 font-semibold focus:outline-none focus:border-[#1D4ED8]"
              >
                {Object.keys(KINSHASA_COMMUNES_DATA).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quartier *</label>
              <select
                value={getQuartiersForCommune(commune).includes(quartier) ? quartier : 'custom'}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setQuartier('');
                  } else {
                    setQuartier(e.target.value);
                    setAddress(`${avenue ? avenue + ', ' : ''}${e.target.value}, ${commune}, Kinshasa`);
                  }
                }}
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              >
                {getQuartiersForCommune(commune).map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
                <option value="custom">Autre quartier...</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Avenue / Repère</label>
              <input
                type="text"
                value={avenue}
                onChange={(e) => {
                  setAvenue(e.target.value);
                  setAddress(`${e.target.value ? e.target.value + ', ' : ''}${quartier ? quartier + ', ' : ''}${commune}, Kinshasa`);
                }}
                placeholder="ex: Avenue des Écuries"
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Adresse affichée</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ex: Av. des Écuries, Ngaliema, Kinshasa"
                className="w-full h-11 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
              />
            </div>
          </div>

          {getPopularAvenuesForCommune(commune).length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-medium">Avenues rapides :</span>
              {getPopularAvenuesForCommune(commune).slice(0, 3).map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => {
                    setAvenue(av);
                    setAddress(`${av}, ${quartier ? quartier + ', ' : ''}${commune}, Kinshasa`);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                    avenue === av
                      ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8] font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 3. PHOTOS (P1 : 3 min publication, 5 recommandées, 20 max) */}
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-[#1D4ED8]" />
                <h2 className="text-base font-extrabold text-slate-900 tabular-nums">
                  3. Photos du bien ({imageUrls.length} / {effectiveMaxPhotos})
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 tabular-nums">
                {MIN_PROPERTY_PHOTOS} photos minimum pour publier · {RECOMMENDED_PROPERTY_PHOTOS} recommandées · JPEG, PNG ou WebP (10 Mo max)
              </p>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-lg tabular-nums ${
                imageUrls.length < MIN_PROPERTY_PHOTOS
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              {imageUrls.length < MIN_PROPERTY_PHOTOS
                ? `Encore ${MIN_PROPERTY_PHOTOS - imageUrls.length} photo(s)`
                : 'Prêt à publier'}
            </span>
          </div>

          {duplicateAlert && duplicateAlert.matches.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Photo similaire déjà utilisée sur une autre annonce</p>
                <p className="text-amber-800 mt-0.5">
                  Correspondance :{' '}
                  {duplicateAlert.matches
                    .slice(0, 2)
                    .map((m) => `« ${m.propertyTitle || m.propertyId} »`)
                    .join(', ')}
                  . Votre annonce sera vérifiée par l'équipe avant mise en avant (brouillons autorisés).
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="min-h-[46px] px-4 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1D4ED8] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Camera className="w-4.5 h-4.5" />
              <span>Prendre une photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <label className="min-h-[46px] px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
              <Upload className="w-4.5 h-4.5 text-[#1D4ED8]" />
              <span>Choisir dans la galerie</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {isCompressingImages && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#1D4ED8] text-xs font-bold flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{imageUploadStatus || 'Compression et envoi en cours...'}</span>
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="url"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="Ou collez un lien d'image (https://...)"
              className="flex-1 h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
            />
            <button
              type="button"
              onClick={handleAddImage}
              className="h-10 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>
          </div>

          {imageUrls.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {imageUrls.map((url, i) => {
                const meta = imagesMeta[i];
                return (
                  <div
                    key={`${url}-${i}`}
                    draggable
                    onDragStart={() => setDraggedImageIndex(i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedImageIndex !== null && draggedImageIndex !== i) {
                        moveImageOrder(draggedImageIndex, i);
                      }
                      setDraggedImageIndex(null);
                    }}
                    className={`rounded-xl overflow-hidden border bg-slate-50 flex flex-col ${
                      i === 0 ? 'border-[#1D4ED8] ring-1 ring-[#1D4ED8]/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="relative aspect-video bg-slate-200">
                      <img
                        src={getOptimizedImageUrl(url, { width: 500 }) || url}
                        alt={meta?.alt || `Photo ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 flex items-center gap-1">
                        <span className="p-1 rounded-lg bg-slate-900/75 text-white cursor-grab" title="Réordonner">
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                        {i === 0 ? (
                          <span className="px-2 py-0.5 rounded-lg bg-[#FACC15] text-slate-950 text-[10px] font-extrabold flex items-center gap-1">
                            <Star className="w-3 h-3 fill-slate-950" /> Couverture
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => moveImageOrder(i, 0)}
                            className="px-2 py-0.5 rounded-lg bg-slate-900/80 hover:bg-[#1D4ED8] text-white text-[10px] font-bold cursor-pointer"
                          >
                            Couverture
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center cursor-pointer"
                        title="Supprimer cette photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="absolute bottom-2 right-2 flex items-center gap-1">
                        <button
                          type="button"
                          disabled={i === 0}
                          onClick={() => moveImageOrder(i, i - 1)}
                          className="p-1 rounded-lg bg-slate-900/75 text-white disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={i === imageUrls.length - 1}
                          onClick={() => moveImageOrder(i, i + 1)}
                          className="p-1 rounded-lg bg-slate-900/75 text-white disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-2 space-y-1">
                      <input
                        type="text"
                        value={meta?.alt || ''}
                        onChange={(e) => handleUpdateImageAlt(i, e.target.value)}
                        placeholder={`Description courte photo ${i + 1}`}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] text-slate-900 focus:outline-none focus:border-[#1D4ED8]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ACCORDÉONS OPTIONNELS : Critères, Vidéo/Plan/3D, Infos privées Pro */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setOpenSpecs((v) => !v)}
            className="w-full min-h-[52px] px-4 sm:px-6 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4.5 h-4.5 text-[#1D4ED8]" />
              <div>
                <span className="text-sm font-extrabold text-slate-900 block">
                  Détails & équipements (optionnel)
                </span>
                <span className="text-xs text-slate-500">
                  {bedrooms} ch. · {bathrooms} sdb · {area} m² · {amenities.length} équipement(s)
                </span>
              </div>
            </div>
            {openSpecs ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>

          {openSpecs && (
            <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chambres</label>
                  <input
                    type="number"
                    value={isNaN(bedrooms) ? '' : bedrooms}
                    onChange={(e) => setBedrooms(isNaN(Number(e.target.value)) ? 0 : Number(e.target.value))}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salles de bain</label>
                  <input
                    type="number"
                    value={isNaN(bathrooms) ? '' : bathrooms}
                    onChange={(e) => setBathrooms(isNaN(Number(e.target.value)) ? 0 : Number(e.target.value))}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Surface (m²)</label>
                  <input
                    type="number"
                    value={isNaN(area) ? '' : area}
                    onChange={(e) => setArea(isNaN(Number(e.target.value)) ? 0 : Number(e.target.value))}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parkings</label>
                  <input
                    type="number"
                    value={isNaN(garages) ? '' : garages}
                    onChange={(e) => setGarages(isNaN(Number(e.target.value)) ? 0 : Number(e.target.value))}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Équipements</p>
                <div className="flex flex-wrap gap-2">
                  {availableAmenities.map((item) => {
                    const active = amenities.includes(item);
                    return (
                      <button
                        type="button"
                        key={item}
                        onClick={() => toggleAmenity(item)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${
                          active
                            ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8]'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Mise en avant & badges</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'featured', label: 'En vedette' },
                    { id: 'hot', label: 'Coup de cœur' },
                    { id: 'reduced', label: 'Prix réduit' },
                    { id: 'new', label: 'Nouveau' },
                  ].map((l) => (
                    <button
                      type="button"
                      key={l.id}
                      onClick={() => toggleLabel(l.id as PropertyLabel)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                        labels.includes(l.id as PropertyLabel)
                          ? 'bg-[#FACC15]/25 border-[#EAB308] text-slate-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {customFields.filter((f) => !f.isPrivate).length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  {customFields
                    .filter((f) => !f.isPrivate)
                    .map((field) => (
                      <div key={field.id}>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {(typeof field.label === 'string' ? field.label : field.label?.fr) || field.key}
                          {field.unit ? ` (${field.unit})` : ''}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            value={customFieldsState[field.key] || ''}
                            onChange={(e) =>
                              setCustomFieldsState((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900"
                          >
                            <option value="">Choisir...</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type={field.type === 'number' || field.type === 'area' ? 'number' : 'text'}
                            value={customFieldsState[field.key] ?? ''}
                            onChange={(e) =>
                              setCustomFieldsState((prev) => ({ ...prev, [field.key]: e.target.value }))
                            }
                            className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900"
                          />
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ACCORDÉON VIDÉO, PLAN & VISITE 3D */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setOpenAdvancedMedia((v) => !v)}
            className="w-full min-h-[52px] px-4 sm:px-6 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Video className="w-4.5 h-4.5 text-[#1D4ED8]" />
              <div>
                <span className="text-sm font-extrabold text-slate-900 block">
                  Vidéo, plan du bien & visite 3D (optionnel)
                </span>
                <span className="text-xs text-slate-500">
                  {videoUrl ? 'Vidéo ajoutée' : 'Aucune vidéo'} · {floorPlanUrl ? 'Plan ajouté' : 'Pas de plan'}
                </span>
              </div>
            </div>
            {openAdvancedMedia ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {openAdvancedMedia && (
            <div className="px-4 sm:px-6 pb-5 pt-3 border-t border-slate-100 space-y-5">
              {/* Plan du bien */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <FileImage className="w-4 h-4 text-[#1D4ED8]" /> Plan du bien (image)
                  </span>
                  {floorPlanUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveFloorPlan}
                      className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                    >
                      Supprimer le plan
                    </button>
                  )}
                </div>

                {!floorPlanUrl ? (
                  <label className="min-h-[46px] p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer">
                    {isUploadingFloorPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#1D4ED8]" />
                        <span>Envoi du plan...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-[#1D4ED8]" />
                        <span>Importer le plan (JPEG, PNG, WebP ≤ 10 Mo)</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFloorPlanUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row gap-3 items-start">
                    <img
                      src={getOptimizedImageUrl(floorPlanUrl, { width: 500 }) || floorPlanUrl}
                      alt={floorPlanAlt || 'Plan du bien'}
                      className="w-full sm:w-40 aspect-video object-contain rounded-lg bg-white border border-slate-200"
                    />
                    <input
                      type="text"
                      value={floorPlanAlt}
                      onChange={(e) => setFloorPlanAlt(e.target.value)}
                      placeholder="Légende du plan"
                      className="flex-1 w-full h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Vidéo verticale 60s max */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-[#1D4ED8]" /> Vidéo verticale (60s max · 100 Mo max)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Modérée par notre équipe avant affichage public.
                  </p>
                </div>

                {videoUploading && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-[#1D4ED8] tabular-nums">
                      <span>Envoi vidéo en cours...</span>
                      <span>{videoUploadProgress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#1D4ED8]" style={{ width: `${videoUploadProgress}%` }} />
                    </div>
                  </div>
                )}

                {videoUploadSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{videoUploadSuccess}</span>
                  </div>
                )}

                {videoUploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                    <VideoOff className="w-4 h-4 shrink-0" />
                    <span>{videoUploadError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="min-h-[44px] px-3 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[#1D4ED8] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer">
                    <Film className="w-4 h-4" />
                    <span>Filmer (≤ 60s)</span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*"
                      capture="environment"
                      onChange={handleVideoFileUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer">
                    <FileVideo className="w-4 h-4 text-[#1D4ED8]" />
                    <span>Importer vidéo (≤ 100 Mo)</span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                      onChange={handleVideoFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {SAMPLE_REAL_ESTATE_VIDEOS.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => {
                        setVideoUrl(sample.url);
                        setVideoPublicId(undefined);
                        setVideoDuration(30);
                        setVideoUploadError(null);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                        videoUrl === sample.url
                          ? 'bg-blue-50 border-[#1D4ED8] text-[#1D4ED8]'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <Play className="w-3 h-3" />
                      <span>{sample.title}</span>
                    </button>
                  ))}
                </div>

                {videoUrl && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-[#1D4ED8] tabular-nums">
                        Aperçu ({detectVideoType(videoUrl).toUpperCase()}
                        {videoDuration ? ` · ${Math.round(videoDuration)}s` : ''})
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="text-rose-600 hover:underline cursor-pointer"
                      >
                        Supprimer la vidéo
                      </button>
                    </div>
                    <PropertyVideoPlayer
                      videoUrl={videoUrl}
                      title={title || 'Visite vidéo'}
                      posterImage={imageUrls[0]}
                      className="w-full max-h-[260px]"
                    />
                  </div>
                )}
              </div>

              {/* Visite Virtuelle 3D */}
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#1D4ED8]" /> Lien visite virtuelle 3D
                </label>
                <input
                  type="url"
                  value={virtualTourUrl}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVirtualTourUrl(val);
                    const check = validateVirtualTourUrl(val, allowedTourDomains);
                    setVirtualTourError(check.valid ? null : (check.error || 'Domaine non autorisé.'));
                  }}
                  placeholder="https://my.matterport.com/show/?m=..."
                  className={`w-full h-10 bg-slate-50 border rounded-xl px-3 text-xs text-slate-900 focus:outline-none ${
                    virtualTourError ? 'border-rose-500' : 'border-slate-300 focus:border-[#1D4ED8]'
                  }`}
                />
                {virtualTourError ? (
                  <p className="text-[11px] text-rose-600 font-semibold">{virtualTourError}</p>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Domaines autorisés : {allowedTourDomains.slice(0, 5).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ACCORDÉON INFOS PRIVÉES PRO */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => setOpenPrivatePro((v) => !v)}
            className="w-full min-h-[52px] px-4 sm:px-6 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Lock className="w-4.5 h-4.5 text-amber-600" />
              <div>
                <span className="text-sm font-extrabold text-slate-900 block">
                  Notes privées Pro (optionnel)
                </span>
                <span className="text-xs text-slate-500">
                  Jamais affichées au public (propriétaire, commission, notes)
                </span>
              </div>
            </div>
            {openPrivatePro ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {openPrivatePro && (
            <div className="px-4 sm:px-6 pb-5 pt-3 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Propriétaire</label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Nom complet"
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tél. propriétaire</label>
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+243 ..."
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Commission (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={isNaN(commissionRate) ? '' : commissionRate}
                    onChange={(e) => setCommissionRate(isNaN(Number(e.target.value)) ? 5 : Number(e.target.value))}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-xl px-3 text-xs text-slate-900 tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notes internes</label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Disponibilités pour les visites, marge de négociation..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900"
                />
              </div>
            </div>
          )}
        </section>

        {/* BARRE D'ACTION STICKY (1 appui pour publier) */}
        <div className="sticky bottom-[64px] lg:bottom-4 z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <button
            type="button"
            disabled={isSubmitting || isCompressingImages || isUploadingFloorPlan}
            onClick={() => saveProperty('DRAFT')}
            className="min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 text-[#1D4ED8]" />
            <span>Enregistrer en brouillon</span>
          </button>

          <button
            type="submit"
            disabled={isSubmitting || isCompressingImages || isUploadingFloorPlan}
            className="min-h-[48px] sm:min-w-[220px] px-6 py-3 rounded-xl bg-[#1D4ED8] hover:bg-[#0B3EA8] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 active:scale-[0.99] transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <span>{resolvedEditingProperty ? 'Mettre à jour & Publier' : "Publier l'annonce"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
