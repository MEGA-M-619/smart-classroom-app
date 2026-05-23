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
  lib/supabase.js        Supabase client
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

- `users (id, name, role, email)`
- `classes (id, title, teacher_id)`
- `assignments (id, class_id, title, due_date)`
- `attendance (id, student_id, class_id, status)`

It also adds supporting production tables for the existing UI: `class_enrollments`, `submissions`, `announcements`, `materials`, `events`, `notifications`, and `settings`.

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

Admin-created users from the frontend create app profiles only. Real production admin user provisioning should use a Supabase Edge Function with the service role key, because service-role secrets must never be exposed in a Vite frontend.
