// src/screens/AnamneseScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
  Database,
  Cloud,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';

// Importações centralizadas
import { questions, categories } from '../data/anamneseQuestions';
import { AnamneseFormData, Patient } from '../types';

import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';

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
  const [usingLocalStorage, setUsingLocalStorage] = useState(true);
  const [tableChecked, setTableChecked] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 🔥 UUID simples
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  // 🛠️ Verificar se tabela existe
  const checkTableExists = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('patient_forms').select('id').limit(1);
      if (error) {
        if ((error as any).code === '42P01') return false;
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erro ao verificar tabela:', error);
      return false;
    }
  };

  // ✅ Define se dá pra usar Supabase
  const ensureSupabaseReady = async (): Promise<boolean> => {
    const exists = await checkTableExists();
    setTableChecked(true);
    setUsingLocalStorage(!exists);
    return exists;
  };

  // 💾 Carregar/criar form no localStorage
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
        _local: true,
      };

      setFormData(newForm);
    } catch (error) {
      console.error('Erro no localStorage:', error);
      throw error;
    }
  };

  // 🔄 Buscar último formulário no Supabase
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

  // 🔄 Carregar dados
  const loadData = async (): Promise<void> => {
    try {
      setLoading(true);

      if (!patientId) {
        toast.error('ID do paciente não encontrado');
        return;
      }

      // 1. Carregar paciente
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

      // 2. Carregar local primeiro (fallback rápido)
      await loadOrCreateFormLocal();

      // 3. Em background: se supabase existe, sincroniza e troca modo
      setTimeout(async () => {
        const ok = await ensureSupabaseReady();
        if (ok) {
          await syncWithSupabase();
        }
      }, 500);
    } catch (error) {
      console.error('Erro ao carregar:', error);
      await loadOrCreateFormLocal();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // 💾 SALVAR (agora: tenta Supabase automaticamente ao clicar em Salvar)
  const saveForm = async (
    newStatus?: 'draft' | 'sent' | 'completed' | 'signed'
  ): Promise<AnamneseFormData | null> => {
    if (!formData || !patientId) return null;

    setSaving(true);
    try {
      const status = newStatus || formData.status;
      const updatedData: AnamneseFormData = {
        ...formData,
        status,
        updated_at: new Date().toISOString(),
      };

      // 1) Se ainda não checou tabela, checa agora (tentativa real de nuvem)
      const supabaseOk = tableChecked ? !usingLocalStorage : await ensureSupabaseReady();

      // 2) Se Supabase ok e form é local -> MIGRA AUTOMATICAMENTE NO SALVAR
      if (supabaseOk && (updatedData._local || usingLocalStorage)) {
        try {
          const migrationData = {
            patient_id: updatedData.patient_id,
            title: updatedData.title,
            status: updatedData.status,
            share_token: (updatedData as any).share_token,
            share_expires_at: (updatedData as any).share_expires_at,
            answers: updatedData.answers,
            created_at: updatedData.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const { data, error } = await supabase
            .from('patient_forms')
            .insert([migrationData])
            .select()
            .single();

          if (error) throw error;

          // Migrou e salvou na nuvem ✅
          localStorage.removeItem(`anamnese_${patientId}`);
          setUsingLocalStorage(false);
          setFormData(data);
          setHasUnsavedChanges(false);
          toast.success('✅ Salvo na nuvem (Supabase)!');
          return data;
        } catch (err) {
          // Falhou => cai pro local
          console.warn('Falha ao salvar no Supabase, usando localStorage.', err);
          setUsingLocalStorage(true);
        }
      }

      // 3) Se está em modo Supabase (form já é do banco), atualiza/insere lá
      if (!usingLocalStorage && supabaseOk) {
        try {
          // Se tem id e não é local => update
          if (updatedData.id && !(updatedData as any)._local) {
            const { data, error } = await supabase
              .from('patient_forms')
              .update({
                ...updatedData,
                _local: undefined, // garante que não manda _local pra tabela se existir no tipo
              })
              .eq('id', updatedData.id)
              .select()
              .single();

            if (error) throw error;

            setFormData(data);
            setHasUnsavedChanges(false);
            toast.success('✅ Atualizado na nuvem!');
            return data;
          }

          // Caso não tenha registro ainda (raro), tenta insert
          const { data, error } = await supabase
            .from('patient_forms')
            .insert([
              {
                patient_id: updatedData.patient_id,
                title: updatedData.title,
                status: updatedData.status,
                share_token: (updatedData as any).share_token,
                share_expires_at: (updatedData as any).share_expires_at,
                answers: updatedData.answers,
                created_at: updatedData.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (error) throw error;

          localStorage.removeItem(`anamnese_${patientId}`);
          setUsingLocalStorage(false);
          setFormData(data);
          setHasUnsavedChanges(false);
          toast.success('✅ Salvo na nuvem (Supabase)!');
          return data;
        } catch (err) {
          console.warn('Erro ao salvar no Supabase, fallback localStorage.', err);
          setUsingLocalStorage(true);
        }
      }

      // 4) Fallback (localStorage)
      const formId = updatedData.id || generateUUID();
      const localForm: AnamneseFormData = {
        ...updatedData,
        id: formId,
        _local: true,
        updated_at: new Date().toISOString(),
      };

      localStorage.setItem(`anamnese_${patientId}`, JSON.stringify(localForm));
      setFormData(localForm);
      setHasUnsavedChanges(false);
      toast.success('✅ Salvo localmente!');
      return localForm;
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('❌ Erro ao salvar formulário');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // 📋 Copiar clipboard
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

  // 🎯 Alterar resposta (sem salvar automaticamente)
  const handleAnswerChange = (field: string, value: any): void => {
    if (!formData) return;

    const updatedFormData: AnamneseFormData = {
      ...formData,
      answers: {
        ...formData.answers,
        [field]: value,
      },
      updated_at: new Date().toISOString(),
    };

    setFormData(updatedFormData);
    setHasUnsavedChanges(true);
  };

  // 📤 Compartilhar (garante que está no Supabase)
  const shareForm = async (): Promise<void> => {
    try {
      let formToShare = formData;

      // se tem alterações, salva antes
      if (hasUnsavedChanges) {
        formToShare = await saveForm();
      } else if (!formToShare?.id) {
        formToShare = await saveForm();
      }

      if (!formToShare) throw new Error('Formulário não disponível');

      // garantir supabase
      const ok = await ensureSupabaseReady();
      if (!ok) {
        toast.error('❌ Supabase indisponível. Salve e tente novamente.');
        return;
      }

      // Se ainda está local, o saveForm acima já migrou. Se não migrou, força salvar.
      if ((formToShare as any)._local || usingLocalStorage) {
        const migrated = await saveForm('draft');
        if (!migrated || (migrated as any)._local) {
          toast.error('❌ Não foi possível salvar na nuvem para compartilhar.');
          return;
        }
        formToShare = migrated;
      }

      const newShareToken = generateUUID();
      const shareExpiresAt = new Date();
      shareExpiresAt.setDate(shareExpiresAt.getDate() + 30);

      const updatedData = {
        share_token: newShareToken,
        share_expires_at: shareExpiresAt.toISOString(),
        status: 'sent' as const,
        updated_at: new Date().toISOString(),
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

  // 🎯 Navegar entre categorias
  const goToNextCategory = (): void => {
    const currentIndex = categories.findIndex((cat) => cat.id === activeCategory);
    if (currentIndex < categories.length - 1) {
      const nextCategory = categories[currentIndex + 1];
      setActiveCategory(nextCategory.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevCategory = (): void => {
    const currentIndex = categories.findIndex((cat) => cat.id === activeCategory);
    if (currentIndex > 0) {
      const prevCategory = categories[currentIndex - 1];
      setActiveCategory(prevCategory.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 🎯 Perguntas visíveis (condicionais)
  const visibleQuestions = useMemo(() => {
    return questions
      .filter((question) => {
        if (!question.showIf) return true;
        return formData?.answers[question.showIf] === true;
      })
      .filter((q) => q.category === activeCategory);
  }, [activeCategory, formData]);

  // 🎯 Progresso real (todas visíveis)
  const progress = useMemo((): number => {
    if (!formData) return 0;

    const allVisibleQuestions = questions.filter((question) => {
      if (!question.showIf) return true;
      return formData.answers[question.showIf] === true;
    });

    const answeredQuestions = allVisibleQuestions.filter((question) => {
      const answer = formData.answers[question.field];
      return answer !== undefined && answer !== '' && answer !== null;
    });

    return allVisibleQuestions.length > 0
      ? Math.round((answeredQuestions.length / allVisibleQuestions.length) * 100)
      : 0;
  }, [formData]);

  const isCurrentCategoryComplete = (): boolean => {
    const currentQuestions = visibleQuestions;
    const answeredQuestions = currentQuestions.filter(
      (q) =>
        formData?.answers[q.field] !== undefined &&
        formData?.answers[q.field] !== '' &&
        formData?.answers[q.field] !== null
    );
    return answeredQuestions.length === currentQuestions.length;
  };

  if (loading) {
    return (
      <AppLayout title="Anamnese">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative">
              <LoadingSpinner size="lg" className="text-blue-500" />
              <Sparkles className="absolute -top-2 -right-2 text-purple-500 animate-pulse" size={20} />
            </div>
            <p className="mt-4 text-gray-300">Carregando formulário...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Anamnese">
      <div className="space-y-6">
        {/* Header futurista */}
        <div className="glass-card p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl backdrop-blur-sm transition-all duration-300 border border-white/10"
                >
                  <ArrowLeft size={18} className="text-white" />
                </button>

                <div className="min-w-0">
                  <h1 className="text-xl lg:text-2xl font-bold glow-text truncate">
                    {formData?.title || 'Formulário de Anamnese'}
                  </h1>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {/* Status */}
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        formData?.status === 'draft'
                          ? 'bg-yellow-500/10 text-yellow-200 border-yellow-400/30'
                          : formData?.status === 'sent'
                          ? 'bg-blue-500/10 text-blue-200 border-blue-400/30'
                          : formData?.status === 'completed'
                          ? 'bg-green-500/10 text-green-200 border-green-400/30'
                          : 'bg-purple-500/10 text-purple-200 border-purple-400/30'
                      }`}
                    >
                      {formData?.status === 'draft' && <Clock size={12} className="mr-1" />}
                      {formData?.status === 'sent' && <Send size={12} className="mr-1" />}
                      {formData?.status === 'completed' && <CheckCircle size={12} className="mr-1" />}
                      {formData?.status === 'signed' && <FileText size={12} className="mr-1" />}
                      {formData?.status === 'draft'
                        ? 'Rascunho'
                        : formData?.status === 'sent'
                        ? 'Enviado'
                        : formData?.status === 'completed'
                        ? 'Concluído'
                        : 'Assinado'}
                    </div>

                    {/* Paciente */}
                    {patient && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-200 border border-white/10">
                        <User size={12} className="mr-1" />
                        <span className="truncate max-w-[220px]">{patient.name}</span>
                      </div>
                    )}

                    {/* Storage mode */}
                    <div
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        usingLocalStorage
                          ? 'bg-orange-500/10 text-orange-200 border-orange-400/30'
                          : 'bg-green-500/10 text-green-200 border-green-400/30'
                      }`}
                    >
                      <Database size={12} className="mr-1" />
                      {usingLocalStorage ? 'Local (fallback)' : 'Supabase (nuvem)'}
                    </div>

                    {/* Unsaved */}
                    {hasUnsavedChanges && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-200 border border-yellow-400/30">
                        <Edit3 size={12} className="mr-1" />
                        Alterações não salvas
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => saveForm()}
                  disabled={saving}
                  className="neon-button"
                >
                  <Edit3 size={20} className="mr-3" />
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>

                <button
                  onClick={shareForm}
                  disabled={saving || hasUnsavedChanges}
                  className="neon-button"
                >
                  <Share2 size={20} className="mr-3" />
                  Enviar
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-200">{progress}% completo</span>
                <span className="text-sm text-gray-400">
                  {visibleQuestions.filter((q) => formData?.answers[q.field]).length}/{visibleQuestions.length} perguntas
                </span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Avisos (agora em glass) */}
        {usingLocalStorage && (
          <div className="glass-card p-4 border border-orange-400/30 bg-orange-500/10">
            <div className="flex items-start">
              <Database className="text-orange-300 mr-2 mt-0.5 flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-orange-100 font-semibold text-sm">Modo Local (fallback) ativo</p>
                <p className="text-orange-200/80 text-xs mt-1">
                  Ao clicar em <strong>Salvar</strong>, o sistema tenta salvar no Supabase automaticamente.
                  Se falhar, salva localmente.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasUnsavedChanges && (
          <div className="glass-card p-4 border border-yellow-400/30 bg-yellow-500/10">
            <div className="flex items-start">
              <Edit3 className="text-yellow-300 mr-2 mt-0.5 flex-shrink-0" size={18} />
              <div className="min-w-0">
                <p className="text-yellow-100 font-semibold text-sm">Alterações não salvas</p>
                <p className="text-yellow-200/80 text-xs mt-1">Clique em “Salvar” para guardar suas alterações.</p>
              </div>
            </div>
          </div>
        )}

        {/* Navegação categorias */}
        <div className="glass-card border border-white/10">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <button
              onClick={goToPrevCategory}
              disabled={activeCategory === categories[0].id}
              className="flex items-center space-x-2 px-3 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <div className="flex-1 text-center">
              <h2 className="text-lg font-semibold text-white">
                {categories.find((cat) => cat.id === activeCategory)?.name}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Categoria {categories.findIndex((cat) => cat.id === activeCategory) + 1} de {categories.length}
              </p>
            </div>

            <button
              onClick={goToNextCategory}
              disabled={activeCategory === categories[categories.length - 1].id}
              className="flex items-center space-x-2 px-3 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex overflow-x-auto p-3 space-x-2">
            {categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl flex items-center space-x-2 transition-all border ${
                  activeCategory === category.id
                    ? 'bg-blue-500/20 text-white border-blue-400/30'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border-white/10'
                }`}
              >
                <span className="text-sm">{category.icon}</span>
                <span className="whitespace-nowrap text-sm hidden sm:block">{category.name}</span>
                <span className="text-xs opacity-80">({index + 1})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Perguntas */}
        <div className="space-y-4">
          {visibleQuestions.map((question) => {
            const currentValue = formData?.answers[question.field];

            return (
              <div key={question.id} className="glass-card p-6 hover-lift border border-white/10">
                <label className="block text-base sm:text-lg font-semibold text-white mb-4">
                  {question.question}
                </label>

                {question.type === 'boolean' && (
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.field, true)}
                      className={`flex-1 py-3 px-4 rounded-xl border text-base font-medium transition-all ${
                        currentValue === true
                          ? 'bg-green-500/20 text-green-100 border-green-400/40 shadow-md'
                          : 'bg-white/5 text-gray-200 border-white/10 hover:border-green-400/40 hover:bg-green-500/10'
                      }`}
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAnswerChange(question.field, false)}
                      className={`flex-1 py-3 px-4 rounded-xl border text-base font-medium transition-all ${
                        currentValue === false
                          ? 'bg-red-500/20 text-red-100 border-red-400/40 shadow-md'
                          : 'bg-white/5 text-gray-200 border-white/10 hover:border-red-400/40 hover:bg-red-500/10'
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
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-vertical min-h-[110px] text-sm sm:text-base outline-none"
                    placeholder="Digite sua resposta aqui..."
                  />
                )}

                {question.type === 'select' && question.options && (
                  <select
                    value={currentValue || ''}
                    onChange={(e) => handleAnswerChange(question.field, e.target.value)}
                    className="w-full px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm sm:text-base outline-none"
                  >
                    <option value="" className="text-black">
                      Selecione uma opção
                    </option>
                    {question.options.map((option, index) => (
                      <option key={index} value={option} className="text-black">
                        {option}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>

        {/* Navegação inferior */}
        <div className="flex justify-between items-center mt-8 pb-8">
          <button
            onClick={goToPrevCategory}
            disabled={activeCategory === categories[0].id}
            className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
          >
            <ChevronLeft size={18} />
            <span>Voltar</span>
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-300">
              {isCurrentCategoryComplete() ? '✅ Categoria completa!' : '⏳ Complete esta categoria'}
            </p>
          </div>

          <button
            onClick={goToNextCategory}
            disabled={activeCategory === categories[categories.length - 1].id}
            className="neon-button"
          >
            <span className="mr-3">Próxima</span>
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Modal Compartilhamento */}
        {showShareModal && (formData as any)?.share_token && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="glass-card p-6 max-w-md w-full mx-auto border border-white/10">
              <h3 className="text-lg font-semibold mb-4 text-white">📤 Enviar para Paciente</h3>

              <div className="space-y-4">
                <p className="text-gray-300 text-sm">Copie o link abaixo e envie para o paciente:</p>

                <div className="bg-white/10 p-3 rounded-lg break-all text-xs font-mono text-gray-100 border border-white/10">
                  {`${window.location.origin}/patient-form/${(formData as any).share_token}`}
                </div>

                <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3">
                  <p className="text-yellow-100 text-xs">
                    <strong>💡 Dica:</strong> Envie por WhatsApp com uma mensagem amigável!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="flex-1 px-4 py-2 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-white"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() =>
                      copyToClipboard(`${window.location.origin}/patient-form/${(formData as any).share_token}`)
                    }
                    className="flex-1 neon-button"
                  >
                    Copiar Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AnamneseScreen;
