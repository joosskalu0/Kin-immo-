import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiTestClient,
  IsolatedServerHandle,
  startIsolatedTestServer,
} from '../helpers/testServerHarness';

describe('Sécurité : Injection, IDOR, énumération de comptes, limitation de débit, fichiers interdits', () => {
  let srv: IsolatedServerHandle;
  let userA: ApiTestClient;
  let userB: ApiTestClient;
  let anon: ApiTestClient;
  let propAId = '';

  before(async () => {
    srv = await startIsolatedTestServer({
      port: 3193,
      loginRateLimit: 8,
      sensitiveRateLimit: 5,
      publicRateLimit: 10,
    });
    try {
      anon = new ApiTestClient(srv.baseUrl);
      await anon.initCsrf();

      userA = new ApiTestClient(srv.baseUrl);
      const resA = await userA.register({
        name: 'Alice Sécurité',
        email: 'alice.sec@kinimmo.cd',
        phone: '+243813000001',
        password: 'Km!91Vx#2026Qp',
        role: 'agent',
      });
      assert.equal(resA.status, 201, `resA failed: ${JSON.stringify(resA.data)}`);

      userB = new ApiTestClient(srv.baseUrl);
      const resB = await userB.register({
        name: 'Bob Sécurité',
        email: 'bob.sec@kinimmo.cd',
        phone: '+243813000002',
        password: 'Km!92Vx#2026Qp',
        role: 'agent',
      });
      assert.equal(resB.status, 201, `resB failed: ${JSON.stringify(resB.data)}`);

      const pRes = await userA.request('/api/properties', {
        method: 'POST',
        body: {
          title: 'Bien Privé Alice',
          description: 'Bien sécurisé',
          price: 150000,
          images: [
            'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
            'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
            'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
          ],
          privateFields: {
            ownerPhone: '+243819991111',
            keyBoxCode: '9988',
          },
          published: true,
        },
      });
      assert.equal(pRes.status, 201);
      propAId = pRes.data.property.id;
    } catch (err) {
      await srv.stop();
      throw err;
    }
  });

  after(async () => {
    if (srv) await srv.stop();
  });

  it('bloque les injections (SQLi, pollution de prototype, élévation de rôle, self-boost) et liens dangereux', async () => {
    // 1. Tentative d'élévation de rôle admin via inscription publique
    const regAdmin = await anon.request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Hack Admin',
        email: 'hack.admin@kinimmo.cd',
        password: 'Km!93Vx#2026Qp',
        role: 'admin',
        termsAccepted: true,
      },
    });
    if (regAdmin.status === 201) {
      assert.notEqual(regAdmin.data.user.role, 'admin', 'Un compte public ne doit jamais obtenir le rôle admin');
    }

    // 2. Tentative de pollution de prototype et d'élévation de privilège sur PUT /api/users/:id
    const rawProtoPayload = JSON.stringify({
      name: 'Bob Normal',
      role: 'admin',
      isVerified: true,
      __proto__: { polluted: true },
    });
    const putSelf = await userB.request(`/api/users/${userB.user.id}`, {
      method: 'PUT',
      body: rawProtoPayload,
    });
    assert.equal(putSelf.status, 200);
    assert.notEqual(putSelf.data.user.role, 'admin');
    assert.equal(({} as any).polluted, undefined);

    // 3. Tentative de self-boost / auto-certification via POST /api/properties
    const selfBoost = await userB.request('/api/properties', {
      method: 'POST',
      body: {
        title: 'Bien Self Boost',
        price: 120000,
        featured: true,
        isPremium: true,
        isVerified: true,
        images: ['https://a.jpg', 'https://b.jpg', 'https://c.jpg'],
        published: true,
      },
    });
    assert.equal(selfBoost.status, 201);
    assert.equal(selfBoost.data.property.featured, false);
    assert.equal(selfBoost.data.property.isPremium, false);

    // 4. Rejet URL virtuelle dangereuse (javascript: / domaine non autorisé)
    const badTour = await userB.request('/api/properties', {
      method: 'POST',
      body: {
        title: 'Bien XSS Tour',
        price: 120000,
        virtualTourUrl: 'javascript:alert(document.cookie)',
        images: ['https://a.jpg', 'https://b.jpg', 'https://c.jpg'],
        published: true,
      },
    });
    assert.equal(badTour.status, 400);

    // 5. Requête recherche contenant payload SQLi ne plante pas le serveur et ne retourne pas de fuite
    const sqliSearch = await anon.request(`/api/properties?search=${encodeURIComponent("' OR '1'='1'; DROP TABLE users;--")}`);
    assert.equal(sqliSearch.status, 200);
    assert.ok(Array.isArray(sqliSearch.data.properties));
  });

  it('bloque tout accès IDOR à la ressource ou aux données privées d’un autre utilisateur', async () => {
    // 1. Bob ne peut ni modifier ni supprimer le profil ou les sessions d'Alice
    const editAlice = await userB.request(`/api/users/${userA.user.id}`, {
      method: 'PUT',
      body: { name: 'Piraté' },
    });
    assert.equal(editAlice.status, 403);

    const sessionsA = await userA.request('/api/auth/sessions');
    assert.equal(sessionsA.status, 200);
    const sidA = sessionsA.data.sessions?.[0]?.id;
    assert.ok(sidA);
    const revokeA = await userB.request(`/api/auth/sessions/${encodeURIComponent(sidA)}`, {
      method: 'DELETE',
    });
    assert.ok(revokeA.status === 403 || revokeA.status === 404);
    const sessionsAAfter = await userA.request('/api/auth/sessions');
    assert.equal(sessionsAAfter.status, 200);
    assert.ok(sessionsAAfter.data.sessions.some((s: any) => s.id === sidA));

    // 2. Bob ne peut ni lire les analytics ni modifier le bien d'Alice
    const statA = await userB.request(`/api/analytics/property/${propAId}`);
    assert.equal(statA.status, 403);

    // 3. Un visiteur/tiers ne voit jamais les privateFields (code boîte à clés, téléphone propriétaire)
    const publicProp = await userB.request(`/api/properties/${propAId}`);
    assert.equal(publicProp.status, 200);
    assert.equal(publicProp.data.property.privateFields, undefined);
  });

  it('empêche l’énumération de comptes sur login, forgot-password et profil public', async () => {
    // 1. Login retourne exactement la même erreur générique pour compte inexistant vs mauvais mot de passe
    const loginUnknown = await anon.request('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'inconnu.total@kinimmo.cd', password: 'WrongPassword123!' },
    });
    const loginWrongPwd = await anon.request('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'alice.sec@kinimmo.cd', password: 'WrongPassword123!' },
    });
    assert.equal(loginUnknown.status, 401);
    assert.equal(loginWrongPwd.status, 401);
    assert.equal(loginUnknown.data.message, loginWrongPwd.data.message);

    // 2. Forgot-password retourne un payload strictement identique pour compte existant vs inexistant (aucun lien/token exposé)
    const fpExisting = await anon.request('/api/auth/forgot-password', {
      method: 'POST',
      body: { identifier: 'alice.sec@kinimmo.cd' },
    });
    const fpMissing = await anon.request('/api/auth/forgot-password', {
      method: 'POST',
      body: { identifier: 'nobody.exists@kinimmo.cd' },
    });
    assert.equal(fpExisting.status, 200);
    assert.equal(fpMissing.status, 200);
    assert.deepEqual(fpExisting.data, fpMissing.data);
    assert.equal(fpExisting.data.resetPreviewUrl, undefined);

    // 3. GET /api/users/:id public ne divulgue ni email, ni téléphone, ni hash
    const pubUser = await anon.request(`/api/users/${userA.user.id}`);
    assert.equal(pubUser.status, 200);
    assert.equal(pubUser.data.user.email, undefined);
    assert.equal(pubUser.data.user.phone, undefined);
    assert.equal(pubUser.data.user.passwordHash, undefined);
  });

  it('applique la limitation de débit (HTTP 429 + Retry-After) sur les tentatives répétées', async () => {
    // loginRateLimit = 8 dans cette suite isolée (déjà 2 requêtes effectuées dans le test précédent)
    let got429 = false;
    let retryAfterHeader: string | null = null;
    for (let i = 0; i < 10; i++) {
      const r = await anon.request('/api/auth/login', {
        method: 'POST',
        body: { identifier: 'alice.sec@kinimmo.cd', password: `BadTry_${i}` },
      });
      if (r.status === 429) {
        got429 = true;
        retryAfterHeader = r.headers.get('retry-after');
        break;
      }
    }
    assert.equal(got429, true, 'Les rafales de login doivent déclencher HTTP 429');
    assert.ok(retryAfterHeader && Number(retryAfterHeader) >= 1, 'Header Retry-After attendu sur 429');
  });

  it('refuse les fichiers interdits (.svg, .html, .php, .js, .exe) et bloque le path traversal', async () => {
    const forbiddenFiles = [
      { name: 'evil.svg', mime: 'image/svg+xml', content: '<svg onload="alert(1)"></svg>', endpoint: '/api/cloudinary/upload-image', field: 'image' },
      { name: 'payload.html', mime: 'text/html', content: '<script>alert(1)</script>', endpoint: '/api/cloudinary/upload-image', field: 'image' },
      { name: 'shell.php', mime: 'application/x-php', content: '<?php system($_GET["c"]); ?>', endpoint: '/api/properties/upload-video', field: 'video' },
      { name: 'malware.exe', mime: 'application/x-msdownload', content: 'MZ...', endpoint: '/api/properties/upload-video', field: 'video' },
      { name: 'xss.js', mime: 'application/javascript', content: 'alert(1)', endpoint: '/api/cloudinary/upload', field: 'video' },
    ];

    for (const f of forbiddenFiles) {
      const fd = new FormData();
      fd.append(f.field, new Blob([f.content], { type: f.mime }), f.name);
      const res = await userA.request(f.endpoint, {
        method: 'POST',
        rawFormData: fd,
      });
      assert.equal(
        res.status,
        400,
        `Fichier interdit ${f.name} (${f.mime}) sur ${f.endpoint} doit être refusé (400), reçu ${res.status}`
      );
    }

    // Path traversal sur /uploads et fichiers cachés
    const trav1 = await anon.request('/uploads/../package.json', { skipJsonParse: true });
    assert.notEqual(trav1.rawText.includes('"dependencies"'), true, 'Path traversal ne doit jamais lire package.json');

    const dotfile = await anon.request('/uploads/.env', { skipJsonParse: true });
    assert.ok(dotfile.status === 403 || dotfile.status === 404);
  });
});
