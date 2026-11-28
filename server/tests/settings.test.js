/**
 * Tests Unitaires : Contrôleurs Settings, Admin & Billing (Taux de change USD/CDF)
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';

const realPool = require('../config/database');

after(async () => {
  await realPool.end();
});

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('AdminController & BillingController - Taux de change USD/CDF', () => {
  it('rejette un taux de change <= 0 ou invalide avec HTTP 400', async () => {
    const adminController = require('../controllers/adminController');
    const res = createMockRes();
    await adminController.updateSettings(
      { body: { exchange_rate_usd_cdf: -100 } },
      res,
      (err) => { throw err; }
    );
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  it('persiste exchange_rate_usd_cdf + exchange_rate_updated_at et recalcule les plans/boosts', async () => {
    const origExecute = realPool.execute;
    const queries = [];
    const storedSettings = {};

    realPool.execute = async (sql, params = []) => {
      queries.push({ sql, params });
      if (sql.includes('INSERT INTO site_settings')) {
        storedSettings[params[0]] = params[1];
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('SELECT setting_key, setting_value FROM site_settings')) {
        return [Object.entries(storedSettings).map(([setting_key, setting_value]) => ({ setting_key, setting_value }))];
      }
      if (sql.includes('SELECT setting_value FROM site_settings')) {
        return [[{ setting_value: storedSettings.exchange_rate_usd_cdf || '2950' }]];
      }
      if (sql.includes('FROM pricing_plans')) {
        return [[
          {
            id: 'pro',
            name: 'Pro Courtier',
            category: 'individual',
            audience: 'grand_public',
            price_usd: 29,
            price_cdf: 82650,
            price_yearly_usd: 290,
            price_yearly_cdf: 826500,
            is_active: 1,
          },
        ]];
      }
      if (sql.includes('FROM visibility_options')) {
        return [[
          {
            id: 'opt_featured_7d',
            name: 'À la une 7 jours',
            slug: 'mise_en_avant_7d',
            boost_type: 'featured',
            duration_days: 7,
            price_usd: 10,
            price_cdf: 28500,
            is_active: 1,
          },
        ]];
      }
      return [{ affectedRows: 1 }];
    };

    try {
      const adminController = require('../controllers/adminController');
      const billingController = require('../controllers/billingController');

      const saveRes = createMockRes();
      await adminController.updateSettings(
        { body: { exchange_rate_usd_cdf: 2950, default_currency: 'usd' } },
        saveRes,
        (err) => { throw err; }
      );

      assert.equal(saveRes.statusCode, 200);
      assert.equal(saveRes.body.success, true);
      assert.equal(storedSettings.exchange_rate_usd_cdf, '2950');
      assert.equal(storedSettings.default_currency, 'USD');
      assert.ok(storedSettings.exchange_rate_updated_at);
      assert.ok(queries.some((q) => q.sql.includes('UPDATE pricing_plans')));
      assert.ok(queries.some((q) => q.sql.includes('UPDATE visibility_options')));

      const plansRes = createMockRes();
      await billingController.getPlans({ query: {} }, plansRes, (err) => { throw err; });
      assert.equal(plansRes.body.success, true);
      assert.equal(plansRes.body.exchangeRate, 2950);
      assert.equal(plansRes.body.plans[0].price_cdf, 85550);
      assert.equal(plansRes.body.plans[0].price_yearly_cdf, 855500);

      const optsRes = createMockRes();
      await billingController.getVisibilityOptions({}, optsRes, (err) => { throw err; });
      assert.equal(optsRes.body.success, true);
      assert.equal(optsRes.body.exchangeRate, 2950);
      assert.equal(optsRes.body.options[0].price_cdf, 29500);
    } finally {
      realPool.execute = origExecute;
    }
  });
});
