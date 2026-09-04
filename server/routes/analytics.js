const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticateToken } = require('../middleware/auth');

// Enregistrement d'événement public (vue, clic WhatsApp, appel, partage)
router.post('/track', analyticsController.trackEvent);

// Statistiques par annonce
router.get('/property/:id', analyticsController.getPropertyAnalytics);

// Tableau de bord de performances pour l'agent ou l'agence connecté
router.get('/my-performance', authenticateToken, analyticsController.getMyPerformance);

module.exports = router;
