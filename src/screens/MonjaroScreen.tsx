// src/screens/MonjaroScreen.tsx - Caixa Monjaro (entradas/saídas). Não chama Supabase; usa useMonjaro.
import React, { useState, useMemo } from 'react';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  ListFilter,
  Loader2,
  Banknote,
  CreditCard,
  Smartphone,
  Pencil,
} from 'lucide-react';
import { useMonjaro } from '../hooks/useMonjaro';
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import type { PaymentMethod, MonjaroLedgerEntry } from '../services/monjaro/monjaroTypes';

function reaisToCents(value: string): number {
  const normalized = value.trim().replace(',', '.');
  const parsed = parseFloat(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function formatCentsToReais(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isValidCompetenceDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { value: 'cash', label: 'Dinheiro', icon: Banknote },
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'card', label: 'Cartão', icon: CreditCard },
];

const MonjaroScreen: React.FC = () => {
  const {
    summary,
    overallSummary,
    summaryMonth,
    setSummaryMonth,
    entries,
    listFilters,
    setListFilters,
    loadingSummary,
    loadingOverallSummary,
    loadingList,
    submitting,
    patientSearchQuery,
    setPatientSearchQuery,
    patientSearchResults,
    loadingPatientSearch,
    submitEntryIn,
    submitEntryOut,
    editEntry,
  } = useMonjaro();

  const [tab, setTab] = useState<'in' | 'out'>('in');
  const [inPatientId, setInPatientId] = useState('');
  const [inPatientName, setInPatientName] = useState('');
  const [inCompetenceDate, setInCompetenceDate] = useState(() => toYYYYMMDD(new Date()));
  const [inAmount, setInAmount] = useState('');
  const [inPayment, setInPayment] = useState<PaymentMethod>('pix');
  const [inNote, setInNote] = useState('');
  const [outAmount, setOutAmount] = useState('');
  const [outNote, setOutNote] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MonjaroLedgerEntry | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editPayment, setEditPayment] = useState<PaymentMethod>('pix');
  const [editNote, setEditNote] = useState('');
  const [editCompetenceDate, setEditCompetenceDate] = useState('');
  const [editOccurredAt, setEditOccurredAt] = useState('');

  const currentYearMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const handleSelectPatient = (id: string, name: string) => {
    setInPatientId(id);
    setInPatientName(name);
    setPatientSearchQuery(name);
    setShowPatientDropdown(false);
  };

  const handleSubmitIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inPatientId.trim()) {
      toast.error('Selecione um paciente.');
      return;
    }
    if (!isValidCompetenceDate(inCompetenceDate)) {
      toast.error('Data de competência inválida.');
      return;
    }
    const amountCents = reaisToCents(inAmount);
    if (amountCents <= 0) {
      toast.error('Informe o valor em reais.');
      return;
    }
    try {
      await submitEntryIn({
        patient_id: inPatientId,
        competence_date: inCompetenceDate,
        amount_cents: amountCents,
        payment_method: inPayment,
        note: inNote.trim() || null,
      });
      toast.success('Entrada registrada.');
      setInAmount('');
      setInNote('');
      setPatientSearchQuery('');
      setShowPatientDropdown(false);
      setInPatientId('');
      setInPatientName('');
    } catch {
      toast.error('Erro ao registrar entrada.');
    }
  };

  const handleSubmitOut = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountCents = reaisToCents(outAmount);
    if (amountCents <= 0) {
      toast.error('Informe o valor em reais.');
      return;
    }
    if (!outNote.trim()) {
      toast.error('Informe a descrição da saída.');
      return;
    }
    try {
      await submitEntryOut({ amount_cents: amountCents, note: outNote.trim() });
      toast.success('Saída registrada.');
      setOutAmount('');
      setOutNote('');
    } catch {
      toast.error('Erro ao registrar saída.');
    }
  };

  const handleCloseEditModal = () => setEditingEntry(null);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const amountCents = reaisToCents(editAmount);
    if (amountCents <= 0) {
      toast.error('Valor deve ser maior que zero.');
      return;
    }
    if (editingEntry.kind === 'out') {
      if (!editNote.trim()) {
        toast.error('Descrição é obrigatória para saída.');
        return;
      }
      try {
        await editEntry(editingEntry.id, 'out', {
          amount_cents: amountCents,
          note: editNote.trim(),
          ...(editOccurredAt ? { occurred_at: `${editOccurredAt}T12:00:00.000Z` } : {}),
        });
        toast.success('Lançamento atualizado.');
        setEditingEntry(null);
      } catch {
        toast.error('Erro ao atualizar lançamento.');
      }
      return;
    }
    if (editingEntry.kind === 'in') {
      if (editCompetenceDate && !isValidCompetenceDate(editCompetenceDate)) {
        toast.error('Data de competência inválida.');
        return;
      }
      try {
        await editEntry(editingEntry.id, 'in', {
          amount_cents: amountCents,
          payment_method: editPayment,
          note: editNote.trim() || null,
          ...(editCompetenceDate ? { competence_date: editCompetenceDate } : {}),
        });
        toast.success('Lançamento atualizado.');
        setEditingEntry(null);
      } catch {
        toast.error('Erro ao atualizar lançamento.');
      }
    }
  };

  return (
    <ResponsiveAppLayout title="Monjaro">
      <div className="space-y-6 min-w-0">
        {/* Resumo do caixa */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 min-w-0">
            <Wallet className="text-emerald-400 flex-shrink-0" size={28} />
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold glow-text">Resumo do caixa</h2>
              <p className="text-gray-400 text-sm">Totais e saldo por período</p>
            </div>
            <label className="flex items-center gap-2 min-w-0">
              <span className="text-gray-400 text-sm whitespace-nowrap">Mês:</span>
              <input
                type="month"
                value={summaryMonth ?? currentYearMonth}
                onChange={(e) => setSummaryMonth(e.target.value || null)}
                className="min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 outline-none min-w-0"
              />
            </label>
          </div>
          {loadingSummary ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner className="text-cyan-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
              <div className="glass-card p-4 border border-emerald-400/30 bg-emerald-500/10 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownCircle className="text-emerald-400" size={20} />
                  <span className="text-gray-300 text-sm">Entradas</span>
                </div>
                <p className="text-xl font-bold text-emerald-300">{formatCentsToReais(summary.totalInCents)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {loadingOverallSummary ? (
                    <span className="inline-block h-3 w-16 bg-gray-600/50 rounded animate-pulse"> </span>
                  ) : (
                    <>geral: {formatCentsToReais(overallSummary.totalInCents)}</>
                  )}
                </p>
              </div>
              <div className="glass-card p-4 border border-rose-400/30 bg-rose-500/10 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpCircle className="text-rose-400" size={20} />
                  <span className="text-gray-300 text-sm">Saídas</span>
                </div>
                <p className="text-xl font-bold text-rose-300">{formatCentsToReais(summary.totalOutCents)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {loadingOverallSummary ? (
                    <span className="inline-block h-3 w-16 bg-gray-600/50 rounded animate-pulse"> </span>
                  ) : (
                    <>geral: {formatCentsToReais(overallSummary.totalOutCents)}</>
                  )}
                </p>
              </div>
              <div className="glass-card p-4 border border-cyan-400/30 bg-cyan-500/10 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="text-cyan-400" size={20} />
                  <span className="text-gray-300 text-sm">Saldo</span>
                </div>
                <p className="text-xl font-bold text-cyan-300">{formatCentsToReais(summary.balanceCents)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {loadingOverallSummary ? (
                    <span className="inline-block h-3 w-16 bg-gray-600/50 rounded animate-pulse"> </span>
                  ) : (
                    <>geral: {formatCentsToReais(overallSummary.balanceCents)}</>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Abas Registrar Entrada / Saída */}
        <div className="glass-card p-4 sm:p-6 min-w-0">
          <div className="flex gap-2 mb-6 min-w-0">
            <button
              type="button"
              onClick={() => setTab('in')}
              className={`min-h-[44px] px-4 rounded-xl font-medium transition-all ${
                tab === 'in'
                  ? 'bg-emerald-500/30 border border-emerald-400/50 text-emerald-200'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => setTab('out')}
              className={`min-h-[44px] px-4 rounded-xl font-medium transition-all ${
                tab === 'out'
                  ? 'bg-rose-500/30 border border-rose-400/50 text-rose-200'
                  : 'bg-white/5 border border-white/10 text-gray-400 hover:border-white/20'
              }`}
            >
              Saída
            </button>
          </div>

          {tab === 'in' && (
            <form onSubmit={handleSubmitIn} className="space-y-4 min-w-0">
              <div className="relative min-w-0">
                <label className="block text-gray-400 text-sm mb-1">Paciente *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    value={patientSearchQuery}
                    onChange={(e) => {
                      setPatientSearchQuery(e.target.value);
                      if (!e.target.value) setInPatientId('');
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(!!patientSearchQuery)}
                    placeholder="Buscar por nome..."
                    className="w-full min-h-[44px] pl-10 pr-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 outline-none min-w-0"
                  />
                  {loadingPatientSearch && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin" size={18} />
                  )}
                </div>
                {showPatientDropdown && (patientSearchQuery || patientSearchResults.length > 0) && (
                  <ul className="absolute z-10 w-full mt-1 py-2 rounded-xl bg-gray-800/95 border border-white/20 shadow-xl max-h-48 overflow-auto min-w-0">
                    {patientSearchResults.length === 0 && !loadingPatientSearch ? (
                      <li className="px-4 py-2 text-gray-500 text-sm">Nenhum paciente encontrado</li>
                    ) : (
                      patientSearchResults.map((p) => (
                        <li
                          key={p.id}
                          role="button"
                          onClick={() => handleSelectPatient(p.id, p.name)}
                          className="px-4 py-2 hover:bg-white/10 cursor-pointer text-white text-sm min-w-0 truncate"
                        >
                          {p.name}
                        </li>
                      ))
                    )}
                  </ul>
                )}
                {inPatientId && (
                  <p className="mt-1 text-sm text-cyan-400">Selecionado: {inPatientName}</p>
                )}
              </div>
              <div className="min-w-0">
                <label className="block text-gray-400 text-sm mb-1">Data competência *</label>
                <input
                  type="date"
                  value={inCompetenceDate}
                  onChange={(e) => setInCompetenceDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 outline-none min-w-0"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-gray-400 text-sm mb-1">Valor (R$) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={inAmount}
                  onChange={(e) => setInAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 outline-none min-w-0"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-gray-400 text-sm mb-2">Forma de pagamento *</label>
                <div className="flex flex-wrap gap-2">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setInPayment(opt.value)}
                        className={`min-h-[44px] px-4 rounded-xl border flex items-center gap-2 transition-all ${
                          inPayment === opt.value
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <Icon size={18} />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="min-w-0">
                <label className="block text-gray-400 text-sm mb-1">Observação</label>
                <input
                  type="text"
                  value={inNote}
                  onChange={(e) => setInNote(e.target.value)}
                  placeholder="Opcional"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 outline-none min-w-0"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="neon-button min-h-[44px] px-6 inline-flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <ArrowDownCircle size={20} />}
                Registrar entrada
              </button>
            </form>
          )}

          {tab === 'out' && (
            <form onSubmit={handleSubmitOut} className="space-y-4 min-w-0">
              <div className="min-w-0">
                <label className="block text-gray-400 text-sm mb-1">Valor (R$) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={outAmount}
                  onChange={(e) => setOutAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 outline-none min-w-0"
                />
              </div>
              <div className="min-w-0">
                <label className="block text-gray-400 text-sm mb-1">Descrição *</label>
                <input
                  type="text"
                  value={outNote}
                  onChange={(e) => setOutNote(e.target.value)}
                  placeholder="Ex.: compra material, pagamento fornecedor"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 outline-none min-w-0"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="neon-button min-h-[44px] px-6 inline-flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : <ArrowUpCircle size={20} />}
                Registrar saída
              </button>
            </form>
          )}
        </div>

        {/* Listagem */}
        <div className="glass-card p-4 sm:p-6 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 min-w-0">
            <ListFilter className="text-cyan-400 flex-shrink-0" size={24} />
            <h3 className="text-lg font-bold glow-text">Lançamentos recentes</h3>
            <div className="flex flex-wrap gap-2 min-w-0">
              <input
                type="month"
                value={listFilters.competenceMonth ?? ''}
                onChange={(e) => setListFilters((f) => ({ ...f, competenceMonth: e.target.value || null }))}
                className="min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm focus:border-cyan-400/50 outline-none min-w-0"
              />
              <select
                value={listFilters.kind}
                onChange={(e) =>
                  setListFilters((f) => ({ ...f, kind: e.target.value as 'all' | 'in' | 'out' }))
                }
                className="min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 outline-none min-w-0"
              >
                <option value="all">Todos</option>
                <option value="in">Entradas</option>
                <option value="out">Saídas</option>
              </select>
            </div>
          </div>
          {loadingList ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner className="text-cyan-500" />
            </div>
          ) : (
            <div className="overflow-x-auto min-w-0 -mx-2">
              <table className="w-full border-collapse min-w-0">
                <thead>
                  <tr className="text-left text-gray-400 text-sm border-b border-white/10">
                    <th className="py-2 px-2">Data</th>
                    <th className="py-2 px-2">Tipo</th>
                    <th className="py-2 px-2">Paciente / Descrição</th>
                    <th className="py-2 px-2 text-right">Valor</th>
                    <th className="py-2 px-2 w-10" aria-label="Editar" />
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-500">
                        Nenhum lançamento no período.
                      </td>
                    </tr>
                  ) : (
                    entries.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 text-sm">
                        <td className="py-2 px-2 text-gray-300 whitespace-nowrap">
                          {new Date(row.occurred_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-2 px-2">
                          {row.kind === 'in' ? (
                            <span className="text-emerald-400">Entrada</span>
                          ) : (
                            <span className="text-rose-400">Saída</span>
                          )}
                        </td>
                        <td className="py-2 px-2 min-w-0 max-w-[200px]">
                          {row.kind === 'in' ? (
                            <>
                              <p className="text-gray-200 truncate" title={row.patient_name ?? undefined}>
                                {row.patient_name ?? '—'}
                              </p>
                              {row.note?.trim() ? (
                                <p className="text-gray-500 text-xs truncate mt-0.5" title={row.note}>
                                  {row.note}
                                </p>
                              ) : (
                                <p className="text-gray-500 text-xs">—</p>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="text-gray-200 truncate" title={row.note ?? undefined}>
                                {row.note?.trim() ? row.note : '—'}
                              </p>
                              <p className="text-gray-500 text-xs">Saída</p>
                            </>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right font-medium">
                          {row.kind === 'in' ? (
                            <span className="text-emerald-300">+{formatCentsToReais(row.amount_cents)}</span>
                          ) : (
                            <span className="text-rose-300">-{formatCentsToReais(row.amount_cents)}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEntry(row);
                              setEditAmount(formatCentsToReais(row.amount_cents));
                              setEditPayment((row.payment_method ?? 'pix') as PaymentMethod);
                              setEditNote(row.note ?? '');
                              setEditCompetenceDate(row.competence_date ?? row.competence_month ?? '');
                              setEditOccurredAt(row.occurred_at ? new Date(row.occurred_at).toISOString().slice(0, 10) : '');
                            }}
                            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-gray-300 hover:text-white transition-colors"
                            aria-label="Editar lançamento"
                          >
                            <Pencil size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Editar lançamento */}
      {editingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-modal-title"
        >
          <div className="glass-card p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto min-w-0">
            <h3 id="edit-modal-title" className="text-lg font-bold glow-text mb-4">
              Editar {editingEntry.kind === 'in' ? 'entrada' : 'saída'}
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4 min-w-0">
              {editingEntry.kind === 'in' && (
                <p className="text-sm text-gray-400">
                  Paciente: <span className="text-white">{editingEntry.patient_name ?? '—'}</span> (não editável)
                </p>
              )}
              <div className="min-w-0">
                <label className="block text-gray-400 text-sm mb-1">Valor (R$) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 outline-none min-w-0"
                />
              </div>
              {editingEntry.kind === 'in' && (
                <>
                  <div className="min-w-0">
                    <label className="block text-gray-400 text-sm mb-2">Forma de pagamento *</label>
                    <div className="flex flex-wrap gap-2">
                      {PAYMENT_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setEditPayment(opt.value)}
                            className={`min-h-[44px] px-4 rounded-xl border flex items-center gap-2 transition-all ${
                              editPayment === opt.value
                                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            <Icon size={18} />
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-gray-400 text-sm mb-1">Data competência (opcional)</label>
                    <input
                      type="date"
                      value={editCompetenceDate}
                      onChange={(e) => setEditCompetenceDate(e.target.value)}
                      className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 outline-none min-w-0"
                    />
                  </div>
                </>
              )}
              {editingEntry.kind === 'out' && (
                <div className="min-w-0">
                  <label className="block text-gray-400 text-sm mb-1">Data (opcional)</label>
                  <input
                    type="date"
                    value={editOccurredAt}
                    onChange={(e) => setEditOccurredAt(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 outline-none min-w-0"
                  />
                </div>
              )}
              <div className="min-w-0">
                <label className="block text-gray-400 text-sm mb-1">
                  {editingEntry.kind === 'in' ? 'Observação' : 'Descrição *'}
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder={editingEntry.kind === 'in' ? 'Opcional' : 'Ex.: compra material'}
                  className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 outline-none min-w-0"
                />
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  className="min-h-[44px] px-6 rounded-xl border border-white/20 bg-white/5 text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="neon-button min-h-[44px] px-6 inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : null}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ResponsiveAppLayout>
  );
};

export default MonjaroScreen;
