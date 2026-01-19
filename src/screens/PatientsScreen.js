import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/screens/PatientsScreen.tsx - DESIGN FUTURISTA
import { useState } from 'react';
import { Search, Plus, User, FileText, Phone, Calendar, Mail, Users, Filter, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
const PatientsScreen = () => {
    const navigate = useNavigate();
    const { patients, loading } = usePatients();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const filteredPatients = patients.filter(patient => {
        const matchesSearch = patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.phone?.includes(searchTerm) ||
            patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            (statusFilter === 'active' && patient.active !== false) ||
            (statusFilter === 'inactive' && patient.active === false);
        return matchesSearch && matchesStatus;
    });
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('pt-BR');
    };
    const formatPhone = (phone) => {
        return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    };
    const getInitials = (name) => {
        if (!name)
            return 'P';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };
    const getStatusCounts = () => {
        const active = patients.filter(p => p.active !== false).length;
        const inactive = patients.filter(p => p.active === false).length;
        return { active, inactive, total: patients.length };
    };
    const statusCounts = getStatusCounts();
    if (loading) {
        return (_jsx(AppLayout, { title: "Pacientes", showBack: true, children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(LoadingSpinner, { size: "lg" }) }) }));
    }
    return (_jsx(AppLayout, { title: "Pacientes", showBack: true, children: _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "glass-card p-8 relative overflow-hidden", children: _jsxs("div", { className: "flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-4 mb-4", children: [_jsx("div", { className: "p-3 bg-purple-500/20 rounded-2xl border border-purple-400/30", children: _jsx(Users, { className: "text-purple-300", size: 28 }) }), _jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold glow-text mb-2", children: "Universo de Pacientes" }), _jsx("p", { className: "text-gray-300 text-lg", children: "Explore sua gal\u00E1xia de pacientes" })] })] }), _jsxs("div", { className: "flex flex-wrap gap-6 mt-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-bold text-white", children: statusCounts.total }), _jsx("div", { className: "text-gray-400 text-sm", children: "Total na Gal\u00E1xia" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-bold text-green-400", children: statusCounts.active }), _jsx("div", { className: "text-gray-400 text-sm", children: "Ativos" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-2xl font-bold text-amber-400", children: statusCounts.inactive }), _jsx("div", { className: "text-gray-400 text-sm", children: "Inativos" })] })] })] }), _jsxs("button", { onClick: () => navigate('/patients/new'), className: "neon-button group relative overflow-hidden flex items-center space-x-3", children: [_jsx(Plus, { size: 24, className: "group-hover:rotate-90 transition-transform duration-300" }), _jsx("span", { className: "font-semibold text-lg", children: "Novo Paciente" })] })] }) }), _jsx("div", { className: "glass-card p-6", children: _jsxs("div", { className: "flex flex-col lg:flex-row gap-4", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { className: "absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400", size: 20 }), _jsx("input", { type: "text", placeholder: "Buscar por nome, telefone ou email...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "holo-input pl-12 text-lg" })] }), _jsxs("div", { className: "flex items-center space-x-3 glass-card p-3 rounded-2xl", children: [_jsx(Filter, { size: 20, className: "text-gray-400" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "holo-input bg-transparent border-none focus:ring-0 text-gray-300 font-medium", children: [_jsx("option", { value: "all", children: "Todos os Planetas" }), _jsx("option", { value: "active", children: "Ativos" }), _jsx("option", { value: "inactive", children: "Inativos" })] })] })] }) }), _jsx("div", { className: "space-y-4", children: filteredPatients.length === 0 ? (_jsxs("div", { className: "glass-card p-16 text-center", children: [_jsx("div", { className: "w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-400/30", children: _jsx(Users, { className: "text-purple-400", size: 40 }) }), _jsx("h3", { className: "text-2xl font-bold glow-text mb-3", children: searchTerm || statusFilter !== 'all' ? 'Nenhum planeta encontrado' : 'Galáxia vazia' }), _jsx("p", { className: "text-gray-400 text-lg mb-8 max-w-md mx-auto", children: searchTerm || statusFilter !== 'all'
                                    ? 'Ajuste seus scanners ou tente outros filtros'
                                    : 'Inicie sua colonização cadastrando o primeiro paciente' }), !searchTerm && statusFilter === 'all' && (_jsxs("button", { onClick: () => navigate('/patients/new'), className: "neon-button inline-flex items-center space-x-3", children: [_jsx(Plus, { size: 24 }), _jsx("span", { className: "font-semibold text-lg", children: "Fundar Primeira Col\u00F4nia" })] }))] })) : (_jsx("div", { className: "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6", children: filteredPatients.map((patient) => (_jsxs("div", { className: "glass-card p-6 hover-lift group cursor-pointer", onClick: () => navigate(`/patients/${patient.id}`), children: [_jsxs("div", { className: "flex items-start space-x-4 mb-4", children: [_jsxs("div", { className: "relative", children: [_jsxs("div", { className: "w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-lg pulse-glow", children: [patient.photo_url ? (_jsx("img", { src: patient.photo_url, alt: patient.name || patient.full_name, className: "w-full h-full object-cover", onError: (e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            } })) : null, (!patient.photo_url || patient.photo_url === '') && (_jsx("span", { children: getInitials(patient.name || patient.full_name || 'P') }))] }), _jsx("div", { className: `absolute -top-2 -right-2 rounded-full p-1 border-2 border-gray-800 ${patient.active !== false ? 'bg-green-500' : 'bg-gray-400'}`, children: _jsx("div", { className: "w-3 h-3 rounded-full bg-white" }) })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-bold text-white text-lg mb-1 group-hover:text-purple-300 transition-colors truncate", children: patient.name || patient.full_name || 'Viajante Interestelar' }), _jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-400 mb-2", children: [_jsx(Calendar, { size: 14 }), _jsxs("span", { children: ["Entrou em: ", formatDate(patient.created_at)] })] }), _jsxs("div", { className: "space-y-2", children: [patient.phone && (_jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-300", children: [_jsx(Phone, { size: 14 }), _jsx("span", { className: "font-medium", children: formatPhone(patient.phone) })] })), patient.email && (_jsxs("div", { className: "flex items-center space-x-2 text-sm text-gray-300", children: [_jsx(Mail, { size: 14 }), _jsx("span", { className: "truncate max-w-[180px]", children: patient.email })] }))] })] })] }), _jsxs("div", { className: "flex space-x-3 pt-4 border-t border-gray-700", children: [_jsxs("button", { onClick: (e) => {
                                                e.stopPropagation();
                                                navigate(`/patients/${patient.id}`);
                                            }, className: "flex-1 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 py-3 px-4 rounded-xl font-semibold transition-all duration-200 text-sm flex items-center justify-center space-x-2 hover:scale-105 border border-blue-400/30", children: [_jsx(User, { size: 16 }), _jsx("span", { children: "Explorar" })] }), _jsxs("button", { onClick: (e) => {
                                                e.stopPropagation();
                                                navigate(`/patients/${patient.id}/anamnese`);
                                            }, className: "flex-1 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 py-3 px-4 rounded-xl font-semibold transition-all duration-200 text-sm flex items-center justify-center space-x-2 hover:scale-105 border border-purple-400/30", children: [_jsx(FileText, { size: 16 }), _jsx("span", { children: "Anamnese" })] })] }), _jsxs("div", { className: "flex justify-between items-center mt-4 pt-3 border-t border-gray-700", children: [_jsx("span", { className: `px-3 py-1 rounded-full text-xs font-bold ${patient.active !== false
                                                ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                                                : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'}`, children: patient.active !== false ? 'ATIVO' : 'INATIVO' }), _jsx("div", { className: "text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1", children: _jsx(Sparkles, { size: 16 }) })] })] }, patient.id))) })) }), filteredPatients.length > 0 && (_jsx("div", { className: "glass-card p-6", children: _jsxs("div", { className: "flex flex-wrap justify-between items-center", children: [_jsxs("div", { className: "text-gray-400", children: ["Exibindo ", _jsx("span", { className: "font-bold text-white", children: filteredPatients.length }), " de", ' ', _jsx("span", { className: "font-bold text-white", children: patients.length }), " planetas"] }), _jsxs("div", { className: "flex items-center space-x-6 text-sm", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: "w-3 h-3 bg-green-500 rounded-full pulse-glow" }), _jsxs("span", { className: "text-gray-400", children: [statusCounts.active, " ativos"] })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("div", { className: "w-3 h-3 bg-gray-400 rounded-full" }), _jsxs("span", { className: "text-gray-400", children: [statusCounts.inactive, " inativos"] })] })] })] }) }))] }) }));
};
export default PatientsScreen;
