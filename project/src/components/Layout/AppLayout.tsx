// src/components/Layout/AppLayout.tsx
import React, { useState } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean; // ✅ Nova prop
  className?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title = "Dashboard",
  showBack = false, // ✅ Valor padrão
  className = ''
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <div className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        transition-all duration-300 ease-in-out
        bg-gradient-to-b from-purple-900 to-pink-900
        fixed lg:static inset-y-0 left-0 z-40
      `}>
        <Sidebar 
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>
      
      {/* Overlay para mobile quando sidebar aberta */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Área de Conteúdo Principal */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
        isSidebarOpen ? 'ml-64' : 'ml-20'
      }`}>
        {/* Header COM botão voltar */}
        <Header 
          title={title} 
          showBack={showBack} // ✅ Passando a prop
        />
        
        {/* Conteúdo Scrollável */}
        <main className={`flex-1 overflow-auto ${className}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;