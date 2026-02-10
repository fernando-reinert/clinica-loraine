// src/components/Layout/ResponsiveAppLayout.tsx - Layout responsivo: sidebar (desktop) / bottom nav (mobile-tablet)
import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar';
import MobileBottomNav from '../MobileBottomNav';
import PageHeader from '../ui/PageHeader';
import PageContainer from './PageContainer';

/** Breakpoint lg = 1024px: abaixo disso o bottom-nav está visível. */
const BOTTOM_NAV_MEDIA = '(max-width: 1023px)';

export interface ResponsiveAppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightSlot?: React.ReactNode;
  className?: string;
}

const ResponsiveAppLayout: React.FC<ResponsiveAppLayoutProps> = ({
  children,
  title = 'Dashboard',
  subtitle,
  showBack = false,
  rightSlot,
  className = '',
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasBottomNav, setHasBottomNav] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(BOTTOM_NAV_MEDIA);
    const update = () => setHasBottomNav(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <div className="min-h-dvh w-full overflow-x-hidden flex bg-transparent">
      {/* Sidebar: apenas desktop (lg+), shrink-0 para não encolher */}
      <div
        className={`
          ${isSidebarOpen ? 'w-80' : 'w-24'}
          transition-all duration-500 ease-out
          sidebar-futurist
          fixed inset-0 z-40
          h-dvh
          overflow-y-auto
          shrink-0
          hidden lg:block
        `}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </div>

      {/* Overlay para mobile (sidebar não usado em < lg) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* Coluna de conteúdo: flex-1 min-w-0; has-bottom-nav ativa padding no .main-scroll-area (mobile/tablet) */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-0 transition-all duration-500 ${isSidebarOpen ? 'lg:ml-80' : 'lg:ml-24'} ${hasBottomNav ? 'has-bottom-nav' : ''}`}
      >
        <PageContainer className="flex flex-col flex-1 min-h-0 min-w-0">
          <div className="flex-shrink-0 min-w-0 pt-4 sm:pt-6">
            <PageHeader
              title={title}
              subtitle={subtitle}
              showBack={showBack}
              rightSlot={rightSlot}
            />
          </div>

          <main
            className={`
              flex-1 min-h-0 min-w-0 main-scroll-area overflow-x-hidden
              py-4 sm:py-6
              ${className}
            `.trim()}
          >
            {children}
          </main>
        </PageContainer>
      </div>

      {/* Bottom nav: apenas mobile/tablet (< lg) */}
      <MobileBottomNav />
    </div>
  );
};

export default ResponsiveAppLayout;
