// src/components/ui/ScrollableTabs.tsx - Tabs horizontais com scroll (mobile/tablet) e layout fixo (desktop)
import React, { useRef, useEffect } from 'react';

export interface ScrollableTabsItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** Se true, o item é um botão de ação (ex: navegar) em vez de aba; usa onClick. */
  isAction?: boolean;
  onClick?: () => void;
}

export interface ScrollableTabsProps {
  items: ScrollableTabsItem[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
  /** Classe do botão ativo (neon/glass). */
  activeClassName?: string;
  /** Classe do botão inativo. */
  inactiveClassName?: string;
}

const defaultActiveClassName =
  'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-md';
const defaultInactiveClassName = 'text-gray-300 hover:bg-white/5';

export default function ScrollableTabs({
  items,
  value,
  onChange,
  className = '',
  activeClassName = defaultActiveClassName,
  inactiveClassName = defaultInactiveClassName,
}: ScrollableTabsProps) {
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const el = tabRefs.current.get(value);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [value]);

  return (
    <div className={`w-full min-w-0 ${className}`.trim()}>
      <div
        className="tabs-scroll flex items-center gap-2 overflow-x-auto overflow-y-hidden whitespace-nowrap scroll-smooth py-1"
        role="tablist"
      >
        {items.map((item) => {
          const isActive = !item.isAction && value === item.key;
          if (item.isAction && item.onClick) {
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 sm:px-4 rounded-xl transition-all duration-300 font-medium ${inactiveClassName}`}
                role="tab"
                aria-selected={false}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          }
          return (
            <button
              key={item.key}
              ref={(el) => {
                if (el) tabRefs.current.set(item.key, el);
              }}
              type="button"
              onClick={() => onChange(item.key)}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 sm:px-4 rounded-xl transition-all duration-300 font-medium ${
                isActive ? activeClassName : inactiveClassName
              }`}
              role="tab"
              aria-selected={isActive}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
