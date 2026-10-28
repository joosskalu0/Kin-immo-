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
      applicant_phone
    } = req.body;

    const applicant_user_id = req.user.id;
    const applicant_name = req.user.name || 'Demandeur Kinimmo';
    const applicant_email = req.user.email || '';
    const phone = applicant_phone || req.user.phone || null;

    // Validation des champs
    if (!target_type || !['agent', 'agency', 'property'].includes(target_type)) {
      return res.status(400).json({ success: false, message: 'Le paramètre target_type est invalide (doit être "agent", "agency" ou "property").' });
    }
    if (!target_id || typeof target_id !== 'string' || target_id.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Identifiant cible (target_id) obligatoire.' });
    }
    if (!target_name || typeof target_name !== 'string' || target_name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Nom de la cible (target_name) obligatoire.' });
    }

    // Vérification de propriété : l'utilisateur a-t-il le droit de demander pour cette cible ?
    if (target_type === 'property') {
      const [props] = await connection.execute('SELECT id, user_id, agent_id FROM properties WHERE id = ?', [target_id]);
      if (props.length === 0) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'L\'annonce immobilière ciblée est introuvable.' });
      }
      const prop = props[0];
      const isOwner = prop.user_id === applicant_user_id || prop.agent_id === applicant_user_id || req.user.role === 'admin';
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

    // Mettre à jour l'entité cible en statut 'pending'
    if (target_type === 'property') {
      await connection.execute('UPDATE properties SET trust_status = "pending", trust_score = 25 WHERE id = ?', [target_id]);
    } else if (target_type === 'agent') {
      await connection.execute('UPDATE agents SET trust_status = "pending", trust_score = 25 WHERE id = ?', [target_id]);
    } else if (target_type === 'agency') {
      await connection.execute('UPDATE agencies SET trust_status = "pending", trust_score = 25 WHERE id = ?', [target_id]);
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
