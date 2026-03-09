// Edge Function: create staff invite link (owner only). Returns signupUrl; code stored only as hash.
// OPTIONS returns 200 with CORS first; no auth/DB before OPTIONS.
/// <reference path="../deno.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient, getCallerProfile } from "../_shared/admin-auth.ts";
import {
  corsPreflightResponse,
  jsonHeadersWithCors,
  isAllowedOrigin,
} from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/hash.ts";

const CODE_BYTES = 32;
const APP_PUBLIC_URL = Deno.env.get("APP_PUBLIC_URL") ?? "https://clinica-aurea.com";

function secureRandomBase64Url(length: number): string {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  const base64 = btoa(String.fromCharCode(...arr));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  console.log("[createStaffInvite] origin:", origin, "method:", req.method);

  if (req.method === "OPTIONS") {
    return corsPreflightResponse(req);
  }

  const headers = jsonHeadersWithCors(req);

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método não permitido", code: "method_not_allowed" }), {
      status: 405,
      headers,
    });
  }

  if (!isAllowedOrigin(origin)) {
    return new Response(JSON.stringify({ ok: false, error: "Origin não permitido", code: "origin_not_allowed" }), {
      status: 403,
      headers,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      console.error("[createStaffInvite] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Configuração Supabase ausente na Edge Function.",
          code: "supabase_env_missing",
        }),
        { status: 500, headers },
      );
    }

    const caller = await getCallerProfile(req, true);
    if (!caller) {
      return new Response(
        JSON.stringify({ ok: false, error: "Não autorizado: apenas owner ativo", code: "forbidden_owner_only" }),
        { status: 403, headers }
      );
    }

    const body = await req.json().catch(() => ({}));
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const inviteEmailNormalized = emailRaw.toLowerCase();
    console.log("[createStaffInvite] payload received", {
      email: inviteEmailNormalized,
      role: body?.role,
      expiresMinutes: body?.expiresMinutes,
    });
    if (!inviteEmailNormalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmailNormalized)) {
      return new Response(JSON.stringify({ ok: false, error: "Email inválido", code: "invalid_email" }), {
        status: 400,
        headers,
      });
    }

    const role = (body?.role === "viewer" || body?.role === "staff" || body?.role === "admin")
      ? body.role
      : "staff";
    const expiresMinutes =
      typeof body?.expiresMinutes === "number" && body.expiresMinutes > 0
        ? Math.min(body.expiresMinutes, 10080)
        : 60;

    const code = secureRandomBase64Url(CODE_BYTES);
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000).toISOString();

    const supabase = getAdminClient();

    const { data: existing } = await supabase
      .from("staff_invites")
      .select("id")
      .eq("tenant_id", caller.tenant_id)
      .eq("invite_email_normalized", inviteEmailNormalized)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Já existe um convite ativo para este e-mail. Cancele ou aguarde expiração.",
          code: "invite_already_exists",
        }),
        { status: 409, headers }
      );
    }

    const { error } = await supabase.from("staff_invites").insert({
      tenant_id: caller.tenant_id,
      created_by_user_id: caller.user_id,
      invite_email: inviteEmailNormalized,
      invite_email_normalized: inviteEmailNormalized,
      code_hash: codeHash,
      role,
      expires_at: expiresAt,
      used_at: null,
    });

    if (error) {
      console.error("[createStaffInvite] insert error:", error);
      const pgCode = (error as any)?.code as string | undefined;
      const details = (error as any)?.details;
      if (pgCode === "23505") {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Conflito ao criar convite (duplicado).",
            code: "invite_duplicate",
            details,
          }),
          { status: 409, headers },
        );
      }
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Falha ao criar convite",
          code: "invite_insert_failed",
          details,
        }),
        {
          status: 500,
          headers,
        },
      );
    }

    const signupUrl = `${APP_PUBLIC_URL.replace(/\/$/, "")}/staff-signup/${code}`;
    console.log("[createStaffInvite] invite created, signupUrl generated");
    return new Response(JSON.stringify({ ok: true, signupUrl }), {
      status: 200,
      headers,
    });
  } catch (e) {
    console.error("[createStaffInvite] exception:", e);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Erro interno",
        code: "internal_error",
        details: e instanceof Error ? e.message : String(e),
      }),
      {
        status: 500,
        headers: jsonHeadersWithCors(req),
      },
    );
  }
});
