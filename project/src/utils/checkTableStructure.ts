// src/utils/checkTableStructure.ts
import { supabase } from '../lib/supabase';

export const checkPatientFormsStructure = async () => {
  try {
    console.log('🔍 Verificando estrutura da tabela patient_forms...');
    
    // Pegar um registro para ver as colunas
    const { data, error } = await supabase
      .from('patient_forms')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro:', error);
      return { error: error.message };
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('📋 COLUNAS ENCONTRADAS:', columns);
      
      // Verificar colunas importantes
      const requiredColumns = [
        'id',
        'patient_id', 
        'status',
        'answers',
        'share_token',
        'created_at'
      ];

      const missingColumns = requiredColumns.filter(col => !columns.includes(col));
      
      return {
        exists: true,
        columns,
        missingColumns,
        sampleData: data[0]
      };
    } else {
      return {
        exists: true,
        columns: [],
        missingColumns: [],
        message: 'Tabela existe mas não tem registros'
      };
    }

  } catch (error: any) {
    console.error('💥 Erro geral:', error);
    return { error: error.message };
  }
};