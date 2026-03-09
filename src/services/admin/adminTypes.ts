// Tipos para painel admin (user_profiles, invite, staff invite link).

export type ProfileRole = 'owner' | 'viewer' | 'staff' | 'admin';

export interface UserProfileRow {
  user_id: string;
  tenant_id: string;
  email: string;
  role: ProfileRole;
  is_active: boolean;
  created_at: string;
}

export interface InviteUserPayload {
  email: string;
}

export interface CreateStaffInvitePayload {
  email: string;
  role?: 'viewer' | 'staff' | 'admin';
  expiresMinutes?: number;
}

export interface CreateStaffInviteResponse {
  ok: true;
  code: string;
  signupUrl: string;
}

export interface CompleteStaffSignupPayload {
  code: string;
  full_name: string;
  birth_date?: string | null;
  cpf?: string | null;
  email: string;
  password: string;
}

export interface StaffSignupErrorResponse {
  ok: false;
  error: string;
}
