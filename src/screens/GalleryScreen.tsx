import React, { useState, useRef, useEffect } from "react";
import {
  Camera,
  Upload,
  Filter,
  Grid,
  List,
  Search,
  Plus,
  X,
  User,
  Scissors,
  Calendar,
  MapPin,
  Edit,
  Trash2,
  ZoomIn,
  Save,
  ArrowLeft,
} from "lucide-react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
//import BottomNavigation from "../components/BottomNavigation";
import LoadingSpinner from "../components/LoadingSpinner";
import ResponsiveAppLayout from "../components/Layout/ResponsiveAppLayout";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase/client";
import { 
  listPatientPhotos, 
  uploadPatientPhoto, 
  deletePatientPhoto,
  updatePhotoMetadata,
  type PatientPhoto 
} from "../services/gallery/galleryLegacyService";
import ImagePicker from "../components/gallery/ImagePicker";

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface Photo {
  id: string;
  patient_id: string;
  procedure_name: string;
  photo_type: "before" | "after";
  photo_url: string;
  metadata: {
    patient_name?: string;
    region?: string;
    notes?: string;
    procedure_date?: string;
    photo_date?: string;
  };
  created_at: string;
}

const GalleryScreen: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const patientIdFromQuery = searchParams.get('patientId');
  const navigate = useNavigate();

  /** Modo paciente: Galeria acessada pelo perfil/prontuário (/patients/:id/gallery). Listagem e upload filtrados por patient_id; sem select/filtro de paciente. */
  const isPatientMode = Boolean(patientId);
  const currentPatientId = patientId || patientIdFromQuery;
  const isPatientScoped = isPatientMode;
  const isPatientExclusiveMode = isPatientMode;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  // Estados
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [filterType, setFilterType] = useState<"all" | "before" | "after">(
    "all"
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [dateFilter, setDateFilter] = useState("");

  // Modais e câmera
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [activePhotoType, setActivePhotoType] = useState<"before" | "after">(
    "before"
  );

  // Dados do upload
  const [uploadData, setUploadData] = useState({
    patientId: "",
    patientName: "",
    procedureName: "",
    procedureDate: new Date().toISOString().split("T")[0],
    photoType: "before" as "before" | "after",
    region: "",
    notes: "",
  });
  /** Arquivo selecionado no modal Adicionar Foto (ImagePicker); enviado ao clicar Enviar foto */
  const [selectedFileForUpload, setSelectedFileForUpload] = useState<File | null>(null);

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
  }, [currentPatientId]);

  // Quando pacientes carregarem e houver patientId, selecionar automaticamente
  useEffect(() => {
    if (currentPatientId && patients.length > 0) {
      const patient = patients.find(p => p.id === currentPatientId);
      if (patient) {
        setCurrentPatient(patient);
        setSelectedPatient(patient);
        setSearchTerm(patient.name);
        // No modo exclusivo, pré-preencher o uploadData
        if (isPatientScoped) {
          setUploadData(prev => ({
            ...prev,
            patientId: patient.id,
            patientName: patient.name,
          }));
        }
      }
    }
  }, [currentPatientId, patients, isPatientMode]);

  // Recarregar fotos quando filtros mudarem (modo paciente exige currentPatientId; modo global carrega todas ou filtradas)
  useEffect(() => {
    if (loading) return;
    if (isPatientMode && !currentPatientId) return;
    loadPhotos();
  }, [currentPatientId, selectedPatient, filterType, dateFilter, loading, isPatientMode]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // No modo paciente, carregar apenas esse paciente
      if (isPatientMode && currentPatientId) {
        await loadSinglePatient(currentPatientId);
        await loadPhotos();
      } else {
        // Modo normal: carregar todos os pacientes
        await loadPatients();
        
        // Se houver patientId na query, selecionar automaticamente
        if (currentPatientId) {
          const patient = patients.find(p => p.id === currentPatientId);
          if (patient) {
            setSelectedPatient(patient);
            setCurrentPatient(patient);
            setSearchTerm(patient.name);
          }
        }
        
        await loadPhotos();
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da galeria");
    } finally {
      setLoading(false);
    }
  };

  const loadSinglePatient = async (patientId: string) => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name, phone, email")
        .eq("id", patientId)
        .single();

      if (error) throw error;
      
      if (data) {
        setCurrentPatient(data);
        setSelectedPatient(data);
        setPatients([data]);
      }
    } catch (error) {
      console.error("Erro ao carregar paciente:", error);
      throw error;
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name, phone, email")
        .order("name");

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
      throw error;
    }
  };

  const loadPhotos = async () => {
    try {
      // No modo paciente, usar o serviço específico (sempre filtrado por patient_id)
      if (isPatientMode && currentPatientId) {
        const patientPhotos = await listPatientPhotos(currentPatientId);
        
        // Aplicar filtro de tipo se necessário
        let filtered = patientPhotos;
        if (filterType !== "all") {
          filtered = patientPhotos.filter(p => p.photo_type === filterType);
        }
        
        setPhotos(filtered);
        return;
      }

      // Modo normal: usar query direta
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

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
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
    const filtered = patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(term) ||
        patient.phone.includes(term) ||
        patient.email?.toLowerCase().includes(term)
    );
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
    } catch (error) {
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

        canvasRef.current.toBlob(
          async (blob) => {
            if (blob) {
              await handlePhotoUpload(blob);
            }
          },
          "image/jpeg",
          0.8
        );
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
  const handlePhotoUpload = async (
    fileBlob: Blob,
    photoType?: "before" | "after",
    groupData?: {
      patientId: string;
      procedureName: string;
      procedureDate: string;
      region: string;
      notes: string;
    }
  ) => {
    const targetPhotoType = photoType || uploadData.photoType;

    // Se temos groupData (para foto "depois"), usamos esses dados
    // Caso contrário, validamos os dados do upload normal
    const useGroupData = !!groupData;
    const uploadInfo = useGroupData ? groupData : uploadData;

    // Quando isPatientScoped, patient_id vem da rota; senão do form
    const finalPatientId = isPatientMode && currentPatientId ? currentPatientId : uploadInfo.patientId;

    if (!finalPatientId || !uploadInfo.procedureName) {
      toast.error(isPatientScoped ? "Selecione o procedimento" : "Selecione o paciente e procedimento");
      return;
    }

    setUploading(true);
    try {
      const patient = currentPatient || patients.find((p) => p.id === finalPatientId);

      if (!patient) {
        throw new Error("Paciente não encontrado");
      }

      // Usar o novo serviço de galeria que já gerencia o path por paciente
      const file = fileBlob instanceof File ? fileBlob : new File([fileBlob], 'photo.jpg', { type: 'image/jpeg' });
      
      await uploadPatientPhoto({
        patientId: finalPatientId,
        file,
        procedureName: uploadInfo.procedureName,
        photoType: targetPhotoType,
        procedureDate: uploadInfo.procedureDate,
        region: uploadInfo.region,
        notes: uploadInfo.notes,
        patientName: patient.name,
      });

      toast.success(
        `Foto ${
          targetPhotoType === "before" ? "antes" : "depois"
        } salva com sucesso!`
      );

      // Só limpa o modal se for um upload normal (não de grupo existente)
      if (!useGroupData && !photoType) {
        setShowUploadModal(false);
        setShowCamera(false);
        setSelectedFileForUpload(null);
        // No modo scoped, manter patientId preenchido
        if (isPatientScoped && currentPatient) {
          setUploadData({
            patientId: currentPatient.id,
            patientName: currentPatient.name,
            procedureName: "",
            procedureDate: new Date().toISOString().split("T")[0],
            photoType: "before",
            region: "",
            notes: "",
          });
        } else {
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
      }

      // Recarregar fotos
      await loadPhotos();
    } catch (error) {
      console.error("Erro ao salvar foto:", error);
      toast.error("Erro ao salvar foto");
    } finally {
      setUploading(false);
    }
  };

  // Atualizar foto existente
  const updatePhoto = async (photo: Photo, fileBlob: Blob) => {
    setUploading(true);
    try {
      // Upload para o Supabase Storage
      const fileExt = "jpg";
      const fileName = `${photo.patient_id}_${photo.procedure_name.replace(
        /\s+/g,
        "_"
      )}_${photo.photo_type}_${Date.now()}.${fileExt}`;
      const filePath = `patient-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("patient_photos")
        .upload(filePath, fileBlob);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("patient_photos").getPublicUrl(filePath);

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

      if (dbError) throw dbError;

      toast.success("Foto atualizada com sucesso!");
      setEditingPhoto(null);
      setEditData({
        procedureDate: "",
        region: "",
        notes: "",
      });

      // Recarregar fotos
      await loadPhotos();
    } catch (error) {
      console.error("Erro ao atualizar foto:", error);
      toast.error("Erro ao atualizar foto");
    } finally {
      setUploading(false);
    }
  };

  // Selecionar arquivo para substituir foto existente
  const handleReplacePhoto = (
    event: React.ChangeEvent<HTMLInputElement>,
    photo: Photo
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      updatePhoto(photo, file);
    }
  };

  // Iniciar edição de foto
  const startEditing = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditData({
      procedureDate:
        photo.metadata?.procedure_date ||
        new Date().toISOString().split("T")[0],
      region: photo.metadata?.region || "",
      notes: photo.metadata?.notes || "",
    });
  };

  // Salvar edição (sem alterar a foto)
  const saveEdit = async () => {
    if (!editingPhoto) return;

    setUploading(true);
    try {
      await updatePhotoMetadata(editingPhoto.id, {
        ...editingPhoto.metadata,
        region: editData.region,
        notes: editData.notes,
        procedure_date: editData.procedureDate,
      });

      toast.success("Informações atualizadas com sucesso!");
      setEditingPhoto(null);
      setEditData({
        procedureDate: "",
        region: "",
        notes: "",
      });

      await loadPhotos();
    } catch (error) {
      console.error("Erro ao atualizar informações:", error);
      toast.error("Erro ao atualizar informações");
    } finally {
      setUploading(false);
    }
  };

  // Deletar foto
  const deletePhoto = async (photo: Photo) => {
    if (!confirm("Tem certeza que deseja excluir esta foto?")) return;

    try {
      // Usar o novo serviço que gerencia storage e banco
      await deletePatientPhoto(photo.id);

      toast.success("Foto excluída com sucesso!");
      await loadPhotos();
    } catch (error) {
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
    } else {
      acc[key].after = photo;
    }

    // Manter a data do procedimento mais recente
    if (photo.metadata?.procedure_date) {
      acc[key].procedureDate = photo.metadata.procedure_date;
    }

    return acc;
  }, {} as Record<string, any>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Estatísticas
  const stats = {
    total: photos.length,
    before: photos.filter((p) => p.photo_type === "before").length,
    after: photos.filter((p) => p.photo_type === "after").length,
    patients: new Set(photos.map((p) => p.patient_id)).size,
  };

  const galleryTitle = isPatientExclusiveMode
    ? `Galeria do Paciente${currentPatient ? ` - ${currentPatient.name}` : ""}`
    : "Galeria de Fotos";

  const openUploadModal = () => {
    setSelectedFileForUpload(null);
    if (isPatientMode && currentPatientId) {
      setUploadData(prev => ({
        ...prev,
        patientId: currentPatientId,
        patientName: currentPatient?.name ?? "",
      }));
    }
    setShowUploadModal(true);
  };

  /** Abre o seletor nativo de arquivos (Galeria do Paciente). */
  const handleClickUpload = () => {
    fileInputRef.current?.click();
  };

  /** Upload automático após seleção no input file real (modo paciente). */
  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (!currentPatientId || !currentPatient) {
      toast.error("Paciente não encontrado");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const procedureDate = new Date().toISOString().split("T")[0];
    try {
      for (const file of Array.from(files)) {
        await uploadPatientPhoto({
          patientId: currentPatientId,
          file,
          procedureName: "Foto",
          photoType: "before",
          procedureDate,
          patientName: currentPatient.name,
        });
      }
      toast.success(files.length > 1 ? "Fotos enviadas com sucesso!" : "Foto enviada com sucesso!");
      await loadPhotos();
    } catch (err) {
      console.error("Erro ao enviar foto(s):", err);
      toast.error("Erro ao enviar foto(s)");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) {
    if (isPatientScoped) {
      return (
        <ResponsiveAppLayout title={galleryTitle} showBack={true}>
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" className="text-blue-500" />
          </div>
        </ResponsiveAppLayout>
      );
    }
    return (
      <div className="min-h-dvh bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Layout idêntico ao Dashboard (AppLayout + glass-card + space-y-8) quando dentro do paciente
  if (isPatientScoped) {
    return (
      <ResponsiveAppLayout title={galleryTitle} showBack={true}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          hidden
          onChange={handleUploadFiles}
        />
        <div className="space-y-8">
          {/* Seção de boas-vindas — mesmo padrão do Dashboard (Welcome Section) */}
          <div className="glass-card p-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30">
                    <Camera className="text-blue-300" size={28} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold glow-text mb-2">Galeria do Paciente</h2>
                    <p className="text-gray-300 text-lg">
                      Fotos antes/depois de <span className="text-cyan-400 font-semibold">{currentPatient?.name}</span>
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClickUpload}
                disabled={uploading}
                className="neon-button group relative overflow-hidden flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Plus size={24} className="relative z-10" />
                <span className="relative z-10 font-semibold">+ Adicionar Foto</span>
              </button>
            </div>
          </div>

          {/* Stats Grid — modo paciente: apenas Total Fotos / Fotos Antes / Fotos Depois (sem "Pacientes") */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { title: "Total Fotos", value: stats.total, iconClass: "bg-blue-500/20 border-blue-400/30", textClass: "text-blue-300", barClass: "bg-blue-500" },
              { title: "Fotos Antes", value: stats.before, iconClass: "bg-cyan-500/20 border-cyan-400/30", textClass: "text-cyan-300", barClass: "bg-cyan-500" },
              { title: "Fotos Depois", value: stats.after, iconClass: "bg-purple-500/20 border-purple-400/30", textClass: "text-purple-300", barClass: "bg-purple-500" },
            ].map((stat, index) => (
              <div key={index} className="glass-card p-6 hover-lift group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
                    <p className="text-gray-400 text-sm">{stat.title}</p>
                  </div>
                  <div className={`p-3 rounded-2xl border group-hover:scale-110 transition-transform duration-300 ${stat.iconClass}`}>
                    <Camera size={28} className={stat.textClass} />
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-1000 ${stat.barClass}`}
                    style={{ width: `${Math.min(100, (Number(stat.value) / 20) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Filtros e contexto — mesmo padrão do Dashboard (glass-card p-8) */}
          <div className="glass-card p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div>
                <h3 className="text-2xl font-bold glow-text mb-2">Fotos</h3>
                <p className="text-gray-400">Filtros e visualização</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1 bg-white/5 rounded-xl p-1 border border-white/10">
                  {(["all", "before", "after"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterType === type
                          ? "bg-cyan-500/30 text-white border border-cyan-400/50"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      {type === "all" ? "Todas" : type === "before" ? "Antes" : "Depois"}
                    </button>
                  ))}
                </div>
                <div className="flex space-x-1 bg-white/5 rounded-xl p-1 border border-white/10">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-cyan-500/30 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    <Grid size={18} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-cyan-500/30 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-2xl bg-cyan-500/20 border border-cyan-400/30">
                  <User className="text-cyan-300" size={20} />
                </div>
                <div>
                  <div className="font-semibold text-white">{currentPatient?.name}</div>
                  <div className="text-sm text-gray-400">{photos.length} foto{photos.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid/Lista de fotos — mesmo padrão de cards do Dashboard */}
          {viewMode === "grid" ? (
            <div className="space-y-6">
              {Object.values(groupedPhotos).map((group: any, index) => (
                <div key={index} className="glass-card p-6 hover-lift border border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white">{group.patient.name}</h3>
                      <p className="text-gray-400 flex items-center space-x-2 mt-1">
                        <Scissors size={16} />
                        <span>{group.procedure}</span>
                      </p>
                      {group.procedureDate && (
                        <p className="text-sm text-gray-500 flex items-center space-x-2 mt-1">
                          <Calendar size={14} />
                          <span>Procedimento: {formatDate(group.procedureDate)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[group.before, group.after].map((photo, i) => (
                      <div key={i} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                            photo?.photo_type === "before" ? "bg-cyan-500/20 text-cyan-300" : "bg-purple-500/20 text-purple-300"
                          }`}>
                            {photo?.photo_type === "before" ? "Antes" : "Depois"}
                          </span>
                          {photo && (
                            <div className="flex space-x-1">
                              <button onClick={() => photo && startEditing(photo)} className="p-1 text-cyan-400 hover:text-white" title="Editar"><Edit size={16} /></button>
                              <button onClick={() => photo && deletePhoto(photo)} className="p-1 text-red-400 hover:text-white" title="Excluir"><Trash2 size={16} /></button>
                            </div>
                          )}
                        </div>
                        {photo ? (
                          <div
                            className="aspect-[4/3] rounded-xl overflow-hidden border border-white/10 cursor-pointer hover:border-cyan-500/50 transition-colors"
                            onClick={() => setSelectedPhoto(photo)}
                          >
                            <img src={photo.photo_url} alt={photo.photo_type} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-gray-500">
                            <Camera size={32} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {photos.map((photo) => (
                <div key={photo.id} className="glass-card p-4 flex items-center space-x-4 border border-white/10 hover-lift">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer border border-white/10" onClick={() => setSelectedPhoto(photo)}>
                    <img src={photo.photo_url} alt={photo.procedure_name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{photo.procedure_name}</h3>
                    <p className="text-sm text-gray-400 capitalize">{photo.photo_type}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => startEditing(photo)} className="p-2 text-cyan-400 hover:text-white rounded-lg hover:bg-white/10"><Edit size={18} /></button>
                    <button onClick={() => setSelectedPhoto(photo)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"><ZoomIn size={18} /></button>
                    <button onClick={() => deletePhoto(photo)} className="p-2 text-red-400 hover:text-white rounded-lg hover:bg-white/10"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {photos.length === 0 && (
            <div className="glass-card p-12 text-center border border-white/10">
              <Camera className="mx-auto mb-4 text-gray-400" size={48} />
              <h3 className="text-2xl font-bold glow-text mb-2">Nenhuma foto cadastrada</h3>
              <p className="text-gray-400 mb-6">Adicione fotos antes/depois do paciente</p>
              <button
                type="button"
                onClick={handleClickUpload}
                disabled={uploading}
                className="neon-button inline-flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
                <span>+ Adicionar Foto</span>
              </button>
            </div>
          )}
        </div>
      </ResponsiveAppLayout>
    );
  }

  // Galeria global (fora do paciente) — mesmo padrão Dashboard (AppLayout + glass-card)
  return (
    <>
    {!isPatientMode && (
    <ResponsiveAppLayout title={galleryTitle}>
      <div className="space-y-8">
        {/* Header + CTA — padrão Dashboard */}
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30">
                  <Camera className="text-blue-300" size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold glow-text mb-2">Galeria de Fotos</h2>
                  <p className="text-gray-300 text-lg">Fotos antes/depois de todos os pacientes</p>
                </div>
              </div>
            </div>
            <button onClick={openUploadModal} className="neon-button group relative overflow-hidden flex items-center space-x-2">
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus size={24} className="relative z-10" />
              <span className="relative z-10 font-semibold">Adicionar Foto</span>
            </button>
          </div>
        </div>

        {/* Stats — glass-card (modo global pode mostrar Pacientes) */}
        <div className="grid-dashboard">
          {[
            { title: "Total Fotos", value: stats.total, iconClass: "bg-blue-500/20 border-blue-400/30", textClass: "text-blue-300", barClass: "bg-blue-500" },
            { title: "Fotos Antes", value: stats.before, iconClass: "bg-cyan-500/20 border-cyan-400/30", textClass: "text-cyan-300", barClass: "bg-cyan-500" },
            { title: "Fotos Depois", value: stats.after, iconClass: "bg-purple-500/20 border-purple-400/30", textClass: "text-purple-300", barClass: "bg-purple-500" },
            { title: "Pacientes", value: stats.patients, iconClass: "bg-green-500/20 border-green-400/30", textClass: "text-green-300", barClass: "bg-green-500" },
          ].map((stat, index) => (
            <div key={index} className="glass-card p-6 hover-lift group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-white mb-2">{stat.value}</p>
                  <p className="text-gray-400 text-sm">{stat.title}</p>
                </div>
                <div className={`p-3 rounded-2xl border group-hover:scale-110 transition-transform duration-300 ${stat.iconClass}`}>
                  <Camera size={28} className={stat.textClass} />
                </div>
              </div>
              <div className="mt-4 w-full bg-gray-700 rounded-full h-2">
                <div className={`h-2 rounded-full transition-all duration-1000 ${stat.barClass}`} style={{ width: `${Math.min(100, (Number(stat.value) / 50) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Filtros e Busca */}
        <div className="glass-card p-8 space-y-4 border border-white/10">
          {/* Busca de Pacientes — só no modo global */}
          {!isPatientMode && (
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar paciente por nome, telefone ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 transition-all"
              />
              {filteredPatients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 rounded-xl bg-gray-900/95 border border-white/10 max-h-60 overflow-y-auto shadow-xl">
                  {filteredPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => { setSelectedPatient(patient); setSearchTerm(patient.name); setFilteredPatients([]); }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 border-b border-white/10 last:border-b-0 flex items-center space-x-3 text-white"
                    >
                      <User className="text-cyan-400" size={18} />
                      <div>
                        <div className="font-medium">{patient.name}</div>
                        <div className="text-sm text-gray-400">{patient.phone}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <div className="flex space-x-1 bg-white/5 rounded-xl p-1 border border-white/10">
              {(["all", "before", "after"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterType === type ? "bg-cyan-500/30 text-white border border-cyan-400/50" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {type === "all" ? "Todas" : type === "before" ? "Antes" : "Depois"}
                </button>
              ))}
            </div>
            <div className="flex space-x-1 bg-white/5 rounded-xl p-1 border border-white/10 ml-auto">
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-cyan-500/30 text-white" : "text-gray-400 hover:text-white"}`}>
                <Grid size={18} />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-cyan-500/30 text-white" : "text-gray-400 hover:text-white"}`}>
                <List size={18} />
              </button>
            </div>
          </div>

          {selectedPatient && (
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
              <div className="flex items-center space-x-3">
                <User className="text-cyan-300" size={20} />
                <div>
                  <div className="font-semibold text-white">{selectedPatient.name}</div>
                  <div className="text-sm text-gray-400">{photos.length} foto{photos.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
              <button onClick={() => { setSelectedPatient(null); setSearchTerm(""); }} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Galeria */}
        {viewMode === "grid" ? (
          <div className="space-y-6">
            {Object.values(groupedPhotos).map((group: any, index) => (
              <div key={index} className="glass-card p-6 border border-white/10 hover-lift">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {group.patient.name}
                    </h3>
                    <p className="text-gray-400 flex items-center space-x-2 mt-1">
                      <Scissors size={16} />
                      <span>{group.procedure}</span>
                    </p>
                    {group.procedureDate && (
                      <p className="text-sm text-gray-500 flex items-center space-x-2 mt-1">
                        <Calendar size={14} />
                        <span>
                          Procedimento: {formatDate(group.procedureDate)}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Foto Antes */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                        Antes
                      </span>
                      <div className="flex space-x-1">
                        {group.before && (
                          <>
                            <button
                              onClick={() => startEditing(group.before)}
                              className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                              title="Editar informações"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deletePhoto(group.before)}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors"
                              title="Excluir foto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {group.before ? (
                      <div className="relative">
                        <div
                          className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                          onClick={() => setSelectedPhoto(group.before)}
                        >
                          <img
                            src={group.before.photo_url}
                            alt="Antes"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Botão para substituir foto */}
                        <div className="absolute top-2 right-2">
                          <input
                            ref={beforeFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleReplacePhoto(e, group.before)
                            }
                            className="hidden"
                          />
                          <button
                            onClick={() => beforeFileInputRef.current?.click()}
                            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                            title="Substituir foto"
                          >
                            <Camera size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 hover:border-blue-300 transition-colors">
                        <input
                          ref={beforeFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (
                              file &&
                              uploadData.patientId &&
                              uploadData.procedureName
                            ) {
                              handlePhotoUpload(file, "before");
                            } else {
                              toast.error(
                                "Selecione primeiro o paciente e procedimento"
                              );
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          onClick={() => beforeFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center w-full h-full"
                        >
                          <Camera size={32} />
                          <span className="mt-2 text-sm">
                            Adicionar foto Antes
                          </span>
                        </button>
                      </div>
                    )}

                    {group.before && group.before.metadata && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar size={14} />
                          <span>
                            Foto:{" "}
                            {formatDate(
                              group.before.metadata.photo_date ||
                                group.before.created_at
                            )}
                          </span>
                        </div>
                        {group.before.metadata.region && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <MapPin size={14} />
                            <span>{group.before.metadata.region}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Foto Depois */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                        Depois
                      </span>
                      <div className="flex space-x-1">
                        {group.after && (
                          <>
                            <button
                              onClick={() => startEditing(group.after)}
                              className="p-1 text-blue-400 hover:text-blue-600 transition-colors"
                              title="Editar informações"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => deletePhoto(group.after)}
                              className="p-1 text-red-400 hover:text-red-600 transition-colors"
                              title="Excluir foto"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {group.after ? (
                      <div className="relative">
                        <div
                          className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                          onClick={() => setSelectedPhoto(group.after)}
                        >
                          <img
                            src={group.after.photo_url}
                            alt="Depois"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {/* Botão para substituir foto */}
                        <div className="absolute top-2 right-2">
                          <input
                            ref={afterFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleReplacePhoto(e, group.after)}
                            className="hidden"
                          />
                          <button
                            onClick={() => afterFileInputRef.current?.click()}
                            className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                            title="Substituir foto"
                          >
                            <Camera size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-[4/3] bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 hover:border-green-300 transition-colors">
                        <input
                          ref={afterFileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Para foto "depois", usamos os dados do grupo existente
                              handlePhotoUpload(file, "after", {
                                patientId: group.patient.id,
                                procedureName: group.procedure,
                                procedureDate:
                                  group.procedureDate ||
                                  new Date().toISOString().split("T")[0],
                                region: group.before?.metadata?.region || "",
                                notes: group.before?.metadata?.notes || "",
                              });
                            }
                          }}
                          className="hidden"
                        />
                        <button
                          onClick={() => afterFileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center w-full h-full"
                        >
                          <Camera size={32} />
                          <span className="mt-2 text-sm">
                            Adicionar foto Depois
                          </span>
                        </button>
                      </div>
                    )}

                    {group.after && group.after.metadata && (
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <Calendar size={14} />
                          <span>
                            Foto:{" "}
                            {formatDate(
                              group.after.metadata.photo_date ||
                                group.after.created_at
                            )}
                          </span>
                        </div>
                        {group.after.metadata.region && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <MapPin size={14} />
                            <span>{group.after.metadata.region}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Notas */}
                {(group.before?.metadata?.notes ||
                  group.after?.metadata?.notes) && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Observações
                    </h4>
                    {group.before?.metadata?.notes && (
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Antes:</strong> {group.before.metadata.notes}
                      </p>
                    )}
                    {group.after?.metadata?.notes && (
                      <p className="text-sm text-gray-600">
                        <strong>Depois:</strong> {group.after.metadata.notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          // Modo Lista
          <div className="space-y-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="glass-card p-4 flex items-center space-x-4 border border-white/10 hover-lift"
              >
                <div
                  className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <img
                    src={photo.photo_url}
                    alt={`${photo.photo_type} - ${photo.procedure_name}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {photo.metadata?.patient_name || "Paciente"}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {photo.procedure_name}
                  </p>
                  <div className="flex items-center space-x-3 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        photo.photo_type === "before"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {photo.photo_type === "before" ? "Antes" : "Depois"}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center space-x-1">
                      <Calendar size={12} />
                      <span>
                        {photo.metadata?.procedure_date
                          ? `Proc: ${formatDate(photo.metadata.procedure_date)}`
                          : `Foto: ${formatDate(
                              photo.metadata?.photo_date || photo.created_at
                            )}`}
                      </span>
                    </span>
                    {photo.metadata?.region && (
                      <span className="text-xs text-gray-500 flex items-center space-x-1">
                        <MapPin size={12} />
                        <span>{photo.metadata.region}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => startEditing(photo)}
                    className="p-2 text-blue-400 hover:text-blue-600 transition-colors"
                    title="Editar informações"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => setSelectedPhoto(photo)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Ampliar foto"
                  >
                    <ZoomIn size={18} />
                  </button>
                  <button
                    onClick={() => deletePhoto(photo)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Excluir foto"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <div className="glass-card p-8 text-center border border-white/10">
            <Camera className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-2xl font-bold glow-text mb-2">Nenhuma foto cadastrada</h3>
            <p className="text-gray-400 mb-6">
              {selectedPatient
                ? `Nenhuma foto para ${selectedPatient.name}`
                : "Comece adicionando fotos dos seus pacientes"}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="neon-button inline-flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Adicionar Foto</span>
            </button>
          </div>
        )}
      </div>
    </ResponsiveAppLayout>
    )}

      {/* Modal de Upload — compartilhado; sempre padrão Dashboard (glass-card) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card border border-white/10 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto text-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold glow-text">Adicionar Foto</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Paciente * — só no modo global; no modo paciente não aparece */}
              {!isPatientMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Paciente *</label>
                  <select
                    value={uploadData.patientId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      const patient = patients.find((p) => p.id === pid);
                      setUploadData((prev) => ({ ...prev, patientId: pid, patientName: patient?.name || "" }));
                    }}
                    className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
                    required
                  >
                    <option value="">Selecione um paciente</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Procedimento */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Procedimento *</label>
                <select
                  value={uploadData.procedureName}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, procedureName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
                  required
                >
                  <option value="">Selecione um procedimento</option>
                  {commonProcedures.map((proc) => (
                    <option key={proc} value={proc}>{proc}</option>
                  ))}
                </select>
              </div>

              {/* Data do procedimento */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Data do procedimento *</label>
                <input
                  type="date"
                  value={uploadData.procedureDate}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, procedureDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 [color-scheme:dark]"
                  required
                />
              </div>

              {/* Tipo da foto (Antes/Depois) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tipo da foto *</label>
                <select
                  value={uploadData.photoType}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, photoType: e.target.value as "before" | "after" }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
                >
                  <option value="before">Antes</option>
                  <option value="after">Depois</option>
                </select>
              </div>

              {/* Região tratada */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Região tratada</label>
                <input
                  type="text"
                  value={uploadData.region}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, region: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30"
                  placeholder="Ex: Testa, Lábios, Olhos..."
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                <textarea
                  value={uploadData.notes}
                  onChange={(e) => setUploadData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/30 h-20 resize-none"
                  placeholder="Observações sobre a foto..."
                />
              </div>

              {/* Upload: ImagePicker (selecionar / tirar foto / drag & drop) */}
              <ImagePicker
                label="Foto *"
                value={selectedFileForUpload}
                onChange={setSelectedFileForUpload}
                disabled={uploading}
              />

              {/* Enviar foto — desabilitado sem arquivo ou sem dados obrigatórios */}
              <div className="pt-2 space-y-2">
                {!selectedFileForUpload && (
                  <p className="text-sm text-gray-400">Selecione uma foto (galeria, câmera ou arraste aqui) para continuar.</p>
                )}
                <button
                  type="button"
                  onClick={() => selectedFileForUpload && handlePhotoUpload(selectedFileForUpload)}
                  disabled={
                    uploading ||
                    !selectedFileForUpload ||
                    (isPatientMode ? !uploadData.procedureName : (!uploadData.patientId || !uploadData.procedureName))
                  }
                  className="neon-button w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={18} />
                  <span>Enviar foto</span>
                </button>
              </div>
            </div>

            {uploading && (
              <div className="mt-4 p-3 rounded-lg flex items-center justify-center space-x-2 bg-white/10 text-cyan-300">
                <LoadingSpinner size="sm" />
                <span>Salvando foto...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição — padrão Dashboard (glass-card) */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card border border-white/10 rounded-2xl p-6 w-full max-w-md text-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold glow-text">
                Editar {editingPhoto.photo_type === "before" ? "Antes" : "Depois"}
              </h3>
              <button onClick={() => setEditingPhoto(null)} className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10">
                <X size={24} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Data do Procedimento</label>
                <input
                  type="date"
                  value={editData.procedureDate}
                  onChange={(e) => setEditData((prev) => ({ ...prev, procedureDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Região Tratada</label>
                <input
                  type="text"
                  value={editData.region}
                  onChange={(e) => setEditData((prev) => ({ ...prev, region: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-500"
                  placeholder="Ex: Testa, Lábios, Olhos..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-500 h-20 resize-none"
                  placeholder="Observações..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button onClick={saveEdit} disabled={uploading} className="neon-button flex items-center justify-center space-x-2 disabled:opacity-50">
                  <Save size={18} />
                  <span>Salvar</span>
                </button>
                <button
                  onClick={() => {
                    const fileInput = editingPhoto.photo_type === "before" ? beforeFileInputRef : afterFileInputRef;
                    fileInput.current?.click();
                  }}
                  disabled={uploading}
                  className="neon-button flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Camera size={18} />
                  <span>Substituir Foto</span>
                </button>
              </div>
            </div>
            {uploading && (
              <div className="mt-4 p-3 rounded-lg flex items-center justify-center space-x-2 bg-white/10 text-cyan-300">
                <LoadingSpinner size="sm" />
                <span>Salvando...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Câmera */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="p-6 bg-black bg-opacity-50">
            <div className="flex justify-center space-x-6">
              <button
                onClick={stopCamera}
                className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X size={24} />
              </button>
              <button
                onClick={takePhoto}
                className="p-6 bg-white rounded-full hover:bg-gray-100 transition-colors"
              >
                <div className="w-12 h-12 bg-white border-4 border-gray-300 rounded-full" />
              </button>
              <button
                onClick={stopCamera}
                className="p-4 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition-colors opacity-50"
              >
                <Camera size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={selectedPhoto.photo_url}
              alt={selectedPhoto.procedure_name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">
                    {selectedPhoto.metadata?.patient_name || "Paciente"}
                  </h4>
                  <p className="text-sm opacity-80">
                    {selectedPhoto.procedure_name}
                  </p>
                  <p className="text-sm opacity-80 capitalize">
                    {selectedPhoto.photo_type} •{" "}
                    {formatDate(
                      selectedPhoto.metadata?.photo_date ||
                        selectedPhoto.created_at
                    )}
                  </p>
                  {selectedPhoto.metadata?.procedure_date && (
                    <p className="text-sm opacity-80">
                      Procedimento:{" "}
                      {formatDate(selectedPhoto.metadata.procedure_date)}
                    </p>
                  )}
                  {selectedPhoto.metadata?.region && (
                    <p className="text-sm opacity-80">
                      {selectedPhoto.metadata.region}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 text-white hover:text-gray-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              {selectedPhoto.metadata?.notes && (
                <p className="mt-2 text-sm opacity-80 border-t border-white border-opacity-20 pt-2">
                  {selectedPhoto.metadata.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default GalleryScreen;
