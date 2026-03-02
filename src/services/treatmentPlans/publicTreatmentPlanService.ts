// src/services/treatmentPlans/publicTreatmentPlanService.ts
// Fetch public treatment plan by token (no auth required)

import { supabase } from '../supabase/client';
import {
  PublicTreatmentPlanSuccessSchema,
  PublicTreatmentPlanErrorSchema,
  type PublicTreatmentPlanResult,
} from '../../types/publicTreatmentPlan';

/**
 * Fetches public treatment plan by token. Safe to call with anon key.
 * Uses RPC get_public_treatment_plan (SECURITY DEFINER).
 */
export async function getPublicTreatmentPlan(
  token: string
): Promise<PublicTreatmentPlanResult> {
  const trimmed = token?.trim();
  if (!trimmed) {
    return { ok: false, error: 'invalid_token' };
  }

  const { data, error } = await supabase.rpc('get_public_treatment_plan', {
    p_token: trimmed,
  });

  if (error) {
    console.error('[PUBLIC_TREATMENT_PLAN] RPC error:', error);
    return { ok: false, error: 'invalid_token' };
  }

  if (data == null || typeof data !== 'object') {
    return { ok: false, error: 'invalid_token' };
  }

  const obj = data as Record<string, unknown>;

  if (obj.error && typeof obj.error === 'string') {
    const parsed = PublicTreatmentPlanErrorSchema.safeParse({ error: obj.error });
    if (parsed.success) {
      return { ok: false, error: parsed.data.error };
    }
    return { ok: false, error: 'invalid_token' };
  }

  const parsed = PublicTreatmentPlanSuccessSchema.safeParse(data);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }

  console.error('[PUBLIC_TREATMENT_PLAN] Invalid response shape:', parsed.error);
  return { ok: false, error: 'invalid_token' };
}
