const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_CANDIDATES = [
  path.join(__dirname, '..', 'cloudinary_config.json'),
  path.join(__dirname, '..', '..', 'cloudinary_config.json'),
  path.join(process.cwd(), 'cloudinary_config.json'),
];

function parseCloudinaryUrl(urlStr) {
  try {
    const clean = String(urlStr || '').replace(/^CLOUDINARY_URL=/, '').trim();
    const match = clean.match(/cloudinary:\/\/([^:]+):([^@]+)@([^/\s]+)/);
    if (match) {
      return {
        apiKey: match[1],
        apiSecret: match[2],
        cloudName: match[3],
      };
    }
  } catch {}
  return {};
}

function loadCloudinaryConfig() {
  let envCloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
  let envApiKey = process.env.CLOUDINARY_API_KEY || '';
  let envApiSecret = process.env.CLOUDINARY_API_SECRET || '';
  let envPreset = process.env.CLOUDINARY_UPLOAD_PRESET || '';

  if (process.env.CLOUDINARY_URL) {
    const parsed = parseCloudinaryUrl(process.env.CLOUDINARY_URL);
    if (parsed.cloudName) envCloudName = parsed.cloudName;
    if (parsed.apiKey) envApiKey = parsed.apiKey;
    if (parsed.apiSecret) envApiSecret = parsed.apiSecret;
  }

  let fileConfig = {};
  for (const candidate of CONFIG_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) {
        fileConfig = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
        break;
      }
    } catch {}
  }

  const cloudName = String(envCloudName || fileConfig.cloudName || '').trim();
  const apiKey = String(envApiKey || fileConfig.apiKey || '').trim();
  const apiSecret = String(envApiSecret || fileConfig.apiSecret || '').trim();
  const uploadPreset = String(envPreset || fileConfig.uploadPreset || 'kinimmo_videos').trim();
  const isConfigured = Boolean((cloudName && apiKey && apiSecret) || (cloudName && uploadPreset));
  const autoOptimize = fileConfig.autoOptimize !== false;

  return { cloudName, apiKey, apiSecret, uploadPreset, isConfigured, autoOptimize };
}

function saveCloudinaryConfig(nextCfg) {
  const current = loadCloudinaryConfig();
  let { cloudName, apiKey, apiSecret, uploadPreset, autoOptimize, cloudinaryUrl } = nextCfg || {};

  if (cloudinaryUrl) {
    const parsed = parseCloudinaryUrl(cloudinaryUrl);
    if (parsed.cloudName) cloudName = parsed.cloudName;
    if (parsed.apiKey) apiKey = parsed.apiKey;
    if (parsed.apiSecret) apiSecret = parsed.apiSecret;
  }

  const finalCfg = {
    cloudName: String(cloudName || current.cloudName || '').trim(),
    apiKey: String(apiKey || current.apiKey || '').trim(),
    apiSecret: String(apiSecret || current.apiSecret || '').trim(),
    uploadPreset: String(uploadPreset || current.uploadPreset || 'kinimmo_videos').trim(),
    isConfigured: Boolean(
      (cloudName || current.cloudName) &&
        ((apiKey || current.apiKey) && (apiSecret || current.apiSecret) || (uploadPreset || current.uploadPreset))
    ),
    autoOptimize: autoOptimize !== false,
  };

  const targetFile = path.join(__dirname, '..', 'cloudinary_config.json');
  fs.writeFileSync(targetFile, JSON.stringify(finalCfg, null, 2), 'utf-8');
  return finalCfg;
}

function getPublicConfig() {
  const cfg = loadCloudinaryConfig();
  return {
    cloudName: cfg.cloudName,
    apiKey: cfg.apiKey,
    uploadPreset: cfg.uploadPreset,
    hasApiSecret: Boolean(cfg.apiSecret),
    isConfigured: cfg.isConfigured,
    autoOptimize: cfg.autoOptimize,
  };
}

function signParams(params, apiSecret) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null && params[k] !== '')
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return crypto.createHash('sha1').update(`${sorted}${apiSecret}`).digest('hex');
}

