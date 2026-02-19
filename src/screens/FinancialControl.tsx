// src/screens/FinancialControl.tsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSupabase } from "../contexts/SupabaseContext";
import { toast } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  DollarSign,
  ChevronDown,
  ChevronUp,
  X,
  Edit,
  ArrowLeft,
  CheckCircle,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  Calendar,
  Package,
  TrendingUp,
  Percent,
  Clock,
  Download,
} from "lucide-react";

import ResponsiveAppLayout from "../components/Layout/ResponsiveAppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import AppointmentPlanEditor from "../components/AppointmentPlanEditor";
import { listActiveProcedures } from "../services/procedures/procedureService";
import type { Procedure } from "../types/db";
import type { AppointmentPlanItem } from "../types/appointmentPlan";
import { calculatePlanTotals, calculateItemProfit } from "../types/appointmentPlan";
import {
  createFinancialRecord,
  listFinancialRecordsWithItems,
  listInstallmentsByStatus,
  markInstallmentAsPaid,
  updatePaymentMethod,
  getFeePercent,
  listFeeRules,
  round2,
  computeFeeNet,
  todayISO,
  getPatientFinancialTimeline,
  getMonthlyGoal,
  upsertMonthlyGoal,
  resolveFeePercentLocal,
  type FinancialProcedureItem,
  type FinancialRecord,
  type FeeRuleRow,
  type PatientFinancialTimeline,
  type MonthlyGoal,
} from "../services/financial/financialService";
import {
  generateMonthlyFinancialReportPDF,
  downloadBlob,
} from "../services/financial/reportService";
import {
  listAppointmentsWithProcedures,
  markAppointmentStatus,
  type AppointmentWithProcedures,
} from "../services/appointments/appointmentService";

interface Patient {
  id: string;
  name: string;
  phone: string;
  email: string;
}

interface PaymentFormData {
  patientId: string;
  patientName: string;
  procedureType: string;
  totalAmount: number;
  installments: number;
  paymentMethod: string;
  firstPaymentDate: string;
}

interface ProcedureData {
  id: string;
  patient_id: string;
  client_name: string;
  procedure_type: string;
  total_amount: number;
  total_installments: number;
  payment_method: string;
  first_payment_date: string;
  status: string;
  created_at: string;
}

interface Installment {
  id: string;
  procedure_id: string;
  installment_number: number;
  installment_value: number;
  due_date: string;
  status: string;
  paid_date?: string;
  payment_method?: string;
  created_at: string;
  fee_percent_applied?: number | null;
  fee_amount?: number | null;
  net_amount?: number | null;
  payment_provider?: string | null;
  paid_at?: string | null;
}

interface CalculatedInstallment {
  number: number;
  value: number;
  dueDate: string;
}

interface MonthlyRevenue {
  month: string;
  monthYear: string;
  grossTotal: number;
  netTotal: number;
}

interface PatientInstallments {
  patientId: string;
  patientName: string;
  installments: Installment[];
  procedures: { [procedureId: string]: ProcedureData };
  totalPending: number;
  isExpanded: boolean;
}

interface PaymentConfirmationModal {
  isOpen: boolean;
  installment: Installment | null;
  selectedMethod: string;
}

interface EditPaymentMethodModal {
  isOpen: boolean;
  procedure: ProcedureData | null;
  selectedMethod: string;
}

// ComandaItem mantido para compatibilidade interna, mas convertido para AppointmentPlanItem quando necessário
interface ComandaItem {
  procedureCatalogId: string;
  name: string;
  category: string;
  costPrice: number;
  salePrice: number;
  finalPrice: number;
  quantity: number;
  discount: number;
  profit: number;
}

// Helper para converter ComandaItem para AppointmentPlanItem
const comandaItemToPlanItem = (item: ComandaItem): AppointmentPlanItem => ({
  procedure_catalog_id: item.procedureCatalogId,
  name: item.name,
  category: item.category || null,
  cost_price: item.costPrice,
  sale_price: item.salePrice,
  final_price: item.finalPrice,
  quantity: item.quantity,
  discount: item.discount,
});

// Helper para converter AppointmentPlanItem para ComandaItem
const planItemToComandaItem = (item: AppointmentPlanItem): ComandaItem => {
  const profit = (item.final_price * item.quantity - item.discount) - (item.cost_price * item.quantity);
  return {
    procedureCatalogId: item.procedure_catalog_id,
    name: item.name,
    category: item.category || '',
    costPrice: item.cost_price,
    salePrice: item.sale_price,
    finalPrice: item.final_price,
    quantity: item.quantity,
    discount: item.discount,
    profit,
  };
};

interface CloseAppointmentModal {
  isOpen: boolean;
  appointment: AppointmentWithProcedures | null;
  items: ComandaItem[];
}

