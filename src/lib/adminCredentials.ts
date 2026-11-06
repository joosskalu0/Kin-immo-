export interface AdminCredentials {
  name: string;
  email: string;
  phone: string;
  agencyName: string;
  pin: string;
}

export const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  name: 'Direction Kinimmo',
  email: '',
  phone: '',
  agencyName: 'Kinimmo RDC',
  pin: '',
};

let inMemoryAdminCredentials: AdminCredentials = { ...DEFAULT_ADMIN_CREDENTIALS };

export const getAdminCredentials = (): AdminCredentials => {
  return { ...inMemoryAdminCredentials };
};

export const saveAdminCredentials = (creds: Partial<AdminCredentials>): AdminCredentials => {
  inMemoryAdminCredentials = {
    ...inMemoryAdminCredentials,
    ...creds,
  };
  return { ...inMemoryAdminCredentials };
};

export const verifyAdminPin = (inputPin: string): boolean => {
  const currentCreds = getAdminCredentials();
  const trimmed = inputPin.trim();
  if (!currentCreds.pin) return false;
  return trimmed === currentCreds.pin;
};
