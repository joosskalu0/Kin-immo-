import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Property, PropertyType, PropertyStatus, PropertyLabel } from '../types';
import {
  KINSHASA_COMMUNES_DATA,
  KINSHASA_COMMUNES_LIST,
  getQuartiersForCommune,
  getPopularAvenuesForCommune,
} from '../data/kinshasaLocations';
import {
  X,
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
} from 'lucide-react';
import { SAMPLE_REAL_ESTATE_VIDEOS, detectVideoType } from '../utils/videoHelpers';
import { PropertyVideoPlayer } from './PropertyVideoPlayer';

export const PropertyFormModal: React.FC = () => {
  const {
    isSubmitPropertyOpen,
    setIsSubmitPropertyOpen,
    editingProperty,
    setEditingProperty,
    addProperty,
    updateProperty,
    customFields,
    user,
  } = useApp();

  const [step, setStep] = useState(1);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(450000);
  const [currency, setCurrency] = useState('USD');
  const [period, setPeriod] = useState<'month' | 'year' | 'total'>('total');
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

  // Media
  const [imageUrls, setImageUrls] = useState<string[]>([
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&auto=format&fit=crop&q=80'
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [virtualTourUrl, setVirtualTourUrl] = useState('');
  const [videoUploading, setVideoUploading] = useState(false);
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
      setPrice(editingProperty.price);
      setCurrency(editingProperty.currency || 'EUR');
      setPeriod(editingProperty.period || 'total');
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
      setImageUrls(editingProperty.images || []);
      setVideoUrl(editingProperty.videoUrl || '');
      setVirtualTourUrl(editingProperty.virtualTourUrl || '');
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
    setStep(1);
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setImageUrls((prev) => [...prev, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setImageUrls((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 50MB
    const maxSizeBytes = 50 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setVideoUploadError("Le fichier vidéo dépasse 50 Mo. Pour des visites plus longues ou en 4K, privilégiez un lien YouTube / Vimeo ou un fichier compressé.");
      setVideoUploadSuccess(null);
      return;
    }

    setVideoUploadError(null);
    setVideoUploading(true);
    setVideoUploadSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setVideoUrl(result);
        setVideoUploading(false);
        setVideoUploadSuccess(`Vidéo "${file.name}" importée avec succès !`);
        setTimeout(() => setVideoUploadSuccess(null), 4000);
      }
    };
    reader.onerror = () => {
      setVideoUploadError("Une erreur est survenue lors de la lecture du fichier vidéo.");
      setVideoUploading(false);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveVideo = () => {
    setVideoUrl('');
    setVideoUploadError(null);
    setVideoUploadSuccess(null);
  };

  const handleSelectSampleVideo = (sampleUrl: string) => {
    setVideoUrl(sampleUrl);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const propertyData: Property = {
      id: editingProperty ? editingProperty.id : `prop_${Date.now()}`,
      title,
      description,
      price,
      currency,
      period: status === 'for-rent' ? 'month' : 'total',
      type,
      status,
      labels,
      category,
      commune,
      quartier,
      avenue,
      referencePoint: referencePoint || undefined,
      address: address || `${avenue ? avenue + ', ' : ''}${quartier ? quartier + ', ' : ''}${commune}, Kinshasa`,
      city: 'Kinshasa',
      zipCode: zipCode || 'KN-01',
      country: 'RDC',
      lat,
      lng,
      bedrooms,
      bathrooms,
      area,
      yearBuilt,
      garages,
      amenities,
      images: imageUrls.length > 0 ? imageUrls : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80'],
      videoUrl: videoUrl || undefined,
      virtualTourUrl: virtualTourUrl || undefined,
      customFields: customFieldsState,
      privateFields: {
        ownerName: ownerName || user?.name || '',
        ownerPhone: ownerPhone || user?.phone || '',
        ownerEmail: ownerEmail || user?.email || '',
        commissionRate,
        internalNotes,
        keyBoxCode,
      },
      agentId: user?.agentId || user?.id || user?.email || 'agent_1',
      createdAt: editingProperty ? editingProperty.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewsCount: editingProperty ? editingProperty.viewsCount : 1,
      featured: labels.includes('featured'),
      published: true,
    };

    if (editingProperty) {
      updateProperty(propertyData);
    } else {
      addProperty(propertyData);
    }

    handleClose();
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

          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs">
          {[
            { num: 1, label: '1. Informations' },
            { num: 2, label: '2. Localisation' },
            { num: 3, label: '3. Specs & Fields Builder' },
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
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          {/* STEP 1: General Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Titre de l'annonce *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: Penthouse d'Exception avec Vue Tour Eiffel"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Description détaillée *
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Rédigez une description attrayante décrivant la propriété, son exposition et ses finitions..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Prix *
                  </label>
                  <input
                    type="number"
                    required
                    value={isNaN(price) ? '' : price}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPrice(isNaN(val) ? 0 : val);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-bold text-sm focus:outline-none focus:border-emerald-500"
                  />
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
                    <option value="for-sale">A Vendre</option>
                    <option value="for-rent">A Louer</option>
                    <option value="open-house">Portes Ouvertes</option>
                    <option value="pending">Sous Offre</option>
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
                  required
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
                        required
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
                      required
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
                  required
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
                    required
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
                    Champs Personnalisés (Fields Builder)
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Gérés via le constructeur de champs
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields
                    .filter((f) => !f.isPrivate)
                    .map((field) => (
                      <div key={field.id} className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                        <label className="block font-semibold text-slate-200 mb-1">
                          {field.label['fr'] || field.key}{' '}
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

              {/* Photos Section */}
              <div className="pt-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-400" />
                    Galerie Photos ({imageUrls.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">Minimum 1 photo recommandée</span>
                </div>

                {/* Mobile Direct Photo Upload Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Camera capture input for smartphones */}
                  <label className="p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                    <Camera className="w-5 h-5 text-emerald-400" />
                    <span>Prendre une Photo (Appareil Photo)</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Gallery file picker input for mobile & desktop */}
                  <label className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm">
                    <Upload className="w-5 h-5 text-emerald-400" />
                    <span>Importer depuis Galerie / PC</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

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
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 shrink-0 border border-slate-700"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" /> Ajouter URL
                  </button>
                </div>

                {/* Images Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative aspect-video rounded-xl overflow-hidden group border border-slate-800 bg-slate-950 shadow-md">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-rose-500 text-white rounded-lg opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Supprimer la photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-slate-950/80 text-[10px] font-bold text-emerald-400 border border-emerald-500/30">
                          Photo Principale
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* DEDICATED HOUSE VIDEO PUBLISHING SECTION */}
              <div className="pt-5 border-t border-slate-800 space-y-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                        <Video className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-2">
                          Visite Vidéo de la Maison / Propriété
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold border border-emerald-500/30">
                            Recommandé PRO
                          </span>
                        </h4>
                        <p className="text-slate-400 text-xs mt-0.5">
                          Publiez une vidéo réelle (walkthrough) de l'intérieur, du salon ou de la cour pour rassurer les clients et multiplier les prises de contact.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Messages */}
                  {videoUploadSuccess && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      {videoUploadSuccess}
                    </div>
                  )}

                  {videoUploadError && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                      <VideoOff className="w-4 h-4 text-rose-400 shrink-0" />
                      {videoUploadError}
                    </div>
                  )}

                  {/* Video Actions: 1) Camera Direct Recording, 2) File Upload, 3) URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {/* Record with phone camera */}
                    <label className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm group">
                      <Film className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Filmer avec la Caméra Smartphone</span>
                      <input
                        type="file"
                        accept="video/*"
                        capture="environment"
                        onChange={handleVideoFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Import Video File */}
                    <label className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm group">
                      <FileVideo className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Importer Vidéo (MP4, MOV, WebM)</span>
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/webm,video/m4v,video/*"
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
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                      {videoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl flex items-center gap-1 border border-rose-500/30 transition-colors"
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
                        Visites vidéo d'exemple (cliquez pour tester) :
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {SAMPLE_REAL_ESTATE_VIDEOS.map((sample) => (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => handleSelectSampleVideo(sample.url)}
                          className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all text-xs ${
                            videoUrl === sample.url
                              ? 'bg-emerald-500/20 border-emerald-500 text-white font-bold'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
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
                    <div className="mt-4 p-8 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
                      <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                      <span className="text-xs font-bold text-slate-200">Traitement et chargement de votre vidéo...</span>
                      <span className="text-[11px] text-slate-400 mt-0.5">Veuillez patienter quelques secondes.</span>
                    </div>
                  ) : videoUrl ? (
                    <div className="mt-4 p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-xs font-bold text-emerald-400">
                            Aperçu de la vidéo avant publication ({detectVideoType(videoUrl).toUpperCase()})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveVideo}
                          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" /> Supprimer la vidéo
                        </button>
                      </div>

                      {/* Video Player */}
                      <PropertyVideoPlayer
                        videoUrl={videoUrl}
                        title={`Visite vidéo : ${title || 'Propriété'}`}
                        posterImage={imageUrls[0]}
                        className="w-full max-h-[300px]"
                      />

                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 font-medium flex items-center justify-between">
                        <span>✓ Cette vidéo sera affichée dans la fiche du bien et aura un badge sur l'annonce.</span>
                        <span className="font-bold">Prête à publier</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Matterport 3D Tour Link */}
                <div className="pt-2">
                  <label className="block font-semibold text-slate-300 mb-1">
                    Lien Visite Virtuelle 3D (Matterport / 360°)
                  </label>
                  <input
                    type="url"
                    value={virtualTourUrl}
                    onChange={(e) => setVirtualTourUrl(e.target.value)}
                    placeholder="https://my.matterport.com/show/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                  />
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
                    Les informations enregistrées ici ne sont **jamais publiées** au grand public. Elles sont strictement réservées à l'agent mandataire et à l'administration de l'agence.
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
          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                ← Précédent
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
              >
                Suivant →
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20"
              >
                {editingProperty ? 'Mettre à Jour l\'Annonce' : 'Publier la Propriété'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
