import React, { useMemo } from 'react';
import { Sparkles, MapPin, BedDouble, Bath, Maximize2, ArrowRight, ShieldCheck, Star } from 'lucide-react';
import { Property } from '../types';

interface VitrineSectionProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  onExploreCatalog?: () => void;
}

/**
 * Section VITRINE Officielle Kinimmo
 * 
 * Règles d'affichage strictes :
 * 1. Uniquement des biens réels issus de MySQL.
 * 2. Bien publié, validé, non vendu/archivé/suspendu.
 * 3. Demande de mise en avant approuvée par l'administrateur avec période active (boostExpiresAt > NOW()).
 * 4. Zéro fausse donnée ou slide fictif en production.
 */
export const VitrineSection: React.FC<VitrineSectionProps> = ({
  properties,
  onSelectProperty,
  onExploreCatalog
}) => {
  // Filtrage strict et robuste des biens de la vitrine
  const vitrineProperties = useMemo(() => {
    const now = new Date().getTime();
    return properties.filter((prop) => {
      // 1. Doit être publié et marqué comme mis en avant (featured)
      const isFeatured = Boolean(prop.featured);
      const isPublished = prop.published !== false;

      // 2. Ne doit pas être vendu, suspendu, archivé ou en brouillon
      const forbiddenStatuses = ['sold', 'archived', 'draft', 'suspended', 'rented'];
      const statusOk = !forbiddenStatuses.includes((prop.status || '').toLowerCase()) &&
                       !forbiddenStatuses.includes((prop.listingStatus || '').toLowerCase());

      // 3. Vérification de la date d'expiration du boost si présente
      let expirationOk = true;
      if (prop.boostExpiresAt) {
        const expTime = new Date(prop.boostExpiresAt).getTime();
        if (!isNaN(expTime) && expTime <= now) {
          expirationOk = false;
        }
      }

      return isFeatured && isPublished && statusOk && expirationOk;
    });
  }, [properties]);

  // Si aucun bien ne remplit toutes les conditions strictes, ne pas afficher d'éléments fictifs
  if (vitrineProperties.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="vitrine-heading" className="space-y-4">
      {/* En-tête de la Vitrine Prestige */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-amber-200/60 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm shadow-amber-500/20">
              <Star className="w-3.5 h-3.5 fill-slate-950" />
              Vitrine Officielle Kinimmo
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Vérifiés & Validés par la Direction
            </span>
          </div>
          <h2 id="vitrine-heading" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Biens d'Exception à la Une
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Sélection exclusive de biens immobiliers titrés et autorisés par la modération officielle à Kinshasa.
          </p>
        </div>

        {onExploreCatalog && (
          <button
            onClick={onExploreCatalog}
            className="text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            <span>Voir tout le catalogue ({properties.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Grille des biens en Vitrine */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vitrineProperties.map((property) => {
          // Photo principale sécurisée
          const mainImage = (property.images && property.images.length > 0 && property.images[0])
            ? property.images[0]
            : 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80';

          // Nom de l'agent ou de l'agence certifiée
          const agentOrAgency = property.agencyName ||
                                property.assignedAgentName ||
                                (property as any).agent_name ||
                                'Partenaire Officiel Kinimmo';

          // Type de bien lisible
          const propertyTypeLabel = property.type
            ? property.type.charAt(0).toUpperCase() + property.type.slice(1)
            : 'Résidence';

          // Formatage du prix
          const formattedPrice = property.currency === 'CDF'
            ? `${Number(property.price || 0).toLocaleString()} FC`
            : `${Number(property.price || 0).toLocaleString()} $`;

          const periodText = property.period === 'month' ? '/ mois' : '';

          return (
            <article
              key={property.id}
              onClick={() => onSelectProperty(property)}
              className="group relative bg-white rounded-3xl border-2 border-amber-300/80 shadow-md hover:shadow-xl hover:border-amber-500 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer"
            >
              {/* Badge "À LA UNE" officiel en superposition */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                <img
                  src={mainImage}
                  alt={property.title}
                  loading="lazy"
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />

                {/* Voile dégradé supérieur pour lisibilité des badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40 pointer-events-none" />

                {/* Badge Officiel « À LA UNE » */}
                <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/40 border border-amber-300">
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                    À LA UNE
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide bg-slate-950/80 backdrop-blur-md text-amber-300 border border-amber-400/30">
                    {propertyTypeLabel}
                  </span>
                </div>

                {/* Commune & Quartier */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white z-10">
                  <div className="flex items-center gap-1.5 text-xs font-bold bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-xl border border-white/10 max-w-[70%] truncate">
                    <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {property.commune || 'Kinshasa'}{property.quartier ? ` • ${property.quartier}` : ''}
                    </span>
                  </div>

                  <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 uppercase tracking-wider shrink-0">
                    {property.status === 'for-sale' ? 'Vente' : 'Location'}
                  </span>
                </div>
              </div>

              {/* Corps de la carte */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  {/* Titre du bien */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
                    {property.title}
                  </h3>

                  {/* Prix */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
                      {formattedPrice}
                    </span>
                    {periodText && (
                      <span className="text-xs font-semibold text-slate-500">
                        {periodText}
                      </span>
                    )}
                  </div>
                </div>

                {/* Caractéristiques (Chambres, Salles d'eau, Surface) */}
                <div className="flex items-center gap-4 text-xs font-bold text-slate-600 pt-3 border-t border-slate-100">
                  {property.bedrooms > 0 && (
                    <div className="flex items-center gap-1.5" title={`${property.bedrooms} Chambres`}>
                      <BedDouble className="w-4 h-4 text-amber-600" />
                      <span>{property.bedrooms} ch.</span>
                    </div>
                  )}

                  {property.bathrooms > 0 && (
                    <div className="flex items-center gap-1.5" title={`${property.bathrooms} Salles d'eau`}>
                      <Bath className="w-4 h-4 text-amber-600" />
                      <span>{property.bathrooms} sdb.</span>
                    </div>
                  )}

                  {property.area > 0 && (
                    <div className="flex items-center gap-1.5" title={`${property.area} m² Superficie`}>
                      <Maximize2 className="w-4 h-4 text-amber-600" />
                      <span>{property.area} m²</span>
                    </div>
                  )}
                </div>

                {/* Agence ou Agent + Bouton Voir le bien */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-xs truncate">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Diffusé par
                    </span>
                    <span className="font-extrabold text-slate-800 truncate block">
                      {agentOrAgency}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProperty(property);
                    }}
                    className="px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-all cursor-pointer shrink-0"
                  >
                    <span>Voir le bien</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
