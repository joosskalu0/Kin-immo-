import { ConciergeRequest, ConciergerieRequest, ConciergeRequestStatus, PropertyVisitRecord } from '../types';
import { validateConciergerieRequest } from '../utils/conciergerieValidation';
import { findMatchingProperties, PropertyMatchResult } from '../utils/propertyMatching';
import { initialProperties } from '../data/mockData';
import { getStoredToken } from './mysqlApi';

const API_BASE_URL = (
  ((import.meta as any).env?.VITE_API_BASE_URL as string) || '/api'
).replace(/\/+$/, '');

function getAuthHeaders(includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getStoredToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

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

function parseStringArray(val: any): string[] {
  if (Array.isArray(val)) {
    return val.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {}
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeStatus(rawStatus?: string): ConciergeRequestStatus {
  if (!rawStatus) return 'new';
  const s = String(rawStatus).trim().toLowerCase();
  if (s === 'nouveau') return 'new';
  if (s === 'en_cours') return 'searching';
  if (s === 'traite') return 'completed';
  if (s === 'archive') return 'cancelled';
  if (
    ['new', 'searching', 'properties_found', 'visit_scheduled', 'negotiation', 'completed', 'cancelled'].includes(s)
  ) {
    return s as ConciergeRequestStatus;
  }
  return 'new';
}

/**
 * Normalise une demande de conciergerie (format SQL plat Hostinger ou format imbriqué Aperçu)
 * afin que tous les composants React (page publique, confirmation, matching, Admin/Agent VIP)
 * disposent toujours d'une structure complète et sûre.
 */
export function normalizeConciergeRequestRecord(raw: any): ConciergerieRequest {
  const src = raw && typeof raw === 'object' ? raw : {};
  const clientObj = src.client && typeof src.client === 'object' ? src.client : {};
  const locObj = src.localisation && typeof src.localisation === 'object' ? src.localisation : {};
  const budgetObj = src.budget && typeof src.budget === 'object' ? src.budget : {};
  const caracObj = src.caracteristiques && typeof src.caracteristiques === 'object' ? src.caracteristiques : {};

  const nowIso = new Date().toISOString();
  const id = String(src.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);
  const year = new Date(src.created_at || src.createdAt || Date.now()).getFullYear() || new Date().getFullYear();
  const reference = String(src.reference || `KIN-CCG-${year}-${id.slice(-4).toUpperCase()}`);

  const fullName = String(src.full_name || clientObj.nomComplet || clientObj.nom || 'Client Kinimmo').trim();
  const phone = String(src.phone || clientObj.telephone || '').trim();
  const whatsapp = src.whatsapp || clientObj.whatsapp || null;
  const email = String(src.email || clientObj.email || '').trim();

  const projectType = String(src.project_type || src.projet || 'Acheter');
  const propertyType = String(src.property_type || src.typeBien || 'Appartement');
  const commune = String(src.commune || locObj.commune || 'Gombe');
  const quartier = src.quartier || locObj.quartier || null;

  const budgetMinNum =
    src.budget_min !== undefined && src.budget_min !== null && src.budget_min !== ''
      ? Number(src.budget_min)
      : budgetObj.min !== undefined && budgetObj.min !== null
      ? Number(budgetObj.min)
      : undefined;
  const budgetMaxNum = Number(src.budget_max ?? budgetObj.max ?? 0) || 0;
  const currency = ((src.currency || budgetObj.devise || 'USD') as string).toUpperCase() === 'CDF' ? 'CDF' : 'USD';

  const bedrooms =
    src.bedrooms !== undefined && src.bedrooms !== null && src.bedrooms !== ''
      ? Number(src.bedrooms)
      : caracObj.chambres !== undefined
      ? Number(caracObj.chambres)
      : undefined;
  const bathrooms =
    src.bathrooms !== undefined && src.bathrooms !== null && src.bathrooms !== ''
      ? Number(src.bathrooms)
      : caracObj.sallesDeBain !== undefined
      ? Number(caracObj.sallesDeBain)
      : undefined;
  const parking = Boolean(src.parking !== undefined ? src.parking : caracObj.parking);
  const furnished = Boolean(src.furnished !== undefined ? src.furnished : caracObj.meuble);

  const services = parseStringArray(src.services ?? caracObj.equipementsSouhaites);
  const matchedPropertyIds = parseStringArray(src.matched_property_ids);
  const description = src.description ?? clientObj.message ?? src.notes ?? null;
  const notesAdmin = src.notesAdmin ?? src.notes_admin ?? undefined;

  return {
    ...src,
    id,
    reference,
    user_id: src.user_id ?? null,
    full_name: fullName,
    phone,
    whatsapp,
    email,
    project_type: projectType,
    property_type: propertyType,
    commune,
    quartier,
    budget_min: budgetMinNum ?? null,
    budget_max: budgetMaxNum,
    currency,
    bedrooms: bedrooms ?? null,
    bathrooms: bathrooms ?? null,
    parking,
    furnished,
    services: services.length > 0 ? services : ['Recherche de biens'],
    description,
    notes: src.notes ?? description ?? undefined,
    notesAdmin,
    status: normalizeStatus(src.status),
    assigned_agent_id: src.assigned_agent_id ?? null,
    assigned_agent_name: src.assigned_agent_name ?? null,
    matched_property_ids: matchedPropertyIds,
    created_at: src.created_at || src.createdAt || nowIso,
    updated_at: src.updated_at || src.updatedAt || nowIso,

    // Structure imbriquée compatible UI
    projet: projectType as any,
    typeBien: propertyType as any,
    localisation: {
      commune,
      quartier: quartier || undefined
    },
    budget: {
      min: budgetMinNum,
      max: budgetMaxNum,
      devise: currency
    },
    caracteristiques: {
      chambres: bedrooms,
      sallesDeBain: bathrooms,
      parking,
      meuble: furnished
    },
    client: {
      nomComplet: fullName,
      telephone: phone,
      whatsapp: whatsapp || undefined,
      email,
      message: description || undefined
    },
    createdAt: src.createdAt || src.created_at || nowIso,
    updatedAt: src.updatedAt || src.updated_at || nowIso
  };
}

export function normalizePropertyVisitRecord(raw: any): PropertyVisitRecord {
  const src = raw && typeof raw === 'object' ? raw : {};
  const rawDate = src.visit_date ? String(src.visit_date).trim() : '';
  const cleanDate = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.slice(0, 10);

  return {
    ...src,
    id: String(src.id || `pv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
    request_id: String(src.request_id || ''),
    property_id: src.property_id ?? null,
    property_title: src.property_title ?? null,
    agent_id: src.agent_id ?? null,
    agent_name: src.agent_name ?? null,
    client_name: src.client_name ?? null,
    visit_date: cleanDate,
    visit_time: src.visit_time ?? null,
    status: String(src.status || 'scheduled'),
    notes: src.notes ?? null,
    created_at: src.created_at || new Date().toISOString(),
    updated_at: src.updated_at || new Date().toISOString()
  };
}

async function safeParseJson(res: Response): Promise<any> {
  try {
    const text = await res.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function getLocalStoredRequests(): ConciergerieRequest[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeConciergeRequestRecord);
      }
    }
  } catch {}
  return [];
}

export function saveLocalStoredRequest(req: ConciergerieRequest) {
  try {
    const normalized = normalizeConciergeRequestRecord(req);
    const existing = getLocalStoredRequests();
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify([normalized, ...existing.filter((r) => r.id !== normalized.id)])
    );
  } catch {}
}

export function getLocalStoredVisits(): PropertyVisitRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VISITS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizePropertyVisitRecord);
      }
    }
  } catch {}
  return [];
}

export function saveLocalStoredVisit(visit: PropertyVisitRecord) {
  try {
    const normalized = normalizePropertyVisitRecord(visit);
    const existing = getLocalStoredVisits();
    localStorage.setItem(
      LOCAL_STORAGE_VISITS_KEY,
      JSON.stringify([normalized, ...existing.filter((v) => v.id !== normalized.id)])
    );
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

  // 3. Appel de l'API Express (Aperçu ou Hostinger MySQL)
  let shouldFallbackOffline = false;
  try {
    const res = await fetch(`${API_BASE_URL}/concierge-requests`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({
        ...clientValidation.sanitized,
        matched_properties: matches.map((m) => ({
          id: m.property.id,
          score: m.score
        }))
      })
    });

    const json = await safeParseJson(res);

    if (res.ok && json.success) {
      const normalizedData = normalizeConciergeRequestRecord({
        ...clientValidation.sanitized,
        ...(json.data || {}),
        reference: json.reference || json.data?.reference
      });
      saveLocalStoredRequest(normalizedData);
      return {
        success: true,
        message: json.message || 'Votre demande a été enregistrée avec succès.',
        reference: normalizedData.reference,
        data: normalizedData,
        matched_properties:
          Array.isArray(json.matched_properties) &&
          json.matched_properties.length > 0 &&
          json.matched_properties.every((m: any) => m && m.property && m.property.id)
            ? json.matched_properties
            : matches
      };
    }

    // Erreur métier ou serveur JSON explicite : ne pas masquer silencieusement
    if (res.status >= 400 && res.status < 502 && (json.error || json.message || json.errors || json.details)) {
      const detailsText = Array.isArray(json.details) ? ` (${json.details.join(' ')})` : '';
      return {
        success: false,
        error: `${json.error || json.message || 'Erreur lors de l’enregistrement de votre demande.'}${detailsText}`,
        errors: json.errors && typeof json.errors === 'object' ? json.errors : undefined
      };
    }

    // Passerelle indisponible / HTML 502-504 : bascule résiliente
    if (res.status >= 502 || res.status === 404) {
      shouldFallbackOffline = true;
    } else {
      return {
        success: false,
        error: json.error || json.message || `Erreur serveur (HTTP ${res.status}). Veuillez réessayer.`
      };
    }
  } catch (apiErr) {
    console.warn('Backend API request unreachable, switching to resilient local store:', apiErr);
    shouldFallbackOffline = true;
  }

  if (!shouldFallbackOffline) {
    return {
      success: false,
      error: 'Impossible de confirmer l’enregistrement auprès du serveur. Veuillez réessayer.'
    };
  }

  // 4. Fallback Durable Local Storage uniquement si serveur réellement injoignable
  try {
    const sanitized = clientValidation.sanitized || {};
    const now = new Date();
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reference = `KIN-CCG-${now.getFullYear()}-${randomSuffix}`;

    const fallbackReq = normalizeConciergeRequestRecord({
      ...sanitized,
      id,
      reference,
      status: matches.length > 0 && matches[0].score >= 60 ? 'properties_found' : 'new',
      matched_property_ids: matches.map((m) => m.property.id),
      created_at: now.toISOString(),
      updated_at: now.toISOString()
    });

    saveLocalStoredRequest(fallbackReq);

    return {
      success: true,
      message: 'Votre demande a été enregistrée avec succès auprès de la Conciergerie Kinimmo.',
      reference,
      data: fallbackReq,
      matched_properties: matches
    };
  } catch (err: any) {
    console.error('Concierge fallback error:', err);
    return {
      success: false,
      error: err?.message || 'Impossible d\'enregistrer votre demande pour le moment. Veuillez réessayer.'
    };
  }
}

/**
 * Récupération de l'historique des demandes de conciergerie
 */
export async function fetchConciergeRequests(): Promise<ConciergerieRequest[]> {
  const token = getStoredToken();
  if (!token) {
    return getLocalStoredRequests();
  }
  try {
    const res = await fetch(`${API_BASE_URL}/concierge-requests`, {
      headers: getAuthHeaders(false)
    });
    if (res.ok) {
      const json = await safeParseJson(res);
      if (json.success && Array.isArray(json.data)) {
        return json.data.map(normalizeConciergeRequestRecord);
      }
    } else if (res.status === 401 || res.status === 403) {
      return [];
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
    const res = await fetch(`${API_BASE_URL}/concierge-requests/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: getAuthHeaders(true),
      body: JSON.stringify(updateData)
    });
    const json = await safeParseJson(res);
    if (res.ok && json.success !== false) {
      const normalized = json.data ? normalizeConciergeRequestRecord(json.data) : undefined;
      if (normalized) {
        saveLocalStoredRequest(normalized);
      }
      return { success: true, data: normalized || json.data };
    }
    return {
      success: false,
      error: json.message || json.error || `Erreur serveur (HTTP ${res.status})`
    };
  } catch (err: any) {
    // Fallback local uniquement si hors-ligne
    try {
      const nowIso = new Date().toISOString();
      const existing = getLocalStoredRequests();
      const found = existing.find((r) => r.id === id);
      if (found) {
        const updated = normalizeConciergeRequestRecord({
          ...found,
          ...updateData,
          id,
          updated_at: nowIso,
          updatedAt: nowIso
        });
        saveLocalStoredRequest(updated);
        return { success: true, data: updated };
      }
    } catch {}
    return { success: false, error: err?.message || 'Erreur lors de la mise à jour.' };
  }
}

/**
 * Mise à jour du statut ou note administrative d'une demande de conciergerie
 */
export async function updateConciergeRequestStatus(
  id: string,
  newStatus?: ConciergeRequestStatus | string,
  notesAdmin?: string,
  assignedAgentId?: string | null
): Promise<boolean> {
  const payload: Record<string, any> = {};
  if (newStatus !== undefined) payload.status = newStatus;
  if (notesAdmin !== undefined) payload.notesAdmin = notesAdmin;
  if (assignedAgentId !== undefined) payload.assigned_agent_id = assignedAgentId;

  try {
    const res = await fetch(`${API_BASE_URL}/concierge-requests/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payload)
    });
    const json = await safeParseJson(res);
    if (res.ok && json.success !== false) {
      if (json.data) {
        saveLocalStoredRequest(normalizeConciergeRequestRecord(json.data));
      }
      return true;
    }
    return false;
  } catch {}

  try {
    const nowIso = new Date().toISOString();
    const existing = getLocalStoredRequests();
    const found = existing.find((r) => r.id === id);
    if (found) {
      const updated = normalizeConciergeRequestRecord({
        ...found,
        ...(newStatus !== undefined ? { status: newStatus as any } : {}),
        ...(notesAdmin !== undefined ? { notesAdmin } : {}),
        ...(assignedAgentId !== undefined ? { assigned_agent_id: assignedAgentId } : {}),
        updated_at: nowIso,
        updatedAt: nowIso
      });
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
  const token = getStoredToken();
  if (!token) {
    const local = getLocalStoredVisits();
    return requestId ? local.filter((v) => v.request_id === requestId) : local;
  }
  try {
    const url = requestId
      ? `${API_BASE_URL}/property-visits?request_id=${encodeURIComponent(requestId)}`
      : `${API_BASE_URL}/property-visits`;
    const res = await fetch(url, {
      headers: getAuthHeaders(false)
    });
    if (res.ok) {
      const json = await safeParseJson(res);
      if (json.success && Array.isArray(json.data)) {
        return json.data.map(normalizePropertyVisitRecord);
      }
    } else if (res.status === 401 || res.status === 403) {
      return [];
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
  const record = normalizePropertyVisitRecord({
    ...visitData,
    id,
    created_at: now,
    updated_at: now
  });

  try {
    const res = await fetch(`${API_BASE_URL}/property-visits`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(record)
    });
    const json = await safeParseJson(res);
    if (res.ok && json.success !== false) {
      const normalized = json.data ? normalizePropertyVisitRecord(json.data) : record;
      saveLocalStoredVisit(normalized);
      return { success: true, data: normalized };
    }
    return {
      success: false,
      error: json.message || json.error || `Erreur serveur (HTTP ${res.status})`
    };
  } catch {
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
    const res = await fetch(`${API_BASE_URL}/property-visits/${encodeURIComponent(visitId)}`, {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status, notes })
    });
    if (res.ok) return true;
    return false;
  } catch {}

  try {
    const existing = getLocalStoredVisits();
    const found = existing.find((v) => v.id === visitId);
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
    const res = await fetch(`${API_BASE_URL}/property-visits/${encodeURIComponent(visitId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(false)
    });
    if (res.ok) return true;
    return false;
  } catch {}

  try {
    const existing = getLocalStoredVisits();
    const updated = existing.filter((v) => v.id !== visitId);
    localStorage.setItem(LOCAL_STORAGE_VISITS_KEY, JSON.stringify(updated));
    return true;
  } catch {}

  return false;
}
