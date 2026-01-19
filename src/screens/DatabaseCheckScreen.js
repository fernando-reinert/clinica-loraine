import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/screens/DatabaseCheckScreen.tsx
import { useState, useEffect } from 'react';
import { checkClinicaLoraineDatabase, createPatientFormsTable } from '../utils/checkDatabase';
import toast from 'react-hot-toast';
import { Database, CheckCircle, XCircle, AlertTriangle, RefreshCw, Plus, Copy } from 'lucide-react';
const DatabaseCheckScreen = () => {
    const [checkResult, setCheckResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [creatingTable, setCreatingTable] = useState(false);
    const checkDatabase = async () => {
        setLoading(true);
        try {
            const result = await checkClinicaLoraineDatabase();
            setCheckResult(result);
        }
        catch (error) {
            toast.error('Erro ao verificar banco de dados');
        }
        finally {
            setLoading(false);
        }
    };
    const handleCreateTable = async () => {
        setCreatingTable(true);
        try {
            const result = await createPatientFormsTable();
            if (result.success) {
                toast.success('Tabela verificada/criada com sucesso!');
            }
            else {
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
        }
        catch (error) {
            toast.error('Erro ao criar tabela');
        }
        finally {
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
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx(RefreshCw, { className: "animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Verificando banco de dados ClinicaLoraine..." })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-gray-50 py-8", children: _jsxs("div", { className: "max-w-4xl mx-auto px-4", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm border p-6 mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(Database, { className: "h-8 w-8 text-blue-600" }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Verifica\u00E7\u00E3o do Banco ClinicaLoraine" }), _jsx("p", { className: "text-gray-600", children: "Status das tabelas e recomenda\u00E7\u00F5es" })] })] }), _jsxs("button", { onClick: checkDatabase, className: "flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: [_jsx(RefreshCw, { size: 16 }), _jsx("span", { children: "Atualizar" })] })] }), _jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Tabelas" }), _jsx("div", { className: "space-y-3", children: checkResult?.tables.map((table) => (_jsxs("div", { className: `flex items-center justify-between p-3 rounded-lg border ${table.exists ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`, children: [_jsxs("div", { className: "flex items-center space-x-3", children: [table.exists ? (_jsx(CheckCircle, { className: "h-5 w-5 text-green-600" })) : (_jsx(XCircle, { className: "h-5 w-5 text-red-600" })), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-900", children: table.name }), table.exists && table.rowCount !== undefined && (_jsxs("span", { className: "text-sm text-gray-600 ml-2", children: ["(", table.rowCount, " registros)"] }))] })] }), _jsx("div", { className: "text-sm text-gray-600", children: table.exists ? '✅ Existe' : '❌ Não existe' })] }, table.name))) })] }), _jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Recomenda\u00E7\u00F5es" }), _jsx("div", { className: "space-y-2", children: checkResult?.recommendations.map((recommendation, index) => (_jsxs("div", { className: "flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg", children: [_jsx(AlertTriangle, { className: "h-5 w-5 text-yellow-600 mt-0.5" }), _jsx("span", { className: "text-gray-800", children: recommendation })] }, index))) })] }), _jsxs("div", { className: "border-t pt-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "A\u00E7\u00F5es R\u00E1pidas" }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("button", { onClick: handleCreateTable, disabled: creatingTable, className: "flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50", children: [_jsx(Plus, { size: 16 }), _jsx("span", { children: creatingTable ? 'Criando...' : 'Criar Tabela Patient_Forms' })] }), _jsxs("button", { onClick: copySQLToClipboard, className: "flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: [_jsx(Copy, { size: 16 }), _jsx("span", { children: "Copiar SQL" })] })] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm border p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Informa\u00E7\u00F5es do Banco" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "Nome do Banco:" }), _jsx("span", { className: "ml-2 text-gray-900", children: "ClinicaLoraine" })] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "Tabelas Encontradas:" }), _jsxs("span", { className: "ml-2 text-gray-900", children: [checkResult?.tables.filter(t => t.exists).length, " / ", checkResult?.tables.length] })] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "Status:" }), _jsx("span", { className: `ml-2 ${checkResult?.missingTables.length === 0 ? 'text-green-600' : 'text-yellow-600'}`, children: checkResult?.missingTables.length === 0 ? '✅ Configurado' : '⚠️ Precisa de Ajustes' })] }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-700", children: "Recomenda\u00E7\u00F5es:" }), _jsx("span", { className: "ml-2 text-gray-900", children: checkResult?.recommendations.length })] })] })] })] }) }));
};
export default DatabaseCheckScreen;
