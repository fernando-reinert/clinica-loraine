-- WhatsApp integration: incoming messages storage (Evolution API)
-- Tables are designed to match supabase/functions/whatsapp-webhook/index.ts
-- and docs/whatsapp-integration.md, without extra features.

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  instance_name text not null,
  message_id text,
  remote_jid text not null,
  from_me boolean not null default false,
  push_name text,
  message_type text,
  message_timestamp bigint,
  status text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_messages_instance_jid_idx
  on public.whatsapp_messages (instance_name, remote_jid);

create index if not exists whatsapp_messages_created_at_idx
  on public.whatsapp_messages (created_at desc);

