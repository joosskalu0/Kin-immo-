import { CurrencyCode } from '../types';
import { convertAndFormatPrice, getDualCurrencyDisplay } from './currency';

export const ALLOWED_PROPERTY_CURRENCIES = ['USD', 'CDF'] as const;
export type PropertyCurrencyCode = (typeof ALLOWED_PROPERTY_CURRENCIES)[number];
export type RentalPeriodicity = 'month' | 'year';
export const MAX_RENTAL_MONTHS = 36;

export interface PropertyPricingInput {
  status?: string;
  listingStatus?: string;
  price?: unknown;
  currency?: unknown;
  period?: unknown;
  isNegotiable?: unknown;
  guaranteeMonths?: unknown;
  advanceMonths?: unknown;
  requirePositivePrice?: boolean;
}

export interface NormalizedPropertyPricing {
  price: number;
  currency: PropertyCurrencyCode;
  period: 'month' | 'year' | 'total';
  isNegotiable: boolean;
  guaranteeMonths?: number;
  advanceMonths?: number;
}

export type PropertyPricingValidationResult =
  | { valid: true; data: NormalizedPropertyPricing; error?: undefined }
  | { valid: false; error: string; data?: undefined };

function parseStrictInteger(raw: unknown): { ok: true; value: number } | { ok: false } {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || !Number.isInteger(raw)) return { ok: false };
    return { ok: true, value: raw };
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim().replace(/\s+/g, '');
    if (!trimmed || !/^-?\d+$/.test(trimmed)) return { ok: false };
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) return { ok: false };
    return { ok: true, value: parsed };
  }
  return { ok: false };
}

function parseOptionalRentalMonths(
  raw: unknown,
  fieldLabel: string
): { ok: true; value: number | undefined; error?: undefined } | { ok: false; error: string; value?: undefined } {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, value: undefined };
  }
  const parsed = parseStrictInteger(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      error: `${fieldLabel} doit être un nombre entier compris entre 0 et ${MAX_RENTAL_MONTHS} mois.`,
    };
  }
  if (parsed.value < 0 || parsed.value > MAX_RENTAL_MONTHS) {
    return {
      ok: false,
      error: `${fieldLabel} doit être compris entre 0 et ${MAX_RENTAL_MONTHS} mois de loyer.`,
    };
  }
  return { ok: true, value: parsed.value };
}

export function coerceBooleanFlag(raw: unknown, fallback = false): boolean {
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'number') return raw === 1;
  if (typeof raw === 'string') {
    const clean = raw.trim().toLowerCase();
    if (clean === 'true' || clean === '1' || clean === 'oui' || clean === 'yes') return true;
    if (clean === 'false' || clean === '0' || clean === 'non' || clean === 'no') return false;
  }
  return fallback;
}

/**
 * Valide et normalise la tarification et les conditions locatives d'un bien :
 * - Prix strictement entier positif (> 0 si publication requise)
 * - Devise USD ou CDF uniquement
 * - Périodicité 'month' | 'year' en location, 'total' sinon
 * - Négociabilité booléenne (oui / non)
 * - Garantie et avance entières 0..36 uniquement en location (purgées sinon)
 */
