// src/components/SignaturePad.tsx
// Componente de assinatura manuscrita para iPad (Apple Pencil)
// Suporta captura de strokes JSON (fonte da verdade) + fallback PNG
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { X } from 'lucide-react';

// Interface para stroke (traço)
export interface SignatureStroke {
  points: Array<{ x: number; y: number }>;
  lineWidth: number;
  lineColor: string;
  timestamp: number;
}

// Interface para dados completos da assinatura
export interface SignatureData {
  strokes: SignatureStroke[];
  width: number;
  height: number;
  backgroundColor: string;
  version: string; // Para compatibilidade futura
}

interface SignaturePadProps {
  onSignatureChange?: (dataUrl: string | null) => void;
  onSignatureDataChange?: (data: SignatureData | null) => void; // Nova callback para JSON
  width?: number;
  height?: number;
  lineWidth?: number;
  lineColor?: string;
  backgroundColor?: string;
  className?: string;
  initialData?: SignatureData | null; // Carregar assinatura existente
}

export interface SignaturePadRef {
  getData: () => SignatureData | null;
  setData: (data: SignatureData | null) => void;
  clear: () => void;
  exportAsPNG: () => string | null;
  hasSignature: () => boolean;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(({
  onSignatureChange,
  onSignatureDataChange,
  width = 600,
  height = 200,
  lineWidth = 3,
  lineColor = '#000000',
  backgroundColor = '#ffffff',
  className = '',
  initialData = null,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const strokesRef = useRef<SignatureStroke[]>([]);
  const currentStrokeRef = useRef<SignatureStroke | null>(null);

  // Inicializar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Configurar canvas
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Configurar estilo de desenho
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }, [width, height, lineWidth, lineColor, backgroundColor]);

  // Carregar assinatura inicial (se fornecida)
  useEffect(() => {
    if (initialData && initialData.strokes.length > 0) {
      setData(initialData);
    }
  }, [initialData]);

  // Função para obter coordenadas do pointer/touch
  const getPoint = useCallback((e: PointerEvent | TouchEvent | React.PointerEvent | React.TouchEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      // Touch event
      const touch = e.touches[0] || (e as TouchEvent).changedTouches[0];
      if (!touch) return null;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      // Pointer event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  // Função para desenhar linha suave
  const drawLine = useCallback((ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, strokeWidth: number, strokeColor: string) => {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, []);

  // Função para desenhar com suavização e capturar stroke
  const draw = useCallback((point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Adicionar ponto ao stroke atual
    if (currentStrokeRef.current) {
      currentStrokeRef.current.points.push({ ...point });
    }

    if (lastPoint) {
      // Desenhar linha suave entre pontos
      drawLine(ctx, lastPoint, point, lineWidth, lineColor);
      
      // Suavização adicional: desenhar ponto intermediário
      const midPoint = {
        x: (lastPoint.x + point.x) / 2,
        y: (lastPoint.y + point.y) / 2,
      };
      drawLine(ctx, lastPoint, midPoint, lineWidth, lineColor);
    } else {
      // Primeiro ponto: desenhar círculo pequeno
      ctx.beginPath();
      ctx.arc(point.x, point.y, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    setLastPoint(point);
    setHasSignature(true);
    
    // Notificar mudança (PNG para compatibilidade)
    if (onSignatureChange) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }

    // Notificar mudança (JSON - fonte da verdade)
    if (onSignatureDataChange) {
      const data = getData();
      onSignatureDataChange(data);
    }
  }, [lastPoint, lineWidth, lineColor, onSignatureChange, onSignatureDataChange, drawLine]);

  // Função para obter dados JSON da assinatura
  const getData = useCallback((): SignatureData | null => {
    if (strokesRef.current.length === 0) return null;

    return {
      strokes: strokesRef.current,
      width,
      height,
      backgroundColor,
      version: '1.0',
    };
  }, [width, height, backgroundColor]);

  // Função para carregar dados JSON e renderizar
  const setData = useCallback((data: SignatureData | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (!data || !data.strokes || data.strokes.length === 0) {
      strokesRef.current = [];
      setHasSignature(false);
      if (onSignatureChange) onSignatureChange(null);
      if (onSignatureDataChange) onSignatureDataChange(null);
      return;
    }

    // Restaurar strokes
    strokesRef.current = data.strokes;
    setHasSignature(true);

    // Renderizar todos os strokes
    data.strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.strokeStyle = stroke.lineColor || lineColor;
      ctx.lineWidth = stroke.lineWidth || lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      ctx.stroke();
    });

    // Notificar mudança
    if (onSignatureChange) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }

    if (onSignatureDataChange) {
      onSignatureDataChange(data);
    }
  }, [width, height, backgroundColor, lineWidth, lineColor, onSignatureChange, onSignatureDataChange]);

  // Handlers de pointer events (iPad/Apple Pencil)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;

    setIsDrawing(true);
    setLastPoint(point);

    // Iniciar novo stroke
    currentStrokeRef.current = {
      points: [{ ...point }],
      lineWidth,
      lineColor,
      timestamp: Date.now(),
    };

    draw(point);
  }, [getPoint, draw, lineWidth, lineColor]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    // Usar requestAnimationFrame para suavizar no iPad
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const point = getPoint(e);
      if (point) {
        draw(point);
      }
    });
  }, [isDrawing, getPoint, draw]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    
    // Finalizar stroke atual
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }

    setLastPoint(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Handlers de touch events (fallback para dispositivos touch)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const point = getPoint(e);
    if (!point) return;

    setIsDrawing(true);
    setLastPoint(point);

    // Iniciar novo stroke
    currentStrokeRef.current = {
      points: [{ ...point }],
      lineWidth,
      lineColor,
      timestamp: Date.now(),
    };

    draw(point);
  }, [getPoint, draw, lineWidth, lineColor]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const point = getPoint(e);
      if (point) {
        draw(point);
      }
    });
  }, [isDrawing, getPoint, draw]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);

    // Finalizar stroke atual
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      strokesRef.current.push(currentStrokeRef.current);
      currentStrokeRef.current = null;
    }

    setLastPoint(null);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Limpar assinatura
  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setHasSignature(false);
    setLastPoint(null);
    
    if (onSignatureChange) {
      onSignatureChange(null);
    }

    if (onSignatureDataChange) {
      onSignatureDataChange(null);
    }
  }, [width, height, backgroundColor, onSignatureChange, onSignatureDataChange]);

  // Exportar como PNG (fallback)
  const exportAsPNG = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return null;
    
    return canvas.toDataURL('image/png');
  }, [hasSignature]);

  // Expor métodos via ref
  useImperativeHandle(ref, () => ({
    getData,
    setData,
    clear,
    exportAsPNG,
    hasSignature: () => hasSignature,
  }), [getData, setData, clear, exportAsPNG, hasSignature]);

  return (
    <div className={`signature-pad-container ${className}`}>
      <div className="relative border-2 border-gray-300 rounded-xl overflow-hidden bg-white" style={{ width, height }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          style={{ cursor: 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">Assine aqui</p>
          </div>
        )}
      </div>
      
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={clear}
          disabled={!hasSignature}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-gray-700"
        >
          <X size={16} />
          <span>Limpar</span>
        </button>
      </div>
    </div>
  );
});

SignaturePad.displayName = 'SignaturePad';

// Hook para validar assinatura
export const useSignatureValidation = (signatureData: SignatureData | null, minStrokes: number = 1): boolean => {
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!signatureData || !signatureData.strokes || signatureData.strokes.length === 0) {
      setIsValid(false);
      return;
    }

    // Validar se há strokes suficientes
    setIsValid(signatureData.strokes.length >= minStrokes);
  }, [signatureData, minStrokes]);

  return isValid;
};

export default SignaturePad;
