// src/types/appointmentPlan.ts
// Tipos compartilhados para o Plano do Atendimento (reutilizável entre Financeiro e Agendamento)

/** Dados mínimos do catálogo ao selecionar um procedimento para o plano */
export type ProcedureCatalogSelection = {
  id: string;
  name: string;
  category?: string | null;
  cost_price: number;
  sale_price: number;
};

export type AppointmentPlanItem = {
  procedure_catalog_id: string;
  name: string;               // snapshot (name)
  category?: string | null;   // snapshot (category)
  cost_price: number;         // snapshot
  sale_price: number;         // snapshot (valor sugerido)
  final_price: number;        // editável
  quantity: number;           // editável
  discount: number;           // editável (por item)
};

export type AppointmentPlanTotals = {
  totalFinal: number;
  totalCost: number;
  totalProfit: number;
  margin: number; // percentual
};

/**
 * Calcula os totais do plano de atendimento
 */
export const calculatePlanTotals = (items: AppointmentPlanItem[]): AppointmentPlanTotals => {
  const totalFinal = items.reduce(
    (sum, item) => sum + (item.final_price * item.quantity - item.discount),
    0
  );
  const totalCost = items.reduce(
    (sum, item) => sum + (item.cost_price * item.quantity),
    0
  );
  const totalProfit = items.reduce(
    (sum, item) => {
      const itemProfit = (item.final_price * item.quantity - item.discount) - (item.cost_price * item.quantity);
      return sum + itemProfit;
    },
    0
  );
  const margin = totalFinal > 0 ? (totalProfit / totalFinal) * 100 : 0;

  return {
    totalFinal,
    totalCost,
    totalProfit,
    margin,
  };
};

/**
 * Calcula o lucro de um item individual
 */
export const calculateItemProfit = (item: AppointmentPlanItem): number => {
  return (item.final_price * item.quantity - item.discount) - (item.cost_price * item.quantity);
};

// ============================================
// TIPOS DE PAGAMENTO
// ============================================

export type AppointmentPaymentInfo = {
  installments: number;
  payment_method: "pix" | "cash" | "credit_card" | "debit_card" | "bank_transfer";
  first_payment_date: string; // YYYY-MM-DD
};
