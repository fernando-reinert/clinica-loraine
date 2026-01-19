// src/services/medical-record/medicalRecordService.ts
// Serviço para gerenciar prontuário médico e atendimentos
import { supabase } from '../supabase/client';
import { uploadStickerPhoto } from '../storage/storageService';
/**
 * Criar ou atualizar visit a partir de appointment
 */
export const createOrUpdateVisitFromAppointment = async (appointmentId, patientId, professionalId, visitDate, status = 'scheduled') => {
    // Verificar se já existe
    const { data: existing } = await supabase
        .from('visits')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();
    if (existing) {
        // Atualizar
        const { data, error } = await supabase
            .from('visits')
            .update({
            visit_date: visitDate,
            status,
            updated_at: new Date().toISOString(),
        })
            .eq('id', existing.id)
            .select()
            .single();
        if (error) {
            throw new Error(`Erro ao atualizar atendimento: ${error.message}`);
        }
        return data;
    }
    else {
        // Criar novo
        const { data, error } = await supabase
            .from('visits')
            .insert([
            {
                appointment_id: appointmentId,
                patient_id: patientId,
                professional_id: professionalId,
                visit_date: visitDate,
                status,
            },
        ])
            .select()
            .single();
        if (error) {
            throw new Error(`Erro ao criar atendimento: ${error.message}`);
        }
        return data;
    }
};
/**
 * Buscar atendimentos de um paciente
 */
export const getVisitsByPatient = async (patientId) => {
    const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', patientId)
        .order('visit_date', { ascending: false });
    if (error) {
        throw new Error(`Erro ao buscar atendimentos: ${error.message}`);
    }
    return data || [];
};
/**
 * Buscar atendimento por ID
 */
export const getVisitById = async (visitId) => {
    const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('id', visitId)
        .single();
    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw new Error(`Erro ao buscar atendimento: ${error.message}`);
    }
    return data;
};
/**
 * Criar procedimento realizado em um atendimento
 */
export const createVisitProcedure = async (params) => {
    const { data, error } = await supabase
        .from('visit_procedures')
        .insert([
        {
            visit_id: params.visitId,
            procedure_id: params.procedureId,
            procedure_name: params.procedureName,
            performed_at: new Date().toISOString(),
            professional_id: params.professionalId,
            units: params.units || 1,
            lot_number: params.lotNumber || null,
            brand: params.brand || null,
            observations: params.observations || null,
        },
    ])
        .select()
        .single();
    if (error) {
        throw new Error(`Erro ao criar procedimento: ${error.message}`);
    }
    return data;
};
/**
 * Buscar procedimentos de um atendimento
 */
export const getVisitProceduresByVisit = async (visitId) => {
    const { data, error } = await supabase
        .from('visit_procedures')
        .select('*')
        .eq('visit_id', visitId)
        .order('performed_at', { ascending: false });
    if (error) {
        throw new Error(`Erro ao buscar procedimentos: ${error.message}`);
    }
    return data || [];
};
/**
 * Buscar procedimentos de um paciente (todos os atendimentos)
 */
export const getVisitProceduresByPatient = async (patientId) => {
    const { data, error } = await supabase
        .from('visit_procedures')
        .select(`
      *,
      visit:visits!inner(patient_id)
    `)
        .eq('visit.patient_id', patientId)
        .order('performed_at', { ascending: false });
    if (error) {
        throw new Error(`Erro ao buscar procedimentos: ${error.message}`);
    }
    return data || [];
};
/**
 * Upload de foto do adesivo do produto
 */
export const uploadProcedureSticker = async (params) => {
    // Upload do arquivo
    const fileUrl = await uploadStickerPhoto({
        patientId: params.patientId,
        visitId: params.visitId,
        file: params.file,
        procedureName: params.procedureName,
    });
    // Criar registro no banco
    const { data, error } = await supabase
        .from('procedure_attachments')
        .insert([
        {
            visit_procedure_id: params.visitProcedureId,
            attachment_type: 'sticker',
            file_url: fileUrl,
            file_name: params.file.name,
            file_size: params.file.size,
            mime_type: params.file.type,
            metadata: {},
        },
    ])
        .select()
        .single();
    if (error) {
        throw new Error(`Erro ao salvar foto do adesivo: ${error.message}`);
    }
    return data;
};
/**
 * Buscar anexos de um procedimento
 */
export const getProcedureAttachments = async (visitProcedureId) => {
    const { data, error } = await supabase
        .from('procedure_attachments')
        .select('*')
        .eq('visit_procedure_id', visitProcedureId)
        .order('created_at', { ascending: false });
    if (error) {
        throw new Error(`Erro ao buscar anexos: ${error.message}`);
    }
    return data || [];
};
/**
 * Buscar histórico completo do paciente (visits + procedures + consents)
 */
export const getPatientMedicalHistory = async (patientId) => {
    // Buscar visits
    const visits = await getVisitsByPatient(patientId);
    // Para cada visit, buscar procedures e consents
    const visitsWithDetails = await Promise.all(visits.map(async (visit) => {
        const procedures = await getVisitProceduresByVisit(visit.id);
        const proceduresWithDetails = await Promise.all(procedures.map(async (procedure) => {
            // Buscar consent form
            const { data: consentForms } = await supabase
                .from('consent_forms')
                .select('*')
                .eq('visit_procedure_id', procedure.id)
                .order('created_at', { ascending: false })
                .limit(1);
            // Buscar attachments
            const attachments = await getProcedureAttachments(procedure.id);
            return {
                ...procedure,
                consentForm: consentForms?.[0] || null,
                attachments,
            };
        }));
        return {
            ...visit,
            procedures: proceduresWithDetails,
        };
    }));
    return visitsWithDetails;
};
