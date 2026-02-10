// src/components/ui/PageContainer.tsx - Container principal padronizado (mobile-first)
import React from 'react';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`mx-auto w-full max-w-7xl min-w-0 px-4 sm:px-6 lg:px-8 ${className}`.trim()}
    >
      {children}
    </div>
  );
};

export default PageContainer;
