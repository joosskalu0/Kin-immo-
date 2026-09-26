/**
 * Middleware de limitation du débit (Rate Limiter)
 * Protège l'API contre les attaques DoS, les abus et la fraude aux clics/impressions
 */
const rateLimitMap = new Map();

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute par défaut
  const maxRequests = options.max || 100;
  const message = options.message || {
    success: false,
    message: 'Trop de requêtes effectuées. Veuillez patienter avant de réessayer.'
  };

  return (req, res, next) => {
    // Clé basée sur l'IP ou le token utilisateur
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const record = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count++;
    }

    rateLimitMap.set(key, record);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      return res.status(429).json(message);
    }

    next();
  };
}

// Nettoyage régulier de la mémoire pour éviter les fuites
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Limiteur général pour l'API
const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, message: 'Limite de requêtes API atteinte (120 req/min).' }
});

// Limiteur strict pour les clics et impressions (anti-fraude)
const adClickLimiter = createRateLimiter({
  windowMs: 10 * 1000,
  max: 10,
  message: { success: false, message: 'Activité de clics suspecte détectée.' }
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  adClickLimiter
};
