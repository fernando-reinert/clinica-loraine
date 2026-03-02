// src/services/treatmentPlans/treatmentPlanService.ts – Supabase data access for treatment plans
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase/client';
import logger from '../../utils/logger';

const TREATMENT_PLANS_BUCKET = 'treatment-plans';
const SHARE_TEMPLATE_VERSION = '1';
import {
  treatmentPlanCreateSchema,
  treatmentPlanUpdateSchema,
  treatmentPlanItemCreateSchema,
  treatmentPlanItemUpdateSchema,
  sendPlanValidityDaysSchema,
} from './validation';
import type {
  TreatmentPlan,
  TreatmentPlanItem,
  TreatmentPlanWithItems,
  TreatmentPlanCreateInput,
  TreatmentPlanUpdateInput,
  TreatmentPlanItemCreateInput,
  TreatmentPlanItemUpdateInput,
} from '../../types/treatmentPlan';

const PLANS = 'treatment_plans';
const ITEMS = 'treatment_plan_items';

function getTodayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listPlansByPatient(
  userId: string,
  patientId: string
): Promise<TreatmentPlan[]> {
  const { data, error } = await supabase
    .from(PLANS)
    .select('*')
    .eq('user_id', userId)
    .eq('patient_id', patientId)
    .order('issued_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('[TREATMENT_PLANS] listPlansByPatient', error);
    throw error;
  }
  return (data ?? []) as TreatmentPlan[];
}

export async function getPlanById(userId: string, planId: string): Promise<TreatmentPlan | null> {
  const { data, error } = await supabase
    .from(PLANS)
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('[TREATMENT_PLANS] getPlanById', error);
    throw error;
  }
  return data as TreatmentPlan;
}

export async function getPlanWithItems(
  userId: string,
  planId: string
): Promise<TreatmentPlanWithItems | null> {
  const plan = await getPlanById(userId, planId);
  if (!plan) return null;

  const { data: items, error } = await supabase
    .from(ITEMS)
    .select('*')
    .eq('treatment_plan_id', planId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    logger.error('[TREATMENT_PLANS] getPlanWithItems items', error);
    throw error;
  }
  return { ...plan, items: (items ?? []) as TreatmentPlanItem[] };
}

export async function createPlan(
  userId: string,
  input: TreatmentPlanCreateInput
): Promise<TreatmentPlan> {
  const parsed = treatmentPlanCreateSchema.parse(input);
  const payload = {
    user_id: userId,
    patient_id: parsed.patient_id,
    title: parsed.title,
    status: parsed.status,
    total_price_cents: parsed.total_price_cents,
    notes: parsed.notes ?? null,
    validity_days: parsed.validity_days,
    mask_patient_name_on_share: parsed.mask_patient_name_on_share,
    issued_at: parsed.issued_at ?? getTodayISO(),
  };

  const { data, error } = await supabase
    .from(PLANS)
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    logger.error('[TREATMENT_PLANS] createPlan', error);
    throw error;
  }
  return data as TreatmentPlan;
}

