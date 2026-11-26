import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzePropertyForFraud,
  auditPropertyList,
  computeTextSimilarity,
  normalizePhoneNumber,
} from '../../src/utils/suspiciousListingDetector';
import {
  DEFAULT_FEATURED_SLOTS_LIMIT,
  computeBoostMetrics,
  evaluateBoostRequestStatus,
  getActiveBoostDisplay,
  getTopFeaturedProperties,
  isBoostWindowActive,
  isPropertyPubliclyVisible,
  parseFeaturedSlotsLimit,
  resolveBoostPrimaryLabel,
  sortPropertiesWithTopSlots,
} from '../../src/utils/boostHelpers';
import { canUserManageProperty } from '../../src/utils/propertyPermissions';
import {
  canBoostProperty,
  canUserEditProperty,
  getListingLifecycleStatus,
} from '../../src/utils/propertyStatusHelpers';
import {
  convertAndFormatPrice,
  getDualCurrencyDisplay,
} from '../../src/utils/currency';
import {
  enforceSoftDowngradeOnProperties,
  getDefaultPlans,
  normalizePlan,
  resolveAccountBillingSummary,
  restoreSoftHiddenProperties,
} from '../../src/utils/billingHelpers';
import {
  normalizePhoneRdc,
  validatePasswordPolicy,
} from '../../src/utils/authValidation';
import { canUserPublishListings } from '../../server/authSecurity';
import { findMatchingProperties } from '../../src/utils/propertyMatching';
import {
  validateAndNormalizePropertyPricing,
  getPropertyDisplayCurrencies,
  computeRentalBreakdown,
} from '../../src/utils/propertyPricing';
import type { Agent, Property, PropertyUserReport, User } from '../../src/types';

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'prop_unit_1',
    title: 'Villa moderne avec piscine à Gombe',
    description: 'Magnifique villa spacieuse de 4 chambres avec jardin arboré, sécurité 24/7 et groupe électrogène.',
    price: 380000,
    currency: 'USD',
    type: 'villa',
    category: 'Résidentiel',
    status: 'for-sale',
    address: '12 Avenue des Aviateurs',
    city: 'Kinshasa',
    commune: 'Gombe',
    quartier: 'Centre-Ville',
    zipCode: '00243',
    country: 'RDC',
    lat: -4.305,
    lng: 15.305,
    bedrooms: 4,
    bathrooms: 3,
    area: 350,
    amenities: ['Piscine', 'Sécurité 24/7'],
    images: ['https://cdn.example.com/a.jpg', 'https://cdn.example.com/b.jpg', 'https://cdn.example.com/c.jpg'],
    labels: [],
    customFields: {},
    agentId: 'agent_1',
    userId: 'agent_1',
    contactPhone: '+243812345678',
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
    viewsCount: 40,
    whatsappClicks: 4,
    phoneCalls: 2,
    featured: false,
    published: true,
    listingStatus: 'PUBLISHED',
    ...overrides,
  };
}

