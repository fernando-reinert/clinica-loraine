// src/services/storage/storageService.ts
// Serviço para upload de arquivos no Supabase Storage
import { supabase } from '../supabase/client';
import { normalizeStoragePath } from '../../utils/storageUtils';

export const STORAGE_BUCKETS = {
  CONSENT_ATTACHMENTS: 'consent-attachments',
  PATIENT_PHOTOS: 'patient-photos',
  SIGNATURES: 'signatures',
  BEFORE_AFTER: 'before_after',
} as const;

export interface UploadFileParams {
  bucket: string;
  file: File | Blob;
  path: string;
  options?: {
    cacheControl?: string;
    contentType?: string;
    upsert?: boolean;
  };
}

export interface UploadSignatureParams {
  patientId: string;
  visitId: string;
  signatureDataUrl: string;
  signatureType: 'patient' | 'professional';
  timestamp?: number;
}

export interface UploadStickerPhotoParams {
  patientId: string;
  visitId: string;
  file: File;
  procedureName: string;
  timestamp?: number;
}

/**
 * Upload genérico de arquivo
 * ⚠️ ATUALIZADO: Retorna path (para compatibilidade com buckets privados)
 * 
 * @returns Objeto com path (sempre) e url (apenas se bucket for público)
 */
export const uploadFile = async ({
  bucket,
  file,
  path,
  options = {},
}: UploadFileParams): Promise<{ url: string | null; path: string }> => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: options.cacheControl || '3600',
      contentType: options.contentType || file.type || 'application/octet-stream',
      upsert: options.upsert || false,
    });

  if (error) {
    // Tratamento especial para "Bucket not found"
    if (error.message?.includes('Bucket not found') || error.message?.includes('not found')) {
      throw new Error(`BUCKET_NOT_FOUND: O bucket "${bucket}" não foi encontrado. Por favor, crie o bucket "${bucket}" em Supabase > Storage.`);
    }
    throw new Error(`Erro ao fazer upload: ${error.message}`);
  }

  // Tentar obter URL pública (pode falhar se bucket for privado)
  let publicUrl: string | null = null;
  try {
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    publicUrl = urlData.publicUrl;
  } catch (urlError) {
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
export const uploadSignature = async ({
  patientId,
  visitId,
  signatureDataUrl,
  signatureType,
  timestamp = Date.now(),
}: UploadSignatureParams): Promise<string> => {
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
export const uploadStickerPhoto = async ({
  patientId,
  visitId,
  file,
  procedureName,
  timestamp = Date.now(),
}: UploadStickerPhotoParams): Promise<string> => {
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
 * Deletar arquivo do Storage
 */
export const deleteFile = async (bucket: string, path: string): Promise<void> => {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw new Error(`Erro ao deletar arquivo: ${error.message}`);
  }
};

/**
 * Obter URL pública de um arquivo
 */
export const getPublicUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Obter URL visualizável para um arquivo (path ou URL)
 * 
 * Tenta primeiro getPublicUrl (se bucket for público)
 * Se falhar ou retornar vazio, gera signed URL (para buckets privados)
 * 
 * @param bucket - Nome do bucket
 * @param pathOrUrl - Path do arquivo ou URL completa
 * @returns URL que pode ser usada diretamente em <img src>
 */
export const getViewableUrl = async (
  bucket: string,
  pathOrUrl: string
): Promise<string> => {
  // Se já é URL completa e não é do Supabase Storage, retornar direto
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    // Verificar se é URL do Supabase Storage (precisa normalizar)
    const normalizedPath = normalizeStoragePath(pathOrUrl);
    
    // Se normalizou (era URL do Supabase), usar o path normalizado
    if (normalizedPath !== pathOrUrl) {
      // Era URL do Supabase, usar path normalizado
      pathOrUrl = normalizedPath;
    } else {
      // É URL externa válida, retornar direto
      return pathOrUrl;
    }
  }

  // Agora pathOrUrl é um path
  const path = pathOrUrl;

  // Tentar primeiro getPublicUrl (pode funcionar se bucket for público)
  try {
    const publicUrl = getPublicUrl(bucket, path);
    
    // Verificar se a URL pública é válida (não vazia)
    if (publicUrl && publicUrl.trim() !== '') {
      // Testar se a URL funciona (opcional - pode ser custoso)
      // Por enquanto, assumir que se retornou, funciona
      return publicUrl;
    }
  } catch (error) {
    // getPublicUrl falhou, continuar para signed URL
  }

  // PASSO 4: Gerar signed URL (para buckets privados)
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60); // 1 hora

    if (error) {
      // PASSO 4: Log completo do erro
      console.error('[STORAGE] Erro ao gerar signed URL:', {
        bucket,
        path,
        errorCode: error.statusCode,
        errorMessage: error.message,
        errorDetails: error,
      });
      throw new Error(`Erro ao gerar signed URL: ${error.message} (status: ${error.statusCode || 'unknown'})`);
    }

    if (!data?.signedUrl) {
      throw new Error('Signed URL vazia');
    }

    return data.signedUrl;
  } catch (error: any) {
    // Se tudo falhar, logar detalhes completos
    console.error('[STORAGE] Falha completa ao obter URL visualizável:', {
      bucket,
      path,
      originalPathOrUrl: pathOrUrl,
      error: error.message,
    });
    throw new Error(`Não foi possível obter URL visualizável: ${error.message}`);
  }
};
