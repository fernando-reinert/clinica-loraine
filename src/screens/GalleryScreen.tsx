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
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Header from "../components/Header";
//import BottomNavigation from "../components/BottomNavigation";
import LoadingSpinner from "../components/LoadingSpinner";
import toast from "react-hot-toast";
import { supabase } from "../services/supabase/client";

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
  const [searchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get('patientId');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  // Estados
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
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

  // Quando pacientes carregarem e houver patientId na URL, selecionar automaticamente
  useEffect(() => {
    if (patientIdFromUrl && patients.length > 0 && !selectedPatient) {
      const patient = patients.find(p => p.id === patientIdFromUrl);
      if (patient) {
        setSelectedPatient(patient);
        setSearchTerm(patient.name);
      }
    }
  }, [patientIdFromUrl, patients, selectedPatient]);

  // Recarregar fotos quando filtros mudarem
  useEffect(() => {
    if (!loading) {
      loadPhotos();
    }
  }, [selectedPatient, filterType, dateFilter]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await loadPatients();
      
      // Se houver patientId na URL, selecionar automaticamente
      if (patientIdFromUrl) {
        const patient = patients.find(p => p.id === patientIdFromUrl);
        if (patient) {
          setSelectedPatient(patient);
          setSearchTerm(patient.name);
        }
      }
      
      await loadPhotos();
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da galeria");
    } finally {
      setLoading(false);
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
      const fileName = `${patient.id}_${uploadInfo.procedureName.replace(
        /\s+/g,
        "_"
      )}_${targetPhotoType}_${Date.now()}.${fileExt}`;
      const filePath = `patient-photos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("patient_photos")
        .upload(filePath, fileBlob);

      if (uploadError) throw uploadError;

      // Obter URL pública
      const {
        data: { publicUrl },
      } = supabase.storage.from("patient_photos").getPublicUrl(filePath);

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

      if (dbError) throw dbError;

      toast.success(
        `Foto ${
          targetPhotoType === "before" ? "antes" : "depois"
        } salva com sucesso!`
      );

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

  // Selecionar arquivo da galeria para upload novo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
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

      if (error) throw error;

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
      // Extrair caminho do arquivo da URL
      const filePath = photo.photo_url.split("/").pop();

      if (filePath) {
        // Deletar do storage
        const { error: storageError } = await supabase.storage
          .from("patient_photos")
          .remove([`patient-photos/${filePath}`]);

        if (storageError) throw storageError;
      }

      // Deletar do banco
      const { error: dbError } = await supabase
        .from("photos")
        .delete()
        .eq("id", photo.id);

      if (dbError) throw dbError;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20">
      <Header
        title="Galeria de Fotos"
        rightAction={
          <button
            onClick={() => setShowUploadModal(true)}
            className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full text-white shadow-lg hover:shadow-xl transition-all active:scale-95"
          >
            <Plus size={20} />
          </button>
        }
      />

      <div className="p-4 space-y-6">
        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="ios-card p-4 text-center bg-gradient-to-br from-white to-blue-50">
            <div className="text-2xl font-bold text-blue-600">
              {stats.total}
            </div>
            <div className="text-sm text-gray-600">Total Fotos</div>
          </div>
          <div className="ios-card p-4 text-center bg-gradient-to-br from-white to-green-50">
            <div className="text-2xl font-bold text-green-600">
              {stats.before}
            </div>
            <div className="text-sm text-gray-600">Fotos Antes</div>
          </div>
          <div className="ios-card p-4 text-center bg-gradient-to-br from-white to-purple-50">
            <div className="text-2xl font-bold text-purple-600">
              {stats.after}
            </div>
            <div className="text-sm text-gray-600">Fotos Depois</div>
          </div>
          <div className="ios-card p-4 text-center bg-gradient-to-br from-white to-orange-50">
            <div className="text-2xl font-bold text-orange-600">
              {stats.patients}
            </div>
            <div className="text-sm text-gray-600">Pacientes</div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="ios-card p-4 space-y-4">
          {/* Busca de Pacientes */}
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
              className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />

            {/* Autocomplete */}
            {filteredPatients.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatient(patient);
                      setSearchTerm(patient.name);
                      setFilteredPatients([]);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                  >
                    <User className="text-gray-400" size={18} />
                    <div>
                      <div className="font-medium text-gray-900">
                        {patient.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {patient.phone}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Filtro Tipo */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
              {(["all", "before", "after"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    filterType === type
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {type === "all"
                    ? "Todas"
                    : type === "before"
                    ? "Antes"
                    : "Depois"}
                </button>
              ))}
            </div>

            {/* View Mode */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 ml-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-all ${
                  viewMode === "list"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* Paciente Selecionado */}
          {selectedPatient && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <User className="text-blue-600" size={20} />
                <div>
                  <div className="font-medium text-blue-900">
                    {selectedPatient.name}
                  </div>
                  <div className="text-sm text-blue-700">
                    {
                      photos.filter((p) => p.patient_id === selectedPatient.id)
                        .length
                    }{" "}
                    fotos
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPatient(null);
                  setSearchTerm("");
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Galeria */}
        {viewMode === "grid" ? (
          <div className="space-y-6">
            {Object.values(groupedPhotos).map((group: any, index) => (
              <div key={index} className="ios-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {group.patient.name}
                    </h3>
                    <p className="text-gray-600 flex items-center space-x-2 mt-1">
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
                className="ios-card p-4 flex items-center space-x-4 hover:shadow-lg transition-shadow"
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
          <div className="ios-card p-8 text-center">
            <Camera className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma foto encontrada
            </h3>
            <p className="text-gray-600 mb-6">
              {selectedPatient
                ? `Nenhuma foto para ${selectedPatient.name}`
                : "Comece adicionando fotos dos seus pacientes"}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="ios-button bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              Adicionar Primeira Foto
            </button>
          </div>
        )}
      </div>

      {/* Modal de Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Adicionar Foto
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Seleção de Paciente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paciente *
                </label>
                <select
                  value={uploadData.patientId}
                  onChange={(e) => {
                    const patientId = e.target.value;
                    const patient = patients.find((p) => p.id === patientId);
                    setUploadData((prev) => ({
                      ...prev,
                      patientId,
                      patientName: patient?.name || "",
                    }));
                  }}
                  className="ios-input"
                  required
                >
                  <option value="">Selecione um paciente</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção de Procedimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Procedimento *
                </label>
                <select
                  value={uploadData.procedureName}
                  onChange={(e) =>
                    setUploadData((prev) => ({
                      ...prev,
                      procedureName: e.target.value,
                    }))
                  }
                  className="ios-input"
                  required
                >
                  <option value="">Selecione um procedimento</option>
                  {commonProcedures.map((procedure) => (
                    <option key={procedure} value={procedure}>
                      {procedure}
                    </option>
                  ))}
                </select>
              </div>

              {/* Data do Procedimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data do Procedimento *
                </label>
                <input
                  type="date"
                  value={uploadData.procedureDate}
                  onChange={(e) =>
                    setUploadData((prev) => ({
                      ...prev,
                      procedureDate: e.target.value,
                    }))
                  }
                  className="ios-input"
                  required
                />
              </div>

              {/* Tipo da Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo da Foto *
                </label>
                <select
                  value={uploadData.photoType}
                  onChange={(e) =>
                    setUploadData((prev) => ({
                      ...prev,
                      photoType: e.target.value as "before" | "after",
                    }))
                  }
                  className="ios-input"
                >
                  <option value="before">Antes</option>
                  <option value="after">Depois</option>
                </select>
              </div>

              {/* Região */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Região Tratada
                </label>
                <input
                  type="text"
                  value={uploadData.region}
                  onChange={(e) =>
                    setUploadData((prev) => ({
                      ...prev,
                      region: e.target.value,
                    }))
                  }
                  className="ios-input"
                  placeholder="Ex: Testa, Lábios, Olhos..."
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={uploadData.notes}
                  onChange={(e) =>
                    setUploadData((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                  className="ios-input h-20 resize-none"
                  placeholder="Observações sobre a foto..."
                />
              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={() => {
                    setActivePhotoType(uploadData.photoType);
                    setShowCamera(true);
                    initializeCamera();
                  }}
                  disabled={
                    uploading ||
                    !uploadData.patientId ||
                    !uploadData.procedureName
                  }
                  className="ios-button flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera size={18} />
                  <span>Tirar Foto</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    uploading ||
                    !uploadData.patientId ||
                    !uploadData.procedureName
                  }
                  className="ios-button flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload size={18} />
                  <span>Galeria</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {uploading && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-blue-700">Salvando foto...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Editar{" "}
                {editingPhoto.photo_type === "before" ? "Antes" : "Depois"}
              </h3>
              <button
                onClick={() => setEditingPhoto(null)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Data do Procedimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data do Procedimento
                </label>
                <input
                  type="date"
                  value={editData.procedureDate}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      procedureDate: e.target.value,
                    }))
                  }
                  className="ios-input"
                />
              </div>

              {/* Região */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Região Tratada
                </label>
                <input
                  type="text"
                  value={editData.region}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, region: e.target.value }))
                  }
                  className="ios-input"
                  placeholder="Ex: Testa, Lábios, Olhos..."
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observações
                </label>
                <textarea
                  value={editData.notes}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="ios-input h-20 resize-none"
                  placeholder="Observações sobre a foto..."
                />
              </div>

              {/* Botões de Ação */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  onClick={saveEdit}
                  disabled={uploading}
                  className="ios-button flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50"
                >
                  <Save size={18} />
                  <span>Salvar</span>
                </button>

                <button
                  onClick={() => {
                    const fileInput =
                      editingPhoto.photo_type === "before"
                        ? beforeFileInputRef
                        : afterFileInputRef;
                    fileInput.current?.click();
                  }}
                  disabled={uploading}
                  className="ios-button flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
                >
                  <Camera size={18} />
                  <span>Substituir Foto</span>
                </button>
              </div>
            </div>

            {uploading && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-center space-x-2">
                <LoadingSpinner size="sm" />
                <span className="text-blue-700">Salvando...</span>
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

      
    </div>
  );
};

export default GalleryScreen;
