// Edge Function: list user_profiles for a tenant (owner only). Uses service role to avoid RLS recursion.
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
    const tenantId = typeof body?.tenant_id === "string" ? body.tenant_id.trim() : "";
    if (!tenantId || tenantId !== caller.tenant_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "tenant_id inválido ou não autorizado" }),
        { status: 403, headers: cors() }
      );
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, tenant_id, email, role, is_active, created_at")
      .eq("tenant_id", tenantId)
      .order("email");

    if (error) {
      console.error("[listTenantUsers] select error:", error);
      return new Response(
        JSON.stringify({ ok: false, error: "Falha ao listar usuários" }),
        { status: 500, headers: cors() }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, users: data ?? [] }),
      { status: 200, headers: cors() }
    );
  } catch (e) {
    console.error("[listTenantUsers] exception:", e);
    return new Response(JSON.stringify({ ok: false, error: "Erro interno" }), {
      status: 500,
      headers: jsonHeadersWithCors(req),
    });
  }
});
