// src/components/ui/QuickActions.tsx
import React from 'react';
import { Plus, Calendar, User, FileText, Settings } from 'lucide-react';

interface ActionItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  color: string;
}

export const QuickActions: React.FC = () => {
  const actions: ActionItem[] = [
    {
      icon: <Plus size={20} />,
      label: 'Nova Consulta',
      description: 'Agendar nova consulta',
      onClick: () => console.log('Nova consulta'),
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: <User size={20} />,
      label: 'Cadastrar Paciente',
      description: 'Adicionar novo paciente',
      onClick: () => console.log('Cadastrar paciente'),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <Calendar size={20} />,
      label: 'Ver Agenda',
      description: 'Visualizar agenda completa',
      onClick: () => console.log('Ver agenda'),
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: <FileText size={20} />,
      label: 'Relatórios',
      description: 'Gerar relatórios',
      onClick: () => console.log('Relatórios'),
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full max-w-full min-w-0">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 whitespace-normal break-words">Ações Rápidas</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full min-w-0">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`p-4 rounded-xl bg-gradient-to-r ${action.color} text-white text-left hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02] group w-full max-w-full min-w-0`}
          >
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors flex-shrink-0">
                {action.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm whitespace-normal break-words">{action.label}</p>
                <p className="text-white/80 text-xs mt-1 whitespace-normal break-words">{action.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};