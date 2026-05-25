# SmartClass

SmartClass is a React + Vite LMS SaaS MVP backed by Supabase Auth, PostgreSQL, Row Level Security, Realtime, and private Storage buckets. The app deploys as a static Vercel frontend and talks directly to Supabase through the anon client.

## Stack

- React 19 + Vite
- Supabase Auth for email/password signup, login, session persistence, and password updates
- Supabase PostgreSQL for users, classrooms, enrollments, assignments, submissions, announcements, notifications, attendance, materials, events, and settings
- Supabase Storage for private submission and material uploads
- Vercel static deployment

## Architecture

```text
src/
  api.js                    Supabase data access and domain mapping
  AppContext.jsx            Auth/session bootstrap, protected app state, realtime refresh
  SmartClassroomApp.jsx     Existing SaaS UI and role dashboards
  components/               Toasts, skeletons, error boundary
  lib/                      Supabase client and env validation
  pages/                    Feature pages such as attendance
supabase/
  migrations/               Production SQL migrations
  seed.sql                  Optional local/dev seed data
  schema.sql                Pointer to canonical migrations
```

## Supabase Setup

1. Create a Supabase project.
2. In Authentication -> Providers, enable Email.
3. Apply the production migration in SQL Editor:

```sql
-- paste and run:
-- supabase/migrations/202605260001_lms_saas_schema.sql
```

4. Confirm Storage has private buckets named `materials` and `submissions`. The migration creates them when SQL permissions allow it.
5. Copy Project Settings -> API values into `.env.local`:

```bash
VITE_APP_NAME=SmartClass
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Never expose a Supabase service-role key in Vite or Vercel frontend variables.

## Database Model

Core tables:

- `users`: auth-linked profiles with `student`, `teacher`, and `admin` roles
- `classrooms`: teacher-owned courses with join codes
- `enrollments`: student membership in classrooms
- `assignments`: due work attached to classrooms
- `submissions`: student text/file submissions with grades and feedback
- `announcements`: classroom posts
- `notifications`: user-specific activity feed

Supporting tables:

- `attendance`
- `materials`
- `events`
- `settings`

The migration includes foreign keys, uniqueness rules, indexes, updated-at triggers, private Storage policies, Realtime publication entries, and Row Level Security policies scoped by role and classroom membership.

## Development Seed Data

`supabase/seed.sql` contains optional sample LMS data. For a real Supabase project, create matching Auth users first, replace the UUIDs in `seed.sql` with those Auth user IDs, then run the seed file. This keeps development data real and Auth-backed instead of relying on frontend-only demo state.

## Local Development

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Production Deployment

Set these Vercel environment variables for Production, Preview, and Development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_NAME`

Vercel settings:

- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

No Express server or `/api` rewrite is required.

## Verification

```bash
npm run lint
npm run build
```

The app fails loudly with a startup error if required Supabase environment variables are missing, rather than silently connecting to a fake backend.
