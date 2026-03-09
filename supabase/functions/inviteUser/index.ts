// Edge Function: invite user by email (owner only). Creates auth user + user_profiles in same tenant.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getAdminClient, getCallerProfile } from "../_shared/admin-auth.ts";
import { corsPreflightResponse, jsonHeadersWithCors } from "../_shared/cors.ts";

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
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ ok: false, error: "Email inválido" }), {
        status: 400,
        headers: cors(),
      });
    }

    const supabase = getAdminClient();

    const { data: invitedUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      { data: { tenant_id: caller.tenant_id } }
    );

    if (inviteError) {
      const msg = inviteError.message ?? "Falha ao convidar";
      return new Response(JSON.stringify({ ok: false, error: msg }), {
        status: 400,
        headers: cors(),
      });
    }

    const newUserId = invitedUser?.user?.id;
    if (!newUserId) {
      return new Response(JSON.stringify({ ok: false, error: "Usuário não criado" }), {
        status: 500,
        headers: cors(),
      });
    }

    const { error: upsertError } = await supabase.from("user_profiles").upsert(
      {
        user_id: newUserId,
        tenant_id: caller.tenant_id,
        email,
        role: "staff",
        is_active: true,
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      console.error("[inviteUser] user_profiles upsert error:", upsertError);
      return new Response(JSON.stringify({ ok: false, error: "Falha ao criar perfil" }), {
        status: 500,
        headers: cors(),
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: cors(),
    });
  } catch (e) {
    console.error("[inviteUser] exception:", e);
    return new Response(JSON.stringify({ ok: false, error: "Erro interno" }), {
      status: 500,
      headers: jsonHeadersWithCors(req),
    });
  }
});
