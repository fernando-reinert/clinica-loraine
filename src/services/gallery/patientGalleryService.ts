/**
 * Galeria do Paciente por PROCEDIMENTO — 1 linha por procedimento (antes/depois em pares)
 * Tabela: patient_procedure_photos (before_url, before_path, after_url, after_path)
 * Storage: patients/{patientId}/procedures/{procedureId}/before.jpg | after.jpg
 */
import { supabase } from '../supabase/client';
import { uploadFile, deleteFile, STORAGE_BUCKETS } from '../storage/storageService';

export interface PatientProcedurePhoto {
  id: string;
  patient_id: string;
  procedure_name: string;
  procedure_date: string;
  before_url: string | null;
  before_path: string | null;
  after_url: string | null;
  after_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateProcedureWithPhotosParams {
  patientId: string;
  procedureName: string;
  procedureDate: string;
  notes?: string;
  beforeFile?: File | Blob;
  afterFile?: File | Blob;
}

function getFileExt(file: File | Blob): string {
  return file instanceof File
    ? (file.name.split('.').pop() || 'jpg').toLowerCase()
    : 'jpg';
}

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKETS.PATIENT_PHOTOS).getPublicUrl(path);
  return data.publicUrl;
}

async function uploadToPath(
  patientId: string,
  procedureId: string,
  file: File | Blob,
  slot: 'before' | 'after'
): Promise<{ url: string; path: string }> {
  const ext = getFileExt(file);
  const path = `patients/${patientId}/procedures/${procedureId}/${slot}.${ext}`;
  const result = await uploadFile({
    bucket: STORAGE_BUCKETS.PATIENT_PHOTOS,
    file,
    path,
    options: {
      contentType: file instanceof File ? file.type : 'image/jpeg',
      cacheControl: '31536000',
      upsert: true,
    },
  });
  const url = result.url || getPublicUrl(result.path);
  return { url, path: result.path };
}

/**
 * Listar procedimentos (antes/depois em pares) de um paciente
 */
export const listByPatient = async (patientId: string): Promise<PatientProcedurePhoto[]> => {
  const { data, error } = await supabase
    .from('patient_procedure_photos')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PatientProcedurePhoto[];
};

/**
 * Criar procedimento com fotos opcionais (antes e/ou depois)
 */
export const createProcedureWithPhotos = async (
  params: CreateProcedureWithPhotosParams
): Promise<PatientProcedurePhoto> => {
  const { patientId, procedureName, procedureDate, notes, beforeFile, afterFile } = params;

  const { data: row, error: insertError } = await supabase
    .from('patient_procedure_photos')
    .insert({
      patient_id: patientId,
      procedure_name: procedureName,
      procedure_date: procedureDate,
      notes: notes?.trim() || null,
      before_url: null,
      before_path: null,
      after_url: null,
      after_path: null,
    })
    .select()
    .single();

  if (insertError) throw insertError;
  const procedureId = row.id;

  const updates: Partial<PatientProcedurePhoto> = {};
  try {
    if (beforeFile) {
      const { url, path } = await uploadToPath(patientId, procedureId, beforeFile, 'before');
      updates.before_url = url;
      updates.before_path = path;
    }
    if (afterFile) {
      const { url, path } = await uploadToPath(patientId, procedureId, afterFile, 'after');
      updates.after_url = url;
      updates.after_path = path;
    }
  } catch (e) {
    await supabase.from('patient_procedure_photos').delete().eq('id', procedureId);
    throw e;
  }

  if (Object.keys(updates).length > 0) {
    const { data: updated, error: updateError } = await supabase
      .from('patient_procedure_photos')
      .update(updates)
      .eq('id', procedureId)
      .select()
      .single();
    if (updateError) throw updateError;
    return updated as PatientProcedurePhoto;
  }
  return row as PatientProcedurePhoto;
};

/**
 * Adicionar ou substituir foto ANTES
 */
