/**
 * Middleware de vérification des rôles (RBAC)
 * Rôles acceptés : 'user', 'agent', 'agency', 'admin'
 */

function requireRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Non authentifié. Veuillez vous connecter.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès interdit : cette ressource nécessite l'un des rôles suivants : [${allowedRoles.join(', ')}]. Votre rôle actuel est : "${req.user.role}".`
      });
    }

    next();
  };
}

// Raccourci pour exiger strictement le rôle Administrateur
const requireAdmin = requireRoles('admin');

// Raccourci pour les professionnels (Agents, Agences ou Admins)
const requireProfessional = requireRoles('agent', 'agency', 'admin');

module.exports = {
  requireRoles,
  requireAdmin,
  requireProfessional
};
