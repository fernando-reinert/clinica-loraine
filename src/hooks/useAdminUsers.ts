// Hook para painel admin: perfil (me), lista (users), toggle is_active, createStaffInvite.
import { useState, useEffect, useCallback } from 'react';
import {
  fetchMyAccessProfile,
  fetchTenantUsers,
  updateUserActive,
  createStaffInvite,
} from '../services/admin/adminService';
import type {
  UserProfileRow,
  CreateStaffInvitePayload,
  CreateStaffInviteResponse,
} from '../services/admin/adminTypes';

const ALLOWED_ADMIN_EMAIL = 'reinertplay@hotmail.com';

export function useAdminUsers() {
  const [me, setMe] = useState<UserProfileRow | null>(null);
  const [users, setUsers] = useState<UserProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const isOwnerActive = Boolean(me && me.role === 'owner' && me.is_active);

  const loadMe = useCallback(async (): Promise<UserProfileRow | null> => {
    try {
      const p = await fetchMyAccessProfile();
      setMe(p);
      return p;
    } catch (e) {
      setMe(null);
      throw e;
    }
  }, []);

  const loadTenantUsers = useCallback(async (tenantId: string) => {
    const list = await fetchTenantUsers(tenantId);
    setUsers(list);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    (async () => {
      setLoading(true);
      try {
        const p = await loadMe();
        if (cancelled) return;
        if (p && p.role === 'owner' && p.is_active) {
          await loadTenantUsers(p.tenant_id);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Erro ao carregar');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMe, loadTenantUsers]);

  const refreshUsers = useCallback(() => {
    if (me?.tenant_id && isOwnerActive) {
      loadTenantUsers(me.tenant_id);
    }
  }, [me?.tenant_id, isOwnerActive, loadTenantUsers]);

  const toggleActive = useCallback(
    async (userId: string, isActive: boolean): Promise<void> => {
      if (toggleLoading === userId) return;
      setToggleLoading(userId);
      try {
        await updateUserActive(userId, isActive);
        if (me?.tenant_id) await loadTenantUsers(me.tenant_id);
      } finally {
        setToggleLoading(null);
      }
    },
    [me?.tenant_id, loadTenantUsers, toggleLoading]
  );

  const createStaffInviteLink = useCallback(
    async (payload: CreateStaffInvitePayload): Promise<CreateStaffInviteResponse | null> => {
      setInviteError(null);
      setInviteLoading(true);
      try {
        const result = await createStaffInvite(payload);
        return result;
      } catch (e) {
        setInviteError(e instanceof Error ? e.message : 'Erro ao gerar link');
        return null;
      } finally {
        setInviteLoading(false);
      }
    },
    []
  );

  return {
    me,
    users,
    loading,
    loadError,
    isOwnerActive,
    isAllowedAdminEmail: (email: string | undefined) =>
      Boolean(email && email.trim().toLowerCase() === ALLOWED_ADMIN_EMAIL),
    allowedAdminEmail: ALLOWED_ADMIN_EMAIL,
    toggleLoading,
    refreshUsers,
    toggleActive,
    reloadMe: loadMe,
    inviteLoading,
    inviteError,
    createStaffInviteLink,
  };
}
