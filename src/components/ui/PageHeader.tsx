// src/components/ui/PageHeader.tsx - Header único e responsivo para todas as telas
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  showBack?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  rightSlot,
  showBack = false,
}) => {
  const navigate = useNavigate();

  return (
    <header className="page-header border-b border-white/10 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 sm:p-3 hover:bg-white/10 rounded-2xl transition-all duration-300 hover:scale-110 flex-shrink-0"
              aria-label="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold glow-text truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm sm:text-base text-gray-400 mt-1 break-words whitespace-normal min-w-0">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {rightSlot && (
          <div className="flex items-center flex-shrink-0 min-w-0">
            {rightSlot}
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