/** Create plan and items in sequence; if items fail, plan is already created (no DB rollback). */
export async function createPlanWithItems(
  userId: string,
  planInput: TreatmentPlanCreateInput,
  itemsInput: Omit<TreatmentPlanItemCreateInput, 'treatment_plan_id'>[]
): Promise<TreatmentPlanWithItems> {
  const plan = await createPlan(userId, planInput);
  const items: TreatmentPlanItem[] = [];

  for (let i = 0; i < itemsInput.length; i++) {
    const raw = { ...itemsInput[i], treatment_plan_id: plan.id, sort_order: i };
    const parsed = treatmentPlanItemCreateSchema.parse(raw);
    const { data, error } = await supabase
      .from(ITEMS)
      .insert({
        treatment_plan_id: plan.id,
        procedure_catalog_id: parsed.procedure_catalog_id ?? null,
        procedure_name_snapshot: parsed.procedure_name_snapshot,
        procedure_description_snapshot: parsed.procedure_description_snapshot ?? null,
        unit_price_cents: parsed.unit_price_cents,
        quantity: parsed.quantity,
        sort_order: parsed.sort_order,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('[TREATMENT_PLANS] createPlanWithItems item', error);
      throw error;
    }
    items.push(data as TreatmentPlanItem);
  }

  return { ...plan, items };
}

export async function updatePlan(
  userId: string,
  planId: string,
  input: TreatmentPlanUpdateInput
): Promise<TreatmentPlan> {
  const parsed = treatmentPlanUpdateSchema.partial().parse(input);
  const payload: Record<string, unknown> = { ...parsed, updated_at: new Date().toISOString() };
  const keys = Object.keys(payload).filter((k) => k !== 'updated_at' && payload[k] !== undefined);
  if (keys.length === 0) return (await getPlanById(userId, planId))!;

  const { data, error } = await supabase
    .from(PLANS)
    .update(payload)
    .eq('id', planId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) {
    logger.error('[TREATMENT_PLANS] updatePlan', error);
    throw error;
  }
  return data as TreatmentPlan;
}

export async function updatePlanShareImage(
  userId: string,
  planId: string,
  shareImagePath: string,
  templateVersion: string
): Promise<TreatmentPlan> {
  return updatePlan(userId, planId, {
    share_image_path: shareImagePath,
    share_image_generated_at: new Date().toISOString(),
    share_template_version: templateVersion,
  });
}

export async function deletePlan(userId: string, planId: string): Promise<void> {
  const { error } = await supabase
    .from(PLANS)
    .delete()
    .eq('id', planId)
    .eq('user_id', userId);

  if (error) {
    logger.error('[TREATMENT_PLANS] deletePlan', error);
    throw error;
  }
}

// Items
export async function listItemsByPlan(
  userId: string,
  planId: string
): Promise<TreatmentPlanItem[]> {
  const plan = await getPlanById(userId, planId);
  if (!plan) return [];

  const { data, error } = await supabase
    .from(ITEMS)
    .select('*')
    .eq('treatment_plan_id', planId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    logger.error('[TREATMENT_PLANS] listItemsByPlan', error);
    throw error;
  }
  return (data ?? []) as TreatmentPlanItem[];
}

export async function addItem(
  userId: string,
  input: TreatmentPlanItemCreateInput
): Promise<TreatmentPlanItem> {
  const plan = await getPlanById(userId, input.treatment_plan_id);
  if (!plan) throw new Error('Plano não encontrado');

  const parsed = treatmentPlanItemCreateSchema.parse(input);
  const { data, error } = await supabase
    .from(ITEMS)
    .insert({
      treatment_plan_id: parsed.treatment_plan_id,
      procedure_catalog_id: parsed.procedure_catalog_id ?? null,
      procedure_name_snapshot: parsed.procedure_name_snapshot,
      procedure_description_snapshot: parsed.procedure_description_snapshot ?? null,
      unit_price_cents: parsed.unit_price_cents,
      quantity: parsed.quantity,
      sort_order: parsed.sort_order,
    })
    .select('*')
    .single();

  if (error) {
    logger.error('[TREATMENT_PLANS] addItem', error);
    throw error;
  }
  return data as TreatmentPlanItem;
}

export async function updateItem(
  userId: string,
  planId: string,
  itemId: string,
  input: TreatmentPlanItemUpdateInput
): Promise<TreatmentPlanItem> {
  const plan = await getPlanById(userId, planId);
  if (!plan) throw new Error('Plano não encontrado');

  const parsed = treatmentPlanItemUpdateSchema.partial().parse(input);
  const { data, error } = await supabase
    .from(ITEMS)
    .update(parsed)
    .eq('id', itemId)
    .eq('treatment_plan_id', planId)
    .select('*')
    .single();

  if (error) {
    logger.error('[TREATMENT_PLANS] updateItem', error);
    throw error;
  }
  return data as TreatmentPlanItem;
}

export async function deleteItem(
  userId: string,
  planId: string,
  itemId: string
): Promise<void> {
  const plan = await getPlanById(userId, planId);
  if (!plan) throw new Error('Plano não encontrado');

  const { error } = await supabase
    .from(ITEMS)
    .delete()
    .eq('id', itemId)
    .eq('treatment_plan_id', planId);

  if (error) {
    logger.error('[TREATMENT_PLANS] deleteItem', error);
    throw error;
  }
}

/** Replace all items of a plan (delete existing, insert new). Use after updatePlan for edit flow. */
export async function replacePlanItems(
  userId: string,
  planId: string,
  itemsInput: Omit<TreatmentPlanItemCreateInput, 'treatment_plan_id'>[]
): Promise<TreatmentPlanItem[]> {
  const plan = await getPlanById(userId, planId);
  if (!plan) throw new Error('Plano não encontrado');

  const { error: delError } = await supabase.from(ITEMS).delete().eq('treatment_plan_id', planId);
  if (delError) {
    logger.error('[TREATMENT_PLANS] replacePlanItems delete', delError);
    throw delError;
  }

  const items: TreatmentPlanItem[] = [];
  for (let i = 0; i < itemsInput.length; i++) {
    const raw = { ...itemsInput[i], treatment_plan_id: planId, sort_order: i };
    const parsed = treatmentPlanItemCreateSchema.parse(raw);
    const { data, error } = await supabase
      .from(ITEMS)
      .insert({
        treatment_plan_id: planId,
        procedure_catalog_id: parsed.procedure_catalog_id ?? null,
        procedure_name_snapshot: parsed.procedure_name_snapshot,
        procedure_description_snapshot: parsed.procedure_description_snapshot ?? null,
        unit_price_cents: parsed.unit_price_cents,
        quantity: parsed.quantity,
        sort_order: parsed.sort_order,
      })
      .select('*')
      .single();

    if (error) {
      logger.error('[TREATMENT_PLANS] replacePlanItems insert', error);
      throw error;
    }
    items.push(data as TreatmentPlanItem);
  }
  return items;
}

/** Generate public token and set plan as sent. Default expires in 7 days. */
export async function generatePublicLink(
  userId: string,
  planId: string,
  expiresInDays: number = 7
): Promise<{ plan: TreatmentPlan; publicUrl: string }> {
  const plan = await getPlanById(userId, planId);
  if (!plan) throw new Error('Plano não encontrado');

  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const updated = await updatePlan(userId, planId, {
    public_token: token,
    status: 'sent',
    expires_at: expiresAt.toISOString(),
    public_link_generated_at: new Date().toISOString(),
  });

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/t/${token}`;
  return { plan: updated, publicUrl };
}

/** Send plan: set token, status=sent, expires_at. Uses validityDays (1..365) for link expiry. */
export async function sendPlan(
  userId: string,
  planId: string,
  validityDays: number
): Promise<{ plan: TreatmentPlan; publicUrl: string }> {
  const days = sendPlanValidityDaysSchema.parse(validityDays);
  return generatePublicLink(userId, planId, days);
}

/** Revoke public link (sets status to revoked). Token remains but RPC rejects access. */
export async function revokePublicLink(
  userId: string,
  planId: string
): Promise<TreatmentPlan> {
  return updatePlan(userId, planId, { status: 'revoked' });
}

/** Alias for revokePublicLink. */
export const revokePlanLink = revokePublicLink;

/** Get public link URL for a plan with public_token. */
export function getPublicLink(plan: { public_token: string | null }): string {
  if (!plan.public_token) return '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/t/${plan.public_token}`;
}

/** Upload share image blob to Storage and update plan with path. Bucket must exist (treatment-plans). */
export async function uploadShareImage(
  userId: string,
  planId: string,
  blob: Blob
): Promise<TreatmentPlan> {
  const plan = await getPlanById(userId, planId);
  if (!plan) throw new Error('Plano não encontrado');

  const path = `${planId}/share.png`;
  const { error } = await supabase.storage
    .from(TREATMENT_PLANS_BUCKET)
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    logger.error('[TREATMENT_PLANS] uploadShareImage', error);
    throw error;
  }
  return updatePlanShareImage(userId, planId, path, SHARE_TEMPLATE_VERSION);
}
