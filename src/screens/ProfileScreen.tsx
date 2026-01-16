import React, { useState } from 'react'
import { User, Settings, Bell, Shield, HelpCircle, LogOut, Edit, Camera } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Header from '../components/Header'
import toast from 'react-hot-toast'

const ProfileScreen: React.FC = () => {
  const { user, signOut } = useAuth()
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [profileData, setProfileData] = useState({
    name: user?.user_metadata?.name || 'Dra. Loraine Vilela',
    email: user?.email || 'loraine@clinica.com',
    specialty: 'Medicina Estética',
    license: 'CRM 123456',
    phone: '(11) 99999-9999',
    address: 'Rua das Flores, 123 - São Paulo, SP'
  })

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      toast.error('Erro ao fazer logout')
    }
  }

  const handleSaveProfile = () => {
    // Simulate saving profile
    setShowEditProfile(false)
    toast.success('Perfil atualizado com sucesso!')
  }

  const menuItems = [
    {
      icon: Settings,
      title: 'Configurações',
      subtitle: 'Preferências do aplicativo',
      action: () => toast('Configurações em desenvolvimento') // ✅ CORRIGIDO
    },
    {
      icon: Bell,
      title: 'Notificações',
      subtitle: 'Gerenciar alertas e lembretes',
      action: () => toast('Notificações em desenvolvimento') // ✅ CORRIGIDO
    },
    {
      icon: Shield,
      title: 'Privacidade e Segurança',
      subtitle: 'Controle de dados e backup',
      action: () => toast('Privacidade e segurança em desenvolvimento') // ✅ CORRIGIDO
    },
    {
      icon: HelpCircle,
      title: 'Ajuda e Suporte',
      subtitle: 'FAQ e contato',
      action: () => toast('Ajuda e suporte em desenvolvimento') // ✅ CORRIGIDO
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Perfil" />

      <div className="p-4 space-y-6">
        {/* Profile Header */}
        <div className="ios-card p-6">
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="text-primary-600" size={32} />
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white">
                <Camera size={16} />
              </button>
            </div>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{profileData.name}</h2>
              <p className="text-gray-600">{profileData.specialty}</p>
              <p className="text-sm text-gray-500">{profileData.license}</p>
            </div>

            <button
              onClick={() => setShowEditProfile(true)}
              className="p-2 text-primary-500 active:scale-95 transition-transform"
            >
              <Edit size={20} />
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Email:</span>
              <span className="text-gray-900">{profileData.email}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Telefone:</span>
              <span className="text-gray-900">{profileData.phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Endereço:</span>
              <span className="text-gray-900">{profileData.address}</span>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="ios-card p-4 text-center">
            <div className="text-2xl font-bold text-primary-500">127</div>
            <div className="text-sm text-gray-600">Pacientes</div>
          </div>
          <div className="ios-card p-4 text-center">
            <div className="text-2xl font-bold text-green-500">245</div>
            <div className="text-sm text-gray-600">Procedimentos</div>
          </div>
          <div className="ios-card p-4 text-center">
            <div className="text-2xl font-bold text-blue-500">32</div>
            <div className="text-sm text-gray-600">Este Mês</div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={index}
                onClick={item.action}
                className="w-full ios-card p-4 flex items-center space-x-4 active:scale-95 transition-transform"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Icon className="text-gray-600" size={20} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.subtitle}</p>
                </div>
                <div className="text-gray-400">→</div>
              </button>
            )
          })}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleSignOut}
          className="w-full ios-card p-4 flex items-center justify-center space-x-2 text-red-500 active:scale-95 transition-transform"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair da Conta</span>
        </button>

        {/* App Info */}
        <div className="text-center text-xs text-gray-500 space-y-1">
          <p>Clínica Loraine Vilela v1.0.0</p>
          <p>© 2024 Todos os direitos reservados</p>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Editar Perfil
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  className="ios-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                  className="ios-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especialidade
                </label>
                <input
                  type="text"
                  value={profileData.specialty}
                  onChange={(e) => setProfileData(prev => ({ ...prev, specialty: e.target.value }))}
                  className="ios-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registro Profissional
                </label>
                <input
                  type="text"
                  value={profileData.license}
                  onChange={(e) => setProfileData(prev => ({ ...prev, license: e.target.value }))}
                  className="ios-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  className="ios-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Endereço
                </label>
                <textarea
                  value={profileData.address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  className="ios-input h-20 resize-none"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditProfile(false)}
                className="flex-1 ios-button-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                className="flex-1 ios-button"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileScreen