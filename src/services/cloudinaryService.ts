/**
 * Service Client Cloudinary pour KinImmo
 * Gère le téléversement direct (navigateur -> Cloudinary via signature serveur) des photos et vidéos,
 * la progression en temps réel, le basculement multi-API (Hostinger séparé),
 * l'optimisation mobile (q_auto, f_auto) et l'extraction automatique de miniatures.
 */

import { getStoredToken } from './mysqlApi';
import { getCandidateApiBaseUrls, setResolvedApiBaseUrl } from '../utils/mediaUrl';

export interface CloudinaryConfig {
  cloudName: string;
  apiKey?: string;
  uploadPreset?: string;
  hasApiSecret?: boolean;
  isConfigured: boolean;
  autoOptimize: boolean;
}

export interface CloudinaryUploadResult {
  success: boolean;
  url: string;
  secure_url: string;
  public_id: string;
  thumbnail_url: string;
  duration?: number;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  message?: string;
}

interface SignedUploadPayload {
  mode: 'signed' | 'unsigned';
  cloudName: string;
  apiKey?: string;
  timestamp?: number;
  signature?: string;
  uploadPreset?: string;
  folder: string;
  resourceType: 'image' | 'video';
  uploadUrl: string;
}

function buildAuthHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function cloudinaryApiFetch<T = any>(
  path: string,
  options?: RequestInit
): Promise<{ data: T; baseUrl: string }> {
  const candidates = getCandidateApiBaseUrls();
  let lastError: any = null;

  for (const baseUrl of candidates) {
    try {
      const res = await fetch(`${baseUrl}${path}`, options);
      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      // Si Apache/Hostinger renvoie index.html (404 SPA fallback), tenter le sous-domaine API suivant
      if (contentType.includes('text/html')) {
        lastError = new Error(`Réponse HTML reçue sur ${baseUrl}${path}`);
        continue;
      }

      const rawText = await res.text();
      let parsed: any = {};
      if (rawText) {
        try {
          parsed = JSON.parse(rawText);
        } catch {
          if (rawText.trim().startsWith('<')) {
            lastError = new Error(`Réponse HTML inattendue sur ${baseUrl}${path}`);
            continue;
          }
          throw new Error(`Réponse serveur invalide (${res.status}).`);
        }
      }

      if (!res.ok) {
        const msg = parsed?.message || parsed?.error || `Erreur HTTP ${res.status}`;
        const err = new Error(msg);
        (err as any).status = res.status;
        throw err;
      }

      setResolvedApiBaseUrl(baseUrl);
      return { data: parsed as T, baseUrl };
    } catch (err: any) {
      const isNetworkOrHtml =
        err?.name === 'TypeError' ||
        /load failed|failed to fetch|networkerror|réponse html/i.test(String(err?.message || ''));

      lastError = err;
      if (!isNetworkOrHtml && typeof err?.status === 'number' && err.status !== 404 && err.status !== 405) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Serveur API Kinimmo injoignable pour Cloudinary.');
}

function buildNormalizedResult(
  data: any,
  resourceType: 'image' | 'video'
): CloudinaryUploadResult {
  const secureUrl = data?.secure_url || data?.url || '';
  if (!secureUrl) {
    throw new Error('Cloudinary n’a retourné aucune URL média.');
  }

  let thumbnailUrl = data?.thumbnail_url || secureUrl;
  if (resourceType === 'video' && !data?.thumbnail_url) {
    thumbnailUrl = getCloudinaryAutoThumbnail(secureUrl, 0);
  }

  return {
    success: true,
    url: data?.url || secureUrl,
    secure_url: secureUrl,
    public_id: data?.public_id || '',
    thumbnail_url: thumbnailUrl,
    duration: data?.duration,
    format: data?.format,
    bytes: data?.bytes,
    width: data?.width,
    height: data?.height,
  };
}

function xhrUploadToCloudinaryDirect(
  payload: SignedUploadPayload,
  fileOrDataUrl: File | string,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append('file', fileOrDataUrl);

    if (payload.mode === 'signed' && payload.apiKey && payload.signature && payload.timestamp) {
      formData.append('api_key', payload.apiKey);
      formData.append('timestamp', String(payload.timestamp));
      formData.append('signature', payload.signature);
      if (payload.folder) formData.append('folder', payload.folder);
    } else if (payload.uploadPreset) {
      formData.append('upload_preset', payload.uploadPreset);
      if (payload.folder) formData.append('folder', payload.folder);
    } else {
      reject(new Error('Paramètres de signature Cloudinary incomplets.'));
      return;
    }

    xhr.open('POST', payload.uploadUrl, true);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && (response.secure_url || response.url)) {
          resolve(buildNormalizedResult(response, payload.resourceType));
        } else {
          reject(
            new Error(
              response?.error?.message ||
                response?.message ||
                `Erreur Cloudinary HTTP ${xhr.status}`
            )
          );
        }
      } catch {
        reject(new Error(`Réponse Cloudinary invalide (${xhr.status}).`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Erreur réseau lors de l’envoi direct vers Cloudinary.'));
    };

    xhr.send(formData);
  });
}

