// src/types/treatmentPlan.ts – domain types for Treatment Plans

export type TreatmentPlanStatus = 'draft' | 'sent' | 'accepted' | 'expired' | 'revoked' | 'scheduled';

export interface TreatmentPlan {
  id: string;
  user_id: string;
  patient_id: string;
  title: string;
  status: TreatmentPlanStatus;
  total_price_cents: number;
  notes: string | null;
  validity_days: number;
  mask_patient_name_on_share: boolean;
  issued_at: string; // YYYY-MM-DD
  share_image_path: string | null;
  share_image_generated_at: string | null;
  share_template_version: string | null;
  public_token: string | null;
  expires_at: string | null;
  first_viewed_at: string | null;
  view_count: number;
  public_link_generated_at: string | null;
  scheduled_appointment_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TreatmentPlanItem {
  id: string;
  treatment_plan_id: string;
  procedure_catalog_id: string | null;
  procedure_name_snapshot: string;
  procedure_description_snapshot: string | null;
  unit_price_cents: number;
  quantity: number;
  sort_order: number;
}

export interface TreatmentPlanWithItems extends TreatmentPlan {
  items: TreatmentPlanItem[];
}

/** For create: omit id, timestamps, share_image_*; optional issued_at */
export interface TreatmentPlanCreateInput {
  patient_id: string;
  title?: string;
  status?: TreatmentPlanStatus;
  total_price_cents?: number;
  notes?: string | null;
  validity_days?: number;
  mask_patient_name_on_share?: boolean;
  issued_at?: string | null;
}

/** For update: partial plan fields (no patient_id change) */
export interface TreatmentPlanUpdateInput {
  title?: string;
  status?: TreatmentPlanStatus;
  total_price_cents?: number;
  notes?: string | null;
  validity_days?: number;
  mask_patient_name_on_share?: boolean;
  issued_at?: string | null;
  share_image_path?: string | null;
  share_image_generated_at?: string | null;
  share_template_version?: string | null;
  public_token?: string | null;
  expires_at?: string | null;
  public_link_generated_at?: string | null;
  scheduled_appointment_id?: string | null;
  confirmed_at?: string | null;
}

/** For create item: omit id; optional procedure_catalog_id */
export interface TreatmentPlanItemCreateInput {
  treatment_plan_id: string;
  procedure_catalog_id?: string | null;
  procedure_name_snapshot: string;
  procedure_description_snapshot?: string | null;
  unit_price_cents: number;
  quantity?: number;
  sort_order?: number;
}

/** For update item: partial */
export interface TreatmentPlanItemUpdateInput {
  procedure_name_snapshot?: string;
  procedure_description_snapshot?: string | null;
  unit_price_cents?: number;
  quantity?: number;
  sort_order?: number;
}
