/**
 * src/utils/storageUtils.ts
 *
 * Utilitários para trabalhar com Supabase Storage
 * - Gerar signed URLs para buckets privados
 * - Detectar se é URL ou path
 */
import { supabase } from '../services/supabase/client';
import logger from './logger';
const CONSENT_ATTACHMENTS_BUCKET = 'consent-attachments';
/**
 * Verificar se uma string é uma URL completa (http/https)
 */
export const isUrl = (value) => {
    if (!value)
        return false;
    return value.startsWith("http://") || value.startsWith("https://");
};
/**
 * Obter URL de exibição para assinatura
 *
 * Se signatureRef é URL (http/https): retorna ela diretamente
 * Se é path: gera signed URL via supabase.storage
 *
 * @param signatureRef - URL completa ou path do arquivo
 * @param expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
 * @returns URL assinada ou URL original
 */
export const getDisplayUrl = async (signatureRef, expiresIn = 60 * 60 // 1 hora
) => {
    if (!signatureRef) {
        return null;
    }
    // Se já é URL completa, retornar diretamente
    if (isUrl(signatureRef)) {
        logger.debug('[STORAGE] Usando URL completa:', signatureRef);
        return signatureRef;
    }
    // Se é path, gerar signed URL
    try {
        logger.debug('[STORAGE] Gerando signed URL para path:', signatureRef);
        const { data, error } = await supabase.storage
            .from(CONSENT_ATTACHMENTS_BUCKET)
            .createSignedUrl(signatureRef, expiresIn);
        if (error) {
            logger.warn('[STORAGE] Erro ao gerar signed URL:', error);
            // Tentar bucket alternativo (signatures) se consent-attachments falhar
            try {
                const { data: fallbackData, error: fallbackError } = await supabase.storage
                    .from('signatures')
                    .createSignedUrl(signatureRef, expiresIn);
                if (fallbackError) {
                    logger.error('[STORAGE] Erro ao gerar signed URL (fallback):', fallbackError);
                    return null;
                }
                return fallbackData?.signedUrl || null;
            }
            catch (fallbackErr) {
                logger.error('[STORAGE] Erro no fallback:', fallbackErr);
                return null;
            }
        }
        return data?.signedUrl || null;
    }
    catch (error) {
        logger.error('[STORAGE] Erro ao gerar signed URL:', error);
        return null;
    }
};
/**
 * Normalizar path do storage
 * Se vier URL do Supabase Storage, extrair só o path interno
 * Se já for path, retornar como está
 */
export const normalizeStoragePath = (value) => {
    if (!value)
        return value;
    // Se não é URL, já é path
    if (!isUrl(value)) {
        return value;
    }
    try {
        // Tentar extrair path de URL do Supabase Storage
        // Ex: https://xxx.supabase.co/storage/v1/object/public/consent-attachments/path/to/file.png
        // ou: https://xxx.supabase.co/storage/v1/object/sign/consent-attachments/path/to/file.png
        const urlObj = new URL(value);
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/[^/]+\/(.+)$/);
        if (pathMatch && pathMatch[1]) {
            return decodeURIComponent(pathMatch[1]);
        }
        // Se não conseguir extrair, retornar original (pode ser URL externa válida)
        return value;
    }
    catch (error) {
        // Se não for URL válida, retornar como está
        return value;
    }
};
/**
 * Extrair path de uma URL do Supabase Storage (legado - usar normalizeStoragePath)
 * @deprecated Use normalizeStoragePath
 */
export const extractPathFromUrl = (url) => {
    const normalized = normalizeStoragePath(url);
    return normalized === url ? null : normalized;
};
