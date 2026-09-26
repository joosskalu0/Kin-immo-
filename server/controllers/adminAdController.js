const AdPartner = require('../models/AdPartner');
const AdCampaign = require('../models/AdCampaign');
const AdPlacement = require('../models/AdPlacement');
const AdPayment = require('../models/AdPayment');
const AdStats = require('../models/AdStats');
const AdImpression = require('../models/AdImpression');
const AdClick = require('../models/AdClick');
const crypto = require('crypto');

class AdminAdController {
  // ==========================================
  // 1. GESTION DES PARTENAIRES
  // ==========================================

  static async getPartners(req, res) {
    try {
      const { status, search } = req.query;
      const partners = await AdPartner.findAll({ status, search });
      return res.json({ success: true, count: partners.length, data: partners });
    } catch (error) {
      console.error('getPartners error:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la récupération des partenaires.' });
    }
  }

  static async getPartnerById(req, res) {
    try {
      const partner = await AdPartner.findById(req.params.id);
      if (!partner) {
        return res.status(404).json({ success: false, message: 'Partenaire introuvable.' });
      }
      return res.json({ success: true, data: partner });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }

  static async createPartner(req, res) {
    try {
      const id = 'part_' + crypto.randomBytes(6).toString('hex');
      const partner = await AdPartner.create({ id, ...req.body });
      return res.status(201).json({ success: true, message: 'Partenaire créé avec succès.', data: partner });
    } catch (error) {
      console.error('createPartner error:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la création du partenaire.' });
    }
  }

  static async updatePartner(req, res) {
    try {
      const updated = await AdPartner.update(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Partenaire introuvable.' });
      }
      return res.json({ success: true, message: 'Partenaire mis à jour.', data: updated });
    } catch (error) {
      console.error('updatePartner error:', error);
      return res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour.' });
    }
  }

  static async deletePartner(req, res) {
    try {
      const soft = req.query.soft !== 'false';
      const success = await AdPartner.delete(req.params.id, soft);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Partenaire introuvable.' });
      }
      return res.json({
        success: true,
        message: soft ? 'Partenaire désactivé (soft delete).' : 'Partenaire supprimé définitivement.'
      });
    } catch (error) {
      console.error('deletePartner error:', error);
      return res.status(500).json({ success: false, message: 'Erreur suppression partenaire.' });
    }
  }

  // ==========================================
  // 2. GESTION DES CAMPAGNES
  // ==========================================

  static async getCampaigns(req, res) {
    try {
      const { partner_id, placement_id, status } = req.query;
      const campaigns = await AdCampaign.findAll({ partner_id, placement_id, status });
      return res.json({ success: true, count: campaigns.length, data: campaigns });
    } catch (error) {
      console.error('getCampaigns error:', error);
      return res.status(500).json({ success: false, message: 'Erreur récupération campagnes.' });
    }
  }

  static async getCampaignById(req, res) {
    try {
      const campaign = await AdCampaign.findById(req.params.id);
      if (!campaign) {
        return res.status(404).json({ success: false, message: 'Campagne introuvable.' });
      }
      return res.json({ success: true, data: campaign });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur serveur.' });
    }
  }

  static async createCampaign(req, res) {
    try {
      const id = 'cmp_' + crypto.randomBytes(6).toString('hex');
      const campaign = await AdCampaign.create({ id, ...req.body });
      return res.status(201).json({ success: true, message: 'Campagne créée avec succès.', data: campaign });
    } catch (error) {
      console.error('createCampaign error:', error);
      return res.status(500).json({ success: false, message: 'Erreur création campagne.' });
    }
  }

  static async updateCampaign(req, res) {
    try {
      const updated = await AdCampaign.update(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Campagne introuvable.' });
      }
      return res.json({ success: true, message: 'Campagne mise à jour.', data: updated });
    } catch (error) {
      console.error('updateCampaign error:', error);
      return res.status(500).json({ success: false, message: 'Erreur mise à jour campagne.' });
    }
  }

  static async toggleCampaignStatus(req, res) {
    try {
      const { status } = req.body;
      const validStatuses = ['active', 'paused', 'expired', 'archived', 'draft'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Statut non valide.' });
      }

      const updated = await AdCampaign.toggleStatus(req.params.id, status);
      return res.json({ success: true, message: `Statut modifié en "${status}".`, data: updated });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur modification statut.' });
    }
  }

  static async deleteCampaign(req, res) {
    try {
      const success = await AdCampaign.delete(req.params.id);
      if (!success) {
        return res.status(404).json({ success: false, message: 'Campagne introuvable.' });
      }
      return res.json({ success: true, message: 'Campagne supprimée.' });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur suppression.' });
    }
  }

  // ==========================================
  // 3. GESTION DES EMPLACEMENTS (PLACEMENTS)
  // ==========================================

  static async getPlacements(req, res) {
    try {
      const placements = await AdPlacement.findAll();
      return res.json({ success: true, data: placements });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur récupération emplacements.' });
    }
  }

  static async updatePlacement(req, res) {
    try {
      const updated = await AdPlacement.update(req.params.id, req.body);
      return res.json({ success: true, message: 'Emplacement mis à jour.', data: updated });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur mise à jour emplacement.' });
    }
  }

  // ==========================================
  // 4. GESTION DES PAIEMENTS PARTENAIRES
  // ==========================================

  static async getPayments(req, res) {
    try {
      const { partner_id, status } = req.query;
      const payments = await AdPayment.findAll({ partner_id, status });
      const summary = await AdPayment.getFinancialSummary();
      return res.json({ success: true, count: payments.length, summary, data: payments });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur récupération paiements.' });
    }
  }

  static async recordPayment(req, res) {
    try {
      const id = 'pay_' + crypto.randomBytes(6).toString('hex');
      const recorded_by_user_id = req.user ? req.user.id : null;

      const payment = await AdPayment.create({
        id,
        recorded_by_user_id,
        ...req.body
      });

      return res.status(201).json({
        success: true,
        message: 'Paiement partenaire enregistré avec succès.',
        data: payment
      });
    } catch (error) {
      console.error('recordPayment error:', error);
      return res.status(500).json({ success: false, message: 'Erreur enregistrement paiement.' });
    }
  }

  // ==========================================
  // 5. STATISTIQUES & ANALYTICS
  // ==========================================

  static async getStatsOverview(req, res) {
    try {
      const overview = await AdStats.getOverview();
      return res.json({ success: true, data: overview });
    } catch (error) {
      console.error('getStatsOverview error:', error);
      return res.status(500).json({ success: false, message: 'Erreur calcul statistiques.' });
    }
  }

  static async getCampaignStats(req, res) {
    try {
      const { id } = req.params;
      const impressionsHistory = await AdImpression.getStats(id);
      const clicksHistory = await AdClick.getStats(id);
      const campaign = await AdCampaign.findById(id);

      return res.json({
        success: true,
        campaign,
        history: {
          impressions: impressionsHistory,
          clicks: clicksHistory
        }
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Erreur statistiques campagne.' });
    }
  }
}

module.exports = AdminAdController;
