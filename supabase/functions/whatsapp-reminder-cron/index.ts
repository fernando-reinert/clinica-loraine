import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// Evolution API — configure EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE
// as Supabase secrets (supabase secrets set KEY=VALUE).
const EVOLUTION_API_URL = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/$/, '');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? 'clinica_loraine';

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.startsWith('55') ? cleaned : '55' + cleaned;
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
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
    // Window: appointments starting between 55–65 min from now.
    // With a 5-min cron the 10-min window ensures coverage without duplicates.
    const in55 = new Date(now.getTime() + 55 * 60 * 1000);
    const in65 = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, patient_name, patient_phone, title, start_time, patient_id, patients(phone)')
      .gte('start_time', in55.toISOString())
      .lte('start_time', in65.toISOString())
      .in('status', ['scheduled', 'confirmed']);

    if (error) {
      console.error('[whatsapp-reminder-cron] Erro ao buscar agendamentos:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`[whatsapp-reminder-cron] Agendamentos encontrados: ${appointments?.length ?? 0}`);

    const results = [];

    for (const appt of appointments ?? []) {
      const phone = appt.patient_phone || (appt.patients as any)?.phone;
      if (!phone) {
        console.warn(`[whatsapp-reminder-cron] Agendamento ${appt.id} sem telefone, pulando.`);
        continue;
      }

      // Deduplication: skip if reminder already sent for this appointment
      const { data: existing } = await supabase
        .from('whatsapp_reminders_log')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('type', 'reminder_1h')
        .maybeSingle();

      if (existing) {
        console.log(`[whatsapp-reminder-cron] Lembrete já enviado para ${appt.id}, pulando.`);
        continue;
      }

      const startDate = new Date(appt.start_time);
      const firstName = (appt.patient_name as string ?? '').split(' ')[0];
      const service = (appt.title as string ?? '').trim() || 'sua consulta';

      const message = [
        `Olá ${firstName}! 👋`,
        ``,
        `Lembramos do seu agendamento na *Clínica Loraine* daqui a 1 hora.`,
        ``,
        `🩺 Serviço: *${service}*`,
        `📅 Data: ${formatDateBR(startDate)}`,
        `⏰ Horário: ${formatTimeBR(startDate)}`,
        ``,
        `Chegue com 10 minutos de antecedência.`,
        `Precisando reagendar, entre em contato conosco.`,
        ``,
        `Até logo! ✨`,
      ].join('\n');

      const sendResult = await sendWhatsApp(phone, message);

      if (sendResult.ok) {
        await supabase.from('whatsapp_reminders_log').insert({
          appointment_id: appt.id,
          type: 'reminder_1h',
          phone,
          sent_at: new Date().toISOString(),
        });

        await supabase
          .from('appointments')
          .update({ whatsapp_reminder_sent: true })
          .eq('id', appt.id);

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
