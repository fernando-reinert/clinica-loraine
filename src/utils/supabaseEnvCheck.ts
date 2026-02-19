/**
 * Verificação de variáveis de ambiente do Supabase (boot / diagnóstico).
 * Não bloqueia a app; apenas loga e permite exibir avisos nas telas.
 */

import { getSupabaseEnvStatus, maskAnonKey } from '../services/supabase/client';

const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function runSupabaseEnvCheck(): { configured: boolean; message?: string } {
  const status = getSupabaseEnvStatus();

  if (import.meta.env.DEV) {
    console.debug('[SUPABASE_ENV]', {
      urlPresent: status.urlPresent,
      urlFormat: status.urlFormat,
      anonKeyPresent: status.anonKeyPresent,
      anonKeyMasked: maskAnonKey(ENV_KEY),
      configured: status.configured,
    });
  }

  if (!status.configured) {
    const parts: string[] = [];
    if (!status.urlPresent) parts.push('VITE_SUPABASE_URL');
    if (!status.anonKeyPresent) parts.push('VITE_SUPABASE_ANON_KEY');
    const message = `Configure no build/deploy: ${parts.join(' e ')}. Veja SUPABASE_CONFIG.md`;
    return { configured: false, message };
  }

  if (status.urlFormat === 'invalid') {
    return { configured: true, message: 'VITE_SUPABASE_URL deve ser https://....supabase.co' };
  }

  return { configured: true };
}
