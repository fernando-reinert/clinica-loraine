/**
 * ImageCarousel — carrossel leve com scroll-snap, setas e dots
 * Suporta swipe (touch), setas no hover/desktop, indicadores por índice
 */
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export interface CarouselImage {
  id: string;
  url: string;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  variant?: 'before' | 'after';
  /** Controlled: current slide index (use with onChangeIndex) */
  activeIndex?: number;
  /** Called when user changes slide (scroll/arrows/dots) */
  onChangeIndex?: (index: number) => void;
  /** Called when user clicks an image (e.g. open lightbox at this index) */
  onImageClick?: (index: number) => void;
  onDelete?: (imageId: string) => void;
  onAddMore?: () => void;
  disabled?: boolean;
  className?: string;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  variant = 'before',
  activeIndex: controlledIndex,
  onChangeIndex,
  onImageClick,
  onDelete,
  onAddMore,
  disabled = false,
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalIndex, setInternalIndex] = useState(0);
  const isControlled = controlledIndex !== undefined && onChangeIndex !== undefined;
  const currentIndex = isControlled ? Math.max(0, Math.min(controlledIndex, images.length - 1)) : internalIndex;
  const borderColor = variant === 'before' ? 'border-cyan-400/50' : 'border-purple-400/50';

  const updateIndex = () => {
    const el = scrollRef.current;
    if (!el || images.length === 0) return;
    const scrollLeft = el.scrollLeft;
    const itemWidth = el.offsetWidth;
    const index = Math.round(scrollLeft / itemWidth);
    const next = Math.min(index, images.length - 1);
    if (isControlled) {
      onChangeIndex?.(next);
    } else {
      setInternalIndex(next);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateIndex);
    return () => el.removeEventListener('scroll', updateIndex);
  }, [images.length, isControlled]);

  // Sync scroll position when controlled index changes (e.g. after delete)
  useEffect(() => {
    if (!isControlled || controlledIndex === undefined) return;
    const el = scrollRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(controlledIndex, images.length - 1));
    const wantLeft = target * el.offsetWidth;
    if (Math.abs(el.scrollLeft - wantLeft) > 2) {
      el.scrollTo({ left: wantLeft, behavior: 'smooth' });
    }
  }, [isControlled, controlledIndex, images.length]);

  const scrollTo = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(index, images.length - 1));
    el.scrollTo({ left: target * el.offsetWidth, behavior: 'smooth' });
    if (isControlled) {
      onChangeIndex?.(target);
    } else {
      setInternalIndex(target);
    }
  };

  if (images.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[180px] rounded-xl border-2 border-dashed ${variant === 'before' ? 'border-cyan-400/40 bg-cyan-500/5' : 'border-purple-400/40 bg-purple-500/5'} ${className}`}>
        {onAddMore && (
          <button
            type="button"
            onClick={onAddMore}
            disabled={disabled}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all ${variant === 'before' ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-purple-400 hover:bg-purple-500/10'}`}
          >
            <Plus size={32} />
            <span className="font-medium text-sm">Adicionar</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`group relative w-full min-h-[180px] rounded-xl overflow-hidden ${borderColor} border ${className}`}>
      <div
        ref={scrollRef}
        className="scrollbar-hide flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth w-full h-full min-h-[180px] touch-pan-x"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onScroll={updateIndex}
      >
        {images.map((img, index) => (
          <div
            key={img.id}
            className="relative flex-shrink-0 w-full min-h-[180px] snap-center"
            style={{ aspectRatio: '4/3' }}
          >
            <img
              src={img.url}
              alt=""
              className={`w-full h-full object-cover ${onImageClick ? 'cursor-pointer' : ''}`}
              onClick={() => onImageClick?.(index)}
              role={onImageClick ? 'button' : undefined}
              aria-label={onImageClick ? `Ver imagem ${index + 1}` : undefined}
            />
          </div>
        ))}
      </div>

      {/* Arrows — visíveis em hover/desktop */}
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-0 pointer-events-none disabled:pointer-events-none sm:pointer-events-auto"
            aria-label="Anterior"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            type="button"
            onClick={() => scrollTo(currentIndex + 1)}
            disabled={currentIndex >= images.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-0 pointer-events-none disabled:pointer-events-none sm:pointer-events-auto"
            aria-label="Próximo"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollTo(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentIndex
                  ? variant === 'before'
                    ? 'bg-cyan-400 w-4'
                    : 'bg-purple-400 w-4'
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
