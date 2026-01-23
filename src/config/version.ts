/**
 * Versão da aplicação
 * 
 * Lê a versão do package.json através da variável de ambiente VITE_APP_VERSION
 * definida durante o build, com fallback para __APP_VERSION__ ou string vazia.
 */
export const APP_VERSION: string = 
  import.meta.env.VITE_APP_VERSION || 
  (typeof window !== 'undefined' && (window as any).__APP_VERSION__) || 
  '';

/**
 * Formata a versão para exibição (adiciona 'v' se não tiver)
 */
export const getFormattedVersion = (): string => {
  if (!APP_VERSION) return '';
  return APP_VERSION.startsWith('v') ? APP_VERSION : `v${APP_VERSION}`;
};
