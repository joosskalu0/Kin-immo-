import { ConciergeRequest, ConciergerieRequest, ConciergeRequestStatus, PropertyVisitRecord } from '../types';
import { validateConciergerieRequest } from '../utils/conciergerieValidation';
import { findMatchingProperties, PropertyMatchResult } from '../utils/propertyMatching';
import { initialProperties } from '../data/mockData';
import { db } from '../lib/firebase';
import { collection, doc, setDoc, getDocs, query, orderBy, where, deleteDoc, updateDoc } from 'firebase/firestore';

export interface SubmitConciergerieResponse {
  success: boolean;
  message?: string;
  reference?: string;
  data?: ConciergerieRequest;
  matched_properties?: PropertyMatchResult[];
  errors?: Record<string, string>;
  error?: string;
}

const LOCAL_STORAGE_KEY = 'kinimmo_client_conciergerie_requests';
const LOCAL_STORAGE_VISITS_KEY = 'kinimmo_client_property_visits';

export function getLocalStoredRequests(): ConciergerieRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalStoredRequest(req: ConciergerieRequest) {
  try {
    const existing = getLocalStoredRequests();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([req, ...existing.filter((r) => r.id !== req.id)]));
  } catch {}
}

export function getLocalStoredVisits(): PropertyVisitRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VISITS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function saveLocalStoredVisit(visit: PropertyVisitRecord) {
  try {
    const existing = getLocalStoredVisits();
    localStorage.setItem(LOCAL_STORAGE_VISITS_KEY, JSON.stringify([visit, ...existing.filter((v) => v.id !== visit.id)]));
  } catch {}
}

/**
 * Envoi de la demande de conciergerie avec validation stricte frontend ET backend
 */
export async function submitConciergerieRequest(formData: any): Promise<SubmitConciergerieResponse> {
  // 1. Validation Frontend préliminaire
  const clientValidation = validateConciergerieRequest(formData);
  if (!clientValidation.isValid || !clientValidation.sanitized) {
    return {
      success: false,
      error: 'Veuillez corriger les erreurs dans le formulaire.',
      errors: clientValidation.errors
    };
  }

  // 2. Envoi vers le serveur Backend Express (/api/conciergerie) pour Validation Backend
  try {
    const response = await fetch('/api/conciergerie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || 'Erreur lors du traitement par le serveur.',
        errors: result.errors
      };
    }

    if (result.data) {
      saveLocalStoredRequest(result.data);
    }

    return {
      success: true,
      message: result.message || 'Votre demande a été transmise avec succès.',
      reference: result.reference,
      data: result.data,
      matched_properties: result.matched_properties
    };
  } catch (networkError) {
    console.warn('Le serveur API local ne répond pas directement, basculement sécurisé vers Firestore direct:', networkError);

    // 3. Fallback direct Firestore si le proxy réseau est temporairement indisponible
    try {
      const sanitized = clientValidation.sanitized;
      const now = new Date();
      const year = now.getFullYear();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const reference = `KIN-CONC-${year}-${randomSuffix}`;
      const id = `conc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Correspondance automatique avec les annonces en mode autonome
      const matches = findMatchingProperties(sanitized, initialProperties, { minScore: 20, limit: 10 });

      const fallbackReq: ConciergeRequest = {
        id,
        user_id: sanitized.user_id || null,
        project_type: sanitized.project_type,
        property_type: sanitized.property_type,
        commune: sanitized.commune,
        quartier: sanitized.quartier || null,
        budget_min: sanitized.budget_min ?? null,
        budget_max: sanitized.budget_max,
        currency: sanitized.currency,
        bedrooms: sanitized.bedrooms ?? null,
        bathrooms: sanitized.bathrooms ?? null,
        parking: sanitized.parking,
        furnished: sanitized.furnished,
        services: sanitized.services,
        description: sanitized.description || null,
        full_name: sanitized.full_name,
        phone: sanitized.phone,
        whatsapp: sanitized.whatsapp || null,
        email: sanitized.email,
        status: matches.length > 0 && matches[0].score >= 60 ? 'properties_found' : 'new',
        assigned_agent_id: sanitized.assigned_agent_id || null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),

        matched_property_ids: matches.map((m) => m.property.id),
        matched_count: matches.length,
        top_match_score: matches[0]?.score || 0,

        reference,
        projet: sanitized.projet,
        typeBien: sanitized.typeBien,
        localisation: sanitized.localisation,
        budget: sanitized.budget,
        caracteristiques: sanitized.caracteristiques,
        client: sanitized.client,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };

      await setDoc(doc(db, 'concierge_requests', id), fallbackReq);
      try {
        await setDoc(doc(db, 'conciergerieRequests', id), fallbackReq);
      } catch {}
      saveLocalStoredRequest(fallbackReq);

      return {
        success: true,
        message: 'Votre demande a été enregistrée avec succès auprès de la Conciergerie Kinimmo.',
        reference,
        data: fallbackReq,
        matched_properties: matches
      };
    } catch (firestoreErr: any) {
      return {
        success: false,
        error: 'Impossible d’enregistrer votre demande pour le moment. Veuillez vérifier votre connexion ou nous contacter directement via WhatsApp.'
      };
    }
  }
}

/**
 * Récupération des biens correspondants pour une demande
 */
export async function fetchPropertyMatchesForRequest(
  request: ConciergeRequest,
  availableProperties: any[] = initialProperties
): Promise<PropertyMatchResult[]> {
  try {
    const res = await fetch(`/api/concierge-requests/${request.id}/matches`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json.data;
      }
    }
  } catch {}

  // Calcul direct côté client / fallback avec scoring officiel
  return findMatchingProperties(request, availableProperties, { minScore: 15, limit: 15 });
}

/**
 * Récupération des demandes pour l'administration (Table: concierge_requests)
 */
export async function fetchConciergerieRequests(): Promise<ConciergerieRequest[]> {
  try {
    const res = await fetch('/api/concierge-requests');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch {}

  try {
    const q = query(collection(db, 'concierge_requests'), orderBy('created_at', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const list: ConciergerieRequest[] = [];
      snap.forEach((d) => list.push(d.data() as ConciergerieRequest));
      if (list.length > 0) return list;
    }
  } catch {}

  try {
    const q = query(collection(db, 'conciergerieRequests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: ConciergerieRequest[] = [];
    snap.forEach((d) => list.push(d.data() as ConciergerieRequest));
    if (list.length > 0) return list;
  } catch {}

  return getLocalStoredRequests();
}

/**
 * Mise à jour du statut d'une demande de conciergerie
 */
export async function updateConciergeRequestStatus(
  id: string,
  newStatus: ConciergeRequestStatus | string,
  notesAdmin?: string,
  assignedAgentId?: string | null
): Promise<boolean> {
  try {
    const res = await fetch(`/api/concierge-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        notesAdmin,
        assigned_agent_id: assignedAgentId
      })
    });
    if (res.ok) return true;
  } catch {}

  try {
    const nowIso = new Date().toISOString();
    const updatePayload = {
      status: newStatus,
      ...(notesAdmin !== undefined ? { notesAdmin } : {}),
      ...(assignedAgentId !== undefined ? { assigned_agent_id: assignedAgentId } : {}),
      updated_at: nowIso,
      updatedAt: nowIso
    };
    await updateDoc(doc(db, 'concierge_requests', id), updatePayload);
    try {
      await updateDoc(doc(db, 'conciergerieRequests', id), updatePayload);
    } catch {}
    return true;
  } catch {}

  return false;
}

