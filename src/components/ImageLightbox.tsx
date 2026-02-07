/**
 * Componente Modal/Lightbox para visualizar imagens em tamanho grande
 * Suporta navegação entre múltiplas imagens, teclado (ESC, setas) e swipe em mobile
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const SWIPE_THRESHOLD = 50;

export interface ImageLightboxProps {
  isOpen: boolean;
  images: Array<{ id: string; url: string; name?: string }>;
  currentIndex: number;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  images,
  currentIndex,
  onClose,
  onNavigate,
}) => {
  const currentImage = images[currentIndex];
  const touchStartX = useRef<number>(0);

  // Touch swipe: store start X
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  // Touch swipe: on end, navigate if delta exceeds threshold
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const endX = e.changedTouches[0].clientX;
    const delta = touchStartX.current - endX;
    if (Math.abs(delta) < SWIPE_THRESHOLD || !onNavigate) return;
    if (delta > 0 && currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1); // swipe left -> next
    } else if (delta < 0 && currentIndex > 0) {
      onNavigate(currentIndex - 1); // swipe right -> previous
    }
  }, [currentIndex, images.length, onNavigate]);

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleArrowKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        onNavigate?.(currentIndex - 1);
      } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        onNavigate?.(currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleEscape);
    window.addEventListener('keydown', handleArrowKeys);

    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleArrowKeys);
    };
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen || !currentImage) return null;

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      onNavigate?.(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate?.(currentIndex + 1);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Botão Fechar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
        aria-label="Fechar"
      >
        <X size={24} className="text-white" />
      </button>

      {/* Navegação Anterior */}
      {hasPrevious && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrevious();
          }}
          className="absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          aria-label="Imagem anterior"
        >
          <ChevronLeft size={24} className="text-white" />
        </button>
      )}

      {/* Navegação Próxima */}
      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          aria-label="Próxima imagem"
        >
          <ChevronRight size={24} className="text-white" />
        </button>
      )}

      {/* Container da Imagem — swipe no conteúdo navega; clique não fecha */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={currentImage.url}
          alt={currentImage.name || `Imagem ${currentIndex + 1}`}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
          onError={(e) => {
            // Fallback se imagem não carregar
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="16"%3EImagem não disponível%3C/text%3E%3C/svg%3E';
          }}
        />

        {/* Informações da Imagem */}
        {currentImage.name && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg">
            <p className="text-white text-sm">{currentImage.name}</p>
            {images.length > 1 && (
              <p className="text-gray-300 text-xs mt-1">
                {currentIndex + 1} de {images.length}
              </p>
            )}
          </div>
        )}

        {/* Indicador de múltiplas imagens */}
        {images.length > 1 && !currentImage.name && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg">
            <p className="text-gray-300 text-xs">
              {currentIndex + 1} de {images.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
