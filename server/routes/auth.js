const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Routes publiques & gestion session/CSRF
router.get('/csrf', authController.getCsrf);
router.get('/session', authController.getSession);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshSession);
router.post('/logout', authController.logout);

// Routes protégées par JWT (Bearer ou Cookie HttpOnly)
router.get('/me', authenticateToken, authController.getMe);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
