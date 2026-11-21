/**
 * Outils Médias Kinimmo (P1 Photos, P2 Vidéos, Visite virtuelle, Plan du bien, Empreinte image)
 * Règles strictes :
 * - Photos : 3 minimum (pour publication), 5 recommandées, 20 maximum ; JPEG/PNG/WebP ; 10 Mo max
 * - Compression côté navigateur avant envoi
 * - Vidéos : 60s max, 100 Mo max
 * - Visite virtuelle : liste blanche de domaines autorisés
 * - Empreinte perceptuelle dHash 64-bit pour détection de doublons inter-annonces
 */

export const MIN_PROPERTY_PHOTOS = 3;
export const RECOMMENDED_PROPERTY_PHOTOS = 5;
export const MAX_PROPERTY_PHOTOS = 20;
export const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024; // 10 Mo
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;

export const MAX_VIDEO_DURATION_SECONDS = 60;
export const MAX_VIDEO_FILE_BYTES = 100 * 1024 * 1024; // 100 Mo
export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'] as const;

export const DEFAULT_VIRTUAL_TOUR_DOMAINS = [
  'my.matterport.com',
  'matterport.com',
  'kuula.co',
  'www.kuula.co',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'vimeo.com',
  'player.vimeo.com',
];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface VideoValidationResult {
  valid: boolean;
  duration?: number;
  error?: string;
}

export interface CompressedImageResult {
  blob: Blob;
  file: File;
  mimeType: string;
  originalBytes: number;
  compressedBytes: number;
  width: number;
  height: number;
}

export function formatBytesCompact(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 o';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

export function validateImageFile(file: File): ImageValidationResult {
  const mime = String(file.type || '').toLowerCase();
  const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  const isAllowedMime =
    (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime) ||
    (!mime && ['jpg', 'jpeg', 'png', 'webp'].includes(ext));

  if (!isAllowedMime) {
    return {
      valid: false,
      error: `Format non autorisé (${file.name}). Formats acceptés : JPEG, PNG ou WebP uniquement.`,
    };
  }

  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return {
      valid: false,
      error: `Image trop volumineuse (${formatBytesCompact(file.size)}). Taille maximale : 10 Mo par photo.`,
    };
  }

  return { valid: true };
}

export function getVideoDurationSeconds(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Délai dépassé lors de la lecture de la durée vidéo.'));
    }, 10000);

    video.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const dur = Number(video.duration);
      cleanup();
      if (!Number.isFinite(dur) || dur <= 0) {
        reject(new Error('Impossible de déterminer la durée de cette vidéo.'));
      } else {
        resolve(Math.round(dur * 10) / 10);
      }
    };

    video.onerror = () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('Format vidéo illisible dans le navigateur (utilisez MP4, MOV ou WebM).'));
    };

    video.src = objectUrl;
  });
}

export async function validateVideoFileAndDuration(file: File): Promise<VideoValidationResult> {
  const mime = String(file.type || '').toLowerCase();
  const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  const isAllowedMime =
    mime.startsWith('video/') &&
    ((ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mime) || ['mp4', 'mov', 'webm', 'm4v'].includes(ext));

  if (!isAllowedMime && !['mp4', 'mov', 'webm', 'm4v'].includes(ext)) {
    return {
      valid: false,
      error: `Format vidéo non supporté (${file.name}). Formats acceptés : MP4, MOV ou WebM.`,
    };
  }

  if (file.size > MAX_VIDEO_FILE_BYTES) {
    return {
      valid: false,
      error: `Vidéo trop lourde (${formatBytesCompact(file.size)}). Taille maximale autorisée : 100 Mo.`,
    };
  }

  try {
    const duration = await getVideoDurationSeconds(file);
    if (duration > MAX_VIDEO_DURATION_SECONDS) {
      return {
        valid: false,
        duration,
        error: `Vidéo trop longue (${Math.round(duration)}s). La durée maximale est de ${MAX_VIDEO_DURATION_SECONDS} secondes.`,
      };
    }
    return { valid: true, duration };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Impossible de valider les métadonnées de la vidéo.',
    };
  }
}

function loadBitmapOrImage(src: Blob | string): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    const isString = typeof src === 'string';
    const url = isString ? src : URL.createObjectURL(src);
    const img = new Image();
    if (isString && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }

    const cleanup = () => {
      if (!isString) {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      }
    };

    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 1200,
        height: img.naturalHeight || img.height || 900,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
        cleanup,
      });
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('Impossible de décoder cette image.'));
    };
    img.src = url;
  });
}

/**
 * Compresse une image côté navigateur avant l'envoi vers Cloudinary
 * Préfère WebP si supporté (ou JPEG si WebP non supporté / image opaque), conserve PNG si petit et transparent.
 */
