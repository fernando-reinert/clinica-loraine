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

/** Cria convite por link para staff (owner only). Retorna signupUrl. */
export async function createStaffInvite(
  payload: CreateStaffInvitePayload
): Promise<CreateStaffInviteResponse> {
  const email = payload.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('Informe um e-mail válido.');
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Sessão inválida. Faça login novamente.');
  }

  const cleanPayload: CreateStaffInvitePayload = {
    ...payload,
    email,
  };

  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/createStaffInvite`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(cleanPayload),
  });

  let json: CreateStaffInviteResponse | { ok: false; error: string; code?: string } | null = null;
  try {
    json = (await res.json()) as typeof json;
  } catch {
    json = null;
  }

  if (!res.ok || !json) {
    const msg = json && 'error' in json && json.error
      ? json.error
      : 'Falha ao criar convite';
    throw new Error(msg);
  }

  if (!('ok' in json) || !json.ok || !('signupUrl' in json)) {
    const msg = 'error' in json && json.error
      ? json.error
      : 'Resposta inválida do servidor ao criar convite';
    throw new Error(msg);
  }

  return json as CreateStaffInviteResponse;
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
