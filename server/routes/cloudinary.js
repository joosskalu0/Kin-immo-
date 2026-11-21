const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
  getPublicConfig,
  saveCloudinaryConfig,
  createSignedUploadPayload,
  uploadToCloudinary,
  testCloudinaryConnection,
  destroyFromCloudinary,
  extractPublicIdFromUrl,
  validateMediaUploadParams,
  MAX_IMAGE_FILE_BYTES,
  MAX_VIDEO_FILE_BYTES,
} = require('../services/cloudinaryRestService');

let multer = null;
try {
  multer = require('multer');
} catch {
  multer = null;
}

const memoryUpload = multer
  ? multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_VIDEO_FILE_BYTES },
    })
  : null;

function optionalSingleUpload(fieldName) {
  if (!memoryUpload) {
    return (_req, _res, next) => next();
  }
  const handler = memoryUpload.single(fieldName);
  return (req, res, next) => {
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (!contentType.includes('multipart/form-data')) {
      return next();
    }
    return handler(req, res, next);
  };
}

async function getUserPlanQuotas(userId) {
  try {
    const [uRows] = await pool.execute('SELECT plan_id FROM users WHERE id = ? LIMIT 1', [userId]);
    const planId = uRows[0]?.plan_id || 'starter';
    const [pRows] = await pool.execute(
      'SELECT max_photos_per_listing, max_videos FROM pricing_plans WHERE id = ? LIMIT 1',
      [planId]
    );
    const maxPlanPhotos = Number(pRows[0]?.max_photos_per_listing ?? 20);
    const maxPlanVideos = Number(pRows[0]?.max_videos ?? 25);

    let usedVideos = 0;
    try {
      const [vCount] = await pool.execute(
        'SELECT COUNT(*) AS cnt FROM property_videos WHERE user_id = ? AND status != ?',
        [userId, 'rejected']
      );
      usedVideos = Number(vCount[0]?.cnt || 0);
    } catch {}

    return { maxPlanPhotos, maxPlanVideos, usedVideos };
  } catch {
    return { maxPlanPhotos: 20, maxPlanVideos: 25, usedVideos: 0 };
  }
}

// GET /api/cloudinary/config (jamais d'apiSecret exposé)
router.get('/config', (_req, res) => {
  return res.json({
    success: true,
    config: getPublicConfig(),
  });
});

