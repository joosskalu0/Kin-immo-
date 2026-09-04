const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

// Toutes les routes de ce module nécessitent une authentification et le rôle 'admin'
router.use(authenticateToken);
router.use(requireAdmin);

// Statistiques globales
router.get('/stats', adminController.getStats);

// Gestion des utilisateurs et attributions de rôles
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/verify', adminController.toggleVerification);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
