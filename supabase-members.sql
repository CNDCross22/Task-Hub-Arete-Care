-- Arete Care Task Hub — people & access codes
-- Run once in the Supabase SQL Editor. Creates the members table and seeds an
-- initial admin so you can sign in and manage everyone else from the app.
--
-- First login code: ARETE-ADMIN  (change it in the Admin portal after signing in)

create table if not exists public.members (
  id           text primary key,
  name         text not null,
  role         text not null default 'member',  -- 'admin' | 'member'
  department   text,
  "accessCode" text not null unique,
  active       boolean not null default true,
  "createdAt"  text
);

-- DEV: open access via the publishable key (no per-row auth). Fine for an
-- internal team tool; the access code is what gates entry to the app.
alter table public.members disable row level security;

insert into public.members (id, name, role, department, "accessCode", active, "createdAt")
values ('m_admin', 'Admin', 'admin', 'IT', 'ARETE-ADMIN', true, now()::text)
on conflict (id) do nothing;
