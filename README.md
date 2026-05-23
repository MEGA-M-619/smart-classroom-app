# SmartClass — Classroom Management Platform

**SmartClass** is a full-stack educational platform for managing classes, assignments, submissions, attendance, announcements, and academic workflows. It supports three roles — **Student**, **Teacher**, and **Admin** — with role-based dashboards, JWT authentication, and a modern React UI.

**Live demo:** https://smart-classroom-beryl.vercel.app

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Project structure](#project-structure)
5. [Getting started](#getting-started)
6. [Demo accounts](#demo-accounts)
7. [Using the app](#using-the-app)
8. [API reference](#api-reference)
9. [Database](#database)
10. [Environment variables](#environment-variables)
11. [Deployment](#deployment)
12. [Scripts](#scripts)
13. [Security notes](#security-notes)
14. [Limitations & roadmap](#limitations--roadmap)

---

## Features

### Authentication & security

- Sign up, sign in, sign out
- JWT tokens with session persistence (`localStorage`)
- Password hashing (`bcryptjs`)
- Protected API routes and role-based access (`student` | `teacher` | `admin`)
- Profile update and password change
- Rate limiting, CORS allowlist, security headers, input validation

### Role-based dashboards

| Role | Highlights |
|------|------------|
| **Student** | Enrolled classes, pending tasks, submitted work, attendance %, GPA, upcoming deadlines, announcements, grades |
| **Teacher** | Create/manage classes, assignments, grade submissions, mark attendance, post announcements, upload materials, calendar |
| **Admin** | User management, all classes overview, reports/analytics, system settings, data reset/seed |

### Classes

- Teachers create classes (name, description, schedule, room)
- Students join with a **class code**
- Per-class tabs: **Materials**, **Assignments**, **Announcements**
- File uploads for course materials (PDF, ZIP, slides)

### Assignments & submissions

- Teachers create assignments (title, description, due date, points, type: Assignment / Project / Lab / Quiz)
- Students submit files per assignment
- Teachers view all submissions, download files, assign grades and feedback
- Submission status: `submitted` | `graded`
- Deadlines appear on the calendar

### Attendance

- Teachers mark daily attendance per class (present / late / absent / excused)
- Attendance history with session percentages
- Students view overall attendance %, per-class breakdown, and recent records

### Calendar & events

- Month view with assignments, quizzes, deadlines, and custom events
- Teachers add events/deadlines linked to classes

### Announcements

- Teachers post class announcements (optional pin)
- Pinned and chronological views for all roles

### Notifications

- In-app notifications (new assignments, grades, announcements, absences)
- Unread indicator in the top bar

### UI/UX

- Responsive layout (desktop + mobile sidebar)
- Dark mode (profile toggle + top bar)
- Toast notifications for success/errors
- Loading spinner on session restore
- Empty states for lists with no data
- DM Sans typography, indigo brand theme

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8 |
| Styling | Global CSS variables (`src/styles/global.css`) |
| Backend | Express 4 (Node.js ≥ 22.12) |
| Database | SQLite (`node:sqlite`) with SQL migrations |
| Auth | JSON Web Tokens (`jsonwebtoken`) |
| Uploads | Multer (disk storage) |
| Hosting | Vercel (static frontend + serverless API via `api/index.js`) |

---

## Architecture

```text
Browser (React SPA)
    │
    ├─► /api/*  ──►  api/index.js  ──►  server/index.js (Express)
    │                      │
    │                      ├─► SQLite (DATABASE_PATH)
    │                      └─► Uploads (UPLOAD_DIR)
    │
    └─► /*      ──►  dist/index.html (Vite build)
```

- **Frontend** talks to `/api/...` on the same origin in production (Vercel rewrites).
- **Bootstrap endpoint** (`GET /api/bootstrap`) loads all data for the logged-in user in one request.
- **App state** lives in `AppProvider` (`src/AppContext.jsx`) with `api.js` as the HTTP client.

---

## Project structure

```text
smart-classroom/
├── api/
│   └── index.js              # Vercel serverless entry → Express app
├── public/                   # Static assets (favicon, manifest, robots)
├── server/
│   ├── migrations/           # SQL schema migrations
│   ├── data/                 # Local SQLite DB (gitignored)
│   ├── uploads/              # Uploaded files (gitignored)
│   ├── config.js             # Env-based configuration
│   ├── db.js                 # Schema init + helpers
│   ├── index.js              # Express routes & middleware
│   ├── seed.js               # Demo data seeder
│   ├── middleware.js         # CORS, rate limit, errors
│   └── validation.js         # Request validation helpers
├── src/
│   ├── SmartClassroomApp.jsx # Main UI (landing, auth, pages)
│   ├── AppContext.jsx        # Global state & actions
│   ├── api.js                # API client + token storage
│   ├── classModals.jsx       # Class modals (join, create, submit, etc.)
│   ├── config.js             # Frontend env (Vite)
│   ├── theme.js              # Color tokens
│   ├── ui.jsx                # Shared Modal component
│   ├── app-context.js        # React context definition
│   ├── main.jsx              # App entry + providers
│   ├── components/
│   │   ├── Toast.jsx         # Toast notifications
│   │   └── Skeleton.jsx      # Loading placeholders
│   ├── pages/
│   │   └── AttendancePage.jsx
│   ├── hooks/
│   │   └── useTheme.js       # Dark mode on <html>
│   └── styles/
│       └── global.css        # App-wide styles
├── index.html
├── vercel.json               # Vercel build & rewrites
├── package.json
└── .env.example
```

---

## Getting started

### Prerequisites

- **Node.js** ≥ 22.12
- **npm**

### 1. Install

```bash
cd smart-classroom
npm install
```

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` if needed (see [Environment variables](#environment-variables)).

### 3. Seed demo data

```bash
npm run seed
```

### 4. Run locally (two terminals)

**Terminal A — API (port 3001):**

```bash
npm run dev:api
```

**Terminal B — Frontend (port 5173):**

```bash
npm run dev
```

Open **http://localhost:5173**

> Vite proxies `/api` to the API when `VITE_API_BASE_URL` is empty (see `vite.config.js`).

### 5. Production build (local check)

```bash
npm run build
npm run preview
```

---

## Demo accounts

After running `npm run seed`:

| Role | Email | Password |
|------|--------|----------|
| Teacher | `sarah@university.edu` | `teacher123` |
| Student | `alex@student.edu` | `student123` |
| Admin | `admin@system.edu` | `admin123` |

Additional seeded users: `james@university.edu` (teacher), `maria@student.edu`, `emma@student.edu` (students) — same password `student123`.

---

## Using the app

### Sidebar navigation by role

**Student**

- Dashboard · My Classes · Assignments · **My Submissions** · Attendance · Calendar · Announcements · Profile

**Teacher**

- Dashboard · My Classes · Assignments · **Submissions** · Attendance · Calendar · Announcements · Profile

**Admin**

- Dashboard · Users · All Classes · Reports · Settings · Profile

### Typical workflows

1. **Teacher** creates a class → shares **class code** with students.
2. **Student** joins class → sees assignments and materials.
3. **Teacher** posts assignment → students **submit** files before the due date.
4. **Teacher** opens **Submissions** → grades work and adds feedback.
5. **Teacher** marks **Attendance** for each session.
6. **Admin** manages users and platform settings under **Settings** / **Reports**.

---

## API reference

All routes are prefixed with `/api`. Send `Authorization: Bearer <token>` for protected routes.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login → `{ token, user }` |
| POST | `/auth/register` | Register → `{ token, user }` |
| GET | `/auth/me` | Current user |

### Data

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bootstrap` | All app data for logged-in user |
| GET | `/health` | Health check |

### Users

| Method | Path | Role | Description |
|--------|------|------|-------------|
| PATCH | `/users/me` | Any | Update profile / dark mode |
| POST | `/users/me/password` | Any | Change password |
| POST | `/users` | Admin | Create user |
| PATCH | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Delete user |

### Classes

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/classes` | Teacher, Admin | Create class |
| POST | `/classes/join` | Student | Join by code |
| POST | `/classes/:classId/materials` | Teacher | Upload material |
| GET | `/classes/:classId/attendance` | Teacher, Student, Admin | Get session attendance |
| POST | `/classes/:classId/attendance` | Teacher, Admin | Save attendance |

### Assignments & submissions

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/assignments` | Teacher | Create assignment |
| POST | `/assignments/:id/submit` | Student | Submit file (multipart) |
| PATCH | `/submissions/:id/grade` | Teacher | Grade submission |
| GET | `/submissions/:id/download` | Teacher, Student | Download submission file |
| GET | `/materials/:id/download` | Enrolled users | Download material |

### Other

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/announcements` | Teacher | Post announcement |
| POST | `/events` | Teacher | Create calendar event |
| PATCH | `/notifications/:id/read` | Any | Mark notification read |
| PATCH | `/notifications/read-all` | Any | Mark all read |
| GET | `/admin/reports` | Admin | Analytics data |
| GET/PATCH | `/admin/settings` | Admin | Platform settings |
| POST | `/admin/reset` | Admin | Clear academic data |
| POST | `/admin/seed` | Admin | Re-run demo seed |

---

## Database

- **Engine:** SQLite via Node’s built-in `node:sqlite`
- **Schema:** `server/db.js` + files in `server/migrations/`
- **Migrations applied automatically** on server start

### Main tables

`users`, `classes`, `enrollments`, `assignments`, `submissions`, `announcements`, `materials`, `events`, `notifications`, `attendance_sessions`, `attendance_records`, `settings`

### Seed & reset

```bash
npm run seed          # Full demo dataset (CLI)
```

Or as **admin** on a running server:

```http
POST /api/admin/seed
Authorization: Bearer <admin-token>
```

---

## Environment variables

### Frontend (Vite — safe for browser)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_APP_NAME` | App title | `SmartClass` |
| `VITE_API_BASE_URL` | API origin (empty = same origin) | `http://localhost:3001` |
| `VITE_API_TIMEOUT_MS` | Request timeout | `15000` |
| `VITE_ANALYTICS_ID` | Optional analytics ID | |

Never put secrets in `VITE_*` variables.

### Backend

| Variable | Description | Default (local) |
|----------|-------------|----------------|
| `NODE_ENV` | `development` / `production` | `development` |
| `PORT` | API port | `3001` |
| `HOST` | Bind host | `0.0.0.0` |
| `JWT_SECRET` | **Required in production** | — |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `DATABASE_PATH` | SQLite file path | `server/data/smartclass.db` |
| `UPLOAD_DIR` | File upload directory | `server/uploads` |
| `CORS_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:5173` |
| `FRONTEND_URL` | Primary frontend URL | `http://localhost:5173` |
| `MAX_UPLOAD_MB` | Max upload size | `25` |
| `SEED_ON_EMPTY` | Auto-seed if DB empty | `true` (local) |
| `RATE_LIMIT_MAX` | Requests per window | `300` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |

On **Vercel**, the API uses `/tmp/smartclass.db` and `/tmp/uploads` unless overridden.

---

## Deployment

### Vercel (current setup)

The project deploys as a **unified Vercel app**:

- **Frontend:** `dist/` from `npm run build`
- **API:** `api/index.js` → `server/index.js` (serverless)

`vercel.json` rewrites:

- `/api/*` → serverless handler
- `/uploads/*` → upload handler
- Everything else → `index.html` (SPA)

**Deploy from CLI:**

```bash
npx vercel deploy --prod
```

**Required Vercel environment variables (Project Settings → Environment Variables):**

- `JWT_SECRET` — strong random secret (required; app throws in production without it)
- Optionally: `SEED_ON_EMPTY=true` for first deploy

**Re-seed production demo data (admin):**

```bash
# 1. Login
curl -X POST https://smart-classroom-beryl.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.edu","password":"admin123"}'

# 2. Seed (use token from step 1)
curl -X POST https://smart-classroom-beryl.vercel.app/api/admin/seed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Separate API host (optional)

For persistent SQLite/files, run the API on a VPS with a mounted volume:

```bash
npm run start
```

Set on Vercel:

```bash
VITE_API_BASE_URL=https://your-api-domain.com
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (frontend) |
| `npm run dev:api` | Express API locally |
| `npm run server` | Same as `dev:api` |
| `npm run seed` | Reset & seed SQLite demo data |
| `npm run build` | Production frontend build → `dist/` |
| `npm run build:check` | Lint + build |
| `npm run start` | Start API (production) |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

---

## Security notes

- Passwords are hashed; never stored in plain text.
- JWT must use a strong `JWT_SECRET` in production.
- Role checks on every sensitive route.
- File downloads verify enrollment or teaching relationship.
- Rate limiting enabled on the API.
- CORS restricted to configured origins.

---

## Limitations & roadmap

| Topic | Notes |
|-------|--------|
| **Vercel SQLite** | Database lives in `/tmp` on serverless — data may reset between cold starts. Use a persistent host or Postgres for production scale. |
| **Charts** | Dashboard analytics areas are placeholders. |
| **Email** | No real email delivery yet (in-app notifications only). |
| **Git** | Initialize a repo and connect to GitHub for CI/CD if you want push-to-deploy. |

Possible next steps: PostgreSQL, React Router, email service, real-time notifications, export grades to CSV.

---

## License

Private / educational project. Update this section if you open-source the repo.

---

## Quick links

- **Production:** https://smart-classroom-beryl.vercel.app
- **Health check:** https://smart-classroom-beryl.vercel.app/api/health

Built with SmartClass — *The Classroom Platform Built for Modern Education.*
