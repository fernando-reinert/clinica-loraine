// Shared: get Supabase admin client and caller profile (role/tenant) for admin Edge Functions.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

export interface CallerProfile {
  user_id: string;
  tenant_id: string;
  email: string;
  role: "owner" | "viewer" | "staff" | "admin";
  is_active: boolean;
}

export function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Get caller user id from Authorization Bearer JWT. Returns null if missing/invalid. */
export async function getCallerUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const supabase = getAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

/** Get caller's profile. Returns null if not found or not owner+active when requireOwner. */
export async function getCallerProfile(
  req: Request,
  requireOwner: boolean
): Promise<CallerProfile | null> {
  const userId = await getCallerUserId(req);
  if (!userId) return null;
  const supabase = getAdminClient();
  const { data: row, error } = await supabase
    .from("user_profiles")
    .select("user_id, tenant_id, email, role, is_active")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !row) return null;
  const profile = row as CallerProfile;
  if (requireOwner && (profile.role !== "owner" || !profile.is_active)) return null;
  return profile;
}
