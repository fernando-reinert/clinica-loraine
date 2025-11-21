// src/screens/PatientDetailScreen.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  Camera,
  Edit,
  Trash2,
  User,
  CheckCircle,
  AlertCircle,
  Save,
  X,
  MapPin,
  CreditCard,
  Heart, // ✅ Mudei IdCard para CreditCard
  Clock,
  Plus,
  Stethoscope,
  GalleryVertical,
  Share2,
  Download,
} from "lucide-react";
import AppLayout from "../components/Layout/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { usePatients } from "../hooks/usePatients";
import { supabase } from "../supabaseClient";

const PatientDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPatient, updatePatient, loading } = usePatients();
  const [patient, setPatient] = useState<any | null>(null);
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");

  // Estados para edição
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadPatient(id);
    }
  }, [id]);

  // Limpar URLs blob quando o componente desmontar
  useEffect(() => {
    return () => {
      if (photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const loadPatient = async (patientId: string) => {
    try {
      const patientData = await getPatient(patientId);
      if (patientData) {
        setPatient(patientData);
        // Preencher os campos de edição
        setEditName(patientData.name);
        setEditEmail(patientData.email || "");
        setEditPhone(patientData.phone);
        setEditCpf(patientData.cpf);
        setEditBirthDate(patientData.birth_date);
        setEditAddress(patientData.address || "");

        if (
          patientData.photo_url &&
          !patientData.photo_url.startsWith("blob:")
        ) {
          setPhotoPreview(patientData.photo_url);
        }
      } else {
        toast.error("Paciente não encontrado");
      }
    } catch (error) {
      console.error("Error loading patient:", error);
      toast.error("Erro ao carregar dados do paciente");
    }
  };

  // Função para fazer upload da foto
  const uploadPhotoToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()
        .toString(36)
        .substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("patient_photos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        if (
          uploadError.message.includes("bucket") ||
          uploadError.message.includes("not found")
        ) {
          toast.error(
            "Bucket de fotos não configurado. Configure no Supabase Storage."
          );
          return null;
        }
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("patient_photos").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error);
      toast.error("Erro ao fazer upload da foto.");
      return null;
    }
  };

  // Função para salvar as alterações
  const handleSaveEdit = async () => {
    if (!editName || !editPhone || !editCpf || !editBirthDate) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setEditLoading(true);
    try {
      let finalPhotoUrl = patient?.photo_url || "";

      // Se há uma nova foto, fazer upload
      if (photoFile) {
        const uploadedUrl = await uploadPhotoToStorage(photoFile);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
          if (photoPreview.startsWith("blob:")) {
            URL.revokeObjectURL(photoPreview);
          }
        }
      }

      // Atualizar paciente no banco de dados
      const updatedPatient = await updatePatient(id!, {
        name: editName,
        email: editEmail || null,
        phone: editPhone,
        cpf: editCpf,
        birth_date: editBirthDate,
        address: editAddress || null,
        photo_url: finalPhotoUrl || null,
      });

      if (updatedPatient) {
        setPatient(updatedPatient);
        setIsEditing(false);
        setPhotoFile(null);
        setPhotoPreview(finalPhotoUrl);
        toast.success("Paciente atualizado com sucesso!");
      } else {
        throw new Error("Erro ao atualizar paciente");
      }
    } catch (error) {
      console.error("Erro ao atualizar paciente:", error);
      toast.error("Erro ao atualizar paciente.");
    } finally {
      setEditLoading(false);
    }
  };

  // Função para selecionar foto
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, selecione um arquivo de imagem.");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB.");
        return;
      }

      setPhotoFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPhotoPreview(objectUrl);
      toast.success("Foto selecionada! Clique em Salvar para confirmar.");
    }
  };

  // Função para remover foto
  const handleRemovePhoto = () => {
    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    toast.success("Foto removida! Clique em Salvar para confirmar.");
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const maskCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.**$4");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return value;
  };

  const handleCreateAppointment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!appointmentTitle || !appointmentDate) {
      toast.error("Por favor, preencha todos os campos do agendamento.");
      return;
    }

    setAppointmentLoading(true);

    try {
      const { data, error } = await supabase.from("appointments").insert([
        {
          patient_name: patient.name,
          patient_phone: patient.phone,
          start_time: appointmentDate,
          description: appointmentTitle,
          title: appointmentTitle,
          status: "scheduled",
          patient_id: id,
        },
      ]);

      if (error) {
        console.error("Erro ao criar agendamento:", error);
        toast.error("Erro ao criar o agendamento.");
      } else {
        toast.success("Agendamento criado com sucesso!");
        setAppointmentTitle("");
        setAppointmentDate("");
      }
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast.error("Erro ao criar agendamento.");
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setPhotoFile(null);

    if (patient) {
      setEditName(patient.name);
      setEditEmail(patient.email || "");
      setEditPhone(patient.phone);
      setEditCpf(patient.cpf);
      setEditBirthDate(patient.birth_date);
      setEditAddress(patient.address || "");
      setPhotoPreview(patient.photo_url || "");
    }

    if (photoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(patient?.photo_url || "");
    }
  };

  const hasUnsavedChanges = () => {
    if (!patient) return false;

    return (
      editName !== patient.name ||
      editEmail !== (patient.email || "") ||
      editPhone !== patient.phone ||
      editCpf !== patient.cpf ||
      editBirthDate !== patient.birth_date ||
      editAddress !== (patient.address || "") ||
      photoFile !== null ||
      (photoPreview.startsWith("blob:") && photoPreview !== patient.photo_url)
    );
  };

  // Quick Actions Premium
  const quickActions = [
    {
      title: "Ficha Anamnese",
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      action: () => navigate(`/patients/${id}/anamnese`), // ✅ Ficha Anamnese
    },
    {
      title: "Agendar",
      icon: Calendar,
      gradient: "from-green-500 to-emerald-500",
      action: () => {},
    },
    {
      title: "Galeria",
      icon: GalleryVertical,
      gradient: "from-purple-500 to-pink-500",
      action: () => navigate("/gallery"),
    },
    {
      title: "Prontuário",
      icon: Stethoscope,
      gradient: "from-orange-500 to-red-500",
      action: () => navigate(`/patients/${id}/medical-record`), // ✅ Prontuário
    },
  ];

  if (loading) {
    return (
      <AppLayout title="Carregando..." showBack={true}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (!patient) {
    return (
      <AppLayout title="Paciente não encontrado" showBack={true}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Paciente não encontrado</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={isEditing ? "Editando Paciente" : "Detalhes do Paciente"}
      showBack={true}
    >
      <div className="p-6 space-y-6">
        {/* Header do Paciente - Design Premium */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex items-start space-x-6">
            {/* Área da Foto Premium */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white/20">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={editName}
                    className="w-full h-full object-cover"
                  />
                ) : patient.photo_url &&
                  !patient.photo_url.startsWith("blob:") ? (
                  <img
                    src={patient.photo_url}
                    alt={patient.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="text-white" size={32} />
                )}
              </div>

              {isEditing && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-blue-500 text-white rounded-full p-2 shadow-lg hover:bg-blue-600 transition-all duration-300 hover:scale-110 border-2 border-white"
                  >
                    <Camera size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Informações Principais */}
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-xl font-bold text-white placeholder-white/60 focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-300"
                  placeholder="Nome do paciente"
                />
              ) : (
                <>
                  <h2 className="text-2xl font-bold mb-2">{patient.name}</h2>
                  <div className="flex items-center space-x-4 text-white/80">
                    <div className="flex items-center space-x-1">
                      <Heart size={16} />
                      <span>{calculateAge(patient.birth_date)} anos</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>Desde {formatDate(patient.created_at)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-105"
                  >
                    <X size={20} />
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editLoading || !hasUnsavedChanges()}
                    className="p-3 bg-green-500 hover:bg-green-600 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Save size={20} />
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <Edit size={20} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Informações de Contato - Design Moderno */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna 1: Informações Pessoais */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <CreditCard size={20} className="text-purple-600" />{" "}
              {/* ✅ Mudei para CreditCard */}
              <span>Informações Pessoais</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <Phone className="text-gray-400" size={18} />
                {isEditing ? (
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                    className="flex-1 p-2 bg-transparent border-none focus:ring-0 text-gray-700"
                    placeholder="Telefone"
                  />
                ) : (
                  <span className="text-gray-700">{patient.phone}</span>
                )}
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <Mail className="text-gray-400" size={18} />
                {isEditing ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-none focus:ring-0 text-gray-700"
                    placeholder="Email"
                  />
                ) : (
                  <span className="text-gray-700">
                    {patient.email || "Não informado"}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <FileText className="text-gray-400" size={18} />
                {isEditing ? (
                  <input
                    type="text"
                    value={editCpf}
                    onChange={(e) => setEditCpf(formatCPF(e.target.value))}
                    className="flex-1 p-2 bg-transparent border-none focus:ring-0 text-gray-700"
                    placeholder="CPF"
                    maxLength={14}
                  />
                ) : (
                  <span className="text-gray-700">
                    CPF: {maskCPF(patient.cpf)}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="text-gray-400" size={18} />
                {isEditing ? (
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-none focus:ring-0 text-gray-700"
                  />
                ) : (
                  <span className="text-gray-700">
                    Nascimento: {formatDate(patient.birth_date)}
                  </span>
                )}
              </div>

              <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
                <MapPin className="text-gray-400 mt-1" size={18} />
                {isEditing ? (
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="flex-1 p-2 bg-transparent border-none focus:ring-0 text-gray-700"
                    placeholder="Endereço"
                  />
                ) : (
                  <span className="text-gray-700">
                    {patient.address || "Endereço não informado"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coluna 2: Agendamento Rápido */}
          {!isEditing && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Clock size={20} className="text-green-600" />
                <span>Agendamento Rápido</span>
              </h3>

              <form onSubmit={handleCreateAppointment} className="space-y-4">
                <input
                  type="text"
                  placeholder="Título do Procedimento"
                  value={appointmentTitle}
                  onChange={(e) => setAppointmentTitle(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
                <input
                  type="datetime-local"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                />
                <button
                  type="submit"
                  disabled={appointmentLoading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {appointmentLoading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <LoadingSpinner size="sm" />
                      <span>Criando Agendamento...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <Plus size={20} />
                      <span>Criar Agendamento</span>
                    </div>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Ações Rápidas - Design Premium */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Ações Rápidas
          </h3>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="group p-6 bg-gradient-to-br from-gray-50 to-white rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-300 hover:scale-105 text-center"
                >
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${action.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                  >
                    <Icon size={28} className="text-white" />
                  </div>
                  <p className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                    {action.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Status de Edição */}
        {isEditing && hasUnsavedChanges() && !editLoading && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-xl shadow-2xl animate-pulse">
            <div className="flex items-center space-x-2">
              <AlertCircle size={20} />
              <span>Você tem alterações não salvas</span>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PatientDetailScreen;
