// src/services/storage/storageService.ts
// Serviço para upload de arquivos no Supabase Storage
import { supabase } from '../supabase/client';
import { normalizeStoragePath } from '../../utils/storageUtils';
// Buckets do Supabase Storage
// Suporta variável de ambiente com fallback para valores padrão
const getBucketName = (envVar, defaultValue) => {
    return envVar || defaultValue;
};
export const STORAGE_BUCKETS = {
    CONSENT_ATTACHMENTS: 'consent-attachments',
    PATIENT_PHOTOS: 'patient-photos',
    SIGNATURES: 'signatures',
    BEFORE_AFTER: 'before_after',
    CONSULTATION_ATTACHMENTS: getBucketName(import.meta.env.VITE_SUPABASE_BUCKET_CONSULTATION_ATTACHMENTS, 'consultation-attachments'),
};
/**
 * Upload genérico de arquivo
 * ⚠️ ATUALIZADO: Retorna path (para compatibilidade com buckets privados)
 *
 * @returns Objeto com path (sempre) e url (apenas se bucket for público)
 */
export const uploadFile = async ({ bucket, file, path, options = {}, }) => {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
        cacheControl: options.cacheControl || '3600',
        contentType: options.contentType || file.type || 'application/octet-stream',
        upsert: options.upsert || false,
    });
    if (error) {
        // Tratamento especial para "Bucket not found" (apenas logar uma vez, não repetir)
        if (error.message?.includes('Bucket not found') ||
            error.message?.includes('not found') ||
            (error.statusCode === 400 && error.message?.toLowerCase().includes('bucket'))) {
            // Log único e claro para dev/admin (sem repetir)
            if (!window.__bucketErrorLogged?.[bucket]) {
                console.error('[STORAGE] ❌ Bucket não encontrado:', {
                    bucket,
                    error: error.message,
                    statusCode: error.statusCode,
                    solucao: `Criar bucket "${bucket}" no Supabase Dashboard > Storage`,
                });
                window.__bucketErrorLogged = window.__bucketErrorLogged || {};
                window.__bucketErrorLogged[bucket] = true;
            }
            throw new Error(`BUCKET_NOT_FOUND: O bucket "${bucket}" não foi encontrado no Supabase Storage. Por favor, crie o bucket "${bucket}" em Supabase Dashboard > Storage.`);
        }
        // Outros erros de upload
        throw new Error(`Erro ao fazer upload: ${error.message}`);
    }
    // Tentar obter URL pública (pode falhar se bucket for privado)
    let publicUrl = null;
    try {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
        publicUrl = urlData.publicUrl;
    }
    catch (urlError) {
        // Bucket privado - não tem URL pública
        // Isso é esperado para consent-attachments
    }
    return {
        url: publicUrl, // null se bucket for privado
        path: data.path, // Sempre retornar path
    };
};
/**
 * Upload de assinatura (PNG base64)
 * ⚠️ NOVO: Retorna PATH ao invés de URL (para buckets privados)
 *
 * Usa bucket "consent-attachments" (private) com path: {patientId}/consents/{visitId}/{signatureType}-{timestamp}.png
 *
 * @returns Path do arquivo (não URL pública) para salvar no banco
 */