describe('1. Règles anti-fraude (suspiciousListingDetector)', () => {
  it('normalise les numéros RDC sur les 9 derniers chiffres et calcule la similarité Jaccard', () => {
    assert.equal(normalizePhoneNumber('+243 81 234 56 78'), '812345678');
    assert.equal(normalizePhoneNumber('0812345678'), '812345678');
    assert.equal(
      computeTextSimilarity('Belle villa à louer Gombe Kinshasa', 'Belle villa à louer Gombe Kinshasa'),
      1
    );
    assert.ok(computeTextSimilarity('Appartement Ngaliema', 'Terrain industriel Maluku') < 0.2);
  });

  it('valide une annonce normale avec un score < 30 et verdict normal', () => {
    const clean = makeProperty();
    const res = analyzePropertyForFraud(clean, [clean], []);
    assert.equal(res.verdict, 'normal');
    assert.ok(res.riskScore < 30);
    assert.equal(res.flags.length, 0);
  });

  it('détecte les photos dupliquées entre annonceurs différents et le loyer anormalement bas', () => {
    const other = makeProperty({
      id: 'prop_other',
      agentId: 'agent_2',
      images: ['https://cdn.example.com/shared.jpg'],
    });
    const suspicious = makeProperty({
      id: 'prop_sus',
      agentId: 'agent_1',
      status: 'for-rent',
      price: 100, // Gombe minRent = 700 -> < 25% -> +40 pts (critical)
      commune: 'Gombe',
      images: ['https://cdn.example.com/shared.jpg'], // +45 pts (critical)
      description: 'Urgent, veuillez verser un acompte avant visite par Western Union.', // +35 +30
    });
    const res = analyzePropertyForFraud(suspicious, [other, suspicious], []);
    assert.equal(res.verdict, 'suspect');
    assert.ok(res.riskScore >= 70);
    assert.ok(res.flags.some((f) => f.code === 'DUPLICATE_PHOTOS'));
    assert.ok(res.flags.some((f) => f.code === 'ABNORMALLY_LOW_PRICE'));
    assert.ok(res.flags.some((f) => f.code === 'UNUSUAL_BEHAVIOR'));
  });

  it('détecte un vendeur signalé >= 3 fois et audite le catalogue global', () => {
    const p1 = makeProperty({ id: 'p_rep_1', agentId: 'agent_bad' });
    const reports: PropertyUserReport[] = [
      { id: 'r1', propertyId: 'p_rep_1', reason: 'scam_advance_payment', status: 'pending', createdAt: '2026-10-01T00:00:00Z' },
      { id: 'r2', propertyId: 'p_rep_1', reason: 'stolen_photos', status: 'pending', createdAt: '2026-10-02T00:00:00Z' },
      { id: 'r3', propertyId: 'p_rep_1', reason: 'fake_price', status: 'pending', createdAt: '2026-10-03T00:00:00Z' },
    ];
    const audit = auditPropertyList([p1], reports);
    assert.equal(audit.total, 1);
    assert.equal(audit.suspectCount, 1);
    assert.equal(audit.auditedProperties[0].published, false);
  });
});

