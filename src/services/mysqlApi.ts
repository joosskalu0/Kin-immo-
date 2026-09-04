/**
 * Service Client API MySQL REST pour Kinimmo
 * Permet de consommer le backend Node.js / Express sans supprimer le code Firebase existant.
 */

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string) || 'http://localhost:5000/api';

// Récupérer le token JWT stocké
export const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem('kinimmo_jwt_token');
  } catch {
    return null;
  }
};

// Sauvegarder le token JWT
export const setStoredToken = (token: string): void => {
  try {
    localStorage.setItem('kinimmo_jwt_token', token);
  } catch (e) {
    console.error('Impossible de stocker le token', e);
  }
};

// Supprimer le token JWT (Déconnexion)
export const clearStoredToken = (): void => {
  try {
    localStorage.removeItem('kinimmo_jwt_token');
  } catch (e) {
    console.error('Erreur suppression token', e);
  }
};

// Wrapper générique fetch pour les requêtes à l'API
async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<{ success: boolean; data?: T; message?: string; error?: string }> {
  const token = getStoredToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || `Erreur serveur HTTP ${response.status}`,
        error: data.error
      };
    }

    return {
      success: true,
      data
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Impossible de joindre le serveur API MySQL Kinimmo.'
    };
  }
}

export const mysqlApi = {
  // 1. Santé du serveur
  async checkHealth() {
    return apiRequest('/health');
  },

  // 2. Authentification
  async register(userData: { name: string; email: string; password: string; phone?: string; role?: string; agencyName?: string }) {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },

  async login(credentials: { email: string; password: string }) {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.success && res.data?.token) {
      setStoredToken(res.data.token);
    }
    return res;
  },

  async getMe() {
    return apiRequest('/auth/me');
  },

  async updateProfile(profileData: any) {
    return apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  },

  async changePassword(oldPassword: string, newPassword: string) {
    return apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  },

  // 3. Propriétés (Annonces)
  async getProperties(params: Record<string, any> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, String(v));
      }
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return apiRequest(`/properties${queryString}`);
  },

  async getPropertyById(id: string) {
    return apiRequest(`/properties/${id}`);
  },

  async createProperty(property: any) {
    return apiRequest('/properties', {
      method: 'POST',
      body: JSON.stringify(property)
    });
  },

  async updateProperty(id: string, property: any) {
    return apiRequest(`/properties/${id}`, {
      method: 'PUT',
      body: JSON.stringify(property)
    });
  },

  async deleteProperty(id: string) {
    return apiRequest(`/properties/${id}`, {
      method: 'DELETE'
    });
  },

  // 4. Agents & Agences
  async getAgents(search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiRequest(`/agents${q}`);
  },

  async getAgentById(id: string) {
    return apiRequest(`/agents/${id}`);
  },

  async getAgencies(params: Record<string, any> = {}) {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/agencies${query ? `?${query}` : ''}`);
  },

  async getAgencyById(id: string) {
    return apiRequest(`/agencies/${id}`);
  },

  // 5. Favoris
  async getFavorites() {
    return apiRequest('/favorites');
  },

  async addFavorite(propertyId: string) {
    return apiRequest(`/favorites/${propertyId}`, { method: 'POST' });
  },

  async removeFavorite(propertyId: string) {
    return apiRequest(`/favorites/${propertyId}`, { method: 'DELETE' });
  },

  async checkFavorite(propertyId: string) {
    return apiRequest(`/favorites/check/${propertyId}`);
  },

  // 6. Messages & Demandes de Visites
  async sendMessage(messageData: {
    propertyId?: string;
    receiverId?: string;
    name: string;
    email: string;
    phone?: string;
    message: string;
    requestType?: 'info' | 'tour' | 'offer';
    tourDate?: string;
    tourTime?: string;
  }) {
    return apiRequest('/messages', {
      method: 'POST',
      body: JSON.stringify(messageData)
    });
  },

  async getReceivedMessages() {
    return apiRequest('/messages/inbox');
  },

  async updateMessageStatus(id: string, status: string, isRead?: boolean) {
    return apiRequest(`/messages/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, isRead })
    });
  },

  // 7. Administration
  async getAdminStats() {
    return apiRequest('/admin/stats');
  },

  async updateUserRole(userId: string, role: string) {
    return apiRequest(`/admin/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
  },

  async toggleUserVerification(userId: string, data: { isVerified?: boolean; kinshasaBadgeVerified?: boolean }) {
    return apiRequest(`/admin/users/${userId}/verify`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async deleteUser(userId: string) {
    return apiRequest(`/admin/users/${userId}`, {
      method: 'DELETE'
    });
  }
};
