// src/services/treatmentPlans/validation.ts – Zod schemas for treatment plans
import { z } from 'zod';

const statusEnum = z.enum(['draft', 'sent', 'accepted', 'expired', 'revoked']);

export const treatmentPlanCreateSchema = z.object({
  patient_id: z.string().uuid(),
  title: z.string().min(1).max(200).optional().default('Plano de Tratamento'),
  status: statusEnum.optional().default('draft'),
  total_price_cents: z.number().int().min(0).optional().default(0),
  notes: z.string().max(2000).nullable().optional(),
  validity_days: z.number().int().min(1).max(365).optional().default(15),
  mask_patient_name_on_share: z.boolean().optional().default(false),
  issued_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const treatmentPlanUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: statusEnum.optional(),
  total_price_cents: z.number().int().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
  validity_days: z.number().int().min(1).max(365).optional(),
  mask_patient_name_on_share: z.boolean().optional(),
  issued_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  public_token: z.string().uuid().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  public_link_generated_at: z.string().nullable().optional(),
});

export const treatmentPlanItemCreateSchema = z.object({
  treatment_plan_id: z.string().uuid(),
  procedure_catalog_id: z.string().uuid().nullable().optional(),
  procedure_name_snapshot: z.string().min(1).max(500),
  procedure_description_snapshot: z.string().max(2000).nullable().optional(),
  unit_price_cents: z.number().int().min(0),
  quantity: z.number().int().min(1).max(999).optional().default(1),
  sort_order: z.number().int().min(0).optional().default(0),
});

export const treatmentPlanItemUpdateSchema = z.object({
  procedure_name_snapshot: z.string().min(1).max(500).optional(),
  procedure_description_snapshot: z.string().max(2000).nullable().optional(),
  unit_price_cents: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
  sort_order: z.number().int().min(0).optional(),
});

/** Validity days for public link (1..365). Used by sendPlan. */
export const sendPlanValidityDaysSchema = z.number().int().min(1).max(365);

export type TreatmentPlanCreateInputValidated = z.infer<typeof treatmentPlanCreateSchema>;
export type TreatmentPlanUpdateInputValidated = z.infer<typeof treatmentPlanUpdateSchema>;
export type TreatmentPlanItemCreateInputValidated = z.infer<typeof treatmentPlanItemCreateSchema>;
export type TreatmentPlanItemUpdateInputValidated = z.infer<typeof treatmentPlanItemUpdateSchema>;
