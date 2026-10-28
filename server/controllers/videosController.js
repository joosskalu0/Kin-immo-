const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const videoStorageService = require('../services/videoStorageService');

/**
 * Contrôleur Kinimmo Visites & Modération Vidéos
 */
class VideosController {
  /**
   * 1. GET /api/videos
   * Récupère la liste paginée des vidéos approuvées et actives pour le flux vertical Kinimmo Visites
   * RÈGLE IMPÉRATIVE : Seules les vidéos avec status = 'approved' sont retournées publiquement !
   */
  async getApprovedVideos(req, res, next) {
    try {
      const { commune, type } = req.query;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const offset = (page - 1) * limit;

      let baseWhere = `
        WHERE pv.status = 'approved'
          AND p.status != 'sold'
          AND p.published = TRUE
      `;
      const params = [];
      const countParams = [];

      if (commune && commune !== 'all') {
        baseWhere += ` AND LOWER(p.commune) LIKE LOWER(?)`;
        params.push(`%${commune}%`);
        countParams.push(`%${commune}%`);
      }

      if (type && type !== 'all') {
        if (type === 'sale') {
          baseWhere += ` AND p.status = 'for-sale'`;
        } else if (type === 'rent') {
          baseWhere += ` AND p.status = 'for-rent'`;
        } else {
          baseWhere += ` AND p.type = ?`;
          params.push(type);
          countParams.push(type);
        }
      }

      // Requête de comptage total pour pagination
      const [countResult] = await pool.query(
        `SELECT COUNT(*) AS total 
         FROM property_videos pv 
         INNER JOIN properties p ON pv.property_id = p.id 
         ${baseWhere}`,
        countParams
      );
      const total = Number(countResult[0]?.total || 0);

      // Requête des données
      const query = `
        SELECT 
          pv.id,
          pv.property_id,
          pv.user_id,
          pv.video_url,
          pv.thumbnail_url,
          pv.description,
          pv.status,
          pv.views_count,
          pv.created_at,
          pv.updated_at,
          p.title AS property_title,
          p.price AS property_price,
          p.currency AS property_currency,
          p.commune AS property_commune,
          p.quartier AS property_quartier,
          p.address AS property_address,
          p.type AS property_type,
          p.status AS property_status,
          p.bedrooms AS property_bedrooms,
          p.bathrooms AS property_bathrooms,
          p.featured AS property_featured,
          u.name AS agent_name,
          u.phone AS agent_phone,
          u.whatsapp AS agent_whatsapp,
          u.avatar AS agent_avatar,
          u.is_verified AS agent_verified,
          ag.name AS agency_name
        FROM property_videos pv
        INNER JOIN properties p ON pv.property_id = p.id
        LEFT JOIN users u ON pv.user_id = u.id
        LEFT JOIN agencies ag ON p.agency_id = ag.id
        ${baseWhere}
        ORDER BY pv.created_at DESC 
        LIMIT ? OFFSET ?
      `;

      params.push(limit, offset);
      const [rows] = await pool.query(query, params);

      res.json({
        success: true,
        data: {
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          },
          videos: rows.map(r => ({
            id: r.id,
            propertyId: r.property_id,
            userId: r.user_id,
            videoUrl: r.video_url,
            thumbnailUrl: r.thumbnail_url,
            description: r.description,
            status: r.status,
            viewsCount: r.views_count,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            propertyTitle: r.property_title,
            propertyPrice: Number(r.property_price),
            propertyCurrency: r.property_currency,
            propertyCommune: r.property_commune,
            propertyQuartier: r.property_quartier,
            propertyAddress: r.property_address,
            propertyType: r.property_type,
            propertyStatus: r.property_status,
            propertyBedrooms: r.property_bedrooms,
            propertyBathrooms: r.property_bathrooms,
            propertyFeatured: Boolean(r.property_featured),
            agentName: r.agent_name || 'Conseiller Kinimmo',
            agentPhone: r.agent_phone,
            agentWhatsapp: r.agent_whatsapp || r.agent_phone,
            agentAvatar: r.agent_avatar,
            agentVerified: Boolean(r.agent_verified),
            agencyName: r.agency_name
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 1b. GET /api/videos/:id
   * Consulter les détails d'une vidéo spécifique
   * RÈGLE ABSOLUE : Une vidéo non approuvée n'est jamais accessible au public !
   */
  async getVideoById(req, res, next) {
    try {
      const { id } = req.params;

      const [rows] = await pool.query(
        `SELECT 
          pv.id,
          pv.property_id,
          pv.user_id,
          pv.video_url,
          pv.thumbnail_url,
          pv.description,
          pv.status,
          pv.views_count,
          pv.rejection_reason,
          pv.created_at,
          pv.updated_at,
          p.title AS property_title,
          p.price AS property_price,
          p.currency AS property_currency,
          p.commune AS property_commune,
          p.quartier AS property_quartier,
          p.address AS property_address,
          p.type AS property_type,
          p.status AS property_status,
          p.bedrooms AS property_bedrooms,
          p.bathrooms AS property_bathrooms,
          p.featured AS property_featured,
          u.name AS agent_name,
          u.phone AS agent_phone,
          u.whatsapp AS agent_whatsapp,
          u.avatar AS agent_avatar,
          u.is_verified AS agent_verified,
          ag.name AS agency_name
        FROM property_videos pv
        INNER JOIN properties p ON pv.property_id = p.id
        LEFT JOIN users u ON pv.user_id = u.id
        LEFT JOIN agencies ag ON p.agency_id = ag.id
        WHERE pv.id = ? LIMIT 1`,
        [id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vidéo introuvable.'
        });
      }

      const video = rows[0];

      // Vérification stricte : si non approuvée, seul le créateur ou l'admin peut la consulter
      if (video.status !== 'approved') {
        const isOwner = req.user && req.user.id === video.user_id;
        const isAdmin = req.user && req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
          return res.status(403).json({
            success: false,
            message: 'Accès refusé : cette vidéo n\'est pas autorisée pour consultation publique.'
          });
        }
      }

      res.json({
        success: true,
        data: {
          video: {
            id: video.id,
            propertyId: video.property_id,
            userId: video.user_id,
            videoUrl: video.video_url,
            thumbnailUrl: video.thumbnail_url,
            description: video.description,
            status: video.status,
            viewsCount: video.views_count,
            rejectionReason: video.rejection_reason,
            createdAt: video.created_at,
            updatedAt: video.updated_at,
            propertyTitle: video.property_title,
            propertyPrice: Number(video.property_price),
            propertyCurrency: video.property_currency,
            propertyCommune: video.property_commune,
            propertyQuartier: video.property_quartier,
            propertyAddress: video.property_address,
            propertyType: video.property_type,
            propertyStatus: video.property_status,
            propertyBedrooms: video.property_bedrooms,
            propertyBathrooms: video.property_bathrooms,
            propertyFeatured: Boolean(video.property_featured),
            agentName: video.agent_name || 'Conseiller Kinimmo',
            agentPhone: video.agent_phone,
            agentWhatsapp: video.agent_whatsapp || video.agent_phone,
            agentAvatar: video.agent_avatar,
            agentVerified: Boolean(video.agent_verified),
            agencyName: video.agency_name
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 1c. POST /api/videos/:id/visit
   * Enregistrer une demande de visite réelle pour le bien de cette vidéo
   * RÈGLE : Enregistrement réel dans MySQL sans fausse confirmation
   */
  async scheduleVideoVisit(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email, phone, visitDate, visitTime, notes } = req.body;

      if (!name || !email || !phone || !visitDate) {
        return res.status(400).json({
          success: false,
          message: 'Votre nom, e-mail, téléphone et la date souhaitée sont obligatoires pour planifier une visite.'
        });
      }

      // 1. Récupérer la vidéo et son annonce
      const [videos] = await pool.query(
        `SELECT pv.id, pv.property_id, p.title, p.agent_id, p.agency_id 
         FROM property_videos pv
         INNER JOIN properties p ON pv.property_id = p.id
         WHERE pv.id = ? LIMIT 1`,
        [id]
      );

      if (videos.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vidéo ou bien immobilier introuvable.'
        });
      }

      const video = videos[0];
      const propertyId = video.property_id;
      const targetAgentId = video.agent_id;

      // 2. Enregistrer réellement dans la table messages avec request_type = 'tour'
      const messageId = `msg_tour_${uuidv4()}`;
      const senderId = req.user ? req.user.id : null;

      await pool.execute(
        `INSERT INTO messages (
          id, property_id, sender_id, receiver_id, sender_name, sender_email, sender_phone,
          message, request_type, tour_date, tour_time, status, is_read
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'tour', ?, ?, 'new', FALSE)`,
        [
          messageId,
          propertyId,
          senderId,
          targetAgentId || null,
          name.trim(),
          email.trim().toLowerCase(),
          phone.trim(),
          notes ? notes.trim() : `Demande de visite planifiée depuis Kinimmo Visites pour le bien "${video.title}"`,
          visitDate,
          visitTime || '10:00'
        ]
      );

      // 3. Enregistrer également dans property_analytics (+1 tour_requests)
      const today = new Date().toISOString().split('T')[0];
      await pool.execute(
        `INSERT INTO property_analytics (property_id, date, tour_requests)
         VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE tour_requests = tour_requests + 1`,
        [propertyId, today]
      );

      res.status(201).json({
        success: true,
        message: 'Votre demande de visite a été enregistrée et transmise au conseiller immobilier avec succès.',
        data: {
          visitRequestId: messageId,
          propertyId,
          visitDate,
          visitTime: visitTime || '10:00',
          propertyTitle: video.title
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/videos/my
   * Récupère les vidéos publiées par l'agent ou l'agence connecté
   */
  async getMyVideos(req, res, next) {
    try {
      const userId = req.user.id;

      const [rows] = await pool.query(
        `SELECT 
          pv.id,
          pv.property_id,
          pv.user_id,
          pv.video_url,
          pv.thumbnail_url,
          pv.description,
          pv.status,
          pv.views_count,
          pv.rejection_reason,
          pv.created_at,
          pv.updated_at,
          p.title AS property_title,
          p.price AS property_price,
          p.currency AS property_currency,
          p.commune AS property_commune,
          p.type AS property_type,
          p.status AS property_status
        FROM property_videos pv
        INNER JOIN properties p ON pv.property_id = p.id
        WHERE pv.user_id = ?
        ORDER BY pv.created_at DESC`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          videos: rows.map(r => ({
            id: r.id,
            propertyId: r.property_id,
            userId: r.user_id,
            videoUrl: r.video_url,
            thumbnailUrl: r.thumbnail_url,
            description: r.description,
            status: r.status,
            viewsCount: r.views_count,
            rejectionReason: r.rejection_reason,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            propertyTitle: r.property_title,
            propertyPrice: Number(r.property_price),
            propertyCurrency: r.property_currency,
            propertyCommune: r.property_commune,
            propertyType: r.property_type,
            propertyStatus: r.property_status
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. POST /api/videos
   * Crée ou soumet une vidéo pour une annonce existante
   * RÈGLES DE SÉCURITÉ :
   * - Vérification d'existence de l'annonce
   * - Vérification que l'utilisateur est bien le propriétaire de l'annonce (ou admin)
   * - Validation de l'URL vidéo
   */
  async createVideo(req, res, next) {
    try {
      const {
        propertyId,
        videoUrl,
        thumbnailUrl,
        description,
        status = 'pending'
      } = req.body;

      if (!propertyId || !videoUrl) {
        return res.status(400).json({
          success: false,
          message: 'L\'identifiant de l\'annonce (propertyId) et l\'URL de la vidéo (videoUrl) sont obligatoires.'
        });
      }

      // Valider l'URL
      const urlCheck = videoStorageService.validateVideoUrl(videoUrl);
      if (!urlCheck.valid) {
        return res.status(400).json({
          success: false,
          message: urlCheck.error
        });
      }

      // Vérifier que l'annonce existe et récupérer son propriétaire
      const [properties] = await pool.execute(
        'SELECT id, title, agent_id, agency_id FROM properties WHERE id = ? LIMIT 1',
        [propertyId]
      );

      if (properties.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Annonce immobilière introuvable.'
        });
      }

      const property = properties[0];

      // Vérification stricte des autorisations :
      // L'utilisateur doit être l'agent attitré, ou appartenir à la même agence, ou être administrateur.
      const isOwner = property.agent_id === req.user.id || 
                      (property.agency_id && property.agency_id === req.user.agency_id);
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Autorisation refusée : vous ne pouvez publier des vidéos que pour vos propres annonces.'
        });
      }

      const allowedStatuses = ['draft', 'pending'];
      const targetStatus = allowedStatuses.includes(status) ? status : 'pending';

      const videoId = `vid_${uuidv4()}`;

      await pool.execute(
        `INSERT INTO property_videos 
          (id, property_id, user_id, video_url, thumbnail_url, description, status, views_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          videoId,
          propertyId,
          req.user.id,
          videoUrl.trim(),
          thumbnailUrl ? thumbnailUrl.trim() : null,
          description ? description.trim() : null,
          targetStatus
        ]
      );

      res.status(201).json({
        success: true,
        message: targetStatus === 'draft' 
          ? 'Brouillon de vidéo enregistré avec succès.' 
          : 'Vidéo soumise à validation administrative avec succès.',
        data: {
          video: {
            id: videoId,
            propertyId,
            userId: req.user.id,
            videoUrl,
            thumbnailUrl,
            description,
            status: targetStatus,
            viewsCount: 0,
            propertyTitle: property.title
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. PUT /api/videos/:id
   * Met à jour une vidéo existante
   */
  async updateVideo(req, res, next) {
    try {
      const { id } = req.params;
      const { videoUrl, thumbnailUrl, description, status } = req.body;

      const [existing] = await pool.execute(
        'SELECT id, user_id, status FROM property_videos WHERE id = ? LIMIT 1',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vidéo introuvable.'
        });
      }

      const video = existing[0];
      const isOwner = video.user_id === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Autorisation refusée : vous ne pouvez modifier que vos propres vidéos.'
        });
      }

      let newStatus = video.status;
      if (status && ['draft', 'pending'].includes(status)) {
        newStatus = status;
      }

      await pool.execute(
        `UPDATE property_videos 
         SET video_url = COALESCE(?, video_url),
             thumbnail_url = COALESCE(?, thumbnail_url),
             description = COALESCE(?, description),
             status = ?
         WHERE id = ?`,
        [videoUrl || null, thumbnailUrl || null, description || null, newStatus, id]
      );

      res.json({
        success: true,
        message: 'Vidéo mise à jour avec succès.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5. DELETE /api/videos/:id
   * Supprime une vidéo
   */
  async deleteVideo(req, res, next) {
    try {
      const { id } = req.params;

      const [existing] = await pool.execute(
        'SELECT id, user_id FROM property_videos WHERE id = ? LIMIT 1',
        [id]
      );

      if (existing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Vidéo introuvable.'
        });
      }

      const video = existing[0];
      const isOwner = video.user_id === req.user.id;
      const isAdmin = req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Autorisation refusée : vous ne pouvez supprimer que vos propres vidéos.'
        });
      }

      await pool.execute('DELETE FROM property_videos WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Vidéo supprimée avec succès.'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6. POST /api/videos/:id/view
   * Incrémente le compteur de vues d'une vidéo
   */
  async incrementView(req, res, next) {
    try {
      const { id } = req.params;
      await pool.execute(
        'UPDATE property_videos SET views_count = views_count + 1 WHERE id = ?',
        [id]
      );
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7. GET /api/admin/videos
   * Administration : Récupère toutes les vidéos avec filtres et signalements associés
   */
  async adminGetVideos(req, res, next) {
    try {
      const { status = 'all', search } = req.query;

      let query = `
        SELECT 
          pv.id,
          pv.property_id,
          pv.user_id,
          pv.video_url,
          pv.thumbnail_url,
          pv.description,
          pv.status,
          pv.views_count,
          pv.rejection_reason,
          pv.created_at,
          pv.updated_at,
          p.title AS property_title,
          p.price AS property_price,
          p.commune AS property_commune,
          p.status AS property_status,
          u.name AS user_name,
          u.email AS user_email,
          u.role AS user_role,
          (SELECT COUNT(*) FROM property_reports pr WHERE pr.property_id = pv.property_id AND pr.status = 'pending') AS reports_count
        FROM property_videos pv
        LEFT JOIN properties p ON pv.property_id = p.id
        LEFT JOIN users u ON pv.user_id = u.id
        WHERE 1 = 1
      `;

      const params = [];

      if (status && status !== 'all') {
        query += ` AND pv.status = ?`;
        params.push(status);
      }

      if (search) {
        query += ` AND (p.title LIKE ? OR u.name LIKE ? OR u.email LIKE ?)`;
        const s = `%${search}%`;
        params.push(s, s, s);
      }

      query += ` ORDER BY pv.created_at DESC`;

      const [rows] = await pool.query(query, params);

      res.json({
        success: true,
        data: {
          videos: rows.map(r => ({
            id: r.id,
            propertyId: r.property_id,
            userId: r.user_id,
            videoUrl: r.video_url,
            thumbnailUrl: r.thumbnail_url,
            description: r.description,
            status: r.status,
            viewsCount: r.views_count,
            rejectionReason: r.rejection_reason,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            propertyTitle: r.property_title || 'Annonce supprimée',
            propertyPrice: Number(r.property_price || 0),
            propertyCommune: r.property_commune,
            propertyStatus: r.property_status,
            userName: r.user_name || 'Utilisateur inconnu',
            userEmail: r.user_email,
            userRole: r.user_role,
            reportsCount: Number(r.reports_count || 0)
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 8. PATCH /api/admin/videos/:id/status
   * Administration : Modération d'une vidéo (approuver, refuser, masquer, suspendre)
   */
  async adminModerateVideo(req, res, next) {
    try {
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      const validStatuses = ['approved', 'rejected', 'hidden', 'pending'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Statut invalide. Statuts autorisés : [${validStatuses.join(', ')}]`
        });
      }

      await pool.execute(
        `UPDATE property_videos 
         SET status = ?,
             rejection_reason = ?
         WHERE id = ?`,
        [status, rejectionReason || null, id]
      );

      res.json({
        success: true,
        message: `Statut de la vidéo mis à jour : « ${status} ».`
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 9. POST /api/reports
   * Signalement d'une annonce ou vidéo suspecte
   */
  async createReport(req, res, next) {
    try {
      const { propertyId, reporterName, reporterContact, reason, comment } = req.body;

      if (!propertyId || !reason) {
        return res.status(400).json({
          success: false,
          message: 'L\'identifiant du bien et le motif du signalement sont obligatoires.'
        });
      }

      const reportId = `rep_${uuidv4()}`;

      await pool.execute(
        `INSERT INTO property_reports 
          (id, property_id, reporter_name, reporter_contact, reason, comment, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [
          reportId,
          propertyId,
          reporterName ? reporterName.trim() : null,
          reporterContact ? reporterContact.trim() : null,
          reason,
          comment ? comment.trim() : null
        ]
      );

      res.status(201).json({
        success: true,
        message: 'Signalement enregistré. Notre équipe de modération va examiner cette annonce.',
        data: { id: reportId }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 10. GET /api/admin/reports
   * Administration : Liste des signalements d'annonces et vidéos
   */
  async adminGetReports(req, res, next) {
    try {
      const { status = 'all' } = req.query;

      let query = `
        SELECT 
          pr.id,
          pr.property_id,
          pr.reporter_name,
          pr.reporter_contact,
          pr.reason,
          pr.comment,
          pr.status,
          pr.created_at,
          p.title AS property_title,
          p.price AS property_price,
          p.commune AS property_commune,
          u.name AS agent_name,
          u.email AS agent_email
        FROM property_reports pr
        LEFT JOIN properties p ON pr.property_id = p.id
        LEFT JOIN users u ON p.agent_id = u.id
        WHERE 1 = 1
      `;

      const params = [];

      if (status && status !== 'all') {
        query += ` AND pr.status = ?`;
        params.push(status);
      }

      query += ` ORDER BY pr.created_at DESC`;

      const [rows] = await pool.query(query, params);

      res.json({
        success: true,
        data: {
          reports: rows.map(r => ({
            id: r.id,
            propertyId: r.property_id,
            propertyTitle: r.property_title,
            propertyPrice: Number(r.property_price || 0),
            propertyCommune: r.property_commune,
            agentName: r.agent_name,
            agentEmail: r.agent_email,
            reporterName: r.reporter_name,
            reporterContact: r.reporter_contact,
            reason: r.reason,
            comment: r.comment,
            status: r.status,
            createdAt: r.created_at
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 11. PATCH /api/admin/reports/:id
   * Administration : Traiter ou classer un signalement
   */
  async adminResolveReport(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'resolved' ou 'dismissed'

      if (!['resolved', 'dismissed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Statut de traitement invalide. Valeurs acceptées : resolved, dismissed.'
        });
      }

      await pool.execute(
        'UPDATE property_reports SET status = ? WHERE id = ?',
        [status, id]
      );

      res.json({
        success: true,
        message: `Signalement marqué comme « ${status === 'resolved' ? 'résolu' : 'classé sans suite'} ».`
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new VideosController();
