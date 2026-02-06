/**
 * ImagePicker - componente reutilizável para seleção de imagem
 * Suporta: galeria do dispositivo, câmera (mobile), drag & drop (desktop)
 * Valida: tipo image/*, tamanho máx 10MB
 * Estilo: glass-card, neon-button, área de drop com border-dashed e hover glow
 */
import React, { useState, useRef, useEffect } from "react";
import { Upload, Camera, X, Image as ImageIcon } from "lucide-react";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ACCEPT = "image/*";

export interface ImagePickerProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "Selecione apenas imagens (JPG, PNG, etc.)." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { valid: false, error: `Tamanho máximo: 10 MB (arquivo: ${formatFileSize(file.size)}).` };
  }
  return { valid: true };
}

const ImagePicker: React.FC<ImagePickerProps> = ({
  value = null,
  onChange,
  disabled = false,
  label = "Foto",
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      setError(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const processFile = (file: File | null) => {
    if (!file) {
      onChange(null);
      setError(null);
      return;
    }
    const result = isValidImageFile(file);
    if (!result.valid) {
      setError(result.error ?? "Arquivo inválido.");
      return;
    }
    setError(null);
    onChange(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    processFile(file);
    e.target.value = "";
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0] ?? null;
    processFile(file);
  };

  const handleRemove = () => {
    onChange(null);
    setError(null);
    fileInputRef.current?.value && (fileInputRef.current.value = "");
    cameraInputRef.current?.value && (cameraInputRef.current.value = "");
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
      )}

      {/* Área de drop + botões */}
      <div className="glass-card border border-white/10 rounded-2xl overflow-hidden">
        {/* Zona de drag & drop */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-2xl m-3 p-6 transition-all duration-300
            ${dragActive ? "border-cyan-400/60 bg-cyan-500/10" : "border-white/20 hover:border-cyan-400/40 hover:bg-white/5"}
            ${disabled ? "opacity-60 pointer-events-none" : "cursor-pointer"}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            onChange={handleInputChange}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="Selecionar foto"
          />
          <div className="flex flex-col items-center justify-center text-center pointer-events-none">
            <div className="p-3 rounded-2xl bg-white/10 border border-white/20 mb-2">
              <Upload className="text-cyan-300" size={28} />
            </div>
            <p className="text-white font-medium">Arraste e solte aqui</p>
            <p className="text-gray-400 text-sm mt-1">ou clique para escolher</p>
          </div>
        </div>

        {/* Botões: Selecionar foto + Tirar foto */}
        <div className="flex flex-col sm:flex-row gap-3 p-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="neon-button flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ImageIcon size={18} />
            <span>Selecionar foto</span>
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept={ACCEPT}
            capture="environment"
            onChange={handleInputChange}
            disabled={disabled}
            className="hidden"
            aria-label="Abrir câmera"
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            className="neon-button flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera size={18} />
            <span>Tirar foto</span>
          </button>
        </div>
      </div>

      {/* Mensagem de erro de validação */}
      {error && (
        <p className="text-sm text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Preview: miniatura + nome + tamanho + Remover */}
      {value && previewUrl && (
        <div className="glass-card border border-white/10 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-white/20 bg-white/5">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate" title={value.name}>
              {value.name}
            </p>
            <p className="text-gray-400 text-sm">{formatFileSize(value.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Remover"
          >
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImagePicker;
