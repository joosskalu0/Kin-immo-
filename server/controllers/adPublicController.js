const AdCampaign = require('../models/AdCampaign');
const AdPlacement = require('../models/AdPlacement');
const AdImpression = require('../models/AdImpression');
const AdClick = require('../models/AdClick');
const crypto = require('crypto');

/**
 * Contrôleur public pour la diffusion des publicités
 */
class AdPublicController {
  /**
   * GET /api/ads/:placement
   * Recherche une campagne partenaire active correspondant à l'emplacement demandé.
   * Si aucune campagne partenaire active/valide n'existe, retourne les informations
   * pour afficher l'emplacement Google AdSense (sans jamais simuler de revenus).
   */
  static async getAdForPlacement(req, res) {
    try {
      const { placement } = req.params;

      // 1. Vérifier si l'emplacement existe
      const placementConfig = await AdPlacement.findById(placement);
      if (!placementConfig || !placementConfig.is_active) {
        return res.status(404).json({
          success: false,
          message: `Emplacement publicitaire inconnu ou inactif : "${placement}"`
        });
      }

      // 2. Chercher une campagne partenaire active et non expirée
      const activePartnerCampaign = await AdCampaign.findActiveByPlacement(placement);

      if (activePartnerCampaign) {
        return res.json({
          success: true,
          type: 'partner',
          placement: placement,
          ad: {
            id: activePartnerCampaign.id,
            partner_id: activePartnerCampaign.partner_id,
            title: activePartnerCampaign.title,
            description: activePartnerCampaign.description,
            image_url: activePartnerCampaign.image_url,
            target_url: activePartnerCampaign.target_url,
            advertiser_name: activePartnerCampaign.advertiser_name,
            advertiser_phone: activePartnerCampaign.advertiser_phone,
            advertiser_whatsapp: activePartnerCampaign.advertiser_whatsapp
          }
        });
      }

      // 3. Aucun partenaire actif sur cet emplacement
      return res.json({
        success: true,
        type: 'none',
        placement: placement,
        ad: null,
        message: 'Aucune publicité partenaire active pour cet emplacement.'
      });

    } catch (error) {
      console.error('Erreur getAdForPlacement:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération de la publicité.'
      });
    }
  }

  /**
   * POST /api/ads/:campaignId/impression
   * Enregistre l'affichage (impression) d'une campagne partenaire
   */
  static async recordImpression(req, res) {
    try {
      const { campaignId } = req.params;
      const { placement_id } = req.body;

      const campaign = await AdCampaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campagne introuvable.' });
      }

      const impressionId = 'imp_' + crypto.randomBytes(8).toString('hex');
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;
      const referer = req.headers['referer'] || null;

      await AdImpression.record({
        id: impressionId,
        campaign_id: campaignId,
        placement_id: placement_id || campaign.placement_id,
        ip_address: ip,
        user_agent: userAgent,
        referer: referer
      });

      return res.status(201).json({ success: true, message: 'Impression enregistrée.' });
    } catch (error) {
      console.error('Erreur recordImpression:', error);
      return res.status(500).json({ success: false, message: 'Erreur enregistrement impression.' });
    }
  }

  /**
   * POST /api/ads/:campaignId/click
   * Enregistre le clic d'une campagne partenaire et renvoie l'URL de redirection
   */
  static async recordClick(req, res) {
    try {
      const { campaignId } = req.params;
      const { placement_id } = req.body;

      const campaign = await AdCampaign.findById(campaignId);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campagne introuvable.' });
      }

      const clickId = 'clk_' + crypto.randomBytes(8).toString('hex');
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const userAgent = req.headers['user-agent'] || null;

      await AdClick.record({
        id: clickId,
        campaign_id: campaignId,
        placement_id: placement_id || campaign.placement_id,
        ip_address: ip,
        user_agent: userAgent
      });

      return res.json({
        success: true,
        message: 'Clic enregistré avec succès.',
        target_url: campaign.target_url
      });
    } catch (error) {
      console.error('Erreur recordClick:', error);
      return res.status(500).json({ success: false, message: 'Erreur enregistrement clic.' });
    }
  }
}

module.exports = AdPublicController;
