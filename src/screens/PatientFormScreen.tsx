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
  ChevronLeft
} from 'lucide-react';

// Importações centralizadas
import { questions, categories, calculateProgress } from '../data/anamneseQuestions';
import { AnamneseFormData, Patient } from '../types';

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
      toast.success('🎉 Formulário enviado com sucesso! Obrigado.');

      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/form-success');
      }, 3000);

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

  const canEdit = formData?.status === 'sent';

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

  if (!formData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Formulário Não Encontrado
          </h1>
          <p className="text-gray-600 mb-4">
            O link pode ter expirado ou o formulário não existe mais.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {formData.status === 'completed' ? 'Formulário Já Preenchido' : 'Formulário Indisponível'}
          </h1>
          <p className="text-gray-600 mb-4">
            {formData.status === 'completed' 
              ? 'Este formulário já foi preenchido e enviado para a clínica.'
              : 'Este formulário não está mais disponível para preenchimento.'
            }
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simplificado para Paciente */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => window.history.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="flex-1 min-w-0">
                <h1 className="text-lg lg:text-xl font-semibold text-gray-900 truncate">
                  Formulário de Anamnese - Clínica Estética
                </h1>
                {patient && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <User size={14} className="mr-1" />
                    <span className="truncate">{patient.name}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                formData?.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
              }`}>
                {formData?.status === 'sent' && <Clock size={14} className="mr-1" />}
                {formData?.status === 'completed' && <CheckCircle size={14} className="mr-1" />}
                {formData?.status === 'sent' ? 'Aguardando Preenchimento' : 'Concluído'}
              </div>

              {hasUnsavedChanges && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Clock size={12} className="mr-1" />
                  Alterações não salvas
                </div>
              )}

              <button
                onClick={completeForm}
                disabled={saving || !isFormComplete()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 text-sm"
              >
                <CheckCircle size={16} />
                <span>{saving ? 'Enviando...' : 'Finalizar'}</span>
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
            {!isFormComplete() && (
              <p className="text-sm text-orange-600 mt-2">
                Complete todas as perguntas para enviar o formulário
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo do Formulário */}
      <div className="max-w-6xl mx-auto px-4 py-6">
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

        {/* Botão Finalizar Fixo para Mobile */}
        <div className="fixed bottom-6 right-6 z-10">
          <button
            onClick={completeForm}
            disabled={saving || !isFormComplete()}
            className="px-6 py-4 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-3 text-base font-semibold"
          >
            <CheckCircle size={20} />
            <span>{saving ? 'Enviando...' : 'Finalizar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientFormScreen;