// src/screens/PatientDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Phone, Mail, Calendar, FileText, Camera, Edit, Trash2, User, CheckCircle, AlertCircle, Save, X } from 'lucide-react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { usePatients } from '../hooks/usePatients';
import { supabase } from '../supabaseClient';



const PatientDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPatient, updatePatient, loading } = usePatients();
  const [patient, setPatient] = useState<any | null>(null);
  const [appointmentTitle, setAppointmentTitle] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  const [hasClinicalRecord, setHasClinicalRecord] = useState(false);
  const [clinicalRecordLoading, setClinicalRecordLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  // Estados para edição
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCpf, setEditCpf] = useState('');
  const [editBirthDate, setEditBirthDate] = useState('');
  const [editAddress, setEditAddress] = useState('');

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      loadPatient(id);
      setHasClinicalRecord(false);
      setClinicalRecordLoading(false);
    }
  }, [id]);

  // Limpar URLs blob quando o componente desmontar
  useEffect(() => {
    return () => {
      if (photoPreview.startsWith('blob:')) {
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
        setEditEmail(patientData.email || '');
        setEditPhone(patientData.phone);
        setEditCpf(patientData.cpf);
        setEditBirthDate(patientData.birth_date);
        setEditAddress(patientData.address || '');
        
        // Usar apenas URLs permanentes, não blob
        if (patientData.photo_url && !patientData.photo_url.startsWith('blob:')) {
          setPhotoPreview(patientData.photo_url);
        }
      } else {
        toast.error('Paciente não encontrado');
      }
    } catch (error) {
      console.error('Error loading patient:', error);
      toast.error('Erro ao carregar dados do paciente');
    }
  };

  // Função para fazer upload da foto
  const uploadPhotoToStorage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient_photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('bucket') || uploadError.message.includes('not found')) {
          toast.error('Bucket de fotos não configurado. Configure no Supabase Storage.');
          return null;
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('patient_photos')
        .getPublicUrl(filePath);

      console.log('Foto enviada com sucesso:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao fazer upload da foto.');
      return null;
    }
  };

  // Função para salvar as alterações
  const handleSaveEdit = async () => {
    if (!editName || !editPhone || !editCpf || !editBirthDate) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setEditLoading(true);
    try {
      let finalPhotoUrl = patient?.photo_url || '';

      // Se há uma nova foto, fazer upload
      if (photoFile) {
        const uploadedUrl = await uploadPhotoToStorage(photoFile);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
          // Limpar URL blob temporária após o upload
          if (photoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(photoPreview);
          }
        } else {
          toast.error('Erro ao salvar nova foto. Mantendo foto atual.');
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
        setPhotoPreview(finalPhotoUrl); // Usar a URL permanente
        toast.success('Paciente atualizado com sucesso!');
      } else {
        throw new Error('Erro ao atualizar paciente');
      }
    } catch (error) {
      console.error('Erro ao atualizar paciente:', error);
      toast.error('Erro ao atualizar paciente.');
    } finally {
      setEditLoading(false);
    }
  };

  // Função para selecionar foto
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem.');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB.');
        return;
      }

      setPhotoFile(file);
      
      // Criar URL temporária apenas para preview
      const objectUrl = URL.createObjectURL(file);
      setPhotoPreview(objectUrl);
      toast.success('Foto selecionada! Clique em Salvar para confirmar.');
    }
  };

  // Função para remover foto
  const handleRemovePhoto = () => {
    if (photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoFile(null);
    setPhotoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Foto removida! Clique em Salvar para confirmar.');
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const maskCPF = (cpf: string) => {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.**$4');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return value;
  };

  const handleCreateAppointment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!appointmentTitle || !appointmentDate) {
      toast.error('Por favor, preencha todos os campos do agendamento.');
      return;
    }

    setAppointmentLoading(true);

    try {
      const { data, error } = await supabase.from('appointments').insert([
        {
          patient_name: patient.name,
          patient_phone: patient.phone,
          start_time: appointmentDate,
          description: appointmentTitle,
          title: appointmentTitle,
          status: 'scheduled',
          patient_id: id,
        },
      ]);

      if (error) {
        console.error('Erro ao criar agendamento:', error);
        toast.error('Erro ao criar o agendamento.');
      } else {
        toast.success('Agendamento criado com sucesso!');
        setAppointmentTitle('');
        setAppointmentDate('');
      }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao criar agendamento.');
    } finally {
      setAppointmentLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setPhotoFile(null);
    
    // Restaurar valores originais
    if (patient) {
      setEditName(patient.name);
      setEditEmail(patient.email || '');
      setEditPhone(patient.phone);
      setEditCpf(patient.cpf);
      setEditBirthDate(patient.birth_date);
      setEditAddress(patient.address || '');
      setPhotoPreview(patient.photo_url || '');
    }
    
    // Limpar URL blob temporária se existir
    if (photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(patient?.photo_url || '');
    }
  };

  // Verificar se há alterações não salvas
  const hasUnsavedChanges = () => {
    if (!patient) return false;
    
    return (
      editName !== patient.name ||
      editEmail !== (patient.email || '') ||
      editPhone !== patient.phone ||
      editCpf !== patient.cpf ||
      editBirthDate !== patient.birth_date ||
      editAddress !== (patient.address || '') ||
      photoFile !== null ||
      (photoPreview.startsWith('blob:') && photoPreview !== patient.photo_url)
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Paciente não encontrado" showBack />
        <div className="p-4 text-center">
          <p className="text-gray-600">Paciente não encontrado</p>
        </div>
      </div>
    );
  }

 // Encontre a parte das quickActions e substitua:
const quickActions = [
  {
    title: 'Ficha Clínica',
    icon: FileText,
    color: 'bg-primary-500',
    action: () => navigate(`/patients/${id}/anamnese`), // ← MUDE PARA ESTA ROTA
  },
  {
    title: 'Agendar',
    icon: Calendar,
    color: 'bg-green-500',
    action: () => {}, // Agendamento será feito na mesma tela
  },
  {
    title: 'Galeria',
    icon: Camera,
    color: 'bg-purple-500',
    action: () => navigate('/gallery'),
  },
  {
    title: isEditing ? 'Cancelar' : 'Editar',
    icon: isEditing ? X : Edit,
    color: isEditing ? 'bg-red-500' : 'bg-blue-500',
    action: isEditing ? handleCancelEdit : () => setIsEditing(true),
  },
];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header
        title={isEditing ? "Editando Paciente" : "Detalhes do Paciente"}
        showBack
        rightAction={
          isEditing ? (
            <button 
              onClick={handleSaveEdit}
              disabled={editLoading || !hasUnsavedChanges()}
              className="p-2 text-green-500 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editLoading ? <LoadingSpinner size="sm" /> : <Save size={20} />}
            </button>
          ) : (
            <button className="p-2 text-red-500 active:scale-95 transition-transform">
              <Trash2 size={20} />
            </button>
          )
        }
      />

      <div className="p-4 space-y-6">
        {/* Patient Header */}
        <div className="ios-card p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={editName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Se a imagem não carregar, mostrar ícone
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : patient.photo_url && !patient.photo_url.startsWith('blob:') ? (
                  <img
                    src={patient.photo_url}
                    alt={patient.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Se a imagem permanente não carregar, mostrar ícone
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <User className="text-gray-500" size={32} />
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
                    className="absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 shadow-lg hover:bg-blue-600 transition-colors"
                  >
                    <Camera size={14} />
                  </button>
                  {photoPreview && (
                    <button
                      onClick={handleRemovePhoto}
                      className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md text-xl font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Nome do paciente"
                />
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900">{patient.name}</h2>
                  <p className="text-gray-600">{calculateAge(patient.birth_date)} anos</p>
                  <p className="text-sm text-gray-500">Paciente desde {formatDate(patient.created_at)}</p>
                </>
              )}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Phone className="text-gray-400" size={18} />
              {isEditing ? (
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(formatPhone(e.target.value))}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Telefone"
                />
              ) : (
                <span className="text-gray-700">{patient.phone}</span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Mail className="text-gray-400" size={18} />
              {isEditing ? (
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Email"
                />
              ) : (
                <span className="text-gray-700">{patient.email || 'Não informado'}</span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <FileText className="text-gray-400" size={18} />
              {isEditing ? (
                <input
                  type="text"
                  value={editCpf}
                  onChange={(e) => setEditCpf(formatCPF(e.target.value))}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="CPF"
                  maxLength={14}
                />
              ) : (
                <span className="text-gray-700">CPF: {maskCPF(patient.cpf)}</span>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Calendar className="text-gray-400" size={18} />
              {isEditing ? (
                <input
                  type="date"
                  value={editBirthDate}
                  onChange={(e) => setEditBirthDate(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              ) : (
                <span className="text-gray-700">Nascimento: {formatDate(patient.birth_date)}</span>
              )}
            </div>

            <div className="flex items-start space-x-3">
              <User className="text-gray-400 mt-1" size={18} />
              {isEditing ? (
                <input
                  type="text"
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Endereço"
                />
              ) : (
                <span className="text-gray-700">{patient.address || 'Endereço não informado'}</span>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 p-3 bg-blue-500 text-white rounded-md flex items-center justify-center space-x-2 hover:bg-blue-600 transition-colors"
                >
                  <Camera size={18} />
                  <span>Alterar Foto</span>
                </button>
              </div>
              
              {/* Botão de Salvar Alterações */}
              <button
                onClick={handleSaveEdit}
                disabled={editLoading || !hasUnsavedChanges()}
                className="w-full mt-4 p-3 bg-green-500 text-white rounded-md flex items-center justify-center space-x-2 hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>

              {hasUnsavedChanges() && !editLoading && (
                <p className="text-sm text-yellow-600 mt-2 text-center">
                  Você tem alterações não salvas
                </p>
              )}
            </div>
          )}
        </div>

        {/* Agendamento */}
        {!isEditing && (
          
          <div className="ios-card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Agendar Procedimento</h3>
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <input
                type="text"
                placeholder="Título do Procedimento"
                value={appointmentTitle}
                onChange={(e) => setAppointmentTitle(e.target.value)}
                className="ios-input"
              />
              <input
                type="datetime-local"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                className="ios-input"
              />
              <button
                type="submit"
                className="ios-button"
                disabled={appointmentLoading}
              >
                {appointmentLoading ? 'Criando Agendamento...' : 'Criar Agendamento'}
              </button>
            </form>
          </div>
          
        )}
          
        {/* Quick Actions */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {isEditing ? 'Ações' : 'Ações Rápidas'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="ios-card p-6 text-center active:scale-95 transition-transform hover:shadow-lg"
                >
                  <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <p className="font-medium text-gray-900">{action.title}</p>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      <BottomNavigation />
    </div>
  );
};

export default PatientDetailScreen;