// Edge Function: setStaffPassword (admin/owner only)
// Atualiza a senha de um usuário do Supabase Auth a partir do e-mail.
// Uso interno, chamado pelo painel admin.
/// <reference path="../deno.d.ts" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient, getCallerProfile } from "../_shared/admin-auth.ts";
import {
  corsPreflightResponse,
  jsonHeadersWithCors,
  isAllowedOrigin,
} from "../_shared/cors.ts";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(pwd: string): boolean {
  if (!pwd || typeof pwd !== "string") return false;
  if (pwd.length < 8 || pwd.length > 72) return false;
  // Pelo menos uma letra e um dígito (validação simples, backend-side).
  if (!/[A-Za-z]/.test(pwd)) return false;
  if (!/[0-9]/.test(pwd)) return false;
  return true;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  console.log("[setStaffPassword] origin:", origin, "method:", req.method);

  if (req.method === "OPTIONS") {
    return corsPreflightResponse(req);
  }

  const headers = jsonHeadersWithCors(req);

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Método não permitido",
        code: "method_not_allowed",
      }),
      { status: 405, headers },
    );
  }

  if (!isAllowedOrigin(origin)) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Origin não permitido",
        code: "origin_not_allowed",
      }),
      { status: 403, headers },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      console.error("[setStaffPassword] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Configuração Supabase ausente na Edge Function.",
          code: "supabase_env_missing",
        }),
        { status: 500, headers },
      );
    }

    // Autenticação do chamador: precisa ser owner ou admin e ativo.
    const caller = await getCallerProfile(req, false);
    if (!caller || !caller.is_active || (caller.role !== "owner" && caller.role !== "admin")) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Não autorizado: apenas owner/admin ativo",
          code: "forbidden_admin_only",
        }),
        { status: 403, headers },
      );
    }

    const body = await req.json().catch(() => ({}));
    const emailRaw = typeof body?.email === "string" ? body.email.trim() : "";
    const email = emailRaw.toLowerCase();
    const password = typeof body?.password === "string" ? body.password : "";

    console.log("[setStaffPassword] payload received", {
      email,
      hasPassword: Boolean(password),
    });

    if (!email || !isValidEmail(email)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Email inválido",
          code: "invalid_email",
        }),
        { status: 400, headers },
      );
    }

    if (!isValidPassword(password)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Senha inválida. Use pelo menos 8 caracteres com letras e números.",
          code: "invalid_password",
        }),
        { status: 400, headers },
      );
    }

    const supabase = getAdminClient();

    // Buscar usuário por e-mail via Admin API (listUsers).
    console.log("[setStaffPassword] listing users to find email");
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("[setStaffPassword] listUsers error:", listError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Falha ao buscar usuário",
          code: "list_users_failed",
          details: (listError as any)?.message ?? (listError as any),
        }),
        { status: 500, headers },
      );
    }

    const user = usersData?.users?.find(
      (u: any) => (u.email ?? "").toLowerCase() === email,
    );

    if (!user) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Usuário não encontrado para o e-mail informado.",
          code: "user_not_found",
        }),
        { status: 404, headers },
      );
    }

    console.log("[setStaffPassword] updating password for user", { userId: user.id });
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password,
    });

    if (updateError) {
      console.error("[setStaffPassword] updateUserById error:", updateError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Falha ao atualizar senha",
          code: "update_failed",
          details: (updateError as any)?.message ?? (updateError as any),
        }),
        { status: 500, headers },
      );
    }

    console.log("[setStaffPassword] password updated successfully");
    return new Response(
      JSON.stringify({
        ok: true,
        userId: user.id,
        email,
      }),
      { status: 200, headers },
    );
  } catch (e) {
    console.error("[setStaffPassword] exception:", e);
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

