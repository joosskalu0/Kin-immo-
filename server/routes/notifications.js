const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRoles, requireAdmin } = require('../middleware/roles');
const {
  NotificationService,
  NotificationTemplateEngine,
  NOTIFICATION_EVENTS,
  CHANNELS,
  STATUSES
} = require('../services/notificationService');
const pool = require('../config/database');

/**
 * GET /api/notifications
 * Consultation sécurisée des notifications
 * - Admin : voit l'ensemble de la file d'attente
 * - Agent : ne voit QUE les notifications qui lui sont attribuées (isolation stricte)
 * - Utilisateur : ne voit que ses propres accusés de réception
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { event_type, status, limit = 50, offset = 0 } = req.query;

    let recipientId = null;
    let recipientType = null;

    if (user.role === 'admin') {
      // L'administrateur peut filtrer librement ou voir tout
      recipientId = req.query.recipient_id || null;
      recipientType = req.query.recipient_type || null;
    } else if (user.role === 'agent') {
      // L'agent n'a accès qu'à ses propres notifications
      recipientId = user.id;
      recipientType = 'agent';
    } else {
      // Utilisateur lambda
      recipientId = user.id;
      recipientType = 'client';
    }

    const result = await NotificationService.listNotifications({
      recipientId,
      recipientType,
      eventType: event_type,
      status,
      limit: Math.min(Number(limit) || 50, 100),
      offset: Number(offset) || 0
    });

    res.json(result);
  } catch (error) {
    console.error('[Notifications GET error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/notifications/templates
 * Description des 4 modèles d'architecture de notifications préparés
 */
router.get('/templates', authenticateToken, requireRoles('admin', 'agent'), (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: NOTIFICATION_EVENTS.CLIENT_REQUEST_CONFIRMATION,
        name: 'Confirmation de demande au client',
        description: 'Accusé de réception envoyé automatiquement au client avec récapitulatif du projet et référence.',
        variables: ['full_name', 'reference', 'project_type', 'property_type', 'commune', 'budget_max', 'currency'],
        supportedChannels: [CHANNELS.EMAIL, CHANNELS.WHATSAPP, CHANNELS.SMS]
      },
      {
        id: NOTIFICATION_EVENTS.AGENT_REQUEST_ASSIGNED,
        name: 'Notification à l’agent responsable',
        description: 'Alerte mission envoyée à l’agent certifié lors de l’attribution d’un dossier par la Direction.',
        variables: ['agent_name', 'client_name', 'phone', 'project', 'property_type', 'commune', 'reference'],
        supportedChannels: [CHANNELS.EMAIL, CHANNELS.WHATSAPP, CHANNELS.IN_APP]
      },
      {
        id: NOTIFICATION_EVENTS.VISIT_CONFIRMATION,
        name: 'Confirmation de visite immobilière',
        description: 'Rendez-vous terrain confirmé envoyé simultanément au client et à l’agent accompagnateur.',
        variables: ['client_name', 'agent_name', 'visit_date', 'visit_time', 'property_title'],
        supportedChannels: [CHANNELS.EMAIL, CHANNELS.WHATSAPP, CHANNELS.SMS]
      },
      {
        id: NOTIFICATION_EVENTS.VISIT_REMINDER,
        name: 'Rappel de visite',
        description: 'Rappel automatique envoyé avant l’heure du rendez-vous (J-1 ou H-2) pour garantir la présence sur place.',
        variables: ['client_name', 'visit_date', 'visit_time', 'property_title', 'agent_name'],
        supportedChannels: [CHANNELS.WHATSAPP, CHANNELS.SMS, CHANNELS.EMAIL]
      }
    ]
  });
});

/**
 * POST /api/notifications/test-template
 * Aperçu du rendu d'un template (sans envoi externe)
 */
