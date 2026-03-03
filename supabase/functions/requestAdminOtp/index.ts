// Edge Function: request admin OTP — gera código, salva hash, envia para ADMIN_OTP_EMAIL. Rate limit: 3/10 min.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient, getCallerProfile } from "../_shared/admin-auth.ts";
import { corsPreflightResponse, jsonHeadersWithCors } from "../_shared/cors.ts";

const OTP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I,O,0,1
const OTP_LENGTH = 8;
const EXPIRES_MINUTES = 10;
const RATE_LIMIT_COUNT = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function generateOtp(): string {
  const arr = new Uint8Array(OTP_LENGTH);
  crypto.getRandomValues(arr);
  let s = "";
  for (let i = 0; i < OTP_LENGTH; i++) {
    s += OTP_ALPHABET[arr[i]! % OTP_ALPHABET.length];
  }
  return s;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sendEmailResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";
  if (!apiKey) {
    console.error("[requestAdminOtp] RESEND_API_KEY not set");
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error("[requestAdminOtp] Resend error:", res.status, t.slice(0, 200));
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse(req);
  }

  const cors = () => jsonHeadersWithCors(req);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método não permitido" }), {
      status: 405,
      headers: cors(),
    });
  }

  try {
    const caller = await getCallerProfile(req, true);
    if (!caller) {
      return new Response(
        JSON.stringify({ ok: false, error: "Não autorizado: apenas owner ativo" }),
        { status: 403, headers: cors() }
      );
    }

    const otpToEmail = Deno.env.get("ADMIN_OTP_EMAIL")?.trim();
    if (!otpToEmail) {
      console.error("[requestAdminOtp] ADMIN_OTP_EMAIL not set");
      return new Response(
        JSON.stringify({ ok: false, error: "Configuração OTP ausente (ADMIN_OTP_EMAIL)" }),
        { status: 500, headers: cors() }
      );
    }

    const supabase = getAdminClient();
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { count, error: countError } = await supabase
      .from("admin_access_challenges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", caller.user_id)
      .gte("created_at", since);

    if (countError || (count ?? 0) >= RATE_LIMIT_COUNT) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Muitos códigos solicitados. Tente novamente em alguns minutos.",
        }),
        { status: 429, headers: cors() }
      );
    }

    const code = generateOtp();
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000).toISOString();

    const { error: insertError } = await supabase.from("admin_access_challenges").insert({
      user_id: caller.user_id,
      code_hash: codeHash,
      expires_at: expiresAt,
      used_at: null,
      attempts: 0,
    });

    if (insertError) {
      console.error("[requestAdminOtp] insert error:", insertError);
      return new Response(
        JSON.stringify({ ok: false, error: "Erro ao gerar código" }),
        { status: 500, headers: cors() }
      );
    }

    const html = `
      <p>Seu código de acesso ao painel admin é: <strong>${code}</strong></p>
      <p>Válido por ${EXPIRES_MINUTES} minutos. Não compartilhe.</p>
    `;
    const sent = await sendEmailResend(otpToEmail, "Código de acesso - Painel Admin", html);
    if (!sent) {
      return new Response(
        JSON.stringify({ ok: false, error: "Falha ao enviar e-mail" }),
        { status: 502, headers: cors() }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: cors(),
    });
  } catch (e) {
    console.error("[requestAdminOtp] exception:", e);
    return new Response(JSON.stringify({ ok: false, error: "Erro interno" }), {
      status: 500,
      headers: jsonHeadersWithCors(req),
    });
  }
});