describe('2. Règles d’expiration et de boost (boostHelpers)', () => {
  it('valide le plafond d’emplacements à 6 par défaut et borne la configuration admin [1..50]', () => {
    assert.equal(DEFAULT_FEATURED_SLOTS_LIMIT, 6);
    assert.equal(parseFeaturedSlotsLimit(undefined), 6);
    assert.equal(parseFeaturedSlotsLimit(0), 6);
    assert.equal(parseFeaturedSlotsLimit(12), 12);
    assert.equal(parseFeaturedSlotsLimit(200), 50);
  });

  it('évalue la fenêtre de boost strictement à la lecture sans tâche planifiée', () => {
    const now = Date.UTC(2026, 10, 24, 12, 0, 0);
    const start = new Date(now - 3600_000).toISOString();
    const future = new Date(now + 3600_000).toISOString();
    const past = new Date(now - 1000).toISOString();

    assert.equal(isBoostWindowActive(start, future, now), true);
    assert.equal(isBoostWindowActive(start, past, now), false);
    assert.equal(isBoostWindowActive(future, new Date(now + 7200_000).toISOString(), now), false);
  });

  it('résout correctement À la une vs Sponsorisé + Urgent et exclut tout bien suspendu/masqué', () => {
    const now = Date.now();
    const future = new Date(now + 86400_000).toISOString();
    const pastStart = new Date(now - 86400_000).toISOString();

    assert.equal(resolveBoostPrimaryLabel('featured', 'À la une'), 'À la une');
    assert.equal(resolveBoostPrimaryLabel('sponsorise', 'Sponsorisé'), 'Sponsorisé');

    const activeBoosted = makeProperty({
      featured: true,
      isSponsored: true,
      isUrgent: true,
      boostType: 'sponsorise',
      boostStartedAt: pastStart,
      boostExpiresAt: future,
    });
    const disp = getActiveBoostDisplay(activeBoosted, now);
    assert.equal(disp.isActive, true);
    assert.equal(disp.primaryLabel, 'Sponsorisé');
    assert.equal(disp.isUrgent, true);

    const suspendedBoosted = makeProperty({
      ...activeBoosted,
      id: 'p_susp',
      isSuspended: true,
    });
    assert.equal(isPropertyPubliclyVisible(suspendedBoosted), false);
    assert.equal(getActiveBoostDisplay(suspendedBoosted, now).isActive, false);

    const softHidden = makeProperty({ ...activeBoosted, id: 'p_soft', softHiddenByPlan: true });
    assert.equal(isPropertyPubliclyVisible(softHidden), false);
  });

  it('limite les emplacements en tête à N et calcule les statuts et métriques avant/pendant', () => {
    const now = Date.now();
    const future = new Date(now + 86400_000).toISOString();
    const past = new Date(now - 60_000).toISOString();
    const items = Array.from({ length: 9 }, (_, i) =>
      makeProperty({
        id: `p_${i}`,
        featured: true,
        boostStartedAt: new Date(now - 10_000).toISOString(),
        boostExpiresAt: future,
        viewsCount: 100 - i,
      })
    );
    const top6 = getTopFeaturedProperties(items, 6, now);
    assert.equal(top6.length, 6);
    const sorted = sortPropertiesWithTopSlots(items, 6, now);
    assert.equal(sorted.length, 9);
    assert.equal(sorted[0].id, 'p_0');

    assert.equal(evaluateBoostRequestStatus({ status: 'paid', expires_at: past }, now), 'expired');
    assert.equal(evaluateBoostRequestStatus({ status: 'paid', expires_at: future }, now), 'active');
    assert.equal(evaluateBoostRequestStatus({ status: 'suspended', expires_at: future }, now), 'suspended');

    const metrics = computeBoostMetrics(
      { status: 'paid', starts_at: new Date(now - 10_000).toISOString(), expires_at: future, views_before: 10, contacts_before: 2, views_during_acc: 7, contacts_during_acc: 3 },
      { views: 20, whatsapp: 3, phone: 2 }
    );
    assert.equal(metrics.viewsBefore, 10);
    assert.equal(metrics.contactsBefore, 2);
    assert.equal(metrics.viewsDuring, 7);
    assert.equal(metrics.contactsDuring, 3);
  });
});