function createSignedUploadPayload({ folder = 'kinimmo/property_images', resourceType = 'image' } = {}) {
  const cfg = loadCloudinaryConfig();
  if (!cfg.cloudName) {
    throw new Error('Cloudinary non configuré : Cloud Name manquant.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  if (cfg.apiKey && cfg.apiSecret) {
    const paramsToSign = { folder, timestamp };
    const signature = signParams(paramsToSign, cfg.apiSecret);
    return {
      mode: 'signed',
      cloudName: cfg.cloudName,
      apiKey: cfg.apiKey,
      timestamp,
      signature,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/upload`,
    };
  }

  if (cfg.uploadPreset) {
    return {
      mode: 'unsigned',
      cloudName: cfg.cloudName,
      uploadPreset: cfg.uploadPreset,
      folder,
      resourceType,
      uploadUrl: `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/upload`,
    };
  }

  throw new Error('Cloudinary non configuré : renseignez API Key + API Secret ou Upload Preset.');
}

async function uploadToCloudinary({ fileData, buffer, mimetype, filename, resourceType = 'image', folder }) {
  const cfg = loadCloudinaryConfig();
  if (!cfg.cloudName) {
    throw new Error('Cloudinary non configuré : Cloud Name manquant.');
  }

  const targetFolder = folder || (resourceType === 'video' ? 'kinimmo/property_videos' : 'kinimmo/property_images');
  const endpoint = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resourceType}/upload`;
  const formData = new FormData();

  if (buffer) {
    const blob = new Blob([buffer], { type: mimetype || (resourceType === 'video' ? 'video/mp4' : 'image/jpeg') });
    formData.append('file', blob, filename || (resourceType === 'video' ? 'video.mp4' : 'photo.jpg'));
  } else if (typeof fileData === 'string' && fileData.trim()) {
    formData.append('file', fileData.trim());
  } else {
    throw new Error('Aucun média fourni pour le téléversement Cloudinary.');
  }

  if (cfg.apiKey && cfg.apiSecret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signParams({ folder: targetFolder, timestamp }, cfg.apiSecret);
    formData.append('api_key', cfg.apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', targetFolder);
    formData.append('signature', signature);
  } else if (cfg.uploadPreset) {
    formData.append('upload_preset', cfg.uploadPreset);
    formData.append('folder', targetFolder);
  } else {
    throw new Error('Identifiants Cloudinary incomplets.');
  }

  const res = await fetch(endpoint, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Erreur Cloudinary HTTP ${res.status}`);
  }

  const secureUrl = data.secure_url || data.url;
  let thumbnailUrl = secureUrl;
  if (resourceType === 'video' && secureUrl) {
    thumbnailUrl = secureUrl
      .replace(/\.(mp4|webm|mov|m4v|ogg)(\?.*)?$/i, '.jpg$2')
      .replace('/video/upload/', '/video/upload/so_0,q_auto,f_jpg,w_800,c_fill/');
  }

  return {
    success: true,
    url: data.url || secureUrl,
    secure_url: secureUrl,
    public_id: data.public_id,
    thumbnail_url: thumbnailUrl,
    duration: data.duration,
    format: data.format,
    bytes: data.bytes,
    width: data.width,
    height: data.height,
  };
}

async function testCloudinaryConnection() {
  const cfg = loadCloudinaryConfig();
  if (!cfg.cloudName) {
    return { success: false, message: 'Cloud Name non renseigné.' };
  }

  if (cfg.apiKey && cfg.apiSecret) {
    const authHeader = 'Basic ' + Buffer.from(`${cfg.apiKey}:${cfg.apiSecret}`).toString('base64');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloudName}/resources/image?max_results=1`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `Erreur HTTP ${res.status}`);
    }
    return {
      success: true,
      message: `Connexion Cloudinary réussie pour « ${cfg.cloudName} » !`,
    };
  }

  if (cfg.uploadPreset) {
    return {
      success: true,
      message: `Cloud Name « ${cfg.cloudName} » et Preset « ${cfg.uploadPreset} » configurés.`,
    };
  }

  return { success: false, message: 'Configuration Cloudinary incomplète.' };
}

const MIN_PROPERTY_PHOTOS = 3;
const MAX_PROPERTY_PHOTOS = 20;
const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_FILE_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 60;
const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v'];
const DEFAULT_VIRTUAL_TOUR_DOMAINS = [
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

function extractPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const clean = url.split('?')[0];
    const marker = '/upload/';
    const idx = clean.indexOf(marker);
    if (idx === -1) return null;
    let rest = clean.slice(idx + marker.length);
    const versionMatch = rest.match(/(?:^|\/)v\d+\/(.+)$/);
    if (versionMatch) {
      rest = versionMatch[1];
    } else {
      const parts = rest.split('/');
      if (parts.length > 1 && (parts[0].includes(',') || parts[0].includes('_'))) {
        rest = parts.slice(1).join('/');
      }
    }
    return rest.replace(/\.[a-z0-9]+$/i, '') || null;
  } catch {
    return null;
  }
}

function inferResourceTypeFromUrl(url, fallback = 'image') {
  if (typeof url === 'string' && url.includes('/video/upload/')) return 'video';
  return fallback;
}

async function destroyFromCloudinary({ publicId, url, resourceType }) {
  const cfg = loadCloudinaryConfig();
  const targetPublicId = publicId || extractPublicIdFromUrl(url);
  if (!targetPublicId) {
    return { success: true, skipped: true, reason: 'Pas de public_id Cloudinary.' };
  }
  if (!cfg.cloudName || !cfg.apiKey || !cfg.apiSecret) {
    return { success: false, skipped: true, reason: 'Identifiants API Cloudinary incomplets pour suppression.' };
  }

  const resType = resourceType || inferResourceTypeFromUrl(url, 'image');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signParams({ invalidate: 'true', public_id: targetPublicId, timestamp }, cfg.apiSecret);

  const formData = new FormData();
  formData.append('public_id', targetPublicId);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', cfg.apiKey);
  formData.append('invalidate', 'true');
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${cfg.cloudName}/${resType}/destroy`;
  const res = await fetch(endpoint, { method: 'POST', body: formData });
  const data = await res.json().catch(() => ({}));
  return {
    success: res.ok && (data.result === 'ok' || data.result === 'not found'),
    result: data.result || null,
    publicId: targetPublicId,
  };
}

function validateMediaUploadParams({
  purpose = 'property_photo',
  resourceType = 'image',
  mimeType,
  fileSize,
  fileCount = 1,
  currentPhotoCount = 0,
  duration,
  maxPlanPhotos = 20,
  maxPlanVideos = 50,
  usedVideos = 0,
  isAdmin = false,
} = {}) {
  const normalizedMime = mimeType ? String(mimeType).toLowerCase().trim() : '';
  const sizeNum = fileSize !== undefined && fileSize !== null ? Number(fileSize) : null;
  const durationNum = duration !== undefined && duration !== null ? Number(duration) : null;

  if (resourceType === 'image') {
    if (normalizedMime && !ALLOWED_IMAGE_MIME_TYPES.includes(normalizedMime)) {
      return {
        valid: false,
        status: 400,
        message: `Format photo non autorisé (${normalizedMime}). Formats acceptés : JPEG, PNG ou WebP.`,
      };
    }
    if (sizeNum !== null && Number.isFinite(sizeNum) && sizeNum > MAX_IMAGE_FILE_BYTES) {
      return {
        valid: false,
        status: 413,
        message: 'Photo trop volumineuse : taille maximale autorisée de 10 Mo par image.',
      };
    }
    if (purpose === 'property_photo') {
      const effectiveMaxPhotos = isAdmin ? MAX_PROPERTY_PHOTOS : Math.min(MAX_PROPERTY_PHOTOS, Math.max(3, Number(maxPlanPhotos || MAX_PROPERTY_PHOTOS)));
      const projectedCount = Number(currentPhotoCount || 0) + Number(fileCount || 1);
      if (projectedCount > effectiveMaxPhotos) {
        return {
          valid: false,
          status: 403,
          message: `Quota de photos atteint : maximum ${effectiveMaxPhotos} photos autorisées par annonce (plafond 20).`,
        };
      }
    }
  } else if (resourceType === 'video') {
    if (normalizedMime && !normalizedMime.startsWith('video/') && !ALLOWED_VIDEO_MIME_TYPES.includes(normalizedMime)) {
      return {
        valid: false,
        status: 400,
        message: `Format vidéo non autorisé (${normalizedMime}). Formats acceptés : MP4, MOV ou WebM.`,
      };
    }
    if (sizeNum !== null && Number.isFinite(sizeNum) && sizeNum > MAX_VIDEO_FILE_BYTES) {
      return {
        valid: false,
        status: 413,
        message: 'Vidéo trop volumineuse : taille maximale autorisée de 100 Mo.',
      };
    }
    if (durationNum !== null && Number.isFinite(durationNum) && durationNum > MAX_VIDEO_DURATION_SECONDS) {
      return {
        valid: false,
        status: 400,
        message: `Durée vidéo dépassée (${Math.round(durationNum)}s). Maximum autorisé : 60 secondes.`,
      };
    }
    if (!isAdmin && Number.isFinite(Number(maxPlanVideos)) && Number(maxPlanVideos) >= 0) {
      if (Number(usedVideos || 0) >= Number(maxPlanVideos)) {
        return {
          valid: false,
          status: 403,
          message: `Quota vidéo de votre formule atteint (${usedVideos}/${maxPlanVideos} vidéos). Passez à un forfait supérieur.`,
        };
      }
    }
  }

  return { valid: true };
}

function normalizeAllowedDomainsList(rawDomains) {
  let list = [];
  if (Array.isArray(rawDomains)) {
    list = rawDomains;
  } else if (typeof rawDomains === 'string') {
    const trimmed = rawDomains.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) list = parsed;
      } catch {}
    } else if (trimmed) {
      list = trimmed.split(/[\n,;]+/);
    }
  }
  const cleaned = list
    .map((d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, ''))
    .filter(Boolean);
  return cleaned.length > 0 ? Array.from(new Set(cleaned)) : [...DEFAULT_VIRTUAL_TOUR_DOMAINS];
}

function validateVirtualTourDomain(rawUrl, allowedDomains) {
  const trimmed = String(rawUrl || '').trim();
  if (!trimmed) return { valid: true, normalizedUrl: null };
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, message: 'URL de visite virtuelle invalide.' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, message: 'Seuls les liens HTTPS/HTTP sont autorisés pour les visites virtuelles.' };
  }
  const hostname = parsed.hostname.toLowerCase();
  const whitelist = normalizeAllowedDomainsList(allowedDomains);
  const ok = whitelist.some((dom) => {
    const clean = dom.replace(/^www\./, '');
    return hostname === dom || hostname === clean || hostname.endsWith(`.${clean}`);
  });
  if (!ok) {
    return {
      valid: false,
      message: `Le domaine "${hostname}" n'est pas dans la liste blanche des visites virtuelles (${whitelist.join(', ')}).`,
    };
  }
  return { valid: true, normalizedUrl: parsed.toString() };
}

function hammingDistanceHex64(a, b) {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string' || a.length !== 16 || b.length !== 16) return 64;
  let dist = 0;
  for (let i = 0; i < 16; i++) {
    const va = parseInt(a[i], 16);
    const vb = parseInt(b[i], 16);
    if (Number.isNaN(va) || Number.isNaN(vb)) return 64;
    let xor = va ^ vb;
    while (xor > 0) {
      dist += xor & 1;
      xor >>= 1;
    }
  }
  return dist;
}

module.exports = {
  MIN_PROPERTY_PHOTOS,
  MAX_PROPERTY_PHOTOS,
  MAX_IMAGE_FILE_BYTES,
  MAX_VIDEO_FILE_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  DEFAULT_VIRTUAL_TOUR_DOMAINS,
  loadCloudinaryConfig,
  saveCloudinaryConfig,
  getPublicConfig,
  createSignedUploadPayload,
  uploadToCloudinary,
  testCloudinaryConnection,
  extractPublicIdFromUrl,
  destroyFromCloudinary,
  validateMediaUploadParams,
  normalizeAllowedDomainsList,
  validateVirtualTourDomain,
  hammingDistanceHex64,
};