// POST /api/cloudinary/config (Admin)
router.post('/config', authenticateToken, (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
  }
  try {
    saveCloudinaryConfig(req.body || {});
    return res.json({
      success: true,
      message: 'Configuration Cloudinary enregistrée avec succès.',
      config: getPublicConfig(),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cloudinary/test (Admin)
router.post('/test', authenticateToken, async (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs.' });
  }
  try {
    const result = await testCloudinaryConnection();
    return res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Impossible de joindre Cloudinary : ${err.message}`,
    });
  }
});

// POST /api/cloudinary/sign (Utilisateurs connectés : validation quotas/types/tailles + signature SHA-1)
router.post('/sign', authenticateToken, async (req, res) => {
  try {
    const resourceType = req.body?.resourceType === 'video' ? 'video' : 'image';
    const defaultFolder = resourceType === 'video' ? 'kinimmo/property_videos' : 'kinimmo/property_images';
    const folder = typeof req.body?.folder === 'string' && req.body.folder.trim() ? req.body.folder.trim() : defaultFolder;
    const purpose = req.body?.purpose || (folder.includes('floor_plan') ? 'floor_plan' : resourceType === 'video' ? 'property_video' : 'property_photo');

    const quotas = await getUserPlanQuotas(req.user.id);
    const check = validateMediaUploadParams({
      purpose,
      resourceType,
      mimeType: req.body?.mimeType,
      fileSize: req.body?.fileSize,
      fileCount: req.body?.fileCount,
      currentPhotoCount: req.body?.currentPhotoCount,
      duration: req.body?.duration,
      maxPlanPhotos: quotas.maxPlanPhotos,
      maxPlanVideos: quotas.maxPlanVideos,
      usedVideos: quotas.usedVideos,
      isAdmin: req.user?.role === 'admin',
    });

    if (!check.valid) {
      return res.status(check.status || 400).json({ success: false, message: check.message });
    }

    const payload = createSignedUploadPayload({ folder, resourceType });
    return res.json({ success: true, ...payload });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/cloudinary/destroy (Suppression serveur d'un média Cloudinary)
router.post('/destroy', authenticateToken, async (req, res) => {
  try {
    const { publicId, url, resourceType, propertyId } = req.body || {};
    const targetPublicId = publicId || extractPublicIdFromUrl(url);

    if (!targetPublicId) {
      return res.json({ success: true, skipped: true, message: 'Aucun asset Cloudinary à supprimer.' });
    }

    if (req.user?.role !== 'admin' && propertyId) {
      const [rows] = await pool.execute('SELECT agent_id, agency_id FROM properties WHERE id = ? LIMIT 1', [propertyId]);
      if (rows.length > 0) {
        const prop = rows[0];
        const isOwner = prop.agent_id === req.user.id || (req.user.agency_id && prop.agency_id === req.user.agency_id);
        if (!isOwner) {
          return res.status(403).json({ success: false, message: 'Accès refusé pour supprimer ce média.' });
        }
      }
    }

    const result = await destroyFromCloudinary({ publicId: targetPublicId, url, resourceType });
    return res.json({
      success: Boolean(result.success || result.skipped),
      ...result,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cloudinary/upload-image (Photos vers Cloudinary)
router.post('/upload-image', authenticateToken, optionalSingleUpload('image'), async (req, res) => {
  try {
    const file = req.file;
    const dataUrl = req.body?.image || req.body?.fileData || req.body?.dataUrl;

    if (!file && !dataUrl) {
      return res.status(400).json({ success: false, message: 'Aucune photo transmise.' });
    }

    if (file && file.size > MAX_IMAGE_FILE_BYTES) {
      return res.status(413).json({ success: false, message: 'Photo trop volumineuse (10 Mo max).' });
    }

    const quotas = await getUserPlanQuotas(req.user.id);
    const check = validateMediaUploadParams({
      purpose: req.body?.purpose || 'property_photo',
      resourceType: 'image',
      mimeType: file?.mimetype || req.body?.mimeType,
      fileSize: file?.size || req.body?.fileSize,
      fileCount: req.body?.fileCount || 1,
      currentPhotoCount: req.body?.currentPhotoCount || 0,
      maxPlanPhotos: quotas.maxPlanPhotos,
      isAdmin: req.user?.role === 'admin',
    });

    if (!check.valid) {
      return res.status(check.status || 400).json({ success: false, message: check.message });
    }

    const targetFolder = typeof req.body?.folder === 'string' && req.body.folder.trim()
      ? req.body.folder.trim()
      : 'kinimmo/property_images';

    const result = await uploadToCloudinary({
      buffer: file?.buffer,
      mimetype: file?.mimetype,
      filename: file?.originalname,
      fileData: dataUrl,
      resourceType: 'image',
      folder: targetFolder,
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors du téléversement photo vers Cloudinary.',
    });
  }
});

// POST /api/cloudinary/upload (Vidéos vers Cloudinary)
router.post('/upload', authenticateToken, optionalSingleUpload('video'), async (req, res) => {
  try {
    const file = req.file;
    const dataUrl = req.body?.video || req.body?.fileData || req.body?.dataUrl;

    if (!file && !dataUrl) {
      return res.status(400).json({ success: false, message: 'Aucun fichier vidéo transmis.' });
    }

    const quotas = await getUserPlanQuotas(req.user.id);
    const check = validateMediaUploadParams({
      purpose: 'property_video',
      resourceType: 'video',
      mimeType: file?.mimetype || req.body?.mimeType,
      fileSize: file?.size || req.body?.fileSize,
      duration: req.body?.duration,
      maxPlanVideos: quotas.maxPlanVideos,
      usedVideos: quotas.usedVideos,
      isAdmin: req.user?.role === 'admin',
    });

    if (!check.valid) {
      return res.status(check.status || 400).json({ success: false, message: check.message });
    }

    const result = await uploadToCloudinary({
      buffer: file?.buffer,
      mimetype: file?.mimetype,
      filename: file?.originalname,
      fileData: dataUrl,
      resourceType: 'video',
      folder: 'kinimmo/property_videos',
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Erreur lors du téléversement vidéo vers Cloudinary.',
    });
  }
});

module.exports = router;
