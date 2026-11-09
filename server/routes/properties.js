const express = require('express');
const router = express.Router();
const propertiesController = require('../controllers/propertiesController');
const { authenticateToken } = require('../middleware/auth');
const { requireProfessional } = require('../middleware/roles');

const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configuration du stockage disque pour les vidéos
const uploadDir = path.join(__dirname, '..', 'uploads', 'videos');
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (err) {
    console.warn('[Properties Route] Notice création dossier uploads:', err.message);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `video_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 Mo max
});

// Routes publiques
router.get('/', propertiesController.getProperties);
router.get('/:id', propertiesController.getPropertyById);

// Routes protégées (Création réservée aux agents, agences ou administrateurs)
router.post('/upload-video', authenticateToken, upload.single('video'), propertiesController.uploadPropertyVideo);
router.post('/', authenticateToken, requireProfessional, propertiesController.createProperty);
router.put('/:id', authenticateToken, propertiesController.updateProperty);
router.put('/:id/status', authenticateToken, propertiesController.updatePropertyListingStatus);
router.patch('/:id/status', authenticateToken, propertiesController.updatePropertyListingStatus);
router.delete('/:id', authenticateToken, propertiesController.deleteProperty);

module.exports = router;