export const addBeforePhoto = async (procedureId: string, file: File | Blob): Promise<PatientProcedurePhoto> => {
  const { data: row, error: fetchError } = await supabase
    .from('patient_procedure_photos')
    .select('patient_id, before_path')
    .eq('id', procedureId)
    .single();
  if (fetchError || !row) throw new Error('Procedimento não encontrado');

  if (row.before_path) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, row.before_path);
    } catch (_) {}
  }

  const { url, path } = await uploadToPath(row.patient_id, procedureId, file, 'before');
  const { data: updated, error: updateError } = await supabase
    .from('patient_procedure_photos')
    .update({ before_url: url, before_path: path })
    .eq('id', procedureId)
    .select()
    .single();
  if (updateError) throw updateError;
  return updated as PatientProcedurePhoto;
};

/**
 * Adicionar ou substituir foto DEPOIS
 */
export const addAfterPhoto = async (procedureId: string, file: File | Blob): Promise<PatientProcedurePhoto> => {
  const { data: row, error: fetchError } = await supabase
    .from('patient_procedure_photos')
    .select('patient_id, after_path')
    .eq('id', procedureId)
    .single();
  if (fetchError || !row) throw new Error('Procedimento não encontrado');

  if (row.after_path) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, row.after_path);
    } catch (_) {}
  }

  const { url, path } = await uploadToPath(row.patient_id, procedureId, file, 'after');
  const { data: updated, error: updateError } = await supabase
    .from('patient_procedure_photos')
    .update({ after_url: url, after_path: path })
    .eq('id', procedureId)
    .select()
    .single();
  if (updateError) throw updateError;
  return updated as PatientProcedurePhoto;
};

/**
 * Excluir foto ANTES (mantém o procedimento)
 */
export const deleteBeforePhoto = async (procedureId: string): Promise<void> => {
  const { data: row, error: fetchError } = await supabase
    .from('patient_procedure_photos')
    .select('before_path')
    .eq('id', procedureId)
    .single();
  if (fetchError || !row) throw new Error('Procedimento não encontrado');
  if (row.before_path) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, row.before_path);
    } catch (_) {}
  }
  await supabase
    .from('patient_procedure_photos')
    .update({ before_url: null, before_path: null })
    .eq('id', procedureId);
};

/**
 * Excluir foto DEPOIS (mantém o procedimento)
 */
export const deleteAfterPhoto = async (procedureId: string): Promise<void> => {
  const { data: row, error: fetchError } = await supabase
    .from('patient_procedure_photos')
    .select('after_path')
    .eq('id', procedureId)
    .single();
  if (fetchError || !row) throw new Error('Procedimento não encontrado');
  if (row.after_path) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, row.after_path);
    } catch (_) {}
  }
  await supabase
    .from('patient_procedure_photos')
    .update({ after_url: null, after_path: null })
    .eq('id', procedureId);
};

/**
 * Excluir procedimento inteiro (storage + banco)
 */
export const deleteProcedure = async (procedureId: string): Promise<void> => {
  const { data: row, error: fetchError } = await supabase
    .from('patient_procedure_photos')
    .select('before_path, after_path')
    .eq('id', procedureId)
    .single();
  if (fetchError) throw fetchError;
  if (!row) return;

  if (row.before_path) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, row.before_path);
    } catch (_) {}
  }
  if (row.after_path) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, row.after_path);
    } catch (_) {}
  }
  await supabase.from('patient_procedure_photos').delete().eq('id', procedureId);
};

/**
 * Atualizar metadados do procedimento (nome, data, observações)
 */
export const updateProcedureMetadata = async (
  procedureId: string,
  params: { procedureName?: string; procedureDate?: string; notes?: string }
): Promise<PatientProcedurePhoto> => {
  const updates: Partial<PatientProcedurePhoto> = {};
  if (params.procedureName !== undefined) updates.procedure_name = params.procedureName;
  if (params.procedureDate !== undefined) updates.procedure_date = params.procedureDate;
  if (params.notes !== undefined) updates.notes = params.notes || null;
  if (Object.keys(updates).length === 0) {
    const { data } = await supabase
      .from('patient_procedure_photos')
      .select('*')
      .eq('id', procedureId)
      .single();
    if (!data) throw new Error('Procedimento não encontrado');
    return data as PatientProcedurePhoto;
  }
  const { data, error } = await supabase
    .from('patient_procedure_photos')
    .update(updates)
    .eq('id', procedureId)
    .select()
    .single();
  if (error) throw error;
  return data as PatientProcedurePhoto;
};
