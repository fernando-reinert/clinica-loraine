// src/screens/MedicalRecordScreen.tsx (Prontuário Profissional)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase/client';
import { 
  Save, ArrowLeft, User, FileText, Calendar, 
  Heart, Stethoscope, Pill, AlertTriangle,
  Clock, Plus, Edit, Trash2, Eye, Image as ImageIcon, CheckCircle, FileCheck, X
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConsentFormViewer from '../components/ConsentFormViewer';
import ProcedureSelector from '../components/ProcedureSelector';
import SignaturePad from '../components/SignaturePad';
import { getPatientMedicalHistory } from '../services/medical-record/medicalRecordService';
import { 
  getConsentFormsByPatient, 
  getConsentTemplateByProcedureKey,
  getProcedureByKey,
  createConsentForm,
  createConsentTemplate,
  fillConsentTemplate,
  FillTemplateResult,
  ProcedureOption
} from '../services/consents/consentService';
import { useAuth } from '../contexts/AuthContext';
import { useProfessional } from '../hooks/useProfessional';
import ProfessionalSetupModal from '../components/ProfessionalSetupModal';
import { uploadSignature } from '../services/storage/storageService';
import { upsertProfessional, ensureDefaultProfessionalProfile } from '../services/professionals/professionalService';
import { deleteConsentForm } from '../services/consents/consentService';
import logger from '../utils/logger';
import toast from 'react-hot-toast';
import ConfirmDialog from '../components/ConfirmDialog';

const MedicalRecordScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const { user } = useAuth();
  const { professional, loading: professionalLoading, needsSetup, refresh: refreshProfessional } = useProfessional();
  const [activeTab, setActiveTab] = useState('historico');
  const [medicalHistory, setMedicalHistory] = useState<any[]>([]);
  const [selectedConsentForm, setSelectedConsentForm] = useState<any>(null);
  const [consentForms, setConsentForms] = useState<any[]>([]);
  const [showGenerateConsent, setShowGenerateConsent] = useState(false);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    consentId: string | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    consentId: null,
    isLoading: false,
  });
  const [selectedProcedureForConsent, setSelectedProcedureForConsent] = useState<string | null>(null);
  const [selectedProcedureLabel, setSelectedProcedureLabel] = useState<string | null>(null);
  const [consentTemplate, setConsentTemplate] = useState<any>(null);
  const [templateNotFound, setTemplateNotFound] = useState(false);
  const [showProfessionalConfig, setShowProfessionalConfig] = useState(false);
  const [fillResult, setFillResult] = useState<FillTemplateResult | null>(null);
  const [consentFormData, setConsentFormData] = useState<any>({
    imageAuthorization: null, // null = nenhuma opção selecionada (obrigatório escolher)
    location: '',
    date: new Date().toLocaleDateString('pt-BR'),
    patientSignature: null,
    professionalSignature: null,
    filledContent: '',
  });

  // Dados do Prontuário (mantido para compatibilidade)
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

      // Carregar histórico médico completo (visits + procedures + consents)
      const history = await getPatientMedicalHistory(id);
      setMedicalHistory(history);

      // Carregar todos os termos de consentimento do paciente
      const allConsents = await getConsentFormsByPatient(id);
      setConsentForms(allConsents);

      // Carregar consultas (legado)
      const { data: consultationsData } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', id)
        .order('date', { ascending: false });

      if (consultationsData) setConsultations(consultationsData);

    } catch (error) {
      logger.error('[MEDICAL_RECORD] Erro ao carregar dados:', error);
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
      logger.error('[MEDICAL_RECORD] Erro ao salvar consulta:', error);
      toast.error('Erro ao registrar consulta');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadConsentTemplate = async (procedureKey: string) => {
    try {
      setTemplateNotFound(false);
      
      // Buscar template por procedure_key (slug)
      const template = await getConsentTemplateByProcedureKey(procedureKey);
      
      if (!template) {
        setTemplateNotFound(true);
        setConsentTemplate(null);
        return;
      }

      setConsentTemplate(template);
      setTemplateNotFound(false);
      
      // Preencher template inicial
      if (patient) {
        const result = fillConsentTemplate(
          template,
          {
            name: patient.name,
            cpf: patient.cpf,
            birth_date: patient.birth_date,
          },
          professional ? {
            name: professional.name,
            license: professional.license,
          } : null,
          selectedProcedureForConsent || undefined,
          new Date(), // signed_at será atualizado no momento do salvamento
          consentFormData.imageAuthorization !== null ? consentFormData.imageAuthorization : undefined
        );

        if (result.ok && result.filledContent) {
          setConsentFormData(prev => ({ ...prev, filledContent: result.filledContent! }));
          setFillResult(null);
          setShowProfessionalConfig(false);
        } else {
          // Faltam dados do profissional
          setFillResult(result);
          setShowProfessionalConfig(true);
          setConsentFormData(prev => ({ ...prev, filledContent: result.previewContent || template.content }));
        }
      }
    } catch (error) {
      logger.error('[CONSENT] Erro ao carregar template:', error);
      toast.error('Erro ao carregar template de consentimento');
      setTemplateNotFound(true);
    }
  };

  const handleSaveProfessionalConfig = async (formData: {
    name: string;
    license: string;
    profession?: string;
    phone?: string;
    address?: string;
  }) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const updatedProfessional = await upsertProfessional({
        user_id: user.id,
        email: user.email || '',
        name: formData.name,
        license: formData.license,
        profession: formData.profession || 'Enfermeira',
        phone: formData.phone,
        address: formData.address,
      });

      toast.success('Perfil profissional salvo com sucesso!');
      
      // Recarregar profissional
      await refreshProfessional();
      
      // Tentar preencher template novamente
      if (patient && consentTemplate) {
        const result = fillConsentTemplate(
          consentTemplate,
          {
            name: patient.name,
            cpf: patient.cpf,
            birth_date: patient.birth_date,
          },
          {
            name: updatedProfessional.name,
            license: updatedProfessional.license,
          },
          selectedProcedureForConsent || undefined,
          new Date(),
          consentFormData.imageAuthorization !== null ? consentFormData.imageAuthorization : undefined
        );

        if (result.ok && result.filledContent) {
          setConsentFormData(prev => ({ ...prev, filledContent: result.filledContent! }));
          setFillResult(null);
          setShowProfessionalConfig(false);
        }
      }
    } catch (error) {
      logger.error('[MEDICAL_RECORD] Erro ao salvar perfil profissional:', error);
      toast.error('Erro ao salvar perfil profissional');
    }
  };

  const handleCreateTemplate = async () => {
    if (!selectedProcedureForConsent || !selectedProcedureLabel) {
      toast.error('Selecione um procedimento primeiro');
      return;
    }

    try {
      // Gerar conteúdo padrão do termo (limpo e profissional)
      const defaultContent = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de {{procedure_name}}.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
Coren: {{professional_license}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:
- O procedimento será realizado conforme protocolo estabelecido
- Podem ocorrer efeitos colaterais que serão explicados durante a consulta
- O resultado pode variar de acordo com cada paciente

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_text}}

Data: {{signed_at}}`;

      // Criar template
      const newTemplate = await createConsentTemplate({
        procedure_key: selectedProcedureForConsent,
        title: `Termo de Consentimento - ${selectedProcedureLabel}`,
        content: defaultContent,
      });

      toast.success('Template criado com sucesso!');
      
      // Recarregar template e abrir modal de assinatura
      setConsentTemplate(newTemplate);
      setTemplateNotFound(false);
      
      // Preencher template inicial
      if (patient) {
        const result = fillConsentTemplate(
          newTemplate,
          {
            name: patient.name,
            cpf: patient.cpf,
            birth_date: patient.birth_date,
          },
          professional ? {
            name: professional.name,
            license: professional.license,
          } : null,
          selectedProcedureForConsent || undefined,
          new Date(), // signed_at será atualizado no momento do salvamento
          consentFormData.imageAuthorization !== null ? consentFormData.imageAuthorization : undefined
        );

        if (result.ok && result.filledContent) {
          setConsentFormData(prev => ({ ...prev, filledContent: result.filledContent! }));
          setFillResult(null);
          setShowProfessionalConfig(false);
        } else {
          // Faltam dados do profissional
          setFillResult(result);
          setShowProfessionalConfig(true);
          setConsentFormData(prev => ({ ...prev, filledContent: result.previewContent || newTemplate.content }));
        }
      }
    } catch (error) {
      logger.error('[CONSENT] Erro ao criar template:', error);
      toast.error('Erro ao criar template de consentimento');
    }
  };

  const handleSaveConsentForm = async () => {
    // Validações específicas com feedback claro
    const validationState = {
      selectedProcedureForConsent,
      consentTemplate: !!consentTemplate,
      patient: !!patient,
      professional: !!professional,
      user: !!user,
      imageAuthorization: consentFormData.imageAuthorization,
      patientSignature: !!consentFormData.patientSignature,
      professionalSignature: !!consentFormData.professionalSignature,
    };

    // 1. Validar procedimento selecionado
    if (!selectedProcedureForConsent) {
      logger.warn('[CONSENT] validation failed: procedure not selected', validationState);
      toast.error('Selecione um procedimento');
      return;
    }

    // 2. Validar template carregado
    if (!consentTemplate) {
      logger.warn('[CONSENT] validation failed: template not loaded', validationState);
      toast.error('Template de consentimento não carregado. Tente novamente.');
      return;
    }

    // 3. Validar paciente
    if (!patient) {
      logger.warn('[CONSENT] validation failed: patient not loaded', validationState);
      toast.error('Dados do paciente não carregados');
      return;
    }

    // 4. Validar profissional
    if (!professional) {
      logger.warn('[CONSENT] validation failed: professional not loaded', validationState);
      toast.error('Dados do profissional não carregados. Configure seu perfil profissional.');
      return;
    }

    // 5. Validar usuário autenticado
    if (!user) {
      logger.warn('[CONSENT] validation failed: user not authenticated', validationState);
      toast.error('Usuário não autenticado');
      return;
    }

    // 6. Validar autorização de imagem (obrigatório)
    if (consentFormData.imageAuthorization === null) {
      logger.warn('[CONSENT] validation failed: image authorization not selected', validationState);
      toast.error('Selecione uma opção de autorização de imagem (AUTORIZO ou NÃO AUTORIZO)');
      return;
    }

    // 7. Validar assinatura do paciente
    if (!consentFormData.patientSignature) {
      logger.warn('[CONSENT] validation failed: patient signature missing', validationState);
      toast.error('Assinatura do paciente é obrigatória. Por favor, assine o termo.');
      return;
    }

    // 8. Validar assinatura do profissional
    if (!consentFormData.professionalSignature) {
      logger.warn('[CONSENT] validation failed: professional signature missing', validationState);
      toast.error('Assinatura do profissional é obrigatória. Por favor, assine o termo.');
      return;
    }

    try {
      setSaving(true);

      // Garantir que existe profissional padrão com license preenchido
      let professionalToUse = professional;
      if (!professional || !professional.license || professional.license.trim() === '') {
        logger.debug('[CONSENT] Ensuring default professional profile', {
          hasProfessional: !!professional,
          hasLicense: !!professional?.license,
        });

        try {
          professionalToUse = await ensureDefaultProfessionalProfile({
            id: user.id,
            email: user.email || undefined,
          });
          logger.debug('[CONSENT] Default professional profile ensured', {
            name: professionalToUse.name,
            license: professionalToUse.license,
          });
        } catch (error: any) {
          logger.error('[CONSENT] Failed to ensure default professional', error);
          toast.error('Erro ao garantir perfil profissional. Tente novamente.');
          setSaving(false);
          return;
        }
      }

      // Upload das assinaturas
      // ⚠️ ATUALIZADO: uploadSignature agora retorna PATH, não URL
      const visitId = `temp-${Date.now()}`; // ID temporário para organização no storage
      
      let patientSignaturePath: string;
      let professionalSignaturePath: string;
      
      try {
        patientSignaturePath = await uploadSignature({
          patientId: patient.id,
          visitId,
          signatureDataUrl: consentFormData.patientSignature,
          signatureType: 'patient',
        });

        professionalSignaturePath = await uploadSignature({
          patientId: patient.id,
          visitId,
          signatureDataUrl: consentFormData.professionalSignature,
          signatureType: 'professional',
        });
      } catch (error: any) {
        if (error.message?.includes('BUCKET_NOT_FOUND')) {
          toast.error(
            'Bucket não encontrado. Por favor, verifique se o bucket "consent-attachments" existe em Supabase > Storage.',
            { duration: 6000 }
          );
        } else {
          toast.error(`Erro ao fazer upload das assinaturas: ${error.message}`);
        }
        throw error;
      }

      // Gerar content_snapshot final com signed_at atualizado
      const signedAt = new Date();
      
      // Log do contexto antes de gerar (apenas em DEV)
      logger.debug('[CONSENT] Generating final content with context', {
        patient: {
          name: patient.name,
          cpf: patient.cpf,
          birth_date: patient.birth_date,
        },
        professional: {
          name: professionalToUse.name,
          license: professionalToUse.license,
        },
        procedureKey: selectedProcedureForConsent,
        procedureLabel: selectedProcedureLabel,
        imageAuthorization: consentFormData.imageAuthorization,
        signedAt: signedAt.toISOString(),
      });

      const finalResult = fillConsentTemplate(
        consentTemplate,
        {
          name: patient.name,
          cpf: patient.cpf,
          birth_date: patient.birth_date,
        },
        {
          name: professionalToUse.name,
          license: professionalToUse.license,
        },
        selectedProcedureForConsent || undefined,
        signedAt,
        consentFormData.imageAuthorization
      );

      if (!finalResult.ok || !finalResult.filledContent) {
        const missingFields = finalResult.missingFields || [];
        const missingFieldsLabels: Record<string, string> = {
          'template_content_missing': 'Conteúdo do template',
          'patient_name': 'Nome do paciente',
          'patient_cpf': 'CPF do paciente',
          'patient_birth_date': 'Data de nascimento do paciente',
          'professional_name': 'Nome do profissional',
          'professional_license': 'Registro do profissional',
          'procedure_key': 'Procedimento selecionado',
          'procedure_name': 'Nome do procedimento',
          'image_authorization': 'Autorização de imagem',
          'filled_content_empty': 'Conteúdo final vazio',
        };

        const missingLabels = missingFields.map(field => missingFieldsLabels[field] || field);
        const errorMessage = missingLabels.length > 0
          ? `Não foi possível salvar o termo. Faltando: ${missingLabels.join(', ')}`
          : 'Erro ao gerar conteúdo final do termo';

        logger.error('[CONSENT] missingFields:', missingFields);
        logger.error('[CONSENT] missingLabels:', missingLabels);
        logger.error('[CONSENT] Failed to generate final content', {
          ok: finalResult.ok,
          filledContent: !!finalResult.filledContent,
          missingFields,
          missingLabels,
          context: {
            patient: {
              name: patient?.name,
              cpf: patient?.cpf,
              birth_date: patient?.birth_date,
            },
            professional: {
              name: professional?.name,
              license: professional?.license,
            },
            procedureKey: selectedProcedureForConsent,
            procedureLabel: selectedProcedureLabel,
            imageAuthorization: consentFormData.imageAuthorization,
          },
        });
        
        toast.error(errorMessage, { duration: 8000 });
        setSaving(false);
        return;
      }

      // Criar consent_form diretamente (visit_procedure_id pode ser null)
      const { data: consentData, error: consentError } = await supabase
        .from('consent_forms')
        .insert([
          {
            visit_procedure_id: null, // Permite criar termo sem visit_procedure
            procedure_key: selectedProcedureForConsent, // procedure_key (slug) do procedimento
            template_id: consentTemplate.id,
            content_snapshot: finalResult.filledContent, // Usar content_snapshot com signed_at atualizado
            filled_content: finalResult.filledContent, // Manter por compatibilidade se existir
            patient_signature_url: patientSignaturePath, // ⚠️ Agora é PATH, não URL
            professional_signature_url: professionalSignaturePath, // ⚠️ Agora é PATH, não URL
            image_authorization: consentFormData.imageAuthorization,
            signed_location: '', // Não usar mais, mas manter campo
            signed_at: signedAt.toISOString(),
            patient_id: patient.id,
            professional_id: professionalToUse.id, // Usa o id da tabela professionals (UUID)
          },
        ])
        .select()
        .single();

      if (consentError) {
        logger.error('[CONSENT] Database error', consentError);
        throw consentError;
      }

      logger.debug('[CONSENT] Successfully saved', {
        consentId: consentData.id,
        procedureKey: selectedProcedureForConsent,
        imageAuthorization: consentFormData.imageAuthorization,
      });

      // Atualizar lista
      // Recarregar lista de termos
      const updatedConsents = await getConsentFormsByPatient(patient.id);
      setConsentForms(updatedConsents);

      // Fechar modal e limpar
      setShowGenerateConsent(false);
      setSelectedProcedureForConsent(null);
      setSelectedProcedureLabel(null);
      setConsentTemplate(null);
      setTemplateNotFound(false);
        setConsentFormData({
          imageAuthorization: null,
          location: '',
          date: new Date().toLocaleDateString('pt-BR'),
          patientSignature: null,
          professionalSignature: null,
          filledContent: '',
        });

      toast.success('Termo de consentimento salvo com sucesso!');
    } catch (error: any) {
      logger.error('[CONSENT] Save error', error);
      const errorMessage = error?.message || 'Erro desconhecido ao salvar termo';
      
      // Mensagens específicas para erros comuns
      if (errorMessage.includes('Bucket not found')) {
        toast.error('Bucket de storage não encontrado. Verifique a configuração do Supabase.');
      } else if (errorMessage.includes('null value')) {
        toast.error('Dados incompletos. Verifique se todos os campos obrigatórios foram preenchidos.');
      } else if (errorMessage.includes('permission') || errorMessage.includes('RLS')) {
        toast.error('Sem permissão para salvar. Verifique as políticas RLS do Supabase.');
      } else {
        toast.error(`Erro ao salvar termo: ${errorMessage}`);
      }
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
        <div className="glass-card p-6 border border-white/10">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-2xl flex items-center justify-center">
              <FileText size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold glow-text">Prontuário Médico</h1>
              <p className="text-gray-300 mt-1">{patient?.name}</p>
              <div className="flex items-center space-x-4 mt-2 text-gray-400 text-sm">
                <div className="flex items-center space-x-1">
                  <Calendar size={14} />
                  <span>Prontuário Digital</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Stethoscope size={14} />
                  <span>{medicalHistory.length} Atendimentos</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="glass-card p-1 border border-white/10">
          <div className="flex space-x-1">
            {[
              { id: 'historico', label: 'Histórico', icon: Clock },
              { id: 'termos', label: 'Termos', icon: FileCheck },
              { id: 'consultas', label: 'Consultas', icon: Stethoscope },
              { id: 'prescricoes', label: 'Prescrições', icon: Pill },
              { id: 'exames', label: 'Exames', icon: Heart },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-300 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-md'
                      : 'text-gray-300 hover:bg-white/5'
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
        {activeTab === 'historico' && (
          <div className="space-y-6">
            {medicalHistory.length === 0 ? (
              <div className="glass-card p-12 text-center border border-white/10">
                <Clock size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-300">Nenhum atendimento registrado</p>
              </div>
            ) : (
              medicalHistory.map((visit) => (
                <div key={visit.id} className="glass-card p-6 border border-white/10">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        Atendimento - {formatDate(visit.visit_date)}
                      </h3>
                      <p className="text-sm text-gray-400">
                        Status: <span className="text-cyan-400">{visit.status}</span>
                      </p>
                    </div>
                  </div>

                  {visit.procedures && visit.procedures.length > 0 && (
                    <div className="space-y-4 mt-4">
                      {visit.procedures.map((procedure: any) => (
                        <div
                          key={procedure.id}
                          className="bg-white/5 rounded-xl p-4 border border-white/10"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-white">{procedure.procedure_name}</h4>
                              <p className="text-sm text-gray-400">
                                {formatDate(procedure.performed_at)}
                              </p>
                              {procedure.units && (
                                <p className="text-xs text-gray-500 mt-1">
                                  Unidades: {procedure.units}
                                </p>
                              )}
                              {procedure.brand && (
                                <p className="text-xs text-gray-500">Marca: {procedure.brand}</p>
                              )}
                              {procedure.lot_number && (
                                <p className="text-xs text-gray-500">Lote: {procedure.lot_number}</p>
                              )}
                            </div>
                            {procedure.consentForm && (
                              <div className="flex items-center gap-2 text-green-400">
                                <CheckCircle size={18} />
                                <span className="text-xs">Termo Assinado</span>
                              </div>
                            )}
                          </div>

                          {procedure.observations && (
                            <div className="mb-3">
                              <p className="text-sm text-gray-300">
                                <span className="font-medium">Observações:</span> {procedure.observations}
                              </p>
                            </div>
                          )}

                          {/* Termo de Consentimento */}
                          {procedure.consentForm && (
                            <div className="mb-3">
                              <button
                                onClick={() => setSelectedConsentForm(procedure.consentForm)}
                                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-lg transition-colors text-cyan-200"
                              >
                                <Eye size={16} />
                                <span className="text-sm">Ver Termo de Consentimento</span>
                              </button>
                            </div>
                          )}

                          {/* Fotos do Adesivo */}
                          {procedure.attachments && procedure.attachments.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                                <ImageIcon size={16} />
                                Fotos do Adesivo ({procedure.attachments.length})
                              </h5>
                              <div className="grid grid-cols-3 gap-2">
                                {procedure.attachments.map((attachment: any) => (
                                  <img
                                    key={attachment.id}
                                    src={attachment.file_url}
                                    alt="Adesivo do produto"
                                    className="w-full h-24 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-cyan-400 transition-colors"
                                    onClick={() => window.open(attachment.file_url, '_blank')}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {visit.notes && (
                    <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-sm text-gray-300">
                        <span className="font-medium">Notas do Atendimento:</span> {visit.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'termos' && (
          <div className="space-y-6">
            {/* Header com botão Gerar Termo */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold glow-text">Termos de Consentimento</h3>
              <button
                onClick={() => {
                  if (needsSetup) {
                    toast.error('Por favor, configure seu perfil profissional primeiro');
                    return;
                  }
                  setShowGenerateConsent(true);
                }}
                disabled={needsSetup || !professional}
                className="neon-button disabled:opacity-50 flex items-center gap-2 px-4 py-2"
              >
                <Plus size={18} />
                <span>Gerar Termo</span>
              </button>
            </div>

            {/* Lista de Termos */}
            {consentForms.length === 0 ? (
              <div className="glass-card p-12 text-center border border-white/10">
                <FileCheck size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-300 mb-4">Nenhum termo assinado ainda</p>
                <button
                  onClick={() => setShowGenerateConsent(true)}
                  className="neon-button inline-flex items-center gap-2 px-6 py-3"
                >
                  <Plus size={18} />
                  <span>Gerar Primeiro Termo</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {consentForms.map((consent) => (
                  <div
                    key={consent.id}
                    className="glass-card p-6 border border-white/10 hover:border-cyan-400/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <FileCheck className="text-cyan-400" size={20} />
                          <h4 className="font-semibold text-white">
                            Termo de Consentimento
                          </h4>
                          {consent.image_authorization && (
                            <span className="px-2 py-1 text-xs bg-green-500/20 text-green-300 rounded-full border border-green-400/30">
                              Autoriza Imagem
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">
                          Assinado em: {formatDate(consent.signed_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedConsentForm(consent)}
                          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/30 rounded-lg transition-colors text-cyan-200"
                        >
                          <Eye size={16} />
                          <span className="text-sm">Ver Termo</span>
                        </button>
                        <button
                          onClick={() => {
                            setDeleteConfirmModal({
                              isOpen: true,
                              consentId: consent.id,
                              isLoading: false,
                            });
                          }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg transition-colors text-red-200"
                        >
                          <Trash2 size={16} />
                          <span className="text-sm">Excluir</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Modal Setup Profissional */}
            {needsSetup && user && (
              <ProfessionalSetupModal
                userId={user.id}
                userEmail={user.email || ''}
                onComplete={(prof) => {
                  refreshProfessional();
                }}
              />
            )}

            {/* Modal Gerar Termo */}
            {showGenerateConsent && patient && professional && !needsSetup && (
              <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="glass-card p-6 border border-white/10 max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold glow-text">Gerar Termo de Consentimento</h3>
                    <button
                      onClick={() => {
                        setShowGenerateConsent(false);
                        setSelectedProcedureForConsent(null);
                        setSelectedProcedureLabel(null);
                        setConsentTemplate(null);
                        setTemplateNotFound(false);
                        setConsentFormData({
                          imageAuthorization: null,
                          location: '',
                          date: new Date().toLocaleDateString('pt-BR'),
                          patientSignature: null,
                          professionalSignature: null,
                          filledContent: '',
                        });
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X size={20} className="text-gray-300" />
                    </button>
                  </div>

                  {!selectedProcedureForConsent ? (
                    <ProcedureSelector
                      selectedProcedures={selectedProcedureForConsent ? [selectedProcedureForConsent] : []}
                      onSelectionChange={(keys) => {
                        if (keys.length > 0) {
                          setSelectedProcedureForConsent(keys[0]);
                          loadConsentTemplate(keys[0]);
                        }
                      }}
                      onProcedureSelect={(procedure) => {
                        setSelectedProcedureLabel(procedure.procedure_type);
                      }}
                      multiSelect={false}
                    />
                  ) : templateNotFound ? (
                    <div className="glass-card p-6 border border-yellow-400/30 bg-yellow-500/10">
                      <div className="text-center py-8">
                        <AlertTriangle className="mx-auto mb-4 text-yellow-400" size={48} />
                        <h4 className="text-lg font-semibold text-yellow-200 mb-2">
                          Template não cadastrado
                        </h4>
                        <p className="text-gray-300 mb-4">
                          Não existe template de consentimento cadastrado para o procedimento: <strong>{selectedProcedureLabel || selectedProcedureForConsent}</strong>
                        </p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => {
                              setSelectedProcedureForConsent(null);
                              setTemplateNotFound(false);
                            }}
                            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
                          >
                            Voltar
                          </button>
                          <button
                            onClick={handleCreateTemplate}
                            className="neon-button px-6 py-3"
                          >
                            Criar Template
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : consentTemplate ? (
                    <div className="space-y-6">
                      {/* Preview do Termo Preenchido */}
                      <div className="glass-card rounded-xl p-6 border border-white/10 max-h-96 overflow-y-auto">
                        <div className="space-y-4">
                          <h3 className="text-lg font-bold text-center text-white mb-4 border-b border-white/10 pb-2">
                            {consentTemplate.title}
                          </h3>
                          <div 
                            className="prose prose-invert max-w-none text-gray-200 whitespace-pre-wrap text-sm leading-relaxed"
                            style={{ 
                              fontFamily: 'system-ui, -apple-system, sans-serif',
                              lineHeight: '1.6'
                            }}
                          >
                            {consentFormData.filledContent || ''}
                          </div>
                        </div>
                      </div>

                      {/* Autorização de Imagem */}
                      <div className="glass-card p-6 border border-white/10 space-y-4">
                        <h4 className="text-sm font-semibold text-gray-200 mb-3">
                          AUTORIZAÇÃO DE USO DE IMAGEM
                        </h4>
                        <div className="space-y-3">
                          <label className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                            consentFormData.imageAuthorization === true
                              ? 'border-cyan-400/50 bg-cyan-500/10'
                              : 'border-white/10 hover:border-cyan-400/30 bg-white/5 hover:bg-white/10'
                          }`}>
                            <input
                              type="radio"
                              name="imageAuthorization"
                              value="true"
                              checked={consentFormData.imageAuthorization === true}
                              onChange={(e) => {
                                const newAuth = e.target.value === 'true' ? true : false;
                                setConsentFormData(prev => {
                                  const updated = { ...prev, imageAuthorization: newAuth };
                                  
                                  // Atualizar preview do termo
                                  if (patient && consentTemplate && professional) {
                                    const result = fillConsentTemplate(
                                      consentTemplate,
                                      {
                                        name: patient.name,
                                        cpf: patient.cpf,
                                        birth_date: patient.birth_date,
                                      },
                                      {
                                        name: professional.name,
                                        license: professional.license,
                                      },
                                      selectedProcedureForConsent || undefined,
                                      new Date(),
                                      newAuth
                                    );
                                    if (result.ok && result.filledContent) {
                                      updated.filledContent = result.filledContent;
                                    }
                                  }
                                  
                                  return updated;
                                });
                              }}
                              className="mt-1 w-5 h-5 border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <span className="text-gray-200 font-medium">AUTORIZO</span>
                              <p className="text-sm text-gray-400 mt-1">
                                Autorizo o uso de minhas imagens para fins de documentação clínica e divulgação científica.
                              </p>
                            </div>
                          </label>
                          
                          <label className={`flex items-start gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                            consentFormData.imageAuthorization === false
                              ? 'border-cyan-400/50 bg-cyan-500/10'
                              : 'border-white/10 hover:border-cyan-400/30 bg-white/5 hover:bg-white/10'
                          }`}>
                            <input
                              type="radio"
                              name="imageAuthorization"
                              value="false"
                              checked={consentFormData.imageAuthorization === false}
                              onChange={(e) => {
                                const newAuth = e.target.value === 'true' ? true : false;
                                setConsentFormData(prev => {
                                  const updated = { ...prev, imageAuthorization: newAuth };
                                  
                                  // Atualizar preview do termo
                                  if (patient && consentTemplate && professional) {
                                    const result = fillConsentTemplate(
                                      consentTemplate,
                                      {
                                        name: patient.name,
                                        cpf: patient.cpf,
                                        birth_date: patient.birth_date,
                                      },
                                      {
                                        name: professional.name,
                                        license: professional.license,
                                      },
                                      selectedProcedureForConsent || undefined,
                                      new Date(),
                                      newAuth
                                    );
                                    if (result.ok && result.filledContent) {
                                      updated.filledContent = result.filledContent;
                                    }
                                  }
                                  
                                  return updated;
                                });
                              }}
                              className="mt-1 w-5 h-5 border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <span className="text-gray-200 font-medium">NÃO AUTORIZO</span>
                              <p className="text-sm text-gray-400 mt-1">
                                Não autorizo o uso de minhas imagens para qualquer finalidade.
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>


                      {/* Assinaturas */}
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">Assinatura do Paciente</h4>
                          <SignaturePad
                            onSignatureChange={(dataUrl) => setConsentFormData(prev => ({ ...prev, patientSignature: dataUrl }))}
                            width={600}
                            height={200}
                          />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">Assinatura do Profissional</h4>
                          <SignaturePad
                            onSignatureChange={(dataUrl) => setConsentFormData(prev => ({ ...prev, professionalSignature: dataUrl }))}
                            width={600}
                            height={200}
                          />
                        </div>
                      </div>

                      {/* Botão Salvar */}
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => {
                            setShowGenerateConsent(false);
                            setSelectedProcedureForConsent(null);
                            setConsentTemplate(null);
                          }}
                          className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleSaveConsentForm}
                          disabled={
                            !selectedProcedureForConsent ||
                            !consentTemplate ||
                            !patient ||
                            !professional ||
                            consentFormData.imageAuthorization === null ||
                            !consentFormData.patientSignature ||
                            !consentFormData.professionalSignature ||
                            saving
                          }
                          className="neon-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6 py-3 relative"
                        >
                          <Save size={18} />
                          <span>{saving ? 'Salvando...' : 'Salvar Termo'}</span>
                        </button>
                        {/* Mensagem de motivo de desabilitação */}
                        {(
                          !selectedProcedureForConsent ||
                          !consentTemplate ||
                          !patient ||
                          !professional ||
                          consentFormData.imageAuthorization === null ||
                          !consentFormData.patientSignature ||
                          !consentFormData.professionalSignature
                        ) && (
                          <div className="text-xs text-yellow-400 mt-2 text-right space-y-1">
                            {!selectedProcedureForConsent && <div>• Selecione um procedimento</div>}
                            {!consentTemplate && <div>• Template não carregado</div>}
                            {!patient && <div>• Paciente não carregado</div>}
                            {!professional && <div>• Profissional não configurado</div>}
                            {consentFormData.imageAuthorization === null && <div>• Selecione SIM/NÃO na autorização de imagem</div>}
                            {!consentFormData.patientSignature && <div>• Assinatura do paciente obrigatória</div>}
                            {!consentFormData.professionalSignature && <div>• Assinatura do profissional obrigatória</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <LoadingSpinner size="lg" />
                      <p className="mt-4 text-gray-300">Carregando template...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'consultas' && (
          <div className="space-y-6">
            {/* Nova Consulta */}
            <div className="glass-card p-6 border border-white/10">
              <h3 className="text-lg font-semibold glow-text mb-4 flex items-center space-x-2">
                <Plus size={20} className="text-cyan-400" />
                <span>Nova Consulta</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Data da Consulta</label>
                  <input
                    type="date"
                    value={newConsultation.date}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Motivo da Consulta</label>
                  <input
                    type="text"
                    value={newConsultation.reason}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                    placeholder="Ex: Check-up anual"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-1">Sintomas Apresentados</label>
                  <textarea
                    value={newConsultation.symptoms}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, symptoms: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all h-20 resize-none"
                    placeholder="Descreva os sintomas..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-1">Diagnóstico</label>
                  <textarea
                    value={newConsultation.diagnosis}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, diagnosis: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all h-20 resize-none"
                    placeholder="Hipótese diagnóstica..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-1">Conduta e Tratamento</label>
                  <textarea
                    value={newConsultation.treatment}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, treatment: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all h-20 resize-none"
                    placeholder="Conduta médica e tratamento prescrito..."
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={addConsultation}
                  disabled={saving}
                  className="neon-button disabled:opacity-50 flex items-center space-x-2 px-6 py-3"
                >
                  {saving ? <LoadingSpinner size="sm" /> : <Save size={18} />}
                  <span>Registrar Consulta</span>
                </button>
              </div>
            </div>

            {/* Histórico de Consultas */}
            <div className="glass-card p-6 border border-white/10">
              <h3 className="text-lg font-semibold glow-text mb-4">Histórico de Consultas</h3>
              
              {consultations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Stethoscope size={48} className="mx-auto mb-4 text-gray-500" />
                  <p>Nenhuma consulta registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {consultations.map((consultation) => (
                    <div key={consultation.id} className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-cyan-400/30 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-white">{consultation.reason}</h4>
                          <p className="text-sm text-gray-400">
                            {new Date(consultation.date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="p-1 text-cyan-400 hover:text-cyan-300">
                            <Edit size={16} />
                          </button>
                          <button className="p-1 text-red-400 hover:text-red-300">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {consultation.diagnosis && (
                        <div className="mb-2">
                          <span className="text-sm font-medium text-gray-300">Diagnóstico:</span>
                          <p className="text-sm text-gray-400">{consultation.diagnosis}</p>
                        </div>
                      )}
                      
                      {consultation.treatment && (
                        <div>
                          <span className="text-sm font-medium text-gray-300">Conduta:</span>
                          <p className="text-sm text-gray-400">{consultation.treatment}</p>
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
          <div className="glass-card p-6 border border-white/10">
            <div className="text-center py-8 text-gray-400">
              <Pill size={48} className="mx-auto mb-4 text-gray-500" />
              <p>Módulo de Prescrições em Desenvolvimento</p>
            </div>
          </div>
        )}

        {activeTab === 'exames' && (
          <div className="glass-card p-6 border border-white/10">
            <div className="text-center py-8 text-gray-400">
              <Heart size={48} className="mx-auto mb-4 text-gray-500" />
              <p>Módulo de Exames em Desenvolvimento</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Visualização do Termo */}
      {selectedConsentForm && patient && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedConsentForm(null)}
        >
          <div className="glass-card p-6 border border-white/10 max-w-4xl w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold glow-text">Termo de Consentimento</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDeleteConfirmModal({
                      isOpen: true,
                      consentId: selectedConsentForm.id,
                      isLoading: false,
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg transition-colors text-red-200"
                >
                  <Trash2 size={16} />
                  <span className="text-sm">Excluir</span>
                </button>
                <button
                  onClick={() => setSelectedConsentForm(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-300" />
                </button>
              </div>
            </div>
            <ConsentFormViewer
              template={{
                id: selectedConsentForm.template_id || '',
                title: 'Termo de Consentimento',
                content: selectedConsentForm.content_snapshot || selectedConsentForm.filled_content || '',
              }}
              patient={patient}
              initialData={{
                filledContent: selectedConsentForm.content_snapshot || selectedConsentForm.filled_content || '',
                patientSignatureUrl: selectedConsentForm.patient_signature_url,
                professionalSignatureUrl: selectedConsentForm.professional_signature_url,
                imageAuthorization: selectedConsentForm.image_authorization,
                signedLocation: selectedConsentForm.signed_location,
                signedAt: selectedConsentForm.signed_at,
              }}
              readOnly={true}
            />
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={deleteConfirmModal.isOpen}
        title="Excluir Termo de Consentimento"
        message="Deseja excluir este termo? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isLoading={deleteConfirmModal.isLoading}
        onConfirm={async () => {
          if (!deleteConfirmModal.consentId) return;

          setDeleteConfirmModal(prev => ({ ...prev, isLoading: true }));

          try {
            await deleteConsentForm(deleteConfirmModal.consentId, {
              removeStorageFiles: true, // Remover arquivos do storage
            });

            toast.success('Termo excluído com sucesso');

            // Fechar modal de visualização se estiver aberto
            if (selectedConsentForm?.id === deleteConfirmModal.consentId) {
              setSelectedConsentForm(null);
            }

            // Recarregar lista
            const updatedConsents = await getConsentFormsByPatient(patient.id);
            setConsentForms(updatedConsents);

            // Fechar modal de confirmação
            setDeleteConfirmModal({
              isOpen: false,
              consentId: null,
              isLoading: false,
            });
          } catch (error: any) {
            logger.error('[CONSENT] Erro ao excluir termo:', error);
            
            if (error.message?.includes('RLS') || error.message?.includes('policy')) {
              toast.error('Você não tem permissão para excluir este termo');
            } else {
              toast.error(`Erro ao excluir termo: ${error.message}`);
            }

            setDeleteConfirmModal(prev => ({ ...prev, isLoading: false }));
          }
        }}
        onCancel={() => {
          setDeleteConfirmModal({
            isOpen: false,
            consentId: null,
            isLoading: false,
          });
        }}
      />
    </AppLayout>
  );
};

export default MedicalRecordScreen;
