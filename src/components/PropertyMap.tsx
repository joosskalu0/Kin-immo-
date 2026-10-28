import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Property } from '../types';
import { useApp } from '../context/AppContext';
import { convertAndFormatPrice } from '../utils/currency';
import {
  MapPin,
  Navigation,
  GraduationCap,
  Hospital,
  ShoppingCart,
  Route,
  ShieldCheck,
  Droplets,
  Zap,
  TrendingUp,
  Clock,
  Compass,
  X,
  Maximize2,
  Minimize2,
  DollarSign,
  Filter,
  Building2,
  Plane,
  Car,
  Globe,
  Navigation2,
  Crosshair
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  KINSHASA_URBAN_COMMUNES,
  KINSHASA_SCHOOLS,
  KINSHASA_HOSPITALS,
  KINSHASA_MARKETS,
  KINSHASA_MAIN_ROADS,
  KINSHASA_DISTANCE_HUBS,
  CommuneUrbanMetrics,
  calculateHaversineDistanceKm,
  estimateKinshasaDriveTime
} from '../data/kinshasaUrbanData';

interface PropertyMapProps {
  properties: Property[];
  height?: string;
  initialCommune?: string;
}

type MapLayerStyle = 'osm' | 'voyager' | 'satellite' | 'topo';

interface TileProviderConfig {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

const TILE_PROVIDERS: Record<MapLayerStyle, TileProviderConfig> = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributeurs',
    maxZoom: 19,
  },
  voyager: {
    name: 'Plan Clair',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  satellite: {
    name: 'Satellite HD',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  topo: {
    name: 'Relief',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap &copy; OpenStreetMap',
    maxZoom: 17,
  },
};

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  height = 'h-[600px]',
  initialCommune,
}) => {
  const { currency, setActivePropertyModalId, setFilters } = useApp();

  // Style de fond de carte OpenStreetMap (100% gratuit, sans clé API)
  const [mapStyle, setMapStyle] = useState<MapLayerStyle>('voyager');

  // Calques actifs (Toggles)
  const [showProperties, setShowProperties] = useState(true);
  const [showAveragePrices, setShowAveragePrices] = useState(true);
  const [showSchools, setShowSchools] = useState(true);
  const [showHospitals, setShowHospitals] = useState(true);
  const [showMarkets, setShowMarkets] = useState(false);
  const [showRoads, setShowRoads] = useState(true);
  const [showSecurityHeat, setShowSecurityHeat] = useState(false);
  const [showUtilities, setShowUtilities] = useState(false);

  // Commune sélectionnée pour le tiroir d'intelligence urbaine
  const [selectedCommune, setSelectedCommune] = useState<CommuneUrbanMetrics | null>(() => {
    if (initialCommune) {
      return (
        KINSHASA_URBAN_COMMUNES.find((c) =>
          c.name.toLowerCase().includes(initialCommune.toLowerCase())
        ) || KINSHASA_URBAN_COMMUNES[0]
      );
    }
    return KINSHASA_URBAN_COMMUNES[0]; // Gombe par défaut
  });

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sélections pour affichage des détails interactifs
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedPOI, setSelectedPOI] = useState<{
    name: string;
    type: string;
    details: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedRoad, setSelectedRoad] = useState<{
    name: string;
    type: string;
    speed: string;
    importance: string;
    lat: number;
    lng: number;
  } | null>(null);

  // Calculateur d'itinéraire routier
  const [selectedHubId, setSelectedHubId] = useState<string>('hub_airport');

  // Données du tracé d'itinéraire
  const [realRouteData, setRealRouteData] = useState<{
    path: [number, number][];
    distanceKm: number;
    durationMin: number;
    summary: string;
    originLabel: string;
    destLabel: string;
    steps: string[];
  } | null>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);

  // Références Leaflet
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Groupes de calques Leaflet pour mises à jour ultra-rapides
  const propertiesLayerRef = useRef<L.LayerGroup | null>(null);
  const communesLayerRef = useRef<L.LayerGroup | null>(null);
  const poisLayerRef = useRef<L.LayerGroup | null>(null);
  const roadsLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);

  const selectedHub = useMemo(() => {
    return (
      KINSHASA_DISTANCE_HUBS.find((h) => h.id === selectedHubId) ||
      KINSHASA_DISTANCE_HUBS[0]
    );
  }, [selectedHubId]);

  // Points de repère pour les calculs de trajet
  const currentDeparturePoint = useMemo(() => {
    if (selectedProperty?.lat && selectedProperty?.lng) {
      return {
        lat: selectedProperty.lat,
        lng: selectedProperty.lng,
        label: selectedProperty.title,
      };
    }
    if (selectedCommune) {
      return {
        lat: selectedCommune.lat,
        lng: selectedCommune.lng,
        label: selectedCommune.name,
      };
    }
    return {
      lat: -4.325,
      lng: 15.31,
      label: 'Kinshasa Centre',
    };
  }, [selectedProperty, selectedCommune]);

  // 1. Initialisation de la carte Leaflet / OpenStreetMap
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;
    if (mapInstanceRef.current) return;

    // Nettoyage préventif si le conteneur DOM avait déjà un identifiant Leaflet
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }

    // Création de l'instance Leaflet
    const map = L.map(container, {
      center: [-4.325, 15.31],
      zoom: 12,
      zoomControl: false,
      attributionControl: true,
    });

    // Contrôle du zoom positionné en haut à droite
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initialisation du fond de carte OpenStreetMap
    const provider = TILE_PROVIDERS[mapStyle];
    const tileLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      subdomains: 'abc',
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Initialisation des calques d'éléments
    const zonesGroup = L.layerGroup().addTo(map);
    const roadsGroup = L.layerGroup().addTo(map);
    const routeGroup = L.layerGroup().addTo(map);
    const commGroup = L.layerGroup().addTo(map);
    const poisGroup = L.layerGroup().addTo(map);
    const propGroup = L.layerGroup().addTo(map);

    zonesLayerRef.current = zonesGroup;
    roadsLayerRef.current = roadsGroup;
    routeLayerRef.current = routeGroup;
    communesLayerRef.current = commGroup;
    poisLayerRef.current = poisGroup;
    propertiesLayerRef.current = propGroup;

    mapInstanceRef.current = map;

    // Redimensionnement propre après le premier rendu
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // no-op
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      } catch {
        // no-op
      }
      if (container && (container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }
    };
  }, []);

  // 2. Mise à jour dynamique du style de fond de carte (OSM / CartoDB / Satellite / Relief)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const provider = TILE_PROVIDERS[mapStyle];
    const newTile = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      subdomains: 'abc',
    }).addTo(map);

    tileLayerRef.current = newTile;
  }, [mapStyle]);

  // 3. Redimensionnement lors du passage plein écran
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [isFullscreen, height]);

  // 4. Dessin des Boulevards Majeurs de Kinshasa
  useEffect(() => {
    const layer = roadsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showRoads) return;

    KINSHASA_MAIN_ROADS.forEach((road) => {
      const color =
        road.type === 'highway'
          ? '#f97316'
          : road.type === 'boulevard'
          ? '#06b6d4'
          : '#3b82f6';

      const polyline = L.polyline(road.coordinates, {
        color,
        weight: road.type === 'highway' ? 6 : 4,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
      });

      polyline.on('click', () => {
        const mid = road.coordinates[Math.floor(road.coordinates.length / 2)];
        setSelectedRoad({
          name: road.name,
          type: road.type,
          speed: road.trafficSpeed,
          importance: road.importance,
          lat: mid[0],
          lng: mid[1],
        });
      });

      layer.addLayer(polyline);
    });
  }, [showRoads]);

  // 5. Affichage des Zones Urbaines (Sécurité & Énergie/Eau)
  useEffect(() => {
    const layer = zonesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (showSecurityHeat) {
      KINSHASA_URBAN_COMMUNES.forEach((commune) => {
        const score = commune.securityScore;
        const color = score >= 8 ? '#10b981' : score >= 6 ? '#f59e0b' : '#ef4444';
        const circle = L.circle([commune.lat, commune.lng], {
          radius: 1400,
          color,
          fillColor: color,
          fillOpacity: 0.2,
          weight: 1.5,
        });
        layer.addLayer(circle);
      });
    }

    if (showUtilities) {
      KINSHASA_URBAN_COMMUNES.forEach((commune) => {
        const score = (commune.waterScore + commune.powerScore) / 2;
        const color = score >= 7 ? '#3b82f6' : score >= 5 ? '#eab308' : '#f97316';
        const circle = L.circle([commune.lat, commune.lng], {
          radius: 1200,
          color,
          fillColor: color,
          fillOpacity: 0.22,
          weight: 1.5,
          dashArray: '4, 4',
        });
        layer.addLayer(circle);
      });
    }
  }, [showSecurityHeat, showUtilities]);

  // 6. Affichage des Marqueurs de Communes (Intelligence Urbaine & Prix/Loyers)
  useEffect(() => {
    const layer = communesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showAveragePrices) return;

    KINSHASA_URBAN_COMMUNES.forEach((commune) => {
      const html = `
        <div class="cursor-pointer group transform hover:scale-105 transition-all select-none">
          <div class="bg-slate-900/95 backdrop-blur-md text-white px-2.5 py-1.5 rounded-xl border border-blue-500/50 shadow-xl flex flex-col gap-0.5 min-w-[110px]">
            <div class="flex items-center justify-between text-[11px] font-black text-blue-400">
              <span class="truncate">${commune.name}</span>
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-300">
              <span>Vente:</span>
              <span class="font-bold text-emerald-400">$${commune.avgSalePerSqmUSD}/m²</span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-300">
              <span>Loyer:</span>
              <span class="font-bold text-amber-400">$${commune.avgRentMonthlyUSD}/m</span>
            </div>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html,
        iconSize: [120, 56],
        iconAnchor: [60, 28],
      });

      const marker = L.marker([commune.lat, commune.lng], {
        icon,
        title: `Intelligence : ${commune.name}`,
      });

      marker.on('click', () => {
        setSelectedCommune(commune);
        setIsSidePanelOpen(true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([commune.lat, commune.lng], 14, {
            animate: true,
          });
        }
      });

      layer.addLayer(marker);
    });
  }, [showAveragePrices]);

  // 7. Affichage des POIs (Écoles, Hôpitaux, Marchés, Hubs Stratégiques)
  useEffect(() => {
    const layer = poisLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    // Écoles
    if (showSchools) {
      KINSHASA_SCHOOLS.forEach((school) => {
        const icon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div class="w-7 h-7 rounded-full bg-indigo-600 border-2 border-white shadow-lg flex items-center justify-center text-white cursor-pointer hover:scale-125 transition-all text-xs font-bold">
              🎓
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([school.lat, school.lng], {
          icon,
          title: school.name,
        });

        marker.on('click', () => {
          setSelectedPOI({
            name: school.name,
            type: 'Établissement Scolaire',
            details: school.description,
            lat: school.lat,
            lng: school.lng,
          });
        });

        layer.addLayer(marker);
      });
    }

    // Hôpitaux
    if (showHospitals) {
      KINSHASA_HOSPITALS.forEach((hosp) => {
        const icon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div class="w-7 h-7 rounded-full bg-rose-600 border-2 border-white shadow-lg flex items-center justify-center text-white cursor-pointer hover:scale-125 transition-all text-xs font-bold">
              🏥
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([hosp.lat, hosp.lng], {
          icon,
          title: hosp.name,
        });

        marker.on('click', () => {
          setSelectedPOI({
            name: hosp.name,
            type: 'Centre Hospitalier & Clinique',
            details: hosp.description,
            lat: hosp.lat,
            lng: hosp.lng,
          });
        });

        layer.addLayer(marker);
      });
    }

    // Marchés
    if (showMarkets) {
      KINSHASA_MARKETS.forEach((mkt) => {
        const icon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div class="w-7 h-7 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-slate-900 cursor-pointer hover:scale-125 transition-all text-xs font-bold">
              🛒
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker([mkt.lat, mkt.lng], {
          icon,
          title: mkt.name,
        });

        marker.on('click', () => {
          setSelectedPOI({
            name: mkt.name,
            type: 'Marché & Commerce',
            details: mkt.description,
            lat: mkt.lat,
            lng: mkt.lng,
          });
        });

        layer.addLayer(marker);
      });
    }

    // Hubs Stratégiques (Aéroport Ndjili, Beach Ngobila, etc.)
    KINSHASA_DISTANCE_HUBS.forEach((hub) => {
      const icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="flex items-center gap-1.5 bg-slate-900/90 text-white px-2 py-1 rounded-full border border-emerald-400 shadow-xl cursor-pointer hover:scale-110 transition-transform whitespace-nowrap select-none">
            <span class="text-emerald-400 text-xs">✈️</span>
            <span class="text-[10px] font-bold truncate max-w-[90px]">${hub.name}</span>
          </div>
        `,
        iconSize: [120, 28],
        iconAnchor: [60, 14],
      });

      const marker = L.marker([hub.lat, hub.lng], {
        icon,
        title: `Hub : ${hub.name}`,
      });

      marker.on('click', () => {
        setSelectedHubId(hub.id);
        handleCalculateRoute(
          currentDeparturePoint.lat,
          currentDeparturePoint.lng,
          hub.lat,
          hub.lng,
          currentDeparturePoint.label,
          hub.name
        );
      });

      layer.addLayer(marker);
    });
  }, [showSchools, showHospitals, showMarkets, currentDeparturePoint]);

  // 8. Affichage des Biens Immobiliers (avec badges de prix)
  useEffect(() => {
    const layer = propertiesLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!showProperties) return;

    properties.forEach((prop) => {
      if (!prop.lat || !prop.lng) return;

      const isSelected = selectedProperty?.id === prop.id;
      const isSale = prop.status === 'for-sale';
      const formattedPrice = convertAndFormatPrice(prop.price, currency);

      const html = `
        <div class="group cursor-pointer transform transition-all duration-200 hover:scale-110 select-none ${
          isSelected ? 'scale-115 z-30' : 'z-10'
        }">
          <div class="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black shadow-xl border ${
            isSale
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-indigo-600 text-white border-indigo-400'
          }">
            <svg class="w-3 h-3 shrink-0 inline-block -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21s-8-7.5-8-12a8 8 0 1116 0c0 4.5-8 12-8 12z"/><circle cx="12" cy="9" r="3"/></svg>
            <span>${formattedPrice}</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-leaflet-marker',
        html,
        iconSize: [110, 32],
        iconAnchor: [55, 16],
      });

      const marker = L.marker([prop.lat, prop.lng], {
        icon,
        title: prop.title,
      });

      marker.on('click', () => {
        setSelectedProperty(prop);
        setSelectedCommune(
          KINSHASA_URBAN_COMMUNES.find(
            (c) =>
              prop.commune &&
              prop.commune.toLowerCase().includes(c.name.toLowerCase())
          ) || null
        );
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([prop.lat!, prop.lng!], { animate: true });
        }
      });

      layer.addLayer(marker);
    });
  }, [properties, showProperties, selectedProperty, currency]);

  // 9. Tracé de l'itinéraire sélectionné
  useEffect(() => {
    const layer = routeLayerRef.current;
    if (!layer) return;
    layer.clearLayers();

    if (!realRouteData) return;

    // Ligne d'ombrage/halo
    const glow = L.polyline(realRouteData.path, {
      color: '#047857',
      weight: 8,
      opacity: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
    });

    // Ligne principale émeraude
    const line = L.polyline(realRouteData.path, {
      color: '#10b981',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    });

    layer.addLayer(glow);
    layer.addLayer(line);
  }, [realRouteData]);

  // Fonction de calcul d'itinéraire routier
  const handleCalculateRoute = (
    startLat: number,
    startLng: number,
    destLat: number,
    destLng: number,
    startLabel: string,
    destLabel: string
  ) => {
    setIsRoutingLoading(true);

    try {
      const distDirect = calculateHaversineDistanceKm(
        startLat,
        startLng,
        destLat,
        destLng
      );
      const isAirport =
        destLabel.toLowerCase().includes('aéroport') ||
        destLabel.toLowerCase().includes('ndjili');
      const driveTimeObj = estimateKinshasaDriveTime(distDirect, isAirport);

      // Tracé des waypoints selon les artères routières réelles de Kinshasa
      const waypoints: [number, number][] = [[startLat, startLng]];

      if (destLat < -4.37 && destLng > 15.4) {
        waypoints.push([-4.3295, 15.3045]); // Bd Triomphal
        waypoints.push([-4.3512, 15.3345]); // Échangeur de Limete
        waypoints.push([-4.3785, 15.3785]); // Bd Lumumba Masina
        waypoints.push([-4.3985, 15.4485]); // Pont Ndjili
      } else if (destLng < 15.28) {
        waypoints.push([-4.3165, 15.2865]); // Mondjiba
        waypoints.push([-4.3295, 15.2745]); // Kintambo Magasin
      } else {
        waypoints.push([-4.3092, 15.2985]); // Bd du 30 Juin
      }

      waypoints.push([destLat, destLng]);

      setRealRouteData({
        path: waypoints,
        distanceKm: Math.round(distDirect * 1.25 * 10) / 10,
        durationMin: driveTimeObj.maxMinutes,
        summary: `Itinéraire via artères principales (${startLabel} ➔ ${destLabel})`,
        originLabel: startLabel,
        destLabel: destLabel,
        steps: [
          `Départ depuis ${startLabel}`,
          "Emprunter l'artère principale de circulation fluide",
          `Rejoindre l'axe prioritaire vers ${destLabel}`,
          `Arrivée estimée à destination : ${destLabel} (${driveTimeObj.text})`,
        ],
      });

      if (mapInstanceRef.current) {
        const bounds = L.latLngBounds(waypoints);
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch {
      const dist = calculateHaversineDistanceKm(
        startLat,
        startLng,
        destLat,
        destLng
      );
      const isAirport =
        destLabel.toLowerCase().includes('aéroport') ||
        destLabel.toLowerCase().includes('ndjili');
      const driveTimeObj = estimateKinshasaDriveTime(dist, isAirport);

      setRealRouteData({
        path: [
          [startLat, startLng],
          [destLat, destLng],
        ],
        distanceKm: Math.round(dist * 10) / 10,
        durationMin: driveTimeObj.maxMinutes,
        summary: `Ligne de transit direct (${startLabel} ➔ ${destLabel})`,
        originLabel: startLabel,
        destLabel: destLabel,
        steps: [`Départ de ${startLabel}`, `Direction ${destLabel}`],
      });
    } finally {
      setIsRoutingLoading(false);
    }
  };

  // Réinitialiser la vue sur Kinshasa
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-4.325, 15.31], 12, { animate: true });
    }
    setRealRouteData(null);
    setSelectedProperty(null);
    setSelectedPOI(null);
    setSelectedRoad(null);
  };

  return (
    <div
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xl transition-all duration-300 ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : height
      }`}
    >
      {/* ------------------------------------------------------------- */}
      {/* BARRE D'OUTILS ET CONTRÔLES SUPÉRIEURS                        */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Badge OpenStreetMap & Commune */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-700/80 shadow-lg text-white">
          <div className="flex items-center gap-1.5 text-xs font-black tracking-wide text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <Globe className="w-3.5 h-3.5" />
            <span>OpenStreetMap</span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-xs font-semibold text-slate-300 truncate max-w-[140px] sm:max-w-[200px]">
            {selectedCommune ? selectedCommune.name : 'Kinshasa'}
          </span>
          <button
            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
            className="ml-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer"
          >
            {isSidePanelOpen ? 'Fermer infos' : 'Voir stats'}
          </button>
        </div>

        {/* Sélecteurs de Style de Fond de Carte OpenStreetMap */}
        <div className="flex items-center gap-1 pointer-events-auto bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 shadow-lg">
          <button
            onClick={() => setMapStyle('voyager')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapStyle === 'voyager'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Plan Clair
          </button>
          <button
            onClick={() => setMapStyle('osm')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapStyle === 'osm'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Standard OSM
          </button>
          <button
            onClick={() => setMapStyle('satellite')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapStyle === 'satellite'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Satellite HD
          </button>
          <button
            onClick={() => setMapStyle('topo')}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mapStyle === 'topo'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            Relief
          </button>
        </div>

        {/* Boutons Actions Rapides (Recentrer & Plein Écran) */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={handleResetView}
            className="p-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-lg transition-all active:scale-95 cursor-pointer"
            title="Recentrer la carte sur Kinshasa"
          >
            <Crosshair className="w-4 h-4 text-emerald-400" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md hover:bg-slate-800 text-slate-200 border border-slate-700/80 shadow-lg transition-all active:scale-95 cursor-pointer"
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-amber-400" />
            ) : (
              <Maximize2 className="w-4 h-4 text-slate-200" />
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BARRE INFÉRIEURE : FILTRES DES CALQUES URBAINS                */}
      {/* ------------------------------------------------------------- */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/80 shadow-xl max-w-full overflow-x-auto">
          {/* Toggle Propriétés */}
          <button
            onClick={() => setShowProperties(!showProperties)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showProperties
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Biens ({properties.length})</span>
          </button>

          {/* Toggle Prix & Loyers Moyens */}
          <button
            onClick={() => setShowAveragePrices(!showAveragePrices)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showAveragePrices
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Prix & Loyers</span>
          </button>

          {/* Toggle Écoles */}
          <button
            onClick={() => setShowSchools(!showSchools)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showSchools
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Écoles</span>
          </button>

          {/* Toggle Hôpitaux */}
          <button
            onClick={() => setShowHospitals(!showHospitals)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showHospitals
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hospital className="w-3.5 h-3.5" />
            <span>Hôpitaux</span>
          </button>

          {/* Toggle Marchés */}
          <button
            onClick={() => setShowMarkets(!showMarkets)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showMarkets
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Marchés</span>
          </button>

          {/* Toggle Boulevards */}
          <button
            onClick={() => setShowRoads(!showRoads)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showRoads
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Boulevards</span>
          </button>

          {/* Toggle Sécurité */}
          <button
            onClick={() => setShowSecurityHeat(!showSecurityHeat)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showSecurityHeat
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Sécurité</span>
          </button>

          {/* Toggle Eau & Électricité */}
          <button
            onClick={() => setShowUtilities(!showUtilities)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showUtilities
                ? 'bg-amber-500 text-slate-900 shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Eau & Élec</span>
          </button>
        </div>

        {/* Bouton Calculateur d'Itinéraire vers Hub */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-xl">
          <Car className="w-4 h-4 text-emerald-400 shrink-0" />
          <select
            value={selectedHubId}
            onChange={(e) => {
              setSelectedHubId(e.target.value);
              const target = KINSHASA_DISTANCE_HUBS.find(
                (h) => h.id === e.target.value
              );
              if (target) {
                handleCalculateRoute(
                  currentDeparturePoint.lat,
                  currentDeparturePoint.lng,
                  target.lat,
                  target.lng,
                  currentDeparturePoint.label,
                  target.name
                );
              }
            }}
            className="bg-transparent text-xs font-bold text-white focus:outline-hidden cursor-pointer"
          >
            {KINSHASA_DISTANCE_HUBS.map((hub) => (
              <option
                key={hub.id}
                value={hub.id}
                className="bg-slate-800 text-white"
              >
                Itinéraire ➔ {hub.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              if (selectedHub) {
                handleCalculateRoute(
                  currentDeparturePoint.lat,
                  currentDeparturePoint.lng,
                  selectedHub.lat,
                  selectedHub.lng,
                  currentDeparturePoint.label,
                  selectedHub.name
                );
              }
            }}
            disabled={isRoutingLoading}
            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Navigation className="w-3 h-3" />
            <span>Tracer</span>
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* BANDEAU FLOTTANT ITINÉRAIRE EN COURS                         */}
      {/* ------------------------------------------------------------- */}
      {realRouteData && (
        <div className="absolute top-16 left-3 right-3 sm:right-auto sm:max-w-md z-30 pointer-events-auto bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/40 shadow-2xl text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Navigation2 className="w-4 h-4 animate-spin" />
              </div>
              <div>
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  Itinéraire Routier OpenStreetMap
                </h4>
                <p className="text-sm font-bold text-slate-100 line-clamp-1">
                  {realRouteData.originLabel} ➔ {realRouteData.destLabel}
                </p>
              </div>
            </div>
            <button
              onClick={() => setRealRouteData(null)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Distance estimée
                </div>
                <div className="text-sm font-black text-emerald-300">
                  {realRouteData.distanceKm} km
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Temps moyen Kin
                </div>
                <div className="text-sm font-black text-amber-300">
                  ~{realRouteData.durationMin} min
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2.5 text-[11px] text-slate-300 space-y-1">
            {realRouteData.steps.map((st, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                <span className="truncate">{st}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CARTE LEAFLET / OPENSTREETMAP CONTAINER                      */}
      {/* ------------------------------------------------------------- */}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[400px] z-10"
      />

      {/* ------------------------------------------------------------- */}
      {/* CARTE FLOTTANTE : DÉTAIL DU BIEN IMMOBILIER SÉLECTIONNÉ       */}
      {/* ------------------------------------------------------------- */}
      {selectedProperty && (
        <div className="absolute top-16 right-3 sm:right-4 z-30 pointer-events-auto bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-2xl text-slate-900 w-72 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="relative h-32 rounded-xl overflow-hidden mb-2 bg-slate-100">
            <img
              src={
                selectedProperty.images?.[0] ||
                'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=400&q=80'
              }
              alt={selectedProperty.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-white">
              {selectedProperty.status === 'for-sale' ? 'Vente' : 'Location'}
            </div>
            <button
              onClick={() => setSelectedProperty(null)}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
            {selectedProperty.title}
          </h4>
          <p className="text-[11px] text-slate-500 line-clamp-1 mb-1.5">
            {selectedProperty.commune || 'Kinshasa'}
          </p>

          <div className="flex items-center justify-between font-black text-sm text-emerald-700 mb-2">
            <span>{convertAndFormatPrice(selectedProperty.price, currency)}</span>
            <span className="text-[10px] text-slate-500 font-normal">
              {selectedProperty.bedrooms} ch • {selectedProperty.area} m²
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setActivePropertyModalId(selectedProperty.id)}
              className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Voir l'annonce
            </button>
            <button
              onClick={() => {
                if (selectedHub && selectedProperty.lat && selectedProperty.lng) {
                  handleCalculateRoute(
                    selectedProperty.lat,
                    selectedProperty.lng,
                    selectedHub.lat,
                    selectedHub.lng,
                    selectedProperty.title,
                    selectedHub.name
                  );
                }
              }}
              className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer text-center"
            >
              Itinéraire
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CARTE FLOTTANTE : DÉTAIL D'UN POI SÉLECTIONNÉ (ÉCOLE, HÔPITAL) */}
      {/* ------------------------------------------------------------- */}
      {selectedPOI && (
        <div className="absolute top-16 right-3 sm:right-4 z-30 pointer-events-auto bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-2xl text-slate-900 w-72 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
              {selectedPOI.type}
            </div>
            <button
              onClick={() => setSelectedPOI(null)}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="font-bold text-xs text-slate-900 mb-1">
            {selectedPOI.name}
          </h4>
          <p className="text-[11px] text-slate-600 leading-tight mb-2.5">
            {selectedPOI.details}
          </p>
          <button
            onClick={() => {
              handleCalculateRoute(
                currentDeparturePoint.lat,
                currentDeparturePoint.lng,
                selectedPOI.lat,
                selectedPOI.lng,
                currentDeparturePoint.label,
                selectedPOI.name
              );
              setSelectedPOI(null);
            }}
            className="w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
          >
            <Navigation className="w-3 h-3" />
            <span>Tracer route vers ce lieu</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CARTE FLOTTANTE : BOULEVARD SÉLECTIONNÉ                       */}
      {/* ------------------------------------------------------------- */}
      {selectedRoad && (
        <div className="absolute top-16 right-3 sm:right-4 z-30 pointer-events-auto bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-2xl text-slate-900 w-72 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">
              Axe Routier Stratégique
            </div>
            <button
              onClick={() => setSelectedRoad(null)}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="font-bold text-xs text-slate-900 mb-1">
            {selectedRoad.name}
          </h4>
          <div className="text-[11px] text-slate-700 mb-1">
            <span className="font-bold">Trafic moyen :</span> {selectedRoad.speed}
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            {selectedRoad.importance}
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TIROIR LATÉRAL : STATISTIQUES & INTELLIGENCE DU QUARTIER      */}
      {/* ------------------------------------------------------------- */}
      {isSidePanelOpen && selectedCommune && (
        <div className="absolute top-14 bottom-16 right-3 z-30 w-full sm:w-[380px] bg-slate-900/95 backdrop-blur-md rounded-3xl border border-slate-700/80 shadow-2xl p-5 overflow-y-auto text-white flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Intelligence Foncière Kinshasa
                </span>
                <h3 className="text-xl font-black text-white">
                  {selectedCommune.name}
                </h3>
                <p className="text-xs text-slate-400">
                  District : {selectedCommune.district}
                </p>
              </div>
              <button
                onClick={() => setIsSidePanelOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PRIX & LOYERS MOYENS */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-semibold mb-1">
                  Prix Moyen Vente
                </div>
                <div className="text-lg font-black text-emerald-400">
                  ${selectedCommune.avgSalePerSqmUSD}{' '}
                  <span className="text-xs font-normal">/ m²</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Moy. Bien: ~${selectedCommune.avgSalePriceUSD.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-semibold mb-1">
                  Loyer Moyen
                </div>
                <div className="text-lg font-black text-amber-400">
                  ${selectedCommune.avgRentMonthlyUSD}{' '}
                  <span className="text-xs font-normal">/ mois</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Rendement: +{selectedCommune.annualAppreciationRate}% /an
                </div>
              </div>
            </div>

            {/* GRAPHIQUE ÉVOLUTION DES PRIX (2022 - 2026) */}
            <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60 mb-4">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <div className="flex items-center gap-1.5 text-slate-200">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Évolution Prix / m² (USD)</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-black">
                  +{selectedCommune.annualAppreciationRate}% / an
                </span>
              </div>
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedCommune.priceHistory}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="year"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      domain={['dataMin - 100', 'dataMax + 100']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: '#f8fafc',
                      }}
                      formatter={(val: any) => [`$${val}/m²`, 'Prix']}
                    />
                    <Area
                      type="monotone"
                      dataKey="pricePerSqm"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* SCORES VITAUX (SÉCURITÉ, EAU, ÉLECTRICITÉ) */}
            <div className="space-y-2 mb-4">
              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">Sécurité</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {selectedCommune.securityLabel}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                  {selectedCommune.securityScore}/10
                </span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Disponibilité Eau
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {selectedCommune.waterLabel}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300">
                  {selectedCommune.waterScore}/10
                </span>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Électricité (SNEL)
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {selectedCommune.powerLabel}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300">
                  {selectedCommune.powerScore}/10
                </span>
              </div>
            </div>

            {/* TEMPS DE TRAJET VERS GOMBE & AÉROPORT */}
            <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 mb-4">
              <div className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                <span>Distances & Trajets</span>
              </div>
              <div className="text-[11px] text-slate-300 space-y-1">
                <div>• Vers Gombe (Centre): {selectedCommune.commuteToGombeMin}</div>
                <div>
                  • Vers Aéroport N'djili: ~
                  {
                    estimateKinshasaDriveTime(
                      calculateHaversineDistanceKm(
                        selectedCommune.lat,
                        selectedCommune.lng,
                        -4.3855,
                        15.4445
                      ),
                      true
                    ).text
                  }
                </div>
              </div>
            </div>
          </div>

          {/* ACTION : FILTRER LES BIENS DE CETTE COMMUNE */}
          <button
            onClick={() => {
              setFilters((prev) => ({
                ...prev,
                commune: selectedCommune.name.split(' ')[0],
              }));
              setIsSidePanelOpen(false);
            }}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Voir les annonces à {selectedCommune.name}</span>
          </button>
        </div>
      )}
    </div>
  );
};
