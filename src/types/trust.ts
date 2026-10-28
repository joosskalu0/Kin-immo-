// Types officiels Kinimmo Trust : Système de Vérification et de Confiance Immobilière
// Conforme au schéma MySQL Hostinger et aux spécifications métier Kinimmo

export type TrustStatus =
  | 'unverified'          // non vérifié
  | 'pending'             // vérification en attente
  | 'in_progress'         // vérification en cours
  | 'identity_verified'   // identité vérifiée
  | 'pro_verified'        // professionnel vérifié
  | 'property_verified'   // bien vérifié
  | 'rejected'            // vérification refusée
  | 'expired'             // vérification expirée
  | 'suspended';          // vérification suspendue

export type TrustTargetType = 'agent' | 'agency' | 'property';

export type TrustDocumentType =
  | 'cni'
  | 'passport'
  | 'voter_card'
  | 'rccm'
  | 'id_nat'
  | 'nif'
  | 'certificat_enregistrement'
  | 'livret_logeur'
  | 'acte_vente'
  | 'mandat_exclusif'
  | 'mandat_simple'
  | 'attestation_localisation'
  | 'other';

export type TrustCheckType =
  | 'identity_validation'
  | 'rccm_guichet_unique'
  | 'cadastre_conservation_titres'
  | 'physical_site_inspection'
  | 'phone_video_interview';

export type TrustCheckResult = 'passed' | 'failed' | 'pending' | 'waived';

export type AvailabilityStatus =
  | 'available'      // Disponible
  | 'under_option'  // Sous option
  | 'reserved'      // Réservé
  | 'rented'        // Loué
  | 'sold'          // Vendu
  | 'withdrawn';     // Retiré du marché

export type AvailabilityConfirmMethod =
  | 'agent_statement'
  | 'physical_visit'
  | 'admin_audit'
  | 'client_feedback';

export interface TrustDocument {
  id: string;
  verificationId?: string;
  verification_id?: string;
  docType: TrustDocumentType;
  doc_type?: TrustDocumentType;
  title: string;
  documentNumber?: string;
  document_number?: string;
  fileUrl: string;
  file_url?: string;
  fileSize?: string;
  file_size?: string;
  fileMimeType?: string;
  file_mime_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionNote?: string;
  rejection_note?: string;
  verifiedByUserId?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  verified_at?: string;
  createdAt: string;
  created_at?: string;
}

export interface TrustCheck {
  id: string;
  verificationId?: string;
  verification_id?: string;
  checkType: TrustCheckType;
  check_type?: TrustCheckType;
  checkLabel: string;
  check_label?: string;
  result: TrustCheckResult;
  notes?: string;
  evidenceNotes?: string;
  evidence_notes?: string;
  conductedByUserId?: string;
  conductedByName?: string;
  audited_by_name?: string;
  conductedAt?: string;
  createdAt: string;
  created_at?: string;
}

export interface TrustAuditLog {
  id: string;
  verificationId?: string;
  verification_id?: string;
  targetType: TrustTargetType | 'system';
  target_type?: TrustTargetType | 'system';
  targetId: string;
  target_id?: string;
  adminUserId?: string;
  admin_user_id?: string;
  adminName?: string;
  admin_name?: string;
  adminEmail?: string;
  admin_email?: string;
  action: string;
  previousStatus?: string;
  previous_status?: string;
  newStatus?: string;
  new_status?: string;
  reasonOrNotes?: string;
  reason_or_notes?: string;
  rejection_category?: string;
  ipAddress?: string;
  ip_address?: string;
  createdAt: string;
  created_at?: string;
}

