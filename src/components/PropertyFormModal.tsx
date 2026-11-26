import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Property, PropertyType, PropertyStatus, PropertyLabel, PropertyImageMeta } from '../types';
import { resolveMediaUrl, extractCloudinaryPublicIdFromUrl, getOptimizedImageUrl } from '../utils/mediaUrl';
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
} from '../utils/mediaTools';
import {
  KINSHASA_COMMUNES_DATA,
  KINSHASA_COMMUNES_LIST,
  getQuartiersForCommune,
  getPopularAvenuesForCommune,
} from '../data/kinshasaLocations';
import {
  X,
  Home,
  Plus,
  Trash2,
  Building2,
  MapPin,
  Sparkles,
  CheckCircle2,
  Image as ImageIcon,
  Video,
  Lock,
  Zap,
  SlidersHorizontal,
  Camera,
  Upload,
  Compass,
  Navigation,
  Play,
  Film,
  FileVideo,
  VideoOff,
  ExternalLink,
  Loader2,
  Check,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  User as UserIcon,
  ArrowLeft,
  ArrowRight,
  Star,
  FileImage,
  Globe,
  Save,
  GripVertical,
} from 'lucide-react';
import { SAMPLE_REAL_ESTATE_VIDEOS, detectVideoType } from '../utils/videoHelpers';
import { PropertyVideoPlayer } from './PropertyVideoPlayer';
import { analyzePropertyForFraud } from '../utils/suspiciousListingDetector';
import {
  uploadImageToCloudinary,
  uploadVideoWithProgress,
  destroyCloudinaryMedia,
  checkImageFingerprints,
  FingerprintMatch,
} from '../services/cloudinaryService';
import { resolveAccountBillingSummary } from '../utils/billingHelpers';
import {
  PropertyCurrencyCode,
  RentalPeriodicity,
  MAX_RENTAL_MONTHS,
  validateAndNormalizePropertyPricing,
} from '../utils/propertyPricing';

