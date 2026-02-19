// src/screens/FinancialControlPatient.tsx - Financeiro dedicado ao paciente (sem abas da clínica)
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  DollarSign,
  Clock,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

import ResponsiveAppLayout from "../components/Layout/ResponsiveAppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { usePatients } from "../hooks/usePatients";
import {
  getPatientFinancialTimeline,
  getPatientFinancialSummaryGrossNet,
  getPatientPaidByMonthGrossNet,
  listFeeRules,
  resolveFeePercentLocal,
  computeFeeNet,
  round2,
  todayISO,
  type FinancialRecord,
  type FeeRuleRow,
  type PatientFinancialSummaryGrossNet,
  type GrossNetBucket,
  type Installment,
} from "../services/financial/financialService";
import { getSupabaseEnvStatus } from "../services/supabase/client";
import { withRetry, logStructuredError } from "../utils/retryFetch";

const HIDDEN_VALUE = "••••";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR");
}

function getPaymentMethodText(method: string): string {
  switch (method) {
    case "pix":
      return "PIX";
    case "credit_card":
      return "Cartão de Crédito";
    case "debit_card":
      return "Cartão de Débito";
    case "cash":
      return "Dinheiro";
    case "bank_transfer":
      return "Transferência Bancária";
    case "infinit_tag":
      return "InfinityPay Tag";
    default:
      return method;
  }
}

function getProcedureDisplayName(record: FinancialRecord): string {
  if (record.items && record.items.length > 0) {
    return record.items.map((i) => i.procedure_name_snapshot).join(" + ") + ` (${record.items.length} itens)`;
  }
  return record.procedure_type || "Procedimento";
}

