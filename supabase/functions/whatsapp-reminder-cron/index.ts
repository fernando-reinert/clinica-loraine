import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Evolution API — configure EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE
// as Supabase secrets (supabase secrets set KEY=VALUE).
const EVOLUTION_API_URL = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/$/, '');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? 'clinica_loraine';

// Janela de tolerância ao redor do horário-alvo do lembrete (o cron roda a cada minuto).
const TOLERANCE_MINUTES = 5;
const REMINDER_OPTIONS_MINUTES = [60, 120, 180];

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.startsWith('55') ? cleaned : '55' + cleaned;
}

function formatTimeBR(date: Date): string {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  });
}

async function sendWhatsApp(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { ok: false, error: 'EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados como secrets do Supabase' };
  }

  const number = formatPhone(phone);
  const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    },
    body: JSON.stringify({ number, text: message }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    return { ok: false, error: `Evolution API ${res.status}: ${detail.slice(0, 200)}` };
  }

  return { ok: true };
}

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const now = new Date();
    const minOffset = Math.min(...REMINDER_OPTIONS_MINUTES);
    const maxOffset = Math.max(...REMINDER_OPTIONS_MINUTES);

    // Janela ampla o suficiente para cobrir 1h/2h/3h antes, com tolerância nas bordas.
    // O filtro exato por whatsapp_reminder_minutes_before é feito em código, por linha.
    const windowStart = new Date(now.getTime() + (minOffset - TOLERANCE_MINUTES) * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (maxOffset + TOLERANCE_MINUTES) * 60 * 1000);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, patient_name, patient_phone, title, start_time, patient_id, whatsapp_reminder_minutes_before, patients(phone)')
      .eq('whatsapp_reminder_enabled', true)
      .eq('whatsapp_reminder_sent', false)
      .not('status', 'in', '(cancelled,completed)')
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString());

    if (error) {
      console.error('[whatsapp-reminder-cron] Erro ao buscar agendamentos:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`[whatsapp-reminder-cron] Candidatos na janela ampla: ${appointments?.length ?? 0}`);

    const results = [];

    for (const appt of appointments ?? []) {
      const minutesBefore = (appt.whatsapp_reminder_minutes_before as number) ?? 120;
      const startDate = new Date(appt.start_time);
      const targetTime = startDate.getTime() - minutesBefore * 60 * 1000;
      const diffMinutes = Math.abs(now.getTime() - targetTime) / (60 * 1000);

      // Fora da janela de tolerância deste agendamento específico — ainda não é a hora.
      if (diffMinutes > TOLERANCE_MINUTES) continue;

      const phone = appt.patient_phone || (appt.patients as any)?.phone;
      if (!phone) {
        console.warn(`[whatsapp-reminder-cron] Agendamento ${appt.id} sem telefone, pulando.`);
        continue;
      }

      const firstName = (appt.patient_name as string ?? '').split(' ')[0];
      const message = `Olá ${firstName}! 👋 Você tem um horário agendado hoje às ${formatTimeBR(startDate)} na Clínica Loraine. Te esperamos! 😊`;

      const sendResult = await sendWhatsApp(phone, message);

      if (sendResult.ok) {
        await supabase
          .from('appointments')
          .update({ whatsapp_reminder_sent: true })
          .eq('id', appt.id);

        await supabase.from('whatsapp_reminders_log').insert({
          appointment_id: appt.id,
          type: `reminder_${minutesBefore}min`,
          phone,
          sent_at: new Date().toISOString(),
        });

        results.push({ appointment_id: appt.id, status: 'sent', phone });
        console.log(`[whatsapp-reminder-cron] Lembrete enviado para ${phone} (${appt.id})`);
      } else {
        results.push({ appointment_id: appt.id, status: 'error', error: sendResult.error });
        console.error(`[whatsapp-reminder-cron] Erro ao enviar para ${phone}:`, sendResult.error);
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[whatsapp-reminder-cron] Erro inesperado:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
