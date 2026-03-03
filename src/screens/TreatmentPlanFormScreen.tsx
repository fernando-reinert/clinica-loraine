// src/screens/TreatmentPlanFormScreen.tsx – create or edit treatment plan (draft)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Unlink,
  Send,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTreatmentPlans } from '../hooks/useTreatmentPlans';
import { usePatients } from '../hooks/usePatients';
import { useProcedureCatalog } from '../hooks/useProcedureCatalog';
import type { Procedure } from '../types/db';
import { copyToClipboard } from '../utils/clipboard';
import { formatWhatsAppPhone, buildWhatsAppUrl } from '../utils/whatsapp';
import ConfirmDialog from '../components/ConfirmDialog';
import ConfirmModal from '../components/ui/ConfirmModal';
import type { TreatmentPlanWithItems } from '../types/treatmentPlan';

const CLINIC_NAME = 'Clínica Áurea';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TreatmentPlanFormScreen: React.FC = () => {
  const { id: patientId, planId } = useParams<{ id: string; planId?: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(planId);
  const {
    createPlanWithItems,
    updatePlan,
    replacePlanItems,
    getPlanWithItems: loadPlan,
    sendPlan,
    revokePublicLink,
  } = useTreatmentPlans(patientId);
  const { getPatient } = usePatients();

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [title, setTitle] = useState('Plano de Tratamento');
  const [notes, setNotes] = useState('');
  const [validityDays, setValidityDays] = useState(15);
  const [maskPatientName, setMaskPatientName] = useState(false);
  const [totalPriceCents, setTotalPriceCents] = useState(0);
  const [items, setItems] = useState<
    Array<{
      id?: string;
      procedure_catalog_id?: string | null;
      procedure_name_snapshot: string;
      procedure_description_snapshot: string | null;
      unit_price_cents: number;
      quantity: number;
    }>
  >([]);
  const { procedures, updateDescription } = useProcedureCatalog();
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const [loadedPlan, setLoadedPlan] = useState<TreatmentPlanWithItems | null>(null);
  const [savingCatalogDescriptionId, setSavingCatalogDescriptionId] = useState<string | null>(null);
  const [pendingCatalogUpdate, setPendingCatalogUpdate] = useState<{
    procedureId: string;
    description: string;
  } | null>(null);

  const currentPlanId = isEdit ? planId! : null;

  useEffect(() => {
    if (!patientId) return;
    let cancelled = false;
    getPatient(patientId).then((p) => {
      if (!cancelled) {
        setPatientName(p?.name ?? '');
        setPatientPhone(p?.phone ?? '');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [patientId, getPatient]);

  useEffect(() => {
    if (!patientId || !isEdit || !planId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    loadPlan(planId)
      .then((plan) => {
        if (cancelled || !plan) return;
        setLoadedPlan(plan);
        setTitle(plan.title);
        setNotes(plan.notes ?? '');
        setValidityDays(plan.validity_days);
        setMaskPatientName(plan.mask_patient_name_on_share);
        setTotalPriceCents(plan.total_price_cents);
        setItems(
          plan.items.map((i) => ({
            id: i.id,
            procedure_catalog_id: i.procedure_catalog_id,
            procedure_name_snapshot: i.procedure_name_snapshot,
            procedure_description_snapshot: i.procedure_description_snapshot,
            unit_price_cents: i.unit_price_cents,
            quantity: i.quantity,
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId, planId, isEdit, loadPlan]);

  const computedTotal = items.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);

  const filteredProcedures = React.useMemo(() => {
    if (!procedureSearch.trim()) return procedures;
    const term = procedureSearch.toLowerCase();
    return procedures.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.category ?? '').toLowerCase().includes(term)
    );
  }, [procedures, procedureSearch]);

  const addItemFromCatalog = useCallback((proc: Procedure) => {
    setItems((prev) => [
      ...prev,
      {
        procedure_catalog_id: proc.id,
        procedure_name_snapshot: proc.name,
        procedure_description_snapshot: proc.description ?? null,
        unit_price_cents: Math.round(proc.sale_price * 100),
        quantity: 1,
      },
    ]);
  }, []);

  const addManualItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        procedure_name_snapshot: '',
        procedure_description_snapshot: null,
        unit_price_cents: 0,
        quantity: 1,
      },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItemAt = useCallback(
    (index: number, field: string, value: string | number) => {
      setItems((prev) => {
        const next = [...prev];
        const item = { ...next[index] };
        if (field === 'procedure_name_snapshot') {
          item.procedure_name_snapshot = value as string;
        } else if (field === 'procedure_description_snapshot') {
          item.procedure_description_snapshot = (value as string) || null;
        } else if (field === 'unit_price_cents') {
          item.unit_price_cents = value as number;
        } else if (field === 'quantity') {
          item.quantity = value as number;
        }
        next[index] = item;
        return next;
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!patientId) return;
    if (!title.trim()) {
      toast.error('Informe o título do plano.');
      return;
    }
    const total = totalPriceCents > 0 ? totalPriceCents : computedTotal;
    setSaving(true);
    try {
      if (isEdit && planId) {
        await updatePlan(planId, {
          title: title.trim(),
          notes: notes.trim() || null,
          validity_days: validityDays,
          mask_patient_name_on_share: maskPatientName,
          total_price_cents: total,
        });
        const itemsInput = items.map((i) => ({
          procedure_catalog_id: i.procedure_catalog_id ?? null,
          procedure_name_snapshot: i.procedure_name_snapshot.trim() || 'Item',
          procedure_description_snapshot: i.procedure_description_snapshot,
          unit_price_cents: i.unit_price_cents,
          quantity: i.quantity,
        }));
        await replacePlanItems(planId, itemsInput);
        toast.success('Plano atualizado.');
        navigate(`/patients/${patientId}/treatment-plans`);
      } else {
        const planInput = {
          patient_id: patientId,
          title: title.trim(),
          status: 'draft' as const,
          total_price_cents: total,
          notes: notes.trim() || null,
          validity_days: validityDays,
          mask_patient_name_on_share: maskPatientName,
        };
        const itemsInput = items.map((i) => ({
          procedure_catalog_id: i.procedure_catalog_id ?? null,
          procedure_name_snapshot: i.procedure_name_snapshot.trim() || 'Item',
          procedure_description_snapshot: i.procedure_description_snapshot,
          unit_price_cents: i.unit_price_cents,
          quantity: i.quantity,
        }));
        await createPlanWithItems(planInput, itemsInput);
        toast.success('Plano criado.');
        navigate(`/patients/${patientId}/treatment-plans`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }, [
    patientId,
    planId,
    isEdit,
    title,
    notes,
    validityDays,
    maskPatientName,
    totalPriceCents,
    computedTotal,
    items,
    updatePlan,
    createPlanWithItems,
    replacePlanItems,
    navigate,
  ]);

  const handleSendPlan = useCallback(async () => {
    if (!patientId) return;
    if (!title.trim()) {
      toast.error('Informe o título do plano.');
      return;
    }
    const total = totalPriceCents > 0 ? totalPriceCents : computedTotal;
    const itemsInput = items.map((i) => ({
      procedure_catalog_id: i.procedure_catalog_id ?? null,
      procedure_name_snapshot: i.procedure_name_snapshot.trim() || 'Item',
      procedure_description_snapshot: i.procedure_description_snapshot,
      unit_price_cents: i.unit_price_cents,
      quantity: i.quantity,
    }));

    setSending(true);
    try {
      let effectivePlanId = planId;
      if (!isEdit || !planId) {
        const planInput = {
          patient_id: patientId,
          title: title.trim(),
          status: 'draft' as const,
          total_price_cents: total,
          notes: notes.trim() || null,
          validity_days: validityDays,
          mask_patient_name_on_share: maskPatientName,
        };
        const created = await createPlanWithItems(planInput, itemsInput);
        effectivePlanId = created.id;
        if (!isEdit) {
          navigate(`/patients/${patientId}/treatment-plans/${created.id}`, { replace: true });
        }
      } else {
        await updatePlan(planId, {
          title: title.trim(),
          notes: notes.trim() || null,
          validity_days: validityDays,
          mask_patient_name_on_share: maskPatientName,
          total_price_cents: total,
        });
        await replacePlanItems(planId, itemsInput);
      }
      const { publicUrl } = await sendPlan(effectivePlanId!, validityDays);
      await copyToClipboard(publicUrl);
      const refreshed = await loadPlan(effectivePlanId!);
      if (refreshed) setLoadedPlan(refreshed);
      toast.success('Plano enviado! Link copiado para a área de transferência.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar plano.');
    } finally {
      setSending(false);
    }
  }, [
    patientId,
    planId,
    isEdit,
    title,
    notes,
    validityDays,
    maskPatientName,
    totalPriceCents,
    computedTotal,
    items,
    createPlanWithItems,
    updatePlan,
    replacePlanItems,
    sendPlan,
    loadPlan,
    navigate,
  ]);

  const handleCopyLink = useCallback(async () => {
    if (!loadedPlan?.public_token) return;
    const url = `${window.location.origin}/t/${loadedPlan.public_token}`;
    await copyToClipboard(url);
    toast.success('Link copiado!');
  }, [loadedPlan?.public_token]);

  const handleOpenLink = useCallback(() => {
    if (!loadedPlan?.public_token) return;
    const url = `${window.location.origin}/t/${loadedPlan.public_token}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [loadedPlan?.public_token]);

  const handleRevokeLink = useCallback(async () => {
    if (!planId) return;
    setRevokeDialogOpen(false);
    try {
      await revokePublicLink(planId);
      const refreshed = await loadPlan(planId);
      if (refreshed) setLoadedPlan(refreshed);
      toast.success('Link revogado.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao revogar.');
    }
  }, [planId, revokePublicLink, loadPlan]);

  const canSendPlan =
    !loadedPlan?.public_token || loadedPlan?.status === 'revoked';
  const isSent = Boolean(
    loadedPlan?.public_token &&
    (loadedPlan?.status === 'sent' || loadedPlan?.status === 'accepted')
  );

  const whatsAppPhone = formatWhatsAppPhone(patientPhone);
  const needsFreshLink =
    !loadedPlan?.public_token ||
    !loadedPlan?.public_link_generated_at ||
    (loadedPlan.updated_at &&
      loadedPlan.public_link_generated_at &&
      new Date(loadedPlan.updated_at) > new Date(loadedPlan.public_link_generated_at));

  const handleSendWhatsApp = useCallback(async () => {
    if (!patientId || !whatsAppPhone) {
      toast.error('Cadastre o telefone do paciente (com DDD) para enviar pelo WhatsApp.');
      return;
    }
    if (!title.trim()) {
      toast.error('Informe o título do plano.');
      return;
    }
    const total = totalPriceCents > 0 ? totalPriceCents : computedTotal;
    const itemsInput = items.map((i) => ({
      procedure_catalog_id: i.procedure_catalog_id ?? null,
      procedure_name_snapshot: i.procedure_name_snapshot.trim() || 'Item',
      procedure_description_snapshot: i.procedure_description_snapshot,
      unit_price_cents: i.unit_price_cents,
      quantity: i.quantity,
    }));

    setSendingWhatsApp(true);
    try {
      let effectivePlanId = planId;
      let publicUrl = loadedPlan?.public_token
        ? `${window.location.origin}/t/${loadedPlan.public_token}`
        : '';

      if (needsFreshLink || !publicUrl) {
        if (!isEdit || !planId) {
          const planInput = {
            patient_id: patientId,
            title: title.trim(),
            status: 'draft' as const,
            total_price_cents: total,
            notes: notes.trim() || null,
            validity_days: validityDays,
            mask_patient_name_on_share: maskPatientName,
          };
          const created = await createPlanWithItems(planInput, itemsInput);
          effectivePlanId = created.id;
          if (!isEdit) {
            navigate(`/patients/${patientId}/treatment-plans/${created.id}`, { replace: true });
          }
        } else {
          await updatePlan(planId, {
            title: title.trim(),
            notes: notes.trim() || null,
            validity_days: validityDays,
            mask_patient_name_on_share: maskPatientName,
            total_price_cents: total,
          });
          await replacePlanItems(planId, itemsInput);
        }
        const result = await sendPlan(effectivePlanId!, validityDays);
        publicUrl = result.publicUrl;
        const refreshed = await loadPlan(effectivePlanId!);
        if (refreshed) setLoadedPlan(refreshed);
      }

      const firstName = (patientName || 'Paciente').split(/\s+/)[0] || 'Paciente';
      const message = `Olá, ${firstName}. Segue seu Plano de Tratamento (${title.trim()}): ${publicUrl}`;
      const url = buildWhatsAppUrl(whatsAppPhone, message);
      window.open(url, '_blank', 'noopener,noreferrer');
      toast.success('WhatsApp aberto!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar pelo WhatsApp.');
    } finally {
      setSendingWhatsApp(false);
    }
  }, [
    patientId,
    patientPhone,
    patientName,
    whatsAppPhone,
    needsFreshLink,
    planId,
    isEdit,
    title,
    notes,
    validityDays,
    maskPatientName,
    totalPriceCents,
    computedTotal,
    items,
    loadedPlan,
    createPlanWithItems,
    updatePlan,
    replacePlanItems,
    sendPlan,
    loadPlan,
    navigate,
  ]);

  if (!patientId) {
    return (
      <ResponsiveAppLayout title="Plano" showBack>
        <p className="text-gray-400">Paciente não identificado.</p>
      </ResponsiveAppLayout>
    );
  }

  if (loading && isEdit) {
    return (
      <ResponsiveAppLayout title="Carregando..." showBack>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" className="text-cyan-500" />
        </div>
      </ResponsiveAppLayout>
    );
  }

  return (
    <ResponsiveAppLayout title={isEdit ? 'Editar plano' : 'Novo plano'} showBack>
      <div className="space-y-6 min-w-0">
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 outline-none"
              placeholder="Plano de Tratamento"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Validade (dias)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value) || 15)}
                className="w-24 min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 outline-none"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={maskPatientName}
                onChange={(e) => setMaskPatientName(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-400 text-sm">Ocultar nome do paciente no link</span>
            </label>
          </div>
          <div>
            <label className="block text-gray-400 text-sm mb-1">Observações</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full min-h-[80px] px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white focus:border-cyan-400/50 outline-none resize-y"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="glass-card p-4 sm:p-6">
          <h3 className="font-semibold text-white mb-4">Itens</h3>
          {procedures.length > 0 && (
            <div className="mb-4 space-y-2">
              <label className="block text-gray-400 text-sm">Adicionar do catálogo</label>
              {procedures.length > 30 ? (
                <div className="relative max-w-md">
                  <input
                    type="text"
                    value={procedureSearch}
                    onChange={(e) => {
                      setProcedureSearch(e.target.value);
                      setShowProcedureDropdown(true);
                    }}
                    onFocus={() => setShowProcedureDropdown(true)}
                    placeholder="Buscar procedimento por nome ou categoria..."
                    className="w-full min-h-[40px] px-3 rounded-xl bg-white/10 border border-white/20 text-white text-sm placeholder:text-gray-400 focus:border-cyan-400/50 outline-none"
                  />
                  {showProcedureDropdown && filteredProcedures.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-white/20 bg-slate-900/95 backdrop-blur-xl shadow-2xl">
                      {filteredProcedures.map((proc) => (
                        <button
                          key={proc.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addItemFromCatalog(proc);
                            setProcedureSearch('');
                            setShowProcedureDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 flex items-center justify-between gap-2 border-b border-white/5 last:border-b-0"
                        >
                          <div className="min-w-0">
                            <div className="font-medium truncate">{proc.name}</div>
                            {proc.category && (
                              <div className="text-[11px] text-gray-400 truncate">{proc.category}</div>
                            )}
                          </div>
                          <div className="text-xs text-emerald-300 shrink-0">
                            {formatCurrency(Math.round(proc.sale_price * 100))}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {procedures.map((proc) => (
                    <button
                      key={proc.id}
                      type="button"
                      onClick={() => addItemFromCatalog(proc)}
                      className="min-h-[32px] px-3 rounded-lg bg-white/10 border border-white/20 text-xs sm:text-sm hover:bg-white/20"
                    >
                      {proc.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={addManualItem}
            className="min-h-[44px] px-4 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 inline-flex items-center gap-2 mb-4"
          >
            <Plus size={18} />
            Adicionar item manual
          </button>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="space-y-2 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={item.procedure_name_snapshot}
                    onChange={(e) => updateItemAt(index, 'procedure_name_snapshot', e.target.value)}
                    placeholder="Procedimento"
                    className="flex-1 min-w-[120px] min-h-[40px] px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unit_price_cents / 100}
                    onChange={(e) =>
                      updateItemAt(
                        index,
                        'unit_price_cents',
                        Math.round(parseFloat(e.target.value || '0') * 100)
                      )
                    }
                    placeholder="R$"
                    className="w-24 min-h-[40px] px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItemAt(index, 'quantity', parseInt(e.target.value || '1', 10, ))}
                    className="w-16 min-h-[40px] px-3 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                  />
                  <span className="text-gray-300 text-sm font-medium">
                    {formatCurrency(item.unit_price_cents * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/20"
                    aria-label="Remover"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div>
                  <label className="block text-gray-400 text-xs mb-1">
                    Descrição do procedimento (opcional)
                  </label>
                <textarea
                  value={item.procedure_description_snapshot ?? ''}
                  onChange={(e) =>
                    updateItemAt(index, 'procedure_description_snapshot', e.target.value)
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:border-cyan-400/50 outline-none resize-y"
                  placeholder="Ex.: Objetivo do procedimento, sensação esperada, cuidados importantes..."
                />
                {(() => {
                  const normalizeDesc = (s: string | null | undefined) =>
                    (s ?? '').trim();

                  const catalogId = item.procedure_catalog_id ?? null;
                  if (!catalogId) {
                    // item manual nunca mostra botão
                    return null;
                  }

                  const proc = procedures.find((p) => p.id === catalogId);
                  if (!proc) return null;

                  const snapshotNorm = normalizeDesc(
                    item.procedure_description_snapshot
                  );
                  const catalogNorm = normalizeDesc(proc.description);

                  const snapshotEmpty = snapshotNorm.length === 0;
                  const catalogEmpty = catalogNorm.length === 0;
                  const isDirtyVsCatalog = snapshotNorm !== catalogNorm;
                  const canPersistToCatalog = isDirtyVsCatalog && !snapshotEmpty;

                  if (!canPersistToCatalog) {
                    return null;
                  }

                  const label = catalogEmpty ? 'Salvar no BD' : 'Atualizar no BD';

                  return (
                    <>
                      {catalogEmpty && (
                        <p className="mt-1 text-[10px] text-amber-300/80">
                          Sem descrição padrão no catálogo — descreva aqui e salve como padrão se desejar.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          const text = snapshotNorm;
                          if (!text) return;
                          if (text.length > 2000) {
                            toast.error('Descrição deve ter no máximo 2000 caracteres.');
                            return;
                          }

                          try {
                            if (catalogEmpty) {
                              setSavingCatalogDescriptionId(catalogId);
                              await updateDescription(catalogId, text);
                              toast.success('Descrição padrão salva no BD.');
                            } else {
                              setPendingCatalogUpdate({
                                procedureId: catalogId,
                                description: text,
                              });
                            }
                          } catch (e) {
                            toast.error(
                              e instanceof Error
                                ? e.message
                                : 'Erro ao salvar descrição padrão no BD.'
                            );
                          } finally {
                            setSavingCatalogDescriptionId(null);
                          }
                        }}
                        disabled={savingCatalogDescriptionId === catalogId}
                        className="mt-1 inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[11px] text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {savingCatalogDescriptionId === catalogId ? 'Salvando...' : label}
                      </button>
                    </>
                  );
                })()}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-4">
            <span className="text-gray-400">Total:</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={totalPriceCents > 0 ? totalPriceCents / 100 : computedTotal / 100}
              onChange={(e) => setTotalPriceCents(Math.round(parseFloat(e.target.value || '0') * 100))}
              className="w-32 min-h-[44px] px-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold"
            />
            <span className="text-gray-400 text-sm">(deixe 0 para usar soma dos itens)</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="neon-button min-h-[44px] px-6 inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Salvar
          </button>
          {canSendPlan && (
            <button
              type="button"
              onClick={handleSendPlan}
              disabled={sending}
              className="min-h-[44px] px-6 rounded-xl bg-emerald-500/30 border border-emerald-400/50 hover:bg-emerald-500/40 inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              Enviar plano
            </button>
          )}
          {isSent && (
            <>
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-[44px] px-6 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 inline-flex items-center justify-center gap-2"
              >
                <Copy size={20} />
                Copiar link
              </button>
              <button
                type="button"
                onClick={handleOpenLink}
                className="min-h-[44px] px-6 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 inline-flex items-center justify-center gap-2"
              >
                <ExternalLink size={20} />
                Abrir link
              </button>
              <button
                type="button"
                onClick={() => setRevokeDialogOpen(true)}
                className="min-h-[44px] px-6 rounded-xl border border-amber-400/50 text-amber-300 hover:bg-amber-500/20 inline-flex items-center justify-center gap-2"
              >
                <Unlink size={20} />
                Revogar link
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={!whatsAppPhone || sendingWhatsApp}
            title={!whatsAppPhone ? 'Cadastre o telefone do paciente (com DDD) para enviar pelo WhatsApp.' : undefined}
            className="min-h-[44px] px-6 rounded-xl bg-green-600/30 border border-green-500/50 hover:bg-green-600/40 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingWhatsApp ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <MessageCircle size={20} />
            )}
            Enviar no WhatsApp
          </button>
          {!whatsAppPhone && patientId && (
            <span className="text-gray-400 text-xs self-center">
              Cadastre o telefone do paciente para enviar pelo WhatsApp.
            </span>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={revokeDialogOpen}
        title="Revogar link"
        message="O paciente não poderá mais acessar o plano por este link. Deseja continuar?"
        confirmLabel="Revogar"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleRevokeLink}
        onCancel={() => setRevokeDialogOpen(false)}
      />

      <ConfirmModal
        open={!!pendingCatalogUpdate}
        title="Atualizar descrição padrão?"
        description="Isso vai alterar a descrição padrão deste procedimento para futuros planos."
        confirmText="Atualizar no BD"
        cancelText="Cancelar"
        variant="default"
        loading={!!pendingCatalogUpdate && savingCatalogDescriptionId === pendingCatalogUpdate.procedureId}
        onCancel={() => {
          if (savingCatalogDescriptionId) return;
          setPendingCatalogUpdate(null);
        }}
        onConfirm={async () => {
          if (!pendingCatalogUpdate) return;
          const { procedureId, description } = pendingCatalogUpdate;
          try {
            setSavingCatalogDescriptionId(procedureId);
            await updateDescription(procedureId, description);
            toast.success('Descrição padrão salva no BD.');
            setPendingCatalogUpdate(null);
          } catch (e) {
            toast.error(
              e instanceof Error
                ? e.message
                : 'Erro ao salvar descrição padrão no BD.'
            );
          } finally {
            setSavingCatalogDescriptionId(null);
          }
        }}
      />
    </ResponsiveAppLayout>
  );
};

export default TreatmentPlanFormScreen;