export interface TrustPropertyAvailability {
  id: string;
  propertyId: string;
  property_id?: string;
  propertyTitle: string;
  property_title?: string;
  isAvailable: boolean;
  is_available?: boolean;
  availabilityStatus: AvailabilityStatus;
  availability_status?: AvailabilityStatus;
  lastConfirmedAt: string;
  last_confirmed_at?: string;
  lastConfirmedById?: string;
  last_confirmed_by_id?: string;
  lastConfirmedByName?: string;
  last_confirmed_by_name?: string;
  confirmationMethod: AvailabilityConfirmMethod;
  confirmation_method?: AvailabilityConfirmMethod;
  nextVerificationDue?: string;
  next_verification_due?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrustNotification {
  id: string;
  userId: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'trust_approved' | 'trust_rejected' | 'trust_suspended' | 'trust_expiring' | 'availability_update' | 'doc_required';
  targetType?: TrustTargetType;
  target_type?: TrustTargetType;
  targetId?: string;
  target_id?: string;
  isRead: boolean;
  is_read?: boolean;
  createdAt: string;
  created_at?: string;
}

export interface TrustVerification {
  id: string;
  verification_number?: string;
  targetType: TrustTargetType;
  target_type?: TrustTargetType;
  targetId: string;
  target_id?: string;
  targetName: string;
  target_title?: string;
  applicantUserId?: string;
  applicant_user_id?: string;
  applicantName?: string;
  applicant_name?: string;
  applicantEmail?: string;
  applicant_email?: string;
  applicantPhone?: string;
  applicant_phone?: string;
  trustStatus: TrustStatus;
  status?: TrustStatus;
  trust_status?: TrustStatus;
  trustLevel?: string;
  trust_level?: string;
  trustScore: number;
  score?: number;
  trust_score?: number;
  submittedAt?: string;
  submitted_at?: string;
  assignedAdminId?: string;
  assigned_admin_id?: string;
  assignedAdminName?: string;
  assigned_admin_name?: string;
  reviewedAt?: string;
  reviewed_at?: string;
  approvedAt?: string;
  approved_at?: string;
  verified_at?: string;
  expiresAt?: string;
  expires_at?: string;
  rejectionReason?: string;
  rejection_reason?: string;
  rejectionCategory?: string;
  rejection_category?: string;
  suspensionReason?: string;
  suspension_reason?: string;
  adminNotes?: string;
  admin_notes?: string;
  documents?: TrustDocument[];
  checks?: TrustCheck[];
  availability?: TrustPropertyAvailability;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}


export const TRUST_STATUS_LABELS: Record<TrustStatus, { label: string; color: string; badgeText: string; isApproved: boolean }> = {
  unverified: {
    label: 'Non vérifié',
    color: 'text-slate-400 bg-slate-800/60 border-slate-700',
    badgeText: 'Non vérifié',
    isApproved: false
  },
  pending: {
    label: 'Vérification en attente',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    badgeText: 'En attente d’audit',
    isApproved: false
  },
  in_progress: {
    label: 'Vérification en cours',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    badgeText: 'Audit en cours',
    isApproved: false
  },
  identity_verified: {
    label: 'Identité vérifiée',
    color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/40',
    badgeText: 'Identité Certifiée',
    isApproved: true
  },
  pro_verified: {
    label: 'Professionnel vérifié',
    color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40',
    badgeText: 'Pro Certifié Kinimmo Trust',
    isApproved: true
  },
  property_verified: {
    label: 'Bien vérifié',
    color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50',
    badgeText: 'Bien Vérifié & Titre Contrôlé',
    isApproved: true
  },
  rejected: {
    label: 'Vérification refusée',
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    badgeText: 'Non conforme',
    isApproved: false
  },
  expired: {
    label: 'Vérification expirée',
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    badgeText: 'Certification expirée',
    isApproved: false
  },
  suspended: {
    label: 'Vérification suspendue',
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    badgeText: 'Audit suspendu',
    isApproved: false
  }
};

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, { label: string; color: string }> = {
  available: { label: 'Disponible', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  under_option: { label: 'Sous option', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  reserved: { label: 'Réservé', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  rented: { label: 'Loué', color: 'text-slate-400 bg-slate-800 border-slate-700' },
  sold: { label: 'Vendu', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  withdrawn: { label: 'Retiré', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' }
};
