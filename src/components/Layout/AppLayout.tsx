// src/components/Layout/AppLayout.tsx - DESIGN FUTURISTA
import React, { useState } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title = "Dashboard",
  showBack = false,
  className = ''
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-transparent">
      {/* 🌌 Sidebar Futurista */}
      <div className={`
        ${isSidebarOpen ? 'w-80' : 'w-24'} 
        transition-all duration-500 ease-out
        sidebar-futurist
        fixed inset-0 z-40
        h-screen
        overflow-y-auto
      `}>
        <Sidebar 
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>
      
      {/* Overlay para mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Área de Conteúdo Principal */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-500 ${
        isSidebarOpen ? 'ml-80' : 'ml-24'
      }`}>
        {/* Header Futurista */}
        <Header 
          title={title} 
          showBack={showBack}
        />
        
        {/* Conteúdo Scrollável */}
        <main className={`flex-1 overflow-auto p-6 ${className}`}>
          <div className="stagger-animation">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;