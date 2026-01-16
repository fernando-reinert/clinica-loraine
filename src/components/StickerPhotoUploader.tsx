// src/components/StickerPhotoUploader.tsx
// Componente para upload de foto do adesivo do produto
import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon, ZoomIn } from 'lucide-react';

interface StickerPhotoUploaderProps {
  onUpload: (file: File) => Promise<void>;
  existingPhotos?: Array<{
    id: string;
    url: string;
    fileName?: string;
  }>;
  onDelete?: (id: string) => Promise<void>;
  maxPhotos?: number;
}

const StickerPhotoUploader: React.FC<StickerPhotoUploaderProps> = ({
  onUpload,
  existingPhotos = [],
  onDelete,
  maxPhotos = 5,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem');
      return;
    }

    // Criar preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      setUploading(true);
      await onUpload(file);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    if (!confirm('Tem certeza que deseja excluir esta foto?')) return;

    try {
      await onDelete(id);
    } catch (error) {
      console.error('Erro ao deletar foto:', error);
      alert('Erro ao deletar foto');
    }
  };

  const canAddMore = existingPhotos.length < maxPhotos;

  return (
    <div className="glass-card p-6 border border-white/10">
      <div className="flex items-center gap-3 mb-6">
        <ImageIcon className="text-purple-300" size={24} />
        <h3 className="text-xl font-bold glow-text">Foto do Adesivo do Produto</h3>
      </div>

      <div className="space-y-6">
        {/* Botões de upload */}
        {canAddMore && (
          <div className="flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={uploading}
              className="neon-button disabled:opacity-50 flex items-center gap-2 px-6 py-3"
            >
              <Camera size={20} />
              <span>Tirar Foto</span>
            </button>
            <button
              type="button"
              onClick={handleFileClick}
              disabled={uploading}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Upload size={20} />
              <span>Selecionar Arquivo</span>
            </button>
          </div>
        )}

        {/* Inputs ocultos */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInputChange}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Preview durante upload */}
        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full max-w-md mx-auto rounded-xl border border-white/10"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                <div className="text-white">Enviando...</div>
              </div>
            )}
          </div>
        )}

        {/* Fotos existentes */}
        {existingPhotos.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-4">
              Fotos Adicionadas ({existingPhotos.length})
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {existingPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.url}
                    alt={photo.fileName || 'Foto do adesivo'}
                    className="w-full h-32 object-cover rounded-xl border border-white/10 cursor-pointer hover:border-cyan-400 transition-colors"
                    onClick={() => setSelectedPhoto(photo.url)}
                  />
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} className="text-white" />
                    </button>
                  )}
                  <div className="absolute bottom-2 left-2 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn size={16} className="text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {existingPhotos.length === 0 && !preview && (
          <div className="text-center py-8 text-gray-400">
            <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nenhuma foto adicionada ainda</p>
            <p className="text-sm mt-2">Tire uma foto ou selecione um arquivo do adesivo do produto</p>
          </div>
        )}
      </div>

      {/* Modal de visualização em tela cheia */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedPhoto}
              alt="Foto em tela cheia"
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StickerPhotoUploader;
