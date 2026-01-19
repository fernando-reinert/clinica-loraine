import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const Input = ({ type = 'text', placeholder, value, onChange, disabled = false, error, label, className = '', }) => {
    return (_jsxs("div", { className: "w-full", children: [label && (_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: label })), _jsx("input", { type: type, placeholder: placeholder, value: value, onChange: onChange, disabled: disabled, className: `
          w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${className}
        ` }), error && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: error }))] }));
};