export const PropertyFormModal: React.FC = () => {
  const {
    isSubmitPropertyOpen,
    setIsSubmitPropertyOpen,
    setIsAuthModalOpen,
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

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCompressingImages, setIsCompressingImages] = useState(false);
  const [imageUploadStatus, setImageUploadStatus] = useState<string | null>(null);
  const [moderationFeedback, setModerationFeedback] = useState<{
    verdict: 'normal' | 'review_required' | 'suspect';
    title: string;
    message: string;
    flags: string[];
  } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceInput, setPriceInput] = useState<string>('450000');
  const [currency, setCurrency] = useState<PropertyCurrencyCode>('USD');
  const [period, setPeriod] = useState<'month' | 'year' | 'total'>('total');
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriodicity>('month');
  const [isNegotiable, setIsNegotiable] = useState<boolean>(false);
  const [guaranteeMonthsInput, setGuaranteeMonthsInput] = useState<string>('');
  const [advanceMonthsInput, setAdvanceMonthsInput] = useState<string>('');
  const [type, setType] = useState<PropertyType>('apartment');
  const [status, setStatus] = useState<PropertyStatus>('for-sale');
  const [category, setCategory] = useState('Résidentiel Haut de Gamme');
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
  const [area, setArea] = useState<number>(95);
  const [yearBuilt, setYearBuilt] = useState<number>(2020);
  const [garages, setGarages] = useState<number>(1);

  // Amenities
  const availableAmenities = [
    'Ascenseur', 'Climatisation', 'Piscine', 'Terrasse', 'Balcon',
    'Jardin privatif', 'Garage / Parking', 'Cave', 'Vue Mer', 'Vue Tour Eiffel',
    'Panneaux solaires', 'Fibre Optique', 'Domotique', 'Gardien / Concierge'
  ];
  const [amenities, setAmenities] = useState<string[]>(['Ascenseur', 'Climatisation', 'Fibre Optique']);

  // Media (P1 Photos, P2 Vidéos, Plan du bien, Visite virtuelle, Empreintes)
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

  // Dynamic Custom Fields State (mapped by field key)
  const [customFieldsState, setCustomFieldsState] = useState<Record<string, any>>({});

  // Private Fields State
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [commissionRate, setCommissionRate] = useState<number>(5);
  const [internalNotes, setInternalNotes] = useState('');
  const [keyBoxCode, setKeyBoxCode] = useState('');

  useEffect(() => {
    if (editingProperty) {
      setTitle(editingProperty.title);
      setDescription(editingProperty.description);
      setPriceInput(
        editingProperty.price !== undefined && editingProperty.price !== null
          ? String(Math.round(Number(editingProperty.price) || 0))
          : ''
      );
      setCurrency(String(editingProperty.currency || 'USD').toUpperCase() === 'CDF' ? 'CDF' : 'USD');
      setPeriod(editingProperty.period || 'total');
      setRentalPeriod(editingProperty.period === 'year' ? 'year' : 'month');
      setIsNegotiable(Boolean(editingProperty.isNegotiable));
      setGuaranteeMonthsInput(
        typeof editingProperty.guaranteeMonths === 'number' ? String(editingProperty.guaranteeMonths) : ''
      );
      setAdvanceMonthsInput(
        typeof editingProperty.advanceMonths === 'number' ? String(editingProperty.advanceMonths) : ''
      );
      setType(editingProperty.type);
      setStatus(editingProperty.status);
      setCategory(editingProperty.category);
      setLabels(editingProperty.labels || []);
      setCommune(editingProperty.commune || 'Gombe');
      setQuartier(editingProperty.quartier || 'Centre-Ville / 30 Juin');
      setAvenue(editingProperty.avenue || 'Boulevard du 30 Juin');
      setReferencePoint(editingProperty.referencePoint || '');
      setAddress(editingProperty.address);
      setCity(editingProperty.city || 'Kinshasa');
      setZipCode(editingProperty.zipCode || 'KN-01');
      setCountry(editingProperty.country || 'RDC');
      setLat(editingProperty.lat || -4.3224);
      setLng(editingProperty.lng || 15.3070);
      setBedrooms(editingProperty.bedrooms);
      setBathrooms(editingProperty.bathrooms);
      setArea(editingProperty.area);
      setYearBuilt(editingProperty.yearBuilt || 2020);
      setGarages(editingProperty.garages || 0);
      setAmenities(editingProperty.amenities || []);

      const resolvedImgs = Array.isArray(editingProperty.images)
        ? editingProperty.images.map((u) => resolveMediaUrl(u)).filter(Boolean)
        : [];
      const existingMetaMap = new Map<string, PropertyImageMeta>();
      if (Array.isArray(editingProperty.imagesMeta)) {
        editingProperty.imagesMeta.forEach((m) => {
          if (m?.url) existingMetaMap.set(resolveMediaUrl(m.url), m);
        });
      }
      const hydratedMetas: PropertyImageMeta[] = resolvedImgs.map((u, idx) => {
        const matched = existingMetaMap.get(u) || editingProperty.imagesMeta?.[idx];
        return {
          url: u,
          publicId: matched?.publicId || extractCloudinaryPublicIdFromUrl(u),
          alt: matched?.alt || '',
          fingerprint: matched?.fingerprint || editingProperty.imageFingerprints?.[idx],
          width: matched?.width,
          height: matched?.height,
          bytes: matched?.bytes,
          format: matched?.format,
        };
      });
      setImageUrls(resolvedImgs);
      setImagesMeta(hydratedMetas);

      setFloorPlanUrl(editingProperty.floorPlanUrl ? resolveMediaUrl(editingProperty.floorPlanUrl) : '');
      setFloorPlanPublicId(
        editingProperty.floorPlanPublicId || extractCloudinaryPublicIdFromUrl(editingProperty.floorPlanUrl)
      );
      setFloorPlanAlt(editingProperty.floorPlanAlt || '');

      const resolvedVid = editingProperty.videoUrl ? resolveMediaUrl(editingProperty.videoUrl) : '';
      setVideoUrl(resolvedVid);
      setVideoPublicId(editingProperty.videoPublicId || extractCloudinaryPublicIdFromUrl(resolvedVid));
      setVideoDuration(editingProperty.videoDuration);
      setVirtualTourUrl(editingProperty.virtualTourUrl || '');
      setVirtualTourError(null);
      setDuplicateAlert(null);
      setCustomFieldsState(editingProperty.customFields || {});

      if (editingProperty.privateFields) {
        setOwnerName(editingProperty.privateFields.ownerName || '');
        setOwnerPhone(editingProperty.privateFields.ownerPhone || '');
        setOwnerEmail(editingProperty.privateFields.ownerEmail || '');
        setCommissionRate(editingProperty.privateFields.commissionRate || 5);
        setInternalNotes(editingProperty.privateFields.internalNotes || '');
        setKeyBoxCode(editingProperty.privateFields.keyBoxCode || '');
      }
    } else {
      setTitle('');
      setDescription('');
      setPriceInput('450000');
      setCurrency('USD');
      setRentalPeriod('month');
      setIsNegotiable(false);
      setGuaranteeMonthsInput('');
      setAdvanceMonthsInput('');
      setImageUrls([]);
      setImagesMeta([]);
      setFloorPlanUrl('');
      setFloorPlanPublicId(undefined);
      setFloorPlanAlt('');
      setVideoUrl('');
      setVideoPublicId(undefined);
      setVideoDuration(undefined);
      setVirtualTourUrl('');
      setVirtualTourError(null);
      setDuplicateAlert(null);

      // Initialize default values for dynamic fields
      const defaults: Record<string, any> = {};
      customFields.forEach((f) => {
        if (f.defaultValue !== undefined) {
          defaults[f.key] = f.defaultValue;
        }
      });
      setCustomFieldsState(defaults);
    }
  }, [editingProperty, customFields]);

  if (!isSubmitPropertyOpen) return null;

  const handleClose = () => {
    setIsSubmitPropertyOpen(false);
    setEditingProperty(null);
    setSubmitError(null);
    setDuplicateAlert(null);
    setVirtualTourError(null);
    setStep(1);
  };

  // Règle métier : La publication d'un bien est strictement réservée aux utilisateurs connectés
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100 p-6 sm:p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              Règle Métier Kinimmo
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white">Connexion Obligatoire</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              La publication d'un bien immobilier est strictement réservée aux utilisateurs connectés afin de garantir l'authenticité des annonces, la sécurité des transactions et la traçabilité des contacts.
            </p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => {
                handleClose();
                setIsAuthModalOpen(true);
              }}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <UserIcon className="w-4 h-4" />
              <span>Se Connecter / Créer un Compte</span>
            </button>
            <button
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userAgency = user
    ? agencies.find(
        (a) =>
          a.id === user.agencyId ||
          (a.name && user.agencyName && a.name.toLowerCase() === user.agencyName.toLowerCase()) ||
          (a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase())
      )
    : undefined;
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
  const isNewListingQuotaExceeded = !isAdminUser && !editingProperty && activeListingsUsed >= maxListingsCap;
  const allowedTourDomains = contactSettings?.virtualTourAllowedDomains || DEFAULT_VIRTUAL_TOUR_DOMAINS;

  const runDuplicateFingerprintCheck = async (fingerprints: string[], urls: string[]) => {
    const cleanHashes = fingerprints.filter(Boolean);
    const cleanUrls = urls.filter(Boolean);
    if (cleanHashes.length === 0 && cleanUrls.length === 0) return;

    const res = await checkImageFingerprints({
      fingerprints: cleanHashes,
      imageUrls: cleanUrls,
      excludePropertyId: editingProperty?.id,
    });
    if (res.duplicateDetected && res.matches.length > 0) {
      setDuplicateAlert({ matches: res.matches });
    }
  };

  const handleAddImage = async () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    if (imageUrls.length >= effectiveMaxPhotos) {
      setSubmitError(
        `Limite de photos atteinte (${effectiveMaxPhotos} photos max par annonce${isAdminUser ? '' : ` pour votre formule ${billingSummary.plan.name}`}).`
      );
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
      setSubmitError(
        `Limite atteinte : maximum ${effectiveMaxPhotos} photo(s) par annonce${isAdminUser ? '' : ` avec votre formule ${billingSummary.plan.name}`}.`
      );
      e.target.value = '';
      return;
    }

    setSubmitError(null);
    setIsCompressingImages(true);
    try {
      const remainingSlots = Math.max(0, effectiveMaxPhotos - imageUrls.length);
      const fileList = Array.from(files).slice(0, remainingSlots);
      if (files.length > remainingSlots) {
        setSubmitError(
          `Seules ${remainingSlots} photo(s) ont été retenues pour respecter le plafond de ${effectiveMaxPhotos} photos.`
        );
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

        setImageUploadStatus(
          `Compression & empreinte (${idx + 1}/${fileList.length}) : ${file.name}...`
        );
        try {
          const compressed = await compressImageFileToBlob(file, 1600, 0.82);
          const dhash = await computeImageDHash(compressed.file);

          setImageUploadStatus(
            `Envoi signé Cloudinary (${idx + 1}/${fileList.length}) — ${formatBytesCompact(compressed.compressedBytes)}...`
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
          console.error('Erreur téléversement photo Cloudinary:', err);
          lastUploadError =
            err?.message || 'Impossible de téléverser la photo vers Cloudinary.';
        }
      }

      if (uploadedMetas.length > 0) {
        const newUrls = uploadedMetas.map((m) => m.url);
        const newHashes = uploadedMetas.map((m) => m.fingerprint).filter((h): h is string => Boolean(h));
        setImageUrls((prev) => [...prev, ...newUrls]);
        setImagesMeta((prev) => [...prev, ...uploadedMetas]);

        // Détection d'empreinte déjà utilisée sur d'autres annonces (P2)
        runDuplicateFingerprintCheck(newHashes, newUrls).catch(() => {});
      }

      if (lastUploadError) {
        setSubmitError(
          uploadedMetas.length > 0
            ? `${uploadedMetas.length} photo(s) importée(s), mais une erreur est survenue : ${lastUploadError}`
            : lastUploadError
        );
      }
    } catch (err: any) {
      console.error('Erreur upload photos Cloudinary:', err);
      setSubmitError(err?.message || 'Erreur lors du téléversement des photos vers Cloudinary.');
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
        propertyId: editingProperty?.id,
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
      setSubmitError(validation.error || 'Plan invalide (JPEG, PNG ou WebP, 10 Mo max).');
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
          propertyId: editingProperty?.id,
        }).catch(() => {});
      }

      setFloorPlanUrl(result.secure_url);
      setFloorPlanPublicId(result.public_id || extractCloudinaryPublicIdFromUrl(result.secure_url));
      if (!floorPlanAlt) {
        setFloorPlanAlt(`Plan du bien — ${title || 'Propriété Kinshasa'}`);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Impossible de téléverser le plan du bien sur Cloudinary.');
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
        propertyId: editingProperty?.id,
      }).catch(() => {});
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAddingNewVideo = !editingProperty?.videoUrl;
    if (!isAdminUser && isAddingNewVideo && videosUsed >= maxVideosCap) {
      setVideoUploadError(
        maxVideosCap === 0
          ? `Votre formule ${billingSummary.plan.name} n'inclut pas la publication vidéo. Passez à une formule supérieure dans Abonnement & Factures.`
          : `Quota vidéo atteint (${videosUsed}/${maxVideosCap} vidéo(s) pour votre formule ${billingSummary.plan.name}).`
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
        (percent) => {
          setVideoUploadProgress(Math.max(5, percent));
        },
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
            propertyId: editingProperty?.id,
          }).catch(() => {});
        }
        setVideoUrl(result.secure_url);
        setVideoPublicId(result.public_id || extractCloudinaryPublicIdFromUrl(result.secure_url));
        setVideoDuration(result.duration || vCheck.duration);
        setVideoUploadProgress(100);
        setVideoUploadSuccess(
          `Vidéo « ${file.name} » (${Math.round(result.duration || vCheck.duration || 0)}s) téléversée. Elle sera publiée après modération de l'équipe.`
        );
        setTimeout(() => setVideoUploadSuccess(null), 6000);
      } else {
        throw new Error(result.message || 'Cloudinary n’a retourné aucune URL vidéo.');
      }
    } catch (err: any) {
      console.error('Erreur téléversement vidéo Cloudinary:', err);
      setVideoUploadError(
        err?.message ||
          "Impossible d'envoyer la vidéo sur Cloudinary. Vérifiez votre connexion et la configuration Cloudinary."
      );
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
        propertyId: editingProperty?.id,
      }).catch(() => {});
    }
  };

  const handleSelectSampleVideo = (sampleUrl: string) => {
    setVideoUrl(sampleUrl);
    setVideoPublicId(undefined);
    setVideoDuration(30);
    setVideoUploadError(null);
    setVideoUploadSuccess("Visite vidéo d'exemple sélectionnée !");
    setTimeout(() => setVideoUploadSuccess(null), 3000);
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

  const handleNextStep = () => {
    setSubmitError(null);
    if (step === 1) {
      if (!title || !title.trim()) {
        setSubmitError("Veuillez renseigner le titre de l'annonce avant de passer à l'étape suivante.");
        return;
      }
      const stepPricingCheck = validateAndNormalizePropertyPricing({
        status,
        price: priceInput,
        currency,
        period: status === 'for-rent' ? rentalPeriod : 'total',
        isNegotiable,
        guaranteeMonths: status === 'for-rent' ? guaranteeMonthsInput : undefined,
        advanceMonths: status === 'for-rent' ? advanceMonthsInput : undefined,
        requirePositivePrice: true,
      });
      if (!stepPricingCheck.valid) {
        setSubmitError(stepPricingCheck.error);
        return;
      }
      if (!description || !description.trim()) {
        setSubmitError("Veuillez rédiger une brève description du bien.");
        return;
      }
    } else if (step === 2) {
      if (!commune || !commune.trim()) {
        setSubmitError("Veuillez sélectionner la commune à Kinshasa.");
        return;
      }
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const saveProperty = async (targetMode: 'PUBLISHED' | 'DRAFT') => {
    setSubmitError(null);

    if (!user) {
      setSubmitError('Règle métier Kinimmo : Vous devez être connecté pour enregistrer une annonce.');
      setIsAuthModalOpen(true);
      return;
    }

    if (!title || !title.trim()) {
      setSubmitError("Le titre de l'annonce est obligatoire.");
      setStep(1);
      return;
    }

    const pricingCheck = validateAndNormalizePropertyPricing({
      status,
      listingStatus: targetMode,
      price: priceInput,
      currency,
      period: status === 'for-rent' ? rentalPeriod : 'total',
      isNegotiable,
      guaranteeMonths: status === 'for-rent' ? guaranteeMonthsInput : undefined,
      advanceMonths: status === 'for-rent' ? advanceMonthsInput : undefined,
      requirePositivePrice: targetMode === 'PUBLISHED',
    });
    if (!pricingCheck.valid) {
      setSubmitError(pricingCheck.error);
      setStep(1);
      return;
    }

    if (targetMode === 'PUBLISHED') {
      if (!description || !description.trim()) {
        setSubmitError("La description de l'annonce est obligatoire pour publier.");
        setStep(1);
        return;
      }

      if (!commune || !commune.trim()) {
        setSubmitError("Veuillez sélectionner la commune de localisation.");
        setStep(2);
        return;
      }

      // Règle P1 Photos : minimum 3 photos pour publication publique (brouillons autorisés avec < 3)
      if (imageUrls.length < MIN_PROPERTY_PHOTOS) {
        setSubmitError(
          `Publication impossible : minimum ${MIN_PROPERTY_PHOTOS} photos requises pour publier une annonce (actuellement ${imageUrls.length}/${MIN_PROPERTY_PHOTOS}). Ajoutez des photos à l'étape 4 ou enregistrez en brouillon.`
        );
        setStep(4);
        return;
      }
    }

    // Règle P1 : plafond max 20 photos (ou quota du plan)
    if (imageUrls.length > effectiveMaxPhotos) {
      setSubmitError(
        `Limite de ${effectiveMaxPhotos} photos par annonce dépassée (actuellement ${imageUrls.length}). Retirez l'excédent à l'étape 4.`
      );
      setStep(4);
      return;
    }

    // Règle P2 : Visite virtuelle limitée aux domaines autorisés
    const vtCheck = validateVirtualTourUrl(virtualTourUrl, allowedTourDomains);
    if (!vtCheck.valid) {
      setVirtualTourError(vtCheck.error || 'Domaine de visite virtuelle non autorisé.');
      setSubmitError(vtCheck.error || 'Domaine de visite virtuelle non autorisé.');
      setStep(4);
      return;
    }

    // Règle P2 : Vidéo <= 60 secondes
    if (videoDuration && videoDuration > MAX_VIDEO_DURATION_SECONDS) {
      setSubmitError(`La vidéo dépasse la durée maximale autorisée de ${MAX_VIDEO_DURATION_SECONDS} secondes.`);
      setStep(4);
      return;
    }

    // Quotas d'abonnement pour les comptes non-admin lors d'une publication
    if (!isAdminUser) {
      const willPublishSlot =
        targetMode === 'PUBLISHED' &&
        (!editingProperty || editingProperty.softHiddenByPlan || editingProperty.published === false);
      if (willPublishSlot && activeListingsUsed >= maxListingsCap) {
        setSubmitError(
          `Quota d'annonces actives atteint (${activeListingsUsed}/${maxListingsCap}) pour votre formule ${billingSummary.plan.name}. Enregistrez en brouillon ou passez à une formule supérieure.`
        );
        return;
      }
      const isAttachingNewVideo = Boolean(videoUrl.trim()) && !editingProperty?.videoUrl;
      if (isAttachingNewVideo && videosUsed >= maxVideosCap) {
        setSubmitError(
          maxVideosCap === 0
            ? `Votre formule ${billingSummary.plan.name} n'autorise pas l'ajout de vidéo. Retirez la vidéo à l'étape 4 ou passez à une formule supérieure.`
            : `Quota vidéo atteint (${videosUsed}/${maxVideosCap}) pour votre formule ${billingSummary.plan.name}.`
        );
        setStep(4);
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

    const propertyData: Property = {
      id: editingProperty ? editingProperty.id : `prop_${Date.now()}`,
      title: title.trim(),
      description: description || '',
      price: pricingCheck.data.price,
      currency: pricingCheck.data.currency,
      period: pricingCheck.data.period,
      isNegotiable: pricingCheck.data.isNegotiable,
      guaranteeMonths: pricingCheck.data.guaranteeMonths,
      advanceMonths: pricingCheck.data.advanceMonths,
      type,
      status,
      listingStatus: targetMode === 'DRAFT' ? 'DRAFT' : 'PUBLISHED',
      labels,
      category,
      commune,
      quartier,
      avenue,
      referencePoint: referencePoint || undefined,
      address: address || `${avenue ? avenue + ', ' : ''}${quartier ? quartier + ', ' : ''}${commune}, Kinshasa`,
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
      floorPlanPublicId: floorPlanUrl.trim() ? (floorPlanPublicId || extractCloudinaryPublicIdFromUrl(floorPlanUrl)) : undefined,
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
      agentId: editingProperty?.agentId || user.agentId || user.id,
      agencyId: editingProperty?.agencyId || user.agencyId || (user.role === 'agency' ? user.id : undefined),
      agencyName: editingProperty?.agencyName || user.agencyName || (user.role === 'agency' ? user.name : undefined),
      contactEmail: editingProperty?.contactEmail || user.email || undefined,
      contactPhone: editingProperty?.contactPhone || user.phone || undefined,
      createdAt: editingProperty ? editingProperty.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewsCount: editingProperty ? editingProperty.viewsCount : 1,
      featured: labels.includes('featured'),
      published: targetMode === 'PUBLISHED',
    };

    const fraudAnalysis = analyzePropertyForFraud(propertyData, properties, reports);
    const mergedFlags = [...fraudAnalysis.flags];
    let mergedScore = fraudAnalysis.riskScore;
    let mergedVerdict = fraudAnalysis.verdict;

    if (duplicateAlert && duplicateAlert.matches.length > 0 && !mergedFlags.some((f) => f.code === 'DUPLICATE_PHOTOS')) {
      mergedScore = Math.min(100, mergedScore + 35);
      mergedFlags.push({
        code: 'DUPLICATE_PHOTOS',
        label: 'Empreinte photo déjà utilisée sur une autre annonce',
        severity: 'high',
        score: 35,
        details: `${duplicateAlert.matches.length} correspondance(s) visuelle(s) détectée(s) avec d'autres biens.`,
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
      // Les brouillons restent non publiés mais ne sont jamais bloqués à l'enregistrement
      published: targetMode === 'PUBLISHED' && mergedVerdict !== 'suspect',
    };

    try {
      if (editingProperty) {
        await updateProperty(enrichedData);
      } else {
        await addProperty(enrichedData);
      }
      setIsSubmitting(false);

      if (targetMode === 'DRAFT') {
        if (duplicateAlert && duplicateAlert.matches.length > 0) {
          setModerationFeedback({
            verdict: 'review_required',
            title: 'Brouillon enregistré + signalement modération',
            message:
              'Votre brouillon a bien été sauvegardé (les photos similaires ont été signalées pour contrôle admin lors de la publication future).',
            flags: mergedFlags.map((f) => f.label),
          });
        } else {
          handleClose();
        }
        return;
      }

      if (mergedVerdict === 'suspect') {
        setModerationFeedback({
          verdict: 'suspect',
          title: '🔴 Annonce temporairement bloquée (Sécurité Anti-Fraude)',
          message:
            'Notre algorithme anti-fraude a relevé des anomalies critiques sur cette annonce. Par mesure de précaution, elle a été placée en quarantaine administrative jusqu\'à examen par l\'administrateur.',
          flags: mergedFlags.map((f) => f.label),
        });
      } else if (mergedVerdict === 'review_required') {
        setModerationFeedback({
          verdict: 'review_required',
          title: '🟠 Annonce enregistrée — Contrôle modération requis',
          message:
            'Votre annonce a été enregistrée. Un signalement (ex: empreinte photo similaire) nécessite une rapide validation manuelle de l\'équipe avant sa mise en avant.',
          flags: mergedFlags.map((f) => f.label),
        });
      } else {
        handleClose();
      }
    } catch (err: any) {
      console.error('Error saving property:', err);
      setIsSubmitting(false);
      setSubmitError(
        err?.message ||
          "Une erreur est survenue lors de l'enregistrement de l'annonce dans la base de données."
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProperty('PUBLISHED');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              {editingProperty ? 'Modifier l\'annonce' : 'Publier une nouvelle propriété'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Étape {step} sur 5 — Saisissez les caractéristiques et vos champs personnalisés
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-700 active:scale-95"
              title="Retourner à l'Accueil"
            >
              <Home className="w-3.5 h-3.5 text-emerald-400" />
              <span>Accueil</span>
            </button>
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Plan Quota Indicator */}
        {!isAdminUser && (
          <div className={`px-6 py-2.5 border-b text-[11px] flex flex-wrap items-center justify-between gap-2 font-mono tabular-nums ${
            isNewListingQuotaExceeded
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              : 'bg-slate-900/80 border-slate-800 text-slate-300'
          }`}>
            <span className="font-sans font-bold text-white">
              Formule : <span className="text-emerald-400">{billingSummary.plan.name}</span>
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <span>Annonces : <strong>{activeListingsUsed}/{maxListingsCap >= 500 ? '∞' : maxListingsCap}</strong></span>
              <span>Photos/bien : <strong>{imageUrls.length}/{maxPhotosCap}</strong></span>
              <span>Vidéos : <strong>{videosUsed}/{maxVideosCap}</strong></span>
            </div>
          </div>
        )}

        {/* Submit Error Banner */}
        {submitError && (
          <div className="p-4 bg-red-500/15 border-b border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-red-200">Erreur de publication</p>
              <p className="mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs">
          {[
            { num: 1, label: '1. Informations' },
            { num: 2, label: '2. Localisation' },
            { num: 3, label: '3. Critères & Équipements' },
            { num: 4, label: '4. Photos & Vidéo du Bien' },
            { num: 5, label: '5. Champs Privés' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`flex-1 py-3 px-4 font-semibold text-center border-b-2 whitespace-nowrap transition-all ${
                step === s.num
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* STEP 1: General Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Titre de l'annonce *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Penthouse d'Exception avec Vue Fleuve Congo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Description détaillée *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rédigez une description attrayante décrivant la propriété, son exposition et ses finitions..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Prix ({currency === 'CDF' ? 'FC' : 'USD'}) *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value.replace(/[^\d]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold text-sm tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Devise *
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value === 'CDF' ? 'CDF' : 'USD')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-emerald-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="CDF">CDF (FC)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Statut de la transaction
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PropertyStatus)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="for-sale">À Vendre</option>
                    <option value="for-rent">À Louer</option>
                    <option value="sold">Vendu / Loué (Transaction conclue)</option>
                    <option value="open-house">Portes Ouvertes</option>
                    <option value="pending">Sous Offre / Compromis</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Type de bien
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PropertyType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="apartment">Appartement</option>
                    <option value="house">Maison / Villa</option>
                    <option value="penthouse">Penthouse</option>
                    <option value="office">Bureaux / Tertiaire</option>
                    <option value="land">Terrain</option>
                    <option value="commercial">Local Commercial</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Prix négociable
                  </label>
                  <select
                    value={isNegotiable ? 'yes' : 'no'}
                    onChange={(e) => setIsNegotiable(e.target.value === 'yes')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="no">Non (Prix ferme)</option>
                    <option value="yes">Oui (Négociable)</option>
                  </select>
                </div>

                {status === 'for-rent' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Périodicité du loyer
                      </label>
                      <select
                        value={rentalPeriod}
                        onChange={(e) => setRentalPeriod(e.target.value === 'year' ? 'year' : 'month')}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="month">Par mois</option>
                        <option value="year">Par an</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Garantie (0–{MAX_RENTAL_MONTHS} mois)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={guaranteeMonthsInput}
                        onChange={(e) => setGuaranteeMonthsInput(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="ex: 3"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Avance (0–{MAX_RENTAL_MONTHS} mois)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={advanceMonthsInput}
                        onChange={(e) => setAdvanceMonthsInput(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="ex: 2"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold tabular-nums focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-2">
                  Badges & Labels Promotionnels
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'featured', label: 'En Vedette' },
                    { id: 'hot', label: 'Hot Deal / Coup de Cœur' },
                    { id: 'openhouse', label: 'Open House' },
                    { id: 'reduced', label: 'Prix Réduit' },
                    { id: 'new', label: 'Nouveauté' },
                  ].map((l) => (
                    <button
                      type="button"
                      key={l.id}
                      onClick={() => toggleLabel(l.id as PropertyLabel)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        labels.includes(l.id as PropertyLabel)
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Location Kinshasa */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Header Badge */}
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Localisation à Kinshasa (RDC)</h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Sélectionnez la commune, le quartier et l'avenue de Kinshasa pour permettre un filtrage précis et rapide par les acheteurs et locataires.
                  </p>
                </div>
              </div>

              {/* Commune Selection */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    Commune de Kinshasa *
                  </label>
                  {commune && KINSHASA_COMMUNES_DATA[commune]?.districts && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-emerald-400 border border-slate-700">
                      District : {KINSHASA_COMMUNES_DATA[commune].districts}
                    </span>
                  )}
                </div>
                <select
                  value={commune}
                  onChange={(e) => {
                    const newCommune = e.target.value;
                    setCommune(newCommune);
                    const qList = getQuartiersForCommune(newCommune);
                    const defaultQ = qList.length > 0 ? qList[0] : '';
                    setQuartier(defaultQ);
                    const avList = getPopularAvenuesForCommune(newCommune);
                    const defaultAv = avList.length > 0 ? avList[0] : '';
                    setAvenue(defaultAv);
                    setAddress(`${defaultAv ? defaultAv + ', ' : ''}${defaultQ ? defaultQ + ', ' : ''}${newCommune}, Kinshasa`);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium text-xs focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <optgroup label="Zones Résidentielles & Centre d'Affaires (Lukunga)">
                    {['Gombe', 'Ngaliema', 'Kintambo', 'Lingwala', 'Barumbu', 'Kinshasa'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Résidentiel & Universitaire (Mont-Amba)">
                    {['Limete', 'Lemba', 'Matete', 'Ngaba', 'Kisenso'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Plateau & Périphérie Sud (Lukunga)">
                    {['Mont-Ngafula'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Centre Populaire & Commercial (Funa)">
                    {['Bandalungwa', 'Kalamu', 'Kasa-Vubu', 'Ngiri-Ngiri', 'Selembao', 'Bumbu', 'Makala'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Grand Est & Zone Industrielle (Tshangu)">
                    {['Ndjili', 'Masina', 'Kimbanseke', 'Nsele', 'Maluku'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Quartier Selection & Free input */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Navigation className="w-4 h-4 text-emerald-400" />
                    Quartier à {commune} *
                  </label>
                  <div className="space-y-2">
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {getQuartiersForCommune(commune).map((q) => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                      <option value="custom">Autre quartier non listé...</option>
                    </select>

                    {/* If custom or user wants to specify directly */}
                    {(!getQuartiersForCommune(commune).includes(quartier) || quartier === '') && (
                      <input
                        type="text"
                        value={quartier}
                        onChange={(e) => {
                          setQuartier(e.target.value);
                          setAddress(`${avenue ? avenue + ', ' : ''}${e.target.value}, ${commune}, Kinshasa`);
                        }}
                        placeholder={`Saisir le quartier à ${commune}...`}
                        className="w-full bg-slate-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    )}
                  </div>
                </div>

                {/* Avenue / Boulevard Selection & Input */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    Avenue / Boulevard *
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      list="kinshasa-avenues-list"
                      value={avenue}
                      onChange={(e) => {
                        setAvenue(e.target.value);
                        setAddress(`${e.target.value ? e.target.value + ', ' : ''}${quartier ? quartier + ', ' : ''}${commune}, Kinshasa`);
                      }}
                      placeholder="ex: Boulevard du 30 Juin, Av. de la Justice, Av. des Écuries..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <datalist id="kinshasa-avenues-list">
                      {getPopularAvenuesForCommune(commune).map((av) => (
                        <option key={av} value={av} />
                      ))}
                    </datalist>

                    {/* Quick popular avenue pills */}
                    {getPopularAvenuesForCommune(commune).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400">Avenues populaires :</span>
                        {getPopularAvenuesForCommune(commune).slice(0, 3).map((av) => (
                          <button
                            type="button"
                            key={av}
                            onClick={() => {
                              setAvenue(av);
                              setAddress(`${av}, ${quartier ? quartier + ', ' : ''}${commune}, Kinshasa`);
                            }}
                            className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                              avenue === av
                                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {av}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Point de Repère / Numéro de Parcelle */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Point de repère / Numéro de parcelle ou Résidence (Recommandé à Kinshasa)
                </label>
                <input
                  type="text"
                  value={referencePoint}
                  onChange={(e) => setReferencePoint(e.target.value)}
                  placeholder="ex: N° 45, en face de l'ambassade de France, réf: Arrêt Safricas, Immeuble Crown Tower..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Full Address Generated / Editable */}
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Adresse complète affichée sur la fiche *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ex: Avenue des Écuries N° 12, Binza Macampagne, Ngaliema, Kinshasa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* City, Zip, Country */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Ville</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Code Postal / Réf</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Pays</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Geolocation Coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Latitude (Carte Kinshasa)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={isNaN(lat) ? '' : lat}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLat(isNaN(val) ? -4.3224 : val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Longitude (Carte Kinshasa)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={isNaN(lng) ? '' : lng}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setLng(isNaN(val) ? 15.3070 : val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Specs & Dynamic Fields Builder */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-white mb-3 text-sm">Caractéristiques Standard</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Chambres</label>
                    <input
                      type="number"
                      value={isNaN(bedrooms) ? '' : bedrooms}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBedrooms(isNaN(val) ? 0 : val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Salles de bain</label>
                    <input
                      type="number"
                      value={isNaN(bathrooms) ? '' : bathrooms}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setBathrooms(isNaN(val) ? 0 : val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Surface (m²)</label>
                    <input
                      type="number"
                      value={isNaN(area) ? '' : area}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setArea(isNaN(val) ? 0 : val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Garages</label>
                    <input
                      type="number"
                      value={isNaN(garages) ? '' : garages}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setGarages(isNaN(val) ? 0 : val);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* DYNAMIC FIELDS BUILDER SECTION */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Critères & Caractéristiques Complémentaires
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Spécifications détaillées du bien
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields
                    .filter((f) => !f.isPrivate)
                    .map((field) => (
                      <div key={field.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                        <label className="block font-semibold text-slate-200 mb-1">
                          {(typeof field.label === 'string' ? field.label : field.label?.fr) || field.key}{' '}
                          {field.unit && <span className="text-emerald-400">({field.unit})</span>}
                          {field.required && <span className="text-rose-400"> *</span>}
                        </label>

                        {field.type === 'select' ? (
                          <select
                            value={customFieldsState[field.key] || ''}
                            onChange={(e) =>
                              setCustomFieldsState((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">Sélectionner...</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : field.type === 'number' || field.type === 'area' ? (
                          <input
                            type="number"
                            value={isNaN(customFieldsState[field.key]) ? '' : (customFieldsState[field.key] ?? '')}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setCustomFieldsState((prev) => ({
                                ...prev,
                                [field.key]: isNaN(val) ? '' : val,
                              }));
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={customFieldsState[field.key] || ''}
                            onChange={(e) =>
                              setCustomFieldsState((prev) => ({
                                ...prev,
                                [field.key]: e.target.value,
                              }))
                            }
                            placeholder={field.defaultValue || ''}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Amenities & Media (Photos & Video) */}
          {step === 4 && (
            <div className="space-y-6">
              {/* Amenities */}
              <div>
                <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Équipements & Prestations du Bien
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {availableAmenities.map((item) => (
                    <label
                      key={item}
                      onClick={() => toggleAmenity(item)}
                      className={`p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all flex items-center gap-2 ${
                        amenities.includes(item)
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={amenities.includes(item)}
                        onChange={() => {}}
                        className="accent-emerald-500 rounded"
                      />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Photos Section (P1 : 3 min publication, 5 recommandées, 20 max ; compression, réordonnancement, couverture, alt) */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-emerald-400" />
                      <span>Galerie Photos ({imageUrls.length} / {effectiveMaxPhotos})</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">
                      {MIN_PROPERTY_PHOTOS} min (publication) · {RECOMMENDED_PROPERTY_PHOTOS} recommandées · {effectiveMaxPhotos} max · JPEG, PNG ou WebP ≤ 10 Mo (compression auto navigateur)
                    </p>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border tabular-nums ${
                      imageUrls.length < MIN_PROPERTY_PHOTOS
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : imageUrls.length >= RECOMMENDED_PROPERTY_PHOTOS
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                    }`}
                  >
                    {imageUrls.length < MIN_PROPERTY_PHOTOS
                      ? `Encore ${MIN_PROPERTY_PHOTOS - imageUrls.length} photo(s) pour publier (brouillon autorisé)`
                      : imageUrls.length < RECOMMENDED_PROPERTY_PHOTOS
                      ? `Publiable (${RECOMMENDED_PROPERTY_PHOTOS} photos recommandées)`
                      : 'Galerie optimale'}
                  </span>
                </div>

                {/* Alerte immédiate empreinte d'image déjà utilisée (P2) */}
                {duplicateAlert && duplicateAlert.matches.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="font-bold text-amber-100">
                        Alerte empreinte image : photo similaire détectée sur une autre annonce
                      </p>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        Correspondance trouvée avec :{' '}
                        {duplicateAlert.matches
                          .slice(0, 3)
                          .map((m) => `« ${m.propertyTitle || m.propertyId} »`)
                          .join(', ')}
                        . Cette annonce sera automatiquement signalée à la modération admin lors de l’envoi (les brouillons restent enregistrables).
                      </p>
                    </div>
                  </div>
                )}

                {/* Mobile Direct Photo Upload Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="p-3.5 min-h-[44px] rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                    <Camera className="w-5 h-5 text-emerald-400" />
                    <span>Prendre une Photo (Appareil Photo)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  <label className="p-3.5 min-h-[44px] rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                    <Upload className="w-5 h-5 text-emerald-400" />
                    <span>Importer JPEG / PNG / WebP (≤ 10 Mo)</span>
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
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>{imageUploadStatus || 'Compression et envoi signé vers Cloudinary...'}</span>
                  </div>
                )}

                {/* URL input fallback */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="url"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Ou collez un lien d'image (https://...)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddImage}
                    className="px-4 py-2 min-h-[40px] bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0 border border-slate-700 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" /> Ajouter URL
                  </button>
                </div>

                {/* Images Grid with Drag & Drop Reorder, Cover Promotion & Alt Text */}
                {imageUrls.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 text-center text-xs text-slate-400">
                    Aucune photo ajoutée. Importez au moins <strong className="text-slate-200">3 photos</strong> pour publier (ou sauvegardez en brouillon).
                  </div>
                ) : (
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
                          className={`rounded-2xl overflow-hidden border bg-slate-950 flex flex-col transition-all ${
                            i === 0
                              ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                              : draggedImageIndex === i
                              ? 'border-sky-400 opacity-70'
                              : 'border-slate-800'
                          }`}
                        >
                          <div className="relative aspect-video bg-slate-900 group">
                            <img
                              src={getOptimizedImageUrl(url, { width: 600 }) || url}
                              alt={meta?.alt || `Photo ${i + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1">
                              <span
                                className="p-1.5 rounded-lg bg-slate-950/80 text-slate-200 border border-white/10 cursor-grab"
                                title="Glisser pour réordonner"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                              {i === 0 ? (
                                <span className="px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center gap-1 shadow">
                                  <Star className="w-3 h-3 fill-slate-950" />
                                  Couverture
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => moveImageOrder(i, 0)}
                                  className="px-2 py-1 rounded-lg bg-slate-950/85 hover:bg-emerald-500 text-slate-200 hover:text-slate-950 text-[10px] font-bold border border-white/10 cursor-pointer transition-colors"
                                  title="Définir comme photo de couverture"
                                >
                                  Couverture
                                </button>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(i)}
                              className="absolute top-2 right-2 p-2 min-w-[34px] min-h-[34px] bg-rose-600/90 hover:bg-rose-500 text-white rounded-lg shadow-lg flex items-center justify-center cursor-pointer"
                              title="Supprimer la photo (y compris sur Cloudinary)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="absolute bottom-2 right-2 flex items-center gap-1">
                              <button
                                type="button"
                                disabled={i === 0}
                                onClick={() => moveImageOrder(i, i - 1)}
                                className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-white border border-white/10 disabled:opacity-30 cursor-pointer"
                                title="Déplacer avant"
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={i === imageUrls.length - 1}
                                onClick={() => moveImageOrder(i, i + 1)}
                                className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-white border border-white/10 disabled:opacity-30 cursor-pointer"
                                title="Déplacer après"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="p-2.5 space-y-1.5">
                            <input
                              type="text"
                              value={meta?.alt || ''}
                              onChange={(e) => handleUpdateImageAlt(i, e.target.value)}
                              placeholder={`Texte alternatif (ex: Salon lumineux ${i + 1})`}
                              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono tabular-nums">
                              <span>Photo #{i + 1}</span>
                              {meta?.bytes ? <span>{formatBytesCompact(meta.bytes)}</span> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Plan du bien (image) */}
              <div className="pt-5 border-t border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white text-sm flex items-center gap-2">
                      <FileImage className="w-4 h-4 text-sky-400" />
                      <span>Plan du bien (image)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Importez le plan architectural ou la distribution des pièces (JPEG, PNG ou WebP ≤ 10 Mo).
                    </p>
                  </div>
                  {floorPlanUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveFloorPlan}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer le plan
                    </button>
                  )}
                </div>

                {!floorPlanUrl ? (
                  <label className="p-4 min-h-[52px] rounded-2xl border border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-950/70 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    {isUploadingFloorPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                        <span>Compression et envoi du plan sur Cloudinary...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-sky-400" />
                        <span>Importer le plan du bien (JPEG, PNG, WebP ≤ 10 Mo)</span>
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
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row gap-3 items-start">
                    <img
                      src={getOptimizedImageUrl(floorPlanUrl, { width: 600 }) || floorPlanUrl}
                      alt={floorPlanAlt || 'Plan du bien'}
                      className="w-full sm:w-44 aspect-video object-contain rounded-xl bg-slate-900 border border-slate-800 shrink-0"
                    />
                    <div className="flex-1 w-full space-y-2">
                      <label className="block text-[11px] font-semibold text-slate-300">
                        Légende / Texte alternatif du plan
                      </label>
                      <input
                        type="text"
                        value={floorPlanAlt}
                        onChange={(e) => setFloorPlanAlt(e.target.value)}
                        placeholder="Ex: Plan rez-de-chaussée 3 chambres + terrasse"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* DEDICATED HOUSE VIDEO PUBLISHING SECTION (P2 : 60s max & 100 Mo max, modération équipe) */}
              <div className="pt-5 border-t border-slate-800 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-emerald-500/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <Video className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm">
                          Visite Vidéo Verticale / Reels (P2)
                        </h4>
                        <p className="text-slate-400 text-xs mt-0.5">
                          60 secondes max · 100 Mo max (MP4, MOV, WebM) · Modérée par l’équipe avant publication publique.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Upload Progress Bar */}
                  {videoUploading && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-400 font-bold flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                          Envoi signé de la vidéo vers Cloudinary...
                        </span>
                        <span className="text-emerald-300 font-extrabold tabular-nums">{videoUploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all duration-200"
                          style={{ width: `${videoUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Feedback Messages */}
                  {videoUploadSuccess && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{videoUploadSuccess}</span>
                    </div>
                  )}

                  {videoUploadError && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                      <VideoOff className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{videoUploadError}</span>
                    </div>
                  )}

                  {/* Video Actions: 1) Camera Direct Recording, 2) File Upload */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <label className="p-3.5 min-h-[44px] rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm group">
                      <Film className="w-5 h-5 text-emerald-400" />
                      <span>Filmer (≤ 60s · Mobile)</span>
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/*"
                        capture="environment"
                        onChange={handleVideoFileUpload}
                        className="hidden"
                      />
                    </label>

                    <label className="p-3.5 min-h-[44px] rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm group">
                      <FileVideo className="w-5 h-5 text-emerald-400" />
                      <span>Importer Vidéo (≤ 60s · ≤ 100 Mo)</span>
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                        onChange={handleVideoFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Video URL Input */}
                  <div className="mt-3 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-300">
                      Ou collez un lien vidéo (YouTube, Vimeo, Cloud Storage) :
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => {
                          setVideoUrl(e.target.value);
                          setVideoUploadError(null);
                        }}
                        placeholder="ex: https://www.youtube.com/watch?v=... ou lien MP4"
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl flex items-center gap-1 border border-rose-500/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Retirer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sample Video Tours for quick test */}
                  <div className="mt-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Visites vidéo d'exemple :
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {SAMPLE_REAL_ESTATE_VIDEOS.map((sample) => (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => handleSelectSampleVideo(sample.url)}
                          className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all text-xs cursor-pointer ${
                            videoUrl === sample.url
                              ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                              : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 relative bg-slate-800">
                            <img src={sample.thumbnail} alt={sample.title} className="w-full h-full object-cover" />
                            <Play className="w-3 h-3 text-white absolute inset-0 m-auto fill-white" />
                          </div>
                          <div className="overflow-hidden">
                            <div className="truncate text-[11px] font-bold">{sample.title}</div>
                            <div className="text-[10px] text-slate-500">{sample.duration} HD</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Video Preview in Modal */}
                  {videoUploading ? (
                    <div className="mt-4 p-8 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                      <span className="text-xs font-bold text-slate-200">Téléversement et validation de votre vidéo...</span>
                    </div>
                  ) : videoUrl ? (
                    <div className="mt-4 p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-emerald-400 tabular-nums">
                          Aperçu ({detectVideoType(videoUrl).toUpperCase()}
                          {videoDuration ? ` · ${Math.round(videoDuration)}s / ${MAX_VIDEO_DURATION_SECONDS}s max` : ''})
                        </span>
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Supprimer la vidéo
                        </button>
                      </div>

                      <PropertyVideoPlayer
                        videoUrl={videoUrl}
                        title={`Visite vidéo : ${title || 'Propriété'}`}
                        posterImage={imageUrls[0]}
                        className="w-full max-h-[300px]"
                      />

                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 font-medium">
                        {isAdminUser
                          ? 'Compte administrateur : vidéo immédiatement diffusable.'
                          : 'File de modération : la vidéo restera masquée au public jusqu’à validation par l’équipe Kinimmo.'}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Visite Virtuelle 3D (P2 : Domaines autorisés uniquement) */}
                <div className="pt-2 space-y-1.5">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>Lien Visite Virtuelle 3D (Domaines autorisés uniquement)</span>
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
                    placeholder="https://my.matterport.com/show/?m=... ou https://kuula.co/..."
                    className={`w-full bg-slate-950 border rounded-xl px-3 py-2 text-white focus:outline-none ${
                      virtualTourError ? 'border-rose-500' : 'border-slate-800 focus:border-emerald-500'
                    }`}
                  />
                  {virtualTourError ? (
                    <p className="text-[11px] text-rose-400 font-semibold">{virtualTourError}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Domaines autorisés : {allowedTourDomains.slice(0, 6).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Private Fields (PRO) */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-300 mb-1">Espace Privé Agent & Admin (PRO)</h5>
                  <p className="text-amber-200/80 leading-relaxed">
                    Les informations enregistrées ici ne sont **jamais publiées** au grand public. Elles sont strictement réservées à l'agent responsable et à l'administration de l'agence.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Nom du Propriétaire
                  </label>
                  <input
                    type="text"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="Comte de la Rochefoucauld"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Tél. Direct Propriétaire
                  </label>
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Taux Commission Agence (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={isNaN(commissionRate) ? '' : commissionRate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCommissionRate(isNaN(val) ? 5 : val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Code Boîte à Clés / Instructions d'accès
                </label>
                <input
                  type="text"
                  value={keyBoxCode}
                  onChange={(e) => setKeyBoxCode(e.target.value)}
                  placeholder="ex: Hall 2, Code 4829"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Notes Internes & Motivation Vendeur
                </label>
                <textarea
                  rows={3}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="Saisissez vos remarques internes sur les critères de négociation, créneaux de visite préférés, etc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            {submitError && (
              <div className="p-3.5 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in duration-200">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-100">Action impossible :</p>
                  <p className="mt-0.5 text-red-200 font-medium">{submitError}</p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center gap-2">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(1, s - 1))}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer active:scale-95 transition-all text-xs"
                >
                  ← Précédent
                </button>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-2">
                {step < 5 && (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="px-5 py-2.5 min-h-[42px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold cursor-pointer active:scale-95 transition-all text-xs"
                  >
                    Suivant (Étape {step + 1}/5) →
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSubmitting || isCompressingImages || isUploadingFloorPlan}
                  onClick={() => saveProperty('DRAFT')}
                  className="px-4 py-2.5 min-h-[42px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer text-xs"
                  title="Enregistrer en brouillon (autorisé avec moins de 3 photos)"
                >
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                  <span>Enregistrer en brouillon</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || isCompressingImages || isUploadingFloorPlan}
                  className="px-6 py-2.5 min-h-[42px] rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:scale-[1.02] active:scale-95 transition-transform shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer text-xs"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{editingProperty ? 'Enregistrement...' : 'Publication...'}</span>
                    </>
                  ) : (
                    <span>{editingProperty ? "Mettre à jour & Publier" : "Publier l'annonce"}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Pop-in de notification anti-fraude après soumission */}
      {moderationFeedback && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  moderationFeedback.verdict === 'suspect'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                {moderationFeedback.verdict === 'suspect' ? (
                  <AlertOctagon className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">{moderationFeedback.title}</h4>
                <span className="text-[11px] text-slate-400">Contrôle de sécurité Kinimmo RDC</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {moderationFeedback.message}
            </p>

            {moderationFeedback.flags.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Éléments relevés :</span>
                <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                  {moderationFeedback.flags.map((flag, idx) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setModerationFeedback(null);
                handleClose();
              }}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
            >
              J'ai compris & Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
