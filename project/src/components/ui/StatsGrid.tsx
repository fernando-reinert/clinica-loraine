// src/components/ui/StatsGrid.tsx
import React from 'react';
import { TrendingUp, Users, Calendar, DollarSign } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  trend: 'up' | 'down';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon, trend }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
          <div className={`flex items-center text-sm ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp size={16} className="mr-1" />
            <span>{change}</span>
          </div>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-white">
          {icon}
        </div>
      </div>
    </div>
  );
};

export const StatsGrid: React.FC = () => {
  const stats = [
    {
      title: 'Pacientes Hoje',
      value: '24',
      change: '+12%',
      icon: <Users size={24} />,
      trend: 'up' as const
    },
    {
      title: 'Consultas',
      value: '18',
      change: '+8%',
      icon: <Calendar size={24} />,
      trend: 'up' as const
    },
    {
      title: 'Faturamento',
      value: 'R$ 8.240',
      change: '+15%',
      icon: <DollarSign size={24} />,
      trend: 'up' as const
    },
    {
      title: 'Taxa de Ocupação',
      value: '82%',
      change: '+5%',
      icon: <TrendingUp size={24} />,
      trend: 'up' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};