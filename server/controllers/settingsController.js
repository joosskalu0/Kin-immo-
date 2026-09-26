const pool = require('../config/database');

// Configuration de repli par défaut pour Kinshasa
const DEFAULT_SETTINGS = {
  site_name: 'Kin Immobilier (Kinimmo)',
  contact_email: 'joosskalu72@gmail.com',
  support_phone: '+243 84 529 4616',
  support_whatsapp: '+243 84 529 4616',
  office_address: 'Avenue Kananga, Q/ Binza Pigeon, C/ Ngaliema, Kinshasa, RDC',
  working_hours: 'Lundi - Samedi : 08h00 - 18h30 | Urgences VIP 24h/7j',
  exchange_rate_usd_cdf: '2850',
  auto_approve_properties: 'false',
  vip_enabled: 'true',
  vip_title: 'Service Client VIP & Conciergerie',
  vip_subtitle: 'Conseillers Privés Disponibles 7j/7',
  vip_phone: '+243 84 529 4616',
  vip_whatsapp: '+243 84 529 4616',
  vip_email: 'joosskalu72@gmail.com',
  vip_description: 'Besoin d’un conseil d’expert, d’une visite privée ou d’un accompagnement sur-mesure pour une acquisition de prestige à Gombe ou Ngaliema ?',
  vip_message: 'Bonjour KINIMMO Conciergerie VIP, je souhaite être assisté personnellement pour trouver une résidence de standing ou un investissement immobilier à Kinshasa.'
};

/**
 * Récupérer les informations de contact et conciergerie VIP pour le public
 * GET /api/settings/contact
 */
async function getPublicContactSettings(req, res) {
  try {
    const [rows] = await pool.execute('SELECT setting_key, setting_value FROM site_settings');
    if (!rows || rows.length === 0) {
      return res.json({ success: true, settings: DEFAULT_SETTINGS });
    }

    const settings = { ...DEFAULT_SETTINGS };
    for (const r of rows) {
      settings[r.setting_key] = r.setting_value;
    }

    return res.json({ success: true, settings });
  } catch (error) {
    // Si la table n'a pas encore été créée dans MySQL, renvoyer les données par défaut sans erreur
    return res.json({ success: true, settings: DEFAULT_SETTINGS, fallback: true });
  }
}

module.exports = {
  getPublicContactSettings,
  DEFAULT_SETTINGS
};
