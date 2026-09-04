const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

// Routes publiques (Découverte des offres et coordonnées de versement)
router.get('/plans', billingController.getPlans);
router.get('/payment-methods', billingController.getPaymentMethods);

// Routes protégées par compte (Création et suivi de ses factures)
router.post('/invoices', authenticateToken, billingController.createInvoice);
router.get('/my-invoices', authenticateToken, billingController.getMyInvoices);
router.put('/invoices/:id/pay', authenticateToken, billingController.submitPaymentProof);

// Route d'approbation administrative des paiements
router.put('/invoices/:id/approve', authenticateToken, requireAdmin, billingController.approveInvoice);

module.exports = router;
