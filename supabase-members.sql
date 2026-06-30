-- Arete Care Task Hub — people & access codes
-- Run once in the Supabase SQL Editor.
--
-- Access codes are NEVER stored in plain text. The Edge Function hashes each
-- code with HMAC-SHA256 keyed by a server-side secret (the ACCESS_CODE_PEPPER
-- Edge Function secret) and stores only that hash, so a database leak reveals
-- no usable codes. Logins are verified by hashing the typed code and matching.

create extension if not exists pgcrypto;

create table if not exists public.members (
  id               text primary key,
  name             text not null,
  role             text not null default 'member',  -- 'admin' | 'member'
  department       text,
  "accessCode"     text,            -- legacy/plaintext; NULL in production
  "accessCodeHash" text,            -- HMAC-SHA256(code, pepper) — the real credential
  active           boolean not null default true,
  "createdAt"      text
);
create unique index if not exists members_codehash_idx on public.members ("accessCodeHash");

-- RLS on with no policies: the publishable key can't touch this table; all
-- access flows through the Edge Function using the service-role key.
alter table public.members enable row level security;

-- Seed admin: store the HASH of your chosen code, computed with the SAME value
-- you set as the ACCESS_CODE_PEPPER Edge Function secret. Example for 'ARETE-ADMIN':
--
--   insert into public.members (id, name, role, department, "accessCodeHash", active, "createdAt")
--   values ('m_admin', 'Admin', 'admin', 'IT',
--           encode(hmac('ARETE-ADMIN', '<your-pepper>', 'sha256'), 'hex'),
--           true, now()::text)
--   on conflict (id) do nothing;
