// src/screens/AppointmentTreatmentScreen.tsx
// Tela de atendimento com assinatura de termos de consentimento
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, FileText, Camera } from 'lucide-react';
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import ProcedureSelector from '../components/ProcedureSelector';
import ConsentFormViewer from '../components/ConsentFormViewer';
import StickerPhotoUploader from '../components/StickerPhotoUploader';
import { supabase } from '../services/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useProfessional } from '../hooks/useProfessional';
import ProfessionalSetupModal from '../components/ProfessionalSetupModal';
import {
  getConsentTemplateByProcedureKey,
  getProcedureByKey,
  createConsentForm,
  getConsentTemplateById,
  ProcedureOption,
} from '../services/consents/consentService';
import {
  createOrUpdateVisitFromAppointment,
  createVisitProcedure,
  uploadProcedureSticker,
  getProcedureAttachments,
} from '../services/medical-record/medicalRecordService';
import toast from 'react-hot-toast';

interface Appointment {
  id: string;
  patient_id: string;
  professional_id: string;
  title: string;
  start_time: string;
  status: string;
}

interface Patient {
  id: string;
  name: string;
  cpf: string;
  birth_date: string;
}

interface Professional {
  id: string;
  user_id?: string;
  name: string;
  license: string;
}

const AppointmentTreatmentScreen: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { professional: currentProfessional, needsSetup, refresh: refreshProfessional } = useProfessional();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [professional, setProfessional] = useState<Professional | null>(currentProfessional || null);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [currentProcedureIndex, setCurrentProcedureIndex] = useState(0);
  const [consentData, setConsentData] = useState<Record<string, any>>({});
  const [stickerPhotos, setStickerPhotos] = useState<Record<string, any[]>>({});
  const [visitId, setVisitId] = useState<string | null>(null);
  const [procedureTemplates, setProcedureTemplates] = useState<Record<string, any>>({});
  const [procedureOptions, setProcedureOptions] = useState<Record<string, ProcedureOption>>({});

  useEffect(() => {
    if (appointmentId) {
      loadData();
    }
  }, [appointmentId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Carregar appointment
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;
      setAppointment(appointmentData);

      // Carregar paciente
      if (appointmentData.patient_id) {
        const { data: patientData, error: patientError } = await supabase
          .from('patients')
          .select('*')
          .eq('id', appointmentData.patient_id)
          .single();

        if (patientError) throw patientError;
        setPatient(patientData);
      }

      // Usar profissional do hook
      if (currentProfessional) {
        setProfessional(currentProfessional);
      } else if (needsSetup) {
        // Não lançar erro, apenas não definir professional
        // O modal será mostrado abaixo
      }

      // Criar/atualizar visit
      if (appointmentData.patient_id && user) {
        const visit = await createOrUpdateVisitFromAppointment(
          appointmentData.id,
          appointmentData.patient_id,
          user.id,
          appointmentData.start_time,
          'in_progress'
        );
        setVisitId(visit.id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do atendimento');
    } finally {
      setLoading(false);
    }
  };

  const handleProcedureSelection = (procedureKeys: string[]) => {
    setSelectedProcedures(procedureKeys);
    setCurrentProcedureIndex(0);
  };

  const handleConsentComplete = async (procedureKey: string, data: any) => {
    setConsentData((prev) => ({
      ...prev,
      [procedureKey]: data,
    }));
    
    // Avançar para próximo procedimento ou finalizar
    if (currentProcedureIndex < selectedProcedures.length - 1) {
      setCurrentProcedureIndex(currentProcedureIndex + 1);
    }
  };

  // Carregar templates quando procedimentos forem selecionados
  useEffect(() => {
    const loadTemplates = async () => {
      for (const procedureKey of selectedProcedures) {
        if (!procedureTemplates[procedureKey]) {
          try {
            // Buscar template por procedure_key (slug)
            const template = await getConsentTemplateByProcedureKey(procedureKey);
            if (template) {
              setProcedureTemplates((prev) => ({
                ...prev,
                [procedureKey]: template,
              }));
            }
          } catch (error) {
            console.error(`Erro ao carregar template para procedimento ${procedureKey}:`, error);
          }
        }
      }
    };

    if (selectedProcedures.length > 0) {
      loadTemplates();
    }
  }, [selectedProcedures]);

  const handleStickerUpload = async (procedureKey: string, file: File) => {
    if (!visitId || !patient) return;

    try {
      // Armazenar temporariamente (será salvo quando finalizar atendimento)
      setStickerPhotos((prev) => ({
        ...prev,
        [procedureKey]: [...(prev[procedureKey] || []), { file, url: URL.createObjectURL(file) }],
      }));
    } catch (error) {
      console.error('Erro ao fazer upload da foto:', error);
      toast.error('Erro ao fazer upload da foto');
    }
  };

  const handleSaveTreatment = async () => {
    if (!visitId || !patient || !professional || selectedProcedures.length === 0) {
      toast.error('Selecione pelo menos um procedimento');
      return;
    }

    // Verificar se todos os procedimentos têm consentimento
    for (const procedureKey of selectedProcedures) {
      if (!consentData[procedureKey]) {
        toast.error(`Por favor, assine o termo para o procedimento selecionado`);
        return;
      }
    }

    try {
      setSaving(true);

      // Para cada procedimento selecionado
      for (const procedureKey of selectedProcedures) {
        const procedureOption = await getProcedureByKey(procedureKey);
        if (!procedureOption) {
          console.warn(`Procedimento não encontrado: ${procedureKey}`);
          continue;
        }

        // Criar visit_procedure (usando procedure_type como nome)
        const visitProcedure = await createVisitProcedure({
          visitId,
          procedureId: null, // Não temos ID da tabela procedures
          procedureName: procedureOption.procedure_type,
          professionalId: professional.id,
        });

        // Criar consent form
        const consentInfo = consentData[procedureKey];
        const template = await getConsentTemplateByProcedureKey(procedureKey);
        
        await createConsentForm({
          visitProcedureId: visitProcedure.id,
          procedureKey: procedureKey, // procedure_key (slug) do procedimento
          templateId: template?.id || null,
          filledContent: consentInfo.filledContent,
          patientSignatureDataUrl: consentInfo.patientSignature,
          professionalSignatureDataUrl: consentInfo.professionalSignature,
          imageAuthorization: consentInfo.imageAuthorization,
          signedLocation: consentInfo.location,
          patientId: patient.id,
          professionalId: professional.id,
          visitId,
        });

        // Upload de fotos do adesivo
        if (stickerPhotos[procedureId]) {
          for (const photo of stickerPhotos[procedureId]) {
            if (photo.file) {
              await uploadProcedureSticker({
                visitProcedureId: visitProcedure.id,
                patientId: patient.id,
                visitId,
                file: photo.file,
                procedureName: procedureOption.procedure_type,
              });
            }
          }
        }
      }

      // Atualizar visit para completed
      if (visitId) {
        await supabase
          .from('visits')
          .update({ status: 'completed' })
          .eq('id', visitId);
      }

      // Atualizar appointment para completed
      if (appointment) {
        await supabase
          .from('appointments')
          .update({ status: 'completed' })
          .eq('id', appointment.id);
      }

      toast.success('Atendimento concluído com sucesso!');
      navigate(`/patients/${patient.id}/medical-record`);
    } catch (error) {
      console.error('Erro ao salvar atendimento:', error);
      toast.error('Erro ao salvar atendimento');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ResponsiveAppLayout title="Carregando..." showBack={true}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </ResponsiveAppLayout>
    );
  }

  if (!appointment || !patient) {
    return (
      <ResponsiveAppLayout title="Erro" showBack={true}>
        <div className="text-center py-8 text-red-400">
          <p>Erro ao carregar dados do atendimento</p>
        </div>
      </ResponsiveAppLayout>
    );
  }

  // Mostrar modal de setup se necessário
  if (needsSetup && user) {
    return (
      <ResponsiveAppLayout title="Configuração Necessária" showBack={true}>
        <ProfessionalSetupModal
          userId={user.id}
          userEmail={user.email || ''}
          onComplete={(prof) => {
            setProfessional(prof);
            refreshProfessional();
          }}
        />
      </ResponsiveAppLayout>
    );
  }

  if (!professional) {
    return (
      <ResponsiveAppLayout title="Carregando..." showBack={true}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </ResponsiveAppLayout>
    );
  }

  const currentProcedureId = selectedProcedures[currentProcedureIndex];
  const currentProcedure = currentProcedureId
    ? { id: currentProcedureId, name: 'Carregando...' }
    : null;

  return (
    <ResponsiveAppLayout title="Atendimento" showBack={true}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="glass-card p-6 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold glow-text mb-2">{appointment.title}</h1>
              <p className="text-gray-300">Paciente: {patient.name}</p>
              <p className="text-sm text-gray-400">
                {new Date(appointment.start_time).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Seleção de Procedimentos */}
        {selectedProcedures.length === 0 && (
          <ProcedureSelector
            selectedProcedures={selectedProcedures}
            onSelectionChange={handleProcedureSelection}
            multiSelect={true}
          />
        )}

        {/* Fluxo de Assinatura de Termos */}
        {selectedProcedures.length > 0 && (
          <div className="space-y-6">
            {/* Indicador de progresso */}
            <div className="glass-card p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">
                  Procedimento {currentProcedureIndex + 1} de {selectedProcedures.length}
                </span>
                <div className="flex gap-2">
                  {selectedProcedures.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentProcedureIndex
                          ? 'bg-cyan-400'
                          : index < currentProcedureIndex
                          ? 'bg-green-400'
                          : 'bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Termo de Consentimento */}
            {currentProcedureId && (
              <>
                {procedureTemplates[currentProcedureId] ? (
                  <ConsentFormViewer
                    template={procedureTemplates[currentProcedureId]}
                    patient={patient}
                    professional={professional}
                    onComplete={(data) => handleConsentComplete(currentProcedureId, data)}
                  />
                ) : (
                  <div className="glass-card p-6 border border-white/10">
                    <div className="text-center py-8">
                      <LoadingSpinner size="lg" />
                      <p className="mt-4 text-gray-300">Carregando termo de consentimento...</p>
                    </div>
                  </div>
                )}

                {/* Upload de Foto do Adesivo */}
                <StickerPhotoUploader
                  onUpload={(file) => handleStickerUpload(currentProcedureId, file)}
                  existingPhotos={stickerPhotos[currentProcedureId] || []}
                />
              </>
            )}

            {/* Botão Finalizar */}
            {Object.keys(consentData).length === selectedProcedures.length && (
              <div className="flex justify-end">
                <button
                  onClick={handleSaveTreatment}
                  disabled={saving}
                  className="neon-button disabled:opacity-50 flex items-center gap-2 px-6 py-3"
                >
                  {saving ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      <span>Finalizar Atendimento</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </ResponsiveAppLayout>
  );
};

export default AppointmentTreatmentScreen;
