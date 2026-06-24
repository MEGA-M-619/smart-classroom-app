create database if not exists smart_classroom;
use smart_classroom;

create table if not exists users (
  id bigint primary key auto_increment,
  full_name varchar(255) not null,
  email varchar(255) not null unique,
  password varchar(255) not null,
  role enum('STUDENT', 'TEACHER', 'ADMIN') not null default 'STUDENT',
  phone varchar(255),
  bio varchar(1000),
  department varchar(255),
  major varchar(255),
  year varchar(255),
  dark_mode bit not null default 0,
  email_notifications bit not null default 1
);

create table if not exists classrooms (
  id bigint primary key auto_increment,
  name varchar(255) not null,
  code varchar(64) not null unique,
  teacher_id bigint not null,
  description varchar(1000),
  schedule varchar(255),
  room varchar(255),
  color varchar(32) default '#6366f1',
  icon varchar(16) default 'CL',
  index idx_classrooms_teacher_id (teacher_id),
  constraint fk_classrooms_teacher foreign key (teacher_id) references users(id) on delete cascade
);

create table if not exists enrollments (
  id bigint primary key auto_increment,
  student_id bigint not null,
  classroom_id bigint not null,
  unique key uk_enrollment_student_classroom (student_id, classroom_id),
  index idx_enrollments_student_id (student_id),
  index idx_enrollments_classroom_id (classroom_id),
  constraint fk_enrollments_student foreign key (student_id) references users(id) on delete cascade,
  constraint fk_enrollments_classroom foreign key (classroom_id) references classrooms(id) on delete cascade
);

create table if not exists assignments (
  id bigint primary key auto_increment,
  title varchar(255) not null,
  description varchar(2000),
  due_date datetime(6),
  classroom_id bigint not null,
  points int default 100,
  type varchar(64) default 'Assignment',
  status varchar(64) default 'active',
  index idx_assignment_classroom_id (classroom_id),
  constraint fk_assignment_classroom foreign key (classroom_id) references classrooms(id) on delete cascade
);

create table if not exists submissions (
  id bigint primary key auto_increment,
  assignment_id bigint not null,
  student_id bigint not null,
  file_url varchar(1000),
  file_name varchar(255),
  submitted_at datetime(6),
  grade double,
  status varchar(64) default 'submitted',
  text_answer varchar(4000),
  feedback varchar(2000),
  unique key uk_submission_assignment_student (assignment_id, student_id),
  index idx_submissions_assignment_id (assignment_id),
  index idx_submissions_student_id (student_id),
  constraint fk_submissions_assignment foreign key (assignment_id) references assignments(id) on delete cascade,
  constraint fk_submissions_student foreign key (student_id) references users(id) on delete cascade
);

create table if not exists announcement (
  id bigint primary key auto_increment,
  classroom_id bigint not null,
  author_id bigint not null,
  title varchar(255),
  body varchar(3000),
  pinned bit not null default 0,
  created_at datetime(6),
  index idx_announcement_classroom_id (classroom_id),
  constraint fk_announcement_classroom foreign key (classroom_id) references classrooms(id) on delete cascade,
  constraint fk_announcement_author foreign key (author_id) references users(id) on delete cascade
);

create table if not exists notification (
  id bigint primary key auto_increment,
  user_id bigint not null,
  text varchar(255),
  icon varchar(64) default 'bell',
  `read` bit not null default 0,
  created_at datetime(6),
  index idx_notification_user_id (user_id),
  constraint fk_notification_user foreign key (user_id) references users(id) on delete cascade
);
