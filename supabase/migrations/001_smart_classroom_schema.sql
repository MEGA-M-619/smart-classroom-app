-- =========================
-- 1. EXTENSIONS
-- =========================
create extension if not exists "uuid-ossp";

-- =========================
-- 2. CORE TABLES
-- =========================

-- PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text default 'student'
    check (role in ('student', 'teacher', 'admin')),
  created_at timestamp with time zone default now()
);

-- CLASSROOMS
create table if not exists public.classrooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  teacher_id uuid references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- ENROLLMENTS
create table if not exists public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classrooms(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  status text default 'active',
  created_at timestamp with time zone default now(),
  unique(class_id, student_id)
);

-- ASSIGNMENTS
create table if not exists public.assignments (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classrooms(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- SUBMISSIONS
create table if not exists public.submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid references public.assignments(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  file_url text,
  status text default 'submitted',
  grade numeric,
  feedback text,
  created_at timestamp with time zone default now(),
  unique(assignment_id, student_id)
);

-- ATTENDANCE
create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classrooms(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade,
  date date default current_date,
  status text check (status in ('present', 'absent', 'late')),
  created_at timestamp with time zone default now()
);

-- ANNOUNCEMENTS
create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classrooms(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

-- MATERIALS
create table if not exists public.materials (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classrooms(id) on delete cascade,
  title text,
  file_url text,
  created_at timestamp with time zone default now()
);

-- EVENTS
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references public.classrooms(id) on delete cascade,
  title text not null,
  event_date timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default now()
);

-- SETTINGS
create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique,
  value text
);

-- =========================
-- 3. INDEXES
-- =========================
create index if not exists idx_enrollments_class
on public.enrollments(class_id);

create index if not exists idx_assignments_class
on public.assignments(class_id);

create index if not exists idx_submissions_assignment
on public.submissions(assignment_id);

create index if not exists idx_attendance_class
on public.attendance(class_id);

-- =========================
-- 4. ENABLE RLS
-- =========================
alter table public.profiles enable row level security;
alter table public.classrooms enable row level security;
alter table public.enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;
alter table public.materials enable row level security;
alter table public.events enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

-- =========================
-- 5. HELPER FUNCTIONS
-- =========================

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_teacher()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'teacher'
  );
$$;

create or replace function public.is_class_teacher(cid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.classrooms c
    where c.id = cid
      and c.teacher_id = auth.uid()
  );
$$;

create or replace function public.can_access_class(cid uuid)
returns boolean
language sql
stable
as $$
  select
    public.is_admin()
    or public.is_class_teacher(cid)
    or exists (
      select 1
      from public.enrollments e
      where e.class_id = cid
        and e.student_id = auth.uid()
    );
$$;

-- =========================
-- 6. RLS POLICIES
-- =========================

-- PROFILES
create policy "users read own profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

create policy "users update own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "admins manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- CLASSROOMS
create policy "classrooms readable"
on public.classrooms
for select
to authenticated
using (
  public.can_access_class(id)
  or public.is_admin()
);

create policy "teachers manage classrooms"
on public.classrooms
for all
to authenticated
using (
  public.is_class_teacher(id)
  or public.is_admin()
)
with check (
  public.is_class_teacher(id)
  or public.is_admin()
);

-- ENROLLMENTS
create policy "students see own enrollments"
on public.enrollments
for select
to authenticated
using (
  student_id = auth.uid()
  or public.is_class_teacher(class_id)
);

create policy "teachers manage enrollments"
on public.enrollments
for all
to authenticated
using (
  public.is_class_teacher(class_id)
)
with check (
  public.is_class_teacher(class_id)
);

-- ASSIGNMENTS
create policy "assignments readable"
on public.assignments
for select
to authenticated
using (
  public.can_access_class(class_id)
);

create policy "teachers manage assignments"
on public.assignments
for all
to authenticated
using (
  public.is_class_teacher(class_id)
)
with check (
  public.is_class_teacher(class_id)
);

-- SUBMISSIONS
create policy "students view own submissions"
on public.submissions
for select
to authenticated
using (
  student_id = auth.uid()
);

create policy "students submit work"
on public.submissions
for insert
to authenticated
with check (
  student_id = auth.uid()
);

create policy "teachers grade submissions"
on public.submissions
for update
to authenticated
using (
  public.is_class_teacher(
    (
      select a.class_id
      from public.assignments a
      where a.id = assignment_id
    )
  )
)
with check (
  public.is_class_teacher(
    (
      select a.class_id
      from public.assignments a
      where a.id = assignment_id
    )
  )
);

-- ATTENDANCE
create policy "attendance readable"
on public.attendance
for select
to authenticated
using (
  public.can_access_class(class_id)
);

create policy "teachers manage attendance"
on public.attendance
for all
to authenticated
using (
  public.is_class_teacher(class_id)
)
with check (
  public.is_class_teacher(class_id)
);

-- ANNOUNCEMENTS
create policy "announcements readable"
on public.announcements
for select
to authenticated
using (
  public.can_access_class(class_id)
);

create policy "teachers manage announcements"
on public.announcements
for all
to authenticated
using (
  public.is_class_teacher(class_id)
)
with check (
  public.is_class_teacher(class_id)
);

-- MATERIALS
create policy "materials readable"
on public.materials
for select
to authenticated
using (
  public.can_access_class(class_id)
);

create policy "teachers manage materials"
on public.materials
for all
to authenticated
using (
  public.is_class_teacher(class_id)
)
with check (
  public.is_class_teacher(class_id)
);

-- EVENTS
create policy "events readable"
on public.events
for select
to authenticated
using (
  class_id is null
  or public.can_access_class(class_id)
);

create policy "teachers manage events"
on public.events
for all
to authenticated
using (
  public.is_teacher()
  or public.is_admin()
)
with check (
  public.is_teacher()
  or public.is_admin()
);

-- NOTIFICATIONS
create policy "own notifications"
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "create notifications"
on public.notifications
for insert
to authenticated
with check (true);

create policy "update own notifications"
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
);

-- SETTINGS
create policy "settings readable"
on public.settings
for select
to authenticated
using (true);

create policy "admin settings"
on public.settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =========================
-- 7. STORAGE BUCKETS
-- =========================
insert into storage.buckets (id, name, public)
values
  ('submissions', 'submissions', false),
  ('materials', 'materials', false)
on conflict (id) do nothing;

-- STORAGE POLICIES
create policy "file access"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('submissions', 'materials')
);

create policy "file upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('submissions', 'materials')
);

create policy "file update"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('submissions', 'materials')
);

-- =========================
-- 8. REALTIME
-- =========================

do $$
begin
  alter publication supabase_realtime add table public.classrooms;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enrollments;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.assignments;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.submissions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.announcements;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;