export function validateAndNormalizePropertyPricing(
  input: PropertyPricingInput
): PropertyPricingValidationResult {
  const status = String(input.status || 'for-sale').trim();
  const isRent = status === 'for-rent';
  const requirePositivePrice = Boolean(input.requirePositivePrice);

  let normalizedCurrency: PropertyCurrencyCode = 'USD';
  if (input.currency !== undefined && input.currency !== null && String(input.currency).trim() !== '') {
    const upper = String(input.currency).trim().toUpperCase();
    if (upper !== 'USD' && upper !== 'CDF') {
      return {
        valid: false,
        error: 'La devise du bien doit être USD ou CDF.',
      };
    }
    normalizedCurrency = upper;
  }

  let normalizedPrice = 0;
  if (input.price !== undefined && input.price !== null && input.price !== '') {
    const parsedPrice = parseStrictInteger(input.price);
    if (!parsedPrice.ok) {
      return {
        valid: false,
        error: 'Le prix du bien doit être un nombre entier sans décimales.',
      };
    }
    if (parsedPrice.value < 0) {
      return {
        valid: false,
        error: 'Le prix du bien doit être un entier positif.',
      };
    }
    if (requirePositivePrice && parsedPrice.value <= 0) {
      return {
        valid: false,
        error: `Le prix doit être un entier supérieur à 0 ${normalizedCurrency === 'CDF' ? 'FC' : 'USD'}.`,
      };
    }
    normalizedPrice = parsedPrice.value;
  } else if (requirePositivePrice) {
    return {
      valid: false,
      error: `Le prix est obligatoire et doit être supérieur à 0 ${normalizedCurrency === 'CDF' ? 'FC' : 'USD'}.`,
    };
  }

  let normalizedPeriod: 'month' | 'year' | 'total' = isRent ? 'month' : 'total';
  if (isRent && input.period !== undefined && input.period !== null && String(input.period).trim() !== '') {
    const rawPeriod = String(input.period).trim().toLowerCase();
    if (rawPeriod === 'month' || rawPeriod === 'year') {
      normalizedPeriod = rawPeriod;
    } else {
      return {
        valid: false,
        error: 'La périodicité du loyer doit être mensuelle (mois) ou annuelle (an).',
      };
    }
  }

  const isNegotiable = coerceBooleanFlag(input.isNegotiable, false);

  if (!isRent) {
    return {
      valid: true,
      data: {
        price: normalizedPrice,
        currency: normalizedCurrency,
        period: 'total',
        isNegotiable,
        guaranteeMonths: undefined,
        advanceMonths: undefined,
      },
    };
  }

  const guaranteeCheck = parseOptionalRentalMonths(input.guaranteeMonths, 'La garantie');
  if (!guaranteeCheck.ok) {
    return { valid: false, error: guaranteeCheck.error };
  }

  const advanceCheck = parseOptionalRentalMonths(input.advanceMonths, "L'avance");
  if (!advanceCheck.ok) {
    return { valid: false, error: advanceCheck.error };
  }

  return {
    valid: true,
    data: {
      price: normalizedPrice,
      currency: normalizedCurrency,
      period: normalizedPeriod,
      isNegotiable,
      guaranteeMonths: guaranteeCheck.value,
      advanceMonths: advanceCheck.value,
    },
  };
}

export function getPropertyPeriodSuffix(
  period?: string,
  status?: string,
  compact = true
): string {
  const isRent = status === 'for-rent';
  if (!isRent && period !== 'month' && period !== 'year') {
    return '';
  }
  if (period === 'year') {
    return compact ? '/an' : ' / an';
  }
  if (period === 'month' || isRent) {
    return compact ? '/mois' : ' / mois';
  }
  return '';
}

export function getPropertyDisplayCurrencies(
  property: {
    price: number;
    currency?: string;
    period?: string;
    status?: string;
  },
  adminCdfRate: number = 2850
): {
  primaryCurrency: PropertyCurrencyCode;
  secondaryCurrency: 'USD' | 'CDF';
  primaryFormatted: string;
  secondaryFormatted: string;
  periodSuffixCompact: string;
  periodSuffixSpaced: string;
  effectiveRate: number;
} {
  const primaryCurrency: PropertyCurrencyCode =
    String(property.currency || 'USD').toUpperCase() === 'CDF' ? 'CDF' : 'USD';
  const dual = getDualCurrencyDisplay(
    Math.round(Number(property.price) || 0),
    primaryCurrency,
    primaryCurrency as CurrencyCode,
    adminCdfRate
  );
  return {
    primaryCurrency,
    secondaryCurrency: dual.secondaryCurrency,
    primaryFormatted: dual.primaryFormatted,
    secondaryFormatted: dual.secondaryFormatted,
    periodSuffixCompact: getPropertyPeriodSuffix(property.period, property.status, true),
    periodSuffixSpaced: getPropertyPeriodSuffix(property.period, property.status, false),
    effectiveRate: dual.effectiveRate,
  };
}

export function formatPropertyPrimaryPriceWithPeriod(
  property: {
    price: number;
    currency?: string;
    period?: string;
    status?: string;
  },
  adminCdfRate: number = 2850,
  compact = true
): string {
  const display = getPropertyDisplayCurrencies(property, adminCdfRate);
  const suffix = compact ? display.periodSuffixCompact : display.periodSuffixSpaced;
  return `${display.primaryFormatted}${suffix}`;
}

