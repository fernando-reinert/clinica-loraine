// src/services/consents/consentService.ts
// Serviço para gerenciar termos de consentimento
import { supabase } from '../supabase/client';
import { uploadSignature } from '../storage/storageService';
import { slugifyProcedure } from '../../utils/slug';
import { getProcedureDisplayName, normalizeProcedure } from '../../utils/mappers';
import logger from '../../utils/logger';
import { renderTermo, getCanonicalTermos } from '../../termos/registry';
/**
 * Buscar todos os templates de consentimento
 */
export const getConsentTemplates = async () => {
    const { data, error } = await supabase
        .from('consent_templates')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        throw new Error(`Erro ao buscar templates: ${error.message}`);
    }
    return data || [];
};
/**
 * Criar novo template de consentimento
 * O UUID é gerado automaticamente pelo Supabase
 */
export const createConsentTemplate = async (params) => {
    const { data, error } = await supabase
        .from('consent_templates')
        .insert({
        procedure_key: params.procedure_key,
        title: params.title,
        content: params.content,
        created_at: new Date().toISOString(),
    })
        .select()
        .single();
    if (error) {
        throw new Error(`Erro ao criar template: ${error.message}`);
    }
    return data;
};
/**
 * Buscar template por ID
 */
export const getConsentTemplateById = async (id) => {
    const { data, error } = await supabase
        .from('consent_templates')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        if (error.code === 'PGRST116') {
            return null; // Não encontrado
        }
        throw new Error(`Erro ao buscar template: ${error.message}`);
    }
    return data;
};
/**
 * Buscar template por procedure_key (slug)
 * Schema: id, procedure_key, title, content, created_at
 */
export const getConsentTemplateByProcedureKey = async (procedureKey) => {
    const { data, error } = await supabase
        .from('consent_templates')
        .select('*')
        .eq('procedure_key', procedureKey)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) {
        if (error.code === 'PGRST116') {
            // Não encontrado - retornar null
            return null;
        }
        logger.error('[CONSENT] Erro ao buscar template:', error);
        // Não lançar erro, apenas retornar null para mostrar mensagem na UI
        return null;
    }
    return data;
};
/**
 * Buscar template por nome do procedimento (mantido para compatibilidade)
 */
export const getConsentTemplateByProcedure = async (procedureName) => {
    // Tentar buscar por procedure_key primeiro (slug)
    const slug = slugifyProcedure(procedureName);
    return await getConsentTemplateByProcedureKey(slug);
};
// Re-exportar do mappers centralizado
export { getProcedureDisplayName, PROCEDURE_NAME_MAP } from '../../utils/mappers';
/**
 * Formatar CPF com máscara (xxx.xxx.xxx-xx)
 */
const formatCPF = (cpf) => {
    if (!cpf)
        return '';
    const numbers = cpf.replace(/\D/g, '');
    if (numbers.length === 11) {
        return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cpf; // Retorna original se não tiver 11 dígitos
};
/**
 * Formatar data de nascimento para pt-BR
 */
const formatBirthDate = (birthDate) => {
    if (!birthDate)
        return '';
    try {
        const date = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
        if (isNaN(date.getTime()))
            return '';
        return date.toLocaleDateString('pt-BR');
    }
    catch {
        return '';
    }
};
/**
 * Formatar data/hora para pt-BR
 */
const formatDateTime = (date) => {
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
    }
    catch {
        const now = new Date();
        const dateStr = now.toLocaleDateString('pt-BR');
        const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return {
            date: dateStr,
            dateTime: `${dateStr} ${timeStr}`,
        };
    }
};
/**
 * Formatar licença profissional (COREN/CRM)
 * Extrai sigla + número do formato "COREN 344168" ou "CRM 12345"
 * Retorna no formato "COREN: 344168" ou "CRM: 12345"
 */
