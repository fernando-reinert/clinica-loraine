// src/types/publicTreatmentPlan.ts – public DTO for tokenized treatment plan viewer

import { z } from 'zod';

/** Public item (no treatment_plan_id, procedure_catalog_id, etc.) */
export const PublicTreatmentPlanItemSchema = z.object({
  id: z.string().uuid(),
  procedure_name_snapshot: z.string(),
  procedure_description_snapshot: z.string().nullable(),
  unit_price_cents: z.number().int().min(0),
  quantity: z.number().int().min(1),
  line_total_cents: z.number().int().min(0),
});

/** Public plan header (no user_id, patient_id, internal fields) */
export const PublicTreatmentPlanPlanSchema = z.object({
  title: z.string(),
  total_price_cents: z.number().int().min(0),
  notes: z.string().nullable(),
  validity_days: z.number().int().min(1),
  mask_patient_name_on_share: z.boolean(),
  patient_display_name: z.string(),
  issued_at: z.string(), // YYYY-MM-DD
  expires_at: z.string().nullable(), // ISO or null
});

/** Full success response from get_public_treatment_plan RPC */
export const PublicTreatmentPlanSuccessSchema = z.object({
  plan: PublicTreatmentPlanPlanSchema,
  items: z.array(PublicTreatmentPlanItemSchema),
});

/** Error response shapes */
export const PublicTreatmentPlanErrorSchema = z.object({
  error: z.enum(['invalid_token', 'revoked_or_invalid', 'expired']),
});

export type PublicTreatmentPlanItem = z.infer<typeof PublicTreatmentPlanItemSchema>;
export type PublicTreatmentPlanPlan = z.infer<typeof PublicTreatmentPlanPlanSchema>;
export type PublicTreatmentPlanSuccess = z.infer<typeof PublicTreatmentPlanSuccessSchema>;
export type PublicTreatmentPlanError = z.infer<typeof PublicTreatmentPlanErrorSchema>;

export type PublicTreatmentPlanResult =
  | { ok: true; data: PublicTreatmentPlanSuccess }
  | { ok: false; error: PublicTreatmentPlanError['error'] };
