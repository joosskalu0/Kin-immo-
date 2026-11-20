import { Property } from '../types';

/**
 * Normalise une chaîne de caractères en slug URL propre (sans accents, minuscules, tirets)
 */
export function slugifyText(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

/**
 * Génère un slug canonique déterministe et sans collision pour une annonce :
 * ex: villa-contemporaine-piscine-gombe--prop-1
 */
export function getPropertySlug(
  propertyOrMeta:
    | Property
    | { id: string; slug?: string; title?: string; commune?: string; city?: string }
): string {
  if (propertyOrMeta.slug && propertyOrMeta.slug.trim()) {
    return propertyOrMeta.slug.trim();
  }
  const titlePart = slugifyText(propertyOrMeta.title || 'annonce-kinimmo');
  const locPart = slugifyText(propertyOrMeta.commune || propertyOrMeta.city || 'kinshasa');
  const rawId = String(propertyOrMeta.id || '').trim();
  const base = [titlePart, locPart].filter(Boolean).join('-') || 'annonce';
  return rawId ? `${base}--${rawId}` : base;
}

/**
 * Extrait l'identifiant d'annonce depuis un slug ou résout l'annonce correspondante dans une liste
 */
export function extractPropertyIdFromSlug(slugOrId: string): string {
  const clean = decodeURIComponent(String(slugOrId || '').trim());
  if (!clean) return '';
  const separatorIdx = clean.lastIndexOf('--');
  if (separatorIdx !== -1 && separatorIdx + 2 < clean.length) {
    return clean.slice(separatorIdx + 2);
  }
  return clean;
}

export function resolvePropertyBySlugOrId(
  slugOrId: string,
  properties: Property[]
): Property | undefined {
  const clean = decodeURIComponent(String(slugOrId || '').trim());
  if (!clean) return undefined;

  // 1. Correspondance directe par id ou slug explicite
  const direct = properties.find((p) => p.id === clean || p.slug === clean);
  if (direct) return direct;

  // 2. Correspondance via le suffixe --id
  const extractedId = extractPropertyIdFromSlug(clean);
  if (extractedId && extractedId !== clean) {
    const byExtracted = properties.find((p) => p.id === extractedId);
    if (byExtracted) return byExtracted;
  }

  // 3. Correspondance par slug généré dynamiquement
  return properties.find((p) => getPropertySlug(p) === clean);
}

type PropertyUrlInput =
  | string
  | Property
  | { id: string; slug?: string; title?: string; commune?: string; city?: string };

/**
 * Construit le chemin relatif propre : /annonces/:slug
 */
export function buildPropertyPath(
  propertyOrId: PropertyUrlInput,
  propertiesList: Property[] = []
): string {
  const prop =
    typeof propertyOrId === 'string'
      ? propertiesList.find((p) => p.id === propertyOrId) || { id: propertyOrId }
      : propertyOrId;
  return `/annonces/${encodeURIComponent(getPropertySlug(prop))}`;
}

/**
 * Construit l'URL canonique partageable et indexable : https://domaine/annonces/:slug
 */
export const buildPropertyShareUrl = (
  propertyOrId: PropertyUrlInput,
  propertiesList: Property[] = []
): string => {
  const path = buildPropertyPath(propertyOrId, propertiesList);
  if (typeof window === 'undefined') return path;
  try {
    return `${window.location.origin}${path}`;
  } catch {
    return path;
  }
};

/**
 * Analyse l'URL courante (/annonces/:slug, /annonce/:id, ?property=id, hash)
 * et retourne l'identifiant (ou le slug) du bien ciblé.
 */
export const parsePropertyIdFromUrl = (propertiesList: Property[] = []): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Chemin canonique /annonces/:slug (prioritaire)
    const pathname = window.location.pathname;
    const slugPathMatch = pathname.match(/^\/(?:annonces|annonce|property|bien)\/([^/?#]+)/i);
    if (slugPathMatch && slugPathMatch[1]) {
      const token = decodeURIComponent(slugPathMatch[1].trim());
      if (propertiesList.length > 0) {
        const matched = resolvePropertyBySlugOrId(token, propertiesList);
        if (matched) return matched.id;
      }
      return extractPropertyIdFromSlug(token);
    }

    // 2. Paramètres de requête historiques (?property=id, etc.)
    const searchParams = new URLSearchParams(window.location.search);
    const fromSearch =
      searchParams.get('property') ||
      searchParams.get('prop') ||
      searchParams.get('id') ||
      searchParams.get('annonce') ||
      searchParams.get('property_id');

    if (fromSearch && fromSearch.trim()) {
      return decodeURIComponent(fromSearch.trim());
    }

    // 3. Fragment Hash historique
    const hash = window.location.hash;
    if (hash) {
      const cleanHash = hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(cleanHash);
      const fromHash =
        hashParams.get('property') ||
        hashParams.get('prop') ||
        hashParams.get('id') ||
        hashParams.get('annonce');

      if (fromHash && fromHash.trim()) {
        return decodeURIComponent(fromHash.trim());
      }

      const hashPathMatch = cleanHash.match(/(?:annonces|property|annonce|bien)\/([^/?#]+)/i);
      if (hashPathMatch && hashPathMatch[1]) {
        return extractPropertyIdFromSlug(hashPathMatch[1]);
      }

      if (cleanHash.startsWith('prop_')) {
        return decodeURIComponent(cleanHash);
      }
    }
  } catch (err) {
    console.error('Error parsing property ID from URL:', err);
  }
  return null;
};

/**
 * Synchronise la barre d'adresse vers /annonces/:slug sans rechargement de page.
 */
export const updateBrowserUrlForProperty = (
  propertyOrId: Property | string | null,
  propertyTitle?: string,
  propertiesList: Property[] = []
): void => {
  if (typeof window === 'undefined') return;
  try {
    if (propertyOrId) {
      const propObj =
        typeof propertyOrId === 'string'
          ? propertiesList.find((p) => p.id === propertyOrId) || {
              id: propertyOrId,
              title: propertyTitle,
            }
          : propertyOrId;

      const targetPath = buildPropertyPath(propObj, propertiesList);
      const pageTitle =
        (typeof propObj !== 'string' && propObj.title) || propertyTitle
          ? `${(typeof propObj !== 'string' && propObj.title) || propertyTitle} | Kinimmo`
          : 'Annonce Immobilière | Kinimmo';

      if (window.location.pathname === targetPath && !window.location.search.includes('property=')) {
        document.title = pageTitle;
        return;
      }

      // Si on vient d'une ancienne URL ?property= ou d'un autre chemin, on passe proprement sur /annonces/:slug
      const propId = typeof propObj === 'string' ? propObj : propObj.id;
      if (window.location.search.includes('property=')) {
        window.history.replaceState({ propertyId: propId }, pageTitle, targetPath);
      } else {
        window.history.pushState({ propertyId: propId }, pageTitle, targetPath);
      }
      document.title = pageTitle;
    } else {
      const pathname = window.location.pathname;
      const url = new URL(window.location.href);
      const isListingPath = /^\/(?:annonces|annonce|property|bien)\//i.test(pathname);
      const hasLegacyParam =
        url.searchParams.has('property') ||
        url.searchParams.has('prop') ||
        url.searchParams.has('id') ||
        url.searchParams.has('annonce') ||
        url.searchParams.has('property_id');

      if (isListingPath || hasLegacyParam) {
        url.searchParams.delete('property');
        url.searchParams.delete('prop');
        url.searchParams.delete('id');
        url.searchParams.delete('annonce');
        url.searchParams.delete('property_id');
        if (isListingPath) {
          url.pathname = '/';
        }
        if (window.location.hash.includes('property') || window.location.hash.includes('prop_')) {
          url.hash = '';
        }
        const defaultTitle = 'Kinshasa Immobilier - Plateforme Immobilière & Gestion RDC';
        window.history.replaceState({}, defaultTitle, url.pathname + url.search);
        document.title = defaultTitle;
      }
    }
  } catch (err) {
    console.error('Error updating browser URL for property:', err);
  }
};

/**
 * Formate le texte de partage standard Kinimmo
 */
export const formatPropertyPitch = (
  property: Property,
  shareUrl: string,
  formattedPrice: string
): string => {
  const isSale = property.status === 'for-sale' || property.category === 'sale';
  return (
    `*${property.title.toUpperCase()}*\n` +
    `Localisation : ${property.commune || property.city}${property.quartier ? ` (${property.quartier})` : ''}\n` +
    `Prix : ${formattedPrice}${property.period === 'month' ? '/mois' : ''}\n` +
    `Surface : ${property.area} m² | ${property.bedrooms} Chambres | ${property.bathrooms} Salles de bain\n` +
    `Type : ${property.type.toUpperCase()} - ${isSale ? 'À VENDRE' : 'À LOUER'}\n` +
    `\nConsulter la fiche complète & photos HD :\n${shareUrl}\n` +
    `\nPublié sur Kinimmo RDC — Immobilier Kinshasa`
  );
};