export interface RentalBreakdown {
  isAnnual: boolean;
  monthlyEquivalent: number;
  monthlyEquivalentFormatted: string;
  monthlyEquivalentSecondary: string;
  guaranteeMonths?: number;
  advanceMonths?: number;
  guaranteeAmount?: number;
  guaranteeFormatted?: string;
  guaranteeSecondary?: string;
  advanceAmount?: number;
  advanceFormatted?: string;
  advanceSecondary?: string;
  hasEntryBreakdown: boolean;
  totalEntryMonths: number;
  totalEntryAmount?: number;
  totalEntryFormatted?: string;
  totalEntrySecondary?: string;
}

export function computeRentalBreakdown(
  property: {
    price: number;
    currency?: string;
    period?: string;
    status?: string;
    guaranteeMonths?: number;
    advanceMonths?: number;
  },
  adminCdfRate: number = 2850
): RentalBreakdown | null {
  if (property.status !== 'for-rent') return null;
  const primaryCurrency: PropertyCurrencyCode =
    String(property.currency || 'USD').toUpperCase() === 'CDF' ? 'CDF' : 'USD';
  const secondaryCurrency: 'USD' | 'CDF' = primaryCurrency === 'CDF' ? 'USD' : 'CDF';
  const safePrice = Math.max(0, Math.round(Number(property.price) || 0));
  const isAnnual = property.period === 'year';
  const monthlyEquivalent = isAnnual ? Math.round(safePrice / 12) : safePrice;

  const guaranteeMonths =
    typeof property.guaranteeMonths === 'number' && Number.isInteger(property.guaranteeMonths) && property.guaranteeMonths >= 0
      ? Math.min(MAX_RENTAL_MONTHS, property.guaranteeMonths)
      : undefined;
  const advanceMonths =
    typeof property.advanceMonths === 'number' && Number.isInteger(property.advanceMonths) && property.advanceMonths >= 0
      ? Math.min(MAX_RENTAL_MONTHS, property.advanceMonths)
      : undefined;

  const guaranteeAmount = guaranteeMonths !== undefined ? monthlyEquivalent * guaranteeMonths : undefined;
  const advanceAmount = advanceMonths !== undefined ? monthlyEquivalent * advanceMonths : undefined;
  const hasEntryBreakdown = guaranteeMonths !== undefined || advanceMonths !== undefined;
  const totalEntryMonths = (guaranteeMonths ?? 0) + (advanceMonths ?? 0);
  const totalEntryAmount = hasEntryBreakdown ? (guaranteeAmount ?? 0) + (advanceAmount ?? 0) : undefined;

  const fmtPrimary = (amount: number) =>
    convertAndFormatPrice(amount, primaryCurrency, adminCdfRate, primaryCurrency);
  const fmtSecondary = (amount: number) =>
    convertAndFormatPrice(amount, secondaryCurrency, adminCdfRate, primaryCurrency);

  return {
    isAnnual,
    monthlyEquivalent,
    monthlyEquivalentFormatted: fmtPrimary(monthlyEquivalent),
    monthlyEquivalentSecondary: fmtSecondary(monthlyEquivalent),
    guaranteeMonths,
    advanceMonths,
    guaranteeAmount,
    guaranteeFormatted: guaranteeAmount !== undefined ? fmtPrimary(guaranteeAmount) : undefined,
    guaranteeSecondary: guaranteeAmount !== undefined ? fmtSecondary(guaranteeAmount) : undefined,
    advanceAmount,
    advanceFormatted: advanceAmount !== undefined ? fmtPrimary(advanceAmount) : undefined,
    advanceSecondary: advanceAmount !== undefined ? fmtSecondary(advanceAmount) : undefined,
    hasEntryBreakdown,
    totalEntryMonths,
    totalEntryAmount,
    totalEntryFormatted: totalEntryAmount !== undefined ? fmtPrimary(totalEntryAmount) : undefined,
    totalEntrySecondary: totalEntryAmount !== undefined ? fmtSecondary(totalEntryAmount) : undefined,
  };
}
