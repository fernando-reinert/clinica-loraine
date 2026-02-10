// src/components/MobileBottomNav.tsx - Bottom nav mobile/tablet (neon/glass) — 7 itens
import React from 'react';
import { Home, Users, UserPlus, Calendar, DollarSign, Package, Settings, type LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type NavItem = {
  icon: LucideIcon;
  label: string;
  shortLabel: string;
  href: string;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    icon: Home,
    label: 'Dashboard',
    shortLabel: 'Início',
    href: '/dashboard',
    isActive: (path) => path === '/dashboard' || path.startsWith('/dashboard/'),
  },
  {
    icon: Users,
    label: 'Pacientes',
    shortLabel: 'Pacientes',
    href: '/patients',
    isActive: (path) => path.startsWith('/patients') && !path.startsWith('/patients/new'),
  },
  {
    icon: UserPlus,
    label: 'Novo Paciente',
    shortLabel: 'Novo',
    href: '/patients/new',
    isActive: (path) => path.startsWith('/patients/new'),
  },
  {
    icon: Calendar,
    label: 'Agenda',
    shortLabel: 'Agenda',
    href: '/appointments/new',
    isActive: (path) => path.startsWith('/appointments'),
  },
  {
    icon: DollarSign,
    label: 'Financeiro',
    shortLabel: 'Fin.',
    href: '/financial-control',
    isActive: (path) => path.startsWith('/financial-control'),
  },
  {
    icon: Package,
    label: 'Catálogo',
    shortLabel: 'Catálogo',
    href: '/procedures',
    isActive: (path) => path.startsWith('/procedures'),
  },
  {
    icon: Settings,
    label: 'Config',
    shortLabel: 'Config',
    href: '/profile',
    isActive: (path) => path.startsWith('/profile'),
  },
];

const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 w-full lg:hidden min-h-[var(--bottom-nav-h)] pb-[env(safe-area-inset-bottom)] neon-nav overflow-x-hidden"
      role="navigation"
      aria-label="Menu principal"
    >
      <div className="max-w-screen-2xl mx-auto px-1 sm:px-2 min-w-0 overflow-x-hidden min-h-[var(--bottom-nav-h)] flex flex-col justify-center">
        <div className="grid grid-cols-7 gap-0.5 sm:gap-0.5 md:gap-1 min-w-0 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive(location.pathname);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`
                  flex flex-col items-center justify-center min-w-0 py-2 px-1 sm:py-3 sm:px-2 rounded-xl
                  neon-nav-item
                  ${isActive ? 'neon-nav-item--active' : ''}
                `}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <Icon size={20} className="shrink-0 flex-shrink-0" aria-hidden />
                <span className="text-[9px] sm:text-[10px] md:text-xs font-medium leading-none truncate w-full text-center min-w-0 mt-1">
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
