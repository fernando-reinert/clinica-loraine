// src/screens/MedicalRecordScreen.tsx (Prontuário Profissional)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Save, ArrowLeft, User, FileText, Calendar, 
  Heart, Stethoscope, Pill, AlertTriangle,
  Clock, Plus, Edit, Trash2
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const MedicalRecordScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [medicalRecord, setMedicalRecord] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('consultas');

  // Dados do Prontuário
  const [consultations, setConsultations] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  // Novo formulário de consulta
  const [newConsultation, setNewConsultation] = useState({
    date: new Date().toISOString().split('T')[0],
    reason: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    next_appointment: ''
  });

  useEffect(() => {
    if (id) {
      loadPatientAndRecord();
    }
  }, [id]);

  const loadPatientAndRecord = async () => {
    try {
      setLoading(true);

      // Carregar paciente
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Carregar consultas
      const { data: consultationsData } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', id)
        .order('date', { ascending: false });

      if (consultationsData) setConsultations(consultationsData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar prontuário');
    } finally {
      setLoading(false);
    }
  };

  const addConsultation = async () => {
    if (!newConsultation.reason || !newConsultation.date) {
      toast.error('Preencha pelo menos a data e o motivo da consulta');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('consultations')
        .insert([
          {
            patient_id: id,
            ...newConsultation
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setConsultations(prev => [data, ...prev]);
      setNewConsultation({
        date: new Date().toISOString().split('T')[0],
        reason: '',
        symptoms: '',
        diagnosis: '',
        treatment: '',
        notes: '',
        next_appointment: ''
      });
      
      toast.success('Consulta registrada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar consulta:', error);
      toast.error('Erro ao registrar consulta');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Carregando..." showBack={true}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={`Prontuário - ${patient?.name || 'Paciente'}`} 
      showBack={true}
    >
      <div className="p-6 space-y-6">
        {/* Header do Prontuário */}
        <div className="bg-gradient-to-br from-green-600 to-blue-700 rounded-2xl p-6 text-white">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Prontuário Médico</h1>
              <p className="text-white/80 mt-1">{patient?.name}</p>
              <div className="flex items-center space-x-4 mt-2 text-white/80 text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>Prontuário Digital</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Stethoscope size={14} />
                  <span>{consultations.length} Consultas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          <div className="flex space-x-1">
            {[
              { id: 'consultas', label: 'Consultas', icon: Stethoscope },
              { id: 'prescricoes', label: 'Prescrições', icon: Pill },
              { id: 'exames', label: 'Exames', icon: Heart },
              { id: 'historico', label: 'Histórico', icon: Clock }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo das Abas */}
        {activeTab === 'consultas' && (
          <div className="space-y-6">
            {/* Nova Consulta */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Plus size={20} className="text-green-600" />
                <span>Nova Consulta</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data da Consulta</label>
                  <input
                    type="date"
                    value={newConsultation.date}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, date: e.target.value }))}
                    className="ios-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo da Consulta</label>
                  <input
                    type="text"
                    value={newConsultation.reason}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, reason: e.target.value }))}
                    className="ios-input"
                    placeholder="Ex: Check-up anual"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sintomas Apresentados</label>
                  <textarea
                    value={newConsultation.symptoms}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, symptoms: e.target.value }))}
                    className="ios-input h-20"
                    placeholder="Descreva os sintomas..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnóstico</label>
                  <textarea
                    value={newConsultation.diagnosis}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, diagnosis: e.target.value }))}
                    className="ios-input h-20"
                    placeholder="Hipótese diagnóstica..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conduta e Tratamento</label>
                  <textarea
                    value={newConsultation.treatment}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, treatment: e.target.value }))}
                    className="ios-input h-20"
                    placeholder="Conduta médica e tratamento prescrito..."
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={addConsultation}
                  disabled={saving}
                  className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? <LoadingSpinner size="sm" /> : <Save size={18} />}
                  <span>Registrar Consulta</span>
                </button>
              </div>
            </div>

            {/* Histórico de Consultas */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Consultas</h3>
              
              {consultations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Stethoscope size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma consulta registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map((consultation) => (
                    <div key={consultation.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">{consultation.reason}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(consultation.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="p-1 text-blue-600 hover:text-blue-800">
                            <Edit size={16} />
                          </button>
                          <button className="p-1 text-red-600 hover:text-red-800">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {consultation.diagnosis && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-700">Diagnóstico:</span>
                          <p className="text-sm text-gray-600">{consultation.diagnosis}</p>
                        </div>
                      )}
                      
                      {consultation.treatment && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Conduta:</span>
                          <p className="text-sm text-gray-600">{consultation.treatment}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'prescricoes' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-center py-8 text-gray-500">
              <Pill size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Módulo de Prescrições em Desenvolvimento</p>
            </div>
          </div>
        )}

        {activeTab === 'exames' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="text-center py-8 text-gray-500">
              <Heart size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Módulo de Exames em Desenvolvimento</p>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MedicalRecordScreen;