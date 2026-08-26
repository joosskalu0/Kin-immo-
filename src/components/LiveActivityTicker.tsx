import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, MapPin, Eye, Calendar, Heart, X, CheckCircle2 } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'visit' | 'view' | 'wishlist' | 'lead';
  title: string;
  location: string;
  timeAgo: string;
  propertyId?: string;
}

export const LiveActivityTicker: React.FC = () => {
  const { properties, setActivePropertyModalId } = useApp();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const activities: ActivityItem[] = [
    {
      id: 'act-1',
      type: 'visit',
      title: 'Visite sur place demandée',
      location: 'Ngaliema (Macampagne)',
      timeAgo: 'Il y a 4 min',
      propertyId: properties[0]?.id,
    },
    {
      id: 'act-2',
      type: 'view',
      title: 'Villa avec piscine consultée par 5 acheteurs',
      location: 'Gombe Centre',
      timeAgo: 'Il y a 12 min',
      propertyId: properties[1]?.id,
    },
    {
      id: 'act-3',
      type: 'lead',
      title: 'Offre d\'achat soumise à un agent',
      location: 'Limete Résidentiel',
      timeAgo: 'Il y a 23 min',
      propertyId: properties[2]?.id,
    },
    {
      id: 'act-4',
      type: 'visit',
      title: 'Visite Vidéo WhatsApp réservée (Diaspora)',
      location: 'Kintambo',
      timeAgo: 'Il y a 35 min',
      propertyId: properties[3]?.id,
    },
    {
      id: 'act-5',
      type: 'wishlist',
      title: 'Bien ajouté en favoris par 8 utilisateurs',
      location: 'Mont-Fleury',
      timeAgo: 'Il y a 48 min',
      propertyId: properties[0]?.id,
    },
  ];

  useEffect(() => {
    if (isPaused || !isVisible) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % activities.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, isVisible, activities.length]);

  if (!isVisible || activities.length === 0) return null;

  const current = activities[currentIdx];

  const getIcon = (type: string) => {
    switch (type) {
      case 'visit':
        return <Calendar className="w-3.5 h-3.5 text-emerald-400" />;
      case 'view':
        return <Eye className="w-3.5 h-3.5 text-teal-400" />;
      case 'lead':
        return <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />;
      case 'wishlist':
        return <Heart className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="fixed bottom-6 left-6 z-30 hidden md:block max-w-sm animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-2xl text-slate-100 flex items-center gap-3 relative group">
        <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
          {getIcon(current.type)}
        </div>

        <div
          onClick={() => {
            if (current.propertyId) setActivePropertyModalId(current.propertyId);
          }}
          className="min-w-0 flex-1 cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <p className="text-[11px] font-bold text-white truncate hover:text-emerald-400 transition-colors">
              {current.title}
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-0.5">
              <MapPin className="w-2.5 h-2.5 text-emerald-400" />
              {current.location}
            </span>
            <span>•</span>
            <span className="text-slate-500">{current.timeAgo}</span>
          </div>
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
          title="Masquer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
