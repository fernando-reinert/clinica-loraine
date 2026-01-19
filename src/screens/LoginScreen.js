import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Sparkles, Heart } from 'lucide-react';
const LoginScreen = () => {
    const { user, loading } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "relative", children: [_jsx(LoadingSpinner, { size: "lg", className: "text-blue-500" }), _jsx(Sparkles, { className: "absolute -top-2 -right-2 text-purple-500 animate-pulse", size: 20 })] }), _jsx("p", { className: "mt-4 text-gray-300", children: "Carregando universo..." })] }) }));
    }
    if (user) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-4", children: _jsxs("div", { className: "w-full max-w-md space-y-6", children: [_jsxs("div", { className: "glass-card p-8 relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" }), _jsxs("div", { className: "relative z-10 text-center", children: [_jsx("div", { className: "flex items-center justify-center gap-4 mb-4", children: _jsx("div", { className: "p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30", children: _jsx(Heart, { className: "text-blue-300", size: 28 }) }) }), _jsx("h1", { className: "text-3xl font-bold glow-text mb-2", children: "Cl\u00EDnica Loraine Vilela" }), _jsx("p", { className: "text-gray-300 text-lg", children: "Sistema de gest\u00E3o cl\u00EDnica" })] })] }), _jsx("div", { className: "glass-card p-8", children: isLogin ? _jsx(LoginForm, {}) : _jsx(SignUpForm, {}) }), _jsx("div", { className: "glass-card p-6", children: _jsx("button", { onClick: () => setIsLogin(!isLogin), className: "w-full neon-button flex items-center justify-center", children: _jsx("span", { className: "font-semibold", children: isLogin ? 'Criar nova conta' : 'Já tenho conta' }) }) })] }) }));
};
export default LoginScreen;
