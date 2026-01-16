import { LucideIcon } from 'lucide-react';
import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  gradient: string;
  trend?: { value: string; isPositive: boolean };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  gradient
}) => {
  return (
    <div className={`p-6 bg-gradient-to-r ${gradient} rounded-xl shadow-lg text-white hover:shadow-xl transition-all duration-300 hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm opacity-90">{title}</p>
        </div>
        <Icon size={32} className="opacity-80" />
      </div>
    </div>
  );
};