// Routes API Kinimmo Trust pour Backend Node.js / MySQL Hostinger
// Sécurité : Multer avec whitelist MIME & stockage hors public, rate limiting, RBAC, anti-auto-approbation

const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const trustController = require('../controllers/trustController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');
const { sensitiveActionLimiter } = require('../middleware/rateLimiter');

// Configuration sécurisée de Multer pour le stockage des pièces justificatives hors répertoire public
const UPLOADS_DIR = path.join(__dirname, '..', 'storage', 'trust_documents');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `trust_doc_${Date.now()}_${crypto.randomBytes(12).toString('hex')}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG, WEBP.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Mo max
  },
  fileFilter
});

// -------------------------------------------------------------
// 1. ROUTE PUBLIQUE : Statut public (Zéro document ni donnée sensible exposée)
// -------------------------------------------------------------
router.get('/public/:targetType/:targetId', trustController.getPublicStatus);
router.get('/badge/:targetType/:targetId', trustController.getPublicStatus);

// -------------------------------------------------------------
// 2. ROUTES DEMANDEURS & UTILISATEURS (Authentification requise)
// -------------------------------------------------------------

// Soumettre une demande de vérification (protégée par limitation de débit)
router.post('/apply', authenticateToken, sensitiveActionLimiter, trustController.submitApplication);
router.post('/verifications', authenticateToken, sensitiveActionLimiter, trustController.submitApplication);

// Consulter ses propres demandes ou toutes (si admin)
router.get('/my-requests', authenticateToken, trustController.getMyRequests);
router.get('/verifications/me', authenticateToken, trustController.getMyRequests);
router.get('/verifications', authenticateToken, trustController.getVerifications);
router.get('/verifications/:id', authenticateToken, trustController.getVerificationById);

// Téléverser un justificatif sécurisé (stockage hors public + validation)
router.post(
  '/upload-document',
  authenticateToken,
  sensitiveActionLimiter,
  upload.single('document'),
  trustController.uploadDocument
);

// Consulter/télécharger un justificatif sécurisé & journaliser l'accès
router.get('/documents/:id/secure-file', authenticateToken, trustController.serveDocumentFile);
router.post('/documents/:id/access-log', authenticateToken, trustController.logDocumentAccess);

// Consulter l'historique des décisions de son propre dossier
router.get('/verifications/:id/history', authenticateToken, trustController.getVerificationHistory);

// Confirmer la disponibilité réelle d'un bien (Agent propriétaire, Agence ou Admin)
router.post('/availability/:propertyId', authenticateToken, trustController.confirmAvailability);

// Notifications Kinimmo Trust de l'utilisateur connecté
router.get('/notifications', authenticateToken, trustController.getNotifications);
router.put('/notifications/:id/read', authenticateToken, trustController.markNotificationRead);

// -------------------------------------------------------------
// 3. ROUTES ADMINISTRATEURS (Rôle 'admin' obligatoire)
// -------------------------------------------------------------

// Examiner toutes les demandes de vérification avec filtres
router.get('/admin/verifications', authenticateToken, requireAdmin, trustController.getAdminVerifications);

// Consulter le détail complet d'une demande avec pièces et contrôles
router.get('/admin/verifications/:id', authenticateToken, requireAdmin, trustController.getAdminVerificationById);

// Décision unifiée sur un dossier (frontend trustService.updateStatus)
router.put('/verifications/:id/status', authenticateToken, requireAdmin, trustController.updateVerificationStatus);
router.post('/verifications/:id/status', authenticateToken, requireAdmin, trustController.updateVerificationStatus);
router.put('/verifications/:id/decision', authenticateToken, requireAdmin, trustController.updateVerificationStatus);

// Contrôles d'audit et demande d'informations complémentaires
router.post('/verifications/:id/checks', authenticateToken, requireAdmin, trustController.addCheck);
router.post('/verifications/:id/request-info', authenticateToken, requireAdmin, trustController.requestMoreInfo);

// Validation ou rejet d'une pièce justificative
router.put('/documents/:id/status', authenticateToken, requireAdmin, trustController.updateDocumentStatus);

// Approuver une demande (RÈGLE STRICTE : l'utilisateur ne peut jamais approuver sa propre demande)
router.post('/admin/verifications/:id/approve', authenticateToken, requireAdmin, trustController.approveVerification);

// Refuser une demande avec motif obligatoire
router.post('/admin/verifications/:id/reject', authenticateToken, requireAdmin, trustController.rejectVerification);

// Suspendre une vérification
router.post('/admin/verifications/:id/suspend', authenticateToken, requireAdmin, trustController.suspendVerification);

// Renouveler une vérification existante ou expirée
router.post('/admin/verifications/:id/renew', authenticateToken, requireAdmin, trustController.renewVerification);

// Journal d'audit immuable des administrateurs (Lecture admin uniquement ; modification/suppression interdites -> 405)
router.get('/admin/audit-logs', authenticateToken, requireAdmin, trustController.getAuditLogs);
router.get('/audit-logs', authenticateToken, requireAdmin, trustController.getAuditLogs);
router.put(['/audit-logs', '/audit-logs/:id', '/admin/audit-logs', '/admin/audit-logs/:id'], authenticateToken, requireAdmin, (_req, res) => {
  res.status(405).json({ success: false, message: 'Journal d\'audit immuable : modification interdite.' });
});
router.delete(['/audit-logs', '/audit-logs/:id', '/admin/audit-logs', '/admin/audit-logs/:id'], authenticateToken, requireAdmin, (_req, res) => {
  res.status(405).json({ success: false, message: 'Journal d\'audit immuable : suppression interdite.' });
});

module.exports = router;