export async function compressImageFileToBlob(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<CompressedImageResult> {
  const loaded = await loadBitmapOrImage(file);
  try {
    let targetW = loaded.width;
    let targetH = loaded.height;
    if (targetW > maxDimension || targetH > maxDimension) {
      const ratio = Math.min(maxDimension / targetW, maxDimension / targetH);
      targetW = Math.max(1, Math.round(targetW * ratio));
      targetH = Math.max(1, Math.round(targetH * ratio));
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        blob: file,
        file,
        mimeType: file.type || 'image/jpeg',
        originalBytes: file.size,
        compressedBytes: file.size,
        width: loaded.width,
        height: loaded.height,
      };
    }

    ctx.drawImage(
      (() => {
        const temp = document.createElement('canvas');
        temp.width = loaded.width;
        temp.height = loaded.height;
        const tCtx = temp.getContext('2d');
        if (tCtx) loaded.draw(tCtx, loaded.width, loaded.height);
        return temp;
      })(),
      0,
      0,
      targetW,
      targetH
    );

    const outputMime =
      file.type === 'image/png' && file.size < 450 * 1024
        ? 'image/png'
        : 'image/webp';

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (b) => {
          if (b) return resolve(b);
          canvas.toBlob((fallback) => resolve(fallback), 'image/jpeg', quality);
        },
        outputMime,
        quality
      );
    });

    if (!blob || (blob.size >= file.size && loaded.width <= maxDimension && loaded.height <= maxDimension)) {
      return {
        blob: file,
        file,
        mimeType: file.type || outputMime,
        originalBytes: file.size,
        compressedBytes: file.size,
        width: targetW,
        height: targetH,
      };
    }

    const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('png') ? 'png' : 'jpg';
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo';
    const compressedFile = new File([blob], `${baseName}.${ext}`, {
      type: blob.type,
      lastModified: Date.now(),
    });

    return {
      blob,
      file: compressedFile,
      mimeType: blob.type,
      originalBytes: file.size,
      compressedBytes: blob.size,
      width: targetW,
      height: targetH,
    };
  } finally {
    loaded.cleanup();
  }
}

/**
 * Calcule une empreinte perceptuelle dHash 64-bit (16 caractères hexadécimaux)
 * Robuste au redimensionnement et à la recompression JPEG/WebP.
 */
export async function computeImageDHash(input: File | Blob | string): Promise<string | null> {
  try {
    const loaded = await loadBitmapOrImage(input);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 9;
      canvas.height = 8;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      loaded.draw(ctx, 9, 8);
      const imgData = ctx.getImageData(0, 0, 9, 8).data;

      const gray: number[] = [];
      for (let i = 0; i < imgData.length; i += 4) {
        gray.push(0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2]);
      }

      let bits = '';
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          const left = gray[y * 9 + x];
          const right = gray[y * 9 + x + 1];
          bits += left > right ? '1' : '0';
        }
      }

      let hex = '';
      for (let i = 0; i < 64; i += 4) {
        hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
      }
      return hex;
    } finally {
      loaded.cleanup();
    }
  } catch {
    return null;
  }
}

export function dHashHammingDistance(hashA: string, hashB: string): number {
  if (!hashA || !hashB || hashA.length !== 16 || hashB.length !== 16) return 64;
  let dist = 0;
  for (let i = 0; i < 16; i++) {
    const a = parseInt(hashA[i], 16);
    const b = parseInt(hashB[i], 16);
    if (Number.isNaN(a) || Number.isNaN(b)) return 64;
    let xor = a ^ b;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

export function normalizeAllowedDomains(domains?: string[] | string | null): string[] {
  let raw: string[] = [];
  if (Array.isArray(domains)) {
    raw = domains;
  } else if (typeof domains === 'string') {
    const trimmed = domains.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) raw = parsed;
      } catch {}
    } else {
      raw = trimmed.split(/[\n,;]+/);
    }
  }

  const cleaned = raw
    .map((d) =>
      String(d || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .replace(/:\d+$/, '')
    )
    .filter(Boolean);

  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : [...DEFAULT_VIRTUAL_TOUR_DOMAINS];
}

export function validateVirtualTourUrl(
  rawUrl: string,
  allowedDomains?: string[] | string | null
): { valid: boolean; normalizedUrl?: string; hostname?: string; error?: string } {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { valid: true, normalizedUrl: '' };

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      error: 'URL de visite virtuelle invalide. Exemple : https://my.matterport.com/show/?m=...',
    };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return {
      valid: false,
      error: 'Seuls les liens HTTPS/HTTP sont autorisés pour les visites virtuelles.',
    };
  }

  const hostname = parsed.hostname.toLowerCase();
  const whitelist = normalizeAllowedDomains(allowedDomains);
  const isAllowed = whitelist.some((domain) => {
    const cleanDomain = domain.replace(/^www\./, '');
    return (
      hostname === domain ||
      hostname === cleanDomain ||
      hostname.endsWith(`.${cleanDomain}`)
    );
  });

  if (!isAllowed) {
    return {
      valid: false,
      hostname,
      error: `Domaine "${hostname}" non autorisé. Domaines acceptés : ${whitelist.slice(0, 6).join(', ')}.`,
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname,
  };
}
