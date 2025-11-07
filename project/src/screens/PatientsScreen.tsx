import React, { useState } from 'react';
import { Search, Plus, User, FileText, Phone, Calendar, Mail, Camera, Users, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';

const PatientsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { patients, loading } = usePatients();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Filtrando pacientes
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone?.includes(searchTerm) ||
      patient.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && patient.active !== false) ||
      (statusFilter === 'inactive' && patient.active === false);
    
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const getInitials = (name: string) => {
    if (!name) return 'P';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusCounts = () => {
    const active = patients.filter(p => p.active !== false).length;
    const inactive = patients.filter(p => p.active === false).length;
    return { active, inactive, total: patients.length };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <AppLayout title="Pacientes" showBack={true}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Pacientes" showBack={true}>
      <div className="p-6 space-y-6">
        {/* Header com Estatísticas */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Gestão de Pacientes</h1>
              <p className="text-white/80 text-lg">
                Controle completo dos dados dos seus pacientes
              </p>
              
              {/* Estatísticas */}
              <div className="flex flex-wrap gap-6 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{statusCounts.total}</div>
                  <div className="text-white/60 text-sm">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{statusCounts.active}</div>
                  <div className="text-white/60 text-sm">Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{statusCounts.inactive}</div>
                  <div className="text-white/60 text-sm">Inativos</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/patients/new')}
              className="flex items-center space-x-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-4 rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
            >
              <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="font-semibold text-lg">Novo Paciente</span>
            </button>
          </div>
        </div>

        {/* Barra de Ferramentas */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Barra de Busca */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 text-lg"
              />
            </div>

            {/* Filtro de Status */}
            <div className="flex items-center space-x-3 bg-gray-50 rounded-xl p-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent border-none focus:ring-0 text-gray-700 font-medium"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Pacientes - Design Premium */}
        <div className="space-y-4">
          {filteredPatients.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="text-purple-400" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchTerm || statusFilter !== 'all' ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </h3>
              <p className="text-gray-600 text-lg mb-8 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar os termos da busca ou os filtros aplicados' 
                  : 'Comece cadastrando seu primeiro paciente para organizar sua clínica'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => navigate('/patients/new')}
                  className="inline-flex items-center space-x-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
                >
                  <Plus size={24} />
                  <span className="font-semibold text-lg">Cadastrar Primeiro Paciente</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-2xl hover:border-purple-200 transition-all duration-300 group cursor-pointer"
                  onClick={() => navigate(`/patients/${patient.id}`)}
                >
                  {/* Header do Card */}
                  <div className="flex items-start space-x-4 mb-4">
                    {/* Avatar com Foto */}
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-lg">
                        {patient.photo_url ? (
                          <img
                            src={patient.photo_url}
                            alt={patient.name || patient.full_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : null}
                        
                        {(!patient.photo_url || patient.photo_url === '') && (
                          <span>{getInitials(patient.name || patient.full_name || 'P')}</span>
                        )}
                      </div>
                      
                      {/* Badge de Status */}
                      <div className={`absolute -top-2 -right-2 rounded-full p-1 border-2 border-white ${
                        patient.active !== false ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                    </div>
                    
                    {/* Informações Principais */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg mb-1 group-hover:text-purple-600 transition-colors truncate">
                        {patient.name || patient.full_name || 'Nome não informado'}
                      </h3>
                      
                      <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                        <Calendar size={14} />
                        <span>Cadastro: {formatDate(patient.created_at)}</span>
                      </div>

                      {/* Informações de Contato */}
                      <div className="space-y-2">
                        {patient.phone && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Phone size={14} />
                            <span className="font-medium">{formatPhone(patient.phone)}</span>
                          </div>
                        )}
                        
                        {patient.email && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Mail size={14} />
                            <span className="truncate max-w-[180px]">{patient.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex space-x-3 pt-4 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/patients/${patient.id}`);
                      }}
                      className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 py-3 px-4 rounded-xl font-semibold transition-all duration-200 text-sm flex items-center justify-center space-x-2 hover:scale-105"
                    >
                      <User size={16} />
                      <span>Detalhes</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/patients/${patient.id}/anamnese`);
                      }}
                      className="flex-1 bg-purple-50 text-purple-600 hover:bg-purple-100 py-3 px-4 rounded-xl font-semibold transition-all duration-200 text-sm flex items-center justify-center space-x-2 hover:scale-105"
                    >
                      <FileText size={16} />
                      <span>Anamnese</span>
                    </button>
                  </div>

                  {/* Status e Indicadores */}
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      patient.active !== false 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {patient.active !== false ? 'ATIVO' : 'INATIVO'}
                    </span>
                    
                    <div className="text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1">
                      →
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer com Estatísticas */}
        {filteredPatients.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex flex-wrap justify-between items-center">
              <div className="text-gray-600">
                Mostrando <span className="font-bold text-gray-900">{filteredPatients.length}</span> de{' '}
                <span className="font-bold text-gray-900">{patients.length}</span> pacientes
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">{statusCounts.active} ativos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-600">{statusCounts.inactive} inativos</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PatientsScreen;