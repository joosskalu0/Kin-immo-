const pool = require('../config/database');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  MIN_PROPERTY_PHOTOS,
  MAX_PROPERTY_PHOTOS,
  MAX_VIDEO_DURATION_SECONDS,
  DEFAULT_VIRTUAL_TOUR_DOMAINS,
  loadCloudinaryConfig,
  uploadToCloudinary,
  destroyFromCloudinary,
  validateVirtualTourDomain,
  hammingDistanceHex64,
} = require('../services/cloudinaryRestService');

/**
 * Sauvegarder une image base64 sur le disque local et retourner son URL publique
 */
function parseJsonSafe(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function hydrateMediaFromRow(row, images = [], videoModStatusMap = null, currentUser = null) {
  const rawCustomFields = parseJsonSafe(row.custom_fields, {});
  const mediaMeta = rawCustomFields && typeof rawCustomFields === 'object' ? rawCustomFields._mediaMeta : null;
  const cleanCustomFields = rawCustomFields && typeof rawCustomFields === 'object'
    ? Object.fromEntries(Object.entries(rawCustomFields).filter(([k]) => k !== '_mediaMeta'))
    : {};

  const videoModStatus = videoModStatusMap ? videoModStatusMap.get(row.id) : undefined;
  const isOwnerOrAdmin = Boolean(
    currentUser &&
      (currentUser.role === 'admin' ||
        currentUser.id === row.agent_id ||
        (currentUser.agency_id && currentUser.agency_id === row.agency_id))
  );

  // Une vidéo téléversée en attente/refusée/masquée ne doit jamais fuiter publiquement
  const shouldHidePendingVideo =
    videoModStatus &&
    videoModStatus !== 'approved' &&
    !isOwnerOrAdmin;

  const listingStatus = mediaMeta?.listingStatus || (row.published ? 'PUBLISHED' : 'DRAFT');

  return {
    customFields: cleanCustomFields,
    imagesMeta: Array.isArray(mediaMeta?.imagesMeta)
      ? mediaMeta.imagesMeta
      : images.map((url) => ({ url })),
    imageFingerprints: Array.isArray(mediaMeta?.fingerprints) ? mediaMeta.fingerprints : [],
    floorPlanUrl: mediaMeta?.floorPlanUrl || undefined,
    floorPlanPublicId: mediaMeta?.floorPlanPublicId || undefined,
    floorPlanAlt: mediaMeta?.floorPlanAlt || undefined,
    videoPublicId: mediaMeta?.videoPublicId || undefined,
    videoDuration: mediaMeta?.videoDuration || undefined,
    videoModerationStatus: videoModStatus || mediaMeta?.videoModerationStatus || undefined,
    videoUrl: shouldHidePendingVideo ? undefined : row.video_url,
    listingStatus,
    fraudStatus: mediaMeta?.fraudStatus || undefined,
    fraudFlags: Array.isArray(mediaMeta?.fraudFlags) ? mediaMeta.fraudFlags : undefined,
  };
}

async function getAllowedVirtualTourDomains(dbConn = pool) {
  try {
    const [rows] = await dbConn.execute(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'virtual_tour_allowed_domains' LIMIT 1"
    );
    if (rows.length > 0 && rows[0].setting_value) {
      return rows[0].setting_value;
    }
  } catch {}
  return DEFAULT_VIRTUAL_TOUR_DOMAINS;
}

async function checkDuplicateFingerprintsInDb(dbConn, fingerprints, imageUrls, excludePropertyId = null) {
  const cleanFps = Array.isArray(fingerprints)
    ? fingerprints.map((f) => String(f || '').trim().toLowerCase()).filter((f) => f.length === 16)
    : [];
  const cleanUrls = Array.isArray(imageUrls)
    ? imageUrls.map((u) => String(u || '').trim()).filter(Boolean)
    : [];

  if (cleanFps.length === 0 && cleanUrls.length === 0) return [];

  const matches = new Map();
  try {
    if (cleanUrls.length > 0) {
      const placeholders = cleanUrls.map(() => '?').join(',');
      const [imgRows] = await dbConn.query(
        `SELECT pi.property_id, p.title FROM property_images pi INNER JOIN properties p ON p.id = pi.property_id
         WHERE pi.image_url IN (${placeholders}) AND (? IS NULL OR pi.property_id != ?)`,
        [...cleanUrls, excludePropertyId, excludePropertyId]
      );
      for (const r of imgRows) {
        matches.set(r.property_id, { propertyId: r.property_id, propertyTitle: r.title, distance: 0 });
      }
    }

    if (cleanFps.length > 0) {
      const [propRows] = await dbConn.query(
        'SELECT id, title, custom_fields FROM properties WHERE (? IS NULL OR id != ?)',
        [excludePropertyId, excludePropertyId]
      );
      for (const row of propRows) {
        if (matches.has(row.id)) continue;
        const cf = parseJsonSafe(row.custom_fields, {});
        const storedFps = Array.isArray(cf?._mediaMeta?.fingerprints) ? cf._mediaMeta.fingerprints : [];
        for (const fp of cleanFps) {
          for (const existingFp of storedFps) {
            const dist = hammingDistanceHex64(fp, String(existingFp || '').toLowerCase());
            if (dist <= 6) {
              matches.set(row.id, { propertyId: row.id, propertyTitle: row.title, distance: dist });
              break;
            }
          }
          if (matches.has(row.id)) break;
        }
      }
    }
  } catch (err) {
    console.warn('[Property Controller] Duplicate fingerprint check warning:', err.message);
  }
  return Array.from(matches.values());
}

async function ensurePendingVideoModeration(dbConn, { propertyId, userId, videoUrl, thumbnailUrl, isAdmin }) {
  if (!videoUrl || typeof videoUrl !== 'string') return null;
  const trimmed = videoUrl.trim();
  if (!trimmed) return null;

  try {
    const [existing] = await dbConn.execute(
      'SELECT id, status FROM property_videos WHERE property_id = ? AND video_url = ? LIMIT 1',
      [propertyId, trimmed]
    );
    if (existing.length > 0) {
      return existing[0].status;
    }

    const vidStatus = isAdmin ? 'approved' : 'pending';
    const videoId = `vid_${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    await dbConn.execute(
      `INSERT INTO property_videos (id, property_id, user_id, video_url, thumbnail_url, description, status, views_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        videoId,
        propertyId,
        userId || 'agent_system',
        trimmed,
        thumbnailUrl || null,
        'Visite vidéo soumise depuis le formulaire d\'annonce',
        vidStatus,
      ]
    );
    return vidStatus;
  } catch (err) {
    console.warn('[Property Controller] ensurePendingVideoModeration warning:', err.message);
    return isAdmin ? 'approved' : 'pending';
  }
}

