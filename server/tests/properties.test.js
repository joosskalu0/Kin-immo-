/**
 * Tests Unitaires : Contrôleur Properties & Normalisation des paramètres MySQL
 */

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';

const realPool = require('../config/database');

after(async () => {
  await realPool.end();
});

describe('Database Pool - Normalisation des paramètres liés MySQL', () => {
  it('convertit undefined en null sans altérer 0, false, chaînes vides ou null', () => {
    const input = ['prop_1', undefined, 0, false, '', null, 'Terrain', undefined];
    const sanitized = realPool.sanitizeBindParams(input);
    assert.deepEqual(sanitized, ['prop_1', null, 0, false, '', null, 'Terrain', null]);
  });
});

describe('PropertiesController - Mise à jour et création sans paramètre undefined', () => {
  it('updateProperty ne passe aucun paramètre undefined à MySQL quand virtualTourUrl/videoUrl/yearBuilt sont absents', async () => {
    const executedCalls = [];
    const mockConnection = {
      async beginTransaction() {},
      async commit() {},
      async rollback() {},
      release() {},
      async query(sql, params = []) {
        assert.equal(
          params.some((v) => v === undefined),
          false,
          `query() a reçu un paramètre undefined sur: ${sql}`
        );
        return [[]];
      },
      async execute(sql, params = []) {
        executedCalls.push({ sql, params });
        assert.equal(
          params.some((v) => v === undefined),
          false,
          `execute() a reçu un paramètre undefined sur: ${sql}`
        );

        if (sql.includes('SELECT agent_id, agency_id, video_url, virtual_tour_url')) {
          return [[
            {
              agent_id: 'usr_1',
              agency_id: null,
              video_url: 'https://cdn.example.com/video.mp4',
              virtual_tour_url: 'https://my.matterport.com/show/?m=abc',
              custom_fields: JSON.stringify({ _mediaMeta: { listingStatus: 'PUBLISHED' } }),
              published: 1,
            },
          ]];
        }
        if (sql.includes('SELECT image_url FROM property_images')) {
          return [[
            { image_url: 'https://cdn.example.com/1.jpg' },
            { image_url: 'https://cdn.example.com/2.jpg' },
            { image_url: 'https://cdn.example.com/3.jpg' },
          ]];
        }
        if (sql.includes('site_settings')) {
          return [[]];
        }
        return [{ affectedRows: 1 }];
      },
    };

    const dbPath = require.resolve('../config/database');
    const controllerPath = require.resolve('../controllers/propertiesController');
    const prevDbModule = require.cache[dbPath];

    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: {
        async getConnection() {
          return mockConnection;
        },
        async execute(sql, params = []) {
          return mockConnection.execute(sql, params);
        },
        async query(sql, params = []) {
          return mockConnection.query(sql, params);
        },
      },
    };
    delete require.cache[controllerPath];

    try {
      const { updateProperty } = require('../controllers/propertiesController');
      let jsonResponse = null;
      let statusCode = 200;

      const req = {
        params: { id: 'prop_terrain_1' },
        user: { id: 'usr_1', role: 'user', agency_id: null },
        body: {
          title: 'Terrain 20x20 à Gombe',
          type: 'land',
          status: 'for-sale',
          currency: 'USD',
          price: 45000,
          bedrooms: 0,
          bathrooms: 0,
          yearBuilt: '',
          // virtualTourUrl, videoUrl, floorPlanUrl intentionnellement omis (undefined)
        },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(payload) {
          jsonResponse = payload;
          return this;
        },
      };

      await updateProperty(req, res, (err) => {
        throw err;
      });

      assert.equal(statusCode, 200);
      assert.equal(jsonResponse?.success, true);

      const updateCall = executedCalls.find((c) => c.sql.includes('UPDATE properties'));
      assert.ok(updateCall, 'La requête UPDATE properties doit avoir été exécutée');
      assert.equal(updateCall.params.includes(undefined), false);
      // Vérifie que yearBuilt '' est converti en null, et que video_url / virtual_tour_url existants sont préservés
      assert.equal(updateCall.params[20], null);
      assert.equal(updateCall.params[24], 'https://cdn.example.com/video.mp4');
      assert.equal(updateCall.params[25], 'https://my.matterport.com/show/?m=abc');
    } finally {
      if (prevDbModule) {
        require.cache[dbPath] = prevDbModule;
      } else {
        delete require.cache[dbPath];
      }
      delete require.cache[controllerPath];
    }
  });

  it('createProperty ne passe aucun paramètre undefined à MySQL quand les champs optionnels sont absents', async () => {
    const executedCalls = [];
    const mockConnection = {
      async beginTransaction() {},
      async commit() {},
      async rollback() {},
      release() {},
      async query(sql, params = []) {
        assert.equal(params.some((v) => v === undefined), false);
        return [[]];
      },
      async execute(sql, params = []) {
        executedCalls.push({ sql, params });
        assert.equal(
          params.some((v) => v === undefined),
          false,
          `execute() a reçu un paramètre undefined sur: ${sql}`
        );
        if (sql.includes('SELECT id FROM users')) {
          return [[{ id: 'usr_1' }]];
        }
        return [{ affectedRows: 1 }];
      },
    };

    const dbPath = require.resolve('../config/database');
    const controllerPath = require.resolve('../controllers/propertiesController');
    const prevDbModule = require.cache[dbPath];

    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: {
        async getConnection() {
          return mockConnection;
        },
        async execute(sql, params = []) {
          return mockConnection.execute(sql, params);
        },
        async query(sql, params = []) {
          return mockConnection.query(sql, params);
        },
      },
    };
    delete require.cache[controllerPath];

    try {
      const { createProperty } = require('../controllers/propertiesController');
      let jsonResponse = null;
      let statusCode = 200;

      const req = {
        user: { id: 'usr_1', role: 'admin', agency_id: null },
        body: {
          title: 'Terrain Brouillon',
          listingStatus: 'DRAFT',
          type: 'land',
          status: 'for-sale',
          currency: 'USD',
          yearBuilt: '',
        },
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(payload) {
          jsonResponse = payload;
          return this;
        },
      };

      await createProperty(req, res, (err) => {
        throw err;
      });

      assert.equal(statusCode, 201);
      assert.equal(jsonResponse?.success, true);
      const insertCall = executedCalls.find((c) => c.sql.includes('INSERT INTO properties'));
      assert.ok(insertCall);
      assert.equal(insertCall.params.includes(undefined), false);
    } finally {
      if (prevDbModule) {
        require.cache[dbPath] = prevDbModule;
      } else {
        delete require.cache[dbPath];
      }
      delete require.cache[controllerPath];
    }
  });
});
