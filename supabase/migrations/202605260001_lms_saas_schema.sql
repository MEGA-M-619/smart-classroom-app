create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('student', 'teacher', 'admin');
  end if;
end $$;

alter type public.user_role add value if not exists 'admin';

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'student',
  email text unique,
  phone text,
  bio text,
  department text,
  major text,
  year text,
  dark_mode boolean not null default false,
  email_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists phone text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists department text;
alter table public.users add column if not exists major text;
alter table public.users add column if not exists year text;
alter table public.users add column if not exists dark_mode boolean not null default false;
alter table public.users add column if not exists email_notifications boolean not null default true;
alter table public.users add column if not exists updated_at timestamptz not null default now();

create table if not exists public.classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  teacher_id uuid not null references public.users(id) on delete cascade,
  join_code text not null unique,
  color text not null default '#6366f1',
  icon text not null default '📚',
  schedule text,
  room text,
  max_students integer not null default 50 check (max_students > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.classrooms add column if not exists max_students integer not null default 50;
alter table public.classrooms add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if to_regclass('public.classes') is not null then
    insert into public.classrooms (id, name, description, teacher_id, join_code, color, icon, schedule, room, created_at)
    select
      id,
      coalesce(name, title, 'Untitled Classroom'),
      description,
      teacher_id,
      coalesce(join_code, code, upper(substr(md5(id::text), 1, 8))),
      coalesce(color, '#6366f1'),
      coalesce(icon, '📚'),
      schedule,
      room,
      created_at
    from public.classes
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      teacher_id = excluded.teacher_id,
      join_code = excluded.join_code,
      color = excluded.color,
      icon = excluded.icon,
      schedule = excluded.schedule,
      room = excluded.room;
  end if;
end $$;

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  student_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  title text not null,
  description text,
  due_date timestamptz not null,
  points numeric not null default 100 check (points >= 0),
  type text not null default 'Assignment',
  status text not null default 'active' check (status in ('draft', 'active', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.assignments add column if not exists description text;
alter table public.assignments add column if not exists points numeric not null default 100;
alter table public.assignments add column if not exists type text not null default 'Assignment';
alter table public.assignments add column if not exists status text not null default 'active';
alter table public.assignments add column if not exists updated_at timestamptz not null default now();

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  file_url text,
  file_path text,
  file_name text,
  text_answer text,
  grade numeric check (grade is null or grade >= 0),
  feedback text,
  status text not null default 'submitted' check (status in ('submitted', 'graded', 'returned')),
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

alter table public.submissions add column if not exists file_url text;
alter table public.submissions add column if not exists file_path text;
alter table public.submissions add column if not exists file_name text;
alter table public.submissions add column if not exists text_answer text;
alter table public.submissions add column if not exists feedback text;
alter table public.submissions add column if not exists status text not null default 'submitted';
alter table public.submissions add column if not exists graded_at timestamptz;
alter table public.submissions add column if not exists updated_at timestamptz not null default now();

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  class_id uuid not null,
  session_date date not null default current_date,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, class_id, session_date)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  author_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
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
  class_id uuid,
  assignment_id uuid references public.assignments(id) on delete cascade,
  created_at timestamptz not null default now()
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

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conrelid::regclass as table_name, conname
    from pg_constraint
    where contype = 'f'
      and confrelid = 'public.classes'::regclass
  loop
    execute format('alter table %s drop constraint %I', constraint_record.table_name, constraint_record.conname);
  end loop;
exception when undefined_table then
  null;
end $$;

alter table public.enrollments
  drop constraint if exists enrollments_class_id_fkey,
  add constraint enrollments_class_id_fkey foreign key (class_id) references public.classrooms(id) on delete cascade;

alter table public.assignments
  drop constraint if exists assignments_class_id_fkey,
  add constraint assignments_class_id_fkey foreign key (class_id) references public.classrooms(id) on delete cascade;

alter table public.attendance
  drop constraint if exists attendance_class_id_fkey,
  add constraint attendance_class_id_fkey foreign key (class_id) references public.classrooms(id) on delete cascade;

alter table public.announcements
  drop constraint if exists announcements_class_id_fkey,
  add constraint announcements_class_id_fkey foreign key (class_id) references public.classrooms(id) on delete cascade;

alter table public.materials
  drop constraint if exists materials_class_id_fkey,
  add constraint materials_class_id_fkey foreign key (class_id) references public.classrooms(id) on delete cascade;

alter table public.events
  drop constraint if exists events_class_id_fkey,
  add constraint events_class_id_fkey foreign key (class_id) references public.classrooms(id) on delete cascade;

create index if not exists classrooms_teacher_id_idx on public.classrooms (teacher_id);
create index if not exists enrollments_student_id_idx on public.enrollments (student_id);
create index if not exists assignments_class_id_idx on public.assignments (class_id);
create index if not exists submissions_assignment_id_idx on public.submissions (assignment_id);
create index if not exists submissions_student_id_idx on public.submissions (student_id);
create index if not exists announcements_class_id_idx on public.announcements (class_id);
create index if not exists notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_classrooms_updated_at on public.classrooms;
create trigger set_classrooms_updated_at before update on public.classrooms
for each row execute function public.set_updated_at();

drop trigger if exists set_assignments_updated_at on public.assignments;
create trigger set_assignments_updated_at before update on public.assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_submissions_updated_at on public.submissions;
create trigger set_submissions_updated_at before update on public.submissions
for each row execute function public.set_updated_at();

drop trigger if exists set_announcements_updated_at on public.announcements;
create trigger set_announcements_updated_at before update on public.announcements
for each row execute function public.set_updated_at();

create or replace function public.app_current_user_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role::public.user_role from public.users where id = auth.uid()
$$;

create or replace function public.app_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(public.app_current_user_role()::text = 'admin', false)
$$;

create or replace function public.app_is_class_teacher(classroom_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.classrooms
    where id = classroom_id and teacher_id = auth.uid()
  ) or public.app_is_admin()
$$;

create or replace function public.app_is_class_student(classroom_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.enrollments
    where class_id = classroom_id and student_id = auth.uid()
  )
$$;

create or replace function public.app_can_access_classroom(classroom_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.app_is_admin()
    or public.app_is_class_teacher(classroom_id)
    or public.app_is_class_student(classroom_id)
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'student');
  if requested_role not in ('student', 'teacher') then
    requested_role := 'student';
  end if;

  insert into public.users (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'SmartClass User'),
    requested_role::public.user_role,
    new.email
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
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

drop policy if exists "users select scoped profiles" on public.users;
drop policy if exists "users insert own profile" on public.users;
drop policy if exists "users update own profile" on public.users;
drop policy if exists "admins manage users" on public.users;
drop policy if exists "classrooms readable by participants" on public.classrooms;
drop policy if exists "teachers create classrooms" on public.classrooms;
drop policy if exists "teachers manage own classrooms" on public.classrooms;
drop policy if exists "enrollments readable by participants" on public.enrollments;
drop policy if exists "students join classrooms" on public.enrollments;
drop policy if exists "students leave own classrooms" on public.enrollments;
drop policy if exists "teachers manage enrollments" on public.enrollments;
drop policy if exists "assignments readable by participants" on public.assignments;
drop policy if exists "teachers manage assignments" on public.assignments;
drop policy if exists "submissions readable by owner teacher admin" on public.submissions;
drop policy if exists "students submit enrolled work" on public.submissions;
drop policy if exists "students revise own ungraded work" on public.submissions;
drop policy if exists "teachers grade submissions" on public.submissions;
drop policy if exists "attendance readable by participants" on public.attendance;
drop policy if exists "teachers manage attendance" on public.attendance;
drop policy if exists "announcements readable by participants" on public.announcements;
drop policy if exists "teachers manage announcements" on public.announcements;
drop policy if exists "materials readable by participants" on public.materials;
drop policy if exists "teachers manage materials" on public.materials;
drop policy if exists "events readable by participants" on public.events;
drop policy if exists "teachers manage events" on public.events;
drop policy if exists "users read own notifications" on public.notifications;
drop policy if exists "authenticated users create notifications" on public.notifications;
drop policy if exists "users update own notifications" on public.notifications;
drop policy if exists "settings readable by authenticated users" on public.settings;
drop policy if exists "admins manage settings" on public.settings;

create policy "users select scoped profiles"
on public.users for select to authenticated using (
  id = auth.uid()
  or public.app_is_admin()
  or exists (
    select 1
    from public.classrooms c
    where c.teacher_id = auth.uid()
  )
);

create policy "users insert own profile"
on public.users for insert to authenticated with check (id = auth.uid() or public.app_is_admin());

create policy "users update own profile"
on public.users for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "admins manage users"
on public.users for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin());

create policy "classrooms readable by participants"
on public.classrooms for select to authenticated using (
  public.app_can_access_classroom(id)
  or public.app_current_user_role()::text = 'student'
);

create policy "teachers create classrooms"
on public.classrooms for insert to authenticated with check (
  teacher_id = auth.uid()
  and public.app_current_user_role()::text in ('teacher', 'admin')
);

create policy "teachers manage own classrooms"
on public.classrooms for update to authenticated using (
  teacher_id = auth.uid() or public.app_is_admin()
) with check (
  teacher_id = auth.uid() or public.app_is_admin()
);

create policy "enrollments readable by participants"
on public.enrollments for select to authenticated using (
  public.app_is_admin()
  or student_id = auth.uid()
  or public.app_is_class_teacher(class_id)
);

create policy "students join classrooms"
on public.enrollments for insert to authenticated with check (
  student_id = auth.uid()
  and public.app_current_user_role()::text = 'student'
);

create policy "students leave own classrooms"
on public.enrollments for delete to authenticated using (student_id = auth.uid() or public.app_is_admin());

create policy "teachers manage enrollments"
on public.enrollments for all to authenticated using (
  public.app_is_class_teacher(class_id)
) with check (
  public.app_is_class_teacher(class_id)
);

create policy "assignments readable by participants"
on public.assignments for select to authenticated using (
  public.app_can_access_classroom(class_id)
);

create policy "teachers manage assignments"
on public.assignments for all to authenticated using (
  public.app_is_class_teacher(class_id)
) with check (
  public.app_is_class_teacher(class_id)
);

create policy "submissions readable by owner teacher admin"
on public.submissions for select to authenticated using (
  public.app_is_admin()
  or student_id = auth.uid()
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.app_is_class_teacher(a.class_id)
  )
);

