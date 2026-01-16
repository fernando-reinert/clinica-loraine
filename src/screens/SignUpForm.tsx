import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const SignUpForm: React.FC = () => {
  const { signUp, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profession, setProfession] = useState(''); // Novo estado para a profissão
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await signUp(email, password, name, profession); // Passando profissão para o signUp
      toast.success('Conta criada com sucesso!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Nome completo</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="holo-input w-full"
          placeholder="Digite seu nome"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="holo-input w-full"
          placeholder="Digite seu email"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Senha</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="holo-input w-full pr-12"
            placeholder="Digite sua senha"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-200 mb-2">Profissão</label>
        <input
          type="text"
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          className="holo-input w-full"
          placeholder="Digite sua profissão"
          required
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full neon-button flex items-center justify-center"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <LoadingSpinner size="sm" className="text-white" />
            <span>Criando conta...</span>
          </span>
        ) : (
          <span className="font-semibold">Criar conta</span>
        )}
      </button>
    </form>
  );
};

export default SignUpForm;
