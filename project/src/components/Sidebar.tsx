// src/components/Sidebar.tsx
import React from 'react';
import { 
  Home, 
  Users, 
  Calendar, 
  DollarSign, 
  Camera, 
  FileText, 
  Settings, 
  UserPlus,
  Stethoscope,
  GalleryVerticalEnd,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();

  const navigation = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Pacientes', href: '/patients' },
    { icon: UserPlus, label: 'Novo Paciente', href: '/patients/new' },
    { icon: Calendar, label: 'Agenda', href: '/appointments' },
    { icon: Stethoscope, label: 'Consultas', href: '/appointments/list' },
    { icon: DollarSign, label: 'Financeiro', href: '/financial-control' },
    { icon: FileText, label: 'Prontuários', href: '/clinical-record' },
    { icon: GalleryVerticalEnd, label: 'Formulários', href: '/anamnese' },
    { icon: Camera, label: 'Galeria', href: '/gallery' },
    { icon: Settings, label: 'Configurações', href: '/settings' },
  ];

  return (
    <div className={`flex flex-col h-screen bg-gradient-to-b from-purple-900 to-pink-900 text-white ${
      isOpen ? 'w-64' : 'w-20'
    } transition-all duration-300`}>
      
      {/* Header - ALTURA FIXA */}
      <div className="p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          {isOpen && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center">
                <Stethoscope size={20} />
              </div>
              <div>
                <h1 className="font-bold text-white">Clínica</h1>
                <p className="text-xs text-purple-200">Loraine</p>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title={isOpen ? "Recolher menu" : "Expandir menu"}
          >
            {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
        </div>
      </div>

      {/* Navegação - PREENCHE O ESPAÇO DISPONÍVEL */}
      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  flex items-center gap-3 p-3 rounded-xl transition-all group
                  ${isActive 
                    ? 'bg-white/10 text-white shadow-lg' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }
                  ${isOpen ? 'justify-start' : 'justify-center'}
                `}
                title={!isOpen ? item.label : ''}
              >
                <Icon size={20} />
                {isOpen && <span className="font-medium">{item.label}</span>}
                
                {!isOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap pointer-events-none">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer - ALTURA FIXA */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        {isOpen ? (
          <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-500 rounded-lg flex items-center justify-center">
              <span className="font-bold text-xs">L</span>
            </div>
            <div>
              <p className="text-sm font-semibold">Dra. Loraine</p>
              <p className="text-xs text-purple-200">Médica</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div 
              className="w-8 h-8 bg-gradient-to-r from-pink-400 to-rose-500 rounded-lg flex items-center justify-center cursor-pointer"
              title="Dra. Loraine"
            >
              <span className="font-bold text-xs">L</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;