create policy "students submit enrolled work"
on public.submissions for insert to authenticated with check (
  student_id = auth.uid()
  and exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.app_is_class_student(a.class_id)
  )
);

create policy "students revise own ungraded work"
on public.submissions for update to authenticated using (
  student_id = auth.uid() and status = 'submitted'
) with check (
  student_id = auth.uid()
);

create policy "teachers grade submissions"
on public.submissions for update to authenticated using (
  public.app_is_admin()
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.app_is_class_teacher(a.class_id)
  )
) with check (
  public.app_is_admin()
  or exists (
    select 1 from public.assignments a
    where a.id = assignment_id and public.app_is_class_teacher(a.class_id)
  )
);

create policy "attendance readable by participants"
on public.attendance for select to authenticated using (
  public.app_is_admin()
  or student_id = auth.uid()
  or public.app_is_class_teacher(class_id)
);

create policy "teachers manage attendance"
on public.attendance for all to authenticated using (
  public.app_is_class_teacher(class_id)
) with check (
  public.app_is_class_teacher(class_id)
);

create policy "announcements readable by participants"
on public.announcements for select to authenticated using (
  public.app_can_access_classroom(class_id)
);

create policy "teachers manage announcements"
on public.announcements for all to authenticated using (
  public.app_is_class_teacher(class_id)
) with check (
  public.app_is_admin()
  or author_id = auth.uid()
);

