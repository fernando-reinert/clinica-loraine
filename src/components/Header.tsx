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
    <header className="glass-card border-b border-white/10 mx-6 mt-6 rounded-2xl">
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center space-x-4">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 hover:scale-110"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          
          <h1 className="text-2xl font-bold glow-text">{title}</h1>
        </div>

        {/* ✅ Right Action Area */}
        {rightAction && (
          <div className="flex items-center">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;