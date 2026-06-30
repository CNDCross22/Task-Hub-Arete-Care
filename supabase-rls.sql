-- Arete Care Task Hub — lock down the database (Option C: Edge Function gateway)
--
-- Run this ONLY AFTER:
--   1. the `data` Edge Function is deployed, and
--   2. the app is switched to edge mode (VITE_USE_EDGE=true) and tested.
--
-- Enabling RLS with NO policies blocks the public/publishable key from reading
-- or writing any table. The Edge Function uses the SERVICE ROLE key, which
-- bypasses RLS, and does its own access-code checks — so the app keeps working
-- while direct access with the public key is fully denied.

alter table public.projects enable row level security;
alter table public.tasks    enable row level security;
alter table public.members  enable row level security;

-- (Deliberately no policies. Only the service role, used by the Edge Function,
--  can touch these tables.)
