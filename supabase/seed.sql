-- Development seed data for SmartClass.
-- Run this only in a local or disposable Supabase project after applying migrations.
-- Create the three Auth users below from Supabase Auth first, then replace the UUIDs.

insert into public.users (id, full_name, email, role, department, major, year)
values
  ('00000000-0000-0000-0000-000000000101', 'Sarah Mitchell', 'sarah@university.edu', 'teacher', 'Computer Science', null, null),
  ('00000000-0000-0000-0000-000000000102', 'Alex Carter', 'alex@student.edu', 'student', null, 'Software Engineering', 'Sophomore'),
  ('00000000-0000-0000-0000-000000000103', 'Jordan Lee', 'admin@system.edu', 'admin', 'Academic Technology', null, null)
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  department = excluded.department,
  major = excluded.major,
  year = excluded.year;

insert into public.classrooms (id, name, description, teacher_id, join_code, color, icon, schedule, room)
values
  ('10000000-0000-0000-0000-000000000001', 'Software Engineering', 'Agile delivery, testing, design reviews, and production readiness.', '00000000-0000-0000-0000-000000000101', 'SOFT2481', '#6366f1', 'SE', 'Mon/Wed 10:00 AM', 'Lab 204'),
  ('10000000-0000-0000-0000-000000000002', 'Database Systems', 'Relational modeling, SQL, indexing, transactions, and data integrity.', '00000000-0000-0000-0000-000000000101', 'DATA9021', '#10b981', 'DB', 'Tue/Thu 1:30 PM', 'Room 118')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  teacher_id = excluded.teacher_id,
  join_code = excluded.join_code,
  color = excluded.color,
  icon = excluded.icon,
  schedule = excluded.schedule,
  room = excluded.room;

insert into public.enrollments (class_id, student_id)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000102'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000102')
on conflict (class_id, student_id) do nothing;

insert into public.assignments (id, class_id, title, description, due_date, points, type, status)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'API Design Review', 'Review an existing API surface and propose reliability improvements.', now() + interval '5 days', 100, 'Assignment', 'active'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'SQL Query Lab', 'Write joins and aggregate reports for the enrollment dataset.', now() - interval '3 days', 80, 'Lab', 'active')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  due_date = excluded.due_date,
  points = excluded.points,
  type = excluded.type,
  status = excluded.status;

insert into public.submissions (assignment_id, student_id, text_answer, grade, feedback, status, submitted_at)
values
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000102', 'Completed the reporting queries and added explanations for each join.', 74, 'Strong query structure. Add notes for index choices next time.', 'graded', now() - interval '4 days')
on conflict (assignment_id, student_id) do update set
  text_answer = excluded.text_answer,
  grade = excluded.grade,
  feedback = excluded.feedback,
  status = excluded.status,
  submitted_at = excluded.submitted_at;

insert into public.announcements (class_id, author_id, title, body, pinned)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000101', 'Sprint planning starts this week', 'Bring one product idea and one technical risk to discuss in your project teams.', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000101', 'Database lab room changed', 'Thursday lab will meet in Room 118 so everyone can use the database workstations.', false);

insert into public.notifications (user_id, text, icon)
values
  ('00000000-0000-0000-0000-000000000102', 'API Design Review is due soon.', 'assignment'),
  ('00000000-0000-0000-0000-000000000102', 'Your SQL Query Lab was graded.', 'grade');
