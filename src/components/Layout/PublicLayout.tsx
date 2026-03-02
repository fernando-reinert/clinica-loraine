// src/components/Layout/PublicLayout.tsx – minimal layout for public pages (no sidebar/auth)
import React from 'react';

export interface PublicLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`min-h-dvh w-full max-w-full overflow-x-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col ${className}`}
    >
      {children}
    </div>
  );
};

export default PublicLayout;
