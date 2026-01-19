import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
const LoginForm = () => {
    const { signIn, loading } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await signIn(email, password);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    return (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Email" }), _jsx("input", { type: "email", value: email, onChange: (e) => setEmail(e.target.value), className: "holo-input w-full", placeholder: "Digite seu email", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Senha" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPassword ? 'text' : 'password', value: password, onChange: (e) => setPassword(e.target.value), className: "holo-input w-full pr-12", placeholder: "Digite sua senha", required: true }), _jsx("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors", children: showPassword ? _jsx(EyeOff, { size: 20 }) : _jsx(Eye, { size: 20 }) })] })] }), _jsx("button", { type: "submit", disabled: isSubmitting, className: "w-full neon-button flex items-center justify-center", children: isSubmitting ? (_jsxs("span", { className: "flex items-center gap-2", children: [_jsx(LoadingSpinner, { size: "sm", className: "text-white" }), _jsx("span", { children: "Entrando..." })] })) : (_jsx("span", { className: "font-semibold", children: "Entrar" })) })] }));
};
export default LoginForm;
