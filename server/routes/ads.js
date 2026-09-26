const express = require('express');
const router = express.Router();
const AdPublicController = require('../controllers/adPublicController');
const { adClickLimiter } = require('../middleware/rateLimiter');

/**
 * @route   GET /api/ads/:placement
 * @desc    Obtenir la publicité active et non expirée pour un emplacement spécifique
 *          (home_top, home_middle, property_top, property_middle, property_bottom, search_top, search_middle, agency_top)
 *          Retourne soit une campagne partenaire, soit les infos Google AdSense officielles
 * @access  Public
 */
router.get('/:placement', AdPublicController.getAdForPlacement);

/**
 * @route   POST /api/ads/:campaignId/impression
 * @desc    Enregistrer l'affichage (impression) d'une publicité partenaire
 * @access  Public (avec rate limiter anti-fraude)
 */
router.post('/:campaignId/impression', adClickLimiter, AdPublicController.recordImpression);

/**
 * @route   POST /api/ads/:campaignId/click
 * @desc    Enregistrer le clic sur une publicité partenaire et obtenir le lien de redirection
 * @access  Public (avec rate limiter anti-fraude)
 */
router.post('/:campaignId/click', adClickLimiter, AdPublicController.recordClick);

module.exports = router;
