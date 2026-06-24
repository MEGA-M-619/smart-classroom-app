CREATE TABLE IF NOT EXISTS parent_student_links (
  parent_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  verified INTEGER DEFAULT 1,
  linked_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_links_student ON parent_student_links(student_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_student_links(parent_id);

ALTER TABLE assignments ADD COLUMN allow_resubmit INTEGER DEFAULT 0;
ALTER TABLE assignments ADD COLUMN attachment_path TEXT;
ALTER TABLE assignments ADD COLUMN attachment_name TEXT;

ALTER TABLE submissions ADD COLUMN rubric_scores_json TEXT;
ALTER TABLE submissions ADD COLUMN text_note TEXT;

ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN link TEXT;

ALTER TABLE announcements ADD COLUMN scheduled_at TEXT;
ALTER TABLE announcements ADD COLUMN is_school_wide INTEGER DEFAULT 0;
ALTER TABLE announcements ADD COLUMN attachments_json TEXT DEFAULT '[]';

ALTER TABLE messages ADD COLUMN thread_id TEXT;
ALTER TABLE messages ADD COLUMN read_at TEXT;

ALTER TABLE events ADD COLUMN end_date TEXT;
ALTER TABLE events ADD COLUMN description TEXT;
ALTER TABLE events ADD COLUMN reminder_minutes INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
