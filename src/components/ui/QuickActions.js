import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Plus, Calendar, User, FileText } from 'lucide-react';
export const QuickActions = () => {
    const actions = [
        {
            icon: _jsx(Plus, { size: 20 }),
            label: 'Nova Consulta',
            description: 'Agendar nova consulta',
            onClick: () => console.log('Nova consulta'),
            color: 'from-purple-500 to-pink-500'
        },
        {
            icon: _jsx(User, { size: 20 }),
            label: 'Cadastrar Paciente',
            description: 'Adicionar novo paciente',
            onClick: () => console.log('Cadastrar paciente'),
            color: 'from-blue-500 to-cyan-500'
        },
        {
            icon: _jsx(Calendar, { size: 20 }),
            label: 'Ver Agenda',
            description: 'Visualizar agenda completa',
            onClick: () => console.log('Ver agenda'),
            color: 'from-green-500 to-emerald-500'
        },
        {
            icon: _jsx(FileText, { size: 20 }),
            label: 'Relatórios',
            description: 'Gerar relatórios',
            onClick: () => console.log('Relatórios'),
            color: 'from-orange-500 to-red-500'
        }
    ];
    return (_jsxs("div", { className: "bg-white rounded-2xl shadow-sm border border-gray-100 p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "A\u00E7\u00F5es R\u00E1pidas" }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: actions.map((action, index) => (_jsx("button", { onClick: action.onClick, className: `p-4 rounded-xl bg-gradient-to-r ${action.color} text-white text-left hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] group`, children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors", children: action.icon }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-sm", children: action.label }), _jsx("p", { className: "text-white/80 text-xs mt-1", children: action.description })] })] }) }, index))) })] }));
};
