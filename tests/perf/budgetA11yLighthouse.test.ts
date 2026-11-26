import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium, Browser } from 'playwright-core';
import lighthouse from 'lighthouse';
import {
  IsolatedServerHandle,
  startIsolatedTestServer,
} from '../helpers/testServerHarness';

const CHROMIUM_EXEC_PATH =
  process.env.PLAYWRIGHT_EXECUTABLE_PATH ||
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';

const AXE_SCRIPT_PATH = path.join(process.cwd(), 'node_modules', 'axe-core', 'axe.min.js');

describe('Performance & Accessibilité : Budget de poids, Lighthouse & axe-core à 360px', () => {
  let srv: IsolatedServerHandle;
  let browser: Browser;

  before(async () => {
    srv = await startIsolatedTestServer({ port: 3195 });
  });

  after(async () => {
    if (browser) await browser.close();
    if (srv) await srv.stop();
  });

  it('respecte le budget de poids sur le build de production (dist/)', () => {
    const distAssetsDir = path.join(process.cwd(), 'dist', 'assets');
    assert.ok(fs.existsSync(distAssetsDir), 'Le dossier dist/assets doit exister (exécuter npm run build)');

    const files = fs.readdirSync(distAssetsDir);
    let totalJsRaw = 0;
    let totalJsGzip = 0;
    let totalCssGzip = 0;
    let maxSingleJsGzip = 0;
    const sourceMaps: string[] = [];

    for (const file of files) {
      const full = path.join(distAssetsDir, file);
      if (!fs.statSync(full).isFile()) continue;
      const buf = fs.readFileSync(full);
      const gz = zlib.gzipSync(buf).length;

      if (file.endsWith('.map')) sourceMaps.push(file);
      if (file.endsWith('.js')) {
        totalJsRaw += buf.length;
        totalJsGzip += gz;
        if (gz > maxSingleJsGzip) maxSingleJsGzip = gz;
      } else if (file.endsWith('.css')) {
        totalCssGzip += gz;
      }
    }

    assert.equal(sourceMaps.length, 0, 'Aucune source map ne doit être exposée en production');
    // Budget réaliste pour SPA complète (React + Leaflet + Recharts + jsPDF + Lucide)
    assert.ok(totalJsGzip < 1_500_000, `Total JS gzippé (${totalJsGzip} B) dépasse le budget de 1.5 MB`);
    assert.ok(maxSingleJsGzip < 600_000, `Chunk JS principal gzippé (${maxSingleJsGzip} B) dépasse 600 KB`);
    assert.ok(totalCssGzip < 80_000, `Total CSS gzippé (${totalCssGzip} B) dépasse 80 KB`);

    console.log(
      `  📦 Budget build OK — JS brut: ${(totalJsRaw / 1024).toFixed(1)} KB | JS gzip: ${(
        totalJsGzip / 1024
      ).toFixed(1)} KB | CSS gzip: ${(totalCssGzip / 1024).toFixed(1)} KB`
    );

    // Vérification des artefacts PWA compilés (manifest, SW, icônes, offline.html)
    const distDir = path.join(process.cwd(), 'dist');
    const manifestPath = path.join(distDir, 'manifest.webmanifest');
    assert.ok(fs.existsSync(manifestPath), 'dist/manifest.webmanifest doit être généré');
    assert.ok(fs.existsSync(path.join(distDir, 'sw.js')), 'dist/sw.js doit être généré');
    assert.ok(fs.existsSync(path.join(distDir, 'offline.html')), 'dist/offline.html doit être copié');
    assert.ok(fs.existsSync(path.join(distDir, 'apple-touch-icon.png')), 'apple-touch-icon.png requis');

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.id, '/');
    assert.equal(manifest.start_url, '/');
    assert.equal(manifest.scope, '/');
    assert.equal(manifest.display, 'standalone');
    assert.ok(typeof manifest.short_name === 'string' && manifest.short_name.length <= 12, 'short_name <= 12 caractères');
    const iconSizes = (manifest.icons || []).map((i: any) => `${i.sizes}:${i.purpose}`);
    assert.ok(iconSizes.includes('192x192:any'), 'Icône 192x192 any manquante');
    assert.ok(iconSizes.includes('512x512:any'), 'Icône 512x512 any manquante');
    assert.ok(iconSizes.includes('512x512:maskable'), 'Icône 512x512 maskable manquante');
    for (const ic of manifest.icons || []) {
      const cleanSrc = String(ic.src || '').replace(/^\//, '');
      assert.ok(fs.existsSync(path.join(distDir, cleanSrc)), `Icône manquante dans dist/ : ${cleanSrc}`);
    }
  });

  it('passe le contrôle automatique d’accessibilité axe-core (zéro violation critique) à 360px', async () => {
    assert.ok(fs.existsSync(AXE_SCRIPT_PATH), 'axe.min.js introuvable dans node_modules');
    const axeSource = fs.readFileSync(AXE_SCRIPT_PATH, 'utf8');

    browser = await chromium.launch({
      executablePath: CHROMIUM_EXEC_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const context = await browser.newContext({
      viewport: { width: 360, height: 800 },
      isMobile: true,
    });
    const page = await context.newPage();

    const routesToAudit = ['/', '/rechercher', '/conciergerie', '/tarifs', '/connexion', '/hors-ligne'];
    try {
      for (const routePath of routesToAudit) {
        await page.goto(`${srv.baseUrl}${routePath}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(300);
        await page.addScriptTag({ content: axeSource });

        const results = await page.evaluate(async () => {
          return await (window as any).axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
          });
        });

        const critical = results.violations.filter((v: any) => v.impact === 'critical');
        const serious = results.violations.filter((v: any) => v.impact === 'serious');
        console.log(
          `  ♿ axe-core ${routePath} : ${critical.length} critical, ${serious.length} serious, ${results.passes.length} passes`
        );
        assert.deepEqual(
          critical,
          [],
          `Violations d’accessibilité critiques sur ${routePath} :\n${critical
            .map((v: any) => `- ${v.id}: ${v.help} (${v.nodes.length} nœuds)`)
            .join('\n')}`
        );
      }
    } finally {
      await context.close();
      await browser.close();
    }
  });

  it('exécute un audit Google Lighthouse mobile et vérifie les scores clés', async () => {
    const debugPort = 9335;
    const lhBrowser = await chromium.launch({
      executablePath: CHROMIUM_EXEC_PATH,
      headless: true,
      args: [
        `--remote-debugging-port=${debugPort}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    try {
      const runnerResult = await lighthouse(`${srv.baseUrl}/`, {
        port: debugPort,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 360,
          height: 800,
          deviceScaleFactor: 2,
          disabled: false,
        },
        throttlingMethod: 'provided',
      });

      assert.ok(runnerResult && runnerResult.lhr, 'Rapport Lighthouse absent');
      const cats = runnerResult.lhr.categories;
      const perf = Math.round((cats.performance?.score ?? 0) * 100);
      const a11y = Math.round((cats.accessibility?.score ?? 0) * 100);
      const bp = Math.round((cats['best-practices']?.score ?? 0) * 100);
      const seo = Math.round((cats.seo?.score ?? 0) * 100);

      console.log(
        `  🚦 Lighthouse mobile 360px — Performance: ${perf}/100 | Accessibilité: ${a11y}/100 | Bonnes pratiques: ${bp}/100 | SEO: ${seo}/100`
      );
      if (bp < 80) {
        const failedBp = Object.values(runnerResult.lhr.audits)
          .filter((a: any) => a.score !== null && a.score < 1 && runnerResult.lhr.categories['best-practices']?.auditRefs?.some((r: any) => r.id === a.id && r.weight > 0))
          .map((a: any) => `${a.id} (${a.score})`);
        console.log('  ⚠️ Lighthouse best-practices audits < 1:', failedBp.join(', '));
      }

      assert.ok(perf >= 65, `Score Lighthouse Performance (${perf}) inférieur au seuil 65`);
      assert.ok(a11y >= 80, `Score Lighthouse Accessibilité (${a11y}) inférieur au seuil 80`);
      assert.ok(bp >= 80, `Score Lighthouse Bonnes Pratiques (${bp}) inférieur au seuil 80`);
      assert.ok(seo >= 80, `Score Lighthouse SEO (${seo}) inférieur au seuil 80`);
    } finally {
      await lhBrowser.close();
    }
  });

  it('vérifie la navigation hors connexion, le lien d’évitement WCAG AA et le cache des pages récentes + favoris à 360px', async () => {
    const pwaBrowser = await chromium.launch({
      executablePath: CHROMIUM_EXEC_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const context = await pwaBrowser.newContext({
      viewport: { width: 360, height: 800 },
      isMobile: true,
    });
    const page = await context.newPage();

    try {
      await page.goto(`${srv.baseUrl}/`, { waitUntil: 'networkidle' });
      await page.waitForSelector('a.skip-link');

      // Vérifier l'enregistrement des pages et favoris en cache local puis basculer hors connexion
      await page.goto(`${srv.baseUrl}/rechercher`, { waitUntil: 'networkidle' });
      const propsData = await page.evaluate(async () => {
        const res = await fetch('/api/properties');
        return res.json();
      });
      const samplePropId = propsData?.properties?.[0]?.id;
      if (samplePropId) {
        await page.goto(`${srv.baseUrl}/annonces/${encodeURIComponent(samplePropId)}`, {
          waitUntil: 'networkidle',
        });
        await page.evaluate((id) => {
          localStorage.setItem('kinimmo_wishlist_v1', JSON.stringify([id]));
        }, samplePropId);
      }

      // Simuler la perte de réseau et ouvrir la vue hors connexion
      await context.setOffline(true);
      await page.evaluate(() => {
        window.dispatchEvent(new Event('offline'));
      });
      await page.goto(`${srv.baseUrl}/hors-ligne`, { waitUntil: 'domcontentloaded' }).catch(async () => {
        await page.goto(`${srv.baseUrl}/offline.html`, { waitUntil: 'domcontentloaded' });
      });
      await page.waitForTimeout(300);

      const text = await page.locator('body').innerText();
      assert.ok(text.includes('hors connexion'), 'La page hors connexion doit s’afficher clairement');
      assert.ok(text.includes('Pages vues récemment'), 'Section pages vues récemment attendue');
      assert.ok(text.includes('Annonces vues récemment'), 'Section annonces vues récemment attendue');
      assert.ok(text.includes('favoris'), 'Section favoris attendue');
      if (samplePropId && propsData?.properties?.[0]?.title) {
        assert.ok(
          text.includes(propsData.properties[0].title),
          'L’annonce récemment consultée doit rester accessible hors connexion'
        );
      }
    } finally {
      await context.close();
      await pwaBrowser.close();
    }
  });
});
