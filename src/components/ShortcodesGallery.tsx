import React from 'react';
import { useApp } from '../context/AppContext';
import { MortgageCalculator } from './MortgageCalculator';
import {
  Grid,
  MapPin,
  Sparkles,
  Users,
  Building2,
  Zap,
  TrendingUp,
  Award,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

export const ShortcodesGallery: React.FC = () => {
  const { properties, agents, customFields, setIsFieldsBuilderOpen } = useApp();

  const cities = [
    { name: 'Gombe', count: 18, img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80' },
    { name: 'Ngaliema', count: 14, img: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&auto=format&fit=crop&q=80' },
    { name: 'Limete', count: 9, img: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=600&auto=format&fit=crop&q=80' },
    { name: 'Kintambo', count: 11, img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&auto=format&fit=crop&q=80' },
  ];

  return (
    <div className="space-y-12">
      {/* Shortcodes Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 text-slate-100 shadow-2xl space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <Grid className="w-4 h-4" />
          Outils & Modules Immobiliers
        </div>
        <h2 className="text-3xl font-bold text-white tracking-tight">
          Bibliothèque de Composants & Outils Immobiliers
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
          Explorez nos outils interactifs : découvrez les communes de Kinshasa, le simulateur de financement, les statistiques clés du marché et la personnalisation avancée des critères.
        </p>
      </div>

      {/* WIDGET 1: Locations Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <MapPin className="w-5 h-5 text-emerald-400" />
          Widget 1: Grille des Villes & Emplacements
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cities.map((city) => (
            <div
              key={city.name}
              className="group relative aspect-[4/3] rounded-3xl overflow-hidden border border-slate-800 shadow-lg cursor-pointer"
            >
              <img
                src={city.img}
                alt={city.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-slate-100">
                <h4 className="font-bold text-base group-hover:text-emerald-400 transition-colors">
                  {city.name}
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  {city.count} propriétés disponibles
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WIDGET 2: Stats Counter */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Widget 2: Compteur de Performance & Chiffres Clés
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Biens en Vente & Location', val: '1,240+', icon: Building2 },
            { label: 'Volume de Transactions 2026', val: '185 M€', icon: TrendingUp },
            { label: 'Agents & Agences Partenaires', val: '350+', icon: Users },
            { label: 'Satisfaction Clients', val: '98.5%', icon: Award },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div
                key={i}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-2 shadow-xl"
              >
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-extrabold text-white">{stat.val}</div>
                <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WIDGET 3: Fields Builder Summary */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            Module : Critères & Spécifications des Propriétés
          </h3>
          <button
            onClick={() => setIsFieldsBuilderOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Personnaliser les Critères
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {customFields.map((f) => (
            <div key={f.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 text-xs">
              <div className="font-bold text-white text-sm">{f.label['fr'] || f.key}</div>
              <div className="text-slate-400 font-mono">Clé: {f.key}</div>
              <div className="text-emerald-400 font-medium">Type: {f.type} {f.unit ? `(${f.unit})` : ''}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WIDGET 4: Mortgage Loan Calculator */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Widget 4: Calculateur de Prêt Immobilier Interactif
        </h3>
        <MortgageCalculator initialPrice={650000} />
      </div>
    </div>
  );
};
