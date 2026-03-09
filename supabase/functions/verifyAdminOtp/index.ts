// Edge Function: verify admin OTP — valida caller (owner ativo), compara hash, marca usado, retorna unlockedUntil (30 min).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient, getCallerProfile } from "../_shared/admin-auth.ts";
import { corsPreflightResponse, jsonHeadersWithCors } from "../_shared/cors.ts";

const MAX_ATTEMPTS = 5;
const UNLOCK_DURATION_MS = 30 * 60 * 1000;

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code) {
      return new Response(JSON.stringify({ ok: false, error: "Código obrigatório" }), {
        status: 400,
        headers: cors(),
      });
    }

    const supabase = getAdminClient();
    const now = new Date().toISOString();

    const { data: challenges, error: listError } = await supabase
      .from("admin_access_challenges")
      .select("id, code_hash, attempts")
      .eq("user_id", caller.user_id)
      .is("used_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1);

    if (listError || !challenges?.length) {
      return new Response(
        JSON.stringify({ ok: false, error: "Código expirado ou inválido. Solicite um novo." }),
        { status: 400, headers: cors() }
      );
    }

    const challenge = challenges[0]!;
    if ((challenge.attempts ?? 0) >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ ok: false, error: "Muitas tentativas. Solicite um novo código." }),
        { status: 429, headers: cors() }
      );
    }

    const codeHash = await sha256Hex(code);
    if (challenge.code_hash !== codeHash) {
      await supabase
        .from("admin_access_challenges")
        .update({ attempts: (challenge.attempts ?? 0) + 1 })
        .eq("id", challenge.id);
      return new Response(JSON.stringify({ ok: false, error: "Código incorreto" }), {
        status: 401,
        headers: cors(),
      });
    }

    await supabase
      .from("admin_access_challenges")
      .update({ used_at: now })
      .eq("id", challenge.id);

    const unlockedUntil = new Date(Date.now() + UNLOCK_DURATION_MS).toISOString();

    return new Response(JSON.stringify({ ok: true, unlockedUntil }), {
      status: 200,
      headers: cors(),
    });
  } catch (e) {
    console.error("[verifyAdminOtp] exception:", e);
    return new Response(JSON.stringify({ ok: false, error: "Erro interno" }), {
      status: 500,
      headers: jsonHeadersWithCors(req),
    });
  }
});
