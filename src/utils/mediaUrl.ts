import type React from 'react';

export const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&auto=format&fit=crop&q=80';

const RESOLVED_API_STORAGE_KEY = 'kinimmo_resolved_api_base';

function isLocalhostHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '0.0.0.0' ||
    h.endsWith('.local') ||
    h.endsWith('.run.app')
  );
}

function cleanBaseUrl(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().replace(/\/+$/, '');
}

export function setResolvedApiBaseUrl(baseUrl: string): void {
  const clean = cleanBaseUrl(baseUrl);
  if (!clean) return;
  try {
    if (typeof window !== 'undefined') {
      (window as any).__KINIMMO_RESOLVED_API_BASE__ = clean;
      window.sessionStorage?.setItem(RESOLVED_API_STORAGE_KEY, clean);
    }
  } catch {}
}

/**
 * Retourne l'URL de base principale de l'API.
 * Priorité :
 * 1) window.__KINIMMO_API_BASE_URL__ (public/kinimmo-config.js)
 * 2) URL résolue avec succès durant la session
 * 3) VITE_API_BASE_URL (ignorée si elle pointe vers localhost depuis un vrai domaine HTTPS)
 * 4) "/api"
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const runtimeUrl = cleanBaseUrl((window as any).__KINIMMO_API_BASE_URL__);
    if (runtimeUrl) return runtimeUrl;

    const sessionResolved = cleanBaseUrl(
      (window as any).__KINIMMO_RESOLVED_API_BASE__ ||
        window.sessionStorage?.getItem(RESOLVED_API_STORAGE_KEY)
    );
    if (sessionResolved) return sessionResolved;
  }

  const envUrl = cleanBaseUrl((import.meta as any).env?.VITE_API_BASE_URL as string);
  if (envUrl) {
    // Éviter qu'un build accidentel avec localhost:5000 casse un site réel (ex: kinimmo.com)
    const isEnvLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(envUrl);
    if (
      !isEnvLocal ||
      (typeof window !== 'undefined' && isLocalhostHostname(window.location.hostname))
    ) {
      return envUrl;
    }
  }

  return '/api';
}

/**
 * Liste ordonnée des bases API à tenter automatiquement en cas d'erreur réseau ("Load failed")
 * ou de réponse HTML Apache 404 sur un hébergement séparé (ex: kinimmo.com -> api.kinimmo.com/api).
 */
export function getCandidateApiBaseUrls(): string[] {
  const candidates: string[] = [];
  const pushUnique = (val?: string) => {
    const clean = cleanBaseUrl(val);
    if (clean && !candidates.includes(clean)) {
      candidates.push(clean);
    }
  };

  pushUnique(getApiBaseUrl());
  pushUnique('/api');

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const protocol = window.location.protocol === 'http:' ? 'http:' : 'https:';

    if (host && !isLocalhostHostname(host)) {
      const rootDomain = host.replace(/^www\./, '');
      if (!rootDomain.startsWith('api.')) {
        pushUnique(`${protocol}//api.${rootDomain}/api`);
      }
      pushUnique(`${protocol}//${host}/api`);
    }
  }

  return candidates;
}

