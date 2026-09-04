const pool = require('../config/database');

/**
 * Liste de tous les agents publics Kinimmo
 * GET /api/agents
 */
async function getAgents(req, res, next) {
  try {
    const { search } = req.query;

    let sql = `
      SELECT a.*, ag.name as agency_name, ag.logo as agency_logo,
             (SELECT COUNT(*) FROM properties WHERE agent_id = a.user_id AND published = TRUE AND status != 'sold') as listings_count
      FROM agents a
      LEFT JOIN agencies ag ON a.agency_id = ag.id
      WHERE a.is_hidden = FALSE
    `;
    const params = [];

    if (search && search.trim() !== '') {
      sql += ' AND (a.name LIKE ? OR a.title LIKE ? OR a.email LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    sql += ' ORDER BY a.rating DESC, a.review_count DESC';

    const [rows] = await pool.query(sql, params);

    const agents = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      title: r.title,
      email: r.email,
      phone: r.phone,
      whatsapp: r.whatsapp,
      avatar: r.avatar,
      agencyId: r.agency_id,
      agencyName: r.agency_name,
      agencyLogo: r.agency_logo,
      bio: r.bio,
      rating: Number(r.rating),
      reviewCount: r.review_count,
      listingsCount: r.listings_count,
      isVerified: Boolean(r.is_verified),
      specialties: typeof r.specialties === 'string' ? JSON.parse(r.specialties) : (r.specialties || []),
      languages: typeof r.languages === 'string' ? JSON.parse(r.languages) : (r.languages || ['Français', 'Lingala'])
    }));

    res.json({ success: true, count: agents.length, agents });
  } catch (error) {
    next(error);
  }
}

/**
 * Détails d'un agent avec ses annonces actives
 * GET /api/agents/:id
 */
async function getAgentById(req, res, next) {
  try {
    const { id } = req.params;

    const [rows] = await pool.execute(
      `SELECT a.*, ag.name as agency_name, ag.logo as agency_logo, ag.phone as agency_phone
       FROM agents a
       LEFT JOIN agencies ag ON a.agency_id = ag.id
       WHERE a.id = ? OR a.user_id = ? LIMIT 1`,
      [id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent introuvable.' });
    }

    const r = rows[0];

    // Récupérer les annonces publiées de cet agent
    const [propRows] = await pool.execute(
      `SELECT p.id, p.title, p.price, p.currency, p.status, p.type, p.commune, p.bedrooms, p.bathrooms, p.area,
              (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY display_order ASC LIMIT 1) as thumbnail
       FROM properties p
       WHERE p.agent_id = ? AND p.published = TRUE AND p.status != 'sold'
       ORDER BY p.created_at DESC`,
      [r.user_id]
    );

    res.json({
      success: true,
      agent: {
        id: r.id,
        userId: r.user_id,
        name: r.name,
        title: r.title,
        email: r.email,
        phone: r.phone,
        whatsapp: r.whatsapp,
        avatar: r.avatar,
        agencyId: r.agency_id,
        agencyName: r.agency_name,
        agencyLogo: r.agency_logo,
        bio: r.bio,
        rating: Number(r.rating),
        reviewCount: r.review_count,
        isVerified: Boolean(r.is_verified),
        specialties: typeof r.specialties === 'string' ? JSON.parse(r.specialties) : (r.specialties || []),
        languages: typeof r.languages === 'string' ? JSON.parse(r.languages) : (r.languages || ['Français', 'Lingala']),
        listings: propRows
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mettre à jour le profil de l'agent
 * PUT /api/agents/profile
 */
async function updateAgentProfile(req, res, next) {
  try {
    const { title, bio, specialties, languages, whatsapp, phone, avatar } = req.body;

    await pool.execute(
      `UPDATE agents
       SET title = COALESCE(?, title),
           bio = COALESCE(?, bio),
           specialties = COALESCE(?, specialties),
           languages = COALESCE(?, languages),
           whatsapp = COALESCE(?, whatsapp),
           phone = COALESCE(?, phone),
           avatar = COALESCE(?, avatar)
       WHERE user_id = ?`,
      [
        title || null,
        bio || null,
        specialties ? JSON.stringify(specialties) : null,
        languages ? JSON.stringify(languages) : null,
        whatsapp || null,
        phone || null,
        avatar || null,
        req.user.id
      ]
    );

    res.json({ success: true, message: 'Profil agent mis à jour.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAgents,
  getAgentById,
  updateAgentProfile
};
