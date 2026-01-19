import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/screens/CheckTableStructureScreen.tsx
import { useState, useEffect } from 'react';
import { checkPatientFormsStructure } from '../utils/checkTableStructure';
import { CheckCircle, XCircle, AlertTriangle, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
const CheckTableStructureScreen = () => {
    const [structure, setStructure] = useState(null);
    const [loading, setLoading] = useState(true);
    const checkStructure = async () => {
        setLoading(true);
        try {
            const result = await checkPatientFormsStructure();
            setStructure(result);
        }
        catch (error) {
            toast.error('Erro ao verificar estrutura');
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        checkStructure();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Verificando estrutura da tabela..." })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-gray-50 py-8", children: _jsx("div", { className: "max-w-4xl mx-auto px-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-sm border p-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-6", children: "Estrutura da Tabela patient_forms" }), structure?.error ? (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("p", { className: "text-red-800", children: ["Erro: ", structure.error] }) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-6", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-900 mb-3", children: ["Colunas Existentes (", structure?.columns?.length || 0, ")"] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2", children: structure?.columns?.map((column) => (_jsxs("div", { className: "flex items-center space-x-2 p-2 bg-green-50 border border-green-200 rounded", children: [_jsx(CheckCircle, { className: "h-4 w-4 text-green-600" }), _jsx("span", { className: "text-sm font-mono", children: column })] }, column))) })] }), structure?.missingColumns?.length > 0 && (_jsxs("div", { className: "mb-6", children: [_jsxs("h2", { className: "text-lg font-semibold text-red-700 mb-3", children: ["Colunas Faltantes (", structure.missingColumns.length, ")"] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-2", children: structure.missingColumns.map((column) => (_jsxs("div", { className: "flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded", children: [_jsx(XCircle, { className: "h-4 w-4 text-red-600" }), _jsx("span", { className: "text-sm font-mono", children: column })] }, column))) })] })), structure?.sampleData && (_jsxs("div", { className: "mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-3", children: "Dados de Exemplo" }), _jsx("pre", { className: "bg-gray-100 p-4 rounded-lg text-sm overflow-auto", children: JSON.stringify(structure.sampleData, null, 2) })] })), _jsxs("div", { className: "border-t pt-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Pr\u00F3ximos Passos" }), structure?.missingColumns?.length === 0 ? (_jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center space-x-2 text-green-800", children: [_jsx(CheckCircle, { className: "h-5 w-5" }), _jsx("span", { className: "font-semibold", children: "\u2705 Estrutura correta! Podemos voltar ao c\u00F3digo principal." })] }) })) : (_jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-start space-x-2 text-yellow-800", children: [_jsx(AlertTriangle, { className: "h-5 w-5 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold", children: "\u26A0\uFE0F Precisamos adicionar colunas faltantes" }), _jsxs("button", { onClick: () => {
                                                                const sql = `-- SQL para adicionar colunas faltantes
ALTER TABLE patient_forms 
ADD COLUMN IF NOT EXISTS share_token UUID UNIQUE,
ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS patient_signature TEXT,
ADD COLUMN IF NOT EXISTS patient_signature_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;`;
                                                                navigator.clipboard.writeText(sql);
                                                                toast.success('SQL copiado para a área de transferência!');
                                                            }, className: "flex items-center space-x-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm mt-2", children: [_jsx(Copy, { size: 14 }), _jsx("span", { children: "Copiar SQL para Adicionar Colunas" })] })] })] }) })), _jsx("button", { onClick: checkStructure, className: "mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: "Verificar Novamente" })] })] }))] }) }) }));
};
export default CheckTableStructureScreen;
