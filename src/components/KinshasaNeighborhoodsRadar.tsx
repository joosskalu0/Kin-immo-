import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Compass,
  MapPin,
  TrendingUp,
  ShieldCheck,
  Zap,
  Droplets,
  Clock,
  ArrowRight,
  Sparkles,
  Building2,
  Sliders,
  DollarSign,
} from 'lucide-react';

interface CommuneData {
  id: string;
  name: string;
  tagline: string;
  avgRent: number; // in USD
  avgSalePerSqm: number; // in USD
  securityScore: number; // out of 10
  waterScore: number; // out of 10
  powerScore: number; // out of 10
  commuteTime: string; // to Gombe
  highlights: string[];
  image: string;
  popularQuartiers: string[];
}

export const KinshasaNeighborhoodsRadar: React.FC<{
  onSelectCommune?: (commune: string) => void;
  onOpenMap?: () => void;
}> = ({ onSelectCommune, onOpenMap }) => {
  const { properties, setFilters } = useApp();

  const [selectedCommuneId, setSelectedCommuneId] = useState('Gombe');
  const [budgetSlider, setBudgetSlider] = useState<number>(2000);

  const communes: CommuneData[] = [
    {
      id: 'Gombe',
      name: 'Gombe',
      tagline: 'Centre des Affaires, Ambassades & Rives du Fleuve',
      avgRent: 3500,
      avgSalePerSqm: 2800,
      securityScore: 9.6,
      waterScore: 8.8,
      powerScore: 9.0,
      commuteTime: '0 min (Centre)',
      highlights: ['Ambassades & Banques', 'Écoles Internationales', 'Sécurité 24/7', 'Restaurants VIP'],
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80',
      popularQuartiers: ['Centre-Ville', 'Haut-Commandement', 'Golf', 'Bord du Fleuve'],
    },
    {
      id: 'Ngaliema',
      name: 'Ngaliema (Macampagne)',
      tagline: 'Quartier Résidentiel Vert, Villas VIP & Collines',
      avgRent: 2500,
      avgSalePerSqm: 1900,
      securityScore: 9.2,
      waterScore: 8.5,
      powerScore: 8.4,
      commuteTime: '15 - 25 min',
      highlights: ['Grandes parcelles arborées', 'Piscines & Forages privés', 'Calme & Air pur', 'Mont-Fleury & Pigeon'],
      image: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&auto=format&fit=crop&q=80',
      popularQuartiers: ['Macampagne', 'Mont-Fleury', 'Binza Pigeon', 'Binza Ozone', 'Joli Parc'],
    },
    {
      id: 'Limete',
      name: 'Limete',
      tagline: 'Commune Historique, Parcelles Spacieuses & Résidences',
      avgRent: 1600,
      avgSalePerSqm: 1400,
      securityScore: 8.5,
      waterScore: 7.8,
      powerScore: 8.0,
      commuteTime: '10 - 20 min',
      highlights: ['Limete Résidentiel 1ère à 18ème Rue', 'Accès direct Boulevard Lumumba', 'Grands terrains', 'Échangeur'],
      image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=80',
      popularQuartiers: ['Limete Résidentiel', 'Mombele', 'Kingabwa (Industriel)'],
    },
    {
      id: 'Kintambo',
      name: 'Kintambo',
      tagline: 'Carrefour Stratégique, Magasin & Baie de Ngaliema',
      avgRent: 1800,
      avgSalePerSqm: 1600,
      securityScore: 8.8,
      waterScore: 8.2,
      powerScore: 8.2,
      commuteTime: '5 - 12 min',
      highlights: ['Kintambo Magasin', 'Accès direct Pont Kintambo & Gombe', 'Commerces & Écoles', 'Vue Baie'],
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80',
      popularQuartiers: ['Jamaïque', 'Nganda', 'Tanzanie'],
    },
    {
      id: 'Mont-Ngafula',
      name: 'Mont-Ngafula',
      tagline: 'Hauteurs Aérées, Nouvelles Constructions & Calme',
      avgRent: 900,
      avgSalePerSqm: 850,
      securityScore: 8.0,
      waterScore: 7.5,
      powerScore: 7.2,
      commuteTime: '25 - 45 min',
      highlights: ['Climat frais sur les collines', 'Grands terrains accessibles', 'Université de Kinshasa (UNIKIN)', 'Lycée Français'],
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80',
      popularQuartiers: ['Kimbondo', 'Cité Verte', 'UPN', 'Mbudi'],
    },
    {
      id: 'Bandalungwa',
      name: 'Bandalungwa',
      tagline: 'Animation, Proximité Centrale & Dynamisme',
      avgRent: 800,
      avgSalePerSqm: 1100,
      securityScore: 7.9,
      waterScore: 7.2,
      powerScore: 7.5,
      commuteTime: '10 - 15 min',
      highlights: ['Bandal Moulaert', 'Vie culturelle & gastronomique', 'Accès rapide Gombe et Kintambo'],
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format&fit=crop&q=80',
      popularQuartiers: ['Moulaert', 'Synkin', 'Makelele', 'Lumumba'],
    },
  ];

  const current = communes.find((c) => c.id === selectedCommuneId) || communes[0];

  // Number of properties in current commune
  const propCount = properties.filter((p) =>
    (p.commune?.toLowerCase().includes(current.id.toLowerCase())) ||
    (p.address?.toLowerCase().includes(current.id.toLowerCase()))
  ).length;

  const handleFilterNow = () => {
    setFilters((prev) => ({
      ...prev,
      commune: current.id,
      searchQuery: '',
    }));
    if (onSelectCommune) onSelectCommune(current.id);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6 text-slate-100 max-w-5xl mx-auto">
      {/* Header with icon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Radar Immobilier des Communes de Kinshasa
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold border border-emerald-500/30">
                Interactif
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Comparez les loyers moyens, la sécurité, l'accès eau/électricité et les temps de trajet
            </p>
          </div>
        </div>

        {/* Budget Interactive Quick Test Slider */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col gap-1 min-w-[240px]">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <Sliders className="w-3 h-3 text-emerald-400" /> Mon Budget Loyer
            </span>
            <span className="text-emerald-400 font-extrabold text-xs">
              {budgetSlider.toLocaleString()} $/mois
            </span>
          </div>
          <input
            type="range"
            min={400}
            max={6000}
            step={100}
            value={budgetSlider}
            onChange={(e) => setBudgetSlider(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      {/* Commune Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {communes.map((c) => {
          const isAffordable = budgetSlider >= c.avgRent * 0.75;
          const isSelected = c.id === selectedCommuneId;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCommuneId(c.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                isSelected
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <span>{c.name}</span>
              {isAffordable && (
                <span
                  className={`w-2 h-2 rounded-full ${
                    isSelected ? 'bg-slate-950' : 'bg-emerald-400'
                  }`}
                  title="Accessible avec votre budget sélectionné"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Commune Detailed Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-950/80 rounded-2xl p-5 border border-slate-800 items-center">
        {/* Left Photo & Badges */}
        <div className="lg:col-span-5 relative h-56 sm:h-64 rounded-2xl overflow-hidden border border-slate-800 group shadow-lg">
          <img
            src={current.image}
            alt={current.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 space-y-1">
            <h4 className="text-xl font-black text-white">{current.name}</h4>
            <p className="text-xs text-slate-300 font-medium">{current.tagline}</p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-400 font-bold">
              <Building2 className="w-3.5 h-3.5" />
              <span>{propCount} annonce(s) disponible(s)</span>
            </div>
          </div>
        </div>

        {/* Right Radar Metrics & Sliders */}
        <div className="lg:col-span-7 space-y-4">
          {/* Price Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Loyer Moyen
              </div>
              <div className="text-base sm:text-lg font-black text-white mt-0.5">
                ~ {current.avgRent.toLocaleString()} <span className="text-xs font-semibold text-slate-400">$/mois</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Appartement 2-3 ch. ou Villa</div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Prix Achat Moyen
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-400 mt-0.5">
                ~ {current.avgSalePerSqm.toLocaleString()} <span className="text-xs font-semibold text-slate-400">$/m²</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Selon standing & titre foncier</div>
            </div>
          </div>

          {/* Radar Scores (Security, Water, Power, Commute) */}
          <div className="space-y-2.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
            {/* Security */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Sécurité & Gardiennage
                </span>
                <span className="text-white font-bold">{current.securityScore} / 10</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${current.securityScore * 10}%` }}
                />
              </div>
            </div>

            {/* Water */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                  Alimentation Eau & Forages
                </span>
                <span className="text-white font-bold">{current.waterScore} / 10</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${current.waterScore * 10}%` }}
                />
              </div>
            </div>

            {/* Power */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Stabilité Électricité (SNEL/Solaire)
                </span>
                <span className="text-white font-bold">{current.powerScore} / 10</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${current.powerScore * 10}%` }}
                />
              </div>
            </div>

            {/* Commute Time */}
            <div className="flex items-center justify-between text-xs font-semibold pt-1 text-slate-300">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                Temps vers Gombe (Centre) :
              </span>
              <span className="text-teal-400 font-extrabold">{current.commuteTime}</span>
            </div>
          </div>

          {/* Highlights & Quartiers */}
          <div className="flex flex-wrap gap-1.5">
            {current.highlights.map((h, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 text-[10px] font-medium"
              >
                ✓ {h}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={handleFilterNow}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
              <span>Voir les annonces à {current.name} ({propCount})</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {onOpenMap && (
              <button
                onClick={onOpenMap}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs border border-slate-800 transition-all flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span>Voir sur la Carte Interactive</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
