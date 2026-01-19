import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Users, Calendar, Camera, Clock, CheckCircle, DollarSign, Plus, TrendingUp, Sparkles, Zap, Activity, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDashboardStats } from '../hooks/useDashboardStats';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
const DashboardScreen = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { stats, loading } = useDashboardStats();
    const quickActions = [
        {
            title: 'Novo Paciente',
            icon: Users,
            gradient: 'from-blue-500 to-cyan-500',
            action: () => navigate('/patients/new')
        },
        {
            title: 'Agendar Consulta',
            icon: Calendar,
            gradient: 'from-purple-500 to-pink-500',
            action: () => navigate('/appointments/new')
        },
        {
            title: 'Galeria',
            icon: Camera,
            gradient: 'from-orange-500 to-red-500',
            action: () => navigate('/gallery')
        },
        {
            title: 'Financeiro',
            icon: DollarSign,
            gradient: 'from-green-500 to-emerald-500',
            action: () => navigate('/financial-control')
        }
    ];
    if (loading) {
        return (_jsx(AppLayout, { title: "Dashboard", children: _jsx("div", { className: "flex items-center justify-center h-96", children: _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "relative", children: [_jsx(LoadingSpinner, { size: "lg", className: "text-blue-500" }), _jsx(Sparkles, { className: "absolute -top-2 -right-2 text-purple-500 animate-pulse", size: 20 })] }), _jsx("p", { className: "mt-4 text-gray-300", children: "Carregando universo de dados..." })] }) }) }));
    }
    return (_jsx(AppLayout, { title: "Dashboard", children: _jsxs("div", { className: "space-y-8", children: [_jsxs("div", { className: "glass-card p-8 relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" }), _jsxs("div", { className: "relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6", children: [_jsx("div", { className: "flex-1", children: _jsxs("div", { className: "flex items-center gap-4 mb-4", children: [_jsx("div", { className: "p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30", children: _jsx(Sparkles, { className: "text-blue-300", size: 28 }) }), _jsxs("div", { children: [_jsxs("h2", { className: "text-3xl font-bold glow-text mb-2", children: ["Bem-vinda, ", user?.user_metadata?.name || 'Dra. Loraine', "! \uD83C\uDF0C"] }), _jsxs("p", { className: "text-gray-300 text-lg", children: ["Seu cosmos est\u00E1 ", _jsx("span", { className: "text-cyan-400 font-semibold", children: "92% otimizado" }), ". Prepare-se para explorar novas dimens\u00F5es."] })] })] }) }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsx("button", { onClick: () => navigate('/profile'), className: "p-4 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 group border border-white/10", children: _jsx(Settings, { size: 24, className: "text-white group-hover:text-cyan-300 transition-colors" }) }), _jsxs("button", { onClick: () => navigate('/patients/new'), className: "neon-button group relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" }), _jsx(Plus, { size: 24, className: "mr-3 relative z-10" }), _jsx("span", { className: "relative z-10 font-semibold", children: "Novo Paciente" })] })] })] })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6", children: [
                        { title: 'Total Pacientes', value: stats.totalPatients || 0, icon: Users, color: 'blue' },
                        { title: 'Agendamentos Hoje', value: stats.todayAppointments || 0, icon: Calendar, color: 'purple' },
                        { title: 'Esta Semana', value: stats.thisWeekAppointments || 0, icon: Clock, color: 'cyan' },
                        { title: 'Procedimentos', value: stats.completedProcedures || 0, icon: CheckCircle, color: 'green' }
                    ].map((stat, index) => {
                        const Icon = stat.icon;
                        return (_jsxs("div", { className: "glass-card p-6 hover-lift group", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-3xl font-bold text-white mb-2", children: stat.value }), _jsx("p", { className: "text-gray-400 text-sm", children: stat.title })] }), _jsx("div", { className: `p-3 rounded-2xl bg-${stat.color}-500/20 border border-${stat.color}-400/30 group-hover:scale-110 transition-transform duration-300`, children: _jsx(Icon, { size: 28, className: `text-${stat.color}-300` }) })] }), _jsx("div", { className: "mt-4 w-full bg-gray-700 rounded-full h-2", children: _jsx("div", { className: `bg-${stat.color}-500 h-2 rounded-full transition-all duration-1000`, style: { width: `${Math.min(100, (stat.value / 50) * 100)}%` } }) })] }, index));
                    }) }), _jsxs("div", { className: "glass-card p-8", children: [_jsx("div", { className: "flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4", children: _jsxs("div", { children: [_jsx("h3", { className: "text-2xl font-bold glow-text mb-2", children: "Portal de A\u00E7\u00F5es" }), _jsx("p", { className: "text-gray-400", children: "Acesso instant\u00E2neo \u00E0s dimens\u00F5es principais" })] }) }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6", children: quickActions.map((action, index) => {
                                const Icon = action.icon;
                                return (_jsx("div", { onClick: action.action, className: "group cursor-pointer", children: _jsxs("div", { className: `glass-card p-6 rounded-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br ${action.gradient}/10 border ${action.gradient.replace('from-', 'border-').replace(' to-', '/30 border-')}/30`, children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("div", { className: `p-3 rounded-2xl bg-gradient-to-r ${action.gradient} shadow-lg`, children: _jsx(Icon, { size: 24, className: "text-white" }) }), _jsx(Zap, { size: 16, className: "text-gray-400 group-hover:text-white transition-colors" })] }), _jsx("h4", { className: "font-semibold text-white text-lg mb-2", children: action.title }), _jsx("div", { className: "w-8 h-1 bg-white/40 rounded-full group-hover:w-12 transition-all duration-300" })] }) }, index));
                            }) })] }), _jsxs("div", { className: "grid grid-cols-1 xl:grid-cols-2 gap-8", children: [_jsxs("div", { className: "glass-card p-8", children: [_jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsx(Activity, { className: "text-purple-400", size: 28 }), _jsx("h3", { className: "text-2xl font-bold glow-text", children: "Fluxo Temporal" })] }), _jsxs("div", { className: "space-y-4", children: [stats.pendingAppointments > 0 && (_jsx("div", { className: "glass-card p-6 border border-amber-400/30 bg-amber-500/10", children: _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: "p-3 bg-amber-500/20 rounded-2xl border border-amber-400/30", children: _jsx(Clock, { className: "text-amber-300", size: 24 }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("p", { className: "font-semibold text-amber-100", children: [stats.pendingAppointments, " confirma\u00E7\u00F5es pendentes"] }), _jsx("p", { className: "text-amber-300 text-sm", children: "Interven\u00E7\u00E3o temporal necess\u00E1ria" })] })] }) })), _jsx("div", { className: "glass-card p-6 border border-green-400/30 bg-green-500/10", children: _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: "p-3 bg-green-500/20 rounded-2xl border border-green-400/30", children: _jsx(TrendingUp, { className: "text-green-300", size: 24 }) }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-green-100", children: "Performance Excepcional" }), _jsx("p", { className: "text-green-300 text-sm", children: "+18% acima da m\u00E9dia qu\u00E2ntica" })] })] }) })] })] }), _jsxs("div", { className: "glass-card p-8", children: [_jsxs("div", { className: "flex items-center gap-4 mb-6", children: [_jsx(TrendingUp, { className: "text-cyan-400", size: 28 }), _jsx("h3", { className: "text-2xl font-bold glow-text", children: "M\u00E9tricas Qu\u00E2nticas" })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-gray-300", children: "Taxa de Ocupa\u00E7\u00E3o" }), _jsx("span", { className: "text-2xl font-bold text-purple-300", children: "84%" })] }), _jsx("div", { className: "w-full bg-gray-700 rounded-full h-3", children: _jsx("div", { className: "bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full w-4/5 transition-all duration-1000" }) })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-gray-300", children: "Receita Mensal" }), _jsx("span", { className: "text-2xl font-bold text-green-300", children: "R$ 9.240" })] }), _jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-400", children: "Meta: R$ 12.000" }), _jsx("span", { className: "text-green-400 font-semibold", children: "77%" })] })] }), _jsxs("button", { onClick: () => navigate('/financial-control'), className: "w-full neon-button mt-4", children: [_jsx(DollarSign, { size: 20, className: "mr-3" }), "An\u00E1lise Financeira Completa"] })] })] })] })] }) }));
};
export default DashboardScreen;
