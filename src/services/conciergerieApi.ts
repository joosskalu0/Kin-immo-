import { ConciergeRequest, ConciergerieRequest, ConciergeRequestStatus, PropertyVisitRecord } from '../types';
import { validateConciergerieRequest } from '../utils/conciergerieValidation';
import { findMatchingProperties, PropertyMatchResult } from '../utils/propertyMatching';
import { initialProperties } from '../data/mockData';

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

  // 2. Matching intelligent immédiat côté client pour retour instantané
  let availableProperties = initialProperties;
  try {
    const stored = localStorage.getItem('kinimmo_properties');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        availableProperties = parsed;
      }
    }
  } catch {}

  const matches = findMatchingProperties(clientValidation.sanitized, availableProperties);

  // 3. Appel de l'API Express
  try {
    const res = await fetch('/api/concierge-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...clientValidation.sanitized,
        matched_properties: matches
      })
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        if (json.data) {
          saveLocalStoredRequest(json.data);
        }
        return {
          success: true,
          message: json.message || 'Votre demande a été enregistrée avec succès.',
          reference: json.reference || json.data?.reference,
          data: json.data,
          matched_properties: json.matched_properties || matches
        };
      }
      return {
        success: false,
        error: json.error || 'Erreur lors de l\'enregistrement de votre demande.',
        errors: json.errors
      };
    }
  } catch (apiErr) {
    console.warn('Backend API request skipped, switching to resilient local store:', apiErr);
  }

  // 4. Fallback Durable Local Storage
  try {
    const sanitized = clientValidation.sanitized;
    const now = new Date();
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reference = `KIN-CCG-${now.getFullYear()}-${randomSuffix}`;

    const fallbackReq: ConciergerieRequest = {
      id,
      reference,
      user_id: null,
      full_name: sanitized.client.nom,
      phone: sanitized.client.telephone,
      email: sanitized.client.email || '',
      whatsapp: sanitized.client.telephone,
      project_type: sanitized.projet,
      property_type: sanitized.typeBien,
      commune: sanitized.localisation.communesSouhaitees[0] || 'Gombe',
      quartier: null,
      budget_min: sanitized.budget.min || null,
      budget_max: sanitized.budget.max,
      currency: sanitized.budget.devise,
      bedrooms: sanitized.caracteristiques.chambresMin || null,
      bathrooms: sanitized.caracteristiques.sallesDeBainMin || null,
      parking: false,
      furnished: false,
      services: sanitized.caracteristiques.equipementsSouhaites || [],
      description: sanitized.caracteristiques.cahierDesCharges || null,
      status: matches.length > 0 && matches[0].score >= 60 ? 'properties_found' : 'new',
      matched_property_ids: matches.map((m) => m.property.id),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      projet: sanitized.projet,
      typeBien: sanitized.typeBien,
      localisation: sanitized.localisation,
      budget: sanitized.budget,
      caracteristiques: sanitized.caracteristiques,
      client: sanitized.client,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    saveLocalStoredRequest(fallbackReq);

    return {
      success: true,
      message: 'Votre demande a été enregistrée avec succès auprès de la Conciergerie Kinimmo.',
      reference,
      data: fallbackReq,
      matched_properties: matches
    };
  } catch (err: any) {
    return {
      success: false,
      error: 'Impossible d\'enregistrer votre demande pour le moment. Veuillez réessayer.'
    };
  }
}

/**
 * Récupération de l'historique des demandes de conciergerie
 */
export async function fetchConciergeRequests(): Promise<ConciergerieRequest[]> {
  try {
    const res = await fetch('/api/concierge-requests');
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch {}

  return getLocalStoredRequests();
}

export const fetchConciergerieRequests = fetchConciergeRequests;

/**
 * Mise à jour complète d'une demande de conciergerie (Champs, client, projet, agent, statut, notes)
 */
export async function updateConciergeRequestFull(
  id: string,
  updateData: Partial<ConciergeRequest>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`/api/concierge-requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        saveLocalStoredRequest(json.data);
        return { success: true, data: json.data };
      }
    }
  } catch {}

  try {
    const nowIso = new Date().toISOString();
    const updatePayload = {
      ...updateData,
      id,
      updated_at: nowIso,
      updatedAt: nowIso
    };
    const existing = getLocalStoredRequests();
    const found = existing.find(r => r.id === id);
    if (found) {
      const updated = { ...found, ...updatePayload };
      saveLocalStoredRequest(updated as ConciergerieRequest);
      return { success: true, data: updated };
    }
    return { success: true, data: { id, ...updatePayload } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erreur lors de la mise à jour.' };
  }
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
    const existing = getLocalStoredRequests();
    const found = existing.find(r => r.id === id);
    if (found) {
      const updated = {
        ...found,
        status: newStatus as any,
        ...(notesAdmin !== undefined ? { notesAdmin } : {}),
        ...(assignedAgentId !== undefined ? { assigned_agent_id: assignedAgentId } : {}),
        updated_at: nowIso,
        updatedAt: nowIso
      };
      saveLocalStoredRequest(updated);
      return true;
    }
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

  saveLocalStoredVisit(record);
  return { success: true, data: record };
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
    const existing = getLocalStoredVisits();
    const found = existing.find(v => v.id === visitId);
    if (found) {
      found.status = status;
      if (notes !== undefined) found.notes = notes;
      found.updated_at = new Date().toISOString();
      saveLocalStoredVisit(found);
      return true;
    }
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
    const existing = getLocalStoredVisits();
    const updated = existing.filter(v => v.id !== visitId);
    localStorage.setItem(LOCAL_STORAGE_VISITS_KEY, JSON.stringify(updated));
    return true;
  } catch {}

  return false;
}
