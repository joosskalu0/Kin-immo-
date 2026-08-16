import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { convertAndFormatPrice } from '../utils/currency';
import { generatePropertyPDF } from '../utils/pdfGenerator';
import {
  X,
  Bed,
  Bath,
  Maximize,
  Heart,
  Scale,
  Share2,
  FileDown,
  Phone,
  Mail,
  Calendar,
  Send,
  Lock,
  Sparkles,
  Zap,
  Play,
  MapPin,
  CheckCircle2,
  Calculator,
  UserCheck,
  MessageCircle,
  Compass,
  Navigation,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { MortgageCalculator } from './MortgageCalculator';

interface PropertyDetailModalProps {
  onOpenShareModal: (propertyId: string) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({ onOpenShareModal }) => {
  const {
    activePropertyModalId,
    setActivePropertyModalId,
    properties,
    customFields,
    currency,
    agents,
    wishlist,
    toggleWishlist,
    compareList,
    toggleCompare,
    addLeadRequest,
    recordPropertyAction,
    user,
  } = useApp();

  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video' | 'calculator'>('photos');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Tour / Contact Form State
  const [requestType, setRequestType] = useState<'info' | 'tour'>('info');
  const [leadName, setLeadName] = useState(user?.name || '');
  const [leadEmail, setLeadEmail] = useState(user?.email || '');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadMessage, setLeadMessage] = useState('Bonjour, je suis intéressé par cette propriété. Merci de me recontacter.');
  const [tourDate, setTourDate] = useState('2026-08-12');
  const [tourTime, setTourTime] = useState('14:00');
  const [isSent, setIsSent] = useState(false);

  if (!activePropertyModalId) return null;

  const property = properties.find((p) => p.id === activePropertyModalId);
  if (!property) return null;

  const isFavorite = wishlist.includes(property.id);
  const isCompared = compareList.includes(property.id);
  const formattedPrice = convertAndFormatPrice(property.price, currency);
  const agent = agents.find((a) => a.id === property.agentId);

  const handleSendLead = (e: React.FormEvent) => {
    e.preventDefault();
    addLeadRequest({
      propertyId: property.id,
      propertyTitle: property.title,
      agentId: property.agentId,
      userName: leadName || 'Client',
      userEmail: leadEmail || 'client@immocraft.fr',
      userPhone: leadPhone || '+33 6 00 00 00 00',
      message: leadMessage,
      requestType,
      tourDate: requestType === 'tour' ? tourDate : undefined,
      tourTime: requestType === 'tour' ? tourTime : undefined,
    });
    recordPropertyAction(property.id, 'lead');
    setIsSent(true);
    setTimeout(() => setIsSent(false), 4000);
  };

  const handleDownloadPDF = () => {
    recordPropertyAction(property.id, 'share');
    generatePropertyPDF(property, customFields, agent, currency);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl my-auto overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[95vh]">
        {/* Top Sticky Header Bar */}
        <div className="p-4 sm:p-6 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="text-emerald-400 font-semibold">{property.category}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {property.address}, {property.city}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-bold text-white line-clamp-1 mt-0.5">
              {property.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">PDF Flyer</span>
            </button>

            {/* Share */}
            <button
              onClick={() => onOpenShareModal(property.id)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              title="Partager l'annonce"
            >
              <Share2 className="w-4 h-4 text-sky-400" />
            </button>

            {/* Wishlist */}
            <button
              onClick={() => toggleWishlist(property.id)}
              className={`p-2 rounded-xl transition-all ${
                isFavorite
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-white' : ''}`} />
            </button>

            {/* Close */}
            <button
              onClick={() => setActivePropertyModalId(null)}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Media Header / Lightbox */}
          <div className="space-y-3">
            <div className="flex border-b border-slate-800 text-xs">
              <button
                onClick={() => setActiveMediaTab('photos')}
                className={`py-2.5 px-4 font-semibold border-b-2 transition-colors ${
                  activeMediaTab === 'photos'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                Photos ({property.images.length})
              </button>

              {property.videoUrl && (
                <button
                  onClick={() => setActiveMediaTab('video')}
                  className={`py-2.5 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeMediaTab === 'video'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 text-emerald-400" />
                  Vidéo HD
                </button>
              )}

              <button
                onClick={() => setActiveMediaTab('calculator')}
                className={`py-2.5 px-4 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  activeMediaTab === 'calculator'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400'
                }`}
              >
                <Calculator className="w-3.5 h-3.5 text-emerald-400" />
                Calculateur de Prêt
              </button>
            </div>

            {activeMediaTab === 'photos' && (
              <div className="space-y-3">
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
                  <img
                    src={property.images[selectedImageIndex] || property.images[0]}
                    alt={property.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800">
                    <span className="text-xl font-bold text-emerald-400">{formattedPrice}</span>
                    {property.period === 'month' && <span className="text-xs text-slate-400"> /mois</span>}
                  </div>
                </div>

                {/* Thumbnails */}
                {property.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {property.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`relative w-20 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                          selectedImageIndex === idx ? 'border-emerald-500 scale-105' : 'border-slate-800 opacity-60'
                        }`}
                      >
                        <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeMediaTab === 'video' && (
              <div className="aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-slate-800">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=0"
                  title="Video Tour"
                  className="w-full h-full border-none"
                  allowFullScreen
                />
              </div>
            )}

            {activeMediaTab === 'calculator' && (
              <MortgageCalculator initialPrice={property.price} />
            )}
          </div>

          {/* Grid Layout: Left Details, Right Lead Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-800">
            {/* Left 2 Cols: Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block">Chambres</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                    <Bed className="w-4 h-4 text-emerald-400" /> {property.bedrooms}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Salles de bain</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                    <Bath className="w-4 h-4 text-emerald-400" /> {property.bathrooms}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Surface</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                    <Maximize className="w-4 h-4 text-emerald-400" /> {property.area} m²
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Garages</span>
                  <span className="text-sm font-bold text-white flex items-center gap-1 mt-0.5">
                    🚗 {property.garages || 0}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold text-white mb-2">Description du Bien</h4>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
                  {property.description}
                </p>
              </div>

              {/* Localisation Kinshasa (Commune, Quartier, Avenue) */}
              <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 space-y-3">
                <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  Localisation à Kinshasa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[11px] font-medium flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-emerald-400" /> Commune
                    </span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {property.commune || 'Kinshasa'}
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[11px] font-medium flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5 text-emerald-400" /> Quartier
                    </span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {property.quartier || 'Centre'}
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 block text-[11px] font-medium flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-400" /> Avenue / Voie
                    </span>
                    <span className="text-sm font-bold text-white mt-0.5 block truncate">
                      {property.avenue || property.address}
                    </span>
                  </div>
                </div>

                {property.referencePoint && (
                  <div className="text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-slate-300 flex items-start gap-2">
                    <span className="text-emerald-400 font-semibold shrink-0">Repère / Réf :</span>
                    <span>{property.referencePoint}</span>
                  </div>
                )}
              </div>

              {/* DYNAMIC FIELDS BUILDER SECTION */}
              <div>
                <h4 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  Champs Personnalisés (Fields Builder)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {customFields
                    .filter((f) => !f.isPrivate)
                    .map((field) => {
                      const val = property.customFields[field.key];
                      if (val === undefined || val === null || val === '') return null;
                      return (
                        <div
                          key={field.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <span className="text-slate-400 font-medium">
                            {field.label['fr'] || field.key}
                          </span>
                          <span className="font-bold text-slate-200">
                            {val} {field.unit || ''}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Amenities */}
              {property.amenities.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-white mb-3">Équipements & Prestations</h4>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* PRIVATE FIELDS (ADMIN / AGENT ONLY) */}
              {(user?.role === 'admin' || user?.role === 'agent') && property.privateFields && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <Lock className="w-4 h-4 text-amber-400" />
                    Champs Privés Agent & Administration (PRO)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-200">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Propriétaire</span>
                      <span className="font-semibold">{property.privateFields.ownerName || 'N/C'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tél. Propriétaire</span>
                      <span className="font-semibold">{property.privateFields.ownerPhone || 'N/C'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Commission Agence</span>
                      <span className="font-semibold text-emerald-400">{property.privateFields.commissionRate || 4}%</span>
                    </div>
                  </div>
                  {property.privateFields.internalNotes && (
                    <div className="text-[11px] text-amber-200/90 pt-1 border-t border-amber-500/20">
                      <strong>Notes Agent:</strong> {property.privateFields.internalNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Col: Agent Card & Contact Form Widget */}
            <div className="space-y-4">
              {/* Agent Card */}
              {agent && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/40"
                      />
                      {(agent.isVerified || agent.verificationStatus === 'verified') && (
                        <span className="absolute -bottom-1 -right-1 p-0.5 bg-slate-950 rounded-full border border-emerald-500 text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5 fill-emerald-500/20" />
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-white text-sm">{agent.name}</h4>
                        {(agent.isVerified || agent.verificationStatus === 'verified') && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-black">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Vérifié</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-emerald-400 font-medium">{agent.title}</p>
                      <p className="text-[10px] text-slate-500">{agent.agencyName}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* WhatsApp Direct */}
                      <a
                        href={`https://wa.me/${(agent.whatsapp || agent.phone || '+243810000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${agent.name}, je suis intéressé(e) par votre annonce "${property.title}" (${formattedPrice}) sur Kin Immobilier.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => recordPropertyAction(property.id, 'whatsapp')}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                      >
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>WhatsApp</span>
                      </a>

                      {/* Direct Phone Call */}
                      <a
                        href={`tel:${agent.phone}`}
                        onClick={() => recordPropertyAction(property.id, 'call')}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-all"
                      >
                        <Phone className="w-4 h-4 text-emerald-400" />
                        <span>Appeler</span>
                      </a>
                    </div>

                    <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                      <span className="truncate">{agent.email}</span>
                      <span className="text-emerald-400 font-semibold">{agent.phone}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Inquiry & Tour Form Widget */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
                <h4 className="font-bold text-white text-sm">Demande d'Information & Visite</h4>

                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setRequestType('info')}
                    className={`py-1.5 rounded-lg font-semibold transition-colors ${
                      requestType === 'info' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Information
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestType('tour')}
                    className={`py-1.5 rounded-lg font-semibold transition-colors ${
                      requestType === 'tour' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Réserver Visite
                  </button>
                </div>

                {isSent ? (
                  <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-center font-bold">
                    ✓ Demande envoyée directement à l'agent !
                  </div>
                ) : (
                  <form onSubmit={handleSendLead} className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="Votre nom"
                      value={leadName}
                      onChange={(e) => setLeadName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    <input
                      type="email"
                      required
                      placeholder="Votre email"
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    <input
                      type="tel"
                      required
                      placeholder="Téléphone"
                      value={leadPhone}
                      onChange={(e) => setLeadPhone(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    {requestType === 'tour' && (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={tourDate}
                          onChange={(e) => setTourDate(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                        <input
                          type="time"
                          value={tourTime}
                          onChange={(e) => setTourTime(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    <textarea
                      rows={3}
                      value={leadMessage}
                      onChange={(e) => setLeadMessage(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs hover:scale-[1.02] transition-transform shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Envoyez la demande
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
