export type CurrencyCode = 'MYR' | 'USD' | 'SGD' | 'EUR' | 'GBP' | 'IDR' | 'JPY' | 'AUD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  country: string;
  flag: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', country: 'Malaysia', flag: '🇲🇾', decimals: 2 },
  { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States', flag: '🇺🇸', decimals: 2 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', country: 'Singapore', flag: '🇸🇬', decimals: 2 },
  { code: 'EUR', symbol: '€', name: 'Euro', country: 'European Union', flag: '🇪🇺', decimals: 2 },
  { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom', flag: '🇬🇧', decimals: 2 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', country: 'Indonesia', flag: '🇮🇩', decimals: 0 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan', flag: '🇯🇵', decimals: 0 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', country: 'Australia', flag: '🇦🇺', decimals: 2 },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'MYR';

export function getCurrencyConfig(code: CurrencyCode | string = DEFAULT_CURRENCY): CurrencyConfig {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0];
}

export function formatCurrency(
  amount: number | string | undefined | null,
  currencyCode: CurrencyCode | string = DEFAULT_CURRENCY,
  options?: {
    decimals?: number;
    showCode?: boolean;
    compact?: boolean;
  }
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  const config = getCurrencyConfig(currencyCode);

  if (isNaN(num)) {
    return `${config.symbol} 0.00`;
  }

  const decimals = options?.decimals !== undefined 
    ? options.decimals 
    : config.decimals;

  if (options?.compact && Math.abs(num) >= 1000) {
    if (Math.abs(num) >= 1000000) {
      return `${config.symbol} ${(num / 1000000).toFixed(1)}M`;
    }
    return `${config.symbol} ${(num / 1000).toFixed(1)}k`;
  }

  const formattedNum = num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (options?.showCode) {
    return `${config.symbol} ${formattedNum} ${config.code}`;
  }
  return `${config.symbol} ${formattedNum}`;
}
