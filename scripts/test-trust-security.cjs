/**
 * Suite de tests automatisés : Permissions & Sécurité Kinimmo Trust
 * Valide les exigences de sécurité backend, contrôle d'accès RBAC, anti-auto-approbation,
 * motifs obligatoires et protection des données sensibles.
 */

const http = require('http');

const PORT = process.env.PORT || 3000;
const BASE_HOST = '127.0.0.1';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: BASE_HOST,
        port: PORT,
        ...options
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body ? JSON.parse(body) : null
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              rawBody: body
            });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

function makeToken(userObj) {
  return Buffer.from(JSON.stringify(userObj)).toString('base64');
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 SUITE DE TESTS : SÉCURITÉ & PERMISSIONS KINIMMO TRUST');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // Tokens pour les différents profils
  const adminToken = makeToken({
    id: 'admin_test_1',
    name: 'Admin Conformité',
    email: 'admin.conformite@kinimmo.cd',
    role: 'admin'
  });

  const agentToken = makeToken({
    id: 'agent_test_1',
    name: 'Agent Immobilier Gombe',
    email: 'agent.gombe@kinimmo.cd',
    role: 'agent'
  });

  const normalUserToken = makeToken({
    id: 'user_lambda',
    name: 'Acheteur Kinshasa',
    email: 'acheteur@gmail.com',
    role: 'user'
  });

  // TEST 1 : Vérifier la route publique /api/trust/badge/:targetType/:targetId
  try {
    const res = await request({
      path: '/api/trust/badge/property/prop_1',
      method: 'GET'
    });

    assert(res.statusCode === 200, 'Route publique du badge accessible sans authentification (200 OK)');
    assert(res.body && res.body.success === true, 'Réponse formatée au format JSON standard');
    assert(
      !res.body?.data?.documents &&
      !res.body?.data?.cni &&
      !res.body?.data?.passport &&
      !res.body?.data?.applicant_phone,
      'SÉCURITÉ : Zéro fuite de pièces justificatives privées ou données d’identité dans l’endpoint public'
    );
  } catch (err) {
    assert(false, `Test 1 Erreur : ${err.message}`);
  }

  // TEST 2 : Tentative de décision par un utilisateur NON-ADMIN (doit échouer 403)
  try {
    const res = await request(
      {
        path: '/api/trust/verifications/trust_prop_penthouse_river/status',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${normalUserToken}`
        }
      },
      {
        status: 'property_verified',
        trust_level: 'Bien Vérifié',
        trust_score: 95
      }
    );

    assert(
      res.statusCode === 403,
      'SÉCURITÉ RBAC : Un utilisateur non-administrateur ne peut PAS prendre de décision (403 Forbidden)'
    );
  } catch (err) {
    assert(false, `Test 2 Erreur : ${err.message}`);
  }

  // TEST 3 : Protection anti-auto-approbation (un utilisateur ne peut jamais approuver sa propre demande)
  try {
    // Supposons que l'admin est aussi le demandeur (usr_sarah_01)
    const selfAdminToken = makeToken({
      id: 'usr_sarah_01', // C'est le demandeur de trust_prop_penthouse_river
      name: 'Sarah Mwamba',
      email: 'sarah.mwamba@kinimmo.cd',
      role: 'admin'
    });

    const res = await request(
      {
        path: '/api/trust/verifications/trust_prop_penthouse_river/status',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${selfAdminToken}`
        }
      },
      {
        status: 'property_verified',
        trust_level: 'Bien Vérifié'
      }
    );

    assert(
      res.statusCode === 403,
      'SÉCURITÉ ANTI-AUTO-APPROBATION : Un demandeur ne peut jamais approuver son propre dossier même avec privilège admin (403 Forbidden)'
    );
  } catch (err) {
    assert(false, `Test 3 Erreur : ${err.message}`);
  }

  // TEST 4 : Refus d'une demande SANS MOTIF obligatoire (doit échouer 400)
  try {
    const res = await request(
      {
        path: '/api/trust/verifications/trust_prop_penthouse_river/status',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      },
      {
        status: 'rejected',
        rejection_reason: '' // Vide intentionnellement
      }
    );

    assert(
      res.statusCode === 400,
      'SÉCURITÉ DÉCISION : Rejet sans motif obligatoire refusé par le serveur (400 Bad Request)'
    );
  } catch (err) {
    assert(false, `Test 4 Erreur : ${err.message}`);
  }

  // TEST 5 : Suspension d'une vérification SANS MOTIF obligatoire (doit échouer 400)
  try {
    const res = await request(
      {
        path: '/api/trust/verifications/trust_prop_gombe_villa/status',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      },
      {
        status: 'suspended',
        suspension_reason: '' // Vide intentionnellement
      }
    );

    assert(
      res.statusCode === 400,
      'SÉCURITÉ DÉCISION : Suspension sans motif obligatoire refusée par le serveur (400 Bad Request)'
    );
  } catch (err) {
    assert(false, `Test 5 Erreur : ${err.message}`);
  }

  // TEST 6 : Tentative de modification ou suppression rétroactive du journal d'audit (doit échouer 405)
  try {
    const res = await request({
      path: '/api/trust/audit-logs/audit_1',
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert(
      res.statusCode === 405 || res.statusCode === 403,
      'SÉCURITÉ IMMUABILITÉ : Tentative de suppression d’un journal d’audit bloquée (405/403)'
    );
  } catch (err) {
    assert(false, `Test 6 Erreur : ${err.message}`);
  }

  // TEST 7 : Demande d'informations complémentaires par l'admin
  try {
    const res = await request(
      {
        path: '/api/trust/verifications/trust_prop_penthouse_river/request-info',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      },
      {
        message: 'Veuillez joindre la copie notariée du contrat de bail original.'
      }
    );

    assert(
      res.statusCode === 200 && res.body?.success === true,
      'FONCTIONNALITÉ : Demande d’informations complémentaires consignée et notifiée avec succès'
    );
  } catch (err) {
    assert(false, `Test 7 Erreur : ${err.message}`);
  }

  // TEST 8 : Journalisation de consultation d'une pièce sensible
  try {
    const res = await request(
      {
        path: '/api/trust/documents/doc_cert_gombe_1/access-log',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      },
      {
        verification_id: 'trust_prop_gombe_villa',
        document_title: 'Certificat d’Enregistrement Vol. 142 Folio 58'
      }
    );

    assert(
      res.statusCode === 200 && res.body?.success === true,
      'AUDIT & TRAÇABILITÉ : Consultation d’un justificatif sensible consignée dans le journal d’audit'
    );
  } catch (err) {
    assert(false, `Test 8 Erreur : ${err.message}`);
  }

  // TEST 9 : Décision d'approbation valide avec motif et score
  try {
    const res = await request(
      {
        path: '/api/trust/verifications/trust_prop_penthouse_river/status',
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        }
      },
      {
        status: 'property_verified',
        trust_level: 'Bien Vérifié & Titre Foncier Contrôlé',
        trust_score: 98,
        admin_notes: 'Contrôle cadastral Lukunga validé conforme sans réserve.',
        expires_in_months: 12
      }
    );

    assert(
      res.statusCode === 200 && res.body?.success === true,
      'DÉCISION ADMINISTRATIVE : Approbation valide appliquée avec date d’expiration et badge actif'
    );
  } catch (err) {
    assert(false, `Test 9 Erreur : ${err.message}`);
  }

  // TEST 10 : RÈGLE MÉTIER PROPRIÉTAIRE : Seul l'annonceur d'un bien peut demander sa certification
  try {
    const res = await request(
      {
        path: '/api/trust/apply',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${normalUserToken}` // Utilisateur lambda qui n'est pas le créateur de prop_1
        }
      },
      {
        target_type: 'property',
        target_id: 'prop_1',
        target_name: 'Villa Gombe Résidentielle',
        documents: []
      }
    );

    assert(
      res.statusCode === 403,
      'RÈGLE MÉTIER KINIMMO TRUST : Interdiction formelle de certifier un bien publié par un tiers (403 Forbidden)'
    );
  } catch (err) {
    assert(false, `Test 10 Erreur : ${err.message}`);
  }

  console.log('\n------------------------------------------------------');
  console.log(`📊 Résultat des tests : ${passed} passés, ${failed} échoués sur ${passed + failed} tests`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erreur exécution tests :', err);
  process.exit(1);
});
