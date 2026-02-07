// src/screens/PatientsScreen.tsx - DESIGN FUTURISTA
import React, { useState } from 'react';
import { Search, Plus, User, FileText, Phone, Calendar, Mail, Camera, Users, Filter, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';

const PatientsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { patients, loading } = usePatients();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

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
      <div className="space-y-6 w-full max-w-full min-w-0">
        {/* Header com Estatísticas - Design Cosmic */}
        <div className="glass-card p-4 sm:p-6 md:p-8 relative overflow-hidden w-full max-w-full min-w-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 min-w-0">
                <div className="p-3 bg-purple-500/20 rounded-2xl border border-purple-400/30 flex-shrink-0">
                  <Users className="text-purple-300" size={28} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold glow-text mb-2 whitespace-normal break-words">Universo de Pacientes</h1>
                  <p className="text-gray-300 text-base sm:text-lg whitespace-normal break-words">
                    Explore sua galáxia de pacientes
                  </p>
                </div>
              </div>
              
              {/* Estatísticas */}
              <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 sm:mt-6 min-w-0">
                <div className="text-center min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-white">{statusCounts.total}</div>
                  <div className="text-gray-400 text-sm whitespace-normal break-words">Total na Galáxia</div>
                </div>
                <div className="text-center min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-green-400">{statusCounts.active}</div>
                  <div className="text-gray-400 text-sm">Ativos</div>
                </div>
                <div className="text-center min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-amber-400">{statusCounts.inactive}</div>
                  <div className="text-gray-400 text-sm">Inativos</div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/patients/new')}
              className="neon-button group relative overflow-hidden flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto min-h-[44px] min-w-0"
            >
              <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" />
              <span className="font-semibold text-base sm:text-lg whitespace-normal break-words">Novo Paciente</span>
            </button>
          </div>
        </div>

        {/* Barra de Ferramentas - Holográfica */}
        <div className="glass-card p-4 sm:p-6 w-full max-w-full min-w-0">
          <div className="flex flex-col lg:flex-row gap-4 min-w-0">
            {/* Barra de Busca */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none shrink-0" size={20} />
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="holo-input pl-12 w-full max-w-full min-h-[44px] text-base sm:text-lg"
              />
            </div>

            {/* Filtro de Status */}
            <div className="flex items-center gap-2 sm:gap-3 glass-card p-3 rounded-2xl min-w-0">
              <Filter size={20} className="text-gray-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="holo-input bg-transparent border-none focus:ring-0 text-gray-300 font-medium w-full min-w-0 min-h-[44px]"
              >
                <option value="all">Todos os Planetas</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Pacientes - Cards Futuristas */}
        <div className="space-y-4">
          {filteredPatients.length === 0 ? (
            <div className="glass-card p-16 text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-400/30">
                <Users className="text-purple-400" size={40} />
              </div>
              <h3 className="text-2xl font-bold glow-text mb-3">
                {searchTerm || statusFilter !== 'all' ? 'Nenhum planeta encontrado' : 'Galáxia vazia'}
              </h3>
              <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Ajuste seus scanners ou tente outros filtros' 
                  : 'Inicie sua colonização cadastrando o primeiro paciente'
                }
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => navigate('/patients/new')}
                  className="neon-button inline-flex items-center space-x-3"
                >
                  <Plus size={24} />
                  <span className="font-semibold text-lg">Fundar Primeira Colônia</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full max-w-full min-w-0">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="glass-card p-4 sm:p-6 hover-lift group cursor-pointer w-full max-w-full min-w-0"
                  onClick={() => navigate(`/patients/${patient.id}`)}
                >
                  {/* Header do Card */}
                  <div className="flex items-start space-x-4 mb-4">
                    {/* Avatar com Foto */}
                    <div className="relative">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-lg pulse-glow">
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
                      <div className={`absolute -top-2 -right-2 rounded-full p-1 border-2 border-gray-800 ${
                        patient.active !== false ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      </div>
                    </div>
                    
                    {/* Informações Principais */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <h3 className="font-bold text-white text-base sm:text-lg mb-1 group-hover:text-purple-300 transition-colors whitespace-normal break-words">
                        {patient.name || patient.full_name || 'Viajante Interestelar'}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2 min-w-0 flex-wrap">
                        <Calendar size={14} className="shrink-0" />
                        <span className="break-words">Entrou em: {formatDate(patient.created_at)}</span>
                      </div>

                      {/* Informações de Contato */}
                      <div className="space-y-2 min-w-0">
                        {patient.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-300 min-w-0">
                            <Phone size={14} className="shrink-0" />
                            <span className="font-medium break-words">{formatPhone(patient.phone)}</span>
                          </div>
                        )}
                        
                        {patient.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-300 min-w-0">
                            <Mail size={14} className="shrink-0" />
                            <span className="break-words min-w-0">{patient.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-2 sm:gap-3 pt-4 border-t border-gray-700 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/patients/${patient.id}`);
                      }}
                      className="flex-1 min-w-0 min-h-[44px] bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 py-3 px-3 sm:px-4 rounded-xl font-semibold transition-all duration-200 text-sm flex items-center justify-center gap-2 hover:scale-105 border border-blue-400/30"
                    >
                      <User size={16} className="shrink-0" />
                      <span className="whitespace-normal break-words">Explorar</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/patients/${patient.id}/anamnese`);
                      }}
                      className="flex-1 min-w-0 min-h-[44px] bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 py-3 px-3 sm:px-4 rounded-xl font-semibold transition-all duration-200 text-sm flex items-center justify-center gap-2 hover:scale-105 border border-purple-400/30"
                    >
                      <FileText size={16} className="shrink-0" />
                      <span className="whitespace-normal break-words">Anamnese</span>
                    </button>
                  </div>

                  {/* Status e Indicadores */}
                  <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-700">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      patient.active !== false 
                        ? 'bg-green-500/20 text-green-300 border border-green-400/30' 
                        : 'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                    }`}>
                      {patient.active !== false ? 'ATIVO' : 'INATIVO'}
                    </span>
                    
                    <div className="text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:translate-x-1">
                      <Sparkles size={16} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer com Estatísticas */}
        {filteredPatients.length > 0 && (
          <div className="glass-card p-6">
            <div className="flex flex-wrap justify-between items-center">
              <div className="text-gray-400">
                Exibindo <span className="font-bold text-white">{filteredPatients.length}</span> de{' '}
                <span className="font-bold text-white">{patients.length}</span> planetas
              </div>
              
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full pulse-glow"></div>
                  <span className="text-gray-400">{statusCounts.active} ativos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span className="text-gray-400">{statusCounts.inactive} inativos</span>
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