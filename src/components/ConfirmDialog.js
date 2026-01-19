import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { AlertTriangle, X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
const ConfirmDialog = ({ isOpen, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', confirmVariant = 'danger', onConfirm, onCancel, isLoading = false, }) => {
    if (!isOpen)
        return null;
    const handleConfirm = async () => {
        await onConfirm();
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "glass-card p-6 border border-white/10 max-w-md w-full", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `p-2 rounded-lg ${confirmVariant === 'danger' ? 'bg-red-500/20' : 'bg-cyan-500/20'}`, children: _jsx(AlertTriangle, { className: confirmVariant === 'danger' ? 'text-red-400' : 'text-cyan-400', size: 24 }) }), _jsx("h3", { className: "text-xl font-bold glow-text", children: title })] }), _jsx("button", { onClick: onCancel, disabled: isLoading, className: "p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50", children: _jsx(X, { size: 20, className: "text-gray-300" }) })] }), _jsx("p", { className: "text-gray-300 mb-6 text-sm leading-relaxed", children: message }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx("button", { onClick: onCancel, disabled: isLoading, className: "px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed", children: cancelLabel }), _jsx("button", { onClick: handleConfirm, disabled: isLoading, className: `px-4 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${confirmVariant === 'danger'
                                ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200'
                                : 'neon-button'}`, children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(LoadingSpinner, { size: "sm" }), _jsx("span", { children: "Processando..." })] })) : (confirmLabel) })] })] }) }));
};
export default ConfirmDialog;
