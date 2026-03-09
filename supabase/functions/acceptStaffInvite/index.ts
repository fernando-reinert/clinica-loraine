// Edge Function: accept staff invite (signup by link). No auth required.
// OPTIONS returns 200 with CORS first; then POST validates invite and creates/links user.
/// <reference path="../deno.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient } from "../_shared/admin-auth.ts";
import {
  corsPreflightResponse,
  jsonHeadersWithCors,
  isAllowedOrigin,
} from "../_shared/cors.ts";
import { sha256Hex } from "../_shared/hash.ts";
import { validatePasswordStrength } from "../_shared/password.ts";

const CODE_MIN_LENGTH = 32;

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  console.log("[acceptStaffInvite] origin:", origin, "method:", req.method);

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
      console.error("[acceptStaffInvite] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Configuração Supabase ausente na Edge Function.",
          code: "supabase_env_missing",
        }),
        { status: 500, headers },
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const emailNormalized = emailRaw.toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";
    const fullName =
      (typeof body?.fullName === "string" ? body.fullName : typeof body?.full_name === "string" ? body.full_name : "")
        .trim() || "";
    const birthDate =
      (typeof body?.birthDate === "string" ? body.birthDate : typeof body?.birth_date === "string" ? body.birth_date : "")
        .trim() || null;
    const cpf =
      (typeof body?.cpf === "string" ? body.cpf : "").trim() || null;

    if (code.length < CODE_MIN_LENGTH || !/^[A-Za-z0-9_-]+$/.test(code)) {
      return new Response(JSON.stringify({ ok: false, error: "Link inválido ou expirado.", code: "invalid_code" }), {
        status: 400,
        headers,
      });
    }
    if (!fullName) {
      return new Response(JSON.stringify({ ok: false, error: "Nome completo é obrigatório.", code: "full_name_required" }), {
        status: 400,
        headers,
      });
    }
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      return new Response(JSON.stringify({ ok: false, error: "E-mail inválido.", code: "invalid_email" }), {
        status: 400,
        headers,
      });
    }

    const pwdCheck = validatePasswordStrength(password);
    if (!pwdCheck.ok) {
      return new Response(JSON.stringify({ ok: false, error: pwdCheck.error, code: "weak_password" }), {
        status: 400,
        headers,
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
      return new Response(JSON.stringify({ ok: false, error: "Link inválido ou expirado.", code: "invite_not_found" }), {
        status: 400,
        headers,
      });
    }

    if (emailNormalized !== invite.invite_email_normalized) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Este link é válido apenas para ${invite.invite_email}.`,
          code: "email_mismatch",
        }),
        { status: 403, headers }
      );
    }

    let userId: string;

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: invite.invite_email,
      password,
      email_confirm: true,
    });

    if (createError) {
      const msg = (createError.message ?? "").toLowerCase();
      if (msg.includes("already") || msg.includes("exist")) {
        const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingUser = list?.users?.find((u) => (u.email ?? "").toLowerCase() === invite.invite_email_normalized);
        if (!existingUser) {
          console.error("[acceptStaffInvite] user exists but listUsers did not find:", invite.invite_email);
          return new Response(
            JSON.stringify({ ok: false, error: "Falha ao localizar usuário existente.", code: "existing_user_not_found" }),
            { status: 500, headers }
          );
        }
        userId = existingUser.id;

        const { data: existingProfile } = await supabase
          .from("user_profiles")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingProfile) {
          return new Response(JSON.stringify({ ok: false, error: "Usuário já cadastrado.", code: "user_already_registered" }), {
            status: 409,
            headers,
          });
        }
      } else {
        console.error("[acceptStaffInvite] createUser error:", createError);
        return new Response(
          JSON.stringify({ ok: false, error: createError.message ?? "Falha ao criar conta.", code: "create_user_failed" }),
          { status: 400, headers }
        );
      }
    } else {
      userId = newUser?.user?.id ?? "";
      if (!userId) {
        return new Response(JSON.stringify({ ok: false, error: "Falha ao criar conta.", code: "user_id_missing" }), {
          status: 500,
          headers,
        });
      }
    }

    const { error: profileError } = await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        tenant_id: invite.tenant_id,
        email: invite.invite_email,
        role: invite.role ?? "staff",
        is_active: false,
      },
      { onConflict: "user_id" }
    );

    if (profileError) {
      console.error("[acceptStaffInvite] user_profiles upsert error:", profileError);
      return new Response(JSON.stringify({ ok: false, error: "Falha ao criar perfil.", code: "profile_upsert_failed" }), {
        status: 500,
        headers,
      });
    }

    const { error: detailsError } = await supabase.from("staff_details").upsert(
      {
        user_id: userId,
        full_name: fullName,
        birth_date: birthDate || null,
        cpf: cpf || null,
      },
      { onConflict: "user_id" }
    );

    if (detailsError) {
      console.error("[acceptStaffInvite] staff_details upsert error:", detailsError);
    }

    const { error: usedError } = await supabase
      .from("staff_invites")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invite.id);

    if (usedError) {
      console.error("[acceptStaffInvite] staff_invites used_at error:", usedError);
    }

    console.log("[acceptStaffInvite] signup completed for user_id:", userId);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (e) {
    console.error("[acceptStaffInvite] exception:", e);
    return new Response(JSON.stringify({ ok: false, error: "Erro interno", code: "internal_error" }), {
      status: 500,
      headers: jsonHeadersWithCors(req),
    });
  }
});
