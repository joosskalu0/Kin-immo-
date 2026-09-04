const pool = require('../config/database');

/**
 * Liste des agences partenaires Kinimmo
 * GET /api/agencies
 */
async function getAgencies(req, res, next) {
  try {
    const { commune, search } = req.query;

    let sql = `
      SELECT ag.*,
             (SELECT COUNT(*) FROM agents WHERE agency_id = ag.id) as agents_count,
             (SELECT COUNT(*) FROM properties WHERE agency_id = ag.id AND published = TRUE AND status != 'sold') as properties_count
      FROM agencies ag
      WHERE ag.is_hidden = FALSE
    `;
    const params = [];

    if (commune && commune !== 'all') {
      sql += ' AND LOWER(ag.commune) = LOWER(?)';
      params.push(commune);
    }

    if (search && search.trim() !== '') {
      sql += ' AND (ag.name LIKE ? OR ag.description LIKE ? OR ag.address LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY ag.is_verified DESC, properties_count DESC';

    const [rows] = await pool.query(sql, params);

    const agencies = rows.map(r => ({
      id: r.id,
      name: r.name,
      logo: r.logo,
      address: r.address,
      city: r.city,
      commune: r.commune,
      phone: r.phone,
      whatsapp: r.whatsapp,
      email: r.email,
      website: r.website,
      managerName: r.manager_name,
      rccm: r.rccm,
      idNat: r.id_nat,
      nif: r.nif,
      description: r.description,
      isVerified: Boolean(r.is_verified),
      agentsCount: r.agents_count,
      propertiesCount: r.properties_count
    }));

    res.json({ success: true, count: agencies.length, agencies });
  } catch (error) {
    next(error);
  }
}

/**
 * Détails d'une agence avec ses agents et propriétés
 * GET /api/agencies/:id
 */
async function getAgencyById(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute('SELECT * FROM agencies WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agence introuvable.' });
    }

    const ag = rows[0];

    // Liste des agents rattachés
    const [agents] = await pool.execute(
      'SELECT id, name, title, email, phone, whatsapp, avatar, rating FROM agents WHERE agency_id = ? AND is_hidden = FALSE',
      [id]
    );

    // Liste des propriétés de l'agence
    const [properties] = await pool.execute(
      `SELECT p.id, p.title, p.price, p.currency, p.status, p.type, p.commune, p.bedrooms, p.bathrooms, p.area,
              (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY display_order ASC LIMIT 1) as thumbnail
       FROM properties p
       WHERE p.agency_id = ? AND p.published = TRUE AND p.status != 'sold'
       ORDER BY p.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      agency: {
        ...ag,
        isVerified: Boolean(ag.is_verified),
        agents,
        properties
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mettre à jour l'agence
 * PUT /api/agencies/:id
 */
async function updateAgency(req, res, next) {
  try {
    const { id } = req.params;
    const { name, address, commune, phone, whatsapp, email, website, description, logo, rccm, idNat, nif, managerName } = req.body;

    // Vérifier les droits
    const [existing] = await pool.execute('SELECT owner_user_id FROM agencies WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Agence introuvable.' });
    }

    if (existing[0].owner_user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Non autorisé à modifier cette agence.' });
    }

    await pool.execute(
      `UPDATE agencies
       SET name = COALESCE(?, name),
           address = COALESCE(?, address),
           commune = COALESCE(?, commune),
           phone = COALESCE(?, phone),
           whatsapp = COALESCE(?, whatsapp),
           email = COALESCE(?, email),
           website = COALESCE(?, website),
           description = COALESCE(?, description),
           logo = COALESCE(?, logo),
           rccm = COALESCE(?, rccm),
           id_nat = COALESCE(?, id_nat),
           nif = COALESCE(?, nif),
           manager_name = COALESCE(?, manager_name)
       WHERE id = ?`,
      [name || null, address || null, commune || null, phone || null, whatsapp || null, email || null, website || null, description || null, logo || null, rccm || null, idNat || null, nif || null, managerName || null, id]
    );

    res.json({ success: true, message: 'Agence mise à jour avec succès.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAgencies,
  getAgencyById,
  updateAgency
};
