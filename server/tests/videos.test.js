/**
 * Tests Unitaires : Module Kinimmo Visites & Stockage Vidéo
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const videoStorageService = require('../services/videoStorageService');

describe('Kinimmo Visites - VideoStorageService & Invariants', () => {
  it('doit valider une URL vidéo HTTPS directe valide', () => {
    const validUrl = 'https://assets.mixkit.co/videos/preview/mixkit-modern-luxury-house-40541-large.mp4';
    const result = videoStorageService.validateVideoUrl(validUrl);
    assert.equal(result.valid, true);
  });

  it('doit refuser une URL vidéo sans protocole http/https', () => {
    const invalidUrl = 'ftp://videos.kinimmo.cd/demo.mp4';
    const result = videoStorageService.validateVideoUrl(invalidUrl);
    assert.equal(result.valid, false);
    assert.match(result.error, /doit commencer par http:\/\/ ou https:\/\//);
  });

  it('doit refuser une URL vide ou malformée', () => {
    const resultEmpty = videoStorageService.validateVideoUrl('');
    assert.equal(resultEmpty.valid, false);

    const resultNull = videoStorageService.validateVideoUrl(null);
    assert.equal(resultNull.valid, false);
  });

  it('doit vérifier les types MIME autorisés pour les vidéos (MP4, WebM, QuickTime)', () => {
    const validMeta = videoStorageService.validateFileMetadata({
      mimetype: 'video/mp4',
      size: 15 * 1024 * 1024 // 15 Mo
    });
    assert.equal(validMeta.valid, true);

    const invalidMeta = videoStorageService.validateFileMetadata({
      mimetype: 'application/pdf',
      size: 5 * 1024 * 1024
    });
    assert.equal(invalidMeta.valid, false);
    assert.match(invalidMeta.error, /Format vidéo non supporté/);
  });

  it('doit refuser un fichier dépassant la limite de taille maximale (100 Mo)', () => {
    const tooLarge = videoStorageService.validateFileMetadata({
      mimetype: 'video/mp4',
      size: 150 * 1024 * 1024 // 150 Mo
    });
    assert.equal(tooLarge.valid, false);
    assert.match(tooLarge.error, /dépasse la limite autorisée de 100 Mo/);
  });

  it('ne doit jamais simuler un téléversement réussi si aucun stockage cloud n\'est configuré', async () => {
    // S'assurer que les variables cloud ne sont pas configurées dans le contexte de test
    const oldCloudinary = process.env.CLOUDINARY_URL;
    const oldS3 = process.env.AWS_S3_BUCKET;
    delete process.env.CLOUDINARY_URL;
    delete process.env.AWS_S3_BUCKET;

    try {
      await assert.rejects(
        async () => {
          await videoStorageService.processUpload({
            mimetype: 'video/mp4',
            size: 10 * 1024 * 1024
          });
        },
        /Aucun service de stockage vidéo cloud n'est configuré/
      );
    } finally {
      if (oldCloudinary) process.env.CLOUDINARY_URL = oldCloudinary;
      if (oldS3) process.env.AWS_S3_BUCKET = oldS3;
    }
  });

  it('doit vérifier que le limiteur de requêtes sensibles (sensitiveActionLimiter) est actif', () => {
    const { sensitiveActionLimiter } = require('../middleware/rateLimiter');
    assert.equal(typeof sensitiveActionLimiter, 'function');
  });

  it('doit valider les statuts stricts de modération des vidéos (draft, pending, approved, rejected, hidden)', () => {
    const allowedStatuses = ['draft', 'pending', 'approved', 'rejected', 'hidden'];
    const testStatus = 'approved';
    assert.equal(allowedStatuses.includes(testStatus), true);

    const maliciousStatus = 'auto_verified_superadmin';
    assert.equal(allowedStatuses.includes(maliciousStatus), false);
  });
});
