import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/screens/AppointmentTreatmentScreen.tsx
// Tela de atendimento com assinatura de termos de consentimento
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import ProcedureSelector from '../components/ProcedureSelector';
import ConsentFormViewer from '../components/ConsentFormViewer';
import StickerPhotoUploader from '../components/StickerPhotoUploader';
import { supabase } from '../services/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useProfessional } from '../hooks/useProfessional';
import ProfessionalSetupModal from '../components/ProfessionalSetupModal';
import { getConsentTemplateByProcedureKey, getProcedureByKey, createConsentForm, } from '../services/consents/consentService';
import { createOrUpdateVisitFromAppointment, createVisitProcedure, uploadProcedureSticker, } from '../services/medical-record/medicalRecordService';
import toast from 'react-hot-toast';
const AppointmentTreatmentScreen = () => {
    const { appointmentId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { professional: currentProfessional, needsSetup, refresh: refreshProfessional } = useProfessional();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [appointment, setAppointment] = useState(null);
    const [patient, setPatient] = useState(null);
    const [professional, setProfessional] = useState(currentProfessional || null);
    const [selectedProcedures, setSelectedProcedures] = useState([]);
    const [currentProcedureIndex, setCurrentProcedureIndex] = useState(0);
    const [consentData, setConsentData] = useState({});
    const [stickerPhotos, setStickerPhotos] = useState({});
    const [visitId, setVisitId] = useState(null);
    const [procedureTemplates, setProcedureTemplates] = useState({});
    const [procedureOptions, setProcedureOptions] = useState({});
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
            if (appointmentError)
                throw appointmentError;
            setAppointment(appointmentData);
            // Carregar paciente
            if (appointmentData.patient_id) {
                const { data: patientData, error: patientError } = await supabase
                    .from('patients')
                    .select('*')
                    .eq('id', appointmentData.patient_id)
                    .single();
                if (patientError)
                    throw patientError;
                setPatient(patientData);
            }
            // Usar profissional do hook
            if (currentProfessional) {
                setProfessional(currentProfessional);
            }
            else if (needsSetup) {
                // Não lançar erro, apenas não definir professional
                // O modal será mostrado abaixo
            }
            // Criar/atualizar visit
            if (appointmentData.patient_id && user) {
                const visit = await createOrUpdateVisitFromAppointment(appointmentData.id, appointmentData.patient_id, user.id, appointmentData.start_time, 'in_progress');
                setVisitId(visit.id);
            }
        }
        catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast.error('Erro ao carregar dados do atendimento');
        }
        finally {
            setLoading(false);
        }
    };
    const handleProcedureSelection = (procedureKeys) => {
        setSelectedProcedures(procedureKeys);
        setCurrentProcedureIndex(0);
    };
    const handleConsentComplete = async (procedureKey, data) => {
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
                    }
                    catch (error) {
                        console.error(`Erro ao carregar template para procedimento ${procedureKey}:`, error);
                    }
                }
            }
        };
        if (selectedProcedures.length > 0) {
            loadTemplates();
        }
    }, [selectedProcedures]);
    const handleStickerUpload = async (procedureKey, file) => {
        if (!visitId || !patient)
            return;
        try {
            // Armazenar temporariamente (será salvo quando finalizar atendimento)
            setStickerPhotos((prev) => ({
                ...prev,
                [procedureKey]: [...(prev[procedureKey] || []), { file, url: URL.createObjectURL(file) }],
            }));
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('Erro ao salvar atendimento:', error);
            toast.error('Erro ao salvar atendimento');
        }
        finally {
            setSaving(false);
        }
    };
    if (loading) {
        return (_jsx(AppLayout, { title: "Carregando...", showBack: true, children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(LoadingSpinner, { size: "lg" }) }) }));
    }
    if (!appointment || !patient) {
        return (_jsx(AppLayout, { title: "Erro", showBack: true, children: _jsx("div", { className: "text-center py-8 text-red-400", children: _jsx("p", { children: "Erro ao carregar dados do atendimento" }) }) }));
    }
    // Mostrar modal de setup se necessário
    if (needsSetup && user) {
        return (_jsx(AppLayout, { title: "Configura\u00E7\u00E3o Necess\u00E1ria", showBack: true, children: _jsx(ProfessionalSetupModal, { userId: user.id, userEmail: user.email || '', onComplete: (prof) => {
                    setProfessional(prof);
                    refreshProfessional();
                } }) }));
    }
    if (!professional) {
        return (_jsx(AppLayout, { title: "Carregando...", showBack: true, children: _jsx("div", { className: "flex items-center justify-center h-64", children: _jsx(LoadingSpinner, { size: "lg" }) }) }));
    }
    const currentProcedureId = selectedProcedures[currentProcedureIndex];
    const currentProcedure = currentProcedureId
        ? { id: currentProcedureId, name: 'Carregando...' }
        : null;
    return (_jsx(AppLayout, { title: "Atendimento", showBack: true, children: _jsxs("div", { className: "p-6 space-y-6", children: [_jsx("div", { className: "glass-card p-6 border border-white/10", children: _jsx("div", { className: "flex items-center justify-between", children: _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold glow-text mb-2", children: appointment.title }), _jsxs("p", { className: "text-gray-300", children: ["Paciente: ", patient.name] }), _jsx("p", { className: "text-sm text-gray-400", children: new Date(appointment.start_time).toLocaleString('pt-BR') })] }) }) }), selectedProcedures.length === 0 && (_jsx(ProcedureSelector, { selectedProcedures: selectedProcedures, onSelectionChange: handleProcedureSelection, multiSelect: true })), selectedProcedures.length > 0 && (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "glass-card p-4 border border-white/10", children: _jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsxs("span", { className: "text-sm text-gray-300", children: ["Procedimento ", currentProcedureIndex + 1, " de ", selectedProcedures.length] }), _jsx("div", { className: "flex gap-2", children: selectedProcedures.map((_, index) => (_jsx("div", { className: `w-2 h-2 rounded-full ${index === currentProcedureIndex
                                                ? 'bg-cyan-400'
                                                : index < currentProcedureIndex
                                                    ? 'bg-green-400'
                                                    : 'bg-gray-600'}` }, index))) })] }) }), currentProcedureId && (_jsxs(_Fragment, { children: [procedureTemplates[currentProcedureId] ? (_jsx(ConsentFormViewer, { template: procedureTemplates[currentProcedureId], patient: patient, professional: professional, onComplete: (data) => handleConsentComplete(currentProcedureId, data) })) : (_jsx("div", { className: "glass-card p-6 border border-white/10", children: _jsxs("div", { className: "text-center py-8", children: [_jsx(LoadingSpinner, { size: "lg" }), _jsx("p", { className: "mt-4 text-gray-300", children: "Carregando termo de consentimento..." })] }) })), _jsx(StickerPhotoUploader, { onUpload: (file) => handleStickerUpload(currentProcedureId, file), existingPhotos: stickerPhotos[currentProcedureId] || [] })] })), Object.keys(consentData).length === selectedProcedures.length && (_jsx("div", { className: "flex justify-end", children: _jsx("button", { onClick: handleSaveTreatment, disabled: saving, className: "neon-button disabled:opacity-50 flex items-center gap-2 px-6 py-3", children: saving ? (_jsxs(_Fragment, { children: [_jsx(LoadingSpinner, { size: "sm" }), _jsx("span", { children: "Salvando..." })] })) : (_jsxs(_Fragment, { children: [_jsx(Check, { size: 20 }), _jsx("span", { children: "Finalizar Atendimento" })] })) }) }))] }))] }) }));
};
export default AppointmentTreatmentScreen;
