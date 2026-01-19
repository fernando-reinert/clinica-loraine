/**
 * Utilitários para formatação e processamento de termos
 */

/**
 * Formatar CPF com máscara (xxx.xxx.xxx-xx)
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf; // Retorna original se não tiver 11 dígitos
}

/**
 * Formatar data para pt-BR (dd/MM/yyyy)
 */
export function formatDateBR(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

/**
 * Formatar data de nascimento para pt-BR
 */
export function formatBirthDate(birthDate: string | Date | null | undefined): string {
  return formatDateBR(birthDate);
}

/**
 * Parsear licença profissional para extrair sigla e número
 * 
 * Exemplos:
 * - "COREN 344168" -> { sigla: "COREN", numero: "344168" }
 * - "CRM 12345" -> { sigla: "CRM", numero: "12345" }
 * - "344168" -> { sigla: "", numero: "344168" }
 */
export function parseLicenseSiglaNumero(license: string | null | undefined): { sigla: string; numero: string } {
  if (!license) return { sigla: '', numero: '' };
  
  const trimmed = license.trim();
  
  // Tentar extrair sigla e número
  // Padrões: "COREN 344168", "CRM 12345", "COREN: 344168", etc.
  const match = trimmed.match(/^([A-Z]+)\s*:?\s*(\d+)$/i);
  if (match) {
    return {
      sigla: match[1].toUpperCase(),
      numero: match[2],
    };
  }
  
  // Se não conseguir extrair, tentar separar por espaço
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const sigla = parts[0].toUpperCase();
    const numero = parts.slice(1).join(' ').replace(/\D/g, '');
    if (numero) {
      return { sigla, numero };
    }
  }
  
  // Se só tem números, retornar apenas número
  const numbers = trimmed.replace(/\D/g, '');
  if (numbers) {
    return { sigla: '', numero: numbers };
  }
  
  return { sigla: '', numero: trimmed };
}

/**
 * Formatar licença profissional para exibição
 * Retorna no formato "COREN: 344168" ou "CRM: 12345"
 */
export function formatProfessionalLicense(license: string | null | undefined): string {
  if (!license) return '';
  
  const { sigla, numero } = parseLicenseSiglaNumero(license);
  
  if (sigla && numero) {
    return `${sigla}: ${numero}`;
  }
  
  if (numero) {
    return numero;
  }
  
  return license;
}

/**
 * Aplicar marcação de autorização de imagem no texto
 * 
 * Substitui placeholders como {{image_authorization_checkbox}} ou
 * textos como "(   ) SIM" e "(   ) NÃO" por versões marcadas
 * 
 * @param text - Texto com placeholders de autorização
 * @param authorized - true = SIM marcado, false = NÃO marcado
 * @returns Texto com checkboxes marcados
 */
export function applyImageAuthorizationMark(
  text: string,
  authorized: boolean
): string {
  let result = text;
  
  // Substituir placeholder {{image_authorization_checkbox}}
  if (authorized) {
    result = result.replace(
      /\{\{image_authorization_checkbox\}\}/gi,
      '( X ) SIM, autorizo o uso de minhas imagens (fotos e/ou vídeos) de antes, durante e depois do procedimento para fins científicos, educacionais e de divulgação institucional e publicitária da clínica, inclusive em redes sociais, sites e materiais gráficos, respeitando minha dignidade e sem identificação obrigatória.\n(   ) NÃO, não autorizo o uso das minhas imagens para qualquer finalidade de divulgação.'
    );
  } else {
    result = result.replace(
      /\{\{image_authorization_checkbox\}\}/gi,
      '(   ) SIM, autorizo o uso de minhas imagens (fotos e/ou vídeos) de antes, durante e depois do procedimento para fins científicos, educacionais e de divulgação institucional e publicitária da clínica, inclusive em redes sociais, sites e materiais gráficos, respeitando minha dignidade e sem identificação obrigatória.\n( X ) NÃO, não autorizo o uso das minhas imagens para qualquer finalidade de divulgação.'
    );
  }
  
  // Substituir padrões de checkbox no texto
  // Procurar por linhas com "(   ) SIM" e "(   ) NÃO"
  const simPattern = /\(\s*\)\s*SIM[^\n]*/gi;
  const naoPattern = /\(\s*\)\s*NÃO[^\n]*/gi;
  
  if (authorized) {
    // Marcar SIM, desmarcar NÃO
    result = result.replace(simPattern, (match) => match.replace('(   )', '( X )'));
    result = result.replace(naoPattern, (match) => match.replace('(   )', '(   )'));
  } else {
    // Marcar NÃO, desmarcar SIM
    result = result.replace(simPattern, (match) => match.replace('(   )', '(   )'));
    result = result.replace(naoPattern, (match) => match.replace('(   )', '( X )'));
  }
  
  return result;
}

/**
 * Remover seções desnecessárias do texto final
 * Remove campos manuais de assinatura e "local e data"
 */