export const uploadSignature = async ({ patientId, visitId, signatureDataUrl, signatureType, timestamp = Date.now(), }) => {
    // Converter data URL para Blob
    const response = await fetch(signatureDataUrl);
    const blob = await response.blob();
    // PASSO 3: Path padronizado SEMPRE usando consent-attachments
    // Se visitId não existir, usar 'temp-{timestamp}' como fallback
    const visitPath = visitId || `temp-${timestamp}`;
    const path = `${patientId}/consents/${visitPath}/${signatureType}-${timestamp}.png`;
    console.log('[DEBUG UPLOAD] Fazendo upload de assinatura:', {
        bucket: STORAGE_BUCKETS.CONSENT_ATTACHMENTS,
        path,
        patientId,
        visitId: visitPath,
        signatureType,
    });
    // PASSO 3: Usar APENAS bucket consent-attachments
    const { data, error } = await supabase.storage
        .from(STORAGE_BUCKETS.CONSENT_ATTACHMENTS)
        .upload(path, blob, {
        contentType: 'image/png',
        cacheControl: '31536000', // 1 ano
        upsert: false, // Não sobrescrever se já existir
    });
    // PASSO 3: Logar {path, data, error} do upload
    console.log('[DEBUG UPLOAD] Resultado do upload:', {
        path,
        data: data ? { path: data.path, id: data.id } : null,
        error: error ? {
            message: error.message,
            statusCode: error.statusCode,
            name: error.name,
        } : null,
    });
    // PASSO 3: Se error, throw (não deixar salvar termo se upload falhar)
    if (error) {
        // Tratamento especial para "Bucket not found"
        if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
            throw new Error(`BUCKET_NOT_FOUND: O bucket "${STORAGE_BUCKETS.CONSENT_ATTACHMENTS}" não foi encontrado. Por favor, crie o bucket "${STORAGE_BUCKETS.CONSENT_ATTACHMENTS}" em Supabase > Storage.`);
        }
        console.error('[DEBUG UPLOAD] ❌ Erro ao fazer upload:', {
            bucket: STORAGE_BUCKETS.CONSENT_ATTACHMENTS,
            path,
            error: error.message,
            errorCode: error.statusCode,
            errorDetails: error,
        });
        throw new Error(`Erro ao fazer upload de assinatura: ${error.message}`);
    }
    // PASSO 3: Garantir que salva no DB somente o PATH interno (não URL)
    const returnedPath = data.path;
    console.log('[DEBUG UPLOAD] ✅ Upload concluído - PATH retornado:', {
        bucket: STORAGE_BUCKETS.CONSENT_ATTACHMENTS,
        path: returnedPath,
        isPath: !returnedPath.startsWith('http'),
        isUrl: returnedPath.startsWith('http'),
    });
    // Garantir que é path, não URL
    if (returnedPath.startsWith('http')) {
        console.warn('[DEBUG UPLOAD] ⚠️ ATENÇÃO: Upload retornou URL em vez de path! Extraindo path...');
        const { normalizeStoragePath } = await import('../../utils/storageUtils');
        const normalized = normalizeStoragePath(returnedPath);
        return normalized;
    }
    return returnedPath;
};
/**
 * Upload de foto do adesivo do produto
 * Usa bucket "before_after" para fotos de produtos
 */
export const uploadStickerPhoto = async ({ patientId, visitId, file, procedureName, timestamp = Date.now(), }) => {
    // Sanitizar nome do procedimento para path
    const sanitizedProcedureName = procedureName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const fileExt = file.name.split('.').pop() || 'jpg';
    const path = `${patientId}/consents/${visitId}/stickers/${sanitizedProcedureName}-${timestamp}.${fileExt}`;
    const { url } = await uploadFile({
        bucket: STORAGE_BUCKETS.BEFORE_AFTER, // Usar bucket before_after para fotos
        file,
        path,
        options: {
            contentType: file.type || 'image/jpeg',
            cacheControl: '31536000',
            upsert: false,
        },
    });
    return url;
};
/**
 * Upload de foto de produto utilizada em consulta
 * Usa bucket "consultation-attachments" organizado por patient_id/consultation_id
 *
 * @returns Objeto com path e url (se bucket for público)
 */
/**
 * Sanitizar nome de arquivo para evitar duplicação de extensão e caracteres inválidos
 *
 * @param fileName - Nome original do arquivo
 * @returns Nome sanitizado sem extensão duplicada
 */
function sanitizeFileName(fileName) {
    // Remover espaços extras e normalizar
    let cleanName = fileName.trim();
    // Extrair extensão (última ocorrência de ponto)
    const lastDotIndex = cleanName.lastIndexOf('.');
    let ext = 'jpg'; // fallback
    let nameWithoutExt = cleanName;
    if (lastDotIndex > 0 && lastDotIndex < cleanName.length - 1) {
        // Tem extensão válida
        ext = cleanName.substring(lastDotIndex + 1).toLowerCase();
        nameWithoutExt = cleanName.substring(0, lastDotIndex);
    }
    // Normalizar nome: remover caracteres especiais, espaços -> underscore
    const sanitized = nameWithoutExt
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Manter apenas alfanuméricos, pontos, underscores e hífens
        .replace(/\s+/g, '_') // Espaços -> underscore
        .replace(/_{2,}/g, '_') // Múltiplos underscores -> um só
        .replace(/^_+|_+$/g, '') // Remover underscores no início/fim
        .substring(0, 50); // Limitar tamanho
    // Se ficou vazio após sanitização, usar nome padrão
    const finalName = sanitized || 'foto';
    return { name: finalName, ext };
}
/**
 * Upload de foto de produto utilizada em consulta
 * Usa bucket "consultation-attachments" organizado por patient_id/consultation_id
 *
 * ⚠️ IMPORTANTE: Se o upload falhar (ex: bucket não existe), lança erro tratável
 *
 * @returns Objeto com path e url (se bucket for público)
 * @throws Error com mensagem clara se bucket não existir ou upload falhar
 */
