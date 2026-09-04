const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import des routes de l'API
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const propertiesRoutes = require('./routes/properties');
const agentsRoutes = require('./routes/agents');
const agenciesRoutes = require('./routes/agencies');
const favoritesRoutes = require('./routes/favorites');
const messagesRoutes = require('./routes/messages');
const adminRoutes = require('./routes/admin');
const billingRoutes = require('./routes/billing');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration des options CORS (autoriser le frontend Kinimmo)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://kinimmo.com',
  'https://www.kinimmo.com',
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (comme Postman ou curl) ou les domaines autorisés
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS : Origine non autorisée par Kinimmo API.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares pour parser le JSON et les formulaires URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Route de diagnostic et de vérification d'état (Healthcheck)
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as connected');
    res.json({
      status: 'ok',
      service: 'Kinimmo REST API',
      database: 'MySQL Connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'Kinimmo REST API',
      database: 'MySQL Disconnected',
      error: error.message
    });
  }
});

// Montage des routes sous /api/*
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/agencies', agenciesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/analytics', analyticsRoutes);

// Gestion des routes inexistantes (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Point de terminaison API introuvable : ${req.method} ${req.originalUrl}`
  });
});

// Middleware centralisé de capture des erreurs
app.use(errorHandler);

// Démarrage du serveur Node.js
app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Serveur Kinimmo API démarré sur le port : ${PORT}`);
  console.log(`📡 URL API : http://localhost:${PORT}/api`);
  console.log(`🏥 Santé : http://localhost:${PORT}/api/health`);
  console.log('====================================================');
});