function xhrUploadViaBackend(
  baseUrl: string,
  endpointPath: string,
  fieldName: 'image' | 'video',
  file: File,
  resourceType: 'image' | 'video',
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append(fieldName, file);

    xhr.open('POST', `${baseUrl}${endpointPath}`, true);
    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && response.success && (response.secure_url || response.url)) {
          resolve(buildNormalizedResult(response, resourceType));
        } else {
          reject(
            new Error(
              response.error || response.message || `Erreur téléversement HTTP ${xhr.status}`
            )
          );
        }
      } catch {
        reject(
          new Error(
            `Réponse serveur invalide lors du téléversement (${xhr.status}).`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(new Error('Erreur réseau lors de l’envoi du fichier à l’API Kinimmo.'));
    };

    xhr.send(formData);
  });
}

export interface CloudinaryUploadValidationMeta {
  purpose?: 'property_photo' | 'floor_plan' | 'property_video' | 'avatar' | 'general';
  mimeType?: string;
  fileSize?: number;
  fileCount?: number;
  currentPhotoCount?: number;
  duration?: number;
}

export interface FingerprintMatch {
  propertyId: string;
  propertyTitle: string;
  agentId?: string;
  imageUrl?: string;
  distance: number;
}

async function getUploadPayload(
  resourceType: 'image' | 'video',
  folder: string,
  meta?: CloudinaryUploadValidationMeta
): Promise<SignedUploadPayload | null> {
  // 1) Demander une signature serveur sécurisée (contrôle quotas, MIME, taille, durée + signature SHA-1)
  try {
    const { data } = await cloudinaryApiFetch<SignedUploadPayload & { success?: boolean }>(
      '/cloudinary/sign',
      {
        method: 'POST',
        headers: buildAuthHeaders(true),
        body: JSON.stringify({
          resourceType,
          folder,
          ...(meta || {}),
        }),
      }
    );
    if (data?.cloudName && data?.uploadUrl) {
      return {
        mode: data.mode || (data.signature ? 'signed' : 'unsigned'),
        cloudName: data.cloudName,
        apiKey: data.apiKey,
        timestamp: data.timestamp,
        signature: data.signature,
        uploadPreset: data.uploadPreset,
        folder: data.folder || folder,
        resourceType,
        uploadUrl: data.uploadUrl,
      };
    }
  } catch (err: any) {
    // IMPORTANT: Ne jamais contourner un refus de validation/quota/authentification du serveur (400, 401, 403, 413, 422)
    if (typeof err?.status === 'number' && [400, 401, 403, 413, 422].includes(err.status)) {
      throw err;
    }
    console.warn('Signature Cloudinary serveur indisponible:', err);
  }

  // 2) Fallback uniquement si l'endpoint /cloudinary/sign est absent (404)
  try {
    const cfg = await fetchCloudinaryConfig();
    if (cfg.cloudName && cfg.uploadPreset) {
      return {
        mode: 'unsigned',
        cloudName: cfg.cloudName,
        uploadPreset: cfg.uploadPreset,
        folder,
        resourceType,
        uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/upload`,
      };
    }
  } catch {}

  return null;
}

/**
 * Récupère l'état actuel de la configuration Cloudinary
 */
export async function fetchCloudinaryConfig(): Promise<CloudinaryConfig> {
  try {
    const { data } = await cloudinaryApiFetch<{ config: CloudinaryConfig }>('/cloudinary/config');
    return data.config;
  } catch (err) {
    console.warn('Erreur chargement configuration Cloudinary:', err);
    return {
      cloudName: '',
      isConfigured: false,
      autoOptimize: true,
    };
  }
}

/**
 * Enregistre une nouvelle configuration Cloudinary
 */
export async function saveCloudinaryConfig(config: {
  cloudName: string;
  apiKey?: string;
  apiSecret?: string;
  uploadPreset?: string;
  autoOptimize?: boolean;
}): Promise<{ success: boolean; message: string; config?: CloudinaryConfig }> {
  const { data } = await cloudinaryApiFetch('/cloudinary/config', {
    method: 'POST',
    headers: buildAuthHeaders(true),
    body: JSON.stringify(config),
  });
  return data;
}

/**
 * Teste la connectivité avec le compte Cloudinary
 */
export async function testCloudinaryConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const { data } = await cloudinaryApiFetch('/cloudinary/test', {
      method: 'POST',
      headers: buildAuthHeaders(true),
    });
    return data;
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Échec de connexion au serveur Cloudinary',
    };
  }
}

/**
 * Supprime un média stocké sur Cloudinary via l'API backend sécurisée
 */
export async function destroyCloudinaryMedia(params: {
  publicId?: string;
  url?: string;
  resourceType?: 'image' | 'video';
  propertyId?: string;
}): Promise<{ success: boolean; message?: string }> {
  if (!params.publicId && !params.url) return { success: true };
  try {
    const { data } = await cloudinaryApiFetch<{ success: boolean; message?: string }>(
      '/cloudinary/destroy',
      {
        method: 'POST',
        headers: buildAuthHeaders(true),
        body: JSON.stringify(params),
      }
    );
    return data;
  } catch (err: any) {
    console.warn('Suppression Cloudinary ignorée ou échouée:', err?.message || err);
    return { success: false, message: err?.message };
  }
}

/**
 * Vérifie si des empreintes dHash ou URLs d'images existent déjà sur d'autres annonces
 */
export async function checkImageFingerprints(params: {
  fingerprints: string[];
  imageUrls?: string[];
  excludePropertyId?: string;
}): Promise<{ duplicateDetected: boolean; matches: FingerprintMatch[] }> {
  try {
    const { data } = await cloudinaryApiFetch<{
      success?: boolean;
      duplicateDetected?: boolean;
      matches?: FingerprintMatch[];
    }>('/media/check-fingerprint', {
      method: 'POST',
      headers: buildAuthHeaders(true),
      body: JSON.stringify(params),
    });
    return {
      duplicateDetected: Boolean(data?.duplicateDetected || (data?.matches && data.matches.length > 0)),
      matches: Array.isArray(data?.matches) ? data.matches : [],
    };
  } catch (err) {
    console.warn('Vérification empreinte image indisponible:', err);
    return { duplicateDetected: false, matches: [] };
  }
}

/**
 * Téléverse une photo (File ou DataURL compressée) exclusivement vers Cloudinary.
 * Demande une signature et validation serveur (/cloudinary/sign), puis upload direct vers Cloudinary.
 */
export async function uploadImageToCloudinary(
  input: File | string,
  onProgress?: (percent: number) => void,
  folder = 'kinimmo/property_images',
  meta?: CloudinaryUploadValidationMeta
): Promise<CloudinaryUploadResult> {
  let lastError: any = null;
  const inferredMeta: CloudinaryUploadValidationMeta = {
    purpose: folder.includes('floor_plan') ? 'floor_plan' : 'property_photo',
    ...(typeof input !== 'string' ? { mimeType: input.type, fileSize: input.size } : {}),
    ...(meta || {}),
  };

  // 1) Signature + Validation serveur, puis upload direct vers api.cloudinary.com
  const payload = await getUploadPayload('image', folder, inferredMeta);
  if (payload) {
    try {
      return await xhrUploadToCloudinaryDirect(payload, input, onProgress);
    } catch (err: any) {
      console.warn('Upload direct photo Cloudinary échoué, tentative via serveur API:', err);
      lastError = err;
    }
  }

  // 2) Fallback via backend /api/cloudinary/upload-image
  if (typeof input === 'string') {
    try {
      if (onProgress) onProgress(40);
      const { data } = await cloudinaryApiFetch<CloudinaryUploadResult>('/cloudinary/upload-image', {
        method: 'POST',
        headers: buildAuthHeaders(true),
        body: JSON.stringify({ image: input, folder, ...inferredMeta }),
      });
      if (onProgress) onProgress(100);
      return buildNormalizedResult(data, 'image');
    } catch (err: any) {
      lastError = err;
    }
  } else {
    for (const baseUrl of getCandidateApiBaseUrls()) {
      try {
        const res = await xhrUploadViaBackend(
          baseUrl,
          '/cloudinary/upload-image',
          'image',
          input,
          'image',
          onProgress
        );
        setResolvedApiBaseUrl(baseUrl);
        return res;
      } catch (err: any) {
        lastError = err;
      }
    }
  }

  throw new Error(
    lastError?.message ||
      'Impossible de téléverser la photo sur Cloudinary. Vérifiez la connexion et la configuration Cloudinary.'
  );
}

/**
 * Téléverse un fichier vidéo vers Cloudinary avec suivi de progression (0 à 100%).
 * Contrôle la durée (<= 60s), la taille (<= 100 Mo) et le quota côté serveur avant envoi direct.
 */
export async function uploadVideoWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
  folder = 'kinimmo/property_videos',
  meta?: CloudinaryUploadValidationMeta
): Promise<CloudinaryUploadResult> {
  let lastError: any = null;
  const inferredMeta: CloudinaryUploadValidationMeta = {
    purpose: 'property_video',
    mimeType: file.type,
    fileSize: file.size,
    ...(meta || {}),
  };

  // 1) Signature + Validation serveur, puis upload direct navigateur -> api.cloudinary.com
  const payload = await getUploadPayload('video', folder, inferredMeta);
  if (payload) {
    try {
      return await xhrUploadToCloudinaryDirect(payload, file, onProgress);
    } catch (err: any) {
      console.warn('Upload direct vidéo Cloudinary échoué, tentative via serveur API:', err);
      lastError = err;
    }
  }

  // 2) Fallback via backend /api/cloudinary/upload
  for (const baseUrl of getCandidateApiBaseUrls()) {
    try {
      const res = await xhrUploadViaBackend(
        baseUrl,
        '/cloudinary/upload',
        'video',
        file,
        'video',
        onProgress
      );
      setResolvedApiBaseUrl(baseUrl);
      return res;
    } catch (err: any) {
      lastError = err;
    }
  }

  throw new Error(
    lastError?.message ||
      'Impossible de téléverser la vidéo sur Cloudinary. Vérifiez vos identifiants Cloudinary et votre connexion.'
  );
}

/**
 * Vérifie si une URL provient de Cloudinary
 */
export function isCloudinaryUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
}

/**
 * Optimise une URL d'image Cloudinary pour un chargement rapide (q_auto:good, f_auto)
 */
export function optimizeCloudinaryImageUrl(url: string, maxWidth = 1400): string {
  if (!isCloudinaryUrl(url)) return url;
  if (!url.includes('/image/upload/') || url.includes('/image/upload/q_')) {
    return url;
  }
  return url.replace('/image/upload/', `/image/upload/q_auto:good,f_auto,w_${maxWidth},c_limit/`);
}

/**
 * Génère une URL de streaming vidéo Cloudinary avec compression intelligente adaptée aux smartphones (q_auto, f_auto)
 */
export function getCloudinaryOptimizedVideoUrl(
  originalUrl: string,
  options?: {
    quality?: 'auto' | 'auto:good' | 'auto:eco' | 'auto:low';
    maxResolution?: number; // e.g. 720 or 1080
  }
): string {
  if (!isCloudinaryUrl(originalUrl)) return originalUrl;

  const quality = options?.quality || 'auto:good';
  const widthTransform = options?.maxResolution ? `,w_${options.maxResolution},c_limit` : '';
  const transform = `q_${quality},f_auto,vc_auto${widthTransform}`;

  if (originalUrl.includes('/video/upload/')) {
    if (originalUrl.includes('/video/upload/q_')) {
      return originalUrl;
    }
    return originalUrl.replace('/video/upload/', `/video/upload/${transform}/`);
  }

  return originalUrl;
}

/**
 * Extrait automatiquement une miniature JPEG haute définition depuis la vidéo Cloudinary
 * en spécifiant la seconde exacte (défaut = 0s ou 1s)
 */
export function getCloudinaryAutoThumbnail(
  videoUrl: string,
  second = 0
): string {
  if (!isCloudinaryUrl(videoUrl)) {
    return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80';
  }

  try {
    let replaced = videoUrl.replace(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i, '.jpg$2');
    const transform = `so_${second},q_auto,f_jpg,w_800,c_fill`;
    if (replaced.includes('/video/upload/')) {
      replaced = replaced.replace('/video/upload/', `/video/upload/${transform}/`);
    }
    return replaced;
  } catch {
    return videoUrl;
  }
}