export const uploadConsultationPhoto = async ({ patientId, consultationId, file, timestamp = Date.now(), }) => {
    // Sanitizar nome do arquivo (evitar .jpg.jpg)
    const { name, ext } = sanitizeFileName(file.name);
    const safeFileName = `${timestamp}-${name}.${ext}`;
    const path = `${patientId}/consultations/${consultationId}/${safeFileName}`;
    try {
        const result = await uploadFile({
            bucket: STORAGE_BUCKETS.CONSULTATION_ATTACHMENTS,
            file,
            path,
            options: {
                contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
                cacheControl: '31536000', // 1 ano
                upsert: false,
            },
        });
        return {
            path: result.path,
            url: result.url,
        };
    }
    catch (error) {
        // Re-lançar erro com contexto adicional (apenas se for erro de bucket)
        if (error.message?.includes('BUCKET_NOT_FOUND') ||
            error.message?.includes('Bucket not found') ||
            error.statusCode === 400) {
            throw new Error(`Não foi possível fazer upload da foto "${file.name}". O bucket de anexos não está configurado. Entre em contato com o administrador do sistema.`);
        }
        throw error;
    }
};
/**
 * Deletar arquivo do Storage
 */
export const deleteFile = async (bucket, path) => {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
        throw new Error(`Erro ao deletar arquivo: ${error.message}`);
    }
};
/**
 * Obter URL pública de um arquivo
 */
export const getPublicUrl = (bucket, path) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
};
/**
 * Obter URL visualizável para um arquivo (path ou URL)
 *
 * Para buckets privados, sempre gera signed URL (não tenta public URL primeiro)
 * Para buckets públicos, tenta public URL primeiro
 *
 * @param bucket - Nome do bucket
 * @param pathOrUrl - Path do arquivo ou URL completa
 * @param expiresIn - Tempo de expiração da signed URL em segundos (padrão: 1 hora)
 * @returns URL que pode ser usada diretamente em <img src>
 */
export const getViewableUrl = async (bucket, pathOrUrl, expiresIn = 3600 // 1 hora padrão
) => {
    // Se já é URL completa e não é do Supabase Storage, retornar direto
    if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        // Verificar se é URL do Supabase Storage (precisa normalizar)
        const normalizedPath = normalizeStoragePath(pathOrUrl);
        // Se normalizou (era URL do Supabase), usar o path normalizado
        if (normalizedPath !== pathOrUrl) {
            // Era URL do Supabase, usar path normalizado
            pathOrUrl = normalizedPath;
        }
        else {
            // É URL externa válida, retornar direto
            return pathOrUrl;
        }
    }
    // Agora pathOrUrl é um path
    const path = pathOrUrl;
    // Para consultation-attachments (bucket privado), sempre usar signed URL
    if (bucket === STORAGE_BUCKETS.CONSULTATION_ATTACHMENTS) {
        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .createSignedUrl(path, expiresIn);
            if (error) {
                // Log apenas uma vez por path para evitar spam
                const errorKey = `${bucket}:${path}`;
                if (!window.__signedUrlErrorLogged?.[errorKey]) {
                    console.warn('[STORAGE] Erro ao gerar signed URL:', {
                        bucket,
                        path,
                        errorCode: error.statusCode,
                        errorMessage: error.message,
                    });
                    window.__signedUrlErrorLogged = window.__signedUrlErrorLogged || {};
                    window.__signedUrlErrorLogged[errorKey] = true;
                }
                throw new Error(`Erro ao gerar signed URL: ${error.message}`);
            }
            if (!data?.signedUrl) {
                throw new Error('Signed URL vazia');
            }
            return data.signedUrl;
        }
        catch (error) {
            throw new Error(`Não foi possível obter URL visualizável: ${error.message}`);
        }
    }
    // Para outros buckets, tentar public URL primeiro
    try {
        const publicUrl = getPublicUrl(bucket, path);
        if (publicUrl && publicUrl.trim() !== '') {
            return publicUrl;
        }
    }
    catch (error) {
        // getPublicUrl falhou, continuar para signed URL
    }
    // Fallback: gerar signed URL
    try {
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(path, expiresIn);
        if (error) {
            throw new Error(`Erro ao gerar signed URL: ${error.message}`);
        }
        if (!data?.signedUrl) {
            throw new Error('Signed URL vazia');
        }
        return data.signedUrl;
    }
    catch (error) {
        throw new Error(`Não foi possível obter URL visualizável: ${error.message}`);
    }
};
