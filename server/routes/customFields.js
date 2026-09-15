const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * Route publique : Récupérer les critères publics pour la recherche et l'affichage des annonces
 * Les champs privés (ex: commissions secrètes, cadastre privé) sont automatiquement exclus
 * GET /api/custom-fields
 */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM custom_fields WHERE is_private = 0 ORDER BY created_at ASC');
    const fields = rows.map(r => ({
      id: r.id,
      key: r.field_key,
      label: {
        fr: r.label_fr,
        en: r.label_en || r.label_fr,
        ln: r.label_ln,
        sw: r.label_sw
      },
      type: r.type,
      group: r.field_group,
      options: typeof r.field_options === 'string' ? JSON.parse(r.field_options) : r.field_options,
      unit: r.unit,
      required: Boolean(r.required),
      isPrivate: false,
      showInSearch: Boolean(r.show_in_search),
      icon: r.icon || 'Zap'
    }));

    res.json({ success: true, fields });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
