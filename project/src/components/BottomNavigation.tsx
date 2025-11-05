import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, Camera, User } from 'lucide-react';

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'dashboard', label: 'Início', icon: Home, path: '/' },
    { id: 'patients', label: 'Pacientes', icon: Users, path: '/patients' },
    { id: 'appointments', label: 'Agenda', icon: Calendar, path: '/appointments' },
    { id: 'gallery', label: 'Galeria', icon: Camera, path: '/gallery' },
    { id: 'profile', label: 'Perfil', icon: User, path: '/profile' }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 to-pink-500 text-white border-t border-gray-700 safe-area-bottom shadow-xl">
      <div className="flex justify-around items-center py-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-transform transform ${
                isActive
                  ? 'scale-110 text-white' // Maior e com cor branca quando ativo
                  : 'text-gray-200 hover:text-white hover:scale-105'
              }`}
            >
              <Icon size={28} className={`${isActive ? 'text-white' : 'text-gray-300'}`} />
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;
