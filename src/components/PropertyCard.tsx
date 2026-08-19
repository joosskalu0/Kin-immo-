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
} from 'lucide-react';

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
  } = useApp();

  const [activeImgIndex, setActiveImgIndex] = useState(0);

  const isFavorite = wishlist.includes(property.id);
  const isCompared = compareList.includes(property.id);
  const formattedPrice = convertAndFormatPrice(property.price, currency);
  const agent = agents.find((a) => a.id === property.agentId);

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

  // Get key custom fields to display on card
  const cardCustomFields = customFields.filter((cf) => cf.showInSearch && !cf.isPrivate).slice(0, 2);

  return (
    <div className="group bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/5 flex flex-col h-full relative">
      {/* Image Banner Container */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
        <img
          src={images[activeImgIndex]}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
          onClick={() => setActivePropertyModalId(property.id)}
          loading="lazy"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

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
          <span
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-md ${
              property.status === 'for-sale'
                ? 'bg-emerald-500 text-slate-950'
                : property.status === 'for-rent'
                ? 'bg-sky-500 text-slate-950'
                : property.status === 'open-house'
                ? 'bg-purple-500 text-white'
                : 'bg-amber-500 text-slate-950'
            }`}
          >
            {property.status === 'for-sale'
              ? 'A Vendre'
              : property.status === 'for-rent'
              ? 'A Louer'
              : property.status === 'open-house'
              ? 'Portes Ouvertes'
              : property.status}
          </span>

          {property.labels.includes('featured') && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 shadow-md">
              <Sparkles className="w-3 h-3 fill-slate-950" />
              Vedette
            </span>
          )}

          {property.labels.includes('hot') && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white flex items-center gap-1 shadow-md">
              <Flame className="w-3 h-3 fill-white" />
              Hot Deal
            </span>
          )}

          {property.videoUrl && (
            <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-950/90 text-emerald-400 border border-emerald-500/40 backdrop-blur-md flex items-center gap-1 shadow-md">
              <Video className="w-3 h-3 text-emerald-400" />
              Vidéo HD
            </span>
          )}
        </div>

        {/* Top Right Action Buttons (Compare, Wishlist, Share with 44px touch target) */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {/* Wishlist Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(property.id);
            }}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`p-2.5 min-w-[42px] min-h-[42px] rounded-2xl backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-90 ${
              isFavorite
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 scale-105'
                : 'bg-slate-950/70 hover:bg-slate-900 text-slate-200'
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
            className={`p-2.5 min-w-[42px] min-h-[42px] rounded-2xl backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-90 ${
              isCompared
                ? 'bg-amber-500 text-slate-950 font-bold scale-105 shadow-lg shadow-amber-500/20'
                : 'bg-slate-950/70 hover:bg-slate-900 text-slate-200'
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
            className="p-2.5 min-w-[42px] min-h-[42px] rounded-2xl bg-slate-950/70 hover:bg-slate-900 text-slate-200 backdrop-blur-md border border-white/10 flex items-center justify-center transition-all active:scale-90"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Bottom Image Overlay: Price Tag & Eye Button */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between z-10">
          <div className="bg-slate-950/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-emerald-500/30 shadow-xl">
            <span className="text-base sm:text-lg font-black text-emerald-400 tracking-tight">
              {formattedPrice}
            </span>
            {property.period === 'month' && (
              <span className="text-xs text-slate-400 font-bold"> /mois</span>
            )}
          </div>

          <button
            onClick={() => setActivePropertyModalId(property.id)}
            className="p-2.5 min-w-[42px] min-h-[42px] rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all font-bold text-xs flex items-center justify-center gap-1 shadow-lg shadow-emerald-500/20 active:scale-90"
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
          <div className="flex items-center justify-between text-xs text-slate-400 gap-2">
            <span className="font-bold text-emerald-400/90 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 truncate max-w-[140px]">
              <Tag className="w-3 h-3 shrink-0" />
              <span className="truncate">{property.category}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-300 font-semibold text-xs shrink-0 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
              <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{property.commune || property.city}</span>
              {property.quartier && <span className="text-slate-400 font-normal text-[11px] truncate max-w-[100px]">({property.quartier})</span>}
            </span>
          </div>

          {/* Title & Avenue/Address info */}
          <div>
            <h3
              onClick={() => setActivePropertyModalId(property.id)}
              className="text-base font-extrabold text-white hover:text-emerald-400 transition-colors line-clamp-2 cursor-pointer leading-snug pt-1"
            >
              {property.title}
            </h3>
            {property.avenue && (
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
                <span className="text-emerald-400 font-medium">{property.avenue}</span>
                {property.referencePoint && <span className="text-slate-500 italic truncate">• {property.referencePoint}</span>}
              </p>
            )}
          </div>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-xs text-slate-200">
          <div className="bg-slate-950/80 border border-slate-800 px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200">
            <Bed className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{property.bedrooms} ch.</span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200">
            <Bath className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{property.bathrooms} sdb</span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 px-2 py-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200">
            <Maximize className="w-4 h-4 text-emerald-400 shrink-0" />
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
                  className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-medium border border-slate-700/50 flex items-center gap-1"
                >
                  <Zap className="w-3 h-3 text-emerald-400" />
                  {fieldDef.label['fr'] || fieldDef.key}: {val}
                </span>
              );
            })}
          </div>
        )}

        {/* Private Fields indicator if Agent/Admin */}
        {(user?.role === 'admin' || user?.role === 'agent') && property.privateFields && (
          <div className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-1 rounded-md border border-amber-500/20 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
            <span>Com. {property.privateFields.commissionRate || 4}% | Tél: {property.privateFields.ownerPhone || 'N/A'}</span>
          </div>
        )}

        {/* Footer: Agent & Action */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800/60 text-xs gap-2">
          {agent ? (
            <div className="flex items-center gap-1.5 truncate">
              <div className="relative shrink-0">
                <img
                  src={agent.avatar}
                  alt={agent.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-emerald-500/40"
                />
                {(agent.isVerified || agent.verificationStatus === 'verified') && (
                  <ShieldCheck className="w-3 h-3 text-emerald-400 absolute -bottom-0.5 -right-0.5 bg-slate-950 rounded-full" />
                )}
              </div>
              <span className="text-slate-300 text-[11px] font-medium truncate max-w-[90px] sm:max-w-[110px] flex items-center gap-1">
                {agent.name}
                {(agent.isVerified || agent.verificationStatus === 'verified') && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shrink-0">
                    Vérifié
                  </span>
                )}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">Kin Immobilier</span>
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
                className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 transition-all flex items-center gap-1.5 text-[11px] font-extrabold active:scale-95"
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
                className="p-2 min-w-[36px] min-h-[36px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center active:scale-95"
                title={`Appeler ${agent.phone}`}
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            )}

            <button
              onClick={() => setActivePropertyModalId(property.id)}
              className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-extrabold text-xs flex items-center gap-1 border border-slate-700 active:scale-95 transition-all"
            >
              Fiche →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

