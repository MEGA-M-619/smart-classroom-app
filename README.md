# SmartClass

SmartClass is a Vite + React classroom management MVP backed by Supabase. The app runs as a static frontend on Vercel and uses Supabase Auth, Postgres, Row Level Security, and Storage for data.

## Stack

- React 19 + Vite
- Supabase Auth for sign up, login, logout, sessions, and password updates
- Supabase Postgres for users, classes, assignments, attendance, and app data
- Supabase Storage buckets for materials and submissions
- Vercel static deployment

## Project Structure

```text
src/
  lib/supabaseClient.js  Supabase client export
  auth/useAuth.js        Auth hook
  services/              Reusable Supabase service facade
  api.js                 Frontend data adapter using Supabase queries
  AppContext.jsx         App state and auth bootstrap
  SmartClassroomApp.jsx  Existing UI
  pages/AttendancePage.jsx
supabase/
  schema.sql             Tables, RLS policies, and storage buckets
```

The previous Express/SQLite server is no longer required for deployment. Vercel builds the Vite app and serves `dist/`.

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Project Settings -> API, copy the Project URL and anon public key.
4. Create `.env.local`:

```bash
VITE_APP_NAME=SmartClass
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

5. In Authentication -> Providers, keep Email enabled. For easiest MVP testing, disable email confirmation or confirm users from the Supabase dashboard.
6. In Storage, confirm the `materials` and `submissions` buckets exist. The schema creates them if storage SQL permissions allow it.

## Required Tables

The migration includes the requested core tables:

- `users (id, full_name, role, created_at)`
- `classes (id, name, description, teacher_id, join_code, created_at)`
- `enrollments (id, class_id, student_id)`
- `assignments (id, class_id, title, due_date)`
- `submissions (id, assignment_id, student_id, file_url, text_answer, grade, feedback, submitted_at)`
- `attendance (id, student_id, class_id, status)`

It also adds supporting production tables for the existing UI: `announcements`, `materials`, `events`, `notifications`, `settings`, plus RLS policies and private Storage buckets.

## SaaS Flows

- Students and teachers register with Supabase Auth.
- The selected role is stored in `public.users`.
- Teachers create classes and share the generated `join_code`.
- Students join with a code and see only enrolled classes.
- Teachers create assignments and see incoming submissions.
- Students submit text answers and optional files.
- Teachers grade submissions with scores and feedback.
- Supabase Realtime refreshes class, enrollment, assignment, submission, and notification changes.

## Local Development

```bash
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Deployment

Set these Vercel environment variables for Production, Preview, and Development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_NAME`

Vercel settings:

- Build command: `npm run build`
- Output directory: `dist`
- No backend server or `/api` rewrite is required.

## Scripts

```bash
npm run dev       # local Vite dev server
npm run build     # production build
npm run preview   # preview the built app
npm run lint      # eslint
```

## Notes

For easiest email/password MVP testing, disable email confirmation in Supabase Auth or confirm test users from the dashboard. Service-role secrets must never be exposed in this Vite frontend.
