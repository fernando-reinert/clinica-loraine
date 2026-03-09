// Tela pública de cadastro staff por link (/staff-signup/:code). Email-locked; validação no submit.
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Mail, Lock, Calendar, CreditCard, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { useStaffSignup } from '../hooks/useStaffSignup';

const StaffSignupScreen: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const { submit, loading, error } = useStaffSignup();

  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      if (numbers.length < 11) return value;
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setCpf(formatCPF(e.target.value));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 32) {
      toast.error('Link inválido ou expirado.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (password.length < 8) {
      toast.error('Senha deve ter no mínimo 8 caracteres.');
      return;
    }
    const ok = await submit({
      code,
      full_name: fullName.trim(),
      birth_date: birthDate.trim() || null,
      cpf: cpf.trim() || null,
      email: email.trim(),
      password,
    });
    if (ok) {
      setSuccess(true);
    } else {
      toast.error(error ?? 'Erro ao criar conta.');
    }
  };

  if (!code) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md text-center">
          <p className="text-gray-400 mb-4">Link inválido. Use o link recebido por e-mail.</p>
          <Link to="/login" className="text-indigo-400 hover:underline">Ir para login</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md text-center">
          <CheckCircle className="mx-auto text-green-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-white mb-2">Conta criada</h2>
          <p className="text-gray-400 mb-6">
            Aguarde ativação do administrador. Você receberá aviso quando puder acessar.
          </p>
          <Link
            to="/login"
            className="inline-block neon-button min-h-[44px] px-6 flex items-center justify-center"
          >
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 w-full max-w-full overflow-x-hidden">
      <div className="w-full max-w-md space-y-6 min-w-0">
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative z-10 text-center">
            <h1 className="text-2xl font-bold glow-text mb-2">Clínica Áurea</h1>
            <p className="text-gray-300">Cadastro de equipe — use o e-mail do convite</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-8 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Nome completo *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Seu nome"
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">E-mail (do convite) *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@exemplo.com"
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Data de nascimento</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">CPF</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                maxLength={14}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Senha *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mín. 8 caracteres, maiúscula, minúscula, número e símbolo"
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Confirmar senha *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Repita a senha"
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full neon-button min-h-[44px] flex items-center justify-center gap-2"
          >
            {loading ? <LoadingSpinner size="sm" className="text-white" /> : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm">
          Já tem conta? <Link to="/login" className="text-indigo-400 hover:underline">Fazer login</Link>
        </p>
      </div>
    </div>
  );
};

export default StaffSignupScreen;
