import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/screens/AppointmentsScreen.tsx
import { useState, useEffect } from "react";
import { supabase } from "../services/supabase/client";
import { Calendar, Clock, User, Search, DollarSign, Edit, Trash2, Filter, ChevronDown, ChevronUp, Plus, Sparkles, Zap, Stethoscope, } from "lucide-react";
import AppLayout from "../components/Layout/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { convertToSupabaseFormat, convertToBrazilianFormat } from "../utils/dateUtils";
import { useNavigate } from "react-router-dom";
const AppointmentsScreen = () => {
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState([]);
    const [filteredAppointments, setFilteredAppointments] = useState([]);
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showPatientDropdown, setShowPatientDropdown] = useState(false);
    const [patientSearch, setPatientSearch] = useState("");
    const [startTime, setStartTime] = useState("");
    const [description, setDescription] = useState("");
    const [title, setTitle] = useState("");
    const [budget, setBudget] = useState("");
    const [loading, setLoading] = useState(true);
    const [patientsLoading, setPatientsLoading] = useState(false);
    const [editingAppointment, setEditingAppointment] = useState(null);
    const [filter, setFilter] = useState("upcoming");
    const [sortOrder, setSortOrder] = useState("asc");
    useEffect(() => {
        loadAppointments();
        loadPatients();
    }, []);
    useEffect(() => {
        filterAndSortAppointments();
    }, [appointments, filter, sortOrder]);
    useEffect(() => {
        if (patientSearch) {
            const filtered = patients.filter((patient) => patient.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
                patient.phone.includes(patientSearch));
            setFilteredPatients(filtered);
            setShowPatientDropdown(true);
        }
        else {
            setFilteredPatients([]);
            setShowPatientDropdown(false);
        }
    }, [patientSearch, patients]);
    const loadAppointments = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from("appointments").select("*").order("start_time", { ascending: true });
            if (error)
                throw error;
            const formattedAppointments = data?.map((appointment) => ({
                id: appointment.id,
                patient_name: appointment.patient_name,
                patient_phone: appointment.patient_phone,
                start_time: appointment.start_time,
                description: appointment.description,
                title: appointment.title,
                status: appointment.status,
                budget: appointment.budget,
            })) || [];
            setAppointments(formattedAppointments);
            setFilteredAppointments(formattedAppointments);
        }
        catch (error) {
            console.error("Erro ao carregar agendamentos:", error);
        }
        finally {
            setLoading(false);
        }
    };
    const loadPatients = async () => {
        try {
            setPatientsLoading(true);
            const { data, error } = await supabase.from("patients").select("id, name, phone, email").order("name", { ascending: true });
            if (error)
                throw error;
            setPatients(data || []);
        }
        catch (error) {
            console.error("Erro ao carregar pacientes:", error);
        }
        finally {
            setPatientsLoading(false);
        }
    };
    const filterAndSortAppointments = () => {
        const now = new Date();
        let filtered = appointments.filter((appointment) => {
            const appointmentDate = new Date(appointment.start_time);
            switch (filter) {
                case "upcoming":
                    return appointmentDate >= now;
                case "past":
                    return appointmentDate < now;
                default:
                    return true;
            }
        });
        filtered.sort((a, b) => {
            const dateA = new Date(a.start_time);
            const dateB = new Date(b.start_time);
            return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
        });
        setFilteredAppointments(filtered);
    };
    const handlePatientSelect = (patient) => {
        setSelectedPatient(patient);
        setPatientSearch(patient.name);
        setShowPatientDropdown(false);
    };
    const clearPatientSelection = () => {
        setSelectedPatient(null);
        setPatientSearch("");
    };
    const clearForm = () => {
        setSelectedPatient(null);
        setPatientSearch("");
        setTitle("");
        setStartTime("");
        setDescription("");
        setBudget("");
    };
    const startEdit = (appointment) => {
        setEditingAppointment(appointment);
        setSelectedPatient({
            id: "",
            name: appointment.patient_name,
            phone: appointment.patient_phone,
        });
        setPatientSearch(appointment.patient_name);
        setTitle(appointment.title);
        setStartTime(appointment.start_time.slice(0, 16));
        setDescription(appointment.description || "");
        setBudget(appointment.budget?.toString() || "");
    };
    const cancelEdit = () => {
        setEditingAppointment(null);
        clearForm();
    };
    const createAppointment = async (event) => {
        event.preventDefault();
        if (!selectedPatient || !startTime || !title) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }
        try {
            const isoStartTime = convertToSupabaseFormat(startTime);
            if (!isoStartTime) {
                alert("Data e hora de início inválidos.");
                return;
            }
            const appointmentData = {
                patient_name: selectedPatient.name,
                patient_phone: selectedPatient.phone,
                start_time: isoStartTime,
                title,
                status: "scheduled",
            };
            if (description)
                appointmentData.description = description;
            if (budget) {
                try {
                    appointmentData.budget = parseFloat(budget);
                }
                catch {
                    // ignore
                }
            }
            let error;
            if (editingAppointment) {
                ({ error } = await supabase.from("appointments").update(appointmentData).eq("id", editingAppointment.id));
            }
            else {
                ({ error } = await supabase.from("appointments").insert([appointmentData]));
            }
            if (error)
                throw error;
            alert(editingAppointment ? "Agendamento atualizado com sucesso!" : "Agendamento criado com sucesso!");
            clearForm();
            setEditingAppointment(null);
            loadAppointments();
        }
        catch (error) {
            console.error("Erro ao salvar agendamento:", error);
            alert("Erro ao salvar agendamento.");
        }
    };
    const deleteAppointment = async (appointmentId) => {
        if (!confirm("Tem certeza que deseja excluir este agendamento?"))
            return;
        try {
            const { error } = await supabase.from("appointments").delete().eq("id", appointmentId);
            if (error)
                throw error;
            alert("Agendamento excluído com sucesso!");
            loadAppointments();
        }
        catch (error) {
            console.error("Erro ao excluir agendamento:", error);
            alert("Erro ao excluir agendamento.");
        }
    };
    const updateAppointmentStatus = async (appointmentId, status) => {
        try {
            const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);
            if (error)
                throw error;
            loadAppointments();
        }
        catch (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Erro ao atualizar status do agendamento.");
        }
    };
    const formatCurrency = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
    const isPastAppointment = (appointment) => new Date(appointment.start_time) < new Date();
    if (loading) {
        return (_jsx(AppLayout, { title: "Agendamentos", showBack: true, children: _jsx("div", { className: "flex items-center justify-center h-96", children: _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "relative", children: [_jsx(LoadingSpinner, { size: "lg", className: "text-blue-500" }), _jsx(Sparkles, { className: "absolute -top-2 -right-2 text-purple-500 animate-pulse", size: 20 })] }), _jsx("p", { className: "mt-4 text-gray-300", children: "Carregando universo de agendamentos..." })] }) }) }));
    }
    const total = appointments.length;
    const upcoming = appointments.filter((a) => !isPastAppointment(a)).length;
    const confirmed = appointments.filter((a) => a.status === "confirmed").length;
    return (_jsx(AppLayout, { title: "Agendamentos", showBack: true, children: _jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "glass-card p-8 relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" }), _jsxs("div", { className: "relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-4 mb-4", children: [_jsx("div", { className: "p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30", children: _jsx(Sparkles, { className: "text-blue-300", size: 28 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold glow-text mb-2", children: "Gest\u00E3o de Agendamentos" }), _jsx("p", { className: "text-gray-300 text-lg", children: "Controle completo da agenda da cl\u00EDnica" })] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 max-w-2xl", children: [_jsxs("div", { className: "glass-card p-4 border border-white/10", children: [_jsx("p", { className: "text-2xl font-bold text-white", children: total }), _jsx("p", { className: "text-gray-400 text-sm", children: "Total" })] }), _jsxs("div", { className: "glass-card p-4 border border-white/10", children: [_jsx("p", { className: "text-2xl font-bold text-green-300", children: upcoming }), _jsx("p", { className: "text-gray-400 text-sm", children: "Futuros" })] }), _jsxs("div", { className: "glass-card p-4 border border-white/10", children: [_jsx("p", { className: "text-2xl font-bold text-cyan-300", children: confirmed }), _jsx("p", { className: "text-gray-400 text-sm", children: "Confirmados" })] })] })] }), _jsxs("button", { onClick: () => {
                                        // atalho: focar na criação (scroll top)
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                    }, className: "neon-button group relative overflow-hidden", type: "button", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" }), _jsx(Plus, { size: 22, className: "mr-3 relative z-10" }), _jsx("span", { className: "relative z-10 font-semibold", children: editingAppointment ? "Editando..." : "Novo Agendamento" })] })] })] }), _jsxs("div", { className: "glass-card p-8 border border-white/10", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsx(Calendar, { className: "text-purple-300", size: 26 }), _jsx("h2", { className: "text-2xl font-bold glow-text", children: editingAppointment ? "Editar Agendamento" : "Novo Agendamento" })] }), _jsxs("form", { onSubmit: createAppointment, className: "space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "relative", children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Paciente *" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", size: 20 }), _jsx("input", { type: "text", placeholder: patientsLoading ? "Carregando pacientes..." : "Buscar paciente...", value: patientSearch, onChange: (e) => setPatientSearch(e.target.value), className: "w-full pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", disabled: !!editingAppointment || patientsLoading }), selectedPatient && (_jsx("button", { type: "button", onClick: clearPatientSelection, className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors", disabled: !!editingAppointment, title: "Limpar paciente", children: "\u2715" }))] }), showPatientDropdown && filteredPatients.length > 0 && !editingAppointment && (_jsx("div", { className: "absolute z-20 w-full mt-2 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-64 overflow-y-auto", children: filteredPatients.map((patient) => (_jsxs("button", { type: "button", onClick: () => handlePatientSelect(patient), className: "w-full text-left p-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0", children: [_jsx("div", { className: "font-semibold text-white", children: patient.name }), _jsx("div", { className: "text-sm text-gray-300", children: patient.phone })] }, patient.id))) })), selectedPatient && (_jsx("div", { className: "mt-3 glass-card p-4 border border-cyan-400/20 bg-cyan-500/10", children: _jsxs("p", { className: "text-sm text-cyan-100 font-medium", children: ["\u2705 Paciente selecionado: ", selectedPatient.name, " \u2014 ", selectedPatient.phone] }) }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "T\u00EDtulo do Procedimento *" }), _jsx("input", { type: "text", placeholder: "Ex: Limpeza de Pele, Botox...", value: title, onChange: (e) => setTitle(e.target.value), className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", required: true })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Data e Hora *" }), _jsx("input", { type: "datetime-local", value: startTime, onChange: (e) => setStartTime(e.target.value), className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Or\u00E7amento" }), _jsxs("div", { className: "relative", children: [_jsx(DollarSign, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", size: 20 }), _jsx("input", { type: "number", placeholder: "0,00", value: budget, onChange: (e) => setBudget(e.target.value), min: "0", step: "0.01", className: "w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Descri\u00E7\u00E3o do Procedimento" }), _jsx("textarea", { placeholder: "Detalhes adicionais sobre o procedimento...", value: description, onChange: (e) => setDescription(e.target.value), className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all h-28 resize-none" })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3", children: [_jsxs("button", { type: "submit", className: "neon-button w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl leading-none", children: [_jsx(Plus, { size: 20, className: "shrink-0" }), _jsx("span", { className: "font-semibold whitespace-nowrap", children: editingAppointment ? "Atualizar Agendamento" : "Criar Agendamento" })] }), editingAppointment && (_jsx("button", { type: "button", onClick: cancelEdit, className: "w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all leading-none", children: _jsx("span", { className: "font-semibold whitespace-nowrap", children: "Cancelar" }) }))] }), _jsxs("div", { className: "text-xs text-gray-400 flex items-center gap-2", children: [_jsx(Zap, { size: 14, className: "text-purple-300" }), "Dica: confirme e conclua direto no card do agendamento."] })] })] }), _jsx("div", { className: "glass-card p-6 border border-white/10", children: _jsxs("div", { className: "flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center", children: [_jsx("div", { className: "flex flex-wrap gap-2", children: ["upcoming", "past", "all"].map((key) => (_jsx("button", { type: "button", onClick: () => setFilter(key), className: `px-4 py-2 rounded-2xl font-medium transition-all ${filter === key ? "bg-white/15 text-white border border-white/20" : "bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10"}`, children: key === "upcoming" ? "Próximos" : key === "past" ? "Passados" : "Todos" }, key))) }), _jsxs("button", { type: "button", onClick: () => setSortOrder(sortOrder === "asc" ? "desc" : "asc"), className: "flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 transition-all", children: [_jsx(Filter, { size: 16 }), "Ordenar: ", sortOrder === "asc" ? "Mais Antigos" : "Mais Recentes", sortOrder === "asc" ? _jsx(ChevronDown, { size: 16 }) : _jsx(ChevronUp, { size: 16 })] })] }) }), _jsxs("div", { className: "glass-card p-8 border border-white/10", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsx(Clock, { className: "text-cyan-300", size: 26 }), _jsxs("h3", { className: "text-2xl font-bold glow-text", children: ["Agendamentos (", filteredAppointments.length, ")", filter === "upcoming" && " — Próximos", filter === "past" && " — Passados"] })] }), filteredAppointments.length > 0 ? (_jsx("div", { className: "space-y-4", children: filteredAppointments.map((appointment) => {
                                const isPast = isPastAppointment(appointment);
                                const statusLabel = appointment.status === "scheduled"
                                    ? "Agendado"
                                    : appointment.status === "confirmed"
                                        ? "Confirmado"
                                        : appointment.status === "completed"
                                            ? "Concluído"
                                            : "Cancelado";
                                const statusClass = appointment.status === "scheduled"
                                    ? "bg-amber-500/15 text-amber-200 border border-amber-400/20"
                                    : appointment.status === "confirmed"
                                        ? "bg-cyan-500/15 text-cyan-200 border border-cyan-400/20"
                                        : appointment.status === "completed"
                                            ? "bg-green-500/15 text-green-200 border border-green-400/20"
                                            : "bg-red-500/15 text-red-200 border border-red-400/20";
                                return (_jsx("div", { className: `glass-card p-6 border border-white/10 transition-all duration-300 hover:scale-[1.01] ${isPast ? "opacity-75" : ""}`, children: _jsxs("div", { className: "flex flex-col lg:flex-row lg:items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-start gap-4 mb-3", children: [_jsx("div", { className: `w-12 h-12 rounded-2xl flex items-center justify-center border ${isPast ? "bg-white/5 border-white/10" : "bg-gradient-to-r from-purple-500 to-pink-500 border-white/10"}`, children: _jsx(User, { className: "text-white", size: 22 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h4", { className: "font-bold text-white text-lg truncate", children: appointment.patient_name }), _jsx("p", { className: "text-gray-300 font-medium", children: appointment.title }), appointment.budget != null && (_jsx("p", { className: "text-green-300 font-bold text-sm mt-1", children: formatCurrency(appointment.budget) }))] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-sm text-gray-300", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Clock, { size: 16 }), _jsx("span", { children: convertToBrazilianFormat(appointment.start_time) })] }), isPast && (_jsx("span", { className: "text-xs font-medium bg-red-500/15 text-red-200 border border-red-400/20 px-3 py-1 rounded-full", children: "Passado" }))] }), appointment.description && _jsx("p", { className: "text-gray-300 mt-3 text-sm", children: appointment.description })] }), _jsxs("div", { className: "flex flex-col items-end gap-3", children: [_jsx("span", { className: `px-3 py-1 text-sm font-medium rounded-full ${statusClass}`, children: statusLabel }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => startEdit(appointment), className: "p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-200 transition-colors", title: "Editar", children: _jsx(Edit, { size: 18 }) }), _jsx("button", { type: "button", onClick: () => deleteAppointment(appointment.id), className: "p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-red-200 transition-colors", title: "Excluir", children: _jsx(Trash2, { size: 18 }) })] }), !isPast && appointment.status !== "cancelled" && (_jsxs("div", { className: "flex gap-2 flex-wrap justify-end", children: [appointment.status === "confirmed" && (_jsxs("button", { type: "button", onClick: () => navigate(`/appointments/${appointment.id}/treatment`), className: "text-xs px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/20 text-purple-100 transition-all flex items-center gap-1", children: [_jsx(Stethoscope, { size: 14 }), _jsx("span", { children: "Iniciar Atendimento" })] })), appointment.status !== "confirmed" && (_jsx("button", { type: "button", onClick: () => updateAppointmentStatus(appointment.id, "confirmed"), className: "text-xs px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/20 text-cyan-100 transition-all", children: "Confirmar" })), appointment.status !== "completed" && (_jsx("button", { type: "button", onClick: () => updateAppointmentStatus(appointment.id, "completed"), className: "text-xs px-3 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-400/20 text-green-100 transition-all", children: "Concluir" })), _jsx("button", { type: "button", onClick: () => updateAppointmentStatus(appointment.id, "cancelled"), className: "text-xs px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/20 text-red-100 transition-all", children: "Cancelar" })] }))] })] }) }, appointment.id));
                            }) })) : (_jsxs("div", { className: "text-center py-12", children: [_jsx("div", { className: "w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10", children: _jsx(Calendar, { className: "text-gray-400", size: 40 }) }), _jsx("h4", { className: "text-lg font-semibold text-white mb-2", children: filter === "upcoming"
                                        ? "Nenhum agendamento futuro"
                                        : filter === "past"
                                            ? "Nenhum agendamento passado"
                                            : "Nenhum agendamento encontrado" }), _jsx("p", { className: "text-gray-300", children: filter === "upcoming"
                                        ? "Todos os agendamentos futuros aparecerão aqui."
                                        : "Comece criando seu primeiro agendamento." })] }))] })] }) }));
};
export default AppointmentsScreen;
