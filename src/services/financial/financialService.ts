// src/services/financial/financialService.ts
import { supabase } from '../supabase/client';
import logger from '../../utils/logger';

// ============================================
// TIPOS
// ============================================

export interface ProcedureCatalogItem {
  id: string;
  name: string;
  category: string;
  cost_price: number;
  sale_price: number;
  is_active: boolean;
}

export interface FinancialProcedureItem {
  id?: string;
  procedure_catalog_id: string;
  procedure_name_snapshot: string;
  cost_price_snapshot: number;
  final_price_snapshot: number;
  quantity: number;
  discount: number;
  profit_snapshot: number;
}

export interface FinancialRecord {
  id: string;
  patient_id: string;
  client_name: string;
  procedure_type?: string; // Legado - para registros antigos
  total_amount: number;
  total_cost: number;
  total_profit: number;
  profit_margin: number;
  total_installments: number;
  payment_method: string;
  first_payment_date: string;
  status: string;
  appointment_id?: string | null;
  created_at: string;
  items?: FinancialProcedureItem[]; // Itens quando carregados com join
}

export interface Installment {
  id: string;
  procedure_id: string;
  installment_number: number;
  installment_value: number;
  due_date: string;
  status: string;
  paid_date?: string | null;
  payment_method?: string | null;
  created_at: string;
}

export interface CreateFinancialRecordInput {
  patientId: string;
  patientName: string;
  items: FinancialProcedureItem[];
  installmentsConfig: {
    count: number;
    paymentMethod: string;
    firstPaymentDate: string;
  };
  appointmentId?: string | null;
  procedureType?: string; // Legado - para compatibilidade
}

export interface CreateFinancialRecordResult {
  record: FinancialRecord;
  removedFields?: string[]; // Campos que foram removidos do payload por não existirem no schema
}

// ============================================
// FUNÇÕES HELPER
// ============================================

/**
 * Detecta se o erro é relacionado a coluna inexistente no schema
 */
const isColumnNotFoundError = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || '';
  
  return (
    errorCode === 'PGRST204' ||
    errorMessage.includes('could not find') ||
    errorMessage.includes('column') && errorMessage.includes('does not exist') ||
    errorMessage.includes('schema cache') ||
    errorMessage.includes('not found') && errorMessage.includes('column')
  );
};

/**
 * Tenta inserir registro financeiro com fallback automático para colunas ausentes
 * Retorna: { data, error, removedFields }
 */
const insertFinancialRecordWithFallback = async (
  payload: Record<string, any>
): Promise<{ data: any; error: any; removedFields: string[] }> => {
  // Campos opcionais que podem não existir no schema (ordem de remoção)
  const optionalFields = ['user_id', 'profit_margin', 'total_profit', 'total_cost'];
  
  // Log do payload inicial
  logger.info('[FINANCIAL] Tentando inserir registro financeiro', {
    payloadKeys: Object.keys(payload),
    optionalFieldsPresent: optionalFields.filter(f => payload[f] !== undefined),
  });

  // Primeira tentativa: com todos os campos
  let { data, error } = await supabase
    .from('procedures')
    .insert([payload])
    .select('*')
    .single();

  // Se sucesso, retornar
  if (!error && data) {
    logger.info('[FINANCIAL] Registro criado com todas as colunas', { id: data.id });
    return { data, error: null, removedFields: [] };
  }

  // Se erro não for de coluna inexistente, retornar erro original
  if (!isColumnNotFoundError(error)) {
    logger.error('[FINANCIAL] Erro não relacionado a coluna inexistente', { error });
    return { data: null, error, removedFields: [] };
  }

  // Fallback: remover campos opcionais e tentar novamente
  logger.warn('[FINANCIAL] Coluna não encontrada no schema, iniciando fallback', {
    errorMessage: error?.message,
    errorCode: error?.code,
  });

  const fallbackPayload = { ...payload };
  let removedFields: string[] = [];

  // Estratégia: remover todos os campos opcionais de uma vez e tentar
  // Se ainda falhar, tentar remover um por um
  for (const field of optionalFields) {
    if (fallbackPayload[field] !== undefined) {
      delete fallbackPayload[field];
      removedFields.push(field);
    }
  }

  // Tentar com todos os campos opcionais removidos
  logger.info('[FINANCIAL] Tentando sem campos opcionais', {
    removedFields,
    remainingPayloadKeys: Object.keys(fallbackPayload),
  });

  let retryResult = await supabase
    .from('procedures')
    .insert([fallbackPayload])
    .select('*')
    .single();

  if (!retryResult.error && retryResult.data) {
    logger.warn('[FINANCIAL] Registro criado com fallback (campos removidos)', {
      id: retryResult.data.id,
      removedFields,
    });
    return { data: retryResult.data, error: null, removedFields };
  }

  // Se ainda der erro de coluna, pode ser outro campo problemático
  if (isColumnNotFoundError(retryResult.error)) {
    logger.error('[FINANCIAL] Ainda há coluna inexistente após remover campos opcionais', {
      error: retryResult.error,
      removedFields,
    });
    // Retornar erro mas com informação dos campos já removidos
    return { data: null, error: retryResult.error, removedFields };
  }

  // Erro diferente (não é coluna inexistente)
  logger.error('[FINANCIAL] Erro diferente após remover campos opcionais', {
    error: retryResult.error,
    removedFields,
  });
  return { data: null, error: retryResult.error, removedFields };
};

