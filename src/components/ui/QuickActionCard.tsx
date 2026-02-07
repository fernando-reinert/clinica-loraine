import React from 'react';

interface QuickActionCardProps {
  title: string;
  icon: React.ComponentType<any>;
  gradient: string;
  onClick: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  icon: Icon,
  gradient,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className="p-6 text-left bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95 w-full max-w-full min-w-0"
    >
      <div className={`${gradient} w-12 h-12 rounded-xl flex items-center justify-center mb-4 flex-shrink-0`}>
        <Icon size={24} className="text-white" />
      </div>
      <p className="font-semibold text-gray-900 whitespace-normal break-words">{title}</p>
      <p className="text-sm text-gray-500 mt-1">Clique para acessar</p>
    </button>
  );
};