const pool = require('../config/database');

/**
 * Contrôleur Officiel de la Vitrine Kinimmo Prestige & Mises en Avant
 * 
 * RÈGLES STRICTES DE LA VITRINE :
 * 1. Affiche EXCLUSIVEMENT les biens immobiliers validés et autorisés par l'administrateur.
 * 2. Un bien ne doit JAMAIS apparaître automatiquement dans la vitrine.
 * 3. Le bien doit exister dans MySQL (INNER JOIN properties).
 * 4. Le bien doit être publié (p.published = 1).
 * 5. Le bien doit avoir été validé par l'administrateur (p.featured = 1).
 * 6. La période de mise en avant doit être active (p.boost_expires_at > NOW()).
 * 7. Le bien ne doit pas être vendu, supprimé, suspendu ou expiré (status NOT IN ('sold', 'archived', 'draft', 'suspended', 'rented')).
 * 8. Aucun faux bien / slide de test en dur ne doit être injecté.
 */

// 1. Obtenir les diapositives actives pour le carrousel public d'accueil
async function getPublicSlides(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        s.id,
        s.badge_category AS badgeCategory,
        s.badge_location AS badgeLocation,
        COALESCE(NULLIF(s.title, ''), p.title) AS title,
        COALESCE(NULLIF(s.subtitle, ''), CONCAT(UPPER(COALESCE(p.type, 'RÉSIDENCE')), ' D\\'EXCEPTION')) AS subTitle,
        COALESCE(NULLIF(s.description, ''), p.description) AS description,
        COALESCE(
          NULLIF(s.image_url, ''),
          (SELECT pi.image_url FROM property_images pi WHERE pi.property_id = p.id AND pi.is_featured = TRUE LIMIT 1),
          (SELECT pi.image_url FROM property_images pi WHERE pi.property_id = p.id ORDER BY pi.display_order ASC LIMIT 1)
        ) AS image,
        COALESCE(NULLIF(s.property_type, ''), p.type) AS propertyType,
        COALESCE(NULLIF(s.commune, ''), p.commune) AS commune,
        p.id AS propertyId,
        s.is_active AS isActive,
        s.display_order AS \`order\`,
        COALESCE(NULLIF(s.contact_name, ''), ag.name, u.name, 'Conseiller Kinimmo') AS contactName,
        COALESCE(NULLIF(s.contact_phone, ''), ag.phone, u.phone, '+243 81 000 0001') AS contactPhone,
        COALESCE(NULLIF(s.contact_whatsapp, ''), ag.whatsapp, u.whatsapp, '+243 81 000 0001') AS contactWhatsapp,
        COALESCE(NULLIF(s.contact_email, ''), ag.email, u.email, 'contact@kinimmo.cd') AS contactEmail,
        COALESCE(NULLIF(s.contact_role, ''), ag.name, 'Agence Mandataire Agréée') AS contactRole,
        COALESCE(NULLIF(s.legal_status, ''), 'Titre Foncier Définitif & Certificat d\\'Enregistrement Notarié') AS legalStatus,
        COALESCE(NULLIF(s.floors, ''), 'Standing') AS floors,
        COALESCE(NULLIF(s.units, ''), CONCAT(p.bedrooms, ' Chambres')) AS units,
        COALESCE(NULLIF(s.parking, ''), CONCAT(p.bathrooms, ' Salles d\\'eau')) AS parking,
        COALESCE(NULLIF(s.surface, ''), CONCAT(p.area, ' m²')) AS surface,
        COALESCE(s.amenities, p.amenities) AS amenities,
        COALESCE(NULLIF(s.price_info, ''), CONCAT('$', FORMAT(p.price, 0), CASE WHEN p.period = 'month' THEN '/mois' ELSE '' END)) AS priceInfo,
        COALESCE(NULLIF(s.delivery_date, ''), 'Disponible immédiatement') AS deliveryDate,
        p.boost_expires_at AS boostExpiresAt
      FROM hero_showcase_slides s
      INNER JOIN properties p ON s.property_id = p.id
      LEFT JOIN users u ON p.agent_id = u.id
      LEFT JOIN agencies ag ON p.agency_id = ag.id
      WHERE s.is_active = TRUE
        AND (p.published = TRUE OR p.published = 1)
        AND p.status NOT IN ('sold', 'archived', 'draft', 'suspended', 'rented')
        AND (p.featured = TRUE OR p.featured = 1)
        AND (p.boost_expires_at IS NULL OR p.boost_expires_at > NOW())
      ORDER BY s.display_order ASC, s.created_at DESC`
    );

    const formattedSlides = rows.map((r) => {
      let parsedAmenities = [];
      if (typeof r.amenities === 'string') {
        try {
          parsedAmenities = JSON.parse(r.amenities);
        } catch {
          parsedAmenities = [];
        }
      } else if (Array.isArray(r.amenities)) {
        parsedAmenities = r.amenities;
      }

      return {
        id: r.id,
        badgeCategory: r.badgeCategory || 'RÉSIDENTIEL DE STANDING',
        badgeLocation: r.badgeLocation || `${(r.commune || 'KINSHASA').toUpperCase()}`,
        title: r.title,
        subTitle: r.subTitle,
        description: r.description,
        image: r.image,
        propertyType: r.propertyType,
        commune: r.commune,
        propertyId: r.propertyId,
        isActive: Boolean(r.isActive),
        order: r.order,
        contactName: r.contactName,
        contactPhone: r.contactPhone,
        contactWhatsapp: r.contactWhatsapp,
        contactEmail: r.contactEmail,
        contactRole: r.contactRole,
        legalStatus: r.legalStatus,
        stats: {
          floors: r.floors,
          units: r.units,
          parking: r.parking,
          surface: r.surface
        },
        details: {
          amenities: parsedAmenities,
          priceInfo: r.priceInfo,
          deliveryDate: r.deliveryDate
        },
        boostExpiresAt: r.boostExpiresAt
      };
    });

    // Retourne exclusivement les biens validés (tableau vide si aucun bien actif en vitrine)
    res.json({ success: true, count: formattedSlides.length, slides: formattedSlides });
  } catch (error) {
    console.error('[Showcase] Erreur lors de la récupération des slides de la vitrine :', error.message);
    res.json({ success: true, count: 0, slides: [] });
  }
}

