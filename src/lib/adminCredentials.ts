export interface AdminCredentials {
  name: string;
  email: string;
  phone: string;
  agencyName: string;
  pin: string;
}

export const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  name: 'Administrateur Système',
  email: 'joosskalu72@gmail.com',
  phone: '+243 84 529 4616',
  agencyName: 'Kin Immobilier RDC (Admin)',
  pin: 'kalu2002jooss',
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
  // Strictly match current configured PIN or kalu2002jooss
  return trimmed === currentCreds.pin || trimmed === 'kalu2002jooss';
};