const formatProfessionalLicense = (license) => {
    if (!license)
        return '';
    const trimmed = license.trim();
    // Tentar extrair sigla e número
    // Padrões: "COREN 344168", "CRM 12345", "COREN: 344168", etc.
    const match = trimmed.match(/^([A-Z]+)\s*:?\s*(\d+)$/i);
    if (match) {
        const sigla = match[1].toUpperCase();
        const numero = match[2];
        return `${sigla}: ${numero}`;
    }
    // Se não conseguir extrair, retornar formatado
    // Se já tem ":", retornar como está
    if (trimmed.includes(':')) {
        return trimmed;
    }
    // Se não tem ":", adicionar
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0].toUpperCase()}: ${parts.slice(1).join(' ')}`;
    }
    return trimmed;
};
/**
 * Remover seções desnecessárias do template
 * Remove campos manuais de assinatura e data que não devem aparecer no texto final
 */
const removeUnnecessarySections = (content) => {
    let cleaned = content;
    // Remover "Local e Data: ____" ou variações
    cleaned = cleaned.replace(/Local\s+e\s+Data[:\s]*[_\-\s]*/gi, '');
    cleaned = cleaned.replace(/Local\s+e\s+Data[:\s]*[^\n]*/gi, '');
    // Remover linhas de assinatura em texto (campos manuais)
    cleaned = cleaned.replace(/Assinatura\s+do\s+Paciente[:\s]*[_\-\s]*/gi, '');
    cleaned = cleaned.replace(/Assinatura\s+do\s+Profissional[:\s]*[_\-\s]*/gi, '');
    cleaned = cleaned.replace(/Assinatura\s+do\s+Paciente[:\s]*[^\n]*/gi, '');
    cleaned = cleaned.replace(/Assinatura\s+do\s+Profissional[:\s]*[^\n]*/gi, '');
    // Remover linhas vazias múltiplas
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    return cleaned.trim();
};
/**
 * Renderizar template de consentimento de forma segura
 * Substitui todos os tokens e remove os não resolvidos
 * NUNCA deixa placeholders visíveis na tela
 */
export const renderConsentTemplate = (template, ctx) => {
    let rendered = template;
    // Formatar valores
    const patientName = ctx.patient?.name?.trim() || '';
    const patientCpf = formatCPF(ctx.patient?.cpf);
    const patientBirthDate = formatBirthDate(ctx.patient?.birth_date);
    const professionalName = ctx.professional?.name?.trim() || '';
    const professionalLicenseRaw = ctx.professional?.license?.trim() || '';
    const professionalLicenseFormatted = formatProfessionalLicense(professionalLicenseRaw);
    const procedureName = ctx.procedureName || (ctx.procedureKey ? getProcedureDisplayName(ctx.procedureKey) : '');
    const signedAtDate = ctx.signedAt
        ? (typeof ctx.signedAt === 'string' ? new Date(ctx.signedAt) : ctx.signedAt)
        : new Date();
    const { date: signedAtDateStr, dateTime: signedAtDateTimeStr } = formatDateTime(signedAtDate);
    // Substituir placeholders do paciente
    rendered = rendered.replace(/\{\{patient_name\}\}/gi, patientName);
    rendered = rendered.replace(/\{\{patient_cpf\}\}/gi, patientCpf);
    rendered = rendered.replace(/\{\{patient_birth_date\}\}/gi, patientBirthDate);
    // Substituir placeholders do profissional
    rendered = rendered.replace(/\{\{professional_name\}\}/gi, professionalName);
    rendered = rendered.replace(/\{\{professional_license\}\}/gi, professionalLicenseRaw); // Mantido para compatibilidade
    rendered = rendered.replace(/\{\{professional_license_formatted\}\}/gi, professionalLicenseFormatted); // Novo formato
    // Substituir placeholders de procedimento
    rendered = rendered.replace(/\{\{procedure_name\}\}/gi, procedureName);
    // Substituir placeholders de data/hora
    rendered = rendered.replace(/\{\{signed_at_full\}\}/gi, signedAtDateTimeStr);
    rendered = rendered.replace(/\{\{signed_at\}\}/gi, signedAtDateStr);
    // Substituir placeholder de autorização de imagem com checkboxes
    let imageAuthCheckbox = '';
    if (ctx.imageAuthorization === true) {
        imageAuthCheckbox = '( X ) SIM, autorizo o uso de minhas imagens para fins de documentação clínica e divulgação científica.\n(   ) NÃO, não autorizo o uso de minhas imagens para qualquer finalidade.';
    }
    else if (ctx.imageAuthorization === false) {
        imageAuthCheckbox = '(   ) SIM, autorizo o uso de minhas imagens para fins de documentação clínica e divulgação científica.\n( X ) NÃO, não autorizo o uso de minhas imagens para qualquer finalidade.';
    }
    rendered = rendered.replace(/\{\{image_authorization_checkbox\}\}/gi, imageAuthCheckbox);
    // Substituir placeholder antigo de autorização (compatibilidade)
    let imageAuthText = '';
    if (ctx.imageAuthorization === true) {
        imageAuthText = 'Autorizo o uso de minhas imagens para fins de documentação clínica e divulgação científica.';
    }
    else if (ctx.imageAuthorization === false) {
        imageAuthText = 'Não autorizo o uso de minhas imagens para qualquer finalidade.';
    }
    rendered = rendered.replace(/\{\{image_authorization_text\}\}/gi, imageAuthText);
    // Remover placeholders antigos (compatibilidade)
    rendered = rendered.replace(/\{\{signed_at_location_date\}\}/gi, signedAtDateStr);
    rendered = rendered.replace(/\{\{image_authorization\}\}/gi, imageAuthText);
    // Remover seções desnecessárias (campos manuais de assinatura e data)
    rendered = removeUnnecessarySections(rendered);
    // REMOVER TODOS OS TOKENS NÃO RESOLVIDOS (qualquer {{...}} restante)
    // Isso garante que NUNCA apareça um placeholder na tela
    rendered = rendered.replace(/\{\{\s*[\w_]+\s*\}\}/g, '');
    // Limpar linhas vazias múltiplas
    rendered = rendered.replace(/\n{3,}/g, '\n\n');
    const finalContent = rendered.trim();
    // Validar que o conteúdo final não está vazio
    // Se estiver vazio, pode indicar que o template estava vazio ou todos os placeholders foram removidos
    if (finalContent === '' && template.trim() !== '') {
        // Se o template original não estava vazio mas o resultado está, algo deu errado
        logger.warn('[CONSENT] Rendered content is empty but template was not', {
            originalTemplateLength: template.length,
            hasPatientData: !!ctx.patient?.name,
            hasProfessionalData: !!ctx.professional?.name,
            hasProcedureKey: !!ctx.procedureKey,
            hasImageAuth: ctx.imageAuthorization !== undefined && ctx.imageAuthorization !== null,
        });
    }
    return finalContent;
};
/**
 * Preencher template com dados do paciente e profissional
 * Nunca lança erro - retorna objeto com status
 *
 * ATUALIZADO: Usa novo sistema de termos (src/termos/) se disponível, senão usa template do banco
 */
export const fillConsentTemplate = (template, patient, professional, procedureKey, signedAt, imageAuthorization) => {
    const missingFields = [];
    // 1. Tentar usar novo sistema de termos primeiro
    if (procedureKey) {
        try {
            const termoContext = {
                patient: {
                    name: patient.name,
                    cpf: patient.cpf,
                    birth_date: patient.birth_date,
                },
                professional: professional ? {
                    name: professional.name || '',
                    license: professional.license || '',
                } : {
                    name: '',
                    license: '',
                },
                signedAt: signedAt || new Date(),
                procedureLabel: getProcedureDisplayName(procedureKey),
                imageAuthorization: imageAuthorization === true,
            };
            const termoResult = renderTermo(procedureKey, termoContext);
            if (termoResult) {
                if (termoResult.missingFields.length > 0) {
                    // Converter campos faltantes para formato antigo
                    const convertedMissing = termoResult.missingFields.map(field => {
                        const map = {
                            'patient_name': 'patient_name',
                            'patient_cpf': 'patient_cpf',
                            'patient_birth_date': 'patient_birth_date',
                            'professional_name': 'professional_name',
                            'professional_license': 'professional_license',
                            'signed_at': 'signed_at',
                            'image_authorization': 'image_authorization',
                            'procedure_label': 'procedure_key',
                        };
                        return map[field] || field;
                    });
                    return {
                        ok: false,
                        previewContent: termoResult.content,
                        missingFields: convertedMissing,
                    };
                }
                logger.debug('[CONSENT] Usando novo sistema de termos', { procedureKey });
                return {
                    ok: true,
                    filledContent: termoResult.content,
                };
            }
        }
        catch (error) {
            logger.warn('[CONSENT] Erro ao usar novo sistema de termos, usando fallback:', error.message);
        }
    }
    // 2. Fallback: usar template do banco (sistema antigo)
    if (!template.content || template.content.trim() === '') {
        missingFields.push('template_content_missing');
        return {
            ok: false,
            previewContent: '',
            missingFields,
        };
    }
    const templateContent = template.content;
    logger.debug('[CONSENT] Usando template do banco de dados (fallback)', { procedureKey });
    // 2. Validar dados do paciente
    if (!patient?.name || patient.name.trim() === '') {
        missingFields.push('patient_name');
    }
    if (!patient?.cpf || patient.cpf.trim() === '') {
        missingFields.push('patient_cpf');
    }
    if (!patient?.birth_date) {
        missingFields.push('patient_birth_date');
    }
    // 3. Validar dados do profissional
    if (!professional) {
        missingFields.push('professional_name', 'professional_license');
    }
    else {
        if (!professional.name || professional.name.trim() === '') {
            missingFields.push('professional_name');
        }
        // Validação mais rigorosa: license deve ter pelo menos 1 caractere após trim
        if (!professional.license || professional.license.trim().length === 0) {
            missingFields.push('professional_license');
        }
    }
    // 4. Validar procedimento
    if (!procedureKey || procedureKey.trim() === '') {
        missingFields.push('procedure_key');
    }
    // 5. Validar autorização de imagem
    if (imageAuthorization === null || imageAuthorization === undefined) {
        missingFields.push('image_authorization');
    }
    // Se faltar campos obrigatórios, retornar preview limpo (sem tokens)
    if (missingFields.length > 0) {
        const cleanedPreview = renderConsentTemplate(template.content, {
            patient: {
                name: patient?.name || '',
                cpf: patient?.cpf || '',
                birth_date: patient?.birth_date || null,
            },
            professional: professional ? {
                name: professional.name || '',
                license: professional.license || '',
            } : null,
            procedureKey: procedureKey || null,
            procedureName: procedureKey ? getProcedureDisplayName(procedureKey) : null,
            signedAt: signedAt || new Date(),
            imageAuthorization: imageAuthorization !== undefined ? imageAuthorization : null,
        });
        return {
            ok: false,
            previewContent: cleanedPreview,
            missingFields,
        };
    }
    // Obter nome do procedimento (garantir que sempre tenha valor)
    // Se procedureKey não estiver no map, usar o próprio procedureKey como fallback
    const procedureName = procedureKey ? (getProcedureDisplayName(procedureKey) || procedureKey) : '';
    if (!procedureName || procedureName.trim() === '') {
        logger.warn('[CONSENT] procedure_name is empty', {
            procedureKey,
            procedureName,
            mapHasKey: procedureKey ? procedureKey in PROCEDURE_NAME_MAP : false,
        });
        missingFields.push('procedure_name');
        return {
            ok: false,
            previewContent: '',
            missingFields,
        };
    }
    // Renderizar template completo
    const ctx = {
        patient: {
            name: patient.name,
            cpf: patient.cpf,
            birth_date: patient.birth_date,
        },
        professional: {
            name: professional.name,
            license: professional.license,
        },
        procedureKey: procedureKey,
        procedureName: procedureName, // Garantir que procedureName está preenchido
        signedAt: signedAt || new Date(),
        imageAuthorization: imageAuthorization,
    };
    logger.debug('[CONSENT] context', ctx);
    const filledContent = renderConsentTemplate(templateContent, ctx);
    // Validar que o conteúdo final não está vazio
    if (!filledContent || filledContent.trim() === '') {
        missingFields.push('filled_content_empty');
        return {
            ok: false,
            previewContent: '',
            missingFields,
        };
    }
    return {
        ok: true,
        filledContent,
    };
};
const normalizeProcedures = (procedures) => {
    const grouped = new Map();
    for (const proc of procedures) {
        if (!proc.procedure_type)
            continue;
        // Normalizar: trim + lowercase para agrupar
        const normalized = proc.procedure_type.trim().toLowerCase();
        if (!grouped.has(normalized)) {
            // Criar slug único
            const slug = slugifyProcedure(proc.procedure_type.trim());
            // Formatar label (title case)
            const label = proc.procedure_type.trim()
                .split(/\s+/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            grouped.set(normalized, {
                key: slug,
                label,
                procedure_type: proc.procedure_type.trim(),
                sourceIds: [proc.id],
            });
        }
        else {
            // Adicionar ID ao grupo existente
            const existing = grouped.get(normalized);
            existing.sourceIds.push(proc.id);
        }
    }
    return Array.from(grouped.values());
};
/**
 * Buscar todos os procedimentos para seleção no termo
 *
 * ⚠️ SCHEMA REAL: Tabela procedures tem procedure_type, não name
 * Colunas: id, procedure_type, is_active, etc.
 *
 * Estratégia:
 * 1. Buscar de `procedures` usando `procedure_type`
 * 2. Normalizar e deduplicar por procedure_type
 * 3. Se não houver dados, usar fallback hardcoded
 */
export const getProcedures = async () => {
    // Obter apenas termos canônicos únicos do registry (fonte da verdade)
    // Isso garante que todos os termos do registry apareçam na lista
    const canonicalTermos = getCanonicalTermos();
    // Criar lista base a partir dos termos canônicos do registry
    const registryProcedures = canonicalTermos.map(termo => ({
        value: termo.key,
        label: termo.label,
        procedure_type: termo.label,
    }));
    try {
        // Buscar do banco usando schema real
        const { data, error } = await supabase
            .from('procedures')
            .select('id, procedure_type, is_active')
            .eq('is_active', true)
            .order('procedure_type', { ascending: true });
        if (error) {
            logger.warn('[CONSENT] Erro ao buscar procedures:', error.message);
            // Retornar apenas termos do registry se erro no banco
            return registryProcedures.sort((a, b) => a.label.localeCompare(b.label));
        }
        if (!data || data.length === 0) {
            logger.debug('[CONSENT] Nenhum procedimento no banco, usando termos do registry');
            return registryProcedures.sort((a, b) => a.label.localeCompare(b.label));
        }
        // Normalizar e deduplicar procedimentos do banco
        const normalized = normalizeProcedures(data);
        // Converter para ProcedureOption e normalizar para termos canônicos
        const canonicalMap = new Map();
        for (const proc of normalized) {
            const key = proc.key;
            const label = proc.label;
            // Normalizar para termo canônico
            const canonical = normalizeProcedure(key, label);
            // Se já existe um procedimento com o mesmo canonicalKey, pular (dedupe)
            if (!canonicalMap.has(canonical.canonicalKey)) {
                canonicalMap.set(canonical.canonicalKey, {
                    value: canonical.canonicalKey,
                    label: canonical.canonicalLabel,
                    procedure_type: canonical.canonicalLabel,
                });
            }
        }
        // Adicionar todos os termos do registry (prioridade - são a fonte da verdade)
        // Isso garante que todos os termos do registry apareçam, mesmo que não estejam no banco
        for (const registryProc of registryProcedures) {
            // Sempre usar o termo do registry (mais atualizado e completo)
            canonicalMap.set(registryProc.value, registryProc);
        }
        // Converter Map para Array
        const options = Array.from(canonicalMap.values());
        // Ordenar
        options.sort((a, b) => a.label.localeCompare(b.label));
        logger.debug('[CONSENT] Procedimentos carregados (registry + banco):', {
            count: options.length,
            fromRegistry: registryProcedures.length,
            fromDatabase: normalized.length
        });
        return options;
    }
    catch (error) {
        logger.warn('[CONSENT] Erro ao buscar procedures, usando termos do registry:', error.message);
        // Em caso de erro, retornar termos do registry (sempre disponíveis)
        return registryProcedures.sort((a, b) => a.label.localeCompare(b.label));
    }
};
/**
 * Buscar procedimento por procedure_key (slug)
 */
export const getProcedureByKey = async (procedureKey) => {
    // Buscar todos os procedimentos e encontrar pelo slug
    const procedures = await getProcedures();
    return procedures.find(p => p.value === procedureKey) || null;
};
/**
 * Buscar procedimento por ID (mantido para compatibilidade, mas não recomendado)
 */
export const getProcedureById = async (id) => {
    const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw new Error(`Erro ao buscar procedimento: ${error.message}`);
    }
    return data;
};
/**
 * Criar termo de consentimento assinado
 * ⚠️ NOVO: Suporta assinaturas JSON (fonte da verdade) + fallback PNG
 */
export const createConsentForm = async (params) => {
    // ⚠️ ATENÇÃO: procedure_key é NOT NULL no schema - sempre deve ser fornecido
    if (!params.procedureKey || params.procedureKey.trim() === '') {
        throw new Error('procedure_key é obrigatório para criar consent_form');
    }
    // Upload PNG apenas se fornecido (fallback opcional)
    let patientSignatureUrl = null;
    let professionalSignatureUrl = null;
    if (params.patientSignatureDataUrl) {
        try {
            patientSignatureUrl = await uploadSignature({
                patientId: params.patientId,
                visitId: params.visitId,
                signatureDataUrl: params.patientSignatureDataUrl,
                signatureType: 'patient',
            });
        }
        catch (error) {
            logger.warn('[CONSENT] Erro ao fazer upload PNG do paciente (continuando com JSON):', error);
        }
    }
    if (params.professionalSignatureDataUrl) {
        try {
            professionalSignatureUrl = await uploadSignature({
                patientId: params.patientId,
                visitId: params.visitId,
                signatureDataUrl: params.professionalSignatureDataUrl,
                signatureType: 'professional',
            });
        }
        catch (error) {
            logger.warn('[CONSENT] Erro ao fazer upload PNG do profissional (continuando com JSON):', error);
        }
    }
    // Criar registro no banco
    const insertData = {
        visit_procedure_id: params.visitProcedureId || null,
        procedure_key: params.procedureKey, // ⚠️ NOT NULL
        template_id: params.templateId || null,
        content_snapshot: params.filledContent, // ⚠️ NOT NULL
        filled_content: params.filledContent || null,
        patient_signature_url: patientSignatureUrl, // Opcional
        professional_signature_url: professionalSignatureUrl, // Opcional
        patient_signature_data: params.patientSignatureData || null, // ⚠️ NOVO: JSON (fonte da verdade)
        professional_signature_data: params.professionalSignatureData || null, // ⚠️ NOVO: JSON (fonte da verdade)
        image_authorization: params.imageAuthorization, // ⚠️ NOT NULL
        signed_location: params.signedLocation || '', // ⚠️ NOT NULL
        signed_at: new Date().toISOString(), // ⚠️ NOT NULL
        patient_id: params.patientId, // ⚠️ NOT NULL
        professional_id: params.professionalId, // ⚠️ NOT NULL
    };
    const { data, error } = await supabase
        .from('consent_forms')
        .insert([insertData])
        .select()
        .single();
    if (error) {
        logger.error('[CONSENT] Erro ao criar termo:', error);
        throw new Error(`Erro ao criar termo de consentimento: ${error.message}`);
    }
    logger.debug('[CONSENT] Termo criado com sucesso:', { id: data.id, procedureKey: params.procedureKey });
    return data;
};
/**
 * Buscar termo de consentimento por ID
 */
export const getConsentFormById = async (id) => {
    const { data, error } = await supabase
        .from('consent_forms')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw new Error(`Erro ao buscar termo: ${error.message}`);
    }
    return data;
};
/**
 * Buscar termos de consentimento de um procedimento
 */
export const getConsentFormsByVisitProcedure = async (visitProcedureId) => {
    const { data, error } = await supabase
        .from('consent_forms')
        .select('*')
        .eq('visit_procedure_id', visitProcedureId)
        .order('created_at', { ascending: false });
    if (error) {
        throw new Error(`Erro ao buscar termos: ${error.message}`);
    }
    return data || [];
};
// Cache simples para verificar se coluna edited_at existe (evita múltiplas queries)
let hasEditedAtColumn = null;
/**
 * Buscar todos os termos de consentimento de um paciente
 * ⚠️ Schema real: NÃO filtra deleted_at (coluna não existe)
 */
export const getConsentFormsByPatient = async (patientId) => {
    const { data, error } = await supabase
        .from('consent_forms')
        .select('*')
        .eq('patient_id', patientId)
        .order('signed_at', { ascending: false });
    if (error) {
        logger.error('[CONSENT] Erro ao buscar termos:', error);
        throw new Error(`Erro ao buscar termos do paciente: ${error.message}`);
    }
    return data || [];
};
/**
 * Verificar se coluna edited_at existe (com cache)
 */
const checkEditedAtColumn = async () => {
    if (hasEditedAtColumn !== null) {
        return hasEditedAtColumn;
    }
    try {
        const { error } = await supabase
            .from('consent_forms')
            .select('id, edited_at')
            .limit(1);
        if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
            hasEditedAtColumn = false;
            logger.debug('[CONSENT] Coluna edited_at não existe no schema');
            return false;
        }
        hasEditedAtColumn = true;
        logger.debug('[CONSENT] Coluna edited_at existe no schema');
        return true;
    }
    catch (error) {
        logger.warn('[CONSENT] Erro ao verificar coluna edited_at, assumindo que não existe:', error.message);
        hasEditedAtColumn = false;
        return false;
    }
};
export const updateConsentForm = async (params) => {
    const updateData = {};
    // Adicionar campos de edição apenas se colunas existirem
    const hasEditedColumn = await checkEditedAtColumn();
    if (hasEditedColumn) {
        updateData.edited_at = new Date().toISOString();
        updateData.edited_by = params.editedBy;
    }
    if (params.filledContent !== undefined) {
        updateData.filled_content = params.filledContent;
    }
    if (params.content_snapshot !== undefined) {
        updateData.content_snapshot = params.content_snapshot;
    }
    if (params.patientSignatureData !== undefined) {
        updateData.patient_signature_data = params.patientSignatureData;
    }
    if (params.professionalSignatureData !== undefined) {
        updateData.professional_signature_data = params.professionalSignatureData;
    }
    if (params.patientSignatureDataUrl !== undefined) {
        updateData.patient_signature_url = params.patientSignatureDataUrl;
    }
    if (params.professionalSignatureDataUrl !== undefined) {
        updateData.professional_signature_url = params.professionalSignatureDataUrl;
    }
    if (params.imageAuthorization !== undefined) {
        updateData.image_authorization = params.imageAuthorization;
    }
    const { data, error } = await supabase
        .from('consent_forms')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();
    if (error) {
        logger.error('[CONSENT] Erro ao atualizar termo:', error);
        throw new Error(`Erro ao atualizar termo: ${error.message}`);
    }
    logger.debug('[CONSENT] Termo atualizado:', { id: params.id });
    return data;
};
/**
 * Excluir termo de consentimento (DELETE real)
 *
 * Remove o registro do banco e opcionalmente remove arquivos do storage
 */
export const deleteConsentForm = async (id, options) => {
    // Buscar termo para obter paths das assinaturas (se quiser remover do storage)
    let patientSignaturePath = null;
    let professionalSignaturePath = null;
    if (options?.removeStorageFiles) {
        try {
            const consent = await getConsentFormById(id);
            if (consent) {
                patientSignaturePath = consent.patient_signature_url;
                professionalSignaturePath = consent.professional_signature_url;
            }
        }
        catch (error) {
            logger.warn('[CONSENT] Erro ao buscar termo para remover arquivos:', error);
            // Continuar mesmo se falhar
        }
    }
    // DELETE real (não PATCH)
    const { error } = await supabase
        .from('consent_forms')
        .delete()
        .eq('id', id);
    if (error) {
        // Verificar se é erro de RLS
        if (error.code === '42501' || error.message?.includes('policy') || error.message?.includes('RLS')) {
            logger.error('[CONSENT] Erro de RLS ao excluir termo:', error);
            throw new Error('Você não tem permissão para excluir este termo. Verifique as políticas RLS.');
        }
        logger.error('[CONSENT] Erro ao excluir termo:', error);
        throw new Error(`Erro ao excluir termo: ${error.message}`);
    }
    // Remover arquivos do storage se solicitado
    if (options?.removeStorageFiles && (patientSignaturePath || professionalSignaturePath)) {
        try {
            const { deleteFile } = await import('../storage/storageService');
            const { isUrl } = await import('../../utils/storageUtils');
            // Remover apenas se for path (não URL completa)
            if (patientSignaturePath && !isUrl(patientSignaturePath)) {
                try {
                    await deleteFile('consent-attachments', patientSignaturePath);
                    logger.debug('[CONSENT] Arquivo do paciente removido do storage:', patientSignaturePath);
                }
                catch (err) {
                    logger.warn('[CONSENT] Erro ao remover arquivo do paciente do storage:', err);
                    // Não falhar se não conseguir remover
                }
            }
            if (professionalSignaturePath && !isUrl(professionalSignaturePath)) {
                try {
                    await deleteFile('consent-attachments', professionalSignaturePath);
                    logger.debug('[CONSENT] Arquivo do profissional removido do storage:', professionalSignaturePath);
                }
                catch (err) {
                    logger.warn('[CONSENT] Erro ao remover arquivo do profissional do storage:', err);
                    // Não falhar se não conseguir remover
                }
            }
        }
        catch (storageError) {
            logger.warn('[CONSENT] Erro ao remover arquivos do storage:', storageError);
            // Não falhar se não conseguir remover arquivos
        }
    }
    logger.debug('[CONSENT] Termo excluído:', { id });
};
