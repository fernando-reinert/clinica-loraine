// src/services/signupFormService.ts
// Serviço para gerenciar formulários de cadastro público de pacientes

import { supabase } from './supabase/client';

export interface PatientSignupForm {
  id: string;
  share_token: string;
  status: 'sent' | 'completed' | 'expired';
  payload?: Record<string, any>; // JSONB payload (pode vir como 'answers' ou 'payload' do RPC)
  answers?: Record<string, any>; // Alias para compatibilidade
  share_expires_at: string;
  created_by?: string;
  patient_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PatientSignupAnswers {
  name?: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  address?: string;
  photo_url?: string;
}

export interface CompleteSignupResult {
  success: boolean;
  patient_id?: string;
  anamnese_token?: string;
  error?: string;
}

/**
 * Sanitizar token: remove espaços, vírgulas e caracteres inválidos
 * Mantém apenas word characters e hífens (formato UUID)
 */
const cleanToken = (token: string): string => {
  return token.replace(/[^\w-]/g, '');
};

/**
 * Extrair patient_id de diferentes formatos de retorno do RPC
 */
function extractPatientId(data: any): string | null {
  if (!data) return null;
  if (typeof data === 'string') return null; // pode ser token direto
  if (Array.isArray(data) && data.length > 0) {
    return extractPatientId(data[0]);
  }
  return data.patient_id ?? data.patientId ?? data.patient?.id ?? null;
}

/**
 * Buscar patient_id por CPF ou email como fallback final
 */
async function findPatientByData(cpf?: string, email?: string): Promise<string | null> {
  try {
    if (cpf) {
      const cleanCpf = cpf.replace(/\D/g, '');
      if (cleanCpf) {
        const { data, error } = await supabase
          .from('patients')
          .select('id')
          .eq('cpf', cleanCpf)
          .limit(1)
          .maybeSingle();
        
        if (!error && data?.id) {
          return data.id;
        }
      }
    }

    if (email && email.trim()) {
      const { data, error } = await supabase
        .from('patients')
        .select('id')
        .eq('email', email.trim())
        .limit(1)
        .maybeSingle();
      
      if (!error && data?.id) {
        return data.id;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Buscar anamnese_token (share_token) da anamnese pública por patient_id
 * Retorna o share_token de patient_forms com status 'sent' e não expirado
 */
async function findAnamneseTokenByPatientId(patientId: string): Promise<string | null> {
  try {
    const now = new Date().toISOString();
    
    // Buscar patient_forms com status 'sent' e não expirado
    const { data, error } = await supabase
      .from('patient_forms')
      .select('share_token, share_expires_at')
      .eq('patient_id', patientId)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(10); // Buscar múltiplos para filtrar expiração
    
    if (error) {
      return null;
    }
    
    if (!data || data.length === 0) {
      return null;
    }
    
    // Filtrar por expiração (pode ser null ou maior que agora)
    const validForm = data.find(form => {
      if (!form.share_expires_at) return true; // Sem expiração = válido
      return new Date(form.share_expires_at) > new Date();
    });
    
    if (validForm && validForm.share_token) {
      return validForm.share_token;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Criar formulário de cadastro (RPC server-side - gera token no Supabase)
 */
export const createSignupForm = async (
  expiresInHours: number = 48
): Promise<{ share_token: string; share_expires_at: string; url: string } | null> => {
  try {
    const { data, error } = await supabase.rpc('create_patient_signup_form', {
      p_expires_in_hours: expiresInHours,
    });

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    // Se data for array, usar o primeiro elemento
    const result = Array.isArray(data) ? data[0] : data;

    // Verificar se tem os campos necessários (sucesso)
    // O RPC retorna diretamente { id, share_token, share_expires_at, status }
    if (!result.share_token || !result.share_expires_at) {
      return null;
    }

    const baseUrl = window.location.origin;
    const url = `${baseUrl}/patient-signup/${result.share_token}`;

    return {
      share_token: result.share_token,
      share_expires_at: result.share_expires_at,
      url,
    };
  } catch (error) {
    return null;
  }
};

/**
 * Buscar formulário de cadastro por token (RPC Security Definer)
 */
export const getSignupFormByToken = async (token: string): Promise<PatientSignupForm | null> => {
  try {
    const cleanedToken = cleanToken(token);

    const { data, error } = await supabase.rpc('get_patient_signup_form_by_token', {
      p_token: cleanedToken,
    });

    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

    // Se data for array, usar o primeiro elemento
    const result = Array.isArray(data) ? data[0] : data;

    // Converter JSONB para objeto
    return result as unknown as PatientSignupForm;
  } catch (error) {
    return null;
  }
};

/**
 * Atualizar respostas do formulário de cadastro (RPC Security Definer)
 * Com debounce interno para evitar spam de logs
 */
let lastSaveTime = 0;
const SAVE_DEBOUNCE_MS = 500;

export const updateSignupFormAnswers = async (
  token: string,
  answers: PatientSignupAnswers
): Promise<boolean> => {
  try {
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTime;
    
    // Debounce: não salvar se passou menos de 500ms desde a última tentativa
    if (timeSinceLastSave < SAVE_DEBOUNCE_MS) {
      return true; // Retorna true silenciosamente para não interromper o fluxo
    }
    
    lastSaveTime = now;
    
    const cleanedToken = cleanToken(token);
    
    // Validar token antes de chamar RPC
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanedToken)) {
      return false;
    }

    const { data, error } = await supabase.rpc('save_patient_signup_answers', {
      p_token: cleanedToken,
      p_answers: answers,
    });

    if (error) {
      return false;
    }

    return data === true || (data && data.success === true);
  } catch (error) {
    // Erro silencioso no autosave para não interromper o preenchimento
    return false;
  }
};

/**
 * Completar cadastro do paciente (RPC Security Definer)
 * Faz upsert do paciente e cria/retorna token da anamnese
 */
export const completePatientSignup = async (
  token: string,
  patientData: {
    name: string;
    phone: string;
    cpf: string;
    birth_date: string;
    email?: string;
    address?: string;
    photo_url?: string;
  }
): Promise<CompleteSignupResult> => {
  try {
    const cleanedToken = cleanToken(token);
    
    // Validar que token limpo é UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(cleanedToken)) {
      return {
        success: false,
        error: 'Token inválido',
      };
    }

    const answers = {
      name: patientData.name,
      phone: patientData.phone,
      cpf: patientData.cpf.replace(/\D/g, ''), // Remover formatação
      birth_date: patientData.birth_date,
      email: patientData.email || null,
      address: patientData.address || null,
      photo_url: patientData.photo_url || null,
    };
    
    const { data, error } = await supabase.rpc('complete_patient_signup_and_get_anamnese_token', {
      p_token: cleanedToken,
      p_answers: answers,
    });

    // Tratar FORM_ALREADY_COMPLETED como sucesso
    if (error) {
      const errorMessage = error.message || '';
      const isFormAlreadyCompleted = errorMessage.includes('FORM_ALREADY_COMPLETED') || 
                                     errorMessage.includes('already completed') ||
                                     errorMessage.includes('já foi completado');
      
      if (isFormAlreadyCompleted) {
        // Fallback 1: Buscar formulário para obter patient_id
        const form = await getSignupFormByToken(cleanedToken);
        let patientId: string | null = null;
        
        if (form && form.patient_id) {
          patientId = form.patient_id;
        } else {
          // Fallback 2: Buscar por CPF ou email
          const patientIdByData = await findPatientByData(answers.cpf, answers.email || undefined);
          if (patientIdByData) {
            patientId = patientIdByData;
          }
        }
        
        // Buscar anamnese_token da anamnese pública
        if (patientId) {
          const anamneseToken = await findAnamneseTokenByPatientId(patientId);
          if (anamneseToken) {
            return {
              success: true,
              patient_id: patientId,
              anamnese_token: anamneseToken,
            };
          }
        }
        
        return {
          success: false,
          error: 'Formulário já completado, mas anamnese não encontrada',
        };
      }
      
      return {
        success: false,
        error: error.message || 'Erro ao completar cadastro',
      };
    }

    if (!data) {
      // Tentar fallback mesmo com null
      const form = await getSignupFormByToken(cleanedToken);
      if (form && form.patient_id) {
        // Buscar anamnese_token
        const anamneseToken = await findAnamneseTokenByPatientId(form.patient_id);
        if (anamneseToken) {
          return {
            success: true,
            patient_id: form.patient_id,
            anamnese_token: anamneseToken,
          };
        }
      }
      return {
        success: false,
        error: 'RPC retornou null e não foi possível obter anamnese_token',
      };
    }

    // Extrair anamnese_token e patient_id do retorno (pode estar em diferentes formatos)
    let patientId: string | null = null;
    let anamneseToken: string | null = null;

    // Se data for array, usar o primeiro elemento
    const result = Array.isArray(data) ? data[0] : data;

    // Se result for string (UUID direto), é o anamnese_token
    if (typeof result === 'string') {
      anamneseToken = result;
      // Buscar patient_id via formulário para ter contexto completo
      const form = await getSignupFormByToken(cleanedToken);
      if (form && form.patient_id) {
        patientId = form.patient_id;
      }
    } else if (result && typeof result === 'object') {
      // Verificar se tem success: false ou error
      if (result.success === false || result.error) {
        // Mesmo com erro, tentar fallback
      } else {
        // Extrair anamnese_token (prioridade para fluxo público)
        anamneseToken = result.anamnese_token ?? result.token ?? result.share_token ?? null;
        
        // Extrair patient_id (opcional, usado apenas para fallback)
        patientId = extractPatientId(result);
      }
    }

    // PRIORIDADE 1: Se temos anamnese_token, usar diretamente (fluxo público)
    if (anamneseToken) {
      // Se não temos patient_id, tentar buscar via formulário (opcional)
      if (!patientId) {
        const form = await getSignupFormByToken(cleanedToken);
        if (form && form.patient_id) {
          patientId = form.patient_id;
        }
      }
      
      return {
        success: true,
        patient_id: patientId || undefined,
        anamnese_token: anamneseToken,
      };
    }

    // PRIORIDADE 2: Se temos patient_id mas não anamnese_token, buscar anamnese_token
    if (!patientId) {
      // Fallback 1: Buscar via formulário
      const form = await getSignupFormByToken(cleanedToken);
      if (form && form.patient_id) {
        patientId = form.patient_id;
      }
      
      // Fallback 2: Buscar por CPF ou email
      if (!patientId) {
        const patientIdByData = await findPatientByData(answers.cpf, answers.email || undefined);
        if (patientIdByData) {
          patientId = patientIdByData;
        }
      }
    }

    // Se temos patient_id, buscar anamnese_token da anamnese pública
    if (patientId) {
      anamneseToken = await findAnamneseTokenByPatientId(patientId);
      
      if (anamneseToken) {
        return {
          success: true,
          patient_id: patientId,
          anamnese_token: anamneseToken,
        };
      }
    }

    // Se não conseguiu nenhum dos dois, retornar erro
    if (!anamneseToken) {
      return {
        success: false,
        error: 'Não foi possível obter token da anamnese. Tente novamente.',
      };
    }

    return {
      success: true,
      patient_id: patientId || undefined,
      anamnese_token: anamneseToken,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Erro desconhecido ao completar cadastro',
    };
  }
};