// ============================================
// FUNÇÕES DE SERVIÇO
// ============================================

/**
 * Cria um registro financeiro completo:
 * 1. Calcula totais (amount, cost, profit, margin)
 * 2. Insere registro em procedures (com fallback para colunas ausentes)
 * 3. Insere itens em procedure_items (lote)
 * 4. Insere parcelas em installments (lote)
 * 
 * Retorna o registro criado e informações sobre campos removidos (se houver)
 */
export const createFinancialRecord = async (
  input: CreateFinancialRecordInput
): Promise<CreateFinancialRecordResult> => {
  try {
    const { patientId, patientName, items, installmentsConfig, appointmentId, procedureType } = input;

    // Validar itens
    if (!items || items.length === 0) {
      throw new Error('É necessário pelo menos um item de procedimento');
    }

    // Calcular totais
    const totalAmount = items.reduce(
      (sum, item) => sum + (item.final_price_snapshot * item.quantity - item.discount),
      0
    );
    const totalCost = items.reduce(
      (sum, item) => sum + (item.cost_price_snapshot * item.quantity),
      0
    );
    const totalProfit = items.reduce((sum, item) => sum + item.profit_snapshot, 0);
    const profitMargin = totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

    // Preparar nome do procedimento (legado ou concatenado)
    const procedureTypeName = procedureType || items.map(i => i.procedure_name_snapshot).join(' + ');

    // 1. Criar registro financeiro com fallback
    // Obter user_id do contexto de autenticação
    const { data: { user } } = await supabase.auth.getUser();
    
    // Montar payload completo
    const fullPayload: Record<string, any> = {
      patient_id: patientId,
      client_name: patientName,
      procedure_type: procedureTypeName,
      total_amount: totalAmount,
      total_installments: installmentsConfig.count,
      payment_method: installmentsConfig.paymentMethod,
      first_payment_date: installmentsConfig.firstPaymentDate,
      status: 'pendente',
    };

    // Adicionar campos opcionais (podem não existir no schema)
    if (user?.id) {
      fullPayload.user_id = user.id;
    }
    if (appointmentId) {
      fullPayload.appointment_id = appointmentId;
    }
    fullPayload.total_cost = totalCost;
    fullPayload.total_profit = totalProfit;
    fullPayload.profit_margin = Number(profitMargin.toFixed(2));

    // Tentar inserir com fallback
    const insertResult = await insertFinancialRecordWithFallback(fullPayload);

    if (insertResult.error || !insertResult.data) {
      logger.error('[FINANCIAL] Erro ao criar registro financeiro após fallback', {
        error: insertResult.error,
        removedFields: insertResult.removedFields,
      });
      throw new Error(insertResult.error?.message || 'Erro ao criar registro financeiro');
    }

    const financialRecord = insertResult.data;
    
    // Se campos foram removidos, logar aviso
    if (insertResult.removedFields && insertResult.removedFields.length > 0) {
      logger.warn('[FINANCIAL] Registro criado sem alguns campos (schema desatualizado)', {
        removedFields: insertResult.removedFields,
        procedureId: financialRecord.id,
      });
    }

    const procedureId = financialRecord.id;

    // 2. Inserir itens em lote
    const itemsPayload = items.map(item => ({
      procedure_id: procedureId,
      procedure_catalog_id: item.procedure_catalog_id,
      procedure_name_snapshot: item.procedure_name_snapshot,
      cost_price_snapshot: item.cost_price_snapshot,
      final_price_snapshot: item.final_price_snapshot,
      quantity: item.quantity,
      discount: item.discount,
      profit_snapshot: item.profit_snapshot,
    }));

    const { error: itemsError } = await supabase.from('procedure_items').insert(itemsPayload);

    if (itemsError) {
      // Se a tabela não existir, apenas logar warning mas não falhar (compatibilidade)
      if (
        itemsError.code === 'PGRST116' || 
        itemsError.message?.includes('relation') || 
        itemsError.message?.includes('does not exist') ||
        itemsError.message?.includes('Not Found') ||
        (itemsError as any)?.status === 404
      ) {
        logger.warn('[FINANCIAL] Tabela procedure_items não encontrada. Execute a migration 20260121000000_financial_procedure_items.sql no Supabase.', { itemsError });
        // Não fazer rollback - permitir que o registro financeiro seja criado sem itens
        // Isso mantém compatibilidade enquanto a migration não é executada
      } else {
        // Rollback: remover registro financeiro apenas se for outro tipo de erro
        await supabase.from('procedures').delete().eq('id', procedureId);
        logger.error('[FINANCIAL] Erro ao inserir itens', { itemsError });
        throw new Error(itemsError.message || 'Erro ao inserir itens de procedimento');
      }
    }

    // 3. Calcular e inserir parcelas em lote
    const installmentValue = totalAmount / installmentsConfig.count;
    const installmentsPayload: any[] = [];

    for (let i = 0; i < installmentsConfig.count; i++) {
      const dueDate = new Date(installmentsConfig.firstPaymentDate);
      dueDate.setMonth(dueDate.getMonth() + i);

      installmentsPayload.push({
        procedure_id: procedureId,
        installment_number: i + 1,
        installment_value: Number(installmentValue.toFixed(2)),
        due_date: dueDate.toISOString().split('T')[0],
        status: 'pendente',
        payment_method: installmentsConfig.paymentMethod,
      });
    }

    const { error: installmentsError } = await supabase.from('installments').insert(installmentsPayload);

    if (installmentsError) {
      // Rollback: remover registro e itens (se a tabela existir)
      try {
        await supabase.from('procedure_items').delete().eq('procedure_id', procedureId);
      } catch (err: any) {
        // Ignorar se a tabela não existir
        logger.warn('[FINANCIAL] Não foi possível remover itens no rollback (tabela pode não existir)', { err });
      }
      await supabase.from('procedures').delete().eq('id', procedureId);
      logger.error('[FINANCIAL] Erro ao inserir parcelas', { installmentsError });
      throw new Error(installmentsError.message || 'Erro ao criar parcelas');
    }

    logger.info('[FINANCIAL] Registro financeiro criado com sucesso', {
      procedureId,
      totalAmount,
      itemsCount: items.length,
      installmentsCount: installmentsConfig.count,
      removedFields: insertResult.removedFields || [],
    });

    return {
      record: financialRecord as FinancialRecord,
      removedFields: insertResult.removedFields || [],
    };
  } catch (error: any) {
    logger.error('[FINANCIAL] Falha ao criar registro financeiro', {
      error: error?.message || String(error),
    });
    throw error;
  }
};