describe('3. Droits d’équipe, permissions et publication', () => {
  const agentA: User = { id: 'u_a', name: 'Agent A', email: 'a@agA.cd', role: 'agent', agencyId: 'ag_A', avatar: '', planId: 'pro' };
  const agencyA: User = { id: 'ag_A', name: 'Agence A', email: 'dir@agA.cd', role: 'agency', agencyId: 'ag_A', avatar: '', planId: 'agency' };
  const agencyB: User = { id: 'ag_B', name: 'Agence B', email: 'dir@agB.cd', role: 'agency', agencyId: 'ag_B', avatar: '', planId: 'agency' };
  const admin: User = { id: 'adm_1', name: 'Admin', email: 'adm@kinimmo.cd', role: 'admin', avatar: '', planId: 'agency' };
  const buyer: User = { id: 'usr_1', name: 'Client', email: 'cli@mail.cd', role: 'user', avatar: '', planId: 'starter' };

  const propA = makeProperty({ id: 'p_agA', agentId: 'u_a', userId: 'u_a', agencyId: 'ag_A', agencyName: 'Agence A' });
  const propAssigned = makeProperty({ id: 'p_assigned', agentId: 'other', userId: 'other', assignedAgentId: 'u_a', agencyId: 'ag_A' });

  it('applique les droits d’équipe strictement par propriétaire, attribution et agence', () => {
    const agents: Agent[] = [{ id: 'u_a', name: 'Agent A', title: 'Agent Immobilier', email: 'a@agA.cd', phone: '+243810000001', whatsapp: '+243810000001', avatar: '', agencyId: 'ag_A', agencyName: 'Agence A', listingsCount: 1, bio: '', rating: 5, reviewCount: 1, specialties: [], languages: ['Français'] }];
    assert.equal(canUserManageProperty(admin, propA, agents), true);
    assert.equal(canUserManageProperty(agentA, propA, agents), true);
    assert.equal(canUserManageProperty(agencyA, propA, agents), true);
    assert.equal(canUserManageProperty(agentA, propAssigned, agents), true);

    // Isolation inter-agences stricte
    assert.equal(canUserManageProperty(agencyB, propA, agents), false);
    assert.equal(canUserManageProperty(buyer, propA, agents), false);

    assert.equal(canUserEditProperty(agencyA, propA), true);
    assert.equal(canUserEditProperty(agencyB, propA), false);
    assert.equal(canUserEditProperty(agentA, propAssigned), true);
  });

  it('autorise la publication pour tout compte connecté (avec ou sans email) et refuse les comptes déconnectés', () => {
    assert.equal(canUserPublishListings(null).allowed, false);
    assert.equal(
      canUserPublishListings({
        id: 'u_phone',
        name: 'Tel User',
        email: '',
        phone: '+243812345678',
        role: 'agent',
        emailVerified: false,
        createdAt: '2026-10-01T00:00:00Z',
      }).allowed,
      true
    );
    assert.equal(
      canUserPublishListings({
        id: 'u_mail',
        name: 'Mail User',
        email: 'test@kinimmo.cd',
        role: 'owner',
        emailVerified: false,
        createdAt: '2026-10-01T00:00:00Z',
      }).allowed,
      true
    );

    assert.equal(normalizePhoneRdc('+243 81 234 56 78').valid, true);
    assert.equal(normalizePhoneRdc('0812345678').normalized, '+243812345678');
    assert.equal(normalizePhoneRdc('12345').valid, false);

    assert.equal(validatePasswordPolicy('short', {}).valid, false);
    assert.equal(validatePasswordPolicy('StrongPass#2026', { email: 'x@y.cd', name: 'Jean' }).valid, true);
  });

  it('bloque le boost sur les biens vendus, loués, brouillons ou archivés', () => {
    assert.equal(getListingLifecycleStatus({ listingStatus: 'SOLD' }), 'SOLD');
    assert.equal(canBoostProperty(makeProperty({ listingStatus: 'PUBLISHED' })).allowed, true);
    assert.equal(canBoostProperty(makeProperty({ listingStatus: 'SOLD' })).allowed, false);
    assert.equal(canBoostProperty(makeProperty({ listingStatus: 'RENTED' })).allowed, false);
    assert.equal(canBoostProperty(makeProperty({ listingStatus: 'DRAFT' })).allowed, false);
    assert.equal(canBoostProperty(makeProperty({ listingStatus: 'ARCHIVED' })).allowed, false);
  });
});

