import React, { useState } from 'react';
import { Search, Plus, User, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import LoadingSpinner from '../components/LoadingSpinner';

const PatientsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { patients, loading } = usePatients();
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrando pacientes
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone.includes(searchTerm)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-20 text-white">
      <Header 
        title="Pacientes" 
        rightAction={
          <button
            onClick={() => navigate('/patients/new')}
            className="p-3 bg-pink-600 text-white rounded-full shadow-lg transition-transform hover:scale-105"
          >
            <Plus size={24} />
          </button>
        }
      />

      <div className="p-6 space-y-8">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" size={22} />
          <input
            type="text"
            placeholder="Buscar pacientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-gray-800 rounded-xl border-2 border-gray-700 focus:border-pink-500 focus:ring-2 focus:ring-pink-300 text-lg text-white"
          />
        </div>

        {/* Patients List */}
        <div className="space-y-6">
          {filteredPatients.length === 0 ? (
            <div className="ios-card p-8 text-center bg-gray-800 shadow-lg rounded-lg">
              <User className="mx-auto mb-4 text-gray-500" size={48} />
              <p className="text-gray-400">
                {searchTerm ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
              </p>
              <button
                onClick={() => navigate('/patients/new')}
                className="mt-4 ios-button bg-pink-600 text-white"
              >
                Adicionar Primeiro Paciente
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => navigate('/patients/new')}
                className="ios-button mt-4 bg-pink-600 text-white shadow-md rounded-lg"
              >
                Adicionar Novo Paciente
              </button>
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="w-full ios-card p-6 bg-gray-800 rounded-xl shadow-xl hover:scale-105 transform transition-all duration-300"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center overflow-hidden">
                      {patient.photo_url ? (
                        <img
                          src={patient.photo_url}
                          alt={patient.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="text-white" size={28} />
                      )}
                    </div>

                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-200">{patient.name}</h3>
                      <p className="text-sm text-gray-400">{patient.phone}</p>
                      <p className="text-xs text-gray-500">
                        Cadastrado em: {formatDate(patient.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* BOTÕES DE AÇÃO */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="flex-1 ios-button bg-blue-600 text-white text-sm py-2"
                    >
                      Ver Detalhes
                    </button>
                    
                    {/* 🔥 NOVO BOTÃO DA ANAMNESE */}
                    <button
                      onClick={() => navigate(`/patients/${patient.id}/anamnese`)}
                      className="flex-1 ios-button bg-purple-600 text-white text-sm py-2 flex items-center justify-center space-x-1"
                    >
                      <FileText size={16} />
                      <span>Anamnese</span>
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default PatientsScreen;