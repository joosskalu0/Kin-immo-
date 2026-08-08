import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Property } from '../types';
import { useApp } from '../context/AppContext';
import { convertAndFormatPrice } from '../utils/currency';
import { MapPin, Navigation, Layers } from 'lucide-react';

interface PropertyMapProps {
  properties: Property[];
  height?: string;
}

export const PropertyMap: React.FC<PropertyMapProps> = ({ properties, height = 'h-[600px]' }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const { currency, setActivePropertyModalId } = useApp();

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Map if not existing
    if (!mapInstanceRef.current) {
      const initialLat = properties[0]?.lat || 48.8566;
      const initialLng = properties[0]?.lng || 2.3522;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 11,
        zoomControl: false,
      });

      // Dark styled tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
      markersGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    if (!map || !markersGroup) return;

    // Clear existing markers
    markersGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // Add markers for filtered properties
    properties.forEach((property) => {
      if (!property.lat || !property.lng) return;

      const formattedPrice = convertAndFormatPrice(property.price, currency);

      // Create custom HTML price tag marker
      const priceIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="px-2.5 py-1 rounded-xl bg-slate-900 border-2 border-emerald-500 text-emerald-400 font-bold text-xs shadow-xl flex items-center gap-1 transition-all hover:scale-110 cursor-pointer">
            <span>${formattedPrice}</span>
          </div>
        `,
        iconSize: [80, 30],
        iconAnchor: [40, 15],
      });

      const marker = L.marker([property.lat, property.lng], { icon: priceIcon });

      // Popup Content
      const popupHtml = `
        <div style="min-width: 220px; font-family: sans-serif;">
          <img src="${property.images[0] || ''}" style="width: 100%; height: 110px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />
          <div style="font-weight: bold; font-size: 13px; color: #0f172a; margin-bottom: 4px;">${property.title}</div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">📍 ${property.city}, ${property.country}</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold; font-size: 14px; color: #10b981;">${formattedPrice}</span>
            <button id="view-prop-${property.id}" style="background: #10b981; color: #0f172a; font-weight: bold; border: none; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 11px;">Voir Fiche</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`view-prop-${property.id}`);
        if (btn) {
          btn.onclick = () => setActivePropertyModalId(property.id);
        }
      });

      markersGroup.addLayer(marker);
      bounds.extend([property.lat, property.lng]);
    });

    // Fit map bounds if properties exist
    if (properties.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [properties, currency, setActivePropertyModalId]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl ${height}`}>
      <div ref={mapContainerRef} className="w-full h-full bg-slate-950" />

      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-200 flex items-center gap-2 shadow-lg">
        <MapPin className="w-4 h-4 text-emerald-400" />
        <span>Recherche Carte AJAX — {properties.length} résultats sur la carte</span>
      </div>
    </div>
  );
};
