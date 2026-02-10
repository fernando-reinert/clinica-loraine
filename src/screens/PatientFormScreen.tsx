import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase/client';
import toast from 'react-hot-toast';
import { 
  CheckCircle, 
  Clock,
  User,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  MessageCircle
} from 'lucide-react';

// Importações centralizadas
import { questions, categories, calculateProgress } from '../data/anamneseQuestions';
import { AnamneseFormData, Patient } from '../types';
import '../styles/patient-form.css';

const PatientFormScreen: React.FC = () => {
  const params = useParams();
  const shareToken = params.shareToken;
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<AnamneseFormData | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState('geral');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // 🔄 CARREGAR FORMULÁRIO POR SHARE TOKEN (SEM AUTENTICAÇÃO)
  const loadFormByShareToken = async (): Promise<void> => {
    try {
      setLoading(true);

      if (!shareToken) {
        toast.error('Link inválido');
        navigate('/');
        return;
      }

      console.log('🔍 Buscando formulário com token:', shareToken);

      // Buscar formulário SEM autenticação
      const { data: form, error } = await supabase
        .from('patient_forms')
        .select('*, patients(name, phone, email)')
        .eq('share_token', shareToken)
        .single();

      if (error) {
        console.error('❌ Erro ao carregar formulário:', error);
        toast.error('Formulário não encontrado ou link expirado');
        navigate('/');
        return;
      }

      if (!form) {
        toast.error('Formulário não encontrado');
        navigate('/');
        return;
      }

      console.log('✅ Formulário encontrado:', form);

      // Verificar se o link não expirou
      if (form.share_expires_at && new Date(form.share_expires_at) < new Date()) {
        toast.error('Este link expirou. Solicite um novo link à clínica.');
        navigate('/');
        return;
      }

      setFormData(form);
      
      // Extrair dados do paciente
      if (form.patients) {
        setPatient({
          id: form.patient_id,
          name: form.patients.name,
          phone: form.patients.phone,
          email: form.patients.email
        });
      }

      if (form.status === 'completed') {
        setShowThankYou(true);
        toast.success('✅ Este formulário já foi preenchido!');
      }

    } catch (error) {
      console.error('💥 Erro ao carregar formulário:', error);
      toast.error('Erro ao carregar formulário');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // 💾 SALVAR RESPOSTAS DO PACIENTE (SEM AUTENTICAÇÃO)
  const savePatientAnswers = async (): Promise<void> => {
    if (!formData || !formData.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('patient_forms')
        .update({
          answers: formData.answers,
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) throw error;

      console.log('✅ Respostas salvas no Supabase');
      setHasUnsavedChanges(false);

    } catch (error) {
      console.error('❌ Erro ao salvar respostas:', error);
      toast.error('❌ Erro ao salvar respostas');
    } finally {
      setSaving(false);
    }
  };

  // ✅ COMPLETAR FORMULÁRIO (PACIENTE)
  const completeForm = async (): Promise<void> => {
    if (!formData || !formData.id) return;

    const { isValid, errors } = validateAllSteps();
    if (!isValid) {
      setStepErrors(errors);
      toast.error('Preencha todos os campos obrigatórios antes de finalizar.');
      scrollToFirstError(errors);
      const firstField = Object.keys(errors)[0];
      if (firstField) {
        const cat = questions.find(q => q.field === firstField)?.category;
        if (cat && cat !== activeCategory) setActiveCategory(cat);
        setTimeout(() => scrollToFirstError(errors), 100);
      }
      return;
    }
    setStepErrors({});

    setSaving(true);
    try {
      // Primeiro salvar as respostas
      await savePatientAnswers();

      // Depois marcar como completo
      const { error } = await supabase
        .from('patient_forms')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', formData.id);

      if (error) throw error;

      setFormData(prev => prev ? { ...prev, status: 'completed' } : null);
      setShowThankYou(true);
      toast.success('🎉 Formulário enviado com sucesso! Obrigado.');

    } catch (error) {
      console.error('❌ Erro ao completar formulário:', error);
      toast.error('❌ Erro ao enviar formulário');
    } finally {
      setSaving(false);
    }
  };

  // 🎯 FUNÇÃO PARA MUDAR RESPOSTA (SEM SALVAMENTO AUTOMÁTICO)
  const handleAnswerChange = (field: string, value: any): void => {
    if (!formData) return;
    setStepErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
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

  // 🎯 VALIDAÇÃO DO STEP ATUAL (campos obrigatórios + condicionais)
  const validateCurrentStep = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const currentQuestions = questions.filter(q => {
      if (q.category !== activeCategory) return false;
      if (!q.showIf) return true;
      return formData?.answers[q.showIf] === true;
    });
    for (const q of currentQuestions) {
      const value = formData?.answers[q.field];
      const isEmpty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
      if (isEmpty) {
        errors[q.field] = 'Campo obrigatório';
      }
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  // 🎯 VALIDAÇÃO COMPLETA (todos os steps) para Finalizar
  const validateAllSteps = (): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};
    const allVisible = questions.filter(q => {
      if (!q.showIf) return true;
      return formData?.answers[q.showIf] === true;
    });
    for (const q of allVisible) {
      const value = formData?.answers[q.field];
      const isEmpty = value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
      if (isEmpty) errors[q.field] = 'Campo obrigatório';
    }
    return { isValid: Object.keys(errors).length === 0, errors };
  };

  const scrollToFirstError = (errors: Record<string, string>): void => {
    const firstField = Object.keys(errors)[0];
    if (firstField) {
      const el = document.getElementById(`question-${firstField}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // 🎯 FUNÇÃO PARA NAVEGAR ENTRE CATEGORIAS (bloqueia se step inválido)
  const goToNextCategory = (): void => {
    const { isValid, errors } = validateCurrentStep();
    if (!isValid) {
      setStepErrors(errors);
      toast.error('Preencha os campos obrigatórios antes de continuar.');
      scrollToFirstError(errors);
      return;
    }
    setStepErrors({});
    const currentIndex = categories.findIndex(cat => cat.id === activeCategory);
    if (currentIndex < categories.length - 1) {
      const nextCategory = categories[currentIndex + 1];
      setActiveCategory(nextCategory.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevCategory = (): void => {
    setStepErrors({});
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

  // 🎯 VERIFICAR SE FORMULÁRIO ESTÁ COMPLETO
  const isFormComplete = (): boolean => {
    const allVisibleQuestions = questions.filter(question => {
      if (!question.showIf) return true;
      return formData?.answers[question.showIf] === true;
    });

    const answeredQuestions = allVisibleQuestions.filter(question => {
      const answer = formData?.answers[question.field];
      return answer !== undefined && answer !== '' && answer !== null;
    });

    return answeredQuestions.length === allVisibleQuestions.length;
  };

  useEffect(() => {
    loadFormByShareToken();
  }, [shareToken]);

  const canEdit = formData?.status === 'sent' && !showThankYou;
  const currentStepIndex = categories.findIndex(cat => cat.id === activeCategory);
  const isLastStep = currentStepIndex === categories.length - 1;

  // ESTADOS DE CARREGAMENTO / ERRO NO TEMA FUTURISTA
  if (loading) {
    return (
      <div className="pf-root overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card w-full max-w-md mx-auto px-6 py-8 sm:px-8 sm:py-10 text-center rounded-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400 mx-auto"></div>
          <p className="mt-4 text-sm text-slate-200">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="pf-root overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card max-w-md w-full mx-auto p-6 sm:p-8 md:p-10 text-center border border-white/10 rounded-2xl">
          <h1 className="text-2xl font-bold text-slate-50 mb-3">
            Formulário não encontrado
          </h1>
          <p className="text-sm text-slate-300 mb-6">
            O link pode ter expirado ou o formulário não existe mais.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full min-h-[44px] sm:w-auto sm:min-w-[140px] inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium text-slate-50 bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  // Tela de agradecimento fixo (não redireciona)
  if (showThankYou || formData?.status === 'completed') {
    return (
      <div className="pf-root overflow-x-hidden flex items-center justify-center min-h-dvh p-4 sm:p-6">
        <div className="glass-card max-w-md w-full mx-auto p-6 sm:p-8 md:p-10 text-center border border-white/10 rounded-2xl">
          <CheckCircle className="mx-auto text-emerald-400 mb-4" size={64} />
          <h1 className="text-3xl font-bold text-slate-50 mb-4 glow-text">
            Obrigado!
          </h1>
          <p className="text-lg text-slate-200 mb-2">
            Formulário enviado com sucesso
          </p>
          <p className="text-sm text-slate-300 mb-6">
            Suas respostas foram recebidas pela clínica. Entraremos em contato em breve.
          </p>
          <div className="mt-8 p-4 bg-emerald-500/10 border border-emerald-400/30 rounded-xl">
            <p className="text-sm text-emerald-200">
              ✅ Seus dados foram salvos com segurança
            </p>
          </div>

          {/* CTA: Agendar pelo WhatsApp */}
          <div className="mt-8 pt-6 border-t border-white/10 w-full max-w-full min-w-0">
            <p className="text-slate-200 mb-4 text-base sm:text-lg">
              Gostaria de agendar sua avaliação ou próxima consulta agora?
            </p>
            <a
              href="https://wa.me/1535997454406"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-base font-semibold text-white bg-[#25D366] hover:bg-[#20BD5A] transition-colors shadow-lg hover:shadow-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              <MessageCircle size={22} className="shrink-0" aria-hidden />
              <span>Agendar pelo WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="pf-root overflow-x-hidden flex items-center justify-center p-4 sm:p-6">
        <div className="glass-card max-w-md w-full mx-auto p-6 sm:p-8 md:p-10 text-center border border-white/10 rounded-2xl">
          <CheckCircle className="mx-auto text-emerald-400 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-slate-50 mb-3">
            Formulário indisponível
          </h1>
          <p className="text-sm text-slate-300 mb-6">
            Este formulário não está mais disponível para preenchimento.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full min-h-[44px] sm:w-auto sm:min-w-[140px] inline-flex items-center justify-center px-6 py-3 rounded-xl text-sm font-medium text-slate-50 bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  // LAYOUT PRINCIPAL NO TEMA FUTURISTA
  return (
    <div className="pf-root w-full max-w-full overflow-x-hidden">
      {/* Header Simplificado para Paciente */}
      <div className="pf-header">
        <div className="pf-header-inner">
          <div className="pf-header-card">
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center justify-center p-2 rounded-full border border-slate-600/60 bg-slate-900/60 hover:bg-slate-800/80 transition-colors"
              >
                <ArrowLeft size={18} className="text-slate-200" />
              </button>
              
              <div className="flex-1 min-w-0">
                <h1 className="pf-title-main whitespace-normal break-words">
                  Formulário de Anamnese
                </h1>
                {patient && (
                  <div className="pf-title-sub">
                    <User size={14} className="text-slate-300 shrink-0" />
                    <span className="whitespace-normal break-words min-w-0">{patient.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-start lg:justify-end">
              <div
                className={[
                  'pf-status-pill',
                  formData?.status === 'completed' ? 'pf-status-pill--completed' : ''
                ].join(' ')}
              >
                {formData?.status === 'sent' && <Clock size={14} className="mr-1" />}
                {formData?.status === 'completed' && <CheckCircle size={14} className="mr-1" />}
                {formData?.status === 'sent' ? 'Aguardando preenchimento' : 'Concluído'}
              </div>

              {hasUnsavedChanges && (
                <div className="pf-chip-warning">
                  <Clock size={12} className="mr-1" />
                  Alterações não salvas
                </div>
              )}
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="pf-progress-wrapper">
            <div className="pf-progress-header">
              <span className="font-medium">
                {progress}% completo
              </span>
              <span className="text-xs sm:text-sm">
                {visibleQuestions.filter(q => formData?.answers[q.field]).length}/{visibleQuestions.length} perguntas
              </span>
            </div>
            <div className="pf-progress-bar">
              <div
                className="pf-progress-fill"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo do Formulário */}
      <div className="pf-body w-full max-w-full min-w-0">
        {/* Navegação por Categorias - Mobile Responsivo */}
        <div className="pf-card-glass pf-card-glass--nav">
          <div className="flex items-center justify-between p-4 border-b border-slate-700/60">
            <button
              onClick={goToPrevCategory}
              disabled={activeCategory === categories[0].id}
              className="pf-nav-button"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Voltar</span>
            </button>

            <div className="flex-1 min-w-0 text-center">
              <h2 className="pf-category-title whitespace-normal break-words">
                {categories.find(cat => cat.id === activeCategory)?.name}
              </h2>
              <p className="pf-category-subtitle mt-1 whitespace-normal break-words">
                Categoria {currentStepIndex + 1} de {categories.length}
              </p>
            </div>

            {isLastStep ? (
              <button
                onClick={completeForm}
                disabled={saving}
                title={!isFormComplete() ? 'Preencha os campos obrigatórios.' : undefined}
                className="pf-nav-button"
              >
                <CheckCircle size={16} />
                <span className="hidden sm:inline">{saving ? 'Enviando...' : 'Finalizar'}</span>
              </button>
            ) : (
              <button
                onClick={goToNextCategory}
                className="pf-nav-button"
              >
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight size={16} className="shrink-0" />
                </span>
              </button>
            )}
          </div>

          {/* Indicadores de Categorias */}
          <div className="flex overflow-x-auto overflow-y-hidden min-w-0 p-3 space-x-2">
            {categories.map((category, index) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => { setStepErrors({}); setActiveCategory(category.id); }}
                  className={[
                    'pf-category-chip',
                    isActive ? 'pf-category-chip--active' : ''
                  ].join(' ')}
                >
                  <span className="text-sm">{category.icon}</span>
                  <span className="whitespace-nowrap text-sm hidden sm:block">
                    {category.name}
                  </span>
                  <span className="pf-category-chip-index">({index + 1})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Alerta de campos obrigatórios */}
        {Object.keys(stepErrors).length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-400/30 text-red-200 text-sm">
            Preencha os campos obrigatórios antes de continuar.
          </div>
        )}

        {/* Formulário de Perguntas */}
        <div className="space-y-4 w-full max-w-full min-w-0">
          {visibleQuestions.map((question) => {
            const currentValue = formData?.answers[question.field];
            const hasError = !!stepErrors[question.field];

            return (
              <div
                key={question.id}
                id={`question-${question.field}`}
                className={['pf-question-card w-full max-w-full min-w-0', hasError ? 'ring-2 ring-red-500/80 border-red-500/50 rounded-xl' : ''].join(' ')}
              >
                <label className="pf-question-label whitespace-normal break-words block min-w-0">
                  {question.question}
                </label>
                {hasError && (
                  <p className="text-red-400 text-xs mt-1 mb-2">Campo obrigatório</p>
                )}

                {question.type === 'boolean' && (
                  <div className="pf-boolean-row w-full max-w-full min-w-0">
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.field, true)}
                      className={[
                        'pf-boolean-button w-full sm:flex-1 min-w-0',
                        'pf-boolean-button--yes',
                        currentValue === true ? 'pf-boolean-button--active' : ''
                      ].join(' ')}
                    >
                      <span className="whitespace-normal break-words">Sim</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.field, false)}
                      className={[
                        'pf-boolean-button w-full sm:flex-1 min-w-0',
                        'pf-boolean-button--no',
                        currentValue === false ? 'pf-boolean-button--active' : ''
                      ].join(' ')}
                    >
                      <span className="whitespace-normal break-words">Não</span>
                    </button>
                  </div>
                )}

                {question.type === 'text' && (
                  <textarea
                    value={currentValue || ''}
                    onChange={(e) => handleAnswerChange(question.field, e.target.value)}
                    className={['pf-textarea', hasError ? 'border-red-500/70' : ''].join(' ')}
                    placeholder="Digite sua resposta aqui..."
                  />
                )}

                {question.type === 'select' && question.options && (
                  <select
                    value={currentValue || ''}
                    onChange={(e) => handleAnswerChange(question.field, e.target.value)}
                    className={['pf-select', hasError ? 'border-red-500/70' : ''].join(' ')}
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

        {/* Botões de Navegação Inferiores — um único botão primário: Próxima ou Finalizar */}
        <div className="pf-bottom-nav">
          <button
            onClick={goToPrevCategory}
            disabled={activeCategory === categories[0].id}
            className="pf-bottom-button"
          >
            <ChevronLeft size={18} />
            <span>Voltar</span>
          </button>

          <div className="text-center">
            <p className="pf-bottom-status">
              {isCurrentCategoryComplete() ? '✅ Categoria completa!' : '⏳ Complete esta categoria'}
            </p>
          </div>

          {isLastStep ? (
            <button
              onClick={completeForm}
              disabled={saving}
              title={!isFormComplete() ? 'Preencha os campos obrigatórios.' : undefined}
              className="pf-bottom-button"
            >
              <CheckCircle size={18} />
              <span>{saving ? 'Enviando...' : 'Finalizar'}</span>
            </button>
          ) : (
            <button
              onClick={goToNextCategory}
              className="pf-bottom-button"
            >
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span>Próxima</span>
                <ChevronRight size={18} className="shrink-0" />
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientFormScreen;