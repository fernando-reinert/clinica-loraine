/**
 * Galeria do Paciente — 1 registro = 1 foto
 * Tabela: patient_photos (file_url, file_path, procedure_date, photo_type 'antes'|'depois', notes)
 */
import { supabase } from './supabase/client';
import { uploadFile, deleteFile, STORAGE_BUCKETS } from './storage/storageService';

export type PhotoType = 'antes' | 'depois';

export interface PatientPhoto {
  id: string;
  patient_id: string;
  procedure_name: string;
  procedure_date: string;
  photo_type: PhotoType;
  file_url: string;
  file_path: string;
  notes: string | null;
  created_at: string;
}

export interface CreatePhotoParams {
  patientId: string;
  file: File | Blob;
  procedureName: string;
  procedureDate: string;
  photoType: PhotoType;
  notes?: string;
}

export interface UpdatePhotoParams {
  procedureName?: string;
  procedureDate?: string;
  photoType?: PhotoType;
  notes?: string;
  file?: File | Blob;
}

/**
 * Listar fotos de um paciente (1 registro = 1 foto)
 */
export const listPhotosByPatient = async (patientId: string): Promise<PatientPhoto[]> => {
  const { data, error } = await supabase
    .from('patient_photos')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PatientPhoto[];
};

/**
 * Criar 1 registro = 1 foto (upload + insert)
 */
export const createPhoto = async (params: CreatePhotoParams): Promise<PatientPhoto> => {
  const { patientId, file, procedureName, procedureDate, photoType, notes } = params;

  const timestamp = Date.now();
  const fileExt = file instanceof File
    ? (file.name.split('.').pop() || 'jpg').toLowerCase()
    : 'jpg';
  const slug = procedureName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'foto';
  const fileName = `${timestamp}-${slug}-${photoType}.${fileExt}`;
  const filePath = `patient-gallery/${patientId}/${fileName}`;

  const uploadResult = await uploadFile({
    bucket: STORAGE_BUCKETS.PATIENT_PHOTOS,
    file,
    path: filePath,
    options: {
      contentType: file instanceof File ? file.type : 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
    },
  });

  let fileUrl: string;
  if (uploadResult.url) {
    fileUrl = uploadResult.url;
  } else {
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.PATIENT_PHOTOS)
      .getPublicUrl(uploadResult.path);
    fileUrl = urlData.publicUrl;
  }

  const { data: row, error } = await supabase
    .from('patient_photos')
    .insert({
      patient_id: patientId,
      procedure_name: procedureName,
      procedure_date: procedureDate,
      photo_type: photoType,
      file_url: fileUrl,
      file_path: uploadResult.path,
      notes: notes ?? null,
    })
    .select()
    .single();

  if (error) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, uploadResult.path);
    } catch (_) {}
    throw error;
  }

  return row as PatientPhoto;
};

/**
 * Atualizar foto: metadados e opcionalmente trocar imagem
 */
export const updatePhoto = async (
  photoId: string,
  params: UpdatePhotoParams
): Promise<PatientPhoto> => {
  const { procedureName, procedureDate, photoType, notes, file } = params;

  const updates: Partial<PatientPhoto> = {};
  if (procedureName !== undefined) updates.procedure_name = procedureName;
  if (procedureDate !== undefined) updates.procedure_date = procedureDate;
  if (photoType !== undefined) updates.photo_type = photoType;
  if (notes !== undefined) updates.notes = notes;

  if (file) {
    const { data: existing, error: existingError } = await supabase
      .from('patient_photos')
      .select('patient_id, file_path, procedure_name, photo_type')
      .eq('id', photoId)
      .single();

    if (existingError || !existing) throw new Error('Foto não encontrada');

    const timestamp = Date.now();
    const fileExt = file instanceof File
      ? (file.name.split('.').pop() || 'jpg').toLowerCase()
      : 'jpg';
    const nameForSlug = procedureName ?? existing.procedure_name ?? 'foto';
    const slug = String(nameForSlug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'foto';
    const photoTypeVal = updates.photo_type ?? existing.photo_type ?? 'antes';
    const newFileName = `${timestamp}-${slug}-${photoTypeVal}.${fileExt}`;
    const newPath = `patient-gallery/${existing.patient_id}/${newFileName}`;

    const uploadResult = await uploadFile({
      bucket: STORAGE_BUCKETS.PATIENT_PHOTOS,
      file,
      path: newPath,
      options: {
        contentType: file instanceof File ? file.type : 'image/jpeg',
        cacheControl: '31536000',
        upsert: false,
      },
    });

    let fileUrl: string;
    if (uploadResult.url) {
      fileUrl = uploadResult.url;
    } else {
      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.PATIENT_PHOTOS)
        .getPublicUrl(uploadResult.path);
      fileUrl = urlData.publicUrl;
    }

    updates.file_url = fileUrl;
    updates.file_path = uploadResult.path;

    const { data: updated, error: updateError } = await supabase
      .from('patient_photos')
      .update(updates)
      .eq('id', photoId)
      .select()
      .single();

    if (updateError) throw updateError;

    const oldPath = existing.file_path;
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, oldPath);
    } catch (_) {}

    return updated as PatientPhoto;
  }

  const { data: updated, error } = await supabase
    .from('patient_photos')
    .update(updates)
    .eq('id', photoId)
    .select()
    .single();

  if (error) throw error;
  return updated as PatientPhoto;
};

/**
 * Excluir foto: storage + banco
 */
export const deletePhoto = async (photoId: string): Promise<void> => {
  const { data: photo, error: fetchError } = await supabase
    .from('patient_photos')
    .select('file_path')
    .eq('id', photoId)
    .single();

  if (fetchError) throw fetchError;
  if (!photo) throw new Error('Foto não encontrada');

  const { error: deleteDbError } = await supabase
    .from('patient_photos')
    .delete()
    .eq('id', photoId);

  if (deleteDbError) throw deleteDbError;

  try {
    await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, photo.file_path);
  } catch (_) {}
};
