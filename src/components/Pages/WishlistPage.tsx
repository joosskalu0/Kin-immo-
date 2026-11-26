import React from 'react';
import { useApp } from '../../context/AppContext';
import { PropertyCard } from '../PropertyCard';
import { EmptyState, PageHeaderBar } from '../StateFeedback';
import { Heart, Scale } from 'lucide-react';

interface WishlistPageProps {
  onNavigatePath: (path: string) => void;
  onShareProperty: (propertyId: string) => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({
  onNavigatePath,
  onShareProperty,
}) => {
  const { wishlist, properties, compareList } = useApp();
  const favoriteProperties = properties.filter((p) => wishlist.includes(p.id));

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeaderBar
        title="Mes favoris"
        subtitle={`${favoriteProperties.length} bien${favoriteProperties.length > 1 ? 's' : ''} enregistré${favoriteProperties.length > 1 ? 's' : ''}`}
        fallbackPath="/"
        rightSlot={
          compareList.length > 0 ? (
            <button
              type="button"
              onClick={() => onNavigatePath('/comparer')}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Scale className="w-4 h-4" />
              <span>Comparer ({compareList.length})</span>
            </button>
          ) : null
        }
      />

      {favoriteProperties.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Aucun bien dans vos favoris"
          description="Appuyez sur le cœur d’une annonce qui vous plaît pour la retrouver facilement ici et la comparer."
          actionLabel="Rechercher un bien"
          onAction={() => onNavigatePath('/rechercher')}
          secondaryLabel="Voir les biens en vedette"
          onSecondaryAction={() => onNavigatePath('/')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {favoriteProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onShare={onShareProperty}
            />
          ))}
        </div>
      )}
    </div>
  );
};
