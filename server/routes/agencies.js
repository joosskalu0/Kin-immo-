const express = require('express');
const router = express.Router();
const agenciesController = require('../controllers/agenciesController');
const { authenticateToken } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');

// Routes publiques
router.get('/', agenciesController.getAgencies);
router.get('/:id', agenciesController.getAgencyById);

// Mise à jour de l'agence (Réservé aux agences et administrateurs)
router.put('/:id', authenticateToken, requireRoles('agency', 'admin'), agenciesController.updateAgency);

module.exports = router;
