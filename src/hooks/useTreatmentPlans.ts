// src/hooks/useTreatmentPlans.ts – orchestrates treatment plans state and service calls
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as treatmentPlanService from '../services/treatmentPlans/treatmentPlanService';
import type {
  TreatmentPlan,
  TreatmentPlanWithItems,
  TreatmentPlanCreateInput,
  TreatmentPlanUpdateInput,
  TreatmentPlanItemCreateInput,
  TreatmentPlanItemUpdateInput,
} from '../types/treatmentPlan';

export function useTreatmentPlans(patientId: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    if (!userId || !patientId) {
      setPlans([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await treatmentPlanService.listPlansByPatient(userId, patientId);
      setPlans(data);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [userId, patientId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const createPlan = useCallback(
    async (input: TreatmentPlanCreateInput) => {
      if (!userId) throw new Error('Usuário não autenticado');
      return treatmentPlanService.createPlan(userId, input);
    },
    [userId]
  );

  const createPlanWithItems = useCallback(
    async (
      planInput: TreatmentPlanCreateInput,
      itemsInput: Omit<TreatmentPlanItemCreateInput, 'treatment_plan_id'>[]
    ) => {
      if (!userId) throw new Error('Usuário não autenticado');
      return treatmentPlanService.createPlanWithItems(userId, planInput, itemsInput);
    },
    [userId]
  );

  const updatePlan = useCallback(
    async (planId: string, input: TreatmentPlanUpdateInput) => {
      if (!userId) throw new Error('Usuário não autenticado');
      const updated = await treatmentPlanService.updatePlan(userId, planId, input);
      await loadPlans();
      return updated;
    },
    [userId, loadPlans]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      if (!userId) throw new Error('Usuário não autenticado');
      await treatmentPlanService.deletePlan(userId, planId);
      await loadPlans();
    },
    [userId, loadPlans]
  );

  const getPlanWithItems = useCallback(
    async (planId: string): Promise<TreatmentPlanWithItems | null> => {
      if (!userId) return null;
      return treatmentPlanService.getPlanWithItems(userId, planId);
    },
    [userId]
  );

  const addItem = useCallback(
    async (input: TreatmentPlanItemCreateInput) => {
      if (!userId) throw new Error('Usuário não autenticado');
      return treatmentPlanService.addItem(userId, input);
    },
    [userId]
  );

  const updateItem = useCallback(
    async (planId: string, itemId: string, input: TreatmentPlanItemUpdateInput) => {
      if (!userId) throw new Error('Usuário não autenticado');
      return treatmentPlanService.updateItem(userId, planId, itemId, input);
    },
    [userId]
  );

  const deleteItem = useCallback(
    async (planId: string, itemId: string) => {
      if (!userId) throw new Error('Usuário não autenticado');
      await treatmentPlanService.deleteItem(userId, planId, itemId);
    },
    [userId]
  );

  const replacePlanItems = useCallback(
    async (planId: string, itemsInput: Omit<TreatmentPlanItemCreateInput, 'treatment_plan_id'>[]) => {
      if (!userId) throw new Error('Usuário não autenticado');
      return treatmentPlanService.replacePlanItems(userId, planId, itemsInput);
    },
    [userId]
  );

  const updatePlanShareImage = useCallback(
    async (planId: string, shareImagePath: string, templateVersion: string) => {
      if (!userId) throw new Error('Usuário não autenticado');
      return treatmentPlanService.updatePlanShareImage(
        userId,
        planId,
        shareImagePath,
        templateVersion
      );
    },
    [userId]
  );

  const uploadShareImage = useCallback(
    async (planId: string, blob: Blob) => {
      if (!userId) throw new Error('Usuário não autenticado');
      return treatmentPlanService.uploadShareImage(userId, planId, blob);
    },
    [userId]
  );

  const generatePublicLink = useCallback(
    async (planId: string, expiresInDays?: number) => {
      if (!userId) throw new Error('Usuário não autenticado');
      const result = await treatmentPlanService.generatePublicLink(
        userId,
        planId,
        expiresInDays ?? 7
      );
      await loadPlans();
      return result;
    },
    [userId, loadPlans]
  );

  const sendPlan = useCallback(
    async (planId: string, validityDays: number) => {
      if (!userId) throw new Error('Usuário não autenticado');
      const result = await treatmentPlanService.sendPlan(userId, planId, validityDays);
      await loadPlans();
      return result;
    },
    [userId, loadPlans]
  );

  const revokePublicLink = useCallback(
    async (planId: string) => {
      if (!userId) throw new Error('Usuário não autenticado');
      await treatmentPlanService.revokePublicLink(userId, planId);
      await loadPlans();
    },
    [userId, loadPlans]
  );

  return {
    plans,
    loading,
    refetch: loadPlans,
    createPlan,
    createPlanWithItems,
    updatePlan,
    deletePlan,
    getPlanWithItems,
    addItem,
    updateItem,
    deleteItem,
    replacePlanItems,
    updatePlanShareImage,
    uploadShareImage,
    generatePublicLink,
    sendPlan,
    revokePublicLink,
  };
}
