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

  it('getProperties renvoie le vrai nom et WhatsApp de l agent même sans utilisateur connecté', async () => {
    const mockPool = {
      async query(sql) {
        if (sql.includes('FROM properties p')) {
          return [[
            {
              id: 'prop_pub_1',
              title: 'Villa Gombe',
              description: 'Belle villa',
              price: 250000,
              currency: 'USD',
              period: 'total',
              type: 'villa',
              status: 'for-sale',
              category: 'Résidentiel',
              address: 'Gombe',
              city: 'Kinshasa',
              commune: 'Gombe',
              quartier: '',
              avenue: '',
              reference_point: '',
              zip_code: 'KN-01',
              country: 'RDC',
              lat: -4.32,
              lng: 15.3,
              bedrooms: 4,
              bathrooms: 3,
              area: 300,
              year_built: 2022,
              garages: 2,
              amenities: '[]',
              custom_fields: '{}',
              virtual_tour_url: null,
              agent_id: 'usr_agent_7',
              agency_id: null,
              agent_user_name: 'Patrick Ilunga',
              agent_user_email: 'patrick@kinimmo.com',
              agent_user_phone: '+243 812 345 678',
              agent_user_whatsapp: '+243 991 223 344',
              agent_user_avatar: 'https://cdn.example.com/avatar.jpg',
              agent_user_verified: 1,
              agent_user_created_at: '2026-01-01T00:00:00Z',
              agent_profile_name: null,
              agent_profile_email: null,
              agent_profile_phone: null,
              agent_profile_whatsapp: null,
              agent_profile_avatar: null,
              agent_profile_verified: 0,
              agency_title: null,
              agency_logo: null,
              agency_phone: null,
              agency_whatsapp: null,
              agency_email: null,
              agency_manager_name: null,
              agency_verified: 0,
              views_count: 10,
              featured: 0,
              is_premium: 0,
              is_urgent: 0,
              listing_tier: 'free',
              published: 1,
              created_at: '2026-01-10T00:00:00Z',
              updated_at: '2026-01-10T00:00:00Z',
            },
          ]];
        }
        return [[]];
      },
      async execute() {
        return [[]];
      },
    };

    const dbPath = require.resolve('../config/database');
    const controllerPath = require.resolve('../controllers/propertiesController');
    const prevDbModule = require.cache[dbPath];

    require.cache[dbPath] = {
      id: dbPath,
      filename: dbPath,
      loaded: true,
      exports: mockPool,
    };
    delete require.cache[controllerPath];

    try {
      const { getProperties } = require('../controllers/propertiesController');
      let jsonResponse = null;
      const req = { query: {}, user: undefined };
      const res = {
        json(payload) {
          jsonResponse = payload;
          return this;
        },
      };

      await getProperties(req, res, (err) => {
        throw err;
      });

      assert.equal(jsonResponse?.success, true);
      assert.equal(jsonResponse?.properties?.length, 1);
      const item = jsonResponse.properties[0];
      assert.equal(item.agentName, 'Patrick Ilunga');
      assert.equal(item.agentPhone, '+243 812 345 678');
      assert.equal(item.agentWhatsapp, '+243 991 223 344');
      assert.equal(item.contactWhatsapp, '+243 991 223 344');
      assert.equal(item.contactPhone, '+243 812 345 678');
      assert.equal(item.contactEmail, 'patrick@kinimmo.com');
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
