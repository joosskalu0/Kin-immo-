const express = require('express');
const router = express.Router();
const propertiesController = require('../controllers/propertiesController');
const { authenticateToken } = require('../middleware/auth');
const { requireProfessional } = require('../middleware/roles');

// Routes publiques
router.get('/', propertiesController.getProperties);
router.get('/:id', propertiesController.getPropertyById);

// Routes protégées (Création réservée aux agents, agences ou administrateurs)
router.post('/', authenticateToken, requireProfessional, propertiesController.createProperty);
router.put('/:id', authenticateToken, propertiesController.updateProperty);
router.delete('/:id', authenticateToken, propertiesController.deleteProperty);

module.exports = router;
