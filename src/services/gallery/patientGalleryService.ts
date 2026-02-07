/**
 * Galeria do Paciente por PROCEDIMENTO — multi-foto antes/depois
 * Tabelas: patient_procedure_photos (legacy before_url/after_url) + procedure_images (multi)
 * Storage: patients/{patientId}/procedures/{procedureId}/{type}/{uuid}.ext
 */
import { supabase } from '../supabase/client';
import { uploadFile, deleteFile, STORAGE_BUCKETS } from '../storage/storageService';

export interface ProcedureImageItem {
  id: string;
  url: string;
  path?: string;
  position: number;
}

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
  /** Multi-foto: preenchido por listByPatient (procedure_images + fallback legacy) */
  before_images: ProcedureImageItem[];
  after_images: ProcedureImageItem[];
}

export interface CreateProcedureWithPhotosParams {
  patientId: string;
  procedureName: string;
  procedureDate: string;
  notes?: string;
  beforeFiles?: File[];
  afterFiles?: File[];
}

interface ProcedureImageRow {
  id: string;
  procedure_id: string;
  type: 'before' | 'after';
  url: string;
  path: string | null;
  position: number;
}

function getFileExt(file: File): string {
  return (file.name.split('.').pop() || 'jpg').toLowerCase();
}

function getPublicUrl(path: string): string {
  const { data } = supabase.storage.from(STORAGE_BUCKETS.PATIENT_PHOTOS).getPublicUrl(path);
  return data.publicUrl;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/x/g, () =>
    (Math.random() * 16 | 0).toString(16)
  );
}

async function uploadOneToPath(
  patientId: string,
  procedureId: string,
  file: File,
  slot: 'before' | 'after',
  position: number
): Promise<{ url: string; path: string }> {
  const ext = getFileExt(file);
  const path = `patients/${patientId}/procedures/${procedureId}/${slot}/${uuid()}.${ext}`;
  const result = await uploadFile({
    bucket: STORAGE_BUCKETS.PATIENT_PHOTOS,
    file,
    path,
    options: {
      contentType: file.type || 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    },
  });
  const url = result.url || getPublicUrl(result.path);
  return { url, path: result.path };
}

/**
 * Listar procedimentos com before_images e after_images (procedure_images + fallback legacy)
 */
export const listByPatient = async (patientId: string): Promise<PatientProcedurePhoto[]> => {
  const { data: rows, error } = await supabase
    .from('patient_procedure_photos')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const procedures = (rows ?? []) as (PatientProcedurePhoto & { before_images?: never; after_images?: never })[];

  if (procedures.length === 0) return procedures as PatientProcedurePhoto[];

  const procedureIds = procedures.map((p) => p.id);
  const { data: images, error: imgError } = await supabase
    .from('procedure_images')
    .select('id, procedure_id, type, url, path, position')
    .in('procedure_id', procedureIds)
    .order('position', { ascending: true });
  if (imgError) throw imgError;
  const imageList = (images ?? []) as ProcedureImageRow[];

  const byProcedure = new Map<string, { before: ProcedureImageItem[]; after: ProcedureImageItem[] }>();
  for (const proc of procedures) {
    byProcedure.set(proc.id, { before: [], after: [] });
  }
  for (const img of imageList) {
    const item: ProcedureImageItem = {
      id: img.id,
      url: img.url,
      path: img.path ?? undefined,
      position: img.position,
    };
    const entry = byProcedure.get(img.procedure_id);
    if (entry) {
      if (img.type === 'before') entry.before.push(item);
      else entry.after.push(item);
    }
  }

  return procedures.map((proc) => {
    const entry = byProcedure.get(proc.id)!;
    let before_images = entry.before;
    let after_images = entry.after;
    if (before_images.length === 0 && proc.before_url) {
      before_images = [{ id: `legacy-before-${proc.id}`, url: proc.before_url, path: proc.before_path ?? undefined, position: 0 }];
    }
    if (after_images.length === 0 && proc.after_url) {
      after_images = [{ id: `legacy-after-${proc.id}`, url: proc.after_url, path: proc.after_path ?? undefined, position: 0 }];
    }
    return {
      ...proc,
      before_images,
      after_images,
    } as PatientProcedurePhoto;
  });
};

/**
 * Criar procedimento com múltiplas fotos antes/depois (procedure_images apenas; legacy cols não usados)
 */
export const createProcedureWithPhotos = async (
  params: CreateProcedureWithPhotosParams
): Promise<PatientProcedurePhoto> => {
  const { patientId, procedureName, procedureDate, notes, beforeFiles = [], afterFiles = [] } = params;

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

  try {
    for (let i = 0; i < beforeFiles.length; i++) {
      const { url, path } = await uploadOneToPath(patientId, procedureId, beforeFiles[i], 'before', i);
      await supabase.from('procedure_images').insert({
        procedure_id: procedureId,
        type: 'before',
        url,
        path,
        position: i,
      });
    }
    for (let i = 0; i < afterFiles.length; i++) {
      const { url, path } = await uploadOneToPath(patientId, procedureId, afterFiles[i], 'after', i);
      await supabase.from('procedure_images').insert({
        procedure_id: procedureId,
        type: 'after',
        url,
        path,
        position: i,
      });
    }
  } catch (e) {
    await supabase.from('patient_procedure_photos').delete().eq('id', procedureId);
    throw e;
  }

  const list = await listByPatient(patientId);
  const created = list.find((p) => p.id === procedureId);
  if (!created) throw new Error('Procedimento criado mas não encontrado');
  return created;
};

