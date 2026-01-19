import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';
const StatCard = ({ title, value, change, icon, trend }) => {
    return (_jsx("div", { className: "bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-medium text-gray-600 mb-1", children: title }), _jsx("p", { className: "text-2xl font-bold text-gray-900 mb-2", children: value }), _jsxs("div", { className: `flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`, children: [_jsx(TrendingUp, { size: 16, className: "mr-1" }), _jsx("span", { children: change })] })] }), _jsx("div", { className: "p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white", children: icon })] }) }));
};
export const StatsGrid = () => {
    const stats = [
        {
            title: 'Pacientes Hoje',
            value: '24',
            change: '+12%',
            icon: _jsx(Users, { size: 24 }),
            trend: 'up'
        },
        {
            title: 'Consultas',
            value: '18',
            change: '+8%',
            icon: _jsx(Calendar, { size: 24 }),
            trend: 'up'
        },
        {
            title: 'Faturamento',
            value: 'R$ 8.240',
            change: '+15%',
            icon: _jsx(DollarSign, { size: 24 }),
            trend: 'up'
        },
        {
            title: 'Taxa de Ocupação',
            value: '82%',
            change: '+5%',
            icon: _jsx(TrendingUp, { size: 24 }),
            trend: 'up'
        }
    ];
    return (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6", children: stats.map((stat, index) => (_jsx(StatCard, { ...stat }, index))) }));
};
