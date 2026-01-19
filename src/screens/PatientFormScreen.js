import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase/client';
import toast from 'react-hot-toast';
import { CheckCircle, Clock, User, ArrowLeft, ChevronRight, ChevronLeft } from 'lucide-react';
// Importações centralizadas
import { questions, categories } from '../data/anamneseQuestions';
const PatientFormScreen = () => {
    const params = useParams();
    const shareToken = params.shareToken;
    const navigate = useNavigate();
    const [formData, setFormData] = useState(null);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeCategory, setActiveCategory] = useState('geral');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    // 🔄 CARREGAR FORMULÁRIO POR SHARE TOKEN (SEM AUTENTICAÇÃO)
    const loadFormByShareToken = async () => {
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
        }
        catch (error) {
            console.error('💥 Erro ao carregar formulário:', error);
            toast.error('Erro ao carregar formulário');
            navigate('/');
        }
        finally {
            setLoading(false);
        }
    };
    // 💾 SALVAR RESPOSTAS DO PACIENTE (SEM AUTENTICAÇÃO)
    const savePatientAnswers = async () => {
        if (!formData || !formData.id)
            return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('patient_forms')
                .update({
                answers: formData.answers,
                updated_at: new Date().toISOString()
            })
                .eq('id', formData.id);
            if (error)
                throw error;
            console.log('✅ Respostas salvas no Supabase');
            setHasUnsavedChanges(false);
        }
        catch (error) {
            console.error('❌ Erro ao salvar respostas:', error);
            toast.error('❌ Erro ao salvar respostas');
        }
        finally {
            setSaving(false);
        }
    };
    // ✅ COMPLETAR FORMULÁRIO (PACIENTE)
    const completeForm = async () => {
        if (!formData || !formData.id)
            return;
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
            if (error)
                throw error;
            setFormData(prev => prev ? { ...prev, status: 'completed' } : null);
            toast.success('🎉 Formulário enviado com sucesso! Obrigado.');
            // Redirecionar após 3 segundos
            setTimeout(() => {
                navigate('/form-success');
            }, 3000);
        }
        catch (error) {
            console.error('❌ Erro ao completar formulário:', error);
            toast.error('❌ Erro ao enviar formulário');
        }
        finally {
            setSaving(false);
        }
    };
    // 🎯 FUNÇÃO PARA MUDAR RESPOSTA (SEM SALVAMENTO AUTOMÁTICO)
    const handleAnswerChange = (field, value) => {
        if (!formData)
            return;
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
    const goToNextCategory = () => {
        const currentIndex = categories.findIndex(cat => cat.id === activeCategory);
        if (currentIndex < categories.length - 1) {
            const nextCategory = categories[currentIndex + 1];
            setActiveCategory(nextCategory.id);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    const goToPrevCategory = () => {
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
            if (!question.showIf)
                return true;
            // Verificar se a pergunta condicional foi respondida como "true"
            const shouldShow = formData?.answers[question.showIf] === true;
            return shouldShow;
        }).filter(q => q.category === activeCategory);
    };
    // 🎯 CALCULAR PROGRESSO REAL (APENAS PERGUNTAS VISÍVEIS)
    const calculateRealProgress = () => {
        if (!formData)
            return 0;
        const allVisibleQuestions = questions.filter(question => {
            if (!question.showIf)
                return true;
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
    const isCurrentCategoryComplete = () => {
        const currentQuestions = getVisibleQuestions();
        const answeredQuestions = currentQuestions.filter(q => formData?.answers[q.field] !== undefined &&
            formData?.answers[q.field] !== '' &&
            formData?.answers[q.field] !== null);
        return answeredQuestions.length === currentQuestions.length;
    };
    // 🎯 VERIFICAR SE FORMULÁRIO ESTÁ COMPLETO
    const isFormComplete = () => {
        const allVisibleQuestions = questions.filter(question => {
            if (!question.showIf)
                return true;
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
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" }), _jsx("p", { className: "mt-4 text-gray-600", children: "Carregando formul\u00E1rio..." })] }) }));
    }
    if (!formData) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-2", children: "Formul\u00E1rio N\u00E3o Encontrado" }), _jsx("p", { className: "text-gray-600 mb-4", children: "O link pode ter expirado ou o formul\u00E1rio n\u00E3o existe mais." }), _jsx("button", { onClick: () => navigate('/'), className: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: "Voltar ao In\u00EDcio" })] }) }));
    }
    if (!canEdit) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "text-center", children: [_jsx(CheckCircle, { className: "mx-auto text-green-500 mb-4", size: 48 }), _jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-2", children: formData.status === 'completed' ? 'Formulário Já Preenchido' : 'Formulário Indisponível' }), _jsx("p", { className: "text-gray-600 mb-4", children: formData.status === 'completed'
                            ? 'Este formulário já foi preenchido e enviado para a clínica.'
                            : 'Este formulário não está mais disponível para preenchimento.' }), _jsx("button", { onClick: () => navigate('/'), className: "px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700", children: "Voltar ao In\u00EDcio" })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsx("div", { className: "bg-white shadow-sm border-b", children: _jsxs("div", { className: "max-w-6xl mx-auto px-4 py-4", children: [_jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("button", { onClick: () => window.history.back(), className: "p-2 hover:bg-gray-100 rounded-lg transition-colors", children: _jsx(ArrowLeft, { size: 20 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h1", { className: "text-lg lg:text-xl font-semibold text-gray-900 truncate", children: "Formul\u00E1rio de Anamnese - Cl\u00EDnica Est\u00E9tica" }), patient && (_jsxs("div", { className: "flex items-center text-sm text-gray-600 mt-1", children: [_jsx(User, { size: 14, className: "mr-1" }), _jsx("span", { className: "truncate", children: patient.name })] }))] })] }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs("div", { className: `inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${formData?.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`, children: [formData?.status === 'sent' && _jsx(Clock, { size: 14, className: "mr-1" }), formData?.status === 'completed' && _jsx(CheckCircle, { size: 14, className: "mr-1" }), formData?.status === 'sent' ? 'Aguardando Preenchimento' : 'Concluído'] }), hasUnsavedChanges && (_jsxs("div", { className: "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800", children: [_jsx(Clock, { size: 12, className: "mr-1" }), "Altera\u00E7\u00F5es n\u00E3o salvas"] })), _jsxs("button", { onClick: completeForm, disabled: saving || !isFormComplete(), className: "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 text-sm", children: [_jsx(CheckCircle, { size: 16 }), _jsx("span", { children: saving ? 'Enviando...' : 'Finalizar' })] })] })] }), _jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-2", children: [_jsxs("span", { className: "text-sm font-medium text-gray-700", children: [progress, "% completo"] }), _jsxs("span", { className: "text-sm text-gray-500", children: [visibleQuestions.filter(q => formData?.answers[q.field]).length, "/", visibleQuestions.length, " perguntas"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-600 h-2 rounded-full transition-all duration-300", style: { width: `${progress}%` } }) }), !isFormComplete() && (_jsx("p", { className: "text-sm text-orange-600 mt-2", children: "Complete todas as perguntas para enviar o formul\u00E1rio" }))] })] }) }), _jsxs("div", { className: "max-w-6xl mx-auto px-4 py-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm border mb-6", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsxs("button", { onClick: goToPrevCategory, disabled: activeCategory === categories[0].id, className: "flex items-center space-x-2 px-3 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 hover:text-gray-800", children: [_jsx(ChevronLeft, { size: 16 }), _jsx("span", { className: "hidden sm:inline", children: "Anterior" })] }), _jsxs("div", { className: "flex-1 text-center", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-900", children: categories.find(cat => cat.id === activeCategory)?.name }), _jsxs("p", { className: "text-sm text-gray-500 mt-1", children: ["Categoria ", categories.findIndex(cat => cat.id === activeCategory) + 1, " de ", categories.length] })] }), _jsxs("button", { onClick: goToNextCategory, disabled: activeCategory === categories[categories.length - 1].id, className: "flex items-center space-x-2 px-3 py-2 text-sm disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 hover:text-gray-800", children: [_jsx("span", { className: "hidden sm:inline", children: "Pr\u00F3xima" }), _jsx(ChevronRight, { size: 16 })] })] }), _jsx("div", { className: "flex overflow-x-auto p-3 space-x-2", children: categories.map((category, index) => (_jsxs("button", { onClick: () => setActiveCategory(category.id), className: `flex-shrink-0 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors ${activeCategory === category.id
                                        ? "bg-blue-600 text-white shadow-md"
                                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`, children: [_jsx("span", { className: "text-sm", children: category.icon }), _jsx("span", { className: "whitespace-nowrap text-sm hidden sm:block", children: category.name }), _jsxs("span", { className: "text-xs", children: ["(", index + 1, ")"] })] }, category.id))) })] }), _jsx("div", { className: "space-y-4", children: visibleQuestions.map((question) => {
                            const currentValue = formData?.answers[question.field];
                            return (_jsxs("div", { className: "bg-white rounded-lg shadow-sm border p-4 sm:p-6", children: [_jsx("label", { className: "block text-base sm:text-lg font-semibold text-gray-800 mb-4", children: question.question }), question.type === 'boolean' && (_jsxs("div", { className: "flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4", children: [_jsx("button", { type: "button", onClick: () => handleAnswerChange(question.field, true), className: `flex-1 py-3 px-4 rounded-lg border-2 text-base font-medium transition-all ${currentValue === true
                                                    ? "bg-green-500 text-white border-green-500 shadow-md"
                                                    : "bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:bg-green-50"}`, children: "Sim" }), _jsx("button", { type: "button", onClick: () => handleAnswerChange(question.field, false), className: `flex-1 py-3 px-4 rounded-lg border-2 text-base font-medium transition-all ${currentValue === false
                                                    ? "bg-red-500 text-white border-red-500 shadow-md"
                                                    : "bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:bg-red-50"}`, children: "N\u00E3o" })] })), question.type === 'text' && (_jsx("textarea", { value: currentValue || '', onChange: (e) => handleAnswerChange(question.field, e.target.value), className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical min-h-[100px] text-sm sm:text-base", placeholder: "Digite sua resposta aqui..." })), question.type === 'select' && question.options && (_jsxs("select", { value: currentValue || '', onChange: (e) => handleAnswerChange(question.field, e.target.value), className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base", children: [_jsx("option", { value: "", children: "Selecione uma op\u00E7\u00E3o" }), question.options.map((option, index) => (_jsx("option", { value: option, children: option }, index)))] }))] }, question.id));
                        }) }), _jsxs("div", { className: "flex justify-between items-center mt-8 pb-8", children: [_jsxs("button", { onClick: goToPrevCategory, disabled: activeCategory === categories[0].id, className: "flex items-center space-x-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors", children: [_jsx(ChevronLeft, { size: 18 }), _jsx("span", { children: "Voltar" })] }), _jsx("div", { className: "text-center", children: _jsx("p", { className: "text-sm text-gray-600", children: isCurrentCategoryComplete() ? '✅ Categoria completa!' : '⏳ Complete esta categoria' }) }), _jsxs("button", { onClick: goToNextCategory, disabled: activeCategory === categories[categories.length - 1].id, className: "flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors", children: [_jsx("span", { children: "Pr\u00F3xima" }), _jsx(ChevronRight, { size: 18 })] })] }), _jsx("div", { className: "fixed bottom-6 right-6 z-10", children: _jsxs("button", { onClick: completeForm, disabled: saving || !isFormComplete(), className: "px-6 py-4 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-3 text-base font-semibold", children: [_jsx(CheckCircle, { size: 20 }), _jsx("span", { children: saving ? 'Enviando...' : 'Finalizar' })] }) })] })] }));
};
export default PatientFormScreen;