/**
 * Extrait l'origine HTTP/HTTPS du serveur backend API si la base résolue est une URL absolue.
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
 * pointe automatiquement vers le sous-domaine API en production.
 * Les URLs Cloudinary (https://res.cloudinary.com/...) sont préservées telles quelles.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

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
  const resolvedFloorPlan = typeof prop.floorPlanUrl === 'string' ? resolveMediaUrl(prop.floorPlanUrl) : prop.floorPlanUrl;
  const resolvedAvatar = typeof prop.agentAvatar === 'string' ? resolveMediaUrl(prop.agentAvatar) : prop.agentAvatar;
  const resolvedLogo = typeof prop.agencyLogo === 'string' ? resolveMediaUrl(prop.agencyLogo) : prop.agencyLogo;
  const imagesMeta = Array.isArray(prop.imagesMeta)
    ? prop.imagesMeta.map((m: any) =>
        m && typeof m === 'object'
          ? { ...m, url: typeof m.url === 'string' ? resolveMediaUrl(m.url) : m.url }
          : m
      )
    : prop.imagesMeta;

  return {
    ...prop,
    images,
    ...(imagesMeta !== undefined ? { imagesMeta } : {}),
    ...(resolvedVideo !== undefined ? { videoUrl: resolvedVideo } : {}),
    ...(resolvedFloorPlan !== undefined ? { floorPlanUrl: resolvedFloorPlan } : {}),
    ...(resolvedAvatar !== undefined ? { agentAvatar: resolvedAvatar } : {}),
    ...(resolvedLogo !== undefined ? { agencyLogo: resolvedLogo } : {}),
  };
}

export function isCloudinaryImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return (url.includes('res.cloudinary.com') || url.includes('cloudinary.com')) && url.includes('/image/upload/');
}

export function extractCloudinaryPublicIdFromUrl(url?: string | null): string | undefined {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return undefined;
  try {
    const clean = url.split('?')[0];
    const marker = '/upload/';
    const idx = clean.indexOf(marker);
    if (idx === -1) return undefined;
    let rest = clean.slice(idx + marker.length);
    // Strip optional transformations before version (/v123456/)
    const versionMatch = rest.match(/(?:^|\/)v\d+\/(.+)$/);
    if (versionMatch) {
      rest = versionMatch[1];
    } else {
      const parts = rest.split('/');
      if (parts.length > 1 && (parts[0].includes(',') || parts[0].includes('_'))) {
        rest = parts.slice(1).join('/');
      }
    }
    return rest.replace(/\.[a-z0-9]+$/i, '') || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Retourne une URL image optimisée (formats modernes f_auto -> AVIF/WebP, q_auto, dpr_auto, redimensionnement).
 */
export function getOptimizedImageUrl(
  url?: string | null,
  options?: { width?: number; height?: number; crop?: 'limit' | 'fill' | 'fit' }
): string {
  const resolved = resolveMediaUrl(url);
  if (!resolved) return '';
  const width = options?.width || 1200;
  const crop = options?.crop || 'limit';

  if (isCloudinaryImageUrl(resolved)) {
    const heightPart = options?.height ? `,h_${options.height}` : '';
    const transform = `f_auto,q_auto:good,dpr_auto,c_${crop},w_${width}${heightPart}`;
    // Si une transformation f_auto ou q_auto est déjà injectée, remplacer proprement ou garder
    if (/\/image\/upload\/[^/]*(f_auto|q_auto|w_\d+)/.test(resolved)) {
      return resolved.replace(/\/image\/upload\/[^/]+\//, `/image/upload/${transform}/`);
    }
    return resolved.replace('/image/upload/', `/image/upload/${transform}/`);
  }

  if (resolved.includes('images.unsplash.com') && !resolved.includes('w=')) {
    const sep = resolved.includes('?') ? '&' : '?';
    return `${resolved}${sep}w=${width}&auto=format&fit=crop&q=80`;
  }

  return resolved;
}

export function getResponsiveImageSrcSet(
  url?: string | null,
  widths: number[] = [400, 800, 1200, 1600]
): string | undefined {
  const resolved = resolveMediaUrl(url);
  if (!resolved || !isCloudinaryImageUrl(resolved)) return undefined;
  return widths
    .map((w) => `${getOptimizedImageUrl(resolved, { width: w })} ${w}w`)
    .join(', ');
}

export function getResponsiveImgProps(
  url?: string | null,
  alt = '',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  defaultWidth = 1000
): {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  loading: 'lazy';
  decoding: 'async';
  referrerPolicy: 'no-referrer';
} {
  const src = getOptimizedImageUrl(url, { width: defaultWidth }) || FALLBACK_PROPERTY_IMAGE;
  const srcSet = getResponsiveImageSrcSet(url);
  return {
    src,
    ...(srcSet ? { srcSet, sizes } : {}),
    alt,
    loading: 'lazy',
    decoding: 'async',
    referrerPolicy: 'no-referrer',
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
  img.srcset = '';
  img.src = fallbackUrl;
}
