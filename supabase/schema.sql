create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key,
  name text not null,
  role text not null default 'student' check (role in ('student', 'teacher', 'admin')),
  email text not null unique,
  avatar text,
  department text,
  major text,
  year text,
  phone text,
  bio text,
  dark_mode boolean not null default false,
  email_notifications boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  teacher_id uuid not null references public.users(id) on delete cascade,
  code text not null unique,
  color text not null default '#6366f1',
  icon text not null default '📚',
  semester text,
  description text,
  schedule text,
  room text,
  max_students integer not null default 50,
  created_at timestamptz not null default now()
);

create table if not exists public.class_enrollments (
  user_id uuid not null references public.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (user_id, class_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  due_date date not null,
  description text,
  points integer not null default 100,
  status text not null default 'active',
  type text not null default 'Assignment',
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  session_date date not null default current_date,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, class_id, session_date)
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  file_name text,
  file_path text,
  submitted_at timestamptz not null default now(),
  grade numeric,
  feedback text,
  status text not null default 'submitted',
  unique (assignment_id, student_id)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  type text not null default 'pdf',
  file_name text,
  file_path text,
  size_bytes integer not null default 0,
  icon text not null default '📄',
  uploaded_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  type text not null default 'event',
  color text not null default '#10b981',
  class_id uuid references public.classes(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  icon text not null default '🔔',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value text not null
);

alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.submissions enable row level security;
alter table public.announcements enable row level security;
alter table public.materials enable row level security;
alter table public.events enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

create policy "authenticated users can read users" on public.users for select to authenticated using (true);
create policy "users can insert own profile" on public.users for insert to authenticated with check (auth.uid() = id);
create policy "users can update own profile" on public.users for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "admins can manage users" on public.users for all to authenticated using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "authenticated users can read classes" on public.classes for select to authenticated using (true);
create policy "teachers can create classes" on public.classes for insert to authenticated with check (
  teacher_id = auth.uid() and exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('teacher', 'admin'))
);
create policy "teachers can manage own classes" on public.classes for update to authenticated using (
  teacher_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);
create policy "teachers can delete own classes" on public.classes for delete to authenticated using (
  teacher_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "authenticated users can read enrollments" on public.class_enrollments for select to authenticated using (true);
create policy "students can join classes" on public.class_enrollments for insert to authenticated with check (user_id = auth.uid());
create policy "users can leave classes" on public.class_enrollments for delete to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "authenticated users can read assignments" on public.assignments for select to authenticated using (true);
create policy "teachers can manage assignments" on public.assignments for all to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "authenticated users can read attendance" on public.attendance for select to authenticated using (true);
create policy "teachers can manage attendance" on public.attendance for all to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "authenticated users can read submissions" on public.submissions for select to authenticated using (true);
create policy "students can submit own work" on public.submissions for insert to authenticated with check (student_id = auth.uid());
create policy "students can update own submissions" on public.submissions for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "teachers can grade submissions" on public.submissions for update to authenticated using (
  exists (
    select 1 from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_id and c.teacher_id = auth.uid()
  )
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "authenticated users can read announcements" on public.announcements for select to authenticated using (true);
create policy "teachers can manage announcements" on public.announcements for all to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "authenticated users can read materials" on public.materials for select to authenticated using (true);
create policy "teachers can manage materials" on public.materials for all to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
  or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "authenticated users can read events" on public.events for select to authenticated using (true);
create policy "teachers can manage events" on public.events for all to authenticated using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('teacher', 'admin'))
) with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('teacher', 'admin'))
);

create policy "users can read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "authenticated users can create notifications" on public.notifications for insert to authenticated with check (true);
create policy "users can update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "authenticated users can read settings" on public.settings for select to authenticated using (true);
create policy "admins can manage settings" on public.settings for all to authenticated using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

insert into storage.buckets (id, name, public)
values ('materials', 'materials', false), ('submissions', 'submissions', false)
on conflict (id) do nothing;

create policy "authenticated users can read stored files" on storage.objects for select to authenticated using (
  bucket_id in ('materials', 'submissions')
);

create policy "authenticated users can upload stored files" on storage.objects for insert to authenticated with check (
  bucket_id in ('materials', 'submissions')
);

create policy "admins can manage enrollments" on public.class_enrollments for all to authenticated using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "admins can manage submissions" on public.submissions for all to authenticated using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);

create policy "admins can manage notifications" on public.notifications for all to authenticated using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
) with check (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
);
