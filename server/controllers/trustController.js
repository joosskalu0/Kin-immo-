// Contrôleur Kinimmo Trust pour Backend Node.js / MySQL Hostinger
// Sécurité renforcée : Requêtes préparées, RBAC, anti-auto-approbation, stockage sécurisé hors public

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const pool = require('../config/database');

const UPLOADS_DIR = path.join(__dirname, '..', 'storage', 'trust_documents');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Validation des types MIME autorisés pour les justificatifs officiels
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const VALID_DOC_TYPES = [
  'cni', 'passport', 'voter_card', 'rccm', 'id_nat', 'nif',
  'certificat_enregistrement', 'livret_logeur', 'acte_vente',
  'mandat_exclusif', 'mandat_simple', 'attestation_localisation', 'other'
];

const VALID_CHECK_TYPES = [
  'identity_validation',
  'rccm_guichet_unique',
  'cadastre_conservation_titres',
  'physical_site_inspection',
  'phone_video_interview'
];

/**
 * 1. Soumettre une demande de vérification Kinimmo Trust
 * Accessible à tout utilisateur authentifié pour son propre compte, son agence ou ses annonces.
 */
exports.submitApplication = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const {
      target_type,
      target_id,
      target_name,
      applicant_phone,
      documents
    } = req.body;

    const applicant_user_id = req.user.id;
    const applicant_name = req.user.name || 'Demandeur Kinimmo';
    const applicant_email = req.user.email || '';
    const phone = applicant_phone || req.user.phone || null;

    // Validation des champs
    if (!target_type || !['agent', 'agency', 'property'].includes(target_type)) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Le paramètre target_type est invalide (doit être "agent", "agency" ou "property").' });
    }
    if (!target_id || typeof target_id !== 'string' || target_id.trim().length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Identifiant cible (target_id) obligatoire.' });
    }
    if (!target_name || typeof target_name !== 'string' || target_name.trim().length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Nom de la cible (target_name) obligatoire.' });
    }

    // Vérification de propriété : l'utilisateur a-t-il le droit de demander pour cette cible ?
    if (target_type === 'property') {
      const [props] = await connection.execute('SELECT id, agent_id, agency_id FROM properties WHERE id = ?', [target_id]);
      if (props.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'L\'annonce immobilière ciblée est introuvable.' });
      }
      const prop = props[0];
      const isOwner = prop.agent_id === applicant_user_id ||
        (req.user.agency_id && prop.agency_id === req.user.agency_id && req.user.role === 'agency') ||
        req.user.role === 'admin';
      if (!isOwner) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: 'Vous n\'avez pas les droits pour demander la vérification de cette annonce.' });
      }
    } else if (target_type === 'agent') {
      if (req.user.role !== 'agent' && req.user.role !== 'admin' && target_id !== applicant_user_id) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: 'Vous ne pouvez soumettre une vérification que pour votre propre profil d\'agent.' });
      }
    } else if (target_type === 'agency') {
      if (req.user.role !== 'agency' && req.user.role !== 'admin' && req.user.agency_id !== target_id) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: 'Vous devez être gestionnaire de l\'agence pour soumettre ce dossier.' });
      }
    }

    // Vérifier si un dossier actif existe déjà
    const [existing] = await connection.execute(
      'SELECT id, trust_status FROM trust_verifications WHERE target_type = ? AND target_id = ? AND trust_status IN ("pending", "in_progress", "identity_verified", "pro_verified", "property_verified")',
      [target_type, target_id]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        message: `Un dossier est déjà actif pour cette cible avec le statut "${existing[0].trust_status}".`,
        verification_id: existing[0].id
      });
    }

    const verificationId = `trust_${crypto.randomUUID()}`;

    // Insertion du dossier de vérification
    await connection.execute(
      `INSERT INTO trust_verifications 
      (id, target_type, target_id, target_name, applicant_user_id, applicant_name, applicant_email, applicant_phone, trust_status, trust_score, submitted_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 25, NOW())`,
      [verificationId, target_type, target_id, target_name.trim(), applicant_user_id, applicant_name, applicant_email, phone]
    );

    // Enregistrer les documents joints dans le payload JSON si fournis
    if (Array.isArray(documents) && documents.length > 0) {
      for (const doc of documents) {
        if (!doc || !doc.title || !doc.file_url) continue;
        const docId = `doc_${crypto.randomUUID()}`;
        const safeDocType = VALID_DOC_TYPES.includes(doc.doc_type) ? doc.doc_type : 'other';
        await connection.execute(
          `INSERT INTO trust_documents 
            (id, verification_id, doc_type, title, document_number, file_url, file_size, file_mime_type, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
          [
            docId,
            verificationId,
            safeDocType,
            String(doc.title).trim().slice(0, 255),
            doc.document_number ? String(doc.document_number).trim().slice(0, 100) : null,
            String(doc.file_url),
            doc.file_size ? String(doc.file_size).slice(0, 50) : null,
            doc.file_mime_type ? String(doc.file_mime_type).slice(0, 100) : null
          ]
        );
      }
    }

    // Mettre à jour l'entité cible en statut 'pending' (sans bloquer si colonne trust_status absente sur une vieille table)
    try {
      if (target_type === 'property') {
        await connection.execute('UPDATE properties SET trust_status = "pending", trust_score = 25 WHERE id = ?', [target_id]);
      } else if (target_type === 'agent') {
        await connection.execute('UPDATE agents SET trust_status = "pending", trust_score = 25 WHERE id = ?', [target_id]);
      } else if (target_type === 'agency') {
        await connection.execute('UPDATE agencies SET trust_status = "pending", trust_score = 25 WHERE id = ?', [target_id]);
      }
    } catch (colErr) {
      console.warn('[Trust submitApplication] Optional entity trust_status sync skipped:', colErr.message);
    }

    // Journal d'audit protégé
    const auditId = `audit_${crypto.randomUUID()}`;
    await connection.execute(
      `INSERT INTO trust_audit_logs 
      (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, previous_status, new_status, reason_or_notes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'DOSSIER_SUBMITTED', 'unverified', 'pending', 'Demande de vérification Kinimmo Trust soumise par le demandeur.', ?)`,
      [auditId, verificationId, target_type, target_id, applicant_user_id, applicant_name, applicant_email, req.ip || '127.0.0.1']
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Demande de vérification Kinimmo Trust soumise avec succès.',
      data: {
        id: verificationId,
        target_type,
        target_id,
        target_name: target_name.trim(),
        trust_status: 'pending',
        status: 'pending',
        trust_score: 25,
        submitted_at: new Date().toISOString()
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * 2. Consulter ses propres demandes de vérification
 */
exports.getMyRequests = async (req, res, next) => {
  try {
    const applicant_user_id = req.user.id;

    const [rows] = await pool.execute(
      `SELECT v.*,
        (SELECT COUNT(*) FROM trust_documents d WHERE d.verification_id = v.id) as documents_count,
        (SELECT COUNT(*) FROM trust_checks c WHERE c.verification_id = v.id) as checks_count
       FROM trust_verifications v
       WHERE v.applicant_user_id = ?
       ORDER BY v.created_at DESC`,
      [applicant_user_id]
    );

    // Récupérer les pièces pour chacun de ses dossiers (l'auteur a le droit de voir ses propres pièces)
    const verifIds = rows.map((r) => r.id);
    let documentsByVerif = {};
    if (verifIds.length > 0) {
      const placeholders = verifIds.map(() => '?').join(',');
      const [docs] = await pool.query(
        `SELECT id, verification_id, doc_type, title, document_number, file_size, file_mime_type, status, rejection_note, created_at 
         FROM trust_documents 
         WHERE verification_id IN (${placeholders})`,
        verifIds
      );
      docs.forEach((doc) => {
        if (!documentsByVerif[doc.verification_id]) documentsByVerif[doc.verification_id] = [];
        documentsByVerif[doc.verification_id].push(doc);
      });
    }

    const data = rows.map((r) => ({
      ...r,
      documents: documentsByVerif[r.id] || []
    }));

    res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Téléverser les justificatifs de manière sécurisée
 * Stockage hors répertoire public, validation stricte d'extension et de type MIME.
 */
exports.uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Aucun fichier transmis ou format de fichier non autorisé.' });
    }

    const { verification_id, doc_type, title, document_number } = req.body;

    if (!verification_id) {
      // Supprimer le fichier téléversé orphelin
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(400).json({ success: false, message: 'Le paramètre verification_id est obligatoire.' });
    }

    // Vérifier l'existence du dossier et les droits du demandeur
    const [verifs] = await pool.execute(
      'SELECT id, applicant_user_id, trust_status FROM trust_verifications WHERE id = ?',
      [verification_id]
    );

    if (verifs.length === 0) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(404).json({ success: false, message: 'Dossier de vérification introuvable.' });
    }

    const verif = verifs[0];
    const isOwnerOrAdmin = verif.applicant_user_id === req.user.id || req.user.role === 'admin';
    if (!isOwnerOrAdmin) {
      try { fs.unlinkSync(req.file.path); } catch {}
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à ajouter des pièces à ce dossier.' });
    }

    const docId = `doc_${crypto.randomUUID()}`;
    const safeTitle = title && typeof title === 'string' ? title.trim().slice(0, 255) : req.file.originalname;
    const safeDocNumber = document_number && typeof document_number === 'string' ? document_number.trim().slice(0, 100) : null;
    const safeDocType = doc_type || 'other';

    await pool.execute(
      `INSERT INTO trust_documents 
      (id, verification_id, doc_type, title, document_number, file_url, file_size, file_mime_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        docId,
        verification_id,
        safeDocType,
        safeTitle,
        safeDocNumber,
        req.file.filename, // Stocke uniquement le nom de fichier aléatoire sécurisé, pas le chemin complet
        `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
        req.file.mimetype
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Pièce justificative téléversée et sécurisée avec succès.',
      document: {
        id: docId,
        verification_id,
        doc_type: safeDocType,
        title: safeTitle,
        document_number: safeDocNumber,
        file_size: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
        file_mime_type: req.file.mimetype,
        status: 'pending',
        download_url: `/api/trust/documents/${docId}/secure-file`
      }
    });
  } catch (error) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    next(error);
  }
};

/**
 * 4. Consulter/Télécharger un justificatif sécurisé
 * ACCÈS STRICTEMENT RESTREINT : Seul l'administrateur ou le propriétaire du dossier peut y accéder.
 */
exports.serveDocumentFile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [docs] = await pool.execute(
      `SELECT d.*, v.applicant_user_id 
       FROM trust_documents d
       JOIN trust_verifications v ON d.verification_id = v.id
       WHERE d.id = ?`,
      [id]
    );

    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Document justificatif introuvable.' });
    }

    const doc = docs[0];
    const isOwnerOrAdmin = req.user && (doc.applicant_user_id === req.user.id || req.user.role === 'admin');

    if (!isOwnerOrAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Sécurité : Accès interdit. Seul l\'administrateur ou le propriétaire du dossier peut consulter cette pièce.'
      });
    }

    // Le fichier se trouve hors du répertoire public
    const filePath = path.join(UPLOADS_DIR, doc.file_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Fichier physique introuvable sur le serveur sécurisé.' });
    }

    res.setHeader('Content-Type', doc.file_mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.title || 'document')}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * 5. Consulter le statut public d'une annonce / agent / agence
 * RÈGLE STRICTE DE CONFIDENTIALITÉ & SÉCURITÉ :
 * Ne renvoie JAMAIS de documents d'identité, fichiers sensibles, notes internes ou données personnelles.
 * Ne renvoie un statut vérifié QUE s'il a été effectivement approuvé.
 */
exports.getPublicStatus = async (req, res, next) => {
  try {
    const { targetType, targetId } = req.params;

    if (!['property', 'agent', 'agency'].includes(targetType)) {
      return res.status(400).json({ success: false, message: 'Type de cible non reconnu.' });
    }

    let target = null;
    let availability = null;

    if (targetType === 'property') {
      const [rows] = await pool.execute(
        `SELECT id, title, trust_status, trust_level, trust_score, trust_verified_at, trust_expires_at, availability_confirmed_at 
         FROM properties WHERE id = ? LIMIT 1`,
        [targetId]
      );
      if (rows.length > 0) {
        target = rows[0];
        const [avail] = await pool.execute(
          'SELECT is_available, availability_status, last_confirmed_at, confirmation_method FROM trust_property_availability WHERE property_id = ? LIMIT 1',
          [targetId]
        );
        if (avail.length > 0) availability = avail[0];
      }
    } else if (targetType === 'agent') {
      const [rows] = await pool.execute(
        `SELECT id, name, trust_status, trust_level, trust_score, trust_verified_at, trust_expires_at 
         FROM agents WHERE id = ? LIMIT 1`,
        [targetId]
      );
      if (rows.length > 0) target = rows[0];
    } else if (targetType === 'agency') {
      const [rows] = await pool.execute(
        `SELECT id, name, trust_status, trust_level, trust_score, trust_verified_at, trust_expires_at 
         FROM agencies WHERE id = ? LIMIT 1`,
        [targetId]
      );
      if (rows.length > 0) target = rows[0];
    }

    if (!target) {
      return res.status(404).json({ success: false, message: 'Entité introuvable.' });
    }

    const currentStatus = target.trust_status || 'unverified';
    const isApproved = ['identity_verified', 'pro_verified', 'property_verified'].includes(currentStatus);

    // Définir les garanties publiques certifiées
    const publicGuarantees = isApproved ? [
      { id: 'cadastre', label: 'Titre Foncier & Cadastre RDC Vérifiés' },
      { id: 'physical_visit', label: 'Inspection Terrain Conforme à Kinshasa' },
      { id: 'identity', label: 'Mandat Légal & Identité Authentifiés' },
      { id: 'availability', label: 'Disponibilité Réelle Certifiée' }
    ] : [];

    // Réponse épurée (Zéro fuite de données personnelles ou de documents)
    res.json({
      success: true,
      data: {
        targetType,
        targetId,
        isVerified: isApproved,
        trustStatus: currentStatus,
        trustLevel: isApproved ? target.trust_level : null,
        trustScore: isApproved ? target.trust_score : 0,
        verifiedAt: isApproved ? target.trust_verified_at : null,
        expiresAt: isApproved ? target.trust_expires_at : null,
        availability: availability ? {
          isAvailable: Boolean(availability.is_available),
          status: availability.availability_status,
          confirmedAt: availability.last_confirmed_at
        } : null,
        guarantees: publicGuarantees
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 6. Examiner les demandes en tant qu'administrateur
 * Requiert le rôle 'admin'.
 */
exports.getAdminVerifications = async (req, res, next) => {
  try {
    const { target_type, status, search } = req.query;

    let query = `
      SELECT v.*,
        (SELECT COUNT(*) FROM trust_documents d WHERE d.verification_id = v.id) as documents_count,
        (SELECT COUNT(*) FROM trust_checks c WHERE c.verification_id = v.id) as checks_count
      FROM trust_verifications v
      WHERE 1=1
    `;
    const params = [];

    if (target_type) {
      query += ` AND v.target_type = ?`;
      params.push(target_type);
    }
    if (status) {
      query += ` AND v.trust_status = ?`;
      params.push(status);
    }
    if (search) {
      query += ` AND (v.target_name LIKE ? OR v.applicant_name LIKE ? OR v.applicant_email LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY v.created_at DESC`;

    const [rows] = await pool.execute(query, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 7. Consulter le détail d'un dossier en tant qu'administrateur
 */
exports.getAdminVerificationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [verifs] = await pool.execute('SELECT * FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }

    const verification = verifs[0];
    const [documents] = await pool.execute('SELECT * FROM trust_documents WHERE verification_id = ? ORDER BY created_at ASC', [id]);
    const [checks] = await pool.execute('SELECT * FROM trust_checks WHERE verification_id = ? ORDER BY conducted_at ASC', [id]);
    const [history] = await pool.execute(
      'SELECT * FROM trust_audit_logs WHERE verification_id = ? OR (target_type = ? AND target_id = ?) ORDER BY created_at DESC',
      [id, verification.target_type, verification.target_id]
    );

    let availability = null;
    if (verification.target_type === 'property') {
      const [avail] = await pool.execute('SELECT * FROM trust_property_availability WHERE property_id = ? LIMIT 1', [verification.target_id]);
      if (avail.length > 0) availability = avail[0];
    }

    res.json({
      success: true,
      data: {
        ...verification,
        documents: documents.map((d) => ({
          ...d,
          download_url: `/api/trust/documents/${d.id}/secure-file`
        })),
        checks,
        history,
        availability
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 8. Approuver une demande de vérification
 * RÈGLE DE SÉCURITÉ CRITIQUE :
 * Les utilisateurs ne peuvent JAMAIS approuver leurs propres demandes !
 */
exports.approveVerification = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { trust_level, trust_score = 95, expires_in_months = 12, admin_notes } = req.body;
    const admin = req.user;

    const [verifs] = await connection.execute('SELECT * FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }

    const verif = verifs[0];

    // PROTECTION CRITIQUE CONTRE L'AUTO-APPROBATION
    if (verif.applicant_user_id === admin.id) {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: 'Violation de sécurité : Un utilisateur ne peut JAMAIS approuver son propre dossier de vérification.'
      });
    }

    const prevStatus = verif.trust_status;
    let targetStatus = 'identity_verified';
    if (verif.target_type === 'property') targetStatus = 'property_verified';
    else if (verif.target_type === 'agent') targetStatus = 'pro_verified';

    const defaultLevel = verif.target_type === 'property'
      ? 'Bien Vérifié & Titre Foncier Contrôlé'
      : (verif.target_type === 'agent' ? 'Professionnel Certifié Kinimmo Trust' : 'Agence Certifiée Kinimmo Trust');

    const approvedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + Number(expires_in_months));

    // Mise à jour de la table trust_verifications
    await connection.execute(
      `UPDATE trust_verifications SET 
        trust_status = ?,
        trust_level = ?,
        trust_score = ?,
        reviewed_at = NOW(),
        approved_at = ?,
        expires_at = ?,
        admin_notes = ?,
        assigned_admin_id = ?,
        assigned_admin_name = ?
      WHERE id = ?`,
      [
        targetStatus,
        trust_level || defaultLevel,
        Number(trust_score),
        approvedAt,
        expiresAt,
        admin_notes || null,
        admin.id,
        admin.name,
        id
      ]
    );

    // Mise à jour de l'entité ciblée
    if (verif.target_type === 'property') {
      await connection.execute(
        `UPDATE properties SET trust_status = ?, trust_level = ?, trust_score = ?, trust_verified_at = ?, trust_expires_at = ? WHERE id = ?`,
        [targetStatus, trust_level || defaultLevel, Number(trust_score), approvedAt, expiresAt, verif.target_id]
      );
    } else if (verif.target_type === 'agent') {
      await connection.execute(
        `UPDATE agents SET trust_status = ?, trust_level = ?, trust_score = ?, trust_verified_at = ?, trust_expires_at = ?, is_verified = 1 WHERE id = ?`,
        [targetStatus, trust_level || defaultLevel, Number(trust_score), approvedAt, expiresAt, verif.target_id]
      );
    } else if (verif.target_type === 'agency') {
      await connection.execute(
        `UPDATE agencies SET trust_status = ?, trust_level = ?, trust_score = ?, trust_verified_at = ?, trust_expires_at = ?, is_verified = 1 WHERE id = ?`,
        [targetStatus, trust_level || defaultLevel, Number(trust_score), approvedAt, expiresAt, verif.target_id]
      );
    }

    // Journal d'audit protégé
    const auditId = `audit_${crypto.randomUUID()}`;
    await connection.execute(
      `INSERT INTO trust_audit_logs 
      (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, previous_status, new_status, reason_or_notes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'TRUST_GRANTED', ?, ?, ?, ?)`,
      [
        auditId,
        id,
        verif.target_type,
        verif.target_id,
        admin.id,
        admin.name,
        admin.email,
        prevStatus,
        targetStatus,
        admin_notes || 'Dossier validé après conformité des pièces.',
        req.ip || '127.0.0.1'
      ]
    );

    // Notification sécurisée envoyée au demandeur
    const notifId = `notif_${crypto.randomUUID()}`;
    await connection.execute(
      `INSERT INTO trust_notifications (id, user_id, title, message, type, target_type, target_id)
       VALUES (?, ?, 'Certification Kinimmo Trust Approuvée !', ?, 'trust_approved', ?, ?)`,
      [
        notifId,
        verif.applicant_user_id,
        `Votre demande pour "${verif.target_name}" a été validée avec succès. Le badge officiel Kinimmo Trust est actif.`,
        verif.target_type,
        verif.target_id
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Demande approuvée avec succès. Le badge officiel de confiance est actif.',
      data: {
        status: targetStatus,
        trust_level: trust_level || defaultLevel,
        trust_score: Number(trust_score),
        approved_at: approvedAt.toISOString(),
        expires_at: expiresAt.toISOString()
      }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * 9. Refuser une demande de vérification
 * Motif obligatoire + Catégorie de rejet.
 */
exports.rejectVerification = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { rejection_reason, rejection_category, admin_notes } = req.body;
    const admin = req.user;

    if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim().length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Le motif de refus (rejection_reason) est obligatoire.' });
    }

    const [verifs] = await connection.execute('SELECT * FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }

    const verif = verifs[0];
    const prevStatus = verif.trust_status;

    // Mise à jour de trust_verifications
    await connection.execute(
      `UPDATE trust_verifications SET 
        trust_status = 'rejected',
        reviewed_at = NOW(),
        rejection_reason = ?,
        rejection_category = ?,
        admin_notes = ?,
        assigned_admin_id = ?,
        assigned_admin_name = ?
      WHERE id = ?`,
      [
        rejection_reason.trim(),
        rejection_category || 'Pièce Non Conforme',
        admin_notes || null,
        admin.id,
        admin.name,
        id
      ]
    );

    // Rétrograder le statut de l'entité
    if (verif.target_type === 'property') {
      await connection.execute('UPDATE properties SET trust_status = "rejected", trust_score = 0 WHERE id = ?', [verif.target_id]);
    } else if (verif.target_type === 'agent') {
      await connection.execute('UPDATE agents SET trust_status = "rejected", trust_score = 0, is_verified = 0 WHERE id = ?', [verif.target_id]);
    } else if (verif.target_type === 'agency') {
      await connection.execute('UPDATE agencies SET trust_status = "rejected", trust_score = 0, is_verified = 0 WHERE id = ?', [verif.target_id]);
    }

    // Journal d'audit
    const auditId = `audit_${crypto.randomUUID()}`;
    await connection.execute(
      `INSERT INTO trust_audit_logs 
      (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, previous_status, new_status, reason_or_notes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'TRUST_REJECTED', ?, 'rejected', ?, ?)`,
      [
        auditId,
        id,
        verif.target_type,
        verif.target_id,
        admin.id,
        admin.name,
        admin.email,
        prevStatus,
        `Motif : ${rejection_reason.trim()}`,
        req.ip || '127.0.0.1'
      ]
    );

    // Notification utilisateur
    const notifId = `notif_${crypto.randomUUID()}`;
    await connection.execute(
      `INSERT INTO trust_notifications (id, user_id, title, message, type, target_type, target_id)
       VALUES (?, ?, 'Mise à jour concernant votre dossier Kinimmo Trust', ?, 'trust_rejected', ?, ?)`,
      [
        notifId,
        verif.applicant_user_id,
        `Votre dossier pour "${verif.target_name}" n'a pas pu être validé. Motif : ${rejection_reason.trim()}. Vous pouvez soumettre des pièces rectificatives.`,
        verif.target_type,
        verif.target_id
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Demande refusée. Le motif a été consigné et notifié au demandeur.',
      rejection_reason: rejection_reason.trim()
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * 10. Suspendre une vérification
 * En cas de signalement, contestation foncière ou litige.
 */
exports.suspendVerification = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { suspension_reason } = req.body;
    const admin = req.user;

    if (!suspension_reason || typeof suspension_reason !== 'string' || suspension_reason.trim().length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Le motif de suspension (suspension_reason) est obligatoire.' });
    }

    const [verifs] = await connection.execute('SELECT * FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }

    const verif = verifs[0];
    const prevStatus = verif.trust_status;

    await connection.execute(
      `UPDATE trust_verifications SET 
        trust_status = 'suspended',
        suspension_reason = ?,
        reviewed_at = NOW(),
        assigned_admin_id = ?,
        assigned_admin_name = ?
      WHERE id = ?`,
      [suspension_reason.trim(), admin.id, admin.name, id]
    );

    // Mettre à jour l'entité
    if (verif.target_type === 'property') {
      await connection.execute('UPDATE properties SET trust_status = "suspended" WHERE id = ?', [verif.target_id]);
    } else if (verif.target_type === 'agent') {
      await connection.execute('UPDATE agents SET trust_status = "suspended" WHERE id = ?', [verif.target_id]);
    } else if (verif.target_type === 'agency') {
      await connection.execute('UPDATE agencies SET trust_status = "suspended" WHERE id = ?', [verif.target_id]);
    }

    // Journal d'audit
    const auditId = `audit_${crypto.randomUUID()}`;
    await connection.execute(
      `INSERT INTO trust_audit_logs 
      (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, previous_status, new_status, reason_or_notes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'TRUST_SUSPENDED', ?, 'suspended', ?, ?)`,
      [
        auditId,
        id,
        verif.target_type,
        verif.target_id,
        admin.id,
        admin.name,
        admin.email,
        prevStatus,
        suspension_reason.trim(),
        req.ip || '127.0.0.1'
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Vérification suspendue avec succès. Le badge public est désactivé.',
      suspension_reason: suspension_reason.trim()
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * 11. Renouveler une vérification
 * Prolonge la validité (+12 mois par défaut).
 */
exports.renewVerification = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { additional_months = 12, new_score = 98 } = req.body;
    const admin = req.user;

    const [verifs] = await connection.execute('SELECT * FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }

    const verif = verifs[0];
    const prevStatus = verif.trust_status;

    let targetStatus = 'identity_verified';
    if (verif.target_type === 'property') targetStatus = 'property_verified';
    else if (verif.target_type === 'agent') targetStatus = 'pro_verified';

    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + Number(additional_months));

    await connection.execute(
      `UPDATE trust_verifications SET 
        trust_status = ?,
        trust_score = ?,
        expires_at = ?,
        reviewed_at = NOW(),
        assigned_admin_id = ?,
        assigned_admin_name = ?
      WHERE id = ?`,
      [targetStatus, Number(new_score), newExpiry, admin.id, admin.name, id]
    );

    if (verif.target_type === 'property') {
      await connection.execute('UPDATE properties SET trust_status = ?, trust_score = ?, trust_expires_at = ? WHERE id = ?', [targetStatus, Number(new_score), newExpiry, verif.target_id]);
    } else if (verif.target_type === 'agent') {
      await connection.execute('UPDATE agents SET trust_status = ?, trust_score = ?, trust_expires_at = ? WHERE id = ?', [targetStatus, Number(new_score), newExpiry, verif.target_id]);
    } else if (verif.target_type === 'agency') {
      await connection.execute('UPDATE agencies SET trust_status = ?, trust_score = ?, trust_expires_at = ? WHERE id = ?', [targetStatus, Number(new_score), newExpiry, verif.target_id]);
    }

    // Journal d'audit
    const auditId = `audit_${crypto.randomUUID()}`;
    await connection.execute(
      `INSERT INTO trust_audit_logs 
      (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, previous_status, new_status, reason_or_notes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'TRUST_RENEWED', ?, ?, ?, ?)`,
      [
        auditId,
        id,
        verif.target_type,
        verif.target_id,
        admin.id,
        admin.name,
        admin.email,
        prevStatus,
        targetStatus,
        `Renouvellement pour ${additional_months} mois. Nouvelle échéance : ${newExpiry.toLocaleDateString('fr-FR')}`,
        req.ip || '127.0.0.1'
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Vérification renouvelée jusqu'au ${newExpiry.toLocaleDateString('fr-FR')}.`,
      expires_at: newExpiry.toISOString()
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * 12. Consulter l'historique des décisions d'un dossier
 */
exports.getVerificationHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [verifs] = await pool.execute('SELECT applicant_user_id, target_type, target_id FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }

    const verif = verifs[0];
    const isOwnerOrAdmin = req.user.role === 'admin' || verif.applicant_user_id === req.user.id;
    if (!isOwnerOrAdmin) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé à l\'historique de ce dossier.' });
    }

    const [logs] = await pool.execute(
      `SELECT id, action, previous_status, new_status, reason_or_notes, created_at, admin_name 
       FROM trust_audit_logs 
       WHERE verification_id = ? OR (target_type = ? AND target_id = ?) 
       ORDER BY created_at DESC`,
      [id, verif.target_type, verif.target_id]
    );

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 13. Consulter le journal d'audit protégé des administrateurs
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const [logs] = await pool.execute(
      'SELECT * FROM trust_audit_logs ORDER BY created_at DESC LIMIT 150'
    );

    res.json({
      success: true,
      count: logs.length,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 14. Route unifiée GET /api/trust/verifications (Admin = tout, Utilisateur = ses propres dossiers)
 */
exports.getVerifications = async (req, res, next) => {
  try {
    const { target_type, status, applicant_id, search } = req.query;
    const isAdmin = req.user.role === 'admin';

    let query = `
      SELECT v.*,
        (SELECT COUNT(*) FROM trust_documents d WHERE d.verification_id = v.id) as documents_count,
        (SELECT COUNT(*) FROM trust_checks c WHERE c.verification_id = v.id) as checks_count
      FROM trust_verifications v
      WHERE 1=1
    `;
    const params = [];

    if (!isAdmin) {
      query += ' AND v.applicant_user_id = ?';
      params.push(req.user.id);
    } else if (applicant_id) {
      query += ' AND v.applicant_user_id = ?';
      params.push(applicant_id);
    }

    if (target_type) {
      query += ' AND v.target_type = ?';
      params.push(target_type);
    }
    if (status) {
      query += ' AND v.trust_status = ?';
      params.push(status);
    }
    if (search) {
      query += ' AND (v.target_name LIKE ? OR v.applicant_name LIKE ? OR v.applicant_email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY v.created_at DESC';
    const [rows] = await pool.execute(query, params);

    const verifIds = rows.map(r => r.id);
    const docsByVerif = {};
    const checksByVerif = {};

    if (verifIds.length > 0) {
      const placeholders = verifIds.map(() => '?').join(',');
      const [docs] = await pool.query(
        `SELECT * FROM trust_documents WHERE verification_id IN (${placeholders}) ORDER BY created_at ASC`,
        verifIds
      );
      docs.forEach(d => {
        if (!docsByVerif[d.verification_id]) docsByVerif[d.verification_id] = [];
        docsByVerif[d.verification_id].push({
          ...d,
          download_url: `/api/trust/documents/${d.id}/secure-file`
        });
      });

      const [checks] = await pool.query(
        `SELECT * FROM trust_checks WHERE verification_id IN (${placeholders}) ORDER BY conducted_at ASC`,
        verifIds
      );
      checks.forEach(c => {
        if (!checksByVerif[c.verification_id]) checksByVerif[c.verification_id] = [];
        checksByVerif[c.verification_id].push(c);
      });
    }

    const enriched = rows.map(r => ({
      ...r,
      status: r.trust_status,
      trustStatus: r.trust_status,
      targetType: r.target_type,
      targetId: r.target_id,
      targetName: r.target_name,
      target_title: r.target_name,
      trustScore: r.trust_score,
      score: r.trust_score,
      documents: docsByVerif[r.id] || [],
      checks: checksByVerif[r.id] || []
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    next(error);
  }
};

/**
 * 15. Route unifiée GET /api/trust/verifications/:id (Admin ou propriétaire du dossier)
 */
exports.getVerificationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [verifs] = await pool.execute('SELECT * FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }
    const verif = verifs[0];
    if (req.user.role !== 'admin' && verif.applicant_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Accès refusé à ce dossier.' });
    }
    return exports.getAdminVerificationById(req, res, next);
  } catch (error) {
    next(error);
  }
};

/**
 * 16. Route unifiée PUT/POST /api/trust/verifications/:id/status (Admin uniquement)
 */
exports.updateVerificationStatus = async (req, res, next) => {
  const { status } = req.body;
  if (['identity_verified', 'pro_verified', 'property_verified'].includes(status)) {
    return exports.approveVerification(req, res, next);
  }
  if (status === 'rejected') {
    if (!req.body.rejection_reason && req.body.admin_notes) {
      req.body.rejection_reason = req.body.admin_notes;
    }
    return exports.rejectVerification(req, res, next);
  }
  if (status === 'suspended') {
    if (!req.body.suspension_reason && req.body.admin_notes) {
      req.body.suspension_reason = req.body.admin_notes;
    }
    return exports.suspendVerification(req, res, next);
  }

  const allowedMidStatuses = ['unverified', 'pending', 'in_progress', 'expired'];
  if (!allowedMidStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: `Statut Trust invalide : "${status}".` });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { admin_notes, trust_score } = req.body;
    const admin = req.user;

    const [verifs] = await connection.execute('SELECT * FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }
    const verif = verifs[0];
    const prevStatus = verif.trust_status;

    await connection.execute(
      `UPDATE trust_verifications SET 
        trust_status = ?,
        trust_score = COALESCE(?, trust_score),
        admin_notes = COALESCE(?, admin_notes),
        reviewed_at = NOW(),
        assigned_admin_id = ?,
        assigned_admin_name = ?
      WHERE id = ?`,
      [status, trust_score !== undefined ? Number(trust_score) : null, admin_notes || null, admin.id, admin.name, id]
    );

    try {
      if (verif.target_type === 'property') {
        await connection.execute('UPDATE properties SET trust_status = ? WHERE id = ?', [status, verif.target_id]);
      } else if (verif.target_type === 'agent') {
        await connection.execute('UPDATE agents SET trust_status = ? WHERE id = ?', [status, verif.target_id]);
      } else if (verif.target_type === 'agency') {
        await connection.execute('UPDATE agencies SET trust_status = ? WHERE id = ?', [status, verif.target_id]);
      }
    } catch {}

    await connection.execute(
      `INSERT INTO trust_audit_logs 
      (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, previous_status, new_status, reason_or_notes, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'STATUS_UPDATED', ?, ?, ?, ?)`,
      [
        `audit_${crypto.randomUUID()}`,
        id,
        verif.target_type,
        verif.target_id,
        admin.id,
        admin.name,
        admin.email,
        prevStatus,
        status,
        admin_notes || `Statut modifié vers ${status}`,
        req.ip || '127.0.0.1'
      ]
    );

    await connection.commit();
    res.json({ success: true, message: `Statut mis à jour vers "${status}".`, data: { id, trust_status: status } });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * 17. Ajouter un contrôle d'audit (Admin)
 * POST /api/trust/verifications/:id/checks
 */
exports.addCheck = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { check_type, check_label, result = 'passed', evidence_notes } = req.body;
    const admin = req.user;

    const [verifs] = await pool.execute('SELECT id, target_type, target_id FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }
    const verif = verifs[0];

    const safeCheckType = VALID_CHECK_TYPES.includes(check_type) ? check_type : 'identity_validation';
    const safeResult = ['passed', 'failed', 'pending', 'waived'].includes(result) ? result : 'pending';
    const checkId = `chk_${crypto.randomUUID()}`;

    await pool.execute(
      `INSERT INTO trust_checks 
        (id, verification_id, check_type, check_label, result, evidence_notes, conducted_by_user_id, conducted_by_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        checkId,
        id,
        safeCheckType,
        String(check_label || safeCheckType).trim().slice(0, 255),
        safeResult,
        evidence_notes || null,
        admin.id,
        admin.name
      ]
    );

    await pool.execute(
      `INSERT INTO trust_audit_logs 
        (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, reason_or_notes, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CHECK_RECORDED', ?, ?)`,
      [
        `audit_${crypto.randomUUID()}`,
        id,
        verif.target_type,
        verif.target_id,
        admin.id,
        admin.name,
        admin.email,
        `Contrôle "${check_label || safeCheckType}" -> ${safeResult}`,
        req.ip || '127.0.0.1'
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Contrôle d\'audit enregistré avec succès.',
      data: { id: checkId, verification_id: id, check_type: safeCheckType, check_label, result: safeResult, evidence_notes }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 18. Demander des pièces/informations complémentaires (Admin)
 * POST /api/trust/verifications/:id/request-info
 */
exports.requestMoreInfo = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { id } = req.params;
    const { message, requested_fields } = req.body;
    const admin = req.user;

    if (!message || String(message).trim().length === 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'Veuillez préciser les compléments attendus.' });
    }

    const [verifs] = await connection.execute('SELECT * FROM trust_verifications WHERE id = ?', [id]);
    if (verifs.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Dossier introuvable.' });
    }
    const verif = verifs[0];

    await connection.execute(
      `UPDATE trust_verifications SET trust_status = 'in_progress', admin_notes = ?, reviewed_at = NOW(), assigned_admin_id = ?, assigned_admin_name = ? WHERE id = ?`,
      [String(message).trim(), admin.id, admin.name, id]
    );

    await connection.execute(
      `INSERT INTO trust_audit_logs 
        (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, previous_status, new_status, reason_or_notes, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'INFO_REQUESTED', ?, 'in_progress', ?, ?)`,
      [
        `audit_${crypto.randomUUID()}`,
        id,
        verif.target_type,
        verif.target_id,
        admin.id,
        admin.name,
        admin.email,
        verif.trust_status,
        `${String(message).trim()}${Array.isArray(requested_fields) && requested_fields.length ? ` (${requested_fields.join(', ')})` : ''}`,
        req.ip || '127.0.0.1'
      ]
    );

    await connection.execute(
      `INSERT INTO trust_notifications (id, user_id, title, message, type, target_type, target_id)
       VALUES (?, ?, 'Complément demandé - Kinimmo Trust', ?, 'doc_required', ?, ?)`,
      [`notif_${crypto.randomUUID()}`, verif.applicant_user_id, String(message).trim(), verif.target_type, verif.target_id]
    );

    await connection.commit();
    res.json({ success: true, message: 'Demande de complément transmise au demandeur.' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * 19. Valider ou rejeter une pièce justificative (Admin)
 * PUT /api/trust/documents/:id/status
 */
exports.updateDocumentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, rejection_note } = req.body;
    const admin = req.user;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Statut de document invalide.' });
    }

    const [docs] = await pool.execute('SELECT * FROM trust_documents WHERE id = ?', [id]);
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }
    const doc = docs[0];

    await pool.execute(
      `UPDATE trust_documents SET 
        status = ?, rejection_note = ?, verified_by_user_id = ?, verified_by_name = ?, verified_at = NOW()
       WHERE id = ?`,
      [status, rejection_note || null, admin.id, admin.name, id]
    );

    await pool.execute(
      `INSERT INTO trust_audit_logs 
        (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, reason_or_notes, ip_address)
       VALUES (?, ?, 'system', ?, ?, ?, ?, 'DOCUMENT_REVIEWED', ?, ?)`,
      [
        `audit_${crypto.randomUUID()}`,
        doc.verification_id,
        id,
        admin.id,
        admin.name,
        admin.email,
        `Pièce "${doc.title}" -> ${status}${rejection_note ? ` (${rejection_note})` : ''}`,
        req.ip || '127.0.0.1'
      ]
    );

    res.json({ success: true, message: `Pièce justificative marquée "${status}".` });
  } catch (error) {
    next(error);
  }
};

/**
 * 20. Journaliser la consultation d'un justificatif sécurisé
 * POST /api/trust/documents/:id/access-log
 */
exports.logDocumentAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verification_id, document_title } = req.body || {};

    const [docs] = await pool.execute(
      `SELECT d.id, d.verification_id, d.title, v.applicant_user_id, v.target_type, v.target_id
       FROM trust_documents d
       JOIN trust_verifications v ON d.verification_id = v.id
       WHERE d.id = ? LIMIT 1`,
      [id]
    );
    if (docs.length === 0) {
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }
    const doc = docs[0];
    if (req.user.role !== 'admin' && doc.applicant_user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Accès interdit.' });
    }

    await pool.execute(
      `INSERT INTO trust_audit_logs 
        (id, verification_id, target_type, target_id, admin_user_id, admin_name, admin_email, action, reason_or_notes, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'DOCUMENT_VIEWED', ?, ?)`,
      [
        `audit_${crypto.randomUUID()}`,
        verification_id || doc.verification_id,
        doc.target_type || 'system',
        doc.target_id || id,
        req.user.id,
        req.user.name || 'Utilisateur',
        req.user.email || '',
        `Consultation du document "${document_title || doc.title}" (${id})`,
        req.ip || '127.0.0.1'
      ]
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

/**
 * 21. Confirmer la disponibilité réelle d'un bien
 * POST /api/trust/availability/:propertyId
 */
exports.confirmAvailability = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { availability_status = 'available', confirmation_method = 'agent_statement', notes } = req.body;

    const [props] = await pool.execute('SELECT id, title, agent_id, agency_id FROM properties WHERE id = ? LIMIT 1', [propertyId]);
    if (props.length === 0) {
      return res.status(404).json({ success: false, message: 'Propriété introuvable.' });
    }
    const prop = props[0];

    const isAllowed =
      req.user.role === 'admin' ||
      prop.agent_id === req.user.id ||
      (req.user.agency_id && prop.agency_id === req.user.agency_id && req.user.role === 'agency');

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: 'Non autorisé à confirmer la disponibilité de ce bien.' });
    }

    const validStatuses = ['available', 'under_option', 'reserved', 'rented', 'sold', 'withdrawn'];
    const safeStatus = validStatuses.includes(availability_status) ? availability_status : 'available';
    const validMethods = ['agent_statement', 'physical_visit', 'admin_audit', 'client_feedback'];
    const safeMethod = validMethods.includes(confirmation_method) ? confirmation_method : 'agent_statement';
    const isAvailable = safeStatus === 'available' || safeStatus === 'under_option' ? 1 : 0;

    const availId = `avail_${crypto.randomUUID()}`;
    await pool.execute(
      `INSERT INTO trust_property_availability
        (id, property_id, property_title, is_available, availability_status, last_confirmed_at, last_confirmed_by_id, last_confirmed_by_name, confirmation_method, notes)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        is_available = VALUES(is_available),
        availability_status = VALUES(availability_status),
        last_confirmed_at = NOW(),
        last_confirmed_by_id = VALUES(last_confirmed_by_id),
        last_confirmed_by_name = VALUES(last_confirmed_by_name),
        confirmation_method = VALUES(confirmation_method),
        notes = VALUES(notes)`,
      [availId, propertyId, prop.title, isAvailable, safeStatus, req.user.id, req.user.name || 'Agent', safeMethod, notes || null]
    );

    try {
      await pool.execute('UPDATE properties SET availability_confirmed_at = NOW() WHERE id = ?', [propertyId]);
    } catch {}

    res.json({
      success: true,
      message: 'Disponibilité réelle confirmée.',
      data: {
        property_id: propertyId,
        is_available: Boolean(isAvailable),
        availability_status: safeStatus,
        last_confirmed_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 22. Récupérer les notifications Kinimmo Trust de l'utilisateur
 * GET /api/trust/notifications
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM trust_notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

/**
 * 23. Marquer une notification comme lue
 * PUT /api/trust/notifications/:id/read
 */
exports.markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    await pool.execute(
      'UPDATE trust_notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};
