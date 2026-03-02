// src/screens/PublicTreatmentPlanScreen.tsx – public tokenized treatment plan viewer
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { MessageCircle, AlertCircle, Clock } from 'lucide-react';
import PublicLayout from '../components/Layout/PublicLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { getPublicTreatmentPlan } from '../services/treatmentPlans/publicTreatmentPlanService';
import type { PublicTreatmentPlanSuccess } from '../types/publicTreatmentPlan';

const CLINIC_NAME = 'Clínica Áurea';
const CLINIC_WHATSAPP = '1535997454406';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const PublicTreatmentPlanScreen: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [result, setResult] = useState<
    { ok: true; data: PublicTreatmentPlanSuccess } | { ok: false; error: string } | null
  >(null);

  useEffect(() => {
    if (!token) {
      setResult({ ok: false, error: 'invalid_token' });
      return;
    }
    let cancelled = false;
    getPublicTreatmentPlan(token).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (result === null) {
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-dvh p-6">
          <LoadingSpinner size="lg" className="text-cyan-400 mb-4" />
          <p className="text-gray-400">Carregando plano...</p>
        </div>
      </PublicLayout>
    );
  }

  if (!result.ok) {
    const messages: Record<string, { title: string; desc: string }> = {
      invalid_token: {
        title: 'Link inválido',
        desc: 'Este link não existe ou não está correto.',
      },
      revoked_or_invalid: {
        title: 'Link revogado',
        desc: 'Este link foi desativado pela clínica.',
      },
      expired: {
        title: 'Link expirado',
        desc: 'O prazo para visualização expirou.',
      },
    };
    const msg = messages[result.error] ?? messages.invalid_token;
    return (
      <PublicLayout>
        <div className="flex flex-col items-center justify-center min-h-dvh p-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 max-w-md w-full p-8 text-center">
            <AlertCircle className="mx-auto text-amber-400 mb-4" size={48} />
            <h1 className="text-xl font-semibold text-white mb-2">{msg.title}</h1>
            <p className="text-gray-400 text-sm">{msg.desc}</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const { plan, items } = result.data;

  // Compute total as sum of (quantity * unit_price_cents) for every item. Robust defaults.
  const computedTotal = items.reduce((sum, item) => {
    const qty = Math.max(1, Math.floor(Number(item.quantity)) || 1);
    const priceCents = Math.max(0, Math.floor(Number(item.unit_price_cents)) || 0);
    return sum + qty * priceCents;
  }, 0);
  const totalBRL = formatCurrency(computedTotal);

  return (
    <PublicLayout>
      <div className="min-h-dvh py-8 px-4 sm:px-6">
        <meta
          name="description"
          content={`Plano de Tratamento - ${plan.title} | ${CLINIC_NAME}`}
        />
        <title>{`Plano de Tratamento | ${CLINIC_NAME}`}</title>

        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
              <div className="text-white/90 text-sm font-medium mb-1">{CLINIC_NAME}</div>
              <h1 className="text-xl font-bold text-white">Plano de Tratamento</h1>
              <h2 className="text-lg font-semibold text-white/95 mt-1">{plan.title}</h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Patient */}
              <div className="text-sm text-slate-600">
                Paciente: <strong className="text-slate-800">{plan.patient_display_name}</strong>
              </div>

              {/* Items */}
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200">
                      <th className="text-left py-2 font-semibold text-slate-700">
                        Procedimento
                      </th>
                      <th className="text-center py-2 font-semibold text-slate-700 w-12">
                        Qtd
                      </th>
                      <th className="text-right py-2 font-semibold text-slate-700">
                        Valor un.
                      </th>
                      <th className="text-right py-2 font-semibold text-slate-700">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-3 text-slate-700">
                          <div>{item.procedure_name_snapshot}</div>
                          {item.procedure_description_snapshot && (
                            <div className="text-xs text-slate-500 mt-0.5">
                              {item.procedure_description_snapshot}
                            </div>
                          )}
                        </td>
                        <td className="text-center py-3 text-slate-600">{item.quantity}</td>
                        <td className="text-right py-3 text-slate-600">
                          {formatCurrency(item.unit_price_cents)}
                        </td>
                        <td className="text-right py-3 font-medium">
                          {formatCurrency(item.line_total_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total */}
              <div className="pt-2 border-t-2 border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Total</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {totalBRL}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {plan.notes && plan.notes.trim() && (
                <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-lg p-4">
                  {plan.notes.trim()}
                </div>
              )}

              {/* Validity / Expires */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  Emitido em {formatDate(plan.issued_at)}
                </span>
                <span>Válido por {plan.validity_days} dias</span>
              </div>
            </div>

            {/* CTA WhatsApp */}
            <div className="px-6 pb-6">
              <a
                href={`https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(
                  `Olá! Vi meu Plano de Tratamento (${plan.title}) com total ${totalBRL} e gostaria de tirar dúvidas.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
              >
                <MessageCircle size={20} />
                Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PublicTreatmentPlanScreen;
