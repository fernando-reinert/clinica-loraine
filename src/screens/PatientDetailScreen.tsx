// src/screens/PatientDetailScreen.tsx - DESIGN FUTURISTA
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
  DollarSign,
  Heart,
  Clock,
  Plus,
  Stethoscope,
  GalleryVertical,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import ResponsiveAppLayout from "../components/Layout/ResponsiveAppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { usePatients } from "../hooks/usePatients";
import { supabase } from "../services/supabase/client";
import { getPatientFinancialSummaryGrossNet, type PatientFinancialSummaryGrossNet } from "../services/financial/financialService";

const PatientDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPatient, updatePatient, loading } = usePatients();
  const [patient, setPatient] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Estados para edição
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const [showFinancialValues, setShowFinancialValues] = useState(false);
  const [financialSummary, setFinancialSummary] = useState<PatientFinancialSummaryGrossNet | null>(null);
  const [loadingFinancialSummary, setLoadingFinancialSummary] = useState(false);

  useEffect(() => {
    if (id) {
      loadPatient(id);
    }
  }, [id]);

  const loadPatient = async (patientId: string) => {
    try {
      const patientData = await getPatient(patientId);
      if (patientData) {
        setPatient(patientData);
        setEditName(patientData.name);
        setEditEmail(patientData.email || "");
        setEditPhone(patientData.phone);
        setEditCpf(patientData.cpf);
        setEditBirthDate(patientData.birth_date);
        setEditAddress(patientData.address || "");
        setLoadingFinancialSummary(true);
        try {
          const summary = await getPatientFinancialSummaryGrossNet(patientId);
          setFinancialSummary(summary);
        } catch {
          setFinancialSummary(null);
        } finally {
          setLoadingFinancialSummary(false);
        }
      } else {
        toast.error("Paciente não encontrado");
      }
    } catch (error) {
      console.error("Error loading patient:", error);
      toast.error("Erro ao carregar dados do paciente");
    }
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const maskBRL = (show: boolean, value: number) =>
    show ? formatCurrency(value) : "R$ ••••";

  const handleSaveEdit = async () => {
    if (!editName || !editPhone || !editCpf || !editBirthDate) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setEditLoading(true);
    try {
      const updatedPatient = await updatePatient(id!, {
        name: editName,
        email: editEmail || null,
        phone: editPhone,
        cpf: editCpf,
        birth_date: editBirthDate,
        address: editAddress || null,
      });

      if (updatedPatient) {
        setPatient(updatedPatient);
        setIsEditing(false);
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

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (patient) {
      setEditName(patient.name);
      setEditEmail(patient.email || "");
      setEditPhone(patient.phone);
      setEditCpf(patient.cpf);
      setEditBirthDate(patient.birth_date);
      setEditAddress(patient.address || "");
    }
  };

  // Quick Actions Futuristas
  const quickActions = [
    {
      title: "Ficha Anamnese",
      icon: FileText,
      gradient: "from-blue-500 to-cyan-500",
      action: () => navigate(`/patients/${id}/anamnese`),
    },
    {
      title: "Agendar",
      icon: Calendar,
      gradient: "from-green-500 to-emerald-500",
      action: () => navigate(`/appointments?patientId=${id}`),
    },
    {
      title: "Ver Financeiro",
      icon: DollarSign,
      gradient: "from-emerald-500 to-teal-500",
      action: () => navigate(`/patients/${id}/financial`),
    },
    {
      title: "Galeria",
      icon: GalleryVertical,
      gradient: "from-purple-500 to-pink-500",
      action: () => navigate(`/patients/${id}/gallery`),
    },
    {
      title: "Prontuário",
      icon: Stethoscope,
      gradient: "from-orange-500 to-red-500",
      action: () => navigate(`/patients/${id}/medical-record`),
    },
  ];

  if (loading) {
    return (
      <ResponsiveAppLayout title="Carregando..." showBack={true}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </ResponsiveAppLayout>
    );
  }

  if (!patient) {
    return (
      <ResponsiveAppLayout title="Paciente não encontrado" showBack={true}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">Paciente não encontrado</p>
          </div>
        </div>
      </ResponsiveAppLayout>
    );
  }

  return (
    <ResponsiveAppLayout
      title={isEditing ? "Editando Paciente" : "Detalhes do Paciente"}
      showBack={true}
    >
      <div className="space-y-6">
        {/* Header do Paciente - Design Cosmic */}
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="flex items-start space-x-6">
            {/* Área da Foto */}
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl border-4 border-white/20 pulse-glow">
                {patient.photo_url ? (
                  <img
                    src={patient.photo_url}
                    alt={patient.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="text-white" size={32} />
                )}
              </div>
            </div>

            {/* Informações Principais */}
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="holo-input text-xl font-bold mb-2"
                  placeholder="Nome do paciente"
                />
              ) : (
                <>
                  <h2 className="text-2xl font-bold glow-text mb-2">{patient.name}</h2>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-gray-300">
                    <div className="flex items-center space-x-1">
                      <Heart size={16} />
                      <span>{calculateAge(patient.birth_date)} anos</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>Desde {formatDate(patient.created_at)}</span>
                    </div>
                    {!loadingFinancialSummary && financialSummary && (
                      <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <button
                          type="button"
                          onClick={() => setShowFinancialValues((v) => !v)}
                          className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300"
                          title={showFinancialValues ? "Ocultar valores" : "Mostrar valores"}
                        >
                          {showFinancialValues ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        {financialSummary.overdue.gross > 0 && (
                          <div className="px-2.5 py-1.5 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-xs">
                            <span className="font-medium">EM ATRASO</span>
                            <div className="mt-0.5 text-[11px]">Bruto: {maskBRL(showFinancialValues, financialSummary.overdue.gross)}</div>
                            <div className="text-[11px]">Líquido: {maskBRL(showFinancialValues, financialSummary.overdue.net)}</div>
                          </div>
                        )}
                        <div className="px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs">
                          <span className="font-medium">Pendente</span>
                          <div className="mt-0.5 text-[11px]">Bruto: {maskBRL(showFinancialValues, financialSummary.pending.gross)}</div>
                          <div className="text-[11px]">Líquido: {maskBRL(showFinancialValues, financialSummary.pending.net)}</div>
                        </div>
                      </div>
                    )}
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
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300 hover:scale-105"
                  >
                    <X size={20} />
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editLoading}
                    className="p-3 bg-green-500 hover:bg-green-600 rounded-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all duration-300 hover:scale-105"
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
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold glow-text mb-4 flex items-center space-x-2">
              <CreditCard size={20} className="text-purple-400" />
              <span>Informações Pessoais</span>
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                <Phone className="text-gray-400" size={18} />
                {isEditing ? (
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                    className="holo-input bg-transparent border-none flex-1"
                    placeholder="Telefone"
                  />
                ) : (
                  <span className="text-gray-300">{patient.phone}</span>
                )}
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                <Mail className="text-gray-400" size={18} />
                {isEditing ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="holo-input bg-transparent border-none flex-1"
                    placeholder="Email"
                  />
                ) : (
                  <span className="text-gray-300">
                    {patient.email || "Não informado"}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                <FileText className="text-gray-400" size={18} />
                {isEditing ? (
                  <input
                    type="text"
                    value={editCpf}
                    onChange={(e) => setEditCpf(formatCPF(e.target.value))}
                    className="holo-input bg-transparent border-none flex-1"
                    placeholder="CPF"
                    maxLength={14}
                  />
                ) : (
                  <span className="text-gray-300">
                    CPF: {patient.cpf}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-2xl">
                <Calendar className="text-gray-400" size={18} />
                {isEditing ? (
                  <input
                    type="date"
                    value={editBirthDate}
                    onChange={(e) => setEditBirthDate(e.target.value)}
                    className="holo-input bg-transparent border-none flex-1"
                  />
                ) : (
                  <span className="text-gray-300">
                    Nascimento: {formatDate(patient.birth_date)}
                  </span>
                )}
              </div>

              <div className="flex items-start space-x-3 p-3 bg-white/5 rounded-2xl">
                <MapPin className="text-gray-400 mt-1" size={18} />
                {isEditing ? (
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="holo-input bg-transparent border-none flex-1"
                    placeholder="Endereço"
                  />
                ) : (
                  <span className="text-gray-300">
                    {patient.address || "Endereço não informado"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coluna 2: Ações Rápidas */}
          {!isEditing && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold glow-text mb-4 flex items-center space-x-2">
                <Sparkles size={20} className="text-cyan-400" />
                <span>Portal de Ações</span>
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.action}
                      className={`glass-card p-4 rounded-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br ${action.gradient}/10 border ${action.gradient.replace('from-', 'border-').replace(' to-', '/30 border-')}/30 text-left group`}
                    >
                      <div className={`w-12 h-12 bg-gradient-to-r ${action.gradient} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <h4 className="font-semibold text-white text-sm">{action.title}</h4>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Status de Edição */}
        {isEditing && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-amber-500 text-white px-6 py-3 rounded-2xl shadow-2xl animate-pulse border border-amber-400/30">
            <div className="flex items-center space-x-2">
              <AlertCircle size={20} />
              <span>Modo Edição Ativo - Salve suas alterações</span>
            </div>
          </div>
        )}
      </div>
    </ResponsiveAppLayout>
  );
};

export default PatientDetailScreen;