/**
 * Service Client Cloudinary pour KinImmo
 * Gère le téléversement direct de vidéos, la progression en temps réel,
 * l'optimisation mobile (q_auto, f_auto) et l'extraction automatique de miniatures.
 */

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

const API_BASE = '/api';

/**
 * Récupère l'état actuel de la configuration Cloudinary
 */
export async function fetchCloudinaryConfig(): Promise<CloudinaryConfig> {
  try {
    const res = await fetch(`${API_BASE}/cloudinary/config`);
    if (!res.ok) throw new Error('Impossible de charger la configuration Cloudinary');
    const data = await res.json();
    return data.config;
  } catch (err) {
    console.warn('Erreur chargement configuration Cloudinary:', err);
    return {
      cloudName: '',
      isConfigured: false,
      autoOptimize: true
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
  const res = await fetch(`${API_BASE}/cloudinary/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erreur lors de la sauvegarde de la configuration Cloudinary');
  }
  return data;
}

/**
 * Teste la connectivité avec le compte Cloudinary
 */
export async function testCloudinaryConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/cloudinary/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Échec de connexion au serveur Cloudinary'
    };
  }
}

/**
 * Téléverse un fichier vidéo vers Cloudinary via le serveur KinImmo
 * avec suivi de progression (0 à 100%)
 */
export function uploadVideoWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('video', file);

    xhr.open('POST', `${API_BASE}/cloudinary/upload`, true);

    // Progression de l'upload
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
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || response.message || `Erreur téléversement HTTP ${xhr.status}`));
        }
      } catch (err) {
        reject(new Error(`Réponse serveur invalide lors du téléversement: ${xhr.responseText.substring(0, 100)}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Erreur réseau lors de l\'envoi du fichier vidéo à Cloudinary.'));
    };

    xhr.send(formData);
  });
}

/**
 * Vérifie si une URL provient de Cloudinary
 */
export function isCloudinaryUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
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

  // Exemple: https://res.cloudinary.com/demo/video/upload/sample.mp4
  // => https://res.cloudinary.com/demo/video/upload/q_auto:good,f_auto,vc_auto/sample.mp4
  if (originalUrl.includes('/video/upload/')) {
    // Si déjà transformée, ne pas doubler
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

  // Remplacer l'extension vidéo par .jpg et ajouter le marqueur de début (so_0)
  // https://res.cloudinary.com/demo/video/upload/sample.mp4 => https://res.cloudinary.com/demo/video/upload/so_0,q_auto,f_jpg,w_800,c_fill/sample.jpg
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
