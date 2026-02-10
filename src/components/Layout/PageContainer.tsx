// src/components/Layout/PageContainer.tsx - Container global reutilizável (responsividade arquitetural)
import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div
      className={`
        w-full
        max-w-screen-2xl
        mx-auto
        px-4 sm:px-6 lg:px-8
        min-w-0
        overflow-x-hidden
        ${className}
      `.trim()}
    >
      {children}
    </div>
  );
}
