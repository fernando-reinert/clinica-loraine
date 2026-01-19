import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/screens/FinancialControl.tsx
import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "../contexts/SupabaseContext";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Search, DollarSign, ChevronDown, ChevronUp, X, Edit, ArrowLeft, CheckCircle, BarChart3, Sparkles, } from "lucide-react";
import AppLayout from "../components/Layout/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
const FinancialControl = () => {
    const { supabase } = useSupabase();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        patientId: "",
        patientName: "",
        procedureType: "",
        totalAmount: 0,
        installments: 1,
        paymentMethod: "pix",
        firstPaymentDate: new Date().toISOString().split("T")[0],
    });
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [payments, setPayments] = useState([]);
    const [installments, setInstallments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [activeTab, setActiveTab] = useState("new");
    const [calculatedInstallments, setCalculatedInstallments] = useState([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState([]);
    const [groupedInstallments, setGroupedInstallments] = useState([]);
    const [paymentModal, setPaymentModal] = useState({
        isOpen: false,
        installment: null,
        selectedMethod: "pix",
    });
    const [editMethodModal, setEditMethodModal] = useState({
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
            const filtered = patients.filter((patient) => patient.name.toLowerCase().includes(formData.patientName.toLowerCase()));
            setFilteredPatients(filtered);
            setShowPatientDropdown(true);
        }
        else {
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
            if (error)
                throw error;
            setPatients((data || []));
        }
        catch (error) {
            console.error("Erro ao carregar pacientes:", error);
            toast.error("Erro ao carregar pacientes");
        }
    };
    const fetchPayments = async () => {
        try {
            const { data, error } = await supabase.from("procedures").select("*").order("created_at", { ascending: false });
            if (error)
                throw error;
            const procedures = data || [];
            setPayments(procedures);
            if (procedures.length > 0) {
                const { data: installmentsData, error: installmentsError } = await supabase
                    .from("installments")
                    .select("*")
                    .in("procedure_id", procedures.map((p) => p.id));
                if (!installmentsError) {
                    setInstallments((installmentsData || []));
                }
            }
            else {
                setInstallments([]);
            }
        }
        catch (error) {
            toast.error("Erro ao carregar pagamentos!");
        }
    };
    const calculateMonthlyRevenue = () => {
        const paidInstallments = installments.filter((i) => i.status === "pago" && i.paid_date);
        const revenueByMonth = {};
        paidInstallments.forEach((installment) => {
            if (installment.paid_date) {
                const date = new Date(installment.paid_date);
                const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}`;
                if (!revenueByMonth[monthYear])
                    revenueByMonth[monthYear] = 0;
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
        const grouped = {};
        pending.forEach((installment) => {
            const procedure = payments.find((p) => p.id === installment.procedure_id);
            if (!procedure)
                return;
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
        setGroupedInstallments(Object.values(grouped).sort((a, b) => a.patientName.localeCompare(b.patientName)));
    };
    const togglePatientExpanded = (patientId) => {
        setGroupedInstallments((prev) => prev.map((item) => (item.patientId === patientId ? { ...item, isExpanded: !item.isExpanded } : item)));
    };
    const openPaymentModal = (installment) => {
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
    const openEditMethodModal = (procedure) => {
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
    const handlePaymentMethodChange = (method) => {
        setPaymentModal((prev) => ({ ...prev, selectedMethod: method }));
    };
    const handleEditMethodChange = (method) => {
        setEditMethodModal((prev) => ({ ...prev, selectedMethod: method }));
    };
    const confirmPayment = async () => {
        if (!paymentModal.installment)
            return;
        try {
            const updateData = {
                status: "pago",
                paid_date: new Date().toISOString().split("T")[0],
                payment_method: paymentModal.selectedMethod,
            };
            const { error } = await supabase.from("installments").update(updateData).eq("id", paymentModal.installment.id);
            if (error)
                throw error;
            toast.success("Parcela marcada como paga!");
            fetchPayments();
            closePaymentModal();
        }
        catch (error) {
            toast.error("Erro ao atualizar parcela!");
        }
    };
    const updatePaymentMethod = async () => {
        if (!editMethodModal.procedure)
            return;
        try {
            const { error } = await supabase
                .from("procedures")
                .update({ payment_method: editMethodModal.selectedMethod })
                .eq("id", editMethodModal.procedure.id);
            if (error)
                throw error;
            const { error: installmentsError } = await supabase
                .from("installments")
                .update({ payment_method: editMethodModal.selectedMethod })
                .eq("procedure_id", editMethodModal.procedure.id)
                .eq("status", "pendente");
            if (installmentsError)
                throw installmentsError;
            toast.success("Método de pagamento atualizado com sucesso!");
            fetchPayments();
            closeEditMethodModal();
        }
        catch (error) {
            toast.error("Erro ao atualizar método de pagamento!");
        }
    };
    const getMaxRevenue = () => {
        if (monthlyRevenue.length === 0)
            return 0;
        return Math.max(...monthlyRevenue.map((item) => item.total));
    };
    const handlePatientSelect = (patient) => {
        setFormData({
            ...formData,
            patientId: patient.id,
            patientName: patient.name,
        });
        setShowPatientDropdown(false);
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: name === "totalAmount" || name === "installments" ? Number(value) : value,
        }));
    };
    const calculateInstallments = () => {
        if (formData.totalAmount > 0 && formData.installments > 0) {
            const installmentValue = formData.totalAmount / formData.installments;
            const list = [];
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
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { patientId, patientName, procedureType, totalAmount, installments: instCount, paymentMethod, firstPaymentDate } = formData;
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
            if (error)
                throw error;
            const procedureData = data || [];
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
        }
        catch (error) {
            console.error("Erro ao salvar pagamento:", error);
            toast.error("Erro ao registrar pagamento!");
        }
        finally {
            setIsLoading(false);
        }
    };
    const formatCurrency = (value) => {
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("pt-BR");
    };
    const getStatusColor = (status) => {
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
    const getPaymentMethodText = (method) => {
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
    const totalRevenue = useMemo(() => completedInstallments.reduce((sum, installment) => sum + installment.installment_value, 0), [completedInstallments]);
    if (loadingData) {
        return (_jsx(AppLayout, { title: "Controle Financeiro", children: _jsx("div", { className: "flex items-center justify-center h-96", children: _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "relative", children: [_jsx(LoadingSpinner, { size: "lg", className: "text-blue-500" }), _jsx(Sparkles, { className: "absolute -top-2 -right-2 text-purple-500 animate-pulse", size: 20 })] }), _jsx("p", { className: "mt-4 text-gray-300", children: "Carregando financeiro..." })] }) }) }));
    }
    return (_jsx(AppLayout, { title: "Controle Financeiro", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "glass-card p-6 relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" }), _jsxs("div", { className: "relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("button", { onClick: () => navigate(-1), className: "p-3 bg-white/5 hover:bg-white/10 rounded-2xl backdrop-blur-sm transition-all duration-300 border border-white/10", children: _jsx(ArrowLeft, { size: 18, className: "text-white" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("h2", { className: "text-2xl font-bold glow-text", children: "Controle Financeiro" }), _jsx("p", { className: "text-gray-300", children: "Gerencie pagamentos e receitas" })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("button", { onClick: () => setActiveTab("new"), className: `px-4 py-2 rounded-xl border transition-all ${activeTab === "new"
                                                ? "bg-blue-500/20 text-white border-blue-400/30"
                                                : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"}`, children: "Novo Registro" }), _jsxs("button", { onClick: () => setActiveTab("pending"), className: `px-4 py-2 rounded-xl border transition-all ${activeTab === "pending"
                                                ? "bg-blue-500/20 text-white border-blue-400/30"
                                                : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"}`, children: ["Pendentes (", pendingInstallments.length, ")"] }), _jsxs("button", { onClick: () => setActiveTab("completed"), className: `px-4 py-2 rounded-xl border transition-all ${activeTab === "completed"
                                                ? "bg-blue-500/20 text-white border-blue-400/30"
                                                : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"}`, children: ["Realizados (", completedInstallments.length, ")"] })] })] })] }), _jsx("div", { className: "glass-card p-6 border border-white/10", children: activeTab === "new" ? (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "relative", children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Paciente *" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", size: 20 }), _jsx("input", { type: "text", name: "patientName", value: formData.patientName, onChange: handleInputChange, placeholder: "Buscar paciente...", className: "pl-10 px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none", required: true }), showPatientDropdown && filteredPatients.length > 0 && (_jsx("div", { className: "absolute z-10 w-full mt-2 rounded-xl overflow-hidden border border-white/10 bg-gray-900/90 backdrop-blur-sm max-h-60 overflow-y-auto", children: filteredPatients.map((patient) => (_jsxs("button", { type: "button", onClick: () => handlePatientSelect(patient), className: "w-full text-left p-3 hover:bg-white/10 transition-all border-b border-white/10 last:border-b-0", children: [_jsx("div", { className: "font-medium text-white", children: patient.name }), _jsx("div", { className: "text-sm text-gray-300", children: patient.phone })] }, patient.id))) }))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Procedimento *" }), _jsx("input", { type: "text", name: "procedureType", value: formData.procedureType, onChange: handleInputChange, placeholder: "Ex: Botox, Preenchimento...", className: "px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Valor Total (R$) *" }), _jsx("input", { type: "number", name: "totalAmount", value: formData.totalAmount, onChange: handleInputChange, placeholder: "0,00", min: "0", step: "0.01", className: "px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "N\u00FAmero de Parcelas *" }), _jsx("input", { type: "number", name: "installments", value: formData.installments, onChange: handleInputChange, min: "1", className: "px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "M\u00E9todo de Pagamento *" }), _jsxs("select", { name: "paymentMethod", value: formData.paymentMethod, onChange: handleInputChange, className: "px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none", required: true, children: [_jsx("option", { value: "pix", className: "text-black", children: "PIX" }), _jsx("option", { value: "credit_card", className: "text-black", children: "Cart\u00E3o de Cr\u00E9dito" }), _jsx("option", { value: "debit_card", className: "text-black", children: "Cart\u00E3o de D\u00E9bito" }), _jsx("option", { value: "cash", className: "text-black", children: "Dinheiro" }), _jsx("option", { value: "bank_transfer", className: "text-black", children: "Transfer\u00EAncia Banc\u00E1ria" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Data do Primeiro Pagamento *" }), _jsx("input", { type: "date", name: "firstPaymentDate", value: formData.firstPaymentDate, onChange: handleInputChange, className: "px-4 py-3 rounded-xl w-full bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none", required: true })] })] }), calculatedInstallments.length > 0 && (_jsxs("div", { className: "glass-card p-4 border border-white/10 bg-white/5", children: [_jsx("h4", { className: "font-semibold text-white mb-3", children: "Preview das Parcelas" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3", children: calculatedInstallments.map((inst) => (_jsxs("div", { className: "glass-card p-4 border border-white/10", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("span", { className: "font-semibold text-white", children: ["Parcela ", inst.number] }), _jsx("span", { className: "text-green-300 font-bold", children: formatCurrency(inst.value) })] }), _jsxs("div", { className: "text-sm text-gray-300 mt-1", children: ["Vencimento: ", formatDate(inst.dueDate)] })] }, inst.number))) })] })), _jsx("button", { type: "submit", disabled: isLoading, className: "w-full neon-button", children: isLoading ? "Registrando..." : "Registrar Pagamento" })] })) : activeTab === "pending" ? (_jsxs("div", { className: "space-y-4", children: [_jsxs("h3", { className: "text-xl font-bold glow-text", children: ["Pagamentos Pendentes (", pendingInstallments.length, " parcelas)"] }), groupedInstallments.length === 0 ? (_jsxs("div", { className: "text-center py-10 text-gray-300", children: [_jsx(DollarSign, { size: 48, className: "mx-auto mb-4 text-gray-400" }), _jsx("p", { children: "Nenhuma parcela pendente" })] })) : (_jsx("div", { className: "space-y-3", children: groupedInstallments.map((patientGroup) => (_jsxs("div", { className: "glass-card border border-white/10 overflow-hidden", children: [_jsx("button", { type: "button", className: "w-full p-4 text-left hover:bg-white/5 transition-all", onClick: () => togglePatientExpanded(patientGroup.patientId), children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsxs("div", { className: "flex items-center gap-3", children: [patientGroup.isExpanded ? (_jsx(ChevronUp, { size: 20, className: "text-gray-300" })) : (_jsx(ChevronDown, { size: 20, className: "text-gray-300" })), _jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-white", children: patientGroup.patientName }), _jsxs("p", { className: "text-sm text-gray-300", children: [patientGroup.installments.length, " parcela(s) pendente(s)"] })] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-lg font-bold text-green-300", children: formatCurrency(patientGroup.totalPending) }), _jsx("p", { className: "text-sm text-gray-300", children: "Total pendente" })] })] }) }), patientGroup.isExpanded && (_jsx("div", { className: "border-t border-white/10", children: patientGroup.installments.map((inst) => {
                                                const procedure = patientGroup.procedures[inst.procedure_id];
                                                return (_jsxs("div", { className: "p-4 border-b border-white/10 last:border-b-0 bg-white/5", children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { children: [_jsx("p", { className: "font-semibold text-white", children: procedure?.procedure_type }), _jsxs("p", { className: "text-sm text-gray-300", children: ["Parcela ", inst.installment_number, " de ", procedure?.total_installments] })] }), _jsx("span", { className: "text-lg font-bold text-green-300", children: formatCurrency(inst.installment_value) })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-300", children: "Vencimento:" }), _jsx("p", { className: "font-medium text-white", children: formatDate(inst.due_date) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-300", children: "M\u00E9todo Original:" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-medium text-white", children: getPaymentMethodText(procedure?.payment_method || "") }), _jsx("button", { type: "button", onClick: (e) => {
                                                                                        e.stopPropagation();
                                                                                        if (procedure)
                                                                                            openEditMethodModal(procedure);
                                                                                    }, className: "p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all", title: "Editar m\u00E9todo de pagamento", children: _jsx(Edit, { size: 14, className: "text-cyan-300" }) })] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-300", children: "Status:" }), _jsx("span", { className: `inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inst.status)}`, children: inst.status })] }), _jsxs("div", { className: "md:col-span-2", children: [_jsx("span", { className: "text-gray-300", children: "A\u00E7\u00F5es:" }), _jsx("div", { className: "flex gap-2 mt-1", children: _jsx("button", { type: "button", onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    openPaymentModal(inst);
                                                                                }, className: "w-full neon-button", children: "Registrar Pagamento" }) })] })] })] }, inst.id));
                                            }) }))] }, patientGroup.patientId))) }))] })) : (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsx("div", { className: "glass-card p-6 hover-lift border border-white/10", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-3xl font-bold text-white", children: formatCurrency(totalRevenue) }), _jsx("p", { className: "text-sm text-gray-300", children: "Total Faturado" })] }), _jsx(DollarSign, { className: "text-green-300", size: 30 })] }) }), _jsx("div", { className: "glass-card p-6 hover-lift border border-white/10", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-3xl font-bold text-white", children: completedInstallments.length }), _jsx("p", { className: "text-sm text-gray-300", children: "Parcelas Pagas" })] }), _jsx(CheckCircle, { className: "text-cyan-300", size: 30 })] }) }), _jsx("div", { className: "glass-card p-6 hover-lift border border-white/10", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-3xl font-bold text-white", children: monthlyRevenue.length }), _jsx("p", { className: "text-sm text-gray-300", children: "Meses com Faturamento" })] }), _jsx(BarChart3, { className: "text-purple-300", size: 30 })] }) })] }), _jsxs("div", { className: "glass-card p-6 border border-white/10", children: [_jsx("h3", { className: "text-xl font-bold glow-text mb-4", children: "Faturamento Mensal" }), monthlyRevenue.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: monthlyRevenue.map((item, index) => {
                                            const percentage = getMaxRevenue() > 0 ? (item.total / getMaxRevenue()) * 100 : 0;
                                            return (_jsxs("div", { className: "glass-card p-4 border border-white/10", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsx("span", { className: "font-medium text-white", children: item.month }), _jsx("span", { className: "font-bold text-green-300", children: formatCurrency(item.total) })] }), _jsx("div", { className: "w-full bg-white/10 rounded-full h-3", children: _jsx("div", { className: "bg-gradient-to-r from-green-500 to-cyan-500 h-3 rounded-full transition-all duration-300", style: { width: `${Math.max(10, percentage)}%` } }) }), _jsx("p", { className: "text-xs text-gray-300 mt-2 text-center", children: formatCurrency(item.total) })] }, index));
                                        }) })) : (_jsxs("div", { className: "text-center py-10 text-gray-300", children: [_jsx(BarChart3, { size: 48, className: "mx-auto mb-4 text-gray-400" }), _jsx("p", { children: "Nenhum dado de faturamento dispon\u00EDvel" })] }))] }), _jsxs("div", { className: "glass-card p-6 border border-white/10", children: [_jsx("h3", { className: "text-xl font-bold glow-text mb-4", children: "Pagamentos Realizados" }), completedInstallments.length === 0 ? (_jsxs("div", { className: "text-center py-10 text-gray-300", children: [_jsx(DollarSign, { size: 48, className: "mx-auto mb-4 text-gray-400" }), _jsx("p", { children: "Nenhum pagamento realizado" })] })) : (_jsx("div", { className: "space-y-3", children: completedInstallments.map((inst) => {
                                            const procedure = payments.find((p) => p.id === inst.procedure_id);
                                            const paymentMethod = inst.payment_method || procedure?.payment_method || "Não informado";
                                            return (_jsxs("div", { className: "glass-card p-4 border border-green-400/20 bg-green-500/10", children: [_jsxs("div", { className: "flex justify-between items-start mb-3", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold text-white", children: procedure?.client_name }), _jsx("p", { className: "text-sm text-gray-300", children: procedure?.procedure_type })] }), _jsx("span", { className: "text-lg font-bold text-white", children: formatCurrency(inst.installment_value) })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-300", children: "Parcela:" }), _jsxs("p", { className: "font-medium text-white", children: [inst.installment_number, "/", procedure?.total_installments] })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-300", children: "Data do Pagamento:" }), _jsx("p", { className: "font-medium text-white", children: inst.paid_date ? formatDate(inst.paid_date) : "N/A" })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-300", children: "M\u00E9todo Utilizado:" }), _jsx("p", { className: "font-medium text-white", children: getPaymentMethodText(paymentMethod) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-300", children: "Status:" }), _jsx("span", { className: "inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-100 border border-green-400/30", children: "Pago" })] })] })] }, inst.id));
                                        }) }))] })] })) }), paymentModal.isOpen && paymentModal.installment && (_jsx("div", { className: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "glass-card p-6 max-w-md w-full border border-white/10", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Confirmar Pagamento" }), _jsx("button", { onClick: closePaymentModal, className: "p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all", children: _jsx(X, { size: 18, className: "text-white" }) })] }), _jsxs("div", { className: "mb-4", children: [_jsxs("p", { className: "text-gray-300 mb-2", children: ["Valor:", " ", _jsx("span", { className: "font-bold text-green-300", children: formatCurrency(paymentModal.installment.installment_value) })] }), _jsxs("p", { className: "text-gray-300", children: ["Paciente:", " ", _jsx("span", { className: "font-medium text-white", children: payments.find((p) => p.id === paymentModal.installment?.procedure_id)?.client_name })] })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "M\u00E9todo de Pagamento Utilizado *" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: [
                                            { key: "pix", label: "PIX" },
                                            { key: "cash", label: "Dinheiro" },
                                            { key: "credit_card", label: "Cartão Crédito" },
                                            { key: "debit_card", label: "Cartão Débito" },
                                        ].map((m) => (_jsx("button", { type: "button", onClick: () => handlePaymentMethodChange(m.key), className: `p-3 rounded-xl border text-center transition-all ${paymentModal.selectedMethod === m.key
                                                ? "bg-green-500/20 text-green-100 border-green-400/30"
                                                : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"}`, children: m.label }, m.key))) })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: closePaymentModal, className: "flex-1 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all", children: "Cancelar" }), _jsx("button", { type: "button", onClick: confirmPayment, className: "flex-1 neon-button", children: "Confirmar Pagamento" })] })] }) })), editMethodModal.isOpen && editMethodModal.procedure && (_jsx("div", { className: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "glass-card p-6 max-w-md w-full border border-white/10", children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-white", children: "Editar M\u00E9todo de Pagamento" }), _jsx("button", { onClick: closeEditMethodModal, className: "p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all", children: _jsx(X, { size: 18, className: "text-white" }) })] }), _jsxs("div", { className: "mb-4 text-gray-300 space-y-1", children: [_jsxs("p", { children: ["Paciente: ", _jsx("span", { className: "font-medium text-white", children: editMethodModal.procedure.client_name })] }), _jsxs("p", { children: ["Procedimento: ", _jsx("span", { className: "font-medium text-white", children: editMethodModal.procedure.procedure_type })] }), _jsxs("p", { children: ["Valor Total:", " ", _jsx("span", { className: "font-bold text-green-300", children: formatCurrency(editMethodModal.procedure.total_amount) })] })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "M\u00E9todo de Pagamento *" }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: [
                                            { key: "pix", label: "PIX" },
                                            { key: "cash", label: "Dinheiro" },
                                            { key: "credit_card", label: "Cartão Crédito" },
                                            { key: "debit_card", label: "Cartão Débito" },
                                            { key: "bank_transfer", label: "Transferência Bancária", colSpan: 2 },
                                        ].map((m) => (_jsx("button", { type: "button", onClick: () => handleEditMethodChange(m.key), className: `p-3 rounded-xl border text-center transition-all ${m.colSpan ? "col-span-2" : ""} ${editMethodModal.selectedMethod === m.key
                                                ? "bg-blue-500/20 text-blue-100 border-blue-400/30"
                                                : "bg-white/5 text-gray-200 border-white/10 hover:bg-white/10"}`, children: m.label }, m.key))) })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { type: "button", onClick: closeEditMethodModal, className: "flex-1 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all", children: "Cancelar" }), _jsx("button", { type: "button", onClick: updatePaymentMethod, className: "flex-1 neon-button", children: "Salvar Altera\u00E7\u00F5es" })] })] }) }))] }) }));
};
export default FinancialControl;
