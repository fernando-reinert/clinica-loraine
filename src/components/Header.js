import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const Header = ({ title, showBack = false, rightAction }) => {
    const navigate = useNavigate();
    return (_jsx("header", { className: "glass-card border-b border-white/10 mx-6 mt-6 rounded-2xl", children: _jsxs("div", { className: "flex items-center justify-between p-6", children: [_jsxs("div", { className: "flex items-center space-x-4", children: [showBack && (_jsx("button", { onClick: () => navigate(-1), className: "p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 hover:scale-110", children: _jsx(ArrowLeft, { size: 20 }) })), _jsx("h1", { className: "text-2xl font-bold glow-text", children: title })] }), rightAction && (_jsx("div", { className: "flex items-center", children: rightAction }))] }) }));
};
export default Header;
