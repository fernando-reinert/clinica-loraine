/**
 * Galeria do Paciente por PROCEDIMENTO — antes/depois em pares
 * 1 card = 1 procedimento com [ANTES] [DEPOIS] (ou botão + adicionar)
 * Acesso: /patients/:id/gallery
 */
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Camera,
  Plus,
  Edit,
  Trash2,
  X,
  Upload,
  Save,
} from "lucide-react";
import { supabase } from "../services/supabase/client";
import {
  listByPatient,
  createProcedureWithPhotos,
  addBeforePhoto,
  addAfterPhoto,
  deleteBeforePhoto,
  deleteAfterPhoto,
  deleteProcedure,
  updateProcedureMetadata,
  type PatientProcedurePhoto,
} from "../services/gallery/patientGalleryService";
import AppLayout from "../components/Layout/AppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";
import ImagePicker from "../components/gallery/ImagePicker";
import toast from "react-hot-toast";

type SlotType = "before" | "after";

interface Patient {
  id: string;
  name: string;
}

const PatientGalleryScreen: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [procedures, setProcedures] = useState<PatientProcedurePhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Modal: Novo procedimento
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    procedureName: "",
    procedureDate: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [addBeforeFile, setAddBeforeFile] = useState<File | null>(null);
  const [addAfterFile, setAddAfterFile] = useState<File | null>(null);

  // Adicionar antes/depois em um procedimento existente (qual slot e qual procedureId)
  const [addingSlot, setAddingSlot] = useState<{ procedureId: string; slot: SlotType } | null>(null);

  // Modal: Editar metadados do procedimento
  const [editingProcedure, setEditingProcedure] = useState<PatientProcedurePhoto | null>(null);
  const [editForm, setEditForm] = useState({
    procedureName: "",
    procedureDate: "",
    notes: "",
  });

  // Excluir: qual slot ou procedimento inteiro
  const [deleteTarget, setDeleteTarget] = useState<
    { type: "before" | "after" | "procedure"; procedure: PatientProcedurePhoto } | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  const loadPatient = async () => {
    if (!patientId) return;
    const { data, error } = await supabase
      .from("patients")
      .select("id, name")
      .eq("id", patientId)
      .single();
    if (error) throw error;
    setPatient(data as Patient);
  };

  const loadProcedures = async () => {
    if (!patientId) return;
    const list = await listByPatient(patientId);
    setProcedures(list);
  };

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      setLoading(true);
      try {
        await loadPatient();
        await loadProcedures();
      } catch (e) {
        console.error(e);
        toast.error("Erro ao carregar galeria");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  const openAddModal = () => {
    setAddForm({
      procedureName: "",
      procedureDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setAddBeforeFile(null);
    setAddAfterFile(null);
    setShowAddModal(true);
  };

  const handleAddSave = async () => {
    if (!patientId) return;
    if (!addForm.procedureName.trim()) {
      toast.error("Informe o procedimento");
      return;
    }
    if (!addBeforeFile && !addAfterFile) {
      toast.error("Adicione pelo menos uma foto (antes ou depois)");
      return;
    }
    setUploading(true);
    try {
      await createProcedureWithPhotos({
        patientId,
        procedureName: addForm.procedureName.trim(),
        procedureDate: addForm.procedureDate,
        notes: addForm.notes.trim() || undefined,
        beforeFile: addBeforeFile ?? undefined,
        afterFile: addAfterFile ?? undefined,
      });
      toast.success("Procedimento adicionado");
      setShowAddModal(false);
      await loadProcedures();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao adicionar procedimento");
    } finally {
      setUploading(false);
    }
  };

  const openAddSlot = (procedureId: string, slot: SlotType) => {
    setAddingSlot({ procedureId, slot });
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const handleAddSlotFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !addingSlot) return;
    setUploading(true);
    try {
      if (addingSlot.slot === "before") {
        await addBeforePhoto(addingSlot.procedureId, file);
        toast.success("Foto antes adicionada");
      } else {
        await addAfterPhoto(addingSlot.procedureId, file);
        toast.success("Foto depois adicionada");
      }
      setAddingSlot(null);
      await loadProcedures();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (proc: PatientProcedurePhoto) => {
    setEditingProcedure(proc);
    setEditForm({
      procedureName: proc.procedure_name,
      procedureDate: proc.procedure_date,
      notes: proc.notes ?? "",
    });
  };

  const handleEditSave = async () => {
    if (!editingProcedure) return;
    if (!editForm.procedureName.trim()) {
      toast.error("Informe o procedimento");
      return;
    }
    setUploading(true);
    try {
      await updateProcedureMetadata(editingProcedure.id, {
        procedureName: editForm.procedureName.trim(),
        procedureDate: editForm.procedureDate,
        notes: editForm.notes.trim() || undefined,
      });
      toast.success("Procedimento atualizado");
      setEditingProcedure(null);
      await loadProcedures();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === "procedure") {
        await deleteProcedure(deleteTarget.procedure.id);
        toast.success("Procedimento excluído");
      } else if (deleteTarget.type === "before") {
        await deleteBeforePhoto(deleteTarget.procedure.id);
        toast.success("Foto antes excluída");
      } else {
        await deleteAfterPhoto(deleteTarget.procedure.id);
        toast.success("Foto depois excluída");
      }
      setDeleteTarget(null);
      await loadProcedures();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Galeria" showBack>
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" className="text-cyan-500" />
        </div>
      </AppLayout>
    );
  }

  if (!patientId || !patient) {
    return (
      <AppLayout title="Galeria" showBack>
        <div className="glass-card p-8 text-center">
          <p className="text-gray-400">Paciente não encontrado.</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="neon-button mt-4"
          >
            Voltar
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Galeria do Paciente" showBack>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleAddSlotFile}
      />

      <div className="space-y-8">
        {/* Header */}
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30">
                  <Camera className="text-blue-300" size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-bold glow-text mb-2">
                    Galeria do Paciente
                  </h2>
                  <p className="text-gray-300 text-lg">
                    Antes/depois por procedimento —{" "}
                    <span className="text-cyan-400 font-semibold">{patient.name}</span>
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="neon-button group relative overflow-hidden flex items-center space-x-2"
            >
              <Plus size={24} className="relative z-10" />
              <span className="relative z-10 font-semibold">Adicionar Procedimento</span>
            </button>
          </div>
        </div>

        {/* Lista por procedimento — cards lado a lado [ANTES] [DEPOIS] */}
        <div className="space-y-6">
          {procedures.length === 0 ? (
            <div className="glass-card p-12 text-center border border-dashed border-white/20 rounded-2xl">
              <Camera className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-400 mb-6">Nenhum procedimento cadastrado</p>
              <button
                type="button"
                onClick={openAddModal}
                className="neon-button inline-flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Adicionar Procedimento</span>
              </button>
            </div>
          ) : (
            procedures.map((proc) => (
              <div
                key={proc.id}
                className="glass-card p-6 border border-white/10 hover:border-cyan-400/30 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-xl font-bold glow-text">{proc.procedure_name}</h3>
                    <p className="text-gray-400 text-sm">
                      {new Date(proc.procedure_date).toLocaleDateString("pt-BR")}
                    </p>
                    {proc.notes && (
                      <p className="text-gray-500 text-sm mt-1">{proc.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(proc)}
                      className="neon-button py-2 px-4 flex items-center gap-2 text-sm"
                    >
                      <Edit size={16} />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ type: "procedure", procedure: proc })}
                      className="py-2 px-4 rounded-2xl border border-red-400/50 text-red-400 hover:bg-red-500/20 flex items-center gap-2 text-sm"
                    >
                      <Trash2 size={16} />
                      Excluir procedimento
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Slot ANTES */}
                  <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 overflow-hidden min-h-[200px] flex flex-col">
                    <div className="p-2 text-center text-cyan-400 text-sm font-medium border-b border-white/10">
                      Antes
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 min-h-[180px]">
                      {proc.before_url ? (
                        <div className="relative w-full h-full group">
                          <img
                            src={proc.before_url}
                            alt="Antes"
                            className="w-full h-full object-cover rounded-xl"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openAddSlot(proc.id, "before")}
                              disabled={uploading}
                              className="neon-button py-2 px-3 text-sm"
                            >
                              Trocar
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: "before", procedure: proc })}
                              className="py-2 px-3 rounded-xl border border-red-400/50 text-red-400 hover:bg-red-500/20 text-sm"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAddSlot(proc.id, "before")}
                          disabled={uploading}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-cyan-400/40 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-400 transition-all"
                        >
                          <Plus size={32} />
                          <span className="font-medium">Adicionar Antes</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Slot DEPOIS */}
                  <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 overflow-hidden min-h-[200px] flex flex-col">
                    <div className="p-2 text-center text-purple-400 text-sm font-medium border-b border-white/10">
                      Depois
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 min-h-[180px]">
                      {proc.after_url ? (
                        <div className="relative w-full h-full group">
                          <img
                            src={proc.after_url}
                            alt="Depois"
                            className="w-full h-full object-cover rounded-xl"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openAddSlot(proc.id, "after")}
                              disabled={uploading}
                              className="neon-button py-2 px-3 text-sm"
                            >
                              Trocar
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: "after", procedure: proc })}
                              className="py-2 px-3 rounded-xl border border-red-400/50 text-red-400 hover:bg-red-500/20 text-sm"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAddSlot(proc.id, "after")}
                          disabled={uploading}
                          className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-400/40 hover:border-purple-400 hover:bg-purple-500/10 text-purple-400 transition-all"
                        >
                          <Plus size={32} />
                          <span className="font-medium">Adicionar Depois</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal: Novo procedimento */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div
            className="glass-card p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold glow-text">Adicionar Procedimento</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Procedimento *</label>
                <input
                  type="text"
                  value={addForm.procedureName}
                  onChange={(e) => setAddForm((p) => ({ ...p, procedureName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50"
                  placeholder="Ex: Botox Frontal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Data *</label>
                <input
                  type="date"
                  value={addForm.procedureDate}
                  onChange={(e) => setAddForm((p) => ({ ...p, procedureDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-cyan-400/50 h-20 resize-none"
                  placeholder="Observações"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Foto Antes (opcional)</label>
                <ImagePicker
                  label=""
                  value={addBeforeFile}
                  onChange={setAddBeforeFile}
                  disabled={uploading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Foto Depois (opcional)</label>
                <ImagePicker
                  label=""
                  value={addAfterFile}
                  onChange={setAddAfterFile}
                  disabled={uploading}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 rounded-2xl border border-white/20 text-gray-300 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddSave}
                disabled={
                  uploading ||
                  !addForm.procedureName.trim() ||
                  (!addBeforeFile && !addAfterFile)
                }
                className="neon-button flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={18} />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Editar metadados */}
      {editingProcedure && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div
            className="glass-card p-8 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold glow-text">Editar Procedimento</h3>
              <button
                type="button"
                onClick={() => setEditingProcedure(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Procedimento *</label>
                <input
                  type="text"
                  value={editForm.procedureName}
                  onChange={(e) => setEditForm((p) => ({ ...p, procedureName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Data *</label>
                <input
                  type="date"
                  value={editForm.procedureDate}
                  onChange={(e) => setEditForm((p) => ({ ...p, procedureDate: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Observações</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-2xl bg-white/10 border border-white/20 text-white h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditingProcedure(null)}
                className="flex-1 py-3 rounded-2xl border border-white/20 text-gray-300 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEditSave}
                disabled={uploading || !editForm.procedureName.trim()}
                className="neon-button flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={
          deleteTarget?.type === "procedure"
            ? "Excluir procedimento"
            : deleteTarget?.type === "before"
            ? "Excluir foto Antes"
            : "Excluir foto Depois"
        }
        message={
          deleteTarget?.type === "procedure"
            ? "Excluir este procedimento e todas as fotos? A ação não pode ser desfeita."
            : "Excluir esta foto? A ação não pode ser desfeita."
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleting}
      />
    </AppLayout>
  );
};

export default PatientGalleryScreen;
