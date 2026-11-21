const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { hammingDistanceHex64 } = require('../services/cloudinaryRestService');

function parseJsonSafe(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

/**
 * POST /api/media/check-fingerprint
 * Détecte si des empreintes perceptuelles dHash ou URLs d'images sont déjà utilisées sur d'autres annonces.
 */
router.post('/check-fingerprint', authenticateToken, async (req, res, next) => {
  try {
    const fingerprints = Array.isArray(req.body?.fingerprints)
      ? req.body.fingerprints.map((f) => String(f || '').trim().toLowerCase()).filter((f) => f.length === 16)
      : [];
    const imageUrls = Array.isArray(req.body?.imageUrls)
      ? req.body.imageUrls.map((u) => String(u || '').trim()).filter(Boolean)
      : [];
    const excludePropertyId = req.body?.excludePropertyId ? String(req.body.excludePropertyId) : null;

    if (fingerprints.length === 0 && imageUrls.length === 0) {
      return res.json({ success: true, duplicateDetected: false, matches: [] });
    }

    const [rows] = await pool.query(
      'SELECT id, title, agent_id, custom_fields FROM properties WHERE (? IS NULL OR id != ?)',
      [excludePropertyId, excludePropertyId]
    );

    const matchesMap = new Map();

    // 1. Comparer les URLs directes dans property_images
    if (imageUrls.length > 0) {
      const placeholders = imageUrls.map(() => '?').join(',');
      const [imgRows] = await pool.query(
        `SELECT pi.property_id, pi.image_url, p.title, p.agent_id
         FROM property_images pi
         INNER JOIN properties p ON p.id = pi.property_id
         WHERE pi.image_url IN (${placeholders}) AND (? IS NULL OR pi.property_id != ?)`,
        [...imageUrls, excludePropertyId, excludePropertyId]
      );
      for (const r of imgRows) {
        if (!matchesMap.has(r.property_id)) {
          matchesMap.set(r.property_id, {
            propertyId: r.property_id,
            propertyTitle: r.title,
            agentId: r.agent_id,
            imageUrl: r.image_url,
            distance: 0,
          });
        }
      }
    }

    // 2. Comparer les empreintes dHash stockées dans custom_fields._mediaMeta.fingerprints
    if (fingerprints.length > 0) {
      for (const row of rows) {
        const cf = parseJsonSafe(row.custom_fields, {});
        const storedFingerprints = Array.isArray(cf?._mediaMeta?.fingerprints)
          ? cf._mediaMeta.fingerprints
          : Array.isArray(cf?._mediaMeta?.imagesMeta)
          ? cf._mediaMeta.imagesMeta.map((m) => m?.fingerprint).filter(Boolean)
          : [];

        for (const incomingFp of fingerprints) {
          for (const existingFp of storedFingerprints) {
            const dist = hammingDistanceHex64(incomingFp, String(existingFp || '').toLowerCase());
            if (dist <= 6 && !matchesMap.has(row.id)) {
              matchesMap.set(row.id, {
                propertyId: row.id,
                propertyTitle: row.title,
                agentId: row.agent_id,
                distance: dist,
              });
            }
          }
        }
      }
    }

    const matches = Array.from(matchesMap.values());
    return res.json({
      success: true,
      duplicateDetected: matches.length > 0,
      matches,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
