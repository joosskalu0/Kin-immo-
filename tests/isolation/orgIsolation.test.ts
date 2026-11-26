import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  ApiTestClient,
  IsolatedServerHandle,
  startIsolatedTestServer,
} from '../helpers/testServerHarness';

describe('Isolation entre organisations : Agence A vs Agence B sur chaque route concernée', () => {
  let srv: IsolatedServerHandle;
  let admin: ApiTestClient;
  let agencyA: ApiTestClient;
  let agencyB: ApiTestClient;

  let agencyAId = '';
  let agencyBId = '';

  let propAPublishedId = '';
  let propADraftId = '';
  let collabAId = '';
  let txAId = '';
  let msgAId = '';
  let leadAId = '';
  let invoiceAId = '';
  let videoAId = '';
  let visitAId = '';
  let trustAId = '';

  before(async () => {
    srv = await startIsolatedTestServer({ port: 3192 });
    try {
      admin = new ApiTestClient(srv.baseUrl);
      await admin.login(srv.adminCredentials.email, srv.adminCredentials.password);

    agencyA = new ApiTestClient(srv.baseUrl);
    const resA = await agencyA.register({
      name: 'Directeur Agence A',
      email: 'dir.agence.a@kinimmo.cd',
      phone: '+243811111111',
      password: 'Km!81Vx#2026Qp',
      role: 'agency',
      agencyName: 'Agence Alpha Gombe',
    });
    assert.equal(resA.status, 201);
    agencyAId = agencyA.user.agencyId || agencyA.user.id;

    agencyB = new ApiTestClient(srv.baseUrl);
    const resB = await agencyB.register({
      name: 'Directeur Agence B',
      email: 'dir.agence.b@kinimmo.cd',
      phone: '+243822222222',
      password: 'Km!82Vx#2026Qp',
      role: 'agency',
      agencyName: 'Agence Beta Ngaliema',
    });
    assert.equal(resB.status, 201);
    agencyBId = agencyB.user.agencyId || agencyB.user.id;

    // 1. Propriété publiée + propriété brouillon d'Agence A
    const pPub = await agencyA.request('/api/properties', {
      method: 'POST',
      body: {
        title: 'Villa Alpha Publiée',
        description: 'Bien exclusif Agence Alpha.',
        price: 250000,
        images: [
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        ],
        published: true,
      },
    });
    assert.equal(pPub.status, 201);
    propAPublishedId = pPub.data.property.id;

    const pDraft = await agencyA.request('/api/properties', {
      method: 'POST',
      body: {
        title: 'Villa Alpha Brouillon Confidentiel',
        description: 'Brouillon privé Agence Alpha.',
        price: 300000,
        images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'],
        listingStatus: 'DRAFT',
        published: false,
      },
    });
    assert.equal(pDraft.status, 201);
    propADraftId = pDraft.data.property.id;

    // 2. Collaborateur d'Agence A
    const colA = await agencyA.request('/api/agency/collaborators/invite', {
      method: 'POST',
      body: { name: 'Collab Alpha', email: 'collab.alpha@kinimmo.cd', role: 'agency_agent' },
    });
    assert.equal(colA.status, 201);
    collabAId = colA.data.collaborator.id;

    // 3. Transaction d'Agence A
    const txA = await agencyA.request('/api/agency/transactions', {
      method: 'POST',
      body: {
        propertyId: propAPublishedId,
        propertyTitle: 'Villa Alpha Publiée',
        clientName: 'Client Alpha Secret',
        amount: 250000,
      },
    });
    assert.equal(txA.status, 201);
    txAId = txA.data.transaction.id;

    // 4. Message & Lead ciblant Agence A
    const msgA = await admin.request('/api/messages', {
      method: 'POST',
      body: {
        propertyId: propAPublishedId,
        senderName: 'Acheteur Alpha',
        senderPhone: '+243899000001',
        message: 'Intéressé par Villa Alpha.',
      },
    });
    assert.equal(msgA.status, 201);
    msgAId = msgA.data.data.id;

    const leadsA = await agencyA.request('/api/leads');
    assert.equal(leadsA.status, 200);
    leadAId = leadsA.data.leads.find((l: any) => l.propertyId === propAPublishedId)?.id || '';
    assert.ok(leadAId);

    // 5. Facture / boost d'Agence A
    const invA = await agencyA.request('/api/billing/boost-order', {
      method: 'POST',
      body: { propertyId: propAPublishedId, optionId: 'opt_featured_7d' },
    });
    assert.equal(invA.status, 201);
    invoiceAId = invA.data.invoice.id;

    // 6. Vidéo d'Agence A
    const vidA = await agencyA.request('/api/videos', {
      method: 'POST',
      body: {
        propertyId: propAPublishedId,
        propertyTitle: 'Villa Alpha Publiée',
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-luxury-house-40541-large.mp4',
        duration: 25,
        status: 'pending',
      },
    });
    assert.equal(vidA.status, 201);
    videoAId = vidA.data.data.video.id;

    // 7. Visite d'Agence A
    const visA = await agencyA.request('/api/property-visits', {
      method: 'POST',
      body: {
        request_id: 'req_iso_alpha',
        property_id: propAPublishedId,
        agent_id: agencyA.user.id,
        visit_date: '2026-12-10',
        visit_time: '14:00',
        notes: 'Visite confidentielle Agence Alpha',
      },
    });
    assert.equal(visA.status, 201);
    visitAId = visA.data.data.id;

    // 8. Dossier Trust d'Agence A
    const trA = await agencyA.request('/api/trust/apply', {
      method: 'POST',
      body: {
        target_type: 'property',
        target_id: propAPublishedId,
        target_name: 'Villa Alpha Publiée',
        documents: [{ document_type: 'titre_foncier', title: 'Certificat Alpha', file_url: 'https://cdn.example.com/alpha.pdf' }],
      },
    });
      assert.equal(trA.status, 201);
      trustAId = trA.data.verification?.id || trA.data.data?.id;
      assert.ok(trustAId);
    } catch (err) {
      await srv.stop();
      throw err;
    }
  });

  after(async () => {
    if (srv) await srv.stop();
  });

  it('empêche Agence B de lire ou modifier les annonces (publiées, brouillons, statuts, attributions) d’Agence A', async () => {
    const readDraft = await agencyB.request(`/api/properties/${propADraftId}`);
    assert.equal(readDraft.status, 403);

    const listWithUnpub = await agencyB.request('/api/properties?include_unpublished=true');
    assert.equal(listWithUnpub.status, 200);
    assert.ok(!listWithUnpub.data.properties.some((p: any) => p.id === propADraftId));

    const editPub = await agencyB.request(`/api/properties/${propAPublishedId}`, {
      method: 'PUT',
      body: { title: 'Piraté par B' },
    });
    assert.equal(editPub.status, 403);

    const delPub = await agencyB.request(`/api/properties/${propAPublishedId}`, { method: 'DELETE' });
    assert.equal(delPub.status, 403);

    const statusPub = await agencyB.request(`/api/properties/${propAPublishedId}/status`, {
      method: 'PATCH',
      body: { status: 'ARCHIVED' },
    });
    assert.equal(statusPub.status, 403);

    const assignPub = await agencyB.request(`/api/properties/${propAPublishedId}/assign`, {
      method: 'PATCH',
      body: { assignedAgentId: agencyB.user.id, assignedAgentName: 'Agence B' },
    });
    assert.equal(assignPub.status, 403);

    const histPub = await agencyB.request(`/api/properties/${propAPublishedId}/status-history`);
    assert.equal(histPub.status, 403);
  });

  it('isole strictement les collaborateurs, transactions et profils d’agence entre Agence A et Agence B', async () => {
    // Collaborateurs : Agence B ne voit jamais Collab Alpha même en passant ?agencyId=
    const listB = await agencyB.request(`/api/agency/collaborators?agencyId=${encodeURIComponent(agencyAId)}`);
    assert.equal(listB.status, 200);
    assert.ok(!listB.data.collaborators.some((c: any) => c.id === collabAId || c.agencyId === agencyAId));

    const patchCollab = await agencyB.request(`/api/agency/collaborators/${collabAId}`, {
      method: 'PATCH',
      body: { name: 'Hack' },
    });
    assert.equal(patchCollab.status, 403);

    const delCollab = await agencyB.request(`/api/agency/collaborators/${collabAId}`, { method: 'DELETE' });
    assert.equal(delCollab.status, 403);

    // Transactions : Agence B ne voit jamais txAId et ne peut pas créer une transaction sur un bien d'Agence A
    const txListB = await agencyB.request(`/api/agency/transactions?agencyId=${encodeURIComponent(agencyAId)}`);
    assert.equal(txListB.status, 200);
    assert.ok(!txListB.data.transactions.some((t: any) => t.id === txAId || t.agencyId === agencyAId));

    const crossTx = await agencyB.request('/api/agency/transactions', {
      method: 'POST',
      body: { agencyId: agencyAId, propertyId: propAPublishedId, amount: 999 },
    });
    assert.equal(crossTx.status, 403);

    // Profil agence : Agence B ne peut pas modifier le profil d'Agence A
    const putAgencyA = await agencyB.request(`/api/agencies/${agencyAId}`, {
      method: 'PUT',
      body: { name: 'Agence Détournée' },
    });
    assert.equal(putAgencyA.status, 403);
  });

  it('isole strictement leads, messages, factures, boosts, vidéos, visites, analytics, notifications et Trust', async () => {
    // Leads
    const leadsB = await agencyB.request('/api/leads');
    assert.equal(leadsB.status, 200);
    assert.ok(!leadsB.data.leads.some((l: any) => l.id === leadAId));
    const putLead = await agencyB.request(`/api/leads/${leadAId}`, {
      method: 'PUT',
      body: { status: 'closed' },
    });
    assert.equal(putLead.status, 403);

    // Messages
    const inboxB = await agencyB.request('/api/messages/inbox');
    assert.equal(inboxB.status, 200);
    assert.ok(!inboxB.data.messages.some((m: any) => m.id === msgAId));
    const putMsg = await agencyB.request(`/api/messages/${msgAId}/status`, {
      method: 'PUT',
      body: { status: 'read' },
    });
    assert.equal(putMsg.status, 403);

    // Factures & Boosts
    const invsB = await agencyB.request('/api/billing/my-invoices');
    assert.equal(invsB.status, 200);
    assert.ok(!invsB.data.invoices.some((i: any) => i.id === invoiceAId));

    const boostsB = await agencyB.request('/api/billing/my-boosts');
    assert.equal(boostsB.status, 200);
    assert.ok(!boostsB.data.boosts.some((b: any) => b.id === invoiceAId));

    const boostOtherProp = await agencyB.request('/api/billing/boost-order', {
      method: 'POST',
      body: { propertyId: propAPublishedId, optionId: 'opt_featured_7d' },
    });
    assert.equal(boostOtherProp.status, 403);

    const payOtherInv = await agencyB.request(`/api/billing/invoices/${invoiceAId}/pay`, {
      method: 'PUT',
      body: { transactionReference: 'FAKE' },
    });
    assert.equal(payOtherInv.status, 403);

    // Vidéos
    const vidsB = await agencyB.request('/api/videos/my');
    assert.equal(vidsB.status, 200);
    assert.ok(!vidsB.data.data.videos.some((v: any) => v.id === videoAId));

    const linkOtherVid = await agencyB.request('/api/videos', {
      method: 'POST',
      body: {
        propertyId: propAPublishedId,
        videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-modern-luxury-house-40541-large.mp4',
      },
    });
    assert.equal(linkOtherVid.status, 403);

    const editOtherVid = await agencyB.request(`/api/videos/${videoAId}`, {
      method: 'PUT',
      body: { title: 'Hack vidéo' },
    });
    assert.equal(editOtherVid.status, 403);

    const delOtherVid = await agencyB.request(`/api/videos/${videoAId}`, { method: 'DELETE' });
    assert.equal(delOtherVid.status, 403);

    // Analytics
    const statsOther = await agencyB.request(`/api/analytics/property/${propAPublishedId}`);
    assert.equal(statsOther.status, 403);

    // Visites
    const visitsB = await agencyB.request('/api/property-visits');
    assert.equal(visitsB.status, 200);
    assert.ok(!visitsB.data.data.some((v: any) => v.id === visitAId));

    const patchVisit = await agencyB.request(`/api/property-visits/${visitAId}`, {
      method: 'PATCH',
      body: { status: 'cancelled' },
    });
    assert.equal(patchVisit.status, 403);

    const delVisit = await agencyB.request(`/api/property-visits/${visitAId}`, { method: 'DELETE' });
    assert.equal(delVisit.status, 403);

    // Notifications
    const notifsB = await agencyB.request('/api/notifications');
    assert.equal(notifsB.status, 200);
    assert.ok(!notifsB.data.data.some((n: any) => n.recipient_id === agencyAId || n.recipient_id === agencyA.user.id));

    // Trust
    const trustB = await agencyB.request('/api/trust/verifications');
    assert.equal(trustB.status, 200);
    assert.ok(!trustB.data.data.some((t: any) => t.id === trustAId));

    const trustDetail = await agencyB.request(`/api/trust/verifications/${trustAId}`);
    assert.equal(trustDetail.status, 403);

    const trustApplyOther = await agencyB.request('/api/trust/apply', {
      method: 'POST',
      body: { target_type: 'property', target_id: propAPublishedId, target_name: 'Vol', documents: [] },
    });
    assert.equal(trustApplyOther.status, 403);
  });
});
