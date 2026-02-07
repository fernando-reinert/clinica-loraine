// src/components/MobileBottomNav.tsx
import React from 'react';
import { Home, Users, Calendar, DollarSign, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Pacientes', href: '/patients' },
    { icon: Calendar, label: 'Agenda', href: '/appointments' },
    { icon: DollarSign, label: 'Financeiro', href: '/financial-control' },
    { icon: Settings, label: 'Config', href: '/settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full max-w-full bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)] lg:hidden z-50">
      <div className="flex justify-around items-center py-2 min-w-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center p-2 rounded-lg transition-all min-w-0 flex-1 max-w-full ${
                isActive 
                  ? 'text-purple-600 bg-purple-50' 
                  : 'text-gray-500 hover:text-purple-600'
              }`}
            >
              <Icon size={20} className="shrink-0" />
              <span className="text-xs mt-1 font-medium whitespace-normal break-words w-full text-center min-w-0">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNav;