import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Mail, Camera, X, Image as ImageIcon, Upload, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';

interface Patient {
  id: string;
  name: string;
  email?: string;
  phone: string;
  cpf: string;
  birth_date: string;
  address?: string;
  photo_url?: string;
  professional_id?: string;
  created_at: string;
}

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

  // Função para fazer upload da foto para o Supabase Storage
  const uploadPhotoToStorage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      
      // Verificar se o bucket existe
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === 'patient-photos');
      
      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket('patient-photos', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        });
        if (createError) throw createError;
      }

      // Fazer upload do arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('patient_photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('patient-photos')
        .getPublicUrl(filePath);

      toast.success('Foto enviada com sucesso!');
      return publicUrl;

    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao fazer upload da foto. Tente novamente.');
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
      let finalPhotoUrl = photoUrl;

      // Se há uma foto selecionada do dispositivo, fazer upload para o Storage
      if (photoFile) {
        const uploadedUrl = await uploadPhotoToStorage(photoFile);
        if (uploadedUrl) {
          finalPhotoUrl = uploadedUrl;
        } else {
          // Se o upload falhou, avisar sobre a foto temporária
          toast.error('Erro ao salvar a foto. A foto pode não persistir.');
        }
      }

      // Inserir paciente no banco de dados
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
            photo_url: finalPhotoUrl || null,
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
      // Verificar se é uma imagem
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione um arquivo de imagem (JPEG, PNG, etc).');
        return;
      }

      // Verificar tamanho do arquivo (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 5MB.');
        return;
      }

      setPhotoFile(file);
      
      // Criar URL local para preview imediato
      const objectUrl = URL.createObjectURL(file);
      setPhotoUrl(objectUrl);
      
      toast.success('Foto selecionada! Ela será salva quando você cadastrar o paciente.');
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
    <div className="min-h-screen bg-gradient-to-b from-pink-900 via-pink-800 to-pink-700 text-white pb-20">
      <Header title="Cadastrar Novo Paciente" showBack />
      
      {/* Input de arquivo oculto */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />
      
      <div className="p-6 space-y-6">
        {/* Card Principal */}
        <div className="ios-card p-6 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg shadow-lg">
          {/* Seção da Foto */}
          <div className="flex flex-col md:flex-row items-center space-y-6 md:space-y-0 md:space-x-8 mb-8">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-r from-pink-500 to-pink-600 rounded-full flex items-center justify-center overflow-hidden shadow-lg border-4 border-pink-400">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={name || 'Foto do paciente'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Se a imagem não carregar, mostrar ícone
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <Camera className="text-white" size={40} />
                )}
              </div>
              {photoUrl && (
                <button
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-2 shadow-lg hover:bg-rose-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            
            <div className="flex-1 space-y-4 w-full">
              <h3 className="text-lg font-semibold text-white text-center md:text-left">
                Foto do Paciente
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleTakePhoto}
                  disabled={uploading}
                  className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center space-x-3 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                >
                  <Camera size={20} />
                  <span>Tirar Foto</span>
                </button>
                
                <button
                  onClick={handleChooseFromLibrary}
                  disabled={uploading}
                  className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl flex items-center justify-center space-x-3 shadow-lg active:scale-95 transition-transform disabled:opacity-50"
                >
                  <ImageIcon size={20} />
                  <span>Galeria</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-800 text-gray-400">ou</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Cole a URL da foto
                </label>
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>

              {uploading && (
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  <LoadingSpinner size="sm" />
                  <span>Processando foto...</span>
                </div>
              )}
            </div>
          </div>

          {/* Formulário */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-4 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                placeholder="Digite o nome completo do paciente"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Telefone *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full p-4 pl-12 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                    placeholder="(11) 99999-9999"
                    required
                    maxLength={15}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-4 pl-12 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                    placeholder="paciente@email.com"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CPF *
                </label>
                <input
                  type="text"
                  value={cpf}
                  onChange={handleCpfChange}
                  className="w-full p-4 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                  placeholder="000.000.000-00"
                  required
                  maxLength={14}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data de Nascimento *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full p-4 pl-12 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Endereço Completo
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-4 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-colors"
                placeholder="Rua, número, bairro, cidade - Estado"
              />
            </div>
          </div>
        </div>

        {/* Botão de Cadastro */}
        <button
          onClick={handleSubmit}
          disabled={loading || uploading}
          className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl shadow-lg font-semibold active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Cadastrando...</span>
            </div>
          ) : uploading ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner size="sm" />
              <span>Enviando foto...</span>
            </div>
          ) : (
            'Cadastrar Paciente'
          )}
        </button>
      </div>
    </div>
  );
};

export default NewPatient;