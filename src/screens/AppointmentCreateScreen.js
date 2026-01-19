import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// src/screens/AppointmentCreateScreen.tsx - VERSÃO SEM GOOGLE CALENDAR
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase/client';
import { Calendar, Clock, User, Plus, Search } from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
// Função de conversão de data segura
const convertToSupabaseFormat = (dateTimeString) => {
    try {
        if (!dateTimeString)
            return null;
        const date = new Date(dateTimeString);
        return date.toISOString();
    }
    catch (error) {
        console.error('Erro na conversão de data:', error);
        return null;
    }
};
const AppointmentCreateScreen = () => {
    const navigate = useNavigate();
    const { search } = useLocation();
    const urlParams = new URLSearchParams(search);
    const patientId = urlParams.get('patientId');
    const [patient, setPatient] = useState(null);
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showPatientSearch, setShowPatientSearch] = useState(!patientId);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [description, setDescription] = useState('');
    const [title, setTitle] = useState('');
    const [budget, setBudget] = useState('');
    const [location, setLocation] = useState('Clínica Estética');
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (patientId) {
            loadPatient(patientId);
        }
        else {
            loadPatients();
            setLoading(false);
        }
    }, [patientId]);
    const loadPatient = async (id) => {
        try {
            setError('');
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .eq('id', id)
                .single();
            if (error) {
                console.error('Erro ao carregar paciente:', error);
                setError('Paciente não encontrado');
                setShowPatientSearch(true);
                await loadPatients();
                return;
            }
            setPatient(data);
        }
        catch (error) {
            console.error('Erro ao carregar paciente:', error);
            setError('Erro ao carregar paciente');
            setShowPatientSearch(true);
            await loadPatients();
        }
        finally {
            setLoading(false);
        }
    };
    const loadPatients = async () => {
        try {
            const { data, error } = await supabase
                .from('patients')
                .select('*')
                .order('name');
            if (error) {
                console.error('Erro ao carregar pacientes:', error);
                setError('Erro ao carregar lista de pacientes');
                return;
            }
            setPatients(data || []);
        }
        catch (error) {
            console.error('Erro ao carregar pacientes:', error);
            setError('Erro ao carregar lista de pacientes');
        }
    };
    const filteredPatients = patients.filter(patient => patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.phone?.includes(searchTerm));
    const selectPatient = (selectedPatient) => {
        setPatient(selectedPatient);
        setShowPatientSearch(false);
        setError('');
    };
    const createAppointment = async (event) => {
        event.preventDefault();
        setCreating(true);
        setError('');
        try {
            // Validações
            if (!startTime || !title) {
                throw new Error('Por favor, preencha todos os campos obrigatórios.');
            }
            if (!patient && !showPatientSearch) {
                throw new Error('Por favor, selecione um paciente.');
            }
            const isoStartTime = convertToSupabaseFormat(startTime);
            if (!isoStartTime) {
                throw new Error('Data e hora de início inválidos.');
            }
            const isoEndTime = endTime ? convertToSupabaseFormat(endTime) : null;
            const appointmentData = {
                patient_id: patient?.id || null,
                patient_name: patient?.name || '',
                patient_phone: patient?.phone || '',
                start_time: isoStartTime,
                end_time: isoEndTime,
                title,
                description: description || null,
                location: location,
                status: 'scheduled',
            };
            // Adicionar orçamento se preenchido
            if (budget) {
                try {
                    appointmentData.budget = parseFloat(budget);
                }
                catch (error) {
                    console.warn('Erro ao processar orçamento, ignorando...');
                }
            }
            // Criar no Supabase
            const { error: supabaseError } = await supabase
                .from('appointments')
                .insert([appointmentData]);
            if (supabaseError) {
                console.error('❌ Erro Supabase:', supabaseError);
                throw new Error(`Erro ao salvar agendamento: ${supabaseError.message}`);
            }
            // Mensagem de sucesso
            alert('✅ Agendamento criado com sucesso!');
            navigate('/appointments');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro ao criar agendamento';
            setError(errorMessage);
            console.error('💥 ERRO GERAL:', error);
        }
        finally {
            setCreating(false);
        }
    };
    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('pt-BR');
        }
        catch {
            return 'Data inválida';
        }
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Carregando...", showBack: true, children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(LoadingSpinner, { size: "lg" }) }) }));
    }
    return (_jsx(AppLayout, { title: "Novo Agendamento", showBack: true, children: _jsxs("div", { className: "p-6 space-y-6", children: [_jsx("div", { className: "bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl", children: _jsxs("div", { className: "flex items-center space-x-4", children: [_jsx("div", { className: "w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center overflow-hidden", children: patient?.photo_url ? (_jsx("img", { src: patient.photo_url, alt: patient.name, className: "w-full h-full object-cover" })) : (_jsx(User, { className: "text-white", size: 28 })) }), _jsxs("div", { className: "flex-1", children: [_jsx("h1", { className: "text-2xl font-bold mb-1", children: "Novo Agendamento" }), patient ? (_jsxs("p", { className: "text-white/80", children: ["Para ", patient.name, " \u2022 ", patient.phone] })) : (_jsx("p", { className: "text-white/80", children: "Selecione um paciente" })), patient?.birth_date && (_jsxs("p", { className: "text-white/60 text-sm mt-1", children: [formatDate(patient.birth_date), " \u2022 ", new Date().getFullYear() - new Date(patient.birth_date).getFullYear(), " anos"] }))] })] }) }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-2xl p-4", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "text-red-600", children: "\u26A0\uFE0F" }), _jsxs("div", { children: [_jsx("p", { className: "text-red-800 font-medium", children: "Erro" }), _jsx("p", { className: "text-red-700 text-sm", children: error })] })] }) })), showPatientSearch && (_jsxs("div", { className: "bg-white rounded-2xl p-6 shadow-sm border border-gray-100", children: [_jsxs("h2", { className: "text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2", children: [_jsx(User, { className: "text-purple-600", size: 24 }), _jsx("span", { children: "Selecionar Paciente" })] }), _jsxs("div", { className: "relative mb-4", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400", size: 20 }), _jsx("input", { type: "text", placeholder: "Buscar paciente por nome ou telefone...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300" })] }), _jsxs("div", { className: "space-y-2 max-h-60 overflow-y-auto", children: [filteredPatients.map((p) => (_jsx("button", { onClick: () => selectPatient(p), className: "w-full text-left p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-300", children: _jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm", children: p.name?.charAt(0) || 'P' }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "font-semibold text-gray-900", children: p.name }), _jsx("p", { className: "text-sm text-gray-600", children: p.phone })] })] }) }, p.id))), filteredPatients.length === 0 && (_jsxs("div", { className: "text-center py-8 text-gray-500", children: [_jsx(User, { className: "mx-auto mb-2 text-gray-400", size: 32 }), _jsx("p", { children: "Nenhum paciente encontrado" })] }))] }), _jsx("div", { className: "mt-4 pt-4 border-t border-gray-200", children: _jsxs("button", { onClick: () => navigate('/patients/new'), className: "w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2", children: [_jsx(Plus, { size: 20 }), _jsx("span", { children: "Cadastrar Novo Paciente" })] }) })] })), patient && !showPatientSearch && (_jsx("div", { className: "bg-white rounded-2xl p-4 shadow-sm border border-gray-100", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx("div", { className: "w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-semibold", children: patient.name?.charAt(0) || 'P' }), _jsxs("div", { children: [_jsx("p", { className: "font-semibold text-gray-900", children: patient.name }), _jsx("p", { className: "text-sm text-gray-600", children: patient.phone })] })] }), _jsx("button", { onClick: () => setShowPatientSearch(true), className: "text-purple-600 hover:text-purple-800 text-sm font-medium", children: "Trocar Paciente" })] }) })), (patient || !showPatientSearch) && (_jsxs("div", { className: "bg-white rounded-2xl p-6 shadow-sm border border-gray-100", children: [_jsxs("h2", { className: "text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2", children: [_jsx(Calendar, { className: "text-purple-600", size: 24 }), _jsx("span", { children: "Detalhes do Agendamento" })] }), _jsxs("form", { onSubmit: createAppointment, className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "T\u00EDtulo do Procedimento *" }), _jsx("input", { type: "text", placeholder: "Ex: Limpeza de Pele, Aplica\u00E7\u00E3o de Botox, Consulta de Rotina...", value: title, onChange: (e) => setTitle(e.target.value), className: "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300", required: true })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Data e Hora de In\u00EDcio *" }), _jsxs("div", { className: "relative", children: [_jsx(Clock, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400", size: 20 }), _jsx("input", { type: "datetime-local", value: startTime, onChange: (e) => setStartTime(e.target.value), className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300", required: true })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Data e Hora de T\u00E9rmino" }), _jsxs("div", { className: "relative", children: [_jsx(Clock, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400", size: 20 }), _jsx("input", { type: "datetime-local", value: endTime, onChange: (e) => setEndTime(e.target.value), className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300" })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Local" }), _jsx("input", { type: "text", placeholder: "Local da consulta", value: location, onChange: (e) => setLocation(e.target.value), className: "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Or\u00E7amento (R$)" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400", children: "R$" }), _jsx("input", { type: "number", placeholder: "0,00", value: budget, onChange: (e) => setBudget(e.target.value), min: "0", step: "0.01", className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Descri\u00E7\u00E3o do Procedimento" }), _jsx("textarea", { placeholder: "Detalhes adicionais, observa\u00E7\u00F5es, materiais necess\u00E1rios...", value: description, onChange: (e) => setDescription(e.target.value), className: "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 h-32 resize-none" })] }), _jsxs("div", { className: "flex space-x-4 pt-4", children: [_jsx("button", { type: "button", onClick: () => navigate('/appointments'), className: "flex-1 bg-gray-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-300", children: "Cancelar" }), _jsxs("button", { type: "submit", disabled: creating, className: "flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2", children: [creating ? (_jsx(LoadingSpinner, { size: "sm" })) : (_jsx(Plus, { size: 20 })), _jsx("span", { children: creating ? 'Criando...' : 'Criar Agendamento' })] })] })] })] })), patient && (_jsxs("div", { className: "bg-white rounded-2xl p-6 shadow-sm border border-gray-100", children: [_jsx("h3", { className: "text-lg font-bold text-gray-900 mb-4", children: "Informa\u00E7\u00F5es do Paciente" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Nome" }), _jsx("p", { className: "font-semibold text-gray-900", children: patient.name })] }), _jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Telefone" }), _jsx("p", { className: "font-semibold text-gray-900", children: patient.phone })] }), patient.email && (_jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Email" }), _jsx("p", { className: "font-semibold text-gray-900", children: patient.email })] })), patient.birth_date && (_jsxs("div", { children: [_jsx("p", { className: "text-gray-600", children: "Data de Nascimento" }), _jsx("p", { className: "font-semibold text-gray-900", children: formatDate(patient.birth_date) })] }))] })] }))] }) }));
};
export default AppointmentCreateScreen;