create policy "materials readable by participants"
on public.materials for select to authenticated using (
  public.app_can_access_classroom(class_id)
);

create policy "teachers manage materials"
on public.materials for all to authenticated using (
  public.app_is_class_teacher(class_id)
) with check (
  public.app_is_class_teacher(class_id)
);

create policy "events readable by participants"
on public.events for select to authenticated using (
  public.app_is_admin()
  or class_id is null
  or public.app_can_access_classroom(class_id)
);

create policy "teachers manage events"
on public.events for all to authenticated using (
  public.app_current_user_role()::text in ('teacher', 'admin')
) with check (
  public.app_current_user_role()::text in ('teacher', 'admin')
);

create policy "users read own notifications"
on public.notifications for select to authenticated using (user_id = auth.uid() or public.app_is_admin());

create policy "authenticated users create notifications"
on public.notifications for insert to authenticated with check (true);

create policy "users update own notifications"
on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "settings readable by authenticated users"
on public.settings for select to authenticated using (true);

create policy "admins manage settings"
on public.settings for all to authenticated using (public.app_is_admin()) with check (public.app_is_admin());

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false), ('materials', 'materials', false)
on conflict (id) do nothing;

drop policy if exists "smartclass files readable by participants" on storage.objects;
drop policy if exists "smartclass files uploadable by authenticated users" on storage.objects;
drop policy if exists "smartclass files updateable by owners" on storage.objects;

create policy "smartclass files readable by participants"
on storage.objects for select to authenticated using (bucket_id in ('submissions', 'materials'));

create policy "smartclass files uploadable by authenticated users"
on storage.objects for insert to authenticated with check (
  bucket_id in ('submissions', 'materials') and owner = auth.uid()
);

create policy "smartclass files updateable by owners"
on storage.objects for update to authenticated using (
  bucket_id in ('submissions', 'materials') and owner = auth.uid()
) with check (
  bucket_id in ('submissions', 'materials') and owner = auth.uid()
);

do $$
begin
  alter publication supabase_realtime add table public.classrooms;
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
  alter publication supabase_realtime add table public.announcements;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
