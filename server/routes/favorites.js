const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authenticateToken } = require('../middleware/auth');

// Toutes les routes de favoris nécessitent d'être connecté
router.use(authenticateToken);

router.get('/', favoritesController.getUserFavorites);
router.post('/:propertyId', favoritesController.addFavorite);
router.delete('/:propertyId', favoritesController.removeFavorite);
router.get('/check/:propertyId', favoritesController.checkFavorite);

module.exports = router;
