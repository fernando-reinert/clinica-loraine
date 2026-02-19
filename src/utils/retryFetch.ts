/**
 * Retry apenas para erros de rede/gateway (502, 503, 504, TypeError).
 * Não faz retry para 401/403 ou erros de RLS/auth.
 */

export interface RetryableErrorInfo {
  screen?: string;
  url?: string;
  method?: string;
  status?: number;
  code?: string;
  message?: string;
  details?: unknown;
  hint?: string;
}

export function isRetryableError(err: unknown): boolean {
  if (err instanceof TypeError && (err.message === 'Failed to fetch' || err.message.includes('fetch'))) {
    return true;
  }
  const anyErr = err as { status?: number; code?: string; message?: string };
  const status = anyErr?.status;
  const code = (anyErr?.code || '').toString();
  const msg = (anyErr?.message || '').toString();
  if ([502, 503, 504].includes(Number(status))) return true;
  if (msg.includes('502') || msg.includes('503') || msg.includes('504') || msg.includes('Bad Gateway')) return true;
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || msg.includes('CORS') || msg.includes('NetworkError')) return true;
  if (code === 'PGRST301' || code === '401' || code === '403') return false;
  return false;
}

export function logStructuredError(info: RetryableErrorInfo & { error?: unknown }): void {
  const payload = {
    screen: info.screen,
    url: info.url,
    method: info.method,
    status: info.status,
    code: info.code,
    message: info.message,
    details: info.details,
    hint: info.hint,
  };
  console.error('[FINANCIAL_REPORT_ERROR]', payload, info.error);
}

const DEFAULT_MAX_RETRIES = 2;
const BASE_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Executa uma função async com retry em caso de erro retryable.
 * Retorna o resultado ou relança o último erro após esgotar tentativas.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    screen?: string;
    onRetry?: (attempt: number, err: unknown) => void;
  } = {}
): Promise<T> {
  const { maxRetries = DEFAULT_MAX_RETRIES, baseDelayMs = BASE_DELAY_MS, screen, onRetry } = options;
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isRetryableError(err)) {
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        logStructuredError({
          screen,
          message: (err as Error)?.message,
          code: (err as { code?: string })?.code,
          status: (err as { status?: number })?.status,
          hint: `Retry ${attempt + 1}/${maxRetries} em ${delayMs}ms`,
          error: err,
        });
        onRetry?.(attempt + 1, err);
        await delay(delayMs);
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}
