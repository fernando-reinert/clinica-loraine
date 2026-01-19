import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Grid, List, Search, Plus, X, User, Scissors, Calendar, MapPin, Edit, Trash2, ZoomIn, Save, } from "lucide-react";
import Header from "../components/Header";
//import BottomNavigation from "../components/BottomNavigation";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase/client";
const GalleryScreen = () => {
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const beforeFileInputRef = useRef(null);
    const afterFileInputRef = useRef(null);
    // Estados
    const [photos, setPhotos] = useState([]);
    const [patients, setPatients] = useState([]);
    const [filteredPatients, setFilteredPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [editingPhoto, setEditingPhoto] = useState(null);
    // Filtros e busca
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [filterType, setFilterType] = useState("all");
    const [viewMode, setViewMode] = useState("grid");
    const [dateFilter, setDateFilter] = useState("");
    // Modais e câmera
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [activePhotoType, setActivePhotoType] = useState("before");
    // Dados do upload
    const [uploadData, setUploadData] = useState({
        patientId: "",
        patientName: "",
        procedureName: "",
        procedureDate: new Date().toISOString().split("T")[0],
        photoType: "before",
        region: "",
        notes: "",
    });
    // Dados da edição
    const [editData, setEditData] = useState({
        procedureDate: "",
        region: "",
        notes: "",
    });
    // Lista de procedimentos comuns
    const commonProcedures = [
        "Botox Frontal",
        "Botox Glabela",
        "Preenchimento Labial",
        "Preenchimento Malar",
        "Limpeza de Pele",
        "Peeling Químico",
        "Microagulhamento",
        "Luz Intensa Pulsada",
        "Depilação a Laser",
        "Drenagem Linfática",
        "Massagem Modeladora",
        "Carboxiterapia",
    ];
    // Carregar dados iniciais
    useEffect(() => {
        loadInitialData();
    }, []);
    // Recarregar fotos quando filtros mudarem
    useEffect(() => {
        if (!loading) {
            loadPhotos();
        }
    }, [selectedPatient, filterType, dateFilter]);
    const loadInitialData = async () => {
        try {
            setLoading(true);
            await Promise.all([loadPatients(), loadPhotos()]);
        }
        catch (error) {
            console.error("Erro ao carregar dados:", error);
            toast.error("Erro ao carregar dados da galeria");
        }
        finally {
            setLoading(false);
        }
    };
    const loadPatients = async () => {
        try {
            const { data, error } = await supabase
                .from("patients")
                .select("id, name, phone, email")
                .order("name");
            if (error)
                throw error;
            setPatients(data || []);
        }
        catch (error) {
            console.error("Erro ao carregar pacientes:", error);
            throw error;
        }
    };
    const loadPhotos = async () => {
        try {
            let query = supabase
                .from("photos")
                .select("*")
                .order("created_at", { ascending: false });
            // Aplicar filtros
            if (selectedPatient) {
                query = query.eq("patient_id", selectedPatient.id);
            }
            if (filterType !== "all") {
                query = query.eq("photo_type", filterType);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            setPhotos(data || []);
        }
        catch (error) {
            console.error("Erro ao carregar fotos:", error);
            throw error;
        }
    };
    // Busca inteligente de pacientes
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setFilteredPatients([]);
            return;
        }
        const term = searchTerm.toLowerCase();
        const filtered = patients.filter((patient) => patient.name.toLowerCase().includes(term) ||
            patient.phone.includes(term) ||
            patient.email?.toLowerCase().includes(term));
        setFilteredPatients(filtered.slice(0, 5));
    }, [searchTerm, patients]);
    // Inicializar câmera
    const initializeCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        }
        catch (error) {
            console.error("Erro ao acessar câmera:", error);
            toast.error("Não foi possível acessar a câmera");
        }
    };
    // Tirar foto
    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext("2d");
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                canvasRef.current.toBlob(async (blob) => {
                    if (blob) {
                        await handlePhotoUpload(blob);
                    }
                }, "image/jpeg", 0.8);
            }
        }
    };
    // Parar câmera
    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    };
    // Atualize a função handlePhotoUpload para aceitar um parâmetro opcional com os dados
    const handlePhotoUpload = async (fileBlob, photoType, groupData) => {
        const targetPhotoType = photoType || uploadData.photoType;
        // Se temos groupData (para foto "depois"), usamos esses dados
        // Caso contrário, validamos os dados do upload normal
        const useGroupData = !!groupData;
        const uploadInfo = useGroupData ? groupData : uploadData;
        if (!uploadInfo.patientId || !uploadInfo.procedureName) {
            toast.error("Selecione o paciente e procedimento");
            return;
        }
        setUploading(true);
        try {
            const patient = patients.find((p) => p.id === uploadInfo.patientId);
            if (!patient) {
                throw new Error("Paciente não encontrado");
            }
            // Upload para o Supabase Storage
            const fileExt = "jpg";
            const fileName = `${patient.id}_${uploadInfo.procedureName.replace(/\s+/g, "_")}_${targetPhotoType}_${Date.now()}.${fileExt}`;
            const filePath = `patient-photos/${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from("patient_photos")
                .upload(filePath, fileBlob);
            if (uploadError)
                throw uploadError;
            // Obter URL pública
            const { data: { publicUrl }, } = supabase.storage.from("patient_photos").getPublicUrl(filePath);
            // Salvar metadados no banco
            const { error: dbError } = await supabase.from("photos").insert([
                {
                    patient_id: uploadInfo.patientId,
                    procedure_name: uploadInfo.procedureName,
                    photo_type: targetPhotoType,
                    photo_url: publicUrl,
                    metadata: {
                        patient_name: patient.name,
                        region: uploadInfo.region,
                        notes: uploadInfo.notes,
                        procedure_date: uploadInfo.procedureDate,
                        photo_date: new Date().toISOString().split("T")[0],
                    },
                },
            ]);
            if (dbError)
                throw dbError;
            toast.success(`Foto ${targetPhotoType === "before" ? "antes" : "depois"} salva com sucesso!`);
            // Só limpa o modal se for um upload normal (não de grupo existente)
            if (!useGroupData && !photoType) {
                setShowUploadModal(false);
                setShowCamera(false);
                setUploadData({
                    patientId: "",
                    patientName: "",
                    procedureName: "",
                    procedureDate: new Date().toISOString().split("T")[0],
                    photoType: "before",
                    region: "",
                    notes: "",
                });
            }
            // Recarregar fotos
            await loadPhotos();
        }
        catch (error) {
            console.error("Erro ao salvar foto:", error);
            toast.error("Erro ao salvar foto");
        }
        finally {
            setUploading(false);
        }
    };
    // Atualizar foto existente
    const updatePhoto = async (photo, fileBlob) => {
        setUploading(true);
        try {
            // Upload para o Supabase Storage
            const fileExt = "jpg";
            const fileName = `${photo.patient_id}_${photo.procedure_name.replace(/\s+/g, "_")}_${photo.photo_type}_${Date.now()}.${fileExt}`;
            const filePath = `patient-photos/${fileName}`;
            const { error: uploadError } = await supabase.storage
                .from("patient_photos")
                .upload(filePath, fileBlob);
            if (uploadError)
                throw uploadError;
            // Obter URL pública
            const { data: { publicUrl }, } = supabase.storage.from("patient_photos").getPublicUrl(filePath);
            // Atualizar metadados no banco
            const { error: dbError } = await supabase
                .from("photos")
                .update({
                photo_url: publicUrl,
                metadata: {
                    ...photo.metadata,
                    region: editData.region,
                    notes: editData.notes,
                    procedure_date: editData.procedureDate,
                    photo_date: new Date().toISOString().split("T")[0],
                },
            })
                .eq("id", photo.id);
            if (dbError)
                throw dbError;
            toast.success("Foto atualizada com sucesso!");
            setEditingPhoto(null);
            setEditData({
                procedureDate: "",
                region: "",
                notes: "",
            });
            // Recarregar fotos
            await loadPhotos();
        }
        catch (error) {
            console.error("Erro ao atualizar foto:", error);
            toast.error("Erro ao atualizar foto");
        }
        finally {
            setUploading(false);
        }
    };
    // Selecionar arquivo da galeria para upload novo
    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            handlePhotoUpload(file);
        }
    };
    // Selecionar arquivo para substituir foto existente
    const handleReplacePhoto = (event, photo) => {
        const file = event.target.files?.[0];
        if (file) {
            updatePhoto(photo, file);
        }
    };
    // Iniciar edição de foto
    const startEditing = (photo) => {
        setEditingPhoto(photo);
        setEditData({
            procedureDate: photo.metadata?.procedure_date ||
                new Date().toISOString().split("T")[0],
            region: photo.metadata?.region || "",
            notes: photo.metadata?.notes || "",
        });
    };
    // Salvar edição (sem alterar a foto)
    const saveEdit = async () => {
        if (!editingPhoto)
            return;
        setUploading(true);
        try {
            const { error } = await supabase
                .from("photos")
                .update({
                metadata: {
                    ...editingPhoto.metadata,
                    region: editData.region,
                    notes: editData.notes,
                    procedure_date: editData.procedureDate,
                },
            })
                .eq("id", editingPhoto.id);
            if (error)
                throw error;
            toast.success("Informações atualizadas com sucesso!");
            setEditingPhoto(null);
            setEditData({
                procedureDate: "",
                region: "",
                notes: "",
            });
            await loadPhotos();
        }
        catch (error) {
            console.error("Erro ao atualizar informações:", error);
            toast.error("Erro ao atualizar informações");
        }
        finally {
            setUploading(false);
        }
    };
    // Deletar foto
    const deletePhoto = async (photo) => {
        if (!confirm("Tem certeza que deseja excluir esta foto?"))
            return;
        try {
            // Extrair caminho do arquivo da URL
            const filePath = photo.photo_url.split("/").pop();
            if (filePath) {
                // Deletar do storage
                const { error: storageError } = await supabase.storage
                    .from("patient_photos")
                    .remove([`patient-photos/${filePath}`]);
                if (storageError)
                    throw storageError;
            }
            // Deletar do banco
            const { error: dbError } = await supabase
                .from("photos")
                .delete()
                .eq("id", photo.id);
            if (dbError)
                throw dbError;
            toast.success("Foto excluída com sucesso!");
            await loadPhotos();
        }
        catch (error) {
            console.error("Erro ao excluir foto:", error);
            toast.error("Erro ao excluir foto");
        }
    };
    // Agrupar fotos por paciente e procedimento
    const groupedPhotos = photos.reduce((acc, photo) => {
        const key = `${photo.patient_id}-${photo.procedure_name}`;
        if (!acc[key]) {
            acc[key] = {
                patient: {
                    id: photo.patient_id,
                    name: photo.metadata?.patient_name || "Nome não disponível",
                },
                procedure: photo.procedure_name,
                procedureDate: photo.metadata?.procedure_date,
                before: null,
                after: null,
                photos: [],
            };
        }
        acc[key].photos.push(photo);
        if (photo.photo_type === "before") {
            acc[key].before = photo;
        }
        else {
            acc[key].after = photo;
        }
        // Manter a data do procedimento mais recente
        if (photo.metadata?.procedure_date) {
            acc[key].procedureDate = photo.metadata.procedure_date;
        }
        return acc;
    }, {});
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString("pt-BR");
    };
    // Estatísticas
    const stats = {
        total: photos.length,
        before: photos.filter((p) => p.photo_type === "before").length,
        after: photos.filter((p) => p.photo_type === "after").length,
        patients: new Set(photos.map((p) => p.patient_id)).size,
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen bg-gray-50 flex items-center justify-center", children: _jsx(LoadingSpinner, { size: "lg" }) }));
    }
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20", children: [_jsx(Header, { title: "Galeria de Fotos", rightAction: _jsx("button", { onClick: () => setShowUploadModal(true), className: "p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white shadow-lg hover:shadow-xl transition-all active:scale-95", children: _jsx(Plus, { size: 20 }) }) }), _jsxs("div", { className: "p-4 space-y-6", children: [_jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [_jsxs("div", { className: "ios-card p-4 text-center bg-gradient-to-br from-white to-blue-50", children: [_jsx("div", { className: "text-2xl font-bold text-blue-600", children: stats.total }), _jsx("div", { className: "text-sm text-gray-600", children: "Total Fotos" })] }), _jsxs("div", { className: "ios-card p-4 text-center bg-gradient-to-br from-white to-green-50", children: [_jsx("div", { className: "text-2xl font-bold text-green-600", children: stats.before }), _jsx("div", { className: "text-sm text-gray-600", children: "Fotos Antes" })] }), _jsxs("div", { className: "ios-card p-4 text-center bg-gradient-to-br from-white to-purple-50", children: [_jsx("div", { className: "text-2xl font-bold text-purple-600", children: stats.after }), _jsx("div", { className: "text-sm text-gray-600", children: "Fotos Depois" })] }), _jsxs("div", { className: "ios-card p-4 text-center bg-gradient-to-br from-white to-orange-50", children: [_jsx("div", { className: "text-2xl font-bold text-orange-600", children: stats.patients }), _jsx("div", { className: "text-sm text-gray-600", children: "Pacientes" })] })] }), _jsxs("div", { className: "ios-card p-4 space-y-4", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400", size: 20 }), _jsx("input", { type: "text", placeholder: "Buscar paciente por nome, telefone ou email...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" }), filteredPatients.length > 0 && (_jsx("div", { className: "absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto", children: filteredPatients.map((patient) => (_jsxs("button", { onClick: () => {
                                                setSelectedPatient(patient);
                                                setSearchTerm(patient.name);
                                                setFilteredPatients([]);
                                            }, className: "w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-3", children: [_jsx(User, { className: "text-gray-400", size: 18 }), _jsxs("div", { children: [_jsx("div", { className: "font-medium text-gray-900", children: patient.name }), _jsx("div", { className: "text-sm text-gray-500", children: patient.phone })] })] }, patient.id))) }))] }), _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsx("div", { className: "flex space-x-1 bg-gray-100 rounded-lg p-1", children: ["all", "before", "after"].map((type) => (_jsx("button", { onClick: () => setFilterType(type), className: `px-3 py-2 rounded-md text-sm font-medium transition-all ${filterType === type
                                                ? "bg-white text-blue-600 shadow-sm"
                                                : "text-gray-600 hover:text-gray-900"}`, children: type === "all"
                                                ? "Todas"
                                                : type === "before"
                                                    ? "Antes"
                                                    : "Depois" }, type))) }), _jsxs("div", { className: "flex space-x-1 bg-gray-100 rounded-lg p-1 ml-auto", children: [_jsx("button", { onClick: () => setViewMode("grid"), className: `p-2 rounded-md transition-all ${viewMode === "grid"
                                                    ? "bg-white text-blue-600 shadow-sm"
                                                    : "text-gray-600 hover:text-gray-900"}`, children: _jsx(Grid, { size: 18 }) }), _jsx("button", { onClick: () => setViewMode("list"), className: `p-2 rounded-md transition-all ${viewMode === "list"
                                                    ? "bg-white text-blue-600 shadow-sm"
                                                    : "text-gray-600 hover:text-gray-900"}`, children: _jsx(List, { size: 18 }) })] })] }), selectedPatient && (_jsxs("div", { className: "flex items-center justify-between p-3 bg-blue-50 rounded-lg", children: [_jsxs("div", { className: "flex items-center space-x-3", children: [_jsx(User, { className: "text-blue-600", size: 20 }), _jsxs("div", { children: [_jsx("div", { className: "font-medium text-blue-900", children: selectedPatient.name }), _jsxs("div", { className: "text-sm text-blue-700", children: [photos.filter((p) => p.patient_id === selectedPatient.id)
                                                                .length, " ", "fotos"] })] })] }), _jsx("button", { onClick: () => {
                                            setSelectedPatient(null);
                                            setSearchTerm("");
                                        }, className: "text-blue-600 hover:text-blue-800", children: _jsx(X, { size: 18 }) })] }))] }), viewMode === "grid" ? (_jsx("div", { className: "space-y-6", children: Object.values(groupedPhotos).map((group, index) => (_jsxs("div", { className: "ios-card p-6", children: [_jsx("div", { className: "flex items-center justify-between mb-6", children: _jsxs("div", { children: [_jsx("h3", { className: "text-xl font-bold text-gray-900", children: group.patient.name }), _jsxs("p", { className: "text-gray-600 flex items-center space-x-2 mt-1", children: [_jsx(Scissors, { size: 16 }), _jsx("span", { children: group.procedure })] }), group.procedureDate && (_jsxs("p", { className: "text-sm text-gray-500 flex items-center space-x-2 mt-1", children: [_jsx(Calendar, { size: 14 }), _jsxs("span", { children: ["Procedimento: ", formatDate(group.procedureDate)] })] }))] }) }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium", children: "Antes" }), _jsx("div", { className: "flex space-x-1", children: group.before && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => startEditing(group.before), className: "p-1 text-blue-400 hover:text-blue-600 transition-colors", title: "Editar informa\u00E7\u00F5es", children: _jsx(Edit, { size: 16 }) }), _jsx("button", { onClick: () => deletePhoto(group.before), className: "p-1 text-red-400 hover:text-red-600 transition-colors", title: "Excluir foto", children: _jsx(Trash2, { size: 16 }) })] })) })] }), group.before ? (_jsxs("div", { className: "relative", children: [_jsx("div", { className: "aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer", onClick: () => setSelectedPhoto(group.before), children: _jsx("img", { src: group.before.photo_url, alt: "Antes", className: "w-full h-full object-cover" }) }), _jsxs("div", { className: "absolute top-2 right-2", children: [_jsx("input", { ref: beforeFileInputRef, type: "file", accept: "image/*", onChange: (e) => handleReplacePhoto(e, group.before), className: "hidden" }), _jsx("button", { onClick: () => beforeFileInputRef.current?.click(), className: "p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all", title: "Substituir foto", children: _jsx(Camera, { size: 14 }) })] })] })) : (_jsxs("div", { className: "aspect-[4/3] bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 hover:border-blue-300 transition-colors", children: [_jsx("input", { ref: beforeFileInputRef, type: "file", accept: "image/*", onChange: (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file &&
                                                                    uploadData.patientId &&
                                                                    uploadData.procedureName) {
                                                                    handlePhotoUpload(file, "before");
                                                                }
                                                                else {
                                                                    toast.error("Selecione primeiro o paciente e procedimento");
                                                                }
                                                            }, className: "hidden" }), _jsxs("button", { onClick: () => beforeFileInputRef.current?.click(), className: "flex flex-col items-center justify-center w-full h-full", children: [_jsx(Camera, { size: 32 }), _jsx("span", { className: "mt-2 text-sm", children: "Adicionar foto Antes" })] })] })), group.before && group.before.metadata && (_jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex items-center space-x-2 text-gray-600", children: [_jsx(Calendar, { size: 14 }), _jsxs("span", { children: ["Foto:", " ", formatDate(group.before.metadata.photo_date ||
                                                                            group.before.created_at)] })] }), group.before.metadata.region && (_jsxs("div", { className: "flex items-center space-x-2 text-gray-600", children: [_jsx(MapPin, { size: 14 }), _jsx("span", { children: group.before.metadata.region })] }))] }))] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium", children: "Depois" }), _jsx("div", { className: "flex space-x-1", children: group.after && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => startEditing(group.after), className: "p-1 text-blue-400 hover:text-blue-600 transition-colors", title: "Editar informa\u00E7\u00F5es", children: _jsx(Edit, { size: 16 }) }), _jsx("button", { onClick: () => deletePhoto(group.after), className: "p-1 text-red-400 hover:text-red-600 transition-colors", title: "Excluir foto", children: _jsx(Trash2, { size: 16 }) })] })) })] }), group.after ? (_jsxs("div", { className: "relative", children: [_jsx("div", { className: "aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer", onClick: () => setSelectedPhoto(group.after), children: _jsx("img", { src: group.after.photo_url, alt: "Depois", className: "w-full h-full object-cover" }) }), _jsxs("div", { className: "absolute top-2 right-2", children: [_jsx("input", { ref: afterFileInputRef, type: "file", accept: "image/*", onChange: (e) => handleReplacePhoto(e, group.after), className: "hidden" }), _jsx("button", { onClick: () => afterFileInputRef.current?.click(), className: "p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all", title: "Substituir foto", children: _jsx(Camera, { size: 14 }) })] })] })) : (_jsxs("div", { className: "aspect-[4/3] bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 hover:border-green-300 transition-colors", children: [_jsx("input", { ref: afterFileInputRef, type: "file", accept: "image/*", onChange: (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    // Para foto "depois", usamos os dados do grupo existente
                                                                    handlePhotoUpload(file, "after", {
                                                                        patientId: group.patient.id,
                                                                        procedureName: group.procedure,
                                                                        procedureDate: group.procedureDate ||
                                                                            new Date().toISOString().split("T")[0],
                                                                        region: group.before?.metadata?.region || "",
                                                                        notes: group.before?.metadata?.notes || "",
                                                                    });
                                                                }
                                                            }, className: "hidden" }), _jsxs("button", { onClick: () => afterFileInputRef.current?.click(), className: "flex flex-col items-center justify-center w-full h-full", children: [_jsx(Camera, { size: 32 }), _jsx("span", { className: "mt-2 text-sm", children: "Adicionar foto Depois" })] })] })), group.after && group.after.metadata && (_jsxs("div", { className: "space-y-2 text-sm", children: [_jsxs("div", { className: "flex items-center space-x-2 text-gray-600", children: [_jsx(Calendar, { size: 14 }), _jsxs("span", { children: ["Foto:", " ", formatDate(group.after.metadata.photo_date ||
                                                                            group.after.created_at)] })] }), group.after.metadata.region && (_jsxs("div", { className: "flex items-center space-x-2 text-gray-600", children: [_jsx(MapPin, { size: 14 }), _jsx("span", { children: group.after.metadata.region })] }))] }))] })] }), (group.before?.metadata?.notes ||
                                    group.after?.metadata?.notes) && (_jsxs("div", { className: "mt-4 p-4 bg-gray-50 rounded-lg", children: [_jsx("h4", { className: "font-medium text-gray-900 mb-2", children: "Observa\u00E7\u00F5es" }), group.before?.metadata?.notes && (_jsxs("p", { className: "text-sm text-gray-600 mb-2", children: [_jsx("strong", { children: "Antes:" }), " ", group.before.metadata.notes] })), group.after?.metadata?.notes && (_jsxs("p", { className: "text-sm text-gray-600", children: [_jsx("strong", { children: "Depois:" }), " ", group.after.metadata.notes] }))] }))] }, index))) })) : (
                    // Modo Lista
                    _jsx("div", { className: "space-y-3", children: photos.map((photo) => (_jsxs("div", { className: "ios-card p-4 flex items-center space-x-4 hover:shadow-lg transition-shadow", children: [_jsx("div", { className: "w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer", onClick: () => setSelectedPhoto(photo), children: _jsx("img", { src: photo.photo_url, alt: `${photo.photo_type} - ${photo.procedure_name}`, className: "w-full h-full object-cover" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("h3", { className: "font-semibold text-gray-900 truncate", children: photo.metadata?.patient_name || "Paciente" }), _jsx("p", { className: "text-sm text-gray-600 truncate", children: photo.procedure_name }), _jsxs("div", { className: "flex items-center space-x-3 mt-1", children: [_jsx("span", { className: `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${photo.photo_type === "before"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-green-100 text-green-700"}`, children: photo.photo_type === "before" ? "Antes" : "Depois" }), _jsxs("span", { className: "text-xs text-gray-500 flex items-center space-x-1", children: [_jsx(Calendar, { size: 12 }), _jsx("span", { children: photo.metadata?.procedure_date
                                                                ? `Proc: ${formatDate(photo.metadata.procedure_date)}`
                                                                : `Foto: ${formatDate(photo.metadata?.photo_date || photo.created_at)}` })] }), photo.metadata?.region && (_jsxs("span", { className: "text-xs text-gray-500 flex items-center space-x-1", children: [_jsx(MapPin, { size: 12 }), _jsx("span", { children: photo.metadata.region })] }))] })] }), _jsxs("div", { className: "flex space-x-2", children: [_jsx("button", { onClick: () => startEditing(photo), className: "p-2 text-blue-400 hover:text-blue-600 transition-colors", title: "Editar informa\u00E7\u00F5es", children: _jsx(Edit, { size: 18 }) }), _jsx("button", { onClick: () => setSelectedPhoto(photo), className: "p-2 text-gray-400 hover:text-blue-600 transition-colors", title: "Ampliar foto", children: _jsx(ZoomIn, { size: 18 }) }), _jsx("button", { onClick: () => deletePhoto(photo), className: "p-2 text-gray-400 hover:text-red-600 transition-colors", title: "Excluir foto", children: _jsx(Trash2, { size: 18 }) })] })] }, photo.id))) })), photos.length === 0 && (_jsxs("div", { className: "ios-card p-8 text-center", children: [_jsx(Camera, { className: "mx-auto mb-4 text-gray-400", size: 48 }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "Nenhuma foto encontrada" }), _jsx("p", { className: "text-gray-600 mb-6", children: selectedPatient
                                    ? `Nenhuma foto para ${selectedPatient.name}`
                                    : "Comece adicionando fotos dos seus pacientes" }), _jsx("button", { onClick: () => setShowUploadModal(true), className: "ios-button bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700", children: "Adicionar Primeira Foto" })] }))] }), showUploadModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsx("h3", { className: "text-xl font-bold text-gray-900", children: "Adicionar Foto" }), _jsx("button", { onClick: () => setShowUploadModal(false), className: "p-2 text-gray-400 hover:text-gray-600 transition-colors", children: _jsx(X, { size: 24 }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Paciente *" }), _jsxs("select", { value: uploadData.patientId, onChange: (e) => {
                                                const patientId = e.target.value;
                                                const patient = patients.find((p) => p.id === patientId);
                                                setUploadData((prev) => ({
                                                    ...prev,
                                                    patientId,
                                                    patientName: patient?.name || "",
                                                }));
                                            }, className: "ios-input", required: true, children: [_jsx("option", { value: "", children: "Selecione um paciente" }), patients.map((patient) => (_jsx("option", { value: patient.id, children: patient.name }, patient.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Procedimento *" }), _jsxs("select", { value: uploadData.procedureName, onChange: (e) => setUploadData((prev) => ({
                                                ...prev,
                                                procedureName: e.target.value,
                                            })), className: "ios-input", required: true, children: [_jsx("option", { value: "", children: "Selecione um procedimento" }), commonProcedures.map((procedure) => (_jsx("option", { value: procedure, children: procedure }, procedure)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Data do Procedimento *" }), _jsx("input", { type: "date", value: uploadData.procedureDate, onChange: (e) => setUploadData((prev) => ({
                                                ...prev,
                                                procedureDate: e.target.value,
                                            })), className: "ios-input", required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Tipo da Foto *" }), _jsxs("select", { value: uploadData.photoType, onChange: (e) => setUploadData((prev) => ({
                                                ...prev,
                                                photoType: e.target.value,
                                            })), className: "ios-input", children: [_jsx("option", { value: "before", children: "Antes" }), _jsx("option", { value: "after", children: "Depois" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Regi\u00E3o Tratada" }), _jsx("input", { type: "text", value: uploadData.region, onChange: (e) => setUploadData((prev) => ({
                                                ...prev,
                                                region: e.target.value,
                                            })), className: "ios-input", placeholder: "Ex: Testa, L\u00E1bios, Olhos..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { value: uploadData.notes, onChange: (e) => setUploadData((prev) => ({
                                                ...prev,
                                                notes: e.target.value,
                                            })), className: "ios-input h-20 resize-none", placeholder: "Observa\u00E7\u00F5es sobre a foto..." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 pt-4", children: [_jsxs("button", { onClick: () => {
                                                setActivePhotoType(uploadData.photoType);
                                                setShowCamera(true);
                                                initializeCamera();
                                            }, disabled: uploading ||
                                                !uploadData.patientId ||
                                                !uploadData.procedureName, className: "ios-button flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx(Camera, { size: 18 }), _jsx("span", { children: "Tirar Foto" })] }), _jsxs("button", { onClick: () => fileInputRef.current?.click(), disabled: uploading ||
                                                !uploadData.patientId ||
                                                !uploadData.procedureName, className: "ios-button flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx(Upload, { size: 18 }), _jsx("span", { children: "Galeria" })] })] }), _jsx("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleFileSelect, className: "hidden" })] }), uploading && (_jsxs("div", { className: "mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-center space-x-2", children: [_jsx(LoadingSpinner, { size: "sm" }), _jsx("span", { className: "text-blue-700", children: "Salvando foto..." })] }))] }) })), editingPhoto && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-2xl p-6 w-full max-w-md", children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("h3", { className: "text-xl font-bold text-gray-900", children: ["Editar", " ", editingPhoto.photo_type === "before" ? "Antes" : "Depois"] }), _jsx("button", { onClick: () => setEditingPhoto(null), className: "p-2 text-gray-400 hover:text-gray-600 transition-colors", children: _jsx(X, { size: 24 }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Data do Procedimento" }), _jsx("input", { type: "date", value: editData.procedureDate, onChange: (e) => setEditData((prev) => ({
                                                ...prev,
                                                procedureDate: e.target.value,
                                            })), className: "ios-input" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Regi\u00E3o Tratada" }), _jsx("input", { type: "text", value: editData.region, onChange: (e) => setEditData((prev) => ({ ...prev, region: e.target.value })), className: "ios-input", placeholder: "Ex: Testa, L\u00E1bios, Olhos..." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Observa\u00E7\u00F5es" }), _jsx("textarea", { value: editData.notes, onChange: (e) => setEditData((prev) => ({ ...prev, notes: e.target.value })), className: "ios-input h-20 resize-none", placeholder: "Observa\u00E7\u00F5es sobre a foto..." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 pt-4", children: [_jsxs("button", { onClick: saveEdit, disabled: uploading, className: "ios-button flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50", children: [_jsx(Save, { size: 18 }), _jsx("span", { children: "Salvar" })] }), _jsxs("button", { onClick: () => {
                                                const fileInput = editingPhoto.photo_type === "before"
                                                    ? beforeFileInputRef
                                                    : afterFileInputRef;
                                                fileInput.current?.click();
                                            }, disabled: uploading, className: "ios-button flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50", children: [_jsx(Camera, { size: 18 }), _jsx("span", { children: "Substituir Foto" })] })] })] }), uploading && (_jsxs("div", { className: "mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-center space-x-2", children: [_jsx(LoadingSpinner, { size: "sm" }), _jsx("span", { className: "text-blue-700", children: "Salvando..." })] }))] }) })), showCamera && (_jsxs("div", { className: "fixed inset-0 bg-black z-50 flex flex-col", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx("video", { ref: videoRef, autoPlay: true, playsInline: true, className: "w-full h-full object-cover" }), _jsx("canvas", { ref: canvasRef, className: "hidden" })] }), _jsx("div", { className: "p-6 bg-black bg-opacity-50", children: _jsxs("div", { className: "flex justify-center space-x-6", children: [_jsx("button", { onClick: stopCamera, className: "p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors", children: _jsx(X, { size: 24 }) }), _jsx("button", { onClick: takePhoto, className: "p-6 bg-white rounded-full hover:bg-gray-100 transition-colors", children: _jsx("div", { className: "w-12 h-12 bg-white border-4 border-gray-300 rounded-full" }) }), _jsx("button", { onClick: stopCamera, className: "p-4 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors opacity-50", children: _jsx(Camera, { size: 24 }) })] }) })] })), selectedPhoto && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "relative max-w-4xl max-h-full", children: [_jsx("img", { src: selectedPhoto.photo_url, alt: selectedPhoto.procedure_name, className: "max-w-full max-h-full object-contain rounded-lg" }), _jsxs("div", { className: "absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-lg", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h4", { className: "font-semibold", children: selectedPhoto.metadata?.patient_name || "Paciente" }), _jsx("p", { className: "text-sm opacity-80", children: selectedPhoto.procedure_name }), _jsxs("p", { className: "text-sm opacity-80 capitalize", children: [selectedPhoto.photo_type, " \u2022", " ", formatDate(selectedPhoto.metadata?.photo_date ||
                                                            selectedPhoto.created_at)] }), selectedPhoto.metadata?.procedure_date && (_jsxs("p", { className: "text-sm opacity-80", children: ["Procedimento:", " ", formatDate(selectedPhoto.metadata.procedure_date)] })), selectedPhoto.metadata?.region && (_jsx("p", { className: "text-sm opacity-80", children: selectedPhoto.metadata.region }))] }), _jsx("button", { onClick: () => setSelectedPhoto(null), className: "p-2 text-white hover:text-gray-300 transition-colors", children: _jsx(X, { size: 24 }) })] }), selectedPhoto.metadata?.notes && (_jsx("p", { className: "mt-2 text-sm opacity-80 border-t border-white border-opacity-20 pt-2", children: selectedPhoto.metadata.notes }))] })] }) }))] }));
};
export default GalleryScreen;
