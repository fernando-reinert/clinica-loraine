/**
 * Tipos e contratos para o módulo de Termos de Consentimento
 */

/**
 * Contexto necessário para renderizar um termo
 */
export interface TermoContext {
  patient: {
    name: string;
    cpf: string;
    birth_date: string | Date;
  };
  professional: {
    name: string;
    license: string; // Ex: "COREN 344168" ou "CRM 12345"
  };
  signedAt: Date | string;
  procedureLabel: string; // Nome amigável do procedimento
  imageAuthorization: boolean; // true = SIM, false = NÃO
}

/**
 * Resultado da renderização de um termo
 */
export interface TermoRenderResult {
  title: string;
  content: string; // Texto final completo, sem placeholders
  missingFields: string[]; // Campos obrigatórios que faltam
}

/**
 * Contrato que cada termo deve implementar
 */
export interface TermoDefinition {
  key: string; // procedureKey (slug)
  label: string; // Nome amigável do procedimento
  
  /**
   * Renderiza o termo completo com base no contexto
   * 
   * @param ctx - Contexto com dados do paciente, profissional, etc.
   * @returns Resultado com título, conteúdo final e campos faltantes
   */
  render(ctx: TermoContext): TermoRenderResult;
}

/**
 * Campos obrigatórios que podem estar faltando
 */
export type MissingField = 
  | 'patient_name'
  | 'patient_cpf'
  | 'patient_birth_date'
  | 'professional_name'
  | 'professional_license'
  | 'signed_at'
  | 'image_authorization'
  | 'procedure_label';
