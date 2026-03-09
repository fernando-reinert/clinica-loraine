-- Drop invalid partial unique index (now() is not immutable in predicate).
-- One active invite per email per tenant is enforced in createStaffInvite Edge Function.
DROP INDEX IF EXISTS public.idx_staff_invites_one_active_per_email_tenant;
