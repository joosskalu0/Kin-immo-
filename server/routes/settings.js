const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Route publique pour récupérer les coordonnées et le paramétrage du service VIP Kinimmo
router.get('/contact', settingsController.getPublicContactSettings);
router.get('/', settingsController.getPublicContactSettings);

module.exports = router;
