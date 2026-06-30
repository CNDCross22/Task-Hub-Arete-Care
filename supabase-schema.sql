-- Arete Care Task Hub — Supabase schema
-- Run this once: Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Column names are quoted to preserve camelCase so they match the app's data
-- model exactly (no field mapping needed in the client).

create table if not exists public.projects (
  id          text primary key,
  name        text not null,
  color       text default 'blue',
  description text default ''
);

create table if not exists public.tasks (
  id           text primary key,
  title        text not null,
  description  text default '',
  assignees    text[] default '{}',
  company      text,
  department   text,
  priority     text default 'medium',
  status       text default 'pending',
  "projectId"  text,
  "startDate"  text,
  "dueDate"    text,
  "startTime"  text,
  "endTime"    text,
  notes        text default '',
  recurring    boolean default false,
  recurrence   text default 'weekly',
  "completedAt" text,
  tags         text[] default '{}',
  "createdAt"  text,
  "sortIndex"  double precision
);

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_company_idx on public.tasks (company);

-- DEV ONLY ---------------------------------------------------------------
-- Allow the public anon key to read/write without authentication so the app
-- works before we add login. We will RE-ENABLE row level security with proper
-- per-user / per-company policies when Supabase Auth is wired in.
alter table public.projects disable row level security;
alter table public.tasks    disable row level security;
-- ------------------------------------------------------------------------
