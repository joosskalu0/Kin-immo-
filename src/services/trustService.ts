// Service API Frontend Kinimmo Trust
import {
  TrustVerification,
  TrustStatus,
  TrustDocument,
  TrustCheck,
  TrustAuditLog,
  TrustPropertyAvailability,
  TrustNotification,
  AvailabilityStatus
} from '../types/trust';

const API_BASE = '/api/trust';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  // Priorité à la session admin connectée
  const adminSession = localStorage.getItem('kinimmo_admin_session');
  if (adminSession) {
    try {
      const base64Token = btoa(unescape(encodeURIComponent(adminSession)));
      headers['Authorization'] = `Bearer ${base64Token}`;
      return headers;
    } catch {}
  }

  const token = localStorage.getItem('kinimmo_auth_token') || localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}


export const trustService = {
  // 1. Obtenir le badge de confiance public
  async getBadge(targetType: 'agent' | 'agency' | 'property', targetId: string) {
    try {
      const res = await fetch(`${API_BASE}/badge/${targetType}/${targetId}`);
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    } catch {
      return null;
    }
  },

  // 2. Obtenir tous les dossiers de vérification (pour admin ou demandeur)
  async getVerifications(filters?: { target_type?: string; status?: string; applicant_id?: string }): Promise<TrustVerification[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.target_type) params.append('target_type', filters.target_type);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.applicant_id) params.append('applicant_id', filters.applicant_id);

      const res = await fetch(`${API_BASE}/verifications?${params.toString()}`, {
        headers: getHeaders()
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // 3. Détail d'un dossier
  async getVerificationById(id: string): Promise<TrustVerification | null> {
    try {
      const res = await fetch(`${API_BASE}/verifications/${id}`, {
        headers: getHeaders()
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch {
      return null;
    }
  },

  // 4. Déposer une demande de vérification
  async submitApplication(data: {
    target_type: 'agent' | 'agency' | 'property';
    target_id: string;
    target_name: string;
    applicant_phone?: string;
    documents: Array<{
      doc_type: string;
      title: string;
      document_number?: string;
      file_url: string;
      file_size?: string;
      file_mime_type?: string;
    }>;
  }) {
    const res = await fetch(`${API_BASE}/apply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 5. Décision administrative sur un dossier
  async updateStatus(
    id: string,
    decision: {
      status: TrustStatus;
      trust_level?: string;
      trust_score?: number;
      rejection_reason?: string;
      rejection_category?: string;
      suspension_reason?: string;
      admin_notes?: string;
      expires_in_months?: number;
    }
  ) {
    const res = await fetch(`${API_BASE}/verifications/${id}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(decision)
    });
    return res.json();
  },

  // 6. Ajouter un contrôle d'audit administratif
  async addCheck(
    verificationId: string,
    check: {
      check_type: string;
      check_label: string;
      result: 'passed' | 'failed' | 'pending' | 'waived';
      evidence_notes?: string;
    }
  ) {
    const res = await fetch(`${API_BASE}/verifications/${verificationId}/checks`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(check)
    });
    return res.json();
  },

  // 7. Valider ou refuser une pièce justificative
  async updateDocumentStatus(documentId: string, status: 'approved' | 'rejected', rejectionNote?: string) {
    const res = await fetch(`${API_BASE}/documents/${documentId}/status`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status, rejection_note: rejectionNote })
    });
    return res.json();
  },

  // 8. Confirmer la disponibilité d'un bien
  async confirmAvailability(
    propertyId: string,
    data: {
      availability_status: AvailabilityStatus;
      confirmation_method?: string;
      notes?: string;
    }
  ) {
    const res = await fetch(`${API_BASE}/availability/${propertyId}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // 8b. Demander des informations complémentaires (Admin)
  async requestMoreInfo(verificationId: string, data: { message: string; requested_fields?: string[] }) {
    const res = await fetch(`${API_BASE}/verifications/${verificationId}/request-info`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },


  // 8c. Consigner l'accès et la consultation d'un justificatif sécurisé
  async logDocumentAccess(documentId: string, verificationId: string, documentTitle: string) {
    try {
      const res = await fetch(`${API_BASE}/documents/${documentId}/access-log`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ verification_id: verificationId, document_title: documentTitle })
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  },

  // 9. Journal d'audit des administrateurs
  async getAuditLogs(): Promise<TrustAuditLog[]> {
    try {
      const res = await fetch(`${API_BASE}/audit-logs`, {
        headers: getHeaders()
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // 10. Notifications Kinimmo Trust
  async getNotifications(): Promise<TrustNotification[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: getHeaders()
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async markNotificationRead(id: string) {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: getHeaders()
      });
    } catch {}
  }
};
