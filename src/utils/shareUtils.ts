import { Property } from '../types';

/**
 * Builds a clean, canonical share URL for a property that works reliably across
 * WhatsApp, Facebook, Twitter, Telegram, SMS, Email, QR codes, and web browsers.
 */
export const buildPropertyShareUrl = (propertyId: string): string => {
  if (typeof window === 'undefined') return '';
  try {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const cleanPath = pathname.endsWith('/') ? pathname : `${pathname}/`;
    return `${origin}${cleanPath}?property=${encodeURIComponent(propertyId)}`;
  } catch (e) {
    return `/?property=${encodeURIComponent(propertyId)}`;
  }
};

/**
 * Robustly parses property ID from the current browser location.
 * Supports:
 * - Query params: ?property=id, ?prop=id, ?id=id, ?annonce=id, ?property_id=id
 * - Hash routing: #property=id, #/property/id, #prop_123
 * - Path pattern: /property/id, /annonce/id
 */
export const parsePropertyIdFromUrl = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    // 1. Search Query Parameters
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

    // 2. Hash Fragment
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

      const pathMatch = cleanHash.match(/(?:property|annonce|bien)\/([a-zA-Z0-9_-]+)/i);
      if (pathMatch && pathMatch[1]) {
        return decodeURIComponent(pathMatch[1]);
      }

      if (cleanHash.startsWith('prop_')) {
        return decodeURIComponent(cleanHash);
      }
    }

    // 3. Path Parameters (fallback)
    const pathname = window.location.pathname;
    const pathMatch = pathname.match(/\/(?:property|annonce|bien)\/([a-zA-Z0-9_-]+)/i);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
  } catch (err) {
    console.error('Error parsing property ID from URL:', err);
  }
  return null;
};

/**
 * Synchronizes the browser address bar with the currently viewed property
 * without reloading the page, enabling back-button navigation and URL copying.
 */
export const updateBrowserUrlForProperty = (
  propertyId: string | null,
  propertyTitle?: string
): void => {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);

    if (propertyId) {
      // Check if URL already has this property to avoid duplicate history states
      const currentParam = url.searchParams.get('property');
      if (currentParam === propertyId) {
        return;
      }

      url.searchParams.set('property', propertyId);
      url.searchParams.delete('prop');
      url.searchParams.delete('id');
      url.searchParams.delete('annonce');
      url.searchParams.delete('property_id');

      const pageTitle = propertyTitle
        ? `${propertyTitle} | Kinshasa Immobilier`
        : 'Annonce Immobilière | Kinshasa Immobilier';

      window.history.pushState({ propertyId }, pageTitle, url.toString());
      document.title = pageTitle;
    } else {
      // If closing modal and URL contains property param
      if (
        url.searchParams.has('property') ||
        url.searchParams.has('prop') ||
        url.searchParams.has('id') ||
        url.searchParams.has('annonce') ||
        url.searchParams.has('property_id')
      ) {
        url.searchParams.delete('property');
        url.searchParams.delete('prop');
        url.searchParams.delete('id');
        url.searchParams.delete('annonce');
        url.searchParams.delete('property_id');

        if (window.location.hash.includes('property') || window.location.hash.includes('prop_')) {
          url.hash = '';
        }

        const defaultTitle = 'Kinshasa Immobilier - Plateforme Immobilière & Gestion RDC';
        window.history.replaceState({}, defaultTitle, url.toString());
        document.title = defaultTitle;
      }
    }
  } catch (err) {
    console.error('Error updating browser URL for property:', err);
  }
};

/**
 * Formats standard professional pitch text for social sharing
 */
export const formatPropertyPitch = (
  property: Property,
  shareUrl: string,
  formattedPrice: string
): string => {
  return (
    `🏡 *${property.title.toUpperCase()}*\n` +
    `📍 Localisation : ${property.commune || property.city} (${property.quartier || 'Kinshasa'})\n` +
    `💰 Prix : ${formattedPrice}${property.period === 'month' ? '/mois' : ''}\n` +
    `📐 Surface : ${property.area} m² | 🛏️ ${property.bedrooms} Chambres | 🚿 ${property.bathrooms} Salles de bain\n` +
    `✨ Type : ${property.type.toUpperCase()} - ${property.category === 'sale' ? 'À VENDRE' : 'À LOUER'}\n` +
    `\n🔗 Consulter la fiche complète & photos HD :\n${shareUrl}\n` +
    `\n🏢 Publié via ImmoCraft RDC - Plateforme Immobilière`
  );
};
