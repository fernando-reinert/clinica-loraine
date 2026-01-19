import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ProcedureSelector.tsx
// Componente para seleção de procedimentos
import { useState, useEffect } from 'react';
import { Search, Check, X } from 'lucide-react';
import { getProcedures } from '../services/consents/consentService';
const ProcedureSelector = ({ selectedProcedures, onSelectionChange, multiSelect = true, className = '', onProcedureSelect, }) => {
    const [procedures, setProcedures] = useState([]);
    const [filteredProcedures, setFilteredProcedures] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        loadProcedures();
    }, []);
    useEffect(() => {
        if (searchTerm) {
            const filtered = procedures.filter((p) => p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.procedure_type.toLowerCase().includes(searchTerm.toLowerCase()));
            setFilteredProcedures(filtered);
        }
        else {
            setFilteredProcedures(procedures);
        }
    }, [searchTerm, procedures]);
    const loadProcedures = async () => {
        try {
            setLoading(true);
            const data = await getProcedures();
            setProcedures(data);
            setFilteredProcedures(data);
        }
        catch (error) {
            // Erro já é logado em getProcedures()
        }
        finally {
            setLoading(false);
        }
    };
    const toggleProcedure = (procedureKey) => {
        const procedure = procedures.find(p => p.value === procedureKey);
        if (multiSelect) {
            if (selectedProcedures.includes(procedureKey)) {
                onSelectionChange(selectedProcedures.filter((key) => key !== procedureKey));
            }
            else {
                onSelectionChange([...selectedProcedures, procedureKey]);
                if (procedure && onProcedureSelect) {
                    onProcedureSelect(procedure);
                }
            }
        }
        else {
            onSelectionChange([procedureKey]);
            if (procedure && onProcedureSelect) {
                onProcedureSelect(procedure);
            }
        }
    };
    const removeProcedure = (procedureKey) => {
        onSelectionChange(selectedProcedures.filter((key) => key !== procedureKey));
    };
    const getSelectedProcedures = () => {
        return procedures.filter((p) => selectedProcedures.includes(p.value));
    };
    if (loading) {
        return (_jsx("div", { className: `glass-card p-6 border border-white/10 ${className}`, children: _jsx("div", { className: "text-center py-8 text-gray-400", children: "Carregando procedimentos..." }) }));
    }
    return (_jsxs("div", { className: `space-y-4 ${className}`, children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", size: 20 }), _jsx("input", { type: "text", placeholder: "Buscar procedimento...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" })] }), selectedProcedures.length > 0 && (_jsxs("div", { className: "glass-card p-4 border border-cyan-400/20 bg-cyan-500/10", children: [_jsx("h4", { className: "text-sm font-semibold text-cyan-200 mb-3", children: "Procedimentos Selecionados" }), _jsx("div", { className: "flex flex-wrap gap-2", children: getSelectedProcedures().map((procedure) => (_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-lg", children: [_jsx("span", { className: "text-sm text-cyan-100", children: procedure.label }), _jsx("button", { onClick: () => removeProcedure(procedure.value), className: "p-1 hover:bg-cyan-500/30 rounded transition-colors", children: _jsx(X, { size: 14, className: "text-cyan-200" }) })] }, procedure.value))) })] })), _jsxs("div", { className: "glass-card p-6 border border-white/10", children: [_jsxs("h4", { className: "text-sm font-semibold text-gray-300 mb-4", children: [filteredProcedures.length, " Procedimento(s) Dispon\u00EDvel(is)"] }), _jsx("div", { className: "space-y-2 max-h-96 overflow-y-auto", children: filteredProcedures.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-400", children: _jsx("p", { children: "Nenhum procedimento encontrado" }) })) : (filteredProcedures.map((procedure, index) => {
                            const isSelected = selectedProcedures.includes(procedure.value);
                            // Garantir key único: usar value + index para evitar colisões
                            const uniqueKey = `${procedure.value}-${index}`;
                            return (_jsx("button", { type: "button", onClick: () => toggleProcedure(procedure.value), className: `w-full text-left p-4 rounded-xl border transition-all ${isSelected
                                    ? 'bg-cyan-500/20 border-cyan-400/30'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'}`, children: _jsx("div", { className: "flex items-start justify-between gap-4", children: _jsx("div", { className: "flex-1", children: _jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("h5", { className: "font-semibold text-white", children: procedure.label }), isSelected && _jsx(Check, { size: 18, className: "text-cyan-400" })] }) }) }) }, uniqueKey));
                        })) })] })] }));
};
export default ProcedureSelector;