describe('4. Calculs métier (devises, facturation, rétrogradation douce, matching)', () => {
  it('convertit et formate USD <-> CDF selon le taux admin', () => {
    assert.equal(convertAndFormatPrice(100, 'USD', 2850, 'USD'), '$100');
    const cdf = convertAndFormatPrice(100, 'CDF', 2850, 'USD');
    assert.ok(cdf.includes('285') && cdf.includes('FC'));

    const dual = getDualCurrencyDisplay(285000, 'CDF', 'USD', 2850);
    assert.equal(dual.primaryFormatted, '$100');
    assert.equal(dual.effectiveRate, 2850);
  });

  it('calcule le résumé de facturation et gère la rétrogradation douce + restauration', () => {
    const plans = getDefaultPlans(2850);
    const starter = normalizePlan(plans[0], 2850);
    assert.equal(starter.maxListings, 3);

    const expiredUser: User = {
      id: 'u_exp',
      name: 'Agence Exp',
      email: 'exp@ag.cd',
      role: 'agency',
      avatar: '',
      planId: 'agency',
      subscriptionExpiresAt: '2020-01-01T00:00:00.000Z',
    };
    const fiveProps = Array.from({ length: 5 }, (_, i) =>
      makeProperty({
        id: `own_${i}`,
        agentId: 'u_exp',
        userId: 'u_exp',
        updatedAt: `2026-10-0${i + 1}T10:00:00.000Z`,
      })
    );

    const summary = resolveAccountBillingSummary({
      user: expiredUser,
      plans,
      properties: fiveProps,
    });
    assert.equal(summary.isExpired, true);
    assert.equal(summary.effectivePlan.id, 'starter');

    const downgraded = enforceSoftDowngradeOnProperties(fiveProps, 'u_exp', 3);
    assert.equal(downgraded.hiddenCount, 2);
    assert.equal(downgraded.updatedProperties.filter((p) => p.published).length, 3);

    const restored = restoreSoftHiddenProperties(downgraded.updatedProperties, 'u_exp');
    assert.equal(restored.restoredCount, 2);
    assert.equal(restored.updatedProperties.filter((p) => p.published).length, 5);
  });

  it('calcule le score de correspondance conciergerie selon commune, budget et chambres', () => {
    const props = [
      makeProperty({ id: 'm1', commune: 'Gombe', type: 'villa', status: 'for-rent', price: 1800, bedrooms: 3, area: 180 }),
      makeProperty({ id: 'm2', commune: 'Matete', type: 'apartment', status: 'for-sale', price: 90000, bedrooms: 2, area: 90 }),
    ];
    const matches = findMatchingProperties(
      {
        id: 'req_1',
        full_name: 'Client Test',
        phone: '+243810000001',
        project_type: 'rent',
        property_type: 'villa',
        commune: 'Gombe',
        budget_max: 2200,
        currency: 'USD',
        bedrooms: 3,
      },
      props
    );
    assert.ok(matches.length >= 1);
    assert.equal(matches[0].property.id, 'm1');
    assert.ok(matches[0].score >= 70);
  });
});

