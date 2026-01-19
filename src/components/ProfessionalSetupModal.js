import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/ProfessionalSetupModal.tsx
// Modal para configurar dados do profissional na primeira vez
import { useState } from 'react';
import { X, User, FileText } from 'lucide-react';
import { upsertProfessional } from '../services/professionals/professionalService';
import toast from 'react-hot-toast';
const ProfessionalSetupModal = ({ userId, userEmail, onComplete, onCancel, }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        license: '',
        profession: 'Enfermeira',
        phone: '',
        address: '',
    });
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.license) {
            toast.error('Por favor, preencha nome e registro profissional');
            return;
        }
        try {
            setLoading(true);
            const professional = await upsertProfessional({
                user_id: userId,
                email: userEmail,
                name: formData.name,
                license: formData.license,
                profession: formData.profession,
                phone: formData.phone || undefined,
                address: formData.address || undefined,
            });
            toast.success('Dados do profissional salvos com sucesso!');
            onComplete(professional);
        }
        catch (error) {
            console.error('Erro ao criar profissional:', error);
            toast.error('Erro ao salvar dados do profissional');
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "glass-card p-6 border border-white/10 max-w-md w-full", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex justify-between items-center mb-6", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "p-2 bg-cyan-500/20 rounded-lg", children: _jsx(User, { className: "text-cyan-400", size: 24 }) }), _jsx("h3", { className: "text-xl font-bold glow-text", children: "Configurar Perfil Profissional" })] }), onCancel && (_jsx("button", { onClick: onCancel, className: "p-2 hover:bg-white/10 rounded-lg transition-colors", children: _jsx(X, { size: 20, className: "text-gray-300" }) }))] }), _jsx("p", { className: "text-gray-300 mb-6 text-sm", children: "Para continuar, precisamos de algumas informa\u00E7\u00F5es sobre seu perfil profissional." }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Nome Completo *" }), _jsx("input", { type: "text", value: formData.name, onChange: (e) => setFormData(prev => ({ ...prev, name: e.target.value })), placeholder: "Ex: Dr. Jo\u00E3o Silva", className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Coren *" }), _jsx("input", { type: "text", value: formData.license, onChange: (e) => setFormData(prev => ({ ...prev, license: e.target.value })), placeholder: "Ex: COREN 344168", className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Profiss\u00E3o" }), _jsx("input", { type: "text", value: formData.profession, onChange: (e) => setFormData(prev => ({ ...prev, profession: e.target.value })), placeholder: "Ex: Enfermeira", className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Telefone" }), _jsx("input", { type: "tel", value: formData.phone, onChange: (e) => setFormData(prev => ({ ...prev, phone: e.target.value })), placeholder: "Ex: (11) 99999-9999", className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Endere\u00E7o" }), _jsx("input", { type: "text", value: formData.address, onChange: (e) => setFormData(prev => ({ ...prev, address: e.target.value })), placeholder: "Ex: Rua Exemplo, 123", className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" })] }), _jsx("div", { className: "flex gap-3 pt-4", children: _jsxs("button", { type: "submit", disabled: loading, className: "neon-button disabled:opacity-50 flex-1 flex items-center justify-center gap-2 px-6 py-3", children: [_jsx(FileText, { size: 18 }), _jsx("span", { children: loading ? 'Salvando...' : 'Salvar e Continuar' })] }) })] })] }) }));
};
export default ProfessionalSetupModal;
