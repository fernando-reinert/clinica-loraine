import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Home, Users, Calendar, DollarSign, Camera, FileText, Settings, UserPlus, Stethoscope, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
const Sidebar = ({ isOpen, onToggle }) => {
    const location = useLocation();
    const navigation = [
        { icon: Home, label: 'Dashboard', href: '/dashboard' },
        { icon: Users, label: 'Pacientes', href: '/patients' },
        { icon: UserPlus, label: 'Novo Paciente', href: '/patients/new' },
        { icon: Calendar, label: 'Agenda', href: '/appointments' },
        { icon: Stethoscope, label: 'Consultas', href: '/appointments/list' },
        { icon: DollarSign, label: 'Financeiro', href: '/financial-control' },
        { icon: FileText, label: 'Prontuários', href: '/clinical-record' },
        { icon: Camera, label: 'Galeria', href: '/gallery' },
        { icon: Settings, label: 'Configurações', href: '/profile' },
    ];
    return (_jsxs("div", { className: `flex flex-col h-full text-white transition-all duration-500 ${isOpen ? 'w-80' : 'w-24'}`, children: [_jsx("div", { className: "p-6 border-b border-white/10 flex-shrink-0", children: _jsxs("div", { className: "flex items-center justify-between", children: [isOpen && (_jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: "w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center pulse-glow", children: _jsx(Sparkles, { size: 24 }) }), _jsxs("div", { children: [_jsx("h1", { className: "font-bold text-xl glow-text", children: "Nebula" }), _jsx("p", { className: "text-sm text-blue-300", children: "Cl\u00EDnica Loraine" })] })] })), _jsx("button", { onClick: onToggle, className: "p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 hover:scale-110", title: isOpen ? "Recolher menu" : "Expandir menu", children: isOpen ? _jsx(ChevronLeft, { size: 20 }) : _jsx(ChevronRight, { size: 20 }) })] }) }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: _jsx("nav", { className: "space-y-2", children: navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname.startsWith(item.href);
                        return (_jsxs(Link, { to: item.href, className: `
                  flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden
                  ${isActive
                                ? 'glass-card bg-blue-500/20 border-blue-400/50'
                                : 'glass-card hover:bg-white/5 hover:border-white/20'}
                  ${isOpen ? 'justify-start' : 'justify-center'}
                `, title: !isOpen ? item.label : '', children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/10 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-x-[-100%] group-hover:translate-x-[100%]" }), _jsx(Icon, { size: 24, className: `
                  transition-all duration-300 flex-shrink-0
                  ${isActive ? 'text-blue-300' : 'text-gray-400 group-hover:text-white'}
                ` }), isOpen && (_jsx("span", { className: "font-medium transition-all duration-300", children: item.label })), !isOpen && (_jsx("div", { className: "absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 whitespace-nowrap shadow-xl border border-gray-700", children: item.label }))] }, item.href));
                    }) }) }), _jsx("div", { className: "p-6 border-t border-white/10 flex-shrink-0", children: isOpen ? (_jsxs("div", { className: "flex items-center space-x-4 p-4 glass-card rounded-2xl", children: [_jsx("div", { className: "w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center", children: _jsx("span", { className: "font-bold text-sm", children: "LV" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-semibold text-sm truncate", children: "Dra. Loraine" }), _jsx("p", { className: "text-xs text-blue-300 truncate", children: "M\u00E9dica Est\u00E9tica" })] })] })) : (_jsx("div", { className: "flex justify-center", children: _jsx("div", { className: "w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center cursor-pointer pulse-glow", children: _jsx("span", { className: "font-bold text-sm", children: "LV" }) }) })) })] }));
};
export default Sidebar;
