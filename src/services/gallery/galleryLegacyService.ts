// Legado: galeria por fotos soltas (tabela photos) — usado por GalleryScreen global
import { supabase } from '../supabase/client';
import { uploadFile, deleteFile, STORAGE_BUCKETS } from '../storage/storageService';
import logger from '../../utils/logger';

export interface PatientPhoto {
  id: string;
  patient_id: string;
  procedure_name: string;
  photo_type: 'before' | 'after';
  photo_url: string;
  metadata: {
    patient_name?: string;
    region?: string;
    notes?: string;
    procedure_date?: string;
    photo_date?: string;
  };
  created_at: string;
}

export interface UploadPhotoParams {
  patientId: string;
  file: File | Blob;
  procedureName: string;
  photoType: 'before' | 'after';
  procedureDate?: string;
  region?: string;
  notes?: string;
  patientName?: string;
}

export const listPatientPhotos = async (patientId: string): Promise<PatientPhoto[]> => {
  try {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error: any) {
    logger.error('[GALLERY] Erro ao listar fotos do paciente:', error);
    throw error;
  }
};

export const uploadPatientPhoto = async (params: UploadPhotoParams): Promise<PatientPhoto> => {
  try {
    const { patientId, file, procedureName, photoType, procedureDate, region, notes, patientName } = params;
    const timestamp = Date.now();
    const fileExt = file instanceof File ? (file.name.split('.').pop() || 'jpg').toLowerCase() : 'jpg';
    const sanitizedProcedure = procedureName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const fileName = `${timestamp}-${sanitizedProcedure}-${photoType}.${fileExt}`;
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

    let photoUrl: string;
    if (uploadResult.url) {
      photoUrl = uploadResult.url;
    } else {
      const { data: urlData } = supabase.storage.from(STORAGE_BUCKETS.PATIENT_PHOTOS).getPublicUrl(uploadResult.path);
      photoUrl = urlData.publicUrl;
    }

    const { data: photoData, error: dbError } = await supabase
      .from('photos')
      .insert([
        {
          patient_id: patientId,
          procedure_name: procedureName,
          photo_type: photoType,
          photo_url: photoUrl,
          metadata: {
            patient_name: patientName,
            region: region || null,
            notes: notes || null,
            procedure_date: procedureDate || null,
            photo_date: new Date().toISOString().split('T')[0],
          },
        },
      ])
      .select()
      .single();

    if (dbError) {
      try {
        await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, uploadResult.path);
      } catch (_) {}
      throw dbError;
    }
    return photoData as PatientPhoto;
  } catch (error: any) {
    logger.error('[GALLERY] Erro ao fazer upload de foto:', error);
    throw error;
  }
};

export const deletePatientPhoto = async (photoId: string): Promise<void> => {
  const { data: photo, error: fetchError } = await supabase
    .from('photos')
    .select('photo_url, patient_id')
    .eq('id', photoId)
    .single();
  if (fetchError) throw fetchError;
  if (!photo) throw new Error('Foto não encontrada');

  let storagePath: string | null = null;
  if (photo.photo_url.includes('/storage/v1/object/public/')) {
    const urlParts = photo.photo_url.split('/storage/v1/object/public/');
    if (urlParts.length > 1) {
      const pathParts = urlParts[1].split('/');
      if (pathParts.length > 1) storagePath = pathParts.slice(1).join('/');
    }
  } else if (photo.photo_url.includes('/storage/v1/object/sign/')) {
    storagePath = `patient-gallery/${photo.patient_id}/${photo.photo_url.split('/').pop()}`;
  }

  const { error: dbError } = await supabase.from('photos').delete().eq('id', photoId);
  if (dbError) throw dbError;
  if (storagePath) {
    try {
      await deleteFile(STORAGE_BUCKETS.PATIENT_PHOTOS, storagePath);
    } catch (_) {}
  }
};

export const updatePhotoMetadata = async (
  photoId: string,
  metadata: Partial<PatientPhoto['metadata']>
): Promise<PatientPhoto> => {
  const { data, error } = await supabase
    .from('photos')
    .update({ metadata })
    .eq('id', photoId)
    .select()
    .single();
  if (error) throw error;
  return data as PatientPhoto;
};