export function removeUnnecessarySections(text: string): string {
  let cleaned = text;
  
  // Remover "Local e data: ______________" ou variações
  cleaned = cleaned.replace(/Local\s+e\s+data[:\s]*[_\-\s]*/gi, '');
  cleaned = cleaned.replace(/Local\s+e\s+data[:\s]*[^\n]*/gi, '');
  
  // Remover linhas de assinatura em texto (campos manuais)
  cleaned = cleaned.replace(/Assinatura\s+do\s+Paciente[:\s]*[_\-\s]*/gi, '');
  cleaned = cleaned.replace(/Assinatura\s+do\s+Profissional[:\s]*[_\-\s]*/gi, '');
  cleaned = cleaned.replace(/Assinatura\s+do\s+Paciente[:\s]*[^\n]*/gi, '');
  cleaned = cleaned.replace(/Assinatura\s+do\s+Profissional[:\s]*[^\n]*/gi, '');
  cleaned = cleaned.replace(/Assinatura\s+do\(a\)\s+Paciente[:\s]*[^\n]*/gi, '');
  cleaned = cleaned.replace(/Assinatura\s+do\(a\)\s+Profissional[:\s]*[^\n]*/gi, '');
  
  // Remover linhas vazias múltiplas
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * Validar contexto e retornar campos faltantes
 */
export function validateContext(ctx: Partial<TermoContext>): string[] {
  const missing: string[] = [];
  
  if (!ctx.patient?.name || ctx.patient.name.trim() === '') {
    missing.push('patient_name');
  }
  if (!ctx.patient?.cpf || ctx.patient.cpf.trim() === '') {
    missing.push('patient_cpf');
  }
  if (!ctx.patient?.birth_date) {
    missing.push('patient_birth_date');
  }
  if (!ctx.professional?.name || ctx.professional.name.trim() === '') {
    missing.push('professional_name');
  }
  if (!ctx.professional?.license || ctx.professional.license.trim() === '') {
    missing.push('professional_license');
  }
  if (!ctx.signedAt) {
    missing.push('signed_at');
  }
  if (ctx.imageAuthorization === undefined || ctx.imageAuthorization === null) {
    missing.push('image_authorization');
  }
  if (!ctx.procedureLabel || ctx.procedureLabel.trim() === '') {
    missing.push('procedure_label');
  }
  
  return missing;
}

/**
 * Substituir todos os placeholders no texto
 * Garante que nenhum {{...}} sobre no conteúdo final
 */
export function replaceAllPlaceholders(
  text: string,
  ctx: TermoContext
): string {
  let result = text;
  
  // Formatar valores
  const patientName = ctx.patient.name.trim();
  const patientCpf = formatCPF(ctx.patient.cpf);
  const patientBirthDate = formatBirthDate(ctx.patient.birth_date);
  const professionalName = ctx.professional.name.trim();
  const professionalLicense = formatProfessionalLicense(ctx.professional.license);
  const signedAtDate = formatDateBR(ctx.signedAt);
  const procedureLabel = ctx.procedureLabel.trim();
  
  // Substituir placeholders do paciente
  result = result.replace(/\{\{patient_name\}\}/gi, patientName);
  result = result.replace(/\{\{patient_cpf\}\}/gi, patientCpf);
  result = result.replace(/\{\{patient_birth_date\}\}/gi, patientBirthDate);
  result = result.replace(/Paciente:\s*_{10,}/gi, `Paciente: ${patientName}`);
  result = result.replace(/CPF:\s*_{10,}/gi, `CPF: ${patientCpf}`);
  result = result.replace(/Data de nascimento:\s*_{10,}/gi, `Data de nascimento: ${patientBirthDate}`);
  
  // Substituir placeholders do profissional
  result = result.replace(/\{\{professional_name\}\}/gi, professionalName);
  result = result.replace(/\{\{professional_license\}\}/gi, professionalLicense);
  result = result.replace(/\{\{professional_license_formatted\}\}/gi, professionalLicense);
  result = result.replace(/Profissional responsável:\s*_{10,}/gi, `Profissional responsável: ${professionalName}`);
  result = result.replace(/Registro profissional:\s*_{10,}/gi, `Registro profissional: ${professionalLicense}`);
  
  // Substituir placeholders de procedimento
  result = result.replace(/\{\{procedure_name\}\}/gi, procedureLabel);
  result = result.replace(/\{\{procedure_label\}\}/gi, procedureLabel);
  
  // Substituir placeholders de data
  result = result.replace(/\{\{signed_at\}\}/gi, signedAtDate);
  result = result.replace(/\{\{signed_at_date\}\}/gi, signedAtDate);
  result = result.replace(/Data:\s*_{10,}/gi, `Data: ${signedAtDate}`);
  
  // Aplicar autorização de imagem
  result = applyImageAuthorizationMark(result, ctx.imageAuthorization);
  
  // Remover seções desnecessárias
  result = removeUnnecessarySections(result);
  
  // REMOVER TODOS OS TOKENS NÃO RESOLVIDOS (qualquer {{...}} restante)
  // Isso garante que NUNCA apareça um placeholder na tela
  result = result.replace(/\{\{\s*[\w_]+\s*\}\}/g, '');
  
  // Limpar linhas vazias múltiplas
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result.trim();
}