router.post('/test-template', authenticateToken, requireAdmin, (req, res) => {
  const { event_type, sample_data = {} } = req.body;

  let rendered = null;
  switch (event_type) {
    case NOTIFICATION_EVENTS.CLIENT_REQUEST_CONFIRMATION:
      rendered = NotificationTemplateEngine.clientRequestConfirmation({
        full_name: sample_data.full_name || 'Alain Mputu',
        reference: sample_data.reference || 'KIN-84920',
        project_type: sample_data.project_type || 'Acheter',
        property_type: sample_data.property_type || 'Villa avec piscine',
        commune: sample_data.commune || 'Gombe',
        budget_max: sample_data.budget_max || 450000,
        currency: 'USD'
      });
      break;
    case NOTIFICATION_EVENTS.AGENT_REQUEST_ASSIGNED:
      rendered = NotificationTemplateEngine.agentRequestAssigned(
        {
          full_name: sample_data.full_name || 'Mireille Kanza',
          phone: sample_data.phone || '+243 84 000 0000',
          reference: 'KIN-84920',
          project_type: 'Louer',
          property_type: 'Appartement 3 chambres',
          commune: 'Ngaliema'
        },
        { name: sample_data.agent_name || 'Patrick Tshisekedi' }
      );
      break;
    case NOTIFICATION_EVENTS.VISIT_CONFIRMATION:
      rendered = NotificationTemplateEngine.visitConfirmation(
        {
          visit_date: '2026-10-05',
          visit_time: '15:30',
          property_title: 'Duplex vue Fleuve Congo, Gombe',
          client_name: 'David Kalombo',
          agent_name: 'Sarah Mwamba'
        },
        null,
        { name: 'Sarah Mwamba', phone: '+243 82 111 2222' }
      );
      break;
    case NOTIFICATION_EVENTS.VISIT_REMINDER:
      rendered = NotificationTemplateEngine.visitReminder(
        {
          visit_date: 'Aujourd’hui',
          visit_time: '15:30',
          property_title: 'Duplex vue Fleuve Congo, Gombe',
          client_name: 'David Kalombo',
          agent_name: 'Sarah Mwamba'
        },
        null,
        { name: 'Sarah Mwamba' }
      );
      break;
    default:
      return res.status(400).json({ success: false, error: 'Type d’événement invalide.' });
  }

  res.json({
    success: true,
    event_type,
    simulated: true,
    notice: 'Structure backend uniquement. Aucune API externe n’a été contactée.',
    rendered
  });
});

/**
 * POST /api/notifications/trigger-reminder/:visitId
 * Déclenchement manuel ou planifié d'un rappel de visite
 */
router.post('/trigger-reminder/:visitId', authenticateToken, requireRoles('admin', 'agent'), async (req, res) => {
  try {
    const { visitId } = req.params;
    const user = req.user;

    // Requête SQL paramétrée
    const [visitRows] = await pool.query('SELECT * FROM property_visits WHERE id = ?', [visitId]);
    if (visitRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Visite introuvable.' });
    }

    const visit = visitRows[0];

    // Vérification de sécurité des rôles : si agent, vérifier qu'il est bien assigné à cette visite
    if (user.role === 'agent' && visit.agent_id !== user.id) {
      return res.status(403).json({
        success: false,
        error: 'Accès interdit : vous ne pouvez déclencher des rappels que pour vos propres visites.'
      });
    }

    // Récupérer la demande associée
    let request = null;
    if (visit.request_id) {
      const [reqRows] = await pool.query('SELECT * FROM concierge_requests WHERE id = ?', [visit.request_id]);
      if (reqRows.length > 0) request = reqRows[0];
    }

    // Récupérer l'agent associé
    let agent = null;
    if (visit.agent_id) {
      const [agentRows] = await pool.query('SELECT id, name, email, phone FROM users WHERE id = ?', [visit.agent_id]);
      if (agentRows.length > 0) agent = agentRows[0];
    }

    const notifResult = await NotificationService.triggerVisitReminder(visit, request, agent);

    res.json({
      success: true,
      message: 'Rappel de visite enregistré dans la file d’attente backend.',
      notification: notifResult
    });
  } catch (error) {
    console.error('[Trigger Reminder error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
