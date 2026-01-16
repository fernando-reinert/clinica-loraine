// src/components/ProfessionalSetupModal.tsx
// Modal para configurar dados do profissional na primeira vez
import React, { useState } from 'react';
import { X, User, FileText } from 'lucide-react';
import { upsertProfessional } from '../services/professionals/professionalService';
import toast from 'react-hot-toast';

interface ProfessionalSetupModalProps {
  userId: string;
  userEmail: string;
  onComplete: (professional: any) => void;
  onCancel?: () => void;
}

const ProfessionalSetupModal: React.FC<ProfessionalSetupModalProps> = ({
  userId,
  userEmail,
  onComplete,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    license: '',
    profession: 'Enfermeira',
    phone: '',
    address: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.license) {
      toast.error('Por favor, preencha nome e registro profissional');
      return;
    }

    try {
      setLoading(true);

      const professional = await upsertProfessional({
        user_id: userId,
        email: userEmail,
        name: formData.name,
        license: formData.license,
        profession: formData.profession,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
      });

      toast.success('Dados do profissional salvos com sucesso!');
      onComplete(professional);
    } catch (error) {
      console.error('Erro ao criar profissional:', error);
      toast.error('Erro ao salvar dados do profissional');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="glass-card p-6 border border-white/10 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <User className="text-cyan-400" size={24} />
            </div>
            <h3 className="text-xl font-bold glow-text">Configurar Perfil Profissional</h3>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-300" />
            </button>
          )}
        </div>

        <p className="text-gray-300 mb-6 text-sm">
          Para continuar, precisamos de algumas informações sobre seu perfil profissional.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Nome Completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Ex: Dr. João Silva"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Coren *
            </label>
            <input
              type="text"
              value={formData.license}
              onChange={(e) => setFormData(prev => ({ ...prev, license: e.target.value }))}
              placeholder="Ex: COREN 344168"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Profissão
            </label>
            <input
              type="text"
              value={formData.profession}
              onChange={(e) => setFormData(prev => ({ ...prev, profession: e.target.value }))}
              placeholder="Ex: Enfermeira"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Telefone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="Ex: (11) 99999-9999"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              Endereço
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Ex: Rua Exemplo, 123"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="neon-button disabled:opacity-50 flex-1 flex items-center justify-center gap-2 px-6 py-3"
            >
              <FileText size={18} />
              <span>{loading ? 'Salvando...' : 'Salvar e Continuar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfessionalSetupModal;