/**
 * Obter próximo position para um tipo em um procedimento
 */
async function getNextPosition(procedureId: string, type: 'before' | 'after'): Promise<number> {
  const { data, error } = await supabase
    .from('procedure_images')
    .select('position')
    .eq('procedure_id', procedureId)
    .eq('type', type)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? data.position + 1 : 0;
}

/**
 * Adicionar múltiplas fotos ANTES (append)
 */
export const addBeforePhotos = async (procedureId: string, files: File[]): Promise<void> => {
  if (files.length === 0) return;
  const { data: row, error: fetchError } = await supabase
    .from('patient_procedure_photos')
    .select('patient_id')
    .eq('id', procedureId)
    .single();
  if (fetchError || !row) throw new Error('Procedimento não encontrado');

  let position = await getNextPosition(procedureId, 'before');
  for (const file of files) {
    const { url, path } = await uploadOneToPath(row.patient_id, procedureId, file, 'before', position);
    await supabase.from('procedure_images').insert({
      procedure_id: procedureId,
      type: 'before',
      url,
      path,
      position,
    });
    position += 1;
  }
};

/**
 * Adicionar múltiplas fotos DEPOIS (append)
 */
export const addAfterPhotos = async (procedureId: string, files: File[]): Promise<void> => {
  if (files.length === 0) return;
  const { data: row, error: fetchError } = await supabase
    .from('patient_procedure_photos')
    .select('patient_id')
    .eq('id', procedureId)
    .single();
  if (fetchError || !row) throw new Error('Procedimento não encontrado');

  let position = await getNextPosition(procedureId, 'after');
  for (const file of files) {
    const { url, path } = await uploadOneToPath(row.patient_id, procedureId, file, 'after', position);
    await supabase.from('procedure_images').insert({
      procedure_id: procedureId,
      type: 'after',
      url,
      path,
      position,
    });
    position += 1;
  }
};

/**
 * Excluir uma imagem (procedure_images + storage). Para legacy use deleteBeforePhoto/deleteAfterPhoto.
 */
export const deleteProcedureImage = async (imageId: string): Promise<void> => {
  if (imageId.startsWith('legacy-')) {
    const match = imageId.match(/^legacy-(before|after)-(.+)$/);
    if (match) {
      const type = match[1] as 'before' | 'after';
      const procedureId = match[2];
      if (type === 'before') await deleteBeforePhoto(procedureId);
      else await deleteAfterPhoto(procedureId);
    }
    return;
  }
  const { data: row, error: fetchError } = await supabase
    .from('procedure_images')
    .select('path')
    .eq('id', imageId)
    .single();
  if (fetchError || !row) throw new Error('Imagem não encontrada');
  if (row.path) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, row.path);
    } catch (_) {}
  }
  await supabase.from('procedure_images').delete().eq('id', imageId);
};

/**
 * Excluir foto ANTES (legacy: único before_url) — mantém procedimento
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
 * Excluir foto DEPOIS (legacy) — mantém procedimento
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
 * Excluir procedimento inteiro (procedure_images + legacy storage + row)
 */
export const deleteProcedure = async (procedureId: string): Promise<void> => {
  const { data: proc, error: fetchError } = await supabase
    .from('patient_procedure_photos')
    .select('before_path, after_path')
    .eq('id', procedureId)
    .single();
  if (fetchError) throw fetchError;
  if (!proc) return;

  const { data: images } = await supabase
    .from('procedure_images')
    .select('id, path')
    .eq('procedure_id', procedureId);
  for (const img of images ?? []) {
    if (img.path) {
      try {
        await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, img.path);
      } catch (_) {}
    }
  }
  await supabase.from('procedure_images').delete().eq('procedure_id', procedureId);

  if (proc.before_path) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, proc.before_path);
    } catch (_) {}
  }
  if (proc.after_path) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, proc.after_path);
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
  const updates: Record<string, unknown> = {};
  if (params.procedureName !== undefined) updates.procedure_name = params.procedureName;
  if (params.procedureDate !== undefined) updates.procedure_date = params.procedureDate;
  if (params.notes !== undefined) updates.notes = params.notes || null;
  if (Object.keys(updates).length === 0) {
    const { data: proc } = await supabase
      .from('patient_procedure_photos')
      .select('patient_id')
      .eq('id', procedureId)
      .single();
    if (!proc?.patient_id) throw new Error('Procedimento não encontrado');
    const list = await listByPatient(proc.patient_id);
    const found = list.find((p) => p.id === procedureId);
    if (!found) throw new Error('Procedimento não encontrado');
    return found;
  }
  const { data, error } = await supabase
    .from('patient_procedure_photos')
    .update(updates)
    .eq('id', procedureId)
    .select()
    .single();
  if (error) throw error;
  const list = await listByPatient(data.patient_id);
  const updated = list.find((p) => p.id === procedureId);
  if (!updated) throw new Error('Procedimento não encontrado');
  return updated;
};
