import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/Layout/AppLayout.tsx - DESIGN FUTURISTA
import { useState } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
export const AppLayout = ({ children, title = "Dashboard", showBack = false, className = '' }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    return (_jsxs("div", { className: "flex min-h-screen bg-transparent", children: [_jsx("div", { className: `
        ${isSidebarOpen ? 'w-80' : 'w-24'} 
        transition-all duration-500 ease-out
        sidebar-futurist
        fixed inset-0 z-40
        h-screen
        overflow-y-auto
      `, children: _jsx(Sidebar, { isOpen: isSidebarOpen, onToggle: () => setIsSidebarOpen(!isSidebarOpen) }) }), isSidebarOpen && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-30 lg:hidden", onClick: () => setIsSidebarOpen(false) })), _jsxs("div", { className: `flex-1 flex flex-col min-h-screen transition-all duration-500 ${isSidebarOpen ? 'ml-80' : 'ml-24'}`, children: [_jsx(Header, { title: title, showBack: showBack }), _jsx("main", { className: `flex-1 overflow-auto p-6 ${className}`, children: _jsx("div", { className: "stagger-animation", children: children }) })] })] }));
};
export default AppLayout;
