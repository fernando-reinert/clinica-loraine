// src/services/professionals/professionalService.ts
// Serviço centralizado para gerenciar profissionais
import { supabase } from '../supabase/client';
/**
 * Buscar profissional por user_id (auth.uid())
 * Retorna todos os campos da tabela professionals
 */
export const getProfessionalByUserId = async (userId) => {
    const { data, error } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
    if (error) {
        // Se erro não for "não encontrado", lançar
        if (error.code !== 'PGRST116') {
            throw new Error(`Erro ao buscar profissional: ${error.message}`);
        }
        return null;
    }
    return data;
};
/**
 * Criar profissional automaticamente
 */
export const createProfessional = async (params) => {
    const { data, error } = await supabase
        .from('professionals')
        .insert([
        {
            user_id: params.user_id,
            email: params.email,
            name: params.name,
            license: params.license,
            profession: params.profession || 'Enfermeira',
            phone: params.phone || null,
            address: params.address || null,
        },
    ])
        .select()
        .single();
    if (error) {
        throw new Error(`Erro ao criar profissional: ${error.message}`);
    }
    return data;
};
/**
 * Atualizar profissional por ID
 */
export const updateProfessional = async (professionalId, updates) => {
    const { data, error } = await supabase
        .from('professionals')
        .update(updates)
        .eq('id', professionalId)
        .select()
        .single();
    if (error) {
        throw new Error(`Erro ao atualizar profissional: ${error.message}`);
    }
    return data;
};
/**
 * Buscar ou criar profissional (helper)
 * Se não existir, retorna null (para mostrar modal de criação)
 */
export const getOrCreateProfessional = async (userId, userEmail) => {
    let professional = await getProfessionalByUserId(userId);
    if (!professional) {
        // Não criar automaticamente - retornar null para mostrar modal
        return null;
    }
    return professional;
};
/**
 * Upsert profissional (insert ou update)
 * Usa user_id como chave única
 */
export const upsertProfessional = async (params) => {
    // Verificar se já existe
    const existing = await getProfessionalByUserId(params.user_id);
    if (existing) {
        // Update por ID
        return await updateProfessional(existing.id, {
            email: params.email,
            name: params.name,
            license: params.license,
            profession: params.profession || existing.profession,
            phone: params.phone || existing.phone || null,
            address: params.address || existing.address || null,
        });
    }
    else {
        // Insert
        return await createProfessional({
            user_id: params.user_id,
            email: params.email,
            name: params.name,
            license: params.license,
            profession: params.profession || 'Enfermeira',
            phone: params.phone || null,
            address: params.address || null,
        });
    }
};
/**
 * Garantir que existe um profissional padrão para o usuário
 * Se não existir, cria automaticamente com dados padrão (Loraine Vilela Reinert, COREN 344168)
 * Se existir mas license estiver vazio/null, atualiza
 * SEMPRE retorna um profissional com license preenchido
 */
export const ensureDefaultProfessionalProfile = async (user) => {
    const DEFAULT_PROFESSIONAL = {
        name: 'Loraine Vilela Reinert',
        profession: 'Enfermeira',
        license: 'COREN 344168',
    };
    // Buscar profissional existente
    let professional = await getProfessionalByUserId(user.id);
    if (!professional) {
        // Não existe: criar com dados padrão
        console.log('[PROFESSIONAL] Creating default professional profile', {
            userId: user.id,
            email: user.email,
            defaultName: DEFAULT_PROFESSIONAL.name,
            defaultLicense: DEFAULT_PROFESSIONAL.license,
        });
        professional = await createProfessional({
            user_id: user.id,
            email: user.email || `${user.id}@clinica-loraine.local`,
            name: DEFAULT_PROFESSIONAL.name,
            license: DEFAULT_PROFESSIONAL.license,
            profession: DEFAULT_PROFESSIONAL.profession,
        });
        return professional;
    }
    // Existe: verificar se license está preenchido
    if (!professional.license || professional.license.trim() === '') {
        // License vazio: atualizar com padrão (usar ID do profissional)
        console.log('[PROFESSIONAL] Updating professional license to default', {
            professionalId: professional.id,
            currentLicense: professional.license,
            defaultLicense: DEFAULT_PROFESSIONAL.license,
        });
        professional = await updateProfessional(professional.id, {
            license: DEFAULT_PROFESSIONAL.license,
        });
    }
    // Garantir que name também está preenchido (fallback)
    if (!professional.name || professional.name.trim() === '') {
        console.log('[PROFESSIONAL] Updating professional name to default', {
            professionalId: professional.id,
            currentName: professional.name,
            defaultName: DEFAULT_PROFESSIONAL.name,
        });
        professional = await updateProfessional(professional.id, {
            name: DEFAULT_PROFESSIONAL.name,
        });
    }
    return professional;
};
