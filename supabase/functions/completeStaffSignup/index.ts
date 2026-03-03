// Edge Function: complete staff signup by invite code (public). Email-locked, single-use, password validated.
// CORS: OPTIONS always returns 200 with CORS headers — no logic before OPTIONS.
/// <reference path="../deno.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient } from "../_shared/admin-auth.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { validatePasswordStrength } from "../_shared/password.ts";
import { consumeRateLimit } from "../_shared/rate-limit.ts";
import {
  corsPreflightResponse,
  jsonHeadersWithCors,
  isAllowedOrigin,
} from "../_shared/cors.ts";

const CODE_MIN_LENGTH = 32;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  console.log("[completeStaffSignup] origin:", origin, "method:", req.method);

  // OPTIONS: sempre 200 com CORS — sem auth, sem parsing, sem Supabase
  if (req.method === "OPTIONS") {
    return corsPreflightResponse(req);
  }

  const jsonHeaders = jsonHeadersWithCors(req) as HeadersInit;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método não permitido", code: "method_not_allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  if (!isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({ ok: false, error: "Origin não permitido", code: "origin_not_allowed" }),
      { status: 403, headers: jsonHeaders },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      console.error("[completeStaffSignup] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Configuração Supabase ausente na Edge Function.",
          code: "supabase_env_missing",
        }),
        { status: 500, headers: jsonHeaders },
      );
    }

    if (!consumeRateLimit(req)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Muitas tentativas. Tente novamente em alguns minutos.",
          code: "rate_limited",
        }),
        { status: 429, headers: jsonHeaders },
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const fullName = typeof body?.full_name === "string" ? body.full_name.trim() : "";
    const birthDate = typeof body?.birth_date === "string" ? body.birth_date.trim() || null : null;
    const cpf = typeof body?.cpf === "string" ? body.cpf.trim() || null : null;
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const emailNormalized = emailRaw.toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";

    if (code.length < CODE_MIN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(code)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Link inválido ou expirado.", code: "invalid_code" }),
        { status: 400, headers: jsonHeaders },
      );
    }
    if (!fullName) {
      return new Response(JSON.stringify({ ok: false, error: "Nome completo é obrigatório.", code: "full_name_required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      return new Response(JSON.stringify({ ok: false, error: "E-mail inválido.", code: "invalid_email" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.ok) {
      return new Response(JSON.stringify({ ok: false, error: pwdCheck.error, code: "weak_password" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const codeHash = await sha256Hex(code);
    const supabase = getAdminClient();

    const { data: invite, error: inviteError } = await supabase
      .from("staff_invites")
      .select("id, tenant_id, invite_email, invite_email_normalized, role")
      .eq("code_hash", codeHash)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (inviteError || !invite) {
      return new Response(
        JSON.stringify({ ok: false, error: "Link inválido ou expirado.", code: "invite_not_found" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    if (emailNormalized !== invite.invite_email_normalized) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Este link é válido apenas para ${invite.invite_email}.`,
          code: "email_mismatch",
        }),
        { status: 403, headers: jsonHeaders },
      );
    }

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: invite.invite_email,
      password,
      email_confirm: true,
    });

    if (createError) {
      if (createError.message?.toLowerCase().includes("already") || createError.message?.toLowerCase().includes("exist")) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Já existe uma conta com este e-mail. Faça login ou recupere a senha.",
            code: "user_already_registered",
          }),
          { status: 409, headers: jsonHeaders },
        );
      }
      console.error("[completeStaffSignup] createUser error:", createError);
      return new Response(
        JSON.stringify({ ok: false, error: createError.message ?? "Falha ao criar conta.", code: "create_user_failed" }),
        { status: 400, headers: jsonHeaders },
      );
    }

    const userId = newUser?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: "Falha ao criar conta.", code: "user_id_missing" }), {
        status: 500,
        headers: jsonHeaders,
      });
    }

    const { error: profileError } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        tenant_id: invite.tenant_id,
        email: invite.invite_email,
        role: invite.role,
        is_active: false,
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error("[completeStaffSignup] user_profiles upsert error:", profileError);
      return new Response(
        JSON.stringify({ ok: false, error: "Falha ao criar perfil.", code: "profile_upsert_failed" }),
        {
          status: 500,
          headers: jsonHeaders,
        },
      );
    }

    const { error: detailsError } = await supabase.from("staff_details").insert({
      user_id: userId,
      full_name: fullName,
      birth_date: birthDate || null,
      cpf: cpf || null,
    });

    if (detailsError) {
      console.error("[completeStaffSignup] staff_details insert error:", detailsError);
      // Profile already created; still mark invite as used
    }

    const { error: usedError } = await supabase
      .from("staff_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (usedError) {
      console.error("[completeStaffSignup] staff_invites used_at error:", usedError);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (e) {
    console.error("[completeStaffSignup] exception:", e);
    return new Response(JSON.stringify({ ok: false, error: "Erro interno", code: "internal_error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
