import { Currency, CurrencyCode } from '../types';

export const currencies: Record<CurrencyCode, Currency> = {
  USD: { code: 'USD', symbol: '$', rateToEUR: 1.0, format: '{symbol}{amount}' },
  CDF: { code: 'CDF', symbol: 'FC', rateToEUR: 2850, format: '{amount} {symbol}' },
  EUR: { code: 'EUR', symbol: '€', rateToEUR: 0.92, format: '{amount} {symbol}' },
  FCFA: { code: 'FCFA', symbol: 'FCFA', rateToEUR: 655.95, format: '{amount} {symbol}' },
  GBP: { code: 'GBP', symbol: '£', rateToEUR: 0.78, format: '{symbol}{amount}' },
  CHF: { code: 'CHF', symbol: 'CHF', rateToEUR: 0.95, format: '{amount} {symbol}' },
  MAD: { code: 'MAD', symbol: 'DH', rateToEUR: 10.8, format: '{amount} {symbol}' },
  AED: { code: 'AED', symbol: 'AED', rateToEUR: 3.67, format: '{amount} {symbol}' },
};

/**
 * Convertit un montant (exprimé en USD par défaut, ou dans une devise source) vers la devise cible,
 * en appliquant prioritairement le taux CDF défini par l'administrateur.
 */
export function convertAndFormatPrice(
  amount: number,
  targetCurrencyCode: CurrencyCode,
  adminCdfRate?: number,
  sourceCurrencyCode: string = 'USD'
): string {
  const effectiveCdfRate = adminCdfRate && adminCdfRate > 0 ? adminCdfRate : currencies.CDF.rateToEUR;
  const safeAmount = Number.isFinite(amount) ? amount : 0;

  // Normaliser d'abord en USD
  let amountInUSD = safeAmount;
  const normalizedSource = (sourceCurrencyCode || 'USD').toUpperCase() as CurrencyCode;
  if (normalizedSource === 'CDF') {
    amountInUSD = safeAmount / effectiveCdfRate;
  } else if (normalizedSource !== 'USD' && currencies[normalizedSource]) {
    amountInUSD = safeAmount * (currencies.USD.rateToEUR / currencies[normalizedSource].rateToEUR);
  }

  const targetCurrency = currencies[targetCurrencyCode] || currencies.USD;
  let converted = amountInUSD;
  if (targetCurrencyCode === 'CDF') {
    converted = amountInUSD * effectiveCdfRate;
  } else {
    converted = amountInUSD * (targetCurrency.rateToEUR / currencies.USD.rateToEUR);
  }

  const formattedNumber = new Intl.NumberFormat('fr-CD', {
    maximumFractionDigits: 0,
  }).format(Math.round(converted));

  return targetCurrency.format
    .replace('{symbol}', targetCurrency.symbol)
    .replace('{amount}', formattedNumber);
}

/**
 * Calcule le prix principal et sa conversion approximative dans l'autre devise (USD <-> CDF)
 * en s'appuyant sur le taux défini par l'administrateur.
 */
export function getDualCurrencyDisplay(
  price: number,
  propertyCurrency: string = 'USD',
  displayCurrency: CurrencyCode = 'USD',
  adminCdfRate: number = 2850
): {
  primaryFormatted: string;
  primaryCurrency: CurrencyCode;
  secondaryFormatted: string;
  secondaryCurrency: 'USD' | 'CDF';
  effectiveRate: number;
} {
  const effectiveRate = adminCdfRate && adminCdfRate > 0 ? Math.round(adminCdfRate) : 2850;
  const primaryCurrency: CurrencyCode = displayCurrency || 'USD';
  const secondaryCurrency: 'USD' | 'CDF' = primaryCurrency === 'CDF' ? 'USD' : 'CDF';

  const primaryFormatted = convertAndFormatPrice(
    price,
    primaryCurrency,
    effectiveRate,
    propertyCurrency || 'USD'
  );
  const secondaryFormatted = convertAndFormatPrice(
    price,
    secondaryCurrency,
    effectiveRate,
    propertyCurrency || 'USD'
  );

  return {
    primaryFormatted,
    primaryCurrency,
    secondaryFormatted,
    secondaryCurrency,
    effectiveRate,
  };
}

export function formatAdminDateFR(isoOrDate?: string | null): string {
  if (!isoOrDate) {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) {
    return String(isoOrDate);
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}
