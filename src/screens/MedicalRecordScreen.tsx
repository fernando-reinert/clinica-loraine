// src/screens/MedicalRecordScreen.tsx (Prontuário Profissional)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase/client';
import { 
  Save, ArrowLeft, User, FileText, Calendar, 
  Heart, Stethoscope, Pill, AlertTriangle,
  Clock, Plus, Edit, Trash2, Eye, Image as ImageIcon, CheckCircle, FileCheck, X, GalleryVertical
} from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import ConsentFormViewer from '../components/ConsentFormViewer';
import ProcedureSelector from '../components/ProcedureSelector';
import SignaturePad from '../components/SignaturePad';
import ImageLightbox from '../components/ImageLightbox';
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
import { getTermByProcedureKey, renderTermo, hasTermo } from '../termos/registry';
import { getProcedureDisplayName, normalizeProcedure } from '../utils/mappers';
import type { TermoContext } from '../termos/types';
import { useAuth } from '../contexts/AuthContext';
import { useProfessional } from '../hooks/useProfessional';
import ProfessionalSetupModal from '../components/ProfessionalSetupModal';
import { uploadSignature, uploadConsultationPhoto, getViewableUrl, deleteFile, STORAGE_BUCKETS } from '../services/storage/storageService';
import { upsertProfessional, ensureDefaultProfessionalProfile } from '../services/professionals/professionalService';
import { deleteConsentForm } from '../services/consents/consentService';
import { createConsultation, updateConsultation } from '../services/consultations/consultationService';
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
  
  // Estado para controlar edição de consulta
  const [editingConsultationId, setEditingConsultationId] = useState<string | null>(null);
  
  // Estado para modal de confirmação de exclusão de consulta
  const [deleteConsultationModal, setDeleteConsultationModal] = useState<{
    isOpen: boolean;
    consultationId: string | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    consultationId: null,
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
  // Inicializar campos de data como null (não string vazia)
  const [newConsultation, setNewConsultation] = useState<{
    date: string | null;
    reason: string;
    symptoms: string;
    diagnosis: string;
    treatment: string;
    notes: string;
    next_appointment: string | null;
  }>({
    date: new Date().toISOString().split('T')[0], // Data inicial válida
    reason: '',
    symptoms: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    next_appointment: null // null em vez de ''
  });

  // Fotos do procedimento (antes de salvar)
  const [consultationPhotos, setConsultationPhotos] = useState<Array<{
    id: string;
    file: File;
    preview: string;
  }>>([]);
  
  // Fotos já salvas (para consultas existentes)
  const [consultationAttachments, setConsultationAttachments] = useState<Record<string, any[]>>({});
  // URLs visualizáveis das imagens (cache)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  // Rastrear imagens que falharam ao carregar (para mostrar placeholder)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  
  // Lightbox para visualizar imagens
  const [lightboxState, setLightboxState] = useState<{
    isOpen: boolean;
    images: Array<{ id: string; url: string; name?: string }>;
    currentIndex: number;
  }>({
    isOpen: false,
    images: [],
    currentIndex: 0,
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
      if (id) {
        const history = await getPatientMedicalHistory(id);
        setMedicalHistory(history);

        // Carregar todos os termos de consentimento do paciente
        const allConsents = await getConsentFormsByPatient(id);
        setConsentForms(allConsents);
      }

      // Carregar consultas (legado)
      const { data: consultationsData } = await supabase
        .from('consultations')
        .select('*')
        .eq('patient_id', id)
        .order('date', { ascending: false });

      if (consultationsData) {
        setConsultations(consultationsData);
        
        // Carregar anexos de cada consulta
        const attachmentsMap: Record<string, any[]> = {};
        const urlsMap: Record<string, string> = {};
        
        // Verificar se já sabemos que a tabela não existe
        const tableMissing = (window as any).__consultationAttachmentsTableMissing;
        
        // Se já sabemos que a tabela não existe, pular todas as requisições
        if (!tableMissing) {
          for (const consultation of consultationsData) {
            // Tentar buscar anexos
            const { data: attachments, error: attachmentsError } = await supabase
              .from('consultation_attachments')
              .select('*')
              .eq('consultation_id', consultation.id)
              .order('created_at', { ascending: false });
            
            // Se erro 404 (tabela não existe), marcar e parar
            if (attachmentsError) {
              // Verificar se é erro 404 (tabela não existe)
              const is404Error = attachmentsError.code === 'PGRST116' || 
                                 attachmentsError.message?.includes('404') || 
                                 attachmentsError.message?.includes('does not exist');
              
              if (is404Error) {
                // Tabela não existe - marcar e parar todas as requisições
                (window as any).__consultationAttachmentsTableMissing = true;
                if (!tableMissing) {
                  logger.warn('[MEDICAL_RECORD] Tabela consultation_attachments não encontrada. Execute a migration 20250125000011_consultation_attachments.sql');
                  console.warn('[MEDICAL_RECORD] ⚠️ Tabela consultation_attachments não existe. Execute a migration no Supabase.');
                }
                break; // Parar loop - não fazer mais requisições
              } else {
                // Outro tipo de erro - logar normalmente
                logger.error('[MEDICAL_RECORD] Erro ao buscar anexos:', attachmentsError);
              }
              continue;
            }
            
            if (attachments && attachments.length > 0) {
              attachmentsMap[consultation.id] = attachments;
              
              // Carregar URLs visualizáveis (signed URLs para buckets privados)
              for (const attachment of attachments) {
                // Priorizar 'path' se existir, senão 'file_path', senão 'file_url'
                const pathToUse = (attachment as any).path || attachment.file_path || attachment.file_url || '';
                
                if (pathToUse) {
                  try {
                    // Sempre usar getViewableUrl para gerar signed URL (bucket é privado)
                    const viewableUrl = await getViewableUrl(
                      STORAGE_BUCKETS.CONSULTATION_ATTACHMENTS,
                      pathToUse,
                      3600 // 1 hora de expiração
                    );
                    urlsMap[attachment.id] = viewableUrl;
                  } catch (error) {
                    // Log apenas uma vez por attachment para evitar spam
                    if (!(window as any).__attachmentUrlErrorLogged?.[attachment.id]) {
                      logger.warn('[MEDICAL_RECORD] Erro ao obter URL visualizável da imagem:', {
                        attachmentId: attachment.id,
                        path: pathToUse,
                        error: error instanceof Error ? error.message : String(error),
                      });
                      (window as any).__attachmentUrlErrorLogged = (window as any).__attachmentUrlErrorLogged || {};
                      (window as any).__attachmentUrlErrorLogged[attachment.id] = true;
                    }
                    // Fallback para file_url se getViewableUrl falhar
                    urlsMap[attachment.id] = attachment.file_url || '';
                  }
                } else {
                  // Fallback se não houver path
                  urlsMap[attachment.id] = attachment.file_url || '';
                }
              }
            }
          }
        }
        
        // Só atualizar state se tiver dados
        if (Object.keys(attachmentsMap).length > 0) {
          setConsultationAttachments(attachmentsMap);
          setImageUrls(urlsMap);
        }
      }

    } catch (error) {
      logger.error('[MEDICAL_RECORD] Erro ao carregar dados:', error);
      toast.error('Erro ao carregar prontuário');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem válida`);
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error(`${file.name} é muito grande (máximo 5MB)`);
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        setConsultationPhotos(prev => [...prev, {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  };

  const removePhoto = (photoId: string) => {
    setConsultationPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  // Função para editar consulta (preencher formulário)
  const handleEditConsultation = (consultation: any) => {
    setEditingConsultationId(consultation.id);
    setNewConsultation({
      date: consultation.date ? new Date(consultation.date).toISOString().split('T')[0] : null,
      reason: consultation.reason || '',
      symptoms: consultation.symptoms || '',
      diagnosis: consultation.diagnosis || '',
      treatment: consultation.treatment || '',
      notes: consultation.notes || '',
      next_appointment: consultation.next_appointment ? new Date(consultation.next_appointment).toISOString().split('T')[0] : null,
    });
    // Limpar fotos selecionadas (fotos existentes já estão em consultationAttachments)
    setConsultationPhotos([]);
    // Scroll para o formulário
    document.getElementById('consultation-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Função para cancelar edição
  const handleCancelEdit = () => {
    setEditingConsultationId(null);
    setNewConsultation({
      date: new Date().toISOString().split('T')[0],
      reason: '',
      symptoms: '',
      diagnosis: '',
      treatment: '',
      notes: '',
      next_appointment: null,
    });
    setConsultationPhotos([]);
  };

  // Função para excluir consulta
  const handleDeleteConsultation = (consultationId: string) => {
    setDeleteConsultationModal({
      isOpen: true,
      consultationId,
      isLoading: false,
    });
  };

  const addConsultation = async () => {
    if (!newConsultation.reason || !newConsultation.date) {
      toast.error('Preencha pelo menos a data e o motivo da consulta');
      return;
    }

    setSaving(true);
    try {
      let consultationData;
      
      // Se estiver editando, atualizar; senão, criar nova
      if (editingConsultationId) {
        consultationData = await updateConsultation(editingConsultationId, {
          ...newConsultation
        });
        toast.success('Consulta atualizada com sucesso!');
      } else {
        // Criar consulta primeiro (necessário para ter consultationId)
        consultationData = await createConsultation({
          patient_id: id!,
          ...newConsultation
        });
      }

      // Upload das fotos se houver (agora com consultationId real)
      if (consultationPhotos.length > 0) {
        const failedUploads: string[] = [];
        const uploadedPaths: string[] = [];
        
        for (const photo of consultationPhotos) {
          try {
            const uploadResult = await uploadConsultationPhoto({
              patientId: id!,
              consultationId: consultationData.id,
              file: photo.file,
            });

            // Garantir que path seja sempre uma string válida
            const path = uploadResult.path;
            if (!path || typeof path !== 'string' || path.trim() === '') {
              throw new Error(`Path inválido retornado do upload para o arquivo ${photo.file.name}`);
            }

            // Gerar URL visualizável (signed URL se bucket privado, public URL se público)
            let viewableUrl: string | null = null;
            try {
              viewableUrl = await getViewableUrl(
                STORAGE_BUCKETS.CONSULTATION_ATTACHMENTS,
                path,
                3600 // 1 hora
              );
            } catch (urlError) {
              // Se falhar, usar url pública se disponível
              viewableUrl = uploadResult.url || null;
              logger.warn('[MEDICAL_RECORD] Erro ao gerar signed URL, usando URL pública:', urlError);
            }

            // Salvar anexo no banco - usar apenas colunas básicas que existem
            // Colunas obrigatórias: consultation_id, patient_id, path (ou file_path)
            // Enviar ambos 'path' e 'file_path' para compatibilidade com diferentes schemas
            const attachmentData: Record<string, any> = {
              consultation_id: consultationData.id,
              patient_id: id,
              path: path, // Coluna obrigatória (NOT NULL)
              file_path: path, // Também enviar como file_path (compatibilidade)
            };

            // Adicionar colunas opcionais se disponíveis
            if (photo.file.name) {
              attachmentData.file_name = photo.file.name;
            }
            if (photo.file.type) {
              attachmentData.mime_type = photo.file.type;
            }
            if (viewableUrl) {
              attachmentData.file_url = viewableUrl;
            }
            
            const { error: attachmentError, data: insertedAttachment } = await supabase
              .from('consultation_attachments')
              .insert([attachmentData])
              .select()
              .single();

            if (attachmentError) {
              // Tratar diferentes tipos de erro
              const isTableMissing = attachmentError.code === 'PGRST116' || 
                                     attachmentError.message?.includes('404') || 
                                     attachmentError.message?.includes('does not exist');
              
              const isColumnMissing = attachmentError.code === 'PGRST204' ||
                                      attachmentError.message?.includes('Could not find') ||
                                      attachmentError.message?.includes('column');
              
              if (isTableMissing || isColumnMissing) {
                // Tabela não existe ou coluna não encontrada
                if (!(window as any).__consultationAttachmentsTableMissing) {
                  const errorMsg = isColumnMissing 
                    ? 'Schema da tabela consultation_attachments incompatível. Verifique se a migration foi executada corretamente.'
                    : 'Tabela consultation_attachments não encontrada. Execute a migration 20250125000011_consultation_attachments.sql';
                  
                  logger.error('[MEDICAL_RECORD] Erro ao salvar anexo:', {
                    error: attachmentError.message,
                    code: attachmentError.code,
                    message: errorMsg,
                  });
                  toast.error('Erro ao salvar foto no banco. Foto enviada para storage mas não salva. Verifique o schema da tabela.');
                  (window as any).__consultationAttachmentsTableMissing = true;
                }
                // Foto foi enviada para storage, mas não foi salva no DB
                // Continuar sem salvar no banco
              } else {
                // Outro tipo de erro - logar e adicionar à lista de falhas
                if (!failedUploads.includes(photo.file.name)) {
                  logger.error('[MEDICAL_RECORD] Erro ao salvar anexo no banco:', {
                    error: attachmentError.message,
                    code: attachmentError.code,
                    fileName: photo.file.name,
                  });
                  toast.error(`Erro ao salvar ${photo.file.name}: ${attachmentError.message}`);
                }
                failedUploads.push(photo.file.name);
              }
            } else if (insertedAttachment) {
              uploadedPaths.push(path);
              
              // Cachear URL visualizável (já foi gerada acima)
              if (viewableUrl) {
                setImageUrls(prev => ({
                  ...prev,
                  [insertedAttachment.id]: viewableUrl!,
                }));
              } else {
                // Se não tiver URL, tentar gerar novamente
                try {
                  const generatedUrl = await getViewableUrl(
                    STORAGE_BUCKETS.CONSULTATION_ATTACHMENTS,
                    path,
                    3600 // 1 hora
                  );
                  setImageUrls(prev => ({
                    ...prev,
                    [insertedAttachment.id]: generatedUrl,
                  }));
                } catch (urlError) {
                  logger.warn('[MEDICAL_RECORD] Erro ao gerar signed URL:', urlError);
                  // Usar file_url do banco se disponível
                  if (insertedAttachment.file_url) {
                    setImageUrls(prev => ({
                      ...prev,
                      [insertedAttachment.id]: insertedAttachment.file_url,
                    }));
                  }
                }
              }
            }
          } catch (uploadError: any) {
            // Log apenas uma vez por arquivo
            if (!failedUploads.includes(photo.file.name)) {
              logger.error('[MEDICAL_RECORD] Erro ao fazer upload da foto:', uploadError);
            }
            failedUploads.push(photo.file.name);
            
            // ⚠️ ESTRATÉGIA: Se upload falhar (especialmente BUCKET_NOT_FOUND), deletar consulta e bloquear
            // Nota: Bucket já existe, então esse erro não deve ocorrer, mas mantemos o tratamento
            if (uploadError.message?.includes('BUCKET_NOT_FOUND') || 
                uploadError.message?.includes('Bucket not found')) {
              // Deletar consulta criada (rollback)
              try {
                await supabase
                  .from('consultations')
                  .delete()
                  .eq('id', consultationData.id);
              } catch (deleteError) {
                logger.error('[MEDICAL_RECORD] Erro ao fazer rollback (deletar consulta):', deleteError);
              }
              
              toast.error(`Não foi possível enviar a(s) foto(s). ${uploadError.message || 'Verifique a configuração do storage.'} A consulta não foi salva.`);
              setSaving(false);
              return; // Bloquear salvamento
            }
            
            // Outros erros de upload - avisar mas não bloquear salvamento da consulta
            toast.error(`Erro ao fazer upload de ${photo.file.name}: ${uploadError.message || 'Erro desconhecido'}`);
          }
        }

        // Se algum upload falhou (mas não foi erro de bucket), avisar mas manter consulta
        if (failedUploads.length > 0 && failedUploads.length < consultationPhotos.length) {
          toast.error(`Algumas fotos não puderam ser enviadas: ${failedUploads.join(', ')}`);
        }

        // Recarregar todos os anexos da consulta (incluindo os recém-criados)
        // Isso garante que os anexos apareçam imediatamente após salvar
        const tableMissingCheck = (window as any).__consultationAttachmentsTableMissing;
        if (!tableMissingCheck) {
          const { data: savedAttachments, error: reloadError } = await supabase
            .from('consultation_attachments')
            .select('*')
            .eq('consultation_id', consultationData.id)
            .order('created_at', { ascending: false });
          
          // Se erro 404 ou PGRST204 (tabela/coluna não existe), apenas continuar sem anexos
          if (reloadError) {
            if (reloadError.code === 'PGRST116' || 
                reloadError.code === 'PGRST204' ||
                reloadError.message?.includes('404') || 
                reloadError.message?.includes('does not exist') ||
                reloadError.message?.includes('Could not find')) {
              // Tabela não existe ou coluna não encontrada - marcar e continuar
              const wasMissing = (window as any).__consultationAttachmentsTableMissing;
              (window as any).__consultationAttachmentsTableMissing = true;
              if (!wasMissing) {
                logger.warn('[MEDICAL_RECORD] Tabela consultation_attachments não encontrada ou schema incompatível. Execute a migration 20250125000011_consultation_attachments.sql');
              }
            } else {
              logger.error('[MEDICAL_RECORD] Erro ao recarregar anexos:', reloadError);
            }
          } else if (savedAttachments && savedAttachments.length > 0) {
            // Atualizar state com anexos salvos
            setConsultationAttachments(prev => ({
              ...prev,
              [consultationData.id]: savedAttachments,
            }));
            
            // Gerar signed URLs para todos os anexos (apenas os que ainda não têm URL cacheada)
            const urlsMap: Record<string, string> = {};
            for (const attachment of savedAttachments) {
              // Se já tem URL cacheada, usar ela
              if (imageUrls[attachment.id]) {
                urlsMap[attachment.id] = imageUrls[attachment.id];
                continue;
              }
              
              // Gerar signed URL para o anexo
              // Usar 'path' se existir, senão 'file_path', senão 'file_url'
              const pathToUse = (attachment as any).path || attachment.file_path || attachment.file_url || '';
              if (pathToUse) {
                try {
                  const viewableUrl = await getViewableUrl(
                    STORAGE_BUCKETS.CONSULTATION_ATTACHMENTS,
                    pathToUse,
                    3600 // 1 hora
                  );
                  urlsMap[attachment.id] = viewableUrl;
                } catch (error) {
                  // Fallback para file_url se signed URL falhar
                  urlsMap[attachment.id] = attachment.file_url || '';
                }
              } else {
                urlsMap[attachment.id] = attachment.file_url || '';
              }
            }
            setImageUrls(prev => ({ ...prev, ...urlsMap }));
          }
        }
      }

      // Se não estava editando, adicionar nova consulta no início da lista
      if (!editingConsultationId) {
        setConsultations(prev => [consultationData, ...prev]);
      }
      
      // Mensagem de sucesso (com contagem de fotos)
      const photosCount = consultationPhotos.length;
      if (photosCount > 0) {
        toast.success(`${editingConsultationId ? 'Consulta atualizada' : 'Consulta registrada'} com sucesso! ${photosCount} foto${photosCount > 1 ? 's' : ''} anexada${photosCount > 1 ? 's' : ''}.`);
      } else if (!editingConsultationId) {
        // Só mostrar mensagem simples se não estava editando e não tinha fotos
        toast.success('Consulta registrada com sucesso!');
      }

      // Limpar formulário e resetar estado
      setNewConsultation({
        date: new Date().toISOString().split('T')[0],
        reason: '',
        symptoms: '',
        diagnosis: '',
        treatment: '',
        notes: '',
        next_appointment: null,
      });
      setConsultationPhotos([]);
      setEditingConsultationId(null);

      // Recarregar consultas para atualizar lista
      await loadPatientAndRecord();
    } catch (error: any) {
      // Ignorar erro do Chrome Extension (não-bloqueante)
      if (error?.message?.includes('message channel closed') || 
          error?.message?.includes('listener indicated an asynchronous response')) {
        // Erro do Chrome Extension - não afeta a funcionalidade, apenas logar em debug
        logger.debug('[MEDICAL_RECORD] Erro do Chrome Extension ignorado:', error.message);
        // Continuar normalmente - não mostrar erro ao usuário
      } else {
        logger.error('[MEDICAL_RECORD] Erro ao salvar consulta:', error);
        toast.error(`Erro ao ${editingConsultationId ? 'atualizar' : 'registrar'} consulta: ${error.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  // Função para excluir consulta (chamada pelo modal de confirmação)
  const confirmDeleteConsultation = async () => {
    if (!deleteConsultationModal.consultationId) return;

    setDeleteConsultationModal(prev => ({ ...prev, isLoading: true }));

    try {
      // Deletar anexos primeiro (se existirem)
      const attachments = consultationAttachments[deleteConsultationModal.consultationId] || [];
      if (attachments.length > 0) {
        for (const attachment of attachments) {
          const pathToDelete = (attachment as any).path || attachment.file_path;
          if (pathToDelete) {
            try {
              await deleteFile(STORAGE_BUCKETS.CONSULTATION_ATTACHMENTS, pathToDelete);
            } catch (deleteError) {
              logger.warn('[MEDICAL_RECORD] Erro ao deletar arquivo do storage:', deleteError);
              // Continuar mesmo se falhar (pode ser que o arquivo já não exista)
            }
          }
        }
      }

      // Deletar anexos do banco (se tabela existir)
      try {
        await supabase
          .from('consultation_attachments')
          .delete()
          .eq('consultation_id', deleteConsultationModal.consultationId);
      } catch (attachmentError: any) {
        // Ignorar se tabela não existir
        if (attachmentError.code !== 'PGRST116' && !attachmentError.message?.includes('404')) {
          logger.warn('[MEDICAL_RECORD] Erro ao deletar anexos do banco:', attachmentError);
        }
      }

      // Deletar consulta
      const { error } = await supabase
        .from('consultations')
        .delete()
        .eq('id', deleteConsultationModal.consultationId);

      if (error) throw error;

      toast.success('Consulta excluída com sucesso!');

      // Limpar estados relacionados
      setConsultationAttachments(prev => {
        const updated = { ...prev };
        delete updated[deleteConsultationModal.consultationId!];
        return updated;
      });

      // Recarregar consultas
      await loadPatientAndRecord();

      // Fechar modal
      setDeleteConsultationModal({
        isOpen: false,
        consultationId: null,
        isLoading: false,
      });
    } catch (error: any) {
      logger.error('[MEDICAL_RECORD] Erro ao excluir consulta:', error);
      toast.error(`Erro ao excluir consulta: ${error.message}`);
      setDeleteConsultationModal(prev => ({ ...prev, isLoading: false }));
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

  /**
   * Carregar termo de consentimento pelo procedureKey
   * Usa APENAS o novo sistema de termos (src/termos/)
   */
  const loadConsentTerm = (procedureKey: string) => {
    if (!procedureKey) {
      setTemplateNotFound(true);
      setConsentTemplate(null);
      return;
    }

    // Obter termo do registry
    const termo = getTermByProcedureKey(procedureKey);
    
    if (!termo) {
      setTemplateNotFound(true);
      setConsentTemplate(null);
      return;
    }

    setTemplateNotFound(false);
    
    // Renderizar termo com dados disponíveis
    if (patient) {
      const termoContext: TermoContext = {
        patient: {
          name: patient.name,
          cpf: patient.cpf,
          birth_date: patient.birth_date,
        },
        professional: professional ? {
          name: professional.name,
          license: professional.license,
        } : {
          name: '',
          license: '',
        },
        signedAt: new Date(),
        procedureLabel: selectedProcedureLabel || getProcedureDisplayName(procedureKey),
        imageAuthorization: consentFormData.imageAuthorization === true,
      };

      const termoResult = termo.render(termoContext);
      
      // Criar template fake para compatibilidade com código existente
      const fakeTemplate = {
        id: '',
        procedure_key: procedureKey,
        title: termoResult.title, // Usar título renderizado
        content: '', // Não usar mais
        created_at: '',
      };
      
      setConsentTemplate(fakeTemplate);
      
      if (termoResult.missingFields.length > 0) {
        // Faltam dados obrigatórios
        setFillResult({
          ok: false,
          previewContent: termoResult.content,
          missingFields: termoResult.missingFields,
        });
        setShowProfessionalConfig(true);
        setConsentFormData(prev => ({ ...prev, filledContent: termoResult.content }));
      } else {
        // Tudo preenchido
        setConsentFormData(prev => ({ ...prev, filledContent: termoResult.content }));
        setFillResult(null);
        setShowProfessionalConfig(false);
      }
    } else {
      // Criar template fake mesmo sem paciente (para exibir título)
      // Renderizar termo mínimo para obter título
      const termoContext: TermoContext = {
        patient: {
          name: '',
          cpf: '',
          birth_date: '',
        },
        professional: {
          name: '',
          license: '',
        },
        signedAt: new Date(),
        procedureLabel: selectedProcedureLabel || getProcedureDisplayName(procedureKey),
        imageAuthorization: false,
      };
      const termoResult = termo.render(termoContext);
      
      const fakeTemplate = {
        id: '',
        procedure_key: procedureKey,
        title: termoResult.title,
        content: '',
        created_at: '',
      };
      setConsentTemplate(fakeTemplate);
    }
  };

  /**
   * Atualizar preview do termo quando dados mudam
   */
  const updateTermoPreview = (imageAuth: boolean | null): void => {
    if (!patient || !professional || !selectedProcedureForConsent) {
      return;
    }

    const termo = getTermByProcedureKey(selectedProcedureForConsent);
    if (!termo) {
      return;
    }

    const termoContext: TermoContext = {
      patient: {
        name: patient.name,
        cpf: patient.cpf,
        birth_date: patient.birth_date,
      },
      professional: {
        name: professional.name,
        license: professional.license,
      },
      signedAt: new Date(),
      procedureLabel: selectedProcedureLabel || getProcedureDisplayName(selectedProcedureForConsent),
      imageAuthorization: imageAuth === true,
    };
    
    const termoResult = termo.render(termoContext);
    
    if (termoResult.missingFields.length === 0) {
      setConsentFormData(prev => ({ ...prev, filledContent: termoResult.content }));
    } else {
      // Mesmo com campos faltantes, mostrar preview
      setConsentFormData(prev => ({ ...prev, filledContent: termoResult.content }));
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
      
      // Recarregar termo com dados atualizados do profissional
      if (selectedProcedureForConsent) {
        loadConsentTerm(selectedProcedureForConsent);
      }
    } catch (error) {
      logger.error('[MEDICAL_RECORD] Erro ao salvar perfil profissional:', error);
      toast.error('Erro ao salvar perfil profissional');
    }
  };

  /**
   * Criar template no banco (fallback para procedimentos sem termo no registry)
   * Este método só é usado se o procedimento não tiver termo no novo sistema
   */
  const handleCreateTemplate = async () => {
    if (!selectedProcedureForConsent || !selectedProcedureLabel) {
      toast.error('Selecione um procedimento primeiro');
      return;
    }

    // Verificar se já existe termo no novo sistema
    if (hasTermo(selectedProcedureForConsent)) {
      loadConsentTerm(selectedProcedureForConsent);
      return;
    }

    try {
      // Verificar se já existe template no banco
      const existingTemplate = await getConsentTemplateByProcedureKey(selectedProcedureForConsent);
      
      if (existingTemplate) {
        // Template já existe, usar ele
        setConsentTemplate(existingTemplate);
        setTemplateNotFound(false);
        
        // Preencher template inicial usando sistema antigo
        if (patient) {
          const result = fillConsentTemplate(
            existingTemplate,
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
            new Date(),
            consentFormData.imageAuthorization !== null ? consentFormData.imageAuthorization : undefined
          );

          if (result.ok && result.filledContent) {
            setConsentFormData(prev => ({ ...prev, filledContent: result.filledContent! }));
            setFillResult(null);
            setShowProfessionalConfig(false);
          } else {
            setFillResult(result);
            setShowProfessionalConfig(true);
            setConsentFormData(prev => ({ ...prev, filledContent: result.previewContent || existingTemplate.content }));
          }
        }
        
        toast.success('Template carregado com sucesso!');
        return;
      }

      // Gerar conteúdo padrão do termo (limpo e profissional)
      const defaultContent = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de {{procedure_name}}.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:
- O procedimento será realizado conforme protocolo estabelecido
- Podem ocorrer efeitos colaterais que serão explicados durante a consulta
- O resultado pode variar de acordo com cada paciente

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`;

      // Criar template no banco (fallback)
      const newTemplate = await createConsentTemplate({
        procedure_key: selectedProcedureForConsent,
        title: `Termo de Consentimento - ${selectedProcedureLabel}`,
        content: defaultContent,
      });

      toast.success('Template criado com sucesso!');
      
      // Recarregar template
      setConsentTemplate(newTemplate);
      setTemplateNotFound(false);
      
      // Preencher template inicial usando sistema antigo
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
          new Date(),
          consentFormData.imageAuthorization !== null ? consentFormData.imageAuthorization : undefined
        );

        if (result.ok && result.filledContent) {
          setConsentFormData(prev => ({ ...prev, filledContent: result.filledContent! }));
          setFillResult(null);
          setShowProfessionalConfig(false);
        } else {
          setFillResult(result);
          setShowProfessionalConfig(true);
          setConsentFormData(prev => ({ ...prev, filledContent: result.previewContent || newTemplate.content }));
        }
      }
    } catch (error: any) {
      // Se erro for de constraint única, significa que template já existe
      if (error?.message?.includes('duplicate key') || error?.message?.includes('unique constraint')) {
        // Tentar buscar template existente
        try {
          const existingTemplate = await getConsentTemplateByProcedureKey(selectedProcedureForConsent);
          if (existingTemplate) {
            setConsentTemplate(existingTemplate);
            setTemplateNotFound(false);
            toast.success('Template já existe e foi carregado');
            return;
          }
        } catch (fetchError) {
          // Ignorar erro de busca
        }
      }
      
      toast.error(`Erro ao criar template: ${error?.message || 'Erro desconhecido'}`);
    }
  };

  const handleSaveConsentForm = async () => {
    // 1. Validar procedimento selecionado
    if (!selectedProcedureForConsent) {
      toast.error('Selecione um procedimento');
      return;
    }

    // 2. Validar paciente
    if (!patient) {
      toast.error('Dados do paciente não carregados');
      return;
    }

    // 3. Validar profissional
    if (!professional) {
      toast.error('Dados do profissional não carregados. Configure seu perfil profissional.');
      return;
    }

    // 4. Validar usuário autenticado
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    // 5. Validar autorização de imagem (obrigatório)
    if (consentFormData.imageAuthorization === null) {
      toast.error('Selecione uma opção de autorização de imagem (AUTORIZO ou NÃO AUTORIZO)');
      return;
    }

    // 6. Validar assinatura do paciente
    if (!consentFormData.patientSignature) {
      toast.error('Assinatura do paciente é obrigatória. Por favor, assine o termo.');
      return;
    }

    // 7. Validar assinatura do profissional
    if (!consentFormData.professionalSignature) {
      toast.error('Assinatura do profissional é obrigatória. Por favor, assine o termo.');
      return;
    }

    // 8. Obter termo do novo sistema
    const termo = getTermByProcedureKey(selectedProcedureForConsent);
    if (!termo) {
      toast.error(`Termo de consentimento não encontrado para o procedimento: ${selectedProcedureLabel || selectedProcedureForConsent}`);
      return;
    }

    try {
      setSaving(true);

      // Garantir que existe profissional padrão com license preenchido
      let professionalToUse = professional;
      if (!professional || !professional.license || professional.license.trim() === '') {
        try {
          professionalToUse = await ensureDefaultProfessionalProfile({
            id: user.id,
            email: user.email || undefined,
          });
        } catch (error: any) {
          toast.error('Erro ao garantir perfil profissional. Tente novamente.');
          setSaving(false);
          return;
        }
      }

      // Upload das assinaturas
      const visitId = `temp-${Date.now()}`;
      
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

      // Gerar termo final usando novo sistema
      const signedAt = new Date();
      
      const termoContext: TermoContext = {
        patient: {
          name: patient.name,
          cpf: patient.cpf,
          birth_date: patient.birth_date,
        },
        professional: {
          name: professionalToUse.name,
          license: professionalToUse.license,
        },
        signedAt,
        procedureLabel: selectedProcedureLabel || getProcedureDisplayName(selectedProcedureForConsent),
        imageAuthorization: consentFormData.imageAuthorization === true,
      };

      const termoResult = termo.render(termoContext);

      // Validar campos faltantes
      if (termoResult.missingFields.length > 0) {
        const missingFieldsLabels: Record<string, string> = {
          'patient_name': 'Nome do paciente',
          'patient_cpf': 'CPF do paciente',
          'patient_birth_date': 'Data de nascimento do paciente',
          'professional_name': 'Nome do profissional',
          'professional_license': 'Registro do profissional',
          'signed_at': 'Data de assinatura',
          'image_authorization': 'Autorização de imagem',
          'procedure_label': 'Nome do procedimento',
        };

        const missingLabels = termoResult.missingFields.map(field => missingFieldsLabels[field] || field);
        const errorMessage = `Não foi possível salvar o termo. Campos faltando: ${missingLabels.join(', ')}`;
        
        toast.error(errorMessage, { duration: 8000 });
        setSaving(false);
        return;
      }

      if (!termoResult.content || termoResult.content.trim() === '') {
        toast.error('Erro ao gerar conteúdo final do termo');
        setSaving(false);
        return;
      }

      const finalContent = termoResult.content;

      // Criar consent_form com snapshot do termo completo
      const { data: consentData, error: consentError } = await supabase
        .from('consent_forms')
        .insert([
          {
            visit_procedure_id: null,
            procedure_key: selectedProcedureForConsent, // procedure_key (slug) do procedimento
            template_id: null, // Não usar mais template_id do banco
            content_snapshot: finalContent, // Texto completo do termo renderizado
            filled_content: finalContent, // Manter por compatibilidade
            patient_signature_url: patientSignaturePath,
            professional_signature_url: professionalSignaturePath,
            image_authorization: consentFormData.imageAuthorization,
            signed_location: '',
            signed_at: signedAt.toISOString(),
            patient_id: patient.id,
            professional_id: professionalToUse.id,
          },
        ])
        .select()
        .single();

      if (consentError) {
        throw consentError;
      }

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
      const errorMessage = error?.message || 'Erro desconhecido ao salvar termo';
      
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
              { id: 'galeria', label: 'Galeria', icon: GalleryVertical, isAction: true },
            ].map((tab) => {
              const Icon = tab.icon;
              // Se for ação (como Galeria), navegar em vez de mudar aba
              if (tab.isAction) {
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigate(`/gallery?patientId=${id}`)}
                    className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-300 text-gray-300 hover:bg-white/5 hover:text-purple-300"
                  >
                    <Icon size={18} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              }
              
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
                          // keys[0] já é o canonicalKey (normalizado em getProcedures)
                          setSelectedProcedureForConsent(keys[0]);
                          loadConsentTerm(keys[0]);
                        }
                      }}
                      onProcedureSelect={(procedure) => {
                        // procedure.value já é o canonicalKey
                        setSelectedProcedureLabel(procedure.label); // Usar label canônico
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
                                setConsentFormData(prev => ({ ...prev, imageAuthorization: newAuth }));
                                updateTermoPreview(newAuth);
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
                                setConsentFormData(prev => ({ ...prev, imageAuthorization: newAuth }));
                                updateTermoPreview(newAuth);
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
            {/* Nova Consulta / Editar Consulta */}
            <div id="consultation-form" className="glass-card p-6 border border-white/10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold glow-text flex items-center space-x-2">
                  {editingConsultationId ? (
                    <>
                      <Edit size={20} className="text-cyan-400" />
                      <span>Editar Consulta</span>
                    </>
                  ) : (
                    <>
                      <Plus size={20} className="text-cyan-400" />
                      <span>Nova Consulta</span>
                    </>
                  )}
                </h3>
                {editingConsultationId && (
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-gray-200 text-sm"
                  >
                    Cancelar Edição
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Data da Consulta</label>
                  <input
                    type="date"
                    value={newConsultation.date || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Normalizar: string vazia -> null, senão manter valor
                      setNewConsultation(prev => ({ 
                        ...prev, 
                        date: value === '' ? null : value 
                      }));
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-200 mb-1">Procedimento</label>
                  <input
                    type="text"
                    value={newConsultation.reason}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                    placeholder="Ex: Check-up anual"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-1">Descrição do Procedimento</label>
                  <textarea
                    value={newConsultation.symptoms}
                    onChange={(e) => setNewConsultation(prev => ({ ...prev, symptoms: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all h-20 resize-none"
                    placeholder="Descreva os sintomas..."
                  />
                </div>
                
                {/* Seção de Fotos do Procedimento */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-2 flex items-center gap-2">
                    <ImageIcon size={18} className="text-cyan-400" />
                    <span>Fotos do Procedimento / Registro de Produtos Utilizados</span>
                  </label>
                  <p className="text-xs text-gray-400 mb-3">
                    Adicione fotos das etiquetas/lotes dos produtos utilizados (toxina botulínica, ácido hialurônico, bioestimuladores, etc.)
                  </p>
                  
                  {/* Botão de Upload */}
                  <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-400/30 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <ImageIcon size={18} className="text-cyan-400" />
                    <span className="text-sm text-gray-200">Adicionar Fotos</span>
                  </label>
                  
                  {/* Preview das Fotos */}
                  {consultationPhotos.length > 0 && (
                    <div className="mt-4">
                      <div className="grid grid-cols-3 gap-3">
                        {consultationPhotos.map((photo) => (
                          <div key={photo.id} className="relative group">
                            <img
                              src={photo.preview}
                              alt="Preview"
                              className="w-full h-32 object-cover rounded-lg border border-white/10"
                            />
                            <button
                              onClick={() => removePhoto(photo.id)}
                              className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remover foto"
                            >
                              <X size={14} className="text-white" />
                            </button>
                            <p className="text-xs text-gray-400 mt-1 truncate" title={photo.file.name}>
                              {photo.file.name}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {consultationPhotos.length} foto{consultationPhotos.length !== 1 ? 's' : ''} selecionada{consultationPhotos.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-200 mb-1">Acompanhamento</label>
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
                  <span>{editingConsultationId ? 'Salvar Alterações' : 'Registrar Consulta'}</span>
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
                          <button 
                            onClick={() => handleEditConsultation(consultation)}
                            className="p-1 text-cyan-400 hover:text-cyan-300 transition-colors"
                            title="Editar consulta"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteConsultation(consultation.id)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Excluir consulta"
                          >
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
                      
                      {/* Fotos do Procedimento */}
                      {consultationAttachments[consultation.id] && consultationAttachments[consultation.id].length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                          <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <ImageIcon size={16} className="text-cyan-400" />
                            Fotos do Procedimento ({consultationAttachments[consultation.id].length})
                          </h5>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {consultationAttachments[consultation.id].map((attachment, index) => {
                              const imageUrl = imageUrls[attachment.id] || attachment.file_url || '';
                              const hasError = imageErrors[attachment.id] || false;
                              
                              const openLightbox = () => {
                                // Preparar todas as imagens para o lightbox
                                const allImages = consultationAttachments[consultation.id]
                                  .map((att: any) => ({
                                    id: att.id,
                                    url: imageUrls[att.id] || att.file_url || '',
                                    name: att.file_name || 'Foto do produto',
                                  }))
                                  .filter((img: any) => img.url); // Filtrar imagens sem URL
                                
                                if (allImages.length > 0) {
                                  setLightboxState({
                                    isOpen: true,
                                    images: allImages,
                                    currentIndex: Math.min(index, allImages.length - 1),
                                  });
                                }
                              };
                              
                              const handleImageError = () => {
                                // Marcar esta imagem como com erro (sem usar hook)
                                setImageErrors(prev => ({ ...prev, [attachment.id]: true }));
                              };
                              
                              return (
                                <div key={attachment.id} className="relative group">
                                  {!hasError && imageUrl ? (
                                    <img
                                      src={imageUrl}
                                      alt={attachment.file_name || 'Foto do produto'}
                                      className="w-full h-28 object-cover rounded-lg border border-white/10 cursor-pointer hover:border-cyan-400 transition-all hover:scale-105"
                                      onClick={openLightbox}
                                      onError={handleImageError}
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-28 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                                      <div className="text-center">
                                        <ImageIcon size={24} className="text-gray-500 mx-auto mb-1" />
                                        <p className="text-xs text-gray-500">Indisponível</p>
                                      </div>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded-lg transition-colors flex items-center justify-center pointer-events-none">
                                    <Eye size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                  {attachment.file_name && (
                                    <p className="text-xs text-gray-400 mt-1 truncate" title={attachment.file_name}>
                                      {attachment.file_name}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
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

      {/* Lightbox para visualizar imagens */}
      <ImageLightbox
        isOpen={lightboxState.isOpen}
        images={lightboxState.images}
        currentIndex={lightboxState.currentIndex}
        onClose={() => setLightboxState({ isOpen: false, images: [], currentIndex: 0 })}
        onNavigate={(index) => setLightboxState(prev => ({ ...prev, currentIndex: index }))}
      />

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
                content_snapshot: selectedConsentForm.content_snapshot || undefined, // Priorizar content_snapshot
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

      {/* Modal de confirmação para exclusão de consulta */}
      <ConfirmDialog
        isOpen={deleteConsultationModal.isOpen}
        title="Excluir Consulta"
        message="Deseja excluir esta consulta? Todas as fotos anexadas também serão removidas. Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        isLoading={deleteConsultationModal.isLoading}
        onConfirm={confirmDeleteConsultation}
        onCancel={() => {
          setDeleteConsultationModal({
            isOpen: false,
            consultationId: null,
            isLoading: false,
          });
        }}
      />
    </AppLayout>
  );
};

export default MedicalRecordScreen;