/**
 * Récupération des visites immobilières (property_visits)
 */
export async function fetchPropertyVisits(requestId?: string): Promise<PropertyVisitRecord[]> {
  try {
    const url = requestId ? `/api/property-visits?request_id=${encodeURIComponent(requestId)}` : '/api/property-visits';
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch {}

  try {
    let q = query(collection(db, 'property_visits'), orderBy('visit_date', 'asc'));
    if (requestId) {
      q = query(collection(db, 'property_visits'), where('request_id', '==', requestId), orderBy('visit_date', 'asc'));
    }
    const snap = await getDocs(q);
    const list: PropertyVisitRecord[] = [];
    snap.forEach((d) => list.push(d.data() as PropertyVisitRecord));
    if (list.length > 0) return list;
  } catch {}

  const local = getLocalStoredVisits();
  if (requestId) {
    return local.filter((v) => v.request_id === requestId);
  }
  return local;
}

/**
 * Planification d'une nouvelle visite immobilière (property_visits)
 */
export async function schedulePropertyVisit(
  visitData: Omit<PropertyVisitRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<{ success: boolean; data?: PropertyVisitRecord; error?: string }> {
  const id = visitData.id || `pv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const record: PropertyVisitRecord = {
    ...visitData,
    id,
    created_at: now,
    updated_at: now
  };

  try {
    const res = await fetch('/api/property-visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        saveLocalStoredVisit(json.data);
        return { success: true, data: json.data };
      }
    }
  } catch {}

  try {
    await setDoc(doc(db, 'property_visits', id), record);
    saveLocalStoredVisit(record);
    return { success: true, data: record };
  } catch (err: any) {
    saveLocalStoredVisit(record);
    return { success: true, data: record };
  }
}

/**
 * Mise à jour d'une visite immobilière
 */
export async function updatePropertyVisitStatus(
  visitId: string,
  status: string,
  notes?: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/property-visits/${visitId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes })
    });
    if (res.ok) return true;
  } catch {}

  try {
    await updateDoc(doc(db, 'property_visits', visitId), {
      status,
      ...(notes !== undefined ? { notes } : {}),
      updated_at: new Date().toISOString()
    });
    return true;
  } catch {}

  return false;
}

/**
 * Suppression d'une visite immobilière
 */
export async function deletePropertyVisit(visitId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/property-visits/${visitId}`, {
      method: 'DELETE'
    });
    if (res.ok) return true;
  } catch {}

  try {
    await deleteDoc(doc(db, 'property_visits', visitId));
    return true;
  } catch {}

  return false;
}
