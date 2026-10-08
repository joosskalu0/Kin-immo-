const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

// Routes publiques (Découverte des offres, options de visibilité et régie publicitaire)
router.get('/plans', billingController.getPlans);
router.get('/visibility-options', billingController.getVisibilityOptions);
router.get('/payment-methods', billingController.getPaymentMethods);
router.get('/advertisements', billingController.getAdvertisements);
router.post('/advertisements/:id/click', billingController.trackAdClick);

// Routes protégées par compte (Souscription, boost d'annonces et suivi des factures)
router.post('/invoices', authenticateToken, billingController.createInvoice);
router.post('/boost-order', authenticateToken, billingController.createBoostOrder);
router.get('/my-invoices', authenticateToken, billingController.getMyInvoices);
router.get('/my-boosts', authenticateToken, billingController.getMyBoosts);
router.put('/invoices/:id/pay', authenticateToken, billingController.submitPaymentProof);

// Routes d'administration de la monétisation et validation
router.put('/invoices/:id/approve', authenticateToken, requireAdmin, billingController.approveInvoice);
router.get('/admin/monetization-stats', authenticateToken, requireAdmin, billingController.getAdminMonetizationStats);
router.get('/admin/advertisements', authenticateToken, requireAdmin, billingController.getAdminAdvertisements);
router.post('/admin/advertisements', authenticateToken, requireAdmin, billingController.createAdvertisement);
router.put('/admin/advertisements/:id', authenticateToken, requireAdmin, billingController.updateAdvertisement);
router.delete('/admin/advertisements/:id', authenticateToken, requireAdmin, billingController.deleteAdvertisement);

// Routes d'administration des forfaits et tarifs d'abonnement
router.post('/admin/plans', authenticateToken, requireAdmin, billingController.createPlan);
router.put('/admin/plans/:id', authenticateToken, requireAdmin, billingController.updatePlan);
router.delete('/admin/plans/:id', authenticateToken, requireAdmin, billingController.deletePlan);

// Routes d'administration des options de visibilité et boosts
router.post('/admin/visibility-options', authenticateToken, requireAdmin, billingController.createVisibilityOption);
router.put('/admin/visibility-options/:id', authenticateToken, requireAdmin, billingController.updateVisibilityOption);
router.delete('/admin/visibility-options/:id', authenticateToken, requireAdmin, billingController.deleteVisibilityOption);

module.exports = router;

