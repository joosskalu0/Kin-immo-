import React from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, ShieldCheck, Zap, Droplets, Waves, Building2, Trees, Gem, DollarSign, Tag, Key } from 'lucide-react';

export const QuickInteractiveFilters: React.FC = () => {
  const { properties, filters, setFilters, resetFilters } = useApp();

  // Calculate live counts for each quick filter
  const availableProperties = properties.filter((p) => p.status !== 'sold');

  const counts = {
    all: availableProperties.length,
    titreFoncier: availableProperties.filter((p) => 
      p.customFields?.titre_foncier === 'Certificat d\'Enregistrement (Garanti)' ||
      p.customFields?.titre_foncier === 'Livret de Logeur' ||
      p.description?.toLowerCase().includes('titre foncier') ||
      p.description?.toLowerCase().includes('certificat d\'enregistrement')
    ).length,
    solarWater: availableProperties.filter((p) => 
      p.customFields?.solaire_groupe === 'Oui (100% Autonome)' ||
      p.customFields?.solaire_groupe === 'Groupe électrogène automatique' ||
      p.description?.toLowerCase().includes('solaire') ||
      p.description?.toLowerCase().includes('groupe')
    ).length,
    forage: availableProperties.filter((p) => 
      p.customFields?.forage_eau === 'Oui (Forage + Cuve + Supresseur)' ||
      p.customFields?.forage_eau === 'Forage privé avec traitement' ||
      p.description?.toLowerCase().includes('forage') ||
      p.description?.toLowerCase().includes('cuve')
    ).length,
    pool: availableProperties.filter((p) => 
      p.amenities?.includes('Piscine') ||
      p.description?.toLowerCase().includes('piscine')
    ).length,
    gombe: availableProperties.filter((p) => 
      (p.commune?.toLowerCase().includes('gombe')) ||
      (p.address?.toLowerCase().includes('gombe'))
    ).length,
    ngaliema: availableProperties.filter((p) => 
      (p.commune?.toLowerCase().includes('ngaliema')) ||
      (p.address?.toLowerCase().includes('ngaliema')) ||
      (p.quartier?.toLowerCase().includes('macampagne')) ||
      (p.address?.toLowerCase().includes('macampagne'))
    ).length,
    luxury: availableProperties.filter((p) => 
      p.price >= 3000 ||
      p.featured ||
      p.title.toLowerCase().includes('luxe') ||
      p.title.toLowerCase().includes('standing')
    ).length,
    affordableRent: availableProperties.filter((p) => 
      p.status === 'for-rent' && p.price <= 1500
    ).length,
    forSale: availableProperties.filter((p) => p.status === 'for-sale').length,
    forRent: availableProperties.filter((p) => p.status === 'for-rent').length,
  };

  const isFilterActive = (type: string) => {
    switch (type) {
      case 'titreFoncier':
        return Boolean(filters.customFields?.titre_foncier);
      case 'solarWater':
        return Boolean(filters.customFields?.solaire_groupe);
      case 'forage':
        return Boolean(filters.customFields?.forage_eau);
      case 'pool':
        return filters.amenities?.includes('Piscine');
      case 'gombe':
        return filters.commune?.toLowerCase() === 'gombe';
      case 'ngaliema':
        return filters.commune?.toLowerCase() === 'ngaliema';
      case 'forSale':
        return filters.status === 'for-sale';
      case 'forRent':
        return filters.status === 'for-rent';
      default:
        return false;
    }
  };

  const toggleQuickFilter = (type: string) => {
    switch (type) {
      case 'all':
        resetFilters();
        break;
      case 'titreFoncier':
        setFilters((prev) => ({
          ...prev,
          customFields: {
            ...prev.customFields,
            titre_foncier: prev.customFields?.titre_foncier ? '' : 'Certificat',
          },
        }));
        break;
      case 'solarWater':
        setFilters((prev) => ({
          ...prev,
          customFields: {
            ...prev.customFields,
            solaire_groupe: prev.customFields?.solaire_groupe ? '' : 'Oui',
          },
        }));
        break;
      case 'forage':
        setFilters((prev) => ({
          ...prev,
          customFields: {
            ...prev.customFields,
            forage_eau: prev.customFields?.forage_eau ? '' : 'Oui',
          },
        }));
        break;
      case 'pool':
        setFilters((prev) => {
          const currentAmenities = prev.amenities || [];
          const hasPool = currentAmenities.includes('Piscine');
          return {
            ...prev,
            amenities: hasPool
              ? currentAmenities.filter((a) => a !== 'Piscine')
              : [...currentAmenities, 'Piscine'],
          };
        });
        break;
      case 'gombe':
        setFilters((prev) => ({
          ...prev,
          commune: prev.commune?.toLowerCase() === 'gombe' ? 'all' : 'Gombe',
        }));
        break;
      case 'ngaliema':
        setFilters((prev) => ({
          ...prev,
          commune: prev.commune?.toLowerCase() === 'ngaliema' ? 'all' : 'Ngaliema',
        }));
        break;
      case 'forSale':
        setFilters((prev) => ({
          ...prev,
          status: prev.status === 'for-sale' ? 'all' : 'for-sale',
        }));
        break;
      case 'forRent':
        setFilters((prev) => ({
          ...prev,
          status: prev.status === 'for-rent' ? 'all' : 'for-rent',
        }));
        break;
      case 'affordableRent':
        setFilters((prev) => ({
          ...prev,
          status: 'for-rent',
          maxPrice: prev.maxPrice === 1500 ? 5000000 : 1500,
        }));
        break;
    }
  };

  const isAllSelected = 
    (!filters.commune || filters.commune === 'all') &&
    (!filters.status || filters.status === 'all') &&
    (!filters.amenities || filters.amenities.length === 0) &&
    (!filters.customFields || Object.values(filters.customFields).every((v) => !v)) &&
    !filters.searchQuery;

  const quickBadges = [
    {
      id: 'all',
      label: 'Tous les biens',
      icon: Sparkles,
      count: counts.all,
      isActive: isAllSelected,
      color: 'emerald',
    },
    {
      id: 'titreFoncier',
      label: 'Titre Foncier Garanti',
      icon: ShieldCheck,
      count: counts.titreFoncier,
      isActive: isFilterActive('titreFoncier'),
      color: 'amber',
    },
    {
      id: 'solarWater',
      label: 'Autonome Solaire/Groupe',
      icon: Zap,
      count: counts.solarWater,
      isActive: isFilterActive('solarWater'),
      color: 'yellow',
    },
    {
      id: 'forage',
      label: 'Forage d\'Eau',
      icon: Droplets,
      count: counts.forage,
      isActive: isFilterActive('forage'),
      color: 'cyan',
    },
    {
      id: 'pool',
      label: 'Piscine',
      icon: Waves,
      count: counts.pool,
      isActive: isFilterActive('pool'),
      color: 'blue',
    },
    {
      id: 'gombe',
      label: 'Gombe Centre',
      icon: Building2,
      count: counts.gombe,
      isActive: isFilterActive('gombe'),
      color: 'purple',
    },
    {
      id: 'ngaliema',
      label: 'Ngaliema / Macampagne',
      icon: Trees,
      count: counts.ngaliema,
      isActive: isFilterActive('ngaliema'),
      color: 'emerald',
    },
    {
      id: 'forSale',
      label: 'À Vendre',
      icon: Tag,
      count: counts.forSale,
      isActive: isFilterActive('forSale'),
      color: 'emerald',
    },
    {
      id: 'forRent',
      label: 'À Louer',
      icon: Key,
      count: counts.forRent,
      isActive: isFilterActive('forRent'),
      color: 'teal',
    },
  ];

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          Filtres Rapides Intelligents (1-Click)
        </span>
        {!isAllSelected && (
          <button
            onClick={resetFilters}
            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold underline"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {quickBadges.map((badge) => {
          const Icon = badge.icon;
          return (
            <button
              key={badge.id}
              onClick={() => toggleQuickFilter(badge.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all duration-200 active:scale-95 border ${
                badge.isActive
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold'
                  : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-200 shadow-sm'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${badge.isActive ? 'text-white' : 'text-emerald-600'}`} />
              <span>{badge.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  badge.isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {badge.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
