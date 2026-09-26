/**
 * Middleware de journalisation (Logger)
 * Enregistre chaque requête API avec horodatage, IP, méthode, route, status code et durée
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLine = `[${new Date().toISOString()}] [KINIMMO-API] ${req.method} ${req.originalUrl} | Status: ${res.statusCode} | IP: ${ip} | Latence: ${duration}ms`;

    if (res.statusCode >= 500) {
      console.error(`🚨 ${logLine}`);
    } else if (res.statusCode >= 400) {
      console.warn(`⚠️  ${logLine}`);
    } else {
      console.log(`ℹ️  ${logLine}`);
    }
  });

  next();
}

module.exports = requestLogger;
