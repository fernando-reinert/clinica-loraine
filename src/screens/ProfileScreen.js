import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { User, Settings, Bell, Shield, HelpCircle, LogOut, Edit, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import toast from 'react-hot-toast';
const ProfileScreen = () => {
    const { user, signOut } = useAuth();
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [profileData, setProfileData] = useState({
        name: user?.user_metadata?.name || 'Dra. Loraine Vilela',
        email: user?.email || 'loraine@clinica.com',
        specialty: 'Medicina Estética',
        license: 'CRM 123456',
        phone: '(11) 99999-9999',
        address: 'Rua das Flores, 123 - São Paulo, SP'
    });
    const handleSignOut = async () => {
        try {
            await signOut();
        }
        catch (error) {
            toast.error('Erro ao fazer logout');
        }
    };
    const handleSaveProfile = () => {
        // Simulate saving profile
        setShowEditProfile(false);
        toast.success('Perfil atualizado com sucesso!');
    };
    const menuItems = [
        {
            icon: Settings,
            title: 'Configurações',
            subtitle: 'Preferências do aplicativo',
            action: () => toast('Configurações em desenvolvimento') // ✅ CORRIGIDO
        },
        {
            icon: Bell,
            title: 'Notificações',
            subtitle: 'Gerenciar alertas e lembretes',
            action: () => toast('Notificações em desenvolvimento') // ✅ CORRIGIDO
        },
        {
            icon: Shield,
            title: 'Privacidade e Segurança',
            subtitle: 'Controle de dados e backup',
            action: () => toast('Privacidade e segurança em desenvolvimento') // ✅ CORRIGIDO
        },
        {
            icon: HelpCircle,
            title: 'Ajuda e Suporte',
            subtitle: 'FAQ e contato',
            action: () => toast('Ajuda e suporte em desenvolvimento') // ✅ CORRIGIDO
        }
    ];
    return (_jsxs("div", { className: "min-h-screen bg-gray-50 pb-20", children: [_jsx(Header, { title: "Perfil" }), _jsxs("div", { className: "p-4 space-y-6", children: [_jsxs("div", { className: "ios-card p-6", children: [_jsxs("div", { className: "flex items-center space-x-4 mb-4", children: [_jsxs("div", { className: "relative", children: [_jsx("div", { className: "w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center", children: _jsx(User, { className: "text-primary-600", size: 32 }) }), _jsx("button", { className: "absolute -bottom-1 -right-1 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white", children: _jsx(Camera, { size: 16 }) })] }), _jsxs("div", { className: "flex-1", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900", children: profileData.name }), _jsx("p", { className: "text-gray-600", children: profileData.specialty }), _jsx("p", { className: "text-sm text-gray-500", children: profileData.license })] }), _jsx("button", { onClick: () => setShowEditProfile(true), className: "p-2 text-primary-500 active:scale-95 transition-transform", children: _jsx(Edit, { size: 20 }) })] }), _jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-gray-500", children: "Email:" }), _jsx("span", { className: "text-gray-900", children: profileData.email })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-gray-500", children: "Telefone:" }), _jsx("span", { className: "text-gray-900", children: profileData.phone })] }), _jsxs("div", { className: "flex items-center space-x-2", children: [_jsx("span", { className: "text-gray-500", children: "Endere\u00E7o:" }), _jsx("span", { className: "text-gray-900", children: profileData.address })] })] })] }), _jsxs("div", { className: "grid grid-cols-3 gap-4", children: [_jsxs("div", { className: "ios-card p-4 text-center", children: [_jsx("div", { className: "text-2xl font-bold text-primary-500", children: "127" }), _jsx("div", { className: "text-sm text-gray-600", children: "Pacientes" })] }), _jsxs("div", { className: "ios-card p-4 text-center", children: [_jsx("div", { className: "text-2xl font-bold text-green-500", children: "245" }), _jsx("div", { className: "text-sm text-gray-600", children: "Procedimentos" })] }), _jsxs("div", { className: "ios-card p-4 text-center", children: [_jsx("div", { className: "text-2xl font-bold text-blue-500", children: "32" }), _jsx("div", { className: "text-sm text-gray-600", children: "Este M\u00EAs" })] })] }), _jsx("div", { className: "space-y-3", children: menuItems.map((item, index) => {
                            const Icon = item.icon;
                            return (_jsxs("button", { onClick: item.action, className: "w-full ios-card p-4 flex items-center space-x-4 active:scale-95 transition-transform", children: [_jsx("div", { className: "w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center", children: _jsx(Icon, { className: "text-gray-600", size: 20 }) }), _jsxs("div", { className: "flex-1 text-left", children: [_jsx("h3", { className: "font-medium text-gray-900", children: item.title }), _jsx("p", { className: "text-sm text-gray-600", children: item.subtitle })] }), _jsx("div", { className: "text-gray-400", children: "\u2192" })] }, index));
                        }) }), _jsxs("button", { onClick: handleSignOut, className: "w-full ios-card p-4 flex items-center justify-center space-x-2 text-red-500 active:scale-95 transition-transform", children: [_jsx(LogOut, { size: 20 }), _jsx("span", { className: "font-medium", children: "Sair da Conta" })] }), _jsxs("div", { className: "text-center text-xs text-gray-500 space-y-1", children: [_jsx("p", { children: "Cl\u00EDnica Loraine Vilela v1.0.0" }), _jsx("p", { children: "\u00A9 2024 Todos os direitos reservados" })] })] }), showEditProfile && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "Editar Perfil" }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Nome Completo" }), _jsx("input", { type: "text", value: profileData.name, onChange: (e) => setProfileData(prev => ({ ...prev, name: e.target.value })), className: "ios-input" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Email" }), _jsx("input", { type: "email", value: profileData.email, onChange: (e) => setProfileData(prev => ({ ...prev, email: e.target.value })), className: "ios-input" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Especialidade" }), _jsx("input", { type: "text", value: profileData.specialty, onChange: (e) => setProfileData(prev => ({ ...prev, specialty: e.target.value })), className: "ios-input" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Registro Profissional" }), _jsx("input", { type: "text", value: profileData.license, onChange: (e) => setProfileData(prev => ({ ...prev, license: e.target.value })), className: "ios-input" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Telefone" }), _jsx("input", { type: "tel", value: profileData.phone, onChange: (e) => setProfileData(prev => ({ ...prev, phone: e.target.value })), className: "ios-input" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Endere\u00E7o" }), _jsx("textarea", { value: profileData.address, onChange: (e) => setProfileData(prev => ({ ...prev, address: e.target.value })), className: "ios-input h-20 resize-none" })] })] }), _jsxs("div", { className: "flex space-x-3 mt-6", children: [_jsx("button", { onClick: () => setShowEditProfile(false), className: "flex-1 ios-button-secondary", children: "Cancelar" }), _jsx("button", { onClick: handleSaveProfile, className: "flex-1 ios-button", children: "Salvar" })] })] }) }))] }));
};
export default ProfileScreen;
