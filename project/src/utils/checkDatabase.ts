// src/utils/checkDatabase.ts
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface DatabaseCheck {
  tables: {
    name: string;
    exists: boolean;
    columns?: string[];
    rowCount?: number;
  }[];
  missingTables: string[];
  recommendations: string[];
}

export const checkClinicaLoraineDatabase = async (): Promise<DatabaseCheck> => {
  const result: DatabaseCheck = {
    tables: [],
    missingTables: [],
    recommendations: []
  };

  try {
    console.log('🔍 Verificando banco ClinicaLoraine...');

    // Lista de tabelas que deveriam existir
    const requiredTables = [
      'patients',
      'patient_forms',
      'appointments',
      'clinical_records',
      'financial_records',
      'gallery'
    ];

    for (const tableName of requiredTables) {
      try {
        console.log(`📊 Verificando tabela: ${tableName}`);
        
        // Tentar contar registros (se a tabela existe)
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (countError) {
          if (countError.code === '42P01') {
            // Tabela não existe
            result.tables.push({
              name: tableName,
              exists: false
            });
            result.missingTables.push(tableName);
            console.log(`❌ Tabela ${tableName} não existe`);
          } else {
            // Outro erro
            result.tables.push({
              name: tableName,
              exists: false
            });
            console.log(`⚠️ Erro ao verificar ${tableName}:`, countError);
          }
        } else {
          // Tabela existe
          result.tables.push({
            name: tableName,
            exists: true,
            rowCount: count || 0
          });
          console.log(`✅ Tabela ${tableName} existe com ${count} registros`);
        }

      } catch (error) {
        console.error(`💥 Erro ao verificar ${tableName}:`, error);
        result.tables.push({
          name: tableName,
          exists: false
        });
      }
    }

    // Verificar estrutura da tabela patient_forms (se existir)
    const patientFormsTable = result.tables.find(t => t.name === 'patient_forms');
    if (patientFormsTable?.exists) {
      try {
        const { data, error } = await supabase
          .from('patient_forms')
          .select('*')
          .limit(1);

        if (!error && data && data.length > 0) {
          patientFormsTable.columns = Object.keys(data[0]);
          console.log('📋 Colunas de patient_forms:', patientFormsTable.columns);
        }
      } catch (error) {
        console.error('Erro ao verificar colunas:', error);
      }
    }

    // Gerar recomendações
    generateRecommendations(result);

    return result;

  } catch (error) {
    console.error('💥 Erro geral na verificação:', error);
    toast.error('Erro ao verificar banco de dados');
    return result;
  }
};

const generateRecommendations = (result: DatabaseCheck): void => {
  const { tables, missingTables } = result;

  // Verificar tabela patients
  const patientsTable = tables.find(t => t.name === 'patients');
  if (!patientsTable?.exists) {
    result.recommendations.push('❌ CRIAR tabela "patients" - essencial para o sistema');
  }

  // Verificar tabela patient_forms
  const patientFormsTable = tables.find(t => t.name === 'patient_forms');
  if (!patientFormsTable?.exists) {
    result.recommendations.push('❌ CRIAR tabela "patient_forms" - necessária para formulários de anamnese');
  } else {
    // Verificar se tem as colunas necessárias
    if (patientFormsTable.columns) {
      const requiredColumns = ['id', 'patient_id', 'status', 'answers', 'share_token'];
      const missingColumns = requiredColumns.filter(col => 
        !patientFormsTable.columns!.includes(col)
      );
      
      if (missingColumns.length > 0) {
        result.recommendations.push(`⚠️ ADICIONAR colunas em patient_forms: ${missingColumns.join(', ')}`);
      }
    }
  }

  // Verificar se há dados
  if (patientsTable?.exists && patientsTable.rowCount === 0) {
    result.recommendations.push('💡 Adicionar alguns pacientes de teste');
  }

  if (patientFormsTable?.exists && patientFormsTable.rowCount === 0) {
    result.recommendations.push('💡 Criar um formulário de anamnese de teste');
  }

  if (missingTables.length === 0) {
    result.recommendations.push('✅ Banco de dados parece estar configurado corretamente!');
  }
};

// Função para criar a tabela patient_forms se não existir
export const createPatientFormsTable = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🚀 Criando tabela patient_forms...');

    // Primeiro verificar se já existe
    const { count, error: checkError } = await supabase
      .from('patient_forms')
      .select('*', { count: 'exact', head: true });

    if (checkError && checkError.code === '42P01') {
      // Tabela não existe, vamos criar
      console.log('📝 Tabela não existe, criando...');
      
      // Como não podemos executar SQL direto pelo cliente, vamos tentar criar inserindo um registro
      // Isso vai falar se a tabela tem a estrutura correta
      const testData = {
        patient_id: '00000000-0000-0000-0000-000000000000', // UUID fake para teste
        title: 'Teste de Estrutura',
        status: 'draft',
        answers: {},
        share_token: 'test-token-123',
        share_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: insertError } = await supabase
        .from('patient_forms')
        .insert([testData]);

      if (insertError) {
        if (insertError.code === '42P01') {
          return {
            success: false,
            error: `Tabela patient_forms não existe. Execute este SQL no Supabase:\n\n${getCreateTableSQL()}`
          };
        } else if (insertError.code === '23503') {
          // Foreign key violation - tabela existe mas não tem o paciente
          return { success: true }; // Tabela existe!
        } else {
          return { 
            success: false, 
            error: `Erro ao testar tabela: ${insertError.message}` 
          };
        }
      }

      // Se chegou aqui, a tabela foi criada com sucesso (ou já existia)
      // Remover o registro de teste
      await supabase
        .from('patient_forms')
        .delete()
        .eq('share_token', 'test-token-123');

      return { success: true };
    }

    // Se não houve erro, a tabela existe
    return { success: true };

  } catch (error: any) {
    console.error('💥 Erro ao criar tabela:', error);
    return {
      success: false,
      error: `Erro inesperado: ${error.message}`
    };
  }
};

const getCreateTableSQL = (): string => {
  return `-- SQL para criar a tabela patient_forms no Supabase
CREATE TABLE IF NOT EXISTS patient_forms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Formulário de Anamnese Estética',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'completed', 'signed')),
  share_token UUID UNIQUE,
  share_expires_at TIMESTAMP WITH TIME ZONE,
  patient_signature TEXT,
  patient_signature_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  answers JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_patient_forms_patient_id ON patient_forms(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_forms_share_token ON patient_forms(share_token);
CREATE INDEX IF NOT EXISTS idx_patient_forms_status ON patient_forms(status);

-- Desabilitar RLS para permitir acesso sem login
ALTER TABLE patient_forms DISABLE ROW LEVEL SECURITY;`;
};