/**
 * Règles partagées de validation des comptes, numéros RDC (+243),
 * politiques de mots de passe (min 10 caractères, mots courants refusés)
 * et suivi de version des Conditions d'Utilisation (M25.2).
 */

export const TERMS_VERSION = '2026.1';
export const MIN_PASSWORD_LENGTH = 10;

export type PublicAccountChoice = 'user' | 'owner' | 'agent' | 'agency';

export const ACCOUNT_ROLE_OPTIONS: Array<{
  id: PublicAccountChoice;
  label: string;
  subtitle: string;
}> = [
  { id: 'user', label: 'Chercheur', subtitle: 'Trouver et contacter des biens' },
  { id: 'owner', label: 'Particulier', subtitle: 'Propriétaire publiant un bien' },
  { id: 'agent', label: 'Agent', subtitle: 'Courtier immobilier indépendant' },
  { id: 'agency', label: 'Agence', subtitle: 'Équipe & direction immobilière' },
];

export const COMMON_PASSWORDS_BLACKLIST = new Set<string>([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  'password12345',
  'passw0rd',
  'p@ssword123',
  '1234567890',
  '0123456789',
  '12345678910',
  '9876543210',
  '0987654321',
  '1111111111',
  '0000000000',
  '2222222222',
  'azertyuiop',
  'azertyuiop1',
  'azerty1234',
  'azerty12345',
  'qwertyuiop',
  'qwerty1234',
  'qwerty12345',
  'motdepasse',
  'motdepasse1',
  'motdepasse12',
  'motdepasse123',
  'admin12345',
  'admin123456',
  'administrator',
  'administrateur',
  'bienvenue1',
  'bienvenue123',
  'welcome123',
  'welcome1234',
  'iloveyou12',
  'iloveyou123',
  'letmein123',
  'letmein1234',
  'football12',
  'football123',
  'sunshine12',
  'princess12',
  'dragon1234',
  'monkey1234',
  'superman12',
  'batman1234',
  'trustno123',
  '12345qwert',
  'qazwsxedc1',
  'abcd123456',
  'abcdefghij',
  'kinshasa12',
  'kinshasa123',
  'kinshasa2024',
  'kinshasa2025',
  'kinshasa2026',
  'kinimmo123',
  'kinimmo2025',
  'kinimmo2026',
  'immobilier1',
  'immobilier123',
  'congokinshasa',
  'rdc243243243',
  'test123456',
  'test12345678',
  'demo123456',
  'changeme12',
  'changeme123',
]);

export function normalizeAccountRole(input?: string): PublicAccountChoice {
  const val = String(input || '').trim().toLowerCase();
  if (val === 'chercheur' || val === 'user') return 'user';
  if (val === 'particulier' || val === 'owner') return 'owner';
  if (val === 'agent') return 'agent';
  if (val === 'agence' || val === 'agency') return 'agency';
  return 'user';
}

export function getAccountRoleLabel(role?: string): string {
  switch (String(role || '').toLowerCase()) {
    case 'admin':
      return 'Administrateur';
    case 'agency':
    case 'agence':
      return 'Agence';
    case 'agent':
      return 'Agent';
    case 'owner':
    case 'particulier':
      return 'Particulier';
    default:
      return 'Chercheur';
  }
}

export function normalizeEmailAddress(raw?: string): string {
  return String(raw || '').trim().toLowerCase();
}

export function isValidEmailAddress(raw?: string): boolean {
  const clean = normalizeEmailAddress(raw);
  if (!clean || clean.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
}

/**
 * Valide et normalise un numéro de téléphone RDC au format +243XXXXXXXXX.
 * Tolère les espaces, tirets et préfixes 08/09 ou 243 sans '+'.
 */
export function normalizePhoneRdc(raw?: string): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  const trimmed = String(raw || '').trim();
  if (!trimmed || trimmed === '+243') {
    return {
      valid: false,
      normalized: '',
      error: 'Entrez un numéro de téléphone au format +243 (ex: +243 81 234 56 78).',
    };
  }

  let compact = trimmed.replace(/[\s().-]/g, '');
  if (compact.startsWith('00243')) {
    compact = '+243' + compact.slice(5);
  } else if (/^243\d{9}$/.test(compact)) {
    compact = '+' + compact;
  } else if (/^0\d{9}$/.test(compact)) {
    compact = '+243' + compact.slice(1);
  }

  if (!/^\+243\d{9}$/.test(compact)) {
    return {
      valid: false,
      normalized: '',
      error: 'Le téléphone doit être au format +243 suivi de 9 chiffres (ex: +243 81 234 56 78).',
    };
  }

  return {
    valid: true,
    normalized: compact,
  };
}

