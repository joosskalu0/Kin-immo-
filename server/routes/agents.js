const express = require('express');
const router = express.Router();
const agentsController = require('../controllers/agentsController');
const { authenticateToken } = require('../middleware/auth');
const { requireRoles } = require('../middleware/roles');

// Routes publiques
router.get('/', agentsController.getAgents);
router.get('/:id', agentsController.getAgentById);

// Mise à jour de son profil agent
router.put('/profile', authenticateToken, requireRoles('agent', 'admin'), agentsController.updateAgentProfile);

module.exports = router;
