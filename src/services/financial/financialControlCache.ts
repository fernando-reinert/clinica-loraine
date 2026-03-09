/**
 * Session cache for FinancialControl to avoid full reload when navigating back.
 * Data is considered fresh for 90 seconds. Stale-while-revalidate pattern.
 */
const CACHE_TTL_MS = 90_000;

export interface FinancialControlCacheData {
  patients: unknown[];
  financialRecords: unknown[];
  payments: unknown[];
  installments: unknown[];
  manualPayments: unknown[];
  appointments: unknown[];
  feeRules: unknown[];
  fetchedAt: number;
}

let cache: FinancialControlCacheData | null = null;

export function getFinancialControlCache(): FinancialControlCacheData | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) {
    cache = null;
    return null;
  }
  return cache;
}

export function setFinancialControlCache(data: Partial<Omit<FinancialControlCacheData, "fetchedAt">>): void {
  const now = Date.now();
  cache = {
    patients: data.patients ?? cache?.patients ?? [],
    financialRecords: data.financialRecords ?? cache?.financialRecords ?? [],
    payments: data.payments ?? cache?.payments ?? [],
    installments: data.installments ?? cache?.installments ?? [],
    manualPayments: data.manualPayments ?? cache?.manualPayments ?? [],
    appointments: data.appointments ?? cache?.appointments ?? [],
    feeRules: data.feeRules ?? cache?.feeRules ?? [],
    fetchedAt: now,
  };
}

export function invalidateFinancialControlCache(): void {
  cache = null;
}
