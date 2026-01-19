import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Componente Modal/Lightbox para visualizar imagens em tamanho grande
 * Suporta navegação entre múltiplas imagens
 */
import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
const ImageLightbox = ({ isOpen, images, currentIndex, onClose, onNavigate, }) => {
    const currentImage = images[currentIndex];
    // Fechar com ESC
    useEffect(() => {
        if (!isOpen)
            return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        const handleArrowKeys = (e) => {
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
                onNavigate?.(currentIndex - 1);
            }
            else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
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
    if (!isOpen || !currentImage)
        return null;
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
    return (_jsxs("div", { className: "fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4", onClick: onClose, children: [_jsx("button", { onClick: onClose, className: "absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10", "aria-label": "Fechar", children: _jsx(X, { size: 24, className: "text-white" }) }), hasPrevious && (_jsx("button", { onClick: (e) => {
                    e.stopPropagation();
                    handlePrevious();
                }, className: "absolute left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10", "aria-label": "Imagem anterior", children: _jsx(ChevronLeft, { size: 24, className: "text-white" }) })), hasNext && (_jsx("button", { onClick: (e) => {
                    e.stopPropagation();
                    handleNext();
                }, className: "absolute right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10", "aria-label": "Pr\u00F3xima imagem", children: _jsx(ChevronRight, { size: 24, className: "text-white" }) })), _jsxs("div", { className: "relative max-w-[90vw] max-h-[90vh] flex items-center justify-center", onClick: (e) => e.stopPropagation(), children: [_jsx("img", { src: currentImage.url, alt: currentImage.name || `Imagem ${currentIndex + 1}`, className: "max-w-full max-h-[90vh] object-contain rounded-lg", onError: (e) => {
                            // Fallback se imagem não carregar
                            e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23333" width="400" height="300"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-size="16"%3EImagem não disponível%3C/text%3E%3C/svg%3E';
                        } }), currentImage.name && (_jsxs("div", { className: "absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg", children: [_jsx("p", { className: "text-white text-sm", children: currentImage.name }), images.length > 1 && (_jsxs("p", { className: "text-gray-300 text-xs mt-1", children: [currentIndex + 1, " de ", images.length] }))] })), images.length > 1 && !currentImage.name && (_jsx("div", { className: "absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg", children: _jsxs("p", { className: "text-gray-300 text-xs", children: [currentIndex + 1, " de ", images.length] }) }))] })] }));
};
export default ImageLightbox;