/**
 * Lista registros financeiros com seus itens (se existirem)
 */
export const listFinancialRecordsWithItems = async (): Promise<FinancialRecord[]> => {
  try {
    const { data: records, error } = await supabase
      .from('procedures')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('[FINANCIAL] Erro ao listar registros', { error });
      throw new Error(error.message || 'Erro ao listar registros financeiros');
    }

    if (!records || records.length === 0) {
      return [];
    }

    // Buscar itens para cada registro (se a tabela existir)
    const recordsWithItems = await Promise.all(
      records.map(async (record) => {
        try {
          const { data: items, error } = await supabase
            .from('procedure_items')
            .select('*')
            .eq('procedure_id', record.id)
            .order('created_at');

          // Se a tabela não existir (404), retornar sem itens (compatibilidade)
          if (error && (
            error.code === 'PGRST116' || 
            error.message?.includes('relation') || 
            error.message?.includes('does not exist') ||
            error.message?.includes('Not Found') ||
            (error as any)?.status === 404
          )) {
            logger.warn('[FINANCIAL] Tabela procedure_items não encontrada, retornando sem itens', { procedureId: record.id });
            return {
              ...record,
              items: [] as FinancialProcedureItem[],
            } as FinancialRecord;
          }

          if (error) {
            logger.warn('[FINANCIAL] Erro ao buscar itens', { error, procedureId: record.id });
          }

          return {
            ...record,
            items: (items || []) as FinancialProcedureItem[],
          } as FinancialRecord;
        } catch (err: any) {
          // Se der erro (tabela não existe), retornar sem itens
          logger.warn('[FINANCIAL] Erro ao buscar itens, retornando sem itens', { error: err?.message, procedureId: record.id });
          return {
            ...record,
            items: [] as FinancialProcedureItem[],
          } as FinancialRecord;
        }
      })
    );

    return recordsWithItems;
  } catch (error: any) {
    logger.error('[FINANCIAL] Falha ao listar registros com itens', {
      error: error?.message || String(error),
    });
    throw error;
  }
};

