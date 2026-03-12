import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? '';
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? '';
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? 'clinica_loraine';

function formatPhone(phone: string): string {
  // Remove tudo que não é número
  let cleaned = phone.replace(/\D/g, '');
  // Se não tem DDI, adiciona 55 (Brasil)
  if (!cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone e message são obrigatórios' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(JSON.stringify({ error: 'EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurados' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const formattedPhone = formatPhone(phone);

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', result);
      return new Response(JSON.stringify({ error: 'Erro ao enviar mensagem', details: result }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, result }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
