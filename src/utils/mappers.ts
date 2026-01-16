/**
 * src/utils/mappers.ts
 * 
 * Mapeadores centralizados para conversão entre valores do banco e labels amigáveis
 * 
 * FONTE DA VERDADE: Centraliza todos os mapeamentos para evitar duplicação
 */

// ============================================
// PROCEDURE MAPPINGS
// ============================================

/**
 * Map de procedure_key (slug) para nome amigável do procedimento
 * Usado quando não há dados do banco ou como fallback
 */
export const PROCEDURE_NAME_MAP: Record<string, string> = {
  'botox': 'Botox',
  'preenchimento-labial': 'Preenchimento Labial',
  'preenchimento-facial': 'Preenchimento Facial',
  'toxina-botulinica': 'Toxina Botulínica',
  'acido-hialuronico': 'Ácido Hialurônico',
  'endermoterapia-vacuoterapia': 'Endermoterapia / Vacuoterapia',
  'limpeza-de-pele': 'Limpeza de Pele',
  'microagulhamento': 'Microagulhamento',
};

/**
 * Obter nome amigável do procedimento a partir do procedure_key (slug)
 * Se não estiver no map, capitaliza o próprio procedureKey
 */
export const getProcedureDisplayName = (procedureKey: string): string => {
  if (PROCEDURE_NAME_MAP[procedureKey]) {
    return PROCEDURE_NAME_MAP[procedureKey];
  }
  // Fallback: capitalizar primeira letra de cada palavra
  return procedureKey
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Converter procedure.name (do catálogo) para procedure_key (slug)
 * Usado quando buscamos do catálogo procedures
 */
export const procedureNameToKey = (procedureName: string): string => {
  return procedureName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// ============================================
// PROFESSIONAL MAPPINGS
// ============================================

/**
 * Valores padrão para profissional
 */
export const DEFAULT_PROFESSIONAL = {
  name: 'Loraine Vilela Reinert',
  profession: 'Enfermeira',
  license: 'COREN 344168',
} as const;

// ============================================
// CONSENT TEMPLATE MAPPINGS
// ============================================

/**
 * Placeholders suportados nos templates de consentimento
 */
export const CONSENT_PLACEHOLDERS = {
  // Paciente
  PATIENT_NAME: '{{patient_name}}',
  PATIENT_CPF: '{{patient_cpf}}',
  PATIENT_BIRTH_DATE: '{{patient_birth_date}}',
  
  // Profissional
  PROFESSIONAL_NAME: '{{professional_name}}',
  PROFESSIONAL_LICENSE: '{{professional_license}}',
  
  // Procedimento
  PROCEDURE_NAME: '{{procedure_name}}',
  
  // Data/Hora
  SIGNED_AT: '{{signed_at}}',
  SIGNED_AT_FULL: '{{signed_at_full}}',
  
  // Autorização
  IMAGE_AUTHORIZATION_TEXT: '{{image_authorization_text}}',
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Formatar CPF com máscara (xxx.xxx.xxx-xx)
 */
export const formatCPF = (cpf: string | null | undefined): string => {
  if (!cpf) return '';
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
};

/**
 * Formatar data para pt-BR (dd/MM/yyyy)
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
};

/**
 * Formatar data/hora para pt-BR (dd/MM/yyyy HH:mm)
 */
export const formatDateTime = (date: Date | string | null | undefined): { date: string; dateTime: string } => {
  if (!date) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return {
      date: dateStr,
      dateTime: `${dateStr} ${timeStr}`,
    };
  }
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR');
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return {
        date: dateStr,
        dateTime: `${dateStr} ${timeStr}`,
      };
    }
    const dateStr = d.toLocaleDateString('pt-BR');
    const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return {
      date: dateStr,
      dateTime: `${dateStr} ${timeStr}`,
    };
  } catch {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return {
      date: dateStr,
      dateTime: `${dateStr} ${timeStr}`,
    };
  }
};
