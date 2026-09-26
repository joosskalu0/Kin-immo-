const express = require('express');
const router = express.Router();
const AdminAdController = require('../controllers/adminAdController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const {
  validatePartnerInput,
  validateCampaignInput,
  validatePaymentInput
} = require('../middleware/validator');

// Protection stricte : Seuls les utilisateurs avec rôle 'admin' et un token JWT valide ont accès
router.use(authenticateToken);
router.use(requireAdmin);

// ==========================================
// 1. GESTION DES PARTENAIRES
// ==========================================
router.get('/partners', AdminAdController.getPartners);
router.get('/partners/:id', AdminAdController.getPartnerById);
router.post('/partners', validatePartnerInput, AdminAdController.createPartner);
router.put('/partners/:id', AdminAdController.updatePartner);
router.delete('/partners/:id', AdminAdController.deletePartner);

// ==========================================
// 2. GESTION DES CAMPAGNES PUBLICITAIRES
// ==========================================
router.get('/campaigns', AdminAdController.getCampaigns);
router.get('/campaigns/:id', AdminAdController.getCampaignById);
router.post('/campaigns', validateCampaignInput, AdminAdController.createCampaign);
router.put('/campaigns/:id', AdminAdController.updateCampaign);
router.patch('/campaigns/:id/status', AdminAdController.toggleCampaignStatus);
router.delete('/campaigns/:id', AdminAdController.deleteCampaign);

// ==========================================
// 3. GESTION DES EMPLACEMENTS (PLACEMENTS)
// ==========================================
router.get('/placements', AdminAdController.getPlacements);
router.put('/placements/:id', AdminAdController.updatePlacement);

// ==========================================
// 4. GESTION DES PAIEMENTS PARTENAIRES
// ==========================================
router.get('/payments', AdminAdController.getPayments);
router.post('/payments', validatePaymentInput, AdminAdController.recordPayment);

// ==========================================
// 5. STATISTIQUES & RAPPORTS FINANCIERS
// ==========================================
router.get('/stats', AdminAdController.getStatsOverview);
router.get('/campaigns/:id/stats', AdminAdController.getCampaignStats);

module.exports = router;