describe('7. Tarification immobilière, devises USD/CDF et conditions locatives', () => {
  it('valide les prix entiers, devises USD/CDF, périodicité mois/an, négociabilité et garantie/avance 0..36', () => {
    const decimalReject = validateAndNormalizePropertyPricing({
      status: 'for-sale',
      price: 150000.5,
      currency: 'USD',
      requirePositivePrice: true,
    });
    assert.equal(decimalReject.valid, false);

    const badCurrency = validateAndNormalizePropertyPricing({
      status: 'for-rent',
      price: 1200,
      currency: 'EUR',
      period: 'month',
      requirePositivePrice: true,
    });
    assert.equal(badCurrency.valid, false);

    const badPeriod = validateAndNormalizePropertyPricing({
      status: 'for-rent',
      price: 1200,
      currency: 'USD',
      period: 'week',
      requirePositivePrice: true,
    });
    assert.equal(badPeriod.valid, false);

    const badGuarantee = validateAndNormalizePropertyPricing({
      status: 'for-rent',
      price: 1200,
      currency: 'USD',
      period: 'month',
      guaranteeMonths: 37,
      requirePositivePrice: true,
    });
    assert.equal(badGuarantee.valid, false);

    const badAdvanceFloat = validateAndNormalizePropertyPricing({
      status: 'for-rent',
      price: 1200,
      currency: 'USD',
      period: 'month',
      advanceMonths: 1.5,
      requirePositivePrice: true,
    });
    assert.equal(badAdvanceFloat.valid, false);

    const validRentCdf = validateAndNormalizePropertyPricing({
      status: 'for-rent',
      price: 2850000,
      currency: 'cdf',
      period: 'year',
      isNegotiable: true,
      guaranteeMonths: 3,
      advanceMonths: 2,
      requirePositivePrice: true,
    });
    assert.equal(validRentCdf.valid, true);
    if (validRentCdf.valid) {
      assert.equal(validRentCdf.data.currency, 'CDF');
      assert.equal(validRentCdf.data.period, 'year');
      assert.equal(validRentCdf.data.isNegotiable, true);
      assert.equal(validRentCdf.data.guaranteeMonths, 3);
      assert.equal(validRentCdf.data.advanceMonths, 2);
    }

    const salePurgesRental = validateAndNormalizePropertyPricing({
      status: 'for-sale',
      price: 220000,
      currency: 'USD',
      period: 'month',
      isNegotiable: false,
      guaranteeMonths: 4,
      advanceMonths: 2,
      requirePositivePrice: true,
    });
    assert.equal(salePurgesRental.valid, true);
    if (salePurgesRental.valid) {
      assert.equal(salePurgesRental.data.period, 'total');
      assert.equal(salePurgesRental.data.guaranteeMonths, undefined);
      assert.equal(salePurgesRental.data.advanceMonths, undefined);
    }
  });

  it('affiche la devise choisie (USD ou CDF) + équivalent converti et calcule garantie/avance en mois', () => {
    const cdfDisplay = getPropertyDisplayCurrencies(
      { price: 2850000, currency: 'CDF', period: 'month', status: 'for-rent' },
      2850
    );
    assert.equal(cdfDisplay.primaryCurrency, 'CDF');
    assert.equal(cdfDisplay.secondaryCurrency, 'USD');
    assert.match(cdfDisplay.primaryFormatted, /FC/);
    assert.match(cdfDisplay.secondaryFormatted, /1\s?000|\$1\s?000/);
    assert.equal(cdfDisplay.periodSuffixCompact, '/mois');

    const annualBreakdown = computeRentalBreakdown(
      {
        price: 12000,
        currency: 'USD',
        period: 'year',
        status: 'for-rent',
        guaranteeMonths: 3,
        advanceMonths: 2,
      },
      2850
    );
    assert.ok(annualBreakdown);
    assert.equal(annualBreakdown.isAnnual, true);
    assert.equal(annualBreakdown.monthlyEquivalent, 1000);
    assert.equal(annualBreakdown.guaranteeAmount, 3000);
    assert.equal(annualBreakdown.advanceAmount, 2000);
    assert.equal(annualBreakdown.totalEntryMonths, 5);
    assert.equal(annualBreakdown.totalEntryAmount, 5000);
  });

  it('ne signale pas à tort un loyer équitable en CDF ou en périodicité annuelle comme prix anormalement bas', () => {
    const fairCdfRent = makeProperty({
      id: 'prop_cdf_fair',
      status: 'for-rent',
      currency: 'CDF',
      period: 'month',
      price: 4275000, // 1500 USD / mois à Gombe (> minRent 700$)
      commune: 'Gombe',
    });
    const resCdf = analyzePropertyForFraud(fairCdfRent, [fairCdfRent], []);
    assert.equal(resCdf.flags.some((f) => f.code === 'ABNORMALLY_LOW_PRICE'), false);

    const fairAnnualRent = makeProperty({
      id: 'prop_annual_fair',
      status: 'for-rent',
      currency: 'USD',
      period: 'year',
      price: 18000, // 1500 USD / mois
      commune: 'Gombe',
    });
    const resAnnual = analyzePropertyForFraud(fairAnnualRent, [fairAnnualRent], []);
    assert.equal(resAnnual.flags.some((f) => f.code === 'ABNORMALLY_LOW_PRICE'), false);
  });
});

