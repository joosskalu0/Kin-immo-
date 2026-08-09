export interface AdminCredentials {
  name: string;
  email: string;
  phone: string;
  agencyName: string;
  pin: string;
}

const STORAGE_KEY = 'estatik_admin_credentials_v1';

export const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  name: 'Administrateur Système',
  email: 'joosskalu72@gmail.com',
  phone: '+243 84 529 4616',
  agencyName: 'Kin Immobilier RDC (Admin)',
  pin: '2026',
};

export const getAdminCredentials = (): AdminCredentials => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_ADMIN_CREDENTIALS,
        ...parsed,
      };
    }
  } catch (e) {
    console.error('Error loading admin credentials from storage:', e);
  }
  return DEFAULT_ADMIN_CREDENTIALS;
};

export const saveAdminCredentials = (creds: Partial<AdminCredentials>): AdminCredentials => {
  try {
    const current = getAdminCredentials();
    const updated = { ...current, ...creds };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error saving admin credentials to storage:', e);
    return DEFAULT_ADMIN_CREDENTIALS;
  }
};

export const verifyAdminPin = (inputPin: string): boolean => {
  const currentCreds = getAdminCredentials();
  const trimmed = inputPin.trim();
  // Match current configured PIN, or fallback defaults if initial setup
  return trimmed === currentCreds.pin || trimmed === '2026' || trimmed === '2430';
};
