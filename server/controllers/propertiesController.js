const pool = require('../config/database');

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
      limit = 50,
      offset = 0
    } = req.query;

    let sql = `
      SELECT p.*,
             u.name as agent_name, u.email as agent_email, u.phone as agent_phone, u.whatsapp as agent_whatsapp,
             ag.name as agency_title, ag.logo as agency_logo,
             (
               SELECT JSON_ARRAYAGG(image_url)
               FROM property_images
               WHERE property_id = p.id
               ORDER BY display_order ASC
             ) as images_list
      FROM properties p
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN agencies ag ON p.agency_id = ag.id
      WHERE p.published = TRUE
    `;

    const params = [];

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

    // Formattage des champs JSON (amenities, custom_fields, images) pour le frontend React
    const formatted = rows.map((row) => ({
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
      amenities: typeof row.amenities === 'string' ? JSON.parse(row.amenities) : (row.amenities || []),
      customFields: typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : (row.custom_fields || {}),
      images: row.images_list || [],
      videoUrl: row.video_url,
      virtualTourUrl: row.virtual_tour_url,
      agentId: row.agent_id,
      agencyId: row.agency_id,
      agencyName: row.agency_title,
      agencyLogo: row.agency_logo,
      agentName: row.agent_name,
      agentPhone: row.agent_phone,
      agentWhatsapp: row.agent_whatsapp,
      viewsCount: row.views_count,
      featured: Boolean(row.featured),
      published: Boolean(row.published),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json({
      success: true,
      count: formatted.length,
      properties: formatted
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

    // Récupérer les images associées
    const [imagesRows] = await pool.execute(
      'SELECT image_url FROM property_images WHERE property_id = ? ORDER BY display_order ASC',
      [id]
    );
    const images = imagesRows.map(img => img.image_url);

    // Incrémenter le compteur de vues
    await pool.execute('UPDATE properties SET views_count = views_count + 1 WHERE id = ?', [id]);

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
      customFields: typeof row.custom_fields === 'string' ? JSON.parse(row.custom_fields) : (row.custom_fields || {}),
      images: images.length > 0 ? images : [],
      videoUrl: row.video_url,
      virtualTourUrl: row.virtual_tour_url,
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

    // Insertion principale
    await connection.execute(
      `INSERT INTO properties (
        id, title, description, price, currency, period, type, status, category,
        address, city, commune, quartier, avenue, reference_point, zip_code, country,
        lat, lng, bedrooms, bathrooms, area, year_built, garages,
        amenities, custom_fields, video_url, virtual_tour_url, agent_id, agency_id, featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        JSON.stringify(p.customFields || {}),
        p.videoUrl || null,
        p.virtualTourUrl || null,
        req.user.id,
        req.user.agency_id || null,
        Boolean(p.featured)
      ]
    );

    // Insertion des images dans la table property_images
    if (Array.isArray(p.images) && p.images.length > 0) {
      for (let i = 0; i < p.images.length; i++) {
        await connection.execute(
          'INSERT INTO property_images (property_id, image_url, display_order, is_featured) VALUES (?, ?, ?, ?)',
          [propertyId, p.images[i], i, i === 0]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Propriété enregistrée avec succès dans la base MySQL.',
      propertyId
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

    // Vérifier les droits (Seul le propriétaire ou l'administrateur peut modifier)
    const [existing] = await connection.execute('SELECT agent_id FROM properties WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }

    if (existing[0].agent_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette annonce.' });
    }

    await connection.beginTransaction();

    await connection.execute(
      `UPDATE properties
       SET title = COALESCE(?, title),
           description = COALESCE(?, description),
           price = COALESCE(?, price),
           currency = COALESCE(?, currency),
           status = COALESCE(?, status),
           type = COALESCE(?, type),
           commune = COALESCE(?, commune),
           quartier = COALESCE(?, quartier),
           address = COALESCE(?, address),
           bedrooms = COALESCE(?, bedrooms),
           bathrooms = COALESCE(?, bathrooms),
           area = COALESCE(?, area),
           amenities = COALESCE(?, amenities),
           custom_fields = COALESCE(?, custom_fields),
           featured = COALESCE(?, featured)
       WHERE id = ?`,
      [
        p.title || null,
        p.description || null,
        p.price || null,
        p.currency || null,
        p.status || null,
        p.type || null,
        p.commune || null,
        p.quartier || null,
        p.address || null,
        p.bedrooms !== undefined ? p.bedrooms : null,
        p.bathrooms !== undefined ? p.bathrooms : null,
        p.area !== undefined ? p.area : null,
        p.amenities ? JSON.stringify(p.amenities) : null,
        p.customFields ? JSON.stringify(p.customFields) : null,
        p.featured !== undefined ? Boolean(p.featured) : null,
        id
      ]
    );

    // Mise à jour des images si fournies
    if (Array.isArray(p.images)) {
      await connection.execute('DELETE FROM property_images WHERE property_id = ?', [id]);
      for (let i = 0; i < p.images.length; i++) {
        await connection.execute(
          'INSERT INTO property_images (property_id, image_url, display_order, is_featured) VALUES (?, ?, ?, ?)',
          [id, p.images[i], i, i === 0]
        );
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Propriété mise à jour avec succès.'
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

    const [existing] = await pool.execute('SELECT agent_id FROM properties WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }

    if (existing[0].agent_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé à supprimer cette annonce.' });
    }

    // Grâce aux clés étrangères ON DELETE CASCADE, les images et favoris liés sont automatiquement supprimés
    await pool.execute('DELETE FROM properties WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Propriété et ses images supprimées avec succès.'
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
  deleteProperty
};
