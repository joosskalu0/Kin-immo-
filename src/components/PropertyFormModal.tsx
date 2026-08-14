import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Property, PropertyType, PropertyStatus, PropertyLabel } from '../types';
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
} from 'lucide-react';

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

  // Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Kinshasa');
  const [zipCode, setZipCode] = useState('Kinshasa');
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
      setAddress(editingProperty.address);
      setCity(editingProperty.city);
      setZipCode(editingProperty.zipCode);
      setCountry(editingProperty.country);
      setLat(editingProperty.lat);
      setLng(editingProperty.lng);
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
      address,
      city,
      zipCode,
      country,
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
            { num: 4, label: '4. Équipements & Galerie' },
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
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
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

          {/* STEP 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Adresse postale *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ex: 28 Avenue Victor Hugo"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Paris, Nice, Lyon..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Code Postal
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="75008"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Pays
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="France"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Latitude (Carte AJAX)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Longitude (Carte AJAX)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
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
                      value={bedrooms}
                      onChange={(e) => setBedrooms(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Salles de bain</label>
                    <input
                      type="number"
                      value={bathrooms}
                      onChange={(e) => setBathrooms(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Surface (m²)</label>
                    <input
                      type="number"
                      value={area}
                      onChange={(e) => setArea(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Garages</label>
                    <input
                      type="number"
                      value={garages}
                      onChange={(e) => setGarages(Number(e.target.value))}
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
                            value={customFieldsState[field.key] || ''}
                            onChange={(e) =>
                              setCustomFieldsState((prev) => ({
                                ...prev,
                                [field.key]: Number(e.target.value),
                              }))
                            }
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

          {/* STEP 4: Amenities & Media */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h4 className="font-bold text-white mb-3 text-sm">Équipements & Prestations</h4>
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

              <div className="pt-4 border-t border-slate-800 space-y-4">
                <h4 className="font-bold text-white text-sm">Galerie Photos & Vidéos</h4>

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
                    <span>Importer depuis Téléphone / Galerie</span>
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
                        className="absolute top-1.5 right-1.5 p-1.5 bg-rose-500 text-white rounded-lg opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer la photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Lien Vidéo (YouTube / Vimeo)
                    </label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Lien Visite Virtuelle (Matterport)
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
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(Number(e.target.value))}
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