async function saveBase64Image(imgData, propertyId, index, folder = 'kinimmo/property_images') {
  if (!imgData || typeof imgData !== 'string') return imgData;
  const trimmed = imgData.trim();
  if (!trimmed.startsWith('data:image')) {
    const uploadsMatch = trimmed.match(/^https?:\/\/[^/]+(\/uploads\/images\/[^?#]+)$/i);
    return uploadsMatch ? uploadsMatch[1] : trimmed;
  }

  // Priorité 1 : Upload vers Cloudinary si configuré
  try {
    const cloudCfg = loadCloudinaryConfig();
    if (cloudCfg.isConfigured) {
      const uploaded = await uploadToCloudinary({
        fileData: trimmed,
        resourceType: 'image',
        folder,
      });
      if (uploaded?.secure_url) {
        return uploaded.secure_url;
      }
    }
  } catch (cloudErr) {
    console.warn('[Property Controller] Cloudinary image upload fallback to disk:', cloudErr.message);
  }

  // Fallback disque local si Cloudinary indisponible
  try {
    const matches = trimmed.match(/^data:image\/([A-Za-z0-9.+-]+);base64,(.+)$/s);
    if (!matches || matches.length !== 3) return trimmed;

    const rawExt = matches[1].toLowerCase();
    const ext = rawExt.includes('png')
      ? 'png'
      : rawExt.includes('webp')
      ? 'webp'
      : rawExt.includes('gif')
      ? 'gif'
      : rawExt.includes('avif')
      ? 'avif'
      : 'jpg';
    const uploadDir = path.join(__dirname, '..', 'uploads', 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const cleanPropId = String(propertyId).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `img_${cleanPropId}_${index}_${Date.now()}.${ext}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, Buffer.from(matches[2], 'base64'));
    return `/uploads/images/${filename}`;
  } catch (err) {
    console.warn('[Property Controller] Warning saving image file:', err.message);
    return trimmed;
  }
}

/**
 * Sauvegarder une vidéo base64 sur Cloudinary (prioritaire) ou sur le disque local
 */
async function saveBase64Video(videoUrl) {
  if (!videoUrl || typeof videoUrl !== 'string') return null;
  if (videoUrl.startsWith('data:video')) {
    try {
      const cloudCfg = loadCloudinaryConfig();
      if (cloudCfg.isConfigured) {
        const uploaded = await uploadToCloudinary({
          fileData: videoUrl,
          resourceType: 'video',
          folder: 'kinimmo/property_videos',
        });
        if (uploaded?.secure_url) {
          return uploaded.secure_url;
        }
      }
    } catch (cloudErr) {
      console.warn('[Property Controller] Cloudinary video upload fallback to disk:', cloudErr.message);
    }

    try {
      const matches = videoUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const ext = matches[1].includes('webm') ? 'webm' : matches[1].includes('mov') ? 'mov' : 'mp4';
        const filename = `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(matches[2], 'base64'));
        return `/uploads/videos/${filename}`;
      }
    } catch (videoSaveErr) {
      console.warn('[Property Controller] Avertissement écriture vidéo base64:', videoSaveErr.message);
      return null;
    }
  }
  return videoUrl.length > 2048 ? videoUrl.substring(0, 2048) : videoUrl;
}

/**
 * Récupérer la liste des propriétés avec filtres Kinshasa
 * GET /api/properties
 */
async function getProperties(req, res, next) {
  try {
    const {
      commune,
      type,
      status,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      featured,
      search,
      showSold,
      includeUnpublished,
      limit = 50,
      offset = 0
    } = req.query;

    const canSeeUnpublished = includeUnpublished === 'true' && req.user;
    let whereClause = 'WHERE (p.published = TRUE OR p.published = 1 OR p.published IS NULL)';
    const params = [];

    if (canSeeUnpublished) {
      if (req.user.role === 'admin') {
        whereClause = 'WHERE 1=1';
      } else if (req.user.agency_id) {
        whereClause = 'WHERE (p.published = TRUE OR p.published = 1 OR p.agent_id = ? OR p.agency_id = ?)';
        params.push(req.user.id, req.user.agency_id);
      } else {
        whereClause = 'WHERE (p.published = TRUE OR p.published = 1 OR p.agent_id = ?)';
        params.push(req.user.id);
      }
    }

    let sql = `
      SELECT p.*,
             u.name as agent_name, u.email as agent_email, u.phone as agent_phone, u.whatsapp as agent_whatsapp,
             ag.name as agency_title, ag.logo as agency_logo
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN agencies ag ON p.agency_id = ag.id
      ${whereClause}
    `;

    // Règle Kinimmo : Les biens vendus sont masqués par défaut sur l'écran d'accueil public
    if (status) {
      sql += ' AND p.status = ?';
      params.push(status);
    } else if (showSold !== 'true') {
      sql += " AND p.status != 'sold'";
    }

    if (commune && commune !== 'all') {
      sql += ' AND LOWER(p.commune) = LOWER(?)';
      params.push(commune);
    }

    if (type && type !== 'all') {
      sql += ' AND p.type = ?';
      params.push(type);
    }

    if (minPrice) {
      sql += ' AND p.price >= ?';
      params.push(Number(minPrice));
    }

    if (maxPrice) {
      sql += ' AND p.price <= ?';
      params.push(Number(maxPrice));
    }

    if (bedrooms) {
      sql += ' AND p.bedrooms >= ?';
      params.push(Number(bedrooms));
    }

    if (bathrooms) {
      sql += ' AND p.bathrooms >= ?';
      params.push(Number(bathrooms));
    }

    if (featured === 'true') {
      sql += ' AND p.featured = TRUE';
    }

    if (search && search.trim() !== '') {
      sql += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.commune LIKE ? OR p.quartier LIKE ? OR p.address LIKE ?)';
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += ' ORDER BY p.featured DESC, p.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(sql, params);

    const propIds = rows.map((r) => r.id).filter(Boolean);
    const imagesByPropId = new Map();
    const videoModMap = new Map();

    if (propIds.length > 0) {
      const placeholders = propIds.map(() => '?').join(',');
      const [imgRows] = await pool.query(
        `SELECT property_id, image_url FROM property_images WHERE property_id IN (${placeholders}) ORDER BY display_order ASC, id ASC`,
        propIds
      );
      for (const imgRow of imgRows) {
        if (!imgRow || !imgRow.image_url) continue;
        if (!imagesByPropId.has(imgRow.property_id)) {
          imagesByPropId.set(imgRow.property_id, []);
        }
        imagesByPropId.get(imgRow.property_id).push(imgRow.image_url);
      }

      try {
        const [vidRows] = await pool.query(
          `SELECT property_id, status FROM property_videos WHERE property_id IN (${placeholders}) ORDER BY created_at DESC`,
          propIds
        );
        for (const vr of vidRows) {
          if (!videoModMap.has(vr.property_id)) {
            videoModMap.set(vr.property_id, vr.status);
          }
        }
      } catch {}
    }

    const formatted = rows.map((row) => {
      const imgs = imagesByPropId.get(row.id) || [];
      const hydrated = hydrateMediaFromRow(row, imgs, videoModMap, req.user);
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        price: Number(row.price),
        currency: row.currency || 'USD',
        period: row.period,
        type: row.type,
        status: row.status,
        category: row.category,
        address: row.address,
        city: row.city,
        commune: row.commune,
        quartier: row.quartier,
        avenue: row.avenue,
        referencePoint: row.reference_point,
        zipCode: row.zip_code,
        country: row.country,
        lat: Number(row.lat),
        lng: Number(row.lng),
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        area: Number(row.area),
        yearBuilt: row.year_built,
        garages: row.garages,
        amenities: parseJsonSafe(row.amenities, []),
        images: imgs,
        virtualTourUrl: row.virtual_tour_url,
        ...hydrated,
        agentId: row.agent_id,
        agencyId: row.agency_id,
        agencyName: row.agency_title,
        agencyLogo: row.agency_logo,
        agentName: row.agent_name,
        agentPhone: row.agent_phone,
        agentWhatsapp: row.agent_whatsapp,
        viewsCount: row.views_count,
        featured: Boolean(row.featured),
        isPremium: Boolean(row.is_premium),
        isUrgent: Boolean(row.is_urgent),
        listingTier: row.listing_tier || (Boolean(row.featured) ? 'featured' : 'free'),
        boostExpiresAt: row.boost_expires_at || null,
        refreshBumpAt: row.refresh_bump_at || null,
        published: Boolean(row.published),
        labels: [],
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    });

    res.json({
      success: true,
      count: formatted.length,
      properties: formatted,
      data: formatted
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer une propriété par son ID avec incrémentation des vues
 * GET /api/properties/:id
 */
async function getPropertyById(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT p.*,
              u.name as agent_name, u.email as agent_email, u.phone as agent_phone, u.whatsapp as agent_whatsapp, u.avatar as agent_avatar,
              ag.name as agency_title, ag.logo as agency_logo, ag.phone as agency_phone
       FROM properties p
       LEFT JOIN users u ON p.agent_id = u.id
       LEFT JOIN agencies ag ON p.agency_id = ag.id
       WHERE p.id = ? LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }

    const row = rows[0];
    const [imagesRows] = await pool.execute(
      'SELECT image_url FROM property_images WHERE property_id = ? ORDER BY display_order ASC',
      [id]
    );
    const images = imagesRows.map(img => img.image_url);

    const videoModMap = new Map();
    try {
      const [vidRows] = await pool.execute(
        'SELECT status FROM property_videos WHERE property_id = ? ORDER BY created_at DESC LIMIT 1',
        [id]
      );
      if (vidRows.length > 0) videoModMap.set(id, vidRows[0].status);
    } catch {}

    await pool.execute('UPDATE properties SET views_count = views_count + 1 WHERE id = ?', [id]);

    const hydrated = hydrateMediaFromRow(row, images, videoModMap, req.user);

    const property = {
      id: row.id,
      title: row.title,
      description: row.description,
      price: Number(row.price),
      currency: row.currency,
      period: row.period,
      type: row.type,
      status: row.status,
      category: row.category,
      address: row.address,
      city: row.city,
      commune: row.commune,
      quartier: row.quartier,
      avenue: row.avenue,
      referencePoint: row.reference_point,
      zipCode: row.zip_code,
      country: row.country,
      lat: Number(row.lat),
      lng: Number(row.lng),
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      area: Number(row.area),
      yearBuilt: row.year_built,
      garages: row.garages,
      amenities: typeof row.amenities === 'string' ? JSON.parse(row.amenities) : (row.amenities || []),
      images: images.length > 0 ? images : [],
      virtualTourUrl: row.virtual_tour_url,
      ...hydrated,
      agentId: row.agent_id,
      agencyId: row.agency_id,
      agencyName: row.agency_title,
      agencyLogo: row.agency_logo,
      agentName: row.agent_name,
      agentPhone: row.agent_phone,
      agentWhatsapp: row.agent_whatsapp,
      agentAvatar: row.agent_avatar,
      viewsCount: row.views_count + 1,
      featured: Boolean(row.featured),
      isPremium: Boolean(row.is_premium),
      isUrgent: Boolean(row.is_urgent),
      listingTier: row.listing_tier || (Boolean(row.featured) ? 'featured' : 'free'),
      boostExpiresAt: row.boost_expires_at || null,
      refreshBumpAt: row.refresh_bump_at || null,
      published: Boolean(row.published),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    res.json({ success: true, property });
  } catch (error) {
    next(error);
  }
}

/**
 * Créer une nouvelle annonce immobilière
 * POST /api/properties (Réservé aux Agents, Agences et Administrateurs)
 */
async function createProperty(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const p = req.body;
    const propertyId = p.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isAdmin = req.user?.role === 'admin';
    const listingStatus = String(p.listingStatus || (p.published === false ? 'DRAFT' : 'PUBLISHED')).toUpperCase();
    const isDraft = listingStatus === 'DRAFT' || listingStatus === 'ARCHIVED';

    const rawImages = Array.isArray(p.images) ? p.images.filter(Boolean) : [];

    // 1. Validation du nombre de photos (3 min pour publication publique, brouillons autorisés)
    if (!isDraft && listingStatus === 'PUBLISHED' && rawImages.length < MIN_PROPERTY_PHOTOS) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Au moins ${MIN_PROPERTY_PHOTOS} photos sont requises pour publier une annonce publiquement (actuellement ${rawImages.length}). Enregistrez en brouillon pour continuer plus tard.`,
      });
    }

    // 2. Vérification des quotas du plan (annonces + photos max 20)
    let maxPhotosCap = MAX_PROPERTY_PHOTOS;
    if (req.user && !isAdmin) {
      try {
        const [userRows] = await connection.execute('SELECT plan_id, role FROM users WHERE id = ? LIMIT 1', [req.user.id]);
        const currentPlanId = userRows[0]?.plan_id || 'starter';
        const [planRows] = await connection.execute(
          'SELECT max_listings, max_photos_per_listing, name FROM pricing_plans WHERE id = ? LIMIT 1',
          [currentPlanId]
        );
        const maxListings = planRows[0]?.max_listings || 3;
        const planName = planRows[0]?.name || 'Starter Particulier';
        if (planRows[0]?.max_photos_per_listing) {
          maxPhotosCap = Math.min(MAX_PROPERTY_PHOTOS, Math.max(MIN_PROPERTY_PHOTOS, Number(planRows[0].max_photos_per_listing)));
        }

        const [countRows] = await connection.execute('SELECT COUNT(*) as cnt FROM properties WHERE agent_id = ?', [req.user.id]);
        const currentCount = countRows[0]?.cnt || 0;

        if (currentCount >= maxListings) {
          await connection.rollback();
          connection.release();
          return res.status(403).json({
            success: false,
            message: `Quota d'annonces atteint (${currentCount}/${maxListings} annonces publiées sous la formule "${planName}"). Veuillez souscrire à une formule supérieure pour continuer à publier.`,
            upgradeRequired: true,
            currentCount,
            maxListings
          });
        }
      } catch {}
    }

    if (rawImages.length > maxPhotosCap) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Nombre maximum de photos dépassé (${rawImages.length}/${maxPhotosCap} max).`,
      });
    }

    // 3. Validation domaine visite virtuelle
    const allowedDomains = await getAllowedVirtualTourDomains(connection);
    const tourCheck = validateVirtualTourDomain(p.virtualTourUrl, allowedDomains);
    if (!tourCheck.valid) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: tourCheck.message });
    }

    // 4. Validation durée vidéo (<= 60s)
    if (p.videoDuration !== undefined && Number(p.videoDuration) > MAX_VIDEO_DURATION_SECONDS) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({
        success: false,
        message: `La vidéo ne peut pas dépasser ${MAX_VIDEO_DURATION_SECONDS} secondes.`,
      });
    }

    // Contraintes de clés étrangères
    let validAgentId = null;
    let validAgencyId = null;
    if (req.user && req.user.id) {
      try {
        const [u] = await connection.execute('SELECT id FROM users WHERE id = ? LIMIT 1', [req.user.id]);
        if (u.length > 0) {
          validAgentId = req.user.id;
        } else {
          await connection.execute(
            'INSERT INTO users (id, name, email, password_hash, role, is_verified) VALUES (?, ?, ?, ?, ?, TRUE)',
            [req.user.id, req.user.name || 'Agent Kinimmo', req.user.email || `${req.user.id}@kinimmo.com`, '$2a$10$DUMMY_RESTORED_USER_HASH', req.user.role || 'agent']
          );
          validAgentId = req.user.id;
        }
      } catch {
        validAgentId = null;
      }
    }

    if (req.user && req.user.agency_id) {
      try {
        const [ag] = await connection.execute('SELECT id FROM agencies WHERE id = ? LIMIT 1', [req.user.agency_id]);
        if (ag.length > 0) validAgencyId = req.user.agency_id;
      } catch {
        validAgencyId = null;
      }
    }

    const videoUrlToSave = await saveBase64Video(p.videoUrl);
    const savedFloorPlanUrl = p.floorPlanUrl
      ? await saveBase64Image(p.floorPlanUrl, propertyId, 999, 'kinimmo/floor_plans')
      : null;

    // Insertion des images
    const savedImages = [];
    for (let i = 0; i < rawImages.length; i++) {
      const savedUrl = await saveBase64Image(rawImages[i], propertyId, i, 'kinimmo/property_images');
      if (savedUrl) savedImages.push(savedUrl);
    }

    // 5. Détection d'empreintes dupliquées (signalement modération admin sans bloquer les brouillons)
    const fingerprints = Array.isArray(p.imageFingerprints)
      ? p.imageFingerprints
      : Array.isArray(p.imagesMeta)
      ? p.imagesMeta.map((m) => m?.fingerprint).filter(Boolean)
      : [];
    const dupMatches = await checkDuplicateFingerprintsInDb(connection, fingerprints, savedImages, null);
    let fraudStatus = p.fraudStatus || 'normal';
    const fraudFlags = Array.isArray(p.fraudFlags) ? [...p.fraudFlags] : [];
    if (dupMatches.length > 0) {
      if (fraudStatus === 'normal') fraudStatus = 'review_required';
      if (!fraudFlags.some((f) => f.code === 'DUPLICATE_PHOTOS')) {
        fraudFlags.push({
          code: 'DUPLICATE_PHOTOS',
          label: 'Empreinte photo déjà utilisée sur une autre annonce',
          severity: 'high',
          details: dupMatches.map((m) => `${m.propertyTitle} (${m.propertyId})`).join(', '),
        });
      }
    }

    const normalizedMeta = Array.isArray(p.imagesMeta)
      ? p.imagesMeta.map((m, idx) => ({ ...m, url: savedImages[idx] || m.url }))
      : savedImages.map((url, idx) => ({ url, fingerprint: fingerprints[idx] }));

    const mergedCustomFields = {
      ...(p.customFields && typeof p.customFields === 'object' ? p.customFields : {}),
      _mediaMeta: {
        imagesMeta: normalizedMeta,
        fingerprints,
        floorPlanUrl: savedFloorPlanUrl || undefined,
        floorPlanPublicId: p.floorPlanPublicId || undefined,
        floorPlanAlt: p.floorPlanAlt || undefined,
        videoPublicId: p.videoPublicId || undefined,
        videoDuration: p.videoDuration || undefined,
        listingStatus,
        fraudStatus,
        fraudFlags,
      },
    };

    const isPublished = !isDraft && p.published !== false && fraudStatus !== 'suspect' ? 1 : 0;
    const isFeatured = isAdmin ? Boolean(p.featured) : false;

    await connection.execute(
      `INSERT INTO properties (
        id, title, description, price, currency, period, type, status, category,
        address, city, commune, quartier, avenue, reference_point, zip_code, country,
        lat, lng, bedrooms, bathrooms, area, year_built, garages,
        amenities, custom_fields, video_url, virtual_tour_url, agent_id, agency_id, featured, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        propertyId,
        p.title,
        p.description || '',
        p.price,
        p.currency || 'USD',
        p.period || 'total',
        p.type || 'apartment',
        p.status || 'for-sale',
        p.category || 'Résidentiel',
        p.address || '',
        p.city || 'Kinshasa',
        p.commune || 'Gombe',
        p.quartier || '',
        p.avenue || '',
        p.referencePoint || '',
        p.zipCode || 'KN-01',
        p.country || 'RDC',
        p.lat || -4.322447,
        p.lng || 15.307045,
        p.bedrooms || 0,
        p.bathrooms || 0,
        p.area || 0,
        p.yearBuilt || null,
        p.garages || 0,
        JSON.stringify(p.amenities || []),
        JSON.stringify(mergedCustomFields),
        videoUrlToSave,
        tourCheck.normalizedUrl || null,
        validAgentId,
        validAgencyId,
        isFeatured,
        isPublished
      ]
    );

    for (let i = 0; i < savedImages.length; i++) {
      await connection.execute(
        'INSERT INTO property_images (property_id, image_url, display_order, is_featured) VALUES (?, ?, ?, ?)',
        [propertyId, savedImages[i], i, i === 0]
      );
    }

    let videoModerationStatus = null;
    if (videoUrlToSave) {
      videoModerationStatus = await ensurePendingVideoModeration(connection, {
        propertyId,
        userId: req.user?.id,
        videoUrl: videoUrlToSave,
        thumbnailUrl: savedImages[0] || null,
        isAdmin,
      });
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: isDraft ? 'Brouillon enregistré avec succès.' : 'Propriété enregistrée avec succès dans la base MySQL.',
      propertyId,
      images: savedImages,
      duplicateMatches: dupMatches,
      property: {
        ...p,
        id: propertyId,
        images: savedImages,
        imagesMeta: normalizedMeta,
        imageFingerprints: fingerprints,
        floorPlanUrl: savedFloorPlanUrl || undefined,
        videoUrl: videoUrlToSave || p.videoUrl,
        videoModerationStatus: videoModerationStatus || undefined,
        virtualTourUrl: tourCheck.normalizedUrl || undefined,
        listingStatus,
        fraudStatus,
        fraudFlags,
        published: Boolean(isPublished),
        featured: Boolean(isFeatured)
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

/**
 * Mettre à jour une annonce
 * PUT /api/properties/:id
 */
async function updateProperty(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const p = req.body;

    const [existing] = await connection.execute(
      'SELECT agent_id, agency_id, video_url, custom_fields, published FROM properties WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      connection.release();
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }

    const propRow = existing[0];
    const isOwner = propRow.agent_id === req.user.id;
    const isSameAgencyManager = Boolean(
      req.user.agency_id &&
      propRow.agency_id === req.user.agency_id &&
      req.user.role === 'agency'
    );
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isSameAgencyManager && !isAdmin) {
      connection.release();
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette annonce.' });
    }

    const prevCustomFields = parseJsonSafe(propRow.custom_fields, {});
    const prevMeta = prevCustomFields?._mediaMeta || {};
    const [prevImgRows] = await connection.execute(
      'SELECT image_url FROM property_images WHERE property_id = ? ORDER BY display_order ASC, id ASC',
      [id]
    );
    const prevImages = prevImgRows.map((r) => r.image_url).filter(Boolean);

    const nextListingStatus = String(
      p.listingStatus || prevMeta.listingStatus || (p.published === false ? 'DRAFT' : 'PUBLISHED')
    ).toUpperCase();
    const isDraft = nextListingStatus === 'DRAFT' || nextListingStatus === 'ARCHIVED';
    const nextImagesCount = Array.isArray(p.images) ? p.images.filter(Boolean).length : prevImages.length;

    if (!isDraft && nextListingStatus === 'PUBLISHED' && nextImagesCount < MIN_PROPERTY_PHOTOS) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Au moins ${MIN_PROPERTY_PHOTOS} photos sont requises pour publier l'annonce publiquement (actuellement ${nextImagesCount}).`,
      });
    }

    if (Array.isArray(p.images) && p.images.length > MAX_PROPERTY_PHOTOS) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Maximum ${MAX_PROPERTY_PHOTOS} photos autorisées par annonce.`,
      });
    }

    if (p.virtualTourUrl !== undefined) {
      const allowedDomains = await getAllowedVirtualTourDomains(connection);
      const tourCheck = validateVirtualTourDomain(p.virtualTourUrl, allowedDomains);
      if (!tourCheck.valid) {
        connection.release();
        return res.status(400).json({ success: false, message: tourCheck.message });
      }
      p.virtualTourUrl = tourCheck.normalizedUrl;
    }

    if (p.videoDuration !== undefined && Number(p.videoDuration) > MAX_VIDEO_DURATION_SECONDS) {
      connection.release();
      return res.status(400).json({
        success: false,
        message: `La vidéo ne peut pas dépasser ${MAX_VIDEO_DURATION_SECONDS} secondes.`,
      });
    }

    await connection.beginTransaction();

    const videoUrlToSave = p.videoUrl !== undefined ? await saveBase64Video(p.videoUrl) : undefined;
    const nextFloorPlanUrl =
      p.floorPlanUrl !== undefined
        ? (p.floorPlanUrl ? await saveBase64Image(p.floorPlanUrl, id, 999, 'kinimmo/floor_plans') : null)
        : prevMeta.floorPlanUrl || null;

    let savedImages = prevImages;
    if (Array.isArray(p.images)) {
      savedImages = [];
      await connection.execute('DELETE FROM property_images WHERE property_id = ?', [id]);
      for (let i = 0; i < p.images.length; i++) {
        const savedUrl = await saveBase64Image(p.images[i], id, i, 'kinimmo/property_images');
        if (savedUrl) {
          savedImages.push(savedUrl);
          await connection.execute(
            'INSERT INTO property_images (property_id, image_url, display_order, is_featured) VALUES (?, ?, ?, ?)',
            [id, savedUrl, i, i === 0]
          );
        }
      }
    }

    const fingerprints = Array.isArray(p.imageFingerprints)
      ? p.imageFingerprints
      : Array.isArray(p.imagesMeta)
      ? p.imagesMeta.map((m) => m?.fingerprint).filter(Boolean)
      : (prevMeta.fingerprints || []);

    const dupMatches = await checkDuplicateFingerprintsInDb(connection, fingerprints, savedImages, id);
    let fraudStatus = p.fraudStatus || prevMeta.fraudStatus || 'normal';
    const fraudFlags = Array.isArray(p.fraudFlags) ? [...p.fraudFlags] : (prevMeta.fraudFlags || []);
    if (dupMatches.length > 0) {
      if (fraudStatus === 'normal') fraudStatus = 'review_required';
      if (!fraudFlags.some((f) => f.code === 'DUPLICATE_PHOTOS')) {
        fraudFlags.push({
          code: 'DUPLICATE_PHOTOS',
          label: 'Empreinte photo déjà utilisée sur une autre annonce',
          severity: 'high',
          details: dupMatches.map((m) => `${m.propertyTitle} (${m.propertyId})`).join(', '),
        });
      }
    }

    const normalizedMeta = Array.isArray(p.imagesMeta)
      ? p.imagesMeta.map((m, idx) => ({ ...m, url: savedImages[idx] || m.url }))
      : prevMeta.imagesMeta || savedImages.map((url, idx) => ({ url, fingerprint: fingerprints[idx] }));

    const mergedCustomFields = {
      ...(prevCustomFields && typeof prevCustomFields === 'object' ? prevCustomFields : {}),
      ...(p.customFields && typeof p.customFields === 'object' ? p.customFields : {}),
      _mediaMeta: {
        ...prevMeta,
        imagesMeta: normalizedMeta,
        fingerprints,
        floorPlanUrl: nextFloorPlanUrl || undefined,
        floorPlanPublicId: p.floorPlanPublicId !== undefined ? p.floorPlanPublicId : prevMeta.floorPlanPublicId,
        floorPlanAlt: p.floorPlanAlt !== undefined ? p.floorPlanAlt : prevMeta.floorPlanAlt,
        videoPublicId: p.videoPublicId !== undefined ? p.videoPublicId : prevMeta.videoPublicId,
        videoDuration: p.videoDuration !== undefined ? p.videoDuration : prevMeta.videoDuration,
        listingStatus: nextListingStatus,
        fraudStatus,
        fraudFlags,
      },
    };

    const nextFeatured = isAdmin && p.featured !== undefined ? (p.featured ? 1 : 0) : null;
    const nextPublished = fraudStatus === 'suspect' || isDraft
      ? 0
      : (p.published !== undefined ? (p.published ? 1 : 0) : 1);

    await connection.execute(
      `UPDATE properties
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           currency = COALESCE(?, currency),
           period = COALESCE(?, period),
           type = COALESCE(?, type),
           status = COALESCE(?, status),
           category = COALESCE(?, category),
           address = COALESCE(?, address),
           commune = COALESCE(?, commune),
           quartier = COALESCE(?, quartier),
           avenue = COALESCE(?, avenue),
           reference_point = COALESCE(?, reference_point),
           zip_code = COALESCE(?, zip_code),
           country = COALESCE(?, country),
           lat = COALESCE(?, lat),
           lng = COALESCE(?, lng),
           bedrooms = COALESCE(?, bedrooms),
           bathrooms = COALESCE(?, bathrooms),
           area = COALESCE(?, area),
           year_built = COALESCE(?, year_built),
           garages = COALESCE(?, garages),
           amenities = COALESCE(?, amenities),
           custom_fields = ?,
           video_url = ?,
           virtual_tour_url = ?,
           featured = COALESCE(?, featured),
           published = ?
       WHERE id = ?`,
      [
        p.title !== undefined ? p.title : null,
        p.description !== undefined ? p.description : null,
        p.price !== undefined ? p.price : null,
        p.currency !== undefined ? p.currency : null,
        p.period !== undefined ? p.period : null,
        p.type !== undefined ? p.type : null,
        p.status !== undefined ? p.status : null,
        p.category !== undefined ? p.category : null,
        p.address !== undefined ? p.address : null,
        p.commune !== undefined ? p.commune : null,
        p.quartier !== undefined ? p.quartier : null,
        p.avenue !== undefined ? p.avenue : null,
        p.referencePoint !== undefined ? p.referencePoint : null,
        p.zipCode !== undefined ? p.zipCode : null,
        p.country !== undefined ? p.country : null,
        p.lat !== undefined ? p.lat : null,
        p.lng !== undefined ? p.lng : null,
        p.bedrooms !== undefined ? p.bedrooms : null,
        p.bathrooms !== undefined ? p.bathrooms : null,
        p.area !== undefined ? p.area : null,
        p.yearBuilt !== undefined ? p.yearBuilt : null,
        p.garages !== undefined ? p.garages : null,
        p.amenities !== undefined ? JSON.stringify(p.amenities) : null,
        JSON.stringify(mergedCustomFields),
        p.videoUrl !== undefined ? (videoUrlToSave || null) : propRow.video_url,
        p.virtualTourUrl !== undefined ? (p.virtualTourUrl || null) : undefined,
        nextFeatured,
        nextPublished,
        id
      ].map((v, idx) => {
        // Si virtualTourUrl n'était pas fourni, récupérer via SQL en gardant la valeur actuelle si undefined
        if (idx === 26 && v === undefined) return propRow.virtual_tour_url || null;
        return v;
      })
    );

    let videoModerationStatus = null;
    if (videoUrlToSave && videoUrlToSave !== propRow.video_url) {
      videoModerationStatus = await ensurePendingVideoModeration(connection, {
        propertyId: id,
        userId: req.user?.id,
        videoUrl: videoUrlToSave,
        thumbnailUrl: savedImages[0] || null,
        isAdmin,
      });
    }

    await connection.commit();

    // Nettoyage asynchrone Cloudinary des médias supprimés/remplacés
    const assetsToDestroy = [];
    for (const oldImg of prevImages) {
      if (oldImg && oldImg.includes('cloudinary.com') && !savedImages.includes(oldImg)) {
        assetsToDestroy.push({ url: oldImg, resourceType: 'image' });
      }
    }
    if (prevMeta.floorPlanUrl && String(prevMeta.floorPlanUrl).includes('cloudinary.com') && prevMeta.floorPlanUrl !== nextFloorPlanUrl) {
      assetsToDestroy.push({ url: prevMeta.floorPlanUrl, publicId: prevMeta.floorPlanPublicId, resourceType: 'image' });
    }
    if (propRow.video_url && String(propRow.video_url).includes('cloudinary.com') && p.videoUrl !== undefined && videoUrlToSave !== propRow.video_url) {
      assetsToDestroy.push({ url: propRow.video_url, resourceType: 'video' });
    }
    if (assetsToDestroy.length > 0) {
      Promise.allSettled(assetsToDestroy.map((a) => destroyFromCloudinary(a))).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Propriété mise à jour avec succès.',
      images: savedImages,
      duplicateMatches: dupMatches,
      property: {
        ...p,
        id,
        images: savedImages,
        imagesMeta: normalizedMeta,
        imageFingerprints: fingerprints,
        floorPlanUrl: nextFloorPlanUrl || undefined,
        listingStatus: nextListingStatus,
        fraudStatus,
        fraudFlags,
        published: Boolean(nextPublished),
        ...(videoModerationStatus ? { videoModerationStatus } : {}),
        ...(videoUrlToSave !== undefined ? { videoUrl: videoUrlToSave || undefined } : {})
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

/**
 * Supprimer une annonce
 * DELETE /api/properties/:id
 */
async function deleteProperty(req, res, next) {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT agent_id, agency_id, video_url, custom_fields FROM properties WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }

    const propRow = existing[0];
    const isOwner = propRow.agent_id === req.user.id;
    const isSameAgencyManager = Boolean(
      req.user.agency_id &&
      propRow.agency_id === req.user.agency_id &&
      req.user.role === 'agency'
    );
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isSameAgencyManager && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Non autorisé à supprimer cette annonce.' });
    }

    const [imgRows] = await pool.execute('SELECT image_url FROM property_images WHERE property_id = ?', [id]);
    const assetsToDestroy = [];
    for (const r of imgRows) {
      if (r.image_url && r.image_url.includes('cloudinary.com')) {
        assetsToDestroy.push({ url: r.image_url, resourceType: 'image' });
      }
    }
    if (propRow.video_url && String(propRow.video_url).includes('cloudinary.com')) {
      assetsToDestroy.push({ url: propRow.video_url, resourceType: 'video' });
    }
    const cf = parseJsonSafe(propRow.custom_fields, {});
    if (cf?._mediaMeta?.floorPlanUrl && String(cf._mediaMeta.floorPlanUrl).includes('cloudinary.com')) {
      assetsToDestroy.push({
        url: cf._mediaMeta.floorPlanUrl,
        publicId: cf._mediaMeta.floorPlanPublicId,
        resourceType: 'image',
      });
    }

    await pool.execute('DELETE FROM properties WHERE id = ?', [id]);
    if (assetsToDestroy.length > 0) {
      Promise.allSettled(assetsToDestroy.map((a) => destroyFromCloudinary(a))).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Propriété et ses médias supprimés avec succès.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mettre à jour le statut du cycle de vie de l'annonce
 * PUT/PATCH /api/properties/:id/status
 * Statuts stricts : DRAFT, PENDING_REVIEW, PUBLISHED, RENTED, SOLD, ARCHIVED
 */
async function updatePropertyListingStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RENTED', 'SOLD', 'ARCHIVED'];
    const targetStatus = String(status || '').toUpperCase();

    if (!validStatuses.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Statuts autorisés : ${validStatuses.join(', ')}`
      });
    }

    const [existing] = await pool.execute('SELECT * FROM properties WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }

    const prop = existing[0];
    const isOwner = prop.agent_id === req.user?.id;
    const isSameAgency = req.user?.agency_id && prop.agency_id === req.user.agency_id;
    const canManage = isOwner || (isSameAgency && ['agency_owner', 'agency_manager'].includes(req.user?.agency_role)) || req.user?.role === 'admin';

    if (!canManage) {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier le statut de cette annonce.'
      });
    }

    if (targetStatus === 'PUBLISHED') {
      const [imgCountRows] = await pool.execute('SELECT COUNT(*) AS cnt FROM property_images WHERE property_id = ?', [id]);
      const imgCount = Number(imgCountRows[0]?.cnt || 0);
      if (imgCount < MIN_PROPERTY_PHOTOS) {
        return res.status(400).json({
          success: false,
          message: `Impossible de publier : au moins ${MIN_PROPERTY_PHOTOS} photos sont requises (actuellement ${imgCount}).`,
        });
      }
    }

    const cf = parseJsonSafe(prop.custom_fields, {});
    cf._mediaMeta = { ...(cf._mediaMeta || {}), listingStatus: targetStatus };

    const legacyStatus = targetStatus === 'SOLD' ? 'sold' : (targetStatus === 'RENTED' ? 'for-rent' : prop.status);
    const published = targetStatus === 'PUBLISHED' ? 1 : 0;

    await pool.execute(
      'UPDATE properties SET status = ?, published = ?, custom_fields = ? WHERE id = ?',
      [legacyStatus, published, JSON.stringify(cf), id]
    );

    res.json({
      success: true,
      message: `Statut de l'annonce mis à jour vers ${targetStatus}.`,
      listingStatus: targetStatus,
      isAvailable: targetStatus === 'PUBLISHED'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Téléverser une vidéo pour une propriété
 * POST /api/properties/upload-video
 */
async function uploadPropertyVideo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier vidéo reçu.' });
    }
    const publicUrl = `/uploads/videos/${req.file.filename}`;
    res.json({
      success: true,
      message: 'Vidéo téléversée avec succès.',
      url: publicUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyListingStatus,
  uploadPropertyVideo
};
