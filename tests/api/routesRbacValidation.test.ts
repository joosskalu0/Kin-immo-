import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiTestClient,
  IsolatedServerHandle,
  startIsolatedTestServer,
} from '../helpers/testServerHarness';

describe('API : Chaque route, chaque rôle, accès sans jeton, mauvais rôle, validation des entrées', () => {
  let srv: IsolatedServerHandle;
  let anon: ApiTestClient;
  let userClient: ApiTestClient;
  let agentClient: ApiTestClient;
  let agencyClient: ApiTestClient;
  let adminClient: ApiTestClient;

  let agentPropertyId = '';
  let agentInvoiceId = '';

  before(async () => {
    srv = await startIsolatedTestServer({ port: 3191 });
    try {
      anon = new ApiTestClient(srv.baseUrl);
      await anon.initCsrf();

      userClient = new ApiTestClient(srv.baseUrl);
      const uReg = await userClient.register({
        name: 'Client Standard Test',
        email: 'client.rbac@kinimmo.cd',
        phone: '+243810100101',
        password: 'Km!71Vx#2026Qp',
        role: 'user',
      });
      assert.equal(uReg.status, 201, `uReg failed: ${JSON.stringify(uReg.data)}`);

      agentClient = new ApiTestClient(srv.baseUrl);
      const aReg = await agentClient.register({
        name: 'Courtier Test RBAC',
        email: 'courtier.rbac@kinimmo.cd',
        phone: '+243810100102',
        password: 'Km!72Vx#2026Qp',
        role: 'agent',
      });
      assert.equal(aReg.status, 201, `aReg failed: ${JSON.stringify(aReg.data)}`);

      agencyClient = new ApiTestClient(srv.baseUrl);
      const agReg = await agencyClient.register({
        name: 'Direction Agence RBAC',
        email: 'agence.rbac@kinimmo.cd',
        phone: '+243810100103',
        password: 'Km!73Vx#2026Qp',
        role: 'agency',
        agencyName: 'Agence RBAC Kinshasa',
      });
      assert.equal(agReg.status, 201, `agReg failed: ${JSON.stringify(agReg.data)}`);

      adminClient = new ApiTestClient(srv.baseUrl);
      const admLogin = await adminClient.login(
        srv.adminCredentials.email,
        srv.adminCredentials.password
      );
      assert.equal(admLogin.status, 200);
    } catch (err) {
      await srv.stop();
      throw err;
    }
  });

  after(async () => {
    if (srv) await srv.stop();
  });

  it('refuse l’accès sans jeton (401) sur chaque route protégée', async () => {
    const protectedEndpoints: Array<{ method: string; path: string; body?: any }> = [
      { method: 'GET', path: '/api/auth/me' },
      { method: 'PUT', path: '/api/auth/profile', body: { name: 'X' } },
      { method: 'PUT', path: '/api/auth/change-password', body: { oldPassword: 'a', newPassword: 'b' } },
      { method: 'GET', path: '/api/auth/sessions' },
      { method: 'GET', path: '/api/concierge-requests' },
      { method: 'GET', path: '/api/property-visits' },
      { method: 'POST', path: '/api/property-visits', body: { request_id: 'r1', visit_date: '2026-12-01' } },
      { method: 'GET', path: '/api/notifications' },
      { method: 'GET', path: '/api/notifications/templates' },
      { method: 'POST', path: '/api/properties', body: { title: 'Test' } },
      { method: 'PUT', path: '/api/properties/prop_1', body: { title: 'Test' } },
      { method: 'DELETE', path: '/api/properties/prop_1' },
      { method: 'GET', path: '/api/properties/prop_1/status-history' },
      { method: 'GET', path: '/api/agency/collaborators' },
      { method: 'POST', path: '/api/agency/collaborators/invite', body: { name: 'X', email: 'x@y.cd' } },
      { method: 'GET', path: '/api/agency/transactions' },
      { method: 'POST', path: '/api/agency/transactions', body: { amount: 1000 } },
      { method: 'GET', path: '/api/billing/my-invoices' },
      { method: 'GET', path: '/api/billing/my-boosts' },
      { method: 'POST', path: '/api/billing/boost-order', body: { propertyId: 'p1', optionId: 'opt_featured_7d' } },
      { method: 'GET', path: '/api/billing/admin/boost-requests' },
      { method: 'GET', path: '/api/admin/stats' },
      { method: 'GET', path: '/api/admin/users' },
      { method: 'GET', path: '/api/admin/properties' },
      { method: 'PUT', path: '/api/admin/settings', body: { featured_slots_limit: 6 } },
      { method: 'GET', path: '/api/users' },
      { method: 'GET', path: '/api/leads' },
      { method: 'GET', path: '/api/messages/inbox' },
      { method: 'GET', path: '/api/favorites' },
      { method: 'GET', path: '/api/analytics/my-performance' },
      { method: 'GET', path: '/api/videos/my' },
      { method: 'GET', path: '/api/videos/admin/all' },
      { method: 'GET', path: '/api/trust/verifications' },
      { method: 'GET', path: '/api/trust/audit-logs' },
      { method: 'GET', path: '/api/fraud/audit' },
    ];

    for (const ep of protectedEndpoints) {
      const res = await anon.request(ep.path, { method: ep.method, body: ep.body });
      assert.equal(
        res.status,
        401,
        `Attendu 401 sans jeton sur ${ep.method} ${ep.path}, reçu ${res.status}`
      );
    }
  });

  it('refuse l’accès avec un mauvais rôle (403) pour user, agent et agency', async () => {
    // Routes réservées agent/agency/admin refusées au rôle "user"
    const proOnly = [
      { method: 'GET', path: '/api/concierge-requests' },
      { method: 'GET', path: '/api/property-visits' },
      { method: 'GET', path: '/api/notifications/templates' },
      { method: 'GET', path: '/api/agency/collaborators' },
      { method: 'GET', path: '/api/agency/transactions' },
    ];
    for (const ep of proOnly) {
      const res = await userClient.request(ep.path, { method: ep.method });
      assert.equal(res.status, 403, `User devrait recevoir 403 sur ${ep.method} ${ep.path}, reçu ${res.status}`);
    }

    // Routes réservées agency/admin refusées au rôle "agent"
    const inviteRes = await agentClient.request('/api/agency/collaborators/invite', {
      method: 'POST',
      body: { name: 'Intrus', email: 'intrus@kinimmo.cd' },
    });
    assert.equal(inviteRes.status, 403);

    // Routes strictement admin refusées aux rôles user, agent et agency
    const adminOnly = [
      { method: 'GET', path: '/api/admin/stats' },
      { method: 'GET', path: '/api/admin/users' },
      { method: 'GET', path: '/api/admin/properties' },
      { method: 'PUT', path: '/api/admin/settings', body: { featured_slots_limit: 5 } },
      { method: 'GET', path: '/api/users' },
      { method: 'GET', path: '/api/admin/invoices' },
      { method: 'GET', path: '/api/billing/admin/boost-requests' },
      { method: 'PUT', path: '/api/billing/visibility-options/opt_featured_7d', body: { price_usd: 99 } },
      { method: 'GET', path: '/api/videos/admin/all' },
      { method: 'GET', path: '/api/videos/admin/reports' },
      { method: 'GET', path: '/api/trust/audit-logs' },
      { method: 'GET', path: '/api/fraud/audit' },
      { method: 'POST', path: '/api/content/articles', body: { title: 'Test', content: 'Test' } },
      { method: 'POST', path: '/api/admin/custom-fields', body: { key: 'x', label: 'X' } },
    ];

    for (const client of [userClient, agentClient, agencyClient]) {
      for (const ep of adminOnly) {
        const res = await client.request(ep.path, { method: ep.method, body: ep.body });
        assert.equal(
          res.status,
          403,
          `Rôle ${client.user?.role} devrait recevoir 403 sur ${ep.method} ${ep.path}, reçu ${res.status}`
        );
      }
    }
  });

  it('valide les entrées (400) sur auth, propriétés, conciergerie, visites, messages, leads et boosts', async () => {
    // 1. Inscription invalide (sans CGU, mot de passe faible, email invalide)
    const badRegNoTerms = await anon.request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Jean', email: 'j@k.cd', password: 'StrongPass#2026', termsAccepted: false },
    });
    assert.equal(badRegNoTerms.status, 400);

    const badRegWeakPwd = await anon.request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Jean', email: 'j@k.cd', password: '123', termsAccepted: true },
    });
    assert.equal(badRegWeakPwd.status, 400);

    const badRegEmail = await anon.request('/api/auth/register', {
      method: 'POST',
      body: { name: 'Jean', email: 'pas-un-email', password: 'StrongPass#2026', termsAccepted: true },
    });
    assert.equal(badRegEmail.status, 400);

    // 2. Connexion avec champs manquants
    const badLogin = await anon.request('/api/auth/login', {
      method: 'POST',
      body: { identifier: '', password: '' },
    });
    assert.equal(badLogin.status, 400);

    // 3. Propriété sans titre, prix négatif ou < 3 photos en publication
    const badPropNoTitle = await agentClient.request('/api/properties', {
      method: 'POST',
      body: { title: '', price: 1000, images: ['a.jpg', 'b.jpg', 'c.jpg'] },
    });
    assert.equal(badPropNoTitle.status, 400);

    const badPropNegPrice = await agentClient.request('/api/properties', {
      method: 'POST',
      body: { title: 'Villa Prix Negatif', price: -500, images: ['a.jpg', 'b.jpg', 'c.jpg'] },
    });
    assert.equal(badPropNegPrice.status, 400);

    const badPropFewPhotos = await agentClient.request('/api/properties', {
      method: 'POST',
      body: { title: 'Villa 1 photo', price: 100000, images: ['only-one.jpg'], published: true },
    });
    assert.equal(badPropFewPhotos.status, 400);

    // 4. Conciergerie invalide
    const badConcierge = await anon.request('/api/concierge-requests', {
      method: 'POST',
      body: { full_name: 'A' },
    });
    assert.equal(badConcierge.status, 400);

    // 5. Visite sans champs requis
    const badVisit = await agentClient.request('/api/property-visits', {
      method: 'POST',
      body: { notes: 'sans date' },
    });
    assert.equal(badVisit.status, 400);

    // 6. Message & lead vides
    const badMsg = await anon.request('/api/messages', { method: 'POST', body: { senderName: '' } });
    assert.equal(badMsg.status, 400);

    const badLead = await anon.request('/api/leads', { method: 'POST', body: {} });
    assert.equal(badLead.status, 400);

    // 7. Signalement vidéo sans motif
    const badReport = await anon.request('/api/videos/reports', { method: 'POST', body: { propertyId: 'p1' } });
    assert.equal(badReport.status, 400);
  });

  it('autorise le flux complet avec les bons rôles (agent, agency, admin, public)', async () => {
    // Public routes
    const health = await anon.request('/api/health');
    assert.equal(health.status, 200);
    const propsPublic = await anon.request('/api/properties');
    assert.equal(propsPublic.status, 200);
    const settingsPublic = await anon.request('/api/settings/contact');
    assert.equal(settingsPublic.status, 200);
    assert.equal(settingsPublic.data.settings.featured_slots_limit, 6);

    // Agent crée un bien valide
    const created = await agentClient.request('/api/properties', {
      method: 'POST',
      body: {
        title: 'Appartement Moderne RBAC Gombe',
        description: 'Bel appartement 3 chambres entièrement équipé avec vue fleuve.',
        price: 185000,
        currency: 'USD',
        type: 'apartment',
        status: 'for-sale',
        city: 'Kinshasa',
        commune: 'Gombe',
        images: [
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        ],
        published: true,
      },
    });
    assert.equal(created.status, 201);
    agentPropertyId = created.data.property.id;

    // Agent commande un boost et soumet le paiement manuel
    const orderRes = await agentClient.request('/api/billing/boost-order', {
      method: 'POST',
      body: { propertyId: agentPropertyId, optionId: 'opt_featured_7d' },
    });
    assert.equal(orderRes.status, 201);
    agentInvoiceId = orderRes.data.invoice.id;

    const payRes = await agentClient.request(`/api/billing/invoices/${agentInvoiceId}/pay`, {
      method: 'PUT',
      body: { transactionReference: 'RBAC-MPESA-9001', paymentMethodId: 'pm_mpesa' },
    });
    assert.equal(payRes.status, 200);

    // Admin valide le paiement
    const approveRes = await adminClient.request(`/api/billing/invoices/${agentInvoiceId}/approve`, {
      method: 'PUT',
      body: {},
    });
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.data.invoice.status, 'paid');

    // Agence invite un collaborateur et enregistre une transaction
    const collabRes = await agencyClient.request('/api/agency/collaborators/invite', {
      method: 'POST',
      body: { name: 'Collab RBAC', email: 'collab.rbac@kinimmo.cd', role: 'agency_agent' },
    });
    assert.equal(collabRes.status, 201);

    const txRes = await agencyClient.request('/api/agency/transactions', {
      method: 'POST',
      body: { propertyTitle: 'Vente RBAC', amount: 120000 },
    });
    assert.equal(txRes.status, 201);

    // 8. Validation stricte tarification (entier, USD/CDF, mois/an, négociable, garantie/avance 0..36)
    const badDecimal = await agentClient.request('/api/properties', {
      method: 'POST',
      body: {
        title: 'Appartement Prix Décimal',
        description: 'Test rejet décimales',
        price: 1500.75,
        currency: 'USD',
        status: 'for-rent',
        period: 'month',
        images: ['a.jpg', 'b.jpg', 'c.jpg'],
        published: true,
      },
    });
    assert.equal(badDecimal.status, 400);

    const badCurrency = await agentClient.request('/api/properties', {
      method: 'POST',
      body: {
        title: 'Appartement Devise EUR',
        description: 'Test rejet devise non supportée',
        price: 1500,
        currency: 'EUR',
        status: 'for-rent',
        period: 'month',
        images: ['a.jpg', 'b.jpg', 'c.jpg'],
        published: true,
      },
    });
    assert.equal(badCurrency.status, 400);

    const badGuaranteeRange = await agentClient.request('/api/properties', {
      method: 'POST',
      body: {
        title: 'Appartement Garantie 40 mois',
        description: 'Test rejet garantie > 36',
        price: 1500,
        currency: 'USD',
        status: 'for-rent',
        period: 'month',
        guaranteeMonths: 40,
        images: ['a.jpg', 'b.jpg', 'c.jpg'],
        published: true,
      },
    });
    assert.equal(badGuaranteeRange.status, 400);

    const validRentalCdf = await agentClient.request('/api/properties', {
      method: 'POST',
      body: {
        title: 'Villa Location Annuelle CDF',
        description: 'Location annuelle en francs congolais avec garantie et avance.',
        price: 34200000,
        currency: 'CDF',
        status: 'for-rent',
        period: 'year',
        isNegotiable: true,
        guaranteeMonths: 3,
        advanceMonths: 2,
        images: ['a.jpg', 'b.jpg', 'c.jpg'],
        published: true,
      },
    });
    assert.equal(validRentalCdf.status, 201);
    assert.equal(validRentalCdf.data.property.currency, 'CDF');
    assert.equal(validRentalCdf.data.property.period, 'year');
    assert.equal(validRentalCdf.data.property.isNegotiable, true);
    assert.equal(validRentalCdf.data.property.guaranteeMonths, 3);
    assert.equal(validRentalCdf.data.property.advanceMonths, 2);

    const badPutDecimal = await agentClient.request(`/api/properties/${validRentalCdf.data.property.id}`, {
      method: 'PUT',
      body: { price: 999.99 },
    });
    assert.equal(badPutDecimal.status, 400);

    const switchedToSale = await agentClient.request(`/api/properties/${validRentalCdf.data.property.id}`, {
      method: 'PUT',
      body: {
        status: 'for-sale',
        price: 250000,
        currency: 'USD',
        isNegotiable: false,
      },
    });
    assert.equal(switchedToSale.status, 200);
    assert.equal(switchedToSale.data.property.period, 'total');
    assert.equal(switchedToSale.data.property.guaranteeMonths, undefined);
    assert.equal(switchedToSale.data.property.advanceMonths, undefined);
    assert.equal(switchedToSale.data.property.isNegotiable, false);
  });
});

