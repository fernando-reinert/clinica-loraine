// src/screens/CheckTableStructureScreen.tsx
import React, { useState, useEffect } from 'react';
import { checkPatientFormsStructure } from '../utils/checkTableStructure';
import { CheckCircle, XCircle, AlertTriangle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const CheckTableStructureScreen: React.FC = () => {
  const [structure, setStructure] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const checkStructure = async () => {
    setLoading(true);
    try {
      const result = await checkPatientFormsStructure();
      setStructure(result);
    } catch (error) {
      toast.error('Erro ao verificar estrutura');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStructure();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando estrutura da tabela...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Estrutura da Tabela patient_forms
          </h1>

          {structure?.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Erro: {structure.error}</p>
            </div>
          ) : (
            <>
              {/* Colunas Encontradas */}
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Colunas Existentes ({structure?.columns?.length || 0})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {structure?.columns?.map((column: string) => (
                    <div
                      key={column}
                      className="flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded"
                    >
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-mono">{column}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colunas Faltantes */}
              {structure?.missingColumns?.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-red-700 mb-3">
                    Colunas Faltantes ({structure.missingColumns.length})
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {structure.missingColumns.map((column: string) => (
                      <div
                        key={column}
                        className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded"
                      >
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-mono">{column}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dados de Exemplo */}
              {structure?.sampleData && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Dados de Exemplo
                  </h2>
                  <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
                    {JSON.stringify(structure.sampleData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Ações */}
              <div className="border-t pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Próximos Passos</h2>
                
                {structure?.missingColumns?.length === 0 ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 text-green-800">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-semibold">✅ Estrutura correta! Podemos voltar ao código principal.</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2 text-yellow-800">
                      <AlertTriangle className="h-5 w-5 mt-0.5" />
                      <div>
                        <p className="font-semibold">⚠️ Precisamos adicionar colunas faltantes</p>
                        <button
                          onClick={() => {
                            const sql = `-- SQL para adicionar colunas faltantes
ALTER TABLE patient_forms 
ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE,
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS patient_signature TEXT,
ADD COLUMN IF NOT EXISTS patient_signature_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;`;
                            
                            navigator.clipboard.writeText(sql);
                            toast.success('SQL copiado para a área de transferência!');
                          }}
                          className="flex items-center space-x-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm mt-2"
                        >
                          <Copy size={14} />
                          <span>Copiar SQL para Adicionar Colunas</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={checkStructure}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Verificar Novamente
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckTableStructureScreen;