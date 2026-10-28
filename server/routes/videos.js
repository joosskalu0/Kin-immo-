const express = require('express');
const router = express.Router();
const videosController = require('../controllers/videosController');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { requireAdmin, requireProfessional } = require('../middleware/roles');
const { sensitiveActionLimiter } = require('../middleware/rateLimiter');

// Routes Publiques
router.get('/', (req, res, next) => videosController.getApprovedVideos(req, res, next));
router.get('/:id', optionalAuth, (req, res, next) => videosController.getVideoById(req, res, next));
router.post('/reports', sensitiveActionLimiter, (req, res, next) => videosController.createReport(req, res, next));
router.post('/:id/report', sensitiveActionLimiter, (req, res, next) => {
  req.body.propertyId = req.body.propertyId || req.params.id;
  videosController.createReport(req, res, next);
});
router.post('/:id/visit', sensitiveActionLimiter, optionalAuth, (req, res, next) => videosController.scheduleVideoVisit(req, res, next));
router.post('/:id/view', (req, res, next) => videosController.incrementView(req, res, next));

// Routes Professionnels (Agents, Agences, Admin)
router.get('/my', authenticateToken, requireProfessional, (req, res, next) => videosController.getMyVideos(req, res, next));
router.post('/', sensitiveActionLimiter, authenticateToken, requireProfessional, (req, res, next) => videosController.createVideo(req, res, next));
router.put('/:id', authenticateToken, requireProfessional, (req, res, next) => videosController.updateVideo(req, res, next));
router.delete('/:id', authenticateToken, requireProfessional, (req, res, next) => videosController.deleteVideo(req, res, next));

// Routes Administrateur (Modération stricte)
router.get('/admin/all', authenticateToken, requireAdmin, (req, res, next) => videosController.adminGetVideos(req, res, next));
router.patch('/admin/:id/status', authenticateToken, requireAdmin, (req, res, next) => videosController.adminModerateVideo(req, res, next));
router.get('/admin/reports', authenticateToken, requireAdmin, (req, res, next) => videosController.adminGetReports(req, res, next));
router.patch('/admin/reports/:id', authenticateToken, requireAdmin, (req, res, next) => videosController.adminResolveReport(req, res, next));

module.exports = router;
