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
  fee_percent_applied?: number | null;
  fee_amount?: number | null;
  net_amount?: number | null;
  payment_provider?: string | null;
  paid_at?: string | null;
}

export interface PatientFinancialSummary {
  overdue_total: number;
  pending_total: number;
  overdue_installments_count: number;
  paid_total: number;
  last_paid_at?: string | null;
}

export interface GrossNetBucket {
  gross: number;
  fee: number;
  net: number;
  count: number;
}

export interface PatientFinancialSummaryGrossNet {
  overdue: GrossNetBucket;
  pending: GrossNetBucket;
}

export interface FeeRuleRow {
  payment_method: string;
  installments: number | null;
  fee_percent: number;
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

export interface PatientFinancialTimelineRecord {
  record: FinancialRecord;
  installments: Installment[];
}

/** Registro financeiro do paciente com itens e parcelas explícitos (para tela dedicada). */
export interface PatientFinancialRecord {
  record: FinancialRecord;
  items: FinancialProcedureItem[];
  installments: Installment[];
}

export interface PatientFinancialTimeline {
  patient?: { id: string; name: string };
  records: PatientFinancialTimelineRecord[];
}

export interface MonthlyGoal {
  month_year: string;
  target_gross: number;
  target_net: number;
  target_profit: number;
  created_at?: string;
}

// ============================================
// FUNÇÕES HELPER
// ============================================

/**
 * Arredondamento consistente para 2 casas decimais (valores monetários)
 */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Hoje em America/Sao_Paulo no formato YYYY-MM-DD (comparação segura)
 */
export const todayISO = (): string =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

/**
 * Parcela está atrasada? (due_date < hoje)
 */
export const isOverdueISO = (dueISO: string, todayISOStr: string): boolean => {
  const due = (dueISO || '').toString().split('T')[0];
  return !!due && due < todayISOStr;
};

/**
 * Calcula taxa e líquido a partir do bruto e percentual
 */
export function computeFeeNet(
  gross: number,
  feePercent: number
): { feeAmount: number; netAmount: number } {
  const feeAmount = round2((gross * feePercent) / 100);
  const netAmount = round2(gross - feeAmount);
  return { feeAmount, netAmount };
}

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
 * Detecta se o erro é de relação/tabela inexistente
 */
const isRelationNotFoundError = (error: any): boolean => {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const code = error.code || '';
  return (
    code === 'PGRST116' ||
    (error as any)?.status === 404 ||
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('not found') && (msg.includes('relation') || msg.includes('table'))
  );
};

/**
 * Detecta se o erro indica que a tabela não existe (não auth/RLS/permission).
 * Usado para mostrar "execute migration" apenas quando a tabela realmente falta.
 */
function isTableMissingError(err: any, tableName: string): boolean {
  if (!err) return false;
  const code = err?.code || '';
  const status = (err as any)?.status ?? (err as any)?.statusCode;
  const msg = String(err?.message || '').toLowerCase();
  const details = String(err?.details || '').toLowerCase();
  const hint = String(err?.hint || '').toLowerCase();
  const combined = `${msg} ${details} ${hint}`;
  const tableLower = tableName.toLowerCase();

  // Postgres undefined_table
  if (code === '42P01') return true;

  // PostgREST "Not Found" / missing relation endpoint (varies)
  if (code === 'PGRST116') return true;

  // Some clients return 404 when resource doesn't exist
  if (status === 404 && combined.includes(tableLower)) return true;

  // Common text patterns
  if (combined.includes('does not exist') && combined.includes(tableLower)) return true;
  if (combined.includes('relation') && combined.includes('does not exist') && combined.includes(tableLower)) return true;

  return false;
}

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
 * Obtém percentual de taxa para provedor/método/parcelas (ex: InfinityPay).
 * pix/cash/bank_transfer => 0. debit_card => regra com installments IS NULL.
 * credit_card e infinit_tag => regra com installments (1..12).
 */
export const getFeePercent = async (
  provider: string,
  paymentMethod: string,
  installments?: number
): Promise<number> => {
  if (['pix', 'cash', 'bank_transfer'].includes(paymentMethod)) return 0;

  try {
    let query = supabase
      .from('payment_fee_rules')
      .select('fee_percent')
      .eq('provider', provider)
      .eq('payment_method', paymentMethod)
      .eq('is_active', true);

    if (paymentMethod === 'credit_card' || paymentMethod === 'infinit_tag') {
      const inst = installments != null ? Math.min(12, Math.max(1, installments)) : 1;
      query = query.eq('installments', inst);
    } else if (paymentMethod === 'debit_card') {
      query = query.is('installments', null);
    } else {
      return 0;
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) {
      if (isRelationNotFoundError(error)) {
        logger.warn('[FINANCIAL] Tabela payment_fee_rules não encontrada (execute a migration de fee rules)', {
          provider,
          paymentMethod,
        });
        return 0;
      }
      logger.warn('[FINANCIAL] Erro ao buscar regra de taxa', { error, provider, paymentMethod });
      return 0;
    }

    if (data?.fee_percent != null) return Number(data.fee_percent);
    return 0;
  } catch (err: any) {
    logger.warn('[FINANCIAL] getFeePercent falhou', { error: err?.message, provider, paymentMethod });
    return 0;
  }
};

/**
 * Lista regras de taxa ativas para um provedor (para cache em UI).
 */
export const listFeeRules = async (provider: string): Promise<FeeRuleRow[]> => {
  try {
    const { data, error } = await supabase
      .from('payment_fee_rules')
      .select('payment_method, installments, fee_percent')
      .eq('provider', provider)
      .eq('is_active', true);

    if (error) {
      if (isRelationNotFoundError(error)) {
        logger.warn('[FINANCIAL] Tabela payment_fee_rules não encontrada', { provider });
        return [];
      }
      logger.warn('[FINANCIAL] Erro ao listar regras de taxa', { error, provider });
      return [];
    }
    return (data || []).map((r: any) => ({
      payment_method: r.payment_method,
      installments: r.installments ?? null,
      fee_percent: Number(r.fee_percent ?? 0),
    }));
  } catch (err: any) {
    logger.warn('[FINANCIAL] listFeeRules falhou', { provider, error: err?.message });
    return [];
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
 * Marca uma parcela como paga: calcula taxa pela regra (provider/método/parcelas), persiste snapshot na parcela.
 */
export const markInstallmentAsPaid = async (
  installmentId: string,
  paymentMethod: string
): Promise<void> => {
  try {
    const { data: installment, error: fetchInstError } = await supabase
      .from('installments')
      .select('*')
      .eq('id', installmentId)
      .single();

    if (fetchInstError || !installment) {
      logger.error('[FINANCIAL] Parcela não encontrada', { installmentId, error: fetchInstError });
      throw new Error(fetchInstError?.message || 'Parcela não encontrada');
    }

    const { data: procedure, error: procError } = await supabase
      .from('procedures')
      .select('id, total_installments, payment_method')
      .eq('id', (installment as any).procedure_id)
      .single();

    if (procError || !procedure) {
      logger.warn('[FINANCIAL] Procedimento não encontrado para parcela, usando fallback', {
        procedureId: (installment as any).procedure_id,
      });
    }

    const totalInstallments = (procedure as any)?.total_installments ?? 1;
    const provider =
      ['credit_card', 'debit_card', 'infinit_tag'].indexOf(paymentMethod) >= 0 ? 'infinitypay' : null;
    const installmentsCount =
      paymentMethod === 'credit_card' || paymentMethod === 'infinit_tag'
        ? Math.min(12, Math.max(1, totalInstallments))
        : undefined;

    let feePercent = 0;
    if (provider) {
      feePercent = await getFeePercent(provider, paymentMethod, installmentsCount);
    }

    const gross = Number((installment as any).installment_value);
    const { feeAmount, netAmount } = computeFeeNet(gross, feePercent);

    const now = new Date();
    const paidDateIso = todayISO();

    const fullUpdate: Record<string, any> = {
      status: 'pago',
      paid_date: paidDateIso,
      payment_method: paymentMethod,
      paid_at: now.toISOString(),
      payment_provider: provider,
      fee_percent_applied: feePercent,
      fee_amount: feeAmount,
      net_amount: netAmount,
    };

    let result = await supabase.from('installments').update(fullUpdate).eq('id', installmentId).select();

    if (result.error && isColumnNotFoundError(result.error)) {
      logger.warn('[FINANCIAL] Colunas de fee não existem, atualizando apenas campos legados', {
        installmentId,
      });
      const legacyUpdate = {
        status: 'pago',
        paid_date: paidDateIso,
        payment_method: paymentMethod,
      };
      result = await supabase.from('installments').update(legacyUpdate).eq('id', installmentId).select();
    }

    if (result.error) {
      logger.error('[FINANCIAL] Erro ao marcar parcela como paga', { error: result.error, installmentId });
      throw new Error(result.error.message || 'Erro ao atualizar parcela');
    }

    logger.info('[FINANCIAL] Parcela marcada como paga', {
      installmentId,
      paymentMethod,
      provider,
      feePercent,
      feeAmount,
      netAmount,
    });
  } catch (error: any) {
    logger.error('[FINANCIAL] Falha ao marcar parcela como paga', {
      error: error?.message || String(error),
      installmentId,
    });
    throw error;
  }
};

/**
 * Atualiza método de pagamento de um registro e suas parcelas pendentes.
 * Não altera parcelas já pagas (preserva fee snapshot).
 */
export const updatePaymentMethod = async (
  procedureId: string,
  paymentMethod: string
): Promise<void> => {
  try {
    const procedurePayload: Record<string, any> = { payment_method: paymentMethod };
    if (['credit_card', 'debit_card', 'infinit_tag'].indexOf(paymentMethod) >= 0) {
      procedurePayload.payment_provider = 'infinitypay';
    }

    let recordResult = await supabase
      .from('procedures')
      .update(procedurePayload)
      .eq('id', procedureId);

    if (recordResult.error) {
      if (isColumnNotFoundError(recordResult.error) && procedurePayload.payment_provider) {
        delete procedurePayload.payment_provider;
        recordResult = await supabase.from('procedures').update(procedurePayload).eq('id', procedureId);
      }
      if (recordResult.error) {
        throw new Error(recordResult.error.message || 'Erro ao atualizar método de pagamento');
      }
    }

    // Apenas parcelas pendentes (não reescreve fee de parcelas já pagas)
    const { error: installmentsError } = await supabase
      .from('installments')
      .update({ payment_method: paymentMethod })
      .eq('procedure_id', procedureId)
      .eq('status', 'pendente');

    if (installmentsError) {
      logger.warn('[FINANCIAL] Erro ao atualizar método nas parcelas', { installmentsError });
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

const emptyGrossNetBucket: GrossNetBucket = { gross: 0, fee: 0, net: 0, count: 0 };

/**
 * Resumo financeiro do paciente com bruto/taxa/líquido para atrasados e pendentes.
 */
export const getPatientFinancialSummaryGrossNet = async (
  patientId: string
): Promise<PatientFinancialSummaryGrossNet> => {
  const empty: PatientFinancialSummaryGrossNet = {
    overdue: { ...emptyGrossNetBucket },
    pending: { ...emptyGrossNetBucket },
  };

  try {
    const { data: procedures, error: procError } = await supabase
      .from('procedures')
      .select('id, payment_method, total_installments')
      .eq('patient_id', patientId);

    if (procError || !procedures?.length) return empty;

    const procedureIds = procedures.map((p: any) => p.id);
    const procMap = new Map<string, { payment_method: string; total_installments: number }>();
    procedures.forEach((p: any) => procMap.set(p.id, { payment_method: p.payment_method || 'pix', total_installments: p.total_installments ?? 1 }));

    const { data: installments, error: instError } = await supabase
      .from('installments')
      .select('procedure_id, installment_value, due_date')
      .in('procedure_id', procedureIds)
      .eq('status', 'pendente');

    if (instError || !installments?.length) return empty;

    const todayStr = todayISO();
    const feeCache = new Map<string, number>();

    const getCachedFeePercent = async (method: string, installmentsCount: number | undefined): Promise<number> => {
      const key = `${method}:${installmentsCount ?? 'null'}`;
      if (feeCache.has(key)) return feeCache.get(key)!;
      const pct = await getFeePercent('infinitypay', method, installmentsCount);
      feeCache.set(key, pct);
      return pct;
    };

    const overdue: GrossNetBucket = { gross: 0, fee: 0, net: 0, count: 0 };
    const pending: GrossNetBucket = { gross: 0, fee: 0, net: 0, count: 0 };

    for (const i of installments as any[]) {
      const gross = Number(i.installment_value ?? 0);
      const proc = procMap.get(i.procedure_id);
      const method = proc?.payment_method ?? 'pix';
      const installmentsCount =
        ['credit_card', 'infinit_tag'].includes(method) ? (proc?.total_installments ?? 1) : undefined;
      const feePercent = await getCachedFeePercent(method, installmentsCount);
      const { feeAmount, netAmount } = computeFeeNet(gross, feePercent);

      const dueStr = (i.due_date || '').toString().split('T')[0];
      const isOverdue = !!dueStr && dueStr < todayStr;

      if (isOverdue) {
        overdue.gross += gross;
        overdue.fee += feeAmount;
        overdue.net += netAmount;
        overdue.count += 1;
      } else {
        pending.gross += gross;
        pending.fee += feeAmount;
        pending.net += netAmount;
        pending.count += 1;
      }
    }

    return {
      overdue: {
        gross: round2(overdue.gross),
        fee: round2(overdue.fee),
        net: round2(overdue.net),
        count: overdue.count,
      },
      pending: {
        gross: round2(pending.gross),
        fee: round2(pending.fee),
        net: round2(pending.net),
        count: pending.count,
      },
    };
  } catch (err: any) {
    logger.error('[FINANCIAL] getPatientFinancialSummaryGrossNet falhou', { patientId, error: err?.message });
    return empty;
  }
};

/**
 * Resumo financeiro do paciente (view ou agregação em cliente).
 */
export const getPatientFinancialSummary = async (
  patientId: string
): Promise<PatientFinancialSummary> => {
  const empty: PatientFinancialSummary = {
    overdue_total: 0,
    pending_total: 0,
    overdue_installments_count: 0,
    paid_total: 0,
  };

  try {
    const { data, error } = await supabase
      .from('patient_financial_summary')
      .select('overdue_installments_count, overdue_total, pending_total, paid_total, last_paid_at')
      .eq('patient_id', patientId)
      .maybeSingle();

    if (!error && data) {
      return {
        overdue_total: Number(data.overdue_total ?? 0),
        pending_total: Number(data.pending_total ?? 0),
        overdue_installments_count: Number(data.overdue_installments_count ?? 0),
        paid_total: Number(data.paid_total ?? 0),
        last_paid_at: data.last_paid_at ?? null,
      };
    }

    if (error && isRelationNotFoundError(error)) {
      logger.warn('[FINANCIAL] View patient_financial_summary não encontrada, usando fallback por procedimentos/parcelas');
    }

    const { data: procedures, error: procError } = await supabase
      .from('procedures')
      .select('id')
      .eq('patient_id', patientId);

    if (procError || !procedures?.length) return empty;

    const procedureIds = procedures.map((p: { id: string }) => p.id);
    const { data: installments, error: instError } = await supabase
      .from('installments')
      .select('status, due_date, installment_value, paid_at, paid_date')
      .in('procedure_id', procedureIds);

    if (instError || !installments?.length) return empty;

    const todayStr = todayISO();
    let overdue_total = 0;
    let pending_total = 0;
    let paid_total = 0;

    for (const i of installments as any[]) {
      const due = (i.due_date || '').toString().split('T')[0];
      if (i.status === 'pendente') {
        pending_total += Number(i.installment_value ?? 0);
        if (due && due < todayStr) overdue_total += Number(i.installment_value ?? 0);
      } else if (i.status === 'pago') {
        paid_total += Number(i.installment_value ?? 0);
      }
    }

    const overdue_installments_count = (installments as any[]).filter(
      (i) => i.status === 'pendente' && ((i.due_date || '').toString().split('T')[0] || '') < todayStr
    ).length;

    return {
      overdue_total: round2(overdue_total),
      pending_total: round2(pending_total),
      overdue_installments_count,
      paid_total: round2(paid_total),
    };
  } catch (err: any) {
    logger.error('[FINANCIAL] getPatientFinancialSummary falhou', { patientId, error: err?.message });
    return empty;
  }
};

/**
 * Timeline financeira do paciente: registros (procedures) com parcelas, ordenados por created_at desc.
 */
export const getPatientFinancialTimeline = async (
  patientId: string
): Promise<PatientFinancialTimeline> => {
  const empty: PatientFinancialTimeline = { records: [] };

  try {
    const { data: procedures, error: procError } = await supabase
      .from('procedures')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (procError || !procedures?.length) return empty;

    const procedureIds = procedures.map((p: any) => p.id);

    const { data: itemsRows, error: itemsError } = await supabase
      .from('procedure_items')
      .select('*')
      .in('procedure_id', procedureIds)
      .order('created_at');

    const itemsByProcedure = new Map<string, any[]>();
    if (!itemsError && itemsRows?.length) {
      (itemsRows as any[]).forEach((row: any) => {
        const list = itemsByProcedure.get(row.procedure_id) || [];
        list.push(row);
        itemsByProcedure.set(row.procedure_id, list);
      });
    }

    const { data: installmentsRows, error: instError } = await supabase
      .from('installments')
      .select('*')
      .in('procedure_id', procedureIds)
      .order('due_date', { ascending: true });

    if (instError) {
      logger.warn('[FINANCIAL] getPatientFinancialTimeline: erro ao buscar parcelas', { error: instError });
      return empty;
    }

    const installmentsByProcedure = new Map<string, Installment[]>();
    (installmentsRows || []).forEach((inst: any) => {
      const list = installmentsByProcedure.get(inst.procedure_id) || [];
      list.push(inst as Installment);
      installmentsByProcedure.set(inst.procedure_id, list);
    });

    const records: PatientFinancialTimelineRecord[] = procedures.map((p: any) => {
      const items = itemsByProcedure.get(p.id) || [];
      const record: FinancialRecord = {
        ...p,
        items: items as FinancialProcedureItem[],
      } as FinancialRecord;
      const installments = installmentsByProcedure.get(p.id) || [];
      return { record, installments };
    });

    const firstRecord = procedures[0];
    const patient = firstRecord
      ? { id: patientId, name: (firstRecord as any).client_name || 'Paciente' }
      : undefined;

    return { patient, records };
  } catch (err: any) {
    logger.error('[FINANCIAL] getPatientFinancialTimeline falhou', { patientId, error: err?.message });
    return empty;
  }
};

/**
 * Lista registros financeiros do paciente com itens e parcelas (para tela dedicada).
 */
export const listPatientFinancialRecords = async (
  patientId: string
): Promise<PatientFinancialRecord[]> => {
  try {
    const timeline = await getPatientFinancialTimeline(patientId);
    return timeline.records.map(({ record, installments }) => ({
      record,
      items: record.items ?? [],
      installments,
    }));
  } catch (err: any) {
    logger.error('[FINANCIAL] listPatientFinancialRecords falhou', { patientId, error: err?.message });
    return [];
  }
};

/**
 * Lista parcelas do paciente por status (procedure_id filtrado por patient_id).
 */
export const listPatientInstallmentsByStatus = async (
  patientId: string,
  status: string
): Promise<Installment[]> => {
  try {
    const { data: procedures, error: procError } = await supabase
      .from('procedures')
      .select('id')
      .eq('patient_id', patientId);

    if (procError || !procedures?.length) return [];
    const procedureIds = procedures.map((p: any) => p.id);

    const { data: installments, error: instError } = await supabase
      .from('installments')
      .select('*')
      .in('procedure_id', procedureIds)
      .eq('status', status)
      .order('due_date', { ascending: true });

    if (instError) {
      logger.warn('[FINANCIAL] listPatientInstallmentsByStatus erro', { patientId, status, error: instError.message });
      return [];
    }
    return (installments ?? []) as Installment[];
  } catch (err: any) {
    logger.error('[FINANCIAL] listPatientInstallmentsByStatus falhou', { patientId, status, error: err?.message });
    return [];
  }
};

/**
 * Totais bruto/taxa/líquido do paciente no mês (parcelas pagas no monthYear).
 */
export const getPatientPaidByMonthGrossNet = async (
  patientId: string,
  monthYear: string
): Promise<GrossNetBucket> => {
  const empty: GrossNetBucket = { gross: 0, fee: 0, net: 0, count: 0 };
  try {
    const { data: procedures, error: procError } = await supabase
      .from('procedures')
      .select('id, payment_method, total_installments')
      .eq('patient_id', patientId);

    if (procError || !procedures?.length) return empty;
    const procedureIds = procedures.map((p: any) => p.id);
    const procMap = new Map<string, { payment_method: string; total_installments: number }>();
    procedures.forEach((p: any) =>
      procMap.set(p.id, { payment_method: p.payment_method ?? 'pix', total_installments: p.total_installments ?? 1 })
    );

    const start = `${monthYear}-01`;
    const end = `${monthYear}-31`;
    const { data: installments, error: instError } = await supabase
      .from('installments')
      .select('*')
      .in('procedure_id', procedureIds)
      .eq('status', 'pago')
      .gte('paid_date', start)
      .lte('paid_date', end);

    if (instError || !installments?.length) return empty;

    const feeCache = new Map<string, number>();
    const getCachedFeePercent = async (method: string, installmentsCount: number | undefined): Promise<number> => {
      const key = `${method}:${installmentsCount ?? 'null'}`;
      if (feeCache.has(key)) return feeCache.get(key)!;
      const pct = await getFeePercent('infinitypay', method, installmentsCount);
      feeCache.set(key, pct);
      return pct;
    };

    let gross = 0;
    let feeSum = 0;
    let netSum = 0;
    for (const i of installments as any[]) {
      const g = Number(i.installment_value ?? 0);
      gross += g;
      const method = i.payment_method ?? procMap.get(i.procedure_id)?.payment_method ?? 'pix';
      const instCount = ['credit_card', 'infinit_tag'].includes(method) ? (procMap.get(i.procedure_id)?.total_installments ?? 1) : undefined;
      const pct = await getCachedFeePercent(method, instCount);
      const { feeAmount, netAmount } = computeFeeNet(g, pct);
      feeSum += feeAmount;
      netSum += netAmount;
    }
    return {
      gross: round2(gross),
      fee: round2(feeSum),
      net: round2(netSum),
      count: installments.length,
    };
  } catch (err: any) {
    logger.error('[FINANCIAL] getPatientPaidByMonthGrossNet falhou', { patientId, monthYear, error: err?.message });
    return empty;
  }
};

/**
 * Meta mensal (YYYY-MM). Retorna goal + tableMissing; só tableMissing=true quando tabela não existe.
 */
export const getMonthlyGoal = async (
  monthYear: string
): Promise<{ goal: MonthlyGoal | null; tableMissing: boolean }> => {
  try {
    const { data, error } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('month_year', monthYear)
      .maybeSingle();

    if (error) {
      logger.warn('[GOALS] getMonthlyGoal error', {
        code: error?.code,
        status: (error as any)?.status,
        message: error?.message,
        details: (error as any)?.details,
        hint: (error as any)?.hint,
      });
      if (isTableMissingError(error, 'financial_goals')) {
        return { goal: null, tableMissing: true };
      }
      throw new Error(error.message || 'Failed to load goals');
    }

    if (!data) return { goal: null, tableMissing: false };
    return {
      goal: {
        month_year: data.month_year,
        target_gross: Number(data.target_gross ?? 0),
        target_net: Number(data.target_net ?? 0),
        target_profit: Number(data.target_profit ?? 0),
        created_at: data.created_at,
      },
      tableMissing: false,
    };
  } catch (err: any) {
    logger.warn('[FINANCIAL] getMonthlyGoal falhou', { monthYear, error: err?.message });
    throw err;
  }
};

/**
 * Cria ou atualiza meta mensal. Retorna goal + tableMissing; só tableMissing quando tabela não existe.
 */
export const upsertMonthlyGoal = async (
  monthYear: string,
  payload: { target_gross: number; target_net: number; target_profit: number }
): Promise<{ goal: MonthlyGoal | null; tableMissing: boolean }> => {
  try {
    const { data, error } = await supabase
      .from('financial_goals')
      .upsert(
        { month_year: monthYear, ...payload },
        { onConflict: 'month_year' }
      )
      .select()
      .single();

    if (error) {
      logger.warn('[GOALS] upsertMonthlyGoal error', {
        code: error?.code,
        status: (error as any)?.status,
        message: error?.message,
      });
      if (isTableMissingError(error, 'financial_goals')) {
        return { goal: null, tableMissing: true };
      }
      throw new Error(error.message || 'Erro ao salvar meta');
    }

    return {
      goal: data
        ? {
            month_year: data.month_year,
            target_gross: Number(data.target_gross ?? 0),
            target_net: Number(data.target_net ?? 0),
            target_profit: Number(data.target_profit ?? 0),
            created_at: data.created_at,
          }
        : null,
      tableMissing: false,
    };
  } catch (err: any) {
    logger.error('[FINANCIAL] upsertMonthlyGoal falhou', { monthYear, error: err?.message });
    throw err;
  }
};

/**
 * Resolve percentual de taxa localmente a partir de regras (para UI/cache).
 */
export function resolveFeePercentLocal(
  method: string,
  installments: number | undefined,
  feeRules: FeeRuleRow[]
): number {
  if (['pix', 'cash', 'bank_transfer'].includes(method)) return 0;
  const inst =
    method === 'credit_card' || method === 'infinit_tag'
      ? (installments != null ? Math.min(12, Math.max(1, installments)) : 1)
      : null;
  const row = feeRules.find(
    (r) =>
      r.payment_method === method &&
      (method === 'debit_card' ? r.installments === null : r.installments === (inst ?? 1))
  );
  return row?.fee_percent ?? 0;
}