/**
 * Lista parcelas agrupadas por status
 */
export const listInstallmentsByStatus = async (status: 'pendente' | 'pago'): Promise<Installment[]> => {
  try {
    const { data, error } = await supabase
      .from('installments')
      .select('*')
      .eq('status', status)
      .order('due_date', { ascending: true });

    if (error) {
      logger.error('[FINANCIAL] Erro ao listar parcelas', { error, status });
      throw new Error(error.message || 'Erro ao listar parcelas');
    }

    return (data || []) as Installment[];
  } catch (error: any) {
    logger.error('[FINANCIAL] Falha ao listar parcelas', {
      error: error?.message || String(error),
      status,
    });
    throw error;
  }
};

/**
 * Marca uma parcela como paga
 */
export const markInstallmentAsPaid = async (
  installmentId: string,
  paymentMethod: string
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('installments')
      .update({
        status: 'pago',
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
      })
      .eq('id', installmentId);

    if (error) {
      logger.error('[FINANCIAL] Erro ao marcar parcela como paga', { error, installmentId });
      throw new Error(error.message || 'Erro ao atualizar parcela');
    }

    logger.info('[FINANCIAL] Parcela marcada como paga', { installmentId, paymentMethod });
  } catch (error: any) {
    logger.error('[FINANCIAL] Falha ao marcar parcela como paga', {
      error: error?.message || String(error),
      installmentId,
    });
    throw error;
  }
};

/**
 * Atualiza método de pagamento de um registro e suas parcelas pendentes
 */
export const updatePaymentMethod = async (
  procedureId: string,
  paymentMethod: string
): Promise<void> => {
  try {
    // Atualizar registro
    const { error: recordError } = await supabase
      .from('procedures')
      .update({ payment_method: paymentMethod })
      .eq('id', procedureId);

    if (recordError) {
      throw new Error(recordError.message || 'Erro ao atualizar método de pagamento');
    }

    // Atualizar parcelas pendentes
    const { error: installmentsError } = await supabase
      .from('installments')
      .update({ payment_method: paymentMethod })
      .eq('procedure_id', procedureId)
      .eq('status', 'pendente');

    if (installmentsError) {
      logger.warn('[FINANCIAL] Erro ao atualizar método nas parcelas', { installmentsError });
      // Não falha - apenas loga warning
    }

    logger.info('[FINANCIAL] Método de pagamento atualizado', { procedureId, paymentMethod });
  } catch (error: any) {
    logger.error('[FINANCIAL] Falha ao atualizar método de pagamento', {
      error: error?.message || String(error),
      procedureId,
    });
    throw error;
  }
};
