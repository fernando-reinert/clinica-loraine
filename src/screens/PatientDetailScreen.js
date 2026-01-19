import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/screens/PatientDetailScreen.tsx - DESIGN FUTURISTA
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, Mail, Calendar, FileText, Edit, User, AlertCircle, Save, X, MapPin, CreditCard, Heart, Stethoscope, GalleryVertical, Sparkles } from "lucide-react";
import AppLayout from "../components/Layout/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { usePatients } from "../hooks/usePatients";
const PatientDetailScreen = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { getPatient, updatePatient, loading } = usePatients();
    const [patient, setPatient] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editLoading, setEditLoading] = useState(false);
    // Estados para edição
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [editCpf, setEditCpf] = useState("");
    const [editBirthDate, setEditBirthDate] = useState("");
    const [editAddress, setEditAddress] = useState("");
    useEffect(() => {
        if (id) {
            loadPatient(id);
        }
    }, [id]);
    const loadPatient = async (patientId) => {
        try {
            const patientData = await getPatient(patientId);
            if (patientData) {
                setPatient(patientData);
                setEditName(patientData.name);
                setEditEmail(patientData.email || "");
                setEditPhone(patientData.phone);
                setEditCpf(patientData.cpf);
                setEditBirthDate(patientData.birth_date);
                setEditAddress(patientData.address || "");
            }
            else {
                toast.error("Paciente não encontrado");
            }
        }
        catch (error) {
            console.error("Error loading patient:", error);
            toast.error("Erro ao carregar dados do paciente");
        }
    };
    const handleSaveEdit = async () => {
        if (!editName || !editPhone || !editCpf || !editBirthDate) {
            toast.error("Por favor, preencha todos os campos obrigatórios.");
            return;
        }
        setEditLoading(true);
        try {
            const updatedPatient = await updatePatient(id, {
                name: editName,
                email: editEmail || null,
                phone: editPhone,
                cpf: editCpf,
                birth_date: editBirthDate,
                address: editAddress || null,
            });
            if (updatedPatient) {
                setPatient(updatedPatient);
                setIsEditing(false);
                toast.success("Paciente atualizado com sucesso!");
            }
            else {
                throw new Error("Erro ao atualizar paciente");
            }
        }
        catch (error) {
            console.error("Erro ao atualizar paciente:", error);
            toast.error("Erro ao atualizar paciente.");
        }
        finally {
            setEditLoading(false);
        }
    };
    const calculateAge = (birthDate) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("pt-BR");
    };
    const formatPhone = (value) => {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 11) {
            return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
        }
        return value;
    };
    const formatCPF = (value) => {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 11) {
            return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
        }
        return value;
    };
    const handleCancelEdit = () => {
        setIsEditing(false);
        if (patient) {
            setEditName(patient.name);
            setEditEmail(patient.email || "");
            setEditPhone(patient.phone);
            setEditCpf(patient.cpf);
            setEditBirthDate(patient.birth_date);
            setEditAddress(patient.address || "");
        }
    };
    // Quick Actions Futuristas
    const quickActions = [
        {
            title: "Ficha Anamnese",
            icon: FileText,
            gradient: "from-blue-500 to-cyan-500",
            action: () => navigate(`/patients/${id}/anamnese`),
        },
        {
            title: "Agendar",
            icon: Calendar,
            gradient: "from-green-500 to-emerald-500",
            action: () => navigate(`/appointments/new?patientId=${id}`),
        },
        {
            title: "Galeria",
            icon: GalleryVertical,
            gradient: "from-purple-500 to-pink-500",
            action: () => navigate("/gallery"),
        },
        {
            title: "Prontuário",
            icon: Stethoscope,
            gradient: "from-orange-500 to-red-500",
            action: () => navigate(`/patients/${id}/medical-record`),
        },
    ];
    if (loading) {
        return (_jsx(AppLayout, { title: "Carregando...", showBack: true, children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(LoadingSpinner, { size: "lg" }) }) }));
    }
    if (!patient) {
        return (_jsx(AppLayout, { title: "Paciente n\u00E3o encontrado", showBack: true, children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsxs("div", { className: "text-center", children: [_jsx(AlertCircle, { className: "mx-auto text-gray-400 mb-4", size: 48 }), _jsx("p", { className: "text-gray-600", children: "Paciente n\u00E3o encontrado" })] }) }) }));
    }
    return (_jsx(AppLayout, { title: isEditing ? "Editando Paciente" : "Detalhes do Paciente", showBack: true, children: _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "glass-card p-8 relative overflow-hidden", children: _jsxs("div", { className: "flex items-start space-x-6", children: [_jsx("div", { className: "relative", children: _jsx("div", { className: "w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white/20 pulse-glow", children: patient.photo_url ? (_jsx("img", { src: patient.photo_url, alt: patient.name, className: "w-full h-full object-cover" })) : (_jsx(User, { className: "text-white", size: 32 })) }) }), _jsx("div", { className: "flex-1", children: isEditing ? (_jsx("input", { type: "text", value: editName, onChange: (e) => setEditName(e.target.value), className: "holo-input text-xl font-bold mb-2", placeholder: "Nome do paciente" })) : (_jsxs(_Fragment, { children: [_jsx("h2", { className: "text-2xl font-bold glow-text mb-2", children: patient.name }), _jsxs("div", { className: "flex items-center space-x-4 text-gray-300", children: [_jsxs("div", { className: "flex items-center space-x-1", children: [_jsx(Heart, { size: 16 }), _jsxs("span", { children: [calculateAge(patient.birth_date), " anos"] })] }), _jsxs("div", { className: "flex items-center space-x-1", children: [_jsx(Calendar, { size: 16 }), _jsxs("span", { children: ["Desde ", formatDate(patient.created_at)] })] })] })] })) }), _jsx("div", { className: "flex space-x-2", children: isEditing ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleCancelEdit, className: "p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300 hover:scale-105", children: _jsx(X, { size: 20 }) }), _jsx("button", { onClick: handleSaveEdit, disabled: editLoading, className: "p-3 bg-green-500 hover:bg-green-600 rounded-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed", children: editLoading ? (_jsx(LoadingSpinner, { size: "sm" })) : (_jsx(Save, { size: 20 })) })] })) : (_jsx("button", { onClick: () => setIsEditing(true), className: "p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300 hover:scale-105", children: _jsx(Edit, { size: 20 }) })) })] }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "glass-card p-6", children: [_jsxs("h3", { className: "text-lg font-semibold glow-text mb-4 flex items-center space-x-2", children: [_jsx(CreditCard, { size: 20, className: "text-purple-400" }), _jsx("span", { children: "Informa\u00E7\u00F5es Pessoais" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center space-x-3 p-3 bg-white/5 rounded-2xl", children: [_jsx(Phone, { className: "text-gray-400", size: 18 }), isEditing ? (_jsx("input", { type: "text", value: editPhone, onChange: (e) => setEditPhone(formatPhone(e.target.value)), className: "holo-input bg-transparent border-none flex-1", placeholder: "Telefone" })) : (_jsx("span", { className: "text-gray-300", children: patient.phone }))] }), _jsxs("div", { className: "flex items-center space-x-3 p-3 bg-white/5 rounded-2xl", children: [_jsx(Mail, { className: "text-gray-400", size: 18 }), isEditing ? (_jsx("input", { type: "email", value: editEmail, onChange: (e) => setEditEmail(e.target.value), className: "holo-input bg-transparent border-none flex-1", placeholder: "Email" })) : (_jsx("span", { className: "text-gray-300", children: patient.email || "Não informado" }))] }), _jsxs("div", { className: "flex items-center space-x-3 p-3 bg-white/5 rounded-2xl", children: [_jsx(FileText, { className: "text-gray-400", size: 18 }), isEditing ? (_jsx("input", { type: "text", value: editCpf, onChange: (e) => setEditCpf(formatCPF(e.target.value)), className: "holo-input bg-transparent border-none flex-1", placeholder: "CPF", maxLength: 14 })) : (_jsxs("span", { className: "text-gray-300", children: ["CPF: ", patient.cpf] }))] }), _jsxs("div", { className: "flex items-center space-x-3 p-3 bg-white/5 rounded-2xl", children: [_jsx(Calendar, { className: "text-gray-400", size: 18 }), isEditing ? (_jsx("input", { type: "date", value: editBirthDate, onChange: (e) => setEditBirthDate(e.target.value), className: "holo-input bg-transparent border-none flex-1" })) : (_jsxs("span", { className: "text-gray-300", children: ["Nascimento: ", formatDate(patient.birth_date)] }))] }), _jsxs("div", { className: "flex items-start space-x-3 p-3 bg-white/5 rounded-2xl", children: [_jsx(MapPin, { className: "text-gray-400 mt-1", size: 18 }), isEditing ? (_jsx("input", { type: "text", value: editAddress, onChange: (e) => setEditAddress(e.target.value), className: "holo-input bg-transparent border-none flex-1", placeholder: "Endere\u00E7o" })) : (_jsx("span", { className: "text-gray-300", children: patient.address || "Endereço não informado" }))] })] })] }), !isEditing && (_jsxs("div", { className: "glass-card p-6", children: [_jsxs("h3", { className: "text-lg font-semibold glow-text mb-4 flex items-center space-x-2", children: [_jsx(Sparkles, { size: 20, className: "text-cyan-400" }), _jsx("span", { children: "Portal de A\u00E7\u00F5es" })] }), _jsx("div", { className: "grid grid-cols-2 gap-4", children: quickActions.map((action, index) => {
                                        const Icon = action.icon;
                                        return (_jsxs("button", { onClick: action.action, className: `glass-card p-4 rounded-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br ${action.gradient}/10 border ${action.gradient.replace('from-', 'border-').replace(' to-', '/30 border-')}/30 text-left group`, children: [_jsx("div", { className: `w-12 h-12 bg-gradient-to-r ${action.gradient} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`, children: _jsx(Icon, { size: 24, className: "text-white" }) }), _jsx("h4", { className: "font-semibold text-white text-sm", children: action.title })] }, index));
                                    }) })] }))] }), isEditing && (_jsx("div", { className: "fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-2xl shadow-2xl animate-pulse border border-amber-400/30", children: _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx(AlertCircle, { size: 20 }), _jsx("span", { children: "Modo Edi\u00E7\u00E3o Ativo - Salve suas altera\u00E7\u00F5es" })] }) }))] }) }));
};
export default PatientDetailScreen;
