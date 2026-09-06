const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

// Toutes les routes de ce module nécessitent une authentification et le rôle 'admin'
router.use(authenticateToken);
router.use(requireAdmin);

// 1. Statistiques globales
router.get('/stats', adminController.getStats);

// 2. Gestion des utilisateurs
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.put('/users/:id', adminController.updateUser);
router.put('/users/:id/role', adminController.updateUserRole);
router.put('/users/:id/verify', adminController.toggleVerification);
router.put('/users/:id/reset-password', adminController.resetUserPassword);
router.delete('/users/:id', adminController.deleteUser);

// 3. Gestion des propriétés
router.get('/properties', adminController.getProperties);
router.put('/properties/:id/status', adminController.updatePropertyStatus);
router.delete('/properties/:id', adminController.deleteProperty);

// 4. Gestion des agents
router.get('/agents', adminController.getAgents);
router.put('/agents/:id', adminController.updateAgent);
router.delete('/agents/:id', adminController.deleteAgent);

// 5. Gestion des agences
router.get('/agencies', adminController.getAgencies);
router.put('/agencies/:id', adminController.updateAgency);
router.delete('/agencies/:id', adminController.deleteAgency);

// 6. Gestion des factures / souscriptions
router.get('/invoices', adminController.getInvoices);

module.exports = router;
