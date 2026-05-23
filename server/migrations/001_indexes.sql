CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
