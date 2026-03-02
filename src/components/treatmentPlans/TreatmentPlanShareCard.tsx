// src/components/treatmentPlans/TreatmentPlanShareCard.tsx
// Fixed-size share card for PNG export (1080x1350). Use local/system fonts only.
import React from 'react';
import type { TreatmentPlanWithItems } from '../../types/treatmentPlan';

const WIDTH = 1080;
const HEIGHT = 1350;

export interface TreatmentPlanShareCardProps {
  plan: TreatmentPlanWithItems;
  patientDisplayName: string;
  clinicName: string;
  contactWhatsApp?: string;
}

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

export const TreatmentPlanShareCard: React.FC<TreatmentPlanShareCardProps> = ({
  plan,
  patientDisplayName,
  clinicName,
  contactWhatsApp,
}) => {
  const totalCents = plan.items.reduce(
    (sum, i) => sum + i.unit_price_cents * i.quantity,
    0
  );
  const displayTotal = plan.total_price_cents > 0 ? plan.total_price_cents : totalCents;

  return (
    <div
      id="treatment-plan-share-card"
      data-testid="treatment-plan-share-card"
      style={{
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: '#ffffff',
        color: '#1a1a1a',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        padding: 48,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Clinic / brand */}
      <div style={{ marginBottom: 24, borderBottom: '2px solid #0f172a', paddingBottom: 16 }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>{clinicName}</div>
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: '#334155', marginBottom: 8 }}>
        Plano de Tratamento
      </div>
      <div style={{ fontSize: 20, fontWeight: 600, color: '#1e293b', marginBottom: 24 }}>
        {plan.title}
      </div>

      <div style={{ fontSize: 14, color: '#64748b', marginBottom: 32 }}>
        Paciente: <strong style={{ color: '#1e293b' }}>{patientDisplayName}</strong>
      </div>

      {/* Items */}
      <div style={{ flex: 1, marginBottom: 24 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '10px 8px', fontWeight: 600 }}>Procedimento</th>
              <th style={{ textAlign: 'center', padding: '10px 8px', fontWeight: 600 }}>Qtd</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>Valor un.</th>
              <th style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {plan.items.map((item) => {
              const lineTotal = item.unit_price_cents * item.quantity;
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 8px', color: '#334155' }}>{item.procedure_name_snapshot}</td>
                  <td style={{ textAlign: 'center', padding: '10px 8px', color: '#475569' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', padding: '10px 8px', color: '#475569' }}>
                    {formatCurrency(item.unit_price_cents)}
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 8px', fontWeight: 600 }}>
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
        Total: {formatCurrency(displayTotal)}
      </div>

      {plan.notes && plan.notes.trim() && (
        <div style={{ marginBottom: 24, fontSize: 13, color: '#475569', whiteSpace: 'pre-wrap' }}>
          {plan.notes.trim()}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#64748b', marginTop: 'auto', paddingTop: 24 }}>
        <div>Emitido em: {formatDate(plan.issued_at)}</div>
        <div>Válido por {plan.validity_days} dias</div>
        {contactWhatsApp && (
          <div style={{ marginTop: 8, fontWeight: 600 }}>Contato / WhatsApp: {contactWhatsApp}</div>
        )}
      </div>
    </div>
  );
};

export const SHARE_CARD_WIDTH = WIDTH;
export const SHARE_CARD_HEIGHT = HEIGHT;