/** Mês atual no formato YYYY-MM (horário local). */
function getCurrentMonthYear(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Formata monthYear (YYYY-MM) para exibição em pt-BR, ex: "março de 2026". */
function formatMonthYearPtBR(monthYear: string): string {
  const [y, m] = monthYear.split("-").map(Number);
  const date = new Date(y, m - 1, 1);
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

/** Retorna início e fim (exclusivo) do mês para monthYear (YYYY-MM). */
function getMonthStartEnd(monthYear: string): { start: Date; end: Date } {
  const [y, m] = monthYear.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

/** Verifica se dateString (YYYY-MM-DD ou ISO) cai no mês monthYear (YYYY-MM). */
function isInMonth(dateString: string, monthYear: string): boolean {
  const s = (dateString || "").toString().split("T")[0];
  if (!s || s.length < 7) return false;
  return s.slice(0, 7) === monthYear;
}

/** Para cálculo de taxa: infinit_tag usa regras de crédito. */
function normalizeMethodForFees(method: string): string {
  return method === "infinit_tag" ? "credit_card" : method;
}

/** Bucket bruto/taxa/líquido zerado. */
const emptyGrossFeeNet = () => ({ gross: 0, fee: 0, net: 0 });

const FinancialControl: React.FC = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  // Estados legados (mantidos para compatibilidade)
  const [formData, setFormData] = useState<PaymentFormData>({
    patientId: "",
    patientName: "",
    procedureType: "",
    totalAmount: 0,
    installments: 1,
    paymentMethod: "pix",
    firstPaymentDate: new Date().toISOString().split("T")[0],
  });

  // Estados novos para comanda
  const [comandaPatientId, setComandaPatientId] = useState("");
  const [comandaPatientName, setComandaPatientName] = useState("");
  const [comandaItems, setComandaItems] = useState<ComandaItem[]>([]);
  const [comandaInstallments, setComandaInstallments] = useState(1);
  const [comandaPaymentMethod, setComandaPaymentMethod] = useState("pix");
  const [comandaFirstPaymentDate, setComandaFirstPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [procedureSearch, setProcedureSearch] = useState("");
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [proceduresCatalog, setProceduresCatalog] = useState<Procedure[]>([]);

  const [payments, setPayments] = useState<ProcedureData[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [appointments, setAppointments] = useState<AppointmentWithProcedures[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  const [activeTab, setActiveTab] = useState<"new" | "pending" | "completed" | "agenda" | "patient">("new");

  const [monthYear, setMonthYear] = useState<string>(() => getCurrentMonthYear());

  // Sempre inicializar mês ao abrir a tela (mês atual do sistema)
  useEffect(() => {
    setMonthYear(getCurrentMonthYear());
  }, []);

  const [patientTimeline, setPatientTimeline] = useState<PatientFinancialTimeline | null>(null);
  const [loadingPatientTimeline, setLoadingPatientTimeline] = useState(false);
  const [patientTimelineExpanded, setPatientTimelineExpanded] = useState<Set<string>>(new Set());
  const [monthlyGoal, setMonthlyGoal] = useState<MonthlyGoal | null>(null);
  const [goalsTableMissing, setGoalsTableMissing] = useState(false);
  const [goalsError, setGoalsError] = useState<string | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [goalsForm, setGoalsForm] = useState({ target_gross: 0, target_net: 0, target_profit: 0 });

  const [calculatedInstallments, setCalculatedInstallments] = useState<CalculatedInstallment[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [monthlyRevenueMode, setMonthlyRevenueMode] = useState<"net" | "gross">("net");
  const [feeRulesCache, setFeeRulesCache] = useState<FeeRuleRow[]>([]);
  const [groupedInstallments, setGroupedInstallments] = useState<PatientInstallments[]>([]);

  const [paymentModal, setPaymentModal] = useState<PaymentConfirmationModal>({
    isOpen: false,
    installment: null,
    selectedMethod: "pix",
  });
  const [feePercentPreview, setFeePercentPreview] = useState<number>(0);

  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get("patientId") || null;
  const urlTab = searchParams.get("tab") || null;

  const newAttendanceSectionRef = useRef<HTMLDivElement>(null);

  const scrollToNewAttendance = () => {
    setActiveTab("new");
    newAttendanceSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Redirecionar para tela dedicada do paciente quando patientId na URL
  useEffect(() => {
    if (urlPatientId) {
      navigate(`/patients/${urlPatientId}/financial`, { replace: true });
    }
  }, [urlPatientId, navigate]);

  const [editMethodModal, setEditMethodModal] = useState<EditPaymentMethodModal>({
    isOpen: false,
    procedure: null,
    selectedMethod: "pix",
  });

  const [closeAppointmentModal, setCloseAppointmentModal] = useState<CloseAppointmentModal>({
    isOpen: false,
    appointment: null,
    items: [],
  });

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      const rules = await listFeeRules("infinitypay");
      setFeeRulesCache(rules);
      await Promise.all([
        fetchPatients(),
        fetchPayments(),
        fetchProceduresCatalog(),
        fetchAppointments(),
      ]);
      setLoadingData(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar aba com query param ?tab= apenas quando tab é explicitamente informado
  useEffect(() => {
    if (urlTab && ["new", "pending", "completed", "agenda", "patient"].includes(urlTab)) {
      setActiveTab(urlTab as "new" | "pending" | "completed" | "agenda" | "patient");
    }
  }, [urlTab]);

  // Carregar timeline do paciente quando tab=patient e patientId existe
  useEffect(() => {
    if (activeTab !== "patient" || !urlPatientId) return;
    let cancelled = false;
    setLoadingPatientTimeline(true);
    getPatientFinancialTimeline(urlPatientId)
      .then((data) => {
        if (!cancelled) setPatientTimeline(data);
      })
      .finally(() => {
        if (!cancelled) setLoadingPatientTimeline(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, urlPatientId]);

  // Carregar meta mensal quando monthYear muda
  useEffect(() => {
    setGoalsLoading(true);
    setGoalsError(null);
    getMonthlyGoal(monthYear)
      .then(({ goal, tableMissing }) => {
        setGoalsTableMissing(tableMissing);
        setMonthlyGoal(goal);
      })
      .catch((e: any) => {
        setGoalsTableMissing(false);
        setMonthlyGoal(null);
        setGoalsError(e?.message || "Não foi possível carregar metas");
      })
      .finally(() => setGoalsLoading(false));
  }, [monthYear]);

  useEffect(() => {
    if (formData.patientName) {
      const filtered = patients.filter((patient) =>
        patient.name.toLowerCase().includes(formData.patientName.toLowerCase())
      );
      setFilteredPatients(filtered);
      setShowPatientDropdown(true);
    } else {
      setFilteredPatients([]);
      setShowPatientDropdown(false);
    }
  }, [formData.patientName, patients]);

  // Fechar dropdown de procedimentos ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.procedure-dropdown-container')) {
        setShowProcedureDropdown(false);
      }
    };

    if (showProcedureDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProcedureDropdown]);

  useEffect(() => {
    const list = calculateInstallments();
    setCalculatedInstallments(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.totalAmount, formData.installments, formData.firstPaymentDate]);

  useEffect(() => {
    calculateMonthlyRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installments]);

  useEffect(() => {
    groupInstallmentsByPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installments, payments]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase.from("patients").select("id, name, phone, email").order("name");
      if (error) throw error;
      setPatients((data || []) as Patient[]);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
      toast.error("Erro ao carregar pacientes");
    }
  };

  const fetchPayments = async () => {
    try {
      // Buscar registros financeiros com itens
      const records = await listFinancialRecordsWithItems();
      setFinancialRecords(records);

      // Converter para formato legado (compatibilidade)
      const procedures = records.map((r) => ({
        id: r.id,
        patient_id: r.patient_id,
        client_name: r.client_name,
        procedure_type: r.procedure_type || (r.items && r.items.length > 0
          ? r.items.map(i => i.procedure_name_snapshot).join(' + ')
          : 'Procedimento'),
        total_amount: r.total_amount,
        total_installments: r.total_installments,
        payment_method: r.payment_method,
        first_payment_date: r.first_payment_date,
        status: r.status,
        created_at: r.created_at,
      })) as ProcedureData[];
      setPayments(procedures);

      // Buscar parcelas
      if (procedures.length > 0) {
        const allInstallments = await Promise.all([
          listInstallmentsByStatus('pendente'),
          listInstallmentsByStatus('pago'),
        ]);
        setInstallments([...allInstallments[0], ...allInstallments[1]]);
      } else {
        setInstallments([]);
      }
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
      toast.error("Erro ao carregar pagamentos!");
    }
  };

  const fetchProceduresCatalog = async () => {
    try {
      const data = await listActiveProcedures();
      setProceduresCatalog(data);
    } catch (error) {
      console.error("Erro ao carregar catálogo:", error);
      toast.error("Erro ao carregar catálogo de procedimentos");
    }
  };

  const fetchAppointments = async () => {
    try {
      const data = await listAppointmentsWithProcedures(30, 30);
      setAppointments(data.filter(a => a.status === 'scheduled'));
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      toast.error("Erro ao carregar agendamentos");
    }
  };

  const calculateMonthlyRevenue = () => {
    const paidInstallments = installments.filter((i) => i.status === "pago" && i.paid_date);

    const revenueByMonth: { [key: string]: { grossTotal: number; netTotal: number } } = {};

    paidInstallments.forEach((installment) => {
      if (installment.paid_date) {
        const date = new Date(installment.paid_date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;

        if (!revenueByMonth[monthYear]) revenueByMonth[monthYear] = { grossTotal: 0, netTotal: 0 };
        const g = installment.installment_value;
        revenueByMonth[monthYear].grossTotal += g;

        const procedure = payments.find((p) => p.id === installment.procedure_id);
        const method = installment.payment_method || procedure?.payment_method || "pix";
        const installmentsCount =
          ["credit_card", "infinit_tag"].includes(method) ? (procedure?.total_installments ?? 1) : undefined;
        const net =
          installment.net_amount != null
            ? Number(installment.net_amount)
            : computeFeeNet(g, getFeePercentFromCache(method, installmentsCount)).netAmount;
        revenueByMonth[monthYear].netTotal += net;
      }
    });

    const monthlyData = Object.entries(revenueByMonth)
      .map(([monthYear, totals]) => {
        const [year, month] = monthYear.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          month: date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
          monthYear,
          grossTotal: round2(totals.grossTotal),
          netTotal: round2(totals.netTotal),
        };
      })
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear));

    setMonthlyRevenue(monthlyData);
  };

  const groupInstallmentsByPatient = () => {
    const pending = installments.filter((i) => i.status === "pendente");

    const grouped: { [key: string]: PatientInstallments } = {};

    pending.forEach((installment) => {
      const procedure = payments.find((p) => p.id === installment.procedure_id);
      if (!procedure) return;

      if (!grouped[procedure.patient_id]) {
        grouped[procedure.patient_id] = {
          patientId: procedure.patient_id,
          patientName: procedure.client_name,
          installments: [],
          procedures: {},
          totalPending: 0,
          isExpanded: false,
        };
      }

      grouped[procedure.patient_id].installments.push(installment);
      grouped[procedure.patient_id].procedures[procedure.id] = procedure;
      grouped[procedure.patient_id].totalPending += installment.installment_value;
    });

    setGroupedInstallments(
      Object.values(grouped).sort((a, b) => a.patientName.localeCompare(b.patientName))
    );
  };

  const togglePatientExpanded = (patientId: string) => {
    setGroupedInstallments((prev) =>
      prev.map((item) => (item.patientId === patientId ? { ...item, isExpanded: !item.isExpanded } : item))
    );
  };

  const openPaymentModal = (installment: Installment) => {
    const procedure = payments.find((p) => p.id === installment.procedure_id);
    const originalMethod = procedure?.payment_method || "pix";

    setPaymentModal({
      isOpen: true,
      installment,
      selectedMethod: originalMethod,
    });
  };

  // Atualizar preview de taxa quando o modal de pagamento abre ou o método muda
  useEffect(() => {
    if (!paymentModal.isOpen || !paymentModal.installment) {
      setFeePercentPreview(0);
      return;
    }
    const procedure = payments.find((p) => p.id === paymentModal.installment!.procedure_id);
    const method = paymentModal.selectedMethod;
    const provider = ["credit_card", "debit_card", "infinit_tag"].includes(method) ? "infinitypay" : null;
    if (provider) {
      getFeePercent(
        provider,
        method,
        method === "credit_card" ? (procedure?.total_installments ?? 1) : undefined
      ).then(setFeePercentPreview);
    } else {
      setFeePercentPreview(0);
    }
  }, [paymentModal.isOpen, paymentModal.installment, paymentModal.selectedMethod, payments]);

  const closePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      installment: null,
      selectedMethod: "pix",
    });
  };

  const openEditMethodModal = (procedure: ProcedureData) => {
    setEditMethodModal({
      isOpen: true,
      procedure,
      selectedMethod: procedure.payment_method,
    });
  };

  const closeEditMethodModal = () => {
    setEditMethodModal({
      isOpen: false,
      procedure: null,
      selectedMethod: "pix",
    });
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentModal((prev) => ({ ...prev, selectedMethod: method }));
  };

  const handleEditMethodChange = (method: string) => {
    setEditMethodModal((prev) => ({ ...prev, selectedMethod: method }));
  };

  const confirmPayment = async () => {
    if (!paymentModal.installment) return;

    try {
      await markInstallmentAsPaid(paymentModal.installment.id, paymentModal.selectedMethod);
      toast.success("Parcela marcada como paga!");
      await fetchPayments();
      closePaymentModal();
    } catch (error: any) {
      toast.error(error?.message || "Erro ao atualizar parcela!");
    }
  };

  const handleUpdatePaymentMethod = async () => {
    if (!editMethodModal.procedure) return;

    try {
      await updatePaymentMethod(editMethodModal.procedure.id, editMethodModal.selectedMethod);
      toast.success("Método de pagamento atualizado com sucesso!");
      await fetchPayments();
      closeEditMethodModal();
    } catch (error: any) {
      toast.error(error?.message || "Erro ao atualizar método de pagamento!");
    }
  };

  const getMaxRevenue = () => {
    if (monthlyRevenue.length === 0) return 0;
    return Math.max(
      ...monthlyRevenue.map((item) => (monthlyRevenueMode === "gross" ? item.grossTotal : item.netTotal))
    );
  };

  // ============================================
  // FUNÇÕES DE COMANDA (NOVO ATENDIMENTO)
  // ============================================

  const filteredProceduresCatalog = useMemo(() => {
    if (!procedureSearch.trim()) return proceduresCatalog;
    const search = procedureSearch.toLowerCase();
    return proceduresCatalog.filter(
      (p) => p.name.toLowerCase().includes(search) || (p.category && p.category.toLowerCase().includes(search))
    );
  }, [proceduresCatalog, procedureSearch]);

  const handleAddComandaItem = (procedure: Procedure) => {
    const costPrice = Number((procedure as any).cost_price ?? procedure.cost_price ?? 0);
    const salePrice = Number((procedure as any).sale_price ?? (procedure as any).final_price ?? procedure.sale_price ?? 0);
    const newPlanItem: AppointmentPlanItem = {
      procedure_catalog_id: procedure.id,
      name: procedure.name,
      category: procedure.category || null,
      cost_price: costPrice,
      sale_price: salePrice,
      final_price: salePrice,
      quantity: 1,
      discount: 0,
    };
    const newComandaItem = planItemToComandaItem(newPlanItem);
    setComandaItems([...comandaItems, newComandaItem]);
    setProcedureSearch('');
    setShowProcedureDropdown(false);
  };

  // Converter comandaItems para planItems para o componente
  const planItems = useMemo(() => {
    return comandaItems.map(comandaItemToPlanItem);
  }, [comandaItems]);

  // Handler para mudanças no AppointmentPlanEditor
  const handlePlanItemsChange = (newPlanItems: AppointmentPlanItem[]) => {
    const newComandaItems = newPlanItems.map(planItemToComandaItem);
    setComandaItems(newComandaItems);
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    toast.loading("Gerando relatório...", { id: "report-gen" });
    try {
      const paidInMonthGross = Object.values(revenueByMethodThisMonth.byMethod).reduce((s, m) => s + m.paid.gross, 0);
      const paidInMonthFees = Object.values(revenueByMethodThisMonth.byMethod).reduce((s, m) => s + m.paid.fee, 0);
      const overdueBucket = futureReceivablesCurve.find((b) => b.label === "Em atraso");

      const paidInstallmentsInMonth = completedInstallments
        .filter((i) => {
          const paidDate = (i.paid_date || (i.paid_at && (i.paid_at as string).split("T")[0])) as string | undefined;
          return !!paidDate && isInMonth(paidDate, monthYear);
        })
        .slice(0, 200)
        .map((i) => {
          const procedure = payments.find((p) => p.id === i.procedure_id);
          const method = (i.payment_method || procedure?.payment_method || "pix") as string;
          const g = Number(i.installment_value ?? 0);
          const instCount = ["credit_card", "infinit_tag"].includes(method) ? (procedure?.total_installments ?? 1) : undefined;
          let fee = 0;
          let net = g;
          if (i.fee_amount != null && i.net_amount != null) {
            fee = Number(i.fee_amount);
            net = Number(i.net_amount);
          } else {
            const pct = getFeePercentFromCache(method, instCount);
            const res = computeFeeNet(g, pct);
            fee = res.feeAmount;
            net = res.netAmount;
          }
          const paidDate = (i.paid_date || (i.paid_at && (i.paid_at as string).split("T")[0]) || "") as string;
          return {
            paid_date: paidDate.slice(0, 10),
            client_name: procedure?.client_name || "—",
            method,
            installment_number: i.installment_number,
            gross: round2(g),
            fee: round2(fee),
            net: round2(net),
          };
        });

      const blob = await generateMonthlyFinancialReportPDF({
        monthYear,
        monthLabel: formatMonthYearPtBR(monthYear),
        generatedAt: new Date().toLocaleString("pt-BR"),
        paidInMonth: {
          gross: round2(paidInMonthGross),
          fee: round2(paidInMonthFees),
          net: revenueByMethodThisMonth.totalPaidNet,
        },
        pending: {
          gross: pendingGross,
          fee: pendingFeesExpected,
          net: pendingNetExpected,
        },
        overdue: overdueBucket
          ? { gross: overdueBucket.gross, fee: overdueBucket.fees, net: overdueBucket.net }
          : { gross: 0, fee: 0, net: 0 },
        totalFeesThisMonth: totalFeesThisMonth,
        totalProfit,
        averageMargin,
        averageTicketThisMonth,
        revenueByMethod: revenueByMethodThisMonth.byMethod,
        futureCurve: futureReceivablesCurve,
        goal: monthlyGoal ? { target_gross: monthlyGoal.target_gross ?? 0, target_net: monthlyGoal.target_net ?? 0, target_profit: monthlyGoal.target_profit ?? 0 } : null,
        achievedForGoal: {
          paidGross: round2(paidInMonthGross),
          paidNet: revenueByMethodThisMonth.totalPaidNet,
          totalProfit,
        },
        topProcedures: topProceduresProfitThisMonth,
        paidInstallmentsInMonth,
      });

      downloadBlob(blob, `relatorio-financeiro-${monthYear}.pdf`);
      toast.success("Relatório gerado", { id: "report-gen" });
    } catch (err: any) {
      console.error("[FinancialControl] Erro ao gerar relatório", err);
      toast.error("Erro ao gerar relatório", { id: "report-gen" });
    } finally {
      setGeneratingReport(false);
    }
  };

  const comandaTotals = useMemo(() => {
    return calculatePlanTotals(planItems);
  }, [planItems]);

  const handleComandaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comandaPatientId || comandaItems.length === 0) {
      toast.error('Selecione um paciente e adicione pelo menos um procedimento');
      return;
    }

    setIsLoading(true);
    try {
      const items: FinancialProcedureItem[] = planItems.map((planItem) => ({
        procedure_catalog_id: planItem.procedure_catalog_id,
        procedure_name_snapshot: planItem.name,
        cost_price_snapshot: planItem.cost_price,
        final_price_snapshot: planItem.final_price,
        quantity: planItem.quantity,
        discount: planItem.discount,
        profit_snapshot: calculateItemProfit(planItem),
      }));

      const financialResult = await createFinancialRecord({
        patientId: comandaPatientId,
        patientName: comandaPatientName,
        items,
        installmentsConfig: {
          count: comandaInstallments,
          paymentMethod: comandaPaymentMethod,
          firstPaymentDate: comandaFirstPaymentDate,
        },
      });

      toast.success('Atendimento registrado com sucesso!');
      
      // Se campos foram removidos, avisar o usuário
      if (financialResult.removedFields && financialResult.removedFields.length > 0) {
        const fieldsList = financialResult.removedFields.join(', ');
        toast(`⚠️ Schema desatualizado: campos ${fieldsList} não existem no banco. Execute a migration 20260121000000_financial_procedure_items.sql no Supabase.`, {
          duration: 6000,
          icon: '⚠️',
        });
      }
      // Limpar comanda
      setComandaPatientId('');
      setComandaPatientName('');
      setComandaItems([]);
      setComandaInstallments(1);
      setComandaPaymentMethod('pix');
      setComandaFirstPaymentDate(new Date().toISOString().split('T')[0]);
      await fetchPayments();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao registrar atendimento');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // FUNÇÕES DE AGENDA (POTENCIAL)
  // ============================================

  const handleOpenCloseAppointment = async (appointment: AppointmentWithProcedures) => {
    const items: ComandaItem[] = await Promise.all(
      appointment.procedures.map(async (p) => {
        let costPrice = 0;
        if (p.procedure_catalog_id) {
          const catalogItem = proceduresCatalog.find(proc => proc.id === p.procedure_catalog_id);
          costPrice = catalogItem?.cost_price || 0;
        }
        const finalPrice = p.final_price;
        const quantity = p.quantity || 1;
        const discount = p.discount || 0;
        const profit = (finalPrice * quantity - discount) - (costPrice * quantity);
        
        return {
          procedureCatalogId: p.procedure_catalog_id || '',
          name: p.procedure_name_snapshot,
          category: '',
          costPrice,
          salePrice: finalPrice,
          finalPrice,
          quantity,
          discount,
          profit,
        };
      })
    );
    setCloseAppointmentModal({ isOpen: true, appointment, items });
  };

  const handleCloseAppointment = async () => {
    if (!closeAppointmentModal.appointment || closeAppointmentModal.items.length === 0) {
      toast.error('Adicione pelo menos um procedimento');
      return;
    }

    setIsLoading(true);
    try {
      const items: FinancialProcedureItem[] = closeAppointmentModal.items.map((item) => {
        const itemGross = item.finalPrice * item.quantity - item.discount;
        const itemCost = item.costPrice * item.quantity;
        const profitSnapshot = itemGross - itemCost;
        return {
          procedure_catalog_id: item.procedureCatalogId,
          procedure_name_snapshot: item.name,
          cost_price_snapshot: item.costPrice,
          final_price_snapshot: item.finalPrice,
          quantity: item.quantity,
          discount: item.discount,
          profit_snapshot: profitSnapshot,
        };
      });

      const financialResult = await createFinancialRecord({
        patientId: closeAppointmentModal.appointment.patient_id,
        patientName: closeAppointmentModal.appointment.patient_name,
        items,
        installmentsConfig: {
          count: comandaInstallments,
          paymentMethod: comandaPaymentMethod,
          firstPaymentDate: comandaFirstPaymentDate,
        },
        appointmentId: closeAppointmentModal.appointment.id,
      });

      await markAppointmentStatus(closeAppointmentModal.appointment.id, 'completed_with_sale');
      toast.success('Atendimento fechado com sucesso!');
      
      // Se campos foram removidos, avisar o usuário
      if (financialResult.removedFields && financialResult.removedFields.length > 0) {
        const fieldsList = financialResult.removedFields.join(', ');
        toast(`⚠️ Schema desatualizado: campos ${fieldsList} não existem no banco. Execute a migration 20260121000000_financial_procedure_items.sql no Supabase.`, {
          duration: 6000,
          icon: '⚠️',
        });
      }
      setCloseAppointmentModal({ isOpen: false, appointment: null, items: [] });
      await Promise.all([fetchPayments(), fetchAppointments()]);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao fechar atendimento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkNoSale = async (appointmentId: string) => {
    try {
      await markAppointmentStatus(appointmentId, 'completed_no_sale');
      toast.success('Agendamento marcado como não realizado');
      await fetchAppointments();
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar agendamento');
    }
  };

  // ============================================
  // FUNÇÕES LEGADAS (MANTIDAS)
  // ============================================

  const handlePatientSelect = (patient: Patient) => {
    setFormData({
      ...formData,
      patientId: patient.id,
      patientName: patient.name,
    });
    setShowPatientDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "totalAmount" || name === "installments" ? Number(value) : value,
    }));
  };

  const calculateInstallments = (): CalculatedInstallment[] => {
    if (formData.totalAmount > 0 && formData.installments > 0) {
      const installmentValue = formData.totalAmount / formData.installments;
      const list: CalculatedInstallment[] = [];

      for (let i = 0; i < formData.installments; i++) {
        const dueDate = new Date(formData.firstPaymentDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        list.push({
          number: i + 1,
          value: installmentValue,
          dueDate: dueDate.toISOString().split("T")[0],
        });
      }

      return list;
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { patientId, patientName, procedureType, totalAmount, installments: instCount, paymentMethod, firstPaymentDate } =
        formData;

      if (!patientId || !procedureType || !firstPaymentDate) {
        toast.error("Preencha todos os campos obrigatórios!");
        return;
      }

      const { data, error } = await supabase
        .from("procedures")
        .insert([
          {
            patient_id: patientId,
            client_name: patientName,
            procedure_type: procedureType,
            total_amount: totalAmount,
            total_installments: instCount,
            payment_method: paymentMethod,
            first_payment_date: firstPaymentDate,
            status: "pendente",
          },
        ])
        .select();

      if (error) throw error;

      const procedureData = (data as ProcedureData[]) || [];
      const procedureId = procedureData?.[0]?.id;

      if (procedureId) {
        const installmentValue = totalAmount / instCount;

        for (let i = 0; i < instCount; i++) {
          const dueDate = new Date(firstPaymentDate);
          dueDate.setMonth(dueDate.getMonth() + i);

          await supabase.from("installments").insert([
            {
              procedure_id: procedureId,
              installment_number: i + 1,
              installment_value: installmentValue,
              due_date: dueDate.toISOString().split("T")[0],
              status: "pendente",
              payment_method: paymentMethod,
            },
          ]);
        }
      }

      toast.success("Procedimento registrado com sucesso!");
      setFormData({
        patientId: "",
        patientName: "",
        procedureType: "",
        totalAmount: 0,
        installments: 1,
        paymentMethod: "pix",
        firstPaymentDate: new Date().toISOString().split("T")[0],
      });

      fetchPayments();
    } catch (error: any) {
      toast.error("Erro ao registrar pagamento!");
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pago":
        return "text-green-200 bg-green-500/10 border border-green-400/30";
      case "pendente":
        return "text-yellow-200 bg-yellow-500/10 border border-yellow-400/30";
      case "atrasado":
        return "text-red-200 bg-red-500/10 border border-red-400/30";
      default:
        return "text-gray-200 bg-white/5 border border-white/10";
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case "pix":
        return "PIX";
      case "cash":
        return "Dinheiro";
      case "credit_card":
        return "Cartão de Crédito";
      case "debit_card":
        return "Cartão de Débito";
      case "infinit_tag":
        return "Infinit Tag";
      case "bank_transfer":
        return "Transferência Bancária";
      default:
        return method;
    }
  };

  const todayStr = useMemo(() => todayISO(), []);

  const getFeePercentFromCache = (method: string, installmentsCount: number | undefined): number => {
    const methodForFees = normalizeMethodForFees(method);
    if (["pix", "cash", "bank_transfer"].includes(methodForFees)) return 0;
    const inst = installmentsCount != null ? Math.min(12, Math.max(1, installmentsCount)) : null;
    const row = feeRulesCache.find(
      (r) =>
        r.payment_method === methodForFees &&
        (methodForFees === "debit_card" ? r.installments === null : r.installments === (inst ?? 1))
    );
    return row?.fee_percent ?? 0;
  };

  const pendingInstallments = useMemo(() => installments.filter((i) => i.status === "pendente"), [installments]);
  const completedInstallments = useMemo(() => installments.filter((i) => i.status === "pago"), [installments]);

  const filteredGroupedInstallments = useMemo(() => {
    if (!urlPatientId) return groupedInstallments;
    return groupedInstallments.filter((g) => g.patientId === urlPatientId);
  }, [groupedInstallments, urlPatientId]);

  const filteredCompletedInstallments = useMemo(() => {
    if (!urlPatientId) return completedInstallments;
    const procIds = new Set(payments.filter((p) => p.patient_id === urlPatientId).map((p) => p.id));
    return completedInstallments.filter((i) => procIds.has(i.procedure_id));
  }, [completedInstallments, payments, urlPatientId]);

  // Métricas do dashboard: Bruto / Taxas / Líquido (realizado e previsto)
  const { paidGross, paidFees, paidNet } = useMemo(() => {
    let gross = 0;
    let fees = 0;
    let net = 0;
    completedInstallments.forEach((i) => {
      const g = i.installment_value;
      gross += g;
      const procedure = payments.find((p) => p.id === i.procedure_id);
      const method = i.payment_method || procedure?.payment_method || "pix";
      const installmentsCount =
        ["credit_card", "infinit_tag"].includes(method) ? (procedure?.total_installments ?? 1) : undefined;
      if (i.net_amount != null && i.fee_amount != null) {
        net += Number(i.net_amount);
        fees += Number(i.fee_amount);
      } else {
        const pct = getFeePercentFromCache(method, installmentsCount);
        const { feeAmount, netAmount } = computeFeeNet(g, pct);
        net += netAmount;
        fees += feeAmount;
      }
    });
    return {
      paidGross: round2(gross),
      paidFees: round2(fees),
      paidNet: round2(net),
    };
  }, [completedInstallments, payments, feeRulesCache]);

  const { pendingGross, pendingFeesExpected, pendingNetExpected } = useMemo(() => {
    let gross = 0;
    let fees = 0;
    let net = 0;
    pendingInstallments.forEach((i) => {
      const g = i.installment_value;
      gross += g;
      const procedure = payments.find((p) => p.id === i.procedure_id);
      const method = procedure?.payment_method || "pix";
      const installmentsCount =
        ["credit_card", "infinit_tag"].includes(method) ? (procedure?.total_installments ?? 1) : undefined;
      const pct = getFeePercentFromCache(method, installmentsCount);
      const { feeAmount, netAmount } = computeFeeNet(g, pct);
      fees += feeAmount;
      net += netAmount;
    });
    return {
      pendingGross: round2(gross),
      pendingFeesExpected: round2(fees),
      pendingNetExpected: round2(net),
    };
  }, [pendingInstallments, payments, feeRulesCache]);

  const totalRevenue = paidNet;
  const totalPending = pendingNetExpected;

  const totalProfit = useMemo(() => {
    const [y, m] = monthYear.split("-").map(Number);
    return financialRecords
      .filter(r => {
        const recordDate = new Date(r.created_at);
        return recordDate.getMonth() === m - 1 && recordDate.getFullYear() === y;
      })
      .reduce((sum, r) => sum + (r.total_profit || 0), 0);
  }, [financialRecords, monthYear]);

  const averageMargin = useMemo(() => {
    const [y, m] = monthYear.split("-").map(Number);
    const recordsInMonth = financialRecords.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === m - 1 && d.getFullYear() === y && r.total_amount > 0;
    });
    if (recordsInMonth.length === 0) return 0;
    const totalMargin = recordsInMonth.reduce((sum, r) => sum + (r.profit_margin || 0), 0);
    return totalMargin / recordsInMonth.length;
  }, [financialRecords, monthYear]);

  const totalFeesThisMonth = useMemo(() => {
    const [y, m] = monthYear.split("-").map(Number);
    let fees = 0;
    let gross = 0;
    completedInstallments.forEach((i) => {
      const paidDate = i.paid_date || (i.paid_at && (i.paid_at as string).split("T")[0]);
      if (!paidDate) return;
      const d = new Date(paidDate);
      if (d.getMonth() !== m - 1 || d.getFullYear() !== y) return;
      gross += i.installment_value;
      if (i.fee_amount != null) fees += Number(i.fee_amount);
      else if (i.net_amount != null) fees += i.installment_value - Number(i.net_amount);
      else {
        const procedure = payments.find((p) => p.id === i.procedure_id);
        const method = i.payment_method || procedure?.payment_method || "pix";
        const instCount = ["credit_card", "infinit_tag"].includes(method) ? (procedure?.total_installments ?? 1) : undefined;
        const pct = getFeePercentFromCache(method, instCount);
        fees += computeFeeNet(i.installment_value, pct).feeAmount;
      }
    });
    return { fees: round2(fees), gross: round2(gross), pct: gross > 0 ? round2((fees / gross) * 100) : 0 };
  }, [completedInstallments, payments, feeRulesCache, monthYear]);

  const topProceduresProfitThisMonth = useMemo(() => {
    const [y, m] = monthYear.split("-").map(Number);
    const recordsInMonth = financialRecords.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === m - 1 && d.getFullYear() === y;
    });
    const byName: Record<string, number> = {};
    recordsInMonth.forEach((r) => {
      const rec = r as FinancialRecord;
      if (rec.items && rec.items.length > 0) {
        rec.items.forEach((item) => {
          const name = item.procedure_name_snapshot || "Procedimento";
          byName[name] = (byName[name] || 0) + (item.profit_snapshot || 0);
        });
      } else {
        const name = rec.procedure_type || "Procedimento";
        byName[name] = (byName[name] || 0) + (rec.total_profit || 0);
      }
    });
    return Object.entries(byName)
      .map(([name, profit]) => ({ name, profit }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  }, [financialRecords, monthYear]);

  const averageTicketThisMonth = useMemo(() => {
    const [y, m] = monthYear.split("-").map(Number);
    const recordsInMonth = financialRecords.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === m - 1 && d.getFullYear() === y;
    });
    if (recordsInMonth.length === 0) return { avgGross: 0, avgNet: 0, count: 0 };
    let totalGross = 0;
    let totalNet = 0;
    recordsInMonth.forEach((r) => {
      totalGross += r.total_amount;
      const pct = resolveFeePercentLocal(r.payment_method || "pix", ["credit_card", "infinit_tag"].includes(r.payment_method || "") ? r.total_installments : undefined, feeRulesCache);
      totalNet += r.total_amount - (r.total_amount * pct) / 100;
    });
    const count = recordsInMonth.length;
    return {
      avgGross: round2(totalGross / count),
      avgNet: round2(totalNet / count),
      count,
    };
  }, [financialRecords, feeRulesCache, monthYear]);

  // Receita por método no mês: Pago (realizado) + Previsto (vencimento no mês)
  const revenueByMethodThisMonth = useMemo(() => {
    const methods = ["pix", "cash", "credit_card", "debit_card", "infinit_tag", "bank_transfer"] as const;
    type Bucket = { gross: number; fee: number; net: number };
    type MethodBucket = { paid: Bucket; expected: Bucket };
    const byMethod: Record<string, MethodBucket> = {};
    methods.forEach((meth) => {
      byMethod[meth] = { paid: emptyGrossFeeNet(), expected: emptyGrossFeeNet() };
    });

    const safeKey = (method: string) => (methods.includes(method as any) ? method : "pix");

    // PAID: status='pago' e paid_date no monthYear
    completedInstallments.forEach((i) => {
      const paidDate = (i.paid_date || (i.paid_at && (i.paid_at as string).split("T")[0])) as string | undefined;
      if (!paidDate || !isInMonth(paidDate, monthYear)) return;
      const procedure = payments.find((p) => p.id === i.procedure_id);
      const method = (i.payment_method || procedure?.payment_method || "pix") as string;
      const key = safeKey(method);
      const g = Number(i.installment_value ?? 0);
      const instCount = ["credit_card", "infinit_tag"].includes(method) ? (procedure?.total_installments ?? 1) : undefined;
      let fee = 0;
      let net = g;
      if (i.fee_amount != null && i.net_amount != null) {
        fee = Number(i.fee_amount);
        net = Number(i.net_amount);
      } else {
        const pct = getFeePercentFromCache(method, instCount);
        const res = computeFeeNet(g, pct);
        fee = res.feeAmount;
        net = res.netAmount;
      }
      byMethod[key].paid.gross += g;
      byMethod[key].paid.fee += fee;
      byMethod[key].paid.net += net;
    });

    // EXPECTED: status='pendente' e due_date no monthYear
    pendingInstallments.forEach((i) => {
      const dueStr = (i.due_date || "").toString().split("T")[0];
      if (!dueStr || !isInMonth(dueStr, monthYear)) return;
      const procedure = payments.find((p) => p.id === i.procedure_id);
      const method = (procedure?.payment_method || "pix") as string;
      const key = safeKey(method);
      const g = Number(i.installment_value ?? 0);
      const instCount = ["credit_card", "infinit_tag"].includes(method) ? (procedure?.total_installments ?? 1) : undefined;
      const pct = getFeePercentFromCache(method, instCount);
      const { feeAmount, netAmount } = computeFeeNet(g, pct);
      byMethod[key].expected.gross += g;
      byMethod[key].expected.fee += feeAmount;
      byMethod[key].expected.net += netAmount;
    });

    const roundBucket = (b: Bucket) => ({
      gross: round2(b.gross),
      fee: round2(b.fee),
      net: round2(b.net),
    });
    methods.forEach((meth) => {
      byMethod[meth].paid = roundBucket(byMethod[meth].paid);
      byMethod[meth].expected = roundBucket(byMethod[meth].expected);
    });

    const totalPaidNet = Object.values(byMethod).reduce((s, v) => s + v.paid.net, 0);
    const totalExpectedNet = Object.values(byMethod).reduce((s, v) => s + v.expected.net, 0);

    return {
      byMethod,
      totalPaidNet: round2(totalPaidNet),
      totalExpectedNet: round2(totalExpectedNet),
    };
  }, [completedInstallments, pendingInstallments, payments, feeRulesCache, monthYear]);

  const futureReceivablesCurve = useMemo(() => {
    const today = todayISO();
    const [y, m] = today.split("-").map(Number);
    const buckets: { label: string; monthYear: string; gross: number; fees: number; net: number }[] = [];
    let overG = 0, overF = 0, overN = 0;
    const monthBuckets: Record<string, { gross: number; fees: number; net: number }> = {};
    for (let i = 0; i < 6; i++) {
      const month = m + i;
      const year = month > 12 ? y + Math.floor(month / 12) : y;
      const mo = month > 12 ? (month % 12 || 12) : month;
      const monthYearStr = `${year}-${String(mo).padStart(2, "0")}`;
      monthBuckets[monthYearStr] = { gross: 0, fees: 0, net: 0 };
    }
    pendingInstallments.forEach((i) => {
      const dueStr = (i.due_date || "").toString().split("T")[0];
      const procedure = payments.find((p) => p.id === i.procedure_id);
      const method = procedure?.payment_method || "pix";
      const instCount = ["credit_card", "infinit_tag"].includes(method) ? (procedure?.total_installments ?? 1) : undefined;
      const pct = getFeePercentFromCache(method, instCount);
      const { feeAmount, netAmount } = computeFeeNet(i.installment_value, pct);
      if (dueStr && dueStr < today) {
        overG += i.installment_value;
        overF += feeAmount;
        overN += netAmount;
      } else if (dueStr) {
        const instMonthYear = dueStr.slice(0, 7);
        if (monthBuckets[instMonthYear]) {
          monthBuckets[instMonthYear].gross += i.installment_value;
          monthBuckets[instMonthYear].fees += feeAmount;
          monthBuckets[instMonthYear].net += netAmount;
        }
      }
    });
    if (overG > 0 || overF > 0 || overN > 0) {
      buckets.push({ label: "Em atraso", monthYear: "", gross: round2(overG), fees: round2(overF), net: round2(overN) });
    }
    for (let i = 0; i < 6; i++) {
      const month = m + i;
      const year = month > 12 ? y + Math.floor(month / 12) : y;
      const mo = month > 12 ? (month % 12 || 12) : month;
      const monthYearStr = `${year}-${String(mo).padStart(2, "0")}`;
      const b = monthBuckets[monthYearStr] || { gross: 0, fees: 0, net: 0 };
      const date = new Date(year, mo - 1, 1);
      buckets.push({
        label: date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
        monthYear: monthYearStr,
        gross: round2(b.gross),
        fees: round2(b.fees),
        net: round2(b.net),
      });
    }
    return buckets;
  }, [pendingInstallments, payments, feeRulesCache]);

  // Função para exibir nome do procedimento (compatibilidade legado)
  const getProcedureDisplayName = (record: FinancialRecord | ProcedureData): string => {
    if ('items' in record && record.items && record.items.length > 0) {
      return record.items.map(i => i.procedure_name_snapshot).join(' + ') + ` (${record.items.length} itens)`;
    }
    return record.procedure_type || 'Procedimento';
  };

  const renderNewAttendanceSection = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-bold glow-text mb-4">Novo Atendimento</h3>
      <form onSubmit={handleComandaSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Paciente *</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={comandaPatientName}
              onChange={(e) => {
                setComandaPatientName(e.target.value);
                const filtered = patients.filter((p) =>
                  p.name.toLowerCase().includes(e.target.value.toLowerCase())
                );
                setFilteredPatients(filtered);
                setShowPatientDropdown(e.target.value.length > 0 && filtered.length > 0);
              }}
              placeholder="Buscar paciente..."
              className="pl-10 px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
              required
            />
            {showPatientDropdown && filteredPatients.length > 0 && (
              <div className="absolute z-10 w-full mt-2 rounded-xl overflow-hidden border border-white/10 bg-gray-900/90 backdrop-blur-sm max-h-60 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <button
                    type="button"
                    key={patient.id}
                    onClick={() => {
                      setComandaPatientId(patient.id);
                      setComandaPatientName(patient.name);
                      setShowPatientDropdown(false);
                    }}
                    className="w-full text-left p-3 hover:bg-white/10 transition-all border-b border-white/10 last:border-b-0"
                  >
                    <div className="font-medium text-white">{patient.name}</div>
                    <div className="text-sm text-gray-300">{patient.phone}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Adicionar Procedimento</label>
          <div className="relative procedure-dropdown-container">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={procedureSearch}
              onChange={(e) => {
                setProcedureSearch(e.target.value);
                setShowProcedureDropdown(true);
              }}
              onFocus={() => setShowProcedureDropdown(true)}
              placeholder="Buscar procedimento do catálogo..."
              className="pl-10 px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
            />
            {showProcedureDropdown && filteredProceduresCatalog.length > 0 && (
              <div className="absolute z-10 w-full mt-2 rounded-xl overflow-hidden border border-white/10 bg-gray-900/90 backdrop-blur-sm max-h-60 overflow-y-auto">
                {filteredProceduresCatalog.map((proc) => (
                  <button
                    type="button"
                    key={proc.id}
                    onClick={() => handleAddComandaItem(proc)}
                    className="w-full text-left p-3 hover:bg-white/10 transition-all border-b border-white/10 last:border-b-0"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-white">{proc.name}</div>
                        {proc.category && <div className="text-xs text-gray-400">{proc.category}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-green-400">{formatCurrency(proc.sale_price)}</div>
                        {proc.cost_price > 0 && (
                          <div className="text-xs text-gray-400">Custo: {formatCurrency(proc.cost_price)}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {planItems.length > 0 && (
          <AppointmentPlanEditor
            items={planItems}
            onChange={handlePlanItemsChange}
            title="Itens do Atendimento"
          />
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/10">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Número de Parcelas *</label>
            <input
              type="number"
              min="1"
              value={comandaInstallments}
              onChange={(e) => setComandaInstallments(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Método de Pagamento *</label>
            <select
              value={comandaPaymentMethod}
              onChange={(e) => setComandaPaymentMethod(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
              required
            >
              <option value="pix" className="text-black">PIX</option>
              <option value="credit_card" className="text-black">Cartão de Crédito</option>
              <option value="debit_card" className="text-black">Cartão de Débito</option>
              <option value="cash" className="text-black">Dinheiro</option>
              <option value="bank_transfer" className="text-black">Transferência Bancária</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Data do Primeiro Pagamento *</label>
            <input
              type="date"
              value={comandaFirstPaymentDate}
              onChange={(e) => setComandaFirstPaymentDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white"
              required
            />
          </div>
        </div>
        <button type="submit" disabled={isLoading || comandaItems.length === 0} className="w-full neon-button">
          {isLoading ? "Registrando..." : "Registrar Atendimento"}
        </button>
      </form>
      <div className="pt-6 border-t border-white/10">
        <details className="glass-card p-4 border border-white/10">
          <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">Modo Manual (Legado)</summary>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Paciente</label>
                <input
                  type="text"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleInputChange}
                  placeholder="Nome do paciente..."
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Procedimento (texto)</label>
                <input
                  type="text"
                  name="procedureType"
                  value={formData.procedureType}
                  onChange={handleInputChange}
                  placeholder="Ex: Botox..."
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Valor Total</label>
                <input
                  type="number"
                  name="totalAmount"
                  value={formData.totalAmount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300 mb-1">Parcelas</label>
                <input
                  type="number"
                  name="installments"
                  value={formData.installments}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                />
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm">
              Registrar (Modo Manual)
            </button>
          </form>
        </details>
      </div>
    </div>
  );

  if (loadingData) {
    return (
      <ResponsiveAppLayout title="Controle Financeiro">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative">
              <LoadingSpinner size="lg" className="text-blue-500" />
              <Sparkles className="absolute -top-2 -right-2 text-purple-500 animate-pulse" size={20} />
            </div>
            <p className="mt-4 text-gray-300">Carregando financeiro...</p>
          </div>
        </div>
      </ResponsiveAppLayout>
    );
  }

  return (
    <ResponsiveAppLayout title="Controle Financeiro">
      <div className="space-y-6">
        {/* Header futurista */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl backdrop-blur-sm transition-all duration-300 border border-white/10"
              >
                <ArrowLeft size={18} className="text-white" />
              </button>

              <div className="min-w-0">
                <h2 className="text-2xl font-bold glow-text">Controle Financeiro</h2>
                <p className="text-gray-300">Gerencie pagamentos e receitas</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={scrollToNewAttendance}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  activeTab === "new"
                    ? "bg-blue-500/20 text-white border-blue-400/30"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                }`}
              >
                Novo Atendimento
              </button>
              <button
                onClick={() => setActiveTab("pending")}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  activeTab === "pending"
                    ? "bg-blue-500/20 text-white border-blue-400/30"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                }`}
              >
                Pendentes ({pendingInstallments.length})
              </button>
              <button
                onClick={() => setActiveTab("completed")}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  activeTab === "completed"
                    ? "bg-blue-500/20 text-white border-blue-400/30"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                }`}
              >
                Realizados ({urlPatientId ? filteredCompletedInstallments.length : completedInstallments.length})
              </button>
              <button
                onClick={() => setActiveTab("agenda")}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  activeTab === "agenda"
                    ? "bg-blue-500/20 text-white border-blue-400/30"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                }`}
              >
                Agenda (Potencial) ({appointments.length})
              </button>
              {urlPatientId && (
                <button
                  onClick={() => setActiveTab("patient")}
                  className={`px-4 py-2 rounded-xl border transition-all ${
                    activeTab === "patient"
                      ? "bg-blue-500/20 text-white border-blue-400/30"
                      : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                  }`}
                >
                  Paciente
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Novo Atendimento - primeira seção, sempre visível */}
        <section ref={newAttendanceSectionRef} className="glass-card p-6 border border-white/10 scroll-mt-4" id="novo-atendimento">
          {renderNewAttendanceSection()}
        </section>

        {urlPatientId && (
          <div className="glass-card p-4 border border-white/10 flex flex-wrap items-center justify-between gap-2">
            <p className="text-gray-300">
              Visualizando financeiro do paciente:{" "}
              <span className="font-medium text-white">
                {patients.find((p) => p.id === urlPatientId)?.name || patientTimeline?.patient?.name || urlPatientId}
              </span>
            </p>
            <button
              type="button"
              onClick={() => navigate("/financial-control")}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-sm"
            >
              Limpar filtro
            </button>
          </div>
        )}

        {/* Seletor de mês (KPIs mensais) + Gerar Relatório */}
        {activeTab !== "patient" && (
          <div className="glass-card p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-gray-300 text-sm">Mês dos indicadores:</span>
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
                  {formatMonthYearPtBR(monthYear)}
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
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-400/40 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Download size={18} />
              {generatingReport ? "Gerando..." : "Gerar Relatório"}
            </button>
          </div>
        )}

        {/* Dashboard Cards - ocultar quando tab patient */}
        {activeTab !== "patient" && (
        <div className="grid-dashboard">
          <div className="glass-card p-6 border border-white/10 hover-lift">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="text-green-400" size={24} />
              <span className="text-xs text-gray-400">Pago</span>
            </div>
            <p className="text-lg font-bold text-white">Receita Realizada (Pago)</p>
            <p className="text-sm text-gray-300 mt-1">Bruto: {formatCurrency(paidGross)}</p>
            <p className="text-sm text-gray-300">Taxas: {formatCurrency(paidFees)}</p>
            <p className="text-sm font-medium text-green-300 mt-1">Líquido: {formatCurrency(paidNet)}</p>
          </div>

          <div className="glass-card p-6 border border-white/10 hover-lift">
            <div className="flex items-center justify-between mb-2">
              <Clock className="text-yellow-400" size={24} />
              <span className="text-xs text-gray-400">Pendente</span>
            </div>
            <p className="text-lg font-bold text-white">Receita Prevista (Pendente)</p>
            <p className="text-sm text-gray-300 mt-1">Bruto: {formatCurrency(pendingGross)}</p>
            <p className="text-sm text-gray-300">Taxas Estim.: {formatCurrency(pendingFeesExpected)}</p>
            <p className="text-sm font-medium text-yellow-300 mt-1">Líquido Esperado: {formatCurrency(pendingNetExpected)}</p>
          </div>

          <div className="glass-card p-6 border border-white/10 hover-lift">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-cyan-400" size={24} />
              <span className="text-xs text-gray-400">Mês</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalProfit)}</p>
            <p className="text-sm text-gray-300 mt-1">Lucro de Vendas (Mês)</p>
          </div>

          <div className="glass-card p-6 border border-white/10 hover-lift">
            <div className="flex items-center justify-between mb-2">
              <Percent className="text-purple-400" size={24} />
              <span className="text-xs text-gray-400">Mês</span>
            </div>
            <p className="text-2xl font-bold text-white">{averageMargin.toFixed(1)}%</p>
            <p className="text-sm text-gray-300 mt-1">Margem Média (Mês)</p>
          </div>

          <div className="glass-card p-6 border border-white/10 hover-lift">
            <div className="flex items-center justify-between mb-2">
              <Percent className="text-amber-400" size={24} />
              <span className="text-xs text-gray-400">Mês</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(totalFeesThisMonth.fees)}</p>
            <p className="text-sm text-gray-300 mt-1">Taxas do Mês</p>
            {totalFeesThisMonth.gross > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">{totalFeesThisMonth.pct.toFixed(1)}% do bruto</p>
            )}
          </div>

          <div className="glass-card p-6 border border-white/10 hover-lift">
            <div className="flex items-center justify-between mb-2">
              <Package className="text-indigo-400" size={24} />
              <span className="text-xs text-gray-400">Mês</span>
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(averageTicketThisMonth.avgNet)}</p>
            <p className="text-sm text-gray-300 mt-1">Ticket Médio (Líquido)</p>
            <p className="text-xs text-gray-400 mt-0.5">{averageTicketThisMonth.count} venda(s)</p>
          </div>
        </div>
        )}

        {/* Receita por Método (Mês): Pago + Previsto */}
        {activeTab !== "patient" && (
          <div className="glass-card p-6 border border-white/10">
            <h3 className="text-lg font-bold glow-text mb-4">Receita por Método ({formatMonthYearPtBR(monthYear)})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { key: "pix", label: "PIX" },
                { key: "cash", label: "Dinheiro" },
                { key: "credit_card", label: "Crédito" },
                { key: "debit_card", label: "Débito" },
                { key: "infinit_tag", label: "Infinit Tag" },
                { key: "bank_transfer", label: "Transferência" },
              ].map(({ key, label }) => {
                const m = revenueByMethodThisMonth.byMethod[key] || {
                  paid: { gross: 0, fee: 0, net: 0 },
                  expected: { gross: 0, fee: 0, net: 0 },
                };
                const pctPaid =
                  revenueByMethodThisMonth.totalPaidNet > 0
                    ? (m.paid.net / revenueByMethodThisMonth.totalPaidNet) * 100
                    : 0;
                const pctExpected =
                  revenueByMethodThisMonth.totalExpectedNet > 0
                    ? (m.expected.net / revenueByMethodThisMonth.totalExpectedNet) * 100
                    : 0;
                return (
                  <div key={key} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                    <p className="text-sm font-medium text-white mb-2">{label}</p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-green-400/90">Pago</p>
                        <p className="text-xs text-gray-400">Bruto: {formatCurrency(m.paid.gross)}</p>
                        <p className="text-xs text-gray-400">Taxas: {formatCurrency(m.paid.fee)}</p>
                        <p className="text-xs font-medium text-green-300">Líquido: {formatCurrency(m.paid.net)}</p>
                        {revenueByMethodThisMonth.totalPaidNet > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">{pctPaid.toFixed(0)}% do total líquido pago</p>
                        )}
                      </div>
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs font-medium text-yellow-400/90">Previsto</p>
                        <p className="text-xs text-gray-400">Bruto: {formatCurrency(m.expected.gross)}</p>
                        <p className="text-xs text-gray-400">Taxas: {formatCurrency(m.expected.fee)}</p>
                        <p className="text-xs font-medium text-yellow-300">Líquido: {formatCurrency(m.expected.net)}</p>
                        {revenueByMethodThisMonth.totalExpectedNet > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5">{pctExpected.toFixed(0)}% do total líquido previsto</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Curva de Recebimento Futuro */}
        {activeTab !== "patient" && (
          <div className="glass-card p-6 border border-white/10">
            <h3 className="text-lg font-bold glow-text mb-4">Curva de Recebimento Futuro (Próximos 6 Meses)</h3>
            {futureReceivablesCurve.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhuma parcela pendente</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {futureReceivablesCurve.map((b, idx) => (
                  <div key={b.monthYear || "overdue"} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm font-medium text-white mb-2">{b.label}</p>
                    <p className="text-xs text-gray-400">Bruto: {formatCurrency(b.gross)}</p>
                    <p className="text-xs text-gray-400">Taxas: {formatCurrency(b.fees)}</p>
                    <p className="text-xs font-medium text-green-300 mt-1">Líquido: {formatCurrency(b.net)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Métricas Quânticas - Metas Mensais */}
        {activeTab !== "patient" && (
          <div className="glass-card p-6 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <h3 className="text-lg font-bold glow-text">Métricas Quânticas · Meta Mensal</h3>
              <button
                type="button"
                onClick={() => {
                  setGoalsForm({
                    target_gross: monthlyGoal?.target_gross ?? 0,
                    target_net: monthlyGoal?.target_net ?? 0,
                    target_profit: monthlyGoal?.target_profit ?? 0,
                  });
                  setGoalsModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 text-sm"
              >
                Editar Meta
              </button>
            </div>
            {goalsLoading ? (
              <p className="text-gray-400 text-sm">Carregando metas...</p>
            ) : goalsTableMissing ? (
              <p className="text-amber-400/90 text-sm">Execute a migration financial_goals.sql para habilitar metas.</p>
            ) : goalsError ? (
              <p className="text-red-400/90 text-sm">Não foi possível carregar metas (auth/RLS/API).</p>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const goal = monthlyGoal ?? { month_year: monthYear, target_gross: 0, target_net: 0, target_profit: 0 };
                  return (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">Receita Bruta</span>
                          <span className="text-white">{formatCurrency(paidGross)} / {formatCurrency(goal.target_gross || 0)}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-green-500 to-cyan-500 h-3 rounded-full transition-all"
                            style={{ width: `${goal.target_gross > 0 ? Math.min(100, (paidGross / goal.target_gross) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">Receita Líquida</span>
                          <span className="text-white">{formatCurrency(paidNet)} / {formatCurrency(goal.target_net || 0)}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-3 rounded-full transition-all"
                            style={{ width: `${goal.target_net > 0 ? Math.min(100, (paidNet / goal.target_net) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-300">Lucro</span>
                          <span className="text-white">{formatCurrency(totalProfit)} / {formatCurrency(goal.target_profit || 0)}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all"
                            style={{ width: `${goal.target_profit > 0 ? Math.min(100, (totalProfit / goal.target_profit) * 100) : 0}%` }}
                          />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Top Procedimentos (Lucro no Mês) */}
        {activeTab !== "patient" && topProceduresProfitThisMonth.length > 0 && (
          <div className="glass-card p-6 border border-white/10">
            <h3 className="text-lg font-bold glow-text mb-4">Top Procedimentos (Lucro no Mês)</h3>
            <div className="space-y-2">
              {topProceduresProfitThisMonth.map(({ name, profit }, idx) => (
                <div key={name + idx} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-white font-medium truncate mr-2">{name}</span>
                  <span className="text-green-300 font-semibold shrink-0">{formatCurrency(profit)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal Editar Meta */}
        {goalsModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-md w-full border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Editar Meta · {formatMonthYearPtBR(monthYear)}</h3>
                <button type="button" onClick={() => setGoalsModalOpen(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10">
                  <X size={18} className="text-white" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Meta Bruta (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={goalsForm.target_gross || ""}
                    onChange={(e) => setGoalsForm((f) => ({ ...f, target_gross: Number(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Meta Líquida (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={goalsForm.target_net || ""}
                    onChange={(e) => setGoalsForm((f) => ({ ...f, target_net: Number(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Meta Lucro (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={goalsForm.target_profit || ""}
                    onChange={(e) => setGoalsForm((f) => ({ ...f, target_profit: Number(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setGoalsModalOpen(false)} className="flex-1 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const { goal, tableMissing } = await upsertMonthlyGoal(monthYear, goalsForm);
                      if (tableMissing) {
                        toast.error("Tabela de metas não disponível. Execute a migration financial_goals.");
                        return;
                      }
                      if (goal) setMonthlyGoal(goal);
                      setGoalsModalOpen(false);
                      toast.success("Meta salva!");
                    } catch (e: any) {
                      toast.error(e?.message || "Erro ao salvar meta");
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-xl neon-button"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo */}
        <div className="glass-card p-6 border border-white/10">
          {activeTab === "patient" ? (
            <div className="space-y-6">
              <h3 className="text-xl font-bold glow-text">Histórico Financeiro do Paciente</h3>
              {loadingPatientTimeline ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" />
                </div>
              ) : !patientTimeline?.records?.length ? (
                <div className="text-center py-10 text-gray-300">
                  <DollarSign size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>Nenhum registro financeiro para este paciente</p>
                </div>
              ) : (
                <>
                  {(() => {
                    const today = todayISO();
                    let paidG = 0, paidF = 0, paidN = 0, pendG = 0, pendF = 0, pendN = 0, overG = 0, overF = 0, overN = 0;
                    let recCount = 0, instCountTotal = 0;
                    patientTimeline.records.forEach(({ record, installments: insts }) => {
                      recCount += 1;
                      instCountTotal += insts.length;
                      const method = record.payment_method || "pix";
                      const instCount = ["credit_card", "infinit_tag"].includes(method) ? (record.total_installments ?? 1) : undefined;
                      const pct = resolveFeePercentLocal(method, instCount, feeRulesCache);
                      insts.forEach((i) => {
                        const g = i.installment_value;
                        if (i.status === "pago") {
                          paidG += g;
                          if (i.net_amount != null && i.fee_amount != null) {
                            paidN += Number(i.net_amount);
                            paidF += Number(i.fee_amount);
                          } else {
                            const { feeAmount, netAmount } = computeFeeNet(g, pct);
                            paidF += feeAmount;
                            paidN += netAmount;
                          }
                        } else {
                          const { feeAmount, netAmount } = computeFeeNet(g, pct);
                          const dueStr = (i.due_date || "").toString().split("T")[0];
                          if (dueStr && dueStr < today) {
                            overG += g;
                            overF += feeAmount;
                            overN += netAmount;
                          } else {
                            pendG += g;
                            pendF += feeAmount;
                            pendN += netAmount;
                          }
                        }
                      });
                    });
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
                        <div>
                          <p className="text-xs text-gray-400">Pago (Bruto / Taxas / Líquido)</p>
                          <p className="text-sm font-medium text-white">{formatCurrency(round2(paidG))} / {formatCurrency(round2(paidF))} / {formatCurrency(round2(paidN))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Pendente</p>
                          <p className="text-sm font-medium text-yellow-300">{formatCurrency(round2(pendG))} / {formatCurrency(round2(pendF))} / {formatCurrency(round2(pendN))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Em atraso</p>
                          <p className="text-sm font-medium text-red-300">{formatCurrency(round2(overG))} / {formatCurrency(round2(overF))} / {formatCurrency(round2(overN))}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Registros / Parcelas</p>
                          <p className="text-sm font-medium text-white">{recCount} / {instCountTotal}</p>
                        </div>
                      </div>
                    );
                  })()}
                  <div className="space-y-3">
                    {patientTimeline.records.map(({ record, installments: insts }) => {
                      const recId = record.id;
                      const isExpanded = patientTimelineExpanded.has(recId);
                      const method = record.payment_method || "pix";
                      const instCount = ["credit_card", "infinit_tag"].includes(method) ? (record.total_installments ?? 1) : undefined;
                      const pct = resolveFeePercentLocal(method, instCount, feeRulesCache);
                      const expectedFeeTotal = record.total_amount * (pct / 100);
                      const expectedNetTotal = record.total_amount - expectedFeeTotal;
                      const paidCount = insts.filter((i) => i.status === "pago").length;
                      const today = todayISO();
                      const overdueCount = insts.filter((i) => i.status === "pendente" && ((i.due_date || "").toString().split("T")[0] || "") < today).length;
                      return (
                        <div key={recId} className="border border-white/10 rounded-xl overflow-hidden bg-white/5">
                          <button
                            type="button"
                            className="w-full p-4 text-left hover:bg-white/5 flex justify-between items-center"
                            onClick={() => setPatientTimelineExpanded((s) => new Set(s.has(recId) ? [...s].filter((x) => x !== recId) : [...s, recId]))}
                          >
                            <div>
                              <p className="text-sm text-gray-400">{new Date(record.created_at).toLocaleDateString("pt-BR")}</p>
                              <p className="font-semibold text-white">{getProcedureDisplayName(record as FinancialRecord)}</p>
                              <p className="text-sm text-gray-300">
                                Bruto: {formatCurrency(record.total_amount)} · Líquido esperado: {formatCurrency(round2(expectedNetTotal))} · {getPaymentMethodText(method)} {record.total_installments}x
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
                                const isOverdue = inst.status === "pendente" && dueStr && dueStr < today;
                                const g = inst.installment_value;
                                const feeNet = inst.status === "pago" && inst.net_amount != null && inst.fee_amount != null
                                  ? { feeAmount: Number(inst.fee_amount), netAmount: Number(inst.net_amount) }
                                  : computeFeeNet(g, pct);
                                return (
                                  <div key={inst.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-white/5 text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-white">Parcela {inst.installment_number}</span>
                                      <span className="text-gray-400">{formatDate(inst.due_date)}</span>
                                      <span className={`px-2 py-0.5 rounded ${inst.status === "pago" ? "bg-green-500/20 text-green-200" : "bg-yellow-500/20 text-yellow-200"}`}>
                                        {inst.status === "pago" ? "Pago" : "Pendente"}
                                      </span>
                                      {isOverdue && <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-200 text-xs">ATRASADO</span>}
                                    </div>
                                    <div className="text-gray-300">
                                      Bruto: {formatCurrency(g)} · Taxa: {formatCurrency(feeNet.feeAmount)} · Líquido: {formatCurrency(feeNet.netAmount)}
                                      {inst.paid_date && <span className="ml-2 text-gray-400">Pago em {formatDate(inst.paid_date)}</span>}
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
                </>
              )}
            </div>
          ) : activeTab === "pending" ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold glow-text">Pagamentos Pendentes ({pendingInstallments.length} parcelas)</h3>

              {filteredGroupedInstallments.length === 0 ? (
                <div className="text-center py-10 text-gray-300">
                  <DollarSign size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>{urlPatientId ? "Nenhuma parcela pendente para este paciente" : "Nenhuma parcela pendente"}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGroupedInstallments.map((patientGroup) => (
                    <div key={patientGroup.patientId} className="glass-card border border-white/10 overflow-hidden">
                      {/* header paciente */}
                      <button
                        type="button"
                        className="w-full p-4 text-left hover:bg-white/5 transition-all"
                        onClick={() => togglePatientExpanded(patientGroup.patientId)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {patientGroup.isExpanded ? (
                              <ChevronUp size={20} className="text-gray-300" />
                            ) : (
                              <ChevronDown size={20} className="text-gray-300" />
                            )}
                            <div>
                              <h4 className="font-semibold text-white">{patientGroup.patientName}</h4>
                              <p className="text-sm text-gray-300">{patientGroup.installments.length} parcela(s) pendente(s)</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-300">{formatCurrency(patientGroup.totalPending)}</p>
                            <p className="text-sm text-gray-300">Total pendente</p>
                          </div>
                        </div>
                      </button>

                      {/* parcelas */}
                      {patientGroup.isExpanded && (
                        <div className="border-t border-white/10">
                          {patientGroup.installments.map((inst) => {
                            const procedure = patientGroup.procedures[inst.procedure_id];
                            return (
                              <div key={inst.id} className="p-4 border-b border-white/10 last:border-b-0 bg-white/5">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-semibold text-white">
                                      {(() => {
                                        const record = financialRecords.find(r => r.id === inst.procedure_id);
                                        return record ? getProcedureDisplayName(record) : procedure?.procedure_type || 'Procedimento';
                                      })()}
                                    </p>
                                    <p className="text-sm text-gray-300">
                                      Parcela {inst.installment_number} de {procedure?.total_installments}
                                      {inst.status === "pendente" && (inst.due_date || "").toString().split("T")[0] < todayStr && (
                                        <span className="ml-2 inline-flex px-2 py-0.5 rounded-md bg-red-500/20 border border-red-400/30 text-red-200 text-xs font-medium">
                                          ATRASADO
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <span className="text-lg font-bold text-green-300">{formatCurrency(inst.installment_value)}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-300">Vencimento:</span>
                                    <p className="font-medium text-white">{formatDate(inst.due_date)}</p>
                                  </div>

                                  <div>
                                    <span className="text-gray-300">Método Original:</span>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-white">{getPaymentMethodText(procedure?.payment_method || "")}</p>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (procedure) openEditMethodModal(procedure);
                                        }}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                                        title="Editar método de pagamento"
                                      >
                                        <Edit size={14} className="text-cyan-300" />
                                      </button>
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-gray-300">Status:</span>
                                    <span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inst.status)}`}>
                                      {inst.status}
                                    </span>
                                  </div>

                                  <div className="md:col-span-2">
                                    <span className="text-gray-300">Ações:</span>
                                    <div className="flex gap-2 mt-1">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openPaymentModal(inst);
                                        }}
                                        className="w-full neon-button"
                                      >
                                        Registrar Pagamento
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "completed" ? (
            <div className="space-y-6">
              {/* cards resumo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-6 hover-lift border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                      <p className="text-sm text-gray-300">Total Faturado</p>
                    </div>
                    <DollarSign className="text-green-300" size={30} />
                  </div>
                </div>

                <div className="glass-card p-6 hover-lift border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{urlPatientId ? filteredCompletedInstallments.length : completedInstallments.length}</p>
                      <p className="text-sm text-gray-300">Parcelas Pagas</p>
                    </div>
                    <CheckCircle className="text-cyan-300" size={30} />
                  </div>
                </div>

                <div className="glass-card p-6 hover-lift border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{monthlyRevenue.length}</p>
                      <p className="text-sm text-gray-300">Meses com Faturamento</p>
                    </div>
                    <BarChart3 className="text-purple-300" size={30} />
                  </div>
                </div>
              </div>

              {/* faturamento mensal */}
              <div className="glass-card p-6 border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className="text-xl font-bold glow-text">Faturamento Mensal</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMonthlyRevenueMode("net")}
                      className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                        monthlyRevenueMode === "net"
                          ? "bg-cyan-500/20 text-cyan-100 border-cyan-400/30"
                          : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      Líquido
                    </button>
                    <button
                      type="button"
                      onClick={() => setMonthlyRevenueMode("gross")}
                      className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                        monthlyRevenueMode === "gross"
                          ? "bg-cyan-500/20 text-cyan-100 border-cyan-400/30"
                          : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      Bruto
                    </button>
                  </div>
                </div>

                {monthlyRevenue.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {monthlyRevenue.map((item, index) => {
                      const value = monthlyRevenueMode === "gross" ? item.grossTotal : item.netTotal;
                      const percentage = getMaxRevenue() > 0 ? (value / getMaxRevenue()) * 100 : 0;
                      return (
                        <div key={index} className="glass-card p-4 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-white">{item.month}</span>
                            <span className="font-bold text-green-300">{formatCurrency(value)}</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-green-500 to-cyan-500 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(10, percentage)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-300 mt-2 text-center">{formatCurrency(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-300">
                    <BarChart3 size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>Nenhum dado de faturamento disponível</p>
                  </div>
                )}
              </div>

              {/* pagamentos realizados */}
              <div className="glass-card p-6 border border-white/10">
                <h3 className="text-xl font-bold glow-text mb-4">Pagamentos Realizados</h3>

                {(urlPatientId ? filteredCompletedInstallments : completedInstallments).length === 0 ? (
                  <div className="text-center py-10 text-gray-300">
                    <DollarSign size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>{urlPatientId ? "Nenhum pagamento realizado para este paciente" : "Nenhum pagamento realizado"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(urlPatientId ? filteredCompletedInstallments : completedInstallments).map((inst) => {
                      const procedure = payments.find((p) => p.id === inst.procedure_id);
                      const paymentMethod = inst.payment_method || procedure?.payment_method || "Não informado";

                      return (
                        <div key={inst.id} className="glass-card p-4 border border-green-400/20 bg-green-500/10">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-white">{procedure?.client_name}</h4>
                              <p className="text-sm text-gray-300">
                                {(() => {
                                  const record = financialRecords.find(r => r.id === inst.procedure_id);
                                  if (record) {
                                    const displayName = getProcedureDisplayName(record);
                                    return (
                                      <>
                                        {displayName}
                                        {record.total_profit > 0 && (
                                          <span className="ml-2 text-xs text-green-400">
                                            • Lucro: {formatCurrency(record.total_profit)} ({record.profit_margin.toFixed(1)}%)
                                          </span>
                                        )}
                                      </>
                                    );
                                  }
                                  return procedure?.procedure_type || 'Procedimento';
                                })()}
                              </p>
                            </div>
                            <span className="text-lg font-bold text-white">{formatCurrency(inst.installment_value)}</span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-300">Parcela:</span>
                              <p className="font-medium text-white">
                                {inst.installment_number}/{procedure?.total_installments}
                              </p>
                            </div>
                            <div>
                              <span className="text-gray-300">Data do Pagamento:</span>
                              <p className="font-medium text-white">{inst.paid_date ? formatDate(inst.paid_date) : "N/A"}</p>
                            </div>
                            <div>
                              <span className="text-gray-300">Método Utilizado:</span>
                              <p className="font-medium text-white">{getPaymentMethodText(paymentMethod)}</p>
                            </div>
                            <div>
                              <span className="text-gray-300">Status:</span>
                              <span className="inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-100 border border-green-400/30">
                                Pago
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "agenda" && (
            <div className="glass-card p-6 border border-white/10">
              <div className="space-y-4">
                <h3 className="text-xl font-bold glow-text">Agenda (Potencial) - {appointments.length} agendamentos</h3>

                {appointments.length === 0 ? (
                  <div className="text-center py-10 text-gray-300">
                    <Calendar size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>Nenhum agendamento na janela de tempo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="glass-card p-4 border border-white/10">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-white">{appointment.patient_name}</h4>
                            <p className="text-sm text-gray-300">
                              {formatDate(appointment.start_time)} • {new Date(appointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {appointment.procedures.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {appointment.procedures.map((proc, idx) => (
                                  <div key={idx} className="text-xs text-gray-400 flex items-center gap-2">
                                    <Package size={12} />
                                    <span>{proc.procedure_name_snapshot} - {formatCurrency(proc.final_price)}</span>
                                  </div>
                                ))}
                                <p className="text-sm font-semibold text-green-400 mt-2">
                                  Total Potencial: {formatCurrency(appointment.totalPotential)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenCloseAppointment(appointment)}
                            className="flex-1 neon-button text-sm"
                          >
                            Fechar Atendimento
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkNoSale(appointment.id)}
                            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm"
                          >
                            Não Realizou
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal confirmação pagamento */}
        {paymentModal.isOpen && paymentModal.installment && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-md w-full border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Confirmar Pagamento</h3>
                <button
                  onClick={closePaymentModal}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-gray-300 mb-2">
                  Valor bruto:{" "}
                  <span className="font-bold text-green-300">
                    {formatCurrency(paymentModal.installment.installment_value)}
                  </span>
                </p>
                {paymentModal.installment.status === "pago" &&
                paymentModal.installment.fee_percent_applied != null &&
                paymentModal.installment.fee_amount != null &&
                paymentModal.installment.net_amount != null ? (
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>Taxa aplicada: {Number(paymentModal.installment.fee_percent_applied)}% ({formatCurrency(Number(paymentModal.installment.fee_amount))})</p>
                    <p>Líquido: <span className="font-medium text-white">{formatCurrency(Number(paymentModal.installment.net_amount))}</span></p>
                  </div>
                ) : (
                  feePercentPreview > 0 && (
                    <div className="text-sm text-gray-300 space-y-1">
                      <p>Taxa InfinityPay: {feePercentPreview}% ({formatCurrency(round2((paymentModal.installment.installment_value * feePercentPreview) / 100))})</p>
                      <p>Líquido: <span className="font-medium text-white">{formatCurrency(round2(paymentModal.installment.installment_value - (paymentModal.installment.installment_value * feePercentPreview) / 100))}</span></p>
                    </div>
                  )
                )}
                {!paymentModal.installment.fee_amount && feePercentPreview === 0 && ["credit_card", "debit_card", "infinit_tag"].includes(paymentModal.selectedMethod) && (
                  <p className="text-xs text-amber-400/90 mt-1">Taxa: indisponível (migre o banco)</p>
                )}
                <p className="text-gray-300 mt-2">
                  Paciente:{" "}
                  <span className="font-medium text-white">
                    {payments.find((p) => p.id === paymentModal.installment?.procedure_id)?.client_name}
                  </span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">Método de Pagamento Utilizado *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "pix", label: "PIX" },
                    { key: "cash", label: "Dinheiro" },
                    { key: "credit_card", label: "Cartão Crédito" },
                    { key: "debit_card", label: "Cartão Débito" },
                    { key: "infinit_tag", label: "Infinit Tag" },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handlePaymentMethodChange(m.key)}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        paymentModal.selectedMethod === m.key
                          ? "bg-green-500/20 text-green-100 border-green-400/30"
                          : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="flex-1 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all"
                >
                  Cancelar
                </button>
                <button type="button" onClick={confirmPayment} className="flex-1 neon-button">
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal editar método */}
        {editMethodModal.isOpen && editMethodModal.procedure && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-md w-full border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Editar Método de Pagamento</h3>
                <button
                  onClick={closeEditMethodModal}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>

              <div className="mb-4 text-gray-300 space-y-1">
                <p>
                  Paciente: <span className="font-medium text-white">{editMethodModal.procedure.client_name}</span>
                </p>
                <p>
                  Procedimento: <span className="font-medium text-white">{editMethodModal.procedure.procedure_type}</span>
                </p>
                <p>
                  Valor Total:{" "}
                  <span className="font-bold text-green-300">{formatCurrency(editMethodModal.procedure.total_amount)}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-200 mb-2">Método de Pagamento *</label>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "pix", label: "PIX" },
                    { key: "cash", label: "Dinheiro" },
                    { key: "credit_card", label: "Cartão Crédito" },
                    { key: "debit_card", label: "Cartão Débito" },
                    { key: "bank_transfer", label: "Transferência Bancária", colSpan: 2 },
                  ].map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => handleEditMethodChange(m.key)}
                      className={`p-3 rounded-xl border text-center transition-all ${m.colSpan ? "col-span-2" : ""} ${
                        editMethodModal.selectedMethod === m.key
                          ? "bg-blue-500/20 text-blue-100 border-blue-400/30"
                          : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeEditMethodModal}
                  className="flex-1 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all"
                >
                  Cancelar
                </button>
                <button type="button" onClick={handleUpdatePaymentMethod} className="flex-1 neon-button">
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Fechar Atendimento */}
        {closeAppointmentModal.isOpen && closeAppointmentModal.appointment && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card p-6 max-w-2xl w-full border border-white/10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Fechar Atendimento</h3>
                <button
                  onClick={() => setCloseAppointmentModal({ isOpen: false, appointment: null, items: [] })}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>

              <div className="mb-4 space-y-2">
                <p className="text-gray-300">
                  Paciente: <span className="font-medium text-white">{closeAppointmentModal.appointment.patient_name}</span>
                </p>
                <p className="text-gray-300">
                  Data: <span className="font-medium text-white">{formatDate(closeAppointmentModal.appointment.start_time)}</span>
                </p>
              </div>

              <div className="mb-6 space-y-3">
                <h4 className="font-semibold text-white">Procedimentos</h4>
                {closeAppointmentModal.items.map((item, index) => (
                  <div key={index} className="glass-card p-3 border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-white">{item.name}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Qtd</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...closeAppointmentModal.items];
                                updated[index] = { ...updated[index], quantity: Number(e.target.value) };
                                updated[index].profit = (updated[index].finalPrice * updated[index].quantity - updated[index].discount) - (updated[index].costPrice * updated[index].quantity);
                                setCloseAppointmentModal({ ...closeAppointmentModal, items: updated });
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Preço Final</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.finalPrice}
                              onChange={(e) => {
                                const updated = [...closeAppointmentModal.items];
                                updated[index] = { ...updated[index], finalPrice: Number(e.target.value) };
                                updated[index].profit = (updated[index].finalPrice * updated[index].quantity - updated[index].discount) - (updated[index].costPrice * updated[index].quantity);
                                setCloseAppointmentModal({ ...closeAppointmentModal, items: updated });
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Desconto</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discount}
                              onChange={(e) => {
                                const updated = [...closeAppointmentModal.items];
                                updated[index] = { ...updated[index], discount: Number(e.target.value) };
                                updated[index].profit = (updated[index].finalPrice * updated[index].quantity - updated[index].discount) - (updated[index].costPrice * updated[index].quantity);
                                setCloseAppointmentModal({ ...closeAppointmentModal, items: updated });
                              }}
                              className="w-full px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-300 mb-1">Lucro</label>
                            <p className="text-sm font-semibold text-green-400">{formatCurrency(item.profit)}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = closeAppointmentModal.items.filter((_, i) => i !== index);
                          setCloseAppointmentModal({ ...closeAppointmentModal, items: newItems });
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg ml-2"
                      >
                        <X size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
                
                {/* Resumo do fechamento */}
                {closeAppointmentModal.items.length > 0 && (
                  <div className="glass-card p-4 border border-cyan-500/30 bg-cyan-500/5 mt-4">
                    <h5 className="font-semibold text-white mb-2">Resumo do Fechamento</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-300">Total Final</p>
                        <p className="text-lg font-bold text-white">
                          {formatCurrency(closeAppointmentModal.items.reduce((sum, item) => sum + (item.finalPrice * item.quantity - item.discount), 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-300">Total Custo</p>
                        <p className="text-lg font-bold text-gray-300">
                          {formatCurrency(closeAppointmentModal.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-300">Total Lucro</p>
                        <p className="text-lg font-bold text-green-400">
                          {formatCurrency(closeAppointmentModal.items.reduce((sum, item) => sum + item.profit, 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-300">Margem</p>
                        <p className="text-lg font-bold text-purple-400">
                          {(() => {
                            const totalFinal = closeAppointmentModal.items.reduce((sum, item) => sum + (item.finalPrice * item.quantity - item.discount), 0);
                            const totalProfit = closeAppointmentModal.items.reduce((sum, item) => sum + item.profit, 0);
                            return totalFinal > 0 ? ((totalProfit / totalFinal) * 100).toFixed(1) : '0.0';
                          })()}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    value={comandaInstallments}
                    onChange={(e) => setComandaInstallments(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">Método</label>
                  <select
                    value={comandaPaymentMethod}
                    onChange={(e) => setComandaPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  >
                    <option value="pix" className="text-black">PIX</option>
                    <option value="credit_card" className="text-black">Cartão Crédito</option>
                    <option value="debit_card" className="text-black">Cartão Débito</option>
                    <option value="cash" className="text-black">Dinheiro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">1º Pagamento</label>
                  <input
                    type="date"
                    value={comandaFirstPaymentDate}
                    onChange={(e) => setComandaFirstPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setCloseAppointmentModal({ isOpen: false, appointment: null, items: [] })}
                  className="flex-1 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all"
                >
                  Cancelar
                </button>
                <button type="button" onClick={handleCloseAppointment} disabled={isLoading} className="flex-1 neon-button">
                  {isLoading ? "Fechando..." : "Fechar Atendimento"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ResponsiveAppLayout>
  );
};

export default FinancialControl;
