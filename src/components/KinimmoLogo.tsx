import React from 'react';

interface KinimmoLogoProps {
  showTagline?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export const KinimmoLogo: React.FC<KinimmoLogoProps> = ({
  showTagline = false,
  compact = false,
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
      title={onClick ? "Retourner à l'accueil Kinimmo" : undefined}
    >
      {/* Icône maison bleu royal & porte dorée conforme à la maquette Kinimmo */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${compact ? 'w-8 h-8' : 'w-9 h-9'} shrink-0 transition-transform ${
          onClick ? 'group-hover:scale-105' : ''
        }`}
        aria-hidden="true"
      >
        <path
          d="M5 17.5L20 5L35 17.5"
          stroke="#1D4ED8"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9 15.5V33C9 34.1046 9.89543 35 11 35H29C30.1046 35 31 34.1046 31 33V15.5"
          stroke="#1D4ED8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="#FFFFFF"
        />
        <path
          d="M15.5 35V24.5C15.5 22.2909 17.2909 20.5 19.5 20.5H20.5C22.7091 20.5 24.5 22.2909 24.5 24.5V35"
          fill="#FACC15"
        />
        <circle cx="20" cy="14.5" r="2.2" fill="#1D4ED8" />
      </svg>

      <div className="min-w-0">
        <span
          className={`font-display font-extrabold tracking-tight text-[#0F172A] leading-none block ${
            compact ? 'text-lg' : 'text-xl'
          }`}
        >
          Kinimmo
        </span>
        {showTagline && (
          <span className="block text-[11px] font-medium text-slate-600 leading-tight truncate mt-0.5">
            Trouvez. Vendez. Louez. Gérez.
          </span>
        )}
      </div>
    </div>
  );
};
