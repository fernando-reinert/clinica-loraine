import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// src/components/ConsentFormViewer.tsx
// Componente para visualizar e preencher termos de consentimento
import { useState, useEffect } from 'react';
import { FileText, Check, Calendar, MapPin } from 'lucide-react';
import SignaturePad from './SignaturePad';
import { fillConsentTemplate } from '../services/consents/consentService';
import { useAuth } from '../contexts/AuthContext';
import { useProfessional } from '../hooks/useProfessional';
import ProfessionalSetupModal from './ProfessionalSetupModal';
import { normalizeStoragePath } from '../utils/storageUtils';
import { supabase } from '../services/supabase/client';
import logger from '../utils/logger';
const ConsentFormViewer = ({ template, patient, professional: propProfessional, onComplete, readOnly = false, initialData, }) => {
    const { user } = useAuth();
    const { professional: currentProfessional, needsSetup, refresh: refreshProfessional } = useProfessional();
    const [professional, setProfessional] = useState(propProfessional || currentProfessional);
    const [imageAuthorization, setImageAuthorization] = useState(initialData?.imageAuthorization ?? false);
    const [location, setLocation] = useState(initialData?.signedLocation || '');
    const [date, setDate] = useState(initialData?.signedAt
        ? new Date(initialData.signedAt).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR'));
    const [patientSignature, setPatientSignature] = useState(initialData?.patientSignatureUrl || null);
    const [professionalSignature, setProfessionalSignature] = useState(initialData?.professionalSignatureUrl || null);
    const [filledContent, setFilledContent] = useState(initialData?.filledContent || '');
    const [loading, setLoading] = useState(false);
    // ⚠️ NOVO: URLs de exibição (signed URLs para buckets privados)
    const [patientSignatureDisplayUrl, setPatientSignatureDisplayUrl] = useState(null);
    const [professionalSignatureDisplayUrl, setProfessionalSignatureDisplayUrl] = useState(null);
    const [signaturesLoading, setSignaturesLoading] = useState(false);
    const [patientSignatureError, setPatientSignatureError] = useState(null);
    const [professionalSignatureError, setProfessionalSignatureError] = useState(null);
    // Usar profissional atual se não fornecido
    useEffect(() => {
        if (!professional && currentProfessional) {
            setProfessional(currentProfessional);
        }
    }, [currentProfessional, professional]);
    // Preencher template quando dados mudarem
    useEffect(() => {
        // Se for modo somente leitura, priorizar content_snapshot (texto completo já salvo)
        if (readOnly) {
            if (initialData?.content_snapshot) {
                // Usar content_snapshot completo (texto longo já preenchido)
                setFilledContent(initialData.content_snapshot);
            }
            else if (initialData?.filledContent) {
                // Fallback para filled_content (compatibilidade)
                setFilledContent(initialData.filledContent);
            }
            return;
        }
        // Modo edição: preencher template dinamicamente
        if (template.content && patient) {
            const result = fillConsentTemplate({
                id: template.id,
                procedure_key: '',
                title: template.title,
                content: template.content,
                created_at: '',
            }, {
                name: patient.name,
                cpf: patient.cpf,
                birth_date: patient.birth_date,
            }, professional ? {
                name: professional.name,
                license: professional.license,
            } : null, undefined, // procedureKey - não disponível no ConsentFormViewer
            new Date(), // signed_at será atualizado no salvamento
            initialData?.imageAuthorization !== undefined ? initialData.imageAuthorization : undefined);
            if (result.ok && result.filledContent) {
                setFilledContent(result.filledContent);
            }
            else {
                setFilledContent(result.previewContent || template.content);
            }
        }
    }, [template, patient, professional, readOnly, initialData]);
    // PASSO 2: Função de debug para localizar arquivo (CORRIGIDA)
    const debugLocateSignatureFile = async (pathOrUrl, type) => {
        const path = normalizeStoragePath(pathOrUrl);
        console.log(`[DEBUG] Localizando assinatura ${type}:`, { original: pathOrUrl, normalized: path });
        // Extrair diretório e nome do arquivo
        const dir = path.split('/').slice(0, -1).join('/');
        const filename = path.split('/').pop();
        console.log(`[DEBUG] Buscando arquivo:`, { dir, filename, fullPath: path });
        // Tentar ambos buckets
        const buckets = ['consent-attachments', 'signatures'];
        for (const bucket of buckets) {
            try {
                const { data, error } = await supabase.storage.from(bucket).list(dir, {
                    limit: 100,
                    sortBy: { column: 'name', order: 'asc' },
                });
                if (error) {
                    console.log(`[DEBUG] Erro ao listar ${bucket}/${dir}:`, error.message);
                    continue;
                }
                console.log(`[DEBUG] List result em ${bucket}/${dir}:`, {
                    bucket,
                    dir,
                    filesCount: data?.length || 0,
                    files: data?.map(f => f.name) || [],
                });
                if (data && data.length > 0) {
                    const found = data.find(f => f.name === filename);
                    if (found) {
                        console.log(`[DEBUG] ✅ Arquivo encontrado em ${bucket}:`, {
                            bucket,
                            dir,
                            filename: found.name,
                            fullPath: path,
                        });
                        return { bucket, path };
                    }
                }
            }
            catch (err) {
                console.log(`[DEBUG] Erro ao buscar em ${bucket}:`, err.message);
            }
        }
        console.log(`[DEBUG] ❌ Arquivo NÃO encontrado em nenhum bucket:`, { path, dir, filename });
        return null;
    };
    // PASSO 1: Função para gerar signed URL diretamente (sem getViewableUrl)
    const getSignedImageUrl = async (path) => {
        const normalizedPath = normalizeStoragePath(path);
        console.log(`[DEBUG] Gerando signed URL para ${normalizedPath}`);
        const { data, error } = await supabase.storage
            .from('consent-attachments')
            .createSignedUrl(normalizedPath, 3600); // 1 hora
        if (error) {
            console.error(`[DEBUG] Erro ao gerar signed URL:`, {
                path: normalizedPath,
                error: error.message,
                errorCode: error.statusCode,
                errorDetails: error,
            });
            throw new Error(`Erro ao gerar signed URL: ${error.message}`);
        }
        if (!data?.signedUrl) {
            throw new Error('Signed URL vazia');
        }
        console.log(`[DEBUG] ✅ Signed URL gerada:`, data.signedUrl);
        return data.signedUrl;
    };
    // ⚠️ NOVO: Carregar URLs visualizáveis para assinaturas (path ou URL)
    const loadSignatureUrl = async (pathOrUrl, type) => {
        if (!pathOrUrl)
            return;
        try {
            // PASSO 1: Usar getSignedImageUrl diretamente (não getViewableUrl)
            const url = await getSignedImageUrl(pathOrUrl);
            // PASSO 6: Validar URL antes de usar
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                console.log(`[DEBUG] ✅ URL validada para ${type}:`, url);
            }
            catch (fetchError) {
                console.error(`[DEBUG] ❌ URL inválida para ${type}:`, {
                    bucket: 'consent-attachments',
                    path: normalizeStoragePath(pathOrUrl),
                    signedUrl: url,
                    error: fetchError.message,
                });
                throw fetchError;
            }
            if (type === 'patient') {
                setPatientSignatureDisplayUrl(url);
                setPatientSignatureError(null);
            }
            else {
                setProfessionalSignatureDisplayUrl(url);
                setProfessionalSignatureError(null);
            }
        }
        catch (error) {
            const errorMsg = pathOrUrl;
            logger.warn(`[CONSENT] Erro ao carregar assinatura ${type}:`, errorMsg);
            if (type === 'patient') {
                setPatientSignatureError(errorMsg);
                setPatientSignatureDisplayUrl(null);
            }
            else {
                setProfessionalSignatureError(errorMsg);
                setProfessionalSignatureDisplayUrl(null);
            }
        }
    };
    useEffect(() => {
        if (readOnly && initialData) {
            // PASSO 1: Log temporário do que está salvo
            console.log('[DEBUG CONSENT] Dados do termo:', {
                consentId: template.id,
                patient_signature_url: initialData.patientSignatureUrl,
                professional_signature_url: initialData.professionalSignatureUrl,
                bucket: 'consent-attachments',
                patient_normalized: initialData.patientSignatureUrl ? normalizeStoragePath(initialData.patientSignatureUrl) : null,
                professional_normalized: initialData.professionalSignatureUrl ? normalizeStoragePath(initialData.professionalSignatureUrl) : null,
            });
            setSignaturesLoading(true);
            const loadAll = async () => {
                // PASSO 2: Debug - localizar arquivos
                if (initialData.patientSignatureUrl) {
                    await debugLocateSignatureFile(initialData.patientSignatureUrl, 'patient');
                }
                if (initialData.professionalSignatureUrl) {
                    await debugLocateSignatureFile(initialData.professionalSignatureUrl, 'professional');
                }
                await Promise.all([
                    loadSignatureUrl(initialData.patientSignatureUrl, 'patient'),
                    loadSignatureUrl(initialData.professionalSignatureUrl, 'professional'),
                ]);
                setSignaturesLoading(false);
            };
            loadAll();
        }
    }, [readOnly, initialData]);
    const handleComplete = () => {
        if (!patientSignature || !professionalSignature) {
            alert('Por favor, assine o termo (paciente e profissional)');
            return;
        }
        if (!location) {
            alert('Por favor, informe o local da assinatura');
            return;
        }
        if (onComplete) {
            onComplete({
                filledContent,
                patientSignature,
                professionalSignature,
                imageAuthorization,
                location,
                date,
            });
        }
    };
    if (readOnly && initialData) {
        // Modo somente leitura
        return (_jsxs("div", { className: "glass-card p-6 border border-white/10", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsx(FileText, { className: "text-cyan-300", size: 24 }), _jsx("h3", { className: "text-xl font-bold glow-text", children: template.title })] }), _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "glass-card rounded-xl p-6 border border-white/10", children: _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-lg font-bold text-center text-white mb-4 border-b border-white/10 pb-2", children: template.title }), _jsx("div", { className: "prose prose-invert max-w-none text-gray-200 whitespace-pre-wrap text-sm leading-relaxed", style: {
                                            fontFamily: 'system-ui, -apple-system, sans-serif',
                                            lineHeight: '1.6'
                                        }, children: filledContent || initialData?.content_snapshot || initialData?.filledContent || '' })] }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-300 mb-2", children: "Assinatura do Paciente" }), signaturesLoading ? (_jsx("div", { className: "w-full h-32 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center", children: _jsx("div", { className: "text-gray-400 text-sm", children: "Carregando..." }) })) : patientSignatureDisplayUrl ? (_jsx("img", { src: patientSignatureDisplayUrl, alt: "Assinatura do paciente", className: "w-full h-32 object-contain bg-white rounded-lg border border-white/10", onError: () => {
                                                logger.warn('[CONSENT] Erro ao carregar imagem da assinatura do paciente');
                                                setPatientSignatureError(initialData?.patientSignatureUrl || 'Erro ao carregar');
                                                setPatientSignatureDisplayUrl(null);
                                            } })) : patientSignatureError ? (_jsxs("div", { className: "w-full h-32 bg-red-500/10 rounded-lg border border-red-400/30 flex flex-col items-center justify-center gap-2 px-4", children: [_jsx("div", { className: "text-red-300 text-sm text-center", children: "Assinatura indispon\u00EDvel" }), _jsx("button", { onClick: () => {
                                                        if (initialData?.patientSignatureUrl) {
                                                            loadSignatureUrl(initialData.patientSignatureUrl, 'patient');
                                                        }
                                                    }, className: "px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded transition-colors text-red-200", children: "Recarregar" })] })) : (_jsx("div", { className: "w-full h-32 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center", children: _jsx("div", { className: "text-gray-400 text-sm", children: "Assinatura n\u00E3o dispon\u00EDvel" }) }))] }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-300 mb-2", children: "Assinatura do Profissional" }), signaturesLoading ? (_jsx("div", { className: "w-full h-32 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center", children: _jsx("div", { className: "text-gray-400 text-sm", children: "Carregando..." }) })) : professionalSignatureDisplayUrl ? (_jsx("img", { src: professionalSignatureDisplayUrl, alt: "Assinatura do profissional", className: "w-full h-32 object-contain bg-white rounded-lg border border-white/10", onError: () => {
                                                logger.warn('[CONSENT] Erro ao carregar imagem da assinatura do profissional');
                                                setProfessionalSignatureError(initialData?.professionalSignatureUrl || 'Erro ao carregar');
                                                setProfessionalSignatureDisplayUrl(null);
                                            } })) : professionalSignatureError ? (_jsxs("div", { className: "w-full h-32 bg-red-500/10 rounded-lg border border-red-400/30 flex flex-col items-center justify-center gap-2 px-4", children: [_jsx("div", { className: "text-red-300 text-sm text-center", children: "Assinatura indispon\u00EDvel" }), _jsx("button", { onClick: () => {
                                                        if (initialData?.professionalSignatureUrl) {
                                                            loadSignatureUrl(initialData.professionalSignatureUrl, 'professional');
                                                        }
                                                    }, className: "px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded transition-colors text-red-200", children: "Recarregar" })] })) : (_jsx("div", { className: "w-full h-32 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center", children: _jsx("div", { className: "text-gray-400 text-sm", children: "Assinatura n\u00E3o dispon\u00EDvel" }) }))] })] }), _jsxs("div", { className: "flex flex-wrap gap-4 text-sm text-gray-300", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(MapPin, { size: 16 }), _jsx("span", { children: initialData.signedLocation })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calendar, { size: 16 }), _jsx("span", { children: new Date(initialData.signedAt || '').toLocaleDateString('pt-BR') })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Check, { size: 16, className: imageAuthorization ? 'text-green-400' : 'text-red-400' }), _jsxs("span", { children: ["Autoriza\u00E7\u00E3o de Imagem: ", imageAuthorization ? 'SIM' : 'NÃO'] })] })] })] })] }));
    }
    // Se precisa de setup e não é readOnly, mostrar modal
    if (needsSetup && !readOnly && user) {
        return (_jsxs(_Fragment, { children: [_jsx("div", { className: "glass-card p-6 border border-white/10", children: _jsx("div", { className: "text-center py-8", children: _jsx("p", { className: "text-gray-300 mb-4", children: "Configure seu perfil profissional para continuar" }) }) }), _jsx(ProfessionalSetupModal, { userId: user.id, userEmail: user.email || '', onComplete: (prof) => {
                        setProfessional(prof);
                        refreshProfessional();
                    } })] }));
    }
    return (_jsxs("div", { className: "glass-card p-6 border border-white/10", children: [_jsxs("div", { className: "flex items-center gap-3 mb-6", children: [_jsx(FileText, { className: "text-cyan-300", size: 24 }), _jsx("h3", { className: "text-xl font-bold glow-text", children: template.title })] }), _jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "glass-card rounded-xl p-6 border border-white/10 max-h-96 overflow-y-auto", children: _jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-lg font-bold text-center text-white mb-4 border-b border-white/10 pb-2", children: template.title }), _jsx("div", { className: "prose prose-invert max-w-none text-gray-200 whitespace-pre-wrap text-sm leading-relaxed", style: {
                                        fontFamily: 'system-ui, -apple-system, sans-serif',
                                        lineHeight: '1.6'
                                    }, children: filledContent || '' })] }) }), _jsxs("div", { className: "flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10", children: [_jsx("input", { type: "checkbox", id: "imageAuthorization", checked: imageAuthorization, onChange: (e) => setImageAuthorization(e.target.checked), className: "w-5 h-5 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500" }), _jsx("label", { htmlFor: "imageAuthorization", className: "text-gray-200 cursor-pointer", children: "Autorizo o uso de minhas imagens para fins de documenta\u00E7\u00E3o cl\u00EDnica e divulga\u00E7\u00E3o cient\u00EDfica" })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Local da Assinatura" }), _jsx("input", { type: "text", value: location, onChange: (e) => setLocation(e.target.value), placeholder: "Ex: Cl\u00EDnica Loraine Vilela", className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-200 mb-2", children: "Data" }), _jsx("input", { type: "date", value: date.split('/').reverse().join('-'), onChange: (e) => {
                                            const d = new Date(e.target.value);
                                            setDate(d.toLocaleDateString('pt-BR'));
                                        }, className: "w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all" })] })] }), _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-300 mb-3", children: "Assinatura do Paciente" }), _jsx(SignaturePad, { onSignatureChange: (dataUrl) => setPatientSignature(dataUrl), width: 600, height: 200, lineWidth: 3, lineColor: "#000000", backgroundColor: "#ffffff" }), patientSignature && (_jsxs("div", { className: "mt-2 flex items-center gap-2 text-green-400 text-sm", children: [_jsx(Check, { size: 16 }), _jsx("span", { children: "Assinatura capturada" })] }))] }), _jsxs("div", { children: [_jsx("h4", { className: "text-sm font-semibold text-gray-300 mb-3", children: "Assinatura do Profissional" }), _jsx(SignaturePad, { onSignatureChange: (dataUrl) => setProfessionalSignature(dataUrl), width: 600, height: 200, lineWidth: 3, lineColor: "#000000", backgroundColor: "#ffffff" }), professionalSignature && (_jsxs("div", { className: "mt-2 flex items-center gap-2 text-green-400 text-sm", children: [_jsx(Check, { size: 16 }), _jsx("span", { children: "Assinatura capturada" })] }))] })] }), onComplete && (_jsx("div", { className: "flex justify-end", children: _jsxs("button", { onClick: handleComplete, disabled: !patientSignature || !professionalSignature || !location, className: "neon-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 px-6 py-3", children: [_jsx(Check, { size: 20 }), _jsx("span", { children: "Concluir e Salvar" })] }) }))] })] }));
};
export default ConsentFormViewer;
