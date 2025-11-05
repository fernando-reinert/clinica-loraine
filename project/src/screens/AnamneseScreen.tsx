import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  Share2, 
  CheckCircle, 
  Clock, 
  Edit3, 
  FileText,
  User,
  ArrowLeft,
  Send,
  RefreshCw,
  Database,
  Cloud,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

// Importações centralizadas
import { questions, categories, calculateProgress } from '../data/anamneseQuestions';
import { AnamneseFormData, Patient } from '../types';

const AnamneseScreen: React.FC = () => {
  const params = useParams();
  const patientId = params.patientId;
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<AnamneseFormData | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState('geral');
  const [syncing, setSyncing] = useState(false);
  const [usingLocalStorage, setUsingLocalStorage] = useState(true);
  const [tableChecked, setTableChecked] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 🔥 FUNÇÃO GERAR UUID SIMPLES
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // 🛠️ VERIFICAR SE TABELA EXISTE
  const checkTableExists = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('patient_forms')
        .select('id')
        .limit(1);

      if (error) {
        if (error.code === '42P01') {
          return false;
        }
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao verificar tabela:', error);
      return false;
    }
  };

  // 💾 CARREGAR/CRIAR FORMULÁRIO NO LOCALSTORAGE
  const loadOrCreateFormLocal = async (): Promise<void> => {
    if (!patientId) return;

    try {
      const localData = localStorage.getItem(`anamnese_${patientId}`);
      if (localData) {
        const parsedData = JSON.parse(localData);
        setFormData(parsedData);
        return;
      }

      const newForm: AnamneseFormData = {
        id: generateUUID(),
        patient_id: patientId,
        title: 'Formulário de Anamnese Estética',
        status: 'draft',
        answers: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _local: true
      };

      setFormData(newForm);

    } catch (error) {
      console.error('Erro no localStorage:', error);
      throw error;
    }
  };

  // 🔄 SINCRONIZAR COM SUPABASE
  const syncWithSupabase = async (): Promise<void> => {
    if (!patientId) return;

    try {
      const { data: existingForms, error } = await supabase
        .from('patient_forms')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) return;

      if (existingForms && existingForms.length > 0) {
        setFormData(existingForms[0]);
        setUsingLocalStorage(false);
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
    }
  };

  // 🔄 CARREGAR DADOS
  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);

      if (!patientId) {
        toast.error('ID do paciente não encontrado');
        return;
      }

      // 1. Carregar dados do paciente
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .select('id, name, phone, email')
        .eq('id', patientId)
        .single();

      if (patientError) {
        console.error('Erro ao carregar paciente:', patientError);
        toast.error('Erro ao carregar dados do paciente');
        return;
      }

      if (patientData) setPatient(patientData);

      // 2. Carregar formulário
      await loadOrCreateFormLocal();

      // 3. Verificar se tabela existe em background
      setTimeout(async () => {
        const tableExists = await checkTableExists();
        setUsingLocalStorage(!tableExists);
        setTableChecked(true);
        
        if (tableExists) {
          await syncWithSupabase();
        }
      }, 1000);

    } catch (error) {
      console.error('Erro ao carregar:', error);
      await loadOrCreateFormLocal();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);

  // 💾 SALVAR FORMULÁRIO
  const saveForm = async (newStatus?: 'draft' | 'sent' | 'completed' | 'signed'): Promise<AnamneseFormData | null> => {
    if (!formData || !patientId) return null;

    setSaving(true);
    try {
      const status = newStatus || formData.status;
      const updatedData = {
        ...formData,
        status,
        updated_at: new Date().toISOString()
      };

      let savedForm: AnamneseFormData | null = null;

      if (!usingLocalStorage) {
        try {
          if (formData.id && !formData._local) {
            const { data, error } = await supabase
              .from('patient_forms')
              .update(updatedData)
              .eq('id', formData.id)
              .select()
              .single();

            if (error) throw error;
            savedForm = data;
          } else {
            const { data, error } = await supabase
              .from('patient_forms')
              .insert([updatedData])
              .select()
              .single();

            if (error) throw error;
            savedForm = data;
          }
        } catch (error: any) {
          setUsingLocalStorage(true);
        }
      }

      // Salvar no localStorage (fallback ou primário)
      if (usingLocalStorage || !savedForm) {
        const formId = formData.id || generateUUID();
        const localForm = {
          ...updatedData,
          id: formId,
          _local: true
        };

        localStorage.setItem(`anamnese_${patientId}`, JSON.stringify(localForm));
        savedForm = localForm;
      }

      if (savedForm) {
        setFormData(savedForm);
        setHasUnsavedChanges(false);
        toast.success('✅ Formulário salvo com sucesso!');
        return savedForm;
      }

      throw new Error('Erro ao salvar formulário');

    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('❌ Erro ao salvar formulário');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // 📤 COMPARTILHAR FORMULÁRIO
  const shareForm = async (): Promise<void> => {
    try {
      let formToShare = formData;
      if (!formToShare?.id) {
        formToShare = await saveForm();
      }

      if (!formToShare) throw new Error('Formulário não disponível');

      const newShareToken = generateUUID();
      const shareExpiresAt = new Date();
      shareExpiresAt.setDate(shareExpiresAt.getDate() + 30);

      if (usingLocalStorage) {
        await migrateToSupabase();
      }

      const updatedData = {
        ...formToShare,
        share_token: newShareToken,
        share_expires_at: shareExpiresAt.toISOString(),
        status: 'sent' as const,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('patient_forms')
        .update(updatedData)
        .eq('id', formToShare.id)
        .select()
        .single();

      if (error) throw error;

      setFormData(data);
      setUsingLocalStorage(false);

      const baseUrl = window.location.origin;
      const shareUrl = `${baseUrl}/patient-form/${newShareToken}`;
      
      setShowShareModal(true);
      await copyToClipboard(shareUrl);
      
      toast.success('📋 Link copiado! Envie para o paciente.');

    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast.error('❌ Erro ao compartilhar formulário');
    }
  };

  // 📋 COPIAR PARA CLIPBOARD
  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
      
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
      } catch (err) {
        prompt('Copie o link abaixo:', text);
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      prompt('Copie o link abaixo:', text);
    }
  };

  // 🎯 FUNÇÃO CORRIGIDA PARA MUDAR RESPOSTA (SEM SALVAMENTO AUTOMÁTICO)
  const handleAnswerChange = (field: string, value: any): void => {
    if (!formData) return;

    const updatedFormData = {
      ...formData,
      answers: {
        ...formData.answers,
        [field]: value
      },
      updated_at: new Date().toISOString()
    };

    setFormData(updatedFormData);
    setHasUnsavedChanges(true);
  };

  // 🔄 MIGRAR PARA SUPABASE
  const migrateToSupabase = async (): Promise<void> => {
    if (!formData || !patientId) return;

    try {
      setSaving(true);
      const loadingToast = toast.loading('Migrando para nuvem...');
      
      const tableExists = await checkTableExists();
      if (!tableExists) {
        toast.dismiss(loadingToast);
        toast.error('❌ Tabela não existe no Supabase.');
        return;
      }

      const migrationData = {
        patient_id: formData.patient_id,
        title: formData.title,
        status: formData.status,
        share_token: formData.share_token,
        share_expires_at: formData.share_expires_at,
        answers: formData.answers,
        created_at: formData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('patient_forms')
        .insert([migrationData])
        .select()
        .single();

      if (error) throw error;

      setFormData(data);
      setUsingLocalStorage(false);
      setHasUnsavedChanges(false);
      
      localStorage.removeItem(`anamnese_${patientId}`);
      
      toast.dismiss(loadingToast);
      toast.success('✅ Migrado para Supabase com sucesso!');

    } catch (error) {
      console.error('Erro na migração:', error);
      toast.error('❌ Erro ao migrar para Supabase');
    } finally {
      setSaving(false);
    }
  };

  // 🎯 FUNÇÃO PARA NAVEGAR ENTRE CATEGORIAS
  const goToNextCategory = (): void => {
    const currentIndex = categories.findIndex(cat => cat.id === activeCategory);
    if (currentIndex < categories.length - 1) {
      const nextCategory = categories[currentIndex + 1];
      setActiveCategory(nextCategory.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevCategory = (): void => {
    const currentIndex = categories.findIndex(cat => cat.id === activeCategory);
    if (currentIndex > 0) {
      const prevCategory = categories[currentIndex - 1];
      setActiveCategory(prevCategory.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 🎯 FUNÇÃO PARA FILTRAR PERGUNTAS VISÍVEIS (OCULTAR PERGUNTAS QUANDO RESPOSTA É "NÃO")
  const getVisibleQuestions = () => {
    return questions.filter(question => {
      // Sempre mostrar se não tem condição
      if (!question.showIf) return true;
      
      // Verificar se a pergunta condicional foi respondida como "true"
      const shouldShow = formData?.answers[question.showIf] === true;
      return shouldShow;
    }).filter(q => q.category === activeCategory);
  };

  // 🎯 CALCULAR PROGRESSO REAL (APENAS PERGUNTAS VISÍVEIS)
  const calculateRealProgress = (): number => {
    if (!formData) return 0;

    const allVisibleQuestions = questions.filter(question => {
      if (!question.showIf) return true;
      return formData.answers[question.showIf] === true;
    });

    const answeredQuestions = allVisibleQuestions.filter(question => {
      const answer = formData.answers[question.field];
      return answer !== undefined && answer !== '' && answer !== null;
    });

    return allVisibleQuestions.length > 0 
      ? Math.round((answeredQuestions.length / allVisibleQuestions.length) * 100)
      : 0;
  };

  const visibleQuestions = getVisibleQuestions();
  const progress = calculateRealProgress();

  // 🎯 VERIFICAR SE CATEGORIA ATUAL ESTÁ COMPLETA
  const isCurrentCategoryComplete = (): boolean => {
    const currentQuestions = getVisibleQuestions();
    const answeredQuestions = currentQuestions.filter(q => 
      formData?.answers[q.field] !== undefined && 
      formData?.answers[q.field] !== '' && 
      formData?.answers[q.field] !== null
    );
    return answeredQuestions.length === currentQuestions.length;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-lg lg:text-xl font-semibold text-gray-900 truncate">
                  {formData?.title || 'Formulário de Anamnese'}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    formData?.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    formData?.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                    formData?.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {formData?.status === 'draft' && <Clock size={12} className="mr-1" />}
                    {formData?.status === 'sent' && <Send size={12} className="mr-1" />}
                    {formData?.status === 'completed' && <CheckCircle size={12} className="mr-1" />}
                    {formData?.status === 'signed' && <FileText size={12} className="mr-1" />}
                    {formData?.status === 'draft' ? 'Rascunho' :
                     formData?.status === 'sent' ? 'Enviado' :
                     formData?.status === 'completed' ? 'Concluído' : 'Assinado'}
                  </div>
                  
                  {patient && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User size={14} className="mr-1" />
                      <span className="truncate">{patient.name}</span>
                    </div>
                  )}

                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    usingLocalStorage ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                  }`}>
                    <Database size={12} className="mr-1" />
                    {usingLocalStorage ? 'Local' : 'Supabase'}
                  </div>

                  {hasUnsavedChanges && (
                    <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Edit3 size={12} className="mr-1" />
                      Alterações não salvas
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {usingLocalStorage && (
                <button
                  onClick={migrateToSupabase}
                  disabled={saving}
                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2 text-sm"
                >
                  <Cloud size={14} />
                  <span>{saving ? 'Migrando...' : 'Migrar'}</span>
                </button>
              )}

              <button
                onClick={() => saveForm()}
                disabled={saving}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 text-sm"
              >
                <Edit3 size={14} />
                <span>{saving ? 'Salvando...' : 'Salvar'}</span>
              </button>
              
              <button
                onClick={shareForm}
                disabled={saving || hasUnsavedChanges}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 text-sm"
              >
                <Share2 size={14} />
                <span>Enviar</span>
              </button>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                {progress}% completo
              </span>
              <span className="text-sm text-gray-500">
                {visibleQuestions.filter(q => formData?.answers[q.field]).length}/{visibleQuestions.length} perguntas
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Aviso de LocalStorage */}
        {usingLocalStorage && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Database className="text-orange-500 mr-2 mt-0.5 flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-orange-800 font-medium text-sm">
                  Modo Local Ativo
                </p>
                <p className="text-orange-600 text-xs mt-1">
                  Os dados estão sendo salvos localmente. Clique em "Migrar" para usar o Supabase.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Aviso de Alterações Não Salvas */}
        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Edit3 className="text-yellow-500 mr-2 mt-0.5 flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-yellow-800 font-medium text-sm">
                  Alterações não salvas
                </p>
                <p className="text-yellow-600 text-xs mt-1">
                  Clique em "Salvar" para guardar suas alterações.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navegação por Categorias - Mobile Responsivo */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="flex items-center justify-between p-4 border-b">
            <button
              onClick={goToPrevCategory}
              disabled={activeCategory === categories[0].id}
              className="flex items-center space-x-2 px-3 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <div className="flex-1 text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {categories.find(cat => cat.id === activeCategory)?.name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Categoria {categories.findIndex(cat => cat.id === activeCategory) + 1} de {categories.length}
              </p>
            </div>

            <button
              onClick={goToNextCategory}
              disabled={activeCategory === categories[categories.length - 1].id}
              className="flex items-center space-x-2 px-3 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 hover:text-gray-800"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Indicadores de Categorias */}
          <div className="flex overflow-x-auto p-3 space-x-2">
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                  activeCategory === category.id
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="text-sm">{category.icon}</span>
                <span className="whitespace-nowrap text-sm hidden sm:block">
                  {category.name}
                </span>
                <span className="text-xs">({index + 1})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Formulário de Perguntas */}
        <div className="space-y-4">
          {visibleQuestions.map((question) => {
            const currentValue = formData?.answers[question.field];

            return (
              <div key={question.id} className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                <label className="block text-base sm:text-lg font-semibold text-gray-800 mb-4">
                  {question.question}
                </label>

                {question.type === 'boolean' && (
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.field, true)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 text-base font-medium transition-all ${
                        currentValue === true
                          ? "bg-green-500 text-white border-green-500 shadow-md"
                          : "bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50"
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.field, false)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 text-base font-medium transition-all ${
                        currentValue === false
                          ? "bg-red-500 text-white border-red-500 shadow-md"
                          : "bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:bg-red-50"
                      }`}
                    >
                      Não
                    </button>
                  </div>
                )}

                {question.type === 'text' && (
                  <textarea
                    value={currentValue || ''}
                    onChange={(e) => handleAnswerChange(question.field, e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical min-h-[100px] text-sm sm:text-base"
                    placeholder="Digite sua resposta aqui..."
                  />
                )}

                {question.type === 'select' && question.options && (
                  <select
                    value={currentValue || ''}
                    onChange={(e) => handleAnswerChange(question.field, e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  >
                    <option value="">Selecione uma opção</option>
                    {question.options.map((option, index) => (
                      <option key={index} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {/* Botões de Navegação Inferiores */}
        <div className="flex justify-between items-center mt-8 pb-8">
          <button
            onClick={goToPrevCategory}
            disabled={activeCategory === categories[0].id}
            className="flex items-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={18} />
            <span>Voltar</span>
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              {isCurrentCategoryComplete() ? '✅ Categoria completa!' : '⏳ Complete esta categoria'}
            </p>
          </div>

          <button
            onClick={goToNextCategory}
            disabled={activeCategory === categories[categories.length - 1].id}
            className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <span>Próxima</span>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      {showShareModal && formData?.share_token && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto">
            <h3 className="text-lg font-semibold mb-4">📤 Enviar para Paciente</h3>
            
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Copie o link abaixo e envie para o paciente:
              </p>
              
              <div className="bg-gray-100 p-3 rounded-lg break-all text-xs font-mono">
                {`${window.location.origin}/patient-form/${formData.share_token}`}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-xs">
                  <strong>💡 Dica:</strong> Envie por WhatsApp com uma mensagem amigável!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Fechar
                </button>
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/patient-form/${formData.share_token}`)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Copiar Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnamneseScreen;