-- WhatsApp integration: instances state storage (Evolution API)
-- Tables are designed to match supabase/functions/whatsapp-webhook/index.ts
-- and docs/whatsapp-integration.md, without extra features.

create table if not exists public.whatsapp_instances (
  id uuid primary key default gen_random_uuid(),
  instance_name text not null unique,
  status text not null default 'close',
  wuid text,
  profile_name text,
  profile_pic_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whatsapp_instances_instance_name_idx
  on public.whatsapp_instances (instance_name);

