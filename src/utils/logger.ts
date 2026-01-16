/**
 * src/utils/logger.ts
 * 
 * Logger centralizado para desenvolvimento e produção
 * - Em DEV: mostra todos os logs
 * - Em PROD: mostra apenas erros críticos
 */

const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

const logger: Logger = {
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn('[WARN]', ...args);
    }
    // Em produção, warnings críticos podem ser enviados para serviço de monitoramento
  },
  error: (...args: any[]) => {
    // Erros sempre são logados (dev e prod)
    console.error('[ERROR]', ...args);
    // Em produção, erros podem ser enviados para serviço de monitoramento (ex: Sentry)
  },
};

export default logger;