export default function FinancialControlPatient() {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPatient } = usePatients();

  const [patient, setPatient] = useState<{ id: string; name: string; created_at: string } | null>(null);
  const [timeline, setTimeline] = useState<{ patient?: { id: string; name: string }; records: { record: FinancialRecord; installments: Installment[] }[] }>({ records: [] });
  const [summaryGrossNet, setSummaryGrossNet] = useState<PatientFinancialSummaryGrossNet | null>(null);
  const [paidMonth, setPaidMonth] = useState<GrossNetBucket | null>(null);
  const [feeRulesCache, setFeeRulesCache] = useState<FeeRuleRow[]>([]);
  const [monthYear, setMonthYear] = useState<string>(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}`;
  });
  const [hideValues, setHideValues] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const inFlightRef = useRef(false);
  const requestIdRef = useRef(0);
  const prevPatientIdRef = useRef<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const loadData = useCallback(
    async (isRetry = false) => {
      if (!patientId) return;
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      const myId = ++requestIdRef.current;
      const showFullLoading = !hasLoadedOnceRef.current || isRetry;
      setError(null);
      if (showFullLoading) setLoading(true);
      try {
        const [p, rules, tl, summary] = await withRetry(
          () =>
            Promise.all([
              getPatient(patientId),
              listFeeRules("infinitypay"),
              getPatientFinancialTimeline(patientId),
              getPatientFinancialSummaryGrossNet(patientId),
            ]),
          { screen: "FinancialControlPatient", maxRetries: 2 }
        );
        if (myId !== requestIdRef.current) return;
        if (p) setPatient({ id: p.id, name: p.name, created_at: p.created_at });
        setFeeRulesCache(rules ?? []);
        setTimeline(tl ?? { records: [] });
        setSummaryGrossNet(summary ?? null);
        hasLoadedOnceRef.current = true;
        setHasLoadedOnce(true);
      } catch (err: unknown) {
        if (myId !== requestIdRef.current) return;
        logStructuredError({
          screen: "FinancialControlPatient",
          message: (err as Error)?.message,
          code: (err as { code?: string })?.code,
          status: (err as { status?: number })?.status,
          details: err,
          hint: "Verifique conexão e configurações do Supabase (URL/CORS).",
          error: err,
        });
        setError((err as Error)?.message ?? "Falha ao carregar dados");
      } finally {
        if (myId === requestIdRef.current) inFlightRef.current = false;
        setLoading(false);
      }
    },
    [patientId, getPatient]
  );

  useEffect(() => {
    if (!patientId) return;
    if (patientId !== prevPatientIdRef.current) {
      setHasLoadedOnce(false);
      hasLoadedOnceRef.current = false;
      prevPatientIdRef.current = patientId;
    }
    loadData();
  }, [patientId, loadData]);

  useEffect(() => {
    console.debug("[FinancialControlPatient] mount", patientId);
    return () => {
      console.debug("[FinancialControlPatient] unmount", patientId);
    };
  }, [patientId]);

  useEffect(() => {
    if (!patientId) {
      navigate("/patients", { replace: true });
    }
  }, [patientId, navigate]);

  // Apenas PAGO (MÊS): atualiza paidMonth quando monthYear muda; cancelado se desmontar
  useEffect(() => {
    if (!patientId || error) return;
    let cancelled = false;
    getPatientPaidByMonthGrossNet(patientId, monthYear)
      .then((data) => {
        if (!cancelled) setPaidMonth(data ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [patientId, monthYear, error]);

  const formatCurrency = (value: number): string => {
    if (hideValues) return HIDDEN_VALUE;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const todayStr = useMemo(() => todayISO(), []);

  const getFeePercentFromCache = (method: string, installmentsCount: number | undefined): number => {
    return resolveFeePercentLocal(method, installmentsCount, feeRulesCache);
  };

  const toggleExpanded = (recordId: string) => {
    setExpandedRecords((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
  };

  if (!patientId) return null;

  const displayName = patient?.name ?? timeline.patient?.name ?? "Paciente";
  const sinceText = patient?.created_at
    ? `Desde ${formatDate(patient.created_at)}`
    : "";

  if (error) {
    const envStatus = getSupabaseEnvStatus();
    return (
      <ResponsiveAppLayout title="Financeiro do Paciente" showBack>
        <div className="glass-card p-6 border border-red-500/30 max-w-lg mx-auto mt-6">
          <h2 className="text-xl font-bold text-red-200 mb-2">Falha ao carregar dados financeiros</h2>
          <p className="text-gray-300 text-sm mb-4">
            Verifique sua conexão e as configurações do Supabase (URL/CORS).
            {!envStatus.configured && (
              <span className="block mt-2 text-amber-300">
                Variáveis de ambiente ausentes: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no build (ex.: Hostinger).
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => loadData(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/30"
            >
              <RefreshCw size={18} />
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
          </div>
        </div>
      </ResponsiveAppLayout>
    );
  }

  if (!hasLoadedOnce && loading) {
    return (
      <ResponsiveAppLayout title="Financeiro do Paciente" showBack>
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner size="lg" />
        </div>
      </ResponsiveAppLayout>
    );
  }

  const overdue = summaryGrossNet?.overdue ?? { gross: 0, fee: 0, net: 0, count: 0 };
  const pending = summaryGrossNet?.pending ?? { gross: 0, fee: 0, net: 0, count: 0 };
  const paid = paidMonth ?? { gross: 0, fee: 0, net: 0, count: 0 };

  return (
    <ResponsiveAppLayout title="Financeiro do Paciente" showBack>
      <div className="space-y-6 pb-8">
        {/* Header: nome, desde, toggle olho */}
        <div className="glass-card p-4 border border-white/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            {sinceText && <p className="text-sm text-gray-400 mt-0.5">{sinceText}</p>}
          </div>
          <button
            type="button"
            onClick={() => setHideValues((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-sm"
            title={hideValues ? "Mostrar valores" : "Ocultar valores"}
          >
            {hideValues ? <Eye size={18} /> : <EyeOff size={18} />}
            <span>{hideValues ? "Mostrar valores" : "Ocultar valores"}</span>
          </button>
        </div>

        {/* 3 chips: EM ATRASO, PENDENTE, PAGO (MÊS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="text-red-400" size={20} />
              <span className="text-sm font-semibold text-red-300">EM ATRASO</span>
            </div>
            <p className="text-sm text-gray-400">Bruto / Taxas / Líquido</p>
            <p className="text-sm font-medium text-white mt-1">
              {formatCurrency(overdue.gross)} / {formatCurrency(overdue.fee)} / {formatCurrency(overdue.net)}
            </p>
          </div>
          <div className="glass-card p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="text-yellow-400" size={20} />
              <span className="text-sm font-semibold text-yellow-300">PENDENTE</span>
            </div>
            <p className="text-sm text-gray-400">Bruto / Taxas / Líquido (esperado)</p>
            <p className="text-sm font-medium text-white mt-1">
              {formatCurrency(pending.gross)} / {formatCurrency(pending.fee)} / {formatCurrency(pending.net)}
            </p>
          </div>
          <div className="glass-card p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-green-400" size={20} />
              <span className="text-sm font-semibold text-green-300">PAGO (MÊS SELECIONADO)</span>
            </div>
            <p className="text-sm text-gray-400">Bruto / Taxas / Líquido</p>
            <p className="text-sm font-medium text-white mt-1">
              {formatCurrency(paid.gross)} / {formatCurrency(paid.fee)} / {formatCurrency(paid.net)}
            </p>
          </div>
        </div>

        {/* Seletor de mês */}
        <div className="glass-card p-4 border border-white/10 flex flex-wrap items-center justify-between gap-2">
          <span className="text-gray-300 text-sm">Mês dos valores pagos:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const [y, m] = monthYear.split("-").map(Number);
                const d = new Date(y, m - 2, 1);
                setMonthYear(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-white font-medium min-w-[140px] text-center">
              {new Date(monthYear + "-01").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </span>
            <button
              type="button"
              onClick={() => {
                const [y, m] = monthYear.split("-").map(Number);
                const d = new Date(y, m, 1);
                setMonthYear(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
              }}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Timeline: registros com parcelas */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <DollarSign size={20} />
            Registros financeiros
          </h3>
          {timeline.records.length === 0 ? (
            <div className="glass-card p-6 border border-white/10 text-center text-gray-400">
              Nenhum registro financeiro para este paciente.
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.records.map(({ record, installments: insts }) => {
                const recId = record.id;
                const isExpanded = expandedRecords.has(recId);
                const method = record.payment_method || "pix";
                const instCount = ["credit_card", "infinit_tag"].includes(method) ? (record.total_installments ?? 1) : undefined;
                const pct = getFeePercentFromCache(method, instCount);
                const expectedNetTotal = record.total_amount - record.total_amount * (pct / 100);
                const paidCount = insts.filter((i) => i.status === "pago").length;
                const overdueCount = insts.filter((i) => i.status === "pendente" && ((i.due_date || "").toString().split("T")[0] || "") < todayStr).length;

                return (
                  <div key={recId} className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                    <button
                      type="button"
                      className="w-full p-4 text-left hover:bg-white/5 flex justify-between items-center"
                      onClick={() => toggleExpanded(recId)}
                    >
                      <div>
                        <p className="text-sm text-gray-400">{formatDate(record.created_at)}</p>
                        <p className="font-semibold text-white">{getProcedureDisplayName(record)}</p>
                        <p className="text-sm text-gray-300">
                          {getPaymentMethodText(method)} · {record.total_installments}x · Bruto: {formatCurrency(record.total_amount)} · Líquido esperado: {formatCurrency(round2(expectedNetTotal))}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Pagas {paidCount}/{insts.length} · Atrasadas: {overdueCount}
                        </p>
                      </div>
                      {isExpanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                    </button>
                    {isExpanded && (
                      <div className="border-t border-white/10 p-4 space-y-2">
                        {insts.map((inst) => {
                          const dueStr = (inst.due_date || "").toString().split("T")[0];
                          const isOverdue = inst.status === "pendente" && !!dueStr && dueStr < todayStr;
                          const g = Number(inst.installment_value ?? 0);
                          const payMethod = inst.status === "pago" ? (inst.payment_method ?? method) : method;
                          const payInstCount = ["credit_card", "infinit_tag"].includes(payMethod) ? (record.total_installments ?? 1) : undefined;
                          const instPct = getFeePercentFromCache(payMethod, payInstCount);
                          const { feeAmount, netAmount } = computeFeeNet(g, instPct);
                          return (
                            <div key={inst.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-white/5 text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-white">Parcela {inst.installment_number}</span>
                                <span className="text-gray-400">{formatDate(inst.due_date)}</span>
                                <span className={`px-2 py-0.5 rounded ${inst.status === "pago" ? "bg-green-500/20 text-green-200" : "bg-yellow-500/20 text-yellow-200"}`}>
                                  {inst.status === "pago" ? "Pago" : "Pendente"}
                                </span>
                                {isOverdue && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-200 text-xs">ATRASADO</span>}
                              </div>
                              <div className="text-gray-300">
                                Bruto: {formatCurrency(g)} · Taxa: {formatCurrency(feeAmount)} · Líquido: {formatCurrency(netAmount)}
                                {inst.paid_date && <span className="ml-2 text-gray-400">Pago em {formatDate(inst.paid_date)}</span>}
                                {inst.status === "pago" && payMethod !== method && (
                                  <span className="ml-2 text-gray-500">· Método: {getPaymentMethodText(payMethod)}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ResponsiveAppLayout>
  );
}
