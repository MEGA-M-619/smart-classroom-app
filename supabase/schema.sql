create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'teacher');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  email text unique,
  phone text,
  bio text,
  dark_mode boolean not null default false,
  email_notifications boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  teacher_id uuid not null references public.users(id) on delete cascade,
  join_code text not null unique,
  color text not null default '#6366f1',
  icon text not null default '📚',
  schedule text,
  room text,
  created_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz not null,
  points numeric not null default 100,
  type text not null default 'Assignment',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  file_url text,
  file_path text,
  file_name text,
  text_answer text,
  grade numeric,
  feedback text,
  status text not null default 'submitted',
  submitted_at timestamptz not null default now(),
  unique (assignment_id, student_id)
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
  uploaded_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date timestamptz not null,
  type text not null default 'event',
  color text not null default '#10b981',
  class_id uuid references public.classes(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete cascade
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  text text not null,
  icon text not null default 'bell',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  key text primary key,
  value text not null
);

alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists dark_mode boolean not null default false;
alter table public.users add column if not exists email_notifications boolean not null default true;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'users' and column_name = 'name') then
    execute 'update public.users set full_name = coalesce(full_name, name, email, ''SmartClass User'') where full_name is null';
  else
    update public.users set full_name = coalesce(full_name, email, 'SmartClass User') where full_name is null;
  end if;
end $$;
alter table public.users alter column full_name set not null;

alter table public.classes add column if not exists name text;
alter table public.classes add column if not exists join_code text;
alter table public.classes add column if not exists description text;
alter table public.classes add column if not exists schedule text;
alter table public.classes add column if not exists room text;
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'classes' and column_name = 'title') then
    execute 'update public.classes set name = coalesce(name, title, ''Untitled Class'') where name is null';
  else
    update public.classes set name = coalesce(name, 'Untitled Class') where name is null;
  end if;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'classes' and column_name = 'code') then
    execute 'update public.classes set join_code = coalesce(join_code, code, upper(substr(md5(id::text), 1, 8))) where join_code is null';
  else
    update public.classes set join_code = coalesce(join_code, upper(substr(md5(id::text), 1, 8))) where join_code is null;
  end if;
end $$;
alter table public.classes alter column name set not null;
alter table public.classes alter column join_code set not null;
create unique index if not exists classes_join_code_key on public.classes (join_code);

do $$
begin
  if to_regclass('public.class_enrollments') is not null then
    execute 'insert into public.enrollments (class_id, student_id, created_at)
      select class_id, user_id, joined_at
      from public.class_enrollments
      on conflict (class_id, student_id) do nothing';
  end if;
end $$;

alter table public.submissions add column if not exists file_url text;
alter table public.submissions add column if not exists file_path text;
alter table public.submissions add column if not exists file_name text;
alter table public.submissions add column if not exists text_answer text;

alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.enrollments enable row level security;
alter table public.assignments enable row level security;
alter table public.submissions enable row level security;
alter table public.attendance enable row level security;
alter table public.announcements enable row level security;
alter table public.materials enable row level security;
alter table public.events enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;

create or replace function public.current_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role::public.user_role from public.users where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'student')::public.user_role,
    new.email
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = excluded.role,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create policy "profiles are readable by signed-in users"
on public.users for select to authenticated using (true);

create policy "users can insert own profile"
on public.users for insert to authenticated with check (id = auth.uid());

create policy "users can update own profile"
on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "classes are readable by signed-in users"
on public.classes for select to authenticated using (true);

create policy "teachers create classes"
on public.classes for insert to authenticated with check (
  teacher_id = auth.uid() and public.current_role() = 'teacher'
);

create policy "teachers manage own classes"
on public.classes for update to authenticated using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "teachers delete own classes"
on public.classes for delete to authenticated using (teacher_id = auth.uid());

create policy "enrollments are readable by signed-in users"
on public.enrollments for select to authenticated using (true);

create policy "students join classes"
on public.enrollments for insert to authenticated with check (
  student_id = auth.uid() and public.current_role() = 'student'
);

create policy "students leave own classes"
on public.enrollments for delete to authenticated using (student_id = auth.uid());

create policy "assignments are readable by signed-in users"
on public.assignments for select to authenticated using (true);

create policy "teachers create assignments for own classes"
on public.assignments for insert to authenticated with check (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);

create policy "teachers update assignments for own classes"
on public.assignments for update to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);

create policy "teachers delete assignments for own classes"
on public.assignments for delete to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);

create policy "submissions are readable by owner, teacher, or classmates data views"
on public.submissions for select to authenticated using (
  student_id = auth.uid()
  or exists (
    select 1 from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_id and c.teacher_id = auth.uid()
  )
);

create policy "students submit own work"
on public.submissions for insert to authenticated with check (student_id = auth.uid());

create policy "students revise own ungraded work"
on public.submissions for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "teachers grade submissions"
on public.submissions for update to authenticated using (
  exists (
    select 1 from public.assignments a
    join public.classes c on c.id = a.class_id
    where a.id = assignment_id and c.teacher_id = auth.uid()
  )
);

create policy "attendance readable by class participants"
on public.attendance for select to authenticated using (
  student_id = auth.uid()
  or exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);

create policy "teachers manage attendance"
on public.attendance for all to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);

create policy "announcements are readable by signed-in users"
on public.announcements for select to authenticated using (true);

create policy "teachers manage announcements"
on public.announcements for all to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);

create policy "materials are readable by signed-in users"
on public.materials for select to authenticated using (true);

create policy "teachers manage materials"
on public.materials for all to authenticated using (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
) with check (
  exists (select 1 from public.classes c where c.id = class_id and c.teacher_id = auth.uid())
);

create policy "events are readable by signed-in users"
on public.events for select to authenticated using (true);

create policy "teachers manage events"
on public.events for all to authenticated using (public.current_role() = 'teacher') with check (public.current_role() = 'teacher');

create policy "users read own notifications"
on public.notifications for select to authenticated using (user_id = auth.uid());

create policy "signed-in users create notifications"
on public.notifications for insert to authenticated with check (true);

create policy "users update own notifications"
on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "settings readable"
on public.settings for select to authenticated using (true);

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false), ('materials', 'materials', false)
on conflict (id) do nothing;

create policy "signed-in users read smartclass files"
on storage.objects for select to authenticated using (bucket_id in ('submissions', 'materials'));

create policy "signed-in users upload smartclass files"
on storage.objects for insert to authenticated with check (bucket_id in ('submissions', 'materials'));

create policy "signed-in users update own smartclass files"
on storage.objects for update to authenticated using (bucket_id in ('submissions', 'materials') and owner = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.classes;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.enrollments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.assignments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.submissions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
