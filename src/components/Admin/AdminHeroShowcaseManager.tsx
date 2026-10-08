import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ArchitecturalSlide } from '../../types/heroShowcase';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Building2,
  MapPin,
  Check,
  X,
  ExternalLink,
  RotateCcw,
  Star,
  Search,
  Sliders,
  DollarSign,
  Phone,
  MessageCircle
} from 'lucide-react';

interface AdminHeroShowcaseManagerProps {
  onReturnHome?: () => void;
}

export const AdminHeroShowcaseManager: React.FC<AdminHeroShowcaseManagerProps> = ({ onReturnHome }) => {
  const {
    heroSlides,
    addHeroSlide,
    updateHeroSlide,
    deleteHeroSlide,
    properties,
    agencies,
    promotePropertyToHero,
    removePropertyFromHero,
    setHeroSlides
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [propertySearchQuery, setPropertySearchQuery] = useState('');
  const [showPropertyPicker, setShowPropertyPicker] = useState(false);

  // Form State for Adding / Editing a Slide
  const [formData, setFormData] = useState<Partial<ArchitecturalSlide>>({
    title: '',
    subTitle: '',
    badgeCategory: 'RÉSIDENTIEL HAUT STANDING',
    badgeLocation: 'LA GOMBE, KINSHASA',
    description: '',
    image: '',
    propertyType: 'Appartement de Prestige',
    commune: 'Gombe',
    isActive: true,
    contactName: '',
    contactRole: '',
    contactPhone: '',
    contactWhatsapp: '',
    contactEmail: '',
    legalStatus: '',
    stats: {
      floors: '',
      units: '',
      parking: '',
      surface: ''
    },
    details: {
      amenities: ['Sécurité 24/7', 'Groupe électrogène & Solaire', 'Vue panoramique'],
      priceInfo: '',
      deliveryDate: 'Disponible immédiatement'
    }
  });

  const [amenityInput, setAmenityInput] = useState('');

  const openNewSlideModal = () => {
    setEditingSlideId(null);
    setFormData({
      title: '',
      subTitle: '',
      badgeCategory: 'RÉSIDENTIEL DE PRESTIGE',
      badgeLocation: 'LA GOMBE, KINSHASA',
      description: '',
      image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1600&auto=format&fit=crop&q=85',
      propertyType: 'Résidence Contemporaine',
      commune: 'Gombe',
      isActive: true,
      contactName: agencies[0]?.name || 'Congo Luxury Homes & Development',
      contactRole: 'Agence Partenaire Agréée',
      contactPhone: agencies[0]?.phone || '+243 81 000 0001',
      contactWhatsapp: agencies[0]?.whatsapp || '+243 81 000 0001',
      contactEmail: agencies[0]?.email || 'contact@congoluxuryhomes.cd',
      legalStatus: 'Certificat d’Enregistrement Notarié & Titre Foncier en Règle',
      stats: {
        floors: '10 Étages',
        units: '24 Appartements',
        parking: '2 Niveaux',
        surface: '160 à 350 m²'
      },
      details: {
        amenities: [
          'Sécurité biométrique 24/7',
          'Autonomie énergétique totale (Groupe & Solaire)',
          'Piscine et terrasse paysagère',
          'Titre foncier garanti au cadastre'
        ],
        priceInfo: '$350,000 / $3,500 mensuel',
        deliveryDate: 'Livraison immédiate'
      }
    });
    setIsModalOpen(true);
  };

  const openEditSlideModal = (slide: ArchitecturalSlide) => {
    setEditingSlideId(slide.id);
    setFormData({
      ...slide,
      contactName: slide.contactName || '',
      contactRole: slide.contactRole || '',
      contactPhone: slide.contactPhone || '',
      contactWhatsapp: slide.contactWhatsapp || '',
      contactEmail: slide.contactEmail || '',
      legalStatus: slide.legalStatus || '',
      stats: { ...slide.stats },
      details: {
        ...slide.details,
        amenities: [...(slide.details?.amenities || [])]
      }
    });
    setIsModalOpen(true);
  };

  const handleSaveSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.image) return;

    if (editingSlideId) {
      updateHeroSlide(editingSlideId, formData);
    } else {
      const newSlide: ArchitecturalSlide = {
        id: `slide_custom_${Date.now()}`,
        badgeCategory: formData.badgeCategory || 'PRESTIGE',
        badgeLocation: formData.badgeLocation || 'KINSHASA',
        title: formData.title || '',
        subTitle: formData.subTitle || '',
        description: formData.description || '',
        image: formData.image || '',
        propertyType: formData.propertyType || 'Résidence',
        commune: formData.commune || 'Gombe',
        isActive: formData.isActive !== false,
        contactName: formData.contactName,
        contactRole: formData.contactRole,
        contactPhone: formData.contactPhone,
        contactWhatsapp: formData.contactWhatsapp,
        contactEmail: formData.contactEmail,
        legalStatus: formData.legalStatus,
        order: heroSlides.length + 1,
        stats: formData.stats || {},
        details: formData.details || { amenities: [] }
      };
      addHeroSlide(newSlide);
    }

    setIsModalOpen(false);
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...heroSlides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;

    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    // re-assign order numbers
    newSlides.forEach((s, idx) => {
      s.order = idx + 1;
    });

    setHeroSlides(newSlides);
  };

  const handleToggleActive = (id: string, current: boolean) => {
    updateHeroSlide(id, { isActive: !current });
  };

  const handleAddAmenity = () => {
    if (!amenityInput.trim()) return;
    const currentAmenities = formData.details?.amenities || [];
    setFormData({
      ...formData,
      details: {
        ...formData.details,
        amenities: [...currentAmenities, amenityInput.trim()]
      }
    });
    setAmenityInput('');
  };

  const handleRemoveAmenity = (index: number) => {
    const currentAmenities = formData.details?.amenities || [];
    setFormData({
      ...formData,
      details: {
        ...formData.details,
        amenities: currentAmenities.filter((_, i) => i !== index)
      }
    });
  };

  // Filter properties to promote
  const availablePropertiesToPromote = properties.filter((p) => {
    const q = propertySearchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      (p.commune && p.commune.toLowerCase().includes(q)) ||
      p.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner / Actions Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gestion de la Vitrine & Mises en Avant (Style Safricode)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Projets & Propriétés en Vedette (Hero Showcase)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-normal leading-relaxed">
            Contrôlez directement les résidences et tours architecturales qui défilent en plein écran sur la page d’accueil. Vous pouvez ajouter vos propres projets ou promouvoir n'importe quel bien de votre catalogue en 1 clic.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full lg:w-auto">
          <button
            onClick={() => setShowPropertyPicker(!showPropertyPicker)}
            className="flex-1 lg:flex-none px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-md"
          >
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Mettre en avant un bien existant</span>
          </button>

          <button
            onClick={openNewSlideModal}
            className="flex-1 lg:flex-none px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau Projet d'Exception</span>
          </button>

          {onReturnHome && (
            <button
              onClick={onReturnHome}
              title="Voir le rendu sur le site"
              className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center justify-center cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick 1-Click Property Promotion Drawer */}
      {showPropertyPicker && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-white font-black text-sm uppercase tracking-wide">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Sélectionnez un bien de votre catalogue à projeter dans la Vitrine Hero</span>
            </div>
            <button
              onClick={() => setShowPropertyPicker(false)}
              className="p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={propertySearchQuery}
              onChange={(e) => setPropertySearchQuery(e.target.value)}
              placeholder="Filtrer vos propriétés par nom, commune (Gombe, Ngaliema...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
            {availablePropertiesToPromote.map((p) => {
              const isAlreadyInHero = heroSlides.some((s) => s.propertyId === p.id);

              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center gap-3 ${
                    isAlreadyInHero
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={p.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200'}
                    alt={p.title}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{p.title}</h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {p.commune || 'Kinshasa'} • ${p.price?.toLocaleString()}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      {isAlreadyInHero ? (
                        <button
                          onClick={() => removePropertyFromHero(p.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30 hover:bg-rose-500/30 cursor-pointer"
                        >
                          Retirer de la Vitrine
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            promotePropertyToHero(p.id);
                            setShowPropertyPicker(false);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-md"
                        >
                          + Mettre en Vitrine Hero
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Slides Management List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider px-2">
          <span>Projets Actuellement Configurés ({heroSlides.length})</span>
          <span>{heroSlides.filter((s) => s.isActive !== false).length} Actifs dans le carrousel</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {heroSlides.map((slide, index) => {
            const isActive = slide.isActive !== false;

            return (
              <div
                key={slide.id}
                className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
                  isActive
                    ? 'bg-slate-900 border-slate-800 shadow-lg'
                    : 'bg-slate-950/60 border-slate-800/60 opacity-60'
                }`}
              >
                {/* Left: Thumbnail & Main Content */}
                <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
                  <div className="relative w-24 sm:w-32 h-20 sm:h-24 rounded-2xl overflow-hidden border border-slate-800 shrink-0">
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 font-mono text-[9px] font-bold text-emerald-400">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[9px] font-bold uppercase tracking-wider">
                        {slide.badgeCategory}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {slide.badgeLocation}
                      </span>
                      {slide.propertyId && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">
                          Lié à un bien
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate">
                      {slide.title}
                    </h3>

                    <p className="text-xs text-emerald-400/90 font-semibold uppercase tracking-wider truncate">
                      {slide.subTitle}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 font-mono pt-1">
                      {slide.stats.floors && <span>🏢 {slide.stats.floors}</span>}
                      {slide.stats.units && <span>🔑 {slide.stats.units}</span>}
                      {slide.stats.parking && <span>🚗 {slide.stats.parking}</span>}
                      {slide.details?.priceInfo && (
                        <span className="text-white font-bold">💰 {slide.details.priceInfo}</span>
                      )}
                    </div>

                    {(slide.contactPhone || slide.contactWhatsapp || slide.contactName) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-bold">
                          <Phone className="w-3 h-3 text-emerald-400" />
                          <span>Contact Direct : {slide.contactName ? `${slide.contactName} • ` : ''}{slide.contactPhone || slide.contactWhatsapp}</span>
                        </span>
                        {slide.contactRole && (
                          <span className="text-[10px] text-slate-400 font-medium italic">
                            ({slide.contactRole})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Controls & Actions */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
                  {/* Order re-positioning */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => handleMoveOrder(index, 'up')}
                      disabled={index === 0}
                      title="Monter dans le carrousel"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(index, 'down')}
                      disabled={index === heroSlides.length - 1}
                      title="Descendre dans le carrousel"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Toggle Active / Inactive */}
                  <button
                    onClick={() => handleToggleActive(slide.id, isActive)}
                    title={isActive ? 'Désactiver du carrousel' : 'Activer dans le carrousel'}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isActive ? 'Actif' : 'Masqué'}</span>
                  </button>

                  {/* Edit Slide */}
                  <button
                    onClick={() => openEditSlideModal(slide)}
                    title="Modifier ce projet d'exception"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete Slide */}
                  <button
                    onClick={() => deleteHeroSlide(slide.id)}
                    title="Supprimer définitivement ce slide"
                    className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Editor (Add or Edit Slide) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl p-6 sm:p-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <form onSubmit={handleSaveSlide} className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span>{editingSlideId ? 'Modifier la Mise en Avant' : 'Nouveau Projet Architectural'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Définissez l'ensemble des éléments visuels et caractéristiques de ce programme immobilier d'exception.
                </p>
              </div>

              {/* Basic Informations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Titre Impactant (ex: L'ADRESSE, TOUR...)</label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="L'ADRESSE : L'EXCELLENCE ARCHITECTURALE..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Sous-titre Prestige</label>
                  <input
                    type="text"
                    required
                    value={formData.subTitle || ''}
                    onChange={(e) => setFormData({ ...formData, subTitle: e.target.value })}
                    placeholder="LA TOUR ICONIQUE QUI TUTOIE LE SOMMET À KINSHASA"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Badge Catégorie</label>
                  <input
                    type="text"
                    required
                    value={formData.badgeCategory || ''}
                    onChange={(e) => setFormData({ ...formData, badgeCategory: e.target.value })}
                    placeholder="RÉSIDENTIEL & COMMERCIAL"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Badge Localisation</label>
                  <input
                    type="text"
                    required
                    value={formData.badgeLocation || ''}
                    onChange={(e) => setFormData({ ...formData, badgeLocation: e.target.value })}
                    placeholder="LA GOMBE, KINSHASA"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Photo Image URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">URL de l'image Haute Résolution</label>
                <input
                  type="url"
                  required
                  value={formData.image || ''}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                {formData.image && (
                  <div className="mt-2 h-36 rounded-xl overflow-hidden border border-slate-800">
                    <img src={formData.image} alt="Aperçu" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Descriptif Architectural</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="23 étages, 120 appartements de luxe, 3 penthouses exclusifs..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Architectural Technical Specifications */}
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="text-xs font-black uppercase text-emerald-400 tracking-wider">
                  Spécifications Techniques (Chiffres Clés)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Hauteur / Niveaux</label>
                    <input
                      type="text"
                      value={formData.stats?.floors || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stats: { ...formData.stats, floors: e.target.value }
                        })
                      }
                      placeholder="ex: 23 Étages"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Unités / Logements</label>
                    <input
                      type="text"
                      value={formData.stats?.units || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stats: { ...formData.stats, units: e.target.value }
                        })
                      }
                      placeholder="ex: 120 Appartements"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Parkings Sécurisés</label>
                    <input
                      type="text"
                      value={formData.stats?.parking || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stats: { ...formData.stats, parking: e.target.value }
                        })
                      }
                      placeholder="ex: 5 Niveaux"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Surfaces</label>
                    <input
                      type="text"
                      value={formData.stats?.surface || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stats: { ...formData.stats, surface: e.target.value }
                        })
                      }
                      placeholder="ex: 110 à 480 m²"
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Coordonnées de Contact Dédiées à ce Bien Mis en Avant */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-slate-950/70 border border-emerald-500/30 space-y-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black uppercase text-emerald-300 tracking-wider">
                    Contact Référent & Numéro Dédié à ce Bien Mis en Avant
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400">
                  Configurez le numéro de téléphone et le WhatsApp propre à ce bien. Les acquéreurs et locataires contacteront directement ce numéro lorsqu'ils cliqueront sur cette annonce.
                </p>

                {agencies && agencies.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Attribuer en 1-clic à une agence enregistrée :
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {agencies.slice(0, 6).map((ag) => (
                        <button
                          key={ag.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              contactName: ag.name,
                              contactRole: 'Agence Partenaire Agréée',
                              contactPhone: ag.phone || ag.whatsapp || '+243 81 000 0001',
                              contactWhatsapp: ag.whatsapp || ag.phone || '+243 81 000 0001',
                              contactEmail: ag.email || 'agence@kinimmo.com',
                              legalStatus: 'Dossier Conforme & Titre Foncier Vérifié'
                            });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 text-[10px] font-medium transition-all cursor-pointer"
                        >
                          + {ag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 uppercase font-bold block">
                      Nom du Contact / Agence Partenaire / Promoteur
                    </label>
                    <input
                      type="text"
                      value={formData.contactName || ''}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="ex: Agence Immo Kin Gombe SARL"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 uppercase font-bold block">
                      Rôle / Qualité du Contact
                    </label>
                    <input
                      type="text"
                      value={formData.contactRole || ''}
                      onChange={(e) => setFormData({ ...formData, contactRole: e.target.value })}
                      placeholder="ex: Agence Partenaire, Promoteur Officiel, Agent Référent"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 uppercase font-bold block">
                      Numéro Téléphone Direct pour ce Bien
                    </label>
                    <input
                      type="text"
                      value={formData.contactPhone || ''}
                      onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                      placeholder="+243 81 000 0001"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 uppercase font-bold block">
                      Numéro WhatsApp Direct pour ce Bien
                    </label>
                    <input
                      type="text"
                      value={formData.contactWhatsapp || ''}
                      onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
                      placeholder="+243 81 000 0001"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 uppercase font-bold block">
                      Email Direct de l'Agence / Promoteur
                    </label>
                    <input
                      type="email"
                      value={formData.contactEmail || ''}
                      onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                      placeholder="agence@kinimmo.com"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-300 uppercase font-bold block">
                      Statut Juridique & Foncier Certifié
                    </label>
                    <input
                      type="text"
                      value={formData.legalStatus || ''}
                      onChange={(e) => setFormData({ ...formData, legalStatus: e.target.value })}
                      placeholder="ex: Titre Foncier Notarié & Certificat d'Enregistrement Conforme"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Price & Delivery Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Tarif & Conditions</label>
                  <input
                    type="text"
                    value={formData.details?.priceInfo || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: { ...formData.details, priceInfo: e.target.value }
                      })
                    }
                    placeholder="ex: À partir de $280,000 ou $3,500/mois"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Délai / Statut de Livraison</label>
                  <input
                    type="text"
                    value={formData.details?.deliveryDate || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        details: { ...formData.details, deliveryDate: e.target.value }
                      })
                    }
                    placeholder="ex: Clés en mains disponibles"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Amenities Management */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 uppercase">Prestations & Commodités Clés</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    placeholder="Ajouter une prestation (ex: Piscine à débordement suspendue)"
                    className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAmenity}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Ajouter
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.details?.amenities?.map((amenity, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5"
                    >
                      <span>{amenity}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(idx)}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  Enregistrer et Mettre en Avant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
