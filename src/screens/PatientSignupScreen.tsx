// src/screens/PatientSignupScreen.tsx
// Tela pública de cadastro de paciente via link
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, Mail, Calendar, User, MapPin, CreditCard, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase/client";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  getSignupFormByToken,
  updateSignupFormAnswers,
  completePatientSignup,
} from "../services/signupFormService";

const PatientSignupScreen: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expired, setExpired] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Carregar formulário ao montar
  useEffect(() => {
    if (shareToken) {
      loadForm();
    }
  }, [shareToken]);

  const loadForm = async () => {
    if (!shareToken) {
      toast.error("Link inválido");
      return;
    }

    setLoading(true);
    try {
      const form = await getSignupFormByToken(shareToken);

      if (!form) {
        toast.error('Formulário não encontrado ou link expirado. Se o problema persistir, verifique se a migration foi executada no Supabase.');
        setExpired(true);
        return;
      }

      // Verificar expiração
      if (new Date(form.share_expires_at) < new Date()) {
        toast.error('Este link expirou. Solicite um novo link à clínica.');
        setExpired(true);
        return;
      }

      // Verificar se já foi completado
      if (form.status === 'completed') {
        setCompleted(true);
        toast.success('Este cadastro já foi completado!');
        return;
      }

      // Carregar dados salvos do payload (se houver)
      const savedData = (form as any).payload || (form as any).answers || {};
      if (savedData && typeof savedData === 'object' && !Array.isArray(savedData)) {
        setName(savedData.name || "");
        setEmail(savedData.email || "");
        setPhone(savedData.phone || "");
        setCpf(savedData.cpf || "");
        setBirthDate(savedData.birth_date || "");
        setAddress(savedData.address || "");
      }
    } catch (error: any) {
      toast.error('Erro ao carregar formulário');
      setExpired(true);
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      if (numbers.length < 11) return value;
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      if (numbers.length < 11) return value;
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => setPhone(formatPhone(e.target.value));
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => setCpf(formatCPF(e.target.value));

  // Salvar progresso no payload (auto-save) - USANDO RPC
  const saveProgress = async () => {
    if (!shareToken || completed || expired) return;

    try {
      // Usar RPC ao invés de update direto na tabela
      const answers = {
        name: name || '',
        email: email || '',
        phone: phone || '',
        cpf: cpf || '',
        birth_date: birthDate || '',
        address: address || '',
      };

      await updateSignupFormAnswers(shareToken, answers);
    } catch (error) {
      // Silencioso, não interrompe o preenchimento
    }
  };

  // Auto-save com debounce (500ms para evitar spam)
  useEffect(() => {
    if (!shareToken || completed || expired) return;

    const timeoutId = setTimeout(() => {
      saveProgress();
    }, 500); // Reduzido para 500ms conforme solicitado

    return () => clearTimeout(timeoutId);
  }, [name, email, phone, cpf, birthDate, address, shareToken, completed, expired]);

  const handleSubmit = async () => {
    if (!name || !phone || !cpf || !birthDate) {
      toast.error("Por favor, preencha todos os campos obrigatórios (Nome, Telefone, CPF e Data de Nascimento).");
      return;
    }

    if (!shareToken) {
      toast.error("Token inválido");
      return;
    }

    setSaving(true);
    try {
      const result = await completePatientSignup(shareToken, {
        name,
        phone,
        cpf: cpf.replace(/\D/g, ""), // Remover formatação
        birth_date: birthDate,
        email: email || undefined,
        address: address || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Erro ao completar cadastro");
        return;
      }

      // FLUXO PÚBLICO: Sempre usar anamnese_token para redirecionar para rota pública
      if (!result.anamnese_token) {
        toast.error("Erro ao gerar link da anamnese. Tente novamente.");
        return;
      }

      toast.success("Cadastro concluído! Redirecionando para a anamnese...");

      // Redirecionar para anamnese PÚBLICA (rota pública, sem autenticação)
      navigate(`/patient-form/${result.anamnese_token}`, { replace: true });
    } catch (error: any) {
      toast.error(`Erro ao completar cadastro: ${error?.message || "Tente novamente"}`);
    } finally {
      setSaving(false);
    }
  };

  // Estados de carregamento/erro
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card px-8 py-6 text-center">
          <LoadingSpinner size="lg" className="text-blue-500 mx-auto mb-4" />
          <p className="mt-4 text-sm text-slate-200">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card max-w-md w-full p-8 text-center border border-white/10">
          <h1 className="text-2xl font-bold text-slate-50 mb-3">Link inválido ou expirado</h1>
          <p className="text-sm text-slate-300 mb-6">
            Este link de cadastro não existe mais ou já expirou.
          </p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card max-w-md w-full p-8 text-center border border-white/10">
          <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-50 mb-3">Cadastro concluído!</h1>
          <p className="text-sm text-slate-300 mb-6">
            Redirecionando para o formulário de anamnese...
          </p>
          <LoadingSpinner size="sm" className="text-blue-500 mx-auto" />
        </div>
      </div>
    );
  }

  // Layout principal (mesmo padrão do NewPatient.tsx)
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header futurista */}
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30">
                  <User className="text-blue-300" size={28} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold glow-text mb-2">Cadastro de Paciente</h1>
                  <p className="text-gray-300 text-lg">
                    Preencha suas informações para se cadastrar na clínica.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="glass-card p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <User className="text-cyan-300" size={20} />
            <span>Informações Pessoais</span>
          </h3>

          <div className="space-y-6">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Nome Completo *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                placeholder="Digite seu nome completo"
                required
              />
            </div>

            {/* Telefone / Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Telefone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                    placeholder="(11) 99999-9999"
                    required
                    maxLength={15}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
              </div>
            </div>

            {/* CPF / Nascimento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">CPF *</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                    placeholder="000.000.000-00"
                    required
                    maxLength={14}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Data de Nascimento *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Endereço Completo</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                  placeholder="Rua, número, bairro, cidade - Estado"
                />
              </div>
            </div>
          </div>

          {/* Botão */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || saving}
            className="w-full mt-6 neon-button"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" className="text-blue-500" />
                Finalizando Cadastro...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle size={20} />
                Finalizar Cadastro
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientSignupScreen;
