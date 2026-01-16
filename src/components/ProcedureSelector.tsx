// src/components/ProcedureSelector.tsx
// Componente para seleção de procedimentos
import React, { useState, useEffect } from 'react';
import { Search, Check, X } from 'lucide-react';
import { getProcedures, ProcedureOption } from '../services/consents/consentService';

interface ProcedureSelectorProps {
  selectedProcedures: string[]; // procedure_keys (slugs) dos procedimentos selecionados
  onSelectionChange: (procedureKeys: string[]) => void;
  multiSelect?: boolean;
  className?: string;
  onProcedureSelect?: (procedure: ProcedureOption) => void; // Callback quando seleciona
}

const ProcedureSelector: React.FC<ProcedureSelectorProps> = ({
  selectedProcedures,
  onSelectionChange,
  multiSelect = true,
  className = '',
  onProcedureSelect,
}) => {
  const [procedures, setProcedures] = useState<ProcedureOption[]>([]);
  const [filteredProcedures, setFilteredProcedures] = useState<ProcedureOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProcedures();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = procedures.filter(
        (p) =>
          p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.procedure_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProcedures(filtered);
    } else {
      setFilteredProcedures(procedures);
    }
  }, [searchTerm, procedures]);

  const loadProcedures = async () => {
    try {
      setLoading(true);
      const data = await getProcedures();
      setProcedures(data);
      setFilteredProcedures(data);
    } catch (error) {
      // Erro já é logado em getProcedures()
    } finally {
      setLoading(false);
    }
  };

  const toggleProcedure = (procedureKey: string) => {
    const procedure = procedures.find(p => p.value === procedureKey);
    
    if (multiSelect) {
      if (selectedProcedures.includes(procedureKey)) {
        onSelectionChange(selectedProcedures.filter((key) => key !== procedureKey));
      } else {
        onSelectionChange([...selectedProcedures, procedureKey]);
        if (procedure && onProcedureSelect) {
          onProcedureSelect(procedure);
        }
      }
    } else {
      onSelectionChange([procedureKey]);
      if (procedure && onProcedureSelect) {
        onProcedureSelect(procedure);
      }
    }
  };

  const removeProcedure = (procedureKey: string) => {
    onSelectionChange(selectedProcedures.filter((key) => key !== procedureKey));
  };

  const getSelectedProcedures = () => {
    return procedures.filter((p) => selectedProcedures.includes(p.value));
  };

  if (loading) {
    return (
      <div className={`glass-card p-6 border border-white/10 ${className}`}>
        <div className="text-center py-8 text-gray-400">Carregando procedimentos...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Buscar procedimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
        />
      </div>

      {/* Procedimentos selecionados */}
      {selectedProcedures.length > 0 && (
        <div className="glass-card p-4 border border-cyan-400/20 bg-cyan-500/10">
          <h4 className="text-sm font-semibold text-cyan-200 mb-3">Procedimentos Selecionados</h4>
          <div className="flex flex-wrap gap-2">
            {getSelectedProcedures().map((procedure) => (
              <div
                key={procedure.value}
                className="flex items-center gap-2 px-3 py-2 bg-cyan-500/20 border border-cyan-400/30 rounded-lg"
              >
                <span className="text-sm text-cyan-100">{procedure.label}</span>
                <button
                  onClick={() => removeProcedure(procedure.value)}
                  className="p-1 hover:bg-cyan-500/30 rounded transition-colors"
                >
                  <X size={14} className="text-cyan-200" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de procedimentos */}
      <div className="glass-card p-6 border border-white/10">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">
          {filteredProcedures.length} Procedimento(s) Disponível(is)
        </h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredProcedures.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Nenhum procedimento encontrado</p>
            </div>
          ) : (
            filteredProcedures.map((procedure, index) => {
              const isSelected = selectedProcedures.includes(procedure.value);
              // Garantir key único: usar value + index para evitar colisões
              const uniqueKey = `${procedure.value}-${index}`;
              return (
                <button
                  key={uniqueKey}
                  type="button"
                  onClick={() => toggleProcedure(procedure.value)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-semibold text-white">{procedure.label}</h5>
                        {isSelected && <Check size={18} className="text-cyan-400" />}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcedureSelector;
