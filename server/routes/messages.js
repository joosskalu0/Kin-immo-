const express = require('express');
const router = express.Router();
const messagesController = require('../controllers/messagesController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

// Envoyer un message (Accessible à tous, avec ou sans compte)
router.post('/', optionalAuth, messagesController.sendMessage);

// Consulter les messages reçus (Authentifié)
router.get('/inbox', authenticateToken, messagesController.getReceivedMessages);

// Mettre à jour le statut d'un message
router.put('/:id/status', authenticateToken, messagesController.updateMessageStatus);

module.exports = router;
