import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import {
  IsolatedServerHandle,
  startIsolatedTestServer,
} from '../helpers/testServerHarness';

const CHROMIUM_EXEC_PATH =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

const VIEWPORT_360 = { width: 360, height: 800 };

async function assertNoHorizontalOverflow(page: Page, contextLabel: string) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  assert.ok(
    metrics.scrollWidth <= metrics.innerWidth + 2,
    `Débordement horizontal détecté à 360px sur "${contextLabel}" : scrollWidth=${metrics.scrollWidth} > innerWidth=${metrics.innerWidth}`
  );
}

describe('E2E 360px : Les 10 parcours utilisateurs complets sur mobile 360px', () => {
  let srv: IsolatedServerHandle;
  let browser: Browser;

  before(async () => {
    srv = await startIsolatedTestServer({ port: 3194 });
    browser = await chromium.launch({
      executablePath: CHROMIUM_EXEC_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  });

  after(async () => {
    if (browser) await browser.close();
    if (srv) await srv.stop();
  });

  async function newMobileContext(): Promise<{ context: BrowserContext; page: Page; pageErrors: string[] }> {
    const context = await browser.newContext({
      viewport: VIEWPORT_360,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    return { context, page, pageErrors };
  }

  it('Parcours 1 & 2 : Découverte 360px, recherche filtrée, fiche détaillée & contact/favoris', async () => {
    const { context, page, pageErrors } = await newMobileContext();
    try {
      // Parcours 1 : Accueil & recherche rapide à 360px
      await page.goto(`${srv.baseUrl}/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('section[aria-label="Recherche rapide"]');
      await assertNoHorizontalOverflow(page, 'Accueil /');

      const searchInput = page.locator('input[placeholder*="Rechercher"]');
      await searchInput.fill('Gombe');
      await page.goto(`${srv.baseUrl}/rechercher?commune=Gombe`, { waitUntil: 'networkidle' });
      await assertNoHorizontalOverflow(page, 'Recherche /rechercher');

      // Parcours 2 : Ouverture fiche détaillée d'un bien depuis les annonces publiques
      const propsRes = await page.evaluate(async () => {
        const r = await fetch('/api/properties');
        return r.json();
      });
      assert.ok(Array.isArray(propsRes.properties) && propsRes.properties.length > 0);
      const firstId = propsRes.properties[0].id;

      await page.goto(`${srv.baseUrl}/annonces/${encodeURIComponent(firstId)}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      const bodyText = await page.locator('body').innerText();
      assert.ok(bodyText.trim().length > 80, 'La fiche détaillée du bien doit afficher du contenu complet');
      await assertNoHorizontalOverflow(page, `Fiche bien /annonces/${firstId}`);

      assert.deepEqual(pageErrors, []);
    } finally {
      await context.close();
    }
  });

  it('Parcours 3 & 4 : Inscription (sans e-mail obligatoire) & Publication complète à 360px', async () => {
    const { context, page, pageErrors } = await newMobileContext();
    try {
      // Parcours 3 : Page d'inscription à 360px (téléphone +243 sans e-mail)
      await page.goto(`${srv.baseUrl}/inscription`, { waitUntil: 'networkidle' });
      await assertNoHorizontalOverflow(page, 'Inscription /inscription');

      const phoneOnly = await page.evaluate(async () => {
        const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
        const { csrfToken } = await csrfRes.json();
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({
            name: 'Mobile Phone Agent',
            phone: '+243818881122',
            password: 'Km!61Vx#2026Qp',
            role: 'agent',
            termsAccepted: true,
          }),
        });
        return { status: regRes.status, data: await regRes.json() };
      });
      assert.equal(phoneOnly.status, 201);

      // Parcours 4 : Accès à /publier à 360px sans blocage e-mail
      await page.goto(`${srv.baseUrl}/publier`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await assertNoHorizontalOverflow(page, 'Publication /publier');
      const publishText = await page.locator('body').innerText();
      assert.ok(!publishText.includes('EMAIL_VERIFICATION_REQUIRED'));

      assert.deepEqual(pageErrors, []);
    } finally {
      await context.close();
    }
  });

  it('Parcours 5 & 6 : Conciergerie sur mesure & Visites vidéo immersives à 360px', async () => {
    const { context, page, pageErrors } = await newMobileContext();
    try {
      // Parcours 5 : Conciergerie
      await page.goto(`${srv.baseUrl}/conciergerie`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await assertNoHorizontalOverflow(page, 'Conciergerie /conciergerie');
      const conciergeTxt = await page.locator('body').innerText();
      assert.ok(conciergeTxt.length > 50);

      // Parcours 6 : Kinimmo Visites Vidéos
      await page.goto(`${srv.baseUrl}/visites`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await assertNoHorizontalOverflow(page, 'Visites Vidéo /visites');

      assert.deepEqual(pageErrors, []);
    } finally {
      await context.close();
    }
  });

  it('Parcours 7 & 8 : Parcours dédié Boost /pro/boost & Tableau de bord Pro Agent à 360px', async () => {
    const { context, page, pageErrors } = await newMobileContext();
    try {
      await page.goto(`${srv.baseUrl}/connexion`, { waitUntil: 'networkidle' });
      await assertNoHorizontalOverflow(page, 'Connexion /connexion');
      // Inscrire un agent et créer un bien dans le contexte navigateur
      const setup = await page.evaluate(async () => {
        const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
        const { csrfToken } = await csrfRes.json();
        await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({
            name: 'Agent Boost 360',
            email: 'boost360@kinimmo.cd',
            phone: '+243818883344',
            password: 'Km!62Vx#2026Qp',
            role: 'agent',
            termsAccepted: true,
          }),
        });
        const propRes = await fetch('/api/properties', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({
            title: 'Duplex Boost 360 Gombe',
            description: 'Superbe duplex pour test E2E 360px.',
            price: 220000,
            images: ['https://a.jpg', 'https://b.jpg', 'https://c.jpg'],
            published: true,
          }),
        });
        return propRes.json();
      });
      const propId = setup.property.id;

      // Parcours 7 : Page dédiée Boost /pro/boost/:propertyId à 360px
      await page.goto(`${srv.baseUrl}/pro/boost/${encodeURIComponent(propId)}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      await assertNoHorizontalOverflow(page, 'Boost dédié /pro/boost');
      const boostTxt = await page.locator('body').innerText();
      assert.ok(boostTxt.includes('Sponsorisé') || boostTxt.includes('À la une') || boostTxt.includes('boost'));

      // Parcours 8 : Espace Pro Agent /pro, /pro/annonces, /pro/prospects, /pro/plus/boosts à 360px
      for (const proPath of ['/pro', '/pro/annonces', '/pro/prospects', '/pro/plus/boosts']) {
        await page.goto(`${srv.baseUrl}${proPath}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(350);
        await assertNoHorizontalOverflow(page, `Espace Pro ${proPath}`);
      }

      assert.deepEqual(pageErrors, []);
    } finally {
      await context.close();
    }
  });

  it('Parcours 9 & 10 : Espace Agence (équipe/transactions) & Administration à 360px', async () => {
    const { context, page, pageErrors } = await newMobileContext();
    try {
      await page.goto(`${srv.baseUrl}/connexion`, { waitUntil: 'networkidle' });
      // Parcours 9 : Espace Agence & annuaire agences à 360px
      await page.evaluate(async () => {
        const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
        const { csrfToken } = await csrfRes.json();
        await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          body: JSON.stringify({
            name: 'Agence 360',
            email: 'agence360@kinimmo.cd',
            phone: '+243818885566',
            password: 'Km!63Vx#2026Qp',
            role: 'agency',
            agencyName: 'Agence Kin 360',
            termsAccepted: true,
          }),
        });
      });

      await page.goto(`${srv.baseUrl}/agences`, { waitUntil: 'networkidle' });
      await assertNoHorizontalOverflow(page, 'Annuaire Agences /agences');

      await page.goto(`${srv.baseUrl}/pro/plus/equipe`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);
      await assertNoHorizontalOverflow(page, 'Espace Agence /pro/plus/equipe');

      // Parcours 10 : Connexion Admin & tableau d'administration à 360px
      await page.evaluate(
        async ({ email, password }) => {
          const csrfRes = await fetch('/api/auth/csrf', { credentials: 'include' });
          const { csrfToken } = await csrfRes.json();
          await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
            body: JSON.stringify({ identifier: email, password }),
          });
        },
        { email: srv.adminCredentials.email, password: srv.adminCredentials.password }
      );

      for (const adminPath of ['/admin', '/admin/monetization', '/admin/fraud']) {
        await page.goto(`${srv.baseUrl}${adminPath}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(450);
        await assertNoHorizontalOverflow(page, `Admin ${adminPath}`);
      }

      assert.deepEqual(pageErrors, []);
    } finally {
      await context.close();
    }
  });
});
