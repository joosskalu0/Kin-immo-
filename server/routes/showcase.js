const express = require('express');
const router = express.Router();
const showcaseController = require('../controllers/showcaseController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

/**
 * Routes Publiques pour le Carrousel Hero
 */
router.get('/', showcaseController.getPublicSlides);

/**
 * Routes d'Administration (Requiert Token JWT et Rôle 'admin')
 */
router.get('/admin', authenticateToken, requireAdmin, showcaseController.getAllSlidesForAdmin);
router.post('/admin', authenticateToken, requireAdmin, showcaseController.createSlide);
router.put('/admin/:id', authenticateToken, requireAdmin, showcaseController.updateSlide);
router.delete('/admin/:id', authenticateToken, requireAdmin, showcaseController.deleteSlide);

module.exports = router;
