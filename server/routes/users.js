const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

// Récupérer la liste des utilisateurs (Réservé aux Administrateurs)
router.get('/', authenticateToken, requireAdmin, usersController.getAllUsers);

// Récupérer le profil public d'un utilisateur
router.get('/:id', usersController.getUserProfile);

module.exports = router;
