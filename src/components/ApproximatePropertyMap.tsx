import React, { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, ShieldCheck, Compass } from 'lucide-react';
import { Property } from '../types';
import { KINSHASA_URBAN_COMMUNES } from '../data/kinshasaUrbanData';

interface ApproximatePropertyMapProps {
  property: Property;
}

/**
 * Calcule un décalage déterministe (~140 à 220 m) à partir de l'identifiant du bien
 * afin d'afficher une zone approximative crédible sans exposer l'emplacement exact.
 */
function getApproximateZoneCoordinates(property: Property): [number, number] {
  let baseLat = Number(property.lat);
  let baseLng = Number(property.lng);

  if (!Number.isFinite(baseLat) || !Number.isFinite(baseLng) || (baseLat === 0 && baseLng === 0)) {
    const matchedCommune = KINSHASA_URBAN_COMMUNES.find(
      (c) =>
        property.commune &&
        c.name.toLowerCase().includes(property.commune.toLowerCase().trim())
    );
    baseLat = matchedCommune?.lat ?? -4.325;
    baseLng = matchedCommune?.lng ?? 15.31;
  }

  let hash = 0;
  const seed = `${property.id}-${property.commune || 'kinshasa'}`;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }

  const angle = ((hash % 360) * Math.PI) / 180;
  const radiusDeg = 0.0014 + ((hash % 8) * 0.0001); // ~150m–230m
  return [
    baseLat + Math.sin(angle) * radiusDeg,
    baseLng + Math.cos(angle) * radiusDeg,
  ];
}

export const ApproximatePropertyMap: React.FC<ApproximatePropertyMapProps> = ({ property }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const [approxLat, approxLng] = useMemo(
    () => getApproximateZoneCoordinates(property),
    [property.id, property.lat, property.lng, property.commune]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if ((container as any)._leaflet_id) {
      try {
        mapRef.current?.remove();
      } catch {}
      delete (container as any)._leaflet_id;
    }

    const map = L.map(container, {
      center: [approxLat, approxLng],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    // Zone approximative (cercle de secteur ~450 m)
    L.circle([approxLat, approxLng], {
      radius: 450,
      color: '#059669',
      weight: 2,
      opacity: 0.85,
      fillColor: '#10b981',
      fillOpacity: 0.16,
      dashArray: '6 6',
    }).addTo(map);

    // Point central indicatif du secteur (pas l'adresse exacte)
    const sectorIcon = L.divIcon({
      className: 'kinimmo-approx-marker',
      html: `<div style="width:34px;height:34px;border-radius:9999px;background:#059669;border:3px solid #ffffff;box-shadow:0 6px 16px rgba(15,23,42,0.28);display:flex;align-items:center;justify-content:center;color:#ffffff;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    L.marker([approxLat, approxLng], { icon: sectorIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;line-height:1.4;">
          <strong>Secteur approximatif</strong><br/>
          ${property.quartier ? `${property.quartier}, ` : ''}${property.commune || property.city || 'Kinshasa'}
          ${property.referencePoint ? `<br/><span style="color:#047857;">Repère : ${property.referencePoint}</span>` : ''}
        </div>`
      );

    mapRef.current = map;

    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {}
    }, 150);

    return () => {
      clearTimeout(timer);
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
    };
  }, [approxLat, approxLng, property.commune, property.quartier, property.city, property.referencePoint]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            <span>Localisation approximative</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Zone indicative (~450 m) • L’adresse précise est communiquée lors de la visite
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-800 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Carte ouverte sans suivi GPS exact</span>
        </div>
      </div>

      {/* Infos textuelles de localisation + point de repère */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-slate-50/70 text-xs">
        <div className="p-3.5 sm:p-4">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Compass className="w-3.5 h-3.5 text-emerald-600" />
            Commune & Ville
          </span>
          <span className="block text-sm font-bold text-slate-900 mt-1">
            {property.commune || property.city || 'Kinshasa'}
          </span>
        </div>

        <div className="p-3.5 sm:p-4">
          <span className="text-slate-500 flex items-center gap-1.5 font-medium">
            <Navigation className="w-3.5 h-3.5 text-emerald-600" />
            Quartier / Secteur
          </span>
          <span className="block text-sm font-bold text-slate-900 mt-1">
            {property.quartier || property.avenue || property.address || 'Secteur résidentiel'}
          </span>
        </div>

        <div className="p-3.5 sm:p-4">
          <span className="text-slate-500 font-medium block">Point de repère</span>
          <span className="block text-sm font-bold text-emerald-800 mt-1">
            {property.referencePoint || 'Proche des axes principaux du quartier'}
          </span>
        </div>
      </div>

      {/* Conteneur Carte Leaflet */}
      <div className="relative h-64 sm:h-72 w-full bg-slate-100">
        <div ref={containerRef} className="w-full h-full z-10" />
      </div>
    </section>
  );
};
