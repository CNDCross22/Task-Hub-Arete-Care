# Arete Care — IT & Marketing Task Hub

A centralized, AI-enhanced task management and reporting suite for cross-company
operations (Arete Care, TFO PH, TFO India, Mamta Face Yoga, Raaehi) across the
IT and Marketing departments.

## Stack

- **React + Vite + Tailwind CSS** (SPA)
- **Supabase** (Postgres) for data + access-code login
- **Google Gemini** for AI insights and the weekly report

## Features

- **Dashboard** — live KPIs and status breakdown
- **Daily Ops Board** — today's work grouped by urgency
- **Tasks** — filterable table (status, priority, department, company)
- **Kanban Boards** — drag-and-drop with position-aware reordering
- **Project Board** — per-project progress
- **Calendar** — tasks by due date
- **Reports** — analytics, CSV export, AI Insights, and a humanized **Weekly Report**
  (Department → Company → Category) exportable to DOCX / PDF
- **Admin portal** — manage people and access codes (admin only)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

### Environment variables (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `VITE_GEMINI_API_KEY` | Google Gemini API key (free tier) for AI features |
| `VITE_GEMINI_MODEL` | Gemini model (default `gemini-2.5-flash`) |
| `VITE_SUPABASE_URL` | Supabase project URL — when set, the app uses Supabase instead of localStorage |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable key |
| `VITE_REQUIRE_LOGIN` | `true` to require an access code to use the app |

If the Supabase variables are absent, the app runs fully local (browser
`localStorage`) so it works without any backend.

### Supabase setup

Run the SQL files in the Supabase SQL Editor:

1. `supabase-schema.sql` — `tasks` and `projects` tables
2. `supabase-members.sql` — `members` table + a seed admin (login code `ARETE-ADMIN`)

Then sign in with the admin code and manage people from the **Admin** page.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |

## Architecture notes

- The data layer is backend-agnostic: every screen talks to a single interface
  (`getAll / create / update / remove / replace`) implemented by either
  `localBackend.js` (localStorage) or `supabaseBackend.js` (Postgres). Selection
  is automatic based on the presence of the Supabase env vars.
- Document export libraries (`docx`, `jspdf`) are lazy-loaded so they stay out of
  the initial bundle.
