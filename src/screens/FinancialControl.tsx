// src/screens/FinancialControl.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useSupabase } from "../contexts/SupabaseContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";

import AppLayout from "../components/Layout/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";

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
}

interface CalculatedInstallment {
  number: number;
  value: number;
  dueDate: string;
}

interface MonthlyRevenue {
  month: string;
  total: number;
  monthYear: string;
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

const FinancialControl: React.FC = () => {
  const { supabase } = useSupabase();
  const navigate = useNavigate();

  const [formData, setFormData] = useState<PaymentFormData>({
    patientId: "",
    patientName: "",
    procedureType: "",
    totalAmount: 0,
    installments: 1,
    paymentMethod: "pix",
    firstPaymentDate: new Date().toISOString().split("T")[0],
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [payments, setPayments] = useState<ProcedureData[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [activeTab, setActiveTab] = useState<"new" | "pending" | "completed">("new");

  const [calculatedInstallments, setCalculatedInstallments] = useState<CalculatedInstallment[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [groupedInstallments, setGroupedInstallments] = useState<PatientInstallments[]>([]);

  const [paymentModal, setPaymentModal] = useState<PaymentConfirmationModal>({
    isOpen: false,
    installment: null,
    selectedMethod: "pix",
  });

  const [editMethodModal, setEditMethodModal] = useState<EditPaymentMethodModal>({
    isOpen: false,
    procedure: null,
    selectedMethod: "pix",
  });

  useEffect(() => {
    (async () => {
      setLoadingData(true);
      await Promise.all([fetchPatients(), fetchPayments()]);
      setLoadingData(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const { data, error } = await supabase.from("procedures").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      const procedures = (data as ProcedureData[]) || [];
      setPayments(procedures);

      if (procedures.length > 0) {
        const { data: installmentsData, error: installmentsError } = await supabase
          .from("installments")
          .select("*")
          .in("procedure_id", procedures.map((p) => p.id));

        if (!installmentsError) {
          setInstallments((installmentsData || []) as Installment[]);
        }
      } else {
        setInstallments([]);
      }
    } catch (error) {
      toast.error("Erro ao carregar pagamentos!");
    }
  };

  const calculateMonthlyRevenue = () => {
    const paidInstallments = installments.filter((i) => i.status === "pago" && i.paid_date);

    const revenueByMonth: { [key: string]: number } = {};

    paidInstallments.forEach((installment) => {
      if (installment.paid_date) {
        const date = new Date(installment.paid_date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;

        if (!revenueByMonth[monthYear]) revenueByMonth[monthYear] = 0;
        revenueByMonth[monthYear] += installment.installment_value;
      }
    });

    const monthlyData = Object.entries(revenueByMonth)
      .map(([monthYear, total]) => {
        const [year, month] = monthYear.split("-");
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          month: date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
          monthYear,
          total,
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
      const updateData: any = {
        status: "pago",
        paid_date: new Date().toISOString().split("T")[0],
        payment_method: paymentModal.selectedMethod,
      };

      const { error } = await supabase.from("installments").update(updateData).eq("id", paymentModal.installment.id);
      if (error) throw error;

      toast.success("Parcela marcada como paga!");
      fetchPayments();
      closePaymentModal();
    } catch (error) {
      toast.error("Erro ao atualizar parcela!");
    }
  };

  const updatePaymentMethod = async () => {
    if (!editMethodModal.procedure) return;

    try {
      const { error } = await supabase
        .from("procedures")
        .update({ payment_method: editMethodModal.selectedMethod })
        .eq("id", editMethodModal.procedure.id);

      if (error) throw error;

      const { error: installmentsError } = await supabase
        .from("installments")
        .update({ payment_method: editMethodModal.selectedMethod })
        .eq("procedure_id", editMethodModal.procedure.id)
        .eq("status", "pendente");

      if (installmentsError) throw installmentsError;

      toast.success("Método de pagamento atualizado com sucesso!");
      fetchPayments();
      closeEditMethodModal();
    } catch (error) {
      toast.error("Erro ao atualizar método de pagamento!");
    }
  };

  const getMaxRevenue = () => {
    if (monthlyRevenue.length === 0) return 0;
    return Math.max(...monthlyRevenue.map((item) => item.total));
  };

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
      console.error("Erro ao salvar pagamento:", error);
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
      case "bank_transfer":
        return "Transferência Bancária";
      default:
        return method;
    }
  };

  const pendingInstallments = useMemo(() => installments.filter((i) => i.status === "pendente"), [installments]);
  const completedInstallments = useMemo(() => installments.filter((i) => i.status === "pago"), [installments]);

  const totalRevenue = useMemo(
    () => completedInstallments.reduce((sum, installment) => sum + installment.installment_value, 0),
    [completedInstallments]
  );

  if (loadingData) {
    return (
      <AppLayout title="Controle Financeiro">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative">
              <LoadingSpinner size="lg" className="text-blue-500" />
              <Sparkles className="absolute -top-2 -right-2 text-purple-500 animate-pulse" size={20} />
            </div>
            <p className="mt-4 text-gray-300">Carregando financeiro...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Controle Financeiro">
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
                onClick={() => setActiveTab("new")}
                className={`px-4 py-2 rounded-xl border transition-all ${
                  activeTab === "new"
                    ? "bg-blue-500/20 text-white border-blue-400/30"
                    : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                }`}
              >
                Novo Registro
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
                Realizados ({completedInstallments.length})
              </button>
            </div>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="glass-card p-6 border border-white/10">
          {activeTab === "new" ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Paciente autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-200 mb-2">Paciente *</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      name="patientName"
                      value={formData.patientName}
                      onChange={handleInputChange}
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
                            onClick={() => handlePatientSelect(patient)}
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
                  <label className="block text-sm font-medium text-gray-200 mb-2">Procedimento *</label>
                  <input
                    type="text"
                    name="procedureType"
                    value={formData.procedureType}
                    onChange={handleInputChange}
                    placeholder="Ex: Botox, Preenchimento..."
                    className="px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Valor Total (R$) *</label>
                  <input
                    type="number"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleInputChange}
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    className="px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Número de Parcelas *</label>
                  <input
                    type="number"
                    name="installments"
                    value={formData.installments}
                    onChange={handleInputChange}
                    min="1"
                    className="px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Método de Pagamento *</label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    className="px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    required
                  >
                    <option value="pix" className="text-black">
                      PIX
                    </option>
                    <option value="credit_card" className="text-black">
                      Cartão de Crédito
                    </option>
                    <option value="debit_card" className="text-black">
                      Cartão de Débito
                    </option>
                    <option value="cash" className="text-black">
                      Dinheiro
                    </option>
                    <option value="bank_transfer" className="text-black">
                      Transferência Bancária
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-2">Data do Primeiro Pagamento *</label>
                  <input
                    type="date"
                    name="firstPaymentDate"
                    value={formData.firstPaymentDate}
                    onChange={handleInputChange}
                    className="px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Preview parcelas */}
              {calculatedInstallments.length > 0 && (
                <div className="glass-card p-4 border border-white/10 bg-white/5">
                  <h4 className="font-semibold text-white mb-3">Preview das Parcelas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {calculatedInstallments.map((inst) => (
                      <div key={inst.number} className="glass-card p-4 border border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-white">Parcela {inst.number}</span>
                          <span className="text-green-300 font-bold">{formatCurrency(inst.value)}</span>
                        </div>
                        <div className="text-sm text-gray-300 mt-1">Vencimento: {formatDate(inst.dueDate)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full neon-button">
                {isLoading ? "Registrando..." : "Registrar Pagamento"}
              </button>
            </form>
          ) : activeTab === "pending" ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold glow-text">Pagamentos Pendentes ({pendingInstallments.length} parcelas)</h3>

              {groupedInstallments.length === 0 ? (
                <div className="text-center py-10 text-gray-300">
                  <DollarSign size={48} className="mx-auto mb-4 text-gray-400" />
                  <p>Nenhuma parcela pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedInstallments.map((patientGroup) => (
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
                                    <p className="font-semibold text-white">{procedure?.procedure_type}</p>
                                    <p className="text-sm text-gray-300">
                                      Parcela {inst.installment_number} de {procedure?.total_installments}
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
          ) : (
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
                      <p className="text-3xl font-bold text-white">{completedInstallments.length}</p>
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
                <h3 className="text-xl font-bold glow-text mb-4">Faturamento Mensal</h3>

                {monthlyRevenue.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {monthlyRevenue.map((item, index) => {
                      const percentage = getMaxRevenue() > 0 ? (item.total / getMaxRevenue()) * 100 : 0;
                      return (
                        <div key={index} className="glass-card p-4 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-white">{item.month}</span>
                            <span className="font-bold text-green-300">{formatCurrency(item.total)}</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-3">
                            <div
                              className="bg-gradient-to-r from-green-500 to-cyan-500 h-3 rounded-full transition-all duration-300"
                              style={{ width: `${Math.max(10, percentage)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-300 mt-2 text-center">{formatCurrency(item.total)}</p>
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

                {completedInstallments.length === 0 ? (
                  <div className="text-center py-10 text-gray-300">
                    <DollarSign size={48} className="mx-auto mb-4 text-gray-400" />
                    <p>Nenhum pagamento realizado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedInstallments.map((inst) => {
                      const procedure = payments.find((p) => p.id === inst.procedure_id);
                      const paymentMethod = inst.payment_method || procedure?.payment_method || "Não informado";

                      return (
                        <div key={inst.id} className="glass-card p-4 border border-green-400/20 bg-green-500/10">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-white">{procedure?.client_name}</h4>
                              <p className="text-sm text-gray-300">{procedure?.procedure_type}</p>
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
                  Valor:{" "}
                  <span className="font-bold text-green-300">
                    {formatCurrency(paymentModal.installment.installment_value)}
                  </span>
                </p>
                <p className="text-gray-300">
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
                <button type="button" onClick={updatePaymentMethod} className="flex-1 neon-button">
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default FinancialControl;
