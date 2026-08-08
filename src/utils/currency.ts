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

export function convertAndFormatPrice(
  amountInUSD: number,
  targetCurrencyCode: CurrencyCode
): string {
  const currency = currencies[targetCurrencyCode] || currencies.USD;
  const converted = amountInUSD * (currency.rateToEUR / currencies.USD.rateToEUR);
  
  const formattedNumber = new Intl.NumberFormat('fr-CD', {
    maximumFractionDigits: 0,
  }).format(Math.round(converted));

  return currency.format
    .replace('{symbol}', currency.symbol)
    .replace('{amount}', formattedNumber);
}

