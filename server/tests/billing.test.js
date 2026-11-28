/**
 * Tests Unitaires : BillingController (Commandes de Boost, Auto-amorçage, FK payment_method_id, RBAC & Transactions)
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';

const realPool = require('../config/database');
const billingController = require('../controllers/billingController');
const errorHandler = require('../middleware/errorHandler');

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

describe('BillingController - createBoostOrder & résolution FK', () => {
  it('auto-amorce payment_methods et visibility_options si tables vides et crée la commande de boost dans une transaction', async () => {
    const origExecute = realPool.execute;
    const origGetConnection = realPool.getConnection;

    const paymentMethodsDb = new Map();
    const visibilityOptionsDb = new Map();
    const txCalls = [];
    const insertedInvoices = [];
    const insertedBoosts = [];

    const runSql = async (sql, params = []) => {
      if (sql.includes('FROM site_settings')) {
        return [[{ setting_value: '2850' }]];
      }
      if (sql.includes('FROM users WHERE id = ?')) {
        return [[{ id: params[0], role: 'agent', agency_id: null, email: 'agent@kinimmo.cd' }]];
      }
      if (sql.includes('FROM properties WHERE id = ?')) {
        return [[{
          id: 'prop_1',
          title: 'Terrain à vendre',
          status: 'for-sale',
          published: 1,
          soft_hidden_by_plan: 0,
          agent_id: 'agent_1',
          agency_id: null,
          custom_fields: JSON.stringify({ _mediaMeta: { listingStatus: 'PUBLISHED' } })
        }]];
      }
      if (sql.includes('SELECT COUNT(*) AS total FROM visibility_options')) {
        return [[{ total: visibilityOptionsDb.size }]];
      }
      if (sql.includes('INSERT IGNORE INTO visibility_options')) {
        if (!visibilityOptionsDb.has(params[0])) {
          visibilityOptionsDb.set(params[0], {
            id: params[0],
            name: params[1],
            slug: params[2],
            description: params[3],
            boost_type: params[4],
            duration_days: params[5],
            price_usd: params[6],
            price_cdf: params[7],
            badge_text: params[8],
            icon: params[9],
            is_active: params[10] ? 1 : 0,
          });
        }
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('FROM visibility_options WHERE id = ? AND is_active = TRUE')) {
        const opt = visibilityOptionsDb.get(params[0]);
        return [opt && opt.is_active ? [opt] : []];
      }
      if (sql.includes('FROM visibility_options WHERE id = ? LIMIT 1')) {
        const opt = visibilityOptionsDb.get(params[0]);
        return [opt ? [opt] : []];
      }
      if (sql.includes('SELECT COUNT(*) AS total FROM payment_methods')) {
        return [[{ total: paymentMethodsDb.size }]];
      }
      if (sql.includes('INSERT IGNORE INTO payment_methods')) {
        if (!paymentMethodsDb.has(params[0])) {
          paymentMethodsDb.set(params[0], { id: params[0], provider: params[1], is_active: 1 });
        }
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('FROM payment_methods WHERE id = ?')) {
        const pm = paymentMethodsDb.get(params[0]);
        return [pm ? [pm] : []];
      }
      if (sql.includes('INSERT INTO invoices')) {
        insertedInvoices.push(params);
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('INSERT INTO listing_boosts')) {
        insertedBoosts.push(params);
        return [{ affectedRows: 1 }];
      }
      return [[]];
    };

    realPool.execute = runSql;
    realPool.getConnection = async () => ({
      execute: runSql,
      beginTransaction: async () => { txCalls.push('begin'); },
      commit: async () => { txCalls.push('commit'); },
      rollback: async () => { txCalls.push('rollback'); },
      release: () => { txCalls.push('release'); },
    });

    try {
      const res = createMockRes();
      await billingController.createBoostOrder(
        {
          user: { id: 'agent_1', role: 'agent', email: 'agent@kinimmo.cd' },
          body: {
            propertyId: 'prop_1',
            optionId: 'opt_sponsorise_14d',
            paymentMethodId: 'pm_mpesa',
            paymentGateway: 'manual_mobile_money'
          }
        },
        res,
        (err) => { throw err; }
      );

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.success, true);
      assert.equal(res.body.invoice.paymentMethodId, 'pm_mpesa');
      assert.equal(res.body.invoice.optionId, 'opt_sponsorise_14d');
      assert.equal(insertedInvoices.length, 1);
      assert.equal(insertedBoosts.length, 1);
      assert.deepEqual(txCalls, ['begin', 'commit', 'release']);
    } finally {
      realPool.execute = origExecute;
      realPool.getConnection = origGetConnection;
    }
  });

  it('bascule payment_method_id à NULL si le moyen de paiement est inexistant/supprimé en base', async () => {
    const origExecute = realPool.execute;
    const origGetConnection = realPool.getConnection;
    const insertedInvoices = [];

    const runSql = async (sql, params = []) => {
      if (sql.includes('FROM site_settings')) return [[{ setting_value: '2850' }]];
      if (sql.includes('FROM users WHERE id = ?')) return [[{ id: 'agent_1', role: 'agent', email: 'a@b.cd' }]];
      if (sql.includes('FROM properties WHERE id = ?')) {
        return [[{ id: 'prop_1', title: 'Villa Gombe', status: 'for-sale', published: 1, agent_id: 'agent_1', custom_fields: '{}' }]];
      }
      if (sql.includes('FROM visibility_options WHERE id = ?')) {
        return [[{ id: 'opt_featured_7d', name: 'À la une 7j', slug: 'u', boost_type: 'featured', duration_days: 7, price_usd: 10, price_cdf: 28500, is_active: 1 }]];
      }
      if (sql.includes('FROM payment_methods WHERE id = ?')) return [[]];
      if (sql.includes('SELECT COUNT(*) AS total FROM payment_methods')) return [[{ total: 2 }]];
      if (sql.includes('INSERT INTO invoices')) {
        insertedInvoices.push(params);
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 1 }];
    };

    realPool.execute = runSql;
    realPool.getConnection = async () => ({
      execute: runSql,
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: () => {},
    });

    try {
      const res = createMockRes();
      await billingController.createBoostOrder(
        {
          user: { id: 'agent_1', role: 'agent' },
          body: { propertyId: 'prop_1', optionId: 'opt_featured_7d', paymentMethodId: 'pm_obsolete' }
        },
        res,
        (err) => { throw err; }
      );

      assert.equal(res.statusCode, 201);
      assert.equal(res.body.invoice.paymentMethodId, null);
      // 8e param (index 7) de INSERT INTO invoices = safePaymentMethodId
      assert.equal(insertedInvoices[0][7], null);
    } finally {
      realPool.execute = origExecute;
      realPool.getConnection = origGetConnection;
    }
  });

  it('refuse (HTTP 403) un agent qui tente de booster le bien d’un tiers et HTTP 400 pour un bien vendu', async () => {
    const origExecute = realPool.execute;

    realPool.execute = async (sql, params = []) => {
      if (sql.includes('FROM users WHERE id = ?')) {
        return [[{ id: params[0], role: 'agent', agency_id: 'ag_1', email: 'other@kinimmo.cd' }]];
      }
      if (sql.includes('FROM properties WHERE id = ?')) {
        return [[{
          id: params[0],
          title: 'Appartement tiers',
          status: params[0] === 'prop_sold' ? 'sold' : 'for-sale',
          published: 1,
          agent_id: params[0] === 'prop_sold' ? 'agent_1' : 'agent_owner',
          agency_id: 'ag_other',
          custom_fields: '{}'
        }]];
      }
      if (sql.includes('FROM agents WHERE id = ?')) return [[]];
      return [[]];
    };

    try {
      const resForbidden = createMockRes();
      await billingController.createBoostOrder(
        {
          user: { id: 'agent_1', role: 'agent', agency_id: 'ag_1', email: 'other@kinimmo.cd' },
          body: { propertyId: 'prop_other', optionId: 'opt_featured_7d' }
        },
        resForbidden,
        (err) => { throw err; }
      );
      assert.equal(resForbidden.statusCode, 403);
      assert.equal(resForbidden.body.success, false);

      const resSold = createMockRes();
      await billingController.createBoostOrder(
        {
          user: { id: 'agent_1', role: 'agent', agency_id: 'ag_1' },
          body: { propertyId: 'prop_sold', optionId: 'opt_featured_7d' }
        },
        resSold,
        (err) => { throw err; }
      );
      assert.equal(resSold.statusCode, 400);
      assert.match(resSold.body.message, /sold/i);
    } finally {
      realPool.execute = origExecute;
    }
  });

  it('annule la transaction (rollback) si l’insertion listing_boosts échoue', async () => {
    const origExecute = realPool.execute;
    const origGetConnection = realPool.getConnection;
    const txCalls = [];

    const runSql = async (sql) => {
      if (sql.includes('FROM site_settings')) return [[{ setting_value: '2850' }]];
      if (sql.includes('FROM users WHERE id = ?')) return [[{ id: 'agent_1', role: 'agent' }]];
      if (sql.includes('FROM properties WHERE id = ?')) {
        return [[{ id: 'prop_1', title: 'Maison', status: 'for-sale', published: 1, agent_id: 'agent_1', custom_fields: '{}' }]];
      }
      if (sql.includes('FROM visibility_options WHERE id = ?')) {
        return [[{ id: 'opt_featured_7d', name: 'À la une', slug: 'u', boost_type: 'featured', duration_days: 7, price_usd: 10, price_cdf: 28500, is_active: 1 }]];
      }
      if (sql.includes('FROM payment_methods WHERE id = ?')) return [[{ id: 'pm_mpesa' }]];
      if (sql.includes('INSERT INTO listing_boosts')) {
        throw new Error('Simulated DB failure');
      }
      return [{ affectedRows: 1 }];
    };

    realPool.execute = runSql;
    realPool.getConnection = async () => ({
      execute: runSql,
      beginTransaction: async () => { txCalls.push('begin'); },
      commit: async () => { txCalls.push('commit'); },
      rollback: async () => { txCalls.push('rollback'); },
      release: () => { txCalls.push('release'); },
    });

    try {
      let caught = null;
      await billingController.createBoostOrder(
        {
          user: { id: 'agent_1', role: 'agent' },
          body: { propertyId: 'prop_1', optionId: 'opt_featured_7d', paymentMethodId: 'pm_mpesa' }
        },
        createMockRes(),
        (err) => { caught = err; }
      );
      assert.ok(caught);
      assert.deepEqual(txCalls, ['begin', 'rollback', 'release']);
    } finally {
      realPool.execute = origExecute;
      realPool.getConnection = origGetConnection;
    }
  });

  it('createInvoice et submitPaymentProof sécurisent payment_method_id inexistant sans crash FK', async () => {
    const origExecute = realPool.execute;
    const queries = [];

    realPool.execute = async (sql, params = []) => {
      queries.push({ sql, params });
      if (sql.includes('FROM pricing_plans WHERE id = ?')) {
        return [[{ id: 'pro', name: 'Pro Courtier', price_usd: 29, price_yearly_usd: 290, is_active: 1 }]];
      }
      if (sql.includes('FROM site_settings')) return [[{ setting_value: '2850' }]];
      if (sql.includes('FROM users WHERE id = ?')) return [[{ id: 'agent_1' }]];
      if (sql.includes('FROM payment_methods WHERE id = ?')) return [[]];
      if (sql.includes('SELECT COUNT(*) AS total FROM payment_methods')) return [[{ total: 3 }]];
      if (sql.includes('FROM invoices WHERE id = ? AND user_id = ?')) return [[{ id: 'inv_1', user_id: 'agent_1' }]];
      return [{ affectedRows: 1 }];
    };

    try {
      const invRes = createMockRes();
      await billingController.createInvoice(
        {
          user: { id: 'agent_1' },
          body: { planId: 'pro', paymentMethodId: 'pm_deleted', billingCycle: 'monthly' }
        },
        invRes,
        (err) => { throw err; }
      );
      assert.equal(invRes.statusCode, 201);
      assert.equal(invRes.body.invoice.paymentMethodId, null);

      const payRes = createMockRes();
      await billingController.submitPaymentProof(
        {
          user: { id: 'agent_1' },
          params: { id: 'inv_1' },
          body: { paymentMethodId: 'pm_deleted', transactionReference: 'MPESA-12345' }
        },
        payRes,
        (err) => { throw err; }
      );
      assert.equal(payRes.statusCode, 200);
      assert.equal(payRes.body.status, 'awaiting_validation');
      const updateCall = queries.find((q) => q.sql.includes('UPDATE invoices'));
      assert.equal(updateCall.params[0], null);
    } finally {
      realPool.execute = origExecute;
    }
  });

  it('errorHandler traduit ER_NO_REFERENCED_ROW_2 sans fuite SQL brute', () => {
    const res = createMockRes();
    errorHandler(
      { code: 'ER_NO_REFERENCED_ROW_2', sqlMessage: 'Cannot add or update a child row: fk_invoices_payment_method' },
      {},
      res,
      () => {}
    );
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /moyen de paiement/i);
    assert.ok(!res.body.message.includes('fk_invoices_payment_method'));
  });
});
