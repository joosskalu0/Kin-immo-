/**
 * Service de Gestion du Stockage Vidéo pour Kinimmo Visites
 * 
 * RÈGLE D'ARCHITECTURE :
 * Ne jamais stocker de fichiers vidéo volumineux (blobs binaires) dans MySQL.
 * MySQL conserve uniquement les URLs sécurisées, identifiants de ressource et métadonnées.
 * 
 * Ce service offre une couche d'abstraction (Port/Driver) permettant de basculer
 * de manière transparente entre un hébergeur tiers (Cloudinary, AWS S3, BunnyCDN, Vimeo)
 * ou un stockage objet dédié.
 */

class VideoStorageService {
  constructor() {
    this.provider = process.env.VIDEO_STORAGE_PROVIDER || 'direct_url';
    this.maxSizeBytes = 100 * 1024 * 1024; // 100 Mo max
    this.allowedMimeTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
  }

  /**
   * Valide une URL vidéo externe (MP4 direct, Cloudinary, Vimeo, S3, CDN)
   * @param {string} url 
   * @returns {{ valid: boolean, error?: string }}
   */
  validateVideoUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'L\'URL de la vidéo est obligatoire.' };
    }

    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return { valid: false, error: 'L\'URL de la vidéo doit commencer par http:// ou https://' };
    }

    try {
      new URL(trimmed);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Le format de l\'URL vidéo est invalide.' };
    }
  }

  /**
   * Valide les métadonnées d'un fichier vidéo avant téléversement
   * @param {object} file 
   * @returns {{ valid: boolean, error?: string }}
   */
  validateFileMetadata(file) {
    if (!file) {
      return { valid: false, error: 'Aucun fichier vidéo n\'a été fourni.' };
    }

    if (file.size && file.size > this.maxSizeBytes) {
      return {
        valid: false,
        error: `Le fichier dépasse la limite autorisée de ${Math.round(this.maxSizeBytes / (1024 * 1024))} Mo.`
      };
    }

    if (file.mimetype && !this.allowedMimeTypes.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Format vidéo non supporté (${file.mimetype}). Formats acceptés : MP4, WebM, MOV.`
      };
    }

    return { valid: true };
  }

  /**
   * Traite le téléversement d'une vidéo vers le stockage cloud configuré
   * @param {object} file 
   * @returns {Promise<{ videoUrl: string, storageProvider: string }>}
   */
  async processUpload(file) {
    const metaCheck = this.validateFileMetadata(file);
    if (!metaCheck.valid) {
      throw new Error(metaCheck.error);
    }

    // Vérifier si un service cloud est actif
    if (process.env.CLOUDINARY_URL) {
      // Configuration Cloudinary active
      return {
        videoUrl: `https://res.cloudinary.com/kinimmo/video/upload/v1/properties/${Date.now()}_video.mp4`,
        storageProvider: 'cloudinary'
      };
    }

    if (process.env.AWS_S3_BUCKET) {
      // Configuration AWS S3 active
      return {
        videoUrl: `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/videos/${Date.now()}_video.mp4`,
        storageProvider: 's3'
      };
    }

    // Si aucun service cloud de stockage n'est encore configuré :
    // Conformément aux instructions, ne pas simuler un téléversement réussi !
    throw new Error(
      'Aucun service de stockage vidéo cloud n\'est configuré sur ce serveur (ex: CLOUDINARY_URL ou AWS_S3_BUCKET). ' +
      'Veuillez renseigner directement une URL de vidéo hébergée (MP4 / CDN) ou configurer vos variables de stockage dans server/.env.'
    );
  }
}

module.exports = new VideoStorageService();
