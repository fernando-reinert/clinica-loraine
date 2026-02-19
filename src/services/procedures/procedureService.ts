// src/services/procedures/procedureService.ts
// Serviço centralizado para o Catálogo de Procedimentos
//
// IMPORTANTE: O catálogo usa a tabela procedure_catalog (não a tabela procedures).
// A tabela procedures é usada pelo módulo financeiro para registros de atendimento
// (patient_id, total_amount, parcelas, etc.). listActiveProcedures() consulta
// apenas procedure_catalog (name, cost_price, sale_price, duration_minutes, is_active).

import { supabase } from '../supabase/client';
import logger from '../../utils/logger';
import type { Procedure } from '../../types/db';

export interface ProcedureInput {
  name: string;
  category?: string | null;
  duration_minutes: number;
  cost_price: number;
  sale_price: number;
  is_active?: boolean;
}

export interface ListProceduresParams {
  onlyActive?: boolean;
}

const MIN_DURATION = 5;
const MAX_DURATION = 600;

const validateProcedure = (data: ProcedureInput, isUpdate = false) => {
  const errors: string[] = [];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || data.name.trim().length < 3) {
      errors.push('Nome deve ter pelo menos 3 caracteres');
    }
  }

  if (!isUpdate || data.duration_minutes !== undefined) {
    if (
      typeof data.duration_minutes !== 'number' ||
      Number.isNaN(data.duration_minutes) ||
      data.duration_minutes < MIN_DURATION ||
      data.duration_minutes > MAX_DURATION
    ) {
      errors.push(`Duração deve estar entre ${MIN_DURATION} e ${MAX_DURATION} minutos`);
    }
  }

  if (!isUpdate || data.cost_price !== undefined) {
    if (
      typeof data.cost_price !== 'number' ||
      Number.isNaN(data.cost_price) ||
      data.cost_price < 0
    ) {
      errors.push('Preço de custo deve ser maior ou igual a 0');
    }
  }

  if (!isUpdate || data.sale_price !== undefined) {
    if (
      typeof data.sale_price !== 'number' ||
      Number.isNaN(data.sale_price) ||
      data.sale_price < 0
    ) {
      errors.push('Preço de venda deve ser maior ou igual a 0');
    }
  }

  if (errors.length > 0) {
    const message = errors.join(' | ');
    logger.warn('[PROCEDURES] Validação falhou', { errors, data });
    throw new Error(message);
  }
};

export const listProcedures = async (
  params: ListProceduresParams = {}
): Promise<Procedure[]> => {
  try {
    let query = supabase
      .from('procedure_catalog')
      .select('*')
      .order('name', { ascending: true });

    if (params.onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('[PROCEDURES] Erro ao listar procedimentos', { error });
      const message = error.message || 'Erro ao listar procedimentos';
      const details = (error as any)?.details;
      throw new Error(details ? `${message} - ${details}` : message);
    }

    logger.debug('[PROCEDURES] Procedimentos carregados', {
      count: data?.length ?? 0,
      onlyActive: params.onlyActive ?? false,
    });

    return (data as Procedure[]) || [];
  } catch (error: any) {
    logger.error('[PROCEDURES] Falha inesperada ao listar procedimentos', {
      error: error?.message || String(error),
    });
    throw error;
  }
};

/**
 * Lista apenas procedimentos ativos do catálogo
 * Usado para seleção em agendamentos
 */
export const listActiveProcedures = async (): Promise<Procedure[]> => {
  return listProcedures({ onlyActive: true });
};

export const createProcedure = async (input: ProcedureInput): Promise<Procedure> => {
  try {
    const payload: ProcedureInput = {
      ...input,
      name: input.name.trim(),
      category: input.category?.trim() || null,
      is_active: input.is_active ?? true,
    };

    validateProcedure(payload);

    logger.info('[PROCEDURES] Criando procedimento', {
      name: payload.name,
      category: payload.category,
    });

    const { data, error } = await supabase
      .from('procedure_catalog')
      .insert([
        {
          name: payload.name,
          category: payload.category,
          duration_minutes: payload.duration_minutes,
          cost_price: payload.cost_price,
          sale_price: payload.sale_price,
          is_active: payload.is_active ?? true,
        },
      ])
      .select('*')
      .single();

    if (error) {
      logger.error('[PROCEDURES] Erro ao criar procedimento', { error });
      const message = error.message || 'Erro ao criar procedimento';
      const details = (error as any)?.details;
      throw new Error(details ? `${message} - ${details}` : message);
    }

    logger.info('[PROCEDURES] Procedimento criado com sucesso', {
      id: data.id,
      name: data.name,
    });

    return data as Procedure;
  } catch (error: any) {
    logger.error('[PROCEDURES] Falha inesperada ao criar procedimento', {
      error: error?.message || String(error),
    });
    throw error;
  }
};

export const updateProcedure = async (
  id: string,
  updates: Partial<ProcedureInput>
): Promise<Procedure> => {
  try {
    const trimmed: Partial<ProcedureInput> = {
      ...updates,
      name: updates.name?.trim(),
      category: updates.category?.trim(),
    };

    // Para validação, mesclar com defaults mínimos apenas dos campos presentes
    const validationSample: ProcedureInput = {
      name: trimmed.name ?? '___',
      category: trimmed.category ?? null,
      duration_minutes: trimmed.duration_minutes ?? MIN_DURATION,
      cost_price: trimmed.cost_price ?? 0,
      sale_price: trimmed.sale_price ?? 0,
      is_active: trimmed.is_active ?? true,
    };

    validateProcedure(validationSample, true);

    logger.info('[PROCEDURES] Atualizando procedimento', { id, updates: trimmed });

    const { data, error } = await supabase
      .from('procedure_catalog')
      .update(trimmed)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('[PROCEDURES] Erro ao atualizar procedimento', { id, error });
      const message = error.message || 'Erro ao atualizar procedimento';
      const details = (error as any)?.details;
      throw new Error(details ? `${message} - ${details}` : message);
    }

    logger.info('[PROCEDURES] Procedimento atualizado com sucesso', {
      id: data.id,
      name: data.name,
    });

    return data as Procedure;
  } catch (error: any) {
    logger.error('[PROCEDURES] Falha inesperada ao atualizar procedimento', {
      id,
      error: error?.message || String(error),
    });
    throw error;
  }
};

export const toggleActive = async (id: string, is_active: boolean): Promise<Procedure> => {
  try {
    logger.info('[PROCEDURES] Alterando status de procedimento', { id, is_active });

    const { data, error } = await supabase
      .from('procedure_catalog')
      .update({ is_active })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      logger.error('[PROCEDURES] Erro ao alterar status de procedimento', {
        id,
        error,
      });
      const message = error.message || 'Erro ao alterar status de procedimento';
      const details = (error as any)?.details;
      throw new Error(details ? `${message} - ${details}` : message);
    }

    logger.info('[PROCEDURES] Status de procedimento atualizado', {
      id: data.id,
      is_active: data.is_active,
    });

    return data as Procedure;
  } catch (error: any) {
    logger.error('[PROCEDURES] Falha inesperada ao alterar status', {
      id,
      error: error?.message || String(error),
    });
    throw error;
  }
};

