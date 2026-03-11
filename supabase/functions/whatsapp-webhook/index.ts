// supabase/functions/whatsapp-webhook/index.ts
// Recebe eventos da Evolution API e os processa (conexão, mensagens, QR code)
// Autenticação: valida o apikey da Evolution API no header ou body

/// <reference path="../deno.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Tipos mínimos necessários — espelham whatsapp.types.ts
type ConnectionStatus = "open" | "close" | "connecting";

interface WebhookBasePayload {
  event: string;
  instance: string;
  destination: string;
  date_time: string;
  sender: string;
  server_url: string;
  apikey: string;
}

interface ConnectionUpdateData {
  instance: string;
  state?: ConnectionStatus;
  statusReason?: number;
  wuid?: string;
  profileName?: string;
  profilePicUrl?: string;
}

interface MessageData {
  key: { remoteJid: string; fromMe: boolean; id: string };
  pushName?: string;
  messageType?: string;
  messageTimestamp?: number;
  status?: string;
  message?: Record<string, unknown>;
  source?: string;
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  // Evolution API faz POST; também aceita GET para health check
  if (req.method === "GET") {
    return new Response(JSON.stringify({ ok: true, service: "whatsapp-webhook" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ------------------------------------------------------------------
  // Parse do payload
  // ------------------------------------------------------------------
  let payload: WebhookBasePayload & { data?: unknown };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ------------------------------------------------------------------
  // Validação do apikey (segurança básica)
  // ------------------------------------------------------------------
  const expectedApiKey = Deno.env.get("EVOLUTION_API_KEY");
  if (expectedApiKey) {
    const incomingKey =
      req.headers.get("apikey") ??
      req.headers.get("Authorization")?.replace("Bearer ", "") ??
      payload.apikey;
    if (incomingKey !== expectedApiKey) {
      console.warn("[whatsapp-webhook] apikey mismatch — rejecting");
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const event = payload.event;
  const instanceName = payload.instance ?? "unknown";
  console.log(`[whatsapp-webhook] event=${event} instance=${instanceName}`);

  // Supabase admin client para salvar registros
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    console.error("[whatsapp-webhook] SUPABASE_URL ou SERVICE_ROLE_KEY ausente");
    return new Response(JSON.stringify({ ok: false, error: "supabase_env_missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // ------------------------------------------------------------------
  // Roteamento por evento
  // ------------------------------------------------------------------
  try {
    switch (event) {
      case "CONNECTION_UPDATE":
        await handleConnectionUpdate(supabase, instanceName, payload.data as ConnectionUpdateData);
        break;

      case "QRCODE_UPDATED":
        // QR code atualizado — por ora apenas logamos; futuro: notificar o frontend via Realtime
        console.log(`[whatsapp-webhook] QR code atualizado para instância ${instanceName}`);
        break;

      case "MESSAGES_UPSERT":
        await handleMessagesUpsert(supabase, instanceName, payload.data as MessageData | MessageData[]);
        break;

      case "MESSAGES_UPDATE":
        // Status de mensagem atualizado (entregue, lido…) — log apenas por ora
        console.log(`[whatsapp-webhook] message status update instance=${instanceName}`);
        break;

      default:
        console.log(`[whatsapp-webhook] evento não tratado: ${event}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[whatsapp-webhook] erro no processamento:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "processing_error",
        detail: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

// ---------------------------------------------------------------------------
// Handlers por evento
// ---------------------------------------------------------------------------

async function handleConnectionUpdate(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  instanceName: string,
  data: ConnectionUpdateData,
): Promise<void> {
  const state = data?.state;
  console.log(`[whatsapp-webhook] connection update instance=${instanceName} state=${state}`);

  if (!state) return;

  // Persiste o estado de conexão na tabela whatsapp_instances (se existir)
  // A tabela é criada via migration separada — ver docs/whatsapp-integration.md
  const { error } = await supabase
    .from("whatsapp_instances")
    .upsert(
      {
        instance_name: instanceName,
        status: state,
        wuid: data.wuid ?? null,
        profile_name: data.profileName ?? null,
        profile_pic_url: data.profilePicUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "instance_name" },
    );

  if (error) {
    // Se a tabela ainda não foi criada, apenas loga sem quebrar
    console.warn("[whatsapp-webhook] upsert whatsapp_instances:", error.message);
  }
}

async function handleMessagesUpsert(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  instanceName: string,
  data: MessageData | MessageData[],
): Promise<void> {
  const messages = Array.isArray(data) ? data : [data];

  for (const msg of messages) {
    // Ignora mensagens enviadas por nós mesmos
    if (msg.key?.fromMe) continue;

    const remoteJid = msg.key?.remoteJid ?? "";
    const isGroup = remoteJid.endsWith("@g.us");
    if (isGroup) continue; // ignora grupos por padrão

    console.log(
      `[whatsapp-webhook] nova mensagem instance=${instanceName} from=${remoteJid} type=${msg.messageType}`,
    );

    // Persiste mensagem recebida na tabela whatsapp_messages (se existir)
    const { error } = await supabase.from("whatsapp_messages").insert({
      instance_name: instanceName,
      message_id: msg.key?.id,
      remote_jid: remoteJid,
      from_me: false,
      push_name: msg.pushName ?? null,
      message_type: msg.messageType ?? null,
      message_timestamp: msg.messageTimestamp ?? null,
      status: msg.status ?? null,
      raw_payload: msg,
    });

    if (error) {
      console.warn("[whatsapp-webhook] insert whatsapp_messages:", error.message);
    }
  }
}
