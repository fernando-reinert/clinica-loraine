import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const StatCard = ({ title, value, icon: Icon, gradient }) => {
    return (_jsx("div", { className: `p-6 bg-gradient-to-r ${gradient} rounded-xl shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-3xl font-bold", children: value }), _jsx("p", { className: "text-sm opacity-90", children: title })] }), _jsx(Icon, { size: 32, className: "opacity-80" })] }) }));
};
