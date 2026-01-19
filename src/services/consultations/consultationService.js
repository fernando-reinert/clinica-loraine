/**
 * Service para gerenciar consultas
 * Normaliza campos de data antes de enviar ao Supabase
 */
import { supabase } from '../supabase/client';
import logger from '../../utils/logger';
/**
 * Campos de data conhecidos na tabela consultations
 */
const DATE_FIELDS = [
    'date',
    'next_appointment',
    'appointment_date',
    'return_date',
    'procedure_date',
];
/**
 * Normalizar campos de data em um payload
 * - Strings vazias "" -> null
 * - Datas válidas (Date ou string) -> formato "YYYY-MM-DD"
 * - null/undefined -> null
 *
 * @param payload - Objeto com dados da consulta
 * @returns Payload normalizado
 */
export function normalizeDates(payload) {
    const normalized = { ...payload };
    for (const key of Object.keys(normalized)) {
        // Verificar se é um campo de data conhecido ou contém "date" no nome
        const isDateField = DATE_FIELDS.includes(key) ||
            key.toLowerCase().includes('date') ||
            key.toLowerCase().includes('appointment');
        if (isDateField) {
            const value = normalized[key];
            // String vazia -> null
            if (value === '' || value === undefined) {
                normalized[key] = null;
            }
            // Date object -> formato "YYYY-MM-DD"
            else if (value instanceof Date) {
                normalized[key] = value.toISOString().split('T')[0];
            }
            // String válida -> verificar se é formato válido e manter, senão null
            else if (typeof value === 'string' && value.trim() !== '') {
                // Validar formato de data (YYYY-MM-DD)
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (dateRegex.test(value)) {
                    normalized[key] = value;
                }
                else {
                    // Tentar parsear e converter
                    const parsed = new Date(value);
                    if (!isNaN(parsed.getTime())) {
                        normalized[key] = parsed.toISOString().split('T')[0];
                    }
                    else {
                        // Data inválida -> null
                        logger.warn(`[CONSULTATION] Data inválida no campo ${key}: "${value}", convertendo para null`);
                        normalized[key] = null;
                    }
                }
            }
            // null -> null (já está correto)
            else if (value === null) {
                normalized[key] = null;
            }
        }
    }
    return normalized;
}
/**
 * Criar nova consulta
 * Normaliza datas automaticamente antes de inserir
 */
export async function createConsultation(data) {
    // Normalizar datas
    const normalized = normalizeDates(data);
    // Log em dev (usar console.log também para garantir visibilidade)
    if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
        logger.debug('[CONSULTATION] Payload normalizado antes de inserir:', normalized);
        console.log('[CONSULTATION] Payload normalizado antes de inserir:', normalized);
    }
    const { data: consultation, error } = await supabase
        .from('consultations')
        .insert([normalized])
        .select()
        .single();
    if (error) {
        logger.error('[CONSULTATION] Erro ao criar consulta:', error);
        throw error;
    }
    return consultation;
}
/**
 * Atualizar consulta existente
 * Normaliza datas automaticamente antes de atualizar
 */
export async function updateConsultation(consultationId, updates) {
    // Normalizar datas
    const normalized = normalizeDates(updates);
    // Log em dev (usar console.log também para garantir visibilidade)
    if (process.env.NODE_ENV === 'development' || import.meta.env.DEV) {
        logger.debug('[CONSULTATION] Payload normalizado antes de atualizar:', normalized);
        console.log('[CONSULTATION] Payload normalizado antes de atualizar:', normalized);
    }
    const { data: consultation, error } = await supabase
        .from('consultations')
        .update(normalized)
        .eq('id', consultationId)
        .select()
        .single();
    if (error) {
        logger.error('[CONSULTATION] Erro ao atualizar consulta:', error);
        throw error;
    }
    return consultation;
}
