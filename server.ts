import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { validateConciergerieRequest } from './src/utils/conciergerieValidation';
import { findMatchingProperties } from './src/utils/propertyMatching';
import { initialProperties } from './src/data/mockData';
import { ConciergerieRequest, PropertyVisitRecord, ConciergeRequestStatus } from './src/types/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';

// Parser JSON & URL-encoded
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Fichier local de secours pour persistance robuste
const LOCAL_LEADS_FILE = path.join(__dirname, 'concierge_requests.json');
const LOCAL_LEADS_FILE_ALT = path.join(__dirname, 'conciergerie_requests.json');
const LOCAL_VISITS_FILE = path.join(__dirname, 'property_visits.json');

function loadLocalRequests(): ConciergerieRequest[] {
  try {
    if (fs.existsSync(LOCAL_LEADS_FILE)) {
      const content = fs.readFileSync(LOCAL_LEADS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    } else if (fs.existsSync(LOCAL_LEADS_FILE_ALT)) {
      const content = fs.readFileSync(LOCAL_LEADS_FILE_ALT, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error('Erreur lecture concierge_requests.json', e);
  }
  return [];
}

function saveLocalRequests(list: ConciergerieRequest[]) {
  try {
    fs.writeFileSync(LOCAL_LEADS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    fs.writeFileSync(LOCAL_LEADS_FILE_ALT, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture concierge_requests.json', e);
  }
}

function loadLocalVisits(): PropertyVisitRecord[] {
  try {
    if (fs.existsSync(LOCAL_VISITS_FILE)) {
      const content = fs.readFileSync(LOCAL_VISITS_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch (e) {
    console.error('Erreur lecture property_visits.json', e);
  }
  return [];
}

function saveLocalVisits(list: PropertyVisitRecord[]) {
  try {
    fs.writeFileSync(LOCAL_VISITS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Erreur écriture property_visits.json', e);
  }
}

// In-memory cache initialisé
let inMemoryRequests: ConciergerieRequest[] = loadLocalRequests();
let inMemoryVisits: PropertyVisitRecord[] = loadLocalVisits();

// --- Routes API ---

// 1. Soumission d'une demande de conciergerie (Table: concierge_requests)
const handleCreateConciergeRequest = async (req: Request, res: Response) => {
  try {
    const rawData = req.body;

    // VALIDATION BACKEND OBLIGATOIRE
    const validation = validateConciergerieRequest(rawData);

    if (!validation.isValid || !validation.sanitized) {
      return res.status(400).json({
        success: false,
        error: 'Validation échouée sur le serveur. Veuillez corriger les informations requises.',
        errors: validation.errors
      });
    }

    const sanitized = validation.sanitized;
    const now = new Date();
    const year = now.getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const reference = `KIN-CONC-${year}-${randomSuffix}`;
    const id = `conc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Structure conforme à la table concierge_requests :
    const newRequest: ConciergerieRequest = {
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
      status: 'new',
      assigned_agent_id: sanitized.assigned_agent_id || null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),

      // Champs enrichis / compatibilité :
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

    // Correspondance automatique avec les annonces dès la création de la demande
    const matches = findMatchingProperties(newRequest, initialProperties, { minScore: 20, limit: 10 });
    newRequest.matched_property_ids = matches.map((m) => m.property.id);
    newRequest.matched_count = matches.length;
    newRequest.top_match_score = matches[0]?.score || 0;

    // Si des biens correspondent très fortement (ex: score >= 60), marquer automatiquement le statut en 'properties_found'
    if (matches.length > 0 && matches[0].score >= 60) {
      newRequest.status = 'properties_found';
    }

    // Sauvegarde en mémoire et fichier local
    inMemoryRequests.unshift(newRequest);
    saveLocalRequests(inMemoryRequests);

    // Sauvegarde dans Firestore : collections 'concierge_requests' ET 'conciergerieRequests'
    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'concierge_requests', id), newRequest);
      await setDoc(doc(db, 'conciergerieRequests', id), newRequest);
    } catch (firestoreErr) {
      console.warn('Note: Sauvegarde Firestore différée (stocké localement avec succès):', firestoreErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Votre demande a été prise en compte avec succès par la Conciergerie Kinimmo.',
      reference: newRequest.reference,
      data: newRequest,
      matched_properties: matches
    });
  } catch (error: any) {
    console.error('Erreur backend POST concierge_requests:', error);
    return res.status(500).json({
      success: false,
      error: 'Une erreur interne est survenue lors de l’enregistrement de votre demande.',
      details: error?.message || String(error)
    });
  }
};

app.post('/api/concierge-requests', handleCreateConciergeRequest);
app.post('/api/conciergerie', handleCreateConciergeRequest);

// Route de consultation des correspondances automatiques pour une demande
app.get('/api/concierge-requests/:id/matches', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const foundReq = inMemoryRequests.find((r) => r.id === id);
    if (!foundReq) {
      return res.status(404).json({ success: false, error: 'Demande introuvable.' });
    }
    const matches = findMatchingProperties(foundReq, initialProperties, { minScore: 15, limit: 15 });
    return res.json({ success: true, count: matches.length, data: matches });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// 2. Consultation des demandes (Table: concierge_requests)
const handleGetConciergeRequests = async (_req: Request, res: Response) => {
  try {
    // Essayer de lire depuis Firestore
    try {
      const { db } = await import('./src/lib/firebase');
      const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
      const q = query(collection(db, 'concierge_requests'), orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const firestoreList: ConciergerieRequest[] = [];
        snapshot.forEach((d) => firestoreList.push(d.data() as ConciergerieRequest));
        return res.json({ success: true, count: firestoreList.length, data: firestoreList });
      }
    } catch {}

    // Fallback sur le cache local
    return res.json({
      success: true,
      count: inMemoryRequests.length,
      data: inMemoryRequests
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};

app.get('/api/concierge-requests', handleGetConciergeRequests);
app.get('/api/conciergerie', handleGetConciergeRequests);

// 3. Mise à jour de statut, agent ou notes administratives
const handleUpdateConciergeRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notesAdmin, assigned_agent_id } = req.body;

    const reqItem = inMemoryRequests.find((r) => r.id === id);
    if (!reqItem) {
      return res.status(404).json({ success: false, error: 'Demande introuvable.' });
    }

    const validStatuses: ConciergeRequestStatus[] = [
      'new',
      'searching',
      'properties_found',
      'visit_scheduled',
      'negotiation',
      'completed',
      'cancelled'
    ];

    if (status) {
      // Normalisation des statuts
      let mappedStatus = status;
      if (status === 'nouveau') mappedStatus = 'new';
      else if (status === 'en_cours') mappedStatus = 'searching';
      else if (status === 'traite') mappedStatus = 'completed';
      else if (status === 'archive') mappedStatus = 'cancelled';

      if (validStatuses.includes(mappedStatus)) {
        reqItem.status = mappedStatus;
      }
    }

    if (assigned_agent_id !== undefined) {
      reqItem.assigned_agent_id = assigned_agent_id;
    }

    if (notesAdmin !== undefined) {
      reqItem.notesAdmin = String(notesAdmin);
    }
    const nowIso = new Date().toISOString();
    reqItem.updated_at = nowIso;
    reqItem.updatedAt = nowIso;

    saveLocalRequests(inMemoryRequests);

    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      const updatePayload = {
        ...(status ? { status: reqItem.status } : {}),
        ...(assigned_agent_id !== undefined ? { assigned_agent_id } : {}),
        ...(notesAdmin !== undefined ? { notesAdmin } : {}),
        updated_at: nowIso,
        updatedAt: nowIso
      };
      await updateDoc(doc(db, 'concierge_requests', id), updatePayload);
      await updateDoc(doc(db, 'conciergerieRequests', id), updatePayload);
    } catch {}

    return res.json({ success: true, data: reqItem });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
};

app.patch('/api/concierge-requests/:id', handleUpdateConciergeRequest);
app.patch('/api/conciergerie/:id', handleUpdateConciergeRequest);

// 4. Table : property_visits (CRUD complet)
app.get('/api/property-visits', async (req: Request, res: Response) => {
  try {
    const { request_id } = req.query;

    // Essayer Firestore
    try {
      const { db } = await import('./src/lib/firebase');
      const { collection, getDocs, orderBy, query, where } = await import('firebase/firestore');
      const visitsCol = collection(db, 'property_visits');
      const q = request_id
        ? query(visitsCol, where('request_id', '==', String(request_id)))
        : query(visitsCol, orderBy('visit_date', 'desc'));

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const list: PropertyVisitRecord[] = [];
        snapshot.forEach((d) => list.push(d.data() as PropertyVisitRecord));
        return res.json({ success: true, count: list.length, data: list });
      }
    } catch {}

    // Fallback mémoire
    let result = inMemoryVisits;
    if (request_id) {
      result = result.filter((v) => v.request_id === String(request_id));
    }
    return res.json({ success: true, count: result.length, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

app.post('/api/property-visits', async (req: Request, res: Response) => {
  try {
    const { request_id, property_id, agent_id, visit_date, visit_time, status, notes, property_title, agent_name, client_name } = req.body;

    if (!request_id || !visit_date) {
      return res.status(400).json({
        success: false,
        error: 'Les champs request_id et visit_date sont obligatoires pour planifier une visite.'
      });
    }

    const nowIso = new Date().toISOString();
    const id = `visit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newVisit: PropertyVisitRecord = {
      id,
      request_id: String(request_id),
      property_id: property_id || null,
      agent_id: agent_id || null,
      visit_date: String(visit_date),
      visit_time: visit_time || null,
      status: status || 'scheduled',
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso,
      property_title: property_title || null,
      agent_name: agent_name || null,
      client_name: client_name || null
    };

    inMemoryVisits.unshift(newVisit);
    saveLocalVisits(inMemoryVisits);

    // Mettre à jour le statut de la demande en 'visit_scheduled' si approprié
    const targetRequest = inMemoryRequests.find((r) => r.id === request_id);
    if (targetRequest && targetRequest.status !== 'completed' && targetRequest.status !== 'cancelled') {
      targetRequest.status = 'visit_scheduled';
      targetRequest.updated_at = nowIso;
      saveLocalRequests(inMemoryRequests);
    }

    // Sauvegarde Firestore
    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, setDoc, updateDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'property_visits', id), newVisit);
      if (targetRequest) {
        await updateDoc(doc(db, 'concierge_requests', request_id), { status: 'visit_scheduled', updated_at: nowIso });
      }
    } catch (e) {
      console.warn('Note: Sauvegarde visite Firestore différée:', e);
    }

    return res.status(201).json({ success: true, data: newVisit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

app.patch('/api/property-visits/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, notes, visit_date, visit_time, agent_id, property_id } = req.body;

    const visit = inMemoryVisits.find((v) => v.id === id);
    if (!visit) {
      return res.status(404).json({ success: false, error: 'Visite introuvable.' });
    }

    if (status !== undefined) visit.status = status;
    if (notes !== undefined) visit.notes = notes;
    if (visit_date !== undefined) visit.visit_date = visit_date;
    if (visit_time !== undefined) visit.visit_time = visit_time;
    if (agent_id !== undefined) visit.agent_id = agent_id;
    if (property_id !== undefined) visit.property_id = property_id;
    visit.updated_at = new Date().toISOString();

    saveLocalVisits(inMemoryVisits);

    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'property_visits', id), {
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(visit_date !== undefined ? { visit_date } : {}),
        ...(visit_time !== undefined ? { visit_time } : {}),
        ...(agent_id !== undefined ? { agent_id } : {}),
        ...(property_id !== undefined ? { property_id } : {}),
        updated_at: visit.updated_at
      });
    } catch {}

    return res.json({ success: true, data: visit });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

app.delete('/api/property-visits/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    inMemoryVisits = inMemoryVisits.filter((v) => v.id !== id);
    saveLocalVisits(inMemoryVisits);

    try {
      const { db } = await import('./src/lib/firebase');
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'property_visits', id));
    } catch {}

    return res.json({ success: true, message: 'Visite supprimée avec succès.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Kinimmo Conciergerie API', timestamp: new Date().toISOString() });
});

// Initialisation Serveur Vite (Dev) ou Fichiers Statiques (Prod)
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kinimmo Full-Stack Server running on http://0.0.0.0:${PORT} (${isProd ? 'Production' : 'Development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
