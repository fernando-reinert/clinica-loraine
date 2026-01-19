import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/screens/AnamneseScreen.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase/client';
import toast from 'react-hot-toast';
import { Share2, CheckCircle, Clock, Edit3, FileText, User, ArrowLeft, Send, Database, ChevronRight, ChevronLeft, Sparkles, } from 'lucide-react';
// Importações centralizadas
import { questions, categories } from '../data/anamneseQuestions';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
const AnamneseScreen = () => {
    const params = useParams();
    const patientId = params.patientId;
    const navigate = useNavigate();
    const [formData, setFormData] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [activeCategory, setActiveCategory] = useState('geral');
    const [usingLocalStorage, setUsingLocalStorage] = useState(true);
    const [tableChecked, setTableChecked] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // 🔥 UUID simples
    const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    };
    // 🛠️ Verificar se tabela existe
    const checkTableExists = async () => {
        try {
            const { error } = await supabase.from('patient_forms').select('id').limit(1);
            if (error) {
                if (error.code === '42P01')
                    return false;
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Erro ao verificar tabela:', error);
            return false;
        }
    };
    // ✅ Define se dá pra usar Supabase
    const ensureSupabaseReady = async () => {
        const exists = await checkTableExists();
        setTableChecked(true);
        setUsingLocalStorage(!exists);
        return exists;
    };
    // 💾 Carregar/criar form no localStorage
    const loadOrCreateFormLocal = async () => {
        if (!patientId)
            return;
        try {
            const localData = localStorage.getItem(`anamnese_${patientId}`);
            if (localData) {
                const parsedData = JSON.parse(localData);
                setFormData(parsedData);
                return;
            }
            const newForm = {
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
        }
        catch (error) {
            console.error('Erro no localStorage:', error);
            throw error;
        }
    };
    // 🔄 Buscar último formulário no Supabase
    const syncWithSupabase = async () => {
        if (!patientId)
            return;
        try {
            const { data: existingForms, error } = await supabase
                .from('patient_forms')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false })
                .limit(1);
            if (error)
                return;
            if (existingForms && existingForms.length > 0) {
                setFormData(existingForms[0]);
                setUsingLocalStorage(false);
            }
        }
        catch (error) {
            console.error('Erro na sincronização:', error);
        }
    };
    // 🔄 Carregar dados
    const loadData = async () => {
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
            if (patientData)
                setPatient(patientData);
            // 2. Carregar local primeiro (fallback rápido)
            await loadOrCreateFormLocal();
            // 3. Em background: se supabase existe, sincroniza e troca modo
            setTimeout(async () => {
                const ok = await ensureSupabaseReady();
                if (ok) {
                    await syncWithSupabase();
                }
            }, 500);
        }
        catch (error) {
            console.error('Erro ao carregar:', error);
            await loadOrCreateFormLocal();
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId]);
    // 💾 SALVAR (agora: tenta Supabase automaticamente ao clicar em Salvar)
    const saveForm = async (newStatus) => {
        if (!formData || !patientId)
            return null;
        setSaving(true);
        try {
            const status = newStatus || formData.status;
            const updatedData = {
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
                        share_token: updatedData.share_token,
                        share_expires_at: updatedData.share_expires_at,
                        answers: updatedData.answers,
                        created_at: updatedData.created_at || new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                    const { data, error } = await supabase
                        .from('patient_forms')
                        .insert([migrationData])
                        .select()
                        .single();
                    if (error)
                        throw error;
                    // Migrou e salvou na nuvem ✅
                    localStorage.removeItem(`anamnese_${patientId}`);
                    setUsingLocalStorage(false);
                    setFormData(data);
                    setHasUnsavedChanges(false);
                    toast.success('✅ Salvo na nuvem (Supabase)!');
                    return data;
                }
                catch (err) {
                    // Falhou => cai pro local
                    console.warn('Falha ao salvar no Supabase, usando localStorage.', err);
                    setUsingLocalStorage(true);
                }
            }
            // 3) Se está em modo Supabase (form já é do banco), atualiza/insere lá
            if (!usingLocalStorage && supabaseOk) {
                try {
                    // Se tem id e não é local => update
                    if (updatedData.id && !updatedData._local) {
                        const { data, error } = await supabase
                            .from('patient_forms')
                            .update({
                            ...updatedData,
                            _local: undefined, // garante que não manda _local pra tabela se existir no tipo
                        })
                            .eq('id', updatedData.id)
                            .select()
                            .single();
                        if (error)
                            throw error;
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
                            share_token: updatedData.share_token,
                            share_expires_at: updatedData.share_expires_at,
                            answers: updatedData.answers,
                            created_at: updatedData.created_at || new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                    ])
                        .select()
                        .single();
                    if (error)
                        throw error;
                    localStorage.removeItem(`anamnese_${patientId}`);
                    setUsingLocalStorage(false);
                    setFormData(data);
                    setHasUnsavedChanges(false);
                    toast.success('✅ Salvo na nuvem (Supabase)!');
                    return data;
                }
                catch (err) {
                    console.warn('Erro ao salvar no Supabase, fallback localStorage.', err);
                    setUsingLocalStorage(true);
                }
            }
            // 4) Fallback (localStorage)
            const formId = updatedData.id || generateUUID();
            const localForm = {
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
        }
        catch (error) {
            console.error('Erro ao salvar:', error);
            toast.error('❌ Erro ao salvar formulário');
            return null;
        }
        finally {
            setSaving(false);
        }
    };
    // 📋 Copiar clipboard
    const copyToClipboard = async (text) => {
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
            }
            catch (err) {
                prompt('Copie o link abaixo:', text);
            }
            finally {
                document.body.removeChild(textArea);
            }
        }
        catch (error) {
            prompt('Copie o link abaixo:', text);
        }
    };
    // 🎯 Alterar resposta (sem salvar automaticamente)
    const handleAnswerChange = (field, value) => {
        if (!formData)
            return;
        const updatedFormData = {
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
    const shareForm = async () => {
        try {
            let formToShare = formData;
            // se tem alterações, salva antes
            if (hasUnsavedChanges) {
                formToShare = await saveForm();
            }
            else if (!formToShare?.id) {
                formToShare = await saveForm();
            }
            if (!formToShare)
                throw new Error('Formulário não disponível');
            // garantir supabase
            const ok = await ensureSupabaseReady();
            if (!ok) {
                toast.error('❌ Supabase indisponível. Salve e tente novamente.');
                return;
            }
            // Se ainda está local, o saveForm acima já migrou. Se não migrou, força salvar.
            if (formToShare._local || usingLocalStorage) {
                const migrated = await saveForm('draft');
                if (!migrated || migrated._local) {
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
                status: 'sent',
                updated_at: new Date().toISOString(),
            };
            const { data, error } = await supabase
                .from('patient_forms')
                .update(updatedData)
                .eq('id', formToShare.id)
                .select()
                .single();
            if (error)
                throw error;
            setFormData(data);
            setUsingLocalStorage(false);
            const baseUrl = window.location.origin;
            const shareUrl = `${baseUrl}/patient-form/${newShareToken}`;
            setShowShareModal(true);
            await copyToClipboard(shareUrl);
            toast.success('📋 Link copiado! Envie para o paciente.');
        }
        catch (error) {
            console.error('Erro ao compartilhar:', error);
            toast.error('❌ Erro ao compartilhar formulário');
        }
    };
    // 🎯 Navegar entre categorias
    const goToNextCategory = () => {
        const currentIndex = categories.findIndex((cat) => cat.id === activeCategory);
        if (currentIndex < categories.length - 1) {
            const nextCategory = categories[currentIndex + 1];
            setActiveCategory(nextCategory.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    const goToPrevCategory = () => {
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
            if (!question.showIf)
                return true;
            return formData?.answers[question.showIf] === true;
        })
            .filter((q) => q.category === activeCategory);
    }, [activeCategory, formData]);
    // 🎯 Progresso real (todas visíveis)
    const progress = useMemo(() => {
        if (!formData)
            return 0;
        const allVisibleQuestions = questions.filter((question) => {
            if (!question.showIf)
                return true;
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
    const isCurrentCategoryComplete = () => {
        const currentQuestions = visibleQuestions;
        const answeredQuestions = currentQuestions.filter((q) => formData?.answers[q.field] !== undefined &&
            formData?.answers[q.field] !== '' &&
            formData?.answers[q.field] !== null);
        return answeredQuestions.length === currentQuestions.length;
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Anamnese", children: _jsx("div", { className: "flex items-center justify-center h-96", children: _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "relative", children: [_jsx(LoadingSpinner, { size: "lg", className: "text-blue-500" }), _jsx(Sparkles, { className: "absolute -top-2 -right-2 text-purple-500 animate-pulse", size: 20 })] }), _jsx("p", { className: "mt-4 text-gray-300", children: "Carregando formul\u00E1rio..." })] }) }) }));
    }
    return (_jsx(AppLayout, { title: "Anamnese", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "glass-card p-6 relative overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" }), _jsxs("div", { className: "relative z-10", children: [_jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("button", { onClick: () => navigate(-1), className: "p-3 bg-white/5 hover:bg-white/10 rounded-2xl backdrop-blur-sm transition-all duration-300 border border-white/10", children: _jsx(ArrowLeft, { size: 18, className: "text-white" }) }), _jsxs("div", { className: "min-w-0", children: [_jsx("h1", { className: "text-xl lg:text-2xl font-bold glow-text truncate", children: formData?.title || 'Formulário de Anamnese' }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 mt-2", children: [_jsxs("div", { className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${formData?.status === 'draft'
                                                                        ? 'bg-yellow-500/10 text-yellow-200 border-yellow-400/30'
                                                                        : formData?.status === 'sent'
                                                                            ? 'bg-blue-500/10 text-blue-200 border-blue-400/30'
                                                                            : formData?.status === 'completed'
                                                                                ? 'bg-green-500/10 text-green-200 border-green-400/30'
                                                                                : 'bg-purple-500/10 text-purple-200 border-purple-400/30'}`, children: [formData?.status === 'draft' && _jsx(Clock, { size: 12, className: "mr-1" }), formData?.status === 'sent' && _jsx(Send, { size: 12, className: "mr-1" }), formData?.status === 'completed' && _jsx(CheckCircle, { size: 12, className: "mr-1" }), formData?.status === 'signed' && _jsx(FileText, { size: 12, className: "mr-1" }), formData?.status === 'draft'
                                                                            ? 'Rascunho'
                                                                            : formData?.status === 'sent'
                                                                                ? 'Enviado'
                                                                                : formData?.status === 'completed'
                                                                                    ? 'Concluído'
                                                                                    : 'Assinado'] }), patient && (_jsxs("div", { className: "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-gray-200 border border-white/10", children: [_jsx(User, { size: 12, className: "mr-1" }), _jsx("span", { className: "truncate max-w-[220px]", children: patient.name })] })), _jsxs("div", { className: `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${usingLocalStorage
                                                                        ? 'bg-orange-500/10 text-orange-200 border-orange-400/30'
                                                                        : 'bg-green-500/10 text-green-200 border-green-400/30'}`, children: [_jsx(Database, { size: 12, className: "mr-1" }), usingLocalStorage ? 'Local (fallback)' : 'Supabase (nuvem)'] }), hasUnsavedChanges && (_jsxs("div", { className: "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-200 border border-yellow-400/30", children: [_jsx(Edit3, { size: 12, className: "mr-1" }), "Altera\u00E7\u00F5es n\u00E3o salvas"] }))] })] })] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("button", { onClick: () => saveForm(), disabled: saving, className: "neon-button", children: [_jsx(Edit3, { size: 20, className: "mr-3" }), saving ? 'Salvando...' : 'Salvar'] }), _jsxs("button", { onClick: shareForm, disabled: saving || hasUnsavedChanges, className: "neon-button", children: [_jsx(Share2, { size: 20, className: "mr-3" }), "Enviar"] })] })] }), _jsxs("div", { className: "mt-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsxs("span", { className: "text-sm font-medium text-gray-200", children: [progress, "% completo"] }), _jsxs("span", { className: "text-sm text-gray-400", children: [visibleQuestions.filter((q) => formData?.answers[q.field]).length, "/", visibleQuestions.length, " perguntas"] })] }), _jsx("div", { className: "w-full bg-white/10 rounded-full h-2", children: _jsx("div", { className: "bg-gradient-to-r from-purple-500 to-cyan-500 h-2 rounded-full transition-all duration-300", style: { width: `${progress}%` } }) })] })] })] }), usingLocalStorage && (_jsx("div", { className: "glass-card p-4 border border-orange-400/30 bg-orange-500/10", children: _jsxs("div", { className: "flex items-start", children: [_jsx(Database, { className: "text-orange-300 mr-2 mt-0.5 flex-shrink-0", size: 18 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-orange-100 font-semibold text-sm", children: "Modo Local (fallback) ativo" }), _jsxs("p", { className: "text-orange-200/80 text-xs mt-1", children: ["Ao clicar em ", _jsx("strong", { children: "Salvar" }), ", o sistema tenta salvar no Supabase automaticamente. Se falhar, salva localmente."] })] })] }) })), hasUnsavedChanges && (_jsx("div", { className: "glass-card p-4 border border-yellow-400/30 bg-yellow-500/10", children: _jsxs("div", { className: "flex items-start", children: [_jsx(Edit3, { className: "text-yellow-300 mr-2 mt-0.5 flex-shrink-0", size: 18 }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-yellow-100 font-semibold text-sm", children: "Altera\u00E7\u00F5es n\u00E3o salvas" }), _jsx("p", { className: "text-yellow-200/80 text-xs mt-1", children: "Clique em \u201CSalvar\u201D para guardar suas altera\u00E7\u00F5es." })] })] }) })), _jsxs("div", { className: "glass-card border border-white/10", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b border-white/10", children: [_jsxs("button", { onClick: goToPrevCategory, disabled: activeCategory === categories[0].id, className: "flex items-center space-x-2 px-3 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white", children: [_jsx(ChevronLeft, { size: 16 }), _jsx("span", { className: "hidden sm:inline", children: "Anterior" })] }), _jsxs("div", { className: "flex-1 text-center", children: [_jsx("h2", { className: "text-lg font-semibold text-white", children: categories.find((cat) => cat.id === activeCategory)?.name }), _jsxs("p", { className: "text-sm text-gray-400 mt-1", children: ["Categoria ", categories.findIndex((cat) => cat.id === activeCategory) + 1, " de ", categories.length] })] }), _jsxs("button", { onClick: goToNextCategory, disabled: activeCategory === categories[categories.length - 1].id, className: "flex items-center space-x-2 px-3 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white", children: [_jsx("span", { className: "hidden sm:inline", children: "Pr\u00F3xima" }), _jsx(ChevronRight, { size: 16 })] })] }), _jsx("div", { className: "flex overflow-x-auto p-3 space-x-2", children: categories.map((category, index) => (_jsxs("button", { onClick: () => setActiveCategory(category.id), className: `flex-shrink-0 px-3 py-2 rounded-xl flex items-center space-x-2 transition-all border ${activeCategory === category.id
                                    ? 'bg-blue-500/20 text-white border-blue-400/30'
                                    : 'bg-white/5 text-gray-300 hover:bg-white/10 border-white/10'}`, children: [_jsx("span", { className: "text-sm", children: category.icon }), _jsx("span", { className: "whitespace-nowrap text-sm hidden sm:block", children: category.name }), _jsxs("span", { className: "text-xs opacity-80", children: ["(", index + 1, ")"] })] }, category.id))) })] }), _jsx("div", { className: "space-y-4", children: visibleQuestions.map((question) => {
                        const currentValue = formData?.answers[question.field];
                        return (_jsxs("div", { className: "glass-card p-6 hover-lift border border-white/10", children: [_jsx("label", { className: "block text-base sm:text-lg font-semibold text-white mb-4", children: question.question }), question.type === 'boolean' && (_jsxs("div", { className: "flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4", children: [_jsx("button", { type: "button", onClick: () => handleAnswerChange(question.field, true), className: `flex-1 py-3 px-4 rounded-xl border text-base font-medium transition-all ${currentValue === true
                                                ? 'bg-green-500/20 text-green-100 border-green-400/40 shadow-md'
                                                : 'bg-white/5 text-gray-200 border-white/10 hover:border-green-400/40 hover:bg-green-500/10'}`, children: "Sim" }), _jsx("button", { type: "button", onClick: () => handleAnswerChange(question.field, false), className: `flex-1 py-3 px-4 rounded-xl border text-base font-medium transition-all ${currentValue === false
                                                ? 'bg-red-500/20 text-red-100 border-red-400/40 shadow-md'
                                                : 'bg-white/5 text-gray-200 border-white/10 hover:border-red-400/40 hover:bg-red-500/10'}`, children: "N\u00E3o" })] })), question.type === 'text' && (_jsx("textarea", { value: currentValue || '', onChange: (e) => handleAnswerChange(question.field, e.target.value), className: "w-full px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-vertical min-h-[110px] text-sm sm:text-base outline-none", placeholder: "Digite sua resposta aqui..." })), question.type === 'select' && question.options && (_jsxs("select", { value: currentValue || '', onChange: (e) => handleAnswerChange(question.field, e.target.value), className: "w-full px-4 py-3 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm sm:text-base outline-none", children: [_jsx("option", { value: "", className: "text-black", children: "Selecione uma op\u00E7\u00E3o" }), question.options.map((option, index) => (_jsx("option", { value: option, className: "text-black", children: option }, index)))] }))] }, question.id));
                    }) }), _jsxs("div", { className: "flex justify-between items-center mt-8 pb-8", children: [_jsxs("button", { onClick: goToPrevCategory, disabled: activeCategory === categories[0].id, className: "px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center space-x-2", children: [_jsx(ChevronLeft, { size: 18 }), _jsx("span", { children: "Voltar" })] }), _jsx("div", { className: "text-center", children: _jsx("p", { className: "text-sm text-gray-300", children: isCurrentCategoryComplete() ? '✅ Categoria completa!' : '⏳ Complete esta categoria' }) }), _jsxs("button", { onClick: goToNextCategory, disabled: activeCategory === categories[categories.length - 1].id, className: "neon-button", children: [_jsx("span", { className: "mr-3", children: "Pr\u00F3xima" }), _jsx(ChevronRight, { size: 18 })] })] }), showShareModal && formData?.share_token && (_jsx("div", { className: "fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "glass-card p-6 max-w-md w-full mx-auto border border-white/10", children: [_jsx("h3", { className: "text-lg font-semibold mb-4 text-white", children: "\uD83D\uDCE4 Enviar para Paciente" }), _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-gray-300 text-sm", children: "Copie o link abaixo e envie para o paciente:" }), _jsx("div", { className: "bg-white/10 p-3 rounded-lg break-all text-xs font-mono text-gray-100 border border-white/10", children: `${window.location.origin}/patient-form/${formData.share_token}` }), _jsx("div", { className: "bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-3", children: _jsxs("p", { className: "text-yellow-100 text-xs", children: [_jsx("strong", { children: "\uD83D\uDCA1 Dica:" }), " Envie por WhatsApp com uma mensagem amig\u00E1vel!"] }) }), _jsxs("div", { className: "flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3", children: [_jsx("button", { onClick: () => setShowShareModal(false), className: "flex-1 px-4 py-2 border border-white/10 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-white", children: "Fechar" }), _jsx("button", { onClick: () => copyToClipboard(`${window.location.origin}/patient-form/${formData.share_token}`), className: "flex-1 neon-button", children: "Copiar Link" })] })] })] }) }))] }) }));
};
export default AnamneseScreen;
