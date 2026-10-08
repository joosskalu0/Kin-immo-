/**
 * Service de Gestion des Notifications - Kinimmo RDC
 * 
 * Architecture préparée pour l'envoi différé :
 * 1. Confirmation de demande au client (client_request_confirmation)
 * 2. Notification à l’agent responsable (agent_request_assigned)
 * 3. Confirmation de visite immobilière (visit_confirmation)
 * 4. Rappel de visite immobilière (visit_reminder)
 * 
 * IMPORTANT : Aucune API externe n'est appelée sans accord préalable.
 * Les notifications sont persistées en base de données (file d'attente / journal)
 * avec un dispatcher abstrait prêt pour un futur connecteur (SMTP, WhatsApp, SMS).
 */

const pool = require('../config/database');

const NOTIFICATION_EVENTS = {
  CLIENT_REQUEST_CONFIRMATION: 'client_request_confirmation',
  AGENT_REQUEST_ASSIGNED: 'agent_request_assigned',
  VISIT_CONFIRMATION: 'visit_confirmation',
  VISIT_REMINDER: 'visit_reminder',
  STATUS_UPDATE: 'status_update'
};

const CHANNELS = {
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  IN_APP: 'in_app'
};

const STATUSES = {
  PENDING: 'pending',
  QUEUED: 'queued',
  SENT: 'sent',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Générateur de modèles de notifications (Templates)
 */
class NotificationTemplateEngine {
  /**
   * 1. Confirmation de demande au client
   */
  static clientRequestConfirmation(request) {
    const clientName = request.full_name || 'Cher client';
    const reference = request.reference || request.id?.slice(-6) || 'KIN';
    const project = request.project_type || request.projet || 'Projet Immobilier';
    const typeBien = request.property_type || request.typeBien || 'Bien immobilier';
    const commune = request.commune || 'Kinshasa';
    const budgetMax = request.budget_max ? `${Number(request.budget_max).toLocaleString()} ${request.currency || 'USD'}` : 'Sur mesure';

    const subject = `[Kinimmo] Confirmation de votre demande de Conciergerie #${reference}`;
    const text = `Bonjour ${clientName},

Nous accusons bonne réception de votre demande de conciergerie immobilière (#${reference}) sur la plateforme Kinimmo.

Récapitulatif de votre recherche :
- Projet : ${project}
- Type de bien : ${typeBien}
- Commune ciblée : ${commune}
- Budget max : ${budgetMax}

Un conseiller dédié examine actuellement votre dossier pour sélectionner les meilleures opportunités disponibles sur le marché de Kinshasa et prendra contact avec vous très rapidement.

Cordialement,
L'équipe Conciergerie Kinimmo Kinshasa`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #047857; padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 1px;">KIN IMMOBILIER</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Accusé de réception - Conciergerie Kinshasa</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px;">Bonjour <strong>${clientName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6;">
            Votre demande d'accompagnement sur mesure a bien été enregistrée sous la référence <strong style="color: #047857;">#${reference}</strong>.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a;">Détails de votre recherche :</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">
              <li><strong>Projet :</strong> ${project}</li>
              <li><strong>Type de bien :</strong> ${typeBien}</li>
              <li><strong>Commune ciblée :</strong> ${commune}</li>
              <li><strong>Budget maximal :</strong> ${budgetMax}</li>
            </ul>
          </div>
          <p style="font-size: 14px; line-height: 1.6;">
            Notre équipe de concierges immobiliers commence les recherches auprès de notre réseau d'agences et de propriétaires certifiés. Vous serez contacté dans les plus brefs délais.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
          Kinimmo RDC • Conciergerie Immobilière & Partenariats • Kinshasa
        </div>
      </div>
    `;

    return { subject, text, html };
  }

  /**
   * 2. Notification à l’agent responsable
   */
  static agentRequestAssigned(request, agent) {
    const agentName = agent?.name || 'Agent Kinimmo';
    const clientName = request.full_name || 'Client';
    const clientPhone = request.phone || 'Non renseigné';
    const reference = request.reference || request.id?.slice(-6) || 'KIN';
    const project = request.project_type || request.projet || 'Recherche';
    const typeBien = request.property_type || request.typeBien || 'Bien';
    const commune = request.commune || 'Kinshasa';

    const subject = `[Kinimmo Agent] Nouvelle mission de Conciergerie assignée #${reference}`;
    const text = `Bonjour ${agentName},

Une nouvelle demande de conciergerie immobilière (#${reference}) vous a été attribuée par la Direction.

Fiche Client :
- Client : ${clientName}
- Téléphone : ${clientPhone}
- Projet : ${project} (${typeBien})
- Commune : ${commune}

Veuillez consulter votre tableau de bord agent ou prendre contact avec le client pour qualifier ses besoins.

L'administration Kinimmo`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #1e293b; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 18px;">Attribution de Mission Conciergerie</h2>
          <span style="font-size: 12px; color: #34d399;">Réf. #${reference}</span>
        </div>
        <div style="padding: 20px;">
          <p style="font-size: 14px;">Bonjour <strong>${agentName}</strong>,</p>
          <p style="font-size: 13px; line-height: 1.6;">
            La demande de conciergerie de <strong>${clientName}</strong> vous a été assignée.
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin: 14px 0;">
            <p style="margin: 4px 0; font-size: 13px;"><strong>Téléphone :</strong> ${clientPhone}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Projet :</strong> ${project} - ${typeBien}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Commune :</strong> ${commune}</p>
          </div>
          <p style="font-size: 13px; color: #475569;">
            Merci de contacter le client et de mettre à jour le statut dans la console agent.
          </p>
        </div>
      </div>
    `;

    return { subject, text, html };
  }

  /**
   * 3. Confirmation de visite
   */
  static visitConfirmation(visit, request, agent) {
    const clientName = request?.full_name || visit.client_name || 'Client';
    const agentName = agent?.name || visit.agent_name || 'Votre conseiller';
    const agentPhone = agent?.phone || 'Direction Kinimmo';
    const date = visit.visit_date;
    const time = visit.visit_time || '14:00';
    const propertyTitle = visit.property_title || 'Propriété sélectionnée';

    const subject = `[Kinimmo] Confirmation de votre visite immobilière le ${date}`;
    const text = `Bonjour ${clientName},

Votre visite immobilière est confirmée pour le :
- Date : ${date} à ${time}
- Bien : ${propertyTitle}
- Agent accompagnateur : ${agentName} (Tél: ${agentPhone})

Nous vous recommandons d'être sur place 10 minutes avant le rendez-vous. En cas d'empêchement, merci de prévenir votre agent.

L'équipe Conciergerie Kinimmo`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #06b6d4; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #0891b2; padding: 22px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 18px;">Rendez-vous de Visite Confirmé</h2>
          <p style="margin: 4px 0 0; font-size: 13px;">Conciergerie Immobilière Kinshasa</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 14px;">Bonjour <strong>${clientName}</strong>,</p>
          <div style="background-color: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Date :</strong> ${date}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Heure :</strong> ${time}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Bien à visiter :</strong> ${propertyTitle}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Agent :</strong> ${agentName} (${agentPhone})</p>
          </div>
          <p style="font-size: 13px; color: #475569;">
            Votre agent vous accueillera à l'adresse indiquée pour la visite des lieux et l'étude des documents techniques.
          </p>
        </div>
      </div>
    `;

    return { subject, text, html };
  }

  /**
   * 4. Rappel de visite (envoyé H-2 ou J-1)
   */
  static visitReminder(visit, request, agent) {
    const clientName = request?.full_name || visit.client_name || 'Client';
    const agentName = agent?.name || visit.agent_name || 'Votre conseiller';
    const date = visit.visit_date;
    const time = visit.visit_time || '14:00';
    const propertyTitle = visit.property_title || 'Bien sélectionné';

    const subject = `[Rappel Kinimmo] Visite immobilière prévue aujourd'hui à ${time}`;
    const text = `Bonjour ${clientName},

Ceci est un rappel pour votre visite immobilière prévue :
- Date : ${date} à ${time}
- Bien : ${propertyTitle}
- Agent accompagnateur : ${agentName}

Veuillez confirmer votre présence si nécessaire par retour de message.

À très bientôt,
Kinimmo RDC`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; border: 1px solid #fbbf24; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #d97706; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 18px;">Rappel de Visite Immobilière</h2>
        </div>
        <div style="padding: 22px;">
          <p style="font-size: 14px;">Bonjour <strong>${clientName}</strong>,</p>
          <p style="font-size: 13px;">Nous vous rappelons votre visite programmée :</p>
          <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px; margin: 14px 0;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Horaire :</strong> Aujourd'hui à ${time}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Propriété :</strong> ${propertyTitle}</p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Accompagnateur :</strong> ${agentName}</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            En cas de retard ou d'imprévu, veuillez contacter votre agent sans délai.
          </p>
        </div>
      </div>
    `;

    return { subject, text, html };
  }
}

/**
 * Service principal de notification
 */
class NotificationService {
  /**
   * Enregistre une notification dans la file d'attente (sans API externe)
   */
  static async enqueueNotification({
    eventType,
    recipientType,
    recipientId = null,
    recipientName,
    recipientEmail = null,
    recipientPhone = null,
    channel = CHANNELS.EMAIL,
    title,
    contentText,
    contentHtml = null,
    metadata = {},
    scheduledFor = null
  }) {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const status = STATUSES.QUEUED;
    const metadataJson = JSON.stringify(metadata || {});

    try {
      const query = `
        INSERT INTO notifications (
          id, event_type, recipient_type, recipient_id, recipient_name,
          recipient_email, recipient_phone, channel, title, content_text,
          content_html, status, metadata, scheduled_for, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      await pool.query(query, [
        id,
        eventType,
        recipientType,
        recipientId,
        recipientName,
        recipientEmail,
        recipientPhone,
        channel,
        title,
        contentText,
        contentHtml,
        status,
        metadataJson,
        scheduledFor
      ]);

      console.log(`[NotificationService] Notification mise en file d'attente [ID: ${id}, Type: ${eventType}, Destinataire: ${recipientName}]`);
      return { success: true, id, status, eventType };
    } catch (error) {
      console.warn('[NotificationService Warning] Échec insertion SQL notification (table possiblement non créée) :', error.message);
      // Fallback gracieux pour continuer l'exécution
      return { success: false, error: error.message, id };
    }
  }

  /**
   * 1. Déclencher confirmation de demande au client
   */
  static async triggerClientRequestConfirmation(request) {
    if (!request) return;
    const tpl = NotificationTemplateEngine.clientRequestConfirmation(request);

    return this.enqueueNotification({
      eventType: NOTIFICATION_EVENTS.CLIENT_REQUEST_CONFIRMATION,
      recipientType: 'client',
      recipientId: request.user_id || null,
      recipientName: request.full_name || request.client?.nomComplet || 'Client',
      recipientEmail: request.email || request.client?.email || null,
      recipientPhone: request.phone || request.client?.telephone || null,
      channel: request.email ? CHANNELS.EMAIL : CHANNELS.SMS,
      title: tpl.subject,
      contentText: tpl.text,
      contentHtml: tpl.html,
      metadata: {
        requestId: request.id,
        reference: request.reference || request.id
      }
    });
  }

  /**
   * 2. Déclencher notification à l'agent
   */
  static async triggerAgentNotification(request, agent) {
    if (!request || !agent) return;
    const tpl = NotificationTemplateEngine.agentRequestAssigned(request, agent);

    return this.enqueueNotification({
      eventType: NOTIFICATION_EVENTS.AGENT_REQUEST_ASSIGNED,
      recipientType: 'agent',
      recipientId: agent.id,
      recipientName: agent.name,
      recipientEmail: agent.email,
      recipientPhone: agent.phone,
      channel: CHANNELS.EMAIL,
      title: tpl.subject,
      contentText: tpl.text,
      contentHtml: tpl.html,
      metadata: {
        requestId: request.id,
        agentId: agent.id
      }
    });
  }

  /**
   * 3. Déclencher confirmation de visite (client & agent)
   */
  static async triggerVisitConfirmation(visit, request, agent) {
    if (!visit) return;
    const tpl = NotificationTemplateEngine.visitConfirmation(visit, request, agent);

    const clientNotif = this.enqueueNotification({
      eventType: NOTIFICATION_EVENTS.VISIT_CONFIRMATION,
      recipientType: 'client',
      recipientId: request?.user_id || null,
      recipientName: request?.full_name || visit.client_name || 'Client',
      recipientEmail: request?.email || null,
      recipientPhone: request?.phone || null,
      channel: CHANNELS.EMAIL,
      title: tpl.subject,
      contentText: tpl.text,
      contentHtml: tpl.html,
      metadata: {
        visitId: visit.id,
        requestId: visit.request_id
      }
    });

    return clientNotif;
  }

  /**
   * 4. Déclencher rappel de visite
   */
  static async triggerVisitReminder(visit, request, agent) {
    if (!visit) return;
    const tpl = NotificationTemplateEngine.visitReminder(visit, request, agent);

    return this.enqueueNotification({
      eventType: NOTIFICATION_EVENTS.VISIT_REMINDER,
      recipientType: 'client',
      recipientId: request?.user_id || null,
      recipientName: request?.full_name || visit.client_name || 'Client',
      recipientEmail: request?.email || null,
      recipientPhone: request?.phone || null,
      channel: CHANNELS.EMAIL,
      title: tpl.subject,
      contentText: tpl.text,
      contentHtml: tpl.html,
      metadata: {
        visitId: visit.id,
        visitDate: visit.visit_date,
        visitTime: visit.visit_time
      }
    });
  }

  /**
   * Liste sécurisée des notifications avec filtres
   */
  static async listNotifications({
    recipientId = null,
    recipientType = null,
    eventType = null,
    status = null,
    limit = 50,
    offset = 0
  } = {}) {
    try {
      let query = 'SELECT * FROM notifications WHERE 1=1';
      const params = [];

      if (recipientId) {
        query += ' AND recipient_id = ?';
        params.push(recipientId);
      }
      if (recipientType) {
        query += ' AND recipient_type = ?';
        params.push(recipientType);
      }
      if (eventType) {
        query += ' AND event_type = ?';
        params.push(eventType);
      }
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(Number(limit), Number(offset));

      const [rows] = await pool.query(query, params);
      return { success: true, count: rows.length, data: rows };
    } catch (error) {
      console.warn('[NotificationService list error]', error.message);
      return { success: true, count: 0, data: [] };
    }
  }
}

module.exports = {
  NotificationService,
  NotificationTemplateEngine,
  NOTIFICATION_EVENTS,
  CHANNELS,
  STATUSES
};
