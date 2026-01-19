import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/components/StickerPhotoUploader.tsx
// Componente para upload de foto do adesivo do produto
import { useState, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon, ZoomIn } from 'lucide-react';
const StickerPhotoUploader = ({ onUpload, existingPhotos = [], onDelete, maxPhotos = 5, }) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const handleFileSelect = async (file) => {
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione uma imagem');
            return;
        }
        // Criar preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result);
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
        }
        catch (error) {
            console.error('Erro ao fazer upload:', error);
            alert('Erro ao fazer upload da foto');
        }
        finally {
            setUploading(false);
        }
    };
    const handleFileInputChange = (e) => {
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
    const handleDelete = async (id) => {
        if (!onDelete)
            return;
        if (!confirm('Tem certeza que deseja excluir esta foto?'))
            return;
        try {
            await onDelete(id);
        }
        catch (error) {
            console.error('Erro ao deletar foto:', error);
            alert('Erro ao deletar foto');
        }
    };
    const canAddMore = existingPhotos.length < maxPhotos;
    return (_jsxs("div", { className: "glass-card p-6 border border-white/10", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsx(ImageIcon, { className: "text-purple-300", size: 24 }), _jsx("h3", { className: "text-xl font-bold glow-text", children: "Foto do Adesivo do Produto" })] }), _jsxs("div", { className: "space-y-6", children: [canAddMore && (_jsxs("div", { className: "flex flex-wrap gap-4", children: [_jsxs("button", { type: "button", onClick: handleCameraClick, disabled: uploading, className: "neon-button disabled:opacity-50 flex items-center gap-2 px-6 py-3", children: [_jsx(Camera, { size: 20 }), _jsx("span", { children: "Tirar Foto" })] }), _jsxs("button", { type: "button", onClick: handleFileClick, disabled: uploading, className: "px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all flex items-center gap-2 disabled:opacity-50", children: [_jsx(Upload, { size: 20 }), _jsx("span", { children: "Selecionar Arquivo" })] })] })), _jsx("input", { ref: cameraInputRef, type: "file", accept: "image/*", capture: "environment", onChange: handleFileInputChange, className: "hidden" }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleFileInputChange, className: "hidden" }), preview && (_jsxs("div", { className: "relative", children: [_jsx("img", { src: preview, alt: "Preview", className: "w-full max-w-md mx-auto rounded-xl border border-white/10" }), uploading && (_jsx("div", { className: "absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl", children: _jsx("div", { className: "text-white", children: "Enviando..." }) }))] })), existingPhotos.length > 0 && (_jsxs("div", { children: [_jsxs("h4", { className: "text-sm font-semibold text-gray-300 mb-4", children: ["Fotos Adicionadas (", existingPhotos.length, ")"] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 gap-4", children: existingPhotos.map((photo) => (_jsxs("div", { className: "relative group", children: [_jsx("img", { src: photo.url, alt: photo.fileName || 'Foto do adesivo', className: "w-full h-32 object-cover rounded-xl border border-white/10 cursor-pointer hover:border-cyan-400 transition-colors", onClick: () => setSelectedPhoto(photo.url) }), onDelete && (_jsx("button", { onClick: () => handleDelete(photo.id), className: "absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx(X, { size: 16, className: "text-white" }) })), _jsx("div", { className: "absolute bottom-2 left-2 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition-opacity", children: _jsx(ZoomIn, { size: 16, className: "text-white" }) })] }, photo.id))) })] })), existingPhotos.length === 0 && !preview && (_jsxs("div", { className: "text-center py-8 text-gray-400", children: [_jsx(ImageIcon, { size: 48, className: "mx-auto mb-4 opacity-50" }), _jsx("p", { children: "Nenhuma foto adicionada ainda" }), _jsx("p", { className: "text-sm mt-2", children: "Tire uma foto ou selecione um arquivo do adesivo do produto" })] }))] }), selectedPhoto && (_jsx("div", { className: "fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4", onClick: () => setSelectedPhoto(null), children: _jsxs("div", { className: "relative max-w-4xl max-h-full", children: [_jsx("img", { src: selectedPhoto, alt: "Foto em tela cheia", className: "max-w-full max-h-[90vh] object-contain rounded-xl" }), _jsx("button", { onClick: () => setSelectedPhoto(null), className: "absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors", children: _jsx(X, { size: 24, className: "text-white" }) })] }) }))] }));
};
export default StickerPhotoUploader;
