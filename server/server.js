const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const pool = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/logger');
const { apiLimiter } = require('./middleware/rateLimiter');

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
const customFieldsRoutes = require('./routes/customFields');
const adsRoutes = require('./routes/ads');
const adminAdsRoutes = require('./routes/adminAds');
const showcaseRoutes = require('./routes/showcase');
const settingsRoutes = require('./routes/settings');
const conciergeRoutes = require('./routes/concierge');
const notificationsRoutes = require('./routes/notifications');
const videosRoutes = require('./routes/videos');
const trustRoutes = require('./routes/trust');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration des options CORS (autoriser le frontend Kinimmo)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://kinimmo.com',
  'http://kinimmo.com',
  'https://www.kinimmo.com',
  'http://www.kinimmo.com',
  'http://localhost:3000',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (comme Postman, curl ou requêtes internes)
    if (!origin) {
      return callback(null, true);
    }
    
    const cleanOrigin = origin.replace(/\/+$/, '').toLowerCase();
    
    const isAllowed = 
      allowedOrigins.some(o => o && cleanOrigin === o.replace(/\/+$/, '').toLowerCase()) ||
      cleanOrigin.includes('kinimmo.com') ||
      cleanOrigin.includes('hostingerpreview.com') ||
      cleanOrigin.includes('preview-domain') ||
      cleanOrigin.includes('localhost') ||
      cleanOrigin.includes('127.0.0.1') ||
      process.env.NODE_ENV !== 'production';

    if (isAllowed) {
      callback(null, true);
    } else {
      // Rejeter poliment sans lancer d'exception qui pollue les journaux
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Middlewares pour parser le JSON et les formulaires URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de journalisation structurée
app.use(requestLogger);

// Rate Limiter général pour sécuriser l'API
app.use('/api', apiLimiter);

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
app.use('/api/custom-fields', customFieldsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/admin/ads', adminAdsRoutes);
app.use('/api/showcase', showcaseRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/concierge', conciergeRoutes);
app.use('/api/concierge-requests', conciergeRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/trust', trustRoutes);

// Détection et service automatique du frontend compilé React (dist/)
const candidateDistPaths = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, 'dist'),
  path.join(process.cwd(), 'dist'),
  path.join(process.cwd(), '..', 'dist'),
  path.join(process.cwd(), 'public_html'),
  path.join(__dirname, '..', 'public_html'),
  path.join(__dirname, '..', '..', 'public_html'),
  '/home/u580134468/domains/kinimmo.com/public_html',
  '/home/u580134468/public_html'
];
const distDir = candidateDistPaths.find(p => fs.existsSync(path.join(p, 'index.html')));

if (distDir) {
  console.log(`[Frontend] Dossier de distribution React détecté et servi : ${distDir}`);
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  // Page d'accueil informative si dist/ n'a pas encore été déposé dans public_html ou nodejs/
  app.get('/', (_req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kinimmo - Serveur Opérationnel</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; max-width: 580px; width: 100%; padding: 32px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
          .badge { display: inline-flex; align-items: center; background: #064e3b; color: #34d399; font-weight: 600; font-size: 13px; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
          h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #fff; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0; }
          .steps { background: #0f172a; border-radius: 10px; padding: 16px; margin: 20px 0; border: 1px solid #334155; }
          .step-title { font-weight: 600; color: #e2e8f0; margin-bottom: 8px; font-size: 14px; }
          .step-text { font-size: 13px; color: #94a3b8; line-height: 1.5; margin: 0; }
          .btn { display: inline-block; background: #2563eb; color: #fff; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; transition: background 0.2s; }
          .btn:hover { background: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● Serveur Node.js & Base MySQL Connectés</div>
          <h1>Kinimmo API & Plateforme Immobilière</h1>
          <p>Le serveur backend Kinimmo est opérationnel et connecté à la base de données MySQL.</p>
          <div class="steps">
            <div class="step-title">Pour afficher le site web complet :</div>
            <p class="step-text">Déposez les fichiers compilés du dossier <code>dist/</code> (notamment <code>index.html</code> et le dossier <code>assets/</code>) dans le dossier <code>public_html/</code> de votre domaine Hostinger.</p>
          </div>
          <a href="/api/health" class="btn">Vérifier l'état de l'API (/api/health)</a>
        </div>
      </body>
      </html>
    `);
  });
}

// Gestion des routes API inexistantes (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Point de terminaison API introuvable : ${req.method} ${req.originalUrl}`
  });
});

// Middleware centralisé de capture des erreurs
app.use(errorHandler);

// Démarrage du serveur Node.js
app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`🚀 Serveur Kinimmo API démarré sur le port : ${PORT}`);
  console.log(`📡 URL API : http://0.0.0.0:${PORT}/api`);
  console.log(`🏥 Santé : http://0.0.0.0:${PORT}/api/health`);
  console.log('====================================================');
});
