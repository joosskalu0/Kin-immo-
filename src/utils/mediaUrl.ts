import type React from 'react';

export const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80';

/**
 * Retourne l'URL de base de l'API (ex: "https://api.votredomaine.com/api" en prod séparée,
 * ou "/api" en local / monoserver).
 */
export function getApiBaseUrl(): string {
  const raw = ((import.meta as any).env?.VITE_API_BASE_URL as string) || '/api';
  return String(raw).trim().replace(/\/+$/, '') || '/api';
}

/**
 * Extrait l'origine HTTP/HTTPS du serveur backend API si VITE_API_BASE_URL est une URL absolue.
 * Retourne "" si l'API est sur la même origine ("/api").
 */
export function getApiOrigin(): string {
  const apiBase = getApiBaseUrl();
  if (/^https?:\/\//i.test(apiBase)) {
    try {
      return new URL(apiBase).origin;
    } catch {
      return '';
    }
  }
  return '';
}

/**
 * Résout une URL média (photo, vidéo, avatar, logo) afin qu'un chemin relatif "/uploads/..."
 * stocké par le backend Node.js pointe automatiquement vers le sous-domaine API en production
 * (ex: "https://api.votredomaine.com/uploads/images/photo.jpg") au lieu de public_html/.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // URLs déjà complètes, base64 ou blob
  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Chemins relatifs générés par le backend (/uploads/... ou uploads/...)
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (normalizedPath.startsWith('/uploads/')) {
    const origin = getApiOrigin();
    return origin ? `${origin}${normalizedPath}` : normalizedPath;
  }

  return trimmed;
}

/**
 * Normalise un tableau d'images pouvant provenir de MySQL (tableau JS ou chaîne JSON).
 */
export function normalizeImageList(rawImages: unknown): string[] {
  let list: unknown[] = [];

  if (Array.isArray(rawImages)) {
    list = rawImages;
  } else if (typeof rawImages === 'string') {
    const trimmed = rawImages.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
    } else if (trimmed) {
      list = trimmed.includes(',') ? trimmed.split(',') : [trimmed];
    }
  }

  return list
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => resolveMediaUrl(item))
    .filter(Boolean);
}

/**
 * Applique la résolution des URLs médias sur un objet propriété complet.
 */
export function resolvePropertyMedia<T extends Record<string, any>>(prop: T): T {
  if (!prop || typeof prop !== 'object') return prop;

  const images = normalizeImageList(prop.images);
  const resolvedVideo = typeof prop.videoUrl === 'string' ? resolveMediaUrl(prop.videoUrl) : prop.videoUrl;
  const resolvedAvatar = typeof prop.agentAvatar === 'string' ? resolveMediaUrl(prop.agentAvatar) : prop.agentAvatar;
  const resolvedLogo = typeof prop.agencyLogo === 'string' ? resolveMediaUrl(prop.agencyLogo) : prop.agencyLogo;

  return {
    ...prop,
    images,
    ...(resolvedVideo !== undefined ? { videoUrl: resolvedVideo } : {}),
    ...(resolvedAvatar !== undefined ? { agentAvatar: resolvedAvatar } : {}),
    ...(resolvedLogo !== undefined ? { agencyLogo: resolvedLogo } : {}),
  };
}

/**
 * Gestionnaire onError réutilisable pour afficher une photo immobilière propre
 * si un fichier distant est temporairement indisponible.
 */
export function handlePropertyImageError(
  event: React.SyntheticEvent<HTMLImageElement>,
  fallbackUrl: string = FALLBACK_PROPERTY_IMAGE
): void {
  const img = event.currentTarget;
  if (!img || img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = fallbackUrl;
}
