import { Property } from '../types';
import { FALLBACK_PROPERTY_IMAGE, resolveMediaUrl } from './mediaUrl';

export const RECENT_PAGES_STORAGE_KEY = 'kinimmo_recent_pages_v1';
export const RECENT_PROPERTIES_STORAGE_KEY = 'kinimmo_recent_properties_v1';
export const WISHLIST_STORAGE_KEY = 'kinimmo_wishlist_v1';

export interface RecentPageEntry {
  path: string;
  title: string;
  visitedAt: string;
}

export interface RecentPropertySnapshot {
  id: string;
  title: string;
  price: number;
  currency: string;
  period?: string;
  status: string;
  commune: string;
  quartier?: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  image: string;
  contactPhone?: string;
  agencyName?: string;
  viewedAt: string;
}

const MAX_RECENT_PAGES = 8;
const MAX_RECENT_PROPERTIES = 10;

const EXCLUDED_RECENT_PREFIXES = ['/admin', '/connexion', '/inscription', '/confirmer-email', '/mot-de-passe-oublie', '/reinitialiser-mot-de-passe', '/hors-ligne'];

function readJsonArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, items: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {}
}

export function getRecentPages(): RecentPageEntry[] {
  return readJsonArray<RecentPageEntry>(RECENT_PAGES_STORAGE_KEY);
}

export function recordRecentPage(path: string, title: string): RecentPageEntry[] {
  const cleanPath = (path || '/').trim() || '/';
  if (EXCLUDED_RECENT_PREFIXES.some((prefix) => cleanPath.startsWith(prefix))) {
    return getRecentPages();
  }
  const cleanTitle = (title || 'Kinimmo').replace(/\s*\|\s*Kinimmo.*$/i, '').trim() || 'Kinimmo';
  const existing = getRecentPages().filter((item) => item && item.path !== cleanPath);
  const next: RecentPageEntry[] = [
    { path: cleanPath, title: cleanTitle, visitedAt: new Date().toISOString() },
    ...existing,
  ].slice(0, MAX_RECENT_PAGES);
  writeJsonArray(RECENT_PAGES_STORAGE_KEY, next);
  return next;
}

export function getRecentProperties(): RecentPropertySnapshot[] {
  return readJsonArray<RecentPropertySnapshot>(RECENT_PROPERTIES_STORAGE_KEY);
}

export function recordRecentProperty(property: Property): RecentPropertySnapshot[] {
  if (!property || !property.id) return getRecentProperties();
  const cover =
    (Array.isArray(property.images) && property.images[0]
      ? resolveMediaUrl(property.images[0])
      : '') || FALLBACK_PROPERTY_IMAGE;

  const snapshot: RecentPropertySnapshot = {
    id: property.id,
    title: property.title || 'Bien immobilier à Kinshasa',
    price: Number(property.price || 0),
    currency: property.currency || 'USD',
    period: property.period,
    status: property.status || 'for-sale',
    commune: property.commune || property.city || 'Kinshasa',
    quartier: property.quartier,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    image: cover,
    contactPhone: property.contactPhone,
    agencyName: property.agencyName,
    viewedAt: new Date().toISOString(),
  };

  const existing = getRecentProperties().filter((item) => item && item.id !== property.id);
  const next = [snapshot, ...existing].slice(0, MAX_RECENT_PROPERTIES);
  writeJsonArray(RECENT_PROPERTIES_STORAGE_KEY, next);
  return next;
}

export function readStoredWishlist(): string[] {
  return readJsonArray<string>(WISHLIST_STORAGE_KEY).filter((id) => typeof id === 'string' && id.trim().length > 0);
}

export function writeStoredWishlist(ids: string[]): void {
  writeJsonArray(WISHLIST_STORAGE_KEY, Array.from(new Set(ids)));
}
