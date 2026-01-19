import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const QuickActionCard = ({ title, icon: Icon, gradient, onClick }) => {
    return (_jsxs("button", { onClick: onClick, className: "p-6 text-left bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95", children: [_jsx("div", { className: `${gradient} w-12 h-12 rounded-xl flex items-center justify-center mb-4`, children: _jsx(Icon, { size: 24, className: "text-white" }) }), _jsx("p", { className: "font-semibold text-gray-900", children: title }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: "Clique para acessar" })] }));
};
