const pool = require('../config/database');

/**
 * Récupérer tous les favoris de l'utilisateur connecté
 * GET /api/favorites
 */
async function getUserFavorites(req, res, next) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT p.id, p.title, p.price, p.currency, p.status, p.type, p.commune, p.quartier,
              p.bedrooms, p.bathrooms, p.area, p.created_at,
              (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY display_order ASC LIMIT 1) as thumbnail,
              f.created_at as favorited_at
       FROM favorites f
       JOIN properties p ON f.property_id = p.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      count: rows.length,
      favorites: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Ajouter une propriété aux favoris
 * POST /api/favorites/:propertyId
 */
async function addFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;

    // Vérifier si la propriété existe
    const [prop] = await pool.execute('SELECT id FROM properties WHERE id = ?', [propertyId]);
    if (prop.length === 0) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }

    // Insertion IGNORE ou standard
    await pool.execute(
      'INSERT IGNORE INTO favorites (user_id, property_id) VALUES (?, ?)',
      [userId, propertyId]
    );

    res.json({
      success: true,
      message: 'Propriété ajoutée aux favoris.',
      propertyId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Retirer une propriété des favoris
 * DELETE /api/favorites/:propertyId
 */
async function removeFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;

    await pool.execute(
      'DELETE FROM favorites WHERE user_id = ? AND property_id = ?',
      [userId, propertyId]
    );

    res.json({
      success: true,
      message: 'Propriété retirée des favoris.',
      propertyId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Vérifier si une propriété est en favori pour l'utilisateur
 * GET /api/favorites/check/:propertyId
 */
async function checkFavorite(req, res, next) {
  try {
    const userId = req.user.id;
    const { propertyId } = req.params;

    const [rows] = await pool.execute(
      'SELECT id FROM favorites WHERE user_id = ? AND property_id = ? LIMIT 1',
      [userId, propertyId]
    );

    res.json({
      success: true,
      isFavorited: rows.length > 0
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite
};