export interface PasswordValidationResult {
  valid: boolean;
  score: number; // 0..4
  label: string;
  error?: string;
}

export function validatePasswordPolicy(
  password: string,
  context?: { email?: string; name?: string; phone?: string }
): PasswordValidationResult {
  const raw = String(password || '');
  if (raw.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      score: raw.length >= 6 ? 1 : 0,
      label: `Trop court (${raw.length}/${MIN_PASSWORD_LENGTH} caractères min.)`,
      error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
    };
  }

  const lower = raw.toLowerCase().trim();
  const alphaDigitsOnly = lower.replace(/[^a-z0-9]/g, '');
  const strippedTrailingDigits = alphaDigitsOnly.replace(/\d+$/, '');

  if (
    COMMON_PASSWORDS_BLACKLIST.has(lower) ||
    COMMON_PASSWORDS_BLACKLIST.has(alphaDigitsOnly) ||
    (strippedTrailingDigits.length >= 6 &&
      (COMMON_PASSWORDS_BLACKLIST.has(strippedTrailingDigits) ||
        strippedTrailingDigits === 'password' ||
        strippedTrailingDigits === 'azerty' ||
        strippedTrailingDigits === 'qwerty' ||
        strippedTrailingDigits === 'kinshasa' ||
        strippedTrailingDigits === 'kinimmo' ||
        strippedTrailingDigits === 'motdepasse' ||
        strippedTrailingDigits === 'bienvenue'))
  ) {
    return {
      valid: false,
      score: 1,
      label: 'Mot de passe trop courant',
      error: 'Ce mot de passe est trop courant. Choisissez une phrase secrète ou une combinaison plus originale.',
    };
  }

  // Répétitions (ex: aaaaaaaaaa, 1111111111)
  if (/^(.)\1+$/.test(raw) || new Set(raw).size <= 2) {
    return {
      valid: false,
      score: 1,
      label: 'Trop répétitif',
      error: 'Utilisez des caractères variés dans votre mot de passe.',
    };
  }

  // Vérifier les données personnelles (e-mail, nom, numéro)
  if (context?.email) {
    const localPart = context.email.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (localPart && localPart.length >= 4 && alphaDigitsOnly.includes(localPart)) {
      return {
        valid: false,
        score: 1,
        label: 'Contient votre e-mail',
        error: 'Le mot de passe ne doit pas contenir votre adresse e-mail.',
      };
    }
  }

  if (context?.name) {
    const tokens = context.name
      .toLowerCase()
      .split(/\s+/)
      .map((t) => t.replace(/[^a-z0-9]/g, ''))
      .filter((t) => t.length >= 4);
    if (tokens.some((t) => alphaDigitsOnly.includes(t))) {
      return {
        valid: false,
        score: 1,
        label: 'Contient votre nom',
        error: 'Le mot de passe ne doit pas contenir votre nom.',
      };
    }
  }

  if (context?.phone) {
    const digits = context.phone.replace(/\D/g, '').slice(-9);
    if (digits.length >= 6 && alphaDigitsOnly.includes(digits)) {
      return {
        valid: false,
        score: 1,
        label: 'Contient votre numéro',
        error: 'Le mot de passe ne doit pas contenir votre numéro de téléphone.',
      };
    }
  }

  let classes = 0;
  if (/[a-z]/.test(raw)) classes++;
  if (/[A-Z]/.test(raw)) classes++;
  if (/\d/.test(raw)) classes++;
  if (/[^A-Za-z0-9]/.test(raw)) classes++;

  const score = raw.length >= 14 && classes >= 3 ? 4 : classes >= 3 || raw.length >= 12 ? 3 : 2;
  const label = score >= 4 ? 'Très solide' : score === 3 ? 'Solide' : 'Acceptable (10+ car.)';

  return {
    valid: true,
    score,
    label,
  };
}
