// src/components/Header.tsx - DESIGN FUTURISTA
import React from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showBack = false,
  rightAction 
}) => {
  const navigate = useNavigate();

  return (
    <header className="glass-card border-b border-white/10 mx-2 sm:mx-4 md:mx-6 mt-4 sm:mt-6 rounded-2xl w-full max-w-full min-w-0">
      <div className="flex items-center justify-between gap-3 p-4 sm:p-6 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 sm:p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 hover:scale-110 flex-shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          
          <h1 className="text-xl sm:text-2xl font-bold glow-text whitespace-normal break-words min-w-0">
            {title}
          </h1>
        </div>

        {/* ✅ Right Action Area */}
        {rightAction && (
          <div className="flex items-center flex-shrink-0 min-w-0">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;