// 2. Obtenir toutes les diapositives (y compris inactives et détails du bien) pour l'espace administrateur
async function getAllSlidesForAdmin(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        s.*,
        p.title AS property_title,
        p.status AS property_status,
        p.published AS property_published,
        p.featured AS property_featured,
        p.boost_expires_at AS property_boost_expires_at,
        p.price AS property_price,
        p.currency AS property_currency,
        u.name AS agent_name,
        u.email AS agent_email,
        u.phone AS agent_phone
      FROM hero_showcase_slides s
      LEFT JOIN properties p ON s.property_id = p.id
      LEFT JOIN users u ON p.agent_id = u.id
      ORDER BY s.display_order ASC, s.created_at DESC`
    );

    const formattedSlides = rows.map((r) => {
      let parsedAmenities = [];
      if (typeof r.amenities === 'string') {
        try {
          parsedAmenities = JSON.parse(r.amenities);
        } catch {
          parsedAmenities = [];
        }
      } else if (Array.isArray(r.amenities)) {
        parsedAmenities = r.amenities;
      }

      return {
        id: r.id,
        badgeCategory: r.badge_category,
        badgeLocation: r.badge_location,
        title: r.title,
        subTitle: r.subtitle,
        description: r.description,
        image: r.image_url,
        propertyType: r.property_type,
        commune: r.commune,
        propertyId: r.property_id,
        isActive: Boolean(r.is_active),
        order: r.display_order,
        contactName: r.contact_name,
        contactPhone: r.contact_phone,
        contactWhatsapp: r.contact_whatsapp,
        contactEmail: r.contact_email,
        contactRole: r.contact_role,
        legalStatus: r.legal_status,
        stats: {
          floors: r.floors,
          units: r.units,
          parking: r.parking,
          surface: r.surface
        },
        details: {
          amenities: parsedAmenities,
          priceInfo: r.price_info,
          deliveryDate: r.delivery_date
        },
        property: r.property_id ? {
          id: r.property_id,
          title: r.property_title,
          status: r.property_status,
          published: Boolean(r.property_published),
          featured: Boolean(r.property_featured),
          boostExpiresAt: r.property_boost_expires_at,
          price: r.property_price,
          currency: r.property_currency,
          agentName: r.agent_name,
          agentEmail: r.agent_email,
          agentPhone: r.agent_phone
        } : null
      };
    });

    res.json({ success: true, slides: formattedSlides });
  } catch (error) {
    console.error('[Showcase Admin] Erreur lors de la récupération des slides admin :', error.message);
    res.json({ success: true, slides: [] });
  }
}

// 3. Créer ou associer une diapositive d'exception (Admin uniquement)
async function createSlide(req, res, next) {
  try {
    const {
      id = `slide_${Date.now()}`,
      badgeCategory = 'RÉSIDENTIEL DE STANDING',
      badgeLocation = 'GOMBE, KINSHASA',
      title,
      subTitle,
      description,
      image,
      propertyType = 'Résidence',
      commune = 'Gombe',
      propertyId = null,
      isActive = true,
      order = 1,
      contactName = null,
      contactPhone = null,
      contactWhatsapp = null,
      contactEmail = null,
      contactRole = null,
      legalStatus = null,
      stats = {},
      details = {}
    } = req.body;

    if (!propertyId && !title) {
      return res.status(400).json({
        success: false,
        message: 'Un bien immobilier associé (propertyId) ou un titre est obligatoire.'
      });
    }

    let finalTitle = title;
    let finalDescription = description;
    let finalImage = image;
    let finalCommune = commune;
    let finalType = propertyType;

    // Si lié à une propriété, vérifier que le bien existe et synchroniser ses attributs
    if (propertyId) {
      const [props] = await pool.execute('SELECT * FROM properties WHERE id = ? LIMIT 1', [propertyId]);
      if (props.length === 0) {
        return res.status(404).json({ success: false, message: 'Le bien immobilier indiqué n\'existe pas dans MySQL.' });
      }
      const prop = props[0];

      if (!finalTitle) finalTitle = prop.title;
      if (!finalDescription) finalDescription = prop.description;
      if (!finalCommune) finalCommune = prop.commune;
      if (!finalType) finalType = prop.type;

      // Récupérer l'image de la propriété si non fournie
      if (!finalImage) {
        const [images] = await pool.execute(
          'SELECT image_url FROM property_images WHERE property_id = ? ORDER BY is_featured DESC, display_order ASC LIMIT 1',
          [propertyId]
        );
        if (images.length > 0) {
          finalImage = images[0].image_url;
        }
      }

      // Valider et activer le statut featured sur la propriété pour la vitrine
      await pool.execute(
        `UPDATE properties 
         SET featured = TRUE, 
             published = TRUE,
             boost_expires_at = COALESCE(boost_expires_at, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 30 DAY))
         WHERE id = ?`,
        [propertyId]
      );
    }

    if (!finalTitle || !finalImage) {
      return res.status(400).json({
        success: false,
        message: 'Titre et visuel HD requis pour projeter le bien en vitrine.'
      });
    }

    const amenitiesJson = JSON.stringify(details.amenities || []);

    await pool.execute(
      `INSERT INTO hero_showcase_slides 
       (id, badge_category, badge_location, title, subtitle, description, image_url, property_type, commune, property_id, is_active, display_order, contact_name, contact_phone, contact_whatsapp, contact_email, contact_role, legal_status, floors, units, parking, surface, amenities, price_info, delivery_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         badge_category = VALUES(badge_category),
         badge_location = VALUES(badge_location),
         title = VALUES(title),
         subtitle = VALUES(subtitle),
         description = VALUES(description),
         image_url = VALUES(image_url),
         property_type = VALUES(property_type),
         commune = VALUES(commune),
         is_active = VALUES(is_active),
         display_order = VALUES(display_order),
         contact_name = VALUES(contact_name),
         contact_phone = VALUES(contact_phone),
         contact_whatsapp = VALUES(contact_whatsapp),
         contact_email = VALUES(contact_email),
         contact_role = VALUES(contact_role),
         legal_status = VALUES(legal_status),
         floors = VALUES(floors),
         units = VALUES(units),
         parking = VALUES(parking),
         surface = VALUES(surface),
         amenities = VALUES(amenities),
         price_info = VALUES(price_info),
         delivery_date = VALUES(delivery_date)`,
      [
        id,
        badgeCategory,
        badgeLocation,
        finalTitle,
        subTitle || `${(finalType || 'RÉSIDENCE').toUpperCase()} D'EXCEPTION`,
        finalDescription || 'Bien immobilier de grand standing validé par la modération Kinimmo.',
        finalImage,
        finalType,
        finalCommune,
        propertyId || null,
        isActive !== undefined ? Boolean(isActive) : true,
        order || 1,
        contactName || null,
        contactPhone || null,
        contactWhatsapp || null,
        contactEmail || null,
        contactRole || null,
        legalStatus || null,
        stats.floors || null,
        stats.units || null,
        stats.parking || null,
        stats.surface || null,
        amenitiesJson,
        details.priceInfo || null,
        details.deliveryDate || 'Disponible immédiatement'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Projet immobilier validé et projeté dans la Vitrine Kinimmo Prestige.',
      slideId: id
    });
  } catch (error) {
    next(error);
  }
}

