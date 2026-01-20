// src/screens/ProceduresScreen.tsx - Catálogo de Procedimentos (CRUD completo)
import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  Clock,
  DollarSign,
  Grid,
  List,
  Filter,
  Plus,
  X,
  Edit,
  Trash2,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { listProcedures, createProcedure, updateProcedure, toggleActive } from '../services/procedures/procedureService';
import type { Procedure } from '../types/db';

type ViewMode = 'grid' | 'list';
type StatusFilter = 'all' | 'active' | 'inactive';

interface ProcedureFormState {
  name: string;
  category: string;
  duration_minutes: string;
  cost_price: string;
  sale_price: string;
  is_active: boolean;
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return '-';
  try {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  } catch {
    return `R$ ${Number(value).toFixed(2)}`;
  }
};

const ProceduresScreen: React.FC = () => {
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);

  const [form, setForm] = useState<ProcedureFormState>({
    name: '',
    category: '',
    duration_minutes: '30',
    cost_price: '0',
    sale_price: '0',
    is_active: true,
  });

  useEffect(() => {
    loadProcedures();
  }, []);

  const loadProcedures = async () => {
    try {
      setLoading(true);
      const data = await listProcedures();
      setProcedures(data);
    } catch (error: any) {
      toast.error(`Erro ao carregar procedimentos: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm({
      name: '',
      category: '',
      duration_minutes: '30',
      cost_price: '0',
      sale_price: '0',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (procedure: Procedure) => {
    setEditing(procedure);
    setForm({
      name: procedure.name || '',
      category: procedure.category || '',
      duration_minutes: String(procedure.duration_minutes ?? 30),
      cost_price: String(procedure.cost_price ?? 0),
      sale_price: String(procedure.sale_price ?? 0),
      is_active: procedure.is_active,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const handleChange = (field: keyof ProcedureFormState, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const duration = Number(form.duration_minutes.replace(',', '.'));
    const cost = Number(form.cost_price.replace(',', '.'));
    const sale = Number(form.sale_price.replace(',', '.'));

    if (!form.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    if (Number.isNaN(duration) || Number.isNaN(cost) || Number.isNaN(sale)) {
      toast.error('Duração e valores devem ser numéricos');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || null,
        duration_minutes: duration,
        cost_price: cost,
        sale_price: sale,
        // Na criação, sempre criar como ativo (não usar form.is_active)
        // Na edição, usar o valor do form (que pode ser alterado pelo toggle)
        is_active: editing ? form.is_active : true,
      };

      if (editing) {
        await updateProcedure(editing.id, payload);
        const statusMsg = payload.is_active ? 'ativado' : 'desativado';
        toast.success(`Procedimento atualizado e ${statusMsg} com sucesso!`);
      } else {
        await createProcedure(payload);
        toast.success('Procedimento criado como Ativo com sucesso!');
      }

      setModalOpen(false);
      setEditing(null);
      // Resetar form para estado inicial
      setForm({
        name: '',
        category: '',
        duration_minutes: '30',
        cost_price: '0',
        sale_price: '0',
        is_active: true,
      });
      await loadProcedures();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao salvar procedimento');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (procedure: Procedure, value: boolean) => {
    try {
      await toggleActive(procedure.id, value);
      if (!value) {
        toast.success('Procedimento desativado (soft delete)');
      } else {
        toast.success('Procedimento reativado');
      }
      await loadProcedures();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao alterar status do procedimento');
    }
  };

  const filteredProcedures = procedures.filter((procedure) => {
    if (statusFilter === 'active' && !procedure.is_active) return false;
    if (statusFilter === 'inactive' && procedure.is_active) return false;

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase();
    return (
      procedure.name.toLowerCase().includes(term) ||
      (procedure.category || '').toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <AppLayout title="Catálogo de Procedimentos">
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Catálogo de Procedimentos">
      <div className="space-y-6">
        {/* Header */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold glow-text mb-2">
                Catálogo de Procedimentos
              </h2>
              <p className="text-gray-400">
                {filteredProcedures.length} procedimento
                {filteredProcedures.length !== 1 ? 's' : ''} encontrado
                {filteredProcedures.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={openCreateModal}
                className="neon-button flex items-center gap-2 px-4 py-2"
              >
                <Plus size={18} />
                <span>Novo procedimento</span>
              </button>
              <div className="p-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl hidden md:block">
                <Package size={32} className="text-white" />
              </div>
            </div>
          </div>

          {/* Busca e Filtros */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar por nome ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex bg-white/5 rounded-xl p-1">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1 ${
                    statusFilter === 'all'
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Filter size={14} />
                  Todos
                </button>
                <button
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${
                    statusFilter === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Ativos
                </button>
                <button
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-2 rounded-lg text-xs font-medium ${
                    statusFilter === 'inactive'
                      ? 'bg-red-500/20 text-red-300'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Inativos
                </button>
              </div>

              <div className="flex space-x-2 bg-white/5 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Visualização em tabela"
                >
                  <List size={20} />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-orange-500/20 text-orange-300'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Visualização em cards"
                >
                  <Grid size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Procedimentos */}
        {filteredProcedures.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-300 text-lg mb-2">
              {searchTerm
                ? 'Nenhum procedimento encontrado'
                : 'Nenhum procedimento cadastrado ainda'}
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-orange-400 hover:text-orange-300 transition-colors"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProcedures.map((procedure) => (
              <div
                key={procedure.id}
                className="glass-card p-6 rounded-2xl hover:scale-105 transition-all duration-300 group border border-white/10 hover:border-orange-400/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Package size={24} className="text-white" />
                  </div>
                  {procedure.is_active ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs border border-emerald-400/30">
                      <CheckCircle size={12} />
                      Ativo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-300 text-xs border border-red-400/30">
                      Inativo
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {procedure.name}
                </h3>
                <p className="text-sm text-gray-400 mb-3">
                  {procedure.category || 'Sem categoria'}
                </p>
                <div className="space-y-1 text-xs text-gray-400">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      Duração
                    </span>
                    <span>{procedure.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign size={14} />
                      Custo
                    </span>
                    <span>{formatCurrency(procedure.cost_price)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <DollarSign size={14} />
                      Preço
                    </span>
                    <span>{formatCurrency(procedure.sale_price)}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(procedure)}
                    className="p-2 text-cyan-300 hover:text-cyan-100 transition-colors"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleActive(procedure, !procedure.is_active)}
                    className="p-2 text-red-300 hover:text-red-100 transition-colors"
                    title={procedure.is_active ? 'Desativar (soft delete)' : 'Reativar'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-0 overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 border-b border-white/10 text-xs text-gray-400 bg-white/5">
              <div className="col-span-4">Procedimento</div>
              <div className="col-span-2">Categoria</div>
              <div className="col-span-2 text-right">Duração</div>
              <div className="col-span-2 text-right">Custo</div>
              <div className="col-span-1 text-right">Preço</div>
              <div className="col-span-1 text-right">Ações</div>
            </div>
            <div className="divide-y divide-white/5">
              {filteredProcedures.map((procedure) => (
                <div
                  key={procedure.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 md:px-6 py-4 hover:bg-white/5 transition-colors"
                >
                  <div className="md:col-span-4">
                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex w-9 h-9 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 items-center justify-center">
                        <Package size={18} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white text-sm">{procedure.name}</p>
                          {procedure.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] border border-emerald-400/30">
                              <CheckCircle size={10} />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 text-[10px] border border-red-400/30">
                              Inativo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">
                          {procedure.category || 'Sem categoria'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-start text-xs text-gray-300 md:text-left">
                    <span className="md:hidden mr-2 text-gray-500">Categoria:</span>
                    <span>{procedure.category || '—'}</span>
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-end text-xs text-gray-300">
                    <span className="md:hidden mr-2 text-gray-500">Duração:</span>
                    <span>{procedure.duration_minutes} min</span>
                  </div>
                  <div className="md:col-span-2 flex items-center md:justify-end text-xs text-gray-300">
                    <span className="md:hidden mr-2 text-gray-500">Custo:</span>
                    <span>{formatCurrency(procedure.cost_price)}</span>
                  </div>
                  <div className="md:col-span-1 flex items-center md:justify-end text-xs text-gray-300">
                    <span className="md:hidden mr-2 text-gray-500">Preço:</span>
                    <span>{formatCurrency(procedure.sale_price)}</span>
                  </div>
                  <div className="md:col-span-1 flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEditModal(procedure)}
                      className="p-1.5 text-cyan-300 hover:text-cyan-100 transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(procedure, !procedure.is_active)}
                      className="p-1.5 text-red-300 hover:text-red-100 transition-colors"
                      title={procedure.is_active ? 'Desativar (soft delete)' : 'Reativar'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de criação/edição */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center px-4">
          <div className="glass-card max-w-lg w-full p-6 border border-white/10 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl">
                  <Package size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {editing ? 'Editar procedimento' : 'Novo procedimento'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Cadastre procedimentos com custo, preço e duração
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                disabled={saving}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Nome do procedimento *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Ex: Toxina Botulínica Facial"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Categoria (opcional)
                </label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="Ex: Toxina botulínica, Preenchimento, Bioestimulador..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Duração (minutos) *
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={600}
                    value={form.duration_minutes}
                    onChange={(e) => handleChange('duration_minutes', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    required
                  />
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Entre 5 e 600 minutos
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Preço de custo (R$) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.cost_price}
                    onChange={(e) => handleChange('cost_price', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Preço final (R$) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.sale_price}
                    onChange={(e) => handleChange('sale_price', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Toggle Ativo/Inativo - apenas na edição */}
              {editing && (
                <div className="flex items-center justify-between pt-2 pb-2 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-300">Status:</span>
                    <button
                      type="button"
                      onClick={() => handleChange('is_active', !form.is_active)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                        form.is_active ? 'bg-emerald-500' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          form.is_active ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-medium ${form.is_active ? 'text-emerald-300' : 'text-gray-400'}`}>
                      {form.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {!editing.is_active && form.is_active && (
                    <span className="text-[10px] text-yellow-300">
                      Reativando procedimento
                    </span>
                  )}
                </div>
              )}

              {/* Mensagem informativa na criação */}
              {!editing && (
                <div className="pt-2 pb-2 border-t border-white/10">
                  <p className="text-xs text-gray-400 flex items-center gap-2">
                    <CheckCircle size={12} className="text-emerald-400" />
                    <span>O procedimento será criado como <strong className="text-emerald-300">Ativo</strong> por padrão</span>
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="neon-button px-5 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      <span>Salvar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default ProceduresScreen;
