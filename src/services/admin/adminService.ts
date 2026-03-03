// Serviço admin: PostgREST em user_profiles + Edge Functions (createStaffInvite, listTenantUsers).
import { supabase, SUPABASE_URL } from '../supabase/client';
import type {
  UserProfileRow,
  CreateStaffInvitePayload,
  CreateStaffInviteResponse,
  CompleteStaffSignupPayload,
  StaffSignupErrorResponse,
} from './adminTypes';

/** Busca perfil do usuário atual (public.user_profiles where user_id = auth.uid()). */
export async function fetchMyAccessProfile(): Promise<UserProfileRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, tenant_id, email, role, is_active, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw new Error(error.message);
  }
  return data as UserProfileRow | null;
}

/** Lista user_profiles do tenant (RLS: owner vê mesmo tenant; requer policy sem recursão). */
export async function fetchTenantUsers(tenantId: string): Promise<UserProfileRow[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_id, tenant_id, email, role, is_active, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [];
    throw new Error(error.message);
  }
  return (data ?? []) as UserProfileRow[];
}

/** Atualiza is_active (RLS: owner mesmo tenant). */
export async function updateUserActive(
  userId: string,
  isActive: boolean
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: isActive })
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
}

/** Convites desativados temporariamente (exigiria Admin API / Edge Function). */
export function inviteUserDisabled(): never {
  throw new Error('Invites disabled');
}

/** Cria convite por link para staff (owner only). Retorna code e signupUrl. */
export async function createStaffInvite(
  payload: CreateStaffInvitePayload
): Promise<CreateStaffInviteResponse> {
  const { data, error } = await supabase.functions.invoke<CreateStaffInviteResponse | { ok: false; error: string }>(
    'createStaffInvite',
    { body: payload }
  );
  if (error) throw new Error(error.message ?? 'Falha ao criar convite');
  if (data && !(data as CreateStaffInviteResponse).ok) {
    const err = (data as { ok: false; error: string }).error;
    throw new Error(err ?? 'Falha ao criar convite');
  }
  if (!data || !('signupUrl' in data)) throw new Error('Resposta inválida');
  return data as CreateStaffInviteResponse;
}

/** Completa cadastro staff por link (endpoint público, sem auth). */
export async function completeStaffSignup(
  payload: CompleteStaffSignupPayload
): Promise<{ ok: true }> {
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/completeStaffSignup`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as CreateStaffInviteResponse | StaffSignupErrorResponse;
  if (!res.ok) {
    const msg = 'error' in json ? json.error : 'Falha ao completar cadastro';
    throw new Error(msg);
  }
  if (!json || !('ok' in json) || !json.ok) {
    throw new Error('error' in json ? json.error : 'Falha ao completar cadastro');
  }
  return { ok: true };
}