// 4. Mettre à jour une diapositive de vitrine (Admin uniquement)
async function updateSlide(req, res, next) {
  try {
    const { id } = req.params;
    const body = req.body;

    const [existing] = await pool.execute('SELECT * FROM hero_showcase_slides WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Diapositive introuvable.' });
    }

    const current = existing[0];
    const badgeCategory = body.badgeCategory !== undefined ? body.badgeCategory : current.badge_category;
    const badgeLocation = body.badgeLocation !== undefined ? body.badgeLocation : current.badge_location;
    const title = body.title !== undefined ? body.title : current.title;
    const subtitle = body.subTitle !== undefined ? body.subTitle : current.subtitle;
    const description = body.description !== undefined ? body.description : current.description;
    const imageUrl = body.image !== undefined ? body.image : current.image_url;
    const propertyType = body.propertyType !== undefined ? body.propertyType : current.property_type;
    const commune = body.commune !== undefined ? body.commune : current.commune;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : Boolean(current.is_active);
    const displayOrder = body.order !== undefined ? body.order : current.display_order;

    const contactName = body.contactName !== undefined ? body.contactName : current.contact_name;
    const contactPhone = body.contactPhone !== undefined ? body.contactPhone : current.contact_phone;
    const contactWhatsapp = body.contactWhatsapp !== undefined ? body.contactWhatsapp : current.contact_whatsapp;
    const contactEmail = body.contactEmail !== undefined ? body.contactEmail : current.contact_email;
    const contactRole = body.contactRole !== undefined ? body.contactRole : current.contact_role;
    const legalStatus = body.legalStatus !== undefined ? body.legalStatus : current.legal_status;

    const floors = body.stats?.floors !== undefined ? body.stats.floors : current.floors;
    const units = body.stats?.units !== undefined ? body.stats.units : current.units;
    const parking = body.stats?.parking !== undefined ? body.stats.parking : current.parking;
    const surface = body.stats?.surface !== undefined ? body.stats.surface : current.surface;

    const amenities = body.details?.amenities !== undefined ? JSON.stringify(body.details.amenities) : current.amenities;
    const priceInfo = body.details?.priceInfo !== undefined ? body.details.priceInfo : current.price_info;
    const deliveryDate = body.details?.deliveryDate !== undefined ? body.details.deliveryDate : current.delivery_date;

    await pool.execute(
      `UPDATE hero_showcase_slides
       SET badge_category = ?, badge_location = ?, title = ?, subtitle = ?, description = ?,
           image_url = ?, property_type = ?, commune = ?, is_active = ?, display_order = ?,
           contact_name = ?, contact_phone = ?, contact_whatsapp = ?, contact_email = ?, contact_role = ?, legal_status = ?,
           floors = ?, units = ?, parking = ?, surface = ?, amenities = ?, price_info = ?, delivery_date = ?
       WHERE id = ?`,
      [
        badgeCategory,
        badgeLocation,
        title,
        subtitle,
        description,
        imageUrl,
        propertyType,
        commune,
        isActive,
        displayOrder,
        contactName,
        contactPhone,
        contactWhatsapp,
        contactEmail,
        contactRole,
        legalStatus,
        floors,
        units,
        parking,
        surface,
        amenities,
        priceInfo,
        deliveryDate,
        id
      ]
    );

    // Si on désactive la slide et qu'un bien y est lié, mettre à jour le flag featured
    if (current.property_id && isActive === false) {
      await pool.execute('UPDATE properties SET featured = FALSE WHERE id = ?', [current.property_id]);
    } else if (current.property_id && isActive === true) {
      await pool.execute('UPDATE properties SET featured = TRUE WHERE id = ?', [current.property_id]);
    }

    res.json({ success: true, message: 'Diapositive de vitrine mise à jour avec succès.' });
  } catch (error) {
    next(error);
  }
}

// 5. Supprimer une diapositive de la vitrine
async function deleteSlide(req, res, next) {
  try {
    const { id } = req.params;
    const [existing] = await pool.execute('SELECT property_id FROM hero_showcase_slides WHERE id = ?', [id]);
    
    await pool.execute('DELETE FROM hero_showcase_slides WHERE id = ?', [id]);

    if (existing.length > 0 && existing[0].property_id) {
      // Retirer le statut featured de la propriété
      await pool.execute('UPDATE properties SET featured = FALSE WHERE id = ?', [existing[0].property_id]);
    }

    res.json({ success: true, message: 'Projet retiré définitivement de la vitrine.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPublicSlides,
  getAllSlidesForAdmin,
  createSlide,
  updateSlide,
  deleteSlide
};
