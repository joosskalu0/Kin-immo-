const pool = require('../config/database');

/**
 * Envoyer un message ou une demande de visite pour un bien
 * POST /api/messages
 */
async function sendMessage(req, res, next) {
  try {
    const {
      propertyId,
      receiverId,
      name,
      email,
      phone,
      message,
      requestType = 'info',
      tourDate,
      tourTime
    } = req.body;

    if (!message || !name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Veuillez renseigner votre nom, e-mail et votre message.'
      });
    }

    let targetReceiverId = receiverId;

    // Si le receiverId n'est pas spécifié, on le déduit de l'agent de la propriété
    if (!targetReceiverId && propertyId) {
      const [pRows] = await pool.execute('SELECT agent_id FROM properties WHERE id = ?', [propertyId]);
      if (pRows.length > 0 && pRows[0].agent_id) {
        targetReceiverId = pRows[0].agent_id;
      }
    }

    if (!targetReceiverId) {
      // Si aucun agent, message envoyé à l'administrateur par défaut
      const [adminRows] = await pool.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (adminRows.length > 0) {
        targetReceiverId = adminRows[0].id;
      } else {
        return res.status(400).json({ success: false, message: 'Destinataire du message introuvable.' });
      }
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const senderId = req.user ? req.user.id : null;

    await pool.execute(
      `INSERT INTO messages (
        id, property_id, sender_id, receiver_id, sender_name, sender_email, sender_phone,
        message, request_type, tour_date, tour_time, status, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', FALSE)`,
      [
        messageId,
        propertyId || null,
        senderId,
        targetReceiverId,
        name.trim(),
        email.toLowerCase().trim(),
        phone || null,
        message.trim(),
        requestType,
        tourDate || null,
        tourTime || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Votre message a été transmis avec succès à l\'agent immobilier.',
      messageId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer les messages reçus par l'agent ou l'agence connecté(e)
 * GET /api/messages/inbox
 */
async function getReceivedMessages(req, res, next) {
  try {
    const userId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT m.*, p.title as property_title, p.price as property_price, p.currency as property_currency,
              (SELECT image_url FROM property_images WHERE property_id = p.id ORDER BY display_order ASC LIMIT 1) as property_thumbnail
       FROM messages m
       LEFT JOIN properties p ON m.property_id = p.id
       WHERE m.receiver_id = ?
       ORDER BY m.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      count: rows.length,
      messages: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Marquer un message comme lu ou mettre à jour son statut
 * PUT /api/messages/:id/status
 */
async function updateMessageStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, isRead } = req.body;

    await pool.execute(
      `UPDATE messages
       SET status = COALESCE(?, status),
           is_read = COALESCE(?, is_read)
       WHERE id = ? AND receiver_id = ?`,
      [status || null, isRead !== undefined ? Boolean(isRead) : null, id, req.user.id]
    );

    res.json({ success: true, message: 'Statut du message mis à jour.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  sendMessage,
  getReceivedMessages,
  updateMessageStatus
};
