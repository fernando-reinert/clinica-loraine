import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WHATSAPP_SEND_URL = `${SUPABASE_URL}/functions/v1/whatsapp-send`;

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
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

Deno.serve(async (_req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const now = new Date();
    // Janela: agendamentos que começam entre 55 min e 65 min a partir de agora.
    // Com cron a cada 5 min, a janela de 10 min garante cobertura sem duplicatas.
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

      // Deduplicação: verifica se lembrete já foi enviado para este agendamento
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
      const message = [
        `Olá ${firstName}, lembrete da sua consulta hoje.`,
        ``,
        `Data: ${formatDateBR(startDate)}`,
        `Horário: ${formatTimeBR(startDate)}`,
        ``,
        `Clínica Loraine.`,
      ].join('\n');

      const sendRes = await fetch(WHATSAPP_SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message }),
      });

      const sendResult = await sendRes.json();

      if (sendRes.ok) {
        // Registra no log de deduplicação
        await supabase.from('whatsapp_reminders_log').insert({
          appointment_id: appt.id,
          type: 'reminder_1h',
          phone,
          sent_at: new Date().toISOString(),
        });

        // Marca flag no agendamento para visibilidade
        await supabase
          .from('appointments')
          .update({ whatsapp_reminder_sent: true })
          .eq('id', appt.id);

        results.push({ appointment_id: appt.id, status: 'sent', phone });
        console.log(`[whatsapp-reminder-cron] Lembrete enviado para ${phone} (${appt.id})`);
      } else {
        results.push({ appointment_id: appt.id, status: 'error', error: sendResult });
        console.error(`[whatsapp-reminder-cron] Erro ao enviar para ${phone}:`, sendResult);
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
