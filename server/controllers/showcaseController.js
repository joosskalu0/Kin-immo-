const pool = require('../config/database');

/**
 * Contrôleur des Projets d'Exception & Mises en Avant (Hero Showcase Safricode Style)
 */

// 1. Obtenir les diapositives actives pour le carrousel public d'accueil
async function getPublicSlides(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        id,
        badge_category AS badgeCategory,
        badge_location AS badgeLocation,
        title,
        subtitle AS subTitle,
        description,
        image_url AS image,
        property_type AS propertyType,
        commune,
        property_id AS propertyId,
        is_active AS isActive,
        display_order AS \`order\`,
        contact_name AS contactName,
        contact_phone AS contactPhone,
        contact_whatsapp AS contactWhatsapp,
        contact_email AS contactEmail,
        contact_role AS contactRole,
        legal_status AS legalStatus,
        floors,
        units,
        parking,
        surface,
        amenities,
        price_info AS priceInfo,
        delivery_date AS deliveryDate
      FROM hero_showcase_slides
      WHERE is_active = TRUE
      ORDER BY display_order ASC`
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
        badgeCategory: r.badgeCategory,
        badgeLocation: r.badgeLocation,
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
        }
      };
    });

    res.json({ success: true, slides: formattedSlides });
  } catch (error) {
    next(error);
  }
}

// 2. Obtenir toutes les diapositives (y compris inactives) pour l'espace administrateur
async function getAllSlidesForAdmin(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        id,
        badge_category AS badgeCategory,
        badge_location AS badgeLocation,
        title,
        subtitle AS subTitle,
        description,
        image_url AS image,
        property_type AS propertyType,
        commune,
        property_id AS propertyId,
        is_active AS isActive,
        display_order AS \`order\`,
        contact_name AS contactName,
        contact_phone AS contactPhone,
        contact_whatsapp AS contactWhatsapp,
        contact_email AS contactEmail,
        contact_role AS contactRole,
        legal_status AS legalStatus,
        floors,
        units,
        parking,
        surface,
        amenities,
        price_info AS priceInfo,
        delivery_date AS deliveryDate,
        created_at,
        updated_at
      FROM hero_showcase_slides
      ORDER BY display_order ASC`
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
        badgeCategory: r.badgeCategory,
        badgeLocation: r.badgeLocation,
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
        }
      };
    });

    res.json({ success: true, slides: formattedSlides });
  } catch (error) {
    next(error);
  }
}

// 3. Créer une nouvelle diapositive d'exception
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

    if (!title || !description || !image) {
      return res.status(400).json({
        success: false,
        message: 'Le titre, le descriptif et l\'image sont obligatoires.'
      });
    }

    const amenitiesJson = JSON.stringify(details.amenities || []);

    await pool.execute(
      `INSERT INTO hero_showcase_slides 
       (id, badge_category, badge_location, title, subtitle, description, image_url, property_type, commune, property_id, is_active, display_order, contact_name, contact_phone, contact_whatsapp, contact_email, contact_role, legal_status, floors, units, parking, surface, amenities, price_info, delivery_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        badgeCategory,
        badgeLocation,
        title,
        subTitle || `${propertyType.toUpperCase()} D'EXCEPTION`,
        description,
        image,
        propertyType,
        commune,
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
      message: 'Projet d\'exception ajouté à la vitrine Hero.',
      slideId: id
    });
  } catch (error) {
    next(error);
  }
}

// 4. Mettre à jour une diapositive d'exception
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

    res.json({ success: true, message: 'Diapositive mise à jour avec succès.' });
  } catch (error) {
    next(error);
  }
}

// 5. Supprimer une diapositive de la vitrine
async function deleteSlide(req, res, next) {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM hero_showcase_slides WHERE id = ?', [id]);
    res.json({ success: true, message: 'Projet retiré de la vitrine Hero.' });
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
