import React, { useState } from 'react';
import { Property } from '../types';
import { useApp } from '../context/AppContext';
import { convertAndFormatPrice } from '../utils/currency';
import {
  Bed,
  Bath,
  Maximize,
  Heart,
  Scale,
  MapPin,
  Eye,
  Flame,
  Sparkles,
  Zap,
  Tag,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Share2,
  Phone,
  MessageCircle,
  Video,
  Play,
  CheckCircle2,
  Edit,
  Trash2,
  Calendar,
} from 'lucide-react';
import { ScheduleVisitModal } from './ScheduleVisitModal';

interface PropertyCardProps {
  property: Property;
  onShare?: (propertyId: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onShare }) => {
  const {
    currency,
    wishlist,
    toggleWishlist,
    compareList,
    toggleCompare,
    setActivePropertyModalId,
    agents,
    customFields,
    user,
    recordPropertyAction,
    updateProperty,
    deleteProperty,
    setEditingProperty,
    setIsSubmitPropertyOpen,
    requestConfirm,
  } = useApp();

  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);

  const isFavorite = wishlist.includes(property.id);
  const isCompared = compareList.includes(property.id);
  const isSold = property.status === 'sold';
  const formattedPrice = convertAndFormatPrice(property.price, currency);
  const agent = agents.find((a) => a.id === property.agentId);

  const canManageProperty = Boolean(
    user && (
      user.role === 'admin' ||
      user.role === 'agent' ||
      user.role === 'agency' ||
      property.agentId === user.id ||
      property.agentId === user.agentId ||
      property.agencyId === user.agencyId ||
      property.agencyId === user.id ||
      (user.agencyName && property.agencyName?.toLowerCase() === user.agencyName.toLowerCase()) ||
      (user.email && (
        user.email === property.contactEmail ||
        user.email === property.agentId ||
        user.email === property.privateFields?.ownerEmail
      ))
    )
  );

  const images = property.images && property.images.length > 0
    ? property.images
    : ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&auto=format&fit=crop&q=80'];

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleToggleSold = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const newStatus = isSold ? 'for-sale' : 'sold';
    const actionLabel = isSold
      ? `remettre en vente l'annonce "${property.title}"`
      : `déclarer l'annonce "${property.title}" comme VENDU (transaction conclue)`;

    requestConfirm({
      title: isSold ? "Remettre le bien en vente" : "Confirmation de Vente",
      message: `Voulez-vous vraiment ${actionLabel} ?`,
      confirmText: isSold ? "Oui, remettre en vente" : "Oui, marquer Vendu",
      onConfirm: () => {
        updateProperty({
          ...property,
          status: newStatus,
        });
      }
    });
  };

  // Get key custom fields to display on card
  const cardCustomFields = customFields.filter((cf) => cf.showInSearch && !cf.isPrivate).slice(0, 2);

  return (
    <div className={`group bg-white border ${isSold ? 'border-red-300 ring-1 ring-red-500/20' : 'border-slate-200 hover:border-slate-300'} rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl flex flex-col h-full relative`}>
      {/* Image Banner Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={images[activeImgIndex]}
          alt={property.title}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer ${isSold ? 'grayscale-[35%] contrast-95' : ''}`}
          onClick={() => setActivePropertyModalId(property.id)}
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

        {/* Sold Watermark Overlay */}
        {isSold && (
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-10">
            <div className="bg-red-600 text-white font-black text-xs sm:text-sm uppercase tracking-widest px-4 py-1.5 rounded-xl shadow-2xl border border-red-400 rotate-[-6deg] flex items-center gap-1.5 transform scale-105">
              <CheckCircle2 className="w-4 h-4 fill-white text-red-600" />
              VENDU
            </div>
          </div>
        )}

        {/* Carousel Prev/Next Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md border border-white/10 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-20 shadow-lg active:scale-90"
              title="Photo précédente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur-md border border-white/10 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-20 shadow-lg active:scale-90"
              title="Photo suivante"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Dots indicator */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-slate-950/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveImgIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === activeImgIndex ? 'bg-emerald-400 w-4' : 'bg-white/60 hover:bg-white w-1.5'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {/* Main Status Badge */}
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${
              isSold
                ? 'bg-red-600 text-white border border-red-400'
                : property.status === 'for-sale'
                ? 'bg-emerald-600 text-white'
                : property.status === 'for-rent'
                ? 'bg-sky-600 text-white'
                : property.status === 'open-house'
                ? 'bg-purple-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {isSold && <CheckCircle2 className="w-3 h-3 fill-white text-red-600" />}
            {isSold
              ? 'Vendu'
              : property.status === 'for-sale'
              ? 'A Vendre'
              : property.status === 'for-rent'
              ? 'A Louer'
              : property.status === 'open-house'
              ? 'Portes Ouvertes'
              : property.status}
          </span>

          {property.labels.includes('featured') && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 fill-slate-950" />
              Vedette
            </span>
          )}

          {property.labels.includes('hot') && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white flex items-center gap-1 shadow-sm">
              <Flame className="w-3 h-3 fill-white" />
              Hot Deal
            </span>
          )}

          {property.videoUrl && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-950/90 text-emerald-300 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1 shadow-sm">
              <Video className="w-3 h-3 text-emerald-400" />
              Vidéo HD
            </span>
          )}
        </div>

        {/* Top Right Action Buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(property.id);
            }}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`p-2.5 min-w-[42px] min-h-[42px] rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:scale-90 ${
              isFavorite
                ? 'bg-rose-500 text-white shadow-md scale-105'
                : 'bg-black/40 hover:bg-black/60 text-white'
            }`}
          >
            <Heart className={`w-4.5 h-4.5 ${isFavorite ? 'fill-white' : ''}`} />
          </button>

          {/* Compare Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCompare(property.id);
            }}
            title={isCompared ? 'Retirer du comparateur' : 'Ajouter au comparateur'}
            className={`p-2.5 min-w-[42px] min-h-[42px] rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:scale-90 ${
              isCompared
                ? 'bg-amber-500 text-slate-950 font-bold scale-105 shadow-md'
                : 'bg-black/40 hover:bg-black/60 text-white'
            }`}
          >
            <Scale className="w-4.5 h-4.5" />
          </button>

          {/* Social Share Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              recordPropertyAction(property.id, 'share');
              if (onShare) {
                onShare(property.id);
              } else if (navigator.share) {
                navigator.share({
                  title: property.title,
                  text: `${property.title} à Kinshasa (${formattedPrice})`,
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                alert('Lien de l\'annonce copié dans le presse-papier !');
              }
            }}
            title="Partager l'annonce"
            className="p-2.5 min-w-[42px] min-h-[42px] rounded-2xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all active:scale-90"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Bottom Image Overlay: Price Tag & Eye Button */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-slate-200 shadow-md">
            <span className="text-base sm:text-lg font-black text-emerald-700 tracking-tight">
              {formattedPrice}
            </span>
            {property.period === 'month' && (
              <span className="text-xs text-slate-500 font-bold"> /mois</span>
            )}
          </div>

          <button
            onClick={() => setActivePropertyModalId(property.id)}
            className="p-2.5 min-w-[42px] min-h-[42px] rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all font-bold text-xs flex items-center justify-center gap-1 shadow-md active:scale-90"
            title="Voir fiche rapide"
          >
            <Eye className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1.5">
          {/* Category & Location */}
          <div className="flex items-center justify-between text-xs text-slate-500 gap-2">
            <span className="font-bold text-emerald-800 flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 truncate max-w-[140px]">
              <Tag className="w-3 h-3 shrink-0" />
              <span className="truncate">{property.category}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-700 font-semibold text-xs shrink-0 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>{property.commune || property.city}</span>
              {property.quartier && <span className="text-slate-500 font-normal text-[11px] truncate max-w-[100px]">({property.quartier})</span>}
            </span>
          </div>

          {/* Title & Avenue/Address info */}
          <div>
            <h3
              onClick={() => setActivePropertyModalId(property.id)}
              className="text-base font-extrabold text-slate-900 hover:text-emerald-700 transition-colors line-clamp-2 cursor-pointer leading-snug pt-1"
            >
              {property.title}
            </h3>
            {property.avenue && (
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 truncate">
                <span className="text-emerald-700 font-medium">{property.avenue}</span>
                {property.referencePoint && <span className="text-slate-400 italic truncate">• {property.referencePoint}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-200 text-xs text-slate-700">
          <div className="bg-slate-50 border border-slate-200 px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
            <Bed className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{property.bedrooms} ch.</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
            <Bath className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{property.bathrooms} sdb</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800">
            <Maximize className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{property.area} m²</span>
          </div>
        </div>

        {/* Fields Builder Preview Pills */}
        {cardCustomFields.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {cardCustomFields.map((fieldDef) => {
              const val = property.customFields[fieldDef.key];
              if (!val) return null;
              return (
                <span
                  key={fieldDef.id}
                  className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-700 font-medium border border-slate-200 flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-emerald-600" />
                  {fieldDef.label['fr'] || fieldDef.key}: {val}
                </span>
              );
            })}
          </div>
        )}

        {/* Private Fields indicator if Agent/Admin */}
        {(user?.role === 'admin' || user?.role === 'agent') && property.privateFields && (
          <div className="text-[10px] bg-amber-50 text-amber-800 px-2 py-1 rounded-md border border-amber-200 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
            <span>Com. {property.privateFields.commissionRate || 4}% | Tél: {property.privateFields.ownerPhone || 'N/A'}</span>
          </div>
        )}

        {/* Footer: Agent & Action */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs gap-2">
          {agent ? (
            <div className="flex items-center gap-1.5 truncate">
              <div className="relative shrink-0">
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-emerald-500/40"
                />
                {(agent.isVerified || agent.verificationStatus === 'verified') && (
                  <ShieldCheck className="w-3 h-3 text-emerald-600 absolute -bottom-0.5 -right-0.5 bg-white rounded-full" />
                )}
              </div>
              <span className="text-slate-800 text-[11px] font-medium truncate max-w-[90px] sm:max-w-[110px] flex items-center gap-1">
                {agent.name}
                {(agent.isVerified || agent.verificationStatus === 'verified') && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shrink-0">
                    Vérifié
                  </span>
                )}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500">Kin Immobilier</span>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick WhatsApp button */}
            {agent && (
              <a
                href={`https://wa.me/${(agent.whatsapp || agent.phone || '+243810000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Bonjour ${agent.name}, je suis intéressé(e) par l'annonce "${property.title}" (${formattedPrice}) sur Kin Immobilier.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  recordPropertyAction(property.id, 'whatsapp');
                }}
                className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-300 transition-all flex items-center gap-1.5 text-[11px] font-extrabold active:scale-95"
                title="Contacter sur WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}

            {/* Quick Phone Call button */}
            {agent && (
              <a
                href={`tel:${agent.phone}`}
                onClick={(e) => {
                  e.stopPropagation();
                  recordPropertyAction(property.id, 'call');
                }}
                className="p-2 min-w-[36px] min-h-[36px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-all flex items-center justify-center active:scale-95"
                title={`Appeler ${agent.phone}`}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
              </a>
            )}

            {/* Quick Toggle Sold button for Admin / Agents / Agencies / Owners */}
            {canManageProperty && (
              <button
                type="button"
                onClick={handleToggleSold}
                className={`px-2.5 py-1.5 min-h-[36px] rounded-xl font-bold text-xs flex items-center gap-1 transition-all border active:scale-95 ${
                  isSold
                    ? 'bg-red-50 hover:bg-red-600 text-red-700 hover:text-white border-red-200'
                    : 'bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border-slate-200 hover:border-red-300'
                }`}
                title={isSold ? 'Cliquer pour remettre en vente' : 'Cliquer pour marquer comme vendu'}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${isSold ? 'text-red-600' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">{isSold ? 'Vendu' : 'Vendu ?'}</span>
              </button>
            )}

            {/* Quick Edit button */}
            {canManageProperty && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingProperty(property);
                  setIsSubmitPropertyOpen(true);
                }}
                className="p-2 min-w-[36px] min-h-[36px] rounded-xl bg-slate-100 hover:bg-amber-100 text-amber-700 hover:text-amber-900 border border-slate-200 hover:border-amber-300 transition-all flex items-center justify-center active:scale-95"
                title="Modifier cette annonce"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Quick Schedule Visit */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsScheduleOpen(true);
              }}
              className="p-2 min-w-[36px] min-h-[36px] rounded-xl bg-slate-100 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 transition-all flex items-center justify-center active:scale-95"
              title="Programmer une visite (sur place ou vidéo)"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setActivePropertyModalId(property.id)}
              className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 border border-emerald-600 active:scale-95 transition-all shadow-sm"
            >
              Fiche →
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Schedule Visit Modal */}
      <ScheduleVisitModal
        property={property}
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
      />
    </div>
  );
};

