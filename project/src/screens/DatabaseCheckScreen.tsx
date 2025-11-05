// src/screens/DatabaseCheckScreen.tsx
import React, { useState, useEffect } from 'react';
import { checkClinicaLoraineDatabase, createPatientFormsTable, DatabaseCheck } from '../utils/checkDatabase';
import toast from 'react-hot-toast';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Plus,
  Copy
} from 'lucide-react';

const DatabaseCheckScreen: React.FC = () => {
  const [checkResult, setCheckResult] = useState<DatabaseCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [creatingTable, setCreatingTable] = useState(false);

  const checkDatabase = async () => {
    setLoading(true);
    try {
      const result = await checkClinicaLoraineDatabase();
      setCheckResult(result);
    } catch (error) {
      toast.error('Erro ao verificar banco de dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTable = async () => {
    setCreatingTable(true);
    try {
      const result = await createPatientFormsTable();
      if (result.success) {
        toast.success('Tabela verificada/criada com sucesso!');
      } else {
        toast.error(`Erro: ${result.error}`);
        // Mostrar SQL para copiar
        if (result.error?.includes('Execute este SQL')) {
          const sqlMatch = result.error.match(/Execute este SQL no Supabase:\n\n([\s\S]*)$/);
          if (sqlMatch) {
            navigator.clipboard.writeText(sqlMatch[1]);
            toast.success('SQL copiado para a área de transferência! Cole no Supabase.');
          }
        }
      }
      // Recarregar verificação
      await checkDatabase();
    } catch (error) {
      toast.error('Erro ao criar tabela');
    } finally {
      setCreatingTable(false);
    }
  };

  const copySQLToClipboard = () => {
    const sql = `-- SQL para criar a tabela patient_forms no Supabase
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

CREATE INDEX IF NOT EXISTS idx_patient_forms_patient_id ON patient_forms(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_forms_share_token ON patient_forms(share_token);
CREATE INDEX IF NOT EXISTS idx_patient_forms_status ON patient_forms(status);
ALTER TABLE patient_forms DISABLE ROW LEVEL SECURITY;`;

    navigator.clipboard.writeText(sql);
    toast.success('SQL copiado para a área de transferência!');
  };

  useEffect(() => {
    checkDatabase();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando banco de dados ClinicaLoraine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Verificação do Banco ClinicaLoraine
                </h1>
                <p className="text-gray-600">
                  Status das tabelas e recomendações
                </p>
              </div>
            </div>
            <button
              onClick={checkDatabase}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <RefreshCw size={16} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Tabelas */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tabelas</h2>
            <div className="space-y-3">
              {checkResult?.tables.map((table) => (
                <div
                  key={table.name}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    table.exists ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {table.exists ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <span className="font-medium text-gray-900">{table.name}</span>
                      {table.exists && table.rowCount !== undefined && (
                        <span className="text-sm text-gray-600 ml-2">
                          ({table.rowCount} registros)
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {table.exists ? '✅ Existe' : '❌ Não existe'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recomendações */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recomendações</h2>
            <div className="space-y-2">
              {checkResult?.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <span className="text-gray-800">{recommendation}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCreateTable}
                disabled={creatingTable}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Plus size={16} />
                <span>
                  {creatingTable ? 'Criando...' : 'Criar Tabela Patient_Forms'}
                </span>
              </button>

              <button
                onClick={copySQLToClipboard}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Copy size={16} />
                <span>Copiar SQL</span>
              </button>
            </div>
          </div>
        </div>

        {/* Informações do Banco */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações do Banco</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700">Nome do Banco:</span>
              <span className="ml-2 text-gray-900">ClinicaLoraine</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Tabelas Encontradas:</span>
              <span className="ml-2 text-gray-900">
                {checkResult?.tables.filter(t => t.exists).length} / {checkResult?.tables.length}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Status:</span>
              <span className={`ml-2 ${
                checkResult?.missingTables.length === 0 ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {checkResult?.missingTables.length === 0 ? '✅ Configurado' : '⚠️ Precisa de Ajustes'}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Recomendações:</span>
              <span className="ml-2 text-gray-900">
                {checkResult?.recommendations.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseCheckScreen;