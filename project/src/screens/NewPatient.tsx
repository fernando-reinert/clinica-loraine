import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Camera, Image as ImageIcon, Trash2, Calendar, User, MapPin, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../supabaseClient';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';

const NewPatient: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [address, setAddress] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ✅ FUNÇÃO CORRIGIDA: Upload da foto para o Supabase Storage
  const uploadPhotoToStorage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Verificar se o bucket existe, se não, criar
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) throw listError;

      const bucketExists = buckets?.some(bucket => bucket.name === 'patient-photos');
      
      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket('patient-photos', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        });
        if (createError) throw createError;
      }

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `patient_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
      const filePath = fileName;

      // Fazer upload do arquivo para o bucket CORRETO
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('patient-photos') // ✅ Nome correto do bucket
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw uploadError;
      }

      // Obter URL pública permanente
      const { data: { publicUrl } } = supabase.storage
        .from('patient-photos')
        .getPublicUrl(filePath);

      console.log('Foto salva com sucesso:', publicUrl);
      toast.success('Foto salva com sucesso!');
      return publicUrl;

    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao salvar a foto. Tente novamente.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!name || !phone || !cpf || !birthDate) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      let finalPhotoUrl = '';

      // ✅ SEMPRE fazer upload da foto se foi selecionada
      if (photoFile) {
        const uploadedUrl = await uploadPhotoToStorage(photoFile);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
          // Limpar URL temporária (blob)
          if (photoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(photoUrl);
          }
        } else {
          throw new Error('Falha ao salvar a foto');
        }
      }

      // Inserir paciente no banco de dados com a URL PERMANENTE
      const { data, error } = await supabase
        .from('patients')
        .insert([
          {
            name,
            email: email || null,
            phone,
            cpf,
            birth_date: birthDate,
            address: address || null,
            photo_url: finalPhotoUrl || null, // ✅ URL permanente do Supabase
            professional_id: 'a3f11e68-67ea-4a9f-b1fb-33d9843a738f'
          }
        ])
        .select();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      if (data && data.length > 0) {
        const patientId = data[0].id;
        toast.success('Paciente cadastrado com sucesso!');
        navigate(`/patients/${patientId}`);
      } else {
        throw new Error('Nenhum dado retornado após inserção');
      }
    } catch (error: any) {
      console.error('Erro ao cadastrar paciente:', error);
      toast.error('Erro ao cadastrar paciente. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem (JPEG, PNG, etc).');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB.');
        return;
      }

      setPhotoFile(file);
      
      // Criar URL temporária apenas para preview
      const objectUrl = URL.createObjectURL(file);
      setPhotoUrl(objectUrl);
      
      toast.success('Foto selecionada! Ela será salva permanentemente quando você cadastrar o paciente.');
    }
  };

  const handleTakePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'camera';
      fileInputRef.current.click();
    }
  };

  const handleChooseFromLibrary = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const removePhoto = () => {
    // Revogar a URL blob para liberar memória
    if (photoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(photoUrl);
    }
    setPhotoFile(null);
    setPhotoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Foto removida');
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpf(formatted);
  };

  return (
    <AppLayout title="Novo Paciente" showBack={true}>
      <div className="p-6 space-y-6">
        {/* Header Premium */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Cadastrar Novo Paciente</h1>
              <p className="text-white/80 text-lg">
                Preencha as informações para cadastrar um novo paciente na clínica
              </p>
            </div>
            
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <User className="text-white" size={32} />
            </div>
          </div>
        </div>

        {/* Card Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Foto do Paciente */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
                <Camera className="text-purple-600" size={20} />
                <span>Foto do Paciente</span>
              </h3>
              
              {/* Input de arquivo oculto */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              
              <div className="space-y-4">
                {/* Preview da Foto */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-32 h-32 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg border-2 border-gray-200">
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={name || 'Foto do paciente'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <Camera className="text-gray-400" size={40} />
                      )}
                    </div>
                    {photoUrl && (
                      <button
                        onClick={removePhoto}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-all duration-300"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-3">
                  <button
                    onClick={handleTakePhoto}
                    disabled={uploading}
                    className="w-full p-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <Camera size={18} />
                    <span>Tirar Foto</span>
                  </button>
                  
                  <button
                    onClick={handleChooseFromLibrary}
                    disabled={uploading}
                    className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <ImageIcon size={18} />
                    <span>Escolher da Galeria</span>
                  </button>
                </div>

                {/* ✅ REMOVIDA: Seção de URL da foto */}

                {uploading && (
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    <LoadingSpinner size="sm" />
                    <span>Salvando foto...</span>
                  </div>
                )}

                {/* Informação sobre a foto */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-sm text-blue-800 text-center">
                    📸 A foto será salva permanentemente e aparecerá em todo o sistema
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Formulário */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center space-x-2">
                <User className="text-purple-600" size={20} />
                <span>Informações Pessoais</span>
              </h3>

              <div className="space-y-6">
                {/* Nome Completo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    placeholder="Digite o nome completo do paciente"
                    required
                  />
                </div>

                {/* Telefone e Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder="(11) 99999-9999"
                        required
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder="paciente@email.com"
                      />
                    </div>
                  </div>
                </div>

                {/* CPF e Data de Nascimento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CPF *
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        value={cpf}
                        onChange={handleCpfChange}
                        className="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        placeholder="000.000.000-00"
                        required
                        maxLength={14}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Nascimento *
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço Completo
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full p-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      placeholder="Rua, número, bairro, cidade - Estado"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botão de Cadastro */}
            <button
              onClick={handleSubmit}
              disabled={loading || uploading}
              className="w-full mt-6 p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-2xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Cadastrando Paciente...</span>
                </>
              ) : uploading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Salvando Foto...</span>
                </>
              ) : (
                <>
                  <User size={20} />
                  <span>Cadastrar Paciente</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default NewPatient;