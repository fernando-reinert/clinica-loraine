// src/screens/PatientSignupScreen.tsx
// Tela pública de cadastro de paciente via link
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Phone, Mail, Calendar, User, MapPin, CreditCard, CheckCircle, Camera, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase/client";
import LoadingSpinner from "../components/LoadingSpinner";
import {
  getSignupFormByToken,
  updateSignupFormAnswers,
  completePatientSignup,
} from "../services/signupFormService";

const PatientSignupScreen: React.FC = () => {
  const { code, shareToken } = useParams<{ code?: string; shareToken?: string }>();
  const navigate = useNavigate();
  const tokenOrCode = code ?? shareToken;

  const [resolvedShareToken, setResolvedShareToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expired, setExpired] = useState(false);
  const [completed, setCompleted] = useState(false);

  const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
  const ACCEPT_PHOTO = "image/jpeg,image/png,image/webp";
  const photoInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tokenOrCode) loadForm();
  }, [tokenOrCode]);

  const loadForm = async () => {
    if (!tokenOrCode) {
      toast.error("Link inválido");
      return;
    }

    setLoading(true);
    try {
      const form = await getSignupFormByToken(tokenOrCode);

      if (!form) {
        toast.error('Formulário não encontrado ou link expirado. Se o problema persistir, verifique se a migration foi executada no Supabase.');
        setExpired(true);
        return;
      }

      setResolvedShareToken(form.share_token);

      if (shareToken && form.public_code) {
        setLoading(false);
        navigate(`/patient-signup/novopaciente/${form.public_code}`, { replace: true });
        return;
      }

      if (new Date(form.share_expires_at) < new Date()) {
        toast.error('Este link expirou. Solicite um novo link à clínica.');
        setExpired(true);
        return;
      }

      if (form.status === 'completed') {
        setCompleted(true);
        toast.success('Este cadastro já foi completado!');
        return;
      }

      const savedData = (form as any).payload || (form as any).answers || {};
      if (savedData && typeof savedData === 'object' && !Array.isArray(savedData)) {
        setName(savedData.name || "");
        setEmail(savedData.email || "");
        setPhone(savedData.phone || "");
        setCpf(savedData.cpf || "");
        setBirthDate(savedData.birth_date || "");
        setAddress(savedData.address || "");
        if (savedData.photo_url) setPhotoUrl(savedData.photo_url);
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

  const saveProgress = async () => {
    if (!resolvedShareToken || completed || expired) return;
    try {
      const answers = {
        name: name || '',
        email: email || '',
        phone: phone || '',
        cpf: cpf || '',
        birth_date: birthDate || '',
        address: address || '',
        ...(photoUrl && { photo_url: photoUrl }),
      };
      await updateSignupFormAnswers(resolvedShareToken, answers);
    } catch (error) {
      // Silencioso
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error("A foto deve ter no máximo 5MB.");
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Use apenas JPG, PNG ou WEBP.");
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoFile(file);
    setPhotoUrl(null);
  };

  const removePhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoFile(null);
    setPhotoUrl(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const uploadPhotoToStorage = async (): Promise<string | null> => {
    if (!photoFile || !tokenOrCode) return null;
    setUploading(true);
    try {
      const ext = photoFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
      const filePath = `patients/signup/${tokenOrCode}_${Date.now()}.${safeExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("patient-photos")
        .upload(filePath, photoFile, {
          cacheControl: "3600",
          upsert: false,
          contentType: photoFile.type || `image/${safeExt === "jpg" ? "jpeg" : safeExt}`,
        });
      if (uploadError) {
        toast.error("Erro ao enviar foto. Tente novamente.");
        return null;
      }
      const { data: publicData } = supabase.storage.from("patient-photos").getPublicUrl(uploadData.path);
      return publicData?.publicUrl || null;
    } catch {
      toast.error("Erro ao enviar foto.");
      return null;
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (!resolvedShareToken || completed || expired) return;
    const timeoutId = setTimeout(saveProgress, 500);
    return () => clearTimeout(timeoutId);
  }, [name, email, phone, cpf, birthDate, address, photoUrl, resolvedShareToken, completed, expired]);

  const handleSubmit = async () => {
    if (!name || !phone || !cpf || !birthDate) {
      toast.error("Por favor, preencha todos os campos obrigatórios (Nome, Telefone, CPF e Data de Nascimento).");
      return;
    }

    if (!resolvedShareToken) {
      toast.error("Token inválido");
      return;
    }

    setSaving(true);
    try {
      let finalPhotoUrl = photoUrl || undefined;
      if (photoFile && !finalPhotoUrl) {
        finalPhotoUrl = (await uploadPhotoToStorage()) || undefined;
      }
      const result = await completePatientSignup(resolvedShareToken, {
        name,
        phone,
        cpf: cpf.replace(/\D/g, ""),
        birth_date: birthDate,
        email: email || undefined,
        address: address || undefined,
        photo_url: finalPhotoUrl,
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
      <div className="min-h-screen overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card w-full max-w-md mx-auto px-6 py-8 sm:px-8 sm:py-10 text-center border border-white/10">
          <LoadingSpinner size="lg" className="text-blue-500 mx-auto mb-4" />
          <p className="mt-4 text-sm sm:text-base text-slate-200">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card max-w-md w-full mx-auto p-6 sm:p-8 text-center border border-white/10">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-50 mb-3">Link inválido ou expirado</h1>
          <p className="text-sm sm:text-base text-slate-300 mb-6">
            Este link de cadastro não existe mais ou já expirou.
          </p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card max-w-md w-full mx-auto p-6 sm:p-8 text-center border border-white/10">
          <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-50 mb-3">Cadastro concluído!</h1>
          <p className="text-sm sm:text-base text-slate-300 mb-6">
            Redirecionando para o formulário de anamnese...
          </p>
          <LoadingSpinner size="sm" className="text-blue-500 mx-auto" />
        </div>
      </div>
    );
  }

  // Layout principal — mobile-first, max-width centralizado
  const inputClass =
    "w-full min-h-[44px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-base";

  return (
    <div className="min-h-screen overflow-x-hidden p-4 sm:p-6 md:p-8">
      <div className="mx-auto w-full max-w-xl space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="glass-card p-4 sm:p-6 md:p-8 relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10 rounded-2xl" />
          <div className="relative z-10 flex items-start gap-4 min-w-0">
            <div className="p-2.5 sm:p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30 flex-shrink-0">
              <User className="text-blue-300" size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold glow-text mb-1 sm:mb-2 break-words">
                Cadastro de Paciente
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-300 break-words">
                Preencha suas informações para se cadastrar na clínica.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="glass-card p-4 sm:p-6 border border-white/10 rounded-2xl">
          <h3 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
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
                className={inputClass}
                placeholder="Digite seu nome completo"
                required
              />
            </div>

            {/* Telefone / Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Telefone *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    className={`${inputClass} pl-10`}
                    placeholder="(11) 99999-9999"
                    required
                    maxLength={15}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${inputClass} pl-10`}
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
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <input
                    type="text"
                    value={cpf}
                    onChange={handleCpfChange}
                    className={`${inputClass} pl-10`}
                    placeholder="000.000.000-00"
                    required
                    maxLength={14}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Data de Nascimento *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className={inputClass + " pl-10"}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Endereço Completo</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400 pointer-events-none" size={18} />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={`${inputClass} pl-10`}
                  placeholder="Rua, número, bairro, cidade - Estado"
                />
              </div>
            </div>

            {/* Foto (opcional) */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Foto (opcional)</label>
              <input
                ref={photoInputRef}
                type="file"
                accept={ACCEPT_PHOTO}
                onChange={handlePhotoChange}
                className="hidden"
              />
              {(photoPreview || photoUrl) ? (
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-white/5 flex-shrink-0">
                    <img
                      src={photoPreview || photoUrl || ""}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 size={14} />
                      Remover foto
                    </button>
                    <p className="text-xs text-gray-400">JPG, PNG ou WEBP. Máx. 5MB.</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Camera size={20} className="text-cyan-300 flex-shrink-0" />
                  <span>Adicionar foto (opcional)</span>
                </button>
              )}
            </div>
          </div>

          {/* Botão */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || saving}
            className="w-full min-h-[44px] mt-4 sm:mt-6 neon-button text-base"
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
