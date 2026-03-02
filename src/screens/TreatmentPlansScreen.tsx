// src/screens/TreatmentPlansScreen.tsx – list of treatment plans for a patient
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Plus, Pencil, Trash2, Send, Copy, Unlink, ExternalLink } from 'lucide-react';
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { useTreatmentPlans } from '../hooks/useTreatmentPlans';
import { copyToClipboard } from '../utils/clipboard';
import ConfirmDialog from '../components/ConfirmDialog';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

const TreatmentPlansScreen: React.FC = () => {
  const { id: patientId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plans, loading, deletePlan, sendPlan, revokePublicLink } = useTreatmentPlans(patientId);
  const [sendingPlanId, setSendingPlanId] = useState<string | null>(null);
  const [revokePlanId, setRevokePlanId] = useState<string | null>(null);

  const handleSendPlan = useCallback(
    async (planId: string) => {
      setSendingPlanId(planId);
      try {
        const { publicUrl } = await sendPlan(planId, 15);
        await copyToClipboard(publicUrl);
        toast.success('Plano enviado! Link copiado.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao enviar plano.');
      } finally {
        setSendingPlanId(null);
      }
    },
    [sendPlan]
  );

  const handleCopyLink = useCallback(
    async (plan: { public_token: string | null }) => {
      if (!plan.public_token) {
        toast.error('Gere o link primeiro.');
        return;
      }
      const url = `${window.location.origin}/t/${plan.public_token}`;
      await copyToClipboard(url);
      toast.success('Link copiado!');
    },
    []
  );

  const handleRevokeConfirm = useCallback(
    async () => {
      const planId = revokePlanId;
      setRevokePlanId(null);
      if (!planId) return;
      try {
        await revokePublicLink(planId);
        toast.success('Link revogado.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Erro ao revogar.');
      }
    },
    [revokePlanId, revokePublicLink]
  );

  const handleDelete = useCallback(
    async (planId: string) => {
      if (!window.confirm('Excluir este plano?')) return;
      try {
        await deletePlan(planId);
        toast.success('Plano excluído.');
      } catch {
        toast.error('Erro ao excluir plano.');
      }
    },
    [deletePlan]
  );

  if (!patientId) {
    return (
      <ResponsiveAppLayout title="Planos" showBack>
        <p className="text-gray-400">Paciente não identificado.</p>
      </ResponsiveAppLayout>
    );
  }

  return (
    <ResponsiveAppLayout title="Planos de Tratamento" showBack>
      <div className="space-y-6 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-gray-400">Planos e propostas para compartilhar (ex.: WhatsApp).</p>
          <button
            type="button"
            onClick={() => navigate(`/patients/${patientId}/treatment-plans/new`)}
            className="neon-button min-h-[44px] px-4 inline-flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Novo plano
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" className="text-cyan-500" />
          </div>
        ) : plans.length === 0 ? (
          <div className="glass-card p-8 text-center text-gray-400">
            <FileText className="mx-auto mb-4 opacity-50" size={48} />
            <p>Nenhum plano ainda. Crie um plano e envie o link para o paciente.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="glass-card p-4 sm:p-6 flex flex-wrap items-center gap-4 min-w-0"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{plan.title}</h3>
                  <p className="text-sm text-gray-400">
                    {formatDate(plan.issued_at)} · {plan.status} · {formatCurrency(plan.total_price_cents)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(!plan.public_token || plan.status === 'revoked') ? (
                    <button
                      type="button"
                      onClick={() => handleSendPlan(plan.id)}
                      disabled={sendingPlanId === plan.id}
                      className="min-h-[44px] px-4 rounded-xl bg-emerald-500/30 border border-emerald-400/50 hover:bg-emerald-500/40 inline-flex items-center gap-2 disabled:opacity-50"
                    >
                      {sendingPlanId === plan.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <Send size={18} />
                      )}
                      Enviar plano
                    </button>
                  ) : (plan.status === 'sent' || plan.status === 'accepted') ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(plan)}
                        className="min-h-[44px] px-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 inline-flex items-center gap-2"
                      >
                        <Copy size={18} />
                        Copiar link
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open(`${window.location.origin}/t/${plan.public_token}`, '_blank')}
                        className="min-h-[44px] px-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 inline-flex items-center gap-2"
                      >
                        <ExternalLink size={18} />
                        Abrir link
                      </button>
                      <button
                        type="button"
                        onClick={() => setRevokePlanId(plan.id)}
                        className="min-h-[44px] px-4 rounded-xl border border-amber-400/50 text-amber-300 hover:bg-amber-500/20 inline-flex items-center gap-2"
                      >
                        <Unlink size={18} />
                        Revogar link
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigate(`/patients/${patientId}/treatment-plans/${plan.id}`)}
                    className="min-h-[44px] px-4 rounded-xl bg-white/10 border border-white/20 hover:bg-white/20 inline-flex items-center gap-2"
                  >
                    <Pencil size={18} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id)}
                    className="min-h-[44px] px-4 rounded-xl border border-rose-400/30 text-rose-300 hover:bg-rose-500/20 inline-flex items-center gap-2"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(revokePlanId)}
        title="Revogar link"
        message="O paciente não poderá mais acessar o plano por este link. Deseja continuar?"
        confirmLabel="Revogar"
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokePlanId(null)}
      />
    </ResponsiveAppLayout>
  );
};

export default TreatmentPlansScreen;
