import React, { useState, useEffect } from "react";
import { useSupabase } from "../contexts/SupabaseContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Search, DollarSign, Calendar, User, CreditCard, Calendar as CalendarIcon, BarChart3, ChevronDown, ChevronUp, X, Edit, Save, Trash2, ArrowLeft, CheckCircle } from "lucide-react";
import BottomNavigation from "../components/BottomNavigation"; // Importe o componente

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
    firstPaymentDate: new Date().toISOString().split('T')[0],
  });

  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [payments, setPayments] = useState<ProcedureData[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "pending" | "completed">("new");
  const [calculatedInstallments, setCalculatedInstallments] = useState<CalculatedInstallment[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [groupedInstallments, setGroupedInstallments] = useState<PatientInstallments[]>([]);
  const [paymentModal, setPaymentModal] = useState<PaymentConfirmationModal>({
    isOpen: false,
    installment: null,
    selectedMethod: "pix"
  });

  const [editMethodModal, setEditMethodModal] = useState<EditPaymentMethodModal>({
    isOpen: false,
    procedure: null,
    selectedMethod: "pix"
  });

  useEffect(() => {
    fetchPatients();
    fetchPayments();
  }, []);

  useEffect(() => {
    if (formData.patientName) {
      const filtered = patients.filter(patient =>
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
    const installments = calculateInstallments();
    setCalculatedInstallments(installments);
  }, [formData.totalAmount, formData.installments, formData.firstPaymentDate]);

  useEffect(() => {
    calculateMonthlyRevenue();
  }, [installments]);

  useEffect(() => {
    groupInstallmentsByPatient();
  }, [installments, payments]);

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name, phone, email")
        .order("name");

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("procedures")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments(data as ProcedureData[] || []);

      if (data && data.length > 0) {
        const { data: installmentsData, error: installmentsError } = await supabase
          .from("installments")
          .select("*")
          .in("procedure_id", data.map(p => p.id));

        if (!installmentsError) {
          setInstallments(installmentsData || []);
        }
      }
    } catch (error) {
      toast.error("Erro ao carregar pagamentos!");
    }
  };

  const calculateMonthlyRevenue = () => {
    const paidInstallments = installments.filter(i => i.status === 'pago' && i.paid_date);
    
    const revenueByMonth: { [key: string]: number } = {};
    
    paidInstallments.forEach(installment => {
      if (installment.paid_date) {
        const date = new Date(installment.paid_date);
        const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('pt-BR', {
          month: 'long',
          year: 'numeric'
        });
        
        if (!revenueByMonth[monthYear]) {
          revenueByMonth[monthYear] = 0;
        }
        revenueByMonth[monthYear] += installment.installment_value;
      }
    });

    const monthlyData = Object.entries(revenueByMonth)
      .map(([monthYear, total]) => {
        const [year, month] = monthYear.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          month: date.toLocaleDateString('pt-BR', {
            month: 'long',
            year: 'numeric'
          }),
          monthYear,
          total
        };
      })
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear));

    setMonthlyRevenue(monthlyData);
  };

  const groupInstallmentsByPatient = () => {
    const pending = installments.filter(i => i.status === 'pendente');
    
    const grouped: { [key: string]: PatientInstallments } = {};

    pending.forEach(installment => {
      const procedure = payments.find(p => p.id === installment.procedure_id);
      if (!procedure) return;

      if (!grouped[procedure.patient_id]) {
        grouped[procedure.patient_id] = {
          patientId: procedure.patient_id,
          patientName: procedure.client_name,
          installments: [],
          procedures: {},
          totalPending: 0,
          isExpanded: false
        };
      }

      grouped[procedure.patient_id].installments.push(installment);
      grouped[procedure.patient_id].procedures[procedure.id] = procedure;
      grouped[procedure.patient_id].totalPending += installment.installment_value;
    });

    setGroupedInstallments(Object.values(grouped).sort((a, b) => 
      a.patientName.localeCompare(b.patientName)
    ));
  };

  const togglePatientExpanded = (patientId: string) => {
    setGroupedInstallments(prev => prev.map(item => 
      item.patientId === patientId 
        ? { ...item, isExpanded: !item.isExpanded }
        : item
    ));
  };

  const openPaymentModal = (installment: Installment) => {
    const procedure = payments.find(p => p.id === installment.procedure_id);
    const originalMethod = procedure?.payment_method || "pix";
    
    setPaymentModal({
      isOpen: true,
      installment,
      selectedMethod: originalMethod
    });
  };

  const closePaymentModal = () => {
    setPaymentModal({
      isOpen: false,
      installment: null,
      selectedMethod: "pix"
    });
  };

  const openEditMethodModal = (procedure: ProcedureData) => {
    setEditMethodModal({
      isOpen: true,
      procedure,
      selectedMethod: procedure.payment_method
    });
  };

  const closeEditMethodModal = () => {
    setEditMethodModal({
      isOpen: false,
      procedure: null,
      selectedMethod: "pix"
    });
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentModal(prev => ({ ...prev, selectedMethod: method }));
  };

  const handleEditMethodChange = (method: string) => {
    setEditMethodModal(prev => ({ ...prev, selectedMethod: method }));
  };

  const confirmPayment = async () => {
    if (!paymentModal.installment) return;

    try {
      const updateData: any = {
        status: "pago",
        paid_date: new Date().toISOString().split('T')[0],
        payment_method: paymentModal.selectedMethod
      };

      const { error } = await supabase
        .from("installments")
        .update(updateData)
        .eq("id", paymentModal.installment.id);

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
        .update({ 
          payment_method: editMethodModal.selectedMethod 
        })
        .eq("id", editMethodModal.procedure.id);

      if (error) throw error;

      // Atualizar também o método de pagamento nas parcelas pendentes
      const { error: installmentsError } = await supabase
        .from("installments")
        .update({ 
          payment_method: editMethodModal.selectedMethod 
        })
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
    return Math.max(...monthlyRevenue.map(item => item.total));
  };

  const handlePatientSelect = (patient: Patient) => {
    setFormData({
      ...formData,
      patientId: patient.id,
      patientName: patient.name
    });
    setShowPatientDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "totalAmount" || name === "installments" ? Number(value) : value
    }));
  };

  const calculateInstallments = (): CalculatedInstallment[] => {
    if (formData.totalAmount > 0 && formData.installments > 0) {
      const installmentValue = formData.totalAmount / formData.installments;
      const installments: CalculatedInstallment[] = [];

      for (let i = 0; i < formData.installments; i++) {
        const dueDate = new Date(formData.firstPaymentDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        installments.push({
          number: i + 1,
          value: installmentValue,
          dueDate: dueDate.toISOString().split('T')[0]
        });
      }

      return installments;
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { patientId, patientName, procedureType, totalAmount, installments, paymentMethod, firstPaymentDate } = formData;

      if (!patientId || !procedureType || !firstPaymentDate) {
        toast.error("Preencha todos os campos obrigatórios!");
        return;
      }

      const { data, error } = await supabase
        .from("procedures")
        .insert([{
          patient_id: patientId,
          client_name: patientName,
          procedure_type: procedureType,
          total_amount: totalAmount,
          total_installments: installments,
          payment_method: paymentMethod,
          first_payment_date: firstPaymentDate,
          status: "pendente"
        }])
        .select();

      if (error) throw error;

      const procedureData = data as ProcedureData[] | null;
      const procedureId = procedureData?.[0]?.id;

      if (procedureId) {
        const installmentValue = totalAmount / installments;
        
        for (let i = 0; i < installments; i++) {
          const dueDate = new Date(firstPaymentDate);
          dueDate.setMonth(dueDate.getMonth() + i);
          
          await supabase.from("installments").insert([{
            procedure_id: procedureId,
            installment_number: i + 1,
            installment_value: installmentValue,
            due_date: dueDate.toISOString().split('T')[0],
            status: "pendente",
            payment_method: paymentMethod
          }]);
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
        firstPaymentDate: new Date().toISOString().split('T')[0],
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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'text-green-600 bg-green-100';
      case 'pendente': return 'text-yellow-600 bg-yellow-100';
      case 'atrasado': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'pix': return 'PIX';
      case 'cash': return 'Dinheiro';
      case 'credit_card': return 'Cartão de Crédito';
      case 'debit_card': return 'Cartão de Débito';
      case 'bank_transfer': return 'Transferência Bancária';
      default: return method;
    }
  };

  const pendingInstallments = installments.filter(i => i.status === 'pendente');
  const completedInstallments = installments.filter(i => i.status === 'pago');
  const totalRevenue = completedInstallments.reduce((sum, installment) => sum + installment.installment_value, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-900 via-pink-800 to-pink-700 text-white pb-20">
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-pink-800 to-rose-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-pink-700 rounded-lg hover:bg-pink-600 transition-colors"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-white">Controle Financeiro</h2>
              <p className="text-gray-300">Gerencie pagamentos e receitas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex border-b border-pink-600 mb-6">
          <button
            onClick={() => setActiveTab("new")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "new"
                ? "border-b-2 border-white text-white"
                : "text-pink-200 hover:text-white"
            }`}
          >
            Novo Registro
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "pending"
                ? "border-b-2 border-white text-white"
                : "text-pink-200 hover:text-white"
            }`}
          >
            Pendentes ({pendingInstallments.length})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "completed"
                ? "border-b-2 border-white text-white"
                : "text-pink-200 hover:text-white"
            }`}
          >
            Realizados ({completedInstallments.length})
          </button>
        </div>

        <div className="ios-card bg-gradient-to-r from-pink-800 to-rose-800 rounded-lg shadow-lg p-6">
          {activeTab === "new" ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Campo de Paciente com Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-pink-100 mb-2">
                    Paciente *
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-pink-300" size={20} />
                    <input
                      type="text"
                      name="patientName"
                      value={formData.patientName}
                      onChange={handleInputChange}
                      placeholder="Buscar paciente..."
                      className="pl-10 p-3 border border-pink-600 bg-pink-700 text-white rounded-lg w-full focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder-pink-300"
                      required
                    />
                    {showPatientDropdown && filteredPatients.length > 0 && (
                      <div className="absolute z-10 w-full bg-pink-700 border border-pink-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                        {filteredPatients.map(patient => (
                          <div
                            key={patient.id}
                            onClick={() => handlePatientSelect(patient)}
                            className="p-3 hover:bg-pink-600 cursor-pointer border-b border-pink-600 last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-white">{patient.name}</div>
                            <div className="text-sm text-pink-200">{patient.phone}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-100 mb-2">
                    Procedimento *
                  </label>
                  <input
                    type="text"
                    name="procedureType"
                    value={formData.procedureType}
                    onChange={handleInputChange}
                    placeholder="Ex: Botox, Preenchimento..."
                    className="p-3 border border-pink-600 bg-pink-700 text-white rounded-lg w-full focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder-pink-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-100 mb-2">
                    Valor Total (R$) *
                  </label>
                  <input
                    type="number"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleInputChange}
                    placeholder="0,00"
                    min="0"
                    step="0.01"
                    className="p-3 border border-pink-600 bg-pink-700 text-white rounded-lg w-full focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder-pink-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-100 mb-2">
                    Número de Parcelas *
                  </label>
                  <input
                    type="number"
                    name="installments"
                    value={formData.installments}
                    onChange={handleInputChange}
                    min="1"
                    className="p-3 border border-pink-600 bg-pink-700 text-white rounded-lg w-full focus:ring-2 focus:ring-pink-500 focus:border-transparent placeholder-pink-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-100 mb-2">
                    Método de Pagamento *
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    className="p-3 border border-pink-600 bg-pink-700 text-white rounded-lg w-full focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  >
                    <option value="pix" className="bg-pink-700">PIX</option>
                    <option value="credit_card" className="bg-pink-700">Cartão de Crédito</option>
                    <option value="debit_card" className="bg-pink-700">Cartão de Débito</option>
                    <option value="cash" className="bg-pink-700">Dinheiro</option>
                    <option value="bank_transfer" className="bg-pink-700">Transferência Bancária</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-pink-100 mb-2">
                    Data do Primeiro Pagamento *
                  </label>
                  <input
                    type="date"
                    name="firstPaymentDate"
                    value={formData.firstPaymentDate}
                    onChange={handleInputChange}
                    className="p-3 border border-pink-600 bg-pink-700 text-white rounded-lg w-full focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* Preview das Parcelas */}
              {calculatedInstallments.length > 0 && (
                <div className="bg-pink-700 p-4 rounded-lg border border-pink-600">
                  <h4 className="font-medium text-pink-100 mb-3">Preview das Parcelas:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {calculatedInstallments.map(installment => (
                      <div key={installment.number} className="bg-pink-800 p-3 rounded border border-pink-600">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-white">Parcela {installment.number}</span>
                          <span className="text-green-400 font-bold">{formatCurrency(installment.value)}</span>
                        </div>
                        <div className="text-sm text-pink-300 mt-1">
                          Vencimento: {formatDate(installment.dueDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white p-3 rounded-lg hover:from-green-600 hover:to-green-700 disabled:opacity-50 font-medium transition-all shadow-lg"
              >
                {isLoading ? 'Registrando...' : 'Registrar Pagamento'}
              </button>
            </form>
          ) : activeTab === "pending" ? (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4">
                Pagamentos Pendentes ({pendingInstallments.length} parcelas)
              </h3>
              
              {groupedInstallments.length === 0 ? (
                <div className="text-center py-8 text-pink-200">
                  <DollarSign size={48} className="mx-auto mb-4 text-pink-300" />
                  <p>Nenhuma parcela pendente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupedInstallments.map((patientGroup) => (
                    <div key={patientGroup.patientId} className="bg-pink-700 rounded-lg border border-pink-600 shadow-lg">
                      {/* Cabeçalho do Paciente */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-pink-600 transition-colors rounded-lg"
                        onClick={() => togglePatientExpanded(patientGroup.patientId)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-3">
                            {patientGroup.isExpanded ? (
                              <ChevronUp size={20} className="text-pink-200" />
                            ) : (
                              <ChevronDown size={20} className="text-pink-200" />
                            )}
                            <div>
                              <h4 className="font-semibold text-white">{patientGroup.patientName}</h4>
                              <p className="text-sm text-pink-200">
                                {patientGroup.installments.length} parcela(s) pendente(s)
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-400">
                              {formatCurrency(patientGroup.totalPending)}
                            </p>
                            <p className="text-sm text-pink-200">Total pendente</p>
                          </div>
                        </div>
                      </div>

                      {/* Parcelas Expandidas */}
                      {patientGroup.isExpanded && (
                        <div className="border-t border-pink-600">
                          {patientGroup.installments.map((installment) => {
                            const procedure = patientGroup.procedures[installment.procedure_id];
                            return (
                              <div key={installment.id} className="p-4 bg-pink-600 border-b border-pink-500 last:border-b-0">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-medium text-white">{procedure?.procedure_type}</p>
                                    <p className="text-sm text-pink-200">
                                      Parcela {installment.installment_number} de {procedure?.total_installments}
                                    </p>
                                  </div>
                                  <span className="text-lg font-bold text-green-400">
                                    {formatCurrency(installment.installment_value)}
                                  </span>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                                  <div>
                                    <span className="text-pink-200">Vencimento:</span>
                                    <p className="font-medium text-white">{formatDate(installment.due_date)}</p>
                                  </div>
                                  <div>
                                    <span className="text-pink-200">Método Original:</span>
                                    <div className="flex items-center space-x-2">
                                      <p className="font-medium text-white capitalize">{getPaymentMethodText(procedure?.payment_method || '')}</p>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (procedure) openEditMethodModal(procedure);
                                        }}
                                        className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                                        title="Editar método de pagamento"
                                      >
                                        <Edit size={14} />
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-pink-200">Status:</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(installment.status)}`}>
                                      {installment.status}
                                    </span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="text-pink-200">Ações:</span>
                                    <div className="flex space-x-2 mt-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openPaymentModal(installment);
                                        }}
                                        className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-3 rounded-lg hover:from-green-600 hover:to-green-700 font-medium text-xs transition-all shadow"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="ios-card p-6 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                      <p className="text-sm text-green-100">Total Faturado</p>
                    </div>
                    <DollarSign className="text-white" size={30} />
                  </div>
                </div>

                <div className="ios-card p-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{completedInstallments.length}</p>
                      <p className="text-sm text-blue-100">Parcelas Pagas</p>
                    </div>
                    <CheckCircle className="text-white" size={30} />
                  </div>
                </div>

                <div className="ios-card p-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold text-white">{monthlyRevenue.length}</p>
                      <p className="text-sm text-purple-100">Meses com Faturamento</p>
                    </div>
                    <BarChart3 className="text-white" size={30} />
                  </div>
                </div>
              </div>

              <div className="ios-card p-6 bg-gradient-to-r from-pink-700 to-pink-800 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-white mb-4">Faturamento Mensal</h3>
                {monthlyRevenue.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {monthlyRevenue.map((item, index) => {
                        const percentage = (item.total / getMaxRevenue()) * 100;
                        return (
                          <div key={index} className="bg-pink-600 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-white">{item.month}</span>
                              <span className="font-bold text-green-400">{formatCurrency(item.total)}</span>
                            </div>
                            <div className="w-full bg-pink-500 rounded-full h-3">
                              <div
                                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                                style={{ width: `${Math.max(10, percentage)}%` }}
                              />
                            </div>
                            <p className="text-xs text-pink-200 mt-1 text-center">
                              {formatCurrency(item.total)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-pink-200">
                    <BarChart3 size={48} className="mx-auto mb-4 text-pink-300" />
                    <p>Nenhum dado de faturamento disponível</p>
                  </div>
                )}
              </div>

              <div className="ios-card p-6 bg-gradient-to-r from-pink-700 to-pink-800 rounded-lg shadow-lg">
                <h3 className="text-xl font-bold text-white mb-4">Pagamentos Realizados</h3>
                {completedInstallments.length === 0 ? (
                  <div className="text-center py-8 text-pink-200">
                    <DollarSign size={48} className="mx-auto mb-4 text-pink-300" />
                    <p>Nenhum pagamento realizado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedInstallments.map(installment => {
                      const procedure = payments.find(p => p.id === installment.procedure_id);
                      const paymentMethod = installment.payment_method || procedure?.payment_method || 'Não informado';
                      
                      return (
                        <div key={installment.id} className="bg-green-600 p-4 rounded-lg border border-green-500">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="font-semibold text-white">{procedure?.client_name}</h4>
                              <p className="text-sm text-green-200">{procedure?.procedure_type}</p>
                            </div>
                            <span className="text-lg font-bold text-white">
                              {formatCurrency(installment.installment_value)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-green-200">Parcela:</span>
                              <p className="font-medium text-white">{installment.installment_number}/{procedure?.total_installments}</p>
                            </div>
                            <div>
                              <span className="text-green-200">Data do Pagamento:</span>
                              <p className="font-medium text-white">{installment.paid_date ? formatDate(installment.paid_date) : 'N/A'}</p>
                            </div>
                            <div>
                              <span className="text-green-200">Método Utilizado:</span>
                              <p className="font-medium text-white capitalize">{getPaymentMethodText(paymentMethod)}</p>
                            </div>
                            <div>
                              <span className="text-green-200">Status:</span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500 text-white">
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
      </div>

      {/* Adicione a BottomNavigation aqui */}
      <BottomNavigation />

      {/* Modal de Confirmação de Pagamento */}
      {paymentModal.isOpen && paymentModal.installment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="ios-card bg-gradient-to-r from-pink-800 to-rose-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Confirmar Pagamento</h3>
              <button
                onClick={closePaymentModal}
                className="text-pink-200 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-pink-200 mb-2">
                Valor: <span className="font-bold text-green-400">
                  {formatCurrency(paymentModal.installment.installment_value)}
                </span>
              </p>
              <p className="text-pink-200">
                Paciente: <span className="font-medium text-white">
                  {payments.find(p => p.id === paymentModal.installment?.procedure_id)?.client_name}
                </span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-pink-100 mb-2">
                Método de Pagamento Utilizado *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePaymentMethodChange("pix")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    paymentModal.selectedMethod === "pix"
                      ? "border-green-500 bg-green-600 text-white"
                      : "border-pink-600 text-pink-200 hover:bg-pink-700"
                  }`}
                >
                  PIX
                </button>
                <button
                  onClick={() => handlePaymentMethodChange("cash")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    paymentModal.selectedMethod === "cash"
                      ? "border-green-500 bg-green-600 text-white"
                      : "border-pink-600 text-pink-200 hover:bg-pink-700"
                  }`}
                >
                  Dinheiro
                </button>
                <button
                  onClick={() => handlePaymentMethodChange("credit_card")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    paymentModal.selectedMethod === "credit_card"
                      ? "border-green-500 bg-green-600 text-white"
                      : "border-pink-600 text-pink-200 hover:bg-pink-700"
                  }`}
                >
                  Cartão Crédito
                </button>
                <button
                  onClick={() => handlePaymentMethodChange("debit_card")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    paymentModal.selectedMethod === "debit_card"
                      ? "border-green-500 bg-green-600 text-white"
                      : "border-pink-600 text-pink-200 hover:bg-pink-700"
                  }`}
                >
                  Cartão Débito
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closePaymentModal}
                className="flex-1 bg-pink-700 text-white py-2 px-4 rounded-lg hover:bg-pink-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPayment}
                className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-colors"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Método de Pagamento */}
      {editMethodModal.isOpen && editMethodModal.procedure && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="ios-card bg-gradient-to-r from-pink-800 to-rose-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Editar Método de Pagamento</h3>
              <button
                onClick={closeEditMethodModal}
                className="text-pink-200 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-pink-200 mb-2">
                Paciente: <span className="font-medium text-white">{editMethodModal.procedure.client_name}</span>
              </p>
              <p className="text-pink-200">
                Procedimento: <span className="font-medium text-white">{editMethodModal.procedure.procedure_type}</span>
              </p>
              <p className="text-pink-200 mt-2">
                Valor Total: <span className="font-bold text-green-400">
                  {formatCurrency(editMethodModal.procedure.total_amount)}
                </span>
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-pink-100 mb-2">
                Método de Pagamento *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleEditMethodChange("pix")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    editMethodModal.selectedMethod === "pix"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-pink-600 text-pink-200 hover:bg-pink-700"
                  }`}
                >
                  PIX
                </button>
                <button
                  onClick={() => handleEditMethodChange("cash")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    editMethodModal.selectedMethod === "cash"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-pink-600 text-pink-200 hover:bg-pink-700"
                  }`}
                >
                  Dinheiro
                </button>
                <button
                  onClick={() => handleEditMethodChange("credit_card")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    editMethodModal.selectedMethod === "credit_card"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-pink-600 text-pink-200 hover:bg-pink-700"
                  }`}
                >
                  Cartão Crédito
                </button>
                <button
                  onClick={() => handleEditMethodChange("debit_card")}
                  className={`p-3 border rounded-lg text-center transition-colors ${
                    editMethodModal.selectedMethod === "debit_card"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-pink-600 text-pink-200 hover:bg-pink-700"
                  }`}
                >
                  Cartão Débito
                </button>
                <button
                  onClick={() => handleEditMethodChange("bank_transfer")}
                  className={`p-3 border rounded-lg text-center transition-colors col-span-2 ${
                    editMethodModal.selectedMethod === "bank_transfer"
                      ? "border-blue-500 bg-blue-600 text-white"
                      : "border-pink-600 text-pink-200 hover:bg-pink-700"
                  }`}
                >
                  Transferência Bancária
                </button>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={closeEditMethodModal}
                className="flex-1 bg-pink-700 text-white py-2 px-4 rounded-lg hover:bg-pink-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={updatePaymentMethod}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialControl;